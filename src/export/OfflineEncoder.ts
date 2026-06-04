import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { Renderer, RenderParams } from "../gl/Renderer";
import { analyzeOffline } from "../audio/offlineAnalyze";
import { Sensitivity } from "../state/store";
import { RecorderResult } from "./RealtimeRecorder";

export interface OfflineExportOptions {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  durationSec: number;
  includeAudio: boolean;
  params: RenderParams;
  sensitivity: Sensitivity;
}

/**
 * Deterministic, frame-accurate export. Renders each frame to an offscreen canvas with
 * a dedicated Renderer (fixed dt), encodes video via WebCodecs H.264, encodes the
 * decoded audio to AAC, and muxes both into an MP4. Faster/slower than realtime without
 * dropping frames. Requires WebCodecs (Chrome/Edge); callers fall back otherwise.
 */
export class OfflineEncoder {
  static isSupported(): boolean {
    return (
      typeof VideoEncoder !== "undefined" &&
      typeof VideoFrame !== "undefined" &&
      typeof AudioEncoder !== "undefined" &&
      typeof AudioData !== "undefined"
    );
  }

  async encode(
    buffer: AudioBuffer,
    opts: OfflineExportOptions,
    onProgress: (p: number, msg: string) => void,
  ): Promise<RecorderResult> {
    const { width, height, fps, bitrate, durationSec, includeAudio, params, sensitivity } = opts;
    const videoConfig = await this.getSupportedVideoConfig(width, height, fps, bitrate);

    onProgress(0, "Analyzing audio…");
    const features = analyzeOffline(buffer, fps, sensitivity, durationSec);
    const frameCount = features.length;

    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width, height },
      audio: includeAudio
        ? {
            codec: "aac",
            numberOfChannels: buffer.numberOfChannels,
            sampleRate: buffer.sampleRate,
          }
        : undefined,
      fastStart: "in-memory",
    });

    // --- Video ---
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const renderer = new Renderer(canvas);
    renderer.resize(width, height, 1);
    renderer.reset();

    let videoError: Error | null = null;
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => {
        videoError = e instanceof Error ? e : new Error(String(e));
        console.error("VideoEncoder error", e);
      },
    });
    videoEncoder.configure(videoConfig);

    const dt = 1 / fps;
    const frameDurUs = Math.round(1_000_000 / fps);
    for (let i = 0; i < frameCount; i++) {
      if (videoError) throw videoError;
      renderer.render(dt, features[i], params);
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(i * frameDurUs),
        duration: frameDurUs,
      });
      videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      if (i % 5 === 0) {
        onProgress((i / frameCount) * 0.8, `Rendering frame ${i}/${frameCount}`);
        // Yield so the encoder queue drains and the UI can update.
        if (videoEncoder.encodeQueueSize > 8) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    }
    if (videoError) throw videoError;
    await videoEncoder.flush().catch((e) => {
      throw videoError ?? e;
    });
    videoEncoder.close();

    // --- Audio (AAC) ---
    if (includeAudio) {
      onProgress(0.85, "Encoding audio…");
      await this.encodeAudio(buffer, muxer, durationSec);
    }

    onProgress(0.97, "Finalizing MP4…");
    muxer.finalize();
    const { buffer: out } = muxer.target;
    onProgress(1, "Done");
    return { blob: new Blob([out], { type: "video/mp4" }), extension: "mp4" };
  }

  private async getSupportedVideoConfig(
    width: number,
    height: number,
    fps: number,
    bitrate: number,
  ): Promise<VideoEncoderConfig> {
    const base = {
      width,
      height,
      bitrate,
      framerate: fps,
      hardwareAcceleration: "prefer-hardware" as const,
    };
    const level = width >= 1920 || height >= 1080 ? "2a" : fps > 30 ? "20" : "1f";
    const configs: VideoEncoderConfig[] = [
      { ...base, codec: `avc1.6400${level}` },
      { ...base, codec: `avc1.4d00${level}` },
      { ...base, codec: `avc1.4200${level}` },
    ];

    for (const config of configs) {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) return support.config ?? config;
    }

    throw new Error(`H.264 MP4 export is not supported for ${width}x${height} at ${fps}fps.`);
  }

  private async encodeAudio(
    buffer: AudioBuffer,
    muxer: Muxer<ArrayBufferTarget>,
    durationSec: number,
  ) {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => console.error("AudioEncoder error", e),
    });
    audioEncoder.configure({
      codec: "mp4a.40.2",
      numberOfChannels: channels,
      sampleRate,
      bitrate: 192_000,
    });

    const CHUNK = 1024;
    const total = Math.min(buffer.length, Math.floor(durationSec * sampleRate));
    // Pre-read channel data once.
    const chans: Float32Array[] = [];
    for (let c = 0; c < channels; c++) chans.push(buffer.getChannelData(c));

    for (let start = 0; start < total; start += CHUNK) {
      const frames = Math.min(CHUNK, total - start);
      // Planar f32: channel 0 samples, then channel 1, …
      const planar = new Float32Array(frames * channels);
      for (let c = 0; c < channels; c++) {
        planar.set(chans[c].subarray(start, start + frames), c * frames);
      }
      const data = new AudioData({
        format: "f32-planar",
        sampleRate,
        numberOfFrames: frames,
        numberOfChannels: channels,
        timestamp: Math.round((start / sampleRate) * 1_000_000),
        data: planar,
      });
      audioEncoder.encode(data);
      data.close();
    }
    await audioEncoder.flush();
    audioEncoder.close();
  }
}
