# Instrumentation Checklist

Measure before tuning. The minimum useful capture is a reproducible scene, a route snapshot, a frame-time split, and one metric tied to the suspected hotspot.

Useful companion recipes:

- [route-discovery-snippet.md](route-discovery-snippet.md)
- [renderer-info-capture.md](renderer-info-capture.md)
- [pass-timing-capture.md](pass-timing-capture.md)
- [r3f-triage-notes.md](r3f-triage-notes.md)

## Route Snapshot

Record these first:

- renderer path (`WebGPURenderer` or `WebGLRenderer`)
- actual backend when known (`WebGPU` or `WebGL2` fallback)
- framework layer (vanilla Three.js or `@react-three/fiber`)
- post stack (`EffectComposer`, `postprocessing`, `@react-three/postprocessing`, or `RenderPipeline`)
- device class and display resolution
- canvas resolution and DPR
- average frame time and worst-frame time
- scene state that reproduces the issue

## Engine Metrics

- capture CPU versus GPU frame time with browser profiling tools when available
- on `WebGLRenderer`, record `renderer.info.render.calls`, `triangles`, `points`, `lines`, `memory.geometries`, `memory.textures`, and `programs`
- if the app uses multiple WebGL passes, set `renderer.info.autoReset = false` and reset it once per frame so the pass totals are meaningful
- on `WebGPURenderer`, treat `renderer.info` as coarse sanity data and rely more heavily on pass-local timings and browser tooling
- log pass-local timings for post effects instead of only a total frame number
- note texture uploads, render-target reallocations, shader compile events, and resize events during spikes

## Stutter-Specific Probes

- if the hitch is first-use shader compilation, test `compileAsync()` against the relevant scene or object
- if the hitch is first-use texture upload or decode, test `initTexture()` or explicit preload on the relevant textures
- if spikes correlate with viewport changes, log render-target resize behavior and whether effects rebuild internal buffers

## Deep Tools

- browser flame chart for JS, GC, and event bursts
- `Spector.js` for WebGL frame captures and shader or draw-call inspection
- Chrome WebGPU developer features or a WebGPU inspector when a WebGPU route needs deeper GPU timing than coarse frame numbers provide

## R3F-Specific Capture

- `Canvas` render mode: `always`, `demand`, or `never`
- whether `invalidate()` is used correctly for on-demand scenes
- whether `setState` appears in `useFrame` or high-frequency pointer handlers
- whether geometry, materials, vectors, loaders, or effects are recreated during renders
- whether adaptive controls such as `performance.current`, `AdaptiveDpr`, `AdaptiveEvents`, or `PerformanceMonitor` already exist in the app

## Isolation Probes

Use fast toggles to separate classes of cost:

- half resolution or lower `dpr`
- full post stack off
- shadows off or shadow updates frozen
- transparent or particle-heavy layers off
- one hero material only
- one light only
- raycast or events off
- static camera
- animation or update loop off

If one toggle sharply changes the budget, instrument that path next instead of tuning globally.

## Logging Discipline

Every capture should include:

- exact scene or route tested
- quality settings
- renderer path and backend
- framework layer and post stack when applicable
- browser and OS if known
- what changed between before and after measurements

## Recipe Map

- use [route-discovery-snippet.md](route-discovery-snippet.md) when the runtime surface is still unknown
- use [renderer-info-capture.md](renderer-info-capture.md) for the smallest route snapshot and WebGL sanity metrics
- use [pass-timing-capture.md](pass-timing-capture.md) when fullscreen or staged render cost is suspected
- use [r3f-triage-notes.md](r3f-triage-notes.md) when the route includes `@react-three/fiber`
