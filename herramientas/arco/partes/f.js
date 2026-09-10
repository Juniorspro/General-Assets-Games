/* ══════════════════════════════════════════════════════════════════════════
   F · LOS DOS ARQUEROS, EN VECTOR PLANO

   EL DIBUJO Y EL BLANCO SON LOS MISMOS NUMEROS. `ARQ_MED`, `ARQ_ALTO`,
   `CAB_MED` y `CAB_ALTO` viven en `d.js` —donde esta el choque— y este
   archivo los LEE. Con dos juegos de medidas, el jugador le pegaria al aire
   donde ve un cuerpo, o al reves: le acertaria a una nada. En un juego cuyo
   unico verbo es apuntar, eso no es un detalle de dibujo.

   Y LA MANO DEL ARCO ES `bocaDe()`, la misma que usan la balistica, el
   resolvedor y el rival. La flecha sale exactamente de donde se ve el arco.

   EL BRAZO SIGUE A LA MANO, NO AL REVES. Lo natural seria pivotar el brazo
   desde el hombro y dejar que la mano caiga donde caiga — y ahi la boca del
   arco se mueve con la pose y deja de coincidir con `bocaDe()`. Aca la mano
   esta clavada en su punto y el codo se RESUELVE (`codoDe`, dos huesos): el
   dibujo se deriva de la fisica y no puede separarse de ella.

   EL RIVAL ES EL MISMO DIBUJO ESPEJADO EN X. Todo lo de abajo esta escrito
   en el marco local del arquero —x hacia adelante, y desde los pies— asi
   que no hay una sola cuenta aparte para el de la derecha. Y el espejo es
   una transformacion del lienzo, no un segundo juego de coordenadas.
   ══════════════════════════════════════════════════════════════════════════ */

const HOMBRO_Y = 1.82, BRAZO_L = 0.90;
const CADERA_Y = 0.88, PIERNA_L = 0.88;
/* dos huesos por brazo. La suma pasa apenas de BRAZO_L: con la suma justa,
   el codo se estira en linea recta al llegar al limite y el brazo se lee a
   palo en la pose que mas se mira, que es la de apuntar.                  */
const BR1 = 0.50, BR2 = 0.46;

/* el perfil de media limba, de la empunadura a la punta. Es UNA curva y no
   cuatro tramos rectos: a los ~40 px que mide el arco en pantalla, lo unico
   que dice «esto es un arco» es que la silueta se curve hacia el blanco. */
const ARCO_PT = [0.02, 0.20, 0.056, 0.59, 0.34, 0.98];   /* p0, control, p1 */
const ARCO_PUNTA = [0.34, 0.98];

const ARQ_COL = [
  /* 0 = el jugador. Los otros son los rivales, uno por duelo (se repiten a
     partir del 6): dos rivales del mismo color se leen a la misma persona. */
  { piel: 0xe0a878, ropa: 0x2f7fa8, det: 0xdfe6ea, arco: 0x8a5a2e, pelo: 0x3a2b22 },
  { piel: 0xd9a070, ropa: 0x8a4a3a, det: 0xe8d7b0, arco: 0x6f4a28, pelo: 0x241a14 },
  { piel: 0xe8c090, ropa: 0x4a7a3a, det: 0xd8e0c0, arco: 0x7a5230, pelo: 0x4a3a20 },
  { piel: 0xc98f66, ropa: 0x6a4a8a, det: 0xe0d8ee, arco: 0x5f4230, pelo: 0x1e1a24 },
  { piel: 0xf0c8a0, ropa: 0xb08030, det: 0xf0e6c8, arco: 0x8a6234, pelo: 0x6a4a20 },
  { piel: 0xb98a68, ropa: 0x2f5f6a, det: 0xcfe0e4, arco: 0x4f3a28, pelo: 0x2a2420 },
];

const ARQ = [null, null];

/* ── LOS COLORES DE UN ARQUERO ────────────────────────────────────────────
   Se resuelven UNA vez al crearlo y no por cuadro: `satura` pasa por HSL y
   volver a hacer esa cuenta doce veces por arquero y sesenta veces por
   segundo es trabajo puro para obtener siempre lo mismo.                  */
function arqPaleta(C) {
  const p = {};
  for (const k of ['piel', 'ropa', 'det', 'arco', 'pelo']) p[k] = satura(C[k]);
  p.ropaS = luz(p.ropa, -0.10);        /* la sombra del torso */
  p.ropaO = luz(p.ropa, -0.19);        /* la manga, para que el hombro no se funda */
  p.pielS = luz(p.piel, -0.11);
  p.arcoO = luz(p.arco, -0.14);
  p.borde = luz(p.ropa, -0.30);
  p.cuerda = [242, 238, 226];
  p.metal = [216, 221, 224];
  for (const k in p) if (Array.isArray(p[k])) p[k] = _r2c(p[k]);
  return p;
}

/* ── DIBUJO: PIEZAS ──────────────────────────────────────────────────────
   Todo son capsulas y rectangulos redondeados. No hay una sola linea recta
   con canto vivo en el cuerpo, y eso no es coqueteria: en vector plano el
   canto redondeado es lo que separa un personaje de una caja de prueba.  */
function capsu(g, x0, y0, x1, y1, w, col) {
  g.strokeStyle = col; g.lineWidth = w;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); LLAM++;
}
function rredon(g, x, y, w, h, r, col) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.fillStyle = col; g.beginPath();
  if (g.roundRect) g.roundRect(x, y, w, h, rr);
  else {
    g.moveTo(x + rr, y); g.lineTo(x + w - rr, y);
    g.quadraticCurveTo(x + w, y, x + w, y + rr); g.lineTo(x + w, y + h - rr);
    g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h); g.lineTo(x + rr, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - rr); g.lineTo(x, y + rr);
    g.quadraticCurveTo(x, y, x + rr, y);
  }
  g.fill(); LLAM++;
}
function disco(g, x, y, r, col) {
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); LLAM++;
}

/* ── EL CODO ─────────────────────────────────────────────────────────────
   Dos huesos y una circunferencia: el codo es uno de los dos cortes entre
   la esfera del hombro y la de la mano, y `s` elige cual. Sin esto el brazo
   es una capsula recta, y una capsula recta del hombro a la boca del arco
   no se lee a brazo: se lee a puntero.                                    */
function codoDe(sx, sy, hx, hy, s) {
  const dx = hx - sx, dy = hy - sy;
  let d = Math.hypot(dx, dy);
  const max = BR1 + BR2 - 0.004;
  if (d < 1e-4) { d = 1e-4; }
  const dd = Math.min(d, max);
  const ux = dx / d, uy = dy / d;
  const a = (dd * dd + BR1 * BR1 - BR2 * BR2) / (2 * dd);
  const h = Math.sqrt(Math.max(0, BR1 * BR1 - a * a));
  return [sx + ux * a + uy * h * s, sy + uy * a - ux * h * s];
}
function brazoDib(g, P, sx, sy, hx, hy, s, manga) {
  const [ex, ey] = codoDe(sx, sy, hx, hy, s);
  capsu(g, sx, sy, ex, ey, 0.25, manga ? P.ropaO : P.pielS);
  capsu(g, ex, ey, hx, hy, 0.20, P.piel);
  disco(g, hx, hy, 0.125, P.piel);
}

/* ── EL ARQUERO ──────────────────────────────────────────────────────────
   El orden es de atras hacia adelante y no es negociable: la pierna y el
   brazo de atras, el cuerpo, la cabeza, y recien despues el arco y el brazo
   que lo sostiene. Con el arco debajo del torso, el unico objeto que dice
   de que se trata el juego queda tapado por una camiseta.                */
function arqDibuja(g, a) {
  if (!a || !a.puesto) return;
  const P = a.pal, S = a.P;
  g.save();
  g.translate(a.x, a.piso);
  if (a.lado) g.scale(-1, 1);
  g.lineCap = 'round'; g.lineJoin = 'round';

  const resp = S.resp, tr = S.torsoR + a.incl;
  const hy = HOMBRO_Y + resp;

  /* PIERNAS. Pivotan en la cadera; el pie es un ovalo aparte porque una
     capsula sola termina en punta y el arquero parece flotar.            */
  for (const [ang, zz] of [[S.piTR, 1], [S.piFR, 0]]) {
    const kx = Math.sin(ang) * PIERNA_L, ky = -Math.cos(ang) * PIERNA_L;
    const px = kx, py = CADERA_Y + resp * 0.4 + ky;
    capsu(g, 0, CADERA_Y + resp * 0.4, px, py, zz ? 0.28 : 0.30, zz ? P.ropaS : P.ropa);
    rredon(g, px - 0.13, py - 0.10, 0.42, 0.20, 0.09, zz ? '#2e2f38' : '#22232a');
  }

  /* BRAZO DE ATRAS: el de la cuerda. Va antes del torso, asi que al tensar
     la mano viaja POR DETRAS del pecho, que es lo que hace de verdad.    */
  brazoDib(g, P, 0, hy, S.manoTx, S.manoTy + resp, -1, true);

  /* EL CARCAJ, antes del torso: cruzado a la espalda dice «este tipo tira
     flechas» sin un solo rotulo, y de perfil es la silueta que lo separa
     de un muneco cualquiera.                                             */
  g.save();
  g.translate(-0.20, CADERA_Y + 0.62 + resp); g.rotate(tr + 0.22);
  rredon(g, -0.14, -0.44, 0.28, 0.96, 0.11, P.arcoO);
  for (let k = 0; k < 3; k++) {
    capsu(g, -0.06 + k * 0.06, 0.40, -0.06 + k * 0.06, 0.74, 0.05, P.arco);
    capsu(g, -0.06 + k * 0.06, 0.74, -0.06 + k * 0.06, 0.86, 0.10, P.metal);
  }
  g.restore();

  /* TORSO. Se inclina desde la cadera, no desde el centro: un cuerpo que
     pivota por la panza se lee a muneco de resorte.                      */
  g.save();
  g.translate(0, CADERA_Y + resp * 0.4); g.rotate(tr);
  const th = ARQ_ALTO - CADERA_Y + resp * 0.6;
  rredon(g, -0.43, -0.06, 0.86, th + 0.06, 0.26, P.ropa);
  /* la pechera clara: lo unico que separa el frente de la espalda de lejos */
  rredon(g, 0.06, th * 0.30, 0.33, th * 0.52, 0.13, P.det);
  /* la sombra del costado de atras, que es todo el volumen que este dibujo
     necesita: en vector plano dos tonos leen mas que un degradado.       */
  rredon(g, -0.43, -0.06, 0.24, th + 0.06, 0.20, P.ropaS);
  rredon(g, -0.45, -0.02, 0.90, 0.19, 0.08, P.pelo);          /* el cinto */
  g.restore();

  /* CABEZA. Va en el cuello, que es justo donde empieza su caja de choque. */
  g.save();
  g.translate(Math.sin(tr) * -(ARQ_ALTO - CADERA_Y), ARQ_ALTO + resp);
  g.rotate(S.cabR + tr);
  rredon(g, -CAB_MED, 0.02, CAB_MED * 2, CAB_ALTO - 0.02, 0.30, P.piel);
  /* la nariz sale sobre el eje del tiro: es lo unico que dice para donde
     mira, y de perfil es lo que mas se lee */
  rredon(g, CAB_MED - 0.04, CAB_ALTO * 0.36, 0.17, 0.17, 0.07, P.piel);
  /* el pelo tapa la coronilla y baja por la nuca */
  g.fillStyle = P.pelo; g.beginPath();
  g.moveTo(-CAB_MED - 0.03, CAB_ALTO * 0.34);
  g.lineTo(-CAB_MED - 0.03, CAB_ALTO * 0.80);
  g.quadraticCurveTo(-CAB_MED - 0.03, CAB_ALTO + 0.06, 0, CAB_ALTO + 0.06);
  g.quadraticCurveTo(CAB_MED + 0.02, CAB_ALTO + 0.06, CAB_MED + 0.02, CAB_ALTO * 0.66);
  g.lineTo(CAB_MED * 0.34, CAB_ALTO * 0.74);
  g.lineTo(-CAB_MED * 0.10, CAB_ALTO * 0.62);
  g.closePath(); g.fill(); LLAM++;
  /* LA BANDA OSCURA DE LOS OJOS Y NO DOS PUNTITOS: a treinta pixeles de
     alto, un ojo de tres pixeles no existe; una franja si, y encima es la
     cara de la referencia.                                               */
  rredon(g, -0.10, CAB_ALTO * 0.50, CAB_MED + 0.16, 0.17, 0.07, '#22232a');
  disco(g, CAB_MED * 0.52, CAB_ALTO * 0.585, 0.048, '#f4f6f8');
  capsu(g, -0.02, CAB_ALTO * 0.30, CAB_MED * 0.62, CAB_ALTO * 0.30, 0.06, P.pielS);
  g.restore();

  /* EL ARCO. Cuelga de la boca, asi que girarlo apunta el arco sin mover la
     boca ni un milimetro — que es lo que garantiza que la flecha salga de
     donde se ve.                                                          */
  if (S.arcoVis) {
    g.save();
    g.translate(S.bocaX, S.bocaY + resp); g.rotate(S.arcoAng);
    const [p0x, p0y, cx, cy, p1x, p1y] = ARCO_PT;
    g.strokeStyle = P.arco; g.lineWidth = 0.105;
    g.beginPath();
    g.moveTo(p1x, -p1y); g.quadraticCurveTo(cx, -cy, p0x, -p0y);
    g.lineTo(p0x, p0y); g.quadraticCurveTo(cx, cy, p1x, p1y);
    g.stroke(); LLAM++;
    rredon(g, -0.09, -0.25, 0.20, 0.50, 0.08, P.pelo);        /* la empunadura */
    /* LA CUERDA VA APARTE Y SE MUEVE: tensar es tirar el nock hacia atras,
       y con la cuerda dibujada fija la unica senal de la tension serian
       los pies del arquero. La V del arco tensado sale sola.             */
    g.strokeStyle = P.cuerda; g.lineWidth = 0.045;
    g.beginPath();
    g.moveTo(ARCO_PUNTA[0], ARCO_PUNTA[1]);
    g.lineTo(S.nockX, 0); g.lineTo(ARCO_PUNTA[0], -ARCO_PUNTA[1]);
    g.stroke(); LLAM++;
    if (S.flVis) {
      capsu(g, S.nockX, 0, S.nockX + 0.78, 0, 0.06, '#8a6034');
      g.fillStyle = _r2c([216, 221, 224]); g.beginPath();
      g.moveTo(S.nockX + 0.94, 0); g.lineTo(S.nockX + 0.74, 0.075);
      g.lineTo(S.nockX + 0.74, -0.075); g.closePath(); g.fill(); LLAM++;
    }
    g.restore();
  }

  /* BRAZO DE ADELANTE: el que sostiene el arco. Ultimo, por encima de todo. */
  brazoDib(g, P, 0, hy, S.bocaX, S.bocaY + resp, 1, true);
  g.restore();
}

/* ── ENTRADA ──────────────────────────────────────────────────────────── */
function arqEntra(M) {
  for (let l = 0; l < 2; l++) {
    if (!ARQ[l]) {
      const C = l === 0 ? ARQ_COL[0] : ARQ_COL[1 + ((JU && JU.n >= 0 ? JU.n : 0) % (ARQ_COL.length - 1))];
      ARQ[l] = { lado: l, col: C, pal: arqPaleta(C), P: {} };
    }
    const a = ARQ[l];
    a.puesto = true;
    const piso = l ? M.pisoB : M.pisoA;
    a.piso = piso;
    a.x = (l ? XB : XA) + 0.5;
    a.est = 'quieto'; a.t = 0; a.k = 0; a.ang = 0.7;
    a.ocio = Math.random() * 5; a.sac = 0; a.incl = 0; a.inclObj = 0;
    a.boca = bocaDe(M, l);
    arqPose(a, 0);
  }
}
function arqPiso(l, p) { const a = ARQ[l]; if (a) a.piso = p; }

/* al cambiar de duelo el rival cambia de color, y eso obliga a rehacerlo: un
   rival nuevo con la ropa del anterior se lee al mismo tipo otra vez */
function arqSuelta() {
  for (let l = 0; l < 2; l++) if (ARQ[l]) ARQ[l].puesto = false;
  ARQ[1] = null;      /* el jugador se queda; el rival se rehace por duelo */
}

/* ── ESTADOS ──────────────────────────────────────────────────────────────
   Cada uno dura lo que dura la cosa, y no hay dos que puedan estar puestos a
   la vez: `arqPose` es el UNICO sitio que escribe la pose, asi que no hay
   forma de que una animacion pise a la otra a mitad de camino.             */
function arqApunta(l, angMundo, k) {
  const a = ARQ[l]; if (!a) return;
  if (a.est === 'recibe' || a.est === 'gana' || a.est === 'pierde') return;
  a.est = 'apunta'; a.t = 0;
  /* el rival se dibuja espejado en x, asi que el angulo hay que llevarlo al
     marco local: PI menos el de mundo es su reflejo */
  a.ang = l ? Math.PI - angMundo : angMundo;
  if (a.ang > Math.PI) a.ang -= 6.2832;
  a.k = cl(k, 0, 1);
}
function arqTira(l) {
  const a = ARQ[l]; if (!a) return;
  a.est = 'tira'; a.t = 0;
}
function arqRecibe(l, cab) {
  const a = ARQ[l]; if (!a) return;
  a.est = 'recibe'; a.t = 0; a.sac = cab ? 1 : 0.7;
}
function arqFin(l, gano) {
  const a = ARQ[l]; if (!a) return;
  a.est = gano ? 'gana' : 'pierde'; a.t = 0;
}
function arqQuieto(l) {
  const a = ARQ[l]; if (!a) return;
  if (a.est === 'gana' || a.est === 'pierde') return;
  a.est = 'quieto'; a.t = 0; a.k = 0;
}

/* ── LA POSE ─────────────────────────────────────────────────────────────
   Todo esta escrito en el marco LOCAL del arquero (x hacia adelante, y desde
   los pies), asi que el rival —espejado— sale correcto sin una sola cuenta
   aparte. Y no escribe en el lienzo: deja los numeros en `a.P` y quien
   dibuja los lee. Asi una sonda puede leer la pose sin dibujar un cuadro. */
function arqPose(a, dt) {
  const e = a.est;
  a.t += dt;

  /* la boca del arco esta clavada: es `bocaDe` menos la posicion del arquero */
  const bx = Math.abs(a.boca.x - a.x);
  const by = a.boca.y - a.piso;

  let manoTx = -0.22, manoTy = 1.20;    /* la mano de la cuerda, en reposo */
  let torsoY = 0, torsoR = 0, cabR = 0, piFR = 0.10, piTR = -0.14, resp = 0;
  let arcoVis = true, flVis = false, arcoAng = a.ang, bocaX = bx, bocaY = by;

  if (e === 'quieto') {
    a.ocio += dt;
    resp = Math.sin(a.ocio * 1.7) * 0.012;
    /* QUIETO NO ES UNA POSE: respira y cada tanto mira al otro. Un muneco
       clavado durante el turno del rival se lee a que el juego se colgo. */
    const g = a.ocio % 6.8;
    cabR = g < 1.0 ? Math.sin(g * Math.PI / 1.0) * 0.22 : 0;
    manoTx = -0.20 + Math.sin(a.ocio * 1.7) * 0.02; manoTy = 1.18 + resp;
    arcoAng = -0.95;                    /* el arco colgando, apuntando al piso */
    bocaY = by - 0.22;
  } else if (e === 'apunta') {
    /* la cuerda se tira hasta el menton y el cuerpo se echa atras: la
       tension es lo unico que dice cuanta fuerza lleva el tiro */
    const k = a.k;
    manoTx = mez(-0.20, -0.52, k); manoTy = mez(1.20, 1.62, k);
    torsoR = -0.06 * k; piFR = 0.10 + 0.16 * k; piTR = -0.14 - 0.10 * k;
    flVis = true;
  } else if (e === 'tira') {
    /* el retroceso: 0,42 s. La mano de la cuerda vuelve de golpe y el torso
       se sacude — sin eso, soltar se ve como que la flecha aparecio sola. */
    const u = cl(a.t / 0.42, 0, 1);
    const g = Math.exp(-u * 7) * Math.sin(u * 26);
    manoTx = mez(-0.52, -0.14, Math.min(1, u * 5)); manoTy = mez(1.62, 1.30, Math.min(1, u * 5));
    torsoR = 0.10 * g; cabR = -0.14 * g; resp = -0.02 * Math.abs(g);
    arcoAng = a.ang + 0.16 * g;
    if (u >= 1) { a.est = 'quieto'; a.ocio = 0; }
  } else if (e === 'recibe') {
    /* lo tira hacia atras y vuelve con un muelle: el golpe se SIENTE aunque
       la barra de vida ya lo diga */
    const u = cl(a.t / 0.62, 0, 1);
    const g = Math.exp(-u * 5.5) * Math.cos(u * 15);
    torsoR = -0.42 * g * a.sac; cabR = -0.55 * g * a.sac;
    resp = -0.10 * Math.abs(g) * a.sac;
    manoTx = -0.10 - 0.24 * g; manoTy = 1.24;
    arcoAng = -0.95 + 0.5 * g; bocaY = by - 0.22;
    piFR = 0.10 - 0.30 * g; piTR = -0.14 - 0.26 * g;
    if (u >= 1) { a.est = 'quieto'; a.ocio = 0; }
  } else if (e === 'gana') {
    /* los brazos arriba y saltitos: el arco se guarda, que es lo que hace
       cualquiera que dejo de tener a quien tirarle */
    const s = Math.sin(a.t * 7.2);
    resp = Math.abs(s) * 0.16;
    manoTx = -0.30; manoTy = 2.55 + s * 0.08;
    bocaX = 0.32; bocaY = 2.60 + s * 0.08; arcoAng = 1.35; flVis = false;
    cabR = s * 0.10; piFR = 0.06; piTR = -0.08;
  } else if (e === 'pierde') {
    const u = cl(a.t / 0.9, 0, 1), k = u * u * (3 - 2 * u);
    torsoR = -0.55 * k; cabR = -0.62 * k; resp = -0.42 * k;
    manoTx = 0.10; manoTy = mez(1.20, 0.55, k);
    arcoVis = k < 0.4; bocaX = bx; bocaY = by - 0.7 * k;
    piFR = 0.55 * k; piTR = -0.55 * k;
  }

  /* el arquero se inclina hacia el tiro cuando apunta alto o bajo — es la
     unica pista de la INTENCION antes de que la flecha salga */
  a.inclObj = (e === 'apunta') ? cl(a.ang * 0.10, -0.14, 0.14) : 0;
  a.incl += (a.inclObj - a.incl) * Math.min(1, dt * 9);

  /* EL NOCK ES EL MISMO PUNTO PARA LA CUERDA Y PARA LA FLECHA, asi que la
     flecha nunca puede quedar despegada de la cuerda por mucho que se tense */
  const P = a.P;
  P.resp = resp; P.torsoR = torsoR; P.cabR = cabR;
  P.piFR = piFR; P.piTR = piTR;
  P.manoTx = manoTx; P.manoTy = manoTy;
  P.arcoVis = arcoVis; P.flVis = flVis; P.arcoAng = arcoAng;
  P.bocaX = bocaX; P.bocaY = bocaY;
  P.nockX = -0.20 - (flVis ? a.k : 0) * 0.34;
}

function arqPaso(dt) {
  for (const a of ARQ) if (a && a.puesto) arqPose(a, dt);
}
const arqLibre = () => !ARQ[0] || (ARQ[0].est !== 'tira' && (!ARQ[1] || ARQ[1].est !== 'tira'));
