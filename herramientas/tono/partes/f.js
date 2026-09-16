/* ══════════════════════ EL JUEGO ARMADO ══════════════════════
   Entrada, reloj, pantallas e idioma. Nada de esto decide qué suena: eso vive
   en d.js. Acá se junta el dedo con el panel y el panel con la pantalla. */

const $ = s => document.querySelector(s);
const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));

let LANG = 'en', PANT = 'idioma', CARGANDO = false;
function TT(k){ return (TXT[LANG] || TXT.en)[k] || (TXT.es[k] || k); }
function LI(){ return LANG === 'es' ? 0 : LANG === 'en' ? 1 : 2; }

/* ══════════ PANTALLAS ══════════ */
const PANS = { idioma: '#pIdioma', menu: '#pMenu', ajustes: '#pAjustes',
               instr: '#pInstr', fin: '#pFin' };

function verPantalla(p){
  PANT = p;
  for (const k in PANS) $(PANS[k]).classList.toggle('on', k === p);
  const enJuego = (p === 'panel');
  $('#hudTop').style.display = enJuego ? 'flex' : 'none';
  document.body.classList.toggle('jugando', enJuego && JU.on);
  if (!enJuego){ dedosSoltar(); }
}

let AVT = 0;
function avisa(t, seg){
  const e = $('#avPanel');
  if (!t){ e.classList.remove('on'); AVT = 0; return; }
  e.textContent = t; e.classList.add('on'); AVT = seg === undefined ? 2.2 : seg;
}

/* ══════════ IDIOMA ══════════ */
function ponIdioma(l){
  LANG = (l === 'es' || l === 'en' || l === 'pt') ? l : 'en';
  guarda('lang', LANG);
  document.documentElement.lang = LANG;
  pintaIdioma();
}
function pintaIdioma(){
  $('#iSub').textContent = TT('sub');
  $('#mSub').textContent = TT('sub');
  $('#bLibre').textContent = TT('libre');
  $('#bJuego').textContent = TT('juego');
  $('#bAjustes').textContent = TT('ajustes');
  $('#mPie').textContent = TT('pie') + ' ' + TT('pie2');
  $('#mCred').textContent = TT('credito');
  $('#aTit').textContent = TT('ajustes');
  $('#aSon').textContent = TT('sonido');
  $('#aLib').textContent = TT('sinred');
  $('#aNota').textContent = TT('notaEsc');
  $('#aEsc').textContent = TT('escala');
  $('#aTono').textContent = TT('tono');
  $('#aOct').textContent = TT('octavas');
  $('#aIdi').textContent = TT('idioma');
  $('#bVerInstr').textContent = TT('ver');
  $('#bCerrarCfg').textContent = TT('volver');
  $('#nTit').textContent = TT('instrumento');
  $('#bCerrarInstr').textContent = TT('volver');
  $('#bOtra').textContent = TT('otra');
  $('#bAlMenu').textContent = TT('menu');
  $('#fTit').textContent = TT('fin');
  pintaAjustes(); pintaInstr(); pintaTInst(); pintaJuego();
}
function pintaTInst(){
  const I = instAct();
  $('#tInst').textContent = I.nom ? I.nom[LI()] : PAN.inst;
}

/* ══════════ AJUSTES ══════════
   ── LO QUE SE GUARDA PASA POR UNA SOLA PUERTA ──
   Con el `setItem` adentro de cada manejador, el ajuste se guarda sólo por ese
   camino y cambiar el mismo valor desde otro lado no sobrevive a una recarga.
   Ya costó una vuelta en CUBOS. */
function ponEsc(i){ PAN.esc = ((i % ESCALAS.length) + ESCALAS.length) % ESCALAS.length; guarda('esc', PAN.esc); pintaAjustes(); }
function ponTono(i){ PAN.tono = ((i % 12) + 12) % 12; guarda('tono', PAN.tono); pintaAjustes(); }
function ponOct(n){ PAN.oct = cl(n, 1, 3); guarda('oct', PAN.oct); pintaAjustes(); }
function ponSon(v){ sonidoOn(v); guarda('son', v ? 1 : 0); pintaAjustes(); }
function ponLibre(v){ dedosSoltar(); PAN.libre = !!v; guarda('libre', v ? 1 : 0); pintaAjustes(); }
function ponInst(id){
  if (!POR_ID[id]) return;
  dedosSoltar();
  PAN.inst = id; guarda('inst', id);
  pintaTInst(); pintaInstr();
  cargaInstr(id).then(() => { if (PANT === 'instr') pico(id, midiDeIdx(Math.floor(nGrados()/2)), 0.6, 0.7); });
}

function chip(txt, sel, fn){
  const b = document.createElement('button');
  b.className = 'op' + (sel ? ' sel' : ''); b.textContent = txt;
  b.addEventListener('click', fn);
  return b;
}
function paso(el, txt, menos, mas){
  el.innerHTML = '';
  el.appendChild(chip('‹', false, menos));
  const m = document.createElement('div');
  m.className = 'op sel'; m.style.minWidth = '38%'; m.textContent = txt;
  el.appendChild(m);
  el.appendChild(chip('›', false, mas));
}
function pintaAjustes(){
  const s = $('#oSon'); s.innerHTML = '';
  s.appendChild(chip('ON', SON_ON, () => ponSon(true)));
  s.appendChild(chip('OFF', !SON_ON, () => ponSon(false)));
  const l = $('#oLib'); l.innerHTML = '';
  l.appendChild(chip(TT('si'), PAN.libre, () => ponLibre(true)));
  l.appendChild(chip(TT('no'), !PAN.libre, () => ponLibre(false)));
  paso($('#oEsc'), escAct().n[LI()], () => ponEsc(PAN.esc - 1), () => ponEsc(PAN.esc + 1));
  paso($('#oTono'), NOTA_NOM[PAN.tono], () => ponTono(PAN.tono - 1), () => ponTono(PAN.tono + 1));
  const o = $('#oOct'); o.innerHTML = '';
  for (const n of [1, 2, 3]) o.appendChild(chip(String(n), PAN.oct === n, () => ponOct(n)));
  const i = $('#oIdi'); i.innerHTML = '';
  for (const q of ['es', 'en', 'pt']) i.appendChild(chip(q.toUpperCase(), LANG === q, () => ponIdioma(q)));
}

/* ══════════ EL SELECTOR DE INSTRUMENTO ══════════ */
let FAM = 0;
function pintaInstr(){
  const p = $('#pestanas'); p.innerHTML = '';
  FAMS.forEach((f, k) => p.appendChild(chip(f[1][LI()], FAM === k, () => { FAM = k; pintaInstr(); })));
  const l = $('#lista'); l.innerHTML = '';
  const fam = FAMS[FAM][0];
  for (const I of INSTRS){
    if (I.fam !== fam) continue;
    const b = document.createElement('button');
    b.className = 'ins' + (I.id === PAN.inst ? ' sel' : '');
    const n = document.createElement('span'); n.textContent = I.nom[LI()];
    const s = document.createElement('small'); s.textContent = I.sost ? '~' : '·';
    b.appendChild(n); b.appendChild(s);
    b.addEventListener('click', () => ponInst(I.id));
    l.appendChild(b);
  }
}

/* ══════════ EL HUD DE REPETÍ ══════════ */
function pintaJuego(){
  if (!JU.on) return;
  const f = JU.fase;
  $('#jFase').textContent = f === 'muestra' ? TT('escuchá') : f === 'turno' ? TT('repetí')
                          : f === 'bien' ? TT('listo') : f === 'fin' ? TT('mal') : '';
  $('#jRonda').textContent = TT('ronda') + ' ' + JU.ronda + ' · ' + TT('notas') + ' ' + JU.sec.length;
  const p = $('#jPuntos'); p.innerHTML = '';
  for (let i = 0; i < JU.sec.length; i++){
    const d = document.createElement('div');
    d.className = 'pt' + ((f === 'turno' && i < JU.paso) || f === 'bien' ? ' ok' : '');
    p.appendChild(d);
  }
}

/* ══════════ ENTRAR A JUGAR ══════════ */
function entra(conJuego){
  const ac = audioDespierta();
  verPantalla('panel');
  /* un panel que no suena no es este juego: hay que decirlo, no dejar que el
     jugador crea que no le está tocando bien */
  if (!ac){ avisa(TT('sinSon'), 6); }
  FASE_ANT = ''; PASO_ANT = -1;
  if (conJuego){ juegoArranca(); document.body.classList.add('jugando'); pintaJuego(); }
  else { juegoCorta(); document.body.classList.remove('jugando'); }
  const listo = !ac || !!BUF[PAN.inst + '|' + instAct().m[0].n];
  if (!listo){
    CARGANDO = true; avisa(TT('cargando'), 30);
    cargaInstr(PAN.inst).then(() => { CARGANDO = false; avisa(conJuego ? '' : TT('toca'), 2.0); });
  } else avisa(conJuego ? '' : TT('toca'), 2.0);
}
function alMenu(){
  juegoCorta(); document.body.classList.remove('jugando');
  apagaTodo(); avisa('');
  verPantalla('menu');
}

/* ══════════ EL DEDO ══════════ */
const LZE = $('#lz');
const ACTIVOS = {};
function coord(e){
  const r = LZE.getBoundingClientRect();
  return { nx: cl((e.clientX - r.left)/Math.max(1, r.width), 0, 1),
           na: cl(1 - (e.clientY - r.top)/Math.max(1, r.height), 0, 1) };
}
LZE.addEventListener('pointerdown', e => {
  if (PANT !== 'panel') return;
  e.preventDefault();
  audioDespierta();
  try { LZE.setPointerCapture(e.pointerId); } catch (x) {}
  const c = coord(e);
  ACTIVOS[e.pointerId] = 1;
  dedoAbajo(e.pointerId, c.nx, c.na);
  if (JU.on) pintaJuego();
  if (AVT > 0) avisa('');
});
/* ── EL SEGUIMIENTO CUELGA DE LA VENTANA Y NO DEL LIENZO ──
   `setPointerCapture` puede fallar, y un dedo que sale del lienzo —a la franja
   de arriba, por ejemplo— deja de mandar eventos al elemento: la nota se queda
   sonando para siempre. */
window.addEventListener('pointermove', e => {
  if (!ACTIVOS[e.pointerId]) return;
  const c = coord(e);
  dedoMueve(e.pointerId, c.nx, c.na);
}, { passive: true });
function suelta(e){
  if (!ACTIVOS[e.pointerId]) return;
  delete ACTIVOS[e.pointerId];
  dedoArriba(e.pointerId);
}
window.addEventListener('pointerup', suelta);
window.addEventListener('pointercancel', suelta);
LZE.addEventListener('contextmenu', e => e.preventDefault());
/* irse de la pestaña con un dedo apoyado dejaba la nota sonando */
document.addEventListener('visibilitychange', () => {
  if (document.hidden){ for (const k in ACTIVOS) delete ACTIVOS[k]; dedosSoltar(); apagaTodo(); }
});

/* ══════════ BOTONES ══════════ */
$$('#pIdioma [data-lang]').forEach(b => b.addEventListener('click', () => {
  audioDespierta(); ponIdioma(b.getAttribute('data-lang')); verPantalla('menu');
}));
$('#bLibre').addEventListener('click', () => entra(false));
$('#bJuego').addEventListener('click', () => entra(true));
$('#bAjustes').addEventListener('click', () => verPantalla('ajustes'));
$('#bCerrarCfg').addEventListener('click', () => verPantalla('menu'));
$('#bVerInstr').addEventListener('click', () => { verPantalla('instr'); pintaInstr(); });
$('#bCerrarInstr').addEventListener('click', () => verPantalla('ajustes'));
$('#bVolver').addEventListener('click', alMenu);
$('#bCfg').addEventListener('click', () => { dedosSoltar(); verPantalla('ajustes'); });
$('#bOtra').addEventListener('click', () => entra(true));
$('#bAlMenu').addEventListener('click', alMenu);

/* ══════════ EL RELOJ ══════════
   Paso fijo: el ritmo con el que REPETÍ toca la secuencia no puede depender de
   cuántos cuadros dé el aparato. */
const PASO = 1/60;
let ACUM = 0, ULT = 0, FASE_ANT = '', PASO_ANT = -1, TOCANDO = false, SONANDO = false;
/* ── CONGELAR ES QUE NADA AVANCE, PERO SE SIGA DIBUJANDO ──
   Sin esto, una sonda planta un instante y el cuadro siguiente lo devuelve a su
   sitio: la foto sale de otro momento. Ya costó una vuelta en tres juegos. */
let CONG = false;
function bucle(t){
  requestAnimationFrame(bucle);
  const dt = ULT ? Math.min(0.25, (t - ULT)/1000) : 0;
  ULT = t;
  ACUM += dt;
  let n = 0;
  while (ACUM >= PASO && n++ < 8){
    ACUM -= PASO;
    if (CONG) continue;
    panelPaso(PASO);
    juegoPaso(PASO);
    if (AVT > 0){ AVT -= PASO; if (AVT <= 0) avisa(''); }
  }
  if (JU.on && JU.fase !== FASE_ANT){
    FASE_ANT = JU.fase;
    pintaJuego();
    if (JU.fase === 'fin'){
      $('#fNum').textContent = String(JU.ronda);
      $('#fRec').textContent = TT('mejor') + ' ' + JU.rec;
      dedosSoltar();
      setTimeout(() => { if (JU.fase === 'fin') verPantalla('fin'); }, 900);
    }
  }
  /* repintar los puntitos en cada cuadro es reconstruir DOM sesenta veces por
     segundo para escribir lo mismo: sólo cuando el paso cambió */
  if (JU.on && JU.fase === 'turno' && JU.paso !== PASO_ANT){ PASO_ANT = JU.paso; pintaJuego(); }
  const td = nDedos() > 0;
  if (td !== TOCANDO){ TOCANDO = td; document.body.classList.toggle('tocando', td); }
  const sn = JU.on && JU.luzT > 0;
  if (sn !== SONANDO){ SONANDO = sn; document.body.classList.toggle('sonando', sn); }
  if (PANT === 'panel') pinta();
}

/* ══════════ ARRANQUE ══════════ */
function arranca(){
  lienzoPon(LZE);
  window.addEventListener('resize', lienzoMide);
  window.addEventListener('orientationchange', () => setTimeout(lienzoMide, 120));
  PAN.esc  = cl(Math.round(leeN('esc', 0)), 0, ESCALAS.length - 1);
  PAN.tono = cl(Math.round(leeN('tono', 0)), 0, 11);
  PAN.oct  = cl(Math.round(leeN('oct', OCTAVAS)), 1, 3);
  PAN.libre = leeN('libre', 1) !== 0;
  const gi = lee('inst', PAN.inst);
  if (POR_ID[gi]) PAN.inst = gi;
  SON_ON = leeN('son', 1) !== 0;
  const li = lee('lang', null);
  ponIdioma(li || ((navigator.language || 'en').slice(0, 2)));
  if (li) verPantalla('menu');
  requestAnimationFrame(bucle);
}
arranca();
