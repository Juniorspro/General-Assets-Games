/* ══════════════════════════════════════════════════════════════════════════
   E · EL DIBUJO EN 2D

   ESTE JUEGO NO ES TRIDIMENSIONAL Y NO TIENE QUE PARECERLO. La referencia
   —Bowmasters— es vector plano: siluetas saturadas, cantos redondeados, cero
   perspectiva y cero sombras proyectadas. Lo que da profundidad ahi no es el
   volumen sino LAS CAPAS: cielo, dos bandas de fondo, el terreno adelante, y
   cada una de un solo color mas plano y mas frio cuanto mas lejos.

   Y EN UN JUEGO DE TIRO PARABOLICO EL 2D NO ES UNA CONCESION: la unica
   decision es un vector en un plano, asi que la tercera dimension no aporta
   una sola eleccion y cuesta el apuntado. Con camara ortografica plana el
   puente entre el dedo y el mundo es una multiplicacion —error exactamente
   cero, medido— y no una matriz proyectada que hay que mantener al dia.

   LA UNIDAD ES LA CELDA Y EL LIENZO SE TRANSFORMA UNA VEZ. Todo se dibuja en
   coordenadas del mundo (x a la derecha, y hacia arriba) adentro de un
   `scale(PX, -PX)`: asi el dibujo y la fisica hablan el mismo idioma y no hay
   dos cuentas que se puedan separar. El precio es que los grosores de linea
   van en celdas, que es como corresponde — un arco no engorda porque la
   pantalla sea mas grande.
   ══════════════════════════════════════════════════════════════════════════ */

let CV = null, G2 = null;
let ANCHO = 412, ALTO = 892, DPR = 1;
let PX = 26, OFX = 0, OFY = 0;
let ENC_W = 8, ENC_H = 18, MIRA = 16;
let DIO = null;
let LLAM = 0, LLAM_ANT = 0;
let DET = 1;

/* ── LA CAMARA ────────────────────────────────────────────────────────────
   HAY UNA CAMARA PORQUE EL MAPA CRECIO, y las dos cosas son la misma
   decision. En un marco 9:16 el ancho manda: mostrar de una las trece celdas
   que separan a los arqueros deja el cuerpo en 62 px y la flecha en 20 —o
   sea que la flecha del rival, que cruza el cuadro en cuatro decimas, no se
   ve—. Con encuadre fijo no hay numero que arregle las dos cosas: agrandar
   el mapa achica todo lo que hay adentro.

   ASI QUE EL ENCUADRE SE ABRE EN REPOSO Y SE CIERRA SOBRE LA FLECHA. Lo
   unico que se achica es el plano de espera —el cuerpo del arquero baja de
   62 a 53 px— y lo que se AGRANDA es justamente lo que antes no se veia: en
   vuelo el cuerpo mide 73 px y la flecha 39 contra 33. Medido en el marco de
   412: 25,1 px por celda esperando y 34,9 en vuelo.

   Y APUNTAR NO SE ROMPE, que es lo que hay que comprobar antes de mover una
   camara en un juego de punteria: `mundoAPant` es una escala UNIFORME, asi
   que un DELTA pasado por `pantAMundo` conserva la direccion —la escala se
   divide sola al normalizar— y la fuerza sale de pixeles del marco. Las dos
   son invariantes al zoom, medido.                                        */
const CEL_REPOSO = 16.4;   /* celdas de ancho esperando  */
const CEL_VUELO  = 11.8;   /* celdas de ancho en vuelo   */
const CAM_VEL = 3.6;       /* con que rapidez sigue      */
const CAM_ZOOM = 2.8;      /* y con que rapidez cierra   */
const CAM_ALTO = 7;        /* cuanto puede subir sobre el piso siguiendo la flecha */
/* EL ENCUADRE SE CENTRA EN LA ARENA, NO EN EL MUNDO: el medio entre los dos
   arqueros es 8,5 y el del mundo 9, asi que centrando en el mundo el de la
   derecha queda media celda mas cerca del canto que el de la izquierda. */
const ENC_CX = (XA + XB) / 2 + 0.5;
const SUELO_Y = -1.15;     /* la linea del mundo que cae en el canto de abajo */
const CAM = { cx: ENC_CX, cy: 16, cel: CEL_REPOSO, foco: null };
/* medio alto visible, en celdas, para un ancho dado */
const camAlto = cel => ALTO * cel / (2 * ANCHO);

/* ── COLOR ────────────────────────────────────────────────────────────────
   Todo pasa por aca. Con los colores escritos a mano en cada sitio, subir la
   saturacion del juego seria tocar cuarenta literales y olvidarse de tres. */
const cl255 = v => v < 0 ? 0 : (v > 255 ? 255 : v);
function _h2r(h) { return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; }
function _r2c(r) { return 'rgb(' + Math.round(cl255(r[0])) + ',' + Math.round(cl255(r[1])) + ',' + Math.round(cl255(r[2])) + ')'; }
function _rgba(r, a) { return 'rgba(' + Math.round(cl255(r[0])) + ',' + Math.round(cl255(r[1])) + ',' + Math.round(cl255(r[2])) + ',' + a + ')'; }
function _hsl(r) {
  const R = r[0] / 255, G = r[1] / 255, B = r[2] / 255;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
  let h = 0; const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (mx === R) h = ((G - B) / d) % 6; else if (mx === G) h = (B - R) / d + 2; else h = (R - G) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, s, l];
}
function _rgbDe(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
/* LA SATURACION VA EN UNA FUNCION Y ANTES DEL TINTE, que es la leccion de
   MEKO: el tinte de paleta existe para DESATURAR hacia el color del aire, y
   saturando encima el ladrillo del fondo sale rosa chicle.                 */
const SAT_K = 1.34, SAT_TOPE = 0.78;
function satura(hex) {
  const r = typeof hex === 'number' ? _h2r(hex) : hex;
  const [h, s, l] = _hsl(r);
  if (s <= 0.004) return r.slice();
  return _rgbDe(h, Math.min(SAT_TOPE, s * SAT_K), l);
}
const mezR = (a, b, k) => [mez(a[0], b[0], k), mez(a[1], b[1], k), mez(a[2], b[2], k)];
function luz(r, k) {                       /* k>0 aclara, k<0 oscurece */
  const [h, s, l] = _hsl(r);
  return _rgbDe(h, s, cl(l + k, 0, 1));
}

/* ── LAS PALETAS ──────────────────────────────────────────────────────────
   Cuatro cielos y, con cada uno, los dos colores de las bandas del fondo. No
   son un degradado del terreno: en vector plano lo que separa una capa de la
   siguiente es que sean colores DISTINTOS, no el mismo mas claro.          */
const PALETAS = [
  { t: 0xdff0ff, k: 0.20, sol: [0.70, 0.19], solc: [255, 248, 216], nub: 18,
    cielo: ['#2f7fd6', '#4fa6e6', '#8fd2f2', '#d8f0ea'],
    lejos: [0x4f7fb8, 0x3f7a6a], bruma: 0.30 },
  { t: 0xffd9a0, k: 0.26, sol: [0.28, 0.30], solc: [255, 226, 168], nub: 9,
    cielo: ['#c8407f', '#ef7a52', '#f9b268', '#fbe0b0'],
    lejos: [0x8f4a86, 0xb9625a], bruma: 0.34 },
  { t: 0xd6ecff, k: 0.24, sol: [0.80, 0.13], solc: [222, 240, 255], nub: 24,
    cielo: ['#26489c', '#3f74c8', '#7fb2e2', '#cfe6ef'],
    lejos: [0x5560ab, 0x4a7fa8], bruma: 0.32 },
  { t: 0xd8ffd0, k: 0.18, sol: [0.40, 0.23], solc: [238, 255, 214], nub: 15,
    cielo: ['#1f7a86', '#38a58c', '#7ecf9c', '#d2eec6'],
    lejos: [0x2f6a72, 0x2f7a52], bruma: 0.28 },
];

/* ── EL CIELO ─────────────────────────────────────────────────────────────
   Un lienzo por paleta, dibujado una vez y pegado dos veces con un
   corrimiento: las nubes SE CORREN CON EL VIENTO, que es la mitad de lo que
   hacen. El viento es el unico dato del duelo que no se ve en el terreno, y
   un numero en el HUD se lee una vez y se olvida.                          */
const CIELOS = [];
let CIELO_OX = 0, CIELO_PI = 0;
function cieloLienzo(pi) {
  const key = pi + '|' + ANCHO + '|' + ALTO + '|' + DPR + '|' + DET;
  if (CIELOS[pi] && CIELOS[pi].key === key) return CIELOS[pi].c;
  const pal = PALETAS[pi];
  const W = Math.max(2, Math.round(ANCHO * DPR)), H = Math.max(2, Math.round(ALTO * DPR));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H), ps = pal.cielo;
  gr.addColorStop(0, ps[0]); gr.addColorStop(0.40, ps[1]);
  gr.addColorStop(0.72, ps[2]); gr.addColorStop(1, ps[3]);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);

  const sx = W * pal.sol[0], sy = H * pal.sol[1];
  for (const off of [-W, 0, W]) {
    const rg = g.createRadialGradient(sx + off, sy, 0, sx + off, sy, H * 0.55);
    rg.addColorStop(0, _rgba(pal.solc, 0.95));
    rg.addColorStop(0.08, _rgba(pal.solc, 0.52));
    rg.addColorStop(0.36, _rgba(pal.solc, 0.14));
    rg.addColorStop(1, _rgba(pal.solc, 0));
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }
  /* el disco del sol: en vector plano es un circulo y no un resplandor */
  g.fillStyle = _rgba(pal.solc, 0.90);
  g.beginPath(); g.arc(sx, sy, H * 0.035, 0, 6.2832); g.fill();

  /* LAS NUBES SE DIBUJAN TRES VECES —en -W, 0 y +W— porque el lienzo se pega
     en bucle: sin eso, al correrlas con el viento aparece la costura.      */
  const R = azar(pi * 1237 + 71);
  const nn = Math.max(4, Math.round(pal.nub * (DET === 0 ? 0.45 : DET === 1 ? 0.8 : 1)));
  for (let i = 0; i < nn; i++) {
    const cx = R() * W, cy = H * (0.06 + R() * 0.48), s = (0.5 + R() * 1.2) * (W / 900);
    const a = 0.16 + R() * 0.22;
    g.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
    for (const off of [-W, 0, W]) {
      g.beginPath();
      for (let k = 0; k < 5; k++) {
        const ex = cx + off + (k - 2) * 46 * s, ey = cy + Math.sin(k * 1.9 + i) * 11 * s;
        const rw = (74 - Math.abs(k - 2) * 15) * s;
        g.moveTo(ex + rw, ey); g.arc(ex, ey, rw, 0, 6.2832);
      }
      g.fill();
    }
  }
  CIELOS[pi] = { key, c };
  return c;
}

/* ── EL MARCO Y LA CAMARA ─────────────────────────────────────────────────
   No hay camara: hay una escala y dos corrimientos. `pantAMundo` es la
   inversa EXACTA de `mundoAPant` porque las dos son la misma division.    */
function encuadra() {
  PX = ANCHO / CAM.cel;
  ENC_W = ANCHO / (2 * PX);
  ENC_H = ALTO / (2 * PX);
  OFX = ANCHO / 2 - CAM.cx * PX;
  OFY = ALTO / 2 + CAM.cy * PX;
  MIRA = CAM.cy;
}
/* a donde quiere ir la camara AHORA. Sin foco, al plano de espera. */
function camObj() {
  if (!CAM.foco) return { x: ENC_CX, y: SUELO_Y + camAlto(CEL_REPOSO), cel: CEL_REPOSO };
  const y0 = SUELO_Y + camAlto(CEL_VUELO);
  /* la x se topa DENTRO de las alas del terreno (tres celdas a cada lado),
     asi que por mucho que la flecha se vaya de la arena no aparece el vacio
     de mas alla del mundo */
  return { x: cl(CAM.foco.x, XA + 1, XB - 1), y: cl(CAM.foco.y, y0, y0 + CAM_ALTO), cel: CEL_VUELO };
}
function camFoco(x, y) { CAM.foco = { x, y }; }
function camSuelta() { CAM.foco = null; }
function camPlanta() { const o = camObj(); CAM.cx = o.x; CAM.cy = o.y; CAM.cel = o.cel; encuadra(); }
function camPaso(dt) {
  const o = camObj();
  const kr = 1 - Math.exp(-dt * CAM_VEL), kz = 1 - Math.exp(-dt * CAM_ZOOM);
  CAM.cx += (o.x - CAM.cx) * kr;
  CAM.cy += (o.y - CAM.cy) * kr;
  CAM.cel += (o.cel - CAM.cel) * kz;
  /* EL PISO DE LA CAMARA SE MIDE CON EL ZOOM DEL CUADRO Y NO CON EL DE
     DESTINO: durante el cierre, la altura visible baja mas despacio que la
     camara, y sin este piso aparece una franja de vacio debajo del terreno.
     Con el, la camara solo puede bajar al ritmo al que se cierra.        */
  CAM.cy = Math.max(CAM.cy, SUELO_Y + camAlto(CAM.cel));
  encuadra();
}
function mundoAPant(x, y) { return { x: OFX + x * PX, y: OFY - y * PX }; }
function pantAMundo(dpx, dpy) { return { x: dpx / PX, y: -dpy / PX }; }

function escInit() {
  CV = $('cv');
  G2 = CV.getContext('2d', { alpha: false });
  aplicaCalidad();
}
/* LAS TRES CALIDADES CAMBIAN LO QUE CUESTA, NO LO QUE EL JUEGO ES: la misma
   partida, el mismo terreno y los mismos duelos en las tres.              */
function aplicaCalidad() {
  const C = CALIDADES[PROG.cal] || CALIDADES.media;
  DPR = Math.min(window.devicePixelRatio || 1, C.px);
  DET = C.det;
  CIELOS.length = 0;
  medir();
}
function medir() {
  const m = $('marco').getBoundingClientRect();
  ANCHO = Math.max(1, Math.round(m.width)); ALTO = Math.max(1, Math.round(m.height));
  document.documentElement.style.setProperty('--mw', ANCHO + 'px');
  if (CV) { CV.width = Math.round(ANCHO * DPR); CV.height = Math.round(ALTO * DPR); }
  if (CAM.foco) encuadra(); else camPlanta();
  if (DIO) rayasArma(DIO.M ? DIO.M.viento : 0);
}

/* ── LA CELDA CON LAS ESQUINAS REDONDEADAS ────────────────────────────────
   ES LO QUE SACA AL TERRENO DE PARECER MINECRAFT. Una reja de cuadrados se
   lee a voxel por muchos colores que tenga; redondeando SOLO las esquinas
   expuestas —las que tienen los dos lados al aire— la union de doscientas
   celdas sale con silueta continua y cantos blandos, que es la forma de
   cualquier plataforma de vector plano.

   Y EL RADIO ESTA TOPADO EN 0,26 A PROPOSITO: es dibujo sobre una fisica que
   sigue siendo cuadrada, asi que la diferencia entre lo que se ve y lo que
   choca no puede pasar de un cuarto de celda. Mas redondo se veria mejor y
   mentiria donde este juego no puede mentir.                              */
const RCOR = 0.26;
function celdaP(p, x, y, nD, nI, nA, nB) {
  const r = RCOR;
  const ti = !nI && !nA, td = !nD && !nA, bd = !nD && !nB, bi = !nI && !nB;
  p.moveTo(x + (bi ? r : 0), y);
  if (bd) { p.lineTo(x + 1 - r, y); p.quadraticCurveTo(x + 1, y, x + 1, y + r); }
  else p.lineTo(x + 1, y);
  if (td) { p.lineTo(x + 1, y + 1 - r); p.quadraticCurveTo(x + 1, y + 1, x + 1 - r, y + 1); }
  else p.lineTo(x + 1, y + 1);
  if (ti) { p.lineTo(x + r, y + 1); p.quadraticCurveTo(x, y + 1, x, y + 1 - r); }
  else p.lineTo(x, y + 1);
  if (bi) { p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); }
  else p.lineTo(x, y);
  p.closePath();
}

/* ── EL TERRENO ───────────────────────────────────────────────────────────
   Un `Path2D` por material, armado UNA VEZ y redibujado tal cual en cada
   cuadro: el terreno solo cambia cuando un crater lo cambia, y ahi se rehace
   entero. Con las celdas dibujadas de a una serian doscientas ordenes por
   cuadro para poner siempre lo mismo.                                     */
const CAPA = 0.30;         /* el alto de la tapa: lo que en vector plano
                              separa una plataforma de un rectangulo */
function terrArma(M) {
  const pal = PALETAS[(M.paleta || 0) % PALETAS.length];
  const tin = _h2r(pal.t);
  const solido = (x, y) => {
    if (y < 0) return true;
    if (x < 0) x = 0; else if (x >= M.nx) x = M.nx - 1;   /* el mundo sigue
       fuera del marco: tratando el borde como aire, el terreno aparece
       cortado en vertical justo en el canto de la pantalla. */
    if (y >= M.ny) return false;
    return en(M, x, y, ZC) !== VACIO;
  };
  const capas = new Map();
  const dame = t => {
    let o = capas.get(t);
    if (!o) {
      const base = mezR(satura(BLOQ[t].col), tin, pal.k * pal.bruma * 0.5);
      const tapa = mezR(satura(BLOQ[t].top), tin, pal.k * pal.bruma * 0.5);
      o = { t, fill: new Path2D(), cap: new Path2D(), lin: new Path2D(),
            col: base, cap0: tapa, borde: luz(base, -0.16), det: luz(base, -0.10) };
      capas.set(t, o);
    }
    return o;
  };
  /* las dos alas: el mundo se prolonga tres celdas para cada lado con la
     columna del borde, asi el terreno llega hasta el canto del marco */
  for (const [xa, xb, xs] of [[-3, -1, 0], [M.nx, M.nx + 2, M.nx - 1]]) {
    for (let x = xa; x <= xb; x++) for (let y = 0; y < M.ny; y++) {
      const t = en(M, xs, y, ZC); if (t === VACIO) continue;
      const o = dame(t);
      celdaP(o.fill, x, y, solido(x + 1, y) || x >= M.nx, solido(x - 1, y) || x < 0, solido(xs, y + 1), true);
    }
  }
  for (let y = 0; y < M.ny; y++) for (let x = 0; x < M.nx; x++) {
    const t = en(M, x, y, ZC); if (t === VACIO) continue;
    const o = dame(t);
    const nD = solido(x + 1, y), nI = solido(x - 1, y), nA = solido(x, y + 1), nB = solido(x, y - 1);
    celdaP(o.fill, x, y, nD, nI, nA, nB);
  }
  /* LA TAPA SE ARMA APARTE Y CON SU PROPIA REDONDEZ: metida en el mismo
     bucle que el relleno habria que inventarle vecinos, y una tapa con la
     esquina cuadrada al lado de un cuerpo redondeado se ve peor que las dos
     cuadradas.                                                            */
  for (let y = 0; y < M.ny; y++) for (let x = -3; x < M.nx + 3; x++) {
    const xs = cl(x, 0, M.nx - 1);
    const t = en(M, xs, y, ZC); if (t === VACIO) continue;
    if (solido(x, y + 1)) continue;
    const o = dame(t);
    const rd = solido(x + 1, y) && !solido(x + 1, y + 1);
    const ri = solido(x - 1, y) && !solido(x - 1, y + 1);
    const p = o.cap, y0 = y + 1 - CAPA, r = Math.min(RCOR, CAPA);
    p.moveTo(x, y0); p.lineTo(x + 1, y0);
    if (!rd && !solido(x + 1, y)) { p.lineTo(x + 1, y + 1 - r); p.quadraticCurveTo(x + 1, y + 1, x + 1 - r, y + 1); }
    else p.lineTo(x + 1, y + 1);
    if (!ri && !solido(x - 1, y)) { p.lineTo(x + r, y + 1); p.quadraticCurveTo(x, y + 1, x, y + 1 - r); }
    else p.lineTo(x, y + 1);
    p.closePath();
  }
  /* la textura: son marcas, no una foto. Van con el color del propio bloque
     un escalon mas oscuro, asi el material se lee y el cuadro no se ensucia */
  if (DET > 0) for (let y = 0; y < M.ny; y++) for (let x = 0; x < M.nx; x++) {
    const t = en(M, x, y, ZC); if (t === VACIO) continue;
    if (en(M, x, y + 1, ZC) === VACIO && (t === PASTO || t === NIEVE)) continue;
    const o = dame(t), p = o.lin, R = azar((x * 733) ^ (y * 199) ^ (t * 37));
    if (t === LADRILLO || t === PIEDRA) {
      const off = (y % 2) * 0.5;
      p.moveTo(x, y + 0.5); p.lineTo(x + 1, y + 0.5);
      p.moveTo(x + off, y); p.lineTo(x + off, y + 0.5);
      p.moveTo(x + (off + 0.5) % 1, y + 0.5); p.lineTo(x + (off + 0.5) % 1, y + 1);
    } else if (t === MADERA) {
      p.moveTo(x, y + 0.34); p.lineTo(x + 1, y + 0.34);
      p.moveTo(x, y + 0.70); p.lineTo(x + 1, y + 0.70);
    } else if (t === METAL) {
      for (const [dx, dy] of [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]]) {
        p.moveTo(x + dx + 0.06, y + dy); p.arc(x + dx, y + dy, 0.06, 0, 6.2832);
      }
    } else {
      /* TIERRA, ARENA Y PASTO TAMBIEN SE MARCAN EN MEDIA, y no es un lujo: el
         terreno de este juego baja de la plataforma hasta el canto de abajo,
         o sea que un cuarto de la pantalla es ese material. Sin una sola
         marca eso no se lee a tierra, se lee a un rectangulo marron —medido
         en la captura de la pradera, la banda de abajo salia lisa de punta a
         punta mientras la de piedra, que si tiene junta, se leia a muro.    */
      const nm = DET > 1 ? 3 : 2;
      for (let i = 0; i < nm; i++) {
        const ax = x + 0.15 + R() * 0.7, ay = y + 0.15 + R() * 0.7, s = 0.06 + R() * 0.09;
        p.moveTo(ax - s, ay); p.lineTo(ax + s, ay);
      }
    }
  }
  /* el pasto y la nieve: briznas en la tapa, que es lo unico que dice de que
     esta hecha la superficie sobre la que se para el arquero */
  const brizna = new Path2D();
  let hayBr = false, brCol = null;
  if (DET > 0) for (let x = -3; x < M.nx + 3; x++) {
    const xs = cl(x, 0, M.nx - 1);
    const hy = altura(M, xs); if (hy <= 0) continue;
    const t = en(M, xs, hy - 1, ZC);
    if (t !== PASTO && t !== HOJA) continue;
    hayBr = true;
    const o = dame(t); brCol = luz(o.cap0, 0.10);
    const R = azar((x * 977) ^ 61);
    const nb = DET > 1 ? 5 : 3;
    for (let i = 0; i < nb; i++) {
      const ax = x + 0.08 + R() * 0.84, al = 0.16 + R() * 0.22, dx = (R() - 0.5) * 0.18;
      brizna.moveTo(ax, hy); brizna.quadraticCurveTo(ax + dx * 0.5, hy + al * 0.6, ax + dx, hy + al);
    }
  }
  return { capas: [...capas.values()], brizna, hayBr, brCol };
}
function terrDibuja(g, T2) {
  for (const o of T2.capas) {
    g.fillStyle = _r2c(o.col); g.fill(o.fill); LLAM++;
    g.fillStyle = _r2c(o.cap0); g.fill(o.cap); LLAM++;
    if (DET > 0) {
      g.strokeStyle = _rgba(o.borde, 0.34); g.lineWidth = 0.045; g.stroke(o.lin); LLAM++;
    }
  }
  if (T2.hayBr) {
    g.strokeStyle = _r2c(T2.brCol); g.lineWidth = 0.055; g.lineCap = 'round';
    g.stroke(T2.brizna); LLAM++;
  }
}

/* ── EL FONDO ─────────────────────────────────────────────────────────────
   DOS BANDAS Y NADA MAS. En vector plano la profundidad es cuantas capas hay
   y de que color, no cuanto detalle tiene cada una: una banda con arboles
   dibujados uno por uno se lee mas cerca que el terreno.                  */
function crestaP(rnd, base, amp, freq, punta) {
  const p = new Path2D();
  const x0 = -4, x1 = NX + 4, paso = 0.5;
  const f1 = rnd() * 6.28, f2 = rnd() * 6.28;
  p.moveTo(x0, -4);
  for (let x = x0; x <= x1 + 0.01; x += paso) {
    let n = Math.sin(x * freq + f1) * 0.62 + Math.sin(x * freq * 2.3 + f2) * 0.38;
    if (punta) n = Math.pow(Math.abs(n), 0.62) * Math.sign(n);
    p.lineTo(x, base + n * amp);
  }
  p.lineTo(x1, -4); p.closePath();
  return p;
}
function arbolesP(rnd, base, n, alto, conif) {
  const p = new Path2D();
  for (let i = 0; i < n; i++) {
    const x = -3 + rnd() * (NX + 6), h = alto * (0.7 + rnd() * 0.6), w = h * (conif ? 0.34 : 0.52);
    const y = base + (rnd() - 0.5) * 1.2;
    if (conif) {
      for (let k = 0; k < 3; k++) {
        const kk = k / 3, yy = y + h * kk, ww = w * (1 - kk * 0.55), hh = h * 0.52;
        p.moveTo(x - ww, yy); p.lineTo(x, yy + hh); p.lineTo(x + ww, yy); p.closePath();
      }
    } else {
      p.moveTo(x + w, y + h * 0.55); p.arc(x, y + h * 0.55, w, 0, 6.2832);
      p.rect(x - w * 0.13, y, w * 0.26, h * 0.6);
    }
  }
  return p;
}
function fondoArma(M) {
  const pal = PALETAS[(M.paleta || 0) % PALETAS.length];
  const rnd = azar((M.n + 3) * 4517 + 19);
  const tin = _h2r(pal.t);
  const c1 = mezR(satura(pal.lejos[0]), tin, pal.bruma * 1.25);
  const c2 = mezR(satura(pal.lejos[1]), tin, pal.bruma * 0.60);
  const L = [];
  if (M.bio === 'monte') {
    L.push({ p: crestaP(rnd, 15, 6.2, 0.34, true), c: c1 });
    if (DET > 0) L.push({ p: crestaP(rnd, 10, 4.0, 0.52, true), c: c2 });
  } else if (M.bio === 'desierto') {
    L.push({ p: crestaP(rnd, 11, 3.0, 0.26, false), c: c1 });
    if (DET > 0) L.push({ p: crestaP(rnd, 7.5, 2.2, 0.42, false), c: c2 });
  } else if (M.bio === 'bosque') {
    L.push({ p: crestaP(rnd, 11, 2.4, 0.30, false), c: c1 });
    if (DET > 0) {
      L.push({ p: arbolesP(rnd, 10, DET > 1 ? 16 : 9, 4.6, true), c: c1 });
      L.push({ p: crestaP(rnd, 8, 1.8, 0.46, false), c: c2 });
    }
  } else {
    L.push({ p: crestaP(rnd, 12, 3.4, 0.28, false), c: c1 });
    if (DET > 0) {
      L.push({ p: crestaP(rnd, 8.5, 2.2, 0.44, false), c: c2 });
      L.push({ p: arbolesP(rnd, 8.2, DET > 1 ? 9 : 5, 3.0, false), c: c2 });
    }
  }
  return L;
}

/* ══════════════════════ EL MUNDO DIBUJADO ══════════════════════ */
function fondoDe(pi) {
  const pal = PALETAS[pi % PALETAS.length];
  /* el degradado de CSS no se va: es lo que se ve mientras el modulo carga y
     en el primer cuadro, antes de que haya nada dibujado. */
  $('marco').style.background = 'linear-gradient(180deg,' + pal.cielo[0] + ' 0%,' +
    pal.cielo[1] + ' 40%,' + pal.cielo[2] + ' 72%,' + pal.cielo[3] + ' 100%)';
  CIELO_PI = pi % PALETAS.length;
}
function soltaMundo() { DIO = null; }

function construyeMundo(M) {
  const pi = (M.paleta || 0) % PALETAS.length;
  fondoDe(pi);
  DIO = {
    M, pi,
    terr: terrArma(M),
    fondo: fondoArma(M),
    fl: null,                       /* la flecha en vuelo */
    pv: null,                       /* la vista previa */
    cla: [],                        /* las clavadas */
    eqD: new Float32Array(26 * 5), eqN: 0, eqC: [200, 200, 200],
    raD: new Float32Array(30 * 3), raN: 0,
    esD: new Float32Array(EST_N * 2), esI: 0, esN: 0,   /* la estela */
  };
  rayasArma(M.viento);
}
function rehaceTerreno() { if (DIO) DIO.terr = terrArma(DIO.M); }

/* ── LA FLECHA ────────────────────────────────────────────────────────────
   El rumbo sale de la VELOCIDAD y no de restar dos posiciones: en el apice
   vy cruza el cero y con posiciones la flecha pega un tiron justo ahi.    */
/* ── LA ESTELA ────────────────────────────────────────────────────────────
   ES LO QUE HACE VISIBLE LA FLECHA DEL RIVAL. Su vuelo dura unas cuatro
   decimas y la flecha mide 33 px: mirando el cuadro suelto no hay nada que
   ver, porque lo que la delata no es su forma sino su RECORRIDO. Catorce
   posiciones guardadas —siete celdas de cola a velocidad de crucero— y todas
   en UN solo trazo: son puntos que se achican, igual que la vista previa, y
   eso no es coqueteria — con una polilinea que se afina harian falta trece
   llamadas de dibujo por cuadro sobre un cuadro que cuesta setenta y cinco.
   Y de paso las dos cosas hablan el mismo idioma: puntos blancos = camino de
   la flecha, antes y despues de soltarla.                                 */
const EST_N = 14;
function flechaPon(x, y, vx, vy) {
  if (!DIO) return;
  DIO.fl = { x, y, a: Math.atan2(vy, vx) };
  DIO.esD[DIO.esI * 2] = x; DIO.esD[DIO.esI * 2 + 1] = y;
  DIO.esI = (DIO.esI + 1) % EST_N;
  if (DIO.esN < EST_N) DIO.esN++;
}
function flechaOculta() { if (DIO) { DIO.fl = null; DIO.esN = 0; DIO.esI = 0; } }
function previaPon(pts, n) {
  if (!DIO) return;
  const c = Math.min(n, Math.floor(pts.length / 2));
  DIO.pv = { pts, n: c };
}
function previaOculta() { if (DIO) DIO.pv = null; }
function clavaFlecha(x, y, ang) {
  if (!DIO) return;
  DIO.cla.push({ x, y, a: ang });
  if (DIO.cla.length > 14) DIO.cla.shift();
}
function limpiaClavadas() { if (DIO) DIO.cla.length = 0; }

const FL_L = 0.95;
function flechaP(g, x, y, a, col, pl) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.lineCap = 'round';
  g.strokeStyle = col; g.lineWidth = 0.085;
  g.beginPath(); g.moveTo(-FL_L, 0); g.lineTo(0, 0); g.stroke(); LLAM++;
  g.fillStyle = col;
  g.beginPath(); g.moveTo(0.16, 0); g.lineTo(-0.10, 0.13); g.lineTo(-0.10, -0.13); g.closePath(); g.fill(); LLAM++;
  g.fillStyle = pl;
  g.beginPath();
  g.moveTo(-FL_L, 0); g.lineTo(-FL_L + 0.26, 0.15); g.lineTo(-FL_L + 0.20, 0); g.lineTo(-FL_L + 0.26, -0.15);
  g.closePath(); g.fill(); LLAM++;
  g.restore();
}

/* ── EL ESTALLIDO ────────────────────────────────────────────────────────
   Cinco datos por esquirla en un solo Float32Array: con un objeto por
   particula, veintiseis objetos nuevos por impacto son basura para el
   recolector justo en el cuadro del golpe.                                */
function estalla(x, y, tp, fuerza) {
  if (!DIO) return;
  const B = BLOQ[tp] || BLOQ[PIEDRA];
  DIO.eqC = satura(B.col);
  const n = DET === 0 ? 14 : (DET === 1 ? 20 : 26);
  const R = azar(((x * 977) | 0) ^ ((y * 613) | 0) ^ 7);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.2832, v = (2.4 + R() * 6.0) * fuerza;
    DIO.eqD[i * 5] = x; DIO.eqD[i * 5 + 1] = y;
    DIO.eqD[i * 5 + 2] = Math.cos(a) * v;
    DIO.eqD[i * 5 + 3] = Math.abs(Math.sin(a)) * v * 1.15 + 1.5;
    DIO.eqD[i * 5 + 4] = 0.45 + R() * 0.42;
  }
  DIO.eqN = n;
}

/* ── LAS RAYAS DEL VIENTO ─────────────────────────────────────────────── */
/* LA BANDA DE LAS RAYAS ES FIJA Y NO SALE DEL ENCUADRE: con la camara
   moviendose, sembrarlas contra el alto visible del momento las dejaria
   apiladas en la franja del ultimo `medir()` — y encima habria que
   resembrarlas por cuadro, que es justo lo que este arreglo no hace. */
const RAYA_ALTO = 34;
function rayasArma(w) {
  if (!DIO) return;
  const n = Math.abs(w) < 0.4 ? 0 : (DET === 0 ? 12 : DET === 1 ? 20 : 30);
  const R = azar(((w * 100) | 0) + 991);
  for (let i = 0; i < n; i++) {
    DIO.raD[i * 3] = R() * (NX + 8) - 4;
    DIO.raD[i * 3 + 1] = 4 + R() * RAYA_ALTO;
    DIO.raD[i * 3 + 2] = 0.5 + R() * 1.2;
  }
  DIO.raN = n;
}

function escPaso(dt, w) {
  camPaso(dt);
  if (!DIO) return;
  CIELO_OX -= (w || 0) * dt * 1.9;
  if (DIO.eqN > 0) {
    let vivas = 0;
    for (let i = 0; i < DIO.eqN; i++) {
      const b = i * 5;
      if (DIO.eqD[b + 4] <= 0) continue;
      DIO.eqD[b + 4] -= dt;
      DIO.eqD[b + 3] -= 26 * dt;
      DIO.eqD[b] += DIO.eqD[b + 2] * dt;
      DIO.eqD[b + 1] += DIO.eqD[b + 3] * dt;
      if (DIO.eqD[b + 4] > 0) vivas++;
    }
    if (!vivas) DIO.eqN = 0;
  }
  if (DIO.raN > 0) {
    const v = (w || 0) * 0.85;
    for (let i = 0; i < DIO.raN; i++) {
      const b = i * 3;
      DIO.raD[b] += v * dt;
      if (DIO.raD[b] > NX + 5) DIO.raD[b] -= NX + 10;
      if (DIO.raD[b] < -5) DIO.raD[b] += NX + 10;
    }
  }
}

/* ══════════════════════ EL CUADRO ══════════════════════ */
function escDibuja() {
  if (!G2) return;
  LLAM = 0;
  const g = G2;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  /* el cielo: dos pegadas con el corrimiento del viento */
  const cie = cieloLienzo(CIELO_PI);
  let ox = CIELO_OX % ANCHO; if (ox > 0) ox -= ANCHO;
  g.imageSmoothingEnabled = true;
  g.drawImage(cie, ox, 0, ANCHO, ALTO); LLAM++;
  g.drawImage(cie, ox + ANCHO, 0, ANCHO, ALTO); LLAM++;

  if (!DIO) { LLAM_ANT = LLAM; return; }

  g.save();
  g.translate(OFX, OFY); g.scale(PX, -PX);
  g.lineJoin = 'round'; g.lineCap = 'round';

  for (const l of DIO.fondo) { g.fillStyle = _r2c(l.c); g.fill(l.p); LLAM++; }

  if (DIO.raN > 0) {
    g.strokeStyle = 'rgba(255,255,255,.34)'; g.lineWidth = 0.055;
    g.beginPath();
    for (let i = 0; i < DIO.raN; i++) {
      const b = i * 3;
      g.moveTo(DIO.raD[b], DIO.raD[b + 1]);
      g.lineTo(DIO.raD[b] + DIO.raD[b + 2] * Math.sign(DIO.M.viento || 1), DIO.raD[b + 1]);
    }
    g.stroke(); LLAM++;
  }

  terrDibuja(g, DIO.terr);

  /* las clavadas van DEBAJO de los arqueros: una flecha clavada en la meseta
     tapando la pierna se lee a que le entro por el pie */
  if (DIO.cla.length) for (const c of DIO.cla) flechaP(g, c.x, c.y, c.a, '#5a4130', '#e8e2d4');

  arqDibuja(g, ARQ[0]); arqDibuja(g, ARQ[1]);

  if (DIO.pv) {
    g.fillStyle = 'rgba(255,255,255,.72)';
    g.beginPath();
    for (let i = 0; i < DIO.pv.n; i++) {
      const x = DIO.pv.pts[i * 2], y = DIO.pv.pts[i * 2 + 1], r = 0.115 * (1 - i * 0.085);
      g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832);
    }
    g.fill(); LLAM++;
  }
  if (DIO.fl && DIO.esN > 1) {
    const n = DIO.esN;
    g.fillStyle = 'rgba(255,255,255,.36)';
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const i = (DIO.esI - n + k + EST_N * 2) % EST_N;
      const u = (k + 1) / n, r = 0.105 * u * u;
      const x = DIO.esD[i * 2], y = DIO.esD[i * 2 + 1];
      g.moveTo(x + r, y); g.arc(x, y, r, 0, 6.2832);
    }
    g.fill(); LLAM++;
  }
  if (DIO.fl) flechaP(g, DIO.fl.x, DIO.fl.y, DIO.fl.a, '#4a3222', '#f2ece0');

  if (DIO.eqN > 0) {
    g.fillStyle = _r2c(DIO.eqC);
    g.beginPath();
    for (let i = 0; i < DIO.eqN; i++) {
      const b = i * 5; if (DIO.eqD[b + 4] <= 0) continue;
      const k = cl(DIO.eqD[b + 4] / 0.6, 0, 1), s = 0.13 * k;
      g.rect(DIO.eqD[b] - s, DIO.eqD[b + 1] - s, s * 2, s * 2);
    }
    g.fill(); LLAM++;
  }

  g.restore();
  LLAM_ANT = LLAM;
}

function escCosto() {
  return { llamadas: LLAM_ANT, triangulos: 0, cal: PROG.cal,
           px: +DPR.toFixed(2), w: ANCHO, h: ALTO, det: DET,
           encW: +ENC_W.toFixed(2), encH: +ENC_H.toFixed(2), mira: +MIRA.toFixed(2),
           celda: +PX.toFixed(2),
           cam: { cx: +CAM.cx.toFixed(2), cy: +CAM.cy.toFixed(2), cel: +CAM.cel.toFixed(2),
                  foco: !!CAM.foco,
                  arqPx: +(ARQ_ALTO * PX).toFixed(1), flePx: +((FL_L + 0.16) * PX).toFixed(1),
                  bajo: +(CAM.cy - ENC_H).toFixed(3), izq: +(CAM.cx - ENC_W).toFixed(2),
                  der: +(CAM.cx + ENC_W).toFixed(2) } };
}
