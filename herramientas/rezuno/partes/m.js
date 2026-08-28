/* =========================================================================================
   MULTIJUGADOR 1 CONTRA 1, SIN SERVIDOR

   Pedido: *"agrega un modo multijugador que al tocar jugar podés elegir entre multijugador y con
   bots, 1vs1 nomás"*, con un relevo MQTT publico y sin backend.

   TRANSPORTE: `mqtt.min.js` desde unpkg y `wss://broker.emqx.io:8084/mqtt`. Todos los temas llevan el
   prefijo `rezuno_v1_` para que dos juegos distintos no se pisen en un broker que es de todo el
   mundo. Tres temas por sala: `/state` (presencia), `/action` (las jugadas) y `/chat`.

   ===== POR QUE ESTE JUEGO NO NECESITA UN SERVIDOR NI UN ANFITRION, Y ESO NO ES SUERTE =====
   Un juego de accion con dos jugadores moviendose a la vez necesita a alguien que decida quien tiene
   razon. Un juego de cartas POR TURNOS no: en cada instante hay exactamente UN jugador que puede
   hacer algo, asi que no hay dos verdades que reconciliar. Los dos clientes corren la MISMA partida y
   se mandan solo las jugadas.

   Y el mazo tampoco necesita servidor, porque el mazo es una SEMILLA. `repartir(semilla)` es
   determinista: con el mismo numero, los dos clientes barajan identico y reparten identico. Lo unico
   que viaja al empezar son dos datos —la semilla y quien arranca— y no ciento ocho cartas.

   ===== QUIEN REPARTE SE DECIDE COMPARANDO LOS DOS ID, SIN NEGOCIAR =====
   Hace falta que UNO tire la semilla, o los dos tirarian una distinta. Elegirlo con mensajes seria un
   protocolo con sus carreras y sus empates; comparando los dos identificadores al azar —gana el menor
   como texto— los dos clientes llegan a la MISMA conclusion por su cuenta y sin mandar nada. La regla
   es total y simetrica, asi que no hay empate posible ni orden de llegada que la cambie.

   ===== LAS DOS SILLAS SE ESPEJAN =====
   Cada jugador es siempre J_VOS en su propia pantalla. Como la mesa tiene dos sillas, el que no
   reparte simplemente INTERCAMBIA las dos manos y el turno: 0 pasa a ser 1 y 1 pasa a ser 0. Es una
   involucion, asi que no hay tabla de traduccion que mantener ni forma de que se desincronice.

   ===== Y LA JUGADA VIAJA COMO CARTA, NO COMO INDICE =====
   El indice no sirve: cada uno ORDENA su propia mano por color y valor —lo hace desde la primera
   vuelta, porque buscar en un abanico desordenado es leer nueve cartas de a una— asi que la carta
   numero 3 de uno no es la numero 3 del otro. Mandando `{color, valor}` el receptor la busca en la
   mano del rival y la saca. Robar y pasar no llevan nada: los dos sacan del mismo mazo, en el mismo
   orden, porque las jugadas llegan en el mismo orden.
   ========================================================================================= */
const MP_NS='rezuno_v1_';
const MP_BROKER='wss://broker.emqx.io:8084/mqtt';
const MP_CADUCA=5000;          // sin noticias del rival por mas de esto, se lo da por ido
const MP_LATIDO=100;           // cada cuanto se publica el estado propio, como pide el pedido

const MP={ on:false, cli:null, estado:'no', sala:'', reparte:false, jugando:false,
           id:'', nom:'', rivalId:'', rivalNom:'', visto:0, ultLatido:0, chat:[], errores:0,
           /* lo ultimo que se publico, para no publicar lo mismo otra vez */
           ultEstado:'',
           /* ===== LA RONDA Y LA HUELLA: COMO SE DETECTA QUE LAS DOS PARTIDAS SE SEPARARON =====
              qos 0 no garantiza entrega, y hay UN mensaje cuya perdida no se puede reparar sola: el
              reparto. Si se pierde, uno arranca una partida nueva y el otro sigue en la vieja, los dos
              creen que le toca al otro y la mesa se queda muerta para siempre — medido, paso en la
              prueba de tres partidas seguidas.
              Se arregla con dos numeros en el latido. `ronda` sube en cada reparto: el que reparte ve
              que el otro se quedo en la ronda anterior y REPITE el reparto. Y `huella` es el tamano de
              la pila y del mazo: si discrepan un segundo entero, algo se perdio en el medio y la unica
              reparacion honesta es repartir de nuevo — mucho mejor que seguir jugando dos partidas
              distintas sin que nadie se entere. */
           ronda:0, semilla:0, rondaRival:-1, huellaRival:'', desdeMal:0,
           /* ===== LA MANO DEL OTRO, TAL CUAL LA MUEVE =====
              Pedido: *"cuando juegues 1vs1 con otra persona vos podras ver exactamente como mueve sus
              manos"*. Y "exactamente" quiere decir los VEINTIUN PUNTOS, no una pose que se parezca:
              lo que viaja es lo mismo que MediaPipe midio del otro lado, redondeado a tres decimales.
              63 numeros a 8 por segundo son unos tres kilobytes por segundo, que en un relevo publico
              es despreciable y es lo unico que hace que se le vean los dedos moverse de verdad. */
           manoRival:null, manoRivalT:0 };
const MP_MANO_HZ=8;

/* un identificador estable y al azar por pestana. No hace falta que sea unico en el universo: solo
   que dos jugadores de la misma sala no lo compartan. */
function mpNuevoId(){
  const a='abcdefghijkmnpqrstuvwxyz23456789';
  let r=''; for(let k=0;k<10;k++) r+=a[Math.floor(Math.random()*a.length)];
  return r;
}
function mpNuevaSala(){
  const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r=''; for(let k=0;k<4;k++) r+=a[Math.floor(Math.random()*a.length)];
  return r;
}
function mpTema(q){ return MP_NS+MP.sala+'/'+q; }

/* ---------- conectar ---------- */
function mpConectar(sala, nombre){
  if(typeof mqtt==='undefined'){ mpEstado('sinlib'); return false; }
  mpCortar();
  MP.sala=(sala||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8) || mpNuevaSala();
  MP.id=MP.id||mpNuevoId();
  MP.nom=(nombre||'').slice(0,12) || ('P-'+MP.id.slice(0,3).toUpperCase());
  MP.rivalId=''; MP.rivalNom=''; MP.visto=0; MP.reparte=false; MP.jugando=false; MP.chat.length=0;
  mpEstado('conectando');
  try{
    MP.cli=mqtt.connect(MP_BROKER, { keepalive:30, reconnectPeriod:2500, connectTimeout:8000,
                                     clientId:'rez_'+MP.id+'_'+Date.now() });
  }catch(e){ mpEstado('error'); return false; }
  MP.cli.on('connect', ()=>{
    mpEstado('online');
    MP.cli.subscribe([mpTema('state'), mpTema('action'), mpTema('chat')], {qos:0});
    MP.on=true;
    mpPublicar('state', { tipo:'hola', id:MP.id, name:MP.nom });
  });
  MP.cli.on('close',   ()=>{ if(MP.estado!=='no') mpEstado('offline'); });
  MP.cli.on('error',   ()=>{ MP.errores++; mpEstado('error'); });
  MP.cli.on('offline', ()=>{ if(MP.estado!=='no') mpEstado('offline'); });
  MP.cli.on('message', (tema, cuerpo)=>{
    let d=null;
    try{ d=JSON.parse(cuerpo.toString()); }catch(e){ return; }
    /* LA REGLA DEL PEDIDO, Y ES LA QUE EVITA APLICAR TODO DOS VECES: lo propio ya se aplico al
       hacerlo, asi que el eco se descarta. */
    if(!d || d.id===MP.id) return;
    const q=tema.slice(tema.lastIndexOf('/')+1);
    if(q==='state')  mpDeEstado(d);
    else if(q==='action') mpDeAccion(d);
    else if(q==='chat')   mpDeChat(d);
  });
  return true;
}
function mpCortar(){
  if(MP.cli){ try{ MP.cli.end(true); }catch(e){} MP.cli=null; }
  MP.on=false; MP.jugando=false; MP.rivalId=''; mpEstado('no');
}
function mpPublicar(q, d){
  if(!MP.cli || !MP.on) return false;
  try{ MP.cli.publish(mpTema(q), JSON.stringify(d), {qos:0}); return true; }catch(e){ return false; }
}
function mpEstado(e){ MP.estado=e; if(typeof pintarMP==='function') pintarMP(); }

/* ---------- presencia ---------- */
function mpDeEstado(d){
  if(!d.id) return;
  const nuevo = (d.id!==MP.rivalId);
  MP.rivalId=d.id; MP.rivalNom=d.name||'?'; MP.visto=performance.now();
  if(nuevo){
    /* SE CONTESTA EL SALUDO. El que ya estaba en la sala no se entera de que llego alguien si el que
       llega no habla, y el que llega no se entera del que estaba si el que estaba no contesta. */
    mpPublicar('state', { tipo:'hola', id:MP.id, name:MP.nom });
    /* gana el menor como texto: los dos llegan a la misma conclusion sin mandarse nada */
    MP.reparte = MP.id < MP.rivalId;
    if(typeof mpListos==='function') mpListos();
  }
  if(d.cartas!=null) MP.rivalCartas=d.cartas;
  if(d.ronda!=null) MP.rondaRival=d.ronda;
  if(d.huella!=null) MP.huellaRival=d.huella;
  mpVigilar();
}
/* ===== EL VIGILANTE DE SINCRONIA, Y SOLO EL QUE REPARTE PUEDE REPARAR =====
   Los dos detectan el problema, pero si los dos repartieran habria dos semillas nuevas y el remedio
   seria el mismo mal. El que reparte es el unico que puede tirar una semilla, y ya esta elegido sin
   negociar. */
function mpVigilar(){
  if(!MP.on || !MP.rivalId || !MP.reparte) return;
  const t=performance.now();
  /* 1. el rival se quedo en una ronda anterior: no le llego el reparto */
  if(MP.jugando && MP.rondaRival>=0 && MP.rondaRival<MP.ronda){
    if(t-MP.desdeMal>1000){ MP.desdeMal=t; MP.errores++;
      mpPublicar('action', { tipo:'reparto', id:MP.id, semilla:MP.semilla, ronda:MP.ronda }); }
    return;
  }
  /* 2. misma ronda pero distinta mesa: se perdio una jugada en el medio */
  if(MP.jugando && MP.rondaRival===MP.ronda && MP.huellaRival && MP.huellaRival!==mpHuella()){
    if(!MP._malDesde) MP._malDesde=t;
    else if(t-MP._malDesde>1000){ MP._malDesde=0; MP.errores++;
      if(typeof mpDesync==='function') mpDesync();
      mpRepartirYo(); }
    return;
  }
  MP._malDesde=0;
}
/* la mesa en dos numeros: no hace falta mas para saber que las dos partidas dejaron de ser la misma */
function mpHuella(){ return G.pila.length+'|'+G.mazo.length; }
/* se llama desde el bucle: publica el latido y cobra la caducidad */
function mpTick(t){
  if(!MP.on) return;
  if(t-MP.ultLatido>=MP_LATIDO){
    MP.ultLatido=t;
    const e=MP.jugando? (G.manos[J_IZQ].length+'|'+G.turno+'|'+mpHuella()+'|'+MP.ronda) : 'sala';
    /* ===== SOLO SI CAMBIO, PERO CON UN PISO DE UNA VEZ POR SEGUNDO =====
     "Publicar solo cuando algo cambia" es correcto para el ESTADO y catastrofico para la PRESENCIA, y
     son dos trabajos distintos que viajan en el mismo mensaje. Con la regla a secas, un jugador que se
     queda pensando su turno no cambia nada y por lo tanto deja de hablar: a los cinco segundos el otro
     lo da por ido y le corta la partida. Medido — la partida moria sola antes de la primera jugada,
     porque entre el reparto y el primer movimiento no cambia nada.
     Cambios: hasta diez veces por segundo. Silencio: una vez por segundo, que alcanza de sobra para
     una caducidad de cinco y sigue siendo tráfico despreciable. */
    if(e!==MP.ultEstado || t-(MP._salaT||0)>1000){
      MP.ultEstado=e; MP._salaT=t;
      mpPublicar('state', { tipo:'vivo', id:MP.id, name:MP.nom,
                            cartas:MP.jugando? G.manos[J_VOS].length : 0,
                            ronda:MP.ronda, huella:MP.jugando? mpHuella() : '' });
    }
  }
  /* la mano propia al aire, a su propio ritmo y solo si hay algo que mandar */
  if(t-(MP._manoT||0) >= 1000/MP_MANO_HZ){
    MP._manoT=t;
    if(MANO.hayPts && MANO.hay){
      const a=new Array(63);
      for(let k=0;k<63;k++) a[k]=Math.round(MANO.pts[k]*1000)/1000;
      mpPublicar('action', { tipo:'mano', id:MP.id, p:a });
      MP._manoIba=true;
    } else if(MP._manoIba){
      /* UN AVISO DE QUE SE FUE, Y UNO SOLO. Sin el, la ultima mano medida se quedaria colgada en la
         mesa del otro para siempre; mandandolo en cada vuelta seria un mensaje por nada diez veces
         por segundo mientras nadie levanta la mano. */
      MP._manoIba=false;
      mpPublicar('action', { tipo:'mano', id:MP.id, p:null });
    }
  }
  if(MP.rivalId && t-MP.visto>MP_CADUCA){
    MP.rivalId=''; MP.rivalNom='';
    MP.manoRival=null;
    if(MP.jugando){ MP.jugando=false; G.fase='menu'; if(typeof mpSeFue==='function') mpSeFue(); }
    else if(typeof mpListos==='function') mpListos();
  }
}

/* ---------- las jugadas ---------- */
function mpDeAccion(d){
  if(d.tipo==='reparto'){
    /* REPETIDO NO SE VUELVE A APLICAR. El que reparte insiste hasta que el otro llega a su ronda, asi
       que el mismo mensaje puede llegar varias veces; aplicarlo de nuevo reiniciaria una partida que
       ya esta bien encaminada. */
    if(d.ronda!=null && d.ronda===MP.ronda && MP.jugando) return;
    MP.ronda=(d.ronda!=null)? d.ronda : MP.ronda+1;
    mpEmpezar(d.semilla, false);
    return;
  }
  if(d.tipo==='mano'){
    /* SIN PARTIDA TAMBIEN SE ACEPTA: en la sala, ver moverse la mano del otro es la forma mas rapida
       de saber que del otro lado hay alguien de verdad y que su camara anda. */
    MP.manoRival = (d.p && d.p.length===63)? d.p : null;
    MP.manoRivalT = performance.now();
    return;
  }
  if(!MP.jugando) return;
  if(d.tipo==='tira'){
    const m=G.manos[J_IZQ];
    let i=-1;
    for(let k=0;k<m.length;k++) if(m[k].color===d.carta.color && m[k].valor===d.carta.valor){ i=k; break; }
    /* SI LA CARTA NO ESTA, NO SE INVENTA. Perder un mensaje es posible con qos 0; lo que no se puede
       hacer es sacar otra carta cualquiera y seguir como si nada, porque a partir de ahi las dos
       partidas son distintas y nadie se entera. */
    if(i<0){ MP.errores++; return; }
    jugarCarta(J_IZQ, i, d.color);
  } else if(d.tipo==='roba'){
    const c=robarDelMazo(); if(c) G.manos[J_IZQ].push(c);
    son('roba');
    if(d.pasa){ G.turno=siguiente(J_IZQ); G.robo=false; }
  } else if(d.tipo==='pasa'){
    G.turno=siguiente(J_IZQ); G.robo=false;
  }
}
/* lo que el jugador local hizo, al aire. Se llama DESPUES de aplicarlo, no antes: si se publicara
   primero y la jugada resultara invalida, el rival veria una jugada que aca no paso. */
function mpTiro(carta, color){ mpPublicar('action', { tipo:'tira', id:MP.id, carta:{color:carta.color, valor:carta.valor}, color:(color==null? null : color) }); }
function mpRobo(pasa){ mpPublicar('action', { tipo:'roba', id:MP.id, pasa:!!pasa }); }
function mpPaso(){ mpPublicar('action', { tipo:'pasa', id:MP.id }); }

/* ---------- empezar ---------- */
function mpEmpezar(semilla, soyYo){
  ponerJugadores(2);
  repartir(semilla);
  /* EL QUE NO REPARTE INTERCAMBIA LAS DOS SILLAS. Con dos sillas el intercambio es su propio inverso,
     asi que no hay tabla que mantener: cada uno es J_VOS en su pantalla y el otro es J_IZQ. */
  if(!MP.reparte){
    const t=G.manos[0]; G.manos[0]=G.manos[1]; G.manos[1]=t;
    G.turno = (G.turno===J_VOS)? J_IZQ : J_VOS;
    ordenarMano(J_VOS);
  }
  MP.jugando=true; MP.ultEstado='';
  G.fase='juego';
  if(typeof mpArranco==='function') mpArranco();
}
/* lo llama el que reparte cuando hay dos en la sala */
function mpRepartirYo(){
  if(!MP.reparte || !MP.rivalId) return false;
  const s=(Date.now()&0x7fffffff)||1;
  MP.ronda++; MP.semilla=s; MP.desdeMal=performance.now(); MP._malDesde=0;
  mpPublicar('action', { tipo:'reparto', id:MP.id, semilla:s, ronda:MP.ronda });
  mpEmpezar(s, true);
  return true;
}

/* ---------- chat ---------- */
function mpDecir(txt){
  const t=(txt||'').slice(0,60);
  if(!t) return;
  mpPublicar('chat', { id:MP.id, name:MP.nom, text:t });
  mpChatPone(MP.nom, t, true);
}
function mpDeChat(d){ mpChatPone(d.name||'?', (d.text||'').slice(0,60), false); }
function mpChatPone(nom, txt, mio){
  MP.chat.push({nom, txt, mio, t:performance.now()});
  while(MP.chat.length>6) MP.chat.shift();
  if(typeof pintarChat==='function') pintarChat();
}
