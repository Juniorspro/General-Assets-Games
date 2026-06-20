# Shadertoy Single-Pass Clean Port Shader Port Report

## Summary

- Source artifact: `Synthetic Shadertoy-style fragment archetype with time-driven color bands`
- Classification: `single-pass-fragment`
- Authoring route: `pure-tsl`
- Status label: `ported-cleanly`
- Primary renderer contract: `webgpu+webgl2-backend`
- Fallback contract: `none`
- Runnable sample: `yes`
- Verified paths: `documentation-only`

## Source Contract

| Field | Value | Notes |
| --- | --- | --- |
| Source kind | `Shadertoy-style GLSL fragment` | `Fixture uses a synthetic archetype instead of a public URL so the route stays minimal` |
| Authoritative artifact | `Single fullscreen fragment pass` | `No hidden buffers or external textures` |
| Required inputs | `time, normalized screen UV` | `No mouse, audio, depth, or history` |
| Missing inputs | `none` | `Everything needed for parity is present in the fixture` |
| Pass topology | `single pass` | `Fullscreen quad rendered directly` |

## Classification

- Intake classification: `single-pass-fragment`
- Why this classification fits: the effect is one procedural fragment program with no scene material state, no multipass chain, and no storage or compute dependency.
- What classification would be wrong: `multipass-post` or `compute-storage-pipeline` would overstate the dependency surface and lead to a heavier route than the source needs.

## Chosen Authoring Route

- Preferred route: `pure-tsl`
- Why it is the narrowest honest route: the effect is only time, UV remapping, and color blending, so direct node expressions preserve intent without hiding behavior in native helper code.
- What was intentionally not chosen: `tsl-plus-interop` would add unnecessary escape hatches, and `legacy-webgl-raw` would give up the maintainability benefit for no fidelity gain.

## Status Label

- Final status label: `ported-cleanly`
- Why the status matches reality: the checked-in sample uses only TSL nodes, keeps the effect class intact, and exposes the same node graph on both promised backend paths.
- What would have to change to earn a stronger label: no stronger label exists in this taxonomy; dropping a backend promise would only make the contract narrower, not better.

## Renderer / Backend Contract

| Path | Promised | Notes |
| --- | --- | --- |
| `WebGPU` via `WebGPURenderer` | `yes` | `Default fixture path` |
| `WebGL2` backend via `WebGPURenderer` | `yes` | `Enabled through ?backend=webgl2` |
| Raw `WebGLRenderer` path | `no` | `Not needed for this archetype` |

## Resource Mapping

| Source resource | Three.js landing | Notes |
| --- | --- | --- |
| `iTime`-style scalar | TSL `time` node | `No manual uniform plumbing required in the fixture` |
| Normalized UV | Plane `uv()` on a fullscreen quad | `Equivalent for this single-pass sample` |
| Colors | TSL `color()` nodes | `Author-facing palette controls only` |

## Coordinate Mapping

| Source assumption | Three.js mapping | Notes |
| --- | --- | --- |
| `fragCoord / resolution` normalized to 0..1 | Plane `uv()` on a clip-space quad | `Sufficient because the sample has no camera-dependent distortion` |
| Time-driven animation | TSL `time` node | `Avoids custom host-side frame bookkeeping` |

## Pass Mapping

| Source pass | Three.js pass or material | Notes |
| --- | --- | --- |
| Main image pass | `MeshBasicNodeMaterial` on a fullscreen quad | `Single scene, single draw` |

## Unsupported / Approximated Cases

- This fixture does not model derivative-heavy effects, mip-sensitive texture sampling, or hidden Shadertoy channels because those would move it out of the clean single-pass archetype.

## Fallback Plan

- Primary fallback: `none`
- What it preserves: the same TSL graph already covers both promised backend paths.
- What it drops: no additional fallback route is needed in this fixture.

## Verification Notes

- Verified path(s): `documentation-only`
- Visual checks: repository validation covers the report contract, fixture metadata, runnable file presence, and JavaScript syntax.
- What remains unverified: backend-specific rendering still requires local browser verification on a machine with usable `WebGPU` or `WebGL2`.
