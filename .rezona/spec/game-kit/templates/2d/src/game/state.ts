// ══════════════════════════════════════════════
// Game state — entity types + initial-state factory.
// Mutable plain objects are intentional: every system mutates `state` in place
// each tick. No immutability, no React state — runs at 60fps without GC churn.
// ══════════════════════════════════════════════

export interface GameState {
  frame: number;
  elapsed: number;
  statusValue: number;

  // ── Agent: declare entities here ──
  // Examples:
  // focalPoint: { x: number; y: number; vx: number; vy: number };
  // markers: Array<{ x: number; y: number; label: string; active: boolean }>;
  // particles: Array<{ x: number; y: number; life: number; color: string }>;
}

export function createInitialState(): GameState {
  return {
    frame: 0,
    elapsed: 0,
    statusValue: 0,

    // ── Agent: declare returns here ──
    // focalPoint: { x: 100, y: 100, vx: 0, vy: 0 },
    // markers: [],
    // particles: [],
  };
}
