// ══════════════════════════════════════════════
// EDITABLE schema — agent declares all tunable params here.
// Consumed by useGameConfig(); serialized into <script type="application/x-game-config">
// for the external editor. Add/remove fields freely; types are inferred.
// ══════════════════════════════════════════════

import type { EditableSchema } from '../lib';

export const SCHEMA = {
  bgColor: {
    type: 'color',
    label: 'Background',
    default: '#0b0d12',
    cssVar: '--bg-color',
  },
  fgColor: {
    type: 'color',
    label: 'Foreground',
    default: '#e6e8ec',
    cssVar: '--fg-color',
  },
} satisfies EditableSchema;

export type Config = { [K in keyof typeof SCHEMA]: (typeof SCHEMA)[K]['default'] };
