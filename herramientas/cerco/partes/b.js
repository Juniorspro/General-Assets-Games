/* ══════════════════════════════════════════════════════════════════════════
   B · CONSTANTES, MUNDOS, IDIOMAS Y GUARDADO
   ══════════════════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const mez = (a, b, k) => a + (b - a) * k;

/* AZAR CON SEMILLA. Un nivel tiene que ser EL MISMO nivel en cualquier
   aparato y en cualquier intento: con un azar de verdad, «el 3-5» no querria
   decir nada y reintentar seria jugar otro mapa.                           */
function azar(s) {
  let x = (s | 0) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x |= 0; return (x >>> 0) / 4294967296; };
}

/* ── LAS CUATRO DIRECCIONES ───────────────────────────────────────────────
   El indice ES la direccion y su opuesta es `d^1`. Con eso la regla de «no
   se puede dar media vuelta» —la de cualquier juego de estela— se escribe en
   una comparacion y no en una tabla que alguien tiene que mantener.        */
const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];    /* der · izq · abajo · arriba */
const DNOM = ['der', 'izq', 'abajo', 'arriba'];

/* ── LO QUE HAY EN UNA CELDA ──────────────────────────────────────────────
   `z` es el DUENO del terreno y `t` el dueno de la ESTELA, y son dos cosas
   distintas a proposito: se puede estar parado sobre tierra propia y tener
   estela de otro en la misma celda. Guardarlo en un solo numero obligaria a
   inventar combinaciones y el dia que entre un cuarto rival no alcanzan.   */
const LIBRE = 0;      /* z: nadie                                           */
const PIEDRA = 9;     /* z: roca — bloquea, mata y corta el relleno         */
const NJUG = 8;       /* el jugador es el 1; los rivales van del 2 al 8     */
/* OCHO Y NO CUATRO, Y EL TECHO NO ES ARBITRARIO: `PIEDRA` vale 9, o sea que
   los identificadores 1..8 son exactamente los que entran por debajo de la
   roca sin tener que ensanchar `z` ni `t` a un tipo mas grande. La campana
   sigue usando de 2 a 4 y no paga un byte por los cuatro que no siembra.   */

/* ── LOS COLORES ──────────────────────────────────────────────────────────
   TRES POR JUGADOR, Y EN LA ESFERA EL REPARTO SE DA VUELTA. En el tablero
   plano el terreno era OSCURO y la estela clara: el fondo era papel, asi que
   lo propio tenia que ensuciarlo. Un planeta no es papel — es una superficie
   iluminada, el terreno es LO QUE MAS SE VE, y un terreno oscuro sobre una
   esfera clara se lee a mancha y no a territorio. Ahora:

   · `z` es el color VIVO y saturado, que es el que cubre el planeta;
   · `t` es el MISMO tono mas claro, para que la estela se distinga contra el
     terreno propio —que es justo donde hay que verla, porque volver a casa es
     cruzar lo propio—;
   · `c` es la cabeza, casi blanca, para encontrarse de una ojeada.

   Y VIVOS PERO NO AL TOPE (L 0,50 · 0,66 · 0,86): la escena lleva luz, o sea
   que el color se MULTIPLICA por ella. Con el terreno ya en el techo, la cara
   iluminada del planeta satura y las ocho familias se aplastan contra el
   blanco; con medio tono de aire, la luz tiene donde trabajar y la esfera se
   lee redonda, que es la mitad del pedido.

   LOS TONOS SE CONSERVAN CLAVADOS de la paleta plana y no se reordenan: la
   campana usa SOLO los ids 2 a 4, asi que esos tres estan lo mas lejos que se
   puede del ambar del jugador (169 · 261 · 338) y los otros cuatro rellenan
   los huecos de a 45 grados para la arena. Reordenarlos «prolijo» dejaria al
   unico rival del mundo 1 pegado al color del jugador.                      */
const COLS = [
  null,
  { z: '#e68d19', t: '#f8b359', c: '#fde0b9' },   /* 1 · vos · ambar    */
  { z: '#19e6c1', t: '#59f8dc', c: '#b9fdf1' },   /* 2 · verde agua     */
  { z: '#6119e6', t: '#9059f8', c: '#d1b9fd' },   /* 3 · violeta        */
  { z: '#e61964', t: '#f85993', c: '#fdb9d2' },   /* 4 · rosa           */
  { z: '#b3e619', t: '#d1f859', c: '#ecfdb9' },   /* 5 · verde limon    */
  { z: '#19e634', t: '#59f86d', c: '#b9fdc2' },   /* 6 · verde          */
  { z: '#1968e6', t: '#5996f8', c: '#b9d4fd' },   /* 7 · azul           */
  { z: '#e619d5', t: '#f859eb', c: '#fdb9f8' },   /* 8 · magenta        */
];
/* EL PLANETA SIN DUENO ES CLARO Y NEUTRO, y eso tampoco es gusto: es el
   FONDO contra el que se juzgan los ocho colores. Con un fondo oscuro los
   cuatro tonos frios se acercan entre si —todos leen «claro contra oscuro»—
   y con uno claro se leen por lo que son. Es la misma razon por la que la
   mesa de un juego de cartas es clara.                                      */
const C_TABLA = '#dfe6ee', C_PIEDRA = '#6b7689', C_LINEA = '#c2ccd9';

/* ── LOS NUMEROS DEL CUERPO, DERIVADOS ────────────────────────────────────
   EL ENCUADRE NO SE PIDE EN CELDAS, SE PIDE EN PLANETA, y eso no es un gusto:
   es geometria. Una esfera de radio 1 vista desde `d` subtiende `asin(1/d)`,
   asi que el disco que ocupa en pantalla sale de una cuenta cerrada; pedir «19
   celdas de arco» en cambio ata el encuadre al TAMANO del planeta, y entonces
   la arena —que tiene un planeta cinco veces mas grande que el tutorial— se
   veria como un plano, porque diecinueve celdas de 58 son un pedacito chato.
   Pidiendo disco, el planeta ocupa SIEMPRE lo mismo y lo que cambia es cuanto
   mide una celda: en un planeta grande tu territorio se ve chico, que es
   exactamente lo que este juego tiene que hacer sentir.

   `DISCO` es el DIAMETRO del planeta en fraccion del ALTO del cuadro. De ahi
   sale la distancia despejando: con `s = DISCO·tan(fov/2)`,
        tan(asin(1/d)) = s   →   d = √(1+s²)/s
   Con 0,86 y un lente de 46 grados eso da 2,92 radios: el planeta llena el
   cuadro a lo ancho —en 9:16 el ancho es el 46 % del alto, asi que un disco
   del 86 % del alto lo desborda— y deja cielo arriba, abajo y en las cuatro
   esquinas, que es lo unico que hace que se lea a REDONDO. Mas cerca se ve
   plano otra vez; mas lejos aparece una franja de cielo que no dice nada.   */
const DISCO = 0.86;
/* EN LA ARENA LA CAMARA SE ALEJA CON EL TERRENO, y el interpolador va con la
   RAIZ de la tajada y no lineal por la misma razon de siempre: lo que uno
   tiene que seguir viendo es el BORDE de lo propio, y el lado de un
   territorio crece como la raiz de su area. Satura en la tajada pareja
   (`OCUPA/8` = 9,9 %): mas alla de eso uno ya va ganando y alejarse mas solo
   achica la cabeza. El piso son 0,62 porque ahi una celda de la arena mide
   9,7 px en un marco de 412 — por debajo de diez, la cabeza y la estela
   dejan de distinguirse, que es lo unico que este juego pide ver.          */
const DISCO_MIN = 0.62;
const DISCO_SAT = 0.10;
const VEL = 5.4;
/* SIETE VIDAS Y NO TRES, Y EL NUMERO SALE DE UNA TASA MEDIDA. En el plano el
   bot honesto se comia 0,42 cortes por partida; en la esfera se come 1,48, y
   35 de sus 52 muertes son un rival pisandole la estela EN MEDIO DE UNA
   EXCURSION. La causa es geometrica y no de dificultad: en un plano uno se
   apoya de espaldas contra el borde, y una esfera NO TIENE BORDE. Barrido de
   vidas contra niveles ganados: 3->32 · 4->37 · 5->37 · 6->39 · 7->40 · 8->40
   · 99->40. Siete es el valor mas chico que llega a 40 de 40.                */
const VIDAS = 7;

/* ── LOS CINCO MUNDOS ─────────────────────────────────────────────────────
   Lo que crece no es «la dificultad» como numero suelto: crecen el PLANETA,
   la CANTIDAD DE RIVALES y lo BIEN QUE JUEGAN. Y el planeta es el que mas
   pesa, porque con la vista fija en 19 celdas de arco uno de 30 tiene 120 de
   circunferencia: seis pantallas de vuelta, o sea que hay que acordarse de
   por donde se venia. `n` es el lado de UNA CARA del cubo y el planeta son
   seis, asi que las celdas son 6n²: 1.944 el mundo 1 y 5.400 el 5, contra
   1.936 y 5.476 de los tableros planos de 44 y 74 que reemplazan — o sea el
   MISMO tamano de juego, doblado sobre una esfera.
   `pat` es el dibujo de las rocas: no es decoracion, es lo que hace que dos
   mundos del mismo tamano se jueguen distinto.                             */
const MUNDOS = [
  { k: 'm1', nom: 'LLANO',  n: 18, pat: 'vacio',   riv: 2, per: 0.52, seg: 115 },
  { k: 'm2', nom: 'PILARES',n: 21, pat: 'pilares', riv: 3, per: 0.64, seg: 115 },
  { k: 'm3', nom: 'CRUCE',  n: 24, pat: 'cruz',    riv: 3, per: 0.74, seg: 121 },
  { k: 'm4', nom: 'ISLAS',  n: 27, pat: 'islas',   riv: 4, per: 0.84, seg: 126 },
  { k: 'm5', nom: 'ANILLO', n: 30, pat: 'anillo',  riv: 4, per: 0.93, seg: 132 },
];

/* ── UN CUERPO MAS QUE EN EL PLANO, Y ES DE LA ESFERA ─────────────────────
   La tabla plana iba 1·2·2·3·3 y sobre la esfera el juego se rompia: el
   auto-jugador honesto pasaba 34 de 40. No es que la esfera de MENOS —el
   planeta se ocupa igual, medido 87,8 % contra 85,7 % del plano— es que un
   cierre cualquiera vale MUCHO MAS:

                              plano     esfera
     reclamo medio             2,03 %    2,52 %
     reclamo p50               1,19      1,30   ← igual
     reclamo p99               9,08     19,24   ← el doble
     el mayor reclamo         16,84     51,02   ← medio planeta de un saque
     reclamos > 20 % de N         0        17
     tajada del bot: sigma      9,4      14,6

   La mediana no se mueve y la cola se duplica, y eso es geometria y no
   equilibrio: en un tablero PLANO una vuelta pegada al borde no encierra
   nada, asi que hay vueltas baratas e inutiles. En una esfera NO HAY BORDE,
   asi que toda vuelta cerrada es un circulo maximo y parte el planeta al
   medio. Con dos cuerpos eso es una moneda al aire.

   El tercer cuerpo es lo que hace que una vuelta bisectriz CUESTE algo.
   Medido con el mayor multiplicador de meta con el que los 40 niveles se
   pasan —el mismo criterio con el que se derivo META_A/META_B—:

     plano (control)              0,590   ← y el banco reproduce su propia
     esfera, tabla plana          0,160     derivacion: el 5-2 tapa en 0,590
     esfera, planetas +35 %       0,206     y este archivo ya decia "con 0,58
     esfera, +35 % y un rival     0,286     ya pierde el 5-2"
     esfera, UN RIVAL MAS         0,601   ← mejor que el plano

   Y no es que suba el promedio: los tres niveles que se caian (1-1 con 0,160,
   3-8 con 0,285 y 3-5 con 0,312) DESAPARECEN de la lista de peores. Agrandar
   el planeta se probo y mide PEOR, asi que queda descartado.                */

/* ── EL OBJETIVO NO SE ESCRIBE: SE DERIVA DEL REPARTO ─────────────────────
   Estaba como una fraccion ABSOLUTA del tablero por mundo (0,40 a 0,55) y el
   juego era imposible, no dificil. Dos mediciones lo explican:

   · el tablero termina ocupado casi entero — 79,5 % de media sobre los 40
     niveles — y repartido entre TODOS los que juegan, asi que la parte pareja
     de uno es 0,795/nj: 39,8 % a dos, 26,5 % a tres y 19,9 % a cuatro;
   · y el `meta` viejo SUBIA justo donde entra el tercer rival, o sea que en el
     mundo 5 le pedia el 55 % a uno mientras los otros tres se repartian el 25.

   Y el modelo del reparto le gana al fisico, medido: prediciendo la tajada del
   bot con 0,795/nj el coeficiente de variacion es 0,278, y con el modelo de
   recorrido (VEL·seg/libres, o sea cuanto alcanza a encerrar uno solo) es
   0,312 — porque los rivales se comen lo que uno no agarra.

   El multiplicador es el ULTIMO valor con el que el auto-jugador honesto pasa
   los 40 de 40: 0,55 al entrar a un mundo y 0,72 al salir. Con 0,58 ya pierde
   el 5-2. O sea que este objetivo es el mas exigente que esta DEMOSTRADO que
   se puede cumplir, y no un numero elegido a ojo.                          */
const OCUPA = 0.795;
/* LA META VUELVE A LA DEL PLANO. Bajarla fue lo primero que probe y la
   medicion lo desmintio: barriendo META_A de 0,50 a 0,22 con la misma
   diferencia, los ganados dan 32/32/33/34/34/34/36/37 y NUNCA llegan a 40.
   Lo que faltaba no era meta, era reloj y vidas.                             */
const META_A = 0.55, META_B = 0.72;
const RIV_TOPE = 4;
const NIV_MUNDO = 8;
const NIVELES = MUNDOS.length * NIV_MUNDO;

/* La semilla sale del par (mundo, nivel) y de nada mas.                    */
const semNivel = (m, n) => (m + 1) * 100003 + (n + 1) * 7919 + 29;
/* LA SAL ES 29 Y NO 13, Y ES UN RECHAZO POR TANDA. Este juego no reintenta un
   nivel: la semilla sale del par (mundo, nivel), asi que cuando UNO sale malo
   lo unico que se puede mover es la sal de todos. Con 13 el 2-5 quedaba sin
   pasar, y no es estructural: con la misma cfg, 19 de 20 semillas se ganan.
   Barridas las sales, 29 y 97 dan las dos 40 de 40 con el del azar en 0.     */

/* Dentro de un mundo tambien hay curva: ocho niveles con el mismo tablero y
   los mismos rivales son el mismo nivel ocho veces.                        */
function cfgNivel(m, n) {
  const M = MUNDOS[m], u = NIV_MUNDO > 1 ? n / (NIV_MUNDO - 1) : 0;
  /* Los tres ultimos niveles de un mundo suman un rival, con tope: la rampa
     estaba escrita como `M.riv < 3`, que con la tabla nueva no se cumpliria
     NUNCA y la curva de adentro del mundo desapareceria sin que nada falle. */
  const riv = Math.min(RIV_TOPE, M.riv + (n >= 5 ? 1 : 0));
  return {
    mundo: m, nivel: n, pat: M.pat,
    n: Math.round(M.n + u * 4),
    riv,
    per: cl(M.per + u * 0.10, 0, 1),
    /* la parte pareja, por el multiplicador — nunca una fraccion escrita     */
    meta: OCUPA / (1 + riv) * (META_A + u * (META_B - META_A)),
    seg: M.seg,
    sem: semNivel(m, n),
  };
}

/* ══════════════════════ LA ARENA ══════════════════════
   ES EL OTRO JUEGO, Y CONTRADICE A PROPOSITO LO DE ARRIBA. La campana
   deriva un objetivo del reparto justamente para que se pueda TERMINAR; la
   arena no se termina: no hay meta, no hay reloj, hay una vida y se juega
   hasta que a uno lo cortan. Las dos cosas no se pueden promediar —una pide
   un tablero chico con un final y la otra uno grande sin final— asi que
   conviven como dos modos y no como una dificultad.

   CADA NUMERO SALE DE UNA CUENTA:
   · `n` 38 son 6·38² = 8.664 celdas —los 8.464 del tablero plano de 92, con
     el redondeo que impone que un planeta tenga seis caras iguales—: con
     `OCUPA` 0,795 repartido entre ocho, la parte pareja de cada uno es 9,9 %
     — un numero que se mueve lo suficiente como para que el marcador diga
     algo, y un planeta lo bastante grande como para que ocho cuerpos no se
     pisen en el primer minuto. Su circunferencia son 152 celdas: ocho
     pantallas de vuelta.
   · `riv` 7, o sea ocho cuerpos contando al jugador: es el reparto del juego
     que se esta imitando y lo que hace que la tabla de posiciones tenga algo
     que ordenar.
   · sin roca (`pat:'vacio'`): la roca de la campana es lo que hace que un
     planeta chico se juegue distinto, y en uno de ocho mil celdas lo unico
     que agregaria es una forma de morir que no es otro jugador.
   · y `per` es un ARREGLO y no un numero. Siete bots con la misma cabeza son
     un bot repetido siete veces: salen todos igual de lejos, vuelven a la vez
     y la tabla queda ordenada por suerte. Con siete precisiones se reparten
     en mansos y temerarios sin escribir siete cerebros.                     */
/* LA ARENA CRECE PORQUE EN LA ESFERA EL MUNDO ES MAS CHICO DE LO QUE PARECE.
   Con 38 la arena tiene 8.664 celdas —las mismas 8.464 del tablero plano— y
   sin embargo el bot honesto moria a los 11 segundos con el 0,29 % del
   planeta, contra 55,5 s y 7,04 % en el plano. Medidas las muertes: 393 de
   415 son CORTES, con 60,7 celdas de estela encima. La causa no es la
   cantidad de celdas sino el DIAMETRO: dos puntos del tablero plano llegaban
   a estar a 130 celdas, y en una esfera el antipoda esta a 2n = 76. Ocho
   cuerpos quedaban al doble de cerca. Barrido de n contra el bot y el del
   azar: 38 -> 0,29 % y 0,62 · 48 -> 1,68 y 0,46 · 58 -> 2,51 y 0,26 ·
   68 -> 2,18 y 0,18 · 78 -> 5,78 y 0,13. En 58 el honesto saca 9,7 veces lo
   del azar, que es CIFRA POR CIFRA la separacion del plano (7,04 contra
   0,70). Los ocho cuerpos no se tocan: son la identidad de la arena.        */
const ARENA_N = 58;
const ARENA_RIV = 7;
const ARENA_PER = [0.55, 0.68, 0.74, 0.80, 0.86, 0.90, 0.95];
/* CUANTA VENTAJA HAY QUE SACAR para que «vas primero» quiera decir algo. Un
   cuadrado de arranque son 0,3 % del tablero y la parte pareja de ocho es
   9,9 %: con 0,8 % ya se sacaron dos cuerpos y medio de diferencia, que es
   una ventaja que se ve en la tabla. Sin este numero el cartel sale en el
   primer cuadro, porque `tablaPos` desempata por id y el jugador es el 1.  */
const ARENA_VENT = 0.008;

function cfgArena(sem) {
  return {
    mundo: -1, nivel: -1, pat: 'vacio',
    n: ARENA_N, riv: ARENA_RIV, per: ARENA_PER,
    meta: 0, seg: 0, arena: true,
    /* LA SEMILLA ES AL AZAR EN EL JUEGO Y FIJA EN LA AUDITORIA, y esa
       diferencia es la que hace que las dos cosas sirvan: una partida
       reproducible no se siente una arena, y un banco que no se repite no
       mide nada.                                                           */
    sem: sem == null ? (Math.random() * 2147483647) | 0 : (sem | 0),
  };
}

/* ══════════════════════ IDIOMAS ══════════════════════ */
const LANGS = {
  es: {
    sub: 'salí, rodeá y volvé · lo que quede adentro es tuyo',
    jugar: 'JUGAR', tuto: 'CÓMO SE JUEGA', niveles: 'NIVELES', ajustes: 'AJUSTES',
    volver: 'VOLVER', seguir: 'SEGUIR', reiniciar: 'REINICIAR', salir: 'SALIR AL MENÚ',
    /* el panel de fin pone REINTENTAR al lado, en fila: con la etiqueta larga
       el boton se parte en dos renglones mientras su vecino va en uno.     */
    menuCorto: 'MENÚ', reintentar: 'REINTENTAR', siguiente: 'SIGUIENTE',
    pausa: 'PAUSA', pausaSub: 'el terreno te espera',
    nivelesSub: 'tocá uno para jugarlo',
    gana: '¡CERCADO!', ganaSub: 'el terreno es tuyo',
    ganaPerf: '¡SIN UN RASGUÑO!', ganaPerfSub: 'no perdiste una sola vida',
    pierdeT: 'SE ACABÓ EL TIEMPO', pierdeTSub: 'te faltó terreno',
    pierdeV: 'SIN VIDAS', pierdeVSub: 'te cortaron {0} veces',
    datos: '{0}% de {1}% · {2} cortes', datos1: '{0}% de {1}% · 1 corte',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONIDOS', graficos: 'GRÁFICOS',
    idioma: 'IDIOMA', calN: ['BAJO', 'MEDIO', 'ALTO'],
    borrar: 'BORRAR EL PROGRESO', borrado: 'BORRADO',
    mundo: 'MUNDO {0}', nivel: 'NIVEL {0}-{1}', tiempo: 'TIEMPO', metaR: 'META {0}%',
    mundos: ['LLANO', 'PILARES', 'CRUCE', 'ISLAS', 'ANILLO'],
    avTierra: '¡TIERRA!', avCorte: '¡TE CORTARON!', avCasi: '¡FALTA POCO!',
    avSinVidas: 'SIN VIDAS',
    pie: 'sin un solo asset · todo dibujado por código', cargando: 'CARGANDO',
    tutTit: 'TUTORIAL',
    tut1: 'arrastrá el dedo · el cuerpo dobla al toque',
    tut2: 'salí de tu terreno · vas dejando estela',
    tut3: 'volvé a pisar lo tuyo · lo que rodeaste es tuyo',
    tut4: 'cuanto más grande la vuelta, más terreno',
    tut5: 'y ojo: si te pisan la estela, te cortan',
    tutGana: '¡ESO ES TODO!', tutGanaSub: 'ya sabés jugar',
    tutDatos: 'salir, rodear y volver · nada más', salt: 'SALTEAR',
    /* ── LA ARENA ──
       «bajas» y no «cortes»: en este juego «corte» ya quiere decir la vez que
       te cortan a vos, y usar la misma palabra para las dos puntas del mismo
       hecho deja un marcador que nadie puede leer.                          */
    arena: 'ARENA', arenaSub: 'ocho cuerpos · una vida · sin final',
    campana: 'CAMPAÑA', campanaSub: '5 mundos · 40 niveles',
    bajas: 'BAJAS', puesto: 'PUESTO', tabla: 'POSICIONES', terreno: 'DEL TABLERO',
    arenaFin: 'TE CORTARON', arenaFinSub: '{0}º en la tabla de ocho',
    pos: '{0}º',
    arenaD: '{0}% · {1} bajas · {2}', arenaD1: '{0}% · 1 baja · {2}',
    arenaRec: 'RÉCORD {0}%', arenaNuevo: '¡RÉCORD!',
    arenaOtra: 'OTRA VEZ', avPrimero: '¡VAS PRIMERO!',
  },
  en: {
    sub: 'go out, loop around and come back · what you enclose is yours',
    jugar: 'PLAY', tuto: 'HOW TO PLAY', niveles: 'LEVELS', ajustes: 'SETTINGS',
    volver: 'BACK', seguir: 'RESUME', reiniciar: 'RESTART', salir: 'BACK TO MENU',
    menuCorto: 'MENU', reintentar: 'RETRY', siguiente: 'NEXT',
    pausa: 'PAUSED', pausaSub: 'the land will wait',
    nivelesSub: 'tap one to play it',
    gana: 'CLAIMED!', ganaSub: 'the land is yours',
    ganaPerf: 'NOT A SCRATCH!', ganaPerfSub: 'you never lost a life',
    pierdeT: "TIME'S UP", pierdeTSub: 'you were short on land',
    pierdeV: 'OUT OF LIVES', pierdeVSub: 'they cut you {0} times',
    datos: '{0}% of {1}% · {2} cuts', datos1: '{0}% of {1}% · 1 cut',
    ajTit: 'SETTINGS', musica: 'MUSIC', efectos: 'SOUNDS', graficos: 'GRAPHICS',
    idioma: 'LANGUAGE', calN: ['LOW', 'MID', 'HIGH'],
    borrar: 'ERASE PROGRESS', borrado: 'ERASED',
    mundo: 'WORLD {0}', nivel: 'LEVEL {0}-{1}', tiempo: 'TIME', metaR: 'GOAL {0}%',
    mundos: ['PLAIN', 'PILLARS', 'CROSS', 'ISLES', 'RING'],
    avTierra: 'LAND!', avCorte: 'CUT!', avCasi: 'ALMOST!',
    avSinVidas: 'OUT OF LIVES',
    pie: 'not one asset · all drawn in code', cargando: 'LOADING',
    tutTit: 'TUTORIAL',
    tut1: 'drag your finger · the body turns as you go',
    tut2: 'leave your land · you trail behind you',
    tut3: 'step back on your own · what you looped is yours',
    tut4: 'the wider the loop, the more land',
    tut5: 'careful: step on your trail and they cut you',
    tutGana: "THAT'S ALL!", tutGanaSub: 'you know how to play',
    tutDatos: 'out, around and back · nothing else', salt: 'SKIP',
    arena: 'ARENA', arenaSub: 'eight bodies · one life · no finish line',
    campana: 'CAMPAIGN', campanaSub: '5 worlds · 40 levels',
    bajas: 'KILLS', puesto: 'RANK', tabla: 'STANDINGS', terreno: 'OF THE BOARD',
    arenaFin: 'YOU GOT CUT', arenaFinSub: '#{0} out of eight',
    pos: '#{0}',
    arenaD: '{0}% · {1} kills · {2}', arenaD1: '{0}% · 1 kill · {2}',
    arenaRec: 'BEST {0}%', arenaNuevo: 'NEW BEST!',
    arenaOtra: 'AGAIN', avPrimero: "YOU'RE FIRST!",
  },
  pt: {
    sub: 'saia, cerque e volte · o que ficar dentro é seu',
    jugar: 'JOGAR', tuto: 'COMO SE JOGA', niveles: 'NÍVEIS', ajustes: 'AJUSTES',
    volver: 'VOLTAR', seguir: 'CONTINUAR', reiniciar: 'REINICIAR', salir: 'SAIR AO MENU',
    menuCorto: 'MENU', reintentar: 'TENTAR DE NOVO', siguiente: 'PRÓXIMO',
    pausa: 'PAUSA', pausaSub: 'o terreno espera',
    nivelesSub: 'toque em um para jogar',
    gana: 'CERCADO!', ganaSub: 'o terreno é seu',
    ganaPerf: 'SEM UM ARRANHÃO!', ganaPerfSub: 'não perdeu nenhuma vida',
    pierdeT: 'ACABOU O TEMPO', pierdeTSub: 'faltou terreno',
    pierdeV: 'SEM VIDAS', pierdeVSub: 'te cortaram {0} vezes',
    datos: '{0}% de {1}% · {2} cortes', datos1: '{0}% de {1}% · 1 corte',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONS', graficos: 'GRÁFICOS',
    idioma: 'IDIOMA', calN: ['BAIXO', 'MÉDIO', 'ALTO'],
    borrar: 'APAGAR O PROGRESSO', borrado: 'APAGADO',
    mundo: 'MUNDO {0}', nivel: 'NÍVEL {0}-{1}', tiempo: 'TEMPO', metaR: 'META {0}%',
    mundos: ['PLANO', 'PILARES', 'CRUZ', 'ILHAS', 'ANEL'],
    avTierra: 'TERRA!', avCorte: 'TE CORTARAM!', avCasi: 'FALTA POUCO!',
    avSinVidas: 'SEM VIDAS',
    pie: 'sem um único asset · tudo desenhado em código', cargando: 'CARREGANDO',
    tutTit: 'TUTORIAL',
    tut1: 'arraste o dedo · o corpo vira na hora',
    tut2: 'saia do seu terreno · vai deixando rastro',
    tut3: 'volte a pisar no seu · o que cercou é seu',
    tut4: 'quanto maior a volta, mais terreno',
    tut5: 'cuidado: se pisarem seu rastro, te cortam',
    tutGana: 'É SÓ ISSO!', tutGanaSub: 'você já sabe jogar',
    tutDatos: 'sair, cercar e voltar · nada mais', salt: 'PULAR',
    arena: 'ARENA', arenaSub: 'oito corpos · uma vida · sem fim',
    campana: 'CAMPANHA', campanaSub: '5 mundos · 40 níveis',
    bajas: 'ABATES', puesto: 'POSIÇÃO', tabla: 'CLASSIFICAÇÃO', terreno: 'DO TABULEIRO',
    arenaFin: 'TE CORTARAM', arenaFinSub: '{0}º entre oito',
    pos: '{0}º',
    arenaD: '{0}% · {1} abates · {2}', arenaD1: '{0}% · 1 abate · {2}',
    arenaRec: 'RECORDE {0}%', arenaNuevo: 'NOVO RECORDE!',
    arenaOtra: 'DE NOVO', avPrimero: 'VOCÊ ESTÁ EM 1º!',
  },
};
let LANG = 'en';
/* `TX` Y NO `t`: una funcion global de una letra la pisa cualquier cosa que
   comparta la pagina, y cuando se pisa no falla el idioma — falla TODO.   */
function TX(k, ...a) {
  let s = (LANGS[LANG] && LANGS[LANG][k]) != null ? LANGS[LANG][k] : (LANGS.es[k] || k);
  for (let i = 0; i < a.length; i++) s = String(s).split('{' + i + '}').join(a[i]);
  return s;
}
/* El mundo tiene NOMBRE y no numero: cinco pestanas que digan «MUNDO n» son
   numeros al lado de una reja de numeros, y encima no entran en 412 px.   */
const nomMundo = m => (LANGS[LANG].mundos || LANGS.es.mundos)[m] || TX('mundo', m + 1);

/* ══════════════════════ EL GUARDADO ══════════════════════
   En una ventana privada `localStorage` TIRA: todo va envuelto.            */
const PROG = { lang: null, hechos: {}, vol: 0.45, fx: 0.8, cal: 1, visto: 0, ult: 0,
  /* EL RECORD DE LA ARENA ES SU UNICO PROGRESO. No hay niveles que abrir ni
     nada que desbloquear: lo unico que queda de una corrida es hasta donde
     se llego, y sin guardarlo la arena no tiene con que compararse.        */
  rec: 0, recB: 0 };
function cargaProg() {
  try {
    const s = localStorage.getItem('cerco');
    if (!s) return false;
    const o = JSON.parse(s);
    if (o && typeof o === 'object') Object.assign(PROG, o);
    /* EL TUTORIAL SE VE CADA VEZ QUE SE ABRE EL JUEGO: la marca se pone en
       cero DESPUES de leer el disco, asi que sigue valiendo dentro de la
       sesion —hecho una vez, no vuelve a salir entre nivel y nivel— y es el
       unico dato del guardado que se descarta a proposito.                */
    PROG.visto = 0;
    if (PROG.lang) LANG = PROG.lang;
    return !!PROG.lang;
  } catch (e) { return false; }
}
function guardaProg() { try { PROG.lang = LANG; localStorage.setItem('cerco', JSON.stringify(PROG)); } catch (e) {} }
function borraProg() {
  PROG.hechos = {}; PROG.visto = 0; PROG.ult = 0; PROG.rec = 0; PROG.recB = 0;
  try { localStorage.removeItem('cerco'); } catch (e) {}
}
const idNiv = (m, n) => m * NIV_MUNDO + n;
const hecho = (m, n) => !!PROG.hechos[idNiv(m, n)];
const perfecto = (m, n) => PROG.hechos[idNiv(m, n)] === 2;
function anota(m, n, perf) {
  const k = idNiv(m, n), v = perf ? 2 : 1;
  if ((PROG.hechos[k] | 0) < v) PROG.hechos[k] = v;
  if (k + 1 > PROG.ult && k + 1 < NIVELES) PROG.ult = k + 1;
  guardaProg();
}
/* «el siguiente al ultimo hecho, mas uno de gracia»: con el siguiente y nada
   mas, un nivel que a alguien no le sale le cierra el juego entero.        */
function abierto(k) {
  if (k <= 0) return true;
  let alto = 0;
  for (const s in PROG.hechos) { const i = +s; if (i + 1 > alto) alto = i + 1; }
  return k <= alto + 1;
}
const cuentaHechos = () => Object.keys(PROG.hechos).length;
