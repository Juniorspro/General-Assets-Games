/* ══════════════════════════════════════════════════════════════════════════
   H · PANTALLAS, MENU Y DEDO
   ══════════════════════════════════════════════════════════════════════════ */
let PANEL = null;
function verPanel(id) {
  cierraPanel();
  PANEL = id; $(id).classList.add('on');
  document.body.classList.add('conPanel');
  $('hud').classList.add('off'); $('pie').classList.add('off');
  pistaVer(null);
}
function cierraPanel() {
  if (PANEL) $(PANEL).classList.remove('on');
  PANEL = null; document.body.classList.remove('conPanel');
  if (JU.fase === 'juega') { $('hud').classList.remove('off'); $('pie').classList.remove('off'); if (PI_K) $('pista').classList.add('on'); }
}
function alMenu() {
  JU.fase = 'menu'; JU.T = null; pistaVer(null);
  verPanel('pMenu'); pintaMenu();
}

/* ── el menu ── */
function pintaMenu() {
  $('mSub').textContent = TX('sub');
  $('mJugar').textContent = TX('jugar');
  $('mNiv').textContent = TX('niveles');
  $('mTuto').textContent = TX('tuto');
  $('mAj').textContent = TX('ajustes');
  $('mPie').textContent = TX('de', cuentaHechos(), NIVELES) + ' · ' + TX('pie');
}

/* ── la lista ── */
let NV_M = 0;
function abreNiveles() {
  NV_M = (PROG.ult / NIV_MUNDO) | 0;
  verPanel('pNiv'); pintaNiveles();
}
function pintaNiveles() {
  $('nvTit').textContent = TX('niveles');
  $('nvSub').textContent = TX('nivelesSub');
  $('nvVolver').textContent = TX('volver');
  const tabs = $('nvMundos'); tabs.innerHTML = '';
  for (let m = 0; m < MUNDOS.length; m++) {
    const b = document.createElement('button');
    b.className = 'mtab' + (m === NV_M ? ' sel' : '') + (abierto(m * NIV_MUNDO) ? '' : ' cerr');
    b.textContent = nomMundo(m);
    b.onclick = () => { if (!abierto(m * NIV_MUNDO)) return; NV_M = m; son('ui'); pintaNiveles(); };
    tabs.appendChild(b);
  }
  const g = $('nvGrid'); g.innerHTML = '';
  for (let n = 0; n < NIV_MUNDO; n++) {
    const k = idNiv(NV_M, n), ab = abierto(k);
    const b = document.createElement('button');
    b.className = 'nvB' + (hecho(NV_M, n) ? ' ok' : '') + (ab ? '' : ' cerr') + (perfecto(NV_M, n) ? ' perf' : '');
    b.innerHTML = (n + 1) + (hecho(NV_M, n) ? '<s>OK</s>' : '');
    b.onclick = () => { if (!ab) return; son('ui'); cierraPanel(); nuevoNivel(NV_M, n, false); };
    g.appendChild(b);
  }
}

/* ── ajustes ── */
function pintaAj() {
  $('ajTit').textContent = TX('ajTit');
  $('ajMus').textContent = TX('musica');
  $('ajFx').textContent = TX('efectos');
  $('ajIdi').textContent = TX('idioma');
  $('ajBorrar').textContent = TX('borrar');
  $('ajVolver').textContent = TX('volver');
  $('rMus').value = Math.round(PROG.vol * 100);
  $('rFx').value = Math.round(PROG.fx * 100);
  for (const b of document.querySelectorAll('[data-l2]')) b.classList.toggle('sel', b.dataset.l2 === LANG);
}

/* ── el idioma se repinta ENTERO ─────────────────────────────────────────
   Cada pantalla tiene su funcion de pintado y cambiar de idioma las llama a
   todas: escrito panel por panel, el que no este abierto se queda en el
   idioma anterior hasta la proxima vez que alguien lo abra.                */
function pintaIdioma() {
  document.documentElement.lang = LANG;
  pintaMenu(); pintaAj(); pistaRepinta();
  if (PANEL === 'pNiv') pintaNiveles();
  $('paTit').textContent = TX('pausa'); $('paSub').textContent = TX('pausaSub');
  $('paSeguir').textContent = TX('seguir'); $('paRe').textContent = TX('reiniciar');
  $('paSalir').textContent = TX('salir');
  $('fRe').textContent = TX('reiniciar'); $('fMenu').textContent = TX('menuCorto');
  /* El titulo, el subtitulo, la ficha y el boton del panel de fin los escribe
     `pintaFin()` desde `FIN`, que es el estado. Repintados acá campo por
     campo habria que adivinar si la victoria fue perfecta y cuantas piezas
     tenia el tablero — y `fSig` lleva DOS rotulos distintos. Y no se toca su
     `display`: en el ultimo nivel esta apagado a proposito.                */
  pintaFin();
  $('cSub').textContent = TX('cargando');
  if (JU.T) pintaHud();
}
function ponIdioma(l) {
  LANG = l; guardaProg(); pintaIdioma();
}

/* ── el dedo ─────────────────────────────────────────────────────────────
   Se decide al SOLTAR y no al apoyar. Apoyando, cualquier arrastre sobre el
   tablero saca una flecha que nadie pidio — y en un juego donde equivocarse
   cuesta un corazon eso es un castigo que el jugador no cometio.           */
let TQ = null;
function xy(e) {
  const t = (e.changedTouches && e.changedTouches[0]) || e;
  const r = $('marco').getBoundingClientRect();
  return [t.clientX - r.left, t.clientY - r.top];
}
function engancha() {
  const c = $('cv');
  c.addEventListener('pointerdown', e => {
    if (PANEL || JU.fase !== 'juega') return;
    auArranca(); auDesp();
    TQ = xy(e); e.preventDefault();
  }, { passive: false });
  c.addEventListener('pointerup', e => {
    if (!TQ) return;
    const p = xy(e);
    if (Math.hypot(p[0] - TQ[0], p[1] - TQ[1]) < 22) toqueEn(p[0], p[1]);
    TQ = null; e.preventDefault();
  }, { passive: false });
  c.addEventListener('pointercancel', () => { TQ = null; });

  /* todo boton despierta el audio: ningun navegador deja sonar nada antes de
     un gesto de verdad, y el primero que hay es el del idioma.             */
  document.addEventListener('pointerdown', () => { auArranca(); auDesp(); }, { capture: true });

  for (const b of document.querySelectorAll('[data-lang]'))
    b.onclick = () => { son('ui'); ponIdioma(b.dataset.lang); arrancaJuego(); };
  for (const b of document.querySelectorAll('[data-l2]'))
    b.onclick = () => { son('ui'); ponIdioma(b.dataset.l2); };

  $('mJugar').onclick = () => { son('ui'); cierraPanel(); const k = cl(PROG.ult, 0, NIVELES - 1); nuevoNivel((k / NIV_MUNDO) | 0, k % NIV_MUNDO, false); };
  $('mNiv').onclick = () => { son('ui'); abreNiveles(); };
  $('mTuto').onclick = () => { son('ui'); cierraPanel(); nuevoNivel(0, 0, true); };
  $('mAj').onclick = () => { son('ui'); pintaAj(); verPanel('pAj'); };
  $('nvVolver').onclick = () => { son('ui'); alMenu(); };
  $('ajVolver').onclick = () => { son('ui'); alMenu(); };
  $('ajBorrar').onclick = () => { borraProg(); son('ui'); $('ajBorrar').textContent = TX('borrado'); pintaMenu(); };
  $('rMus').oninput = () => { PROG.vol = $('rMus').value / 100; auVol(); guardaProg(); };
  $('rFx').oninput  = () => { PROG.fx  = $('rFx').value / 100;  auVol(); guardaProg(); son('ui'); };

  $('bPausa').onclick = () => { if (JU.fase !== 'juega') return; son('ui'); JU.fase = 'pausa'; verPanel('pPausa'); };
  $('paSeguir').onclick = () => { son('ui'); JU.fase = 'juega'; cierraPanel(); };
  $('paRe').onclick = () => { JU.fase = 'juega'; cierraPanel(); reinicia(); };
  $('paSalir').onclick = () => { son('ui'); alMenu(); };
  $('fRe').onclick = () => { JU.fase = 'juega'; cierraPanel(); reinicia(); };
  $('fMenu').onclick = () => { son('ui'); alMenu(); };
  $('fSig').onclick = () => {
    son('ui');
    if (JU.tut) { cierraPanel(); const k = cl(PROG.ult, 0, NIVELES - 1); nuevoNivel((k / NIV_MUNDO) | 0, k % NIV_MUNDO, false); }
    else siguiente();
  };

  addEventListener('resize', () => setTimeout(medir, 60));
  addEventListener('orientationchange', () => setTimeout(medir, 220));
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && JU.fase === 'juega') $('bPausa').onclick();
    if (e.key === 'r' && JU.fase === 'juega') reinicia();
  });
}

/* Apenas hay idioma se entra al TUTORIAL, no al menu. Pedido textual: «con
   tutorial apenas empieza». Dentro de la sesion no se repite.              */
function arrancaJuego() {
  if (!PROG.visto) { cierraPanel(); nuevoNivel(0, 0, true); }
  else alMenu();
}
