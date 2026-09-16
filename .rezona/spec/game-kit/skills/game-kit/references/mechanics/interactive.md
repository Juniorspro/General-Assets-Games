# Interactive Content Contract

This file defines the `interactive_*` content type. It should constrain lifecycle
and responsiveness, not prescribe story, art direction, progression, or
interaction style. Platform constraints live in `contracts/global.md`.

## Lifecycle

An `interactive_*` experience stays live. It does not force an end state,
game-over, retry loop, or lockout unless the user's brief explicitly asks for
game mechanics.

Model lifecycle as staying in the "active" state for the whole session. Do not
introduce an "ended" state as the normal interactive lifecycle.

## Responsiveness

- First frame: the experience is already usable or visibly alive.
- Input: each supported input path gives immediate visible or audible feedback.
- Boundaries: do not let valid input become silent or stuck.
- Device APIs: every device-only interaction has a touch, mouse, or keyboard
  fallback.

## State Rules

- Scoring, counters, failure, milestones, and restart controls are not required.
- If the brief includes game mechanics, keep those mechanics intentional; do not
  add them by default.

## Anti-Patterns

- Forced end states, lockouts, or mandatory restart loops.
- Mandatory tutorials or intro screens before the surface is responsive.
- Supported input paths with no feedback.
- Treating an "ended" state as the normal lifecycle for interactive content.
