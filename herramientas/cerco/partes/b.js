/* ══════════════════════════════════════════════════════════════════════════
   B · CONSTANTES, MUNDOS, IDIOMAS Y GUARDADO
   ══════════════════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const mez = (a, b, k) => a + (b - a) * k;

/* AZAR CON SEMILLA. Un nivel tiene que ser EL MISMO nivel en cualquier
   aparato y en cualquier intento: con un azar de verdad, «el 3-5» no querria
   decir nada y reintentar seria jugar otro mapa.                           */
function azar(s) {
  let x = (s | 0) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x |= 0; return (x >>> 0) / 4294967296; };
}

/* ── LAS CUATRO DIRECCIONES ───────────────────────────────────────────────
   El indice ES la direccion y su opuesta es `d^1`. Con eso la regla de «no
   se puede dar media vuelta» —la de cualquier juego de estela— se escribe en
   una comparacion y no en una tabla que alguien tiene que mantener.        */
const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];    /* der · izq · abajo · arriba */
const DNOM = ['der', 'izq', 'abajo', 'arriba'];

/* ── LO QUE HAY EN UNA CELDA ──────────────────────────────────────────────
   `z` es el DUENO del terreno y `t` el dueno de la ESTELA, y son dos cosas
   distintas a proposito: se puede estar parado sobre tierra propia y tener
   estela de otro en la misma celda. Guardarlo en un solo numero obligaria a
   inventar combinaciones y el dia que entre un cuarto rival no alcanzan.   */
const LIBRE = 0;      /* z: nadie                                           */
const PIEDRA = 9;     /* z: roca — bloquea, mata y corta el relleno         */
const NJUG = 4;       /* el jugador es el 1; los rivales van del 2 al 4     */

/* ── LOS COLORES ──────────────────────────────────────────────────────────
   Tres por jugador y no uno: el terreno tiene que dejarse mirar sin cansar,
   la estela tiene que gritar —es lo unico que mata— y la cabeza tiene que
   encontrarse de una ojeada en un tablero de setenta celdas de lado. El
   jugador se lleva el ambar, que es el unico color calido de la paleta.    */
const COLS = [
  null,
  { z: '#7a4d12', t: '#f0a13a', c: '#ffe0b0' },   /* 1 · vos            */
  { z: '#0e5148', t: '#2fc2a8', c: '#b6f2e6' },   /* 2 · verde agua     */
  { z: '#3d2a6b', t: '#9a6bf2', c: '#d9c8ff' },   /* 3 · violeta        */
  { z: '#6b1f3a', t: '#f0578f', c: '#ffc8dc' },   /* 4 · rosa           */
];
const C_TABLA = '#171d29', C_PIEDRA = '#2f3a4e', C_LINEA = '#212a3a';

/* ── LOS NUMEROS DEL CUERPO, DERIVADOS ────────────────────────────────────
   No se eligen sueltos: se elige CUANTO SE VE y CUANTO TARDA EN CRUZARSE, y
   de ahi salen los dos. Con 19 celdas de ancho en un marco de 412 px, una
   celda mide 21,7 px —o sea que la cabeza y la estela se distinguen sin
   agrandar nada— y a 5,4 celdas por segundo la ventana visible se cruza en
   3,5 s. Eso ademas fija el ritmo del pulgar: una curva se puede pedir cada
   185 ms, que es lo que tarda el cuerpo en cambiar de celda.               */
const VISTA = 19;
const VEL = 5.4;
const VIDAS = 3;

/* ── LOS CINCO MUNDOS ─────────────────────────────────────────────────────
   Lo que crece no es «la dificultad» como numero suelto: crecen el TABLERO,
   la CANTIDAD DE RIVALES y lo BIEN QUE JUEGAN. Y el tablero es el que mas
   pesa, porque con la vista fija en 19 celdas un tablero de 74 es un mapa
   que no entra en la pantalla y hay que acordarse de por donde se venia.
   `pat` es el dibujo de las rocas: no es decoracion, es lo que hace que dos
   mundos del mismo tamano se jueguen distinto.                             */
const MUNDOS = [
  { k: 'm1', nom: 'LLANO',  n: 44, pat: 'vacio',   riv: 1, per: 0.52, seg: 100 },
  { k: 'm2', nom: 'PILARES',n: 52, pat: 'pilares', riv: 2, per: 0.64, seg: 100 },
  { k: 'm3', nom: 'CRUCE',  n: 60, pat: 'cruz',    riv: 2, per: 0.74, seg: 105 },
  { k: 'm4', nom: 'ISLAS',  n: 66, pat: 'islas',   riv: 3, per: 0.84, seg: 110 },
  { k: 'm5', nom: 'ANILLO', n: 74, pat: 'anillo',  riv: 3, per: 0.93, seg: 115 },
];

/* ── EL OBJETIVO NO SE ESCRIBE: SE DERIVA DEL REPARTO ─────────────────────
   Estaba como una fraccion ABSOLUTA del tablero por mundo (0,40 a 0,55) y el
   juego era imposible, no dificil. Dos mediciones lo explican:

   · el tablero termina ocupado casi entero — 79,5 % de media sobre los 40
     niveles — y repartido entre TODOS los que juegan, asi que la parte pareja
     de uno es 0,795/nj: 39,8 % a dos, 26,5 % a tres y 19,9 % a cuatro;
   · y el `meta` viejo SUBIA justo donde entra el tercer rival, o sea que en el
     mundo 5 le pedia el 55 % a uno mientras los otros tres se repartian el 25.

   Y el modelo del reparto le gana al fisico, medido: prediciendo la tajada del
   bot con 0,795/nj el coeficiente de variacion es 0,278, y con el modelo de
   recorrido (VEL·seg/libres, o sea cuanto alcanza a encerrar uno solo) es
   0,312 — porque los rivales se comen lo que uno no agarra.

   El multiplicador es el ULTIMO valor con el que el auto-jugador honesto pasa
   los 40 de 40: 0,55 al entrar a un mundo y 0,72 al salir. Con 0,58 ya pierde
   el 5-2. O sea que este objetivo es el mas exigente que esta DEMOSTRADO que
   se puede cumplir, y no un numero elegido a ojo.                          */
const OCUPA = 0.795;
const META_A = 0.55, META_B = 0.72;
const NIV_MUNDO = 8;
const NIVELES = MUNDOS.length * NIV_MUNDO;

/* La semilla sale del par (mundo, nivel) y de nada mas.                    */
const semNivel = (m, n) => (m + 1) * 100003 + (n + 1) * 7919 + 13;

/* Dentro de un mundo tambien hay curva: ocho niveles con el mismo tablero y
   los mismos rivales son el mismo nivel ocho veces.                        */
function cfgNivel(m, n) {
  const M = MUNDOS[m], u = NIV_MUNDO > 1 ? n / (NIV_MUNDO - 1) : 0;
  const riv = M.riv + (n >= 5 && M.riv < 3 ? 1 : 0);
  return {
    mundo: m, nivel: n, pat: M.pat,
    n: Math.round(M.n + u * 8),
    riv,
    per: cl(M.per + u * 0.10, 0, 1),
    /* la parte pareja, por el multiplicador — nunca una fraccion escrita     */
    meta: OCUPA / (1 + riv) * (META_A + u * (META_B - META_A)),
    seg: M.seg,
    sem: semNivel(m, n),
  };
}

/* ══════════════════════ IDIOMAS ══════════════════════ */
const LANGS = {
  es: {
    sub: 'salí, rodeá y volvé · lo que quede adentro es tuyo',
    jugar: 'JUGAR', tuto: 'CÓMO SE JUEGA', niveles: 'NIVELES', ajustes: 'AJUSTES',
    volver: 'VOLVER', seguir: 'SEGUIR', reiniciar: 'REINICIAR', salir: 'SALIR AL MENÚ',
    /* el panel de fin pone REINTENTAR al lado, en fila: con la etiqueta larga
       el boton se parte en dos renglones mientras su vecino va en uno.     */
    menuCorto: 'MENÚ', reintentar: 'REINTENTAR', siguiente: 'SIGUIENTE',
    pausa: 'PAUSA', pausaSub: 'el terreno te espera',
    nivelesSub: 'tocá uno para jugarlo',
    gana: '¡CERCADO!', ganaSub: 'el terreno es tuyo',
    ganaPerf: '¡SIN UN RASGUÑO!', ganaPerfSub: 'no perdiste una sola vida',
    pierdeT: 'SE ACABÓ EL TIEMPO', pierdeTSub: 'te faltó terreno',
    pierdeV: 'SIN VIDAS', pierdeVSub: 'te cortaron {0} veces',
    datos: '{0}% de {1}% · {2} cortes', datos1: '{0}% de {1}% · 1 corte',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONIDOS', graficos: 'GRÁFICOS',
    idioma: 'IDIOMA', calN: ['BAJO', 'MEDIO', 'ALTO'],
    borrar: 'BORRAR EL PROGRESO', borrado: 'BORRADO',
    mundo: 'MUNDO {0}', nivel: 'NIVEL {0}-{1}', tiempo: 'TIEMPO', metaR: 'META {0}%',
    mundos: ['LLANO', 'PILARES', 'CRUCE', 'ISLAS', 'ANILLO'],
    avTierra: '¡TIERRA!', avCorte: '¡TE CORTARON!', avCasi: '¡FALTA POCO!',
    avSinVidas: 'SIN VIDAS',
    pie: 'sin un solo asset · todo dibujado por código', cargando: 'CARGANDO',
    tutTit: 'TUTORIAL',
    tut1: 'arrastrá el dedo · el cuerpo dobla al toque',
    tut2: 'salí de tu terreno · vas dejando estela',
    tut3: 'volvé a pisar lo tuyo · lo que rodeaste es tuyo',
    tut4: 'cuanto más grande la vuelta, más terreno',
    tut5: 'y ojo: si te pisan la estela, te cortan',
    tutGana: '¡ESO ES TODO!', tutGanaSub: 'ya sabés jugar',
    tutDatos: 'salir, rodear y volver · nada más', salt: 'SALTEAR',
  },
  en: {
    sub: 'go out, loop around and come back · what you enclose is yours',
    jugar: 'PLAY', tuto: 'HOW TO PLAY', niveles: 'LEVELS', ajustes: 'SETTINGS',
    volver: 'BACK', seguir: 'RESUME', reiniciar: 'RESTART', salir: 'BACK TO MENU',
    menuCorto: 'MENU', reintentar: 'RETRY', siguiente: 'NEXT',
    pausa: 'PAUSED', pausaSub: 'the land will wait',
    nivelesSub: 'tap one to play it',
    gana: 'CLAIMED!', ganaSub: 'the land is yours',
    ganaPerf: 'NOT A SCRATCH!', ganaPerfSub: 'you never lost a life',
    pierdeT: "TIME'S UP", pierdeTSub: 'you were short on land',
    pierdeV: 'OUT OF LIVES', pierdeVSub: 'they cut you {0} times',
    datos: '{0}% of {1}% · {2} cuts', datos1: '{0}% of {1}% · 1 cut',
    ajTit: 'SETTINGS', musica: 'MUSIC', efectos: 'SOUNDS', graficos: 'GRAPHICS',
    idioma: 'LANGUAGE', calN: ['LOW', 'MID', 'HIGH'],
    borrar: 'ERASE PROGRESS', borrado: 'ERASED',
    mundo: 'WORLD {0}', nivel: 'LEVEL {0}-{1}', tiempo: 'TIME', metaR: 'GOAL {0}%',
    mundos: ['PLAIN', 'PILLARS', 'CROSS', 'ISLES', 'RING'],
    avTierra: 'LAND!', avCorte: 'CUT!', avCasi: 'ALMOST!',
    avSinVidas: 'OUT OF LIVES',
    pie: 'not one asset · all drawn in code', cargando: 'LOADING',
    tutTit: 'TUTORIAL',
    tut1: 'drag your finger · the body turns as you go',
    tut2: 'leave your land · you trail behind you',
    tut3: 'step back on your own · what you looped is yours',
    tut4: 'the wider the loop, the more land',
    tut5: 'careful: step on your trail and they cut you',
    tutGana: "THAT'S ALL!", tutGanaSub: 'you know how to play',
    tutDatos: 'out, around and back · nothing else', salt: 'SKIP',
  },
  pt: {
    sub: 'saia, cerque e volte · o que ficar dentro é seu',
    jugar: 'JOGAR', tuto: 'COMO SE JOGA', niveles: 'NÍVEIS', ajustes: 'AJUSTES',
    volver: 'VOLTAR', seguir: 'CONTINUAR', reiniciar: 'REINICIAR', salir: 'SAIR AO MENU',
    menuCorto: 'MENU', reintentar: 'TENTAR DE NOVO', siguiente: 'PRÓXIMO',
    pausa: 'PAUSA', pausaSub: 'o terreno espera',
    nivelesSub: 'toque em um para jogar',
    gana: 'CERCADO!', ganaSub: 'o terreno é seu',
    ganaPerf: 'SEM UM ARRANHÃO!', ganaPerfSub: 'não perdeu nenhuma vida',
    pierdeT: 'ACABOU O TEMPO', pierdeTSub: 'faltou terreno',
    pierdeV: 'SEM VIDAS', pierdeVSub: 'te cortaram {0} vezes',
    datos: '{0}% de {1}% · {2} cortes', datos1: '{0}% de {1}% · 1 corte',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONS', graficos: 'GRÁFICOS',
    idioma: 'IDIOMA', calN: ['BAIXO', 'MÉDIO', 'ALTO'],
    borrar: 'APAGAR O PROGRESSO', borrado: 'APAGADO',
    mundo: 'MUNDO {0}', nivel: 'NÍVEL {0}-{1}', tiempo: 'TEMPO', metaR: 'META {0}%',
    mundos: ['PLANO', 'PILARES', 'CRUZ', 'ILHAS', 'ANEL'],
    avTierra: 'TERRA!', avCorte: 'TE CORTARAM!', avCasi: 'FALTA POUCO!',
    avSinVidas: 'SEM VIDAS',
    pie: 'sem um único asset · tudo desenhado em código', cargando: 'CARREGANDO',
    tutTit: 'TUTORIAL',
    tut1: 'arraste o dedo · o corpo vira na hora',
    tut2: 'saia do seu terreno · vai deixando rastro',
    tut3: 'volte a pisar no seu · o que cercou é seu',
    tut4: 'quanto maior a volta, mais terreno',
    tut5: 'cuidado: se pisarem seu rastro, te cortam',
    tutGana: 'É SÓ ISSO!', tutGanaSub: 'você já sabe jogar',
    tutDatos: 'sair, cercar e voltar · nada mais', salt: 'PULAR',
  },
};
let LANG = 'en';
/* `TX` Y NO `t`: una funcion global de una letra la pisa cualquier cosa que
   comparta la pagina, y cuando se pisa no falla el idioma — falla TODO.   */
function TX(k, ...a) {
  let s = (LANGS[LANG] && LANGS[LANG][k]) != null ? LANGS[LANG][k] : (LANGS.es[k] || k);
  for (let i = 0; i < a.length; i++) s = String(s).split('{' + i + '}').join(a[i]);
  return s;
}
/* El mundo tiene NOMBRE y no numero: cinco pestanas que digan «MUNDO n» son
   numeros al lado de una reja de numeros, y encima no entran en 412 px.   */
const nomMundo = m => (LANGS[LANG].mundos || LANGS.es.mundos)[m] || TX('mundo', m + 1);

/* ══════════════════════ EL GUARDADO ══════════════════════
   En una ventana privada `localStorage` TIRA: todo va envuelto.            */
const PROG = { lang: null, hechos: {}, vol: 0.45, fx: 0.8, cal: 1, visto: 0, ult: 0 };
function cargaProg() {
  try {
    const s = localStorage.getItem('cerco');
    if (!s) return false;
    const o = JSON.parse(s);
    if (o && typeof o === 'object') Object.assign(PROG, o);
    /* EL TUTORIAL SE VE CADA VEZ QUE SE ABRE EL JUEGO: la marca se pone en
       cero DESPUES de leer el disco, asi que sigue valiendo dentro de la
       sesion —hecho una vez, no vuelve a salir entre nivel y nivel— y es el
       unico dato del guardado que se descarta a proposito.                */
    PROG.visto = 0;
    if (PROG.lang) LANG = PROG.lang;
    return !!PROG.lang;
  } catch (e) { return false; }
}
function guardaProg() { try { PROG.lang = LANG; localStorage.setItem('cerco', JSON.stringify(PROG)); } catch (e) {} }
function borraProg() {
  PROG.hechos = {}; PROG.visto = 0; PROG.ult = 0;
  try { localStorage.removeItem('cerco'); } catch (e) {}
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
