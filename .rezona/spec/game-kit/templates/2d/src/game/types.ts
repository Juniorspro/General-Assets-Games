// ══════════════════════════════════════════════
// Shared types — agent owns this file
// Decoupled from controller.ts so any added runtime module can depend on
// TickContext without forming a cycle through the controller.
// ══════════════════════════════════════════════

import type { MutableRefObject } from 'react';
import type { Input, Phase, Screen } from '../lib';
import type { Config } from './schema';

export interface TickContext {
  input: Input;
  screen: Screen;
  config: Config;
  phaseRef: MutableRefObject<Phase>;
}
