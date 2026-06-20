# Fidelity Rubric

Use this rubric before calling a replication done.

Score each category from `0` to `2`.

## Scoring

- `0`: clearly wrong or missing
- `1`: recognizable but materially off
- `2`: convincingly matches the reference

## Categories

### Silhouette

Check:

- overall shape language
- edge character
- scale relationships

### Motion

Check:

- speed and timing
- rhythm and looping behavior
- whether motion feels field-driven, inertial, or reactive in the right way

### Density

Check:

- amount of visual information
- spacing of particles, layers, or features
- how full or sparse the frame feels

### Palette

Check:

- main hues
- contrast structure
- value range and highlight behavior

### Finish

Check:

- bloom and glow character
- vignette, grain, aberration, fog, or polish passes
- whether the final image has the same level of finish as the reference

## Acceptance Target

Default acceptance target:

- `8/10` or better overall
- no `0` score in a category that is central to the effect

If the score is lower:

- record the gap explicitly
- do not describe the effect as fully matched

## Review Artifact Guidance

Choose the review medium that actually represents the effect:

- Use still pairs when composition, silhouette, palette, or finish are the main questions.
- Use short clips, GIFs, or keyframe sequences when motion or camera choreography is central.
- Use concise notes in the report when interaction behavior matters and files alone are not enough.

Common file-based patterns under `review-artifacts/`:

- still pair: `reference-01.png`, `current-01.png`
- motion pair: `reference-motion.webm`, `current-motion.webm`
- keyframe set: `reference-keyframe-a.png`, `current-keyframe-a.png`

Use the same moments, camera angles, or interaction state when possible.
Do not score `Motion` from a single still unless the motion question is truly irrelevant for the task.
