# Scanned PBR vs Scan-Assisted Cleanup Material Lab Report

## Summary

- Material family: `scan-driven dielectric surface comparison`
- Chosen route: `same MeshStandardMaterial route with two different input-quality levels`
- Preview path: `http://localhost:4173/skills/material-lab/fixtures/scanned-pbr-vs-scan-assisted-cleanup/`
- Physically grounded vs art-directed: `mostly physically grounded with an art-directed preview rig`
- Key decision: `clean the captured inputs before escalating to custom shading`

## Reference Inputs

- Primary input: `fixture-defined procedural scan-like color, roughness, and normal textures`
- Secondary inputs: `none`

## Material Classification

- Family: `measured-or-scanned dielectric`
- Surface cues: `captured albedo variation, unstable roughness breakup, and noisy micro-normal response`
- Wrong routes to avoid: `jumping straight to custom shaders before validating the capture and cleanup pass`

## Appearance Drivers

- Tone / albedo: `raw path keeps blotchy color drift, cleanup path stabilizes tone and balance`
- Roughness / micro-surface: `raw path produces unstable highlight breakup, cleanup path smooths the highlight field`
- Edge / fresnel / transmission cues: `the comparison stays surface-bound and opaque on purpose`
- Lighting dependency: `the result depends on a neutral room environment plus a stable key and rake light`

## Chosen Route

- Smallest honest route: `two MeshStandardMaterial samples using the same authoring path but different texture quality`
- Renderer path: `WebGL2 via WebGLRenderer`
- Why this route fits: `it isolates the input-quality question without changing the shader model`
- What was intentionally not used: `custom BRDF work, scan reprojection tooling, or measured reflectance claims`

## Lighting / Preview Assumptions

- Preview mode: `zero-build fixture over http://localhost`
- Environment: `RoomEnvironment PMREM with a dark floor and low-contrast stage`
- Key lights: `warm directional key, cool rake light, and soft warm bounce`
- Camera / framing: `shared orbit camera with two side-by-side hero samples`

## Controls

- Exposed controls: `scene rotation, exposure, environment intensity, raw normal and roughness bias, and cleanup normal and roughness bias`
- Safe tuning range: `compare both samples under the same exposure and environment intensity before changing per-branch controls`

## Validation Review

- What should change on screen: `cleanup should stabilize highlights, reduce noisy normal response, and keep the same surface family`
- What should stay invariant: `geometry, staging, renderer path, and stock PBR route`
- Review outcome: `the fixture makes it obvious that some scan failures are input failures rather than shader failures`

## Limits

- This fixture proves: `that scan cleanup can materially improve a result without leaving the stock PBR route`
- This fixture does not prove: `a full scan pipeline, measured-material fidelity, or custom-shader necessity`
- Remaining unknowns: `how the decision changes with real captured datasets, calibrated charts, or higher-resolution scan inputs`
