
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
   2. VERTICAL. El telefono queda parado y la mano entra completa en el cuadro; acostado, la mano
      tapa media pantalla. La camara que se usa es la TRASERA: el telefono queda apoyado y las manos
      se mueven del otro lado, con mas espacio y mejor luz que apuntandose a uno mismo.
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
 aulaHud:{en:'ROOM {a}/{t} · {n}/3', es:'AULA {a}/{t} · {n}/3', pt:'SALA {a}/{t} · {n}/3'},
 bichosHud:{en:'{n} LEFT', es:'QUEDAN {n}', pt:'FALTAM {n}'},
 tocaBicho:{en:'TAP THEM', es:'TOCALOS', pt:'TOQUE NELES'},
 pinchaBicho:{en:'PINCH THEM', es:'HACÉLES PINZA', pt:'FAÇA PINÇA NELES'},
 manoCarga:{en:'LOADING…', es:'CARGANDO…', pt:'CARREGANDO…'},
 manoNo:{en:'NO CAMERA · numbers instead', es:'SIN CÁMARA · van los números', pt:'SEM CÂMERA · vão os números'},
 manoLista:{en:'SHOW YOUR HAND', es:'MOSTRÁ LA MANO', pt:'MOSTRE A MÃO'},
 manoDos:{en:'2 HANDS · {n}', es:'2 MANOS · {n}', pt:'2 MÃOS · {n}'},
 manoPide:{en:'PRESS PLAY AND ALLOW THE CAMERA',
           es:'TOCÁ JUGAR Y ACEPTÁ LA CÁMARA',
           pt:'TOQUE JOGAR E ACEITE A CÂMERA'},
 manoOk:{en:'CAMERA READY · both hands', es:'CÁMARA LISTA · las dos manos',
         pt:'CÂMERA PRONTA · as duas mãos'},
 manoPad:{en:'ANSWERING WITH NUMBERS', es:'CONTESTANDO CON NÚMEROS',
          pt:'RESPONDENDO COM NÚMEROS'},
 manoErrPermiso:{en:'CAMERA DENIED · tap HANDS to try again',
                 es:'CÁMARA NEGADA · tocá MANOS para reintentar',
                 pt:'CÂMERA NEGADA · toque MÃOS para tentar de novo'},
 manoErrCamara:{en:'NO CAMERA ON THIS DEVICE', es:'ESTE APARATO NO TIENE CÁMARA',
                pt:'ESTE APARELHO NÃO TEM CÂMERA'},
 manoErrCdn:{en:'COULD NOT DOWNLOAD THE HAND DETECTOR', es:'NO SE PUDO BAJAR EL DETECTOR DE MANOS',
             pt:'NÃO FOI POSSÍVEL BAIXAR O DETECTOR'},
 manoErrModelo:{en:'THE DETECTOR WOULD NOT START HERE', es:'EL DETECTOR NO ARRANCÓ EN ESTE APARATO',
                pt:'O DETECTOR NÃO INICIOU NESTE APARELHO'},
 manoErrInsegura:{en:'THE CAMERA NEEDS HTTPS · open the page over https',
                  es:'LA CÁMARA NECESITA HTTPS · abrí la página con https',
                  pt:'A CÂMERA PRECISA DE HTTPS · abra a página com https'},
 dedos:{en:'{n} FINGERS', es:'{n} DEDOS', pt:'{n} DEDOS'},
 hazPinza:{en:'PINCH', es:'PINZA', pt:'PINÇA'},
 sostene:{en:'HOLD IT', es:'SOSTENELO', pt:'SEGURE'},
 bien:{en:'RIGHT', es:'BIEN', pt:'CERTO'},
 mal:{en:'NO', es:'NO', pt:'NÃO'},
 finT:{en:'SCHOOL OVER', es:'TERMINÓ LA ESCUELA', pt:'ACABOU A ESCOLA'},
 muereT:{en:'HE GOT YOU', es:'TE AGARRÓ', pt:'ELE TE PEGOU'},
 muereS:{en:'One wrong sum. Room {a} from the top.',
         es:'Una cuenta mal. El aula {a} desde el principio.',
         pt:'Uma conta errada. A sala {a} desde o começo.'},
 reint:{en:'AGAIN', es:'DE NUEVO', pt:'DE NOVO'},
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
 d9:{en:'One book. <b>Three sums</b>. Fingers up when you know.',
     es:'Un libro. <b>Tres cuentas</b>. Dedos arriba cuando lo sepas.',
     pt:'Um livro. <b>Três contas</b>. Dedos para cima quando souber.'},
 dAula:{en:'Room {a}. One book, three sums.',
        es:'Aula {a}. Un libro, tres cuentas.',
        pt:'Sala {a}. Um livro, três contas.'},
 dSale:{en:'Next room. Come on.', es:'Al otro salón. Vamos.', pt:'Para a outra sala. Vamos.'},
 dSale2:{en:'Good. Almost there.', es:'Bien. Ya casi.', pt:'Bom. Já quase.'},
 dBichos:{en:'Bugs in the hall! <b>Squash them</b>.',
          es:'¡Bichos en el pasillo! <b>Reventalos</b>.',
          pt:'Bichos no corredor! <b>Esmague-os</b>.'},
 dBichosFin:{en:'All of them. Good hands.', es:'Todos. Buenas manos.', pt:'Todos. Boas mãos.'},
 dTizas:{en:'My chalk! <b>Catch it</b> before it hits the floor.',
         es:'¡Mi tiza! <b>Agarrala</b> antes de que toque el piso.',
         pt:'Meu giz! <b>Pegue</b> antes de bater no chão.'},
 dCasill:{en:'Something is moving in a locker. <b>Open that one</b>.',
          es:'Algo se mueve en un casillero. <b>Abrí ese</b>.',
          pt:'Algo se move num armário. <b>Abra esse</b>.'},
 dRompe:{en:'A page tore up. <b>Pinch a piece</b>, drag it, drop it in its hole.',
         es:'Se rompió una hoja. <b>Pellizcá un pedazo</b>, arrastralo y soltalo en su hueco.',
         pt:'Uma folha rasgou. <b>Belisque um pedaço</b>, arraste e solte no buraco dele.'},
 dGlobos:{en:'Balloons from the fair. <b>Pop the green ones only</b>.',
          es:'Globos de la feria. <b>Reventá sólo los verdes</b>.',
          pt:'Balões da feira. <b>Estoure só os verdes</b>.'},
 dTableta:{en:'My tablet! It wants a drawing. <b>Pinch and draw</b> what it asks.',
           es:'¡Mi tableta! Quiere un dibujo. <b>Pellizcá y dibujá</b> lo que pide.',
           pt:'Meu tablet! Quer um desenho. <b>Belisque e desenhe</b> o que ele pedir.'},
 dTableta2:{en:'The tablet again — <b>three drawings</b> this time.',
            es:'La tableta otra vez — <b>tres dibujos</b> esta vez.',
            pt:'O tablet de novo — <b>três desenhos</b> desta vez.'},
 dTabPide:{en:'Draw a <b>{f}</b>.', es:'Dibujá un <b>{f}</b>.', pt:'Desenhe um <b>{f}</b>.'},
 dTabNo:{en:'Not quite. <b>Try again.</b>', es:'No del todo. <b>Probá otra vez.</b>',
         pt:'Não bem. <b>Tente de novo.</b>'},
 f_circulo:{en:'CIRCLE', es:'CÍRCULO', pt:'CÍRCULO'},
 f_raya:{en:'STRAIGHT LINE', es:'RAYA', pt:'RISCO'},
 f_zigzag:{en:'ZIGZAG', es:'ZIGZAG', pt:'ZIGUEZAGUE'},
 dGrito:{en:'W R O N G', es:'M A L', pt:'E R R A D O'},
 dBien:{en:'That is it!', es:'¡Eso es!', pt:'É isso!'},
 dMal:{en:'No. Look again.', es:'No. Mirá otra vez.', pt:'Não. Olhe de novo.'},
 dSalir:{en:'Class is over. <b>Come on, out you go.</b>',
          es:'Terminó la clase. <b>Vamos, para afuera.</b>',
          pt:'Acabou a aula. <b>Vamos, para fora.</b>'},
 dBus:{en:'Your bus is here.', es:'Ahí está tu autobús.', pt:'Ali está seu ônibus.'},
 dChau:{en:'<b>Wave goodbye</b> — show me your hand.',
        es:'<b>Saludalo</b> — mostrame la mano.',
        pt:'<b>Acene</b> — me mostre a mão.'},
 dChau2:{en:'See you tomorrow.', es:'Hasta mañana.', pt:'Até amanhã.'},
 dFin:{en:'Class over. Nicely done.', es:'Terminó la clase. Muy bien.', pt:'Acabou a aula. Muito bem.'},
 comoT:{en:
  'Baldi asks, you answer with your <b>fingers</b>. Four plus four is eight fingers — both hands.<br><br>'+
  '<b>Hold the number still</b> until the ring fills up. That way you can change your mind before it counts.<br><br>'+
  '<b>Get one wrong and he gets you.</b> You go back to the start of that room, not of the school.<br><br>'+
  'Eight rooms, one book and three sums each. In the halls there are <b>bugs</b>: put a <b>pinch</b> right on top of one and it pops.<br><br>'+
  'You never move the camera: it goes on its own.<br><br>'+
  'No camera, or you would rather not give it? Pick <b>NUMBERS</b> in the menu, tap the answer, and tap the bugs.',
  es:
  'Baldi pregunta y vos contestás con los <b>dedos</b>. Cuatro más cuatro son ocho dedos: las dos manos.<br><br>'+
  '<b>Mantené el número quieto</b> hasta que el aro se llene. Así podés cambiar de idea antes de que cuente.<br><br>'+
  '<b>Una cuenta mal y te agarra.</b> Volvés al principio de ese aula, no de la escuela.<br><br>'+
  'Ocho aulas, un libro y tres cuentas en cada una. En los pasillos hay <b>bichos</b>: ponéles una <b>pinza</b> justo encima y revientan.<br><br>'+
  'La cámara no se maneja: va sola.<br><br>'+
  '¿No tenés cámara, o preferís no darla? Elegí <b>NÚMEROS</b> en el menú, tocá la respuesta y tocá los bichos.',
  pt:
  'Baldi pergunta e você responde com os <b>dedos</b>. Quatro mais quatro são oito dedos: as duas mãos.<br><br>'+
  '<b>Mantenha o número parado</b> até o anel encher. Assim você pode mudar de ideia antes de contar.<br><br>'+
  '<b>Erre uma conta e ele te pega.</b> Você volta ao começo daquela sala, não da escola.<br><br>'+
  'Oito salas, um livro e três contas em cada uma. Nos corredores há <b>bichos</b>: ponha uma <b>pinça</b> em cima e eles estouram.<br><br>'+
  'A câmera não se controla: vai sozinha.<br><br>'+
  'Sem câmera, ou prefere não dar? Escolha <b>NÚMEROS</b> no menu, toque na resposta e toque nos bichos.'}
};
function TX(k,v){ let s=(L[k]&&(L[k][IDIOMA]||L[k].en))||k;
  if(v) for(const p in v) s=s.split('{'+p+'}').join(v[p]);
  return s; }

let plataf='pc';
try{ plataf=(matchMedia('(pointer:coarse)').matches &&
      (('ontouchstart' in window)||navigator.maxTouchPoints>0))? 'movil':'pc'; }catch(e){}

/* ===================== LAS TRES CALIDADES ===================== */
/* TRES CALIDADES Y LAS TRES LAS ELIGE EL JUGADOR. Hubo un cuarto escalon 'minima' al que llegaba
   solo un vigia automatico; se fue junto con el vigia, porque un escalon que nadie puede elegir y que
   solo aparece cuando el juego decide bajarte los graficos es exactamente lo que se pidio sacar. */
const CAL={ baja:{ px:0.60, lockers:false, niebla:30, sombras:0 },
            media:{ px:0.90, lockers:true,  niebla:40, sombras:0 },
            alta:{ px:2.00, lockers:true,  niebla:52, sombras:1024 } };
/* ARRANCA EN ALTA, Y ESO RECIEN AHORA ES SENSATO. Antes 'alta' significaba a la vez mas pixeles y
   mas cosas que ver, asi que ponerla por defecto habria hundido a medio mundo. Con la resolucion
   dinamica delante, lo que cuesta —el relleno— se ajusta solo cuadro a cuadro, y lo que se ve —los
   lockers, la niebla larga— se queda puesto. Un telefono lento termina con el mismo relleno que tenia
   en 'media' pero con el colegio completo, que es lo que se pidio. */
let calidad='alta';
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
/* =========================================================================================
   LAS VELOCIDADES Y EL RITMO DE LA CAMINATA, JUNTOS Y DERIVADO UNO DEL OTRO

   Van aca —el primer archivo— y no donde se usan, por una razon concreta: el ciclo de la caminata se
   evalua en la tabla de animaciones (e2.js) y las velocidades se usan en el guion (i2.js), que va
   despues. Con las velocidades declaradas en i2.js, e2.js las leeria antes de su linea y un `const`
   leido antes de existir no rompe una funcion: rompe el modulo entero.

   Y EL RITMO SE CALCULA, no se elige. Estuvo en t*2,0 —un paso cada 1,57 s— mientras el riel lo movia
   a 3,4 m/s: eso son 2,7 metros por paso, o sea los pies arrastrando mientras el cuerpo avanza. El
   patinaje clasico. Con una zancada de 1,15 m el ciclo sale de la division, y si algun dia cambia la
   velocidad el ciclo la sigue solo.
   ========================================================================================= */
/* MAS RAPIDO, Y ES UN PEDIDO: "mejora el movimiento y la velocidad con el cambio de salones, asi no
   se vuelve tan aburrido". El tramo mas largo son catorce celdas = 58,8 m; a 2,6 m/s eran veintitres
   segundos de pasillo, y aunque la actividad cae en la mitad, las dos mitades siguen siendo caminata.
   A 3,7 el mismo tramo son dieciseis. El profesor sube en la misma proporcion para que siga llegando
   antes que la camara —si no, se lo pasa por encima al doblar— y el ciclo de la caminata NO hay que
   tocarlo: CAMINA_W sale de la velocidad, asi que la zancada se acomoda sola. */
const VEL_CAM=3.7, VEL_PROFE=4.2;
const ZANCADA=1.15;                                       // metros por paso
const CAMINA_W=2*Math.PI*VEL_PROFE/(2*ZANCADA);           // rad/s del ciclo (dos pasos por ciclo)

const CEL=4.2, ALTO_M=3.6, GRUESO=0.30;
const GW=17, GH=9;                       // celdas
/* ================= UN SOLO PASILLO, LOS OCHO SALONES PEGADOS, Y NI UNA PUERTA =================

   Pedido textual: *"haz que los salones esten seguiditos y que no hayan puertas asi el juego es mas
   rapido"*. Las dos mitades del pedido son la misma cosa y arreglan el mismo defecto.

   COMO ERA. Una reja de 23x19 —96,6 por 79,8 metros— con tres pasillos horizontales y tres
   verticales, las ocho aulas repartidas por las cuatro esquinas, y cada aula con su puerta en un
   anillo de pared. El recorrido 1,2,3,4,8,7,6,5 tenia tramos de CATORCE celdas: 58,8 m que a 2,9 m/s
   son veinte segundos de pasillo vacio entre una cuenta y la siguiente. Y encima cada aula costaba
   una puerta: acercarse, abrirla, esperar a que gire.

   COMO ES. Un solo pasillo —la fila 4— con cuatro salones de un lado y cuatro del otro, pegados
   entre si y separados por una unica celda de pared. El salon no tiene puerta: su lado del pasillo
   esta ABIERTO de punta a punta, o sea que desde el pasillo se ven las ocho bocas y se entra
   caminando. La reja baja a 17x9 = 71,4 x 37,8 m, o sea el 44% de la superficie.

   EL TRAMO MAS LARGO PASA DE 14 CELDAS A 4. El recorrido 1,2,3,4,8,7,6,5 va por el pasillo de oeste
   a este visitando los cuatro del norte y vuelve al oeste visitando los cuatro del sur: siete tramos
   y seis de ellos miden cuatro celdas (16,8 m, unos seis segundos). El septimo —del 4 al 8— mide
   CERO, porque el 8 esta justo enfrente del 4: se cruza el pasillo y ya. Eso no rompe nada y se
   comprobo: la ruta de una escena de viaje lleva ademas los cuatro puntos de salir del aula y los
   cuatro de entrar a la siguiente, asi que nunca queda vacia, y la actividad de ese tramo cae en el
   pasillo, entre las dos bocas.

   LO QUE ESTO OBLIGO A GENERALIZAR: hasta ahora TODAS las aulas se entraban por el norte, y el sitio
   del pizarron, del escritorio, del profesor y de la camara estaba escrito con esa suposicion
   metida adentro de la formula (`la pared del fondo es la fila j1+1`). Con salones a los dos lados
   de un mismo pasillo, los del norte se entran por el SUR. Cada aula lleva ahora su `dir`: +1 si se
   entra por el norte y -1 si se entra por el sur, y las cinco formulas lo multiplican. */
const PAS_F=[4], PAS_C=[];               // un solo pasillo, horizontal, en el medio
const PAS_I0=1, PAS_I1=GW-2;
/* dir: +1 se entra por el norte (fondo al sur), -1 se entra por el sur (fondo al norte) */
const AULAS=[
  {i0:1, i1:3,  j0:1, j1:3, n:1, dir:-1}, {i0:5, i1:7,  j0:1, j1:3, n:2, dir:-1},
  {i0:9, i1:11, j0:1, j1:3, n:3, dir:-1}, {i0:13,i1:15, j0:1, j1:3, n:4, dir:-1},
  {i0:1, i1:3,  j0:5, j1:7, n:5, dir:1},  {i0:5, i1:7,  j0:5, j1:7, n:6, dir:1},
  {i0:9, i1:11, j0:5, j1:7, n:7, dir:1},  {i0:13,i1:15, j0:5, j1:7, n:8, dir:1}
];
const LIBRETAS_N=AULAS.length;
/* 0 = pared, 1 = pasillo, 2 = aula. EL 3 —puerta— YA NO EXISTE. */
const MAPA=[];
for(let j=0;j<GH;j++){ MAPA.push([]); for(let i=0;i<GW;i++) MAPA[j].push(0); }
for(const f of PAS_F) for(let i=PAS_I0;i<=PAS_I1;i++) MAPA[f][i]=1;
for(const c of PAS_C) for(let j=1;j<=GH-2;j++) MAPA[j][c]=1;
for(const a of AULAS) for(let j=a.j0;j<=a.j1;j++) for(let i=a.i0;i<=a.i1;i++) MAPA[j][i]=2;
/* LA BOCA DE CADA AULA: la celda de PASILLO que tiene el aula al lado. No es una puerta y no hay
   nada que abrir — es el nombre del punto por donde se entra, y sale de la geometria igual que
   antes salia la puerta, asi que sigue siendo imposible que quede tapiada. */
const PUERTAS=[];                        // se deja vacio: ya no hay hojas que girar
for(const a of AULAS){
  const im=Math.round((a.i0+a.i1)/2);
  a.boca=[im, (a.dir>0)? a.j0-1 : a.j1+1];
  a.puertas=0;
}
/* LAS DOS SALIDAS, a las dos puntas del pasillo. Tambien son aberturas y no puertas: la del oeste es
   por donde se sale al patio al terminar la clase. */
const SALIDAS=[{i:0,j:PAS_F[0]},{i:GW-1,j:PAS_F[0]}];
for(const s of SALIDAS) MAPA[s.j][s.i]=1;

function XC(i){ return (i-(GW-1)/2)*CEL; }
function ZC(j){ return (j-(GH-1)/2)*CEL; }
function celda(x,z){ return [Math.round(x/CEL+(GW-1)/2), Math.round(z/CEL+(GH-1)/2)]; }
function pisable(i,j){
  if(i<0||j<0||i>=GW||j>=GH) return false;
  const c=MAPA[j][i];
  return c===1||c===2;
}
/* EL PROFESOR ABRE LAS PUERTAS, ASI QUE PARA EL TODAS ESTAN ABIERTAS.
   Con una sola funcion de "se pisa" para los dos pasaba esto, y lo encontro la prueba: el profesor
   arranca DENTRO del aula 8 con la puerta cerrada, o sea que el BFS desde el jugador no llegaba
   hasta el, `rumbo` devolvia null, y el pobre caminaba en linea recta contra la pared de su propia
   aula. La distancia al jugador bajaba 6,9 m en tres segundos y despues 2,2 m en cuatro: estaba
   raspando una pared. Un perseguidor encerrado no es una amenaza, es un adorno. */
function pisableProf(i,j){ return pisable(i,j); }
