/* ══════════════════════════════════════════════════════════════════════════
   EF · EL FONDO: LA MESA

   El tablero es tinta sobre papel, asi que el fondo no es un adorno detras:
   es LA MESA sobre la que esta apoyada la hoja. Y era lo mismo en los seis
   mundos — un degradado de CSS — o sea que la unica pantalla que el jugador
   mira doscientas veces no cambiaba nunca.

   SE HORNEA UNA VEZ POR MUNDO Y DESPUES ES UNA COPIA. Las fibras del papel
   son quinientos trazos y la trama del telar mil doscientos: dibujarlos en
   cada cuadro son setenta y cinco mil ordenes por segundo para obtener
   SIEMPRE LA MISMA IMAGEN. Es la misma leccion que en Maicol convirtio el
   nivel repintado casilla por casilla en un lienzo horneado.

   Y LA MESA SE OSCURECE A LO LARGO DEL JUEGO. Los mundos 1 a 4 son mesa de
   dia y el 5 y el 6 son de noche, con la hoja blanca como unico sitio
   iluminado. Eso lo permite el propio juego: la tinta vive en el papel, asi
   que apagar la mesa no toca la legibilidad de una sola flecha — y le da al
   recorrido un arco que seis matices del mismo beige no pueden dar.
   ══════════════════════════════════════════════════════════════════════════ */

/* Va como TABLA y no derivado del tinte: lo que tiene que leerse de un
   vistazo es en que mundo estas, y para eso el fondo tiene que cambiar de
   material y no de matiz.                                                  */
const MESA = [
  { a: '#f7f2e6', b: '#ddd3bc', mot: '#8a7a58', osc: 0, tipo: 'fibra'  },
  { a: '#eef3f8', b: '#c6d3e2', mot: '#2e4c78', osc: 0, tipo: 'mancha' },
  { a: '#e8f1ec', b: '#bfd4cb', mot: '#0d5249', osc: 0, tipo: 'traza'  },
  { a: '#f4e8d8', b: '#d2b997', mot: '#6d3a16', osc: 0, tipo: 'nudo'   },
  { a: '#3b2c42', b: '#1a1222', mot: '#b478bd', osc: 1, tipo: 'telar'  },
  { a: '#1a1714', b: '#080707', mot: '#e0b673', osc: 1, tipo: 'salida' },
];
const mesaDe = m => MESA[cl(m | 0, 0, MESA.length - 1)];

let FON = null, FON_K = '';

/* ── una forma blanda ─────────────────────────────────────────────────────
   Doce puntos con el radio movido y curvas cuadraticas POR LOS PUNTOS
   MEDIOS: con `lineTo` la mancha sale un poligono y con `arc` sale un
   circulo. Ninguna de las dos se lee a tinta corrida.                      */
function formaBlanda(x, cx, cy, rad, rug, r) {
  const n = 12, p = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.2832, rr = rad * (1 - rug + r() * rug * 2);
    p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.86]);
  }
  x.beginPath();
  x.moveTo((p[0][0] + p[n - 1][0]) / 2, (p[0][1] + p[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) {
    const q = p[i], s = p[(i + 1) % n];
    x.quadraticCurveTo(q[0], q[1], (q[0] + s[0]) / 2, (q[1] + s[1]) / 2);
  }
  x.closePath();
}

/* ── 1 · PAPEL: fibras y dos dobleces ── */
function motFibra(x, W, H, M, r) {
  x.strokeStyle = M.mot; x.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const px = r() * W, py = r() * H, a = r() * Math.PI, L = 3 + r() * 12;
    x.globalAlpha = .022 + r() * .05; x.lineWidth = .6 + r() * .9;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke();
  }
  x.globalAlpha = 1;
  /* el doblez es un filo claro y una sombra pegada: con una sola linea se
     lee a raya dibujada y no a papel que estuvo plegado.                   */
  for (const fx of [W * 0.265, W * 0.735]) {
    const g = x.createLinearGradient(fx - 15, 0, fx + 15, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.46, 'rgba(255,255,255,.34)');
    g.addColorStop(.56, 'rgba(60,45,20,.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(fx - 15, 0, 30, H);
  }
}

/* ── 2 · TINTA: manchas secas y salpicaduras ── */
function motMancha(x, W, H, M, r) {
  x.fillStyle = M.mot; x.strokeStyle = M.mot;
  for (let i = 0; i < 13; i++) {
    const cx = r() * W, cy = r() * H, rad = 26 + r() * 95;
    x.globalAlpha = .030 + r() * .045;
    formaBlanda(x, cx, cy, rad, .30, r); x.fill();
    /* el cerco: una mancha de tinta seca junta pigmento en el borde */
    x.globalAlpha += .035; x.lineWidth = 1.4;
    formaBlanda(x, cx, cy, rad * 1.03, .30, r); x.stroke();
  }
  for (let i = 0; i < 110; i++) {
    x.globalAlpha = .04 + r() * .09;
    x.beginPath(); x.arc(r() * W, r() * H, .6 + r() * 2.4, 0, 6.2832); x.fill();
  }
}

/* ── 3 · CABLE: trazas de circuito con sus pastillas ── */
function motTraza(x, W, H, M, r) {
  x.strokeStyle = M.mot; x.fillStyle = M.mot; x.lineCap = 'round'; x.lineJoin = 'round';
  for (let i = 0; i < 30; i++) {
    let px = r() * W, py = r() * H;
    const al = .045 + r() * .05;
    x.globalAlpha = al; x.lineWidth = 1.3 + r() * 1.7;
    x.beginPath(); x.moveTo(px, py);
    let hor = r() < .5;
    const n = 2 + ((r() * 4) | 0);
    for (let j = 0; j < n; j++) {
      const L = 28 + r() * 115, s = r() < .5 ? 1 : -1, s2 = r() < .5 ? 1 : -1, e = 16 + r() * 16;
      if (hor) { px += L * s; x.lineTo(px, py); px += e * s; py += e * s2; }
      else { py += L * s; x.lineTo(px, py); py += e * s; px += e * s2; }
      x.lineTo(px, py); hor = !hor;
    }
    x.stroke();
    /* la pastilla: con anillo y agujero, que es lo que separa una placa de
       un dibujo de lineas                                                  */
    x.globalAlpha = al * 1.8;
    const R = 3.4 + r() * 2.2;
    x.beginPath(); x.arc(px, py, R, 0, 6.2832); x.fill();
    x.globalAlpha = al * 3.2; x.lineWidth = 1;
    x.beginPath(); x.arc(px, py, R * 0.42, 0, 6.2832); x.stroke();
  }
}

/* ── 4 · NUDO: sogas con su alma clara ── */
function motNudo(x, W, H, M, r) {
  x.lineCap = 'round';
  for (let i = 0; i < 11; i++) {
    const cx = r() * W, cy = r() * H, R = 34 + r() * 105, gr = 5 + r() * 10;
    const f = 1.5 + ((r() * 3) | 0), fase = r() * 6.28, al = .04 + r() * .04;
    const traza = () => {
      x.beginPath();
      for (let j = 0; j <= 72; j++) {
        const a = j / 72 * 12.566, rr = R * (.5 + .5 * Math.abs(Math.sin(a * f + fase)));
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * .74;
        j ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    };
    x.globalAlpha = al; x.strokeStyle = M.mot; x.lineWidth = gr; traza();
    /* sin el alma clara por dentro esto es una linea gruesa, no una soga */
    x.globalAlpha = al * .8; x.strokeStyle = '#fff'; x.lineWidth = gr * .3; traza();
  }
}

/* ── 5 · TELAR: la trama de verdad ─────────────────────────────────────────
   El hilo vertical pasa POR ENCIMA solo en las celdas impares, y eso es lo
   unico que separa un tejido de una reja.                                  */
function motTelar(x, W, H, M) {
  const p = 17;
  x.strokeStyle = M.mot; x.lineCap = 'butt'; x.lineWidth = p * .54;
  x.globalAlpha = .075;
  for (let y = p / 2; y < H + p; y += p) { x.beginPath(); x.moveTo(-6, y); x.lineTo(W + 6, y); x.stroke(); }
  x.globalAlpha = .095;
  let i = 0;
  for (let xx = p / 2; xx < W + p; xx += p, i++) {
    let j = 0;
    for (let yy = p / 2; yy < H + p; yy += p, j++) {
      if (((i + j) & 1) === 0) continue;
      x.beginPath(); x.moveTo(xx, yy - p / 2 - 1); x.lineTo(xx, yy + p / 2 + 1); x.stroke();
    }
  }
}

/* ── 6 · SALIDA: la puerta ── */
function motSalida(x, W, H, M, r) {
  const cx = W * .5, cy = H * .30;
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * .62);
  g.addColorStop(0, 'rgba(224,182,115,.32)'); g.addColorStop(.42, 'rgba(224,182,115,.085)');
  g.addColorStop(1, 'rgba(224,182,115,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = M.mot; x.lineCap = 'round';
  for (let i = 0; i < 56; i++) {
    const a = r() * 6.2832, d0 = 30 + r() * 60, L = Math.max(W, H) * (.30 + r() * .95);
    x.globalAlpha = .018 + r() * .05; x.lineWidth = .8 + r() * 2.8;
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0);
    x.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); x.stroke();
  }
}

/* ── el horneado ── */
function fondoHornea() {
  const M = mesaDe(JU.m);
  const k = JU.m + '|' + ANCHO + '|' + ALTO + '|' + Math.round(PXR * 100);
  document.body.classList.toggle('oscuro', !!M.osc);
  if (FON_K === k) return;
  FON_K = k;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(ANCHO * PXR)); c.height = Math.max(1, Math.round(ALTO * PXR));
  const x = c.getContext('2d'); x.setTransform(PXR, 0, 0, PXR, 0, 0);
  const W = ANCHO, H = ALTO, r = azar(7717 + JU.m * 9973);
  const g = x.createLinearGradient(W * .15, 0, W * .85, H);
  g.addColorStop(0, M.a); g.addColorStop(1, M.b);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.save();
  if (M.tipo === 'fibra') motFibra(x, W, H, M, r);
  else if (M.tipo === 'mancha') motMancha(x, W, H, M, r);
  else if (M.tipo === 'traza') motTraza(x, W, H, M, r);
  else if (M.tipo === 'nudo') motNudo(x, W, H, M, r);
  else if (M.tipo === 'telar') motTelar(x, W, H, M);
  else motSalida(x, W, H, M, r);
  x.restore(); x.globalAlpha = 1;
  /* la vinieta empuja la vista al centro, que es donde esta la hoja */
  const v = x.createRadialGradient(W * .5, H * .44, Math.min(W, H) * .22, W * .5, H * .44, Math.max(W, H) * .82);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, M.osc ? 'rgba(0,0,0,.62)' : 'rgba(40,30,12,.26)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  FON = c;
}

/* ── las motas ────────────────────────────────────────────────────────────
   Lo unico que se mueve en el fondo, y va LENTO a proposito: cualquier cosa
   que se mueva al ritmo de una flecha compite con la flecha.               */
const MOTA = [];
(function motasArma() {
  const r = azar(90210);
  for (let i = 0; i < 18; i++) MOTA.push({ x: r(), y: r(), r: .7 + r() * 1.9, v: 2 + r() * 7, f: r() * 6.28, w: .25 + r() * .5 });
})();
function motasDibuja(dt) {
  const M = mesaDe(JU.m);
  CX.fillStyle = M.osc ? '#fff4dd' : '#ffffff';
  for (const m of MOTA) {
    m.y -= m.v * dt / ALTO; m.f += m.w * dt;
    if (m.y < -.03) { m.y = 1.03; m.x = Math.random(); }
    CX.globalAlpha = (M.osc ? .42 : .26) * (.32 + .68 * Math.abs(Math.sin(m.f)));
    CX.beginPath();
    CX.arc((m.x + Math.sin(m.f * .7) * .012) * ANCHO, m.y * ALTO, m.r, 0, 6.2832);
    CX.fill();
  }
  CX.globalAlpha = 1;
}
