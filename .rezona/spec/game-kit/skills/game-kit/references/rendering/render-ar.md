# render-ar

Camera + MediaPipe vision on the 2D canvas stack. Everything in `render-2d.md`
applies (controller/systems, dt ms→s, draw helpers, DPR rules, editable
assets, BGM) — EXCEPT `useOffscreenBuffer`, which the AR barrel does not
export (2D-only). This file is AR-specific only. `public/mediapipe/**` and
`public/game.config.json` are platform-owned (the offline model/wasm payload)
— never edit or delete them.

## Layering + camera ownership

- Layer 0 `<video id="ar-video">` (camera, `object-fit: cover`, `scaleX(-1)`)
  → Layer 1 transparent `<canvas>` (NO transform of any kind) → Layer 2 DOM
  HUD.
- `renderScene` starts with `ctx.clearRect`, never an opaque fill — a
  per-frame `drawCover` occludes the camera (transient overlays only).
- The vision pipeline exclusively owns the camera: `camera.*` from device.ts
  is FORBIDDEN in AR (a second `getUserMedia` races the pipeline).

## Vision pipeline (private API)

- `startVision(videoEl)` / `stopVision()` live in an App.tsx `useEffect` —
  never in controller init/dispose (the controller survives restarts;
  StrictMode double-mount must not thrash the camera grant). Always
  `.catch()` — denial degrades to keyboard/touch via `c.input`. Vision runs
  the whole session: never stop it on game-over; restart resets state only.
- `visionState` (== `c.vision`) is a mutable singleton: read fields per frame
  in the loop, never in React render, never snapshot it. Two rAF loops by
  design (internal dispatch ~25fps + `useLoop` ~60fps) — never add a third,
  never throttle manually, never `worker.terminate()`.
- `visionState.hand`: `indexTipNorm` / `thumbTipNorm` / `pinchCenterNorm`
  (`Point3D | null`), `pinch` 0..1 (apply hysteresis: enter 0.55 / exit
  0.35), `velocityNorm` (norm-units/sec, EMA-smoothed), `landmarksNorm`
  (21 points), `updatedAt`.
- `visionState.face`: `mouthCenterNorm`, `mouthBoundsNorm` (tight — inflate
  ~1.2× for forgiving collision), `jawOpen` (raw), `isMouthOpen`
  (hysteresis 0.30/0.18 — prefer over raw; it stays true while the mouth is
  open, so add a 150–250ms cooldown per triggered action), `landmarksNorm`
  (468 points). Only ONE hand and ONE face are tracked.
- Top level: `ready` means camera live, NOT workers ready — gate "fully
  tracking" UI on `status.hand/face === 'ready'`; `error` (string) and
  `status` are the failure surface. Permission denial arrives as the
  `startVision` rejection — track it in App.tsx's `.catch()` (local state)
  and show a Retry button that re-calls `startVision` on click; never
  loop-retry (re-triggers the OS prompt). There is NO `permissionState`
  field on `visionState`.
- All `*Norm` coords are 0..1 AND already mirror-corrected — NEVER compute
  `1 - x`, no `ctx.scale(-1,1)`, no canvas CSS transform (double mirror).
  Map camera-norm ↔ canvas-px with an `object-fit: cover` projector
  (offset + scale, not pure `x * screen.w` ratio — the feed is cropped).
  Frame dimensions come from the `<video id="ar-video">` element's
  `videoWidth/videoHeight` (0 until the stream is ready — skip that frame).
  Pointer coords from `useInput` are canvas-px and un-mirrored — project the
  landmark to canvas-px first, then compare; do not mirror the tap.
- Hand tracking is ~25fps: fast finger vs small target needs swept-segment
  collision (last tip → current tip), not point-in-radius.

## Delivery

- Wireframe overlay is mandatory: every frame with ≥21 hand landmarks draws
  the hand skeleton, every frame with ≥468 face landmarks draws the face
  oval + lips contour (style/color per brief). Without it users cannot tell
  AR is working.
- Every vision-driven action has a keyboard/touch fallback.
- Phase ENDED freezes the transparent overlay on a live camera feed (frozen
  wireframes read as broken) — clear the canvas once on the flip frame or
  cover it with an opaque DOM end panel.
