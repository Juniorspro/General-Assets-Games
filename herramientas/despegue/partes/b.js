
/* ══════════════════════ LAS TABLAS ══════════════════════
   DESPEGUE es un juego de lanzar un cohete: se aprieta para empujar, se arrastra
   para esquivar, y cada lanzamiento paga monedas con las que se mejora el cohete
   para llegar mas alto la proxima vez. Todo lo que el juego ES vive en estas
   tablas: las quince capas, las siete mejoras, las siete rafagas, los
   veinticuatro estilos y los tres idiomas. El codigo de abajo solo las lee. */

/* ══════════ LAS CAPAS ══════════
   ── EN METROS Y DESPUES EN KILOMETROS, Y CADA UNA ES UN LUGAR ──
   La altura de cada capa es real: las copas de los arboles a 60 m, los aviones a
   3 km, la estratosfera a 18, la linea de Karman a 100 km, la estacion espacial
   a 400, la Luna a 384.000 km y Marte a 78 millones. Que sean numeros de verdad
   es lo que hace que el marcador de altura diga algo. Cada capa trae su cielo
   —de arriba y de abajo, se funden por altura— y que hay en ella. */
const CAPAS = [
  { h: 0,       nom: { es: 'La plataforma',        en: 'The launch pad',       pt: 'A plataforma' },          arr: 0x3f8fd8, aba: 0x9ed3ff, cosas: ['pajaro'] },
  { h: 60,      nom: { es: 'Las copas de los árboles', en: 'The treetops',     pt: 'As copas das árvores' },  arr: 0x3a86d2, aba: 0x8fc8f7, cosas: ['pajaro', 'globo'] },
  { h: 800,     nom: { es: 'Las nubes bajas',      en: 'The low clouds',       pt: 'As nuvens baixas' },      arr: 0x2f78c8, aba: 0x7fbcf2, cosas: ['nube', 'pajaro', 'globo'] },
  { h: 3000,    nom: { es: 'La ruta de los aviones', en: 'The airliner lanes', pt: 'A rota dos aviões' },     arr: 0x2568b8, aba: 0x6cadea, cosas: ['nube', 'avion'] },
  { h: 9000,    nom: { es: 'Los cirros',           en: 'The cirrus',           pt: 'Os cirros' },             arr: 0x1a4f9a, aba: 0x5a98d8, cosas: ['cirro', 'avion', 'jet'] },
  { h: 18000,   nom: { es: 'La estratósfera',      en: 'The stratosphere',     pt: 'A estratosfera' },        arr: 0x0f3474, aba: 0x3f74b8, cosas: ['jet', 'globoAlto'] },
  { h: 35000,   nom: { es: 'Los globos de gran altura', en: 'The high-altitude balloons', pt: 'Os balões de grande altitude' }, arr: 0x081e4c, aba: 0x2a5090, cosas: ['globoAlto'] },
  { h: 55000,   nom: { es: 'La mesósfera',         en: 'The mesosphere',       pt: 'A mesosfera' },           arr: 0x040f2c, aba: 0x1a3468, cosas: ['meteoro'] },
  { h: 100000,  nom: { es: 'La línea de Kármán',   en: 'The Kármán line',      pt: 'A linha de Kármán' },     arr: 0x02061a, aba: 0x0c1e46, cosas: ['meteoro', 'chatarra'] },
  { h: 400000,  nom: { es: 'La órbita baja',       en: 'Low orbit',            pt: 'A órbita baixa' },        arr: 0x010310, aba: 0x06102a, cosas: ['satelite', 'chatarra', 'estacion'] },
  { h: 2e6,     nom: { es: 'Los satélites',        en: 'The satellites',       pt: 'Os satélites' },          arr: 0x01020c, aba: 0x040b1e, cosas: ['satelite', 'chatarra'] },
  { h: 3.6e7,   nom: { es: 'La órbita geoestacionaria', en: 'Geostationary orbit', pt: 'A órbita geoestacionária' }, arr: 0x010209, aba: 0x030816, cosas: ['satelite'] },
  { h: 3.84e8,  nom: { es: 'La Luna',              en: 'The Moon',             pt: 'A Lua' },                 arr: 0x000106, aba: 0x020612, cosas: ['asteroide', 'luna'] },
  { h: 7.8e10,  nom: { es: 'Marte',                en: 'Mars',                 pt: 'Marte' },                 arr: 0x020104, aba: 0x0a0408, cosas: ['asteroide', 'marte'] },
  { h: 3e11,    nom: { es: 'El espacio profundo',  en: 'Deep space',           pt: 'O espaço profundo' },     arr: 0x000000, aba: 0x020204, cosas: ['asteroide'] }
];
/* el final del juego: pasar la ultima capa. Mas alla no hay nada que ver. */
const H_FIN = 6e11;

/* ══════════ LAS SIETE MEJORAS ══════════
   ── CADA UNA MUEVE UN NUMERO DE LA FISICA Y NADA MAS ──
   El motor es el empuje, el tanque son kilos de combustible, el fuselaje quita
   masa seca y resistencia, el propelente es el impulso especifico (cuantos
   segundos dura cada kilo), las aletas son la velocidad de giro, el escudo son
   golpes que se aguantan y el iman es el radio de recogida. `c0` es el precio
   del primer nivel y cada nivel cuesta `PRECIO_K` veces mas: asi la decima
   mejora cuesta cincuenta veces la primera, que es lo que hace que la
   progresion dure y no se compre todo en tres lanzamientos. */
const PRECIO_K = 1.50;
const MEJORAS = [
  { id: 'motor',   ic: '🔥', c0: 120, nom: { es: 'Motor', en: 'Engine', pt: 'Motor' },
    des: { es: 'Más empuje: sube más rápido', en: 'More thrust: climbs faster', pt: 'Mais empuxo: sobe mais rápido' } },
  { id: 'tanque',  ic: '🛢', c0: 100, nom: { es: 'Tanque', en: 'Tank', pt: 'Tanque' },
    des: { es: 'Más combustible: empuja más tiempo', en: 'More fuel: burns longer', pt: 'Mais combustível: empurra por mais tempo' } },
  { id: 'fuselaje', ic: '🧊', c0: 150, nom: { es: 'Fuselaje', en: 'Hull', pt: 'Fuselagem' },
    des: { es: 'Más liviano y afilado: menos aire en contra', en: 'Lighter and sharper: less drag', pt: 'Mais leve e afiado: menos ar contra' } },
  { id: 'propelente', ic: '⚗', c0: 180, nom: { es: 'Propelente', en: 'Propellant', pt: 'Propelente' },
    des: { es: 'Cada kilo dura más', en: 'Every kilo lasts longer', pt: 'Cada quilo dura mais' } },
  { id: 'aletas',  ic: '🪽', c0: 90,  nom: { es: 'Aletas', en: 'Fins', pt: 'Aletas' },
    des: { es: 'Gira más rápido para esquivar', en: 'Turns faster to dodge', pt: 'Gira mais rápido para desviar' } },
  { id: 'escudo',  ic: '🛡', c0: 140, nom: { es: 'Escudo', en: 'Shield', pt: 'Escudo' },
    des: { es: 'Aguanta un golpe más por nivel', en: 'Takes one more hit per level', pt: 'Aguenta um golpe a mais por nível' } },
  { id: 'iman',    ic: '🧲', c0: 110, nom: { es: 'Imán', en: 'Magnet', pt: 'Ímã' },
    des: { es: 'Atrae las monedas desde más lejos', en: 'Pulls coins from farther', pt: 'Atrai as moedas de mais longe' } }
];
const NIVEL_TOPE = 10;
function precioMejora(id, nivel){
  const M = MEJORAS.find(m => m.id === id);
  return Math.round(M.c0*Math.pow(PRECIO_K, nivel));
}

/* ══════════ LAS SIETE RAFAGAS ══════════
   ── DOS FAMILIAS: UN EMPUJON O UN MULTIPLICADOR ──
   `dv` suma velocidad de golpe —un empujon— y `mult` multiplica el empuje del
   motor durante `dur` segundos. Las dos se sienten distinto y por eso hay de
   las dos: el empujon es un instante y el multiplicador es una decision de
   cuando. Algunas piden altura minima (`hMin`): el ionico y el warp solo
   funcionan fuera del aire, que es lo que los hace de otra etapa del juego.
   Se desbloquean por capa alcanzada y cada nivel sube el efecto un 30 %; cada
   dos niveles, una carga mas. */
const RAFAGAS = [
  { id: 'turbo',    ic: '💨', tipo: 'dv',   val: 35,   dur: 0,  cargas: 1, hMin: 0,     capa: 1,  c0: 150,
    nom: { es: 'Turbo', en: 'Turbo', pt: 'Turbo' }, col: '#ffd447' },
  { id: 'post',     ic: '🔥', tipo: 'mult', val: 1.8,  dur: 3,  cargas: 1, hMin: 0,     capa: 2,  c0: 400,
    nom: { es: 'Postquemador', en: 'Afterburner', pt: 'Pós-combustor' }, col: '#ff7a2a' },
  { id: 'nitro',    ic: '⚡', tipo: 'dv',   val: 120,  dur: 0,  cargas: 2, hMin: 0,     capa: 3,  c0: 900,
    nom: { es: 'Nitro', en: 'Nitro', pt: 'Nitro' }, col: '#5ad9ff' },
  { id: 'ionico',   ic: '🔵', tipo: 'mult', val: 1.6,  dur: 10, cargas: 1, hMin: 50000, capa: 5,  c0: 2000,
    nom: { es: 'Impulso iónico', en: 'Ion drive', pt: 'Impulso iônico' }, col: '#7ad9ff' },
  { id: 'plasma',   ic: '🟣', tipo: 'dv',   val: 350,  dur: 0,  cargas: 1, hMin: 0,     capa: 7,  c0: 4500,
    nom: { es: 'Plasma', en: 'Plasma', pt: 'Plasma' }, col: '#c98cff' },
  { id: 'fotonico', ic: '✨', tipo: 'mult', val: 3.0,  dur: 6,  cargas: 1, hMin: 0,     capa: 8,  c0: 9000,
    nom: { es: 'Motor fotónico', en: 'Photon engine', pt: 'Motor fotônico' }, col: '#ffffff' },
  { id: 'warp',     ic: '🌀', tipo: 'dv',   val: 1200, dur: 0,  cargas: 1, hMin: 100000, capa: 9, c0: 12000,
    nom: { es: 'Salto warp', en: 'Warp jump', pt: 'Salto warp' }, col: '#8ef0c4' }
];
const RAF_TOPE = 5;
function precioRafaga(id, nivel){
  const R = RAFAGAS.find(r => r.id === id);
  return Math.round(R.c0*Math.pow(1.45, nivel));
}
function rafagaValor(R, nivel){ return R.tipo === 'dv' ? R.val*(1 + 0.3*(nivel - 1)) : 1 + (R.val - 1)*(1 + 0.3*(nivel - 1)); }
function rafagaCargas(R, nivel){ return R.cargas + Math.floor((nivel - 1)/2); }

/* ══════════ LOS VEINTICUATRO ESTILOS ══════════
   ── UN ESTILO SON COLORES Y UN PATRON, Y SE PINTA EN UN LIENZO ──
   El cuerpo del cohete lleva una textura dibujada por codigo: `base` es el
   color del fuselaje, `franja` el de las bandas y los detalles, `punta` el de la
   nariz, `aleta` el de las aletas, y `patron` que se dibuja encima. `metal`
   sube el brillo del material —cromo y dorado— y `desb` dice como se
   desbloquea: llegando a una capa o con monedas. El clasico es gratis. */
const ESTILOS = [
  { id: 'clasico',  nom: { es: 'Clásico', en: 'Classic', pt: 'Clássico' }, base: '#f4f4f0', franja: '#e0332a', punta: '#e0332a', aleta: '#e0332a', patron: 'liso', desb: {} },
  { id: 'nocturno', nom: { es: 'Nocturno', en: 'Night', pt: 'Noturno' }, base: '#151b33', franja: '#5ad9ff', punta: '#0d1024', aleta: '#5ad9ff', patron: 'liso', desb: { capa: 1 } },
  { id: 'menta',    nom: { es: 'Menta', en: 'Mint', pt: 'Menta' }, base: '#8ef0c4', franja: '#ffffff', punta: '#ffffff', aleta: '#2de2a8', patron: 'bandas', desb: { capa: 2 } },
  { id: 'bandas',   nom: { es: 'Bandas', en: 'Bands', pt: 'Faixas' }, base: '#f4f4f0', franja: '#2b5cd8', punta: '#e0332a', aleta: '#2b5cd8', patron: 'bandas', desb: { monedas: 300 } },
  { id: 'cereza',   nom: { es: 'Cereza', en: 'Cherry', pt: 'Cereja' }, base: '#c81e3a', franja: '#ffffff', punta: '#ffffff', aleta: '#7a0f22', patron: 'liso', desb: { capa: 3 } },
  { id: 'damero',   nom: { es: 'Damero', en: 'Checker', pt: 'Xadrez' }, base: '#f4f4f0', franja: '#111', punta: '#111', aleta: '#f4f4f0', patron: 'damero', desb: { monedas: 600 } },
  { id: 'carbono',  nom: { es: 'Carbono', en: 'Carbon', pt: 'Carbono' }, base: '#2a2d33', franja: '#5a6070', punta: '#1a1c22', aleta: '#2a2d33', patron: 'rayas', metal: 0.6, desb: { capa: 4 } },
  { id: 'llamas',   nom: { es: 'Llamas', en: 'Flames', pt: 'Chamas' }, base: '#15100c', franja: '#ff7a2a', punta: '#ffd447', aleta: '#ff3a1a', patron: 'llamas', desb: { monedas: 1200 } },
  { id: 'cielo',    nom: { es: 'Cielo', en: 'Sky', pt: 'Céu' }, base: '#8fc8f7', franja: '#ffffff', punta: '#ffffff', aleta: '#3f8fd8', patron: 'puntos', desb: { capa: 5 } },
  { id: 'camo',     nom: { es: 'Camuflaje', en: 'Camo', pt: 'Camuflagem' }, base: '#5b6b3a', franja: '#2e3a22', punta: '#8a8a5a', aleta: '#2e3a22', patron: 'camo', desb: { monedas: 1800 } },
  { id: 'retro',    nom: { es: 'Retro', en: 'Retro', pt: 'Retrô' }, base: '#f2e6c8', franja: '#2f9c8c', punta: '#d8d8d8', aleta: '#d8d8d8', patron: 'bandas', metal: 0.5, desb: { capa: 6 } },
  { id: 'neon',     nom: { es: 'Neón', en: 'Neon', pt: 'Neon' }, base: '#0a0a14', franja: '#ff3af0', punta: '#5ad9ff', aleta: '#ff3af0', patron: 'zigzag', desb: { monedas: 2500 } },
  { id: 'dorado',   nom: { es: 'Dorado', en: 'Gold', pt: 'Dourado' }, base: '#e8b83a', franja: '#8a6210', punta: '#f6d874', aleta: '#c8961e', patron: 'liso', metal: 1.0, desb: { capa: 8 } },
  { id: 'hielo',    nom: { es: 'Hielo', en: 'Ice', pt: 'Gelo' }, base: '#d8f0ff', franja: '#7ad9ff', punta: '#ffffff', aleta: '#a8e6ff', patron: 'zigzag', desb: { monedas: 3500 } },
  { id: 'lava',     nom: { es: 'Lava', en: 'Lava', pt: 'Lava' }, base: '#1c0d0a', franja: '#ff5a1a', punta: '#ff8a3a', aleta: '#5a1a0a', patron: 'grietas', desb: { capa: 9 } },
  { id: 'zebra',    nom: { es: 'Zebra', en: 'Zebra', pt: 'Zebra' }, base: '#f4f4f0', franja: '#111', punta: '#111', aleta: '#111', patron: 'rayas', desb: { monedas: 5000 } },
  { id: 'tigre',    nom: { es: 'Tigre', en: 'Tiger', pt: 'Tigre' }, base: '#ff8a2a', franja: '#1a1008', punta: '#1a1008', aleta: '#ff8a2a', patron: 'rayas', desb: { capa: 10 } },
  { id: 'galaxia',  nom: { es: 'Galaxia', en: 'Galaxy', pt: 'Galáxia' }, base: '#2a1650', franja: '#c98cff', punta: '#6a3ab0', aleta: '#2a1650', patron: 'estrellas', desb: { capa: 11 } },
  { id: 'pastel',   nom: { es: 'Pastel', en: 'Pastel', pt: 'Pastel' }, base: '#ffd6e8', franja: '#c8b8ff', punta: '#ffffff', aleta: '#b8f0e8', patron: 'bandas', desb: { monedas: 8000 } },
  { id: 'cromo',    nom: { es: 'Cromo', en: 'Chrome', pt: 'Cromo' }, base: '#d8dde6', franja: '#8a94a8', punta: '#eef2f8', aleta: '#c8ceda', patron: 'liso', metal: 1.0, desb: { capa: 12 } },
  { id: 'arcoiris', nom: { es: 'Arcoíris', en: 'Rainbow', pt: 'Arco-íris' }, base: '#f4f4f0', franja: '#ff3a3a', punta: '#ffffff', aleta: '#ffd447', patron: 'arcoiris', desb: { monedas: 12000 } },
  { id: 'marciano', nom: { es: 'Marciano', en: 'Martian', pt: 'Marciano' }, base: '#b0492a', franja: '#e8a06a', punta: '#5a2414', aleta: '#7a3018', patron: 'puntos', desb: { capa: 13 } },
  { id: 'fantasma', nom: { es: 'Fantasma', en: 'Ghost', pt: 'Fantasma' }, base: '#e8ecf4', franja: '#b8c0d0', punta: '#ffffff', aleta: '#d8dde8', patron: 'liso', fantasma: 1, desb: { monedas: 20000 } },
  { id: 'solar',    nom: { es: 'Solar', en: 'Solar', pt: 'Solar' }, base: '#ffb02a', franja: '#ff5a1a', punta: '#fff2a0', aleta: '#ff3a1a', patron: 'llamas', metal: 0.4, desb: { capa: 14 } }
];

/* ══════════ LOS TRES IDIOMAS ══════════ */
const TXT = {
  es: { sub: 'LANZÁ, MEJORÁ, LLEGÁ MÁS ALTO', lanzar: 'LANZAR', taller: 'TALLER', estilos: 'ESTILOS', ajustes: 'AJUSTES',
        volver: 'VOLVER', mejoras: 'MEJORAS', rafagas: 'RÁFAGAS', elegi: 'MEJORÁ EL COHETE', pintura: 'LA PINTURA',
        comprar: 'COMPRAR', tope: 'TOPE', equipar: 'EQUIPAR', equipada: 'EQUIPADA', mejorar: 'MEJORAR', capa: 'CAPA',
        bloq: 'LLEGÁ A', mon: 'MONEDAS', comb: 'COMBUSTIBLE', vel: 'VELOCIDAD', alt: 'ALTURA', maximo: 'MÁXIMO',
        record: 'RÉCORD', nuevoRec: '¡NUEVO RÉCORD!', otra: 'OTRA VEZ', menu: 'MENÚ', pausa: 'PAUSA', sigo: 'SEGUIR',
        abandona: 'ABANDONAR', musica: 'MÚSICA', fx: 'EFECTOS', idioma: 'IDIOMA', calidad: 'GRÁFICOS', baja: 'BAJA',
        media: 'MEDIA', alta: 'ALTA', borrar: 'BORRAR EL PROGRESO', borrado: 'BORRADO', ganaste: 'GANASTE', nuevo: 'NUEVO',
        estilo: 'ESTILO', ayudaPad: 'MANTENÉ APRETADO PARA EMPUJAR · ARRASTRÁ PARA ESQUIVAR', ayudaVuelo: 'SOLTÁ PARA AHORRAR COMBUSTIBLE',
        sinComb: 'SIN COMBUSTIBLE · PLANEANDO', tiempo: 'TIEMPO', llegaste: 'LLEGASTE A', golpe: '¡GOLPE!', explota: 'EXPLOTÓ',
        texto: 'Un cohete, un dedo. Mantené apretado para empujar y arrastrá para esquivar. Cada metro paga monedas, y con las monedas el cohete mejora: más motor, más tanque, menos peso. Quince capas, de las copas de los árboles a Marte.',
        pie: 'Las alturas son reales: 100 km es la línea de Kármán, 400 la estación espacial, 384.000 la Luna.',
        fin: 'ESPACIO PROFUNDO', finT: 'Pasaste Marte y seguís. El cohete ya es otra cosa.', rafNo: 'SIN RÁFAGA',
        rafBloq: 'todavía no', rafMin: 'sólo arriba de', dif: '', cuenta: ['3', '2', '1', '¡YA!'] },
  en: { sub: 'LAUNCH, UPGRADE, GO HIGHER', lanzar: 'LAUNCH', taller: 'WORKSHOP', estilos: 'STYLES', ajustes: 'SETTINGS',
        volver: 'BACK', mejoras: 'UPGRADES', rafagas: 'BOOSTS', elegi: 'UPGRADE THE ROCKET', pintura: 'THE PAINT',
        comprar: 'BUY', tope: 'MAX', equipar: 'EQUIP', equipada: 'EQUIPPED', mejorar: 'UPGRADE', capa: 'LAYER',
        bloq: 'REACH', mon: 'COINS', comb: 'FUEL', vel: 'SPEED', alt: 'ALTITUDE', maximo: 'APEX',
        record: 'BEST', nuevoRec: 'NEW RECORD!', otra: 'AGAIN', menu: 'MENU', pausa: 'PAUSED', sigo: 'RESUME',
        abandona: 'ABANDON', musica: 'MUSIC', fx: 'SFX', idioma: 'LANGUAGE', calidad: 'GRAPHICS', baja: 'LOW',
        media: 'MEDIUM', alta: 'HIGH', borrar: 'ERASE PROGRESS', borrado: 'ERASED', ganaste: 'EARNED', nuevo: 'NEW',
        estilo: 'STYLE', ayudaPad: 'HOLD TO THRUST · DRAG TO DODGE', ayudaVuelo: 'RELEASE TO SAVE FUEL',
        sinComb: 'OUT OF FUEL · COASTING', tiempo: 'TIME', llegaste: 'YOU REACHED', golpe: 'HIT!', explota: 'EXPLODED',
        texto: 'One rocket, one finger. Hold to thrust and drag to dodge. Every metre pays coins, and coins upgrade the rocket: more engine, more tank, less weight. Fifteen layers, from the treetops to Mars.',
        pie: 'The altitudes are real: 100 km is the Kármán line, 400 the space station, 384,000 the Moon.',
        fin: 'DEEP SPACE', finT: 'You passed Mars and kept going. The rocket is something else now.', rafNo: 'NO BOOST',
        rafBloq: 'not yet', rafMin: 'only above', dif: '', cuenta: ['3', '2', '1', 'GO!'] },
  pt: { sub: 'LANCE, MELHORE, VÁ MAIS ALTO', lanzar: 'LANÇAR', taller: 'OFICINA', estilos: 'ESTILOS', ajustes: 'AJUSTES',
        volver: 'VOLTAR', mejoras: 'MELHORIAS', rafagas: 'RAJADAS', elegi: 'MELHORE O FOGUETE', pintura: 'A PINTURA',
        comprar: 'COMPRAR', tope: 'MÁXIMO', equipar: 'EQUIPAR', equipada: 'EQUIPADA', mejorar: 'MELHORAR', capa: 'CAMADA',
        bloq: 'CHEGUE A', mon: 'MOEDAS', comb: 'COMBUSTÍVEL', vel: 'VELOCIDADE', alt: 'ALTURA', maximo: 'MÁXIMO',
        record: 'RECORDE', nuevoRec: 'NOVO RECORDE!', otra: 'DE NOVO', menu: 'MENU', pausa: 'PAUSA', sigo: 'CONTINUAR',
        abandona: 'ABANDONAR', musica: 'MÚSICA', fx: 'EFEITOS', idioma: 'IDIOMA', calidad: 'GRÁFICOS', baja: 'BAIXA',
        media: 'MÉDIA', alta: 'ALTA', borrar: 'APAGAR O PROGRESSO', borrado: 'APAGADO', ganaste: 'GANHOU', nuevo: 'NOVO',
        estilo: 'ESTILO', ayudaPad: 'SEGURE PARA EMPURRAR · ARRASTE PARA DESVIAR', ayudaVuelo: 'SOLTE PARA ECONOMIZAR',
        sinComb: 'SEM COMBUSTÍVEL · PLANANDO', tiempo: 'TEMPO', llegaste: 'VOCÊ CHEGOU A', golpe: 'BATIDA!', explota: 'EXPLODIU',
        texto: 'Um foguete, um dedo. Segure para empurrar e arraste para desviar. Cada metro paga moedas, e as moedas melhoram o foguete: mais motor, mais tanque, menos peso. Quinze camadas, das copas das árvores até Marte.',
        pie: 'As alturas são reais: 100 km é a linha de Kármán, 400 a estação espacial, 384.000 a Lua.',
        fin: 'ESPAÇO PROFUNDO', finT: 'Você passou Marte e continua. O foguete já é outra coisa.', rafNo: 'SEM RAJADA',
        rafBloq: 'ainda não', rafMin: 'só acima de', dif: '', cuenta: ['3', '2', '1', 'JÁ!'] }
};
let LANG = 'en';
const TX = (k) => (TXT[LANG] && TXT[LANG][k]) || TXT.es[k] || k;
const TL = (o) => (o && (o[LANG] || o.es)) || '';

/* ── LA ALTURA SE ESCRIBE EN LA UNIDAD QUE CORRESPONDE ──
   Metros hasta mil, kilometros con un decimal hasta un millon, y despues
   millones de kilometros. «78.000.000.000 m» no se lee; «78 M km» si. */
function fmtAlt(m){
  if (m < 1000) return { n: Math.round(m).toString(), u: 'm' };
  if (m < 1e6) return { n: (m/1000).toFixed(m < 1e4 ? 2 : 1), u: 'km' };
  if (m < 1e9) return { n: Math.round(m/1000).toLocaleString('de-DE'), u: 'km' };
  return { n: (m/1e9).toFixed(m < 1e10 ? 2 : 1), u: 'M km' };
}
function fmtVel(v){
  const a = Math.abs(v);
  if (a < 1000) return Math.round(a) + ' m/s';
  return (a/1000).toFixed(1) + ' km/s';
}
const fmtMon = (n) => Math.round(n).toLocaleString('de-DE');

/* ══════════ EL AZAR CON SEMILLA ══════════
   Los obstaculos de un lanzamiento salen de una semilla: asi el auto-jugador y
   la partida de verdad ven el mismo cielo, y una prueba repetida da lo mismo. */
let _sem = 1;
function sem(n){ _sem = (n | 0) || 1; }
function az(){ _sem = (_sem*1664525 + 1013904223) >>> 0; return _sem/4294967296; }
function azr(a, b){ return a + az()*(b - a); }
const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, k) => a + (b - a)*k;

const CALIDADES = { baja: { esc: 0.60, part: 60, nubes: 18 }, media: { esc: 0.85, part: 160, nubes: 40 },
                    alta: { esc: 1.00, part: 300, nubes: 70 } };
let CALIDAD = 'media';
