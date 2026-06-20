# Asset Pipeline

Many material failures are input failures. Validate the asset path before changing the shader path.

## Required Checks

- base color textures are treated as color, not scalar data
- roughness, metalness, AO, thickness, and masks are treated as scalar data
- normal-map handedness is correct
- tangent-space assumptions are consistent
- HDRI or environment source is stated
- PMREM preprocessing is stated when using environment lighting
- scan-derived or measured-input provenance is stated when relevant

## Geometry And UV Notes

- Use a reveal mesh that exposes highlights, curvature, and transmission.
- If AO or light maps are used, confirm the required UV set exists.
- If anisotropy or tangent-dependent effects matter, confirm tangent quality before material tuning.
- If thickness or SSS maps are used, confirm UV seams and texel density do not break the read.

## Texture Rules

- Do not compensate for broken source textures by over-tuning lighting.
- If the texture packing comes from `glTF`, keep the packing expectations explicit.
- If compressed textures are involved, note that as part of the route rather than assuming it is irrelevant.
- If the asset comes from a scan set, state whether the maps are calibrated, baked, artist-cleaned, or only approximate.

## Environment Rule

If the material needs reflective fidelity, the report should state:

- environment source
- whether PMREM preprocessing is used
- whether the environment is neutral, product-style, or reference-matched

## Scan Honesty Rule

If the material is scan-driven but the workflow reauthors or heavily repaints key maps, call it `scan-inspired` or `scan-assisted`, not purely measured.
