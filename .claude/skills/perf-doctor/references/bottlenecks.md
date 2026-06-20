# Common Bottleneck Patterns

Classify the dominant bottleneck before proposing fixes. A correct category saves time; a vague "optimize shaders" answer usually does not.

| Bottleneck | Signature | Evidence to collect | First fixes |
| --- | --- | --- | --- |
| Scene-graph or draw-call saturation | CPU frame time rises with object count or material variety while GPU is not fully saturated | render calls, program count, object count, traversal time | share materials, use `InstancedMesh`, use `BatchedMesh`, merge static geometry, reduce helper-node churn, add LOD |
| Shadow-map cost | frame time drops sharply when shadows or moving lights are enabled | shadow-casting light count, map sizes, shadow update frequency, per-light timings | reduce shadow-casting lights, lower map sizes, freeze updates with `shadowMap.autoUpdate = false` for static cases, bake or accumulate when appropriate |
| Transparency or overdraw | GPU time scales hard with resolution; foliage, particles, glass, decals, or layered UI dominate | resolution scaling behavior, transparent object count, pass timings, draw-call inflation from double-sided transparent materials | switch suitable assets to `alphaTest` or `alphaHash`, use `forceSinglePass` for flat transparent cards when quality allows, reduce transparent layers, lower particle counts, downsample affected passes |
| Post or fullscreen pass chain | one composer or pipeline stage dominates; pass count or buffer count is high | pass-local timings, composer settings, render-target count, multisampling, history buffers | downsample, reduce kernel sizes or samples, trim pass count, cut selective effects first, reduce multisampling or history usage |
| Material or program churn | first-use hitches or unstable frame time when defines or materials change | program count, compile stutters, material variant count, `needsUpdate` churn | share materials, avoid per-frame material recompiles, prewarm with `compileAsync()`, reduce define branching and variant count |
| Upload, allocation, or resize thrash | intermittent spikes during load, movement, or resize | texture init or upload events, render-target reallocations, GC correlation, loader timings | preload assets, use `initTexture()`, pool render targets, reuse textures and buffers, avoid per-frame allocation |
| Raycasting or interaction cost | pointer movement, hover, or selection hitches more than pure render | flame chart, raycast count per frame, event frequency, hit-test breadth | narrow the raycast set, use BVH, use first-hit-only when valid, disable events while moving, separate render meshes from pick meshes |
| Main-thread or React churn | frame hitches track JS, React commits, or object recreation instead of GPU work | browser flame chart, commit count, allocations, hot event handlers, `useFrame` patterns | cache work, reuse objects, mutate in `useFrame`, avoid `setState` in hot loops, use `frameloop="demand"` plus `invalidate()` where viable |

## Quick Isolation Heuristics

- If lowering render resolution gives a large win, suspect fill-rate or heavy fullscreen passes.
- If hiding half the scene gives a win but lowering resolution does not, suspect scene-graph, draw-call, or shadow cost.
- If disabling one effect, material family, or light class changes frame time sharply, measure that unit directly before changing anything else.
- If spikes correlate with camera movement, look for streaming, culling churn, raycasting, or upload work.
- If hitches track hover, click, or drag but not static rendering, suspect event or raycast cost before shader cost.

## Three.js-Specific False Positives

- A high draw-call count can come from double-sided, transparent materials and not just from mesh count.
- Raycast or selection work can look like rendering jank in editors, configurators, and CAD-style scenes.
- A `WebGPURenderer` app may still be running a `WebGL2` fallback, so do not label the bottleneck `WebGPU-only` until the backend is confirmed.

## Reporting Rule

Every diagnosis should name:

- dominant bottleneck
- secondary bottleneck
- evidence used to separate them
- lowest-risk fix to test first
