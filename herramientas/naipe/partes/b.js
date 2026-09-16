/* ============================================================
   b.js — constantes, tablas, idiomas, guardado y EL ESTADO.

   Va primero de todo lo que es JS porque aca se DECLARAN las
   cosas que el resto lee. Un `const` leido antes de su linea no
   devuelve undefined: TIRA, y se lleva el modulo entero. Ya paso
   nueve veces en este repo.
   ============================================================ */

/* El $ y el lienzo van guardados porque `b.js`+`c.js` se concatenan y se
   importan en node para auditar: ahi no hay document y una sola linea
   suelta tira el modulo entero antes de llegar a la primera tabla. */
const HAY_DOM = typeof document !== 'undefined';
const $ = s => HAY_DOM ? document.querySelector(s) : null;
const CV = $('#c'), CX = CV ? CV.getContext('2d') : null;

/* --- el marco --- */
const AN = 412, AL = 892;          // el juego se disena en estas unidades

/* --- la baraja --- */
/* 0 picas, 1 corazones, 2 diamantes, 3 treboles. El ORDEN importa: el rojo
   sale de `p===1||p===2` en un solo sitio y no de una segunda lista. */
const PALOS = ['picas','corazones','diamantes','treboles'];
const ROJO  = p => p === 1 || p === 2;
const RANGOS = [2,3,4,5,6,7,8,9,10,11,12,13,14];   // 11=J 12=Q 13=K 14=A
const R_TXT = {11:'J',12:'Q',13:'K',14:'A'};
const rtxt = r => R_TXT[r] || String(r);
/* LAS FICHAS DE UNA CARTA SALEN DE SU RANGO Y DE NINGUN OTRO SITIO: la
   figura vale 10 y el as 11. Escrito dos veces, el dia que se toque una el
   previo promete un puntaje que el juego no paga. */
function fichasDe(c){
  if (c.me === 'piedra') return 50;
  return c.r <= 10 ? c.r : (c.r === 14 ? 11 : 10);
}

/* --- las doce manos de poquer ---------------------------------------
   `f` y `m` son la base de nivel 1; `df`/`dm` es lo que agrega cada nivel.
   Una tabla y ninguna rama por mano. */
const MANOS = {
  alta:         {f:5,   m:1,  df:10, dm:1,  n:1},
  par:          {f:10,  m:2,  df:15, dm:1,  n:2},
  doblepar:     {f:20,  m:2,  df:20, dm:1,  n:4},
  trio:         {f:30,  m:3,  df:20, dm:2,  n:3},
  escalera:     {f:30,  m:4,  df:30, dm:3,  n:5},
  color:        {f:35,  m:4,  df:15, dm:2,  n:5},
  full:         {f:40,  m:4,  df:25, dm:2,  n:5},
  poker:        {f:60,  m:7,  df:30, dm:3,  n:4},
  escaleracolor:{f:100, m:8,  df:40, dm:4,  n:5},
  cincoiguales: {f:120, m:12, df:35, dm:3,  n:5},
  florimperial: {f:140, m:14, df:50, dm:4,  n:5},
  familiareal:  {f:160, m:16, df:40, dm:4,  n:5},
};
const MANOS_ORD = ['familiareal','florimperial','cincoiguales','escaleracolor','poker',
                   'full','color','escalera','trio','doblepar','par','alta'];

/* --- mejoras, ediciones y sellos --- */
const MEJORAS  = ['bonus','mult','comodin','cristal','acero','piedra','oro','suerte'];
const EDICIONES= ['foil','holo','poli'];
const SELLOS   = ['rojo','oro'];

/* --- ciegas ---------------------------------------------------------
   La tabla es la de verdad hasta el ante 8; de ahi en mas crece un 60%
   por ante, que es lo que hace que el sin fin no se estanque. */
const CIEGA_BASE = [300,800,2000,5000,11000,20000,35000,50000];
function baseAnte(a){
  if (a <= 8) return CIEGA_BASE[a-1];
  let v = CIEGA_BASE[7];
  for (let i = 9; i <= a; i++) v = Math.round(v * 1.6 / 100) * 100;
  return v;
}
const CIEGAS = [
  {id:'chica',  mult:1,   pago:3},
  {id:'grande', mult:1.5, pago:4},
  {id:'jefe',   mult:2,   pago:5},
];

/* --- los doce jefes --------------------------------------------------
   Cada uno es UN dato que el resto del juego consulta, nunca una rama
   suelta: `esc` escala el objetivo, `manos`/`desc` mueven el presupuesto,
   `muerto(c)` dice que carta no puntua y `regla` es la restriccion. */
const JEFES = {
  muro:     {esc:1.6},
  aguja:    {manos:-2},
  arco:     {manos:-1},
  agua:     {desc:-99},
  psiquico: {regla:'cinco'},
  ojo:      {regla:'norepite'},
  boca:     {regla:'unatipo'},
  ganso:    {muerto:c => c.p === 0},
  corazon:  {muerto:c => c.p === 1},
  ventana:  {muerto:c => c.p === 2},
  club:     {muerto:c => c.p === 3},
  pilar:    {muerto:c => c.r >= 11 && c.r <= 13},
};
const JEFES_ID = Object.keys(JEFES);

/* --- presupuesto de la ronda --- */
/* EL PRESUPUESTO DE LA RONDA NO SE COPIA DE BALATRO: SALE DE LO QUE
   ESTE MAZO DE COMODINES PUEDE PRODUCIR. Con 4 manos, 3 descartes y 8
   cartas —los numeros del original— el auto-jugador honesto ganaba
   0 de 120 y moria en el ante 3,16. Y NO ERA FALTA DE POTENCIA: medido
   con plata infinita, la mejor mano al morir en el ante 4 daba 32.542
   contra un objetivo de 10.000, o sea tres veces de sobra. Lo que
   faltaba era poder VOLVER A SACARLA: con cuatro manos, una ronda es
   una tirada de dados. El original se permite 4/3/8 porque tiene 150
   comodines y cartas de mejora que aflojan justo eso; aca hay 32.
   Medido, con el resto igual: 4/3/8 gana 0 · 5/4/9 gana 6 ·
   6/4/10 gana 25 de 120. */
const MANOS_BASE = 6, DESC_BASE = 4, MANO_TAM = 10;
const SEL_MAX = 5;
const INTERES_PASO = 5, INTERES_TOPE = 5;   // $1 cada $5, tope $5

/* ============================================================
   LOS COMODINES. El efecto es una funcion que recibe el contexto
   de puntuacion y lo MUTA; devuelve true si disparo, y eso es lo
   unico que el dibujo necesita para saber a cual iluminar.
   Con una tabla de datos y un switch en `puntua` habria dos
   listas que se pueden desincronizar.
   ============================================================ */
const COM = {
  comodin:   {rar:0, pre:4, f:C => { C.mult += 4; return true; }},
  bromista:  {rar:0, pre:4, f:C => C.tiene('par')      && (C.mult += 8, true)},
  chiflado:  {rar:0, pre:4, f:C => C.tiene('trio')     && (C.mult += 12, true)},
  loco:      {rar:0, pre:4, f:C => C.tiene('doblepar') && (C.mult += 10, true)},
  delirante: {rar:0, pre:4, f:C => C.tiene('escalera') && (C.mult += 12, true)},
  gracioso:  {rar:0, pre:4, f:C => C.tiene('color')    && (C.mult += 10, true)},
  astuto:    {rar:0, pre:3, f:C => C.tiene('par')      && (C.fichas += 50, true)},
  taimado:   {rar:0, pre:4, f:C => C.tiene('trio')     && (C.fichas += 100, true)},
  ladino:    {rar:0, pre:4, f:C => C.tiene('doblepar') && (C.fichas += 80, true)},
  ruin:      {rar:0, pre:4, f:C => C.tiene('escalera') && (C.fichas += 100, true)},
  manoso:    {rar:0, pre:4, f:C => C.tiene('color')    && (C.fichas += 80, true)},
  codicioso: {rar:0, pre:5, f:C => C.cta[2] > 0 && (C.mult += 3 * C.cta[2], true)},
  lujurioso: {rar:0, pre:5, f:C => C.cta[1] > 0 && (C.mult += 3 * C.cta[1], true)},
  iracundo:  {rar:0, pre:5, f:C => C.cta[0] > 0 && (C.mult += 3 * C.cta[0], true)},
  gloton:    {rar:0, pre:5, f:C => C.cta[3] > 0 && (C.mult += 3 * C.cta[3], true)},
  medio:     {rar:0, pre:5, f:C => C.jugadas.length <= 3 && (C.mult += 20, true)},
  estandarte:{rar:1, pre:5, f:C => C.descRest > 0 && (C.fichas += 30 * C.descRest, true)},
  cumbre:    {rar:1, pre:5, f:C => C.descRest === 0 && (C.mult += 15, true)},
  baron:     {rar:1, pre:8, f:C => { const k = C.enMano.filter(c => c.r === 13).length;
                                     if (!k) return false; C.mult *= Math.pow(1.5, k); return true; }},
  arquitecto:{rar:1, pre:7, f:C => { C.mult *= 1.5; return true; }},
  vela:      {rar:2, pre:10,f:C => { C.mult *= 3; return true; }},
  espejo:    {rar:2, pre:9, f:C => { C.mult *= 2; return true; }},
  malabarista:{rar:1,pre:4, f:() => false, mano:1},     // +1 al tamano de mano
  reloj:     {rar:1, pre:4, f:() => false, manos:1},    // +1 mano por ronda
  lupa:      {rar:1, pre:4, f:() => false, desc:1},     // +1 descarte
  cohete:    {rar:1, pre:6, f:() => false, renta:4},    // $4 al final de cada ronda

  /* --- LOS QUE CRECEN ---------------------------------------------
     SIN UNO SOLO DE ESTOS EL JUEGO NO SE PUEDE PASAR, y es aritmetica:
     las ciegas se MULTIPLICAN por dos y medio cada ante y un nivel de
     mano SUMA. Medido antes de agregarlos, con plata infinita y las
     cinco ranuras llenas el auto-jugador honesto se plantaba en el
     ante 3,78 y ganaba 0 de 120. El que crece es lo unico que le
     puede seguir el paso a una curva que se multiplica.

     SU ESTADO VIVE EN `JU.comX`, NO ADENTRO DE LA TABLA: la tabla es
     una constante compartida por todas las partidas y esto es de la
     partida. Y `f` solo LEE ese numero — quien lo mueve es `sube`,
     que corre una vez por mano DE VERDAD. Con el incremento adentro
     de `f`, la vista previa —que es la misma funcion con `sim`— lo
     haria avanzar cada vez que el jugador toca una carta. */
  bolanieve:{rar:0, pre:5,
    f:C => C.x.bolanieve > 0 && (C.mult += C.x.bolanieve, true),
    sube:(v, C) => C.figuras ? 0 : v + 2, proy:12},
  verde:    {rar:0, pre:5,
    f:C => C.x.verde > 0 && (C.mult += C.x.verde, true),
    sube:(v) => v + 1, baja:(v) => Math.max(0, v - 1), proy:9},
  corredor: {rar:1, pre:6,
    f:C => C.x.corredor > 0 && (C.fichas += C.x.corredor, true),
    sube:(v, C) => C.tipo.slice(0, 8) === 'escalera' ? v + 20 : v, proy:60},
  obelisco: {rar:2, pre:9,
    f:C => C.x.obelisco > 0 && (C.mult *= 1 + C.x.obelisco, true),
    sube:(v, C) => C.tipo === C.masJug ? 0 : v + 0.2, proy:0.8},
  constelacion:{rar:1, pre:7,
    f:C => C.x.constelacion > 0 && (C.mult *= 1 + C.x.constelacion, true),
    subeP:(v) => v + 0.1, proy:0.4},
  fogata:   {rar:2, pre:10,
    f:C => C.x.fogata > 0 && (C.mult *= 1 + C.x.fogata, true),
    subeJ:(v) => v + 0.25, proy:0.5},
};
const COM_ID = Object.keys(COM);
const COM_POR_RAR = [ COM_ID.filter(k => COM[k].rar === 0),
                      COM_ID.filter(k => COM[k].rar === 1),
                      COM_ID.filter(k => COM[k].rar === 2) ];
const COM_RANURAS = 5;

/* --- consumibles ----------------------------------------------------
   `sel` es cuantas cartas de la mano hay que tener elegidas para usarlo;
   0 quiere decir que no pide ninguna. */
const TAROT = {
  mago:     {sel:2, me:'suerte'},
  emperatriz:{sel:2, me:'mult'},
  ermitano: {sel:0, dinero:'doble'},
  enamorados:{sel:1, me:'comodin'},
  carro:    {sel:1, me:'acero'},
  justicia: {sel:1, me:'cristal'},
  torre:    {sel:1, me:'piedra'},
  diablo:   {sel:1, me:'oro'},
  fuerza:   {sel:1, me:'bonus'},
  estrella: {sel:3, palo:2},
  luna:     {sel:3, palo:3},
  sol:      {sel:3, palo:1},
  mundo:    {sel:3, palo:0},
  templanza:{sel:0, dinero:8},
};
const TAROT_ID = Object.keys(TAROT);
const PLANETA_ID = Object.keys(MANOS);   // uno por mano, sube su nivel
const CONS_RANURAS = 2;

/* --- la tienda --- */
/* TRES Y NO DOS: con dos ranuras y el 58% de probabilidad de comodin,
   una tienda ofrece 1,16 comodines, asi que la eleccion casi no existe.
   Medido solo: honesto 3,16 -> 3,41 de ante. */
const TIENDA_SLOTS = 3;
const REROLL_BASE = 5;
const PRECIO_TAROT = 3, PRECIO_PLANETA = 3;
const SOBRES = {
  arcano:  {pre:4, n:3, elige:1, tipo:'tarot'},
  celeste: {pre:4, n:3, elige:1, tipo:'planeta'},
  bufon:   {pre:4, n:2, elige:1, tipo:'comodin'},
  estandar:{pre:4, n:3, elige:1, tipo:'carta'},
};
const SOBRE_ID = Object.keys(SOBRES);

/* ============================================================
   IDIOMAS
   ============================================================ */
const LANG = {
 es:{
  idT:'Elegí tu idioma', jugar:'REPARTIR', tuto:'CÓMO SE JUEGA', idioma:'IDIOMA',
  sub:'Ocho antes. Una mano por vez.',
  pie:'poquer con comodines · todo adentro de un archivo',
  rec:'Mejor: ante {0}',
  paT:'EN PAUSA', sigue:'SEGUIR', menu:'AL MENÚ',
  muerto:'NO LLEGASTE', muertoS:'La ciega te ganó.',
  gana:'ANTE 8 LIMPIO', ganaS:'Y la mesa sigue abierta.',
  otra:'OTRA VEZ',
  fiD:'ante {0} · {1} manos jugadas · ${2} · mejor mano {3}',
  jugarM:'JUGAR', descartar:'DESCARTAR', ordenR:'RANGO', ordenP:'PALO',
  manos:'MANOS', desc:'DESC', dinero:'DINERO', ante:'ANTE', ronda:'RONDA',
  fichas:'FICHAS', mult:'MULT', objetivo:'OBJETIVO', pago:'PAGO',
  elegiCiega:'ELEGÍ', jugarCiega:'JUGAR', saltar:'SALTAR',
  tienda:'TIENDA', siguiente:'SIGUIENTE RONDA', rerollT:'OTRA VEZ ${0}',
  vender:'VENDER', usar:'USAR', elegiSobre:'ELEGÍ UNA', saltarSobre:'SALTAR',
  sinSitio:'NO HAY RANURA', sinPlata:'NO TE ALCANZA', elegiCartas:'ELEGÍ {0} CARTA(S)',
  ganaste:'¡GANASTE LA CIEGA!', interes:'interés', manosSobra:'manos de sobra',
  nivelSube:'NIVEL {0}',
  ciegas:{chica:'CIEGA CHICA', grande:'CIEGA GRANDE', jefe:'LA CIEGA JEFE'},
  manosN:{alta:'Carta alta',par:'Par',doblepar:'Doble par',trio:'Trío',escalera:'Escalera',
    color:'Color',full:'Full',poker:'Póker',escaleracolor:'Escalera de color',
    cincoiguales:'Cinco iguales',florimperial:'Flor imperial',familiareal:'Familia real'},
  jefesN:{muro:'EL MURO',aguja:'LA AGUJA',arco:'EL ARCO',agua:'EL AGUA',psiquico:'EL PSÍQUICO',
    ojo:'EL OJO',boca:'LA BOCA',ganso:'EL GANSO',corazon:'EL CORAZÓN',ventana:'LA VENTANA',
    club:'EL CLUB',pilar:'EL PILAR'},
  jefesD:{muro:'objetivo mucho más alto',aguja:'una sola mano',arco:'una mano menos',
    agua:'sin descartes',psiquico:'hay que jugar cinco cartas',ojo:'no se repite tipo de mano',
    boca:'un solo tipo de mano',ganso:'las picas no puntúan',corazon:'los corazones no puntúan',
    ventana:'los diamantes no puntúan',club:'los tréboles no puntúan',
    pilar:'las figuras no puntúan'},
  comN:{comodin:'COMODÍN',bromista:'BROMISTA',chiflado:'CHIFLADO',loco:'LOCO',delirante:'DELIRANTE',
    gracioso:'GRACIOSO',astuto:'ASTUTO',taimado:'TAIMADO',ladino:'LADINO',ruin:'RUIN',manoso:'MAÑOSO',
    codicioso:'CODICIOSO',lujurioso:'LUJURIOSO',iracundo:'IRACUNDO',gloton:'GLOTÓN',medio:'MEDIO',
    estandarte:'ESTANDARTE',cumbre:'CUMBRE',baron:'BARÓN',arquitecto:'ARQUITECTO',vela:'LA VELA',
    espejo:'EL ESPEJO',malabarista:'MALABARISTA',reloj:'EL RELOJ',lupa:'LA LUPA',cohete:'EL COHETE'},
  comD:{comodin:'+4 mult',bromista:'+8 mult si hay par',chiflado:'+12 mult si hay trío',
    loco:'+10 mult si hay doble par',delirante:'+12 mult si hay escalera',
    gracioso:'+10 mult si hay color',astuto:'+50 fichas si hay par',
    taimado:'+100 fichas si hay trío',ladino:'+80 fichas si hay doble par',
    ruin:'+100 fichas si hay escalera',manoso:'+80 fichas si hay color',
    codicioso:'+3 mult por cada ♦ que puntúa',lujurioso:'+3 mult por cada ♥',
    iracundo:'+3 mult por cada ♠',gloton:'+3 mult por cada ♣',
    medio:'+20 mult si jugás 3 cartas o menos',estandarte:'+30 fichas por descarte que te sobre',
    cumbre:'+15 mult si no te queda ningún descarte',baron:'×1,5 mult por cada K en la mano',
    arquitecto:'×1,5 mult',vela:'×3 mult',espejo:'×2 mult',malabarista:'+1 carta en la mano',
    reloj:'+1 mano por ronda',lupa:'+1 descarte por ronda',cohete:'$4 al terminar la ronda'},
  tarN:{mago:'EL MAGO',emperatriz:'LA EMPERATRIZ',ermitano:'EL ERMITAÑO',enamorados:'LOS ENAMORADOS',
    carro:'EL CARRO',justicia:'LA JUSTICIA',torre:'LA TORRE',diablo:'EL DIABLO',fuerza:'LA FUERZA',
    estrella:'LA ESTRELLA',luna:'LA LUNA',sol:'EL SOL',mundo:'EL MUNDO',templanza:'LA TEMPLANZA'},
  tarD:{mago:'2 cartas pasan a SUERTE',emperatriz:'2 cartas pasan a MULT',
    ermitano:'te duplica el dinero (hasta $20)',enamorados:'1 carta pasa a COMODÍN',
    carro:'1 carta pasa a ACERO',justicia:'1 carta pasa a CRISTAL',torre:'1 carta pasa a PIEDRA',
    diablo:'1 carta pasa a ORO',fuerza:'1 carta pasa a BONUS',estrella:'3 cartas pasan a ♦',
    luna:'3 cartas pasan a ♣',sol:'3 cartas pasan a ♥',mundo:'3 cartas pasan a ♠',
    templanza:'te da $8'},
  mejN:{bonus:'BONUS',mult:'MULT',comodin:'COMODÍN',cristal:'CRISTAL',acero:'ACERO',
    piedra:'PIEDRA',oro:'ORO',suerte:'SUERTE'},
  edN:{foil:'LÁMINA',holo:'HOLO',poli:'POLI'},
  sobreN:{arcano:'SOBRE ARCANO',celeste:'SOBRE CELESTE',bufon:'SOBRE BUFÓN',estandar:'SOBRE ESTÁNDAR'},
  planeta:'PLANETA · {0}',
  tuto:['Elegí hasta 5 cartas y tocá JUGAR',
        'La mano vale FICHAS × MULT, y tiene que llegar al objetivo',
        'DESCARTAR cambia las que no te sirven',
        'Los comodines de arriba se suman a cada mano',
        'Ganá la ciega, comprá en la tienda, y subí de ante'],
  tutoFin:'ESO ES TODO',
 },
 en:{
  idT:'Pick your language', jugar:'DEAL', tuto:'HOW TO PLAY', idioma:'LANGUAGE',
  sub:'Eight antes. One hand at a time.',
  pie:'poker with jokers · all inside one file',
  rec:'Best: ante {0}',
  paT:'PAUSED', sigue:'RESUME', menu:'MENU',
  muerto:'YOU FELL SHORT', muertoS:'The blind beat you.',
  gana:'ANTE 8 CLEARED', ganaS:'And the table stays open.',
  otra:'AGAIN',
  fiD:'ante {0} · {1} hands played · ${2} · best hand {3}',
  jugarM:'PLAY', descartar:'DISCARD', ordenR:'RANK', ordenP:'SUIT',
  manos:'HANDS', desc:'DISC', dinero:'MONEY', ante:'ANTE', ronda:'ROUND',
  fichas:'CHIPS', mult:'MULT', objetivo:'TARGET', pago:'REWARD',
  elegiCiega:'CHOOSE', jugarCiega:'PLAY', saltar:'SKIP',
  tienda:'SHOP', siguiente:'NEXT ROUND', rerollT:'REROLL ${0}',
  vender:'SELL', usar:'USE', elegiSobre:'PICK ONE', saltarSobre:'SKIP',
  sinSitio:'NO SLOT LEFT', sinPlata:'NOT ENOUGH', elegiCartas:'SELECT {0} CARD(S)',
  ganaste:'BLIND BEATEN!', interes:'interest', manosSobra:'hands left',
  nivelSube:'LEVEL {0}',
  ciegas:{chica:'SMALL BLIND', grande:'BIG BLIND', jefe:'BOSS BLIND'},
  manosN:{alta:'High card',par:'Pair',doblepar:'Two pair',trio:'Three of a kind',
    escalera:'Straight',color:'Flush',full:'Full house',poker:'Four of a kind',
    escaleracolor:'Straight flush',cincoiguales:'Five of a kind',florimperial:'Flush five',
    familiareal:'Flush house'},
  jefesN:{muro:'THE WALL',aguja:'THE NEEDLE',arco:'THE ARC',agua:'THE WATER',psiquico:'THE PSYCHIC',
    ojo:'THE EYE',boca:'THE MOUTH',ganso:'THE GOOSE',corazon:'THE HEART',ventana:'THE WINDOW',
    club:'THE CLUB',pilar:'THE PILLAR'},
  jefesD:{muro:'much higher target',aguja:'only one hand',arco:'one hand less',
    agua:'no discards',psiquico:'you must play five cards',ojo:'no repeating hand types',
    boca:'only one hand type',ganso:'spades do not score',corazon:'hearts do not score',
    ventana:'diamonds do not score',club:'clubs do not score',pilar:'face cards do not score'},
  comN:{comodin:'JOKER',bromista:'JOLLY',chiflado:'ZANY',loco:'MAD',delirante:'CRAZY',
    gracioso:'DROLL',astuto:'SLY',taimado:'WILY',ladino:'CLEVER',ruin:'DEVIOUS',manoso:'CRAFTY',
    codicioso:'GREEDY',lujurioso:'LUSTY',iracundo:'WRATHFUL',gloton:'GLUTTONOUS',medio:'HALF',
    estandarte:'BANNER',cumbre:'SUMMIT',baron:'BARON',arquitecto:'ARCHITECT',vela:'THE CANDLE',
    espejo:'THE MIRROR',malabarista:'JUGGLER',reloj:'THE CLOCK',lupa:'THE LENS',cohete:'THE ROCKET'},
  comD:{comodin:'+4 mult',bromista:'+8 mult if hand has a pair',chiflado:'+12 mult if three of a kind',
    loco:'+10 mult if two pair',delirante:'+12 mult if straight',gracioso:'+10 mult if flush',
    astuto:'+50 chips if pair',taimado:'+100 chips if three of a kind',ladino:'+80 chips if two pair',
    ruin:'+100 chips if straight',manoso:'+80 chips if flush',
    codicioso:'+3 mult per scoring ♦',lujurioso:'+3 mult per ♥',iracundo:'+3 mult per ♠',
    gloton:'+3 mult per ♣',medio:'+20 mult if you play 3 cards or less',
    estandarte:'+30 chips per discard left',cumbre:'+15 mult if no discards left',
    baron:'×1.5 mult per King held in hand',arquitecto:'×1.5 mult',vela:'×3 mult',espejo:'×2 mult',
    malabarista:'+1 card in hand',reloj:'+1 hand per round',lupa:'+1 discard per round',
    cohete:'$4 at the end of the round'},
  tarN:{mago:'THE MAGICIAN',emperatriz:'THE EMPRESS',ermitano:'THE HERMIT',
    enamorados:'THE LOVERS',carro:'THE CHARIOT',justicia:'JUSTICE',torre:'THE TOWER',
    diablo:'THE DEVIL',fuerza:'STRENGTH',estrella:'THE STAR',luna:'THE MOON',sol:'THE SUN',
    mundo:'THE WORLD',templanza:'TEMPERANCE'},
  tarD:{mago:'2 cards become LUCKY',emperatriz:'2 cards become MULT',
    ermitano:'doubles your money (up to $20)',enamorados:'1 card becomes WILD',
    carro:'1 card becomes STEEL',justicia:'1 card becomes GLASS',torre:'1 card becomes STONE',
    diablo:'1 card becomes GOLD',fuerza:'1 card becomes BONUS',estrella:'3 cards become ♦',
    luna:'3 cards become ♣',sol:'3 cards become ♥',mundo:'3 cards become ♠',
    templanza:'gives you $8'},
  mejN:{bonus:'BONUS',mult:'MULT',comodin:'WILD',cristal:'GLASS',acero:'STEEL',
    piedra:'STONE',oro:'GOLD',suerte:'LUCKY'},
  edN:{foil:'FOIL',holo:'HOLO',poli:'POLY'},
  sobreN:{arcano:'ARCANA PACK',celeste:'CELESTIAL PACK',bufon:'BUFFOON PACK',estandar:'STANDARD PACK'},
  planeta:'PLANET · {0}',
  tuto:['Pick up to 5 cards and tap PLAY',
        'A hand scores CHIPS × MULT, and has to reach the target',
        'DISCARD swaps the cards you do not want',
        'The jokers up top add to every hand',
        'Beat the blind, buy in the shop, and climb the antes'],
  tutoFin:'THAT IS ALL',
 },
 pt:{
  idT:'Escolha seu idioma', jugar:'DISTRIBUIR', tuto:'COMO JOGAR', idioma:'IDIOMA',
  sub:'Oito antes. Uma mão por vez.',
  pie:'pôquer com coringas · tudo dentro de um arquivo',
  rec:'Melhor: ante {0}',
  paT:'PAUSADO', sigue:'CONTINUAR', menu:'MENU',
  muerto:'NÃO CHEGOU', muertoS:'O blind te venceu.',
  gana:'ANTE 8 LIMPO', ganaS:'E a mesa continua aberta.',
  otra:'DE NOVO',
  fiD:'ante {0} · {1} mãos jogadas · ${2} · melhor mão {3}',
  jugarM:'JOGAR', descartar:'DESCARTAR', ordenR:'VALOR', ordenP:'NAIPE',
  manos:'MÃOS', desc:'DESC', dinero:'DINHEIRO', ante:'ANTE', ronda:'RODADA',
  fichas:'FICHAS', mult:'MULT', objetivo:'OBJETIVO', pago:'PRÊMIO',
  elegiCiega:'ESCOLHA', jugarCiega:'JOGAR', saltar:'PULAR',
  tienda:'LOJA', siguiente:'PRÓXIMA RODADA', rerollT:'DE NOVO ${0}',
  vender:'VENDER', usar:'USAR', elegiSobre:'ESCOLHA UMA', saltarSobre:'PULAR',
  sinSitio:'SEM ESPAÇO', sinPlata:'NÃO DÁ', elegiCartas:'ESCOLHA {0} CARTA(S)',
  ganaste:'BLIND VENCIDO!', interes:'juros', manosSobra:'mãos de sobra',
  nivelSube:'NÍVEL {0}',
  ciegas:{chica:'BLIND PEQUENO', grande:'BLIND GRANDE', jefe:'BLIND CHEFE'},
  manosN:{alta:'Carta alta',par:'Par',doblepar:'Dois pares',trio:'Trinca',escalera:'Sequência',
    color:'Flush',full:'Full house',poker:'Quadra',escaleracolor:'Straight flush',
    cincoiguales:'Cinco iguais',florimperial:'Flush five',familiareal:'Flush house'},
  jefesN:{muro:'O MURO',aguja:'A AGULHA',arco:'O ARCO',agua:'A ÁGUA',psiquico:'O PSÍQUICO',
    ojo:'O OLHO',boca:'A BOCA',ganso:'O GANSO',corazon:'O CORAÇÃO',ventana:'A JANELA',
    club:'O CLUBE',pilar:'O PILAR'},
  jefesD:{muro:'objetivo bem mais alto',aguja:'uma mão só',arco:'uma mão a menos',
    agua:'sem descartes',psiquico:'tem que jogar cinco cartas',ojo:'não repete tipo de mão',
    boca:'um tipo de mão só',ganso:'espadas não pontuam',corazon:'copas não pontuam',
    ventana:'ouros não pontuam',club:'paus não pontuam',pilar:'figuras não pontuam'},
  comN:{comodin:'CORINGA',bromista:'BRINCALHÃO',chiflado:'MALUCO',loco:'LOUCO',delirante:'DELIRANTE',
    gracioso:'ENGRAÇADO',astuto:'ASTUTO',taimado:'MANHOSO',ladino:'ESPERTO',ruin:'RUIM',manoso:'ARDILOSO',
    codicioso:'GANANCIOSO',lujurioso:'LUXURIOSO',iracundo:'IRACUNDO',gloton:'GLUTÃO',medio:'MEIO',
    estandarte:'ESTANDARTE',cumbre:'CUME',baron:'BARÃO',arquitecto:'ARQUITETO',vela:'A VELA',
    espejo:'O ESPELHO',malabarista:'MALABARISTA',reloj:'O RELÓGIO',lupa:'A LUPA',cohete:'O FOGUETE'},
  comD:{comodin:'+4 mult',bromista:'+8 mult se tiver par',chiflado:'+12 mult se tiver trinca',
    loco:'+10 mult se tiver dois pares',delirante:'+12 mult se tiver sequência',
    gracioso:'+10 mult se tiver flush',astuto:'+50 fichas se tiver par',
    taimado:'+100 fichas se tiver trinca',ladino:'+80 fichas se tiver dois pares',
    ruin:'+100 fichas se tiver sequência',manoso:'+80 fichas se tiver flush',
    codicioso:'+3 mult por cada ♦ que pontua',lujurioso:'+3 mult por cada ♥',
    iracundo:'+3 mult por cada ♠',gloton:'+3 mult por cada ♣',
    medio:'+20 mult se jogar 3 cartas ou menos',estandarte:'+30 fichas por descarte que sobrar',
    cumbre:'+15 mult se não sobrar descarte',baron:'×1,5 mult por cada K na mão',
    arquitecto:'×1,5 mult',vela:'×3 mult',espejo:'×2 mult',malabarista:'+1 carta na mão',
    reloj:'+1 mão por rodada',lupa:'+1 descarte por rodada',cohete:'$4 no fim da rodada'},
  tarN:{mago:'O MAGO',emperatriz:'A IMPERATRIZ',ermitano:'O EREMITA',enamorados:'OS AMANTES',
    carro:'O CARRO',justicia:'A JUSTIÇA',torre:'A TORRE',diablo:'O DIABO',fuerza:'A FORÇA',
    estrella:'A ESTRELA',luna:'A LUA',sol:'O SOL',mundo:'O MUNDO',templanza:'A TEMPERANÇA'},
  tarD:{mago:'2 cartas viram SORTE',emperatriz:'2 cartas viram MULT',
    ermitano:'dobra seu dinheiro (até $20)',enamorados:'1 carta vira CORINGA',
    carro:'1 carta vira AÇO',justicia:'1 carta vira VIDRO',torre:'1 carta vira PEDRA',
    diablo:'1 carta vira OURO',fuerza:'1 carta vira BÔNUS',estrella:'3 cartas viram ♦',
    luna:'3 cartas viram ♣',sol:'3 cartas viram ♥',mundo:'3 cartas viram ♠',
    templanza:'dá $8'},
  mejN:{bonus:'BÔNUS',mult:'MULT',comodin:'CORINGA',cristal:'VIDRO',acero:'AÇO',
    piedra:'PEDRA',oro:'OURO',suerte:'SORTE'},
  edN:{foil:'FOIL',holo:'HOLO',poli:'POLI'},
  sobreN:{arcano:'PACOTE ARCANO',celeste:'PACOTE CELESTE',bufon:'PACOTE BUFÃO',
    estandar:'PACOTE PADRÃO'},
  planeta:'PLANETA · {0}',
  tuto:['Escolha até 5 cartas e toque JOGAR',
        'A mão vale FICHAS × MULT, e tem que chegar ao objetivo',
        'DESCARTAR troca as que não servem',
        'Os coringas de cima somam em cada mão',
        'Vença o blind, compre na loja, e suba de ante'],
  tutoFin:'É SÓ ISSO',
 },
};
let IDIOMA = 'en';
function T(k, ...a){
  let s = (LANG[IDIOMA] && LANG[IDIOMA][k]) !== undefined ? LANG[IDIOMA][k] : LANG.es[k];
  if (s === undefined) s = k;
  if (typeof s !== 'string') return s;
  a.forEach((v,i)=>{ s = s.split('{'+i+'}').join(v); });
  return s;
}
/* UN SOLO ACCESO POR TABLA. Con `LANG[IDIOMA].comN[id] || id` repetido en cada
   sitio que dibuja, el dia que falte una clave en un idioma cada sitio cae de
   una forma distinta. */
const tt = (tab, id) => ((LANG[IDIOMA] && LANG[IDIOMA][tab] && LANG[IDIOMA][tab][id])
                      || (LANG.es[tab] && LANG.es[tab][id]) || id);

/* ---------- guardado ---------- */
const GUARDA = {rec:0, visto:0, idioma:''};
function guardaLee(){
  try{
    const s = localStorage.getItem('naipe_v1');
    if (s) Object.assign(GUARDA, JSON.parse(s));
  }catch(e){}
  /* el tutorial se ve cada vez que se abre el juego: es el unico dato del
     guardado que se descarta a proposito, igual que en ARCO, MEKO y DUNA. */
  GUARDA.visto = 0;
}
function guardaEscribe(){
  if (DEMO) return;
  try{ localStorage.setItem('naipe_v1', JSON.stringify(GUARDA)); }catch(e){}
}

/* ============================================================
   EL ESTADO. Todo lo mutable vive aca y se declara antes de que
   nadie lo lea.
   ============================================================ */
let DEMO = false;
const JU = {
  modo:'menu',        // menu | ciega | juega | puntua | tienda | sobre | pausa | fin
  t:0,
  ante:1, ronda:1, ciegaIx:0, jefe:'',
  objetivo:0, puntaje:0, pago:0,
  manos:0, desc:0, dinero:4,
  mazo:[], pila:[], mano:[], jugadas:[], descartadas:[],
  sel:[],                 // indices elegidos de la mano
  com:[], cons:[],        // comodines y consumibles en juego
  comX:{},                // lo que cada comodin que crece lleva juntado
  niv:{},                 // nivel de cada mano de poquer
  vistas:{},              // cuantas veces se jugo cada mano en la corrida
  jugadasRonda:[],        // tipos de mano jugados en esta ciega (para EL OJO / LA BOCA)
  tienda:null, sobre:null,
  ultima:null,            // el resultado de la ultima puntuacion
  anim:null,              // la animacion de puntuar
  totManos:0, mejorMano:0,
  consUsado:-1,
  rng:null,
};
