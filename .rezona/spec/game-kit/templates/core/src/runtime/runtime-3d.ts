import { useState, useRef, useEffect } from 'react';

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
  consumeTap(): { x: number; y: number } | null;
  consumeSwipe(): { dir: SwipeDir; dx: number; dy: number } | null;

  readonly holding: boolean;
  readonly pointer: { x: number; y: number };
  /**
   * Drag in the *world* canvas — used by the camera rig for look rotation only.
   * Touch HUD widgets (joystick, action button) MUST stopPropagation so they
   * never start a world drag, otherwise look and movement collide on mobile.
   */
  readonly drag: { dx: number; dy: number } | null;

  readonly keys: ReadonlySet<string>;
  /**
   * Movement direction in screen-space convention (y-down).
   *   W / Arrow-Up    → (0, -1)
   *   S / Arrow-Down  → (0, +1)
   *   D / Arrow-Right → (+1, 0)
   * Sourced from keyboard, otherwise from the virtual joystick set via
   * setMobileMove(). 3D mode does NOT fall back to drag here — drag is
   * camera-look only.
   */
  readonly dir: { x: number; y: number };

  /**
   * Held state of the on-screen action button. The button writes via
   * setActionHeld(); systems read `c.input.actionHeld` per frame.
   */
  readonly actionHeld: boolean;

  /** Called by the HUD virtual joystick. x/y in [-1, 1], y-down. */
  setMobileMove(x: number, y: number): void;
  /** Called by the HUD action button on press / release. */
  setActionHeld(held: boolean): void;

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
  const mobileMoveRef = useRef({ x: 0, y: 0 });
  const actionHeldRef = useRef(false);

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
        mobileMoveRef.current = { x: 0, y: 0 };
        actionHeldRef.current = false;
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
        return mobileMoveRef.current;
      },
      get actionHeld() { return actionHeldRef.current; },
      setMobileMove(x: number, y: number) {
        mobileMoveRef.current = {
          x: Math.max(-1, Math.min(1, x)),
          y: Math.max(-1, Math.min(1, y)),
        };
      },
      setActionHeld(held: boolean) {
        actionHeldRef.current = held;
      },
      handlers: handlersRef.current,
    };
  }
  return inputRef.current;
}

// ══════════════════════════════════════════════
// useLoop — rAF loop
// ══════════════════════════════════════════════
// NOTE: In 3D mode, the main render loop is driven by R3F's useFrame().
// useLoop can still drive 2D overlay / HUD logic outside the Canvas.

export function useLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  phaseRef: React.MutableRefObject<Phase>,
  update: (ctx: CanvasRenderingContext2D, dt: number) => void,
): void {
  const updateRef = useRef(update);
  updateRef.current = update;

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

      if (phaseRef.current !== 'ACTIVE') {
        lastTime = 0;
        return;
      }

      const raw = now - (lastTime || now);
      lastTime = now;
      const dt = Math.min(raw, 50);

      try {
        updateRef.current(ctx, dt);
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
