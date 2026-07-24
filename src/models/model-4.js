import * as THREE from 'three';
import vertShader from '../shaders/model4Raymarch.vert.glsl?raw';
import fragShader from '../shaders/model4Raymarch.frag.glsl?raw';

/**
 * 模型4号 - 物理启发式射线追踪透镜黑洞
 * 完全按照 Cosmic 项目中的着色器实现
 */
export default function createModel(group) {
    // 使用 PlaneGeometry 和 RawShaderMaterial 实现全屏射线追踪
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: vertShader,
        fragmentShader: fragShader,
        uniforms: {
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            u_time: { value: 0 },
            u_variant: { value: 0 },
            u_pan: { value: new THREE.Vector2(0, 0) },
            u_rs: { value: 0.11 }, // 与 Cosmic 项目中的史瓦西半径一致
            u_viewRef: { value: 280.0 * (window.devicePixelRatio || 1) },
            u_diskHot: { value: new THREE.Color(1.0, 0.98, 0.88) },
            u_diskWarm: { value: new THREE.Color(1.0, 0.68, 0.14) },
            u_diskCool: { value: new THREE.Color(1.0, 0.42, 0.06) },
            u_groupRot: { value: new THREE.Matrix3() },
            u_glow: { value: 0.8 },
        },
        transparent: true,
        depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false; // 确保绕过相机投影时始终被绘制
    mesh.renderOrder = 0;
    group.add(mesh);

    function syncResolution() {
        const dpr = window.devicePixelRatio || 1;
        material.uniforms.u_resolution.value.set(window.innerWidth * dpr, window.innerHeight * dpr);
        // 使黑洞的视觉大小自适应窗口
        material.uniforms.u_viewRef.value = 280.0 * dpr;
    }

    syncResolution();
    window.addEventListener('resize', syncResolution);

    function setGlow(intensity) {
        material.uniforms.u_glow.value = intensity;
    }

    function animate(elapsed) {
        material.uniforms.u_time.value = elapsed * 0.001;

        // 提取外层组的旋转矩阵并传递给着色器，使右键拖拽可以旋转射线追踪中的黑洞
        const rotMat = new THREE.Matrix4().makeRotationFromEuler(group.rotation);
        const mat3 = new THREE.Matrix3().setFromMatrix4(rotMat);
        material.uniforms.u_groupRot.value.copy(mat3);
    }

    function dispose() {
        window.removeEventListener('resize', syncResolution);
        geometry.dispose();
        material.dispose();
    }

    return { setGlow, animate, dispose };
}
