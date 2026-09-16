
/* ══════════════════════════════════════════════════════════════════════════
   F · EL ROBOT
   Un toque no es un paso: es «anda hasta ahi». Asi que esto recibe una RUTA
   de celdas —la que arma `camino()`, o sea la misma que cuenta el validador—
   y la camina. Nunca decide a donde va.
   ══════════════════════════════════════════════════════════════════════════ */

const ROB = {
  g: null, piI: null, piD: null, brI: null, brD: null, cuerpo: null, cabeza: null,
  cel: [0, 0, 0], yaw: 0, yawObj: 0, fase: 0, aplasta: 0, ocio: 0,
  ruta: null, ri: 0, seg: null, listo: null,
};

/* OSCURO CON PECHERA CLARA Y OJOS ENCENDIDOS, y el naranja no se toca: es el
   unico color que en este juego quiere decir «esto se mueve al tocarlo». Un
   robot naranja seria un mecanismo mas.                                     */
const R_CUERPO = 0x38434c, R_CABEZA = 0x424e58, R_MIEMBRO = 0x2a333a,
      R_PECHO = 0xd9dee1, R_OJO = 0x5fe0e8;

function cajita(px, py, pz, sx, sy, sz, col, emi) {
  const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz),
    new T.MeshLambertMaterial({ color: col, emissive: emi || 0x000000,
      emissiveIntensity: emi ? 1 : 0 }));
  m.position.set(px, py, pz);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function robCrea() {
  if (ROB.g) return;
  const g = new T.Group();
  /* MIDE MENOS DE UNA CELDA A PROPOSITO: el robot ocupa UNA celda, asi que un
     cuerpo mas alto que eso asomaria por el techo de cualquier tunel — y el
     tunel de un bloque es la figura mas util que hay en un diorama chico.  */
  const cu = cajita(0, 0.455, 0, 0.40, 0.30, 0.30, R_CUERPO);
  g.add(cu);
  g.add(cajita(0, 0.455, 0.155, 0.26, 0.20, 0.02, R_PECHO));
  const cab = new T.Group(); cab.position.set(0, 0.615, 0);
  cab.add(cajita(0, 0.115, 0, 0.34, 0.23, 0.30, R_CABEZA));
  cab.add(cajita(-0.075, 0.13, 0.152, 0.075, 0.075, 0.02, R_OJO, R_OJO));
  cab.add(cajita( 0.075, 0.13, 0.152, 0.075, 0.075, 0.02, R_OJO, R_OJO));
  cab.add(cajita(0, 0.245, -0.02, 0.05, 0.09, 0.05, R_MIEMBRO));
  g.add(cab);
  /* LOS PIVOTES VAN EN LA ARTICULACION Y LA PIEZA CUELGA MEDIO LARGO ABAJO:
     girando la caja alrededor de su propio centro, la pierna se mece desde la
     rodilla y el robot patina en el sitio. */
  const pierna = x => { const p = new T.Group(); p.position.set(x, 0.305, 0);
    p.add(cajita(0, -0.155, 0, 0.13, 0.31, 0.15, R_MIEMBRO)); return p; };
  const brazo = x => { const p = new T.Group(); p.position.set(x, 0.575, 0);
    p.add(cajita(0, -0.135, 0, 0.09, 0.27, 0.10, R_MIEMBRO)); return p; };
  ROB.piI = pierna(-0.115); ROB.piD = pierna(0.115);
  ROB.brI = brazo(-0.245);  ROB.brD = brazo(0.245);
  g.add(ROB.piI, ROB.piD, ROB.brI, ROB.brD);
  ROB.g = g; ROB.cuerpo = cu; ROB.cabeza = cab;
}

/* el robot cuelga del grupo del diorama: asi hereda el corrimiento que centra
   el mundo en el origen y no hay dos cuentas de posicion que puedan separarse */
function robEntra(cel) {
  robCrea();
  DIO.grupo.add(ROB.g);
  ROB.cel = cel.slice(); ROB.ruta = null; ROB.seg = null; ROB.listo = null;
  /* EL ANCLA DE LA FASE SE BORRA AL ENTRAR: `robAnima` mide cuanto se movio
     el robot entre cuadros, y sin borrarla el salto de un nivel al otro se
     lee como diez metros caminados y el ciclo de la marcha sale disparado. */
  ROB_ANT = null;
  ROB.fase = 0; ROB.aplasta = 0; ROB.ocio = 0;
  ROB.g.position.set(cel[0] + 0.5, cel[1], cel[2] + 0.5);
  ROB.yaw = ROB.yawObj = CAM_YAW + Math.PI;
  ROB.g.rotation.y = ROB.yaw;
}

const suave = u => u * u * (3 - 2 * u);

function robVaA(ruta, alTerminar) {
  if (!ruta || ruta.length < 2) { if (alTerminar) alTerminar(); return; }
  ROB.ruta = ruta; ROB.ri = 0; ROB.listo = alTerminar || null;
  robSigueRuta();
}
function robSigueRuta() {
  if (!ROB.ruta || ROB.ri >= ROB.ruta.length - 1) {
    ROB.ruta = null; ROB.seg = null;
    const f = ROB.listo; ROB.listo = null; if (f) f();
    return;
  }
  const a = ROB.ruta[ROB.ri], b = ROB.ruta[ROB.ri + 1]; ROB.ri++;
  const dy = b[1] - a[1];
  const trepa = (a[0] === b[0] && a[2] === b[2]);
  /* CAER CUESTA TIEMPO Y SUBIR NO: la duracion sale de lo que el movimiento
     ES, no de un numero por segmento, asi que una caida de tres se ve tres
     veces mas larga que una de uno sin escribirlo en ningun lado.          */
  const dur = trepa ? PASO_T * 1.25 : PASO_T + Math.max(0, -dy) * CAE_T;
  ROB.seg = { a, b, t: 0, dur, trepa, uw: PASO_T / dur };
  if (!trepa) ROB.yawObj = Math.atan2(b[0] - a[0], b[2] - a[2]);
}

/* montar un mecanismo: el robot y la pieza se mueven juntos en el mismo
   tiempo, o sea que no hay forma de que se despeguen a mitad de camino */
function robMonta(a, b, dur) {
  ROB.ruta = null; ROB.listo = null;
  ROB.seg = { a: a.slice(), b: b.slice(), t: 0, dur, trepa: true, uw: 1, monta: 1 };
}

function robPaso(dt) {
  if (!ROB.g) return;
  const s = ROB.seg;
  if (s) {
    s.t += dt;
    const u = cl(s.t / s.dur, 0, 1);
    const dy = s.b[1] - s.a[1];
    let kxz, y;
    if (s.trepa) { kxz = suave(u); y = mez(s.a[1], s.b[1], s.monta ? u : suave(u)); }
    else if (dy >= 0) {
      kxz = suave(u);
      /* el arquito del escalon: sin el, subir un bloque se ve como atravesar
         la esquina de la baldosa */
      y = mez(s.a[1], s.b[1], suave(u)) + Math.sin(u * Math.PI) * (dy > 0 ? 0.10 : 0.055);
    } else {
      kxz = cl(u / s.uw, 0, 1);
      if (u <= s.uw) y = s.a[1];
      else { const k = (u - s.uw) / (1 - s.uw); y = mez(s.a[1], s.b[1], k * k); }
    }
    const px = mez(s.a[0] + 0.5, s.b[0] + 0.5, kxz), pz = mez(s.a[2] + 0.5, s.b[2] + 0.5, kxz);
    ROB.g.position.set(px, y, pz);
    if (u >= 1) {
      ROB.cel = s.b.slice();
      if (dy < -1) { ROB.aplasta = 1; son('cae'); }   /* una caida larga se aterriza */
      ROB.seg = null;
      if (ROB.ruta) robSigueRuta();
      else { const f = ROB.listo; ROB.listo = null; if (f) f(); }
    }
  }
  robAnima(dt);
}

/* ── LA ANIMACION ─────────────────────────────────────────────────────────
   LA FASE AVANZA CON LA DISTANCIA Y NO CON EL RELOJ: atada al reloj, el
   ciclo sigue corriendo mientras el robot espera y los pies patinan en cuanto
   la velocidad cambia. Con la distancia, la zancada mide siempre lo mismo.  */
let ROB_ANT = null;
function robAnima(dt) {
  const p = ROB.g.position;
  if (!ROB_ANT) ROB_ANT = p.clone();
  const d = Math.hypot(p.x - ROB_ANT.x, p.z - ROB_ANT.z);
  const cayendo = ROB.seg && !ROB.seg.trepa && ROB.seg.b[1] < ROB.seg.a[1] && ROB.seg.t / ROB.seg.dur > ROB.seg.uw;
  const trepando = !!(ROB.seg && ROB.seg.trepa && !ROB.seg.monta);
  ROB.fase += d * Math.PI;               /* un paso por celda */
  ROB_ANT.copy(p);

  /* el rumbo por la vuelta corta: sin normalizar, cruzar de +pi a -pi le pega
     media vuelta al robot en un cuadro */
  let dy = ROB.yawObj - ROB.yaw;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  ROB.yaw += dy * Math.min(1, dt * 16);
  ROB.g.rotation.y = ROB.yaw;

  const s = Math.sin(ROB.fase), c = Math.cos(ROB.fase * 2);
  if (trepando) {
    const f = ROB.seg.t / ROB.seg.dur * Math.PI * 2;
    ROB.brI.rotation.x = -2.2 + Math.sin(f) * 0.5;
    ROB.brD.rotation.x = -2.2 - Math.sin(f) * 0.5;
    ROB.piI.rotation.x = Math.sin(f) * 0.30;
    ROB.piD.rotation.x = -Math.sin(f) * 0.30;
    ROB.cuerpo.position.y = 0.455;
  } else if (cayendo) {
    ROB.brI.rotation.x = -2.5; ROB.brD.rotation.x = -2.5;
    ROB.piI.rotation.x = 0.35; ROB.piD.rotation.x = -0.12;
  } else if (d > 1e-5) {
    ROB.ocio = 0;
    ROB.piI.rotation.x = s * 0.62; ROB.piD.rotation.x = -s * 0.62;
    ROB.brI.rotation.x = -s * 0.46; ROB.brD.rotation.x = s * 0.46;
    ROB.cuerpo.position.y = 0.455 + Math.abs(c) * 0.012;
    ROB.cabeza.rotation.y = s * 0.06;
  } else {
    /* QUIETO NO ES UNA POSE: respira, y cada tanto mira alrededor. Un muneco
       clavado se lee a que el juego se colgo, que en un rompecabezas —donde
       uno pasa la mitad del tiempo pensando— es lo peor que puede pasar. */
    ROB.ocio += dt;
    const r = Math.sin(ROB.ocio * 1.9);
    ROB.piI.rotation.x = ROB.piD.rotation.x = 0;
    ROB.brI.rotation.x = ROB.brD.rotation.x = 0.06 + r * 0.035;
    ROB.cuerpo.position.y = 0.455 + r * 0.008;
    const g = ROB.ocio % 7.4;
    ROB.cabeza.rotation.y = g < 1.1 ? Math.sin(g * Math.PI / 1.1) * 0.55
                          : (g > 3.4 && g < 4.5 ? -Math.sin((g - 3.4) * Math.PI / 1.1) * 0.55 : 0);
  }
  if (ROB.aplasta > 0) {
    ROB.aplasta = Math.max(0, ROB.aplasta - dt * 5.2);
    const k = Math.sin(ROB.aplasta * Math.PI) * 0.26;
    ROB.g.scale.set(1 + k * 0.5, 1 - k, 1 + k * 0.5);
  } else ROB.g.scale.set(1, 1, 1);
}
const robQuieto = () => !ROB.seg && !ROB.ruta;
