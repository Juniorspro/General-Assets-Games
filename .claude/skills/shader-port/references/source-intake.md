# Source Intake

Classify the source before deciding how to port it.

## Intake Checklist

- source type: `Shadertoy`, standalone `GLSL`, `WGSL`, engine snippet, or multipass demo
- stage model: fragment-only, material shader, fullscreen post, multipass post, feedback chain, or compute/storage-driven pipeline
- pass count and dependencies
- required inputs: time, mouse, textures, depth, normals, audio, history, scene color, motion, storage buffers, storage textures
- coordinate assumptions: `fragCoord`, UV, NDC, camera rays
- precision and platform assumptions: derivatives, GLSL version, sampler types, atomics, subgroup behavior, workgroup behavior
- signature modules: shape, lighting, post, temporal feedback

## Multipass Rule

If the source uses multiple buffers or ping-pong passes, document the pass topology before touching code. Many failed ports come from skipping that step.

## Source Contract Rule

Before implementation, produce one compact contract with:

- authoritative source artifact
- pass list
- required resources
- coordinate model
- preferred authoring route
- expected blockers

If the authoritative artifact is incomplete, do not silently invent the missing buffers or textures.

## Hard Blocker Checks

Call out a blocker immediately when any of these is true:

- one or more critical source passes are missing
- the effect relies on compute or storage behavior but the target requires WebGL2 parity
- the shader depends on external engine state that is not available in Three.js without larger architecture work
- the target asks for a WebGPU raw-material route that current official Three.js docs do not support

## Minimum Output

Before implementation, produce:

- module list
- pass list
- required resources
- preferred Three.js landing path
- blocker list if non-empty
