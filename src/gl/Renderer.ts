import { AudioFeatures, ZERO_FEATURES } from "../audio/types";
import { getPalette, getScene, Palette } from "./scenes";

const VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const UNIFORMS = [
  "u_resolution",
  "u_time",
  "u_bass",
  "u_mid",
  "u_high",
  "u_rms",
  "u_beat",
  "u_zoom",
  "u_paletteShift",
  "u_evolve",
  "u_palA",
  "u_palB",
  "u_palC",
  "u_palD",
] as const;

type UniformMap = Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

export interface RenderParams {
  sceneId: string;
  paletteId: string;
  speed: number; // global time multiplier
  intensity: number; // master scale on audio reactivity (0 = none, 1 = normal)
  evolution: number; // multiplier on the autonomous structural-morph rate
}

/**
 * Fullscreen-quad fragment-shader renderer. Compiles one program per scene (lazily
 * cached), advances internal time/zoom/palette accumulators from audio features, and
 * draws. Designed so the same instance serves the live preview and offline export.
 */
export class Renderer {
  private gl: WebGL2RenderingContext;
  private programs = new Map<string, { prog: WebGLProgram; uniforms: UniformMap }>();
  private currentSceneId = "";
  private time = 0;
  private zoom = 0;
  private paletteShift = 0;
  private evolve = 0;
  // Extra one-pole smoothing on the values sent to the GPU, on top of the audio
  // envelopes — kills any residual frame-to-frame flicker (anti-strobe).
  private sBass = 0;
  private sMid = 0;
  private sHigh = 0;
  private sBeat = 0;
  private sRms = 0;

  constructor(public canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      preserveDrawingBuffer: true, // needed for frame capture
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error("WebGL2 is not supported in this browser.");
    this.gl = gl;

    const quad = new Float32Array([-1, -1, 3, -1, -1, 3]); // single oversized triangle
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error("Shader compile error:\n" + log);
    }
    return sh;
  }

  private getProgram(sceneId: string) {
    let cached = this.programs.get(sceneId);
    if (cached) return cached;

    const gl = this.gl;
    const scene = getScene(sceneId);
    const vs = this.compile(gl.VERTEX_SHADER, VERT);
    const fs = this.compile(gl.FRAGMENT_SHADER, scene.fragmentSource);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "a_pos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("Program link error:\n" + gl.getProgramInfoLog(prog));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const uniforms = {} as UniformMap;
    for (const name of UNIFORMS) uniforms[name] = gl.getUniformLocation(prog, name);
    cached = { prog, uniforms };
    this.programs.set(sceneId, cached);
    return cached;
  }

  resize(width: number, height: number, dpr: number) {
    const w = Math.max(1, Math.floor(width * dpr));
    const h = Math.max(1, Math.floor(height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  reset() {
    this.time = 0;
    this.zoom = 0;
    this.paletteShift = 0;
    this.evolve = 0;
    this.sBass = this.sMid = this.sHigh = this.sBeat = this.sRms = 0;
  }

  /** Advance accumulators and draw one frame. dt in seconds. */
  render(dt: number, features: AudioFeatures, params: RenderParams) {
    const gl = this.gl;
    const raw = features ?? ZERO_FEATURES;

    // Master intensity scales how much the audio pushes the visuals. At 0 the scene
    // runs on pure autonomous evolution; 1 is normal; up to 2 is punchy.
    const I = params.intensity;
    const sat = (v: number) => Math.min(1, v * I);

    const kBass = 1 - Math.exp(-dt / 0.34);
    const kMid = 1 - Math.exp(-dt / 0.18);
    const kHigh = 1 - Math.exp(-dt / 0.055);
    const kBeat = 1 - Math.exp(-dt / (raw.beat > this.sBeat ? 0.09 : 0.38));
    const kRms = 1 - Math.exp(-dt / 0.14);
    this.sBass += (sat(raw.bass) - this.sBass) * kBass;
    this.sMid += (sat(raw.mid) - this.sMid) * kMid;
    this.sHigh += (sat(raw.high) - this.sHigh) * kHigh;
    this.sBeat += (sat(raw.beat) - this.sBeat) * kBeat;
    this.sRms += (sat(raw.rms) - this.sRms) * kRms;
    const f: AudioFeatures = {
      bass: this.sBass,
      mid: this.sMid,
      high: this.sHigh,
      beat: this.sBeat,
      rms: this.sRms,
    };

    this.time += dt * params.speed;
    // Autonomous structural evolution — keeps the geometry morphing even in quiet
    // passages. The Evolution knob scales the rate; mids add a little on top.
    this.evolve += dt * (0.09 + f.mid * 0.09) * params.evolution;
    // Gentle, audio-independent baseline drift; audio adds a modest amount on top.
    this.zoom += dt * (0.045 + f.bass * 0.48) * params.speed;
    this.paletteShift += dt * (0.012 + f.high * 0.2) * params.speed;

    const { prog, uniforms } = this.getProgram(params.sceneId);
    if (this.currentSceneId !== params.sceneId) this.currentSceneId = params.sceneId;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(prog);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(uniforms.u_resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(uniforms.u_time, this.time);
    gl.uniform1f(uniforms.u_bass, f.bass);
    gl.uniform1f(uniforms.u_mid, f.mid);
    gl.uniform1f(uniforms.u_high, f.high);
    gl.uniform1f(uniforms.u_rms, f.rms);
    gl.uniform1f(uniforms.u_beat, f.beat);
    gl.uniform1f(uniforms.u_zoom, this.zoom);
    gl.uniform1f(uniforms.u_paletteShift, this.paletteShift);
    gl.uniform1f(uniforms.u_evolve, this.evolve);

    const pal: Palette = getPalette(params.paletteId);
    gl.uniform3fv(uniforms.u_palA, pal.a);
    gl.uniform3fv(uniforms.u_palB, pal.b);
    gl.uniform3fv(uniforms.u_palC, pal.c);
    gl.uniform3fv(uniforms.u_palD, pal.d);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
