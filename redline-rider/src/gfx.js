/* Texturas generadas en codigo. Se pintan en <canvas> y nunca se carga una imagen:
   una imagen file:// llega al WebGL como origen opaco y texImage2D falla, asi que el
   arte procedural es tambien lo que permite jugar sin servidor. */

import * as THREE from 'three';

function canvas(w, h){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const srgb = t => { t.colorSpace = THREE.SRGBColorSpace; return t; };

/**
 * Asfalto con las marcas viales HORNEADAS: una sola textura que se desplaza en V da
 * carretera infinita sin gestionar trozos, y las lineas discontinuas quedan alineadas
 * con los carriles por construccion.
 * Ancho = LANE_COUNT * LANE_WIDTH; la U cubre el asfalto completo.
 */
export function roadTexture(lanes, laneWidthM, tileLengthM, night){
  const PX_PER_M = 16;
  const w = Math.round(lanes * laneWidthM * PX_PER_M);
  const h = Math.round(tileLengthM * PX_PER_M);
  const c = canvas(w, h), g = c.getContext('2d');

  g.fillStyle = night ? '#191c22' : '#3a3d44';
  g.fillRect(0, 0, w, h);

  // grano del arido: sin esto el asfalto se ve como plastico liso a cualquier velocidad
  for (let i = 0; i < w * h / 90; i++){
    const v = Math.random();
    g.fillStyle = `rgba(${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${v > 0.5 ? 255 : 0},${0.035 + Math.random() * 0.05})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  // parches y juntas
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < 14; i++){
    g.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 120, 6 + Math.random() * 30);
  }

  const line = night ? 'rgba(232,236,245,0.82)' : 'rgba(240,242,246,0.9)';
  const lw = Math.round(0.14 * PX_PER_M);

  // discontinuas entre carriles: 3 m de raya, 6 m de hueco
  const dash = 3 * PX_PER_M, gap = 6 * PX_PER_M;
  g.fillStyle = line;
  for (let i = 1; i < lanes; i++){
    const x = Math.round(i * laneWidthM * PX_PER_M - lw / 2);
    for (let y = 0; y < h; y += dash + gap) g.fillRect(x, y, lw, dash);
  }
  // continuas de borde
  g.fillRect(Math.round(0.25 * PX_PER_M), 0, lw, h);
  g.fillRect(w - Math.round(0.25 * PX_PER_M) - lw, 0, lw, h);

  const t = new THREE.CanvasTexture(c);
  srgb(t);
  t.wrapS = THREE.ClampToEdgeWrapping;   // a lo ancho NO se repite: es el asfalto entero
  t.wrapT = THREE.RepeatWrapping;        // a lo largo si, y su offset es el scroll
  t.anisotropy = 4;
  return t;
}

/** Arcen de grava/tierra a los lados del asfalto. */
export function shoulderTexture(night){
  const s = 256, c = canvas(s, s), g = c.getContext('2d');
  g.fillStyle = night ? '#20222a' : '#4c4438';
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++){
    const v = Math.random();
    g.fillStyle = `rgba(${v > 0.5 ? 220 : 20},${v > 0.5 ? 210 : 20},${v > 0.5 ? 190 : 20},${0.05 + Math.random() * 0.09})`;
    g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  const t = new THREE.CanvasTexture(c);
  srgb(t);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Quitamiedos metalico: perfil en W con postes, para que el borde se lea a velocidad. */
export function barrierTexture(){
  const w = 256, h = 64, c = canvas(w, h), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.00, '#8d949e');
  grad.addColorStop(0.30, '#c3c9d2');
  grad.addColorStop(0.50, '#6f757e');
  grad.addColorStop(0.70, '#c3c9d2');
  grad.addColorStop(1.00, '#7c828b');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(40,44,52,0.55)';
  for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 7, h);      // postes
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 60; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 1);
  const t = new THREE.CanvasTexture(c);
  srgb(t);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Cupula de cielo: degradado vertical por hora del dia con sol y bruma en el horizonte. */
export function skyTexture(top, horizon, bottom, sunY, sunColor){
  const w = 16, h = 512, c = canvas(w, h), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.00, top);
  grad.addColorStop(0.55, horizon);
  grad.addColorStop(1.00, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  if (sunColor){
    const sg = g.createLinearGradient(0, h * (sunY - 0.12), 0, h * (sunY + 0.16));
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, sunColor);
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg;
    g.fillRect(0, 0, w, h);
  }
  const t = new THREE.CanvasTexture(c);
  srgb(t);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Banda de nubes que envuelve la cupula sin costura (se repite en U). */
export function cloudTexture(tint, alpha){
  const w = 1024, h = 256, c = canvas(w, h), g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  const blobs = 90;
  for (let i = 0; i < blobs; i++){
    const x = Math.random() * w, y = h * (0.25 + Math.random() * 0.6);
    const r = 26 + Math.random() * 90;
    // se dibuja tambien desplazado +-w para que el borde U empalme
    for (const dx of [-w, 0, w]){
      const rg = g.createRadialGradient(x + dx, y, 0, x + dx, y, r);
      rg.addColorStop(0, `rgba(255,255,255,${alpha * (0.5 + Math.random() * 0.5)})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(x + dx, y, r, 0, Math.PI * 2); g.fill();
    }
  }
  if (tint){
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = tint;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }
  const t = new THREE.CanvasTexture(c);
  srgb(t);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Halo radial aditivo: faros, rebufo de freno, brillos. Sustituye al bloom. */
export function glowTexture(){
  const s = 128, c = canvas(s, s), g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0.00, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.7)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.2)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return srgb(new THREE.CanvasTexture(c));
}

/** Sombra de contacto bajo los vehiculos: sustituye al shadow map, que en movil cuesta. */
export function shadowTexture(){
  const s = 128, c = canvas(s, s), g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0.0, 'rgba(0,0,0,0.7)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.32)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return srgb(new THREE.CanvasTexture(c));
}

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
