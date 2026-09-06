# Microphone — Audio Input

> **Device APIs are enhancement channels** — touch/keyboard fallback required and permission requests never block first paint. Full contract: `contracts/global.md` → "Device APIs — enhancement channels".

## Implementation

Build this directly on `getUserMedia` + Web Audio's `AnalyserNode` — sample
volume (RMS) and peak frequency once per animation frame:

```ts
let listening = false
let level = 0, freq = 0
let ctx: AudioContext | null = null
let stream: MediaStream | null = null
let raf = 0

export const mic = {
  async start(): Promise<void> {
    if (listening) return
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    source.connect(analyser)

    const timeBuf = new Float32Array(analyser.fftSize)
    const freqBuf = new Uint8Array(analyser.frequencyBinCount)
    listening = true

    const tick = () => {
      if (!listening) return
      analyser.getFloatTimeDomainData(timeBuf)
      let sum = 0
      for (let i = 0; i < timeBuf.length; i++) sum += timeBuf[i] * timeBuf[i]
      level = Math.sqrt(sum / timeBuf.length) // RMS, 0..~1

      analyser.getByteFrequencyData(freqBuf)
      let maxVal = 0, maxIdx = 0
      for (let i = 0; i < freqBuf.length; i++) {
        if (freqBuf[i] > maxVal) { maxVal = freqBuf[i]; maxIdx = i }
      }
      freq = (maxIdx * ctx!.sampleRate) / analyser.fftSize // Hz

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  },
  stop(): void {
    listening = false
    cancelAnimationFrame(raf)
    stream?.getTracks().forEach((t) => t.stop())
    void ctx?.close()
    stream = null
    ctx = null
    level = freq = 0
  },
  get listening() { return listening },
  get level() { return level },
  get freq() { return freq },
}
```

## Threshold Reference

| Scenario | level Range | Typical Usage |
|----------|------------|---------------|
| Silence / ambient noise | 0 – 0.02 | Ignore |
| Gentle blow | 0.03 – 0.10 | Weak push force |
| Normal blow | 0.10 – 0.30 | Standard control force |
| Loud shout | 0.30 – 0.80 | Burst power / trigger events |

`freq > 800 && level > 0.05` reads as a whistle (good for a distinct "special
ability" trigger); `freq < 500 && level > 0.05` reads as a blow/voice (good for
a continuous push force).

## Iron Rules

- Start in `useEffect`, stop in its cleanup return — never inside the game loop.
- Always apply a level threshold (≥ 0.03) to filter ambient noise, or elements
  will drift/react to background hiss.
- If the user denies permission, `level`/`freq` stay `0` forever — always
  provide a touch/keyboard fallback.
- `mic.stop()` must release the `MediaStream` (stops tracks) so the browser's
  recording indicator turns off — never skip cleanup.

## Fallback Strategy

| Capability | App WebView | Mobile Browser | Desktop Browser |
|-----------|------------|----------------|-----------------|
| mic level/freq | Depends on host | Yes (requires permission) | Yes (requires permission) |

Suggested fallback rule: prefer the mic value; when it stays below threshold
(no permission, silent room), fall back to a touch-and-hold input instead.
