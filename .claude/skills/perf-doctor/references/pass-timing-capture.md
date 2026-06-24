# Pass Timing Capture Recipe

Use this recipe when the symptom looks like post cost, fullscreen-pass cost, or another staged render path that is hard to classify from total frame time alone.

## Goal

Get a cheap CPU-side proxy for where frame time is going.

This is not true GPU timing. It is still useful for triage because it tells you which pass or stage grows when the page misses budget.

## When To Use It

- `EffectComposer` or `postprocessing` routes
- resolution-sensitive slowdowns
- routes where "post off" gives a large win

## Coarse Stage Timing

Start with stage timing before patching individual passes:

```js
const stageTimings = new Map();

function recordTiming(label, fn) {
  const t0 = performance.now();
  const result = fn();
  const dt = performance.now() - t0;
  const prev = stageTimings.get(label) ?? dt;
  stageTimings.set(label, prev * 0.8 + dt * 0.2);
  return result;
}

function renderFrame() {
  recordTiming("main-scene", () => renderer.render(scene, camera));
  recordTiming("composer", () => composer.render());
}

setInterval(() => {
  console.table(Object.fromEntries(stageTimings));
}, 1000);
```

## Per-Pass `EffectComposer` Timing

If the composer stage is clearly dominant, wrap the pass `render()` calls:

```js
const passTimings = new Map();

for (const pass of composer.passes) {
  if (typeof pass.render !== "function") continue;

  const label = pass.name || pass.constructor?.name || "UnnamedPass";
  const originalRender = pass.render.bind(pass);

  pass.render = (...args) => {
    const t0 = performance.now();
    try {
      return originalRender(...args);
    } finally {
      const dt = performance.now() - t0;
      const prev = passTimings.get(label) ?? dt;
      passTimings.set(label, prev * 0.8 + dt * 0.2);
    }
  };
}

setInterval(() => {
  console.table(Object.fromEntries(passTimings));
}, 1000);
```

## Capture Discipline

- warm the scene before trusting timings
- keep camera state and quality settings fixed
- compare one change at a time, such as `post off`, lower DPR, or one pass disabled
- label the preset in the report so the numbers stay comparable

## What To Look For

- one pass consistently far above the others
- multiple fullscreen passes all scaling sharply with DPR
- one pass growing only when transparency, haze, or particles are enabled

## Common Misreads

- CPU-side pass timing is a triage tool, not a substitute for GPU tooling.
- If stage timing says `composer` is dominant but per-pass timing stays flat, the real issue may be render-target allocation or a wrapper above the passes.
- If lowering DPR barely changes pass timing, your issue is less likely to be fullscreen fill-rate.
