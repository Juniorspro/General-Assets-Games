---
name: perf-doctor
license: MIT
description: Use when a Three.js page, scene, or component has FPS drops, frame spikes, compile stutter, thermal issues, or other runtime performance problems that need diagnosis and measurement.
metadata:
  category: threejs
  render_backends:
    - webgpu
    - webgl2
  shader_language: tsl
  skill_type: workflow
  owns_templates: "false"
  owns_scaffolder: "false"
---

# Three.js Performance Doctor

Use this skill when the user needs a focused performance diagnosis rather than a full reference remake. The intent is to analyze draw calls, shader cost, memory use, GPU/CPU balance, and compatibility targets; document the dominant bottlenecks; and propose observable optimizations or graceful degradation tiers.

This is not a generic web-performance skill. It is route-aware for the current Three.js ecosystem, so the diagnosis must first identify the actual runtime surface:

- renderer path: `WebGLRenderer` or `WebGPURenderer`
- actual backend when known: native `WebGPU` or `WebGL2` fallback
- framework layer: vanilla Three.js or `@react-three/fiber`
- post stack: `EffectComposer`, `postprocessing` / `@react-three/postprocessing`, or `RenderPipeline`
- scene traits that often dominate Three.js cost: shadows, transparent materials, offscreen passes, instancing or batching, raycasting, streaming uploads, and React churn

## Workflow

1. **Intake** – gather the runtime context (renderer path, framework layer, post stack, device class, canvas size or DPR, fidelity targets) and the symptom summary (low FPS, spikes, compile stutter, interaction hitching, thermal issues).
2. **Route The Stack** – name which advice surface is valid before suggesting fixes. Separate WebGL-only guidance from WebGPU-only guidance, and separate renderer cost from React cost if `@react-three/fiber` is involved.
3. **Instrumentation** – identify the measurable outputs (`renderer.info`, frame-time split, pass-local timings, upload or allocation events, raycast or event cost, coarse memory pressure) and the key scenes or passes that trigger cost.
4. **Diagnosis** – classify the dominant bottleneck using Three.js-native categories such as draw-call or scene-graph saturation, shadow cost, transparency or overdraw, post chain cost, raycasting, upload thrash, material or program churn, or main-thread or React churn.
5. **Plan** – propose explicit engine-native levers first: instancing or batching, LOD, shadow update policy, post downsampling, transparency strategy, texture or shader prewarm, raycast pruning, render-target reuse, or framework-aware fallbacks.
6. **Report** – summarize findings with prioritized action items, instruments used, unknowns that still block confidence, and a degradation ladder that describes when to drop quality or switch runtime behavior.

## Required Outputs

- Final report using the fixed template at [`assets/report-template.md`](assets/report-template.md)
- Runtime route table listing renderer path, framework layer, post stack, target device class, and which classes of advice are valid
- Bottleneck table with observations, evidence, and severity (GPU, CPU, memory, etc.)
- Performance contract listing device class, target frame budget, and acceptable quality tiers
- Degradation ladder describing at least two fallback levels with precise tradeoffs
- Suggested instrumentation checklist (timers, stats, profilers) used to gather the evidence
- Explicit unknowns plus the next capture to run when evidence is still weak
- Optional optimization notes retaining look invariants if the user requested fidelity guidance

## User Input Contract / Discovery Policy

Do not require the user to know the rendering stack up front. Treat runtime-route discovery as part of the skill, not as a user prerequisite.

### Minimum User Input

Start the diagnosis if the user can provide only these fields:

- page, route, scene, or component that shows the issue
- symptom description
- repro steps
- approximate target device class

This minimum is enough to begin a useful investigation.

### Preferred Input

If the user already has them, these signals improve accuracy:

- renderer path or framework hints such as `WebGLRenderer`, `WebGPURenderer`, or `@react-three/fiber`
- post stack hints such as `EffectComposer`, `postprocessing`, `@react-three/postprocessing`, or `RenderPipeline`
- known measurements such as `renderer.info`, frame times, flame charts, or pass timings
- visual constraints such as "do not blur", "keep shadows", or "must stay mobile-safe"

Treat these as accelerators, not requirements.

### Discovery Policy

When runtime information is missing, use this order:

1. infer from the repository or code
2. infer from the running page or browser tooling
3. ask the user only for the smallest missing measurement that would change the diagnosis

Typical local discovery actions:

- search for `WebGLRenderer`, `WebGPURenderer`, `@react-three/fiber`, `Canvas`, `EffectComposer`, `postprocessing`, `@react-three/postprocessing`, `RenderPipeline`, and `three/webgpu`
- inspect `package.json` and the scene entry point
- inspect renderer initialization, post-processing setup, and quality toggles
- log `renderer.constructor.name`, `renderer.info`, DPR, and relevant pass settings if the app can be run locally

### Asking For More Data

Only ask for extra data when the missing evidence would materially change the recommendation.

Prefer small requests such as:

- one `renderer.info` snapshot
- one browser performance capture
- one pass timing capture
- one repro video or exact toggle sequence

Do not ask the user to classify the route if the repository or runtime can answer it more reliably.

### Interaction Rule

Default to a progressive intake style:

1. accept the smallest useful problem statement
2. discover the runtime route yourself
3. measure before recommending fixes
4. ask for one targeted missing capture only if needed

Do not block the diagnosis just because the user did not provide runtime details.

## Reporting Contract

Use the section order from [`assets/report-template.md`](assets/report-template.md) for every final diagnosis. Keep the headings stable even when some cells are marked `unknown`, `not measured`, or `not applicable`.

When the evidence is incomplete:

- do not delete sections
- mark the uncertain cells explicitly
- keep `Final Call` short and honest
- state the next capture that would raise confidence

## Reference Pack

Use the references under [`references/`](references/) as the compact diagnosis framework:

- [`references/README.md`](references/README.md) for the default investigation order
- [`references/ecosystem-routes.md`](references/ecosystem-routes.md) to map the issue onto the current Three.js runtime surface
- [`references/instrumentation.md`](references/instrumentation.md) to choose measurements before tuning
- [`references/route-discovery-snippet.md`](references/route-discovery-snippet.md) for the smallest repo-first route discovery workflow
- [`references/renderer-info-capture.md`](references/renderer-info-capture.md) for a low-friction `renderer.info` capture recipe
- [`references/pass-timing-capture.md`](references/pass-timing-capture.md) for coarse stage and per-pass timing captures
- [`references/r3f-triage-notes.md`](references/r3f-triage-notes.md) when `@react-three/fiber` interaction or commit churn is suspected
- [`references/bottlenecks.md`](references/bottlenecks.md) to classify the dominant hotspot
- [`references/diagnosis-sequence.md`](references/diagnosis-sequence.md) to keep the investigation evidence-first
- [`references/device-targets.md`](references/device-targets.md) to set an explicit performance contract
- [`references/degradation-ladders.md`](references/degradation-ladders.md) to design fallback tiers without losing the core look

## Fixture Pack

Use the report-centric fixtures under [`fixtures/`](fixtures/) as canonical examples for maintainers and contributors:

- [`fixtures/README.md`](fixtures/README.md) for the current diagnosis-case index
- [`fixtures/draw-call-saturation/README.md`](fixtures/draw-call-saturation/README.md) for a canonical scene-graph and draw-call saturation diagnosis
- [`fixtures/post-chain-cost/README.md`](fixtures/post-chain-cost/README.md) for a canonical fullscreen-pass-chain diagnosis
- [`fixtures/react-churn-r3f/README.md`](fixtures/react-churn-r3f/README.md) for a canonical `@react-three/fiber` interaction diagnosis with a valid `partially-diagnosed` outcome

## Constraints

- Keep evaluations explicit and evidence-backed; avoid speculative tuning without measurable data.
- Name whether each recommendation is `WebGL`, `WebGPU`, `R3F`, or wrapper-specific when that distinction matters.
- Do not prescribe `EffectComposer`, `ShaderMaterial`, `RawShaderMaterial`, or `onBeforeCompile()` fixes for `WebGPURenderer` paths.
- Distinguish scene-render cost from React scheduling, mount churn, or event churn when `@react-three/fiber` is in the stack.
- Prefer simple, incremental adjustments over full rewrites and prefer engine-native levers over custom shader rewrites.
- Prefer a measured `before` and `after` row in the final report when any change was tested.
- Document any remaining unknowns that would block a confident recommendation.
