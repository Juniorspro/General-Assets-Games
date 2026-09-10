/* ══════════════════════════════════════════════════════════════════════════
   DUNA · sandboard de un boton
   ──────────────────────────────────────────────────────────────────────────
   LO QUE DEFINE AL GENERO NO ES LA TABLA, ES QUE HAYA UN SOLO BOTON. Todo lo
   que el jugador puede hacer sale de tocar y de cuanto sostiene el dedo:
     · un toque en el suelo   → salta
     · sostener en el aire    → voltereta hacia atras
     · sostener sobre una cuerda → se cuelga y se desliza
   De ahi cuelga el resto del diseno: no hay nada que apuntar, asi que la
   dificultad tiene que estar en el TIEMPO —cuando saltar, cuando soltar— y
   no en la punteria, que es lo unico que un dedo sobre una pantalla no puede
   dar con precision.
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
    msub: 'bajá la duna · un dedo · sin final',
    jugar: 'JUGAR', obj: 'OBJETIVOS', cal: 'GRÁFICOS', idio: 'IDIOMA',
    pie: 'Tocá para saltar y mantené en el aire para dar una voltereta. ' +
         'Aterrizar derecho te da velocidad; de cabeza, te caés. ' +
         'Sobre una cuerda, mantené para colgarte.',
    rec: 'RÉCORD · {0} m', mon: '{0} monedas',
    pausa: 'PAUSA', seguir: 'SEGUIR', menu: 'MENÚ',
    papie: 'el paisaje sigue ahí cuando vuelvas',
    fin: 'TE CAÍSTE', finS: '{0} metros',
    fdatos: '{0} m · {1} monedas · {2} trucos', otra: 'OTRA VEZ',
    pista: 'TOCÁ PARA SALTAR · MANTENÉ PARA GIRAR',
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
    msub: 'ride the dune · one finger · no finish line',
    jugar: 'PLAY', obj: 'GOALS', cal: 'GRAPHICS', idio: 'LANGUAGE',
    pie: 'Tap to jump and hold in the air to backflip. ' +
         'Land level and you gain speed; land on your head and you wipe out. ' +
         'Over a rope, hold to grind.',
    rec: 'BEST · {0} m', mon: '{0} coins',
    pausa: 'PAUSED', seguir: 'RESUME', menu: 'MENU',
    papie: 'the dune will still be there',
    fin: 'YOU WIPED OUT', finS: '{0} metres',
    fdatos: '{0} m · {1} coins · {2} tricks', otra: 'AGAIN',
    pista: 'TAP TO JUMP · HOLD TO FLIP',
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
    msub: 'desça a duna · um dedo · sem fim',
    jugar: 'JOGAR', obj: 'OBJETIVOS', cal: 'GRÁFICOS', idio: 'IDIOMA',
    pie: 'Toque para pular e segure no ar para dar um mortal. ' +
         'Pousar reto dá velocidade; de cabeça, você cai. ' +
         'Sobre uma corda, segure para deslizar.',
    rec: 'RECORDE · {0} m', mon: '{0} moedas',
    pausa: 'PAUSA', seguir: 'CONTINUAR', menu: 'MENU',
    papie: 'a duna continua aí quando voltar',
    fin: 'VOCÊ CAIU', finS: '{0} metros',
    fdatos: '{0} m · {1} moedas · {2} manobras', otra: 'DE NOVO',
    pista: 'TOQUE PARA PULAR · SEGURE PARA GIRAR',
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
