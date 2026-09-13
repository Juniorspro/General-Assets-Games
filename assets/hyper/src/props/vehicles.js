/* props/vehicles.js — VEHÍCULOS (props físicos pesados, no se conducen)
   Convención: largo sobre Z, ancho sobre X, y=0 = piso (base de las ruedas).
   Ruedas: cyl [radio,ancho] con r:[0,0,90] (eje sobre X), material 'rubber'. */
HP.section('vehicles','Vehículos','veh',[

  // ---------------------------------------------------------------- AUTOS
  // sedán 4 puertas — 4.60 x 1.88 x 1.45
  { id:'v_sedan', glb:'sedan', grot:[0,90,0], name:'Sedan01', mass:1200, tags:['car','sedan'], parts:[
      {s:'box', d:[1.80,0.45,4.60], p:[0,0.625,0],     m:'paint', c:0x2f6fb0},
      {s:'box', d:[1.72,0.18,1.35], p:[0,0.94,1.55],   m:'paint', c:0x2f6fb0},
      {s:'box', d:[1.72,0.22,1.10], p:[0,0.96,-1.68],  m:'paint', c:0x2f6fb0},
      {s:'box', d:[1.66,0.46,2.05], p:[0,1.08,-0.05],  m:'glass', nc:1},
      {s:'box', d:[1.58,0.14,1.45], p:[0,1.38,-0.30],  m:'paint', c:0x2f6fb0},
      {s:'cyl', d:[0.32,0.22], p:[-0.83,0.32, 1.42], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.32,0.22], p:[ 0.83,0.32, 1.42], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.32,0.22], p:[-0.83,0.32,-1.42], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.32,0.22], p:[ 0.83,0.32,-1.42], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // hatchback compacto — 3.90 de largo, cola vertical
  { id:'v_hatch', name:'Hatchback', mass:1050, tags:['car','compact'], parts:[
      {s:'box', d:[1.72,0.46,3.90], p:[0,0.60,0],      m:'paint', c:0xd8452f},
      {s:'box', d:[1.66,0.17,0.95], p:[0,0.915,1.42],  m:'paint', c:0xd8452f},
      {s:'box', d:[1.60,0.48,2.10], p:[0,1.07,-0.45],  m:'glass', nc:1},
      {s:'box', d:[1.52,0.14,1.55], p:[0,1.38,-0.55],  m:'paint', c:0xd8452f},
      {s:'box', d:[1.62,0.55,0.18], p:[0,1.10,-1.86],  m:'paint', c:0xd8452f},
      {s:'cyl', d:[0.30,0.20], p:[-0.80,0.30, 1.22], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.30,0.20], p:[ 0.80,0.30, 1.22], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.30,0.20], p:[-0.80,0.30,-1.22], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.30,0.20], p:[ 0.80,0.30,-1.22], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // SUV alta — 4.85 x 1.95 x 1.85
  { id:'v_suv', name:'SUV01', mass:2600, tags:['car','suv','4x4'], parts:[
      {s:'box', d:[1.95,0.70,4.85], p:[0,0.88,0],      m:'paint', c:0x333a42},
      {s:'box', d:[1.88,0.16,1.25], p:[0,1.31,1.70],   m:'paint', c:0x333a42},
      {s:'box', d:[1.84,0.52,2.85], p:[0,1.49,-0.35],  m:'glass', nc:1},
      {s:'box', d:[1.78,0.12,2.55], p:[0,1.79,-0.45],  m:'paint', c:0x333a42},
      {s:'box', d:[1.90,0.24,0.26], p:[0,0.64,2.36],   m:'paint', c:0x1d1f24, nc:1},
      {s:'cyl', d:[0.38,0.26], p:[-0.86,0.38, 1.55], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.38,0.26], p:[ 0.86,0.38, 1.55], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.38,0.26], p:[-0.86,0.38,-1.55], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.38,0.26], p:[ 0.86,0.38,-1.55], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // taxi amarillo con cartel de techo
  { id:'v_taxi', name:'Taxi01', mass:1350, tags:['car','taxi'], parts:[
      {s:'box', d:[1.82,0.46,4.65], p:[0,0.63,0],      m:'paint', c:0xf2b21c},
      {s:'box', d:[1.76,0.18,1.35], p:[0,0.95,1.58],   m:'paint', c:0xf2b21c},
      {s:'box', d:[1.76,0.22,1.10], p:[0,0.97,-1.72],  m:'paint', c:0xf2b21c},
      {s:'box', d:[1.68,0.46,2.10], p:[0,1.09,-0.05],  m:'glass', nc:1},
      {s:'box', d:[1.60,0.14,1.50], p:[0,1.39,-0.28],  m:'paint', c:0xf2b21c},
      {s:'box', d:[0.70,0.20,0.26], p:[0,1.56,0.10],   m:'paint', c:0xfff0b0, nc:1},
      {s:'cyl', d:[0.32,0.22], p:[-0.84,0.32, 1.44], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.32,0.22], p:[ 0.84,0.32, 1.44], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.32,0.22], p:[-0.84,0.32,-1.44], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.32,0.22], p:[ 0.84,0.32,-1.44], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // patrullero blanco y negro con barra de luces
  { id:'v_police', name:'PoliceCar', mass:1600, tags:['car','police'], parts:[
      {s:'box', d:[1.86,0.48,4.85], p:[0,0.65,0],      m:'paint', c:0xe9eaec},
      {s:'box', d:[1.80,0.18,1.40], p:[0,0.98,1.65],   m:'paint', c:0xe9eaec},
      {s:'box', d:[1.80,0.20,1.05], p:[0,0.99,-1.85],  m:'paint', c:0xe9eaec},
      {s:'box', d:[1.90,0.34,1.90], p:[0,0.70,-0.10],  m:'paint', c:0x22242a, nc:1},
      {s:'box', d:[1.72,0.48,2.15], p:[0,1.13,-0.10],  m:'glass', nc:1},
      {s:'box', d:[1.64,0.14,1.55], p:[0,1.44,-0.35],  m:'paint', c:0xe9eaec},
      {s:'box', d:[1.20,0.16,0.30], p:[0,1.59,-0.05],  m:'glass', c:0x3a6bff, nc:1},
      {s:'cyl', d:[0.33,0.23], p:[-0.86,0.33, 1.50], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.33,0.23], p:[ 0.86,0.33, 1.50], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.33,0.23], p:[-0.86,0.33,-1.50], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.33,0.23], p:[ 0.86,0.33,-1.50], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // ------------------------------------------------------- UTILITARIOS
  // pickup cabina simple con caja de carga abierta — 5.40 de largo
  { id:'v_pickup', name:'Pickup01', mass:2100, tags:['truck','pickup'], parts:[
      {s:'box', d:[2.00,0.70,5.40], p:[0,0.89,0],      m:'paint', c:0xb03a2e},
      {s:'box', d:[1.94,0.16,1.30], p:[0,1.32,2.05],   m:'paint', c:0xb03a2e},
      {s:'box', d:[1.86,0.50,1.35], p:[0,1.49,0.55],   m:'glass', nc:1},
      {s:'box', d:[1.82,0.14,1.45], p:[0,1.81,0.50],   m:'paint', c:0xb03a2e},
      {s:'box', d:[0.14,0.50,2.30], p:[-0.93,1.49,-1.15], m:'paint', c:0xb03a2e},
      {s:'box', d:[0.14,0.50,2.30], p:[ 0.93,1.49,-1.15], m:'paint', c:0xb03a2e},
      {s:'box', d:[2.00,0.50,0.12], p:[0,1.49,-2.34],  m:'paint', c:0xb03a2e},
      {s:'cyl', d:[0.40,0.28], p:[-0.90,0.40, 1.75], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.40,0.28], p:[ 0.90,0.40, 1.75], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.40,0.28], p:[-0.90,0.40,-1.75], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.40,0.28], p:[ 0.90,0.40,-1.75], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // furgón de reparto — 5.40 x 2.00 x 2.37
  { id:'v_van', name:'CargoVan', mass:2300, tags:['van','delivery'], parts:[
      {s:'box', d:[2.00,1.10,5.40], p:[0,0.97,0],      m:'paint', c:0xe8e8e6},
      {s:'box', d:[2.00,0.85,3.60], p:[0,1.945,-0.90], m:'paint', c:0xe8e8e6},
      {s:'box', d:[1.88,0.55,1.20], p:[0,1.82,1.35],   m:'glass', nc:1},
      {s:'box', d:[1.90,0.28,1.35], p:[0,2.23,1.30],   m:'paint', c:0xe8e8e6},
      {s:'box', d:[1.96,0.26,0.22], p:[0,0.50,2.66],   m:'paint', c:0x2a2c30, nc:1},
      {s:'cyl', d:[0.35,0.24], p:[-0.88,0.35, 1.80], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.35,0.24], p:[ 0.88,0.35, 1.80], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.35,0.24], p:[-0.88,0.35,-1.80], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.35,0.24], p:[ 0.88,0.35,-1.80], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // ambulancia con módulo caja y baliza
  { id:'v_ambulance', name:'Ambulance', mass:3000, tags:['emergency','van'], parts:[
      {s:'box', d:[2.20,0.85,5.90], p:[0,0.87,0],      m:'paint', c:0xf0f2f4},
      {s:'box', d:[2.30,1.45,3.70], p:[0,2.02,-1.05],  m:'paint', c:0xf0f2f4},
      {s:'box', d:[2.10,0.55,1.10], p:[0,1.60,2.35],   m:'glass', nc:1},
      {s:'box', d:[2.14,0.30,1.60], p:[0,2.02,2.05],   m:'paint', c:0xf0f2f4},
      {s:'box', d:[2.32,0.26,3.72], p:[0,1.60,-1.05],  m:'paint', c:0xd8342b, nc:1},
      {s:'box', d:[1.30,0.16,0.34], p:[0,2.25,2.05],   m:'glass', c:0xff4a3a, nc:1},
      {s:'cyl', d:[0.38,0.26], p:[-0.94,0.38, 1.95], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.38,0.26], p:[ 0.94,0.38, 1.95], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.38,0.26], p:[-0.94,0.38,-1.95], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.38,0.26], p:[ 0.94,0.38,-1.95], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // ------------------------------------------------------------ PESADOS
  // colectivo urbano — 12.0 x 2.55 x 3.18
  { id:'v_bus', name:'CityBus', mass:3000, tags:['bus','transit'], parts:[
      {s:'box', d:[2.55,1.30,12.0], p:[0,1.10,0],      m:'paint', c:0x2f6fb0},
      {s:'box', d:[2.50,0.98,11.4], p:[0,2.24,-0.10],  m:'glass', nc:1},
      {s:'box', d:[2.48,0.45,11.8], p:[0,2.955,0],     m:'paint', c:0xe8e8e6},
      {s:'box', d:[2.55,0.30,11.8], p:[0,0.55,0],      m:'paint', c:0x33363b, nc:1},
      {s:'cyl', d:[0.50,0.32], p:[-1.12,0.50, 4.10], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.50,0.32], p:[ 1.12,0.50, 4.10], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.50,0.32], p:[-1.12,0.50,-3.40], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.50,0.32], p:[ 1.12,0.50,-3.40], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // camión con caja cerrada — 7.90 de largo, caja 5.60
  { id:'v_boxtruck', name:'BoxTruck', mass:3000, tags:['truck','cargo'], parts:[
      {s:'box', d:[2.20,0.28,7.90], p:[0,0.86,0],      m:'paint', c:0x33363b},
      {s:'box', d:[2.40,0.95,2.00], p:[0,1.47,2.85],   m:'paint', c:0xd94f3a},
      {s:'box', d:[2.30,0.55,1.30], p:[0,2.22,3.05],   m:'glass', nc:1},
      {s:'box', d:[2.34,0.30,1.90], p:[0,2.64,2.85],   m:'paint', c:0xd94f3a},
      {s:'box', d:[2.50,2.35,5.60], p:[0,2.18,-0.95],  m:'paint', c:0xdedbd2},
      {s:'cyl', d:[0.50,0.32], p:[-1.05,0.50, 2.90], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.50,0.32], p:[ 1.05,0.50, 2.90], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.50,0.32], p:[-1.05,0.50,-2.00], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.50,0.32], p:[ 1.05,0.50,-2.00], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // tractor de semi con cabina dormitorio y quinta rueda — 6.5 x 2.5 x 3.15
  { id:'v_semi', name:'SemiTractor', mass:3000, tags:['truck','semi'], parts:[
      {s:'box', d:[2.20,0.30,6.50], p:[0,0.90,0],      m:'paint', c:0x33363b},
      {s:'box', d:[2.34,0.80,1.40], p:[0,1.45,2.50],   m:'paint', c:0x2f6fb0},
      {s:'box', d:[2.50,1.45,2.10], p:[0,1.775,0.85],  m:'paint', c:0x2f6fb0},
      {s:'box', d:[2.36,0.62,0.26], p:[0,2.10,1.78],   m:'glass', nc:1},
      {s:'box', d:[2.44,2.10,1.70], p:[0,2.10,-1.00],  m:'paint', c:0x2f6fb0},
      {s:'cyl', d:[0.11,1.90], p:[1.10,2.20,0.15],     m:'paint', c:0xb9bcc2, nc:1},
      {s:'box', d:[1.50,0.14,1.20], p:[0,1.12,-2.30],  m:'paint', c:0x1d1f24},
      {s:'cyl', d:[0.52,0.36], p:[-1.06,0.52, 2.30], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.52,0.36], p:[ 1.06,0.52, 2.30], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.52,0.36], p:[-1.06,0.52,-2.20], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.52,0.36], p:[ 1.06,0.52,-2.20], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // semirremolque caja seca — 13.0 x 2.55, patas de apoyo y bogie trasero
  { id:'v_trailer', name:'Trailer01', mass:3000, tags:['truck','trailer'], parts:[
      {s:'box', d:[2.55,2.70,13.0], p:[0,2.60,0],      m:'corrugated', c:0xdedbd2},
      {s:'box', d:[2.30,0.30,12.6], p:[0,1.10,0],      m:'steel', c:0x3a3d42},
      {s:'box', d:[0.22,0.95,0.24], p:[-0.85,0.475,3.10], m:'steel', c:0x3a3d42},
      {s:'box', d:[0.22,0.95,0.24], p:[ 0.85,0.475,3.10], m:'steel', c:0x3a3d42},
      {s:'box', d:[1.40,0.16,1.30], p:[0,0.87,4.90],   m:'steel', c:0x3a3d42, nc:1},
      {s:'box', d:[2.40,0.16,0.18], p:[0,0.72,-6.42],  m:'steel', c:0x3a3d42, nc:1},
      {s:'cyl', d:[0.52,0.36], p:[-1.06,0.52,-3.60], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.52,0.36], p:[ 1.06,0.52,-3.60], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.52,0.36], p:[-1.06,0.52,-4.60], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.52,0.36], p:[ 1.06,0.52,-4.60], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // autobomba con escalera y lockers — 9.0 de largo
  { id:'v_firetruck', name:'FireTruck', mass:3000, tags:['emergency','truck'], parts:[
      {s:'box', d:[2.30,0.30,9.00], p:[0,0.92,0],      m:'paint', c:0x33363b},
      {s:'box', d:[2.50,1.40,2.40], p:[0,1.77,3.10],   m:'paint', c:0xd12b22},
      {s:'box', d:[2.36,0.60,0.28], p:[0,2.05,4.16],   m:'glass', nc:1},
      {s:'box', d:[2.50,1.70,6.00], p:[0,1.92,-1.20],  m:'paint', c:0xd12b22},
      {s:'box', d:[2.54,0.80,5.80], p:[0,1.70,-1.20],  m:'paint', c:0xe8e8e6, nc:1},
      {s:'box', d:[0.55,0.22,7.40], p:[0,2.90,-0.60],  m:'paint', c:0xd9dde2, nc:1},
      {s:'box', d:[1.50,0.18,0.34], p:[0,2.56,3.30],   m:'glass', c:0xff3a2a, nc:1},
      {s:'cyl', d:[0.52,0.36], p:[-1.06,0.52, 3.30], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.52,0.36], p:[ 1.06,0.52, 3.30], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.52,0.36], p:[-1.06,0.52,-2.20], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.52,0.36], p:[ 1.06,0.52,-2.20], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // tranvía de dos bogies — 14.0 x 2.42 x 3.70 con pantógrafo
  { id:'v_tram', name:'Tram01', mass:3000, tags:['rail','transit'], parts:[
      {s:'box', d:[2.40,1.20,14.0], p:[0,1.00,0],      m:'paint', c:0xc0392b},
      {s:'box', d:[2.36,1.10,13.4], p:[0,2.17,0],      m:'glass', nc:1},
      {s:'box', d:[2.34,0.42,13.8], p:[0,2.93,0],      m:'paint', c:0xe8e8e6},
      {s:'box', d:[1.10,0.55,0.30], p:[0,3.42,2.20],   m:'paint', c:0x33363b, nc:1},
      {s:'box', d:[2.42,0.30,13.6], p:[0,0.52,0],      m:'paint', c:0x33363b, nc:1},
      {s:'cyl', d:[0.35,0.14], p:[-0.95,0.35, 4.60], r:[0,0,90], m:'rubber', c:0x2b2e33},
      {s:'cyl', d:[0.35,0.14], p:[ 0.95,0.35, 4.60], r:[0,0,90], m:'rubber', c:0x2b2e33},
      {s:'cyl', d:[0.35,0.14], p:[-0.95,0.35,-4.60], r:[0,0,90], m:'rubber', c:0x2b2e33},
      {s:'cyl', d:[0.35,0.14], p:[ 0.95,0.35,-4.60], r:[0,0,90], m:'rubber', c:0x2b2e33},
  ]},

  // ------------------------------------------------------------- OBRA / CAMPO
  // tractor agrícola: ruedas traseras grandes, cabina vidriada
  { id:'v_tractor', name:'FarmTractor', mass:3000, tags:['farm','tractor'], parts:[
      {s:'box', d:[1.00,0.90,2.30], p:[0,1.30,0.90],   m:'paint', c:0x2f7d3a},
      {s:'box', d:[1.20,0.80,1.20], p:[0,1.25,-0.55],  m:'paint', c:0x2f7d3a},
      {s:'box', d:[1.35,1.00,1.30], p:[0,2.10,-0.35],  m:'glass', nc:1},
      {s:'box', d:[1.50,0.16,1.45], p:[0,2.68,-0.35],  m:'paint', c:0xf2b21c},
      {s:'cyl', d:[0.09,0.80], p:[0.35,2.08,1.70],     m:'paint', c:0x2a2c30, nc:1},
      {s:'cyl', d:[0.85,0.45], p:[-0.82,0.85,-0.80], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.85,0.45], p:[ 0.82,0.85,-0.80], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.42,0.28], p:[-0.72,0.42, 1.55], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.42,0.28], p:[ 0.72,0.42, 1.55], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // autoelevador con mástil y uñas
  { id:'v_forklift', name:'Forklift', mass:2500, tags:['industrial','lift'], parts:[
      {s:'box', d:[1.15,0.78,2.10], p:[0,0.74,-0.25],  m:'paint', c:0xf2a11c},
      {s:'box', d:[1.05,2.10,0.16], p:[0,1.12,0.92],   m:'steel', c:0x40444a},
      {s:'box', d:[0.95,0.30,0.12], p:[0,0.40,1.02],   m:'steel', c:0x40444a, nc:1},
      {s:'box', d:[0.16,0.08,1.10], p:[-0.30,0.12,1.53], m:'steel', c:0x9aa0a8, nc:1},
      {s:'box', d:[0.16,0.08,1.10], p:[ 0.30,0.12,1.53], m:'steel', c:0x9aa0a8, nc:1},
      {s:'box', d:[0.10,1.05,0.12], p:[-0.50,1.64,-0.20], m:'steel', c:0x40444a, nc:1},
      {s:'box', d:[0.10,1.05,0.12], p:[ 0.50,1.64,-0.20], m:'steel', c:0x40444a, nc:1},
      {s:'box', d:[1.12,0.10,1.20], p:[0,2.21,-0.20],  m:'steel', c:0x40444a, nc:1},
      {s:'cyl', d:[0.30,0.24], p:[-0.50,0.30, 0.40], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.30,0.24], p:[ 0.50,0.30, 0.40], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.25,0.22], p:[-0.40,0.25,-1.05], r:[0,0,90], m:'rubber', c:0x22242a},
      {s:'cyl', d:[0.25,0.22], p:[ 0.40,0.25,-1.05], r:[0,0,90], m:'rubber', c:0x22242a},
  ]},

  // --------------------------------------------------------------- LIVIANOS
  // moto naked: cuadro, tanque, asiento y horquilla
  { id:'v_moto', name:'Motorcycle', mass:200, tags:['bike','moto'], parts:[
      {s:'box', d:[0.34,0.42,0.90], p:[0,0.62,0],      m:'paint', c:0x22242a},
      {s:'box', d:[0.30,0.26,0.55], p:[0,0.92,0.12],   m:'paint', c:0xd12b22},
      {s:'box', d:[0.28,0.14,0.52], p:[0,0.92,-0.42],  m:'fabric', c:0x1a1c20},
      {s:'box', d:[0.26,0.18,0.36], p:[0,1.02,-0.72],  m:'paint', c:0xd12b22, nc:1},
      {s:'box', d:[0.22,0.62,0.12], p:[0,0.86,0.72],   m:'paint', c:0x9aa0a8, nc:1},
      {s:'box', d:[0.72,0.06,0.08], p:[0,1.14,0.62],   m:'paint', c:0x2a2c30, nc:1},
      {s:'cyl', d:[0.32,0.14], p:[0,0.32, 0.82], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.34,0.17], p:[0,0.34,-0.72], r:[0,0,90], m:'rubber', c:0x1d1f24},
  ]},

  // scooter con escudo frontal y parabrisas
  { id:'v_scooter', name:'Scooter', mass:110, tags:['bike','scooter'], parts:[
      {s:'box', d:[0.36,0.26,1.10], p:[0,0.41,-0.10],  m:'plastic', c:0x4a9bd8},
      {s:'box', d:[0.34,0.60,0.18], p:[0,0.78,0.50],   m:'plastic', c:0x4a9bd8},
      {s:'box', d:[0.44,0.36,0.72], p:[0,0.66,-0.50],  m:'plastic', c:0x4a9bd8},
      {s:'box', d:[0.30,0.13,0.56], p:[0,0.905,-0.44], m:'plastic', c:0x1c1e22},
      {s:'box', d:[0.64,0.07,0.09], p:[0,1.12,0.48],   m:'plastic', c:0x2a2c30, nc:1},
      {s:'box', d:[0.32,0.34,0.04], p:[0,1.25,0.54],   m:'glass', nc:1},
      {s:'cyl', d:[0.22,0.11], p:[0,0.22, 0.66], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.22,0.13], p:[0,0.22,-0.62], r:[0,0,90], m:'rubber', c:0x1d1f24},
  ]},

  // bicicleta de ruta: cuadro de caños, ruedas finas
  { id:'v_bike', name:'Bicycle', mass:12, col:'box', tags:['bike','cycle'], parts:[
      {s:'box', d:[0.06,0.72,0.08], p:[0,0.60,0.10],  r:[40,0,0],  m:'steel', c:0xd12b22},
      {s:'box', d:[0.06,0.52,0.08], p:[0,0.72,-0.22], r:[-12,0,0], m:'steel', c:0xd12b22},
      {s:'box', d:[0.06,0.08,0.58], p:[0,0.94,-0.05],              m:'steel', c:0xd12b22},
      {s:'box', d:[0.06,0.08,0.62], p:[0,0.36,-0.35],              m:'steel', c:0xd12b22, nc:1},
      {s:'box', d:[0.06,0.66,0.08], p:[0,0.66,0.56],  r:[12,0,0],  m:'steel', c:0x9aa0a8, nc:1},
      {s:'box', d:[0.12,0.06,0.26], p:[0,1.01,-0.42],              m:'fabric', c:0x1a1c20, nc:1},
      {s:'box', d:[0.46,0.05,0.06], p:[0,1.00,0.48],               m:'steel', c:0x2a2c30, nc:1},
      {s:'cyl', d:[0.34,0.05], p:[0,0.34, 0.62], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.34,0.05], p:[0,0.34,-0.58], r:[0,0,90], m:'rubber', c:0x1d1f24},
  ]},

  // cuatriciclo utilitario con parrillas
  { id:'v_quad', name:'Quadbike', mass:320, tags:['atv','quad'], parts:[
      {s:'box', d:[0.72,0.36,1.55], p:[0,0.58,0],      m:'plastic', c:0xd94f3a},
      {s:'box', d:[0.42,0.18,0.62], p:[0,0.86,-0.22],  m:'plastic', c:0x1c1e22},
      {s:'box', d:[1.06,0.16,0.55], p:[0,0.78,0.62],   m:'plastic', c:0xd94f3a, nc:1},
      {s:'box', d:[1.00,0.14,0.50], p:[0,0.86,-0.72],  m:'plastic', c:0x2a2c30, nc:1},
      {s:'box', d:[0.10,0.42,0.10], p:[0,0.97,0.36],   m:'steel', c:0x40444a, nc:1},
      {s:'box', d:[0.78,0.07,0.09], p:[0,1.18,0.34],   m:'steel', c:0x2a2c30, nc:1},
      {s:'cyl', d:[0.31,0.24], p:[-0.48,0.31, 0.66], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.31,0.24], p:[ 0.48,0.31, 0.66], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.31,0.24], p:[-0.48,0.31,-0.66], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.31,0.24], p:[ 0.48,0.31,-0.66], r:[0,0,90], m:'rubber', c:0x1d1f24},
  ]},

  // carrito de golf con techo sobre 4 parantes
  { id:'v_golfcart', name:'GolfCart', mass:400, tags:['cart','golf'], parts:[
      {s:'box', d:[1.20,0.30,2.30], p:[0,0.42,0],      m:'plastic', c:0xe8e8e6},
      {s:'box', d:[1.10,0.16,0.55], p:[0,0.65,-0.20],  m:'plastic', c:0x2f6fb0},
      {s:'box', d:[1.10,0.55,0.14], p:[0,1.00,-0.52],  m:'plastic', c:0x2f6fb0},
      {s:'box', d:[1.24,0.09,1.55], p:[0,1.78,-0.10],  m:'plastic', c:0xe8e8e6},
      {s:'box', d:[0.08,1.20,0.08], p:[-0.55,1.14, 0.62], m:'plastic', c:0xdcdcda, nc:1},
      {s:'box', d:[0.08,1.20,0.08], p:[ 0.55,1.14, 0.62], m:'plastic', c:0xdcdcda, nc:1},
      {s:'box', d:[0.08,1.20,0.08], p:[-0.55,1.14,-0.62], m:'plastic', c:0xdcdcda, nc:1},
      {s:'box', d:[0.08,1.20,0.08], p:[ 0.55,1.14,-0.62], m:'plastic', c:0xdcdcda, nc:1},
      {s:'box', d:[1.14,0.55,0.05], p:[0,1.36,0.64],   m:'glass', nc:1},
      {s:'cyl', d:[0.25,0.18], p:[-0.52,0.25, 0.80], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.25,0.18], p:[ 0.52,0.25, 0.80], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.25,0.18], p:[-0.52,0.25,-0.80], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.25,0.18], p:[ 0.52,0.25,-0.80], r:[0,0,90], m:'rubber', c:0x1d1f24},
  ]},

  // kart de pista: chasis bajo, pontones, motor al costado
  { id:'v_kart', name:'GoKart', mass:160, tags:['kart','race'], parts:[
      {s:'box', d:[0.70,0.10,1.60], p:[0,0.10,0],      m:'steel', c:0x33363b},
      {s:'box', d:[1.20,0.22,0.85], p:[0,0.26,-0.05],  m:'plastic', c:0xd94f3a, nc:1},
      {s:'box', d:[0.90,0.18,0.45], p:[0,0.22,0.85],   m:'plastic', c:0xd94f3a, nc:1},
      {s:'box', d:[0.42,0.42,0.40], p:[0,0.36,-0.20],  m:'plastic', c:0x1c1e22},
      {s:'box', d:[0.30,0.05,0.16], p:[0,0.58,0.42], r:[-25,0,0], m:'plastic', c:0x2a2c30, nc:1},
      {s:'box', d:[0.07,0.30,0.08], p:[0,0.43,0.50],   m:'steel', c:0x40444a, nc:1},
      {s:'box', d:[0.28,0.30,0.36], p:[0.42,0.32,-0.42], m:'steel', c:0x9aa0a8, nc:1},
      {s:'box', d:[1.10,0.08,0.10], p:[0,0.17,-0.72],  m:'steel', c:0x40444a, nc:1},
      {s:'cyl', d:[0.14,0.12], p:[-0.52,0.14, 0.62], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.14,0.12], p:[ 0.52,0.14, 0.62], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.17,0.21], p:[-0.54,0.17,-0.72], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.17,0.21], p:[ 0.54,0.17,-0.72], r:[0,0,90], m:'rubber', c:0x1d1f24},
  ]},

  // ------------------------------------------------------------ AGUA / AIRE
  // lancha deportiva con motor fuera de borda
  { id:'v_boat', name:'SpeedBoat', mass:1100, tags:['water','boat'], parts:[
      {s:'box', d:[1.55,0.40,4.60], p:[0,0.20,0],      m:'plastic', c:0xe9eaec},
      {s:'box', d:[2.00,0.55,5.40], p:[0,0.675,0],     m:'plastic', c:0xe9eaec},
      {s:'box', d:[1.90,0.14,2.10], p:[0,1.02,1.55],   m:'plastic', c:0xe9eaec},
      {s:'box', d:[1.60,0.42,0.10], p:[0,1.30,0.45],   m:'glass', nc:1},
      {s:'box', d:[1.40,0.16,0.55], p:[0,1.03,-0.35],  m:'plastic', c:0x2a4a7a, nc:1},
      {s:'box', d:[1.30,0.40,0.90], p:[0,1.15,-2.05],  m:'plastic', c:0x2a4a7a},
      {s:'box', d:[2.02,0.16,4.60], p:[0,0.62,0],      m:'plastic', c:0x2a4a7a, nc:1},
      {s:'box', d:[0.42,0.70,0.45], p:[0,0.75,-2.72],  m:'metal', c:0x33363b, nc:1},
  ]},

  // moto de agua
  { id:'v_jetski', name:'JetSki', mass:350, tags:['water','jetski'], parts:[
      {s:'box', d:[1.10,0.50,2.90], p:[0,0.25,0],      m:'plastic', c:0xe9eaec},
      {s:'box', d:[1.15,0.28,2.60], p:[0,0.64,-0.10],  m:'plastic', c:0x1f6fb5},
      {s:'box', d:[0.62,0.22,1.05], p:[0,0.89,-0.55],  m:'plastic', c:0x1c1e22},
      {s:'box', d:[0.85,0.32,0.95], p:[0,0.94,0.85],   m:'plastic', c:0x1f6fb5},
      {s:'box', d:[0.70,0.07,0.09], p:[0,1.16,0.30],   m:'plastic', c:0x2a2c30, nc:1},
      {s:'box', d:[0.42,0.22,0.05], p:[0,1.20,0.72],   m:'glass', nc:1},
  ]},

  // helicóptero liviano: patines, cola larga, rotor decorativo
  { id:'v_heli', name:'Helicopter', mass:900, tags:['air','heli'], parts:[
      {s:'box', d:[1.55,1.30,2.35], p:[0,1.30,0.85],   m:'paint', c:0xd94f3a},
      {s:'box', d:[1.45,0.95,1.30], p:[0,1.45,1.50],   m:'glass', nc:1},
      {s:'box', d:[0.34,0.34,3.90], p:[0,1.55,-2.30],  m:'paint', c:0xd94f3a},
      {s:'box', d:[0.10,0.85,0.60], p:[0,2.05,-4.05],  m:'paint', c:0xd94f3a, nc:1},
      {s:'box', d:[0.06,1.10,0.14], p:[0.22,2.00,-3.95], m:'metal', c:0x2a2c30, nc:1},
      {s:'cyl', d:[0.11,0.45], p:[0,2.15,0.60],        m:'metal', c:0x33363b, nc:1},
      {s:'box', d:[8.20,0.07,0.36], p:[0,2.42,0.60],   m:'metal', c:0x33363b, nc:1},
      {s:'box', d:[0.36,0.07,8.20], p:[0,2.42,0.60],   m:'metal', c:0x33363b, nc:1},
      {s:'box', d:[0.12,0.10,2.30], p:[-0.72,0.05,0.70], m:'metal', c:0x9aa0a8},
      {s:'box', d:[0.12,0.10,2.30], p:[ 0.72,0.05,0.70], m:'metal', c:0x9aa0a8},
      {s:'box', d:[1.60,0.55,0.12], p:[0,0.37,1.35],   m:'metal', c:0x9aa0a8, nc:1},
      {s:'box', d:[1.60,0.55,0.12], p:[0,0.37,0.10],   m:'metal', c:0x9aa0a8, nc:1},
  ]},

  // avioneta de ala alta con tren triciclo — 11 m de envergadura
  { id:'v_plane', name:'LightPlane', mass:900, tags:['air','plane'], parts:[
      {s:'box', d:[1.15,1.20,6.60], p:[0,1.35,0.30],   m:'paint', c:0xe9eaec},
      {s:'box', d:[1.10,0.60,1.50], p:[0,1.82,2.35],   m:'glass', nc:1},
      {s:'box', d:[1.00,0.85,1.10], p:[0,1.35,3.90],   m:'paint', c:0xe9eaec},
      {s:'box', d:[11.00,0.20,1.55],p:[0,2.05,1.30],   m:'paint', c:0xe9eaec},
      {s:'box', d:[0.12,1.10,1.20], p:[0,2.45,-3.10],  m:'paint', c:0x2f6fb0, nc:1},
      {s:'box', d:[3.60,0.14,0.90], p:[0,1.90,-3.20],  m:'paint', c:0xe9eaec, nc:1},
      {s:'box', d:[0.14,2.00,0.08], p:[0,1.35,4.50],   m:'paint', c:0x2a2c30, nc:1},
      {s:'box', d:[0.10,0.55,0.35], p:[-1.55,1.68,1.30], m:'paint', c:0xe9eaec, nc:1},
      {s:'box', d:[0.10,0.55,0.35], p:[ 1.55,1.68,1.30], m:'paint', c:0xe9eaec, nc:1},
      {s:'box', d:[2.20,0.50,0.14], p:[0,0.50,1.10],   m:'paint', c:0x9aa0a8, nc:1},
      {s:'cyl', d:[0.28,0.14], p:[-1.05,0.28,1.10], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.28,0.14], p:[ 1.05,0.28,1.10], r:[0,0,90], m:'rubber', c:0x1d1f24},
      {s:'cyl', d:[0.22,0.12], p:[0,0.22,3.55],     r:[0,0,90], m:'rubber', c:0x1d1f24},
  ]},

]);
