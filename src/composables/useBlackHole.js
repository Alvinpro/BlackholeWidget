import * as THREE from 'three';
import { ref } from 'vue';
import { loadModel, DEFAULT_MODEL } from '../models/index.js';

export function useBlackHole(containerRef) {
    const dragOver = ref(false);
    const currentModelId = ref(DEFAULT_MODEL);

    let scene, camera, renderer;
    let holeGroup;
    let modelInstance;
    let animationId;
    let currentGlow = 0.8;
    let targetGlow = 0.8;

    // Right-click drag rotation state
    let isRightDragging = false;
    let isPanning = false; // 左右双键按住时平移模型
    let prevMouseX = 0;
    let prevMouseY = 0;

    // Inertia state (EMA-smoothed velocity, 释放后持续旋转并衰减)
    let velocityX = 0;
    let velocityY = 0;
    let lastMoveTime = 0;
    // 滑动窗口：记录最近拖拽增量，用于释放时精确计算速度
    const deltaHistory = [];
    const DELTA_WINDOW_MS = 100;
    // 鼠标滚轮缩放
    let cameraDistance = 8;

    function init(modelId) {
        const id = modelId || DEFAULT_MODEL;
        currentModelId.value = id;

        const container = containerRef.value;
        if (!container) return;

        // --- Renderer (transparent) ---
        renderer = new THREE.WebGLRenderer({
            alpha: true,
            premultipliedAlpha: false,
            antialias: true,
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        container.appendChild(renderer.domElement);

        // --- WebGL context lost / restored ---
        // 长时间高负载（如模型4号射线追踪）可能触发 GPU 驱动重置，
        // 监听 context 事件并在恢复后重建整个场景
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);
        renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

        // --- Scene ---
        scene = new THREE.Scene();

        // --- Camera ---
        camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(0, 1.0, 8);
        camera.lookAt(0, 0, 0);

        // --- Root group (rotates slowly) ---
        holeGroup = new THREE.Group();
        scene.add(holeGroup);

        // --- Resize listener ---
        window.addEventListener('resize', onResize);

        // --- Right-click drag / both-button pan listeners ---
        container.addEventListener('mousedown', onCanvasMouseDown);
        container.addEventListener('contextmenu', preventContextMenu);
        window.addEventListener('mousemove', onRightMouseMove);
        window.addEventListener('mouseup', onRightMouseUp);

        // --- Mouse wheel zoom ---
        container.addEventListener('wheel', onWheel, { passive: false });

        // --- Load and create model, then start loop ---
        loadAndCreateModel(id).then(() => {
            animate();
        });

        // 周期性重置定时器（仅对需要重置的模型生效）
        startAutoReload();
    }

    async function loadAndCreateModel(modelId, params) {
        const module = await loadModel(modelId, params);
        const createModel = module.default;
        modelInstance = createModel(holeGroup, params);
    }

    let contextLost = false;

    // --- 周期性重置：模型4号着色器状态在部分 GPU/WebView2 环境下
    // 长时间运行后画面趋于静止，通过定时重建模型实例恢复动画
    const AUTO_RELOAD_INTERVAL_MS = 5 * 60 * 1000; // 每 5 分钟
    const AUTO_RELOAD_MODELS = ['model-4'];
    let autoReloadTimer = null;
    let isReloading = false;

    function startAutoReload() {
        clearInterval(autoReloadTimer);
        autoReloadTimer = setInterval(() => {
            if (contextLost || isReloading) return;
            if (!AUTO_RELOAD_MODELS.includes(currentModelId.value)) return;
            reloadModel();
        }, AUTO_RELOAD_INTERVAL_MS);
    }

    // 重建当前模型实例：重置着色器编译状态与动画时间（u_time 归零），保留视角/缩放
    async function reloadModel() {
        const id = currentModelId.value;
        if (!id || !modelInstance) return;
        isReloading = true;
        try {
            const oldInstance = modelInstance;
            const oldChildren = [...holeGroup.children];
            // 先加载新实例（与旧实例并存一帧，避免黑闪），再清理旧实例
            await loadAndCreateModel(id, { __reload: true });
            if (oldInstance) {
                oldInstance.dispose();
                for (const child of oldChildren) {
                    holeGroup.remove(child);
                }
            }
            currentGlow = targetGlow;
            if (modelInstance) {
                modelInstance.setGlow(currentGlow);
            }
        } finally {
            isReloading = false;
        }
    }

    // --- WebGL context lost / restored ---
    function onContextLost(e) {
        // 必须 preventDefault 才允许浏览器恢复 context
        e.preventDefault();
        contextLost = true;
        cancelAnimationFrame(animationId);
    }

    async function onContextRestored() {
        // 保存当前状态，重建后恢复
        const saved = {
            modelId: currentModelId.value,
            rotation: holeGroup ? holeGroup.rotation.clone() : null,
            position: holeGroup ? holeGroup.position.clone() : null,
            cameraDistance,
            currentGlow,
            targetGlow,
        };

        // 清理旧渲染器与模型
        cancelAnimationFrame(animationId);
        if (modelInstance) {
            modelInstance.dispose();
            modelInstance = null;
        }
        if (renderer) {
            renderer.dispose();
            const container = containerRef.value;
            if (container && renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
        }
        removeEventListeners();

        // 重建场景（新的 canvas / renderer / 模型 / 动画循环）
        init(saved.modelId);

        // 恢复交互状态（glow 由动画循环自然收敛到 targetGlow）
        if (holeGroup && saved.rotation) {
            holeGroup.rotation.copy(saved.rotation);
            holeGroup.position.copy(saved.position);
        }
        cameraDistance = saved.cameraDistance;
        currentGlow = saved.currentGlow;
        targetGlow = saved.targetGlow;
        velocityX = 0;
        velocityY = 0;
        deltaHistory.length = 0;
        if (camera) {
            camera.position.z = cameraDistance;
            camera.position.y = cameraDistance * 0.125;
            camera.lookAt(0, 0, 0);
        }
        contextLost = false;
    }

    function removeEventListeners() {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousemove', onRightMouseMove);
        window.removeEventListener('mouseup', onRightMouseUp);
        const container = containerRef.value;
        if (container) {
            container.removeEventListener('mousedown', onCanvasMouseDown);
            container.removeEventListener('contextmenu', preventContextMenu);
            container.removeEventListener('wheel', onWheel);
        }
    }

    async function switchModel(modelId, params) {
        // 忽略 context 丢失期间的切换，统一由恢复流程重建
        if (contextLost) return;
        // 允许同一模型 ID 带参数重新加载（如模型X号选择新文件）
        if (currentModelId.value === modelId && !params) return;

        // Snapshot old model state BEFORE loading new one.
        // This keeps the old model visible during the async load,
        // avoiding an empty scene gap that causes a black flash.
        const oldInstance = modelInstance;
        const oldChildren = modelInstance ? [...holeGroup.children] : [];

        // Load new model (adds its children to holeGroup alongside old ones)
        await loadAndCreateModel(modelId, params);

        // Now safely dispose the old model and remove its children
        if (oldInstance) {
            oldInstance.dispose();
            for (const child of oldChildren) {
                holeGroup.remove(child);
            }
        }

        // Reset rotation, position, zoom and inertia after old model is gone
        holeGroup.rotation.set(0, 0, 0);
        holeGroup.position.set(0, 0, 0);
        velocityX = 0;
        velocityY = 0;
        cameraDistance = 8;
        camera.position.set(0, 1.0, 8);
        camera.lookAt(0, 0, 0);

        currentModelId.value = modelId;

        // Reset glow state for new model
        currentGlow = targetGlow;
        if (modelInstance) {
            modelInstance.setGlow(currentGlow);
        }
    }

    function onResize() {
        const container = containerRef.value;
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    function animate() {
        animationId = requestAnimationFrame(animate);

        // Smooth glow transition
        currentGlow += (targetGlow - currentGlow) * 0.1;
        if (modelInstance) {
            modelInstance.setGlow(currentGlow);
        }

        // Inertia / auto-rotate: 释放右键后按拖拽速度惯性旋转
        // - 普通模型：速度衰减至阈值后切换为默认 Y 轴自转
        // - autoRotate:false 的模型（如模型X号）：释放后以释放速度持续旋转，不衰减
        if (holeGroup && !isRightDragging) {
            const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            if (speed > 0.00005) {
                holeGroup.rotation.x += velocityX;
                holeGroup.rotation.y += velocityY;
                if (modelInstance?.autoRotate !== false) {
                    // 普通模型：指数衰减，约 35 帧(0.6s) 速度减半
                    velocityX *= 0.98;
                    velocityY *= 0.98;
                }
                // autoRotate:false 的模型：不衰减，维持释放速度永久自转
            } else if (modelInstance?.autoRotate !== false) {
                holeGroup.rotation.y += 0.003;
            }
        }

        // Delegate model-specific animation
        // 使用 performance.now() 而非 Date.now()，避免浮点精度问题导致着色器 u_time 冻结
        if (modelInstance) {
            modelInstance.animate(performance.now());
        }

        renderer.render(scene, camera);
    }

    // --- Right-click drag / both-button pan ---
    function onCanvasMouseDown(e) {
        if (e.button === 2) {
            if (e.buttons & 1) {
                // 左键已按下 → 平移模式（先左后右）
                isPanning = true;
                isRightDragging = false;
            } else {
                isRightDragging = true;
            }
            prevMouseX = e.clientX;
            prevMouseY = e.clientY;
            velocityX = 0;
            velocityY = 0;
            lastMoveTime = performance.now();
            deltaHistory.length = 0;
            e.preventDefault();
            e.stopPropagation();
        }
        if (e.button === 0 && e.buttons & 2) {
            // 右键已按下 → 平移模式（先右后左）
            isPanning = true;
            isRightDragging = false;
            prevMouseX = e.clientX;
            prevMouseY = e.clientY;
            e.preventDefault();
            e.stopPropagation();
        }
    }

    function onRightMouseMove(e) {
        // 只有右键实际按下时才处理（排除释放后惯性阶段的鼠标移动）
        if (!(e.buttons & 2)) return;
        if (!holeGroup) return;

        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;

        if (isPanning) {
            // 左右双键按住：屏幕空间平移模型
            holeGroup.position.x += dx * 0.01;
            holeGroup.position.y -= dy * 0.01;
            prevMouseX = e.clientX;
            prevMouseY = e.clientY;
            lastMoveTime = performance.now();
            return;
        }

        if (!isRightDragging) return;
        const now = performance.now();

        holeGroup.rotation.x += dy * 0.01;
        holeGroup.rotation.y += dx * 0.01;

        // 记录移动增量用于释放时计算准确速度（滑动窗口，最近 ~100ms）
        deltaHistory.push({ dx, dy, time: now });
        while (deltaHistory.length > 1 && now - deltaHistory[0].time > DELTA_WINDOW_MS) {
            deltaHistory.shift();
        }

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        lastMoveTime = now;
    }

    function onRightMouseUp(e) {
        // 双键平移中松开左键 → 切回旋转模式
        if (e && e.button === 0 && isPanning) {
            isPanning = false;
            if (e.buttons & 2) isRightDragging = true;
            return;
        }
        if (isPanning) {
            isPanning = false;
            return;
        }
        isRightDragging = false;

        // 从滑动窗口中计算释放速度：总旋转量 / 时间 → 每帧角速度
        const now = performance.now();
        const recent = deltaHistory.filter(d => now - d.time <= DELTA_WINDOW_MS);
        if (recent.length >= 2) {
            const first = recent[0];
            const last = recent[recent.length - 1];
            const timeSpan = last.time - first.time;
            if (timeSpan > 0) {
                let sumDx = 0, sumDy = 0;
                for (const d of recent) {
                    sumDx += d.dx;
                    sumDy += d.dy;
                }
                // 平均旋转速率 (rad/ms) × 16ms = 每帧角速度，与拖拽手感一致
                const rotPerMsX = (sumDy * 0.01) / timeSpan;
                const rotPerMsY = (sumDx * 0.01) / timeSpan;
                velocityX = rotPerMsX * 16;
                velocityY = rotPerMsY * 16;
            }
        }

        // 静止释放：归零
        if (now - lastMoveTime > 150) {
            velocityX = 0;
            velocityY = 0;
        }
    }

    function preventContextMenu(e) {
        e.preventDefault();
    }

    // --- Mouse wheel zoom ---
    function onWheel(e) {
        e.preventDefault();
        cameraDistance += e.deltaY > 0 ? 0.5 : -0.5;
        cameraDistance = Math.max(1.5, Math.min(40, cameraDistance));
        camera.position.z = cameraDistance;
        camera.position.y = cameraDistance * 0.125;
        camera.lookAt(0, 0, 0);
    }

    function setDragOver(state) {
        dragOver.value = state;
        targetGlow = state ? 2.0 : 0.8;
    }

    function cleanup() {
        cancelAnimationFrame(animationId);
        clearInterval(autoReloadTimer);
        removeEventListeners();

        if (modelInstance) {
            modelInstance.dispose();
        }

        if (renderer) {
            renderer.dispose();
            const container = containerRef.value;
            if (container && renderer.domElement) {
                container.removeChild(renderer.domElement);
            }
        }
    }

    return { init, cleanup, setDragOver, dragOver, switchModel, currentModelId };
}
