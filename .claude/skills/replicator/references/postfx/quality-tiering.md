# PostFX Quality Tiering

Degrade the post stack in the order that least harms the look.

## Preferred order

1. Lower post resolution
2. Reduce blur radius or iteration count
3. Shorten secondary polish passes
4. Disable low-value finishing effects
5. Remove core signature effects only as a last step

## Safe exposed controls

Usually safe:

- bloom strength
- bloom threshold
- bloom radius within a limited range
- grain amount
- vignette amount
- chromatic aberration amount within a narrow range
- feedback decay when the effect is designed for it

## Usually hidden controls

Usually keep internal:

- history buffer topology changes
- aggressive pass count changes
- destructive resolution drops
- debug-only compositing views

## Rough effect cost table

Use this only as ordering guidance, not as a substitute for measurement.

| Effect type | Typical relative cost | First safe degradation |
| --- | --- | --- |
| vignette, color grade, simple output transform | low | keep unless the chain is already too long |
| grain, light chromatic aberration | low to medium | reduce amount before removing |
| bloom with modest radius | medium | lower post resolution or radius |
| heavy blur or multi-iteration bloom | medium to high | cut iterations or radius first |
| feedback, accumulation, or history blur | high | lower history resolution or persistence |
| selective compositing with masks | medium to high | reduce mask resolution or secondary passes |

## Rule

Expose only the controls that preserve the intended visual language across their normal range.
