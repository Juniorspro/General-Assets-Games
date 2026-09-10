
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

const GUARDA = { idi: '', cal: 1, rec: 0, mon: 0, niv: {}, ac: { grinds: 0 } };
function guardaLee() {
  try {
    const s = JSON.parse(localStorage.getItem(D_CLAVE) || '{}');
    if (s && typeof s === 'object') {
      if (s.idi) GUARDA.idi = s.idi;
      if (typeof s.cal === 'number') GUARDA.cal = clamp(s.cal | 0, 0, 2);
      GUARDA.rec = s.rec | 0; GUARDA.mon = s.mon | 0;
      GUARDA.niv = s.niv || {}; GUARDA.ac = s.ac || { grinds: 0 };
    }
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
  const v = R[o.c] || 0;
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

/* ── LOS PANELES ──────────────────────────────────────────────────────────
   Uno solo encendido, y el estado vive en UNA variable. Con una bandera por
   panel, dos pueden quedar prendidos a la vez y eso no falla: se ve. */
let PANT = 'idioma';
const PANELES = { idioma: 'pIdioma', menu: 'pMenu', pausa: 'pPausa', fin: 'pFin', juego: null };
function verPantalla(p) {
  PANT = p;
  for (const k in PANELES) if (PANELES[k]) $(PANELES[k]).classList.toggle('on', k === p);
  document.body.classList.toggle('jugando', p === 'juego');
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
    const val = hecho ? '' : Math.min(objValor(o), objMeta(o)) + '/' + objMeta(o);
    d.innerHTML = '<u></u><span>' + txt + '</span>' + (val ? '<s>' + val + '</s>' : '');
    cont.appendChild(d);
  });
}

function pintaMenu() {
  $('mSub').textContent = T('msub');
  $('mJugar').textContent = T('jugar');
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
  $('paMenu').textContent = T('menu');
  $('paPie').textContent = T('papie');
}

function pintaFin(nuevo) {
  $('fTit').textContent = nuevo ? T('nuevo') : T('fin');
  $('fSub').textContent = T('finS', Math.floor(R.dist));
  $('fDatos').textContent = T('fdatos', Math.floor(R.dist), R.mons, R.trucos);
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
  pintaIdioma(); pintaMenu(); pintaPausa();
  if (PANT === 'fin') pintaFin(false);
  HUD.truco = null; HUD.pts = -1; HUD.mon = -1;
}
