# Lighting Rigs for Surface Studies

Use lighting as a diagnostic tool, not just polish. The rig should make the material's response legible before any scene dressing or heavy post.

## Default Rigs

### Neutral studio

Use this when the reference is ambiguous or when the first job is to verify the surface model itself.

- key light: hard or semi-hard, 30 to 45 degrees off axis
- fill light: soft and lower intensity to preserve contrast
- rim light: narrow and slightly elevated to expose edge response
- environment: neutral HDRI or low-contrast PMREM

What this rig reveals:

- roughness response
- fresnel and edge tint
- normal-map strength
- metalness and diffuse/specular balance

### Product highlight rig

Use this for glossy plastics, metals, coated paint, and glass where highlight shape is part of the look.

- large soft key area to create a readable highlight band
- secondary kicker to shape edge rolloff
- dark background or negative fill to keep highlight silhouettes clean

What this rig reveals:

- clearcoat behavior
- highlight width and breakup
- anisotropy directionality
- transmission edge behavior

### Harsh validation rig

Use this to expose weaknesses that a flattering rig can hide.

- single hard key
- minimal fill
- high-contrast background

What this rig reveals:

- banding
- broken normals or tangent seams
- shadow acne and contact issues
- over-tuned post hiding weak materials

## Rig Selection Rules

- If the reference does not clearly define lighting, start with the neutral studio rig.
- If the material is sold by highlight shape, move next to the product highlight rig.
- If the look depends on atmosphere or glow, validate the base material first, then add the atmospheric layer as a second pass.
- If the surface is emissive, normalize the emission first so tonemapping does not falsely sell the material.

## Capture Requirements

For review, capture at least:

- one neutral-rig still
- one stress-rig still
- one environment-led still
- one note about what changed between rigs

If the surface only looks correct under one flattering rig, document that as a limitation.
