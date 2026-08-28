/* =========================================================================================
   LA PARTIDA

   Tres jugadores: vos (0) y dos rivales (1 y 2). TRES Y NO DOS, y el motivo es una carta: con dos
   jugadores el "gira" es identico al "salta" —le devuelve el turno al que la tiro— asi que una de
   las cuatro cartas de accion dejaria de significar algo. Con tres, girar cambia a quien le toca.

   TODO EL ESTADO EN UN OBJETO. Sin esto, "reiniciar" es acordarse de poner a mano quince variables y
   la que se olvide se arrastra a la partida siguiente — que es como se ven los defectos que solo
   aparecen en la segunda partida.
   ========================================================================================= */
const J_VOS=0, J_IZQ=1, J_DER=2;
/* ===================== CUANTOS JUGADORES HAY EN LA MESA =====================
   Con bots son tres —vos y los dos rivales, que es lo que habia—; en multijugador son DOS, que es lo
   que se pidio ("1vs1 nomas"). El numero deja de estar clavado en el 3 que estaba escrito en cuatro
   lugares distintos: `siguiente()`, el reparto, las manos y los avisos de UNO.
   Y NO ES SOLO UN NUMERO: con dos jugadores el GIRO no puede invertir nada —la vuelta de dos siempre
   devuelve al otro— asi que la carta de girar pasa a comportarse como la de saltar, que es la regla
   de verdad del UNO de dos. Sin eso, girar seria una carta que no hace absolutamente nada. */
let N_JUG=3;
function ponerJugadores(n){ N_JUG=(n===2)?2:3; }
const G={ manos:[[],[],[]], mazo:[], pila:[], color:0, valor:0, turno:0, giro:1,
          fase:'menu', gana:-1, robo:false, sel:-1, colorPide:false, aviso:'', avisoT:0,
          mov:[], t:0, semilla:1, tutorial:false, botT:0, uno:[false,false,false],
          /* el turno de un rival deja de ser un instante y pasa a ser una secuencia visible:
             piensa -> agarra la carta de su abanico -> la lleva a la pila. Ver mas abajo. */
          bot:{ j:-1, fase:'', t:0, idx:-1 } };

/* las animaciones son una lista de cosas que viajan de un punto a otro y despues se olvidan. No hace
   falta nada mas elaborado: una carta que se tira es un rectangulo yendo de A a B en medio segundo */
function volar(carta, x0,y0,x1,y1, seg, boca){
  G.mov.push({ c:carta, x0,y0,x1,y1, t:0, dur:seg||0.42, boca:!!boca });
}
function movTick(dt){
  for(let i=G.mov.length-1;i>=0;i--){
    const m=G.mov[i]; m.t+=dt;
    if(m.t>=m.dur) G.mov.splice(i,1);
  }
}
function movHay(){ return G.mov.length>0; }

function robarDelMazo(){
  if(!G.mazo.length){
    /* SE REBARAJA LA PILA MENOS LA DE ARRIBA. Sin esto, en una partida larga el mazo se vacia y el
       juego se queda esperando una carta que no existe — y eso no se ve probando dos minutos. */
    if(G.pila.length<2) return null;
    const arriba=G.pila.pop();
    G.mazo=mezclar(G.pila.splice(0, G.pila.length));
    G.pila=[arriba];
  }
  return G.mazo.pop() || null;
}

function repartir(semilla){
  SEM=semilla|0 || 1; G.semilla=SEM;
  G.mazo=mezclar(mazoNuevo());
  G.manos=[[],[],[]];
  for(let k=0;k<7;k++) for(let j=0;j<N_JUG;j++) G.manos[j].push(G.mazo.pop());
  /* LA PRIMERA DE LA PILA NO PUEDE SER UNA CARTA DE ACCION. Si sale un +4 antes de que nadie jugara,
     el juego arranca preguntandole un color a alguien que todavia no entendio que esta pasando. */
  let p=null;
  while(G.mazo.length){ const c=G.mazo.pop(); if(c.valor<=9){ p=c; break; } G.mazo.unshift(c); }
  G.pila=[p]; G.color=p.color; G.valor=p.valor;
  G.turno=J_VOS; G.giro=1; G.gana=-1; G.robo=false; G.sel=-1; G.colorPide=false;
  G.mov.length=0; G.uno=[false,false,false]; G.botT=0; botReset();
  ordenarMano(J_VOS);
}
/* LA MANO SE ORDENA POR COLOR Y DESPUES POR VALOR. No es cosmetica: el juego entero es buscar una
   carta del color de la pila, y en un abanico desordenado eso es leer nueve cartas de a una. */
function ordenarMano(j){ G.manos[j].sort((a,b)=> (a.color-b.color) || (a.valor-b.valor)); }

function puedeJugar(j){ return G.manos[j].some(c=>pega(c,G.color,G.valor)); }
function siguiente(desde){ return (desde + G.giro + N_JUG*2) % N_JUG; }

/* aplica el efecto de la carta y devuelve a quien le toca despues */
function efecto(c, quien){
  let sig=siguiente(quien);
  if(c.valor===SALTA){ sig=siguiente(sig); son('salta'); }
  else if(c.valor===GIRA){
    G.giro=-G.giro;
    /* con dos en la mesa, invertir el sentido devuelve al mismo que jugo: la regla del UNO de dos es
       que girar SALTA. Sin esto, la carta seria un pase de turno normal disfrazado. */
    sig = (N_JUG===2)? quien : siguiente(quien);
    son('gira');
  }
  else if(c.valor===MAS2){
    for(let k=0;k<2;k++){ const d=robarDelMazo(); if(d) G.manos[sig].push(d); }
    if(sig===J_VOS) ordenarMano(J_VOS);
    sig=siguiente(sig); son('mas');
  } else if(c.valor===MAS4){
    for(let k=0;k<4;k++){ const d=robarDelMazo(); if(d) G.manos[sig].push(d); }
    if(sig===J_VOS) ordenarMano(J_VOS);
    sig=siguiente(sig); son('mas');
  }
  return sig;
}

function jugarCarta(j, idx, colorElegido){
  const c=G.manos[j][idx];
  if(!c) return false;
  G.manos[j].splice(idx,1);
  G.pila.push(c);
  G.color = (c.color===4)? (colorElegido==null? 0 : colorElegido) : c.color;
  G.valor = c.valor;
  son('tira');
  if(G.manos[j].length===1){ G.uno[j]=true; son('uno'); }
  if(!G.manos[j].length){ G.gana=j; G.fase='fin'; son(j===J_VOS?'gana':'pierde'); return true; }
  G.turno=efecto(c, j);
  G.robo=false;
  return true;
}

/* ===================== LOS DOS RIVALES =====================
   No es una inteligencia y no tiene que serlo: es un jugador de mesa razonable. Prefiere sacarse de
   encima las cartas de accion —que es lo que hace cualquiera— y guarda los comodines para cuando no
   le queda nada del color, que es el unico momento en que valen. Sin esa segunda regla tiraria el +4
   en el primer turno y despues se quedaria trabado con seis cartas de un color que no sale mas. */
function botElegir(j){
  const m=G.manos[j];
  const vale=[];
  for(let i=0;i<m.length;i++) if(pega(m[i],G.color,G.valor)) vale.push(i);
  if(!vale.length) return -1;
  const sinCom=vale.filter(i=>m[i].color!==4);
  const lista=sinCom.length? sinCom : vale;
  let mejor=lista[0], punt=-1;
  for(const i of lista){
    const c=m[i];
    let p=0;
    if(c.valor===MAS2) p=6; else if(c.valor===SALTA) p=5; else if(c.valor===GIRA) p=4;
    else if(c.valor===MAS4) p=3; else if(c.valor===COMODIN) p=2; else p=1;
    /* con dos cartas iguales de utilidad, la del color del que MAS tiene: asi se queda con una mano
       de un solo color, que es lo que hace que despues pueda encadenar */
    if(c.color<4) p += 0.1*m.filter(q=>q.color===c.color).length;
    if(p>punt){ punt=p; mejor=i; }
  }
  return mejor;
}
function botColor(j){
  const c=[0,0,0,0];
  for(const q of G.manos[j]) if(q.color<4) c[q.color]++;
  let k=0; for(let i=1;i<4;i++) if(c[i]>c[k]) k=i;
  return k;
}
/* ===================== EL TURNO DE UN RIVAL, EN TRES TIEMPOS =====================
   Pedido: *"ver como con sus manos seleccionan las cartas"*. Antes esto era UNA linea: elegir el
   indice y llamar a jugarCarta(). O sea que la carta se TELETRANSPORTABA de su abanico a la pila en
   el mismo cuadro. Se veia que algo habia pasado, no quien lo habia hecho.

   Ahora el turno pasa por tres fases y la mano del rival las sigue: mientras PIENSA mira su abanico;
   al AGARRAR la mano viaja hasta la carta elegida y se cierra; al LLEVAR la carta va colgada de la
   pinza hasta la pila. La carta se baja de verdad —jugarCarta— recien al final de la tercera.

   Y LA ELECCION SE HACE AL EMPEZAR A AGARRAR, NO AL BAJAR. Si se eligiera al final, la mano habria
   estado viajando hacia una carta que todavia no estaba decidida: iria a cualquier lado y despues se
   bajaria otra. El indice se fija cuando la mano arranca, y es el mismo que se juega. */
const BOT_PIENSA=0.45, BOT_AGARRA=0.34, BOT_LLEVA=0.42;
function botReset(){ G.bot.j=-1; G.bot.fase=''; G.bot.t=0; G.bot.idx=-1; }
function botTick(dt){
  const B=G.bot;
  if(B.j!==G.turno){ B.j=G.turno; B.fase='piensa'; B.t=0; B.idx=-1; }
  B.t+=dt;
  const j=B.j;
  if(B.fase==='piensa'){
    if(B.t<BOT_PIENSA) return;
    let i=botElegir(j);
    if(i<0){
      const d=robarDelMazo();
      if(d){ G.manos[j].push(d); son('roba'); }
      i=botElegir(j);
      /* NO PUEDE JUGAR: pasa, y la mano nunca sale de su reposo. Esto tiene que quedar aca y no
         dentro de la fase de agarrar, o el rival estiraria la mano hacia una carta que no existe. */
      if(i<0){ G.turno=siguiente(j); G.robo=false; botReset(); return; }
    }
    B.idx=i; B.fase='agarra'; B.t=0;
    return;
  }
  if(B.fase==='agarra'){
    if(B.t<BOT_AGARRA) return;
    B.fase='lleva'; B.t=0; son('agarra');
    return;
  }
  if(B.fase==='lleva'){
    if(B.t<BOT_LLEVA) return;
    /* el indice puede haber quedado fuera de rango si algo cambio la mano en el medio; no puede
       pasar hoy, pero un indice viejo aplicado a una mano nueva baja OTRA carta y eso no se ve */
    const i=Math.min(B.idx, G.manos[j].length-1);
    if(i<0){ botReset(); return; }
    const c=G.manos[j][i];
    botReset();
    jugarCarta(j, i, c.color===4? botColor(j) : null);
  }
}

/* ===================== EL TURNO DEL JUGADOR =====================
   Dos pellizcos: uno agarra la carta y otro elige. Y el de TIRAR no hace nada si la carta no pega —
   pero el boton ya se veia apagado antes de intentarlo, asi que no hay forma de que el jugador
   descubra la regla equivocandose a ciegas. */
function seleccionar(i){
  if(G.fase!=='juego' || G.turno!==J_VOS || G.colorPide) return false;
  if(i<0 || i>=G.manos[J_VOS].length) return false;
  G.sel=i; son('agarra'); return true;
}
function soltar(){ if(G.sel<0) return false; G.sel=-1; son('deja'); return true; }
function tirarSel(){
  if(G.sel<0) return false;
  const c=G.manos[J_VOS][G.sel];
  if(!pega(c,G.color,G.valor)){ son('mal'); return false; }
  if(c.color===4){ G.colorPide=true; return true; }   // primero el color, despues baja
  jugarCarta(J_VOS, G.sel, null); G.sel=-1;
  /* SE AVISA DESPUES DE JUGARLA Y NO ANTES. Publicando primero, una jugada que aca resulta invalida
     ya viajo: el rival veria en su mesa algo que en esta no paso. */
  mpTiro(c, null);
  return true;
}
function elegirColor(k){
  if(!G.colorPide || G.sel<0) return false;
  const c=G.manos[J_VOS][G.sel];
  son('color');
  jugarCarta(J_VOS, G.sel, k);
  G.sel=-1; G.colorPide=false;
  if(c) mpTiro(c, k);
  return true;
}
function robarJugador(){
  if(G.fase!=='juego' || G.turno!==J_VOS || G.sel>=0 || G.colorPide) return false;
  if(G.robo) return false;                       // una sola por turno
  const d=robarDelMazo(); if(!d) return false;
  G.manos[J_VOS].push(d); ordenarMano(J_VOS);
  son('roba'); G.robo=true;
  avisar(TX('robaste'));
  /* SI LA QUE ROBASTE TAMPOCO PEGA, EL TURNO PASA SOLO. Dejarlo trabado con un boton de "pasar" que
     no hace nada mas es un boton de mas para aprender. */
  const pasa=!puedeJugar(J_VOS);
  if(pasa){ G.turno=siguiente(J_VOS); G.robo=false; }
  /* el rival tiene que sacar LA MISMA carta del mismo mazo, asi que el mensaje no lleva la carta:
     lleva el hecho de haber robado. Los dos mazos son el mismo porque salen de la misma semilla y las
     jugadas llegan en el mismo orden. */
  mpRobo(pasa);
  return true;
}
function avisar(t){ G.aviso=t; G.avisoT=1.6; }

/* el reloj de la partida: los rivales piensan medio segundo, que es lo que tarda alguien en mirar su
   mano — sin esa pausa las tres jugadas pasan en el mismo cuadro y no se ve nada */
function partidaTick(dt){
  G.t+=dt;
  if(G.avisoT>0) G.avisoT-=dt;
  movTick(dt);
  if(G.fase!=='juego'){ botReset(); return; }
  if(G.turno===J_VOS){ botReset(); return; }
  if(movHay()) return;
  /* EN MULTIJUGADOR NO HAY BOT QUE PIENSE: el turno del otro lo mueve el otro. Sin esta linea, el
     bot local jugaria por el rival y las dos partidas se separarian en la primera jugada. */
  if(MP.jugando){ botReset(); return; }
  botTick(dt);
}
