# Common Platform Contract

This file records the shared constraints every game in this workspace must respect. It is
not a genre, style, pacing, or visual-design guide — those come from the user's brief and
the model's general game knowledge.

## Workspace

- Your project lives at `<ws>/current/` — a plain Vite + React + TypeScript app. Never edit
  `<ws>/v{n}/` (checkpoint snapshots) or hand-write over `<ws>/AGENTS.md`'s existing content.
- `vite.config.ts` must keep `base: './'` — the built `dist/` is served from a variable
  sub-path per version, and a non-relative base breaks every asset reference.
- The build produces `<ws>/current/dist/index.html`; that file is the only thing the
  platform ever serves. Never restructure the project to be "openable" as a single file
  or bypass the Vite build.
- `package.json` is the complete dependency universe for the project — add packages
  ONLY via the game-kit `add_dependency.py` script (see SKILL.md) before importing
  them; never hand-edit `package.json` dependencies or `bun.lock` (the frozen-lockfile
  build will reject the mismatch). three.js ships preinstalled.

## Device APIs — enhancement channels

Device APIs (tilt, microphone, camera, haptics) are enhancement channels.
They must never be the only way to interact — always provide touch/keyboard fallback.
Permission requests must not block first paint. Content renders immediately;
device APIs activate in a `useEffect` after mount.
Per-API implementation patterns live in `interactions/<name>.md`.

## Asset generation (koubou)

Generate required bundle assets with the in-process media tools:
`mcp__media__submit_image_generation` (image), `mcp__media__submit_video_generation` (video),
`mcp__media__submit_audio_generation` (audio), `mcp__media__submit_model3d_generation`
(3D model), `mcp__media__submit_rig3d_generation` (rigging/animation), or
`mcp__media__submit_retexture_generation` (texture regeneration). These tools submit
pgc-backed tasks and return a `task_id` immediately; poll with
`mcp__media__check_generation_tasks` until the item is `ready`. Treat `task_id`, `asset_path`,
`preview_url`, and polling details as internal working state; do not mention them in
user-facing replies unless the user explicitly asks for file/debug details.

For image/video assets the game bundle needs, pass a stable `name`; Koubou derives
`current/src/assets/<safe_name>.png|mp4`, pgc writes there, and ready items return that
`asset_path`. For audio/model3d bundle assets, pass `output_path:
"/current/src/assets/<file>"` because those tools still use caller-supplied paths.
Rigging and retexture require an `output_path` under `/current/src/assets/` (bundle directly)
or `/assets/` (staging), ending in `.glb`.

Then update `src/assets.ts` yourself: `import hero from './assets/hero.png'`, add its
`key -> path` entry to the `ASSETS` map, then import from there wherever you need the asset.
The `import` is what makes Vite bundle the file into the build: assets are served from the
version's self-contained `dist/` under a deep, variable CDN path, so only import-based
(relative-resolved) references load correctly — never use absolute paths or a `public/`
directory for your assets. Nothing regenerates `assets.ts` and it is never overwritten.
Art-direction guidance (style anchor, parameter tiers, spritesheets, palette, budget)
lives in `patterns/asset-pipeline.md` — read it before generating.

### 3D rigging and retexture

- `submit_rig3d_generation` requires `source_task_id` and `output_path`; optional
  `animations` accepts up to five Tripo preset identifiers such as `preset:idle`,
  `preset:walk`, and `preset:jump`. When omitted, PGC chooses its default set. If the
  `pgc-3d-rigging` flag is disabled, submission returns `503 RIGGING_DISABLED` and there
  is no task to poll.
- `submit_retexture_generation` requires `source_task_id` and `output_path`; it accepts
  `text_prompt`, HTTPS-only `image_prompt_url` / `style_image_url`, texture/PBR controls,
  quality/alignment controls, and `name`. `text_prompt` and `image_prompt_url` are mutually
  exclusive.
- Poll both task kinds to `ready` or `failed`. On success, register the returned `.glb`
  `asset_path` in `src/assets.ts`; on failure, read `error` and stop polling.
- `source_task_id` is the original Tripo model task identifier. It is not Koubou's PGC
  `gtask-*`, an `asset_path`, or a GLB URL. Never guess or substitute one of those values.
- Rigged GLBs contain skin and animation clips. Follow `genres/3d.md` for `GLTFLoader`,
  `AnimationMixer`, render-loop updates, and cleanup; a mesh-only viewer can show a T-pose
  or no animation.

## Minimal Runtime Rules

These rules are platform constraints, not game-design prescriptions. Let the user's
brief and the model's general knowledge drive genre, pacing, art direction,
difficulty, progression, and tone.

1. Do not block first paint on permissions or async assets; render an immediately
   mounted fallback.
2. Every device-only input path must have touch, mouse, or keyboard fallback.
3. Own your render loop explicitly: `requestAnimationFrame` for 2D (see
   `genres/2d.md`), `renderer.setAnimationLoop` for 3D (see `genres/3d.md`).
4. Keep per-frame mutable state out of React state — React re-renders are not free.
   Use refs / a plain object outside React for hot-path values; read them inside the
   loop, not inside `useEffect`.
5. Model lifecycle as a simple two-state notion (active / ended) in your own code;
   richer in-game or interactive sub-states are your own local state, not a shared type.
6. If an "ended" state exists, provide an in-game restart path. Never require a page
   refresh to retry.
7. When using generated or user-editable assets, import them through `src/assets.ts`
   so Vite bundles them into `dist/`; do not rely on absolute workspace paths.
8. Close resources you explicitly open (listeners, streams, loops, subscriptions).
9. Set the game's real name in `index.html` `<title>` (the tab/share text) —
   never ship the scaffold title.
