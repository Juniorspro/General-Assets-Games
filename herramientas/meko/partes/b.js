
/* ══════════════════════════════════════════════════════════════════════════
   B · CONSTANTES, BLOQUES, IDIOMAS Y GUARDADO
   ══════════════════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const mez = (a, b, k) => a + (b - a) * k;

/* AZAR CON SEMILLA, Y NO `Math.random`. Un nivel tiene que ser EL MISMO nivel
   en cualquier aparato y en cualquier partida: si cambiara al reintentar, el
   jugador estaria resolviendo otro rompecabezas cada vez y el validador
   estaria aprobando un nivel que nadie va a jugar.                          */
function azar(s) {
  let x = (s | 0) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x |= 0; return (x >>> 0) / 4294967296; };
}

/* ── LOS BLOQUES ──────────────────────────────────────────────────────────
   `solido` = sostiene lo que tenga encima.  `bloquea` = el robot no puede
   estar ahi.  Los dos casi siempre coinciden, y la ESCALERA es justamente la
   excepcion que hace que exista la distincion: sostiene y no bloquea, asi que
   una columna de escaleras da una celda pisable por nivel — trepar sale de la
   misma regla de caminar y no de un caso aparte.                            */
const VACIO = 0, LADRILLO = 1, PIEDRA = 2, PASTO = 3, MADERA = 4,
      METAL = 5, ESCALERA = 6, META = 7, VIDRIO = 8;

const BLOQ = {
  [LADRILLO]: { col: 0xc4705c, top: 0xd08268, solido: 1, bloquea: 1 },
  [PIEDRA]:   { col: 0x93a0a8, top: 0xa6b2b9, solido: 1, bloquea: 1 },
  [PASTO]:    { col: 0x8d6b49, top: 0x79ae57, solido: 1, bloquea: 1 },
  [MADERA]:   { col: 0xc0995f, top: 0xcfaa71, solido: 1, bloquea: 1 },
  [METAL]:    { col: 0x8496a3, top: 0x93a5b2, solido: 1, bloquea: 1 },
  [ESCALERA]: { col: 0xa87c4c, top: 0xa87c4c, solido: 1, bloquea: 0, fina: 1 },
  [META]:     { col: 0xe8ae3c, top: 0xf5c95c, solido: 1, bloquea: 1, brilla: 1 },
  [VIDRIO]:   { col: 0x9fd2e6, top: 0xb4dcec, solido: 1, bloquea: 1, vidrio: 1 },
};
const esSolidoT  = t => t !== VACIO && BLOQ[t].solido === 1;
const esBloqueaT = t => t !== VACIO && BLOQ[t].bloquea === 1;

/* ── LOS NUMEROS DEL MOVIMIENTO ───────────────────────────────────────────
   SUBIR UNO Y CAER HASTA TRES, y no es simetrico a proposito: es la regla que
   hace que la altura sea un problema. Si se pudiera subir lo que se cae, una
   torre seria una rampa y los mecanismos no harian falta para nada.         */
const SUBE_MAX = 1;
const CAE_MAX  = 3;
const PASO_T   = 0.26;   // lo que tarda el robot en cruzar una celda
const CAE_T    = 0.16;   // por celda de caida

/* la camara: ortografica isometrica, orbitando el diorama */
const CAM_EL_MIN = 0.34, CAM_EL_MAX = 1.16, CAM_EL_0 = 0.66;
const CAM_YAW_0  = Math.PI * 0.25;
const CAM_DIST   = 60;   /* con ortografica la distancia no cambia el tamano:
                            solo tiene que dejar todo delante del plano cercano */

const NIVELES = 20;

/* ── LAS TRES CALIDADES ───────────────────────────────────────────────────
   Cambian lo que CUESTA, no lo que el juego ES: el diorama, los mecanismos y
   la solucion son los mismos en las tres. Lo que se mueve es cuantos pixeles
   hay que rellenar y si hay sombra, que es una pasada entera de la escena.  */
const CALIDADES = {
  baja:  { px: 1.0, sombra: 0,    ao: 1 },
  media: { px: 1.4, sombra: 1024, ao: 1 },
  alta:  { px: 2.0, sombra: 2048, ao: 1 },
};

/* ══════════════════════ IDIOMAS ══════════════════════
   NADA DE TEXTO SUELTO EN EL CODIGO: todo sale de esta tabla, asi que cambiar
   de idioma cambia TODO y no la mitad. Ya costo 107 claves en Z Force.      */
const LANGS = {
  es: {
    sub: 'un robot · un diorama · un dedo',
    jugar: 'JUGAR', niveles: 'NIVELES', ajustes: 'AJUSTES', volver: 'VOLVER',
    seguir: 'SEGUIR', reiniciar: 'REINICIAR', salir: 'SALIR AL MENÚ',
    siguiente: 'SIGUIENTE', pausa: 'PAUSA', pausaSub: 'el diorama te espera',
    nivelesSub: 'tocá uno para jugarlo',
    gana: '¡LISTO!', ganaSub: 'el robot llegó',
    ganaDatos: '{0} toques · el mejor camino son {1}',
    ganaDatosPerf: '{0} toques · el camino más corto',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONIDOS', idioma: 'IDIOMA',
    calidad: 'GRÁFICOS', borrar: 'BORRAR EL PROGRESO', borrado: 'BORRADO',
    calB: 'BAJOS', calM: 'MEDIOS', calA: 'ALTOS',
    nivel: 'NIVEL {0}', de: '{0} de {1} resueltos',
    pistaMov: 'tocá un bloque y el robot camina hasta arriba',
    pistaGira: 'arrastrá para girar el diorama',
    pistaMec: 'tocá la pieza naranja para moverla',
    nope: 'HASTA AHÍ NO LLEGA',
    pie: 'sin un solo asset · todo dibujado por código',
    tocaPara: 'toques', cargando: 'CARGANDO',
  },
  en: {
    sub: 'one robot · one diorama · one finger',
    jugar: 'PLAY', niveles: 'LEVELS', ajustes: 'SETTINGS', volver: 'BACK',
    seguir: 'RESUME', reiniciar: 'RESTART', salir: 'BACK TO MENU',
    siguiente: 'NEXT', pausa: 'PAUSED', pausaSub: 'the diorama will wait',
    nivelesSub: 'tap one to play it',
    gana: 'SOLVED!', ganaSub: 'the robot made it',
    ganaDatos: '{0} taps · the best route is {1}',
    ganaDatosPerf: '{0} taps · the shortest route',
    ajTit: 'SETTINGS', musica: 'MUSIC', efectos: 'SOUNDS', idioma: 'LANGUAGE',
    calidad: 'GRAPHICS', borrar: 'ERASE PROGRESS', borrado: 'ERASED',
    calB: 'LOW', calM: 'MEDIUM', calA: 'HIGH',
    nivel: 'LEVEL {0}', de: '{0} of {1} solved',
    pistaMov: 'tap a block and the robot walks on top of it',
    pistaGira: 'drag to spin the diorama',
    pistaMec: 'tap the orange piece to move it',
    nope: "CAN'T GET THERE",
    pie: 'not one asset · all drawn in code',
    tocaPara: 'taps', cargando: 'LOADING',
  },
  pt: {
    sub: 'um robô · um diorama · um dedo',
    jugar: 'JOGAR', niveles: 'NÍVEIS', ajustes: 'AJUSTES', volver: 'VOLTAR',
    seguir: 'CONTINUAR', reiniciar: 'REINICIAR', salir: 'SAIR AO MENU',
    siguiente: 'PRÓXIMO', pausa: 'PAUSA', pausaSub: 'o diorama espera',
    nivelesSub: 'toque em um para jogar',
    gana: 'PRONTO!', ganaSub: 'o robô chegou',
    ganaDatos: '{0} toques · o melhor caminho são {1}',
    ganaDatosPerf: '{0} toques · o caminho mais curto',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONS', idioma: 'IDIOMA',
    calidad: 'GRÁFICOS', borrar: 'APAGAR O PROGRESSO', borrado: 'APAGADO',
    calB: 'BAIXOS', calM: 'MÉDIOS', calA: 'ALTOS',
    nivel: 'NÍVEL {0}', de: '{0} de {1} resolvidos',
    pistaMov: 'toque num bloco e o robô sobe até lá',
    pistaGira: 'arraste para girar o diorama',
    pistaMec: 'toque na peça laranja para movê-la',
    nope: 'ATÉ LÁ NÃO CHEGA',
    pie: 'sem um único asset · tudo desenhado em código',
    tocaPara: 'toques', cargando: 'CARREGANDO',
  },
};
let LANG = 'en';
/* `TX` Y NO `t`: una funcion global de una letra la pisa cualquier cosa que
   comparta la pagina, y cuando se pisa no falla el idioma — falla TODO, porque
   no queda un solo texto que no pase por aca. Ya paso en Z Force.           */
function TX(k, ...a) {
  let s = (LANGS[LANG] && LANGS[LANG][k]) != null ? LANGS[LANG][k] : (LANGS.es[k] || k);
  for (let i = 0; i < a.length; i++) s = s.split('{' + i + '}').join(a[i]);
  return s;
}

/* ══════════════════════ EL GUARDADO ══════════════════════
   En una ventana privada `localStorage` TIRA, asi que todo va envuelto: el
   juego tiene que arrancar igual sin disco.                                 */
const PROG = { lang: null, hechos: [], mejor: {}, vol: 0.5, fx: 0.8, cal: 'media', visto: 0 };
function cargaProg() {
  try {
    const s = localStorage.getItem('meko');
    if (!s) return false;
    const o = JSON.parse(s);
    if (o && typeof o === 'object') Object.assign(PROG, o);
    if (PROG.lang) LANG = PROG.lang;
    return !!PROG.lang;
  } catch (e) { return false; }
}
function guardaProg() { try { PROG.lang = LANG; localStorage.setItem('meko', JSON.stringify(PROG)); } catch (e) {} }
function borraProg() {
  PROG.hechos = []; PROG.mejor = {}; PROG.visto = 0;
  try { localStorage.removeItem('meko'); } catch (e) {}
}
/* EL DESBLOQUEO ES «EL SIGUIENTE AL ULTIMO RESUELTO, MAS UNO DE GRACIA»: con
   el nivel siguiente y nada mas, un rompecabezas que a alguien no le sale le
   cierra el juego entero. Con uno de gracia siempre hay otra puerta.        */
function abierto(n) {
  if (n === 0) return true;
  let m = -1;
  for (const h of PROG.hechos) if (h > m) m = h;
  return n <= m + 2;
}
