// Raymarched mandelbox — a 3D folding fractal with a conservative flythrough camera.
export const MANDELBOX_GLSL = /* glsl */ `
float de(vec3 p, out float trap) {
  vec3 q = p;
  q.xy *= rot(q.z * 0.11 + u_evolve * 0.035);
  q.z = mod(q.z + 3.0, 6.0) - 3.0;
  vec3 z = q;
  float scale = 2.05 + 0.16 * sin(u_evolve * 0.13)
              + 0.06 * sin(u_evolve * 0.31) + 0.08 * u_bass + 0.04 * u_mid;
  float dr = 1.0;
  trap = 1e10;
  const int IT = 8;
  for (int i = 0; i < IT; i++) {
    z = clamp(z, -1.0, 1.0) * 2.0 - z;
    float r2 = dot(z, z);
    if (r2 < 0.25) { float t = 4.0; z *= t; dr *= t; }
    else if (r2 < 1.0) { float t = 1.0 / r2; z *= t; dr *= t; }
    z = z * scale + q;
    dr = dr * abs(scale) + 1.0;
    trap = min(trap, r2);
  }
  float box = length(z) / abs(dr);
  float radius = 0.88 + 0.08 * sin(q.z * 1.4 + u_evolve * 0.2) + 0.05 * u_bass;
  float tunnel = length(p.xy) - radius;
  return max(max(box, -tunnel), 0.0007);
}

vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(0.0022, 0.0);
  float t;
  return normalize(vec3(
    de(p + e.xyy, t) - de(p - e.xyy, t),
    de(p + e.yxy, t) - de(p - e.yxy, t),
    de(p + e.yyx, t) - de(p - e.yyx, t)
  ));
}

vec3 scene(vec2 uv) {
  float t = u_time * 0.045 + u_evolve * 0.11;
  vec3 ro = vec3(
    0.16 * sin(t * 0.9) + 0.08 * sin(t * 2.1),
    0.12 * sin(t * 0.7),
    -5.4 + mod(u_evolve * 0.35, 6.0)
  );
  vec3 ta = vec3(
    0.22 * sin(t * 1.15 + 0.7),
    0.16 * sin(t * 0.8),
    ro.z + 2.4
  );

  vec3 fwd = normalize(ta - ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, rt);
  uv += 0.0025 * u_high * vec2(
    sin(uv.y * 34.0 + u_time * 12.0),
    cos(uv.x * 33.0 - u_time * 11.0)
  );
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.55 * fwd);

  float dist = 0.08;
  float trap = 1e10;
  float steps = 0.0;
  bool hit = false;
  const int MAX = 128;
  for (int i = 0; i < MAX; i++) {
    vec3 pos = ro + rd * dist;
    float tr;
    float d = de(pos, tr);
    if (d < 0.0018 * dist + 0.0022) { trap = tr; hit = true; break; }
    if (dist > 15.0) break;
    dist += d * 0.7;
    steps += 1.0;
  }

  vec3 bg = palette(0.6 + u_evolve * 0.05) * (0.045 + 0.035 * uv.y);

  if (!hit) return bg;

  vec3 pos = ro + rd * dist;
  vec3 n = calcNormal(pos);
  vec3 lightDir = normalize(vec3(0.7, 0.9, -0.4));

  float diff = clamp(dot(n, lightDir), 0.0, 1.0);
  float ao = clamp(1.0 - steps / float(MAX), 0.0, 1.0);
  float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
  float fog = exp(-dist * 0.15);

  float ct = sqrt(trap) * 0.72 + length(pos.xy) * 0.12 + pos.z * 0.035 + u_paletteShift * 0.45 + u_evolve * 0.06;
  vec3 base = palette(ct);

  vec3 col = base * (0.26 + 0.74 * diff) * (0.52 + 0.48 * ao);
  col += fres * palette(ct + 0.4) * 0.24;
  col *= 1.0 + 0.06 * u_high;
  col *= 1.0 + 0.16 * u_beat + 0.08 * u_bass;
  col = mix(bg, col, fog);
  return col;
}
`;
