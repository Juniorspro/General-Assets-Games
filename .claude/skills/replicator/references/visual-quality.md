# Visual Quality

## Table of Contents

1. Write the effect spec
2. Align the implementation order
3. Check the final result

## Write the effect spec

Describe the target effect in measurable language before implementation.

Capture these fields:

- Shape: silhouettes, repetition, thickness, density, negative space
- Surface: roughness, emissive feel, fresnel, edge tint, line quality
- Lighting: dominant direction, softness, shadow behavior, depth cues
- Atmosphere: fog, scattering, haze, glow, background treatment
- Post: bloom size, threshold, contrast, vignette, grain, aberration
- Motion: speed bands, cadence, turbulence, loop length, calm versus burst phases
- Interaction: pointer mapping, touch behavior, scroll response, audio coupling
- Invariants: the details the user will notice immediately if they drift
- Constraints: device class, FPS target, quality floor, allowed fallbacks

Prefer numbers when possible:

- Approximate element count
- Loop duration
- Apparent pixel scale
- Bloom radius
- Step count ceiling
- DPR cap

## Align the implementation order

Build in this order:

1. Match composition and silhouette
2. Match motion timing and density
3. Match palette and tonal range
4. Match depth cues and atmosphere
5. Match post-processing and finishing details

Do not chase tiny shader tricks before the big visual beats are correct.

## Check the final result

Review these categories before shipping.

### Visual

- Do the keyframes read the same way?
- Does the color mapping land in the same tonal neighborhood?
- Do depth, contrast, and layering feel comparable?

### Time

- Is the motion speed in the same range?
- Does the loop or stochastic rhythm feel right?
- Do bursts, pauses, and easing moments happen at the right scale?

### Interaction

- Does input change the same part of the effect?
- Is the response curve too linear, too delayed, or too noisy?
- Does the effect remain readable after sustained interaction?

### Engineering

- Is the dominant bottleneck understood?
- Are the fallback switches obvious and reversible?
- Is the report clear about remaining gaps or approximations?
