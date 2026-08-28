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
function activar(fx, fy){
  if(G.fase!=='juego') return false;
  const o=pickEn(fx, fy);
  if(!o) return false;
  const u=o.userData;
  if(!u.activo) return false;
  if(u.tipo==='carta') return seleccionar(u.i);
  if(u.tipo==='tirar') return tirarSel();
  if(u.tipo==='dejar'){ const r=soltar(); tutDejo(); return r; }
  if(u.tipo==='color') return elegirColor(u.i);
  if(u.tipo==='mazo')  return robarJugador();
  return false;
}
/* EL RESPALDO TACTIL NO ES UN EXTRA: sin camara —permiso negado, sin camara, http— el juego seria
   imposible de jugar, y eso no es degradar, es romperse. */
lienzo.addEventListener('pointerdown', e=>{
  /* a fraccion de pantalla, que es la MISMA unidad en la que llega la mano: asi el toque y el
     pellizco entran por la misma funcion y no pueden desincronizarse */
  const r=marco.getBoundingClientRect();
  activar((e.clientX-r.left)/Math.max(1,r.width), (e.clientY-r.top)/Math.max(1,r.height));
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
    /* LA CAMARA SE MUEVE ANTES DE TODO LO DEMAS. El rayo del pellizco sale de la camara, asi que si
       se moviera despues, el pellizco de este cuadro se resolveria con la camara del anterior. */
    /* la ganancia 1,2 hace que unos diecisiete grados de cabeza lleguen al tope de veinte de vista:
       girar la cabeza mas que eso para mirar una pantalla que esta al frente no lo hace nadie */
    camaraGiro(CARA.hay? CARA.giro*1.2 : 0, dt);
    if(tomarPinza()) activar(MANO.x, MANO.y);
    partidaTick(dt);
    tutTick(dt);
    armarMesa();
    pintarTut();
    pintarAro();
    manosPintar(dt);
    render.render(escena, camara);
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
  pintarHud();
}

/* ===================== LOS ROTULOS =====================
   SE ESCRIBEN SOLO CUANDO CAMBIAN. Escribir en el DOM cada cuadro obliga al navegador a recalcular el
   layout sesenta veces por segundo para poner el mismo texto: es trabajo tirado y ademas se mezcla con
   las lecturas de tamaño del render. Se guarda lo ultimo escrito y se compara. */
const _hud={};
function ponerTexto(el, t){ if(!el) return; if(_hud[el.id]===t) return; _hud[el.id]=t; el.textContent=t; }
function ponerClase(el, c, si){ if(!el) return; const k=el.id+'|'+c;
  if(_hud[k]===si) return; _hud[k]=si; el.classList.toggle(c, si); }
function pintarHud(){
  const mk=document.getElementById('marcador');
  ponerTexto(mk, (G.fase==='juego' && TUT.on)? 'TUTORIAL' : '');
  if(G.fase!=='juego') return;
  const rivs=[[J_IZQ,'bot1',1],[J_DER,'bot2',2]];
  for(const [j,clave,k] of rivs){
    const n=G.manos[j].length;
    ponerTexto(document.getElementById('rivN'+k), TX(clave));
    ponerTexto(document.getElementById('rivC'+k), n===1? TX('unaCarta') : TX('cartas',{n}));
    ponerClase(document.getElementById('rivC'+k), 'uno', n===1);
    const cont=document.getElementById('rivN'+k).parentNode;
    cont.classList.toggle('juega', G.turno===j);
  }
  document.body.classList.toggle('eligiendo', G.sel>=0 || G.colorPide);
  document.body.classList.toggle('pidecolor', G.colorPide);
  const t=document.getElementById('turnoT'), a=document.getElementById('turnoA');
  const mio=G.turno===J_VOS;
  ponerTexto(t, G.colorPide? TX('color')
                : (mio? TX('tuTurno') : TX('turnoDe',{n:TX(G.turno===J_IZQ?'bot1':'bot2')})));
  ponerClase(t, 'rival', !mio);
  /* LA LINEA DE AYUDA DICE QUE HACER AHORA Y NO COMO SE JUEGA. Cambia con el estado: agarrar, elegir
     entre los dos botones, o elegir color. Un texto fijo se deja de leer al segundo turno. */
  let ay='';
  if(G.avisoT>0) ay=G.aviso;
  else if(mio && G.colorPide) ay=TX('ayudaColor');
  else if(mio && G.sel>=0) ay=TX('ayudaTirar');
  else if(mio) ay=TX('ayudaMano');
  ponerTexto(a, ay);
}
pintarIdioma(); verPantalla('idioma');
bucle();
