
/* ══════════════════════ LAS TABLAS ══════════════════════
   VIGILIA es una caminata de tres minutos que no se controla. El jugador no
   decide a donde va: el cuerpo camina solo por catorce habitaciones. Lo unico
   que tiene en las manos es un TABLON con un BOL DE AGUA encima, y lo unico
   que puede hacer es inclinar el telefono para que el agua no se vuelque.

   Eso es lo que convierte a los sustos en un juego y no en un video: cada
   susto te hace pegar un tiron, y el tiron se paga en agua. Si el bol se vacia
   —o si se te cae del tablon— lo que camina detras te alcanza. */

const DUR = 180;                 /* los tres minutos que se piden */
const VEL = 0.72;                /* m/s: no es caminar, es arrastrar los pies */
const ZANCADA = 0.72;            /* metros por paso, para el cabeceo y el sonido */
const OJO = 1.62;                /* altura del ojo */

/* ══════════ EL BOL Y EL TABLON, EN METROS ══════════
   Los numeros son de un bol de verdad porque de ellos sale TODO lo demas: la
   frecuencia del chapoteo, el angulo al que se vuelca y el angulo al que el
   bol se desliza del tablon. Cambiar el radio cambia el juego. */
const G = 9.81;
const BOL_R = 0.110;             /* radio interior */
const BOL_BORDE = 0.075;         /* altura del borde desde el fondo */
const AGUA_H0 = 0.050;           /* profundidad al empezar */
const BOL_M = 0.9;               /* kg, para el deslizamiento */
const TAB_L = 0.62;              /* largo del tablon */
/* ── EL TABLON ES MAS ANCHO QUE EL BOL, Y POR POCO ──
   Con 0,20 de ancho y un bol de 0,22 de diametro, el margen de costado es
   NEGATIVO: el bol se caia en el primer cuadro de las cuatro corridas. Con
   0,34 quedan seis centimetros por lado, que es lo que hace que un tiron
   fuerte lo saque de la tabla y uno normal no. */
const TAB_A = 0.34;              /* ancho */
const MU = 0.42;                 /* roce estatico bol-madera: resbala a 22,8 grados */

/* ── LA FRECUENCIA DEL CHAPOTEO NO SE ELIGE, SE CALCULA ──
   Primer modo antisimetrico de un tanque cilindrico: k = 1,841/R y
   omega^2 = g·k·tanh(k·h). Con R 0,11 y h 0,05 da 10,6 rad/s, o sea 1,69 Hz —
   medio segundo por vaiven, que es lo que hace un bol de sopa. Escrito a mano
   el agua se movia como gelatina o como mercurio y no habia numero que lo
   arreglara, porque el numero correcto DEPENDE de cuanta agua queda. */
function omegaChapoteo(h){
  const k = 1.841/BOL_R;
  return Math.sqrt(G*k*Math.tanh(k*Math.max(0.005, h)));
}
const ZETA_AGUA = 0.055;         /* el agua casi no amortigua: por eso sigue moviendose */
const OM_TAB = 9.2, ZETA_TAB = 0.62;   /* las manos: rapidas pero no instantaneas */

/* ══════════ LAS CATORCE HABITACIONES ══════════
   `giro` es lo que dobla el camino AL SALIR, en cuartos de vuelta: sin doblar,
   tres minutos son un pasillo recto y todas las habitaciones se leen como la
   misma. `props` son los modelos que se plantan, en coordenadas de la propia
   habitacion (x de costado, z hacia adelante desde la entrada). */
/* ── LA CASA ES UNA SOLA RECTA, Y ESO ES UNA LIMITACION ASUMIDA ──
   Las habitaciones doblaban 90 grados entre una y otra, y la geometria no
   aguanta la esquina: la caja de la habitacion que dobla lleva sus dos
   paredes laterales a medio ancho de su eje, y una de esas dos cae
   ATRAVESADA en el pasillo anterior, a medio ancho de la union. Medido
   fotografiando la caminata cada doce segundos, dos de los quince cuadros
   salian con media pantalla tapada por una pared a medio metro del ojo —el
   baño y la capilla— y no es un problema de luz: es una pared que no
   deberia estar ahi. Una esquina bien hecha pide un nodo en L compartido
   por las dos habitaciones, con el vano en la pared LATERAL y no en la del
   fondo, y eso es otra vuelta. Mientras tanto la casa va derecha: cada
   cuarto sigue teniendo su ancho, su alto, su color, sus props y su luz,
   que es de donde sale que se distingan, y la caminata es sobre rieles
   —el jugador no elige por donde va— asi que doblar no agregaba una sola
   decision. */
const CUARTOS = [
  { id: 'entrada',   nom: 'el zaguán',      largo: 9,  ancho: 3.0, alto: 2.7, giro: 0,  luz: 0.30, col: 0x2a2622,
    props: [['lampara', 0, 2.2, 2.45], ['lampara', 0, 7.0, 2.45], ['cuadro', -1.45, 6.0, 1.6, 1], ['silla', 1.05, 7.4, 0]] },
  { id: 'sala',      nom: 'la sala',        largo: 8,  ancho: 5.6, alto: 3.0, giro: 0,  luz: 0.26, col: 0x322a24,
    props: [['silla', -1.9, 3.0, 0], ['silla', 1.9, 3.4, 0], ['tele', 2.1, 6.2, 0.5], ['lampara', 0, 2.4, 2.75], ['lampara', 0, 6.4, 2.75], ['cuadro', -2.7, 5.0, 1.7, 1]] },
  { id: 'pasillo1',  nom: 'el pasillo',     largo: 12, ancho: 2.0, alto: 2.5, giro: 0,  luz: 0.20, col: 0x241f1c,
    props: [['puerta', -0.98, 4.0, 0, 1], ['puerta', 0.98, 8.0, 0, 3], ['lampara', 0, 2.2, 2.3], ['lampara', 0, 6.2, 2.3], ['lampara', 0, 10.0, 2.3]] },
  { id: 'dormitorio',nom: 'el dormitorio',  largo: 8,  ancho: 5.0, alto: 2.8, giro: 0,  luz: 0.22, col: 0x2e2a30,
    props: [['cama', -1.5, 3.6, 0], ['ropero', 2.0, 5.4, 0], ['muneca', -1.5, 3.6, 0.66], ['lampara', 0, 2.2, 2.55], ['lampara', 0, 6.2, 2.55]] },
  { id: 'bano',      nom: 'el baño',        largo: 7,  ancho: 3.2, alto: 2.6, giro: 0,  luz: 0.20, col: 0x27302e,
    props: [['ropero', 1.3, 4.6, 0], ['cuadro', -1.55, 3.2, 1.5, 1], ['lampara', 0, 2.2, 2.35], ['lampara', 0, 5.6, 2.35]] },
  { id: 'cocina',    nom: 'la cocina',      largo: 8,  ancho: 4.4, alto: 2.8, giro: 0,  luz: 0.24, col: 0x2c2b22,
    props: [['silla', -1.4, 3.0, 0], ['silla', -1.4, 4.4, 0], ['tele', 1.9, 5.6, 0.9], ['lampara', 0, 2.2, 2.55], ['lampara', 0, 6.4, 2.55]] },
  { id: 'escalera',  nom: 'la escalera',    largo: 10, ancho: 2.6, alto: 3.4, giro: 0,  luz: 0.20, col: 0x201c1a,
    props: [['lampara', 0, 2.4, 3.1], ['lampara', 0, 7.4, 3.1], ['cuadro', -1.25, 6.0, 1.8, 1], ['cuadro', -1.25, 8.0, 1.8, 1]] },
  { id: 'sotano',    nom: 'el sótano',      largo: 11, ancho: 5.0, alto: 2.4, giro: 0,  luz: 0.17, col: 0x1b1a19,
    props: [['ropero', -2.0, 4.0, 0], ['silla', 1.6, 6.5, 0], ['muneca', 1.6, 6.5, 0.48], ['lampara', 0, 2.4, 2.15], ['lampara', 0, 8.4, 2.15]] },
  { id: 'deposito',  nom: 'el depósito',    largo: 9,  ancho: 4.2, alto: 2.9, giro: 0,  luz: 0.15, col: 0x252220,
    props: [['ropero', -1.7, 3.2, 0], ['ropero', 1.7, 5.8, 0], ['tele', 0, 7.5, 0.4], ['lampara', 0, 2.4, 2.65], ['lampara', 0, 7.2, 2.65]] },
  { id: 'capilla',   nom: 'la capilla',     largo: 12, ancho: 6.0, alto: 4.2, giro: 0,  luz: 0.34, col: 0x2a2734,
    props: [['silla', -1.6, 3.0, 0], ['silla', 1.6, 3.0, 0], ['silla', -1.6, 4.6, 0], ['silla', 1.6, 4.6, 0],
            ['cuadro', 0, 11.2, 2.4, 0], ['lampara', 0, 2.6, 3.9], ['lampara', 0, 6.4, 3.9], ['lampara', 0, 10.0, 3.9]] },
  { id: 'quirofano', nom: 'el quirófano',   largo: 8,  ancho: 5.2, alto: 3.0, giro: 0,  luz: 0.34, col: 0x28302e,
    props: [['cama', 0, 4.2, 0], ['lampara', 0, 2.2, 2.75], ['lampara', 0, 6.4, 2.75], ['silla', 2.0, 6.0, 0]] },
  { id: 'aula',      nom: 'el aula',        largo: 9,  ancho: 5.6, alto: 3.0, giro: 0,  luz: 0.21, col: 0x2b2a24,
    props: [['silla', -1.8, 3.0, 0], ['silla', 0, 3.0, 0], ['silla', 1.8, 3.0, 0],
            ['silla', -1.8, 4.8, 0], ['silla', 0, 4.8, 0], ['silla', 1.8, 4.8, 0], ['lampara', 0, 2.4, 2.75], ['lampara', 0, 7.2, 2.75]] },
  { id: 'taller',    nom: 'el taller',      largo: 9,  ancho: 4.0, alto: 2.7, giro: 0,  luz: 0.14, col: 0x231f1d,
    props: [['ropero', -1.6, 3.4, 0], ['tele', 1.6, 5.0, 0.5], ['silla', 1.4, 7.0, 0], ['lampara', 0, 2.4, 2.45], ['lampara', 0, 7.2, 2.45]] },
  { id: 'salida',    nom: 'la salida',      largo: 10, ancho: 3.0, alto: 2.8, giro: 0,  luz: 0.42, col: 0x2f2c28, fin: 1,
    props: [['puerta', 0, 9.8, 0, 0], ['lampara', 0, 2.4, 2.55], ['lampara', 0, 5.6, 2.55], ['lampara', 0, 8.6, 2.55]] }
];

/* ══════════ LOS TREINTA Y TRES SUSTOS ══════════
   No son imagenes que aparecen: son COSAS QUE PASAN EN LA HABITACION. Cada uno
   declara su clase —que es la animacion que corre—, cuanto dura, cuanta fuerza
   le pega al tablon y con que suena. La clase es lo que se dibuja; los
   parametros son lo que lo hace distinto de sus hermanos.

   `k` es el sacudon en g que recibe el tablon: 0,25 se aguanta con la mano
   quieta, 1,0 vuelca si el bol venia lleno. */
const SUSTOS = [
  { id: 'portazo',    clase: 'puerta',  dur: 1.1, k: 0.55, son: 'portazo',  p: { lado: -1, vel: 9 } },
  { id: 'corre',      clase: 'figura',  dur: 1.4, k: 0.35, son: 'pasos',    p: { modo: 'cruza', d: 7, v: 8 } },
  { id: 'mano',       clase: 'mano',    dur: 1.3, k: 0.85, son: 'golpe',    p: { desde: 'abajo' } },
  { id: 'apagon',     clase: 'luz',     dur: 2.2, k: 0.70, son: 'chasquido',p: { modo: 'negro', cara: 1 } },
  { id: 'cuelga',     clase: 'cae',     dur: 1.5, k: 0.60, son: 'soga',     p: { alto: 2.4, d: 2.6 } },
  { id: 'silla',      clase: 'desliza', dur: 1.2, k: 0.40, son: 'arrastre', p: { que: 'silla', d: 3.2 } },
  { id: 'espejo',     clase: 'espejo',  dur: 2.0, k: 0.45, son: 'susurro',  p: {} },
  { id: 'caraAgua',   clase: 'agua',    dur: 1.8, k: 0.95, son: 'burbujas', p: { modo: 'cara' } },
  { id: 'piso',       clase: 'piso',    dur: 1.6, k: 0.80, son: 'crujido',  p: {} },
  { id: 'fondo',      clase: 'figura',  dur: 2.6, k: 0.30, son: 'zumbido',  p: { modo: 'acerca', d: 12, v: 3.4 } },
  { id: 'manosPared', clase: 'pared',   dur: 2.0, k: 0.50, son: 'crujido',  p: { n: 9 } },
  { id: 'gatea',      clase: 'figura',  dur: 1.5, k: 0.65, son: 'raspa',    p: { modo: 'gatea', d: 6, v: 7 } },
  { id: 'ropero',     clase: 'puerta',  dur: 1.7, k: 0.50, son: 'bisagra',  p: { lado: 1, vel: 3.2, mueble: 1 } },
  { id: 'polillas',   clase: 'bichos',  dur: 2.0, k: 0.55, son: 'aleteo',   p: { n: 90 } },
  { id: 'juguete',    clase: 'rueda',   dur: 2.2, k: 0.60, son: 'ruedita',  p: { d: 5 } },
  { id: 'techo',      clase: 'techo',   dur: 2.4, k: 0.45, son: 'gruñido',  p: { baja: 1.1 } },
  { id: 'aliento',    clase: 'aliento', dur: 1.8, k: 0.35, son: 'respira',  p: {} },
  { id: 'cuadro',     clase: 'cuadro',  dur: 1.6, k: 0.75, son: 'grito1',   p: {} },
  { id: 'sangre',     clase: 'sangre',  dur: 2.6, k: 0.30, son: 'goteo',    p: {} },
  { id: 'ventana',    clase: 'ventana', dur: 1.2, k: 0.90, son: 'vidrio',   p: {} },
  { id: 'timbre',     clase: 'mueble',  dur: 2.0, k: 0.70, son: 'timbre',   p: {} },
  { id: 'estira',     clase: 'estira',  dur: 2.8, k: 0.40, son: 'zumbido',  p: {} },
  { id: 'manosAgua',  clase: 'agua',    dur: 1.7, k: 1.00, son: 'chapoteo', p: { modo: 'manos' } },
  { id: 'detras',     clase: 'detras',  dur: 2.4, k: 0.45, son: 'pasos',    p: {} },
  { id: 'cuerpo',     clase: 'cuerpo',  dur: 1.1, k: 0.55, son: 'golpe',    p: {} },
  { id: 'paredes',    clase: 'techo',   dur: 2.6, k: 0.50, son: 'gruñido',  p: { cierra: 1 } },
  { id: 'copia',      clase: 'copia',   dur: 3.0, k: 0.40, son: 'susurro',  p: {} },
  { id: 'tele',       clase: 'tele',    dur: 2.2, k: 0.60, son: 'estatica', p: {} },
  { id: 'rata',       clase: 'figura',  dur: 1.2, k: 0.50, son: 'raspa',    p: { modo: 'patas', d: 3.5, v: 9 } },
  { id: 'toca',       clase: 'mano',    dur: 1.4, k: 0.75, son: 'golpe',    p: { desde: 'tablon' } },
  { id: 'agua',       clase: 'agua',    dur: 2.2, k: 0.55, son: 'burbujas', p: { modo: 'negra' } },
  { id: 'multitud',   clase: 'luz',     dur: 2.6, k: 0.65, son: 'susurro',  p: { modo: 'parpadeo', multitud: 1 } },
  { id: 'final',      clase: 'figura',  dur: 1.5, k: 1.10, son: 'grito2',   p: { modo: 'encima', d: 3.0, v: 12 } }
];

/* ══════════ CUANDO CAE CADA UNO ══════════
   Repartidos a lo largo de los tres minutos, con la mano cada vez mas pesada:
   los primeros dan tiempo a acomodar el tablon, los ultimos se encadenan. Y
   NUNCA dos en la misma habitacion seguidos si la anterior todavia esta
   temblando — un susto encima de otro no da el doble de miedo, da ruido. */
const HUECO0 = 8.2, HUECO1 = 3.4;

/* ══════════ IDIOMAS ══════════ */
const TXT = {
  es: { sub: 'NO DERRAMES EL AGUA', jugar: 'EMPEZAR', ajustes: 'AJUSTES', volver: 'VOLVER',
        seguir: 'SEGUIR', menu: 'MENÚ', otra: 'OTRA VEZ', pausa: 'PAUSA',
        musica: 'MÚSICA', efectos: 'EFECTOS', idioma: 'IDIOMA', graficos: 'GRÁFICOS',
        baja: 'BAJA', media: 'MEDIA', alta: 'ALTA', borrar: 'BORRAR EL PROGRESO',
        pie: 'Inclina el teléfono. Tres minutos. El agua se vuelca sola.',
        permiso: 'TOCÁ PARA USAR EL SENSOR', sinGiro: 'sin giroscopio: arrastrá con el dedo',
        conGiro: 'inclinando el teléfono', agua: 'AGUA', tiempo: 'TIEMPO',
        ganaste: 'SALISTE', perdiste: 'SE TE ACABÓ EL AGUA', cayo: 'SE TE CAYÓ EL BOL',
        mejor: 'MEJOR', llegaste: 'LLEGASTE A', de: 'DE', sustos: 'SUSTOS',
        cuarto: 'ESTABAS EN', tuto: 'MANTENÉ EL BOL DERECHO' },
  en: { sub: 'DO NOT SPILL THE WATER', jugar: 'START', ajustes: 'SETTINGS', volver: 'BACK',
        seguir: 'RESUME', menu: 'MENU', otra: 'AGAIN', pausa: 'PAUSED',
        musica: 'MUSIC', efectos: 'SOUND FX', idioma: 'LANGUAGE', graficos: 'GRAPHICS',
        baja: 'LOW', media: 'MEDIUM', alta: 'HIGH', borrar: 'ERASE PROGRESS',
        pie: 'Tilt the phone. Three minutes. The water spills on its own.',
        permiso: 'TAP TO USE THE SENSOR', sinGiro: 'no gyroscope: drag with your finger',
        conGiro: 'tilting the phone', agua: 'WATER', tiempo: 'TIME',
        ganaste: 'YOU MADE IT OUT', perdiste: 'THE BOWL RAN DRY', cayo: 'YOU DROPPED THE BOWL',
        mejor: 'BEST', llegaste: 'YOU REACHED', de: 'OF', sustos: 'SCARES',
        cuarto: 'YOU WERE IN', tuto: 'KEEP THE BOWL LEVEL' },
  pt: { sub: 'NÃO DERRAME A ÁGUA', jugar: 'COMEÇAR', ajustes: 'AJUSTES', volver: 'VOLTAR',
        seguir: 'CONTINUAR', menu: 'MENU', otra: 'DE NOVO', pausa: 'PAUSA',
        musica: 'MÚSICA', efectos: 'EFEITOS', idioma: 'IDIOMA', graficos: 'GRÁFICOS',
        baja: 'BAIXA', media: 'MÉDIA', alta: 'ALTA', borrar: 'APAGAR O PROGRESSO',
        pie: 'Incline o telefone. Três minutos. A água derrama sozinha.',
        permiso: 'TOQUE PARA USAR O SENSOR', sinGiro: 'sem giroscópio: arraste com o dedo',
        conGiro: 'inclinando o telefone', agua: 'ÁGUA', tiempo: 'TEMPO',
        ganaste: 'VOCÊ SAIU', perdiste: 'A ÁGUA ACABOU', cayo: 'VOCÊ DERRUBOU A TIGELA',
        mejor: 'MELHOR', llegaste: 'VOCÊ CHEGOU A', de: 'DE', sustos: 'SUSTOS',
        cuarto: 'VOCÊ ESTAVA EM', tuto: 'MANTENHA A TIGELA NIVELADA' }
};
const NOM_CUARTO = {
  es: { entrada: 'el zaguán', sala: 'la sala', pasillo1: 'el pasillo', dormitorio: 'el dormitorio',
        bano: 'el baño', cocina: 'la cocina', escalera: 'la escalera', sotano: 'el sótano',
        deposito: 'el depósito', capilla: 'la capilla', quirofano: 'el quirófano', aula: 'el aula',
        taller: 'el taller', salida: 'la salida' },
  en: { entrada: 'the hallway', sala: 'the living room', pasillo1: 'the corridor', dormitorio: 'the bedroom',
        bano: 'the bathroom', cocina: 'the kitchen', escalera: 'the stairwell', sotano: 'the cellar',
        deposito: 'the storeroom', capilla: 'the chapel', quirofano: 'the operating room', aula: 'the classroom',
        taller: 'the workshop', salida: 'the way out' },
  pt: { entrada: 'o hall', sala: 'a sala', pasillo1: 'o corredor', dormitorio: 'o quarto',
        bano: 'o banheiro', cocina: 'a cozinha', escalera: 'a escada', sotano: 'o porão',
        deposito: 'o depósito', capilla: 'a capela', quirofano: 'a sala de cirurgia', aula: 'a sala de aula',
        taller: 'a oficina', salida: 'a saída' }
};

/* ══════════ CALIDADES ══════════
   Lo unico que cambia es lo que cuesta: los cuartos, los sustos y la fisica son
   los mismos en las tres. */
const CALIDADES = {
  baja:  { esc: 0.55, pix: 3.2, sombra: 0,    niebla: 1.35 },
  media: { esc: 0.80, pix: 2.4, sombra: 1024, niebla: 1.0 },
  alta:  { esc: 1.00, pix: 1.9, sombra: 2048, niebla: 0.85 }
};

/* ══════════ AZAR CON SEMILLA ══════════ */
let SEM = 1;
function sem(s){ SEM = (s >>> 0) || 1; }
function az(){ SEM ^= SEM << 13; SEM ^= SEM >>> 17; SEM ^= SEM << 5; return ((SEM >>> 0) % 100000)/100000; }
function azr(a, b){ return a + az()*(b - a); }
function azi(a, b){ return Math.floor(a + az()*(b - a + 1)); }
function cl(v, a, b){ return v < a ? a : v > b ? b : v; }
function lerp(a, b, k){ return a + (b - a)*k; }
