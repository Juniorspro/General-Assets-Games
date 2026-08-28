/* ===================== LAS PANTALLAS ===================== */
const PANTALLAS=['pIdioma','pMenu','pFin'];
let pant='idioma';
function verPantalla(p){
  pant=p;
  for(const id of PANTALLAS) document.getElementById(id).classList.remove('ver');
  const m={ idioma:'pIdioma', menu:'pMenu', fin:'pFin' };
  if(m[p]) document.getElementById(m[p]).classList.add('ver');
  document.body.classList.toggle('jugando', p==='juego');
  if(p!=='juego') guia('','');
}
function pintarIdioma(){
  document.documentElement.lang=IDIOMA;
  document.getElementById('bTut').textContent=TX('tutorial');
  document.getElementById('bJugar').textContent=TX('jugar');
  document.getElementById('bIdioma').textContent=TX('idioma');
  document.getElementById('bOtra').textContent=TX('otra');
  document.getElementById('bMenu').textContent=TX('menu');
  pintarMenu(); pintarCam();
}
/* EL BOTON DE JUGAR ESTA BLOQUEADO HASTA QUE EL TUTORIAL ESTE HECHO, y el pie dice por que. Se pidio
   asi con todas las letras. Un boton apagado sin explicacion se lee a juego roto; con la linea de
   abajo se lee a orden. */
function pintarMenu(){
  const bj=document.getElementById('bJugar');
  bj.disabled=!TUT.hecho;
  bj.classList.toggle('lleno', TUT.hecho);
  document.getElementById('bTut').classList.toggle('lleno', !TUT.hecho);
  document.getElementById('mPie').innerHTML = TUT.hecho? TX('menuPie') : TX('menuBloq');
}
const camAviso=document.getElementById('camAviso');
const CAM_MOTIVO={ permiso:'camErrPermiso', camara:'camErrCamara', cdn:'camErrCdn',
                   modelo:'camErrCdn', insegura:'camErrInsegura' };
/* EL MOTIVO SE ESCRIBE Y SE QUEDA. Un juego que se maneja con la camara y no la pide se ve roto, y
   sin decir por que no hay nada que el jugador pueda hacer al respecto. */
function pintarCam(){
  if(!camAviso) return;
  camAviso.classList.remove('bien','mal');
  if(MANO.estado==='carga'){ camAviso.textContent=TX('camPide'); return; }
  if(MANO.estado==='lista'){ camAviso.textContent=TX('camOk'); camAviso.classList.add('bien'); return; }
  if(MANO.error){ camAviso.textContent=TX(CAM_MOTIVO[MANO.error]||'camNo'); camAviso.classList.add('mal'); return; }
  camAviso.textContent=TX('camNo');
}
(function(){
  const c=document.getElementById('idBotones');
  for(const [cod,nom] of IDIOMAS){
    const b=document.createElement('button'); b.className='bot'; b.textContent=nom;
    /* el idioma es el primer toque de la sesion, asi que es donde se enciende el audio: ningun
       navegador deja sonar nada sin un gesto */
    b.onclick=()=>{ audioIniciar(); IDIOMA=cod;
      try{ localStorage.setItem('rezuno_idioma',cod); }catch(e){}
      pintarIdioma(); verPantalla('menu'); };
    c.appendChild(b);
  }
})();
document.getElementById('bIdioma').onclick=()=>verPantalla('idioma');

/* LA CAMARA SE PIDE AL EMPEZAR, no en un ajuste. En RECREO el permiso colgaba de un boton chico que
   ya aparecia elegido, asi que nadie lo tocaba y el juego parecia no usar la camara. Aca cuelga de
   los dos botones que todos tocan, y si falla se juega tocando la pantalla. */
async function arrancar(esTutorial){
  audioIniciar();
  if(!MANO.on && MANO.estado!=='carga'){ await manosIniciar(); pintarCam(); }
  if(esTutorial){ verPantalla('juego'); tutorialEmpezar(); }
  else { TUT.on=false; guia('',''); repartir((Date.now()&0x7fffffff)||1);
         G.fase='juego'; verPantalla('juego'); }
}
document.getElementById('bTut').onclick=()=>arrancar(true);
document.getElementById('bJugar').onclick=()=>arrancar(false);
document.getElementById('salir').onclick=()=>{ G.fase='menu'; TUT.on=false; guia('','');
                                              verPantalla('menu'); pintarMenu(); };
document.getElementById('bOtra').onclick=()=>arrancar(false);
document.getElementById('bMenu').onclick=()=>{ verPantalla('menu'); pintarMenu(); };

/* ===================== LO QUE HACE UN PELLIZCO =====================
   UN SOLO SITIO PARA LOS DOS CAMINOS. El pellizco de la camara y el toque del dedo terminan los dos
   aca, con las mismas coordenadas de diseño. Si fueran dos funciones, el respaldo tactil se
   desincronizaria del juego de verdad en cuanto se agregue una zona nueva — y el respaldo es
   justamente lo que nadie prueba. */
function activar(x,y){
  if(G.fase!=='juego') return false;
  const z=zonaEn(x,y);
  if(!z || !z.activo) return false;
  if(z.tipo==='carta') return seleccionar(z.i);
  if(z.tipo==='tirar') return tirarSel();
  if(z.tipo==='dejar'){ const r=soltar(); tutDejo(); return r; }
  if(z.tipo==='color') return elegirColor(z.i);
  if(z.tipo==='mazo')  return robarJugador();
  return false;
}
/* EL RESPALDO TACTIL NO ES UN EXTRA: sin camara —permiso negado, sin camara, http— el juego seria
   imposible de jugar, y eso no es degradar, es romperse. */
lienzo.addEventListener('pointerdown', e=>{
  const [x,y]=dePagina(e.clientX, e.clientY);
  activar(x,y);
}, {passive:true});

/* ===================== EL BUCLE =====================
   Un solo reloj y un solo dibujo. El pellizco se consume ACA y no dentro del dibujo: leerlo mientras
   se pinta significaria que el orden en que se dibujan las zonas decide cual gana, y ese es el tipo
   de defecto que aparece recien cuando se agrega un boton nuevo seis meses despues. */
let ultimo=performance.now();
function bucle(){
  requestAnimationFrame(bucle);
  const ahora=performance.now();
  const dt=Math.min(0.25, (ahora-ultimo)/1000); ultimo=ahora;
  if(G.fase==='juego'){
    if(tomarPinza()) activar(MANO.x*DIS_W, MANO.y*LH);
    partidaTick(dt);
    tutTick(dt);
    pintarMesa();
  }
  /* LA PANTALLA DE FINAL SE MIRA AFUERA DEL `if`, Y ESE ERA UN DEFECTO DE VERDAD. Estaba adentro, o
     sea que solo se enteraba en el mismo cuadro en que la partida terminaba. Con el pellizco eso
     siempre pasa —el pellizco se consume dentro del bucle—, pero el RESPALDO TACTIL entra por
     pointerdown, que corre fuera: ganando de un toque, `fase` quedaba en 'fin' y en el cuadro
     siguiente el `if` de arriba ya era falso, asi que nadie mostraba nada. El juego se quedaba
     congelado en la ultima imagen. Encontrado fotografiando el final, no leyendo. */
  if(G.fase==='fin' && pant!=='fin'){
    const gano=G.gana===J_VOS;
    document.getElementById('finT').textContent = gano? TX('ganaste')
      : TX('perdiste',{n:TX(G.gana===J_IZQ?'bot1':'bot2')});
    document.getElementById('finS').textContent = gano? TX('ganasteS') : TX('perdisteS');
    verPantalla('fin');
  }
  const mk=document.getElementById('marcador');
  if(mk && G.fase==='juego') mk.textContent = TUT.on? 'TUTORIAL' : '';
}
pintarIdioma(); verPantalla('idioma');
bucle();
