# Blocked Multipass Missing Assets Shader Port Report

## Summary

- Source artifact: `Incomplete multipass post chain with missing Buffer B capture and missing lookup textures`
- Classification: `multipass-post`
- Authoring route: `blocked`
- Status label: `blocked`
- Primary renderer contract: `blocked`
- Fallback contract: `blocked-pending-assets-or-decision`
- Runnable sample: `no`
- Verified paths: `none`

## Source Contract

| Field | Value | Notes |
| --- | --- | --- |
| Source kind | `Legacy multipass post demo` | `Buffers A and Image are visible, Buffer B is missing` |
| Authoritative artifact | `Partial source dump plus screenshots` | `Not enough to reconstruct the pass graph honestly` |
| Required inputs | `history buffer, lookup textures, ordered pass chain` | `All are material to correctness` |
| Missing inputs | `Buffer B shader source and two lookup textures` | `These missing artifacts block the port` |
| Pass topology | `incomplete multipass chain` | `Cannot be inferred safely from the remaining files` |

## Classification

- Intake classification: `multipass-post`
- Why this classification fits: the visible source clearly depends on multiple ordered passes and history state.
- What classification would be wrong: `single-pass-fragment` would hide the missing dependency chain and create a false impression that the port only needs one material.

## Chosen Authoring Route

- Preferred route: `blocked`
- Why it is the narrowest honest route: Buffer B shader source and the missing lookup textures are required to preserve simulation state and pass order.
- What was intentionally not chosen: every implementation route would require fabricating critical resources, which violates the source contract.

## Status Label

- Final status label: `blocked`
- Why the status matches reality: the effect cannot be reproduced correctly or maintainably until the missing pass and textures are provided.
- What would have to change to earn a stronger label: the missing Buffer B source and lookup textures would need to be supplied.

## Renderer / Backend Contract

| Path | Promised | Notes |
| --- | --- | --- |
| `WebGPU` via `WebGPURenderer` | `no` | `Route choice is deferred until source is complete` |
| `WebGL2` backend via `WebGPURenderer` | `no` | `Same blocker applies` |
| Raw `WebGLRenderer` path | `no` | `Source completeness fails before renderer choice` |

## Resource Mapping

| Source resource | Three.js landing | Notes |
| --- | --- | --- |
| Buffer A history | Render target or history texture | `Visible in source` |
| Buffer B history | Unknown | `Missing Buffer B shader source and two lookup textures block an honest port` |
| Lookup textures | Texture inputs | `Two required assets are missing from the source package` |

## Coordinate Mapping

| Source assumption | Three.js mapping | Notes |
| --- | --- | --- |
| Screen-space post UV | Would map to pass-local UV | `Blocked until the pass graph is complete` |
| History readback | Would map to explicit render targets | `Blocked by missing pass source` |

## Pass Mapping

| Source pass | Three.js pass or material | Notes |
| --- | --- | --- |
| Buffer A | Potential node post pass | `Visible but incomplete without downstream dependencies` |
| Buffer B | Unknown | `Missing Buffer B shader source and two lookup textures block an honest port` |
| Final image | Potential composite pass | `Depends on the missing Buffer B output` |

## Unsupported / Approximated Cases

- Missing Buffer B shader source and two lookup textures block an honest port.
- Any guessed replacement would be fabrication, not migration.

## Fallback Plan

- Primary fallback: `blocked-pending-assets-or-decision`
- What it preserves: honesty about the current source gap.
- What it drops: no runnable fallback is offered until the user accepts a disclosed approximation or supplies the missing assets.

## Verification Notes

- Verified path(s): `none`
- Visual checks: the current corpus only verifies that the blocker is recorded precisely and not waved away.
- What remains unverified: all runtime behavior remains unverified until the missing assets arrive.
