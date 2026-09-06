/* ══════════════════════ EL DIBUJO ══════════════════════ */
import * as T from 'three';

/* ══════════ EL ATLAS ══════════
   Las cien y pico de texturas se dibujan por codigo en UN lienzo de 512 y se
   suben una sola vez: cien imagenes serian cien descargas y cien subidas a la
   GPU para dibujar pixel art de 32, que es justo lo que el codigo hace bien.

   ── SIN MIPMAPS Y CON NEAREST EN LAS DOS PUNTAS ──
   Un atlas con mipmaps mezcla la baldosa de al lado en cuanto la camara se
   aleja: aparecen bordes de otro bloque adentro de cada cara. Y NEAREST es
   ademas el aspecto que se busca. Lo que se paga es aliasing a distancia, y por
   eso la UV se mete media texel para adentro. */
const TL = 32, ATL = 16, ATLPX = TL*ATL;
const TILES = {};           /* nombre -> indice de baldosa */
let atlasCv = null, atlasTex = null, nTile = 0;

function tileCtx(nom){
  const i = nTile++;
  TILES[nom] = i;
  const c = atlasCv.getContext('2d');
  c.save(); c.translate((i % ATL)*TL, Math.floor(i/ATL)*TL);
  c.beginPath(); c.rect(0, 0, TL, TL); c.clip();
  return c;
}
function hex(v){ return '#' + v.toString(16).padStart(6, '0'); }
function mez(a, b, k){
  const ar = (a>>16)&255, ag = (a>>8)&255, ab = a&255;
  const br = (b>>16)&255, bg = (b>>8)&255, bb = b&255;
  return (Math.round(ar+(br-ar)*k)<<16) | (Math.round(ag+(bg-ag)*k)<<8) | Math.round(ab+(bb-ab)*k);
}
/* un azar propio y con semilla: el atlas tiene que salir IGUAL en cada carga, y
   `az()` es el del juego —gastarlo aca correria todos los sorteos de la partida */
let SA = 12345;
function ra(){ SA ^= SA << 13; SA ^= SA >>> 17; SA ^= SA << 5; return ((SA >>> 0) % 100000)/100000; }

function pRuido(nom, c1, c2, dens, grano){
  const c = tileCtx(nom); SA = 9001 + nTile*77;
  c.fillStyle = hex(c1); c.fillRect(0, 0, TL, TL);
  const g = grano || 2, n = Math.round((dens || 0.35)*TL*TL/(g*g));
  for (let i = 0; i < n; i++){
    c.fillStyle = hex(mez(c1, c2, 0.35 + ra()*0.65));
    c.fillRect(Math.floor(ra()*TL/g)*g, Math.floor(ra()*TL/g)*g, g, g);
  }
  c.restore();
}
function pLadrillo(nom, c, junta, filas, corr){
  const ctx = tileCtx(nom); SA = 3001 + nTile*31;
  ctx.fillStyle = hex(junta); ctx.fillRect(0, 0, TL, TL);
  const h = TL/filas, w = TL/2;
  for (let f = 0; f < filas; f++){
    const off = (corr === false ? 0 : (f % 2)*w/2);
    for (let k = -1; k < 3; k++){
      ctx.fillStyle = hex(mez(c, 0x000000, ra()*0.16));
      ctx.fillRect(k*w + off + 1, f*h + 1, w - 2, h - 2);
    }
  }
  ctx.restore();
}
function pTabla(nom, c1, c2, filas){
  const ctx = tileCtx(nom); SA = 5001 + nTile*13;
  const h = TL/(filas || 4);
  for (let f = 0; f < (filas || 4); f++){
    ctx.fillStyle = hex(mez(c1, c2, ra()*0.5));
    ctx.fillRect(0, f*h, TL, h);
    ctx.fillStyle = hex(mez(c1, 0x000000, 0.35));
    ctx.fillRect(0, f*h + h - 1, TL, 1);
    for (let i = 0; i < 5; i++){
      ctx.fillStyle = hex(mez(c1, c2, 0.6 + ra()*0.4));
      ctx.fillRect(Math.floor(ra()*TL), f*h + 1 + Math.floor(ra()*(h - 2)), 2 + Math.floor(ra()*6), 1);
    }
  }
  ctx.restore();
}
function pTronco(nom, c1, c2){
  const ctx = tileCtx(nom); SA = 7001 + nTile*17;
  ctx.fillStyle = hex(c1); ctx.fillRect(0, 0, TL, TL);
  for (let x = 0; x < TL; x += 2){
    ctx.fillStyle = hex(mez(c1, c2, ra()));
    ctx.fillRect(x, 0, 2, TL);
  }
  for (let i = 0; i < 14; i++){
    ctx.fillStyle = hex(mez(c1, 0x000000, 0.3 + ra()*0.3));
    ctx.fillRect(Math.floor(ra()*TL/2)*2, Math.floor(ra()*TL), 2, 2 + Math.floor(ra()*5));
  }
  ctx.restore();
}
function pAnillos(nom, c1, c2){
  const ctx = tileCtx(nom); SA = 8101 + nTile*19;
  ctx.fillStyle = hex(c1); ctx.fillRect(0, 0, TL, TL);
  for (let r = 14; r > 0; r -= 3){
    ctx.strokeStyle = hex(mez(c1, c2, 0.3 + ra()*0.5)); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(16, 16, r, 0, 6.283); ctx.stroke();
  }
  ctx.restore();
}
function pHojas(nom, c1, c2){
  const ctx = tileCtx(nom); SA = 6101 + nTile*23;
  ctx.fillStyle = hex(c1); ctx.fillRect(0, 0, TL, TL);
  for (let i = 0; i < 190; i++){
    ctx.fillStyle = hex(mez(c1, c2, ra()));
    ctx.fillRect(Math.floor(ra()*TL/2)*2, Math.floor(ra()*TL/2)*2, 2, 2);
  }
  for (let i = 0; i < 16; i++){
    ctx.fillStyle = hex(mez(c1, 0x000000, 0.55));
    ctx.fillRect(Math.floor(ra()*TL/2)*2, Math.floor(ra()*TL/2)*2, 2, 2);
  }
  ctx.restore();
}
function pLana(nom, c){
  const ctx = tileCtx(nom); SA = 4101 + nTile*29;
  ctx.fillStyle = hex(c); ctx.fillRect(0, 0, TL, TL);
  for (let y = 0; y < TL; y += 4) for (let x = 0; x < TL; x += 4){
    const k = ((x/4 + y/4) % 2) ? 0.10 : -0.10;
    ctx.fillStyle = hex(k > 0 ? mez(c, 0xffffff, k) : mez(c, 0x000000, -k));
    ctx.fillRect(x, y, 4, 4);
  }
  for (let i = 0; i < 60; i++){
    ctx.fillStyle = hex(mez(c, ra() > 0.5 ? 0xffffff : 0x000000, 0.10 + ra()*0.10));
    ctx.fillRect(Math.floor(ra()*TL), Math.floor(ra()*TL), 2, 1);
  }
  ctx.restore();
}
function pHorm(nom, c){
  const ctx = tileCtx(nom); SA = 2101 + nTile*37;
  ctx.fillStyle = hex(c); ctx.fillRect(0, 0, TL, TL);
  for (let i = 0; i < 70; i++){
    ctx.fillStyle = hex(mez(c, ra() > 0.5 ? 0xffffff : 0x000000, 0.04 + ra()*0.05));
    ctx.fillRect(Math.floor(ra()*TL), Math.floor(ra()*TL), 2, 2);
  }
  ctx.restore();
}
/* ── EL VIDRIO SE DIBUJA CON ALFA DE VERDAD ──
   Un vidrio pintado de celeste opaco no es vidrio: lo que lo hace vidrio es que
   se vea lo que hay atras. El marco va opaco y el centro casi transparente. */
function pVidrio(nom, c){
  const ctx = tileCtx(nom);
  ctx.clearRect(0, 0, TL, TL);
  ctx.fillStyle = 'rgba(' + ((c>>16)&255) + ',' + ((c>>8)&255) + ',' + (c&255) + ',0.20)';
  ctx.fillRect(0, 0, TL, TL);
  ctx.fillStyle = hex(mez(c, 0xffffff, 0.45));
  ctx.fillRect(0, 0, TL, 2); ctx.fillRect(0, TL - 2, TL, 2);
  ctx.fillRect(0, 0, 2, TL); ctx.fillRect(TL - 2, 0, 2, TL);
  ctx.globalAlpha = 0.55; ctx.fillRect(2, 2, 12, 2); ctx.fillRect(2, 4, 2, 8);
  ctx.restore();
}
function pMineral(nom, base, gema){
  const ctx = tileCtx(nom); SA = 1101 + nTile*41;
  ctx.fillStyle = hex(base); ctx.fillRect(0, 0, TL, TL);
  for (let i = 0; i < 90; i++){
    ctx.fillStyle = hex(mez(base, 0x000000, ra()*0.3));
    ctx.fillRect(Math.floor(ra()*TL/2)*2, Math.floor(ra()*TL/2)*2, 2, 2);
  }
  for (let g = 0; g < 5; g++){
    const cx = 3 + Math.floor(ra()*24), cy = 3 + Math.floor(ra()*24), s = 4 + Math.floor(ra()*4);
    for (let y = 0; y < s; y += 2) for (let x = 0; x < s; x += 2){
      if (ra() < 0.3) continue;
      ctx.fillStyle = hex(mez(gema, 0xffffff, ra()*0.4));
      ctx.fillRect(cx + x, cy + y, 2, 2);
    }
  }
  ctx.restore();
}
function pMetal(nom, c){
  const ctx = tileCtx(nom); SA = 1901 + nTile*43;
  ctx.fillStyle = hex(c); ctx.fillRect(0, 0, TL, TL);
  for (let i = 0; i < 26; i++){
    ctx.fillStyle = hex(mez(c, 0xffffff, 0.12 + ra()*0.3));
    ctx.fillRect(Math.floor(ra()*TL), Math.floor(ra()*TL), 2 + Math.floor(ra()*8), 2);
  }
  ctx.strokeStyle = hex(mez(c, 0x000000, 0.35)); ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, TL - 2, TL - 2);
  ctx.restore();
}

function armaAtlas(){
  atlasCv = document.createElement('canvas');
  atlasCv.width = atlasCv.height = ATLPX;
  const c0 = atlasCv.getContext('2d');
  c0.imageSmoothingEnabled = false;
  c0.fillStyle = '#ff00ff'; c0.fillRect(0, 0, ATLPX, ATLPX);   /* magenta = baldosa sin pintar */

  /* natural */
  pRuido('pastoT', 0x5d9b3a, 0x7ec24f, 0.55, 2);
  { const c = tileCtx('pastoL'); SA = 501;
    c.fillStyle = hex(0x8a6a45); c.fillRect(0, 0, TL, TL);
    for (let i = 0; i < 120; i++){ c.fillStyle = hex(mez(0x8a6a45, 0x6b4f31, ra())); c.fillRect(Math.floor(ra()*TL/2)*2, 6 + Math.floor(ra()*26/2)*2, 2, 2); }
    for (let x = 0; x < TL; x += 2){ const h = 4 + Math.floor(ra()*6); c.fillStyle = hex(mez(0x5d9b3a, 0x7ec24f, ra())); c.fillRect(x, 0, 2, h); }
    c.restore(); }
  pRuido('tierra',   0x8a6a45, 0x6b4f31, 0.5, 2);
  pRuido('caminoT',  0x9a8468, 0x7d6a53, 0.45, 2);
  pRuido('arena',    0xdbd0a0, 0xc4b98a, 0.4, 2);
  pRuido('grava',    0x8a8a8a, 0x5c5c5c, 0.6, 2);
  pRuido('nieve',    0xf2f6f8, 0xdbe6ec, 0.3, 2);
  { const c = tileCtx('hielo'); c.fillStyle = hex(0x8ab6e8); c.fillRect(0, 0, TL, TL); SA = 611;
    for (let i = 0; i < 18; i++){ c.strokeStyle = hex(mez(0x8ab6e8, 0xffffff, 0.3 + ra()*0.5)); c.lineWidth = 2;
      c.beginPath(); const x = ra()*TL, y = ra()*TL; c.moveTo(x, y); c.lineTo(x + (ra()-0.5)*20, y + (ra()-0.5)*20); c.stroke(); }
    c.restore(); }
  pHojas('hojas',  0x4c8a2e, 0x76b64a);
  pHojas('hojasO', 0xb1541d, 0xd8912e);   /* otoño: el nombre del bloque dice otoño */
  { const c = tileCtx('cactus'); c.fillStyle = hex(0x3f7a3a); c.fillRect(0, 0, TL, TL); SA = 711;
    for (let x = 2; x < TL; x += 8){ c.fillStyle = hex(0x2e5c2b); c.fillRect(x, 0, 2, TL); }
    for (let i = 0; i < 22; i++){ c.fillStyle = hex(0xd9e6c0); c.fillRect(Math.floor(ra()*TL), Math.floor(ra()*TL), 2, 2); }
    c.restore(); }
  pRuido('cactusT', 0x54a04a, 0x3f7a3a, 0.4, 2);
  { const c = tileCtx('calabaza'); c.fillStyle = hex(0xd8801f); c.fillRect(0, 0, TL, TL);
    for (let x = 3; x < TL; x += 7){ c.fillStyle = hex(0xb35f10); c.fillRect(x, 0, 2, TL); }
    c.fillStyle = hex(0x2c1b08); c.fillRect(7, 9, 4, 6); c.fillRect(21, 9, 4, 6);
    c.fillRect(9, 20, 14, 4); c.fillRect(13, 17, 6, 3); c.restore(); }
  pRuido('calabazaT', 0xc4741c, 0x8f550f, 0.4, 2);
  pRuido('melon',   0x4f7a25, 0x2f5416, 0.5, 4);
  pRuido('melonT',  0x7ea23f, 0x5d7c2c, 0.4, 4);
  { const c = tileCtx('hongo'); c.fillStyle = hex(0xc9433a); c.fillRect(0, 0, TL, TL); SA = 811;
    for (let i = 0; i < 7; i++){ c.fillStyle = hex(0xf0ece2); const s = 4 + Math.floor(ra()*4)*2;
      c.fillRect(Math.floor(ra()*(TL-s)), Math.floor(ra()*(TL-s)), s, s); }
    c.restore(); }
  pRuido('musgo',   0x54703a, 0x39512a, 0.55, 2);
  /* piedra */
  pRuido('piedra',   0x7d7d7d, 0x646464, 0.45, 2);
  pRuido('adoquin',  0x7a7a7a, 0x4f4f4f, 0.7, 4);
  pLadrillo('ladriP',  0x7b7b7b, 0x5c5c5c, 4);
  pLadrillo('ladriPM', 0x6f7a6a, 0x4e564b, 4);
  pLadrillo('ladrillo',0xa3584a, 0x8c8378, 4);
  pRuido('arenisca',  0xd7cba0, 0xc2b58c, 0.25, 2);
  { const c = tileCtx('areniscaT'); c.fillStyle = hex(0xdbd0a8); c.fillRect(0, 0, TL, TL);
    c.fillStyle = hex(0xc2b58c); for (let y = 0; y < TL; y += 8) c.fillRect(0, y, TL, 2); c.restore(); }
  pRuido('andesita', 0x8b8b8b, 0x767676, 0.5, 2);
  pRuido('diorita',  0xdcdcdc, 0xb4b4b4, 0.5, 2);
  pRuido('granito',  0xb0715c, 0x96604e, 0.5, 2);
  pRuido('pizarra',  0x4c4c50, 0x3a3a3e, 0.5, 2);
  { const c = tileCtx('obsidiana'); c.fillStyle = hex(0x120c1c); c.fillRect(0, 0, TL, TL); SA = 911;
    for (let i = 0; i < 30; i++){ c.fillStyle = hex(mez(0x120c1c, 0x6a3fa0, 0.3 + ra()*0.5));
      c.fillRect(Math.floor(ra()*TL), Math.floor(ra()*TL), 2, 2); } c.restore(); }
  pRuido('basalto',  0x4a4a52, 0x35353c, 0.5, 2);
  pRuido('basaltoT', 0x5a5a62, 0x3d3d44, 0.4, 2);
  pRuido('cuarzo',   0xecebe4, 0xd9d7cb, 0.25, 2);
  pRuido('terracota',0xa0563a, 0x8a4a32, 0.4, 2);
  pRuido('rojiza',   0x8f4b2e, 0x6f3a24, 0.5, 2);
  pRuido('prismarina',0x5fa39a, 0x3f7d78, 0.55, 4);
  /* madera */
  pTronco('troncoR', 0x6b5334, 0x8a6c46); pAnillos('troncoT',  0xb08a55, 0x8a6c46);
  pTronco('troncoO', 0x3f3226, 0x584835); pAnillos('troncoOT', 0x8a7355, 0x5f4d38);
  pTronco('troncoA', 0xd8d3cb, 0x8f8a80); pAnillos('troncoAT', 0xd9c9a0, 0xb0a077);
  pTabla('tablaR', 0xa4813f, 0xbb9755, 4);
  pTabla('tablaO', 0x4a3826, 0x5e4a33, 4);
  pTabla('tablaA', 0xd6cfc0, 0xbdb5a4, 4);
  pTabla('tablaN', 0x6d3a4d, 0x8a4c62, 4);
  { const c = tileCtx('bambu'); c.fillStyle = hex(0xc6c144); c.fillRect(0, 0, TL, TL);
    c.fillStyle = hex(0x8d8a2e); for (let y = 0; y < TL; y += 10) c.fillRect(0, y, TL, 2);
    c.fillStyle = hex(0xdedb7a); c.fillRect(4, 0, 2, TL); c.fillRect(20, 0, 2, TL); c.restore(); }
  /* metal y mineral */
  pMetal('hierro',   0xd6d6d6); pMetal('oro', 0xf6d02f); pMetal('cobre', 0xc06b45);
  pMetal('diamante', 0x54dbd2); pMetal('esmeralda', 0x2fbb4a);
  pMineral('lapis',    0x7d7d7d, 0x2151a8);
  pMineral('carbon',   0x7d7d7d, 0x1a1a1a);
  pMineral('redstone', 0x7d7d7d, 0xd11a1a);
  /* luz y liquido */
  { const c = tileCtx('luminosa'); c.fillStyle = hex(0xb59355); c.fillRect(0, 0, TL, TL); SA = 1201;
    for (let i = 0; i < 26; i++){ c.fillStyle = hex(mez(0xffe9a8, 0xffffff, ra()*0.6));
      c.fillRect(Math.floor(ra()*TL/2)*2, Math.floor(ra()*TL/2)*2, 4, 4); } c.restore(); }
  { const c = tileCtx('linterna'); c.fillStyle = hex(0x3a3026); c.fillRect(0, 0, TL, TL);
    c.fillStyle = hex(0xffd479); c.fillRect(6, 6, 20, 20);
    c.fillStyle = hex(0xfff3c4); c.fillRect(10, 10, 12, 12);
    c.fillStyle = hex(0x2a231b); c.fillRect(14, 0, 4, 6); c.restore(); }
  { const c = tileCtx('lava'); c.fillStyle = hex(0xd94a12); c.fillRect(0, 0, TL, TL); SA = 1301;
    for (let i = 0; i < 40; i++){ c.fillStyle = hex(mez(0xd94a12, 0xffd23a, ra()));
      c.fillRect(Math.floor(ra()*TL/2)*2, Math.floor(ra()*TL/2)*2, 4, 2); } c.restore(); }
  { const c = tileCtx('fuego'); c.fillStyle = hex(0xe86a15); c.fillRect(0, 0, TL, TL); SA = 1401;
    for (let i = 0; i < 34; i++){ c.fillStyle = hex(mez(0xffdc4a, 0xd12a0a, ra()));
      c.fillRect(Math.floor(ra()*TL/2)*2, Math.floor(ra()*TL/2)*2, 2, 4 + Math.floor(ra()*6)); } c.restore(); }
  { const c = tileCtx('agua');
    c.fillStyle = 'rgba(50,110,200,0.62)'; c.fillRect(0, 0, TL, TL); SA = 1501;
    for (let i = 0; i < 16; i++){ c.fillStyle = 'rgba(150,200,255,0.5)';
      c.fillRect(Math.floor(ra()*TL), Math.floor(ra()*TL), 6, 2); } c.restore(); }
  pVidrio('vidrio', 0xd8ecf4);
  { const c = tileCtx('farol'); c.fillStyle = hex(0x4a3a24); c.fillRect(0, 0, TL, TL);
    c.fillStyle = hex(0xffdf9a); c.fillRect(8, 4, 16, 22);
    c.fillStyle = hex(0x2f2416); c.fillRect(8, 4, 16, 2); c.fillRect(8, 24, 16, 2);
    c.fillRect(15, 4, 2, 22); c.restore(); }
  /* los cuarenta y ocho de color */
  for (const [c, v] of COLORES) pLana('lana_' + c, v);
  for (const [c, v] of COLORES) pHorm('horm_' + c, v);
  for (const [c, v] of COLORES) pVidrio('vid_' + c, mez(v, 0xffffff, 0.35));

  atlasTex = new T.CanvasTexture(atlasCv);
  atlasTex.magFilter = T.NearestFilter;
  atlasTex.minFilter = T.NearestFilter;
  atlasTex.generateMipmaps = false;
  atlasTex.colorSpace = T.SRGBColorSpace;
  return nTile;
}
/* nombre -> [u0,v0,u1,v1], metido media texel para adentro */
function uvDe(nom){
  const i = TILES[nom] != null ? TILES[nom] : 0;
  const cx = i % ATL, cy = Math.floor(i/ATL), s = 1/ATL, e = 0.5/ATLPX;
  return [cx*s + e, 1 - (cy + 1)*s + e, (cx + 1)*s - e, 1 - cy*s - e];
}
/* cache: bloque -> [uv de cada una de las seis caras] */
let UVB = null;
function armaUV(){
  UVB = BLOQUES.map(B => {
    if (!B.tex) return null;
    const t = Array.isArray(B.tex) ? B.tex : [B.tex, B.tex, B.tex];
    const [arr, lat, aba] = t;
    /* orden de caras: +x, -x, +y, -y, +z, -z */
    return [uvDe(lat), uvDe(lat), uvDe(arr), uvDe(aba), uvDe(lat), uvDe(lat)];
  });
}

/* ══════════ LA MALLA ══════════
   ── LA OCLUSION AMBIENTAL POR VERTICE ES LO QUE HACE QUE UN VOXEL SE VEA ──
   Sin ella, un muro y un rincon se dibujan del mismo gris y la obra se lee a
   maqueta de papel. Es la cuenta clasica: por cada esquina de cada cara se
   miran sus TRES vecinos —los dos costados y la diagonal— y si los dos costados
   estan llenos la esquina va al minimo, porque ahi no entra luz de ningun lado.
   Cuesta tres consultas por esquina y se calcula al construir, no por cuadro. */
const CARAS = [
  { d: [ 1, 0, 0], v: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], sh: 0.80 },
  { d: [-1, 0, 0], v: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], sh: 0.80 },
  { d: [ 0, 1, 0], v: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]], sh: 1.00 },
  { d: [ 0,-1, 0], v: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]], sh: 0.52 },
  { d: [ 0, 0, 1], v: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], sh: 0.64 },
  { d: [ 0, 0,-1], v: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], sh: 0.64 }
];
/* los dos costados y la diagonal de cada esquina, por cara */
const AOV = [
  [[[0,-1,0],[0,0,-1],[0,-1,-1]],[[0,1,0],[0,0,-1],[0,1,-1]],[[0,1,0],[0,0,1],[0,1,1]],[[0,-1,0],[0,0,1],[0,-1,1]]],
  [[[0,-1,0],[0,0,1],[0,-1,1]],[[0,1,0],[0,0,1],[0,1,1]],[[0,1,0],[0,0,-1],[0,1,-1]],[[0,-1,0],[0,0,-1],[0,-1,-1]]],
  [[[-1,0,0],[0,0,-1],[-1,0,-1]],[[-1,0,0],[0,0,1],[-1,0,1]],[[1,0,0],[0,0,1],[1,0,1]],[[1,0,0],[0,0,-1],[1,0,-1]]],
  [[[-1,0,0],[0,0,1],[-1,0,1]],[[-1,0,0],[0,0,-1],[-1,0,-1]],[[1,0,0],[0,0,-1],[1,0,-1]],[[1,0,0],[0,0,1],[1,0,1]]],
  [[[1,0,0],[0,-1,0],[1,-1,0]],[[1,0,0],[0,1,0],[1,1,0]],[[-1,0,0],[0,1,0],[-1,1,0]],[[-1,0,0],[0,-1,0],[-1,-1,0]]],
  [[[-1,0,0],[0,-1,0],[-1,-1,0]],[[-1,0,0],[0,1,0],[-1,1,0]],[[1,0,0],[0,1,0],[1,1,0]],[[1,0,0],[0,-1,0],[1,-1,0]]]
];
/* ── LOS CUATRO ESCALONES NO ARRANCAN EN CERO ──
   La oclusion y el sombreado por cara se multiplican, asi que un rincon de una
   cara que ya viene al 0.62 termina en 0.26: eso no es un rincon oscuro, es un
   agujero. El piso se sube y el rango se achica; lo que se pierde en contraste
   se gana en poder ver lo que uno construyo. */
const AO_NIV = [0.52, 0.70, 0.86, 1.00];
function tapa(b){ return b && !BLOQUES[b].vidrio; }

let mallaS = null, mallaV = null, matS = null, matV = null;
function armaMalla(){
  const P = [[], []], Nm = [[], []], U = [[], []], C = [[], []], I = [[], []];
  const nv = [0, 0];
  for (let y = 0; y < ALTO; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++){
    const b = REJA[idx(x, y, z)]; if (!b) continue;
    const B = BLOQUES[b], k = B.vidrio ? 1 : 0, uvs = UVB[b];
    const luz = B.luz || 0;
    for (let f = 0; f < 6; f++){
      const F = CARAS[f], vx = x + F.d[0], vy = y + F.d[1], vz = z + F.d[2];
      const vb = bloqueEn(vx, vy, vz);
      /* una cara se dibuja si el vecino no tapa; y entre dos vidrios del MISMO
         bloque tampoco, o se ve una linea gris adentro del cristal */
      if (vb === b || tapa(vb)) continue;
      if (vy < 0 && !B.vidrio) { /* la cara de abajo del suelo no se ve nunca */ }
      const uv = uvs[f];
      for (let c = 0; c < 4; c++){
        const o = F.v[c];
        P[k].push(x + o[0], y + o[1], z + o[2]);
        Nm[k].push(F.d[0], F.d[1], F.d[2]);
        const a = AOV[f][c];
        let s1 = 0, s2 = 0, co = 0;
        s1 = tapa(bloqueEn(vx + a[0][0], vy + a[0][1], vz + a[0][2])) ? 1 : 0;
        s2 = tapa(bloqueEn(vx + a[1][0], vy + a[1][1], vz + a[1][2])) ? 1 : 0;
        co = tapa(bloqueEn(vx + a[2][0], vy + a[2][1], vz + a[2][2])) ? 1 : 0;
        const ao = (s1 && s2) ? 0 : 3 - (s1 + s2 + co);
        /* el bloque que emite luz no recibe ni sombra de cara ni oclusion: si la
           recibiera, una piedra luminosa se veria mas oscura del lado de abajo,
           que es justo lo contrario de lo que hace una lampara */
        const g = luz ? lerp(F.sh*AO_NIV[ao], 1.35, luz) : F.sh*AO_NIV[ao];
        C[k].push(g, g, g);
        U[k].push(c === 0 || c === 3 ? uv[0] : uv[2], c < 2 ? uv[1] : uv[3]);
      }
      const o = nv[k];
      I[k].push(o, o + 1, o + 2, o, o + 2, o + 3);
      nv[k] += 4;
    }
  }
  for (let k = 0; k < 2; k++){
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P[k], 3));
    g.setAttribute('normal',   new T.Float32BufferAttribute(Nm[k], 3));
    g.setAttribute('uv',       new T.Float32BufferAttribute(U[k], 2));
    g.setAttribute('color',    new T.Float32BufferAttribute(C[k], 3));
    g.setIndex(I[k]);
    g.computeBoundingSphere();
    const m = k ? mallaV : mallaS;
    if (m.geometry) m.geometry.dispose();
    m.geometry = g;
  }
  return { caras: (I[0].length + I[1].length)/6, vidrio: I[1].length/6 };
}

/* ══════════ LA ESCENA ══════════ */
let render, escena, cam, RT, postEsc, postCam, postMat, LUZSOL, SOMBRA_OK = true;
let gSuelo, gMarco, gMira, gFantasma, cielo, CVLIENZO;
let CAL = 'media', ESC = 1;

function armaEscena(lienzo){
  CVLIENZO = lienzo;
  render = new T.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance' });
  render.setPixelRatio(1);
  render.outputColorSpace = T.SRGBColorSpace;
  /* ── SIN TONE MAPPING, Y NO ES UN DESCUIDO ──
     ACES esta hecho para fotografia: comprime los medios tonos y baja el color,
     que es exactamente lo contrario de lo que pide un mundo de bloques de color
     plano. Medido, con ACES la pared de tabla de roble salia casi negra. */
  render.toneMapping = T.NoToneMapping;
  render.shadowMap.enabled = true;
  render.shadowMap.type = T.PCFSoftShadowMap;
  escena = new T.Scene();
  escena.fog = new T.Fog(0xbfd8ef, 40, 150);
  cam = new T.PerspectiveCamera(74, 1, 0.05, 400);

  armaAtlas(); armaUV();
  matS = new T.MeshLambertMaterial({ map: atlasTex, vertexColors: true });
  matV = new T.MeshLambertMaterial({ map: atlasTex, vertexColors: true,
    transparent: true, depthWrite: false, side: T.DoubleSide });
  mallaS = new T.Mesh(new T.BufferGeometry(), matS);
  mallaV = new T.Mesh(new T.BufferGeometry(), matV);
  mallaS.castShadow = true; mallaS.receiveShadow = true;
  escena.add(mallaS); escena.add(mallaV);

  /* ── EL SUELO NO ES PARTE DE LA PARCELA ──
     Se dibuja aparte, un poco mas grande, con un canto de piedra: eso es lo que
     hace que la parcela se LEA como una parcela y no como un pedazo de campo. */
  gSuelo = new T.Group(); escena.add(gSuelo);
  /* ── EL SUELO SE ARMA BALDOSA POR BALDOSA, NO CON UNA CAJA ──
     Con una `BoxGeometry` y las UV de una sola baldosa, los dieciseis metros de
     pasto son UNA foto estirada: medido en la captura, cada pixel de la textura
     media medio metro y el prado salia de cuadrados gigantes. Con el atlas no se
     puede usar `repeat` —muestrearia las baldosas de al lado— asi que la
     repeticion la pone la geometria: 256 cuadrados arriba mas los 64 del canto,
     que siguen siendo UNA malla y UNA llamada de dibujo. */
  const base = new T.Mesh(armaSuelo(), new T.MeshLambertMaterial({ map: atlasTex }));
  base.receiveShadow = true; gSuelo.add(base);
  const anillo = new T.Mesh(new T.BoxGeometry(N + 8, 1, N + 8),
    new T.MeshLambertMaterial({ color: 0x6f7d55 }));
  anillo.position.set(N/2, -1.5, N/2); anillo.receiveShadow = true; gSuelo.add(anillo);

  /* el marco de la parcela: cuatro lineas al ras, para saber donde termina */
  const pts = [];
  for (const [a, b] of [[[0,0],[N,0]],[[N,0],[N,N]],[[N,N],[0,N]],[[0,N],[0,0]]])
    pts.push(a[0], 0.02, a[1], b[0], 0.02, b[1]);
  const gl = new T.BufferGeometry(); gl.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  gMarco = new T.LineSegments(gl, new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
  escena.add(gMarco);

  /* la mira: el cubo que se va a romper, y el fantasma del que se va a poner */
  gMira = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.004, 1.004, 1.004)),
    new T.LineBasicMaterial({ color: 0x101010, transparent: true, opacity: 0.85 }));
  gMira.visible = false; escena.add(gMira);
  gFantasma = new T.Mesh(new T.BoxGeometry(0.92, 0.92, 0.92),
    new T.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.30, depthWrite: false }));
  gFantasma.visible = false; escena.add(gFantasma);

  /* ── LUZ ──
     Un hemisferico con el cielo arriba y el pasto abajo mas un sol. El
     hemisferico es lo que impide que la cara de abajo de un alero salga negra:
     el sol solo llega de una direccion. */
  /* ── EL PRESUPUESTO DE LUZ SALE DE UNA CUENTA, NO DE TANTEAR ──
     Lambert en three divide por pi, asi que un hemisferico de intensidad i
     aporta i/pi. Con la cara de arriba a 2.6/pi*0.87 + 0.79*1.5/pi = 1.09 y la
     de un costado en sombra a 0.55, una tabla de roble (albedo 0.6) queda en
     0.33 lineales por la cara y por la oclusion: 0.45 en pantalla, que es una
     pared en sombra y no un agujero negro. */
  escena.add(new T.HemisphereLight(0xd6e8fb, 0x8d9a72, 2.10));
  LUZSOL = new T.DirectionalLight(0xfff4e2, 1.85);
  LUZSOL.position.set(18, 28, 12);
  LUZSOL.castShadow = true;
  /* ── LA CAJA DE SOMBRA MIDE LO QUE MIDE LA PARCELA ──
     Un mapa de sombra cubre un area fija: con una caja del tamaño del mundo, la
     sombra de un bloque son cuatro pixeles temblando. Acotada a los 16 x 16 de
     la parcela, un mapa de 1024 da 45 texeles por metro. */
  const S = LUZSOL.shadow;
  S.camera.left = -16; S.camera.right = 16; S.camera.top = 22; S.camera.bottom = -8;
  S.camera.near = 1; S.camera.far = 90; S.bias = -0.0009; S.normalBias = 0.035;
  LUZSOL.target.position.set(N/2, 4, N/2);
  escena.add(LUZSOL); escena.add(LUZSOL.target);

  armaCielo();

  /* el post: se dibuja a un destino reducido y se estira. Lo que se gana es
     relleno, que en un telefono es lo unico que siempre paga. */
  RT = new T.WebGLRenderTarget(2, 2, { minFilter: T.LinearFilter, magFilter: T.LinearFilter });
  postEsc = new T.Scene();
  postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postMat = new T.ShaderMaterial({
    uniforms: { tDif: { value: RT.texture }, sat: { value: 1.12 }, vin: { value: 0.42 },
                fog: { value: 0.0 }, tint: { value: new T.Color(0xffffff) } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform sampler2D tDif; uniform float sat, vin, fog; uniform vec3 tint; varying vec2 vU;',
      /* ── LA CONVERSION A sRGB HAY QUE HACERLA A MANO ──
         three aplica `outputColorSpace` inyectando un include en SUS materiales;
         un ShaderMaterial propio escribe lo que uno le ponga, y lo que sale del
         destino de render esta en LINEAL. Sin esta linea todo el juego se
         muestra con gamma cruda: medido, la pared de tabla de roble salia casi
         negra y ninguna cantidad de luz la levantaba. */
      'vec3 aSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(max(c, vec3(0.0)), vec3(0.41666)) - 0.055, step(vec3(0.0031308), c)); }',
      'void main(){',
      '  vec3 c = texture2D(tDif, vU).rgb;',
      '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
      '  c = mix(vec3(l), c, sat);',
      '  vec2 d = (vU - 0.5)*vec2(1.0, 1.0);',
      '  float v = 1.0 - vin*dot(d, d)*1.9;',
      '  c *= clamp(v, 0.0, 1.0);',
      '  c = mix(c, tint, fog);',
      '  gl_FragColor = vec4(aSRGB(c), 1.0);',
      '}'
    ].join('\n')
  });
  postEsc.add(new T.Mesh(new T.PlaneGeometry(2, 2), postMat));
}

/* una baldosa de un metro por celda, con su UV del atlas */
function armaSuelo(){
  const P = [], Nn = [], U = [];
  const quad = (v0, v1, v2, v3, nor, uv) => {
    for (const v of [v0, v1, v2, v0, v2, v3]) P.push(v[0], v[1], v[2]);
    for (let i = 0; i < 6; i++) Nn.push(nor[0], nor[1], nor[2]);
    const [a0, b0, a1, b1] = uv;
    for (const [u, v] of [[a0,b1],[a1,b1],[a1,b0],[a0,b1],[a1,b0],[a0,b0]]) U.push(u, v);
  };
  const upa = uvDe('pastoT'), uti = uvDe('tierra');
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++)
    quad([x,0,z+1], [x+1,0,z+1], [x+1,0,z], [x,0,z], [0,1,0], upa);
  for (let i = 0; i < N; i++){
    quad([i,-1,N], [i+1,-1,N], [i+1,0,N], [i,0,N], [0,0,1], uti);
    quad([i+1,-1,0], [i,-1,0], [i,0,0], [i+1,0,0], [0,0,-1], uti);
    quad([N,-1,i+1], [N,-1,i], [N,0,i], [N,0,i+1], [1,0,0], uti);
    quad([0,-1,i], [0,-1,i+1], [0,0,i+1], [0,0,i], [-1,0,0], uti);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
  return g;
}

/* ── EL CIELO ──
   Un domo con degradado mas nubes chatas. El degradado va en el shader y no en
   una textura: son dos colores y una altura. */
function armaCielo(){
  const m = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    uniforms: { arr: { value: new T.Color(0x4b8fd6) }, aba: { value: new T.Color(0xcfe3f5) },
                sol: { value: new T.Vector3(0.5, 0.72, 0.34) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 arr, aba, sol; varying vec3 vP;',
      'void main(){',
      '  float h = clamp(vP.y*1.15 + 0.12, 0.0, 1.0);',
      '  vec3 c = mix(aba, arr, pow(h, 0.72));',
      '  float d = max(0.0, dot(normalize(vP), normalize(sol)));',
      '  c += vec3(1.0, 0.92, 0.72)*pow(d, 220.0)*1.4;',        /* el sol */
      '  c += vec3(1.0, 0.86, 0.66)*pow(d, 6.0)*0.16;',         /* y su halo */
      '  gl_FragColor = vec4(c, 1.0);',
      '}'
    ].join('\n')
  });
  cielo = new T.Mesh(new T.SphereGeometry(220, 24, 16), m);
  cielo.frustumCulled = false; escena.add(cielo);
  /* nubes: seis planos altos, instanciados en una sola malla */
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c2 = cv.getContext('2d'); SA = 4242;
  c2.clearRect(0, 0, 64, 64);
  c2.fillStyle = 'rgba(255,255,255,0.92)';
  for (let i = 0; i < 26; i++){
    const x = 6 + ra()*46, y = 18 + ra()*26, w = 8 + ra()*20, h = 6 + ra()*10;
    c2.fillRect(Math.floor(x/4)*4, Math.floor(y/4)*4, Math.floor(w/4)*4, Math.floor(h/4)*4);
  }
  const tx = new T.CanvasTexture(cv); tx.magFilter = T.NearestFilter; tx.minFilter = T.NearestFilter;
  tx.generateMipmaps = false;
  const gm = new T.PlaneGeometry(1, 1);
  const mm = new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, fog: false });
  const inst = new T.InstancedMesh(gm, mm, 14);
  const M4 = new T.Matrix4(), Q = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2, 0, 0));
  const V = new T.Vector3(), S3 = new T.Vector3();
  for (let i = 0; i < 14; i++){
    V.set(N/2 + (ra() - 0.5)*220, 58 + ra()*22, N/2 + (ra() - 0.5)*220);
    const s = 30 + ra()*46; S3.set(s, s*0.7, 1);
    inst.setMatrixAt(i, M4.compose(V, Q, S3));
  }
  inst.frustumCulled = false; escena.add(inst);
}

function calidad(c){
  if (!CALIDADES[c]) return CAL;
  CAL = c; const Q = CALIDADES[c];
  ESC = Q.esc;
  SOMBRA_OK = Q.sombra > 0;
  LUZSOL.castShadow = SOMBRA_OK;
  if (SOMBRA_OK && LUZSOL.shadow.mapSize.width !== Q.sombra){
    LUZSOL.shadow.mapSize.set(Q.sombra, Q.sombra);
    /* three no recrea la textura porque cambie mapSize: se queda con la de
       antes y el cambio no hace nada */
    if (LUZSOL.shadow.map){ LUZSOL.shadow.map.dispose(); LUZSOL.shadow.map = null; }
  }
  escena.fog.near = 40*Q.niebla; escena.fog.far = 150*Q.niebla;
  if (cielo) cielo.visible = !!Q.cielo;
  mide();
  return CAL;
}
function mide(){
  const w = Math.max(2, CVLIENZO.clientWidth), h = Math.max(2, CVLIENZO.clientHeight);
  render.setSize(w, h, false);
  const rw = Math.max(2, Math.round(w*ESC)), rh = Math.max(2, Math.round(h*ESC));
  RT.setSize(rw, rh);
  cam.aspect = w/h; cam.updateProjectionMatrix();
  return [rw, rh];
}
function pinta(){
  render.setRenderTarget(RT); render.clear(); render.render(escena, cam);
  render.setRenderTarget(null); render.render(postEsc, postCam);
}
