# Render-Target Patterns

Choose the simplest layout that supports the look.

## `backbuffer-only`

Use when:

- the effect is minimal
- no extra compositing or feedback is required

## `single-intermediate`

Use when:

- one offscreen scene render feeds a short post chain
- the chain is ordinary bloom or grading work

This is the default for many scene-polish pipelines.

## `ping-pong-history`

Use when:

- the current frame depends on one or more previous frames
- temporal persistence or recursive post is core to the look

Typical examples:

- trails
- smears
- feedback distortion

## `multi-target`

Use when:

- the pipeline needs several simultaneous outputs or clearly separated intermediate data
- one intermediate target becomes awkward or too lossy

Do not choose this by default. It adds complexity quickly.

Typical examples:

- G-buffer style material, normal, or depth separation
- deferred or lighting-heavy experiments
- cases where one pass needs to feed several later passes without repacking everything

## `selective-mask-chain`

Use when:

- only part of the scene should receive the effect
- masking and recompositing matter more than raw pass count

Typical examples:

- selective bloom
- masked blur
- glow or outline on tagged objects

## Rule

Only upgrade the layout when the simpler option cannot express the look cleanly.

## Pass-to-pass data rules

Keep the handoff between passes explicit:

- texture outputs should have stable names and one declared owner pass
- uniforms should carry cheap scalar controls, not large transient image data
- use buffers only when the data is structured and reused across passes
- document which pass produces history, masks, or auxiliary targets before wiring the next pass

If a pass graph cannot be explained as `inputs -> outputs -> next consumer`, the layout is probably too complicated.
