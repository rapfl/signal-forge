// Animated Julia set. The seed \`c\` IS the structure, so instead of orbiting a fixed
// circle (which only looks like rotation) it wanders the rich boundary of the Mandelbrot
// set — radius and center both drift — so the Julia continuously morphs between spirals,
// dendrites and island chains. A breathing zoom dives into the boundary filaments.
export const JULIA_GLSL = /* glsl */ `
vec3 scene(vec2 uv) {
  float e = u_evolve;

  // Zoom that pushes into the self-similar boundary detail and back out.
  float zoomBreath = exp(0.7 * sin(e * 0.14));
  float bassPulse = 1.0 - 0.24 * u_bass - 0.08 * u_beat;
  uv *= (1.4 * bassPulse) / zoomBreath;
  uv *= rot(0.035 * u_time + e * 0.05 + u_beat * 0.16 + u_mid * 0.06);
  uv += 0.035 * u_mid * vec2(
    sin(uv.y * 4.0 + e * 0.9),
    cos(uv.x * 4.0 - e * 0.8)
  );
  uv += 0.008 * u_high * vec2(
    sin(uv.y * 32.0 + u_time * 9.0),
    cos(uv.x * 31.0 - u_time * 8.0)
  );

  // Wander the seed near the cardioid/bulb boundary where Julias are most varied.
  float a = e * 0.22 + 0.35 * sin(e * 0.09);
  float r = 0.745 + 0.05 * sin(e * 0.16);
  vec2 c = r * vec2(cos(a), sin(a));
  c += 0.06 * vec2(sin(e * 0.41), cos(e * 0.37)); // small center drift
  c += u_mid * 0.018 * vec2(cos(a * 2.0 + e), sin(a * 2.0 - e));
  c += u_beat * 0.02 * vec2(cos(a * 3.0), sin(a * 3.0));

  vec2 z = uv;
  float i;
  const float MAX = 110.0;
  for (i = 0.0; i < MAX; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 16.0) break;
  }
  float sn = i - log2(log2(dot(z, z))) + 4.0; // smooth iteration count
  float t = sn / MAX;

  float edgeFizz = sin((z.x + z.y) * 18.0 + u_time * 12.0) * 0.5 + 0.5;
  vec3 col = palette(t * 2.0 + u_time * 0.03 + u_high * (0.18 + 0.18 * edgeFizz) + e * 0.1);
  if (i >= MAX) col *= 0.06;            // interior stays dark
  col *= 0.5 + 0.8 * t;
  col *= 1.0 + 0.24 * u_beat + 0.12 * u_bass;
  col += palette(t + 0.7) * edgeFizz * u_high * 0.08;
  return col;
}
`;
