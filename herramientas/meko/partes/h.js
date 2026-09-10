
/* ══════════════════════════════════════════════════════════════════════════
   H · LAS PANTALLAS, EL IDIOMA, EL PROGRESO Y LA PARTIDA
   ══════════════════════════════════════════════════════════════════════════ */

const MEC_T = 0.36;
const JU = { n: 0, M: null, E: null, toques: 0, fin: false,
             mecI: -1, mecT: 9, mecDe: 0, mecA: 0,
             hizoAndar: false, hizoMec: false, hizoGirar: false, pistaK: null,
             ganaT: 0, tuto: false, opt: 0 };

const PANS = ['pIdioma', 'pMenu', 'pNiveles', 'pAjustes', 'pPausa', 'pGana'];
function verPanel(id) {
  for (const p of PANS) $(p).classList.toggle('on', p === id);
  document.body.classList.toggle('jugando', id === null);
}
const enPanel = () => PANS.some(p => $(p).classList.contains('on'));

/* ── EL IDIOMA CAMBIA TODO Y NO LA MITAD ──────────────────────────────────
   Un solo sitio escribe todos los textos, asi que agregar una pantalla no
   puede dejar una etiqueta en el idioma anterior. Y se llama tambien AL
   CAMBIAR, no solo al arrancar: si no, lo que ya esta escrito se queda.    */
function pintaIdioma() {
  const T2 = {
    mSub: 'sub', bJugar: 'jugar', bTuto: 'tuto', bNiveles: 'niveles', bAjustes: 'ajustes', mPie: 'pie',
    nTit: 'niveles', nSub: 'nivelesSub', nVolver: 'volver',
    aTit: 'ajTit', aMusL: 'musica', aFxL: 'efectos', aIdiL: 'idioma', aCalL: 'calidad',
    aBorrar: 'borrar', aVolver: 'volver',
    pTit: 'pausa', pSub: 'pausaSub', bSigo: 'seguir', bReini2: 'reiniciar', bSalir: 'salir',
    gNiv2: 'niveles', gMenu: 'salir',
  };
  for (const k in T2) { const e = $(k); if (e) e.textContent = TX(T2[k]); }
  /* el panel de victoria lo escribe UNA funcion y no dos: escrito aca y en
     `ganaste`, cambiar de idioma con el panel puesto lo devuelve al texto de
     nivel aunque lo que se acabe de terminar sea el tutorial */
  pintaGana();
  $('cSub').textContent = TX('cargando');
  $('nope').textContent = TX('nope');
  /* EL HUD Y LA PISTA TAMBIEN, Y LA PISTA HAY QUE FORZARLA. `pistaVer` sale
     por el atajo cuando la clave no cambio —para no tocar el DOM sesenta
     veces por segundo— asi que cambiando de idioma la clave SIGUE SIENDO LA
     MISMA y el cartel se queda en el idioma anterior hasta que el jugador
     avanza de paso. Medido: en el tutorial, `lang('en')` dejaba «tocá el
     bloque de allá» puesto. Poniendo la clave en null el atajo no aplica. */
  if (JU.M) { pintaHud(); JU.pistaK = null; pistaVer(pistaQue()); }
  const fi = $('aIdi'); fi.innerHTML = '';
  for (const [k, n] of [['es', 'ES'], ['en', 'EN'], ['pt', 'PT']]) {
    const b = document.createElement('button');
    b.className = 'bt' + (LANG === k ? ' sel' : ''); b.textContent = n;
    b.onclick = () => { son('toque'); LANG = k; guardaProg(); pintaIdioma(); pintaNiveles(); };
    fi.appendChild(b);
  }
  const fc = $('aCal'); fc.innerHTML = '';
  for (const [k, n] of [['baja', 'calB'], ['media', 'calM'], ['alta', 'calA']]) {
    const b = document.createElement('button');
    b.className = 'bt' + (PROG.cal === k ? ' sel' : ''); b.textContent = TX(n);
    /* SE APLICA EN CALIENTE: un ajuste que pide recargar la pagina no se
       prueba — el jugador lo toca una vez, no ve nada y no vuelve. */
    b.onclick = () => { son('toque'); PROG.cal = k; guardaProg(); aplicaCalidad(); medir(); pintaIdioma(); };
    fc.appendChild(b);
  }
  pintaHud();
}

function pintaHud() {
  $('niv').textContent = JU.tuto ? TX('tutTit') : TX('nivel', JU.n + 1);
  $('sub').textContent = JU.toques + ' ' + TX('tocaPara');
}
/* LA PISTA SE DECIDE EN UN SOLO SITIO Y SE MIRA POR CUADRO: repartida en los
   sitios que la disparan, cada gesto nuevo hay que acordarse de apagarla en
   los otros — y el que se olvide deja un cartel diciendo algo que el jugador
   ya hizo. Sale gratis porque no toca el DOM si no cambio.                 */
function pistaVer(k) {
  if (JU.pistaK === k) return;
  JU.pistaK = k;
  $('pista').textContent = k ? TX(k) : '';
  $('pista').classList.toggle('on', !!k);
}
function pistaQue() {
  if (JU.fin || !JU.M) return null;
  /* EL TUTORIAL USA LA MISMA PISTA Y NO UN CARTEL PROPIO: es el unico sitio
     del juego que decide que decir, asi que con un segundo el dia que se
     agregue un gesto habria que acordarse en los dos. Los cuatro pasos son
     los tres de siempre mas «llega a la meta», y cada uno espera su bandera:
     el orden en que el jugador los haga no importa. */
  if (JU.tuto) {
    if (!JU.hizoAndar) return 'tut1';
    if (!JU.hizoGirar) return 'tut2';
    if (!JU.hizoMec) return 'tut3';
    return 'tut4';
  }
  if (!JU.hizoAndar) return 'pistaMov';
  if (JU.M.mec.length && !JU.hizoMec) return 'pistaMec';
  if (!JU.hizoGirar) return 'pistaGira';
  return null;
}
function nopeVer() {
  const e = $('nope'); e.classList.remove('on'); void e.offsetWidth; e.classList.add('on');
  son('nope');
}

/* ══════════════════════ LOS NIVELES ══════════════════════ */
function proxNivel() {
  for (let n = 0; n < NIVELES; n++) if (PROG.hechos.indexOf(n) < 0) return n;
  return 0;
}
function pintaNiveles() {
  const g = $('gNiv'); g.innerHTML = '';
  for (let n = 0; n < NIVELES; n++) {
    const b = document.createElement('button');
    const hecho = PROG.hechos.indexOf(n) >= 0, ab = abierto(n);
    b.className = 'nb' + (hecho ? ' hecho' : '') + (ab ? '' : ' trabado');
    b.textContent = n + 1;
    if (hecho && PROG.mejor[n]) { const i = document.createElement('i'); i.textContent = PROG.mejor[n]; b.appendChild(i); }
    if (ab) b.onclick = () => { son('toque'); cargaNivel(n); };
    g.appendChild(b);
  }
  $('nSub').textContent = TX('de', PROG.hechos.length, NIVELES);
}

function cargaNivel(n) {
  JU.n = n; JU.tuto = false;
  /* GENERAR ES CARO Y VA CON LA PANTALLA DE CARGA PUESTA: el nivel 19 hace
     cientos de miles de nodos de busqueda y sin el cartel eso se ve como que
     el juego se colgo al tocar un boton. */
  $('carga').classList.remove('ido');
  $('cBarra').style.width = '18%';
  clearTimeout(JU.ganaT);
  verPanel(null);
  setTimeout(() => {
    const M = generaNivel(n) || generaNivel(0);
    JU.M = M; JU.E = estados0(M); JU.toques = 0; JU.fin = false;
    JU.mecT = 9; JU.mecI = -1;
    JU.hizoAndar = false; JU.hizoMec = false; JU.hizoGirar = false; JU.pistaK = null;
    $('cBarra').style.width = '78%';
    construyeDiorama(M);
    robEntra(M.ini);
    musRaiz(RAICES[(M.paleta || 0) % RAICES.length]);
    pintaHud();
    $('cBarra').style.width = '100%';
    setTimeout(() => $('carga').classList.add('ido'), 60);
  }, 40);
}
function reinicia() { if (JU.tuto) cargaTuto(); else cargaNivel(JU.n); }

/* ══════════════════════ EL TOQUE ══════════════════════
   Un toque es una ACCION y no un paso, y de eso sale que se cuenten toques:
   caminar a cualquier celda alcanzable cuesta uno y mover una pieza cuesta
   uno. Es exactamente la unidad que cuenta el validador — con dos cuentas
   distintas, «el mejor camino son N» seria un numero de otro juego.        */
const ocupado = () => !robQuieto() || JU.mecT < MEC_T;
function jugTocar(cx, cy) {
  if (JU.fin || ocupado() || enPanel() || !DIO) return;
  const r = tocaEn(cx, cy);
  if (!r) return;
  if (r.mec >= 0) return tocaMec(r.mec);
  /* el destino natural es ARRIBA del bloque tocado. Y si eso no se alcanza y
     lo que se toco fue una cara lateral, se prueba la celda de ENFRENTE: en
     un diorama uno le apunta a la pared que tiene al lado tanto como al piso
     donde quiere pararse. */
  const ruta = rutaDeToque(r.cel, r.n);
  if (!ruta) { nopeVer(); return; }
  JU.toques++; JU.hizoAndar = true; pintaHud();
  marcaEn(ruta[ruta.length - 1]); son('toque');
  robVaA(ruta);
}
/* el dedo pregunta lo mismo que el generador y el auto-jugador: la regla vive
   en `d.js`, que es el modelo puro, y acá sólo se le pasa el estado */
const rutaDeToque = (cel, n) => pedirToque(JU.M, JU.E, ROB.cel, cel, n);
function tocaMec(i) {
  const res = mecMueve(JU.M, JU.E, ROB.cel, i);
  if (!res) { nopeVer(); return; }
  JU.mecDe = JU.E[i].e; JU.mecA = res.E[i].e; JU.mecI = i; JU.mecT = 0;
  JU.E = res.E; JU.toques++; JU.hizoMec = true; pintaHud();
  son('mec');
  const a = ROB.cel;
  if (a[0] !== res.rob[0] || a[1] !== res.rob[1] || a[2] !== res.rob[2])
    robMonta(a, res.rob, MEC_T + Math.max(0, a[1] - res.rob[1]) * CAE_T);
}
/* LLEGAR SE MIRA POR CUADRO Y NO POR CALLBACK: hay dos caminos que dejan al
   robot en otra celda —caminar y montarse en una pieza— y con un aviso por
   camino, el dia que se agregue un tercero se gana el nivel y no pasa nada. */
const enMeta = () => JU.M && ROB.cel[0] === JU.M.meta[0] && ROB.cel[1] === JU.M.meta[1]
                     && ROB.cel[2] === JU.M.meta[2];

function pintaGana() {
  const n = JU.n, opt = JU.opt || JU.toques;
  $('gTit').textContent = JU.tuto ? TX('tutGana') : TX('gana');
  $('gSub').textContent = JU.tuto ? TX('tutGanaSub') : TX('ganaSub');
  $('gDatos').textContent = JU.tuto ? TX('tutDatos')
    : (JU.toques <= opt ? TX('ganaDatosPerf', JU.toques) : TX('ganaDatos', JU.toques, opt));
  $('gSig').textContent = JU.tuto ? TX('jugar') : TX('siguiente');
  $('gSig').style.display = (JU.tuto || n + 1 < NIVELES) ? '' : 'none';
}
function ganaste() {
  JU.fin = true;
  son('gana');
  const n = JU.n, opt = JU.M.plan ? JU.M.plan.length : JU.toques;
  /* EL TUTORIAL NO CUENTA COMO NIVEL: anotarlo dejaria «1 de 20 resueltos»
     sin haber resuelto ninguno, y encima `PROG.hechos` decide que niveles
     estan abiertos. Lo unico que guarda es que ya se vio. */
  if (JU.tuto) { PROG.visto = 1; guardaProg(); }
  else {
    if (PROG.hechos.indexOf(n) < 0) PROG.hechos.push(n);
    if (!PROG.mejor[n] || JU.toques < PROG.mejor[n]) PROG.mejor[n] = JU.toques;
    guardaProg();
  }
  JU.opt = opt;
  pintaGana();
  /* EL CARTEL LLEGA TARDE A PROPOSITO —hay que ver al robot pisar la meta—
     Y POR ESO HAY QUE PODER CANCELARLO: cambiando de nivel dentro de esos
     620 ms, el temporizador del nivel VIEJO abre el panel encima del nuevo y
     a partir de ahi ningun toque entra. No falla ni avisa: se ve como que el
     juego dejo de responder. */
  clearTimeout(JU.ganaT);
  JU.ganaT = setTimeout(() => { if (JU.fin) verPanel('pGana'); }, 620);
}

/* el paso de la partida: solo la animacion del mecanismo, porque el robot
   tiene la suya y el diorama la suya */
function jugPaso(dt) {
  if (JU.mecT < MEC_T) {
    JU.mecT += dt;
    mecPone(JU.mecI, mez(JU.mecDe, JU.mecA, suave(cl(JU.mecT / MEC_T, 0, 1))));
  }
  if (!JU.fin && !ocupado() && enMeta()) ganaste();
  pistaVer(pistaQue());
}

/* ══════════════════════ LOS BOTONES ══════════════════════ */
function enganchaUI() {
  const b = (id, f) => { const e = $(id); if (e) e.onclick = () => { auDesp(); son('toque'); f(); }; };
  for (const e of document.querySelectorAll('#pIdioma [data-lang]'))
    e.onclick = () => { auDesp(); son('toque'); LANG = e.dataset.lang; guardaProg();
      pintaIdioma(); pintaNiveles();
      /* elegido el idioma por primera vez, se va DERECHO al tutorial: pasar
         por el menu obligaria a encontrar un boton para aprender a jugar */
      if (!PROG.visto) { verPanel(null); cargaTuto(); } else verPanel('pMenu'); };
  b('bJugar', () => cargaNivel(proxNivel()));
  b('bNiveles', () => { pintaNiveles(); verPanel('pNiveles'); });
  b('bAjustes', () => verPanel('pAjustes'));
  b('nVolver', () => verPanel('pMenu'));
  b('aVolver', () => verPanel('pMenu'));
  b('aBorrar', () => { borraProg(); pintaNiveles(); $('aBorrar').textContent = TX('borrado');
    setTimeout(() => { $('aBorrar').textContent = TX('borrar'); }, 1400); });
  b('bPausa', () => verPanel('pPausa'));
  b('bReinicia', reinicia);
  b('bSigo', () => verPanel(null));
  b('bReini2', () => { verPanel(null); reinicia(); });
  b('bSalir', () => { verPanel('pMenu'); });
  b('bTuto', cargaTuto);
  /* desde el tutorial, SIGUIENTE es JUGAR: `JU.n` vale -1, asi que la misma
     cuenta lleva al nivel 1 sin una rama */
  b('gSig', () => cargaNivel(cl(JU.n + 1, 0, NIVELES - 1)));
  b('gNiv2', () => { pintaNiveles(); verPanel('pNiveles'); });
  b('gMenu', () => verPanel('pMenu'));
  const sl = (id, k, f) => {
    const e = $(id); if (!e) return;
    e.value = Math.round(PROG[k] * 100);
    e.oninput = () => { PROG[k] = e.value / 100; auVol(); guardaProg(); if (f) f(); };
  };
  sl('aMus', 'vol'); sl('aFx', 'fx', () => son('toque'));
}

/* ══════════════════════ SONDAS DE MAQUETACION ══════════════════════
   `getBoundingClientRect` de un elemento con `left:0;right:0` devuelve el
   ancho ENTERO aunque el texto este centrado: por eso lo que se mide son las
   cajas y no lo que se ve. Ese es justo el solapamiento que no se nota.    */
function cajas() {
  const o = {};
  for (const id of ['niv', 'sub', 'pista', 'nope', 'bPausa', 'bReinicia']) {
    const e = $(id); if (!e) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || +cs.opacity < 0.05) continue;
    o[id] = [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)];
  }
  return o;
}
function solapes() {
  const c = cajas(), ks = Object.keys(c), ch = [];
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const a = c[ks[i]], b = c[ks[j]];
    if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) ch.push(ks[i] + '×' + ks[j]);
  }
  const m = $('marco').getBoundingClientRect();
  const fuera = ks.filter(k => c[k][0] < m.left - 1 || c[k][2] > m.right + 1 ||
                               c[k][1] < m.top - 1 || c[k][3] > m.bottom + 1);
  return { cajas: c, choques: ch, fuera };
}
