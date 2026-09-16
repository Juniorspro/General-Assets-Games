---
name: gen-sprite-animation
description: "Method contract for animated sprite sheets on this platform: how to prompt the media image tool into a uniform cols×rows grid spritesheet of ONE motion, the background decision (set transparent:true and let the platform matte it out to real alpha — no manual solid-color dance), the numeric gate that rejects duplicate frames and drawn cell seams before registration, and the sprite-metadata + drawImage source-rect slicing contract the rebuilt game template uses (including the static-image degrade when generation fails). Triggers: generate sprite animation / 生成精灵动画 / generate walk cycle / generate attack animation / spritesheet / 帧动画 / animation frames / sprite frames."
---

# gen-sprite-animation

The game template has no sprite runtime — your game code owns both the asset registration and the grid-slicing metadata (the canonical `drawFrame` helper lives in the game-kit skill's `references/genres/2d.md`). What game code cannot do is make the generator produce a *usable* sheet — that is this skill: the prompt contract, the background decision, the numeric gate, and the registration.

## Iron rule: one sheet = one motion

**Every sheet encodes ONE motion.** All N = cols × rows cells show the SAME subject from the SAME camera angle performing the SAME action, captured at N consecutive moments. A 3×3 walk cycle is 9 phases of *the same walk* in *the same direction*. It is **NOT**:

- ❌ 3 frames of walking-right + 3 of walking-left + 3 of walking-up
- ❌ 3 frames of idle + 3 of walk + 3 of attack
- ❌ 3 different characters, 3 poses each

A game that needs a walk cycle AND an attack cycle gets **two sheets** (`hero_walk` + `hero_attack`), each with its own `ASSETS` key and sprite-metadata entry — the game code switches keys on state change. A mixed-motion sheet will mis-render no matter how it is registered.

## Why the frame count is fixed at 3×3 = 9

`drawFrame` slices with `sourceX = (i % cols) * (W / cols)` and `sourceY = floor(i / cols) * (H / rows)` — it assumes exactly cols × rows equal divisions, always. Draw fewer subjects than cells and the extra cells flash empty; draw more and two drawings get crammed into one slice. 3×3 = 9 is the platform's native convention: keep it. A different grid is allowed but you must then substitute the numbers everywhere — in the prompt, in the `SPRITES` entry, and in the checker's `--cols` / `--rows`.

## Method

### 1. Augment the prompt

Wrap the motion prompt with this grid contract before submitting. Image models honor explicit NEGATIVE constraints ("no two frames identical") far more reliably than positive descriptions ("frames change"), which is why the forbidden outcomes are spelled out rather than implied:

```
<motion prompt: ONE subject + ONE action + ONE camera angle + style anchor>

Arrange as a uniform 3x3 grid spritesheet (9 cells total), read row-major
(left-to-right, then top-to-bottom). Exactly 9 drawings, no more, no fewer.

CONSTANT across all 9 cells: the same character (same identity, proportions,
palette), the same camera angle, the same facing direction, the same scale and
placement inside the cell.

CHANGING across the 9 cells: the pose only — limb positions, body tilt, wing or
tail angle — advancing in small increments so cells 1→9 read as one continuous
motion cycle that loops back from 9 to 1.

All 9 cells must be visually distinguishable at a glance. No two cells may hold
the same pose, a mirrored copy of the same pose, or a near-identical pose.
Repeating a pose is a failure of the sheet: the runtime flips these frames at
~10fps, so a repeated pose reads to the player as the animation freezing or
stuttering, which is worse than one honest static image. If the action cannot
yield 9 clearly different poses, split the cycle into 3 phases with 3
sub-positions each rather than duplicating a pose.

Equal-size cells arranged edge-to-edge. Do NOT draw grid lines, borders,
dividers, or frames between cells — leave a generous EMPTY margin around the
subject inside each cell instead. No text labels, no cell numbers.
Transparent background (see step 2).
```

`pixel-art knight walking cycle, side view facing right, 16-bit retro` ✓ — `pixel-art knight in all 4 directions plus attack frames` ✗ (violates the iron rule).

Note what the contract does NOT say: it never forbids "different poses". Different poses across cells are the entire point — what must stay identical is the subject, the angle, and the framing. A prompt that bans pose variation while asking for an animation is self-contradictory, and the model resolves that contradiction by drawing the same cell nine times.

### 2. Background — let the platform matte it out

Sprites composite over the game scene, so they need a transparent background. The platform already owns matting — do NOT hand-roll the "pick a solid color and cut it out yourself" dance:

- Pass **`transparent: true`** to `submit_image_generation`. The platform generates on a solid key color and mattes it out to real alpha for you; the output is always PNG.
- Do not describe a specific background color in the prompt and do not try to verify/strip alpha yourself — that is the platform's job.
- Leave `transparent` unset (opaque) only for full-scene backgrounds, never for sprite sheets.

### 3. Generate

```
mcp__media__submit_image_generation
  prompt:      <augmented prompt from step 1>
  name:        "<key>"                    → lands at current/src/assets/<key>.png
  output_format: "png"
  transparent: true                       → platform mattes the background to real alpha
```

**On grid reference images:** a pre-made N-cell grid image passed via `source_urls` (image-to-image) can anchor the cols × rows layout, but two things make it a poor first resort here. `source_urls` accepts http(s) URLs only — the platform fetches them server-side, so a local file cannot be used — and a reference whose cell seams are *drawn* teaches the model to draw them too, which is the box-around-every-cell failure. No such hosted asset exists on this platform today, so rely on the wording from step 1 and the gate in step 4.

Poll with `mcp__media__check_generation_tasks` until ready.

### 4. Gate the sheet numerically — before registering

Two failures ruin an animation while looking unremarkable in a preview: nine near-identical poses (the flipbook looks frozen), and thin seam lines the slicer bakes into every cell as a box around the sprite. Do not eyeball these — measure them:

```
/app/.venv/bin/python3 /opt/agent_plugins/game-kit/scripts/check_spritesheet.py \
  --sheet <ws>/current/src/assets/<key>.png --cols 3 --rows 3 --fix-seams \
  --contact-sheet /tmp/<key>_cells.png
```

Exit `0` = pass, exit `2` = fail. The JSON names every offending cell and pair, and reports per-pair silhouette IoU, ink-region difference, and hash distance so a borderline sheet can be judged from numbers instead of impressions. Then `Read` the contact sheet — one labeled tile per cell — for the failures no metric catches: mixed directions, mixed actions, the wrong subject.

**Always pass `--fix-seams`.** Despite the wording in step 1, the model still paints dividers onto the cell boundaries a large fraction of the time (measured: 7 of 18 sheets on one real game). A divider is not a re-roll-worthy defect — it is a few pixels sitting on a line whose position is known exactly, so the gate erases it and rewrites the sheet in place, then re-measures. `seams_repaired: true` in the JSON means it happened; `seam_lines` lists anything that survived, which does need a re-roll. Do not hand-roll your own Pillow cleanup — this is the tested path.

- **Never register a sheet that exits 2.** Re-roll with the failing symptom's fix from the table below.
- **Budget two re-rolls.** If the third generation still fails, stop paying for rolls and take the sanctioned degrade in step 5 — a clean static image beats a frozen animation.
- Generate the rest of the game's sheets only after the first one has passed.
- **A repaired sheet only reaches the player after a rebuild and a new saved version.** The preview serves the last saved version, so a fix that stops at `current/` is invisible — build, then save a version.

### 5. Register (the contract the rebuilt template uses)

The template has no sprite runtime — your game code owns both the asset entry
and the slicing metadata. Register the file in `current/src/assets.ts`:

```ts
import heroWalk from './assets/hero_walk.png'
ASSETS.hero_walk = heroWalk
```

Then keep sheet metadata next to your game code (e.g. `src/game/config.ts`):

```ts
export const SPRITES = {
  hero_walk: { cols: 3, rows: 3, frames: 9, fps: 10 },
} as const
```

and draw one frame with a source-rect `drawImage` (the canonical `drawFrame`
helper — same shape as game-kit `references/genres/2d.md` Layer 4):

```ts
function drawFrame(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  meta: { cols: number; rows: number; frames: number },
  frame: number, x: number, y: number, w: number, h: number,
) {
  const i = frame % meta.frames
  const fw = img.naturalWidth / meta.cols
  const fh = img.naturalHeight / meta.rows
  ctx.drawImage(img, (i % meta.cols) * fw, Math.floor(i / meta.cols) * fh, fw, fh, x, y, w, h)
}
```

- The `SPRITES` key MUST equal the `ASSETS` key — game code looks both up by the same name.
- **Degrade honestly:** if the sheet cannot pass the gate and the user accepts a static image, draw the whole image (`ctx.drawImage(img, x, y, w, h)`) and delete the `SPRITES` entry — never slice a sheet that is not a clean uniform grid.

## Quality gate — what the numbers catch, what only the eye catches

`check_spritesheet.py` catches duplicate poses, blank cells, drawn seams, and a sheet whose dimensions do not divide evenly into the grid. It cannot tell that the model packed 3 directions instead of 9 phases of one walk, or drew the wrong character — that is what the contact sheet `Read` is for. The `SPRITES` entry catches nothing at all: it describes what the sheet *claims* to be.

| Symptom | Signal | Fix |
|---|---|---|
| two or more cells hold the same pose | `duplicate_pairs` non-empty; high `silhouette_iou`, low `ink_mean_abs_diff` | re-roll reinforcing that every frame must differ at a glance and that a repeated pose reads as a freeze |
| visible box framing each cell | `seam_lines` non-empty — each entry gives the axis, pixel position and how much of that row/column is inked | `--fix-seams` erases them and rewrites the sheet; only re-roll if `seam_lines` is still non-empty afterwards (the divider was wider than the erase band) |
| a frame drawn *inside* each cell, off the seams | `border_ink_ratio` high on most cells | not repairable by erasing a line — re-roll with the "no drawn lines, empty margin" wording |
| some cells empty | `blank: true` cells | re-roll restating "exactly 9 drawings, no more, no fewer" |
| sheet does not divide into the grid | `does not divide evenly` failure | regenerate at a size that is a multiple of cols × rows |
| sheet has no alpha | `alpha_present: false` warning | matting did not run — confirm `transparent: true` was passed, then re-roll |
| mixed directions / actions in one sheet | contact sheet only | rewrite the prompt to ONE action; two motions = two sheets |
| unusable as animation, fine as a static | contact sheet only | draw it whole and delete the `SPRITES` entry (the sanctioned degrade) |

## Boundaries

This skill **must not**:

- Encode more than one motion per sheet.
- Tell the model not to vary poses — the sheet exists to vary poses; only subject, angle, and framing are held constant.
- Ask the model to draw grid lines, borders, dividers, or frames between cells (they get sliced into every cell as a box around the sprite).
- Hand-roll background matting instead of passing `transparent: true` — the platform owns matting.
- Register a sheet that has not passed `check_spritesheet.py`, or keep a `SPRITES` slicing entry for a sheet that is not a clean uniform grid.
- Re-roll indefinitely — two re-rolls, then degrade to a static image.
- Generate a fleet of sheets before the first one has passed the gate.
