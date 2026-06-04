import { AudioFeatures } from "./types";
import { FeatureExtractor } from "./FeatureExtractor";
import { Sensitivity } from "../state/store";

// Compact iterative radix-2 FFT (in-place). Used to analyze the decoded buffer
// deterministically per output frame for frame-accurate export.
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wre = Math.cos(ang);
    const wim = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cre = 1;
      let cim = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tre = re[b] * cre - im[b] * cim;
        const tim = re[b] * cim + im[b] * cre;
        re[b] = re[a] - tre;
        im[b] = im[a] - tim;
        re[a] += tre;
        im[a] += tim;
        const ncre = cre * wre - cim * wim;
        cim = cre * wim + cim * wre;
        cre = ncre;
      }
    }
  }
}

const FFT_SIZE = 2048;
// Match AnalyserNode.getByteFrequencyData's default dB window so offline visuals
// look like the live preview.
const MIN_DB = -100;
const MAX_DB = -30;

/**
 * Precompute a feature frame for every output video frame. Returns one AudioFeatures
 * per frame, run through the same FeatureExtractor (so smoothing/beat logic matches).
 */
export function analyzeOffline(
  buffer: AudioBuffer,
  fps: number,
  sensitivity: Sensitivity,
  durationSec = buffer.duration,
): AudioFeatures[] {
  // Mono mixdown.
  const len = buffer.length;
  const mono = new Float32Array(len);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) mono[i] += data[i];
  }
  const inv = 1 / buffer.numberOfChannels;
  for (let i = 0; i < len; i++) mono[i] *= inv;

  const sampleRate = buffer.sampleRate;
  const frameCount = Math.floor(durationSec * fps);
  const dt = 1 / fps;

  const extractor = new FeatureExtractor();
  extractor.sensitivity = sensitivity;

  const window = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)); // Hann
  }

  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  const bins = FFT_SIZE / 2;
  const mags = new Float32Array(bins);
  const out: AudioFeatures[] = [];

  for (let frame = 0; frame < frameCount; frame++) {
    const center = Math.floor(frame * dt * sampleRate);
    const start = center - FFT_SIZE / 2;
    for (let i = 0; i < FFT_SIZE; i++) {
      const s = start + i;
      const sample = s >= 0 && s < len ? mono[s] : 0;
      re[i] = sample * window[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let i = 0; i < bins; i++) {
      const mag = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / bins;
      // magnitude -> dB -> 0..1 like getByteFrequencyData
      const db = 20 * Math.log10(mag + 1e-9);
      mags[i] = Math.min(1, Math.max(0, (db - MIN_DB) / (MAX_DB - MIN_DB)));
    }
    out.push(extractor.process(mags, sampleRate, dt));
  }
  return out;
}
