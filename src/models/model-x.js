import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * 模型X号 - 通用 GLB 模型加载器
 *
 * 接收外部传入的 fileUrl (Blob URL) 加载任意 GLB 文件,
 * 并适配其内建 animation 进行渲染。
 * 遵循 createModel(group, params) → { setGlow, animate, dispose } 模式。
 */
export default function createModel(group, params = {}) {
    const fileUrl = params.fileUrl;
    if (!fileUrl) {
        console.error('模型X号: 缺少 fileUrl 参数');
        return {
            setGlow: () => {},
            animate: () => {},
            dispose: () => {},
            autoRotate: false,
        };
    }

    // ---- 环境光：确保 GLB 模型可见 ----
    const ambient = new THREE.AmbientLight(0xffffff, 1.8);
    const key = new THREE.DirectionalLight(0xffffff, 0.6);
    key.position.set(5, 8, 8);
    group.add(ambient, key);

    // ---- 模型容器 ----
    const container = new THREE.Group();
    group.add(container);

    // ---- GLTFLoader ----
    const loader = new GLTFLoader();

    let mixer = null;
    const actions = [];

    // 异步加载 GLB (从 Blob URL)
    loader.load(
        fileUrl,
        (gltf) => {
            const model = gltf.scene;

            // 自动适配：缩放模型到合适大小 (以包围盒为参考)
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 0) {
                const targetScale = 5 / maxDim; // 模型最大维度映射到 5 个单位
                model.scale.setScalar(targetScale);
            }

            // 居中模型
            const center = box.getCenter(new THREE.Vector3());
            model.position.set(-center.x, -center.y, -center.z);

            container.add(model);

            // ---- 动画 ----
            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                gltf.animations.forEach((clip) => {
                    const action = mixer.clipAction(clip);
                    action.play();
                    actions.push(action);
                });
            }
        },
        undefined,
        (err) => {
            console.error('模型X号: GLB 加载失败', err);
        }
    );

    // ---- Public API ----

    let lastElapsed = null;

    function setGlow(intensity) {
        // glow 强度映射到容器微缩放
        const s = 0.98 + intensity * 0.06;
        container.scale.setScalar(s);
    }

    function animate(elapsed) {
        if (lastElapsed === null) {
            lastElapsed = elapsed;
            return;
        }
        const delta = elapsed - lastElapsed;
        lastElapsed = elapsed;

        // 限制最大 delta，防止休眠唤醒时产生巨大跳跃
        const dt = Math.min(delta, 100) * 0.001;

        if (mixer) {
            mixer.update(dt);
        }
    }

    function dispose() {
        if (mixer) {
            mixer.uncacheRoot(container);
        }
        // 清理 Blob URL
        if (fileUrl && fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(fileUrl);
        }
    }

    // 禁用自动旋转（模型自带动画旋转）
    return { setGlow, animate, dispose, autoRotate: false };
}
