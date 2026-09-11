/* ══════════════════════════════════════════════════════════════════════════
   LOS ESQUELETOS — una sola máquina de estados para las cuatro clases
   ══════════════════════════════════════════════════════════════════════════
   La diferencia entre un peón y el rey son NÚMEROS, no ramas. Un enemigo con
   su propio `if` es un enemigo que el día que se corrija un defecto se queda
   sin corregir — y eso no falla, hace otra cosa.                           */

let ESQS = [], ESQ_KIT = null, ESQ_TINTE = new THREE.Color();

/* ── QUÉ PIEZAS *NO* LE TOCAN A ESTA CLASE ─────────────────────────────────
   El kit dibuja TODAS las piezas para TODOS los cuerpos: las que no
   corresponden van con matriz cero y no pintan un píxel. La máscara se arma
   de una tabla y no a mano, porque con cuatro armas y dos adornos reales son
   seis renglones por clase y el día que se agregue un arma alguien se olvida
   de sacársela a las otras tres — y eso no falla: sale un peón con la espada
   del rey encima.                                                          */
function sinDe(cl) {
  const s = {};
  if (cl !== 'rey') { s.corona = 1; s.capa = 1; }
  for (const c in ARMA_DE) if (c !== cl) s[ARMA_DE[c]] = 1;
  return s;
}

/* ── DAR DE ALTA UNO SOLO ──────────────────────────────────────────────────
   Es la ÚNICA puerta por la que entra un esqueleto al mundo, y la usan las
   tres cosas que lo hacen: el arranque de la partida, cada oleada y el menú.
   Con un alta por camino, el bicho de la tercera oleada nace sin la máscara
   de piezas o sin el tinte y eso no falla: sale un peón con la espada del rey.
   EL CUERPO SE RECICLA de un muerto de la misma clase cuando lo hay. Un
   `cuerpoEsq()` es una jerarquía de veintitantos nodos, y una partida entera
   son treinta y cuatro altas contra catorce vivos a la vez: sin reciclar se
   construyen veinte jerarquías que no se dibujan nunca más.                */
function esqAlta(s) {
  const D = ESQ[s.cl];
  let cuerpo = null;
  for (let i = 0; i < ESQS.length; i++) {
    const v = ESQS[i];
    if (!v.vive && v.cl === s.cl && v.cuerpo) { cuerpo = v.cuerpo; v.cuerpo = null; break; }
  }
  if (!cuerpo) cuerpo = cuerpoEsq();
  cuerpo.raiz.scale.setScalar(D.esc);
  const e = {
    id: ESQS.length, cl: s.cl, zona: s.zona, x: s.x, z: s.z, y: H(s.x, s.z),
    rumbo: Math.atan2(-s.x, -s.z), vx: 0, vz: 0,
    poseA: 'quieto', poseB: null, poseBrg: 0, poseArg: 0, poseM: 0, cicSg: 1,
    vida: D.vida, vidaMax: D.vida,
    sx: s.x, sz: s.z, est: 'duerme', t: 0, esp: 0, atur: 0, muerteT: 0, vive: true, gDio: false,
    fase: Math.random() * 6.283, ronX: s.x, ronZ: s.z, ronT: 0,
    /* NACE ENTRANDO EN ESCENA: 0,45 s en los que crece desde el suelo. Un
       esqueleto que aparece de un cuadro a otro a veinte metros se lee a
       defecto de dibujo, no a que algo se levantó de la tierra. */
    naceT: 0,
    cuerpo, tinte: new THREE.Color(D.color).convertSRGBToLinear(),
    /* la corona, la capa y las tres armas que no son suyas van con matriz cero */
    sin: sinDe(s.cl),
  };
  ESQS.push(e);
  return e;
}
const ESQ_NACE = 0.45;            // cuánto tarda en levantarse del suelo

function esqArranca(lista) {
  ESQS = [];
  if (!ESQ_KIT) ESQ_KIT = armaKit(recetaEsq(), ESQ_TURBA + 2);
  for (const s of lista) esqAlta(s);
}

const esqVivos = z => ESQS.filter(e => e.vive && e.zona === z).length;

/* ── UNA ZONA CERRADA NO PERSIGUE ──────────────────────────────────────────
   Medido: el REY tiene 60 m de vista, así que se levantaba de la ceniza y
   cruzaba el mapa a buscarte — cuatro de los ocho golpes que mataban al bot
   eran suyos, a nivel 2 y en tierra de las ruinas. Un jefe que te caza antes
   de que su zona se abra no es dificultad: borra la progresión entera, que es
   lo único que convierte "matar esqueletos" en una partida.                */
const esqDespierto = e => e.zona <= ZONA_ACT;

/* SÓLO SE DIBUJAN Y SE SIMULAN LOS QUE ESTÁN CERCA. Con los treinta corriendo
   siempre, el mundo entero pelea a la vez y el cupo del kit no alcanza; y con
   una lista pintada sin filtrar, la instancia 20 se dibuja en un sitio donde
   no hay nadie. El filtro es UNO y lo usan la simulación y el dibujo.      */
function esqCerca() {
  const v = CAL[CALIDAD].vista + 10, out = [];
  for (const e of ESQS) {
    if (!e.vive) continue;
    if (dist2(e.x, e.z, JUG.x, JUG.z) > v * v) continue;
    out.push(e);
    if (out.length >= ESQ_TURBA) break;
  }
  return out;
}

function esqPaso(dt) {
  const cerca = esqCerca();
  for (const e of cerca) {
    const D = ESQ[e.cl];
    e.t += dt; e.fase += dt;
    e.atur = Math.max(0, e.atur - dt);
    e.esp = Math.max(0, e.esp - dt);
    const d = Math.sqrt(dist2(e.x, e.z, JUG.x, JUG.z));

    if (e.est === 'muere') { e.muerteT += dt; if (e.muerteT > ESQ_MUERE) e.vive = false; esqPose(e, dt, d); continue; }
    /* MIENTRAS SE LEVANTA NO DECIDE NADA. Sin esto, un esqueleto que nace a
       diecinueve metros con la vista en treinta y dos ya está persiguiendo en
       el mismo cuadro en que aparece, y lo que se ve es que la oleada empieza
       a correr antes de terminar de salir. */
    if (e.naceT < ESQ_NACE) { esqPose(e, dt, d); continue; }
    if (e.atur > 0) { e.vx *= Math.exp(-9 * dt); e.vz *= Math.exp(-9 * dt); esqMueve(e, dt); esqPose(e, dt, d); continue; }

    switch (e.est) {
      case 'duerme':
        /* SE DESPIERTA POR VISTA Y NO POR UN RELOJ. Cada clase tiene su
           alcance: el rey te ve de lejos, un peón no. */
        if (d < D.vista && !JUG.muerto && esqDespierto(e)) { e.est = 'persigue'; e.t = 0; son('gruñe'); }
        break;
      case 'ronda': {
        e.ronT -= dt;
        if (e.ronT <= 0) {
          const a = Math.random() * 6.283, r = 2.5 + Math.random() * 5;
          e.ronX = e.x + Math.cos(a) * r; e.ronZ = e.z + Math.sin(a) * r;
          e.ronT = 2.5 + Math.random() * 3;
        }
        esqVa(e, dt, e.ronX, e.ronZ, D.vel * 0.42);
        if (d < D.vista && !JUG.muerto && esqDespierto(e)) { e.est = 'persigue'; e.t = 0; }
        break;
      }
      case 'persigue': {
        if (JUG.muerto || !esqDespierto(e)) { e.est = 'ronda'; e.ronT = 0; break; }
        if (d > D.vista * 1.5) { e.est = 'ronda'; e.ronT = 0; break; }
        /* LA CORREA: arrastrado lejos de su sitio, se vuelve. Sin esto se
           puede sacar a los nueve de la ceniza de a uno hasta el claro del
           arranque y pelearlos en fila — que es exactamente no jugar. */
        if (dist2(e.x, e.z, e.sx, e.sz) > (D.vista * 1.7) * (D.vista * 1.7)) { e.est = 'vuelve'; break; }
        /* SE PARA A SU ALCANCE Y NO ENCIMA. Yendo siempre al centro del
           jugador, un bruto de 62 cm de radio lo empuja fuera del suyo y no
           llega a pegarle nunca: la pelea se convierte en un forcejeo.     */
        const para = D.alc * 0.78 + J_RADIO;
        if (d > para) esqVa(e, dt, JUG.x, JUG.z, D.vel);
        else { e.vx *= Math.exp(-10 * dt); e.vz *= Math.exp(-10 * dt); esqMira(e, dt, 7); }
        if (d < D.alc && e.esp <= 0) { e.est = 'carga'; e.t = 0; e.gDio = false; }
        break;
      }
      case 'vuelve': {
        esqVa(e, dt, e.sx, e.sz, D.vel * 0.85);
        if (dist2(e.x, e.z, e.sx, e.sz) < 9) { e.est = 'ronda'; e.ronT = 0; e.vida = e.vidaMax; }
        break;
      }
      case 'carga':
        e.vx *= Math.exp(-12 * dt); e.vz *= Math.exp(-12 * dt);
        esqMira(e, dt, 4.5);                  // sigue apuntando, pero despacio
        if (e.t >= D.carga) { e.est = 'golpe'; e.t = 0; son('tajoEsq'); }
        break;
      case 'golpe': {
        const largo = 0.42;
        /* el golpe da EN UN INSTANTE del arco y no durante todo el estado; si
           no, quedarse pegado al bicho recibe cuatro veces el mismo tajo */
        if (!e.gDio && e.t > largo * 0.38) {
          e.gDio = true;
          const dz = Math.cos(e.rumbo), dx = Math.sin(e.rumbo);
          const rx = JUG.x - e.x, rz = JUG.z - e.z;
          const dd = Math.hypot(rx, rz);
          const frente = dd > 0.001 ? (rx * dx + rz * dz) / dd : 1;
          if (dd < D.alc + J_RADIO && frente > 0.35) jugRecibe(D.dano, e.x, e.z, D.empuje, e.cl);
        }
        if (e.t >= largo) { e.est = 'persigue'; e.esp = D.cad; }
        break;
      }
    }
    esqMueve(e, dt);
    esqPose(e, dt, d);
  }
  kitPinta(ESQ_KIT, cerca);
}

function esqVa(e, dt, tx, tz, vel) {
  const dx = tx - e.x, dz = tz - e.z, l = Math.hypot(dx, dz);
  if (l < 0.05) return;
  const g = rodea(e.x, e.z, dx / l, dz / l, ESQ[e.cl].radio, Math.min(l, 4.2));
  const ux = g.x, uz = g.z;
  e.vx = amort(e.vx, ux * vel, 8, dt); e.vz = amort(e.vz, uz * vel, 8, dt);
  e.rumbo = angAmort(e.rumbo, Math.atan2(ux, uz), 6.5, dt);
}
function esqMira(e, dt, k) {
  e.rumbo = angAmort(e.rumbo, Math.atan2(JUG.x - e.x, JUG.z - e.z), k, dt);
}

function esqMueve(e, dt) {
  const D = ESQ[e.cl];
  let x = e.x + e.vx * dt, z = e.z + e.vz * dt;
  const c = corrigeChoque(x, z, D.radio);
  x = c.x; z = c.z;
  /* LOS ESQUELETOS NO SE ATRAVIESAN ENTRE ELLOS: sin esto, una turba de
     catorce converge en el mismo punto y lo que se ve es UN bicho grueso */
  for (const o of ESQS) {
    if (o === e || !o.vive || o.est === 'muere') continue;
    const R = D.radio + ESQ[o.cl].radio;
    const d2 = dist2(x, z, o.x, o.z);
    if (d2 < R * R && d2 > 1e-6) {
      const d = Math.sqrt(d2), k = (R - d) / d * 0.5;
      x += (x - o.x) * k; z += (z - o.z) * k;
    }
  }
  const r = largo2(x, z);
  if (r > MUNDO_R * 0.96) { const k = MUNDO_R * 0.96 / r; x *= k; z *= k; }
  e.x = x; e.z = z; e.y = H(x, z);
}

function esqPose(e, dt, d) {
  const D = ESQ[e.cl];
  let a = 'quieto', arg = e.fase, b = null, brg = 0, k = 0;
  if (e.est === 'muere') { a = 'muere'; arg = Math.min(1, e.muerteT / (ESQ_MUERE * 0.72)); }
  else if (e.atur > 0) { a = 'dano'; arg = 1 - e.atur / ESQ_ATURDE; }
  else if (e.est === 'carga') { a = 'carga'; arg = Math.min(1, e.t / D.carga); }
  else if (e.est === 'golpe') { a = 'tajo'; arg = Math.min(1, e.t / 0.42); }
  /* ── LA POSE SALIENTE SE FUNDE ─────────────────────────────────────────
     El jugador ya mezclaba —`JUG.anda`— y los veintiocho esqueletos no: al
     terminar un tajo saltaban a 'quieto' en UN cuadro, con el brazo cruzado
     por delante y de golpe colgando. Un corte se ve aunque el bicho esté a
     veinte metros, y acá hay catorce a la vez. Se guarda la pose anterior y
     se funde en 0,16 s, que es lo que dura el corte sin que el aviso de la
     carga —que es lo que hace justa la pelea— llegue tarde.               */
  if (a !== e.poseA) { e.poseB = e.poseA; e.poseBrg = e.poseArg || 0; e.poseM = 1; e.poseA = a; }
  e.poseArg = arg;
  /* LA CADENCIA SALE DE LA VELOCIDAD Y DE LA ZANCADA (`ω = 2π·v/zancada`), y
     la fase se adelanta SIEMPRE —también en carga o aturdido— porque si no,
     al volver a caminar el ciclo arranca de donde quedó hace tres segundos y
     el primer paso sale con el pie en el aire.                             */
  const v = Math.hypot(e.vx, e.vz);
  e.cicSg = cicloSigno(e.vx, e.vz, e.rumbo, e.cicSg);
  e.paso = (e.paso || 0) + e.cicSg * (v * dt) / (zancada(0) * D.esc) * Math.PI * 2;
  if (a === 'quieto' && v > 0.25) { b = 'camina'; brg = e.paso; k = lim(v / (D.vel * 0.9), 0, 1); }
  /* la mezcla de salida MANDA sobre la de caminar: son las dos el mismo
     `poseAplica`, y con dos capas habría que evaluar tres poses por bicho por
     cuadro para catorce bichos. Mientras dura el corte se funde la vieja. */
  if (e.poseM > 0) {
    e.poseM = Math.max(0, e.poseM - dt / ESQ_FUNDE);
    if (e.poseM > 0.001) { b = e.poseB; brg = e.poseBrg; k = e.poseM; }
  }
  poseAplica(e.cuerpo, a, arg, b, brg, k);
  e.cuerpo.raiz.position.set(e.x, e.y, e.z);
  e.cuerpo.raiz.rotation.y = e.rumbo;
  /* EL NACIMIENTO VA ACÁ Y NO EN `esqAlta`, porque esta línea corre en CADA
     cuadro y pisa cualquier escala escrita una sola vez — la misma lección
     que el parpadeo de la fogata de LEMI contra el apagado de la cinemática. */
  e.naceT = Math.min(ESQ_NACE, (e.naceT || 0) + dt);
  const nac = e.naceT / ESQ_NACE;
  e.cuerpo.raiz.scale.setScalar(D.esc * (nac < 1 ? 0.18 + 0.82 * suav(nac) : 1));
  /* el tinte parpadea al recibir: es el único acuse de recibo que hay de que
     el golpe entró, porque una barra de vida sobre catorce bichos es ruido */
  const f = e.atur > 0 ? e.atur / ESQ_ATURDE : 0;
  e.tinte.setHex(D.color).convertSRGBToLinear();
  if (f > 0) e.tinte.lerp(ESQ_TINTE.setRGB(2.2, 0.55, 0.42), f * 0.85);
  if (e.est === 'carga') {
    const q = Math.min(1, e.t / D.carga);
    e.tinte.lerp(ESQ_TINTE.setRGB(1.35, 0.62, 0.30), q * 0.42);
  }
}

function esqRecibe(e, dano, dx, dz, empuje) {
  if (!e.vive || e.est === 'muere') return false;
  e.vida -= dano;
  e.atur = ESQ_ATURDE;
  const l = Math.hypot(dx, dz) || 1;
  e.vx += dx / l * empuje / (1 + ESQ[e.cl].radio * 2.2);
  e.vz += dz / l * empuje / (1 + ESQ[e.cl].radio * 2.2);
  if (e.vida <= 0) {
    e.est = 'muere'; e.muerteT = 0; e.vida = 0;
    son('rompe');
    jugGanaXp(ESQ[e.cl].xp);
    JUG.vida = Math.min(JUG.vidaMax, JUG.vida + e.vidaMax * MATA_CURA);
    JUG.bajas++;
    JUG.fur = Math.min(J_FUR, JUG.fur + J_FUR_BAJA);
    return true;
  }
  son('pega');
  return false;
}
