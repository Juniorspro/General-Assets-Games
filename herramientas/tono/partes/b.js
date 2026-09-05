/* ══════════════════════ LAS TABLAS ══════════════════════
   TONO es un panel negro. Se toca y suena una nota; la ALTURA del dedo es la
   altura del sonido, y mientras el dedo sigue apoyado se puede subir y bajar
   para que la nota suba y baje con él.

   ── LAS NOTAS CAEN EN UNA ESCALA, Y ESO ES UNA DECISION ──
   Con la altura mapeada a frecuencia CONTINUA, cualquier acorde de dos dedos
   suena desafinado y no hay forma de repetir una melodía: el juego de repetir
   dejaría de existir. Cayendo en una escala, cualquier nota suena bien con
   cualquier otra —que es lo que hace una pentatónica— y al deslizar el dedo la
   nota GLISA de un grado al siguiente, así que subir y bajar se sigue sintiendo
   continuo. La escala se elige, y una de las siete es la cromática, que es el
   modo sin red. */

const OCTAVAS = 2;               /* lo que abarca el panel de abajo arriba */
const SEMIS = OCTAVAS*12;

/* ── LAS ESCALAS ──
   `g` son los grados en semitonos dentro de la octava. La pentatónica menor va
   primera porque es la que no puede sonar mal. */
const ESCALAS = [
  { id: 'penta',  g: [0, 3, 5, 7, 10],                 n: ['Pentatónica', 'Pentatonic', 'Pentatônica'] },
  { id: 'mayor',  g: [0, 2, 4, 5, 7, 9, 11],           n: ['Mayor', 'Major', 'Maior'] },
  { id: 'menor',  g: [0, 2, 3, 5, 7, 8, 10],           n: ['Menor', 'Minor', 'Menor'] },
  { id: 'dorica', g: [0, 2, 3, 5, 7, 9, 10],           n: ['Dórica', 'Dorian', 'Dórica'] },
  { id: 'blues',  g: [0, 3, 5, 6, 7, 10],              n: ['Blues', 'Blues', 'Blues'] },
  { id: 'japo',   g: [0, 1, 5, 7, 8],                  n: ['Japonesa', 'Japanese', 'Japonesa'] },
  { id: 'croma',  g: [0,1,2,3,4,5,6,7,8,9,10,11],      n: ['Cromática', 'Chromatic', 'Cromática'] }
];

/* las ocho familias, en el orden en que se dibujan las pestañas */
const FAMS = [
  ['teclas',  ['TECLAS', 'KEYS', 'TECLAS']],
  ['campana', ['CAMPANAS', 'BELLS', 'SINOS']],
  ['madera',  ['MADERAS', 'MALLETS', 'MADEIRAS']],
  ['organo',  ['ÓRGANOS', 'ORGANS', 'ÓRGÃOS']],
  ['pulsada', ['CUERDAS', 'PLUCKED', 'CORDAS']],
  ['viento',  ['VIENTOS', 'WINDS', 'SOPROS']],
  ['arco',    ['ARCO', 'BOWED', 'ARCO']],
  ['sinte',   ['BAJOS Y SINTES', 'BASS & SYNTH', 'BAIXOS E SINTS']]
];

/* ══════════ IDIOMAS ══════════ */
const TXT = {
  es: { sub: 'UN PANEL NEGRO. TOCALO.', libre: 'TOCAR', juego: 'REPETÍ', ajustes: 'AJUSTES',
        volver: 'VOLVER', salir: 'SALIR', otra: 'DE NUEVO', menu: 'MENÚ', seguir: 'SEGUIR',
        idioma: 'IDIOMA', sonido: 'SONIDO', escala: 'ESCALA', tono: 'TONO', octavas: 'ALCANCE',
        instrumento: 'INSTRUMENTO', escuchá: 'ESCUCHÁ', repetí: 'REPETÍ', ronda: 'RONDA',
        listo: 'BIEN', mal: 'ESA NO ERA', fin: 'HASTA ACÁ LLEGASTE', mejor: 'TU RÉCORD',
        notas: 'NOTAS', cargando: 'CARGANDO EL INSTRUMENTO…', toca: 'tocá el panel',
        pie: 'Abajo grave, arriba agudo. Mantené el dedo y movelo: la nota lo sigue.',
        pie2: 'Podés apoyar varios dedos a la vez.', credito:
        'Instrumentos: FluidR3_GM vía gleitz/midi-js-soundfonts — CC-BY 3.0',
        empeza: 'EMPEZAR', ver: 'VER LOS INSTRUMENTOS', sinSon: 'TU APARATO NO DEJÓ SONAR NADA' },
  en: { sub: 'A BLACK PANEL. TOUCH IT.', libre: 'PLAY', juego: 'REPEAT', ajustes: 'SETTINGS',
        volver: 'BACK', salir: 'QUIT', otra: 'AGAIN', menu: 'MENU', seguir: 'RESUME',
        idioma: 'LANGUAGE', sonido: 'SOUND', escala: 'SCALE', tono: 'KEY', octavas: 'RANGE',
        instrumento: 'INSTRUMENT', escuchá: 'LISTEN', repetí: 'REPEAT', ronda: 'ROUND',
        listo: 'GOOD', mal: 'NOT THAT ONE', fin: 'THAT IS AS FAR AS YOU GOT', mejor: 'YOUR BEST',
        notas: 'NOTES', cargando: 'LOADING THE INSTRUMENT…', toca: 'touch the panel',
        pie: 'Low at the bottom, high at the top. Hold and move: the note follows.',
        pie2: 'You can hold several fingers at once.', credito:
        'Instruments: FluidR3_GM via gleitz/midi-js-soundfonts — CC-BY 3.0',
        empeza: 'START', ver: 'SEE THE INSTRUMENTS', sinSon: 'YOUR DEVICE BLOCKED THE SOUND' },
  pt: { sub: 'UM PAINEL PRETO. TOQUE.', libre: 'TOCAR', juego: 'REPITA', ajustes: 'AJUSTES',
        volver: 'VOLTAR', salir: 'SAIR', otra: 'DE NOVO', menu: 'MENU', seguir: 'CONTINUAR',
        idioma: 'IDIOMA', sonido: 'SOM', escala: 'ESCALA', tono: 'TOM', octavas: 'ALCANCE',
        instrumento: 'INSTRUMENTO', escuchá: 'ESCUTE', repetí: 'REPITA', ronda: 'RODADA',
        listo: 'BOM', mal: 'ESSA NÃO ERA', fin: 'ATÉ AQUI VOCÊ CHEGOU', mejor: 'SEU RECORDE',
        notas: 'NOTAS', cargando: 'CARREGANDO O INSTRUMENTO…', toca: 'toque o painel',
        pie: 'Grave embaixo, agudo em cima. Segure e mova: a nota acompanha.',
        pie2: 'Você pode apoiar vários dedos ao mesmo tempo.', credito:
        'Instrumentos: FluidR3_GM via gleitz/midi-js-soundfonts — CC-BY 3.0',
        empeza: 'COMEÇAR', ver: 'VER OS INSTRUMENTOS', sinSon: 'SEU APARELHO NÃO DEIXOU TOCAR' }
};

const NOTA_NOM = ['DO', 'DO#', 'RE', 'MI♭', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'SI♭', 'SI'];

/* ══════════ AZAR CON SEMILLA ══════════ */
let SEM = 1;
function sem(s){ SEM = (s >>> 0) || 1; }
function az(){ SEM ^= SEM << 13; SEM ^= SEM >>> 17; SEM ^= SEM << 5; return ((SEM >>> 0) % 100000)/100000; }
function azi(a, b){ return Math.floor(a + az()*(b - a + 1)); }
function cl(v, a, b){ return v < a ? a : v > b ? b : v; }
function lerp(a, b, k){ return a + (b - a)*k; }
