varying vec3 vNormal;
varying vec3 vViewDir;

uniform float uGlowIntensity;
uniform vec3 uGlowColor;
uniform float uRimPower;

void main() {
    // Fresnel rim effect: 0 at center, 1 at edges
    float rim = 1.0 - abs(dot(vNormal, vViewDir));
    rim = pow(rim, uRimPower);

    float glow = rim * uGlowIntensity;

    // Dark center to glowing edge
    vec3 color = mix(vec3(0.0, 0.0, 0.0), uGlowColor, glow);

    // Alpha: opaque center, fading to semi-transparent at extreme edge
    float alpha = mix(0.95, 0.15, rim);
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
}