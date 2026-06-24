# Ecosystem Material Routes

This file maps the current three.js material ecosystem into practical routes for `material-lab`.

## Core Three.js Routes

| Route | Use when | Notes |
| --- | --- | --- |
| `MeshStandardMaterial` | standard metallic-roughness PBR is enough | best default for many opaque materials |
| `MeshPhysicalMaterial` | clearcoat, sheen, iridescence, transmission, anisotropy, dispersion, specular, thickness, or volume-adjacent cues matter | richer physical feature set with higher cost |
| `MeshSSSNodeMaterial` | a node-based physical-material route is close, but the look truly needs a subsurface scattering term | experimental, but the most direct native SSS branch in the current docs |
| NodeMaterial and `TSL` | built-in lighting model is correct but custom logic or shared graph composition is needed | best default for maintainable customization |
| `glTF` import | material is authored in DCC and should arrive as an asset | preserves many modern material extensions |
| `MaterialX` import | material graph is authored externally and the workflow is already node-graph centric | current three.js route is WebGPU-only |
| `SubsurfaceScatteringShader` | the project needs a known translucent-shader route rather than a full node-material rewrite | addon shader, closer to cheap convincing translucency than full measured SSS |

## Ecosystem Helpers

| Route | Use when | Caution |
| --- | --- | --- |
| `three-custom-shader-material` | extend a stock material with targeted shader logic while keeping its base lighting model | treat as an interop step, not the default foundation |
| `@react-three/drei` material helpers | fast exploration in React projects for reflector, transmission, or refraction-style looks | useful wrappers, but still document the underlying material route |
| `lamina`-style layer materials | layered look exploration is more important than strict physical interpretation | good for exploratory composition, weaker as a canonical baseline |

## Default Route Order

1. stock core material
2. stock physical material
3. native SSS or translucency-specific route when the cue truly needs it
4. NodeMaterial or `TSL`
5. asset import route
6. ecosystem wrapper
7. raw shader fallback

The route should move downward only when the simpler route cannot honestly express the look.

## Fixture

- [../fixtures/gltf-khr-materials-vs-materialx-route/README.md](../fixtures/gltf-khr-materials-vs-materialx-route/README.md): runnable sample that contrasts the `glTF + KHR_materials_*` asset route with the `MaterialXLoader` route under the same WebGPU-oriented preview harness
