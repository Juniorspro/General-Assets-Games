
/* ══════════════════════ LAS TABLAS ══════════════════════
   CRUCE es un juego de un dedo: se toca y el carpincho salta una fila adelante,
   se arrastra para ir a los costados o atras. Adelante hay rutas con autos,
   rios con camalotes y vias de tren. Se avanza mientras se pueda; la camara
   empuja desde atras y el que se queda se lo lleva el carancho.

   Todo lo que el juego ES vive en estas tablas: los cinco tipos de fila, la
   curva de dificultad, las catorce pieles y los tres idiomas. */

/* ══════════ EL TABLERO ══════════
   Nueve columnas (−4..4). El numero no es libre: la camara es una picada
   isometrica y en un marco 9:16 el alto de pantalla es 2,17 veces el ancho, asi
   que cuantas mas columnas se muestren mas FILAS entran y el fondo se va a la
   distancia. Con nueve columnas entran unas veinticinco filas, que es ver el
   peligro venir sin que el carpincho quede del tamano de un pixel. */
const COLS = 4;
const FILAS_VISTA = 26;
const SALTO_T = 0.155;          /* lo que dura un salto */
const SALTO_ALTO = 0.42;

/* ══════════ LOS CINCO TIPOS DE FILA ══════════
   ── CADA UNO PIDE OTRA COSA, Y POR ESO SON CINCO ──
   `pasto` es donde se piensa: no mata, pero los arboles tapan columnas y hay
   que elegir por donde. `ruta` es tiempo: hay que leer el hueco entre autos.
   `rio` es compromiso: el camalote te lleva, asi que quedarse quieto ya es
   moverse. `via` es memoria: el tren avisa y despues no perdona. Y `arena` es
   el respiro, sin nada, para que el ritmo no sea una sola nota. */
const TIPOS = ['pasto', 'ruta', 'rio', 'via', 'arena'];

/* ── LOS VEHICULOS ──
   `largo` en columnas, `alto` para dibujarlos, y de eso sale el choque. */
const VEHIS = {
  auto:      { largo: 1.55, ancho: 0.80, col: 0xd8402e },
  camion:    { largo: 2.70, ancho: 0.88, col: 0xe8eef2 },
  colectivo: { largo: 3.10, ancho: 0.92, col: 0xf2c422 }
};
const TREN = { largo: 9.0, vel: 26 };

/* ══════════ LA CURVA DE DIFICULTAD ══════════
   ── SE INTERPOLA POR FILA Y NO HAY ESCALONES ──
   Con escalones («cada 50 filas sube») el jugador cruza una frontera invisible
   y siente que el juego hizo trampa. `dif(f)` va de 0 a 1 con la fila y todo lo
   demas se lee de ahi: cuantos autos, que rapido, cuantos arboles, cuanto rio.
   El techo esta en la fila 220: mas alla el juego no aprieta mas y lo que queda
   es aguantar. */
const F_TOPE = 220;
const dif = (f) => Math.min(1, Math.max(0, f - 6)/F_TOPE);

/* ══════════ LAS CATORCE PIELES ══════════
   ── UN TINTE Y UN ACCESORIO, LOS DOS POR CODIGO ──
   El carpincho es un modelo con su textura; la piel lo multiplica por un color
   y le agrega una pieza dibujada. Asi las catorce salen de un solo modelo y
   pesan cero. `desb` dice como se abre: por puntaje o con monedas. */
const PIELES = [
  { id: 'carpincho', nom: { es: 'Carpincho',  en: 'Capybara',   pt: 'Capivara' },   tinte: 0xffffff, acc: null,       desb: {} },
  { id: 'gorra',     nom: { es: 'Gorrita',    en: 'Cap',        pt: 'Boné' },       tinte: 0xffffff, acc: 'gorra',    desb: { pts: 25 } },
  { id: 'crema',     nom: { es: 'Crema',      en: 'Cream',      pt: 'Creme' },      tinte: 0xf2e2c0, acc: null,       desb: { pts: 45 } },
  { id: 'paja',      nom: { es: 'De paja',    en: 'Straw hat',  pt: 'De palha' },   tinte: 0xffffff, acc: 'paja',     desb: { mon: 250 } },
  { id: 'negro',     nom: { es: 'Nocturno',   en: 'Night',      pt: 'Noturno' },    tinte: 0x4a4a58, acc: null,       desb: { pts: 70 } },
  { id: 'bufanda',   nom: { es: 'Bufanda',    en: 'Scarf',      pt: 'Cachecol' },   tinte: 0xffffff, acc: 'bufanda',  desb: { mon: 450 } },
  { id: 'albiceleste', nom: { es: 'Celeste',  en: 'Sky blue',   pt: 'Celeste' },    tinte: 0x9fd8f2, acc: 'vincha',   desb: { pts: 100 } },
  { id: 'rosado',    nom: { es: 'Rosado',     en: 'Pink',       pt: 'Rosado' },     tinte: 0xf2a8c0, acc: null,       desb: { mon: 700 } },
  { id: 'lentes',    nom: { es: 'Con lentes', en: 'Shades',     pt: 'Óculos' },     tinte: 0xffffff, acc: 'lentes',   desb: { pts: 140 } },
  { id: 'musgo',     nom: { es: 'Musgo',      en: 'Moss',       pt: 'Musgo' },      tinte: 0x8fbf6a, acc: null,       desb: { mon: 1100 } },
  { id: 'obrero',    nom: { es: 'De obra',    en: 'Hard hat',   pt: 'Capacete' },   tinte: 0xffffff, acc: 'casco',    desb: { pts: 190 } },
  { id: 'dorado',    nom: { es: 'Dorado',     en: 'Golden',     pt: 'Dourado' },    tinte: 0xf2c422, acc: 'corona',   desb: { mon: 2000 } },
  { id: 'fantasma',  nom: { es: 'Fantasma',   en: 'Ghost',      pt: 'Fantasma' },   tinte: 0xe8f2f8, acc: null, fantasma: 1, desb: { pts: 260 } },
  { id: 'mate',      nom: { es: 'Matero',     en: 'Mate',       pt: 'Chimarrão' },  tinte: 0xffffff, acc: 'mate',     desb: { mon: 3500 } }
];

/* ══════════ LOS TRES IDIOMAS ══════════ */
const TXT = {
  es: { sub: 'CRUZÁ SIN QUE TE LLEVEN PUESTO', jugar: 'JUGAR', pieles: 'PIELES', ajustes: 'AJUSTES', volver: 'VOLVER',
        elegi: 'ELEGÍ AL CARPINCHO', mon: 'MONEDAS', comprar: 'COMPRAR', usar: 'USAR', usando: 'PUESTA',
        bloqPts: 'LLEGÁ A', record: 'RÉCORD', nuevoRec: '¡NUEVO RÉCORD!', otra: 'OTRA VEZ', menu: 'MENÚ',
        pausa: 'PAUSA', sigo: 'SEGUIR', abandona: 'ABANDONAR', musica: 'MÚSICA', fx: 'EFECTOS', idioma: 'IDIOMA',
        calidad: 'GRÁFICOS', baja: 'BAJA', media: 'MEDIA', alta: 'ALTA', borrar: 'BORRAR EL PROGRESO', borrado: 'BORRADO',
        nuevo: 'NUEVA', piel: 'PIEL', ganaste: 'GANASTE', filas: 'FILAS', tren: '¡VIENE EL TREN!',
        ayuda: 'TOCÁ PARA SALTAR · ARRASTRÁ PARA LOS COSTADOS', ayuda2: 'NO TE QUEDES ATRÁS',
        m_auto: 'te pisó un auto', m_agua: 'te fuiste al agua', m_tren: 'te llevó el tren',
        m_carancho: 'te agarró el carancho', m_deriva: 'te llevó la corriente',
        texto: 'Un carpincho, una ruta y un dedo. Tocá y salta una fila; arrastrá para los costados. Los autos no frenan, el camalote te lleva y el tren avisa una sola vez. Y no te quedes atrás: el carancho mira.',
        pie: 'Cuanto más lejos, más rápido. El récord se guarda solo.' },
  en: { sub: 'CROSS WITHOUT GETTING FLATTENED', jugar: 'PLAY', pieles: 'SKINS', ajustes: 'SETTINGS', volver: 'BACK',
        elegi: 'PICK YOUR CAPYBARA', mon: 'COINS', comprar: 'BUY', usar: 'WEAR', usando: 'WORN',
        bloqPts: 'REACH', record: 'BEST', nuevoRec: 'NEW RECORD!', otra: 'AGAIN', menu: 'MENU',
        pausa: 'PAUSED', sigo: 'RESUME', abandona: 'QUIT', musica: 'MUSIC', fx: 'SFX', idioma: 'LANGUAGE',
        calidad: 'GRAPHICS', baja: 'LOW', media: 'MEDIUM', alta: 'HIGH', borrar: 'ERASE PROGRESS', borrado: 'ERASED',
        nuevo: 'NEW', piel: 'SKIN', ganaste: 'EARNED', filas: 'ROWS', tren: 'TRAIN COMING!',
        ayuda: 'TAP TO HOP · DRAG TO GO SIDEWAYS', ayuda2: "DON'T FALL BEHIND",
        m_auto: 'a car got you', m_agua: 'you fell in the water', m_tren: 'the train got you',
        m_carancho: 'the hawk got you', m_deriva: 'the current carried you off',
        texto: 'One capybara, one road, one finger. Tap to hop a row; drag to move sideways. Cars do not brake, the floating plants carry you, and the train warns you once. And do not fall behind: the hawk is watching.',
        pie: 'The farther you go, the faster it gets. Your best is saved.' },
  pt: { sub: 'ATRAVESSE SEM SER ATROPELADO', jugar: 'JOGAR', pieles: 'PELES', ajustes: 'AJUSTES', volver: 'VOLTAR',
        elegi: 'ESCOLHA A CAPIVARA', mon: 'MOEDAS', comprar: 'COMPRAR', usar: 'USAR', usando: 'EM USO',
        bloqPts: 'CHEGUE A', record: 'RECORDE', nuevoRec: 'NOVO RECORDE!', otra: 'DE NOVO', menu: 'MENU',
        pausa: 'PAUSA', sigo: 'CONTINUAR', abandona: 'SAIR', musica: 'MÚSICA', fx: 'EFEITOS', idioma: 'IDIOMA',
        calidad: 'GRÁFICOS', baja: 'BAIXA', media: 'MÉDIA', alta: 'ALTA', borrar: 'APAGAR O PROGRESSO', borrado: 'APAGADO',
        nuevo: 'NOVA', piel: 'PELE', ganaste: 'GANHOU', filas: 'FILEIRAS', tren: 'O TREM VEM!',
        ayuda: 'TOQUE PARA PULAR · ARRASTE PARA OS LADOS', ayuda2: 'NÃO FIQUE PARA TRÁS',
        m_auto: 'um carro te pegou', m_agua: 'você caiu na água', m_tren: 'o trem te pegou',
        m_carancho: 'o gavião te pegou', m_deriva: 'a correnteza te levou',
        texto: 'Uma capivara, uma estrada e um dedo. Toque para pular uma fileira; arraste para os lados. Os carros não freiam, os aguapés te levam e o trem avisa uma vez só. E não fique para trás: o gavião observa.',
        pie: 'Quanto mais longe, mais rápido. O recorde é salvo sozinho.' }
};
let LANG = 'en';
const TX = (k) => (TXT[LANG] && TXT[LANG][k]) || TXT.es[k] || k;
const TL = (o) => (o && (o[LANG] || o.es)) || '';
const fmtMon = (n) => Math.round(n).toLocaleString('de-DE');

/* ══════════ EL AZAR CON SEMILLA ══════════
   El mundo de una partida sale de una semilla: el auto-jugador y la partida de
   verdad ven las mismas filas, y una prueba repetida da lo mismo. */
let _sem = 1;
function sem(n){ _sem = (n | 0) || 1; }
function az(){ _sem = (_sem*1664525 + 1013904223) >>> 0; return _sem/4294967296; }
function azr(a, b){ return a + az()*(b - a); }
function azi(a, b){ return a + Math.floor(az()*(b - a + 1)); }
const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, k) => a + (b - a)*k;

const CALIDADES = { baja: { esc: 0.55, pix: 3.4, sombra: 0 }, media: { esc: 0.80, pix: 2.6, sombra: 1024 },
                    alta: { esc: 1.00, pix: 2.0, sombra: 2048 } };
let CALIDAD = 'media';
