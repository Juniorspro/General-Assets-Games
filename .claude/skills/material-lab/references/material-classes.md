# Material Classes

Classify the material family before implementation. This is the highest-leverage decision in the workflow.

## Core Classes

| Class | Visual cues | Usual three.js starting point |
| --- | --- | --- |
| Dielectric | diffuse base plus neutral specular, paint, plastic, stone, wood | `MeshStandardMaterial` |
| Conductor | colored specular, little or no diffuse, metal | `MeshStandardMaterial` or `MeshPhysicalMaterial` |
| Coated surface | two highlight behaviors, wet look, car paint, lacquer | `MeshPhysicalMaterial` with clearcoat |
| Thin transmission | reflective glass or acrylic without meaningful interior absorption | `MeshPhysicalMaterial` with transmission |
| Volumetric transmission | tint through thickness, absorption, colored edges | `MeshPhysicalMaterial` with transmission plus thickness and attenuation |
| SSS / translucent solid | wax, skin, jade, leaves, marble-like edge glow, soft internal light spread | `MeshSSSNodeMaterial`, `SubsurfaceScatteringShader`, or a documented cheap translucency route |
| Cloth and fabric | soft retro-like edge, sheen lobe | `MeshPhysicalMaterial` with sheen |
| Thin-film and iridescent | color shift by angle, soap bubble, oil film | `MeshPhysicalMaterial` with iridescence or custom route |
| Measured or scanned | authored from scan textures, calibrated assets, or captured appearance data | `glTF`, `MaterialX`, or stock physical materials with explicit asset assumptions |
| Emissive surface | self-lit panels, LEDs, glow accents | stock PBR plus emissive and controlled post |
| Stylized | intentionally non-physical ramps or posterized response | stock route plus explicit stylization or custom shader |

## Classification Rules

- If the reflected color is strongly tinted and diffuse is weak, start by testing conductor.
- If the material stays reflective when transparent, it is likely transmission, not alpha blending.
- If light blooms through thin parts and softens around silhouettes, test an SSS/translucency route before overdriving transmission.
- If there are clearly two highlight layers, test clearcoat before writing custom shaders.
- If the surface changes hue with angle, test iridescence before inventing colored fresnel hacks.
- If cloth reads "powdery" or soft at grazing angles, use a sheen-based route before general roughness tuning.
- If the source comes from scans or calibrated assets, preserve the asset route first and avoid immediately repainting the textures by hand.

## Mixed Materials

If the target mixes classes, identify:

- primary class
- secondary layer
- whether the secondary layer can be approximated with existing physical-material features

Do not mark everything as `mixed` just because the surface is complex.
