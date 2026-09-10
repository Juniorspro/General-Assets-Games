
/* ══════════════════════════════════════════════════════════════════════════
   HUD, PANELES, IDIOMA Y OBJETIVOS
   ──────────────────────────────────────────────────────────────────────────
   LOS OBJETIVOS SON EL JUEGO LARGO. Sin ellos esto es un contador de metros
   que sube: una partida de tres minutos se juega dos veces y se cierra. Con
   tres metas a la vista, cada corrida termina con algo a medio hacer, y eso
   es lo que hace que la siguiente arranque sola.

   TRES A LA VEZ Y NO SEIS, y no es por espacio: seis metas se leen como una
   lista de tareas y ninguna se persigue. Tres se recuerdan.

   Y SUBEN DE ESCALON, no se terminan. Cada objetivo tiene seis metas cada vez
   mas grandes; al cumplir una, ese objetivo se va al fondo de la cola y entra
   otro. Asi la lista nunca queda vacia y la dificultad la pone el jugador.  */

const $ = s => document.getElementById(s);
const D_CLAVE = 'duna_v1';

const GUARDA = { idi: '', cal: 1, rec: 0, mon: 0, tuto: 0, niv: {}, ac: { grinds: 0 } };
function guardaLee() {
  try {
    const s = JSON.parse(localStorage.getItem(D_CLAVE) || '{}');
    if (s && typeof s === 'object') {
      if (s.idi) GUARDA.idi = s.idi;
      if (typeof s.cal === 'number') GUARDA.cal = clamp(s.cal | 0, 0, 2);
      GUARDA.rec = s.rec | 0; GUARDA.mon = s.mon | 0; GUARDA.tuto = s.tuto | 0;
      GUARDA.niv = s.niv || {}; GUARDA.ac = s.ac || { grinds: 0 };
    }
    /* EL TUTORIAL SE VE CADA VEZ QUE SE ABRE EL JUEGO, y por eso la marca
       NO SOBREVIVE A UNA RECARGA. Pedido textual: «cada vez que inicie en
       cada juego, siempre hay un tutorial». Se pone en cero DESPUES de leer
       el disco, asi que sigue valiendo DENTRO de la sesion —terminado una
       vez, no vuelve a dispararse entre partida y partida— y lo unico que
       se pierde es que un jugador viejo se lo saltee de entrada. Es el
       unico dato del guardado que se descarta a proposito: el resto
       —idioma, niveles, monedas, ajustes— sigue igual.                   */
    GUARDA.tuto = 0;
  } catch (e) { /* ventana privada: se juega igual, no se guarda */ }
  OBJS.forEach(o => { if (typeof GUARDA.niv[o.id] !== 'number') GUARDA.niv[o.id] = 0; });
  if (typeof GUARDA.ac.grinds !== 'number') GUARDA.ac.grinds = 0;
}
function guardaEscribe() {
  try { localStorage.setItem(D_CLAVE, JSON.stringify(GUARDA)); } catch (e) {}
}

/* ── LOS TRES ACTIVOS ─────────────────────────────────────────────────────
   Los tres de nivel mas bajo. Con eso, el que acaba de completarse se va
   solo al fondo sin ninguna lista aparte que mantener, y un objetivo agotado
   (nivel 6) nunca vuelve a salir. */
function objActivos() {
  return OBJS
    .map((o, i) => ({ o, i, n: GUARDA.niv[o.id] }))
    .filter(a => a.n < a.o.m.length)
    .sort((a, b) => (a.n - b.n) || (a.i - b.i))
    .slice(0, 3)
    .map(a => a.o);
}
function objMeta(o) { return o.m[Math.min(GUARDA.niv[o.id], o.m.length - 1)]; }
function objValor(o) {
  /* EN EL MENU CORRE LA DEMO, Y LA DEMO NO ES EL JUGADOR. Sin esta guarda la
     barra de «baja 400 metros DE UNA» sube sola mientras nadie esta jugando
     —medido en la captura del menu: 13,6/400 a los dos segundos de abrir—.
     Lo que se acumula ENTRE corridas si se muestra: no depende de que haya
     una corrida en curso. */
  const v = DEMO ? 0 : (R[o.c] || 0);
  return o.acum ? GUARDA.ac.grinds + v : v;
}
function objTexto(o) { return T(o.k, objMeta(o)); }

let OBJ_HECHOS = [];       // los completados en ESTA corrida, para la pantalla del final
function objPaso() {
  if (PANT !== 'juego') return;
  const act = objActivos();
  for (let i = 0; i < act.length; i++) {
    const o = act[i];
    if (objValor(o) >= objMeta(o)) {
      GUARDA.niv[o.id]++;
      OBJ_HECHOS.push(T(o.k, o.m[GUARDA.niv[o.id] - 1]));
      guardaEscribe();
      son('obj');
      avisa(T('ok'), OBJ_HECHOS[OBJ_HECHOS.length - 1]);
    }
  }
}

/* ── EL HUD ───────────────────────────────────────────────────────────────
   Se escribe SOLO CUANDO CAMBIA. Escribir en el DOM cada cuadro obliga al
   navegador a recalcular la maqueta sesenta veces por segundo para poner el
   mismo texto, y con el marco girado eso se paga entero.                  */
const HUD = { pts: -1, mon: -1, truco: '', pista: null };
function hudPaso() {
  const m = Math.floor(R.dist);
  if (m !== HUD.pts) { HUD.pts = m; $('pts').textContent = m; }
  if (R.mons !== HUD.mon) { HUD.mon = R.mons; $('monN').textContent = R.mons; }

  const t = R.ultTrucoT > 0 ? R.ultTruco : '';
  if (t !== HUD.truco) {
    HUD.truco = t;
    const e = $('truco');
    if (t) {
      const p = t.split('\n');
      e.innerHTML = p.length > 1 ? p[1] + '<b>' + p[0] + '</b>' : p[0];
      e.classList.add('on');
    } else e.classList.remove('on');
  }
  const pi = PANT === 'juego' && SALTOS === 0 && R.dist < 120;
  if (pi !== HUD.pista) { HUD.pista = pi; $('pista').classList.toggle('on', pi); }
}
/* el aviso reusa el cartel del truco: es el mismo sitio, el mismo tamano y la
   misma vida corta. Un segundo cartel para decir "objetivo hecho" seria otro
   elemento que puede solaparse con este, y se solapan siempre. */
function avisa(a, b) {
  R.ultTruco = a + '\n' + b; R.ultTrucoT = 2.2; HUD.truco = null;
}

/* ── EL TUTORIAL VISUAL ───────────────────────────────────────────────────
   TRES PASOS Y CADA UNO ESPERA A QUE LA COSA PASE, no a que se lea un cartel.
   Un tutorial que se pasa leyendo se saltea, y lo que se saltea es
   exactamente lo que despues no se entiende. Es la regla que ya ordeno el de
   ECO y el de RECREO.

   Y LO QUE SE MIRA ES EL RESULTADO Y NO EL BOTON. El paso de la voltereta
   espera a que se ATERRICE una —o sea a `R.flips`— y no a que se mantenga el
   dedo: enganchado al boton, el paso se aprobaria manteniendo apretado en el
   suelo, que es justo lo que no ensena. Enganchado al contador, aprobarlo es
   haberlo hecho.

   SE DIBUJA EN EL LIENZO Y NO EN EL DOM porque lo que hay que mostrar es
   DONDE tocar: dos mitades de pantalla con su circulo latiendo. Un cartel de
   texto puede decir «izquierda» y no senala nada.                         */
const TUTO = { on: false, paso: 0, t: 0, fin: 0, s0: 0, f0: 0, e0: 0 };
/* EL ORDEN ES SALTAR · EMPUJAR · VOLTERETA, y no el que uno escribiria.
   Una voltereta entera son 0,73 s de giro y el vuelo dura 1,10 s A CRUCERO:
   despacio el salto es mas corto que el giro y la voltereta es IMPOSIBLE por
   construccion, no por dificultad. Y fallarla cuesta un tumbo, o sea menos
   velocidad todavia. Medido con la voltereta en segundo lugar, el auto-jugador
   se quedaba trabado ahi con la velocidad en CERO. Pidiendo primero los
   empujones, cuando llega la voltereta ya hay con que darla. */
const TUTO_PASOS = ['tu1', 'tu3', 'tu2'];

function tutoReinicia(demo) {
  TUTO.on = false; TUTO.fin = 0; TUTO.t = 0; tutoClase();
  if (demo) return;
  /* LA PRIMERA CORRIDA DE CADA SESION LO ABRE SOLA. Antes era la primera
     corrida a secas —«visto cinco veces deja de ser un tutorial y pasa a
     ser un peaje», la leccion de POMPOM— y el usuario pidio lo contrario
     con todas las letras: «cada vez que inicie en cada juego, siempre hay
     un tutorial». Lo que queda de aquella regla es que DENTRO de la sesion
     no vuelve: `GUARDA.tuto` se pone en 1 al terminarlo o saltearlo y lo
     unico que lo devuelve a cero es abrir el juego de nuevo. Y el boton
     del menu sigue estando, para verlo cuando uno quiere.               */
  if (!GUARDA.tuto) tutoArranca(false);
}
/* UN SOLO SITIO PRENDE Y APAGA LA CLASE del boton de saltear: con una
   llamada por camino —arranca, termina, saltea, cambio de pantalla— el que
   se olvide deja el boton puesto en el medio de una partida sin tutorial. */
function tutoClase() {
  document.body.classList.toggle('tuto', TUTO.on && PANT === 'juego');
}
function tutoArranca(forz) {
  TUTO.on = true; TUTO.paso = 0; TUTO.t = 0; TUTO.fin = 0;
  TUTO.s0 = SALTOS; TUTO.f0 = R.flips; TUTO.e0 = R.empujes;
  if (forz) { GUARDA.tuto = 0; guardaEscribe(); }
  tutoClase();
}
function tutoTermina() {
  TUTO.on = false; TUTO.fin = 2.4;
  GUARDA.tuto = 1; guardaEscribe(); tutoClase();
}
function tutoSaltea() {
  if (!TUTO.on) return;
  TUTO.fin = 0; TUTO.on = false; GUARDA.tuto = 1; guardaEscribe(); tutoClase();
}

/* ── LO QUE SE DIBUJA ─────────────────────────────────────────────────────
   Va en el LIENZO y en unidades del marco (el contexto ya viene con la
   densidad puesta), asi que nada de esto pide una escritura al DOM por
   cuadro — que con el marco girado se paga entera.                       */
function tutoCirculo(cx, cy, r, k, col) {
  const g = 0.5 + 0.5 * Math.sin(k * Math.PI * 2);
  ctx.save();
  ctx.strokeStyle = col; ctx.globalAlpha = 0.30 + 0.45 * g;
  ctx.lineWidth = Math.max(2, r * 0.10);
  ctx.beginPath(); ctx.arc(cx, cy, r * (0.72 + 0.28 * g), 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.10 + 0.14 * g;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = col; ctx.fill();
  ctx.restore();
}
function pintaTuto() {
  if (!TUTO.on && TUTO.fin <= 0) return;
  const mh = ALTO, cy = ALTO * 0.56;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  if (TUTO.on) {
    /* la linea del medio: es lo unico que dice que la pantalla esta partida */
    ctx.save();
    ctx.setLineDash([6, 10]); ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.moveTo(ANCHO / 2, ALTO * 0.20); ctx.lineTo(ANCHO / 2, ALTO * 0.94); ctx.stroke();
    ctx.restore();

    /* QUE ZONA SE ENCIENDE SALE DE LA CLAVE DEL PASO Y NO DE SU INDICE:
       atado al indice, reordenar los pasos —que es justo lo que se acaba de
       hacer— deja el circulo pulsando en la mitad equivocada de la pantalla
       sin que nada falle. */
    const emp = TUTO_PASOS[TUTO.paso] === 'tu3';
    const izq = emp, r = mh * 0.085, k = (TIEMPO * 1.1) % 1;
    const cx = izq ? ANCHO * 0.25 : ANCHO * 0.75;
    /* el color va con el TRABAJO y no con el lado: el ambar es empujar y el
       celeste saltar en los tres pasos, asi que dar vuelta las zonas no da
       vuelta lo que el jugador ya aprendio a reconocer */
    const col = emp ? '#ffe6b8' : '#9fe6ff';
    tutoCirculo(cx, cy, r, k, col);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = col;
    ctx.font = '700 ' + Math.round(clamp(mh * 0.030, 9, 14)) + 'px monospace';
    ctx.fillText(T(emp ? 'tempuja' : 'tsalta'), cx, cy + r * 1.75);
    /* Y EL PASO 3 MUESTRA CUANTOS TOQUES VAN: un «toca rapido» sin cuenta no
       dice cuando esta hecho, y entonces el paso parece trabado. */
    if (emp) {
      const n = clamp(R.empujes - TUTO.e0, 0, 4);
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(cx - r * 0.9 + i * r * 0.6, cy + r * 2.55, r * 0.14, 0, Math.PI * 2);
        ctx.globalAlpha = i < n ? 0.95 : 0.28; ctx.fill();
      }
    }
  }

  /* el renglon: abajo, sobre su propia franja, porque tiene que leerse igual
     sobre la arena clara del mediodia y sobre la noche */
  const a = TUTO.on ? 1 : clamp(TUTO.fin / 0.8, 0, 1);
  const txt = TUTO.on ? T(TUTO_PASOS[TUTO.paso]) : T('tu4');
  const fs = Math.round(clamp(mh * 0.036, 10, 17));
  ctx.font = '800 ' + fs + 'px monospace';
  const w = ctx.measureText(txt).width + fs * 2.2, y = ALTO * 0.86;
  ctx.globalAlpha = 0.62 * a;
  ctx.fillStyle = '#080a10';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(ANCHO / 2 - w / 2, y - fs * 1.1, w, fs * 2.2, fs);
  else ctx.rect(ANCHO / 2 - w / 2, y - fs * 1.1, w, fs * 2.2);
  ctx.fill();
  ctx.globalAlpha = a; ctx.fillStyle = '#fff';
  ctx.fillText(txt, ANCHO / 2, y);
  ctx.restore();
}

/* ── LA BARRA DE VELOCIDAD ────────────────────────────────────────────────
   EL TOPE TIENE QUE VERSE O NO ES UN TOPE. Empujar contra un limite invisible
   se lee a que el boton dejo de funcionar; con la marca puesta se lee a que
   se llego. Y la barra existe porque desde esta vuelta la velocidad es lo que
   se administra: es la unica moneda del juego —un tumbo la cobra— asi que
   tiene que estar a la vista.
   Va en el lienzo y no en el DOM: cambia sesenta veces por segundo y escribir
   un ancho en CSS por cuadro obliga a recalcular la maqueta cada vez.     */
function pintaBarra() {
  if (PANT !== 'juego' && PANT !== 'pausa') return;
  const mh = ALTO, w = ANCHO * 0.34, h = Math.max(4, mh * 0.016);
  const x = (ANCHO - w) / 2, y = mh * 0.205;
  const v = clamp((R.s - V_MIN) / (V_MAX - V_MIN), 0, 1);
  const tp = clamp((TURBO_TOPE - V_MIN) / (V_MAX - V_MIN), 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.55; ctx.fillStyle = '#0a0c12';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2); else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.globalAlpha = 0.92;
  /* el color dice el estado: ambar mientras se empuja, cian pasado el tope
     —eso ultimo solo pasa cayendo de una duna, o sea que el cian es «esto es
     regalado y no se puede sostener»— y crema el resto */
  ctx.fillStyle = R.s > TURBO_TOPE + 0.2 ? '#9fe6ff' : (R.turbo > 0.05 ? '#ffd08a' : '#e6dcc6');
  ctx.beginPath();
  const wv = Math.max(h, w * v);
  if (ctx.roundRect) ctx.roundRect(x, y, wv, h, h / 2); else ctx.rect(x, y, wv, h);
  ctx.fill();
  ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff';
  ctx.fillRect(x + w * tp - 1, y - h * 0.45, 2, h * 1.9);
  ctx.restore();
}

function tutoPaso(dt) {
  if (TUTO.fin > 0) TUTO.fin -= dt;
  if (!TUTO.on) return;
  TUTO.t += dt;
  const p = TUTO.paso;
  const hecho = p === 0 ? SALTOS > TUTO.s0
              : p === 1 ? R.empujes >= TUTO.e0 + 4
              : R.flips > TUTO.f0;
  if (!hecho) return;
  TUTO.paso++; TUTO.t = 0;
  son('obj');
  if (TUTO.paso >= TUTO_PASOS.length) tutoTermina();
}

/* ── LOS PANELES ──────────────────────────────────────────────────────────
   Uno solo encendido, y el estado vive en UNA variable. Con una bandera por
   panel, dos pueden quedar prendidos a la vez y eso no falla: se ve. */
let PANT = 'idioma';
const PANELES = { idioma: 'pIdioma', menu: 'pMenu', pausa: 'pPausa', fin: 'pFin', juego: null };
function verPantalla(p) {
  PANT = p;
  for (const k in PANELES) if (PANELES[k]) $(PANELES[k]).classList.toggle('on', k === p);
  document.body.classList.toggle('jugando', p === 'juego');
  tutoClase();
  if (p === 'menu') pintaMenu();
}

function pintaIdioma() {
  $('iSub').textContent = T('idi');
  const c = $('iBotones'); c.innerHTML = '';
  [['es', 'CASTELLANO'], ['en', 'ENGLISH'], ['pt', 'PORTUGUÊS']].forEach(([k, n]) => {
    const b = document.createElement('button');
    b.className = 'b s'; b.textContent = n;
    b.onclick = () => { IDIOMA = k; GUARDA.idi = k; guardaEscribe(); pintaTodo(); verPantalla('menu'); son('ui'); };
    c.appendChild(b);
  });
}

function pintaObjs(cont, lista) {
  cont.innerHTML = '';
  lista.forEach(o => {
    const d = document.createElement('div');
    const hecho = typeof o === 'string';
    d.className = 'ob' + (hecho ? ' ok' : '');
    const txt = hecho ? o : objTexto(o);
    /* REDONDEADO: `R.dist` son metros en coma flotante y la ficha salia
       «13.600992165146787/400». Todos los contadores de este juego son
       cuentas —metros, monedas, volteretas— asi que el decimal no informa
       nada y rompe el renglon. */
    const val = hecho ? '' : Math.floor(Math.min(objValor(o), objMeta(o))) + '/' + objMeta(o);
    d.innerHTML = '<u></u><span>' + txt + '</span>' + (val ? '<s>' + val + '</s>' : '');
    cont.appendChild(d);
  });
}

function pintaMenu() {
  $('mSub').textContent = T('msub');
  $('mJugar').textContent = T('jugar');
  $('mTuto').textContent = T('tuto');
  $('mTitObj').textContent = T('obj');
  $('mTitCal').textContent = T('cal');
  $('mTitIdi').textContent = T('idio');
  $('mPie').textContent = T('pie');
  $('mRec').textContent = T('rec', GUARDA.rec);
  $('mMon').textContent = T('mon', GUARDA.mon);
  pintaObjs($('obj'), objActivos());

  const cal = $('mCal'); cal.innerHTML = '';
  ['baja', 'media', 'alta'].forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'ch' + (CAL === i ? ' sel' : ''); b.textContent = T(n);
    /* SE APLICA EN CALIENTE. Un ajuste que pide recargar la pagina no se
       prueba: el jugador lo toca una vez, no ve nada y no vuelve. */
    b.onclick = () => { CAL = i; GUARDA.cal = i; guardaEscribe(); ajustaMarco(); pintaMenu(); son('ui'); };
    cal.appendChild(b);
  });
  const idi = $('mIdi'); idi.innerHTML = '';
  [['es', 'ES'], ['en', 'EN'], ['pt', 'PT']].forEach(([k, n]) => {
    const b = document.createElement('button');
    b.className = 'ch' + (IDIOMA === k ? ' sel' : ''); b.textContent = n;
    b.onclick = () => { IDIOMA = k; GUARDA.idi = k; guardaEscribe(); pintaTodo(); son('ui'); };
    idi.appendChild(b);
  });
}

function pintaPausa() {
  $('paTit').textContent = T('pausa');
  $('paSeguir').textContent = T('seguir');
  $('paTerm').textContent = T('term');
  $('paMenu').textContent = T('menu');
  $('paPie').textContent = T('papie');
}

function pintaFin(nuevo) {
  $('fTit').textContent = nuevo ? T('nuevo') : T('fin');
  $('fSub').textContent = T('finS', Math.floor(R.dist));
  $('fDatos').textContent = T('fdatos', Math.floor(R.dist), R.mons, R.trucos, R.caidas);
  $('fOtra').textContent = T('otra');
  $('fMenu').textContent = T('menu');
  pintaObjs($('objF'), OBJ_HECHOS.length ? OBJ_HECHOS : objActivos());
}

/* un solo sitio repinta TODO: con una llamada por panel, cambiar de idioma en
   la pausa deja el menu en el idioma anterior hasta la proxima vez que se
   arme. Es el defecto que costo 107 claves en Z Force. */
function pintaTodo() {
  $('sub').textContent = T('sub');
  $('pista').textContent = T('pista');
  $('tSalt').textContent = T('tsalt');
  pintaIdioma(); pintaMenu(); pintaPausa();
  if (PANT === 'fin') pintaFin(false);
  HUD.truco = null; HUD.pts = -1; HUD.mon = -1;
}
