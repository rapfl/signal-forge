import { useEffect, useRef } from "react";
import { Visualizer } from "./ui/Visualizer";
import { Controls } from "./ui/Controls";
import { ExportPanel } from "./ui/ExportPanel";
import { Renderer } from "./gl/Renderer";
import { SCENES } from "./gl/scenes";
import { AudioEngine } from "./audio/AudioEngine";
import { FeatureExtractor } from "./audio/FeatureExtractor";
import { useStore } from "./state/store";

const isFormTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);
  const extractorRef = useRef<FeatureExtractor | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hasAudio = useStore((s) => s.hasAudio);
  const titleText = useStore((s) => s.titleText.trim());

  // Lazily create the audio engine on first interaction (autoplay policy friendly).
  const ensureEngine = (): AudioEngine => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
      extractorRef.current = new FeatureExtractor();
      engineRef.current.onEnded = () => useStore.getState().setPlaying(false);
    }
    return engineRef.current;
  };

  useEffect(() => () => engineRef.current?.dispose(), []);

  const loadFile = async (file: File) => {
    const engine = ensureEngine();
    try {
      await engine.load(file);
      extractorRef.current?.reset();
      useStore.getState().setFile(file.name, engine.duration);
    } catch (e) {
      useStore.getState().setExport("error", 0, "Could not decode audio: " + String(e));
    }
  };

  const togglePlay = async () => {
    const engine = ensureEngine();
    if (!engine.buffer) return;
    if (engine.playing) {
      engine.pause();
      useStore.getState().setPlaying(false);
    } else {
      await engine.play();
      useStore.getState().setPlaying(true);
    }
  };

  const seek = (t: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.seek(t);
    useStore.getState().setCurrentTime(t);
  };

  const playFromStart = async () => {
    const engine = ensureEngine();
    extractorRef.current?.reset();
    rendererRef.current?.reset();
    await engine.play(0);
    useStore.getState().setPlaying(true);
  };

  const stop = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.stop();
    useStore.getState().setPlaying(false);
    useStore.getState().setCurrentTime(0);
  };

  const fullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isFormTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.code === "Space") {
        e.preventDefault();
        void togglePlay();
        return;
      }

      const delta =
        e.key === "ArrowRight" || e.key === "ArrowDown"
          ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowUp"
            ? -1
            : 0;
      if (!delta) return;

      e.preventDefault();
      const state = useStore.getState();
      const current = SCENES.findIndex((scene) => scene.id === state.sceneId);
      const next = (current + delta + SCENES.length) % SCENES.length;
      state.setScene(SCENES[next].id);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="app">
      <a className="back-link" href="/" aria-label="Back to rahumusic.com">
        Back
      </a>
      <div className="stage" ref={stageRef}>
        <Visualizer
          canvasRef={canvasRef}
          rendererRef={rendererRef}
          engineRef={engineRef}
          extractorRef={extractorRef}
        />
        {hasAudio && titleText && <div className="stage-title">{titleText}</div>}
        {!hasAudio && (
          <div className="overlay">
            <h1>{titleText || "FORGE"}</h1>
            <p>Upload a sound snippet and watch it bloom into fractals.</p>
          </div>
        )}
      </div>
      <aside className="sidebar">
        <Controls
          onFile={loadFile}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onFullscreen={fullscreen}
        />
        <ExportPanel
          canvasRef={canvasRef}
          engineRef={engineRef}
          onPlayFromStart={playFromStart}
          onStop={stop}
        />
      </aside>
    </div>
  );
}
