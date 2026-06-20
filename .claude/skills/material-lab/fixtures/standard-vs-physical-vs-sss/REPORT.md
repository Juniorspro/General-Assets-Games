# Standard vs Physical vs SSS Material Lab Report

## Summary

- Material family: `translucent dielectric comparison`
- Chosen route: `side-by-side stock PBR vs physical transmission vs addon SSS`
- Preview path: `http://localhost:4173/skills/material-lab/fixtures/standard-vs-physical-vs-sss/`
- Physically grounded vs art-directed: `hybrid`
- Key decision: `transmission is not a substitute for SSS when the target cue is backlit internal spread`

## Reference Inputs

- Primary input: `fixture-defined warm translucent target with a fixed geometry and lighting rig`
- Secondary inputs: `none`

## Material Classification

- Family: `soft translucent dielectric`
- Surface cues: `warm body color, clear edge reflections, colored attenuation, and visible backlight bloom`
- Wrong routes to avoid: `treating the target as opaque PBR only or assuming clear-material transmission already covers SSS behavior`

## Appearance Drivers

- Tone / albedo: `warm peach-to-wax base tone with mild surface saturation`
- Roughness / micro-surface: `moderately smooth surface with enough roughness to hold broad highlights`
- Edge / fresnel / transmission cues: `physical route adds transmission and attenuation, while the SSS route adds internal light spread under backlight`
- Lighting dependency: `the comparison depends on a stable warm key, cool rim, and strong rear light`

## Chosen Route

- Smallest honest route: `MeshStandardMaterial, MeshPhysicalMaterial, and SubsurfaceScatteringShader shown on the same target`
- Renderer path: `WebGL2 via WebGLRenderer`
- Why this route fits: `it isolates the route choice instead of mixing route changes with scene changes`
- What was intentionally not used: `MeshSSSNodeMaterial, volumetric scattering, or a full skin or wax production setup`

## Lighting / Preview Assumptions

- Preview mode: `zero-build fixture over http://localhost`
- Environment: `RoomEnvironment PMREM plus a dark neutral stage`
- Key lights: `warm directional key, cool rim, warm front fill, and strong orange backlight`
- Camera / framing: `shared orbit camera with the same framing across all three samples`

## Controls

- Exposed controls: `scene rotation, backlight, exposure, standard roughness and metalness, physical transmission and thickness, and SSS thickness controls`
- Safe tuning range: `change one branch at a time and keep the lighting rig fixed while comparing`

## Validation Review

- What should change on screen: `physical should read more like transmissive material transport, while SSS should gain softer backlit bloom and internal spread`
- What should stay invariant: `geometry, labels, staging, environment, and camera contract`
- Review outcome: `the fixture makes the route boundary visible without pretending to be a photoreal benchmark`

## Limits

- This fixture proves: `that stock PBR, physical transmission, and SSS are distinct route decisions under the same rig`
- This fixture does not prove: `final-production skin, wax, or jade fidelity, nor WebGPU-native SSS parity`
- Remaining unknowns: `how the same decision should land with real measured textures, thickness maps, or production assets`
