export type AssetMetaMap = Record<string, { isSprite?: boolean }>;

let assetMeta: AssetMetaMap = {};

export function configureAssetMeta(meta: AssetMetaMap): void {
  assetMeta = meta;
}

// ══════════════════════════════════════════════
// Canvas drawing utilities (all null-safe; silently skip when img is undefined)
// ══════════════════════════════════════════════

export function drawImg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  x: number, y: number, w: number, h: number,
): void {
  if (!img || !img.naturalWidth) return;
  ctx.drawImage(img, x, y, w, h);
}

export function drawRotated(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  cx: number, cy: number, w: number, h: number, angle: number,
): void {
  if (!img || !img.naturalWidth) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  x: number, y: number, w: number, h: number, flipX = false,
): void {
  if (!img || !img.naturalWidth) return;
  ctx.save();
  if (flipX) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
}

export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  cw: number, ch: number,
): void {
  if (!img || !img.naturalWidth) return;
  const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

// ══════════════════════════════════════════════
// Spritesheet frame slice (crop a single frame from a grid by index)
// ══════════════════════════════════════════════

export function drawSheetFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  frame: number,
  cols: number,
  rows: number,
  x: number, y: number,
  w: number, h: number,
  flipX = false,
): void {
  if (!img || !img.naturalWidth) return;
  const fw = img.naturalWidth / cols;
  const fh = img.naturalHeight / rows;
  const sx = (frame % cols) * fw;
  const sy = Math.floor(frame / cols) * fh;
  // Inset the source rect to avoid bilinear interpolation bleeding pixels from neighboring frames
  const inset = 2;
  ctx.save();
  if (flipX) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx + inset, sy + inset, fw - inset * 2, fh - inset * 2, 0, 0, w, h);
  } else {
    ctx.drawImage(img, sx + inset, sy + inset, fw - inset * 2, fh - inset * 2, x, y, w, h);
  }
  ctx.restore();
}

// ══════════════════════════════════════════════
// drawAsset — dispatches to drawSheetFrame / drawSprite based on ASSET_META
//   When spritesheet generation fails, assembly writes ASSET_META[name] = { isSprite: false },
//   and drawAsset transparently falls back to whole-image drawing — callers need not care.
// ══════════════════════════════════════════════

export function drawAsset(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  name: string,
  frame: number,
  cols: number,
  rows: number,
  x: number, y: number,
  w: number, h: number,
  flipX = false,
): void {
  if (!img || !img.naturalWidth) return;
  const meta = assetMeta[name];
  if (meta && meta.isSprite === false) {
    // Fallback: spritesheet generation failed and has been replaced by a 1:1 static image — draw whole image
    drawSprite(ctx, img, x, y, w, h, flipX);
    return;
  }
  drawSheetFrame(ctx, img, frame, cols, rows, x, y, w, h, flipX);
}
