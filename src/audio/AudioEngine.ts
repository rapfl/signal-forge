/**
 * Wraps Web Audio: decodes an uploaded file, drives playback (play/pause/seek via
 * recreated BufferSource nodes), and exposes an AnalyserNode for real-time FFT plus a
 * MediaStream tap for realtime video export.
 */
export class AudioEngine {
  readonly ctx: AudioContext;
  private analyser: AnalyserNode;
  private gain: GainNode;
  private streamDest: MediaStreamAudioDestinationNode;
  private source: AudioBufferSourceNode | null = null;
  private freqBytes: Uint8Array<ArrayBuffer>;

  buffer: AudioBuffer | null = null;
  private startCtxTime = 0; // ctx.currentTime when playback (re)started
  private startOffset = 0; // position in buffer at that moment
  private _playing = false;
  onEnded: (() => void) | null = null;

  constructor(fftSize = 2048) {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = 0.0; // we do our own smoothing
    this.gain = this.ctx.createGain();
    this.streamDest = this.ctx.createMediaStreamDestination();
    this.analyser.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.gain.connect(this.streamDest);
    this.freqBytes = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }

  get sampleRate() {
    return this.ctx.sampleRate;
  }
  get binCount() {
    return this.analyser.frequencyBinCount;
  }
  get playing() {
    return this._playing;
  }
  get duration() {
    return this.buffer?.duration ?? 0;
  }
  get audioStream() {
    return this.streamDest.stream;
  }

  async load(file: File): Promise<void> {
    const arr = await file.arrayBuffer();
    this.stop();
    this.buffer = await this.ctx.decodeAudioData(arr);
    this.startOffset = 0;
  }

  get currentTime(): number {
    if (!this.buffer) return 0;
    if (this._playing) {
      return Math.min(
        this.buffer.duration,
        this.startOffset + (this.ctx.currentTime - this.startCtxTime),
      );
    }
    return this.startOffset;
  }

  async play(offset?: number) {
    if (!this.buffer) return;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.stopSource();
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.analyser);
    const at = offset ?? this.startOffset;
    src.start(0, at);
    src.onended = () => {
      if (this.source === src && this._playing) {
        this._playing = false;
        this.startOffset = 0;
        this.onEnded?.();
      }
    };
    this.source = src;
    this.startCtxTime = this.ctx.currentTime;
    this.startOffset = at;
    this._playing = true;
  }

  pause() {
    if (!this._playing) return;
    this.startOffset = this.currentTime;
    this._playing = false;
    this.stopSource();
  }

  seek(time: number) {
    const t = Math.max(0, Math.min(this.duration, time));
    if (this._playing) this.play(t);
    else this.startOffset = t;
  }

  stop() {
    this._playing = false;
    this.startOffset = 0;
    this.stopSource();
  }

  private stopSource() {
    if (this.source) {
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
      this.source = null;
    }
  }

  /** Linear magnitudes 0..1 for the current frame. */
  getMagnitudes(): Float32Array {
    this.analyser.getByteFrequencyData(this.freqBytes);
    const out = new Float32Array(this.freqBytes.length);
    for (let i = 0; i < out.length; i++) out[i] = this.freqBytes[i] / 255;
    return out;
  }

  dispose() {
    this.stop();
    this.ctx.close();
  }
}
