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
        container.appendChild(renderer.domElement);

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

        // --- Load and create model, then start loop ---
        loadAndCreateModel(id).then(() => {
            animate();
        });
    }

    async function loadAndCreateModel(modelId) {
        const module = await loadModel(modelId);
        const createModel = module.default;
        modelInstance = createModel(holeGroup);
    }

    async function switchModel(modelId) {
        if (currentModelId.value === modelId) return;

        // Dispose old model
        if (modelInstance) {
            modelInstance.dispose();
            // Clear all children from holeGroup
            while (holeGroup.children.length > 0) {
                holeGroup.remove(holeGroup.children[0]);
            }
        }

        // Load and create new model
        await loadAndCreateModel(modelId);
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

        // Rotate the whole system slowly
        if (holeGroup) {
            holeGroup.rotation.y += 0.003;
        }

        // Delegate model-specific animation
        if (modelInstance) {
            modelInstance.animate(Date.now());
        }

        renderer.render(scene, camera);
    }

    function setDragOver(state) {
        dragOver.value = state;
        targetGlow = state ? 2.0 : 0.8;
    }

    function cleanup() {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', onResize);

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
