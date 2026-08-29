# Tilt — Motion Input

> **Device APIs are enhancement channels** — touch/keyboard fallback required and permission requests never block first paint. Full contract: `contracts/global.md` → "Device APIs — enhancement channels".

## Implementation

There is no platform wrapper for this — write it directly against the
`DeviceOrientationEvent` API. iOS 13+ requires an explicit permission request
triggered by a user gesture; other platforms fire the event without one.

```ts
export type Tilt = { x: number; y: number } // normalized -1..1

let listening = false
let alpha = 0, beta = 0, gamma = 0

function onOrientation(e: DeviceOrientationEvent) {
  alpha = e.alpha ?? 0
  beta = e.beta ?? 0
  gamma = e.gamma ?? 0
}

export const motion = {
  async start(): Promise<void> {
    if (listening) return
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DOE.requestPermission === 'function') {
      const perm = await DOE.requestPermission()
      if (perm !== 'granted') return // stays at {x:0, y:0} — caller must have a fallback
    }
    window.addEventListener('deviceorientation', onOrientation)
    listening = true
  },
  stop(): void {
    window.removeEventListener('deviceorientation', onOrientation)
    listening = false
    alpha = beta = gamma = 0
  },
  get listening() { return listening },
  get tilt(): Tilt {
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
    return { x: clamp(gamma / 45, -1, 1), y: clamp(beta / 45, -1, 1) }
  },
}
```

Call `motion.start()` from a user-gesture handler or a forgiving `useEffect`
(desktop browsers have no motion sensor and never resolve/deny — `tilt` just
stays `{x:0, y:0}` forever, which is fine as long as keyboard/touch input still
works). Call `motion.stop()` in the effect's cleanup.

```tsx
useEffect(() => {
  motion.start()
  return () => motion.stop()
}, [])
```

## Iron Rules

- Start in `useEffect`, stop in its cleanup return — never inside the game loop.
- iOS shows the permission dialog once; if denied, `tilt` stays `{x:0, y:0}`
  forever for that session. Always provide a touch/keyboard fallback.
- Desktop browsers have no motion sensor → `tilt` is always `{x:0, y:0}`.
  Keyboard/touch fallback is mandatory, not optional.
- Read `motion.tilt` inside your render/update loop, mapped to movement or
  displacement — do not gate the whole game on the sensor being present.

## Fallback Strategy

| Capability | App WebView | Mobile Browser | Desktop Browser |
|-----------|------------|----------------|-----------------|
| motion.tilt | Depends on host | Yes (requires permission) | No → `{x:0, y:0}` |

Any content using tilt MUST implement a touch/keyboard fallback to guarantee
desktop playability. Suggested fallback rule: prefer the device value; when it
stays near zero (e.g. `|x| < 0.05 && |y| < 0.05`), fall back to a keyboard/
touch-drag direction input instead.
