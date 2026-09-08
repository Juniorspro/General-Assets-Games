---
name: char-ref
description: "Method contract for character visual consistency — the same character must look like the same person across every expression, scene, and CG. Uses the platform media tools' image-to-image path (`source_urls` on `mcp__media__submit_image_generation`) with one user-confirmed reference portrait as the anchor; covers reference selection, consistent-generation prompts, fixing an already-inconsistent asset, and safe replacement via the assets.ts manifest. Pure documentation, no scripts. Triggers: character reference / face consistency / enforce character consistency / fix character face / consistent portraits / 角色一致性 / 换脸 / 统一角色形象 / 角色长得不一样 / faces don't match."
---

# char-ref

**Why this exists:** image generators produce a different face every run, even with identical prompts. When one character appears across several expressions and scenes, prompt-only consistency is not enough — every image of that character must be anchored to one reference image. This skill is the method; generation runs through the platform's media tools.

## Method

### 1. Pick the canonical reference — user confirms, never auto-pick

One portrait per character becomes the reference all others must match. Generate it first (typically the neutral/hero pose), let the user approve it — a silently chosen reference propagates a face the user never approved into every asset. For identity-carrying protagonists, consider `gen-variants` for this one image: picking the reference from 2-3 candidates is the highest-leverage variant spend in the whole pipeline.

Keep the reference's **`preview_url`** (returned by `mcp__media__check_generation_tasks` when the task is ready) in your working notes — it is the image-to-image handle for every later call. `source_urls` only accepts HTTP(S) URLs reachable by the generation backend, and the preview URL is exactly that. If you lost it, re-check the original task ID, or re-generate the reference.

### 2. Generate new images of the character WITH the reference attached

This is the primary path — consistency at generation time, not repair afterwards. For every new expression, pose, or scene featuring the character:

```
mcp__media__submit_image_generation
  prompt: "the SAME character as in the reference image — identical face,
           hair, and outfit — now <shocked expression / sitting in the library / ...>.
           <the plan's Art style phrase>"
  name: "<character>_<variant>"          → lands at current/src/assets/<name>.png
  source_urls: ["<reference preview_url>"]
```

Pass scene/pose references as additional `source_urls` entries when needed (up to 8); verify the effect on the first image before relying on it. Then poll with `mcp__media__check_generation_tasks` and register the result in `current/src/assets.ts` (import + key) as the platform contract requires.

### 3. Fix an already-inconsistent asset (repair path)

When an existing asset drifted (different face than the reference):

1. Submit an image-to-image edit with **both** images: `source_urls: ["<reference preview_url>", "<target preview_url>"]`, prompt: *"Replace the character in the second image with the character from the first reference image — same face, hair, and outfit. Keep the second image's composition, pose, background, and style unchanged."*
2. Give the output a **new name** (e.g. `hero_shocked_v2`) rather than overwriting the old asset.
3. If the result passes the eye check (step 4), point the existing `current/src/assets.ts` import at the new file — same ASSETS key, new path. The old file stays on disk un-imported (Vite only bundles imported assets), which is your rollback: re-point the import to revert.

Never regenerate under the same `name` before the user has seen the result — that overwrites the on-disk asset with no way back.

### 4. Verify by eye

Reference-based generation can still fail on extreme angles, heavy occlusion, or when the prompt fights the reference. The user reviews results; failures get re-run with a tightened prompt (name the exact features that drifted: "same round glasses, same scar over left eyebrow") or accepted as close enough. Do consistency work on full images with backgrounds — context helps the model lock identity.

## Boundaries

This skill **must not**:

- Auto-select the canonical reference without user confirmation.
- Overwrite an existing asset file in place during a repair — new name, then re-point the manifest import after approval.
- Batch-regenerate every image of a character without telling the user the per-image cost first.
- Modify game code beyond the `current/src/assets.ts` import lines it re-points.
