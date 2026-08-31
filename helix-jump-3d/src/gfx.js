/* Texturas y geometrias generadas en codigo. Todo se pinta en <canvas>, nunca se carga
   una imagen: una imagen file:// llega al WebGL como origen opaco y texImage2D falla,
   asi que el arte procedural es tambien lo que permite jugar sin servidor. */

import * as THREE from 'three';

function canvas(w, h){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Halo radial aditivo: sustituye al bloom de post-proceso, y corre en cualquier movil. */
export function glowTexture(){
  const s = 128, c = canvas(s, s), g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0.00, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Chispa con nucleo duro, para estelas y polvo de rotura. */
export function sparkTexture(){
  const s = 64, c = canvas(s, s), g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Degradado vertical del cielo, con un resplandor bajo para dar profundidad al fondo. */
export function skyTexture(topHex, botHex){
  const w = 8, h = 512, c = canvas(w, h), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, topHex);
  grad.addColorStop(1, botHex);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const halo = g.createLinearGradient(0, h * 0.45, 0, h * 0.78);
  halo.addColorStop(0, 'rgba(255,255,255,0)');
  halo.addColorStop(0.5, 'rgba(255,255,255,0.16)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Columna: bandas verticales para que se vea girar, y el sombreado cilindrico
    horneado en la propia textura, porque el material no esta iluminado.
    La U recorre la circunferencia completa, asi que el degradado va claro en el
    centro a oscuro en los bordes y vuelve, sin costura. */
export function coreTexture(){
  const w = 512, h = 256, c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, w, h);

  const bands = 24;
  for (let i = 0; i < bands; i++){
    const x = (i / bands) * w;
    g.fillStyle = i % 2 ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.015)';
    g.fillRect(x, 0, w / bands, h);
  }
  g.fillStyle = 'rgba(0,0,0,0.055)';
  for (let i = 0; i < 90; i++){
    g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 1);
  }

  // sombreado del cilindro: dos medios degradados simetricos, luz desplazada a la izquierda
  const shade = g.createLinearGradient(0, 0, w, 0);
  shade.addColorStop(0.00, 'rgba(0,0,0,0.42)');
  shade.addColorStop(0.18, 'rgba(0,0,0,0.06)');
  shade.addColorStop(0.30, 'rgba(255,255,255,0.16)');
  shade.addColorStop(0.50, 'rgba(0,0,0,0.10)');
  shade.addColorStop(0.72, 'rgba(0,0,0,0.34)');
  shade.addColorStop(1.00, 'rgba(0,0,0,0.42)');
  g.fillStyle = shade;
  g.fillRect(0, 0, w, h);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 8);
  return t;
}

/** Sombra de contacto: elipse difusa que se pega bajo la pelota. Sustituye al shadow
    map, que no funciona sobre materiales sin iluminar (y cuesta bastante en movil). */
export function shadowTexture(){
  const s = 128, c = canvas(s, s), g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0.0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Rayas de peligro sobre las plataformas letales: se leen incluso sin color. */
export function hazardTexture(){
  const s = 128, c = canvas(s, s), g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(0,0,0,0.34)';
  g.lineWidth = 14;
  for (let i = -s; i < s * 2; i += 34){
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 1);
  return t;
}

/* ---------- geometria ---------- */

const sectorCache = new Map();

/**
 * Prisma de sector anular (un trozo de plataforma), centrado en Y y con el arco
 * empezando en el angulo 0 hacia +theta. Se cachea por (rIn,rOut,h,thetaLen).
 */
export function sectorGeometry(rIn, rOut, h, thetaLen){
  const key = rIn.toFixed(3) + '|' + rOut.toFixed(3) + '|' + h.toFixed(3) + '|' + thetaLen.toFixed(4);
  let geo = sectorCache.get(key);
  if (geo) return geo;

  const shape = new THREE.Shape();
  shape.moveTo(rIn, 0);
  shape.lineTo(rOut, 0);
  shape.absarc(0, 0, rOut, 0, thetaLen, false);
  shape.lineTo(Math.cos(thetaLen) * rIn, Math.sin(thetaLen) * rIn);
  shape.absarc(0, 0, rIn, thetaLen, 0, true);

  geo = new THREE.ExtrudeGeometry(shape, {
    depth: h, bevelEnabled: false,
    curveSegments: Math.max(3, Math.ceil(thetaLen / 0.10))
  });
  // el perfil vive en XY extruido hacia +Z: se tumba para que el arco quede en XZ
  // y el grosor en Y. Con rotateX(+90) el angulo del perfil se conserva en XZ.
  geo.rotateX(Math.PI / 2);
  geo.translate(0, h / 2, 0);
  geo.computeVertexNormals();
  sectorCache.set(key, geo);
  return geo;
}

export const TAU = Math.PI * 2;
export const norm2 = a => ((a % TAU) + TAU) % TAU;
