/* ============================================================
   SUX SANDBOX — PROPS DE LOS EXPERIMENTOS DE CLIMA  (prefijo xpw_)
   ------------------------------------------------------------
   POR QUÉ ESTÁN ACÁ Y NO EN core_w.js
   XP.add() sabe crear el def en tiempo de ejecución, pero los props que nacen así caen en la
   carpeta "Varios" y —lo importante— NO los revisa validate.js. Estos 25 son la cara visible de
   los 25 experimentos de clima: si uno mide 40 m, flota en el aire o usa un material que no
   existe, el jugador lo ve. Declarándolos acá entran en la misma pasada de validación que los
   otros 398 (medidas, masas, materiales, ids y nombres únicos) y además quedan en su PROPIA
   carpeta del menú de spawn ("Clima"), en vez de mezclados con los de los otros agentes.

   El tab dice 'ent' porque validate.js sólo acepta acc|veh|ent; core_u.js mueve toda sección
   cuyo id empiece con 'xp' a la pestaña "Experimentos" al arrancar (una línea en runtime).

   CRITERIO DE DISEÑO DE LAS FORMAS
   Cada aparato tiene que LEERSE de un vistazo, sin cartel: la lluvia es una PALANCA (y core_w le
   cuelga una nube 3D encima), la tormenta un PARARRAYOS, el huracán una TURBINA de tres palas, la
   arena un RELOJ DE ARENA, el tsunami una BOYA, el volcán un CONO con cráter… Nada de cajas
   grises con una lucecita: la silueta es el ícono.

   REGLAS QUE APLICA validate.js y que se respetan en todos:
     y=0 = base del objeto (apoya en el piso), centrado en X/Z
     1..14 partes · máximo 3 materiales · al menos una parte que colisione (sin nc:1)
     lado mayor <= 20 m · masa entre 0,5 y 3000 · name <= 16 chars y único
   Las partes decorativas finas (agujas, luces, palas, cristales) van nc:1: la física la hacen
   la base y el cuerpo, que ya alcanzan, y así el prop no se traba con el personaje cuando se le
   acerca a activarlo — mismo criterio que props/experiments.js.
   ============================================================ */

HP.section('xpw_clima','Clima','ent',[

  /* ---- 26 · xpw_rain: PALANCA de lluvia ----------------------------------------
     Pedido explícito: es una PALANCA, y core_w.js le cuelga una nube 3D flotando arriba.
     Por eso el prop es bajo y ancho (la nube tiene que verse encima, no chocarla): caja de
     base, carcasa, la palanca inclinada hacia el jugador con su perilla, y una tira azul. */
  { id:'xpw_rain', name:'Palanca Lluvia', mass:58, tags:['experiment','industrial'], col:'box', parts:[
      {s:'box', d:[.94,.14,.74], p:[0,.07,0],     m:'metal',  c:0x39424b},
      {s:'box', d:[.54,.46,.46], p:[0,.37,0],     m:'metal',  c:0x2b333b},
      {s:'box', d:[.50,.04,.34], p:[0,.62,0],     m:'neon',   c:0x4fb8ff, nc:1},
      {s:'cyl', d:[.05,.66],     p:[0,.90,.16],   m:'chrome', c:0xd8dee4, r:[-26,0,0]},
      {s:'sph', d:[.10],         p:[0,1.20,.30],  m:'neon',   c:0xff5a3c, nc:1},
      {s:'box', d:[.16,.10,.06], p:[-.32,.44,.24],m:'chrome', c:0xc8ced4, nc:1},
  ]},

  /* ---- 27 · xpw_storm: PARARRAYOS con aisladores ------------------------------
     Mástil alto y flaco con punta de cobre y tres discos aisladores: se entiende "rayo" solo. */
  { id:'xpw_storm', name:'Pararrayos', mass:120, tags:['experiment','industrial'], col:'box', parts:[
      {s:'box', d:[.80,.16,.80], p:[0,.08,0],   m:'concrete', c:0x9aa0a6},
      {s:'cyl', d:[.09,2.30],    p:[0,1.31,0],  m:'metal',    c:0x8e969e},
      {s:'cyl', d:[.20,.06],     p:[0,.62,0],   m:'plastic',  c:0x6b4a2e, nc:1},
      {s:'cyl', d:[.20,.06],     p:[0,1.16,0],  m:'plastic',  c:0x6b4a2e, nc:1},
      {s:'cyl', d:[.20,.06],     p:[0,1.70,0],  m:'plastic',  c:0x6b4a2e, nc:1},
      {s:'cone',d:[.07,.42],     p:[0,2.67,0],  m:'metal',    c:0xd08c3a, nc:1},
      {s:'sph', d:[.07],         p:[0,2.92,0],  m:'metal',    c:0xffe08a, nc:1},
  ]},

  /* ---- 28 · xpw_tornado: TORNADÓMETRO (trípode + anemómetro + bocina) ----------
     Trípode de patas inclinadas, columna, tres cazoletas de anemómetro y una bocina cónica
     apuntando al cielo. core_w.js hace girar las cazoletas cuando el tornado está activo. */
  { id:'xpw_tornado', name:'Tornadometro', mass:96, tags:['experiment','scifi'], col:'box', parts:[
      {s:'box', d:[.70,.12,.70], p:[0,.06,0],     m:'metal',   c:0x3a4149},
      {s:'cyl', d:[.06,.80],     p:[-.26,.44,-.15],m:'metal',  c:0x6d757d, r:[0,0,18], nc:1},
      {s:'cyl', d:[.06,.80],     p:[.26,.44,-.15], m:'metal',  c:0x6d757d, r:[0,0,-18],nc:1},
      {s:'cyl', d:[.06,.80],     p:[0,.44,.30],    m:'metal',  c:0x6d757d, r:[-20,0,0],nc:1},
      {s:'cyl', d:[.13,1.05],    p:[0,.58,0],      m:'metal',  c:0x50585f},
      {s:'cyl', d:[.05,.60],     p:[0,1.40,0],     m:'chrome', c:0xd2d8de, nc:1},
      {s:'sph', d:[.08],         p:[0,1.72,0],     m:'chrome', c:0xe2e8ee, nc:1},
      {s:'sph', d:[.09],         p:[.30,1.70,0],   m:'neon',   c:0x6cf0ff, nc:1},
      {s:'sph', d:[.09],         p:[-.15,1.70,.26],m:'neon',   c:0x6cf0ff, nc:1},
      {s:'sph', d:[.09],         p:[-.15,1.70,-.26],m:'neon',  c:0x6cf0ff, nc:1},
      {s:'cone',d:[.30,.52],     p:[0,1.20,.34],   m:'chrome', c:0xb9c0c6, r:[100,0,0], nc:1},
  ]},

  /* ---- 29 · xpw_hurr: TURBINA de viento (aro + cubo + 3 palas) -----------------
     Es un ventilador industrial de verdad: aro exterior, cubo y tres palas finas. */
  { id:'xpw_hurr', name:'Turbina Viento', mass:210, tags:['experiment','industrial'], col:'box', parts:[
      {s:'box', d:[.96,.16,.86], p:[0,.08,0],    m:'metal',  c:0x3d444b},
      {s:'cyl', d:[.13,.72],     p:[0,.46,0],    m:'metal',  c:0x555d64},
      {s:'cyl', d:[1.00,.14],    p:[0,1.32,0],   m:'metal',  c:0x69727a, r:[90,0,0]},
      {s:'cyl', d:[.88,.06],     p:[0,1.32,0],   m:'rust',   c:0x8e6b52, r:[90,0,0], nc:1},
      {s:'cyl', d:[.20,.26],     p:[0,1.32,0],   m:'chrome', c:0xcfd6dc, r:[90,0,0], nc:1},
      {s:'box', d:[.20,.80,.05], p:[0,1.66,0],   m:'chrome', c:0xbcc3c9, r:[0,0,14], nc:1},
      {s:'box', d:[.20,.80,.05], p:[.30,1.15,0], m:'chrome', c:0xbcc3c9, r:[0,0,134],nc:1},
      {s:'box', d:[.20,.80,.05], p:[-.30,1.15,0],m:'chrome', c:0xbcc3c9, r:[0,0,-134],nc:1},
  ]},

  /* ---- 30 · xpw_snow: NEVADORA (tanque + cañón + escarcha) --------------------- */
  { id:'xpw_snow', name:'Nevadora', mass:88, tags:['experiment','industrial'], col:'box', parts:[
      {s:'box', d:[.86,.14,.66], p:[0,.07,0],    m:'metal',  c:0x39424a},
      {s:'cyl', d:[.30,1.00],    p:[-.16,.64,0], m:'metal',  c:0x7d868e},
      {s:'cyl', d:[.13,.26,.70], p:[.30,.92,0],  m:'chrome', c:0xdfe6ec, r:[0,0,-38], nc:1},
      {s:'cyl', d:[.17,.08],     p:[.52,1.09,0], m:'chrome', c:0xf2f6fa, r:[0,0,-38], nc:1},
      {s:'sph', d:[.11],         p:[-.16,1.22,0],m:'plastic',c:0xeef6ff, nc:1},
      {s:'box', d:[.26,.16,.05], p:[-.16,.72,.34],m:'plastic',c:0xbfe0ff, nc:1},
  ]},

  /* ---- 31 · xpw_hail: GRANIZADORA (tolva cónica invertida sobre patas) --------- */
  { id:'xpw_hail', name:'Granizadora', mass:104, tags:['experiment','industrial'], col:'box', parts:[
      {s:'box', d:[.78,.12,.78], p:[0,.06,0],   m:'metal',  c:0x373f47},
      {s:'cyl', d:[.06,.62],     p:[-.28,.43,-.28],m:'metal',c:0x60686f, nc:1},
      {s:'cyl', d:[.06,.62],     p:[.28,.43,-.28], m:'metal',c:0x60686f, nc:1},
      {s:'cyl', d:[.06,.62],     p:[-.28,.43,.28], m:'metal',c:0x60686f, nc:1},
      {s:'cyl', d:[.06,.62],     p:[.28,.43,.28],  m:'metal',c:0x60686f, nc:1},
      {s:'cyl', d:[.48,.14,.62], p:[0,1.05,0],  m:'metal',  c:0x818a92},
      {s:'cyl', d:[.50,.07],     p:[0,1.39,0],  m:'chrome', c:0xcbd2d8, nc:1},
      {s:'sph', d:[.09],         p:[.16,1.44,.14],m:'glass', c:0xcfe8f4, nc:1},
      {s:'sph', d:[.07],         p:[-.18,1.44,-.10],m:'glass',c:0xcfe8f4, nc:1},
  ]},

  /* ---- 32 · xpw_fog: NIEBLINA (máquina de humo con boca ancha y manguera) ------ */
  { id:'xpw_fog', name:'Nieblina', mass:64, tags:['experiment','industrial'], col:'box', parts:[
      {s:'box', d:[.88,.50,.60], p:[0,.25,0],    m:'metal',  c:0x424a52},
      {s:'box', d:[.60,.20,.44], p:[0,.60,0],    m:'metal',  c:0x2f363d},
      {s:'cyl', d:[.16,.34,.56], p:[.52,.60,0],  m:'chrome', c:0xc6cdd3, r:[0,0,90], nc:1},
      {s:'cyl', d:[.30,.28],     p:[0,.10,.42],  m:'rubber', c:0x24272c, r:[90,0,0], nc:1},
      {s:'box', d:[.30,.06,.20], p:[-.24,.72,0], m:'chrome', c:0xd6dce2, nc:1},
      {s:'box', d:[.22,.12,.04], p:[.10,.42,.31],m:'rubber', c:0x9ad8e6, nc:1},
  ]},

  /* ---- 33 · xpw_day: RELOJ SOLAR (disco horario + gnomon triangular) ----------- */
  { id:'xpw_day', name:'Reloj Solar', mass:150, tags:['experiment','fun'], col:'cyl', parts:[
      {s:'cyl', d:[.24,.34,.62], p:[0,.31,0],   m:'concrete', c:0xa9aeb3},
      {s:'cyl', d:[.62,.10],     p:[0,.67,0],   m:'concrete', c:0xc3c8cc},
      {s:'cyl', d:[.56,.03],     p:[0,.73,0],   m:'chrome',   c:0xd9dfe5, nc:1},
      {s:'box', d:[.05,.52,.60], p:[0,.96,0],   m:'chrome',   c:0xb0b7bd, r:[0,0,0], nc:1},
      {s:'sph', d:[.07],         p:[0,1.24,-.24],m:'neon',    c:0xffc24d, nc:1},
      {s:'box', d:[.10,.04,.10], p:[.44,.74,.28],m:'neon',    c:0xffc24d, nc:1},
  ]},

  /* ---- 34 · xpw_eclipse: ECLIPSADOR (telescopio con disco de sombra) ----------- */
  { id:'xpw_eclipse', name:'Eclipsador', mass:118, tags:['experiment','scifi'], col:'box', parts:[
      {s:'box', d:[.74,.14,.74], p:[0,.07,0],    m:'metal',  c:0x323942},
      {s:'cyl', d:[.11,.66],     p:[0,.47,0],    m:'metal',  c:0x5a626a},
      {s:'box', d:[.34,.30,.30], p:[0,.92,0],    m:'metal',  c:0x434b53},
      {s:'cyl', d:[.17,1.02],    p:[0,1.22,-.20],m:'chrome', c:0xbcc3ca, r:[-58,0,0], nc:1},
      {s:'cyl', d:[.22,.06],     p:[0,1.62,-.46],m:'glass',  c:0xa8d4e6, r:[-58,0,0], nc:1},
      {s:'sph', d:[.13],         p:[.34,1.10,.10],m:'chrome', c:0x22262b, nc:1},
      {s:'box', d:[.26,.05,.16], p:[0,1.10,.22], m:'glass',  c:0xffe6a8, nc:1},
  ]},

  /* ---- 35 · xpw_dusk: ANCLA DEL CREPÚSCULO (arco con disco de sol) ------------- */
  { id:'xpw_dusk', name:'Ancla Crepusc', mass:230, tags:['experiment','fun'], col:'box', parts:[
      {s:'box', d:[1.10,.14,.50], p:[0,.07,0],   m:'concrete', c:0x8f8378},
      {s:'cyl', d:[.10,1.60],     p:[-.44,.87,0],m:'concrete', c:0xb7a898},
      {s:'cyl', d:[.10,1.60],     p:[.44,.87,0], m:'concrete', c:0xb7a898},
      {s:'box', d:[1.16,.14,.24], p:[0,1.74,0],  m:'concrete', c:0xa4968a},
      {s:'cyl', d:[.36,.06],      p:[0,1.20,0],  m:'neon',     c:0xff8a3c, r:[90,0,0], nc:1},
      {s:'cyl', d:[.26,.08],      p:[0,1.20,.04],m:'neon',     c:0xffd07a, r:[90,0,0], nc:1},
      {s:'box', d:[.90,.04,.06],  p:[0,.98,0],   m:'neon',     c:0xff6a2c, nc:1},
  ]},

  /* ---- 36 · xpw_moon: BASE LUNAR (plataforma con patas, cúpula y antena) ------- */
  { id:'xpw_moon', name:'Base Lunar', mass:190, tags:['experiment','scifi'], col:'box', parts:[
      {s:'cyl', d:[.62,.14],     p:[0,.07,0],     m:'metal',  c:0x8d959d},
      {s:'cyl', d:[.05,.34],     p:[-.42,.17,-.24],m:'metal', c:0x6a727a, r:[0,0,26], nc:1},
      {s:'cyl', d:[.05,.34],     p:[.42,.17,-.24], m:'metal', c:0x6a727a, r:[0,0,-26],nc:1},
      {s:'cyl', d:[.05,.34],     p:[0,.17,.46],    m:'metal', c:0x6a727a, r:[-26,0,0],nc:1},
      {s:'cyl', d:[.48,.36],     p:[0,.32,0],     m:'metal',  c:0xa5adb5},
      {s:'sph', d:[.42],         p:[0,.52,0],     m:'glass',  c:0xa9d4e8, nc:1},
      {s:'cyl', d:[.025,.72],    p:[.34,1.06,0],  m:'chrome', c:0xd4dae0, nc:1},
      {s:'sph', d:[.06],         p:[.34,1.44,0],  m:'chrome', c:0xff5a3c, nc:1},
  ]},

  /* ---- 37 · xpw_quake: SISMÓGRAFO (tambor de papel + aguja + contrapeso) ------- */
  { id:'xpw_quake', name:'Sismografo', mass:76, tags:['experiment','industrial'], col:'box', parts:[
      {s:'box', d:[.92,.16,.62], p:[0,.08,0],    m:'wood',   c:0x8f6a42},
      {s:'box', d:[.10,.62,.10], p:[-.38,.47,0], m:'metal',  c:0x545c64},
      {s:'cyl', d:[.24,.44],     p:[.12,.44,0],  m:'plastic',c:0xf0ece0, r:[0,0,90]},
      {s:'cyl', d:[.26,.02],     p:[.35,.44,0],  m:'metal',  c:0x6d757d, r:[0,0,90], nc:1},
      {s:'box', d:[.66,.03,.03], p:[-.06,.80,0], m:'metal',  c:0xb9c0c7, nc:1},
      {s:'box', d:[.10,.20,.10], p:[.26,.72,0],  m:'metal',  c:0x3b4249, nc:1},
      {s:'box', d:[.22,.06,.14], p:[-.38,.82,0], m:'plastic',c:0x7dff8a, nc:1},
  ]},

  /* ---- 38 · xpw_tsunami: BOYA de alerta (flotador + mástil + faro + falda) ----- */
  { id:'xpw_tsunami', name:'Boya Tsunami', mass:136, tags:['experiment','industrial'], col:'box', parts:[
      {s:'cyl', d:[.52,.44,.30], p:[0,.15,0],   m:'metal',  c:0xd0562e},
      {s:'cyl', d:[.54,.10],     p:[0,.35,0],   m:'metal',  c:0xe8683a},
      {s:'sph', d:[.40],         p:[0,.52,0],   m:'metal',  c:0xd0562e},
      {s:'cyl', d:[.06,.92],     p:[0,1.28,0],  m:'chrome', c:0xc9d0d6, nc:1},
      {s:'cyl', d:[.15,.20],     p:[0,1.82,0],  m:'neon',   c:0xffd24d, nc:1},
      {s:'cyl', d:[.19,.05],     p:[0,1.95,0],  m:'chrome', c:0xb8bfc5, nc:1},
      {s:'box', d:[.34,.04,.04], p:[0,1.60,0],  m:'chrome', c:0xb8bfc5, r:[0,0,0], nc:1},
      {s:'box', d:[.04,.04,.34], p:[0,1.60,0],  m:'chrome', c:0xb8bfc5, nc:1},
  ]},

  /* ---- 39 · xpw_flood: COMPUERTA (marco, tablero y volante de esclusa) --------- */
  { id:'xpw_flood', name:'Compuerta', mass:340, tags:['experiment','industrial'], col:'box', parts:[
      {s:'box', d:[1.30,.16,.40], p:[0,.08,0],   m:'concrete', c:0x9ba0a5},
      {s:'box', d:[.16,1.70,.30], p:[-.57,1.01,0],m:'concrete',c:0xb0b5ba},
      {s:'box', d:[.16,1.70,.30], p:[.57,1.01,0], m:'concrete',c:0xb0b5ba},
      {s:'box', d:[1.30,.18,.26], p:[0,1.95,0],  m:'concrete', c:0x8d9297},
      {s:'box', d:[1.00,.94,.12], p:[0,.63,0],   m:'rust',     c:0x8a6650},
      {s:'box', d:[1.00,.08,.16], p:[0,1.14,0],  m:'rust',     c:0x9c7458, nc:1},
      {s:'cyl', d:[.30,.06],      p:[0,1.72,.16],m:'metal',    c:0x6f777f, r:[0,0,0], nc:1},
      {s:'cyl', d:[.05,.34],      p:[0,1.72,.16],m:'metal',    c:0x8b939b, r:[90,0,0],nc:1},
      {s:'box', d:[.62,.05,.05],  p:[0,1.72,.24],m:'metal',    c:0x8b939b, r:[0,0,42],nc:1},
      {s:'box', d:[.62,.05,.05],  p:[0,1.72,.24],m:'metal',    c:0x8b939b, r:[0,0,-42],nc:1},
  ]},

  /* ---- 40 · xpw_volcano: MAQUETA DE VOLCÁN (cono con cráter y colada) ---------- */
  { id:'xpw_volcano', name:'Maqueta Volcan', mass:520, tags:['experiment','enviroment'], col:'cyl', parts:[
      {s:'cyl', d:[1.30,.12],     p:[0,.06,0],   m:'dirt', c:0x6b5740},
      {s:'cyl', d:[.42,1.20,1.20],p:[0,.72,0],   m:'dirt', c:0x5a4a38},
      {s:'cyl', d:[.30,.16],      p:[0,1.38,0],  m:'dirt', c:0x3a3028},
      {s:'cyl', d:[.26,.05],      p:[0,1.44,0],  m:'neon', c:0xff5a1c, nc:1},
      {s:'box', d:[.20,.06,.62],  p:[.30,1.02,.30],m:'neon',c:0xff8a2c, r:[0,-38,-24], nc:1},
      {s:'box', d:[.16,.05,.50],  p:[-.34,.86,-.26],m:'neon',c:0xff6a1c, r:[0,142,-20],nc:1},
      {s:'sph', d:[.10],          p:[.60,.28,.44],m:'neon', c:0xffb03c, nc:1},
  ]},

  /* ---- 41 · xpw_meteor: RADAR DE METEOROS (parábola sobre mástil) -------------- */
  { id:'xpw_meteor', name:'Radar Meteoro', mass:160, tags:['experiment','scifi'], col:'box', parts:[
      {s:'box', d:[.86,.16,.86], p:[0,.08,0],    m:'metal',  c:0x353c44},
      {s:'cyl', d:[.12,.94],     p:[0,.63,0],    m:'metal',  c:0x5b636b},
      {s:'box', d:[.30,.24,.24], p:[0,1.18,0],   m:'metal',  c:0x454d55},
      {s:'cyl', d:[.66,.10,.34], p:[0,1.56,-.10],m:'chrome', c:0xc4cbd1, r:[-30,0,0], nc:1},
      {s:'cyl', d:[.03,.46],     p:[0,1.62,.16], m:'chrome', c:0xdde3e9, r:[-30,0,0], nc:1},
      {s:'sph', d:[.08],         p:[0,1.78,.32], m:'neon',   c:0xff5a3c, nc:1},
      {s:'box', d:[.24,.06,.14], p:[0,1.30,.20], m:'neon',   c:0x6cf0ff, nc:1},
  ]},

  /* ---- 42 · xpw_firerain: BRASERO DEL CIELO (cuenco sobre trípode con brasas) -- */
  { id:'xpw_firerain', name:'Brasero Cielo', mass:96, tags:['experiment','fun'], col:'box', parts:[
      {s:'cyl', d:[.52,.10],     p:[0,.05,0],    m:'rust',  c:0x7e5c46},
      {s:'cyl', d:[.05,.86],     p:[-.30,.48,-.18],m:'rust',c:0x8e6b52, r:[0,0,20], nc:1},
      {s:'cyl', d:[.05,.86],     p:[.30,.48,-.18], m:'rust',c:0x8e6b52, r:[0,0,-20],nc:1},
      {s:'cyl', d:[.05,.86],     p:[0,.48,.36],    m:'rust',c:0x8e6b52, r:[-22,0,0],nc:1},
      {s:'cyl', d:[.46,.26,.30], p:[0,1.06,0],   m:'rust',  c:0x6f5140},
      {s:'cyl', d:[.42,.05],     p:[0,1.20,0],   m:'neon',  c:0xff7a2c, nc:1},
      {s:'sph', d:[.09],         p:[.14,1.24,.10],m:'neon',  c:0xffc04d, nc:1},
      {s:'sph', d:[.07],         p:[-.16,1.23,-.08],m:'neon',c:0xff5a1c, nc:1},
  ]},

  /* ---- 43 · xpw_sand: RELOJ DE ARENA gigante (dos conos + bastidor) ----------- */
  { id:'xpw_sand', name:'Reloj Arena', mass:112, tags:['experiment','fun'], col:'box', parts:[
      {s:'cyl', d:[.44,.10],     p:[0,.05,0],   m:'wood',  c:0x8a6540},
      {s:'cyl', d:[.05,1.34],    p:[-.34,.77,0],m:'wood',  c:0x9c7448, nc:1},
      {s:'cyl', d:[.05,1.34],    p:[.34,.77,0], m:'wood',  c:0x9c7448, nc:1},
      {s:'cyl', d:[.42,.10],     p:[0,1.49,0],  m:'wood',  c:0x8a6540, nc:1},
      {s:'cone',d:[.32,.60],     p:[0,.40,0],   m:'glass', c:0xbcd8e6, r:[180,0,0]},
      {s:'cone',d:[.32,.60],     p:[0,1.14,0],  m:'glass', c:0xbcd8e6},
      {s:'cone',d:[.26,.34],     p:[0,1.05,0],  m:'dirt',  c:0xcaa361, nc:1},
      {s:'cone',d:[.20,.18],     p:[0,.19,0],   m:'dirt',  c:0xcaa361, r:[180,0,0], nc:1},
  ]},

  /* ---- 44 · xpw_aurora: BOBINA DE AURORA (base, bobinas y esfera verde) ------- */
  { id:'xpw_aurora', name:'Bobina Aurora', mass:98, tags:['experiment','scifi'], col:'cyl', parts:[
      {s:'cyl', d:[.50,.14],     p:[0,.07,0],   m:'metal',  c:0x333a41},
      {s:'cyl', d:[.16,.60],     p:[0,.44,0],   m:'metal',  c:0x565e66},
      {s:'cyl', d:[.34,.10],     p:[0,.82,0],   m:'chrome', c:0xbf8a4a, nc:1},
      {s:'cyl', d:[.30,.10],     p:[0,.96,0],   m:'chrome', c:0xbf8a4a, nc:1},
      {s:'cyl', d:[.26,.10],     p:[0,1.10,0],  m:'chrome', c:0xbf8a4a, nc:1},
      {s:'cyl', d:[.05,.34],     p:[0,1.32,0],  m:'chrome', c:0xd6dce2, nc:1},
      {s:'sph', d:[.20],         p:[0,1.62,0],  m:'neon',   c:0x4dffa8, nc:1},
      {s:'sph', d:[.07],         p:[.30,.30,.30],m:'neon',  c:0xa84dff, nc:1},
  ]},

  /* ---- 45 · xpw_rainbow: PRISMA (cristal triangular sobre pedestal) ----------- */
  { id:'xpw_rainbow', name:'Prisma Arcoiris', mass:70, tags:['experiment','fun'], col:'box', parts:[
      {s:'cyl', d:[.40,.12],     p:[0,.06,0],   m:'metal',  c:0x3a4148},
      {s:'cyl', d:[.10,.52],     p:[0,.38,0],   m:'metal',  c:0x646c74},
      {s:'cyl', d:[.34,.06],     p:[0,.67,0],   m:'metal',  c:0xc2c9cf, nc:1},
      {s:'cone',d:[.34,.62],     p:[0,1.01,0],  m:'glass',  c:0xd8f0ff},
      {s:'cone',d:[.34,.34],     p:[0,1.49,0],  m:'glass',  c:0xd8f0ff, r:[180,0,0], nc:1},
      {s:'box', d:[.30,.05,.05], p:[-.30,1.00,0],m:'neon',  c:0xffffff, nc:1},
      {s:'box', d:[.05,.05,.30], p:[.28,1.00,.12],m:'neon', c:0xff4d4d, nc:1},
  ]},

  /* ---- 46 · xpw_gust: MANGA DE VIENTO (poste + aro + cono de tela) ------------ */
  { id:'xpw_gust', name:'Manga Viento', mass:66, tags:['experiment','road'], col:'box', parts:[
      {s:'box', d:[.54,.14,.54], p:[0,.07,0],   m:'concrete', c:0x9aa0a6},
      {s:'cyl', d:[.07,2.20],    p:[0,1.24,0],  m:'metal',    c:0xb84d2e},
      {s:'cyl', d:[.26,.06],     p:[0,2.30,.16],m:'metal',    c:0x8b939b, r:[90,0,0], nc:1},
      {s:'cyl', d:[.25,.13,1.00],p:[0,2.30,.70],m:'fabric',   c:0xff6a2c, r:[90,0,0], nc:1},
      {s:'cyl', d:[.13,.09,.40], p:[0,2.30,1.38],m:'fabric',  c:0xf2f2f2, r:[90,0,0], nc:1},
      {s:'sph', d:[.07],         p:[0,2.42,0],  m:'metal',    c:0xd6dce2, nc:1},
  ]},

  /* ---- 47 · xpw_leaves: SOPLADORA DE HOJAS (carcasa + turbina + tubo) --------- */
  { id:'xpw_leaves', name:'Sopla Hojas', mass:54, tags:['experiment','industrial'], col:'box', parts:[
      {s:'box', d:[.70,.12,.56], p:[0,.06,0],   m:'metal',  c:0x373e45},
      {s:'cyl', d:[.10,.44],     p:[0,.34,0],   m:'metal',  c:0x5c646c},
      {s:'cyl', d:[.30,.28],     p:[0,.68,0],   m:'plastic',c:0x2f7d3a, r:[90,0,0]},
      {s:'cyl', d:[.24,.04],     p:[0,.68,.16], m:'chrome', c:0xc8cfd5, r:[90,0,0], nc:1},
      {s:'cyl', d:[.13,.18,.72], p:[0,.90,-.30],m:'plastic',c:0x3d9c4a, r:[-64,0,0], nc:1},
      {s:'box', d:[.34,.06,.06], p:[.26,.86,0], m:'plastic',c:0x1e2429, r:[0,0,24], nc:1},
      {s:'box', d:[.22,.05,.12], p:[0,.50,.30], m:'chrome', c:0xd0d7dd, nc:1},
  ]},

  /* ---- 48 · xpw_lowp: BARÓMETRO de baja presión (caja + esfera grande) -------- */
  { id:'xpw_lowp', name:'Baja Presion', mass:82, tags:['experiment','interior'], col:'box', parts:[
      {s:'box', d:[.74,.14,.44], p:[0,.07,0],    m:'wood',   c:0x8a6540},
      {s:'box', d:[.20,.70,.20], p:[-.24,.49,0], m:'wood',   c:0x9c7448},
      {s:'box', d:[.20,.70,.20], p:[.24,.49,0],  m:'wood',   c:0x9c7448},
      {s:'cyl', d:[.42,.16],     p:[0,1.02,0],   m:'metal',  c:0x5d656d, r:[90,0,0]},
      {s:'cyl', d:[.36,.04],     p:[0,1.02,.10], m:'plastic',c:0xf4f0e4, r:[90,0,0], nc:1},
      {s:'box', d:[.03,.30,.03], p:[0,1.12,.14], m:'metal',  c:0x22262b, r:[0,0,26], nc:1},
      {s:'sph', d:[.06],         p:[0,1.02,.15], m:'metal',  c:0xc9d0d6, nc:1},
      {s:'box', d:[.30,.06,.06], p:[0,1.28,0],   m:'metal',  c:0x6f777f, nc:1},
  ]},

  /* ---- 49 · xpw_random: RULETA DEL CLIMA (disco vertical + puntero) ----------- */
  { id:'xpw_random', name:'Ruleta Clima', mass:120, tags:['experiment','fun'], col:'box', parts:[
      {s:'box', d:[.80,.14,.60], p:[0,.07,0],   m:'wood',    c:0x8a6540},
      {s:'box', d:[.14,.60,.14], p:[0,.44,0],   m:'wood',    c:0x9c7448},
      {s:'cyl', d:[.62,.10],     p:[0,1.20,0],  m:'wood',    c:0xa87c4c, r:[90,0,0]},
      {s:'cyl', d:[.56,.04],     p:[0,1.20,.07],m:'plastic', c:0xf0ece0, r:[90,0,0], nc:1},
      {s:'cyl', d:[.10,.10],     p:[0,1.20,.10],m:'plastic', c:0x2b3138, r:[90,0,0], nc:1},
      {s:'box', d:[.06,.22,.06], p:[0,1.92,.02],m:'plastic', c:0xff5a3c, r:[0,0,0], nc:1},
      {s:'box', d:[.44,.05,.05], p:[0,1.20,.12],m:'plastic', c:0x39c0ff, r:[0,0,32], nc:1},
      {s:'box', d:[.44,.05,.05], p:[0,1.20,.12],m:'plastic', c:0xffd24d, r:[0,0,-32],nc:1},
  ]},

  /* ---- 50 · xpw_master: MESA DE CLIMA (escritorio + pantalla + teclado + palancas) */
  { id:'xpw_master', name:'Mesa Clima', mass:280, tags:['experiment','interior'], col:'box', parts:[
      {s:'box', d:[1.50,.10,.76], p:[0,.78,0],    m:'metal',  c:0x3d444c},
      {s:'box', d:[.14,.76,.66],  p:[-.66,.38,0], m:'metal',  c:0x2f363d},
      {s:'box', d:[.14,.76,.66],  p:[.66,.38,0],  m:'metal',  c:0x2f363d},
      {s:'box', d:[1.20,.66,.10], p:[0,1.20,-.28],m:'metal',  c:0x262c33, r:[-12,0,0]},
      {s:'box', d:[1.08,.54,.03], p:[0,1.20,-.21],m:'neon',   c:0x39dcff, r:[-12,0,0], nc:1},
      {s:'box', d:[.68,.03,.24],  p:[0,.85,.18],  m:'plastic',c:0x1d2227, nc:1},
      {s:'box', d:[.60,.02,.16],  p:[0,.87,.18],  m:'plastic',c:0x8d959d, nc:1},
      {s:'cyl', d:[.035,.22],     p:[.52,.92,.16],m:'plastic',c:0xd6dce2, r:[-16,0,0], nc:1},
      {s:'sph', d:[.05],          p:[.52,1.03,.13],m:'neon',  c:0xff5a3c, nc:1},
      {s:'cyl', d:[.035,.22],     p:[-.52,.92,.16],m:'plastic',c:0xd6dce2, r:[-16,0,0],nc:1},
      {s:'sph', d:[.05],          p:[-.52,1.03,.13],m:'neon', c:0x7dff8a, nc:1},
  ]},

]);
