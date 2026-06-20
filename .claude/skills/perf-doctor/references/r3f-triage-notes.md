# R3F Triage Notes

Use this note when the route includes `@react-three/fiber` and the problem might be React work, event churn, or object recreation rather than raw renderer cost.

## First Questions

- Is the route `frameloop="always"` or demand-driven?
- Does pointer movement trigger `setState`, selection sync, or inspector updates?
- Are geometry, materials, vectors, or effects recreated during React renders?
- Is raycasting running against more objects than the interaction actually needs?

Do not call the issue GPU-bound until these questions are checked.

## Fast Probes

Run the smallest probes that separate React churn from render cost:

- disable pointer handlers and repeat the repro
- keep pointer handlers on but stop writing to React state from the hot path
- disable the post stack only after event and state probes have been tried
- reduce the raycast set to the active editing context
- compare `frameloop="always"` against demand-driven invalidation where the route allows it

## Hot Path Smells

These are common R3F-side regression patterns:

- `setState` inside `useFrame`
- `setState` inside high-frequency pointer handlers
- recreating materials, geometry, vectors, or effect configs in render
- broad raycasts on every move event
- canvas state and inspector state sharing one eager React update path

## Suggested First Fixes

- move hover and transient interaction state into refs or a small mutable store
- batch or defer inspector synchronization
- narrow the raycast set before reducing visual quality
- reuse render objects instead of recreating them during commits

## What To Record

- whether idle rendering is already close to budget
- whether pointer handlers collapse the spike when disabled
- whether React commits dominate the flame chart during the hitch
- whether a narrower raycast set changes spike height

## Canonical Example

See [../fixtures/react-churn-r3f/README.md](../fixtures/react-churn-r3f/README.md) for a `partially-diagnosed` case that separates `React churn` from `raycasting / interaction` without pretending full certainty.
