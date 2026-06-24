# Version Compatibility

Use one pinned Three.js version for templates, examples, and generated scaffolds.

Current repository baseline:

| Package | Version | Why it is pinned |
| --- | --- | --- |
| `three` | `0.180.0` | Current template and canonical example baseline for `WebGPURenderer`, `TSL`, and addon imports |
| `lil-gui` | `0.20` | Current starter GUI baseline |

## Re-check these points on every Three.js upgrade

| Area | What to re-check |
| --- | --- |
| `WebGPURenderer` imports | `three/webgpu` entry points and any init lifecycle changes |
| `TSL` imports | `three/tsl` symbols, node naming, and example parity |
| WebGL fallback path | `forceWebGL` behavior and any documented caveats |
| Addons | control, post, and loader import paths under `three/addons/` |
| Examples | whether the official example using the same technique still matches the repo's chosen landing path |

## Rule

Do not upgrade only one template or one canonical example path.

When the pinned version changes, update:

- `assets/runtime-versions.json`
- all generated starter expectations in tests
- any checked-in report text that records the pinned baseline
