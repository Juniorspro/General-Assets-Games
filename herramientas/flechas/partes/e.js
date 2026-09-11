/* ══════════════════════════════════════════════════════════════════════════
   E · ESTADO, ENCUADRE Y DIBUJO
   Todo se dibuja por codigo: no hay una sola imagen en el archivo. Un juego
   de dos colores sobre papel no gana nada con una foto, y una foto pegada
   encima de un dibujo se ve pegada encima.
   ══════════════════════════════════════════════════════════════════════════ */
const JU = {
  T: null, m: 0, n: 0, vidas: VIDAS, toques: 0, fallos: 0,
  fase: 'menu',            /* menu · juega · pausa · fin                    */
  cw: 0, bx: 0, by: 0, bw: 0, bh: 0,
  tinte: '#181614', tut: false, sal: 0,
  rehace: 0,               /* >0: se acabaron las vidas y el tablero NO escucha */
};

let CV = null, CX = null, PXR = 1, ANCHO = 412, ALTO = 892;

function medir() {
  CV = $('cv'); CX = CV.getContext('2d');
  const r = $('marco').getBoundingClientRect();
  ANCHO = Math.round(r.width); ALTO = Math.round(r.height);
  PXR = cl(window.devicePixelRatio || 1, 1, 2.5);
  CV.width = Math.round(ANCHO * PXR); CV.height = Math.round(ALTO * PXR);
  CX.setTransform(PXR, 0, 0, PXR, 0, 0);
  if (JU.T) encuadre();
}

/* ── EL ENCUADRE ──────────────────────────────────────────────────────────
   La celda sale del lado que APRIETA. Con un tamanio escrito a mano, el
   mundo 6 —11x13— se sale por el ancho en un telefono angosto y el mundo 1
   —6x8— queda del tamanio de un sello en uno grande.                      */
const PAD_ARR = 64, PAD_ABJ = 96, PAD_LAT = 15;
function encuadre() {
  const T = JU.T;
  const dw = ANCHO - PAD_LAT * 2, dh = ALTO - PAD_ARR - PAD_ABJ;
  JU.cw = Math.floor(Math.min(dw / T.nx, dh / T.ny));
  JU.bw = JU.cw * T.nx; JU.bh = JU.cw * T.ny;
  JU.bx = Math.round((ANCHO - JU.bw) / 2);
  JU.by = Math.round(PAD_ARR + (dh - JU.bh) / 2);
}
const pcx = x => JU.bx + (x + 0.5) * JU.cw;
const pcy = y => JU.by + (y + 0.5) * JU.cw;

/* ── EL CAMINO DE UNA PIEZA ───────────────────────────────────────────────
   Cuerpo + rayo + un poco mas alla del borde. El rayo sale de `rayo()`, la
   MISMA funcion con la que la regla decide si puede salir: asi lo que se ve
   deslizarse y lo que la regla midio no pueden ser dos cosas distintas.    */
function caminoDe(T, p) {
  const d = DIR[dirDe(p)], pts = [];
  for (const c of p.cel) pts.push([pcx(c[0]), pcy(c[1])]);
  const r = rayo(T, p);
  for (const c of r) pts.push([pcx(c[0]), pcy(c[1])]);
  const ult = p.cel[p.cel.length - 1];
  let x = ult[0] + (r.length + 1) * d[0], y = ult[1] + (r.length + 1) * d[1];
  for (let i = 0; i < p.cel.length + 3; i++) {
    pts.push([pcx(x), pcy(y)]); x += d[0]; y += d[1];
  }
  return pts;
}
/* Devuelve el tramo de una polilinea entre dos largos de arco. Es lo que
   hace que la flecha se DESLICE POR SU PROPIO TRAZO en vez de trasladarse
   entera: la cola recorre exactamente el camino que hizo la cabeza.        */
function subPoli(pts, a, b) {
  const out = []; let acu = 0;
  a = Math.max(0, a);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    const s0 = acu, s1 = acu + L; acu = s1;
    if (s1 < a || s0 > b) continue;
    const ta = cl((a - s0) / L, 0, 1), tb = cl((b - s0) / L, 0, 1);
    const A = [p0[0] + dx * ta, p0[1] + dy * ta], B = [p0[0] + dx * tb, p0[1] + dy * tb];
    if (!out.length) out.push(A);
    out.push(B);
  }
  if (out.length < 2) return null;
  return out;
}

/* ── EL TRAZO ─────────────────────────────────────────────────────────────
   Cuerpo redondeado + punta triangular. La punta se dibuja aparte y no como
   un remate del trazo: un trazo con `lineCap` no puede ser un triangulo, y
   sin triangulo esto no se lee a flecha — se lee a cable.                  */
function trazo(pts, col, gr, alfa) {
  CX.globalAlpha = alfa;
  CX.strokeStyle = col; CX.lineWidth = gr;
  CX.lineJoin = 'round'; CX.lineCap = 'round';
  CX.beginPath(); CX.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) CX.lineTo(pts[i][0], pts[i][1]);
  CX.stroke();
  /* la punta */
  const n = pts.length, a = pts[n - 2], b = pts[n - 1];
  let dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const px = -dy, py = dx, cwv = JU.cw;
  const tipx = b[0] + dx * cwv * 0.36, tipy = b[1] + dy * cwv * 0.36;
  const bax = b[0] - dx * cwv * 0.10, bay = b[1] - dy * cwv * 0.10;
  const w = cwv * 0.33;
  CX.fillStyle = col;
  CX.beginPath();
  CX.moveTo(tipx, tipy);
  CX.lineTo(bax + px * w, bay + py * w);
  CX.lineTo(bax - px * w, bay - py * w);
  CX.closePath(); CX.fill();
  CX.globalAlpha = 1;
}

/* ── EL PAPEL ── */
function rectRed(x, y, w, h, r) {
  CX.beginPath();
  CX.moveTo(x + r, y);
  CX.arcTo(x + w, y, x + w, y + h, r);
  CX.arcTo(x + w, y + h, x, y + h, r);
  CX.arcTo(x, y + h, x, y, r);
  CX.arcTo(x, y, x + w, y, r);
  CX.closePath();
}
function dibujaPapel() {
  const x = JU.bx, y = JU.by, w = JU.bw, h = JU.bh, r = Math.min(16, JU.cw * 0.5);
  const M = mesaDe(JU.m);
  /* DOS SOMBRAS Y NO UNA. Una pegada y dura dice que la hoja TOCA la mesa;
     una ancha y floja dice a que altura esta. Con una sola hay que elegir
     entre las dos cosas, y en el mundo 6 —mesa negra— la floja sola no se
     ve: lo que despega la hoja ahi es el filo de abajo.                    */
  CX.save();
  CX.shadowColor = M.osc ? 'rgba(0,0,0,.72)' : 'rgba(30,25,18,.20)';
  CX.shadowBlur = M.osc ? 46 : 30; CX.shadowOffsetY = M.osc ? 16 : 12;
  CX.fillStyle = '#fbfaf6'; rectRed(x, y, w, h, r); CX.fill();
  CX.shadowColor = M.osc ? 'rgba(0,0,0,.55)' : 'rgba(30,25,18,.26)';
  CX.shadowBlur = 8; CX.shadowOffsetY = 3; CX.fill();
  CX.restore();
  /* la hoja no es un color plano: entra luz por arriba */
  CX.save(); rectRed(x, y, w, h, r); CX.clip();
  const gp = CX.createLinearGradient(0, y, 0, y + h);
  gp.addColorStop(0, 'rgba(255,255,255,.75)');
  gp.addColorStop(.55, 'rgba(255,255,255,0)');
  gp.addColorStop(1, 'rgba(120,104,74,.09)');
  CX.fillStyle = gp; CX.fillRect(x, y, w, h);
  CX.restore();
  /* la reja, apenas: sin ella el papel es un rectangulo y no se ve que las
     flechas caen en casillas — que es lo que hay que poder contar.         */
  CX.save(); rectRed(x, y, w, h, r); CX.clip();
  CX.strokeStyle = 'rgba(24,22,20,.055)'; CX.lineWidth = 1;
  CX.beginPath();
  for (let i = 1; i < JU.T.nx; i++) { CX.moveTo(x + i * JU.cw + .5, y); CX.lineTo(x + i * JU.cw + .5, y + h); }
  for (let j = 1; j < JU.T.ny; j++) { CX.moveTo(x, y + j * JU.cw + .5); CX.lineTo(x + w, y + j * JU.cw + .5); }
  CX.stroke(); CX.restore();
  CX.strokeStyle = 'rgba(24,22,20,.13)'; CX.lineWidth = 1.5;
  rectRed(x + .75, y + .75, w - 1.5, h - 1.5, r); CX.stroke();
}

/* ── UNA PIEZA ── */
function dibujaPieza(p, dt) {
  const T = JU.T, gr = JU.cw * 0.26;
  let col = JU.tinte, alfa = 1, ox = 0, oy = 0;

  if (p.mal > 0) { p.mal -= dt; col = '#c8452f'; }
  if (p.tmb > 0) {
    p.tmb -= dt;
    const k = cl(p.tmb / 0.34, 0, 1), a = JU.cw * 0.16 * k * k;
    const s = Math.sin(p.tmb * 46);
    ox = p.tmbD[0] * a * s; oy = p.tmbD[1] * a * s;
    col = '#c8452f';
  }
  let pts;
  if (p.sal > 0) {
    const cam = caminoDe(T, p);
    const L = (p.cel.length - 1) * JU.cw;
    const R = rayo(T, p).length * JU.cw;
    const tot = L + R + JU.cw * 1.4;
    const s = p.sal * tot;
    pts = subPoli(cam, s, s + L + 0.001);
    if (!pts) return;
  } else {
    pts = p.cel.map(c => [pcx(c[0]), pcy(c[1])]);
  }
  if (pts.length < 2) { const q = pts[0]; pts = [[q[0] - .01, q[1]], q]; }
  if (ox || oy) pts = pts.map(q => [q[0] + ox, q[1] + oy]);
  /* la sombra: una copia corrida, ancha y floja. Es lo unico que despega la
     flecha del papel — sin ella se lee a tinta impresa y no a pieza.       */
  CX.save();
  CX.globalAlpha = 0.13 * alfa;
  CX.strokeStyle = '#2a2520'; CX.lineWidth = gr * 1.05;
  CX.lineJoin = 'round'; CX.lineCap = 'round';
  CX.beginPath(); CX.moveTo(pts[0][0], pts[0][1] + gr * 0.34);
  for (let i = 1; i < pts.length; i++) CX.lineTo(pts[i][0], pts[i][1] + gr * 0.34);
  CX.stroke(); CX.restore();
  trazo(pts, col, gr, alfa);
  /* EL FILO DE LA TINTA. Un trazo de un solo color es una barra; con una luz
     corrida hacia arriba se lee a pluma cargada. Cuesta un stroke por pieza
     y solo entra con la celda grande: a 34 px un cuarto de trazo es un pelo
     y lo unico que hace es ensuciar el borde.                              */
  if (JU.cw > 40) {
    CX.save();
    CX.globalAlpha = 0.16 * alfa; CX.strokeStyle = '#fff';
    CX.lineWidth = gr * 0.26; CX.lineJoin = 'round'; CX.lineCap = 'round';
    CX.beginPath(); CX.moveTo(pts[0][0], pts[0][1] - gr * 0.22);
    for (let i = 1; i < pts.length; i++) CX.lineTo(pts[i][0], pts[i][1] - gr * 0.22);
    CX.stroke(); CX.restore();
  }
}

function dibuja(dt) {
  CX.clearRect(0, 0, ANCHO, ALTO);
  /* la mesa va SIEMPRE, tambien en el menu: es lo unico que hay detras de
     los paneles, y los paneles son un velo abierto en el medio.           */
  fondoHornea();
  if (FON) CX.drawImage(FON, 0, 0, ANCHO, ALTO);
  motasDibuja(dt);
  if (!JU.T) return;
  dibujaPapel();
  CX.save();
  const r = Math.min(16, JU.cw * 0.5);
  rectRed(JU.bx, JU.by, JU.bw, JU.bh, r); CX.clip();
  for (const p of JU.T.piezas) {
    if (p.fuera && !(p.sal > 0)) continue;
    dibujaPieza(p, dt);
  }
  CX.restore();
}

/* ── EL DEDO ──────────────────────────────────────────────────────────────
   Primero la celda exacta; si esta vacia, la flecha mas cercana dentro de
   media celda. Lo que tiene que costar es LEER cual sale, no clavar el
   pixel: un trazo mide un cuarto de celda y un dedo mide mas que eso.      */
function piezaEn(px, py) {
  const T = JU.T; if (!T) return null;
  const x = Math.floor((px - JU.bx) / JU.cw), y = Math.floor((py - JU.by) / JU.cw);
  if (dentro(T, x, y)) {
    const o = T.ocu[idx(T, x, y)];
    if (o !== -1 && !T.piezas[o].fuera) return T.piezas[o];
  }
  let mejor = null, md = JU.cw * 0.55;
  for (const p of T.piezas) {
    if (p.fuera) continue;
    for (let i = 0; i < p.cel.length - 1; i++) {
      const a = [pcx(p.cel[i][0]), pcy(p.cel[i][1])], b = [pcx(p.cel[i + 1][0]), pcy(p.cel[i + 1][1])];
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      const t = L2 ? cl(((px - a[0]) * dx + (py - a[1]) * dy) / L2, 0, 1) : 0;
      const d = Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t));
      if (d < md) { md = d; mejor = p; }
    }
  }
  return mejor;
}
