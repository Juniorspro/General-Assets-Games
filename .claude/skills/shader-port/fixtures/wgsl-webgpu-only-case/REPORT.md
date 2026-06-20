# WGSL WebGPU-Only Case Shader Port Report

## Summary

- Source artifact: `WGSL-style storage-driven shading case`
- Classification: `compute-storage-pipeline`
- Authoring route: `tsl-webgpu-only`
- Status label: `webgpu-only`
- Primary renderer contract: `webgpu-only`
- Fallback contract: `approximation`
- Runnable sample: `no`
- Verified paths: `documentation-only`

## Source Contract

| Field | Value | Notes |
| --- | --- | --- |
| Source kind | `WGSL snippet with storage dependency` | `Representative of compute-adjacent shader logic` |
| Authoritative artifact | `Single module plus storage resource contract` | `No WebGL-compatible equivalent promised` |
| Required inputs | `storage texture or storage buffer, dispatch-driven state` | `Core to correctness` |
| Missing inputs | `none` | `The blocker is backend capability, not source completeness` |
| Pass topology | `compute-driven pipeline feeding a draw or post stage` | `Not honest as a plain WebGL post port` |

## Classification

- Intake classification: `compute-storage-pipeline`
- Why this classification fits: the shader logic depends on storage-backed data flow instead of a standalone fragment or material pass.
- What classification would be wrong: `single-pass-fragment` would erase the storage requirement and lead to false portability claims.

## Chosen Authoring Route

- Preferred route: `tsl-webgpu-only`
- Why it is the narrowest honest route: the key dependency is backend capability, so the route must state that constraint directly instead of pretending a generic TSL path is enough.
- What was intentionally not chosen: `pure-tsl` and `tsl-plus-interop` would imply broader backend coverage than the source contract supports.

## Status Label

- Final status label: `webgpu-only`
- Why the status matches reality: the effect depends on WebGPU-only resources in current Three.js and does not ship a verified `WebGL2` equivalent.
- What would have to change to earn a stronger label: a separate non-storage approximation would need to be implemented and verified as a different route.

## Renderer / Backend Contract

| Path | Promised | Notes |
| --- | --- | --- |
| `WebGPU` via `WebGPURenderer` | `yes` | `Primary contract` |
| `WebGL2` backend via `WebGPURenderer` | `no` | `Not honest for storage-driven correctness` |
| Raw `WebGLRenderer` path | `no` | `Would require a materially different approximation` |

## Resource Mapping

| Source resource | Three.js landing | Notes |
| --- | --- | --- |
| Storage buffer or texture | `storage()` or `storageTexture()` | `Current Three.js support is WebGPU-only` |
| Dispatch-time parameters | Uniforms plus compute dispatch contract | `Must stay explicit` |

## Coordinate Mapping

| Source assumption | Three.js mapping | Notes |
| --- | --- | --- |
| Grid or dispatch coordinates | Compute or storage index mapping | `Not equivalent to plain fragment UVs` |
| Output surface | Draw-stage readback or composed pass | `Depends on the larger pipeline` |

## Pass Mapping

| Source pass | Three.js pass or material | Notes |
| --- | --- | --- |
| Storage update pass | WebGPU-only compute or storage stage | `Cannot promise WebGL2 parity` |
| Presentation pass | Draw or post node fed by storage output | `Secondary stage only` |

## Unsupported / Approximated Cases

- No honest `WebGL2` parity is claimed in this fixture.
- Any future `WebGL2` fallback would be an approximation, not evidence that the original route was cross-backend.

## Fallback Plan

- Primary fallback: `approximation`
- What it preserves: broad visual intent if a separate simplified effect is later authored.
- What it drops: storage-driven correctness and exact execution semantics.

## Verification Notes

- Verified path(s): `documentation-only`
- Visual checks: this v1 fixture validates the route label and fallback honesty only.
- What remains unverified: no checked-in runnable sample proves a concrete storage-based implementation yet.
