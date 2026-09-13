/* props/fun.js — juguetes, deportes, plaza y comida gigante.
   y=0 = piso del objeto, centrado en X/Z. Sólo datos. */
HP.section('fun','Fun','acc',[

  /* ---------------------------------------------------------------- deportes */

  // pelota de fútbol: esfera + parches (discos apenas salientes)
  { id:'f_ball_soccer', name:'SoccerBall', mass:.5, col:'sph', tags:['ball','sport','soccer'], parts:[
      {s:'sph', d:[.11],      p:[0,.11,0],    m:'plastic', c:0xf4f4f2},
      {s:'cyl', d:[.038,.012],p:[0,.215,0],   m:'plastic', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.038,.012],p:[0,.11,.104], r:[90,0,0], m:'plastic', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.038,.012],p:[0,.11,-.104],r:[90,0,0], m:'plastic', c:0x1b1d22, nc:1},
  ]},

  // pelota de básquet: esfera + 3 costuras (discos de radio apenas mayor)
  { id:'f_ball_basket', name:'Basketball', mass:.62, col:'sph', tags:['ball','sport','basket'], parts:[
      {s:'sph', d:[.12],       p:[0,.12,0], m:'rubber', c:0xd9691f},
      {s:'cyl', d:[.1215,.007],p:[0,.12,0], m:'rubber', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.1215,.007],p:[0,.12,0], r:[90,0,0],  m:'rubber', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.1215,.007],p:[0,.12,0], r:[90,90,0], m:'rubber', c:0x1b1d22, nc:1},
  ]},

  // tubo de 3 pelotas de tenis
  { id:'f_tennis_can', name:'TennisBalls', mass:.5, col:'cyl', tags:['tennis','ball','can'], parts:[
      {s:'cyl', d:[.038,.22], p:[0,.11,0],   m:'glass',   c:0xdfe9c8, nc:1},
      {s:'sph', d:[.033],     p:[0,.04,0],   m:'fabric',  c:0xd7e64b},
      {s:'sph', d:[.033],     p:[0,.107,0],  m:'fabric',  c:0xd7e64b},
      {s:'sph', d:[.033],     p:[0,.174,0],  m:'fabric',  c:0xd7e64b},
      {s:'cyl', d:[.041,.022],p:[0,.229,0],  m:'plastic', c:0xf2f2f2, nc:1},
  ]},

  // set de bowling: bola + 3 pinos en triángulo
  { id:'f_bowl_set', name:'BowlingSet', mass:12, tags:['bowling','ball','pins'], parts:[
      {s:'sph', d:[.1085],       p:[0,.1085,.58], m:'rubber',  c:0x2b2f9e},
      {s:'cyl', d:[.04,.06,.28], p:[0,.14,-.15],  m:'plastic', c:0xf4f4f2},
      {s:'sph', d:[.045],        p:[0,.30,-.15],  m:'plastic', c:0xf4f4f2},
      {s:'cyl', d:[.04,.06,.28], p:[-.18,.14,-.45], m:'plastic', c:0xf4f4f2},
      {s:'sph', d:[.045],        p:[-.18,.30,-.45], m:'plastic', c:0xf4f4f2},
      {s:'cyl', d:[.04,.06,.28], p:[.18,.14,-.45],  m:'plastic', c:0xf4f4f2},
      {s:'sph', d:[.045],        p:[.18,.30,-.45],  m:'plastic', c:0xf4f4f2},
  ]},

  // aro de básquet: aro a 3.05 m, tablero y red
  { id:'f_hoop', name:'BasketHoop', mass:140, tags:['basket','hoop','sport'], parts:[
      {s:'box', d:[.9,.12,.9],    p:[0,.06,-.5],    m:'steel'},
      {s:'cyl', d:[.075,3.55],    p:[0,1.775,-.5],  m:'steel'},
      {s:'box', d:[.12,.12,.5],   p:[0,3.35,-.25],  m:'steel', nc:1},
      {s:'box', d:[1.8,1.05,.05], p:[0,3.45,0],     m:'glass', c:0xdfeaf2, nc:1},
      {s:'cyl', d:[.23,.028],     p:[0,3.05,.26],   m:'steel', c:0xf2621b, nc:1},
      {s:'cone',d:[.21,.4],       p:[0,2.85,.26],   r:[180,0,0], m:'fabric', c:0xf2f2f2, nc:1},
  ]},

  // arco de fútbol chico (3 x 2 m) con red
  { id:'f_goal', name:'SoccerGoal', mass:45, tags:['soccer','goal','sport'], parts:[
      {s:'cyl', d:[.06,2.0],   p:[-1.5,1,0],    m:'plastic', c:0xf4f4f2},
      {s:'cyl', d:[.06,2.0],   p:[1.5,1,0],     m:'plastic', c:0xf4f4f2},
      {s:'box', d:[3.12,.1,.1],p:[0,1.95,0],    m:'plastic', c:0xf4f4f2},
      {s:'box', d:[3,.06,.06], p:[0,.03,-.8],   m:'plastic', c:0xf4f4f2},
      {s:'box', d:[3,2,.02],   p:[0,1,-.8],     m:'fabric',  c:0xe8e8e8, nc:1},
      {s:'box', d:[.02,2,.8],  p:[-1.5,1,-.4],  m:'fabric',  c:0xe8e8e8, nc:1},
      {s:'box', d:[.02,2,.8],  p:[1.5,1,-.4],   m:'fabric',  c:0xe8e8e8, nc:1},
  ]},

  // mesa de ping pong 2.74 x 1.525, alto .76
  { id:'f_pingpong', name:'PingPongTable', mass:70, tags:['table','pingpong','sport'], parts:[
      {s:'box', d:[1.525,.04,2.74], p:[0,.74,0],  m:'paint', c:0x1b4f8f},
      {s:'box', d:[.1,.72,1.2],     p:[-.66,.36,0], m:'metal', c:0x3a3f47},
      {s:'box', d:[.1,.72,1.2],     p:[.66,.36,0],  m:'metal', c:0x3a3f47},
      {s:'box', d:[1.7,.16,.02],    p:[0,.84,0],  m:'fabric', c:0x1d2026, nc:1},
      {s:'box', d:[.03,.006,2.7],   p:[0,.763,0], m:'paint',  c:0xf4f4f2, nc:1},
  ]},

  // paleta de ping pong apoyada
  { id:'f_paddle', name:'PingPongPaddle', mass:.5, tags:['pingpong','paddle'], parts:[
      {s:'cyl', d:[.083,.014],  p:[0,.007,.04],  m:'plank',  c:0xc9a06a},
      {s:'cyl', d:[.079,.005],  p:[0,.0165,.04], m:'rubber', c:0xb4231f, nc:1},
      {s:'box', d:[.032,.016,.11], p:[0,.008,.16], m:'plank', c:0x8a6a44},
  ]},

  /* ------------------------------------------------------------- rueditas */

  // monopatín
  { id:'f_scooter', name:'KickScooter', mass:4, tags:['scooter','toy','ride'], parts:[
      {s:'box', d:[.15,.045,.6], p:[0,.085,-.02], m:'metal', c:0x3a3f47},
      {s:'cyl', d:[.028,.92],    p:[0,.53,.3],  r:[8,0,0], m:'metal', c:0xb9bfc6},
      {s:'box', d:[.48,.045,.045],p:[0,.98,.235], m:'rubber', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.062,.03],    p:[0,.062,.36],  r:[0,0,90], m:'rubber', c:0x2a2d33},
      {s:'cyl', d:[.062,.03],    p:[0,.062,-.3],  r:[0,0,90], m:'rubber', c:0x2a2d33},
  ]},

  // patineta larga
  { id:'f_longboard', name:'Longboard', mass:4, tags:['skate','board','ride'], parts:[
      {s:'box', d:[.24,.025,1.05], p:[0,.115,0],   m:'wood', c:0xb98a54},
      {s:'box', d:[.22,.004,1.0],  p:[0,.13,0],    m:'rubber', c:0x1b1d22, nc:1},
      {s:'box', d:[.19,.03,.07],   p:[0,.085,.36], m:'metal', nc:1},
      {s:'box', d:[.19,.03,.07],   p:[0,.085,-.36],m:'metal', nc:1},
      {s:'cyl', d:[.035,.045], p:[-.1,.035,.36],  r:[0,0,90], m:'rubber', c:0xe4e0d4},
      {s:'cyl', d:[.035,.045], p:[.1,.035,.36],   r:[0,0,90], m:'rubber', c:0xe4e0d4},
      {s:'cyl', d:[.035,.045], p:[-.1,.035,-.36], r:[0,0,90], m:'rubber', c:0xe4e0d4},
      {s:'cyl', d:[.035,.045], p:[.1,.035,-.36],  r:[0,0,90], m:'rubber', c:0xe4e0d4},
  ]},

  // tabla de surf apoyada, nariz en punta (cajas giradas en Y)
  { id:'f_surfboard', name:'Surfboard', mass:8, tags:['surf','board','beach'], parts:[
      {s:'box', d:[.52,.07,1.3], p:[0,.055,-.1],   m:'plastic', c:0xf4f4f2},
      {s:'box', d:[.3,.07,.75],  p:[-.11,.055,.9], r:[0,-14,0], m:'plastic', c:0xf4f4f2},
      {s:'box', d:[.3,.07,.75],  p:[.11,.055,.9],  r:[0,14,0],  m:'plastic', c:0xf4f4f2},
      {s:'box', d:[.34,.07,.34], p:[0,.055,-.87],  m:'plastic', c:0xf4f4f2},
      {s:'box', d:[.03,.22,.2],  p:[0,.19,-.72],   m:'plastic', c:0x1b6ec2, nc:1},
      {s:'box', d:[.07,.006,1.9],p:[0,.093,0],     m:'paint',   c:0xd93b2b, nc:1},
  ]},

  /* ---------------------------------------------------------------- inflables y plaza */

  // pelota inflable gigante
  { id:'f_bigball', name:'GiantBall', mass:9, col:'sph', tags:['ball','inflatable','toy'], parts:[
      {s:'sph', d:[.9],       p:[0,.9,0], m:'plastic', c:0xe23b2b},
      {s:'cyl', d:[.905,.014],p:[0,.9,0], m:'plastic', c:0xf4f4f2, nc:1},
      {s:'cyl', d:[.905,.014],p:[0,.9,0], r:[90,0,0],  m:'plastic', c:0xf4f4f2, nc:1},
      {s:'cyl', d:[.905,.014],p:[0,.9,0], r:[90,90,0], m:'plastic', c:0xf4f4f2, nc:1},
  ]},

  // castillo inflable chico
  { id:'f_bouncy', name:'BouncyCastle', mass:110, tags:['inflatable','castle','kids'], parts:[
      {s:'box', d:[4,.5,4],     p:[0,.25,0],        m:'plastic', c:0xf2d43c},
      {s:'box', d:[4,1.9,.35],  p:[0,1.45,-1.82],   m:'plastic', c:0x2b6ee0},
      {s:'box', d:[.35,1.9,3.6],p:[-1.82,1.45,.2],  m:'plastic', c:0x2b6ee0},
      {s:'box', d:[.35,1.9,3.6],p:[1.82,1.45,.2],   m:'plastic', c:0x2b6ee0},
      {s:'cyl', d:[.34,1.0],    p:[-1.82,2.9,-1.82],m:'plastic', c:0xe23b2b, nc:1},
      {s:'cyl', d:[.34,1.0],    p:[1.82,2.9,-1.82], m:'plastic', c:0xe23b2b, nc:1},
      {s:'cone',d:[.4,.6],      p:[-1.82,3.7,-1.82],m:'plastic', c:0xf4f4f2, nc:1},
      {s:'cone',d:[.4,.6],      p:[1.82,3.7,-1.82], m:'plastic', c:0xf4f4f2, nc:1},
  ]},

  // tobogán de plaza: plataforma 1.5 m + rampa
  { id:'f_slide', name:'Slide01', mass:130, tags:['playground','slide','kids'], parts:[
      {s:'box', d:[.74,.07,3.5], p:[0,.82,1.35], r:[24,0,0], m:'metal', c:0xf2d43c},
      {s:'box', d:[.05,.3,3.5],  p:[-.4,.98,1.35],r:[24,0,0], m:'metal', c:0x2b6ee0, nc:1},
      {s:'box', d:[.05,.3,3.5],  p:[.4,.98,1.35], r:[24,0,0], m:'metal', c:0x2b6ee0, nc:1},
      {s:'box', d:[.8,.08,.75],  p:[0,1.5,-.52],  m:'metal', c:0xe23b2b},
      {s:'box', d:[.08,1.5,.08], p:[-.36,.75,-.85],m:'metal', c:0x9aa0a8},
      {s:'box', d:[.08,1.5,.08], p:[.36,.75,-.85], m:'metal', c:0x9aa0a8},
      {s:'box', d:[.72,.05,.2],  p:[0,.5,-.85],   m:'metal', c:0x9aa0a8, nc:1},
      {s:'box', d:[.72,.05,.2],  p:[0,1.0,-.85],  m:'metal', c:0x9aa0a8, nc:1},
  ]},

  // hamaca de plaza: dos A-frames, travesaño, cadenas y asiento
  { id:'f_swing', name:'Swing01', mass:85, tags:['playground','swing','kids'], parts:[
      {s:'box', d:[.09,2.2,.09], p:[-.85,1.08,-.45], r:[18,0,0],  m:'metal', c:0x2b6ee0},
      {s:'box', d:[.09,2.2,.09], p:[-.85,1.08,.45],  r:[-18,0,0], m:'metal', c:0x2b6ee0},
      {s:'box', d:[.09,2.2,.09], p:[.85,1.08,-.45],  r:[18,0,0],  m:'metal', c:0x2b6ee0},
      {s:'box', d:[.09,2.2,.09], p:[.85,1.08,.45],   r:[-18,0,0], m:'metal', c:0x2b6ee0},
      {s:'box', d:[2.0,.1,.1],   p:[0,2.12,0],       m:'metal', c:0x2b6ee0},
      {s:'cyl', d:[.02,1.5],     p:[-.24,1.32,0],    m:'chrome', nc:1},
      {s:'cyl', d:[.02,1.5],     p:[.24,1.32,0],     m:'chrome', nc:1},
      {s:'box', d:[.46,.05,.18], p:[0,.55,0],        m:'rubber', c:0x1b1d22},
  ]},

  // sube y baja
  { id:'f_seesaw', name:'SeeSaw01', mass:65, tags:['playground','seesaw','kids'], parts:[
      {s:'box', d:[.5,.5,.4],    p:[0,.25,0],      m:'metal', c:0x3a3f47},
      {s:'cyl', d:[.07,.44],     p:[0,.5,0],  r:[0,0,90], m:'chrome', nc:1},
      {s:'box', d:[.32,.08,3.0], p:[0,.55,0], r:[7,0,0],  m:'plank', c:0xe23b2b},
      {s:'box', d:[.3,.05,.3],   p:[0,.41,1.33], r:[7,0,0], m:'plank', c:0xf2d43c},
      {s:'box', d:[.3,.05,.3],   p:[0,.74,-1.33],r:[7,0,0], m:'plank', c:0xf2d43c},
      {s:'cyl', d:[.03,.34],     p:[0,.6,1.13],  r:[0,0,90], m:'chrome', nc:1},
      {s:'cyl', d:[.03,.34],     p:[0,.93,-1.13],r:[0,0,90], m:'chrome', nc:1},
  ]},

  // cama elástica redonda
  { id:'f_tramp', name:'Trampoline', mass:95, col:'cyl', tags:['trampoline','jump','kids'], parts:[
      {s:'cyl', d:[1.5,.14],  p:[0,.87,0],   m:'plastic', c:0x1b4f8f},
      {s:'cyl', d:[1.34,.07], p:[0,.925,0],  m:'fabric',  c:0x22252b},
      {s:'cyl', d:[.05,.87],  p:[-.95,.435,-.95], m:'metal', c:0x9aa0a8},
      {s:'cyl', d:[.05,.87],  p:[.95,.435,-.95],  m:'metal', c:0x9aa0a8},
      {s:'cyl', d:[.05,.87],  p:[-.95,.435,.95],  m:'metal', c:0x9aa0a8},
      {s:'cyl', d:[.05,.87],  p:[.95,.435,.95],   m:'metal', c:0x9aa0a8},
  ]},

  // pileta inflable hexagonal
  { id:'f_pool', name:'KiddiePool', mass:15, tags:['pool','inflatable','water'], parts:[
      {s:'cyl', d:[1.0,.05],      p:[0,.025,0],     m:'plastic', c:0xf4f4f2},
      {s:'box', d:[1.15,.42,.16], p:[0,.21,.95],    m:'plastic', c:0x2fa7e0},
      {s:'box', d:[1.15,.42,.16], p:[.823,.21,.475],  r:[0,60,0],  m:'plastic', c:0x2fa7e0},
      {s:'box', d:[1.15,.42,.16], p:[.823,.21,-.475], r:[0,120,0], m:'plastic', c:0x2fa7e0},
      {s:'box', d:[1.15,.42,.16], p:[0,.21,-.95],     r:[0,180,0], m:'plastic', c:0x2fa7e0},
      {s:'box', d:[1.15,.42,.16], p:[-.823,.21,-.475],r:[0,240,0], m:'plastic', c:0x2fa7e0},
      {s:'box', d:[1.15,.42,.16], p:[-.823,.21,.475], r:[0,300,0], m:'plastic', c:0x2fa7e0},
      {s:'cyl', d:[.93,.3],       p:[0,.2,0],       m:'glass', c:0x2fd0e0, nc:1},
  ]},

  /* ---------------------------------------------------------------- juguetes */

  // dado gigante 1.2 m
  { id:'f_dice', name:'GiantDice', mass:30, col:'box', tags:['dice','cube','toy'], parts:[
      {s:'box', d:[1.2,1.2,1.2], p:[0,.6,0],   m:'plastic', c:0xf4f4f2},
      {s:'cyl', d:[.14,.03],     p:[0,1.2,0],  m:'plastic', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.14,.03],     p:[-.3,.9,.6], r:[90,0,0], m:'plastic', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.14,.03],     p:[0,.6,.6],   r:[90,0,0], m:'plastic', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.14,.03],     p:[.3,.3,.6],  r:[90,0,0], m:'plastic', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.14,.03],     p:[.6,.88,-.26], r:[0,0,90], m:'plastic', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.14,.03],     p:[.6,.32,.26],  r:[0,0,90], m:'plastic', c:0x1b1d22, nc:1},
  ]},

  // pieza de Jenga gigante
  { id:'f_jenga', name:'JengaBlock', mass:9, col:'box', tags:['jenga','block','wood'], parts:[
      {s:'box', d:[.6,.12,.2],    p:[0,.06,0],   m:'plank', c:0xd9b877},
      {s:'box', d:[.008,.115,.195],p:[-.3,.06,0], m:'wood', c:0xa8794a, nc:1},
      {s:'box', d:[.008,.115,.195],p:[.3,.06,0],  m:'wood', c:0xa8794a, nc:1},
  ]},

  // ladrillo tipo Lego gigante 2x3
  { id:'f_lego', name:'LegoBrick', mass:5, tags:['lego','brick','block','toy'], parts:[
      {s:'box', d:[.48,.32,.32], p:[0,.16,0],     m:'plastic', c:0xe23b2b},
      {s:'cyl', d:[.06,.06],     p:[-.16,.35,-.08], m:'plastic', c:0xe23b2b},
      {s:'cyl', d:[.06,.06],     p:[0,.35,-.08],    m:'plastic', c:0xe23b2b},
      {s:'cyl', d:[.06,.06],     p:[.16,.35,-.08],  m:'plastic', c:0xe23b2b},
      {s:'cyl', d:[.06,.06],     p:[-.16,.35,.08],  m:'plastic', c:0xe23b2b},
      {s:'cyl', d:[.06,.06],     p:[0,.35,.08],     m:'plastic', c:0xe23b2b},
      {s:'cyl', d:[.06,.06],     p:[.16,.35,.08],   m:'plastic', c:0xe23b2b},
  ]},

  /* ---------------------------------------------------------------- comida */

  // banana gigante curvada (cajas giradas en Y)
  { id:'f_banana', name:'Banana', mass:12, tags:['food','fruit','banana'], parts:[
      {s:'box', d:[.55,.24,.24], p:[0,.12,.1],    m:'plastic', c:0xf2d43c},
      {s:'box', d:[.45,.22,.22], p:[-.46,.11,.04],r:[0,-25,0], m:'plastic', c:0xf2d43c},
      {s:'box', d:[.45,.22,.22], p:[.46,.11,.04], r:[0,25,0],  m:'plastic', c:0xf2d43c},
      {s:'box', d:[.26,.16,.16], p:[-.8,.08,-.12],r:[0,-45,0], m:'plastic', c:0x6b4a1e},
      {s:'box', d:[.26,.16,.16], p:[.8,.08,-.12], r:[0,45,0],  m:'plastic', c:0x6b4a1e},
  ]},

  // sandía con rayas
  { id:'f_melon', name:'Watermelon', mass:9, col:'sph', tags:['food','fruit','melon'], parts:[
      {s:'sph', d:[.15],       p:[0,.15,0], m:'plastic', c:0x2e7d32},
      {s:'cyl', d:[.153,.014], p:[0,.15,0], r:[90,0,0],  m:'plastic', c:0x14421a, nc:1},
      {s:'cyl', d:[.153,.014], p:[0,.15,0], r:[90,60,0], m:'plastic', c:0x14421a, nc:1},
      {s:'cyl', d:[.153,.014], p:[0,.15,0], r:[90,-60,0],m:'plastic', c:0x14421a, nc:1},
      {s:'cyl', d:[.018,.07],  p:[0,.32,0], m:'wood', c:0x6b5a2e, nc:1},
  ]},

  // hamburguesa gigante
  { id:'f_burger', name:'BigBurger', mass:35, tags:['food','burger','giant'], parts:[
      {s:'cyl', d:[.55,.14],     p:[0,.07,0],  m:'plastic', c:0xd9a05b},
      {s:'cyl', d:[.57,.13],     p:[0,.205,0], m:'rubber',  c:0x4a2b16},
      {s:'box', d:[.92,.03,.92], p:[0,.285,0], r:[0,22,0], m:'plastic', c:0xf2b21b, nc:1},
      {s:'cyl', d:[.63,.06],     p:[0,.33,0],  m:'plastic', c:0x4caf50, nc:1},
      {s:'cyl', d:[.44,.57,.22], p:[0,.47,0],  m:'plastic', c:0xd9a05b},
      {s:'sph', d:[.24],         p:[0,.62,0],  m:'plastic', c:0xd9a05b, nc:1},
  ]},

  // cono de helado gigante, 3 bochas
  { id:'f_icecream', name:'IceCream', mass:28, tags:['food','icecream','giant'], parts:[
      {s:'cone',d:[.3,.95], p:[0,.475,0], r:[180,0,0], m:'cardboard', c:0xd9a05b},
      {s:'sph', d:[.3],     p:[0,1.02,0], m:'plastic', c:0xf2e6d2},
      {s:'sph', d:[.26],    p:[0,1.45,0], m:'plastic', c:0xd94f7a},
      {s:'sph', d:[.22],    p:[0,1.8,0],  m:'plastic', c:0x6b4a1e, nc:1},
      {s:'sph', d:[.09],    p:[0,2.05,0], m:'plastic', c:0xd93b2b, nc:1},
  ]},

  // pizza grande con pepperoni
  { id:'f_pizza', name:'Pizza', mass:4, col:'cyl', tags:['food','pizza'], parts:[
      {s:'cyl', d:[.45,.05],  p:[0,.025,0],   m:'plastic', c:0xd9a05b},
      {s:'cyl', d:[.4,.025],  p:[0,.062,0],   m:'plastic', c:0xe0a53b, nc:1},
      {s:'cyl', d:[.07,.014], p:[.18,.082,0], m:'plastic', c:0xc0392b, nc:1},
      {s:'cyl', d:[.07,.014], p:[-.18,.082,.06], m:'plastic', c:0xc0392b, nc:1},
      {s:'cyl', d:[.07,.014], p:[.05,.082,.2],   m:'plastic', c:0xc0392b, nc:1},
      {s:'cyl', d:[.07,.014], p:[-.05,.082,-.2], m:'plastic', c:0xc0392b, nc:1},
      {s:'cyl', d:[.07,.014], p:[.12,.082,-.13], m:'plastic', c:0xc0392b, nc:1},
  ]},

  // botella de gaseosa gigante
  { id:'f_soda', name:'SodaBottle', mass:150, tags:['food','bottle','soda','giant'], parts:[
      {s:'cyl', d:[.22,1.15],    p:[0,.575,0], m:'plastic', c:0x7a1f16},
      {s:'cyl', d:[.09,.22,.28], p:[0,1.29,0], m:'plastic', c:0x7a1f16},
      {s:'cyl', d:[.085,.16],    p:[0,1.51,0], m:'plastic', c:0x7a1f16},
      {s:'cyl', d:[.1,.13],      p:[0,1.655,0],m:'plastic', c:0xd93b2b},
      {s:'cyl', d:[.225,.45],    p:[0,.62,0],  m:'paint',   c:0xf4f4f2, nc:1},
  ]},

  // torta de dos pisos con velitas
  { id:'f_cake', name:'Cake', mass:16, tags:['food','cake','party'], parts:[
      {s:'cyl', d:[.3,.18],  p:[0,.09,0],   m:'plastic', c:0xf2e6d2},
      {s:'cyl', d:[.19,.15], p:[0,.255,0],  m:'plastic', c:0xf7c8d8},
      {s:'cyl', d:[.2,.035], p:[0,.345,0],  m:'plastic', c:0xffffff, nc:1},
      {s:'sph', d:[.04],     p:[0,.385,0],  m:'plastic', c:0xd93b2b, nc:1},
      {s:'cyl', d:[.014,.11],p:[-.09,.40,0],m:'plastic', c:0x2b6ee0, nc:1},
      {s:'cyl', d:[.014,.11],p:[.09,.40,0], m:'plastic', c:0x2b6ee0, nc:1},
      {s:'sph', d:[.018],    p:[-.09,.47,0],m:'neon', c:0xf2a81b, nc:1},
      {s:'sph', d:[.018],    p:[.09,.47,0], m:'neon', c:0xf2a81b, nc:1},
  ]},

  // pato de goma gigante
  { id:'f_duck', name:'RubberDuck', mass:20, tags:['duck','toy','bath'], parts:[
      {s:'sph', d:[.42], p:[0,.42,0],    m:'rubber', c:0xf2c31b},
      {s:'sph', d:[.26], p:[0,.95,.14],  m:'rubber', c:0xf2c31b},
      {s:'cone',d:[.1,.2],p:[0,.93,.44], r:[90,0,0], m:'rubber', c:0xf2801b, nc:1},
      {s:'sph', d:[.045],p:[-.09,1.03,.36], m:'rubber', c:0x1b1d22, nc:1},
      {s:'sph', d:[.045],p:[.09,1.03,.36],  m:'rubber', c:0x1b1d22, nc:1},
      {s:'cone',d:[.15,.3],p:[0,.62,-.36], r:[-35,0,0], m:'rubber', c:0xf2c31b, nc:1},
  ]},

  // muñeco de nieve
  { id:'f_snowman', name:'Snowman', mass:140, tags:['snow','winter','snowman'], parts:[
      {s:'sph', d:[.45],  p:[0,.45,0],  m:'plastic', c:0xf2f7ff},
      {s:'sph', d:[.33],  p:[0,1.08,0], m:'plastic', c:0xf2f7ff},
      {s:'sph', d:[.24],  p:[0,1.58,0], m:'plastic', c:0xf2f7ff},
      {s:'cone',d:[.055,.2], p:[0,1.58,.28], r:[90,0,0], m:'plastic', c:0xf2801b, nc:1},
      {s:'sph', d:[.033], p:[-.085,1.66,.19], m:'plastic', c:0x1b1d22, nc:1},
      {s:'sph', d:[.033], p:[.085,1.66,.19],  m:'plastic', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.27,.03], p:[0,1.79,0], m:'fabric', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.17,.24], p:[0,1.92,0], m:'fabric', c:0x1b1d22, nc:1},
      {s:'cyl', d:[.026,1.05],p:[0,1.15,0], r:[0,0,74], m:'wood', c:0x6b4a1e, nc:1},
  ]},

]);
