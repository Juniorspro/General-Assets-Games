# Route Discovery Snippet

Use this note when the user cannot name the runtime route and the skill needs to discover it from the repository or the running page.

## Prefer Repository Discovery First

Search the codebase before asking the user to classify the stack:

```bash
rg -n "WebGLRenderer|WebGPURenderer|Canvas|@react-three/fiber|EffectComposer|postprocessing|@react-three/postprocessing|RenderPipeline|three/webgpu" .
```

Then inspect:

- renderer initialization
- scene entry points
- post-processing setup
- quality toggles and DPR controls

## Minimal Runtime Snapshot

If the app can run locally, capture a small route table instead of asking broad questions:

```js
const routeSnapshot = {
  rendererPath: renderer?.constructor?.name ?? "unknown",
  backend: renderer?.backend?.constructor?.name ?? "unknown",
  dpr: renderer?.getPixelRatio?.() ?? "unknown",
  canvasWidth: renderer?.domElement?.width ?? "unknown",
  canvasHeight: renderer?.domElement?.height ?? "unknown",
  composerType:
    globalThis.composer?.constructor?.name ??
    globalThis.postprocessing?.constructor?.name ??
    "none",
  passCount: Array.isArray(globalThis.composer?.passes)
    ? globalThis.composer.passes.length
    : "unknown",
};

console.table(routeSnapshot);
```

Adapt variable names to the app. The point is to capture the route, not to impose one global symbol convention.

## R3F Hints

Repository hints that usually indicate `@react-three/fiber`:

- `<Canvas ... />`
- `useFrame`
- `useThree`
- `frameloop`
- `invalidate`

Runtime hints that usually indicate R3F-side churn:

- React commits spike with pointer movement
- object or material creation happens during renders
- `setState` appears in hot interaction paths

## Route Output Contract

Try to leave the diagnosis with these fields filled:

- renderer path
- actual backend when known
- framework layer
- post stack
- target device class

If one field stays unknown, say so explicitly and name the smallest next capture that would resolve it.
