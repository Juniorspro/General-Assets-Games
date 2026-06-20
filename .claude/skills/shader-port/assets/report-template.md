# __FIXTURE_OR_TASK_NAME__ Shader Port Report

## Summary

- Source artifact: `TODO`
- Classification: `single-pass-fragment/material-logic/fullscreen-post/multipass-post/feedback-chain/compute-storage-pipeline`
- Authoring route: `pure-tsl/tsl-plus-interop/tsl-webgpu-only/legacy-webgl-raw/blocked`
- Status label: `ported-cleanly/ported-with-scoped-interop/webgpu-only/legacy-webgl-fallback/blocked`
- Primary renderer contract: `webgpu+webgl2-backend/webgpu-only/webgl-renderer-only/blocked`
- Fallback contract: `none/webgpu-only/tsl-webgl2-backend/legacy-webgl-raw/approximation/blocked-pending-assets-or-decision`
- Runnable sample: `yes/no`
- Verified paths: `documentation-only/webgpu/webgl2-backend/webgl-renderer`

## Source Contract

| Field | Value | Notes |
| --- | --- | --- |
| Source kind | `TODO` | `Shadertoy/GLSL/WGSL/legacy demo/other` |
| Authoritative artifact | `TODO` | `URL, file set, or source summary` |
| Required inputs | `TODO` | `time, mouse, textures, history, depth, buffers` |
| Missing inputs | `TODO` | `none if complete` |
| Pass topology | `TODO` | `single pass, ordered pass list, or blocked` |

## Classification

- Intake classification: `single-pass-fragment/material-logic/fullscreen-post/multipass-post/feedback-chain/compute-storage-pipeline`
- Why this classification fits:
- What classification would be wrong:

## Chosen Authoring Route

- Preferred route: `pure-tsl/tsl-plus-interop/tsl-webgpu-only/legacy-webgl-raw/blocked`
- Why it is the narrowest honest route:
- What was intentionally not chosen:

## Status Label

- Final status label: `ported-cleanly/ported-with-scoped-interop/webgpu-only/legacy-webgl-fallback/blocked`
- Why the status matches reality:
- What would have to change to earn a stronger label:

## Renderer / Backend Contract

| Path | Promised | Notes |
| --- | --- | --- |
| `WebGPU` via `WebGPURenderer` | `yes/no` | `TODO` |
| `WebGL2` backend via `WebGPURenderer` | `yes/no` | `TODO` |
| Raw `WebGLRenderer` path | `yes/no` | `TODO` |

## Resource Mapping

| Source resource | Three.js landing | Notes |
| --- | --- | --- |
| `TODO` | `TODO` | `TODO` |

## Coordinate Mapping

| Source assumption | Three.js mapping | Notes |
| --- | --- | --- |
| `TODO` | `TODO` | `TODO` |

## Pass Mapping

| Source pass | Three.js pass or material | Notes |
| --- | --- | --- |
| `TODO` | `TODO` | `TODO` |

## Unsupported / Approximated Cases

- `TODO`

## Fallback Plan

- Primary fallback: `none/webgpu-only/tsl-webgl2-backend/legacy-webgl-raw/approximation/blocked-pending-assets-or-decision`
- What it preserves:
- What it drops:

## Verification Notes

- Verified path(s): `documentation-only/webgpu/webgl2-backend/webgl-renderer`
- Visual checks:
- What remains unverified:
