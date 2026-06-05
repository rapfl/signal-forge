import { AudioFeatures } from "./types";

interface Sensitivity {
  bass: number;
  mid: number;
  high: number;
  beat: number;
}

const HZ = { bassMax: 200, midMax: 2000, highMax: 16000 };

/**
 * Turns FFT magnitude frames into smoothed, normalized visual-control features.
 * Stateful: keeps envelope followers and a rolling flux history for beat detection,
 * so it is instantiated once per playback/export session.
 */
export class FeatureExtractor {
  private envBass = 0;
  private envMid = 0;
  private envHigh = 0;
  private envRms = 0;
  private beatEnv = 0;
  private kickPulse = 0;
  private prevSpectrum: Float32Array | null = null;
  private fluxHistory: number[] = [];
  private readonly historyLen = 43; // ~1s at 43 fps

  sensitivity: Sensitivity = { bass: 1, mid: 1, high: 1, beat: 1 };

  reset() {
    this.envBass = this.envMid = this.envHigh = this.envRms = 0;
    this.beatEnv = 0;
    this.kickPulse = 0;
    this.prevSpectrum = null;
    this.fluxHistory = [];
  }

  /**
   * @param mags   Linear magnitudes 0..1, length = fftSize/2 (bin i -> i*sampleRate/fftSize Hz)
   * @param sampleRate audio context sample rate
   * @param dt     seconds since previous frame (for frame-rate-independent decay)
   */
  process(mags: Float32Array, sampleRate: number, dt: number): AudioFeatures {
    const bins = mags.length;
    const hzPerBin = sampleRate / 2 / bins;
    const idx = (hz: number) => Math.min(bins, Math.max(1, Math.round(hz / hzPerBin)));

    const bandEnergy = (loHz: number, hiHz: number) => {
      const lo = idx(loHz);
      const hi = idx(hiHz);
      let sum = 0;
      for (let i = lo; i < hi; i++) sum += mags[i] * mags[i];
      return Math.sqrt(sum / Math.max(1, hi - lo));
    };

    const bass = bandEnergy(20, HZ.bassMax);
    const kick = bandEnergy(35, 140);
    const mid = bandEnergy(HZ.bassMax, HZ.midMax);
    const high = bandEnergy(HZ.midMax, HZ.highMax);

    let rmsAcc = 0;
    for (let i = 0; i < bins; i++) rmsAcc += mags[i] * mags[i];
    const rms = Math.sqrt(rmsAcc / bins);

    // Kick-focused spectral flux: low-frequency onsets drive the beat pulse.
    let flux = 0;
    let kickFlux = 0;
    if (this.prevSpectrum) {
      const kickLo = idx(35);
      const kickHi = idx(160);
      for (let i = 0; i < bins; i++) {
        const d = mags[i] - this.prevSpectrum[i];
        if (d > 0) {
          flux += d;
          if (i >= kickLo && i < kickHi) kickFlux += d * 2.4;
        }
      }
    }
    this.prevSpectrum = mags.slice();

    const kickRise = Math.max(0, bass - this.envBass) * 10.0;
    const kickScore = kickFlux + kickRise + flux * 0.08;

    // Adaptive threshold: beat when kick-band flux exceeds local average by a margin.
    const avg =
      this.fluxHistory.length > 0
        ? this.fluxHistory.reduce((a, b) => a + b, 0) / this.fluxHistory.length
        : 0;
    const isKick = kickScore > avg * 1.35 && kickScore > 0.024;
    this.fluxHistory.push(kickScore);
    if (this.fluxHistory.length > this.historyLen) this.fluxHistory.shift();

    // Envelope followers: fast attack, slow release for punchy-but-stable visuals.
    const follow = (env: number, target: number, attack: number, release: number) => {
      const coeff = target > env ? attack : release;
      const k = 1 - Math.exp(-dt / coeff);
      return env + (target - env) * k;
    };
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    // Slower release => the visuals glide instead of jitter (anti-strobe).
    this.envBass = follow(this.envBass, bass, 0.03, 0.28);
    this.envMid = follow(this.envMid, mid, 0.05, 0.32);
    this.envHigh = follow(this.envHigh, high, 0.04, 0.26);
    this.envRms = follow(this.envRms, rms, 0.08, 0.4);

    const kickBody = clamp01(Math.pow(kick * 8.5 * this.sensitivity.beat, 0.72));
    if (isKick) this.kickPulse = Math.max(this.kickPulse, kickBody);
    this.kickPulse = follow(this.kickPulse, kickBody * 0.35, 0.08, 0.42);
    this.beatEnv = follow(this.beatEnv, this.kickPulse, 0.11, 0.5);

    const s = this.sensitivity;
    // Perceptual scaling: bands are weak in linear magnitude, so boost + soft-knee.
    // Exponent 0.8 (was 0.6) keeps low energy from snapping to full = calmer response.
    const shape = (v: number, gain: number, sens: number) =>
      clamp01(Math.pow(v * gain * sens, 0.8));

    return {
      bass: shape(this.envBass, 6, s.bass),
      mid: shape(this.envMid, 10, s.mid),
      high: shape(this.envHigh, 16, s.high),
      rms: clamp01(this.envRms * 5),
      beat: clamp01(this.beatEnv * s.beat),
    };
  }
}
