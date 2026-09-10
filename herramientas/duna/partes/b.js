/* ══════════════════════════════════════════════════════════════════════════
   DUNA · sandboard de dos zonas, sin final
   ──────────────────────────────────────────────────────────────────────────
   LA PANTALLA SE PARTE AL MEDIO Y CADA MITAD ES UNA MANO. No hay botones
   dibujados que haya que acertar: la zona ES la pantalla, asi que el pulgar
   cae donde caiga y siempre esta encima de algo.
     IZQUIERDA · un toque en el suelo      → salta
                 sostener en el aire       → voltereta hacia atras
                 sostener sobre una cuerda → se cuelga y se desliza
     DERECHA   · tocar repetido            → empuja, hasta un TOPE
   De ahi cuelga el resto del diseno: no hay nada que apuntar, asi que la
   dificultad esta en el TIEMPO —cuando saltar, cuando soltar, cuando gastar
   velocidad— y no en la punteria, que es lo unico que un dedo sobre una
   pantalla no puede dar con precision.

   Y NO SE PIERDE: LA BAJADA NO TERMINA. Caerse cuesta lo unico que este
   juego tiene para cobrar —la velocidad— y no la partida. Una pantalla de
   derrota cada cuarenta segundos convierte un paseo por una duna en una
   sucesion de menus; sin ella, el error se paga en los cuatro o cinco
   segundos que cuesta volver a agarrar ritmo, que es un castigo que se
   siente y no interrumpe. La corrida la termina el jugador desde la pausa.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── EL RELOJ ─────────────────────────────────────────────────────────────
   Paso fijo con interpolacion: un telefono a 30 y una notebook a 144 tienen
   que jugar EL MISMO juego. Con paso variable la velocidad, el alcance del
   salto y la ventana del aterrizaje salen distintos, y eso no es una
   diferencia de rendimiento: es otro juego.                               */
const PASO = 1 / 60;
const DT_TOPE = 0.25;      // una pestana dormida no simula cuarenta pasos de golpe
const PASOS_TOPE = 8;      // si el aparato no llega, va en camara lenta y no se cuelga

/* ── EL MUNDO ─────────────────────────────────────────────────────────────
   Las unidades son METROS y la vista mide 46 de ancho. Un rider de 1,8 m
   ocupa entonces el 3,9% del ancho del cuadro, que es la escala de Alto: el
   personaje es chico y lo que se mira es el paisaje.                      */
const VISTA_ANCHO = 52;
/* DONDE VA EL RIDER EN EL CUADRO NO ES ESTETICA: ES CUANTO AVISO TIENE. A la
   izquierda del 30% del ancho ve 36 m por delante, y a 30 m/s eso son 1,2 s
   para decidir un salto. Y la camara SE ADELANTA CON LA VELOCIDAD, porque si
   no la dificultad crece sola: yendo mas rapido el mismo hueco llega antes.
   El bot torpe —el que mide cuanto dura una partida— saca su horizonte de
   estos dos numeros y no de una constante propia: con dos, mover la camara
   deja al validador midiendo un juego que ya no existe.                   */
const RIDER_X = 0.30;       // fraccion del ancho del cuadro
const CAM_ADEL = 0.34;      // segundos de adelanto: a 30 m/s son 10 m mas de aviso
const G = 30.0;             // gravedad
/* EL ROCE Y EL AIRE NO SE ELIGEN, SALEN DE LA VELOCIDAD QUE SE QUIERE. En
   una ladera de pendiente `CAIDA` el equilibrio es
     G·sinθ = μ·G·cosθ + AIRE·v²,
   asi que con μ=0,045 y AIRE=0,008 la velocidad de crucero en llano queda en
   20 m/s —unos 72 km/h, que es la sensacion del genero— y en una duna
   empinada sube sola. Escribiendo la velocidad a mano y el roce aparte, las
   dos se separan el dia que se toque la pendiente.                        */
const ROCE = 0.045;         // rozamiento de la tabla contra la arena (μ)
const AIRE = 0.008;         // roce del aire, va con el cuadrado
const V_MIN = 8.5;          // por debajo de esto el juego empuja: clavarse no es un final
const V_MAX = 38.0;
/* EL SALTO SALE DE CUANTO DURA UNA VOLTERETA, y no al reves. Con impulso
   `S` el vuelo llano dura `2S/G`; una vuelta a `GIRO_V` tarda `2π/GIRO_V`.
   Con S=12,6 el vuelo daba 0,84 s contra 0,85 de una vuelta: JUSTO no
   entraba, y medido el auto-jugador cerraba cero volteretas en 25 semillas.
   Con S=16,5 el vuelo llano da 1,10 s y una vuelta 0,73: entra una comoda
   desde cualquier lado y las dobles piden una rampa, que es el reparto que
   este genero tiene.                                                      */
const SALTO = 16.5;         // impulso vertical, FIJO — lo que varia es la rampa
const COYOTE = 0.11;        // se puede saltar un pestaneo despues de haberse ido del borde
const BUFFER = 0.15;        // un salto apretado un pestaneo antes de tocar vale igual
const GIRO_V = 8.6;         // rad/s de la voltereta: una vuelta en 0,73 s
const GIRO_TOL = 0.62;      // cuanto se puede errar el angulo al aterrizar
const RIDER_ALTO = 1.85;

/* ── EL EMPUJE, Y SU TOPE ─────────────────────────────────────────────────
   Cada toque de la mano derecha suma velocidad SOBRE LA TANGENTE, que es
   donde vive la rapidez cuando el cuerpo esta apoyado: empujar con el pie
   contra la arena. En el aire no hace nada, y eso no es una omision — un
   empujon en el aire alargaria el vuelo a voluntad y el aterrizaje, que es
   la unica regla del juego, dejaria de ser una apuesta.

   EL TOPE ES EL LIMITE PEDIDO Y ESTA POR DEBAJO DE `V_MAX`: masheando no se
   llega a la velocidad que un aterrizaje bien clavado paga, asi que empujar
   no reemplaza jugar bien, lo adelanta. Y EL ENFRIAMIENTO EXISTE PORQUE UN
   DEDO NO ES UN RELOJ: sin el, un toque por cuadro son sesenta empujones por
   segundo y el tope se alcanza en un cuadro. A 0,085 s el ritmo util son
   once toques por segundo, que es lo que una mano da.
   Y SE GASTA SOLO, sin ningun temporizador: el roce del aire va con el
   CUADRADO de la velocidad, asi que a 33 m/s frena 2,7 veces mas que a 20 y
   la velocidad vuelve sola a crucero en un par de segundos. */
/* UN TOQUE NO ES UNA VOLTERETA, Y SIN ESTO LO ERA. El giro arrancaba en el
   primer cuadro del apriete: medido, sostener CUATRO pasos —67 ms, mas corto
   que un toque humano, que dura entre 60 y 120— ya deja el cuerpo 33 grados
   torcido contra una tolerancia de 36 y te tumba. O sea que la PRIMERA
   instruccion del tutorial —«toca a la izquierda para saltar»— te hacia caer.
   Nunca se habia notado porque hasta esta vuelta el izquierdo era el UNICO
   boton y tocar y mantener eran el mismo gesto. Con la espera puesta, tocar
   es saltar y mantener es girar, que es lo que el juego dice que son.
   Y entra en el vuelo: 0,14 + 0,73 de vuelta son 0,87 contra 1,10 de aire. */
const GIRO_ESPERA = 0.14;
const TURBO_IMP = 1.70;     // lo que suma un toque, en m/s
const TURBO_TOPE = 33.0;    // el limite: por encima de crucero (20) y debajo de V_MAX (38)
const TURBO_CD = 0.085;     // un dedo no aprieta mas rapido que esto

/* ── LA CAIDA NO ES UNA MUERTE ────────────────────────────────────────────
   Un tumbo: el cuerpo se va al piso, pierde toda la velocidad y tarda en
   levantarse. Ese segundo largo mas los cuatro que cuesta volver a crucero
   es el castigo entero, y es mas caro de lo que parece en un juego donde la
   distancia sale de la velocidad. */
const TUMBO_T = 1.15;       // cuanto tarda en levantarse
const TUMBO_V = 4.5;        // con cuanta velocidad queda

/* ── LA PENDIENTE MEDIA ───────────────────────────────────────────────────
   El mundo BAJA con x: es una ladera infinita, como en Alto. Ese numero es
   el que hace que no haga falta un boton de acelerar — la gravedad empuja
   sola y el jugador solo administra saltos.                               */
const CAIDA = 0.175;

/* ── EL AZAR TIENE SEMILLA ────────────────────────────────────────────────
   Con `Math.random` la duna de los cuatrocientos metros seria otra en cada
   partida y no habria forma de auditar el terreno ni de que el auto-jugador
   pruebe lo mismo dos veces.                                              */
function azarDe(s) {
  let a = (s | 0) || 1;
  return function () {
    a ^= a << 13; a |= 0; a ^= a >>> 17; a ^= a << 5; a |= 0;
    return ((a >>> 0) % 100000) / 100000;
  };
}
/* el reloj de pared del juego, en segundos. Lo escribe el bucle y lo leen
   las cosas que respiran —la bufanda, el guino de una moneda, el astro—: sin
   un reloj comun cada una llevaria el suyo y se desincronizarian solas. */
/* LA CALIDAD CAMBIA LO QUE CUESTA, NO LO QUE EL JUEGO ES. Las dunas, los
   huecos y las cuerdas son las mismas en las tres: lo que se mueve es cuantos
   pixeles hay que rellenar —que es lo unico que SIEMPRE se paga, porque este
   juego dibuja formas planas y no tiene una sola textura— mas cuantas
   estrellas, nubes y granos de arena hay. */
let CAL = 1;
const CAL_PX = [0.60, 0.84, 1.00];

let TIEMPO = 0;
/* y la hora del dia, de 0 a 1, que sale de la DISTANCIA. Va aca arriba y no
   donde se calcula porque la lee el audio, que se evalua antes: un `let`
   leido antes de su linea TIRA, y ni `typeof` lo salva. */
let HORA = 0;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mezcla = (a, b, t) => a + (b - a) * t;
const suave = t => t * t * (3 - 2 * t);
const suave2 = t => t * t * t * (t * (t * 6 - 15) + 10);

/* ── LOS IDIOMAS ──────────────────────────────────────────────────────────
   Nada de texto suelto en el codigo. Y las tablas de datos guardan la CLAVE
   y no el texto ya resuelto: una tabla que se arma una vez al arrancar con
   el texto adentro no cambia nunca de idioma. Ya costo 107 claves en Z
   Force y una vuelta entera en RECREO.                                    */
let IDIOMA = 'es';
const LANG = {
  es: {
    idi: 'elegí tu idioma', sub: 'metros',
    msub: 'bajá la duna · dos manos · sin final',
    jugar: 'JUGAR', obj: 'OBJETIVOS', cal: 'GRÁFICOS', idio: 'IDIOMA',
    pie: 'Izquierda: tocá para saltar y mantené en el aire para girar. ' +
         'Derecha: tocá rápido para empujar, hasta el tope. ' +
         'Aterrizar derecho te da velocidad; de cabeza te caés, y caerse ' +
         'cuesta la velocidad y no la bajada — esto no se termina nunca.',
    rec: 'RÉCORD · {0} m', mon: '{0} monedas',
    pausa: 'PAUSA', seguir: 'SEGUIR', menu: 'MENÚ', term: 'TERMINAR',
    papie: 'el paisaje sigue ahí cuando vuelvas',
    fin: 'HASTA ACÁ', finS: '{0} metros',
    fdatos: '{0} m · {1} monedas · {2} trucos · {3} caídas', otra: 'OTRA VEZ',
    pista: 'IZQUIERDA SALTA · DERECHA EMPUJA',
    tumbo: 'TE CAÍSTE', tvel: 'VELOCIDAD', ttope: 'TOPE',
    tuto: 'CÓMO SE JUEGA', tsalta: 'SALTAR', tempuja: 'EMPUJAR',
    tu1: 'TOCÁ A LA IZQUIERDA PARA SALTAR',
    tu2: 'MANTENÉ LA IZQUIERDA EN EL AIRE Y DÁ UNA VOLTERETA',
    tu3: 'TOCÁ RÁPIDO A LA DERECHA PARA EMPUJAR',
    tu4: 'ASÍ SE JUEGA · LA BAJADA NO TERMINA',
    tsalt: 'saltear',
    nuevo: 'RÉCORD NUEVO',
    baja: 'BAJA', media: 'MEDIA', alta: 'ALTA',
    t1: 'VOLTERETA', t2: 'DOBLE VOLTERETA', t3: 'TRIPLE VOLTERETA',
    t4: 'CUÁDRUPLE', grind: 'COLGADO', combo: 'COMBO ×{0}',
    salto: 'SALTO LARGO', casi: 'POR POCO',
    ok: 'HECHO',
    o_dist: 'bajá {0} metros de una',
    o_flip: 'dá {0} volteretas en una corrida',
    o_mon: 'juntá {0} monedas de una',
    o_grind: 'colgate de {0} cuerdas',
    o_comb: 'encadená un combo de {0}',
    o_salto: 'hacé un salto de {0} metros',
  },
  en: {
    idi: 'pick your language', sub: 'metres',
    msub: 'ride the dune · two hands · no finish line',
    jugar: 'PLAY', obj: 'GOALS', cal: 'GRAPHICS', idio: 'LANGUAGE',
    pie: 'Left: tap to jump, hold in the air to backflip. ' +
         'Right: tap fast to push, up to the cap. ' +
         'Land level and you gain speed; land on your head and you wipe out — ' +
         'and a wipeout costs you speed, not the run. This never ends.',
    rec: 'BEST · {0} m', mon: '{0} coins',
    pausa: 'PAUSED', seguir: 'RESUME', menu: 'MENU', term: 'END RUN',
    papie: 'the dune will still be there',
    fin: 'THAT FAR', finS: '{0} metres',
    fdatos: '{0} m · {1} coins · {2} tricks · {3} wipeouts', otra: 'AGAIN',
    pista: 'LEFT JUMPS · RIGHT PUSHES',
    tumbo: 'WIPEOUT', tvel: 'SPEED', ttope: 'CAP',
    tuto: 'HOW TO PLAY', tsalta: 'JUMP', tempuja: 'PUSH',
    tu1: 'TAP THE LEFT SIDE TO JUMP',
    tu2: 'HOLD THE LEFT SIDE IN THE AIR AND LAND A BACKFLIP',
    tu3: 'TAP THE RIGHT SIDE FAST TO PUSH',
    tu4: 'THAT IS THE GAME · THE RUN NEVER ENDS',
    tsalt: 'skip',
    nuevo: 'NEW BEST',
    baja: 'LOW', media: 'MEDIUM', alta: 'HIGH',
    t1: 'BACKFLIP', t2: 'DOUBLE BACKFLIP', t3: 'TRIPLE BACKFLIP',
    t4: 'QUAD BACKFLIP', grind: 'GRIND', combo: 'COMBO x{0}',
    salto: 'BIG AIR', casi: 'CLOSE ONE',
    ok: 'DONE',
    o_dist: 'ride {0} metres in one run',
    o_flip: 'land {0} backflips in one run',
    o_mon: 'collect {0} coins in one run',
    o_grind: 'grind {0} ropes',
    o_comb: 'chain a x{0} combo',
    o_salto: 'clear a {0} metre jump',
  },
  pt: {
    idi: 'escolha seu idioma', sub: 'metros',
    msub: 'desça a duna · duas mãos · sem fim',
    jugar: 'JOGAR', obj: 'OBJETIVOS', cal: 'GRÁFICOS', idio: 'IDIOMA',
    pie: 'Esquerda: toque para pular e segure no ar para girar. ' +
         'Direita: toque rápido para empurrar, até o limite. ' +
         'Pousar reto dá velocidade; de cabeça você cai, e cair custa a ' +
         'velocidade e não a descida — isto não acaba nunca.',
    rec: 'RECORDE · {0} m', mon: '{0} moedas',
    pausa: 'PAUSA', seguir: 'CONTINUAR', menu: 'MENU', term: 'ENCERRAR',
    papie: 'a duna continua aí quando voltar',
    fin: 'ATÉ AQUI', finS: '{0} metros',
    fdatos: '{0} m · {1} moedas · {2} manobras · {3} quedas', otra: 'DE NOVO',
    pista: 'ESQUERDA PULA · DIREITA EMPURRA',
    tumbo: 'VOCÊ CAIU', tvel: 'VELOCIDADE', ttope: 'LIMITE',
    tuto: 'COMO SE JOGA', tsalta: 'PULAR', tempuja: 'EMPURRAR',
    tu1: 'TOQUE À ESQUERDA PARA PULAR',
    tu2: 'SEGURE A ESQUERDA NO AR E DÊ UM MORTAL',
    tu3: 'TOQUE RÁPIDO À DIREITA PARA EMPURRAR',
    tu4: 'É ISSO · A DESCIDA NÃO ACABA',
    tsalt: 'pular',
    nuevo: 'NOVO RECORDE',
    baja: 'BAIXA', media: 'MÉDIA', alta: 'ALTA',
    t1: 'MORTAL', t2: 'MORTAL DUPLO', t3: 'MORTAL TRIPLO',
    t4: 'MORTAL QUÁDRUPLO', grind: 'DESLIZE', combo: 'COMBO x{0}',
    salto: 'SALTO ENORME', casi: 'POR POUCO',
    ok: 'FEITO',
    o_dist: 'desça {0} metros de uma vez',
    o_flip: 'dê {0} mortais numa descida',
    o_mon: 'junte {0} moedas de uma vez',
    o_grind: 'deslize em {0} cordas',
    o_comb: 'encadeie um combo de {0}',
    o_salto: 'faça um salto de {0} metros',
  },
};
/* el respaldo devuelve el castellano y no la clave: una pantalla con `o_flip`
   escrito es peor que una con una linea en otro idioma */
function T(k, ...a) {
  let s = (LANG[IDIOMA] && LANG[IDIOMA][k]) || LANG.es[k] || k;
  a.forEach((v, i) => { s = s.split('{' + i + '}').join(v); });
  return s;
}

/* ── LOS OBJETIVOS ────────────────────────────────────────────────────────
   Tres a la vez, y suben de a poco al completarse: son lo que convierte
   "corri otra vez" en "me falta uno". Cada uno declara su clave de texto, su
   escalera de metas y de que contador sale.                               */
const OBJS = [
  { id: 'dist',  k: 'o_dist',  m: [400, 900, 1600, 2600, 4000, 6000], c: 'dist' },
  { id: 'flip',  k: 'o_flip',  m: [1, 3, 6, 12, 22, 40],              c: 'flips' },
  { id: 'mon',   k: 'o_mon',   m: [10, 30, 70, 140, 260, 460],        c: 'mons' },
  { id: 'grind', k: 'o_grind', m: [1, 4, 10, 22, 45, 80],             c: 'grinds', acum: true },
  { id: 'comb',  k: 'o_comb',  m: [2, 3, 5, 7, 9, 12],                c: 'comboMax' },
  { id: 'salto', k: 'o_salto', m: [14, 22, 30, 40, 52, 66],           c: 'saltoMax' },
];
