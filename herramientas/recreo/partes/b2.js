
/* =========================================================================================
   RECREO — la clase de Baldi, jugada con los dedos.

   RECREACION DE FAN, NO COMERCIAL Y SIN PUBLICAR del personaje y del colegio de Baldi's Basics
   (Basically Games / mystman12). El modelo 3D esta GENERADO con Higgsfield a partir de la referencia
   que mando el usuario y riggeado automaticamente; las animaciones —saludar, caminar, abrir la
   puerta, explicar— estan escritas a mano sobre ese esqueleto. La escuela sale de un mapa escrito a
   mano. No hay un solo archivo del original.

   LAS TRES DECISIONES QUE MANDAN SOBRE TODO LO DEMAS:
   1. NO SE MUEVE LA CAMARA. No hay joystick, no hay mouse, no hay WASD. La camara va sobre rieles y
      gira sola hacia donde va. El jugador tiene UNA cosa que hacer con las manos, y si esa misma
      mano tuviera que manejar la camara, las dos cosas se pelearian: mover la mano para girar y
      mover la mano para contar son el mismo gesto.
   2. VERTICAL. El telefono queda parado, la camara frontal de frente, y la mano entra completa en el
      cuadro. Acostado, la mano tapa media pantalla.
   3. SE CONTESTA CON LOS DEDOS. Cuatro mas cuatro son ocho dedos, o sea las dos manos. Es la unica
      forma de que la cuenta se sienta con el cuerpo y no con un teclado.
   ========================================================================================= */

/* ===================== LOS IDIOMAS ===================== */
const IDIOMAS=[['en','English'],['es','Español'],['pt','Português']];
let IDIOMA='en';
try{ const g=localStorage.getItem('recreo_idioma'); if(g && IDIOMAS.some(i=>i[0]===g)) IDIOMA=g; }catch(e){}
const L={
 sub:{en:'answer with your fingers', es:'contestá con los dedos', pt:'responda com os dedos'},
 jugar:{en:'PLAY', es:'JUGAR', pt:'JOGAR'},
 como:{en:'HOW TO PLAY', es:'CÓMO SE JUEGA', pt:'COMO JOGAR'},
 idioma:{en:'LANGUAGE', es:'IDIOMA', pt:'IDIOMA'},
 volver:{en:'BACK', es:'VOLVER', pt:'VOLTAR'},
 calidad:{en:'GRAPHICS', es:'GRÁFICOS', pt:'GRÁFICOS'},
 calBaja:{en:'LOW', es:'BAJA', pt:'BAIXA'},
 calMedia:{en:'MEDIUM', es:'MEDIA', pt:'MÉDIA'},
 calAlta:{en:'HIGH', es:'ALTA', pt:'ALTA'},
 control:{en:'ANSWER WITH', es:'CONTESTAR CON', pt:'RESPONDER COM'},
 filtro:{en:'FILTER', es:'FILTRO', pt:'FILTRO'},
 filNo:{en:'OFF', es:'NO', pt:'NÃO'},
 filSuave:{en:'SOFT', es:'SUAVE', pt:'SUAVE'},
 filFuerte:{en:'FULL', es:'FUERTE', pt:'FORTE'},
 ctrlManos:{en:'HANDS', es:'MANOS', pt:'MÃOS'},
 ctrlPad:{en:'NUMBERS', es:'NÚMEROS', pt:'NÚMEROS'},
 quien:{en:'BALDI', es:'BALDI', pt:'BALDI'},
 libros:{en:'{n} / {t}', es:'{n} / {t}', pt:'{n} / {t}'},
 manoCarga:{en:'LOADING…', es:'CARGANDO…', pt:'CARREGANDO…'},
 manoNo:{en:'NO CAMERA · numbers instead', es:'SIN CÁMARA · van los números', pt:'SEM CÂMERA · vão os números'},
 manoLista:{en:'SHOW YOUR HAND', es:'MOSTRÁ LA MANO', pt:'MOSTRE A MÃO'},
 dedos:{en:'{n} FINGERS', es:'{n} DEDOS', pt:'{n} DEDOS'},
 hazPinza:{en:'PINCH', es:'PINZA', pt:'PINÇA'},
 sostene:{en:'HOLD IT', es:'SOSTENELO', pt:'SEGURE'},
 bien:{en:'RIGHT', es:'BIEN', pt:'CERTO'},
 mal:{en:'NO', es:'NO', pt:'NÃO'},
 finT:{en:'CLASS OVER', es:'TERMINÓ LA CLASE', pt:'ACABOU A AULA'},
 finS:{en:'{n} of {t} right', es:'{n} de {t} bien', pt:'{n} de {t} certas'},
 /* ---- LO QUE DICE ----
    Corto, y una idea por globo: se lee mientras el habla, no despues. Un parrafo en un subtitulo de
    tres segundos es un parrafo que nadie leyo. */
 d1:{en:'Hey! Welcome to my schoolhouse.', es:'¡Hola! Bienvenido a mi escuela.', pt:'Oi! Bem-vindo à minha escola.'},
 d2:{en:'Here you answer with your <b>hands</b>. Let me show you.',
     es:'Acá se contesta con las <b>manos</b>. Te muestro.',
     pt:'Aqui se responde com as <b>mãos</b>. Vou te mostrar.'},
 d3:{en:'Open your hand and show me <b>five fingers</b>.',
     es:'Abrí la mano y mostrame <b>cinco dedos</b>.',
     pt:'Abra a mão e me mostre <b>cinco dedos</b>.'},
 d4:{en:'Now touch your thumb and finger: a <b>pinch</b>.',
     es:'Ahora juntá el pulgar y el índice: una <b>pinza</b>.',
     pt:'Agora junte o polegar e o índice: uma <b>pinça</b>.'},
 d5:{en:'And now just <b>two</b>. That is how you count.',
     es:'Y ahora sólo <b>dos</b>. Así se cuenta.',
     pt:'E agora só <b>dois</b>. É assim que se conta.'},
 d6:{en:'You got it. Come with me.', es:'Lo tenés. Vení conmigo.', pt:'Você pegou. Venha comigo.'},
 d7:{en:'This way…', es:'Por acá…', pt:'Por aqui…'},
 d8:{en:'After you.', es:'Pasá.', pt:'Entre.'},
 d9:{en:'Eight books. One sum each. Fingers up when you know.',
     es:'Ocho libros. Una cuenta cada uno. Dedos arriba cuando lo sepas.',
     pt:'Oito livros. Uma conta cada um. Dedos para cima quando souber.'},
 dBien:{en:'That is it!', es:'¡Eso es!', pt:'É isso!'},
 dMal:{en:'No. Look again.', es:'No. Mirá otra vez.', pt:'Não. Olhe de novo.'},
 dFin:{en:'Class over. Nicely done.', es:'Terminó la clase. Muy bien.', pt:'Acabou a aula. Muito bem.'},
 comoT:{en:
  'Baldi asks, you answer with your <b>fingers</b>. Four plus four is eight fingers — both hands.<br><br>'+
  '<b>Hold the number still</b> until the ring fills up. That way you can change your mind before it counts.<br><br>'+
  'You never move the camera: it goes on its own.<br><br>'+
  'No camera, or you would rather not give it? Pick <b>NUMBERS</b> in the menu and tap the answer.',
  es:
  'Baldi pregunta y vos contestás con los <b>dedos</b>. Cuatro más cuatro son ocho dedos: las dos manos.<br><br>'+
  '<b>Mantené el número quieto</b> hasta que el aro se llene. Así podés cambiar de idea antes de que cuente.<br><br>'+
  'La cámara no se maneja: va sola.<br><br>'+
  '¿No tenés cámara, o preferís no darla? Elegí <b>NÚMEROS</b> en el menú y tocá la respuesta.',
  pt:
  'Baldi pergunta e você responde com os <b>dedos</b>. Quatro mais quatro são oito dedos: as duas mãos.<br><br>'+
  '<b>Mantenha o número parado</b> até o anel encher. Assim você pode mudar de ideia antes de contar.<br><br>'+
  'A câmera não se controla: vai sozinha.<br><br>'+
  'Sem câmera, ou prefere não dar? Escolha <b>NÚMEROS</b> no menu e toque na resposta.'}
};
function TX(k,v){ let s=(L[k]&&(L[k][IDIOMA]||L[k].en))||k;
  if(v) for(const p in v) s=s.split('{'+p+'}').join(v[p]);
  return s; }

let plataf='pc';
try{ plataf=(matchMedia('(pointer:coarse)').matches &&
      (('ontouchstart' in window)||navigator.maxTouchPoints>0))? 'movil':'pc'; }catch(e){}

/* ===================== LAS TRES CALIDADES ===================== */
const CAL={ baja:{ px:0.60, lockers:false, niebla:30 },
            media:{ px:0.90, lockers:true,  niebla:40 },
            alta:{ px:2.00, lockers:true,  niebla:52 } };
let calidad='media';
try{ const g=localStorage.getItem('recreo_cal'); if(g && CAL[g]) calidad=g; }catch(e){}
/* ===================== EL MAPA DE LA ESCUELA =====================
   NO ES UN LABERINTO GENERADO, ES UNA ESCUELA ESCRITA A MANO, y la diferencia es todo el punto: un
   laberinto se recorre a ciegas, una escuela se APRENDE — tres pasillos horizontales, tres
   verticales y ocho aulas colgadas de ellos. A la segunda partida el jugador ya sabe que el aula del
   fondo a la izquierda es la que tiene dos puertas, y eso es exactamente lo que hace que huir sea
   una decision y no una tirada.

   Las aulas se declaran como rectangulos y los pasillos se tallan alrededor. Se declara la
   GEOMETRIA, no el resultado: asi la puerta de cada aula se calcula y no se dibuja a mano, y no
   puede quedar una sin salida. */
const CEL=4.2, ALTO_M=3.6, GRUESO=0.30;
const GW=23, GH=19;                      // celdas
const PAS_F=[1,9,17], PAS_C=[1,11,21];   // pasillos: filas y columnas
/* LAS AULAS DEJAN UN ANILLO DE PARED, y esto lo encontro la propia prueba del mapa. La primera
   version las pegaba directo a los pasillos —filas 2..8 contra el pasillo de la fila 1— y entonces
   NO HABIA DONDE PONER LA PUERTA, porque no quedaba ni una celda de pared entre el aula y el
   pasillo. El gancho lo canto en dos numeros: `puertasPorAula:[0,0,0,0,0,0,0,0]` y las ocho aulas
   alcanzables SIN abrir nada. Un aula sin puerta no es un aula, es un ensanchamiento del pasillo, y
   eso no se ve en una foto del pasillo.
   Con los pasillos en las filas 1, 9 y 17 y en las columnas 1, 11 y 21, el interior de cada aula va
   de la fila 3 a la 7 (o de la 11 a la 15) y mide tres columnas: las filas 2, 8, 10 y 16 y las
   columnas 2, 6, 10, 12, 16 y 20 quedan de pared, que es donde se abren las puertas. */
const AULAS=[
  {i0:3, i1:5,  j0:3,  j1:7,  n:1}, {i0:7, i1:9,  j0:3,  j1:7,  n:2},
  {i0:13,i1:15, j0:3,  j1:7,  n:3}, {i0:17,i1:19, j0:3,  j1:7,  n:4},
  {i0:3, i1:5,  j0:11, j1:15, n:5}, {i0:7, i1:9,  j0:11, j1:15, n:6},
  {i0:13,i1:15, j0:11, j1:15, n:7}, {i0:17,i1:19, j0:11, j1:15, n:8}
];
const LIBRETAS_N=AULAS.length;
/* 0 = pared, 1 = pasillo, 2 = aula, 3 = puerta */
const MAPA=[];
for(let j=0;j<GH;j++){ MAPA.push([]); for(let i=0;i<GW;i++) MAPA[j].push(0); }
for(const f of PAS_F) for(let i=1;i<=21;i++) MAPA[f][i]=1;
for(const c of PAS_C) for(let j=1;j<=17;j++) MAPA[j][c]=1;
for(const a of AULAS) for(let j=a.j0;j<=a.j1;j++) for(let i=a.i0;i<=a.i1;i++) MAPA[j][i]=2;
/* LA PUERTA DE CADA AULA SE CALCULA: la celda del borde del aula que toca un pasillo. Dibujarlas a
   mano en un mapa de 23x19 es la forma mas rapida de que una quede tapiada y el nivel sea
   imposible sin que nadie se entere hasta jugarlo. */
const PUERTAS=[];
for(const a of AULAS){
  const im=Math.round((a.i0+a.i1)/2), jm=Math.round((a.j0+a.j1)/2);
  const cand=[[im,a.j0-1],[im,a.j1+1],[a.i0-1,jm],[a.i1+1,jm]];
  let puesta=0;
  for(const [i,j] of cand){
    if(i<0||j<0||i>=GW||j>=GH) continue;
    const vecinos=[[i,j-1],[i,j+1],[i-1,j],[i+1,j]];
    const tocaPas=vecinos.some(([x,y])=>x>=0&&y>=0&&x<GW&&y<GH&&MAPA[y][x]===1);
    const tocaAula=vecinos.some(([x,y])=>x>=0&&y>=0&&x<GW&&y<GH&&MAPA[y][x]===2);
    if(MAPA[j][i]===0 && tocaPas && tocaAula){
      MAPA[j][i]=3;
      PUERTAS.push({ i, j, aula:a.n, abierta:false, ang:0 });
      if(++puesta>=(a.n%3===0?2:1)) break;   // un tercio de las aulas tiene dos puertas
    }
  }
  a.puertas=puesta;
}
/* las dos salidas, al este y al oeste del pasillo del medio */
const SALIDAS=[{i:0,j:9},{i:22,j:9}];
for(const s of SALIDAS) MAPA[s.j][s.i]=3;
for(const s of SALIDAS) PUERTAS.push({ i:s.i, j:s.j, aula:0, abierta:false, ang:0, salida:true });

function XC(i){ return (i-(GW-1)/2)*CEL; }
function ZC(j){ return (j-(GH-1)/2)*CEL; }
function celda(x,z){ return [Math.round(x/CEL+(GW-1)/2), Math.round(z/CEL+(GH-1)/2)]; }
function pisable(i,j){
  if(i<0||j<0||i>=GW||j>=GH) return false;
  const c=MAPA[j][i];
  if(c===1||c===2) return true;
  if(c===3){ const p=PUERTAS.find(q=>q.i===i&&q.j===j); return !!(p&&p.abierta); }
  return false;
}
/* EL PROFESOR ABRE LAS PUERTAS, ASI QUE PARA EL TODAS ESTAN ABIERTAS.
   Con una sola funcion de "se pisa" para los dos pasaba esto, y lo encontro la prueba: el profesor
   arranca DENTRO del aula 8 con la puerta cerrada, o sea que el BFS desde el jugador no llegaba
   hasta el, `rumbo` devolvia null, y el pobre caminaba en linea recta contra la pared de su propia
   aula. La distancia al jugador bajaba 6,9 m en tres segundos y despues 2,2 m en cuatro: estaba
   raspando una pared. Un perseguidor encerrado no es una amenaza, es un adorno. */
function pisableProf(i,j){
  if(i<0||j<0||i>=GW||j>=GH) return false;
  const c=MAPA[j][i];
  return c===1||c===2||c===3;
}
