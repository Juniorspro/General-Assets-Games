
/* ============================================================
   LA INTERFAZ. Pantallas, HUD y el dedo.
   El dedo escribe en ENT, que es el MISMO objeto que escribe el
   auto-jugador: con dos caminos, el respaldo es justo lo que
   nadie prueba.
   ============================================================ */

/* ---------- avisos ---------- */
let AV_T = 0, PI_TXT = null;
function aviso(txt){
  if (DEMO) return;
  const e = $('#aviso');
  e.textContent = txt; e.classList.add('on');
  clearTimeout(AV_T);
  AV_T = setTimeout(() => e.classList.remove('on'), 1500);
}
/* la pista se queda puesta: la usa el tutorial, que no es un
   cartel de dos segundos sino una consigna */
function pista(txt){
  const e = $('#pista');
  PI_TXT = txt;
  if (txt){ e.textContent = txt; e.classList.add('on'); }
  else e.classList.remove('on');
}

/* ---------- HUD ----------
   Se llama en cada cuadro, asi que cada campo se compara antes de
   escribir: escribir en el DOM sesenta veces por segundo para poner
   el mismo texto obliga al navegador a rehacer el layout de gusto. */
const HUDV = {vidas:-1, vidaMax:-1, ener:-1, piso:-1, salas:'', arma:'', mon:-1};
function hudPinta(){
  const P = JU.P; if (!P) return;

  if (P.vida !== HUDV.vidas || P.vidaMax !== HUDV.vidaMax){
    HUDV.vidas = P.vida; HUDV.vidaMax = P.vidaMax;
    let h = '';
    for (let i = 0; i < P.vidaMax; i++) h += '<div class="cor' + (i < P.vida ? ' on' : '') + '"><i></i></div>';
    $('#vidas').innerHTML = h;
  }

  const e = Math.round(P.ener / P.eMax * 100);
  if (e !== HUDV.ener){ HUDV.ener = e; $('#barE b').style.width = e + '%'; }

  if (JU.piso !== HUDV.piso){ HUDV.piso = JU.piso; $('#piso').textContent = T('piso', JU.piso); }

  if (JU.pisoObj){
    let li = 0;
    for (const s of JU.pisoObj.salas) if (s.limpia) li++;
    const t = li + '/' + JU.pisoObj.salas.length;
    if (t !== HUDV.salas){ HUDV.salas = t; $('#salas').textContent = t; }
  }

  const a = TARMA(ARMAS[P.arma].id);
  if (a !== HUDV.arma){ HUDV.arma = a; $('#arma').textContent = a; }

  if (JU.monedas !== HUDV.mon){ HUDV.mon = JU.monedas; $('#monN').textContent = '◈ ' + JU.monedas; }
}
function hudReset(){ HUDV.vidas = -1; HUDV.ener = -1; HUDV.piso = -1; HUDV.salas = ''; HUDV.arma = ''; HUDV.mon = -1; }

/* el boton de USAR solo existe cuando hay algo que usar */
let CERCA_K = null;
function cerca(k){
  if (k === CERCA_K) return;
  CERCA_K = k;
  $('#bUsa').classList.toggle('ver', !!k);
}

/* ---------- pantallas ---------- */
/* LA DEMO NO PUEDE ABRIR UN PANEL DE PARTIDA, y por eso la guarda va aca y no
   en gana()/pierde()/bajaPiso(): con tres sitios, el cuarto que se agregue
   manana queda sin cubrir. Los dos paneles del menu si pasan — son los suyos,
   la demo no los abre nunca, y sin esta excepcion volver de #pIdioma dejaria
   el menu sin panel. */
const PAN_MENU = ['#pMenu', '#pIdioma'];
function verPan(id){
  if (DEMO && PAN_MENU.indexOf(id) < 0) return;
  document.querySelectorAll('.pan').forEach(p => p.classList.toggle('on', '#' + p.id === id));
  document.body.classList.toggle('jugando', id === null && JU.modo === 'juega');
}

/* ---------- la demo del menu ---------- */
/* La juega el MISMO auto-jugador que valida los pisos, asi que no hay una
   segunda animacion que mantener: lo que se ve detras del menu es el juego. */
function demoArranca(){
  if (DEMO) return;                     /* ya esta corriendo: no se reinicia */
  DEMO = true;
  BOT.on = true; BOT.modo = 'honesto'; BOT.t = 0;
  arrancaPartida();
  TUT.on = false;
  pista(null);
}
function demoCorta(){
  DEMO = false; BOT.on = false;
  JU.modo = 'menu';
}
/* la demo no puede morirse ni ganar: vuelve a empezar y sigue */
function demoPaso(){
  if (!DEMO) return;
  if (JU.modo === 'mejora') eligeMejora(mejorElige('honesto'));
  else if (JU.modo !== 'juega') demoArranca();
}

function pintaMejoras(){
  $('#mjT').textContent = T('mjT');
  $('#mjS').textContent = T('mjS');
  const L = $('#mejL'); L.innerHTML = '';
  MEJ_OPC.forEach((m, i) => {
    const t = TMEJ(m.id);
    const b = document.createElement('button');
    b.className = 'mj'; b.innerHTML = '<b></b><i></i>';
    b.querySelector('b').textContent = t[0];
    b.querySelector('i').textContent = t[1];
    b.addEventListener('click', () => { son('ui'); eligeMejora(i); });
    L.appendChild(b);
  });
}

function pintaFin(){
  const g = JU.gano;
  const t = $('#fiT');
  t.textContent = T(g ? 'gana' : 'muerto');
  t.className = g ? 'bien' : 'mal';
  $('#fiS').textContent = T(g ? 'ganaS' : 'muertoS');
  const m = Math.floor(JU.seg / 60), s = Math.floor(JU.seg % 60);
  $('#fiD').textContent = T('fiD', JU.piso, JU.bajas, JU.monedas,
                            m + ':' + (s < 10 ? '0' : '') + s);
  $('#fiOtra').textContent = T('otra');
  $('#fiMenu').textContent = T('menu');
}

/* ---------- idioma ----------
   Nada de texto suelto: todo sale de la tabla, y cambiar de idioma
   REPINTA lo que ya esta en pantalla. Escrito una sola vez al
   arrancar, un panel abierto se queda en el idioma anterior. */
function pintaIdioma(){
  document.documentElement.lang = IDIOMA;
  $('#idT').textContent = T('idT');
  $('#mSub').textContent = T('sub');
  $('#mJugar').textContent = T('jugar');
  $('#mTuto').textContent = T('tuto');
  $('#mIdioma').textContent = T('idioma');
  $('#mRec').textContent = GUARDA.rec > 0 ? T('rec', GUARDA.rec) : '';
  $('#pie').textContent = T('pie');
  $('#paT').textContent = T('paT');
  $('#paSigue').textContent = T('sigue');
  $('#paMenu').textContent = T('menu');
  $('#bUsa').textContent = T('usar');
  document.querySelectorAll('#idL .b').forEach(b =>
    b.style.opacity = (b.dataset.l === IDIOMA ? '1' : '.55'));
  hudReset(); hudPinta();
  if (JU.modo === 'mejora') pintaMejoras();
  if (JU.modo === 'fin') pintaFin();
  tutRepinta();
}

function ponIdioma(l){
  IDIOMA = l; GUARDA.idioma = l; guardaEscribe();
  pintaIdioma();
}

function armaIdiomas(){
  const L = $('#idL'); L.innerHTML = '';
  [['es','ESPAÑOL'],['en','ENGLISH'],['pt','PORTUGUÊS']].forEach(([k, n]) => {
    const b = document.createElement('button');
    b.className = 'b'; b.dataset.l = k; b.textContent = n;
    b.addEventListener('click', () => {
      son('ui'); ponIdioma(k);
      if (JU.modo === 'menu' || DEMO) alMenu();
    });
    L.appendChild(b);
  });
}

/* ---------- menu ---------- */
/* UNA SOLA PUERTA AL MENU. El arranque, el boton de idioma, la pausa y el
   panel de fin entran todos por aca: repartido, el proximo camino que se
   agregue se olvida de arrancar la demo y nadie se entera. */
function alMenu(){
  if (!DEMO){ BOT.on = false; JU.modo = 'menu'; }   /* venia una partida de verdad */
  musNivel(.26, MUS_MENU); musica('m_menu');
  tutCorta();
  pintaIdioma();
  verPan('#pMenu');
  demoArranca();                        /* no hace nada si la demo ya esta corriendo */
}
function juegaYa(){
  demoCorta();                          /* el jugador toma el mando */
  arrancaPartida();
  tutArranca();
  hudReset(); hudPinta();
  verPan(null);
  musNivel(.55, MUS_JUEGO); musica('m_pelea');
}
function pausa(v){
  if (v && JU.modo !== 'juega') return;
  if (!v && JU.modo !== 'pausa') return;
  JU.modo = v ? 'pausa' : 'juega';
  verPan(v ? '#pPausa' : null);
}

function armaBotones(){
  $('#mJugar').addEventListener('click', () => { son('ui'); juegaYa(); });
  $('#mTuto').addEventListener('click', () => {
    son('ui'); GUARDA.visto = 0; guardaEscribe(); juegaYa();
  });
  $('#mIdioma').addEventListener('click', () => { son('ui'); verPan('#pIdioma'); });
  $('#paSigue').addEventListener('click', () => { son('ui'); pausa(false); });
  $('#paMenu').addEventListener('click', () => { son('ui'); alMenu(); });
  $('#fiOtra').addEventListener('click', () => { son('ui'); juegaYa(); });
  $('#fiMenu').addEventListener('click', () => { son('ui'); alMenu(); });
  $('#bPau').addEventListener('pointerdown', ev => { ev.preventDefault(); son('ui'); pausa(true); });
}

/* ---------- el dedo ----------
   El joystick se agarra desde CUALQUIER punto de la mitad
   izquierda y no solo desde el circulo dibujado: un pulgar no
   apunta, se apoya. El aro dibujado dice donde esta el centro. */
const JOY = {id:-1, cx:0, cy:0, r:58};
/* El dedo y el teclado NO escriben en ENT directamente: cada uno
   deja su estado y entradaPaso() los junta. Escribiendo los dos en
   ENT, sostener FUEGO sin mover el joystick lo apagaba en el cuadro
   siguiente, porque el teclado ponia false encima. */
const DEDO = {x:0, y:0, fuego:false, esq:false};
function joyPone(dx, dy){
  const m = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, m / JOY.r);
  DEDO.x = dx / m * k; DEDO.y = dy / m * k;
  $('#joyP').style.transform = 'translate(' + (dx / m * JOY.r * k) + 'px,' + (dy / m * JOY.r * k) + 'px)';
}
function joySuelta(){
  JOY.id = -1; DEDO.x = 0; DEDO.y = 0;
  $('#joyP').style.transform = '';
}

function armaDedo(){
  const D = $('#dedo');

  const bt = (sel, abajo, arriba) => {
    const e = $(sel);
    e.addEventListener('pointerdown', ev => {
      ev.preventDefault(); ev.stopPropagation();
      e.setPointerCapture && e.setPointerCapture(ev.pointerId);
      e.classList.add('on'); abajo();
    });
    const fin = ev => { ev.preventDefault(); e.classList.remove('on'); if (arriba) arriba(); };
    e.addEventListener('pointerup', fin);
    e.addEventListener('pointercancel', fin);
  };
  bt('#bTira', () => { DEDO.fuego = true; }, () => { DEDO.fuego = false; });
  bt('#bEsq',  () => { DEDO.esq   = true; }, () => { DEDO.esq   = false; });
  bt('#bUsa',  () => { ENT.usar   = true; });   // flanco: lo consume f.js

  D.addEventListener('pointerdown', ev => {
    if (JOY.id !== -1) return;
    const r = $('#marco').getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (x > r.width * .52) return;              // esa mitad es de los botones
    const j = $('#joy').getBoundingClientRect();
    JOY.id = ev.pointerId;
    JOY.cx = j.left + j.width / 2 - r.left;
    JOY.cy = j.top  + j.height / 2 - r.top;
    D.setPointerCapture && D.setPointerCapture(ev.pointerId);
    joyPone(x - JOY.cx, y - JOY.cy);
    ev.preventDefault();
  });
  D.addEventListener('pointermove', ev => {
    if (ev.pointerId !== JOY.id) return;
    const r = $('#marco').getBoundingClientRect();
    joyPone(ev.clientX - r.left - JOY.cx, ev.clientY - r.top - JOY.cy);
    ev.preventDefault();
  });
  const sol = ev => { if (ev.pointerId === JOY.id) joySuelta(); };
  D.addEventListener('pointerup', sol);
  D.addEventListener('pointercancel', sol);
}

/* ---------- teclado ----------
   No es un extra: sin el, el juego no se puede probar ni jugar en
   una notebook, que es donde se lo mide. */
const TEC = {};
function armaTeclas(){
  addEventListener('keydown', ev => {
    TEC[ev.code] = true;
    if (ev.code === 'Escape'){ pausa(JU.modo === 'juega'); }
    if (ev.code === 'KeyE') ENT.usar = true;
    if (ev.code === 'Space' || ev.code === 'ShiftLeft') ev.preventDefault();
  });
  addEventListener('keyup', ev => { TEC[ev.code] = false; });
  addEventListener('blur', () => { for (const k in TEC) TEC[k] = false; });
}
/* junta dedo y teclado en ENT, una vez por cuadro. El bot escribe
   en ENT por su cuenta, asi que mientras corre nadie lo pisa. */
function entradaPaso(){
  if (BOT.on) return;
  let x = 0, y = 0;
  if (TEC.KeyA || TEC.ArrowLeft)  x -= 1;
  if (TEC.KeyD || TEC.ArrowRight) x += 1;
  if (TEC.KeyW || TEC.ArrowUp)    y -= 1;
  if (TEC.KeyS || TEC.ArrowDown)  y += 1;
  const m = Math.hypot(x, y);
  if (JOY.id !== -1){ ENT.x = DEDO.x; ENT.y = DEDO.y; }
  else if (m > 0)   { ENT.x = x / m;  ENT.y = y / m;  }
  else              { ENT.x = 0;      ENT.y = 0;      }
  ENT.fuego = DEDO.fuego || !!TEC.Space;
  ENT.esq   = DEDO.esq   || !!(TEC.ShiftLeft || TEC.ShiftRight);
}
