# App Bridge — Host App Communication

> **Device APIs are enhancement channels** — touch/keyboard fallback required and permission requests never block first paint. Full contract: `contracts/global.md` → "Device APIs — enhancement channels".

## Import

```tsx
import { bridge } from './lib'
```

## Platform APIs

<!-- owned-exports: bridge -->

### Members of `bridge`

| Member | Type | Description |
|--------|------|-------------|
| `bridge.getUsername()` | `() => Promise<string>` | Get App username; returns empty string `''` outside App |

## Iron Rules

- Return value may be empty string — UI must have a fallback (e.g. `'Player'`)
- Bridge calls have a 3-second timeout; on timeout rejects -> catch returns empty string
- Never call bridge inside rAF loops (async + cross-process). Call once in useEffect only

## Fallback Strategy

| Capability | App WebView | Mobile Browser | Desktop Browser |
|-----------|------------|----------------|-----------------|
| bridge.getUsername | Yes | No -> '' | No -> '' |

## Rules

1. All device APIs import from `'./lib'`. Never import raw browser APIs directly.
2. Start in useEffect, stop in cleanup return. Never start in game loops.
3. Permission denial = graceful degradation, never dead-end the experience.
