precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_variant;
uniform vec2 u_pan;
uniform float u_rs;
uniform float u_viewRef;
uniform vec3 u_diskHot;
uniform vec3 u_diskWarm;
uniform vec3 u_diskCool;
uniform mat3 u_groupRot;
uniform float u_glow;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

// --- Hash & noise ---

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float hash11(float p) {
  return fract(sin(p * 127.1) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm3(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

// --- Accretion disk emissivity (equatorial plane) ---

vec3 sampleDisk(vec2 xz, float r, float rs) {
  float innerR = rs * 2.12;
  float outerR = rs * 9.5;
  if (r < innerR * 0.98 || r > outerR + rs * 0.08) return vec3(0.0);

  float sn = xz.y / r;
  float cs = xz.x / r;
  float omega = sqrt(rs / max(r, innerR));
  float rot = u_time * 0.30 * omega * 4.0;
  float cR = cos(rot), sR = sin(rot);

  vec2 q = vec2(cs * cR + sn * sR, -cs * sR + sn * cR);
  float lr = log(r / rs);

  float turb = fbm3(q * 1.8 + vec2(lr * 0.55, lr * 0.25));
  turb += 0.35 * fbm3(q * 4.2 + lr * 0.4);
  turb /= 1.35;
  turb = smoothstep(0.18, 0.85, turb);
  turb = mix(0.40, 1.0, turb);

  float radial = pow((outerR - r) / (outerR - innerR), 0.58);

  float swirl = sin(q.x * 3.8 + q.y * 2.6 + lr * 2.2 + turb * 1.8);
  swirl = 0.81 + 0.19 * swirl;

  float innerEdge = smoothstep(innerR, innerR + rs * 0.18, r);
  float outerEdge = 1.0 - smoothstep(outerR - rs * 1.05, outerR - rs * 0.04, r);
  float innerGlow = exp(-pow((r - innerR * 1.06) / (rs * 0.10), 2.0));

  float beta = 0.38 * omega;
  float doppler = pow(clamp(1.0 + beta * q.y, 0.15, 3.2), 2.6);

  vec3 hot  = u_diskHot;
  vec3 warm = u_diskWarm;
  vec3 cool = u_diskCool;

  vec3 c = mix(cool, warm, radial);
  c = mix(c, hot, radial * radial * turb);
  float inOuterFade = 1.0 - smoothstep(0.12, 0.88, outerEdge);
  c = mix(c, mix(warm, hot, 0.62), inOuterFade * 0.72);

  float brightness = radial * turb * swirl * doppler * innerEdge * outerEdge;
  brightness *= 1.0 + innerGlow * 3.5;
  brightness = max(brightness, innerEdge * radial * mix(0.055, 0.0, 1.0 - outerEdge));
  
  // 结合 u_glow 控制亮度
  brightness *= (u_glow / 0.8);

  return c * brightness * 5.8;
}

mat3 rotX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(1.0, 0.0, 0.0,  0.0, c, -s,  0.0, s, c);
}

mat3 rotZ(float a) {
  float c = cos(a), s = sin(a);
  return mat3(c, -s, 0.0,  s, c, 0.0,  0.0, 0.0, 1.0);
}

// --- Schwarzschild geodesic ray march (Interstellar-style lensing) ---

vec4 renderBlackHole(vec2 uv) {
  float rs = u_rs;
  vec2 p = uv + u_pan * 0.08;

  float pitch, roll, camY, camZ, fov;
  if (u_variant < 0.5) {
    pitch = -0.22; roll = -0.18; camY = 0.20; camZ = -3.8; fov = 1.32;
  } else if (u_variant < 1.5) {
    pitch = -0.04; roll = 0.02; camY = 0.05; camZ = -4.65; fov = 1.24;
  } else {
    pitch = -1.28; roll = 0.12; camY = 0.14; camZ = -3.55; fov = 1.36;
  }

  vec3 ro = vec3(0.0, camY, camZ);
  vec3 rd = normalize(vec3(p.x * fov, p.y * fov, 1.62));

  mat3 orient = rotX(pitch) * rotZ(roll);
  ro = orient * ro;
  rd = orient * rd;

  // 将 Three.js 场景的旋转矩阵应用到射线
  ro = u_groupRot * ro;
  rd = u_groupRot * rd;

  vec3 col = vec3(0.0);
  float weight = 1.0;
  bool captured = false;

  const int STEPS = 120;
  for (int i = 0; i < STEPS; i++) {
    float r = length(ro);

    if (r < rs * 1.02) {
      captured = true;
      break;
    }

    if (r > 28.0) break;

    float stepLen = clamp(0.055 * r, 0.018, 0.12);

    vec3 accel = (-2.1 * rs / pow(r, 3.0)) * ro;
    rd = normalize(rd + accel * stepLen);

    vec3 roNext = ro + rd * stepLen;

    if (ro.y * roNext.y <= 0.0) {
      float t = abs(ro.y) / (abs(ro.y) + abs(roNext.y));
      vec3 hit = mix(ro, roNext, t);
      float rr = length(hit.xz);
      vec3 dCol = sampleDisk(hit.xz, rr, rs);
      if (dot(dCol, dCol) > 0.0) {
        col += dCol * weight;
        weight *= exp(-length(dCol) * 0.28);
      }
    }

    ro = roNext;
  }

  if (captured && length(col) < 0.006) {
    return vec4(0.0, 0.0, 0.0, 1.0);
  }

  float luma = max(max(col.r, col.g), col.b);
  float alpha = smoothstep(0.010, 0.11, luma);
  if (luma > 0.042) {
    alpha = max(alpha, smoothstep(0.042, 0.08, luma) * 0.90);
  } else {
    alpha = min(alpha, luma * 12.0);
  }
  return vec4(col, alpha);
}

vec4 renderBlackHoleAA(vec2 uv) {
  float px = 0.34 / min(u_resolution.x, u_resolution.y);
  vec4 s = renderBlackHole(uv);
  s += renderBlackHole(uv + vec2(px, px * 0.5));
  s += renderBlackHole(uv + vec2(-px * 0.5, px));
  s += renderBlackHole(uv + vec2(px * 0.5, -px));
  return s * 0.25;
}

vec3 bloom(vec3 col) {
  float luma = max(max(col.r, col.g), col.b);
  float glow = smoothstep(0.12, 0.65, luma);
  return col + col * glow * 0.75 * (u_glow / 0.8);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_viewRef;

  float rs = u_rs;
  vec2 p = uv + u_pan * 0.08;
  float dist = length(p);

  vec4 bh = renderBlackHoleAA(uv);

  float shadowR = rs * 1.18;
  float bhLuma = dot(bh.rgb, bh.rgb);

  if (bh.a < 0.004) {
    fragColor = vec4(0.0);
    return;
  }

  if (bhLuma < 1e-6) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 col = bloom(bh.rgb);
  if (u_variant < 0.5) {
    col = col / (col + vec3(0.75));
    col = pow(col, vec3(0.95));
  } else if (u_variant < 1.5) {
    col = col / (col + vec3(0.52));
    col = pow(col, vec3(0.88));
    float ringR = smoothstep(rs * 0.818, rs * 1.818, dist)
                * (1.0 - smoothstep(rs * 2.182, rs * 3.091, dist));
    col += vec3(1.0, 0.72, 0.32) * ringR * 0.14;
  } else {
    col = col / (col + vec3(0.68));
    col = pow(col, vec3(0.92));
  }

  float outLuma = max(max(col.r, col.g), col.b);

  if (dist < shadowR && outLuma < 0.08) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float alpha = dist < shadowR ? max(bh.a, 0.95) : bh.a;
  float edgeW = rs * 0.0545;

  if (abs(dist - shadowR) < edgeW) {
    float t = smoothstep(shadowR - edgeW, shadowR + edgeW, dist);
    if (dist < shadowR && outLuma >= 0.08) {
      alpha = mix(1.0, alpha, t);
    } else if (dist >= shadowR && outLuma < 0.06) {
      alpha *= t;
    }
  }

  float warpCut = (u_variant < 1.5 ? 3.091 : 3.455) * rs;
  if (dist > warpCut) {
    alpha *= smoothstep(0.022, 0.058, outLuma);
  }

  float lensReveal = smoothstep(rs * 2.4, rs * 3.0, dist)
                   * (1.0 - smoothstep(rs * 4.4, rs * 5.1, dist));
  alpha *= 1.0 - lensReveal * 0.72 * (1.0 - smoothstep(0.05, 0.20, outLuma));

  if (alpha < 0.003) {
    fragColor = vec4(0.0);
    return;
  }

  fragColor = vec4(col * alpha, alpha);
}
