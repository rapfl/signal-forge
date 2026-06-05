import { COMMON_GLSL, MAIN_GLSL } from "./shaders/common.glsl";
import { KALI_GLSL } from "./shaders/kali.glsl";
import { JULIA_GLSL } from "./shaders/julia.glsl";
import { MANDELBOX_GLSL } from "./shaders/mandelbox.glsl";
import {
  FLOWING_VERTEX_GLSL,
  HAIRBALL_FIELD_GLSL,
  MERCURY_CELLS_GLSL,
  ORGANIC_ICOSAHEDRON_GLSL,
  PENTA_FLAKE_GLSL,
  RADIATION_RINGS_GLSL,
  REVOLVING_FLOWER_GLSL,
  RIPPLED_LINES_GLSL,
  TORUS_KNOT_GLSL,
  TRI_HEX_CORE_GLSL,
} from "./shaders/experience.glsl";

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
  {
    id: "flowing-vertex",
    name: "Flowing Vertex",
    description: "Liquid folded vertex lattice",
    fragmentSource: build(FLOWING_VERTEX_GLSL),
  },
  {
    id: "organic-icosahedron",
    name: "Organic Icosahedron",
    description: "Soft raymarched icosahedral form",
    fragmentSource: build(ORGANIC_ICOSAHEDRON_GLSL),
  },
  {
    id: "revolving-flower",
    name: "Revolving Flower",
    description: "Looping radial petal fractal",
    fragmentSource: build(REVOLVING_FLOWER_GLSL),
  },
  {
    id: "hairball-field",
    name: "Hairball Field",
    description: "Curled filament attractor field",
    fragmentSource: build(HAIRBALL_FIELD_GLSL),
  },
  {
    id: "mercury-cells",
    name: "Mercury Cells",
    description: "Organic metallic cell pattern",
    fragmentSource: build(MERCURY_CELLS_GLSL),
  },
  {
    id: "radiation-rings",
    name: "Radiation Rings",
    description: "Pulsing radial ring emission",
    fragmentSource: build(RADIATION_RINGS_GLSL),
  },
  {
    id: "torus-knot",
    name: "Torus Knot",
    description: "Raymarched twisting torus loop",
    fragmentSource: build(TORUS_KNOT_GLSL),
  },
  {
    id: "penta-flake",
    name: "Penta Flake",
    description: "Recursive pentagonal flake",
    fragmentSource: build(PENTA_FLAKE_GLSL),
  },
  {
    id: "rippled-lines",
    name: "Rippled Lines",
    description: "Interference lines and circular ripples",
    fragmentSource: build(RIPPLED_LINES_GLSL),
  },
  {
    id: "tri-hex-core",
    name: "Tri-Hex Core",
    description: "Triangle and hexagon folding core",
    fragmentSource: build(TRI_HEX_CORE_GLSL),
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
  {
    id: "mono",
    name: "Mono B/W",
    a: [0.46, 0.46, 0.46],
    b: [0.5, 0.5, 0.5],
    c: [1.0, 1.0, 1.0],
    d: [0.0, 0.0, 0.0],
  },
  {
    id: "aurora",
    name: "Aurora",
    a: [0.42, 0.48, 0.44],
    b: [0.46, 0.42, 0.5],
    c: [0.9, 1.15, 0.75],
    d: [0.12, 0.34, 0.62],
  },
  {
    id: "infrared",
    name: "Infrared",
    a: [0.52, 0.32, 0.28],
    b: [0.48, 0.34, 0.24],
    c: [1.1, 0.8, 0.55],
    d: [0.02, 0.52, 0.72],
  },
];

export const getPalette = (id: string): Palette =>
  PALETTES.find((p) => p.id === id) ?? PALETTES[0];
