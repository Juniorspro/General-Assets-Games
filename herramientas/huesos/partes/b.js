/* ══════════════════════════════════════════════════════════════════════════
   HUESOS — constantes y los tres idiomas
   ══════════════════════════════════════════════════════════════════════════
   TODO NÚMERO QUE SE TOCA DOS VECES VIVE ACÁ. La lección de este repo: un
   número escrito en dos sitios se desincroniza el día que se cambia uno, y
   eso no falla — hace otra cosa.                                           */

const PASO = 1 / 60;              // el reloj de la simulación, fijo
const PASO_MAX = 8;               // cuántos pasos por cuadro antes de rendirse

/* ── EL MUNDO ──────────────────────────────────────────────────────────── */
/* CRECIÓ CON LAS ZONAS, Y SALE DE UNA CUENTA. Las zonas son anillos y el
   último llega hasta `MUNDO_R * 0.90`: con cinco dentro de 108 los dos de
   afuera quedaban de 18 y de 7 metros de ancho, y un anillo de siete metros
   no tiene dónde soltar una oleada —`puntoOla` pide entre 19 y 40 m del
   jugador— así que la zona final se soltaría siempre por el pase que afloja
   el suelo y dejaría de ser un sitio. Con 132 los cinco miden 32 · 24 · 22 ·
   22 · 19, que es lo que ocupaba cada uno cuando eran tres.               */
const MUNDO_R = 132;              // radio del mapa, en metros
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
/* ── Y LA ZONA TRAE SU PROPIA RECETA, QUE ES LO QUE PERMITE QUE HAYA CINCO ──
   `veg` dice qué familia sale en la capa alta y con qué escala, y `clases` qué
   bicho trae la oleada. Las dos vivían escritas como `if (zi === 0) … else if
   (zi === 1) … else …` adentro de `siembra` y de `claseDe`, o sea que agregar
   una zona la dejaba cayendo en el `else` de la última: el pantano se sembraba
   con ruinas de ceniza y traía brutos desde su primera oleada. Y eso NO FALLA
   —el juego arranca igual— se ve como que la zona nueva no se hizo.
   `veg` y `clases` son listas de [umbral, …] recorridas en orden con un azar
   de 0 a 1: la primera cuyo umbral lo supere es la que sale. En `clases` el
   segundo número es cuánto CORRE ese umbral con la presión de la oleada (0 la
   primera de la zona, 1 la última), que es lo que hace que la última oleada
   sea más pesada y no la misma con dos bichos más.                         */
const ZONAS = [
  { id: 'bosque',  r: 32,  suelo: 's_bosque',  niebla: 0x2c3630, nieblaD: 0.0135,
    cielo: 0x39443c, luz: 0x9fb08c, sol: 1.80, amb: 0.55, olas: [3, 4], densi: 1.00,
    veg: [[[1.00, 'arboles', 3.10, 2.60]],
          [[0.58, 'arbustos', 0.85, 0.80], [1.00, 'rocas', 0.85, 0.80]],
          [[0.50, 'plantas', 0.55, 0.55], [1.00, 'helechos', 0.55, 0.55]]],
    clases: [[0.94, 0.36, 'peon'], [1, 0, 'lancero']] },
  { id: 'pantano', r: 56,  suelo: 's_pantano', niebla: 0x1e2822, nieblaD: 0.0195,
    cielo: 0x27332a, luz: 0x8fa47e, sol: 1.62, amb: 0.52, olas: [4, 4], densi: 0.88,
    veg: [[[0.62, 'pantano', 2.50, 1.90], [1.00, 'arboles', 2.60, 1.60]],
          [[0.62, 'arbustos', 0.80, 0.70], [1.00, 'rocas', 0.70, 0.60]],
          [[0.62, 'helechos', 0.50, 0.50], [1.00, 'plantas', 0.60, 0.60]]],
    clases: [[0.70, 0.28, 'peon'], [1, 0, 'lancero']] },
  { id: 'ruinas',  r: 78,  suelo: 's_piedra',  niebla: 0x33333a, nieblaD: 0.0165,
    cielo: 0x3c3c46, luz: 0x9c9cae, sol: 1.55, amb: 0.48, olas: [4, 5], densi: 0.62,
    veg: [[[0.55, 'ruinas', 1.50, 1.30], [1.00, 'arboles', 2.40, 1.80]],
          [[0.42, 'arbustos', 0.75, 0.70], [1.00, 'rocas', 0.90, 0.85]],
          [[0.62, 'rocas', 0.30, 0.28], [1.00, 'plantas', 0.45, 0.45]]],
    clases: [[0.42, 0.22, 'peon'], [0.86, 0.22, 'lancero'], [1, 0, 'bruto']] },
  /* EL OSARIO ES EL ÚNICO QUE ACLARA, Y ES A PROPÓSITO. Las otras cuatro van
     de menos a más niebla, y con la quinta siguiendo la escalera el tramo
     entero se lee a un solo sitio que se va apagando. Un campo de huesos es
     abierto y pálido: se ve lejos, y por eso la ceniza que viene después pega. */
  { id: 'osario',  r: 100, suelo: 's_osario',  niebla: 0x413d35, nieblaD: 0.0128,
    cielo: 0x4a4539, luz: 0xc9c2ab, sol: 1.72, amb: 0.54, olas: [5, 5], densi: 0.46,
    veg: [[[0.66, 'osario', 1.40, 1.20], [1.00, 'ruinas', 1.30, 1.00]],
          [[0.30, 'arbustos', 0.70, 0.60], [1.00, 'rocas', 0.85, 0.80]],
          [[0.70, 'rocas', 0.26, 0.24], [1.00, 'plantas', 0.40, 0.40]]],
    clases: [[0.34, 0.20, 'peon'], [0.80, 0.24, 'lancero'], [1, 0, 'bruto']] },
  { id: 'ceniza',  r: 999, suelo: 's_ceniza',  niebla: 0x2a2724, nieblaD: 0.0210,
    cielo: 0x35312c, luz: 0xb8a894, sol: 1.34, amb: 0.40, olas: [5, 6, 'rey'], densi: 0.34,
    veg: [[[0.72, 'ruinas', 1.30, 1.10], [1.00, 'arboles', 2.20, 1.20]],
          [[0.34, 'arbustos', 0.70, 0.65], [1.00, 'rocas', 0.90, 0.90]],
          [[0.74, 'rocas', 0.28, 0.26], [1.00, 'plantas', 0.42, 0.42]]],
    clases: [[0.30, 0.22, 'lancero'], [1, 0, 'bruto']] },
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
/* ── LA ECONOMÍA SE VOLVIÓ A MEDIR AL PASAR DE 7 OLEADAS A 11 ──────────────
   Los tres números estaban tuneados contra tres zonas y siete oleadas: con
   cinco y once, la cura por oleada dispara 7 veces en vez de 4 y el punto de
   control 4 en vez de 2. Medido con el auto-jugador honesto sobre doce
   semillas, con los números viejos y con éstos:

     cura  olaXP  zonaXP │ gana      nivel  vida al terminar
     0,28  0,45   1,0    │ 12 de 12   10,2   225   ← lo que había
     0,28  0,45   0,5    │ 10 de 10    9,4   201
     0,20  0,32   0,5    │ 11 de 12    8,8   176   ← esto
     0,20  0,28   0,35   │  8 de 10    7,6   136

   Lo que no es ruido es la ÚLTIMA COLUMNA: cuánto margen le queda al que
   termina. Con los números viejos el bot cerraba las once oleadas con el 94 %
   de la vida puesta, o sea sin haber estado nunca en peligro — y nadie pidió
   un juego más fácil, se pidieron más mapas. */
let OLA_CURA = 0.20;              // fracción de vida que devuelve limpiar una
let OLA_XP = 0.32;                // y fracción del nivel que paga limpiarla
/* ── LO QUE PAGA CERRAR UNA ZONA, Y POR QUÉ AHORA ES UN NÚMERO ─────────────
   Era `jugGanaXp(JUG.xpSig - JUG.xp)` escrito derecho en el código, o sea un
   nivel entero, y estaba tuneado cuando había TRES zonas: dos regalos. Con
   cinco son cuatro, y eso se mide — el auto-jugador honesto pasó de terminar
   nivel 6 perdiendo una de ocho a terminar nivel 10 ganando las ocho con el
   94 % de la vida puesta. Nadie pidió un juego más fácil: se pidieron más
   mapas. Va como fracción para poder barrerla. */
let ZONA_XP = 0.5;                // niveles que regala cerrar una zona
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

/* ── LA FURIA REEMPLAZA AL AGUANTE, Y NO ES EL MISMO NÚMERO CON OTRO NOMBRE ─
   El aguante CASTIGA: baja sola al correr, corta el combo en el medio y hace
   que el botón de esquivar diga «no» justo cuando hace falta. Y lo peor no es
   que moleste sino QUÉ premia: administrar una barra es no pelear. La furia
   PAGA — sube pegando, sube matando, sube incluso cuando te pegan a vos, y lo
   único que se puede hacer con ella es gastarla en el remate. Es la misma
   barra, en el mismo sitio del HUD, y significa lo contrario.
   SE ENFRÍA CUANDO NO HAY NADIE CERCA y no todo el tiempo: enfriándose en
   plena pelea vuelve a ser una barra que hay que administrar, y entre oleada
   y oleada, sin enfriamiento, se llega a la siguiente con el remate cargado
   de arriba —o sea gratis—.                                                */
const J_FUR = 100;
const J_FUR_GOLPE = 7.0;          // por golpe que ACIERTA; los que fallan no pagan
const J_FUR_BAJA = 15;            // por esqueleto abajo
const J_FUR_RECIBE = 6;           // recibir también carga: perder no es sólo perder
const J_FUR_FUGA = 3.4;           // por segundo, y sólo sin nadie a menos de 14 m
const J_FUR_FRIO = 14;            // ese radio

const J_ESQ_V = 12.6;             // velocidad del esquive
const J_ESQ_T = 0.34;             // cuánto dura
/* CUÁNTO DURA LA INVULNERABILIDAD SALE DE UNA CUENTA, no del gusto. El aviso
   del bicho termina y el hachazo cae `0,38 × 0,42 = 0,16 s` después. Con 0,24
   de intocable había que apretar dentro de una ventana de 0,08 s — y medido,
   el bot no esquivó UN SOLO golpe en ocho corridas. Con 0,30 la ventana es de
   0,14 s: sigue pidiendo el tiempo justo y se puede acertar con un pulgar. */
const J_ESQ_INV = 0.30;
const J_ESQ_ESPERA = 0.52;

/* ── LA RUEDA: LO MISMO QUE EL ESQUIVE NO SERÍA UNA HABILIDAD MÁS ──────────
   Un segundo esquive con otro nombre es un botón repetido. Lo que separa a
   los dos es QUÉ CUESTA: el esquive es corto, intocable sólo al principio y
   se recupera enseguida —el botón del pánico, se aprieta sin pensar—; la
   rueda dura casi el doble, llega a más del doble de distancia, es intocable
   durante casi todo el recorrido y se paga con una espera larga. O sea que
   una es reacción y la otra es COMPROMISO, que es la decisión que un esquive
   solo no puede pedir.
   Y NO HAY BOTÓN NUEVO: la rueda es el esquive CON IMPULSO. Se rueda cuando
   ya se venía moviendo rápido, que es además lo que hace un cuerpo de verdad
   —nadie rueda desde parado— y lo hace descubrible sin un cartel: el que
   corre y esquiva la encuentra sola. En un teléfono con dos botones de pelea,
   un tercero para esto sería el que nadie aprieta.                         */
const J_ROD_V = 15.5;             // velocidad de la rueda
const J_ROD_T = 0.62;             // cuánto dura
const J_ROD_INV = 0.46;           // intocable durante casi todo, no sólo al entrar
const J_ROD_ESPERA = 0.86;        // y la espera es lo que la hace un compromiso
const J_ROD_MIN = J_VEL * 1.10;   // a partir de qué velocidad el esquive es rueda

/* ── EL REMATE ─────────────────────────────────────────────────────────────
   Es lo único del juego que le saca el control al jugador, y por eso tiene
   que valer la pena: salta de verdad —es el único momento del juego con los
   dos pies en el aire—, el mundo se agacha a un tercio mientras está arriba,
   y al caer parte el suelo. Los tiempos son de ESTE MOVIMIENTO y no de un
   número redondo: el salto tiene que durar lo suficiente para que se lea el
   arco, la caída tiene que ser MÁS CORTA que la subida —una caída lenta se
   lee a flotar— y el impacto tiene que ser un instante.                   */
const J_REM_T = [0.34, 0.24, 0.12, 0.36];   // salto · caída · impacto · fin
const J_REM_ALTO = 3.1;           // el ápice del arco, en metros
const J_REM_ALC = 8.0;            // hasta dónde busca a quién saltarle encima
const J_REM_R = 3.6;              // el radio del golpe al caer
/* ── EL FOGONAZO Y LAS LÍNEAS SE ELIGEN MIDIENDO LA PANTALLA ───────────────
   El post hace `mix(color, blanco, uFogo)`, así que el fogonazo tapa la escena
   entera y es exactamente lo que el fogonazo NO tiene que hacer: subraya el
   golpe borrando lo que hay que ver. Barrido sobre el búfer de pantalla —no el
   del mundo, que es anterior al post y no lo puede ver— con la escena de fondo
   en 44,9 de luminancia media:

     uFogo   0,16 → 78,5 · 3,1 % de píxeles blancos
             0,30 → 107,9 · 3,2 %      ← acá
             0,75 → 202,5 · 63,2 %
             0,92 → 238,2 · 100 %      ← lo que había: pantalla blanca entera

   0,34 deja la media en 2,4 veces la del fondo sin mover el porcentaje de
   blanco: se lee a golpe y no a corte a blanco. Las líneas, igual: a 1,00 el
   32 % de la pantalla se va a blanco y a 0,55 el 2,8 %.                    */
const J_REM_FOGO = 0.34;
const J_REM_LINEAS = 0.55;
const J_REM_DANO = 104;           // barre, así que es UN golpe para toda la turba
const J_REM_EMPUJE = 12.0;
const J_REM_LENTO = 0.32;         // a cuánto se agacha el mundo mientras está arriba

/* el combo de tres: cada golpe con su ventana, su alcance y su daño */
const J_COMBO = [
  { carga: 0.13, activo: 0.11, fin: 0.30, alc: 2.05, arco: 1.35, dano: 22, empuje: 3.2 },
  { carga: 0.11, activo: 0.10, fin: 0.28, alc: 2.10, arco: 1.50, dano: 24, empuje: 3.4 },
  { carga: 0.19, activo: 0.14, fin: 0.44, alc: 2.45, arco: 2.10, dano: 41, empuje: 7.0 },
];
const J_COMBO_VENTANA = 0.46;     // desde que termina un golpe para encadenar
/* CUÁNTO VIVE UN TOQUE EN LA COLA. Un arco entero mide 0,54 s: con menos de
   media ventana el toque que cae al principio del golpe se pierde igual, y
   con mucho más el héroe ataca solo dos segundos después de haber soltado. */
const J_BUF = 0.34;
/* A/B EN EL MISMO BINARIO. Una mejora contada contra el recuerdo no es una
   medición: `__H.viejo(true)` devuelve la regla anterior —encadenar sólo con
   el arco terminado y tirar el toque que caiga en el medio— para poder medir
   las dos con el mismo código y la misma semilla. */
let COMBO_VIEJO = false;
/* y lo mismo para lo que SÍ toca la pelea: la asistencia de puntería, el
   freno del impacto y que el esquive no gire el cuerpo. Sin poder apagarlos
   en el mismo binario, «el bot pasó de 5 a 7» no dice cuál de los tres fue. */
let PELEA_VIEJA = false, SIN_ASIST = false, ESQ_VIEJO = false;
/* y lo mismo para los dos de esta vuelta. El bot honesto pasó de 11 de 12 a
   12 de 12 y hay DOS cambios encima: la rueda —que es esquivar más lejos— y
   el remate. Sin poder apagarlos por separado en el mismo binario, «mejoró»
   no dice cuál de los dos fue, y encima podría ser que uno solo bastara. */
let SIN_REMATE = false, SIN_RUEDA = false;
/* cuánto dura el fundido entre dos poses de un esqueleto */
const ESQ_FUNDE = 0.16;
/* la asistencia de puntería: cuánto se corrige y dentro de qué arco se busca
   blanco. Es asistencia y no apuntado automático — el tope es lo que deja la
   decisión de a quién pegarle del lado del jugador. */
const J_ASIST = 0.42;             // rad = 24° de corrección como mucho
const J_ASIST_ARCO = 1.15;        // rad = ±66° donde se busca
const J_GIRO_CARGA = 7.0;         // cuánto se puede reorientar juntando el golpe
/* EL FRENO DEL IMPACTO. Tres cuadros de nada es lo que separa «el arco pasó
   por encima» de «le pegué»: sin freno, el tajo y el aire se ven igual. Y el
   remate se lleva casi el doble, porque es el que tiene que sentirse. */
const HIT_STOP = 0.050;
const HIT_STOP_REMATE = 0.090;

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
    pie: 'Caen por oleadas. Limpiá la última de una zona y se abre la siguiente. El rey espera en la ceniza.\nEsquivar corriendo es rodar. Pegando se carga la furia, y llena sale el remate.',
    piePausa: 'El mundo se queda quieto mientras esto esté abierto.',
    zbosque: 'EL BOSQUE', zpantano: 'EL PANTANO', zruinas: 'LAS RUINAS',
    zosario: 'EL OSARIO', zceniza: 'EL CAMPO DE CENIZA',
    zbosqueS: 'donde los enterraron', zpantanoS: 'el agua nunca se fue',
    zruinasS: 'lo que quedó de la abadía', zosarioS: 'los sacaron de la abadía',
    zcenizaS: 'no crece nada desde entonces',
    restan: 'QUEDAN', restanRey: 'EL REY',
    nivel: 'NIVEL', subiste: 'NIVEL {0}',
    abre: 'SE ABRIÓ EL CAMINO', muro: 'TODAVÍA QUEDAN {0}',
    ganaste: 'EL CAMPO ESTÁ QUIETO', ganasteS: 'el rey no se levanta más',
    perdiste: 'TE CAÍSTE', perdisteS: 'los huesos siguen ahí',
    datos: 'Esqueletos {0} · Nivel {1} · {2}',
    teclas: 'WASD mover · SHIFT correr · CLIC atacar · Q remate\nESPACIO esquivar (corriendo: rodar) · MOUSE cámara · ESC pausa',
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
    d1: 'El bosque se hunde. El agua nunca se fue de acá.',
    d2: 'Las piedras de la abadía. Todavía huele a quemado.',
    d3: 'Los sacaron de la abadía y los apilaron acá. Nadie los volvió a enterrar.',
    d4: 'Acá se acaba todo. Lo que hay adelante ya no es tierra.',
    dRey: 'Algo grande se levantó al fondo de la ceniza.',
  },
  en: {
    sub: 'a small RPG about killing skeletons',
    jugar: 'PLAY', seguir: 'RESUME', menu: 'MENU', otra: 'AGAIN', pausa: 'PAUSED',
    calidad: 'GRAPHICS', idioma: 'LANGUAGE',
    cbaja: 'LOW', cmedia: 'MEDIUM', calta: 'HIGH',
    pie: 'They come in waves. Clear a zone\u2019s last one and the next opens. The king waits in the ash.\nDodge while running to roll. Hitting builds rage; when it is full, the finisher is yours.',
    piePausa: 'The world stands still while this is open.',
    zbosque: 'THE WOOD', zpantano: 'THE MARSH', zruinas: 'THE RUINS',
    zosario: 'THE BONEYARD', zceniza: 'THE ASH FIELD',
    zbosqueS: 'where they were buried', zpantanoS: 'the water never drained',
    zruinasS: 'what is left of the abbey', zosarioS: 'they were dug out of the abbey',
    zcenizaS: 'nothing has grown here since',
    restan: 'LEFT', restanRey: 'THE KING',
    nivel: 'LEVEL', subiste: 'LEVEL {0}',
    abre: 'THE WAY IS OPEN', muro: '{0} STILL STANDING',
    ganaste: 'THE FIELD IS QUIET', ganasteS: 'the king does not rise again',
    perdiste: 'YOU FELL', perdisteS: 'the bones are still there',
    datos: 'Skeletons {0} · Level {1} · {2}',
    teclas: 'WASD move · SHIFT run · CLICK attack · Q finisher\nSPACE dodge (running: roll) · MOUSE camera · ESC pause',
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
    d1: 'The wood sinks. The water never drained out of here.',
    d2: 'The abbey stones. It still smells burnt.',
    d3: 'They were dug out of the abbey and piled here. Nobody buried them again.',
    d4: 'Everything ends here. What lies ahead is not soil any more.',
    dRey: 'Something large has risen at the far end of the ash.',
  },
  pt: {
    sub: 'um mini RPG de matar esqueletos',
    jugar: 'JOGAR', seguir: 'CONTINUAR', menu: 'MENU', otra: 'DE NOVO', pausa: 'PAUSA',
    calidad: 'GRÁFICOS', idioma: 'IDIOMA',
    cbaja: 'BAIXA', cmedia: 'MÉDIA', calta: 'ALTA',
    pie: 'Vêm em ondas. Limpe a última de uma zona e a próxima se abre. O rei espera na cinza.\nEsquivar correndo é rolar. Bater carrega a fúria, e cheia sai o remate.',
    piePausa: 'O mundo fica parado enquanto isto estiver aberto.',
    zbosque: 'A MATA', zpantano: 'O PÂNTANO', zruinas: 'AS RUÍNAS',
    zosario: 'O OSSÁRIO', zceniza: 'O CAMPO DE CINZA',
    zbosqueS: 'onde os enterraram', zpantanoS: 'a água nunca escoou',
    zruinasS: 'o que sobrou da abadia', zosarioS: 'tiraram-nos da abadia',
    zcenizaS: 'nada cresce aqui desde então',
    restan: 'FALTAM', restanRey: 'O REI',
    nivel: 'NÍVEL', subiste: 'NÍVEL {0}',
    abre: 'O CAMINHO ABRIU', muro: 'AINDA FALTAM {0}',
    ganaste: 'O CAMPO ESTÁ QUIETO', ganasteS: 'o rei não se levanta mais',
    perdiste: 'VOCÊ CAIU', perdisteS: 'os ossos continuam lá',
    datos: 'Esqueletos {0} · Nível {1} · {2}',
    teclas: 'WASD mover · SHIFT correr · CLIQUE atacar · Q remate\nESPAÇO esquivar (correndo: rolar) · MOUSE câmera · ESC pausa',
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
    d1: 'A mata afunda. A água nunca escoou daqui.',
    d2: 'As pedras da abadia. Ainda cheira a queimado.',
    d3: 'Tiraram-nos da abadia e empilharam-nos aqui. Ninguém os enterrou de novo.',
    d4: 'Aqui acaba tudo. O que vem depois já não é terra.',
    dRey: 'Algo grande se levantou no fundo da cinza.',
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
