// Raymarched mandelbox — a 3D folding fractal. Rewritten for "human consumption":
// the camera ORBITS smoothly (no teleporting), the surface is properly lit (diffuse +
// rim + ambient occlusion + soft fog) instead of additive glow soup, and everything
// moves slowly. Bass gives a gentle scale breathe; the fractal morphs via u_evolve.
export const MANDELBOX_GLSL = /* glsl */ `
float de(vec3 p, out float trap) {
  vec3 z = p;
  // The fold scale is the mandelbox's master shape knob — swinging it across ~1.75..2.45
  // continuously re-forms the whole structure (chambers, lattices, spires).
  float scale = 2.2 + 0.28 * sin(u_evolve * 0.13)
              + 0.1 * sin(u_evolve * 0.31) + 0.16 * u_bass + 0.08 * u_mid;
  float dr = 1.0;
  trap = 1e10;
  const int IT = 11;
  for (int i = 0; i < IT; i++) {
    z = clamp(z, -1.0, 1.0) * 2.0 - z;        // box fold
    float r2 = dot(z, z);
    if (r2 < 0.25) { float t = 4.0; z *= t; dr *= t; }       // sphere fold
    else if (r2 < 1.0) { float t = 1.0 / r2; z *= t; dr *= t; }
    z = z * scale + p;
    dr = dr * abs(scale) + 1.0;
    trap = min(trap, r2);                       // orbit trap for coloring
  }
  return length(z) / abs(dr);
}

vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(0.0008, 0.0);
  float t;
  return normalize(vec3(
    de(p + e.xyy, t) - de(p - e.xyy, t),
    de(p + e.yxy, t) - de(p - e.yxy, t),
    de(p + e.yyx, t) - de(p - e.yyx, t)
  ));
}

vec3 scene(vec2 uv) {
  // Slow orbit plus a long dolly that pushes in toward the surface and back out, so we
  // travel through the (morphing) structure rather than circling a static shape.
  float t = u_time * 0.06 + u_evolve * 0.15;
  float radius = 2.7 + 0.35 * sin(u_evolve * 0.11) - 0.34 * u_bass - 0.08 * u_beat;
  vec3 ro = radius * vec3(sin(t), 0.35 * sin(t * 0.6), cos(t));
  vec3 ta = vec3(
    0.08 * u_mid * sin(u_evolve * 0.9),
    0.06 * u_mid * cos(u_evolve * 0.7),
    0.0
  );

  vec3 fwd = normalize(ta - ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, rt);
  uv += 0.006 * u_high * vec2(
    sin(uv.y * 34.0 + u_time * 12.0),
    cos(uv.x * 33.0 - u_time * 11.0)
  );
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.5 * fwd);

  float dist = 0.0;
  float trap = 1e10;
  float steps = 0.0;
  bool hit = false;
  const int MAX = 110;
  for (int i = 0; i < MAX; i++) {
    vec3 pos = ro + rd * dist;
    float tr;
    float d = de(pos, tr);
    if (d < 0.0008 * dist + 0.0006) { trap = tr; hit = true; break; }
    if (dist > 9.0) break;
    dist += d * 0.9;
    steps += 1.0;
  }

  // Background: deep slowly-shifting palette wash so misses aren't flat black.
  vec3 bg = palette(0.6 + u_evolve * 0.05) * (0.06 + 0.04 * uv.y);

  if (!hit) return bg;

  vec3 pos = ro + rd * dist;
  vec3 n = calcNormal(pos);
  vec3 lightDir = normalize(vec3(0.7, 0.9, -0.4));

  float diff = clamp(dot(n, lightDir), 0.0, 1.0);
  float ao = 1.0 - steps / float(MAX);                       // cheap occlusion
  float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0); // rim light
  float fog = exp(-dist * 0.18);

  // Color from the orbit trap + position so structure reads clearly.
  float ct = sqrt(trap) * 1.5 + length(pos) * 0.15 + u_paletteShift * 0.5 + u_evolve * 0.08;
  vec3 base = palette(ct);

  vec3 col = base * (0.18 + 0.9 * diff) * (0.4 + 0.6 * ao);
  col += fres * palette(ct + 0.4) * 0.5;
  float sparkle = pow(sin((pos.x + pos.y + pos.z) * 18.0 + u_time * 13.0) * 0.5 + 0.5, 6.0);
  col *= 1.0 + 0.18 * u_high;
  col *= 1.0 + 0.22 * u_beat + 0.1 * u_bass;
  col += palette(ct + 0.75) * sparkle * u_high * 0.12;
  col = mix(bg, col, fog);
  return col;
}
`;
