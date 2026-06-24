# Surface Breakdown

Break the target look into modules before authoring anything.

## Core Modules

| Module | Questions to answer | Typical controls |
| --- | --- | --- |
| Material class | Is this primarily dielectric, conductor, coated, cloth, transmission, emissive, or mixed? | route choice, feature toggles |
| Base color | Is the surface flat, layered, tinted by thickness, or view-dependent? | `color`, gradient ramps, masks |
| Roughness and highlight shape | Is the highlight broad, sharp, broken, or anisotropic? | `roughness`, anisotropy, roughness map |
| Specular and edge response | Does the surface rely on fresnel, clearcoat, or strong edge tint? | fresnel weight, clearcoat, IOR |
| Normal detail | Is the detail large-scale, microdetail, or flow-driven? | normal strength, detail scale |
| Transmission or volume cue | Is the read sold by thickness, tint, refraction, absorption, or soft interior glow? | transmission, attenuation, thickness, IOR |
| Layering | Is there a top coat, fabric sheen, wet layer, oxide, or thin-film behavior? | clearcoat, sheen, iridescence |
| Emissive or post assist | Is the surface actually emissive, or is bloom doing the work? | emissive intensity, threshold, bloom |

## Classification Rules

- If the surface looks different mainly because of highlight shape, treat it as a lighting plus roughness problem first.
- If the surface class is unclear, resolve that before tuning secondary effects.
- If the silhouette edges do most of the work, inspect fresnel, clearcoat, or transmission before changing base color.
- If the effect only appears in motion, separate static surface response from temporal polish.
- If the reference is ambiguous, mark the unknown instead of inventing a special layer.

## Minimal Prototype Rule

The first prototype should prove:

- material class choice
- base tonal range
- highlight width
- edge response
- one representative detail map or procedural pattern

Everything else is optional until those four read correctly.
