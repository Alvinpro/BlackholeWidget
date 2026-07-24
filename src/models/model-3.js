import * as THREE from 'three';
import vertShader from '../shaders/blackHole.vert.glsl?raw';
import fragShader from '../shaders/blackHole.frag.glsl?raw';

/**
 * 模型3号 - 引力透镜黑洞
 * 配色：冷白事件视界 + 冰蓝吸积盘 + 纯蓝外圈 + 天蓝内圈 + 青蓝光子环 + 白/天蓝/深蓝渐变粒子
 */
export default function createModel(group) {
    let holeMaterial;
    let accretionDisk;
    let diskOuter;
    let photonRing;
    let particles;

    // --- Event Horizon (black sphere with cool white Fresnel glow) ---
    const holeGeom = new THREE.SphereGeometry(0.9, 64, 64);
    holeMaterial = new THREE.ShaderMaterial({
        vertexShader: vertShader,
        fragmentShader: fragShader,
        uniforms: {
            uGlowIntensity: { value: 0.8 },
            uGlowColor: { value: new THREE.Color('#eef6ff') },
            uRimPower: { value: 4.2 },
        },
        transparent: true,
        depthWrite: true,
        depthTest: true,
    });
    const blackHole = new THREE.Mesh(holeGeom, holeMaterial);
    blackHole.renderOrder = 0;
    group.add(blackHole);

    // --- Accretion Disk (ice-blue core, tilted) ---
    const diskGeom = new THREE.TorusGeometry(1.6, 0.22, 32, 100);
    const diskMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#dceeff'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    accretionDisk = new THREE.Mesh(diskGeom, diskMat);
    accretionDisk.rotation.x = Math.PI * 0.35;
    accretionDisk.renderOrder = 1;
    group.add(accretionDisk);

    // Outer edge of the disk (pure blue)
    const diskOuterGeom = new THREE.TorusGeometry(2.2, 0.1, 16, 100);
    const diskOuterMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#5ba0ff'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    diskOuter = new THREE.Mesh(diskOuterGeom, diskOuterMat);
    diskOuter.rotation.x = accretionDisk.rotation.x;
    diskOuter.renderOrder = 1;
    group.add(diskOuter);

    // Inner hot ring (cool blue glow near the event horizon)
    const innerGlowGeom = new THREE.TorusGeometry(1.05, 0.08, 16, 100);
    const innerGlowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#46c8ff'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const innerGlow = new THREE.Mesh(innerGlowGeom, innerGlowMat);
    innerGlow.rotation.x = accretionDisk.rotation.x;
    innerGlow.renderOrder = 1;
    group.add(innerGlow);

    // --- Photon Ring (thin bright cyan-blue ring close to event horizon) ---
    const photonGeom = new THREE.TorusGeometry(1.0, 0.03, 16, 100);
    const photonMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#7dd8ff'),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    photonRing = new THREE.Mesh(photonGeom, photonMat);
    photonRing.rotation.x = Math.PI * 0.35;
    photonRing.renderOrder = 2;
    group.add(photonRing);

    // --- Particle cloud (white → sky blue → deep blue gradient) ---
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

        // White → sky blue → deep blue gradient
        const colorA = new THREE.Color('#ffffff');
        const colorB = new THREE.Color('#88ccff');
        const colorC = new THREE.Color('#4466ff');
        const mixt = Math.random();
        const mixAB = colorA.clone().lerp(colorB, mixt);
        const c = mixAB.lerp(colorC, mixt * 0.35);
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

        // Photon ring pulses
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
