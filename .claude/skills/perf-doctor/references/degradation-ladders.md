# Degradation Ladders

Degrade in layers, not by random feature cuts.

## Ladder Design

Start by naming the look invariants that must survive. Then lower cost in a predictable order.

## Typical Ladder

| Tier | Typical changes | Preserved |
| --- | --- | --- |
| Premium | full DPR, full post chain, highest shadow quality, highest shader or sample counts | full intended look |
| Balanced | lower DPR or post resolution, fewer blur taps, fewer history taps, smaller selective effect sets | silhouette, primary lighting read, key material identity |
| Safe | simpler shadows or frozen shadow updates, lower particle counts, fewer transparent layers, shorter raymarch or volumetric steps, reduced raycast frequency | core composition, motion read, dominant lighting |
| Minimum | minimal post, static lighting simplifications, lower DPR, simpler material path or LODs, interaction shortcuts while moving | basic legibility and the main interaction loop |

## Rules

- Drop expensive polish before cutting the effect's signature module.
- Downsample fullscreen passes before rewriting the scene.
- Cut selective effects before the base beauty pass.
- Prefer stable tier switches over many tiny hidden toggles.
- On R3F or Drei stacks, temporary motion-time regressions can lower DPR or disable event-heavy systems before the app settles back to a higher tier.
- State clearly when a fallback is no longer fidelity-preserving.
