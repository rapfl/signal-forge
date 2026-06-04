// Per-frame audio features, all normalized to ~0..1 and smoothed for visual stability.
export interface AudioFeatures {
  bass: number;
  mid: number;
  high: number;
  rms: number;
  beat: number; // decaying impulse, spikes on onset
}

export const ZERO_FEATURES: AudioFeatures = {
  bass: 0,
  mid: 0,
  high: 0,
  rms: 0,
  beat: 0,
};
