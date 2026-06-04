// Shared GLSL prelude: precision, uniforms, and helper functions reused by every scene.
// Concatenated ahead of each scene's body (which must define `vec3 scene(vec2 uv)`).
export const COMMON_GLSL = /* glsl */ `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_bass;     // 0..1 smoothed low-band energy
uniform float u_mid;      // 0..1 smoothed mid-band energy
uniform float u_high;     // 0..1 smoothed high-band energy
uniform float u_rms;      // 0..1 overall loudness
uniform float u_beat;     // 0..1 decaying beat impulse
uniform float u_zoom;     // accumulated zoom (driven on JS side)
uniform float u_paletteShift; // hue rotation accumulator
uniform float u_evolve;   // slow, audio-independent phase for continuous morphing
uniform vec3  u_palA;     // iq cosine palette coefficients
uniform vec3  u_palB;
uniform vec3  u_palC;
uniform vec3  u_palD;

const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Inigo Quilez cosine palette — cheap, smooth, endlessly tweakable color cycling.
vec3 palette(float t) {
  return u_palA + u_palB * cos(TAU * (u_palC * t + u_palD + u_paletteShift));
}

// Kaleidoscopic fold — mirrors space into n wedges for that mandala symmetry.
vec2 kaleido(vec2 p, float n) {
  float a = atan(p.y, p.x);
  float r = length(p);
  float seg = TAU / n;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  return vec2(cos(a), sin(a)) * r;
}

// Cheap value noise + fbm for slow, organic domain warping (subtle evolution).
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1, 0));
  float c = hash21(i + vec2(0, 1));
  float d = hash21(i + vec2(1, 1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}
`;

// Shared entry point. Each scene defines `vec3 scene(vec2 uv)`; this normalizes
// coordinates (aspect-correct, origin-centered) and applies a subtle vignette + gamma.
export const MAIN_GLSL = /* glsl */ `
void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  vec3 col = scene(uv);
  float vig = 1.0 - 0.25 * dot(uv, uv);
  col *= vig;
  col = pow(max(col, 0.0), vec3(0.4545)); // linear -> sRGB-ish
  fragColor = vec4(col, 1.0);
}
`;

