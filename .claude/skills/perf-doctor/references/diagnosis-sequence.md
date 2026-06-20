# Diagnosis Sequence

Investigate in a fixed order so you do not confuse symptoms with causes.

## Sequence

1. name the runtime route
2. reproduce the problem in a stable scene state
3. capture baseline metrics
4. isolate by toggling major systems
5. classify the dominant and secondary bottlenecks
6. test the lowest-risk route-correct fix
7. re-measure the same scene and quality level

## Isolation Order

Use this order unless the problem is already obvious:

1. renderer path, framework layer, and post stack
2. resolution and DPR
3. full post stack
4. shadows and moving lights
5. transparency, particles, and decals
6. object count, visibility, instancing, batching, and LOD
7. raycasting and event systems
8. animation, update loops, and React churn
9. uploads, compilation, and allocations

## Route Rules

- On `WebGLRenderer`, composer passes, `renderer.info`, shader variants, and `onBeforeCompile()` are meaningful diagnosis surfaces.
- On `WebGPURenderer`, diagnose node-material cost, `RenderPipeline` composition, async init or upload behavior, and whether the app is on a real WebGPU backend or a fallback.
- On `@react-three/fiber`, separate React re-renders and object recreation from the raw renderer cost before calling the issue GPU-bound.

## Reporting Rule

For every recommendation, keep this chain intact:

- symptom
- runtime route
- evidence
- bottleneck class
- proposed fix
- expected gain

If one of those fields is missing, the recommendation is probably too vague.
