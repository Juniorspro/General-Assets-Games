// ── Asset registry — you own and maintain this file (koubou) ──
//
// Generate assets with the media tool into src/assets/, then register them here, e.g.
// `import subject from './assets/subject.glb'` then `ASSETS.subject = subject`. The import is what makes
// Vite bundle the file into the build — assets are served from the version's self-contained
// dist under a deep CDN path, so import-based references are the only ones that resolve.
// See references/contracts/global.md → "Asset generation (koubou)".

export type AssetMeta = {
  isSprite?: boolean;
  cols?: number;
  rows?: number;
  frameCount?: number;
};

export const ASSETS: Record<string, string> = {};

export const ASSET_META: Record<string, AssetMeta> = {};
