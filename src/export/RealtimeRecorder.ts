/**
 * Realtime export: taps the live canvas (captureStream) and the audio engine's
 * MediaStream, muxes them with MediaRecorder into a WebM. 1x duration, works in all
 * Chromium-based browsers and Firefox. This is the always-available fallback path.
 */
export interface RecorderResult {
  blob: Blob;
  extension: string;
}

export class RealtimeRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  static isSupported(): boolean {
    return typeof MediaRecorder !== "undefined";
  }

  private pickMime(): string {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return "video/webm";
  }

  start(canvas: HTMLCanvasElement, audioStream: MediaStream, fps: number, includeAudio = true) {
    const videoStream = canvas.captureStream(fps);
    const tracks = [
      ...videoStream.getVideoTracks(),
      ...(includeAudio ? audioStream.getAudioTracks() : []),
    ];
    const combined = new MediaStream(tracks);

    const mimeType = this.pickMime();
    this.chunks = [];
    this.recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: 12_000_000,
    });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(100);
  }

  stop(): Promise<RecorderResult> {
    return new Promise((resolve, reject) => {
      const rec = this.recorder;
      if (!rec) return reject(new Error("Recorder not started"));
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: "video/webm" });
        resolve({ blob, extension: "webm" });
      };
      rec.stop();
    });
  }
}
