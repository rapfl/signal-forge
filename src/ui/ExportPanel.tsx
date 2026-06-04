import { MutableRefObject, useEffect, useRef, useState } from "react";
import { AudioEngine } from "../audio/AudioEngine";
import { RealtimeRecorder, RecorderResult } from "../export/RealtimeRecorder";
import { OfflineEncoder } from "../export/OfflineEncoder";
import { useStore } from "../state/store";

interface Props {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  engineRef: MutableRefObject<AudioEngine | null>;
  onPlayFromStart: () => void;
  onStop: () => void;
}

const FORMATS = [
  { label: "YouTube", detail: "16:9", w: 1920, h: 1080, bitrate: 16_000_000 },
  { label: "IG Post", detail: "1:1", w: 1080, h: 1080, bitrate: 12_000_000 },
  { label: "IG Reel", detail: "9:16", w: 1080, h: 1920, bitrate: 16_000_000 },
];

function download(result: RecorderResult, base: string) {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}.${result.extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function ExportPanel({ canvasRef, engineRef, onPlayFromStart, onStop }: Props) {
  const s = useStore();
  const setExport = useStore((st) => st.setExport);
  const recorderRef = useRef<RealtimeRecorder | null>(null);
  const realtimeTimerRef = useRef<number | null>(null);
  const realtimeDoneRef = useRef(false);
  const [formatIdx, setFormatIdx] = useState(0);
  const [fps, setFps] = useState(60);
  const [durationSec, setDurationSec] = useState(30);
  const [includeAudio, setIncludeAudio] = useState(true);
  const offlineOk = OfflineEncoder.isSupported();
  const maxExportLength = Math.max(1, Math.min(60, Math.floor(s.duration || 60)));

  const baseName = (s.fileName?.replace(/\.[^.]+$/, "") || "forge") + "-fractal";
  const busy = s.exportStatus === "recording" || s.exportStatus === "encoding";

  useEffect(() => {
    setDurationSec((v) => Math.min(v, maxExportLength));
  }, [maxExportLength]);

  // --- Realtime WebM (records the live preview, 1x duration) ---
  const startRealtime = () => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine || !engine.buffer) return;
    if (!RealtimeRecorder.isSupported()) {
      setExport("error", 0, "MediaRecorder unavailable in this browser.");
      return;
    }
    const rec = new RealtimeRecorder();
    recorderRef.current = rec;
    realtimeDoneRef.current = false;
    rec.start(canvas, engine.audioStream, fps, includeAudio);
    setExport("recording", 0, `Recording ${durationSec}s in real time…`);

    const finish = async () => {
      if (realtimeDoneRef.current) return;
      realtimeDoneRef.current = true;
      engine.onEnded = null;
      if (realtimeTimerRef.current) window.clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = null;
      onStop();
      try {
        const result = await rec.stop();
        download(result, baseName);
        setExport("done", 1, "Saved WebM");
      } catch (e) {
        setExport("error", 0, String(e));
      }
    };
    engine.onEnded = finish;
    onPlayFromStart();
    realtimeTimerRef.current = window.setTimeout(finish, durationSec * 1000);
  };

  const cancelRealtime = async () => {
    const engine = engineRef.current;
    if (engine) engine.onEnded = null;
    realtimeDoneRef.current = true;
    if (realtimeTimerRef.current) window.clearTimeout(realtimeTimerRef.current);
    realtimeTimerRef.current = null;
    onStop();
    try {
      await recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    setExport("idle");
  };

  // --- Offline MP4 (deterministic, frame-accurate) ---
  const startOffline = async () => {
    const engine = engineRef.current;
    if (!engine?.buffer) return;
    engine.pause();
    useStore.getState().setPlaying(false);
    const format = FORMATS[formatIdx];
    setExport("encoding", 0, "Preparing…");
    try {
      const encoder = new OfflineEncoder();
      const result = await encoder.encode(
        engine.buffer,
        {
          width: format.w,
          height: format.h,
          fps,
          bitrate: format.bitrate,
          durationSec,
          includeAudio,
          params: {
            sceneId: s.sceneId,
            paletteId: s.paletteId,
            speed: s.speed,
            intensity: s.intensity,
            evolution: s.evolution,
          },
          sensitivity: s.sensitivity,
        },
        (p, msg) => setExport("encoding", p, msg),
      );
      download(result, baseName);
      setExport("done", 1, "Saved MP4");
    } catch (e) {
      console.error(e);
      setExport("error", 0, "Offline export failed: " + String(e));
    }
  };

  return (
    <div className="panel export">
      <label className="lbl">Export</label>

      <div className="export-opts">
        <div className="seg">
          {FORMATS.map((r, i) => (
            <button
              key={r.label}
              className={`seg-btn ${formatIdx === i ? "active" : ""}`}
              onClick={() => setFormatIdx(i)}
              disabled={busy}
              title={`${r.w}×${r.h}`}
            >
              {r.label}
              <span>{r.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="export-opts">
        <div className="seg">
          {[30, 60].map((f) => (
            <button
              key={f}
              className={`seg-btn ${fps === f ? "active" : ""}`}
              onClick={() => setFps(f)}
              disabled={busy}
            >
              {f}fps
            </button>
          ))}
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={includeAudio}
            onChange={(e) => setIncludeAudio(e.target.checked)}
            disabled={busy}
          />
          Audio
        </label>
      </div>

      <div className="slider-row">
        <span>Length</span>
        <input
          type="range"
          min={1}
          max={maxExportLength}
          step={1}
          value={durationSec}
          onChange={(e) => setDurationSec(parseInt(e.target.value, 10))}
          disabled={busy}
        />
        <span className="val">{durationSec}s</span>
      </div>

      {s.exportStatus === "recording" ? (
        <button className="btn danger" onClick={cancelRealtime}>
          ⏹ Stop &amp; save
        </button>
      ) : (
        <>
          <button
            className="btn primary"
            onClick={startOffline}
            disabled={!s.hasAudio || busy || !offlineOk}
            title={offlineOk ? "Frame-accurate MP4 (WebCodecs)" : "WebCodecs not supported"}
          >
            ⬇ Export MP4 (high quality)
          </button>
          <button
            className="btn"
            onClick={startRealtime}
            disabled={!s.hasAudio || busy}
            title="Records the live preview in real time"
          >
            ⬇ Quick capture (WebM)
          </button>
        </>
      )}

      {!offlineOk && (
        <div className="hint">
          MP4 export needs WebCodecs (Chrome/Edge). Use Quick capture here.
        </div>
      )}

      {busy && (
        <div className="progress">
          <div className="bar" style={{ width: `${Math.round(s.exportProgress * 100)}%` }} />
        </div>
      )}
      {s.exportMessage && (
        <div className={`status ${s.exportStatus}`}>{s.exportMessage}</div>
      )}
    </div>
  );
}
