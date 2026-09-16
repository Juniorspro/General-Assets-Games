# Game Feel — Juice & Polish Recipes

Recipes that turn a correct game into one that feels alive. Route here for any
action/arcade brief, and for any game that plays correctly but feels flat.
Pick the 3-5 that fit the mechanic — juice serves readability; more is not
better. All recipes assume the genre-guide architecture: state in refs/classes,
`dt` in seconds, drawing separate from simulation.

## The feedback stack

Every player-meaningful event pairs at least one VISUAL and one AUDIBLE cue;
haptics are an enhancement on top (see `interactions/vibration.md`). Silence +
stillness on a core action is the single most common "feels dead" bug.

| Event | Visual | Audio | Haptic |
|---|---|---|---|
| action fires (jump/shoot/place) | squash/recoil, muzzle flash | short SFX | — |
| collect / score | pickup flies to HUD, count-up, sparkle burst | bright SFX | light |
| hit / damage taken | flash white, knockback, shake, hit-stop | thud SFX | medium |
| death / fail | big shake, slow-mo or freeze, desaturate | heavy SFX | heavy |
| level-up / milestone | full-screen pulse, banner slide-in | fanfare | heavy |
| UI press | pressed state ≤100ms | click SFX | light |

## Screen shake (trauma model)

Add trauma on events, decay it, shake by trauma² — small hits feel small, big
hits feel big, and shake never accumulates into nausea:

```ts
// in GameState: trauma = 0
addTrauma(amount: number) { this.trauma = Math.min(1, this.trauma + amount) } // hit .3, death .6
// in update():
state.trauma = Math.max(0, state.trauma - 1.5 * dt)
// in render(), around world drawing (2D):
const shake = state.trauma * state.trauma * 12 // max offset px
ctx.save()
ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
/* draw world */
ctx.restore()
```

3D: add the same random offset to the camera position AFTER gameplay camera
logic each frame (offset a wrapper `THREE.Group` holding the camera, or add
and subtract around `renderer.render`) — never accumulate it into the real
camera position.

## Hit-stop (freeze frames)

A 60-100ms pause on heavy impacts makes hits read as weighty. Freeze the
simulation, keep rendering:

```ts
// in GameState: freeze = 0
// on heavy hit: state.freeze = 0.08
// first line of update():
if (state.freeze > 0) { state.freeze -= dt; return }
```

## Tween mini-kit

For pops, pickups flying to the HUD, and UI slides. Thirty lines, no library:

```ts
type Tween = { obj: Record<string, number>; prop: string; from: number; to: number; t: number; dur: number; ease: (x: number) => number; done?: () => void }
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
export const easeOutBack = (x: number) => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2)
const tweens: Tween[] = []
export function tween(obj: Tween['obj'], prop: string, to: number, dur: number, ease = easeOutCubic, done?: () => void) {
  tweens.push({ obj, prop, from: obj[prop], to, t: 0, dur, ease, done })
}
export function updateTweens(dt: number) { // call once per frame in update()
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]
    tw.t = Math.min(tw.t + dt / tw.dur, 1)
    tw.obj[tw.prop] = tw.from + (tw.to - tw.from) * tw.ease(tw.t)
    if (tw.t >= 1) { tweens.splice(i, 1); tw.done?.() }
  }
}
```

`easeOutBack` (overshoot) for spawns/pops; `easeOutCubic` for almost everything
else. Linear motion is for conveyor belts, not feedback.

## Particles (2D pooled)

```ts
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }
const particles: Particle[] = []
export function burst(x: number, y: number, color: string, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 180
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, maxLife: 0.5, color, size: 2 + Math.random() * 3 })
  }
}
export function updateParticles(dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt
    if (p.life <= 0) particles.splice(i, 1)
  }
}
export function drawParticles(ctx: CanvasRenderingContext2D) {
  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
  }
  ctx.globalAlpha = 1
}
```

3D: one `THREE.InstancedMesh` of a small quad/sphere, same pool logic, scale
toward zero over life. Cap totals (~200) — particles are garnish, not load.

## Floating text & score count-up

World-space floating text ("+10", "PERFECT") lives in the game state: spawn at
the event position with `vy = -40`, fade over 0.7s, draw last. HUD score never
snaps — keep `displayScore` chasing `score` and render the rounded value:

```ts
state.displayScore += (state.score - state.displayScore) * Math.min(1, dt * 8)
```

## Flash & knockback

- Flash: on hit set `entity.flash = 0.12`; while positive, draw the sprite
  tinted (2D: redraw with `ctx.globalCompositeOperation = 'lighter'` or a white
  overlay rect; 3D: temporarily swap `material.emissive` up).
- Knockback: apply a velocity impulse away from the impact
  (`vx += dir.x * 260`), never teleport position — physics resolves the rest.

## Screens & transitions

Phase flow `title → playing → gameover` lives in game state; React renders the
overlay for the CURRENT phase on top of the (always mounted) canvas.

- **Title**: game name in large type over live, idling gameplay visuals
  (drifting background, bobbing hero — the scene must move). One tap starts.
  This screen IS the cover: the platform captures it ~1.2s after load, 430×870.
- **Game over**: score + best (`localStorage`, key prefixed with the game name
  — the platform origin is shared) + one-tap restart that resets state in
  place. Restart must take under 2 seconds, never a page reload.
- **Transitions**: 200-300ms fade/slide between phases (tween an overlay's
  opacity); hard cuts read as glitches.

## Controls feel

The difference between "responds" and "feels good" is a few tolerance windows
(all tunables — put them in `config.ts`):

- **Input buffer (~0.1s)**: a press slightly BEFORE it becomes valid still
  counts. Record `pressedAt`; when the action becomes possible, fire if
  `elapsed - pressedAt < 0.1`.
- **Coyote time (~0.08s, platformers)**: jumping a few frames after leaving a
  ledge still works. Track `lastGroundedAt`; allow jump if
  `elapsed - lastGroundedAt < 0.08`.
- **Acceleration, not velocity snapping**:
  `v += (target - v) * Math.min(1, dt * 10)` — instant on/off reads as robotic.
- **Dead zone 0.15** for joystick/tilt input; below it, treat as zero.
- **Tap vs hold**: release under 0.2s = tap; longer = hold. Never bind both to
  the same threshold-less handler.

## Difficulty pacing

- Ramp by elapsed time or score, never frame count:
  `spawnInterval = Math.max(floor, base * Math.pow(0.92, minutesElapsed))`.
- The first 10 seconds teach by doing: slow spawns, no fail pressure, the core
  verb succeeds immediately. No text tutorials.
- Near-miss rewards (graze bonus, "close call!" flash) make difficulty feel
  exciting rather than unfair.
- On death, show progress against best — "beat your best" is the cheapest
  retention loop a small game has.

## Audio pairing

`src/engine/audio.ts` handles unlock/BGM/SFX. Design rules:

- Every core action in the feedback-stack table has an SFX key; generate them
  per `patterns/asset-pipeline.md` (SFX ≤2s, BGM 30-60s seamless loop).
- BGM volume 0.35-0.45 so SFX read on top; provide a mute toggle in the HUD
  (`audio.setMuted`).
- Pitch-vary repetitive SFX slightly (`audio.playSfx('hit', { rate: 0.9 + Math.random() * 0.2 })`)
  so rapid repeats don't grate.

## Polish checklist

Run before calling a NEW game done (SKILL.md's definition of done includes this):

1. Every core action produces visible AND audible feedback within 100ms.
2. Something on screen is always in motion — title and gameover included.
3. Death/fail explains itself (shake + freeze/slow-mo + SFX), never a silent reset.
4. Restart loop ≤ 2s, no page refresh.
5. Difficulty visibly ramps within the first minute.
6. The title screen works as the game's poster (it becomes the cover image).
