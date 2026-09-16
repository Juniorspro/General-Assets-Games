
/* ============================================================
   LOS PANELES

   El DOM de este juego es cuatro paneles y nada mas: idioma,
   menu, pausa y final. Todo lo demas se dibuja en el lienzo, asi
   que hay UN solo sistema de toque — y estos cuatro son
   justamente lo que tiene que ser texto de verdad, porque se
   traduce y tiene que leerse nitido en cualquier densidad.
   ============================================================ */

function verPanel(id){
  document.querySelectorAll('.pan').forEach(p => p.classList.toggle('on', p.id === id));
}

/* ---------- idioma ----------
   Se pregunta ANTES del menu. Elegir el idioma dentro de un menu
   ya escrito en un idioma que no entendes no sirve: para cuando
   lo encontras ya leiste todo lo demas sin entenderlo. */
const IDIOMAS = [['es', 'ESPAÑOL'], ['en', 'ENGLISH'], ['pt', 'PORTUGUÊS']];

function idiomaArma(){
  const l = $('#idL');
  l.innerHTML = '';
  IDIOMAS.forEach(([k, n]) => {
    const b = document.createElement('button');
    b.className = 'b'; b.textContent = n;
    b.onclick = () => { ponIdioma(k); alMenu(); };
    l.appendChild(b);
  });
}
function ponIdioma(k){
  IDIOMA = k;
  GUARDA.idioma = k; guardaEscribe();
  pintaIdioma();
}

/* UNA sola funcion repinta TODO el texto del DOM. Escrito boton
   por boton donde se arma cada panel, cambiar de idioma con un
   panel ya abierto lo deja en el anterior — el defecto que en Z
   Force costo 107 claves. */
function pintaIdioma(){
  $('#idT').textContent = T('idT');
  $('#mSub').textContent = T('sub');
  $('#mJugar').textContent = T('jugar');
  $('#mTuto').textContent = T('tuto');
  $('#mIdioma').textContent = T('idioma');
  $('#pie').textContent = T('pie');
  $('#mRec').textContent = GUARDA.rec ? T('rec', GUARDA.rec) : '';
  $('#paT').textContent = T('paT');
  $('#paSigue').textContent = T('sigue');
  $('#paMenu').textContent = T('menu');
  $('#fiOtra').textContent = T('otra');
  $('#fiMenu').textContent = T('menu');
  /* el panel de final se repinta con SU estado guardado y no con
     el del juego: al terminar una corrida el estado ya se reseteo,
     asi que leerlo de JU mostraria la partida siguiente */
  if (FIN.vista) finEscribe();
}

/* ---------- menu ---------- */
function alMenu(){
  JU.modo = 'menu';
  TUTO.on = false;
  DEMO = false;
  pintaIdioma();
  verPanel('pMenu');
}

function juegaArranca(conTuto){
  partidaNueva();
  cieganNueva();
  JU.modo = 'ciega';
  COM_SEL = -1;
  FIN.vista = false;
  verPanel('');
  if (conTuto) tutoArranca(); else TUTO.on = false;
}

/* ---------- pausa ---------- */
let MODO_PREV = 'juega';
function pausaAbre(){
  if (JU.modo === 'pausa') return;
  MODO_PREV = JU.modo;
  JU.modo = 'pausa';
  son('ui');
  verPanel('pPausa');
}
function pausaCierra(){
  JU.modo = MODO_PREV;
  verPanel('');
}

/* ---------- final ---------- */
const FIN = { vista:false, gano:false, ante:0, manos:0, dinero:0, mejor:0 };

function finMuestra(gano){
  FIN.vista = true;
  FIN.gano = gano;
  FIN.ante = JU.ante;
  FIN.manos = JU.totManos;
  FIN.dinero = JU.dinero;
  FIN.mejor = JU.mejorMano;
  if (JU.ante > GUARDA.rec){ GUARDA.rec = JU.ante; guardaEscribe(); }
  son(gano ? 'gana' : 'pierde');
  finEscribe();
  verPanel('pFin');
}
function finEscribe(){
  const t = $('#fiT');
  t.textContent = FIN.gano ? T('gana') : T('muerto');
  t.className = FIN.gano ? 'bien' : 'mal';
  $('#fiS').textContent = FIN.gano ? T('ganaS') : T('muertoS');
  $('#fiD').textContent = T('fiD', FIN.ante, FIN.manos, FIN.dinero, FIN.mejor);
}

/* ---------- cableado ---------- */
function panelesArma(){
  idiomaArma();
  $('#mJugar').onclick  = () => { audioDespierta(); juegaArranca(!GUARDA.visto); };
  $('#mTuto').onclick   = () => { audioDespierta(); juegaArranca(true); };
  $('#mIdioma').onclick = () => verPanel('pIdioma');
  $('#paSigue').onclick = () => pausaCierra();
  $('#paMenu').onclick  = () => alMenu();
  $('#fiOtra').onclick  = () => juegaArranca(false);
  $('#fiMenu').onclick  = () => alMenu();
  /* el idioma guardado salta la primera pantalla; la primera vez
     no hay ninguno y hay que preguntar */
  if (GUARDA.idioma){ IDIOMA = GUARDA.idioma; pintaIdioma(); alMenu(); }
  else { pintaIdioma(); verPanel('pIdioma'); }
}
