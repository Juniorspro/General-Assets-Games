
/* ══════════════════════════ LA LUZ ══════════════════════════
   Una sola linterna que va en la cámara, y nada más. En un pasillo negro la luz
   ES el mapa: lo que la linterna no toca no existe, y por eso una esquina puede
   esconder cualquier cosa a un metro. */
/* ── 26 CANDELAS ERA UNA LINTERNA DE OBRA ──
   Con las paredes dibujadas por código no se notaba: un gris plano aguanta
   cualquier luz. Con la foto del revoque, 26 a un metro devolvía un muro blanco
   quemado de punta a punta y el pasillo dejaba de tener oscuridad, que es su
   único material. 12 deja el charco de luz a dos metros y el resto en negro. */
/* ── EL NÚMERO QUE MANDA NO ES LA INTENSIDAD, ES `decay` ──
   Con 26 y decay 1,25 la pared de un metro salía blanca quemada y a los seis
   metros no llegaba nada: 26/1^1,25 = 26 contra 26/6^1,25 = 2,8. Bajar la
   intensidad a 12 arregló lo quemado y dejó el pasillo NEGRO — medido con
   `brillo()`, 30,6 de brillo medio y 23 % de pantalla encendida en tres puntos
   distintos, o sea un charco de dos metros y después nada.
   Las dos cosas son el mismo defecto: un rango dinámico demasiado empinado. Con
   decay 0,90 la caída de uno a seis metros pasa de 9,3 veces a 5,1, así que
   entra el pasillo entero sin quemar lo de cerca. Y sí, físicamente una luz cae
   con el cuadrado; una linterna en un juego de terror tiene que MOSTRAR el
   pasillo, y ése es el trabajo. */
/* el ángulo subió de 0,66 a 0,88 rad al pasar el juego a horizontal: el campo
   pasó de 33° a 93° de ancho y un cono de 76° dejaba los dos tercios laterales
   del cuadro en negro. Una linterna no ilumina todo lo que se ve, pero tampoco
   una franja en el medio. */
const luz = new T.SpotLight(0xffe9cf, 22, 22, 0.88, 0.55, 0.90);
luz.position.set(0.05, -0.12, 0);
luz.target.position.set(0, -0.18, -1);
luz.castShadow = true;
luz.shadow.mapSize.set(1024, 1024);
luz.shadow.camera.near = 0.1; luz.shadow.camera.far = 16;
luz.shadow.bias = -0.0022; luz.shadow.normalBias = 0.028;
cam.add(luz); cam.add(luz.target);
/* la luz de la capa 2: sólo la tabla, el bol y el agua. Va un poco a la
   izquierda y arriba para que el bol tenga un lado iluminado y otro en sombra —
   con la luz en el eje el bol queda plano y no se ve cuánto se está yendo. */
const luzTabla = new T.PointLight(0xffe3c4, 1.15, 2.4, 1.0);
luzTabla.position.set(-0.16, 0.10, -0.05);
luzTabla.layers.set(2);
cam.add(luzTabla);
/* ── Y LOS SUSTOS QUE SON MODELO TAMBIÉN TIENEN SU LUZ ──
   Están a dos metros y medio, o sea al final del alcance útil de la linterna:
   medido en la captura, cuatro de seis figuras salían como un bulto oscuro
   sobre un pasillo oscuro y no se leía ni que había alguien. Subirle la
   intensidad a la linterna arreglaría el susto y quemaría el pasillo, que es el
   mismo empate en el que ya caí dos veces con esta luz.
   Con la capa 3 aparte se puede iluminar SÓLO al susto: un cono tenue, sin
   sombra —no hay nada que la reciba en esa capa— y con caída suave, así la
   figura se lee a cualquier distancia sin tocar un pixel del pasillo. Que el
   susto se vea no es una concesión: un susto que no se ve es un susto que no
   pasó. */
const luzSusto = new T.SpotLight(0xfff2e2, 9.5, 9, 1.00, 0.62, 0.55);
luzSusto.position.set(0, 0.10, 0);
luzSusto.target.position.set(0, -0.30, -1);
luzSusto.layers.set(3);
cam.add(luzSusto); cam.add(luzSusto.target);
/* un piso mínimo para que lo que está fuera del cono no sea negro absoluto: sin
   esto no se ve NADA a los costados y el pasillo deja de tener ancho */
const amb = new T.HemisphereLight(0x33383f, 0x14120f, 0.32);
amb.layers.enable(2);            /* el ambiente sí llega a la tabla */
amb.layers.enable(3);            /* y a los sustos que son modelo */
escena.add(amb);

/* ══════════════════════════ LOS SUSTOS ══════════════════════════
   Cuarenta y cuatro, y lo que los hace cuarenta y cuatro no son cuarenta y
   cuatro assets: son SIETE FAMILIAS combinadas con dónde y cuándo pasan. Un catálogo de treinta
   y dos assets distintos sería medio mega de descarga para cosas que se ven
   0,4 segundos; lo que el jugador recuerda no es la cara, es el susto.

   Y ACÁ ESTÁ LA REGLA QUE LOS ORDENA A TODOS: un susto tiene que producir un
   RESPINGO, no un problema. No te toca, no te frena, no te empuja. Lo único que
   hace es lograr que tu mano se mueva sola — y de eso se encarga el giroscopio.
   Un susto que además te empujara sería castigarte dos veces por lo mismo. */
const SUS_FAM = ['cara', 'sombra', 'golpe', 'luz', 'bicho', 'susurro', 'modelo'];
const SUSTOS = [];
function armaCatalogo(){
  SUSTOS.length = 0;
  let id = 0;
  /* cada familia con sus variantes: dónde aparece, cuánto dura, qué fuerza tiene
     y si suena. La fuerza es lo único que el resto del juego lee. */
  const V = [
    /* fam,      dónde,        dur,  fuerza, sonido,     luz */
    ['cara',    'frente',      0.42, 1.00, 'grito',    'apaga'],
    ['cara',    'costadoI',    0.34, 0.86, 'grito',    'no'],
    ['cara',    'costadoD',    0.34, 0.86, 'grito',    'no'],
    ['cara',    'abajo',       0.40, 0.94, 'grito',    'parpadea'],
    ['cara',    'techo',       0.46, 0.98, 'grito',    'apaga'],
    ['cara',    'esquina',     0.30, 0.90, 'grito',    'no'],
    ['cara',    'atras',       0.55, 0.80, 'susurro',  'no'],
    ['sombra',  'frente',      0.90, 0.52, 'nada',     'no'],
    ['sombra',  'costadoI',    0.80, 0.46, 'nada',     'no'],
    ['sombra',  'costadoD',    0.80, 0.46, 'nada',     'no'],
    ['sombra',  'cruza',       0.70, 0.62, 'paso',     'no'],
    ['sombra',  'techo',       1.00, 0.44, 'nada',     'no'],
    ['sombra',  'esquina',     0.60, 0.70, 'nada',     'parpadea'],
    ['golpe',   'puerta',      0.20, 0.88, 'portazo',  'no'],
    ['golpe',   'pared',       0.16, 0.74, 'golpe',    'no'],
    ['golpe',   'techo',       0.18, 0.80, 'golpe',    'polvo'],
    ['golpe',   'atras',       0.16, 0.82, 'golpe',    'no'],
    ['golpe',   'caida',       0.30, 0.68, 'metal',    'no'],
    ['golpe',   'vidrio',      0.26, 0.92, 'vidrio',   'no'],
    ['luz',     'apagon',      1.10, 0.58, 'chispa',   'apaga'],
    ['luz',     'parpadeo',    0.90, 0.50, 'zumbido',  'parpadea'],
    ['luz',     'fogonazo',    0.14, 0.72, 'chispa',   'fogonazo'],
    ['luz',     'rojo',        0.80, 0.44, 'zumbido',  'rojo'],
    ['bicho',   'piso',        0.60, 0.56, 'chirrido', 'no'],
    ['bicho',   'pared',       0.55, 0.60, 'chirrido', 'no'],
    ['bicho',   'tabla',       0.70, 0.96, 'chirrido', 'no'],
    ['bicho',   'enjambre',    1.00, 0.66, 'chirrido', 'no'],
    ['susurro', 'oidoI',       0.90, 0.64, 'susurro',  'no'],
    ['susurro', 'oidoD',       0.90, 0.64, 'susurro',  'no'],
    ['susurro', 'nombre',      1.20, 0.70, 'susurro',  'no'],
    ['susurro', 'risa',        1.00, 0.66, 'risa',     'no'],
    ['susurro', 'respira',     1.40, 0.42, 'respira',  'no'],
    /* ── LA SÉPTIMA FAMILIA: LOS QUE SON UN MODELO 3D ──
       Doce, y el catálogo pasa de 32 a 44. Se pidieron «más sustos, incluso de
       modelos 3D que aparecen de la nada», y ése es exactamente el hueco que
       quedaba: las seis familias de antes o dibujaban un plano o no dibujaban
       nada, así que ningún susto tenía VOLUMEN. Una cosa con volumen a metro y
       medio, con la linterna moviéndose encima, es de otra categoría — y por eso
       éstos duran más (0,55 a 1,20 s): un plano hay que sacarlo rápido antes de
       que se note que es un plano, y un modelo aguanta que lo mires.
       El séptimo campo es la clave del modelo y el octavo su altura en metros. */
    ['modelo',  'frente',      0.70, 1.00, 'grito',    'apaga',    'colgado',  1.85],
    ['modelo',  'bulto',       0.90, 0.78, 'susurro',  'no',       'encorvado',1.45],
    ['modelo',  'rincon',      0.65, 0.86, 'grito',    'parpadea', 'encorvado',1.70],
    ['modelo',  'asoma',       0.60, 0.90, 'grito',    'no',       'colgado',  1.80],
    ['modelo',  'cruza',       0.80, 0.72, 'paso',     'no',       'perro',    0.85],
    ['modelo',  'piso',        1.00, 0.68, 'chirrido', 'no',       'perro',    0.80],
    ['modelo',  'encima',      0.75, 0.94, 'grito',    'apaga',    'colgado',  1.60],
    ['modelo',  'cuelga',      1.20, 0.62, 'metal',    'no',       'colgado',  1.55],
    ['modelo',  'costadoI',    0.55, 0.88, 'grito',    'no',       'encorvado',1.75],
    ['modelo',  'costadoD',    0.55, 0.88, 'grito',    'no',       'perro',    0.90],
    ['modelo',  'esquina',     0.62, 0.96, 'grito',    'rojo',     'encorvado',1.80],
    ['modelo',  'puerta',      0.85, 0.80, 'portazo',  'no',       'colgado',  1.90]
  ];
  for (const v of V)
    SUSTOS.push({ id: id++, fam: v[0], donde: v[1], dur: v[2], fuerza: v[3],
                  son: v[4], luz: v[5], modelo: v[6], alto: v[7] });
  return SUSTOS.length;
}

/* ── LA AGENDA: DÓNDE CAE CADA SUSTO ──
   No se sortean al azar mientras se camina. Se reparten ANTES sobre el largo
   del pasillo, con dos reglas que son las que hacen que asuste:

     · NUNCA DOS SEGUIDOS A MENOS DE `SUS_SEP` METROS. Sin eso el azar apila
       tres en cinco metros, el jugador se acostumbra en diez segundos y el
       resto del pasillo es un trámite.
     · Y LOS PRIMEROS `SUS_PAZ` METROS NO TIENEN NINGUNO. Los primeros diez
       segundos el jugador está aprendiendo a no volcar el bol; un susto ahí es
       cobrarle algo que todavía no puede pagar.

   Y la separación se ACHICA con la distancia: al principio uno cada catorce
   metros, al final uno cada cinco. Es la única curva de dificultad que tiene el
   juego y no hace falta otra. */
const SUS_PAZ = 12;
const AGENDA = [];
function armaAgenda(){
  AGENDA.length = 0;
  const pocos = CFG.sustos === 'pocos';
  let d = SUS_PAZ + rr(2, 6);
  const usados = [];
  while (d < LARGO_TOTAL - 6){
    const u = d / LARGO_TOTAL;
    const sep = (14 - u*9) * (pocos ? 1.8 : 1);
    /* no repetir uno hasta que hayan pasado ocho: repetir el mismo susto lo mata */
    let s, intento = 0;
    do { s = SUSTOS[(rnd()*SUSTOS.length)|0]; intento++; }
    while (usados.indexOf(s.id) >= 0 && intento < 30);
    usados.push(s.id); if (usados.length > 8) usados.shift();
    AGENDA.push({ d, s, hecho: false });
    d += sep * rr(0.75, 1.35);
  }
  return AGENDA.length;
}
