import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type RefObject,
  type MutableRefObject,
} from 'react';

// ══════════════════════════════════════════════
// Shared types
// ══════════════════════════════════════════════

/** Content lifecycle: ACTIVE on mount, ENDED when finished */
export type Phase = 'ACTIVE' | 'ENDED';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Screen {
  w: number;   // Canvas width in CSS px
  h: number;   // Canvas height in CSS px
  cx: number;  // w / 2
  cy: number;  // h / 2
}

// ══════════════════════════════════════════════
// Input type (includes React event refs, so it stays in the runtime layer)
// ══════════════════════════════════════════════

type SwipeDir = 'up' | 'down' | 'left' | 'right';

export interface Input {
  // ── Transient events (consumed once per frame; cleared after read) ──
  consumeTap(): { x: number; y: number } | null;
  consumeSwipe(): { dir: SwipeDir; dx: number; dy: number } | null;

  // ── Continuous state (read every frame) ──
  readonly holding: boolean;
  readonly pointer: { x: number; y: number };
  readonly drag: { dx: number; dy: number } | null;

  // ── Direction (unified synthesis of keyboard + touch drag) ──
  readonly keys: ReadonlySet<string>;
  readonly dir: { x: number; y: number };

  // ── JSX bindings ──
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

// ══════════════════════════════════════════════
// useScreen — canvas size management
// ══════════════════════════════════════════════

function makeScreen(w: number, h: number): Screen {
  return { w, h, cx: w / 2, cy: h / 2 };
}

export function useScreen(): {
  screen: Screen;
  screenRef: React.MutableRefObject<Screen>;
  containerRef: React.RefObject<HTMLDivElement>;
} {
  const [screen, setScreen] = useState<Screen>(
    () => makeScreen(window.innerWidth, window.innerHeight),
  );
  const screenRef = useRef<Screen>(screen);
  const containerRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const next = makeScreen(width, height);
      setScreen(next);
      screenRef.current = next;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { screen, screenRef, containerRef };
}

// ══════════════════════════════════════════════
// useInput — unified input system
// ══════════════════════════════════════════════

const DIR_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], W: [0, -1], s: [0, 1], S: [0, 1],
  a: [-1, 0], A: [-1, 0], d: [1, 0], D: [1, 0],
};

export function useInput(): Input {
  const holdingRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const tapRef = useRef<{ x: number; y: number } | null>(null);
  const swipeRef = useRef<{ dir: SwipeDir; dx: number; dy: number } | null>(null);

  const keysRef = useRef<Set<string>>(new Set());
  const keyDirRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const recalcDir = () => {
      let x = 0, y = 0;
      for (const k of keysRef.current) {
        const d = DIR_KEYS[k];
        if (d) { x += d[0]; y += d[1]; }
      }
      keyDirRef.current = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      };
    };

    const onKeyDown = (e: KeyboardEvent) => { keysRef.current.add(e.key); recalcDir(); };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key); recalcDir(); };
    const onVisibility = () => {
      if (document.hidden) {
        keysRef.current.clear();
        keyDirRef.current = { x: 0, y: 0 };
        holdingRef.current = false;
        dragRef.current = null;
        startRef.current = null;
        tapRef.current = null;
        swipeRef.current = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handlersRef = useRef({
    onPointerDown: (e: React.PointerEvent) => {
      if (!e.isPrimary) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      startRef.current = { x, y, time: Date.now() };
      holdingRef.current = true;
      pointerRef.current = { x, y };
      dragRef.current = { dx: 0, dy: 0 };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!e.isPrimary) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointerRef.current = { x, y };
      if (startRef.current && holdingRef.current) {
        dragRef.current = { dx: x - startRef.current.x, dy: y - startRef.current.y };
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!e.isPrimary) return;
      const start = startRef.current;
      if (start) {
        const rect = e.currentTarget.getBoundingClientRect();
        const ex = e.clientX - rect.left;
        const ey = e.clientY - rect.top;
        const dx = ex - start.x;
        const dy = ey - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - start.time;
        if (dist < 15 && elapsed < 300) {
          tapRef.current = { x: ex, y: ey };
        } else if (dist >= 30) {
          const dir: SwipeDir = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'right' : 'left')
            : (dy > 0 ? 'down' : 'up');
          swipeRef.current = { dir, dx, dy };
        }
      }
      holdingRef.current = false;
      dragRef.current = null;
      startRef.current = null;
    },
    onPointerCancel: () => {
      holdingRef.current = false;
      dragRef.current = null;
      startRef.current = null;
      tapRef.current = null;
      swipeRef.current = null;
    },
  });

  const inputRef = useRef<Input | null>(null);
  if (!inputRef.current) {
    inputRef.current = {
      consumeTap() { const t = tapRef.current; tapRef.current = null; return t; },
      consumeSwipe() { const s = swipeRef.current; swipeRef.current = null; return s; },
      get holding() { return holdingRef.current; },
      get pointer() { return pointerRef.current; },
      get drag() { return dragRef.current; },
      get keys() { return keysRef.current; },
      get dir() {
        const k = keyDirRef.current;
        if (k.x !== 0 || k.y !== 0) return k;
        if (holdingRef.current && dragRef.current) {
          const { dx, dy } = dragRef.current;
          const DZ = 8;
          return {
            x: Math.abs(dx) > DZ ? Math.max(-1, Math.min(1, dx / 30)) : 0,
            y: Math.abs(dy) > DZ ? Math.max(-1, Math.min(1, dy / 30)) : 0,
          };
        }
        return { x: 0, y: 0 };
      },
      handlers: handlersRef.current,
    };
  }
  return inputRef.current;
}

// ══════════════════════════════════════════════
// useLoop — phase-aware rAF loop
// ══════════════════════════════════════════════

export function useLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  phaseRef: MutableRefObject<Phase>,
  draw: (ctx: CanvasRenderingContext2D, dt: number) => void,
): void {
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let lastTime = 0;
    let errCount = 0;

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);

      // ── HiDPI: buffer = CSS × DPR, ctx coordinates stay in CSS px ──
      const dpr = window.devicePixelRatio || 1;
      const sizeEl = canvas.parentElement ?? canvas;
      const { width: cssW, height: cssH } = sizeEl.getBoundingClientRect();
      if (cssW === 0 || cssH === 0) return;
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      const bw = Math.round(cssW * dpr);
      const bh = Math.round(cssH * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // ── Phase-aware: skip frames and reset lastTime when ENDED ──
      if (phaseRef.current !== 'ACTIVE') {
        lastTime = 0;
        return;
      }

      const raw = now - (lastTime || now);
      lastTime = now;
      const dt = Math.min(raw, 50);

      try {
        drawRef.current(ctx, dt);
      } catch (err) {
        if (++errCount <= 3) console.error('[loop]', err);
      }
    };

    const onVisibility = () => { if (document.hidden) lastTime = 0; };
    document.addEventListener('visibilitychange', onVisibility);

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// ══════════════════════════════════════════════
// useOffscreenBuffer — DPR-aware persistent offscreen canvas
// (scratch mask / fog of war / paint canvas / cached layer)
// ══════════════════════════════════════════════

/**
 * Persistent offscreen buffer reference.
 * - `canvas` — pass to `ctx.drawImage` as source.
 * - `ctx` — already configured with `setTransform(dpr,0,0,dpr,0,0)`. Draw in
 *   CSS pixels; do NOT call `setTransform` yourself. Wrap composite-op
 *   changes in `save()`/`restore()`.
 * - `cssW/cssH` — CSS-pixel dimensions; use for input bounds checks.
 * - `bufW/bufH` — physical buffer dimensions (= css × dpr); use for
 *   `getImageData` / 9-arg `drawImage`.
 */
export interface OffscreenBuffer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cssW: number;
  cssH: number;
  bufW: number;
  bufH: number;
}

/**
 * Allocate and manage a DPR-aware offscreen canvas at the platform layer.
 *
 * Use this for any "buffer that needs to be sized off the screen, holds
 * accumulated content across frames, and gets composited onto the main
 * canvas every frame": scratch lottery mask, fog of war, paint app canvas,
 * cached background layer.
 *
 * Rebuild triggers (the buffer is cleared and re-painted):
 * 1) `screen.w/h` change (resize / orientation change).
 * 2) `rebuildKey` change (e.g. new round id).
 *
 * Contract:
 * - DPR is owned by the platform layer (this hook + `useLoop`). Game code
 *   MUST NOT touch `window.devicePixelRatio` — duplicating the math drifts
 *   from `useLoop`'s DPR and produces input/render coordinate offsets on
 *   dpr ≥ 3 devices (most modern phones).
 * - `size(screen)` returns CSS pixels; `paint(ctx, cssW, cssH)` draws in
 *   CSS pixels (the ctx transform is pre-set).
 * - rAF readers MUST null-check `bufferRef.current` (first frame may run
 *   before the layout effect populates it).
 * - On rebuild the buffer is fully cleared (`canvas.width = bufW` resets
 *   pixels and ctx state). Cross-frame accumulated content (e.g. scratched
 *   holes) is intentionally lost; persist manually if needed (rarely is).
 */
export function useOffscreenBuffer(
  screen: Screen,
  size: (s: Screen) => { w: number; h: number },
  rebuildKey: unknown,
  paint?: (ctx: CanvasRenderingContext2D, cssW: number, cssH: number) => void,
): MutableRefObject<OffscreenBuffer | null> {
  const bufferRef = useRef<OffscreenBuffer | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const paintRef = useRef(paint);
  paintRef.current = paint;

  useLayoutEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const { w: cssW, h: cssH } = sizeRef.current(screen);
    if (cssW <= 0 || cssH <= 0) return;
    const bufW = Math.max(1, Math.round(cssW * dpr));
    const bufH = Math.max(1, Math.round(cssH * dpr));

    const canvas = bufferRef.current?.canvas ?? document.createElement('canvas');
    // Always reassign — synchronizes size AND fully clears pixels + ctx state.
    // Required when rebuildKey flips but dims are unchanged (e.g. new round).
    canvas.width = bufW;
    canvas.height = bufH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    paintRef.current?.(ctx, cssW, cssH);

    bufferRef.current = { canvas, ctx, cssW, cssH, bufW, bufH };
  }, [screen.w, screen.h, rebuildKey]);

  return bufferRef;
}
