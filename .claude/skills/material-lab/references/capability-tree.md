# Material Lab Capability Tree

This file defines what `material-lab` should be able to do when it is fully mature.

## Level 1: Intake

- accept reference images, lookdev notes, shader snippets, `glTF` assets, `MaterialX`, or a verbal material target
- classify whether the task is look-matching, isolated R and D, asset debugging, or stylized invention

## Level 2: Material Classification

- identify dielectric versus conductor
- distinguish thin transparent from volumetric transmission
- distinguish transmission from true subsurface scattering
- distinguish coated materials from single-layer materials
- distinguish cloth sheen from generic fresnel boosting
- distinguish measured or scanned inputs from hand-authored approximations
- flag when the target is stylized rather than physically grounded

## Level 3: Three.js Route Selection

- choose between `MeshStandardMaterial`, `MeshPhysicalMaterial`, `MeshSSSNodeMaterial`, NodeMaterial and `TSL`, imported `glTF`, imported `MaterialX`, ecosystem wrappers, addon translucency routes, or raw shader fallback
- keep renderer choice explicit but secondary to the material-model decision

## Level 4: Support Systems

- HDRI and PMREM setup
- color-space and texture-channel sanity
- tangent and normal-map checks
- measured-input and scan-texture sanity
- geometry choice for reveal shots
- compact GUI control surface

## Level 5: Validation

- controlled lighting rigs
- multi-angle review
- physics sanity checks
- SSS/backlight sanity
- measured-data honesty checks
- clear report of physically grounded versus art-directed choices

## Failure Conditions

The skill is not advanced enough if it:

- jumps into TSL before classifying the material
- defaults to custom shaders for stock physical-material problems
- confuses opacity with physical transmission
- confuses transmission with subsurface scattering
- labels scan-derived texture work as measured BRDF capture without evidence
- treats metalness as a free artistic tint knob
- uses flattering lighting to hide a weak surface model
