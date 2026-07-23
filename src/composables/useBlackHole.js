import * as THREE from 'three';
import { ref } from 'vue';
import vertShader from '../shaders/blackHole.vert.glsl?raw';
import fragShader from '../shaders/blackHole.frag.glsl?raw';

export function useBlackHole(containerRef) {
    const dragOver = ref(false);

    let scene, camera, renderer;
    let holeGroup, accretionDisk, photonRing, particles;
    let holeMaterial;
    let animationId;
    let currentGlow = 0.8;
    let targetGlow = 0.8;

    function init() {
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

        // --- Event Horizon (black sphere with Fresnel glow) ---
        const holeGeom = new THREE.SphereGeometry(0.9, 64, 64);
        holeMaterial = new THREE.ShaderMaterial({
            vertexShader: vertShader,
            fragmentShader: fragShader,
            uniforms: {
                uGlowIntensity: { value: 0.8 },
                uGlowColor: { value: new THREE.Color('#4a0080') },
                uRimPower: { value: 3.5 },
            },
            transparent: true,
            depthWrite: true,
            depthTest: true,
        });
        const blackHole = new THREE.Mesh(holeGeom, holeMaterial);
        blackHole.renderOrder = 0;
        holeGroup.add(blackHole);

        // --- Accretion Disk (glowing torus, tilted) ---
        const diskGeom = new THREE.TorusGeometry(1.6, 0.22, 32, 100);
        const diskMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color('#ff6600'),
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        accretionDisk = new THREE.Mesh(diskGeom, diskMat);
        accretionDisk.rotation.x = Math.PI * 0.35; // Tilt ~63 degrees
        accretionDisk.renderOrder = 1;
        holeGroup.add(accretionDisk);

        // Outer edge of the disk (brighter)
        const diskOuterGeom = new THREE.TorusGeometry(2.2, 0.1, 16, 100);
        const diskOuterMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color('#ff3300'),
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const diskOuter = new THREE.Mesh(diskOuterGeom, diskOuterMat);
        diskOuter.rotation.x = accretionDisk.rotation.x;
        diskOuter.renderOrder = 1;
        holeGroup.add(diskOuter);

        // --- Photon Ring (thin bright ring close to event horizon) ---
        const photonGeom = new THREE.TorusGeometry(1.0, 0.03, 16, 100);
        const photonMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color('#cc66ff'),
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        photonRing = new THREE.Mesh(photonGeom, photonMat);
        photonRing.rotation.x = Math.PI * 0.35;
        photonRing.renderOrder = 2;
        holeGroup.add(photonRing);

        // --- Particle cloud around the disk ---
        const particleCount = 400;
        const particleGeom = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.5 + Math.random() * 1.3;
            const height = (Math.random() - 0.5) * 0.4;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }

        particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMat = new THREE.PointsMaterial({
            color: new THREE.Color('#ff9944'),
            size: 0.06,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        particles = new THREE.Points(particleGeom, particleMat);
        particles.rotation.x = accretionDisk.rotation.x;
        particles.renderOrder = 3;
        holeGroup.add(particles);

        // --- Resize listener ---
        window.addEventListener('resize', onResize);

        // --- Start loop ---
        animate();
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

        // Smooth glow transition (when drag state changes)
        currentGlow += (targetGlow - currentGlow) * 0.1;
        if (holeMaterial) {
            holeMaterial.uniforms.uGlowIntensity.value = currentGlow;
        }

        // Rotate the whole system slowly
        if (holeGroup) {
            holeGroup.rotation.y += 0.003;
        }

        // Accretion disk wobbles slightly
        if (accretionDisk) {
            accretionDisk.rotation.z += 0.002;
        }

        // Photon ring pulses
        if (photonRing) {
            const pulse = 1.0 + Math.sin(Date.now() * 0.003) * 0.08;
            photonRing.scale.setScalar(pulse);
            photonRing.material.opacity = 0.6 + Math.sin(Date.now() * 0.004) * 0.3;
        }

        // Particles swirl
        if (particles) {
            particles.rotation.y += 0.001;
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

        if (renderer) {
            renderer.dispose();
            const container = containerRef.value;
            if (container && renderer.domElement) {
                container.removeChild(renderer.domElement);
            }
        }

        if (holeMaterial) holeMaterial.dispose();
        // Three.js geometries and materials cleanup would be more thorough in production
    }

    return { init, cleanup, setDragOver, dragOver };
}