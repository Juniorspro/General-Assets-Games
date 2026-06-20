# Degradation Playbook

Reduce quality in the order that least harms the signature look.

## Common ladder

1. Lower DPR or internal render scale
2. Reduce secondary post quality
3. Reduce simulation or field resolution
4. Reduce effect density such as particles, samples, or octaves
5. Simplify lighting or atmosphere details
6. Remove whole visual layers only as a last step

## Raymarch and volume effects

Preferred order:

1. lower DPR
2. reduce max steps
3. reduce shadow or AO step counts
4. reduce secondary fog or glow polish

Do not flatten the core silhouette first.

## Particle or simulation effects

Preferred order:

1. reduce count or simulation resolution
2. reduce trail length or persistence
3. simplify secondary post
4. reduce per-particle shading detail

Do not immediately remove motion character if density alone can solve the issue.

## Post-heavy scenes

Preferred order:

1. reduce post resolution
2. shorten the chain
3. reduce sample radius or iteration count
4. disable low-value polish effects

## Rule

Expose only the first few safe steps in the GUI.

Keep more destructive steps internal unless the user is explicitly debugging or benchmarking.

## Adaptive quality

Use runtime adaptation only when:

- the effect is deployed to a wide hardware range
- a static contract would either look too weak on good hardware or fail too often on weaker hardware
- the adaptation can move one or two safe levers without changing the visual language too abruptly

Prefer this order for automatic adjustments:

1. internal render scale or DPR
2. post resolution or iteration count
3. sample count, step count, or simulation resolution

Guardrails:

- do not oscillate every frame; debounce changes over a short window
- do not auto-toggle many unrelated switches at once
- keep the minimum quality floor explicit in the report
