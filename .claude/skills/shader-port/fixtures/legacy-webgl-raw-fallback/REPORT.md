# Legacy WebGL Raw Fallback Shader Port Report

## Summary

- Source artifact: `Legacy GLSL fullscreen effect with raw fragment-stage control requirements`
- Classification: `fullscreen-post`
- Authoring route: `legacy-webgl-raw`
- Status label: `legacy-webgl-fallback`
- Primary renderer contract: `webgl-renderer-only`
- Fallback contract: `none`
- Runnable sample: `no`
- Verified paths: `documentation-only`

## Source Contract

| Field | Value | Notes |
| --- | --- | --- |
| Source kind | `Legacy WebGL demo or shader pair` | `Assumes direct fragment and vertex shader ownership` |
| Authoritative artifact | `Raw GLSL source plus host-side uniforms` | `No node-material equivalent promised` |
| Required inputs | `scene or post textures, explicit uniforms, raw shader hooks` | `Core to fidelity` |
| Missing inputs | `none` | `The issue is route suitability, not source completeness` |
| Pass topology | `single or modest post chain under raw WebGL` | `Still fundamentally a raw GLSL route` |

## Classification

- Intake classification: `fullscreen-post`
- Why this classification fits: the source is still a screen-space effect, even though the honest implementation route is raw WebGL.
- What classification would be wrong: `material-logic` would imply a mesh-material port, and `compute-storage-pipeline` would invent a capability requirement that the source does not need.

## Chosen Authoring Route

- Preferred route: `legacy-webgl-raw`
- Why it is the narrowest honest route: current Three.js does not support raw custom materials on `WebGPURenderer`, and forcing the effect into TSL would hide or distort too much of the original shader structure.
- What was intentionally not chosen: `pure-tsl` and `tsl-plus-interop` would overstate maintainability or compatibility gains that the source contract does not support.

## Status Label

- Final status label: `legacy-webgl-fallback`
- Why the status matches reality: the correct route requires raw GLSL on `WebGLRenderer`, which is explicitly a compatibility fallback in this skill.
- What would have to change to earn a stronger label: the effect would need a genuinely maintainable TSL rewrite, not just a wrapper around the original GLSL body.

## Renderer / Backend Contract

| Path | Promised | Notes |
| --- | --- | --- |
| `WebGPU` via `WebGPURenderer` | `no` | `Raw custom materials are not claimed here` |
| `WebGL2` backend via `WebGPURenderer` | `no` | `This fixture keeps the route explicitly raw` |
| Raw `WebGLRenderer` path | `yes` | `Primary and only honest route in this archetype` |

## Resource Mapping

| Source resource | Three.js landing | Notes |
| --- | --- | --- |
| Uniform block | `ShaderMaterial` uniforms | `Mapped directly instead of hiding them behind nodes` |
| Fullscreen input textures | Raw sampler uniforms | `Preserve original shader expectations` |

## Coordinate Mapping

| Source assumption | Three.js mapping | Notes |
| --- | --- | --- |
| Fragment UV or pixel coordinate | Raw shader varying or explicit uniform math | `Preserved inside GLSL` |
| Viewport size | Host-side resolution uniform | `Must stay explicit` |

## Pass Mapping

| Source pass | Three.js pass or material | Notes |
| --- | --- | --- |
| Main raw post pass | `ShaderMaterial` or `ShaderPass` on `WebGLRenderer` | `Not a WebGPU route` |

## Unsupported / Approximated Cases

- This fixture does not claim `WebGPURenderer` compatibility.
- If future TSL coverage improves, that would be a new route decision, not evidence that this fallback was already cross-backend.

## Fallback Plan

- Primary fallback: `none`
- What it preserves: the raw GLSL contract is already the fallback route.
- What it drops: node-graph maintainability and unified backend promises.

## Verification Notes

- Verified path(s): `documentation-only`
- Visual checks: this v1 fixture validates that the route and status are labeled honestly.
- What remains unverified: no checked-in runnable raw WebGL sample is included in the fixture corpus yet.
