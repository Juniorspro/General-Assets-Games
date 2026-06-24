# Measured And Scanned Materials

This branch covers materials driven by scan textures, calibrated capture, or externally authored appearance data.

## Scope

Use this branch when the user provides:

- scan-derived texture sets
- photogrammetry or material-scan outputs
- calibrated `glTF` material assets
- `MaterialX` graphs
- lookdev instructions that explicitly claim the source is measured

## Route Priority

1. preserve the asset route
2. validate texture and color-space assumptions
3. validate geometry and normal fidelity
4. only then adjust the material model

## Core Rule

Do not claim measured fidelity unless the source actually includes measured appearance data. Many scan workflows are best described as `scan-assisted PBR`, not full measured BRDF capture.

## Practical Routes

| Source shape | Preferred route | Notes |
| --- | --- | --- |
| calibrated `glTF` asset | `GLTFLoader` path first | preserves many `KHR_materials_*` features directly |
| node-graph material authored externally | `MaterialXLoader` | current official route is WebGPU-only |
| texture scan set with standard PBR maps | `MeshStandardMaterial` or `MeshPhysicalMaterial` | treat the scan as input data, not a reason to jump to custom shaders |
| scan set with missing or noisy channels | stock material plus documented cleanup | note what was reconstructed by hand |

## Failure Modes

- repainting key textures until the scan provenance no longer matters
- hiding normal-map or roughness issues with flattering lighting
- calling artist-cleaned textures `measured`
- changing the material class because the scan inputs are noisy instead of fixing the inputs first

## Fixture

- [../fixtures/scanned-pbr-vs-scan-assisted-cleanup/README.md](../fixtures/scanned-pbr-vs-scan-assisted-cleanup/README.md): runnable sample that keeps the same stock `MeshStandardMaterial` route while contrasting raw scan-like inputs against a cleaned-up asset pass
