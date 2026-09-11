// ══════════════════════════════════════════════
// Render system — draw the world to the 2D context.
// Coordinates are CSS px (DPR scaling already applied by useLoop).
// Use lib/canvas.ts helpers (drawAsset / drawSprite / drawSheetFrame) to
// transparently fall back when a spritesheet failed to generate.
// ══════════════════════════════════════════════

import type { GameState } from '../state';
import type { TickContext } from '../types';

export function renderScene(
  ctx: CanvasRenderingContext2D,
  _state: GameState,
  c: TickContext,
): void {
  // Background fill comes from the 'bgColor' editable schema field
  ctx.fillStyle = c.config.bgColor;
  ctx.fillRect(0, 0, c.screen.w, c.screen.h);

  // SCAFFOLD-PLACEHOLDER-BEGIN: main-visual
  // ── Agent: draw entities here ──
  // Example:
  // drawAsset(ctx, IMG.marker, 'marker', frame, 8, 1, state.focalPoint.x, state.focalPoint.y, 32, 32);
  // for (const marker of state.markers) {
  //   if (!marker.active) continue;
  //   ctx.fillStyle = c.config.fgColor;
  //   ctx.fillRect(marker.x - 6, marker.y - 6, 12, 12);
  // }

  // Placeholder centerpiece so `bun dev` shows something before the agent runs
  ctx.fillStyle = c.config.fgColor;
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Waiting for agent…', c.screen.cx, c.screen.cy);
  // SCAFFOLD-PLACEHOLDER-END: main-visual
}
