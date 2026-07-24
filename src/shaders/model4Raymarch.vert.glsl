in vec3 position;

void main() {
    // 绕过传统的视图投影，直接绘制全屏 Quad
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
