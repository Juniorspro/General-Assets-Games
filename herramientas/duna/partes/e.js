/* ══════════════════════════════════════════════════════════════════════════
   LA FISICA DEL RIDER
   ──────────────────────────────────────────────────────────────────────────
   TAMPOCO TOCA EL DOM NI EL LIENZO: entra en node junto con el terreno, asi
   que el auto-jugador puede correr cien partidas en un segundo sin abrir un
   navegador. Es la unica forma de saber si el mapa se puede recorrer.

   EL RIDER TIENE TRES ESTADOS Y UNO SOLO SE PARECE A UN JUEGO DE PLATAFORMA:
     · SUELO   — la velocidad vive SOBRE LA TANGENTE, no en x e y por
                 separado. Con componentes sueltas, bajar una duna empinada
                 haria que el cuerpo se despegara en cada cambio de pendiente.
     · AIRE    — parabola, y el dedo gira el cuerpo.
     · CUERDA  — pegado a un segmento, con su propia pendiente.
   ══════════════════════════════════════════════════════════════════════════ */

const R = {
  x: 0, y: 0, vx: 0, vy: 0, s: 0,      // `s` es la rapidez sobre la tangente
  suelo: true, ang: 0, rot: 0, giro: 0,
  /* DECLARADO ACA Y NO CREADO AL VUELO: `_EST` sale de `Object.keys(R)`, asi
     que un campo que nace en medio de un cuadro no lo guarda ni lo restaura
     el rollout — y entonces el bot planifica volteretas sobre un estado de
     giro que no es el suyo. */
  girAp: 0,
  cuerda: null, cu: 0,
  vivo: true, muerte: '',
  /* `caido` es lo que reemplaza a la muerte: cuanto le falta para levantarse.
     Mientras corre, el dedo no hace nada y el cuerpo se arrastra hasta parar. */
  caido: 0, caidas: 0,
  // el empuje de la mano derecha
  turboCd: 0, turbo: 0, empujes: 0,
  // los cuadros de gracia
  coyote: 0, buffer: 0,
  // lo que la partida cuenta
  dist: 0, mons: 0, flips: 0, grinds: 0, trucos: 0,
  combo: 0, comboMax: 0, comboT: 0, saltoMax: 0,
  // el vuelo en curso
  vueloX: 0, vueloY: 0, aire: 0,
  // lo que se le muestra al jugador
  ultTruco: '', ultTrucoT: 0, sacude: 0, polvo: 0,
};
let APRETADO = false, SALTOS = 0;
const COMBO_VENT = 2.6;   // segundos para encadenar

function riderReinicia() {
  R.x = 0; R.y = terrY(0); R.s = 13; R.vx = 13; R.vy = 0;
  R.suelo = true; R.ang = Math.atan(terrPend(0)); R.rot = 0; R.giro = 0;
  R.cuerda = null; R.cu = 0; R.vivo = true; R.muerte = '';
  R.caido = 0; R.caidas = 0; R.turboCd = 0; R.turbo = 0; R.empujes = 0;
  R.coyote = 0; R.buffer = 0;
  R.dist = 0; R.mons = 0; R.flips = 0; R.grinds = 0; R.trucos = 0;
  R.combo = 0; R.comboMax = 0; R.comboT = 0; R.saltoMax = 0;
  R.vueloX = 0; R.vueloY = 0; R.aire = 0;
  R.ultTruco = ''; R.ultTrucoT = 0; R.sacude = 0; R.polvo = 0;
  SALTOS = 0;
}

/* el angulo mas corto entre dos rumbos: sin esto, cruzar de +179 a -179 grados
   se lee como media vuelta y un aterrizaje perfecto cuenta como caida */
function angDif(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
/* Y EL RESORTE VA POR EL CAMINO CORTO, que no es lo mismo que interpolar los
   dos numeros. Con `mezcla(6.27, -0.20, k)` —los dos son casi el mismo rumbo,
   uno escrito como 2pi— el cuerpo daba UNA VUELTA ENTERA hacia atras apoyado
   en el suelo, en ocho cuadros. Medido: las once muertes por angulo que le
   quedaban al bot honesto en ocho minutos eran todas eso — aterrizaba bien,
   giraba solo, y se caia al hueco siguiente con el cuerpo a media vuelta. */
function angHacia(a, b, k) { return a - angDif(a, b) * k; }

function truco(k, n) {
  if (SIM) return;
  R.combo++; R.comboT = COMBO_VENT; R.trucos++;
  if (R.combo > R.comboMax) R.comboMax = R.combo;
  R.ultTruco = R.combo > 1 ? T('combo', R.combo) + '\n' + k : k;
  R.ultTrucoT = 1.5;
  if (typeof son === 'function') son(n || 'truco');
}

function riderPaso(dt) {
  if (!R.vivo) return;

  R.comboT -= dt;
  if (R.comboT <= 0) R.combo = 0;
  R.ultTrucoT -= dt;
  R.sacude *= Math.pow(0.0016, dt);
  if (R.buffer > 0) R.buffer -= dt;
  if (R.coyote > 0) R.coyote -= dt;
  if (R.turboCd > 0) R.turboCd -= dt;
  if (R.turbo > 0) R.turbo = Math.max(0, R.turbo - dt * 1.8);

  /* ── EL TUMBO ───────────────────────────────────────────────────────────
     El cuerpo se arrastra hasta parar y despues se levanta. NO SE ARRASTRA
     DENTRO DE UN HUECO: la caida ya lo dejo del lado de enfrente, y dejarlo
     resbalar hasta el borde siguiente lo tiraria otra vez sin que el jugador
     haya podido hacer nada — un castigo que se encadena solo no es un
     castigo, es un cuelgue. */
  if (R.caido > 0) {
    R.caido -= dt;
    R.buffer = 0; R.turbo = 0;
    R.s = Math.max(0, R.s - 14 * dt);
    const m = terrPend(R.x), k = 1 / Math.sqrt(1 + m * m);
    const nx = R.x + R.s * k * dt;
    if (hayPiso(nx)) R.x = nx; else R.s = 0;
    R.y = terrY(R.x); R.suelo = true;
    R.ang = angHacia(R.ang, Math.atan(m), 1 - Math.pow(0.0000001, dt));
    R.vx = R.s * k; R.vy = R.s * m * k;
    R.polvo = clamp(R.s / 26, 0, 1);
    R.dist = Math.max(R.dist, R.x);
    terrAvanza(R.x); juntaMonedas();
    if (R.caido <= 0) { R.caido = 0; R.s = V_MIN; }   // se levanta y vuelve a empujar
    return;
  }

  if (R.cuerda) { pasoCuerda(dt); return; }
  if (R.suelo) pasoSuelo(dt); else pasoAire(dt);

  R.dist = Math.max(R.dist, R.x);
  terrAvanza(R.x);
  juntaMonedas();
  buscaCuerda();
}

/* ── SUELO ────────────────────────────────────────────────────────────────
   La rapidez vive sobre la tangente y de ahi salen vx y vy: asi el cuerpo no
   se despega en cada cambio de pendiente y la tabla siempre esta apoyada. */
function pasoSuelo(dt) {
  const m = terrPend(R.x), k = 1 / Math.sqrt(1 + m * m);
  const cos = k, sin = m * k;                     // seno con signo: negativo bajando
  R.s += (-G * sin - ROCE * G * cos - AIRE * R.s * Math.abs(R.s)) * dt;
  if (R.s < V_MIN) R.s = mezcla(R.s, V_MIN, 1 - Math.pow(0.08, dt));
  if (R.s > V_MAX) R.s = V_MAX;

  R.x += R.s * k * dt;
  R.y = terrY(R.x);
  R.vx = R.s * k; R.vy = R.s * m * k;
  /* el cuerpo sigue la tangente con un resorte y no de un salto: copiandola
     exacto, un cambio de pendiente rota el rider en un cuadro y se lee a
     tiron. Y es rapido —28— porque un rider apoyado NO puede quedar torcido */
  R.ang = angHacia(R.ang, Math.atan(m), 1 - Math.pow(0.0000001, dt));
  R.giro = 0; R.rot = 0; R.girAp = 0;
  R.polvo = clamp((R.s - 9) / 18, 0, 1);
  R.coyote = COYOTE;

  if (!hayPiso(R.x)) { R.suelo = false; R.vueloX = R.x; R.vueloY = R.y; R.aire = 0; return; }
  if (R.buffer > 0) { salta(); }
}

function salta() {
  R.buffer = 0; R.coyote = 0; R.suelo = false;
  R.vy = R.s * terrPend(R.x) / Math.sqrt(1 + terrPend(R.x) ** 2) + SALTO;
  R.vueloX = R.x; R.vueloY = R.y; R.aire = 0;
  SALTOS++;
  if (typeof son === 'function') son('salta');
}

/* ── AIRE ─────────────────────────────────────────────────────────────────
   El dedo gira el cuerpo hacia atras. La voltereta NO es un boton aparte y
   no puede serlo: hay uno solo, y lo que lo distingue de saltar es que el
   salto es el FLANCO y el giro es el SOSTENIDO.                           */
function pasoAire(dt) {
  R.vy -= G * dt;
  R.vx -= AIRE * R.vx * Math.abs(R.vx) * dt;
  R.x += R.vx * dt; R.y += R.vy * dt;
  R.aire += dt;
  R.polvo = 0;

  /* LA INERCIA DEL GIRO ES DE CINCUENTA MILISEGUNDOS Y NO DE CIENTO SETENTA,
     y el numero salio de una medicion. Con la cola larga, soltar el dedo
     dejaba el cuerpo girando 1,6 rad de mas: medido, el auto-jugador cerraba
     CERO volteretas en 25 semillas porque ninguna duracion de apriete daba un
     angulo dentro de la tolerancia. Y no es un problema del bot: un jugador
     tendria que anticipar la misma cola. Con τ=0,05 el arranque y el frenado
     casi se cancelan y "soltar cuando cerraste la vuelta" pasa a ser cierto. */
  /* la espera cuenta EN EL AIRE: este renglon solo corre en la rama de vuelo,
     asi que sostener el dedo en el suelo no adelanta nada */
  R.girAp = APRETADO ? R.girAp + dt : 0;
  const gira = APRETADO && R.girAp > GIRO_ESPERA;
  R.rot = mezcla(R.rot, gira ? GIRO_V : 0, 1 - Math.pow(1e-9, dt));
  R.ang += R.rot * dt; R.giro += R.rot * dt;

  const py = terrY(R.x);
  if (R.y <= py) {
    if (!hayPiso(R.x)) { const h = huecoEn(R.x); if (h && R.y < h.y0 - 2.5) return cae('hueco'); return; }
    aterriza(py);
  }
  if (R.y < terrY(R.x) - 60) cae('hueco');
}

/* ── EL ATERRIZAJE ES LA UNICA COSA QUE SE PUEDE HACER MAL ────────────────
   Y por eso es donde vive toda la dificultad del juego. Lo que se compara no
   es la altura ni la velocidad: es el ANGULO del cuerpo contra la tangente
   del terreno. Derecho, se gana velocidad; de cabeza, se cae.
   LA TOLERANCIA ES GENEROSA a proposito (0,62 rad = 36 grados): lo que tiene
   que costar es cerrar la vuelta a tiempo, no clavar el grado.            */
function aterriza(py) {
  const m = terrPend(R.x), at = Math.atan(m), d = Math.abs(angDif(R.ang, at));
  const vueltas = Math.round(Math.abs(R.giro) / (Math.PI * 2));
  R.saltoMax = Math.max(R.saltoMax, R.x - R.vueloX);

  if (d > GIRO_TOL) return cae('angulo');

  R.y = py; R.suelo = true;
  /* y se normaliza al aterrizar: sin esto `ang` crece sin techo vuelta tras
     vuelta y termina perdiendo precision donde se compara con la tangente */
  R.ang = angDif(R.ang, 0);
  /* la rapidez que queda es la PROYECCION sobre la tangente: cayendo de una
     duna alta, la componente vertical se convierte en velocidad, que es
     exactamente lo que hace que un salto bien aterrizado se sienta rapido */
  const k = 1 / Math.sqrt(1 + m * m);
  R.s = Math.max(V_MIN, (R.vx + R.vy * m) * k);
  if (vueltas > 0) {
    R.flips += vueltas;
    R.s = Math.min(V_MAX, R.s + 1.9 + 1.5 * vueltas);
    truco(T('t' + Math.min(4, vueltas)), 'flip');
  } else if (R.x - R.vueloX > 15) {
    R.s = Math.min(V_MAX, R.s + 1.0);
    truco(T('salto'), 'flip');
  } else if (d > GIRO_TOL * 0.72) {
    R.ultTruco = T('casi'); R.ultTrucoT = 1.1;
  }
  R.giro = 0; R.rot = 0; R.girAp = 0; R.aire = 0;
  R.sacude = Math.min(1, Math.abs(R.vy) / 22);
  if (typeof son === 'function') son('cae');
}

/* ── CAERSE CUESTA LA VELOCIDAD, NO LA BAJADA ─────────────────────────────
   Esto era `muere()` y terminaba la partida. Lo que cobra ahora es lo unico
   que este juego administra: el cuerpo queda en el piso un segundo largo y
   se levanta a paso de hombre, o sea que un error vale los cuatro o cinco
   segundos que cuesta volver a crucero. En una bajada que no termina, ese
   tiempo ES el puntaje.

   Y SE SALE POR EL BORDE DE ENFRENTE DEL HUECO y no por el de atras: el
   salto ya se erro, y devolverlo al borde de entrada lo dejaria mirando el
   mismo hueco con la velocidad en cero — o sea sin forma de cruzarlo nunca.
   `R.dist` es un maximo, asi que el hueco no se cobra dos veces.        */
function cae(por) {
  if (R.caido > 0 || !R.vivo) return;
  R.muerte = por; R.caido = TUMBO_T;
  R.combo = 0; R.comboT = 0;
  R.cuerda = null; R.giro = 0; R.rot = 0; R.girAp = 0; R.buffer = 0; R.coyote = 0;
  const h = huecoEn(R.x);
  if (h) R.x = h.b + 1.6;
  R.y = terrY(R.x); R.suelo = true; R.ang = Math.atan(terrPend(R.x));
  R.s = TUMBO_V; R.vx = 0; R.vy = 0; R.turbo = 0; R.turboCd = 0;
  if (SIM) return;                 // en un rollout no se cuenta ni suena
  R.caidas++; R.sacude = 1;
  R.ultTruco = T('tumbo'); R.ultTrucoT = 1.4;
  if (typeof son === 'function') son('choque');
}

/* ── LA CUERDA ────────────────────────────────────────────────────────────
   Se agarra sola si el dedo esta apretado y el cuerpo pasa cerca: pedir un
   segundo gesto sobre un solo boton no se puede, y pedir punteria fina sobre
   una linea de dos pixeles tampoco. Lo que decide es el TIEMPO —estar
   apretando justo al cruzarla— que es lo mismo que decide todo lo demas. */
function buscaCuerda() {
  if (R.cuerda || !APRETADO || R.suelo) return;
  for (let i = 0; i < CUERDAS.length; i++) {
    const c = CUERDAS[i];
    if (R.x < c.x0 || R.x > c.x1) continue;
    const t = (R.x - c.x0) / (c.x1 - c.x0), cy = mezcla(c.y0, c.y1, t);
    if (Math.abs(R.y - cy) < 1.5 && R.vy < 4) {
      /* Y PIDE EL CUERPO DERECHO, IGUAL QUE EL PISO. Sin esto, el sostenido
         que gira y el sostenido que engancha son el mismo gesto en el mismo
         instante: medido, el bot se colgaba A MITAD DE VOLTERETA, salia de la
         cuerda con el giro a medio acumular y se mataba dos segundos despues
         por un angulo que nunca habia elegido. Aparte, nadie se cuelga de
         cabeza. */
      if (Math.abs(angDif(R.ang, Math.atan((c.y1 - c.y0) / (c.x1 - c.x0)))) > GIRO_TOL) continue;
      R.cuerda = c; R.cu = t; R.y = cy;
      /* el cuerpo queda alineado con la cuerda, asi que la vuelta a medias que
         traia NO se cobra: dejar `giro` puesto hace que el aterrizaje de dos
         segundos despues cuente vueltas que no se hicieron */
      R.giro = 0; R.rot = 0; R.girAp = 0;
      R.s = Math.max(R.s, Math.hypot(R.vx, R.vy));
      if (!c.usada && !SIM) { c.usada = true; R.grinds++; truco(T('grind'), 'grind'); }
      if (typeof son === 'function') son('grind');
      return;
    }
  }
}
function pasoCuerda(dt) {
  const c = R.cuerda, dx = c.x1 - c.x0, dy = c.y1 - c.y0;
  const L = Math.hypot(dx, dy), m = dy / dx, k = dx / L;
  R.s += (-G * (dy / L) - 0.010 * G * (dx / L)) * dt;   // la cuerda casi no roza
  R.s = clamp(R.s, V_MIN, V_MAX);
  R.x += R.s * k * dt;
  R.cu = (R.x - c.x0) / dx;
  R.y = mezcla(c.y0, c.y1, R.cu);
  R.vx = R.s * k; R.vy = R.s * m * k;
  R.ang = angHacia(R.ang, Math.atan(m), 1 - Math.pow(0.0000001, dt));
  R.polvo = 0;
  R.dist = Math.max(R.dist, R.x);
  terrAvanza(R.x); juntaMonedas();
  /* se suelta al llegar al final O al soltar el dedo: sin lo segundo, la
     cuerda seria una cinta transportadora y no una decision */
  if (R.cu >= 1 || !APRETADO) {
    R.cuerda = null; R.suelo = false; R.vueloX = R.x; R.vueloY = R.y; R.aire = 0;
    R.giro = 0; R.rot = 0; R.girAp = 0;   // sale alineado con la cuerda: el giro arranca de cero
  }
}

/* el radio es generoso —1,5 m contra un rider de 1,85— porque lo que tiene
   que costar es pasar por el arco, no rozar el pixel */
function juntaMonedas() {
  if (SIM) return;
  for (let i = 0; i < MONEDAS.length; i++) {
    const c = MONEDAS[i];
    if (c.ida) continue;
    if (c.x > R.x + 3) break;
    if (Math.abs(c.x - R.x) < 1.5 && Math.abs(c.y - (R.y + 0.9)) < 1.7) {
      c.ida = true; R.mons++;
      if (typeof son === 'function') son('mon');
    }
  }
}

/* ── LA ENTRADA ES UN FLANCO Y UN SOSTENIDO, Y PASA POR UN SOLO SITIO ─────
   Con la logica del boton repartida en el manejador del dedo, del teclado y
   del auto-jugador, el dia que se agregue un gesto dos de los tres se quedan
   sin el — y el que se olvida es siempre el que nadie prueba. Paso en RECREO
   con el salto del avion, que con teclado no existia.                     */
function pulsa(v) {
  if (v && !APRETADO && R.caido <= 0) {
    if (R.suelo || R.coyote > 0) { R.buffer = BUFFER; if (R.suelo) salta(); }
    else R.buffer = BUFFER;
  }
  APRETADO = v;
}

/* ── LA MANO DERECHA: UN TOQUE, UN EMPUJON ────────────────────────────────
   Y NO ES UN SOSTENIDO. Con el dedo apoyado la velocidad subiria sola hasta
   el tope y quedarse ahi seria gratis; con toques sueltos hay que gastar la
   mano, y sobre todo hay que decidir CUANDO —empujar entrando a una duna no
   es lo mismo que empujar antes de un hueco—.
   SOLO CON EL CUERPO APOYADO: `R.s` es la rapidez sobre la tangente, o sea
   que en el aire ni siquiera existe. Empujar volando alargaria el vuelo a
   voluntad y el aterrizaje dejaria de ser una apuesta.
   Devuelve si el empujon SUMO velocidad, que no es lo mismo que si se acepto
   el toque: en el tope el toque vale —la barra avisa— y no suma nada.   */
function turbo() {
  if (!R.vivo || R.caido > 0 || R.turboCd > 0) return false;
  if (!R.suelo && !R.cuerda) return false;
  R.turboCd = TURBO_CD;
  R.turbo = 1;
  if (R.s >= TURBO_TOPE) return false;
  R.s = Math.min(R.s + TURBO_IMP, TURBO_TOPE);
  R.empujes++;
  if (!SIM && typeof son === 'function') son('empuja');
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   EL AUTO-JUGADOR
   ──────────────────────────────────────────────────────────────────────────
   Existe por tres razones y ninguna es la comodidad: AUDITA el terreno —un
   mapa generado y no jugado es un mapa roto que todavia no se sabe—, corre
   DETRAS DEL MENU para que la portada muestre el juego, y es el control
   contra el que se mide si hay una decision adentro. El que aprieta al azar
   tiene que sacar mucho menos; si empatan, el juego no pide nada.

   Y APRIETA EL MISMO BOTON QUE EL DEDO: entra por `pulsa()`. Escribiendo el
   estado del rider directo estaria jugando OTRO juego, y que lo termine no
   probaria nada del que se juega.
   ══════════════════════════════════════════════════════════════════════════ */
/* SE GUARDA EL ESTADO ENTERO Y NO UNOS CAMPOS ELEGIDOS. Con una lista corta
   el rollout dejaba `flips`, `saltoMax` y `mons` contaminados —el marcador
   subia por partidas imaginarias— y eso no falla: informa numeros de mas. */
const _EST = Object.keys(R).filter(k => k !== 'cuerda');
function _guarda() { const o = { _cu: R.cuerda, _ap: APRETADO }; for (const k of _EST) o[k] = R[k]; return o; }
function _pone(o) { R.cuerda = o._cu; APRETADO = o._ap; for (const k of _EST) R[k] = o[k]; }

/* simula `n` pasos con el dedo puesto en `ap` (o siguiendo un plan) y
   devuelve si sobrevivio y cuanto avanzo. NO genera terreno: hay que haberlo
   generado antes, o el rollout consumiria numeros del azar y el mundo de
   verdad saldria distinto. Es el defecto silencioso de cualquier rollout
   sobre un mundo procedural.                                              */
function _rollout(n, ap, hastaElFinal, emp) {
  const g = _guarda(); SIM = true;
  /* EL CORTE ES "TOCO EL SUELO DESPUES DE HABER VOLADO", no "esta en el
     suelo". Con la segunda version, un rollout lanzado DESDE el suelo —que es
     el que mira si viene un hueco— cortaba en el tercer cuadro y devolvia
     `vivo:true` mirando cinco centimetros por delante: el bot no veia un solo
     hueco. Medido, seis de veinticinco muertes eran eso. */
  let vivo = true, i = 0, volo = !R.suelo, colgo = false;
  for (; i < n; i++) {
    pulsa(typeof ap === 'function' ? ap(i * PASO) : ap);
    if (emp) turbo();
    riderPaso(PASO);
    /* LO QUE CORTA UN ROLLOUT AHORA ES EL TUMBO Y NO LA MUERTE, porque ya no
       hay muerte: sin esta linea el bot no ve un solo error y toda la
       validacion del terreno aprueba cualquier cosa. */
    if (R.caido > 0) { vivo = false; break; }
    if (R.cuerda) colgo = true;
    if (!R.suelo) volo = true;
    else if (volo && i > 2 && !hastaElFinal) break;
  }
  const dx = R.x - g.x, sue = R.suelo, sal = R.s;
  SIM = false; _pone(g);
  return { vivo, dx, pasos: i, suelo: sue, s: sal, cuerda: colgo };
}

/* TRES BOTS Y NO UNO, y cada uno contesta una pregunta distinta.
   El honesto vuela doscientos pasos y prueba veinticinco duraciones por
   vuelo: es infinitamente mejor que una persona, asi que si el se muere es
   que el mapa puso algo imposible —eso es lo que valida el generador— pero
   que llegue al tope no dice nada sobre cuanto dura una partida de verdad.
   El TORPE mira lo que entra en la pantalla (65 pasos ≈ 32 m, que es lo que
   el encuadre muestra por delante), reacciona cada 0,12 s y prueba UNA
   duracion por vuelta en vez de cinco. Ese es el que mide los minutos.
   Y EL TERCERO APRIETA AL AZAR, que es el unico control honesto que hay: los
   otros dos SIMULAN EL FUTURO —vuelan doscientos pasos antes de decidir— asi
   que aunque uno mire menos lejos que el otro, los dos son mejores que
   cualquier persona. Que el torpe llegue al tope no prueba que el juego sea
   facil; lo unico que prueba que hay una decision adentro es que el que no
   decide nada saque mucho menos. Sostiene el boton tandas de duracion al azar
   y no lo toca cuadro por cuadro: apretar y soltar a sesenta hercios es un
   promedio, no un jugador, y encima no llegaria a completar una sola vuelta. */
/* Y LOS TRES APRIETAN LAS DOS ZONAS, no una. Desde que la derecha empuja, un
   bot que solo salta esta jugando OTRO juego: mediria un mundo donde la
   velocidad no se administra, o sea justo la decision que se agrego. Es la
   misma regla que ya vale para el salto — el bot entra por `pulsa()` y por
   `turbo()`, las mismas dos funciones que el dedo.                        */
const BOT = { plan: null, planT: 0, cd: 0, torpe: false, azar: false, react: 0, ap: false,
              emp: false, empT: 0 };
function botReinicia(modo) {
  BOT.plan = null; BOT.planT = 0; BOT.cd = 0; BOT.react = 0; BOT.ap = false;
  BOT.emp = false; BOT.empT = 0;
  BOT.azar = modo === 'azar';
  BOT.torpe = !BOT.azar && !!modo;
}

/* ── CUANDO EMPUJAR ───────────────────────────────────────────────────────
   El honesto NO empuja siempre, y esa es la decision: mas velocidad es mas
   alcance de salto y menos tiempo para reaccionar, asi que empujar contra un
   hueco ancho es bueno y empujar contra una cresta con un hueco corto detras
   te manda de cabeza. Se decide con el MISMO rollout que decide el salto, con
   `emp` puesto: si volar cien pasos empujando sobrevive, se empuja.
   Y SE PREGUNTA CADA 0,2 s Y NO POR CUADRO: un rollout de cien pasos por
   cuadro son seis mil pasos de fisica por segundo de mas, y la respuesta no
   cambia en dieciseis milesimas.
   El torpe empuja a su cadencia de reaccion sin mirar nada —que es lo que
   hace alguien que quiere ir rapido— y el del azar, al azar.              */
function botEmpuja(dt) {
  if (!R.vivo || R.caido > 0) return false;
  if (BOT.azar) return Math.random() < 0.30;
  if (BOT.torpe) return true;
  BOT.empT -= dt;
  if (BOT.empT > 0) return BOT.emp;
  BOT.empT = 0.20;
  if (R.s >= TURBO_TOPE - 0.05) { BOT.emp = false; return false; }
  const r = _rollout(110, false, true, true);
  BOT.emp = r.vivo;
  return BOT.emp;
}

/* EL PLAN SE DECIDE AL DESPEGAR Y NO EN CADA CUADRO: cuantas vueltas entran
   en el vuelo es una propiedad del vuelo entero, no del instante. Decidido
   cuadro a cuadro, el bot suelta y vuelve a apretar y las vueltas no cierran
   nunca — que es exactamente lo que le pasa a alguien que duda.           */
function botPiensa(dt) {
  if (!R.vivo) return false;
  if (BOT.azar) {
    terrGenera(R.x + 420);
    BOT.react -= dt;
    if (BOT.react <= 0) { BOT.react = 0.12 + Math.random() * 0.55; BOT.ap = Math.random() < 0.38; }
    return BOT.ap;
  }
  terrGenera(R.x + 420);   // GENERA, no poda: podar contra este numero borraria el mundo de adelante          // el rollout necesita el mundo ya generado
  if (R.cuerda) { BOT.plan = null; return true; }   // colgado: no soltar hasta el final

  if (!R.suelo) {
    if (BOT.plan === null) {
      /* de mas vueltas a menos: se queda con la mayor que sobreviva */
      /* TRES DURACIONES POR VUELTA Y NO UNA. El angulo que se acumula no es
         `GIRO_V·dur` exacto —hay arranque y hay cola— asi que la formula da
         una estimacion y el rollout es el que decide. Probando una sola, un
         error de cinco centesimas tira la vuelta entera. */
      const VAR = BOT.torpe ? [0] : [0, -0.055, 0.055, -0.11, 0.11];
      for (let k = BOT.torpe ? 2 : 4; k >= 0 && BOT.plan === null; k--) {
        /* + LA ESPERA: sin sumarla la estimacion queda 0,14 s corta y las
           variantes (±0,11) no la alcanzan — el bot cerraria CERO vueltas */
        const d0 = k === 0 ? 0 : GIRO_ESPERA + (k * Math.PI * 2) / GIRO_V;
        for (const e of VAR) {
          const dur = Math.max(0, d0 + e);
          const r = _rollout(200, t => t < dur);
          if (r.vivo && r.suelo) { BOT.plan = dur; break; }
        }
      }
      if (BOT.plan === null) BOT.plan = 0;
      BOT.planT = 0;
    }
    /* SE COMPARA Y DESPUES SE SUMA, no al reves. El rollout aprieta en
       i*PASO con i desde CERO; sumando primero, la linea real evaluaba el
       cuadro de la decision como t=dt y apretaba UN PASO MENOS. Un paso son
       0,14 rad y la tolerancia son 0,62: medido, cuatro de las cinco muertes
       que le quedaban al bot eran esa unica diferencia — el rollout aprobaba
       una duracion que la realidad no ejecutaba. Un plan validado por una
       simulacion que no aprieta en los mismos cuadros no esta validado. */
    const ap = BOT.planT < BOT.plan;
    BOT.planT += dt;
    return ap;
  }

  BOT.plan = null;
  /* EN EL SUELO SE SALTA LO MAS TARDE POSIBLE QUE TODAVIA FUNCIONE, que es
     lo que hace un humano: si esperando un cuadro mas se sigue vivo, se
     espera. Con "salto apenas veo el hueco" el despegue sale temprano y se
     cae del otro lado — el mismo defecto que en DASH costo los huecos. */
  BOT.cd -= dt;
  if (BOT.cd > 0) return false;
  /* el torpe no piensa todos los cuadros: 0,12 s es un tiempo de reaccion */
  if (BOT.torpe) { BOT.react -= dt; if (BOT.react > 0) return false; BOT.react = 0.12; }
  /* Y ESTE NO CORTA AL ATERRIZAR. El corte de arriba responde "sobrevivo a
     ESTE aterrizaje", que es la pregunta del que ya esta en el aire; el que
     esta en el suelo pregunta otra cosa —"viene algo"— y con el corte puesto
     su horizonte terminaba en la primera duna que lo despegara: medido,
     cuatro de veinticinco muertes eran un hueco que quedaba justo detras de
     una cresta. */
  /* el horizonte del torpe es LO QUE LA CAMARA MUESTRA, en pasos: lo que ve
     por delante dividido por lo que avanza en un paso */
  const hor = BOT.torpe
    ? Math.round((VISTA_ANCHO * (1 - RIDER_X) + CAM_ADEL * R.s) / Math.max(R.s * PASO, 0.01))
    : 150;
  const sinSaltar = _rollout(Math.min(hor, 150), false, true);
  if (!sinSaltar.vivo) {
    const saltando = _rollout(200, t => t < 0.05, true);
    if (saltando.vivo) { BOT.cd = 0.14; return true; }
    return false;                  // no hay salto que salve: se cae, y esta bien que se sepa
  }
  /* LA CUERDA HAY QUE IR A BUSCARLA, y esta rama no es para que el bot luzca:
     es lo unico que COMPRUEBA que una cuerda se puede alcanzar. Un mecanismo
     que el generador siembra y que ninguna prueba engancha es un mecanismo que
     nadie sabe si existe. Va antes que la del truco porque colgarse tambien
     paga y encima cruza el tramo entero. */
  for (let i = 0; i < CUERDAS.length; i++) {
    const c = CUERDAS[i];
    if (c.usada || c.x0 < R.x + 4) continue;
    if (c.x0 > R.x + 90) break;
    const r = _rollout(200, t => t < 0.05, true);
    if (r.cuerda && r.vivo) { BOT.cd = 0.14; return true; }
    break;                         // solo se mira la proxima: la de mas alla ya se vera
  }

  /* SOBREVIVIR NO ALCANZA: un bot que solo esquiva huecos se ve como una
     bola rodando, y el menu lo muestra. Cada tanto prueba si saltando entra
     una voltereta —o sea si el vuelo dura mas que una vuelta— y si entra y
     sobrevive, salta. Eso es lo que hace un jugador: saltar por gusto. */
  BOT.cd = 0.30;
  const pr = _rollout(200, t => t < 0.05);
  if (!pr.vivo || pr.pasos * PASO < (Math.PI * 2) / GIRO_V + GIRO_ESPERA) return false;
  return true;
}
