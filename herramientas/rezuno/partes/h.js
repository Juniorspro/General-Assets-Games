/* VA ARRIBA DE TODO Y NO "donde corresponde tematicamente". Un let leido antes de su linea no rompe
   una funcion: rompe el modulo entero, y en este proyecto eso ya tiro el juego abajo cuatro veces.
   La regla es declarar antes del primer uso, y el primer uso de esto esta en el bucle. */
let CONGELADO=false;
/* ===================== LAS PANTALLAS ===================== */
const PANTALLAS=['pIdioma','pMenu','pModo','pSala','pFin'];
let pant='idioma';
function verPantalla(p){
  pant=p;
  for(const id of PANTALLAS) document.getElementById(id).classList.remove('ver');
  const m={ idioma:'pIdioma', menu:'pMenu', modo:'pModo', sala:'pSala', fin:'pFin' };
  if(m[p]) document.getElementById(m[p]).classList.add('ver');
  document.body.classList.toggle('jugando', p==='juego');
  if(p!=='juego') guia('','');
}
function pintarIdioma(){
  document.documentElement.lang=IDIOMA;
  document.getElementById('bTut').textContent=TX('tutorial');
  document.getElementById('bJugar').textContent=TX('jugar');
  document.getElementById('bIdioma').textContent=TX('idioma');
  document.getElementById('calN').textContent=TX('graficos');
  for(const [id,cl] of [['bBots','modoBots'],['bMulti','modoMulti'],['modoPie','modoPie'],
                        ['salaT','salaT'],['salaPie','salaPie'],['bConectar','conectar'],
                        ['bVolver1','volver'],['bVolver2','volver']]){
    const e=document.getElementById(id); if(e) e.textContent=TX(cl);
  }
  pintarMP(); pintarChat();
  pintarCalidad();
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
  /* el pie dice como se sostiene el telefono con la camara elegida; si falta el tutorial, eso manda */
  document.getElementById('mPie').innerHTML = TUT.hecho
    ? (TX('menuPie')+' '+TX(MANO.usa==='user'? 'camPieF':'camPieT'))
    : TX('menuBloq');
}
/* LA CALIDAD SE PINTA Y SE APLICA EN EL MISMO SITIO, para que el boton marcado y lo que se dibuja no
   puedan discrepar: el rotulo sale de CAL, que es lo que el renderer esta usando de verdad. */
const CAL_NOM={ baja:'calBaja', media:'calMedia', alta:'calAlta' };
function pintarCalidad(){
  for(const b of document.querySelectorAll('.calB')){
    b.textContent=TX(CAL_NOM[b.dataset.cal]);
    b.classList.toggle('on', b.dataset.cal===CAL);
  }
}
for(const b of document.querySelectorAll('.calB'))
  b.onclick=()=>{ aplicarCalidad(b.dataset.cal); pintarCalidad(); };

const camAviso=document.getElementById('camAviso');
const CAM_MOTIVO={ permiso:'camErrPermiso', camara:'camErrCamara', cdn:'camErrCdn',
                   modelo:'camErrCdn', insegura:'camErrInsegura' };
/* EL MOTIVO SE ESCRIBE Y SE QUEDA. Un juego que se maneja con la camara y no la pide se ve roto, y
   sin decir por que no hay nada que el jugador pueda hacer al respecto. */
function pintarCam(){
  if(!camAviso) return;
  camAviso.classList.remove('bien','mal');
  /* EL AVISO DICE QUE HACER CON LA MANO, y depende de que camara toco de verdad y no de cual se
     pidio: en una notebook, que no tiene trasera, la mano va adelante. */
  const tras = MANO.usa==='environment';
  if(MANO.estado==='carga'){ camAviso.textContent=TX('camPide'); return; }
  if(MANO.estado==='lista'){ camAviso.textContent=TX(tras?'camOkT':'camOkF');
                             camAviso.classList.add('bien'); return; }
  if(MANO.error){ camAviso.textContent=TX(CAM_MOTIVO[MANO.error]||'camNo'); camAviso.classList.add('mal'); return; }
  camAviso.textContent=TX('camNo');
}
/* CAMBIAR DE CAMARA REARRANCA EL DETECTOR ENTERO, y no es pereza: el flujo de video, el espejo y el
   detector de caras dependen de cual es, asi que media docena de cosas tendrian que reconciliarse en
   caliente. Se sueltan las pistas, se pone el estado en cero y se vuelve a pedir. */
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
/* JUGAR YA NO REPARTE: abre la eleccion de modo. Un juego que ademas tiene multijugador no puede
   decidir por el jugador cual de los dos queria. */
document.getElementById('bJugar').onclick=()=>{ audioIniciar(); verPantalla('modo'); };
document.getElementById('bBots').onclick=()=>{ ponerJugadores(3); mpCortar(); arrancar(false); };
document.getElementById('bMulti').onclick=()=>{
  audioIniciar();
  const c=document.getElementById('salaCod');
  if(!c.value) c.value=mpNuevaSala();
  verPantalla('sala'); pintarMP();
};
document.getElementById('bVolver1').onclick=()=>verPantalla('menu');
document.getElementById('bVolver2').onclick=()=>{ mpCortar(); verPantalla('menu'); };
document.getElementById('bConectar').onclick=async()=>{
  /* LA CAMARA SE PIDE ACA TAMBIEN. Entrando por multijugador, `arrancar()` no corre nunca — y sin el
     no hay permiso de camara, o sea que el jugador entra a una partida en la que no puede apuntar. */
  if(!MANO.on && MANO.estado!=='carga'){ await manosIniciar(); pintarCam(); }
  mpConectar(document.getElementById('salaCod').value, '');
};

/* ===== LOS GANCHOS QUE EL MODULO DE RED LLAMA CUANDO PASA ALGO ===== */
const CHAT_COL=['#2e8b4f','#c47b00','#c0392b','#41454e'];
function pintarMP(){
  const av=document.getElementById('mpAviso'); if(!av) return;
  av.classList.remove('bien','mal');
  const e=MP.estado;
  if(e==='online' && MP.rivalId){ av.textContent=TX('mpDos',{n:MP.rivalNom}); av.classList.add('bien'); }
  else if(e==='online'){ av.textContent=TX('mpOnline'); av.classList.add('bien'); }
  else if(e==='conectando') av.textContent=TX('mpConectando');
  else if(e==='offline'){ av.textContent=TX('mpOffline'); av.classList.add('mal'); }
  else if(e==='error'){ av.textContent=TX('mpErr'); av.classList.add('mal'); }
  else if(e==='sinlib'){ av.textContent=TX('mpSinLib'); av.classList.add('mal'); }
  else av.textContent=TX('mpNo');
  const p=document.getElementById('mpPunto');
  if(p){ p.classList.toggle('on', e==='online'); p.classList.toggle('med', e==='conectando'); }
  const n=document.getElementById('mpNom');
  if(n) n.textContent = MP.sala + (MP.rivalNom? (' · '+MP.rivalNom) : '');
  document.body.classList.toggle('mp', MP.jugando);
}
function pintarChat(){
  const c=document.getElementById('mpChat'); if(!c) return;
  c.innerHTML='';
  for(const m of MP.chat){
    const e=document.createElement('span');
    e.textContent=m.mio? m.txt : (m.nom+': '+m.txt);
    if(m.mio) e.className='mio';
    c.appendChild(e);
  }
  const d=document.getElementById('mpDecir');
  if(d && !d.childElementCount){
    for(const k of ['chat1','chat2','chat3','chat4']){
      const b=document.createElement('button');
      b.dataset.k=k; b.onclick=()=>mpDecir(TX(b.dataset.k));
      d.appendChild(b);
    }
  }
  if(d) for(const b of d.children) b.textContent=TX(b.dataset.k);
}
/* hay dos en la sala: el que reparte tira la semilla y los dos arrancan */
function mpListos(){ pintarMP(); if(MP.reparte && MP.rivalId && !MP.jugando) mpRepartirYo(); }
function mpArranco(){ TUT.on=false; guia('',''); verPantalla('juego'); pintarMP(); }
function mpSeFue(){
  avisar(TX('mpSalio',{n:MP.rivalNom||'?'}));
  verPantalla('menu'); pintarMP();
}
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
    /* EL FILTRO DE LA MANO CORRE ACA, EN CADA CUADRO. La camara mide 24 veces por segundo en un
       telefono y el juego dibuja 60: entre medicion y medicion los 21 puntos se siguen acercando al
       ultimo destino, asi que la mano se mueve a 60 aunque se la mida a 24. Y va ANTES de consumir el
       pellizco, porque el punto al que se apunta tiene que ser el de este cuadro y no el anterior. */
    /* EL CONTROL DE CUADROS MIDE EL CUADRO ENTERO, incluida la deteccion de manos: es el tiempo que
       el jugador siente, no el que tarda el dibujo. */
    resTick(dt);
    mpTick(performance.now());
    manosFiltrar();
    if(tomarPinza()) activar(MANO.x, MANO.y);
    /* CONGELADO detiene la PARTIDA pero no el dibujo. Es para las pruebas: para fotografiar el
       instante exacto en que una mano esta agarrando una carta hay que poder parar el reloj de la
       partida y dejar que las animaciones —que son lerps hacia un destino— terminen de asentarse.
       Sin esto la foto sale del cuadro siguiente al que se pidio, o sea de otro momento. */
    if(!CONGELADO){ partidaTick(dt); tutTick(dt); }
    /* LAS MANOS SE CALCULAN ANTES DE ARMAR LA MESA, y el orden importa. La carta que un rival esta
       agarrando se coloca en el punto de la pinza de su mano; si la mesa se armara primero, esa carta
       usaria la pinza del cuadro ANTERIOR y quedaria un cuadro atras de la mano que la sostiene.
       Un cuadro de desfase a 60 son 17 ms, pero la mano viaja medio metro en medio segundo: la carta
       se veria despegada del pulgar justo en el momento en que hay que mirarla. */
    manosPintar(dt);
    armarMesa();
    pintarTut();
    pintarAro();
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
  /* con dos jugadores hay un solo rotulo */
  const rivs = (N_JUG===2)? [[J_IZQ,'bot1',1]] : [[J_IZQ,'bot1',1],[J_DER,'bot2',2]];
  document.getElementById('rivN2').parentNode.style.display = (N_JUG===2)? 'none' : '';
  for(const [j,clave,k] of rivs){
    const n=G.manos[j].length;
    ponerTexto(document.getElementById('rivN'+k), (N_JUG===2 && MP.on)? MP.rivalNom : TX(clave));
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
                : (mio? TX('tuTurno')
                      : TX('turnoDe',{n:(N_JUG===2 && MP.on)? MP.rivalNom
                                        : TX(G.turno===J_IZQ?'bot1':'bot2')})));
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
