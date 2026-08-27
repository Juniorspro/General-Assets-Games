
/* =========================================================================================
   EL GUION CORRIENDO, Y EL BUCLE
   ========================================================================================= */
/* =========================================================================================
   LAS RUTAS SE CALCULAN, NO SE ESCRIBEN

   Antes habia dos constantes —RUTA_CAM y RUTA_DENTRO— con las celdas del unico viaje que existia.
   Con ocho aulas eso serian quince rutas escritas a mano, y una celda mal puesta manda la camara a
   atravesar una pared en el aula 7 sin que nadie se entere hasta llegar ahi. Asi que el camino de
   pasillo entre dos puntos sale de un BFS sobre el mapa, que es la misma estructura que ya decide
   donde va la puerta de cada aula: se declara la geometria y el resto se deduce.
   ========================================================================================= */
function puertaDe(n){ return PUERTAS.find(p=>p.aula===n && p.j===AULA_SITIO[n].j0-1)
                          || PUERTAS.find(p=>p.aula===n); }
/* la celda de PASILLO delante de la puerta principal: la puerta va siempre en j0-1 y el pasillo
   inmediatamente antes, o sea j0-2 */
function frenteDe(n){ const p=puertaDe(n); return [p.i, p.j-1]; }

function rutaCeldas(a, b){
  const K=(i,j)=>j*GW+i;
  const paso=(i,j)=> i>=0 && j>=0 && i<GW && j<GH &&
        (MAPA[j][i]===1 || (i===a[0]&&j===a[1]) || (i===b[0]&&j===b[1]));
  const de=new Map(); de.set(K(a[0],a[1]), null);
  const q=[[a[0],a[1]]];
  let hallado=false;
  while(q.length){
    const [i,j]=q.shift();
    if(i===b[0] && j===b[1]){ hallado=true; break; }
    for(const [di,dj] of [[0,-1],[0,1],[-1,0],[1,0]]){
      const x=i+di, y=j+dj;
      if(!paso(x,y) || de.has(K(x,y))) continue;
      de.set(K(x,y), [i,j]); q.push([x,y]);
    }
  }
  if(!hallado) return null;
  const R=[]; let c=[b[0],b[1]];
  while(c){ R.push(c); c=de.get(K(c[0],c[1])); }
  return R.reverse();
}
/* Y SE SIMPLIFICA A LAS ESQUINAS. Un riel con veinte puntos en linea recta no camina distinto que
   uno con dos, pero cada punto es una parada de 10 cm donde el resorte del giro vuelve a arrancar:
   en pantalla eso se ve como una camara que tiembla al avanzar. */
function esquinas(r){
  if(!r || r.length<3) return r||[];
  const R=[r[0]];
  for(let k=1;k<r.length-1;k++){
    const a=r[k-1], b=r[k], c=r[k+1];
    if((a[0]===b[0]) !== (b[0]===c[0])) R.push(b);
  }
  R.push(r[r.length-1]);
  return R;
}
/* SI EL PRIMER PUNTO YA LE QUEDA ENCIMA, SE TIRA. El profesor no arranca sobre la ruta: en el
   tutorial esta 2,73 m delante de la camara y el primer punto de la ruta es la celda de la camara,
   asi que lo primero que hacia era caminar hacia atras y cruzarse con ella — en la captura del
   pasillo no habia nadie y el "vení conmigo" lo decia una voz sin cuerpo. Si ya esta dentro de la
   celda del primer punto, ese punto no tiene nada que decirle. */
function rutaDesde(pts, x, z){
  const R=pts.slice();
  /* SE DESCARTA COMO MAXIMO EL PRIMERO. El `while` descartaba TODOS los puntos que estuvieran a
     menos de una celda, y en un pasillo con esquina eso se come el punto de la esquina: la ruta
     [entrada, esquina, destino] queda en [destino] y el profesor camina en DIAGONAL, atravesando la
     pared — que es exactamente el "se desvia a veces" que reporto el usuario. Nunca fue un problema
     de rumbo: era una ruta a la que le faltaba la esquina.
     Y ni el primero se descarta si el segundo no queda MAS ADELANTE: se compara la distancia al
     punto 1 desde el profesor contra la distancia desde el punto 0, y si desde el profesor no esta
     mas cerca, el punto 0 todavia tiene algo que decirle. */
  if(R.length>2 && Math.hypot(R[0][0]-x, R[0][1]-z) < CEL*0.75){
    const dProf=Math.hypot(R[1][0]-x, R[1][1]-z);
    const dCero=Math.hypot(R[1][0]-R[0][0], R[1][1]-R[0][1]);
    if(dProf<=dCero) R.shift();
  }
  return R;
}
/* entrar al aula: la puerta, la primera fila del aula, el medio, y el sitio de la camara */
function rutaEntrar(n){
  const S=AULA_SITIO[n], p=puertaDe(n);
  return [[p.i,p.j],[S.i,S.j0],[S.i,S.jm],[S.i,S.jCam]];
}
/* salir del aula: al reves, hasta el pasillo */
function rutaSalir(n){
  const S=AULA_SITIO[n], p=puertaDe(n);
  return [[S.i,S.jm],[S.i,S.j0],[p.i,p.j],[p.i,p.j-1]];
}

function cel2(p){ return [XC(p[0]), ZC(p[1])]; }
let restoRuta=null;          // la segunda mitad del viaje, la que se camina despues de los bichos
let bichosCerrado=false;     // la tanda de bichos de la escena actual ya se cerro
let aulaPrev=0;              // de que aula venimos, para saber si hay que salir de ella

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
  aulaN=TOUR[0]; aulaIdx=0; aulaK=0; muertes=0; aulaPrev=0; restoRuta=null; gritoT=0;
  bichosApagar();
  CUENTAS=armarCuentas();
  for(const l of LIBROS){ l.hecho=false; l.g.visible=false; }
  for(const p of PUERTAS){ p.abierta=false; p.t=0; p.ang=0; }
  /* ARRANCA MIRANDO HACIA DONDE VA A CAMINAR, y no de costado. Estaba con la camara mirando a -X y
     el profesor 2,73 m en esa direccion; pero el primer viaje baja por la columna 11, o sea -Z. Con
     lo cual lo primero que hacia el profesor era caminar HACIA ATRAS hasta la celda de la camara
     para poder doblar, cruzandose con el jugador — y si en vez de eso se le saltea ese punto, corta
     la esquina y camina en diagonal por dentro de la pared (medido: 113 pasos en la celda [10,8]).
     El problema nunca fue la ruta: era que el saludo pasaba en una esquina. Poniendo a los dos sobre
     la columna 11 y la camara mirando a -Z, la ruta sale derecho y no hay esquina que cortar. */
  cam.x=XC(11); cam.z=ZC(9); cam.giro=Math.PI; cam.pitch=0.02; cam.ojo=OJO;
  cam.ax=cam.x; cam.az=cam.z; cam.agiro=cam.giro; cam.apitch=cam.pitch; cam.aojo=cam.ojo;
  /* A DOS METROS SETENTA Y NO A SEIS. El primer plano del juego es el saludando, y a 5,88 m en un
     pasillo de 3,6 de techo el personaje ocupaba 90 px de los 732 del marco: un muneco al fondo.
     A 2,73 ocupa el 40% de la altura, que es la distancia a la que alguien te saluda. */
  PROFE.x=XC(11); PROFE.z=ZC(8.35); PROFE.giro=0;
  PROFE.ax=PROFE.x; PROFE.az=PROFE.z; PROFE.agiro=PROFE.giro;
  PROFE.anim='saludar'; PROFE.animOtro=null; PROFE.mezcla=0; PROFE.at=0;
  riel=null; profeRiel=null;
  escena_i=-1; escenaT=0; esperaT=0; espDespues.length=0;
  MANO.cand=-1; MANO.votos=0; MANO.dedos=0; padPedido=-1;
  document.body.classList.remove('clase');
  pintarLibros(); verPantalla('juego');
  musicaNivel(0); musicaEmpezar();
  siguienteEscena();
}
function siguienteEscena(){
  escena_i++; escenaT=0; esperaT=0; padPedido=-1;
  MANO.cand=-1; MANO.votos=0;
  const E=GUION[escena_i];
  if(!E){ ganar(); return; }
  profeAnim(E.anim);
  /* EL NUMERO QUE SE DICE ES EL DEL RECORRIDO Y NO EL DEL MAPA. El aula 5 es la octava que se
     visita, asi que decir "Aula 5" con el cartel de arriba en "AULA 8/8" son dos numeros distintos
     para la misma cosa. Al jugador no le importa como se llaman las aulas en el plano: le importa
     cuantas le faltan. */
  decir(TX(E.txt, {a:(E.aula? TOUR.indexOf(E.aula)+1 : 1), t:TOUR.length}));
  if(E.voz) hablar(E.voz, 0.9);
  document.body.classList.toggle('esperando', !!E.espera);
  if(E.espera) pintarAro(0, null, '');
  if(E.viaje!=null){
    /* EL VA ADELANTE Y LA CAMARA LO SIGUE. Se lanzan los dos rieles a la vez con el de el mas
       rapido: asi le saca ventaja, y lo que el jugador ve es una espalda que se aleja y una camara
       que la persigue — que es como se lee "vení conmigo" sin decirlo. Y su ruta NO empieza en el
       primer punto de la de la camara: el arranca delante, asi que empezar ahi lo hacia caminar
       hacia atras y cruzarse con ella. */
    const n=E.viaje;
    let ruta;
    if(E.resto && restoRuta){ ruta=restoRuta; restoRuta=null; }
    else {
      /* de donde salimos: si venimos de un aula, primero hay que salir de ella */
      let pre=[];
      let desde;
      if(aulaPrev && aulaPrev!==n){
        const pa=puertaDe(aulaPrev);
        pa.abierta=true;
        pre=rutaSalir(aulaPrev);
        desde=[pa.i, pa.j-1];
      } else {
        desde=celda(cam.x, cam.z);
      }
      const medio=rutaCeldas(desde, frenteDe(n));
      ruta=[...pre, ...esquinas(medio||[frenteDe(n)])];
      /* SE CORTA AL MEDIO SI DESPUES VIENEN BICHOS. El tramo mas largo son catorce celdas y los
         bichos al final de la caminata dejarian veinte segundos seguidos de pasillo antes. Cortado
         a la mitad, la actividad cae EN el camino, que es lo que se pidio. */
      if(E.mitad && ruta.length>2){
        const k=Math.max(1, Math.floor(ruta.length/2));
        restoRuta=ruta.slice(k);
        ruta=ruta.slice(0,k+1);
      }
    }
    rielIr(ruta.map(cel2), VEL_CAM, ()=>{});
    /* el camina la ruta ENTERA y espera al final: mientras el jugador revienta bichos, el esta
       esperandolo al fondo del pasillo, que es exactamente lo que hace un maestro apurado */
    let suya = restoRuta? [...ruta, ...restoRuta] : ruta;
    profeIr(rutaDesde(suya.map(cel2), PROFE.x, PROFE.z), VEL_PROFE);
    aulaPrev=0;
  }
  bichosCerrado=false;
  /* si quedo algo de la tanda anterior, se apaga: un blanco suelto adentro de un aula es un blanco
     que nadie puede pinzar y una escena que no termina nunca */
  if(!E.act && bichosVivos>0) bichosApagar();
  if(!E.act) bichosMira=null;
  if(E.act){
    const fin = (restoRuta && restoRuta.length)? cel2(restoRuta[restoRuta.length-1]) : null;
    bichosMira = fin;
    const rumbo = fin? Math.atan2(fin[0]-cam.x, fin[1]-cam.z) : cam.giro;
    actSoltar(E.tipo, E.act, rumbo);
  }
  if(E.puerta!=null){
    const p=puertaDe(E.puerta);
    if(p){ p.abierta=true; p.t=0; son('puerta'); }
  }
  if(E.clase!=null){
    const n=E.clase, S=AULA_SITIO[n];
    aulaN=n; aulaIdx=TOUR.indexOf(n); aulaK=0; aulaPrev=n;
    /* CUATRO ESCALONES EN OCHO AULAS: el bajo solo, despues el acorde, despues la melodia y al final
       el charles. Es el mismo tema todo el juego —cambiarlo por otro cada aula seria empezar de cero
       ocho veces— pero se va poblando, y eso se siente como que la escuela aprieta. */
    musicaNivel(Math.floor(aulaIdx/2));
    cuenta=null; bloqueo=false;              // por si se entro de una prueba con una cuenta abierta
    LIBROS[0].g.visible=false;
    document.body.classList.add('clase');
    /* LA CAMARA SE ACOMODA SI QUEDO LEJOS. En la partida normal llega por los rieles, pero si algo
       interrumpio el viaje —o si se entra a la escena de clase directamente desde una prueba— la
       escena tiene que componerse igual: un aula perfectamente armada vista desde otro pasillo no es
       una escena. */
    if(Math.hypot(cam.x-S.x, cam.z-S.zCam)>1.2){
      cam.x=S.x; cam.z=S.zCam; cam.giro=0;
      cam.ax=cam.x; cam.az=cam.z; cam.agiro=cam.giro;
      const p=puertaDe(n); if(p) p.abierta=true;
      riel=null;
    }
    /* el se pone DEL OTRO LADO del escritorio, entre la mesa y el pizarron */
    PROFE.x=S.x; PROFE.z=S.zProfe; PROFE.giro=Math.PI;
    PROFE.ax=PROFE.x; PROFE.az=PROFE.z; PROFE.agiro=PROFE.giro;
    profeRiel=null;
    pintarLibros();
  } else if(!E.act){
    document.body.classList.remove('clase');
  }
}
function ponerCuenta(){
  if(aulaK>=CUENTAS_AULA){ terminarClase(); return; }
  cuenta=CUENTAS[aulaIdx*CUENTAS_AULA + aulaK];
  cuentaTxt=cuenta.txt;
  const S=AULA_SITIO[aulaN];
  const l=LIBROS[0];
  l.g.visible=true;
  l.cara.material.map=texCuenta(cuenta.txt);
  l.cara.material.needsUpdate=true;
  /* EL LIBRO FLOTA A UN COSTADO Y NO DELANTE, porque delante taparia justo al personaje, que es lo
     que hay que mirar. Y girado media vuelta: la cara con la cuenta esta en el +Z local del libro y
     la camara mira hacia +Z, asi que sin el giro se ve el lomo azul.
     LOS NUMEROS SALEN DEL SITIO DEL AULA y no estan escritos: 0,55 al costado y 0,60 delante de el.
     Escritos —estaban en x=CLASE_X+0,55, z=24,6— servian para un aula y ponian el libro dentro de la
     pared en las otras siete. Y el 0,55: con la camara a 2,35 m el medio ancho visible donde flota es
     0,98 m, asi que a 0,95 quedaba mitad afuera y a 0,70 se salia 28 px medidos con caja(). */
  l.g.position.set(S.x+0.55, 1.45, S.zProfe-0.60);
  l.g.rotation.y=Math.PI;
  l.g.scale.setScalar(1.02);
  son('libro');
  MANO.cand=-1; MANO.votos=0; padPedido=-1; esperaT=0;
  document.body.classList.add('esperando');
  pintarAro(0, null, '');
  pintarLibros();
}
function contestar(n){
  if(bloqueo || !cuenta) return;
  bloqueo=true;
  if(n===cuenta.res){
    aciertos++; libros++; aulaK++;
    avisar(TX('bien'), 1.0, '#2ecc0f'); son('bien'); hablar('bien', 0.85);
    decir(TX('dBien'));
    pintarLibros();
    const l=LIBROS[0];
    luegoDe(1.1, ()=>{ l.g.visible=false; cuenta=null; bloqueo=false;
                       if(aulaK>=CUENTAS_AULA) terminarClase(); else ponerCuenta(); });
  } else {
    /* UNA CUENTA MAL Y TE MATA. No hay segundo intento y no es una decision de dificultad: es la
       unica forma de que contestar tenga peso. Con reintento libre el jugador tira numeros hasta que
       uno pegue —diez opciones, tres segundos— y las veinticuatro cuentas dejan de ser cuentas.
       Lo que si es una decision es DONDE vuelve: al principio de ESTA aula y no al principio de la
       escuela. Perder veinte minutos por una resta es la forma mas rapida de que alguien cierre el
       juego, y el susto ya lo dio el grito. */
    morir();
  }
}

/* =========================================================================================
   EL GRITO: UN MOMENTO, NO UN SONIDO
   El agarron podria ser una linea —pantalla de muerte y listo— y seria tirar a la basura el unico
   momento del juego que da miedo. Son 1,55 segundos en los que el se planta a noventa centimetros de
   la camara, la camara se va sola hacia el, grita, y la pantalla se enciende a tirones.
   Es lo unico del juego que le saca el control al jugador, y es a proposito.
   ========================================================================================= */
const GRITO_DUR=1.55, GRITO_SALTO=0.55;
let gritoT=0, gritoDe=null;
function morir(){
  muertes++;
  cuenta=null; bloqueo=true;
  document.body.classList.remove('esperando');
  LIBROS[0].g.visible=false;
  riel=null; profeRiel=null;
  gritoDe=[PROFE.x, PROFE.z];
  gritoT=GRITO_DUR;
  /* EL GRITO CORTA, NO SE FUNDE. profeAnim() deja mezcla en 1 —o sea 100% la animacion vieja— y la
     baja profeTick(); pero durante el grito profeTick NO CORRE, asi que la mezcla se quedaba clavada
     y en pantalla el pobre gritaba con los brazos colgando en pose de 'quieto'. Y ademas un
     crossfade de 0,4 s es lo contrario de un susto: un susto es un corte. */
  profeAnim('grito'); PROFE.mezcla=0; PROFE.animOtro=null; PROFE.at=0;
  /* EL CARTEL VA AL MEDIO Y NO EN EL GLOBO DE DIALOGO. El globo vive en el tercio de abajo, que es
     exactamente donde queda el pecho de el cuando se planta a noventa centimetros: tapaba el susto
     con una caja gris. */
  decir('');
  avisar(TX('dGrito'), 1.5, '#f2efe6');
  son('grito');
  document.body.classList.add('grito');
}
function gritoTick(dt){
  gritoT-=dt;
  const f=Math.min(1, (GRITO_DUR-gritoT)/GRITO_SALTO);
  /* se planta A NOVENTA CENTIMETROS de la camara: mas cerca y la cabeza no entra en el cuadro, mas
     lejos y no es un screamer, es alguien que se acerco */
  const dx=Math.sin(cam.giro), dz=Math.cos(cam.giro);
  const tx=cam.x+dx*0.90, tz=cam.z+dz*0.90;
  PROFE.x=gritoDe[0]+(tx-gritoDe[0])*f;
  PROFE.z=gritoDe[1]+(tz-gritoDe[1])*f;
  profeMirarCam(dt, 12.0);
  mirarA(PROFE.x, PROFE.z, dt, 9.0);
  PROFE.at+=dt;
  if(gritoT<=0){
    gritoT=0;
    /* la risa cae DESPUES del grito, ya sobre la pantalla de muerte: el grito es el susto y la risa
       es la burla, y encimadas se pisan */
    hablar('risa', 0.95);
    document.body.classList.remove('grito');
    document.getElementById('muereT').textContent=TX('muereT');
    document.getElementById('muereS').textContent=TX('muereS',{a:aulaIdx+1});
    document.getElementById('bReint').textContent=TX('reint');
    terminado=2; jugando=false;
    verPantalla('muere');
  }
}
/* volver a entrar al aula donde te agarro: se rearma la escena de clase, no se reinicia la escuela */
function reintentar(){
  terminado=0; bloqueo=false; cuenta=null; esperaT=0;
  aulaK=0; gritoT=0; espDespues.length=0;
  bichosApagar();
  const k=GUION.findIndex(e=>e.clase===aulaN);
  escena_i=(k>=0? k : 0)-1;
  const S=AULA_SITIO[aulaN];
  cam.x=S.x; cam.z=S.zCam; cam.giro=0; cam.pitch=0.02; cam.ojo=OJO;
  PROFE.x=S.x; PROFE.z=S.zProfe; PROFE.giro=Math.PI;
  guardarAnterior();
  riel=null; profeRiel=null; restoRuta=null; aulaPrev=0;
  verPantalla('juego');
  siguienteEscena();
}
function terminarClase(){
  cuenta=null;
  document.body.classList.remove('esperando');
  document.body.classList.remove('clase');
  const ultima=(aulaIdx>=TOUR.length-1);
  decir(TX(ultima? 'dFin' : 'dSale')); son('listo');
  luegoDe(ultima? 2.6 : 1.4, ()=>{ if(ultima) ganar(); else siguienteEscena(); });
}
function ganar(){
  terminado=1; jugando=false;
  musicaParar(1.4);
  document.getElementById('finT').textContent=TX('finT');
  document.getElementById('finS').textContent=TX('finS',{n:aciertos,t:TOTAL_CUENTAS});
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

/* =========================================================================================
   LOS BICHOS DEL PASILLO: LA ACTIVIDAD DE EN MEDIO

   La regla es una sola: un bicho se revienta poniendole la PINZA encima. Todo el problema esta en
   ese "encima", porque la mano vive en la camara web —dos dimensiones, normalizadas, y espejadas— y
   el bicho vive en el mundo 3D. El puente es proyectar el bicho a la pantalla y comparar ahi mismo,
   en fracciones del marco: en pixeles habria que rehacer el numero en cada tamano de pantalla.

   EL RADIO DEL BLANCO ES DEL 10,5% DEL ANCHO, y es grande a proposito. Una punta de dedo detectada
   por MediaPipe tiembla unos puntos por cuadro y el jugador no ve su propia mano sino un aro dibujado
   con retardo: un blanco chico convierte la actividad en una pelea contra el detector. Lo que tiene
   que costar es LLEGAR con la mano, no acertar el pixel.

   Y HAY DOS ENTRADAS, la pinza y el toque, por la misma razon que el teclado de numeros existe: un
   juego que solo se puede jugar con webcam es un juego que la mayoria no puede jugar.
   ========================================================================================= */
const BICHOS=[], ESQ=[];
const BICHO_R=0.105;          // radio del blanco, en fraccion del ancho del marco
const BICHO_CERCA=0.95;       // a esta distancia te muerde
const _bm=new THREE.Matrix4(), _bv=new THREE.Vector3(), _bq=new THREE.Quaternion();
const _be=new THREE.Euler(), _bs=new THREE.Vector3(1,1,1), _bc=new THREE.Color();
/* LA CAMARA SE SINCRONIZA ANTES DE PROYECTAR. `camara` solo se acomoda al dibujar, asi que dentro
   del paso fijo tiene la posicion del cuadro anterior — y el auto-jugador, que corre sin dibujar ni
   un cuadro, la tenia con la posicion del MENU: los bichos se proyectaban a cualquier lado y no se
   podia acertar ninguno (medido: 56.400 pasos en un pasillo con dos bichos que no morian nunca).
   Con la camara puesta, apuntar en el paso fijo mide lo mismo que apuntar mirando la pantalla. */
function aPantalla(x,y,z){
  ponerCamara(1);
  _bv.set(x,y,z).project(camara);
  return { x:_bv.x*0.5+0.5, y:-_bv.y*0.5+0.5, delante:_bv.z<1 };
}
/* HACIA DONDE MIRA EL JUGADOR CUANDO SUELTAN LOS BICHOS.
   No es "hacia donde miraba": al salir de un aula el ultimo tramo de la ruta va de la puerta al
   pasillo, o sea que la camara queda mirando la PARED de enfrente del pasillo. Medido en la celda
   (4,1): giro -3,14 contra un muro de lockers a dos metros, y los bichos aparecian aplastados contra
   el. Se apunta al final del tramo que queda por caminar —que es donde el profesor esta esperando— y
   los bichos salen en ESA direccion, no en la que la camara traia. La camara despues gira sola en
   medio segundo, que se lee como "escuchaste algo y mirás". */
let bichosMira=null;
function bichosSoltar(n, rumbo){
  BICHOS.length=0; ESQ.length=0;
  const g = (rumbo!=null)? rumbo : cam.giro;
  const dx=Math.sin(g), dz=Math.cos(g);                 // hacia donde mira
  const px=-dz, pz=dx;                                  // el costado
  for(let k=0;k<n;k++){
    /* repartidos en abanico y a distintas alturas: si salieran todos del mismo punto se taparian
       entre ellos y no habria a quien apuntar */
    const d=2.5+((k*0.7)%2.0)+Math.random()*0.5;
    const lat=(((k%2)?1:-1)*(0.35+((k*0.31)%0.85)));
    /* NUNCA POR DEBAJO DE UN METRO: el globo de dialogo ocupa el tercio de abajo del marco, y un
       bicho a 0,85 m de alto a dos metros y medio se proyecta justo detras de el */
    BICHOS.push({ x:cam.x+dx*d+px*lat, y:1.05+((k*0.43)%1.10), z:cam.z+dz*d+pz*lat,
                  fase:k*1.7, vel:0.42+((k*0.17)%0.22), viva:true, giro:k*0.9 });
  }
  bichosVivos=n;
  son('bicho');
  document.body.classList.add('bichos');
  pintarLibros();
}
function bichosApagar(){
  BICHOS.length=0; ESQ.length=0; TIZAS.length=0; CASILL.length=0;
  bichosVivos=0; casillBueno=-1;
  bichoMalla.visible=false; bichoOjos.visible=false; esqMalla.visible=false;
  tizaMalla.visible=false; casillMalla.visible=false;
  document.body.classList.remove('bichos');
  pintarLibros();
}
/* UNA SOLA PUERTA PARA LAS TRES. El guion dice el tipo y aca se reparte; asi el resto del codigo
   —soltar, terminar, apagar, contar— no sabe cuantas actividades hay ni le importa, y agregar una
   cuarta es una linea en esta tabla y otra en TRAMOS. */
function actSoltar(tipo, n, rumbo){
  /* SIEMPRE SE APAGA LO ANTERIOR PRIMERO. En la partida normal la tanda anterior ya se apago al
     terminar, pero apoyarse en eso deja un blanco vivo de la actividad anterior en cuanto algo
     entra a una escena de actividad por otro camino —una prueba, un reintento—: se vieron dos
     bichos y tres tizas contando para el mismo contador, o sea una escena que pedia cinco. */
  bichosApagar();
  if(tipo==='tizas') tizasSoltar(n, rumbo);
  else if(tipo==='casilleros') casillSoltar(n, rumbo);
  else bichosSoltar(n, rumbo);
}
function actTick(dt){ bichosTick(dt); tizasTick(dt); casillTick(dt); }
function actDibujar(){ bichosDibujar(); tizasDibujar(); casillDibujar(); }
/* UN ESTALLIDO SON DOS COSAS: las esquirlas que vuelan Y el bicho que desaparece en el mismo cuadro.
   Con las esquirlas solas se ve un bicho que sigue ahi con basura alrededor. */
/* las esquirlas las usan las tres actividades: un bicho que revienta, una tiza que se agarra y un
   casillero que se abre tiran lo mismo */
function esquirlasSoltar(x,y,z,n){
  for(let k=0;k<(n||9) && ESQ.length<ESQ_MAX;k++){
    const a=Math.random()*6.283, e=Math.random()*1.4-0.5;
    const v=1.6+Math.random()*1.5;
    ESQ.push({ x, y, z, t:0.55,
               vx:Math.cos(a)*Math.cos(e)*v, vy:Math.sin(e)*v+1.4, vz:Math.sin(a)*Math.cos(e)*v,
               gx:Math.random()*6.28, gy:Math.random()*6.28 });
  }
}
function bichoReventar(b){
  b.viva=false;
  bichosVivos=Math.max(0, bichosVivos-1);
  esquirlasSoltar(b.x, b.y, b.z);
  son('revienta');
  pintarLibros();
}
function bichosTick(dt){
  /* las esquirlas: balistica y nada mas. Son medio segundo de vida, no hace falta que reboten. */
  for(let k=ESQ.length-1;k>=0;k--){
    const e=ESQ[k]; e.t-=dt;
    if(e.t<=0){ ESQ.splice(k,1); continue; }
    e.vy-=9.8*dt;
    e.x+=e.vx*dt; e.y+=e.vy*dt; e.z+=e.vz*dt;
    e.gx+=dt*9; e.gy+=dt*7;
  }
  if(!BICHOS.length) return;
  /* ---- se acercan, y por eso hay apuro ---- */
  for(const b of BICHOS){
    if(!b.viva) continue;
    b.fase+=dt*3.4; b.giro+=dt*1.2;
    const dx=cam.x-b.x, dz=cam.z-b.z;
    const d=Math.max(0.001, Math.hypot(dx,dz));
    /* SE ACERCAN EN ZIGZAG Y NO EN LINEA RECTA. Apuntando exacto a la camara, todos convergen a la
       MISMA linea y terminan uno detras del otro: medido despues de un rato largo, cinco bichos en
       x=-29,40 los cinco, o sea un solo blanco apilado. El termino perpendicular los mantiene
       separados y ademas hace que haya que seguirlos con la mano, que es de lo que se trata. */
    const lx=-dz/d, lz=dx/d, zig=Math.sin(b.fase*0.7)*0.75;
    b.x+=(dx/d*b.vel + lx*zig)*dt; b.z+=(dz/d*b.vel + lz*zig)*dt;
    b.y+=Math.sin(b.fase)*0.35*dt;
    b.y=Math.min(2.40, Math.max(0.95, b.y));
    /* TE MUERDE Y NO TE MATA. Matar aca seria una segunda causa de muerte, y la muerte de este juego
       es una sola cosa: una cuenta mal. Un bicho que llega te empuja, suena y vuelve al fondo del
       pasillo, o sea que cuesta tiempo — que es justo lo que hay. */
    if(d<BICHO_CERCA){
      son('muerde'); avisar(TX('mal'), 0.5, '#c0392b');
      /* vuelve al fondo del pasillo Y A UN COSTADO: puesto exactamente adelante, el que vuelve
         aparece siempre en el mismo pixel del medio */
      const ax=Math.sin(cam.giro), az=Math.cos(cam.giro);
      const lat=(Math.random()*2-1)*1.10;
      b.x=cam.x+ax*4.3-az*lat; b.z=cam.z+az*4.3+ax*lat; b.y=1.05+Math.random()*1.10;
    }
  }
  /* ---- lo que mata a un bicho: una pinza nueva, o un toque ---- */
  const golpes=golpesJuntar();
  if(!golpes.length) return;
  for(const g of golpes){
    /* UNA PINZA MATA UN BICHO Y NO TODOS LOS QUE TOQUE: se elige el mas cercano al dedo. Con "todos
       los que esten dentro del radio" una pinza en el medio de un grupo limpiaba tres de una. */
    const k=golpeEnLista(g, BICHOS, b=>b.viva, b=>[b.x, b.y, b.z]);
    if(k>=0) bichoReventar(BICHOS[k]);
  }
}
function bichosDibujar(){
  const hay=BICHOS.some(b=>b.viva);
  bichoMalla.visible=hay; bichoOjos.visible=hay;
  if(hay){
    let k=0;
    for(const b of BICHOS){
      if(!b.viva || k>=BICHOS_MAX) continue;
      /* MIRA A LA CAMARA. Un bicho de perfil no muestra los ojos, y los ojos son lo unico que dice
         que eso esta vivo y que viene hacia vos. */
      const g=Math.atan2(cam.x-b.x, cam.z-b.z);
      _be.set(Math.sin(b.fase)*0.22, g, Math.sin(b.fase*1.7)*0.18);
      _bq.setFromEuler(_be);
      const e=1+Math.sin(b.fase*2.1)*0.06;
      _bs.set(e, 2-e, e);
      _bm.compose(_bv.set(b.x,b.y,b.z), _bq, _bs);
      bichoMalla.setMatrixAt(k, _bm); bichoOjos.setMatrixAt(k, _bm);
      k++;
    }
    for(let q=k;q<BICHOS_MAX;q++){
      _bm.compose(_bv.set(0,-90,0), _bq.identity(), _bs.set(0.0001,0.0001,0.0001));
      bichoMalla.setMatrixAt(q, _bm); bichoOjos.setMatrixAt(q, _bm);
    }
    bichoMalla.instanceMatrix.needsUpdate=true;
    bichoOjos.instanceMatrix.needsUpdate=true;
  }
  esqMalla.visible=ESQ.length>0;
  if(ESQ.length){
    let k=0;
    for(const e of ESQ){
      if(k>=ESQ_MAX) break;
      _be.set(e.gx, e.gy, 0); _bq.setFromEuler(_be);
      const v=Math.max(0.06, e.t/0.55);
      _bm.compose(_bv.set(e.x,e.y,e.z), _bq, _bs.set(v,v,v));
      esqMalla.setMatrixAt(k++, _bm);
    }
    for(let q=k;q<ESQ_MAX;q++){
      _bm.compose(_bv.set(0,-90,0), _bq.identity(), _bs.set(0.0001,0.0001,0.0001));
      esqMalla.setMatrixAt(q, _bm);
    }
    esqMalla.instanceMatrix.needsUpdate=true;
  }
}

/* =========================================================================================
   TIZAS Y CASILLEROS
   Las dos comparten con los bichos el mismo golpe —una pinza nueva o un toque, convertidos a
   fraccion del marco— asi que lo unico propio de cada una es como se mueve el blanco y como se
   pierde. Reusar `golpesJuntar()` no es ahorro de lineas: es lo que garantiza que apuntar se sienta
   igual en las tres, que es lo que el jugador aprendio en la primera.
   ========================================================================================= */
const TIZAS=[], CASILL=[];
let casillBueno=-1, casillT=0;
/* los golpes de este cuadro, en fraccion del marco: pinzas nuevas de cualquier mano, y toques */
function golpesJuntar(){
  const g=[];
  if(MANO.on){ for(const p of MANO.pinzas) if(p.nueva) g.push(p); }
  while(TOQUES.length) g.push(TOQUES.shift());
  return g;
}
/* el blanco mas cercano al dedo, dentro del radio. Devuelve el indice o -1. */
function golpeEnLista(g, lista, vivo, pos){
  const W=lienzo.clientWidth||1, H=lienzo.clientHeight||1;
  let mejor=-1, mejorD=BICHO_R*W;
  for(let k=0;k<lista.length;k++){
    if(!vivo(lista[k])) continue;
    const p=pos(lista[k]);
    const s=aPantalla(p[0], p[1], p[2]);
    if(!s.delante) continue;
    const d=Math.hypot((s.x-g.x)*W, (s.y-g.y)*H);
    if(d<mejorD){ mejorD=d; mejor=k; }
  }
  return mejor;
}

/* ---------- TIZAS: caen y hay que agarrarlas antes de que toquen el piso ---------- */
function tizasSoltar(n, rumbo){
  TIZAS.length=0;
  const g=(rumbo!=null)? rumbo : cam.giro;
  const dx=Math.sin(g), dz=Math.cos(g), px=-dz, pz=dx;
  for(let k=0;k<n && k<TIZAS_MAX;k++){
    const d=2.1+((k*0.53)%1.5);
    const lat=(((k%2)?1:-1)*(0.28+((k*0.37)%0.95)));
    TIZAS.push({ x:cam.x+dx*d+px*lat, z:cam.z+dz*d+pz*lat,
                 /* SALEN ESCALONADAS EN EL TIEMPO Y NO TODAS JUNTAS: siete tizas cayendo a la vez
                    son una pared de tizas, y no hay dos manos que alcancen. El retardo las convierte
                    en una fila, que es lo que se puede atender. */
                 espera:k*0.55, y:2.9, vy:0, viva:true, giro:k*1.3 });
  }
  bichosVivos=n; document.body.classList.add('bichos'); son('bicho'); pintarLibros();
}
function tizasTick(dt){
  if(!TIZAS.length) return;
  for(const z of TIZAS){
    if(!z.viva) continue;
    if(z.espera>0){ z.espera-=dt; continue; }
    /* 3,4 Y NO 9,8 NI 6,2. Con 6,2 la tiza tarda 0,96 s en caer los 2,84 m, y ese es TODO el tiempo
       que hay para llevar la mano y cerrar la pinza — con el retardo de la deteccion no alcanza. Con
       3,4 son 1,29 s. No es gravedad de verdad y no importa: importa que se pueda agarrar. */
    z.vy-=3.4*dt; z.y+=z.vy*dt; z.giro+=dt*3.1;
    if(z.y<=0.06){
      /* SE ROMPE Y VUELVE A SALIR, no te mata. La muerte de este juego es una cuenta mal. */
      z.y=0.06; son('muerde'); avisar(TX('mal'), 0.45, '#c0392b');
      z.y=2.9; z.vy=0; z.espera=0.5+Math.random()*0.6;
    }
  }
  const golpes=golpesJuntar();
  for(const g of golpes){
    const k=golpeEnLista(g, TIZAS, z=>z.viva && z.espera<=0, z=>[z.x, z.y, z.z]);
    if(k>=0){ TIZAS[k].viva=false; bichosVivos=Math.max(0,bichosVivos-1);
              esquirlasSoltar(TIZAS[k].x, TIZAS[k].y, TIZAS[k].z); son('revienta'); pintarLibros(); }
  }
}
function tizasDibujar(){
  const hay=TIZAS.some(z=>z.viva);
  tizaMalla.visible=hay;
  if(!hay) return;
  let k=0;
  for(const z of TIZAS){
    if(!z.viva || k>=TIZAS_MAX) continue;
    if(z.espera>0){ _bm.makeScale(0.0001,0.0001,0.0001); _bm.setPosition(0,-90,0);
                    tizaMalla.setMatrixAt(k++, _bm); continue; }
    _be.set(z.giro*0.7, z.giro, z.giro*0.4); _bq.setFromEuler(_be);
    _bm.compose(_bv.set(z.x, z.y, z.z), _bq, _bs.set(1,1,1));
    tizaMalla.setMatrixAt(k++, _bm);
  }
  for(let q=k;q<TIZAS_MAX;q++){
    _bm.makeScale(0.0001,0.0001,0.0001); _bm.setPosition(0,-90,0);
    tizaMalla.setMatrixAt(q, _bm);
  }
  tizaMalla.instanceMatrix.needsUpdate=true;
}

/* ---------- CASILLEROS: tiembla uno y hay que abrir ESE ---------- */
function casillSoltar(n, rumbo){
  CASILL.length=0;
  const g=(rumbo!=null)? rumbo : cam.giro;
  const dx=Math.sin(g), dz=Math.cos(g), px=-dz, pz=dx;
  /* en abanico y todos a la misma distancia: la gracia es ELEGIR, no alcanzar */
  for(let k=0;k<CASILL_N;k++){
    const lat=(k-(CASILL_N-1)/2)*0.76;
    const d=4.4+Math.abs(lat)*0.22;
    CASILL.push({ x:cam.x+dx*d+px*lat, z:cam.z+dz*d+pz*lat, y:0.80, abierto:false, sac:0 });
  }
  bichosVivos=n; casillT=0; casillBueno=-1;
  document.body.classList.add('bichos'); pintarLibros();
}
function casillElegir(){
  const libres=[];
  for(let k=0;k<CASILL.length;k++) if(!CASILL[k].abierto) libres.push(k);
  casillBueno = libres.length? libres[Math.floor(Math.random()*libres.length)] : -1;
  casillT=0;
  if(casillBueno>=0) son('bicho');
}
function casillTick(dt){
  if(!CASILL.length) return;
  if(casillBueno<0) casillElegir();
  casillT+=dt;
  for(const c of CASILL) c.sac=Math.max(0, c.sac-dt*4);
  if(casillBueno>=0) CASILL[casillBueno].sac=1;
  const golpes=golpesJuntar();
  for(const g of golpes){
    const k=golpeEnLista(g, CASILL, c=>!c.abierto, c=>[c.x, c.y+0.35, c.z]);
    if(k<0) continue;
    if(k===casillBueno){
      CASILL[k].abierto=true;
      bichosVivos=Math.max(0, bichosVivos-1);
      esquirlasSoltar(CASILL[k].x, CASILL[k].y+0.5, CASILL[k].z);
      son('revienta'); pintarLibros();
      casillElegir();
    } else {
      /* EL CASILLERO EQUIVOCADO CUESTA TIEMPO, no una vida: se cambia el que tiembla, asi que hay
         que volver a mirar. Castigar con la muerte una eleccion de ocho seria injusto. */
      son('muerde'); avisar(TX('mal'), 0.45, '#c0392b');
      casillElegir();
    }
  }
}
function casillDibujar(){
  const hay=CASILL.length>0 && CASILL.some(c=>!c.abierto);
  casillMalla.visible=hay;
  if(!hay) return;
  for(let k=0;k<CASILL_N;k++){
    const c=CASILL[k];
    if(!c || c.abierto){ _bm.makeScale(0.0001,0.0001,0.0001); _bm.setPosition(0,-90,0);
                         casillMalla.setMatrixAt(k, _bm); continue; }
    /* EL QUE TIEMBLA SE VE PORQUE TIEMBLA, no porque este pintado de otro color: un casillero
       marcado con color se elige sin mirar la escena, y lo que hay que entrenar es mirar. */
    /* el que tiembla se INCLINA y SALTA un poco: solo inclinado, a cuatro metros y con el filtro de
       baja calidad puesto, 0,045 rad son tres pixeles y no se ve cual es */
    const s=c.sac>0? Math.sin(casillT*34)*0.055*c.sac : 0;
    const salto=c.sac>0? Math.abs(Math.sin(casillT*17))*0.045*c.sac : 0;
    _be.set(0, Math.atan2(cam.x-c.x, cam.z-c.z), s); _bq.setFromEuler(_be);
    _bm.compose(_bv.set(c.x+s*0.5, c.y+salto, c.z), _bq, _bs.set(1,1,1));
    casillMalla.setMatrixAt(k, _bm);
    _bc.setRGB(0.70+ (c.sac>0? 0.22*c.sac : 0), 0.22, 0.17);
    casillMalla.setColorAt(k, _bc);
  }
  casillMalla.instanceMatrix.needsUpdate=true;
  if(casillMalla.instanceColor) casillMalla.instanceColor.needsUpdate=true;
}

function pasoFijo(dt){
  /* EL GRITO CORRE ANTES QUE TODO Y DEVUELVE. Es el unico momento del juego en que el guion no
     manda: no avanza la escena, no camina nadie y el jugador no puede contestar nada. */
  if(gritoT>0){ gritoTick(dt); return; }
  if(!jugando || terminado) return;
  const E=GUION[escena_i];
  if(!E) return;
  escenaT+=dt;
  esperasTick(dt);
  rielTick(dt);
  profeTick(dt);
  actTick(dt);
  /* GESTICULA CUANDO HABLA Y SE QUEDA QUIETO CUANDO ESPERA. Antes se quedaba en 'explicando' todo
     el rato, o sea con los brazos abiertos mientras el jugador contaba con los dedos: a la distancia
     y con el filtro, dos brazos abiertos y quietos son dos palitos que no dicen nada. Atar el gesto
     a que el subtitulo se este escribiendo sale gratis y ademas es lo que hace una persona. */
  if(E.clase){ profeAnim((dVer && dPos<dCola.length)? 'explicar' : 'quieto'); }
  if(E.mira && !riel) profeMirarCam(dt, 3.0);
  if(E.mira && !riel) mirarA(PROFE.x, PROFE.z, dt, 2.2);

  /* --- las escenas que terminan por tiempo --- */
  if(E.dur && escenaT>=E.dur && !E.clase){ siguienteEscena(); return; }
  if(E.clase && E.dur && escenaT>=E.dur && !cuenta && aulaK===0){ ponerCuenta(); return; }

  /* --- el viaje: la camara es la que manda. El llega antes y espera. --- */
  if(E.viaje!=null && !riel){ profeAnim('quieto'); siguienteEscena(); return; }
  /* --- los bichos: se sale cuando no queda ninguno --- */
  if(E.act && bichosMira) mirarA(bichosMira[0], bichosMira[1], dt, 3.0);
  if(E.act && !bichosCerrado){
    if(bichosVivos<=0 && escenaT>0.5){
      /* LA BANDERA NO VA ESCRITA EN EL GUION. El primer intento ponia GUION[i]={...E,act:0}: eso
         apaga la tanda para siempre, asi que al morir y volver a pasar por el mismo pasillo ya no
         habia bichos. El guion es la partitura y no se toca; lo que cambia es el estado. */
      bichosCerrado=true;
      decir(TX('dBichosFin')); son('listo');
      bichosApagar();
      luegoDe(0.9, ()=>siguienteEscena());
      return;
    }
  }
  if(E.puerta!=null){
    /* el empuja la puerta y despues los dos entran */
    if(escenaT>1.5 && !riel && !profeRiel){
      /* EL EMPUJON DURA LO QUE DURA EL EMPUJON. Los dos rieles arrancaban y el se quedaba en la
         pose de 'puerta' los siete segundos que tarda en cruzar el aula: medido, seguia con el brazo
         estirado empujando aire. Ahora camina, y camina hasta donde se tiene que quedar. */
      const n=E.puerta, S=AULA_SITIO[n], dentro=rutaEntrar(n);
      profeAnim('caminar');
      profeIr([...dentro.slice(0,-1).map(cel2), [S.x, S.zProfe]], VEL_PROFE);
      rielIr([...dentro.slice(0,-1).map(cel2), [S.x, S.zCam]], VEL_CAM, ()=>siguienteEscena());
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
function ponerCamara(alfa){
  camara.position.set(cam.ax+(cam.x-cam.ax)*alfa, cam.aojo+(cam.ojo-cam.aojo)*alfa,
                      cam.az+(cam.z-cam.az)*alfa);
  camara.rotation.set(cam.apitch+(cam.pitch-cam.apitch)*alfa,
                      angLerp(cam.agiro, cam.giro, alfa)+Math.PI, 0, 'YXZ');
  camara.updateMatrixWorld(true);
}
function dibujar(alfa){
  cuadrosTotal++;
  ponerCamara(alfa);
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
  actDibujar();
  manos3DDibujar();
  pintarEscena();
}
function bucle(){
  requestAnimationFrame(bucle);
  const ahora=performance.now();
  const dt=(ahora-ultimo)/1000; ultimo=ahora;
  /* LA MEDICION YA NO SE LLAMA DESDE ACA. Antes estaba manosTick(), que hacia detectForVideo() —
     entre 8 y 20 ms en un telefono— DENTRO del cuadro de render: el presupuesto de 16,6 ms para 60
     fps se iba en mirar la mano. Ahora la medicion la maneja el propio <video> por su cuenta y lo
     unico que corre a 60 es la interpolacion, que son 126 numeros. */
  if(MANO.on) manosAvanzar(dt);
  avanzar(dt);
  dibujar(Math.min(1, acum/PASO));
}
ajustar(); aplicarCal(calidad); aplicarFiltro(filtro); usarCajas();
addEventListener('resize', ajustar);
cargarBaldi(()=>{});
bucle();
