/* ============================================================
   SUX SANDBOX — PROPS DE LOS 25 EXPERIMENTOS DE CIRCUITOS (core_x.js)
   ------------------------------------------------------------
   POR QUÉ ESTÁN ACÁ Y NO EN XP.add({parts:[...]})
   Porque así los revisa validate.js igual que los otros 398 props (medidas, materiales,
   masas, ids y nombres únicos) y porque quedan en SU carpeta del menú de spawn ("Circuitos")
   en vez de caer todos juntos en "Varios". El tab dice 'ent' porque validate.js sólo acepta
   acc|veh|ent; core_u.js mueve toda sección cuyo id empiece con 'xp' a la pestaña
   Experimentos (ver el encabezado de props/experiments.js).

   CRITERIO DE DISEÑO DE LA GEOMETRÍA
   Un circuito se arma MIRANDO el suelo del sandbox, así que cada pieza tiene que decir qué es
   de un vistazo y sin leer el nombre:
   - las ENTRADAS (pulsador, palanca, sensores, reloj) son cosas que se aprietan o miran: botón
     de hongo rojo, palanca inclinada con perilla, cabeza de sensor con ojo, placa de piso.
   - las COMPUERTAS comparten un mismo chasis (base + columna + 2 patas de entrada azules atrás
     + 1 pata de salida ámbar adelante + testigo de neón arriba) y se diferencian por la FORMA
     del cuerpo, copiando el símbolo de toda la vida: AND = rectángulo con la punta redonda,
     OR = punta en cuña, NOT = triángulo + burbuja, XOR = cuña con una barra extra atrás.
     Como el chasis es idéntico, en una mesa de trabajo se leen como una familia.
   - las SALIDAS son máquinas: farola, sirena, marco de puerta, plataforma, cinta, grúa,
     turbina, plataforma de teletransporte, lanzallamas, torreta.
   Las piezas que se MUEVEN (hojas de la puerta, pluma y gancho de la grúa, cabeza de la
   torreta, tapa de la placa de presión) NO están acá: un prop es UN cuerpo rígido y no se
   puede animar por partes, así que core_x.js las crea como mallas + cuerpos cinemáticos
   propios cuando el experimento arranca. Por eso el marco de la puerta viene sin hojas y la
   torreta sin cabeza: se las pone el experimento (arrancan con auto:true, o sea que aparecen
   en el mismo momento en que spawneás el prop).
   nc:1 = la parte se dibuja pero no colisiona (testigos de neón, tapas, lentes): la física es
   la caja del cuerpo, que ya alcanza, y así el circuito no traba al personaje que se le acerca
   a tocar el panel.
   ============================================================ */

HP.section('xpx_circ','Circuitos','ent',[

  /* ============ 51. FUENTE DE ENERGÍA ============
     Batería de auto grande: carcasa negra, tapa metálica, dos bornes (+ rojo, − azul) y una
     tira de neón que core_x.js usa como indicador de carga. */
  { id:'xpx_batt', name:'Bateria Bloque', mass:120, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.92,.52,.62], p:[0,.26,0],    m:'plastic', c:0x1d2126},
      {s:'box', d:[.96,.07,.66], p:[0,.55,0],    m:'metal',   c:0x4a5158},
      {s:'cyl', d:[.075,.16],    p:[-.28,.66,0], m:'metal',   c:0xd23a2e},
      {s:'cyl', d:[.075,.16],    p:[.28,.66,0],  m:'metal',   c:0x2e6bd2},
      {s:'box', d:[.62,.10,.03], p:[0,.44,.32],  m:'plastic', c:0x0d1014, nc:1},
      {s:'box', d:[.44,.09,.03], p:[0,.24,.32],  m:'neon',    c:0x7dff8a, nc:1},
  ]},

  /* ============ 52. CABLE ============
     Carrete de obra sobre caballete: dos discos de madera, eje, rollo de goma y una punta de
     cable con ficha apoyada en el piso. El cable de verdad (el que se dibuja entre dos props)
     lo genera core_x.js con un InstancedMesh. */
  { id:'xpx_wire', name:'Carrete Cable', mass:46, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.60,.07,.52], p:[0,.035,0],   m:'metal',  c:0x40464d},
      {s:'cyl', d:[.42,.06],     p:[-.19,.47,0], m:'plank',  c:0x8a6a45, r:[0,0,90]},
      {s:'cyl', d:[.42,.06],     p:[.19,.47,0],  m:'plank',  c:0x8a6a45, r:[0,0,90]},
      {s:'cyl', d:[.30,.34],     p:[0,.47,0],    m:'rubber', c:0x1b1e22, r:[0,0,90]},
      {s:'cyl', d:[.075,.50],    p:[0,.47,0],    m:'metal',  c:0x9aa2a9, r:[0,0,90]},
      /* la punta del cable va como CAJA fina, no como cilindro acostado: validate.js calcula el
         AABB SIN rotar y un cilindro de 44 cm tumbado le parece un poste hundido 17 cm bajo el
         piso (aviso "arranca en y=-0.17"). Con una caja el AABB coincide con la realidad. */
      {s:'box', d:[.44,.05,.05], p:[.30,.03,.22],m:'rubber', c:0x25292e, r:[0,18,0]},
      {s:'box', d:[.09,.07,.06], p:[.30,.05,.44],m:'metal',  c:0xc8ad4a},
  ]},

  /* ============ 53. PULSADOR ============
     Botón de hongo rojo sobre pedestal, con aro de neón: manda señal MIENTRAS se aprieta. */
  { id:'xpx_btn', name:'Pulsador Rojo', mass:30, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.50,.10,.50], p:[0,.05,0],  m:'metal',   c:0x3c4249},
      {s:'cyl', d:[.09,.56],     p:[0,.38,0],  m:'metal',   c:0x848c94},
      {s:'cyl', d:[.20,.14],     p:[0,.73,0],  m:'plastic', c:0xd8b62c},
      {s:'cyl', d:[.16,.10],     p:[0,.85,0],  m:'plastic', c:0xd0342a},
      {s:'cyl', d:[.215,.025],   p:[0,.805,0], m:'neon',    c:0xff8a5a, nc:1},
  ]},

  /* ============ 54. INTERRUPTOR DE PALANCA ============
     Caja de pared con palanca inclinada y perilla: queda ENCENDIDO (biestable). Los dos
     puntitos de neón son los testigos ON/OFF que enciende core_x.js. */
  { id:'xpx_sw', name:'Palanca Switch', mass:26, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.46,.12,.40], p:[0,.06,0],    m:'metal',   c:0x3c4249},
      {s:'box', d:[.42,.34,.30], p:[0,.29,0],    m:'metal',   c:0x59616a},
      {s:'box', d:[.36,.24,.03], p:[0,.30,.16],  m:'plastic', c:0x20242a, nc:1},
      {s:'cyl', d:[.045,.40],    p:[0,.56,.06],  m:'metal',   c:0xc4ccd2, r:[-30,0,0]},
      {s:'sph', d:[.075],        p:[0,.74,.155], m:'plastic', c:0xd0342a},
      {s:'box', d:[.06,.05,.02], p:[-.12,.38,.17],m:'neon',   c:0x7dff8a, nc:1},
      {s:'box', d:[.06,.05,.02], p:[.12,.38,.17], m:'neon',   c:0xff5a4a, nc:1},
  ]},

  /* ============ 55. SENSOR DE PROXIMIDAD ============
     Poste con cabeza de sensor y lente de neón: dispara cuando pasás cerca. El anillo que
     marca el radio en el piso lo dibuja core_x.js (cambia con el slider). */
  { id:'xpx_prox', name:'Sensor Proxim', mass:34, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.36,.07,.36], p:[0,.035,0],  m:'metal',   c:0x3c4249},
      {s:'cyl', d:[.055,1.10],   p:[0,.62,0],   m:'metal',   c:0x8d959d},
      {s:'box', d:[.30,.24,.22], p:[0,1.28,0],  m:'plastic', c:0xd8dade},
      {s:'box', d:[.26,.17,.03], p:[0,1.26,.12],m:'neon',    c:0x39dcff, nc:1},
      {s:'cyl', d:[.05,.03],     p:[0,1.42,.10],m:'neon',    c:0xff5a4a, nc:1},
  ]},

  /* ============ 56. PLACA DE PRESIÓN / SENSOR DE PESO ============
     Bandeja de piso HUECA a propósito: la TAPA que se hunde con el peso es un cuerpo
     cinemático que crea core_x.js, así que acá va sólo el marco con su recesión y las
     almohadillas de goma de las esquinas. */
  { id:'xpx_plate', name:'Placa Presion', mass:80, tags:['experiment','industrial'], parts:[
      {s:'box', d:[1.30,.09,1.30], p:[0,.045,0],   m:'metal',  c:0x33383e},
      {s:'box', d:[.10,.10,1.30],  p:[-.60,.14,0], m:'metal',  c:0x5c646c},
      {s:'box', d:[.10,.10,1.30],  p:[.60,.14,0],  m:'metal',  c:0x5c646c},
      {s:'box', d:[1.10,.10,.10],  p:[0,.14,-.60], m:'metal',  c:0x5c646c},
      {s:'box', d:[1.10,.10,.10],  p:[0,.14,.60],  m:'metal',  c:0x5c646c},
      {s:'cyl', d:[.07,.05],       p:[-.48,.115,-.48], m:'rubber', c:0x1c1f23},
      {s:'cyl', d:[.07,.05],       p:[.48,.115,-.48],  m:'rubber', c:0x1c1f23},
      {s:'cyl', d:[.07,.05],       p:[-.48,.115,.48],  m:'rubber', c:0x1c1f23},
      {s:'cyl', d:[.07,.05],       p:[.48,.115,.48],   m:'rubber', c:0x1c1f23},
      {s:'box', d:[1.06,.03,.05],  p:[0,.20,.62],  m:'neon',   c:0xffc24d, nc:1},
  ]},

  /* ============ 57. TEMPORIZADOR ============
     Relé de tiempo de tablero: cuerpo, dial redondo con aguja y zócalo. El dial y la aguja
     van nc:1 (son chapa fina, no tienen que colisionar). */
  { id:'xpx_timer', name:'Temporizador', mass:30, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.58,.07,.36], p:[0,.035,0],  m:'metal',   c:0x3c4249},
      {s:'box', d:[.50,.50,.28], p:[0,.32,0],   m:'metal',   c:0x5b636b},
      {s:'cyl', d:[.19,.04],     p:[0,.36,.15], m:'plastic', c:0xe8eaee, r:[90,0,0], nc:1},
      {s:'box', d:[.025,.15,.02],p:[0,.42,.18], m:'plastic', c:0xd0342a, nc:1},
      {s:'sph', d:[.03],         p:[0,.36,.18], m:'metal',   c:0x2b2f34, nc:1},
      {s:'box', d:[.34,.05,.02], p:[0,.11,.15], m:'neon',    c:0xffc24d, nc:1},
  ]},

  /* ============ 58. CONTADOR ============
     Cuentapiezas industrial: caja baja, visor de neón ámbar (los dígitos los escribe el panel)
     y dos perillas de puesta a cero. */
  { id:'xpx_count', name:'Contador Pulso', mass:28, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.64,.08,.38], p:[0,.04,0],    m:'metal',   c:0x3c4249},
      {s:'box', d:[.56,.42,.32], p:[0,.29,0],    m:'plastic', c:0x232830},
      {s:'box', d:[.42,.17,.03], p:[0,.37,.17],  m:'neon',    c:0xffc24d, nc:1},
      {s:'cyl', d:[.05,.05],     p:[-.17,.13,.17],m:'metal',  c:0xb9c0c6, r:[90,0,0]},
      {s:'cyl', d:[.05,.05],     p:[.17,.13,.17], m:'metal',  c:0xb9c0c6, r:[90,0,0]},
  ]},

  /* ============ 59..62. LAS CUATRO COMPUERTAS ============
     Mismo chasis, cuerpo con la FORMA del símbolo. Dos patas azules atrás = entradas A y B,
     una pata ámbar adelante = salida, testigo de neón arriba = estado. */
  { id:'xpx_and', name:'Compuerta AND', mass:24, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.46,.06,.36], p:[0,.03,0],     m:'metal',   c:0x3c4249},
      {s:'cyl', d:[.06,.36],     p:[0,.21,0],     m:'metal',   c:0x8d959d},
      {s:'box', d:[.34,.26,.30], p:[-.05,.55,0],  m:'plastic', c:0x2f7a4f},
      {s:'cyl', d:[.15,.30],     p:[.12,.55,0],   m:'plastic', c:0x2f7a4f, r:[90,0,0]},
      {s:'cyl', d:[.035,.13],    p:[-.10,.46,-.19],m:'metal',  c:0x3fa9ff, r:[90,0,0]},
      {s:'cyl', d:[.035,.13],    p:[.10,.46,-.19], m:'metal',  c:0x3fa9ff, r:[90,0,0]},
      {s:'cyl', d:[.04,.15],     p:[.14,.46,.21],  m:'metal',  c:0xffb03a, r:[90,0,0]},
      {s:'box', d:[.17,.03,.11], p:[0,.70,0],      m:'neon',   c:0x7dff8a, nc:1},
  ]},
  { id:'xpx_or', name:'Compuerta OR', mass:24, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.46,.06,.36], p:[0,.03,0],     m:'metal',   c:0x3c4249},
      {s:'cyl', d:[.06,.36],     p:[0,.21,0],     m:'metal',   c:0x8d959d},
      {s:'box', d:[.26,.26,.30], p:[-.09,.55,0],  m:'plastic', c:0x2f5f9c},
      {s:'cone',d:[.16,.30],     p:[.12,.55,0],   m:'plastic', c:0x2f5f9c, r:[0,0,-90]},
      {s:'cyl', d:[.035,.13],    p:[-.12,.46,-.19],m:'metal',  c:0x3fa9ff, r:[90,0,0]},
      {s:'cyl', d:[.035,.13],    p:[.06,.46,-.19], m:'metal',  c:0x3fa9ff, r:[90,0,0]},
      {s:'cyl', d:[.04,.15],     p:[.16,.46,.21],  m:'metal',  c:0xffb03a, r:[90,0,0]},
      {s:'box', d:[.17,.03,.11], p:[0,.70,0],      m:'neon',   c:0x7dff8a, nc:1},
  ]},
  { id:'xpx_not', name:'Compuerta NOT', mass:22, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.46,.06,.36], p:[0,.03,0],    m:'metal',   c:0x3c4249},
      {s:'cyl', d:[.06,.36],     p:[0,.21,0],    m:'metal',   c:0x8d959d},
      {s:'cone',d:[.17,.34],     p:[-.04,.55,0], m:'plastic', c:0xa8382f, r:[0,0,-90]},
      {s:'sph', d:[.062],        p:[.18,.55,0],  m:'plastic', c:0xeef0f2},
      {s:'cyl', d:[.035,.13],    p:[0,.46,-.19], m:'metal',   c:0x3fa9ff, r:[90,0,0]},
      {s:'cyl', d:[.04,.15],     p:[.16,.46,.21],m:'metal',   c:0xffb03a, r:[90,0,0]},
      {s:'box', d:[.17,.03,.11], p:[0,.70,0],    m:'neon',    c:0x7dff8a, nc:1},
  ]},
  { id:'xpx_xor', name:'Compuerta XOR', mass:25, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.46,.06,.36], p:[0,.03,0],     m:'metal',   c:0x3c4249},
      {s:'cyl', d:[.06,.36],     p:[0,.21,0],     m:'metal',   c:0x8d959d},
      {s:'box', d:[.22,.26,.30], p:[-.07,.55,0],  m:'plastic', c:0x6a3fa8},
      {s:'cone',d:[.16,.30],     p:[.13,.55,0],   m:'plastic', c:0x6a3fa8, r:[0,0,-90]},
      {s:'box', d:[.04,.26,.30], p:[-.21,.55,0],  m:'plastic', c:0x6a3fa8},
      {s:'cyl', d:[.035,.13],    p:[-.11,.46,-.19],m:'metal',  c:0x3fa9ff, r:[90,0,0]},
      {s:'cyl', d:[.035,.13],    p:[.07,.46,-.19], m:'metal',  c:0x3fa9ff, r:[90,0,0]},
      {s:'cyl', d:[.04,.15],     p:[.17,.46,.21],  m:'metal',  c:0xffb03a, r:[90,0,0]},
      {s:'box', d:[.17,.03,.11], p:[0,.70,0],      m:'neon',   c:0x7dff8a, nc:1},
  ]},

  /* ============ 63. FLIP-FLOP (MEMORIA) ============
     Módulo de memoria: dos testigos arriba (Q y Q negado, uno siempre al revés del otro) y dos
     botoncitos SET/RESET al frente. */
  { id:'xpx_ff', name:'FlipFlop Mem', mass:26, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.54,.07,.38], p:[0,.035,0],    m:'metal',   c:0x3c4249},
      {s:'box', d:[.48,.36,.32], p:[0,.25,0],     m:'plastic', c:0x223a55},
      {s:'cyl', d:[.055,.03],    p:[-.13,.45,0],  m:'neon',    c:0x7dff8a, nc:1},
      {s:'cyl', d:[.055,.03],    p:[.13,.45,0],   m:'neon',    c:0xff5a4a, nc:1},
      {s:'cyl', d:[.045,.05],    p:[-.13,.28,.17],m:'metal',   c:0xdfe4e8, r:[90,0,0]},
      {s:'cyl', d:[.045,.05],    p:[.13,.28,.17], m:'metal',   c:0x8d959d, r:[90,0,0]},
      {s:'box', d:[.30,.08,.02], p:[0,.13,.16],   m:'neon',    c:0x39dcff, nc:1},
  ]},

  /* ============ 64. OSCILADOR / CLOCK ============
     Generador de pulsos: cuerpo, volante metálico al frente (core_x.js lo hace girar con una
     malla propia encima) y la onda cuadrada de neón dibujada con tres barritas. */
  { id:'xpx_clk', name:'Oscilador Clk', mass:30, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.54,.08,.42], p:[0,.04,0],    m:'metal',   c:0x3c4249},
      {s:'box', d:[.44,.42,.34], p:[0,.29,0],    m:'plastic', c:0x232830},
      {s:'cyl', d:[.14,.04],     p:[0,.34,.18],  m:'metal',   c:0xc4ccd2, r:[90,0,0]},
      {s:'cyl', d:[.02,.26],     p:[.17,.63,-.10],m:'metal',  c:0x8d959d},
      {s:'box', d:[.07,.03,.02], p:[-.13,.54,.16],m:'neon',   c:0x39dcff, nc:1},
      {s:'box', d:[.07,.03,.02], p:[0,.60,.16],   m:'neon',   c:0x39dcff, nc:1},
      {s:'box', d:[.07,.03,.02], p:[.13,.54,.16], m:'neon',   c:0x39dcff, nc:1},
  ]},

  /* ============ 65. LÁMPARA ============
     Farola de taller: poste, brazo y pantalla cónica con bombita. La LUZ de verdad
     (THREE.PointLight) la cuelga core_x.js del centro de la bombita. */
  { id:'xpx_lamp', name:'Foco Circuito', mass:44, tags:['experiment','industrial'], parts:[
      {s:'cyl', d:[.24,.07],     p:[0,.035,0],    m:'metal',   c:0x3c4249},
      {s:'cyl', d:[.055,1.48],   p:[0,.78,0],     m:'metal',   c:0x8d959d},
      {s:'box', d:[.34,.06,.06], p:[.15,1.50,0],  m:'metal',   c:0x8d959d},
      {s:'cone',d:[.26,.26],     p:[.30,1.36,0],  m:'metal',   c:0xb9c0c6, r:[180,0,0]},
      {s:'cyl', d:[.085,.07],    p:[.30,1.45,0],  m:'plastic', c:0x20242a},
      {s:'sph', d:[.105],        p:[.30,1.24,0],  m:'neon',    c:0xffd07a, nc:1},
  ]},

  /* ============ 66. SIRENA ============
     Poste con baliza giratoria (cúpula roja) y bocina cónica: luz y sonido. La cúpula que gira
     y el destello los pone core_x.js. */
  { id:'xpx_siren', name:'Sirena Alarma', mass:42, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.36,.08,.36], p:[0,.04,0],    m:'metal',   c:0x3c4249},
      {s:'cyl', d:[.055,1.14],   p:[0,.63,0],    m:'metal',   c:0x8d959d},
      {s:'box', d:[.26,.22,.22], p:[0,1.31,0],   m:'metal',   c:0x59616a},
      {s:'cyl', d:[.13,.14],     p:[0,1.49,0],   m:'neon',    c:0xff3a2a, nc:1},
      {s:'sph', d:[.13],         p:[0,1.56,0],   m:'neon',    c:0xff3a2a, nc:1},
      {s:'cone',d:[.16,.28],     p:[0,1.31,.26], m:'plastic', c:0x2b3037, r:[-90,0,0]},
  ]},

  /* ============ 67. PUERTA AUTOMÁTICA ============
     SÓLO el marco: las dos hojas que corren son cuerpos cinemáticos de core_x.js (un prop es
     un cuerpo rígido y no se puede abrir por partes). */
  { id:'xpx_door', name:'Puerta Auto', mass:600, tags:['experiment','building'], parts:[
      {s:'box', d:[.18,2.24,.34], p:[-.91,1.12,0], m:'metal', c:0x5c646c},
      {s:'box', d:[.18,2.24,.34], p:[.91,1.12,0],  m:'metal', c:0x5c646c},
      {s:'box', d:[2.00,.24,.34], p:[0,2.36,0],    m:'metal', c:0x4a5158},
      {s:'box', d:[2.00,.05,.38], p:[0,.025,0],    m:'metal', c:0x33383e},
      {s:'box', d:[1.50,.07,.03], p:[0,2.36,.19],  m:'neon',  c:0x39dcff, nc:1},
      {s:'box', d:[.12,.09,.03],  p:[-.91,.30,.18],m:'neon',  c:0xffc24d, nc:1},
      {s:'box', d:[.12,.09,.03],  p:[.91,.30,.18], m:'neon',  c:0xffc24d, nc:1},
  ]},

  /* ============ 68. ELEVADOR / PLATAFORMA ============
     Plataforma con cuatro guías y borde de neón: el prop ENTERO es lo que sube (core_x.js le
     pone el cuerpo en cinemático mientras el experimento corre, así te lleva parado arriba). */
  { id:'xpx_lift', name:'Elevador Placa', mass:700, tags:['experiment','industrial'], parts:[
      {s:'box', d:[2.00,.16,2.00], p:[0,.08,0],     m:'metal', c:0x4a5158},
      {s:'cyl', d:[.06,.50],       p:[-.90,.41,-.90],m:'metal', c:0x8d959d},
      {s:'cyl', d:[.06,.50],       p:[.90,.41,-.90], m:'metal', c:0x8d959d},
      {s:'cyl', d:[.06,.50],       p:[-.90,.41,.90], m:'metal', c:0x8d959d},
      {s:'cyl', d:[.06,.50],       p:[.90,.41,.90],  m:'metal', c:0x8d959d},
      {s:'cyl', d:[.16,.30],       p:[0,.31,0],      m:'metal', c:0x6b737b},
      {s:'box', d:[1.90,.05,.06],  p:[0,.18,.97],    m:'neon', c:0xffc24d, nc:1},
      {s:'box', d:[1.90,.05,.06],  p:[0,.18,-.97],   m:'neon', c:0xffc24d, nc:1},
  ]},

  /* ============ 69. CINTA TRANSPORTADORA ============
     Bastidor con rodillos en las puntas y superficie de goma: empuja lo que se le pone arriba
     (las flechas que corren son mallas de core_x.js). */
  { id:'xpx_belt', name:'Cinta Rodillo', mass:320, tags:['experiment','industrial'], parts:[
      {s:'box', d:[1.20,.09,3.00], p:[0,.56,0],     m:'rubber', c:0x1c1f23},
      {s:'box', d:[.08,.20,3.00],  p:[-.66,.61,0],  m:'metal',  c:0x5c646c},
      {s:'box', d:[.08,.20,3.00],  p:[.66,.61,0],   m:'metal',  c:0x5c646c},
      {s:'box', d:[.12,.52,.12],   p:[-.56,.26,-1.32],m:'metal',c:0x4a5158},
      {s:'box', d:[.12,.52,.12],   p:[.56,.26,-1.32], m:'metal',c:0x4a5158},
      {s:'box', d:[.12,.52,.12],   p:[-.56,.26,1.32], m:'metal',c:0x4a5158},
      {s:'box', d:[.12,.52,.12],   p:[.56,.26,1.32],  m:'metal',c:0x4a5158},
      {s:'cyl', d:[.13,1.18],      p:[0,.56,-1.46], m:'metal',  c:0x9aa2a9, r:[0,0,90]},
      {s:'cyl', d:[.13,1.18],      p:[0,.56,1.46],  m:'metal',  c:0x9aa2a9, r:[0,0,90]},
      {s:'box', d:[.04,.05,2.80],  p:[.71,.62,0],   m:'neon',   c:0xffc24d, nc:1},
  ]},

  /* ============ 70. GRÚA ============
     Torre con base, mástil arriostrado, cabina y corona. La PLUMA y el GANCHO son mallas +
     cuerpos de core_x.js porque giran y se mueven. */
  { id:'xpx_crane', name:'Grua Torre', mass:1400, tags:['experiment','building'], parts:[
      {s:'box', d:[1.50,.22,1.50], p:[0,.11,0],    m:'metal',   c:0x33383e},
      {s:'box', d:[.52,3.00,.52],  p:[0,1.72,0],   m:'metal',   c:0xd8b62c},
      {s:'box', d:[.72,.06,.06],   p:[0,1.00,.27], m:'metal',   c:0xb9932c, r:[0,0,32]},
      {s:'box', d:[.72,.06,.06],   p:[0,1.80,.27], m:'metal',   c:0xb9932c, r:[0,0,-32]},
      {s:'box', d:[.72,.06,.06],   p:[0,2.60,.27], m:'metal',   c:0xb9932c, r:[0,0,32]},
      {s:'box', d:[.62,.52,.72],   p:[0,3.42,.12], m:'plastic', c:0x2b3037},
      {s:'cyl', d:[.26,.16],       p:[0,3.76,0],   m:'metal',   c:0x8d959d},
      {s:'box', d:[.14,.07,.04],   p:[0,3.70,.30], m:'neon',    c:0xff5a4a, nc:1},
  ]},

  /* ============ 71. TURBINA / VENTILADOR ============
     Ventilador industrial con aro, cubo y cuatro aspas en cruz: empuja los props que tiene
     enfrente. El disco de "movimiento" que gira lo agrega core_x.js. */
  { id:'xpx_fan', name:'Turbina Fuelle', mass:90, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.74,.09,.54], p:[0,.045,0],  m:'metal',   c:0x3c4249},
      {s:'cyl', d:[.075,.46],    p:[0,.30,0],   m:'metal',   c:0x8d959d},
      {s:'cyl', d:[.62,.16],     p:[0,.95,0],   m:'metal',   c:0x5c646c, r:[90,0,0]},
      {s:'cyl', d:[.13,.22],     p:[0,.95,0],   m:'metal',   c:0x9aa2a9, r:[90,0,0]},
      {s:'box', d:[1.00,.15,.03],p:[0,.95,.03], m:'plastic', c:0x3f454c, nc:1},
      {s:'box', d:[1.00,.15,.03],p:[0,.95,.03], m:'plastic', c:0x3f454c, r:[0,0,45], nc:1},
      {s:'box', d:[1.00,.15,.03],p:[0,.95,.03], m:'plastic', c:0x3f454c, r:[0,0,90], nc:1},
      {s:'box', d:[1.00,.15,.03],p:[0,.95,.03], m:'plastic', c:0x3f454c, r:[0,0,135], nc:1},
      {s:'box', d:[.20,.05,.03], p:[0,1.60,0],  m:'neon',    c:0x39dcff, nc:1},
  ]},

  /* ============ 72. TELETRANSPORTADOR ============
     Plataforma con aro de neón, tres columnas y núcleo: los pares se arman de dos en dos por
     orden de colocación (1↔2, 3↔4…). */
  { id:'xpx_tele', name:'Teleporte Par', mass:180, tags:['experiment','scifi'], parts:[
      {s:'cyl', d:[.90,.12],     p:[0,.06,0],       m:'metal', c:0x3c4249},
      {s:'cyl', d:[.80,.05],     p:[0,.145,0],      m:'neon',  c:0x39dcff, nc:1},
      {s:'cyl', d:[.07,.92],     p:[0,.58,-.70],    m:'metal', c:0x8d959d},
      {s:'cyl', d:[.07,.92],     p:[-.61,.58,.35],  m:'metal', c:0x8d959d},
      {s:'cyl', d:[.07,.92],     p:[.61,.58,.35],   m:'metal', c:0x8d959d},
      {s:'cyl', d:[.78,.06],     p:[0,1.05,0],      m:'metal', c:0x5c646c, nc:1},
      {s:'cyl', d:[.16,.52],     p:[0,.42,0],       m:'neon',  c:0xb98aff, nc:1},
  ]},

  /* ============ 73. LANZALLAMAS ============
     Garrafa + válvula + caño con tobera cónica y llama piloto: escupe fuego mientras haya
     señal. Las partículas de fuego las pone core_x.js. */
  { id:'xpx_flame', name:'Lanzallamas', mass:75, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.56,.09,.56], p:[0,.045,0],    m:'metal', c:0x3c4249},
      {s:'cyl', d:[.17,.80],     p:[-.13,.49,0],  m:'metal', c:0xa8382f},
      {s:'sph', d:[.08],         p:[-.13,.93,0],  m:'metal', c:0xc4ccd2},
      {s:'cyl', d:[.05,.44],     p:[.16,.55,.10], m:'metal', c:0x8d959d, r:[90,0,0]},
      {s:'cyl', d:[.055,.30],    p:[.16,.55,-.10],m:'metal', c:0x8d959d, r:[0,0,90]},
      {s:'cone',d:[.09,.18],     p:[.16,.55,.41], m:'metal', c:0x5c646c, r:[90,0,0]},
      {s:'box', d:[.05,.05,.03], p:[.16,.68,.30], m:'neon',  c:0xff8a2a, nc:1},
  ]},

  /* ============ 74. TORRETA ============
     Pedestal + corona + caja de munición: la CABEZA con los dos caños (la que apunta y
     dispara) es una malla de core_x.js. */
  { id:'xpx_turret', name:'Torreta Auto', mass:220, tags:['experiment','scifi'], parts:[
      {s:'cyl', d:[.36,.14],     p:[0,.07,0],    m:'metal', c:0x33383e},
      {s:'cyl', d:[.13,.66],     p:[0,.45,0],    m:'metal', c:0x6b737b},
      {s:'cyl', d:[.21,.12],     p:[0,.84,0],    m:'metal', c:0x8d959d},
      {s:'box', d:[.28,.20,.22], p:[-.34,.10,0], m:'metal', c:0x4a5158},
      {s:'box', d:[.07,.05,.03], p:[0,.90,.17],  m:'neon',  c:0xff5a4a, nc:1},
  ]},

  /* ============ 75. TABLERO DE CONTROL ============
     Consola con pantalla inclinada y seis botones de neón: desde su panel se ve el estado de
     TODOS los circuitos del mapa y se los puede activar a mano. */
  { id:'xpx_board', name:'Tablero Ctrl', mass:240, tags:['experiment','interior'], parts:[
      {s:'box', d:[1.24,.13,.72], p:[0,.065,0],    m:'metal',   c:0x33383e},
      {s:'box', d:[1.10,.88,.60], p:[0,.57,0],     m:'plastic', c:0x232830},
      {s:'box', d:[1.06,.52,.07], p:[0,1.20,-.12], m:'metal',   c:0x4a5158, r:[-14,0,0]},
      {s:'box', d:[.94,.44,.02],  p:[0,1.21,-.05], m:'neon',    c:0x39dcff, r:[-14,0,0], nc:1},
      {s:'box', d:[1.08,.09,.42], p:[0,1.05,.16],  m:'metal',   c:0x5c646c},
      {s:'box', d:[.11,.04,.08],  p:[-.40,1.11,.16],m:'neon',   c:0x7dff8a, nc:1},
      {s:'box', d:[.11,.04,.08],  p:[-.24,1.11,.16],m:'neon',   c:0x7dff8a, nc:1},
      {s:'box', d:[.11,.04,.08],  p:[-.08,1.11,.16],m:'neon',   c:0xffc24d, nc:1},
      {s:'box', d:[.11,.04,.08],  p:[.08,1.11,.16], m:'neon',   c:0xffc24d, nc:1},
      {s:'box', d:[.11,.04,.08],  p:[.24,1.11,.16], m:'neon',   c:0xff5a4a, nc:1},
      {s:'box', d:[.11,.04,.08],  p:[.40,1.11,.16], m:'neon',   c:0xff5a4a, nc:1},
  ]},

]);
