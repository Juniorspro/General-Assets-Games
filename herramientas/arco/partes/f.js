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

/* ── EL TUMBO ─────────────────────────────────────────────────────────────
   ES DIBUJO Y NADA MAS, Y ESO NO ES UNA CONCESION: `cajaArq` —el blanco— vive
   clavada en la columna del arquero, en `d.js`, y de ella dependen el
   resolvedor, la auditoria de los doce duelos y el auto-jugador. Un cuerpo
   que se lleva su propia caja mientras rueda convertiria «apuntarle al
   arquero» en apuntarle a donde estaba hace medio segundo, y la auditoria
   aprobaria duelos que no se pueden pelear.
   Y NO HACE FALTA que la caja se mueva, porque los turnos son alternos: el
   unico momento en que un cuerpo esta fuera de su puesto es justo despues de
   recibir un flechazo, y ahi le toca tirar A EL. Por eso `espera` no pasa el
   turno mientras haya alguien en el piso (`arqCayendo`).

   EL CUERPO ES UN SOLIDO Y LOS MIEMBROS SON RESORTES. Con el cuerpo entero
   girando en bloque se lee a tabla que cae; lo que dice «esto es un cuerpo
   sin fuerzas» es que los brazos y las piernas lleguen TARDE — cada uno con
   su muelle subamortiguado apuntando a colgar hacia abajo en el MUNDO, o sea
   a `-rot` en el marco del arquero.                                        */
const G_RAG = 18;              /* la gravedad del tumbo, en celdas/s^2      */
/* EL IMPULSO ESTA CALIBRADO CONTRA EL TOPE, y el primer valor no lo estaba:
   con 2,4 y 3,2 el cuerpo llegaba al canto de la meseta y al maximo de giro
   TAMBIEN con un golpe de cuerpo, asi que un rozon y un cabezazo terminaban
   en la misma pose — el clamp se comia justo la diferencia que el empujon
   existe para mostrar. Medido el PICO —muestreando cada 16 ms el tumbo
   entero, porque una sola lectura a los 200 ms agarra a los dos a mitad de
   camino y devuelve el mismo numero— el cuerpo se va 0,755 celdas y gira
   80 grados, y la cabeza pega en el tope: 1,05 celdas y 93 grados, o sea
   1,4 veces mas lejos y boca arriba contra tumbado.                       */
const RAG_VX = 1.2, RAG_VY = 3.5, RAG_VR = 2.3;
/* EL TOPE SALE DE LA MESETA MEDIDA, no de un numero comodo: el aplanado de
   `c.js` va de X-1 a X+1, asi que el piso plano del rival llega a x=17 y el
   arquero esta en 15,5. Con 1,35 el cuerpo tumbado quedaba con el hombro
   colgando del canto Y ademas cortado por el borde del cuadro en reposo.  */
const RAG_XMIN = -1.05, RAG_XMAX = 0.15;
const RAG_ROT_MAX = 1.62;      /* boca arriba y no mas: no rueda de espaldas */
const RAG_K = 140, RAG_C = 11; /* muelle de miembro: zeta ~ 0,46            */
const RAG_LEV = 0.55;          /* lo que tarda en volver a ponerse de pie   */

/* un muelle subamortiguado, integrado en subpasos: con dt de 0,05 y K de 140
   el producto K*dt pasa de 1 y el integrador explota — el muelle sale
   disparado y el brazo desaparece de la pantalla. */
function muelle(a, k, obj, dt) {
  const v = k + 'v';
  const ns = Math.max(1, Math.ceil(dt * 120)), h = dt / ns;
  for (let i = 0; i < ns; i++) {
    a[v] += ((obj - a[k]) * RAG_K - a[v] * RAG_C) * h;
    a[k] += a[v] * h;
  }
}
const suave = u => u * u * (3 - 2 * u);

/* el perfil de media limba, de la empunadura a la punta. Es UNA curva y no
   cuatro tramos rectos: a los ~40 px que mide el arco en pantalla, lo unico
   que dice «esto es un arco» es que la silueta se curve hacia el blanco.

   Y ESTABA DADO VUELTA. Las puntas caian en x = +0,34, o sea DELANTE de la
   empunadura, asi que la cuerda —que va de punta a punta— pasaba por encima
   del puno y entre el arquero y el blanco. Un arco de verdad es al reves:
   target <- empunadura <- cuerda <- arquero, y la separacion entre las dos
   ES el brace height. Con la empunadura adelante (x = +0,02) y las puntas
   atras (-0,30) la curva bombea hacia el blanco, que es lo que hace una
   limba, y la cuerda queda del lado del que tira.                         */
const ARCO_PT = [0.02, 0.20, -0.03, 0.60, -0.30, 0.98];  /* p0, control, p1 */
const ARCO_PUNTA = [-0.30, 0.98];

/* EL NOCK: donde esta la cuerda. En reposo cae en la linea de las dos puntas
   —o sea recta— y al tensar viaja hacia atras por la linea de la flecha.
   0,85 sobre un arquero de 2,10 son unos 71 cm de apertura a escala de
   persona, que es lo que mide un tiro de verdad. */
const NOCK_0 = -0.30, NOCK_1 = -0.85;

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
/* EL NOCK NO PUEDE IRSE MAS ATRAS DE LO QUE EL BRAZO ALCANZA. Tensar es
   llevar el puno hasta `nock` sobre la linea de la flecha, y a angulos altos
   ese punto se va a metro y pico del hombro contra los 0,96 que mide el
   brazo: `codoDe` recorta la distancia pero sigue DIBUJANDO la mano donde se
   la pidieron, asi que el antebrazo se estira ocho pixeles sobre un arquero
   de cincuenta y tres. Se corta la linea contra la esfera del alcance — o
   sea que el arquero tensa lo que puede y no lo que se le pidio.
   (t^2 + 2t(P.d) + |P|^2 = R^2 con P = boca - hombro; se toma la raiz de
   atras, que es el punto mas lejos al que el puno todavia llega.)         */
const ALC_R = BR1 + BR2 - 0.02;
function nockTope(bx, by, ang, n) {
  const px = bx, py = by - HOMBRO_Y;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const pd = px * dx + py * dy, p2 = px * px + py * py;
  const disc = pd * pd - p2 + ALC_R * ALC_R;
  if (disc <= 0) return n;              /* la boca ya esta fuera: no hay corte */
  return Math.max(n, -pd - Math.sqrt(disc));
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
  /* EL TUMBO VA ANTES QUE TODO Y DESPUES DEL ESPEJO: escrito en el marco
     local, `-x` es «hacia atras» para los dos arqueros, y el espejo da vuelta
     el eje Y EL SENTIDO DEL GIRO a la vez, asi que los dos caen para el lado
     contrario al que les tiraron sin una sola cuenta aparte. Y pivota en la
     CADERA, no en los pies: un cuerpo que gira desde los tobillos se lee a
     poste que se cae, no a persona que sale despedida.                    */
  if (a.rag) {
    g.translate(a.rx, a.ry + CADERA_Y); g.rotate(a.rot); g.translate(0, -CADERA_Y);
  }
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

  /* BRAZO DE LA CUERDA: DE QUE LADO DEL TORSO VA LO DECIDE DONDE ESTA LA
     MANO, no una constante. Iba SIEMPRE detras, y eso valia cuando el puno
     estaba escrito a mano por detras del hombro; desde que el puno sale del
     nock —o sea de la linea de la flecha— a angulos de subida cae DELANTE
     del pecho, y dibujado atras el brazo entero desaparece adentro de la
     camiseta: el arquero tensa con un brazo que no se ve.                */
  const manoAdel = S.manoTx > -0.05;
  const braT = () => brazoDib(g, P, 0, hy, S.manoTx, S.manoTy + resp, -1, true);
  if (!manoAdel) braT();

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
      /* LARGO DE FLECHA DE VERDAD: 1,02 sobre un arquero de 2,10 son unos
         85 cm, y con la apertura llena la punta queda justo pasando la
         empunadura — que es como se ve un arco tensado. Con los 0,94 de
         antes la punta se quedaba corta y la flecha parecia un palito. */
      capsu(g, S.nockX, 0, S.nockX + 0.88, 0, 0.06, '#8a6034');
      g.fillStyle = _r2c([216, 221, 224]); g.beginPath();
      g.moveTo(S.nockX + 1.02, 0); g.lineTo(S.nockX + 0.84, 0.078);
      g.lineTo(S.nockX + 0.84, -0.078); g.closePath(); g.fill(); LLAM++;
      /* el emplumado: dos trazos al lado del nock. Sin ellos la flecha es
         una linea, y una linea saliendo de la cuerda no se lee a flecha. */
      capsu(g, S.nockX + 0.05, 0, S.nockX + 0.22, 0.085, 0.028, P.det);
      capsu(g, S.nockX + 0.05, 0, S.nockX + 0.22, -0.085, 0.028, P.det);
    }
    g.restore();
  }

  if (manoAdel) braT();
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
    ragCero(a);
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
  if (a.est === 'caido' || a.est === 'levanta' || a.est === 'gana' || a.est === 'pierde') return;
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
function ragCero(a) {
  a.rag = false; a.muere = false;
  a.rx = 0; a.ry = 0; a.rot = 0;
  a.rvx = 0; a.rvy = 0; a.rvr = 0;
  a.mPiF = 0.10; a.mPiFv = 0; a.mPiT = -0.14; a.mPiTv = 0;
  a.mCab = 0; a.mCabv = 0; a.mBrF = 0; a.mBrFv = 0; a.mBrT = 0; a.mBrTv = 0;
  a.r0x = 0; a.r0y = 0; a.r0r = 0; a.tocado = false;
}
/* EL EMPUJON SALE DEL DANO Y NO DE UNA CONSTANTE: un rozon de veinte y un
   cabezazo de setenta tienen que verse distinto, porque el numero que sube
   en la barra ya lo dice y el cuerpo no puede contradecirlo. Medido, un
   cuerpo se va 0,755 celdas y una cabeza pega en el tope de la meseta.   */
function arqRecibe(l, cab, dn, mata) {
  const a = ARQ[l]; if (!a) return;
  const f = (cab ? 1.5 : 1.0) * cl((dn || DANO_CUERPO) / DANO_CUERPO, 0.75, 1.25);
  a.est = 'caido'; a.t = 0; a.rag = true; a.muere = !!mata; a.tocado = false;
  a.rx = 0; a.ry = 0; a.rot = 0;
  a.rvx = -RAG_VX * f; a.rvy = RAG_VY * f; a.rvr = RAG_VR * f;
  a.mBrFv = -9 * f; a.mBrTv = -7 * f; a.mCabv = -6 * f;
}
function arqFin(l, gano) {
  const a = ARQ[l]; if (!a) return;
  /* AL QUE LO MATARON SE QUEDA EN EL PISO: devolverlo al puesto para que
     haga la pose de perder deshace el unico golpe que decidio el duelo. */
  if (a.est === 'caido' && a.muere) return;
  a.rag = false; ragCero(a);
  a.est = gano ? 'gana' : 'pierde'; a.t = 0;
}
function arqQuieto(l) {
  const a = ARQ[l]; if (!a) return;
  if (a.est === 'gana' || a.est === 'pierde') return;
  if (a.est === 'caido' || a.est === 'levanta') return;
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
  let nock = NOCK_0;

  if (e === 'quieto') {
    a.ocio += dt;
    resp = Math.sin(a.ocio * 1.7) * 0.012;
    /* QUIETO NO ES UNA POSE: respira y cada tanto mira al otro. Un muneco
       clavado durante el turno del rival se lee a que el juego se colgo. */
    const g = a.ocio % 6.8;
    cabR = g < 1.0 ? Math.sin(g * Math.PI / 1.0) * 0.22 : 0;
    manoTx = -0.20 + Math.sin(a.ocio * 1.7) * 0.02; manoTy = 1.18 + resp;
    /* EN REPOSO EL ARCO CUELGA CASI VERTICAL, no cruzado en diagonal por
       delante del cuerpo: con -0,95 la punta de abajo caia en (-0,18 · 0,76),
       o sea DENTRO del torso y de las piernas, y lo que se veia era un palo
       atravesado. Casi a plomo, la punta de abajo roza el piso detras de los
       pies y la de arriba llega a la altura de los ojos. */
    arcoAng = -0.18;
    bocaX = 0.42; bocaY = 1.10;
  } else if (e === 'apunta') {
    /* la cuerda se tira hasta el menton y el cuerpo se echa atras: la
       tension es lo unico que dice cuanta fuerza lleva el tiro */
    const k = a.k;
    /* LA MANO DE LA CUERDA NO SE ESCRIBE: SE DERIVA DEL NOCK. Estaban los
       dos por separado, asi que el puno terminaba en un sitio y la cuerda
       en otro — o sea que el arquero tensaba el aire. Con el nock como
       unico dato, cuerda, flecha y puno son EL MISMO PUNTO por construccion. */
    nock = nockTope(bocaX, bocaY, arcoAng, mez(NOCK_0, NOCK_1, k));
    manoTx = bocaX + nock * Math.cos(arcoAng);
    manoTy = bocaY + nock * Math.sin(arcoAng);
    torsoR = -0.06 * k; piFR = 0.10 + 0.16 * k; piTR = -0.14 - 0.10 * k;
    flVis = true;
  } else if (e === 'tira') {
    /* el retroceso: 0,42 s. La mano de la cuerda vuelve de golpe y el torso
       se sacude — sin eso, soltar se ve como que la flecha aparecio sola. */
    const u = cl(a.t / 0.42, 0, 1);
    const g = Math.exp(-u * 7) * Math.sin(u * 26);
    torsoR = 0.10 * g; cabR = -0.14 * g; resp = -0.02 * Math.abs(g);
    arcoAng = a.ang + 0.16 * g;
    /* la cuerda vuelve de golpe y la mano con ella, por el mismo camino */
    nock = nockTope(bocaX, bocaY, arcoAng, mez(NOCK_1, NOCK_0, Math.min(1, u * 5)));
    manoTx = bocaX + nock * Math.cos(arcoAng);
    manoTy = bocaY + nock * Math.sin(arcoAng);
    if (u >= 1) { a.est = 'quieto'; a.ocio = 0; }
  } else if (e === 'caido' || e === 'levanta') {
    if (e === 'caido') {
      /* el solido: gravedad, un rebote y roce contra el piso */
      a.rvy -= G_RAG * dt;
      a.rx += a.rvx * dt; a.ry += a.rvy * dt; a.rot += a.rvr * dt;
      /* LA ALTURA DEL SUELO DEPENDE DE CUANTO ESTA GIRADO: acostado, la
         cadera queda a media panza del piso y no a los 0,88 de estar de
         pie. Con una altura fija, el cuerpo horizontal flota. */
      const hc = -(CADERA_Y - 0.30) * Math.abs(Math.sin(a.rot));
      if (a.ry <= hc) {
        a.ry = hc;
        if (a.rvy < -0.9) {
          a.rvy = -a.rvy * 0.32; a.rvx *= 0.62; a.rvr *= 0.55;
          if (!a.tocado) { a.tocado = true; son('tumbo'); }
        } else {
          a.rvy = 0;
          const r = Math.max(0, 1 - dt * 7);
          a.rvx *= r; a.rvr *= Math.max(0, 1 - dt * 6);
          if (!a.tocado) { a.tocado = true; son('tumbo'); }
        }
      }
      /* NO SE SALE DE LA MESETA: son tres columnas planas y mas alla hay
         pendiente. Un cuerpo que se desliza al vacio se lee a defecto. */
      a.rx = cl(a.rx, RAG_XMIN, RAG_XMAX);
      a.rot = cl(a.rot, -0.25, RAG_ROT_MAX);
      if (!a.muere && a.t > 0.9 && Math.abs(a.rvy) < 0.35 && Math.abs(a.rvr) < 0.9) {
        a.est = 'levanta'; a.t = 0;
        a.r0x = a.rx; a.r0y = a.ry; a.r0r = a.rot;
      }
    } else {
      /* SE LEVANTA VOLVIENDO AL PUESTO, y la caja de choque no se entera
         nunca porque nunca se movio: al terminar, el cuerpo esta otra vez
         exactamente donde el resolvedor cree que esta. */
      const u = cl(a.t / RAG_LEV, 0, 1), k = suave(u);
      a.rx = a.r0x * (1 - k); a.ry = a.r0y * (1 - k); a.rot = a.r0r * (1 - k);
      if (u >= 1) { a.rag = false; ragCero(a); a.est = 'quieto'; a.ocio = 0; }
    }

    /* LOS MIEMBROS CUELGAN HACIA ABAJO EN EL MUNDO, o sea a `-rot` en este
       marco — y llegan TARDE, que es lo unico que separa un cuerpo sin
       fuerzas de un maniqui girando en bloque. */
    const o = -a.rot;
    muelle(a, 'mPiF', o + 0.26, dt);
    muelle(a, 'mPiT', o - 0.30, dt);
    muelle(a, 'mCab', o * 0.80, dt);
    muelle(a, 'mBrF', o - 0.22, dt);
    muelle(a, 'mBrT', o + 0.30, dt);

    torsoR = -a.rot * 0.22; cabR = a.mCab - torsoR; resp = 0;
    piFR = a.mPiF; piTR = a.mPiT;
    const hyR = HOMBRO_Y;
    manoTx = Math.sin(a.mBrT) * BRAZO_L * 0.92;
    manoTy = hyR - Math.cos(a.mBrT) * BRAZO_L * 0.92;
    bocaX = Math.sin(a.mBrF) * BRAZO_L * 0.92;
    bocaY = hyR - Math.cos(a.mBrF) * BRAZO_L * 0.92;
    arcoAng = -1.35 - a.rot;   /* el arco cuelga de la mano, tambien sin fuerza */
    flVis = false;
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
  P.nockX = nock;
}

function arqPaso(dt) {
  for (const a of ARQ) if (a && a.puesto) arqPose(a, dt);
}
const arqOcupado = a => !a || a.est === 'tira' || a.est === 'caido' || a.est === 'levanta';
const arqLibre = () => !ARQ[0] || (!arqOcupado(ARQ[0]) && (!ARQ[1] || !arqOcupado(ARQ[1])));
/* EL TURNO NO PASA MIENTRAS HAY ALGUIEN EN EL PISO — y el que se murio no
   cuenta, porque ese no se levanta nunca y el duelo se quedaria esperando. */
/* EL PLANO DEL REMATE ES EL CUERPO, NO EL PUESTO. Al terminar el duelo la
   camara se suelta y vuelve al reposo, y ahi el encuadre de espera —16,4
   celdas de ancho— NO ALCANZA para un cuerpo tumbado: acostado a 63 grados
   la cabeza del rival llega a x 17,19 contra un borde en 17,20, asi que el
   muerto salia CORTADO por el canto en la ultima imagen del duelo. Enfocando
   el cuerpo, el encuadre de vuelo lo deja con dos celdas y media de aire. */
const arqMuerto = () => {
  for (const a of ARQ) if (a && a.puesto && a.muere) return { x: a.x, y: a.piso + 1.0 };
  return null;
};
const arqCayendo = () => {
  for (const a of ARQ) {
    if (!a || !a.puesto) continue;
    if (a.est === 'levanta') return true;
    if (a.est === 'caido' && !a.muere) return true;
  }
  return false;
};
