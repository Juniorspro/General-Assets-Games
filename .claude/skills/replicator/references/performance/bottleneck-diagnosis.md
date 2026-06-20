# Bottleneck Diagnosis

Classify the first dominant bottleneck. Do not list every possible issue unless the first one is truly unknown.

## `fill-rate`

Likely when:

- the effect is full-screen heavy
- lots of translucent layers overlap
- DPR changes strongly affect frame time

Typical fixes:

- lower DPR
- reduce overdraw
- shrink expensive post passes

## `ray-steps`

Likely when:

- raymarch or volume loops dominate the effect
- reducing step count changes frame time immediately

Typical fixes:

- reduce max steps
- tighten max distance
- simplify shadow or AO loops

## `particle-count`

Likely when:

- the scene scales poorly with particle or instance count
- density is the first knob that changes frame time

Typical fixes:

- lower count
- reduce spawn rate
- reduce simulation resolution or lifetime

## `bandwidth`

Likely when:

- many large intermediate buffers or texture reads dominate
- history buffers, MRT, or high-resolution passes create heavy memory traffic

Typical fixes:

- lower internal resolution
- shrink buffer formats or pass count
- reduce feedback or history usage

Memory and VRAM signs:

- render targets or history buffers dominate allocation count
- texture resolution changes affect stability as much as frame time
- the scene fails only on lower-memory devices or after warmup

WebGPU-specific signs:

- storage-buffer or storage-texture traffic scales poorly with entity count
- multiple large read/write resources are touched every frame
- the effect gets slower mainly as buffer size grows, even before shading complexity changes

## `post-chain`

Likely when:

- the base scene is cheap but bloom, blur, aberration, or grain are expensive

Typical fixes:

- reduce post resolution
- shorten the pass chain
- disable secondary polish before touching primary lookdev

## `cpu-driver`

Likely when:

- per-frame JS work, object churn, or many draw calls dominate
- GPU simplifications do not move the needle enough

Typical fixes:

- reduce scene churn
- batch or instance
- simplify event, GUI, or per-frame bookkeeping

Common clues:

- `renderer.info` reports modest GPU work but frame time is still high
- turning off post or lowering DPR does not help enough
- startup hitches or per-frame allocations dominate the user-visible slowdown

## `unknown`

Use only when measurement is missing or the shape of the problem is still ambiguous.

If you choose `unknown`, state what evidence would resolve it.
