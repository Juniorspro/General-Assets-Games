/* ══════════════════════ EL JUEGO ARMADO ══════════════════════ */
const $ = s => document.querySelector(s);
const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));

let LANG = 'en', PANT = 'idioma';
function TT(k){ return (TXT[LANG] || TXT.en)[k] || (TXT.es[k] || k); }
function LI(){ return LANG === 'es' ? 0 : LANG === 'en' ? 1 : 2; }

function guarda(k, v){ try { localStorage.setItem('loopa_' + k, String(v)); } catch (e) {} }
function lee(k, d){ try { const v = localStorage.getItem('loopa_' + k); return v === null ? d : v; } catch (e){ return d; } }
function leeN(k, d){ const v = parseFloat(lee(k, NaN)); return isFinite(v) ? v : d; }

/* ══════════ PANTALLAS ══════════ */
const PANS = { idioma: '#pIdioma', menu: '#pMenu', ajustes: '#pAjustes', instr: '#pInstr' };
function verPantalla(p){
  PANT = p;
  for (const k in PANS) $(PANS[k]).classList.toggle('on', k === p);
  const enJuego = p === 'panel';
  /* el lienzo se queda encendido también en el menú: el velo del menú es un
     degradado que lo deja asomar por abajo, y eso muestra lo que el juego es sin
     una sola línea de animación aparte */
  const conLienzo = enJuego || p === 'menu';
  $('#lz').style.visibility = conLienzo ? 'visible' : 'hidden';
  for (const id of ['hudTop', 'estado', 'compases']) $('#' + id).style.visibility = enJuego ? 'visible' : 'hidden';
  $$('.fila').forEach(e => { e.style.visibility = enJuego ? 'visible' : 'hidden'; });
  if (!enJuego && SEC.estado !== 'quieto') secCorta();
}

/* ══════════ EL MICRÓFONO ══════════ */
let MIC = null, MIC_EST = 'no';
async function micPide(){
  if (MIC_EST === 'lista' || MIC_EST === 'pidiendo') return MIC_EST;
  MIC_EST = 'pidiendo'; pintaEstado();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ MIC_EST = 'nohay'; return MIC_EST; }
  /* ── LAS TRES CORRECCIONES DEL NAVEGADOR VAN APAGADAS, Y NO ES UN GUSTO ──
     El control automático de ganancia iguala el volumen a lo largo del tiempo, o
     sea que aplana justamente el salto de energía que el detector de golpes
     busca; y la supresión de ruido está entrenada sobre voz hablada y se come
     los transitorios de un «tss». Con las tres puestas, un beatbox no se detecta. */
  const duro = { audio: { echoCancellation: false, noiseSuppression: false,
                          autoGainControl: false, channelCount: 1 } };
  let st = null;
  try { st = await navigator.mediaDevices.getUserMedia(duro); }
  catch (e){ try { st = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (x){ st = null; } }
  if (!st){ MIC_EST = 'no'; pintaEstado(); return MIC_EST; }
  audioDespierta();
  MIC = AC.createMediaStreamSource(st);
  /* el micrófono NO se conecta al maestro: se acoplaría con los parlantes */
  if (!oidoListo()) oidoInit(MIC); else oidoEntrada(MIC);
  MIC_EST = 'lista'; pintaEstado();
  return MIC_EST;
}

/* ══════════ ESTADO Y ROTULOS ══════════ */
/* ── EL AVISO GUARDA CÓMO SE ARMA EL TEXTO, NO EL TEXTO ──
   Resuelto una vez, un aviso disparado en castellano se queda en castellano
   aunque se cambie de idioma tres segundos después. Es el mismo defecto que en
   Z Force costó 107 claves. Guardando la función, se retraduce sola en cada
   pintada y no hay dos sitios que puedan discrepar. */
let AVISO = null, AVISO_T = 0, EST_ANT = '';
function avisa(f, seg){ AVISO = (typeof f === 'function') ? f : (() => String(f)); AVISO_T = seg === undefined ? 2.6 : seg; }
function pintaEstado(){
  const e = $('#estado');
  let t = '', cls = '';
  if (SEC.estado === 'cuenta'){ t = TT('cuenta'); cls = 'act'; }
  else if (SEC.estado === 'grabando'){
    const n = SEC.modo === 'percu' ? CAP.golpes.length : CAP.tono.length;
    t = TT('grabando') + ' · ' + n + ' ' + (SEC.modo === 'percu' ? TT('golpes') : TT('notas'));
    cls = 'rec';
  }
  else if (AVISO_T > 0 && AVISO) t = AVISO();
  else if (MIC_EST === 'pidiendo') t = TT('pidiendo');
  else if (MIC_EST !== 'lista') t = TT('sinMic');
  else t = TT('ayudaP');
  if (t !== EST_ANT){ e.textContent = t; EST_ANT = t; }
  e.className = cls;
}
function pintaTrans(){
  $('#bPlay').textContent = SEC.tocando ? '■' : '▶';
  $('#bPlay').classList.toggle('on', SEC.tocando);
  $('#bPercu').classList.toggle('on', SEC.estado !== 'quieto' && SEC.modo === 'percu');
  $('#bMelo').classList.toggle('on', SEC.estado !== 'quieto' && SEC.modo === 'melo');
  $('#tBpm').textContent = String(SEC.bpm);
  $('#tTit').textContent = 'LOOPA · ' + SEC.bpm;
}
function pintaCompases(){
  const c = $('#compases'); c.innerHTML = '';
  for (let i = 0; i < SEC.compases; i++){
    const b = document.createElement('button');
    b.className = 'cb' + (i === COMPAS_VER ? ' sel' : ''); b.textContent = String(i + 1);
    b.addEventListener('click', () => { verCompas(i); pintaCompases(); });
    c.appendChild(b);
  }
}
function nomInst(){ const I = POR_ID[SEC.inst]; return I ? I.nom[LI()] : SEC.inst; }
function pintaIdioma(){
  $('#iSub').textContent = TT('sub'); $('#mSub').textContent = TT('sub');
  $('#bJugar').textContent = TT('jugar'); $('#bAjustes').textContent = TT('ajustes');
  $('#mPie').textContent = TT('pie'); $('#mCred').textContent = TT('credito');
  $('#aTit').textContent = TT('ajustes'); $('#aVol').textContent = TT('vol');
  $('#aMetro').textContent = TT('metro'); $('#aSens').textContent = TT('sens');
  $('#aEsc').textContent = TT('escala'); $('#aComp').textContent = TT('compases');
  $('#aRet').textContent = TT('ajuste'); $('#aIdi').textContent = TT('idioma');
  $('#aNota').textContent = TT('pie'); $('#bCerrarCfg').textContent = TT('volver');
  $('#nTit').textContent = TT('instrumento'); $('#bCerrarInstr').textContent = TT('volver');
  $('#bPercu').textContent = '● ' + TT('percu'); $('#bMelo').textContent = '● ' + TT('melodia');
  $('#bInst').textContent = nomInst();
  EST_ANT = ''; pintaEstado(); pintaAjustes(); pintaInstr(); pintaTrans();
}
function ponIdioma(l){
  LANG = (l === 'es' || l === 'en' || l === 'pt') ? l : 'en';
  guarda('lang', LANG); document.documentElement.lang = LANG; pintaIdioma();
}

/* ══════════ AJUSTES ══════════ */
function chip(txt, sel, fn){
  const b = document.createElement('button');
  b.className = 'op' + (sel ? ' sel' : ''); b.textContent = txt;
  b.addEventListener('click', fn); return b;
}
function pasoUI(el, txt, menos, mas){
  el.innerHTML = ''; el.appendChild(chip('‹', false, menos));
  const m = document.createElement('div'); m.className = 'op sel';
  m.style.minWidth = '42%'; m.textContent = txt; el.appendChild(m);
  el.appendChild(chip('›', false, mas));
}
function ponEsc(i){ SEC.esc = ((i % ESCALAS.length) + ESCALAS.length) % ESCALAS.length; guarda('esc', SEC.esc); pintaAjustes(); }
function ponComp(n){ secRedimensiona(n); verCompas(0); guarda('comp', SEC.compases); pintaAjustes(); pintaCompases(); }
function ponSens(v){ SEC.sens = cl(v, 0.5, 2); oidoSens(SEC.sens); guarda('sens', SEC.sens); pintaAjustes(); }
function ponRet(ms){ SEC.retardo = cl(ms, -0.08, 0.16); guarda('ret', SEC.retardo); pintaAjustes(); }
function pintaAjustes(){
  const v = $('#oVol'); v.innerHTML = '';
  for (const q of [0.5, 0.7, 0.85, 1]) v.appendChild(chip(Math.round(q*100) + '', Math.abs(VOL - q) < 0.02, () => { volMaestro(q); guarda('vol', q); pintaAjustes(); }));
  const m = $('#oMetro'); m.innerHTML = '';
  m.appendChild(chip('ON', SEC.metro, () => { SEC.metro = true; guarda('metro', 1); pintaAjustes(); }));
  m.appendChild(chip('OFF', !SEC.metro, () => { SEC.metro = false; guarda('metro', 0); pintaAjustes(); }));
  pasoUI($('#oSens'), SEC.sens.toFixed(2) + '×', () => ponSens(SEC.sens - 0.15), () => ponSens(SEC.sens + 0.15));
  pasoUI($('#oEsc'), ESCALAS[SEC.esc].n[LI()], () => ponEsc(SEC.esc - 1), () => ponEsc(SEC.esc + 1));
  const c = $('#oComp'); c.innerHTML = '';
  for (const n of [1, 2, 4]) c.appendChild(chip(String(n), SEC.compases === n, () => ponComp(n)));
  pasoUI($('#oRet'), Math.round(SEC.retardo*1000) + ' ms', () => ponRet(SEC.retardo - 0.01), () => ponRet(SEC.retardo + 0.01));
  const i = $('#oIdi'); i.innerHTML = '';
  for (const q of ['es', 'en', 'pt']) i.appendChild(chip(q.toUpperCase(), LANG === q, () => ponIdioma(q)));
}
function pintaInstr(){
  const l = $('#lista'); l.innerHTML = '';
  for (const I of INSTRS){
    const b = document.createElement('button');
    b.className = 'ins' + (I.id === SEC.inst ? ' sel' : '');
    b.textContent = I.nom[LI()];
    b.addEventListener('click', () => {
      SEC.inst = I.id; guarda('inst', I.id);
      cargaInstr(I.id).then(() => { if (PANT === 'instr' && AC) nota(I.id, 60, AC.currentTime + 0.02, 0.5, 0.7); });
      $('#bInst').textContent = nomInst(); pintaInstr();
    });
    l.appendChild(b);
  }
}

/* ══════════ DESHACER ══════════
   Grabar REEMPLAZA la pista, que es lo predecible; sin una vuelta atrás, una
   toma mala se lleva puesta la anterior y no hay forma de recuperarla. */
let UNDO = null;
function foto(){ UNDO = JSON.parse(JSON.stringify(SEC.pistas)); }
function deshace(){
  if (!UNDO) return false;
  const t = JSON.parse(JSON.stringify(SEC.pistas));
  SEC.pistas = UNDO; UNDO = t; guardaPatron(); return true;
}
function guardaPatron(){ try { guarda('pat', JSON.stringify({ c: SEC.compases, p: SEC.pistas })); } catch (e) {} }
function leePatron(){
  try {
    const d = JSON.parse(lee('pat', 'null'));
    if (!d || !d.p) return false;
    secRedimensiona(d.c || COMPASES_DEF);
    for (const q of PISTAS) if (Array.isArray(d.p[q.id]) && d.p[q.id].length === secPasos()) SEC.pistas[q.id] = d.p[q.id].slice();
    return true;
  } catch (e){ return false; }
}

/* ══════════ ENTRAR ══════════ */
function entra(){
  audioDespierta();
  verPantalla('panel');
  lienzoMide();
  cargaInstr(SEC.inst);
  micPide();
}
function alMenu(){ secStop(); verPantalla('menu'); }

/* ══════════ EL DEDO SOBRE LA GRILLA ══════════ */
const LZE = $('#lz');
LZE.addEventListener('pointerdown', e => {
  if (PANT !== 'panel') return;
  e.preventDefault(); audioDespierta();
  const r = LZE.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const rot = rotEn(x, y);
  if (rot){ secMuda(rot); return; }
  const c = celdaEn(x, y);
  if (c){ foto(); secToca(c.pista, c.paso); guardaPatron(); }
});
LZE.addEventListener('contextmenu', e => e.preventDefault());

/* ══════════ BOTONES ══════════ */
$$('#pIdioma [data-lang]').forEach(b => b.addEventListener('click', () => {
  audioDespierta(); ponIdioma(b.getAttribute('data-lang')); verPantalla('menu');
}));
$('#bJugar').addEventListener('click', entra);
$('#bAjustes').addEventListener('click', () => verPantalla('ajustes'));
$('#bCerrarCfg').addEventListener('click', () => verPantalla(SEC.tocando || !secVacio() ? 'panel' : 'menu'));
$('#bCerrarInstr').addEventListener('click', () => verPantalla('panel'));
$('#bVolver').addEventListener('click', alMenu);
$('#bCfg').addEventListener('click', () => verPantalla('ajustes'));
$('#bPlay').addEventListener('click', () => { if (SEC.tocando) secStop(); else secPlay(); pintaTrans(); });
$('#bPercu').addEventListener('click', () => arrancaGrab('percu'));
$('#bMelo').addEventListener('click', () => arrancaGrab('melo'));
$('#bInst').addEventListener('click', () => { verPantalla('instr'); pintaInstr(); });
$('#bUndo').addEventListener('click', () => { if (deshace()) avisa('↺', 1.2); });
$('#bBpmM').addEventListener('click', () => ponBpm(SEC.bpm - 2));
$('#bBpmP').addEventListener('click', () => ponBpm(SEC.bpm + 2));
function ponBpm(n){ SEC.bpm = cl(Math.round(n), BPM_MIN, BPM_MAX); guarda('bpm', SEC.bpm); pintaTrans(); }
let BORRA_ARM = 0;
$('#bBorra').addEventListener('click', () => {
  if (BORRA_ARM > 0){ foto(); secLimpiaTodo(); guardaPatron(); BORRA_ARM = 0; avisa(() => TT('limpiaTodo'), 1.4); }
  else { BORRA_ARM = 2.5; avisa(() => '¿?  ' + TT('limpiaTodo'), 2.5); }
});

async function arrancaGrab(modo){
  if (SEC.estado !== 'quieto'){ secCorta(); pintaTrans(); return; }
  if (MIC_EST !== 'lista'){ const r = await micPide(); if (r !== 'lista'){ avisa(() => TT('sinMic'), 3); return; } }
  foto();
  /* grabar REEMPLAZA: acumular deja la basura de la toma anterior encima */
  if (modo === 'percu'){ secBorra('bombo'); secBorra('caja'); secBorra('charles'); }
  else secBorra('melo');
  secGraba(modo);
  avisa(() => modo === 'percu' ? TT('ayudaP') : TT('ayudaM'), 3);
  pintaTrans();
}

/* ══════════ EL OÍDO NO CUELGA DEL DIBUJO ══════════
   ── Y ÉSTE ES EL LÍMITE FÍSICO DEL ASUNTO ──
   La ventana del analizador mide 23 ms. Leyéndolo desde el bucle de dibujo, un
   teléfono a 20 cuadros deja 50 ms entre lecturas y MÁS DE LA MITAD DEL AUDIO NO
   SE MIRA NUNCA: un «tss» de treinta milisegundos cae en el hueco y no existe.
   Medido: a 20 cuadros, 0 golpes de 24. Con un intervalo propio de 16 ms la
   detección deja de depender de los fps, que es lo correcto además — el oído no
   tiene nada que ver con el dibujo. Es la misma razón por la que el secuenciador
   agenda desde su propio intervalo y no desde el cuadro.

   ── UN SOLO CONSUMIDOR ──
   El flujo es una DIFERENCIA contra la lectura anterior, así que dos lugares
   llamando a `oidoCuadro` se roban el transitorio entre ellos: el primero lo ve
   y el segundo encuentra el espectro ya igualado. Con la sonda auditando, esto
   se calla. */
let OIDO_INT = null, NIV = 0;
function oidoLatido(){
  if (!oidoListo() || !AC || window.__oidoSonda) return;
  const o = oidoCuadro(AC.currentTime);
  if (!o) return;
  if (window.__cap && window.__cap.length < 6000) window.__cap.push(o);
  NIV = Math.sqrt(cl(o.rms/0.22, 0, 1));
  if (o.onset && SEC.estado === 'grabando' && SEC.modo === 'percu') destella(o.tipo, pasoDe(o.t));
  secOye(o);
}

/* ══════════ EL BUCLE ══════════ */
let ULT_T = 0, PICO = 0, EST_FASE = '';
function bucle(t){
  requestAnimationFrame(bucle);
  const dt = ULT_T ? Math.min(0.2, (t - ULT_T)/1000) : 0;
  ULT_T = t;
  if (AVISO_T > 0) AVISO_T -= dt;
  if (BORRA_ARM > 0) BORRA_ARM -= dt;
  destPaso(dt);
  const niv = oidoListo() ? NIV : 0;
  PICO = Math.max(PICO - dt*0.6, niv);
  if (SEC.estado !== EST_FASE){
    EST_FASE = SEC.estado;
    if (SEC.estado === 'quieto' && SEC.ultResumen){
      const r = SEC.ultResumen; SEC.ultResumen = null;
      SEC.res = r;                   /* el último resumen, para las sondas */
      const n = r.modo === 'percu' ? r.golpes : r.notas;
      avisa(() => n ? TT('listo') + ' · ' + n + ' ' + (r.modo === 'percu' ? TT('golpes') : TT('notas')) : TT('vacio'), 3);
      guardaPatron();
    }
    pintaTrans();
  }
  if (SEC.tocando){
    /* el compás visible sigue solo a la cabeza de lectura */
    const c = Math.floor(secPasoAhora()/PASOS_COMPAS);
    if (c !== COMPAS_VER){ verCompas(c); pintaCompases(); }
  }
  pintaEstado();
  if (PANT === 'panel' || PANT === 'menu') pinta(niv, PICO);
}

/* ══════════ ARRANQUE ══════════ */
function arranca(){
  lienzoPon(LZE);
  window.addEventListener('resize', () => { lienzoMide(); });
  window.addEventListener('orientationchange', () => setTimeout(lienzoMide, 120));
  document.addEventListener('visibilitychange', () => { if (document.hidden) secStop(); });
  SEC.bpm = cl(Math.round(leeN('bpm', BPM_DEF)), BPM_MIN, BPM_MAX);
  SEC.esc = cl(Math.round(leeN('esc', 1)), 0, ESCALAS.length - 1);
  SEC.metro = leeN('metro', 1) !== 0;
  SEC.sens = cl(leeN('sens', 1), 0.5, 2); oidoSens(SEC.sens);
  SEC.retardo = cl(leeN('ret', 0.030), -0.08, 0.16);
  volMaestro(leeN('vol', 0.85));
  const gi = lee('inst', SEC.inst); if (POR_ID[gi]) SEC.inst = gi;
  secRedimensiona(cl(Math.round(leeN('comp', COMPASES_DEF)), 1, 4));
  /* ── SE ARRANCA CON UN RITMO PUESTO ──
     Una grilla vacía no enseña qué es una grilla, y el menú detrás no mostraría
     nada. Con un patrón sembrado, la primera pantalla ya se ve tocando y el
     jugador entiende de una que las filas son pistas y las columnas tiempos.
     Sólo si no hay nada guardado, y el botón de borrar está al lado. */
  if (!leePatron()) secDemo();
  verCompas(0); pintaCompases();
  OIDO_INT = setInterval(oidoLatido, OIDO_MS);
  const li = lee('lang', null);
  ponIdioma(li || ((navigator.language || 'en').slice(0, 2)));
  verPantalla(li ? 'menu' : 'idioma');
  requestAnimationFrame(bucle);
}
arranca();
