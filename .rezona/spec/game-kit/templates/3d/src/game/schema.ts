// ══════════════════════════════════════════════
// EDITABLE schema — the external editor reads these foundation tunables.
// Add gameplay-specific public parameters as needed; keep internal feel
// constants at the top of the system that owns them.
// ══════════════════════════════════════════════

import type { EditableSchema } from '@rezona/core/3d';

export const SCHEMA = {
  bgColor: {
    type: 'color',
    label: 'Background',
    default: '#cfd8e6',
    cssVar: '--bg-color',
  },
  fgColor: {
    type: 'color',
    label: 'Foreground',
    default: '#0b0d12',
    cssVar: '--fg-color',
  },
  rotationRate: {
    type: 'number',
    label: 'Rotation Rate',
    default: 0.8,
    min: 0,
    max: 3,
    step: 0.1,
  },
} satisfies EditableSchema;

export type Config = { [K in keyof typeof SCHEMA]: (typeof SCHEMA)[K]['default'] };
