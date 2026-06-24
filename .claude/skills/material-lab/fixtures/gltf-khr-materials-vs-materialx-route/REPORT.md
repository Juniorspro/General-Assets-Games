# glTF KHR Materials vs MaterialX Route Material Lab Report

## Summary

- Material family: `imported coated and transmissive material route comparison`
- Chosen route: `side-by-side glTF plus KHR extensions vs MaterialX standard_surface import`
- Preview path: `http://localhost:4173/skills/material-lab/fixtures/gltf-khr-materials-vs-materialx-route/`
- Physically grounded vs art-directed: `hybrid`
- Key decision: `authoring provenance is part of the material decision, not just file-format trivia`

## Reference Inputs

- Primary input: `fixture-defined physical material exported through GLTFExporter and reloaded through GLTFLoader`
- Secondary inputs: `fixture-defined inline MaterialX standard_surface document parsed with MaterialXLoader`

## Material Classification

- Family: `coated transmissive surface with thin-film and specular layering`
- Surface cues: `clearcoat, transmission, colored attenuation, and thin-film variation across the same hero geometry`
- Wrong routes to avoid: `reducing the choice to a generic imported material story without distinguishing route provenance`

## Appearance Drivers

- Tone / albedo: `shared warm body color with comparable specular and attenuation cues`
- Roughness / micro-surface: `moderately glossy surface with clearcoat polish`
- Edge / fresnel / transmission cues: `both paths aim at a similar family, but they arrive there through different asset routes`
- Lighting dependency: `the comparison depends on a shared WebGPU preview harness, PMREM environment, and stable key and rim lights`

## Chosen Route

- Smallest honest route: `runtime-generated glTF asset on the left and imported MaterialX graph on the right`
- Renderer path: `WebGPU via WebGPURenderer`
- Why this route fits: `MaterialXLoader requires the WebGPU build, and the paired fixture turns the ecosystem choice into a runnable comparison`
- What was intentionally not used: `hand-authored TSL rewrites, raw shader fallback, or claims of exact cross-route parity`

## Lighting / Preview Assumptions

- Preview mode: `zero-build fixture over http://localhost`
- Environment: `RoomEnvironment PMREM with a dark floor and neutral background`
- Key lights: `warm directional key, cool rim, and soft warm fill`
- Camera / framing: `shared orbit camera with mirrored pedestals and the same hero geometry`

## Controls

- Exposed controls: `scene rotation and exposure`
- Safe tuning range: `keep framing and lighting fixed so the route provenance stays readable`

## Validation Review

- What should change on screen: `the left sample should read as a glTF plus KHR asset route, while the right sample should read as a MaterialX graph-import route under the same scene contract`
- What should stay invariant: `geometry class, stage layout, lighting rig, and review framing`
- Review outcome: `the fixture makes the ecosystem route choice executable without overpromising parity or production coverage`

## Limits

- This fixture proves: `that glTF plus KHR and MaterialX are distinct material-delivery decisions with different authoring provenance`
- This fixture does not prove: `that one route is universally better, nor full DCC round-trip, packaging, or performance guidance`
- Remaining unknowns: `how the decision changes with external assets, larger node graphs, or mixed WebGPU and WebGL delivery requirements`
