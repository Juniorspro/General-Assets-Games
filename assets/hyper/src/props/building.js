/* props/building.js — construcción modular: muros, aberturas, estructura y obra.
   Convención: y=0 = base del prop, centrado en X/Z. Sólo datos. */
HP.section('building','Building','acc',[

  /* ---------- muros de ladrillo (3 tamaños) ---------- */

  // muro de ladrillo chico 2.0 x 2.6 (media asta) con zócalo y albardilla
  { id:'b_wall_brick2', name:'BrickWall2', mass:1150, col:'box', tags:['wall','brick','modular'], parts:[
      {s:'box', d:[2,2.6,.12],    p:[0,1.3,0],   m:'brick', c:0x93513a},
      {s:'box', d:[2.06,.12,.22], p:[0,.06,0],   m:'concrete', c:0xb0aea6},
      {s:'box', d:[2.08,.08,.2],  p:[0,2.64,0],  m:'concrete', c:0xb8b6ad, nc:1},
  ]},

  // muro de ladrillo medio 4.0 x 2.6 con pilastra central
  { id:'b_wall_brick4', name:'BrickWall4', mass:2350, col:'box', tags:['wall','brick','modular'], parts:[
      {s:'box', d:[4,2.6,.12],    p:[0,1.3,0],   m:'brick', c:0x93513a},
      {s:'box', d:[4.06,.12,.22], p:[0,.06,0],   m:'concrete', c:0xb0aea6},
      {s:'box', d:[4.08,.08,.2],  p:[0,2.64,0],  m:'concrete', c:0xb8b6ad, nc:1},
      {s:'box', d:[.36,2.6,.3],   p:[0,1.3,0],   m:'brick', c:0x8a4a34, nc:1},
  ]},

  // muro de ladrillo largo 6.0 x 2.6 con dos pilastras
  { id:'b_wall_brick6', name:'BrickWall6', mass:3000, col:'box', tags:['wall','brick','modular'], parts:[
      {s:'box', d:[6,2.6,.12],    p:[0,1.3,0],    m:'brick', c:0x93513a},
      {s:'box', d:[6.06,.14,.24], p:[0,.07,0],    m:'concrete', c:0xb0aea6},
      {s:'box', d:[6.08,.08,.2],  p:[0,2.64,0],   m:'concrete', c:0xb8b6ad, nc:1},
      {s:'box', d:[.36,2.6,.3],   p:[-1.9,1.3,0], m:'brick', c:0x8a4a34, nc:1},
      {s:'box', d:[.36,2.6,.3],   p:[1.9,1.3,0],  m:'brick', c:0x8a4a34, nc:1},
  ]},

  /* ---------- muros de hormigón premoldeado (3 tamaños) ---------- */

  // panel de hormigón 2.0 x 2.8 con nervios de borde y ganchos de izaje
  { id:'b_wall_conc2', name:'ConcWall2', mass:1850, col:'box', tags:['wall','concrete','panel'], parts:[
      {s:'box', d:[2,2.8,.14],   p:[0,1.4,0],     m:'concrete', c:0xbcbab2},
      {s:'box', d:[.14,2.8,.24], p:[-.93,1.4,0],  m:'concrete', c:0xaaa8a0, nc:1},
      {s:'box', d:[.14,2.8,.24], p:[.93,1.4,0],   m:'concrete', c:0xaaa8a0, nc:1},
      {s:'cyl', d:[.07,.07],     p:[-.55,2.83,0], m:'steel', nc:1},
      {s:'cyl', d:[.07,.07],     p:[.55,2.83,0],  m:'steel', nc:1},
  ]},

  // panel de hormigón 3.2 x 2.8 con junta horizontal y patín de apoyo
  { id:'b_wall_conc4', name:'ConcWall4', mass:2950, col:'box', tags:['wall','concrete','panel'], parts:[
      {s:'box', d:[3.2,2.8,.14],  p:[0,1.4,0],   m:'concrete', c:0xbcbab2},
      {s:'box', d:[3.26,.14,.24], p:[0,.07,0],   m:'concrete', c:0xa5a39b},
      {s:'box', d:[3.2,.07,.17],  p:[0,1.92,0],  m:'concrete', c:0x8e8c86, nc:1},
      {s:'box', d:[3.26,.1,.22],  p:[0,2.85,0],  m:'concrete', c:0xa5a39b, nc:1},
  ]},

  // panel de hormigón 4.4 x 2.8 con hierros de espera arriba
  { id:'b_wall_conc6', name:'ConcWall6', mass:3000, col:'box', tags:['wall','concrete','panel'], parts:[
      {s:'box', d:[4.4,2.8,.16],  p:[0,1.4,0],   m:'concrete', c:0xbcbab2},
      {s:'box', d:[4.46,.16,.26], p:[0,.08,0],   m:'concrete', c:0xa5a39b},
      {s:'box', d:[4.4,.07,.19],  p:[0,1.6,0],   m:'concrete', c:0x8e8c86, nc:1},
      {s:'cyl', d:[.025,.5],      p:[-1.3,2.95,0], m:'steel', c:0x8a6a52, nc:1},
      {s:'cyl', d:[.025,.5],      p:[0,2.95,0],    m:'steel', c:0x8a6a52, nc:1},
      {s:'cyl', d:[.025,.5],      p:[1.3,2.95,0],  m:'steel', c:0x8a6a52, nc:1},
  ]},

  // medio muro / antepecho 3.0 x 1.1 con albardilla de hormigón
  { id:'b_half_wall', name:'HalfWall', mass:1350, col:'box', tags:['wall','half','brick','cover'], parts:[
      {s:'box', d:[3,1,.24],     p:[0,.5,0],    m:'brick', c:0x93513a},
      {s:'box', d:[3.1,.1,.32],  p:[0,1.05,0],  m:'concrete', c:0xb8b6ad},
      {s:'box', d:[3.06,.1,.3],  p:[0,.05,0],   m:'concrete', c:0xa5a39b, nc:1},
  ]},

  /* ---------- aberturas ---------- */

  // marco de puerta de hormigón: paso libre 1.0 x 2.16
  { id:'b_doorframe', name:'DoorFrame', mass:470, tags:['door','frame','opening'], parts:[
      {s:'box', d:[.14,2.16,.24], p:[-.57,1.08,0], m:'concrete', c:0xb5b3ab},
      {s:'box', d:[.14,2.16,.24], p:[.57,1.08,0],  m:'concrete', c:0xb5b3ab},
      {s:'box', d:[1.42,.2,.24],  p:[0,2.26,0],    m:'concrete', c:0xaaa8a0},
      {s:'box', d:[1.42,.06,.26], p:[0,.03,0],     m:'concrete', c:0x9e9c95, nc:1},
      {s:'box', d:[.1,.14,.07],   p:[-.5,1.72,.13],m:'steel', nc:1},
      {s:'box', d:[.1,.14,.07],   p:[-.5,.52,.13], m:'steel', nc:1},
  ]},

  // puerta de madera 0.9 x 2.05 con dos paneles y manija
  { id:'b_door_wood', name:'WoodDoor', mass:38, col:'box', tags:['door','wood'], parts:[
      {s:'box', d:[.9,2.05,.05], p:[0,1.025,0],   m:'wood', c:0x7a5330},
      {s:'box', d:[.6,.72,.02],  p:[0,1.52,.035], m:'plank', c:0x64431f, nc:1},
      {s:'box', d:[.6,.56,.02],  p:[0,.52,.035],  m:'plank', c:0x64431f, nc:1},
      {s:'box', d:[.86,.14,.02], p:[0,1.02,.035], m:'plank', c:0x8a6242, nc:1},
      {s:'box', d:[.15,.05,.05], p:[.32,1.05,.07],m:'chrome', nc:1},
      {s:'sph', d:[.05],         p:[.34,1.05,.05],m:'chrome', nc:1},
      {s:'box', d:[.05,.13,.06], p:[-.44,1.7,0],  m:'chrome', nc:1},
      {s:'box', d:[.05,.13,.06], p:[-.44,.35,0],  m:'chrome', nc:1},
  ]},

  // portón de garaje seccional 3.0 x 2.4 con guías laterales
  { id:'b_garage_door', name:'GarageDoor', mass:95, col:'box', tags:['door','garage','gate'], parts:[
      {s:'box', d:[3,2.4,.08],    p:[0,1.22,0],     m:'corrugated', c:0x9aa3ab},
      {s:'box', d:[3.02,.06,.11], p:[0,.62,.05],    m:'steel', c:0x7d868d, nc:1},
      {s:'box', d:[3.02,.06,.11], p:[0,1.22,.05],   m:'steel', c:0x7d868d, nc:1},
      {s:'box', d:[3.02,.06,.11], p:[0,1.82,.05],   m:'steel', c:0x7d868d, nc:1},
      {s:'box', d:[.1,2.5,.16],   p:[-1.55,1.25,-.06], m:'steel', c:0x5f676e},
      {s:'box', d:[.1,2.5,.16],   p:[1.55,1.25,-.06],  m:'steel', c:0x5f676e},
      {s:'box', d:[.42,.09,.06],  p:[0,.95,.09],    m:'steel', c:0x3f454b, nc:1},
  ]},

  // ventanal 2.4 x 2.4: marco de acero, parteluz y vidrio
  { id:'b_window_big', name:'GlassWindow', mass:130, col:'box', tags:['window','glass','opening'], parts:[
      {s:'box', d:[2.4,.1,.14],   p:[0,.05,0],     m:'steel', c:0x6d757d},
      {s:'box', d:[2.4,.1,.14],   p:[0,2.35,0],    m:'steel', c:0x6d757d},
      {s:'box', d:[.1,2.4,.14],   p:[-1.15,1.2,0], m:'steel', c:0x6d757d},
      {s:'box', d:[.1,2.4,.14],   p:[1.15,1.2,0],  m:'steel', c:0x6d757d},
      {s:'box', d:[.08,2.3,.12],  p:[0,1.2,0],     m:'steel', c:0x6d757d, nc:1},
      {s:'box', d:[2.2,2.2,.03],  p:[0,1.2,0],     m:'glass', c:0xa8dbe8, nc:1},
  ]},

  /* ---------- estructura ---------- */

  // columna redonda de hormigón 3.2 m con base y capitel
  { id:'b_column', name:'Column01', mass:1300, tags:['column','pillar','concrete'], parts:[
      {s:'box', d:[.6,.16,.6],  p:[0,.08,0],   m:'concrete', c:0xaaa8a0},
      {s:'cyl', d:[.27,.1],     p:[0,.21,0],   m:'concrete', c:0xb5b3ab, nc:1},
      {s:'cyl', d:[.22,2.86],   p:[0,1.59,0],  m:'concrete', c:0xc2beb4},
      {s:'cyl', d:[.25,.1],     p:[0,3.07,0],  m:'concrete', c:0xb5b3ab, nc:1},
      {s:'box', d:[.56,.14,.56],p:[0,3.19,0],  m:'concrete', c:0xaaa8a0},
  ]},

  // viga doble T de acero de 5 m
  { id:'b_beam_i', name:'SteelBeam', mass:210, col:'box', tags:['beam','steel','structure'], parts:[
      {s:'box', d:[5,.24,.03],  p:[0,.17,0],   m:'steel', c:0x77808a},
      {s:'box', d:[5,.04,.18],  p:[0,.03,0],   m:'steel', c:0x6b747d},
      {s:'box', d:[5,.04,.18],  p:[0,.31,0],   m:'steel', c:0x6b747d},
      {s:'box', d:[.03,.32,.2], p:[-2.5,.17,0],m:'steel', c:0x4f565c, nc:1},
      {s:'box', d:[.03,.32,.2], p:[2.5,.17,0], m:'steel', c:0x4f565c, nc:1},
  ]},

  // losa de piso 3.0 x 3.0 con carpeta y ganchos de izaje
  { id:'b_slab_floor', name:'FloorPanel', mass:2600, col:'box', tags:['floor','slab','concrete'], parts:[
      {s:'box', d:[3,.12,3],       p:[0,.06,0],    m:'concrete', c:0xa8a6a0},
      {s:'box', d:[2.84,.03,2.84], p:[0,.135,0],   m:'concrete', c:0xbdbbb4, nc:1},
      {s:'cyl', d:[.07,.09],       p:[-.9,.165,0], m:'steel', nc:1},
      {s:'cyl', d:[.07,.09],       p:[.9,.165,0],  m:'steel', nc:1},
  ]},

  // techo a dos aguas con tejas, 4.3 x 3.0, con tabla de alero
  { id:'b_roof_tiled', name:'RoofTiled', mass:620, tags:['roof','tile','gable'], parts:[
      {s:'box', d:[2.3,.12,3],    p:[-1.02,1.02,0], r:[0,0,25],  m:'tile', c:0x9a4b38},
      {s:'box', d:[2.3,.12,3],    p:[1.02,1.02,0],  r:[0,0,-25], m:'tile', c:0x9a4b38},
      {s:'box', d:[.34,.14,3.06], p:[0,1.5,0],      m:'tile', c:0x82412f, nc:1},
      {s:'box', d:[.16,.62,3.06], p:[-2.06,.31,0],  m:'plank', c:0x6d5940},
      {s:'box', d:[.16,.62,3.06], p:[2.06,.31,0],   m:'plank', c:0x6d5940},
  ]},

  // viga reticulada de acero, luz 5 m
  { id:'b_truss', name:'RoofTruss', mass:95, tags:['truss','beam','steel','roof'], parts:[
      {s:'box', d:[5,.09,.11],    p:[0,.045,0],   m:'steel', c:0x6d757d},
      {s:'box', d:[2.66,.09,.11], p:[-1.25,.5,0], r:[0,0,19],  m:'steel', c:0x6d757d},
      {s:'box', d:[2.66,.09,.11], p:[1.25,.5,0],  r:[0,0,-19], m:'steel', c:0x6d757d},
      {s:'box', d:[.08,.85,.1],   p:[0,.51,0],    m:'steel', c:0x5c646c, nc:1},
      {s:'box', d:[.07,.44,.09],  p:[-1.25,.3,0], m:'steel', c:0x5c646c, nc:1},
      {s:'box', d:[.07,.44,.09],  p:[1.25,.3,0],  m:'steel', c:0x5c646c, nc:1},
  ]},

  /* ---------- circulación ---------- */

  // escalera recta de hormigón, 6 escalones (alzada .18 / pedada .28)
  { id:'b_stairs', name:'Stairs01', mass:1700, tags:['stairs','steps','concrete'], parts:[
      {s:'box', d:[1.1,.18,.28],  p:[0,.09,.7],  m:'concrete', c:0xa8a6a0},
      {s:'box', d:[1.1,.36,.28],  p:[0,.18,.42], m:'concrete', c:0xa8a6a0},
      {s:'box', d:[1.1,.54,.28],  p:[0,.27,.14], m:'concrete', c:0xa8a6a0},
      {s:'box', d:[1.1,.72,.28],  p:[0,.36,-.14],m:'concrete', c:0xa8a6a0},
      {s:'box', d:[1.1,.9,.28],   p:[0,.45,-.42],m:'concrete', c:0xa8a6a0},
      {s:'box', d:[1.1,1.08,.28], p:[0,.54,-.7], m:'concrete', c:0xa8a6a0},
  ]},

  // escalera en L con descanso: 4 escalones + descanso + 3 escalones
  { id:'b_stairs_l', name:'StairsL', mass:2800, tags:['stairs','steps','landing','concrete'], parts:[
      {s:'box', d:[1,.18,.28],  p:[-.42,.09,.92], m:'concrete', c:0xa8a6a0, nc:1},
      {s:'box', d:[1,.36,.28],  p:[-.42,.18,.64], m:'concrete', c:0xa8a6a0},
      {s:'box', d:[1,.54,.28],  p:[-.42,.27,.36], m:'concrete', c:0xa8a6a0},
      {s:'box', d:[1,.72,.28],  p:[-.42,.36,.08], m:'concrete', c:0xa8a6a0},
      {s:'box', d:[1,.72,1],    p:[-.42,.36,-.56],m:'concrete', c:0x9e9c95},
      {s:'box', d:[.28,.9,1],   p:[.22,.45,-.56], m:'concrete', c:0xa8a6a0, nc:1},
      {s:'box', d:[.28,1.08,1], p:[.5,.54,-.56],  m:'concrete', c:0xa8a6a0},
      {s:'box', d:[.28,1.26,1], p:[.78,.63,-.56], m:'concrete', c:0xa8a6a0},
  ]},

  // rampa de acceso de madera 1.8 x 3.3, sube 1 m
  { id:'b_ramp', name:'Ramp01', mass:480, tags:['ramp','wedge','jump'], parts:[
      {s:'box', d:[1.8,.14,3.3],  p:[0,.52,0],     r:[16,0,0], m:'plank', c:0xa8845a},
      {s:'box', d:[1.76,.85,.4],  p:[0,.425,-1.45],m:'steel', c:0x6d757d},
      {s:'box', d:[1.76,.58,.3],  p:[0,.29,-.5],   m:'steel', c:0x6d757d, nc:1},
      {s:'box', d:[.1,.16,3.3],   p:[-.86,.67,0],  r:[16,0,0], m:'paint', c:0xd8c23a, nc:1},
      {s:'box', d:[.1,.16,3.3],   p:[.86,.67,0],   r:[16,0,0], m:'paint', c:0xd8c23a, nc:1},
  ]},

  // baranda de acero 2.4 x 1.1 con barrotes
  { id:'b_railing', name:'Railing01', mass:42, tags:['railing','guard','steel'], parts:[
      {s:'box', d:[.08,1.1,.08], p:[-1.16,.55,0], m:'steel', c:0x5c646c},
      {s:'box', d:[.08,1.1,.08], p:[1.16,.55,0],  m:'steel', c:0x5c646c},
      {s:'box', d:[2.4,.08,.1],  p:[0,1.06,0],    m:'steel', c:0x6d757d},
      {s:'box', d:[2.4,.06,.08], p:[0,.58,0],     m:'steel', c:0x6d757d, nc:1},
      {s:'box', d:[.04,.98,.04], p:[-.72,.52,0],  m:'steel', c:0x77808a, nc:1},
      {s:'box', d:[.04,.98,.04], p:[-.24,.52,0],  m:'steel', c:0x77808a, nc:1},
      {s:'box', d:[.04,.98,.04], p:[.24,.52,0],   m:'steel', c:0x77808a, nc:1},
      {s:'box', d:[.04,.98,.04], p:[.72,.52,0],   m:'steel', c:0x77808a, nc:1},
  ]},

  // pasamanos de tubo cromado 2.2 m con bridas al piso
  { id:'b_handrail', name:'PipeRail', mass:15, tags:['handrail','pipe','tube'], parts:[
      {s:'cyl', d:[.032,1.12], p:[-1,.56,0],  m:'chrome'},
      {s:'cyl', d:[.032,1.12], p:[1,.56,0],   m:'chrome'},
      {s:'cyl', d:[.032,2.2],  p:[0,1.12,0],  r:[0,0,90], m:'chrome'},
      {s:'box', d:[2.2,.05,.05],p:[0,.62,0],  m:'chrome', nc:1},
      {s:'cyl', d:[.09,.02],   p:[-1,.01,0],  m:'chrome', nc:1},
      {s:'cyl', d:[.09,.02],   p:[1,.01,0],   m:'chrome', nc:1},
  ]},

  // balcón: losa 2.6 x 1.3 con baranda de acero
  { id:'b_balcony', name:'Balcony01', mass:1500, tags:['balcony','slab','railing'], parts:[
      {s:'box', d:[2.6,.18,1.3], p:[0,.09,0],     m:'concrete', c:0xa8a6a0},
      {s:'box', d:[.07,1.05,.07],p:[-1.22,.62,.6],m:'steel', c:0x5c646c},
      {s:'box', d:[.07,1.05,.07],p:[1.22,.62,.6], m:'steel', c:0x5c646c},
      {s:'box', d:[2.6,.07,.08], p:[0,1.12,.6],   m:'steel', c:0x6d757d},
      {s:'box', d:[.07,.07,1.2], p:[-1.22,1.12,.02],m:'steel', c:0x6d757d, nc:1},
      {s:'box', d:[.07,.07,1.2], p:[1.22,1.12,.02], m:'steel', c:0x6d757d, nc:1},
      {s:'box', d:[.04,.95,.04], p:[-.61,.6,.6],  m:'steel', c:0x77808a, nc:1},
      {s:'box', d:[.04,.95,.04], p:[.61,.6,.6],   m:'steel', c:0x77808a, nc:1},
  ]},

  /* ---------- remates ---------- */

  // chimenea de ladrillo 2.9 m con sombrerete
  { id:'b_chimney', name:'Chimney01', mass:2000, tags:['chimney','brick','roof'], parts:[
      {s:'box', d:[.7,2.2,.7],   p:[0,1.1,0],   m:'brick', c:0x8a4a38},
      {s:'box', d:[.86,.16,.86], p:[0,2.28,0],  m:'brick', c:0x93513a},
      {s:'box', d:[.92,.08,.92], p:[0,2.4,0],   m:'concrete', c:0xb0aea6, nc:1},
      {s:'cyl', d:[.15,.42],     p:[0,2.65,0],  m:'metal', c:0x3a3f45, nc:1},
      {s:'cyl', d:[.23,.05],     p:[0,2.89,0],  m:'metal', c:0x3a3f45, nc:1},
  ]},

  // arco de ladrillo de medio punto, paso 2.0 x 3.0
  { id:'b_arch', name:'Arch01', mass:2900, tags:['arch','brick','opening'], parts:[
      {s:'box', d:[.42,2,.5],   p:[-1.17,1,0],     m:'brick', c:0x93513a},
      {s:'box', d:[.42,2,.5],   p:[1.17,1,0],      m:'brick', c:0x93513a},
      {s:'box', d:[.8,.36,.5],  p:[-1.113,2.361,0],r:[0,0,72],  m:'brick', c:0x8a4a34, nc:1},
      {s:'box', d:[.8,.36,.5],  p:[-.688,2.946,0], r:[0,0,36],  m:'brick', c:0x8a4a34},
      {s:'box', d:[.8,.36,.5],  p:[0,3.17,0],      m:'brick', c:0x9c5b42},
      {s:'box', d:[.8,.36,.5],  p:[.688,2.946,0],  r:[0,0,-36], m:'brick', c:0x8a4a34},
      {s:'box', d:[.8,.36,.5],  p:[1.113,2.361,0], r:[0,0,-72], m:'brick', c:0x8a4a34, nc:1},
  ]},

  /* ---------- materiales de obra ---------- */

  // bloque de cemento hueco 39 x 19 x 19 cm
  { id:'b_block', name:'CinderBlock', mass:17, col:'box', tags:['block','cinder','concrete'], parts:[
      {s:'box', d:[.39,.19,.032],  p:[0,.095,.079],  m:'concrete', c:0x9d9c95},
      {s:'box', d:[.39,.19,.032],  p:[0,.095,-.079], m:'concrete', c:0x9d9c95},
      {s:'box', d:[.032,.19,.126], p:[-.179,.095,0], m:'concrete', c:0x92918a},
      {s:'box', d:[.032,.19,.126], p:[0,.095,0],     m:'concrete', c:0x92918a},
      {s:'box', d:[.032,.19,.126], p:[.179,.095,0],  m:'concrete', c:0x92918a},
  ]},

  // pallet de ladrillos flejado
  { id:'b_brick_pallet', name:'BrickPallet', mass:980, tags:['pallet','brick','supply'], parts:[
      {s:'box', d:[1.2,.08,.13], p:[0,.04,-.33], m:'plank', c:0x9c7b4f},
      {s:'box', d:[1.2,.08,.13], p:[0,.04,.33],  m:'plank', c:0x9c7b4f},
      {s:'box', d:[1.2,.06,.8],  p:[0,.11,0],    m:'plank', c:0xa8845a},
      {s:'box', d:[1.12,.24,.74],p:[0,.26,0],    m:'brick', c:0x9c4f38},
      {s:'box', d:[1.08,.24,.7], p:[0,.5,0],     r:[0,5,0], m:'brick', c:0x93513a},
      {s:'box', d:[1.04,.22,.66],p:[0,.73,0],    m:'brick', c:0x9c4f38},
      {s:'box', d:[.05,.78,.72], p:[0,.5,0],     m:'plastic', c:0x2b2f36, nc:1},
  ]},

  // pila de bolsas de arena en pirámide
  { id:'b_sandbags', name:'SandBags', mass:130, tags:['sandbag','barrier','fabric'], parts:[
      {s:'box', d:[.56,.16,.32], p:[-.56,.08,0],  r:[0,7,0],  m:'fabric', c:0xa89a6e},
      {s:'box', d:[.56,.16,.32], p:[0,.08,.02],   r:[0,-4,0], m:'fabric', c:0x9e9166},
      {s:'box', d:[.56,.16,.32], p:[.56,.08,0],   r:[0,6,0],  m:'fabric', c:0xa89a6e},
      {s:'box', d:[.54,.16,.3],  p:[-.28,.24,.01],r:[0,-5,0], m:'fabric', c:0x9e9166},
      {s:'box', d:[.54,.16,.3],  p:[.28,.24,-.01],r:[0,4,0],  m:'fabric', c:0xa89a6e},
      {s:'box', d:[.52,.15,.28], p:[0,.395,0],    r:[0,8,0],  m:'fabric', c:0x958a61},
  ]},

  // atado de hierros de construcción de 4 m
  { id:'b_rebar', name:'RebarBundle', mass:130, tags:['rebar','steel','supply'], parts:[
      {s:'box', d:[.03,.03,4],  p:[-.105,.015,0], m:'rust', c:0x8a6a52},
      {s:'box', d:[.03,.03,4],  p:[-.035,.015,0], m:'rust', c:0x8a6a52},
      {s:'box', d:[.03,.03,4],  p:[.035,.015,0],  m:'rust', c:0x8a6a52},
      {s:'box', d:[.03,.03,4],  p:[.105,.015,0],  m:'rust', c:0x8a6a52},
      {s:'box', d:[.03,.03,4],  p:[-.07,.045,0],  m:'rust', c:0x93715a},
      {s:'box', d:[.03,.03,4],  p:[0,.045,0],     m:'rust', c:0x93715a},
      {s:'box', d:[.03,.03,4],  p:[.07,.045,0],   m:'rust', c:0x93715a},
      {s:'box', d:[.27,.085,.025], p:[0,.04,1.2], m:'metal', c:0x6a6a60, nc:1},
      {s:'box', d:[.27,.085,.025], p:[0,.04,-1.2],m:'metal', c:0x6a6a60, nc:1},
  ]},

  // marco de andamio de caño 1.8 x 2.0
  { id:'b_scaffold', name:'TubeScaffold', mass:30, tags:['scaffold','tube','work'], parts:[
      {s:'cyl', d:[.028,2],      p:[-.85,1,0],    m:'steel', c:0x8e97a0},
      {s:'cyl', d:[.028,2],      p:[.85,1,0],     m:'steel', c:0x8e97a0},
      {s:'box', d:[1.76,.06,.06],p:[0,1.94,0],    m:'steel', c:0x8e97a0},
      {s:'box', d:[1.76,.05,.05],p:[0,1,0],       m:'steel', c:0x8e97a0, nc:1},
      {s:'box', d:[1.9,.05,.05], p:[0,1,.07],     r:[0,0,28], m:'steel', c:0x77808a, nc:1},
      {s:'cyl', d:[.08,.025],    p:[-.85,.0125,0],m:'steel', c:0x5c646c, nc:1},
      {s:'cyl', d:[.08,.025],    p:[.85,.0125,0], m:'steel', c:0x5c646c, nc:1},
  ]},

  // cartel de obra sobre dos postes de madera
  { id:'b_site_sign', name:'SiteSign', mass:45, tags:['sign','site','work'], parts:[
      {s:'box', d:[.09,2.2,.09], p:[-.76,1.1,0], m:'plank', c:0x8a6a44},
      {s:'box', d:[.09,2.2,.09], p:[.76,1.1,0],  m:'plank', c:0x8a6a44},
      {s:'box', d:[1.9,1.1,.05], p:[0,1.66,.06], m:'paint', c:0xe8a41c},
      {s:'box', d:[1.9,.24,.02], p:[0,2.09,.09], m:'paint', c:0x23262b, nc:1},
      {s:'box', d:[1.5,.09,.02], p:[0,1.6,.09],  m:'paint', c:0x2b2f36, nc:1},
      {s:'box', d:[1.34,.09,.02],p:[0,1.42,.09], m:'paint', c:0x2b2f36, nc:1},
  ]},

  // toldo de lona sobre cuatro caños
  { id:'b_awning', name:'Awning01', mass:70, tags:['awning','canopy','fabric'], parts:[
      {s:'cyl', d:[.05,2.65],   p:[-1.3,1.325,-.92], m:'steel', c:0x4a4f55},
      {s:'cyl', d:[.05,2.65],   p:[1.3,1.325,-.92],  m:'steel', c:0x4a4f55},
      {s:'cyl', d:[.05,2.28],   p:[-1.3,1.14,.92],   m:'steel', c:0x4a4f55},
      {s:'cyl', d:[.05,2.28],   p:[1.3,1.14,.92],    m:'steel', c:0x4a4f55},
      {s:'box', d:[2.76,.1,.1], p:[0,2.6,-.92],      m:'steel', c:0x4a4f55, nc:1},
      {s:'box', d:[2.9,.06,2],  p:[0,2.47,0],  r:[10,0,0], m:'fabric', c:0xc0392b},
      {s:'box', d:[2.9,.26,.04],p:[0,2.15,.99],      m:'fabric', c:0xc0392b, nc:1},
  ]},

  // portón de reja 2.0 x 2.05 con lanzas
  { id:'b_gate_iron', name:'IronGate', mass:80, tags:['gate','iron','fence'], parts:[
      {s:'box', d:[.07,1.9,.05], p:[-.96,.95,0],  m:'steel', c:0x24272c},
      {s:'box', d:[.07,1.9,.05], p:[.96,.95,0],   m:'steel', c:0x24272c},
      {s:'box', d:[2,.07,.05],   p:[0,.05,0],     m:'steel', c:0x24272c},
      {s:'box', d:[2,.08,.05],   p:[0,1.62,0],    m:'steel', c:0x24272c},
      {s:'cyl', d:[.022,1.9],    p:[-.58,.95,0],  m:'steel', c:0x2e3238, nc:1},
      {s:'cyl', d:[.022,1.9],    p:[-.19,.95,0],  m:'steel', c:0x2e3238, nc:1},
      {s:'cyl', d:[.022,1.9],    p:[.19,.95,0],   m:'steel', c:0x2e3238, nc:1},
      {s:'cyl', d:[.022,1.9],    p:[.58,.95,0],   m:'steel', c:0x2e3238, nc:1},
      {s:'cone',d:[.04,.15],     p:[-.58,1.975,0],m:'steel', c:0x2e3238, nc:1},
      {s:'cone',d:[.04,.15],     p:[-.19,1.975,0],m:'steel', c:0x2e3238, nc:1},
      {s:'cone',d:[.04,.15],     p:[.19,1.975,0], m:'steel', c:0x2e3238, nc:1},
      {s:'cone',d:[.04,.15],     p:[.58,1.975,0], m:'steel', c:0x2e3238, nc:1},
  ]},

]);
