/* props/entities.js — ENTIDADES: objetos que "hacen algo" en el sandbox.
   Convención: y=0 = base del objeto, centrado en X/Z. Datos planos, nada de three/cannon. */
HP.section('entities','Entidades','ent',[

  // --- EXPLOSIVOS ------------------------------------------------------------

  // tambor de 200 L rojo con franja amarilla y tapón
  { id:'t_barrel_exp', name:'ExplBarrel', mass:110, tags:['explosive','barrel','fuel'], parts:[
      {s:'cyl', d:[.29,.88],  p:[0,.44,0],   m:'metal',  c:0xc8302a},
      {s:'cyl', d:[.305,.05], p:[0,.10,0],   m:'metal',  c:0x8a1f18, nc:1},
      {s:'cyl', d:[.305,.05], p:[0,.84,0],   m:'metal',  c:0x8a1f18, nc:1},
      {s:'cyl', d:[.30,.15],  p:[0,.60,0],   m:'paint',  c:0xf2e14a, nc:1},
      {s:'cyl', d:[.085,.05], p:[.13,.90,0], m:'chrome', nc:1},
  ]},

  // garrafa de gas: cuerpo, casquete cónico, collarín y válvula
  { id:'t_gas_bottle', name:'GasBottle', mass:65, tags:['explosive','gas','tank'], parts:[
      {s:'cyl', d:[.18,1.05],     p:[0,.525,0], m:'metal',  c:0xe08a1e},
      {s:'cyl', d:[.10,.18,.14],  p:[0,1.12,0], m:'metal',  c:0xe08a1e},
      {s:'cyl', d:[.19,.06],      p:[0,.03,0],  m:'steel',  c:0x6a7078, nc:1},
      {s:'cyl', d:[.05,.11],      p:[0,1.24,0], m:'chrome', nc:1},
      {s:'cyl', d:[.13,.17],      p:[0,1.26,0], m:'steel',  c:0x8a9098, nc:1},
  ]},

  // cajón de dinamita: cajón con listones y cartuchos asomando
  { id:'t_dyna_crate', name:'DynaCrate', mass:30, tags:['explosive','crate','wood'], parts:[
      {s:'box', d:[.70,.42,.46], p:[0,.21,0],     m:'wood',  c:0x8a5a30},
      {s:'box', d:[.72,.08,.48], p:[0,.36,0],     m:'plank', c:0x6b4423, nc:1},
      {s:'box', d:[.72,.08,.48], p:[0,.06,0],     m:'plank', c:0x6b4423, nc:1},
      {s:'cyl', d:[.045,.30],    p:[-.13,.55,.06],m:'paint', c:0xc4392e, nc:1},
      {s:'cyl', d:[.045,.30],    p:[.02,.57,-.05],m:'paint', c:0xc4392e, nc:1},
      {s:'cyl', d:[.045,.30],    p:[.16,.54,.08], m:'paint', c:0xc4392e, nc:1},
  ]},

  // TNT: cubo rojo con banda blanca, tapas de madera y mecha
  { id:'t_tnt', name:'TntBlock', mass:25, tags:['explosive','tnt','box'], parts:[
      {s:'box', d:[.60,.60,.60], p:[0,.30,0],       m:'paint',  c:0xb8362c},
      {s:'box', d:[.61,.18,.61], p:[0,.30,0],       m:'paint',  c:0xe8e3d5, nc:1},
      {s:'box', d:[.62,.06,.62], p:[0,.03,0],       m:'wood',   c:0x7a5a3a, nc:1},
      {s:'box', d:[.62,.06,.62], p:[0,.57,0],       m:'wood',   c:0x7a5a3a, nc:1},
      {s:'cyl', d:[.022,.16],    p:[.18,.66,.18],   m:'fabric', c:0x2a2a2a, nc:1},
  ]},

  // mina antitanque: disco chato, anillo de aviso y pulsador rojo
  { id:'t_mine', name:'LandMine', mass:9, tags:['explosive','mine','trap'], parts:[
      {s:'cyl', d:[.16,.09],  p:[0,.045,0], m:'metal', c:0x545c46},
      {s:'cyl', d:[.165,.02], p:[0,.075,0], m:'paint', c:0xe8c53a, nc:1},
      {s:'cyl', d:[.13,.04],  p:[0,.105,0], m:'metal', c:0x454c39, nc:1},
      {s:'cyl', d:[.055,.05], p:[0,.14,0],  m:'paint', c:0xcf3f2b, nc:1},
  ]},

  // fuegos artificiales: base de madera con tres morteros de colores
  { id:'t_firework', name:'FireworkTube', mass:8, tags:['explosive','firework','fun'], parts:[
      {s:'box', d:[.62,.12,.30], p:[0,.06,0],    m:'wood',      c:0x7a5c38},
      {s:'cyl', d:[.075,.60],    p:[-.20,.42,0], m:'cardboard', c:0xd4453e},
      {s:'cyl', d:[.075,.60],    p:[0,.42,0],    m:'cardboard', c:0x2f6bd4},
      {s:'cyl', d:[.075,.60],    p:[.20,.42,0],  m:'cardboard', c:0x3fa54a},
      {s:'cyl', d:[.085,.06],    p:[-.20,.74,0], m:'paint',     c:0xf0e04a, nc:1},
      {s:'cyl', d:[.085,.06],    p:[0,.74,0],    m:'paint',     c:0xf0e04a, nc:1},
      {s:'cyl', d:[.085,.06],    p:[.20,.74,0],  m:'paint',     c:0xf0e04a, nc:1},
  ]},

  // --- FÍSICA / MECANISMOS ---------------------------------------------------

  // globo de helio con hilo y contrapeso apoyado en el piso
  { id:'t_balloon', name:'Balloon01', mass:1, tags:['helium','balloon','float'], parts:[
      {s:'cyl',  d:[.09,.08],  p:[0,.04,0],  m:'fabric',  c:0x3a3a42},
      {s:'cyl',  d:[.008,1.10],p:[0,.63,0],  m:'fabric',  c:0xdedede, nc:1},
      {s:'cone', d:[.10,.16],  p:[0,1.24,0], m:'plastic', c:0xd63a4e, r:[180,0,0], nc:1},
      {s:'sph',  d:[.36],      p:[0,1.55,0], m:'plastic', c:0xd63a4e},
  ]},

  // propulsor: patín, cuerpo, campana de tobera y anillo de plasma
  { id:'t_thruster', name:'Thruster01', mass:60, tags:['thruster','rocket','force'], parts:[
      {s:'cyl', d:[.26,.05],     p:[0,.025,0], m:'metal', c:0x5a6068},
      {s:'cyl', d:[.20,.55],     p:[0,.30,0],  m:'steel', c:0x767c86},
      {s:'cyl', d:[.26,.17,.30], p:[0,.72,0],  m:'metal', c:0x8a4a2a},
      {s:'box', d:[.07,.30,.07], p:[.21,.28,0],m:'steel', c:0x9aa0a8, nc:1},
      {s:'box', d:[.07,.30,.07], p:[-.21,.28,0],m:'steel',c:0x9aa0a8, nc:1},
      {s:'cyl', d:[.15,.05],     p:[0,.86,0],  m:'neon',  c:0x4fc8ff, nc:1},
  ]},

  // resorte de compresión: platos de acero y cuatro espiras cromadas
  { id:'t_spring', name:'Spring01', mass:40, tags:['spring','bouncy','mech'], parts:[
      {s:'cyl', d:[.22,.05], p:[0,.025,0], m:'steel',  c:0x6a7078},
      {s:'cyl', d:[.20,.05], p:[0,.16,0],  m:'chrome', c:0xb0b6be, nc:1},
      {s:'cyl', d:[.20,.05], p:[0,.30,0],  m:'chrome', c:0xb0b6be, nc:1},
      {s:'cyl', d:[.20,.05], p:[0,.44,0],  m:'chrome', c:0xb0b6be, nc:1},
      {s:'cyl', d:[.20,.05], p:[0,.58,0],  m:'chrome', c:0xb0b6be, nc:1},
      {s:'cyl', d:[.05,.62], p:[0,.36,0],  m:'steel',  c:0x6a7078, nc:1},
      {s:'cyl', d:[.22,.05], p:[0,.685,0], m:'steel',  c:0x6a7078},
  ]},

  // rueda libre 0.68 m: neumático, llanta, buje y radios
  { id:'t_wheel', name:'FreeWheel', mass:35, tags:['wheel','axle','vehicle'], parts:[
      {s:'cyl', d:[.34,.22],     p:[0,.34,0], r:[0,0,90], m:'rubber', c:0x1c1e22},
      {s:'cyl', d:[.22,.24],     p:[0,.34,0], r:[0,0,90], m:'metal',  c:0xb9bec6, nc:1},
      {s:'cyl', d:[.07,.28],     p:[0,.34,0], r:[0,0,90], m:'chrome', nc:1},
      {s:'box', d:[.05,.40,.06], p:[0,.34,0], m:'metal', c:0x9aa0a8, nc:1},
      {s:'box', d:[.05,.06,.40], p:[0,.34,0], m:'metal', c:0x9aa0a8, nc:1},
  ]},

  // botón grande de arcade: pedestal, carcasa, aro amarillo y cúpula roja
  { id:'t_button', name:'BigButton', mass:30, tags:['button','trigger','switch'], parts:[
      {s:'cyl', d:[.42,.10],     p:[0,.05,0],  m:'metal',   c:0x6a7078},
      {s:'cyl', d:[.34,.16],     p:[0,.18,0],  m:'metal',   c:0x3a4048},
      {s:'cyl', d:[.35,.03],     p:[0,.265,0], m:'paint',   c:0xe8c53a, nc:1},
      {s:'cyl', d:[.22,.30,.12], p:[0,.32,0],  m:'plastic', c:0xd6382c},
  ]},

  // lámpara de obra: base, poste, farola enjaulada y bombilla emisiva
  { id:'t_lamp', name:'Lamp01', mass:12, tags:['lamp','light','toggle'], parts:[
      {s:'box', d:[.34,.04,.34], p:[0,.02,0],   m:'metal', c:0x4a5058},
      {s:'cyl', d:[.05,.55],     p:[0,.31,0],   m:'steel', c:0x6a7078},
      {s:'cyl', d:[.20,.18],     p:[0,.68,0],   r:[90,0,0], m:'metal', c:0xd8a83a},
      {s:'sph', d:[.15],         p:[0,.68,.06], m:'neon',  c:0xffe9a8, nc:1},
      {s:'box', d:[.03,.34,.03], p:[0,.68,.12], m:'steel', c:0x8a9098, nc:1},
      {s:'box', d:[.34,.03,.03], p:[0,.68,.12], m:'steel', c:0x8a9098, nc:1},
  ]},

  // --- COMBATE / PRÁCTICA ---------------------------------------------------

  // torreta de práctica: base, columna, cabeza, cañón y ojo sensor
  { id:'t_turret', name:'Turret01', mass:95, tags:['turret','gun','npc'], parts:[
      {s:'cyl', d:[.30,.08],     p:[0,.04,0],   m:'metal', c:0x4a5058},
      {s:'cyl', d:[.12,.34],     p:[0,.25,0],   m:'steel', c:0x5a6068},
      {s:'box', d:[.42,.30,.36], p:[0,.57,0],   m:'metal', c:0x6a7280},
      {s:'cyl', d:[.055,.50],    p:[0,.60,.30], r:[90,0,0], m:'steel', c:0x2a2e34},
      {s:'box', d:[.16,.20,.16], p:[0,.80,0],   m:'metal', c:0x3a4048, nc:1},
      {s:'sph', d:[.07],         p:[0,.66,.19], m:'neon',  c:0xff4a3a, nc:1},
  ]},

  // blanco de tiro: pie, poste y tablero con anillos concéntricos
  { id:'t_target', name:'TargetRings', mass:16, tags:['target','range','practice'], parts:[
      {s:'box', d:[.50,.07,.50], p:[0,.035,0],  m:'wood',  c:0x6b4f30},
      {s:'box', d:[.08,1.00,.08],p:[0,.50,0],   m:'wood',  c:0x8a6a44},
      {s:'cyl', d:[.45,.06],     p:[0,1.35,0],  r:[90,0,0], m:'plank', c:0xf0ece0},
      {s:'cyl', d:[.30,.02],     p:[0,1.35,.04],r:[90,0,0], m:'paint', c:0xd63a2e, nc:1},
      {s:'cyl', d:[.16,.02],     p:[0,1.35,.05],r:[90,0,0], m:'paint', c:0xf0ece0, nc:1},
      {s:'cyl', d:[.06,.02],     p:[0,1.35,.06],r:[90,0,0], m:'paint', c:0xd63a2e, nc:1},
  ]},

  // botiquín: maletín rojo con cruz blanca, manija y trabas
  { id:'t_medkit', name:'MedKit', mass:8, tags:['health','pickup','medic'], parts:[
      {s:'box', d:[.46,.30,.28], p:[0,.15,0],     m:'plastic', c:0xc3352c},
      {s:'box', d:[.24,.02,.07], p:[0,.305,0],    m:'paint',   c:0xf4f4f4, nc:1},
      {s:'box', d:[.07,.02,.20], p:[0,.305,0],    m:'paint',   c:0xf4f4f4, nc:1},
      {s:'box', d:[.18,.05,.03], p:[0,.24,.15],   m:'metal',   c:0x9aa0a8, nc:1},
      {s:'box', d:[.05,.07,.03], p:[-.15,.16,.15],m:'metal',   c:0x9aa0a8, nc:1},
      {s:'box', d:[.05,.07,.03], p:[.15,.16,.15], m:'metal',   c:0x9aa0a8, nc:1},
  ]},

  // caja de munición verde oliva con manija y estarcido amarillo
  { id:'t_ammo', name:'AmmoCrate', mass:28, tags:['ammo','pickup','military'], parts:[
      {s:'box', d:[.62,.34,.34], p:[0,.17,0],     m:'metal', c:0x4e5540},
      {s:'box', d:[.64,.06,.36], p:[0,.32,0],     m:'metal', c:0x3e4433, nc:1},
      {s:'box', d:[.34,.04,.08], p:[0,.355,0],    m:'metal', c:0x8a9270, nc:1},
      {s:'box', d:[.30,.03,.02], p:[0,.19,.175],  m:'paint', c:0xe8d84a, nc:1},
      {s:'box', d:[.06,.10,.04], p:[-.24,.30,.18],m:'steel', c:0x8a9098, nc:1},
      {s:'box', d:[.06,.10,.04], p:[.24,.30,.18], m:'steel', c:0x8a9098, nc:1},
  ]},

  // muñeco de ragdoll 1.79 m: piernas, torso, brazos, cuello y cabeza
  { id:'t_ragdoll', name:'RagDoll', mass:75, tags:['ragdoll','human','physics'], parts:[
      {s:'cyl', d:[.09,.88],     p:[-.11,.44,0], m:'fabric',  c:0x2e3440},
      {s:'cyl', d:[.09,.88],     p:[.11,.44,0],  m:'fabric',  c:0x2e3440},
      {s:'box', d:[.36,.58,.22], p:[0,1.17,0],   m:'fabric',  c:0x3a5a8a},
      {s:'cyl', d:[.07,.64],     p:[-.24,1.12,0],m:'fabric',  c:0x3a5a8a, nc:1},
      {s:'cyl', d:[.07,.64],     p:[.24,1.12,0], m:'fabric',  c:0x3a5a8a, nc:1},
      {s:'cyl', d:[.07,.09],     p:[0,1.50,0],   m:'plastic', c:0xd8b48a, nc:1},
      {s:'sph', d:[.135],        p:[0,1.65,0],   m:'plastic', c:0xd8b48a},
  ]},

  // --- LÓGICA / MUNDO ------------------------------------------------------

  // marcador de aparición: disco, aro emisivo, flecha hacia abajo y baliza
  { id:'t_spawn', name:'SpawnMarker', mass:22, tags:['spawn','marker','logic'], parts:[
      {s:'cyl',  d:[.55,.06], p:[0,.03,0],  m:'metal',   c:0x3a4048},
      {s:'cyl',  d:[.48,.03], p:[0,.075,0], m:'neon',    c:0x4dffa6, nc:1},
      {s:'cone', d:[.22,.50], p:[0,.42,0],  m:'plastic', c:0x27ae60, r:[180,0,0]},
      {s:'cyl',  d:[.05,.28], p:[0,.82,0],  m:'metal',   c:0x8a9098, nc:1},
      {s:'sph',  d:[.10],     p:[0,1.02,0], m:'neon',    c:0x4dffa6, nc:1},
  ]},

  // plataforma de teletransporte: plato de 2 m, disco de luz y tres pilonas
  { id:'t_teleport', name:'TelePad', mass:320, tags:['teleport','pad','logic'], parts:[
      {s:'cyl', d:[1.00,.12], p:[0,.06,0],       m:'metal', c:0x454c54},
      {s:'cyl', d:[.86,.04],  p:[0,.14,0],       m:'neon',  c:0x5ab4ff, nc:1},
      {s:'cyl', d:[.10,1.15], p:[0,.695,-.86],   m:'steel', c:0x6a7078},
      {s:'cyl', d:[.10,1.15], p:[.745,.695,.43], m:'steel', c:0x6a7078},
      {s:'cyl', d:[.10,1.15], p:[-.745,.695,.43],m:'steel', c:0x6a7078},
      {s:'sph', d:[.12],      p:[0,1.33,-.86],   m:'neon',  c:0x5ab4ff, nc:1},
      {s:'sph', d:[.12],      p:[.745,1.33,.43], m:'neon',  c:0x5ab4ff, nc:1},
      {s:'sph', d:[.12],      p:[-.745,1.33,.43],m:'neon',  c:0x5ab4ff, nc:1},
  ]},

  // bomba de agua sobre patín: motor, voluta, caño de salida y manómetro
  { id:'t_waterpump', name:'WaterPump', mass:120, tags:['pump','water','machine'], parts:[
      {s:'box', d:[.90,.10,.50], p:[0,.05,0],    m:'steel',  c:0x4a5058},
      {s:'cyl', d:[.19,.52],     p:[-.15,.40,0], r:[0,0,90], m:'metal', c:0x2f6bd4},
      {s:'cyl', d:[.26,.20],     p:[.26,.36,0],  r:[0,0,90], m:'metal', c:0x2f6bd4},
      {s:'cyl', d:[.10,.24],     p:[.26,.36,.22],r:[90,0,0], m:'metal', c:0x8a9098},
      {s:'cyl', d:[.09,.34],     p:[.26,.62,0],  m:'metal',  c:0x8a9098},
      {s:'cyl', d:[.14,.04],     p:[.26,.80,0],  m:'metal',  c:0x8a9098, nc:1},
      {s:'cyl', d:[.07,.04],     p:[-.15,.62,.16],r:[90,0,0], m:'chrome', nc:1},
  ]},

  // maniquí de práctica: base, poste, brazos cruzados y torso de paja
  { id:'t_dummy', name:'PracticeDummy', mass:55, tags:['dummy','training','melee'], parts:[
      {s:'box', d:[.60,.10,.60],  p:[0,.05,0],  m:'wood',   c:0x6b4f30},
      {s:'cyl', d:[.09,1.55],     p:[0,.775,0], m:'wood',   c:0x8a6a44},
      {s:'box', d:[1.20,.11,.11], p:[0,1.30,0], m:'wood',   c:0x8a6a44},
      {s:'cyl', d:[.24,.62],      p:[0,1.16,0], m:'fabric', c:0xc9a24a},
      {s:'cyl', d:[.26,.05],      p:[0,1.42,0], m:'fabric', c:0x6b4f30, nc:1},
      {s:'cyl', d:[.26,.05],      p:[0,.92,0],  m:'fabric', c:0x6b4f30, nc:1},
      {s:'sph', d:[.17],          p:[0,1.68,0], m:'fabric', c:0xc9a24a},
  ]},

  // emisor de sonido: bafle con woofer, tweeter y manija
  { id:'t_speaker', name:'SoundEmitter', mass:24, tags:['sound','speaker','audio'], parts:[
      {s:'box', d:[.44,.68,.38], p:[0,.37,0],   m:'plank',  c:0x2a2c31},
      {s:'box', d:[.48,.05,.42], p:[0,.025,0],  m:'metal',  c:0x1e2126},
      {s:'cyl', d:[.15,.06],     p:[0,.28,.20], r:[90,0,0], m:'fabric', c:0x4a5058, nc:1},
      {s:'cyl', d:[.07,.05],     p:[0,.60,.20], r:[90,0,0], m:'fabric', c:0x4a5058, nc:1},
      {s:'box', d:[.16,.04,.06], p:[0,.72,0],   m:'metal',  c:0x9aa0a8, nc:1},
  ]},

  // cámara de seguridad sobre mástil: brazo, cuerpo, visera, lente y LED
  { id:'t_camera', name:'SecCamera', mass:14, tags:['camera','watch','logic'], parts:[
      {s:'box', d:[.26,.05,.26], p:[0,.025,0],  m:'metal', c:0x4a5058},
      {s:'cyl', d:[.05,.90],     p:[0,.475,0],  m:'metal', c:0x8a9098},
      {s:'box', d:[.06,.06,.26], p:[0,.90,.12], m:'metal', c:0x8a9098, nc:1},
      {s:'box', d:[.18,.16,.40], p:[0,.95,.30], m:'metal', c:0xdedee2},
      {s:'box', d:[.22,.03,.26], p:[0,1.05,.28],m:'metal', c:0xdedee2, nc:1},
      {s:'cyl', d:[.075,.10],    p:[0,.95,.53], r:[90,0,0], m:'glass', c:0x2a3038, nc:1},
      {s:'sph', d:[.025],        p:[.06,.95,.52],m:'neon',  c:0xff3a2a, nc:1},
  ]},

  // temporizador: caja con display verde, dial y dos cables
  { id:'t_timer', name:'Timer01', mass:5, tags:['timer','fuse','logic'], parts:[
      {s:'box', d:[.34,.24,.16], p:[0,.12,0],    m:'metal',  c:0x3a4048},
      {s:'box', d:[.36,.03,.18], p:[0,.245,0],   m:'metal',  c:0x5a6068, nc:1},
      {s:'box', d:[.22,.10,.02], p:[0,.15,.09],  m:'neon',   c:0x4dff6a, nc:1},
      {s:'cyl', d:[.03,.05],     p:[.13,.09,.09],r:[90,0,0], m:'metal', c:0xe8c53a, nc:1},
      {s:'cyl', d:[.02,.22],     p:[-.10,.30,0], r:[0,0,60], m:'rubber', c:0xd63a2e, nc:1},
      {s:'cyl', d:[.02,.22],     p:[.10,.30,0],  r:[0,0,-60],m:'rubber', c:0x2f6bd4, nc:1},
  ]},

  // esfera de gravedad: núcleo emisivo dentro de tres aros giroscópicos
  { id:'t_grav_sphere', name:'GravSphere', mass:45, tags:['gravity','field','scifi'], parts:[
      {s:'cyl', d:[.30,.08], p:[0,.04,0], m:'metal', c:0x3a4048},
      {s:'cyl', d:[.06,.22], p:[0,.19,0], m:'steel', c:0x8a9098},
      {s:'sph', d:[.34],     p:[0,.66,0], m:'neon',  c:0x8a5aff},
      {s:'cyl', d:[.40,.05], p:[0,.66,0], m:'steel', c:0xb0b6be, nc:1},
      {s:'cyl', d:[.40,.05], p:[0,.66,0], r:[90,0,0], m:'steel', c:0xb0b6be, nc:1},
      {s:'cyl', d:[.40,.05], p:[0,.66,0], r:[0,0,90], m:'steel', c:0xb0b6be, nc:1},
  ]},

  // imán industrial de izaje: plato polar, bobinado rojo y argolla
  { id:'t_magnet', name:'BigMagnet', mass:850, tags:['magnet','crane','heavy'], parts:[
      {s:'cyl', d:[.55,.16],     p:[0,.08,0],  m:'steel', c:0x3a4048},
      {s:'cyl', d:[.46,.18],     p:[0,.25,0],  m:'metal', c:0xc23a2e},
      {s:'cyl', d:[.30,.14],     p:[0,.41,0],  m:'steel', c:0x4a5058},
      {s:'cyl', d:[.09,.10],     p:[0,.52,0],  m:'steel', c:0x8a9098, nc:1},
      {s:'box', d:[.06,.22,.20], p:[0,.62,0],  m:'steel', c:0x8a9098, nc:1},
      {s:'cyl', d:[.05,.24],     p:[.40,.26,0],m:'metal', c:0x2a2e34, nc:1},
  ]},

]);
