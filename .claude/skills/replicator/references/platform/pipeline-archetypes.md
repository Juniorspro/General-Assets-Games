# Pipeline Archetypes

## `single-pass-material`

Use when the effect lives inside one material or one object shading path.

Typical inputs:

- uniforms
- textures
- per-vertex or per-instance data

## `fullscreen-procedural`

Use when the whole image is generated from screen coordinates or a camera ray.

Typical inputs:

- uniforms
- textures
- optional history buffer

Typical examples:

- raymarch scenes
- full-screen distortion
- signed-distance 2D graphics

## `scene-plus-post`

Use when the base scene is ordinary geometry rendering and the signature look comes from post-processing.

Typical examples:

- bloom chains
- film looks
- aberration and vignette
- depth-based fog polish

## `simulation-plus-render`

Use when state update and visualization are distinct jobs.

Typical examples:

- boids
- particles
- fluid fields
- cloth

## `feedback-loop`

Use when the current frame depends directly on previous frames.

Typical examples:

- trails
- recursive distortion
- reaction diffusion
- persistence-based post effects

## `compute-plus-render`

Use when simulation or data processing genuinely needs an explicit compute stage before rendering.

Typical examples:

- boid neighborhood updates at scale
- GPU particle integration with structured state
- grid or voxel processing that is awkward as a render-only pipeline

Treat this as a stronger commitment than `simulation-plus-render`. It usually means `WebGPU` is not optional.

## Selection Rule

Choose the topology that matches the real dependency graph, not the most impressive label.
