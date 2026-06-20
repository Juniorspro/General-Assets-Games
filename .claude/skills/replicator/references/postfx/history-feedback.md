# History and Feedback

Be explicit about whether temporal state is real or optional.

## `none`

Use when:

- the look is frame-local
- previous frames are not needed

## `optional`

Use when:

- feedback can enrich the effect
- the main look still survives without it

This is a good choice when you want a graceful downgrade path.

## `required`

Use when:

- the signature look breaks without temporal persistence
- trails, recursive distortion, accumulation, or decay are core visual features

Typical examples:

- temporal smear
- reaction-diffusion style accumulation
- persistence trails
- echo-style feedback

## Rule

If history changes the whole character of the look, mark it `required` and say what the fallback loses.
