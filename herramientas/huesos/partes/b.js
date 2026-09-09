/* ══════════════════════════════════════════════════════════════════════════
   HUESOS — constantes y los tres idiomas
   ══════════════════════════════════════════════════════════════════════════
   TODO NÚMERO QUE SE TOCA DOS VECES VIVE ACÁ. La lección de este repo: un
   número escrito en dos sitios se desincroniza el día que se cambia uno, y
   eso no falla — hace otra cosa.                                           */

const PASO = 1 / 60;              // el reloj de la simulación, fijo
const PASO_MAX = 8;               // cuántos pasos por cuadro antes de rendirse

/* ── EL MUNDO ──────────────────────────────────────────────────────────── */
const MUNDO_R = 108;              // radio del mapa, en metros
const CELDA = 6;                  // paso de la reja de siembra
/* `sol` y `amb` son las intensidades de la zona, y las escribe `zonaMezcla` en
   CADA cuadro: tocar `solLuz.intensity` a mano no sirve de nada, se pisa al
   cuadro siguiente. Los valores salieron de barrer y medir el búfer: con 1,05
   y 0,42 las tres franjas de abajo daban 32 contra un cielo de 58 —o sea el
   suelo casi negro contra el cielo— y con 1,80 y 0,55 dan 41 contra 59.
   Y `olas` es CUÁNTOS ESQUELETOS TRAE CADA OLEADA de esa zona, y de ahí sale
   todo lo demás: cuántas oleadas hay, el cupo total, el contador del HUD y la
   auditoría. Con el total escrito aparte, el día que se agregue una oleada el
   HUD cuenta una cosa y el mundo trae otra — y eso no falla, miente.      */
const ZONAS = [
  { id: 'bosque',  r: 40,  suelo: 's_bosque',  niebla: 0x2c3630, nieblaD: 0.0135,
    cielo: 0x39443c, luz: 0x9fb08c, sol: 1.80, amb: 0.55, olas: [3, 4], densi: 1.00 },
  { id: 'ruinas',  r: 76,  suelo: 's_piedra',  niebla: 0x33333a, nieblaD: 0.0165,
    cielo: 0x3c3c46, luz: 0x9c9cae, sol: 1.55, amb: 0.48, olas: [4, 5], densi: 0.62 },
  { id: 'ceniza',  r: 999, suelo: 's_ceniza',  niebla: 0x2a2724, nieblaD: 0.0210,
    cielo: 0x35312c, luz: 0xb8a894, sol: 1.34, amb: 0.40, olas: [5, 6, 'rey'], densi: 0.34 },
];
/* ── LAS OLEADAS ───────────────────────────────────────────────────────────
   Una oleada cae, se la limpia, hay un respiro y viene la siguiente. Lo que
   eso compra sobre «matá a los diez que hay sembrados» son tres cosas: el
   mundo no arranca con treinta y nueve bichos plantados esperando —o sea que
   no se los puede sacar de a uno hasta el claro y pelearlos en fila—, hay un
   momento de calma donde se recupera, y la dificultad sube EN ESCALONES que
   el jugador puede contar en vez de subir sola con la distancia.           */
const OLA_RESPIRO = 3.4;          // segundos entre una oleada y la siguiente
const OLA_RESPIRO_Z = 5.0;        // el respiro más largo al abrir una zona
/* `let` Y NO `const`, y no es descuido: el auto-jugador barre estos dos en el
   MISMO BINARIO (`__H.olas`). Un barrido contra otro commit compara dos
   programas distintos y no dice nada de éste.                              */
let OLA_CURA = 0.28;              // fracción de vida que devuelve limpiar una
let OLA_XP = 0.45;                // y fracción del nivel que paga limpiarla
const OLA_R0 = 19;                // no cae nada más cerca que esto del jugador
const OLA_R1 = 40;                // ni más lejos: una oleada tiene que LLEGAR
/* ── Y NUNCA MÁS ALLÁ DEL RADIO EN QUE EL JUEGO LOS PIENSA ────────────────
   `esqCerca` sólo pasa por el bucle a los que están a `CAL.vista + 10`: uno
   nacido más lejos NO SE MUEVE, NO SE MUERE Y NO CUENTA COMO ENEMIGO QUE SE
   ACERCA, y como la oleada no termina hasta que no queda ninguno vivo, la
   partida se queda esperando a algo que está congelado. Se ve como que el
   juego se colgó. El número sale de la calidad MÁS BAJA —62 + 10— porque la
   promesa tiene que valer en las tres.                                     */
const OLA_R_FRIO = 66;
const olaTotal = () => ZONAS.reduce((a, Z) => a + Z.olas.length, 0);
let OLA_TOTAL = olaTotal();

/* ── EL JUGADOR ────────────────────────────────────────────────────────────
   La velocidad y la zancada NO son dos números sueltos: la cadencia del paso
   sale de dividir una por otra (`pasos/s = v / paso`), que es lo que impide
   que los pies patinen. Un humano camina a 1,9-2,4 pasos por segundo.      */
const J_VEL = 3.05;               // m/s caminando
const J_CORRE = 5.60;             // m/s corriendo
/* la zancada NO se declara: la mide `midePaso()` sobre el propio ciclo.
   Este número es sólo el respaldo por si la medición no corrió. */
const J_ZANCADA = 1.35;
const J_RADIO = 0.42;
const J_ALTO = 1.72;
const J_VIDA = 100;
const J_AGU = 100;                // aguante
const J_AGU_REC = 26;             // aguante por segundo cuando no se gasta
const J_AGU_CORRE = 17;           // por segundo corriendo
const J_AGU_ESQ = 28;             // por esquive
const J_AGU_GOLPE = 12;           // por golpe
const J_ESQ_V = 12.6;             // velocidad del esquive
const J_ESQ_T = 0.34;             // cuánto dura
/* CUÁNTO DURA LA INVULNERABILIDAD SALE DE UNA CUENTA, no del gusto. El aviso
   del bicho termina y el hachazo cae `0,38 × 0,42 = 0,16 s` después. Con 0,24
   de intocable había que apretar dentro de una ventana de 0,08 s — y medido,
   el bot no esquivó UN SOLO golpe en ocho corridas. Con 0,30 la ventana es de
   0,14 s: sigue pidiendo el tiempo justo y se puede acertar con un pulgar. */
const J_ESQ_INV = 0.30;
const J_ESQ_ESPERA = 0.52;

/* el combo de tres: cada golpe con su ventana, su alcance y su daño */
const J_COMBO = [
  { carga: 0.13, activo: 0.11, fin: 0.30, alc: 2.05, arco: 1.35, dano: 22, empuje: 3.2 },
  { carga: 0.11, activo: 0.10, fin: 0.28, alc: 2.10, arco: 1.50, dano: 24, empuje: 3.4 },
  { carga: 0.19, activo: 0.14, fin: 0.44, alc: 2.45, arco: 2.10, dano: 41, empuje: 7.0 },
];
const J_COMBO_VENTANA = 0.46;     // desde que termina un golpe para encadenar

/* ── LOS ESQUELETOS ────────────────────────────────────────────────────────
   Tres clases y una sola máquina de estados. La diferencia entre ellas son
   números, no ramas: un enemigo con su propio `if` es un enemigo que el día
   que se corrija un defecto se queda sin corregir.                          */
const ESQ = {
  peon:   { vida: 46,  vel: 2.55, dano: 11, alc: 1.85, cad: 1.35, carga: 0.46, esc: 1.00,
            xp: 12, radio: 0.40, alto: 1.66, color: 0xd8d2c0, vista: 26, empuje: 2.6 },
  lancero:{ vida: 62,  vel: 2.20, dano: 16, alc: 2.85, cad: 1.75, carga: 0.62, esc: 1.06,
            xp: 20, radio: 0.42, alto: 1.74, color: 0xc9c6bb, vista: 30, empuje: 3.4 },
  bruto:  { vida: 132, vel: 1.90, dano: 27, alc: 2.35, cad: 2.15, carga: 0.80, esc: 1.42,
            xp: 46, radio: 0.62, alto: 2.34, color: 0xb9b2a0, vista: 32, empuje: 6.5 },
  rey:    { vida: 460, vel: 2.35, dano: 34, alc: 3.05, cad: 1.60, carga: 0.66, esc: 1.86,
            xp: 260, radio: 0.82, alto: 3.05, color: 0xa89b7e, vista: 60, empuje: 8.5 },
};
const ESQ_TURBA = 14;             // cuántos vivos a la vez como mucho
const ESQ_ATURDE = 0.36;          // cuánto se traba al recibir un golpe
const ESQ_MUERE = 1.45;           // cuánto tarda en desarmarse

/* ── LA PROGRESIÓN ─────────────────────────────────────────────────────────
   Sube por raíz y no lineal: con lineal, el nivel 6 pide seis veces lo que
   pidió el 1 y la partida se planta a la mitad.                             */
const XP_NIVEL = n => Math.round(38 * Math.pow(n, 1.18));
const NIV_VIDA = 16;              // vida extra por nivel
const NIV_DANO = 0.085;           // daño extra por nivel, en fracción
/* ── MATAR CURA, Y ES LA PIEZA QUE FALTABA ─────────────────────────────────
   Adentro de una zona no había forma de recuperar vida: la barra sólo bajaba,
   y cualquier error se acumulaba hasta el final. Medido con el bot en tres
   semillas y ocho tandas de ajustes, moría SIEMPRE en la ceniza con nueve
   brutos y un rey de 460 por delante. Curar una fracción de lo que medía el
   muerto recompensa ir para adelante —que es para lo que están el combo y el
   esquive— y escala solo: un peón devuelve cuatro, un bruto doce.          */
const MATA_CURA = 0.115;          // fracción de la vida del muerto

/* ── LA CÁMARA ─────────────────────────────────────────────────────────── */
/* EL ENCUADRE SE MIDE, NO SE ELIGE. `__H.encuadre()` proyecta los doce huesos
   y devuelve qué fracción del alto ocupa el héroe: con 5,05 y 2,32 medía 17,2%
   centrado en el 67% —a esa altura una animación no se lee— y con 3,60 y 0,85
   mide 24,4% centrado en el 63%, que deja la mitad de arriba para el mundo. */
let CAM_D = 3.60;               // cuánto atrás
let CAM_H = 0.85;               // cuánto arriba
let CAM_MIRA = 1.30;            // a qué altura del cuerpo mira
const CAM_LADO = 0.62;            // corrida al hombro
const CAM_SUAVE = 11.5;
const CAM_MIN = 0.85;             // por debajo de esto está adentro del cuerpo

/* ── EL DIBUJO ─────────────────────────────────────────────────────────── */
const CAL = {
  baja:  { pix: 3.2, sombra: 0,    veg: 0.52, vista: 62 },
  media: { pix: 2.4, sombra: 1024, veg: 0.80, vista: 84 },
  alta:  { pix: 1.7, sombra: 2048, veg: 1.00, vista: 108 },
};

/* ── LOS TRES IDIOMAS ──────────────────────────────────────────────────────
   Las misiones y los diálogos guardan la CLAVE y no el texto: con el texto
   ya resuelto adentro, cambiar de idioma en partida deja el cartel en el
   idioma anterior hasta que su valor cambie. Costó 107 claves en Z Force.  */
const TXT = {
  es: {
    sub: 'un mini RPG de matar esqueletos',
    jugar: 'JUGAR', seguir: 'SEGUIR', menu: 'MENÚ', otra: 'OTRA VEZ', pausa: 'PAUSA',
    calidad: 'GRÁFICOS', idioma: 'IDIOMA',
    cbaja: 'BAJA', cmedia: 'MEDIA', calta: 'ALTA',
    pie: 'Caen por oleadas. Limpiá la última de una zona y se abre la siguiente. El rey espera en la ceniza.',
    piePausa: 'El mundo se queda quieto mientras esto esté abierto.',
    zbosque: 'EL BOSQUE', zruinas: 'LAS RUINAS', zceniza: 'EL CAMPO DE CENIZA',
    zbosqueS: 'donde los enterraron', zruinasS: 'lo que quedó de la abadía',
    zcenizaS: 'no crece nada desde entonces',
    restan: 'QUEDAN', restanRey: 'EL REY',
    nivel: 'NIVEL', subiste: 'NIVEL {0}',
    abre: 'SE ABRIÓ EL CAMINO', muro: 'TODAVÍA QUEDAN {0}',
    ganaste: 'EL CAMPO ESTÁ QUIETO', ganasteS: 'el rey no se levanta más',
    perdiste: 'TE CAÍSTE', perdisteS: 'los huesos siguen ahí',
    datos: 'Esqueletos {0} · Nivel {1} · {2}',
    teclas: 'WASD mover · SHIFT correr · CLIC atacar\nESPACIO esquivar · MOUSE cámara · ESC pausa',
    ola: 'OLEADA',
    olaViene: 'OLEADA {0} DE {1}',
    olaCae: 'LA OLEADA CAYÓ',
    olaUlt: 'LA ÚLTIMA',
    olaRey: 'EL REY SE LEVANTA',
    rec: 'RÉCORD',
    recNada: 'todavía no llegaste a ninguna',
    recLinea: 'Récord · {0} · {1} bajas',
    total: '{0} oleadas · 3 zonas',
    datos2: 'Oleadas {0}/{1} · Esqueletos {2} · Nivel {3} · {4}',
    d0: 'Los enterraron acá arriba y algo los volvió a parar.',
    d1: 'El camino sigue. Las piedras de la abadía están más adelante.',
    d2: 'Acá se acaba el bosque. Lo que hay adelante ya no es tierra.',
    d3: 'Algo grande se levantó al fondo de la ceniza.',
  },
  en: {
    sub: 'a small RPG about killing skeletons',
    jugar: 'PLAY', seguir: 'RESUME', menu: 'MENU', otra: 'AGAIN', pausa: 'PAUSED',
    calidad: 'GRAPHICS', idioma: 'LANGUAGE',
    cbaja: 'LOW', cmedia: 'MEDIUM', calta: 'HIGH',
    pie: 'They come in waves. Clear a zone\u2019s last one and the next opens. The king waits in the ash.',
    piePausa: 'The world stands still while this is open.',
    zbosque: 'THE WOOD', zruinas: 'THE RUINS', zceniza: 'THE ASH FIELD',
    zbosqueS: 'where they were buried', zruinasS: 'what is left of the abbey',
    zcenizaS: 'nothing has grown here since',
    restan: 'LEFT', restanRey: 'THE KING',
    nivel: 'LEVEL', subiste: 'LEVEL {0}',
    abre: 'THE WAY IS OPEN', muro: '{0} STILL STANDING',
    ganaste: 'THE FIELD IS QUIET', ganasteS: 'the king does not rise again',
    perdiste: 'YOU FELL', perdisteS: 'the bones are still there',
    datos: 'Skeletons {0} · Level {1} · {2}',
    teclas: 'WASD move · SHIFT run · CLICK attack\nSPACE dodge · MOUSE camera · ESC pause',
    ola: 'WAVE',
    olaViene: 'WAVE {0} OF {1}',
    olaCae: 'THE WAVE IS DOWN',
    olaUlt: 'THE LAST ONE',
    olaRey: 'THE KING RISES',
    rec: 'BEST',
    recNada: 'you have not reached one yet',
    recLinea: 'Best · {0} · {1} kills',
    total: '{0} waves · 3 zones',
    datos2: 'Waves {0}/{1} · Skeletons {2} · Level {3} · {4}',
    d0: 'They were buried up here, and something stood them back up.',
    d1: 'The path goes on. The abbey stones are further ahead.',
    d2: 'The wood ends here. What lies ahead is not soil any more.',
    d3: 'Something large has risen at the far end of the ash.',
  },
  pt: {
    sub: 'um mini RPG de matar esqueletos',
    jugar: 'JOGAR', seguir: 'CONTINUAR', menu: 'MENU', otra: 'DE NOVO', pausa: 'PAUSA',
    calidad: 'GRÁFICOS', idioma: 'IDIOMA',
    cbaja: 'BAIXA', cmedia: 'MÉDIA', calta: 'ALTA',
    pie: 'Vêm em ondas. Limpe a última de uma zona e a próxima se abre. O rei espera na cinza.',
    piePausa: 'O mundo fica parado enquanto isto estiver aberto.',
    zbosque: 'A MATA', zruinas: 'AS RUÍNAS', zceniza: 'O CAMPO DE CINZA',
    zbosqueS: 'onde os enterraram', zruinasS: 'o que sobrou da abadia',
    zcenizaS: 'nada cresce aqui desde então',
    restan: 'FALTAM', restanRey: 'O REI',
    nivel: 'NÍVEL', subiste: 'NÍVEL {0}',
    abre: 'O CAMINHO ABRIU', muro: 'AINDA FALTAM {0}',
    ganaste: 'O CAMPO ESTÁ QUIETO', ganasteS: 'o rei não se levanta mais',
    perdiste: 'VOCÊ CAIU', perdisteS: 'os ossos continuam lá',
    datos: 'Esqueletos {0} · Nível {1} · {2}',
    teclas: 'WASD mover · SHIFT correr · CLIQUE atacar\nESPAÇO esquivar · MOUSE câmera · ESC pausa',
    ola: 'ONDA',
    olaViene: 'ONDA {0} DE {1}',
    olaCae: 'A ONDA CAIU',
    olaUlt: 'A ÚLTIMA',
    olaRey: 'O REI SE LEVANTA',
    rec: 'RECORDE',
    recNada: 'você ainda não chegou a nenhuma',
    recLinea: 'Recorde · {0} · {1} baixas',
    total: '{0} ondas · 3 zonas',
    datos2: 'Ondas {0}/{1} · Esqueletos {2} · Nível {3} · {4}',
    d0: 'Enterraram-nos aqui em cima, e algo os pôs de pé de novo.',
    d1: 'O caminho segue. As pedras da abadia estão mais à frente.',
    d2: 'A mata acaba aqui. O que vem depois já não é terra.',
    d3: 'Algo grande se levantou no fundo da cinza.',
  },
};
/* la sonda lo pone para fotografiar un instante; vive ACÁ y no en la parte
   que lo usa, porque un `let` leído antes de su línea no devuelve undefined:
   TIRA, y se lleva el módulo entero. Van ocho veces en este repo. */
let CONGELADO = false;
let IDIOMA = 'es';
const T = (k, ...a) => {
  let s = (TXT[IDIOMA] && TXT[IDIOMA][k]) || TXT.es[k] || k;
  a.forEach((v, i) => { s = s.split('{' + i + '}').join(v); });
  return s;
};
