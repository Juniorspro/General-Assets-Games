
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

  /* EL TRONCO QUE LLEVA EN LA MANO.
     Cuelga del ANTEBRAZO DERECHO y no de la escena: así lo lleva la mano por
     construcción y no hay dos animaciones que puedan desincronizarse —si la
     posición del leño se calculara aparte, en el cuadro en que el brazo se
     mueve el leño iría un cuadro atrasado y se vería despegado de la mano—.
     Es la misma regla que la carta pegada a la pinza en RezUno.
     Nace apagado: sólo se enciende en la escena de la fogata. */
  const leno = new T.Mesh(new T.CylinderGeometry(0.075*e, 0.09*e, 0.86*e, 6), matCorteza);
  leno.position.set(0, -0.30*e, 0.10*e);
  leno.rotation.set(Math.PI/2, 0, 0.22);
  leno.castShadow = true;
  leno.visible = false;
  br.d.codo.add(leno);

  g.userData = { d, e, cadera, torso, cuello, br, pi, leno, fase: Math.random()*6.28 };
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
/* PARADO Y EN GUARDIA: es la pose del que oyó algo. Los brazos caen pero
   separados del cuerpo, el peso atrás, la cabeza adelantada. Lo que la hace
   leer como alerta y no como estar parado es el CUELLO estirado hacia adelante
   y los hombros subidos: nadie escucha algo raro con los hombros sueltos. */
function poseAlerta(p, t, k){
  const u = p.userData, f = t*1.2 + u.fase;
  u.cadera.position.y = 0.92*u.e + Math.sin(f)*0.008;
  u.torso.rotation.set(0.10 + k*0.06, 0, 0);
  u.cuello.rotation.set(-0.16 - k*0.10, Math.sin(f*0.6)*0.10*(1-k), 0);
  for (const [kk, sx] of [['i',-1],['d',1]]){
    u.br[kk].hombro.rotation.set(-0.12 - k*0.10, 0, sx*(0.16 + k*0.10));
    u.br[kk].codo.rotation.set(-0.42 - k*0.22, 0, 0);
    u.pi[kk].musl.rotation.set(-0.05, 0, sx*0.05);
    u.pi[kk].rod.rotation.set(0.10, 0, 0);
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

/* ── LA CARA ──
   Dibujada por código a 32 píxeles, como todo lo demás de este juego. Una foto
   de una cara real pegada sobre un animal de cajas planas se ve exactamente
   como lo que es: una foto pegada encima. Lo que da miedo acá no es el detalle
   sino la GEOMETRÍA de la cara, que se lee igual a cuatro píxeles: dos ojos
   demasiado juntos y demasiado arriba, pupilas chiquitas en mucho blanco —lo
   que hace que algo se vea desquiciado y no dormido— y una fila de dientes
   demasiado larga para el hocico.
   VA EN UNA SOLA CARA DEL CUBO DE LA CABEZA. Con el mismo mapa en las seis, el
   bicho tendría cara en la nuca. */
const texCara = lienzoTex(32, (g,n) => {
  moteado(g, n, '#8a6a44', '#a3835c', '#5e472c', 0.5);
  /* las cuencas: dos manchas oscuras hundidas, que es lo que hace que los ojos
     se lean como metidos adentro de la cabeza */
  g.fillStyle = '#2a1d12';
  g.fillRect(4, 7, 9, 8); g.fillRect(19, 7, 9, 8);
  /* el blanco del ojo, mucho, y la pupila chiquita y arriba */
  g.fillStyle = '#f4ecd8';
  g.fillRect(5, 8, 7, 6); g.fillRect(20, 8, 7, 6);
  g.fillStyle = '#c85a10';
  g.fillRect(7, 9, 3, 3); g.fillRect(22, 9, 3, 3);
  g.fillStyle = '#120c08';
  g.fillRect(8, 10, 1, 2); g.fillRect(23, 10, 1, 2);
  /* la boca: una raja negra de oreja a oreja con los dientes encima */
  g.fillStyle = '#1a0f0a';
  g.fillRect(3, 21, 26, 7);
  g.fillStyle = '#e8dcb0';
  for (let x = 4; x < 29; x += 3) g.fillRect(x, 21, 2, 3);
  for (let x = 5; x < 29; x += 3) g.fillRect(x, 25, 2, 3);
  /* los dos agujeros de la nariz y unas cicatrices */
  g.fillStyle = '#3a2616';
  g.fillRect(12, 17, 3, 2); g.fillRect(18, 17, 3, 2);
  g.fillStyle = '#6b4f33';
  g.fillRect(2, 4, 12, 1); g.fillRect(24, 16, 6, 1);
});
const matCara = new T.MeshLambertMaterial({ map: texCara, flatShading: true });

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
  /* la cabeza lleva SEIS materiales, uno por cara del cubo: la cara creepy va
     en +Z —el frente, o sea por donde mira— y el pelo en las otras cinco.
     `BoxGeometry` ya viene con seis grupos, uno por cara, en el orden
     +X −X +Y −Y +Z −Z: alcanza con pasarle un arreglo de materiales. */
  const mCab = new T.Mesh(geoCaja,
    [matPelo, matPelo, matPelo, matPelo, matCara, matPelo]);
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
  /* MIRAR A ALGUIEN ES UNA EXCEPCIÓN Y VA ACÁ, no en quien la pide. El ciclo
     de caminata escribe estas dos rotaciones TODOS los cuadros, así que una
     pose puesta desde afuera se borraba sola en el cuadro siguiente: la
     cinemática de la llave dejaba al camello mirando al horizonte con la cara
     —que es la textura que hay que ver— apuntando por encima del jugador.
     Rotar la cabeza en +X inclina su +Z hacia abajo, que es lo que hace falta
     para bajar la vista hasta alguien que está a los pies. */
  if (u.miraCuello != null) u.cuello.rotation.x = u.miraCuello;
  if (u.miraCabeza != null) u.cabeza.rotation.x = u.miraCabeza;
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
const BICHO = { x: 0, z: 0, ry: 0, v: 0, modo: 'ronda', tx: 0, tz: 0, t: 0, golpe: 0,
                /* `caza` lo saca del horario: después de la escena de la llave
                   ya no importa si es de día, te sigue igual. Hasta entonces
                   sólo sale de noche. */
                caza: false };
const RONDA = 2.2, ACECHA = 3.6, EMBISTE = 7.4;   /* correr son 12,8: se le gana */
/* CUÁNTO MIDE DE ALTO, sumado de la propia jerarquía y no estimado: cuerpo
   2,05 + cuello 0,34 + cabeza 1,24 + media cabeza 0,18 + oreja 0,09. Lo usa la
   cinemática de la llave para saber cuánto tiene que levantar la vista. */
const ALTO_CAMELLO = 3.90;

function ponCamello(){
  if (!CAM3){ CAM3 = armaCamello(); escena.add(CAM3); }
  /* arranca lejos del campamento: aparecer al lado del fuego el primer
     segundo de juego no es tensión, es una emboscada */
  const a = Math.random()*6.283, r = 120 + Math.random()*70;
  BICHO.x = CAMPO.x + Math.cos(a)*r;
  BICHO.z = CAMPO.z + Math.sin(a)*r;
  BICHO.modo = 'ronda'; BICHO.t = 0; BICHO.golpe = 0; BICHO.caza = false;
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
  /* durante la cinemática de la llave se queda plantado donde lo puso ella */
  if (BICHO.modo === 'quieto'){ CAM3.position.set(BICHO.x, H(BICHO.x, BICHO.z), BICHO.z);
    CAM3.rotation.y = BICHO.ry; animaCamello(CAM3, RELOJ.value, 0.02); return; }
  if (BICHO.golpe > 0){
    BICHO.golpe -= dt;
    if (BICHO.golpe <= 0){ BICHO.modo = 'ronda'; nuevoDestino(); }
  } else if ((noche || BICHO.caza) && dj < (BICHO.caza ? 400 : 95)){
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
  [ 6.0,  'Cuatro amigos. Una isla que no figura en ningún mapa.' ],
  [ 11.0, 'El campamento ya estaba armado antes de que cayera el sol.' ],
  [ 17.0, '—¿Escucharon eso? Nadie escuchó nada.' ],
  [ 21.0, 'Se fueron a dormir.' ],
  [ 27.5, 'Cuando Lemi se despertó, no había nadie.' ],
  [ 31.0, 'Sólo un rastro que salía del campamento.' ]
];
const INTRO = {
  activa: false, t: 0, dur: 31.0, gente: [],
  arranca(){
    this.t = 0; this.activa = true;
    MODO = 'cine';
    $('menu').classList.remove('on');
    $('hud').classList.remove('on');
    $('cine').classList.add('on');
    requestAnimationFrame(() => $('cine').classList.add('abre'));
    /* la gente se arma acá y se destruye al terminar: durante la partida no
       hay nadie —de eso va la historia— y no cuestan un solo triángulo */
    this.gente = AMIGOS.map(d => { const p = armaPersona(d); escena.add(p); return p; });
    this.txtActual = -1;
    /* EL MUNDO DE LAS MISIONES SE PLANTA ACÁ Y NO AL TERMINAR, y la razón es
       una sola línea del guion: «sólo un rastro que salía del campamento». El
       rastro lo construye `MIS.arma()`, que antes corría recién al entrar al
       juego, así que el plano que lo nombra mostraba pasto limpio. Lo único que
       se esconde es el panel de objetivos: durante la cinemática no hay nada
       que hacer todavía. */
    MIS.arranca();
    $('obj').classList.remove('on');
    /* UN FAROLITO PARA LA ESCENA DEL RUIDO. Lemi termina de espaldas al fuego,
       o sea a contraluz: medido en la captura salía como una silueta negra sin
       un rasgo, y lo que la escena tiene que mostrar es que está asustado. Va
       colgado de la cámara y sólo se enciende en ese tramo, así que la noche
       sigue siendo noche en los otros tres. */
    this.foco = new T.PointLight(0xffd9a8, 0, 17, 1.0);
    escena.add(this.foco);
  },
  termina(){
    if (!this.activa) return;
    this.activa = false;
    FUEGO_K = 1;
    if (fuegoLuz) fuegoLuz.distance = 26;
    for (const p of this.gente) soltar(p);
    this.gente = [];
    if (this.foco){ escena.remove(this.foco); this.foco.dispose && this.foco.dispose(); this.foco = null; }
    $('cine').classList.remove('abre');
    $('cTexto').classList.remove('ver');
    $('cVelo').classList.remove('ver');
    setTimeout(() => $('cine').classList.remove('on'), 520);
    /* EL DÍA EMPIEZA DE MAÑANA. La apertura termina con Lemi despertándose, y
       las cinco misiones son «del día»: soltarlo de noche contradiría lo que se
       acaba de ver y encima dejaría sin sentido «juntá ramas PARA LA NOCHE». */
    CFG.sol = 0.28;
    entraJuego();
    /* las misiones ya están armadas desde `arranca()`: acá sólo se destapa el
       panel. Rearmarlas tiraría el rastro que se acaba de ver y lo volvería a
       sortear, o sea que el juego empezaría con un rastro distinto del de la
       última imagen de la historia. */
    if (!MIS.on) MIS.arranca();
    $('obj').classList.add('on');
  },
  /* deja TODO en el instante `t`. Sin estado escondido: llamarla dos veces con
     el mismo número tiene que dar la misma imagen. */
  pon(t){
    const c = CAMPO, a = AUTO;
    /* EL AUTO YA ESTÁ ESTACIONADO desde el primer cuadro. Antes llegaba
       manejando; ahora el campamento está armado cuando empieza la historia,
       así que lo único que hay que hacer con él es dejarlo en su lugar. */
    if (a){
      a.g.position.set(a.x, a.y, a.z);
      a.g.rotation.y = a.ry;
      for (const f of a.g.userData.faros) f.intensity = 0;
    }
    /* la tarde cae, la noche pasa, y de la noche se corta a la mañana. El corte
       cae DENTRO del negro, que es lo que hace que se lea como que pasó la
       noche y no como que el sol pegó un salto. */
    CFG.sol = t < 12   ? 0.680 + t*0.00583
            : t < 21   ? 0.750 + (t-12)*0.01344
            : t < 22.5 ? 0.871
            :            0.245 + cl((t-22.5)/5, 0, 1)*0.055;
    ponSol(0);
    if (this.foco && !(t >= 12 && t < 17)) this.foco.intensity = 0;
    if (fuegoLuz) fuegoLuz.distance = (t > 9 && t < 22.5) ? 40 : 26;
    FUEGO_K = (t > 9 && t < 22.5) ? 3.0 : 1;
    /* la noche se levanta sólo mientras se la mira de cerca, igual que antes */
    if (t > 12 && t < 22.5){
      const lift = cl((t - 12)/2.5, 0, 1);
      ambiente.intensity = 0.20 + 0.62*lift;
      luna.intensity = 0.42 + 0.95*lift;
    }

    const g = this.gente;
    /* dónde se sienta cada uno. Se reparten FUERA del arco que barre la cámara
       (0,80 a 2,10 rad): con alguien en el medio, su espalda tapa la fogata,
       que es lo único que hay que ver en esta escena. */
    const asien = [5.55, 3.62, 4.58, 0.28];
    const sitio = (k) => ({ x: c.x + Math.cos(asien[k])*3.4,
                            z: c.z + Math.sin(asien[k])*3.4 });
    /* la carpa de cada uno, para el tramo de irse a dormir */
    const carpaDe = (k) => CARPAS.length ? CARPAS[(k+2) % CARPAS.length] : sitio(k);

    if (t < 12){
      /* ── 1 · LOS CUATRO EN LA FOGATA, CAYENDO EL SOL ──
         Sentados y charlando. La cámara los rodea despacio y baja: es el plano
         que establece que son cuatro y que están bien. */
      const k = cl(t/12, 0, 1);
      g.forEach((p, i) => {
        p.visible = true;
        p.userData.leno.visible = false;
        const s2 = sitio(i);
        p.position.set(s2.x, H(s2.x, s2.z) + 0.42, s2.z);
        p.rotation.y = Math.atan2(c.x - s2.x, c.z - s2.z);
        poseSentado(p, RELOJ.value + i*1.3);
      });
      const ang = 0.80 + k*1.30, rr = 9.6 - k*1.9;
      const cx = c.x + Math.cos(ang)*rr, cz = c.z + Math.sin(ang)*rr;
      cam.position.set(cx, c.h + 3.0 - k*0.55, cz);
      cam.lookAt(c.x, c.h + 1.15, c.z);
      cam.fov = 47;
    } else if (t < 17){
      /* ── 2 · EL RUIDO ──
         Lemi se para y se da vuelta hacia el monte. LOS OTROS TRES NO SE
         MUEVEN, y eso es la escena entera: si se pararan los cuatro, lo que
         pasa es que todos oyeron algo; quedándose sentados, lo que pasa es que
         Lemi es el único que lo oyó, que es lo que dice el texto.
         La cámara se pone DETRÁS de él y mira hacia donde él mira: así el
         espectador busca en la oscuridad lo mismo que está buscando él. */
      const u = t - 12, k = cl(u/5, 0, 1);
      const para = cl((u - 0.7)/1.1, 0, 1);      /* se levanta */
      const gira = cl((u - 1.6)/1.4, 0, 1);      /* se da vuelta */
      /* EL MONTE OSCURO ES EL QUE TIENE ATRÁS, no un rumbo escrito a mano.
         Con la constante de antes, la dirección del ruido caía del OTRO lado
         del campamento, o sea que Lemi se daba vuelta para mirar por encima de
         la fogata y sus tres amigos — y la cámara «delante de él» terminaba
         adentro del fuego: medido, la fogata ocupaba el 310 % del alto del
         cuadro y todo salía rojo. Lo que hay a espaldas de alguien sentado
         alrededor de un fuego es el bosque, y ésa es la dirección. */
      const s0i = sitio(0);
      let ax = s0i.x - c.x, az = s0i.z - c.z;
      const al0 = Math.hypot(ax, az) || 1; ax /= al0; az /= al0;
      g.forEach((p, i) => {
        p.visible = true;
        p.userData.leno.visible = false;
        const s2 = sitio(i);
        p.position.set(s2.x, H(s2.x, s2.z) + (i === 0 ? 0.42*(1-para) : 0.42), s2.z);
        if (i === 0){
          const mira = Math.atan2(c.x - s2.x, c.z - s2.z);
          p.rotation.y = lerp(mira, mira + Math.PI, gira);
          if (para < 1) poseSentado(p, RELOJ.value);
          else poseAlerta(p, RELOJ.value, gira);
        } else {
          p.rotation.y = Math.atan2(c.x - s2.x, c.z - s2.z);
          poseSentado(p, RELOJ.value + i*1.3);
        }
      });
      /* LA CÁMARA VA SOBRE SU HOMBRO, Y SE ARMA EN EL MARCO DE LEMI.
         Puesta en el círculo del campamento y apuntada al monte, la vista le
         pasaba POR ENCIMA DE LA CABEZA: medido, Lemi caía a 2,3 m del lente y
         entero por debajo del borde de abajo, así que el plano del susto —que
         es de lo que va esta escena— era un rectángulo de árboles negros sin
         nadie adentro. Ahora el sitio se calcula respecto de ÉL: tantos metros
         detrás y tantos a un costado de la dirección en la que mira, y el punto
         al que apunta está delante suyo. Así el encuadre no depende de dónde
         cayó el campamento ni de qué asiento le tocó. */
      const s0 = s0i, y0 = H(s0.x, s0.z);
      const ux = ax, uz = az;                       /* hacia donde termina mirando */
      const px = -uz, pz = ux;                      /* su costado */
      /* Y VA POR DELANTE DE ÉL, NO DETRÁS. Sobre el hombro se ve lo que él mira
         —oscuridad— y no se lo ve a él; medido, Lemi ocupaba el 68 % del alto y
         aun así en la captura no se distinguía, porque estaba de espaldas y en
         sombra contra árboles negros. Puesta enfrente, la fogata le queda
         DETRÁS y lo recorta: se le ve la silueta pararse y darse vuelta, que es
         lo único que esta escena tiene que contar. */
      const dist = lerp(5.0, 3.4, k), lado = lerp(2.8, 1.7, k), alt = lerp(1.85, 1.55, k);
      const cx = s0.x + ux*dist + px*lado;
      const cz = s0.z + uz*dist + pz*lado;
      cam.position.set(cx, y0 + alt, cz);
      cam.lookAt(s0.x, y0 + 0.95 + para*0.45, s0.z);
      cam.fov = 46 - k*7;
      if (this.foco){
        this.foco.position.set(cx, y0 + alt + 0.25, cz);
        this.foco.intensity = 2.6 * cl((u - 0.4)/1.2, 0, 1);
      }
    } else if (t < 22.5){
      /* ── 3 · SE VAN A DORMIR ──
         Caminan a las carpas y desaparecen adentro. La cámara se queda quieta
         del otro lado del fuego: es el último plano en el que se los ve. */
      const u = t - 17, k = cl(u/4.2, 0, 1);
      g.forEach((p, i) => {
        const s2 = sitio(i), ca = carpaDe(i);
        const sx = lerp(s2.x, ca.x, k), sz = lerp(s2.z, ca.z, k);
        p.position.set(sx, H(sx, sz), sz);
        p.rotation.y = Math.atan2(sx - ca.x, sz - ca.z) + Math.PI;
        p.userData.leno.visible = false;
        /* se meten en la carpa: se apagan al llegar, que es más honesto que
           hundirlos en el piso */
        p.visible = k < 0.94;
        if (k < 1) poseCamina(p, RELOJ.value, 0.7);
      });
      const cx = c.x + Math.cos(0.55)*10.5, cz = c.z + Math.sin(0.55)*10.5;
      cam.position.set(cx, c.h + 3.2, cz);
      cam.lookAt(c.x, c.h + 1.0, c.z);
      cam.fov = 48;
    } else {
      /* ── 4 · LA MAÑANA, Y NO HAY NADIE ──
         Mismo encuadre del campamento, de día, vacío. Que sea el MISMO sitio es
         lo que hace la escena: no hace falta decir que faltan, se ve. */
      const u = t - 22.5, k = cl(u/8.5, 0, 1);
      for (const p of g){ p.visible = false; p.userData.leno.visible = false; }
      /* Y EL ÚLTIMO PLANO MIRA EL RASTRO. El pie dice «sólo un rastro que salía
         del campamento» y la cámara apuntaba a un rumbo fijo escrito a mano, o
         sea a cualquier lado: en la captura no se veía una sola mancha. El
         rastro va del campamento a la cueva, así que ése es el rumbo, y la
         cámara se pone del lado de acá para que salga hacia el fondo. La vista
         además baja: se está despertando en el piso. */
      const r0 = (MIS && MIS.rastroDesde) ? MIS.rastroDesde : { x: c.x + 9, z: c.z - 7 };
      let vx = r0.x - c.x, vz = r0.z - c.z;
      const vl = Math.hypot(vx, vz) || 1; vx /= vl; vz /= vl;
      /* el plano ARRANCA en el campamento vacío y TERMINA sobre el rastro. Con
         una sola posición no entran las dos cosas: el campamento pide estar
         lejos y las manchas piden estar cerca —miden medio metro y el cuadro
         abre 108° en horizontal—, así que la cámara viaja de una a la otra
         mientras baja, que además es lo que hace alguien que se levanta y
         camina hasta lo que encontró. */
      const cx = lerp(c.x - vx*7.0, r0.x - vx*5.5, k);
      const cz = lerp(c.z - vz*7.0, r0.z - vz*5.5, k);
      cam.position.set(cx, c.h + 3.0 - k*1.3, cz);
      cam.lookAt(lerp(c.x, r0.x + vx*6, k), c.h + 1.1 - k*0.85,
                 lerp(c.z, r0.z + vz*6, k));
      cam.fov = 54 + k*6;
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
    /* EL NEGRO DEL MEDIO ES LA NOCHE QUE PASA, y es el que permite el corte de
       hora sin que se lea a error. El del final es por donde entra el juego. */
    $('cVelo').classList.toggle('ver',
      (t > 21.4 && t < 23.4) || t > this.dur - 1.1);
  },
  paso(dt){
    this.t += dt;
    this.pon(this.t);
    if (this.t >= this.dur) this.termina();
  }
};
