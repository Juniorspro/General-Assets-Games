
/* =========================================================================================
   EL GUION CORRIENDO, Y EL BUCLE
   ========================================================================================= */
/* los puntos del viaje, en celdas: del pasillo del medio hasta el aula 6 */
const RUTA_CAM=[[11,9],[8,9]];
/* 14,44 Y NO 14,238: ZC(14,238) da z=22,0 y a esa altura la camara se queda EN EL VANO DE LA
   PUERTA. Medido en una captura de 790x1400: el personaje ocupaba 36,8% del alto, los pupitres de
   los costados hacian de marco y el tercio de abajo era piso vacio. ZC(14,44)=22,85 la mete dentro
   del aula, a 2,35 m de el, y pasa a ocupar 41% con el escritorio de primer plano abajo. */
const RUTA_DENTRO=[[8,11],[8,13],[8,14.44]];
const PUERTA_CLASE=(()=>PUERTAS.find(p=>p.aula===AULA_CLASE.n))();
const CAM_FIN=[XC(8), 22.85];

function cel2(p){ return [XC(p[0]), ZC(p[1])]; }

/* ---------- LAS ESPERAS VAN EN EL PASO FIJO, NO EN setTimeout ----------
   Estaban con setTimeout y el propio auto-jugador lo destapo: corre el guion entero de forma
   sincronica, asi que los setTimeout NUNCA disparan y el juego se quedaba clavado despues del primer
   libro con `bloqueo` en true para siempre (6.001 vueltas y seguia en la cuenta 1).
   Pero el defecto no es del test: una pausa de 1,1 s medida con setTimeout es una pausa que depende
   del reloj de la pestaña y no del reloj del juego, o sea la unica parte del juego que NO respeta el
   paso fijo. Metida en el paso fijo, dura lo mismo a 30 y a 144 cuadros. */
const espDespues=[];
function luegoDe(seg, fn){ espDespues.push({ t:seg, fn }); }
function esperasTick(dt){
  for(let k=espDespues.length-1;k>=0;k--){
    const e=espDespues[k];
    e.t-=dt;
    if(e.t<=0){ espDespues.splice(k,1); try{ e.fn(); }catch(err){} }
  }
}

function empezar(){
  terminado=0; libros=0; aciertos=0; cuenta=null; bloqueo=false;
  CUENTAS=armarCuentas();
  for(const l of LIBROS){ l.hecho=false; l.g.visible=false; }
  for(const p of PUERTAS){ p.abierta=false; p.t=0; p.ang=0; }
  /* arranca cara a cara en el pasillo del medio: el primer plano del juego es el saludando */
  cam.x=XC(11); cam.z=ZC(9); cam.giro=-Math.PI/2; cam.pitch=0.02; cam.ojo=OJO;
  cam.ax=cam.x; cam.az=cam.z; cam.agiro=cam.giro; cam.apitch=cam.pitch; cam.aojo=cam.ojo;
  /* A DOS METROS SETENTA Y NO A SEIS. El primer plano del juego es el saludando, y a 5,88 m en un
     pasillo de 3,6 de techo el personaje ocupaba 90 px de los 732 del marco: un muneco al fondo.
     A 2,73 ocupa el 40% de la altura, que es la distancia a la que alguien te saluda. */
  PROFE.x=XC(10.35); PROFE.z=ZC(9); PROFE.giro=Math.PI/2;
  PROFE.ax=PROFE.x; PROFE.az=PROFE.z; PROFE.agiro=PROFE.giro;
  PROFE.anim='saludar'; PROFE.animOtro=null; PROFE.mezcla=0; PROFE.at=0;
  riel=null; profeRiel=null;
  escena_i=-1; escenaT=0; esperaT=0; espDespues.length=0;
  MANO.cand=-1; MANO.votos=0; MANO.dedos=0; padPedido=-1;
  document.body.classList.remove('clase');
  pintarLibros(); verPantalla('juego');
  siguienteEscena();
}
function siguienteEscena(){
  escena_i++; escenaT=0; esperaT=0; padPedido=-1;
  MANO.cand=-1; MANO.votos=0;
  const E=GUION[escena_i];
  if(!E){ ganar(); return; }
  profeAnim(E.anim);
  decir(TX(E.txt));
  document.body.classList.toggle('esperando', !!E.espera);
  if(E.espera) pintarAro(0, null, '');
  if(E.viaje){
    /* EL VA ADELANTE Y LA CAMARA LO SIGUE. Se lanzan los dos rieles a la vez con el de el mas
       rapido: asi le saca ventaja, y lo que el jugador ve es una espalda que se aleja y una camara
       que la persigue — que es como se lee "vení conmigo" sin decirlo. */
    /* EL NO ARRANCA EN EL PRIMER PUNTO DE LA RUTA DE LA CAMARA. Estaba con [...RUTA_CAM], cuyo
       primer punto es la celda 11 —donde esta la camara— y el arranca en la 10,35, o sea DELANTE.
       Con eso lo primero que hacia era caminar 2,7 m hacia atras, cruzarse con la camara y quedar
       detras de ella: en la captura del pasillo no habia nadie, el "vení conmigo" lo decia una voz
       sin cuerpo. Su ruta empieza adelante y sigue adelante. */
    profeIr([cel2([9.6,9]), cel2([8,9]), cel2([8,10])], 2.9);
    rielIr(RUTA_CAM.map(cel2), 2.2, ()=>{});
  }
  if(E.puerta){
    if(PUERTA_CLASE){ PUERTA_CLASE.abierta=true; PUERTA_CLASE.t=0; son('puerta'); }
  }
  if(E.clase){
    document.body.classList.add('clase');
    /* LA CAMARA SE ACOMODA SI QUEDO LEJOS. En la partida normal llega por los rieles, pero si algo
       interrumpio el viaje —o si se entra a la escena de clase directamente— la escena tiene que
       componerse igual: un aula perfectamente armada vista desde otro pasillo no es una escena. */
    if(Math.hypot(cam.x-CAM_FIN[0], cam.z-CAM_FIN[1])>1.2){
      cam.x=CAM_FIN[0]; cam.z=CAM_FIN[1]; cam.giro=0;
      cam.ax=cam.x; cam.az=cam.z; cam.agiro=cam.giro;
      if(PUERTA_CLASE) PUERTA_CLASE.abierta=true;
    }
    /* el se pone DEL OTRO LADO del escritorio, entre la mesa y el pizarron */
    /* 3,2 m y no 3,6: el frente del escritorio queda a un metro de la camara —o sea llenando el
       borde de abajo del cuadro, como una mesa de verdad— y el ocupa un tercio de la altura. */
    PROFE.x=CLASE_X; PROFE.z=25.2; PROFE.giro=Math.PI;
    PROFE.ax=PROFE.x; PROFE.az=PROFE.z; PROFE.agiro=PROFE.giro;
    profeRiel=null;
  }
}
function ponerCuenta(){
  if(libros>=LIBROS_N){ terminarClase(); return; }
  cuenta=CUENTAS[libros];
  cuentaTxt=cuenta.txt;
  const l=LIBROS[libros];
  l.g.visible=true;
  l.cara.material.map=texCuenta(cuenta.txt);
  l.cara.material.needsUpdate=true;
  /* el libro flota a la DERECHA y a la altura de los ojos: a un costado, como se pidio, y no
     delante de la cara — delante taparia justo al personaje, que es lo que hay que mirar */
  /* a un costado, a la altura de los ojos, y GIRADO PARA QUE LA TAPA MIRE A LA CAMARA: la cara con
     la cuenta esta en el +Z local del libro y la camara mira hacia +Z, asi que sin este giro se veia
     el lomo azul y la cuenta quedaba del otro lado. */
  /* EL LIBRO ESTABA DETRAS DE LA CAMARA. z=21,4 con la camara en z=22,0 mirando hacia +Z: el libro
     quedaba un metro a la espalda del jugador. Y no se puede correr solo de costado: con el campo de
     vision horizontal de 58 grados, a 1,6 m de distancia solo entran 90 cm a cada lado del centro.
     A 2,0 m de distancia y 80 cm al costado queda al lado de el y adentro del cuadro. */
  /* Y MAS LEJOS Y MAS CHICO: a 2,0 m con escala 1,6 el libro medía 80 cm de ancho y se salia por el
     borde izquierdo del marco. A 2,6 m entran 1,46 m a cada lado del centro, asi que con el desvio de
     0,95 queda entero y al lado de el, no encima. */
  /* 0,70 Y NO 0,95: con la camara a 22,85 el libro flota a 1,75 m y el medio ancho visible ahi es
     0,98 m. A 0,95 quedaba mitad afuera; medido con caja(): a 0,70 todavia se salia 28 px, a 0,55 y escala 1,02 entra entero. */
  l.g.position.set(CLASE_X+0.55, 1.45, 24.6);
  l.g.rotation.y=Math.PI;
  l.g.scale.setScalar(1.02);
  son('libro');
  MANO.cand=-1; MANO.votos=0; padPedido=-1; esperaT=0;
  document.body.classList.add('esperando');
  pintarAro(0, null, '');
}
function contestar(n){
  if(bloqueo || !cuenta) return;
  bloqueo=true;
  const bien = (n===cuenta.res);
  if(bien){
    aciertos++;
    avisar(TX('bien'), 1.0, '#2ecc0f'); son('bien');
    decir(TX('dBien'));
    const l=LIBROS[libros]; l.hecho=true;
    libros++; pintarLibros();
    luegoDe(1.1, ()=>{ l.g.visible=false; cuenta=null; bloqueo=false;
                       if(libros>=LIBROS_N) terminarClase(); else ponerCuenta(); });
  } else {
    avisar(TX('mal'), 1.0, '#c0392b'); son('mal');
    decir(TX('dMal'));
    luegoDe(1.0, ()=>{ bloqueo=false; MANO.cand=-1; MANO.votos=0; padPedido=-1; esperaT=0; });
  }
}
function terminarClase(){
  cuenta=null;
  document.body.classList.remove('esperando');
  decir(TX('dFin')); son('listo');
  luegoDe(2.6, ()=>ganar());
}
function ganar(){
  terminado=1; jugando=false;
  document.getElementById('finT').textContent=TX('finT');
  document.getElementById('finS').textContent=TX('finS',{n:aciertos,t:LIBROS_N});
  verPantalla('fin');
}

/* ---------- QUE NUMERO ESTA PIDIENDO EL JUGADOR ----------
   Sale de las manos o del teclado, y el que llega primero gana. No hay modo: si hay camara se
   cuentan dedos, y si alguien toca un numero tambien vale. Obligar a elegir uno de los dos seria
   pedirle al jugador que decida algo que al juego no le importa. */
function numeroPedido(){
  if(padPedido>0) return { n:padPedido, fuente:'pad', listo:true };
  if(MANO.on && MANO.hay && MANO.dedos>0) return { n:MANO.dedos, fuente:'mano', listo:false };
  return null;
}

function pasoFijo(dt){
  if(!jugando || terminado) return;
  const E=GUION[escena_i];
  if(!E) return;
  escenaT+=dt;
  esperasTick(dt);
  rielTick(dt);
  profeTick(dt);
  /* GESTICULA CUANDO HABLA Y SE QUEDA QUIETO CUANDO ESPERA. Antes se quedaba en 'explicando' todo
     el rato, o sea con los brazos abiertos mientras el jugador contaba con los dedos: a la distancia
     y con el filtro, dos brazos abiertos y quietos son dos palitos que no dicen nada. Atar el gesto
     a que el subtitulo se este escribiendo sale gratis y ademas es lo que hace una persona. */
  if(E.clase){ profeAnim((dVer && dPos<dCola.length)? 'explicar' : 'quieto'); }
  if(E.mira && !riel) profeMirarCam(dt, 3.0);
  if(E.mira && !riel) mirarA(PROFE.x, PROFE.z, dt, 2.2);

  /* --- las escenas que terminan por tiempo --- */
  if(E.dur && escenaT>=E.dur && !E.clase){ siguienteEscena(); return; }
  if(E.clase && E.dur && escenaT>=E.dur && !cuenta && libros===0){ ponerCuenta(); return; }

  /* --- el viaje --- */
  if(E.viaje && !riel && !profeRiel){ siguienteEscena(); return; }
  if(E.puerta){
    /* el empuja la puerta y despues los dos entran */
    if(escenaT>1.5 && !riel && !profeRiel){
      /* EL EMPUJON DURA LO QUE DURA EL EMPUJON. Los dos rieles arrancaban y el se quedaba en la
         pose de 'puerta' los siete segundos que tarda en cruzar el aula: medido, seguia con el brazo
         estirado empujando aire en z=18,45. Y su ruta terminaba en 14,44 —la celda de la camara—
         para despues aparecer de golpe en 25,2: dos metros y medio de teletransporte. Ahora camina,
         y camina hasta donde se tiene que quedar. */
      profeAnim('caminar');
      profeIr([...RUTA_DENTRO.slice(0,-1).map(cel2), cel2([8,15])], 2.6);
      rielIr(RUTA_DENTRO.map(cel2), 2.0, ()=>siguienteEscena());
    }
  }

  /* --- lo que espera una mano --- */
  if(E.espera){
    const q=E.espera;
    let ok=false, num=null, rot='';
    if(q.tipo==='dedos'){
      num = MANO.on? (MANO.hay? MANO.dedos : null) : (padPedido>0? padPedido : null);
      ok = (num===q.n);
      rot = TX('dedos',{n:q.n});
    } else {
      ok = MANO.on? (MANO.gesto==='pinza') : (padPedido>0);
      rot = TX('hazPinza');
      num = null;
    }
    if(ok) esperaT+=dt; else esperaT=Math.max(0, esperaT-dt*1.6);
    pintarAro(esperaT/MANO_SOSTEN, num, esperaT>0.05? TX('sostene') : rot);
    if(esperaT>=MANO_SOSTEN){ son('listo'); siguienteEscena(); return; }
  }

  /* --- la clase: se contesta sosteniendo el numero --- */
  if(cuenta && !bloqueo){
    const p=numeroPedido();
    if(p && p.listo){ padPedido=-1; contestar(p.n); return; }
    const n = p? p.n : null;
    if(n!=null && n===cuenta.res) esperaT+=dt;
    else esperaT=Math.max(0, esperaT-dt*1.4);
    pintarAro(esperaT/MANO_SOSTEN, n, esperaT>0.05? TX('sostene') : cuentaTxt);
    if(esperaT>=MANO_SOSTEN){ contestar(cuenta.res); return; }
  }
}

/* =========================================================================================
   EL BUCLE: paso fijo con interpolacion al dibujar.
   Mismo criterio que siempre y por la misma razon: el guion, los rieles y el sosten de la mano
   dependen del tiempo, y si dependieran de los cuadros el tutorial tardaria distinto en un telefono
   y en una notebook. El dibujo interpola, asi que a 144 cuadros se ven 144 posiciones aunque solo
   haya 60 pasos.
   ========================================================================================= */
let acum=0, ultimo=performance.now(), pasosTotal=0, cuadrosTotal=0;
function guardarAnterior(){
  cam.ax=cam.x; cam.az=cam.z; cam.agiro=cam.giro; cam.apitch=cam.pitch; cam.aojo=cam.ojo;
  PROFE.ax=PROFE.x; PROFE.az=PROFE.z; PROFE.agiro=PROFE.giro;
}
function avanzar(dt){
  if(dt>0.25) dt=0.25;
  acum+=dt;
  let n=0;
  while(acum>=PASO && n<8){ guardarAnterior(); pasoFijo(PASO); acum-=PASO; n++; pasosTotal++; }
  if(n>=8) acum=0;
  dialogoTick(dt);
  if(avisoT>0){ avisoT-=dt; if(avisoT<=0) marcaEl.classList.remove('ver'); }
  for(const p of PUERTAS){
    const obj=p.abierta? 1.42 : 0;
    p.ang += (obj-p.ang)*Math.min(1, dt*5);
  }
  return n;
}
function angLerp(a,b,f){ let d=b-a; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
  return a+d*f; }
function dibujar(alfa){
  cuadrosTotal++;
  camara.position.set(cam.ax+(cam.x-cam.ax)*alfa, cam.aojo+(cam.ojo-cam.aojo)*alfa,
                      cam.az+(cam.z-cam.az)*alfa);
  camara.rotation.set(cam.apitch+(cam.pitch-cam.apitch)*alfa,
                      angLerp(cam.agiro, cam.giro, alfa)+Math.PI, 0, 'YXZ');
  const R = baldiGLB? baldi : profe;
  if(R && R.raiz){
    R.raiz.position.x=PROFE.ax+(PROFE.x-PROFE.ax)*alfa;
    R.raiz.position.z=PROFE.az+(PROFE.z-PROFE.az)*alfa;
    /* SIN EL +PI. Estaba copiado del rig de cajas de la version anterior y sumaba media vuelta de
       mas: profeMirarCam() calcula bien el rumbo HACIA la camara —atan2 da pi cuando la camara esta
       en -Z— y el +PI lo devolvia a 0, o sea de espaldas. En pantalla se veia una cabeza pelada SIN
       CARA, porque la cara estaba del otro lado. La camara SI lleva +PI, y no es lo mismo: three.js
       apunta las camaras a su -Z y los modelos vienen mirando a +Z. */
    R.raiz.rotation.y=angLerp(PROFE.agiro, PROFE.giro, alfa);
  }
  animarBaldi(PROFE.anim, PROFE.animOtro, PROFE.mezcla, PROFE.at);
  for(const l of LIBROS){ if(!l.g.visible) continue;
    l.giro+=0.012; l.g.rotation.y=Math.PI+Math.sin(l.giro)*0.34;
    l.g.position.y=1.52+Math.sin(l.giro*1.7)*0.055; }
  for(const p of PUERTAS) if(p.g) p.g.rotation.y=(p.vertical?0:Math.PI/2) + p.ang;
  pintarEscena();
}
function bucle(){
  requestAnimationFrame(bucle);
  const ahora=performance.now();
  const dt=(ahora-ultimo)/1000; ultimo=ahora;
  if(MANO.on) manosTick();
  avanzar(dt);
  dibujar(Math.min(1, acum/PASO));
}
ajustar(); aplicarCal(calidad); aplicarFiltro(filtro); usarCajas();
addEventListener('resize', ajustar);
cargarBaldi(()=>{});
bucle();
