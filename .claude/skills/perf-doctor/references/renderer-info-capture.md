# Renderer Info Capture Recipe

Use this recipe when you need the smallest useful route snapshot on a `WebGLRenderer` path, or a coarse sanity snapshot on a `WebGPURenderer` path.

## When To Use It

- first-pass diagnosis on a warm scene
- draw-call or scene-graph suspicion
- sanity-checking whether a change actually reduced render pressure

Do not treat this as the only measurement on `WebGPURenderer`. Use it as a coarse route snapshot and pair it with pass timings or browser tooling.

## Minimal Snapshot

Adapt the variable names if your app does not expose `renderer` directly:

```js
const snapshot = {
  rendererPath: renderer?.constructor?.name ?? "unknown",
  backend: renderer?.backend?.constructor?.name ?? "unknown",
  dpr: renderer?.getPixelRatio?.() ?? "unknown",
  canvasWidth: renderer?.domElement?.width ?? "unknown",
  canvasHeight: renderer?.domElement?.height ?? "unknown",
  drawCalls: renderer?.info?.render?.calls ?? "n/a",
  triangles: renderer?.info?.render?.triangles ?? "n/a",
  points: renderer?.info?.render?.points ?? "n/a",
  lines: renderer?.info?.render?.lines ?? "n/a",
  geometries: renderer?.info?.memory?.geometries ?? "n/a",
  textures: renderer?.info?.memory?.textures ?? "n/a",
  programs:
    Array.isArray(renderer?.info?.programs) ? renderer.info.programs.length : "n/a",
};

console.table(snapshot);
```

## Multi-Pass WebGL Note

If one frame contains multiple WebGL renders, `renderer.info` can under-report pass totals unless you hold the counters open for the whole frame:

```js
renderer.info.autoReset = false;

function renderFrame() {
  renderer.info.reset();

  renderMainScene();
  renderComposer();

  console.table({
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    textures: renderer.info.memory.textures,
    geometries: renderer.info.memory.geometries,
  });
}
```

## What To Record In The Report

- exact scene or route tested
- renderer path and backend
- DPR and render size
- whether post was enabled
- before and after values for draw calls, programs, or memory counts when relevant

## Common Misreads

- High draw-call count can come from transparent double-sided layers, not just mesh count.
- Stable `renderer.info` with large spikes usually means the problem is elsewhere, such as uploads, passes, or main-thread churn.
- On `WebGPURenderer`, `renderer.info` is useful as a sanity check, not as the final authority.
