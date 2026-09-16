
/* ══════════════════════════════════════════════════════════════════════════
   B · CONSTANTES, BLOQUES, IDIOMAS Y GUARDADO
   ══════════════════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const mez = (a, b, k) => a + (b - a) * k;

/* AZAR CON SEMILLA. Un duelo tiene que ser EL MISMO duelo en cualquier aparato
   y en cualquier intento: si el terreno cambiara al reintentar, lo que uno
   aprendio del tiro anterior no valdria nada — y este juego entero consiste en
   corregir el tiro anterior.                                                */
function azar(s) {
  let x = (s | 0) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x |= 0; return (x >>> 0) / 4294967296; };
}

/* ── LOS BLOQUES ──────────────────────────────────────────────────────────
   `para` = la flecha se clava y explota.  `rompe` = el crater se lo lleva.
   El METAL es la excepcion que hace que la distincion exista: para la flecha
   y NO se rompe, asi que una viga de metal es una cobertura que no se puede
   demoler a tiros — que es la unica forma de que un obstaculo siga siendo un
   obstaculo despues del tercer disparo.                                     */
const VACIO = 0, TIERRA = 1, PASTO = 2, PIEDRA = 3, LADRILLO = 4,
      MADERA = 5, METAL = 6, ARENA = 7, HOJA = 8, NIEVE = 9;

const BLOQ = {
  [TIERRA]:   { col: 0x8a6647, top: 0x9a7452, para: 1, rompe: 1 },
  [PASTO]:    { col: 0x8a6647, top: 0x79ae57, para: 1, rompe: 1 },
  [PIEDRA]:   { col: 0x8e9aa2, top: 0xa1adb4, para: 1, rompe: 1 },
  [LADRILLO]: { col: 0xc4705c, top: 0xd08268, para: 1, rompe: 1 },
  [MADERA]:   { col: 0xb08a54, top: 0xc09b66, para: 1, rompe: 1 },
  [METAL]:    { col: 0x7e8f9c, top: 0x8ea0ad, para: 1, rompe: 0 },
  [ARENA]:    { col: 0xd6bd85, top: 0xe4cf9c, para: 1, rompe: 1 },
  [HOJA]:     { col: 0x5f9448, top: 0x6ea855, para: 1, rompe: 1, hoja: 1 },
  [NIEVE]:    { col: 0xa8b6be, top: 0xe8f0f4, para: 1, rompe: 1 },
};
const esParaT = t => t !== VACIO;
const esRompeT = t => t !== VACIO && BLOQ[t].rompe === 1;

/* ── EL MUNDO ─────────────────────────────────────────────────────────────
   NX FIJO EN LOS DOCE DUELOS, y no es pereza: el mapeo entre lo que arrastra
   el dedo y la velocidad de la flecha sale del tamanio de una celda en
   pixeles. Con un ancho por duelo, la fuerza que uno aprendio en el duelo 3
   mentiria en el 4. Lo que cambia entre duelos es el TERRENO, el viento y el
   rival.
   Y TODO LO DEL TERRENO SE DERIVA DE XA, XB Y XM: escrito a mano —la torre en
   la columna 6, la viga de la 5 a la 9— agrandar el mapa deja los obstaculos
   apilados contra el arquero de la izquierda y el duelo se rompe sin que nada
   falle.                                                                    */
const NX = 18, NY = 32, NZ = 5;
const ZC = 2;              /* el plano por el que vuela la flecha: el del medio */
const XA = 2, XB = 15;     /* las dos columnas de los arqueros — 13 celdas      */
const XM = Math.round((XA + XB) / 2);   /* el medio de la arena, para el terreno */

/* EL MAPA CRECIO Y EL ARQUERO NO SE ACHICO, y eso SOLO SE PUEDE con una
   camara que se mueva. En un marco 9:16 el ancho manda: mostrar trece celdas
   de separacion con un encuadre fijo dejaria al arquero en 53 px SIEMPRE.
   Con la camara en reposo abierta y CERRANDOSE sobre la flecha en vuelo, lo
   unico que se achica es el plano de espera —el cuerpo baja de 62 a 53 px— y
   lo que se AGRANDA es lo que antes no se veia: en vuelo mide 73 px y la
   flecha 39 contra 33. Es lo que hace Bowmasters.                          */

/* ── LA BALISTICA ─────────────────────────────────────────────────────────
   LOS NUMEROS NO SE ELIGEN, SE DERIVAN. Se decide que el tiro de 45 grados a
   fondo llegue COMODAMENTE mas lejos que la separacion —si no, no habria nada
   que elegir: siempre a fondo— y de ahi sale todo:
     alcance a 45 = v^2/g = 900/26 = 34,6 celdas contra 11 de separacion,
     o sea que el tiro justo pide v = raiz(g*d) = 16,9, el 56 % de la barra.
   Con la barra saturada mucho antes del tope, la mitad de arriba sirve para
   los tiros tensos y la de abajo para las parabolas altas: hay DOS soluciones
   para casi cualquier blanco y elegir entre ellas es el juego.              */
const G = 26;              /* celdas/s^2 */
const V_MAX = 30;          /* celdas/s   */
const PASO_F = 1 / 240;    /* la flecha se integra fino: a 30 celdas/s un paso
                              de 1/60 son media celda y una viga de una celda
                              se atraviesa sin tocarla */
const ARR_MAX_PX = 0.42;   /* fraccion del ancho del marco que satura la fuerza */

const VIDA_MAX = 100;
const DANO_CUERPO = 30, DANO_CABEZA = 55, V_REF = 22;
const CRATER_R = 1.45;     /* lo que se lleva el impacto */
const PROTEGE_R = 1;       /* columnas de meseta que no se rompen: sin esto,
                              dos tiros cortos le vuelan el piso al rival y se
                              cae — perder por el suelo no es perder un duelo.
                              Y protege SOLO la tapa (`y >= piso-1`): mas abajo
                              el crater sigue comiendo, asi que la meseta se
                              queda flotando y eso se ve — que es justamente lo
                              que uno quiere ver despues de cuatro tiros.    */

const DUELOS = 12;

/* LAS TRES CALIDADES CAMBIAN LO QUE CUESTA, NO LO QUE EL JUEGO ES. En un
   lienzo 2D lo unico que siempre se paga es RELLENAR PIXELES, asi que la
   palanca de verdad es `px` —cuantos pixeles de verdad tiene el lienzo— y
   no una lista de efectos que apagar. `det` es cuanta marca de textura, de
   brizna y de particula se dibuja: es lo unico que se puede sacar sin que
   el mundo cambie de forma.                                              */
const CALIDADES = {
  baja:  { px: 1.0, det: 0 },
  media: { px: 1.4, det: 1 },
  alta:  { px: 2.0, det: 2 },
};

/* ══════════════════════ IDIOMAS ══════════════════════ */
const LANGS = {
  es: {
    sub: 'dos arqueros · un viento · un dedo',
    jugar: 'JUGAR', tuto: 'CÓMO SE JUEGA', duelos: 'DUELOS', ajustes: 'AJUSTES',
    volver: 'VOLVER', seguir: 'SEGUIR', reiniciar: 'REINICIAR', salir: 'SALIR AL MENÚ',
    siguiente: 'SIGUIENTE', pausa: 'PAUSA', pausaSub: 'el viento te espera',
    duelosSub: 'tocá uno para pelearlo',
    gana: '¡GANASTE!', ganaSub: 'el otro no se levanta',
    pierde: 'PERDISTE', pierdeSub: 'te dieron primero',
    datos: '{0} flechas · {1} al blanco',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONIDOS', idioma: 'IDIOMA',
    calidad: 'GRÁFICOS', borrar: 'BORRAR EL PROGRESO', borrado: 'BORRADO',
    calB: 'BAJOS', calM: 'MEDIOS', calA: 'ALTOS',
    duelo: 'DUELO {0}', de: '{0} de {1} ganados',
    vos: 'VOS', viento: 'VIENTO', calma: 'CALMA',
    tuTurno: 'TU TURNO', suTurno: 'TIRA {0}',
    pistaTira: 'arrastrá para atrás y soltá',
    pistaRival: 'tira el rival…',
    pistaFuerza: 'cuanto más lejos tirás del dedo, más fuerte',
    falla: 'AFUERA', cabezazo: '¡EN LA CABEZA!',
    pie: 'sin un solo asset · todo dibujado por código', cargando: 'CARGANDO',
    tutTit: 'TUTORIAL',
    tut1: 'arrastrá para atrás como si tensaras el arco',
    tut2: 'más largo el arrastre, más fuerte el tiro',
    tut3: 'soltá y mirá dónde cae',
    tut4: 'el viento la empuja · corregí y dale de nuevo',
    tutGana: '¡ESO ES TODO!', tutGanaSub: 'ya sabés tirar',
    tutDatos: 'arrastrar, soltar, corregir · nada más',
  },
  en: {
    sub: 'two archers · one wind · one finger',
    jugar: 'PLAY', tuto: 'HOW TO PLAY', duelos: 'DUELS', ajustes: 'SETTINGS',
    volver: 'BACK', seguir: 'RESUME', reiniciar: 'RESTART', salir: 'BACK TO MENU',
    siguiente: 'NEXT', pausa: 'PAUSED', pausaSub: 'the wind will wait',
    duelosSub: 'tap one to fight it',
    gana: 'YOU WIN!', ganaSub: 'the other one is down',
    pierde: 'YOU LOSE', pierdeSub: 'they got you first',
    datos: '{0} arrows · {1} on target',
    ajTit: 'SETTINGS', musica: 'MUSIC', efectos: 'SOUNDS', idioma: 'LANGUAGE',
    calidad: 'GRAPHICS', borrar: 'ERASE PROGRESS', borrado: 'ERASED',
    calB: 'LOW', calM: 'MEDIUM', calA: 'HIGH',
    duelo: 'DUEL {0}', de: '{0} of {1} won',
    vos: 'YOU', viento: 'WIND', calma: 'CALM',
    tuTurno: 'YOUR TURN', suTurno: '{0} SHOOTS',
    pistaTira: 'drag backwards and let go',
    pistaRival: 'rival is shooting…',
    pistaFuerza: 'the further you pull, the harder it flies',
    falla: 'MISS', cabezazo: 'HEADSHOT!',
    pie: 'not one asset · all drawn in code', cargando: 'LOADING',
    tutTit: 'TUTORIAL',
    tut1: 'drag backwards, like drawing a bowstring',
    tut2: 'the longer the drag, the harder the shot',
    tut3: 'let go and watch where it lands',
    tut4: 'the wind pushes it · correct and shoot again',
    tutGana: "THAT'S ALL!", tutGanaSub: 'you know how to shoot',
    tutDatos: 'drag, release, correct · nothing else',
  },
  pt: {
    sub: 'dois arqueiros · um vento · um dedo',
    jugar: 'JOGAR', tuto: 'COMO SE JOGA', duelos: 'DUELOS', ajustes: 'AJUSTES',
    volver: 'VOLTAR', seguir: 'CONTINUAR', reiniciar: 'REINICIAR', salir: 'SAIR AO MENU',
    siguiente: 'PRÓXIMO', pausa: 'PAUSA', pausaSub: 'o vento espera',
    duelosSub: 'toque em um para lutar',
    gana: 'VOCÊ VENCEU!', ganaSub: 'o outro não levanta',
    pierde: 'VOCÊ PERDEU', pierdeSub: 'acertaram você primeiro',
    datos: '{0} flechas · {1} no alvo',
    ajTit: 'AJUSTES', musica: 'MÚSICA', efectos: 'SONS', idioma: 'IDIOMA',
    calidad: 'GRÁFICOS', borrar: 'APAGAR O PROGRESSO', borrado: 'APAGADO',
    calB: 'BAIXOS', calM: 'MÉDIOS', calA: 'ALTOS',
    duelo: 'DUELO {0}', de: '{0} de {1} vencidos',
    vos: 'VOCÊ', viento: 'VENTO', calma: 'CALMA',
    tuTurno: 'SUA VEZ', suTurno: '{0} ATIRA',
    pistaTira: 'arraste para trás e solte',
    pistaRival: 'o rival vai atirar…',
    pistaFuerza: 'quanto mais puxa, mais forte o tiro',
    falla: 'ERROU', cabezazo: 'NA CABEÇA!',
    pie: 'sem um único asset · tudo desenhado em código', cargando: 'CARREGANDO',
    tutTit: 'TUTORIAL',
    tut1: 'arraste para trás como se tensasse o arco',
    tut2: 'quanto mais longo o arrasto, mais forte',
    tut3: 'solte e veja onde cai',
    tut4: 'o vento empurra · corrija e atire de novo',
    tutGana: 'É SÓ ISSO!', tutGanaSub: 'você já sabe atirar',
    tutDatos: 'arrastar, soltar, corrigir · nada mais',
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

/* ══════════════════════ EL GUARDADO ══════════════════════
   En una ventana privada `localStorage` TIRA: todo va envuelto.            */
const PROG = { lang: null, hechos: [], vol: 0.5, fx: 0.8, cal: 'media', visto: 0 };
function cargaProg() {
  try {
    const s = localStorage.getItem('arco');
    if (!s) return false;
    const o = JSON.parse(s);
    if (o && typeof o === 'object') Object.assign(PROG, o);
    /* EL TUTORIAL SE VE CADA VEZ QUE SE ABRE EL JUEGO, y por eso la marca
       NO SOBREVIVE A UNA RECARGA. Pedido textual: «cada vez que inicie en
       cada juego, siempre hay un tutorial». Se pone en cero DESPUES de leer
       el disco, asi que sigue valiendo DENTRO de la sesion —terminado una
       vez, no vuelve a dispararse entre partida y partida— y lo unico que
       se pierde es que un jugador viejo se lo saltee de entrada. Es el
       unico dato del guardado que se descarta a proposito: el resto
       —idioma, niveles, monedas, ajustes— sigue igual.                   */
    PROG.visto = 0;
    if (PROG.lang) LANG = PROG.lang;
    return !!PROG.lang;
  } catch (e) { return false; }
}
function guardaProg() { try { PROG.lang = LANG; localStorage.setItem('arco', JSON.stringify(PROG)); } catch (e) {} }
function borraProg() {
  PROG.hechos = []; PROG.visto = 0;
  try { localStorage.removeItem('arco'); } catch (e) {}
}
/* «el siguiente al ultimo ganado, mas uno de gracia»: con el siguiente y nada
   mas, un rival que a alguien no le sale le cierra el juego entero.        */
function abierto(n) {
  if (n === 0) return true;
  let m = -1;
  for (const h of PROG.hechos) if (h > m) m = h;
  return n <= m + 2;
}
