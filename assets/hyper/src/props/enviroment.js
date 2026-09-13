HP.section('enviroment','Enviroment','acc',[

  /* naturaleza y exterior — 28 props.
     Escala humana: jugador 1.8 m · banco 0.45 m · mesa 0.74 m · fardo redondo 1.5 m ø
     y=0 = piso del objeto, centrado en X/Z. */

  /* ---------------- árboles y plantas ---------------- */

  // árbol de copa ancha: tronco cónico + 4 masas de copa + rama
  { id:'e_tree_oak', glb:'tree', name:'Tree01', mass:900, tags:['tree','nature','oak'], parts:[
      {s:'cyl', d:[.24,.38,3.3], p:[0,1.65,0],     m:'wood',  c:0x6b4f34},
      {s:'sph', d:[1.6],         p:[0,4.15,0],     m:'grass', c:0x4a7a35},
      {s:'sph', d:[1.15],        p:[-1.15,3.5,.25],m:'grass', c:0x406b2d},
      {s:'sph', d:[1.1],         p:[1.05,3.65,-.35],m:'grass',c:0x517f38},
      {s:'sph', d:[.85],         p:[.15,5.0,.45],  m:'grass', c:0x568a3c, nc:1},
      {s:'cyl', d:[.1,.9],       p:[.45,3.0,0], r:[0,0,55], m:'wood', c:0x6b4f34, nc:1},
  ]},

  // pino: tronco corto + 4 conos apilados
  { id:'e_pine', name:'PineTree', mass:650, tags:['tree','pine','conifer'], parts:[
      {s:'cyl',  d:[.16,.24,1.5], p:[0,.75,0],  m:'wood',  c:0x5c4530},
      {s:'cone', d:[1.45,2.1],    p:[0,1.85,0], m:'grass', c:0x2f5c33},
      {s:'cone', d:[1.12,1.9],    p:[0,3.0,0],  m:'grass', c:0x356436},
      {s:'cone', d:[.72,1.7],     p:[0,4.15,0], m:'grass', c:0x3b6d3a},
      {s:'cone', d:[.3,.8],       p:[0,5.3,0],  m:'grass', c:0x40753d, nc:1},
  ]},

  // palmera: tronco alto y fino + corona de hojas + cocos
  { id:'e_palm', name:'PalmTree', mass:700, tags:['tree','palm','tropical'], parts:[
      {s:'cyl', d:[.17,.26,4.3], p:[0,2.15,0], m:'wood', c:0x8a7150},
      {s:'box', d:[2.3,.1,.6],  p:[1.05,4.4,0],  r:[0,0,-16],  m:'grass', c:0x4d7a34, nc:1},
      {s:'box', d:[2.3,.1,.6],  p:[-1.05,4.35,0],r:[0,0,16],   m:'grass', c:0x44702e, nc:1},
      {s:'box', d:[.6,.1,2.3],  p:[0,4.4,1.05],  r:[-16,0,0],  m:'grass', c:0x4d7a34, nc:1},
      {s:'box', d:[.6,.1,2.3],  p:[0,4.3,-1.05], r:[16,0,0],   m:'grass', c:0x44702e, nc:1},
      {s:'box', d:[2.1,.1,.55], p:[.8,4.6,.8],   r:[0,-45,-22],m:'grass', c:0x568a3a, nc:1},
      {s:'sph', d:[.16],        p:[.18,4.15,.12], m:'wood', c:0x5c4630, nc:1},
  ]},

  // arbusto redondeado
  { id:'e_bush', name:'Bush01', mass:28, tags:['bush','shrub','nature'], parts:[
      {s:'sph', d:[.6],  p:[0,.56,0],    m:'grass', c:0x3f6b2f},
      {s:'sph', d:[.45], p:[.55,.42,.18],m:'grass', c:0x477a35},
      {s:'sph', d:[.42], p:[-.5,.4,-.22],m:'grass', c:0x38602a},
      {s:'sph', d:[.34], p:[.1,.95,-.15],m:'grass', c:0x4d8239, nc:1},
      {s:'cyl', d:[.05,.4], p:[0,.2,0],  m:'wood',  c:0x5c4530, nc:1},
  ]},

  // cactus saguaro: cuerpo + 2 brazos en codo + flor
  { id:'e_cactus', name:'Cactus', mass:240, tags:['cactus','desert','plant'], parts:[
      {s:'cyl', d:[.26,.3,2.5], p:[0,1.25,0],  m:'grass', c:0x4e7a3e},
      {s:'cyl', d:[.15,.55],    p:[.5,1.15,0], r:[0,0,90], m:'grass', c:0x4e7a3e},
      {s:'cyl', d:[.15,.9],     p:[.74,1.6,0], m:'grass', c:0x4e7a3e},
      {s:'cyl', d:[.13,.45],    p:[-.42,1.75,0], r:[0,0,90], m:'grass', c:0x477036},
      {s:'cyl', d:[.13,.75],    p:[-.62,2.15,0], m:'grass', c:0x477036},
      {s:'sph', d:[.1],         p:[0,2.55,0],  m:'paint', c:0xe8557a, nc:1},
  ]},

  // girasol: tallo + hojas + disco de pétalos
  { id:'e_sunflower', name:'Sunflower', mass:4, col:'box', tags:['flower','plant','farm'], parts:[
      {s:'cyl', d:[.05,1.85], p:[0,.925,0], m:'grass', c:0x5e8a3a},
      {s:'box', d:[.55,.06,.3], p:[.3,1.0,0],  r:[0,10,28],  m:'grass', c:0x557f34, nc:1},
      {s:'box', d:[.5,.06,.28], p:[-.28,.72,.05], r:[0,-20,-25], m:'grass', c:0x557f34, nc:1},
      {s:'cyl', d:[.52,.07], p:[0,1.92,-.02], r:[80,0,0], m:'paint',  c:0xf2c010},
      {s:'cyl', d:[.24,.09], p:[0,1.92,.05],  r:[80,0,0], m:'fabric', c:0x4a3115, nc:1},
  ]},

  // mata de pasto alto: champa + hojas anchas inclinadas
  { id:'e_grass_tuft', name:'TallGrass', mass:3, col:'box', tags:['grass','nature','foliage'], parts:[
      {s:'sph', d:[.24], p:[0,.2,0], m:'grass', c:0x5c7a34},
      {s:'box', d:[.5,1.15,.06],  p:[-.08,.6,.05], r:[0,10,14],  m:'grass', c:0x6f8f3e},
      {s:'box', d:[.42,1.3,.06],  p:[.1,.67,-.06], r:[0,65,-12], m:'grass', c:0x7a9a45, nc:1},
      {s:'box', d:[.38,.95,.05],  p:[.02,.5,.14],  r:[0,120,10], m:'grass', c:0x648236, nc:1},
      {s:'box', d:[.34,1.05,.05], p:[-.12,.55,-.14],r:[0,150,-8],m:'grass', c:0x6f8f3e, nc:1},
  ]},

  // hongo grande: pie + sombrero domo + lunares
  { id:'e_mushroom', name:'Mushroom', mass:9, tags:['mushroom','fungus','nature'], parts:[
      {s:'cyl', d:[.13,.19,.6], p:[0,.3,0],   m:'plastic', c:0xe6dcc0},
      {s:'sph', d:[.44],        p:[0,.66,0],  m:'plastic', c:0xb03428},
      {s:'cyl', d:[.28,.06],    p:[0,.5,0],   m:'plastic', c:0xd8cdae, nc:1},
      {s:'sph', d:[.09], p:[.2,.95,.1],   m:'plastic', c:0xf2ede0, nc:1},
      {s:'sph', d:[.08], p:[-.18,.92,-.14],m:'plastic', c:0xf2ede0, nc:1},
      {s:'sph', d:[.07], p:[.02,1.05,-.2], m:'plastic', c:0xf2ede0, nc:1},
  ]},

  /* ---------------- madera ---------------- */

  // tocón con raíces
  { id:'e_stump', name:'Stump', mass:190, tags:['stump','wood','tree'], parts:[
      {s:'cyl', d:[.42,.5,.65], p:[0,.325,0], m:'wood', c:0x6a5136},
      {s:'cyl', d:[.4,.06],     p:[0,.66,0],  m:'wood', c:0xa8895c, nc:1},
      {s:'box', d:[.55,.18,.22],p:[.42,.09,.12],  r:[0,25,0],  m:'wood', c:0x60492f, nc:1},
      {s:'box', d:[.5,.16,.2],  p:[-.38,.08,-.2], r:[0,-35,0], m:'wood', c:0x60492f, nc:1},
      {s:'box', d:[.45,.15,.2], p:[.05,.075,-.45],r:[0,70,0],  m:'wood', c:0x60492f, nc:1},
  ]},

  // tronco caído: cilindro largo en segmentos (apoyado, no rueda al infinito)
  { id:'e_log', name:'FallenLog', mass:420, tags:['log','wood','tree'], parts:[
      {s:'cyl', d:[.34,.72], p:[-1.08,.33,0], r:[0,0,90], m:'wood', c:0x6f5539},
      {s:'cyl', d:[.33,.72], p:[-.36,.33,0],  r:[0,0,90], m:'wood', c:0x6f5539},
      {s:'cyl', d:[.31,.72], p:[.36,.33,0],   r:[0,0,90], m:'wood', c:0x685033},
      {s:'cyl', d:[.29,.72], p:[1.08,.33,0],  r:[0,0,90], m:'wood', c:0x685033},
      {s:'cyl', d:[.3,.08],  p:[-1.44,.33,0], r:[0,0,90], m:'wood', c:0xb08a5e, nc:1},
      {s:'cyl', d:[.09,.5],  p:[.4,.55,.3],   r:[30,0,20], m:'wood', c:0x5c4530, nc:1},
  ]},

  /* ---------------- piedra ---------------- */

  // roca chica angular
  { id:'e_rock_s', name:'Rock01', mass:150, tags:['rock','stone','nature'], parts:[
      {s:'box', d:[.55,.34,.46], p:[0,.17,0],    r:[0,22,0],  m:'concrete', c:0x7d7a74},
      {s:'box', d:[.4,.26,.34],  p:[.1,.36,-.06],r:[0,-38,0], m:'concrete', c:0x8a877f},
      {s:'box', d:[.26,.18,.24], p:[-.22,.12,.16],r:[0,15,0], m:'concrete', c:0x6e6b66, nc:1},
  ]},

  // roca mediana
  { id:'e_rock_m', name:'Rock02', mass:1800, tags:['rock','stone','nature'], parts:[
      {s:'box', d:[1.2,.7,1.0], p:[0,.35,0],     r:[0,18,0],  m:'concrete', c:0x77746e},
      {s:'box', d:[.9,.55,.8],  p:[.15,.82,-.1], r:[0,-30,0], m:'concrete', c:0x827f78},
      {s:'box', d:[.6,.4,.5],   p:[-.35,.6,.35], r:[0,40,0],  m:'concrete', c:0x6b6862},
      {s:'box', d:[.45,.3,.4],  p:[.3,1.18,.15], r:[0,10,0],  m:'concrete', c:0x8a877f, nc:1},
  ]},

  // roca grande (bloque de 2.4 m, sirve de cobertura)
  { id:'e_rock_l', name:'Rock03', mass:2900, tags:['rock','stone','cover'], parts:[
      {s:'box', d:[2.4,1.3,2.0], p:[0,.65,0],     r:[0,14,0],  m:'concrete', c:0x74716b},
      {s:'box', d:[1.9,1.0,1.6], p:[.2,1.5,-.15], r:[0,-26,0], m:'concrete', c:0x807d76},
      {s:'box', d:[1.2,.8,1.1],  p:[-.6,1.15,.5], r:[0,35,0],  m:'concrete', c:0x67645f},
      {s:'box', d:[.9,.6,.8],    p:[.35,2.15,.2], r:[0,8,0],   m:'concrete', c:0x807d76, nc:1},
  ]},

  // canto rodado: piedra de río lisa
  { id:'e_boulder', name:'Boulder', mass:2400, tags:['rock','boulder','river'], parts:[
      {s:'sph', d:[.8],  p:[0,.76,0],    m:'concrete', c:0x7b7873},
      {s:'sph', d:[.55], p:[.5,.6,.15],  m:'concrete', c:0x86837c},
      {s:'sph', d:[.45], p:[-.5,.5,-.2], m:'concrete', c:0x6f6c67},
      {s:'sph', d:[.35], p:[.1,1.35,-.2],m:'concrete', c:0x86837c, nc:1},
  ]},

  // pila de piedras tipo mojón
  { id:'e_stone_pile', name:'StonePile', mass:600, tags:['stone','cairn','pile'], parts:[
      {s:'box', d:[.9,.22,.8],   p:[0,.11,0],   r:[0,12,0],  m:'concrete', c:0x807d77},
      {s:'box', d:[.72,.2,.64],  p:[.05,.32,-.04],r:[0,-25,0],m:'concrete',c:0x8b8880},
      {s:'box', d:[.58,.18,.52], p:[-.04,.51,.05],r:[0,35,0], m:'concrete',c:0x76736d},
      {s:'box', d:[.42,.17,.38], p:[.03,.69,-.02],r:[0,-15,0],m:'concrete',c:0x84817a},
      {s:'box', d:[.28,.15,.26], p:[0,.85,.02], r:[0,20,0],  m:'concrete', c:0x76736d, nc:1},
  ]},

  // montículo de tierra recién cavado
  { id:'e_mound', name:'DirtMound', mass:1700, tags:['dirt','mound','earth'], parts:[
      {s:'cone',d:[1.15,.9],     p:[0,.45,0],   m:'dirt', c:0x6b5138},
      {s:'sph', d:[.18],         p:[.95,.15,.35],m:'dirt', c:0x5e4630, nc:1},
      {s:'sph', d:[.15],         p:[-.85,.13,-.4],m:'dirt',c:0x5e4630, nc:1},
      {s:'sph', d:[.22],         p:[.3,.75,-.25],m:'dirt', c:0x77593d, nc:1},
      {s:'box', d:[.3,.16,.26],  p:[-.5,.08,.75],r:[0,25,0],m:'concrete', c:0x7d7a73, nc:1},
  ]},

  /* ---------------- campo / granja ---------------- */

  // zapallo grande
  { id:'e_pumpkin', name:'Pumpkin', mass:16, tags:['pumpkin','farm','food'], parts:[
      {s:'sph', d:[.28],       p:[0,.26,0],   m:'plastic', c:0xe07818},
      {s:'sph', d:[.22],       p:[.12,.25,0], m:'plastic', c:0xd97014, nc:1},
      {s:'sph', d:[.22],       p:[-.12,.25,0],m:'plastic', c:0xd97014, nc:1},
      {s:'sph', d:[.21],       p:[0,.25,.13], m:'plastic', c:0xd97014, nc:1},
      {s:'sph', d:[.21],       p:[0,.25,-.13],m:'plastic', c:0xd97014, nc:1},
      {s:'cyl', d:[.05,.07,.16],p:[0,.55,0],  m:'wood',    c:0x6b7a35, nc:1},
  ]},

  // fardo redondo 1.5 m ø
  { id:'e_hay_round', name:'HayRound', mass:400, tags:['hay','bale','farm'], parts:[
      {s:'cyl', d:[.75,1.25], p:[0,.74,0],   r:[0,0,90], m:'grass', c:0xc9ab5e},
      {s:'cyl', d:[.77,.05],  p:[-.4,.74,0], r:[0,0,90], m:'grass', c:0xa88f4a, nc:1},
      {s:'cyl', d:[.77,.05],  p:[0,.74,0],   r:[0,0,90], m:'grass', c:0xa88f4a, nc:1},
      {s:'cyl', d:[.77,.05],  p:[.4,.74,0],  r:[0,0,90], m:'grass', c:0xa88f4a, nc:1},
  ]},

  // fardo cuadrado atado con hilo
  { id:'e_hay_square', name:'HaySquare', mass:22, tags:['hay','bale','farm'], parts:[
      {s:'box', d:[.95,.4,.42],  p:[0,.2,0],    m:'grass',  c:0xd2b76a},
      {s:'box', d:[.97,.04,.04], p:[0,.4,.13],  m:'fabric', c:0x9c8a5a, nc:1},
      {s:'box', d:[.97,.04,.04], p:[0,.4,-.13], m:'fabric', c:0x9c8a5a, nc:1},
      {s:'box', d:[.06,.36,.38], p:[.5,.19,0],  m:'grass',  c:0xe0c87c, nc:1},
      {s:'box', d:[.06,.36,.38], p:[-.5,.19,0], m:'grass',  c:0xe0c87c, nc:1},
  ]},

  // cerco rústico de 3 tirantes
  { id:'e_fence', name:'Fence01', mass:48, tags:['fence','wood','rustic'], parts:[
      {s:'cyl', d:[.075,.09,1.35], p:[-1.4,.675,0], m:'wood',  c:0x6b5236},
      {s:'cyl', d:[.075,.09,1.35], p:[1.4,.675,0],  m:'wood',  c:0x6b5236},
      {s:'box', d:[2.9,.15,.06],   p:[0,1.08,0], r:[0,0,1],  m:'plank', c:0x8a6b45},
      {s:'box', d:[2.9,.15,.06],   p:[0,.72,0],  r:[0,0,-1], m:'plank', c:0x8a6b45},
      {s:'box', d:[2.9,.15,.06],   p:[0,.36,0],  r:[0,0,1],  m:'plank', c:0x7d6140},
  ]},

  // bebedero de pájaros
  { id:'e_birdbath', name:'BirdBath', mass:75, tags:['garden','stone','water'], parts:[
      {s:'cyl', d:[.3,.34,.12], p:[0,.06,0],  m:'concrete', c:0x9c9a94},
      {s:'cyl', d:[.12,.18,.82],p:[0,.53,0],  m:'concrete', c:0x9c9a94},
      {s:'cyl', d:[.44,.3,.16], p:[0,1.02,0], m:'concrete', c:0xa8a6a0},
      {s:'cyl', d:[.38,.03],    p:[0,1.07,0], m:'glass',    c:0x5a9ec4, nc:1},
  ]},

  /* ---------------- camping ---------------- */

  // mesa de picnic (tabla 0.74 m, banco 0.45 m)
  { id:'e_picnic', name:'PicnicTable', mass:70, tags:['table','picnic','wood'], parts:[
      {s:'box', d:[1.9,.08,.82], p:[0,.74,0],  m:'plank', c:0x9c7a4e},
      {s:'box', d:[1.9,.06,.3],  p:[0,.45,-.72],m:'plank',c:0x9c7a4e},
      {s:'box', d:[1.9,.06,.3],  p:[0,.45,.72], m:'plank',c:0x9c7a4e},
      {s:'box', d:[.1,.98,.14],  p:[-.62,.45,-.4],r:[-24,0,0],m:'wood', c:0x6b5236},
      {s:'box', d:[.1,.98,.14],  p:[-.62,.45,.4], r:[24,0,0], m:'wood', c:0x6b5236},
      {s:'box', d:[.1,.98,.14],  p:[.62,.45,-.4], r:[-24,0,0],m:'wood', c:0x6b5236},
      {s:'box', d:[.1,.98,.14],  p:[.62,.45,.4],  r:[24,0,0], m:'wood', c:0x6b5236},
  ]},

  // fogón: círculo de piedras + leños cruzados + llama
  { id:'e_campfire', name:'Campfire', mass:140, tags:['fire','camp','stone'], parts:[
      {s:'box', d:[.34,.2,.26], p:[.62,.1,0],   r:[0,15,0], m:'concrete', c:0x7d7a73},
      {s:'box', d:[.32,.2,.26], p:[-.62,.1,0],  r:[0,-20,0],m:'concrete', c:0x74716b},
      {s:'box', d:[.3,.2,.26],  p:[0,.1,.6],    r:[0,80,0], m:'concrete', c:0x807d77},
      {s:'box', d:[.3,.19,.25], p:[0,.1,-.6],   r:[0,100,0],m:'concrete', c:0x74716b},
      {s:'box', d:[.3,.18,.24], p:[.44,.09,.44],r:[0,45,0], m:'concrete', c:0x807d77, nc:1},
      {s:'box', d:[.95,.16,.16],p:[0,.11,-.05], r:[0,22,6], m:'wood', c:0x6b5236},
      {s:'box', d:[.9,.15,.15], p:[0,.24,.03],  r:[0,-30,-5],m:'wood',c:0x5c4530},
      {s:'cone',d:[.24,.6],     p:[0,.42,0],    m:'neon', c:0xff8a1f, nc:1},
  ]},

  // carpa de dos aguas, 1.25 m de cumbrera
  { id:'e_tent', name:'Tent01', mass:20, col:'box', tags:['tent','camp','fabric'], parts:[
      {s:'box', d:[2.5,.1,2.1],  p:[0,.05,0],   m:'fabric', c:0x2e3a28},
      {s:'box', d:[2.4,.08,1.55],p:[0,.68,-.53],r:[-52,0,0],m:'fabric', c:0x4a7a3e},
      {s:'box', d:[2.4,.08,1.55],p:[0,.68,.53], r:[52,0,0], m:'fabric', c:0x4a7a3e},
      {s:'box', d:[.08,1.05,1.4],p:[-1.2,.55,0],m:'fabric', c:0x3f6b35},
      {s:'box', d:[.08,.95,1.2], p:[1.2,.5,0],  m:'fabric', c:0x35592c, nc:1},
      {s:'box', d:[2.6,.06,.06], p:[0,1.24,0],  m:'wood',   c:0x6b5236, nc:1},
  ]},

  /* ---------------- agua ---------------- */

  // canoa de 4.5 m: casco en segmentos + proa y popa cónicas
  { id:'e_canoe', name:'Canoe', mass:48, tags:['boat','canoe','water'], parts:[
      {s:'cyl', d:[.42,1.0],     p:[-1.0,.46,0],r:[0,0,90], m:'plank', c:0x9c6b3f},
      {s:'cyl', d:[.42,1.0],     p:[0,.46,0],   r:[0,0,90], m:'plank', c:0x9c6b3f},
      {s:'cyl', d:[.42,1.0],     p:[1.0,.46,0], r:[0,0,90], m:'plank', c:0x9c6b3f},
      {s:'cyl', d:[.08,.42,.75], p:[1.87,.46,0],r:[0,0,-90],m:'plank', c:0x93643a},
      {s:'cyl', d:[.08,.42,.75], p:[-1.87,.46,0],r:[0,0,90],m:'plank', c:0x93643a},
      {s:'box', d:[2.9,.06,.52], p:[0,.72,0],   m:'plank', c:0x3f2d1d, nc:1},
      {s:'box', d:[.16,.05,.8],  p:[.5,.7,0],   m:'wood',  c:0x7a5a38, nc:1},
  ]},

  // boya de canal con luz
  { id:'e_buoy', name:'Buoy', mass:85, tags:['buoy','water','marker'], parts:[
      {s:'cyl', d:[.44,.75], p:[0,.375,0], m:'plastic', c:0xd93b2b},
      {s:'cyl', d:[.46,.12], p:[0,.5,0],   m:'plastic', c:0xf0f0f0, nc:1},
      {s:'cone',d:[.42,.55], p:[0,1.02,0], m:'plastic', c:0xd93b2b},
      {s:'cyl', d:[.05,.7],  p:[0,1.6,0],  m:'metal',   c:0x9aa0a6},
      {s:'cyl', d:[.16,.28], p:[0,1.72,0], m:'metal',   c:0x9aa0a6, nc:1},
      {s:'sph', d:[.13],     p:[0,2.02,0], m:'neon',    c:0xffd24a, nc:1},
  ]},

  // tabla de muelle: 3 tablones sobre 4 pilotes
  { id:'e_dock', name:'DockPlank', mass:120, tags:['dock','pier','wood'], parts:[
      {s:'box', d:[2.4,.08,.36], p:[0,.5,-.4], m:'plank', c:0x8a7050},
      {s:'box', d:[2.4,.08,.36], p:[0,.5,0],   m:'plank', c:0x94795a},
      {s:'box', d:[2.4,.08,.36], p:[0,.5,.4],  m:'plank', c:0x8a7050},
      {s:'cyl', d:[.11,.46], p:[-1.0,.23,-.42],m:'wood',  c:0x6b5236},
      {s:'cyl', d:[.11,.46], p:[1.0,.23,-.42], m:'wood',  c:0x6b5236},
      {s:'cyl', d:[.11,.46], p:[-1.0,.23,.42], m:'wood',  c:0x6b5236},
      {s:'cyl', d:[.11,.46], p:[1.0,.23,.42],  m:'wood',  c:0x6b5236},
  ]},

  // pozo de agua con techito y balde
  { id:'e_well', name:'Well', mass:1100, tags:['well','stone','water'], parts:[
      {s:'cyl', d:[.85,.95], p:[0,.475,0], m:'brick', c:0x8a8078},
      {s:'cyl', d:[.92,.12], p:[0,.95,0],  m:'brick', c:0x9c9288, nc:1},
      {s:'box', d:[.13,1.15,.13], p:[-.68,1.55,0], m:'wood', c:0x6b5236},
      {s:'box', d:[.13,1.15,.13], p:[.68,1.55,0],  m:'wood', c:0x6b5236},
      {s:'box', d:[1.9,.09,.9], p:[0,2.2,-.34], r:[-32,0,0], m:'plank', c:0x7a4b2a, nc:1},
      {s:'box', d:[1.9,.09,.9], p:[0,2.2,.34],  r:[32,0,0],  m:'plank', c:0x7a4b2a, nc:1},
      {s:'cyl', d:[.17,.24], p:[0,1.6,0], m:'wood', c:0x5c4630, nc:1},
  ]},

]);
