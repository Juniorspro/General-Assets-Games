# render-vr

three.js + React Three Fiber + drei, mobile VR-style: gyro view + camera hand
gestures. R3F/three knowledge is yours; this file is the platform contract.

## Ownership

- `src/App.tsx` thin shell mounts `<Canvas>`; scene JSX lives in
  `src/game/ui/Scene.tsx` (module top-level components). `CameraRig.tsx` is
  the ONLY writer of camera transforms — extend it for follow-cams; never
  mount `OrbitControls` alongside it.
- There is NO `systems/render.ts` in VR: rendering is Scene's declarative JSX
  plus ref mutation inside `useFrame` after `controller.tick(dt, c)`. `dt` is
  in SECONDS (R3F delta) — never divide by 1000.
- Do NOT use `useLoop` — there is no 2D canvas, it silently no-ops; the
  per-frame loop is Scene's `useFrame`.
- Protected: `src/lib/**`, `src/main.tsx`, `src/index.css`. Dependencies are
  frozen — `package.json` (three / R3F / drei) is the complete universe;
  hand-write physics.
- Phase/restart: same HUD 100ms polling bridge and triple-write restart as
  `render-2d.md`. BGM is platform-managed the same way.
- Editable image/texture assets need BOTH a hidden DOM registrar
  (`<img id=ASSETS-key data-editable="image">` sibling of `<Canvas>` — the
  live editor scans the DOM) AND their own `useEditableMedia` +
  `THREE.TextureLoader` effect (dispose the previous texture on swap). Do not
  use drei's `useLoader` for these URLs — a load failure crashes the whole
  Canvas.

## View + gestures (private API)

- `useVrViewControls({ autoStart?, touchSensitivity?, pitchLimit? })` →
  `{ view, viewRef, handlers, requestGyroPermission(), stopGyro() }`.
  `VrViewState`: `mode: 'gyro'|'touch'`, `permission:
  'idle'|'granted'|'denied'|'unsupported'`, `gyroAvailable`, `yaw/pitch/roll`
  (radians, pitch clamped). Read `viewRef.current` inside `useFrame`; `view`
  for JSX. iOS requires `requestGyroPermission()` from a visible button's
  pointer handler when not yet granted; touch-drag fallback must stay
  playable on gyro-less devices.
- `useVrGestures({ camera?, …thresholds })` → `{ handlers, state, stateRef,
  consumeGesture(), peekGesture(), clearGesture() }`. Events:
  `tap / double_tap / long_press / swipe_* / pinch_in / pinch_out /
  two_finger_tap` with `{ center, delta, scale, pointerCount, durationMs,
  velocity, source: 'pointer'|'camera' }`. Camera hand tracking is the
  primary path with pointer fallback built in; pass `{ camera: false }` for
  view-only scenes. Up to TWO hands are tracked.
- Camera gestures all ride on the PINCH: quick pinch+release with little
  movement emits `tap`; pinch-hold + move emits `swipe_*`; a sustained
  pinch-distance change emits `pinch_in/out`; pinch-hold still (~420ms)
  emits `long_press`. An open hand emits nothing — design interactions
  around pinching, and expect ~20fps camera dispatch.
- `VrGestureState`: `activePointers`, `pinchScale` (live during a pinch),
  `lastGesture`, `lastSource`, `cameraActive / cameraGranted / cameraReady /
  cameraError`, `trackedHands` (per hand: `handedness`, `confidence`,
  `indexTipNorm`, `thumbTipNorm`, `pinchCenterNorm`, `pinchDistance`,
  `landmarksNorm`, `updatedAt` — all coords already mirror-corrected, never
  re-mirror). `VrViewState` also carries `touching` (drag in progress).
- Gesture consumption is single-source AND the only trigger path: exactly
  ONE `consumeGesture()` call site, invoked every frame (top of Scene's
  `useFrame`), which drains the queue and hands the event to `tick` for that
  frame. Do not build triggers on `state.lastGesture` — events carry no
  timestamp, so consumed-vs-new cannot be distinguished there.
- Always merge handlers onto the container:
  `mergePointerHandlers(input.handlers, viewControls.handlers,
  gestureControls.handlers)` — including camera-off scenes.
- `<VrVirtualHands hands={gestures.state.trackedHands} fallbackPose="demo"
  boardDistance? scale? labelMode?>` renders modeled hands. It MUST live
  inside the `<Canvas>` subtree (a DOM sibling renders zero pixels). Mount it
  whenever hand tracking drives interaction; pass the live reactive array,
  not a snapshot. `boardDistance` ≈ user reach: 1.0–1.5 close panels,
  2.5–3.5 mid-range play, 4+ far targets.
- `c.view` / `c.gestures` in TickContext are per-frame snapshots taken at the
  top of Scene's `useFrame` — do not also read the refs inside systems.
- `public/mediapipe/**` and `public/game.config.json` are platform-owned (the
  offline hand-tracking payload) — never edit or delete them.
- VR lib hooks self-clean on unmount — never call `stopGyro()` or terminate
  workers from `controller.dispose()`.

## Delivery

- Spatial UI belongs in the scene (world-locked or billboard); DOM Hud is for
  permission / fallback / status. drei `<Text>`: no fonts ship with the
  template — omit the `font` prop (troika fetches its default over the
  network) or pass a TTF/OTF URL; a `.woff2` URL kills the entire Canvas.
  Use drei `<PositionalAudio>` for world-positioned sounds; `sfx`/`bgm` stay
  non-positional.
- First frame shows brief-specific spatial content or a clear
  permission/fallback state; gyro or camera denial must never soft-lock.
