/* ============================================================
   SUX SANDBOX — PROPS DE LOS EXPERIMENTOS DE "TAMAÑO, FÍSICA, JUGADOR Y RAGDOLL"
   (core_v.js les engancha el comportamiento con XP.add)
   ------------------------------------------------------------
   POR QUÉ VIVEN ACÁ Y NO EN core_v.js
   core_u.js permite crear el prop en tiempo de ejecución (XP.add({parts:[…]})), pero esos
   props NO los revisa validate.js. Los 26 de este grupo son la CARA visible de cada
   experimento: si uno mide 40 m o usa un material inexistente, el experimento "anda" pero
   se ve roto. Declarándolos acá entran en la misma validación estática que los otros 398
   (medidas, materiales, masas, ids y nombres únicos).

   POR QUÉ EL TAB DICE 'ent'
   validate.js sólo acepta acc|veh|ent. core_u.js mueve TODA sección cuyo id empiece con
   'xp' a la pestaña "Experimentos" en el arranque, así que la sección se llama 'xpv_lab' y
   el cambio de pestaña lo hace el motor con una línea.

   CRITERIO DE DISEÑO DE LAS FORMAS
   Cada aparato tiene que decir QUÉ HACE de un vistazo, sin leer el cartel: la flecha de la
   pistola que agranda apunta ARRIBA y es verde; la que achica apunta ABAJO y es naranja; el
   imán es una herradura; el cañón tiene rueda y caño. Los detalles finos (flechas, aros,
   luces, agujas) van con nc:1 — no colisionan: la física es el bloque principal y así el
   personaje no se traba al acercarse a apretar el botón, que es justo lo que tiene que hacer.
   Todos apoyan en y=0 y están centrados en X/Z (convención del motor).
   ============================================================ */

HP.section('xpv_lab','Laboratorio','ent',[

  /* ---------- 1. rayo que AGRANDA: flecha gruesa hacia ARRIBA, verde ---------- */
  { id:'xpv_grow', name:'RayoCrecer', mass:58, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.86,.13,.86], p:[0,.065,0],   m:'metal',  c:0x39424c},
      {s:'cyl', d:[.13,.66],     p:[0,.46,0],    m:'metal',  c:0x8f979f},
      {s:'box', d:[.62,.34,.62], p:[0,.96,0],    m:'metal',  c:0x2e343b},
      {s:'cyl', d:[.09,.34],     p:[0,1.28,0],   m:'neon',   c:0x59ff86, nc:1},
      {s:'cone',d:[.24,.36],     p:[0,1.63,0],   m:'neon',   c:0x59ff86, nc:1},
      {s:'box', d:[.70,.06,.10], p:[0,1.13,0],   m:'neon',   c:0x59ff86, nc:1},
  ]},

  /* ---------- 2. rayo que ACHICA: la MISMA silueta pero flecha hacia ABAJO y naranja ----- */
  { id:'xpv_shrink', name:'RayoAchicar', mass:52, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.86,.13,.86], p:[0,.065,0],   m:'metal',  c:0x39424c},
      {s:'cyl', d:[.13,.60],     p:[0,.43,0],    m:'metal',  c:0x8f979f},
      {s:'box', d:[.50,.28,.50], p:[0,.87,0],    m:'metal',  c:0x2e343b},
      {s:'cyl', d:[.075,.28],    p:[0,1.30,0],   m:'neon',   c:0xff8a3a, nc:1},
      {s:'cone',d:[.20,.30],     p:[0,1.11,0],   m:'neon',   c:0xff8a3a, nc:1, r:[180,0,0]},
      {s:'box', d:[.44,.05,.09], p:[0,1.47,0],   m:'neon',   c:0xff8a3a, nc:1},
  ]},

  /* ---------- 3. escala libre: consola con un DIAL grande acostado y una regla ---------- */
  { id:'xpv_scale', name:'DialEscala', mass:46, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.92,.16,.66], p:[0,.08,0],    m:'metal',  c:0x333a41},
      {s:'box', d:[.76,.56,.54], p:[0,.44,0],    m:'plastic',c:0x434b53},
      {s:'cyl', d:[.24,.09],     p:[0,.76,.02],  m:'metal',  c:0xb9c1c8},
      {s:'box', d:[.05,.035,.22],p:[0,.81,.10],  m:'neon',   c:0xffd24d, nc:1},
      {s:'box', d:[.70,.05,.03], p:[0,.60,.28],  m:'neon',   c:0x59d8ff, nc:1},
  ]},

  /* ---------- 4. masa: balanza de platillo con dos pesas ---------- */
  { id:'xpv_mass', name:'BalanzaMasa', mass:64, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.80,.18,.80], p:[0,.09,0],    m:'metal',  c:0x3a4149},
      {s:'cyl', d:[.09,.52],     p:[0,.44,0],    m:'metal',  c:0x9aa2aa},
      {s:'box', d:[.72,.07,.60], p:[0,.73,0],    m:'metal',  c:0xc3cbd2},
      {s:'cyl', d:[.13,.20],     p:[-.20,.87,0], m:'metal',  c:0x5b636b},
      {s:'cyl', d:[.08,.13],     p:[.20,.83,0],  m:'metal',  c:0x5b636b},
      {s:'cyl', d:[.19,.05],     p:[0,1.00,-.24],m:'neon',   c:0xffe08a, nc:1, r:[90,0,0]},
  ]},

  /* ---------- 5. gravedad del mundo: obelisco con tres aros ---------- */
  { id:'xpv_grav', name:'TorreGravedad', mass:180, tags:['experiment','scifi'], parts:[
      {s:'box', d:[1.00,.20,1.00], p:[0,.10,0],  m:'concrete',c:0x6b7076},
      {s:'cyl', d:[.20,.34,1.80],  p:[0,1.10,0], m:'metal',  c:0x474e56},
      {s:'cyl', d:[.40,.05],       p:[0,.62,0],  m:'neon',   c:0x8f6cff, nc:1},
      {s:'cyl', d:[.33,.05],       p:[0,1.24,0], m:'neon',   c:0x8f6cff, nc:1},
      {s:'cyl', d:[.26,.05],       p:[0,1.80,0], m:'neon',   c:0x8f6cff, nc:1},
      {s:'sph', d:[.16],           p:[0,2.10,0], m:'neon',   c:0xd8c8ff, nc:1},
  ]},

  /* ---------- 6. zona antigravedad: plato bajo con aros flotando ---------- */
  { id:'xpv_agrav', name:'PlacaAntigrav', mass:70, tags:['experiment','scifi'], parts:[
      {s:'cyl', d:[.90,.16],       p:[0,.08,0],  m:'metal',  c:0x39414a},
      {s:'cyl', d:[.66,.07],       p:[0,.19,0],  m:'metal',  c:0x767e86},
      {s:'cyl', d:[.58,.04],       p:[0,.44,0],  m:'neon',   c:0x6cf0ff, nc:1},
      {s:'cyl', d:[.44,.04],       p:[0,.72,0],  m:'neon',   c:0x6cf0ff, nc:1},
      {s:'cyl', d:[.28,.04],       p:[0,.96,0],  m:'neon',   c:0x6cf0ff, nc:1},
  ]},

  /* ---------- 7. tiempo: reloj de pie con dos agujas ---------- */
  { id:'xpv_time', name:'RelojTiempo', mass:56, tags:['experiment','interior'], parts:[
      {s:'box', d:[.62,.14,.52], p:[0,.07,0],    m:'metal',  c:0x353c44},
      {s:'cyl', d:[.07,.90],     p:[0,.58,0],    m:'metal',  c:0x99a1a9},
      {s:'cyl', d:[.42,.09],     p:[0,1.34,0],   m:'metal',  c:0x2b3138, r:[90,0,0]},
      {s:'cyl', d:[.36,.03],     p:[0,1.34,.06], m:'neon',   c:0xfff0c0, nc:1, r:[90,0,0]},
      {s:'box', d:[.035,.30,.02],p:[0,1.46,.09], m:'metal',  c:0x1c2026, nc:1},
      {s:'box', d:[.20,.035,.02],p:[.09,1.34,.09],m:'metal', c:0x1c2026, nc:1},
  ]},

  /* ---------- 8. rebote: pelota de goma enorme sobre un pedestal ---------- */
  { id:'xpv_bounce', name:'PelotaRebote', mass:44, tags:['experiment','fun'], parts:[
      {s:'cyl', d:[.42,.34,.30], p:[0,.15,0],    m:'concrete',c:0x767b80},
      {s:'cyl', d:[.36,.07],     p:[0,.33,0],    m:'metal',  c:0x8d949b},
      {s:'sph', d:[.40],         p:[0,.76,0],    m:'rubber', c:0xff5f4d},
      {s:'cyl', d:[.41,.05],     p:[0,.76,0],    m:'rubber', c:0xf7f1e6, nc:1},
  ]},

  /* ---------- 9. hielo: losa resbalosa con dos bloques de escarcha ---------- */
  { id:'xpv_ice', name:'LosaHielo', mass:110, tags:['experiment','enviroment'], parts:[
      {s:'box', d:[1.50,.18,1.50], p:[0,.09,0],  m:'concrete',c:0x8d949c},
      {s:'box', d:[1.34,.10,1.34], p:[0,.22,0],  m:'glass',  c:0xa8e6ff},
      {s:'box', d:[.30,.30,.30],   p:[-.44,.40,-.40], m:'glass', c:0xd6f4ff, r:[0,22,0]},
      {s:'box', d:[.22,.22,.22],   p:[.40,.36,.36],   m:'glass', c:0xd6f4ff, r:[0,-30,0]},
  ]},

  /* ---------- 10. salto alto: plataforma con dos resortes y flecha ---------- */
  { id:'xpv_jump', name:'RampaSalto', mass:66, tags:['experiment','fun'], parts:[
      {s:'box', d:[1.10,.14,1.10], p:[0,.07,0],  m:'metal',  c:0x39404a},
      {s:'cyl', d:[.10,.26],       p:[-.30,.27,0],m:'metal', c:0xb0b8bf, nc:1},
      {s:'cyl', d:[.10,.26],       p:[.30,.27,0], m:'metal', c:0xb0b8bf, nc:1},
      {s:'box', d:[1.00,.10,1.00], p:[0,.45,0],  m:'rubber', c:0x2d3238},
      {s:'box', d:[.14,.03,.62],   p:[0,.51,0],  m:'neon',   c:0x7dff8a, nc:1},
      {s:'box', d:[.34,.03,.34],   p:[0,.51,.20],m:'neon',   c:0x7dff8a, nc:1, r:[0,45,0]},
  ]},

  /* ---------- 11. doble/triple salto: tres escalones que suben ---------- */
  { id:'xpv_djump', name:'TripleEscalon', mass:96, tags:['experiment','fun'], parts:[
      {s:'box', d:[1.20,.24,.46], p:[0,.12,.46],  m:'metal', c:0x3b434c},
      {s:'box', d:[1.00,.24,.42], p:[0,.36,.04],  m:'metal', c:0x4a535d},
      {s:'box', d:[.80,.24,.38],  p:[0,.60,-.34], m:'metal', c:0x5a646f},
      {s:'box', d:[.90,.03,.16],  p:[0,.245,.46], m:'neon',  c:0x59d8ff, nc:1},
      {s:'box', d:[.72,.03,.14],  p:[0,.485,.04], m:'neon',  c:0x59d8ff, nc:1},
      {s:'box', d:[.56,.03,.12],  p:[0,.725,-.34],m:'neon',  c:0x59d8ff, nc:1},
  ]},

  /* ---------- 12. correr: cinta de gimnasio con rodillos ---------- */
  { id:'xpv_sprint', name:'CintaVeloz', mass:120, tags:['experiment','interior'], parts:[
      {s:'box', d:[.82,.16,1.80], p:[0,.08,0],    m:'metal', c:0x333941},
      /* los rodillos van como CAJAS y no como cilindros acostados a propósito: validate.js
         calcula el AABB SIN rotar, así que un cilindro de 78 cm de largo tumbado con r:[0,0,90]
         le parece que baja hasta y=-0.19 y avisa "no apoya en y=0". La caja mide lo mismo en
         pantalla, no dispara el falso aviso y ahorra dos ConvexPolyhedron en la colisión. */
      {s:'box', d:[.78,.26,.26],  p:[0,.20,-.80], m:'metal', c:0x9aa2a9},
      {s:'box', d:[.78,.26,.26],  p:[0,.20,.80],  m:'metal', c:0x9aa2a9},
      {s:'box', d:[.74,.05,1.62], p:[0,.31,0],    m:'rubber',c:0x1d2126},
      {s:'cyl', d:[.045,.86],     p:[-.36,.74,.74],m:'metal',c:0x7d858c, nc:1},
      {s:'cyl', d:[.045,.86],     p:[.36,.74,.74], m:'metal',c:0x7d858c, nc:1},
      {s:'box', d:[.80,.20,.07],  p:[0,1.14,.74], m:'plastic',c:0x2a3038, nc:1},
  ]},

  /* ---------- 13. vuelo: plataforma con dos alas inclinadas ---------- */
  { id:'xpv_fly', name:'PlacaVuelo', mass:58, tags:['experiment','scifi'], parts:[
      {s:'cyl', d:[.72,.16],      p:[0,.08,0],    m:'metal', c:0x363d45},
      {s:'cyl', d:[.52,.06],      p:[0,.19,0],    m:'metal', c:0x8b939a},
      {s:'box', d:[.90,.05,.34],  p:[-.62,.52,0], m:'metal', c:0xc9d1d8, r:[0,0,26], nc:1},
      {s:'box', d:[.90,.05,.34],  p:[.62,.52,0],  m:'metal', c:0xc9d1d8, r:[0,0,-26], nc:1},
      {s:'sph', d:[.13],          p:[0,.42,0],    m:'neon',  c:0xa9e6ff, nc:1},
  ]},

  /* ---------- 14. gigante: portal ALTO con galón hacia arriba ---------- */
  { id:'xpv_giant', name:'PortalGigante', mass:280, tags:['experiment','building'], parts:[
      {s:'box', d:[.26,2.60,.34], p:[-.86,1.30,0], m:'concrete',c:0x74797f},
      {s:'box', d:[.26,2.60,.34], p:[.86,1.30,0],  m:'concrete',c:0x74797f},
      {s:'box', d:[2.00,.30,.40], p:[0,2.75,0],    m:'concrete',c:0x63686e},
      {s:'box', d:[.60,.09,.09],  p:[-.22,2.18,.20],m:'neon',  c:0x7dff8a, nc:1, r:[0,0,38]},
      {s:'box', d:[.60,.09,.09],  p:[.22,2.18,.20], m:'neon',  c:0x7dff8a, nc:1, r:[0,0,-38]},
      {s:'box', d:[1.60,.06,.06], p:[0,.06,.20],   m:'neon',  c:0x7dff8a, nc:1},
  ]},

  /* ---------- 15. diminuto: el MISMO portal pero bajo y con galón hacia abajo ---------- */
  { id:'xpv_tiny', name:'PortalMini', mass:90, tags:['experiment','building'], parts:[
      {s:'box', d:[.20,.86,.26], p:[-.42,.43,0],  m:'concrete',c:0x74797f},
      {s:'box', d:[.20,.86,.26], p:[.42,.43,0],   m:'concrete',c:0x74797f},
      {s:'box', d:[1.04,.20,.32],p:[0,.96,0],     m:'concrete',c:0x63686e},
      {s:'box', d:[.40,.07,.07], p:[-.14,.60,.16],m:'neon',   c:0xff8a3a, nc:1, r:[0,0,-38]},
      {s:'box', d:[.40,.07,.07], p:[.14,.60,.16], m:'neon',   c:0xff8a3a, nc:1, r:[0,0,38]},
      {s:'box', d:[.80,.05,.05], p:[0,.30,.16],   m:'neon',   c:0xff8a3a, nc:1},
  ]},

  /* ---------- 16. clonador: máquina con tres cubos cada vez más chicos ---------- */
  { id:'xpv_clone', name:'CajaClon', mass:88, tags:['experiment','industrial'], parts:[
      {s:'box', d:[1.00,.70,.80], p:[0,.35,0],    m:'metal', c:0x3d444c},
      {s:'box', d:[.86,.10,.66],  p:[0,.75,0],    m:'metal', c:0x8a929a},
      {s:'box', d:[.30,.30,.30],  p:[-.30,.95,0], m:'cardboard',c:0xc8a06a},
      {s:'box', d:[.22,.22,.22],  p:[.02,.91,0],  m:'cardboard',c:0xc8a06a, nc:1},
      {s:'box', d:[.14,.14,.14],  p:[.28,.87,0],  m:'cardboard',c:0xc8a06a, nc:1},
      {s:'box', d:[.20,.14,.04],  p:[0,.52,.42],  m:'metal', c:0x59d8ff, nc:1},
  ]},

  /* ---------- 17. lluvia de props: tolva de embudo sobre cuatro patas ---------- */
  { id:'xpv_rainp', name:'TolvaLluvia', mass:130, tags:['experiment','industrial'], parts:[
      {s:'cyl', d:[.16,.90],      p:[-.42,.45,-.42], m:'metal', c:0x565e66},
      {s:'cyl', d:[.16,.90],      p:[.42,.45,-.42],  m:'metal', c:0x565e66},
      {s:'cyl', d:[.16,.90],      p:[-.42,.45,.42],  m:'metal', c:0x565e66},
      {s:'cyl', d:[.16,.90],      p:[.42,.45,.42],   m:'metal', c:0x565e66},
      {s:'cyl', d:[.86,.20,.80],  p:[0,1.30,0],      m:'corrugated', c:0x8b8f94},
      {s:'cyl', d:[.90,.26],      p:[0,1.83,0],      m:'corrugated', c:0x74797e},
      {s:'cyl', d:[.22,.24],      p:[0,.78,0],       m:'metal', c:0x39414a, nc:1},
  ]},

  /* ---------- 18. imán: herradura clásica, puntas rojas ---------- */
  { id:'xpv_magnet', name:'ImanGrande', mass:150, tags:['experiment','fun'], parts:[
      {s:'box', d:[.30,1.10,.34], p:[-.42,.55,0], m:'metal', c:0x4a5158},
      {s:'box', d:[.30,1.10,.34], p:[.42,.55,0],  m:'metal', c:0x4a5158},
      {s:'box', d:[1.14,.32,.34], p:[0,1.26,0],   m:'metal', c:0x4a5158},
      {s:'box', d:[.32,.28,.36],  p:[-.42,.14,0], m:'paint', c:0xd93a2f},
      {s:'box', d:[.32,.28,.36],  p:[.42,.14,0],  m:'paint', c:0xd93a2f},
      {s:'box', d:[.60,.05,.05],  p:[0,1.52,0],   m:'neon',  c:0x6cf0ff, nc:1},
  ]},

  /* ---------- 19. repulsor: antena de plato inclinada ---------- */
  { id:'xpv_repel', name:'PlatoRepulsor', mass:105, tags:['experiment','scifi'], parts:[
      {s:'cyl', d:[.56,.18],      p:[0,.09,0],    m:'metal', c:0x353c44},
      {s:'cyl', d:[.12,.80],      p:[0,.58,0],    m:'metal', c:0x8f979e},
      {s:'cone',d:[.72,.52],      p:[0,1.24,-.10],m:'metal', c:0xbcc4cb, r:[-32,0,0]},
      {s:'cyl', d:[.06,.44],      p:[0,1.36,.22], m:'metal', c:0x6e767d, nc:1, r:[-32,0,0]},
      {s:'sph', d:[.13],          p:[0,1.52,.36], m:'neon',  c:0xff6a3a, nc:1},
  ]},

  /* ---------- 20. explosión: caja con émbolo detonador ---------- */
  { id:'xpv_boom', name:'CajaExplosion', mass:40, tags:['experiment','fun'], parts:[
      {s:'box', d:[.70,.56,.70], p:[0,.28,0],     m:'wood',  c:0xa8763f},
      {s:'box', d:[.74,.14,.74], p:[0,.34,0],     m:'paint', c:0xd93a2f},
      {s:'box', d:[.60,.08,.60], p:[0,.60,0],     m:'wood',  c:0x8d6234},
      {s:'cyl', d:[.05,.22],     p:[0,.75,0],     m:'metal', c:0xb6bec5, nc:1},
      {s:'sph', d:[.11],         p:[0,.90,0],     m:'paint', c:0xd93a2f, nc:1},
  ]},

  /* ---------- 21. congelador de área: tanque con aletas y aro azul ---------- */
  { id:'xpv_freezr', name:'CongelaArea', mass:118, tags:['experiment','industrial'], parts:[
      {s:'cyl', d:[.46,.14],     p:[0,.07,0],     m:'metal', c:0x333a42},
      {s:'cyl', d:[.34,1.10],    p:[0,.69,0],     m:'metal', c:0x7f96a8},
      {s:'cyl', d:[.36,.20],     p:[0,1.32,0],    m:'metal', c:0x4d5862},
      {s:'box', d:[.86,.44,.05], p:[0,.80,0],     m:'metal', c:0xa8bcca, nc:1},
      {s:'box', d:[.05,.44,.86], p:[0,.80,0],     m:'metal', c:0xa8bcca, nc:1},
      {s:'cyl', d:[.44,.05],     p:[0,.24,0],     m:'neon',  c:0x8fe8ff, nc:1},
      {s:'sph', d:[.11],         p:[0,1.48,0],    m:'neon',  c:0x8fe8ff, nc:1},
  ]},

  /* ---------- 22. pegamento de área: tambor con brazo y boquilla ---------- */
  { id:'xpv_weld', name:'PegaArea', mass:96, tags:['experiment','industrial'], parts:[
      {s:'cyl', d:[.44,.86],     p:[0,.43,0],     m:'rust',  c:0xb07a4a},
      {s:'cyl', d:[.46,.07],     p:[0,.24,0],     m:'rust',  c:0x8d5f38, nc:1},
      {s:'cyl', d:[.46,.07],     p:[0,.66,0],     m:'rust',  c:0x8d5f38, nc:1},
      {s:'cyl', d:[.07,.60],     p:[.16,1.10,0],  m:'metal', c:0x9aa2a9, r:[0,0,-24]},
      {s:'cone',d:[.13,.24],     p:[.42,1.32,0],  m:'metal', c:0xd0d8de, nc:1, r:[180,0,24]},
      {s:'cyl', d:[.34,.06],     p:[.52,.03,0],   m:'neon',  c:0xffd24d, nc:1},
  ]},

  /* ---------- 23. catapulta: base, brazo inclinado, cuchara y contrapeso ---------- */
  { id:'xpv_catap', name:'CatapultaXP', mass:340, tags:['experiment','fun'], parts:[
      {s:'box', d:[1.10,.22,1.90], p:[0,.11,0],   m:'wood',  c:0x8a6034},
      {s:'box', d:[.16,.80,.16],   p:[-.42,.62,-.20], m:'wood', c:0x74522c},
      {s:'box', d:[.16,.80,.16],   p:[.42,.62,-.20],  m:'wood', c:0x74522c},
      {s:'cyl', d:[.09,1.00],      p:[0,1.02,-.20], m:'metal',c:0x9aa2a9, r:[0,0,90], nc:1},
      {s:'box', d:[.22,.14,1.90],  p:[0,1.28,.44],  m:'wood', c:0x9c7040, r:[-26,0,0]},
      {s:'box', d:[.40,.26,.34],   p:[0,1.72,1.28], m:'metal',c:0x6c747b},
      {s:'box', d:[.44,.34,.34],   p:[0,.92,-.70],  m:'concrete',c:0x707579},
  ]},

  /* ---------- 24. cañón de props: rueda, cureña y caño levantado ---------- */
  { id:'xpv_cannon', name:'CanonProps', mass:420, tags:['experiment','fun'], parts:[
      {s:'box', d:[.66,.24,1.50], p:[0,.34,0],     m:'wood',  c:0x6f4d2a},
      {s:'cyl', d:[.42,.14],      p:[-.44,.42,-.30], m:'wood',c:0x51391f, r:[0,0,90]},
      {s:'cyl', d:[.42,.14],      p:[.44,.42,-.30],  m:'wood',c:0x51391f, r:[0,0,90]},
      {s:'cyl', d:[.20,.26,1.60], p:[0,1.02,.34],  m:'metal', c:0x40474e, r:[-16,0,0]},
      {s:'cyl', d:[.29,.16],      p:[0,.80,-.36],  m:'metal', c:0x2d3339, r:[-16,0,0], nc:1},
      {s:'cyl', d:[.22,.10],      p:[0,1.24,1.02], m:'metal', c:0x6e767d, r:[-16,0,0], nc:1},
      {s:'box', d:[.30,.36,.20],  p:[0,.72,-.72],  m:'wood',  c:0x8a6034, nc:1},
  ]},

  /* ---------- 25. trampolín: aro, lona y cuatro patas ---------- */
  { id:'xpv_tramp', name:'Trampolin', mass:150, tags:['experiment','fun'], parts:[
      {s:'cyl', d:[1.50,.14],     p:[0,.56,0],     m:'metal', c:0x565e66},
      {s:'cyl', d:[1.34,.09],     p:[0,.60,0],     m:'fabric',c:0x2b3a58},
      {s:'cyl', d:[.09,.56],      p:[-.92,.28,-.92],m:'metal',c:0x7f878e},
      {s:'cyl', d:[.09,.56],      p:[.92,.28,-.92], m:'metal',c:0x7f878e},
      {s:'cyl', d:[.09,.56],      p:[-.92,.28,.92], m:'metal',c:0x7f878e},
      {s:'cyl', d:[.09,.56],      p:[.92,.28,.92],  m:'metal',c:0x7f878e},
      {s:'cyl', d:[1.44,.05],     p:[0,.66,0],     m:'neon',  c:0x7dff8a, nc:1},
  ]},

  /* ---------- 26. ragdoll: percha de taller con un muñeco colgado ---------- */
  { id:'xpv_rag', name:'PerchaMunieco', mass:150, tags:['experiment','interior'], parts:[
      {s:'box', d:[.90,.16,.90], p:[0,.08,0],     m:'metal', c:0x353c44},
      {s:'cyl', d:[.09,2.10],    p:[-.34,1.13,0], m:'metal', c:0x9aa2a9},
      {s:'cyl', d:[.07,.90],     p:[.08,2.14,0],  m:'metal', c:0x9aa2a9, r:[0,0,90]},
      {s:'sph', d:[.16],         p:[.34,1.72,0],  m:'fabric',c:0xd9c9a8, nc:1},
      {s:'box', d:[.34,.52,.20], p:[.34,1.30,0],  m:'fabric',c:0xc8b48c, nc:1},
      {s:'box', d:[.10,.46,.12], p:[.16,.80,0],   m:'fabric',c:0xc8b48c, nc:1},
      {s:'box', d:[.10,.46,.12], p:[.52,.80,0],   m:'fabric',c:0xc8b48c, nc:1},
      {s:'box', d:[.44,.06,.12], p:[.34,1.50,0],  m:'fabric',c:0xa89572, nc:1},
  ]},

]);
