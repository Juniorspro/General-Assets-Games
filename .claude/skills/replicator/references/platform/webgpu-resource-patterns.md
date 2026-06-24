# WebGPU Resource Patterns

## `uniforms`

Use for:

- time
- camera values
- palette controls
- small global parameter sets

Default choice for lightweight control data.

## `instanced-attributes`

Use for:

- many renderable objects with compact per-instance data
- cases where the state is generated on CPU or changes predictably

Good fit before moving to heavier GPU-state models.

## `sampled-textures`

Use for:

- noise atlases
- lookup tables
- precomputed fields
- render outputs consumed in later passes

## `render-target-history`

Use for:

- ping-pong buffers
- frame feedback
- trails
- image-like simulations

This is often the cleanest first step for persistent state.

## `storage-buffer`

Use for:

- large structured mutable state
- many entities that need random access or indexed updates
- cases where image-space encoding becomes awkward

This usually implies a real `WebGPU` requirement.
It often pairs with `compute-plus-render`.

## `storage-texture`

Use for:

- writable image grids
- explicit GPU image updates that do not fit normal render-target flow

Do not choose it when ordinary render targets already solve the problem.
This can also imply `compute-plus-render` when writes are not naturally driven by a draw pass.

## Rule of Thumb

Escalate in this order:

`uniforms` -> `instanced-attributes` -> `sampled-textures` -> `render-target-history` -> `storage-buffer` or `storage-texture`
