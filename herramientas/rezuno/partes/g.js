/* =========================================================================================
   EL TUTORIAL

   Se pidio obligatorio ("debes tocar play tutorial si o si al inicio") y "super bien explicado". Las
   dos cosas se resuelven igual: CADA PASO ESPERA A QUE HAGAS LA COSA. No se puede saltear, no se
   puede pasar sin haber entendido, y no hay un boton de "siguiente" que se pueda apretar sin leer.
   Es la misma forma que funciono en ECO, y por el mismo motivo: un tutorial que avanza solo se lee
   como un cartel, y un cartel se saltea.

   Y LOS SEIS PASOS NO SON SEIS PANTALLAS DE TEXTO: son seis cosas distintas que hacer.
     1  levantar la mano       → aprende que la camara lo ve
     2  pellizcar              → aprende el unico gesto del juego
     3  pellizcar una carta    → aprende a elegir
     4  pellizcar TIRAR        → aprende que hace la primera opcion
     5  una carta que NO pega  → aprende la regla, VIENDO el boton apagado
     6  pellizcar el mazo      → aprende que hacer cuando no le sirve ninguna
   El paso 5 es el que importa y es el unico que no se puede explicar con palabras: la regla del juego
   se aprende viendo que TIRAR esta apagado con esa carta y encendido con la otra.
   ========================================================================================= */
const TUT={ on:false, paso:0, t:0, hecho:false };
try{ TUT.hecho = localStorage.getItem('rezuno_tut')==='1'; }catch(e){}

const guiaEl=document.getElementById('guia'),
      guiaN=document.getElementById('guiaN'), guiaT=document.getElementById('guiaT');
function guia(n, t){
  guiaN.textContent=n||''; guiaT.innerHTML=t||'';
  document.body.classList.toggle('guia', !!t);
}

/* LA MANO DEL TUTORIAL ESTA ARMADA A MANO, carta por carta, y no repartida al azar: el paso 5 NECESITA
   una carta que no pegue con nada, y con un reparto aleatorio ese paso a veces no existe. Un tutorial
   que a veces no puede enseñar lo que tiene que enseñar no es un tutorial. */
function tutorialEmpezar(){
  repartir(7);
  G.fase='juego'; G.turno=J_VOS;
  /* pila: un 5 rojo. mano: un 5 azul (pega por numero), un 9 verde (no pega en nada) y relleno */
  G.pila=[{color:0,valor:5}]; G.color=0; G.valor=5;
  G.manos[J_VOS]=[{color:3,valor:5},{color:2,valor:9},{color:1,valor:2},{color:3,valor:7}];
  G.manos[J_IZQ]=G.mazo.splice(0,5);
  G.manos[J_DER]=G.mazo.splice(0,5);
  G.sel=-1; G.colorPide=false; G.robo=false; G.mov.length=0;
  TUT.on=true; TUT.paso=0; TUT.t=0;
  tutPintar();
}
function tutPintar(){
  const k=TUT.paso;
  if(k>6){ guia('',''); return; }
  guia(TX('t'+k+'n'), TX('t'+k));
}
/* CUAL CARTA BRILLA EN CADA PASO. Devuelve el indice de la mano que el tutorial quiere que agarres, o
   -1. El brillo lo dibuja pintarTut() y el paso lo comprueba tutTick(): los dos leen de aca, asi que
   no puede brillar una y esperarse otra. */
function tutObjetivo(){
  if(!TUT.on) return -1;
  if(TUT.paso===2 || TUT.paso===3) return 0;      // el 5 azul, que pega por numero
  if(TUT.paso===4) return 1;                      // el 9 verde, que no pega en nada
  return -1;
}
function tutTick(dt){
  if(!TUT.on) return;
  TUT.t+=dt;
  const k=TUT.paso;
  if(k===0){ if(MANO.hay || !MANO.on) pasoSig(); }
  else if(k===1){ if(MANO.pinza || !MANO.on) pasoSig(); }
  else if(k===2){ if(G.sel===0) pasoSig(); }
  else if(k===3){ if(G.sel<0 && G.pila.length>1) pasoSig(); }      // la tiro de verdad
  else if(k===4){ if(G.sel<0 && TUT.t>0.2 && !tutEsperaDeja) pasoSig(); }
  else if(k===5){ if(G.robo) pasoSig(); }
  else if(k===6){ if(TUT.t>2.6) tutorialFin(); }
}
let tutEsperaDeja=false;
function pasoSig(){
  TUT.paso++; TUT.t=0;
  /* el paso 4 arranca poniendole la carta que no pega en la mano, por si la tiro en el 3 */
  if(TUT.paso===4){
    tutEsperaDeja=true;
    if(!G.manos[J_VOS].some(c=>!pega(c,G.color,G.valor)))
      G.manos[J_VOS].unshift({color:(G.color+2)%4, valor:9});
  }
  if(TUT.paso===5){
    tutEsperaDeja=false;
    /* para el paso del mazo hace falta que NINGUNA carta pegue: si le queda una jugable, "pellizca el
       mazo" es una instruccion que contradice al propio juego */
    G.manos[J_VOS]=G.manos[J_VOS].filter(c=>!pega(c,G.color,G.valor));
    if(!G.manos[J_VOS].length) G.manos[J_VOS].push({color:(G.color+2)%4, valor:9});
    G.robo=false;
  }
  tutPintar();
}
function tutorialFin(){
  TUT.on=false; TUT.hecho=true;
  try{ localStorage.setItem('rezuno_tut','1'); }catch(e){}
  guia('','');
  G.fase='menu';
  verPantalla('menu'); pintarMenu();
}
/* EL SEGUIMIENTO DEL PASO 4 ES UNA BANDERA Y NO UN CONTADOR DE TIEMPO. Al pellizcar DEJAR, soltar()
   pone G.sel en -1, que es lo mismo que pasa al TIRAR: sin la bandera los dos casos se ven iguales y
   el paso avanzaria tirando la carta que se supone que no se puede tirar. */
function tutDejo(){ if(TUT.on && TUT.paso===4) tutEsperaDeja=false; }

/* el brillo de la carta que hay que agarrar, y la flecha al mazo en el paso del robo */
function pintarTut(g){
  if(!TUT.on) return;
  const obj=tutObjetivo();
  if(obj>=0 && G.sel<0){
    const n=G.manos[J_VOS].length, geo=manoGeo(n);
    if(obj<n){
      const x=geo.x0+obj*geo.paso, y=MANO_Y-(pega(G.manos[J_VOS][obj],G.color,G.valor)?14:0);
      const p=0.5+0.5*Math.sin(G.t*5.2);
      g.save();
      rr(g, x-7, y-7, CW+14, CH+14, 15);
      g.strokeStyle='#ffd84a'; g.lineWidth=3+2*p; g.globalAlpha=0.55+0.45*p; g.stroke();
      g.restore();
    }
  }
  if(TUT.paso===5){
    const p=0.5+0.5*Math.sin(G.t*5.2);
    g.save();
    rr(g, MAZO_X-11, MAZO_Y-11, CW+22, CH+22, 17);
    g.strokeStyle='#ffd84a'; g.lineWidth=3+2*p; g.globalAlpha=0.55+0.45*p; g.stroke();
    g.restore();
  }
}
