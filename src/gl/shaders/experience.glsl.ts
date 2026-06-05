export const FLOWING_VERTEX_GLSL = /* glsl */ `
vec3 scene(vec2 uv) {
  float e = u_evolve;
  uv *= 1.25 - 0.16 * u_bass - 0.06 * u_beat;
  uv *= rot(e * 0.08 + u_mid * 0.18);

  vec2 p = uv;
  float acc = 0.0;
  float lines = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    p = abs(p) / max(dot(p, p), 0.14) - vec2(0.82 + 0.08 * sin(e * 0.2 + fi), 0.68);
    p *= rot(0.34 + 0.09 * sin(e * 0.17 + fi));
    float d = abs(p.x * p.y);
    acc += exp(-length(p) * (1.65 + 0.25 * u_rms));
    lines += 0.006 / (0.008 + d);
  }

  float t = acc * 0.2 + lines * 0.03 + e * 0.08;
  vec3 col = palette(t) * (0.16 + 0.32 * acc);
  col += palette(t + 0.45) * lines * (0.18 + 0.12 * u_high);
  col *= 1.0 + 0.18 * u_beat;
  return col;
}
`;

export const ORGANIC_ICOSAHEDRON_GLSL = /* glsl */ `
float icoFold(vec3 p) {
  const vec3 n1 = normalize(vec3(1.0, 1.618, 0.0));
  const vec3 n2 = normalize(vec3(1.618, 0.0, 1.0));
  const vec3 n3 = normalize(vec3(0.0, 1.0, 1.618));
  p = abs(p);
  p -= 2.0 * min(0.0, dot(p, n1)) * n1;
  p -= 2.0 * min(0.0, dot(p, n2)) * n2;
  p -= 2.0 * min(0.0, dot(p, n3)) * n3;
  return length(p) - 0.74;
}

vec3 scene(vec2 uv) {
  float e = u_evolve;
  uv *= 1.05 - 0.1 * u_bass;
  vec3 ro = vec3(0.0, 0.0, -3.2);
  vec3 rd = normalize(vec3(uv, 1.75));
  float t = 0.0;
  float shade = 0.0;
  float glow = 0.0;
  for (int i = 0; i < 58; i++) {
    vec3 p = ro + rd * t;
    p.xy *= rot(e * 0.12 + t * 0.06);
    p.yz *= rot(e * 0.09);
    float wobble = 0.06 * sin(8.0 * p.x + e) * sin(7.0 * p.y - e * 0.7);
    float d = icoFold(p) + wobble - 0.1 * u_bass;
    glow += 0.012 / (0.018 + abs(d));
    if (d < 0.006) {
      shade = 1.0 - float(i) / 58.0;
      break;
    }
    t += max(d * 0.55, 0.018);
    if (t > 6.0) break;
  }
  vec3 col = palette(shade + e * 0.07) * (0.08 + 0.75 * shade);
  col += palette(e * 0.05 + 0.25) * glow * 0.11;
  col *= 1.0 + 0.16 * u_beat + 0.1 * u_mid;
  return col;
}
`;

export const REVOLVING_FLOWER_GLSL = /* glsl */ `
vec3 scene(vec2 uv) {
  float e = u_evolve;
  float a = atan(uv.y, uv.x);
  float r = length(uv) * (1.28 - 0.14 * u_bass);
  float petals = 8.0 + floor(3.0 * (0.5 + 0.5 * sin(e * 0.18)));
  float wave = sin(a * petals + e * 1.2 + r * 8.0);
  float flower = abs(r - (0.44 + 0.16 * wave + 0.07 * sin(a * petals * 0.5 - e)));
  float rings = abs(sin(r * 24.0 - e * 2.0 - u_beat * 0.8));
  float core = 0.018 / (0.02 + flower);
  float lace = 0.022 / (0.028 + rings + flower * 2.5);
  float t = a / TAU + r * 0.45 + e * 0.07;
  vec3 col = palette(t) * core * 0.55;
  col += palette(t + 0.35) * lace * (0.26 + 0.16 * u_high);
  col *= smoothstep(1.55, 0.0, r);
  return col;
}
`;

export const HAIRBALL_FIELD_GLSL = /* glsl */ `
vec3 scene(vec2 uv) {
  float e = u_evolve;
  uv *= 1.1 - 0.12 * u_bass;
  float acc = 0.0;
  float strands = 0.0;
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    vec2 c = 0.72 * vec2(sin(fi * 2.37 + e * 0.24), cos(fi * 1.91 - e * 0.21));
    vec2 p = uv - c;
    p *= rot(fi + e * (0.16 + 0.02 * sin(fi)));
    float curl = sin(p.x * 18.0 + sin(p.y * 8.0 + e) * 2.4);
    float d = abs(p.y + 0.05 * curl) + length(p) * 0.08;
    strands += 0.004 / (0.006 + d);
    acc += exp(-length(p) * 5.0);
  }
  float t = acc * 0.2 + strands * 0.02 + e * 0.05;
  vec3 col = palette(t) * strands * (0.36 + 0.12 * u_high);
  col += palette(t + 0.52) * acc * 0.12;
  col *= 1.0 + 0.2 * u_beat;
  return col;
}
`;

export const MERCURY_CELLS_GLSL = /* glsl */ `
vec3 scene(vec2 uv) {
  float e = u_evolve;
  uv *= 2.1 - 0.2 * u_bass;
  uv += 0.12 * vec2(fbm(uv + e * 0.12), fbm(uv - e * 0.11));
  float cell = 1.0;
  float edge = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = floor(uv) + vec2(float(x), float(y));
      vec2 o = vec2(hash21(g), hash21(g + 13.7));
      o = 0.5 + 0.38 * sin(e * 0.6 + TAU * o);
      float d = length(fract(uv) - vec2(float(x), float(y)) - o);
      edge += 0.006 / (0.01 + abs(d - 0.28 - 0.05 * u_mid));
      cell = min(cell, d);
    }
  }
  float metal = smoothstep(0.52, 0.05, cell);
  float t = cell * 1.6 + e * 0.08;
  vec3 col = palette(t) * (0.18 + 0.72 * metal);
  col += palette(t + 0.32) * edge * (0.14 + 0.08 * u_high);
  col *= 1.0 + 0.15 * u_beat;
  return col;
}
`;

export const RADIATION_RINGS_GLSL = /* glsl */ `
vec3 scene(vec2 uv) {
  float e = u_evolve;
  uv *= 1.25 - 0.18 * u_bass;
  uv *= rot(0.04 * u_time + e * 0.05);
  float a = atan(uv.y, uv.x);
  float r = length(uv);
  float rays = pow(abs(sin(a * 18.0 + e * 1.1 + sin(r * 5.0))), 8.0);
  float rings = 0.5 + 0.5 * sin(r * 34.0 - e * 2.4 - u_beat * 1.2);
  float pulse = 0.018 / (0.025 + abs(fract(r * 5.0 - e * 0.22) - 0.5));
  float halo = exp(-r * 1.4);
  float t = a / TAU + r * 0.6 + e * 0.06;
  vec3 col = palette(t) * (halo * 0.42 + rays * rings * 0.5);
  col += palette(t + 0.45) * pulse * (0.2 + 0.1 * u_high);
  col *= 1.0 + 0.22 * u_beat;
  return col;
}
`;

export const TORUS_KNOT_GLSL = /* glsl */ `
float torus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

vec3 scene(vec2 uv) {
  float e = u_evolve;
  vec3 ro = vec3(0.0, 0.0, -3.4);
  vec3 rd = normalize(vec3(uv * (1.0 - 0.08 * u_bass), 1.7));
  float dist = 0.0;
  float hit = 0.0;
  float glow = 0.0;
  for (int i = 0; i < 72; i++) {
    vec3 p = ro + rd * dist;
    p.xy *= rot(e * 0.18 + p.z * 0.35);
    p.xz *= rot(e * 0.12);
    float k = sin(atan(p.z, p.x) * 3.0 + e * 1.1) * 0.09;
    float d = torus(p, vec2(0.78 + k + 0.08 * u_bass, 0.12 + 0.035 * sin(e + p.y * 5.0)));
    glow += 0.01 / (0.014 + abs(d));
    if (d < 0.005) {
      hit = 1.0 - float(i) / 72.0;
      break;
    }
    dist += max(d * 0.6, 0.018);
    if (dist > 6.0) break;
  }
  float t = hit + e * 0.07 + dist * 0.04;
  vec3 col = palette(t) * hit * 0.8;
  col += palette(t + 0.4) * glow * (0.09 + 0.04 * u_high);
  col *= 1.0 + 0.18 * u_beat;
  return col;
}
`;

export const PENTA_FLAKE_GLSL = /* glsl */ `
vec3 scene(vec2 uv) {
  float e = u_evolve;
  uv *= 1.35 - 0.15 * u_bass;
  uv *= rot(e * 0.08);
  float acc = 0.0;
  float edge = 0.0;
  vec2 p = uv;
  for (int i = 0; i < 7; i++) {
    float a = atan(p.y, p.x);
    float r = length(p);
    a = abs(mod(a + PI / 5.0, TAU / 5.0) - PI / 5.0);
    p = vec2(cos(a), sin(a)) * r;
    p = p * 1.72 - vec2(0.82 + 0.06 * sin(e * 0.2), 0.0);
    p *= rot(0.18 * sin(e * 0.17 + float(i)));
    float d = abs(length(p) - 0.45);
    acc += exp(-d * 7.0) * pow(0.86, float(i));
    edge += 0.006 / (0.012 + d);
  }
  float t = acc * 0.22 + e * 0.06;
  vec3 col = palette(t) * (0.16 + 0.34 * acc);
  col += palette(t + 0.33) * edge * (0.15 + 0.08 * u_high);
  col *= 1.0 + 0.2 * u_beat;
  return col;
}
`;

export const RIPPLED_LINES_GLSL = /* glsl */ `
vec3 scene(vec2 uv) {
  float e = u_evolve;
  uv *= 1.45 - 0.16 * u_bass;
  uv += 0.1 * vec2(fbm(uv * 1.4 + e * 0.16), fbm(uv * 1.4 - e * 0.13));
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float wave = sin(uv.y * 28.0 + sin(uv.x * 7.0 + e) * 3.0 + e * 2.0);
  float ripple = sin(r * 32.0 - e * 2.2 + 4.0 * sin(a * 6.0));
  float lines = 0.012 / (0.018 + abs(wave));
  float rings = 0.01 / (0.02 + abs(ripple));
  float t = uv.x * 0.2 + r * 0.35 + e * 0.08;
  vec3 col = palette(t) * lines * (0.34 + 0.12 * u_high);
  col += palette(t + 0.48) * rings * (0.28 + 0.08 * u_mid);
  col *= smoothstep(1.7, 0.05, r);
  col *= 1.0 + 0.16 * u_beat;
  return col;
}
`;

export const TRI_HEX_CORE_GLSL = /* glsl */ `
float hexDist(vec2 p) {
  p = abs(p);
  return max(dot(p, normalize(vec2(1.0, 1.73))), p.x);
}

vec3 scene(vec2 uv) {
  float e = u_evolve;
  uv *= 1.55 - 0.18 * u_bass;
  uv *= rot(e * 0.1 + u_mid * 0.12);
  float acc = 0.0;
  float grid = 0.0;
  vec2 p = uv;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    p = abs(p);
    p -= vec2(0.42 + 0.04 * sin(e * 0.3 + fi), 0.24);
    p *= rot(PI / 3.0 + 0.08 * sin(e * 0.2 + fi));
    float h = abs(hexDist(p) - 0.28);
    float tri = abs(max(abs(p.x) * 0.866 + p.y * 0.5, -p.y) - 0.22);
    acc += exp(-min(h, tri) * 9.0) * pow(0.88, fi);
    grid += 0.006 / (0.01 + min(h, tri));
    p *= 1.18;
  }
  float t = acc * 0.18 + e * 0.07;
  vec3 col = palette(t) * (0.14 + 0.38 * acc);
  col += palette(t + 0.4) * grid * (0.13 + 0.08 * u_high);
  col *= 1.0 + 0.2 * u_beat;
  return col;
}
`;
