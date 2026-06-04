# Forge — Audio-Reactive Fractal Visualizer

Upload a sound snippet and watch it bloom into geometric, psychedelic fractals that
pulse and morph to the music — then export the result as video.

## What it does

- **Live visualizer** — decode an uploaded audio file, analyze it in real time (bass / mid
  / high bands + spectral-flux beat detection) and drive GPU fractal shaders.
- **Three fractal scenes** — Kaliset Mandala (kaleidoscopic IFS), Julia Drift (animated
  Julia zoom), Mandelbox Tunnel (raymarched 3D fractal flythrough).
- **Cosine-palette colorways** and per-band **reactivity sliders** to tune any track.
- **Export**
  - **MP4 (high quality)** — deterministic, frame-accurate offline render via WebCodecs
    (Chrome/Edge). Re-analyzes the track with a JS FFT so every frame is exact.
  - **Quick capture (WebM)** — records the live preview in real time via MediaRecorder.
    Always available as a fallback.

## Stack

Vite · React · TypeScript · raw WebGL2 (fullscreen-quad fragment shaders) · Web Audio API ·
WebCodecs + `mp4-muxer` · Zustand.

## Develop

```bash
npm install
npm run dev      # http://localhost:5191
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Project layout

```
src/
  audio/   AudioEngine, FeatureExtractor (bands + beat), offlineAnalyze (JS FFT)
  gl/      Renderer (WebGL2), scenes registry, shaders/*.glsl.ts
  export/  RealtimeRecorder (WebM), OfflineEncoder (WebCodecs MP4)
  ui/      Visualizer (canvas + render loop), Controls, ExportPanel
  state/   Zustand store
```

## Notes / browser support

- WebGL2 required (all modern browsers).
- MP4 export requires WebCodecs — present in Chrome/Edge, partial in Safari. The app
  detects support and falls back to WebM Quick capture automatically.
- The audio→visual mapping lives in the shaders (`u_bass`, `u_high`, `u_beat`, …) and in
  `Renderer.render`; tweak there to change how the music drives the visuals.
