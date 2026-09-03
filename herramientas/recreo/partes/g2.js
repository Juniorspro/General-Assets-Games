
/* =========================================================================================
   LAS MANOS: DE 21 PUNTOS POR MANO A UN NUMERO DEL 0 AL 10

   Lo que el juego necesita ahora no es "girar/avanzar/correr": es CONTAR DEDOS. Cuatro mas cuatro
   son ocho, y ocho dedos son las DOS manos — asi que el detector va con numHands 2 y el numero es la
   suma de las dos.

   TRES PROBLEMAS Y NINGUNO ES "leer los puntos":
   1. LA ESCALA. La mano puede estar a veinte centimetros o a un metro de la camara, asi que ninguna
      distancia en pixeles significa nada. TODO se mide en proporcion al tamano de la palma —muneca a
      nudillo del medio— que es invariante a la distancia Y al tamano de la mano de quien juega.
   2. EL PULGAR NO SE MIDE COMO LOS DEMAS. Los otros cuatro dedos se estiran ALEJANDO la punta de la
      muneca, y con eso alcanza; el pulgar se abre HACIA EL COSTADO y su punta puede quedar a la
      misma distancia de la muneca abierto o cerrado. Se mide contra el nudillo del MENIQUE: abierto
      se aleja de el, cerrado se le cruza por delante. Sin esta distincion, "cinco dedos" no existe.
   3. EL NUMERO TIEMBLA. Un dedo a medio estirar cruza el umbral varias veces por segundo. Asi que el
      numero no se toma: SE SOSTIENE. Hay que mantenerlo quieto 1,1 s y un aro se va llenando. Eso
      resuelve el temblor y ademas le da al jugador tiempo de cambiar de idea, que es lo que hace que
      contestar con el cuerpo no se sienta como una trampa.
   ========================================================================================= */
const MANO={ on:false, estado:'no', det:null, vid:null, dedos:0, gesto:'', hay:false,
             cand:-1, votos:0, ultT:0, manos:0, lms:null, pinzas:[], pzPrev:[],
             error:'', delegado:'', cdn:null, crudo:0, pausa:false, habia:false,
             /* espejo: la camara FRONTAL se muestra espejada porque asi funciona un espejo y es lo
                unico con lo que se puede apuntar; la TRASERA no, porque ahi la mano ya se ve del
                lado que esta. Depende de que camara se abrio, no es una constante. */
             espejo:true, camaraUsada:'',
             hz:24, medidas:0, msDet:0, dupes:0, ranuras:[null,null],
             /* CUANTAS MANOS SE LE PIDEN AL DETECTOR AHORA MISMO. No es una constante: es lo que el
                juego necesita en esta escena, y de eso depende buena parte de lo que cuesta. */
             pedidas:1, entradaChica:false,
             /* si la escena esta pidiendo algo con la mano. Lo escribe el juego; el ritmo lo combina
                con si HAY una mano, que es lo que de verdad manda. */
             escenaPide:false, hzMax:24 };
/* CUANTAS VECES POR SEGUNDO SE MIDE, que no es lo mismo que cuantas veces se dibuja.
   24 y no 60: el detector tarda entre 8 y 20 ms por cuadro en un telefono, asi que medir en cada
   cuadro de render es gastar un tercio del presupuesto de 16,6 ms en mirar una mano que apenas se
   movio. Se mide 24 veces por segundo y se INTERPOLA el resto, que es exactamente lo que hace el
   propio juego con su paso fijo de 60 y sus 120 cuadros. */
/* EL TECHO SUBE A 60 Y DEJA DE SER LA REGLA. Estaba clavado en 24 en telefono, y eso ya no era una
   decision sino un resto: se puso cuando medir costaba 8-20 ms y no habia forma de saber cual de los
   dos era este aparato. Ahora hay una regla que lo sabe —el ritmo sale de cuanto tarda la deteccion y
   de cuanto hilo se le presta— y el tope de 24 lo unico que hacia era impedirle a un telefono rapido
   usar lo que le sobra: con una deteccion de 6 ms, el 30% del hilo da CINCUENTA mediciones por
   segundo, y el tope las cortaba en 24.
   60 y no mas: por encima del ritmo de dibujo, medir de nuevo no tiene a donde ir. */
const MANO_HZ_MOVIL=60, MANO_HZ_PC=60;
/* con lo que se pide arriba, un aparato lento sigue cayendo solo a 15 o a 12 */
/* 256x192 Y NO 320x240, Y EL MOTIVO ES QUE EL DETECTOR NO USA LA RESOLUCION QUE SE LE DA.
   Los modelos de MediaPipe tienen entrada fija y chica —el de palma trabaja alrededor de 192 px de
   lado y el de puntos alrededor de 224—, asi que todo lo que se le mande por encima de eso se
   ACHICA ANTES DE MIRARLO: son pixeles que se copian y se reescalan para tirarlos. Bajar de 320x240
   a 256x192 son 1,56 veces menos pixeles que mover en cada medicion y no se pierde detalle que el
   modelo fuera a usar. */
const MANO_ENT_W=256, MANO_ENT_H=192;
/* =========================================================================================
   EL RITMO DE REPOSO ES PARA CUANDO NO HAY NADA QUE SEGUIR, NO PARA CUANDO EL JUEGO NO PREGUNTA

   La vuelta anterior baje el ritmo a 8 Hz "mientras el profesor camina, porque ahi la mano no decide
   nada". El razonamiento estaba mal y el jugador lo vio en un segundo: "ahora la mano va lento y
   super lagueada". Y tenia razon — LA MANO SE SIGUE VIENDO en esas escenas, y una mano muestreada
   ocho veces por segundo se ve exactamente como lag, decida algo o no.

   MEDIDO, el retardo de seguimiento contra el ritmo:
       24 Hz -> 21 ms · 15 -> 34 · 12 -> 43 · 10 -> 52 · 8 -> 64 · 6 -> 88
   O sea que a 8 Hz la mano quedaba en 64 ms: PEOR que los 65 ms de los que habiamos partido dos
   vueltas atras, deshaciendo justo lo que se habia pedido arreglar.

   La regla correcta es la de al lado y es la que se usa ahora: el ritmo de reposo es para cuando NO
   HAY MANO EN CUADRO. Ahi no hay nada que dibujar ni que seguir, y encima es el caso barato —sin mano
   solo corre el buscador de palma—; mirar diez veces por segundo alcanza de sobra para notar que
   aparecio, porque en cuanto aparece la MISMA medicion que la encontro ya sube el ritmo al maximo.
   Si hay una mano, el jugador la esta usando: va a fondo, camine el profesor o no. */
const MANO_HZ_REPOSO=10;
/* CON DOS MANOS SE MIDE MENOS SEGUIDO, Y NO ES UN RECORTE A CIEGAS.
   El jugador lo reporto asi: "la segunda mano aparece en pantalla y se laguea un monton". Y es cierto
   que cuesta el doble — el modelo de puntos corre UNA VEZ POR MANO —, pero lo importante es PARA QUE
   se piden dos manos: solo para CONTAR DEDOS, cuando la respuesta pasa de cinco. Y contar no necesita
   velocidad. Al contrario: el numero se vota entre tres lecturas y despues hay que sostenerlo 1,1
   segundos con un aro que se llena, o sea que lo que importa ahi es que el numero sea ESTABLE, no que
   la mano llegue rapido. Apuntar necesita velocidad; contar necesita quietud.
   Asi que con dos manos el ritmo baja a 20: el doble de trabajo por medicion, un tercio menos de
   mediciones, y el jugador no puede notar la diferencia porque en ese momento no esta apuntando a
   nada. */
const MANO_HZ_DOS=20;
function manoTope(){
  if(!(MANO.hay || MANO.escenaPide)) return MANO_HZ_REPOSO;
  const max=MANO.hzMax || MANO_HZ_MOVIL;
  return (MANO.pedidas>=2)? Math.min(max, MANO_HZ_DOS) : max;
}

/* =========================================================================================
   CUANTAS MANOS SE MIDEN, Y POR QUE NO SON SIEMPRE DOS

   Aca estaba el gasto mas grande que quedaba, y estaba escrito como una constante: numHands:2 para
   todo el juego. El modelo de puntos CORRE UNA VEZ POR MANO, asi que pedir dos con las dos manos en
   el cuadro cuesta el doble que pedir una — todo el tiempo, incluso en las siete actividades de
   pasillo, donde no hay una sola que necesite dos manos: la pinza, el arrastre y el dibujo se hacen
   con una.

   Dos manos hacen falta EN UN SOLO CASO en todo el juego: cuando la respuesta de una cuenta pasa de
   cinco, porque ahi hay que mostrar seis o mas dedos y en una mano no entran. Eso es el aula, no el
   pasillo. Asi que el numero se lo pide el juego a la escena, y no al reves.

   Y SE CAMBIA EN LOS BORDES DE ESCENA, NUNCA POR CUADRO: setOptions rearma el grafo del detector, o
   sea que llamarlo seguido costaria mas de lo que ahorra. Por eso hay una guarda de igualdad. */
function manoPedirManos(n){
  const q=(n>=2)? 2 : 1;
  if(q===MANO.pedidas) return false;
  MANO.pedidas=q;
  if(MANO.det && MANO.det.setOptions){
    try{ MANO.det.setOptions({ numHands:q }); }catch(e){}
  }
  /* la ranura que sobra se apaga: si quedara viva con su ultima medicion, el juego seguiria contando
     los dedos de una mano que ya no se esta midiendo */
  if(q===1 && MANO.ranuras[1]) MANO.ranuras[1].hay=false;
  return true;
}
/* =========================================================================================
   EL RITMO DE MEDICION SE AJUSTA SOLO AL APARATO

   El jugador lo reporto en uno de verdad: "en mi Poco X8 Pro me va a 30-25 cuando aparece la mano".
   Y la cuenta explica el numero sin misterio: detectForVideo() tarda entre 8 y 20 ms segun el
   telefono Y CORRE EN EL HILO PRINCIPAL —no hay forma de sacarlo, porque tasks-vision usa
   document.createElement adentro y no arranca en un worker—. A 24 Hz eso son entre 190 y 480 ms de
   cada segundo dedicados a mirar la mano: en el peor caso, la MITAD del hilo. Los 60 fps no se
   pierden dibujando, se pierden midiendo.

   Un numero fijo de mediciones por segundo no puede estar bien en los dos extremos: 24 le sobra a un
   telefono rapido y lo hunde a uno lento. Lo que SI se puede fijar es cuanto del hilo se le presta al
   detector, y de ahi sale el ritmo: hz = carga / lo_que_tarda. Un aparato rapido sube solo hasta el
   tope y uno lento baja hasta que deja de ahogarse.

   Y ESTO SOLO SE PUEDE HACER PORQUE LA INTERPOLACION YA ESTABA. Medir menos veces no significa
   dibujar menos veces: entre medicion y medicion los puntos se interpolan y se filtran a 60. Bajar de
   24 a 14 Hz sin interpolacion seria una mano a saltos; con ella es la misma mano medida menos veces.
   ========================================================================================= */
const MANO_CARGA=0.30;        // fraccion del hilo que se le presta al detector, como mucho
const MANO_HZ_MIN=12;         // por debajo de esto ni la interpolacion lo tapa
/* BAJAR LA ENTRADA DEL DETECTOR EN CALIENTE, SIN CORTAR LA CAMARA.
   El ultimo escalon que queda cuando ya se bajo la resolucion de dibujo es darle MENOS PIXELES QUE
   MIRAR al detector: de 320x240 a 224x168 son 2,04 veces menos, y el costo de detectForVideo() va
   con los pixeles de entrada.

   Va con applyConstraints y no volviendo a pedir getUserMedia, y la diferencia importa: pedir la
   camara otra vez en algunos navegadores VUELVE A PREGUNTAR EL PERMISO, y preguntarlo en medio de una
   partida —cuando el gesto del jugador ya expiro— es la forma mas rapida de quedarse sin manos a la
   mitad del juego. applyConstraints reusa el mismo track.
   Y si el aparato no deja cambiar la resolucion, no pasa nada: se sigue con la que habia. */
function manoEntradaChica(si){
  MANO.entradaChica=!!si;
  const v=MANO.vid, st=v && v.srcObject;
  const tr=st && st.getVideoTracks && st.getVideoTracks()[0];
  if(!tr || !tr.applyConstraints) return false;
  const w=si? 224 : 320, h=si? 168 : 240;
  try{ tr.applyConstraints({ width:{ideal:w}, height:{ideal:h} }).catch(()=>{}); }catch(e){ return false; }
  return true;
}
function manoRitmoAjustar(){
  if(MANO.msDet<=0.5) return;                     // todavia no hay una medida creible
  const tope = MANO.hzTope || MANO_HZ_MOVIL;
  const hz = Math.max(MANO_HZ_MIN, Math.min(tope, (1000*MANO_CARGA)/MANO.msDet));
  /* se mueve DE A POCO. Con el ritmo saltando entre 24 y 12 segun el ultimo cuadro, la mano cambia de
     suavidad todo el tiempo y eso se nota mas que ir siempre a 14. */
  MANO.hz = MANO.hz + (hz-MANO.hz)*0.25;
}
const MANO_URL='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const MANO_WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
/* DOS CDN Y NO UNO. El detector son dos descargas de un tercero, y si ese tercero no contesta el
   juego entero se queda sin manos sin que se pueda saber por que. unpkg sirve el mismo paquete. */
const MANO_CDN=[{ js:MANO_URL, wasm:MANO_WASM },
                { js:'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs',
                  wasm:'https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm' }];
const MANO_MODELO='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

function d3(a,b){ const x=a.x-b.x, y=a.y-b.y, z=(a.z||0)-(b.z||0); return Math.hypot(x,y,z); }
/* PURA A PROPOSITO: entran 21 puntos y sale {dedos, pinza}. Sin camara, sin estado y sin navegador,
   asi que se puede comprobar inyectando manos de mentira y midiendo — que es la unica forma de
   probar esto en un banco sin camara ni mano. */
/* LA TABLA DE DEDOS Y EL RESULTADO SON FIJOS Y SE REUSAN. manoLeer() se llama por cada mano en cada
   cuadro y ademas en cada medicion; con el .map() de antes alojaba dos arreglos y un objeto por
   llamada, o sea unos trescientos objetos por segundo tirados para devolver dos numeros. */
const _mlPares=[[8,5],[12,9],[16,13],[20,17]];
const _mlLargos=[false,false,false,false];
const _mlRes={ dedos:0, pinza:false, estirados:[false,false,false,false,false] };
function manoLeer(lm){
  if(!lm || lm.length<21) return null;
  const mu=lm[0], nu=lm[9];
  const palma=Math.max(1e-6, d3(mu,nu));
  const largos=_mlLargos;
  for(let i=0;i<4;i++){
    const pt=_mlPares[i][0], n=_mlPares[i][1];
    largos[i] = (d3(lm[pt],mu) / Math.max(1e-6,d3(lm[n],mu))) > 1.28;
  }
  /* el pulgar, contra el nudillo del menique */
  const pulgar = (d3(lm[4], lm[17]) / palma) > 1.05;
  /* LA PINZA ES EL PULGAR Y EL INDICE, Y NADA MAS. Lo reporto el jugador con esas palabras: "el
     pinch es cerrando pulgar e indice, no la mano entera".
     Antes decia ademas `largos.filter(Boolean).length<=2`, o sea que exigia que como mucho dos de los
     cuatro dedos estuvieran estirados. Una pinza natural —pulgar e indice juntos y el medio, el
     anular y el menique afuera— deja TRES estirados, asi que no contaba: habia que cerrar casi toda
     la mano para que el juego la viera.
     Y la condicion no estaba protegiendo de nada. MEDIDO, la distancia pulgar-indice en palmas:
       pinza 0,061 · puño 0,878 · dos dedos 1,405 · mano abierta 1,379
     o sea que la distancia sola separa la pinza de todo lo demas por CATORCE VECES, y el umbral de
     0,45 cae en el medio de un hueco enorme. Ni siquiera el puño cerrado la cruza. La cuenta de dedos
     no aportaba margen: solo rechazaba pinzas de verdad. */
  const pinza  = (d3(lm[4], lm[8]) / palma) < 0.45;
  /* SE DEVUELVE TAMBIEN CUALES. El dibujo de la mano marca en verde los dedos que el juego CONTO,
     y eso es la mitad de la enseñanza: cuando el numero no es el que el jugador cree, se ve cual
     dedo no cerro o no estiro del todo. Un numero solo no explica nada. */
  let n=0; for(let i=0;i<4;i++) if(largos[i]) n++;
  const r=_mlRes, e=r.estirados;
  r.dedos = n + (pulgar?1:0);
  r.pulgar=pulgar; r.pinza=pinza; r.palma=palma;
  e[0]=pulgar; e[1]=largos[0]; e[2]=largos[1]; e[3]=largos[2]; e[4]=largos[3];
  r.abierta = (n===4) && pulgar;
  return r;
}
function manoTotal(lms){
  if(!lms || !lms.length) return { hay:false, dedos:0, pinza:false, manos:0 };
  let d=0, pz=false;
  for(const lm of lms){ const r=manoLeer(lm); if(!r) continue; d+=r.dedos; pz=pz||r.pinza; }
  return { hay:true, dedos:Math.min(10,d), pinza:pz, manos:lms.length };
}
/* ---------- DONDE ESTA LA PINZA EN LA PANTALLA ----------
   Contar dedos no necesita saber DONDE esta la mano; reventar un bicho si. El punto de la pinza es
   el medio entre la punta del pulgar y la del indice, que es justo donde el jugador cree que esta
   pinchando.
   DOS COSAS QUE NO SON OBVIAS:
   1. VA ESPEJADO. La camara se muestra como un espejo —si no, mover la mano a la derecha mueve la
      marca a la izquierda y no hay forma de apuntar—, asi que la x de MediaPipe se invierte. Es el
      mismo 1-x que ya usaba dibujarManos() para el esqueleto de la camarita.
   2. LO QUE VALE ES EL FLANCO, no el estado. Una pinza sostenida medio segundo son treinta cuadros:
      si cada cuadro matara, una sola pinza limpiaria el pasillo entero. Solo cuenta el cuadro en que
      la pinza APARECE, y para eso hay que recordar la de cada mano en el cuadro anterior. */
/* las mismas dos entradas siempre: manoPinzas corre en cada cuadro y alojaba un arreglo mas un
   objeto por mano, o sea unos 180 objetos por segundo para devolver cuatro numeros */
const _pzA=[{x:0,y:0,px:0,py:0,k:0,pinza:false,nueva:false},
            {x:0,y:0,px:0,py:0,k:0,pinza:false,nueva:false}];
const _pzR=[];
function manoPinzas(lms){
  const r=_pzR; r.length=0;
  if(!lms || !lms.length){ MANO.pzPrev.length=0; return r; }
  lms.forEach((lm,k)=>{
    const q=manoLeer(lm); if(!q) return;
    const p4=lm[4], p8=lm[8], p9=lm[9];
    /* SE DEVUELVE TAMBIEN EL CENTRO DE LA PALMA, y no es un dato de mas: con la mano CERRADA —que es
       como se juega el mundo neon— el punto de la pinza deja de significar nada, porque el pulgar y
       el indice estan los dos recogidos. La espada cuelga del centro de la palma, que existe con la
       mano abierta y con la mano cerrada igual.

       EL ESPEJO ES CONDICIONAL Y ANTES ESTABA FIJO. ESE ERA EL DEFECTO QUE REPORTO EL JUGADOR:
       "el rompecabezas agarra los de la izquierda cuando mi mano esta a la derecha".
       Esta funcion se escribio cuando el juego usaba la camara FRONTAL, donde la imagen siempre va
       espejada, asi que el 1-x estaba puesto a mano. Despues el juego paso a la camara TRASERA, donde
       la imagen NO va espejada, y `MANO.espejo` paso a leerse del track — pero solo lo miraban el
       dibujo de las manos 3D y los numeros. Aca seguia el 1-x fijo.
       Consecuencia: en un telefono la mano DIBUJADA aparecia en x y el punto que AGARRA estaba en
       1-x, o sea los dos reflejados uno del otro. No es un defecto del rompecabezas: lo tenian las
       siete actividades —bichos incluidos— y el rompecabezas solo lo hace obvio, porque ahi se mira
       la pieza mientras se arrastra en vez de un bicho que desaparece. */
    const esp=MANO.espejo;
    const o=_pzA[k] || (_pzA[k]={x:0,y:0,px:0,py:0,k:0,pinza:false,nueva:false});
    const mx=(p4.x+p8.x)/2;
    o.x = esp? 1-mx : mx;
    o.y = (p4.y+p8.y)/2;
    o.px = esp? 1-p9.x : p9.x;
    o.py = p9.y; o.k = k;
    o.pinza = q.pinza; o.nueva = q.pinza && !MANO.pzPrev[k];
    r.push(o);
    MANO.pzPrev[k]=q.pinza;
  });
  return r;
}

/* el voto: tres lecturas seguidas con el mismo numero para que el numero valga */
function manoVoto(n){
  if(n===MANO.cand) MANO.votos++;
  else { MANO.cand=n; MANO.votos=1; }
  if(MANO.votos>=3) MANO.dedos=MANO.cand;
}
/* =========================================================================================
   ARRANCAR EL DETECTOR, Y QUE SE SEPA CUANDO NO ARRANCA

   EL ORDEN IMPORTA Y ES: LA CAMARA PRIMERO. El detector son dos descargas de un CDN mas un modelo
   de siete megas de Google, o sea varios segundos; si se piden ANTES del permiso, cuando por fin se
   llama a getUserMedia el gesto del jugador ya expiro y Safari lo rechaza con NotAllowedError sin
   mostrar el cartelito. Pidiendo la camara en la primera linea, el permiso aparece al instante y la
   descarga pasa despues, con el permiso ya dado.

   Y CADA FALLA SE NOMBRA. Antes cualquier problema terminaba en un cartel de 2,6 segundos dentro
   del juego que decia "sin camara": el mismo mensaje para "negaste el permiso", "no hay camara",
   "el CDN no contesta" y "estas en http y el navegador no expone la camara". Desde afuera eso se ve
   como un juego que simplemente no usa la camara, que es justo lo que reporto el usuario.
   ========================================================================================= */
function manosFallo(cual){
  MANO.estado='no'; MANO.on=false; MANO.error=cual||'camara';
  document.body.classList.remove('manos'); document.body.classList.add('pad');
  pintarCam(); pintarCtrl();
  return 'no';
}
async function manosIniciar(){
  if(MANO.estado==='carga'||MANO.estado==='lista') return MANO.estado;
  MANO.estado='carga'; MANO.error=''; pintarCam(); pintarCtrl();
  /* CONTEXTO SEGURO. Sin https —o sin localhost— navigator.mediaDevices NO EXISTE, asi que no hay
     permiso que negar: el navegador ni pregunta. Es la causa mas facil de confundir con un error
     del juego, y la unica que no se arregla desde el codigo. */
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    return manosFallo(window.isSecureContext===false? 'insegura' : 'camara');
  }
  let st=null;
  try{
    /* LA TRASERA PRIMERO, Y 320x240. Dos decisiones separadas:
       - 'environment' es la camara trasera, que es la que pidio el usuario: el telefono queda
         apoyado y las manos se mueven del otro lado, con mas espacio y mejor luz que apuntandose a
         uno mismo. Va como `ideal` y no `exact` para que una notebook sin camara trasera abra la
         que tenga en vez de fallar.
       - 320x240 y no 480x360: el detector escala la entrada igual, y 320x240 son 76.800 pixeles
         contra 172.800, o sea 2,25 veces menos trabajo por medicion para la misma mano. */
    st=await navigator.mediaDevices.getUserMedia({
      /* Y SE PIDEN 60 CUADROS DE CAMARA. La medicion cuelga de requestVideoFrameCallback, o sea que
         corre al minimo entre el ritmo que pide el juego y EL DE LA CAMARA: con una camara a 30 no
         hay forma de medir mas de 30 por mucho que sobre procesador. A 256x192 los 60 son baratos y
         casi cualquier telefono los da; si no los da, `ideal` no falla, devuelve lo que puede. */
      video:{ width:{ideal:MANO_ENT_W}, height:{ideal:MANO_ENT_H},
              frameRate:{ideal:60},
              facingMode:{ideal:'environment'} } });
  }catch(e){
    const n=(e && e.name)||'';
    return manosFallo(n==='NotAllowedError'||n==='SecurityError'? 'permiso'
                    : (n==='NotFoundError'||n==='OverconstrainedError'? 'camara' : 'camara'));
  }
  const v=document.getElementById('camVid');
  v.srcObject=st; MANO.vid=v;
  await v.play().catch(()=>{});
  /* QUE CAMARA ABRIO DE VERDAD, que no es siempre la que se pidio. De eso depende el espejo, y si
     se espeja al reves no hay forma de apuntar: mover la mano a la derecha mueve la mano del juego
     a la izquierda. Se lee del propio track y no de lo que se pidio. */
  try{
    const t=st.getVideoTracks()[0], aj=t? t.getSettings() : {};
    MANO.camaraUsada=aj.facingMode||'';
    MANO.espejo = (MANO.camaraUsada!=='environment');
  }catch(e){ MANO.espejo=true; }
  /* recien ahora el detector, que es lo lento */
  let vision=null;
  for(const c of MANO_CDN){
    try{ vision=await import(c.js); MANO.cdn=c; break; }catch(e){}
  }
  if(!vision) return manosFallo('cdn');
  let fs=null;
  try{ fs=await vision.FilesetResolver.forVisionTasks(MANO.cdn.wasm); }
  catch(e){ return manosFallo('cdn'); }
  /* GPU PRIMERO Y CPU DE RESPALDO: en telefonos viejos el delegado de GPU tira al crear la tarea, y
     un detector a 15 cuadros por segundo en CPU sigue siendo un juego jugable. */
  for(const dg of ['GPU','CPU']){
    try{
      MANO.det=await vision.HandLandmarker.createFromOptions(fs,{
        baseOptions:{ modelAssetPath:MANO_MODELO, delegate:dg },
        runningMode:'VIDEO', numHands:MANO.pedidas,
        /* LOS UMBRALES BAJAN, Y NO ES PARA "DETECTAR MEJOR": ES PARA DETECTAR MENOS VECES.
           HandLandmarker en modo VIDEO tiene dos modelos y no uno. El caro es el DETECTOR DE PALMA,
           que busca la mano en el cuadro entero; el barato es el de puntos, que la sigue una vez que
           ya sabe donde esta. En modo VIDEO el de palma NO corre siempre: corre cuando el seguimiento
           se cae por debajo de minTrackingConfidence. O sea que un umbral alto no da mas precision —
           da mas VECES QUE SE VUELVE A BUSCAR LA MANO DE CERO, que es justo lo caro.
           Con 0,40 el seguimiento se sostiene mas y el detector de palma entra menos. El riesgo de
           sostener una mano que ya no esta lo cubre la caducidad de 260 ms, que ya estaba. */
        minHandDetectionConfidence:0.5,
        minHandPresenceConfidence:0.4,
        minTrackingConfidence:0.4 });
      MANO.delegado=dg; break;
    }catch(e){ MANO.det=null; }
  }
  if(!MANO.det) return manosFallo('modelo');
  MANO.estado='lista'; MANO.on=true; MANO.error='';
  MANO.hzMax  = (plataf==='movil')? MANO_HZ_MOVIL : MANO_HZ_PC;
  /* SE ARRANCA A 30 Y NO EN EL TECHO. Todavia no hay ni una medicion de cuanto tarda la deteccion en
     este aparato, asi que empezar a 60 es apostar a que es rapido — y si no lo es, el primer segundo
     de juego se ahoga justo cuando se estan compilando los shaders. Desde 30 sube o baja con la
     primera tanda de veinte mediciones, que son menos de un segundo. */
  MANO.hz = 30;
  MANO.hzTope = MANO.hzMax;
  document.body.classList.add('manos'); document.body.classList.remove('pad');
  pintarCam(); pintarCtrl();
  manosLazo();
  return MANO.estado;
}
/* =========================================================================================
   LA MEDICION VA POR SU CUENTA Y EL DIBUJO INTERPOLA

   El problema medido: detectForVideo() tarda entre 8 y 20 ms en un telefono, y estaba llamandose
   DENTRO del requestAnimationFrame del juego. O sea que cada cuadro de render pagaba la medicion, y
   con un presupuesto de 16,6 ms para 60 fps eso se come todo: el juego bajaba a 30 o menos "solo por
   las manos", que es exactamente lo que reporto el usuario.

   La solucion NO es medir mas rapido, es medir MENOS y dibujar igual:
   1. La medicion la maneja requestVideoFrameCallback del propio <video>, que dispara una vez por
      CUADRO DE CAMARA — no por cuadro de render. Segun la especificacion corre al minimo entre los
      fps del video y los del navegador, asi que con una camara de 30 fps dispara 30 veces por
      segundo aunque el juego dibuje 120. Y encima se limita a 24 Hz en telefono.
   2. Entre medicion y medicion los 21 puntos de cada mano se INTERPOLAN, con un poco de prediccion
      acotada y un suavizado exponencial. Es el mismo criterio que el juego ya usa con su paso fijo
      de 60 y sus cuadros de 120: la verdad se calcula pocas veces y el dibujo rellena.
   3. La entrada baja a 320x240 (2,25 veces menos pixeles que 480x360).

   Por que no un Web Worker, que seria lo "correcto": @mediapipe/tasks-vision hace
   document.createElement('canvas') adentro, que no existe en un worker, y el caso de iOS 17 esta
   abierto en el repositorio de MediaPipe. Un worker que no arranca en la mitad de los telefonos es
   peor que 24 Hz interpolados que arrancan en todos.
   ========================================================================================= */
/* 20 ms Y NO 8, Y EL NUMERO SALE DE MEDIR LAS TRES COSAS QUE SE PELEAN:
       pred=8  -> retardo 21 ms · manotazo 11 ms · se pasa 0,0% en una vuelta
       pred=20 -> retardo  9 ms · manotazo -1 ms · se pasa 5,8%
       pred=30 -> retardo -1 ms · manotazo -11 ms · se pasa 11,2%
   A 20 la mano deja de ir atras en el movimiento sostenido y EMPATA en un manotazo, que es lo que se
   pidio; lo que se paga es un 5,8% de exceso al frenar de golpe, o sea siete pixeles en un telefono y
   dos cuadros. Eso no se lee como rebote, se lee como inercia — y 30, que ya adelanta a la mano de
   verdad, si se nota mal. */
let MANO_PRED=20;        // ms de prediccion como maximo
/* 0,13 EN FRACCION DE CUADRO. Dos munecas mas cerca que esto no son dos manos: una mano abierta mide
   0,25 de ancho, asi que dos munecas a 0,13 estarian una encima de la otra. */
const MANO_SEP=0.13;
/* =========================================================================================
   TODO LO QUE SE MIDE EN FRACCIONES DEL MARCO TIENE QUE ESCALAR CON EL TAMAÑO DE LA MANO

   Es el defecto que reporto el jugador: "mejor deteccion de manos a lo lejos, asi no se buguean o
   desaparecen". Y la causa es una sola, repetida en cuatro constantes: la zona muerta del filtro, las
   dos puertas de velocidad y la separacion minima entre dos manos estaban todas en fracciones del
   MARCO, como si una mano midiera siempre lo mismo. Una mano al doble de distancia se ve a la mitad
   de tamaño Y SE MUEVE LA MITAD EN PANTALLA para el mismo gesto de verdad — asi que su movimiento
   real cae por debajo de umbrales pensados para una mano cerca, el filtro lo toma por ruido y lo
   aplasta, y la prediccion no se enciende nunca.

   MEDIDO, con el movimiento escalado por la distancia como pasa de verdad:
       cerca   -> 9 ms de retardo · media -> 35 ms · lejos -> 82 ms
   O sea que a cuatro veces la distancia la mano iba NUEVE VECES mas atrasada. No era que MediaPipe
   la perdiera: era que mi propio filtro la estaba frenando.

   La regla ya estaba escrita en este archivo desde la primera vuelta —"todo se mide en proporcion al
   tamano de la palma, que es invariante a la distancia"— y se habia aplicado a contar dedos y a la
   pinza, pero nunca al filtro ni a la prediccion, que se escribieron despues.

   PALMA_REF es la palma de una mano a distancia comoda, y el factor va topado por los dos lados: sin
   tope, una mano casi fuera de cuadro tendria umbrales tan chicos que volveria a pasar el ruido. */
const PALMA_REF=0.14;
function manoEscala(lm){
  const dx=lm[0].x-lm[9].x, dy=lm[0].y-lm[9].y;
  const palma=Math.hypot(dx,dy);
  return Math.max(0.22, Math.min(1.6, palma/PALMA_REF));
}
/* y a mas de 0,30 de donde estaba, ya no es la misma mano: es otra que aparecio */
const MANO_EMPAREJA=0.30;
/* la prediccion se enciende con la velocidad. Por debajo de V_QUIETA lo unico que se mueve es el
   ruido del detector, y extrapolarlo es amplificarlo. */
let V_QUIETA=0.00009, V_RAPIDA=0.00045;      // fraccion de cuadro por milisegundo
let MANO_TAU=0.005;      // constante del suavizado del dibujo, en segundos (ajustable)
const MANO_CADUCA=260;   // sin medicion nueva por mas de esto, la mano se fue
const MANO_SALTO=0.22;   // si el objetivo esta mas lejos que esto (en fraccion de pantalla), se salta

function ranuraNueva(){
  const R={ hay:false, viva:0, t0:0, t1:0,
            a:new Float32Array(63), b:new Float32Array(63), sal:new Float32Array(63),
            /* estado del filtro 1-euro EN DOS ETAPAS: valor filtrado y derivada suavizada por
               coordenada, dos veces */
            oeX:new Float32Array(63), oeD:new Float32Array(63),
            oeX2:new Float32Array(63), oeD2:new Float32Array(63), oeListo:false, oeT:0,
            dedos:0, estirados:[false,false,false,false,false], pinza:false, lado:'',
            estCand:[false,false,false,false,false], estN:[0,0,0,0,0],
            esc:0,                                     // que tan grande se ve esta mano (1 = cerca)
            escSal:0,                                  // la escala de la mano, suavizada
            lmsSal:new Array(21) };
  /* LA SALIDA VA PREASIGNADA. Convertir 21 puntos a objetos en cada cuadro son 42 objetos por
     cuadro y 2.520 por segundo tirados a la basura: en un telefono eso es el recolector de basura
     entrando cada pocos segundos, o sea un tironcito periodico justo en un juego cuyo unico defecto
     reportado era el rendimiento. Se escriben los mismos objetos siempre. */
  for(let i=0;i<21;i++) R.lmsSal[i]={x:0,y:0,z:0};
  return R;
}
MANO.ranuras=[ranuraNueva(), ranuraNueva()];

function lmsAArreglo(lm, dst){
  for(let i=0;i<21;i++){ const p=lm[i]; dst[i*3]=p.x; dst[i*3+1]=p.y; dst[i*3+2]=p.z||0; }
}
/* el arreglo suavizado vuelto a la forma que esperan manoLeer() y manoPinzas(), EN SITIO */
function arregloALms(src, dst){
  for(let i=0;i<21;i++){ const p=dst[i]; p.x=src[i*3]; p.y=src[i*3+1]; p.z=src[i*3+2]; }
  return dst;
}
/* =========================================================================================
   EL FILTRO 1-EURO, QUE ES LO QUE SACA EL TEMBLOR

   Por que el suavizado exponencial de siempre no alcanza, y esto es el nudo del problema: un filtro
   con constante FIJA tiene que elegir entre temblar o ir atrasado. Si suaviza poco, el ruido del
   detector pasa entero; si suaviza mucho, la mano llega tarde y apuntar se siente como manejar un
   barco. No hay valor que sirva para las dos cosas, porque las dos cosas no pasan al mismo tiempo.

   El 1-euro resuelve eso mirando la VELOCIDAD: cuando la mano esta quieta, lo unico que se mueve es
   el ruido, asi que baja la frecuencia de corte y lo aplasta; cuando la mano se mueve rapido, el
   ruido es despreciable al lado del movimiento, asi que abre el corte y no agrega retardo. Un solo
   filtro que es lento cuando conviene ser lento y rapido cuando conviene ser rapido.

   Y ADEMAS SE ARREGLO LA PREDICCION, que era la otra mitad del temblor y estaba escondida: la
   extrapolacion multiplicaba (b-a) por el tiempo transcurrido, y con la mano quieta (b-a) ES EL
   RUIDO. O sea que el codigo tomaba el ruido y lo amplificaba antes de dibujarlo. Ahora la prediccion
   esta ATADA A LA VELOCIDAD: con la mano quieta no predice nada.
   ========================================================================================= */
/* LOS PARAMETROS SALEN DE UN BARRIDO MEDIDO, no de un valor "razonable". Se probaron 24 y despues
   otras 24 combinaciones midiendo las dos cosas que se pelean —cuanto aplasta el temblor y cuanto
   tarda en seguir un salto— y la frontera esta en atenuar unas 4 veces con 83 ms de retardo. Bajar
   mas el corte atenua un poco mas y el retardo se va a 400 ms, que es inaceptable para apuntar.
   Y LA Z LLEVA SU PROPIO CORTE, MUCHO MAS BAJO. La z de MediaPipe es la coordenada mas ruidosa de
   las tres —es profundidad estimada de una sola camara— y en este juego no decide donde esta el
   punto en pantalla (eso lo deciden x e y sobre su rayo) sino el TAMANO del dedo y la escala de la
   mano. Con la z al mismo corte que x e y, la mano quieta latia de grosor. Filtrarla cuatro veces
   mas fuerte no cuesta nada, porque un retardo en la profundidad no se ve. */
/* Y LA PIEZA QUE FALTABA PARA PODER ACELERAR SIN QUE VUELVA EL TEMBLOR: UNA ZONA MUERTA EN LA
   DERIVADA. El 1-euro abre el corte con |derivada|, y con la mano quieta la derivada NO ES CERO: es
   el ruido del detector dividido por el intervalo, que con 0,004 de ruido a 24 Hz da del orden de
   0,1 por segundo. O sea que subir beta para que la mano siga rapido tambien multiplica ESE ruido y
   abre el corte cuando no hay que abrirlo — que es exactamente por que, en el barrido, la atenuacion
   caia de 3,83 a 3,17 al subir beta. Restandole la zona muerta a |derivada| antes de multiplicar,
   una derivada de nivel de ruido aporta CERO y una de movimiento real aporta todo: las dos cosas
   dejan de estar atadas y beta se puede subir sin pagar temblor. */
const OE={ fcMin:0.35, beta:44.0, fcD:2.4, dz:0.16, fcMinZ:0.10, betaZ:8.8, dzZ:0.16 };
function oeAlfa(fc, dt){ const tau=1/(2*Math.PI*fc); return 1/(1+tau/dt); }
/* DOS ETAPAS EN CASCADA, y el numero sale de una cuenta que hay que hacer antes de tocar parametros.
   Un filtro de primer orden con coeficiente alfa atenua el ruido en raiz(alfa/(2-alfa)); con el corte
   en 0,35 Hz sobre mediciones a 24 Hz eso da 4,8 veces COMO TECHO — barrido 24 combinaciones y
   ninguna paso de 3,45. O sea que seguir bajando el corte no iba a alcanzar nunca: el limite era el
   ORDEN del filtro, no su ajuste.
   Dos etapas iguales en cascada multiplican la atenuacion (pasa a ~23 veces) y el retardo extra lo
   paga solo la mano QUIETA, porque el corte de las dos etapas se abre con la velocidad. Es la forma
   mas barata de subir el orden sin escribir un biquad y sin tener que elegir sus coeficientes. */
function oePaso(x, d, v, j, dt, ad, esZ, esc){
  const der=(v-x[j])/dt;
  d[j] += ad*(der-d[j]);
  /* la zona muerta se achica con la mano: lo que para una mano cerca es ruido, para una lejos es
     movimiento de verdad */
  const dzc = (esZ? OE.dzZ : OE.dz) * esc;
  const mag = Math.max(0, Math.abs(d[j])-dzc);
  /* Y BETA SE DIVIDE POR LA ESCALA, que es la otra mitad de lo mismo. La zona muerta escalada evita
     que el movimiento de una mano lejana se tome por ruido, pero el corte del filtro seguia saliendo
     de beta*|derivada| — y la derivada de una mano lejana ES mas chica para el mismo gesto, asi que
     el corte quedaba mas bajo y la mano mas suavizada. Dividiendo beta por la escala, lo que manda
     pasa a ser la velocidad de la mano EN PALMAS POR SEGUNDO y no en pantalla por segundo: el mismo
     gesto abre el filtro lo mismo este cerca o lejos. */
  const b = (esZ? OE.betaZ : OE.beta) / Math.max(0.22, esc);
  const fc = (esZ? OE.fcMinZ : OE.fcMin) + b*mag;
  x[j] += oeAlfa(fc, dt)*(v-x[j]);
  return x[j];
}
function oeFiltrar(R, lm, dt, esc){
  if(!R.oeListo){
    lmsAArreglo(lm, R.oeX); R.oeX2.set(R.oeX);
    R.oeD.fill(0); R.oeD2.fill(0); R.oeListo=true; return R.oeX2;
  }
  const ad=oeAlfa(OE.fcD, dt);
  for(let i=0;i<21;i++){
    const p=lm[i];
    for(let c=0;c<3;c++){
      const j=i*3+c;
      const v = c===0? p.x : (c===1? p.y : (p.z||0));
      const esZ=(c===2);
      oePaso(R.oeX2, R.oeD2, oePaso(R.oeX, R.oeD, v, j, dt, ad, esZ, esc), j, dt, ad, esZ, esc);
    }
  }
  return R.oeX2;
}
/* una medicion entra a su ranura: se filtra, corre la anterior a `a`, la nueva a `b`, y guarda los
   tiempos. Es lo unico que la interpolacion necesita saber. */
function ranuraPoner(q, lm, t){
  const R=MANO.ranuras[q];
  const lec=manoLeer(lm);
  if(lec){
    R.dedos=lec.dedos; R.pinza=lec.pinza;
    /* CADA DEDO NECESITA DOS LECTURAS IGUALES PARA CAMBIAR DE ESTADO. El total ya pasaba por un voto
       de tres, pero `estirados` —que es lo que pinta las puntas de las manos 3D— se tomaba crudo: un
       dedo a medio estirar cruzaba el umbral varias veces por segundo y la punta parpadeaba de color.
       Un dedo que se estira tarda mas de dos cuadros; el ruido, no. */
    for(let d=0;d<5;d++){
      const v=!!lec.estirados[d];
      if(v===R.estirados[d]){ R.estCand[d]=v; R.estN[d]=0; }
      else if(v===R.estCand[d]){ if(++R.estN[d]>=2){ R.estirados[d]=v; R.estN[d]=0; } }
      else { R.estCand[d]=v; R.estN[d]=1; }
    }
  }
  const dt=Math.max(0.008, (t-(R.oeT||t-33))/1000);
  R.oeT=t;
  if(!R.hay){ R.oeListo=false; }
  /* la escala de ESTA mano, suavizada: salta si MediaPipe tiembla en un cuadro, y un salto de escala
     mueve todos los umbrales a la vez */
  const escCruda=manoEscala(lm);
  R.esc = R.esc>0? R.esc + (escCruda-R.esc)*0.20 : escCruda;
  const fx=oeFiltrar(R, lm, dt, R.esc);
  if(!R.hay){ R.a.set(fx); R.sal.set(fx); R.t0=t-33; }
  else { R.a.set(R.b); R.t0=R.t1; }
  R.b.set(fx);
  R.t1=t; R.hay=true; R.viva=t;
  return R;
}
/* GANCHO DE PRUEBA: mete manos como si las hubiera medido la camara. Entra por el MISMO lugar que
   una medicion de verdad —las ranuras— porque probar el dibujo por otro camino no probaria ni la
   interpolacion ni el reparto por mano izquierda/derecha. */
function manosInyectar(lms, t){
  const ahora = t==null? performance.now() : t;
  const n=Math.min(2, (lms&&lms.length)||0);
  for(let k=0;k<n;k++) ranuraPoner(k, lms[k], ahora);
  for(let q=n;q<2;q++) MANO.ranuras[q].hay=false;
  MANO.lms=lms||null;
}

/* =========================================================================================
   DE LAS DETECCIONES CRUDAS A LAS DOS RANURAS
   Sale de manosMedir() a su propia funcion por una razon de prueba: el reparto es donde estaba el
   defecto de "se crean dos manos", asi que el banco tiene que poder inyectar detecciones y ver a que
   ranura van. Probandolo por otro camino no se probaria el reparto.
   ========================================================================================= */
function manosRepartir(crudas, lados, t){
  MANO.lms=crudas.length? crudas : null;
  /* =======================================================================================
     UNA MANO ES UNA MANO: SE TIRAN LAS DETECCIONES DUPLICADAS

     Esto era el defecto que rompia el conteo. Con dos manos declaradas, MediaPipe puede devolver la
     MISMA mano fisica dos veces —dos cajas que se solapan sobre los mismos dedos— y el juego sumaba
     los dedos de las dos: cuatro dedos se contaban ocho. Se descarta toda deteccion cuya muneca este
     a menos de MANO_SEP de otra ya aceptada; a esa distancia no hay dos manos, hay una vista dos
     veces. Se prefiere la de palma mas grande, que es la que esta mejor resuelta.
     ======================================================================================= */
  const acept=[];
  for(let k=0;k<crudas.length;k++){
    const lm=crudas[k];
    const lec=manoLeer(lm); if(!lec) continue;
    const mu=lm[0];
    let dup=-1;
    for(let q=0;q<acept.length;q++){
      const o=acept[q].lm[0];
      /* y la separacion minima entre dos manos tambien: dos manos LEJOS estan mas cerca una de otra
         en pantalla que dos manos cerca, asi que con el umbral fijo se las tomaba por una sola */
      if(Math.hypot(mu.x-o.x, mu.y-o.y) < MANO_SEP*manoEscala(lm)){ dup=q; break; }
    }
    const cat=(lados[k] && lados[k][0] && lados[k][0].categoryName)||'';
    if(dup>=0){
      MANO.dupes++;
      if(lec.palma > acept[dup].palma) acept[dup]={ lm, palma:lec.palma, cat };
    } else acept.push({ lm, palma:lec.palma, cat });
    if(acept.length>=2) { /* nunca hacen falta mas de dos */ }
  }
  /* =======================================================================================
     Y LAS RANURAS SE ASIGNAN POR CERCANIA, NO POR handedness.

     Usar Left/Right parecia lo estable y es lo contrario, y la razon es la camara TRASERA: MediaPipe
     decide la mano suponiendo una imagen ESPEJADA, la de una camara frontal. Con la trasera la imagen
     no esta espejada, asi que la etiqueta se le da vuelta —y peor, PARPADEA entre cuadros. Una sola
     mano real alternando Left/Right cae un cuadro en la ranura 0 y el siguiente en la 1, las dos
     quedan vivas los 260 ms de caducidad, y el juego ve DOS MANOS y suma el doble de dedos.
     La posicion no parpadea: una mano esta donde estaba hace 40 ms. Se empareja cada deteccion con
     la ranura cuya ultima muneca este mas cerca, y si ninguna esta razonablemente cerca, va a una
     ranura libre.
     ======================================================================================= */
  const libre=[!MANO.ranuras[0].hay || (t-MANO.ranuras[0].viva)>MANO_CADUCA,
               !MANO.ranuras[1].hay || (t-MANO.ranuras[1].viva)>MANO_CADUCA];
  const tomada=[false,false];
  const pend=[];
  for(const c of acept){
    let mejor=-1, mejorD=MANO_EMPAREJA;
    for(let q=0;q<2;q++){
      if(tomada[q] || libre[q]) continue;
      const R=MANO.ranuras[q];
      const d=Math.hypot(c.lm[0].x-R.b[0], c.lm[0].y-R.b[1]);
      if(d<mejorD){ mejorD=d; mejor=q; }
    }
    if(mejor>=0){ tomada[mejor]=true; ranuraPoner(mejor, c.lm, t).lado=c.cat; }
    else pend.push(c);
  }
  for(const c of pend){
    let q=-1;
    for(let i=0;i<2;i++) if(!tomada[i]){ q=i; break; }
    if(q<0) break;
    tomada[q]=true;
    MANO.ranuras[q].hay=false;            // entra nueva: sin arrastre de la anterior
    ranuraPoner(q, c.lm, t).lado=c.cat;
  }
}

function manosMedir(t){
  let r=null;
  const t0=performance.now();
  try{ r=MANO.det.detectForVideo(MANO.vid, t); }catch(e){ return; }
  MANO.msDet = MANO.msDet*0.8 + (performance.now()-t0)*0.2;
  MANO.medidas++;
  /* EL TOPE SE DECIDE ACA Y NO EN EL BORDE DE ESCENA: aca es donde se sabe si hay una mano, y tiene
     que subir en la MISMA medicion que la encuentra. Decidido por escena, la mano aparecia y seguia
     yendo a ritmo de reposo hasta el siguiente cambio de escena. */
  const tope=manoTope();
  MANO.hzTope=tope;
  if(MANO.hz<tope) MANO.hz=tope;          // subir es inmediato; bajar lo hace manoRitmoAjustar
  /* cada veinte mediciones se revisa el ritmo: mas seguido persigue el ruido de una medicion suelta */
  if(!(MANO.medidas%20)) manoRitmoAjustar();
  const crudas=(r && r.landmarks)? r.landmarks : [];
  const lados=(r && (r.handednesses||r.handedness)) || [];
  manosRepartir(crudas, lados, t);
  pintarCam();
}

const _salida=[], _lmsTmp=[];
/* SE LLAMA UNA VEZ POR CUADRO DE RENDER, y es lo unico de las manos que corre a 60. */
function manosAvanzar(dt){
  const ahora=performance.now();
  let vivas=0, total=0, pinza=false;
  const salida=_salida; salida.length=0;
  for(let q=0;q<2;q++){
    const R=MANO.ranuras[q];
    if(!R.hay) continue;
    /* con la pausa puesta no caducan: en el banco la mano se inyecta y despues hay que sacar la
       foto, y una captura por CDP tarda mas de los 260 ms de caducidad — la mano se moria entre la
       inyeccion y la foto y la captura salia sin manos aunque el codigo estuviera bien. */
    if(!MANO.pausa && ahora-R.viva > MANO_CADUCA){ R.hay=false; continue; }
    const span=Math.max(8, R.t1-R.t0);
    /* LA PREDICCION SE ENCIENDE CON LA VELOCIDAD: con la mano quieta, (b-a) no es movimiento sino el
       ruido del detector, asi que extrapolarlo es amplificarlo. Quieta no predice nada.

       Y ACA HUBO UNA SEGUNDA PUERTA QUE SE PROBO Y SE SACO, que vale anotar para no volver a
       intentarla. La idea era mirar si la mano viene DERECHO o esta DOBLANDO —comparando el ultimo
       desplazamiento con el anterior— y apagar la prediccion en la curva, que es el unico momento en
       que predecir hace dano. Medido, no cambiaba absolutamente nada: el barrido dio columnas
       IDENTICAS para umbrales de 0,0 a 0,9999, que es la firma de un parametro que no toca nada.
       Y la razon no es que estuviera mal conectada: es que la puerta no puede funcionar. El
       sobrepico de una vuelta ocurre ANTES de que la vuelta se pueda ver — mientras la mano todavia
       va derecho a toda velocidad, la prediccion la empuja mas alla, y recien la medicion siguiente
       muestra que dio la vuelta. Para cuando la puerta se entera, el pico ya paso. Un predictor no
       puede anticipar un cambio de sentido que todavia no ocurrio, y ninguna cantidad de historia lo
       arregla. Asi que el tope de prediccion se elige midiendo el intercambio y no tapandolo. */
    const vel=Math.hypot(R.b[0]-R.a[0], R.b[1]-R.a[1])/span;
    /* las dos puertas tambien escalan con el tamaño de la mano, por el mismo motivo que la zona
       muerta: una mano lejos nunca alcanzaria la velocidad de una cerca aunque haga el mismo gesto */
    const e=(R.esc>0? R.esc : 1);
    const vq=V_QUIETA*e, vr=V_RAPIDA*e;
    const puerta=Math.max(0, Math.min(1, (vel-vq)/(vr-vq)));
    const f = 1 + puerta*Math.min(MANO_PRED, ahora-R.t1)/span;
    const k = 1-Math.exp(-dt/MANO_TAU);
    /* si el objetivo salto lejisimo —la mano reaparecio en otro lado— no se desliza, se pone */
    const d=Math.hypot(R.b[0]+(R.b[0]-R.a[0])*(f-1)-R.sal[0],
                       R.b[1]+(R.b[1]-R.a[1])*(f-1)-R.sal[1]);
    const salta = d>MANO_SALTO;
    for(let i=0;i<63;i++){
      const obj=R.b[i]+(R.b[i]-R.a[i])*(f-1);
      R.sal[i] = salta? obj : R.sal[i]+(obj-R.sal[i])*k;
    }
    vivas++; total+=R.dedos; if(R.pinza) pinza=true;
    salida.push(R);
  }
  MANO.hay=vivas>0; MANO.manos=vivas;
  MANO.crudo=Math.min(10, total);
  MANO.gesto=pinza? 'pinza' : '';
  manoVoto(vivas? Math.min(10,total) : -1);
  /* las pinzas salen de los puntos SUAVIZADOS, no de la ultima medicion: si salieran de la medicion,
     apuntar a un bicho seria apuntar con una mano que se mueve a saltos de 24 Hz mientras se ve una
     que se mueve a 60 */
  /* el .map() alojaba un arreglo NUEVO en cada cuadro solo para pasar dos elementos: 60 arreglos por
     segundo a la basura. Se llena uno fijo. */
  _lmsTmp.length=0;
  for(let i=0;i<salida.length;i++) _lmsTmp.push(arregloALms(salida[i].sal, salida[i].lmsSal));
  MANO.pinzas=manoPinzas(_lmsTmp);
  MANO.vivas=salida;
}

/* el lazo de medicion, colgado del video y no del render */
function manosLazo(){
  const v=MANO.vid; if(!v) return;
  const paso=(ahora)=>{
    if(MANO.estado!=='lista'){ return; }
    const t=performance.now();
    if(!MANO.pausa && v.readyState>=2 && (t-MANO.ultT) >= (1000/MANO.hz)-2){
      MANO.ultT=t; manosMedir(t);
    }
    pedir();
  };
  const pedir=()=>{
    if(MANO.estado!=='lista') return;
    if(v.requestVideoFrameCallback) v.requestVideoFrameCallback(paso);
    else setTimeout(()=>paso(performance.now()), Math.max(8, 1000/MANO.hz));
  };
  pedir();
}

function pintarCam(){
  const e=document.getElementById('camEst'); if(!e) return;   // sigue existiendo, oculto
  if(MANO.estado==='carga'){ e.textContent=TX('manoCarga'); return; }
  if(MANO.estado!=='lista'){ e.textContent='—'; return; }
  if(!MANO.hay){ e.textContent=TX('manoLista'); return; }
  if(MANO.gesto==='pinza'){ e.textContent=TX('hazPinza'); return; }
  /* CON DOS MANOS SE DICE QUE SON DOS. El detector va con numHands 2 porque las cuentas llegan a
     diez, y si el cartel dice solo "7 DEDOS" no hay forma de saber si leyo las dos manos o una. */
  const n=(MANO.crudo!=null? MANO.crudo : Math.max(0,MANO.dedos));
  e.textContent = (MANO.manos>1)? TX('manoDos',{n}) : TX('dedos',{n});
}

/* ===================== EL TECLADO DE NUMEROS (RESPALDO) ===================== */
let padPedido=-1;
(function armarPad(){
  const c=document.getElementById('pad');
  for(let k=1;k<=10;k++){
    const b=document.createElement('button');
    b.textContent = k===10? '10' : String(k);
    b.onclick=()=>{ padPedido=k; };
    c.appendChild(b);
  }
})();

/* ===================== EL TOQUE, PARA QUIEN NO TIENE CAMARA =====================
   Los bichos se revientan con pinza, pero un juego que solo se puede jugar con webcam es un juego
   que la mayoria no puede jugar — la misma razon por la que existe el teclado de numeros. Un toque
   en la pantalla es la pinza de quien no tiene camara, y ademas es lo que cualquiera intenta primero.
   Se guardan las coordenadas NORMALIZADAS del marco y no los pixeles: el marco cambia de tamano con
   la pantalla, y la proyeccion de los bichos tambien, asi que compararlos en 0..1 es lo unico que no
   depende del aparato. */
const TOQUES=[];
(function(){
  const m=document.getElementById('marco'); if(!m) return;
  m.addEventListener('pointerdown', e=>{
    const r=m.getBoundingClientRect();
    if(!r.width || !r.height) return;
    TOQUES.push({ x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height });
    if(TOQUES.length>8) TOQUES.shift();
  }, {passive:true});
})();

