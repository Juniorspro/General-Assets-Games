# render-3d

Native three.js, imperative style. Scene structure, game logic, and visuals
come from the brief and your own three.js knowledge. The platform fixes only
this:

- `src/three/game.ts` owns renderer, scene, render loop, resize, and dispose:
  `startGame(canvas, runtimeContext) → { dispose() }`. `src/App.tsx` stays the
  hook-wired thin shell. `scripts/check-architecture.mjs` enforces this inside
  `bun run build` — fix code to its messages, never bypass it.
- Protected: `src/lib/**`, `src/main.tsx`, `src/index.css`,
  `src/vite-env.d.ts`. Everything else under `src/` is yours.
- Dependencies are frozen — `package.json` is the complete universe; nothing
  else resolves. `@dimforge/rapier3d-compat` is available when the brief needs
  a physics engine; hand-rolled physics is fine otherwise.
- 3D `Input` specifics (base interface in `contracts/global.md`): here `dir`
  comes from keyboard/joystick only and is y-down screen-space — convert to
  camera-relative XZ for world movement; `drag` is reserved for camera-look.
  Mobile controls, only when the mechanic needs continuous movement or a held
  action: `<MobileControlHud input={input} />` from `@rezona/core/3d`
  (optional `primaryAction` / `extraButtons` / `layout`; its buttons call
  `input.setMobileMove` / `input.setActionHeld`, gameplay reads
  `input.actionHeld` per frame). Discrete mechanics (lane-switch, turn-based)
  just poll `input.consumeSwipe()` / `consumeTap()` — no visible controls.
- `useLoop` from the barrel drives 2D overlay canvases only; the 3D loop is
  `renderer.setAnimationLoop` inside `src/three/game.ts`.
- runtime → DOM HUD: publish low-frequency snapshots (callbacks passed via
  `runtimeContext`, or a tiny module store the HUD subscribes to); the HUD
  never drives gameplay. `phaseRef` is yours — the platform does not read it.
- Ship for mid-range phones. First frame must show brief-specific content,
  never the starter placeholder. Keep procedural fallbacks so a failed asset
  load never blanks the scene.
