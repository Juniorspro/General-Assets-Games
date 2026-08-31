
/* ══════════════════════ EL PERSONAJE: HUESOS Y ANIMACIÓN ══════════════════════
   El modelo se genera y se riggea afuera; acá se lo mueve. Y las animaciones se
   escriben como FUNCIONES DEL TIEMPO sobre el esqueleto en vez de traerse
   clips: con un clip enlatado no hay forma de mezclar la caminata con la
   mirada, el parpadeo y la mandíbula, que es justo lo que este personaje tiene
   de más que un maniquí. Es lo mismo que ya se hizo con los cuatro de LEMI. */

const PJ = { ok: false, malla: null, grupo: null, idx: null, huesos: null,
             bind: {}, qpw: {}, pos0: {}, tri: 0, primeraPersona: false,
             yawCuerpo: 0, t: 0 };

/* LA ESCALA SALE DE LA ALTURA DEL OJO Y NO DE LA DEL CUERPO. La cámara del
   juego vive a 1,66 m y el ojo del modelo está a 1,606: dejándolo 1:1, o los
   pies flotan cinco centímetros o la cámara sale de la frente. */
const PJ_OJO = 1.6060;
const PJ_ESC = OJO / PJ_OJO;

const _qA = new T.Quaternion(), _qB = new T.Quaternion(), _eA = new T.Euler();

/* ── LOS BRAZOS SE BAJAN, Y CUÁNTO ESTÁ MEDIDO ──
   El modelo se generó en pose de A porque es lo que un riggeador automático
   necesita, y esa pose no es la de nadie: medido sobre el bind, el brazo sale a
   41 grados de la vertical. Mirándose el pecho en primera persona lo que se ve
   son dos manos flotando en los costados de la pantalla. */
const BRAZO_BASE = 0.55;
/* EL SIGNO DEL CIERRE SE COMPRUEBA, NO SE DEDUCE: el marco del hueso sale de la
   geometría medida, así que cuál de los dos lados es «hacia la palma» depende
   de cómo cayó el eje. Fotografiado en los dos sentidos: con +1 los dedos se
   abren hacia atrás —una mano rota— y con −1 se cierran sobre la palma.
   Y la pose de reposo de esta malla YA es un puño flojo, así que el recorrido
   útil es de ahí a cerrado y no de abierto a cerrado. */
const DEDO_SIGNO = -1;
/* 1,40 RADIANES, Y EL NÚMERO CAMBIÓ AL REPARTIR EL GIRO.
   Con toda la supinación en la muñeca hacían falta 2,60 —149 grados en un hueso
   que llega a 90— y por eso la mano se veía quebrada. Repartida 70/30 con el
   antebrazo, la palma llega más arriba con MENOS: barridos nueve ángulos
   leyendo la normal de la palma (`__V.normal`), la componente vertical va
   0→−0,19 · +0,6→+0,34 · **+1,4→+0,945** · +2,2→+0,61. O sea que 1,40 la deja
   casi horizontal, y son 56 grados de antebrazo más 24 de muñeca: los dos
   dentro de lo que una muñeca real hace. */
let PALMA_A = 1.40;
/* el brazo derecho sosteniendo algo delante del pecho: hombro adelante, hombro
   bajado contra el cuerpo y codo doblado. Los tres salieron de medir dónde cae
   la mano, no de elegirlos. */
/* [hombro X, hombro Y, hombro Z, codo X]. LA Y HACE FALTA: con X y Z solos el
   brazo baja y se adelanta pero NO CRUZA — medido, dieciocho combinaciones y la
   mano no bajó de cuarenta centímetros de costado. Lo que la trae al eje del
   cuerpo es el giro alrededor de la vertical. */
let MANO_A = [-0.55, 1.55, 0.70, -1.95];   /* medido: mano a 1,28 de alto,
                                             36 cm adelante y 13 de costado */
/* la misma mano pero LLEVADA A LA BOCA: mas flexion de codo y el hombro un poco
   mas arriba. El codo es el que hace casi todo el trabajo — es lo que acerca la
   mano a la cara sin sacarla del eje del cuerpo. */
let MANO_B = [-0.95, 1.62, 1.05, -2.62];

/* ── UN GIRO EN LOS EJES DEL MUNDO Y NO EN LOS DEL HUESO ──
   Los ejes locales de un hueso son los que dejó el bind, así que no significan
   nada: en este rig la cabeza viene con cuarenta grados de inclinación sobre X
   y la columna con otros tantos repartidos. Escribiendo `rotation.x` se le
   BORRA esa rotación al hueso y el personaje se dobla en dos — es la lección
   que en RECREO costó una vuelta entera con los brazos de Baldi.
   Acá el giro se pide en ejes de mundo y se lleva al espacio del hueso con
   `P⁻¹·R·P`, donde P es la rotación de mundo del PADRE en la pose de reposo. */
function giraH(n, ax, ay, az){
  const b = PJ.idx[n]; if (!b) return;
  _eA.set(ax || 0, ay || 0, az || 0, 'XYZ');
  _qA.setFromEuler(_eA);
  const p = PJ.qpw[n];
  _qB.copy(p).invert().multiply(_qA).multiply(p).premultiply(PJ.bind[n]);
  b.quaternion.copy(_qB);
}
function mueveH(n, dx, dy, dz){
  const b = PJ.idx[n], p = PJ.pos0[n]; if (!b) return;
  b.position.set(p.x + dx, p.y + dy, p.z + dz);
}

function cargaPersonaje(){
  if (PJ.ok) return;
  let buf;
  try { buf = B64(PJ_B64); } catch(e){ return; }
  /* MATERIAL PHONG Y NO LAMBERT, que es lo que usa todo el barrio. Es el único
     objeto del juego al que se le mira la cara de cerca, y lo que separa una
     piel mojada de una de cartón es el brillo del farol resbalando por la
     frente. Cuesta un programa más y se dibuja una vez. */
  const mat = new T.MeshPhongMaterial({ vertexColors: true, specular: 0x4b5058,
                                        shininess: 22 });
  let r;
  try { r = armaPersonaje(buf, mat); } catch(e){ return; }
  PJ.malla = r.malla; PJ.idx = r.idx; PJ.huesos = r.huesos; PJ.tri = r.tri;
  PJ.grupo = new T.Group();
  PJ.grupo.scale.setScalar(PJ_ESC);
  PJ.grupo.add(PJ.malla);
  PJ.grupo.visible = false;
  escena.add(PJ.grupo);

  /* el reposo se guarda ANTES de tocar nada: todas las poses son deltas sobre
     él, y sin la copia la primera pose ya destruye la referencia */
  PJ.malla.updateMatrixWorld(true);
  for (const b of PJ.huesos){
    PJ.bind[b.name] = b.quaternion.clone();
    PJ.pos0[b.name] = b.position.clone();
    const q = new T.Quaternion();
    (b.parent && b.parent.isBone ? b.parent : PJ.malla).getWorldQuaternion(q);
    PJ.qpw[b.name] = q;
  }
  PJ.ok = true;
  armaCaraSprites();
}

/* ══════════════════════ LAS POSES ══════════════════════
   Todo sale de dos números: la FASE del paso —la misma que mueve la cámara y
   dispara las pisadas, así que el pie y el sonido no se pueden desincronizar— y
   cuánto se está corriendo. */
/* `expr` y `bocaExpr` eligen el cuadro del atlas por NOMBRE; `abre` y `boca`
   son las dos perillas continuas que la cinemática mueve. Los nombres viven en
   `assets/barrio/cara/cara.json`, o sea que agregar una expresión es agregar un
   sprite y nombrarlo — no tocar el modelo. */
const GESTO = { abre: 1, boca: 0, pitch: 0, yawRel: 0,
                expr: 'neutro', bocaExpr: null, mira: 0, miraY: 0, autoParp: true,
                /* `libre` = nadie más está manejando la cara. La cinemática la
                   toma para sí, y quien quiera escribirla mientras tanto —hoy,
                   la sonda que fotografía las expresiones— la pide con esto. */
                libre: false,
                /* `mano` mezcla el brazo derecho a la pose de sostener algo a
                   la altura del pecho, SIN parar la caminata: lo que hay que
                   ver es alguien que camina mirándose la mano, no alguien que
                   se paró a mirarla. */
                mano: 0,
                /* cuánto se cierran los dedos, de 0 (abierta) a 1 (puño) */
                puno: 0, punoIzq: 0,
                /* la supinación: 0 es como cae la mano y 1 es la palma para
                   arriba, que es lo único que permite APOYAR algo en ella */
                palma: 0,
                /* 0 = la mano donde la deja `mano`; 1 = pegada a la boca */
                manoBoca: 0,
                /* el sacudon de la mano despues de tragar. Va sobre el hombro y
                   no sobre la muneca a proposito: sacudir la mano es un
                   movimiento del brazo entero, y puesto en la muneca se lee a
                   glitch. */
                tiembla: 0 };

/* ── LOS DEDOS ──
   No son geometría nueva: son los dedos que la malla YA tenía, detectados
   proyectando la banda de las puntas sobre el eje de los nudillos y riggeados
   con dos huesos cada uno (`herramientas/barrio/riggear.py`).
   SE GIRAN SOBRE SU PROPIO EJE X y no sobre uno del mundo, y ésa es la razón de
   que el hueso se haya creado con la orientación medida del dedo: doblar un
   dedo pasa a ser un número en vez de tres. Y va POSMULTIPLICADO sobre el bind,
   que es lo que aplica el giro en el espacio del hueso. */
const DEDOS_N = ['Indice', 'Medio', 'Anular', 'Menique'];
/* la falange de abajo dobla menos que la de arriba, y el meñique más que el
   índice: con todos iguales la mano se cierra como una pinza de metal */
const DEDOS_K = [[0.95, 1.15], [1.00, 1.20], [1.05, 1.25], [1.10, 1.30]];
const _qDedo = new T.Quaternion();
const _ejeDedo = new T.Vector3(1, 0, 0);
/* EL EJE DE LA MUÑECA ES EL +Y DEL PROPIO HUESO DE LA MANO, y eso no se elige:
   sale de que los dedos van a lo largo de ese eje —medido, de 0 a 0,188 en y—
   así que girar sobre él es exactamente supinar. */
const _ejeMuneca = new T.Vector3(0, 1, 0);
/* una torsión alrededor del eje del propio hueso, ENCIMA de lo que ya tenga.
   Posmultiplicar es lo que la deja en el espacio del hueso; premultiplicar la
   pondría en el del padre y torcería el brazo entero. */
function torsion(n, a){
  const b = PJ.idx[n]; if (!b) return;
  b.quaternion.multiply(_qA.setFromAxisAngle(_ejeMuneca, a));
}
function giraMuneca(n, a){
  const b = PJ.idx[n], q = PJ.bind[n];
  if (!b || !q) return;
  b.quaternion.copy(q).multiply(_qDedo.setFromAxisAngle(_ejeMuneca, a));
}
function curvaDedo(n, a){
  const b = PJ.idx[n], q = PJ.bind[n];
  if (!b || !q) return;
  b.quaternion.copy(q).multiply(_qDedo.setFromAxisAngle(_ejeDedo, a));
}
function ponPuno(lado, k){
  const c = cl(k, 0, 1) * DEDO_SIGNO;
  for (let i = 0; i < 4; i++){
    curvaDedo(lado + DEDOS_N[i], c * DEDOS_K[i][0]);
    curvaDedo(lado + DEDOS_N[i] + 'B', c * DEDOS_K[i][1]);
  }
  /* el pulgar cierra bastante menos y va contra los otros, no con ellos */
  curvaDedo(lado + 'Pulgar', c * 0.55);
  curvaDedo(lado + 'PulgarB', c * 0.70);
}

/* Lo que la pose que corrió dejó en el brazo derecho. Existe para que la mezcla
   de `GESTO.mano` parta de LO QUE HAY y no de una copia de la fórmula: dos
   sitios que describen el mismo vaivén terminan siempre desincronizados. */
const POSE = { bdX: 0, bdZ: 0, bdA: 0 };

function poseQuieto(f, t){
  /* respirar es lo único que separa a alguien parado de un maniquí */
  const r = Math.sin(t * 1.15);
  giraH('Spine01', r * 0.016, 0, 0);
  giraH('Spine', -r * 0.012, 0, Math.sin(t * 0.37) * 0.010);
  giraH('LeftArm',  0.02, 0, -BRAZO_BASE + Math.sin(t*0.53)*0.012);
  POSE.bdX = 0.02; POSE.bdZ = BRAZO_BASE - Math.sin(t*0.53+1.7)*0.012; POSE.bdA = -0.12;
  giraH('RightArm', POSE.bdX, 0, POSE.bdZ);
  giraH('LeftForeArm',  -0.12, 0, 0);
  giraH('RightForeArm', POSE.bdA, 0, 0);
  for (const n of ['LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot'])
    giraH(n, 0, 0, 0);
  mueveH('Hips', 0, r * 0.004, 0);
  giraH('Hips', 0, 0, 0);
}

function poseCamina(f, k){
  /* k va de 0 (caminando) a 1 (corriendo): lo que cambia es la amplitud y la
     inclinación del tronco, no el ciclo — correr no es caminar más rápido, es
     caminar más grande y echado adelante */
  const A = 0.46 + k * 0.34;          /* muslo */
  const B = 0.62 + k * 0.55;          /* rodilla */
  const C = 0.38 + k * 0.32;          /* brazo */
  const s = Math.sin(f), c = Math.cos(f);
  const s2 = Math.sin(f + Math.PI);
  /* LA RODILLA SÓLO DOBLA PARA UN LADO. Con un seno pelado la pierna se dobla
     hacia adelante media vuelta de cada ciclo, que es exactamente lo que se ve
     como una marioneta rota. */
  const rod = (x) => Math.max(0, Math.sin(x + 1.15)) * B;
  giraH('LeftUpLeg',  -s * A, 0, 0);
  giraH('RightUpLeg', -s2 * A, 0, 0);
  giraH('LeftLeg',  rod(f), 0, 0);
  giraH('RightLeg', rod(f + Math.PI), 0, 0);
  giraH('LeftFoot',  Math.sin(f + 2.3) * (0.20 + k*0.14), 0, 0);
  giraH('RightFoot', Math.sin(f + 2.3 + Math.PI) * (0.20 + k*0.14), 0, 0);
  /* los brazos van al revés que las piernas: es lo que mantiene el equilibrio y
     lo primero que se nota si falta */
  giraH('LeftArm',  s2 * C, 0, -BRAZO_BASE + 0.10 + k*0.06);
  POSE.bdX = s * C; POSE.bdZ = BRAZO_BASE - 0.10 - k*0.06;
  POSE.bdA = -(0.20 + k*0.55) - Math.max(0, s) * (0.25 + k*0.5);
  giraH('RightArm', POSE.bdX, 0, POSE.bdZ);
  giraH('LeftForeArm',  -(0.20 + k*0.55) - Math.max(0, s2) * (0.25 + k*0.5), 0, 0);
  giraH('RightForeArm', POSE.bdA, 0, 0);
  /* la pelvis bascula y el tronco gira AL REVÉS que ella: sin ese
     contramovimiento el personaje camina como una tabla */
  mueveH('Hips', c * 0.012, Math.abs(s) * (0.018 + k*0.014) - 0.010 - k*0.02, 0);
  giraH('Hips', 0, s * (0.07 + k*0.05), c * (0.05 + k*0.03));
  giraH('Spine01', 0.06 + k * 0.16, -s * (0.06 + k*0.05), 0);
  giraH('Spine', 0.02 + k * 0.06, -s * (0.05 + k*0.04), 0);
}

function pasoPersonaje(dt){
  if (!PJ.ok || !PJ.grupo.visible) return;
  PJ.t += dt;
  const f = AND.fase;
  const and = cl(AND.v / VEL, 0, 1);
  const k = cl((AND.v - VEL) / (CORRE - VEL), 0, 1);
  if (and < 0.06) poseQuieto(f, PJ.t);
  else poseCamina(f, k);

  /* ── LA CABEZA ──
     Lleva la vista del jugador, y el cuello se reparte el giro con ella: una
     cabeza que gira ochenta grados sobre un cuello quieto se lee a exorcismo.
     Y le RESTA la inclinación que el tronco acaba de tomar al correr, porque si
     no, corriendo se mira los pies. */
  const incl = (and < 0.06) ? 0 : (0.06 + k * 0.16) + (0.02 + k * 0.06);
  const py = cl(GESTO.pitch, -1.1, 0.9);
  const yr = cl(GESTO.yawRel, -1.15, 1.15);
  giraH('neck', -incl * 0.55 + py * 0.35, yr * 0.35, 0);
  giraH('Head', -incl * 0.45 + py * 0.65 + (and > 0.06 ? Math.sin(f*2) * 0.010 : 0),
        yr * 0.65, (and > 0.06 ? Math.cos(f) * 0.018 : 0));

  /* la mandíbula acompaña a la boca dibujada: el sprite dice QUÉ forma tiene la
     boca y el hueso le da el movimiento del mentón. Con sólo el sprite, hablar
     se ve como una calcomanía que cambia; con sólo el hueso, como alguien que
     abre la boca sin labios. */
  giraH('mandibula', GESTO.boca * 0.26, 0, 0);

  /* ── EL BRAZO QUE SOSTIENE, MEZCLADO SOBRE EL QUE CAMINA ──
     Se mezcla y no se reemplaza: el resto del cuerpo sigue en su ciclo, así que
     lo que se ve es un brazo que se levanta mientras las piernas siguen. Los
     ángulos están medidos con `__V.manoDer()` contra el pecho, no elegidos. */
  ponPuno('Right', GESTO.puno);
  ponPuno('Left', GESTO.punoIzq);

  const m = cl(GESTO.mano, 0, 1);
  if (m > 0.001){
    const q = cl(GESTO.manoBoca, 0, 1);
    const a0 = mez(MANO_A[0], MANO_B[0], q), a1 = mez(MANO_A[1], MANO_B[1], q),
          a2 = mez(MANO_A[2], MANO_B[2], q), a3 = mez(MANO_A[3], MANO_B[3], q);
    /* 34 rad/s son cinco sacudidas por segundo, que es lo que hace una mano
       cuando algo le da asco: mas lento se lee a saludo y mas rapido a vibrador */
    const tb = GESTO.tiembla > 0.001 ? Math.sin(PJ.t * 34.0) * 0.17 * GESTO.tiembla : 0;
    giraH('RightArm', mez(POSE.bdX, a0, m), a1 * m, mez(POSE.bdZ, a2 + tb, m));
    giraH('RightForeArm', mez(POSE.bdA, a3, m), 0, 0);
  }
  /* ── LA SUPINACIÓN ES DEL ANTEBRAZO, NO DE LA MUÑECA ──
     Estaba todo en la muñeca: `PALMA_A` en 2,60 son CIENTO CUARENTA Y NUEVE
     GRADOS de giro en un hueso que en una persona llega a noventa. En pantalla
     eso no es una palma para arriba, es una mano quebrada — la paleta pegada de
     costado al brazo que se veía en la captura.
     Poner la palma hacia arriba es pronosupinación, y eso pasa en el ANTEBRAZO:
     el radio gira sobre el cúbito. Se reparte 70/30 y ninguno de los dos pasa
     de los grados que tiene.
     VA DESPUÉS de `giraH` y POSMULTIPLICANDO, no antes: `giraH` escribe el
     cuaternión entero, así que un giro puesto antes lo borra — y encima la
     torsión tiene que ser alrededor del eje del propio hueso, que es lo que
     hace la posmultiplicación. */
  if (Math.abs(GESTO.palma) > 0.001){
    torsion('RightForeArm', GESTO.palma * PALMA_A * 0.70);
    torsion('RightHand',    GESTO.palma * PALMA_A * 0.30);
  }
  pasoCaraSprites(dt);
}

/* ══════════════════════ LA CARA DIBUJADA ══════════════════════
   Los ojos, las cejas y la boca NO son geometría: son dos placas con textura
   pegadas a la cara, cada una con un atlas de dieciséis cuadros generados y
   registrados con `herramientas/barrio/hornear_cara.py`.

   POR QUÉ, Y ES LA DECISIÓN DE FONDO DE ESTA VUELTA: en una cabeza low poly SIN
   CUENCA EXCAVADA un ojo de volumen o queda enterrado —medido, veintidós
   milímetros adentro del cráneo, con la sonda diciendo que estaba en cuadro— o
   queda saltado, y no hay punto medio. Y aunque quedara bien, seis huesos de
   párpado dan UNA forma de ojo; un atlas da dieciséis expresiones y se le
   agregan más sin tocar el modelo.

   Y LAS PLACAS SE CURVAN. Una cara es convexa: un rectángulo plano de dieciséis
   centímetros pegado a una cabeza de trece de radio se hunde centímetro y medio
   en las puntas — o sea que las cejas quedarían adentro del cráneo. La placa se
   arquea con la misma flecha que la cabeza y por eso apoya en todo su ancho. */
const CARA = { ojos: null, boca: null, texO: null, texB: null,
               t: 0, prox: 2.4, parp: -1, frameO: -1, frameB: -1 };

function placaCara(anchoM, altoM, flechaX, flechaY){
  /* una rejilla de 5×5 arqueada hacia atrás en las dos direcciones */
  const N = 4, pos = [], uv = [], idx = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++){
    const u = i/N, v = j/N;
    const x = (u - 0.5) * anchoM, y = (0.5 - v) * altoM;
    const k = (u - 0.5) * 2, m = (0.5 - v) * 2;
    pos.push(x, y, -(k*k*flechaX + m*m*flechaY));
    uv.push(u, 1 - v);
  }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
    const a = j*(N+1) + i;
    idx.push(a, a+N+1, a+1, a+1, a+N+1, a+N+2);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function texAtlas(b64, g){
  const im = new Image();
  const t = new T.Texture(im);
  t.colorSpace = T.SRGBColorSpace;
  /* SIN MIPMAPS: un atlas con mipmaps mezcla el cuadro de al lado en cuanto la
     cara se aleja, y en una cara eso es un ojo con la ceja de otra expresión
     encima. Y la repetición SALE DE LA GRILLA que escribió el horno: con el
     cuarto clavado a mano, agregar una hoja de expresiones deja la mitad del
     atlas fuera de alcance sin que nada avise. */
  t.generateMipmaps = false;
  t.minFilter = T.LinearFilter; t.magFilter = T.LinearFilter;
  t.repeat.set(1 / g[0], 1 / g[1]);
  im.onload = () => { t.needsUpdate = true; };
  im.src = 'data:image/png;base64,' + b64;
  return t;
}

function armaCaraSprites(){
  if (CARA.ojos || !PJ.ok) return;
  const anO = PJ.idx['caraOjos'], anB = PJ.idx['caraBoca'];
  if (!anO || !anB) return;
  CARA.texO = texAtlas(CARA_OJOS_B64, CARA_OJOS_G);
  CARA.texB = texAtlas(CARA_BOCA_B64, CARA_BOCA_G);
  /* ALFA POR CORTE Y NO POR TRANSPARENCIA: un material transparente no escribe
     profundidad, así que la placa de la boca y la de los ojos se dibujarían en
     el orden equivocado contra la nariz. Es la misma corrección que las cercas
     de piquetes. */
  const mO = new T.MeshPhongMaterial({ map: CARA.texO, alphaTest: 0.45,
                                       shininess: 6, specular: 0x101216 });
  const mB = new T.MeshPhongMaterial({ map: CARA.texB, alphaTest: 0.45,
                                       shininess: 6, specular: 0x101216 });
  /* ── LAS DOS MEDIDAS SALEN DE LA PROPORCIÓN DE LA CELDA, NO DEL GUSTO ──
     El atlas de los ojos tiene celdas de 112×84 y el de la boca de 96×84: una
     placa con otra proporción estira el dibujo, y un ojo estirado no se lee a
     estilo sino a error. Lo que se elige es UN número —el ancho— y el alto sale
     de la celda. Y el ancho se elige midiendo: la cara mide 0,18 de oreja a
     oreja a la altura de los ojos, y la tinta ocupa el 78,6 % de la celda, así
     que 0,158 deja el par de ojos en 0,124 — dos tercios de la cara, que es lo
     que mide un par de ojos. */
  /* EL ANCHO DE LAS PLACAS SE MIDE CONTRA LA CARA, no se hereda del modelo
     anterior. En el personaje denso el frente de la cara mide 0,155 m de ancho a
     la altura de los ojos y el par de ojos pintado del propio modelo mide 0,12:
     con los 0,158 de antes la placa tapaba de oreja a oreja y los ojos salian
     del tamano de la cabeza. */
  CARA.ojos = new T.Mesh(placaCara(0.150, 0.150 * 84 / 112, 0.017, 0.007), mO);
  CARA.boca = new T.Mesh(placaCara(0.078, 0.078 * 84 / 96, 0.006, 0.003), mB);
  CARA.ojos.frustumCulled = false; CARA.boca.frustumCulled = false;
  anO.add(CARA.ojos); anB.add(CARA.boca);
  ponOjos('neutro'); ponBoca('cerrada');
}

/* la fila se cuenta DESDE ARRIBA en la imagen y desde abajo en la UV, así que
   el desplazamiento vertical va al revés: es el único lugar donde el atlas y la
   textura no hablan el mismo idioma */
function ponCuadro(t, g, i){
  t.offset.set((i % g[0]) / g[0], (g[1] - 1 - Math.floor(i / g[0])) / g[1]);
}
function ponOjos(n){
  const i = CARA_OJOS_N.indexOf(n);
  if (i < 0 || i === CARA.frameO || !CARA.texO) return;
  CARA.frameO = i; ponCuadro(CARA.texO, CARA_OJOS_G, i);
}
function ponBoca(n){
  const i = CARA_BOCA_N.indexOf(n);
  if (i < 0 || i === CARA.frameB || !CARA.texB) return;
  CARA.frameB = i; ponCuadro(CARA.texB, CARA_BOCA_G, i);
}

/* ── HACIA DÓNDE MIRA ──
   Con las dos hojas hay ocho direcciones y no dos, así que la mirada deja de
   ser «izquierda o derecha» y pasa a ser un punto: `mira` es el eje horizontal
   y `miraY` el vertical, y las diagonales existen de verdad en vez de salir de
   promediar dos cuadros que no se pueden promediar. */
function mirada(){
  const x = GESTO.mira, y = GESTO.miraY;
  const dx = x < -0.35 ? -1 : (x > 0.35 ? 1 : 0);
  const dy = y < -0.35 ? -1 : (y > 0.35 ? 1 : 0);
  if (dy > 0) return dx < 0 ? 'arribaIzq' : (dx > 0 ? 'arribaDer' : 'arriba');
  if (dy < 0) return dx < 0 ? 'abajoIzq' : (dx > 0 ? 'abajoDer' : 'abajo');
  return dx < 0 ? 'izq' : (dx > 0 ? 'der' : 'neutro');
}

/* ── EL PARPADEO ES ASIMÉTRICO Y NO PERIÓDICO ──
   Un parpadeo baja en menos de una décima y sube en dos, y no cae cada tantos
   segundos exactos: con un período fijo se lee a luz que titila. */
function pasoCaraSprites(dt){
  if (!CARA.ojos) return;
  CARA.t += dt;
  let abre = cl(GESTO.abre, 0, 1);
  if (GESTO.autoParp){
    CARA.prox -= dt;
    if (CARA.prox <= 0 && CARA.parp < 0){ CARA.parp = 0; CARA.prox = azr(2.6, 6.4); }
    if (CARA.parp >= 0){
      CARA.parp += dt;
      const k = CARA.parp;
      abre = Math.min(abre, k < 0.09 ? 1 - k/0.09 : (k < 0.27 ? (k-0.09)/0.18 : 1));
      if (k > 0.30) CARA.parp = -1;
    }
  }
  /* ── DE LA APERTURA AL CUADRO: CINCO ESCALONES Y NO UNO ──
     Con un solo cuadro intermedio, un parpadeo son tres estados —abierto, a
     medias, cerrado— y a sesenta cuadros por segundo eso se ve como un
     interruptor: el ojo salta. La rampa `ab90 · ab70 · ab50 · ab25` es la
     razón de ser de la segunda hoja de expresiones, y es lo único que hace que
     bajar un párpado se lea a párpado. */
  let n;
  if (abre < 0.13) n = 'cerrado';
  else if (abre < 0.30) n = 'ab25';
  else if (abre < 0.48) n = 'ab50';
  else if (abre < 0.66) n = 'ab70';
  else if (abre < 0.84) n = 'ab90';
  else if (GESTO.expr && GESTO.expr !== 'neutro') n = GESTO.expr;
  else n = mirada();
  ponOjos(n);

  /* y la boca: la expresión manda, y si no hay, la abertura */
  const b = cl(GESTO.boca, 0, 1);
  ponBoca(GESTO.bocaExpr ? GESTO.bocaExpr
        : (b < 0.12 ? 'cerrada' : (b < 0.38 ? 'entreabierta'
        : (b < 0.70 ? 'a' : 'grande'))));
}

/* ── DÓNDE SE PLANTA ──
   `fp` es primera persona: se le achica la cabeza a la centésima parte. Es el
   truco de siempre y es el correcto: con la cabeza entera, la cámara vive
   adentro del cráneo y lo único que se ve es la cara interna de la nuca. Y no
   alcanza con acercar el plano de recorte, porque el pelo y la capucha llegan
   más lejos que la nariz. */
/* ── DÓNDE SE PLANTA EL CUERPO EN PRIMERA PERSONA, Y ES UNA CUENTA ──
   Lo anatómicamente correcto es poner el OJO del modelo en la cámara, y sale
   mal: el ojo está quince centímetros POR DELANTE del torso, así que el pecho
   queda quince centímetros DETRÁS de uno. Medido, con la vista a sesenta y seis
   grados hacia abajo el esternón proyectaba en −0,66 y lo único que entraba en
   el cuadro eran las zapatillas. Y con setenta grados de campo vertical no hay
   ángulo que alcance: el pecho está más allá de la vertical del ojo, o sea más
   allá de donde el lente puede mirar.

   Adelantar el cuerpo tampoco alcanza: con el cuerpo cinco centímetros adelante
   la cámara queda encima del cuello y el cuadro entero es el cuello de la
   campera visto desde adentro. Y BAJAR EL CUERPO ENTERO hunde las zapatillas en
   el asfalto.

   Lo que sí funciona es bajar SÓLO EL TORSO: en primera persona el hueso
   `Spine02` —el primero por encima de la cadera— se corre quince centímetros y
   medio hacia abajo y tres hacia adelante. Con eso el cuello queda a treinta y
   siete centímetros por debajo del ojo, el pecho aparece en el cuadro a partir
   de los cincuenta grados, y LA PELVIS Y LAS PIERNAS NO SE MUEVEN, así que los
   pies siguen pisando el suelo. Lo que se deforma es la cintura, que es
   justamente lo único que desde adentro no se ve. */
const PJ_ADELANTO = 0.020;
const PJ_TORSO = { y: -0.155, z: 0.030 };
function ponPersonaje(x, z, yaw, suelo, fp){
  if (!PJ.ok) return;
  PJ.grupo.visible = true;
  const ax = -Math.sin(yaw), az = -Math.cos(yaw);
  PJ.grupo.position.set(x + (fp ? ax*PJ_ADELANTO : 0), suelo,
                        z + (fp ? az*PJ_ADELANTO : 0));
  /* el modelo mira a su +Z local, y el frente del juego es (−sen yaw, −cos yaw) */
  PJ.grupo.rotation.y = yaw + Math.PI;
  if (fp !== PJ.primeraPersona){
    PJ.primeraPersona = fp;
    /* LA CABEZA Y EL CUELLO SE ACHICAN A LA CENTÉSIMA PARTE. Con la cabeza
       entera la cámara vive adentro del cráneo; y sacando sólo la cabeza queda
       el cuello de la campera levantado rodeando el lente. Es el truco de
       siempre en primera persona y es el correcto: no hay forma de recortar por
       distancia sin recortar también el mundo. */
    /* SE ACHICA LA CABEZA Y NO EL CUELLO. Achicando los dos, lo que queda es un
       torso ABIERTO por arriba y la cámara mirando adentro; el cuello entero, en
       cambio, cae veinte centímetros por debajo del ojo —o sea fuera del cuadro
       mirando al frente— y su tapón cierra el agujero que deja la cabeza. */
    if (PJ.idx['Head']) PJ.idx['Head'].scale.setScalar(fp ? 0.01 : 1);
    mueveH('Spine02', 0, fp ? PJ_TORSO.y : 0, fp ? PJ_TORSO.z : 0);
    /* y el plano de recorte se aleja: lo que queda del hombro y de la capucha
       está a menos de quince centímetros del ojo */
    cam.near = fp ? 0.15 : 0.1;
    cam.updateProjectionMatrix();
    ponLuzCuerpo(fp);
  }
}
/* ── LA LUZ DEL PROPIO CUERPO ──
   A las tres de la mañana, entre farol y farol, mirarse el pecho es mirar una
   silueta negra: medido en la captura, con pitch −0,62 no había un solo píxel
   de personaje en el cuadro. Va una luz mínima colgada de la cámara, con
   ALCANCE 1,6 m — o sea que se apaga antes de llegar al asfalto y no rompe la
   regla del juego, que es que lo único que ilumina de verdad son los faroles.
   Y es lo que hace cualquier juego en primera persona: uno se ve. */
let luzCuerpo = null;
function ponLuzCuerpo(v){
  if (!luzCuerpo){
    luzCuerpo = new T.PointLight(0xbcd0e6, 0, 1.6, 1.1);
    luzCuerpo.position.set(0, 0.05, 0.10);
    cam.add(luzCuerpo);
    escena.add(cam);
  }
  luzCuerpo.intensity = v ? 0.38 : 0;
}
function escondePersonaje(){ if (PJ.ok) PJ.grupo.visible = false; ponLuzCuerpo(false); }
function capaPersonaje(k){ if (PJ.ok) PJ.grupo.traverse(o => o.layers.set(k)); }
