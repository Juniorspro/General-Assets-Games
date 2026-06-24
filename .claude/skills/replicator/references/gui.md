# GUI Conventions

## Table of Contents

1. Keep the GUI useful
2. Use stable groups
3. Choose domain-specific controls

## Keep the GUI useful

Expose the controls that help align the look or isolate artifacts. Do not dump every uniform into the GUI.

Favor:

- Parameters that change the look in an obvious way
- Parameters that help separate correctness issues from polish issues
- Parameters that are likely to be revisited while matching a reference

Mirror the GUI defaults in `REPORT.md`.

## Recommended ranges

Use these as default starting ranges unless the effect clearly needs a tighter or wider contract.

| Control | Recommended default | Recommended range | Notes |
| --- | --- | --- | --- |
| `dpr` | `min(devicePixelRatio, 2)` | `0.5-2.0` | Expose in coarse steps when it is a performance lever |
| `exposure` | `1.0` | `0.2-2.4` | Keep broad enough for tone-mapping alignment, not look destruction |
| `speed` | `1.0` | `0.0-5.0` | Default to `0-3` if the motion language is subtle |
| `timeScale` | `1.0` | `0.0-2.0` | Use when time control is separate from stylistic speed |
| `bloomStrength` | `0.3-0.8` | `0.0-2.0` | Clamp tighter for restrained scenes |
| `bloomThreshold` | `0.6-0.9` | `0.0-1.0` | Avoid exposing values that make everything glow by default |
| `bloomRadius` | `0.1-0.4` | `0.0-1.0` | Keep narrow when the effect should stay crisp |
| `contrast` | `0.5-1.0` | `0.0-2.0` | Prefer smaller ranges for physically grounded looks |
| `fogDensity` | effect-specific | `0.0-0.2` | Go wider only when fog is the hero |
| `grain` | `0.0-0.08` | `0.0-0.2` | Small ranges preserve readability |
| `decay` | `0.9-0.99` | `0.0-1.0` | Feedback effects often need tighter practical ranges |
| `mix` | `0.5` | `0.0-1.0` | Good for history blend and composite controls |

## Use stable groups

Always include these groups unless the effect is too simple to justify them.

### Renderer

Use for:

- `dpr`
- `exposure`
- `pause`
- `timeScale`
- AA or quality toggles when present

### Post

Use for:

- `bloomStrength`
- `bloomRadius`
- `bloomThreshold`
- output blend or mix controls

### Style

Use for:

- palette controls
- fog density
- vignette
- contrast
- grain
- glow or edge tint

### Animation

Use for:

- speed
- phase
- drag or inertia
- autoplay or reset actions

## Choose domain-specific controls

Add focused groups for the effect class.

### Raymarch

Expose:

- `maxSteps`
- `epsilon`
- `maxDistance`
- `shadowSoftness`
- `fogDensity`

### Noise

Expose:

- `frequency`
- `amplitude`
- `octaves`
- `lacunarity`
- `gain`

### Particles

Expose:

- `count`
- `spawnRate`
- `lifetime`
- `drag`
- `fieldStrength`

### Feedback

Expose:

- `decay`
- `mix`
- `blur`
- `persistence`

Keep group names and parameter names stable unless there is a strong reason to rename them. Stable naming makes the report, screenshots, and future tuning sessions easier to compare.
