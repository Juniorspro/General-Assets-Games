# Vibration — Haptic Feedback

> **Device APIs are enhancement channels** — touch/keyboard fallback required and permission requests never block first paint. Full contract: `contracts/global.md` → "Device APIs — enhancement channels".

## Implementation

The Web Vibration API is a single function call with no setup or permission —
write a small wrapper so call sites read as intent, not raw milliseconds:

```ts
export type VibrateStyle = 'light' | 'medium' | 'heavy'
const VIBRATE_MS: Record<VibrateStyle, number> = { light: 10, medium: 30, heavy: 50 }

export function vibrate(style: VibrateStyle = 'medium'): void {
  try {
    navigator.vibrate?.(VIBRATE_MS[style]) // no-ops silently where unsupported (all of iOS Safari)
  } catch {
    // never let a haptics call break gameplay
  }
}
```

```ts
// On collision / score / level-up, fire-and-forget:
vibrate('medium') // default tactile
vibrate('heavy')  // boss hit, big event
vibrate('light')  // subtle UI confirmation
```

## When to Fire

Use haptics for discrete feedback moments, paired with a visible and/or audible
state change so desktop and iOS users (who get a silent no-op) are never left
without feedback.

- **Score / collect / pickup** → `vibrate('light')` or `vibrate('medium')`
- **Collision / damage / hit** → `vibrate('medium')`
- **Death / boss phase / level-up / critical** → `vibrate('heavy')`
- **Subtle UI confirmation (button press in HUD)** → `vibrate('light')`

## Iron Rules

- Use sparingly for key moments — over-vibration is annoying, not immersive.
- Silently no-ops on devices/browsers without `navigator.vibrate` (notably
  all of iOS Safari) — never branch gameplay logic on whether it fired.
- Never the only feedback channel — always pair with a visual and/or audio cue.

## Fallback Strategy

| Capability | App WebView | Mobile Browser | Desktop Browser |
|-----------|------------|----------------|-----------------|
| navigator.vibrate | Depends on host | Yes (Android); no on iOS | No (silent no-op) |
