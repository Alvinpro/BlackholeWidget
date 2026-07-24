import * as THREE from 'three';
import vertShader from '../shaders/blackHole.vert.glsl?raw';
import fragShader from '../shaders/blackHole.frag.glsl?raw';

/**
 * 模型1号 - 默认黑洞模型
 * 包含：事件视界（菲涅尔发光球体）、吸积盘、光子环、粒子云
 */
export default function createModel(group) {
    let holeMaterial;
    let accretionDisk;
    let photonRing;
    let particles;

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
    group.add(blackHole);

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
    accretionDisk.rotation.x = Math.PI * 0.35;
    accretionDisk.renderOrder = 1;
    group.add(accretionDisk);

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
    group.add(diskOuter);

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
    group.add(photonRing);

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
    group.add(particles);

    // --- Public API ---
    function setGlow(intensity) {
        if (holeMaterial) {
            holeMaterial.uniforms.uGlowIntensity.value = intensity;
        }
    }

    function animate(elapsed) {
        // Accretion disk wobbles slightly
        if (accretionDisk) {
            accretionDisk.rotation.z += 0.002;
        }

        // Photon ring pulses
        if (photonRing) {
            const pulse = 1.0 + Math.sin(elapsed * 0.003) * 0.08;
            photonRing.scale.setScalar(pulse);
            photonRing.material.opacity = 0.6 + Math.sin(elapsed * 0.004) * 0.3;
        }

        // Particles swirl
        if (particles) {
            particles.rotation.y += 0.001;
        }
    }

    function dispose() {
        if (holeMaterial) holeMaterial.dispose();
        holeGeom.dispose();
        diskGeom.dispose();
        diskMat.dispose();
        diskOuterGeom.dispose();
        diskOuterMat.dispose();
        photonGeom.dispose();
        photonMat.dispose();
        particleGeom.dispose();
        particleMat.dispose();
    }

    return { setGlow, animate, dispose };
}
