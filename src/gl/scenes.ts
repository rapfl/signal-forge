import { COMMON_GLSL, MAIN_GLSL } from "./shaders/common.glsl";
import { KALI_GLSL } from "./shaders/kali.glsl";
import { JULIA_GLSL } from "./shaders/julia.glsl";
import { MANDELBOX_GLSL } from "./shaders/mandelbox.glsl";

export interface Scene {
  id: string;
  name: string;
  description: string;
  fragmentSource: string;
}

const build = (body: string) => COMMON_GLSL + body + MAIN_GLSL;

export const SCENES: Scene[] = [
  {
    id: "kali",
    name: "Kaliset Mandala",
    description: "Kaleidoscopic folds — liquid symmetry",
    fragmentSource: build(KALI_GLSL),
  },
  {
    id: "julia",
    name: "Julia Drift",
    description: "Morphing Julia set, infinite zoom",
    fragmentSource: build(JULIA_GLSL),
  },
  {
    id: "mandelbox",
    name: "Mandelbox Tunnel",
    description: "Raymarched 3D fractal flythrough",
    fragmentSource: build(MANDELBOX_GLSL),
  },
];

export const getScene = (id: string): Scene =>
  SCENES.find((s) => s.id === id) ?? SCENES[0];

// iq cosine palettes: { a, b, c, d } -> color(t) = a + b*cos(2pi*(c*t + d))
export interface Palette {
  id: string;
  name: string;
  a: [number, number, number];
  b: [number, number, number];
  c: [number, number, number];
  d: [number, number, number];
}

export const PALETTES: Palette[] = [
  {
    id: "neon",
    name: "Neon Acid",
    a: [0.5, 0.5, 0.5],
    b: [0.5, 0.5, 0.5],
    c: [1.0, 1.0, 1.0],
    d: [0.0, 0.33, 0.67],
  },
  {
    id: "magma",
    name: "Magma",
    a: [0.5, 0.4, 0.3],
    b: [0.5, 0.5, 0.5],
    c: [1.0, 1.0, 0.5],
    d: [0.8, 0.9, 0.3],
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    a: [0.4, 0.5, 0.6],
    b: [0.4, 0.4, 0.5],
    c: [1.0, 1.0, 1.0],
    d: [0.6, 0.5, 0.3],
  },
  {
    id: "spectrum",
    name: "Full Spectrum",
    a: [0.5, 0.5, 0.5],
    b: [0.5, 0.5, 0.5],
    c: [2.0, 1.0, 0.0],
    d: [0.5, 0.2, 0.25],
  },
];

export const getPalette = (id: string): Palette =>
  PALETTES.find((p) => p.id === id) ?? PALETTES[0];
