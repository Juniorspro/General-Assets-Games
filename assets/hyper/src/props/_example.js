/* EJEMPLO de referencia (no entra al build: los archivos que empiezan con _ se ignoran).
   Copiá este estilo: datos planos, y=0 = base del objeto, centrado en X/Z. */
HP.section('example','Ejemplo','acc',[

  // caja de madera con listones decorativos
  { id:'x_crate', name:'Crate', mass:14, tags:['wood','box'], parts:[
      {s:'box', d:[1.4,1.4,1.4], p:[0,.7,0], m:'wood'},
      {s:'box', d:[1.44,.1,.1],  p:[0,1.3,.7], m:'plank', c:0x8a6a44, nc:1},
      {s:'box', d:[1.44,.1,.1],  p:[0,.1,.7],  m:'plank', c:0x8a6a44, nc:1},
  ]},

  // barril: cilindro + dos aros
  { id:'x_barrel', name:'Barrel', mass:18, tags:['metal'], parts:[
      {s:'cyl', d:[.31,1.7], p:[0,.85,0], m:'rust'},
      {s:'cyl', d:[.33,.08], p:[0,1.2,0], m:'metal', nc:1},
      {s:'cyl', d:[.33,.08], p:[0,.5,0],  m:'metal', nc:1},
  ]},

  // cono de tránsito: base + cono (usa 'cone')
  { id:'x_cone', name:'Cone', mass:2, tags:['road'], parts:[
      {s:'box',  d:[.42,.06,.42], p:[0,.03,0], m:'rubber', c:0x22242a},
      {s:'cone', d:[.17,.62],     p:[0,.37,0], m:'plastic', c:0xf26a1b},
      {s:'cyl',  d:[.12,.06],     p:[0,.44,0], m:'plastic', c:0xf2f2f2, nc:1},
  ]},

  // silla de oficina: asiento, respaldo, pata y ruedas
  { id:'x_chair', name:'Chair', mass:9, tags:['interior'], parts:[
      {s:'box', d:[.5,.09,.5],  p:[0,.45,0],   m:'fabric', c:0x2b2f36},
      {s:'box', d:[.48,.55,.09],p:[0,.75,-.21],m:'fabric', c:0x2b2f36},
      {s:'cyl', d:[.05,.4],     p:[0,.24,0],   m:'chrome'},
      {s:'box', d:[.62,.06,.08],p:[0,.05,0],   m:'plastic', c:0x1d1f24, r:[0,45,0], nc:1},
      {s:'box', d:[.62,.06,.08],p:[0,.05,0],   m:'plastic', c:0x1d1f24, r:[0,-45,0], nc:1},
  ]},

  // ventanal: marco de metal + vidrio (col:'box' porque el compuesto no aporta nada)
  { id:'x_window', name:'WindowPane', mass:22, col:'box', tags:['building'], parts:[
      {s:'box', d:[1.6,.09,.09], p:[0,2.1,0], m:'steel'},
      {s:'box', d:[1.6,.09,.09], p:[0,.05,0], m:'steel'},
      {s:'box', d:[.09,2.1,.09], p:[-.75,1.05,0], m:'steel'},
      {s:'box', d:[.09,2.1,.09], p:[.75,1.05,0],  m:'steel'},
      {s:'box', d:[1.5,2,.04],   p:[0,1.05,0], m:'glass', nc:1},
  ]},

  // pelota (sph) — el radio va en d[0] y el centro a la altura del radio
  { id:'x_ball', name:'BeachBall', mass:3, tags:['toy'], parts:[
      {s:'sph', d:[.42], p:[0,.42,0], m:'plastic', c:0xff5a4f},
  ]},

]);
