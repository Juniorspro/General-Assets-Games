
/* ══════════════════════ LAS MEDIDAS, Y DE DONDE SALEN ══════════════════════
   Todo se mide en BLOQUES y en TIEMPOS de compas, no en pixeles ni en segundos,
   y esa es la decision de la que cuelga el juego entero.

   ── UN TIEMPO SON CUATRO BLOQUES ──
   De ahi sale la velocidad: `V = 4 · BPM / 60`. Asi un obstaculo puesto en la
   corchea cae SIEMPRE en un multiplo de dos bloques, y «que vaya al ritmo» deja
   de ser algo que hay que sincronizar a mano: es una propiedad de la grilla.

   ── Y EL SALTO DURA EXACTAMENTE UN TIEMPO ──
   Que es lo que lo vuelve una unidad musical. Fijado el aire en `T = 60/BPM` y
   el alto en 2,4 bloques, la gravedad y el impulso SALEN de una cuenta:
       g = 8·alto/T²      v = 4·alto/T
   Con eso el salto mide cuatro bloques de largo en los tres niveles, aunque los
   tres vayan a otro tempo. Escribiendo la gravedad a mano, el salto mediria
   distinto en cada nivel y los patrones dejarian de servir. */
const BLOQ_POR_TIEMPO = 4;
const SALTO_ALTO = 2.4;          /* bloques de apice */
const JUG_LADO = 0.86;           /* el cubo es un poco mas chico que su celda */
/* ── EL PASILLO DE LA NAVE MIDE LO QUE ENTRA EN PANTALLA ──
   `py()` deja ver `ALTO/U − 0,9` bloques, o sea 8,33 en un marco de telefono. Con
   el techo en 9,2 —y hasta con 8,2— caia POR ENCIMA del borde de arriba: medido
   en la foto, la nave volaba en un pasillo sin tapa visible, y un limite que no
   se ve no es un limite, es una muerte sorpresa. Con 7,6 entra entero y quedan
   ocho decimas de aire arriba y abajo. */
const ALTO_PASILLO = 7.6;
/* y el techo del tramo de gravedad invertida, por la misma razon */
const ALTO_GRAV = 7.0;
/* ── Y CADA MODO PIDE SU PROPIA ALTURA DE PASILLO ──
   No es decoracion: la altura es lo que hace que el modo se pueda jugar. La bola
   cruza de piso a techo en `sqrt(2·H/g)` segundos, o sea 3,2 bloques con H = 6:
   con el pasillo mas alto el cruce tarda mas que el hueco entre picos y no hay
   toque que salve. La onda va a 45 grados exactos, asi que su pasillo tiene que
   medir menos que la distancia entre paredes o no llega a subir. Y la arana se
   teletransporta, asi que la suya solo tiene que dejar pasar al cuerpo. */
const ALTO_BOLA = 6.0;
const ALTO_ONDA = 5.6;
const ALTO_ARANA = 5.0;
const ALTO_COL = 7.2;
const ALTO_OVNI = 8.2;

function medidasDe(bpm){
  const T = 60/bpm;                         /* un tiempo, en segundos */
  return {
    bpm, T,
    v: BLOQ_POR_TIEMPO*bpm/60,              /* bloques por segundo */
    g: 8*SALTO_ALTO/(T*T),
    imp: 4*SALTO_ALTO/T,
    /* el pad amarillo lanza el doble de alto, o sea raiz de dos veces el impulso */
    impPad: 4*SALTO_ALTO/T*Math.SQRT2,
    /* la nave: subir y bajar son aceleraciones, no velocidades, porque lo que se
       controla es la CURVA. Con velocidad directa la nave se lee a ascensor. */
    naveA: 8*SALTO_ALTO/(T*T)*0.62,
    naveMax: 4*SALTO_ALTO/T*0.70,
    /* ── Y LOS OTROS SEIS MODOS SALEN DE LA MISMA CUENTA ──
       Todo lo que sube se escribe como una FRACCION del impulso del cubo, y de
       ahi sale el apice: `apice = k²·2,4`. Asi los ocho modos comparten una sola
       gravedad y un solo tiempo de aire, que es lo que hace que el nivel se pueda
       cortar en tramos sin que la grilla del compas deje de valer.
         · ovni  k 0,913 → apice 2,00 bloques (el salto corto de Geometry Dash)
         · robot k 0,80 a 1,21 → de 1,54 a 3,51 segun cuanto se mantenga
       La onda no lleva impulso: su velocidad vertical ES la horizontal. */
    impOvni: 4*SALTO_ALTO/T*0.913,
    robotMin: 4*SALTO_ALTO/T*0.80,
    robotMax: 4*SALTO_ALTO/T*1.21,
    robotT: 0.26,
    /* el columpio: gravedad que se da vuelta, con tope para que un pasillo largo
       no lo ponga a caer mas rapido de lo que el pasillo mide */
    colA: 8*SALTO_ALTO/(T*T)*0.78,
    colMax: 4*SALTO_ALTO/T*0.66
  };
}

/* ══════════ LOS OCHO MODOS DE GEOMETRY DASH ══════════
   Los ocho oficiales, y cada uno con OTRO verbo: el cubo salta desde el piso, la
   nave se sostiene, la bola da vuelta la gravedad, el ovni salta en el aire, la
   onda va en diagonal, el robot carga el salto, la arana se teletransporta y el
   columpio invierte su gravedad. Un modo que se juega igual que otro no es un
   modo, es el mismo con otro dibujo. */
const MODOS = { cubo:1, nave:1, bola:1, ovni:1, onda:1, robot:1, arana:1, columpio:1 };
/* ── LOS TRES MODOS DE PASILLO Y LOS CINCO DE PISO ──
   Es la division que importa para el auto-jugador: los de pasillo se pilotean
   —hay que sostener una altura— y los de piso se resuelven por rollout —hay que
   decidir un instante—. Con una sola politica para los ocho, el bot pilotearia
   el cubo y saltaria con la onda. */
const PILOTO = { nave: 1, onda: 1, columpio: 1 };
/* la altura del pasillo de cada modo. Los que no tienen techo declaran la banda
   visible, que es lo que el piloto usa como techo cuando no hay ninguno. */
const ALTO_MODO = { nave: ALTO_PASILLO, onda: ALTO_ONDA, columpio: ALTO_COL,
                    bola: ALTO_BOLA, arana: ALTO_ARANA, ovni: ALTO_OVNI,
                    cubo: 9.2, robot: 9.2 };
const MODO_NOM = {
  cubo: 'CUBO', nave: 'NAVE', bola: 'BOLA', ovni: 'OVNI',
  onda: 'ONDA', robot: 'ROBOT', arana: 'ARAÑA', columpio: 'COLUMPIO'
};
const MODO_COL = {
  cubo: '#ffd166', nave: '#ff6ad5', bola: '#7ad9ff', ovni: '#c9a7ff',
  onda: '#6ef2c8', robot: '#ffa14a', arana: '#ff7ae0', columpio: '#a0ff6a',
  grav: '#ffd447', norm: '#5ad9ff',
  /* los portales de velocidad de GD: naranja el lento, celeste el normal, verde
     el rapido. El color ES la informacion —se lee antes de cruzarlo— asi que va
     en la misma tabla que los de modo. */
  vel075: '#ffa14a', vel1: '#5ad9ff', vel15: '#6ef2c8'
};
const VEL_COL = { 0.75: '#ffa14a', 1: '#5ad9ff', 1.5: '#6ef2c8' };
/* ── LOS ORBES Y LOS PADS ──
   `K` es el impulso en fracciones del salto del cubo, asi que el apice sale de
   `k²·2,4`: rosa 1,24 · amarillo 2,40 · rojo 4,18 bloques. Los otros cuatro no
   son un impulso —dan vuelta la gravedad, clavan hacia abajo o pegan a la cara de
   enfrente— y por eso no estan en esta tabla. */
const ORBE_K = { rosa: 0.72, amar: 1.00, rojo: 1.32, verde: 1.00 };
const ORBE_COL = { rosa: '#ff8ec2', amar: '#ffd447', rojo: '#ff5a4a',
                   azul: '#5ad9ff', verde: '#6ef2c8', negro: '#2a2a3a',
                   arana: '#ff7ae0' };
const PAD_K = { rosa: 0.68, amar: 1.00, rojo: 1.18 };
const PAD_COL = { rosa: '#ff8ec2', amar: '#ffd447', rojo: '#ff5a4a', azul: '#5ad9ff' };

/* ══════════ EL ENCUADRE ══════════
   Se ven 20 bloques de ancho, y el numero sale de dos cuentas y no del gusto:
   · el jugador va al 30 %, o sea que quedan 14 bloques de aviso, y el salto mide
     4 — hay tiempo de leer lo que viene;
   · y en un marco de 2,17 a 1 eso deja **9,2 bloques de alto**, que es
     exactamente lo que mide el pasillo de la nave: el tramo de nave llena la
     pantalla sin que haya que mover la camara.
   Con 26 el cubo medía el 7 % del alto y se leía a punto. */
const VISTA_ANCHO = 20;

/* ══════════ LOS TRES NIVELES ══════════
   Cada uno con su tempo, su dificultad y su mezcla de modos. Los nombres son
   propios: esto es un juego del genero, no una copia de otro. */
/* ── Y CADA UNO DECLARA SU FONDO ──
   Tres niveles con el mismo fondo y otro tinte son tres veces el mismo nivel: lo
   que hace que se sientan distintos no es el color sino la SILUETA del horizonte.
   `fondo` elige la forma de las tres capas de paralaje —torres de ciudad, rocas
   flotando, una cresta de picos— y `motas` cuantas particulas lejanas hay. */
/* ══════════ LOS DOS NIVELES ══════════
   El tempo NO se elige: sale de la cancion que trajo el usuario para cada uno
   (`MUS_BPM`, medido en 158,0; `MUS2_BPM`, medido en 130,0). De ahi sale la velocidad —4·158/60 = 10,53
   bloques por segundo, que es exactamente la velocidad 1x de Geometry Dash— y de
   ahi el largo, porque la cancion dura 79,18 tiempos.

   Los diez tramos de color van pegados a los tramos de MODO y no a un modulo: en
   este genero el color cambia en el portal, y eso es lo que hace que el cambio de
   reglas se vea antes de que se sienta. */
const NIVELES = [
  { id: 0, nom: 'OCHO FORMAS', bpm: MUS_BPM, dif: 3, compases: 19, mus: 'MUS',
    modos: ['cubo', 'nave', 'bola', 'ovni', 'onda', 'robot', 'arana', 'columpio'],
    col: [0x3a, 0x1c, 0x2e], col2: [0xff, 0xb3, 0x5c], fondo: 'foto', motas: 120,
    /* ── LOS TRAMOS VIVEN EN LA TABLA DEL NIVEL, NO EN UNA CONSTANTE APARTE ──
       Estaban en `TRAMOS`, en d.js, con la x escrita a mano. Con dos niveles eso
       son dos constantes que hay que mantener alineadas con dos tablas de
       paletas: la paleta `i` del nivel y el tramo `i` de la constante tienen que
       ser la misma cosa, y con dos listas se separan. Este nivel se declara en
       BLOQUES (`w`), porque asi fue medido; el segundo se declara en tiempos. */
    tramos: [
      { w: 24, vel: 1, modo: 'cubo',     arma: 'entrada',  estilo: 'sol' },
      { w: 24, vel: 1, modo: 'cubo',     arma: 'cubo',     estilo: 'sol' },
      { w: 32, vel: 1, modo: 'nave',     arma: 'nave',     estilo: 'sol' },
      { w: 32, vel: 1, modo: 'bola',     arma: 'bola',     estilo: 'sol' },
      { w: 32, vel: 1, modo: 'ovni',     arma: 'ovni',     estilo: 'sol' },
      { w: 32, vel: 1, modo: 'onda',     arma: 'onda',     estilo: 'sol' },
      { w: 32, vel: 1, modo: 'robot',    arma: 'robot',    estilo: 'sol' },
      { w: 32, vel: 1, modo: 'arana',    arma: 'arana',    estilo: 'sol' },
      { w: 32, vel: 1, modo: 'columpio', arma: 'columpio', estilo: 'sol' },
      { w: 30, vel: 1, modo: 'cubo',     arma: 'orbes',    estilo: 'sol' }
    ],
    pals: [[[0x3a,0x1c,0x2e], [0xff,0xb3,0x5c]], [[0x40,0x20,0x2a], [0xff,0x8f,0x6b]],
           [[0x3b,0x1a,0x3a], [0xff,0x6a,0xd5]], [[0x24,0x24,0x3f], [0x7a,0xd9,0xff]],
           [[0x2c,0x1f,0x45], [0xc9,0xa7,0xff]], [[0x12,0x3a,0x3a], [0x6e,0xf2,0xc8]],
           [[0x42,0x23,0x18], [0xff,0xa1,0x4a]], [[0x3a,0x15,0x30], [0xff,0x7a,0xe0]],
           [[0x24,0x36,0x1a], [0xa0,0xff,0x6a]], [[0x45,0x1e,0x26], [0xff,0xd1,0x66]]] },

  /* ══════════ EL SEGUNDO NIVEL: CUATRO MINUTOS, LA CANCION ENTERA ══════════
     ── LOS TRAMOS SE DECLARAN EN TIEMPOS Y NO EN BLOQUES ──
     Porque este nivel cambia de VELOCIDAD: a 1,5x un compas mide 24 bloques y a
     0,75x mide 12. Escribiendo la x en bloques, mover un tramo obligaria a
     recalcular todo lo que viene despues; en tiempos, la suma de `b` ES la
     cancion (540 de sus 543,86 tiempos: lo que sobra es la meta y el acorde
     final). El largo en bloques sale de `b · 4 · vel`.

     ── Y CADA TRAMO TRAE SU ESTILO ──
     Es lo que el pedido llama «experimentar los estilos de GD»: el mismo nivel
     pasa por el atardecer de foto, por el neon sobre negro y por el blanco
     minimalista. Tres estilos y no uno por tramo, porque lo que se lee es el
     CAMBIO: con un estilo distinto cada treinta segundos ninguno se llega a
     asentar y todos se leen a ruido. `frente` enciende la capa de adelante, que
     es la que pone cosas por DELANTE del jugador y no solo detras. */
  { id: 1, nom: 'CUATRO MINUTOS', bpm: MUS2_BPM, dif: 4, compases: 136, mus: 'MUS2',
    modos: ['cubo', 'nave', 'bola', 'ovni', 'onda', 'robot', 'arana', 'columpio'],
    col: [0x14, 0x1a, 0x30], col2: [0x6e, 0xf2, 0xc8], fondo: 'foto', motas: 160,
    tramos: [
      { b: 16, vel: 1,    modo: 'cubo',     arma: 'intro',      estilo: 'sol' },
      { b: 32, vel: 1,    modo: 'cubo',     arma: 'cubo2',      estilo: 'sol' },
      { b: 32, vel: 1,    modo: 'nave',     arma: 'nave2',      estilo: 'sol' },
      { b: 32, vel: 1,    modo: 'bola',     arma: 'bola2',      estilo: 'blanco' },
      { b: 32, vel: 1.5,  modo: 'cubo',     arma: 'cuboRapido', estilo: 'neon', frente: 1 },
      { b: 32, vel: 1.5,  modo: 'onda',     arma: 'onda2',      estilo: 'neon', frente: 1 },
      { b: 32, vel: 1,    modo: 'ovni',     arma: 'ovni2',      estilo: 'blanco' },
      { b: 32, vel: 1,    modo: 'robot',    arma: 'robot2',     estilo: 'blanco' },
      { b: 32, vel: 1,    modo: 'arana',    arma: 'arana2',     estilo: 'neon' },
      { b: 32, vel: 1,    modo: 'columpio', arma: 'columpio2',  estilo: 'sol' },
      { b: 32, vel: 0.75, modo: 'cubo',     arma: 'lento',      estilo: 'sol' },
      { b: 32, vel: 1.5,  modo: 'nave',     arma: 'naveRapida', estilo: 'neon', frente: 1 },
      { b: 32, vel: 1.5,  modo: 'cubo',     arma: 'escaleras',  estilo: 'neon', frente: 1 },
      { b: 32, vel: 1,    modo: 'onda',     arma: 'onda2',      estilo: 'blanco' },
      { b: 32, vel: 1.5,  modo: 'bola',     arma: 'bola2',      estilo: 'neon', frente: 1 },
      { b: 32, vel: 1,    modo: 'robot',    arma: 'robot2',     estilo: 'sol' },
      { b: 32, vel: 1,    modo: 'cubo',     arma: 'final2',     estilo: 'sol' },
      { b: 12, vel: 1,    modo: 'cubo',     arma: 'salida',     estilo: 'sol' }
    ],
    /* dieciocho parejas, una por tramo, y cada una en la familia de su estilo:
       calidas para el sol, saturadas sobre casi negro para el neon, y grises
       claros con un acento para el blanco. Un tramo verde y el siguiente rojo se
       leen a dos juegos; lo que hay que leer es que el mismo tema doblo. */
    pals: [[[0x14,0x1a,0x30], [0x6e,0xf2,0xc8]], [[0x1c,0x1c,0x3a], [0x7a,0xd9,0xff]],
           [[0x2a,0x1c,0x3c], [0xff,0x6a,0xd5]], [[0xd8,0xdc,0xe6], [0x2b,0x3a,0x5c]],
           [[0x08,0x08,0x12], [0x2d,0xe2,0xa8]], [[0x0a,0x06,0x14], [0x6e,0xf2,0xc8]],
           [[0xdd,0xd6,0xe4], [0x8a,0x4a,0xd6]], [[0xe2,0xdc,0xd2], [0xd0,0x60,0x30]],
           [[0x10,0x06,0x12], [0xff,0x7a,0xe0]], [[0x24,0x36,0x1a], [0xa0,0xff,0x6a]],
           [[0x3a,0x22,0x18], [0xff,0xa1,0x4a]], [[0x06,0x0a,0x14], [0x5a,0xd9,0xff]],
           [[0x0c,0x08,0x12], [0xff,0xd4,0x47]], [[0xd6,0xe0,0xe4], [0x1e,0x88,0x8a]],
           [[0x0a,0x0c,0x10], [0xff,0x5a,0x4a]], [[0x40,0x20,0x2a], [0xff,0x8f,0x6b]],
           [[0x3a,0x1c,0x2e], [0xff,0xb3,0x5c]], [[0x45,0x1e,0x26], [0xff,0xd1,0x66]]] }
];
/* ── LA DIFICULTAD SALE DE LA TABLA COMO TODO LO DEMAS ──
   Estaba como un array de tres cadenas en castellano, o sea texto escrito derecho
   en el codigo sin pasar por `TX`: medido en la captura, el juego en ingles decia
   LEVELS · PICK A TRACK y abajo FÁCIL · NORMAL · DIFÍCIL. */
const difNom = (d) => TX('dif' + d);

/* ══════════ EL AZAR CON SEMILLA ══════════
   Un nivel tiene que ser EL MISMO nivel siempre: con azar de verdad, «el pico
   del compas nueve» deja de querer decir algo y no se puede aprender de memoria,
   que es de lo que vive este genero. */
let _sem = 1;
function sem(n){ _sem = (n | 0) || 1; }
function az(){ _sem = (_sem*1664525 + 1013904223) >>> 0; return _sem/4294967296; }
function azr(a, b){ return a + az()*(b - a); }
function azi(a, b){ return Math.floor(azr(a, b + 1)); }

const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, k) => a + (b - a)*k;
const $ = (id) => document.getElementById(id);

/* ══════════ LOS TRES IDIOMAS ══════════ */
const TXT = {
  es: { dif1:'FÁCIL', dif2:'NORMAL', dif3:'DIFÍCIL', dif4:'INSANO', sub:'DOS TEMAS, OCHO FORMAS Y NINGUNA VIDA', jugar:'JUGAR', iconos:'ICONO',
        ajustes:'AJUSTES', volver:'VOLVER', niveles:'NIVELES', elegi:'ELEGÍ EL TEMA',
        icono:'ICONO', forma:'FORMA', color:'COLOR', ajus:'AJUSTES',
        mus:'MÚSICA', fx:'EFECTOS', idioma:'IDIOMA', calidad:'GRÁFICOS',
        baja:'BAJA', media:'MEDIA', alta:'ALTA',
        pausa:'PAUSA', sigo:'SEGUIR', reint:'REINTENTAR', pract:'MODO PRÁCTICA',
        practOn:'PRÁCTICA', salir:'SALIR', intento:'INTENTO',
        mejor:'MEJOR', gano:'¡COMPLETO!', ganoS:'CIEN POR CIENTO',
        fin:'LOS DOS TEMAS', finT:'Los pasaste enteros. Probá el modo práctica para las monedas.',
        vel:'VELOCIDAD', dos:'DOS TEMAS',
        sigue:'SIGUIENTE', menu:'MENÚ',
        texto:'Un toque hace lo que la forma haga: saltar, subir, volar. Los orbes se aprietan en el aire. No hay vidas: si chocás, volvés al principio.',
        pie:'Dos temas. Los obstáculos caen en el compás: la música y el nivel son lo mismo. Sobre un bloque se puede parar; lo que mata son los pinches y lo que chocás.' },
  en: { dif1:'EASY', dif2:'NORMAL', dif3:'HARD', dif4:'INSANE', sub:'TWO TRACKS, EIGHT FORMS, NO LIVES', jugar:'PLAY', iconos:'ICON',
        ajustes:'SETTINGS', volver:'BACK', niveles:'LEVELS', elegi:'PICK A TRACK',
        icono:'ICON', forma:'SHAPE', color:'COLOUR', ajus:'SETTINGS',
        mus:'MUSIC', fx:'SFX', idioma:'LANGUAGE', calidad:'GRAPHICS',
        baja:'LOW', media:'MEDIUM', alta:'HIGH',
        pausa:'PAUSED', sigo:'RESUME', reint:'RETRY', pract:'PRACTICE MODE',
        practOn:'PRACTICE', salir:'QUIT', intento:'ATTEMPT',
        mejor:'BEST', gano:'COMPLETE!', ganoS:'ONE HUNDRED PERCENT',
        fin:'BOTH TRACKS', finT:'You cleared both. Try practice mode for the coins.',
        vel:'SPEED', dos:'TWO TRACKS',
        sigue:'NEXT', menu:'MENU',
        texto:'One tap does whatever the form does: jump, climb, fly. Orbs are pressed in mid-air. No lives: crash and you go back to the start.',
        pie:'Two tracks. Obstacles land on the beat: the music and the level are the same thing. You can stand on blocks; spikes and what you crash into kill.' },
  pt: { dif1:'FÁCIL', dif2:'NORMAL', dif3:'DIFÍCIL', dif4:'INSANO', sub:'DUAS FAIXAS, OITO FORMAS, NENHUMA VIDA', jugar:'JOGAR', iconos:'ÍCONE',
        ajustes:'AJUSTES', volver:'VOLTAR', niveles:'NÍVEIS', elegi:'ESCOLHA A FAIXA',
        icono:'ÍCONE', forma:'FORMA', color:'COR', ajus:'AJUSTES',
        mus:'MÚSICA', fx:'EFEITOS', idioma:'IDIOMA', calidad:'GRÁFICOS',
        baja:'BAIXA', media:'MÉDIA', alta:'ALTA',
        pausa:'PAUSA', sigo:'CONTINUAR', reint:'DE NOVO', pract:'MODO TREINO',
        practOn:'TREINO', salir:'SAIR', intento:'TENTATIVA',
        mejor:'MELHOR', gano:'COMPLETO!', ganoS:'CEM POR CENTO',
        fin:'AS DUAS FAIXAS', finT:'Você passou as duas. Tente o modo treino pelas moedas.',
        vel:'VELOCIDADE', dos:'DUAS FAIXAS',
        sigue:'PRÓXIMO', menu:'MENU',
        texto:'Um toque faz o que a forma faz: saltar, subir, voar. Os orbes se apertam no ar. Não há vidas: se bater, volta ao início.',
        pie:'Duas faixas. Os obstáculos caem no compasso: a música e o nível são a mesma coisa. Dá para ficar em cima dos blocos; o que mata são os espinhos e o que você bate.' }
};
let LANG = 'en';
const TX = (k) => (TXT[LANG] && TXT[LANG][k]) || TXT.es[k] || k;

const CALIDADES = { baja: { esc: 0.60, part: 26 }, media: { esc: 0.85, part: 70 },
                    alta: { esc: 1.00, part: 130 } };
let CALIDAD = 'media';
