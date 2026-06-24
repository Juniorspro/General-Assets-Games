# Post Chain Selection

Start by deciding whether the look truly belongs in post.

## `none`

Use when:

- the signature look is already in the base shading
- post would only hide missing material or lighting work

## `scene-polish`

Use when:

- the base scene already carries the look
- post is only finishing polish

Typical examples:

- bloom
- grading
- vignette
- grain

## `selective-post`

Use when:

- only some objects or layers should receive an effect
- the scene needs masking or compositing rules

Typical examples:

- selective bloom
- UI or emissive-only glow
- masked distortion or outline

## `feedback-post`

Use when:

- the post stack depends on previous frames
- trails, persistence, smear, or recursive distortion are part of the look

## `fullscreen-stack`

Use when:

- the output is effectively a full-screen procedural image
- several passes are still needed for shaping or polish

## Rule

If the base render is still wrong, fix that before adding a bigger post chain.
