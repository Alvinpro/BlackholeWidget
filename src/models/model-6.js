import * as THREE from 'three';
import datUrl from '../assets/model-6.dat?url';

// png 模式: Vite lazy glob (不打包进 dist, 仅 dev 按需加载)
const pngFrameModules = import.meta.glob('../assets/model-6-frames/frame_*.png', { import: 'default' });

// 运行时帧数据 (dat 模式动态填充, png 模式懒加载)
let frameUrls = [];
let frameCount = 0;

// ============================================================
// === 可调参数 — 集中管理, 方便修改 ==========================
// ============================================================

const CONFIG = {
    // ── 灯光 ────────────────────────────────────────────────
    light_ambient:    { color: 0xffffff, intensity: 2.3 },                     // 环境光: 均匀照亮整个场景
    light_key:        { color: 0xfff5e6, intensity: 0.6, x: 5, y: 6, z: 5 }, // 主补光: 模拟上方暖光源
    light_camera:     { color: 0xffffff, intensity: 2.0, distance: 20, x: 0, y: 3, z: 8 }, // 相机柔光: 正面补光
    light_rim:        { color: 0xff4444, intensity: 0.8, distance: 15, x: 0, y: 2.5, z: -6 }, // 轮廓光: 背后红色勾勒边缘
    light_side:       { color: 0xffffff, intensity: 0.4, distance: 12, x: -6, y: 2.5, z: 0 }, // 侧补光: 消除暗面
    light_bottom:     { color: 0x440000, intensity: 0.3, x: 0, y: -5, z: 0 }, // 底部补光: 暗红色底光

    // ── 角色平面 ────────────────────────────────────────────
    char_width:       6,             // 角色平面世界单位宽度 (越大越撑满窗口)
    char_placeholder: 0x330000,      // 纹理加载前的占位色 (暗红)
    char_roughness:   0.15,          // 材质粗糙度 (0=镜面, 1=磨砂)
    char_metalness:   0.05,          // 材质金属度 (0=非金属, 1=金属)

    // ── 底部遮罩 ────────────────────────────────────────────
    mask_opaque_ratio: 0.55,         // 上部不透明比例 (0=全透明, 1=全不透明, 此处 55% 以上渐隐)
    mask_resolution:  128,           // 渐变纹理高度像素 (越大渐变越平滑)

    // ── 边缘辉光 ────────────────────────────────────────────
    glow_opacity:     0.55,                           // 辉光整体透明度
    glow_scale:       1.12,                           // 辉光平面相对角色的放大倍率
    glow_z:           -0.03,                          // 辉光平面 Z 偏移 (负=背后)
    glow_color_inner: 'rgba(255,20,20,0.25)',         // 辉光渐变内圈颜色
    glow_color_mid:   'rgba(255,0,0,0.08)',           // 辉光渐变中圈颜色
    glow_mid_stop:    0.55,                           // 中圈颜色渐变停止位置 (0~1)

    // ── 全息扫描 ────────────────────────────────────────────
    scan_color:       0xff2020,     // 扫描线颜色
    scan_opacity:     0.45,         // 扫描线透明度
    scan_width_scale: 1.08,         // 扫描线宽度 (相对角色宽度)
    scan_height:      0.06,         // 扫描线高度
    scan_z:           0.02,         // 扫描线 Z 偏移 (正=前方)
    scan_freq:        0.75,         // 扫描线上下移动频率

    // ── 能量粒子 ────────────────────────────────────────────
    aura_count:       140,          // 粒子总数
    aura_color:       0xff3030,     // 粒子颜色
    aura_size:        0.4,          // 粒子点大小
    aura_opacity:     0.85,         // 粒子透明度
    aura_margin:      0.5,          // 粒子分布外扩边距 (相对角色边界)
    aura_z:           0.02,         // 粒子层 Z 偏移 (正=前方)
    aura_speed_min:   0.4,          // 粒子飘动最小速度
    aura_speed_range: 1.2,          // 粒子飘动速度随机范围 (实际 = min + random * range)
    aura_amp_min:     0.06,         // 粒子飘动最小振幅
    aura_amp_range:   0.18,         // 粒子飘动振幅随机范围

    // ── 脉冲波纹 ────────────────────────────────────────────
    pulse_freq:       2,            // 脉冲生成频率 (秒/个)
    pulse_max:        5,            // 同时存在最大脉冲数
    pulse_opacity:    1,            // 脉冲透明度
    pulse_color:      0xff3030,     // 脉冲颜色
    pulse_inner:      0.15,         // 脉冲环内半径 (越大中心孔越大)
    pulse_outer:      0.2,         // 脉冲环外半径 (越大环越粗/整体越大)
    pulse_life_min:   2,          // 脉冲最短生命周期 (秒)
    pulse_life_extra: 0.5,          // 脉冲生命周期随机增量 (实际 = min + random * extra)
    pulse_scale_base: 0.3,          // 脉冲初始缩放
    pulse_scale_grow: 10,           // 脉冲扩散倍率 (越大扩散越快越远)
    pulse_y_offset:   0.3,          // 脉冲生成位置向上偏移 (正值=往上, 避免遮罩遮挡)
    pulse_pitch_amp:  -15,             // 脉冲环倾斜偏移角度

    // ── 电路纹路 ────────────────────────────────────────────
    circuit_count:    8,            // 电路走线数量
    circuit_opacity:  0.5,          // 电路整体透明度
    circuit_line_clr: 0xaa2222,     // 走线颜色
    circuit_pad_clr:  0xcc3333,     // 端点焊盘颜色
    circuit_via_clr:  0xbb3333,     // 转角过孔颜色
    circuit_via_in:   0.04,         // 过孔内半径
    circuit_via_out:  0.07,         // 过孔外半径
    circuit_pad_r:    0.06,         // 焊盘半径
    circuit_seg_min:  3,            // 每条走线最少分段数
    circuit_seg_range:4,            // 分段数随机增量 (实际 = min + random * range)
    circuit_len_min:  0.5,          // 每段最短长度
    circuit_len_range:2.0,          // 每段长度随机增量

    // ── 纹理故障 ────────────────────────────────────────────
    glitch_freq:      0.004,        // 故障触发概率 (每帧)
    glitch_x_amp:     0.04,         // 故障水平抖动幅度
    glitch_y_amp:     0.024,        // 故障垂直抖动幅度
    glitch_dur_min:   40,           // 故障最短持续时间 (ms)
    glitch_dur_range: 60,           // 故障持续时间随机增量 (ms)

    // ── 人物动画 ────────────────────────────────────────────
    sway_amp:         0.05,         // 角色上下浮动幅度 (世界单位)
    sway_freq:        1.5,          // 角色上下浮动频率
    scale_amp:        0.015,        // 角色呼吸缩放幅度
    scale_freq:       2.0,          // 角色呼吸缩放频率

    // ── 层次动画: 不同深度层独立轨迹偏差, 营造层次感 ────────
    // 相位越大 = 滞后越明显; 振幅 = 该层偏离角色的幅度
    layer_glow_phase:   1.8,        // 辉光 Y 偏移相位 (最深背景)
    layer_glow_amp:     0.08,       // 辉光 Y 偏移振幅
    layer_glow_scale:   0.03,       // 辉光自身缩放呼吸幅度
    layer_aura_phase:   0.9,        // 粒子群 Y 偏移相位 (中景)
    layer_aura_amp:     0.06,       // 粒子群 Y 偏移振幅
    layer_aura_scale:   0.025,      // 粒子群自身缩放呼吸幅度
    layer_circuit_phase:2.5,        // 电路纹路 Y 偏移相位 (较深背景)
    layer_circuit_amp:  0.07,       // 电路纹路 Y 偏移振幅

    // z 轴漂移 (前后浮动营造深度感)
    layer_glow_z_freq:      0.8,    // 辉光 Z 漂移频率
    layer_glow_z_amp:       0.015,  // 辉光 Z 漂移幅度
    layer_aura_z_freq:      0.7,    // 粒子群 Z 漂移频率
    layer_aura_z_amp:       0.012,  // 粒子群 Z 漂移幅度
    layer_circuit_z_freq:   0.55,   // 电路纹路 Z 漂移频率
    layer_circuit_z_amp:    0.01,   // 电路纹路 Z 漂移幅度

    // 电路线微相位缩放系数 (复用 per-line 随机相位时的倍率)
    circuit_y_phase_factor: 0.5,    // Y 轴偏移使用的相位缩放
    circuit_z_phase_factor: 0.4,    // Z 轴漂移使用的相位缩放

    // ── 视角 ────────────────────────────────────────────────
    pitch_deg:        0,           // 俯视角度 (负 = 上往下, 值越大越俯视)
    yaw_deg:          0,            // 水平旋转 (0 = 正面)

    // ── 帧动画 (仅模型6号) ──────────────────────────────────
    frame_source:     'dat',         // 帧数据来源: 'dat' (压缩包) 或 'png' (独立文件)
    frame_fps:        15,            // 帧动画播放速率 (帧/秒)

    // ── 效果开关 (true=开启, false=关闭) ────────────────────
    fx_lights:        true,         // 6 光源系统
    fx_glow:          true,         // 边缘辉光
    fx_scan:          true,         // 全息扫描线
    fx_aura:          true,         // 能量粒子光晕
    fx_pulse:         true,         // 脉冲波纹
    fx_circuit:       true,         // 电路纹路
    fx_glitch:        false,         // 纹理故障
    fx_mask:          true,         // 底部遮罩
    fx_layers:        false,         // 层次动画偏移
    fx_sway:          true,         // 人物微动 (浮动 + 呼吸缩放)
};

// ============================================================
// ============================================================

/**
 * 模型6号 - 数字角色 (Digi-Girl)
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

    group.add(ambient, keyLight, cameraLight, rimLight, sideFill, bottomLight); ambient.visible = C.fx_lights; keyLight.visible = C.fx_lights; cameraLight.visible = C.fx_lights; rimLight.visible = C.fx_lights; sideFill.visible = C.fx_lights; bottomLight.visible = C.fx_lights;

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

    // 底部渐隐遮罩: Canvas 垂直渐变 → alphaMap, 让底边不是生硬直线
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = 1;
    maskCanvas.height = C.mask_resolution;
    const mctx = maskCanvas.getContext('2d');
    const mGradient = mctx.createLinearGradient(0, 0, 0, maskCanvas.height);
    mGradient.addColorStop(0, 'white');                       // 顶部 = 不透明
    mGradient.addColorStop(C.mask_opaque_ratio, 'white');     // 不透明截止点
    mGradient.addColorStop(1, 'black');                       // 底部 = 完全透明
    mctx.fillStyle = mGradient;
    mctx.fillRect(0, 0, 1, maskCanvas.height);
    const alphaMapTex = new THREE.CanvasTexture(maskCanvas);
    alphaMapTex.minFilter = THREE.LinearFilter;
    charMat.alphaMap = alphaMapTex;
    charMat.needsUpdate = true;

    const characterMesh = new THREE.Mesh(charGeo, charMat);
    characterMesh.position.y = 0;
    group.add(characterMesh);

    // 帧动画纹理加载
    const frameTextures = [];
    let currentFrame = 0;
    let frameTimer = 0;
    const textureLoader = new THREE.TextureLoader();

    function loadFrame(index) {
        if (index >= frameCount) return;
        textureLoader.load(frameUrls[index], (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            frameTextures[index] = tex;
            if (index === 0) {
                charMat.map = tex;
                charMat.color.set(0xffffff);
                charMat.needsUpdate = true;
                const actualRatio = tex.image.width / tex.image.height;
                PH = PW / actualRatio;
                charGeo.dispose();
                characterMesh.geometry = new THREE.PlaneGeometry(PW, PH);
                rebuildSizeDependentEffects();
            }
            if (index < frameCount - 1) loadFrame(index + 1);
        }, undefined, () => {
            if (index === 0) console.warn('模型6号: 帧纹理加载失败, 使用占位渲染');
        });
    }
    (async function initFrames() {
        if (C.frame_source === 'dat') {
            try {
                const resp = await fetch(datUrl);
                const blob = await resp.blob();
                const ds = new DecompressionStream('gzip');
                const decompressed = await new Response(blob.stream().pipeThrough(ds)).arrayBuffer();
                const view = new DataView(decompressed);

                frameCount = view.getUint16(0, true);
                let offset = 2;
                for (let i = 0; i < frameCount; i++) {
                    const len = view.getUint32(offset, true);
                    offset += 4;
                    const frameBytes = decompressed.slice(offset, offset + len);
                    offset += len;
                    frameUrls[i] = URL.createObjectURL(new Blob([frameBytes], { type: 'image/webp' }));
                }
            } catch (e) {
                console.error('模型6号: .dat 加载失败, 回退到 png 模式', e);
                const entries = Object.entries(pngFrameModules).sort(([a], [b]) => a.localeCompare(b));
                if (entries.length > 0) {
                    frameUrls = await Promise.all(entries.map(([, l]) => l()));
                    frameCount = frameUrls.length;
                }
            }
        } else {
            const entries = Object.entries(pngFrameModules).sort(([a], [b]) => a.localeCompare(b));
            if (entries.length > 0) {
                frameUrls = await Promise.all(entries.map(([, l]) => l()));
                frameCount = frameUrls.length;
            }
        }
        loadFrame(0);
    })();

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
    characterMesh.add(edgeGlowMesh); edgeGlowMesh.visible = C.fx_glow;

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
    characterMesh.add(holoScan); holoScan.visible = C.fx_scan;

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
    characterMesh.add(auraPoints); auraPoints.visible = C.fx_aura;

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
        ring.rotation.x = Math.PI / 2 + THREE.MathUtils.degToRad(C.pulse_pitch_amp);  // 水平 + 手动偏移
        ring.position.y = -PH / 2 + C.pulse_y_offset;
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

        frameTimer += 0.016;
        if (frameTimer >= 1 / C.frame_fps && frameTextures.length > 0) {
            frameTimer -= 1 / C.frame_fps;
            currentFrame = (currentFrame + 1) % frameCount;
            if (frameTextures[currentFrame]) {
                charMat.map = frameTextures[currentFrame];
                charMat.needsUpdate = true;
            }
        }

        if (C.fx_sway) {         // --- 角色微动 ---
        characterMesh.position.y = Math.sin(t * C.sway_freq) * C.sway_amp;
        const sway = 1 + Math.sin(t * C.scale_freq) * C.scale_amp;
        characterMesh.scale.set(sway, sway, sway);
        }

        if (C.fx_layers) {         // --- 层次轨迹偏差: 各深度层以不同相位/振幅独立偏移动画 ---
        // 辉光 (最深背景 z=-0.03, 滞后最明显 + 独立缩放呼吸 + z轴漂移)
        edgeGlowMesh.position.y = Math.sin(t * C.sway_freq + C.layer_glow_phase) * C.layer_glow_amp;
        const glowScale = 1 + Math.sin(t * C.scale_freq + C.layer_glow_phase) * C.layer_glow_scale;
        edgeGlowMesh.scale.set(glowScale, glowScale, glowScale);
        edgeGlowMesh.position.z = C.glow_z + Math.sin(t * C.layer_glow_z_freq) * C.layer_glow_z_amp;
        // 粒子群 (中景 z=0.02, 滞后 + 独立缩放呼吸 + z轴漂移)
        auraPoints.position.y = Math.sin(t * C.sway_freq + C.layer_aura_phase) * C.layer_aura_amp;
        const auraGroupScale = 1 + Math.sin(t * C.scale_freq + C.layer_aura_phase) * C.layer_aura_scale;
        auraPoints.scale.setScalar(auraGroupScale);
        auraPoints.position.z = C.aura_z + Math.sin(t * C.layer_aura_z_freq + C.layer_aura_phase) * C.layer_aura_z_amp;
        // 电路纹路 (较深背景 z=-0.02, 每条线保留独立的微相位差异 + z轴漂移)
        for (let i = 0; i < circuitLines.length; i++) {
            const l = circuitLines[i];
            l.position.y = Math.sin(
                t * C.sway_freq + C.layer_circuit_phase + l.userData.phase * C.circuit_y_phase_factor,
            ) * C.layer_circuit_amp;
            l.position.z = Math.sin(
                t * C.layer_circuit_z_freq + l.userData.phase * C.circuit_z_phase_factor,
            ) * C.layer_circuit_z_amp;
        }
        }

        if (C.fx_glow) {         // --- 边缘辉光呼吸 ---
        edgeGlowMat.opacity = C.glow_opacity * (0.5 + Math.sin(t * 1.5) * 0.4);

        } if (C.fx_scan) {         // --- 全息扫描 ---
        const halfH = PH / 2;
        holoScan.position.y = halfH * Math.sin(t * C.scan_freq);
        scanMat.opacity = C.scan_opacity * (0.3 + Math.abs(Math.cos(t * C.scan_freq)) * 0.8);

        } if (C.fx_aura) {         // --- 能量粒子 ---
        const arr = auraGeo.attributes.position.array;
        for (let i = 0; i < auraData.length; i++) {
            const d = auraData[i];
            arr[i * 3] = d.bx + Math.sin(t * d.sp + d.ph) * d.amp;
            arr[i * 3 + 1] = d.by + Math.cos(t * d.sp * 0.7 + d.ph) * d.amp;
        }
        auraGeo.attributes.position.needsUpdate = true;
        auraMat.opacity = 0.5 + Math.sin(t * 2.0) * 0.2;

        } if (C.fx_pulse) {         // --- 脉冲波纹 ---
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
            const s = C.pulse_scale_base + p * C.pulse_scale_grow;
            ring.scale.set(s, s, s);
            ring.material.opacity = C.pulse_opacity * (1 - p);
        }

        } if (C.fx_glitch) {         // --- 纹理故障 ---
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

        } if (C.fx_circuit) {         // --- 电路纹路呼吸 ---
        circuitLines.forEach((l) => {
            const ud = l.userData;
            l.material.opacity = C.circuit_opacity * (0.55 + Math.sin(t * ud.speed + ud.phase) * 0.45);
        });
        }
    }

    function dispose() {
        charGeo.dispose();
        frameTextures.forEach((t) => { if (t) t.dispose(); });
        if (charMat.alphaMap) charMat.alphaMap.dispose();
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