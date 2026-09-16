/* ══════════════════════════════════════════════════════════════════════════
   B · CONSTANTES, MUNDOS, IDIOMAS Y GUARDADO
   ══════════════════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const mez = (a, b, k) => a + (b - a) * k;

/* AZAR CON SEMILLA. Un nivel tiene que ser EL MISMO nivel en cualquier aparato
   y en cualquier intento: si el tablero cambiara al reintentar, lo que uno
   leyo del intento anterior no valdria nada — y este juego entero consiste en
   leer que tiene cada flecha delante.                                       */
function azar(s) {
  let x = (s | 0) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x |= 0; return (x >>> 0) / 4294967296; };
}

/* ── LAS CUATRO DIRECCIONES ───────────────────────────────────────────────
   El indice ES la direccion, y su opuesta es `d^1`. Eso no es un truco de
   bits por elegancia: la pieza entra al tablero por detras de su punta, o sea
   que el primer paso del cuerpo es SIEMPRE la opuesta de la direccion de
   salida, y con una tabla de opuestas escrita aparte los dos numeros se
   separan el dia que alguien reordene la lista.                             */
const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];   /* der · izq · abajo · arriba */
const DNOM = ['der', 'izq', 'abajo', 'arriba'];

/* ── LOS SEIS MUNDOS ──────────────────────────────────────────────────────
   Lo que crece no es «la dificultad» como numero suelto: crecen el TABLERO y
   la CANTIDAD DE PIEZAS, y de esas dos sale todo lo demas. Mas piezas en el
   mismo hueco es menos rayos libres, o sea MENOS PROBABILIDAD DE ACERTAR SIN
   MIRAR: medido, `pAcierto` cae de 0,610 en el mundo 1 a 0,356 en el 6 y los
   fallos del que no lee suben de 4,6 a 35,1 contra tres corazones.
   `nlo`/`nhi` interpolan a lo largo de los veinte niveles de cada mundo, asi
   que dentro de un mundo tambien hay una curva y no veinte niveles iguales. */
const MUNDOS = [
  /* `b0` es el TOPE DE FLECHAS CON RAYO CERO —cabeza en el borde y apuntando
     hacia afuera— y no es un peso mas: es lo unico que deja que la fase de
     cierre cumpla su numero. Una flecha asi no tiene NI UNA CELDA entre su
     cabeza y el borde, o sea que es legal siempre y NADIE puede taparla
     nunca. Medido antes de ponerlo: de 26 legales del mundo 6, 23 eran de
     rayo cero — el cierre metia piezas persiguiendo un numero que la
     geometria le prohibia bajar. Tampoco pueden ser cero: son las flechas
     con las que un nivel se empieza. Son POCAS y contadas.                 */
  { nom: 'papel',  nx: 6,  ny: 8,  nlo: 4 ,  nhi: 6 ,  lmin: 2, lmax: 4, dobla: 0.30, lib: 3, b0: 4, extra: 8 , tinte: '#2b2b2b' },
  { nom: 'tinta',  nx: 7,  ny: 9,  nlo: 6 ,  nhi: 9 , lmin: 2, lmax: 5, dobla: 0.36, lib: 3, b0: 3, extra: 10, tinte: '#1f3550' },
  { nom: 'cable',  nx: 8,  ny: 10, nlo: 8 , nhi: 11, lmin: 2, lmax: 5, dobla: 0.42, lib: 3, b0: 3, extra: 12, tinte: '#0f4a44' },
  { nom: 'nudo',   nx: 9,  ny: 11, nlo: 9 , nhi: 12, lmin: 3, lmax: 6, dobla: 0.48, lib: 3, b0: 2, extra: 14, tinte: '#5a2f14' },
  { nom: 'telar',  nx: 10, ny: 12, nlo: 10, nhi: 14, lmin: 3, lmax: 6, dobla: 0.52, lib: 3, b0: 2, extra: 16, tinte: '#4a1f3d' },
  { nom: 'salida', nx: 11, ny: 13, nlo: 12, nhi: 16, lmin: 3, lmax: 7, dobla: 0.56, lib: 2, b0: 2, extra: 18, tinte: '#0e0e0e' },
];
const NIV_MUNDO = 20;
const NIVELES = MUNDOS.length * NIV_MUNDO;
const VIDAS = 3;

/* La semilla de un nivel sale del par (mundo, nivel) y de nada mas: asi el
   nivel 3 del mundo 2 es el mismo tablero para todo el mundo, y se puede
   hablar de «el 2-3» y que signifique algo.                                */
const semNivel = (m, n) => (m + 1) * 100003 + (n + 1) * 7919 + 13;

function cfgNivel(m, n) {
  const M = MUNDOS[m], k = NIV_MUNDO > 1 ? n / (NIV_MUNDO - 1) : 0;
  return {
    nx: M.nx, ny: M.ny, lmin: M.lmin, lmax: M.lmax, dobla: M.dobla,
    lib: M.lib, b0: M.b0, extra: M.extra,
    n: Math.round(mez(M.nlo, M.nhi, k)),
    sem: semNivel(m, n),
  };
}

/* ══════════════════════ IDIOMAS ══════════════════════ */
const LANGS = {
  es: {
    sub: 'sacá todas las flechas · mirá lo que cada una tiene delante',
    jugar: 'JUGAR', tuto: 'CÓMO SE JUEGA', niveles: 'NIVELES', ajustes: 'AJUSTES',
    volver: 'VOLVER', seguir: 'SEGUIR', reiniciar: 'REINICIAR', salir: 'SALIR AL MENÚ',
    /* el panel de fin pone REINICIAR y esta al lado, en fila: con la etiqueta
       larga el boton se parte en dos renglones mientras sus vecinos van en
       uno. En la pausa van apilados y ahi la larga entra.                  */
    menuCorto: 'MENÚ',
    siguiente: 'SIGUIENTE', pausa: 'PAUSA', pausaSub: 'las flechas te esperan',
    nivelesSub: 'tocá uno para jugarlo',
    gana: '¡LIMPIO!', ganaSub: 'no quedó ni una',
    ganaPerf: '¡PERFECTO!', ganaPerfSub: 'sin un solo error',
    datos: '{0} flechas · {1} toques',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONIDOS', idioma: 'IDIOMA',
    borrar: 'BORRAR EL PROGRESO', borrado: 'BORRADO',
    mundo: 'MUNDO {0}', nivel: 'NIVEL {0}-{1}', de: '{0} de {1}',
    mundos: ['PAPEL','TINTA','CABLE','NUDO','TELAR','SALIDA'],
    sinVidas: 'SE ACABARON', sinVidasSub: 'el tablero vuelve a empezar',
    pistaTrabada: 'ésa tiene algo en el camino',
    pie: 'sin un solo asset · todo dibujado por código', cargando: 'CARGANDO',
    tutTit: 'TUTORIAL',
    tut1: 'tocá una flecha y sale por donde apunta',
    tut2: 'ésa no puede: hay otra en su camino',
    tut3: 'sacá primero la que estorba',
    tut4: 'ahora sí · vaciá el tablero',
    tutGana: '¡ESO ES TODO!', tutGanaSub: 'ya sabés jugar',
    tutDatos: 'una flecha, un camino libre · nada más',
  },
  en: {
    sub: 'clear every arrow · look at what each one has ahead',
    jugar: 'PLAY', tuto: 'HOW TO PLAY', niveles: 'LEVELS', ajustes: 'SETTINGS',
    volver: 'BACK', seguir: 'RESUME', reiniciar: 'RESTART', salir: 'BACK TO MENU', menuCorto: 'MENU',
    siguiente: 'NEXT', pausa: 'PAUSED', pausaSub: 'the arrows will wait',
    nivelesSub: 'tap one to play it',
    gana: 'CLEAR!', ganaSub: 'not one left',
    ganaPerf: 'PERFECT!', ganaPerfSub: 'not a single mistake',
    datos: '{0} arrows · {1} taps',
    ajTit: 'SETTINGS', musica: 'MUSIC', efectos: 'SOUNDS', idioma: 'LANGUAGE',
    borrar: 'ERASE PROGRESS', borrado: 'ERASED',
    mundo: 'WORLD {0}', nivel: 'LEVEL {0}-{1}', de: '{0} of {1}',
    mundos: ['PAPER','INK','WIRE','KNOT','LOOM','EXIT'],
    sinVidas: 'OUT OF TRIES', sinVidasSub: 'the board starts over',
    pistaTrabada: 'that one has something in the way',
    pie: 'not one asset · all drawn in code', cargando: 'LOADING',
    tutTit: 'TUTORIAL',
    tut1: 'tap an arrow and it leaves the way it points',
    tut2: "that one can't: another is in its way",
    tut3: 'clear the one that blocks it first',
    tut4: 'now yes · empty the board',
    tutGana: "THAT'S ALL!", tutGanaSub: 'you know how to play',
    tutDatos: 'one arrow, one clear path · nothing else',
  },
  pt: {
    sub: 'tire todas as setas · olhe o que cada uma tem pela frente',
    jugar: 'JOGAR', tuto: 'COMO SE JOGA', niveles: 'NÍVEIS', ajustes: 'AJUSTES',
    volver: 'VOLTAR', seguir: 'CONTINUAR', reiniciar: 'REINICIAR', salir: 'SAIR AO MENU', menuCorto: 'MENU',
    siguiente: 'PRÓXIMO', pausa: 'PAUSA', pausaSub: 'as setas esperam',
    nivelesSub: 'toque em um para jogar',
    gana: 'LIMPO!', ganaSub: 'não sobrou nenhuma',
    ganaPerf: 'PERFEITO!', ganaPerfSub: 'sem um único erro',
    datos: '{0} setas · {1} toques',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONS', idioma: 'IDIOMA',
    borrar: 'APAGAR O PROGRESSO', borrado: 'APAGADO',
    mundo: 'MUNDO {0}', nivel: 'NÍVEL {0}-{1}', de: '{0} de {1}',
    mundos: ['PAPEL','TINTA','FIO','NÓ','TEAR','SAÍDA'],
    sinVidas: 'ACABARAM', sinVidasSub: 'o tabuleiro recomeça',
    pistaTrabada: 'essa tem algo no caminho',
    pie: 'sem um único asset · tudo desenhado em código', cargando: 'CARREGANDO',
    tutTit: 'TUTORIAL',
    tut1: 'toque numa seta e ela sai por onde aponta',
    tut2: 'essa não pode: tem outra no caminho',
    tut3: 'tire primeiro a que atrapalha',
    tut4: 'agora sim · esvazie o tabuleiro',
    tutGana: 'É SÓ ISSO!', tutGanaSub: 'você já sabe jogar',
    tutDatos: 'uma seta, um caminho livre · nada mais',
  },
};
let LANG = 'en';
/* `TX` Y NO `t`: una funcion global de una letra la pisa cualquier cosa que
   comparta la pagina, y cuando se pisa no falla el idioma — falla TODO.    */
function TX(k, ...a) {
  let s = (LANGS[LANG] && LANGS[LANG][k]) != null ? LANGS[LANG][k] : (LANGS.es[k] || k);
  for (let i = 0; i < a.length; i++) s = s.split('{' + i + '}').join(a[i]);
  return s;
}
/* EL MUNDO TIENE NOMBRE Y NO NUMERO. Con seis chips que dicen «MUNDO n» la
   fila no entra en 412 px y hay que deslizarla — una fila que se desliza sin
   que nada lo diga se lee a que hay seis mundos y se ven cuatro. Y encima
   pone numeros al lado de una reja de numeros. Los seis nombres ya estaban
   en MUNDOS[].nom y no los leia NADIE.                                     */
const nomMundo = m => (LANGS[LANG].mundos || LANGS.es.mundos)[m] || TX('mundo', m + 1);

/* ══════════════════════ EL GUARDADO ══════════════════════
   En una ventana privada `localStorage` TIRA: todo va envuelto.            */
const PROG = { lang: null, hechos: {}, vol: 0.5, fx: 0.8, visto: 0, ult: 0 };
function cargaProg() {
  try {
    const s = localStorage.getItem('flechas');
    if (!s) return false;
    const o = JSON.parse(s);
    if (o && typeof o === 'object') Object.assign(PROG, o);
    /* EL TUTORIAL SE VE CADA VEZ QUE SE ABRE EL JUEGO, y por eso la marca no
       sobrevive a una recarga. Pedido textual: «con tutorial apenas empieza».
       Se pone en cero DESPUES de leer el disco, asi que sigue valiendo DENTRO
       de la sesion —hecho una vez, no vuelve a dispararse entre nivel y
       nivel— y es el unico dato del guardado que se descarta a proposito.  */
    PROG.visto = 0;
    if (PROG.lang) LANG = PROG.lang;
    return !!PROG.lang;
  } catch (e) { return false; }
}
function guardaProg() { try { PROG.lang = LANG; localStorage.setItem('flechas', JSON.stringify(PROG)); } catch (e) {} }
function borraProg() {
  PROG.hechos = {}; PROG.visto = 0; PROG.ult = 0;
  try { localStorage.removeItem('flechas'); } catch (e) {}
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
