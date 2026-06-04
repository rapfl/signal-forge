import { useEffect, MutableRefObject } from "react";
import { Renderer } from "../gl/Renderer";
import { AudioEngine } from "../audio/AudioEngine";
import { FeatureExtractor } from "../audio/FeatureExtractor";
import { ZERO_FEATURES } from "../audio/types";
import { useStore } from "../state/store";

interface Props {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  rendererRef: MutableRefObject<Renderer | null>;
  engineRef: MutableRefObject<AudioEngine | null>;
  extractorRef: MutableRefObject<FeatureExtractor | null>;
}

export function Visualizer({ canvasRef, rendererRef, engineRef, extractorRef }: Props) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas);
    } catch (e) {
      console.error(e);
      useStore.getState().setExport("error", 0, String(e));
      return;
    }
    rendererRef.current = renderer;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap for GPU headroom
    const onResize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height, dpr);
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let timeAccum = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const engine = engineRef.current;
      const extractor = extractorRef.current;
      const state = useStore.getState();

      let features = ZERO_FEATURES;
      if (engine && extractor && engine.playing) {
        extractor.sensitivity = state.sensitivity;
        const mags = engine.getMagnitudes();
        features = extractor.process(mags, engine.sampleRate, dt);
      }

      renderer.render(dt, features, {
        sceneId: state.sceneId,
        paletteId: state.paletteId,
        speed: state.speed,
        intensity: state.intensity,
        evolution: state.evolution,
      });

      // Throttle store writes for the transport scrubber (~10/s).
      timeAccum += dt;
      if (engine && timeAccum > 0.1) {
        timeAccum = 0;
        if (engine.playing) state.setCurrentTime(engine.currentTime);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className="viz-canvas" />;
}
