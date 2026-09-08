# render-2d

Canvas 2D, imperative drawing. Game design and code come from the brief and
your own knowledge; this file is only the platform contract you cannot infer.

## Ownership

- `src/App.tsx` is a thin shell: platform hooks + canvas + low-frequency DOM
  overlays. Gameplay lives in `src/game/**` (`GameController` class + pure
  systems) — no React inside `game/`. The template shows the wiring.
- Protected: `src/lib/**`, `src/main.tsx`, `src/index.css`. Everything else
  under `src/` is yours. Dependencies are frozen — `package.json` is the
  complete universe; nothing else resolves.
- `useLoop`'s `dt` is **milliseconds** (capped at 50). The controller converts
  `dt / 1000` ONCE; systems work in seconds with velocities in px/sec.
- Phase: systems write `c.phaseRef.current = 'ENDED'`; the DOM HUD mirrors it
  via its 100ms poll. Restart needs all three writes: `reset()` +
  `phaseRef.current = 'ACTIVE'` + `setPhase('ACTIVE')`. On `ENDED`, `useLoop`
  stops drawing entirely — the canvas freezes on its last frame, so end
  screens must be DOM overlays; for non-terminal states (pause, reveal, next
  round) keep phase `ACTIVE` and use your own sub-state.

## Private runtime rules (break on real devices, not in build)

- NEVER read `canvas.width/height` / `getBoundingClientRect()` and NEVER
  reference `window.devicePixelRatio` in app code — `useLoop` owns HiDPI
  buffer sizing with unclamped DPR. Coordinate source of truth is
  `c.screen.w/h` (CSS px); redone DPR math drifts on dpr≥3 phones.
- NEVER hand-roll rAF, ResizeObserver, pointer listeners, or
  `document.createElement('canvas')` — use `useLoop` / `useScreen` /
  `useInput` / `useOffscreenBuffer`.
- `useOffscreenBuffer(screen, sizeFn, rebuildKey, paint?)` is the only
  sanctioned persistent offscreen canvas (masks, fog, scratch layers). The
  first arg is the STATE-form `screen` — destructure
  `const { screen, screenRef, containerRef } = useScreen()`. Returns
  `MutableRefObject<OffscreenBuffer | null>` where `OffscreenBuffer =
  { canvas, ctx, cssW, cssH, bufW, bufH }`. `sizeFn(screen)` returns CSS px;
  `paint(ctx, cssW, cssH)` seeds content. It rebuilds (clears + repaints)
  when `screen.w/h` OR `rebuildKey` changes — buffer content is lost on
  resize by design. The ctx transform is pre-set (write CSS px, no DPR
  math); rAF readers null-check `.current`; `bufW/bufH` are for
  `getImageData` only.
- Draw helpers (null-safe, CSS px): `drawImg(ctx,img,x,y,w,h)`,
  `drawRotated(…,cx,cy,w,h,angle)`, `drawSprite(…,flipX)`,
  `drawCover(ctx,img,cw,ch)`, and
  `drawAsset(ctx,img,name,frame,cols,rows,x,y,w,h,flipX)` — it reads
  `ASSET_META[name]` and auto-degrades to whole-image when `isSprite:false`;
  `name` MUST equal the `ASSETS` key; prefer it over low-level
  `drawSheetFrame`. Helpers silently skip until images decode — do not gate
  rendering on a `loaded` flag.
- Backgrounds are static: `drawCover` once per frame, no scroll/parallax —
  generated images have non-seamless edges.
- Never conditionally render `<canvas>` — `useLoop` binds the ref once at
  mount.

## Live editor + assets + audio

- Every editable asset: `useEditableMedia(id, ASSETS[id])` + a permanently
  mounted DOM element whose `id` EXACTLY equals the `ASSETS` key, with
  `data-editable="image|video|audio"` (hidden `<div id="assets">`). The live
  editor discovers assets via `getElementById`. Cache `<img>` refs in App.tsx
  and forward into systems via TickContext — no DOM reads inside `game/`.
- Do not call `.play()` / `.load()` on `useEditableMedia` elements — the hook
  reloads reactively; keep them permanently mounted (`display:'none'`).
- Gameplay BGM is platform-managed (autoplays from `game.config.json`, which
  the platform writes — never edit `public/**`) — do NOT `bgm.play/stop` it
  from init/dispose/reset. Event BGM: `bgm.play(eventUrl)`, then
  `bgm.play(gameplayUrl)` to restore.
- `cssVar` on color schema fields syncs to a CSS custom property on
  `document.documentElement` — DOM reads `var(--bg-color)`; canvas reads
  `c.config.bgColor`.

## Delivery

- First frame shows brief-specific content; remove every scaffold placeholder.
- Device APIs you open in `init()` (mic/camera/motion) get their `.stop()` in
  `dispose()`; platform hooks self-clean on unmount — don't double-stop them.
