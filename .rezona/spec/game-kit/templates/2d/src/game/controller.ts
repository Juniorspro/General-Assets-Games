// ══════════════════════════════════════════════
// GameController — pure-TS class, zero React.
// App.tsx instantiates it once via useRef and forwards each frame to tick().
// Keep runtime state on `this.state`; add modules only when the brief needs them.
// ══════════════════════════════════════════════

import { createInitialState, type GameState } from './state';
import { renderScene } from './systems/render';
import type { TickContext } from './types';

export class GameController {
  private state: GameState = createInitialState();

  /**
   * Called once on mount. Acquire non-platform resources (streams, listeners), seed entities.
   * Gameplay BGM is platform-managed (autoplays from game.config.json) — do NOT bgm.play()
   * it here. Only event-BGM swap setup (boss/victory/defeat) belongs here, if any.
   */
  init(): void {
    // ── Agent: one-time setup ──
    // Example:
    // this.state.focalPoint = { x: 100, y: 100, vx: 0, vy: 0 };
  }

  /** Called every frame while phaseRef.current === 'ACTIVE'. dt is in milliseconds. */
  tick(ctx: CanvasRenderingContext2D, dt: number, c: TickContext): void {
    const dts = dt / 1000;
    this.state.frame += 1;
    this.state.elapsed += dts;

    renderScene(ctx, this.state, c);
  }

  /**
   * Called on unmount / HMR. Release listeners, drop streams.
   * Do NOT bgm.stop() the gameplay track — it is platform-managed. Stop only an
   * in-flight event-BGM swap if one is active.
   */
  dispose(): void {
    // ── Agent: cleanup ──
  }

  /** Read-only snapshot for the HUD. */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /** Reset state without re-instantiating the controller (used by Hud's reset path). */
  reset(): void {
    this.state = createInitialState();
  }
}
