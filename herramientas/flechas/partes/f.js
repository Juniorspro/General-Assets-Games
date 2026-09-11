/* ══════════════════════════════════════════════════════════════════════════
   F · EL JUEGO
   Un verbo: tocar una flecha. Todo lo demas sale de `puedeSalir`, que es la
   misma funcion que usan el generador y el validador.

   NO HAY DESHACER, Y NO ES UN OLVIDO. Sacar una pieza solo puede LIBERAR
   rayos —nunca taparlos— asi que el conjunto de legales solo crece: el
   tablero no se puede trabar y el orden no se puede arruinar. Un boton de
   deshacer aca no arreglaria nada y estaria diciendo que el juego se puede
   arruinar. Lo que si cuesta es equivocarse, y eso lo cobran los corazones.
   ══════════════════════════════════════════════════════════════════════════ */

function nuevoNivel(m, n, tut) {
  JU.m = m; JU.n = n; JU.tut = !!tut;
  JU.T = tut ? tabTutorial() : genTablero(cfgNivel(m, n));
  JU.tinte = tut ? '#181614' : MUNDOS[m].tinte;
  JU.vidas = VIDAS; JU.toques = 0; JU.fallos = 0; JU.rehace = 0;
  JU.fase = 'juega'; JU.sal = 0;
  for (const p of JU.T.piezas) { p.sal = 0; p.mal = 0; p.tmb = 0; p.tmbD = [0, 0]; }
  encuadre();
  if (!PANEL) { $('hud').classList.remove('off'); $('pie').classList.remove('off'); }
  pintaHud();
  auAcorde(tut ? 0 : m);
  if (JU.tut) tutArranca(); else pistaVer(null);
}

/* Reiniciar es volver a generar CON LA MISMA SEMILLA: el tablero tiene que
   ser el mismo, porque lo que uno dedujo del intento anterior es justamente
   lo que este juego pide.                                                  */
function reinicia() { nuevoNivel(JU.m, JU.n, JU.tut); son('ui'); }

function pintaHud() {
  const v = $('vidas');
  if (v.children.length !== VIDAS) {
    v.innerHTML = '';
    for (let i = 0; i < VIDAS; i++) { const d = document.createElement('div'); d.className = 'cor'; v.appendChild(d); }
  }
  for (let i = 0; i < VIDAS; i++) v.children[i].classList.toggle('ida', i >= JU.vidas);
  const T = JU.T;
  if (T) {
    const q = vivas(T).length;
    $('restan').innerHTML = '<b>' + q + '</b> / ' + T.piezas.length;
    $('toques').textContent = JU.toques;
  }
  $('nrM').textContent = JU.tut ? TX('tutTit') : nomMundo(JU.m);
  $('nrN').textContent = JU.tut ? '' : TX('nivel', JU.m + 1, JU.n + 1);
}

/* ── el toque ── */
function toqueEn(px, py) {
  if (JU.fase !== 'juega') return;
  /* SIN VIDAS EL TABLERO NO ESCUCHA MAS. Con el reinicio colgado de un
     `setTimeout`, entre el ultimo corazon y el tablero nuevo quedaban 780 ms
     en los que se podia seguir tocando: medido, un jugador que machaca
     TERMINA EL NIVEL con las vidas en negativo y se lo cuenta como hecho.  */
  if (JU.rehace > 0) return;
  const T = JU.T, p = piezaEn(px, py);
  if (!p) return;
  if (JU.tut && !tutDeja(p)) return;
  JU.toques++;
  if (puedeSalir(T, p)) saca(p); else falla(p);
  pintaHud();
}

function saca(p) {
  const T = JU.T;
  const R = rayo(T, p).length;
  quita(T, p); p.fuera = true;
  /* la duracion sale del LARGO DEL CAMINO y no de un numero fijo: una flecha
     de dos celdas pegada al borde y una de siete que cruza el tablero no
     pueden tardar lo mismo o la larga se ve teletransportada.              */
  const cel = (p.cel.length - 1) + R + 1.4;
  p.salDur = cl(0.10 + cel * 0.045, 0.20, 0.60);
  p.sal = 0.0001;
  son('sale');
  if (JU.tut) tutMira('saca', p);
  if (vivas(T).length === 0) { JU.sal = 0.45; }
}

function falla(p) {
  const T = JU.T, b = quienBloquea(T, p);
  p.mal = 0.34;
  if (b >= 0) {
    const q = T.piezas[b], d = DIR[dirDe(p)];
    q.tmb = 0.34; q.tmbD = [d[0], d[1]];
  }
  JU.fallos++;
  son('mal');
  /* EN EL TUTORIAL EL ERROR NO CUESTA, y no es una concesion: el paso 2 PIDE
     que se toque la que no puede. Cobrar un corazon por hacer lo que el
     juego acaba de mandar a hacer es enseniar exactamente lo contrario.   */
  if (JU.tut) { tutMira('falla', p); pintaHud(); return; }
  const v = $('vidas').children[Math.max(0, JU.vidas - 1)];
  JU.vidas = Math.max(0, JU.vidas - 1);
  if (v) { v.classList.remove('late'); void v.offsetWidth; v.classList.add('late'); }
  if (JU.vidas > 0) { pistaVer('pistaTrabada', 1600); return; }
  /* el reinicio va en el RELOJ DE LA SIMULACION y no en un temporizador de
     pared: asi dura lo mismo a 30 y a 144 cuadros, y sobre todo asi hay UN
     solo sitio que decide que el tablero no escucha.                       */
  son('vida');
  avisa(TX('sinVidas'), 1100);
  JU.rehace = 0.78;
}

/* ── el reloj ── */
function paso(dt) {
  const T = JU.T; if (!T) return;
  for (const p of T.piezas) {
    if (p.sal > 0) { p.sal += dt / p.salDur; if (p.sal >= 1) p.sal = 0; }
  }
  if (JU.sal > 0) {
    JU.sal -= dt;
    if (JU.sal <= 0) { JU.sal = 0; gana(); }
  }
  if (JU.rehace > 0) {
    JU.rehace -= dt;
    if (JU.rehace <= 0) { JU.rehace = 0; nuevoNivel(JU.m, JU.n, JU.tut); avisa(TX('sinVidasSub'), 900); }
  }
}

/* EL PANEL DE FIN GUARDA LO QUE DESCRIBE, NO EL TEXTO YA RESUELTO. Con las
   cuatro cadenas escritas en `gana()`, cambiar de idioma con el panel puesto
   lo dejaba en el idioma anterior: el titulo, el subtitulo, la ficha y el
   boton. Es el mismo defecto que en Z Force costo 107 claves. `FIN` es el
   estado y `pintaFin()` el unico que escribe — lo llaman `gana()` y
   `pintaIdioma()`, asi que no pueden decir cosas distintas.                */
let FIN = null;
function pintaFin() {
  if (!FIN) return;
  if (FIN.tut) {
    $('fTit').textContent = TX('tutGana');
    $('fSub').textContent = TX('tutGanaSub');
    $('fDatos').textContent = TX('tutDatos');
    $('fSig').textContent = TX('jugar');
    return;
  }
  $('fTit').textContent = TX(FIN.perf ? 'ganaPerf' : 'gana');
  $('fSub').textContent = TX(FIN.perf ? 'ganaPerfSub' : 'ganaSub');
  $('fDatos').textContent = TX('datos', FIN.piezas, FIN.toques);
  $('fSig').textContent = TX('siguiente');
}

function gana() {
  if (JU.fase !== 'juega') return;
  JU.fase = 'fin';
  const perf = JU.fallos === 0;
  if (JU.tut) {
    son('gana'); auAgacha(0.25, 1.2);
    FIN = { tut: true };
    pintaFin();
    $('fRe').style.display = 'none'; $('fMenu').style.display = 'none';
    $('fSig').style.display = '';
    PROG.visto = 1; guardaProg();
    verPanel('pFin');
    return;
  }
  son(perf ? 'perf' : 'gana'); auAgacha(0.25, 1.4);
  anota(JU.m, JU.n, perf);
  FIN = { tut: false, perf, piezas: JU.T.piezas.length, toques: JU.toques };
  pintaFin();
  $('fRe').style.display = ''; $('fMenu').style.display = '';
  const k = idNiv(JU.m, JU.n);
  $('fSig').style.display = (k + 1 < NIVELES) ? '' : 'none';
  verPanel('pFin');
}

function siguiente() {
  const k = idNiv(JU.m, JU.n) + 1;
  if (k >= NIVELES) { alMenu(); return; }
  cierraPanel(); nuevoNivel((k / NIV_MUNDO) | 0, k % NIV_MUNDO, false);
}

/* ── avisos y pista ── */
let AV_T = 0;
function avisa(txt, ms) {
  const a = $('aviso'); a.textContent = txt; a.classList.add('on');
  clearTimeout(AV_T); AV_T = setTimeout(() => a.classList.remove('on'), ms || 1000);
}
let PI_T = 0, PI_K = null;
function pistaVer(k, ms) {
  const e = $('pista');
  clearTimeout(PI_T);
  if (!k) { PI_K = null; e.classList.remove('on'); return; }
  PI_K = k; e.textContent = TX(k); e.classList.add('on');
  if (ms) PI_T = setTimeout(() => { if (PI_K === k) { PI_K = null; e.classList.remove('on'); } }, ms);
}
/* Repintar la pista al cambiar de idioma: la escribe una sola vez por paso,
   asi que sin esto se queda en el idioma anterior hasta que el jugador
   avanza — y en el tutorial eso es medio tutorial en otro idioma.          */
function pistaRepinta() { if (PI_K) $('pista').textContent = TX(PI_K); }
