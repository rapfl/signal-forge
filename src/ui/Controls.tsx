import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useStore, Sensitivity } from "../state/store";
import { SCENES, PALETTES } from "../gl/scenes";
import { Renderer } from "../gl/Renderer";

interface Props {
  onFile: (file: File) => void;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onFullscreen: () => void;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const BANDS: { key: keyof Sensitivity; label: string }[] = [
  { key: "bass", label: "Bass" },
  { key: "mid", label: "Mid" },
  { key: "high", label: "High" },
  { key: "beat", label: "Beat" },
];

const THUMB_FEATURES = { bass: 0.42, mid: 0.34, high: 0.28, beat: 0.18, rms: 0.32 };

export function Controls({ onFile, onTogglePlay, onSeek, onFullscreen }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const s = useStore();
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const canvas = document.createElement("canvas");
    canvas.width = 112;
    canvas.height = 80;

    try {
      const renderer = new Renderer(canvas);
      renderer.resize(112, 80, 1);
      const next: Record<string, string> = {};

      for (const scene of SCENES) {
        renderer.reset();
        for (let i = 0; i < 24; i++) {
          renderer.render(1 / 30, THUMB_FEATURES, {
            sceneId: scene.id,
            paletteId: s.paletteId,
            speed: 1,
            intensity: 1,
            evolution: 1,
          });
        }
        next[scene.id] = canvas.toDataURL("image/webp", 0.82);
      }

      if (!cancelled) setThumbs(next);
    } catch (e) {
      console.error("Could not render mode thumbnails", e);
    }

    return () => {
      cancelled = true;
    };
  }, [s.paletteId]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="panel controls">
      <div className="brand">
        <span className="logo">◆</span> FORGE
        <span className="tagline">audio · fractals</span>
      </div>

      <section>
        <button className="btn primary" onClick={() => fileInput.current?.click()}>
          {s.fileName ? "Change track" : "Upload track"}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          onChange={handleFile}
          hidden
        />
        {s.fileName && <div className="filename" title={s.fileName}>{s.fileName}</div>}
      </section>

      <section>
        <label className="lbl" htmlFor="title-text">Title</label>
        <input
          id="title-text"
          className="text-input"
          type="text"
          maxLength={32}
          placeholder="FORGE"
          value={s.titleText}
          onChange={(e) => s.setTitleText(e.target.value)}
        />
      </section>

      {s.hasAudio && (
        <section className="transport">
          <button className="btn" onClick={onTogglePlay}>
            {s.playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <input
            type="range"
            min={0}
            max={s.duration || 0}
            step={0.01}
            value={s.currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
          />
          <span className="time">
            {fmt(s.currentTime)} / {fmt(s.duration)}
          </span>
        </section>
      )}

      <section>
        <label className="lbl">Fractal</label>
        <div className="chips">
          {SCENES.map((scene) => (
            <button
              key={scene.id}
              className={`chip ${s.sceneId === scene.id ? "active" : ""}`}
              onClick={() => s.setScene(scene.id)}
              title={scene.description}
            >
              {thumbs[scene.id] ? (
                <img className="mode-thumb" src={thumbs[scene.id]} alt="" aria-hidden="true" />
              ) : (
                <span className="mode-thumb loading" aria-hidden="true" />
              )}
              {scene.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="lbl">Palette</label>
        <div className="chips">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              className={`chip ${s.paletteId === p.id ? "active" : ""}`}
              onClick={() => s.setPalette(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="lbl">Reactivity</label>
        <div className="slider-row master">
          <span>Intensity</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={s.intensity}
            onChange={(e) => s.setIntensity(parseFloat(e.target.value))}
          />
          <span className="val">{s.intensity.toFixed(2)}</span>
        </div>
        {BANDS.map(({ key, label }) => (
          <div className="slider-row" key={key}>
            <span>{label}</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={s.sensitivity[key]}
              onChange={(e) => s.setSensitivity(key, parseFloat(e.target.value))}
            />
            <span className="val">{s.sensitivity[key].toFixed(2)}</span>
          </div>
        ))}
        <div className="slider-row">
          <span>Evolution</span>
          <input
            type="range"
            min={0}
            max={4}
            step={0.05}
            value={s.evolution}
            onChange={(e) => s.setEvolution(parseFloat(e.target.value))}
          />
          <span className="val">{s.evolution.toFixed(2)}</span>
        </div>
        <div className="slider-row">
          <span>Speed</span>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.05}
            value={s.speed}
            onChange={(e) => s.setSpeed(parseFloat(e.target.value))}
          />
          <span className="val">{s.speed.toFixed(2)}</span>
        </div>
      </section>

      <section>
        <button className="btn" onClick={onFullscreen}>
          ⛶ Fullscreen
        </button>
      </section>
    </div>
  );
}
