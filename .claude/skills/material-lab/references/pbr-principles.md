# PBR Principles

Start from a physically plausible baseline, then document every deliberate cheat.

## Core Rules

- Keep energy conservation explicit: match the reference's diffuse plus specular balance and note if you need to bias it for visual reasons.
- Treat `metalness` as a material-class control, not a generic reflectivity slider.
- Expose `metalness`, `roughness`, and `ambientOcclusion` as tuning controls even when one baked value would be enough for the prototype.
- Use image-based lighting when the reference has meaningful reflective detail; record the HDRI source and any PMREM preprocessing.
- When the reference depends on split normals, trim sheets, or flow maps, note the mapping strategy and provide a minimal mesh that reveals the behavior.

## Practical Baseline

Use this sequence before adding special modules:

1. lock base color and tonal range
2. tune roughness until highlight width is close
3. tune metalness, IOR, or specular behavior based on material class
4. verify normal scale under both soft and hard lighting
5. add clearcoat, transmission, sheen, iridescence, or emissive only if the look still needs them

## Common Failure Modes

| Failure | Typical cause | Fix direction |
| --- | --- | --- |
| Surface looks flat | roughness too high, missing environment contrast | improve HDRI contrast before adding fake rim light |
| Surface looks metallic when it should not | metalness leakage or dark albedo | reset metalness and rebalance base color |
| Glass looks like alpha-blended plastic | using opacity instead of transmission or missing thickness cues | move to `MeshPhysicalMaterial`-style transmission and thickness |
| Highlights sparkle or crawl | normal map too strong or low-res environment | reduce normal strength and verify texture filtering |
| Material only works from one angle | fresnel or clearcoat over-tuned | re-balance edge response under a neutral rig |

## Cheat Policy

Acceptable cheats when documented:

- slight fresnel boost for stylized edges
- clamped roughness range for cleaner highlights
- hand-tuned emissive bloom support
- art-directed tint in reflections

Do not hide large material-model errors behind post. Fix the base response first.
