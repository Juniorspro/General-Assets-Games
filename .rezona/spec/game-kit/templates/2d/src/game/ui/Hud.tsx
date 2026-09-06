// ══════════════════════════════════════════════
// HUD — React overlay above the canvas.
// Reads phase via low-frequency polling so the HUD is NOT a 60fps subscriber;
// the canvas owns the hot path, the HUD only re-renders on phase/status changes.
// ══════════════════════════════════════════════

import { useEffect, useState, type MutableRefObject, type RefObject } from 'react';
import type { Phase } from '../../lib';
import type { GameController } from '../controller';

interface HudProps {
  phaseRef: MutableRefObject<Phase>;
  gameRef: RefObject<GameController>;
}

export function Hud({ phaseRef, gameRef }: HudProps) {
  const [phase, setPhase] = useState<Phase>(phaseRef.current);
  const [statusValue, setStatusValue] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (phaseRef.current !== phase) setPhase(phaseRef.current);
      const nextStatus = gameRef.current?.getState().statusValue ?? 0;
      setStatusValue((prev) => (prev !== nextStatus ? nextStatus : prev));
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, phaseRef, gameRef]);

  const reset = () => {
    gameRef.current?.reset();
    phaseRef.current = 'ACTIVE';
    setPhase('ACTIVE');
  };

  // SCAFFOLD-PLACEHOLDER-BEGIN: hud-visible-shell
  return (
    <div style={statusStyle}>
      <span>status {statusValue}</span>
      {phase === 'ENDED' && (
        <button style={buttonStyle} onClick={reset}>Reset</button>
      )}
    </div>
  );
  // SCAFFOLD-PLACEHOLDER-END: hud-visible-shell
}

const statusStyle: React.CSSProperties = {
  position: 'absolute', top: 16, left: 16,
  display: 'flex', alignItems: 'center', gap: 8,
  color: 'var(--fg-color, #e6e8ec)',
  fontFamily: 'monospace', fontSize: '1.25rem',
  pointerEvents: 'none', userSelect: 'none',
};

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem', fontSize: '1rem',
  background: '#fff', color: '#000', border: 'none', borderRadius: 4,
  cursor: 'pointer', pointerEvents: 'auto',
};
