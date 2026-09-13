/* props/interior.js — muebles y objetos de casa. y=0 = piso del objeto, centrado en X/Z. */
HP.section('interior','Interior','acc',[

  // ---------- asientos ----------
  { id:'n_chair_wood', name:'WoodChair', mass:6, tags:['interior','chair','wood'], parts:[
      {s:'box', d:[.05,.45,.05],  p:[-.19,.225,.19], m:'wood'},
      {s:'box', d:[.05,.45,.05],  p:[ .19,.225,.19], m:'wood'},
      {s:'box', d:[.05,1,.05],    p:[-.19,.5,-.19],  m:'wood'},
      {s:'box', d:[.05,1,.05],    p:[ .19,.5,-.19],  m:'wood'},
      {s:'box', d:[.45,.05,.45],  p:[0,.475,0],      m:'wood', c:0xa97b4c},
      {s:'box', d:[.43,.1,.05],   p:[0,.93,-.19],    m:'wood', c:0xa97b4c, nc:1},
      {s:'box', d:[.4,.22,.04],   p:[0,.72,-.19],    m:'wood', c:0xa97b4c, nc:1},
  ]},

  { id:'n_chair_office', name:'OfficeChair', mass:12, tags:['interior','chair','office'], parts:[
      {s:'cyl', d:[.07,.09],      p:[0,.045,0],    m:'plastic', c:0x1d1f24},
      {s:'box', d:[.6,.05,.07],   p:[0,.035,0],    m:'plastic', c:0x1d1f24, nc:1},
      {s:'box', d:[.6,.05,.07],   p:[0,.035,0],    m:'plastic', c:0x1d1f24, r:[0,60,0], nc:1},
      {s:'box', d:[.6,.05,.07],   p:[0,.035,0],    m:'plastic', c:0x1d1f24, r:[0,120,0], nc:1},
      {s:'cyl', d:[.045,.32],     p:[0,.245,0],    m:'chrome'},
      {s:'box', d:[.5,.1,.48],    p:[0,.45,0],     m:'fabric', c:0x2b2f36},
      {s:'box', d:[.46,.58,.08],  p:[0,.79,-.22],  m:'fabric', c:0x2b2f36},
  ]},

  { id:'n_stool', name:'BarStool', mass:5, tags:['interior','stool'], parts:[
      {s:'cyl', d:[.18,.06],      p:[0,.71,0],       m:'wood', c:0x8d6237},
      {s:'cyl', d:[.025,.68],     p:[-.14,.34,-.14], m:'metal'},
      {s:'cyl', d:[.025,.68],     p:[ .14,.34,-.14], m:'metal'},
      {s:'cyl', d:[.025,.68],     p:[-.14,.34, .14], m:'metal'},
      {s:'cyl', d:[.025,.68],     p:[ .14,.34, .14], m:'metal'},
      {s:'box', d:[.32,.03,.04],  p:[0,.24,0],       m:'metal', nc:1},
      {s:'box', d:[.04,.03,.32],  p:[0,.24,0],       m:'metal', nc:1},
  ]},

  { id:'n_sofa2', name:'Sofa2Seat', mass:60, tags:['interior','sofa'], parts:[
      {s:'box', d:[1.65,.4,.85],  p:[0,.2,0],        m:'fabric', c:0x4a5a68},
      {s:'box', d:[1.5,.16,.76],  p:[0,.48,.03],     m:'fabric', c:0x56687a, nc:1},
      {s:'box', d:[1.65,.5,.2],   p:[0,.65,-.32],    m:'fabric', c:0x4a5a68},
      {s:'box', d:[.7,.38,.14],   p:[-.4,.69,-.16],  m:'fabric', c:0x56687a, nc:1},
      {s:'box', d:[.7,.38,.14],   p:[ .4,.69,-.16],  m:'fabric', c:0x56687a, nc:1},
      {s:'box', d:[.16,.28,.85],  p:[-.74,.54,0],    m:'fabric', c:0x4a5a68},
      {s:'box', d:[.16,.28,.85],  p:[ .74,.54,0],    m:'fabric', c:0x4a5a68},
  ]},

  { id:'n_armchair', name:'Armchair', mass:30, tags:['interior','chair','sofa'], parts:[
      {s:'box', d:[.9,.4,.85],    p:[0,.2,0],       m:'fabric', c:0x7a4a3c},
      {s:'box', d:[.72,.15,.75],  p:[0,.475,.03],   m:'fabric', c:0x8c5748, nc:1},
      {s:'box', d:[.9,.5,.18],    p:[0,.65,-.33],   m:'fabric', c:0x7a4a3c},
      {s:'box', d:[.17,.26,.85],  p:[-.365,.53,0],  m:'fabric', c:0x7a4a3c},
      {s:'box', d:[.17,.26,.85],  p:[ .365,.53,0],  m:'fabric', c:0x7a4a3c},
  ]},

  // ---------- mesas ----------
  { id:'n_table_dining', name:'DiningTable', mass:34, tags:['interior','table'], parts:[
      {s:'box', d:[1.6,.06,.9],   p:[0,.72,0],        m:'wood', c:0x9c6f42},
      {s:'box', d:[.09,.69,.09],  p:[-.7,.345,-.37],  m:'wood'},
      {s:'box', d:[.09,.69,.09],  p:[ .7,.345,-.37],  m:'wood'},
      {s:'box', d:[.09,.69,.09],  p:[-.7,.345, .37],  m:'wood'},
      {s:'box', d:[.09,.69,.09],  p:[ .7,.345, .37],  m:'wood'},
      {s:'box', d:[1.4,.08,.05],  p:[0,.63,-.4],      m:'wood', nc:1},
      {s:'box', d:[1.4,.08,.05],  p:[0,.63, .4],      m:'wood', nc:1},
  ]},

  { id:'n_table_coffee', name:'CoffeeTable', mass:14, tags:['interior','table'], parts:[
      {s:'box', d:[1.1,.05,.6],   p:[0,.42,0],       m:'wood', c:0x8a5f3a},
      {s:'box', d:[.07,.4,.07],   p:[-.48,.2,-.24],  m:'wood'},
      {s:'box', d:[.07,.4,.07],   p:[ .48,.2,-.24],  m:'wood'},
      {s:'box', d:[.07,.4,.07],   p:[-.48,.2, .24],  m:'wood'},
      {s:'box', d:[.07,.4,.07],   p:[ .48,.2, .24],  m:'wood'},
      {s:'box', d:[.95,.03,.45],  p:[0,.15,0],       m:'wood', nc:1},
  ]},

  { id:'n_desk', name:'Desk01', mass:45, tags:['interior','table','office'], parts:[
      {s:'box', d:[1.5,.05,.7],   p:[0,.72,0],       m:'wood', c:0x6f4a2c},
      {s:'box', d:[.42,.69,.62],  p:[-.5,.345,0],    m:'wood'},
      {s:'box', d:[.06,.69,.06],  p:[ .7,.345,-.3],  m:'wood'},
      {s:'box', d:[.06,.69,.06],  p:[ .7,.345, .3],  m:'wood'},
      {s:'box', d:[.4,.2,.03],    p:[-.5,.58,.32],   m:'plank', c:0x8a6a44, nc:1},
      {s:'box', d:[.4,.2,.03],    p:[-.5,.32,.32],   m:'plank', c:0x8a6a44, nc:1},
      {s:'box', d:[.85,.32,.03],  p:[.25,.52,-.33],  m:'wood', nc:1},
  ]},

  // ---------- dormitorio ----------
  { id:'n_bed_single', name:'SingleBed', mass:48, tags:['interior','bed'], parts:[
      {s:'box', d:[1,.3,2],       p:[0,.15,0],        m:'wood', c:0x7a5433},
      {s:'box', d:[.92,.2,1.9],   p:[0,.4,0],         m:'fabric', c:0xd8d2c4},
      {s:'box', d:[.5,.12,.32],   p:[0,.56,-.75],     m:'fabric', c:0xf0ece0, nc:1},
      {s:'box', d:[.94,.07,1.2],  p:[0,.535,.3],      m:'fabric', c:0x3f5a74, nc:1},
      {s:'box', d:[1,.9,.06],     p:[0,.45,-1.03],    m:'wood', c:0x7a5433},
  ]},

  { id:'n_wardrobe', name:'Wardrobe', mass:90, tags:['interior','storage'], parts:[
      {s:'box', d:[1.14,.09,.56], p:[0,.045,0],       m:'wood', c:0x5f4529},
      {s:'box', d:[1.2,2,.6],     p:[0,1.09,0],       m:'wood', c:0x7d5a36},
      {s:'box', d:[.57,1.9,.04],  p:[-.295,1.09,.31], m:'plank', c:0x93693e, nc:1},
      {s:'box', d:[.57,1.9,.04],  p:[ .295,1.09,.31], m:'plank', c:0x93693e, nc:1},
      {s:'cyl', d:[.02,.2],       p:[-.04,1.05,.34],  m:'chrome', nc:1},
      {s:'cyl', d:[.02,.2],       p:[ .04,1.05,.34],  m:'chrome', nc:1},
  ]},

  { id:'n_dresser', name:'Dresser', mass:50, tags:['interior','storage'], parts:[
      {s:'box', d:[.84,.06,.4],   p:[0,.03,0],      m:'wood', c:0x5f4529},
      {s:'box', d:[.9,.82,.45],   p:[0,.44,0],      m:'wood', c:0x7d5a36},
      {s:'box', d:[.82,.23,.03],  p:[0,.2,.235],    m:'plank', c:0x93693e, nc:1},
      {s:'box', d:[.82,.23,.03],  p:[0,.46,.235],   m:'plank', c:0x93693e, nc:1},
      {s:'box', d:[.82,.23,.03],  p:[0,.72,.235],   m:'plank', c:0x93693e, nc:1},
      {s:'box', d:[.18,.03,.04],  p:[0,.2,.26],     m:'chrome', nc:1},
      {s:'box', d:[.18,.03,.04],  p:[0,.46,.26],    m:'chrome', nc:1},
      {s:'box', d:[.18,.03,.04],  p:[0,.72,.26],    m:'chrome', nc:1},
  ]},

  { id:'n_bookshelf', name:'Bookshelf', mass:48, tags:['interior','storage'], parts:[
      {s:'box', d:[.04,1.9,.3],   p:[-.38,.95,0],   m:'wood', c:0x6b4a2b},
      {s:'box', d:[.04,1.9,.3],   p:[ .38,.95,0],   m:'wood', c:0x6b4a2b},
      {s:'box', d:[.72,.03,.3],   p:[0,.05,0],      m:'wood', c:0x8a6238},
      {s:'box', d:[.72,.03,.3],   p:[0,.66,0],      m:'wood', c:0x8a6238},
      {s:'box', d:[.72,.03,.3],   p:[0,1.27,0],     m:'wood', c:0x8a6238},
      {s:'box', d:[.72,.03,.3],   p:[0,1.88,0],     m:'wood', c:0x8a6238},
      {s:'box', d:[.46,.26,.22],  p:[-.12,.81,.01], m:'plank', c:0x9c3b32, nc:1},
      {s:'box', d:[.3,.24,.2],    p:[ .2,1.41,.01], m:'plank', c:0x2f5c86, nc:1},
  ]},

  // ---------- electro / cocina ----------
  { id:'n_tv_flat', name:'TvFlat55', mass:16, tags:['interior','tv','screen'], parts:[
      {s:'box', d:[.5,.03,.28],   p:[0,.015,0],     m:'metal', c:0x2a2c31},
      {s:'box', d:[.12,.2,.06],   p:[0,.13,0],      m:'metal', c:0x2a2c31},
      {s:'box', d:[1.24,.72,.05], p:[0,.59,0],      m:'plastic', c:0x1b1d21},
      {s:'box', d:[1.18,.66,.01], p:[0,.59,.033],   m:'glass', c:0x0d1014, nc:1},
  ]},

  { id:'n_fridge', name:'Fridge01', mass:80, tags:['interior','kitchen'], parts:[
      {s:'box', d:[.7,1.8,.68],   p:[0,.9,0],       m:'metal', c:0xd6d9dd},
      {s:'box', d:[.68,.56,.04],  p:[0,1.5,.36],    m:'paint', c:0xe7eaee, nc:1},
      {s:'box', d:[.68,1.18,.04], p:[0,.6,.36],     m:'paint', c:0xe7eaee, nc:1},
      {s:'cyl', d:[.02,.28],      p:[.27,1.5,.4],   m:'chrome', nc:1},
      {s:'cyl', d:[.02,.5],       p:[.27,.75,.4],   m:'chrome', nc:1},
  ]},

  { id:'n_stove', name:'StoveOven', mass:65, tags:['interior','kitchen'], parts:[
      {s:'box', d:[.6,.85,.6],    p:[0,.425,0],       m:'metal', c:0xc9ccd1},
      {s:'box', d:[.62,.04,.62],  p:[0,.87,0],        m:'steel', c:0x3a3d43},
      {s:'cyl', d:[.08,.02],      p:[-.15,.9,-.15],   m:'steel', c:0x14161a, nc:1},
      {s:'cyl', d:[.08,.02],      p:[ .15,.9,-.15],   m:'steel', c:0x14161a, nc:1},
      {s:'cyl', d:[.08,.02],      p:[-.15,.9, .15],   m:'steel', c:0x14161a, nc:1},
      {s:'cyl', d:[.08,.02],      p:[ .15,.9, .15],   m:'steel', c:0x14161a, nc:1},
      {s:'box', d:[.55,.45,.03],  p:[0,.4,.31],       m:'steel', c:0x2c2f34, nc:1},
      {s:'box', d:[.5,.04,.05],   p:[0,.65,.33],      m:'steel', nc:1},
  ]},

  { id:'n_microwave', name:'Microwave', mass:14, tags:['interior','kitchen'], parts:[
      {s:'box', d:[.5,.3,.38],    p:[0,.15,0],        m:'metal', c:0xb9bcc1},
      {s:'box', d:[.32,.22,.02],  p:[-.08,.16,.19],   m:'glass', c:0x14181c, nc:1},
      {s:'box', d:[.11,.24,.02],  p:[.19,.15,.19],    m:'plastic', c:0x2a2d33, nc:1},
      {s:'box', d:[.03,.22,.04],  p:[-.245,.16,.2],   m:'plastic', c:0x2a2d33, nc:1},
  ]},

  { id:'n_water_cooler', name:'WaterCooler', mass:22, tags:['interior','kitchen'], parts:[
      {s:'box', d:[.34,.95,.34],  p:[0,.475,0],      m:'plastic', c:0xe2e6ea},
      {s:'cyl', d:[.06,.09],      p:[0,.955,0],      m:'glass', c:0x8fd6e8, nc:1},
      {s:'cyl', d:[.16,.45],      p:[0,1.2,0],       m:'glass', c:0x8fd6e8, nc:1},
      {s:'box', d:[.05,.12,.06],  p:[-.08,.62,.18],  m:'plastic', c:0x2f6fa8, nc:1},
      {s:'box', d:[.05,.12,.06],  p:[ .08,.62,.18],  m:'plastic', c:0xa83030, nc:1},
      {s:'box', d:[.22,.03,.12],  p:[0,.5,.19],      m:'plastic', c:0x9aa0a6, nc:1},
  ]},

  // ---------- baño ----------
  { id:'n_sink', name:'Sink01', mass:25, tags:['interior','bath'], parts:[
      {s:'box', d:[.26,.66,.26],  p:[0,.33,0],       m:'tile', c:0xeceff2},
      {s:'box', d:[.56,.16,.44],  p:[0,.74,0],       m:'tile', c:0xf2f4f6},
      {s:'cyl', d:[.022,.24],     p:[0,.94,-.16],    m:'chrome', nc:1},
      {s:'box', d:[.03,.03,.16],  p:[0,1.04,-.09],   m:'chrome', nc:1},
  ]},

  { id:'n_toilet', name:'Toilet01', mass:32, tags:['interior','bath'], parts:[
      {s:'box', d:[.3,.38,.5],    p:[0,.19,.05],     m:'tile', c:0xeceff2},
      {s:'cyl', d:[.19,.18],      p:[0,.44,.08],     m:'tile', c:0xf2f4f6},
      {s:'cyl', d:[.2,.04],       p:[0,.55,.08],     m:'plastic', c:0xf7f8f9, nc:1},
      {s:'box', d:[.38,.5,.2],    p:[0,.55,-.25],    m:'tile', c:0xeceff2},
      {s:'box', d:[.4,.04,.22],   p:[0,.82,-.25],    m:'tile', c:0xf2f4f6, nc:1},
      {s:'cyl', d:[.03,.02],      p:[0,.85,-.25],    m:'chrome', nc:1},
  ]},

  { id:'n_bathtub', name:'Bathtub', mass:85, tags:['interior','bath'], parts:[
      {s:'box', d:[1.7,.12,.75],  p:[0,.06,0],       m:'tile', c:0xf0f2f4},
      {s:'box', d:[1.7,.5,.08],   p:[0,.31,-.335],   m:'tile', c:0xf0f2f4},
      {s:'box', d:[1.7,.5,.08],   p:[0,.31, .335],   m:'tile', c:0xf0f2f4},
      {s:'box', d:[.08,.5,.75],   p:[-.81,.31,0],    m:'tile', c:0xf0f2f4},
      {s:'box', d:[.08,.5,.75],   p:[ .81,.31,0],    m:'tile', c:0xf0f2f4},
      {s:'cyl', d:[.025,.18],     p:[-.7,.65,0],     m:'chrome', nc:1},
      {s:'box', d:[.14,.035,.035],p:[-.6,.72,0],     m:'chrome', nc:1},
  ]},

  { id:'n_mirror', name:'MirrorTall', mass:22, col:'box', tags:['interior','glass'], parts:[
      {s:'box', d:[.62,1.74,.05], p:[0,.87,0],       m:'wood', c:0x6b4a2b},
      {s:'box', d:[.5,1.6,.02],   p:[0,.9,.035],     m:'glass', c:0xcfe0e8, nc:1},
      {s:'box', d:[.3,.06,.4],    p:[0,.03,.15],     m:'wood', c:0x6b4a2b},
      {s:'box', d:[.06,.8,.34],   p:[0,.45,-.18],    m:'wood', r:[-15,0,0], nc:1},
  ]},

  // ---------- luz, clima, deco ----------
  { id:'n_lamp_floor', name:'FloorLamp', mass:8, tags:['interior','light'], parts:[
      {s:'cyl', d:[.19,.04],      p:[0,.02,0],       m:'metal', c:0x3a3d43},
      {s:'cyl', d:[.025,1.5],     p:[0,.79,0],       m:'metal', c:0x3a3d43},
      {s:'cyl', d:[.23,.17,.34],  p:[0,1.72,0],      m:'fabric', c:0xe8dcc0},
      {s:'sph', d:[.05],          p:[0,1.66,0],      m:'neon', c:0xfff2c8, nc:1},
  ]},

  { id:'n_lamp_table', name:'TableLamp', mass:2.5, tags:['interior','light'], parts:[
      {s:'cyl', d:[.11,.03],      p:[0,.015,0],      m:'wood', c:0x5f4529},
      {s:'cyl', d:[.022,.28],     p:[0,.17,0],       m:'wood', c:0x5f4529},
      {s:'cyl', d:[.15,.1,.2],    p:[0,.42,0],       m:'fabric', c:0xf0e4c6},
      {s:'sph', d:[.04],          p:[0,.38,0],       m:'neon', c:0xfff2c8, nc:1},
  ]},

  { id:'n_fan_stand', name:'StandFan', mass:6, tags:['interior','fan'], parts:[
      {s:'cyl', d:[.2,.05],       p:[0,.025,0],      m:'plastic', c:0xd8dade},
      {s:'cyl', d:[.03,1.05],     p:[0,.55,0],       m:'metal', c:0xb0b4b9},
      {s:'cyl', d:[.06,.14],      p:[0,1.18,-.03],   m:'plastic', c:0xd8dade, r:[90,0,0]},
      {s:'cyl', d:[.23,.1],       p:[0,1.18,.07],    m:'metal', c:0xa8acb2, r:[90,0,0], nc:1},
      {s:'box', d:[.4,.11,.02],   p:[0,1.18,.05],    m:'plastic', c:0xeceef1, nc:1},
      {s:'box', d:[.4,.11,.02],   p:[0,1.18,.05],    m:'plastic', c:0xeceef1, r:[0,0,60], nc:1},
      {s:'box', d:[.4,.11,.02],   p:[0,1.18,.05],    m:'plastic', c:0xeceef1, r:[0,0,120], nc:1},
  ]},

  { id:'n_radiator', name:'Radiator', mass:35, tags:['interior','heat'], parts:[
      {s:'box', d:[.9,.07,.09],   p:[0,.16,0],       m:'steel', c:0xe4e6e9},
      {s:'box', d:[.9,.07,.09],   p:[0,.66,0],       m:'steel', c:0xe4e6e9},
      {s:'cyl', d:[.045,.45],     p:[-.36,.41,0],    m:'steel', c:0xe4e6e9, nc:1},
      {s:'cyl', d:[.045,.45],     p:[-.12,.41,0],    m:'steel', c:0xe4e6e9, nc:1},
      {s:'cyl', d:[.045,.45],     p:[ .12,.41,0],    m:'steel', c:0xe4e6e9, nc:1},
      {s:'cyl', d:[.045,.45],     p:[ .36,.41,0],    m:'steel', c:0xe4e6e9, nc:1},
      {s:'box', d:[.07,.13,.1],   p:[-.36,.065,0],   m:'steel', c:0xbfc3c8},
      {s:'box', d:[.07,.13,.1],   p:[ .36,.065,0],   m:'steel', c:0xbfc3c8},
  ]},

  { id:'n_rug', name:'Rug01', mass:9, tags:['interior','fabric'], parts:[
      {s:'box', d:[2.4,.025,1.6], p:[0,.0125,0],     m:'fabric', c:0x8a3a3a},
      {s:'box', d:[2.4,.03,.12],  p:[0,.015,-.74],   m:'fabric', c:0xd8c48a, nc:1},
      {s:'box', d:[2.4,.03,.12],  p:[0,.015, .74],   m:'fabric', c:0xd8c48a, nc:1},
      {s:'box', d:[.12,.03,1.6],  p:[-1.14,.015,0],  m:'fabric', c:0xd8c48a, nc:1},
      {s:'box', d:[.12,.03,1.6],  p:[ 1.14,.015,0],  m:'fabric', c:0xd8c48a, nc:1},
  ]},

  { id:'n_art_frame', name:'FramedArt', mass:5, col:'box', tags:['interior','deco'], parts:[
      {s:'box', d:[.9,.06,.05],   p:[0,.03,0],       m:'wood', c:0x5a3f24},
      {s:'box', d:[.9,.06,.05],   p:[0,.69,0],       m:'wood', c:0x5a3f24},
      {s:'box', d:[.06,.72,.05],  p:[-.42,.36,0],    m:'wood', c:0x5a3f24},
      {s:'box', d:[.06,.72,.05],  p:[ .42,.36,0],    m:'wood', c:0x5a3f24},
      {s:'box', d:[.8,.6,.02],    p:[0,.36,0],       m:'fabric', c:0x486a86, nc:1},
  ]},

  { id:'n_clock_wall', name:'WallClock', mass:2, tags:['interior','deco'], parts:[
      {s:'cyl', d:[.18,.06],      p:[0,.18,0],       m:'plastic', c:0x2b2e33, r:[90,0,0]},
      {s:'cyl', d:[.16,.01],      p:[0,.18,.035],    m:'glass', c:0xf4f6f8, r:[90,0,0], nc:1},
      {s:'box', d:[.02,.13,.012], p:[0,.215,.045],   m:'plastic', c:0x14161a, nc:1},
      {s:'box', d:[.1,.02,.012],  p:[.035,.18,.045], m:'plastic', c:0x14161a, nc:1},
  ]},

  { id:'n_plant_pot', name:'PottedPlant', mass:14, tags:['interior','plant'], parts:[
      {s:'cyl', d:[.22,.16,.4],   p:[0,.2,0],        m:'tile', c:0xb2603a},
      {s:'cyl', d:[.035,.55],     p:[0,.66,0],       m:'wood', c:0x6b4a2b},
      {s:'sph', d:[.3],           p:[0,1.1,0],       m:'grass', c:0x3f7a34},
      {s:'sph', d:[.19],          p:[.18,.9,.08],    m:'grass', c:0x4a8c3c, nc:1},
      {s:'sph', d:[.17],          p:[-.16,.95,-.1],  m:'grass', c:0x35682c, nc:1},
  ]},

  { id:'n_safe', name:'Safe01', mass:240, tags:['interior','metal','storage'], parts:[
      {s:'box', d:[.6,.7,.55],    p:[0,.35,0],       m:'steel', c:0x33363c},
      {s:'box', d:[.54,.62,.03],  p:[0,.35,.28],     m:'steel', c:0x43474e, nc:1},
      {s:'cyl', d:[.07,.04],      p:[-.08,.4,.31],   m:'chrome', r:[90,0,0], nc:1},
      {s:'box', d:[.05,.26,.05],  p:[.16,.35,.31],   m:'chrome', nc:1},
  ]},

  { id:'n_pc_desk', name:'PcDesktop', mass:11, tags:['interior','office','pc'], parts:[
      {s:'box', d:[.2,.45,.45],   p:[-.5,.225,0],    m:'metal', c:0x2e3136},
      {s:'box', d:[.24,.02,.18],  p:[.25,.01,0],     m:'plastic', c:0x22252a, nc:1},
      {s:'box', d:[.06,.14,.05],  p:[.25,.08,0],     m:'plastic', c:0x22252a, nc:1},
      {s:'box', d:[.56,.34,.04],  p:[.25,.32,0],     m:'plastic', c:0x22252a},
      {s:'box', d:[.52,.3,.01],   p:[.25,.32,.026],  m:'glass', c:0x0e1116, nc:1},
      {s:'box', d:[.44,.02,.15],  p:[.25,.01,.24],   m:'plastic', c:0x2a2d33, nc:1},
  ]},

  { id:'n_coat_rack', name:'CoatRack', mass:8, tags:['interior','deco'], parts:[
      {s:'cyl', d:[.24,.05],      p:[0,.025,0],      m:'wood', c:0x5f4529},
      {s:'cyl', d:[.045,1.7],     p:[0,.9,0],        m:'wood', c:0x7d5a36},
      {s:'box', d:[.3,.05,.05],   p:[0,1.6,0],       m:'wood', c:0x7d5a36, nc:1},
      {s:'box', d:[.05,.05,.3],   p:[0,1.6,0],       m:'wood', c:0x7d5a36, nc:1},
      {s:'box', d:[.3,.05,.05],   p:[0,1.4,0],       m:'wood', c:0x7d5a36, r:[0,45,0], nc:1},
      {s:'box', d:[.3,.05,.05],   p:[0,1.4,0],       m:'wood', c:0x7d5a36, r:[0,-45,0], nc:1},
      {s:'sph', d:[.06],          p:[0,1.78,0],      m:'wood', c:0x7d5a36, nc:1},
  ]},

]);
