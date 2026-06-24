# Device Targets

Set the performance contract before recommending tradeoffs.

## Default Classes

| Device class | Typical use | Default stance |
| --- | --- | --- |
| `desktop-high` | controlled demos, modern discrete GPUs | preserve premium look first |
| `laptop-balanced` | common notebooks and integrated GPUs | balance fidelity and sustained frame time |
| `mobile-safe` | phones and low-power tablets | simplify aggressively and keep thermal headroom |

## Budget Framing

Record at least:

- target frame rate
- target frame budget in milliseconds
- render resolution or DPR target
- non-negotiable visual invariants

## Practical Defaults

| Device class | Default target | Useful starting assumptions |
| --- | --- | --- |
| `desktop-high` | `60 FPS` unless the app explicitly targets high refresh | native canvas size can be acceptable, but still measure shadow and post costs instead of assuming headroom |
| `laptop-balanced` | `60 FPS` at a stable `16.7 ms` frame budget | clamp DPR before chasing deeper rewrites; this is the safest default when the user gives no hardware target |
| `mobile-safe` | `30-60 FPS` depending on interaction criticality | keep DPR conservative, avoid always-on heavy post, prefer static or cheaper shadow strategies |

If the app uses `@react-three/fiber`, also record the `Canvas` `dpr` policy and whether the render loop is `always` or `demand`.

## Contract Rule

If the user does not specify a target, default to `laptop-balanced`. That keeps recommendations honest without overfitting to premium hardware.
