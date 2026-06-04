import { create } from "zustand";
import { SCENES, PALETTES } from "../gl/scenes";

export interface Sensitivity {
  bass: number;
  mid: number;
  high: number;
  beat: number;
}

export type ExportStatus = "idle" | "recording" | "encoding" | "done" | "error";

interface AppState {
  // source
  fileName: string | null;
  hasAudio: boolean;

  // visual params
  sceneId: string;
  paletteId: string;
  speed: number;
  intensity: number; // master reactivity 0 (calm) .. 2 (intense)
  evolution: number; // rate of autonomous structural morphing
  sensitivity: Sensitivity;

  // transport (currentTime is updated from the render loop)
  playing: boolean;
  currentTime: number;
  duration: number;

  // export
  exportStatus: ExportStatus;
  exportProgress: number; // 0..1
  exportMessage: string;

  setFile: (name: string, duration: number) => void;
  setScene: (id: string) => void;
  setPalette: (id: string) => void;
  setSpeed: (v: number) => void;
  setIntensity: (v: number) => void;
  setEvolution: (v: number) => void;
  setSensitivity: (key: keyof Sensitivity, v: number) => void;
  setPlaying: (v: boolean) => void;
  setCurrentTime: (t: number) => void;
  setExport: (status: ExportStatus, progress?: number, message?: string) => void;
}

export const useStore = create<AppState>((set) => ({
  fileName: null,
  hasAudio: false,

  sceneId: SCENES[0].id,
  paletteId: PALETTES[0].id,
  speed: 1,
  intensity: 1,
  evolution: 1,
  sensitivity: { bass: 1, mid: 1, high: 1, beat: 1 },

  playing: false,
  currentTime: 0,
  duration: 0,

  exportStatus: "idle",
  exportProgress: 0,
  exportMessage: "",

  setFile: (name, duration) =>
    set({ fileName: name, hasAudio: true, duration, currentTime: 0, playing: false }),
  setScene: (id) => set({ sceneId: id }),
  setPalette: (id) => set({ paletteId: id }),
  setSpeed: (v) => set({ speed: v }),
  setIntensity: (v) => set({ intensity: v }),
  setEvolution: (v) => set({ evolution: v }),
  setSensitivity: (key, v) =>
    set((s) => ({ sensitivity: { ...s.sensitivity, [key]: v } })),
  setPlaying: (v) => set({ playing: v }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setExport: (status, progress = 0, message = "") =>
    set({ exportStatus: status, exportProgress: progress, exportMessage: message }),
}));
