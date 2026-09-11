---
name: gen-variants
description: "Generate multiple candidate versions of one asset so the user picks by looking instead of describing. Submits 2-3 parallel generations of the same prompt through the platform media tools, shows the previews, and registers only the chosen one. Triggers: generate variants / give me options to pick from / 出几个版本 / 出几版让我挑 / 多几个候选 / A/B 一下这张图 / compare variants / variant picker."
---

# gen-variants

Turn "the face feels off, make it more... something" into a multiple-choice pick: generate several candidates of the same asset, let the user choose one.

## Method

1. **Generate in parallel.** The image tool has no batch parameter — submit N (2-3) tasks back-to-back with the same prompt and numbered names, then poll them together:

   ```
   mcp__media__submit_image_generation  prompt: "<the asset's prompt>"  name: "hero__pick_0"
   mcp__media__submit_image_generation  prompt: "<the asset's prompt>"  name: "hero__pick_1"
   mcp__media__submit_image_generation  prompt: "<the asset's prompt>"  name: "hero__pick_2"
   mcp__media__check_generation_tasks   task_ids: [<all of them>]
   ```

   The `source_urls` reference (e.g. a `char-ref` anchor) applies to variant generation the same as any generation — attach it to every submit.

2. **Let the user pick.** The platform surfaces generated assets to the user on its own; ask via `AskUserQuestion` with one option per variant (refer to them by number/short description — `preview_url` / `asset_path` are internal details, never pasted into user-facing replies), plus "none — reroll" (a reroll is a new paid round).

3. **Register only the winner.** Import the chosen file in `current/src/assets.ts` under the asset's semantic key:

   ```ts
   import hero from './assets/hero__pick_1.png';
   ASSETS.hero = hero;
   ```

   Losers stay un-imported — Vite only bundles imported files, so they are excluded from the build automatically.

## Boundary

- Never import a `__pick_*` candidate into `current/src/assets.ts` before the user has picked.
