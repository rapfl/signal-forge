// Kaleidoscopic IFS ("kali" / Kaliset). The fractal's DEFINING parameters animate, so
// the structure genuinely metamorphoses rather than just spinning: the IFS offset sweeps
// a wide path (reshaping the whole attractor), the per-iteration twist drifts, the fold
// symmetry breathes, and a slow zoom unfolds the pattern in and out of its own detail.
export const KALI_GLSL = /* glsl */ `
vec3 scene(vec2 uv) {
  float e = u_evolve;

  // Breathing zoom: dives into the self-similar detail and pulls back out (~35s cycle).
  float zoomBreath = exp(0.85 * sin(e * 0.18));
  float bassPulse = 1.0 - 0.22 * u_bass - 0.08 * u_beat;
  uv *= 1.4 * bassPulse * zoomBreath;
  uv *= rot(u_time * 0.03 + e * 0.09 + u_beat * 0.18 + u_mid * 0.08);

  // Symmetry slowly shifts between ~5 and ~9 wedges.
  float folds = 7.0 + 2.0 * sin(e * 0.21) + u_mid * 1.8;
  uv = kaleido(uv, folds);

  // Organic warp that itself drifts.
  uv += (0.06 + 0.055 * u_mid) * vec2(fbm(uv * 1.3 + e * 0.25), fbm(uv * 1.3 - e * 0.2));
  uv += 0.01 * u_high * vec2(
    sin(uv.y * 38.0 + u_time * 11.0),
    cos(uv.x * 35.0 - u_time * 10.0)
  );

  // The IFS offset is what shapes the fractal — sweep it on a wide Lissajous path so the
  // structure continuously transforms (blooms, knots, lattices).
  vec2 off = vec2(
    0.86 + 0.30 * sin(e * 0.31) + 0.14 * u_bass,
    0.66 + 0.28 * sin(e * 0.23 + 1.7) + 0.12 * u_mid
  );
  // Per-iteration twist drift reshapes the swirl detail.
  float twist = 0.14 + 0.22 * sin(e * 0.27) + u_mid * 0.12 + u_high * 0.08;

  vec2 p = uv;
  float accum = 0.0;
  float scale = 1.0;
  const int ITER = 14;
  for (int i = 0; i < ITER; i++) {
    p = abs(p) / dot(p, p) - off;
    p *= rot(twist);
    float m = length(p);
    accum += exp(-m * (3.0 - 1.0 * u_rms)) * scale;
    scale *= 0.92;
  }

  float fizz = sin(length(p) * 24.0 - u_time * 14.0) * 0.5 + 0.5;
  float t = accum * 0.5 + u_time * 0.05 + u_high * (0.2 + 0.2 * fizz) + e * 0.1;
  vec3 col = palette(t);
  col *= 0.4 + accum * 0.35;
  col *= 1.0 + 0.26 * u_beat + 0.1 * u_bass;
  col += palette(t + 0.45) * fizz * u_high * 0.09;
  return col;
}
`;
