# Camera — Webcam Input

> **Device APIs are enhancement channels** — touch/keyboard fallback required and permission requests never block first paint. Full contract: `contracts/global.md` → "Device APIs — enhancement channels".

## Implementation

Build this on `getUserMedia` + a hidden `<video>` element. Keep the raw stream
and any visible preview element decoupled so you can start the camera before
you know where (or whether) to show a preview:

```ts
export type CameraFacingMode = 'user' | 'environment'

let stream: MediaStream | null = null
let facingMode: CameraFacingMode = 'user'

export const camera = {
  async start(opts: { facingMode?: CameraFacingMode } = {}): Promise<void> {
    facingMode = opts.facingMode ?? 'user'
    stream?.getTracks().forEach((t) => t.stop())
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: false,
    })
  },
  stop(): void {
    stream?.getTracks().forEach((t) => t.stop())
    stream = null
  },
  async attach(video: HTMLVideoElement, opts: { mirrored?: boolean } = {}): Promise<void> {
    const mirrored = opts.mirrored ?? facingMode === 'user'
    video.autoplay = true
    video.muted = true
    video.playsInline = true
    video.style.transform = mirrored ? 'scaleX(-1)' : 'none'
    video.srcObject = stream
    if (stream) await video.play().catch(() => {}) // permission/gesture races are non-fatal
  },
  detach(video: HTMLVideoElement): void {
    video.pause()
    video.srcObject = null
  },
  get active() { return !!stream },
}
```

```tsx
const videoRef = useRef<HTMLVideoElement>(null)
useEffect(() => {
  let cancelled = false
  ;(async () => {
    try {
      await camera.start({ facingMode: 'environment' })
      if (!cancelled && videoRef.current) await camera.attach(videoRef.current, { mirrored: false })
    } catch {
      // permission denied or no camera — degrade UI gracefully, see Fallback Strategy
    }
  })()
  return () => { cancelled = true; camera.stop() }
}, [])
```

## Camera Background Layering

If the camera feed is the visible background, keep layers in this order:

```
video background -> optional dark mask/overlay -> effects canvas -> HUD/touch layer
```

Keep any effects canvas transparent except for pixels you intentionally draw —
do not rely on a canvas CSS background color for scene fill.

## Iron Rules

- Camera permission must never block first paint — show content immediately,
  then request permission inside a user gesture or a forgiving `useEffect`.
- If permission is denied, interaction must degrade to touch/mouse — never
  dead-end the experience.
- Call `camera.stop()` in the `useEffect` cleanup return.
- `video.play()` can reject if called outside a user gesture on some
  browsers — always catch it; a black preview is recoverable, an uncaught
  rejection is not.

## Fallback Strategy

| Capability | App WebView | Mobile Browser | Desktop Browser |
|-----------|------------|----------------|-----------------|
| camera.start | Depends on host | Yes (requires permission) | Yes (requires permission) |

Camera denied → hide camera-dependent UI, switch to a static background or a
touch-only interaction mode.
