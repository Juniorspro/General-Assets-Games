/* ══════════════════════ LAS TABLAS ══════════════════════
   CUBOS es un build battle: te dicen QUE construir, tenes unos minutos y una
   parcela de 16 x 16 x 16, y al final alguien puntua lo que hiciste.

   Lo que hace que esto no sea «un editor de voxels» es la ultima parte: la
   puntuacion. Y por eso hay DOS jueces —el de codigo, que mide la obra, y el de
   verdad, que la MIRA— y la pantalla del final dice siempre cual de los dos
   puntuo. Un puntaje sin autor no significa nada. */

const N = 16;                    /* la parcela: 16 x 16 en planta */
const ALTO = 16;                 /* y 16 de alto */
const CELDAS = N*N*ALTO;

/* ══════════ EL RELOJ ══════════
   Dos minutos y medio es lo que tarda una idea simple en salir entera: menos y
   solo entran cubos, mas y el jugador se aburre antes de que se acabe. */
const RONDAS = 3;
const RELOJES = { corto: 100, normal: 160, largo: 240 };

/* ══════════ LOS BLOQUES ══════════
   `tex` es el nombre del dibujo, y cuando son tres es [arriba, costado, abajo]:
   el pasto es lo que hace que valga la pena que un bloque tenga tres caras.
   `luz` es cuanto emite por si mismo (0 a 1) y `vidrio` dice que no tape la
   cara del vecino — sin eso, dos vidrios pegados dibujan la cara del medio y se
   ve una linea gris adentro del cristal.

   ── LAS DIECISEIS LANAS Y LOS DIECISEIS HORMIGONES SALEN DE DOS FUNCIONES ──
   Y ese es el motivo de que la paleta tenga setenta y pico de bloques sin que
   el archivo pese: el dibujo es uno y lo que cambia es el tinte. En un build
   battle la paleta de color ES la herramienta principal — sin dieciseis lanas
   no se puede hacer una bandera, ni un logo, ni un cielo de atardecer. */
const COLORES = [
  ['blanco',   0xe9ecec, 'white',      'branco'],
  ['naranja',  0xf07613, 'orange',     'laranja'],
  ['magenta',  0xbd44b3, 'magenta',    'magenta'],
  ['celeste',  0x3aafd9, 'light blue', 'azul claro'],
  ['amarillo', 0xf8c627, 'yellow',     'amarelo'],
  ['lima',     0x70b919, 'lime',       'lima'],
  ['rosa',     0xed8dac, 'pink',       'rosa'],
  ['gris',     0x3e4447, 'gray',       'cinza'],
  ['plata',    0x8e8e86, 'light gray', 'cinza claro'],
  ['cian',     0x158991, 'cyan',       'ciano'],
  ['violeta',  0x792ab3, 'purple',     'roxo'],
  ['azul',     0x35399d, 'blue',       'azul'],
  ['marron',   0x724728, 'brown',      'marrom'],
  ['verde',    0x546d1b, 'green',      'verde'],
  ['rojo',     0xa12722, 'red',        'vermelho'],
  ['negro',    0x141519, 'black',      'preto']
];

/* el 0 es aire y no esta en la tabla: `BLOQUES[0]` tiene que ser el aire para
   que el indice del array sea el valor guardado en la grilla */
const BLOQUES = [
  { id: 'aire', cat: null },
  /* ── natural ── */
  { id: 'pasto',    cat: 'nat', tex: ['pastoT', 'pastoL', 'tierra'] },
  { id: 'tierra',   cat: 'nat', tex: 'tierra' },
  { id: 'camino',   cat: 'nat', tex: ['caminoT', 'tierra', 'tierra'] },
  { id: 'arena',    cat: 'nat', tex: 'arena' },
  { id: 'grava',    cat: 'nat', tex: 'grava' },
  { id: 'nieve',    cat: 'nat', tex: 'nieve' },
  { id: 'hielo',    cat: 'nat', tex: 'hielo' },
  { id: 'hojas',    cat: 'nat', tex: 'hojas' },
  { id: 'hojasO',   cat: 'nat', tex: 'hojasO' },
  { id: 'cactus',   cat: 'nat', tex: ['cactusT', 'cactus', 'cactusT'] },
  { id: 'calabaza', cat: 'nat', tex: ['calabazaT', 'calabaza', 'calabazaT'] },
  { id: 'melon',    cat: 'nat', tex: ['melonT', 'melon', 'melonT'] },
  { id: 'hongo',    cat: 'nat', tex: 'hongo' },
  { id: 'musgo',    cat: 'nat', tex: 'musgo' },
  /* ── piedra ── */
  { id: 'piedra',   cat: 'pie', tex: 'piedra' },
  { id: 'adoquin',  cat: 'pie', tex: 'adoquin' },
  { id: 'ladriP',   cat: 'pie', tex: 'ladriP' },
  { id: 'ladriPM',  cat: 'pie', tex: 'ladriPM' },
  { id: 'ladrillo', cat: 'pie', tex: 'ladrillo' },
  { id: 'arenisca', cat: 'pie', tex: ['areniscaT', 'arenisca', 'areniscaT'] },
  { id: 'andesita', cat: 'pie', tex: 'andesita' },
  { id: 'diorita',  cat: 'pie', tex: 'diorita' },
  { id: 'granito',  cat: 'pie', tex: 'granito' },
  { id: 'pizarra',  cat: 'pie', tex: 'pizarra' },
  { id: 'obsidiana',cat: 'pie', tex: 'obsidiana' },
  { id: 'basalto',  cat: 'pie', tex: ['basaltoT', 'basalto', 'basaltoT'] },
  { id: 'cuarzo',   cat: 'pie', tex: 'cuarzo' },
  { id: 'terracota',cat: 'pie', tex: 'terracota' },
  { id: 'rojiza',   cat: 'pie', tex: 'rojiza' },
  { id: 'prismarina',cat:'pie', tex: 'prismarina' },
  /* ── madera ── */
  { id: 'troncoR',  cat: 'mad', tex: ['troncoT', 'troncoR', 'troncoT'] },
  { id: 'troncoO',  cat: 'mad', tex: ['troncoOT', 'troncoO', 'troncoOT'] },
  { id: 'troncoA',  cat: 'mad', tex: ['troncoAT', 'troncoA', 'troncoAT'] },
  { id: 'tablaR',   cat: 'mad', tex: 'tablaR' },
  { id: 'tablaO',   cat: 'mad', tex: 'tablaO' },
  { id: 'tablaA',   cat: 'mad', tex: 'tablaA' },
  { id: 'tablaN',   cat: 'mad', tex: 'tablaN' },
  { id: 'bambu',    cat: 'mad', tex: 'bambu' },
  /* ── metal y mineral ── */
  { id: 'hierro',   cat: 'met', tex: 'hierro' },
  { id: 'oro',      cat: 'met', tex: 'oro' },
  { id: 'diamante', cat: 'met', tex: 'diamante' },
  { id: 'esmeralda',cat: 'met', tex: 'esmeralda' },
  { id: 'lapis',    cat: 'met', tex: 'lapis' },
  { id: 'cobre',    cat: 'met', tex: 'cobre' },
  { id: 'carbon',   cat: 'met', tex: 'carbon' },
  { id: 'redstone', cat: 'met', tex: 'redstone' },
  /* ── luz y liquido ── */
  { id: 'luminosa', cat: 'luz', tex: 'luminosa', luz: 1.00 },
  { id: 'linterna', cat: 'luz', tex: 'linterna', luz: 0.85 },
  { id: 'lava',     cat: 'luz', tex: 'lava',     luz: 0.95 },
  { id: 'fuego',    cat: 'luz', tex: 'fuego',    luz: 0.90 },
  { id: 'agua',     cat: 'luz', tex: 'agua',     vidrio: 1 },
  { id: 'vidrio',   cat: 'luz', tex: 'vidrio',   vidrio: 1 },
  { id: 'farol',    cat: 'luz', tex: 'farol',    luz: 0.75 }
];
/* las treinta y dos de color se agregan aca: una sola vez, para que el orden y
   el nombre del bloque no puedan discrepar entre la paleta y la tabla */
for (const [c] of COLORES) BLOQUES.push({ id: 'lana_' + c, cat: 'lana', tex: 'lana_' + c });
for (const [c] of COLORES) BLOQUES.push({ id: 'horm_' + c, cat: 'horm', tex: 'horm_' + c });
for (const [c] of COLORES) BLOQUES.push({ id: 'vid_' + c,  cat: 'vidr', tex: 'vid_' + c, vidrio: 1 });
const NBLOQ = BLOQUES.length;

const CATS = ['nat', 'pie', 'mad', 'met', 'luz', 'lana', 'horm', 'vidr'];

/* ══════════ LOS TEMAS ══════════
   Lo que se pide construir. Todos tienen que entrar en 16 x 16 x 16 y salir en
   dos minutos y medio: «una ciudad» no es un tema, es una tarde. */
const TEMAS = [
  ['casa',      'Una casa',              'A house',            'Uma casa'],
  ['arbol',     'Un árbol',              'A tree',             'Uma árvore'],
  ['cohete',    'Un cohete',             'A rocket',           'Um foguete'],
  ['castillo',  'Un castillo',           'A castle',           'Um castelo'],
  ['faro',      'Un faro',               'A lighthouse',       'Um farol'],
  ['barco',     'Un barco',              'A ship',             'Um navio'],
  ['puente',    'Un puente',             'A bridge',           'Uma ponte'],
  ['iglesia',   'Una iglesia',           'A church',           'Uma igreja'],
  ['molino',    'Un molino',             'A windmill',         'Um moinho'],
  ['fogata',    'Una fogata',            'A campfire',         'Uma fogueira'],
  ['pileta',    'Una pileta',            'A swimming pool',    'Uma piscina'],
  ['auto',      'Un auto',               'A car',              'Um carro'],
  ['avion',     'Un avión',              'A plane',            'Um avião'],
  ['tren',      'Un tren',               'A train',            'Um trem'],
  ['robot',     'Un robot',              'A robot',            'Um robô'],
  ['dragon',    'Un dragón',             'A dragon',           'Um dragão'],
  ['pulpo',     'Un pulpo',              'An octopus',         'Um polvo'],
  ['pinguino',  'Un pingüino',           'A penguin',          'Um pinguim'],
  ['gato',      'Un gato',               'A cat',              'Um gato'],
  ['abeja',     'Una abeja',             'A bee',              'Uma abelha'],
  ['hongoG',    'Un hongo gigante',      'A giant mushroom',   'Um cogumelo gigante'],
  ['volcan',    'Un volcán',             'A volcano',          'Um vulcão'],
  ['isla',      'Una isla flotante',     'A floating island',  'Uma ilha flutuante'],
  ['cascada',   'Una cascada',           'A waterfall',        'Uma cachoeira'],
  ['desierto',  'Una duna con cactus',   'A dune with cacti',  'Uma duna com cactos'],
  ['iglu',      'Un iglú',               'An igloo',           'Um iglu'],
  ['torre',     'Una torre altísima',    'A very tall tower',  'Uma torre altíssima'],
  ['portal',    'Un portal mágico',      'A magic portal',     'Um portal mágico'],
  ['estatua',   'Una estatua',           'A statue',           'Uma estátua'],
  ['reloj',     'Un reloj gigante',      'A giant clock',      'Um relógio gigante'],
  ['piano',     'Un piano',              'A piano',            'Um piano'],
  ['guitarra',  'Una guitarra',          'A guitar',           'Uma guitarra'],
  ['helado',    'Un helado',             'An ice cream',       'Um sorvete'],
  ['torta',     'Una torta de cumpleaños','A birthday cake',   'Um bolo de aniversário'],
  ['hamburguesa','Una hamburguesa',      'A burger',           'Um hambúrguer'],
  ['pizza',     'Una pizza',             'A pizza',            'Uma pizza'],
  ['corazon',   'Un corazón',            'A heart',            'Um coração'],
  ['calavera',  'Una calavera',          'A skull',            'Uma caveira'],
  ['fantasma',  'Un fantasma',           'A ghost',            'Um fantasma'],
  ['ovni',      'Un OVNI',               'A UFO',              'Um OVNI'],
  ['ajedrez',   'Una pieza de ajedrez',  'A chess piece',      'Uma peça de xadrez'],
  ['bandera',   'Una bandera',           'A flag',             'Uma bandeira'],
  ['arcoiris',  'Un arcoíris',           'A rainbow',          'Um arco-íris'],
  ['tienda',    'Una carpa de camping',  'A camping tent',     'Uma barraca'],
  ['pozo',      'Un pozo de agua',       'A water well',       'Um poço'],
  ['escalera',  'Una escalera al cielo', 'A stairway to the sky','Uma escada para o céu'],
  ['laberinto', 'Un laberinto',          'A maze',             'Um labirinto'],
  ['nave',      'Una nave espacial',     'A spaceship',        'Uma nave espacial'],
  ['tortuga',   'Una tortuga',           'A turtle',           'Uma tartaruga'],
  ['ballena',   'Una ballena',           'A whale',            'Uma baleia']
];

/* ══════════ CALIDADES ══════════
   Lo unico que cambia es lo que cuesta: la parcela, los bloques y las reglas
   son los mismos en las tres. */
const CALIDADES = {
  baja:  { esc: 0.55, sombra: 0,    niebla: 1.45, cielo: 0 },
  media: { esc: 0.80, sombra: 1024, niebla: 1.00, cielo: 1 },
  alta:  { esc: 1.00, sombra: 2048, niebla: 0.85, cielo: 1 }
};

/* ══════════ IDIOMAS ══════════ */
const TXT = {
  es: { sub: 'TE DICEN QUÉ. VOS LO CONSTRUÍS.', jugar: 'JUGAR', ajustes: 'AJUSTES',
        volver: 'VOLVER', seguir: 'SEGUIR', menu: 'MENÚ', otra: 'OTRA VEZ', pausa: 'PAUSA',
        musica: 'MÚSICA', efectos: 'EFECTOS', idioma: 'IDIOMA', graficos: 'GRÁFICOS',
        baja: 'BAJA', media: 'MEDIA', alta: 'ALTA', tiempo: 'TIEMPO', ronda: 'RONDA',
        tema: 'TEMA', construi: 'CONSTRUÍ', listo: 'LISTO', puntaje: 'PUNTAJE',
        total: 'TOTAL', juez: 'JUEZ', juezIA: 'CLAUDE MIRÓ TU OBRA', juezLocal: 'JUEZ DE LA CASA',
        pensando: 'CLAUDE ESTÁ MIRANDO…', bloques: 'BLOQUES', clases: 'CLASES',
        borrar: 'BORRAR TODO', llave: 'LLAVE DE CLAUDE', poner: 'PONER', sacar: 'SACAR',
        volar: 'VOLAR', paleta: 'PALETA', reloj: 'RELOJ', corto: 'CORTO', largo: 'LARGO',
        normal: 'NORMAL', pie: 'Un dedo mueve, el otro mira. Tocá para poner un bloque.',
        siguiente: 'SIGUIENTE', final: 'FIN DE LA PARTIDA', bien: 'LO BUENO',
        mejorar: 'PARA LA PRÓXIMA', sinLlave: 'sin llave: puntúa el juez de la casa',
        conLlave: 'con llave: puntúa Claude de verdad', pegar: 'PEGÁ TU LLAVE ACÁ',
        guardar: 'GUARDAR', quitar: 'QUITAR', modelo: 'MODELO', avisoLlave:
        'La llave se guarda sólo en este teléfono y sólo se manda a api.anthropic.com. La pagás vos.',
        error: 'NO SE PUDO PREGUNTAR', vacio: 'NO CONSTRUISTE NADA' },
  en: { sub: 'THEY PICK IT. YOU BUILD IT.', jugar: 'PLAY', ajustes: 'SETTINGS',
        volver: 'BACK', seguir: 'RESUME', menu: 'MENU', otra: 'AGAIN', pausa: 'PAUSED',
        musica: 'MUSIC', efectos: 'SOUND FX', idioma: 'LANGUAGE', graficos: 'GRAPHICS',
        baja: 'LOW', media: 'MEDIUM', alta: 'HIGH', tiempo: 'TIME', ronda: 'ROUND',
        tema: 'THEME', construi: 'BUILD', listo: 'DONE', puntaje: 'SCORE',
        total: 'TOTAL', juez: 'JUDGE', juezIA: 'CLAUDE LOOKED AT YOUR BUILD', juezLocal: 'HOUSE JUDGE',
        pensando: 'CLAUDE IS LOOKING…', bloques: 'BLOCKS', clases: 'KINDS',
        borrar: 'CLEAR ALL', llave: 'CLAUDE KEY', poner: 'PLACE', sacar: 'BREAK',
        volar: 'FLY', paleta: 'PALETTE', reloj: 'CLOCK', corto: 'SHORT', largo: 'LONG',
        normal: 'NORMAL', pie: 'One thumb moves, the other looks. Tap to place a block.',
        siguiente: 'NEXT', final: 'MATCH OVER', bien: 'WHAT WORKS',
        mejorar: 'NEXT TIME', sinLlave: 'no key: the house judge scores',
        conLlave: 'with a key: Claude really scores it', pegar: 'PASTE YOUR KEY HERE',
        guardar: 'SAVE', quitar: 'REMOVE', modelo: 'MODEL', avisoLlave:
        'The key is stored only on this phone and only sent to api.anthropic.com. You pay for it.',
        error: 'COULD NOT ASK', vacio: 'YOU BUILT NOTHING' },
  pt: { sub: 'ELES ESCOLHEM. VOCÊ CONSTRÓI.', jugar: 'JOGAR', ajustes: 'AJUSTES',
        volver: 'VOLTAR', seguir: 'CONTINUAR', menu: 'MENU', otra: 'DE NOVO', pausa: 'PAUSA',
        musica: 'MÚSICA', efectos: 'EFEITOS', idioma: 'IDIOMA', graficos: 'GRÁFICOS',
        baja: 'BAIXA', media: 'MÉDIA', alta: 'ALTA', tiempo: 'TEMPO', ronda: 'RODADA',
        tema: 'TEMA', construi: 'CONSTRUA', listo: 'PRONTO', puntaje: 'PONTUAÇÃO',
        total: 'TOTAL', juez: 'JUIZ', juezIA: 'CLAUDE OLHOU SUA OBRA', juezLocal: 'JUIZ DA CASA',
        pensando: 'CLAUDE ESTÁ OLHANDO…', bloques: 'BLOCOS', clases: 'TIPOS',
        borrar: 'APAGAR TUDO', llave: 'CHAVE DO CLAUDE', poner: 'POR', sacar: 'TIRAR',
        volar: 'VOAR', paleta: 'PALETA', reloj: 'RELÓGIO', corto: 'CURTO', largo: 'LONGO',
        normal: 'NORMAL', pie: 'Um dedo anda, o outro olha. Toque para pôr um bloco.',
        siguiente: 'PRÓXIMA', final: 'FIM DA PARTIDA', bien: 'O QUE FICOU BOM',
        mejorar: 'PARA A PRÓXIMA', sinLlave: 'sem chave: pontua o juiz da casa',
        conLlave: 'com chave: o Claude pontua de verdade', pegar: 'COLE SUA CHAVE AQUI',
        guardar: 'SALVAR', quitar: 'TIRAR', modelo: 'MODELO', avisoLlave:
        'A chave fica só neste telefone e só vai para api.anthropic.com. Você paga por ela.',
        error: 'NÃO DEU PARA PERGUNTAR', vacio: 'VOCÊ NÃO CONSTRUIU NADA' }
};

/* ══════════ AZAR CON SEMILLA ══════════ */
let SEM = 1;
function sem(s){ SEM = (s >>> 0) || 1; }
function az(){ SEM ^= SEM << 13; SEM ^= SEM >>> 17; SEM ^= SEM << 5; return ((SEM >>> 0) % 100000)/100000; }
function azr(a, b){ return a + az()*(b - a); }
function azi(a, b){ return Math.floor(a + az()*(b - a + 1)); }
function cl(v, a, b){ return v < a ? a : v > b ? b : v; }
function lerp(a, b, k){ return a + (b - a)*k; }
