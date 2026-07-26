/* props/road.js — calle y ciudad. 26 props. y=0 = base, centrado en X/Z. */
HP.section('road','Road','acc',[

  // ---------- calzada ----------
  // losa recta de 8 x 6 m: doble mano con línea central discontinua
  { id:'r_road_str', name:'RoadSlab', mass:3000, col:'box', tags:['road','asphalt','slab'], parts:[
      {s:'box', d:[8,.2,6],      p:[0,.1,0],      m:'asphalt', c:0x3a3d42},
      {s:'box', d:[1.2,.03,.16], p:[-2.4,.205,0], m:'paint', c:0xe6e6dc, nc:1},
      {s:'box', d:[1.2,.03,.16], p:[0,.205,0],    m:'paint', c:0xe6e6dc, nc:1},
      {s:'box', d:[1.2,.03,.16], p:[2.4,.205,0],  m:'paint', c:0xe6e6dc, nc:1},
      {s:'box', d:[8,.03,.14],   p:[0,.205,2.82], m:'paint', c:0xe6e6dc, nc:1},
      {s:'box', d:[8,.03,.14],   p:[0,.205,-2.82],m:'paint', c:0xe6e6dc, nc:1},
  ]},

  // losa en curva: tres tramos de 30° sobre un arco de radio 7 m (giro de 90°)
  { id:'r_road_crv', name:'RoadCurve', mass:3000, tags:['road','asphalt','curve'], parts:[
      {s:'box', d:[6,.2,3.7],   p:[1.76,.1,-3.19],  r:[0,-15,0], m:'asphalt', c:0x3a3d42},
      {s:'box', d:[6,.2,3.7],   p:[-.05,.1,-.05],   r:[0,-45,0], m:'asphalt', c:0x3a3d42},
      {s:'box', d:[6,.2,3.7],   p:[-3.19,.1,1.76],  r:[0,-75,0], m:'asphalt', c:0x3a3d42},
      {s:'box', d:[.16,.03,1.5],p:[1.76,.205,-3.19],r:[0,-15,0], m:'paint', c:0xe6e6dc, nc:1},
      {s:'box', d:[.16,.03,1.5],p:[-.05,.205,-.05], r:[0,-45,0], m:'paint', c:0xe6e6dc, nc:1},
      {s:'box', d:[.16,.03,1.5],p:[-3.19,.205,1.76],r:[0,-75,0], m:'paint', c:0xe6e6dc, nc:1},
  ]},

  // vereda de baldosas con cordón integrado al frente
  { id:'r_sidewalk', name:'Sidewalk01', mass:2800, tags:['road','curb','pavement'], parts:[
      {s:'box', d:[3,.16,2],   p:[0,.08,0],    m:'concrete', c:0x9c9c96},
      {s:'box', d:[3,.3,.3],   p:[0,.15,1.15], m:'concrete', c:0xc0c0b8},
      {s:'box', d:[.05,.02,2], p:[-1,.16,0],   m:'concrete', c:0x6e6e69, nc:1},
      {s:'box', d:[.05,.02,2], p:[1,.16,0],    m:'concrete', c:0x6e6e69, nc:1},
      {s:'box', d:[3,.02,.05], p:[0,.16,-.5],  m:'concrete', c:0x6e6e69, nc:1},
  ]},

  // senda peatonal: losa con cinco franjas finas nc:1
  { id:'r_crosswalk', name:'Crosswalk', mass:3000, col:'box', tags:['road','zebra','paint'], parts:[
      {s:'box', d:[4,.14,3],    p:[0,.07,0],     m:'asphalt', c:0x383b40},
      {s:'box', d:[.45,.03,2.6],p:[-1.6,.145,0], m:'paint', c:0xf0f0e6, nc:1},
      {s:'box', d:[.45,.03,2.6],p:[-.8,.145,0],  m:'paint', c:0xf0f0e6, nc:1},
      {s:'box', d:[.45,.03,2.6],p:[0,.145,0],    m:'paint', c:0xf0f0e6, nc:1},
      {s:'box', d:[.45,.03,2.6],p:[.8,.145,0],   m:'paint', c:0xf0f0e6, nc:1},
      {s:'box', d:[.45,.03,2.6],p:[1.6,.145,0],  m:'paint', c:0xf0f0e6, nc:1},
  ]},

  // ---------- señalización ----------
  // semáforo de pedestal, 4 m: cabezal con tres lentes
  { id:'r_light', name:'TrafficLight', mass:95, tags:['road','signal','light'], parts:[
      {s:'cyl', d:[.19,.14],   p:[0,.07,0],    m:'concrete', c:0x8a8a86},
      {s:'cyl', d:[.075,3.5],  p:[0,1.75,0],   m:'metal', c:0x2e3238},
      {s:'box', d:[.34,1,.28], p:[0,3.55,0],   m:'metal', c:0x2b2f34},
      {s:'cyl', d:[.1,.07], r:[90,0,0], p:[0,3.88,.16], m:'plastic', c:0xe02b1e, nc:1},
      {s:'cyl', d:[.1,.07], r:[90,0,0], p:[0,3.55,.16], m:'plastic', c:0xf0a81e, nc:1},
      {s:'cyl', d:[.1,.07], r:[90,0,0], p:[0,3.22,.16], m:'plastic', c:0x2ecc55, nc:1},
  ]},

  // farol de calle de 7.7 m con brazo lateral
  { id:'r_lamp', name:'StreetLamp', mass:210, tags:['road','light','pole'], parts:[
      {s:'cyl', d:[.22,.3],    p:[0,.15,0],    m:'concrete', c:0x8f8f8a},
      {s:'cyl', d:[.095,7.6],  p:[0,3.9,0],    m:'metal', c:0x3b4046},
      {s:'box', d:[1.7,.13,.13],p:[.8,7.68,0], m:'metal', c:0x3b4046},
      {s:'box', d:[.72,.18,.34],p:[1.5,7.55,0],m:'metal', c:0x4a5058},
      {s:'box', d:[.6,.07,.26], p:[1.5,7.43,0],m:'neon', c:0xffe9b0, nc:1},
  ]},

  // poste de luz doble (avenida / autopista)
  { id:'r_twinlamp', name:'TwinLamp', mass:340, tags:['road','light','pole','double'], parts:[
      {s:'cyl', d:[.28,.34],    p:[0,.17,0],      m:'concrete', c:0x8f8f8a},
      {s:'cyl', d:[.12,8],      p:[0,4.1,0],      m:'metal', c:0x40454b},
      {s:'box', d:[3.4,.14,.14],p:[0,8.1,0],      m:'metal', c:0x40454b},
      {s:'box', d:[.7,.18,.32], p:[-1.55,7.95,0], m:'metal', c:0x4a5058},
      {s:'box', d:[.7,.18,.32], p:[1.55,7.95,0],  m:'metal', c:0x4a5058},
      {s:'box', d:[.58,.07,.24],p:[-1.55,7.83,0], m:'neon', c:0xffeab4, nc:1},
      {s:'box', d:[.58,.07,.24],p:[1.55,7.83,0],  m:'neon', c:0xffeab4, nc:1},
  ]},

  // cartel de PARE: octógono rojo (dos cajas cruzadas) con borde blanco atrás
  { id:'r_stop', name:'StopSign', mass:20, tags:['road','sign','stop'], parts:[
      {s:'cyl', d:[.13,.1],    p:[0,.05,0],   m:'metal', c:0x55595e},
      {s:'cyl', d:[.045,2.35], p:[0,1.17,0],  m:'metal', c:0x6b7076},
      {s:'box', d:[.82,.82,.03],p:[0,2.05,-.02],             m:'paint', c:0xf2f2ee, nc:1},
      {s:'box', d:[.82,.82,.03],p:[0,2.05,-.02],r:[0,0,45],  m:'paint', c:0xf2f2ee, nc:1},
      {s:'box', d:[.72,.72,.04],p:[0,2.05,.01],              m:'paint', c:0xc4231c},
      {s:'box', d:[.72,.72,.04],p:[0,2.05,.01], r:[0,0,45],  m:'paint', c:0xc4231c, nc:1},
  ]},

  // cartel circular de velocidad: disco rojo + centro blanco
  { id:'r_speed', name:'SpeedSign', mass:16, tags:['road','sign','speed'], parts:[
      {s:'cyl', d:[.12,.1],   p:[0,.05,0],  m:'metal', c:0x55595e},
      {s:'cyl', d:[.045,2.3], p:[0,1.15,0], m:'metal', c:0x6b7076},
      {s:'cyl', d:[.36,.05], r:[90,0,0], p:[0,2.2,0],  m:'paint', c:0xcc2118},
      {s:'cyl', d:[.29,.06], r:[90,0,0], p:[0,2.2,.02],m:'paint', c:0xf4f4f0, nc:1},
  ]},

  // ---------- mobiliario urbano ----------
  // parada de colectivo: cuatro parantes, techo, vidrios y banco volado
  { id:'r_busstop', name:'BusStop', mass:400, tags:['road','shelter','bus'], parts:[
      {s:'box', d:[.11,2.35,.11],p:[-1.6,1.175,-.62], m:'metal', c:0x33383e},
      {s:'box', d:[.11,2.35,.11],p:[1.6,1.175,-.62],  m:'metal', c:0x33383e},
      {s:'box', d:[.11,2.35,.11],p:[-1.6,1.175,.58],  m:'metal', c:0x33383e},
      {s:'box', d:[.11,2.35,.11],p:[1.6,1.175,.58],   m:'metal', c:0x33383e},
      {s:'box', d:[3.1,1.9,.05], p:[0,1.3,-.62],      m:'glass', c:0xaad2dc, nc:1},
      {s:'box', d:[.05,1.9,1.2], p:[-1.6,1.3,-.02],   m:'glass', c:0xaad2dc, nc:1},
      {s:'box', d:[3.5,.14,1.6], p:[0,2.42,-.1],      m:'metal', c:0x3e444a},
      {s:'box', d:[2.6,.09,.42], p:[0,.45,-.45],      m:'metal', c:0x5a6068},
  ]},

  // banco de plaza: asiento a 0.47 m, tablas de madera y patas de fundición
  { id:'r_bench', name:'ParkBench', mass:65, tags:['road','seat','park'], parts:[
      {s:'box', d:[.09,.46,.52], p:[-.82,.23,.04],  m:'metal', c:0x2c3036},
      {s:'box', d:[.09,.46,.52], p:[.82,.23,.04],   m:'metal', c:0x2c3036},
      {s:'box', d:[.08,.95,.09], p:[-.82,.475,-.2], r:[8,0,0], m:'metal', c:0x2c3036},
      {s:'box', d:[.08,.95,.09], p:[.82,.475,-.2],  r:[8,0,0], m:'metal', c:0x2c3036},
      {s:'box', d:[1.78,.07,.5], p:[0,.47,.03],     m:'plank', c:0x7a5433},
      {s:'box', d:[1.78,.44,.07],p:[0,.75,-.24],    m:'plank', c:0x7a5433},
  ]},

  // cesto de basura de calle
  { id:'r_trash', name:'TrashCan', mass:22, tags:['road','bin','street'], parts:[
      {s:'cyl', d:[.26,.08], p:[0,.04,0], m:'metal', c:0x3a3f45},
      {s:'cyl', d:[.31,.82], p:[0,.45,0], m:'metal', c:0x4a5057},
      {s:'cyl', d:[.34,.07], p:[0,.87,0], m:'metal', c:0x2f343a, nc:1},
      {s:'cyl', d:[.32,.05], p:[0,.65,0], m:'metal', c:0x2f343a, nc:1},
      {s:'cyl', d:[.32,.05], p:[0,.3,0],  m:'metal', c:0x2f343a, nc:1},
  ]},

  // buzón de calle: cuerpo con tapa curva sobre dos patas
  { id:'r_mailbox', name:'MailBox', mass:70, tags:['road','mail','post'], parts:[
      {s:'box', d:[.1,.36,.1],  p:[-.2,.18,0], m:'metal', c:0x2f343a},
      {s:'box', d:[.1,.36,.1],  p:[.2,.18,0],  m:'metal', c:0x2f343a},
      {s:'box', d:[.62,.72,.56],p:[0,.72,0],   m:'paint', c:0x2a4a86},
      {s:'cyl', d:[.31,.56], r:[90,0,0], p:[0,1.08,0], m:'paint', c:0x2a4a86},
      {s:'box', d:[.4,.06,.1],  p:[0,1.2,.3],  m:'metal', c:0x1e2226, nc:1},
  ]},

  // hidrante de bomberos, 1 m
  { id:'r_hydrant', name:'Hydrant', mass:95, tags:['road','fire','water'], parts:[
      {s:'cyl', d:[.23,.09], p:[0,.045,0], m:'metal', c:0x5a5f66},
      {s:'cyl', d:[.135,.62],p:[0,.4,0],   m:'paint', c:0xc42b20},
      {s:'cyl', d:[.17,.11], p:[0,.75,0],  m:'paint', c:0xc42b20},
      {s:'sph', d:[.16],     p:[0,.82,0],  m:'paint', c:0xc42b20},
      {s:'cyl', d:[.08,.17], r:[0,0,90], p:[-.18,.52,0], m:'metal', c:0x8f9298, nc:1},
      {s:'cyl', d:[.085,.14],r:[90,0,0], p:[0,.52,.17],  m:'metal', c:0x8f9298, nc:1},
      {s:'box', d:[.11,.1,.11],          p:[0,.98,0],    m:'metal', c:0x8a8f96, nc:1},
  ]},

  // tapa de alcantarilla con marco
  { id:'r_manhole', name:'ManHole', mass:120, tags:['road','drain','cover'], parts:[
      {s:'cyl', d:[.44,.1],   p:[0,.05,0],  m:'concrete', c:0x8c8c88},
      {s:'cyl', d:[.37,.07],  p:[0,.085,0], m:'rust', c:0x6b6058},
      {s:'box', d:[.6,.015,.05],p:[0,.12,0],             m:'metal', c:0x4e4a45, nc:1},
      {s:'box', d:[.6,.015,.05],p:[0,.12,0], r:[0,90,0], m:'metal', c:0x4e4a45, nc:1},
      {s:'cyl', d:[.14,.02], p:[0,.125,0],  m:'metal', c:0x4e4a45, nc:1},
  ]},

  // ---------- seguridad viaria ----------
  // valla New Jersey de 3 m (perfil escalonado 0.62 -> 0.26 m)
  { id:'r_jersey', name:'JerseyBarier', mass:2200, tags:['road','barrier','concrete'], parts:[
      {s:'box', d:[3,.16,.62], p:[0,.08,0],   m:'concrete', c:0xb4b4ad},
      {s:'box', d:[3,.3,.46],  p:[0,.31,0],   m:'concrete', c:0xb4b4ad},
      {s:'box', d:[3,.36,.26], p:[0,.63,0],   m:'concrete', c:0xb4b4ad},
      {s:'box', d:[.16,.1,.02],p:[0,.6,.14],  m:'paint', c:0xf2c018, nc:1},
      {s:'box', d:[.16,.1,.02],p:[0,.6,-.14], m:'paint', c:0xf2c018, nc:1},
  ]},

  // cono de tránsito
  { id:'r_cone', name:'TrafficCone', mass:3, tags:['road','cone','traffic'], parts:[
      {s:'box',  d:[.42,.05,.42],p:[0,.025,0], m:'rubber', c:0x22242a},
      {s:'cone', d:[.17,.62],    p:[0,.36,0],  m:'plastic', c:0xf26a1b},
      {s:'cyl',  d:[.128,.1],    p:[0,.22,0],  m:'plastic', c:0xf2f2ee, nc:1},
  ]},

  // delineador flexible con dos bandas reflectivas
  { id:'r_delin', name:'Delineator', mass:5, tags:['road','post','flex'], parts:[
      {s:'box', d:[.3,.06,.3], p:[0,.03,0],  m:'rubber', c:0x22242a},
      {s:'cyl', d:[.045,1],    p:[0,.56,0],  m:'plastic', c:0xf07018},
      {s:'cyl', d:[.052,.09],  p:[0,.85,0],  m:'paint', c:0xf4f4ee, nc:1},
      {s:'cyl', d:[.052,.09],  p:[0,.62,0],  m:'paint', c:0xf4f4ee, nc:1},
  ]},

  // guardarraíl de 4 m: viga W sobre tres postes
  { id:'r_guardrail', name:'GuardRail', mass:155, tags:['road','rail','steel'], parts:[
      {s:'box', d:[.13,.76,.16],p:[-1.85,.38,-.06], m:'steel', c:0x6e737a},
      {s:'box', d:[.13,.76,.16],p:[0,.38,-.06],     m:'steel', c:0x6e737a},
      {s:'box', d:[.13,.76,.16],p:[1.85,.38,-.06],  m:'steel', c:0x6e737a},
      {s:'box', d:[4,.33,.07],  p:[0,.62,.06],      m:'steel', c:0x8a9098},
      {s:'box', d:[4,.09,.11],  p:[0,.62,.02],      m:'steel', c:0x7a8088, nc:1},
  ]},

  // tope de estacionamiento de hormigón, 1.8 m
  { id:'r_parkstop', name:'ParkingStop', mass:80, tags:['road','parking','stop'], parts:[
      {s:'box', d:[1.8,.12,.17],p:[0,.06,0],    m:'concrete', c:0xa8a8a2},
      {s:'box', d:[1.8,.05,.11],p:[0,.145,0],   m:'concrete', c:0xa8a8a2},
      {s:'box', d:[.34,.03,.12],p:[-.55,.175,0],m:'paint', c:0xf2c018, nc:1},
      {s:'box', d:[.34,.03,.12],p:[.55,.175,0], m:'paint', c:0xf2c018, nc:1},
  ]},

  // bolardo de acero con banda reflectiva
  { id:'r_bollard', name:'Bollard01', mass:55, tags:['road','bollard','post'], parts:[
      {s:'cyl', d:[.17,.07], p:[0,.035,0], m:'metal', c:0x4a4f55},
      {s:'cyl', d:[.11,.86], p:[0,.5,0],   m:'steel', c:0x2f343a},
      {s:'sph', d:[.11],     p:[0,.93,0],  m:'steel', c:0x2f343a, nc:1},
      {s:'cyl', d:[.115,.06],p:[0,.8,0],   m:'paint', c:0xf4f4ee, nc:1},
  ]},

  // ---------- puestos y estructuras ----------
  // cabina telefónica de 2.5 m
  { id:'r_phone', name:'PhoneBooth', mass:340, tags:['road','phone','booth'], parts:[
      {s:'box', d:[.98,.14,.98],p:[0,.07,0],    m:'concrete', c:0x868682},
      {s:'box', d:[.96,2.2,.08],p:[0,1.24,-.45],m:'paint', c:0xb02219},
      {s:'box', d:[.09,2.2,.09],p:[-.44,1.24,.44],m:'paint', c:0xb02219},
      {s:'box', d:[.09,2.2,.09],p:[.44,1.24,.44], m:'paint', c:0xb02219},
      {s:'box', d:[.06,2,.86], p:[-.44,1.3,0],  m:'glass', c:0xaad2dc, nc:1},
      {s:'box', d:[.06,2,.86], p:[.44,1.3,0],   m:'glass', c:0xaad2dc, nc:1},
      {s:'box', d:[1.1,.16,1.1],p:[0,2.42,0],   m:'paint', c:0xb02219},
      {s:'box', d:[.34,.46,.16],p:[0,1.45,-.34],m:'paint', c:0x22262a, nc:1},
  ]},

  // puesto de diarios con techo y exhibidor inclinado
  { id:'r_news', name:'NewsStand', mass:240, tags:['road','kiosk','news'], parts:[
      {s:'box', d:[1.9,1,.85],  p:[0,.5,0],     m:'plank', c:0x6e4a2c},
      {s:'box', d:[1.9,1.3,.1], p:[0,1.6,-.37], m:'plank', c:0x6e4a2c},
      {s:'box', d:[.1,1.25,.1], p:[-.9,1.62,.35],m:'metal', c:0x3a3f45},
      {s:'box', d:[.1,1.25,.1], p:[.9,1.62,.35], m:'metal', c:0x3a3f45},
      {s:'box', d:[2.2,.1,1.15],p:[0,2.3,.05],  m:'metal', c:0x4a5057},
      {s:'box', d:[1.7,.5,.06], p:[0,1.22,.44], r:[-35,0,0], m:'plank', c:0xb8a68a, nc:1},
      {s:'box', d:[1.8,.1,.2],  p:[0,1.03,.4],  m:'plank', c:0x8a6a44, nc:1},
  ]},

  // estacionamiento de bicis: dos arcos de tubo unidos
  { id:'r_bikerack', name:'BikeRack', mass:48, tags:['road','bike','rack'], parts:[
      {s:'cyl', d:[.04,.78], p:[-.45,.39,-.4], m:'steel', c:0x5a6068},
      {s:'cyl', d:[.04,.78], p:[.45,.39,-.4],  m:'steel', c:0x5a6068},
      {s:'cyl', d:[.04,.9], r:[0,0,90], p:[0,.78,-.4], m:'steel', c:0x5a6068},
      {s:'cyl', d:[.04,.78], p:[-.45,.39,.4],  m:'steel', c:0x5a6068},
      {s:'cyl', d:[.04,.78], p:[.45,.39,.4],   m:'steel', c:0x5a6068},
      {s:'cyl', d:[.04,.9], r:[0,0,90], p:[0,.78,.4],  m:'steel', c:0x5a6068},
      {s:'box', d:[.06,.06,.86],p:[-.45,.18,0],m:'steel', c:0x5a6068, nc:1},
      {s:'box', d:[.06,.06,.86],p:[.45,.18,0], m:'steel', c:0x5a6068, nc:1},
  ]},

  // segmento de túnel: muros, chaflanes a 45° y losa de techo (hueco, col auto)
  { id:'r_tunnel', name:'TunnelSeg', mass:3000, tags:['road','tunnel','concrete'], parts:[
      {s:'box', d:[.55,4,4],   p:[-3.3,2,0],   m:'concrete', c:0x9a9a94},
      {s:'box', d:[.55,4,4],   p:[3.3,2,0],    m:'concrete', c:0x9a9a94},
      {s:'box', d:[7.2,.55,4], p:[0,4.3,0],    m:'concrete', c:0x9a9a94},
      {s:'box', d:[1.7,.55,4], p:[-2.75,3.85,0], r:[0,0,45],  m:'concrete', c:0x9a9a94},
      {s:'box', d:[1.7,.55,4], p:[2.75,3.85,0],  r:[0,0,-45], m:'concrete', c:0x9a9a94},
      {s:'box', d:[.16,.12,3.6],p:[-2.95,3.2,0],m:'neon', c:0xfff0c0, nc:1},
      {s:'box', d:[.16,.12,3.6],p:[2.95,3.2,0], m:'neon', c:0xfff0c0, nc:1},
  ]},

  // alcantarilla de hormigón: caño hueco de 1.2 m de diámetro (6 dovelas)
  { id:'r_culvert', name:'Culvert', mass:1500, tags:['road','pipe','drain'], parts:[
      {s:'box', d:[.66,.12,1.4], p:[0,1.16,0],    m:'concrete', c:0xa2a29b},
      {s:'box', d:[.66,.12,1.4], p:[-.476,.885,0],r:[0,0,60],  m:'concrete', c:0xa2a29b},
      {s:'box', d:[.66,.12,1.4], p:[-.476,.335,0],r:[0,0,120], m:'concrete', c:0xa2a29b},
      {s:'box', d:[.66,.12,1.4], p:[0,.06,0],     m:'concrete', c:0xa2a29b},
      {s:'box', d:[.66,.12,1.4], p:[.476,.335,0], r:[0,0,-120],m:'concrete', c:0xa2a29b},
      {s:'box', d:[.66,.12,1.4], p:[.476,.885,0], r:[0,0,-60], m:'concrete', c:0xa2a29b},
  ]},

]);
