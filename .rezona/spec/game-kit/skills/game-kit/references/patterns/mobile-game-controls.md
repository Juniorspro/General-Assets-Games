# Mobile Game Control Patterns

These are implementation patterns, not requirements. Choose the simplest input
path that matches the mechanic. Always keep the platform input contract from
`contracts/global.md`: device-only paths need touch, mouse, or keyboard fallback.
Mobile input does not require visible control UI; invisible hit zones, direct
touch, drag, hold, swipe, or buttons can all be valid when they fit the mechanic.

## Input Fit

Do not add visible controls only to make the game look game-like. Provide the
input paths the mechanic actually needs on mobile.

## Continuous Movement Input

The input can be visible or invisible; the mechanic decides.

- Place the active touch area where it does not conflict with the main play
  surface.
- Track press, move, release, pointer leaving the control, and cancel. Release
  must reset movement to zero.
- Convert drag vector into `dir.x / dir.y` style values or feed the same shape
  expected by the controller.
- Use visible controls only when they help the player understand or operate the
  game; the hit area and the visible art do not need to be the same thing.
- Keep HUD and gameplay targets out of high-frequency input areas when possible.

## Action Input

- Support press, release, and cancel for any held action.
- Support tap or hold according to the mechanic.
- If action input is visible, its visual state must match pressed / held state.

## Multi-Input Notes

- Touch movement and action should be able to happen at the same time when the
  mechanic needs it.
- Treat `pointercancel` / `touchcancel` as release.
- For canvas games, root containers usually need touch handling that prevents
  accidental page scroll while the player is controlling the game.
- Keep high-frequency input areas inside the safe area when practical; avoid
  notch and home-indicator zones, and respect the current orientation.
- Keep mouse and keyboard usable for desktop testing and accessibility.

## Control Fit Check

Before finishing, verify:

1. The main mechanic can be played on a phone without a keyboard.
2. The chosen input path matches this game shape.
3. Movement and action can happen together only if the mechanic requires it.
4. Release/cancel paths prevent stuck movement or stuck buttons.
5. Input areas are large enough to use without covering the important play area.
