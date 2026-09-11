/* ══════════════════════════════════════════════════════════════════════════
   h.js · LOS PANELES: menu, niveles, ajustes, pausa y fin
   ──────────────────────────────────────────────────────────────────────────
   UN SOLO SITIO ABRE Y CIERRA (`verPanel`), y de ahi cuelga todo lo demas:
   con cada boton apagando el panel que conoce, el dia que se agrega uno queda
   una pantalla encima de otra y no falla nada — se ve como un juego trabado.

   EL VELO ES UN DEGRADADO Y NO UNA OPACIDAD PAREJA: cerrado arriba y abajo,
   donde viven el titulo y los botones, y abierto en el medio, asi que el
   tablero sigue corriendo detras del menu. Un panel opaco encima de una
   escena que ya se esta dibujando tira a la basura lo unico que este juego
   tiene para mostrar antes de que alguien toque nada.
   ══════════════════════════════════════════════════════════════════════ */

let PANEL = null;
function verPanel(id) {
  const ps = document.getElementsByClassName('pan');
  for (let i = 0; i < ps.length; i++) ps[i].classList.toggle('on', ps[i].id === id);
  PANEL = id;
}

/* ── el idioma se escribe entero, y de UNA funcion ──
   `pintaIdioma` la llaman el arranque Y los seis botones de idioma, asi que
   no hay forma de agregar un texto que quede sin traducir en uno de los dos
   caminos. Y repinta TAMBIEN lo que ya esta en pantalla —el panel de fin, la
   pista del tutorial, el marcador— porque cambiar de idioma con un panel
   puesto tiene que cambiarlo: es literalmente el defecto que en Z Force
   costo 107 claves.                                                        */
function pintaIdioma() {
  const T = (id, k, ...a) => { const e = $(id); if (e) e.textContent = TX(k, ...a); };
  T('mSub', 'sub');
  T('mJugar', 'arena'); T('mJugarSub', 'arenaSub');
  T('mNiv', 'campana'); T('mNivSub', 'campanaSub');
  T('mTuto', 'tuto'); T('mAj', 'ajustes');
  T('mPie', 'pie');
  T('nvTit', 'niveles'); T('nvVolver', 'volver'); T('nvSub', 'nivelesSub');
  T('ajTit', 'ajTit'); T('ajMus', 'musica'); T('ajFx', 'efectos');
  T('ajCal', 'graficos'); T('ajIdi', 'idioma');
  T('ajBorrar', 'borrar'); T('ajVolver', 'volver');
  T('paTit', 'pausa'); T('paSub', 'pausaSub');
  T('paSeguir', 'seguir'); T('paRe', 'reiniciar'); T('paSalir', 'salir');
  T('cSub', 'cargando'); T('tSalt', 'salt');
  const cal = LANGS[LANG].calN || LANGS.es.calN;
  chips('[data-cal]', b => { b.textContent = cal[+b.dataset.cal] || ''; });
  finPinta();
  if (TUT.on) tutPista();
  if (P.on) hudPinta(true);
  nvPinta();
  marcaChips();
}

function chips(sel, f) {
  const l = document.querySelectorAll(sel);
  for (let i = 0; i < l.length; i++) f(l[i]);
}
function marcaChips() {
  chips('[data-cal]', b => b.classList.toggle('sel', (+b.dataset.cal) === (PROG.cal | 0)));
  chips('[data-l2]', b => b.classList.toggle('sel', b.dataset.l2 === LANG));
}

/* ══════════════════════ LA LISTA DE NIVELES ══════════════════════
   El mundo va por PESTANA y no todo junto: cuarenta botones en una columna
   son cuarenta botones que hay que scrollear para llegar al ultimo, y el
   ultimo es justo al que uno quiere volver.                                */
let NV_M = 0;
function nvAbre() {
  NV_M = cl(Math.floor(PROG.ult / NIV_MUNDO), 0, MUNDOS.length - 1);
  nvPinta();
  verPanel('pNiv');
}
function nvPinta() {
  const tab = $('nvMundos'), gr = $('nvGrid');
  if (!tab || !gr) return;
  tab.innerHTML = '';
  for (let m = 0; m < MUNDOS.length; m++) {
    const b = document.createElement('button');
    b.className = 'mtab';
    b.textContent = nomMundo(m);
    /* un mundo esta abierto si su PRIMER nivel lo esta: preguntando por el
       ultimo, la pestana del mundo en el que uno esta parado sale cerrada. */
    const libre = abierto(idNiv(m, 0));
    b.classList.toggle('sel', m === NV_M);
    b.classList.toggle('cerr', !libre);
    if (libre) b.onclick = () => { son('ui'); NV_M = m; nvPinta(); };
    tab.appendChild(b);
  }
  gr.innerHTML = '';
  for (let n = 0; n < NIV_MUNDO; n++) {
    const k = idNiv(NV_M, n), libre = abierto(k);
    const b = document.createElement('button');
    b.className = 'nvB';
    b.classList.toggle('ok', hecho(NV_M, n));
    b.classList.toggle('cerr', !libre);
    b.innerHTML = (n + 1) + (perfecto(NV_M, n) ? '<s>◆</s>' : '');
    if (libre) b.onclick = () => { son('ui'); juega(NV_M, n); };
    gr.appendChild(b);
  }
}

/* ══════════════════════ LOS CAMINOS ══════════════════════ */
function juega(m, n) {
  auDesp();
  partidaArranca(m, n, false);
  auAcorde(m);
  verPanel(null);
}
/* LA ARENA ENTRA POR LA MISMA PUERTA QUE UN NIVEL, con una bandera mas. Con
   una segunda funcion que armara la partida por su cuenta, el dia que se
   agregue un paso al arranque —apagar el tutorial, un panel, un sonido— uno
   de los dos caminos se queda sin el, y el que se queda sin el es siempre el
   que nadie prueba.
   Y EL ACORDE ES EL DEL ULTIMO MUNDO: la arena no tiene mundo, asi que se le
   da el color mas cargado de los cinco, que es el que le corresponde a un
   modo sin final.                                                          */
function juegaArenaUI() {
  auDesp();
  partidaArranca(0, 0, false, true);
  auAcorde(MUNDOS.length - 1);
  verPanel(null);
}
function vaMenu() {
  partidaSale();
  verPanel('pMenu');
}
/* JUGAR arranca en el ultimo abierto y no siempre en el 1-1: en un juego de
   cuarenta niveles, el boton grande tiene que llevar a donde uno quedo.   */
function juegaUltimo() {
  const k = cl(PROG.ult | 0, 0, NIVELES - 1);
  juega(Math.floor(k / NIV_MUNDO), k % NIV_MUNDO);
}

function uiInit() {
  const cl1 = (id, f) => { const e = $(id); if (e) e.onclick = f; };

  chips('[data-lang]', b => {
    b.onclick = () => { LANG = b.dataset.lang; guardaProg(); pintaIdioma(); auDesp(); son('ui'); arranqueUI(); };
  });
  chips('[data-l2]', b => {
    b.onclick = () => { LANG = b.dataset.l2; guardaProg(); son('ui'); pintaIdioma(); };
  });
  chips('[data-cal]', b => {
    b.onclick = () => { PROG.cal = +b.dataset.cal; guardaProg(); son('ui'); vpMide(); marcaChips(); };
  });

  cl1('mJugar', () => { son('ui'); juegaArenaUI(); });
  cl1('mNiv', () => { son('ui'); nvAbre(); });
  cl1('mTuto', () => { son('ui'); auDesp(); tutArranca(); verPanel(null); });
  cl1('mAj', () => { son('ui'); verPanel('pAj'); });
  cl1('nvVolver', () => { son('ui'); verPanel('pMenu'); });
  cl1('ajVolver', () => { son('ui'); verPanel(P.on ? 'pPausa' : 'pMenu'); });
  cl1('ajBorrar', () => {
    son('des'); borraProg();
    $('ajBorrar').textContent = TX('borrado');
    setTimeout(() => { $('ajBorrar').textContent = TX('borrar'); }, 1100);
    nvPinta();
  });

  cl1('bPausa', () => pausaPon(true));
  cl1('paSeguir', () => { son('ui'); pausaPon(false); });
  cl1('paRe', () => {
    son('ui'); P.pausa = false; auAgacha(1);
    if (P.arena) juegaArenaUI(); else juega(P.m, P.nv);
  });
  cl1('paSalir', () => { son('ui'); vaMenu(); });

  /* EL PANEL DE FIN TIENE DOS DUENOS —el nivel y el tutorial— y los tres
     botones cambian de destino segun cual cerro. Se pregunta por `P.tuto`,
     que sigue puesto hasta que `partidaSale` corra: guardar una segunda
     bandera seria un estado mas que se puede desincronizar del primero.  */
  cl1('fSig', () => {
    son('ui');
    /* EL TUTORIAL DESEMBOCA EN LA ARENA y no en la campana: es lo que el boton
       grande del menu ofrece, asi que mandar a otro lado despues de la leccion
       seria enseniar un modo y abrir otro.                                  */
    if (P.tuto) { partidaSale(); juegaArenaUI(); return; }
    if (P.arena) { partidaSale(); juegaArenaUI(); return; }
    const s = partidaSig();
    if (s) juega(s[0], s[1]); else vaMenu();
  });
  cl1('fRe', () => {
    son('ui');
    if (P.tuto) { partidaSale(); tutArranca(); verPanel(null); return; }
    juega(P.m, P.nv);
  });
  cl1('fMenu', () => { son('ui'); vaMenu(); });

  cl1('tSalt', () => tutSalta());

  const rm = $('rMus'), rf = $('rFx');
  if (rm) { rm.value = Math.round(PROG.vol * 100); rm.oninput = () => { PROG.vol = rm.value / 100; auVol(); guardaProg(); }; }
  if (rf) { rf.value = Math.round(PROG.fx * 100); rf.oninput = () => { PROG.fx = rf.value / 100; auVol(); guardaProg(); }; }
}

/* ══════════════════════ EL ARRANQUE ══════════════════════
   EL TUTORIAL VA ANTES DEL MENU, y sale cada vez que se abre el juego —
   `PROG.visto` se descarta al leer el disco—. Entrar al menu primero
   convierte la lection en una opcion, y lo que es opcional en un menu no lo
   toca nadie: despues no se entiende el juego y la culpa parece del juego.  */
function arranqueUI() {
  if (!PROG.lang) { verPanel('pIdioma'); return; }
  if (!PROG.visto) { auDesp(); tutArranca(); verPanel(null); return; }
  verPanel('pMenu');
}
