# Official Three.js WebGPU Validation

Use official Three.js documentation as the final check for browser-facing implementation choices.

Prioritize:

- `WebGPURenderer` docs and manual
- `TSL` docs
- official examples using the same renderer path or node features

Official sources:

- https://threejs.org/docs/pages/WebGPURenderer.html
- https://threejs.org/docs/TSL.html
- https://threejs.org/examples/?q=webgpu
- https://threejs.org/manual/
- https://github.com/mrdoob/three.js/tree/dev/examples/jsm

Check these concrete topics:

- `WebGPURenderer` creation, `init()` timing, and any `forceWebGL` fallback usage
- import paths for `three/webgpu`, `three/tsl`, and relevant addons
- node-material or TSL examples that match the same renderer path
- whether the intended pattern is shown in current examples, only implied by docs, or still inferred from implementation

## Validate These Points

- the renderer import and setup path
- whether the chosen programming model matches documented Three.js usage
- whether the intended fallback still uses an officially supported path
- whether any custom pipeline assumptions go beyond what official docs confirm

## Record These Notes

- which official pages confirmed the final approach
- which decisions are directly documented
- which decisions still rely on reasoned inference
- which version assumptions from [version-compatibility.md](version-compatibility.md) were actually re-checked
