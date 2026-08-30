
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
}

/* ══════════════════════ LAS POSES ══════════════════════
   Todo sale de dos números: la FASE del paso —la misma que mueve la cámara y
   dispara las pisadas, así que el pie y el sonido no se pueden desincronizar— y
   cuánto se está corriendo. */
const GESTO = { abre: 1, boca: 0, gx: 0, gy: 0, pitch: 0, yawRel: 0, parp: 0 };

function poseQuieto(f, t){
  /* respirar es lo único que separa a alguien parado de un maniquí */
  const r = Math.sin(t * 1.15);
  giraH('Spine01', r * 0.016, 0, 0);
  giraH('Spine', -r * 0.012, 0, Math.sin(t * 0.37) * 0.010);
  giraH('LeftArm',  0.02, 0, -BRAZO_BASE + Math.sin(t*0.53)*0.012);
  giraH('RightArm', 0.02, 0,  BRAZO_BASE - Math.sin(t*0.53+1.7)*0.012);
  giraH('LeftForeArm',  -0.12, 0, 0);
  giraH('RightForeArm', -0.12, 0, 0);
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
  giraH('RightArm', s  * C, 0,  BRAZO_BASE - 0.10 - k*0.06);
  giraH('LeftForeArm',  -(0.20 + k*0.55) - Math.max(0, s2) * (0.25 + k*0.5), 0, 0);
  giraH('RightForeArm', -(0.20 + k*0.55) - Math.max(0, s)  * (0.25 + k*0.5), 0, 0);
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

  /* ── LA CARA ──
     Los seis huesos que ningún riggeador automático da. El párpado de arriba
     cubre el hemisferio de su polo: girándolo un ángulo positivo el borde queda
     por DEBAJO del eje de la pupila, o sea que tapa; abierto es negativo. */
  const a = cl(GESTO.abre * (1 - GESTO.parp), 0, 1);
  giraH('parpSupI', mez(0.62, -0.30, a), 0, 0);
  giraH('parpSupD', mez(0.62, -0.30, a), 0, 0);
  giraH('parpInfI', mez(-0.30, 0.26, a), 0, 0);
  giraH('parpInfD', mez(-0.30, 0.26, a), 0, 0);
  giraH('ojoI', GESTO.gx, GESTO.gy, 0);
  giraH('ojoD', GESTO.gx, GESTO.gy, 0);
  giraH('mandibula', GESTO.boca * 0.34, 0, 0);
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
