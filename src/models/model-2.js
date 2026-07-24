import * as THREE from 'three';
import vertShader from '../shaders/blackHole.vert.glsl?raw';
import fragShader from '../shaders/blackHole.frag.glsl?raw';

/**
 * 模型2号 - 闪闪金色黑洞模型
 * 包含：事件视界（金色菲涅尔发光球体）、金闪闪吸积盘、金色光子环、金色粒子云
 */
export default function createModel(group) {
    let holeMaterial;
    let accretionDisk;
    let diskOuter;
    let photonRing;
    let particles;

    // --- Event Horizon (black sphere with golden Fresnel glow) ---
    const holeGeom = new THREE.SphereGeometry(0.9, 64, 64);
    holeMaterial = new THREE.ShaderMaterial({
        vertexShader: vertShader,
        fragmentShader: fragShader,
        uniforms: {
            uGlowIntensity: { value: 0.8 },
            uGlowColor: { value: new THREE.Color('#b8860b') },
            uRimPower: { value: 3.5 },
        },
        transparent: true,
        depthWrite: true,
        depthTest: true,
    });
    const blackHole = new THREE.Mesh(holeGeom, holeMaterial);
    blackHole.renderOrder = 0;
    group.add(blackHole);

    // --- Accretion Disk (glowing golden torus, tilted) ---
    const diskGeom = new THREE.TorusGeometry(1.6, 0.22, 32, 100);
    const diskMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#daa520'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    accretionDisk = new THREE.Mesh(diskGeom, diskMat);
    accretionDisk.rotation.x = Math.PI * 0.35;
    accretionDisk.renderOrder = 1;
    group.add(accretionDisk);

    // Outer edge of the disk (brighter gold)
    const diskOuterGeom = new THREE.TorusGeometry(2.2, 0.1, 16, 100);
    const diskOuterMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffd700'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    diskOuter = new THREE.Mesh(diskOuterGeom, diskOuterMat);
    diskOuter.rotation.x = accretionDisk.rotation.x;
    diskOuter.renderOrder = 1;
    group.add(diskOuter);

    // Inner hot ring (white-gold glow near the event horizon)
    const innerGlowGeom = new THREE.TorusGeometry(1.05, 0.08, 16, 100);
    const innerGlowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#fff5cc'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const innerGlow = new THREE.Mesh(innerGlowGeom, innerGlowMat);
    innerGlow.rotation.x = accretionDisk.rotation.x;
    innerGlow.renderOrder = 1;
    group.add(innerGlow);

    // --- Photon Ring (thin bright gold-white ring close to event horizon) ---
    const photonGeom = new THREE.TorusGeometry(1.0, 0.03, 16, 100);
    const photonMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffe4a0'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    photonRing = new THREE.Mesh(photonGeom, photonMat);
    photonRing.rotation.x = Math.PI * 0.35;
    photonRing.renderOrder = 2;
    group.add(photonRing);

    // --- Particle cloud (gold sparkles around the disk) ---
    const particleCount = 500;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.5 + Math.random() * 1.3;
        const height = (Math.random() - 0.5) * 0.4;

        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = height;
        positions[i * 3 + 2] = Math.sin(angle) * radius;

        // Varying gold tones for each particle
        const goldBase = 0xdaa520;
        const goldBright = 0xffd700;
        const t = Math.random();
        const c = new THREE.Color(goldBase).lerp(new THREE.Color(goldBright), t);
        const brighten = 0.8 + Math.random() * 0.2;
        colors[i * 3] = c.r * brighten;
        colors[i * 3 + 1] = c.g * brighten;
        colors[i * 3 + 2] = c.b * brighten;
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
        size: 0.06,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
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

        // Photon ring pulses with gold shimmer
        if (photonRing) {
            const pulse = 1.0 + Math.sin(elapsed * 0.003) * 0.1;
            photonRing.scale.setScalar(pulse);
            photonRing.material.opacity = 0.5 + Math.abs(Math.sin(elapsed * 0.004)) * 0.45;
        }

        // Particles swirl with twinkling opacity
        if (particles) {
            particles.rotation.y += 0.0012;
            particleMat.opacity = 0.6 + Math.abs(Math.sin(elapsed * 0.002 + 1.5)) * 0.2;
        }
    }

    function dispose() {
        if (holeMaterial) holeMaterial.dispose();
        holeGeom.dispose();
        diskGeom.dispose();
        diskMat.dispose();
        diskOuterGeom.dispose();
        diskOuterMat.dispose();
        innerGlowGeom.dispose();
        innerGlowMat.dispose();
        photonGeom.dispose();
        photonMat.dispose();
        particleGeom.dispose();
        particleMat.dispose();
    }

    return { setGlow, animate, dispose };
}
