/* LOS IDIOMAS.
   ---------------------------------------------------------------------------
   El juego nació escrito en español y adentro del código sigue estándolo: los
   comentarios, los nombres de variables y las claves de acá abajo. Lo que se
   traduce es lo ÚNICO que ve el jugador.

   Por defecto arranca en INGLÉS —es un juego de Roblox y ahí el idioma es el
   inglés—, y se puede cambiar desde el menú. La elección queda guardada en
   `localStorage`, así que el que ya eligió no tiene que volver a elegir.

   Las entradas que arman una frase con un dato adentro son FUNCIONES, no
   plantillas con `%s`: el orden de las palabras cambia de un idioma a otro y
   una función deja poner el dato donde corresponda en cada uno.

   Una clave que falte en un idioma cae al inglés, y si tampoco está ahí
   devuelve la clave: un texto raro en pantalla es molesto, una pantalla en
   blanco o un `undefined` es un error. */

const EN = {
    // ---- menú y pantallas ----
    play: 'PLAY',
    graphics: 'GRAPHICS',
    language: 'LANGUAGE',
    low: 'Low', medium: 'Medium', high: 'High', ultra: 'Ultra',
    loading: 'LOADING…',
    loadingMb: (a, b) => `LOADING ${a} / ${b} MB`,
    ready: 'READY',
    slowNet: 'SLOW CONNECTION — GOING IN ANYWAY',
    missing: n => n + ' FILES FAILED — PLAYING ANYWAY',
    close: 'CLOSE',
    resolution: p => 'resolution ×' + p,
    hint: 'three cubes on their tile · the cutters on the rope · the key in a ' +
          'cabinet · <b>HE</b> carries the card · the door<br>' +
          '<b>keep low, or he comes</b>',
    won: 'YOU ESCAPED THE HOUSE',
    level: 'The house',

    // ---- botones táctiles ----
    btnUse: 'USE', btnCrouch: 'CROUCH', btnRun: 'RUN',
    btnBoost: 'BOOST', btnSlide: 'SLIDE',

    // ---- la bolsa ----
    bagPliers: 'cutters', bagKey: 'key', bagCard: 'card',

    // ---- estado del jugador ----
    sliding: 'sliding', crouching: 'crouching',
    running: 'running', runningAuto: 'running · auto',
    clickPrompt: 'Click to look around',

    // ---- la misión ----
    taskEscaped: 'YOU ESCAPED',
    taskCubes: n => 'push the cubes onto their tile: ' + n + '/3',
    taskPliers: 'the cutters, in the ceiling hatch',
    taskKey: 'the key is in some cabinet — search them',
    taskCut: 'cut the wiring by the door',
    taskCard: 'HE has the card — from behind',
    taskDoor: 'to the door',

    // ---- lo que tenés delante ----
    focusPlace: 'LEAVE IT ON THE TILE',
    focusDrop: 'DROP THE CUBE',
    focusPush: c => 'PUSH THE ' + c.toUpperCase() + ' CUBE',
    focusGrabPliers: 'TAKE THE CUTTERS',
    focusPullRope: 'PULL THE ROPE',
    focusTakeCard: 'TAKE HIS CARD',
    focusWatching: 'HE IS LOOKING AT YOU',
    focusSearch: m => 'SEARCH THE ' + m.toUpperCase(),
    focusCut: 'CUT THE WIRING',
    focusNeedPliers: 'YOU NEED THE CUTTERS',
    focusNeedCard: 'THE CARD IS MISSING — HE HAS IT',
    focusNeedKey: 'THE KEY IS MISSING',
    focusOpen: 'OPEN THE DOOR',

    // ---- los avisos ----
    sayPushing: c => 'pushing the ' + c + ' cube — one at a time',
    sayAllPlaced: 'all three placed — the ceiling hatch opened',
    sayProgress: n => n + ' of 3',
    sayPliersFell: 'the cutters dropped',
    sayPliers: 'cutters',
    sayKey: 'the key!',
    sayNothing: 'nothing here',
    sayCut: 'wiring cut — still need the card and the key',
    sayCard: 'the card!',
    sayCaught: 'he got you',

    // ---- nombres ----
    rojo: 'red', amarillo: 'yellow', azul: 'blue',
    armario: 'wardrobe', comoda: 'dresser',
    estanteria: 'bookcase', vitrina: 'cabinet',
};

const ES = {
    play: 'JUGAR',
    graphics: 'GRÁFICOS',
    language: 'IDIOMA',
    low: 'Bajo', medium: 'Medio', high: 'Alto', ultra: 'Ultra',
    loading: 'CARGANDO…',
    loadingMb: (a, b) => `CARGANDO ${a} / ${b} MB`,
    ready: 'LISTO',
    slowNet: 'LA RED VA LENTA — SE ENTRA IGUAL',
    missing: n => 'FALTARON ' + n + ' ARCHIVOS — SE JUEGA IGUAL',
    close: 'CERRAR',
    resolution: p => 'resolución ×' + p,
    hint: 'tres cubos a su baldosa · la pinza de la soga · la llave en un ' +
          'mueble · la tarjeta la lleva <b>ÉL</b> · la puerta<br>' +
          '<b>perfil bajo, o él viene</b>',
    won: 'ESCAPASTE DE LA CASA',
    level: 'La casa',

    btnUse: 'USAR', btnCrouch: 'AGACHARSE', btnRun: 'CARRERA',
    btnBoost: 'IMPULSO', btnSlide: 'DESLIZAR',

    bagPliers: 'pinza', bagKey: 'llave', bagCard: 'tarjeta',

    sliding: 'deslizando', crouching: 'agachado',
    running: 'corriendo', runningAuto: 'corriendo · automático',
    clickPrompt: 'Click para mirar alrededor',

    taskEscaped: 'ESCAPASTE',
    taskCubes: n => 'empujá los cubos a su baldosa: ' + n + '/3',
    taskPliers: 'la pinza, en la trampilla del techo',
    taskKey: 'la llave está en un mueble — revisalos',
    taskCut: 'cortá el cableado de la puerta',
    taskCard: 'la tarjeta la lleva ÉL — por atrás',
    taskDoor: 'a la puerta',

    focusPlace: 'DEJARLO EN LA BALDOSA',
    focusDrop: 'SOLTAR EL CUBO',
    focusPush: c => 'EMPUJAR EL CUBO ' + c.toUpperCase(),
    focusGrabPliers: 'AGARRAR LA PINZA',
    focusPullRope: 'TIRAR DE LA SOGA',
    focusTakeCard: 'SACARLE LA TARJETA',
    focusWatching: 'TE ESTÁ MIRANDO',
    focusSearch: m => 'REVISAR EL ' + m.toUpperCase(),
    focusCut: 'CORTAR EL CABLEADO',
    focusNeedPliers: 'HACE FALTA LA PINZA',
    focusNeedCard: 'FALTA LA TARJETA — LA TIENE ÉL',
    focusNeedKey: 'FALTA LA LLAVE',
    focusOpen: 'ABRIR LA PUERTA',

    sayPushing: c => 'empujando el cubo ' + c + ' — de a uno',
    sayAllPlaced: 'los tres puestos — se abrió la trampilla del techo',
    sayProgress: n => 'van ' + n + ' de 3',
    sayPliersFell: 'cayó la pinza',
    sayPliers: 'pinza',
    sayKey: '¡la llave!',
    sayNothing: 'nada acá',
    sayCut: 'cableado cortado — falta la tarjeta y la llave',
    sayCard: '¡la tarjeta!',
    sayCaught: 'te agarró',

    rojo: 'rojo', amarillo: 'amarillo', azul: 'azul',
    armario: 'armario', comoda: 'cómoda',
    estanteria: 'estantería', vitrina: 'vitrina',
};

const PT = {
    play: 'JOGAR',
    graphics: 'GRÁFICOS',
    language: 'IDIOMA',
    low: 'Baixo', medium: 'Médio', high: 'Alto', ultra: 'Ultra',
    loading: 'CARREGANDO…',
    loadingMb: (a, b) => `CARREGANDO ${a} / ${b} MB`,
    ready: 'PRONTO',
    slowNet: 'CONEXÃO LENTA — ENTRANDO MESMO ASSIM',
    missing: n => 'FALTARAM ' + n + ' ARQUIVOS — DÁ PRA JOGAR',
    close: 'FECHAR',
    resolution: p => 'resolução ×' + p,
    hint: 'três cubos no seu ladrilho · o alicate na corda · a chave num ' +
          'móvel · <b>ELE</b> carrega o cartão · a porta<br>' +
          '<b>fique abaixado, ou ele vem</b>',
    won: 'VOCÊ ESCAPOU DA CASA',
    level: 'A casa',

    btnUse: 'USAR', btnCrouch: 'AGACHAR', btnRun: 'CORRER',
    btnBoost: 'IMPULSO', btnSlide: 'DESLIZAR',

    bagPliers: 'alicate', bagKey: 'chave', bagCard: 'cartão',

    sliding: 'deslizando', crouching: 'agachado',
    running: 'correndo', runningAuto: 'correndo · automático',
    clickPrompt: 'Clique para olhar em volta',

    taskEscaped: 'VOCÊ ESCAPOU',
    taskCubes: n => 'empurre os cubos até seu ladrilho: ' + n + '/3',
    taskPliers: 'o alicate, no alçapão do teto',
    taskKey: 'a chave está em algum móvel — revise-os',
    taskCut: 'corte a fiação da porta',
    taskCard: 'o cartão está com ELE — por trás',
    taskDoor: 'até a porta',

    focusPlace: 'DEIXAR NO LADRILHO',
    focusDrop: 'SOLTAR O CUBO',
    focusPush: c => 'EMPURRAR O CUBO ' + c.toUpperCase(),
    focusGrabPliers: 'PEGAR O ALICATE',
    focusPullRope: 'PUXAR A CORDA',
    focusTakeCard: 'TIRAR O CARTÃO DELE',
    focusWatching: 'ELE ESTÁ OLHANDO PRA VOCÊ',
    focusSearch: m => 'REVISAR O ' + m.toUpperCase(),
    focusCut: 'CORTAR A FIAÇÃO',
    focusNeedPliers: 'PRECISA DO ALICATE',
    focusNeedCard: 'FALTA O CARTÃO — ESTÁ COM ELE',
    focusNeedKey: 'FALTA A CHAVE',
    focusOpen: 'ABRIR A PORTA',

    sayPushing: c => 'empurrando o cubo ' + c + ' — um de cada vez',
    sayAllPlaced: 'os três no lugar — o alçapão do teto abriu',
    sayProgress: n => n + ' de 3',
    sayPliersFell: 'o alicate caiu',
    sayPliers: 'alicate',
    sayKey: 'a chave!',
    sayNothing: 'nada aqui',
    sayCut: 'fiação cortada — faltam o cartão e a chave',
    sayCard: 'o cartão!',
    sayCaught: 'ele te pegou',

    rojo: 'vermelho', amarillo: 'amarelo', azul: 'azul',
    armario: 'guarda-roupa', comoda: 'cômoda',
    estanteria: 'estante', vitrina: 'cristaleira',
};

export const IDIOMAS = [
    { id: 'en', nombre: 'English', dic: EN },
    { id: 'es', nombre: 'Español', dic: ES },
    { id: 'pt', nombre: 'Português', dic: PT },
];

const LLAVE = 'locust.idioma';

/* El inglés es el que se ve si nadie eligió nada. Se lee de `localStorage`
   dentro de un try: en un iframe con las cookies bloqueadas, tocarlo TIRA, y
   un juego que no abre por no poder leer una preferencia es un juego roto. */
let actual = 'en';
try {
    const g = localStorage.getItem(LLAVE);
    if (g && IDIOMAS.some(i => i.id === g)) actual = g;
} catch (e) { /* sin memoria: arranca en inglés y listo */ }

const dic = id => (IDIOMAS.find(i => i.id === id) || IDIOMAS[0]).dic;

export const idiomaActual = () => actual;

/* Los que quieren enterarse de un cambio de idioma. Se avisa en vez de que
   cada uno pregunte todos los cuadros. */
const oyentes = [];
export const alCambiarIdioma = fn => { oyentes.push(fn); return fn };

export function setIdioma(id) {
    if (!IDIOMAS.some(i => i.id === id) || id === actual) return;
    actual = id;
    try { localStorage.setItem(LLAVE, id) } catch (e) { /* da igual */ }
    aplicarHTML();
    for (const fn of oyentes) fn(id);
}

/* La traducción. `t('play')` devuelve el texto; `t('taskCubes', 2)` llama a la
   entrada con el dato. Si falta en el idioma elegido cae al inglés. */
export function t(clave, ...args) {
    const d = dic(actual);
    let v = d[clave];
    if (v === undefined) v = EN[clave];
    if (v === undefined) return clave;
    return typeof v === 'function' ? v(...args) : v;
}

/* Pinta el HTML estático. Cada elemento con `data-i18n` recibe su texto, y con
   `data-i18n-html` su HTML —que hace falta para la línea del menú, que lleva
   un <b> adentro—. Se llama al arrancar y en cada cambio de idioma. */
export function aplicarHTML(raiz = document) {
    for (const el of raiz.querySelectorAll('[data-i18n]'))
        el.textContent = t(el.getAttribute('data-i18n'));
    for (const el of raiz.querySelectorAll('[data-i18n-html]'))
        el.innerHTML = t(el.getAttribute('data-i18n-html'));
}
