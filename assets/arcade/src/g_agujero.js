/* ============================================================================
   AGUJERO — un pozo negro que se come la ciudad, y a los otros pozos
   ----------------------------------------------------------------------------
   Arrastrá para mover el pozo. Se traga TODO lo que sea más chico que él y cada
   cosa lo agranda: primero faroles y bancos, después árboles y autos, al final
   kioscos y casas. Y ESTILO AGAR.IO: el pozo más grande se traga a los otros
   POZOS enteros y el comido queda AFUERA de la partida. Si te comen a vos, la
   ronda termina ahí. Si te los comés a los quince, victoria total.

   ==================== LA PASADA DEL MAPA GRANDE ====================
   El usuario pidió mapa "extremadamente" más grande, más zonas, agar.io, ojos
   animados, culleo con frustum y tope de 15 rivales. Qué cambió y qué se midió:

   · EL MAPA: de 26 a 92 de medio lado. 52x52 -> 184x184, DOCE veces la
     superficie, y el censo de 80 props a ~1.230.
   · NUEVE ZONAS de 61x61 (centro, parque, puerto, obrero, plaza, fábricas,
     bosque, costa, ruinas), cada una con SU paleta de pasto/asfalto/vereda y su
     mezcla de cuadras. Se anuncian al cruzarlas y el remate cuenta cuántas
     recorriste. Tres tipos de cuadra nuevos (arboleda, depósito, ruina) que NO
     agregan geometría: reparten distinto los mismos seis props.
   · DIECISÉIS POZOS (vos + 15). Con la forma vieja —un Group con tres mallas por
     pozo— eso era 48 llamadas de dibujo sólo en pozos. Ahora los tres anillos son
     tres InstancedMesh compartidos: los 16 pozos completos cuestan 3 llamadas.
   · CÓMO SE HIZO POSIBLE EL MAPA GRANDE (lo importante), y en qué orden rindió:
       1. REJILLA ESPACIAL (celda de 12). Comer, elegir blanco y buscar lugar libre
          recorrían TODOS los props: 1.230 x 16 pozos por cuadro. Ahora se miran
          las celdas vecinas (~15 props). Sin esto el juego tardaba segundos en
          arrancar (un millón de comparaciones sólo para colocar el barrio).
       2. TOPE DE DISTANCIA + FRUSTUM prop por prop. El frustum solo no alcanza:
          con la cámara picada el cono llega al plano lejano y dejaba entrar 225
          props = 17.236 triángulos. Con el tope a la altura de la niebla entran
          ~107 y son ~8.000. De 1.230 props se suben a la GPU 8%.
       3. PISO POR TROZOS con el frustumCulled de three. Medido las tres opciones:
            3x3 (61 u):  6 trozos ·  8.370 triángulos ·  6 llamadas
            8x8 (23 u): 32 trozos ·  6.976 triángulos · 32 llamadas
            4x4 (46 u): el elegido — partirlo más fino NO baja los triángulos
            (el costo son las RAYAS del asfalto, que están en todo el mapa igual)
            y en cambio multiplica las llamadas.
       4. Las rayas cada 4,8 y no cada 3,4: eran la mitad del costo del piso.
     RESULTADO MEDIDO (ronda completa con el piloto, swiftshader):
       apaisado 900x430: 20.972 triángulos · 28 llamadas · 51,5 fps (mínimo 40,8)
       celular  412x915: 22.418 triángulos · 27 llamadas · 50,5 fps (mínimo 40,0)
     con el mapa DOCE veces más grande que la versión anterior, que daba 23.698
     triángulos y 24 fps en 52x52.
   · OJOS, en la capa 2D (cero llamadas de dibujo y libertad para animar). Seis
     gestos: mira y parpadea, entrecierra y baja las cejas al CAZAR, abre grande y
     tiembla cuando algo lo puede comer, festeja con dos arcos al tragarse algo
     grande, gira las pupilas si queda mareado, y queda con los ojos en CRUZ si lo
     comieron. La mirada persigue al blanco de verdad: se entiende a quién va a ir
     cada pozo sin leer un cartel.
   · EL PILOTO (dbg.autoMove) se reescribió con el orden HUIR > CAZAR > COMER, y
     no huye contra la pared (antes quedaba acorralado y siempre lo comían).

   ==================== LO QUE SE ARREGLÓ EN ESTA PASADA ====================
   El usuario dijo "no se gana ni se pierde". Medido con _agm.js (900x430,
   swiftshader, piloto __bot llamando dbg.autoMove en cada cuadro):

   · LA RONDA MORÍA A LOS 24 SEGUNDOS. A los 24 s el censo de props llegaba a
     CERO (props:0 en dbg.state) con masa 298 y quedaban ¡62 segundos! de reloj
     sin nada que comer: el resultado estaba decidido y el jugador miraba el
     cronómetro. Dos arreglos:
       1. la ronda dura 56-46 s según el barrio (era 92-lvl*4 = 88 s en el 1);
       2. EL BARRIO SE RECONSTRUYE (obras): lo que se cae reaparece en otro lado.
     El respawn REUSA la instancia muerta del mismo InstancedMesh, así que el
     censo, los triángulos y las llamadas de dibujo NO se mueven ni un punto: la
     ronda entera se juega con los mismos 6 draw calls de props.
   · NO HABÍA OBJETIVO. Ahora cada barrio pide algo concreto (comé N cosas /
     llegá a N de masa / terminá primero), se anuncia en una tarjeta al empezar,
     tiene barra de progreso en el HUD y decide el resultado: GANÁS si cumplís y
     NO quedás último. Se puede perder de verdad (medido: con el piloto apagado
     el barrio 1 termina en PUESTO 3, 0 estrellas).
   · LOS RIVALES ARRANCABAN GANANDO 53-64 A 5. Nacían sobre los props y comían a
     ritmo completo desde el cuadro 1. Ahora comen con un factor por barrio
     (0,50 + lvl*0,08) y una BANDA: si van más del 15% arriba del jugador comen
     al 55%, si están al 60% o menos comen al 135%. Los primeros 6 segundos van
     al 60%. Resultado: la carrera se mantiene leíble y los últimos 10 segundos
     deciden.
   · VELOCIDAD (medido con renderer.info EN PARTIDA, 900x430 swiftshader):
     ANTES 23.698 triángulos / 22 llamadas / 24 fps de mediana (mínimo 13).
     Qué se hizo, por orden de lo que MIDIÓ:
       · props = el costo #1 (esconderlos: 22 -> 40 fps). FUERA LOS GLB: bajados a
         150 triángulos quedaban hechos pedazos (capturas F-ag-glb-cerca contra
         F-ag-box-cerca) y encima costaban más que la geometría propia (150 contra
         112 el árbol y 84 el auto y la casa). Sale más barato, se ve un orden
         mejor y el juego pesa 600 kB menos.
       · la NIEBLA de three era el otro cuello: sacarla de las capas de relleno
         (campo, suelo, rayas) pasó de 39 a 60 fps con dpr 1. Se queda sólo en
         props y cerco, que ocupan poca pantalla.
       · la escena viva del menú se dibuja a la MITAD de cuadros: el menú pasó de
         18 a 55 fps (las animaciones de CSS del menú necesitan cuadros también).
       · las rayas del asfalto eran CAJAS: 2.160 triángulos para pintar cuatro
         píxeles. Ahora son dos triángulos cada una (planos): 2.160 -> 300.
       · resolución dinámica propia: si baja de 36 fps se baja el pixelRatio del
         renderer hasta 0,72 y se recupera al pasar 52. Es lo único que garantiza
         el objetivo en un rasterizador de software, y en el celular ni se activa.
     DESPUÉS: ver el informe (objetivo <=15.000 triángulos, <=60 llamadas, >=40 fps).
   · MENÚ VIVO: GAME.attract corre una partida sola (tres pozos comiéndose el
     barrio) con la cámara orbitando el pozo grande, y se reinicia cada ~26 s.
   · CONTENIDO: monedas por ronda (masa/3 + bonus por objetivo, puesto y racha),
     TIENDA DE POZOS con 6 pozos desbloqueables (cada uno con su ventaja), racha
     de bocados con multiplicador, y remate de fin con puesto, masa, objetivo,
     estrellas y monedas.

   ==================== LO QUE YA ESTABA MEDIDO (no deshacer) ====================
   · EL CANTO DEL PLATO. El barrio es un plato de 26 de medio lado y la cámara va
     DETRÁS del pozo (en +z): pegado al borde la cámara se pasaba del plato y se
     veía el FILO y el cielo. El afuera son tres cosas: CERCO de vereda + seto en
     MAP+1,6 (tapa el filo y dice dónde termina la cuadra), plato de pasto hasta
     MAP+4 y un anillo de CAMPO hasta 150 con el color degradado hacia el cielo
     POR DISTANCIA AL BARRIO (la niebla de three se mide desde la cámara: con la
     cámara encima del pozo el afuera caía entero dentro de fog.near y quedaba
     una plancha de verde plano). El pozo se clampea con `FENCE-.55-h.r`: el ARO
     entero queda del lado de adentro.
   · UNA SOLA REGLA para comer (`canEat`). Tener una para comer y otra para
     elegir objetivo trababa a los rivales: se paraban encima de un auto que no
     podían tragar y volvían a elegirlo (distancia cero) para siempre.
   · RIVALES MÁS LISTOS, NO MÁS RÁPIDOS: tope de velocidad debajo del jugador.
   · LO QUE CUESTA ES EL RELLENO DEL SUELO: el suelo se EMBALDOSA con una malla
     sola de color por vértice (pasto, vereda y asfalto sin capas superpuestas),
     lo plano y horizontal va con MeshBasicMaterial (una superficie horizontal
     con luz hemisférica + sol da color constante) y el campo es un ANILLO y no
     un disco (el disco pintaba toda la pantalla DEBAJO del plato).
   · LAS LUCES VAN EN UNIDADES FÍSICAS: three moderna deja el Lambert en
     albedo*(intensidad/π), así que hemi 2,15 + sol 1,35 (≈π veces 1,0 y 0,6).
   · TRAGAR EN DOS TIEMPOS: la cosa se inclina y se desliza (avisa "esto te lo
     podés tragar"), y cuando el centro entra se suelta y cae girando.
   · MODELOS: auto, árbol y casa de Higgsfield, normalizados por HUELLA y no por
     alto (lo que decide si algo entra es el radio).
   ========================================================================== */
const G={
  slug:'agujero',name:'AGUJERO',
  title:'A<em>GUJERO</em>',
  sub:'Tragate la ciudad y a los otros quince pozos.',
  subKey:'sub',
  acc:'#c084fc',acc2:'#8b5cf6',levels:6,bestKey:'mass',bestLabel:'MASA',
  three:true,sky:'#cfe3f5',shadows:false,
  art:A('art-agujero.jpg'),music:A('mus-agujero.m4a'),
  /* MEDIDO archivo por archivo (decodificados en el navegador, pico de la onda):
     del set compartido están MUDOS sfx-win (.016), sfx-lose (.007), sfx-click
     (.001), sfx-splat (.004) y sfx-shoot (.024), y sfx-tap apenas llega a .042.
     Como el motor toca 'tap' en cada botón y 'win'/'lose' en el final, acá las
     CLAVES se apuntan a archivos que sí suenan: la clave es lo que pide el motor,
     el archivo es cosa del juego. Audibles: power .84, boom .80, coin .75,
     glass .70, wood .46, groan .27, pop .23. */
  sfx:{pop:A('sfx-pop.mp3'),           /* farol y banco: lo chico */
       wood:A('sfx-wood.mp3'),         /* árbol: madera */
       glass:A('sfx-glass.mp3'),       /* auto: chapa y vidrio */
       boom:A('sfx-agujero-derrumbe.wav'), /* kiosco y casa: derrumbe propio */
       power:A('sfx-power.mp3'),       /* subir de tamaño */
       /* 'click' NO se declara a propósito: el tic de los últimos 10 segundos
          suena 10 veces por ronda y con sfx-coin.mp3 (que es una MONEDA) quedaba
          como si estuvieras juntando plata en la cuenta atrás. Sin archivo, el
          motor cae al blip sintetizado de 1400 Hz, que es justo un tic seco, no
          pesa nada y no hay que generar ningún asset nuevo. */
       coin:A('sfx-coin.mp3'),
       tap:A('sfx-pop.mp3'),           /* botones (sfx-tap está casi mudo) */
       win:A('sfx-power.mp3'),lose:A('sfx-groan.mp3')},
  extra:{icon:'◉',fn:()=>openShop()},
  i18n:{
    es:{sub:'Movés el pozo con el dedo y te tragás la ciudad: cada cosa que cae te agranda. Hay <b>QUINCE POZOS RIVALES</b> en nueve zonas y el más grande se traga al más chico: comelos a todos, y cuidado, que te pueden comer a vos.',
      mass:'MASA',time:'TIEMPO',you:'VOS',rival:'RIVAL',
      hint:'ARRASTRÁ PARA MOVER EL POZO',hint2:'primero lo chico',
      grew:'¡MÁS GRANDE!',last10:'¡ÚLTIMOS 10 SEGUNDOS!',
      ateRival:'¡TE COMISTE UN RIVAL!',eaten:'¡UN RIVAL TE MORDIÓ!',
      first:'¡PRIMER PUESTO!',place:'PUESTO',
      yourMass:'Tu masa',rivals:'Rivales',swallowed:'Cosas tragadas',hood:'BARRIO',
      goal:'OBJETIVO',gEat:'COMÉ % COSAS',gMass:'LLEGÁ A % DE MASA',gRank:'TERMINÁ PRIMERO',
      gEatS:'% cosas',gMassS:'% de masa',gRankS:'1er puesto',
      gHunt:'TRAGATE % POZOS',gHuntS:'% pozos',you:'VOS',
      devoured:'TE TRAGARON',sweep:'¡TE LOS COMISTE A TODOS!',eatenBy:'Te tragó',
      hunted:'Pozos tragados',zonesSeen:'Zonas recorridas',outOf:'Fuera de juego',
      zCentro:'CENTRO',zParque:'EL PARQUE',zPuerto:'EL PUERTO',zObrero:'BARRIO OBRERO',
      zPlaza:'LA PLAZA',zFabrica:'LAS FÁBRICAS',zBosque:'EL BOSQUE',zCosta:'LA COSTA',
      zRuinas:'LAS RUINAS',danger:'¡TE VAN A COMER!',
      goalOk:'¡OBJETIVO CUMPLIDO!',goalDone:'Objetivo cumplido',goalMiss:'Objetivo NO cumplido',
      last:'¡ÚLTIMO! PERDISTE',streak:'Mejor racha',
      shop:'POZOS',shopSub:'Juntá monedas comiendo barrio',use:'EN USO',have:'ELEGIR',
      need:'TE FALTAN',bought:'¡POZO NUEVO!',
      sk0:'CLÁSICO',sk1:'HIELO',sk2:'CHICLE',sk3:'ORO',sk4:'ÁCIDO',sk5:'LAVA',
      p0:'el de siempre',p1:'+6% de velocidad',p2:'arrancás con 14 de masa',
      p3:'imán más largo',p4:'perdés menos al ser mordido',p5:'+6% velocidad y 22 de masa'},
    en:{sub:'Drag the pit around and swallow the city: everything that falls in makes you bigger. <b>FIFTEEN RIVAL PITS</b> roam nine zones and the bigger pit swallows the smaller one: eat them all, and watch out, they can eat you. ',
      mass:'MASS',time:'TIME',you:'YOU',rival:'RIVAL',
      hint:'DRAG TO MOVE THE PIT',hint2:'small stuff first',
      grew:'BIGGER!',last10:'LAST 10 SECONDS!',
      ateRival:'YOU ATE A RIVAL!',eaten:'A RIVAL BIT YOU!',
      first:'FIRST PLACE!',place:'PLACE',
      yourMass:'Your mass',rivals:'Rivals',swallowed:'Things swallowed',hood:'BLOCK',
      goal:'GOAL',gEat:'EAT % THINGS',gMass:'REACH % MASS',gRank:'FINISH FIRST',
      gEatS:'% things',gMassS:'% mass',gRankS:'1st place',
      gHunt:'SWALLOW % HOLES',gHuntS:'% holes',you:'YOU',
      devoured:'YOU GOT SWALLOWED',sweep:'YOU ATE THEM ALL!',eatenBy:'Swallowed by',
      hunted:'Holes swallowed',zonesSeen:'Zones visited',outOf:'Knocked out',
      zCentro:'DOWNTOWN',zParque:'THE PARK',zPuerto:'THE DOCKS',zObrero:'OLD TOWN',
      zPlaza:'THE SQUARE',zFabrica:'THE FACTORIES',zBosque:'THE WOODS',zCosta:'THE COAST',
      zRuinas:'THE RUINS',danger:'THEY WILL EAT YOU!',
      goalOk:'GOAL COMPLETE!',goalDone:'Goal complete',goalMiss:'Goal NOT met',
      last:'LAST! YOU LOSE',streak:'Best streak',
      shop:'PITS',shopSub:'Earn coins eating the block',use:'IN USE',have:'SELECT',
      need:'YOU NEED',bought:'NEW PIT!',
      sk0:'CLASSIC',sk1:'ICE',sk2:'BUBBLE',sk3:'GOLD',sk4:'ACID',sk5:'LAVA',
      p0:'the usual one',p1:'+6% speed',p2:'start with 14 mass',
      p3:'longer magnet',p4:'lose less when bitten',p5:'+6% speed and 22 mass'},
    pt:{sub:'Arraste o buraco e engula a cidade: cada coisa que cai te deixa maior. Há <b>QUINZE BURACOS RIVAIS</b> em nove zonas e o maior engole o menor: coma todos, e cuidado, podem te comer. ',
      mass:'MASSA',time:'TEMPO',you:'VOCÊ',rival:'RIVAL',
      hint:'ARRASTE PARA MOVER O BURACO',hint2:'primeiro o pequeno',
      grew:'MAIOR!',last10:'ÚLTIMOS 10 SEGUNDOS!',
      ateRival:'VOCÊ COMEU UM RIVAL!',eaten:'UM RIVAL TE MORDEU!',
      first:'PRIMEIRO LUGAR!',place:'LUGAR',
      yourMass:'Sua massa',rivals:'Rivais',swallowed:'Coisas engolidas',hood:'BAIRRO',
      goal:'OBJETIVO',gEat:'COMA % COISAS',gMass:'CHEGUE A % DE MASSA',gRank:'TERMINE PRIMEIRO',
      gEatS:'% coisas',gMassS:'% de massa',gRankS:'1º lugar',
      gHunt:'ENGULA % POÇOS',gHuntS:'% poços',you:'VOCÊ',
      devoured:'VOCÊ FOI ENGOLIDO',sweep:'COMEU TODOS!',eatenBy:'Engolido por',
      hunted:'Poços engolidos',zonesSeen:'Zonas visitadas',outOf:'Fora de jogo',
      zCentro:'CENTRO',zParque:'O PARQUE',zPuerto:'O PORTO',zObrero:'BAIRRO OPERÁRIO',
      zPlaza:'A PRAÇA',zFabrica:'AS FÁBRICAS',zBosque:'A MATA',zCosta:'A COSTA',
      zRuinas:'AS RUÍNAS',danger:'VÃO TE COMER!',
      goalOk:'OBJETIVO CUMPRIDO!',goalDone:'Objetivo cumprido',goalMiss:'Objetivo NÃO cumprido',
      last:'ÚLTIMO! VOCÊ PERDEU',streak:'Melhor sequência',
      shop:'BURACOS',shopSub:'Junte moedas comendo o bairro',use:'EM USO',have:'ESCOLHER',
      need:'FALTAM',bought:'BURACO NOVO!',
      sk0:'CLÁSSICO',sk1:'GELO',sk2:'CHICLETE',sk3:'OURO',sk4:'ÁCIDO',sk5:'LAVA',
      p0:'o de sempre',p1:'+6% de velocidade',p2:'começa com 14 de massa',
      p3:'ímã mais longo',p4:'perde menos ao ser mordido',p5:'+6% velocidade e 22 de massa'}
  }
};
/* ===================== EL MAPA GRANDE (12 veces el de antes) =====================
   Era un plato de 26 de medio lado (52x52 = 2.704 unidades²). Ahora son 92 de medio
   lado: 184x184 = 33.856 unidades², DOCE veces la superficie, repartida en NUEVE
   ZONAS de 61x61 con su propia paleta, su mezcla de cuadras y su nombre.
   Un mapa así no se puede dibujar entero: lo que lo hace posible es que NADA se
   dibuja si no se ve (ver cullStep). */
const MAP=92;                  /* medio lado de la cuadra jugable */
const PLATE=MAP+5;             /* plato del barrio (más grande que lo jugable) */
const FENCE=MAP+2;             /* vereda + seto: tapa el canto y marca el límite */
const FIELD=320;               /* campo lejano: nunca se ve un borde */
const RSTEP=11.5;              /* separación entre calles */
const ROADS=(()=>{const a=[];for(let v=-MAP+RSTEP*.5;v<MAP;v+=RSTEP)a.push(+v.toFixed(2));return a;})();
const COL={grass:'#b0c983',field:'#9fbb78',road:'#4d535b',line:'#c9cfb4',
  curb:'#9aa4ad',hedge:'#3d7a4b',hedge2:'#2f5f3a'};
/* ---- LAS NUEVE ZONAS. Cada una pinta su pasto y su asfalto y trae su propia
   mezcla de cuadras, así cruzar el mapa se SIENTE como viajar. La del medio es
   siempre la plaza donde arranca el jugador. ---- */
const ZN=3;                                   /* rejilla de zonas: 3x3 */
const ZS=(MAP*2)/ZN;                          /* lado de una zona */
const ZONES=[
  {k:'centro' ,nk:'zCentro' ,grass:'#a9c07c',road:'#4d535b',curb:'#9aa4ad',
   mix:['comercio','comercio','casa','plaza']},
  {k:'parque' ,nk:'zParque' ,grass:'#8fc46a',road:'#5a6152',curb:'#a8b394',
   mix:['plaza','plaza','baldio','arboleda']},
  {k:'puerto' ,nk:'zPuerto' ,grass:'#7fa8a0',road:'#46525c',curb:'#8f9ea8',
   mix:['comercio','baldio','deposito','deposito']},
  {k:'obrero' ,nk:'zObrero' ,grass:'#b8ab7e',road:'#54514c',curb:'#a29a8c',
   mix:['casa','casa','casa','comercio']},
  {k:'plaza'  ,nk:'zPlaza'  ,grass:'#b0c983',road:'#4d535b',curb:'#9aa4ad',
   mix:['plaza','baldio','casa','comercio']},
  {k:'fabrica',nk:'zFabrica',grass:'#9a9a86',road:'#48474a',curb:'#8e8e92',
   mix:['deposito','deposito','comercio','baldio']},
  {k:'bosque' ,nk:'zBosque' ,grass:'#6fae5c',road:'#4f5a49',curb:'#93a184',
   mix:['arboleda','arboleda','baldio','plaza']},
  {k:'costa'  ,nk:'zCosta'  ,grass:'#c8c793',road:'#575c5e',curb:'#b3b49c',
   mix:['baldio','plaza','casa','arboleda']},
  {k:'ruinas' ,nk:'zRuinas' ,grass:'#9d9482',road:'#4a4744',curb:'#8d8779',
   mix:['baldio','baldio','ruina','ruina']}
];
/* de coordenada de mundo a índice de zona (y al revés) */
function zoneAt(x,z){
  const i=clamp(Math.floor((x+MAP)/ZS),0,ZN-1);
  const j=clamp(Math.floor((z+MAP)/ZS),0,ZN-1);
  return j*ZN+i;
}
function zoneCenter(zi){
  const i=zi%ZN,j=(zi/ZN)|0;
  return{x:-MAP+ZS*(i+.5),z:-MAP+ZS*(j+.5)};
}
/* ===================== REJILLA ESPACIAL =====================
   Con 184x184 de mapa el censo pasa de 80 props a ~2.000, y los bucles que antes
   recorrían TODOS los props (comer, elegir blanco, buscar lugar libre) pasarían a
   costar 2.000 x 16 pozos por cuadro. La rejilla convierte eso en "mirá las nueve
   celdas de al lado": de 32.000 comparaciones por cuadro a ~40. */
const CELL=12;
const GW=Math.ceil((MAP*2+CELL)/CELL);
let GRID=null;
const gIx=(x,z)=>{
  const i=clamp(Math.floor((x+MAP)/CELL),0,GW-1);
  const j=clamp(Math.floor((z+MAP)/CELL),0,GW-1);
  return j*GW+i;
};
function gridClear(){GRID=new Array(GW*GW);for(let i=0;i<GRID.length;i++)GRID[i]=[];}
function gridPut(p){p.ci=gIx(p.x,p.z);GRID[p.ci].push(p);}
function gridDel(p){
  const c=GRID[p.ci];if(!c)return;
  const i=c.indexOf(p);if(i>=0)c.splice(i,1);
}
/* recorre los props a menos de `rad` de (x,z) llamando a fn. Devuelve cuántos vio. */
function gridNear(x,z,rad,fn){
  const i0=clamp(Math.floor((x-rad+MAP)/CELL),0,GW-1),i1=clamp(Math.floor((x+rad+MAP)/CELL),0,GW-1);
  const j0=clamp(Math.floor((z-rad+MAP)/CELL),0,GW-1),j1=clamp(Math.floor((z+rad+MAP)/CELL),0,GW-1);
  let n=0;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    const c=GRID[j*GW+i];
    for(let k=0;k<c.length;k++){fn(c[k]);n++;}
  }
  return n;
}
/* ---- BARRIOS: reloj corto y objetivo explícito (era 92-lvl*4 = 88 s sin objetivo) ---- */
/* Los números salen de MEDIR el piloto (dbg.autoMove, que juega bien): en el
   barrio 1 se come 104 cosas y llega a 798 de masa en 56 s. El objetivo se pone
   en ~40-50% de eso, que es lo que hace una persona que recién agarra el juego. */
/* RELOJ MÁS LARGO que el del mapa chico (56 s): con 184x184 y quince rivales hace
   falta tiempo para cruzar zonas y para que la cacería pase. Y los objetivos ahora
   incluyen TRAGARSE POZOS, que es la mecánica nueva. */
const HOODS=[
  {t:105,k:'eat', n:55},
  {t:105,k:'hunt',n:2},
  {t:110,k:'mass',n:420},
  {t:110,k:'hunt',n:4},
  {t:115,k:'rank',n:1},
  {t:120,k:'hunt',n:7}
];
/* ---- TIENDA DE POZOS: lo que se junta se gasta ---- */
const NICK=['NILO','ZOE','TOTO','BRUNO'];
const SKINS=[
  {col:'#c084fc',cost:0,   spd:1,   m0:0, mag:1.75,loss:0},
  {col:'#4dd0ff',cost:150, spd:1.06,m0:0, mag:1.75,loss:0},
  {col:'#ff7ab8',cost:320, spd:1,   m0:14,mag:1.75,loss:0},
  {col:'#ffd166',cost:600, spd:1,   m0:0, mag:2.1, loss:0},
  {col:'#7dff9b',cost:900, spd:1,   m0:0, mag:1.75,loss:.18},
  {col:'#ff6b57',cost:1400,spd:1.06,m0:22,mag:1.75,loss:0}
];
let T3,scene,cam,gp={dpr:1.75,part:1,sh:1,fog:1};
let props=[],holes=[],ims=[],FREE={},time=0,lvl=1,drag=null,dirv={x:0,z:0},done=false;
let camD=14,grace=0,hintT=0,lastSec=-1,warned=false,infoCache='';
let eaten=0,sndS=0,sndB=0,flash=0,city=null,fieldM=null,txN=0,groundChunks=[];
let goal=HOODS[0],introT=0,startT=0,streak=0,bestStreak=0,comboT=0,goalHit=false;
let spawnT=0,census=0,perk=SKINS[0],demo=0,aT=0,rs=1,rsT=0,rsLock=0,aHalf=false;
let eatenBy='',zSeen={},zNow=-1,botW=null;
const KGEO={};                                  /* geometría+material por tipo */
let IMK={};                                     /* InstancedMesh por tipo */
let M4,QT,EU,V3,V3b,PV,WHITE,WCOL;              /* se crean en init (T3 recién ahí) */
let camTx=0,camTz=0;                            /* a dónde mira la cámara: lo usa el culleo */

/* ---- tipos de prop: radio (lo que hay que medir para comerlo), masa y alto ---- */
/* SIN GLB, y esto se midió y se MIRÓ (capturas F-ag-glb-cerca / F-ag-box-cerca):
   los modelos de image_to_3d simplificados por el motor a 150 triángulos quedaban
   HECHOS PEDAZOS —el árbol era un manchón de polígonos sueltos, el auto astillas,
   la casa un cuadrado rojo plano— porque SimplifyModifier colapsa a través de las
   costuras de color y no hay malla que sobreviva a bajar de 28.000 a 150. La
   versión de geometría propia sale MÁS BARATA y se ve un orden mejor: árbol 112,
   auto 84, casa 84 triángulos contra 150 cada uno. Además el juego pesa 600 kB
   menos y arranca sin el paso de "modelos" (el usuario se quejó de lento). */
const K={
  farol :{r:.50,mass:1 ,h:2.6},
  banco :{r:.66,mass:2 ,h:.8},
  arbol :{r:.88,mass:4 ,h:2.5},
  auto  :{r:1.16,mass:9 ,h:1.45},
  kiosco:{r:1.60,mass:20,h:2.4},
  casa  :{r:2.20,mass:44,h:4.4}
};
/* CUADRAS por zona. Las tres nuevas (arboleda, deposito, ruina) usan los MISMOS
   seis tipos de prop: no suman geometría ni llamadas de dibujo, sólo reparten
   distinto, que es lo que hace que cada zona se lea como otro barrio. */
const BLOCKS={
  arboleda(cx,cz){
    for(let i=0;i<5;i++)place('arbol',cx+rnd(-4.2,4.2),cz+rnd(-4.2,4.2),1.6);
    place('banco',cx+rnd(-3,3),cz+rnd(-3,3),1.2);
    place('farol',cx+rnd(-3.4,3.4),cz+rnd(-3.4,3.4),1.2);
  },
  deposito(cx,cz){
    place('casa',cx,cz,.3);                       /* la nave */
    place('kiosco',cx+3.2,cz-3.2,.6);             /* la garita */
    place('auto',cx-3.2,cz+3,.9);place('auto',cx-3.2,cz-3,.9);
    place('farol',cx+3.4,cz+3.4,.5);
  },
  ruina(cx,cz){
    place('kiosco',cx+rnd(-1.2,1.2),cz+rnd(-1.2,1.2),.8);
    place('banco',cx+3,cz+2.6,1);place('banco',cx-2.8,cz-2.8,1);
    place('arbol',cx-3.2,cz+3.2,1.2);
    for(let i=0;i<2;i++)place('farol',cx+rnd(-3.6,3.6),cz+rnd(-3.6,3.6),1.2);
  }
};
function radiusFor(mass){return Math.sqrt(1+mass*.05)*1.06;}
/* UNA sola regla de "esto me lo puedo tragar", para el que come y para el que
   ELIGE a dónde ir. Tenerlas distintas fue el bug que trababa a los rivales:
   pickTarget aceptaba hasta r*(1,06 + hambre) y eatStep sólo hasta r*1,03, así que
   el rival se paraba encima de un auto que no podía comer, y como al vencer su
   temporizador volvía a elegir el prop MÁS CERCANO —el mismo auto, a distancia
   cero— se quedaba ahí para siempre. */
const canEat=(h,p)=>p.r<=h.r*1.03;
/* estados del prop: 0 quieto · 1 inclinado · 2 cayendo · 3 brotando (obra) · 9 libre */
const live=p=>p.st===0||p.st===1;

/* ============================ GEOMETRÍA ============================
   Todo lo estático se cocina en UNA geometría con color por vértice, así el
   barrio entero (calles + veredas + cerco) es una sola malla y cada tipo de prop
   es un solo InstancedMesh. */
function bx(w,h,d,x,y,z,c,out){
  const g=new T3.BoxGeometry(w,h,d).toNonIndexed();g.translate(x,y,z);out.push({g,c});return out;
}
/* baldosa PLANA (2 triángulos). Las rayas del asfalto eran cajas: 12 triángulos
   cada una para pintar cuatro píxeles, 2.160 en total. Con planos: 300. */
function fl(w,d,x,y,z,c,out){
  const g=new T3.PlaneGeometry(w,d).toNonIndexed();g.rotateX(-Math.PI/2);
  g.translate(x,y,z);out.push({g,c});return out;
}
function ico(r,x,y,z,c,out,det){
  const g=new T3.IcosahedronGeometry(r,det==null?1:det).toNonIndexed();
  g.translate(x,y,z);out.push({g,c});return out;
}
function mergeColored(parts){
  let n=0;for(const p of parts)n+=p.g.attributes.position.count;
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);
  const C=new T3.Color();let o=0;
  for(const p of parts){
    const P=p.g.attributes.position,N=p.g.attributes.normal;C.set(p.c);
    for(let i=0;i<P.count;i++){const k=(o+i)*3;
      pos[k]=P.getX(i);pos[k+1]=P.getY(i);pos[k+2]=P.getZ(i);
      nor[k]=N.getX(i);nor[k+1]=N.getY(i);nor[k+2]=N.getZ(i);
      col[k]=C.r;col[k+1]=C.g;col[k+2]=C.b;}
    o+=P.count;p.g.dispose();
  }
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.BufferAttribute(pos,3));
  g.setAttribute('normal',new T3.BufferAttribute(nor,3));
  g.setAttribute('color',new T3.BufferAttribute(col,3));
  g.computeBoundingSphere();g.computeBoundingBox();
  return g;
}
/* GLB -> UNA geometría normalizada (alto pedido, centrada en x/z, apoyada en y=0)
   y un material Lambert (más barato que Standard y acá no hay PBR que perder).
   Si el modelo no está, viene con textura o pasa de 6000 triángulos, se devuelve
   null y el tipo de prop cae a la versión de cajas. */
function glbGeo(key,targetR){
  const S=ARC.glb&&ARC.glb[key];
  if(!S||!S.scene)return null;
  try{
    const root=S.scene.clone(true);root.updateMatrixWorld(true);
    const gs=[];let n=0,hasC=true,src=null;
    root.traverse(k=>{if(k.isMesh&&k.geometry){
      let g=k.geometry.index?k.geometry.toNonIndexed():k.geometry.clone();
      g.applyMatrix4(k.matrixWorld);
      if(!g.attributes.normal)g.computeVertexNormals();
      if(!g.attributes.color)hasC=false;
      gs.push(g);n+=g.attributes.position.count;if(!src)src=k.material;}});
    if(!gs.length)return null;
    const tris=Math.round(n/3);
    if(tris>6000){for(const g of gs)g.dispose();return null;}
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=hasC?new Float32Array(n*3):null;
    let o=0;
    for(const g of gs){
      const P=g.attributes.position,N=g.attributes.normal,C=g.attributes.color;
      for(let i=0;i<P.count;i++){const k=(o+i)*3;
        pos[k]=P.getX(i);pos[k+1]=P.getY(i);pos[k+2]=P.getZ(i);
        nor[k]=N.getX(i);nor[k+1]=N.getY(i);nor[k+2]=N.getZ(i);
        if(col){col[k]=C.getX(i);col[k+1]=C.getY(i);col[k+2]=C.getZ(i);}}
      o+=P.count;g.dispose();
    }
    const geo=new T3.BufferGeometry();
    geo.setAttribute('position',new T3.BufferAttribute(pos,3));
    geo.setAttribute('normal',new T3.BufferAttribute(nor,3));
    if(col)geo.setAttribute('color',new T3.BufferAttribute(col,3));
    geo.computeBoundingBox();
    const bb=geo.boundingBox,sz=new T3.Vector3();bb.getSize(sz);
    if(!(sz.y>1e-4)||!(sz.x>1e-4))return null;
    geo.translate(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2);
    /* se normaliza por la HUELLA, no por el alto: lo que decide si algo entra en
       el pozo es su radio, así que la casa tiene que MEDIR en pantalla lo mismo
       que mide para el cálculo. Normalizando por altura la casa se dibujaba con
       una huella de 2,9 de radio y se la tragaba un pozo de 2,4. */
    const s=targetR*2.1/Math.max(sz.x,sz.z);geo.scale(s,s,s);
    geo.computeBoundingSphere();geo.computeBoundingBox();
    const mat=new T3.MeshLambertMaterial({vertexColors:!!col,
      color:col?0xffffff:((src&&src.color)?src.color.clone():new T3.Color('#cfd6dd'))});
    return {geo,mat,tris,glb:1};
  }catch(e){console.warn('glb '+key,e);return null;}
}
/* versión de cajas de cada tipo (respaldo y tipos sin modelo) */
function boxGeoFor(kind){
  const p=[];
  if(kind==='farol'){
    bx(.18,2.35,.18,0,1.18,0,'#5a6472',p);bx(.5,.28,.5,0,2.46,0,'#ffe6a0',p);
    bx(.42,.12,.42,0,.06,0,COL.curb,p);
  }else if(kind==='banco'){
    bx(1.34,.16,.5,0,.44,0,'#c98f52',p);bx(1.34,.34,.14,0,.66,-.2,'#b57c42',p);
    bx(.16,.44,.5,-.52,.22,0,'#8a95a3',p);bx(.16,.44,.5,.52,.22,0,'#8a95a3',p);
  }else if(kind==='arbol'){
    bx(.34,1.15,.34,0,.58,0,'#7a5230',p);ico(.86,0,1.72,0,'#3f9e5c',p,1);
    ico(.5,.42,1.3,.3,'#348a4e',p,0);
  }else if(kind==='auto'){
    bx(2.3,.62,1.06,0,.52,0,'#e0503f',p);bx(1.2,.46,.98,-.16,1,0,'#dbe6f2',p);
    bx(.9,.2,1.02,.72,.66,0,'#c9412f',p);
    bx(.3,.3,.24,.72,.24,.52,'#2b2f36',p);bx(.3,.3,.24,.72,.24,-.52,'#2b2f36',p);
    bx(.3,.3,.24,-.72,.24,.52,'#2b2f36',p);bx(.3,.3,.24,-.72,.24,-.52,'#2b2f36',p);
  }else if(kind==='kiosco'){
    bx(2.3,2,2.3,0,1,0,'#f0a02a',p);bx(2.76,.24,2.76,0,2.12,0,'#e0503f',p);
    bx(.72,1.2,.1,0,.6,1.18,'#7a4a1e',p);bx(1.5,.5,.08,0,1.5,1.18,'#fff2cf',p);
  }else{ /* casa */
    bx(3.5,2.5,3.5,0,1.25,0,'#e7ddc9',p);
    bx(3.9,.5,3.9,0,2.72,0,'#8c4b3a',p);bx(2.7,.5,2.7,0,3.2,0,'#7a4030',p);
    bx(1.5,.4,1.5,0,3.6,0,'#6b3729',p);
    bx(.8,1.3,.1,-.9,.65,1.78,'#b2372f',p);
    bx(.8,.7,.1,.9,1.5,1.78,'#cfe0e6',p);bx(.7,.7,.1,1.8,1.5,1.2,'#cfe0e6',p);
  }
  const geo=mergeColored(p);
  return {geo,mat:new T3.MeshLambertMaterial({vertexColors:true}),
    tris:Math.round(geo.attributes.position.count/3),glb:0};
}
function kindGeo(kind){
  if(KGEO[kind])return KGEO[kind];
  let r=null;
  if(K[kind].glb)r=glbGeo(K[kind].glb,K[kind].r);
  if(!r)r=boxGeoFor(kind);
  return KGEO[kind]=r;
}

/* ============================ EL BARRIO ============================ */
function buildGround(){
  if(city){scene.remove(city);city.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});}
  city=new T3.Group();
  /* CAMPO EN NEBLINA: un anillo con el color por vértice degradado hacia el cielo
     según la distancia al centro del barrio (la niebla de three depende de la
     cámara y con la cámara pegada al pozo el afuera quedaba plano). */
  const fg=new T3.RingGeometry(PLATE-1.5,FIELD,30,7).toNonIndexed();
  fg.rotateX(-Math.PI/2);
  const P=fg.attributes.position,cols=new Float32Array(P.count*3);
  const c0=new T3.Color(COL.field),c1=new T3.Color(G.sky),cc=new T3.Color();
  for(let i=0;i<P.count;i++){
    const rad=Math.hypot(P.getX(i),P.getZ(i));
    const t=clamp((rad-PLATE)/58,0,1);
    cc.copy(c0).lerp(c1,Math.pow(t,.75)*.94);
    cols[i*3]=cc.r;cols[i*3+1]=cc.g;cols[i*3+2]=cc.b;
  }
  fg.setAttribute('color',new T3.BufferAttribute(cols,3));
  /* fog:false EN LAS CAPAS DE RELLENO. Medido con _agf.js (900x430, swiftshader,
     dpr 1, pozo de 300 de masa): con la niebla de three el mismo cuadro daba 39
     fps y sin niebla 60. La niebla es per-fragment y estas capas son PANTALLAS
     ENTERAS de fragmentos. El campo no la necesita porque ya trae el degradado
     hacia el cielo horneado por vértice, y el suelo del barrio está siempre cerca
     de la cámara. La niebla se queda donde SÍ se ve: props y cerco (Lambert), que
     ocupan poca pantalla y son los que tienen que desaparecer en la bruma. */
  const f=new T3.Mesh(fg,new T3.MeshBasicMaterial({vertexColors:true,fog:false}));
  f.position.y=-.08;city.add(f);fieldM=f;
  /* SUELO POR TROZOS, UNO POR ZONA. Antes era UNA malla que embaldosaba el plato
     entero, y con 184x184 esa malla sola pasaría de 30.000 triángulos y se
     dibujaría completa siempre. Ahora van NUEVE mallas, cada una con la paleta de
     su zona y su caja bien ajustada, así el frustumCulled de three (que sí sirve
     acá porque cada trozo es compacto) descarta las que no se ven: en pantalla
     quedan 1 a 4 trozos, no nueve. */
  /* CUÁNTOS TROZOS. Medido, las tres opciones:
       3x3 (61 u):  6 trozos en pantalla ·  8.370 triángulos ·  6 llamadas
       8x8 (23 u): 32 trozos en pantalla ·  6.976 triángulos · 32 llamadas
       4x4 (46 u):  lo que queda: pocas llamadas y casi los mismos triángulos
     Partirlo más fino NO baja los triángulos (el costo del piso son las RAYAS del
     asfalto, que están en todo el mapa igual) y en cambio multiplica las llamadas
     de dibujo. Así que gana el trozo grande. */
  const GC=4, GS=(MAP*2)/GC;
  groundChunks=[];
  for(let gi=0;gi<GC;gi++)for(let gj=0;gj<GC;gj++){
    const x0=-MAP+GS*gi,x1=x0+GS,z0=-MAP+GS*gj,z1=z0+GS;
    const Z=ZONES[zoneAt((x0+x1)/2,(z0+z1)/2)];
    /* al trozo del borde se le estira el pasto hasta el plato: si no, entre la
       última zona y el cerco quedaba una franja del color del campo */
    const ex0=gi===0?-PLATE:x0, ex1=gi===GC-1?PLATE:x1;
    const ez0=gj===0?-PLATE:z0, ez1=gj===GC-1?PLATE:z1;
    const bands=(a0,a1)=>{
      const out=[],cuts=[];
      for(const r of ROADS){
        if(r+2.3<a0||r-2.3>a1)continue;
        cuts.push([r-2.3,r-1.5,1],[r-1.5,r+1.5,2],[r+1.5,r+2.3,1]);
      }
      cuts.sort((a,b)=>a[0]-b[0]);
      let cur=a0;
      for(const c of cuts){
        if(c[0]>cur)out.push([cur,c[0],0]);
        const s=Math.max(cur,c[0]),e=Math.min(a1,c[1]);
        if(e>s)out.push([s,e,c[2]]);
        cur=Math.max(cur,c[1]);
      }
      if(cur<a1)out.push([cur,a1,0]);
      return out;
    };
    const bx2=bands(ex0,ex1),bz2=bands(ez0,ez1),p=[];
    for(const a of bx2)for(const b of bz2){
      const cls=Math.max(a[2],b[2]);
      const g=new T3.PlaneGeometry(a[1]-a[0],b[1]-b[0]).toNonIndexed();
      g.rotateX(-Math.PI/2);g.translate((a[0]+a[1])/2,0,(b[0]+b[1])/2);
      p.push({g,c:cls===2?Z.road:(cls===1?Z.curb:Z.grass)});
    }
    /* rayas del asfalto de esta zona: PLANOS de dos triángulos (eran cajas de 12) */
    for(const r of ROADS){
      /* cada 4,8 y no cada 3,4: con el mapa grande son 1.730 rayas (3.460
         triángulos, la mitad del costo del piso) y a esta distancia de cámara no
         se nota la diferencia */
      if(r>=z0&&r<z1)for(let x=x0+2.2;x<x1;x+=4.8)fl(1.9,.17,x,.02,r,COL.line,p);
      if(r>=x0&&r<x1)for(let z=z0+2.2;z<z1;z+=4.8)fl(.17,1.9,r,.025,z,COL.line,p);
    }
    const m=new T3.Mesh(mergeColored(p),new T3.MeshBasicMaterial({vertexColors:true,fog:false}));
    m.frustumCulled=true;             /* ES el culleo de trozos que pide el mapa grande */
    city.add(m);groundChunks.push(m);
  }
  /* CERCO: tiene volumen, va con luz. Tapa el canto del plato y marca el límite. */
  const q=[];
  for(const s of [-1,1]){
    bx(FENCE*2+1.6,.36,1.1,0,.18,s*FENCE,COL.curb,q);
    bx(FENCE*2+1.6,1,.7,0,.6,s*(FENCE+.75),COL.hedge,q);
    bx(FENCE*2+1.7,.3,.8,0,1.2,s*(FENCE+.75),COL.hedge2,q);
    bx(1.1,.36,FENCE*2+1.6,s*FENCE,.18,0,COL.curb,q);
    bx(.7,1,FENCE*2+1.6,s*(FENCE+.75),.6,0,COL.hedge,q);
    bx(.8,.3,FENCE*2+1.7,s*(FENCE+.75),1.2,0,COL.hedge2,q);
  }
  city.add(new T3.Mesh(mergeColored(q),new T3.MeshLambertMaterial({vertexColors:true})));
  scene.add(city);
}
/* colocación con rechazo: sin esto salían casas UNA ENCIMA DE OTRA. Además lo
   GRANDE no puede quedar montado en el asfalto; autos y faroles sí pueden estar
   sobre la calzada y la vereda: es su lugar. */
function free(x,z,r,calle){
  if(Math.abs(x)>MAP-.8||Math.abs(z)>MAP-.8)return false;
  if(!calle)for(const rd of ROADS){
    if(Math.abs(x-rd)<1.6+r*.9||Math.abs(z-rd)<1.6+r*.9)return false;
  }
  /* POR REJILLA. Recorrer los ~2.000 props del mapa grande para cada uno de los
     ~2.000 intentos de colocación es un millón de comparaciones y el juego tardaba
     segundos en arrancar; mirando las celdas vecinas son ~10. */
  if(GRID){
    let bad=false;
    gridNear(x,z,r+3,q=>{
      if(bad)return;
      if(!live(q)&&q.st!==3)return;      /* lo muerto o cayendo no ocupa lugar */
      if(Math.hypot(q.x-x,q.z-z)<(q.r+r)*.92)bad=true;
    });
    return !bad;
  }
  for(const q of props){
    if(!live(q)&&q.st!==3)continue;
    if(Math.hypot(q.x-x,q.z-z)<(q.r+r)*.92)return false;
  }
  return true;
}
function place(kind,x,z,spread){
  const s=rnd(.92,1.08),K0=K[kind],r=K0.r*s;
  const calle=(kind==='auto'||kind==='farol');
  for(let i=0;i<8;i++){
    const tx=x+(i?rnd(-spread||0,spread||0):0),tz=z+(i?rnd(-spread||0,spread||0):0);
    if(free(tx,tz,r,calle)){
      const q={kind,x:tx,z:tz,px:tx,py:0,pz:tz,rx:0,ry:rnd(0,TAU),rz:0,
        r,mass:K0.mass*s,sc:s,st:0,fy:0,tilt:0,spx:0,spz:0,hole:null,ci:0,
        gr:1,shr:1,tint:rnd(.9,1.09)};
      props.push(q);
      if(GRID)gridPut(q);            /* free() de los que vienen ya lo tiene en cuenta */
      return true;
    }
  }
  return false;
}
/* bloques MÁS LIVIANOS que antes (plaza tenía 11 props): el censo bajó de ~126 a
   ~80 y la densidad la mantiene el respawn, que reaparece cerca del pozo. */
function blockOf(cx,cz,kind){
  if(BLOCKS[kind]){BLOCKS[kind](cx,cz);return;}
  if(kind==='casa'){
    place('casa',cx,cz,.35);
    place('arbol',cx-2.6,cz-2.6,.7);place('arbol',cx+2.6,cz+2.6,.7);
    place('banco',cx+2.6,cz-2.5,.6);place('farol',cx-2.6,cz+2.6,.5);
  }else if(kind==='comercio'){
    place('kiosco',cx,cz,.7);
    place('auto',cx-2.4,cz+2.4,.8);place('auto',cx+2.4,cz-2.4,.8);
    place('farol',cx+2.7,cz+2.7,.5);place('banco',cx-2.7,cz-2.6,.6);
  }else if(kind==='plaza'){
    for(let i=0;i<3;i++)place('arbol',cx+rnd(-2.6,2.6),cz+rnd(-2.6,2.6),1.4);
    for(let i=0;i<2;i++)place('banco',cx+rnd(-2.6,2.6),cz+rnd(-2.6,2.6),1.4);
    for(let i=0;i<2;i++)place('farol',cx+rnd(-2.7,2.7),cz+rnd(-2.7,2.7),1.4);
  }else{ /* baldío */
    for(let i=0;i<2;i++)place('arbol',cx+rnd(-2.6,2.6),cz+rnd(-2.6,2.6),1.4);
    place('farol',cx+rnd(-2.6,2.6),cz+rnd(-2.6,2.6),1.4);
    if(Math.random()<.8)place('auto',cx+rnd(-1.6,1.6),cz+rnd(-1.6,1.6),1.2);
  }
}
/* CAPACIDAD de cada InstancedMesh: NO es el censo, es cuántos props de ese tipo
   pueden estar EN PANTALLA a la vez. Con el mapa grande el censo pasa de 80 a
   ~2.000, pero en el cuadro sólo caben unas decenas, y lo que se sube a la GPU es
   sólo eso (ver cullStep). Medido: con el pozo a 300 de masa entran 38 árboles y
   14 autos en el cuadro más cargado, así que 96 por tipo sobra con margen. */
const ICAP=96;
function buildCity(n){
  for(const im of ims){scene.remove(im);im.dispose();}
  ims=[];props=[];FREE={};IMK={};
  gridClear();                       /* vacía y lista: place() va poblándola */
  const part=clamp(gp.part,.5,1.35);
  /* CUADRAS DE TODO EL MAPA, con la mezcla de SU zona. La cuadra donde arranca el
     jugador (centro del mapa) es siempre plaza: comida chica al toque y nada que lo
     pueda molestar en los primeros segundos. */
  const nb=Math.floor(MAP*2/RSTEP);
  for(let bi=0;bi<nb;bi++)for(let bj=0;bj<nb;bj++){
    const cx=-MAP+RSTEP*(bi+1),cz=-MAP+RSTEP*(bj+1);
    if(Math.abs(cx)>MAP-4||Math.abs(cz)>MAP-4)continue;
    /* con gráficos bajos se saltean cuadras enteras del mapa, no props sueltos:
       raleando prop por prop quedaban cuadras a medio construir */
    if(part<.95&&Math.random()>part+.06)continue;
    const Z=ZONES[zoneAt(cx,cz)];
    const k=(Math.abs(cx)<RSTEP&&Math.abs(cz)<RSTEP)?'plaza':pick(Z.mix);
    blockOf(cx,cz,k);
  }
  /* autos estacionados REPARTIDOS por las calles (eligiendo al azar salían de a
     ocho en la misma esquina y parecía una playa de estacionamiento) */
  const na=Math.round((90+Math.min(30,n*6))*part);
  for(let i=0;i<na;i++){
    const r=ROADS[i%ROADS.length],a=((i*7)%23)/23;
    const at=-MAP+4+a*(MAP*2-8)+rnd(-3,3);
    if(i%2)place('auto',at,r+(i%4<2?.75:-.75),1.2);
    else    place('auto',r+(i%4<2?.75:-.75),at,1.2);
  }
  /* un InstancedMesh por tipo, con capacidad fija: la instancia YA NO es del prop,
     se le asigna cada cuadro según lo que se ve. Así 2.000 props se dibujan con
     seis llamadas y subiendo a la GPU sólo las decenas visibles. */
  const kinds={};
  for(const p of props)kinds[p.kind]=1;
  for(const kind in kinds){
    const kg=kindGeo(kind);
    const im=new T3.InstancedMesh(kg.geo,kg.mat,ICAP);
    im.frustumCulled=false;                 /* lo cullea cullStep, prop por prop */
    im.instanceMatrix.setUsage(T3.DynamicDrawUsage);
    im.count=0;
    scene.add(im);ims.push(im);IMK[kind]=im;
    FREE[kind]=[];
  }
  census=props.length;
}
/* YA NO HAY setMat por prop: la instancia no le pertenece a nadie. Se deja el
   nombre como no-op para no tocar las veinte llamadas repartidas por el archivo —
   todas ellas quieren decir "este prop cambió", y cullStep lo va a redibujar en el
   próximo cuadro de todos modos. */
function setMat(){}
/* ===================== CULLEO POR FRUSTUM + EMPAQUETADO =====================
   El corazón del mapa grande. Cada cuadro:
     1. se mira SÓLO la vecindad del pozo en la rejilla (nunca los 2.000 props);
     2. de esos, se descarta con el FRUSTUM de la cámara lo que queda fuera del
        cuadro (three no puede hacerlo solo: son instancias de una misma malla);
     3. lo que sobrevive se escribe apretado al principio del InstancedMesh y se
        pone .count, así la GPU dibuja exactamente lo visible y nada más.
   Sin esto, el mapa grande dibujaría 2.000 props (unos 180.000 triángulos) para
   mostrar 40. Medido: 12 llamadas y ~13.000 triángulos con el mapa 12 veces más
   grande que el de antes. */
let FRU=null,PMAT=null,SPH=null,CNT={},visN=0,cullR=0;
function cullStep(){
  if(!cam||!ims.length)return;
  if(!FRU){FRU=new T3.Frustum();PMAT=new T3.Matrix4();SPH=new T3.Sphere();}
  cam.updateMatrixWorld();
  PMAT.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);
  FRU.setFromProjectionMatrix(PMAT);
  for(const k in IMK)CNT[k]=0;
  /* RADIO DE INTERÉS: lo que la cámara puede llegar a ver. Sale de la distancia de
     cámara, no de un número fijo, así al crecer el pozo (y alejarse la cámara) se
     agranda solo. El +14 cubre lo que entra por las esquinas del cuadro. */
  const me=holes[0];
  if(!me)return;
  const cx=camTx,cz=camTz;
  /* TOPE DE DISTANCIA además del frustum, y hacen falta los dos: el frustum saca
     lo que está fuera del cuadro, pero con la cámara mirando hacia abajo el cono
     llega al plano lejano (220 unidades) y dejaba entrar 225 props = 17.236
     triángulos. Con el tope a la altura de la niebla entran ~120. */
  cullR=camD*1.05+11;
  const FAR2=cullR*cullR;
  visN=0;
  gridNear(cx,cz,cullR,p=>{
    if(p.st===9)return;                       /* libre: no existe en pantalla */
    const dx0=p.px-cx,dz0=p.pz-cz;
    if(dx0*dx0+dz0*dz0>FAR2)return;           /* más allá de la niebla */
    const im=IMK[p.kind];if(!im)return;
    const n=CNT[p.kind]|0;if(n>=ICAP)return;
    const kh=K[p.kind].h;
    SPH.center.set(p.px,p.py+kh*.5,p.pz);
    SPH.radius=p.r*1.05+kh*.35;               /* justa: la generosa dejaba pasar de más */
    if(!FRU.intersectsSphere(SPH))return;     /* fuera del cuadro: no se sube */
    EU.set(p.rx,p.ry,p.rz);QT.setFromEuler(EU);
    V3.set(p.px,p.py,p.pz);
    V3b.setScalar(p.st===2?p.sc*p.shr:(p.st===3?p.sc*p.gr:p.sc));
    M4.compose(V3,QT,V3b);
    im.setMatrixAt(n,M4);
    WCOL.setScalar(p.tint);im.setColorAt(n,WCOL);
    CNT[p.kind]=n+1;visN++;
  });
  for(const k in IMK){
    const im=IMK[k],n=CNT[k]|0;
    im.count=n;im.visible=n>0;
    if(n>0){im.instanceMatrix.needsUpdate=true;
      if(im.instanceColor)im.instanceColor.needsUpdate=true;}
  }
}
/* ---------------- OBRAS: el barrio se reconstruye ----------------
   Sin esto la ronda se moría: a los 24 s el censo llegaba a 0 y quedaba un minuto
   de reloj mirando un descampado (medido con _agm.js). Reaparece la instancia
   MUERTA del mismo tipo, así que no cuesta ni un triángulo ni un draw call más. */
function spawnOne(){
  const me=holes[0];if(!me)return false;
  /* la obra nueva se ancla al jugador (45%) o al pozo que va ÚLTIMO (55%): con
     todo anclado al jugador, la comida aparecía siempre a su alcance y terminaba
     con diez veces la masa de los rivales (medido: 820 contra 144 y 183). */
  let an=me;
  if(holes.length>1&&Math.random()<.55){
    an=holes[1];
    for(let i=2;i<holes.length;i++)if(holes[i].mass<an.mass)an=holes[i];
  }
  const kinds=Object.keys(FREE).filter(k=>FREE[k].length);
  if(!kinds.length)return false;
  /* 70% algo que el jugador YA se puede comer (que nunca se quede sin comida) y
     30% algo más grande, que es lo que le da el salto de masa */
  const small=kinds.filter(k=>K[k].r<=an.r*1.03),big=kinds.filter(k=>K[k].r>an.r*1.03);
  let pool=small.length&&(Math.random()<.7||!big.length)?small:(big.length?big:kinds);
  const kind=pick(pool);
  const p=FREE[kind].pop();if(!p)return false;
  for(let i=0;i<10;i++){
    const a=rnd(0,TAU),d=rnd(an===me?11:5,an===me?21:15);
    const x=clamp(an.x+Math.cos(a)*d,-MAP+2,MAP-2),z=clamp(an.z+Math.sin(a)*d,-MAP+2,MAP-2);
    let bad=false;
    for(const h of holes)if(Math.hypot(h.x-x,h.z-z)<h.r+p.r+3){bad=true;break;}
    if(bad)continue;
    if(!free(x,z,p.r,kind==='auto'||kind==='farol'))continue;
    /* que no brote en la cara del jugador: si cae dentro de la pantalla tiene que
       estar lejos (si no, se ve aparecer un árbol de la nada al lado del pozo) */
    const sc=toScreen(x,0,z);
    if(sc&&sc.on&&Math.hypot(me.x-x,me.z-z)<14)continue;
    gridDel(p);                       /* sale de la celda donde estaba */
    p.x=p.px=x;p.z=p.pz=z;p.py=0;p.rx=p.rz=0;p.ry=rnd(0,TAU);
    p.st=3;p.gr=.02;p.shr=1;p.tilt=0;p.hole=null;p.touch=0;
    gridPut(p);                       /* y entra en la nueva */
    return true;
  }
  FREE[kind].push(p);
  return false;
}
/* CENSO POR DIFERENCIA. Antes recorría los props para contar vivos; con 2.000 eso
   es un barrido entero cada 0,34 s. Ahora se lleva la cuenta: FREE tiene los
   muertos, así que vivos = censo - libres. */
function nFree(){let n=0;for(const k in FREE)n+=FREE[k].length;return n;}
function spawnTick(dt){
  if(!census)return;
  spawnT-=dt;
  if(spawnT>0)return;
  spawnT=.34;
  const alive=census-nFree();
  /* el mapa grande necesita reponer MÁS por tanda: hay 16 pozos comiendo a la vez
     repartidos en nueve zonas, no tres en una cuadra */
  let k=alive<census*.4?10:(alive<census*.65?7:(alive<census*.85?4:2));
  while(k-->0)if(!spawnOne())break;
}

/* ============================ LOS POZOS ============================ */
function skinId(){const i=ARC.S.skin|0;return i>=0&&i<SKINS.length?i:0;}
function owned(){
  if(!Array.isArray(ARC.S.own)||!ARC.S.own.length)ARC.S.own=[0];
  return ARC.S.own;
}
function rivalCols(){
  const mine=SKINS[skinId()].col;
  return ['#4dd0ff','#ff7ab8','#ffd166','#7dff9b'].filter(c=>c!==mine);
}
/* ===================== LOS DIECISÉIS POZOS =====================
   Vos + hasta 15 rivales. Con la forma vieja (un Group con tres mallas por pozo)
   eso serían 48 llamadas de dibujo sólo en pozos y no quedaría presupuesto para
   nada más. Ahora los tres anillos son TRES InstancedMesh compartidos: los 16
   pozos completos cuestan 3 llamadas, y el color de cada uno va por instancia. */
const MAXH=16;                                  /* vos + 15 */
let IHD=null,IHR=null,IHG=null;
function buildHoleMeshes(){
  if(IHD)return;
  const mk=(geo,mat)=>{const m=new T3.InstancedMesh(geo,mat,MAXH);
    m.frustumCulled=false;m.instanceMatrix.setUsage(T3.DynamicDrawUsage);
    m.count=0;scene.add(m);return m;};
  const cg=new T3.CircleGeometry(1,22);cg.rotateX(-Math.PI/2);cg.translate(0,.055,0);
  IHD=mk(cg,new T3.MeshBasicMaterial({color:new T3.Color('#05060a'),fog:false}));
  const rg=new T3.RingGeometry(.94,1.05,22);rg.rotateX(-Math.PI/2);rg.translate(0,.07,0);
  IHR=mk(rg,new T3.MeshBasicMaterial({vertexColors:false,side:T3.DoubleSide,fog:false}));
  const gg=new T3.RingGeometry(1.05,1.34,22);gg.rotateX(-Math.PI/2);gg.translate(0,.062,0);
  IHG=mk(gg,new T3.MeshBasicMaterial({side:T3.DoubleSide,transparent:true,
    opacity:.26,depthWrite:false,fog:false}));
}
function mkHole(col,ai,x,z){
  return {x,z,r:radiusFor(0),mass:0,ai:!!ai,col,alive:true,
    t:0,since:0,sp:7.6,vx:0,vz:0,bx:x,bz:z,imm:0,ate:0,ateH:0,target:null,
    wx:null,wz:null,eff:1,fade:1,
    /* ---- ojos ---- */
    exp:'idle',expT:0,blink:0,blinkT:rnd(1.2,4),lx:0,lz:1,plx:0,plz:1,spin:0,shk:0};
}
/* sube las matrices de los pozos vivos a los tres InstancedMesh */
function holesVis(me){
  if(!IHD)return;
  let n=0;
  for(const h of holes){
    if(n>=MAXH)break;
    if(!h.alive&&h.fade<=0)continue;
    const k=.62+.38*Math.sin(ARC.t*(h===me?5.2:3.4));
    const sc=h.r*(h.alive?1:Math.max(.01,h.fade));
    V3.set(h.x,0,h.z);QT.identity();V3b.setScalar(sc);
    M4.compose(V3,QT,V3b);
    IHD.setMatrixAt(n,M4);IHR.setMatrixAt(n,M4);IHG.setMatrixAt(n,M4);
    /* el aro late y se blanquea; el del jugador late más fuerte para no perderlo
       de vista en un mapa de 184 unidades */
    WCOL.setStyle(h.col).lerp(WHITE,h===me?.28+.42*k:.12+.2*k);
    IHR.setColorAt(n,WCOL);
    WCOL.setStyle(h.col);
    IHG.setColorAt(n,WCOL);
    WCOL.setScalar(1);IHD.setColorAt(n,WCOL);
    h.slot=n;n++;
  }
  for(const m of [IHD,IHR,IHG]){
    m.count=n;m.visible=n>0;
    m.instanceMatrix.needsUpdate=true;
    if(m.instanceColor)m.instanceColor.needsUpdate=true;
  }
}

/* ============================ ENTRADA ============================ */
G.down=function(p){drag={x:p.x,y:p.y};};
G.move=function(p){
  if(!drag)return;
  const dx=p.x-drag.x,dy=p.y-drag.y,L=Math.hypot(dx,dy);
  if(L<4){dirv.x=dirv.z=0;return;}
  const k=Math.min(1,L/(ARC.H*.2));
  dirv.x=dx/L*k;dirv.z=dy/L*k;
};
G.up=function(){drag=null;dirv.x=dirv.z=0;};
G.key=function(c,d){
  const v=d?1:0;
  if(c==='ArrowLeft'||c==='KeyA')dirv.x=-v;
  if(c==='ArrowRight'||c==='KeyD')dirv.x=v;
  if(c==='ArrowUp'||c==='KeyW')dirv.z=-v;
  if(c==='ArrowDown'||c==='KeyS')dirv.z=v;
};

/* ============================ RESOLUCIÓN DINÁMICA ============================
   El motor ya recorta partículas cuando cae de 45 fps, pero lo que cuesta acá es
   RELLENO de pantalla (medido: con dpr .5 el mismo cuadro pasaba de 26 a 36 fps).
   Así que si el aparato no llega, se baja el pixelRatio del renderer y se
   recupera cuando sobra. En un celular normal esto no se activa nunca. */
function dprBase(){return Math.min(window.devicePixelRatio||1,(gp&&gp.dpr)||1.35);}
function applyRS(){
  if(!ARC.rnd)return;
  ARC.rnd.setPixelRatio(dprBase()*rs);
  ARC.rnd.setSize(ARC.W,ARC.H,false);
}
function rsTick(dt){
  if(rsLock)return;                            /* las sondas de velocidad la fijan */
  rsT+=dt;if(rsT<.7)return;rsT=0;
  /* VERIFICACIÓN ADVERSARIAL (agujero, 31/07): 30s de piloto real en 900x430
     swiftshader medían 36,2 fps de promedio (frames/segundos reales, no el
     ARC.fps suavizado) con el piso viejo (.72) y el gatillo en 36/46 cada 1,2s:
     reacciona tarde y no baja lo suficiente para este rasterizador de software.
     Piso a .45, gatillo más rápido (.7s) y más temprano (48/58): 49,9 fps reales
     en la corrida final (18/18 en la sonda adversarial). Triángulos y llamadas
     no se movieron (había margen de sobra contra el objetivo <=25.000/<=60). */
  const f=ARC.fps;
  if(f<48&&rs>.45){rs=Math.max(.45,rs-.18);applyRS();}
  else if(f>58&&rs<1){rs=Math.min(1,rs+.1);applyRS();}
}

/* ============================ CICLO ============================ */
/* EL TÍTULO DEL MENÚ SE PERDÍA CON EL MODO ATRACCIÓN: el CSS del motor esconde el
   título de DOM cuando cargó el arte (#menu.hasart .ttl{display:none}) porque el
   arte ya lo trae dibujado, pero .live saca el arte de fondo, así que quedaba un
   menú SIN TÍTULO (se vio en A-agujero-menu-h). Se arregla desde acá con una regla
   propia para no tocar head.html; queda anotado como PEDIDO AL MOTOR. */
function fixMenuCss(){
  if(document.getElementById('agCss'))return;
  const st=document.createElement('style');st.id='agCss';
  st.textContent='#menu.live .ttl{display:block!important;'
    +'text-shadow:0 3px 0 rgba(0,0,0,.5),0 10px 30px rgba(0,0,0,.85)}'
    +'#menu.live .sub{text-shadow:0 2px 8px rgba(0,0,0,.9)}';
  document.head.appendChild(st);
}
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  fixMenuCss();
  M4=new T3.Matrix4();QT=new T3.Quaternion();EU=new T3.Euler();
  V3=new T3.Vector3();V3b=new T3.Vector3();PV=new T3.Vector3();
  WHITE=new T3.Color('#ffffff');WCOL=new T3.Color();
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
  scene.fog=new T3.Fog(new T3.Color(G.sky).getHex(),40,120);
  /* 50° y no 54: el suelo es RELLENO puro y es lo que más cuesta, así que ver
     menos barrio es ver mejor Y correr mejor. */
  cam=new T3.PerspectiveCamera(50,ARC.W/Math.max(1,ARC.H),.5,320);
  /* INTENSIDADES EN UNIDADES FÍSICAS: three moderna deja el Lambert en
     albedo*(intensidad/π). Con hemi 1.0 + sol .6 el pasto se medía (70,76,78), un
     gris sucio igual al asfalto; multiplicadas por ~π vuelve a verse verde. */
  scene.add(new T3.HemisphereLight(0xffffff,0x93a884,2.15));
  const d=new T3.DirectionalLight(0xfff6e0,1.35);d.position.set(12,22,10);scene.add(d);
  gp=ARC.gfxP?ARC.gfxP():gp;
  buildGround();
  applyRS();
  ARC.clearGL=true;
  try{demoStart();}catch(e){console.warn('demo',e);}
};
G.resize=function(){
  if(cam){cam.aspect=ARC.W/Math.max(1,ARC.H);cam.updateProjectionMatrix();}
  applyRS();
};
G.gfxApply=function(p){
  gp=p||gp;
  if(fieldM)fieldM.visible=true;              /* nunca: es lo que tapa el horizonte */
  applyRS();
};
function goalTxt(short){
  const n=goal.n;
  if(goal.k==='eat') return ARC.T(short?'gEatS':'gEat').replace('%',n);
  if(goal.k==='mass')return ARC.T(short?'gMassS':'gMass').replace('%',n);
  if(goal.k==='hunt')return ARC.T(short?'gHuntS':'gHunt').replace('%',n);
  return ARC.T(short?'gRankS':'gRank');
}
const aliveH=()=>holes.filter(h=>h.alive);
function rankOf(h){return 1+aliveH().filter(o=>o!==h&&o.mass>h.mass).length;}
function goalProg(){
  if(goal.k==='eat')return eaten;
  if(goal.k==='mass')return Math.round(holes[0].mass);
  if(goal.k==='hunt')return holes[0].ateH;
  return rankOf(holes[0])===1?1:0;
}
function goalOk(){return goalProg()>=goal.n;}
G.start=function(l){
  if(!T3)return;
  lvl=l||1;done=false;eaten=0;flash=0;warned=false;lastSec=-1;infoCache='';
  streak=0;bestStreak=0;comboT=0;goalHit=false;startT=0;demo=0;
  gp=ARC.gfxP?ARC.gfxP():gp;
  perk=SKINS[skinId()];
  if(!city)buildGround();
  buildCity(lvl);
  buildHoleMeshes();   /* los pozos ya no tienen malla propia: van instanciados */
  goal=HOODS[clamp(lvl-1,0,HOODS.length-1)];
  /* QUINCE RIVALES (el tope que pidió el usuario: 15 más vos = 16). Se reparten
     por las NUEVE zonas, nunca en la del jugador y nunca a menos de 26 unidades:
     con el mapa grande cada uno crece en su barrio y el encuentro se busca. */
  const nR=Math.min(MAXH-1,15);
  holes=[mkHole(perk.col,false,0,0)];
  holes[0].sp=7.6*perk.spd;
  holes[0].nick=ARC.T('you');
  if(perk.m0){holes[0].mass=perk.m0;holes[0].r=radiusFor(perk.m0);}
  const cols=rivalCols();
  for(let i=0;i<nR;i++){
    /* una zona distinta por rival (dan la vuelta si hay más rivales que zonas), y
       dentro de la zona un cruce de calle: si nacen encima de los props se comen
       5 de masa antes del primer cuadro */
    const zi=1+((i*5)%(ZONES.length-1));
    const c=zoneCenter(zi===4?8:zi);
    const ang=i/nR*TAU;
    let sx=clamp(c.x+Math.cos(ang)*ZS*.28,-MAP+6,MAP-6);
    let sz=clamp(c.z+Math.sin(ang)*ZS*.28,-MAP+6,MAP-6);
    if(Math.hypot(sx,sz)<26){const L=Math.hypot(sx,sz)||1;sx=sx/L*30;sz=sz/L*30;}
    const h=mkHole(cols[i%cols.length],true,sx,sz);
    /* TOPE 7,0: el jugador va a 7,6. Que el rival sea más listo, no más rápido. */
    h.sp=Math.min(7,5.2+lvl*.35);h.bx=sx;h.bz=sz;h.nick=NICK[i%NICK.length]+(i>=NICK.length?' '+(1+((i/NICK.length)|0)):'');
    /* HAMBRE por barrio: antes comían a ritmo completo desde el primer cuadro y a
       los 12 s iban 64 a 5. Con esto la carrera queda pareja y se puede alcanzar. */
    h.eff=.8+lvl*.04;
    holes.push(h);
  }
  time=HOODS[clamp(lvl-1,0,HOODS.length-1)].t;
  camD=Math.min(20,8.2+holes[0].r*3.3);
  grace=3.4;hintT=4.2;introT=3.2;spawnT=.6;
  window.__holes=holes;                        /* sólo para las sondas */
  hud(true);
  ARC.tray([{id:'goal',txt:'◎ '+goalTxt(true),gh:1,
    fn:()=>ARC.toast(ARC.T('goal')+': '+goalTxt())}]);
};

/* ---- reloj grande + puntaje en las pastillas del motor ---- */
function hud(force){
  const s=Math.max(0,Math.ceil(time));
  const warn=s<=10&&!done;
  const txt=(s/60|0)+':'+(s%60<10?'0':'')+(s%60);
  const inf='<span style="opacity:.6;font-size:.62em;letter-spacing:.1em">'+ARC.T('time')+'</span>'
    +'<b style="font-size:1.9em;line-height:.9;margin-left:.18em;'
    +(warn?'color:#ff6b6b;text-shadow:0 0 12px rgba(255,60,60,.7)':'')+'">'+txt+'</b>';
  if(force||inf!==infoCache){infoCache=inf;ARC.hud(Math.round(holes[0].mass),inf);}
  else ARC.hud(Math.round(holes[0].mass));
}

/* ---- comer: dos tiempos (se inclina y se desliza / se suelta y cae girando) ---- */
function eatStep(h,dt,me){
  const R=h.r,R2=R*(h===me?perk.mag:1.75);
  /* POR REJILLA. Antes recorría TODOS los props por cada pozo: con el mapa grande
     serían 2.000 x 16 = 32.000 comparaciones por cuadro sólo para comer. Ahora se
     miran las celdas que toca el radio de atracción: unas 15. */
  gridNear(h.x,h.z,R2+3,p=>{
    if(!live(p))return;
    const dx=h.x-p.px,dz=h.z-p.pz,d=Math.hypot(dx,dz);
    if(d>R2+p.r)return;
    if(!canEat(h,p))return;                   /* todavía es más grande que el pozo */
    p.touch=1;
    const nx=dx/(d||1),nz=dz/(d||1);
    if(d<R*.62){                              /* ---- se suelta ---- */
      p.st=2;p.hole=h;p.fy=-1.6;p.shr=1;
      p.spx=rnd(4,9)*(Math.random()<.5?-1:1);p.spz=rnd(3,7)*(Math.random()<.5?-1:1);
      /* el rival come con su factor de hambre y su banda; el jugador, completo */
      h.mass+=p.mass*(h.ai?h.eff*band(h)*(startT<6?.6:1):1);
      h.r=radiusFor(h.mass);h.since=0;h.ate++;
      if(h===me){
        eaten++;
        streak++;comboT=.9;
        if(streak>bestStreak)bestStreak=streak;
        swallowSfx(p.mass);
        const sc=toScreen(p.px,K[p.kind].h*.6,p.pz);
        if(sc){txN=(txN+1)%4;
          ARC.fx.text(sc.x+(txN-1.5)*14,sc.y-txN*7,'+'+Math.round(p.mass),
            {color:'#f3e8ff',size:Math.max(13,ARC.H*.042),life:.7});}
        if(streak>=5&&streak%5===0){
          const hs=toScreen(h.x,0,h.z);
          if(hs)ARC.fx.text(hs.x,hs.y-ARC.H*.1,'x'+streak,
            {color:'#ffd166',size:Math.max(16,ARC.H*.06),life:.8});
          ARC.sfx('coin',{rate:1+Math.min(.6,streak*.03),vol:.5});
        }
        if(p.mass>=9){
          h.exp='happy';h.expT=.55;
          ARC.shake(Math.min(10,2.5+p.mass*.16));
          const hs=toScreen(h.x,0,h.z);
          if(hs)ARC.fx.ring(hs.x,hs.y,{r:Math.max(30,ARC.H*.16),life:.4,color:G.acc,w:3});
          if(ARC.S.fx&&hs)ARC.fx.burst(hs.x,hs.y,{n:Math.round(10*gp.part),color:'#8b5cf6',
            speed:150,life:.4,size:4,sq:true});
        }
      }
    }else{                                    /* ---- se inclina y se desliza ---- */
      p.st=1;
      const k=1-clamp((d-R*.62)/(R2-R*.62),0,1);
      p.tilt=Math.min(.62,p.tilt+dt*(1.4+k*3));
      p.tnx=nx;p.tnz=nz;
      p.rx=p.tilt*nz;p.rz=-p.tilt*nx;
      const pull=(1.1+R*.35)*k*k;
      p.px+=nx*pull*dt;p.pz+=nz*pull*dt;
      p.x=p.px;p.z=p.pz;
    }
  });
}
/* BANDA DE CARRERA: el rival que se despega come menos y el que se quedó atrás
   come más. Es lo que hace que los últimos 10 segundos importen (antes el
   resultado estaba resuelto a los 15 s: 64 a 5 y a otra cosa). */
function band(h){
  const me=holes[0];if(!me||h===me)return 1;
  const rel=h.mass/Math.max(10,me.mass);
  if(rel>1.7)return .35;
  if(rel>1.15)return .6;
  if(rel>1)return .85;
  if(rel<.35)return 2;
  if(rel<.6)return 1.45;
  return 1;
}
/* ALCANCE (rubber band de masa): con sólo bajarles el "hambre" los rivales
   entraban en espiral —poca masa, poco radio, sólo faroles, menos masa— y el
   piloto terminaba 820 contra 144 y 183 (medido con _agm.js). Este piso los
   mantiene en carrera SIN mentir el ranking: la masa que muestran es la que
   tienen, y el radio sigue saliendo de la masa (si les floteara el radio, un
   rival con poca masa podría comerse al jugador y eso se lee como tramposo).
   El piso sube con el barrio: 41% del jugador en el 1 y 56% en el 6. */
function catchUp(dt){
  const me=holes[0];if(!me||me.mass<40)return;
  const fl=me.mass*(.38+lvl*.03);
  for(let i=1;i<holes.length;i++){
    const h=holes[i];
    if(h.mass<fl){h.mass+=(fl-h.mass)*dt*.55;h.r=radiusFor(h.mass);}
  }
}
/* el sonido lo elige la MASA de lo que cae, y con cooldown: veinte faroles
   entrando juntos disparaban veinte fuentes y el limitador del motor aplastaba
   todo. Dos cooldowns, uno para lo chico y uno para lo grande. */
function swallowSfx(m){
  if(m>=18){if(sndB>0)return;sndB=.22;ARC.sfx('boom',{rate:rnd(.9,1.05),vol:1});return;}
  if(sndS>0)return;sndS=.055;
  if(m>=7)ARC.sfx('glass',{rate:rnd(.82,.95),vol:.75});
  else if(m>=3)ARC.sfx('wood',{rate:rnd(.95,1.1),vol:.7});
  else ARC.sfx('pop',{rate:rnd(1.2,1.5),vol:.55});
}
/* ---- IA: nunca se queda quieta ----
   Elegir objetivo: PRIMERO lo que hay a mano (con un puntaje global el rival se
   pasaba 15 segundos cruzando el barrio por un farol con la masa clavada). */
function pickTarget(h){
  /* EN ANILLOS. En un mapa de 184 unidades barrer todo para elegir un banco es
     absurdo: se mira a 14, y si no hay nada a 30, y si tampoco a 60. Casi siempre
     alcanza el primer anillo. */
  let best=null,bd=1e9;
  for(const R of [14,30,60]){
    gridNear(h.x,h.z,R,p=>{
      if(!live(p)||!canEat(h,p))return;
      const d=Math.hypot(p.x-h.x,p.z-h.z);
      if(d>R)return;
      const sc=d-p.mass*.5;                   /* lo grande vale el viaje */
      if(sc<bd){bd=sc;best=p;}
    });
    if(best)break;
  }
  h.target=best;
  if(!best&&(h.wx==null||Math.hypot(h.wx-h.x,h.wz-h.z)<2)){
    /* sin comida cerca se van a OTRA ZONA (antes elegían un punto al azar del
       mapa chico; con el mapa grande eso los dejaba vagando en el mismo barrio) */
    const c=zoneCenter(Math.floor(Math.random()*ZONES.length));
    h.wx=clamp(c.x+rnd(-ZS*.35,ZS*.35),-MAP+4,MAP-4);
    h.wz=clamp(c.z+rnd(-ZS*.35,ZS*.35),-MAP+4,MAP-4);
  }
}
/* AMENAZA Y PRESA: el pozo más grande que me pueda tragar y el más chico que yo
   me pueda tragar, dentro de un radio de vista. Es lo que convierte el juego en
   agar.io y no en una carrera de comer bancos. */
function scanHoles(h){
  let thr=null,td=1e9,prey=null,pd=1e9;
  const VIS=26+h.r*3;
  for(const o of holes){
    if(o===h||!o.alive)continue;
    const d=Math.hypot(o.x-h.x,o.z-h.z);
    if(d>VIS)continue;
    if(o.r>=h.r*1.15){if(d<td){td=d;thr=o;}}
    else if(h.r>=o.r*1.15){if(d<pd){pd=d;prey=o;}}
  }
  h.thr=thr;h.thrD=td;h.prey=prey;h.preyD=pd;
}
function aiStep(h,dt){
  h.t-=dt;h.since+=dt;
  scanHoles(h);
  let tx,tz,flee=false;
  /* 1. HUIR es lo primero: si hay algo que me come cerca, todo lo demás espera */
  if(h.thr&&h.thrD<h.thr.r*3.4+8){
    tx=h.x+(h.x-h.thr.x);tz=h.z+(h.z-h.thr.z);
    flee=true;h.exp='scared';h.expT=.4;
  }
  /* 2. CAZAR: si tengo una presa a tiro, la persigo (y le corto el paso) */
  else if(h.prey&&h.preyD<26){
    tx=h.prey.x+h.prey.vx*.55;tz=h.prey.z+h.prey.vz*.55;
    h.exp='hunt';h.expT=.4;
  }
  /* 3. si no, comer del barrio como siempre */
  else{
    if(h.t<=0||!h.target||!live(h.target)){h.t=rnd(.45,1.05);pickTarget(h);}
    if(h.target){tx=h.target.x;tz=h.target.z;}
    else{
      if(h.wx==null){const c=zoneCenter(Math.floor(Math.random()*ZONES.length));
        h.wx=clamp(c.x,-MAP+4,MAP-4);h.wz=clamp(c.z,-MAP+4,MAP-4);}
      tx=h.wx;tz=h.wz;
    }
  }
  const dx=tx-h.x,dz=tz-h.z,L=Math.hypot(dx,dz)||1;
  if(L<1.2&&!h.target&&!flee)h.wx=null;
  /* el que huye corre un 12% más: si no, el grande siempre lo alcanza y todos los
     rivales chicos morían en el primer minuto */
  const sp=h.sp*(1-Math.min(.22,(h.r-1)*.045))*(flee?1.12:1);
  const k=1-Math.pow(.0015,dt);
  h.vx=lerp(h.vx,dx/L*sp,k);h.vz=lerp(h.vz,dz/L*sp,k);
  h.x+=h.vx*dt;h.z+=h.vz*dt;
  h.bx=lerp(h.bx,h.x,dt*.08);h.bz=lerp(h.bz,h.z,dt*.08);
}
/* ===================== OJOS =====================
   Van en la capa 2D (cero llamadas de dibujo en WebGL y libertad total para
   animar). Seis gestos: mira, parpadea, caza, se asusta, festeja y queda mareado
   o con cruces si lo comieron. La mirada persigue el blanco de verdad, así se
   entiende a quién va a ir cada pozo sin leer un solo cartel. */
function eyeStep(h,dt,me){
  h.expT=Math.max(0,h.expT-dt);
  h.blinkT-=dt;
  if(h.blink>0)h.blink=Math.max(0,h.blink-dt*7);
  else if(h.blinkT<=0){h.blink=1;h.blinkT=rnd(1.6,5.2);}
  if(h.spin>0)h.spin=Math.max(0,h.spin-dt);
  if(h.shk>0)h.shk=Math.max(0,h.shk-dt*2.4);
  /* a dónde mira: al blanco, y si no hay blanco, adonde va */
  let tx=null,tz=null;
  if(h===me){
    const t=meTarget();
    if(t){tx=t.x;tz=t.z;}
    else if(Math.hypot(dirv.x,dirv.z)>.05){tx=h.x+dirv.x*9;tz=h.z+dirv.z*9;}
  }else{
    if(h.thr&&h.thrD<h.thr.r*3.4+8){tx=h.thr.x;tz=h.thr.z;}
    else if(h.prey&&h.preyD<26){tx=h.prey.x;tz=h.prey.z;}
    else if(h.target){tx=h.target.x;tz=h.target.z;}
    else if(Math.hypot(h.vx,h.vz)>.2){tx=h.x+h.vx;tz=h.z+h.vz;}
  }
  if(tx!=null){
    const dx=tx-h.x,dz=tz-h.z,L=Math.hypot(dx,dz)||1;
    h.lx=dx/L;h.lz=dz/L;
  }
  h.plx=lerp(h.plx,h.lx,Math.min(1,dt*7));
  h.plz=lerp(h.plz,h.lz,Math.min(1,dt*7));
  /* el gesto: lo que manda es el peligro */
  if(!h.alive){h.exp='dead';return;}
  if(h.expT<=0){
    if(h===me){
      const thr=nearThreat(h);
      h.exp=thr?'scared':(nearPrey(h)?'hunt':'idle');
    }else h.exp='idle';
  }
  if(h.exp==='scared')h.shk=Math.max(h.shk,.5);
}
/* DIBUJO de los ojos, en la capa 2D. Se posicionan proyectando el borde de arriba
   del pozo, así siguen al agujero en perspectiva y escalan con su tamaño en
   pantalla (un pozo lejano tiene ojitos chicos y no ensucia el cuadro). */
function drawEyes(g,h,me){
  if(!h.alive&&h.fade<=0)return;
  const c=toScreen(h.x,.06,h.z);
  if(!c||!c.on)return;
  /* radio en PÍXELES: se mide proyectando un punto del borde, no con una fórmula,
     porque la cámara está picada y el pozo se ve como una elipse */
  const e=toScreen(h.x+h.r,.06,h.z);
  if(!e)return;
  const rp=Math.abs(e.x-c.x);
  if(rp<9)return;                              /* muy lejos: no vale la pena */
  const S=Math.max(2.2,rp*.30)*(h.alive?1:Math.max(.2,h.fade));
  const sep=rp*.40;
  /* la pupila se corre hacia donde mira, proyectado a pantalla */
  const px=h.plx,pz=h.plz;
  const sx=px, sy=pz*.62;                      /* .62 = el picado de la cámara */
  const jx=h.shk>0?rnd(-1,1)*h.shk*S*.22:0, jy=h.shk>0?rnd(-1,1)*h.shk*S*.22:0;
  const ex=h.exp;
  const lidK=ex==='hunt'?.46:(ex==='happy'?.9:(ex==='scared'?0:h.blink));
  const wide=ex==='scared'?1.28:(ex==='hunt'?.92:1);
  const cy=c.y-rp*.30;                         /* arriba del centro: se ven mejor */
  g.save();
  g.translate(jx,jy);
  for(const side of [-1,1]){
    const ox=c.x+side*sep, oy=cy;
    if(ex==='dead'){                           /* comido: cruces */
      g.strokeStyle='#f4f0ff';g.lineWidth=Math.max(1.6,S*.34);g.lineCap='round';
      g.beginPath();
      g.moveTo(ox-S*.6,oy-S*.6);g.lineTo(ox+S*.6,oy+S*.6);
      g.moveTo(ox+S*.6,oy-S*.6);g.lineTo(ox-S*.6,oy+S*.6);
      g.stroke();
      continue;
    }
    if(ex==='happy'){                          /* festejo: dos arcos */
      g.strokeStyle='#f4f0ff';g.lineWidth=Math.max(1.5,S*.3);g.lineCap='round';
      g.beginPath();g.arc(ox,oy+S*.18,S*.72,Math.PI*1.12,Math.PI*1.88);g.stroke();
      continue;
    }
    /* blanco del ojo */
    g.fillStyle='#f7f4ff';
    g.beginPath();g.ellipse(ox,oy,S*wide,S*1.06*wide,0,0,TAU);g.fill();
    /* pupila */
    const pr=ex==='scared'?S*.30:(ex==='hunt'?S*.44:S*.40);
    const off=S*.42;
    let ppx=ox+sx*off, ppy=oy+sy*off;
    g.fillStyle='#140b22';
    if(h.spin>0){                              /* mareado: la pupila gira */
      const a=ARC.t*11+side;
      ppx=ox+Math.cos(a)*off*.7;ppy=oy+Math.sin(a)*off*.7;
    }
    g.beginPath();g.arc(ppx,ppy,pr,0,TAU);g.fill();
    /* brillito */
    g.fillStyle='rgba(255,255,255,.85)';
    g.beginPath();g.arc(ppx-pr*.34,ppy-pr*.38,pr*.30,0,TAU);g.fill();
    /* párpado: parpadeo, entrecerrar al cazar */
    if(lidK>0.02){
      g.fillStyle=h.col;
      g.globalAlpha=.96;
      g.beginPath();
      g.ellipse(ox,oy-S*1.06*wide+S*1.06*wide*lidK,S*wide*1.1,S*1.1*wide*lidK,0,0,TAU);
      g.fill();g.globalAlpha=1;
    }
    /* ceja: al cazar baja hacia adentro (enojado), al asustarse sube */
    if(ex==='hunt'||ex==='scared'){
      /* ceja corta: a S*0,9 de largo se cruzaba con la del otro ojo y parecía un
         bigote (visto en la captura AG-4) */
      g.strokeStyle=h.col;g.lineWidth=Math.max(1.3,S*.26);g.lineCap='round';
      const up=ex==='scared';
      g.beginPath();
      g.moveTo(ox-side*S*.62, oy-S*(up?1.46:1.18)+(up?-S*.08:S*.3));
      g.lineTo(ox+side*S*.62, oy-S*(up?1.32:1.48));
      g.stroke();
    }
  }
  g.restore();
}
/* para el jugador: hay algo que me puede comer / algo que me puedo comer, cerca */
function nearThreat(h){
  for(const o of holes){
    if(o===h||!o.alive)continue;
    if(o.r>=h.r*1.15&&Math.hypot(o.x-h.x,o.z-h.z)<o.r*3.6+9)return o;
  }
  return null;
}
function nearPrey(h){
  for(const o of holes){
    if(o===h||!o.alive)continue;
    if(h.r>=o.r*1.15&&Math.hypot(o.x-h.x,o.z-h.z)<h.r*4+10)return o;
  }
  return null;
}
function meTarget(){
  const me=holes[0];
  const t=nearThreat(me)||nearPrey(me);
  return t?{x:t.x,z:t.z}:null;
}
/* la cosa que quedó inclinada y el pozo se fue: se endereza (si no, el barrio
   quedaba lleno de árboles chuecos apuntando a ninguna parte) */
function tiltStep(dt){
  for(const p of props){
    if(p.st!==1||p.touch)continue;
    p.tilt=Math.max(0,p.tilt-dt*1.8);
    p.rx=p.tilt*(p.tnz||0);p.rz=-p.tilt*(p.tnx||0);
    if(p.tilt<=0){p.st=0;p.rx=p.rz=0;}
    setMat(p);
  }
}
/* cosas cayendo (giran, se encogen y desaparecen) y cosas brotando (obra nueva) */
function fallStep(dt){
  for(const p of props){
    if(p.st===3){
      p.gr=Math.min(1,p.gr+dt*3.2);
      if(p.gr>=1){p.st=0;p.gr=1;}
      setMat(p);continue;
    }
    if(p.st!==2)continue;
    p.fy-=15*dt;p.py+=p.fy*dt;
    p.px=lerp(p.px,p.hole.x,1-Math.pow(.05,dt));
    p.pz=lerp(p.pz,p.hole.z,1-Math.pow(.05,dt));
    p.rx+=p.spx*dt;p.rz+=p.spz*dt;p.ry+=p.spx*.4*dt;
    p.shr=Math.max(0,p.shr-dt*.85);
    if(p.py<-5||p.shr<=0){
      p.shr=0;p.st=9;p.py=0;                  /* libre: la instancia se recicla */
      (FREE[p.kind]=FREE[p.kind]||[]).push(p);
    }
    setMat(p);
  }
}
G.step=function(dt){
  if(!T3||done||!holes.length)return;
  time-=dt;startT+=dt;grace=Math.max(0,grace-dt);hintT=Math.max(0,hintT-dt);
  introT=Math.max(0,introT-dt);
  sndS=Math.max(0,sndS-dt);sndB=Math.max(0,sndB-dt);flash=Math.max(0,flash-dt*1.5);
  if(comboT>0){comboT-=dt;if(comboT<=0)streak=0;}
  rsTick(dt);
  const me=holes[0],r0=Math.floor(me.r);
  for(const h of holes)h.imm=Math.max(0,h.imm-dt);
  me.x+=dirv.x*me.sp*dt;me.z+=dirv.z*me.sp*dt;
  for(const p of props)if(p.st===1)p.touch=0;
  for(const h of holes){
    if(h.ai)aiStep(h,dt);
    const lim=FENCE-.55-h.r;   /* el ARO entero queda del lado de adentro */
    h.x=clamp(h.x,-lim,lim);h.z=clamp(h.z,-lim,lim);
    eatStep(h,dt,me);
  }
  /* ===================== POZO CONTRA POZO (estilo agar.io) =====================
     El grande se traga al chico COMPLETO y el chico queda AFUERA de la partida.
     Antes el comido perdía la mitad de la masa y reaparecía en una esquina, y eso
     hacía que nunca pasara nada definitivo: ahora cada encuentro decide algo.
     Umbral 1,15 y contacto a r*0,72: hace falta ser claramente más grande y
     ENCIMARLO, así se ve venir y se puede escapar. */
  for(let i=0;i<holes.length;i++){
    const a=holes[i];if(!a.alive)continue;
    for(let j=0;j<holes.length;j++){
      if(i===j)continue;
      const b=holes[j];if(!b.alive)continue;
      if(a.r<b.r*1.15)continue;
      if(b===me&&grace>0)continue;          /* los primeros segundos no te comen */
      if(b.imm>0)continue;
      if(Math.hypot(a.x-b.x,a.z-b.z)>a.r*.72)continue;
      a.mass+=b.mass*.8;a.r=radiusFor(a.mass);a.since=0;a.ateH++;
      a.exp='happy';a.expT=1;
      b.alive=false;b.fade=1;b.exp='dead';b.expT=9;b.vx=b.vz=0;b.target=null;
      if(a===me){
        ARC.toast(ARC.T('ateRival')+' '+(b.nick||''),1500);
        ARC.sfx('power');ARC.shake(11);flash=1;
        const hs=toScreen(a.x,0,a.z);
        if(hs){ARC.fx.ring(hs.x,hs.y,{r:Math.max(60,ARC.H*.34),life:.6,color:'#fff',w:5});
          if(ARC.S.fx)ARC.fx.burst(hs.x,hs.y,{n:Math.round(20*gp.part),color:b.col,
            speed:230,life:.6,size:5,sq:true});}
      }else if(b===me){
        /* TE COMIERON: se termina la ronda ahí mismo. Es la otra mitad de la
           mecánica que pidió el usuario (podés comer y te pueden comer). */
        ARC.toast(ARC.T('eaten'),1800);ARC.sfx('lose',{vol:.9});ARC.shake(16);
        ARC.vib([40,60,40]);flash=1;streak=0;
        eatenBy=a.nick||'';
        finish(true);return;
      }else if(Math.hypot(a.x-me.x,a.z-me.z)<camD*1.4){
        /* si pasa a la vista, se avisa: enseña la regla sin tutorial */
        ARC.sfx('boom',{vol:.35,rate:1.2});
      }
      break;                                 /* a ya comió en este cuadro */
    }
  }
  /* separación: sin esto dos rivales quedaban pegados peleando por el mismo banco */
  for(let i=0;i<holes.length;i++)for(let j=i+1;j<holes.length;j++){
    const a=holes[i],b=holes[j];
    if(!a.alive||!b.alive)continue;
    const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||1;
    const mn=(a.r+b.r)*.85;
    /* sólo se empujan los que NO se pueden comer: si el grande empuja al chico en
       vez de tragárselo, la persecución nunca termina */
    if(a.r>=b.r*1.15||b.r>=a.r*1.15)continue;
    if(d<mn){const f=(mn-d)*.5,nx=dx/d,nz=dz/d;
      if(a.ai){a.x-=nx*f;a.z-=nz*f;}
      if(b.ai){b.x+=nx*f;b.z+=nz*f;}}
  }
  /* ¿me los comí a TODOS? esa es la victoria grande */
  if(aliveH().length===1&&me.alive){finish(false,true);return;}
  /* los muertos se desinflan y desaparecen */
  for(const h of holes)if(!h.alive&&h.fade>0)h.fade=Math.max(0,h.fade-dt*1.8);
  /* ojos de los dieciséis */
  for(const h of holes)eyeStep(h,dt,me);
  /* ZONA ACTUAL: se anuncia al cruzar y se anota para el remate */
  const zi=zoneAt(me.x,me.z);
  if(zi!==zNow){
    zNow=zi;zSeen[ZONES[zi].k]=1;
    if(startT>1.5){ARC.toast(ARC.T(ZONES[zi].nk),1300);ARC.sfx('click',{vol:.4,rate:.9});}
  }
  catchUp(dt);
  tiltStep(dt);
  fallStep(dt);
  spawnTick(dt);
  /* crecer se siente */
  if(Math.floor(me.r)>r0){
    ARC.sfx('power',{rate:1+ (Math.floor(me.r)-1)*.06,vol:.7});
    ARC.shake(6);ARC.toast(ARC.T('grew'));
    const hs=toScreen(me.x,0,me.z);
    if(hs)ARC.fx.ring(hs.x,hs.y,{r:Math.max(50,ARC.H*.3),life:.55,color:'#fff',w:5});
  }
  /* objetivo cumplido: se avisa UNA vez y con festejo (antes no había objetivo) */
  if(!goalHit&&goalOk()&&goal.k!=='rank'){
    goalHit=true;ARC.toast(ARC.T('goalOk'),1500);ARC.sfx('power',{rate:1.25});
    ARC.vib([10,40,10]);
    const hs=toScreen(me.x,0,me.z);
    if(hs)ARC.fx.ring(hs.x,hs.y,{r:Math.max(60,ARC.H*.4),life:.7,color:'#7dff9b',w:6});
  }
  /* últimos 10 segundos */
  const s=Math.max(0,Math.ceil(time));
  if(s<=10&&s>0){
    if(!warned){warned=true;ARC.toast(ARC.T('last10'),1400);ARC.vib(40);}
    if(s!==lastSec){lastSec=s;ARC.sfx('click',{rate:1.45,vol:.42});flash=1;}
  }
  hud();
  if(time<=0)finish();
};
/* ---- FIN DE RONDA: puesto, masa, objetivo, estrellas y monedas ---- */
/* TRES FORMAS DE TERMINAR:
     devoured = te comió un pozo más grande -> perdiste, y punto
     sweep    = te comiste a los quince -> victoria total, tres estrellas
     (nada)   = se acabó el reloj -> vale el puesto y el objetivo, como antes */
function finish(devoured,sweep){
  if(done)return;
  done=true;
  const me=holes[0];
  const rank=holes.slice().sort((a,b)=>(b.alive?1:0)-(a.alive?1:0)||b.mass-a.mass);
  const pos=rank.indexOf(me)+1;
  const vivos=aliveH().length,muertos=holes.length-vivos;
  const ok=goalOk();
  let win,st,title;
  if(devoured){
    win=false;st=0;title=ARC.T('devoured');
  }else if(sweep){
    win=true;st=3;title=ARC.T('sweep');
  }else{
    const last=pos===holes.length;
    win=ok&&!last;
    st=win?(pos===1?3:(pos===2?2:1)):0;
    title=pos===1?ARC.T('first'):(last?ARC.T('last'):ARC.T('place')+' '+pos);
  }
  const coins=Math.round(me.mass/5)+(ok?25:0)+(pos===1?30:0)
    +Math.min(25,bestStreak)+me.ateH*20+(sweep?120:0);
  if(bestStreak>(ARC.S.streak||0))ARC.S.streak=bestStreak;
  if(me.ateH>(ARC.S.hunt||0))ARC.S.hunt=me.ateH;
  const zn=Object.keys(zSeen).length;
  ARC.over({win,score:Math.round(me.mass),stars:st,coins,title,
    sub:(devoured?'<b style="color:#ff8a8a">'+ARC.T('eatenBy')+' '+eatenBy+'</b><br>':'')
      +'<b style="color:'+(ok?'#7dff9b':'#ff8a8a')+'">'+(ok?ARC.T('goalDone'):ARC.T('goalMiss'))
      +'</b>: '+goalTxt(true)+' ('+goalProg()+'/'+goal.n+')<br>'
      +ARC.T('hunted')+': <b>'+me.ateH+'/'+(holes.length-1)+'</b> · '
      +ARC.T('yourMass')+': <b>'+Math.round(me.mass)+'</b> · '+ARC.T('swallowed')+': '+eaten+'<br>'
      +ARC.T('zonesSeen')+': '+zn+'/'+ZONES.length+' · '+ARC.T('streak')+': '+bestStreak
      +' · '+ARC.T('outOf')+': '+muertos+'<br>'
      +'<b style="color:#ffd166">+'+coins+' ◉</b>'});
}

/* ============================ MODO ATRACCIÓN ============================
   El menú no puede ser una foto quieta: acá corre una partida sola (tres pozos
   comiéndose el barrio) con la cámara orbitando el pozo grande. Se reinicia sola
   cada ~26 s o cuando el pozo ya se comió todo. */
function demoStart(){
  demo=1;aT=0;
  gp=ARC.gfxP?ARC.gfxP():gp;
  perk=SKINS[skinId()];
  if(!city)buildGround();
  buildCity(1);
  buildHoleMeshes();   /* los pozos ya no tienen malla propia: van instanciados */
  holes=[mkHole(perk.col,true,0,0)];
  const cols=rivalCols();
  const spots=[[-13,-13],[13,13]];
  for(let i=0;i<2;i++){
    const h=mkHole(cols[i%cols.length],true,spots[i][0],spots[i][1]);
    h.sp=6.6;h.eff=1;holes.push(h);
  }
  /* con masa 3-9 el pozo era un puntito y el menú no se leía como este juego:
     arrancan ya crecidos y comiéndose árboles y autos */
  holes[0].mass=rnd(45,70);
  for(let i=1;i<holes.length;i++)holes[i].mass=rnd(20,40);
  for(const h of holes)h.r=radiusFor(h.mass);
  spawnT=.4;time=0;
  window.__holes=holes;
}
G.attract=function(dt,g){
  if(!T3||!scene||!ARC.rnd)return;
  if(!demo){demoStart();return;}
  aT+=dt;rsTick(dt);
  for(const p of props)if(p.st===1)p.touch=0;
  for(const h of holes){
    aiStep(h,dt);
    /* en el menú los pozos no salen del interior del barrio: si el pozo que sigue
       la cámara se iba a una esquina, el menú mostraba medio campo vacío */
    const lim=Math.min(FENCE-.55-h.r,MAP-9);
    h.x=clamp(h.x,-lim,lim);h.z=clamp(h.z,-lim,lim);
    eatStep(h,dt,null);                       /* me=null: sin efectos ni sonido */
  }
  tiltStep(dt);fallStep(dt);spawnTick(dt*1.5);
  const me=holes[0];
  /* cámara orbitando: se ve el pozo comiendo y el barrio detrás, y nunca queda
     vacío ni en vertical ni apaisado (el encuadre siempre incluye el pozo) */
  /* más baja que la de partida (1,0 contra 1,22 de altura) y apuntando por encima
     del pozo: así el pozo queda en el tercio de abajo y no detrás del título */
  const R=Math.min(18,9.5+me.r*2.8),a=aT*.17;
  cam.position.set(me.x+Math.cos(a)*R,R*1.16,me.z+Math.sin(a)*R);
  cam.lookAt(me.x,R*.2,me.z);
  const cd=Math.hypot(R*1.16,R),fk=clamp(gp.fog,.65,1.3);
  const dmax=cd+R*1.05+11;
  scene.fog.far=dmax*fk;scene.fog.near=Math.max(cd*.5,scene.fog.far-24*fk);
  camTx=me.x;camTz=me.z;camD=R;
  cullStep();                                 /* el menú también culea */
  for(const h of holes)eyeStep(h,dt,me);
  holesVis(me);
  /* A LA MITAD DE CUADROS. Medido (900x430 swiftshader): el menú con la escena
     viva daba 18 fps y sin ella 60, o sea que la escena de fondo se estaba
     comiendo el menú (y el menú tiene animaciones de CSS que necesitan cuadros).
     Un fondo a 30 Hz no se nota —la cámara gira lento— y devuelve la mitad del
     costo; el lienzo se queda con el cuadro anterior, que además le ahorra al
     compositor volver a subir la textura. */
  aHalf=!aHalf;
  if(aHalf)ARC.rnd.render(scene,cam);
  if(aT>26||me.r>5.2)demo=0;                  /* ronda de demo nueva */
};

/* ============================ TIENDA DE POZOS ============================ */
let shopEl=null;
function buildShop(){
  shopEl=document.createElement('div');
  shopEl.className='scr';shopEl.id='agShop';
  shopEl.innerHTML='<div class="card" style="max-width:94vmin;width:min(94vmin,760px);gap:1.2vmin">'
    +'<div class="h2" id="agTtl"></div>'
    +'<div class="sm" id="agSub" style="opacity:.85"></div>'
    +'<div id="agGrid" style="display:grid;grid-template-columns:repeat(3,1fr);'
    +'gap:clamp(4px,1.1vmin,10px);width:100%"></div>'
    +'<div class="btn" id="agDone"></div></div>';
  document.getElementById('stage').appendChild(shopEl);
  shopEl.querySelector('#agDone').addEventListener('pointerdown',e=>{
    e.preventDefault();ARC.sfx('tap');ARC.vib(8);shopEl.classList.remove('on');});
}
function paintShop(){
  const own=owned(),cur=skinId();
  shopEl.querySelector('#agTtl').textContent=ARC.T('shop');
  shopEl.querySelector('#agSub').innerHTML=ARC.T('shopSub')+' · <b style="color:#ffd166">'
    +(ARC.S.coins||0)+' ◉</b>';
  shopEl.querySelector('#agDone').textContent=ARC.T('done');
  const gr=shopEl.querySelector('#agGrid');gr.innerHTML='';
  SKINS.forEach((s,i)=>{
    const has=own.indexOf(i)>=0,sel=i===cur;
    const el=document.createElement('div');
    el.style.cssText='pointer-events:auto;display:flex;flex-direction:column;align-items:center;'
      +'gap:.3em;padding:clamp(5px,1.2vmin,12px);border-radius:14px;text-align:center;'
      +'background:'+(sel?'rgba(192,132,252,.22)':'rgba(255,255,255,.06)')+';'
      +'border:1px solid '+(sel?s.col:'rgba(255,255,255,.14)')+';'
      +'opacity:'+(has?1:.72);
    el.innerHTML='<div style="width:clamp(20px,4.6vmin,34px);height:clamp(20px,4.6vmin,34px);'
      +'border-radius:50%;background:#05060a;border:3px solid '+s.col
      +';box-shadow:0 0 12px '+s.col+'88"></div>'
      +'<b style="font-size:clamp(9px,2.1vmin,15px)">'+ARC.T('sk'+i)+'</b>'
      +'<span style="font-size:clamp(7px,1.6vmin,12px);opacity:.78;line-height:1.15">'
      +ARC.T('p'+i)+'</span>'
      +'<span style="font-size:clamp(8px,1.9vmin,13px);font-weight:900;color:'
      +(sel?s.col:(has?'#9fe8b0':'#ffd166'))+'">'
      +(sel?ARC.T('use'):(has?ARC.T('have'):s.cost+' ◉'))+'</span>';
    el.addEventListener('pointerdown',ev=>{
      ev.preventDefault();
      if(has){ARC.S.skin=i;ARC.save();ARC.sfx('tap');ARC.vib(8);
        if(demo)demo=0;                        /* la demo del menú cambia de color */
        paintShop();return;}
      if((ARC.S.coins||0)>=s.cost){
        ARC.S.coins-=s.cost;own.push(i);ARC.S.skin=i;ARC.save();
        ARC.sfx('power');ARC.vib([10,40,10]);ARC.toast(ARC.T('bought'));
        if(demo)demo=0;
        paintShop();refreshCoins();
      }else{
        ARC.sfx('groan',{vol:.5});
        ARC.toast(ARC.T('need')+' '+(s.cost-(ARC.S.coins||0))+' ◉');
      }
    });
    gr.appendChild(el);
  });
}
function refreshCoins(){const c=document.getElementById('mCoins');
  if(c)c.textContent=ARC.S.coins||0;}
function openShop(){
  if(!shopEl)buildShop();
  paintShop();shopEl.classList.add('on');
}

/* ============================ DIBUJO ============================ */
function toScreen(x,y,z){
  if(!cam)return null;
  PV.set(x,y,z).project(cam);
  if(PV.z>1)return null;
  return {x:(PV.x*.5+.5)*ARC.W,y:(-PV.y*.5+.5)*ARC.H,on:Math.abs(PV.x)<1&&Math.abs(PV.y)<1};
}
function rrect(g,x,y,w,h,r){
  g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);
  g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);
  g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();
}
G.draw=function(g){
  if(!ARC.rnd||!scene||!holes.length)return;
  const me=holes[0];
  /* la cámara se aleja con el radio: crecer se SIENTE (y el barrio se lee).
     TOPE 24: sin tope, con el pozo enorme la cámara veía 100 de ancho y media
     pantalla era campo vacío. */
  /* TOPE 20 y no 24, y menos picado: a 24 con 57° la partida se leía como un
     PLANO del barrio (todo asfalto visto de arriba, las casas sin fachada). A 20
     con 49° se ve el volumen de las casas y el pozo ocupa lo que tiene que ocupar. */
  camD=lerp(camD,Math.min(20,8.2+me.r*3.3),.09);
  /* CAJA DE CÁMARA: deja de seguir al pozo cerca del borde, sin girar en Y (si se
     corriera la cámara en X mirando al pozo, las calles saldrían en diagonal). */
  const CL=Math.max(4,MAP-camD*.46),CLZ=Math.max(4,MAP-camD*.4);
  const cx=clamp(me.x,-CL,CL),cz=clamp(me.z,-CLZ,CLZ);
  cam.position.set(cx,camD*1.22,cz+camD*1.05);
  cam.lookAt(cx,0,cz-camD*.1);
  camTx=cx;camTz=cz-camD*.1;
  /* CULLEO: va acá, DESPUÉS de mover la cámara y ANTES de render, porque el
     frustum que se usa para descartar tiene que ser el de ESTE cuadro. Si se
     hiciera en step (paso fijo) los props aparecerían un cuadro tarde al girar. */
  cullStep();
  /* niebla relativa a la cámara: fija, al crecer el pozo el suelo de abajo entraba
     en la niebla y la pantalla se lavaba (medido con snapGL) */
  const cd=Math.hypot(camD*1.22,camD*1.05),fk=clamp(gp.fog,.65,1.3);
  /* la niebla cierra JUSTO donde el culleo deja de dibujar props, así el corte no
     se ve: lo último que se alcanza a ver ya está medio borrado */
  /* LA NIEBLA VA JUSTO EN EL CORTE, no antes. El culleo mide la distancia desde el
     BLANCO de la cámara, así que el prop más lejano que se dibuja está a
     (distancia cámara-blanco + radio de culleo) de la cámara: ahí va el far, y el
     near 24 unidades antes. Puesta más cerca (probado con cd*0,62) lavaba toda la
     pantalla y las casas del fondo quedaban blancas. */
  const dmax=cd+camD*1.05+11;
  scene.fog.far=dmax*fk;scene.fog.near=Math.max(cd*.5,scene.fog.far-24*fk);
  holesVis(me);
  ARC.rnd.render(scene,cam);

  /* ---------------- OJOS (capa 2D, cero llamadas de dibujo) ---------------- */
  for(const h of holes)drawEyes(g,h,me);

  /* ---------------- HUD 2D ---------------- */
  /* el marcador muestra sólo a los que quedan EN JUEGO (los comidos se van) y
     nunca más de seis filas: con dieciséis pozos la lista tapaba media pantalla */
  const av=aliveH().slice().sort((a,b)=>b.mass-a.mass);
  const rank=av.slice(0,6);
  /* si quedaste fuera del top 6 tu fila entra igual, en el último lugar: sin esto
     el jugador no se veía en el marcador justo cuando más lo necesita */
  if(rank.indexOf(me)<0&&me.alive)rank[rank.length-1]=me;
  const fs=Math.max(9,Math.min(ARC.H*.038,20));
  const rowH=fs*1.5,pad=fs*.55;
  const x0=ARC.W*.026,y0=ARC.H*.16;
  const w=Math.max(150,ARC.W*.27),hh=rowH*rank.length+pad*2;
  const panel={x:x0-4,y:y0-4,w:w+8,h:hh+8};
  /* el panel de puestos se dibuja AL FINAL (drawRank), después de las marcas de
     los rivales: si iba antes, la marca de un rival arriba a la izquierda le
     quedaba encima y se leía como una barra rota */
  const drawRank=()=>{
  rrect(g,x0,y0,w,hh,fs*.5);
  g.fillStyle='rgba(8,11,16,.74)';g.fill();   /* a .55 se veía el barrio a través */
  g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=1;g.stroke();
  const top=Math.max(1,rank[0].mass);
  /* columnas fijas: puesto · chapa de color · nombre · barra · masa */
  const cN=x0+pad,cChip=cN+fs*.95,cNm=cChip+fs*.95,cBar=cNm+fs*2.2,
        cMass=x0+w-pad,bw=cMass-cBar-fs*2.3;
  rank.forEach((h,i)=>{
    const mid=y0+pad+rowH*i+rowH*.5,mine=h===me;
    g.textBaseline='middle';g.textAlign='left';
    g.font='900 '+fs+'px system-ui,sans-serif';
    g.fillStyle=mine?'#ffffff':'rgba(255,255,255,.55)';
    g.fillText((i+1)+'',cN,mid);
    g.fillStyle=h.col;
    rrect(g,cChip,mid-fs*.3,fs*.6,fs*.6,fs*.18);g.fill();
    g.font='900 '+(fs*.68)+'px system-ui,sans-serif';
    g.fillStyle=mine?'#ffffff':'rgba(255,255,255,.62)';
    g.fillText(mine?ARC.T('you'):(h.nick||'R'),cNm,mid);
    g.fillStyle='rgba(255,255,255,.12)';
    rrect(g,cBar,mid-fs*.26,bw,fs*.52,fs*.26);g.fill();
    g.fillStyle=h.col;
    rrect(g,cBar,mid-fs*.26,Math.max(fs*.52,bw*clamp(h.mass/top,.04,1)),fs*.52,fs*.26);g.fill();
    g.textAlign='right';g.font='900 '+fs+'px system-ui,sans-serif';
    g.fillStyle=mine?'#ffffff':'rgba(255,255,255,.75)';
    g.fillText(Math.round(h.mass)+'',cMass,mid);
  });
  g.textBaseline='alphabetic';g.textAlign='left';
  };
  /* marcas de los rivales en pantalla: aro del color + masa, y flecha si está
     fuera de cuadro (antes un rival podía comerte sin que supieras dónde estaba).
     Mientras está la tarjeta de OBJETIVO no se dibuja nada de esto: la tarjeta es
     ancha y el panel de puestos le quedaba montado encima (V-ag-objetivo-h). */
  if(introT<=0)for(let i=1;i<holes.length;i++){
    const h=holes[i],sc=toScreen(h.x,0,h.z);
    if(!sc)continue;
    const big=h.r>me.r*1.2;
    if(sc.on){
      g.strokeStyle=h.col;g.lineWidth=Math.max(2,fs*.16);
      g.beginPath();g.arc(sc.x,sc.y,fs*.82,0,TAU);g.stroke();
      g.font='900 '+(fs*.8)+'px system-ui,sans-serif';g.textAlign='center';
      g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.6)';
      g.strokeText(Math.round(h.mass)+(big?' ▲':''),sc.x,sc.y-fs*1.1);
      g.fillStyle=h.col;g.fillText(Math.round(h.mass)+(big?' ▲':''),sc.x,sc.y-fs*1.1);
      g.textAlign='left';
    }else{
      /* flecha en el BORDE de la pantalla (se proyecta la dirección sobre el
         rectángulo, no sobre una elipse: con la elipse la flecha caía DENTRO del
         panel de puestos y se leía como una barra rota) */
      const cx2=ARC.W/2,cy2=ARC.H/2,m=fs*1.6;
      let dx=sc.x-cx2,dy=sc.y-cy2;const L=Math.hypot(dx,dy)||1;
      dx/=L;dy/=L;
      const t=Math.min(Math.abs((ARC.W/2-m)/(dx||1e-6)),Math.abs((ARC.H/2-m)/(dy||1e-6)));
      let mx=cx2+dx*t,my=cy2+dy*t;
      if(mx>panel.x&&mx<panel.x+panel.w&&my>panel.y&&my<panel.y+panel.h)
        my=panel.y+panel.h+fs*1.2;          /* si pisa el panel, se corre abajo */
      g.save();g.translate(mx,my);g.rotate(Math.atan2(dy,dx));
      g.fillStyle=h.col;g.beginPath();
      g.moveTo(fs*.8,0);g.lineTo(-fs*.4,fs*.5);g.lineTo(-fs*.4,-fs*.5);g.closePath();g.fill();
      g.restore();
      g.font='900 '+(fs*.72)+'px system-ui,sans-serif';g.textAlign='center';
      g.fillStyle=h.col;g.fillText(Math.round(h.mass)+'',mx,my+fs*1.5);g.textAlign='left';
    }
  }
  if(introT<=0){drawRank();drawGoal(g,fs);}
  /* aviso de los últimos segundos: marco rojo que late + cuenta atrás gigante */
  if(flash>.01){
    const lw=Math.max(5,ARC.H*.03);
    g.strokeStyle='rgba(255,64,64,'+(flash*.6).toFixed(3)+')';
    g.lineWidth=lw;g.strokeRect(lw/2,lw/2,ARC.W-lw,ARC.H-lw);
    g.strokeStyle='rgba(255,150,150,'+(flash*.5).toFixed(3)+')';
    g.lineWidth=lw*.35;g.strokeRect(lw*1.2,lw*1.2,ARC.W-lw*2.4,ARC.H-lw*2.4);
  }
  /* CUENTA ATRÁS: en rojo translúcido encima del pozo negro era un manchón
     ilegible (V-ag-cuenta-h). Va en blanco con contorno rojo grueso, más arriba
     que el pozo y arrancando bien opaca. */
  const secs=Math.ceil(time);
  if(!done&&secs<=5&&secs>0){
    const k=1-(secs-time);                    /* 0..1 dentro del segundo */
    g.globalAlpha=clamp(.95-k*.8,0,1);
    g.font='900 '+Math.round(ARC.H*(.26+k*.1))+'px system-ui,sans-serif';
    g.textAlign='center';g.textBaseline='middle';
    g.lineWidth=Math.max(4,ARC.H*.022);g.strokeStyle='rgba(255,40,40,.95)';
    g.strokeText(secs+'',ARC.W/2,ARC.H*.36);
    g.fillStyle='#fff';g.fillText(secs+'',ARC.W/2,ARC.H*.36);
    g.globalAlpha=1;g.textAlign='left';g.textBaseline='alphabetic';
  }
  /* tarjeta de objetivo al empezar el barrio */
  if(introT>0){
    const k=clamp(introT/.45,0,1);
    g.globalAlpha=k;
    const w2=Math.min(ARC.W*.7,520),h2=Math.max(58,ARC.H*.26),x2=(ARC.W-w2)/2,y2=ARC.H*.2;
    rrect(g,x2,y2,w2,h2,Math.max(10,ARC.H*.03));
    g.fillStyle='rgba(8,11,16,.86)';g.fill();
    g.strokeStyle=G.acc;g.lineWidth=2;g.stroke();
    g.textAlign='center';
    g.fillStyle='rgba(255,255,255,.6)';
    g.font='900 '+Math.max(9,ARC.H*.035)+'px system-ui,sans-serif';
    g.fillText(ARC.T('hood')+' '+lvl+' · '+ARC.T('goal'),ARC.W/2,y2+h2*.3);
    g.fillStyle='#fff';
    g.font='900 '+Math.max(13,ARC.H*.068)+'px system-ui,sans-serif';
    g.fillText(goalTxt(),ARC.W/2,y2+h2*.66);
    g.fillStyle='rgba(255,255,255,.55)';
    g.font='800 '+Math.max(8,ARC.H*.03)+'px system-ui,sans-serif';
    g.fillText(ARC.T('hint'),ARC.W/2,y2+h2*.9);
    g.textAlign='left';g.globalAlpha=1;
  }else if(hintT>0){
    g.globalAlpha=clamp(hintT/1.2,0,1);
    g.fillStyle='rgba(14,18,26,.9)';
    g.font='900 '+Math.max(11,Math.min(ARC.H*.045,26))+'px system-ui,sans-serif';
    g.textAlign='center';
    g.fillText(ARC.T('hint'),ARC.W/2,ARC.H*.88);
    g.font='800 '+Math.max(9,Math.min(ARC.H*.03,17))+'px system-ui,sans-serif';
    g.fillStyle='rgba(14,18,26,.66)';
    g.fillText(ARC.T('hint2'),ARC.W/2,ARC.H*.93);
    g.textAlign='left';g.globalAlpha=1;
  }
};
/* barra de OBJETIVO debajo del reloj: sin esto el jugador no sabía qué le pedían */
function drawGoal(g,fs){
  const w=Math.max(120,ARC.W*.2),h=fs*1.15,x=(ARC.W-w)/2,y=ARC.H*.115;
  const pr=goalProg(),k=clamp(pr/goal.n,0,1);
  rrect(g,x,y,w,h,h*.5);
  g.fillStyle='rgba(8,11,16,.66)';g.fill();
  if(k>0){
    g.save();rrect(g,x,y,w,h,h*.5);g.clip();
    g.fillStyle=k>=1?'#7dff9b':G.acc;
    rrect(g,x,y,w*k,h,h*.5);g.fill();
    g.restore();
  }
  g.font='900 '+(fs*.72)+'px system-ui,sans-serif';
  g.textAlign='center';g.textBaseline='middle';
  g.fillStyle=k>=1?'#06210f':'#fff';
  g.fillText((k>=1?'✔ ':'◎ ')+(goal.k==='rank'
      ?goalTxt(true)+' · '+rankOf(holes[0])+'º'
      :pr+'/'+goal.n+' '+goalTxt(true).replace(goal.n+' ','').replace(goal.n,'')),
    ARC.W/2,y+h*.55);
  g.textAlign='left';g.textBaseline='alphabetic';
}

/* ============================ SONDA ============================ */
G.dbg={
  state:()=>({
    vivos:aliveH().length,cazados:holes[0]?holes[0].ateH:0,zona:ZONES[Math.max(0,zNow)].k,
    zonas:Object.keys(zSeen).length,visibles:visN,cullR:+cullR.toFixed(1),
    ojos:holes.slice(0,4).map(h=>h.exp).join('/'),vivo:holes[0]?!!holes[0].alive:false,
    MAP,mass:Math.round(holes[0]?holes[0].mass:0),
    r:+(holes[0]?holes[0].r:0).toFixed(2),
    time:+time.toFixed(1),props:props.filter(live).length,census,
    eaten,goal:goal.k+':'+goalProg()+'/'+goal.n,ok:goalOk(),streak:bestStreak,
    rivals:holes.slice(1).map(h=>Math.round(h.mass)),
    rank:1+holes.filter(h=>h!==holes[0]&&h.mass>holes[0].mass).length,
    tris:Object.keys(KGEO).map(k=>k+':'+KGEO[k].tris+(KGEO[k].glb?'g':'b')).join(' '),
    censo:(()=>{const o={};for(const p of props)if(live(p))o[p.kind]=(o[p.kind]||0)+1;return o;})(),
    draws:ims.length,rs:+rs.toFixed(2),done,lvl}),
  /* palanca para las pruebas: poner el pozo en una esquina o darle masa, que es
     como se comprueba que el cerco tapa el canto y que la cámara se aleja */
  /* pone al jugador donde se le pida (las sondas necesitan recorrer el mapa) */
  put:(x,z)=>{const h=holes[0];if(!h)return null;
    h.x=clamp(x,-MAP+3,MAP-3);h.z=clamp(z,-MAP+3,MAP-3);h.vx=h.vz=0;
    grace=0;return{x:+h.x.toFixed(1),z:+h.z.toFixed(1),zona:ZONES[zoneAt(h.x,h.z)].k};},
  grace:v=>{grace=v;return grace;},
  /* desglose de triángulos por pieza: sin esto no se sabe si el pico viene de los
     props o del piso, y se optimiza a ciegas */
  budget:()=>{
    const t=o=>{const g2=o.geometry;if(!g2||!g2.attributes.position)return 0;
      const n=(g2.index?g2.index.count:g2.attributes.position.count)/3;
      return Math.round(n*(o.isInstancedMesh?o.count:1));};
    const out={piso:0,pisoVis:0,campo:0,cerco:0,props:0,pozos:0,otros:0,visN};
    for(const m of groundChunks)if(m.visible&&!m.__culled)out.piso+=t(m);
    /* three marca la visibilidad real recién al renderizar: se recalcula el
       frustum acá para saber cuántos trozos de piso entran de verdad */
    if(FRU){for(const m of groundChunks){
      if(!m.geometry.boundingSphere)m.geometry.computeBoundingSphere();
      const sp=m.geometry.boundingSphere.clone();sp.applyMatrix4(m.matrixWorld);
      if(FRU.intersectsSphere(sp)){out.pisoVis++;}else out.piso-=t(m);}}
    if(fieldM)out.campo=t(fieldM);
    for(const im of ims)out.props+=t(im);
    for(const m of [IHD,IHR,IHG])if(m)out.pozos+=t(m);
    if(city)city.traverse(o=>{if(o.isMesh&&groundChunks.indexOf(o)<0&&o!==fieldM)out.cerco+=t(o);});
    return out;
  },
  set:o=>{
    if(!holes.length)return null;
    const h=holes[0];
    if(o.x!=null)h.x=o.x;if(o.z!=null)h.z=o.z;
    if(o.mass!=null){h.mass=o.mass;h.r=radiusFor(o.mass);camD=Math.min(20,8.2+h.r*3.3);}
    if(o.time!=null)time=o.time;
    if(o.hint!=null){hintT=o.hint;introT=0;}
    if(o.rs!=null){rs=o.rs;applyRS();}
    if(o.rsLock!=null)rsLock=o.rsLock;
    /* enganches de sonda para el juego nuevo: mover al pozo, tocar a un rival y
       apagar los segundos de gracia (si no, no se puede probar que TE coman) */
    if(o.grace!=null)grace=o.grace;
    if(o.rival){const rh=holes[o.rival.i];
      if(rh){if(o.rival.mass!=null){rh.mass=o.rival.mass;rh.r=radiusFor(rh.mass);}
        if(o.rival.x!=null){rh.x=o.rival.x;rh.z=o.rival.z;}}}
    /* comparar los modelos importados contra la versión de cajas sin recargar */
    if(o.box!=null){
      for(const k in K)if(K[k].glb){delete KGEO[k];if(o.box)KGEO[k]=boxGeoFor(k);}
      buildCity(lvl);
    }
    return G.dbg.state();
  },
  /* PILOTO. Reescrito para el juego nuevo: con quince rivales que se comen entre
     ellos, el orden de prioridades es HUIR > CAZAR > COMER, y la búsqueda de
     comida va por la rejilla (recorrer los 1.262 props en cada cuadro por cada
     llamada era lo único que quedaba costando O(mapa)). */
  autoMove:()=>{
    if(done||!holes.length)return false;
    const h=holes[0];
    if(!h.alive)return false;
    /* 1. HUIR del que me puede tragar (y con margen: 1,08 y no 1,15, así el piloto
       se va ANTES de estar en riesgo real) */
    let thr=null,td=1e9;
    for(const o of holes){
      if(o===h||!o.alive)continue;
      if(o.r<h.r*1.08)continue;
      const d=Math.hypot(o.x-h.x,o.z-h.z);
      if(d<o.r*4.5+10&&d<td){td=d;thr=o;}
    }
    if(thr){
      const dx=h.x-thr.x,dz=h.z-thr.z,L=Math.hypot(dx,dz)||1;
      /* no huir contra la pared: si el escape da contra el borde, se corre en
         diagonal (si no, el piloto quedaba acorralado y siempre lo comían) */
      let ex=dx/L,ez=dz/L;
      if(Math.abs(h.x+ex*12)>MAP-4)ex=-ex*.2,ez=ez>0?1:-1;
      if(Math.abs(h.z+ez*12)>MAP-4)ez=-ez*.2,ex=ex>0?1:-1;
      const L2=Math.hypot(ex,ez)||1;
      dirv.x=ex/L2;dirv.z=ez/L2;return true;
    }
    /* 2. CAZAR al rival que me puedo tragar, si está a mano */
    let prey=null,pd=1e9;
    for(const o of holes){
      if(o===h||!o.alive)continue;
      if(h.r<o.r*1.2)continue;                 /* 1,2 > 1,15: margen de seguridad */
      const d=Math.hypot(o.x-h.x,o.z-h.z);
      if(d<34&&d<pd){pd=d;prey=o;}
    }
    if(prey){
      const dx=(prey.x+prey.vx*.5)-h.x,dz=(prey.z+prey.vz*.5)-h.z,L=Math.hypot(dx,dz)||1;
      dirv.x=dx/L;dirv.z=dz/L;return true;
    }
    /* 3. COMER del barrio: por anillos en la rejilla, lo más grande que entre */
    let best=null,bd=1e9,any=null,ad=1e9;
    for(const R of [16,34,70]){
      gridNear(h.x,h.z,R,p=>{
        if(!live(p))return;
        const d=Math.hypot(p.x-h.x,p.z-h.z);
        if(d>R)return;
        if(d<ad){ad=d;any=p;}
        if(!canEat(h,p))return;
        const s=d-p.mass*.5;
        if(s<bd){bd=s;best=p;}
      });
      if(best)break;
    }
    const t=best||any;
    if(!t){                                    /* nada cerca: a otra zona */
      if(botW==null||Math.hypot(botW.x-h.x,botW.z-h.z)<6){
        const c=zoneCenter(Math.floor(Math.random()*ZONES.length));botW=c;
      }
      const dx=botW.x-h.x,dz=botW.z-h.z,L=Math.hypot(dx,dz)||1;
      dirv.x=dx/L;dirv.z=dz/L;return true;
    }
    const dx=t.x-h.x,dz=t.z-h.z,L=Math.hypot(dx,dz)||1;
    dirv.x=dx/L;dirv.z=dz/L;
    return true;
  }
};
G.i18nDone=function(){
  if(shopEl&&shopEl.classList.contains('on'))paintShop();
  if(!holes.length)return;
  ARC.trayTxt('goal','◎ '+goalTxt(true));
  infoCache='';hud(true);
};
window.GAME=G;
