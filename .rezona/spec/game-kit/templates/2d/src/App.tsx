// ──────────────────────────────────────────────
// App.tsx — thin shell that wires lib hooks to the game controller.
//
// Agent-writable boundary:
//   - src/App.tsx         (this file — only edit if you need to add a new hook
//                          or restructure the render tree)
//   - src/game/**         (schema, state, controller, render, UI, and any
//                          brief-specific modules)
//
// Engine layer (immutable):
//   - src/lib/**          (audio, input, runtime, canvas, device, editable)
//   - src/main.tsx, src/index.css   (src/assets.ts is YOURS — register generated assets there)
// ──────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useGameConfig, useInput, useLoop, useScreen, type Phase } from './lib';
import { GameController } from './game/controller';
import { SCHEMA } from './game/schema';
import { Hud } from './game/ui/Hud';

export default function App() {
  const { screenRef, containerRef } = useScreen();
  const input = useInput();
  const { configRef } = useGameConfig(SCHEMA);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>('ACTIVE');

  // Game lives in a ref so it survives React re-renders.
  const gameRef = useRef<GameController | null>(null);
  if (!gameRef.current) gameRef.current = new GameController();

  // One-time init / dispose — separate from useLoop so resources outlive
  // canvasRef-dependent loop setup.
  useEffect(() => {
    const game = gameRef.current!;
    game.init();
    return () => game.dispose();
  }, []);

  useLoop(canvasRef, phaseRef, (ctx, dt) => {
    gameRef.current!.tick(ctx, dt, {
      input,
      screen: screenRef.current,
      config: configRef.current,
      phaseRef,
    });
  });

  return (
    <div
      ref={containerRef}
      {...input.handlers}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        touchAction: 'none',
        background: 'var(--bg-color, #0b0d12)',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <Hud phaseRef={phaseRef} gameRef={gameRef} />
    </div>
  );
}
