/* =========================================================================================
   REZUNO — un UNO que se juega con las manos

   Pedido textual: *"tiene que ser asi con handtracking pero es un UNO de handtracking simple, la
   idea es que el menu sea muy minimalista y el juego se llame RezUno, te pide idioma primero y
   despues se abre un menu todo god minimalista con el nombre y donde en el menu debes tocar play
   tutorial si o si al inicio dependiendo del idioma y te da un tutorial super bien explicado de como
   jugar, para elegir las cartas que vas a tirar debes hacer pinch y te da dos opciones, una es tirar
   y otra es dejar, si el color no es el mismo directamente la de tirar aparece medio apagada, todo
   se maneja mediante pinchs, haz una beta"*.

   ES UN JUEGO DE FAMILIA HECHO DE CERO Y NO USA NADA DE LA MARCA. Las reglas de un juego de cartas no
   se pueden registrar; el nombre, el logo y el arte si. Por eso se llama RezUno, no dice la palabra
   de la marca en ningun lado, y las cartas estan dibujadas por codigo con una tipografia propia.
   ========================================================================================= */

/* ===================== LOS IDIOMAS =====================
   Ni un texto suelto en el codigo: todo sale de esta tabla. Arranca en ingles y se guarda, igual que
   los otros cuatro juegos del repo. La funcion se llama TX y no t: una funcion global de una letra
   la pisa cualquier cosa que comparta la pagina, y cuando se pisa no falla el idioma — falla TODO,
   porque no queda un solo texto que no pase por ahi. Ya paso una vez en este repositorio. */
const IDIOMAS=[['en','English'],['es','Español'],['pt','Português']];
let IDIOMA='en';
try{ const g=localStorage.getItem('rezuno_idioma'); if(g) IDIOMA=g; }catch(e){}

const LANG={
 en:{
  jugar:'PLAY', tutorial:'TUTORIAL', idioma:'LANGUAGE', otra:'PLAY AGAIN', menu:'MENU',
  menuPie:'Play with your hand. <b>Pinch</b> to pick a card, pinch again to choose.',
  menuBloq:'Do the <b>tutorial</b> first — it takes a minute.',
  camPide:'asking for the camera…', camOk:'CAMERA READY · pinch to play',
  camNo:'no camera · you can tap instead',
  camErrPermiso:'camera denied · tap the cards instead',
  camErrCamara:'no camera found · tap the cards instead',
  camErrCdn:'could not download the hand model · tap the cards instead',
  camErrInsegura:'needs https · tap the cards instead',
  tuTurno:'YOUR TURN', turnoDe:'{n} IS PLAYING', robaste:'YOU DREW',
  tirar:'PLAY', dejar:'KEEP', robar:'DRAW', color:'PICK A COLOUR',
  noVale:'DOESN’T MATCH', bot1:'LEFT', bot2:'RIGHT',
  ganaste:'YOU WIN', perdiste:'{n} WON',
  ganasteS:'You got rid of every card.', perdisteS:'They emptied their hand first.',
  cartas:'{n} cards', unaCarta:'1 card', uno:'UNO!',
  /* el tutorial: cada paso espera a que lo hagas */
  t0n:'STEP 1 OF 6', t0:'Hold your <b>open hand</b> up in front of the camera. You will see a ring follow it.',
  t1n:'STEP 2 OF 6', t1:'Now touch your <b>thumb and index finger</b> together. That is a <b>pinch</b>, and it is the only thing you do in this game.',
  t2n:'STEP 3 OF 6', t2:'These are your cards. Move the ring over the <b>glowing one</b> and pinch it.',
  t3n:'STEP 4 OF 6', t3:'Two options came up. <b>PLAY</b> puts the card down, <b>KEEP</b> puts it back. Pinch <b>PLAY</b>.',
  t4n:'STEP 5 OF 6', t4:'A card only goes down if it matches the pile in <b>colour</b> or in <b>number</b>. This one matches neither, so PLAY is <b>dimmed</b>. Pinch <b>KEEP</b>.',
  t5n:'STEP 6 OF 6', t5:'When nothing of yours fits, take one from the pile. Pinch the <b>deck</b> on the left.',
  t6n:'READY', t6:'That is the whole game. Empty your hand before the other two do.',
  ayudaTirar:'pinch PLAY or KEEP', ayudaColor:'pinch a colour', ayudaMano:'pinch a card, or the deck'
 },
 es:{
  jugar:'JUGAR', tutorial:'TUTORIAL', idioma:'IDIOMA', otra:'OTRA VEZ', menu:'MENÚ',
  menuPie:'Se juega con la mano. <b>Pellizcá</b> para agarrar una carta y pellizcá otra vez para elegir.',
  menuBloq:'Primero hacé el <b>tutorial</b> — es un minuto.',
  camPide:'pidiendo la cámara…', camOk:'CÁMARA LISTA · pellizcá para jugar',
  camNo:'sin cámara · podés tocar la pantalla',
  camErrPermiso:'cámara denegada · tocá las cartas',
  camErrCamara:'no hay cámara · tocá las cartas',
  camErrCdn:'no se pudo bajar el modelo de manos · tocá las cartas',
  camErrInsegura:'hace falta https · tocá las cartas',
  tuTurno:'TU TURNO', turnoDe:'JUEGA {n}', robaste:'ROBASTE',
  tirar:'TIRAR', dejar:'DEJAR', robar:'ROBAR', color:'ELEGÍ COLOR',
  noVale:'NO PEGA', bot1:'IZQUIERDA', bot2:'DERECHA',
  ganaste:'GANASTE', perdiste:'GANÓ {n}',
  ganasteS:'Te quedaste sin cartas.', perdisteS:'Se quedó sin cartas antes que vos.',
  cartas:'{n} cartas', unaCarta:'1 carta', uno:'¡UNO!',
  t0n:'PASO 1 DE 6', t0:'Levantá la <b>mano abierta</b> delante de la cámara. Vas a ver un aro que la sigue.',
  t1n:'PASO 2 DE 6', t1:'Ahora juntá el <b>pulgar y el índice</b>. Eso es un <b>pellizco</b>, y es lo único que se hace en todo el juego.',
  t2n:'PASO 3 DE 6', t2:'Estas son tus cartas. Llevá el aro encima de la que <b>brilla</b> y pellizcala.',
  t3n:'PASO 4 DE 6', t3:'Aparecieron dos opciones. <b>TIRAR</b> la baja a la mesa, <b>DEJAR</b> la devuelve. Pellizcá <b>TIRAR</b>.',
  t4n:'PASO 5 DE 6', t4:'Una carta solo baja si coincide con la pila en el <b>color</b> o en el <b>número</b>. Esta no coincide en nada, así que TIRAR está <b>apagado</b>. Pellizcá <b>DEJAR</b>.',
  t5n:'PASO 6 DE 6', t5:'Cuando no te sirve ninguna, agarrás una del mazo. Pellizcá el <b>mazo</b> de la izquierda.',
  t6n:'LISTO', t6:'Eso es todo el juego. Quedate sin cartas antes que los otros dos.',
  ayudaTirar:'pellizcá TIRAR o DEJAR', ayudaColor:'pellizcá un color', ayudaMano:'pellizcá una carta, o el mazo'
 },
 pt:{
  jugar:'JOGAR', tutorial:'TUTORIAL', idioma:'IDIOMA', otra:'DE NOVO', menu:'MENU',
  menuPie:'Joga-se com a mão. <b>Belisque</b> para pegar uma carta e belisque de novo para escolher.',
  menuBloq:'Faça o <b>tutorial</b> primeiro — leva um minuto.',
  camPide:'pedindo a câmera…', camOk:'CÂMERA PRONTA · belisque para jogar',
  camNo:'sem câmera · você pode tocar na tela',
  camErrPermiso:'câmera negada · toque nas cartas',
  camErrCamara:'não há câmera · toque nas cartas',
  camErrCdn:'não deu para baixar o modelo de mãos · toque nas cartas',
  camErrInsegura:'precisa de https · toque nas cartas',
  tuTurno:'SUA VEZ', turnoDe:'JOGA {n}', robaste:'VOCÊ COMPROU',
  tirar:'JOGAR', dejar:'DEIXAR', robar:'COMPRAR', color:'ESCOLHA A COR',
  noVale:'NÃO SERVE', bot1:'ESQUERDA', bot2:'DIREITA',
  ganaste:'VOCÊ GANHOU', perdiste:'{n} GANHOU',
  ganasteS:'Você ficou sem cartas.', perdisteS:'Ficou sem cartas antes de você.',
  cartas:'{n} cartas', unaCarta:'1 carta', uno:'UNO!',
  t0n:'PASSO 1 DE 6', t0:'Levante a <b>mão aberta</b> na frente da câmera. Você verá um anel seguindo ela.',
  t1n:'PASSO 2 DE 6', t1:'Agora junte o <b>polegar e o indicador</b>. Isso é um <b>beliscão</b>, e é a única coisa que se faz no jogo.',
  t2n:'PASSO 3 DE 6', t2:'Estas são suas cartas. Leve o anel sobre a que <b>brilha</b> e belisque.',
  t3n:'PASSO 4 DE 6', t3:'Apareceram duas opções. <b>JOGAR</b> baixa a carta, <b>DEIXAR</b> devolve. Belisque <b>JOGAR</b>.',
  t4n:'PASSO 5 DE 6', t4:'Uma carta só desce se combinar com a pilha na <b>cor</b> ou no <b>número</b>. Esta não combina em nada, então JOGAR está <b>apagado</b>. Belisque <b>DEIXAR</b>.',
  t5n:'PASSO 6 DE 6', t5:'Quando nenhuma serve, você compra do monte. Belisque o <b>monte</b> da esquerda.',
  t6n:'PRONTO', t6:'É todo o jogo. Fique sem cartas antes dos outros dois.',
  ayudaTirar:'belisque JOGAR ou DEIXAR', ayudaColor:'belisque uma cor', ayudaMano:'belisque uma carta, ou o monte'
 }
};
function TX(k, p){
  let s=(LANG[IDIOMA] && LANG[IDIOMA][k]) || (LANG.en[k]!=null? LANG.en[k] : k);
  if(p) for(const q in p) s=s.split('{'+q+'}').join(p[q]);
  return s;
}

/* ===================== EL MAZO =====================
   108 cartas, el reparto clasico: por cada uno de los cuatro colores un 0, dos de cada 1..9 y dos de
   cada carta de accion (salta, gira, +2); mas cuatro comodines y cuatro comodines de +4.
   EL COLOR 4 ES "SIN COLOR". Guardar los comodines con un color inventado obligaria a preguntar por
   el valor en todos lados; con un color propio, "es comodin" es `c.color===4` y punto. */
const COLORES=['#e0483c','#f0b429','#3fa356','#3f7fd0'];   // rojo, amarillo, verde, azul
const COL_OSC=['#a32c23','#b07c12','#2b7038','#2b5896'];
const NOMBRE_COL=['R','Y','G','B'];
const SALTA=10, GIRA=11, MAS2=12, COMODIN=13, MAS4=14;
function mazoNuevo(){
  const m=[];
  for(let c=0;c<4;c++){
    m.push({color:c, valor:0});
    for(let v=1;v<=9;v++){ m.push({color:c,valor:v}); m.push({color:c,valor:v}); }
    for(const a of [SALTA,GIRA,MAS2]){ m.push({color:c,valor:a}); m.push({color:c,valor:a}); }
  }
  for(let k=0;k<4;k++){ m.push({color:4,valor:COMODIN}); m.push({color:4,valor:MAS4}); }
  return m;
}
/* LA MEZCLA ES FISHER-YATES Y CON SEMILLA PROPIA. Con Math.random no se puede reproducir una partida,
   y una partida que no se puede reproducir no se puede depurar: cuando el jugador diga "me paso algo
   raro" no hay forma de volver a ese reparto. La semilla se guarda con la partida. */
let SEM=1;
function azar(){ SEM=(SEM*1664525+1013904223)&0x7fffffff; return SEM/0x7fffffff; }
function mezclar(m){
  for(let i=m.length-1;i>0;i--){ const j=Math.floor(azar()*(i+1)); const t=m[i]; m[i]=m[j]; m[j]=t; }
  return m;
}
/* LA REGLA, EN UNA SOLA FUNCION. La usan el jugador, los dos rivales, el boton apagado y el tutorial:
   si fueran dos cuentas distintas, el boton diria una cosa y el juego haria otra — que es el defecto
   mas dificil de encontrar que puede tener un juego de cartas. */
function pega(carta, colorMesa, valorMesa){
  if(!carta) return false;
  if(carta.color===4) return true;                 // los comodines siempre
  if(carta.color===colorMesa) return true;
  return carta.valor===valorMesa;
}
