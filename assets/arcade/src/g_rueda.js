/* ============================================================================
   RUEDA NEÓN — la pelota que corre por una pista de neón en el vacío
   ----------------------------------------------------------------------------
   La pelota avanza sola; el dedo la mueve de costado. La pista tiene AGUJEROS
   (te caés), MUROS (te frenan), SIERRAS que giran, COMPUERTAS que se abren y
   cierran con ritmo, RÁFAGAS de viento cruzado, RAMPAS DE IMPULSO y DIAMANTES
   para juntar. 8 niveles con pista fija (semilla por nivel: mismo nivel = misma
   pista, se aprende de memoria) y un ARCO DE CONTROL a la mitad que te devuelve
   una vez. Los diamantes se GASTAN en pelotas y cada nivel tiene tres MEDALLAS y
   su mejor tiempo.

   LO QUE HAY QUE SABER PARA TOCAR ESTE ARCHIVO
   --------------------------------------------
   · LA PISTA VA EN TROZOS FUSIONADOS (lo que la hizo rápida de verdad). Todo lo
     estático de un tramo de 48 m —baldosas, faldón, aristas de luz, travesaños,
     portales, rampas, muros, marcos de compuerta, chapas de aviso y las columnas
     del vacío— se hornea en UNA sola geometría con color por vértice. Cada trozo
     es UNA llamada de dibujo y sólo se dibujan los que están entre −14 m y
     +118 m de la pelota (la niebla se cierra en 132). MEDIDO con renderer.info en
     el nivel 8, 412×915: antes eran 3 mallas para los 390 m enteros y se
     dibujaban SIEMPRE completas → 24.530 triángulos, 45 llamadas, 44,5 fps
     mínimos y la resolución bajando sola a 0,9. Con trozos + instancias + cielo
     de CSS: 12.550 triángulos, 12 llamadas, 50,7 fps mínimos y la resolución al
     tope. Lo que se ahorró es lo que se gastó en el cielo y los arcos nuevos.
   · LEGIBILIDAD DE LA PISTA. Antes las baldosas eran Lambert oscuras con niebla
     negra: a 25 m la pista se fundía con el vacío y no se veía dónde estaba el
     borde ni el agujero (medido con snapGL: luz 34-39 con el 60% del cuadro en
     negro). Ahora cada celda emite ARISTAS de luz en cada lado que NO tiene
     vecina: eso contornea la pista Y el borde de cada agujero, que es lo que
     hace que el camino se lea de lejos.
     La niebla ya no es negra: es del color de la ZONA y arranca lejos, así la
     distancia se lee como BRUMA y no como pozo negro.
   · EL VACÍO YA NO ES UN POZO NEGRO, Y EL CIELO NO CUESTA NI UN CUADRO. El fondo
     es un DEGRADADO de la zona con bruma en la lejanía más 46 estrellas, y las
     dos cosas son CSS en el fondo del lienzo #gl (el renderer se rehace con
     alpha:true y limpia con alfa 0). Medido A/B con la misma partida y la
     resolución clavada (ab_rueda.js, nivel 5, 412×915): el mismo degradado como
     scene.background costaba 51,1 fps contra 60,0 sin él, y 240 estrellas en un
     THREE.Points otros 5 fps (en swiftshader llenar la pantalla de nuevo y
     dibujar gl.POINTS con mezcla es carísimo). En CSS lo compone el navegador una
     vez y sale gratis.
   · LO QUE SE MUEVE VA INSTANCIADO. Sierras, compuertas y diamantes son tres
     InstancedMesh; las visibles se empaquetan en los primeros índices y se baja
     `count`, así ni se dibujan ni cuentan triángulos las que están detrás de la
     bruma. En el nivel 8 eso pasó de ~42 llamadas de dibujo a 3.
   · RÁFAGAS (el peligro nuevo de las zonas altas, niveles 4 a 8): tramos de 15 m
     con el piso marcado donde el viento arrastra el DESTINO del dedo 1,05 m/s
     hacia un costado (empuja tx y NO bx: el viento nunca te mete de prepo en un
     agujero, sólo te desvía si te quedás quieto).
   · NADA DE GLB EN ESTE JUEGO. Los dos modelos generados (sierra y arco) pasan
     por el simplificador del motor y quedan en 383 y 304 triángulos: en pantalla
     son bollos de papel oscuros (capturas Z-saw5.png y Z-cparch.png del informe:
     el arco de control era un montón de esquirlas negras a los costados de la
     pista). Se cambiaron por geometría propia, teñida por zona, que además pesa
     2,5 MB menos de descarga y saca un paso de la pantalla de carga.
   · UNA ZONA POR NIVEL (TH8). Cada nivel trae su paleta completa (baldosas,
     aristas, niebla, cielo, columnas, color de peligro, color del arco y de los
     diamantes) y su nombre; el nivel 8 no se parece en nada al 1. La paleta se
     aplica ANTES de armar las mallas, porque los colores van horneados por
     vértice.
   · CINCO PELIGROS. muro (fijo), sierra (gira; algunas BARREN carriles),
     COMPUERTA (`puls`: una pared que sube y baja con ritmo propio; se cruza
     cuando está abajo — es el único peligro de TIEMPO, no de posición) y el
     vacío. Cada uno deja (a) chapa magenta con galón en las 2 baldosas
     anteriores, (b) sombra en su baldosa y (c) galón 2D pulsante proyectado en
     pantalla entre 3,5 y 27 m. A 11,3 m/s eso son 2,1 s de aviso. La ráfaga es
     el quinto y avisa distinto: alfombra oscura con flechas en el piso, aviso al
     entrar y rayas 2D cruzando la pantalla.
   · RAMPAS DE IMPULSO (boosts). Van SOBRE el camino garantizado, cada ~26 m y
     nunca a menos de 6 m de un peligro. Dan +45% de velocidad que decae en
     1,4 s (≈0,3 s de tiempo ganado cada una). Son lo que hace que el MEJOR
     TIEMPO por nivel se pueda mejorar: sin rampas el tiempo sería fijo
     (largo/velocidad) y la medalla de velocidad no significaría nada.
   · EL PUESTO DE CONTROL SE VE EN LA PISTA: es un ARCO de neón (dos pilonas con
     tira de luz y un dintel con tres barras) con una franja ancha cruzando la
     pista, y el arco y su franja NO tienen niebla, así se ven venir desde 150 m.
     Al pasarlo la franja cambia de ámbar a verde y el arco se enciende. La meta
     es otro arco, con cuadros de bandera a cuadros en el piso.
   · UNA SOLA VERDAD DE POSICIÓN. Antes `bx` era el destino Y el colisionador,
     mientras la pelota dibujada iba interpolada: se moría por una pared que en
     pantalla estaba a medio carril. Ahora `bx` es la posición REAL (se mueve a
     LSP m/s hacia `tx`, el destino que pide el dedo) y el choque se mide con
     `bx`. La pelota dibujada ES bx.
   · MARGEN DE REACCIÓN. Los primeros `clean` metros de cada nivel no tienen
     nada (34 en el 1, 22 en el 8) y la velocidad entra con rampa: 55% durante
     los primeros 2,6 s. Nunca se muere en el primer segundo.
   · CURVA DE DIFICULTAD EXPLÍCITA (tabla LV, no una fórmula): nivel 1 = 112 m a
     6 m/s sin sierras y sin pasillos angostos (19 s, lo pasa cualquiera);
     nivel 8 = 390 m a 11,3 m/s con sierras que barren y compuertas (35 s).
   · CAMINO GARANTIZADO. Se lleva un carril "camino" que se corre como máximo un
     carril cada `shift` metros y nunca se le hace un agujero ni se le pone un
     obstáculo; se protegen también los carriles del metro anterior y siguiente
     porque la pelota tarda 0,12 s en cruzar de carril y a 11 m/s eso es 1,4 m.
     Sin esto la pista aleatoria arma filas imposibles (medido: caída al vacío a
     los 41 m de 208 sin haber tocado nada evitable).
   · DIAMANTES = MONEDA. Se juntan de a tandas SOBRE el camino, cuentan para las
     estrellas (85% = 3, 55% = 2) y se GASTAN en pelotas (panel del botón ◆ del
     menú). Se guardan en ARC.S.coins (el motor ya muestra esa ficha en el menú;
     acá se le cambia el ícono a ◆) y el total de por vida en ARC.S.gems.
   · MEDALLAS por nivel, en ARC.S.med[nivel] como bits: 1 = llegaste sin usar el
     arco de control, 2 = todos los diamantes, 4 = por debajo del tiempo par.
     El mejor tiempo va en ARC.S.tLv[nivel] y se muestra en el HUD, en el remate
     y en el panel.
   · MODO ATRACCIÓN (GAME.attract): el motor lo llama en cada cuadro mientras el
     menú está abierto. Es la MISMA pista y el MISMO piloto: la pelota corre
     sola con una cámara que orbita lento. No suena, no guarda nada y no mata
     (die() reaparece 6 m atrás). Con el menú vivo el motor apaga el arte de
     fondo, así que el CSS de acá devuelve el título de DOM (`.hasart.live`).
   · EL PILOTO (dbg.autoMove) hace programación dinámica sobre 16 filas con la
     velocidad LATERAL real (una fila no alcanza para cambiar de carril a 11 m/s:
     hacen falta 1,7) y predice dónde va a estar la sierra que barre y si la
     compuerta va a estar abierta cuando la pelota llegue. Los obstáculos están
     INDEXADOS POR z (obsZ) y cada casillero se cachea: antes cada plan barría
     los 95 obstáculos del nivel 8 hasta 240 veces y el piloto solo se comía la
     mitad del cuadro (medido: 20,6 fps con el piloto encendido contra 47-60 sin
     él, con la misma escena).
   · SIN MSAA. El motor crea el renderer con antialias:true y en swiftshader eso
     cuesta la mitad de los cuadros; acá se rehace el renderer sin MSAA (ver
     fastGL) y se baja la resolución sola si la máquina no llega (autoRes).
   ========================================================================== */
const G={
  slug:'rueda',name:'RUEDA NEON',
  title:'RUEDA <em>NEÓN</em>',
  sub:'Pista de neón en el vacío: esquivá agujeros, muros, sierras y compuertas, juntá diamantes y llegá a la meta.',
  subKey:'sub',
  acc:'#22d3ee',acc2:'#0891b2',levels:8,bestLabel:'METROS',bestKey:'metL',
  three:true,sky:'#04070e',shadows:false,
  art:A('art-rueda.jpg'),music:A('mus-r14.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),
       lose:A('sfx-lose.mp3'),boom:A('sfx-boom.mp3'),power:A('sfx-power.mp3'),chime:A('sfx-chime.mp3'),
       gem:A('sfx-rueda-gem.mp3'),saw:A('sfx-rueda-saw.mp3'),check:A('sfx-rueda-check.mp3'),
       gate:A('sfx-rueda-gate.mp3')},
  /* SIN GLB a propósito (ver la cabecera): los modelos generados quedan en bollos
     de 300-400 triángulos y la pista es de neón, no de fotos. */
  i18n:{
    es:{sub:'Pista de neón en el vacío: esquivá agujeros, muros, sierras y compuertas, juntá diamantes y llegá a la meta. 8 zonas, ráfagas de viento y arco de control a la mitad.',
      metL:'METROS',tutDrag:'ARRASTRÁ PARA MOVERTE',tutSide:'o usá ◀ ▶',
      cpGot:'ARCO DE CONTROL',cpBack:'¡VOLVÉS AL ARCO!',goal:'¡META!',
      dFall:'AL VACÍO',dHit:'CHOCASTE',dSaw:'TE CORTÓ LA SIERRA',dGate:'TE CERRÓ LA COMPUERTA',
      statMet:'Metros',statGems:'Diamantes',usedCp:'Usaste el arco de control',
      warn:'¡PELIGRO!',gemsAll:'¡TODOS LOS DIAMANTES!',newRec:'¡NUEVO RÉCORD!',
      boost:'¡IMPULSO!',statTime:'Tiempo',statBest:'Mejor',newTime:'¡RÉCORD DE TIEMPO!',
      gust:'RÁFAGA',
      almost:'¡CASI!',zone:'ZONA',medals:'MEDALLAS',medNew:'¡MEDALLA NUEVA!',
      music:'MÚSICA',mAuto:'AUTOMÁTICO',mAutoD:'la música que le toca a cada zona',mExtra:'extra',
      t01:'Cielo Abierto',t02:'Ruta Nocturna',t03:'Isla Neón',t04:'Estadio',
      t05:'Caramelo',t06:'Escarcha',t07:'Fundición',t08:'Coronación',
      t09:'Corriente',t10:'Muro de Pared',t11:'Atardecer 84',t12:'Circuito Roto',
      t13:'Ascenso',t14:'Sala de Espera',t15:'Ficha Extra',
      medClean:'Sin usar el arco',medGems:'Todos los diamantes',medFast:'Bajo el tiempo par',
      balls:'PELOTAS',use:'USAR',inUse:'EN USO',buy:'COMPRAR',locked:'Te faltan diamantes',
      bought:'¡DESBLOQUEADA!',close:'CERRAR',gemsTot:'juntados',parT:'Par',
      b1:'SOL',b2:'HIELO',b3:'BRASA',b4:'TÓXICA',b5:'VIOLETA',b6:'ORO',
      z1:'CIAN',z2:'VIOLETA',z3:'SELVA',z4:'ÁMBAR',z5:'ROSA',z6:'HIELO',z7:'LAVA',z8:'ORO',
      allMed:'¡LAS TRES MEDALLAS!',lock:'Superá el nivel anterior'},
    en:{sub:'A neon track in the void: dodge holes, walls, saws and gates, grab diamonds and reach the goal. 8 zones, crosswinds and one checkpoint arch halfway.',
      metL:'METRES',tutDrag:'DRAG TO MOVE',tutSide:'or use ◀ ▶',
      cpGot:'CHECKPOINT ARCH',cpBack:'BACK TO THE ARCH!',goal:'GOAL!',
      dFall:'INTO THE VOID',dHit:'CRASHED',dSaw:'THE SAW GOT YOU',dGate:'THE GATE SHUT ON YOU',
      statMet:'Metres',statGems:'Diamonds',usedCp:'You used the checkpoint',
      warn:'DANGER!',gemsAll:'ALL THE DIAMONDS!',newRec:'NEW BEST!',
      boost:'BOOST!',statTime:'Time',statBest:'Best',newTime:'BEST TIME!',
      gust:'CROSSWIND',
      almost:'SO CLOSE!',zone:'ZONE',medals:'MEDALS',medNew:'NEW MEDAL!',
      music:'MUSIC',mAuto:'AUTOMATIC',mAutoD:'the track that belongs to each zone',mExtra:'extra',
      t01:'Open Sky',t02:'Night Route',t03:'Neon Island',t04:'Stadium',
      t05:'Candy',t06:'Frost',t07:'Foundry',t08:'Coronation',
      t09:'Current',t10:'Wall of Kicks',t11:'Sunset 84',t12:'Broken Circuit',
      t13:'Ascent',t14:'Waiting Room',t15:'Extra Coin',
      medClean:'No checkpoint used',medGems:'Every diamond',medFast:'Under par time',
      balls:'BALLS',use:'USE',inUse:'IN USE',buy:'BUY',locked:'Not enough diamonds',
      bought:'UNLOCKED!',close:'CLOSE',gemsTot:'collected',parT:'Par',
      b1:'SUN',b2:'ICE',b3:'EMBER',b4:'TOXIC',b5:'VIOLET',b6:'GOLD',
      z1:'CYAN',z2:'VIOLET',z3:'JUNGLE',z4:'AMBER',z5:'PINK',z6:'ICE',z7:'LAVA',z8:'GOLD',
      allMed:'ALL THREE MEDALS!',lock:'Beat the previous level'},
    pt:{sub:'Pista de neon no vazio: desvie de buracos, muros, serras e portões, junte diamantes e chegue à meta. 8 zonas, rajadas de vento e arco de controle no meio.',
      metL:'METROS',tutDrag:'ARRASTE PARA MOVER',tutSide:'ou use ◀ ▶',
      cpGot:'ARCO DE CONTROLE',cpBack:'VOLTA AO ARCO!',goal:'META!',
      dFall:'NO VAZIO',dHit:'VOCÊ BATEU',dSaw:'A SERRA TE PEGOU',dGate:'O PORTÃO FECHOU EM VOCÊ',
      statMet:'Metros',statGems:'Diamantes',usedCp:'Você usou o arco de controle',
      warn:'PERIGO!',gemsAll:'TODOS OS DIAMANTES!',newRec:'NOVO RECORDE!',
      boost:'IMPULSO!',statTime:'Tempo',statBest:'Melhor',newTime:'RECORDE DE TEMPO!',
      gust:'RAJADA',
      almost:'QUASE!',zone:'ZONA',medals:'MEDALHAS',medNew:'MEDALHA NOVA!',
      music:'MÚSICA',mAuto:'AUTOMÁTICO',mAutoD:'a música de cada zona',mExtra:'extra',
      t01:'Céu Aberto',t02:'Rota Noturna',t03:'Ilha Neon',t04:'Estádio',
      t05:'Caramelo',t06:'Geada',t07:'Fundição',t08:'Coroação',
      t09:'Correnteza',t10:'Muro de Batidas',t11:'Poente 84',t12:'Circuito Quebrado',
      t13:'Subida',t14:'Sala de Espera',t15:'Ficha Extra',
      medClean:'Sem usar o arco',medGems:'Todos os diamantes',medFast:'Abaixo do tempo par',
      balls:'BOLAS',use:'USAR',inUse:'EM USO',buy:'COMPRAR',locked:'Faltam diamantes',
      bought:'DESBLOQUEADA!',close:'FECHAR',gemsTot:'juntados',parT:'Par',
      b1:'SOL',b2:'GELO',b3:'BRASA',b4:'TÓXICA',b5:'VIOLETA',b6:'OURO',
      z1:'CIANO',z2:'VIOLETA',z3:'SELVA',z4:'ÂMBAR',z5:'ROSA',z6:'GELO',z7:'LAVA',z8:'OURO',
      allMed:'AS TRÊS MEDALHAS!',lock:'Passe o nível anterior'}
  }
};
/* OJO: el shell ya declara `const T=ARC.T` en este mismo ámbito de módulo.
   Redeclararlo tira "Identifier 'T' has already been declared" y el juego entero
   no arranca. Se usa el T del shell. */

/* --------------------------------------------------------------- constantes */
const LANES=5,CW=1.25,HALF=(LANES-1)/2*CW;   /* 5 carriles de 1,25 → pista 6,25 */
/* TROZOS DE PISTA: 48 m por trozo, se dibuja de −14 m a +118 m de la pelota. Con
   trozos más chicos se ahorran triángulos pero suben las llamadas de dibujo; con
   48 m quedan 4 trozos vivos (4 llamadas) y ~8,7 k triángulos en el nivel 8. */
const CH=48,VISZ=118,BEHZ=14;
const ARCHZ=150;                             /* hasta acá se dibujan los arcos */
const BR=.42;                                /* radio de la pelota */
const LSP=10.5;                              /* velocidad LATERAL (u/s): 0,12 s por carril */
const TH=.26;                                /* espesor de la baldosa */
const BOOSTT=1.4,BOOSTK=.45;                 /* la rampa dura 1,4 s y da +45% */
/* CURVA DE DIFICULTAD, a mano y medida con el piloto (ver informe):
   len metros · spd m/s · clean metros limpios al empezar · shift metros mínimos
   entre corrimientos del camino · hole/narrow/wall/saw/puls/mov probabilidad por
   metro · ring cada cuántos metros va un PORTAL (0 = ninguno) · gust cuántas
   RÁFAGAS (tramos con viento cruzado) trae el nivel
   (los diamantes y las rampas van por reparto fijo, ver más abajo) */
const LV=[
  {len:112,spd:6.0 ,clean:34,shift:5,hole:.10,narrow:0  ,wall:.055,saw:0   ,puls:0   ,mov:0  ,ring:0 ,gust:0},
  {len:140,spd:6.7 ,clean:30,shift:4,hole:.14,narrow:.04,wall:.075,saw:.03 ,puls:0   ,mov:0  ,ring:0 ,gust:0},
  {len:172,spd:7.4 ,clean:28,shift:4,hole:.18,narrow:.07,wall:.090,saw:.055,puls:0   ,mov:0  ,ring:28,gust:0},
  {len:205,spd:8.1 ,clean:26,shift:3,hole:.22,narrow:.10,wall:.100,saw:.075,puls:.030,mov:0  ,ring:24,gust:1},
  {len:240,spd:8.8 ,clean:26,shift:3,hole:.25,narrow:.13,wall:.105,saw:.085,puls:.045,mov:0  ,ring:20,gust:1},
  {len:280,spd:9.6 ,clean:24,shift:3,hole:.28,narrow:.16,wall:.110,saw:.095,puls:.055,mov:.05,ring:18,gust:2},
  {len:330,spd:10.4,clean:24,shift:3,hole:.31,narrow:.19,wall:.115,saw:.105,puls:.065,mov:.07,ring:16,gust:2},
  {len:390,spd:11.3,clean:22,shift:3,hole:.34,narrow:.22,wall:.120,saw:.115,puls:.075,mov:.09,ring:14,gust:3}
];
/* RÁFAGA (viento cruzado), el peligro nuevo de las zonas altas. No es un bicho: es
   un TRAMO de 15 m con el piso rayado y flechas, donde el viento arrastra el
   DESTINO del dedo (tx) 1,05 m/s hacia un costado. Hay que sostener el dedo contra
   el viento: los 15 m a 9,6 m/s son 1,6 s y el arrastre suma ~1,6 m, o sea un
   carril y cuarto. Empuja tx y NO bx a propósito: así el viento nunca te mete de
   prepo en un agujero (eso sería una muerte que el jugador no puede evitar), lo
   que hace es desviarte si te quedás quieto. */
const WINDV=1.05;
/* CUÁNTAS RAMPAS DE IMPULSO lleva cada nivel: una cada 24 m de pista útil. Es
   una cuenta cerrada (no depende de dónde caigan) para que el TIEMPO PAR se
   pueda calcular sin armar la pista (lo necesita el panel de medallas). */
const nbOf=n=>{const P=LV[clamp(n,1,8)-1];return Math.max(2,Math.floor((P.len-P.clean-20)/24));};
/* TIEMPO PAR. Sin tocar ninguna rampa la pelota tarda largo/velocidad + 0,55 s
   (los primeros 2,6 s van al 55-100%). Cada rampa ahorra ~0,31 s. El par exige
   más o menos un TERCIO de las rampas: se puede ganar el nivel sin apurarse y
   la medalla ⚡ pide jugar bien las rampas. */
const parOf=n=>{const P=LV[clamp(n,1,8)-1];
  return +(P.len/P.spd+.55-nbOf(n)*.11).toFixed(1);};

/* ---------------------------------------------------------- ZONAS (una por nivel)
   Cada fila: t0 t1 skirt rail bar fog sky prop propTop danger cp gem.
   Los colores van HORNEADOS por vértice en las mallas fusionadas, así que la
   paleta se elige antes de armar la pista (setTheme en buildTrack). */
const THK=['t0','t1','skirt','rail','bar','fog','sky','prop','propTop','danger','cp','gem'];
const TH8=[
/*1 cian   */['#2aa9cb','#1d8bab','#0b4b60','#8ff4ff','#3fd8f0','#0a2b3c','#04070e','#071a26','#0f303f','#ff2d78','#ffb03a','#c9f7ff'],
/*2 violeta*/['#6d4fd0','#553cae','#2a1a5e','#cdb4ff','#9a7bff','#190f42','#07050f','#120e38','#221a58','#ff3d6e','#ffc247','#e6d6ff'],
/*3 selva  */['#3fb56b','#2f8f55','#0f4a2c','#b6ffcf','#62e08f','#06331f','#030b06','#062117','#0d3b27','#ff2d78','#ffcf3a','#dfffe9'],
/*4 ámbar  */['#d3913a','#ae722a','#5a3510','#ffe3a8','#ffb648','#3a2408','#0d0703','#221609','#3b2712','#ff2f5f','#4ad9ff','#fff0c2'],
/*5 rosa   */['#c74f9e','#a13c80','#5c1543','#ffc7ec','#ff74c8','#3a0d2c','#0c040a','#26091d','#401231','#ffd23f','#4affc0','#ffe6f7'],
/*6 hielo  */['#4a6fd0','#3a56a8','#16265e','#c3daff','#6f9bff','#0a1740','#030612','#0a1231','#152351','#ff3d6e','#ffbb3a','#eaf3ff'],
/*7 lava   */['#c74a3a','#a33628','#5c1a10','#ffc7ae','#ff7a4d','#390f08','#0c0403','#260c08','#3f1a10','#ffe14d','#4affd2','#ffe0cf'],
/*8 oro    */['#cdba55','#a5943c','#4e4212','#fff5b8','#ffe066','#2e2a08','#0a0903','#201d08','#38330f','#ff2d78','#59f0ff','#fffbe0']
];
const FIXP={shadow:'#04121a',cpOn:'#43e57a',boost:'#3dffa8'};
function hx(h){h=h.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function toHx(a){return '#'+a.map(v=>('0'+clamp(Math.round(v),0,255).toString(16)).slice(-2)).join('');}
function mixc(a,b,k){const A=hx(a),B=hx(b);return toHx([0,1,2].map(i=>A[i]+(B[i]-A[i])*k));}
let PAL=Object.assign({},FIXP);
function setTheme(n){
  const a=TH8[clamp(n,1,8)-1];
  PAL=Object.assign({},FIXP);
  THK.forEach((k,i)=>PAL[k]=a[i]);
  PAL.dangerD=mixc(PAL.danger,'#000000',.66);
  PAL.wall=PAL.danger;
  PAL.wallTop=mixc(PAL.danger,'#ffffff',.62);
  PAL.fin=mixc(PAL.rail,'#000000',.45);
  PAL.ring=PAL.rail;
}
const zoneName=n=>T('z'+clamp(n,1,8));

/* ------------------------------------------------------------------- PELOTAS
   Cosméticas (nada de ventajas: la dificultad tiene que significar lo mismo
   para todos) y se pagan con DIAMANTES. c = color, e = emisiva, g = resplandor,
   sh = sombra en el piso, sp = deja chispas. */
const BALLS=[
  {id:'sol' ,k:'b1',c:'#ffc95c',e:'#5a3200',g:'#ffd98a',sh:'#7ef0ff',cost:0  ,sp:0},
  {id:'hielo',k:'b2',c:'#9fe8ff',e:'#0b3d52',g:'#d8f6ff',sh:'#9fe8ff',cost:30 ,sp:0},
  {id:'brasa',k:'b3',c:'#ff7a45',e:'#5c1400',g:'#ffb08a',sh:'#ff9c6b',cost:70 ,sp:0},
  {id:'toxi' ,k:'b4',c:'#b6ff4d',e:'#254d00',g:'#dcffa8',sh:'#b6ff4d',cost:130,sp:0},
  {id:'viol' ,k:'b5',c:'#c08bff',e:'#2c0b52',g:'#e6d0ff',sh:'#c08bff',cost:220,sp:1},
  {id:'oro'  ,k:'b6',c:'#ffe066',e:'#5c4300',g:'#fff3b0',sh:'#ffe066',cost:340,sp:1}
];
const ownedB=()=>Array.isArray(ARC.S.balls)?ARC.S.balls:(ARC.S.balls=['sol']);
const hasB=id=>ownedB().indexOf(id)>=0;
function ballIdx(){const i=BALLS.findIndex(b=>b.id===ARC.S.ball);return i<0||!hasB(BALLS[i].id)?0:i;}
const curBall=()=>BALLS[ballIdx()];

/* ------------------------------------------------------------------ MEDALLAS */
const MEDS=[{bit:1,ic:'✔',k:'medClean'},{bit:2,ic:'◆',k:'medGems'},{bit:4,ic:'⚡',k:'medFast'}];
function medOf(n){const m=ARC.S.med||{};return m[String(n)]|0;}
function medAdd(n,mask){
  if(!ARC.S.med)ARC.S.med={};
  const k=String(n),had=ARC.S.med[k]|0;
  ARC.S.med[k]=had|mask;
  return (had|mask)&~had;               /* los bits NUEVOS de esta partida */
}
function bestT(n){const t=ARC.S.tLv||{};return t[String(n)]||0;}
function setBestT(n,s){
  if(!ARC.S.tLv)ARC.S.tLv={};
  const k=String(n),b=ARC.S.tLv[k]||0;
  if(!b||s<b){ARC.S.tLv[k]=+s.toFixed(2);return true;}
  return false;
}
/* 12,4 s en castellano y portugués; 12.4 s en inglés */
function fmtT(s){const v=(+s).toFixed(1);return (ARC.lang&&ARC.lang()==='en'?v:v.replace('.',','))+' s';}

let T3,scene,cam,ball,ballGlow,ballSh,trackG,dynG,skyG,stars,skyTex;
let chunks=[];                               /* una malla fusionada por tramo de 48 m */
let sawIM,gateIM,gemIM;                      /* lo que se mueve, instanciado */
let cells=[],obs=[],obsZ=[],gems=[],boosts=[],pathL=[],sawG=[],winds=[];
const NOOBS=[];
let cpArch=null,finArch=null,cpBand=null,cpBandOn=null;
let lvl=1,LEN=0,SPD=0,CPZ=0,PAR=0;
let bx=0,tx=0,bz=0,vz=0,fallV=0,dead=0,won=false,drag=null;
let pbx=0,pbz=0,hudM=-1;                     /* estado anterior: interpolación al dibujar */
let gemN=0,gemT=0,cpOn=0,cpUsed=0,tilt=0,warm=0,lastDie='',dieK='';
let botOn=0,sawSnd=0,recTold=false,runT=0,boostT=0,boostN=0,windOn=0;
let DEMO=0,demoOn=0,demoRe=0;
let partK=1,fogK=1,decoK=1,chVis=0,cssSky=false;
const MAT={},GEO={},V3=[];
function vec(){if(!V3.length)V3.push(new T3.Vector3());return V3[0];}
function mat(c,e){const k=c+(e?'e':'');if(MAT[k])return MAT[k];
  return MAT[k]=e?new T3.MeshBasicMaterial({color:new T3.Color(c)})
                 :new T3.MeshLambertMaterial({color:new T3.Color(c)});}
function box(w,h,d){const k=w+'_'+h+'_'+d;return GEO[k]||(GEO[k]=new T3.BoxGeometry(w,h,d));}
function octa(r){const k='o'+r;return GEO[k]||(GEO[k]=new T3.OctahedronGeometry(r));}
function C(h){const c=new T3.Color(h);return[c.r,c.g,c.b];}
/* en el menú no suena nada: el modo atracción es decorado, no partida */
function sfx(n,o){if(!DEMO)ARC.sfx(n,o);}
/* --- malla fusionada: junto miles de caras en UNA geometría con color por
   vértice, así toda la pista son 3 llamadas de dibujo y no 900 --- */
function A0(){return{p:[],c:[]};}
function Q(A,a,b,c,d,col){
  const t=[a,b,c,a,c,d];
  for(const v of t){A.p.push(v[0],v[1],v[2]);A.c.push(col[0],col[1],col[2]);}
}
function TRI(A,a,b,c,col){
  for(const v of [a,b,c]){A.p.push(v[0],v[1],v[2]);A.c.push(col[0],col[1],col[2]);}
}
function bq(A,x,y,z,w,h,d,ct,cs){          /* caja (5 caras, sin fondo) */
  const x0=x-w/2,x1=x+w/2,y0=y,y1=y+h,z0=z-d/2,z1=z+d/2;
  Q(A,[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],ct);
  Q(A,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],cs);
  Q(A,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],cs);
  Q(A,[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],cs);
  Q(A,[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],cs);
}
function plate(A,x,z,w,d,y,col){           /* chapa horizontal */
  Q(A,[x-w/2,y,z+d/2],[x+w/2,y,z+d/2],[x+w/2,y,z-d/2],[x-w/2,y,z-d/2],col);
}
/* FLECHA en el piso apuntando a un costado (dir −1 / +1): un triángulo (1 solo
   triángulo) más la cola. La primera versión de la ráfaga las armaba con tres
   chapas rectangulares y en pantalla se leían como cuadraditos sueltos, no como
   flechas (captura SC-rafaga2.png de esa vuelta). El orden de los vértices manda
   la cara: con dz y dx del mismo signo la normal sale hacia ARRIBA. */
function arrow(A,x,z,y,ln,wd,dir,col){
  const x0=x-dir*ln*.35,x1=x+dir*ln*.65;
  if(dir>0)TRI(A,[x0,y,z-wd],[x0,y,z+wd],[x1,y,z],col);
  else       TRI(A,[x0,y,z+wd],[x0,y,z-wd],[x1,y,z],col);
  plate(A,x-dir*ln*.55,z,ln*.5,wd*.55,y,col);
}
function meshOf(A,fog,op){
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.Float32BufferAttribute(A.p,3));
  g.setAttribute('color',new T3.Float32BufferAttribute(A.c,3));
  g.computeBoundingSphere();
  /* FrontSide a propósito: todas las caras se emiten con el giro correcto (probado
     cara por cara con el producto vectorial), así el rasterizador descarta la
     mitad. Con DoubleSide el celular pintaba dos veces cada columna del vacío. */
  const m=new T3.MeshBasicMaterial({vertexColors:true,side:T3.FrontSide,fog:fog!==false});
  if(op!=null){m.transparent=true;m.opacity=op;}
  const me=new T3.Mesh(g,m);me.userData.own=1;return me;
}
/* ------------------------------------------------------------------ EL CIELO
   Degradado de la zona en un canvas de 8×256 usado como scene.background: cero
   triángulos, una llamada, y el vacío deja de ser un rectángulo negro. Arriba el
   color de cielo de la zona, abajo un resplandor del color de la niebla (así el
   horizonte no tiene costura con la bruma de la pista). */
/* Los topes del degradado, iguales para el CSS y para la textura de respaldo.
   OJO CON EL SENTIDO: 0% es ARRIBA de la pantalla. La primera versión tenía el
   resplandor al final y salió con la franja brillante ABAJO, o sea DEBAJO de la
   pista, en el vacío (captura A-rueda-mid-h.png de esa vuelta). El horizonte de
   este juego cae al 21% del alto (medido con el encuadre CAMY/AIM), así que el
   resplandor va ahí y para abajo se apaga. */
function skyStops(){
  return[[0,mixc(PAL.sky,'#000000',.45)],[.10,PAL.sky],
    [.14,mixc(PAL.fog,PAL.sky,.45)],
    [.225,mixc(PAL.fog,PAL.rail,.22)],          /* la bruma lejana, difusa */
    [.32,mixc(PAL.fog,PAL.sky,.25)],
    [.55,mixc(PAL.sky,'#000000',.5)],
    [1,mixc(PAL.sky,'#000000',.78)]];
}
/* EL CIELO SE PINTA CON CSS, NO CON WebGL. Medido A/B en el nivel 5 a 412×915 con
   la resolución clavada (ab_rueda.js): con el degradado como scene.background —o
   sea un rectángulo de pantalla completa con textura— 51,1 fps; sin él, 60,0. En
   swiftshader llenar la pantalla otra vez cuesta el 17% del cuadro.
   La solución: el renderer se rehace con alpha:true y limpia con alfa 0 (fastGL),
   el degradado va como background del lienzo #gl y lo compone el navegador una
   sola vez. Sale gratis y se ve igual. Si por lo que sea no se pudo rehacer el
   renderer, se cae a la textura (feo pero nunca negro). */
/* LAS ESTRELLAS TAMBIÉN SON CSS. Medido A/B con la misma partida y la resolución
   clavada (ab_rueda.js, nivel 5, 412×915): con 240 estrellas en un THREE.Points
   49,8 fps, sin ellas 54,8. Cinco cuadros por 240 puntitos no se pagan: en
   swiftshader gl.POINTS con mezcla cuesta carísimo. Puestas como radial-gradient
   en el mismo fondo del lienzo salen gratis (el navegador pinta esa capa UNA vez)
   y ni se nota que no tienen paralaje: están a 100 m. */
let starCss='';
function buildStarCss(){
  const R=rng(20260731);const a=[];
  for(let i=0;i<46;i++){
    const x=(R()*100).toFixed(1),y=(R()*R()*34).toFixed(1);   /* apiñadas arriba */
    const s=(R()<.25?1.8:1.1).toFixed(1),o=(.35+R()*.5).toFixed(2);
    a.push('radial-gradient('+s+'px '+s+'px at '+x+'% '+y+'%,rgba(255,255,255,'+o+') 0,rgba(255,255,255,0) 100%)');
  }
  starCss=a.join(',');
}
function setSky(){
  const st=skyStops();
  if(cssSky){
    const gl=document.getElementById('gl');
    if(!starCss)buildStarCss();
    if(gl)gl.style.background=starCss+',linear-gradient(180deg,'+
      st.map(s=>s[1]+' '+(s[0]*100).toFixed(1)+'%').join(',')+')';
    scene.background=null;
    if(stars)stars.visible=false;
  }else{
    const cv=document.createElement('canvas');cv.width=8;cv.height=256;
    const g=cv.getContext('2d');
    const gr=g.createLinearGradient(0,0,0,256);
    st.forEach(s=>gr.addColorStop(s[0],s[1]));
    g.fillStyle=gr;g.fillRect(0,0,8,256);
    const t=new T3.CanvasTexture(cv);
    if(T3.SRGBColorSpace)t.colorSpace=T3.SRGBColorSpace;
    if(skyTex)skyTex.dispose();
    skyTex=t;scene.background=t;
  }
  if(stars)stars.material.color.set(mixc(PAL.rail,'#ffffff',.5));
}
/* 240 estrellas en UN THREE.Points (una llamada, cero triángulos) metidas en un
   grupo que sigue a la cámara: es un cielo, no decorado de la pista. */
function buildStars(){
  const N=240,p=new Float32Array(N*3);
  const R=rng(77);
  for(let i=0;i<N;i++){
    const a=R()*TAU,r=40+R()*140,y=6+R()*70;
    p[i*3]=Math.cos(a)*r;p[i*3+1]=y;p[i*3+2]=-Math.abs(Math.sin(a))*r-20;
  }
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.Float32BufferAttribute(p,3));
  const m=new T3.PointsMaterial({color:new T3.Color('#cfe9ff'),size:1.7,
    sizeAttenuation:false,transparent:true,opacity:.85,fog:false});
  stars=new T3.Points(g,m);
  skyG=new T3.Group();skyG.add(stars);scene.add(skyG);
}
/* --------------------------------------------------- generador determinista */
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const lx=i=>(i-(LANES-1)/2)*CW;
function clearG(g){while(g.children.length){const c=g.children[0];g.remove(c);
  if(c.geometry&&c.userData.own)c.geometry.dispose();}}
function buildTrack(n){
  const P=LV[clamp(n,1,8)-1];
  LEN=P.len;SPD=P.spd;CPZ=Math.round(LEN/2);PAR=parOf(n);
  setTheme(n);
  const R=rng(4177+n*977);
  cells=[];obs=[];obsZ=[];gems=[];boosts=[];pathL=[];sawG=[];winds=[];
  clearG(trackG);clearG(dynG);
  chunks=[];
  /* 1) camino garantizado */
  let lane=Math.floor(LANES/2),lastSh=-99;
  for(let z=0;z<=LEN+2;z++){
    if(z>P.clean&&z<LEN-8&&z-lastSh>=P.shift&&R()<.62){
      const nl=clamp(lane+(R()<.5?-1:1),0,LANES-1);
      if(nl!==lane){lane=nl;lastSh=z;}
    }
    pathL.push(lane);
  }
  /* 2) filas: agujeros y pasillos, nunca sobre el camino ni sus vecinos en z */
  for(let z=0;z<=LEN+2;z++){
    const row=new Array(LANES).fill(1);
    const keep={};keep[pathL[Math.max(0,z-1)]]=1;keep[pathL[z]]=1;keep[pathL[Math.min(LEN+2,z+1)]]=1;
    if(z>P.clean&&z<LEN-6){
      if(R()<P.hole){
        const k=1+Math.floor(R()*2);
        for(let i=0;i<k;i++){const c=Math.floor(R()*LANES);if(!keep[c])row[c]=0;}
      }
      if(R()<P.narrow){
        for(let i=0;i<LANES;i++)if(!keep[i]&&Math.abs(i-pathL[z])>1)row[i]=0;
      }
    }
    cells.push(row);
  }
  /* 3) obstáculos y diamantes */
  let gemRun=0,lastGem=-99;
  for(let z=0;z<=LEN;z++){
    if(z>P.clean&&z<LEN-6){
      const free=[];for(let i=0;i<LANES;i++)if(!keepAt(z,i)&&cells[z][i])free.push(i);
      /* JUSTICIA: no se tapa un carril en una fila que ya está casi cerrada. Sin
         esto el nivel 7 armaba la fila 184 = 10011 CON un muro en el 3: quedaban
         abiertos sólo el 0 y el 4, con el peligro justo en el medio, y había que
         comprometerse cuatro filas antes (ahí murió el piloto al 56%). Ahora todo
         obstáculo exige 3 carriles sólidos: siempre quedan dos salidas. */
      const openN=cells[z].reduce((s,v)=>s+v,0);
      if(openN<3)free.length=0;
      const r=R();
      if(free.length&&r<P.wall){
        const i=free[Math.floor(R()*free.length)];
        obs.push({t:'wall',i,z,x:lx(i),w:CW*.46,amp:0,ph:0,sp:0});
      }else if(free.length&&r<P.wall+P.saw){
        const i=free[Math.floor(R()*free.length)];
        obs.push({t:'saw',i,z,x:lx(i),w:.50,amp:0,ph:R()*TAU,sp:0});
      }else if(free.length&&r<P.wall+P.saw+P.puls){
        /* COMPUERTA: el único peligro de TIEMPO. Sube y baja con su propio ritmo
           (1,5-2,1 s) y está cerrada el 45% del tiempo; se cruza cuando está
           abajo. Nunca dos seguidas a menos de 3 m, para que la lectura del
           ritmo alcance. */
        const i=free[Math.floor(R()*free.length)];
        /* NUNCA una compuerta donde el camino se está corriendo. MEDIDO con el
           piloto en el nivel 7: la línea iba 4→3→2 en las filas 263 y 266 y había
           una compuerta en la 267; hay que cambiar dos carriles en 4 filas (a
           10,4 m/s un carril cuesta 2) y encima acertarle al ritmo de la
           compuerta: caída al vacío en la 266,5 en las dos corridas. Con el
           camino quieto ±2 filas alrededor, el peligro de TIEMPO no se junta con
           el de POSICIÓN. */
        if(noObsNear(z,3)&&pathStable(z,2))obs.push({t:'puls',i,z,x:lx(i),w:CW*.46,amp:0,ph:R()*3,sp:0,per:1.5+R()*.6});
      }else if(r<P.wall+P.saw+P.puls+P.mov&&rowSolid(z)&&noObsNear(z,3)&&pathStable(z,2)){
        /* SIERRA QUE BARRE: sólo en filas enteras (siempre hay escape a los
           costados) y a 2 carriles del camino, con amplitud 1,45·CW para que sí
           llegue a invadir el carril bueno: la esquivás moviéndote, no rezando */
        const cand=[];for(let i=0;i<LANES;i++)if(Math.abs(i-pathL[z])>=2)cand.push(i);
        if(cand.length){
          const i=cand[Math.floor(R()*cand.length)];
          obs.push({t:'saw',i,z,x:lx(i),w:.50,amp:CW*1.45,ph:R()*TAU,sp:1.5+R()*.5});
        }
      }
      /* DIAMANTES: tandas de 3 a 5 SOBRE el camino, una cada 13-16 m. Antes salían
         por probabilidad y el nivel 1 quedaba con 6 diamantes mientras el 2 tenía
         22 (medido con dbg.state): con tan pocos, el 85% para las 3 estrellas
         obligaba a juntar TODOS. Con reparto fijo la cuenta es proporcional al
         largo del nivel y las estrellas significan lo mismo en los 8 niveles. */
      if(gemRun>0){gemRun--;gems.push({z,i:pathL[z],x:lx(pathL[z]),got:0});}
      else if(z-lastGem>=13+Math.floor(R()*4)){gemRun=3+Math.floor(R()*3);lastGem=z;}
    }
  }
  gemT=gems.length;
  /* 3b) índice por z: el piloto y los choques miran 3 casilleros en vez de los
     95 obstáculos del nivel (ver el comentario de arriba sobre el piloto) */
  for(const o of obs)(obsZ[o.z]||(obsZ[o.z]=[])).push(o);
  /* 3c) RAMPAS DE IMPULSO: una cada 24 m SOBRE el camino garantizado. Se busca la
     primera fila del tramo que esté lejos de un peligro, y si el nivel viene tan
     cargado que no hay ninguna a 4 m se afloja a 3 y a 2 (medido: con "6 m de
     margen" fijo el nivel 8 se quedaba con UNA sola rampa en 390 m y la medalla
     de velocidad era imposible). */
  const nb=nbOf(n);
  for(let k=0;k<nb;k++){
    const zs=P.clean+8+k*24;
    let put=-1;
    for(const need of [4,3,2]){
      for(let z=zs;z<Math.min(LEN-8,zs+22);z++){
        if(!cells[z][pathL[z]]||!noObsNear(z,need))continue;
        if(boosts.length&&z-boosts[boosts.length-1].z<10)continue;
        put=z;break;
      }
      if(put>=0)break;
    }
    if(put>=0)boosts.push({z:put,i:pathL[put],x:lx(pathL[put])});
  }
  /* 3d) RAFAGAS: tramos de 15 m repartidos por el nivel, nunca en los primeros
     metros limpios ni pegados a la meta, y con el lado sorteado. */
  const ng=P.gust|0;
  for(let k=0;k<ng;k++){
    const z0=Math.round(P.clean+18+(LEN-P.clean-40)*(k+.5)/Math.max(1,ng));
    if(z0<8||z0+16>LEN-8)continue;
    if(Math.abs(z0+7-CPZ)<12)continue;      /* que no tape el arco de control */
    winds.push({z0,z1:z0+15,d:(R()<.5?-1:1)});
  }
  /* 4) mallas */
  buildMeshes(P);
  buildArches();
  setSky();
}
/* ¿el camino garantizado está QUIETO alrededor de esta fila? (lo piden los
   peligros de tiempo: ver el comentario de la compuerta) */
function pathStable(z,d){
  const a=pathL[clamp(z,0,pathL.length-1)];
  for(let k=-d;k<=d;k++)if(pathL[clamp(z+k,0,pathL.length-1)]!==a)return false;
  return true;
}
function keepAt(z,i){
  return pathL[Math.max(0,z-1)]===i||pathL[z]===i||pathL[Math.min(pathL.length-1,z+1)]===i;
}
function rowSolid(z){for(let i=0;i<LANES;i++)if(!cells[z][i])return false;
  return z>1&&rowFull(z-1)&&rowFull(z+1);}
function rowFull(z){const r=cells[z];if(!r)return false;
  for(let i=0;i<LANES;i++)if(!r[i])return false;return true;}
function noObsNear(z,d){for(const o of obs)if(Math.abs(o.z-z)<d)return false;return true;}
function solid(z,i){const r=cells[z];return!!(r&&r[i]);}
const obsAt=z=>obsZ[z]||NOOBS;
/* lado hacia el que sopla en este metro (0 = sin viento) */
function windAt(z){for(const w of winds)if(z>=w.z0&&z<=w.z1)return w.d;return 0;}

/* TODO LO ESTÁTICO EN TROZOS DE 48 m.
   Cada trozo se hornea en UNA geometría (baldosas + faldón + aristas + travesaños
   + portales + rampas + muros + marcos + avisos + columnas del vacío) y en cada
   cuadro sólo se dibujan los trozos entre −14 m y +118 m de la pelota. Antes eran
   3 mallas de los 390 m enteros, dibujadas SIEMPRE completas. */
function buildMeshes(P){
  const NC=Math.floor((LEN+6)/CH)+1;
  const acc=[];for(let k=0;k<NC;k++)acc.push(A0());
  chunks=new Array(NC);
  const AT=z=>acc[clamp(Math.floor(z/CH),0,NC-1)];
  const t0=C(PAL.t0),t1=C(PAL.t1),sk=C(PAL.skirt),rl=C(PAL.rail),br=C(PAL.bar);
  const dg=C(PAL.danger),sh=C(PAL.shadow),bo=C(PAL.boost);
  const E=.085;                               /* ancho de la arista brillante */
  for(let z=0;z<cells.length;z++){
    const A=AT(z);
    for(let i=0;i<LANES;i++){
      if(!cells[z][i])continue;
      const x=lx(i),zc=-z;
      const col=((z+i)&1)?t0:t1;
      /* tapa */
      Q(A,[x-CW/2,0,zc+.5],[x+CW/2,0,zc+.5],[x+CW/2,0,zc-.5],[x-CW/2,0,zc-.5],col);
      /* faldón sólo donde no hay vecina (así se ve el espesor en los bordes) */
      if(!solid(z,i-1))Q(A,[x-CW/2,-TH,zc-.5],[x-CW/2,-TH,zc+.5],[x-CW/2,0,zc+.5],[x-CW/2,0,zc-.5],sk);
      if(!solid(z,i+1))Q(A,[x+CW/2,-TH,zc+.5],[x+CW/2,-TH,zc-.5],[x+CW/2,0,zc-.5],[x+CW/2,0,zc+.5],sk);
      if(!solid(z-1,i))Q(A,[x-CW/2,-TH,zc+.5],[x+CW/2,-TH,zc+.5],[x+CW/2,0,zc+.5],[x-CW/2,0,zc+.5],sk);
      if(!solid(z+1,i))Q(A,[x+CW/2,-TH,zc-.5],[x-CW/2,-TH,zc-.5],[x-CW/2,0,zc-.5],[x+CW/2,0,zc-.5],sk);
      /* ARISTAS DE LUZ en cada lado sin vecina: contornea la pista y CADA
         agujero. Es lo que hace legible el camino a 60 m. */
      if(!solid(z,i-1)){plate(A,x-CW/2+E/2,zc,E,1,.012,rl);
        /* la ALETA vertical va sólo en el borde de la pista (i=0 / i=4): puesta
           también en los bordes de los agujeros parecían paredes y tapaban el
           camino de más adelante */
        if(i===0)bq(A,x-CW/2+.03,0,zc,.06,.19,1,rl,rl);}
      if(!solid(z,i+1)){plate(A,x+CW/2-E/2,zc,E,1,.012,rl);
        if(i===LANES-1)bq(A,x+CW/2-.03,0,zc,.06,.19,1,rl,rl);}
      if(!solid(z-1,i))plate(A,x,zc+.5-E/2,CW,E,.012,rl);
      if(!solid(z+1,i))plate(A,x,zc-.5+E/2,CW,E,.012,rl);
      /* travesaño cada 4 m: da ritmo y escala de distancia */
      if(z%4===0)plate(A,x,zc,CW*.98,.09,.008,br);
    }
  }
  /* PORTALES de la zona (niveles 3+) cada P.ring metros: dos pilonas altas con
     tira de luz y un dintel FINO Y ALTO. MEDIDO en captura (M-ANTES-lv5-h.png):
     con el dintel de 16 cm a 2,6 m de alto, al pasarlo tapaba la pantalla entera
     con una banda pastel de 35 px que se leía como un error de la interfaz. Con
     10 cm a 3,4 m pasa como un destello arriba del cuadro. */
  if(P.ring){
    /* APAGADOS a propósito (mezclados con la niebla) y más bajos que el arco de
       control: en la captura SC-cp.png del nivel 8 los portales eran igual de
       llamativos que el arco y no se distinguía cuál era el hito que importa. */
    const rg=C(mixc(PAL.ring,PAL.fog,.45)),rw=C(mixc(PAL.ring,'#ffffff',.3)),W=CW*LANES+.5;
    for(let z=P.ring;z<LEN-4;z+=P.ring){
      if(Math.abs(z-CPZ)<5)continue;
      const A=AT(z);
      for(const s of [-1,1]){
        bq(A,s*(W/2),0,-z,.15,2.9,.15,rg,C(mixc(PAL.ring,'#000000',.6)));
        bq(A,s*(W/2)-s*.09,.5,-z,.05,2.1,.18,rw,rw);  /* tira de luz de la pilona */
      }
      bq(A,0,2.9,-z,W,.09,.13,rw,rg);
    }
  }
  /* RAMPAS DE IMPULSO: tres galones verdes en la baldosa y dos marcas al costado */
  for(const b of boosts){
    const A=AT(b.z);
    plate(A,b.x,-b.z,CW*.9,.94,.013,C(mixc(PAL.boost,'#000000',.6)));
    for(let k=0;k<3;k++){
      plate(A,b.x,-b.z+.3-k*.3,CW*.66,.11,.019,bo);
      plate(A,b.x-CW*.24,-b.z+.36-k*.3,.1,.2,.019,bo);
      plate(A,b.x+CW*.24,-b.z+.36-k*.3,.1,.2,.019,bo);
    }
  }
  /* muros, compuertas y avisos */
  for(const o of obs){
    const A=AT(o.z);
    if(o.t==='wall'){
      bq(A,o.x,0,-o.z,CW*.92,.82,.34,C(PAL.wallTop),C(PAL.wall));
      plate(A,o.x,-o.z,CW*.9,.3,.83,C(PAL.wallTop));
    }
    if(o.t==='puls'){
      /* marco de la compuerta: dos postes que quedan SIEMPRE, así se ve que ahí
         hay una compuerta aunque en ese momento esté abierta */
      for(const s of [-1,1])bq(A,o.x+s*CW*.47,0,-o.z,.1,1.15,.24,C(PAL.rail),C(PAL.rail));
      bq(A,o.x,1.15,-o.z,CW*.94+.1,.1,.24,C(PAL.rail),C(PAL.rail));
    }
    /* sombra en el piso debajo del peligro */
    if(solid(o.z,o.i))plate(A,o.x,-o.z,CW*.86,.86,.016,sh);
    /* PISTA DE AVISO: dos baldosas antes del peligro, oscuras con galones magenta.
       Con una sola (2 m) a 11,3 m/s el aviso duraba 0,18 s: no es un aviso, es un
       adorno. Con dos son 0,35 s de alfombra roja además de ver el bicho de lejos. */
    for(const dz of [2,3]){
      const zw=o.z-dz;
      if(!solid(zw,o.i))continue;
      const B=AT(zw);
      plate(B,o.x,-zw,CW*.9,.94,.014,C(PAL.dangerD));
      plate(B,o.x,-zw+.24,CW*.62,.13,.018,dg);
      plate(B,o.x,-zw-.06,CW*.62,.13,.018,dg);
    }
  }
  /* RAFAGAS: el piso del tramo va rayado y con flechas hacia donde sopla, para que
     se vea ANTES de entrar (la primera version no marcaba nada y el jugador solo
     sentia que la pelota "se iba sola": eso es un bug, no un peligro). */
  for(const w of winds){
    /* MEDIDO EN CAPTURA (SC-rafaga.png): con las flechas del color de los
       travesaños sobre las baldosas doradas del nivel 8 no se veían. Ahora va una
       ALFOMBRA oscura por todo el tramo y las flechas en claro encima: se lee el
       corredor de viento desde lejos, igual que la alfombra de peligro. */
    /* la alfombra va OSCURA PERO CON EL COLOR DE LA ZONA, no casi negra: con
       mixc(fog,negro) el tramo parecía un agujero de 15 m (captura SC-rafaga.png
       de esa vuelta) y un agujero es justo lo que mata en este juego. */
    const dark=C(mixc(PAL.t1,'#000000',.45)),ar=C(mixc(PAL.rail,'#ffffff',.35));
    const wAll=CW*LANES;
    for(let z=w.z0;z<=w.z1;z++){
      const A=AT(z);
      plate(A,0,-z,wAll,1,.010,dark);                 /* alfombra del corredor */
      plate(A,0,-z,wAll,.07,.013,ar);                 /* raya que cruza la pista */
      if(z%3===0)for(let q=-1;q<=1;q++)arrow(A,q*CW*1.7,-z,.017,.85,.19,w.d,ar);
    }
  }
  addProps(AT);
  for(let k=0;k<NC;k++){
    const m=meshOf(acc[k],true);
    m.frustumCulled=false;                    /* la visibilidad la manda chunkVis */
    chunks[k]=m;trackG.add(m);
  }
  /* franja del arco de control y de la meta (sin niebla: se ven venir de lejos) */
  const cb=A0(),cbOn=A0();
  const wAll=CW*LANES;
  plate(cb,0,-CPZ,wAll,.55,.02,C(PAL.cp));
  plate(cbOn,0,-CPZ,wAll,.55,.022,C(PAL.cpOn));
  for(let k=0;k<10;k++){                       /* cuadros de la meta */
    plate(cb,-wAll/2+wAll*(k+.5)/10,-LEN,wAll/10,.7,.02,k&1?C('#ffffff'):C('#12222c'));
    plate(cbOn,-wAll/2+wAll*(k+.5)/10,-LEN,wAll/10,.702,.02,k&1?C('#ffffff'):C('#12222c'));
  }
  cpBand=meshOf(cb,false);trackG.add(cpBand);
  cpBandOn=meshOf(cbOn,false);cpBandOn.visible=false;trackG.add(cpBandOn);
}
/* COLUMNAS DEL VACÍO: paralaje y sensación de velocidad. Van en el mismo trozo que
   la pista que tienen al lado, así se cullean con ella. Arrancan a 4,5 del borde
   (a 2,2 parecían edificios encima de la pista y le robaban el ojo al camino) y
   una de cada tres lleva una TIRA DE NEÓN vertical: es lo que convierte el vacío
   negro en una ciudad de neón por 2 triángulos. */
function addProps(AT){
  const cp=C(PAL.prop),ct=C(PAL.propTop),ne=C(mixc(PAL.rail,PAL.fog,.45));
  const R=rng(9001+lvl*31);
  const step=Math.max(5,Math.round(10/Math.max(.3,decoK)));
  for(let z=-6;z<LEN+20;z+=step){
    for(const s of [-1,1]){
      if(R()<.3)continue;
      const x=s*(HALF+4.5+R()*14);
      const h=2+R()*15,w=1+R()*2.4,y=-1.6-R()*5;
      const zz=-z-R()*3;
      const A=AT(Math.max(0,z));
      bq(A,x,y,zz,w,h,w*(.7+R()*.8),ct,cp);
      /* tira de neón en la CARA INTERNA (la que mira a la pista). El orden de los
         vértices decide la cara que se ve: con FrontSide y la tira al revés no se
         dibujaba nada (probado con el producto vectorial, ver meshOf). */
      if(R()<.34&&h>5){
        const xf=x-s*(w/2+.03),y0=y+h*.16,y1=y+h*.86,zA=zz-.18,zB=zz+.18;
        if(s>0)Q(A,[xf,y0,zA],[xf,y0,zB],[xf,y1,zB],[xf,y1,zA],ne);
        else   Q(A,[xf,y0,zB],[xf,y0,zA],[xf,y1,zA],[xf,y1,zB],ne);
      }
    }
  }
}
/* ARCO DE NEÓN (control y meta) en UNA malla fusionada: dos pilonas con tira de
   luz, dintel de tres barras y una placa de luz al medio. Reemplaza al GLB
   simplificado, que en pantalla era un montón de esquirlas negras. */
function archMesh(fin){
  const W=CW*LANES+.9;
  const A=A0();
  const cc=C(fin?PAL.rail:PAL.cp),dk=C(PAL.fin),wt=C(mixc(fin?PAL.rail:PAL.cp,'#ffffff',.5));
  for(const s of [-1,1]){
    const x=s*(W/2-.2);
    bq(A,x,0,0,.44,2.6,.44,cc,dk);                 /* pilona */
    bq(A,x-s*.24,.25,0,.06,2.1,.5,wt,wt);          /* tira de luz de la cara interna */
    bq(A,x,2.6,0,.6,.18,.6,wt,cc);                 /* capitel */
  }
  bq(A,0,2.78,0,W,.34,.44,cc,dk);                  /* dintel */
  bq(A,0,2.62,0,W-.3,.1,.52,wt,wt);                /* barra de luz de abajo */
  bq(A,0,3.12,0,W*.34,.16,.3,wt,cc);              /* cartel del medio */
  const m=meshOf(A,false);                         /* sin niebla: se ve a 150 m */
  m.frustumCulled=false;
  return m;
}
function buildArches(){
  cpArch=archMesh(false);cpArch.position.z=-CPZ;trackG.add(cpArch);
  finArch=archMesh(true);finArch.position.z=-LEN;trackG.add(finArch);
}
/* visibilidad de los trozos: sólo lo que está entre −14 m y +118 m de la pelota */
function chunkVis(){
  let n=0;
  for(let k=0;k<chunks.length;k++){
    const z0=k*CH,z1=z0+CH;
    const v=(z0<=bz+VISZ)&&(z1>=bz-BEHZ);
    chunks[k].visible=v;if(v)n++;
  }
  chVis=n;
}
/* ------------------------------------------------------------------- física */
function cellAt(x,z){
  const zi=Math.round(z);
  if(zi<0||zi>=cells.length)return 0;
  const i=Math.round(x/CW+(LANES-1)/2);
  if(i<0||i>=LANES)return 0;
  return cells[zi][i];
}
function sawX(o,t){return o.amp?o.x+Math.sin(t*o.sp+o.ph)*o.amp:o.x;}
/* altura de la compuerta en el instante t: 1 = cerrada, 0 = abierta. Con D=.42 y
   la transición de 0,09 la compuerta MATA el 43% del ciclo y deja pasar el 57%:
   con medio y medio (D=.5) el hueco quedaba más corto que el peligro y se sentía
   una moneda al aire. La ventana abierta a 11,3 m/s son 1,0 s de paso. */
function pulsH(o,t){
  const p=((t+o.ph)%o.per)/o.per,e=.09,D=.42;
  if(p<D-e)return 1;
  if(p<D+e)return (D+e-p)/(2*e);
  if(p<1-e)return 0;
  return (p-(1-e))/e;
}
function die(kind){
  if(dead||won)return;
  dead=1;dieK=kind;fallV=0;
  lastDie=kind+'@'+bz.toFixed(1)+' x='+bx.toFixed(2);
  if(DEMO){demoRe=.8;return;}               /* en el menú no se muere: reaparece */
  ARC.sfx(kind==='fall'?'lose':(kind==='gate'?'gate':'boom'));
  ARC.shake(kind==='fall'?7:13);
  ARC.fx.burst(ARC.W/2,ARC.H*.62,{n:22,color:PAL.danger,speed:260,size:5,life:.6});
  if(kind!=='fall')ARC.vib(70);
  setTimeout(()=>{
    if(!dead||DEMO)return;
    if(cpOn&&!cpUsed){
      cpUsed=1;bz=CPZ;bx=tx=lx(pathL[CPZ]);dead=0;warm=0;fallV=0;boostT=0;
      ball.position.set(bx,BR,-bz);
      ARC.toast(T('cpBack'));ARC.sfx('power');
      return;
    }
    finishLose(kind);
  },700);
}
/* ------------------------------------------------------------------ remates */
function bank(){                            /* los diamantes juntados van a la caja */
  if(!gemN)return;
  ARC.S.gems=(ARC.S.gems||0)+gemN;
  if(!ARC.S.gemLv)ARC.S.gemLv={};
  const k=String(lvl);
  if((ARC.S.gemLv[k]||0)<gemN)ARC.S.gemLv[k]=gemN;
  ARC.save();
}
function medRow(mask,got){                  /* fila de medallas en HTML */
  return MEDS.map(m=>'<span style="opacity:'+((mask&m.bit)?1:.22)+
    ';color:'+((got&m.bit)?PAL.cpOn:'#eef2f6')+'">'+m.ic+'</span>').join(' ');
}
function finishLose(kind){
  bank();
  const pc=Math.round(bz/LEN*100);
  const casi=pc>=80;
  const bt=bestT(lvl);
  ARC.over({win:false,score:Math.round(bz),stars:0,
    title:kind==='fall'?T('dFall'):(kind==='saw'?T('dSaw'):(kind==='gate'?T('dGate'):T('dHit'))),
    coins:gemN,
    sub:(casi?'<b style="color:'+PAL.danger+'">'+T('almost')+' '+pc+'%</b><br>':'')+
      T('statMet')+': <b>'+Math.round(bz)+'</b>/'+LEN+' &nbsp;·&nbsp; '+
      T('statGems')+': <b>'+gemN+'</b>/'+gemT+' ◆'+
      (bt?('<br><span style="opacity:.75">'+T('statBest')+': '+fmtT(bt)+' &nbsp;·&nbsp; '+
        T('parT')+' '+fmtT(PAR)+'</span>'):
        ('<br><span style="opacity:.75">'+T('parT')+' '+fmtT(PAR)+'</span>'))+
      '<br><span style="opacity:.75">'+zoneName(lvl)+' '+medRow(medOf(lvl),0)+'</span>'});
}
function finishWin(){
  const tm=runT;
  bank();
  let st=gemT?(gemN>=gemT*.85?3:(gemN>=gemT*.55?2:1)):3;
  if(cpUsed)st=Math.min(st,2);
  /* MEDALLAS: limpia (sin usar el arco), todos los diamantes, bajo el par */
  let mask=0;
  if(!cpUsed)mask|=1;
  if(gemT&&gemN>=gemT)mask|=2;
  if(tm<=PAR)mask|=4;
  const got=medAdd(lvl,mask);
  const rec=setBestT(lvl,tm);
  ARC.save();
  if(got)ARC.toast(T(got===7?'allMed':'medNew'),1500);
  const bt=bestT(lvl);
  ARC.over({win:true,score:Math.round(LEN),stars:st,
    coins:gemN+10+(got?8*MEDS.filter(m=>got&m.bit).length:0),
    sub:'<b>'+T('statTime')+' '+fmtT(tm)+'</b>'+
      (rec?' <b style="color:'+PAL.cpOn+'">'+T('newTime')+'</b>':
        ' <span style="opacity:.75">('+T('statBest')+' '+fmtT(bt)+')</span>')+
      '<br>'+T('statGems')+': <b>'+gemN+'</b>/'+gemT+' ◆ &nbsp;·&nbsp; '+
      T('parT')+' '+fmtT(PAR)+
      '<br><span style="font-size:1.5em;letter-spacing:.25em">'+medRow(medOf(lvl),got)+'</span>'+
      (cpUsed?'<br><span style="opacity:.7">'+T('usedCp')+'</span>':'')});
}
/* ------------------------------------------------------------------ entrada */
const laneOf=x=>clamp(Math.round(x/CW+(LANES-1)/2),0,LANES-1);
function nudge(d){botOn=0;tx=clamp(lx(clamp(laneOf(tx)+d,0,LANES-1)),-HALF,HALF);}
G.down=function(p){drag={x:p.x,tx};botOn=0;};
G.move=function(p){
  if(!drag)return;
  /* media pantalla de recorrido = todo el ancho de la pista */
  tx=clamp(drag.tx+(p.x-drag.x)*(HALF*2/(ARC.W*.5)),-HALF,HALF);
};
G.up=function(){drag=null;};
G.key=function(c,d){
  if(!d)return;
  if(c==='ArrowLeft'||c==='KeyA')nudge(-1);
  if(c==='ArrowRight'||c==='KeyD')nudge(1);
};
/* -------------------------------------------------------------------- ciclo */
/* EL MOTOR CREA EL RENDERER CON antialias:true Y EN SWIFTSHADER ESO CUESTA
   CUADROS (medido en este juego, nivel 8, todo lo demás igual: 20,6 fps con MSAA
   contra 31,2 sin MSAA). El shell no expone la opción, así que acá se cambia el
   lienzo por uno nuevo y se rehace el renderer sin MSAA. Todo lo que el shell
   toca (ARC.rnd, el lienzo con id "gl") sigue en su lugar.
   -> PEDIDO AL MOTOR: GAME.aa=false para no tener que hacer esto. */
function fastGL(){
  try{
    const old=document.getElementById('gl');
    if(!old||!ARC.rnd)return false;
    const cv=document.createElement('canvas');
    cv.id='gl';cv.style.cssText=old.style.cssText;
    old.parentNode.replaceChild(cv,old);
    try{ARC.rnd.dispose();}catch(e){}
    /* alpha:true + alfa 0 al limpiar = el vacío lo pinta el CSS (ver setSky) */
    const r=new T3.WebGLRenderer({canvas:cv,antialias:false,alpha:true,
      premultipliedAlpha:true,powerPreference:'high-performance'});
    r.setClearColor(new T3.Color(G.sky),0);
    if(T3.SRGBColorSpace)r.outputColorSpace=T3.SRGBColorSpace;
    r.shadowMap.enabled=false;
    ARC.rnd=r;cssSky=true;
    applyRes();
    return true;
  }catch(e){console.warn('gl',e);return false;}
}
/* RESOLUCIÓN ADAPTATIVA. El tope lo sigue poniendo ARC.gfxP().dpr (los Gráficos
   que eligió el jugador); esto sólo BAJA de ahí si la máquina no llega, y vuelve
   a subir cuando sobra. En un celular se queda en el tope. */
let resK=1,resT=0,runFps=0,noRes=0;
function applyRes(){
  if(!ARC.rnd)return;
  const p=ARC.gfxP();
  ARC.rnd.setPixelRatio(Math.min(window.devicePixelRatio||1,p.dpr)*resK);
  ARC.rnd.setSize(ARC.W,ARC.H,false);
}
function autoRes(dt){
  if(DEMO||noRes){runFps=0;return;}
  runFps+=dt;
  if(runFps<2.5)return;      /* ARC.fps viene arrastrado del menú los primeros 2,5 s */
  const f=ARC.fps;
  if(f<44){resT+=dt;if(resT>1.5&&resK>.7){resK=Math.max(.7,resK-.1);applyRes();resT=0;}}
  else if(f>56){resT-=dt;if(resT<-3&&resK<1){resK=Math.min(1,resK+.1);applyRes();resT=0;}}
  else resT*=.92;
}
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  const p=ARC.gfxP?ARC.gfxP():{part:1,fog:1,sh:1};
  partK=p.part;fogK=p.fog;decoK=clamp(p.part,.4,1.35);
  fastGL();
  cssFix();
  setTheme(1);
  scene=new T3.Scene();
  scene.fog=new T3.Fog(new T3.Color(PAL.fog).getHex(),46*fogK,132*fogK);
  cam=new T3.PerspectiveCamera(52,ARC.W/Math.max(1,ARC.H),.1,320);
  scene.add(new T3.HemisphereLight(0xd8f6ff,0x123043,1.35));
  const d=new T3.DirectionalLight(0xffffff,.85);d.position.set(3,9,6);scene.add(d);
  buildStars();setSky();
  trackG=new T3.Group();scene.add(trackG);
  dynG=new T3.Group();scene.add(dynG);
  ball=new T3.Mesh(ballGeo(),
    new T3.MeshLambertMaterial({color:new T3.Color('#ffc95c'),emissive:new T3.Color('#5a3200'),
      vertexColors:true}));
  scene.add(ball);
  ballGlow=new T3.Mesh(new T3.SphereGeometry(BR*1.5,12,8),
    new T3.MeshBasicMaterial({color:new T3.Color('#ffd98a'),transparent:true,opacity:.16,fog:false}));
  ball.add(ballGlow);
  ballSh=new T3.Mesh(new T3.CircleGeometry(BR*1.15,18),
    new T3.MeshBasicMaterial({color:new T3.Color('#7ef0ff'),transparent:true,opacity:.42,fog:false}));
  ballSh.rotation.x=-Math.PI/2;scene.add(ballSh);
  applyBall();
  /* la ficha de monedas del motor es la de DIAMANTES en este juego */
  const ci=document.querySelector('#menu .mTop .badge i');
  if(ci)ci.textContent='◆';
};
/* LA PELOTA TIENE QUE VERSE RODAR. Una esfera de un color liso gira y en pantalla
   parece quieta (medido a ojo en las capturas: la pelota "flotaba"). Se le hornea
   un DAMERO por vértice —el material multiplica su color por el del vértice, así
   el damero sale del color de la pelota elegida sin materiales extra— y el giro se
   lee de una. 520 triángulos, cero llamadas nuevas. */
function ballGeo(){
  if(GEO.ball)return GEO.ball;
  const g=new T3.SphereGeometry(BR,20,14);
  const p=g.attributes.position,n=p.count,col=new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const u=Math.atan2(z,x)/TAU*6,v=Math.acos(clamp(y/BR,-1,1))/Math.PI*4;
    const k=((Math.floor(u)+Math.floor(v))&1)?1:.55;
    col[i*3]=col[i*3+1]=col[i*3+2]=k;
  }
  g.setAttribute('color',new T3.Float32BufferAttribute(col,3));
  return GEO.ball=g;
}
function applyBall(){
  const B=curBall();
  if(!ball)return;
  ball.material.color.set(B.c);
  if(ball.material.emissive)ball.material.emissive.set(B.e);
  ballGlow.material.color.set(B.g);
  ballSh.material.color.set(B.sh);
}
G.resize=function(){
  if(cam){cam.aspect=ARC.W/Math.max(1,ARC.H);cam.updateProjectionMatrix();}
  applyRes();cssFix();
  if(panelEl&&panelEl.classList.contains('on'))panelFill();
};
G.gfxApply=function(p){
  partK=p.part;fogK=p.fog;decoK=clamp(p.part,.4,1.35);
  resK=1;resT=0;applyRes();
  if(scene&&scene.fog){scene.fog.near=46*fogK;scene.fog.far=132*fogK;}
  if(stars)stars.visible=!cssSky&&partK>.45;
  /* las columnas del vacío viven DENTRO de los trozos de pista (para cullearse con
     ellos), así que cambiar la densidad de decorado rehace los trozos. Cuesta unos
     milisegundos y pasa sólo cuando el jugador toca Gráficos. */
  if(trackG&&cells.length)rebuildStatic();
};
function rebuildStatic(){
  clearG(trackG);
  buildMeshes(LV[clamp(lvl,1,8)-1]);
  buildArches();
  cpBand.visible=!cpOn;cpBandOn.visible=!!cpOn;
  chunkVis();
}
/* SIERRA de geometría en UNA malla fusionada: antes era un grupo de 13 mallas y
   con 12 sierras en pantalla el cuadro se iba a 180 llamadas de dibujo (medido
   con renderer.info: 189). Fusionada son 12 llamadas.
   TEÑIDA POR ZONA: los colores estaban a mano en azul petróleo y en la zona ORO o
   ROSA la sierra era un borrón oscuro que no se leía como peligro (captura
   Z-saw5.png). Ahora el cuerpo es el color de peligro oscurecido, los dientes ese
   mismo color en claro y el cubo blanco: se ve de lejos en las 8 zonas. */
function sawGeo(){
  const key='saw'+lvl;
  if(GEO[key])return GEO[key];
  const A=A0(),N=12,R0=.44,TZ=.07;
  const dk=C(mixc(PAL.danger,'#000000',.72)),lt=C(mixc(PAL.danger,'#000000',.45));
  const dg=C(mixc(PAL.danger,'#ffffff',.15)),hb=C('#ffffff');
  for(let k=0;k<N;k++){
    const a0=k/N*TAU,a1=(k+1)/N*TAU;
    const p0=[Math.cos(a0)*R0,Math.sin(a0)*R0],p1=[Math.cos(a1)*R0,Math.sin(a1)*R0];
    TRI(A,[0,0,TZ],[p0[0],p0[1],TZ],[p1[0],p1[1],TZ],(k&1)?dk:lt);      /* cara +Z */
    TRI(A,[0,0,-TZ],[p1[0],p1[1],-TZ],[p0[0],p0[1],-TZ],(k&1)?dk:lt);   /* cara −Z */
    Q(A,[p0[0],p0[1],-TZ],[p1[0],p1[1],-TZ],[p1[0],p1[1],TZ],[p0[0],p0[1],TZ],dk);
    /* diente: dos caras enfrentadas (es finito, así se ve de los dos lados) */
    const am=(a0+a1)/2,tp=[Math.cos(am)*(R0+.19),Math.sin(am)*(R0+.19)];
    TRI(A,[p0[0],p0[1],0],[p1[0],p1[1],0],[tp[0],tp[1],0],dg);
    TRI(A,[p1[0],p1[1],0],[p0[0],p0[1],0],[tp[0],tp[1],0],dg);
  }
  for(let k=0;k<N;k++){                       /* cubo brillante */
    const a0=k/N*TAU,a1=(k+1)/N*TAU,r=.15;
    TRI(A,[0,0,TZ+.01],[Math.cos(a0)*r,Math.sin(a0)*r,TZ+.01],[Math.cos(a1)*r,Math.sin(a1)*r,TZ+.01],hb);
    TRI(A,[0,0,-TZ-.01],[Math.cos(a1)*r,Math.sin(a1)*r,-TZ-.01],[Math.cos(a0)*r,Math.sin(a0)*r,-TZ-.01],hb);
  }
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.Float32BufferAttribute(A.p,3));
  g.setAttribute('color',new T3.Float32BufferAttribute(A.c,3));
  g.computeBoundingSphere();
  return GEO[key]=g;
}
function sawMat(){
  if(!MAT._saw)MAT._saw=new T3.MeshBasicMaterial({vertexColors:true,side:T3.FrontSide});
  return MAT._saw;
}
/* la hoja de la compuerta: caja apoyada en el piso (la geometría se corre media
   altura para arriba, así scale.y la hace crecer desde la baldosa) */
function gateGeo(){
  if(GEO.gate)return GEO.gate;
  const g=new T3.BoxGeometry(CW*.9,1.1,.2);
  g.translate(0,.55,0);
  return GEO.gate=g;
}
/* LO QUE SE MUEVE VA EN TRES InstancedMesh: sierras, compuertas y diamantes.
   Antes era una malla por bicho: en el nivel 8, con 45 sierras, 29 compuertas y 98
   diamantes, las visibles sumaban ~42 llamadas de dibujo por cuadro (medido con
   renderer.info: 45 llamadas en total con la pista incluida). Instanciadas son 3.
   El truco para que además no cuesten triángulos de más: las visibles se EMPAQUETAN
   en los primeros índices y se baja `count`, así el renderer no procesa ni dibuja
   las que están detrás de la bruma (si se escondieran con escala 0 seguirían
   contando en renderer.info.render.triangles). */
function mkIM(geo,mtl,n){
  const m=new T3.InstancedMesh(geo,mtl,Math.max(1,n));
  m.frustumCulled=false;m.count=0;
  m.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  dynG.add(m);return m;
}
function buildDyn(){
  clearG(dynG);sawG=[];
  sawIM=gateIM=gemIM=null;
  let ns=0,ng=0;
  for(const o of obs){
    if(o.t==='saw'){o.rot=Math.random()*TAU;ns++;sawG.push(o);}
    else if(o.t==='puls'){ng++;sawG.push(o);}
  }
  sawIM=mkIM(sawGeo(),sawMat(),ns);
  gateIM=mkIM(gateGeo(),mat(PAL.danger,1),ng);
  gemIM=mkIM(octa(.30),mat(PAL.gem,1),gems.length);
}
/* una sola matriz reutilizada: componer 40 matrices por cuadro no ensucia el GC */
const _M=[],_Q=[],_S=[],_E=[];
function imSet(im,k,x,y,z,rz,ry,sy){
  if(!_M.length){_M.push(new T3.Matrix4());_Q.push(new T3.Quaternion());
    _S.push(new T3.Vector3());_S.push(new T3.Vector3());_E.push(new T3.Euler());}
  const e=_S[0].set(x,y,z),sc=_S[1].set(1,sy==null?1:sy,1);
  _Q[0].setFromEuler(_E[0].set(0,ry||0,rz||0));
  _M[0].compose(e,_Q[0],sc);
  im.setMatrixAt(k,_M[0]);
}
function startLevel(l,demo){
  lvl=clamp(l||1,1,8);
  buildTrack(lvl);                     /* buildTrack deja el cielo de la zona puesto */
  if(ARC.rnd)ARC.rnd.setClearColor(new T3.Color(PAL.sky),cssSky?0:1);
  if(scene.fog){scene.fog.color.set(PAL.fog);scene.fog.near=46*fogK;scene.fog.far=132*fogK;}
  if(stars)stars.visible=!cssSky&&partK>.45;
  bx=tx=lx(pathL[0]);bz=0;vz=0;dead=0;won=false;gemN=0;cpOn=0;cpUsed=0;
  warm=0;fallV=0;tilt=0;drag=null;botOn=0;sawSnd=0;recTold=false;lastDie='';
  runT=0;boostT=0;boostN=0;windOn=0;demoRe=0;resK=1;resT=0;runFps=0;
  pbx=bx;pbz=0;
  cpBand.visible=true;cpBandOn.visible=false;
  applyBall();applyRes();
  ball.position.set(bx,BR,0);ball.rotation.set(0,0,0);ball.scale.setScalar(1);
  buildDyn();
  if(!demo){hudM=-1;hud();}
}
G.start=function(l){
  if(!T3)return;
  DEMO=0;demoOn=0;
  cssFix();
  startLevel(l,false);
  /* el motor arranca GAME.music (la del menú); acá se pisa con la de ESTA zona,
     o con la que el jugador clavó en el tocadiscos */
  playTrack(lvl);
  ARC.tray([
    {id:'lf',txt:'◀',gh:1,fn:()=>nudge(-1)},
    {id:'rt',txt:'▶',gh:1,fn:()=>nudge(1)}
  ]);
};
function hud(){
  const bt=bestT(lvl);
  ARC.hud(Math.round(bz),'<b>'+T('level')+' '+lvl+'</b> · '+zoneName(lvl)+' · '+
    Math.round(bz)+'/'+LEN+' m · '+fmtT(runT)+(bt?' <span style="opacity:.6">★'+fmtT(bt)+'</span>':''));
}
G.i18nDone=function(){
  if(ARC.scr==='game'&&cells.length)hud();
  if(panelEl&&panelEl.classList.contains('on'))panelFill();
};
/* ------------------------------------------------------------- simulación */
function sim(dt){
  if(!T3||won)return;
  pbx=bx;pbz=bz;
  autoRes(dt);
  /* la sierra gira y barre siempre (también en la caída, queda más vivo).
     CULLING: lo que está a más de 90 m no se dibuja (con 50 sierras y 90
     diamantes eran 140 llamadas de dibujo por cuadro para cosas que están
     detrás de la bruma) */
  const t=ARC.t;
  chunkVis();
  /* sierras, compuertas y diamantes: se empaquetan las visibles en los primeros
     índices de cada InstancedMesh y se baja count (ver buildDyn) */
  let ks=0,kg=0,kd=0;
  for(const o of sawG){
    const d=o.z-bz;
    if(o.t==='puls'){
      const h=pulsH(o,t);
      if(d>-4&&d<90&&h>.02)imSet(gateIM,kg++,o.x,0,-o.z,0,0,Math.max(.02,h));
      continue;
    }
    if(d<-4||d>90)continue;
    o.rot-=dt*11;
    imSet(sawIM,ks++,o.amp?sawX(o,t):o.x,.62,-o.z,o.rot,0,1);
  }
  for(const gm of gems){
    if(gm.got)continue;
    const d=gm.z-bz;
    if(d<-3||d>70)continue;
    imSet(gemIM,kd++,gm.x,.62+Math.sin(t*2.2+gm.z)*.06,-gm.z,0,t*2.6+gm.z,1);
  }
  sawIM.count=ks;gateIM.count=kg;gemIM.count=kd;
  sawIM.instanceMatrix.needsUpdate=true;
  gateIM.instanceMatrix.needsUpdate=true;
  gemIM.instanceMatrix.needsUpdate=true;
  /* los arcos no llevan niebla (para verlos venir), así que se apagan a 150 m:
     si no, en el nivel 8 el arco de la meta flotaba solo en el vacío desde el
     metro 0, con la pista ya borrada por la bruma */
  if(cpArch)cpArch.visible=(CPZ-bz)<ARCHZ&&(CPZ-bz)>-6;
  if(finArch)finArch.visible=(LEN-bz)<ARCHZ;
  if(dead){                                   /* caída con animación, no corte seco */
    if(dieK==='fall'){fallV+=26*dt;ball.position.y-=fallV*dt;bz+=vz*dt*.35;}
    ball.position.z=-bz;
    if(DEMO){                                 /* en el menú vuelve a la pista */
      demoRe-=dt;
      if(demoRe<=0)demoBack();
    }
    return;
  }
  if(botOn)botPlan();
  runT+=dt;
  /* rampa de arranque: 55% de la velocidad los primeros 2,6 s */
  warm=Math.min(1,warm+dt/2.6);
  if(boostT>0)boostT=Math.max(0,boostT-dt);
  vz=SPD*(.55+.45*warm)*(1+BOOSTK*(boostT/BOOSTT));
  bz+=vz*dt;
  /* RÁFAGA: el viento arrastra el destino del dedo mientras se cruza el tramo */
  const wd=windAt(bz);
  if(wd){
    tx=clamp(tx+wd*WINDV*dt,-HALF,HALF);
    if(windOn!==wd){
      windOn=wd;
      if(!DEMO){ARC.toast(T('gust')+' '+(wd>0?'▶':'◀'),1100);ARC.sfx('click',{vol:.5,rate:.8});}
    }
  }else windOn=0;
  /* movimiento lateral REAL (bx es la posición, tx el destino del dedo) */
  const dx=tx-bx,mx=LSP*dt;
  bx+=Math.abs(dx)<=mx?dx:(dx>0?mx:-mx);
  /* PISO con 12 cm de perdón: la pelota mide 84 cm, así que con el centro justo
     en el filo del agujero seguir apoyado es lo que se ve en pantalla (y con el
     centro pelado era una moneda al aire cada vez que se cruzaba un hueco) */
  if(!cellAt(bx,bz)&&!cellAt(bx-.12,bz)&&!cellAt(bx+.12,bz)){die('fall');return;}
  /* choques: sólo los 3 casilleros de alrededor (obsZ), no los 95 del nivel */
  const zi=Math.round(bz);
  for(let zz=zi-1;zz<=zi+1;zz++){
    for(const o of obsAt(zz)){
      if(Math.abs(o.z-bz)>.55)continue;
      if(o.t==='puls'){
        if(pulsH(o,t)>.42&&Math.abs(o.x-bx)<o.w+.26){die('gate');return;}
        continue;
      }
      if(Math.abs(sawX(o,t)-bx)<o.w+.26){die(o.t==='saw'?'saw':'hit');return;}
    }
  }
  /* zumbido de la sierra cercana */
  if(t-sawSnd>.5&&!DEMO){
    for(const o of sawG){
      if(o.t!=='saw')continue;
      const d=o.z-bz;
      if(d>0&&d<7&&Math.abs(sawX(o,t)-bx)<1.6){
        ARC.sfx('saw',{vol:.35,rate:1.1});sawSnd=t;break;
      }
    }
  }
  /* diamantes */
  for(const gm of gems){
    if(gm.got||Math.abs(gm.z-bz)>.7)continue;
    if(Math.abs(gm.x-bx)<.62){
      gm.got=1;gemN++;
      sfx('gem',{rate:1+Math.min(.5,gemN*.02)});
      if(!DEMO){
        ARC.fx.text(ARC.W/2,ARC.H*.44,'+1',{color:PAL.gem,size:Math.max(14,ARC.H*.05)});
        if(partK>.5)ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:6,color:PAL.gem,speed:150,size:3,life:.35});
        if(gemN===gemT&&gemT>3)ARC.toast(T('gemsAll'));
      }
    }
  }
  /* rampas de impulso */
  for(const b of boosts){
    if(Math.abs(b.z-bz)>.6)continue;
    if(Math.abs(b.x-bx)<.62&&boostT<BOOSTT*.6){
      boostT=BOOSTT;boostN++;
      sfx('power',{vol:.55,rate:1.25});
      if(!DEMO){
        ARC.shake(3);ARC.vib(14);
        ARC.fx.text(ARC.W/2,ARC.H*.5,T('boost'),{color:PAL.boost,size:Math.max(13,ARC.H*.045)});
        if(partK>.5)ARC.fx.burst(ARC.W/2,ARC.H*.62,{n:10,color:PAL.boost,speed:260,size:4,life:.4,a:-Math.PI/2});
      }
    }
  }
  /* arco de control */
  if(!cpOn&&bz>=CPZ){
    cpOn=1;cpBand.visible=false;cpBandOn.visible=true;
    if(!DEMO){
      ARC.toast(T('cpGot'));ARC.sfx('check');
      ARC.fx.ring(ARC.W/2,ARC.H*.5,{r:ARC.H*.5,color:PAL.cpOn,w:5,life:.5});
    }
  }
  if(!recTold&&!DEMO&&bz>(ARC.S.best||0)&&(ARC.S.best||0)>4&&lvl>1){recTold=true;ARC.toast(T('newRec'));}
  if(bz>=LEN){
    bz=LEN;
    if(DEMO){demoNext();return;}
    won=true;
    ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:34,color:PAL.rail,speed:300,size:6,life:.9});
    ARC.toast(T('goal'));
    setTimeout(finishWin,420);
    return;
  }
  if(!DEMO&&(Math.round(bz)!==hudM||(ARC.frame%12===0))){hudM=Math.round(bz);hud();}
  tilt=lerp(tilt,(tx-bx)*2.4,.16);
  ball.position.set(bx,BR,-bz);
  ball.rotation.x-=vz*dt*2.3;
  ball.rotation.z=-tilt*.5;
}
G.step=function(dt){sim(dt);};
/* ======================================================== MODO ATRACCIÓN
   El motor llama attract() en cada cuadro mientras el menú está abierto y le
   pone la clase .live al menú. Es la misma pista y el mismo piloto: la pelota
   corre sola, la cámara orbita despacio y nada mata ni suena ni se guarda. */
function demoLvl(){
  /* la zona que el jugador está por jugar (así el menú muestra SU nivel) */
  return clamp((ARC.S.done||0)+1,1,8);
}
function demoBack(){
  /* reaparece 7 m atrás, en el camino garantizado */
  const z=Math.max(0,Math.round(bz)-7);
  bz=z;bx=tx=lx(pathL[clamp(z,0,pathL.length-1)]);
  dead=0;fallV=0;boostT=0;warm=1;pbx=bx;pbz=bz;
  ball.position.set(bx,BR,-bz);ball.rotation.set(0,0,0);
}
function demoNext(){
  const n=clamp(lvl%8+1,1,8);
  startLevel(n,true);
  warm=1;botOn=1;
}
G.attract=function(dt,g){
  if(!T3||!scene)return;
  if(!demoOn){DEMO=1;demoOn=1;startLevel(demoLvl(),true);warm=1;}
  DEMO=1;botOn=1;
  sim(dt);
  drawScene(1);
};
/* ------------------------------------------------------------------- dibujo
   Encuadre MEDIDO con dbg.ballScreen(): con la cámara vieja (y 2,5 · z 5,6 ·
   mirando 11,6 m adelante) el horizonte caía a media pantalla y la mitad de
   arriba era vacío negro. Con y 4,0 · z 6,8 · punto de mira 6,9 m delante de la
   pelota el horizonte queda al 21% y la pelota al ~72% del alto: se ve mucha
   más pista y la pelota no se mete debajo de la bandeja de botones. */
const CAMY=4.0,CAMZ=6.8,AIM=6.9;
function proj(x,y,z){
  const v=vec().set(x,y,z).project(cam);
  return{x:(v.x*.5+.5)*ARC.W,y:(-v.y*.5+.5)*ARC.H,z:v.z};
}
function drawScene(alpha){
  const a=clamp(alpha||0,0,1);
  const ibx=lerp(pbx,bx,a),ibz=lerp(pbz,bz,a);
  ball.position.x=ibx;ball.position.z=-ibz;
  if(DEMO){
    /* CÁMARA DEL MENÚ. Dos cosas que se corrigieron mirando las capturas:
       (a) la cámara orbitaba y cada tanto dejaba la pelota EN EL CENTRO, justo
           debajo del botón JUGAR (captura M-ANTES-menu2-h.png: la pelota tapada
           por el botón);
       (b) miraba casi de frente y la cinta de pista se iba al punto de fuga del
           medio, que es donde vive el título.
       La cuenta se hizo con la proyección a mano y se comprobó con
       dbg.ballScreen(): cámara 2,2 m a la DERECHA de la pelota y 12 m atrás,
       mirando 5,3 m más a la derecha y 15 m adelante. Con eso la pelota cae al
       ~29% de ancho y ~61% de alto: a la izquierda del título y ARRIBA del botón
       JUGAR (que ocupa del 72% al 85% del alto), y la pista entra por abajo a la
       izquierda y se va al horizonte. El vaivén es chico (±1,8 m) para que la
       pelota no se vuelva a meter debajo del botón. */
    const w=ARC.t*.15;
    cam.position.set(ibx*.25+2.2+Math.sin(w)*1.8,2.9+Math.sin(w*1.7)*.5,-ibz+12+Math.cos(w*.8)*1.4);
    cam.lookAt(ibx*.2+7.5,.5,-ibz-15);
    cam.rotation.z=-.03+Math.sin(w*.9)*.02;
    ballSh.position.set(ibx,.03,-ibz);
    ballSh.visible=!dead;
    if(skyG)skyG.position.set(cam.position.x,0,cam.position.z);
    ARC.rnd.render(scene,cam);
    return;
  }
  /* golpe de campo visual con el impulso: 52° -> 58° */
  const bk=boostT/BOOSTT;
  const fov=52+6*bk;
  if(Math.abs(cam.fov-fov)>.05){cam.fov=fov;cam.updateProjectionMatrix();}
  cam.position.set(ibx*.42,CAMY+(dead&&dieK==='fall'?-.4:0),-ibz+CAMZ);
  cam.lookAt(ibx*.22,.15,-ibz-AIM);
  cam.rotation.z=tilt*.018;
  /* el cielo (estrellas) es un skybox: sigue a la cámara en el plano del piso */
  if(skyG)skyG.position.set(cam.position.x,0,cam.position.z);
  ballSh.position.set(ibx,.03,-ibz);
  ballSh.visible=!dead||dieK!=='fall';
  ARC.rnd.render(scene,cam);
}
G.draw=function(g,alpha){
  if(!ARC.rnd||!scene||!cells.length)return;
  /* interpolación: la simulación va a 60 Hz fijos y el celular dibuja a 30 o a
     120; sin esto la pelota tiembla en las pantallas rápidas */
  const a=clamp(alpha||0,0,1);
  const ibx=lerp(pbx,bx,a),bzz=lerp(pbz,bz,a);
  drawScene(a);
  /* --- capa 2D: barra, avisos, ayuda --- */
  const W=ARC.W,H=ARC.H;
  /* resplandor de la pelota con el color de la pelota elegida: es la manera
     barata de que las 6 pelotas se distingan de verdad en pantalla */
  const B=curBall();
  if(partK>.5&&!dead){
    const p=proj(ibx,BR,-bzz);
    if(p.z<1){
      const r=Math.max(12,H*(.075+.03*(boostT/BOOSTT)));
      const gr=g.createRadialGradient(p.x,p.y,1,p.x,p.y,r);
      gr.addColorStop(0,B.g+'66');gr.addColorStop(1,B.g+'00');
      g.fillStyle=gr;g.beginPath();g.arc(p.x,p.y,r,0,TAU);g.fill();
      if(B.sp&&(ARC.frame%9===0))ARC.fx.burst(p.x,p.y,{n:2,color:B.g,speed:70,size:2.2,life:.35,g:120});
    }
  }
  /* RÁFAGA: rayas que cruzan la pantalla hacia donde sopla + flecha grande. Sin
     esto el viento se siente como un bug del control. */
  if(windOn&&!dead&&!won){
    const d=windOn;
    g.globalAlpha=.5;g.strokeStyle=PAL.bar;g.lineWidth=Math.max(1,H*.005);
    for(let i=0;i<7;i++){
      const yy=H*(.20+i*.088),ph=((ARC.t*1.35+i*.37)%1);
      const x0=(d>0?-.15+ph*1.2:1.15-ph*1.2)*W,ln=W*(.10+.05*Math.sin(i*2.1));
      g.globalAlpha=.10+.34*Math.sin(ph*Math.PI);
      g.beginPath();g.moveTo(x0,yy);g.lineTo(x0+d*ln,yy);g.stroke();
    }
    g.globalAlpha=1;g.textAlign='left';
  }
  /* líneas de velocidad del impulso */
  if(boostT>0&&!dead){
    const k=boostT/BOOSTT;
    g.globalAlpha=.18+.42*k;g.strokeStyle=PAL.boost;g.lineWidth=Math.max(1,H*.006);
    for(let i=0;i<7;i++){
      const yy=H*(.24+i*.093),ln=W*.06*(.5+k);
      g.beginPath();g.moveTo(W*.06,yy);g.lineTo(W*.06+ln,yy);g.stroke();
      g.beginPath();g.moveTo(W*.94,yy);g.lineTo(W*.94-ln,yy);g.stroke();
    }
    g.globalAlpha=1;
  }
  /* galones de peligro proyectados: se ven venir de lejos */
  if(!dead&&!won){
    const pulse=.55+.45*Math.sin(ARC.t*7);
    const z0=Math.max(0,Math.ceil(bzz+3.5)),z1=Math.floor(bzz+27);
    for(let zz=z0;zz<=z1;zz++)for(const o of obsAt(zz)){
      const d=o.z-bzz;
      if(d<3.5||d>27)continue;
      const gate=o.t==='puls';
      const hh=gate?pulsH(o,ARC.t):1;
      if(gate&&hh<.15)continue;               /* abierta: no es peligro ahora */
      const p=proj(sawX(o,ARC.t),1.55,-o.z);
      if(p.z>1||p.x<-40||p.x>W+40)continue;
      const s=clamp(H*.035*(1-d/34),5,H*.05);
      const al=clamp((27-d)/16,.15,1)*(d<11?pulse:.72)*(gate?hh:1);
      g.globalAlpha=al;
      g.beginPath();
      g.moveTo(p.x,p.y+s);g.lineTo(p.x-s,p.y-s*.5);g.lineTo(p.x-s*.45,p.y-s*.5);
      g.lineTo(p.x,p.y+s*.25);g.lineTo(p.x+s*.45,p.y-s*.5);g.lineTo(p.x+s,p.y-s*.5);
      g.closePath();
      /* contorno oscuro: el galón magenta sobre la pista cian se perdía */
      g.lineWidth=Math.max(1.5,s*.22);g.strokeStyle='rgba(4,10,16,.85)';g.stroke();
      g.fillStyle=PAL.danger;g.fill();
      g.globalAlpha=1;
    }
    /* el arco de control avisa a 40 m */
    const dc=CPZ-bzz;
    if(!cpOn&&dc>0&&dc<44){
      const p=proj(0,3.3,-CPZ);
      if(p.z<1){
        g.globalAlpha=clamp((44-dc)/26,.2,.95);
        g.fillStyle=PAL.cp;g.textAlign='center';
        g.font='900 '+Math.max(10,H*.036)+'px system-ui,sans-serif';
        g.fillText('▼ '+Math.round(dc)+' m',p.x,p.y);
        g.globalAlpha=1;g.textAlign='left';
      }
    }
  }
  /* barra de avance arriba, con marca del arco y de la meta */
  const bw=W*.46,bxx=(W-bw)/2,byy=H*.115,bh=Math.max(4,H*.014);
  g.fillStyle='rgba(255,255,255,.13)';g.fillRect(bxx,byy,bw,bh);
  g.fillStyle=cpOn?PAL.cpOn:PAL.bar;g.fillRect(bxx,byy,bw*clamp(bzz/LEN,0,1),bh);
  g.fillStyle=cpOn?PAL.cpOn:PAL.cp;g.fillRect(bxx+bw*.5-1.5,byy-3,3,bh+6);
  g.fillStyle=PAL.rail;g.fillRect(bxx+bw-2,byy-3,3,bh+6);
  /* diamantes juntados y medallas del nivel */
  g.globalAlpha=.9;g.fillStyle=PAL.gem;
  g.font='900 '+Math.max(9,H*.03)+'px system-ui,sans-serif';g.textAlign='left';
  g.fillText('◆ '+gemN+'/'+gemT,bxx,byy-Math.max(5,H*.022));
  const md=medOf(lvl);
  g.textAlign='right';
  for(let i=0;i<3;i++){
    g.globalAlpha=(md&MEDS[i].bit)?.95:.28;
    g.fillStyle=(md&MEDS[i].bit)?PAL.cpOn:'#eef2f6';
    g.fillText(MEDS[i].ic,bxx+bw-(2-i)*Math.max(11,H*.038),byy-Math.max(5,H*.022));
  }
  g.globalAlpha=1;g.textAlign='left';
  /* ayuda al empezar */
  if(bzz<9&&!dead){
    g.globalAlpha=clamp((9-bzz)/4,0,1);
    g.fillStyle='rgba(255,255,255,.94)';g.textAlign='center';
    g.font='900 '+Math.max(12,H*.045)+'px system-ui,sans-serif';
    g.fillText(T('tutDrag'),W/2,H*.30);
    g.font='800 '+Math.max(9,H*.028)+'px system-ui,sans-serif';
    g.globalAlpha*=.75;g.fillText(T('tutSide'),W/2,H*.36);
    g.globalAlpha=1;g.textAlign='left';
  }
};
/* ================================================= PANEL: PELOTAS Y MEDALLAS
   Panel propio de DOM (no se toca el DOM del shell: se AGREGA uno). Se abre con
   el botón redondo del menú (GAME.extra). Pestaña 1: las 6 pelotas, que se
   pagan con diamantes. Pestaña 2: las 8 zonas con su mejor tiempo, sus
   diamantes y sus 3 medallas. */
let panelEl=null,panelTab=0;
function ballThumb(B){
  const cv=document.createElement('canvas');cv.width=120;cv.height=120;
  const g=cv.getContext('2d');
  let gr=g.createRadialGradient(60,60,2,60,60,58);
  gr.addColorStop(0,B.g+'88');gr.addColorStop(1,B.g+'00');
  g.fillStyle=gr;g.fillRect(0,0,120,120);
  gr=g.createRadialGradient(46,44,4,60,60,40);
  gr.addColorStop(0,'#ffffff');gr.addColorStop(.35,B.c);gr.addColorStop(1,mixc(B.c,'#000000',.55));
  g.fillStyle=gr;g.beginPath();g.arc(60,60,38,0,Math.PI*2);g.fill();
  g.strokeStyle=B.g;g.lineWidth=2.5;g.stroke();
  return cv;
}
/* ================================================== TOCADISCOS (15 temas)
   Quince pistas propias, cada una con su estilo. Por defecto suena la que le toca
   a la ZONA del nivel (así el juego cambia de ánimo a medida que avanzás) y desde
   el panel se puede clavar una a mano. La pista NO se precarga con los efectos:
   ARC.music le pasa la URL a un <audio> que la baja cuando hace falta, así que
   tener quince no le cuesta nada al arranque — se baja UNA (1,5 MB).
   El orden de zona es el de ZONAS: cyan, violeta, jungla, ámbar, rosa, hielo,
   lava, oro; las siete de más quedan sólo para elegir. */
const TRACKS=[
  {f:'mus-r01.m4a',k:'t01'},{f:'mus-r02.m4a',k:'t02'},{f:'mus-r03.m4a',k:'t03'},
  {f:'mus-r04.m4a',k:'t04'},{f:'mus-r05.m4a',k:'t05'},{f:'mus-r06.m4a',k:'t06'},
  {f:'mus-r07.m4a',k:'t07'},{f:'mus-r08.m4a',k:'t08'},{f:'mus-r09.m4a',k:'t09'},
  {f:'mus-r10.m4a',k:'t10'},{f:'mus-r11.m4a',k:'t11'},{f:'mus-r12.m4a',k:'t12'},
  {f:'mus-r13.m4a',k:'t13'},{f:'mus-r14.m4a',k:'t14'},{f:'mus-r15.m4a',k:'t15'}
];
const ZTRACK=[0,1,2,3,4,5,6,7];        /* qué tema le toca a cada nivel/zona */
/* -1 = automático por zona */
function trackPick(){const v=ARC.S.trk;return v==null?-1:v|0;}
function trackFor(l){
  const p=trackPick();
  if(p>=0&&p<TRACKS.length)return p;
  return ZTRACK[clamp((l|0)-1,0,7)];
}
function playTrack(l){
  const i=trackFor(l);
  ARC.music(A(TRACKS[i].f));
  return i;
}
function setTrack(i){
  ARC.S.trk=(i<0?null:i);ARC.save();
  playTrack(lvl||1);
  ARC.sfx('gem',{vol:.5});
  panelFill();
}
function panelBuild(){
  if(panelEl)return;
  const d=document.createElement('div');d.id='rdP';
  d.innerHTML='<div class="rdCard"><div class="rdTabs"><b id="rdT0"></b><b id="rdT1"></b>'+
    '<b id="rdT2"></b></div>'+
    '<div class="rdBody" id="rdBody"></div>'+
    '<div class="rdFoot"><span id="rdC">◆ 0</span><div class="btn" id="rdX"></div></div></div>';
  document.getElementById('stage').appendChild(d);
  panelEl=d;
  d.addEventListener('pointerdown',e=>{if(e.target===d){e.preventDefault();panelClose();}});
  const B2=(id,fn)=>{const e=document.getElementById(id);
    e.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();
      ARC.sndResume();ARC.sfx('click');fn();});};
  B2('rdT0',()=>{panelTab=0;panelFill();});
  B2('rdT1',()=>{panelTab=1;panelFill();});
  B2('rdT2',()=>{panelTab=2;panelFill();});
  B2('rdX',()=>panelClose());
}
function panelFill(){
  if(!panelEl)return;
  const b=document.getElementById('rdBody');
  document.getElementById('rdT0').textContent=T('balls');
  document.getElementById('rdT1').textContent=T('medals');
  document.getElementById('rdT2').textContent=T('music');
  document.getElementById('rdT0').className=panelTab===0?'on':'';
  document.getElementById('rdT1').className=panelTab===1?'on':'';
  document.getElementById('rdT2').className=panelTab===2?'on':'';
  document.getElementById('rdX').textContent=T('close');
  document.getElementById('rdC').textContent='◆ '+(ARC.S.coins||0)+
    '   ('+(ARC.S.gems||0)+' '+T('gemsTot')+')';
  b.innerHTML='';b.className='rdBody'+(panelTab?' q':'');
  if(panelTab===2){
    /* TOCADISCOS: primero AUTOMÁTICO y después las quince pistas */
    const cur=trackPick();
    const row=(idx,name,sub)=>{
      const el=document.createElement('div');
      el.className='rdQ rdTr'+(cur===idx?' dn':'');
      el.innerHTML='<b>'+(cur===idx?'▶ ':'')+name+'</b><span>'+sub+'</span>';
      el.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();
        ARC.sndResume();setTrack(idx);});
      b.appendChild(el);
    };
    row(-1,T('mAuto'),T('mAutoD'));
    TRACKS.forEach((t,i)=>row(i,(i+1)+'. '+T(t.k),
      i<8?(T('zone')+' '+(i+1)+' · '+zoneName(i+1)):T('mExtra')));
    return;
  }
  if(panelTab===0){
    const cur=curBall().id;
    BALLS.forEach((B,i)=>{
      const own=hasB(B.id),on=own&&B.id===cur;
      const el=document.createElement('div');
      el.className='rd1'+(on?' on':'')+(own?'':' lk');
      el.appendChild(ballThumb(B));
      const nm=document.createElement('i');nm.textContent=T(B.k);el.appendChild(nm);
      const u=document.createElement('u');
      u.textContent=on?T('inUse'):(own?T('use'):(B.cost+' ◆'));
      el.appendChild(u);
      el.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();
        ARC.sndResume();
        if(own){ARC.sfx('click');chooseBall(i);}
        else if((ARC.S.coins||0)>=B.cost){
          ARC.S.coins-=B.cost;
          ownedB().push(B.id);ARC.save();
          ARC.sfx('power');ARC.toast(T('bought')+' '+T(B.k),1500);
          ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:Math.round(20*partK),color:B.g,speed:230});
          chooseBall(i);
        }else{ARC.sfx('lose',{vol:.5});ARC.toast(T('locked'),1300);}
        panelFill();});
      b.appendChild(el);
    });
  }else{
    for(let n=1;n<=8;n++){
      const lock=n>(ARC.S.done||0)+1;
      const md=medOf(n),bt=bestT(n),gl=(ARC.S.gemLv||{})[String(n)]||0;
      const el=document.createElement('div');
      el.className='rdQ'+(md===7?' dn':'')+(lock?' lk':'');
      el.innerHTML='<b>'+T('level')+' '+n+' · '+zoneName(n)+'</b>'+
        '<span>'+(lock?T('lock'):
          ('⏱ '+(bt?fmtT(bt):'—')+' <em>'+T('parT')+' '+fmtT(parOf(n))+'</em>'+
           ' &nbsp;·&nbsp; ◆ '+gl))+'</span>'+
        '<div class="rdM">'+MEDS.map(m=>'<u class="'+((md&m.bit)?'on':'')+'" title="'+T(m.k)+'">'+
          m.ic+'</u>').join('')+'</div>';
      b.appendChild(el);
    }
  }
}
function panelOpen(t){
  panelBuild();panelTab=t||0;panelFill();
  panelEl.classList.add('on');
}
function panelClose(){if(panelEl)panelEl.classList.remove('on');}
function chooseBall(i){
  ARC.S.ball=BALLS[i].id;ARC.save();
  applyBall();
  if(!DEMO)ARC.sfx('power',{vol:.6});
  panelFill();
}
G.extra={icon:'◆',fn:()=>panelOpen(0)};
/* ------------------------------------------------------------------- CSS propio
   Dos cosas: (a) con MODO ATRACCIÓN el motor apaga el arte del menú (#menu.live)
   pero sigue escondiendo el título de DOM con .hasart — medido en captura: el
   menú quedaba SIN nombre de juego; (b) el panel de pelotas y medallas.
   Las medidas van contra el ESCENARIO (--sw/--sh), no contra la ventana: con el
   celular vertical el escenario está rotado y vmin/vw de la ventana viven en el
   eje cruzado. */
const CSSFIX=`
#menu.hasart.live .ttl{display:block}
#menu.live .sub{text-shadow:0 2px 8px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.8)}
#menu.live .ttl{text-shadow:0 3px 0 rgba(0,0,0,.5),0 10px 30px rgba(0,0,0,.85)}
#rdP{position:absolute;inset:0;z-index:7;display:none;align-items:center;justify-content:center;
  background:rgba(4,6,10,.82);pointer-events:auto;padding:calc(var(--smn)*.03)}
#rdP.on{display:flex;animation:fade .16s ease-out}
/* MEDIDO EN CAPTURA (SC-panel-pelotas.png): con las pelotas a 0,17 del lado corto
   la segunda fila quedaba cortada y no se veía el PRECIO de las tres pelotas de
   abajo. A 0,115 entran las dos filas completas en 412 px de alto. */
#rdP canvas{position:static;width:100%;height:auto;max-width:calc(var(--smn)*.115);display:block}
#rdP .rdCard{width:100%;max-width:calc(var(--sw)*.9);max-height:97%;display:flex;flex-direction:column;
  gap:calc(var(--smn)*.016);border-radius:18px;padding:calc(var(--smn)*.026);
  background:linear-gradient(180deg,rgba(18,26,34,.98),rgba(8,12,18,.98));
  border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 60px rgba(0,0,0,.7)}
#rdP .rdTabs{display:flex;gap:5px;background:rgba(255,255,255,.07);padding:4px;border-radius:12px}
#rdP .rdTabs b{flex:1;text-align:center;font-weight:900;padding:.55em 0;border-radius:9px;opacity:.55;
  font-size:clamp(10px,calc(var(--smn)*.05),17px)}
#rdP .rdTabs b.on{background:linear-gradient(180deg,var(--acc),var(--acc2));color:#10141a;opacity:1}
#rdP .rdBody{overflow-y:auto;display:grid;grid-template-columns:1fr 1fr 1fr;
  gap:calc(var(--smn)*.02);align-content:start}
#rdP .rdBody.q{grid-template-columns:1fr;gap:calc(var(--smn)*.008)}
#rdP .rd1{display:flex;flex-direction:column;align-items:center;gap:.18em;padding:.3em .2em;
  border-radius:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
#rdP .rd1.on{border-color:var(--acc);background:rgba(34,211,238,.18)}
#rdP .rd1.lk canvas{filter:grayscale(.3) brightness(.8)}
#rdP .rd1 i{font-style:normal;font-weight:900;font-size:clamp(8px,calc(var(--smn)*.036),14px);
  letter-spacing:.4px;text-align:center}
#rdP .rd1 u{text-decoration:none;font-weight:900;font-size:clamp(8px,calc(var(--smn)*.034),13px);
  padding:.3em .6em;border-radius:8px;background:linear-gradient(180deg,var(--acc),var(--acc2));
  color:#10141a;white-space:nowrap}
#rdP .rd1.lk u{background:rgba(255,255,255,.14);color:#eef2f6}
#rdP .rdQ{display:flex;align-items:center;gap:.5em;padding:.16em .6em;border-radius:10px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
#rdP .rdQ.dn{border-color:#43e57a;background:rgba(67,229,122,.13)}
#rdP .rdQ.lk{opacity:.45}
#rdP .rdTr{cursor:pointer}
#rdP .rdTr b{min-width:9.5em}
#rdP .rdTr:active{transform:scale(.985)}
#rdP .rdQ b{font-size:clamp(9px,calc(var(--smn)*.038),15px);font-weight:900;white-space:nowrap}
#rdP .rdQ span{flex:1;font-size:clamp(8px,calc(var(--smn)*.033),13px);opacity:.8;font-weight:800;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rdP .rdQ span em{font-style:normal;opacity:.55}
#rdP .rdM{display:flex;gap:.28em}
#rdP .rdM u{text-decoration:none;font-size:clamp(10px,calc(var(--smn)*.042),17px);opacity:.22}
#rdP .rdM u.on{opacity:1;color:#43e57a;text-shadow:0 0 8px rgba(67,229,122,.6)}
#rdP .rdFoot{display:flex;align-items:center;justify-content:space-between;gap:1em}
#rdP .rdFoot span{font-weight:900;font-size:clamp(10px,calc(var(--smn)*.042),18px);color:var(--acc)}
`;
function cssFix(){
  if(!document.getElementById('ruedaCss')){
    const st=document.createElement('style');st.id='ruedaCss';st.textContent=CSSFIX;
    document.head.appendChild(st);
  }
  const r=document.documentElement.style;
  r.setProperty('--sw',ARC.W+'px');
  r.setProperty('--sh',ARC.H+'px');
  r.setProperty('--smn',Math.min(ARC.W,ARC.H)+'px');
}
/* ---------------------------------------------------------------- el piloto */
/* Seguridad de un carril en una fila, con la sierra que se mueve y la compuerta
   PREDICHAS en el momento en que la pelota va a llegar (tres muestras: el
   barrido es rápido y la compuerta también). */
function okAt(i,z,tArr){
  if(i<0||i>=LANES)return false;
  if(!cells[z]||!cells[z][i])return false;
  const x=lx(i);
  for(let zz=z-1;zz<=z+1;zz++){
    for(const o of obsAt(zz)){
      if(Math.abs(o.z-z)>1.05)continue;
      if(o.t==='puls'){
        if(Math.abs(o.x-x)>=o.w+.62)continue;
        for(const dd of [-.14,0,.14])if(pulsH(o,ARC.t+tArr+dd)>.22)return false;
        continue;
      }
      if(!o.amp){if(Math.abs(o.x-x)<o.w+.62)return false;continue;}
      for(const dd of [-.12,0,.12]){
        if(Math.abs(sawX(o,ARC.t+tArr+dd)-x)<o.w+.62)return false;
      }
    }
  }
  return true;
}
/* PLANIFICADOR CON ADELANTO.
   Versión 1 (la que se cayó): programación dinámica que elegía el carril de la
   fila donde YA tenía que estar. Como cruzar un carril cuesta 0,12 s (1,35 m a
   11,3 m/s), el plan llegaba una fila y media tarde y el piloto moría raspando:
     hit@90,6 x=−1,25  (muro w1 en la fila 91: recién empezaba a salir del 1)
     fall@183,6 x=0,00 y fall@222,6 x=−2,50 (agujero en la fila de abajo).
   Versión 2: la DP guarda de dónde vino cada casillero, se RECONSTRUYE el camino
   completo y se apunta al primer carril donde el camino cambia, arrancando la
   maniobra hasta S+2 filas antes (S = filas que cuesta un carril). Antes de
   arrancar se comprueba que el carril de destino esté libre en toda la ventana
   del cruce: mover temprano no sirve si te comés el muro del vecino.
   Versión 3 (velocidad): okAt se llamaba hasta 240 veces por plan y cada llamada
   barría los 95 obstáculos del nivel; ahora los obstáculos están indexados por z
   y cada casillero se cachea en `memo`. Medido con el piloto encendido en el
   nivel 8: 20,6 -> 31,2 fps sólo por esto y por sacar el MSAA. */
function botPlan(){
  const z0=Math.round(bz),cur=laneOf(bx);
  const DEEP=16;
  const S=Math.max(1,Math.ceil(CW*Math.max(1,vz)/LSP));
  const tOf=d=>d/Math.max(1,vz);
  const memo=[];
  const OK=(i,d)=>{
    const row=memo[d]||(memo[d]=[]);
    const v=row[i];
    return v===undefined?(row[i]=okAt(i,z0+d,tOf(d))):v;
  };
  const L=[new Array(LANES).fill(null)];
  L[0][cur]={from:-1,g:0};                    /* la pelota ESTÁ acá, no hay opción */
  for(let d=1;d<=DEEP;d++){
    const prev=L[d-1],nx=new Array(LANES).fill(null);
    const can=(d%S)===0;                      /* sólo cada S filas se cambia */
    for(let i=0;i<LANES;i++){
      if(!OK(i,d))continue;
      const from=can?[i,i-1,i+1]:[i];
      for(const k of from){
        if(k<0||k>=LANES||!prev[k])continue;
        /* cruce seguro: los dos carriles libres en las dos filas */
        if(k!==i&&!(OK(i,d-1)&&OK(k,d)))continue;
        /* PUNTAJE: diamantes y rampas primero, y después PEGARSE A LA LÍNEA DE
           DISEÑO (pathL). Sin el segundo término el plan no tenía preferencia
           entre quedarse y acompañar la línea, la pelota se quedaba pegada al
           carril de antes y cuando la línea se corría llegaba dos filas tarde y
           se caía (medido: fall@65,6 x=1,25 con la fila 66 = 11100 y la línea ya
           en el 1). La línea es la garantía del generador: siempre está sólida y
           sin bichos. */
        const g=prev[k].g+(gemAt(z0+d,i)?6:0)+(boostAt(z0+d,i)?4:0)-Math.abs(i-guide(z0+d))*2.5;
        if(!nx[i]||g>nx[i].g)nx[i]={from:k,g};
      }
    }
    if(!nx.some(Boolean))break;
    L.push(nx);
  }
  const last=L.length-1;
  let bi=-1;
  for(let i=0;i<LANES;i++){
    const c=L[last][i];if(!c)continue;
    if(bi<0||c.g>L[last][bi].g||
      (c.g===L[last][bi].g&&Math.abs(i-cur)<Math.abs(bi-cur)))bi=i;
  }
  let want=cur;
  if(bi>=0&&last>=4){
    const path=new Array(last+1);path[last]=bi;
    for(let d=last;d>0;d--)path[d-1]=L[d][path[d]].from;
    let dc=-1;
    for(let d=1;d<=last;d++)if(path[d]!==cur){dc=d;break;}
    if(dc>0&&dc<=S+2&&canCross(path[dc],S,OK))want=path[dc];
  }else{
    /* PLAN CORTO (callejón sin salida a la vista): volver a la línea de diseño, y
       si el paso está tapado, el vecino que aguante más filas. Antes acá se
       quedaba quieto y se caía en el agujero que ya tenía debajo. */
    const gl=guide(z0+S);
    let bd=-1;
    if(gl!==cur){
      const st=cur<gl?cur+1:cur-1;
      if(canCross(st,S,OK))want=st;
    }
    if(want===cur)for(const i of [cur,cur-1,cur+1]){
      if(i<0||i>=LANES)continue;
      let d=0;while(d<8&&OK(i,d))d++;
      if(d>bd){bd=d;want=i;}
    }
  }
  tx=clamp(lx(want),-HALF,HALF);
  return true;
}
function gemAt(z,i){for(const gm of gems)if(!gm.got&&gm.z===z&&gm.i===i)return 1;return 0;}
function boostAt(z,i){for(const b of boosts)if(b.z===z&&b.i===i)return 1;return 0;}
function guide(z){return pathL[clamp(z,0,pathL.length-1)];}
/* ¿Se puede empezar a rodar al carril i AHORA? Tiene que estar libre en todas las
   filas del cruce y en la de llegada. MEDIDO: el respaldo miraba UNA sola fila y
   metía la pelota en un agujero que estaba dos filas más adelante — tres muertes
   idénticas, fall@152,3 x=1,63 (nivel 4, fila 152 = 11101), fall@220,3 x=0,37
   (nivel 5) y fall@225,5 x=1,63 (nivel 6). El desplazamiento siempre era el mismo
   (0,38 del centro del carril) porque es justo donde el perdón de 12 cm del piso
   deja de alcanzar: la pelota moría al salirse del borde de la baldosa vecina. */
function canCross(i,S,OK){
  if(i<0||i>=LANES)return false;
  for(let r=0;r<=S+1;r++)if(!OK(i,r))return false;
  return true;
}
G.dbg={
  state:()=>({bz:+bz.toFixed(1),LEN,lvl,zone:zoneName(lvl),gems:gemN,gemT,dead:!!dead,won,
    cp:cpOn,cpUsed,vz:+vz.toFixed(1),x:+bx.toFixed(2),bot:botOn,how:lastDie,demo:DEMO,
    t:+runT.toFixed(2),par:PAR,boostN,boosts:boosts.length,
    obs:obs.length,saws:obs.filter(o=>o.t==='saw').length,gates:obs.filter(o=>o.t==='puls').length,
    winds:winds.length,wind:windOn,
    ball:curBall().id,res:+resK.toFixed(2),
    ch:{n:chunks.length,vis:chVis,ch:CH},
    gfx:{part:partK,fog:fogK,fogN:scene&&scene.fog?+scene.fog.near.toFixed(0):0,stars:!!(stars&&stars.visible)},
    saved:{coins:ARC.S.coins||0,gems:ARC.S.gems||0,lv:ARC.S.gemLv||{},med:ARC.S.med||{},
      tLv:ARC.S.tLv||{},balls:ownedB()}}),
  rows:(a,b)=>{const o=[];for(let z=a;z<=b;z++){
    const r=cells[z]?cells[z].join(''):'?';
    const ob=obsAt(z).map(x=>x.t[0]+x.i+(x.amp?'~':''));
    const gm=gems.filter(x=>x.z===z).map(x=>'d'+x.i);
    const bo=boosts.filter(x=>x.z===z).map(x=>'B'+x.i);
    o.push(z+':'+r+' p'+pathL[z]+(ob.length?' ('+ob.join(',')+')':'')+
      (gm.length?' '+gm.join(','):'')+(bo.length?' '+bo.join(','):''));}
    return o;},
  ballScreen:()=>{const p=proj(bx,BR,-bz);return{sx:+(p.x/ARC.W*100).toFixed(1),sy:+(p.y/ARC.H*100).toFixed(1)};},
  lv:()=>LV.map((p,i)=>({n:i+1,len:p.len,spd:p.spd,seg:+(p.len/p.spd).toFixed(1),par:parOf(i+1),
    zone:zoneName(i+1)})),
  /* para el informe: cuánto se dibuja de verdad */
  info:()=>ARC.rnd?{tris:ARC.rnd.info.render.triangles,calls:ARC.rnd.info.render.calls,
    fps:+ARC.fps.toFixed(1),res:+resK.toFixed(2)}:null,
  /* para medir A/B el costo de cada cosa (cielo, estrellas, trozos) con la
     resolución CLAVADA: si autoRes baja la resolución en medio de la prueba, los
     fps de las dos ramas no se pueden comparar */
  scene:()=>scene,
  lockRes:()=>{noRes=1;resK=1;applyRes();return true;},
  /* teleporte al carril del camino, para fotografiar un punto concreto de la pista
     (la ráfaga, el arco de control, la meta) sin jugar 200 m */
  tp:z=>{bz=clamp(z,0,LEN-1);bx=tx=lx(guide(Math.round(bz)));pbx=bx;pbz=bz;
    warm=1;dead=0;fallV=0;ball.position.set(bx,BR,-bz);return +bz.toFixed(1);},
  winds:()=>winds.map(w=>({z0:w.z0,z1:w.z1,d:w.d})),
  i18n:()=>{const ks=Object.keys(G.i18n.es),out={};
    for(const l of ['es','en','pt']){const f=ks.filter(k=>!G.i18n[l][k]);out[l]=f.length?('FALTAN '+f.join(',')):'ok';}
    return out;},
  panel:t=>{panelOpen(t||0);return true;},
  /* Enciende el piloto y planifica. La sonda lo llama cada 500 ms y en ese tiempo
     la pelota hace 4 m: si sólo se planificara acá, el plan llega tarde. Con
     botOn el paso fijo vuelve a planificar en cada cuadro de simulación. */
  autoMove:()=>{
    if(dead||won)return false;
    botOn=1;
    return botPlan();
  }
};
window.GAME=G;
