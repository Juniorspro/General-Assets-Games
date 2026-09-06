# Asset Pipeline — Art Direction & Parameters

How to spend the media tools well: art direction, generation parameters, and
post-processing. The submission mechanics (task ids, polling, `assets.ts`
registration) live in `contracts/global.md` — this file is about making the
results look like ONE game instead of a collage. Read it before generating any
bundled asset.

## Style anchor discipline

- `PLAN_GAME.md`'s **Art style** phrase goes verbatim at the end of EVERY
  image/video prompt. Style drift across generation turns is the #1 reason a
  game's art reads as stock-photo soup.
- No plan? Write ONE style anchor sentence first (medium + palette + lighting,
  e.g. `flat vector, dusk palette of deep blues and amber, soft rim light`),
  record it in `AGENTS.md`, then reuse it everywhere.
- Recurring characters need image-to-image anchoring via `source_urls` with a
  fixed reference image — one reference portrait, every later image of that
  character attaches it (the `char-ref` skill documents the full method when
  available).

## Parameter tiers

The platform default is `1024x1024` at LOW quality — fine for small pieces,
wrong for the assets that carry the game's look. Size rules: both dimensions
multiples of 16, total pixels ≥ 655,360, long edge ≤ 3840, ratio ≤ 3:1.

| Asset | size | quality | transparent | Notes |
|---|---|---|---|---|
| Background / title key art | `2048x1152` (portrait: `1152x2048`) | `high` | no | This becomes the cover — worth the spend |
| Character / prop sprite | `1024x1024` | `medium` | **yes** | PNG with real alpha; trim after |
| Spritesheet grid (3×3) | `1536x1536` | `medium` | **yes** | See spritesheet workflow |
| HUD icons | `1024x1024`, downscale with Pillow to 128-256 | default | yes | The min-pixel rule forbids generating small images directly |

Prefer procedural rendering (gradients, shapes, CSS) over generated bitmaps
for UI chrome, buttons, and particles — crisper, zero cost, always on-palette.

## Spritesheet workflow

Grid contract (the `gen-sprite-animation` skill has the full prompt template):
ONE motion per sheet — N cells = N consecutive moments of the SAME subject,
same camera angle; uniform cells, no labels, no drawn dividers, and every cell
a visibly different pose. Pass `transparent: true` and `output_format: "png"`
and let the platform matte the background out — never hand-roll a solid-color
background to cut out yourself.

Gate the sheet before registering it — duplicate poses and seam lines drawn on
the cell boundaries both survive a casual look at the preview:

```
/app/.venv/bin/python3 /opt/agent_plugins/game-kit/scripts/check_spritesheet.py \
  --sheet current/src/assets/hero_walk.png --cols 3 --rows 3 --fix-seams \
  --contact-sheet /tmp/hero_walk_cells.png
```

Exit 0 = pass, exit 2 = fail; the JSON names the offending cells and pairs and
reports whether matting produced real alpha. **Always pass `--fix-seams`**: the
model paints dividers onto the cell boundaries often (7 of 18 sheets on one real
game), and a divider is a few pixels on a known line, so the gate erases it and
rewrites the sheet rather than costing a re-roll. `Read` the contact sheet for what
metrics cannot judge (wrong subject, mixed directions).

Slice frames only if the game needs individual files; otherwise keep the whole
sheet and draw with a source rect (`drawFrame` in `genres/2d.md` Layer 4, with
`SPRITES` metadata in `config.ts`). Slicing recipe when needed:

```python
from PIL import Image
sheet = Image.open("current/src/assets/hero_walk.png")
cols, rows = 3, 3
fw, fh = sheet.width // cols, sheet.height // rows
for i in range(cols * rows):
    frame = sheet.crop(((i % cols) * fw, (i // cols) * fh, (i % cols + 1) * fw, (i // cols + 1) * fh))
    frame.save(f"current/src/assets/hero_walk_{i}.png")
```

## Seamless tiling backgrounds

For scrolling/parallax layers, add `seamless tileable texture, no border
vignette, edges continue perfectly` to the prompt. Self-check the seam with
Pillow — offset by half and look at the center cross:

```python
from PIL import Image, ImageChops
img = Image.open("current/src/assets/bg_layer.png")
ImageChops.offset(img, img.width // 2, img.height // 2).save("/tmp/seam_check.png")
```

`Read` the check image: a visible cross line means it does not tile — re-roll
or crop-blur the seam.

## Palette cohesion

Generated art and hand-drawn UI must share one palette or the game reads as a
collage. After the key art is ready, extract its dominant colors and put the
hexes in `config.ts` for HUD text, particles, buttons, and 3D lights/fog:

```python
from PIL import Image
img = Image.open("current/src/assets/bg_title.png").convert("RGB").resize((128, 128))
pal = img.quantize(colors=5).getpalette()[:15]
print([f"#{pal[i]:02x}{pal[i+1]:02x}{pal[i+2]:02x}" for i in range(0, 15, 3)])
```

Feed the same hexes BACK into later prompts ("palette of #1a2233, #facc15, …")
to keep new assets on-family. Pixel-art assets: quantize to a small palette
(`img.quantize(colors=32)`) so generated frames stop shimmering with off-palette
noise.

## 3D assets

- Hero props/characters: generate a concept image first, then image-to-3D
  (`submit_model3d_generation` with `source_url`) — far more art-directable
  than text-to-3D. Set `texture_quality: "detailed"` for anything the camera
  gets close to.
- Normalize scale/origin on load (`loadModel` in `genres/3d.md` Layer 4);
  budget ≤50k triangles per hero model on mobile.
- Environment/backdrop pieces are usually cheaper as textured primitives + fog
  than as generated meshes.

## Audio set

Derive the SFX list from `PLAN_GAME.md`'s Actions (each core action = one cue):

- SFX: `kind: "sound"`, ≤2s, prompt describes material + action, not
  onomatopoeia ("short metallic coin pickup, bright, arcade" beats "ding").
- BGM: `kind: "music"`, 30-60s, prompt ends with "seamless loop, consistent
  energy, no fade out" — a fade-out pops audibly when `engine/audio` loops it.
- File name = assets key (`sfx_hit`, `bgm_theme`); register in `assets.ts` and
  load via `audio.load(key, ASSETS[key])`.
- 音乐一律走生成资产，禁止在代码里逐音符作曲（Web Audio/合成器循环拼曲）：
  你听不到自己的输出，代码作曲的音乐稳定地缺乏和声结构。也不要用分别生成的
  乐器分轨叠混音——各轨没有共同调性与和弦进行，必然打架。代码合成只用于
  短促的帧同步反馈音（点击/命中/拾取）。

## Budget & compression

Everything imported ships in `dist/` and loads before play — keep the bundle
≤ ~8MB total. Pillow passes that pay for themselves:

```python
from PIL import Image
img = Image.open(p)
img.thumbnail((1024, 1024))                       # ≤2x its on-screen size
img.save(p)                                       # PNG (alpha) — or:
img.convert("RGB").save(p.replace(".png", ".jpg"), quality=80)  # opaque bgs
```

Opaque backgrounds → JPEG q80; alpha sprites → PNG (optionally
`img.quantize(colors=64).convert("RGBA")` first); icons → downscale hard.
Preload the set behind the title screen (`genres/*` Layer 4) — never mid-frame.
