
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
    naveMax: 4*SALTO_ALTO/T*0.70
  };
}

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
const NIVELES = [
  { id: 0, nom: 'NEON DRIVE',   bpm: 128, dif: 1, compases: 26, modos: ['cubo'],
    col: [0x10, 0x1c, 0x30], col2: [0x2d, 0xe2, 0xa8] },
  { id: 1, nom: 'GRAVEDAD CERO', bpm: 140, dif: 2, compases: 28,
    modos: ['cubo', 'gravedad'], col: [0x1e, 0x12, 0x30], col2: [0xb0, 0x7a, 0xff] },
  { id: 2, nom: 'ROTOR',         bpm: 150, dif: 3, compases: 30,
    modos: ['cubo', 'gravedad', 'nave'], col: [0x2a, 0x10, 0x18], col2: [0xff, 0x7a, 0x4a] }
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
  es: { dif1:'FÁCIL', dif2:'NORMAL', dif3:'DIFÍCIL', sub:'UN CUBO, TRES TEMAS Y NINGUNA VIDA', jugar:'JUGAR', iconos:'ICONO',
        ajustes:'AJUSTES', volver:'VOLVER', niveles:'NIVELES', elegi:'ELEGÍ UN TEMA',
        icono:'ICONO', forma:'FORMA', color:'COLOR', ajus:'AJUSTES',
        mus:'MÚSICA', fx:'EFECTOS', idioma:'IDIOMA', calidad:'GRÁFICOS',
        baja:'BAJA', media:'MEDIA', alta:'ALTA',
        pausa:'PAUSA', sigo:'SEGUIR', reint:'REINTENTAR', pract:'MODO PRÁCTICA',
        practOn:'PRÁCTICA', salir:'SALIR', intento:'INTENTO',
        mejor:'MEJOR', gano:'¡COMPLETO!', ganoS:'CIEN POR CIENTO',
        fin:'LOS TRES TEMAS', finT:'No queda ninguno. Probá el modo práctica para las monedas.',
        sigue:'SIGUIENTE', menu:'MENÚ',
        texto:'Un toque salta. Mantené para saltar en cadena. No hay vidas: si chocás, volvés al principio del tema.',
        pie:'Los obstáculos caen en el compás. La música y el nivel son lo mismo.' },
  en: { dif1:'EASY', dif2:'NORMAL', dif3:'HARD', sub:'ONE CUBE, THREE TRACKS, NO LIVES', jugar:'PLAY', iconos:'ICON',
        ajustes:'SETTINGS', volver:'BACK', niveles:'LEVELS', elegi:'PICK A TRACK',
        icono:'ICON', forma:'SHAPE', color:'COLOUR', ajus:'SETTINGS',
        mus:'MUSIC', fx:'SFX', idioma:'LANGUAGE', calidad:'GRAPHICS',
        baja:'LOW', media:'MEDIUM', alta:'HIGH',
        pausa:'PAUSED', sigo:'RESUME', reint:'RETRY', pract:'PRACTICE MODE',
        practOn:'PRACTICE', salir:'QUIT', intento:'ATTEMPT',
        mejor:'BEST', gano:'COMPLETE!', ganoS:'ONE HUNDRED PERCENT',
        fin:'ALL THREE TRACKS', finT:'Nothing left. Try practice mode for the coins.',
        sigue:'NEXT', menu:'MENU',
        texto:'Tap to jump. Hold to chain jumps. No lives: crash and you go back to the start of the track.',
        pie:'Obstacles land on the beat. The music and the level are the same thing.' },
  pt: { dif1:'FÁCIL', dif2:'NORMAL', dif3:'DIFÍCIL', sub:'UM CUBO, TRÊS FAIXAS, NENHUMA VIDA', jugar:'JOGAR', iconos:'ÍCONE',
        ajustes:'AJUSTES', volver:'VOLTAR', niveles:'NÍVEIS', elegi:'ESCOLHA UMA FAIXA',
        icono:'ÍCONE', forma:'FORMA', color:'COR', ajus:'AJUSTES',
        mus:'MÚSICA', fx:'EFEITOS', idioma:'IDIOMA', calidad:'GRÁFICOS',
        baja:'BAIXA', media:'MÉDIA', alta:'ALTA',
        pausa:'PAUSA', sigo:'CONTINUAR', reint:'DE NOVO', pract:'MODO TREINO',
        practOn:'TREINO', salir:'SAIR', intento:'TENTATIVA',
        mejor:'MELHOR', gano:'COMPLETO!', ganoS:'CEM POR CENTO',
        fin:'AS TRÊS FAIXAS', finT:'Não sobrou nenhuma. Tente o modo treino pelas moedas.',
        sigue:'PRÓXIMO', menu:'MENU',
        texto:'Um toque salta. Segure para saltar em cadeia. Não há vidas: se bater, volta ao início da faixa.',
        pie:'Os obstáculos caem no compasso. A música e o nível são a mesma coisa.' }
};
let LANG = 'en';
const TX = (k) => (TXT[LANG] && TXT[LANG][k]) || TXT.es[k] || k;

const CALIDADES = { baja: { esc: 0.60, part: 26 }, media: { esc: 0.85, part: 70 },
                    alta: { esc: 1.00, part: 130 } };
let CALIDAD = 'media';
