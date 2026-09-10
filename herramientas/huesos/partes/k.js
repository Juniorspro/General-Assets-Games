/* ══════════════════════════════════════════════════════════════════════════
   EL DAÑO, LA XP Y LAS ZONAS — una sola cuenta, y la usan todos
   ══════════════════════════════════════════════════════════════════════════
   El golpe del jugador se resuelve en UNA función. Con la cuenta escrita en
   el sitio del jugador y otra vez en el del auto-jugador, el auto-jugador
   estaría probando un juego que no existe.                                */

let ZONA_ACT = 0, PART = 'menu', FIN_T = 0, GANO = false;
let SANGRE = 0, SACUDE = 0, AVISO = '', AVISO_T = 0, HITSTOP = 0;
/* ── EL ESTADO DE LAS OLEADAS ──────────────────────────────────────────────
   `i` es cuál oleada de la zona actual está en pie y `espera` el respiro que
   falta para la siguiente. `hechas` cuenta las limpiadas en toda la partida y
   es lo único que sirve para el récord: «llegué a la zona 2» no distingue
   entrar a la ceniza de terminarla.                                        */
const OLA = { i: 0, espera: 0, hechas: 0, suelta: 0 };

/* ¿este esqueleto entra en el arco del golpe? */
function enArco(e, x, z, rumbo, alc, arco) {
  const R = alc + ESQ[e.cl].radio;
  const dx = e.x - x, dz = e.z - z, d2 = dx * dx + dz * dz;
  if (d2 > R * R) return false;
  const d = Math.sqrt(d2);
  if (d < 0.05) return true;
  const c = (dx * Math.sin(rumbo) + dz * Math.cos(rumbo)) / d;
  return c > Math.cos(arco * 0.5);
}

function jugResuelveGolpe() {
  const g = J_COMBO[JUG.golpe];
  const mult = 1 + (JUG.nivel - 1) * NIV_DANO;
  let n = 0;
  for (const e of ESQS) {
    if (!e.vive || e.est === 'muere') continue;
    if (!enArco(e, JUG.x, JUG.z, JUG.rumbo, g.alc, g.arco)) continue;
    esqRecibe(e, Math.round(g.dano * mult), e.x - JUG.x, e.z - JUG.z, g.empuje);
    n++;
    /* SÓLO EL REMATE BARRE. Los dos primeros son tajos y le dan a UNO: si
       los tres pegaran a todos, una turba de seis se limpia machacando el
       botón y las clases dejan de significar algo. */
    if (JUG.golpe < J_COMBO.length - 1) break;
  }
  TALLY.tajos++;
  if (n) {
    TALLY.aciertos++;
    /* PAGA EL GOLPE QUE ACIERTA, no el que se tira. Con la furia subiendo por
       machacar el botón al aire, el remate se carga de espaldas a la pelea. */
    JUG.fur = Math.min(J_FUR, JUG.fur + J_FUR_GOLPE * n);
    SACUDE = Math.max(SACUDE, JUG.golpe === 2 ? 0.30 : 0.16);
    if (!PELEA_VIEJA) HITSTOP = Math.max(HITSTOP, JUG.golpe === 2 ? HIT_STOP_REMATE : HIT_STOP);
    son('impacto');
  }
  return n;
}

/* ── EL GOLPE DEL REMATE ───────────────────────────────────────────────────
   Barre un CÍRCULO y no un arco: cae desde arriba, así que no hay «de qué
   lado» — y eso es justamente lo que lo hace la respuesta a estar rodeado,
   que es el único apuro que este juego tiene. Va por `esqRecibe`, la misma
   que el combo, así que la cura por matar, la xp, la muerte y el sonido son
   los de siempre y no una segunda contabilidad.                           */
function jugRemateGolpe() {
  const mult = 1 + (JUG.nivel - 1) * NIV_DANO;
  let n = 0;
  for (const e of ESQS) {
    if (!e.vive || e.est === 'muere') continue;
    const R = J_REM_R + ESQ[e.cl].radio;
    if (dist2(e.x, e.z, JUG.x, JUG.z) > R * R) continue;
    esqRecibe(e, Math.round(J_REM_DANO * mult), e.x - JUG.x, e.z - JUG.z, J_REM_EMPUJE);
    n++;
  }
  TALLY.remates++; TALLY.remBajas += n;
  /* EL FOGONAZO Y EL FRENO SON EL GOLPE: sin ellos, el momento más caro del
     juego se ve igual que un tajo. El freno es el doble que el del remate del
     combo, y el anillo de choque queda dibujándose solo por su cuenta. */
  FOGO = 1; ONDA = 0; ONDA_X = JUG.x; ONDA_Z = JUG.z; ONDA_Y = H(JUG.x, JUG.z);
  SACUDE = Math.max(SACUDE, 0.62);
  HITSTOP = Math.max(HITSTOP, HIT_STOP_REMATE * 1.8);
  son('impacto'); son('remImpacto');
  return n;
}

/* el fogonazo, el anillo del suelo y las líneas de velocidad: los tres son
   estado del EFECTO y no del jugador, así que viven acá y los apaga el bucle */
let FOGO = 0, ONDA = -1, ONDA_X = 0, ONDA_Z = 0, ONDA_Y = 0, LINEAS = 0;
const ONDA_DUR = 0.46;

/* ── LAS DOS PIEZAS DEL IMPACTO ────────────────────────────────────────────
   El anillo del SUELO dice dónde cayó y a quién alcanzó —su radio final es
   `J_REM_R`, o sea que lo que se ve es exactamente lo que se golpeó— y la
   media luna VERTICAL es el corte en el aire, que es lo que ninguna cosa
   apoyada en el piso puede decir. Con una sola de las dos el remate se lee a
   explosión y no a espadazo.
   SE CREAN LA PRIMERA VEZ Y NO AL ARRANCAR: así no hay que acordarse de
   llamar a nada desde el arranque ni hay un orden de módulos que respetar. */
let EFE = null;
function efectosPaso(dt) {
  if (!EFE) {
    const anilloG = new THREE.RingGeometry(0.72, 1.0, 30, 1).rotateX(-Math.PI / 2);
    const mat = () => new THREE.MeshBasicMaterial({
      color: 0xfff3d2, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    const anillo = new THREE.Mesh(anilloG, mat());
    /* la media luna es un anillo CORTADO —media vuelta— parado de canto: un
       plano entero se lee a bandera y un disco a burbuja */
    const luna = new THREE.Mesh(new THREE.RingGeometry(0.80, 1.0, 26, 1, Math.PI * 0.12, Math.PI * 0.76), mat());
    anillo.frustumCulled = false; luna.frustumCulled = false;
    anillo.visible = false; luna.visible = false;
    esc.add(anillo); esc.add(luna);
    EFE = { anillo, luna };
  }
  if (ONDA >= 0) {
    ONDA += dt;
    const u = ONDA / ONDA_DUR;
    if (u >= 1) { ONDA = -1; EFE.anillo.visible = false; EFE.luna.visible = false; }
    else {
      /* CRECE CON LA RAÍZ: sale disparado y frena, que es lo que hace una
         onda. Lineal se ve a globo que se infla. */
      const r = J_REM_R * 1.12 * Math.sqrt(u), o = (1 - u) * (1 - u);
      EFE.anillo.visible = true;
      EFE.anillo.position.set(ONDA_X, ONDA_Y + 0.06, ONDA_Z);
      EFE.anillo.scale.setScalar(Math.max(0.01, r));
      EFE.anillo.material.opacity = o * 0.95;
      /* la media luna va CHICA y RÁPIDA: es el corte, no la explosión, así
         que tiene que haberse ido cuando el anillo recién va por la mitad.
         Y CHICA DE VERDAD: con la escala llegando a 3,7 el arco medía siete
         unidades de punta a punta contra un héroe de 1,8 —fotografiado, un
         arco blanco enorme flotando arriba y a la derecha, que no se lee a
         tajo sino a error de dibujo—. Topada en 1,9 el arco pasa por encima
         de la cabeza y se va antes de que el anillo llegue a la mitad. */
      const v = Math.min(1, u * 3.0);
      EFE.luna.visible = v < 1;
      EFE.luna.position.set(ONDA_X, ONDA_Y + 0.78, ONDA_Z);
      EFE.luna.rotation.set(0, Math.atan2(cam.position.x - ONDA_X, cam.position.z - ONDA_Z), 0.35);
      EFE.luna.scale.set(0.85 + v * 1.05, 0.85 + v * 1.05, 1);
      EFE.luna.material.opacity = (1 - v) * 0.75;
    }
  }
  /* el fogonazo se apaga A TIRONES y no suave: uno que se desvanece parejo se
     lee a transición de video y uno que corta se lee a golpe */
  if (FOGO > 0) FOGO = Math.max(0, FOGO - dt * (FOGO > 0.5 ? 9.5 : 4.2));
  const lin = jugRematando() && JUG.rem <= 1 ? J_REM_LINEAS : 0;
  LINEAS = amort(LINEAS, lin, lin ? 26 : 13, dt);
  matPost.uniforms.uFogo.value = FOGO * J_REM_FOGO;
  matPost.uniforms.uLineas.value = LINEAS;
}

const TALLY = { remates: 0, remBajas: 0, golpes: 0, dano: 0, porCl: {}, esquivados: 0, tajos: 0, aciertos: 0, frenoT: 0 };
function jugRecibe(dano, dx, dz, empuje, cl) {
  if (JUG.muerto) return;
  /* LOS CUADROS DE INVENCIBILIDAD DEL ESQUIVE SON LA MITAD DEL JUEGO: sin
     ellos esquivar es "correr un poco" y el aviso de carga no sirve de nada */
  if (JUG.esqT > 0 && (J_ESQ_T - JUG.esqT) < J_ESQ_INV) { TALLY.esquivados++; son('roza'); return; }
  if (JUG.invT > 0) return;
  JUG.vida -= dano;
  TALLY.golpes++; TALLY.dano += dano; TALLY.porCl[cl || '?'] = (TALLY.porCl[cl || '?'] || 0) + 1;
  JUG.invT = 0.42; JUG.danoT = 0.32;
  /* RECIBIR TAMBIÉN CARGA. Es lo que impide que la barra se apague justo
     cuando la pelea se pone fea: rodeado no se llega a pegar, y sin esto el
     remate —que es la herramienta contra una turba— no se puede pagar nunca
     en el único momento en que hace falta. */
  JUG.fur = Math.min(J_FUR, JUG.fur + J_FUR_RECIBE);
  const l = Math.hypot(JUG.x - dx, JUG.z - dz) || 1;
  JUG.vx += (JUG.x - dx) / l * empuje;
  JUG.vz += (JUG.z - dz) / l * empuje;
  SANGRE = Math.min(1, SANGRE + 0.55);
  SACUDE = Math.max(SACUDE, 0.34);
  son('dano');
  if (JUG.vida <= 0) {
    JUG.vida = 0; JUG.muerto = true; JUG.muerteT = 0; JUG.golpe = -1; JUG.esqT = 0;
    son('muere'); PART = 'fin'; GANO = false; FIN_T = 0; guardaRecord();
  }
}

function jugGanaXp(n) {
  JUG.xp += n;
  while (JUG.xp >= JUG.xpSig) {
    JUG.xp -= JUG.xpSig; JUG.nivel++;
    JUG.xpSig = XP_NIVEL(JUG.nivel);
    JUG.vidaMax += NIV_VIDA;
    /* SUBIR DE NIVEL CURA. Sin eso, la recompensa de matar a diez llega justo
       cuando no queda vida para usarla y la progresión se siente un castigo */
    JUG.vida = Math.min(JUG.vidaMax, JUG.vida + NIV_VIDA * 2.2);
    avisa(T('subiste', JUG.nivel));
    son('nivel');
  }
}

function avisa(txt, seg) { AVISO = txt; AVISO_T = seg || 2.6; }

/* ── LAS OLEADAS Y LAS ZONAS ───────────────────────────────────────────────
   Una oleada cae, hay un respiro, y viene la siguiente. Limpiada la última de
   una zona se abre la que sigue. Es lo único que convierte "matar esqueletos"
   en una partida con principio y final, y ahora además con escalones.

   TODO PASA POR ACÁ Y POR NADA MÁS: el respiro, la cura, el aviso, el sonido,
   el récord y el final. Con la cuenta repartida —una oleada soltada desde el
   arranque y otra desde el bucle— la primera nace sin respiro y sin aviso, y
   eso no falla: se ve como que la oleada 1 no existió.                     */
function olaSuelta() {
  const Z = ZONAS[ZONA_ACT];
  const L = oleadaEn(ZONA_ACT, OLA.i, SEM, MUNDO ? MUNDO.solidos : [], JUG.x, JUG.z);
  for (const s of L) esqAlta(s);
  OLA.suelta = L.length;
  const rey = Z.olas[OLA.i] === 'rey';
  avisa(rey ? T('olaRey')
            : T('olaViene', OLA.i + 1, Z.olas.length) + (OLA.i === Z.olas.length - 1 ? ' · ' + T('olaUlt') : ''),
        rey ? 3.6 : 2.4);
  son(rey ? 'zona' : 'ola');
  return L.length;
}

function zonasPaso(dt) {
  /* EL RESPIRO ES DEL RELOJ DE LA SIMULACIÓN y no de un `setTimeout`: con un
     temporizador de pared, un teléfono a 30 cuadros y una notebook a 144
     esperan lo mismo pero la pelea de al lado corre distinto, y el respiro
     deja de durar lo que dura el resto del juego. */
  if (OLA.espera > 0) {
    OLA.espera -= dt;
    if (OLA.espera <= 0) olaSuelta();
    return;
  }
  if (PART !== 'juego') return;
  if (esqVivos(ZONA_ACT) > 0) return;

  OLA.hechas++;
  const Z = ZONAS[ZONA_ACT];
  if (OLA.i < Z.olas.length - 1) {
    /* ── LIMPIAR UNA OLEADA CURA UN POCO ───────────────────────────────────
       No entera: eso es lo que paga cerrar una ZONA. Un pedazo, que es lo que
       convierte el respiro en un respiro y no en una cuenta regresiva — sin
       nada de cura, la oleada 3 se pelea con lo que sobró de la 2 y la
       escalera se vuelve un embudo, que es exactamente lo que ya costó una
       vuelta con las tres zonas.                                           */
    JUG.vida = Math.min(JUG.vidaMax, JUG.vida + JUG.vidaMax * OLA_CURA);
    /* ── Y PAGA XP, QUE ES LA OTRA MITAD ───────────────────────────────────
       Las oleadas escalan; el jugador tiene que escalar con ellas. Con la xp
       saliendo sólo de las bajas, limpiar las tres primeras del bosque no
       alcanza para subir de nivel y la oleada 2 se pelea con la misma vida y
       el mismo daño que la 1 — medido, el auto-jugador moría ahí en dos de
       ocho semillas, a nivel 1, comiéndose once golpes de peón. Es una
       FRACCIÓN de lo que falta para el nivel y no un número de puntos: así
       vale lo mismo en la primera oleada que en la última, donde un nivel
       cuesta cinco veces más.                                              */
    jugGanaXp(Math.round(JUG.xpSig * OLA_XP));
    OLA.i++; OLA.espera = OLA_RESPIRO;
    avisa(T('olaCae'), 1.8);
    son('nivel');
  } else if (ZONA_ACT < ZONAS.length - 1) {
    /* ── LIMPIAR UNA ZONA ES EL PUNTO DE CONTROL ───────────────────────────
       Antes abrir la siguiente era PURO COSTO: te la ganabas con la vida por
       la mitad y entrabas a pelear contra cosas del doble de vida. Medido con
       el bot en tres semillas: doce bajas, nivel 2, muerto en la ceniza, las
       tres veces — el juego no se podía terminar. Curar entero y regalar un
       nivel es lo que convierte la puerta en un respiro y no en un embudo. */
    ZONA_ACT++; OLA.i = 0; OLA.espera = OLA_RESPIRO_Z;
    JUG.vida = JUG.vidaMax;
    jugGanaXp(Math.round((JUG.xpSig - JUG.xp) * ZONA_XP));
    avisa(T('abre') + ' · ' + T('z' + ZONAS[ZONA_ACT].id), 3.4);
    son('zona');
  } else {
    PART = 'fin'; GANO = true; FIN_T = 0; son('gana'); guardaRecord();
  }
}

/* ── EL RÉCORD ─────────────────────────────────────────────────────────────
   Lo que se guarda son OLEADAS LIMPIADAS y no la zona: «llegué a la ceniza»
   no distingue entrar de terminarla, y con tres zonas el récord tendría tres
   valores posibles. Con siete oleadas hay siete escalones que contar, que es
   lo que hace que volver a jugar tenga un número al que ganarle.
   Y se guarda TAMBIÉN al morir, que es de donde va a salir casi siempre: un
   récord que sólo se anota ganando no es un récord, es el final.          */
let RECORD = { olas: 0, bajas: 0 };
function leeRecord() {
  try {
    const r = JSON.parse(localStorage.getItem('huesos_rec') || 'null');
    if (r && typeof r.olas === 'number') RECORD = { olas: r.olas | 0, bajas: r.bajas | 0 };
  } catch (e) {}
}
function guardaRecord() {
  if (OLA.hechas < RECORD.olas) return;
  if (OLA.hechas === RECORD.olas && JUG.bajas <= RECORD.bajas) return;
  RECORD = { olas: OLA.hechas, bajas: JUG.bajas };
  try { localStorage.setItem('huesos_rec', JSON.stringify(RECORD)); } catch (e) {}
}

/* la niebla, el cielo y la luz salen de la zona EN LA QUE ESTÁ EL JUGADOR y
   no de la que le toca matar: lo que hay que ver es dónde estás parado */
const _CN = new THREE.Color(), _CC = new THREE.Color(), _CL = new THREE.Color();
let ZONA_VIS = 0;

/* ── EL CIELO ES PLANO, Y SE PROBÓ QUE NO PUEDE NO SERLO ──────────────────
   `esc.background = Color` rellena de un solo valor todo lo que no tapa la
   geometría, y en este encuadre eso es más de un tercio del cuadro. Se hizo un
   domo con el color en los vértices —cenit oscuro, horizonte del color de la
   niebla— y SE MIDIÓ CONTRA SÍ MISMO, apagándolo en el mismo binario:

     zona     sin domo   con domo   lo que puso
     bosque     65,0       61,4       −3,6
     pantano    49,8       48,6       −1,2
     ruinas     58,0       55,4       −2,6
     ceniza     36,3       37,0       +0,7   ← al revés

   Menos de cuatro sobre 255, y en la ceniza para el otro lado. La causa es
   GEOMÉTRICA y ningún ajuste la mueve: `CAM_PIT` arranca en −0,13 y el campo
   es de 58 grados, así que la franja de cielo que el jugador ve llega a 21
   grados de elevación —o sea `t ≤ 0,53` de un degradado anclado ABAJO— y el
   horizonte del domo TIENE que ser el color de la niebla o aparece una costura
   donde el terreno se disuelve. La mitad de un rango chico es nada.
   Y encima el cielo plano es lo CORRECTO acá: con la niebla en 0,0135 a 0,021,
   a doscientos metros todo es del color de la niebla.
   Antes de volver a intentarlo hay que cambiar la CÁMARA, no el domo.        */
function zonaMezcla(dt) {
  const zi = zonaDe(JUG.x, JUG.z), Z = ZONAS[zi];
  if (!esc.fog) {
    esc.fog = new THREE.FogExp2(Z.niebla, Z.nieblaD);
    esc.background = new THREE.Color(Z.cielo);
    ZONA_VIS = zi;
  }
  const k = 1 - Math.exp(-1.9 * dt);
  esc.fog.color.lerp(_CN.setHex(Z.niebla), k);
  esc.fog.density = mez(esc.fog.density, Z.nieblaD * (CALIDAD === 'baja' ? 1.22 : 1), k);
  esc.background.lerp(_CC.setHex(Z.cielo), k);
  solLuz.color.lerp(_CL.setHex(Z.luz), k);
  solLuz.intensity = mez(solLuz.intensity, Z.sol, k);
  ambLuz.intensity = mez(ambLuz.intensity, Z.amb, k);
  hemLuz.intensity = mez(hemLuz.intensity, Z.amb * 1.62, k);
  ZONA_VIS = zi;
}
