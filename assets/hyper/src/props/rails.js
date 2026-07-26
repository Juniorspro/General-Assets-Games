/* props/rails.js — Ferrocarril: vía, señalización, material rodante y catenaria.
   Convención: y=0 apoya en el piso, la vía corre a lo largo de Z, trocha 1.5 m (rieles en x=±0.75). */
HP.section('rails','Rails','acc',[

  // ---------------------------------------------------------------- vía
  // tramo recto de 6 m: 8 durmientes + 2 rieles
  { id:'l_track_str', name:'Track6', mass:1200, tags:['rail','track','straight'], parts:[
      {s:'box', d:[2.6,.16,.26], p:[0,.08,-2.625], m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[0,.08,-1.875], m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[0,.08,-1.125], m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[0,.08,-.375],  m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[0,.08,.375],   m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[0,.08,1.125],  m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[0,.08,1.875],  m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[0,.08,2.625],  m:'wood', c:0x4b3a2a},
      {s:'box', d:[.08,.17,6],   p:[-.75,.245,0],  m:'steel', c:0x8b9098},
      {s:'box', d:[.08,.17,6],   p:[.75,.245,0],   m:'steel', c:0x8b9098},
  ]},

  // tramo curvo (radio 5 m, arco 60°): rieles en cuerdas + durmientes radiales
  { id:'l_track_cur', name:'TrackCurve', mass:1150, tags:['rail','track','curve'], parts:[
      {s:'box', d:[2.6,.16,.26], p:[-.43,.08,-2.03], r:[0,24,0],  m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[-.11,.08,-1.04], r:[0,12,0],  m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[0,.08,0],                     m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[-.11,.08,1.04],  r:[0,-12,0], m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.6,.16,.26], p:[-.43,.08,2.03],  r:[0,-24,0], m:'wood', c:0x4b3a2a},
      {s:'box', d:[.08,.17,1.52], p:[-1.07,.245,-1.43], r:[0,20,0],  m:'steel', c:0x8b9098},
      {s:'box', d:[.08,.17,1.52], p:[-.81,.245,0],                   m:'steel', c:0x8b9098},
      {s:'box', d:[.08,.17,1.52], p:[-1.07,.245,1.43],  r:[0,-20,0], m:'steel', c:0x8b9098},
      {s:'box', d:[.08,.17,2.05], p:[.32,.245,-1.94],   r:[0,20,0],  m:'steel', c:0x8b9098},
      {s:'box', d:[.08,.17,2.05], p:[.66,.245,0],                    m:'steel', c:0x8b9098},
      {s:'box', d:[.08,.17,2.05], p:[.32,.245,1.94],    r:[0,-20,0], m:'steel', c:0x8b9098},
  ]},

  // durmiente suelto con placas de asiento
  { id:'l_sleeper', name:'Sleeper', mass:85, col:'box', tags:['rail','tie','wood'], parts:[
      {s:'box', d:[2.6,.16,.26], p:[0,.08,0], m:'wood', c:0x4b3a2a},
      {s:'box', d:[.3,.04,.3], p:[-.75,.18,0], m:'steel', c:0x7f858d, nc:1},
      {s:'box', d:[.3,.04,.3], p:[.75,.18,0],  m:'steel', c:0x7f858d, nc:1},
  ]},

  // cambio de vía: vía recta + par desviado a 8° + palanca
  { id:'l_switch', name:'TrackSwitch', mass:1900, tags:['rail','switch','turnout'], parts:[
      {s:'box', d:[2.6,.16,.26], p:[0,.08,-2.6], m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.7,.16,.26], p:[0,.08,-1.7], m:'wood', c:0x4b3a2a},
      {s:'box', d:[2.9,.16,.26], p:[0,.08,-.8],  m:'wood', c:0x4b3a2a},
      {s:'box', d:[3.1,.16,.26], p:[0,.08,.1],   m:'wood', c:0x4b3a2a},
      {s:'box', d:[3.3,.16,.26], p:[0,.08,1],    m:'wood', c:0x4b3a2a},
      {s:'box', d:[3.4,.16,.26], p:[0,.08,1.9],  m:'wood', c:0x4b3a2a},
      {s:'box', d:[3.4,.16,.26], p:[0,.08,2.8],  m:'wood', c:0x4b3a2a},
      {s:'box', d:[.08,.17,6], p:[-.75,.245,0], m:'steel', c:0x8b9098},
      {s:'box', d:[.08,.17,6], p:[.75,.245,0],  m:'steel', c:0x8b9098},
      {s:'box', d:[.08,.17,4], p:[1.03,.245,.98],  r:[0,8,0], m:'steel', c:0x8b9098},
      {s:'box', d:[.08,.17,4], p:[-.47,.245,.98],  r:[0,8,0], m:'steel', c:0x8b9098},
      {s:'box', d:[.32,.36,.32], p:[-1.35,.18,-1.2], m:'rust', c:0xc06a2a},
      {s:'box', d:[.1,.7,.1], p:[-1.35,.5,-1.2], r:[0,0,-30], m:'rust', nc:1},
  ]},

  // ---------------------------------------------------------- señalización
  // señal de tres aspectos sobre mástil de 4 m
  { id:'l_signal', name:'RailSignal', mass:190, tags:['rail','signal','light'], parts:[
      {s:'box', d:[.55,.28,.55], p:[0,.14,0], m:'concrete', c:0x9d9c96},
      {s:'cyl', d:[.09,3.8], p:[0,2.18,0], m:'metal', c:0x3a3f45},
      {s:'box', d:[.42,1.15,.28], p:[0,4.3,0], m:'metal', c:0x24272b},
      {s:'cyl', d:[.12,.07], p:[0,4.62,.17], r:[90,0,0], m:'neon', c:0xe03024, nc:1},
      {s:'cyl', d:[.12,.07], p:[0,4.28,.17], r:[90,0,0], m:'neon', c:0xe8b020, nc:1},
      {s:'cyl', d:[.12,.07], p:[0,3.94,.17], r:[90,0,0], m:'neon', c:0x2fd15a, nc:1},
  ]},

  // barrera de paso a nivel: pluma de 4.6 m con franjas y luces
  { id:'l_xgate', name:'CrossingGate', mass:260, tags:['rail','crossing','barrier'], parts:[
      {s:'box', d:[.6,.3,.6], p:[-2.2,.15,0], m:'concrete', c:0x9d9c96},
      {s:'cyl', d:[.11,2.3], p:[-2.2,1.45,0], m:'metal', c:0xdedede},
      {s:'box', d:[4.6,.13,.17], p:[.2,1.15,.16], m:'paint', c:0xececec},
      {s:'box', d:[.55,.15,.19], p:[-1.4,1.15,.16], m:'paint', c:0xd42a1e, nc:1},
      {s:'box', d:[.55,.15,.19], p:[.2,1.15,.16],   m:'paint', c:0xd42a1e, nc:1},
      {s:'box', d:[.55,.15,.19], p:[1.8,1.15,.16],  m:'paint', c:0xd42a1e, nc:1},
      {s:'cyl', d:[.13,.08], p:[-1.9,2.4,.18], r:[90,0,0], m:'paint', c:0xd42a1e, nc:1},
      {s:'cyl', d:[.13,.08], p:[-2.5,2.4,.18], r:[90,0,0], m:'paint', c:0xd42a1e, nc:1},
  ]},

  // tope de vía de hormigón con paragolpes y tablilla
  { id:'l_buffer', name:'BufferStop', mass:2400, col:'box', tags:['rail','buffer','stop'], parts:[
      {s:'box', d:[2,.85,.7], p:[0,.425,0], m:'concrete', c:0x9c9c96},
      {s:'box', d:[1.6,.5,.35], p:[0,1.05,.25], m:'steel', c:0x767c84},
      {s:'cyl', d:[.22,.28], p:[-.44,1,.5], r:[90,0,0], m:'steel', c:0x8d949c},
      {s:'cyl', d:[.22,.28], p:[.44,1,.5],  r:[90,0,0], m:'steel', c:0x8d949c},
      {s:'box', d:[1.1,.45,.06], p:[0,1.5,.15], m:'paint', c:0xd42a1e, nc:1},
  ]},

  // paragolpes de desvío: trineo de acero sobre los rieles
  { id:'l_bumper', name:'SidingBumper', mass:780, tags:['rail','buffer','siding'], parts:[
      {s:'box', d:[1.8,.25,1.4], p:[0,.125,0], m:'steel', c:0x6a6f76},
      {s:'box', d:[.2,.85,.22], p:[-.55,.6,-.35], r:[-12,0,0], m:'steel', c:0x6a6f76},
      {s:'box', d:[.2,.85,.22], p:[.55,.6,-.35],  r:[-12,0,0], m:'steel', c:0x6a6f76},
      {s:'box', d:[1.7,.36,.26], p:[0,1.05,-.28], m:'steel', c:0x767c84},
      {s:'cyl', d:[.19,.24], p:[-.5,1.05,-.45], r:[90,0,0], m:'rubber', c:0x22242a, nc:1},
      {s:'cyl', d:[.19,.24], p:[.5,1.05,-.45],  r:[90,0,0], m:'rubber', c:0x22242a, nc:1},
      {s:'box', d:[1.2,.4,.06], p:[0,1.4,-.24], m:'paint', c:0xd42a1e, nc:1},
  ]},

  // mojón kilométrico
  { id:'l_milepost', name:'MilePost', mass:55, col:'box', tags:['rail','marker','post'], parts:[
      {s:'box', d:[.22,.9,.16], p:[0,.45,0], m:'concrete', c:0xd8d4c8},
      {s:'box', d:[.26,.1,.2], p:[0,.93,0], r:[15,0,0], m:'concrete', c:0xd8d4c8, nc:1},
      {s:'box', d:[.17,.24,.03], p:[0,.62,.095], m:'paint', c:0x1f2429, nc:1},
  ]},

  // andén de 6 m con borde y baranda trasera
  { id:'l_platform', name:'Platform6', mass:3000, col:'box', tags:['rail','station','platform'], parts:[
      {s:'box', d:[3,.9,6], p:[0,.45,0], m:'concrete', c:0xa5a49d},
      {s:'box', d:[.4,.14,6], p:[1.3,.97,0], m:'concrete', c:0x8e8e88},
      {s:'box', d:[.2,.03,6], p:[1.02,.915,0], m:'paint', c:0xe6c223, nc:1},
      {s:'box', d:[.09,1,.09], p:[-1.42,1.4,-2.4], m:'metal', c:0x9aa0a8},
      {s:'box', d:[.09,1,.09], p:[-1.42,1.4,2.4],  m:'metal', c:0x9aa0a8},
      {s:'box', d:[.09,.09,5], p:[-1.42,1.85,0], m:'metal', c:0x9aa0a8, nc:1},
  ]},

  // -------------------------------------------------------- material rodante
  // vagón plataforma de 10 m con piso de madera y testeros
  { id:'l_flatcar', name:'FlatCar', mass:2400, tags:['rail','wagon','flat'], parts:[
      {s:'box', d:[2.5,.32,10.4], p:[0,.82,0], m:'steel', c:0x5d6268},
      {s:'box', d:[2.7,.22,10], p:[0,1.09,0], m:'plank', c:0x7a6446},
      {s:'box', d:[2.7,.5,.14], p:[0,1.45,-4.9], m:'steel', c:0x5d6268},
      {s:'box', d:[2.7,.5,.14], p:[0,1.45,4.9],  m:'steel', c:0x5d6268},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,-3.2], r:[0,0,90], m:'metal', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,-3.2],  r:[0,0,90], m:'metal', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,3.2],  r:[0,0,90], m:'metal', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,3.2],   r:[0,0,90], m:'metal', c:0x3c4046},
  ]},

  // vagón cisterna: tanque de 8.4 m, cúpula y pasarela
  { id:'l_tankcar', name:'TankCar', mass:2800, tags:['rail','wagon','tank'], parts:[
      {s:'box', d:[2.5,.3,10], p:[0,.83,0], m:'steel', c:0x5d6268},
      {s:'cyl', d:[1.35,4.2], p:[0,2.15,-2.1], r:[0,0,90], m:'metal', c:0x8f959c},
      {s:'cyl', d:[1.35,4.2], p:[0,2.15,2.1],  r:[0,0,90], m:'metal', c:0x8f959c},
      {s:'cyl', d:[.34,.3], p:[0,3.62,0], m:'metal', c:0x767c84},
      {s:'box', d:[.85,.05,8.6], p:[0,3.53,0], m:'steel', c:0x6a6f76, nc:1},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,-3.2], r:[0,0,90], m:'metal', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,-3.2],  r:[0,0,90], m:'metal', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,3.2],  r:[0,0,90], m:'metal', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,3.2],   r:[0,0,90], m:'metal', c:0x3c4046},
  ]},

  // vagón tolva abierto con dos bocas de descarga
  { id:'l_hopper', name:'HopperCar', mass:2700, tags:['rail','wagon','hopper'], parts:[
      {s:'box', d:[2.5,.28,9], p:[0,.84,0], m:'steel', c:0x5d6268},
      {s:'box', d:[2.7,1.9,8.4], p:[0,2.05,0], m:'rust', c:0x7a4a34},
      {s:'box', d:[2.84,.14,8.55], p:[0,3.05,0], m:'metal', c:0x8b9098, nc:1},
      {s:'box', d:[1,.55,1.6], p:[0,.85,-2.2], m:'rust', c:0x6d4230},
      {s:'box', d:[1,.55,1.6], p:[0,.85,2.2],  m:'rust', c:0x6d4230},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,-3.4], r:[0,0,90], m:'metal', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,-3.4],  r:[0,0,90], m:'metal', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,3.4],  r:[0,0,90], m:'metal', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,3.4],   r:[0,0,90], m:'metal', c:0x3c4046},
  ]},

  // vagón porta-contenedor con contenedor de 40 pies y dos bogies
  { id:'l_wellcar', name:'ContainerCar', mass:3000, tags:['rail','wagon','container'], parts:[
      {s:'box', d:[2.5,.45,13], p:[0,.85,0], m:'steel', c:0x565b61},
      {s:'box', d:[2.44,2.59,12.19], p:[0,2.375,0], m:'corrugated', c:0xc25a2a},
      {s:'box', d:[1.95,.34,2.4], p:[0,.6,-5], m:'rust', c:0x6b4a38},
      {s:'box', d:[1.95,.34,2.4], p:[0,.6,5],  m:'rust', c:0x6b4a38},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,-5.75], r:[0,0,90], m:'rust', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,-5.75],  r:[0,0,90], m:'rust', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,-4.25], r:[0,0,90], m:'rust', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,-4.25],  r:[0,0,90], m:'rust', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,4.25],  r:[0,0,90], m:'rust', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,4.25],   r:[0,0,90], m:'rust', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[-.8,.38,5.75],  r:[0,0,90], m:'rust', c:0x3c4046},
      {s:'cyl', d:[.38,.14], p:[.8,.38,5.75],   r:[0,0,90], m:'rust', c:0x3c4046},
  ]},

  // trompa de locomotora diésel: cabina, capot, quitapiedras
  { id:'l_loconose', name:'LocoNose', mass:3000, tags:['rail','loco','cab'], parts:[
      {s:'box', d:[2.75,.35,5], p:[0,.85,0], m:'steel', c:0x4b5057},
      {s:'box', d:[2.85,1.75,2.6], p:[0,1.95,-1.25], m:'paint', c:0x1f4f8b},
      {s:'box', d:[2.9,2.2,1.9], p:[0,2.2,.95], m:'paint', c:0x1f4f8b},
      {s:'box', d:[2.4,.95,.7], p:[0,1.6,2.2], m:'paint', c:0x1f4f8b},
      {s:'box', d:[2.5,.85,.08], p:[0,2.85,1.87], m:'glass', c:0x9fb6c4, nc:1},
      {s:'cyl', d:[.17,.12], p:[0,1.85,2.56], r:[90,0,0], m:'glass', c:0xffe9a8, nc:1},
      {s:'box', d:[2.85,.65,.25], p:[0,.55,2.4], m:'steel', c:0x3f444a},
      {s:'cyl', d:[.5,.16], p:[-.85,.5,-1.5], r:[0,0,90], m:'steel', c:0x3c4046},
      {s:'cyl', d:[.5,.16], p:[.85,.5,-1.5],  r:[0,0,90], m:'steel', c:0x3c4046},
      {s:'cyl', d:[.5,.16], p:[-.85,.5,.6],   r:[0,0,90], m:'steel', c:0x3c4046},
      {s:'cyl', d:[.5,.16], p:[.85,.5,.6],    r:[0,0,90], m:'steel', c:0x3c4046},
  ]},

  // ------------------------------------------------------------- componentes
  // gancho de enganche automático
  { id:'l_coupler', name:'Coupler', mass:180, tags:['rail','coupler','part'], parts:[
      {s:'box', d:[.26,.3,.85], p:[0,.25,-.2], m:'steel', c:0x6a6f76},
      {s:'box', d:[.42,.42,.34], p:[0,.25,.35], m:'steel', c:0x767c84},
      {s:'box', d:[.2,.4,.26], p:[.15,.25,.58], m:'rust', c:0xa8622e},
      {s:'box', d:[.52,.5,.1], p:[0,.25,-.62], m:'steel', c:0x5d6268, nc:1},
      {s:'cyl', d:[.05,.46], p:[.15,.5,.58], m:'rust', c:0xa8622e, nc:1},
  ]},

  // par de ruedas con eje y cajas de grasa
  { id:'l_wheelset', name:'WheelSet', mass:620, tags:['rail','wheel','part'], parts:[
      {s:'cyl', d:[.38,.14], p:[-.75,.38,0], r:[0,0,90], m:'metal', c:0x3f444a},
      {s:'cyl', d:[.38,.14], p:[.75,.38,0],  r:[0,0,90], m:'metal', c:0x3f444a},
      {s:'box', d:[1.5,.16,.16], p:[0,.38,0], m:'steel', c:0x767c84},
      {s:'box', d:[.2,.24,.24], p:[-.86,.38,0], m:'rust', c:0x9c5c2c, nc:1},
      {s:'box', d:[.2,.24,.24], p:[.86,.38,0],  m:'rust', c:0x9c5c2c, nc:1},
  ]},

  // bogie de dos ejes
  { id:'l_bogie', name:'Bogie', mass:2400, tags:['rail','bogie','truck'], parts:[
      {s:'box', d:[.16,.5,2.3], p:[-.95,.62,0], m:'rust', c:0x6b4a38},
      {s:'box', d:[.16,.5,2.3], p:[.95,.62,0],  m:'rust', c:0x6b4a38},
      {s:'box', d:[2,.3,.7], p:[0,.75,0], m:'steel', c:0x5d6268},
      {s:'cyl', d:[.28,.18], p:[0,.98,0], m:'steel', c:0x767c84, nc:1},
      {s:'cyl', d:[.38,.14], p:[-.79,.38,-.85], r:[0,0,90], m:'metal', c:0x3f444a},
      {s:'cyl', d:[.38,.14], p:[.79,.38,-.85],  r:[0,0,90], m:'metal', c:0x3f444a},
      {s:'cyl', d:[.38,.14], p:[-.79,.38,.85],  r:[0,0,90], m:'metal', c:0x3f444a},
      {s:'cyl', d:[.38,.14], p:[.79,.38,.85],   r:[0,0,90], m:'metal', c:0x3f444a},
  ]},

  // ---------------------------------------------------------------- catenaria
  // poste de catenaria con ménsula e aislador
  { id:'l_catpole', name:'CatenaryPole', mass:700, tags:['rail','catenary','pole'], parts:[
      {s:'box', d:[.6,.35,.6], p:[-1.1,.175,0], m:'concrete', c:0x9d9c96},
      {s:'cyl', d:[.15,6.2], p:[-1.1,3.3,0], m:'steel', c:0x5c6168},
      {s:'box', d:[2.3,.14,.14], p:[.05,6.05,0], m:'steel', c:0x5c6168},
      {s:'box', d:[2.15,.12,.12], p:[-.1,5.6,0], r:[0,0,22], m:'steel', c:0x5c6168, nc:1},
      {s:'cyl', d:[.1,.3], p:[.85,5.85,0], m:'plastic', c:0xc8c0b0, nc:1},
  ]},

  // tramo de catenaria de 10 m: dos postes, sustentador, hilo de contacto y péndolas
  { id:'l_catspan', name:'CatenarySpan', mass:900, tags:['rail','catenary','wire'], parts:[
      {s:'box', d:[.5,.3,.5], p:[-1.2,.15,-5], m:'concrete', c:0x9d9c96},
      {s:'box', d:[.5,.3,.5], p:[-1.2,.15,5],  m:'concrete', c:0x9d9c96},
      {s:'cyl', d:[.14,6], p:[-1.2,3.15,-5], m:'steel', c:0x5c6168},
      {s:'cyl', d:[.14,6], p:[-1.2,3.15,5],  m:'steel', c:0x5c6168},
      {s:'box', d:[1.9,.13,.13], p:[-.3,5.9,-5], m:'steel', c:0x5c6168, nc:1},
      {s:'box', d:[1.9,.13,.13], p:[-.3,5.9,5],  m:'steel', c:0x5c6168, nc:1},
      {s:'cyl', d:[.035,10], p:[.35,5.8,0], r:[90,0,0], m:'steel', c:0x6f757c, nc:1},
      {s:'cyl', d:[.03,10], p:[.35,5.15,0], r:[90,0,0], m:'chrome', nc:1},
      {s:'box', d:[.05,.65,.05], p:[.35,5.475,-2.5], m:'steel', c:0x6f757c, nc:1},
      {s:'box', d:[.05,.65,.05], p:[.35,5.475,0],    m:'steel', c:0x6f757c, nc:1},
      {s:'box', d:[.05,.65,.05], p:[.35,5.475,2.5],  m:'steel', c:0x6f757c, nc:1},
  ]},

  // ------------------------------------------------------------- instalaciones
  // pila de balasto
  { id:'l_ballast', name:'BallastPile', mass:2400, tags:['rail','ballast','gravel'], parts:[
      {s:'cyl',  d:[1.45,.22], p:[0,.11,0], m:'dirt', c:0x8d8b86},
      {s:'cone', d:[1.3,1.05], p:[0,.55,0], m:'dirt', c:0x8d8b86},
      {s:'sph',  d:[.16], p:[.95,.16,.55],  m:'concrete', c:0x9a978f, nc:1},
      {s:'sph',  d:[.15], p:[-.85,.15,-.7], m:'concrete', c:0x9a978f, nc:1},
      {s:'sph',  d:[.14], p:[.45,.14,-1.05],m:'concrete', c:0x9a978f, nc:1},
  ]},

  // tanque de agua ferroviario sobre torre de madera
  { id:'l_wtower', name:'WaterTower', mass:2600, tags:['rail','water','tower'], parts:[
      {s:'cyl',  d:[1.45,3], p:[0,4.6,0], m:'plank', c:0x6a5238},
      {s:'cone', d:[1.6,.85], p:[0,6.5,0], m:'metal', c:0x4a4f55},
      {s:'box', d:[.2,3.2,.2], p:[-.95,1.6,-.95], m:'plank', c:0x5c4830},
      {s:'box', d:[.2,3.2,.2], p:[.95,1.6,-.95],  m:'plank', c:0x5c4830},
      {s:'box', d:[.2,3.2,.2], p:[-.95,1.6,.95],  m:'plank', c:0x5c4830},
      {s:'box', d:[.2,3.2,.2], p:[.95,1.6,.95],   m:'plank', c:0x5c4830},
      {s:'box', d:[2.1,.13,.13], p:[0,1.5,-.95], r:[0,0,22], m:'plank', c:0x5c4830, nc:1},
      {s:'box', d:[2.1,.13,.13], p:[0,1.5,.95],  r:[0,0,22], m:'plank', c:0x5c4830, nc:1},
      {s:'cyl', d:[.16,1.4], p:[0,3.05,1.15], r:[35,0,0], m:'metal', c:0x4a4f55, nc:1},
  ]},

]);
