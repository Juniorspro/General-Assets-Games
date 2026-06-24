# GLSL Post Effect With TSL Interop Shader Port Report

## Summary

- Source artifact: `Legacy fullscreen post fragment with one reusable noise helper`
- Classification: `fullscreen-post`
- Authoring route: `tsl-plus-interop`
- Status label: `ported-with-scoped-interop`
- Primary renderer contract: `webgpu+webgl2-backend`
- Fallback contract: `legacy-webgl-raw`
- Runnable sample: `no`
- Verified paths: `documentation-only`

## Source Contract

| Field | Value | Notes |
| --- | --- | --- |
| Source kind | `Standalone GLSL fullscreen post shader` | `One small helper is easier to keep native` |
| Authoritative artifact | `Single post fragment plus helper` | `No hidden pass chain` |
| Required inputs | `scene color, time, UV` | `No storage or compute state` |
| Missing inputs | `none` | `The route decision is not blocked by source gaps` |
| Pass topology | `single fullscreen post pass` | `Can land on one post material` |

## Classification

- Intake classification: `fullscreen-post`
- Why this classification fits: the effect consumes screen-aligned inputs and shades a single post pass instead of a mesh material or multipass graph.
- What classification would be wrong: `legacy-webgl-raw` is an authoring route, not a source classification, and `multipass-post` would invent buffers that are not present.

## Chosen Authoring Route

- Preferred route: `tsl-plus-interop`
- Why it is the narrowest honest route: the composition, blending, and host-side resource mapping remain visible in TSL while one isolated helper stays native and named.
- What was intentionally not chosen: `pure-tsl` would force a larger rewrite with no trust benefit, while `legacy-webgl-raw` would hide too much of the effect behind raw GLSL.

## Status Label

- Final status label: `ported-with-scoped-interop`
- Why the status matches reality: the route is still mostly TSL but does depend on a tightly scoped native helper.
- What would have to change to earn a stronger label: the helper would need to move into ordinary TSL nodes without making the port less readable.

## Renderer / Backend Contract

| Path | Promised | Notes |
| --- | --- | --- |
| `WebGPU` via `WebGPURenderer` | `yes` | `Assumes a matching native helper path exists` |
| `WebGL2` backend via `WebGPURenderer` | `yes` | `Same assumption as above` |
| Raw `WebGLRenderer` path | `no` | `Not required for this archetype` |

## Resource Mapping

| Source resource | Three.js landing | Notes |
| --- | --- | --- |
| Scene color | Post input texture | `Standard fullscreen post input` |
| Time | Uniform or TSL time node | `Host-updated if the helper needs explicit scalar input` |
| Noise helper | Named native helper | `Boundary must stay local and documented` |

## Coordinate Mapping

| Source assumption | Three.js mapping | Notes |
| --- | --- | --- |
| Screen UV | `screenUV` or fullscreen quad UV | `Depends on the post harness` |
| Pixel scale assumption | Explicit resolution uniform if required | `Do not assume implicit framebuffer size` |

## Pass Mapping

| Source pass | Three.js pass or material | Notes |
| --- | --- | --- |
| Fullscreen composite | Node-based post material | `Single pass; helper remains isolated` |

## Unsupported / Approximated Cases

- This fixture does not bless native helper sprawl. If the helper grows into a hidden shader body, the honest route becomes `legacy-webgl-raw`.

## Fallback Plan

- Primary fallback: `legacy-webgl-raw`
- What it preserves: exact helper behavior if a cross-backend scoped helper cannot stay small.
- What it drops: node-level readability and backend unification.

## Verification Notes

- Verified path(s): `documentation-only`
- Visual checks: this v1 fixture only validates the contract shape, route choice, and fallback honesty.
- What remains unverified: no checked-in runnable sample proves the helper boundary yet.
