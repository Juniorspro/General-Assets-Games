# Backend Capability Matrix

## Renderer Selection

| Choice | Best for | Avoid when | Notes |
| --- | --- | --- | --- |
| `webgpu-renderer` | desktop-first work, richer GPU workflows, effects likely to evolve | the effect gains little from `WebGPU` or compatibility risk dominates | choose only when the interface model benefits from it |
| `webgl-renderer` | compatibility-sensitive work, mature browser support, simpler demos | the effect depends on WebGPU-specific resources or compute-heavy design | still a strong default for many public-facing demos |
| `dual-renderer` | products that genuinely need a premium path and a broad fallback | maintenance cost outweighs the visual gain | keep shared logic high and divergence explicit |

## Authoring Selection

| Choice | Best for | Avoid when | Notes |
| --- | --- | --- | --- |
| `pure-tsl` | readable node-based shading and material logic | the effect needs explicit low-level GPU control | best default path |
| `tsl-plus-interop` | mostly TSL with one hard edge | the whole implementation becomes opaque custom code | use for narrow escape hatches |
| `raw-wgsl` | compute-centric or storage-heavy `WebGPU` workloads | the problem is still basically a material or post graph | use only when low-level control is real |
| `raw-glsl` | `WebGL2`-first work or direct legacy ports | the project needs one shared high-level path | keep it scoped and justified |

## Decision Rule

Prefer:

1. the cleanest implementation surface
2. the renderer that supports it cleanly
3. the broadest compatibility that still satisfies the task
