
/* ══════════════════════════ LEMI Y LOS OTROS TRES ══════════════════════════
   Cuatro personajes de dibujito, con esqueleto propio armado a mano.

   POR QUÉ UN RIG PROPIO Y NO UN MODELO IMPORTADO: en este juego TODO es
   procedural y no hay un solo archivo de malla; meter un GLB rompería lo único
   que hace que «Otra isla» sea un botón. Y con un rig propio una animación es
   una FUNCIÓN DEL TIEMPO A DIEZ ROTACIONES: escribir la curva sale más corto
   que describirla, mezclar dos es evaluarlas y promediarlas, y no hay que
   retargetear nada. Es lo mismo que se hizo con el profesor de RECREO.

   EL ESQUELETO ES UNA JERARQUÍA DE PIVOTES, no de mallas. Cada articulación es
   un Object3D vacío puesto DONDE ESTÁ LA ARTICULACIÓN, y la malla del hueso
   cuelga de él corrida media longitud hacia abajo. Así girar el pivote gira el
   hueso alrededor de su punta de arriba —que es lo que hace un codo— en vez de
   alrededor de su centro, que es lo que pasa si uno rota la caja directamente. */

const PIEL = 0xe8b48a;
const geoCaja = new T.BoxGeometry(1, 1, 1);
geoCaja.userData.compartida = true;   /* la usan los 40 huesos de los 4 y el camello */
const matOjo = new T.MeshBasicMaterial({ color: 0x14181e });
const matPiel = new T.MeshLambertMaterial({ color: PIEL, flatShading: true });

/* los cuatro, con su ropa. Lemi va primero y es de rojo, el mismo rojo de la
   camioneta: es SU auto y es SU historia, y que las dos cosas compartan el
   color es lo que hace que se lea sin decirlo. */
const AMIGOS = [
  { n: 'Lemi', ropa: 0xd8483a, pelo: 0x2d1c12, pant: 0x2f4a6b, alt: 1.00 },
  { n: 'Sofi', ropa: 0x46b07a, pelo: 0x6b3a1c, pant: 0x394254, alt: 0.96 },
  { n: 'Tato', ropa: 0xe0b33c, pelo: 0x161616, pant: 0x4a3b2c, alt: 1.06 },
  { n: 'Vera', ropa: 0x8f6bd0, pelo: 0xc8a03c, pant: 0x2f4a6b, alt: 0.93 }
];

/* un hueso: pivote + caja colgando hacia abajo desde el pivote */
function hueso(padre, x, y, z, ancho, largo, fondo, mat){
  const piv = new T.Object3D();
  piv.position.set(x, y, z);
  padre.add(piv);
  const m = new T.Mesh(geoCaja, mat);
  m.scale.set(ancho, largo, fondo);
  m.position.y = -largo/2;
  m.castShadow = true;
  piv.add(m);
  piv.userData.largo = largo;
  return piv;
}

function armaPersona(d){
  const g = new T.Group();
  const e = d.alt;
  const mRopa = new T.MeshLambertMaterial({ color: d.ropa, flatShading: true });
  const mPant = new T.MeshLambertMaterial({ color: d.pant, flatShading: true });
  const mPelo = new T.MeshLambertMaterial({ color: d.pelo, flatShading: true });

  /* la cadera es la raíz de todo: subiéndola o bajándola se agacha el
     personaje entero sin tocar una sola articulación más */
  const cadera = new T.Object3D();
  cadera.position.y = 0.92*e;
  g.add(cadera);

  const torso = new T.Object3D();
  cadera.add(torso);
  const mTorso = new T.Mesh(geoCaja, mRopa);
  mTorso.scale.set(0.46*e, 0.56*e, 0.26*e);
  mTorso.position.y = 0.28*e;
  mTorso.castShadow = true;
  torso.add(mTorso);

  /* el cuello y la cabeza cuelgan del torso, así que mirar para un lado no
     mueve el cuerpo y agachar el cuerpo sí mueve la cabeza */
  const cuello = new T.Object3D();
  cuello.position.y = 0.56*e;
  torso.add(cuello);
  const cabeza = new T.Mesh(geoCaja, matPiel);
  cabeza.scale.set(0.34*e, 0.36*e, 0.32*e);
  cabeza.position.y = 0.18*e;
  cabeza.castShadow = true;
  cuello.add(cabeza);
  const pelo = new T.Mesh(geoCaja, mPelo);
  pelo.scale.set(0.37*e, 0.14*e, 0.35*e);
  pelo.position.y = 0.33*e;
  cuello.add(pelo);
  /* LOS OJOS VAN SIN LUZ (`MeshBasic`). Es lo único del personaje que tiene que
     verse igual de día que de noche junto al fuego: dos cajitas sombreadas se
     apagan con el resto de la cara y ahí el muñeco deja de mirar. */
  for (const sx of [-1, 1]){
    const o = new T.Mesh(geoCaja, matOjo);
    o.scale.set(0.055*e, 0.075*e, 0.02*e);
    o.position.set(sx*0.085*e, 0.20*e, 0.165*e);
    cuello.add(o);
  }

  /* brazos y piernas. El antebrazo cuelga del codo y la pantorrilla de la
     rodilla, así que doblar el codo no despega la mano del brazo. */
  const br = {}, pi = {};
  for (const [k, sx] of [['i', -1], ['d', 1]]){
    const hombro = hueso(torso, sx*0.29*e, 0.50*e, 0, 0.13*e, 0.30*e, 0.14*e, mRopa);
    const codo   = hueso(hombro, 0, -0.30*e, 0, 0.115*e, 0.28*e, 0.125*e, matPiel);
    br[k] = { hombro, codo };
    const musl = hueso(cadera, sx*0.13*e, 0, 0, 0.16*e, 0.42*e, 0.17*e, mPant);
    const rod  = hueso(musl, 0, -0.42*e, 0, 0.14*e, 0.40*e, 0.15*e, mPant);
    /* el pie: una caja adelante del tobillo, que es lo que impide que la
       pierna termine en punta */
    const pie = new T.Mesh(geoCaja, matOjo);
    pie.scale.set(0.16*e, 0.09*e, 0.26*e);
    pie.position.set(0, -0.42*e, 0.05*e);
    pie.castShadow = true;
    rod.add(pie);
    pi[k] = { musl, rod };
  }

  g.userData = { d, e, cadera, torso, cuello, br, pi, fase: Math.random()*6.28 };
  return g;
}

/* ── LAS POSES ──
   Cada una deja el esqueleto en un estado; `t` es el reloj. Se escriben como
   ángulos absolutos y no como deltas porque acá el reposo es CERO: el rig es
   propio y nació con los brazos colgando, así que no hay pose de bind que
   respetar —que es lo que en RECREO obligó a componer deltas sobre el reposo
   de Meshy—. */
function poseQuieto(p, t){
  const u = p.userData, f = t*1.5 + u.fase;
  u.cadera.position.y = 0.92*u.e + Math.sin(f)*0.012;
  u.torso.rotation.set(Math.sin(f)*0.02, 0, 0);
  u.cuello.rotation.set(Math.sin(f*0.7)*0.05, Math.sin(f*0.31)*0.22, 0);
  for (const [k, sx] of [['i',-1],['d',1]]){
    u.br[k].hombro.rotation.set(Math.sin(f + (sx>0?0:1))*0.05, 0, sx*0.09);
    u.br[k].codo.rotation.set(-0.22, 0, 0);
    u.pi[k].musl.rotation.set(0, 0, 0);
    u.pi[k].rod.rotation.set(0.04, 0, 0);
  }
}
function poseCamina(p, t, v){
  const u = p.userData, f = t*(2.4 + v*1.2)*2 + u.fase;
  const a = 0.55*Math.min(1, 0.4 + v);
  u.cadera.position.y = 0.92*u.e + Math.abs(Math.sin(f))*0.035;
  u.torso.rotation.set(0.10, Math.sin(f)*0.07, 0);
  u.cuello.rotation.set(-0.05, 0, 0);
  for (const [k, sg] of [['i',1],['d',-1]]){
    const s = Math.sin(f) * sg;
    u.br[k].hombro.rotation.set(-s*a*0.85, 0, (k==='i'?-1:1)*0.08);
    u.br[k].codo.rotation.set(-0.35 - Math.max(0, s)*0.4, 0, 0);
    u.pi[k].musl.rotation.set(s*a, 0, 0);
    /* la rodilla SÓLO se dobla hacia atrás y sólo en la pierna que va atrás:
       una rodilla que se dobla para adelante es lo que hace que un muñeco
       camine como un títere */
    u.pi[k].rod.rotation.set(Math.max(0, -s)*a*1.25, 0, 0);
  }
}
/* agachado poniendo leña: la cadera baja, las rodillas se abren y los brazos
   van adelante y abajo, con una mano que sube y baja acomodando el tronco */
function poseLena(p, t, trabaja){
  const u = p.userData, f = t*2.2 + u.fase;
  const w = trabaja ? 1 : 0;
  u.cadera.position.y = 0.92*u.e - 0.34*u.e;
  u.torso.rotation.set(0.52, 0, 0);
  u.cuello.rotation.set(0.28, Math.sin(f*0.5)*0.1, 0);
  for (const [k, sx] of [['i',-1],['d',1]]){
    const s = Math.sin(f + (k==='d'?0:0.9)) * w;
    u.br[k].hombro.rotation.set(-1.15 - s*0.30, 0, sx*0.26);
    u.br[k].codo.rotation.set(-0.85 + s*0.45, 0, 0);
    u.pi[k].musl.rotation.set(-1.30, 0, sx*0.22);
    u.pi[k].rod.rotation.set(1.65, 0, 0);
  }
}
/* sentado en un tronco, mirando el fuego */
function poseSentado(p, t){
  const u = p.userData, f = t*1.15 + u.fase;
  u.cadera.position.y = 0.92*u.e - 0.30*u.e;
  u.torso.rotation.set(0.14 + Math.sin(f)*0.03, Math.sin(f*0.4)*0.06, 0);
  u.cuello.rotation.set(-0.06, Math.sin(f*0.33)*0.16, 0);
  for (const [k, sx] of [['i',-1],['d',1]]){
    u.br[k].hombro.rotation.set(-0.42 + Math.sin(f + (k==='d'?0:1.4))*0.05, 0, sx*0.30);
    u.br[k].codo.rotation.set(-0.95, 0, 0);
    /* las piernas colgando del tronco y apenas abiertas */
    u.pi[k].musl.rotation.set(-1.42, 0, sx*0.10);
    u.pi[k].rod.rotation.set(1.05, 0, 0);
  }
}
/* un salto de sorpresa: se echa para atrás y sube los brazos. Es la pose del
   final de la cinemática, cuando aparece lo que aparece. */
function poseSusto(p, t, k){
  const u = p.userData;
  u.cadera.position.y = 0.92*u.e - 0.30*u.e + k*0.10;
  u.torso.rotation.set(0.14 - k*0.42, 0, 0);
  u.cuello.rotation.set(-0.06 - k*0.30, 0, 0);
  for (const [kk, sx] of [['i',-1],['d',1]]){
    u.br[kk].hombro.rotation.set(-0.42 - k*1.9, 0, sx*(0.30 + k*0.35));
    u.br[kk].codo.rotation.set(-0.95 - k*0.5, 0, 0);
    u.pi[kk].musl.rotation.set(-1.42, 0, sx*0.10);
    u.pi[kk].rod.rotation.set(1.05, 0, 0);
  }
}

/* ══════════════════════════ EL CAMELLO ══════════════════════════
   La cosa de la que va la historia. Se arma con el mismo criterio que la gente
   —pivotes y cajas— pero con las proporciones al revés: patas larguísimas,
   cuello largo, cuerpo corto y la joroba, que es lo único que hace que a la
   distancia y en silueta se lea CAMELLO y no caballo.

   VA EN ARENA OSCURA Y NO EN PARDO CASI NEGRO. La primera versión era 0x4a3524
   con el argumento de que una silueta negra da más miedo; medido, la escena de
   noche lo dejaba INVISIBLE —el gancho de proyección decía que estaba en cuadro
   y ocupando el 22 % del alto, y en la captura no había nada que ver—, porque
   de noche el fondo también es negro y una silueta necesita algo detrás que sea
   más claro que ella. En arena oscura se recorta contra el pasto de día y
   contra la maleza de noche, y es además el color que tiene un camello.
   LOS OJOS SON GRANDES A PROPÓSITO: van sin luz, así que son lo único suyo que
   no depende de la hora, y a veinte metros con el juego dibujando a media
   resolución unos ojos «de tamaño real» no llegan ni a un píxel. */
const matPelo   = new T.MeshLambertMaterial({ color: 0x8a6a44, flatShading: true });
const matOjoMal = new T.MeshBasicMaterial({ color: 0xff7a2a });

function armaCamello(){
  const g = new T.Group();
  const cuerpo = new T.Object3D();
  cuerpo.position.y = 2.05;
  g.add(cuerpo);

  const tronco = new T.Mesh(geoCaja, matPelo);
  tronco.scale.set(0.86, 0.92, 2.30);
  tronco.castShadow = true;
  cuerpo.add(tronco);
  /* LA JOROBA: sin ella son cuatro palos y una caja. Va bien atrás y bien alta */
  const jor = new T.Mesh(new T.SphereGeometry(0.62, 8, 6), matPelo);
  jor.scale.set(1, 0.86, 1.15);
  jor.position.set(0, 0.62, -0.18);
  jor.castShadow = true;
  cuerpo.add(jor);

  /* el cuello sale de ADELANTE ARRIBA y se inclina hacia adelante; la cabeza
     va en su punta con el hocico saliendo hacia +Z */
  const cuello = new T.Object3D();
  cuello.position.set(0, 0.34, 1.05);
  cuerpo.add(cuello);
  const mCue = new T.Mesh(geoCaja, matPelo);
  mCue.scale.set(0.38, 1.24, 0.42);
  mCue.position.y = 0.62;
  mCue.castShadow = true;
  cuello.add(mCue);
  const cabeza = new T.Object3D();
  cabeza.position.y = 1.24;
  cuello.add(cabeza);
  const mCab = new T.Mesh(geoCaja, matPelo);
  mCab.scale.set(0.36, 0.36, 0.52);
  mCab.position.z = 0.10;
  mCab.castShadow = true;
  cabeza.add(mCab);
  const hocico = new T.Mesh(geoCaja, matPelo);
  hocico.scale.set(0.26, 0.22, 0.34);
  hocico.position.set(0, -0.07, 0.44);
  cabeza.add(hocico);
  for (const sx of [-1, 1]){
    const o = new T.Mesh(geoCaja, matOjoMal);
    o.scale.set(0.135, 0.125, 0.05);
    o.position.set(sx*0.13, 0.06, 0.29);
    cabeza.add(o);
    const or = new T.Mesh(geoCaja, matPelo);
    or.scale.set(0.10, 0.14, 0.07);
    or.position.set(sx*0.17, 0.22, -0.02);
    cabeza.add(or);
  }

  /* las cuatro patas, largas y en dos tramos */
  const pat = [];
  for (const sx of [-1, 1]) for (const sz of [1, -1]){
    const alto = new T.Object3D();
    alto.position.set(sx*0.34, -0.30, sz*0.78);
    cuerpo.add(alto);
    const m1 = new T.Mesh(geoCaja, matPelo);
    m1.scale.set(0.20, 0.92, 0.22); m1.position.y = -0.46; m1.castShadow = true;
    alto.add(m1);
    const bajo = new T.Object3D();
    bajo.position.y = -0.92;
    alto.add(bajo);
    const m2 = new T.Mesh(geoCaja, matPelo);
    m2.scale.set(0.17, 0.80, 0.19); m2.position.y = -0.40; m2.castShadow = true;
    bajo.add(m2);
    const pe = new T.Mesh(geoCaja, matPelo);
    pe.scale.set(0.24, 0.14, 0.30); pe.position.set(0, -0.82, 0.04);
    bajo.add(pe);
    pat.push({ alto, bajo, sz });
  }
  const cola = new T.Mesh(geoCaja, matPelo);
  cola.scale.set(0.09, 0.52, 0.09);
  cola.position.set(0, 0.10, -1.18);
  cola.rotation.x = -0.5;
  cuerpo.add(cola);

  g.userData = { cuerpo, cuello, cabeza, pat, fase: 0 };
  return g;
}
/* camina: las patas cruzadas y el cuello balanceándose, que es lo que hace un
   camello de verdad. `v` es la velocidad y de ahí sale el ritmo, así que si
   corre las patas se aceleran solas y no patina. */
function animaCamello(c, t, v){
  const u = c.userData;
  u.fase += v * 0.62;
  const f = u.fase;
  u.cuerpo.position.y = 2.05 + Math.abs(Math.sin(f*2))*0.055;
  u.cuello.rotation.x = 0.30 + Math.sin(f)*0.09;
  u.cabeza.rotation.x = -0.22 + Math.sin(f*2)*0.05;
  u.pat.forEach((p, i) => {
    const s = Math.sin(f + (i%2 ? Math.PI : 0) + (p.sz > 0 ? 0 : 0.5));
    p.alto.rotation.x = s*0.52;
    p.bajo.rotation.x = Math.max(0, -s)*0.72;
  });
}

/* ── EL CAMELLO EN LA ISLA ──
   Después de la intro se queda dando vueltas por la isla. De día ronda lejos;
   DE NOCHE VIENE. Si te alcanza no hay pantalla de derrota —este juego no
   tiene uno— sino un sobresalto y aparecés de vuelta en el campamento, que es
   la regla que ya usa Eco con su cosa: el castigo es el susto y el camino de
   vuelta, no perder la partida. */
let CAM3 = null;
const BICHO = { x: 0, z: 0, ry: 0, v: 0, modo: 'ronda', tx: 0, tz: 0, t: 0, golpe: 0 };
const RONDA = 2.2, ACECHA = 3.6, EMBISTE = 7.4;   /* correr son 12,8: se le gana */

function ponCamello(){
  if (!CAM3){ CAM3 = armaCamello(); escena.add(CAM3); }
  /* arranca lejos del campamento: aparecer al lado del fuego el primer
     segundo de juego no es tensión, es una emboscada */
  const a = Math.random()*6.283, r = 120 + Math.random()*70;
  BICHO.x = CAMPO.x + Math.cos(a)*r;
  BICHO.z = CAMPO.z + Math.sin(a)*r;
  BICHO.modo = 'ronda'; BICHO.t = 0; BICHO.golpe = 0;
  nuevoDestino();
  CAM3.visible = true;
}
function nuevoDestino(){
  /* DE NOCHE LA MITAD DE LAS VECES APUNTA HACIA EL JUGADOR, y sin eso el
     camello es decorado: la isla mide 660 m de lado y él ronda a 2,2 m/s con
     destinos al azar, así que la probabilidad de que entre solo en los 95 m que
     necesita para olerte es baja y quedarse en un rincón era una partida
     ganada. Es la misma corrección que costó una vuelta con la cosa de Eco.
     No va DIRECTO: se le apunta a un punto a media distancia, así se acerca en
     etapas y sigue leyéndose como que anda dando vueltas y no como un misil. */
  const noche = CFG.sol > 0.80 || CFG.sol < 0.20;
  if (noche && Math.random() < 0.5){
    const dx = JUG.x - BICHO.x, dz = JUG.z - BICHO.z;
    const d = Math.hypot(dx, dz) || 1;
    const paso = Math.min(d, 55 + Math.random()*45);
    BICHO.tx = cl(BICHO.x + dx/d*paso, -MITAD*0.9, MITAD*0.9);
    BICHO.tz = cl(BICHO.z + dz/d*paso, -MITAD*0.9, MITAD*0.9);
    return;
  }
  const a = Math.random()*6.283, r = 30 + Math.random()*70;
  BICHO.tx = cl(BICHO.x + Math.cos(a)*r, -MITAD*0.9, MITAD*0.9);
  BICHO.tz = cl(BICHO.z + Math.sin(a)*r, -MITAD*0.9, MITAD*0.9);
}
function pasoCamello(dt){
  if (!CAM3 || !CAM3.visible) return;
  BICHO.t += dt;
  const dxj = JUG.x - BICHO.x, dzj = JUG.z - BICHO.z;
  const dj = Math.hypot(dxj, dzj);
  /* LA NOCHE ES LO QUE LO CAMBIA. `CFG.sol` es la fase del día: 0 medianoche,
     0,5 mediodía. Entre 0,80 y 0,20 —o sea de noche— sale a buscar. */
  const noche = CFG.sol > 0.80 || CFG.sol < 0.20;
  if (BICHO.golpe > 0){
    BICHO.golpe -= dt;
    if (BICHO.golpe <= 0){ BICHO.modo = 'ronda'; nuevoDestino(); }
  } else if (noche && dj < 95){
    BICHO.modo = dj < 26 ? 'embiste' : 'acecha';
    BICHO.tx = JUG.x; BICHO.tz = JUG.z;
  } else {
    if (BICHO.modo !== 'ronda'){ BICHO.modo = 'ronda'; nuevoDestino(); }
    if (Math.hypot(BICHO.tx-BICHO.x, BICHO.tz-BICHO.z) < 6) nuevoDestino();
  }

  const vel = BICHO.golpe > 0 ? 0
            : BICHO.modo === 'embiste' ? EMBISTE
            : BICHO.modo === 'acecha'  ? ACECHA : RONDA;
  const dx = BICHO.tx - BICHO.x, dz = BICHO.tz - BICHO.z;
  const d = Math.hypot(dx, dz) || 1;
  if (vel > 0){
    BICHO.x += dx/d * vel * dt;
    BICHO.z += dz/d * vel * dt;
    /* EL RUMBO SE PERSIGUE POR LA VUELTA CORTA. Sin normalizar la diferencia a
       [-π,π], cruzar de 179° a -179° le hace dar media vuelta sobre sí mismo. */
    const obj = Math.atan2(dx, dz);
    let da = obj - BICHO.ry;
    while (da >  Math.PI) da -= 6.283185;
    while (da < -Math.PI) da += 6.283185;
    BICHO.ry += da * Math.min(1, dt*2.6);
  }
  BICHO.v = vel;
  CAM3.position.set(BICHO.x, H(BICHO.x, BICHO.z), BICHO.z);
  CAM3.rotation.y = BICHO.ry;
  animaCamello(CAM3, RELOJ.value, vel * dt * 26);

  /* te alcanzó */
  if (MODO === 'juego' && !PAUSA && BICHO.golpe <= 0 && dj < 2.6){
    BICHO.golpe = 7.5;
    JUG.x = CAMPO.x + 3.4; JUG.z = CAMPO.z + 3.4; JUG.y = H(JUG.x, JUG.z);
    JUG.vy = 0; AND.golpe = 1.0;
    /* Y SE VA LEJOS, que si no el castigo se repite solo. Al jugador se lo
       manda al campamento; si al camello se lo deja donde estaba y el encuentro
       fue CERCA del campamento, cuando se le pasa el aturdimiento lo tiene otra
       vez a dos metros y vuelve a embestir sin que uno haya podido hacer nada.
       Es la misma regla que la cosa de Eco: te agarra, te suelta y se aleja. */
    const aa = Math.random()*6.283, rr = 90 + Math.random()*50;
    BICHO.x = CAMPO.x + Math.cos(aa)*rr;
    BICHO.z = CAMPO.z + Math.sin(aa)*rr;
    nuevoDestino();
    aviso('¡TE ALCANZÓ! · volvés al campamento');
  }
}

/* ══════════════════════════ LA CINEMÁTICA DE APERTURA ══════════════════════
   Tres escenas y el juego. Es una FUNCIÓN DEL TIEMPO, no una máquina de
   estados: `INTRO.pon(t)` recibe el segundo y deja la cámara, la gente, el
   auto y la hora del día. Por eso el banco puede fotografiar el segundo 21,4
   directo con `__V.cine(21.4)` sin esperar veintiún segundos —que es como se
   encontró todo lo que hubo que corregir acá adentro—.

   SE PUEDE SALTEAR EN CUALQUIER MOMENTO. Una cinemática obligatoria que se ve
   por segunda vez deja de ser una historia y pasa a ser un peaje. */
const GUION = [
  /* [ hasta el segundo, texto ] — el texto es el de la escena, no el del
     instante: partirlo en renglones sueltos obliga a leer más rápido de lo que
     uno mira, y lo que hay que mirar es la isla. */
  [ 5.5,  'Cuatro amigos. Una isla que no figura en ningún mapa.' ],
  [ 11.0, 'Lemi manejó ocho horas para llegar hasta acá.' ],
  [ 17.5, 'Levantaron el campamento antes de que cayera el sol.' ],
  [ 23.5, 'Nadie preguntó de quién eran las huellas en la arena.' ],
  [ 29.0, 'Eran de un camello. Y los estaba mirando.' ],
  [ 33.5, 'Los otros tres no salieron de las carpas.' ]
];
const INTRO = {
  activa: false, t: 0, dur: 33.5, gente: [], camelloCine: null,
  arranca(){
    this.t = 0; this.activa = true;
    MODO = 'cine';
    $('menu').classList.remove('on');
    $('hud').classList.remove('on');
    $('cine').classList.add('on');
    requestAnimationFrame(() => $('cine').classList.add('abre'));
    /* la gente se arma acá y se destruye al terminar: durante la partida los
       tres amigos están adentro de las carpas —por eso hay TRES carpas— y no
       cuestan un solo triángulo */
    this.gente = AMIGOS.map(d => { const p = armaPersona(d); escena.add(p); return p; });
    this.camelloCine = armaCamello();
    this.camelloCine.visible = false;
    escena.add(this.camelloCine);
    this.txtActual = -1;
  },
  termina(){
    if (!this.activa) return;
    this.activa = false;
    /* EL JUEGO EMPIEZA AL FINAL DE LA NOCHE, no al mediodía y no a medianoche.
       La historia dice que se sentaron de noche y que a partir de ahí es la
       tuya, así que salir a un mediodía radiante contradiría lo que se acaba de
       ver. Pero soltar al jugador en la fase 0,865 son SETENTA SEGUNDOS de
       oscuridad antes del primer amanecer, y eso no es tensión, es esperar.
       En 0,185 todavía es de noche —el camello está activo, que es lo que hace
       falta— y el sol sale a los once segundos: se empieza con miedo y se ve
       amanecer sobre la isla, que es el final que esta apertura pide. */
    CFG.sol = 0.185;
    FUEGO_K = 1;
    /* EL AUTO VUELVE A SU LUGAR DE ESTACIONAMIENTO.
       La escena 1 lo hace entrar desde setenta y ocho metros, así que salteando
       la cinemática en el segundo 1 la partida empezaba con la camioneta a
       setenta metros de donde tiene que estar —o sea, en la práctica, sin auto—.
       Se veía como que el auto no existía; medido con la proyección, la caja
       ocupaba el 2,3 % del alto del cuadro en vez del 26 % que le toca a seis
       metros, que es exactamente lo que da un objeto de dos metros a setenta.
       Y se apagan los faros, que la escena 1 podría haber dejado encendidos. */
    if (AUTO){
      AUTO.g.position.set(AUTO.x, AUTO.y, AUTO.z);
      AUTO.g.rotation.y = AUTO.ry;
      for (const f of AUTO.g.userData.faros) f.intensity = 0;
    }
    if (fuegoLuz) fuegoLuz.distance = 26;
    for (const p of this.gente) soltar(p);
    this.gente = [];
    if (this.camelloCine){ soltar(this.camelloCine); this.camelloCine = null; }
    $('cine').classList.remove('abre');
    $('cTexto').classList.remove('ver');
    setTimeout(() => $('cine').classList.remove('on'), 520);
    entraJuego();
    ponCamello();
  },
  /* deja TODO en el instante `t`. Sin estado escondido: llamarla dos veces con
     el mismo número tiene que dar la misma imagen. */
  pon(t){
    const c = CAMPO, a = AUTO;
    /* el sol baja a lo largo de la cinemática: llegan de tarde (0,66), arman el
       campamento al atardecer y terminan de noche cerrada (0,93). Es la misma
       cuenta que usa el juego, así que el cielo, la niebla y las estrellas
       acompañan solos. */
    /* LA CURVA DEL SOL TIENE QUE SER CRECIENTE Y CONTINUA, y la primera versión
       no era ninguna de las dos: restaba —o sea que el sol SUBÍA hacia el
       mediodía en vez de ponerse— y encima saltaba de 0,456 a 0,756 en el
       segundo 24, o sea que la noche caía de golpe en un cuadro. Medido:
       t=21 daba 0,493, que es mediodía, con el guion hablando del atardecer.
       Ahora los tres tramos empalman y no baja nunca: 0,66 (media tarde) →
       0,735 (el sol tocando el horizonte, justo mientras arman la fogata) →
       0,845 (noche) → 0,876 al terminar.
       Y LOS CORTES DE LOS TRAMOS CAEN DONDE CORTA EL GUION, no cada doce
       segundos redondos. El atardecer es la fase 0,75: el tramo de la fogata
       TERMINA en 0,745, o sea que los amigos arman el campamento con el sol
       rozando el horizonte —que es literalmente lo que dice el subtítulo— y la
       noche cae recién en la escena tres. Con los cortes anteriores, en el
       segundo 16 la fase ya iba en 0,772 y el cuadro estaba de noche mientras
       el texto hablaba de que todavía había sol.
       NO SE LLEGA A 0,93. A esa fase la luna sola deja el cuadro casi negro y
       la escena que importa —el bicho— no se ve; a 0,865 hay noche cerrada y
       todavía queda algo de luz del oeste para recortar siluetas. */
    CFG.sol = t < 11.5 ? 0.600 + t*0.00565
            : t < 23.5 ? 0.665 + (t-11.5)*0.00667
            : 0.745 + (t-23.5)*0.0120;
    ponSol(0);
    /* LA FOGATA CRECE PARA LA ESCENA DE NOCHE. En partida su alcance está
       medido para no lavar el campamento; acá es la única luz que hay y encima
       tiene que llegar a cuatro personas sentadas a tres metros. */
    if (fuegoLuz) fuegoLuz.distance = t > 23.5 ? 44 : 26;
    FUEGO_K = t > 23.5 ? 3.4 : 1;
    /* Y LA NOCHE SE LEVANTA, que es una decisión de cine y no de simulación.
       La noche del JUEGO es oscura a propósito —ambiente 0,20 y luna 0,42— y
       eso está bien cuando uno la camina con una fogata cerca. Pero en un plano
       fijo de ocho segundos, con eso el cuadro salía negro entero: medido, no se
       distinguía ni la fogata ni el bicho. Se sube la luna y el rebote sólo
       durante la escena 3 y se los deja como estaban al terminar. */
    if (t > 23.5){
      const lift = cl((t - 23.5)/2.2, 0, 1);
      ambiente.intensity = 0.20 + 0.62*lift;
      luna.intensity = 0.42 + 0.95*lift;
    }

    const g = this.gente;
    /* dónde se sienta cada uno: alrededor del fuego, mirándolo */
    const sillas = [0.5, 2.59, 4.69].map(ang => ({
      x: c.x + Math.cos(ang)*3.5, z: c.z + Math.sin(ang)*3.5, a: ang }));

    if (t < 11.5){
      /* ── 1 · EL AUTO LLEGA A LA ISLA ──
         Entra desde la costa y frena en su lugar de estacionamiento. La cámara
         lo sigue desde afuera y bajita, casi al ras del pasto: un plano de
         seguimiento a la altura de la rueda es lo que hace que un auto se lea
         RÁPIDO, porque el suelo pasa cerca. */
      const k = cl(t/9.5, 0, 1);
      const s = 1 - Math.pow(1 - k, 2.6);                /* frena, no corta */
      const dx = Math.cos(a.ry), dz = Math.sin(a.ry);
      /* el auto viene desde 78 m detrás de su lugar, sobre su propio eje */
      const px = a.x - Math.sin(a.ry)*78*(1-s);
      const pz = a.z - Math.cos(a.ry)*78*(1-s);
      const py = H(px, pz);
      a.g.position.set(px, py, pz);
      a.g.rotation.y = a.ry;
      for (const f of a.g.userData.faros) f.intensity = 0;
      /* la gente todavía está adentro: no se dibuja */
      for (const p of g) p.visible = false;

      const lado = 7.5 + (1-s)*5;
      const cx = px - Math.cos(a.ry)*lado, cz = pz + Math.sin(a.ry)*lado;
      cam.position.set(cx, Math.max(H(cx,cz), MAR) + 1.55 + s*0.9, cz);
      cam.lookAt(px, py + 1.0, pz);
      cam.fov = 52;
    } else if (t < 23.5){
      /* ── 2 · LA FOGATA ──
         Los cuatro alrededor del fuego poniendo los troncos. Tres se agachan y
         acomodan; el cuarto —Lemi— llega caminando con un tronco al hombro y
         se agacha también. La cámara los rodea despacio. */
      const u = t - 11.5, k = cl(u/12, 0, 1);
      a.g.position.set(a.x, a.y, a.z); a.g.rotation.y = a.ry;
      for (const f of a.g.userData.faros) f.intensity = 0;

      g.forEach((p, i) => {
        p.visible = true;
        if (i === 0){
          /* Lemi entra caminando desde el auto y se agacha al llegar */
          const ll = cl(u/4.2, 0, 1);
          const sx = lerp(a.x, c.x + Math.cos(1.6)*3.0, ll);
          const sz = lerp(a.z, c.z + Math.sin(1.6)*3.0, ll);
          p.position.set(sx, H(sx, sz), sz);
          p.rotation.y = Math.atan2(c.x - sx, c.z - sz);
          if (ll < 1) poseCamina(p, RELOJ.value, 1);
          else poseLena(p, RELOJ.value, true);
        } else {
          const s2 = sillas[i-1];
          p.position.set(s2.x*0.82 + c.x*0.18, H(s2.x, s2.z), s2.z*0.82 + c.z*0.18);
          p.rotation.y = Math.atan2(c.x - s2.x, c.z - s2.z);
          poseLena(p, RELOJ.value + i*0.7, true);
        }
      });
      const ang = 0.9 + k*1.15;
      const rr = 10.4 - k*2.0;
const cx = c.x + Math.cos(ang)*rr, cz = c.z + Math.sin(ang)*rr;
      cam.position.set(cx, c.h + 2.5 - k*0.55, cz);
      cam.lookAt(c.x, c.h + 1.05, c.z);
      cam.fov = 46;
    } else {
      /* ── 3 · DE NOCHE, SENTADOS ──
         Los cuatro en los troncos y el fuego alto. Y atrás, en el borde de la
         luz, aparece el camello. La cámara ESTÁ DETRÁS DE ELLOS y no enfrente:
         mirándolos de frente, lo que aparece atrás queda fuera de cuadro; desde
         atrás, el bicho entra por encima de sus cabezas y se ve lo mismo que
         ven ellos, que es el punto de la escena. */
      const u = t - 23.5, k = cl(u/10, 0, 1);
      a.g.position.set(a.x, a.y, a.z); a.g.rotation.y = a.ry;
      /* DÓNDE SE SIENTA CADA UNO SE DECIDE CONTRA DÓNDE ENTRA EL CAMELLO, no al
         azar. El bicho viene por 2,05 rad; Lemi se sienta en el ángulo OPUESTO
         (2,05 + π = 5,19) porque ahí es donde va la cámara, y los otros tres a
         ±1,4 y +2,6 de él, que deja el sector de 2,05 despejado. Repartidos
         parejo, uno de los cuatro tapaba justo la boca por donde aparece lo
         único que hay que ver en la escena. */
      const AENT = 2.05, ALEMI = AENT + Math.PI;
      /* LEMI NO SE SIENTA EN EL EJE DE LA CÁMARA sino medio radián al costado.
         Sentado justo delante, su espalda tapaba la fogata: medido, el fuego
         caía en y 0,64-0,97 y Lemi en 0,66-1,47, o sea encima. Corrido, la
         cámara mira POR EL HUECO entre él y el de al lado. */
      const asien = [ALEMI - 0.52, ALEMI + 1.42, ALEMI - 1.78, ALEMI + 2.62];
      const susto = cl((u - 6.4)/0.55, 0, 1);
      g.forEach((p, i) => {
        p.visible = true;
        const ag = asien[i];
        const sx = c.x + Math.cos(ag)*3.5, sz = c.z + Math.sin(ag)*3.5;
        p.position.set(sx, H(sx, sz) + 0.42, sz);
        p.rotation.y = Math.atan2(c.x - sx, c.z - sz);
        if (susto > 0) poseSusto(p, RELOJ.value, susto);
        else poseSentado(p, RELOJ.value + i*1.3);
      });
      /* EL CAMELLO ENTRA CAMINANDO Y NO APARECIENDO. Encendido de golpe se lee
         a error de dibujo; viniendo desde la oscuridad se lee a que estaba ahí
         desde antes, que es lo que dice el texto. */
      const cc = this.camelloCine;
      if (cc){
        const ent = cl((u - 3.2)/5.2, 0, 1);
        cc.visible = ent > 0;
        /* SE ACERCA HASTA DIEZ METROS y no hasta catorce: a catorce, con el
           campo cerrado de esta escena, medía cuatro dedos de alto al fondo del
           cuadro y no se leía como una amenaza sino como un arbusto. */
        /* SE ACERCA HASTA SIETE METROS DEL FUEGO, y ése es el número que lo
           hace existir: más lejos, la luz de la fogata no le llega y de noche
           un bicho sin luz encima es exactamente nada. Medido con una
           diferencia de píxeles sobre su propia caja proyectada. */
        const dd = 22 - ent*15;
        const cxx = c.x + Math.cos(AENT)*dd, czz = c.z + Math.sin(AENT)*dd;
        cc.position.set(cxx, H(cxx, czz), czz);
        cc.rotation.y = Math.atan2(c.x - cxx, c.z - czz);
        animaCamello(cc, RELOJ.value, ent < 1 ? 0.16 : 0.02);
      }
      /* LA CÁMARA VA SOBRE EL EJE FUEGO–CAMELLO, detrás de Lemi.
         El primer intento la ponía en un ángulo y miraba a otro punto corrido
         diez metros, y el resultado medido fue que en el cuadro no entraban ni
         la fogata ni el bicho: se veía a Lemi solo, en un rincón, contra un
         fondo negro. Puesta EN LA MISMA LÍNEA, lo que hay entre la cámara y el
         punto al que mira es, en orden, la nuca de Lemi, el fuego, y el camello
         saliendo de la oscuridad. Los tres planos del plano. */
      /* MÁS ALTA Y MÁS ATRÁS que el primer intento: a 2,05 m y siete metros, la
         espalda de Lemi se comía el centro del cuadro y el fuego quedaba detrás
         de ella. Desde 3,1 m se lo mira POR ENCIMA del hombro y el fuego, los
         otros tres y el camello quedan los tres a la vista. */
      const cx = c.x + Math.cos(ALEMI)*(9.4 - k*1.5);
      const cz = c.z + Math.sin(ALEMI)*(9.4 - k*1.5);
      cam.position.set(cx, c.h + 2.90 + k*0.22, cz);
      cam.lookAt(c.x + Math.cos(AENT)*(2.2 + k*3.4), c.h + 1.15 + k*0.55,
                 c.z + Math.sin(AENT)*(2.2 + k*3.4));
      cam.fov = 46 - k*6;
    }
    cam.updateProjectionMatrix();
    AND.fov = cam.fov;

    /* el subtítulo del tramo en el que estamos */
    let idx = GUION.length - 1;
    for (let i = 0; i < GUION.length; i++) if (t < GUION[i][0]){ idx = i; break; }
    if (idx !== this.txtActual){
      this.txtActual = idx;
      const el = $('cTexto');
      el.classList.remove('ver');
      setTimeout(() => { el.textContent = GUION[idx][1]; el.classList.add('ver'); }, 180);
    }
    /* el fundido a negro del final, que es por donde entra el juego */
    $('cVelo').classList.toggle('ver', t > this.dur - 1.1);
  },
  paso(dt){
    this.t += dt;
    this.pon(this.t);
    if (this.t >= this.dur) this.termina();
  }
};
