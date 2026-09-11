
/* ══════════════════════════════════════════════════════════════════════════
   D · LA BALISTICA, EL CHOQUE, EL RIVAL Y LA AUDITORIA

   UNA SOLA FUNCION VUELA UNA FLECHA, y la usan las CUATRO cosas que necesitan
   saber donde cae: el tiro del jugador, el tiro del rival, el resolvedor que
   le dice al rival como apuntar, y la auditoria que comprueba que cada duelo
   se pueda ganar. Con dos integradores, el rival estaria apuntando a un juego
   que no existe y la auditoria aprobaria duelos imposibles.                */

/* la caja del arquero: cuerpo y cabeza. Las mismas medidas que dibuja el rig
   —y por eso viven aca, antes de f.js— porque si el dibujo y el blanco fueran
   dos cuentas, el jugador le pegaria al aire donde ve un cuerpo.           */
const ARQ_MED = 0.52;   /* medio ancho del cuerpo    */
const ARQ_ALTO = 2.10;  /* del piso al cuello        */
const CAB_MED = 0.42;
const CAB_ALTO = 0.90;  /* del cuello a la coronilla */

function cajaArq(M, lado) {
  const X = (lado ? XB : XA) + 0.5, p = lado ? M.pisoB : M.pisoA;
  return { x: X, p,
    cx0: X - ARQ_MED, cx1: X + ARQ_MED, cy0: p, cy1: p + ARQ_ALTO,
    hx0: X - CAB_MED, hx1: X + CAB_MED, hy0: p + ARQ_ALTO, hy1: p + ARQ_ALTO + CAB_ALTO };
}

/* ── EL VUELO ─────────────────────────────────────────────────────────────
   Integracion a 240 pasos por segundo y no a 60. A 30 celdas/s un paso de
   1/60 son media celda: una viga de una celda de espesor se atraviesa sin
   tocarla y el jugador ve la flecha pasar POR DENTRO del metal.           */
function vuela(M, x0, y0, vx, vy, w, tirador) {
  let x = x0, y = y0, t = 0;
  const pts = [];
  let acum = 0;
  const A = cajaArq(M, 0), B = cajaArq(M, 1);
  for (let i = 0; i < 2400; i++) {
    /* muestreo para la estela y para la vista previa */
    if (acum <= 0) { pts.push(x, y); acum = 13; }
    acum--;
    const nvx = vx + w * PASO_F, nvy = vy - G * PASO_F;
    const nx = x + nvx * PASO_F, ny = y + nvy * PASO_F;
    t += PASO_F; vx = nvx; vy = nvy; x = nx; y = ny;

    if (x < -1.5 || x > NX + 1.5 || y < -2 || t > 9)
      return { fin: 'fuera', x, y, t, v: Math.hypot(vx, vy), pts };

    /* los arqueros primero: estan APOYADOS en el suelo, asi que su caja no
       se pisa con ningun bloque y el orden no puede dar dos respuestas */
    for (const [q, C] of [[0, A], [1, B]]) {
      if (q === tirador && t < 0.30) continue;
      if (x >= C.hx0 && x <= C.hx1 && y >= C.hy0 && y <= C.hy1)
        return { fin: 'arq', quien: q, cab: true, x, y, t, v: Math.hypot(vx, vy), pts };
      if (x >= C.cx0 && x <= C.cx1 && y >= C.cy0 && y <= C.cy1)
        return { fin: 'arq', quien: q, cab: false, x, y, t, v: Math.hypot(vx, vy), pts };
    }
    const bx = Math.floor(x), by = Math.floor(y);
    if (by < M.ny) {
      const tp = en(M, bx, by, ZC);
      if (tp !== VACIO)
        return { fin: 'suelo', tipo: tp, x, y, t, v: Math.hypot(vx, vy), pts };
    }
  }
  return { fin: 'fuera', x, y, t, v: Math.hypot(vx, vy), pts };
}

/* ── EL RESOLVEDOR ────────────────────────────────────────────────────────
   Fijado el tiempo de vuelo, la velocidad sale de dos ecuaciones y no hay
   nada que buscar:
       vx = (dx - w*t^2/2) / t        vy = (dy + g*t^2/2) / t
   Asi que se barre el TIEMPO y no el angulo. Y cada candidato se VUELA de
   verdad contra el terreno antes de darlo por bueno: la formula dice donde
   CAERIA, no si LLEGA — una parabola perfecta que atraviesa una torre es
   exactamente el tiro que un rival no puede hacer.                        */
function resuelve(M, desde, w) {
  const O = bocaDe(M, desde);
  const C = cajaArq(M, 1 - desde);
  const tx = C.x, ty = C.p + 0.95;
  let mejor = null;
  for (let t = 0.30; t <= 3.20; t += 0.02) {
    const vx = ((tx - O.x) - w * t * t / 2) / t;
    const vy = ((ty - O.y) + G * t * t / 2) / t;
    const v = Math.hypot(vx, vy);
    if (v > V_MAX) continue;
    if (mejor && v >= mejor.v) continue;      /* ya tenemos uno mas barato */
    const r = vuela(M, O.x, O.y, vx, vy, w, desde);
    if (r.fin !== 'arq' || r.quien === desde) continue;
    mejor = { vx, vy, v, t };
  }
  return mejor;
}

/* el rival apunta bien y despues se equivoca a proposito. El error va en el
   ANGULO y en la fuerza por separado: con un solo numero, un rival malo
   fallaria siempre para el mismo lado y se le aprenderia el sesgo.        */
function tiroRival(M, prec, rnd) {
  const s = resuelve(M, 1, M.viento);
  if (!s) {  /* no hay tiro limpio: tira alto y a la buena de Dios */
    return { vx: -14 - rnd() * 6, vy: 16 + rnd() * 7 };
  }
  const e = 1 - cl(prec, 0, 1);
  const ang = Math.atan2(s.vy, s.vx) + (rnd() * 2 - 1) * e * 0.30;
  const vel = cl(s.v * (1 + (rnd() * 2 - 1) * e * 0.22), 3, V_MAX);
  return { vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel };
}

/* ── EL DANO ──────────────────────────────────────────────────────────────
   Escala con la velocidad de impacto porque si no, una flecha que llega
   arrastrandose al final de una parabola de tres segundos pega lo mismo que
   una tensa — y entonces no habria ninguna razon para tirar fuerte.       */
function danoDe(r) {
  const k = cl(r.v / V_REF, 0.42, 1.30);
  return Math.max(6, Math.round((r.cab ? DANO_CABEZA : DANO_CUERPO) * k));
}

/* ── AUDITORIA ────────────────────────────────────────────────────────────
   Un duelo del que no se puede llegar al otro no es dificil: es imposible, y
   desde afuera se ve igual que un jugador que no sabe apuntar. Se comprueba
   en LOS DOS SENTIDOS —el rival tiene que poder contestar— y ademas que la
   boca del arco no nazca adentro de un bloque.                            */
function auditaDuelos() {
  const malos = [];
  const filas = [];
  for (let n = 0; n < DUELOS; n++) {
    const M = generaMundo(n);
    const a = resuelve(M, 0, M.viento);
    const b = resuelve(M, 1, M.viento);
    const oa = bocaDe(M, 0), ob = bocaDe(M, 1);
    const libreA = en(M, Math.floor(oa.x), Math.floor(oa.y), ZC) === VACIO;
    const libreB = en(M, Math.floor(ob.x), Math.floor(ob.y), ZC) === VACIO;
    const ok = !!a && !!b && libreA && libreB;
    if (!ok) malos.push({ n, a: !!a, b: !!b, libreA, libreB });
    filas.push({ n, forma: M.forma, va: a ? +a.v.toFixed(1) : null,
                 vb: b ? +b.v.toFixed(1) : null, ta: a ? +a.t.toFixed(2) : null,
                 pisoA: M.pisoA, pisoB: M.pisoB });
  }
  return { ok: malos.length === 0, malos, filas };
}

/* ── AUTO-JUGADOR ─────────────────────────────────────────────────────────
   Juega el duelo entero por el mismo camino que el dedo: resuelve, mete su
   propio error, vuela la flecha, aplica el crater y el dano. La separacion
   entre el honesto y el que tira al azar es lo unico que prueba que hay una
   decision adentro y no una moneda.                                       */
function juegaSolo(n, prec, sem) {
  const M = generaMundo(n);
  const rnd = azar(sem || (7000 + n * 131));
  let va = VIDA_MAX, vb = VIDA_MAX, flechas = 0, aciertos = 0, turno = 0;
  while (va > 0 && vb > 0 && flechas < 60) {
    const tirador = turno;
    let d;
    if (tirador === 0) {
      if (prec < 0) {                       /* el del azar: angulo y fuerza a ciegas */
        const ang = rnd() * 1.4 - 0.1, vel = 6 + rnd() * (V_MAX - 6);
        d = { vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel };
      } else {
        const s = resuelve(M, 0, M.viento);
        if (!s) d = { vx: 14 + rnd() * 6, vy: 16 + rnd() * 7 };
        else {
          const e = 1 - cl(prec, 0, 1);
          const ang = Math.atan2(s.vy, s.vx) + (rnd() * 2 - 1) * e * 0.30;
          const vel = cl(s.v * (1 + (rnd() * 2 - 1) * e * 0.22), 3, V_MAX);
          d = { vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel };
        }
      }
    } else d = tiroRival(M, M.prec, rnd);
    const O = bocaDe(M, tirador);
    const r = vuela(M, O.x, O.y, d.vx, d.vy, M.viento, tirador);
    flechas++;
    if (r.fin === 'arq') {
      const dn = danoDe(r);
      if (r.quien === 0) va -= dn; else { vb -= dn; if (tirador === 0) aciertos++; }
    } else if (r.fin === 'suelo') crater(M, r.x, r.y, CRATER_R);
    turno = 1 - turno;
  }
  return { gano: vb <= 0 && va > 0, va: Math.max(0, va), vb: Math.max(0, vb), flechas, aciertos };
}
