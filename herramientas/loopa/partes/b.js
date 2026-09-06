/* ══════════════════════ LAS TABLAS ══════════════════════
   LOOPA es un secuenciador que se toca con la boca: se beatboxea y salen bombo,
   caja y charles; se tararea y sale una melodía. Lo que la voz produce no es
   audio grabado sino NOTAS EN UNA GRILLA, y por eso se puede corregir, cambiar
   de instrumento, cambiar de tempo y repetir sin fin.

   ── POR QUÉ NOTAS Y NO AUDIO ──
   Grabar la voz y reproducirla sería un grabador, no un secuenciador: no se
   podría acelerar sin que suene a ardilla, ni corregir un golpe que salió
   corrido, ni cambiar el sonido después. Detectando y cuantizando, un tarareo
   torcido se convierte en un patrón que suena a máquina — que es exactamente lo
   que hace cualquier programa de música, y lo que se pidió. */

const PASOS_COMPAS = 16;          /* dieciseisavos: la reja más fina que se canta */
const COMPASES_DEF = 2;
const BPM_MIN = 60, BPM_MAX = 180, BPM_DEF = 96;

/* las cuatro pistas: tres de la boca y una de la voz cantada */
const PISTAS = [
  { id: 'bombo',   perc: 1, n: ['BOMBO',   'KICK',  'BUMBO'] },
  { id: 'caja',    perc: 1, n: ['CAJA',    'SNARE', 'CAIXA'] },
  { id: 'charles', perc: 1, n: ['CHARLES', 'HAT',   'CHIMBAU'] },
  { id: 'melo',    perc: 0, n: ['MELODÍA', 'MELODY','MELODIA'] }
];

/* ══════════ IDIOMAS ══════════ */
const TXT = {
  es: { sub: 'BEATBOXEÁ. TARAREÁ. QUEDA GRABADO.', jugar: 'EMPEZAR', ajustes: 'AJUSTES',
        volver: 'VOLVER', menu: 'MENÚ', idioma: 'IDIOMA', tempo: 'TEMPO', compases: 'COMPASES',
        instrumento: 'INSTRUMENTO', metro: 'CLAQUETA', sens: 'SENSIBILIDAD', escala: 'ESCALA',
        percu: 'PERCUSIÓN', melodia: 'MELODÍA', grabar: 'GRABAR', parar: 'PARAR',
        play: 'TOCAR', stop: 'PARAR', limpiar: 'BORRAR', limpiaTodo: 'BORRAR TODO',
        cuenta: 'PREPARATE…', grabando: 'GRABANDO', listo: 'LISTO',
        ayudaP: 'Hacé «bom» para el bombo, «tss» para el charles y «pah» para la caja.',
        ayudaM: 'Tarareá una melodía con «na na na». Cortá cada nota.',
        sinMic: 'SIN MICRÓFONO · igual podés tocar la grilla con el dedo',
        pidiendo: 'PEDIENDO EL MICRÓFONO…', silencio: 'no te escucho',
        golpes: 'golpes', notas: 'notas', vacio: 'nada — probá más fuerte', ajuste: 'AJUSTE',
        pie: 'Se graba con la claqueta puesta y se acomoda solo a la reja. Después tocá la grilla para corregir.',
        credito: 'Instrumentos: FluidR3_GM vía gleitz/midi-js-soundfonts — CC-BY 3.0',
        cal: 'CALIBRANDO…', vol: 'VOLUMEN' },
  en: { sub: 'BEATBOX IT. HUM IT. IT STAYS.', jugar: 'START', ajustes: 'SETTINGS',
        volver: 'BACK', menu: 'MENU', idioma: 'LANGUAGE', tempo: 'TEMPO', compases: 'BARS',
        instrumento: 'INSTRUMENT', metro: 'CLICK', sens: 'SENSITIVITY', escala: 'SCALE',
        percu: 'DRUMS', melodia: 'MELODY', grabar: 'RECORD', parar: 'STOP',
        play: 'PLAY', stop: 'STOP', limpiar: 'CLEAR', limpiaTodo: 'CLEAR ALL',
        cuenta: 'GET READY…', grabando: 'RECORDING', listo: 'DONE',
        ayudaP: 'Say "boom" for the kick, "tss" for the hat and "pah" for the snare.',
        ayudaM: 'Hum a melody with "na na na". Cut each note.',
        sinMic: 'NO MICROPHONE · you can still tap the grid',
        pidiendo: 'ASKING FOR THE MICROPHONE…', silencio: 'I cannot hear you',
        golpes: 'hits', notas: 'notes', vacio: 'nothing — try louder', ajuste: 'OFFSET',
        pie: 'It records against the click and snaps to the grid. Then tap the grid to fix it.',
        credito: 'Instruments: FluidR3_GM via gleitz/midi-js-soundfonts — CC-BY 3.0',
        cal: 'CALIBRATING…', vol: 'VOLUME' },
  pt: { sub: 'FAÇA BEATBOX. CANTAROLE. FICA GRAVADO.', jugar: 'COMEÇAR', ajustes: 'AJUSTES',
        volver: 'VOLTAR', menu: 'MENU', idioma: 'IDIOMA', tempo: 'ANDAMENTO', compases: 'COMPASSOS',
        instrumento: 'INSTRUMENTO', metro: 'CLIQUE', sens: 'SENSIBILIDADE', escala: 'ESCALA',
        percu: 'PERCUSSÃO', melodia: 'MELODIA', grabar: 'GRAVAR', parar: 'PARAR',
        play: 'TOCAR', stop: 'PARAR', limpiar: 'APAGAR', limpiaTodo: 'APAGAR TUDO',
        cuenta: 'PREPARE-SE…', grabando: 'GRAVANDO', listo: 'PRONTO',
        ayudaP: 'Faça «bum» para o bumbo, «tss» para o chimbau e «pá» para a caixa.',
        ayudaM: 'Cantarole uma melodia com «na na na». Corte cada nota.',
        sinMic: 'SEM MICROFONE · dá para tocar a grade com o dedo',
        pidiendo: 'PEDINDO O MICROFONE…', silencio: 'não te escuto',
        golpes: 'batidas', notas: 'notas', vacio: 'nada — tente mais forte', ajuste: 'AJUSTE',
        pie: 'Grava com o clique e encaixa na grade sozinho. Depois toque a grade para corrigir.',
        credito: 'Instrumentos: FluidR3_GM via gleitz/midi-js-soundfonts — CC-BY 3.0',
        cal: 'CALIBRANDO…', vol: 'VOLUME' }
};

const NOTA_NOM = ['DO', 'DO#', 'RE', 'MI♭', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'SI♭', 'SI'];

/* ── LAS ESCALAS SON UN CORRECTOR, NO UN INSTRUMENTO ──
   Nadie canta afinado a la primera. Pegando cada nota detectada al grado más
   cercano, un tarareo torcido se vuelve una melodía; y en «ninguna» se deja el
   semitono crudo, que es lo que hay que poder elegir. */
const ESCALAS = [
  { id: 'croma', g: null,                      n: ['Ninguna', 'None', 'Nenhuma'] },
  { id: 'menor', g: [0, 2, 3, 5, 7, 8, 10],    n: ['Menor', 'Minor', 'Menor'] },
  { id: 'mayor', g: [0, 2, 4, 5, 7, 9, 11],    n: ['Mayor', 'Major', 'Maior'] },
  { id: 'penta', g: [0, 3, 5, 7, 10],          n: ['Pentatónica', 'Pentatonic', 'Pentatônica'] }
];

function cl(v, a, b){ return v < a ? a : v > b ? b : v; }
function nombreMidi(m){ return NOTA_NOM[((Math.round(m) % 12) + 12) % 12] + (Math.floor(Math.round(m)/12) - 1); }
