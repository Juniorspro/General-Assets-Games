# SSS And Translucency

This branch separates three related but different problems: thin transmission, cheap translucency, and true subsurface scattering.

## Route Selection

| Cue | Preferred route | Notes |
| --- | --- | --- |
| clear glass, acrylic, transparent plastic | `MeshPhysicalMaterial` transmission | reflective thin-surface transmission, not SSS |
| wax, skin, jade, marble edge glow, backlit ears or leaves | `MeshSSSNodeMaterial` or `SubsurfaceScatteringShader` | use when internal light spread is the key cue |
| soft backlight cue without full physical ambition | documented cheap translucency route | acceptable when the user wants speed or approximation |

## Key Distinctions

- `transmission` models optical transparency and can remain highly reflective even when fully transmissive
- SSS models light entering, scattering inside, and exiting nearby points
- cheap translucency is often enough for leaves, paper, or stylized soft solids, but should be labeled honestly

## Practical Rules

- If the look is sold by a thickness map or soft backlit rim, do not default to plain transmission.
- If the object should stay optically clear, do not default to SSS.
- If the goal is a fast convincing read, an addon translucency route may be enough; document that this is an approximation.

## Validation Shots

For SSS or translucency work, capture:

- front-lit read
- backlit thin-region read
- one thickness-driven comparison if a thickness map exists

## Failure Modes

- using opacity for wax or skin
- using transmission for leaves when diffuse backlighting is the actual cue
- calling a cheap translucency hack `physically correct SSS`
