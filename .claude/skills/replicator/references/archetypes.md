# Effect Archetypes

Choose the closest archetype before deep research or implementation.

## `material-study`

Use when:

- the reference is mostly about surface response, lighting behavior, or a hero object material
- the scene exists only to present the material
- post is optional polish, not the main look

Default route:

- implementation surface: `single-pass-material`
- post route: `none` or `scene-polish`
- performance contract: usually `balanced`

## `scene-post`

Use when:

- the base scene and its composition matter
- the final look clearly depends on bloom, grading, fog, or similar polish
- the post chain is important, but history feedback is not the main effect

Default route:

- implementation surface: `scene-plus-post`
- post route: `scene-polish` or `selective-post`
- likely bottleneck: `post-chain` or `fill-rate`

## `fullscreen-raymarch`

Use when:

- the image is generated mostly from screen coordinates or camera rays
- SDF, volume, or procedural image generation dominates
- the main bottleneck is likely shader cost or ray steps

Default route:

- implementation surface: `fullscreen-procedural`
- post route: `fullscreen-stack` only if it materially helps
- likely bottleneck: `ray-steps` or `fill-rate`

## `instanced-particles`

Use when:

- the look is driven by many particles, points, instances, or lightweight GPU entities
- density, field motion, or spawn behavior defines the effect

Default route:

- implementation surface: `scene-plus-post` or `simulation-plus-render`
- post route: `scene-polish`
- likely bottleneck: `particle-count`

## `feedback-trails`

Use when:

- the current frame depends on previous frames
- temporal persistence, trails, recursive distortion, or accumulation define the look

Default route:

- implementation surface: `feedback-loop`
- post route: `feedback-post`
- likely bottleneck: `bandwidth` or `post-chain`

## `mixed`

Use when:

- two archetypes are genuinely co-equal
- the dominant route is not obvious yet

Rule:

- still pick one dominant archetype for scaffolding
- explicitly name the secondary archetype in `REPORT.md`

Typical mixed combinations:

- `fullscreen-raymarch` + `scene-post`: a procedural hero image that still needs a scene-driven polish stack
- `instanced-particles` + `feedback-trails`: particles define the motion, history defines the finish
- `material-study` + `scene-post`: the material is the hero, but bloom or atmosphere materially changes the final read
- `scene-post` + `feedback-trails`: the scene composition matters, but temporal persistence is part of the signature look

Split strategy:

- choose the archetype that determines the first runnable scaffold
- keep the secondary archetype as an explicit module or upgrade path
- if the two routes imply different pass topologies, implement the simpler honest topology first
- if one route is only polish, keep it secondary and do not let it rewrite the base pipeline

## Quick Rejections

If the task is only:

- renderer selection -> use the implementation-surface decision module
- post-chain design -> use the post-pipeline decision module
- performance tuning -> use the performance-contract decision module

then the full reference-replication workflow is probably not the right starting point.
