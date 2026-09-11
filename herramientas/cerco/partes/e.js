/* ══════════════════════════════════════════════════════════════════════════
   E · EL DIBUJO
   EL TABLERO SE HORNEA A UN PIXEL POR CELDA Y SE ESTIRA CON NEAREST. Un
   tablero de 74 son 5.476 celdas: dibujarlas de a un rectangulo son 5.476
   ordenes por cuadro para pintar bloques de color liso. Horneado en una
   ImageData de n×n y estirado con `imageSmoothingEnabled=false` es UNA sola
   orden, y el escalon duro del vecino mas cercano es justo el estilo que
   este juego quiere.
   Y EL MISMO LIENZO DE n×n ES EL MAPA CHICO, que asi cuesta otro drawImage y
   no una segunda pasada por el tablero — con dos dibujantes, el dia que se
   toque uno el mapa chico empieza a mentir.
   ══════════════════════════════════════════════════════════════════════════ */

const V = {
  cv: null, g: null, W: 0, H: 0, dpr: 1, k: 1,
  off: null, og: null, img: null, b32: null, n: 0, zsucio: true,
  camx: 0, camy: 0, esc: 22, visW: 19, visH: 19,
  mini: null, mg: null, miniT: 0,
  prevZ: null, cort: null, viv: null,
  part: [], dest: [], sac: 0, sacx: 0, sacy: 0, gan: new Int32Array(NJUG + 1),
  fa: 0, faT: 0, cuadros: 0, msDib: 0,
};

const vpRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/* el color de cada celda ya empaquetado: el horneado escribe bytes y no
   parsea una cadena cinco mil veces por rebake.                           */
const VP_Z = [], VP_ROCA = vpRGB(C_PIEDRA);
for (let i = 0; i <= NJUG; i++) VP_Z.push(COLS[i] ? vpRGB(COLS[i].z) : [0, 0, 0]);

/* ── EL LIENZO ────────────────────────────────────────────────────────────
   La densidad la topa la calidad y no el aparato: este juego esta limitado
   por RELLENO —todo es superficie plana— asi que cada paso de densidad
   cuesta el cuadrado. A dpr 3 en un marco de 412×892 serian 3,3 millones de
   pixeles por cuadro para dibujar bloques de color.                        */
const VP_DPR = [1, 1.5, 2];
function vpMide() {
  const m = $('marco'), r = m.getBoundingClientRect();
  const d = Math.min(window.devicePixelRatio || 1, VP_DPR[cl(PROG.cal | 0, 0, 2)]);
  const W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
  if (W === V.W && H === V.H && d === V.dpr) return;
  V.W = W; V.H = H; V.dpr = d; V.k = d;
  V.cv.width = W; V.cv.height = H;
  V.esc = W / VISTA;
  V.visW = W / V.esc; V.visH = H / V.esc;
  /* el contexto se resetea al cambiar de tamano: el filtro hay que volver a
     apagarlo o el tablero sale borroneado en vez de pixelado.              */
  V.g.imageSmoothingEnabled = false;
}

function vpInit() {
  V.cv = $('cv'); V.g = V.cv.getContext('2d', { alpha: false });
  V.mini = $('mini'); V.mg = V.mini.getContext('2d');
  V.mg.imageSmoothingEnabled = false;
  vpMide();
  addEventListener('resize', vpMide);
}

/* ── EL HORNEADO ──────────────────────────────────────────────────────────
   Solo el TERRENO y la ROCA, que cambian de tanto en tanto. La estela no
   entra: cambia todos los tics y ademas cada jugador ya lleva su lista de
   celdas (`p.cola`), asi que dibujarla al derecho sale mas barato que
   escanear el tablero entero buscandola.                                   */
function vpNuevo(M) {
  const n = M.n;
  if (V.n !== n || !V.off) {
    V.n = n;
    V.off = document.createElement('canvas'); V.off.width = n; V.off.height = n;
    V.og = V.off.getContext('2d');
    V.img = V.og.createImageData(n, n);
    V.b32 = V.img.data;
    V.prevZ = new Uint8Array(n * n);
  }
  V.prevZ.set(M.z);
  V.cort = new Int32Array(NJUG + 1);
  V.viv = new Uint8Array(NJUG + 1);
  for (const p of M.jug) { V.cort[p.id] = p.cortes; V.viv[p.id] = 1; }
  V.zsucio = true; V.part.length = 0; V.dest.length = 0; V.sac = 0; V.miniT = 0;
  V.camx = cl(M.jug[0].ix - V.visW / 2, 0, Math.max(0, n - V.visW));
  V.camy = cl(M.jug[0].iy - V.visH / 2, 0, Math.max(0, n - V.visH));
}

function vpHornea(M) {
  const n = M.n, z = M.z, d = V.b32;
  for (let i = 0, o = 0; i < z.length; i++, o += 4) {
    const v = z[i];
    if (v === LIBRE) { d[o + 3] = 0; continue; }
    const c = v === PIEDRA ? VP_ROCA : VP_Z[v];
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2];
    /* el terreno va apenas translucido: la reja se sigue viendo por debajo y
       eso es lo que deja contar celdas de una ojeada. La roca va opaca,
       porque lo unico que tiene que decir es «por aca no».                 */
    d[o + 3] = v === PIEDRA ? 255 : 232;
  }
  V.og.putImageData(V.img, 0, 0);
  V.zsucio = false;
}

/* ── LO QUE CAMBIO ────────────────────────────────────────────────────────
   Un barrido del tablero por cuadro contra la copia anterior: con 5.476
   celdas son trescientas mil comparaciones por segundo, o sea nada, y a
   cambio el destello del cercado, el rehorneado y las esquirlas de la
   muerte salen de UN solo sitio en vez de tres avisos que alguien tiene que
   acordarse de mandar.                                                     */
function vpTras(M) {
  const n = M.n, z = M.z, pz = V.prevZ;
  let cam = 0;
  const nue = [];
  V.gan.fill(0);
  for (let i = 0; i < z.length; i++) {
    if (z[i] === pz[i]) continue;
    cam++;
    if (z[i] > 0 && z[i] < PIEDRA) { nue.push(i); V.gan[z[i]]++; }
    pz[i] = z[i];
  }
  if (cam) { V.zsucio = true; V.miniT = 0; }
  if (nue.length) {
    const id = z[nue[0]];
    V.dest.push({ c: nue, id, t: 0 });
    if (V.dest.length > 6) V.dest.shift();
  }
  for (const p of M.jug) {
    if (p.cortes !== V.cort[p.id]) {
      V.cort[p.id] = p.cortes;
      vpEsquirlas(p.ix, p.iy, p.id);
      if (p.id === 1) V.sac = 1;
    }
    V.viv[p.id] = p.vivo ? 1 : 0;
  }
  /* devuelve cuantas celdas gano cada uno EN ESTE CUADRO. El barrido ya esta
     hecho para el rehorneado y el destello; contarlo aparte en la capa de
     juego seria recorrer el tablero dos veces para saber lo mismo.        */
  return V.gan;
}

function vpEsquirlas(x, y, id) {
  const c = COLS[id] || COLS[1];
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 7;
    V.part.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      t: 0, vida: 0.35 + Math.random() * 0.3, c: i & 1 ? c.t : c.c });
  }
}

/* ── LA CAMARA ────────────────────────────────────────────────────────────
   Sigue al jugador con un suavizado exponencial —asi va igual a 30 y a 144
   cuadros— y se topa contra el tablero DEJANDO DOS CELDAS DE MARGEN: sin
   margen la pared no se ve nunca y morir contra el borde se lee a que el
   juego te mato sin avisar.                                                */
const VP_MARG = 2;
function vpCam(M, dt) {
  const p = M.jug[0];
  let tx = p.ix + p.dx * M.f + 0.5 - V.visW / 2;
  let ty = p.iy + p.dy * M.f + 0.5 - V.visH / 2;
  const n = M.n;
  if (V.visW >= n + VP_MARG * 2) tx = (n - V.visW) / 2;
  else tx = cl(tx, -VP_MARG, n - V.visW + VP_MARG);
  if (V.visH >= n + VP_MARG * 2) ty = (n - V.visH) / 2;
  else ty = cl(ty, -VP_MARG, n - V.visH + VP_MARG);
  const a = 1 - Math.exp(-dt * 11);
  V.camx += (tx - V.camx) * a;
  V.camy += (ty - V.camy) * a;
  if (V.sac > 0) {
    V.sac = Math.max(0, V.sac - dt * 3.4);
    const s = V.sac * V.sac * 0.55;
    V.sacx = (Math.random() * 2 - 1) * s; V.sacy = (Math.random() * 2 - 1) * s;
  } else { V.sacx = 0; V.sacy = 0; }
}

/* ══════════════════════════ EL CUADRO ══════════════════════════ */
function vpDibuja(M, dt) {
  const t0 = performance.now();
  const g = V.g, e = V.esc, W = V.W, H = V.H, n = M.n;
  const cx = V.camx + V.sacx, cy = V.camy + V.sacy;
  const px = x => (x - cx) * e, py = y => (y - cy) * e;

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = C_TABLA; g.fillRect(0, 0, W, H);

  const x0 = Math.max(0, Math.floor(cx) - 1), x1 = Math.min(n, Math.ceil(cx + V.visW) + 1);
  const y0 = Math.max(0, Math.floor(cy) - 1), y1 = Math.min(n, Math.ceil(cy + V.visH) + 1);

  /* la reja va DEBAJO del terreno y se ve por su alfa: dibujada encima
     compite con la estela, que es lo unico que hay que mirar.             */
  g.strokeStyle = C_LINEA; g.lineWidth = Math.max(1, V.k * 0.9);
  g.beginPath();
  for (let x = x0; x <= x1; x++) { const s = Math.round(px(x)) + 0.5; g.moveTo(s, 0); g.lineTo(s, H); }
  for (let y = y0; y <= y1; y++) { const s = Math.round(py(y)) + 0.5; g.moveTo(0, s); g.lineTo(W, s); }
  g.stroke();

  /* el borde del tablero, que es pared y mata */
  g.strokeStyle = '#3b4760'; g.lineWidth = V.k * 3;
  g.strokeRect(px(0), py(0), n * e, n * e);

  if (V.zsucio) vpHornea(M);
  g.imageSmoothingEnabled = false;
  g.drawImage(V.off, 0, 0, n, n, px(0), py(0), n * e, n * e);

  vpBordes(M, x0, y0, x1, y1, px, py, e);
  vpEstelas(M, px, py, e);
  vpDestellos(M, dt, px, py, e);
  vpCabezas(M, px, py, e);
  vpPart(dt, px, py, e);

  V.msDib = performance.now() - t0;
  V.cuadros++;
}

/* ── LOS BORDES ───────────────────────────────────────────────────────────
   Un bloque de color liso no dice donde termina lo tuyo cuando lo tuyo toca
   lo de otro. Se barre la VENTANA VISIBLE —unas novecientas celdas, no las
   cinco mil— mirando el vecino de la derecha y el de abajo, asi cada arista
   se visita una sola vez, y sale una ruta por jugador mas una para la roca.
   Son seis trazos por cuadro.                                              */
function vpBordes(M, x0, y0, x1, y1, px, py, e) {
  const g = V.g, n = M.n, z = M.z;
  const rutas = [];
  for (let i = 0; i <= NJUG + 1; i++) rutas.push(null);
  const dame = k => rutas[k] || (rutas[k] = new Path2D());
  const val = (x, y) => (x < 0 || y < 0 || x >= n || y >= n) ? -1 : z[y * n + x];
  for (let y = y0 - 1; y <= y1; y++) for (let x = x0 - 1; x <= x1; x++) {
    const a = val(x, y);
    const b = val(x + 1, y);
    if (a !== b) {
      const k = a === PIEDRA || b === PIEDRA ? NJUG + 1 : Math.max(a, b);
      if (k > 0) { const p = dame(k), sx = px(x + 1); p.moveTo(sx, py(y)); p.lineTo(sx, py(y + 1)); }
    }
    const c = val(x, y + 1);
    if (a !== c) {
      const k = a === PIEDRA || c === PIEDRA ? NJUG + 1 : Math.max(a, c);
      if (k > 0) { const p = dame(k), sy = py(y + 1); p.moveTo(px(x), sy); p.lineTo(px(x + 1), sy); }
    }
  }
  for (let k = 1; k <= NJUG; k++) {
    if (!rutas[k]) continue;
    g.strokeStyle = COLS[k].t; g.globalAlpha = k === 1 ? 0.85 : 0.5;
    g.lineWidth = V.k * (k === 1 ? 2.2 : 1.6);
    g.stroke(rutas[k]);
  }
  g.globalAlpha = 1;
  if (rutas[NJUG + 1]) { g.strokeStyle = '#4d5c78'; g.lineWidth = V.k * 1.4; g.stroke(rutas[NJUG + 1]); }
}

/* ── LAS ESTELAS ──────────────────────────────────────────────────────────
   Salen de `p.cola`, que es la lista que el modelo ya lleva: buscarlas
   escaneando el tablero seria repetir un trabajo que ya esta hecho. La
   propia va MAS GRUESA y con halo, porque es lo unico del juego que mata.  */
function vpEstelas(M, px, py, e) {
  const g = V.g, n = M.n;
  for (const p of M.jug) {
    if (!p.vivo || !p.cola.length) continue;
    const c = COLS[p.id], mio = p.id === 1;
    const w = e * (mio ? 0.62 : 0.5), o = (e - w) / 2;
    if (mio) {
      g.globalAlpha = 0.30; g.fillStyle = c.t;
      for (const i of p.cola) {
        const x = i % n, y = (i / n) | 0;
        const sx = px(x), sy = py(y);
        if (sx < -e || sy < -e || sx > V.W || sy > V.H) continue;
        g.fillRect(sx - e * 0.16, sy - e * 0.16, e * 1.32, e * 1.32);
      }
      g.globalAlpha = 1;
    }
    g.fillStyle = c.t;
    for (const i of p.cola) {
      const x = i % n, y = (i / n) | 0;
      const sx = px(x), sy = py(y);
      if (sx < -e || sy < -e || sx > V.W || sy > V.H) continue;
      g.fillRect(sx + o, sy + o, w, w);
    }
  }
}

/* ── EL DESTELLO DEL CERCADO ──────────────────────────────────────────────
   Lo que se acaba de ganar se enciende y se apaga en medio segundo: sin eso
   el terreno nuevo aparece de un cuadro al otro y la unica recompensa del
   juego no se ve ocurrir.                                                  */
const VP_DEST_S = 0.52;
function vpDestellos(M, dt, px, py, e) {
  const g = V.g, n = M.n;
  for (let k = V.dest.length - 1; k >= 0; k--) {
    const d = V.dest[k];
    d.t += dt;
    if (d.t >= VP_DEST_S) { V.dest.splice(k, 1); continue; }
    const u = d.t / VP_DEST_S;
    g.globalAlpha = (1 - u) * (d.id === 1 ? 0.85 : 0.45);
    g.fillStyle = COLS[d.id].c;
    const cr = e * (0.10 + u * 0.42);
    for (const i of d.c) {
      const x = i % n, y = (i / n) | 0;
      const sx = px(x), sy = py(y);
      if (sx < -e || sy < -e || sx > V.W || sy > V.H) continue;
      g.fillRect(sx + (e - cr) / 2, sy + (e - cr) / 2, cr, cr);
    }
  }
  g.globalAlpha = 1;
}

/* ── LAS CABEZAS ──────────────────────────────────────────────────────────
   Se dibujan en la fraccion: `ix + dx·f`, o sea entre la celda en la que
   estan y la que viene. Con la posicion entera el cuerpo salta de celda en
   celda cinco veces por segundo y el juego se lee a diapositivas.          */
function vpCabezas(M, px, py, e) {
  const g = V.g;
  for (const p of M.jug) {
    if (!p.vivo) continue;
    const c = COLS[p.id], mio = p.id === 1;
    const x = p.ix + p.dx * M.f, y = p.iy + p.dy * M.f;
    const sx = px(x) + e / 2, sy = py(y) + e / 2;
    if (sx < -e * 2 || sy < -e * 2 || sx > V.W + e * 2 || sy > V.H + e * 2) continue;
    if (mio) {
      const gr = g.createRadialGradient(sx, sy, 0, sx, sy, e * 1.9);
      gr.addColorStop(0, 'rgba(255,224,176,.34)'); gr.addColorStop(1, 'rgba(255,224,176,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(sx, sy, e * 1.9, 0, 7); g.fill();
    }
    /* la punta dice para donde va, que es lo unico que el jugador necesita
       saber cuando pide una curva.                                         */
    g.fillStyle = c.t;
    g.beginPath();
    g.arc(sx, sy, e * (mio ? 0.46 : 0.40), 0, 7);
    g.fill();
    g.beginPath();
    g.moveTo(sx + p.dx * e * 0.78, sy + p.dy * e * 0.78);
    g.lineTo(sx - p.dy * e * 0.3 + p.dx * e * 0.15, sy + p.dx * e * 0.3 + p.dy * e * 0.15);
    g.lineTo(sx + p.dy * e * 0.3 + p.dx * e * 0.15, sy - p.dx * e * 0.3 + p.dy * e * 0.15);
    g.closePath(); g.fill();
    g.fillStyle = c.c;
    g.beginPath(); g.arc(sx, sy, e * (mio ? 0.25 : 0.20), 0, 7); g.fill();
  }
}

function vpPart(dt, px, py, e) {
  const g = V.g;
  for (let k = V.part.length - 1; k >= 0; k--) {
    const q = V.part[k];
    q.t += dt;
    if (q.t >= q.vida) { V.part.splice(k, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    q.vx *= 0.93; q.vy *= 0.93;
    const u = 1 - q.t / q.vida, s = e * 0.22 * u;
    g.globalAlpha = u;
    g.fillStyle = q.c;
    g.fillRect(px(q.x) - s / 2, py(q.y) - s / 2, s, s);
  }
  g.globalAlpha = 1;
}

/* ── EL MAPA CHICO ────────────────────────────────────────────────────────
   El mismo lienzo de n×n estirado a 74 px, mas las cabezas y el recuadro de
   lo que se esta mirando. Se repinta cinco veces por segundo y no sesenta:
   nada de lo que muestra cambia mas rapido que eso.                        */
function vpMiniPinta(M) {
  if (V.mini.classList.contains('off')) return;
  V.miniT -= 1;
  if (V.miniT > 0) return;
  V.miniT = 12;
  const g = V.mg, S = V.mini.width, n = M.n, k = S / n;
  if (V.zsucio) vpHornea(M);
  g.clearRect(0, 0, S, S);
  g.imageSmoothingEnabled = false;
  g.drawImage(V.off, 0, 0, n, n, 0, 0, S, S);
  for (const p of M.jug) {
    if (!p.vivo) continue;
    g.fillStyle = COLS[p.id].c;
    const r = p.id === 1 ? 2.6 : 1.9;
    g.beginPath(); g.arc((p.ix + 0.5) * k, (p.iy + 0.5) * k, r, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1;
  g.strokeRect(V.camx * k, V.camy * k, V.visW * k, V.visH * k);
}
