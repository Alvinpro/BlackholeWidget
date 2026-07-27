import * as THREE from 'three';
import textureUrl from '../assets/Digi-Girl_480.png';

// ============================================================
// === 可调参数 — 集中管理, 方便修改 ==========================
// ============================================================

const CONFIG = {
    // ── 灯光 ────────────────────────────────────────────────
    light_ambient:    { color: 0xffffff, intensity: 2.3 },
    light_key:        { color: 0xfff5e6, intensity: 0.6, x: 5, y: 6, z: 5 },
    light_camera:     { color: 0xffffff, intensity: 2.0, distance: 20, x: 0, y: 3, z: 8 },
    light_rim:        { color: 0xff4444, intensity: 0.8, distance: 15, x: 0, y: 2.5, z: -6 },
    light_side:       { color: 0xffffff, intensity: 0.4, distance: 12, x: -6, y: 2.5, z: 0 },
    light_bottom:     { color: 0x440000, intensity: 0.3, x: 0, y: -5, z: 0 },

    // ── 角色平面 ────────────────────────────────────────────
    char_width:       3.5,
    char_placeholder: 0x330000,
    char_roughness:   0.15,
    char_metalness:   0.05,

    // ── 边缘辉光 ────────────────────────────────────────────
    glow_opacity:     0.55,
    glow_scale:       1.12,
    glow_z:           -0.03,
    glow_color_inner: 'rgba(255,20,20,0.25)',
    glow_color_mid:   'rgba(255,0,0,0.08)',
    glow_mid_stop:    0.55,

    // ── 全息扫描 ────────────────────────────────────────────
    scan_color:       0xff2020,
    scan_opacity:     0.45,
    scan_width_scale: 1.08,
    scan_height:      0.06,
    scan_z:           0.02,
    scan_freq:        0.75,

    // ── 能量粒子 ────────────────────────────────────────────
    aura_count:       140,
    aura_color:       0xff3030,
    aura_size:        0.3,
    aura_opacity:     0.85,
    aura_margin:      0.5,
    aura_z:           0.02,
    aura_speed_min:   0.4,
    aura_speed_range: 1.2,
    aura_amp_min:     0.06,
    aura_amp_range:   0.18,

    // ── 脉冲波纹 ────────────────────────────────────────────
    pulse_freq:       1.2,
    pulse_max:        5,
    pulse_opacity:    1,
    pulse_color:      0xff3030,
    pulse_inner:      0.08,
    pulse_outer:      0.18,
    pulse_life_min:   1.6,
    pulse_life_extra: 0.5,

    // ── 电路纹路 ────────────────────────────────────────────
    circuit_count:    8,
    circuit_opacity:  0.5,
    circuit_line_clr: 0xaa2222,
    circuit_pad_clr:  0xcc3333,
    circuit_via_clr:  0xbb3333,
    circuit_via_in:   0.04,
    circuit_via_out:  0.07,
    circuit_pad_r:    0.06,
    circuit_seg_min:  3,
    circuit_seg_range:4,
    circuit_len_min:  0.5,
    circuit_len_range:2.0,

    // ── 纹理故障 ────────────────────────────────────────────
    glitch_freq:      0.004,
    glitch_x_amp:     0.04,
    glitch_y_amp:     0.024,
    glitch_dur_min:   40,
    glitch_dur_range: 60,

    // ── 人物动画 ────────────────────────────────────────────
    sway_amp:         0.08,
    sway_freq:        1.5,
    scale_amp:        0.015,
    scale_freq:       2.0,

    // ── 视角 ────────────────────────────────────────────────
    pitch_deg:        -5,   // 俯视角度 (负 = 上往下)
    yaw_deg:          0,    // 水平旋转 (0 = 正面)
};

// ============================================================
// ============================================================

/**
 * 模型5号 - 数字角色 (Digi-Girl)
 *
 * 融合 DigiTwins 项目的光源系统与人物特效,
 * 遵循现有模型架构的 createModel(group) → { setGlow, animate, dispose } 模式.
 */
export default function createModel(group) {
    const C = CONFIG;

    // ====================================================================
    // 1. 灯光系统
    // ====================================================================
    const ambient = new THREE.AmbientLight(C.light_ambient.color, C.light_ambient.intensity);

    const keyLight = new THREE.DirectionalLight(C.light_key.color, C.light_key.intensity);
    keyLight.position.set(C.light_key.x, C.light_key.y, C.light_key.z);

    const cameraLight = new THREE.PointLight(
        C.light_camera.color, C.light_camera.intensity, C.light_camera.distance);
    cameraLight.position.set(C.light_camera.x, C.light_camera.y, C.light_camera.z);

    const rimLight = new THREE.PointLight(
        C.light_rim.color, C.light_rim.intensity, C.light_rim.distance);
    rimLight.position.set(C.light_rim.x, C.light_rim.y, C.light_rim.z);

    const sideFill = new THREE.PointLight(
        C.light_side.color, C.light_side.intensity, C.light_side.distance);
    sideFill.position.set(C.light_side.x, C.light_side.y, C.light_side.z);

    const bottomLight = new THREE.DirectionalLight(C.light_bottom.color, C.light_bottom.intensity);
    bottomLight.position.set(C.light_bottom.x, C.light_bottom.y, C.light_bottom.z);

    group.add(ambient, keyLight, cameraLight, rimLight, sideFill, bottomLight);

    // ====================================================================
    // 2. 角色平面 + 异步纹理加载
    // ====================================================================
    const PW = C.char_width;
    let PH = C.char_width; // 默认正方形, 纹理加载后按实际比例更新

    const charGeo = new THREE.PlaneGeometry(PW, PH);
    const charMat = new THREE.MeshStandardMaterial({
        color: C.char_placeholder,
        roughness: C.char_roughness,
        metalness: C.char_metalness,
        side: THREE.DoubleSide,
        transparent: true,
    });
    const characterMesh = new THREE.Mesh(charGeo, charMat);
    characterMesh.position.y = 0;
    group.add(characterMesh);

    // 异步加载纹理
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        textureUrl,
        (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            charMat.map = tex;
            charMat.color.set(0xffffff);
            charMat.needsUpdate = true;

            // 按实际图片比例更新平面高度
            const actualRatio = tex.image.width / tex.image.height;
            PH = PW / actualRatio;
            charGeo.dispose();
            characterMesh.geometry = new THREE.PlaneGeometry(PW, PH);

            // 重建宽高相关的特效几何体
            rebuildSizeDependentEffects();
        },
        undefined,
        () => {
            console.warn('模型5号: Digi-Girl_480.png 纹理加载失败, 使用占位渲染');
        },
    );

    // ====================================================================
    // 3. 边缘辉光 (Canvas 径向渐变纹理)
    // ====================================================================
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d');
    const gradient = gctx.createRadialGradient(128, 128, 80, 128, 128, 128);
    gradient.addColorStop(0, C.glow_color_inner);
    gradient.addColorStop(C.glow_mid_stop, C.glow_color_mid);
    gradient.addColorStop(1, 'transparent');
    gctx.fillStyle = gradient;
    gctx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);

    let edgeGlowGeo = new THREE.PlaneGeometry(PW * C.glow_scale, PH * C.glow_scale);
    const edgeGlowMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: C.glow_opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
    });
    const edgeGlowMesh = new THREE.Mesh(edgeGlowGeo, edgeGlowMat);
    edgeGlowMesh.position.z = C.glow_z;
    characterMesh.add(edgeGlowMesh);

    // ====================================================================
    // 4. 全息扫描线
    // ====================================================================
    let scanGeo = new THREE.PlaneGeometry(PW * C.scan_width_scale, C.scan_height);
    const scanMat = new THREE.MeshBasicMaterial({
        color: C.scan_color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: C.scan_opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const holoScan = new THREE.Mesh(scanGeo, scanMat);
    holoScan.position.z = C.scan_z;
    characterMesh.add(holoScan);

    // ====================================================================
    // 5. 能量粒子光点纹理
    // ====================================================================
    const particleTexCanvas = document.createElement('canvas');
    particleTexCanvas.width = particleTexCanvas.height = 32;
    const pctx = particleTexCanvas.getContext('2d');
    const pg = pctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    pg.addColorStop(0, 'rgba(255,60,60,1)');
    pg.addColorStop(0.15, 'rgba(255,40,40,0.9)');
    pg.addColorStop(0.5, 'rgba(255,0,0,0.2)');
    pg.addColorStop(1, 'transparent');
    pctx.fillStyle = pg;
    pctx.fillRect(0, 0, 32, 32);
    const particleGlowTex = new THREE.CanvasTexture(particleTexCanvas);

    // ====================================================================
    // 6. 能量粒子光晕
    // ====================================================================
    const auraGeo = new THREE.BufferGeometry();
    const auraPositions = new Float32Array(C.aura_count * 3);
    const auraData = [];

    function buildAura() {
        const margin = C.aura_margin;
        auraData.length = 0;
        for (let i = 0; i < C.aura_count; i++) {
            const x = (Math.random() - 0.5) * (PW + margin * 2);
            const y = (Math.random() - 0.5) * (PH + margin * 2);
            auraPositions[i * 3] = x;
            auraPositions[i * 3 + 1] = y;
            auraPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
            auraData.push({
                bx: x,
                by: y,
                sp: C.aura_speed_min + Math.random() * C.aura_speed_range,
                ph: Math.random() * Math.PI * 2,
                amp: C.aura_amp_min + Math.random() * C.aura_amp_range,
            });
        }
        auraGeo.setAttribute('position', new THREE.BufferAttribute(auraPositions, 3));
    }
    buildAura();

    const auraMat = new THREE.PointsMaterial({
        map: particleGlowTex,
        color: C.aura_color,
        size: C.aura_size,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: C.aura_opacity,
    });
    const auraPoints = new THREE.Points(auraGeo, auraMat);
    auraPoints.position.z = C.aura_z;
    characterMesh.add(auraPoints);

    // ====================================================================
    // 7. 脉冲波纹 (脚底冲击波)
    // ====================================================================
    const pulseRings = [];
    let pulseTimer = 0;

    function createPulse() {
        const geo = new THREE.RingGeometry(C.pulse_inner, C.pulse_outer, 48);
        const mat = new THREE.MeshBasicMaterial({
            color: C.pulse_color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: C.pulse_opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -PH / 2;
        ring.position.z = 0.03;
        ring.userData = { life: 0, maxLife: C.pulse_life_min + Math.random() * C.pulse_life_extra };
        characterMesh.add(ring);
        pulseRings.push(ring);

        while (pulseRings.length > C.pulse_max) {
            const old = pulseRings.shift();
            characterMesh.remove(old);
            old.geometry.dispose();
            old.material.dispose();
        }
    }

    // ====================================================================
    // 8. 电路纹路 (PCB 走线, 均匀散布于角色区域)
    // ====================================================================
    const circuitLines = [];
    const circuitNodes = [];
    const viaGeo = new THREE.RingGeometry(C.circuit_via_in, C.circuit_via_out, 16);
    const padGeo = new THREE.CircleGeometry(C.circuit_pad_r, 16);

    function generateCircuitPath() {
        const hw = PW / 2;
        const hh = PH / 2;
        const points = [];

        // 起点散布在整个角色区域内 (含一定外扩), 避免集中在边缘
        let cx = (Math.random() - 0.5) * hw * 1.7;
        let cy = (Math.random() - 0.5) * hh * 1.7;
        points.push(new THREE.Vector3(cx, cy, -0.02));

        const segs = C.circuit_seg_min + Math.floor(Math.random() * C.circuit_seg_range);
        for (let i = 0; i < segs; i++) {
            const len = C.circuit_len_min + Math.random() * C.circuit_len_range;
            const r = Math.random();
            if (r < 0.4) {
                cx += (Math.random() < 0.5 ? -1 : 1) * len;
            } else if (r < 0.8) {
                cy += (Math.random() < 0.5 ? -1 : 1) * len;
            } else {
                const d = len * 0.707;
                cx += (Math.random() < 0.5 ? -1 : 1) * d;
                cy += (Math.random() < 0.5 ? -1 : 1) * d;
            }
            cx = Math.max(-hw * 0.95, Math.min(hw * 0.95, cx));
            cy = Math.max(-hh * 0.95, Math.min(hh * 0.95, cy));
            points.push(new THREE.Vector3(cx, cy, -0.02));
        }
        return points;
    }

    function clearCircuits() {
        circuitLines.forEach((l) => {
            characterMesh.remove(l);
            l.geometry.dispose();
            l.material.dispose();
        });
        circuitLines.length = 0;
        circuitNodes.forEach((n) => {
            characterMesh.remove(n);
            n.geometry.dispose();
            n.material.dispose();
        });
        circuitNodes.length = 0;
    }

    function buildCircuits() {
        clearCircuits();
        for (let i = 0; i < C.circuit_count; i++) {
            const pts = generateCircuitPath();
            if (pts.length < 2) continue;

            // 主线
            const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
            const lineMat = new THREE.LineBasicMaterial({
                color: C.circuit_line_clr,
                transparent: true,
                opacity: C.circuit_opacity,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.userData = { phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 1.2 };
            characterMesh.add(line);
            circuitLines.push(line);

            // 端点焊盘
            [pts[0], pts[pts.length - 1]].forEach((pt) => {
                const padMat = new THREE.MeshBasicMaterial({
                    color: C.circuit_pad_clr,
                    transparent: true,
                    side: THREE.DoubleSide,
                    opacity: Math.min(1, C.circuit_opacity + 0.3),
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                const pad = new THREE.Mesh(padGeo, padMat);
                pad.position.copy(pt);
                characterMesh.add(pad);
                circuitNodes.push(pad);
            });

            // 转角过孔
            for (let j = 1; j < pts.length - 1; j++) {
                const viaMat = new THREE.MeshBasicMaterial({
                    color: C.circuit_via_clr,
                    transparent: true,
                    side: THREE.DoubleSide,
                    opacity: Math.min(1, C.circuit_opacity + 0.15),
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                });
                const via = new THREE.Mesh(viaGeo, viaMat);
                via.position.copy(pts[j]);
                characterMesh.add(via);
                circuitNodes.push(via);
            }
        }
    }
    buildCircuits();

    // ====================================================================
    // 9. 尺寸依赖的特效重建 (纹理加载完成后调用)
    // ====================================================================
    function rebuildSizeDependentEffects() {
        edgeGlowGeo.dispose();
        edgeGlowGeo = new THREE.PlaneGeometry(PW * C.glow_scale, PH * C.glow_scale);
        edgeGlowMesh.geometry = edgeGlowGeo;

        scanGeo.dispose();
        scanGeo = new THREE.PlaneGeometry(PW * C.scan_width_scale, C.scan_height);
        holoScan.geometry = scanGeo;

        buildCircuits();

        auraGeo.dispose();
        buildAura();
        auraPoints.geometry = auraGeo;
    }

    // ====================================================================
    // === Public API =====================================================
    // ====================================================================

    function setGlow(intensity) {
        const s = 0.5 + intensity * 0.5;
        edgeGlowMat.opacity = C.glow_opacity * s;
        scanMat.opacity = C.scan_opacity * s;
    }

    function animate(elapsed) {
        const t = elapsed * 0.001;

        // --- 角色微动 ---
        characterMesh.position.y = Math.sin(t * C.sway_freq) * C.sway_amp;
        const sway = 1 + Math.sin(t * C.scale_freq) * C.scale_amp;
        characterMesh.scale.set(sway, sway, sway);

        // --- 边缘辉光呼吸 ---
        edgeGlowMat.opacity = C.glow_opacity * (0.5 + Math.sin(t * 1.5) * 0.4);

        // --- 全息扫描 ---
        const halfH = PH / 2;
        holoScan.position.y = halfH * Math.sin(t * C.scan_freq);
        scanMat.opacity = C.scan_opacity * (0.3 + Math.abs(Math.cos(t * C.scan_freq)) * 0.8);

        // --- 能量粒子 ---
        const arr = auraGeo.attributes.position.array;
        for (let i = 0; i < auraData.length; i++) {
            const d = auraData[i];
            arr[i * 3] = d.bx + Math.sin(t * d.sp + d.ph) * d.amp;
            arr[i * 3 + 1] = d.by + Math.cos(t * d.sp * 0.7 + d.ph) * d.amp;
        }
        auraGeo.attributes.position.needsUpdate = true;
        auraMat.opacity = 0.5 + Math.sin(t * 2.0) * 0.2;

        // --- 脉冲波纹 ---
        pulseTimer += 0.016;
        if (pulseTimer > C.pulse_freq) {
            pulseTimer = 0;
            createPulse();
        }
        for (let i = pulseRings.length - 1; i >= 0; i--) {
            const ring = pulseRings[i];
            ring.userData.life += 0.016;
            const p = ring.userData.life / ring.userData.maxLife;
            if (p >= 1) {
                characterMesh.remove(ring);
                ring.geometry.dispose();
                ring.material.dispose();
                pulseRings.splice(i, 1);
                continue;
            }
            const s = 0.3 + p * 5;
            ring.scale.set(s, s, s);
            ring.material.opacity = C.pulse_opacity * (1 - p);
        }

        // --- 纹理故障 ---
        if (charMat.map && Math.random() < C.glitch_freq) {
            const ox = charMat.map.offset.x;
            const oy = charMat.map.offset.y;
            charMat.map.offset.x += (Math.random() - 0.5) * C.glitch_x_amp;
            charMat.map.offset.y += (Math.random() - 0.5) * C.glitch_y_amp;
            setTimeout(() => {
                if (charMat.map) {
                    charMat.map.offset.x = ox;
                    charMat.map.offset.y = oy;
                }
            }, C.glitch_dur_min + Math.random() * C.glitch_dur_range);
        }

        // --- 电路纹路呼吸 ---
        circuitLines.forEach((l) => {
            const ud = l.userData;
            l.material.opacity = C.circuit_opacity * (0.55 + Math.sin(t * ud.speed + ud.phase) * 0.45);
        });
    }

    function dispose() {
        charGeo.dispose();
        if (charMat.map) charMat.map.dispose();
        charMat.dispose();

        edgeGlowGeo.dispose();
        edgeGlowMat.dispose();
        glowTex.dispose();

        scanGeo.dispose();
        scanMat.dispose();

        auraGeo.dispose();
        auraMat.dispose();
        particleGlowTex.dispose();

        pulseRings.forEach((r) => {
            r.geometry.dispose();
            r.material.dispose();
        });
        pulseRings.length = 0;

        circuitLines.forEach((l) => {
            l.geometry.dispose();
            l.material.dispose();
        });
        circuitLines.length = 0;
        circuitNodes.forEach((n) => {
            n.geometry.dispose();
            n.material.dispose();
        });
        circuitNodes.length = 0;
        viaGeo.dispose();
        padGeo.dispose();
    }

    // ====================================================================
    // === 视角：正面 + 5° 俯视 ===========================================
    // ====================================================================
    group.rotation.x = THREE.MathUtils.degToRad(C.pitch_deg);
    group.rotation.y = THREE.MathUtils.degToRad(C.yaw_deg);

    return { setGlow, animate, dispose, autoRotate: false };
}