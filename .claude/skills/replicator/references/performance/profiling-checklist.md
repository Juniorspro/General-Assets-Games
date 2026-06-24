# Profiling Checklist

Use this before locking a performance decision.

## Check 1: Device contract

- Is the default device class explicit?
- Does the implementation match that target honestly?

## Check 2: Bottleneck label

- Is the dominant bottleneck named explicitly?
- Does the chosen label match the effect shape?

## Check 3: First degradation step

- Is the first lever low-risk?
- Does it preserve the main silhouette, density, and motion character?

## Check 4: GUI safety

- Are exposed controls stable and understandable?
- Are destructive controls hidden by default?

## Check 5: Failure condition

- What frame rate or responsiveness threshold counts as failure?
- What visual loss is unacceptable even if performance improves?

## Useful tools

- Chrome DevTools Performance panel: confirm whether time is dominated by JS, rendering, or presentation
- `renderer.info`: check draw calls, geometries, textures, and whether scene churn matches the bottleneck label
- `stats.js` or an equivalent overlay: watch frame pacing while changing one lever at a time
- Spector.js or browser GPU inspection tools: inspect pass count, render-target usage, and suspicious state churn

## Short method

1. capture a baseline at the default device contract
2. move one lever that should affect the suspected bottleneck
3. confirm frame time changes in the expected direction
4. only then lock the bottleneck label and degradation ladder

## Rule

If any of these remain vague, the performance contract is not finished.
