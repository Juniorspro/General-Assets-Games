/* props/scifi.js — sección Sci-Fi. Datos planos, y=0 = base, centrado en X/Z. */
HP.section('scifi','Sci-Fi','acc',[

  // núcleo de energía: dos tapas, 3 columnas y esfera de plasma en el medio
  { id:'s_core', name:'PowerCore', mass:260, tags:['energy','reactor','glow'], parts:[
      {s:'cyl', d:[.75,.22], p:[0,.11,0],  m:'steel'},
      {s:'cyl', d:[.75,.22], p:[0,2.09,0], m:'steel'},
      {s:'box', d:[.16,1.76,.16], p:[.58,1.1,0],    m:'steel'},
      {s:'box', d:[.16,1.76,.16], p:[-.29,1.1,.5],  m:'steel'},
      {s:'box', d:[.16,1.76,.16], p:[-.29,1.1,-.5], m:'steel'},
      {s:'sph', d:[.5], p:[0,1.1,0], m:'neon', c:0x39d7ff, nc:1},
  ]},

  // plataforma de holograma: disco emisor + cono de luz invertido
  { id:'s_holopad', name:'HoloPad', mass:90, tags:['hologram','pad','glow'], parts:[
      {s:'cyl', d:[.9,.14],  p:[0,.07,0], m:'steel'},
      {s:'cyl', d:[.7,.08],  p:[0,.18,0], m:'metal', c:0x2a2f38},
      {s:'cyl', d:[.22,.18], p:[0,.31,0], m:'metal', c:0x4a525c},
      {s:'cyl', d:[.78,.04], p:[0,.24,0], m:'neon', c:0x4fe0ff, nc:1},
      {s:'cone', d:[.6,1.3], p:[0,1.05,0], r:[180,0,0], m:'neon', c:0x4fe0ff, nc:1},
  ]},

  // caja de plasma: cubo metálico con visores luminosos
  { id:'s_plasmacrate', name:'PlasmaCrate', mass:55, tags:['crate','box','glow'], parts:[
      {s:'box', d:[1,1,1],       p:[0,.5,0],  m:'metal', c:0x39414d},
      {s:'box', d:[1.06,.1,1.06],p:[0,.05,0], m:'steel'},
      {s:'box', d:[1.06,.1,1.06],p:[0,.95,0], m:'steel'},
      {s:'box', d:[.5,.5,.03],   p:[0,.5,.51], m:'neon', c:0x7cff4f, nc:1},
      {s:'box', d:[.5,.5,.03],   p:[0,.5,-.51],m:'neon', c:0x7cff4f, nc:1},
  ]},

  // panel de escudo: marco emisor con lámina de energía
  { id:'s_shieldpanel', name:'ShieldPanel', mass:130, tags:['shield','barrier'], parts:[
      {s:'box', d:[1.7,.16,.4],  p:[0,.08,0],    m:'steel'},
      {s:'box', d:[.18,2,.22],   p:[-.76,1.16,0],m:'steel'},
      {s:'box', d:[.18,2,.22],   p:[.76,1.16,0], m:'steel'},
      {s:'box', d:[1.7,.16,.22], p:[0,2.24,0],   m:'steel'},
      {s:'box', d:[1.4,1.9,.06], p:[0,1.2,0],    m:'glass', c:0x59b8ff, nc:1},
      {s:'box', d:[.06,1.9,.06], p:[-.63,1.2,.1],m:'neon', c:0x59b8ff, nc:1},
      {s:'box', d:[.06,1.9,.06], p:[.63,1.2,.1], m:'neon', c:0x59b8ff, nc:1},
  ]},

  // plataforma antigravedad: disco con 4 emisores y anillo violeta
  { id:'s_gravpad', name:'GravPad', mass:200, tags:['gravity','pad'], parts:[
      {s:'cyl', d:[1.3,.2],  p:[0,.1,0],  m:'steel'},
      {s:'cyl', d:[1.1,.12], p:[0,.26,0], m:'metal', c:0x30363f},
      {s:'cyl', d:[.9,.06],  p:[0,.34,0], m:'neon', c:0x9a5cff, nc:1},
      {s:'cyl', d:[.13,.34], p:[.95,.17,0],  m:'metal', c:0x30363f},
      {s:'cyl', d:[.13,.34], p:[-.95,.17,0], m:'metal', c:0x30363f},
      {s:'cyl', d:[.13,.34], p:[0,.17,.95],  m:'metal', c:0x30363f},
      {s:'cyl', d:[.13,.34], p:[0,.17,-.95], m:'metal', c:0x30363f},
  ]},

  // jump pad: placa con almohadilla de goma y flechas
  { id:'s_jumppad', name:'JumpPad', mass:70, tags:['jump','pad','launch'], parts:[
      {s:'box', d:[1.2,.18,1.2], p:[0,.09,0], m:'steel', c:0x2b3038},
      {s:'cyl', d:[.5,.16],      p:[0,.24,0], m:'rubber', c:0x1b1e24},
      {s:'cyl', d:[.4,.06],      p:[0,.34,0], m:'neon', c:0xffb43a, nc:1},
      {s:'box', d:[.7,.04,.16],  p:[0,.19,.42], m:'neon', c:0xffb43a, nc:1},
      {s:'box', d:[.7,.04,.16],  p:[0,.19,-.42],m:'neon', c:0xffb43a, nc:1},
  ]},

  // valla láser: dos postes y tres haces rojos
  { id:'s_laserfence', name:'LaserFence', mass:60, tags:['fence','laser','barrier'], parts:[
      {s:'box', d:[.22,1.3,.22], p:[-1.1,.65,0], m:'steel'},
      {s:'box', d:[.22,1.3,.22], p:[1.1,.65,0],  m:'steel'},
      {s:'box', d:[.4,.08,.4],   p:[-1.1,.04,0], m:'steel'},
      {s:'box', d:[.4,.08,.4],   p:[1.1,.04,0],  m:'steel'},
      {s:'box', d:[2,.06,.06],   p:[0,.4,0],  m:'neon', c:0xff3a4f, nc:1},
      {s:'box', d:[2,.06,.06],   p:[0,.75,0], m:'neon', c:0xff3a4f, nc:1},
      {s:'box', d:[2,.06,.06],   p:[0,1.1,0], m:'neon', c:0xff3a4f, nc:1},
  ]},

  // caño de reactor: tramo vertical con bridas y bandas de refrigerante
  { id:'s_pipe', name:'ReactorPipe', mass:240, tags:['pipe','reactor'], parts:[
      {s:'cyl', d:[.34,2.2], p:[0,1.2,0],  m:'metal', c:0x9aa3ad},
      {s:'cyl', d:[.44,.14], p:[0,.12,0],  m:'steel'},
      {s:'cyl', d:[.44,.14], p:[0,2.28,0], m:'steel'},
      {s:'cyl', d:[.42,.12], p:[0,1.2,0],  m:'steel', nc:1},
      {s:'cyl', d:[.36,.16], p:[0,1.72,0], m:'neon', c:0x39d7ff, nc:1},
      {s:'cyl', d:[.36,.16], p:[0,.68,0],  m:'neon', c:0x39d7ff, nc:1},
  ]},

  // terminal de datos: pedestal con cabezal inclinado
  { id:'s_dataterm', name:'DataTerminal', mass:85, tags:['terminal','console'], parts:[
      {s:'box', d:[.7,.1,.6],    p:[0,.05,0],   m:'steel'},
      {s:'box', d:[.5,1,.4],     p:[0,.6,0],    m:'metal', c:0x353b45},
      {s:'box', d:[.66,.36,.5],  p:[0,1.22,.05],m:'metal', c:0x353b45, r:[-25,0,0]},
      {s:'box', d:[.56,.28,.03], p:[0,1.26,.24],m:'neon', c:0x4fe0ff, r:[-25,0,0], nc:1},
      {s:'box', d:[.4,.05,.05],  p:[0,.95,.21], m:'neon', c:0x4fe0ff, nc:1},
  ]},

  // dron esférico: casco, ojo, aro ecuatorial y tres patas
  { id:'s_drone', name:'SphereDrone', mass:22, tags:['drone','robot','bot'], parts:[
      {s:'sph', d:[.36], p:[0,.44,0],   m:'metal', c:0x555c66},
      {s:'sph', d:[.14], p:[0,.44,.34], m:'neon', c:0xff5a3a, nc:1},
      {s:'cyl', d:[.42,.07], p:[0,.44,0], m:'chrome', nc:1},
      {s:'box', d:[.07,.2,.07], p:[.2,.1,.12],  m:'metal', c:0x555c66},
      {s:'box', d:[.07,.2,.07], p:[-.2,.1,.12], m:'metal', c:0x555c66},
      {s:'box', d:[.07,.2,.07], p:[0,.1,-.22],  m:'metal', c:0x555c66},
  ]},

  // anillo de teletransporte: base + arco hexagonal + membrana de energía
  { id:'s_tpring', name:'TeleportRing', mass:420, tags:['teleport','portal','gate'], parts:[
      {s:'box', d:[1.5,.28,.6],  p:[0,.14,0],     m:'steel'},
      {s:'box', d:[1.3,.26,.36], p:[.975,1.963,0],m:'steel', r:[0,0,120]},
      {s:'box', d:[1.3,.26,.36], p:[0,2.526,0],   m:'steel', r:[0,0,180]},
      {s:'box', d:[1.3,.26,.36], p:[-.975,1.963,0],m:'steel', r:[0,0,240]},
      {s:'box', d:[1.3,.26,.36], p:[-1.126,1.4,0], m:'steel', r:[0,0,90]},
      {s:'box', d:[1.3,.26,.36], p:[1.126,1.4,0],  m:'steel', r:[0,0,90]},
      {s:'cyl', d:[1,.06], p:[0,1.4,0], m:'neon', c:0x9a5cff, r:[90,0,0], nc:1},
  ]},

  // barril de energía: bidón con celdas luminosas
  { id:'s_ebarrel', name:'EnergyBarrel', mass:95, tags:['barrel','energy'], parts:[
      {s:'cyl', d:[.32,1],   p:[0,.52,0],  m:'metal', c:0x3a5f4a},
      {s:'cyl', d:[.34,.1],  p:[0,.05,0],  m:'steel'},
      {s:'cyl', d:[.34,.1],  p:[0,1.05,0], m:'steel'},
      {s:'cyl', d:[.335,.12],p:[0,.78,0],  m:'neon', c:0x7cff4f, nc:1},
      {s:'cyl', d:[.335,.12],p:[0,.32,0],  m:'neon', c:0x7cff4f, nc:1},
  ]},

  // huevo alienígena: ovoide de tres lóbulos sobre nido
  { id:'s_egg', name:'AlienEgg', mass:40, tags:['alien','organic','egg'], parts:[
      {s:'cyl', d:[.36,.2], p:[0,.1,0],   m:'dirt', c:0x4a4237},
      {s:'sph', d:[.42], p:[0,.5,0],   m:'plastic', c:0x6f8a5a},
      {s:'sph', d:[.34], p:[0,.92,0],  m:'plastic', c:0x6f8a5a},
      {s:'sph', d:[.2],  p:[0,1.2,0],  m:'plastic', c:0x6f8a5a},
      {s:'sph', d:[.12], p:[0,1.32,0], m:'neon', c:0xb4ff3a, nc:1},
  ]},

  // puerta blindada: marco + hoja acorazada de 2.1 m
  { id:'s_blastdoor', name:'BlastDoor', mass:900, tags:['door','armor','gate'], parts:[
      {s:'box', d:[1.9,.2,.35],  p:[0,2.2,0],    m:'steel'},
      {s:'box', d:[.2,2.1,.35],  p:[-.85,1.05,0],m:'steel'},
      {s:'box', d:[.2,2.1,.35],  p:[.85,1.05,0], m:'steel'},
      {s:'box', d:[1.5,2.05,.22],p:[0,1.03,0],   m:'metal', c:0x6b7280},
      {s:'box', d:[1.5,.14,.03], p:[0,1.9,.13],  m:'neon', c:0xffb43a, nc:1},
      {s:'box', d:[.06,2,.03],   p:[0,1.03,.13], m:'neon', c:0xffb43a, nc:1},
  ]},

  // cápsula de criogenia: tubo vertical con visor helado
  { id:'s_cryopod', name:'CryoPod', mass:400, tags:['cryo','pod','capsule'], parts:[
      {s:'box', d:[1,.25,.8],   p:[0,.125,0], m:'steel'},
      {s:'cyl', d:[.45,1.9],    p:[0,1.2,0],  m:'steel', c:0x4a525c},
      {s:'sph', d:[.45],        p:[0,2.15,0], m:'steel', c:0x4a525c},
      {s:'box', d:[.6,1.5,.06], p:[0,1.25,.42],m:'glass', c:0x9adcff, nc:1},
      {s:'box', d:[.1,1.4,.05], p:[0,1.25,-.44],m:'neon', c:0x9adcff, nc:1},
  ]},

  // antena parabólica: mástil, plato inclinado y alimentador
  { id:'s_dish', name:'DishAntenna', mass:180, tags:['antenna','dish','comms'], parts:[
      {s:'cyl', d:[.55,.18], p:[0,.09,0], m:'steel'},
      {s:'cyl', d:[.13,1.5], p:[0,.9,0],  m:'metal', c:0x8f979f},
      {s:'box', d:[.5,.16,.16], p:[0,1.68,0], m:'metal', c:0x8f979f},
      {s:'cyl', d:[1.15,.4,.45],p:[0,2.1,.15], m:'metal', c:0xd8dce2, r:[-40,0,0]},
      {s:'cone',d:[.12,.4], p:[0,2.32,.52], m:'chrome', r:[140,0,0], nc:1},
  ]},

  // panel solar: bastidor con paño fotovoltaico inclinado
  { id:'s_solar', name:'SolarPanel', mass:120, tags:['solar','panel','power'], parts:[
      {s:'box', d:[1.4,.14,.5],  p:[0,.07,0],    m:'steel'},
      {s:'box', d:[.12,.9,.12],  p:[-.5,.55,-.15],m:'steel'},
      {s:'box', d:[.12,.9,.12],  p:[.5,.55,-.15], m:'steel'},
      {s:'box', d:[2.2,.09,1.3], p:[0,1.15,.15], m:'metal', c:0x2a3550, r:[-35,0,0]},
      {s:'box', d:[2.05,.03,1.15],p:[0,1.21,.19],m:'glass', c:0x3a6cff, r:[-35,0,0], nc:1},
  ]},

  // brazo robótico: torreta, antebrazo, codo y pinza
  { id:'s_roboarm', name:'RoboArm', mass:320, tags:['robot','arm','factory'], parts:[
      {s:'cyl', d:[.45,.22], p:[0,.11,0], m:'steel'},
      {s:'cyl', d:[.32,.35], p:[0,.38,0], m:'metal', c:0xf2a71b},
      {s:'box', d:[.24,1.2,.28], p:[0,1.1,0], m:'metal', c:0xf2a71b},
      {s:'sph', d:[.19], p:[0,1.72,0], m:'steel'},
      {s:'box', d:[.9,.22,.24], p:[.42,1.65,0], m:'metal', c:0xf2a71b, r:[0,0,-20]},
      {s:'box', d:[.1,.3,.08], p:[.86,1.4,.09],  m:'chrome', nc:1},
      {s:'box', d:[.1,.3,.08], p:[.86,1.4,-.09], m:'chrome', nc:1},
  ]},

  // plataforma flotante: placa con turbina inferior y luces de sustentación
  { id:'s_hoverplate', name:'HoverPlate', mass:350, tags:['hover','platform'], parts:[
      {s:'box', d:[2.4,.24,2.4], p:[0,.3,0],  m:'steel', c:0x3a4048},
      {s:'cyl', d:[.9,.5,.36],   p:[0,.18,0], m:'metal', c:0x2b3038},
      {s:'box', d:[2.2,.06,2.2], p:[0,.45,0], m:'metal', c:0x4a5058, nc:1},
      {s:'box', d:[2,.06,.1],  p:[0,.16,1.1],  m:'neon', c:0x59b8ff, nc:1},
      {s:'box', d:[2,.06,.1],  p:[0,.16,-1.1], m:'neon', c:0x59b8ff, nc:1},
      {s:'box', d:[.1,.06,2],  p:[1.1,.16,0],  m:'neon', c:0x59b8ff, nc:1},
      {s:'box', d:[.1,.06,2],  p:[-1.1,.16,0], m:'neon', c:0x59b8ff, nc:1},
  ]},

  // consola de control: mesa con tablero inclinado y pantalla trasera
  { id:'s_console', name:'CtrlConsole', mass:150, tags:['console','control'], parts:[
      {s:'box', d:[1.6,.9,.6],  p:[0,.45,0],   m:'metal', c:0x353b45},
      {s:'box', d:[1.6,.12,.7], p:[0,.96,.05], m:'steel', r:[-18,0,0]},
      {s:'box', d:[1.3,.6,.08], p:[0,1.3,-.2], m:'steel', r:[8,0,0]},
      {s:'box', d:[1.2,.5,.03], p:[0,1.3,-.14],m:'neon', c:0x4fe0ff, r:[8,0,0], nc:1},
      {s:'box', d:[1.4,.04,.5], p:[0,1.02,.07],m:'neon', c:0xffb43a, r:[-18,0,0], nc:1},
  ]},

  // barra luminosa: tubo de neón sobre poste
  { id:'s_neonbar', name:'NeonBar', mass:12, tags:['neon','light','lamp'], parts:[
      {s:'box', d:[.3,.1,.3], p:[0,.05,0],  m:'metal', c:0x2b3038},
      {s:'cyl', d:[.06,2],    p:[0,1.05,0], m:'chrome'},
      {s:'cyl', d:[.09,1.7],  p:[0,1.1,.12],m:'neon', c:0xff3aa8, nc:1},
      {s:'box', d:[.2,.08,.2],p:[0,2.09,0], m:'metal', c:0x2b3038, nc:1},
      {s:'box', d:[.16,.06,.2],p:[0,1.9,.08],m:'metal', c:0x2b3038, nc:1},
  ]},

  // bobina Tesla: primario, secundario de cobre y toroide
  { id:'s_tesla', name:'TeslaCoil', mass:260, tags:['tesla','coil','electric'], parts:[
      {s:'box', d:[.9,.25,.9], p:[0,.125,0], m:'metal', c:0x2b3038},
      {s:'cyl', d:[.42,.3],    p:[0,.4,0],   m:'chrome'},
      {s:'cyl', d:[.22,1.5],   p:[0,1.3,0],  m:'metal', c:0xb87333},
      {s:'cyl', d:[.55,.22],   p:[0,2.16,0], m:'chrome', nc:1},
      {s:'sph', d:[.14],       p:[0,2.4,0],  m:'neon', c:0x9adcff, nc:1},
  ]},

  // tanque de plasma: cisterna vertical con visor y columna de plasma
  { id:'s_ptank', name:'PlasmaTank', mass:700, tags:['tank','plasma','storage'], parts:[
      {s:'cyl', d:[.85,2],     p:[0,1.15,0], m:'steel'},
      {s:'cyl', d:[.9,.2],     p:[0,.1,0],   m:'steel'},
      {s:'cyl', d:[.3,.85,.35],p:[0,2.32,0], m:'steel'},
      {s:'cyl', d:[.18,.3],    p:[0,2.6,0],  m:'steel', nc:1},
      {s:'box', d:[.5,1.4,.06],p:[0,1.2,.84],m:'glass', c:0x9a5cff, nc:1},
      {s:'cyl', d:[.6,1.3],    p:[0,1.15,0], m:'neon', c:0x9a5cff, nc:1},
  ]},

  // propulsor de nave: bloque de anclaje, cuerpo y campana de escape
  { id:'s_thruster', name:'ShipThruster', mass:480, tags:['engine','thruster','ship'], parts:[
      {s:'box', d:[1.1,.3,1.1], p:[0,.15,0], m:'steel'},
      {s:'cyl', d:[.5,1],       p:[0,.8,0],  m:'metal', c:0x6b7280},
      {s:'cyl', d:[.85,.5,.8],  p:[0,1.7,0], m:'metal', c:0x6b7280},
      {s:'box', d:[.12,.7,.9],  p:[.55,.7,0], m:'steel', nc:1},
      {s:'box', d:[.12,.7,.9],  p:[-.55,.7,0],m:'steel', nc:1},
      {s:'cyl', d:[.72,.16],    p:[0,2,0],   m:'neon', c:0x59b8ff, nc:1},
  ]},

  // contenedor espacial: cofre de carga con topes, patines y etiqueta
  { id:'s_spacecrate', name:'SpaceCrate', mass:420, tags:['container','cargo','crate'], parts:[
      {s:'box', d:[2.2,1.3,1.4], p:[0,.72,0],   m:'metal', c:0x50565f},
      {s:'box', d:[.14,1.4,1.5], p:[-1.1,.72,0],m:'steel'},
      {s:'box', d:[.14,1.4,1.5], p:[1.1,.72,0], m:'steel'},
      {s:'box', d:[2,.1,.16],    p:[0,.05,.5],  m:'steel'},
      {s:'box', d:[2,.1,.16],    p:[0,.05,-.5], m:'steel'},
      {s:'box', d:[1.9,.1,.14],  p:[0,1.4,.4],  m:'steel', nc:1},
      {s:'box', d:[1.9,.1,.14],  p:[0,1.4,-.4], m:'steel', nc:1},
      {s:'box', d:[1.4,.14,.03], p:[0,1,.71],   m:'neon', c:0x7cff4f, nc:1},
  ]},

  // faro de aterrizaje: baliza sobre poste con jaula
  { id:'s_beacon', name:'LandBeacon', mass:45, tags:['beacon','light','landing'], parts:[
      {s:'cyl', d:[.4,.14],  p:[0,.07,0],  m:'steel'},
      {s:'cyl', d:[.1,1],    p:[0,.6,0],   m:'metal', c:0x2b3038},
      {s:'cyl', d:[.26,.3],  p:[0,1.25,0], m:'metal', c:0xf2a71b},
      {s:'sph', d:[.22],     p:[0,1.45,0], m:'neon', c:0xffb43a, nc:1},
      {s:'box', d:[.5,.05,.05], p:[0,1.62,0], m:'metal', c:0x2b3038, nc:1},
      {s:'box', d:[.05,.05,.5], p:[0,1.62,0], m:'metal', c:0x2b3038, nc:1},
  ]},

]);
