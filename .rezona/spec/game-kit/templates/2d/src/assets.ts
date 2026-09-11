// ── Asset registry — you own and maintain this file (koubou) ──
//
// Generate assets with the media tool into src/assets/, then register them here, e.g.
// `import hero from './assets/hero.png'` then `ASSETS.hero = hero`. The import is what makes
// Vite bundle the file into the build — assets are served from the version's self-contained
// dist under a deep CDN path, so import-based references are the only ones that resolve.
// See references/contracts/global.md → "Asset generation (koubou)".

// Per-asset metadata: isSprite=true means a 3×3 = 9-frame spritesheet; isSprite=false means generation failed
// and was degraded to a static image (drawAsset automatically falls back to whole-image drawing).
// Assets not present in this map are treated as plain static images — the default, no declaration needed.
export type AssetMeta = {
  isSprite?: boolean;
  cols?: number;
  rows?: number;
  frameCount?: number;
};

export const ASSETS: Record<string, string> = {};

export const ASSET_META: Record<string, AssetMeta> = {};
