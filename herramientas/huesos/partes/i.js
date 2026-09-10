/* ══════════════════════════════════════════════════════════════════════════
   EL JUGADOR — moverse, correr, esquivar y el combo de tres
   ══════════════════════════════════════════════════════════════════════════ */

const JUG = {
  x: 0, z: 0, y: 0, rumbo: 0, vx: 0, vz: 0,
  vida: J_VIDA, vidaMax: J_VIDA, fur: 0,
  nivel: 1, xp: 0, xpSig: XP_NIVEL(1),
  golpe: -1, gT: 0, gDio: false, gVent: 0,
  esqT: 0, esqEsp: 0, esqX: 0, esqZ: 0, esqRumbo: 0, gBuf: 0, cicSg: 1,
  /* `esqLargo` es cuánto dura ESTE esquive: el esquive y la rueda comparten
     el desplazamiento entero y se diferencian en tres números. Con dos
     máquinas de estado paralelas, el día que se toque el choque o el freno
     una de las dos se queda sin tocar. */
  esqLargo: J_ESQ_T, esqVel: J_ESQ_V, esqInv: J_ESQ_INV, rueda: false,
  /* el remate: `rem` es la fase (−1 = no está), `aire` la altura POR ENCIMA
     del terreno, que es lo único de este juego que no vale H(x,z) */
  rem: -1, remT: 0, remX: 0, remZ: 0, remX0: 0, remZ0: 0, remDio: false, aire: 0,
  danoT: 0, invT: 0, muerto: false, muerteT: 0,
  fase: 0, anda: 0, corre: false, bajas: 0, tiempo: 0,
  cuerpo: null, kit: null,
};
/* CUÁNTO SE AGACHA EL MUNDO. Vale 1 salvo en el aire del remate, y lo lee
   `unPaso` para escalar el dt de los esqueletos y de las oleadas — NUNCA el
   del jugador. Eso es exactamente lo que es un tiempo bala: el que decide va
   a tiempo real y lo demás se arrastra. Escalando también al jugador, el
   remate duraría tres segundos y medio de reloj y se leería a tirón. */
let LENTO = 1;
let JUG_MEZ = { a: 'quieto', b: null, k: 0 };   // qué pose se está mezclando

function jugArranca() {
  Object.assign(JUG, {
    x: 0, z: 0, rumbo: 0, vx: 0, vz: 0, vida: J_VIDA, vidaMax: J_VIDA, fur: 0,
    nivel: 1, xp: 0, xpSig: XP_NIVEL(1), golpe: -1, gT: 0, gDio: false, gVent: 0,
    esqT: 0, esqEsp: 0, esqRumbo: 0, gBuf: 0, cicSg: 1, danoT: 0, invT: 0, muerto: false, muerteT: 0,
    esqLargo: J_ESQ_T, esqVel: J_ESQ_V, esqInv: J_ESQ_INV, rueda: false,
    rem: -1, remT: 0, remDio: false, aire: 0,
    fase: 0, anda: 0, corre: false, bajas: 0, tiempo: 0, vive: true,
  });
  LENTO = 1;
  JUG.y = H(0, 0);
  if (!JUG.cuerpo) {
    JUG.cuerpo = armaCuerpo(recetaHeroe());
    JUG.kit = armaKit(recetaHeroe(), 1);
  }
}

const jugAtacando = () => JUG.golpe >= 0;
const jugRematando = () => JUG.rem >= 0;
/* la barra llena es la ÚNICA condición: sin nada que gastar el botón no
   existe, y por eso no hace falta apagarlo ni explicarlo */
const jugPuedeRemate = () => !SIN_REMATE && !JUG.muerto && !jugRematando() && JUG.fur >= J_FUR;
const jugFaseGolpe = () => {                     // 0 carga · 1 activo · 2 fin
  const g = J_COMBO[JUG.golpe];
  return JUG.gT < g.carga ? 0 : (JUG.gT < g.carga + g.activo ? 1 : 2);
};
const jugLargoGolpe = g => g.carga + g.activo + g.fin;

function jugPide(que) {
  if (JUG.muerto) return false;
  if (que === 'remate') return jugRemateArranca();
  if (que === 'esquiva') {
    if (JUG.esqT > 0 || JUG.esqEsp > 0 || jugRematando()) return false;
    /* ── EL MISMO BOTÓN DA DOS COSAS, Y LO DECIDE EL CUERPO ──────────────
       Con impulso sale rueda y parado sale esquive. No es un modo escondido:
       es la diferencia entre tirarse de costado y rodar, que es la misma que
       hay en la realidad. El umbral va sobre la velocidad QUE YA SE TIENE y
       no sobre el botón de correr, así que vale igual con el joystick pasado
       del aro que con Shift.                                              */
    const vel = Math.hypot(JUG.vx, JUG.vz);
    const rueda = !SIN_RUEDA && !PELEA_VIEJA && !ESQ_VIEJO && vel > J_ROD_MIN;
    JUG.rueda = rueda;
    JUG.esqLargo = rueda ? J_ROD_T : J_ESQ_T;
    JUG.esqVel = rueda ? J_ROD_V : J_ESQ_V;
    JUG.esqInv = rueda ? J_ROD_INV : J_ESQ_INV;
    /* esquivar CANCELA el golpe: si no, el jugador queda clavado en la
       recuperación de un tajo mientras le llega un hachazo que veía venir, y
       eso se lee a que el botón no anduvo */
    JUG.golpe = -1; JUG.gVent = 0;
    JUG.esqT = JUG.esqLargo; JUG.esqEsp = rueda ? J_ROD_ESPERA : J_ESQ_ESPERA;
    JUG.gBuf = 0;                     // esquivar tira el golpe que estaba en cola
    const l = Math.hypot(JUG.entX || 0, JUG.entZ || 0);
    if (l > 0.2) { JUG.esqX = JUG.entX / l; JUG.esqZ = JUG.entZ / l; }
    /* SIN DIRECCIÓN SE ESQUIVA HACIA ATRÁS Y NO HACIA ADELANTE. El esquive es
       el botón del pánico: se aprieta con el pulgar quieto justo cuando algo
       viene, y saliendo hacia adelante el jugador se metía SOLO adentro del
       hacha que estaba esquivando. */
    else if (!PELEA_VIEJA && !ESQ_VIEJO) { JUG.esqX = -Math.sin(JUG.rumbo); JUG.esqZ = -Math.cos(JUG.rumbo); }
    else { JUG.esqX = Math.sin(JUG.rumbo); JUG.esqZ = Math.cos(JUG.rumbo); }
    if (PELEA_VIEJA || ESQ_VIEJO) JUG.rumbo = Math.atan2(JUG.esqX, JUG.esqZ);
    /* ── EL ESQUIVE NO GIRA EL CUERPO, Y ESO NO ES UN DETALLE ──────────────
       Escribía `rumbo = atan2(esqX, esqZ)`, o sea que el cuerpo saltaba a
       mirar hacia donde salía: medido, `giroGrados 90` en UN cuadro para un
       esquive de costado y **−180 para uno hacia atrás**. Lo segundo es lo
       grave: el esquive de este juego existe para esquivar Y CONTRAATACAR, y
       terminarlo de espaldas al bicho obliga a volver a girar antes de pegar
       — o sea que la ventana que el esquive acaba de abrir se gasta en darse
       vuelta. El cuerpo se queda mirando donde miraba y lo único direccional
       es el desplazamiento; la pose es una cuclilla y se lee igual para
       cualquier lado. */
    /* LA RUEDA SE ORIENTA HACIA DONDE VA Y EL ESQUIVE NO, y no es una
       excepción a la regla de arriba: el esquive es un salto de costado y se
       lee igual mirando a cualquier lado, pero un cuerpo no puede rodar de
       costado — rodando, el eje del giro ES la dirección, así que un cuerpo
       que rueda hacia allá mirando para acá se ve roto. Y no cuesta el
       contraataque, porque la rueda ya termina lejos.                     */
    if (rueda) JUG.rumbo = Math.atan2(JUG.esqX, JUG.esqZ);
    son('esquiva');
    return true;
  }
  if (que === 'ataca') {
    if (JUG.esqT > 0 || jugRematando()) return false;
    if (jugGolpeArranca()) return true;
    /* LA COLA DE ENTRADA. Sin ella, un toque que cae en el medio del arco se
       TIRA A LA BASURA y hay que volver a tocar con el tiempo justo: en un
       teléfono eso convierte el combo de tres en un golpe suelto repetido.
       Con la cola, el toque espera a que se abra la ventana. Y caduca, porque
       una cola sin vencimiento encadena un golpe que se pidió hace dos
       segundos y el jugador ve al héroe atacar solo. */
    if (!COMBO_VIEJO) JUG.gBuf = J_BUF;
    return false;
  }
  return false;
}

/* ── EL ÚNICO SITIO QUE ARRANCA UN GOLPE ───────────────────────────────────
   Lo llaman el botón, la cola de entrada y el auto-jugador. Con la regla
   escrita en dos sitios, el día que se toque la ventana el bot prueba un
   juego que no existe.                                                     */
function jugGolpeArranca() {
  if (JUG.muerto || JUG.esqT > 0 || jugRematando()) return false;
  if (JUG.golpe < 0) {
    JUG.golpe = 0; JUG.gT = 0; JUG.gDio = false;
    JUG.gBuf = 0; jugApunta(); son('tajo'); return true;
  }
  /* ENCADENAR SÓLO EN LA VENTANA. Sin ventana, machacar el botón encadena los
     tres golpes al instante y el tercero —que es el caro— sale gratis. Pero
     la ventana ABRE AL EMPEZAR LA RECUPERACIÓN y no al terminarla: esperando
     a que el arco termine entero, entre golpe y golpe hay tres décimas de
     nada y el combo no fluye — se ven tres tajos sueltos, no un combo. */
  const g = J_COMBO[JUG.golpe];
  const enRec = !COMBO_VIEJO && JUG.gT >= g.carga + g.activo;
  if ((enRec || JUG.gVent > 0) && JUG.golpe < J_COMBO.length - 1) {
    JUG.golpe++; JUG.gT = 0; JUG.gDio = false; JUG.gVent = 0;
    JUG.gBuf = 0; jugApunta(); son('tajo'); return true;
  }
  return false;
}

/* ── LA ASISTENCIA DE PUNTERÍA ─────────────────────────────────────────────
   Un esqueleto se mueve a 2,5 m/s y el arco tarda 130 ms en salir: apuntado a
   pulgar contra un blanco que camina, el tajo pasa al lado. Al arrancar el
   golpe el rumbo se corre HACIA el bicho más cercano que ya esté dentro del
   arco — y con tope, porque una corrección sin tope es apuntado automático y
   entonces elegir a quién pegarle deja de ser una decisión.                */
function jugApunta() {
  if (PELEA_VIEJA || SIN_ASIST) return 0;
  const g = J_COMBO[JUG.golpe];
  let m = null, md = 1e9;
  for (const e of ESQS) {
    if (!e.vive || e.est === 'muere') continue;
    const dx = e.x - JUG.x, dz = e.z - JUG.z, d2 = dx * dx + dz * dz;
    const R = g.alc + ESQ[e.cl].radio + 0.55;
    if (d2 > R * R || d2 < 1e-6) continue;
    let a = Math.atan2(dx, dz) - JUG.rumbo;
    while (a > Math.PI) a -= 6.283; while (a < -Math.PI) a += 6.283;
    if (Math.abs(a) > J_ASIST_ARCO) continue;
    if (d2 < md) { md = d2; m = a; }
  }
  if (m === null) return 0;
  const c = lim(m, -J_ASIST, J_ASIST);
  JUG.rumbo += c;
  return c;
}

/* ── EL REMATE ─────────────────────────────────────────────────────────────
   Cuatro tiempos y UNA parábola: el arco de salto y caída es continuo —de la
   posición de salida al punto de aterrizaje— y las dos primeras fases sólo
   parten ese arco para poder poner la pose y el mundo lento donde van.
   EL BLANCO SE ELIGE AL ARRANCAR y no al aterrizar: elegido al final, el
   héroe saltaría hacia un sitio y caería en otro, que es lo que se ve como
   teletransporte. Sin nadie cerca salta igual hacia adelante — un botón que
   a veces no hace nada se lee a botón roto.                               */
const J_REM_TOT = J_REM_T.reduce((a, b) => a + b, 0);
function jugRemateArranca() {
  if (!jugPuedeRemate() || JUG.esqT > 0) return false;
  let m = null, md = 1e9;
  for (const e of ESQS) {
    if (!e.vive || e.est === 'muere') continue;
    const d2 = dist2(e.x, e.z, JUG.x, JUG.z);
    if (d2 < md && d2 < J_REM_ALC * J_REM_ALC) { md = d2; m = e; }
  }
  JUG.remX0 = JUG.x; JUG.remZ0 = JUG.z;
  if (m) {
    /* SE CAE ENCIMA Y NO AL LADO: el aterrizaje es el centro del golpe, así
       que apuntar al bicho es apuntar al medio de la turba que lo rodea. */
    JUG.remX = m.x; JUG.remZ = m.z;
    JUG.rumbo = Math.atan2(m.x - JUG.x, m.z - JUG.z);
  } else {
    JUG.remX = JUG.x + Math.sin(JUG.rumbo) * 5.2;
    JUG.remZ = JUG.z + Math.cos(JUG.rumbo) * 5.2;
  }
  JUG.rem = 0; JUG.remT = 0; JUG.remDio = false;
  JUG.golpe = -1; JUG.gVent = 0; JUG.gBuf = 0; JUG.esqT = 0;
  JUG.fur = 0;
  JUG.vx = 0; JUG.vz = 0;
  son('remate');
  return true;
}

function jugRemate(dt) {
  JUG.remT += dt;
  let t = JUG.remT, f = 0;
  while (f < J_REM_T.length - 1 && t >= J_REM_T[f]) { t -= J_REM_T[f]; f++; }
  JUG.rem = f;
  /* el mundo se agacha SÓLO en el aire: agachado también en el impacto, el
     golpe que es el punto entero del movimiento se vería en cámara lenta */
  LENTO = (f <= 1) ? J_REM_LENTO : 1;

  if (f <= 1) {
    const u = lim((JUG.remT) / (J_REM_T[0] + J_REM_T[1]), 0, 1);
    /* SALE RÁPIDO Y SE CUELGA ARRIBA. Con la interpolación lineal el arco se
       recorre parejo y no hay un instante en el que la cámara alcance a leer
       la silueta contra el cielo, que es de lo que vive este plano. */
    const w = 1 - Math.pow(1 - u, 1.7);
    JUG.x = mez(JUG.remX0, JUG.remX, w);
    JUG.z = mez(JUG.remZ0, JUG.remZ, w);
    JUG.aire = J_REM_ALTO * 4 * u * (1 - u);
  } else {
    JUG.x = JUG.remX; JUG.z = JUG.remZ; JUG.aire = 0;
    if (!JUG.remDio) { JUG.remDio = true; jugRemateGolpe(); }
  }
  if (JUG.remT >= J_REM_TOT) { JUG.rem = -1; JUG.aire = 0; LENTO = 1; }
  JUG.y = H(JUG.x, JUG.z) + JUG.aire;
  jugPose(dt);
}

function jugPaso(dt, ent) {
  JUG.tiempo += dt;
  JUG.entX = ent.x; JUG.entZ = ent.z;
  if (JUG.muerto) { JUG.muerteT += dt; jugPose(dt); return; }
  if (jugRematando()) { jugRemate(dt); return; }
  LENTO = 1;

  JUG.invT = Math.max(0, JUG.invT - dt);
  JUG.danoT = Math.max(0, JUG.danoT - dt);
  JUG.esqEsp = Math.max(0, JUG.esqEsp - dt);
  JUG.gVent = Math.max(0, JUG.gVent - dt);

  JUG.gBuf = Math.max(0, JUG.gBuf - dt);

  /* ── el esquive manda sobre todo lo demás ── */
  if (JUG.esqT > 0) {
    JUG.esqT -= dt;
    const u = 1 - JUG.esqT / JUG.esqLargo;
    const v = JUG.esqVel * (1 - suav(lim(u, 0, 1)) * 0.72);   // arranca fuerte y frena
    JUG.vx = JUG.esqX * v; JUG.vz = JUG.esqZ * v;
    if (JUG.esqT <= 0) { JUG.vx *= 0.25; JUG.vz *= 0.25; }
  } else if (jugAtacando()) {
    JUG.gT += dt;
    const g = J_COMBO[JUG.golpe];
    /* SE PUEDE CORREGIR LA PUNTERÍA MIENTRAS SE JUNTA EL GOLPE, poco y sólo
       antes del arco. Clavado del todo, un blanco que se corre medio metro
       durante la carga obliga a fallar el tajo entero mirándolo. */
    if (JUG.gT < g.carga) {
      const le = Math.hypot(ent.x, ent.z);
      if (le > 0.3) JUG.rumbo = angAmort(JUG.rumbo, Math.atan2(ent.x / le, ent.z / le), J_GIRO_CARGA, dt);
    }
    /* EL GOLPE EMPUJA HACIA ADELANTE, y no es adorno: sin ese medio metro,
       apuntar a un blanco que retrocede obliga a soltar el botón y volver a
       apretarlo, y el combo de tres deja de existir en la práctica */
    const emp = JUG.gT < g.carga + g.activo ? g.empuje * (1 - JUG.gT / (g.carga + g.activo)) : 0;
    JUG.vx = Math.sin(JUG.rumbo) * emp; JUG.vz = Math.cos(JUG.rumbo) * emp;
    /* EL GOLPE SE RESUELVE UNA VEZ, en la ventana activa. Resolviéndolo en
       cada cuadro del arco, un tajo de 110 ms le pega siete veces al mismo
       bicho y el peón se muere de un toque. */
    if (!JUG.gDio && jugFaseGolpe() === 1) { JUG.gDio = true; jugResuelveGolpe(); }
    /* la cola se cobra en cuanto la ventana abre: es lo que hace que el
       combo salga del toque que ya se dio y no de uno nuevo */
    if (JUG.gBuf > 0) jugGolpeArranca();
    if (jugAtacando() && JUG.gT >= jugLargoGolpe(J_COMBO[JUG.golpe])) {
      JUG.gVent = J_COMBO_VENTANA;
      if (JUG.golpe === J_COMBO.length - 1) JUG.gVent = 0;   // el remate no encadena
      JUG.golpe = -1;
    }
  } else {
    if (JUG.gBuf > 0) jugGolpeArranca();
    /* ── caminar ─────────────────────────────────────────────────────────
       LO QUE SE ACELERA ES SÓLO LO QUE FALTA EN LA DIRECCIÓN PEDIDA, y el
       roce se aplica a lo de costado. Sumando al vector y topando el total,
       doblar FRENA y el tope real queda por debajo del ajuste —el defecto
       que ya costó una vuelta en Z Force—.                                */
    const l = Math.hypot(ent.x, ent.z);
    JUG.corre = ent.corre && l > 0.55;
    const vMax = (JUG.corre ? J_CORRE : J_VEL) * (l > 0.34 ? Math.min(1, l) : 0);
    if (l > 0.06) {
      const dx = ent.x / l, dz = ent.z / l;
      JUG.rumbo = angAmort(JUG.rumbo, Math.atan2(dx, dz), 15.5, dt);
      const act = JUG.vx * dx + JUG.vz * dz;
      const falta = vMax - act;
      if (falta > 0) {
        const a = Math.min(falta, 46 * dt);
        JUG.vx += dx * a; JUG.vz += dz * a;
      }
      const lx = JUG.vx - dx * act, lz = JUG.vz - dz * act;
      const f = Math.exp(-11 * dt);
      JUG.vx = dx * act + lx * f; JUG.vz = dz * act + lz * f;
    } else {
      const f = Math.exp(-13 * dt);
      JUG.vx *= f; JUG.vz *= f;
    }
  }

  /* ── LA FURIA SE ENFRÍA CUANDO NO HAY NADIE CERCA ─────────────────────
     Corriendo NO se gasta, que es la mitad del pedido: administrar la
     carrera era lo que hacía que huir fuera una cuenta en vez de una
     decisión. */
  if (JUG.fur > 0) {
    let cerca = false;
    for (const e of ESQS) {
      if (!e.vive || e.est === 'muere') continue;
      if (dist2(e.x, e.z, JUG.x, JUG.z) < J_FUR_FRIO * J_FUR_FRIO) { cerca = true; break; }
    }
    if (!cerca) JUG.fur = Math.max(0, JUG.fur - J_FUR_FUGA * dt);
  }

  /* ── mover y chocar ── */
  const nx = JUG.x + JUG.vx * dt, nz = JUG.z + JUG.vz * dt;
  const c = corrigeChoque(nx, nz, J_RADIO);
  JUG.x = c.x; JUG.z = c.z;
  const r = largo2(JUG.x, JUG.z);
  if (r > MUNDO_R * 0.955) {                 // el borde del mundo empuja, no frena
    const k = (MUNDO_R * 0.955) / r;
    JUG.x *= k; JUG.z *= k;
  }
  JUG.aire = 0;
  JUG.y = H(JUG.x, JUG.z);

  /* LA FASE DEL PASO SALE DE LA DISTANCIA Y NO DEL RELOJ: así el sonido del
     pie, el balanceo del cuerpo y la cámara son EL MISMO número y no se
     pueden desincronizar, y frenar no patina */
  const v = Math.hypot(JUG.vx, JUG.vz);
  JUG.anda = amort(JUG.anda, JUG.esqT > 0 || jugAtacando() ? 0 : v, 12, dt);
  const antes = JUG.fase;
  JUG.cicSg = cicloSigno(JUG.vx, JUG.vz, JUG.rumbo, JUG.cicSg);
  JUG.fase += JUG.cicSg * (v * dt)
            / zancada(JUG_MEZ.b === 'corre' ? JUG_MEZ.k : 0) * Math.PI * 2;
  if (v > 0.6 && Math.floor(antes / Math.PI) !== Math.floor(JUG.fase / Math.PI)) son('pisa');

  jugPose(dt);
}

/* ── EL CICLO CORRE HACIA DONDE SE VA, NO HACIA DONDE SE MIRA ──────────────
   La fase se adelantaba con el MÓDULO de la velocidad, o sea siempre hacia
   adelante, y el cuerpo puede perfectamente ir hacia atrás mirando al frente:
   un esqueleto empujado por el de al lado —`esqMueve` los separa y no toca el
   rumbo—, uno que se para a su alcance con `esqMira` clavado en el jugador, o
   el propio héroe cuando un hachazo lo tira para atrás. En todos esos casos
   se veía el cuerpo deslizarse de espaldas con las piernas caminando de
   frente, que es la otra mitad de «caminan hacia atrás pero adelante
   también». Con el signo del avance el ciclo se da vuelta solo.
   Y LA BANDA ES ASIMÉTRICA, o sea con histéresis: con un solo umbral, un
   cuerpo que se mueve casi de costado tiene el avance oscilando alrededor de
   cero y el ciclo se daría vuelta varias veces por segundo — que se ve peor
   que el defecto que viene a arreglar. Se entra en reversa por debajo de
   −0,30 y se sale por encima de +0,10; en el medio manda lo que ya venía. */
function cicloSigno(vx, vz, rumbo, prev) {
  const fw = vx * Math.sin(rumbo) + vz * Math.cos(rumbo);
  if (fw < -0.30) return -1;
  if (fw > 0.10) return 1;
  return prev || 1;
}

/* la mezcla de poses: qué se está haciendo manda, y el resto se funde */
function jugPose(dt) {
  let a = 'quieto', arg = JUG.tiempo, b = null, brg = 0, obj = 0;
  if (JUG.muerto) { a = 'muere'; arg = Math.min(1, JUG.muerteT / 1.15); }
  else if (jugRematando()) { a = 'remate'; arg = lim(JUG.remT / J_REM_TOT, 0, 1); }
  else if (JUG.esqT > 0) {
    a = JUG.rueda ? 'rueda' : 'esquiva';
    arg = 1 - JUG.esqT / JUG.esqLargo;
  }
  else if (jugAtacando()) {
    a = 'golpe' + JUG.golpe; arg = JUG.gT / jugLargoGolpe(J_COMBO[JUG.golpe]);
  } else if (JUG.danoT > 0) { a = 'dano'; arg = 1 - JUG.danoT / 0.32; }
  else {
    const v = JUG.anda;
    if (v > 0.35) {
      a = 'camina'; arg = JUG.fase;
      b = 'corre'; brg = JUG.fase;
      obj = lim((v - J_VEL * 0.72) / (J_CORRE - J_VEL * 0.72), 0, 1);
    } else {
      a = 'quieto'; arg = JUG.tiempo;
      b = 'camina'; brg = JUG.fase; obj = lim(v / 1.5, 0, 1);
    }
  }
  JUG_MEZ.a = a; JUG_MEZ.b = b;
  JUG_MEZ.k = b ? obj : 0;
  poseAplica(JUG.cuerpo, a, arg, b, brg, JUG_MEZ.k);
  JUG.cuerpo.raiz.position.set(JUG.x, JUG.y, JUG.z);
  JUG.cuerpo.raiz.rotation.y = JUG.rumbo;
}

/* ── EL CHOQUE SALE DE LA MISMA LISTA QUE DIBUJA EL BOSQUE ─────────────────
   Con una segunda lista "para el choque" el día que se agregue un árbol se
   camina a través de él, o peor: hay una pared invisible donde no hay nada. */
let SOLIDOS = [], SOL_REJA = null, SOL_PASO = 8;
function preparaChoque(solidos) {
  SOLIDOS = solidos; SOL_REJA = new Map();
  for (const s of solidos) {
    const i = Math.floor(s.x / SOL_PASO), j = Math.floor(s.z / SOL_PASO);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const k = (i + a) * 10007 + (j + b);
      (SOL_REJA.get(k) || SOL_REJA.set(k, []).get(k)).push(s);
    }
  }
}
function solidosCerca(x, z) {
  if (!SOL_REJA) return SOLIDOS;
  return SOL_REJA.get(Math.floor(x / SOL_PASO) * 10007 + Math.floor(z / SOL_PASO)) || [];
}
function corrigeChoque(x, z, r) {
  /* una sola pasada de separación por eje de menor penetración: dos círculos
     encimados empujan en sentidos opuestos y dejan al cuerpo trabado */
  for (const s of solidosCerca(x, z)) {
    const dx = x - s.x, dz = z - s.z, R = s.r + r;
    const d2 = dx * dx + dz * dz;
    if (d2 < R * R && d2 > 1e-9) {
      const d = Math.sqrt(d2), k = (R - d) / d;
      x += dx * k; z += dz * k;
    }
  }
  return { x, z };
}

/* ── ESQUIVAR UN TRONCO ────────────────────────────────────────────────────
   Nadie tiene pathfinding acá y no hace falta: lo que hay son árboles
   sueltos, no un laberinto. Con la dirección derecha, un cuerpo empujado
   hacia afuera del tronco y empujando hacia adelante se ANULA, y los dos se
   quedan clavados —medido: el bot y un peón a tres metros, cada uno de un
   lado del mismo árbol, mil quinientos segundos sin moverse—. Alcanza con
   rodear el primer tronco que se cruza.                                    */
function rodea(x, z, dx, dz, r, alcance) {
  const A = alcance === undefined ? 4.2 : alcance;
  let peor = null, pd = 1e9;
  for (const s of solidosCerca(x, z)) {
    const ax = s.x - x, az = s.z - z;
    const t = ax * dx + az * dz;                 // cuánto adelante está
    if (t < 0.05 || t > A) continue;             // detrás, o más lejos que el destino
    const px = ax - dx * t, pz = az - dz * t;    // cuánto de costado
    const lat = Math.hypot(px, pz);
    if (lat > s.r + r + 0.12) continue;          // no está en el camino
    if (t < pd) { pd = t; peor = { r: s.r, px, pz, lat }; }
  }
  if (!peor) return { x: dx, z: dz };
  /* SE ARMA COMO VECTOR Y NO COMO ÁNGULO: con un ángulo hay que acertar el
     signo de la convención, y equivocarse no falla —dirige HACIA el tronco,
     el choque lo empuja afuera, y el cuerpo orbita el árbol para siempre.
     Medido con el signo al revés: mil bajas menos, dos mil segundos girando. */
  const lx = dz, lz = -dx;                       // la perpendicular
  const sg = (peor.px * lx + peor.pz * lz) > 0 ? -1 : 1;   // al lado contrario
  const k = 0.55 + 1.05 * (1 - peor.lat / (peor.r + r + 0.12));
  const nx = dx + lx * sg * k, nz = dz + lz * sg * k;
  const l = Math.hypot(nx, nz) || 1;
  return { x: nx / l, z: nz / l };
}

/* ── LA CÁMARA ─────────────────────────────────────────────────────────────
   Al hombro y no justo atrás: de frente al eje del cuerpo las piernas se
   tapan entre ellas y la zancada casi no se lee.                          */
let CAM_YAW = 0, CAM_PIT = -0.13, CAM_D_ACT = CAM_D;
function camPaso(dt, giroX, giroY) {
  if (!JUG.cuerpo) return;      // en el menú no hay cuerpo todavía
  CAM_YAW -= giroX; CAM_PIT = lim(CAM_PIT - giroY, -0.95, 0.52);
  const ojo = new THREE.Vector3(JUG.x, JUG.y + CAM_MIRA, JUG.z);
  const dir = new THREE.Vector3(
    Math.sin(CAM_YAW) * Math.cos(CAM_PIT), Math.sin(CAM_PIT), Math.cos(CAM_YAW) * Math.cos(CAM_PIT));
  const lado = new THREE.Vector3(Math.cos(CAM_YAW), 0, -Math.sin(CAM_YAW));
  /* SE MARCHA HACIA ATRÁS Y SE CORTA EN EL ÚLTIMO PUNTO LIBRE. Sin esto la
     cámara se mete adentro de un árbol y lo que llena la pantalla es la cara
     interior de un tronco. Y por debajo de CAM_MIN pasa a PRIMERA PERSONA
     entera: una cámara "al hombro" a veinte centímetros no es al hombro, es
     estar adentro del muñeco.
     EL SIGNO: `dir` es hacia dónde MIRA la cámara, así que la cámara va en
     `ojo − dir·d`. Sumándolo queda DELANTE del jugador mirando para el otro
     lado: el héroe no aparece nunca y el juego se ve como un bosque vacío.
     Medido con la matriz de instancia, el cuello del jugador caía en z de
     vista +4,98 —o sea cinco metros DETRÁS del lente— y proyectaba igual en
     el medio del cuadro, porque un punto de atrás proyecta dado vuelta y cae
     adentro. Es la misma trampa que en RECREO dio un autobús «entero y
     centrado» con la cámara mirando al revés.                              */
  let d = CAM_D;
  for (let i = 8; i >= 1; i--) {
    const p = i / 8 * CAM_D;
    const px = ojo.x - dir.x * p + lado.x * CAM_LADO;
    const pz = ojo.z - dir.z * p + lado.z * CAM_LADO;
    const py = ojo.y - dir.y * p + CAM_H * 0.30;
    let libre = py > H(px, pz) + 0.35;
    if (libre) for (const s of solidosCerca(px, pz)) {
      if (dist2(px, pz, s.x, s.z) < (s.r + 0.42) * (s.r + 0.42)) { libre = false; break; }
    }
    if (libre) { d = p; break; }
    d = (i - 1) / 8 * CAM_D;
  }
  CAM_D_ACT = amort(CAM_D_ACT, d, d < CAM_D_ACT ? 34 : 7.5, dt);
  const pri = CAM_D_ACT < CAM_MIN;
  const dd = pri ? 0 : CAM_D_ACT, ll = pri ? 0 : CAM_LADO;
  const px = ojo.x - dir.x * dd + lado.x * ll;
  const pz = ojo.z - dir.z * dd + lado.z * ll;
  const py = ojo.y - dir.y * dd + (pri ? J_ALTO - CAM_MIRA : CAM_H * 0.30);
  cam.position.set(px, Math.max(py, H(px, pz) + 0.28), pz);
  cam.rotation.set(CAM_PIT, CAM_YAW + Math.PI, 0);
  /* la cabeza se achica a la centésima parte en primera persona: una cámara
     metida en la cabeza no puede ver la cabeza, sólo su interior */
  const e = pri ? 0.01 : 1;
  JUG.cuerpo.h.cuello.scale.setScalar(e);
  /* la caja de sombra sigue al jugador: 26 m de lado son 79 texels por metro
     contra los 9 que daría cubrir el mundo entero */
  solLuz.position.set(JUG.x + 24, JUG.y + 40, JUG.z + 16);
  solLuz.target.position.set(JUG.x, JUG.y, JUG.z);
  solLuz.target.updateMatrixWorld();
}

/* la dirección de la entrada es RELATIVA A LA CÁMARA: con el joystick en
   ejes de mundo, girar la cámara deja "adelante" apuntando a otro lado */
function entradaMundo(jx, jz) {
  const s = Math.sin(CAM_YAW), c = Math.cos(CAM_YAW);
  /* EL EJE HORIZONTAL ESTABA INVERTIDO, Y NINGUNA SONDA LO PODÍA VER. La
     cámara mira por su −Z con `rotation.y = CAM_YAW + PI`, así que su +X
     —lo que el jugador llama «derecha»— es (−cos YAW, +sin YAW), y esto
     devolvía (+cos YAW, −sin YAW): el negativo exacto. Empujar el joystick a
     la derecha movía al héroe a la IZQUIERDA de la pantalla, y lo mismo la D
     del teclado, porque los dos caminos entran por acá.
     DURÓ PORQUE `anda(n, dx, dz)` —la sonda con la que se auditó todo— recibe
     la dirección YA EN EL MUNDO y se saltea esta función entera, y el
     auto-jugador hace lo mismo. Medido ahora con `joyMide`, que escribe el JOY
     de verdad, llama a `entradaLee()` y proyecta lo que sale sobre los ejes de
     la CÁMARA leídos de su matriz de mundo: empujar (1,0) daba `derecha −1`.
     El eje vertical siempre estuvo bien: empujar arriba da `adelante +1`.   */
  return { x: -jx * c - jz * s, z: jx * s - jz * c };
}
