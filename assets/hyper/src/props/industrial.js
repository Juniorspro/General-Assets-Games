/* props/industrial.js — Industrial: paneles, contenedores, obra, maquinaria.
   Todo apoyado en y=0, centrado en X/Z. Datos planos, sin three.js. */
HP.section('industrial','Industrial','acc',[

  /* ---------- paneles de pared / piso / techo ---------- */

  // panel metálico chico 1.2 x 2.4
  { id:'i_wall_12', name:'wall_12', mass:60, col:'box', tags:['wall','panel','metal'], parts:[
      {s:'box', d:[1.2,2.4,.1],   p:[0,1.2,0],    m:'metal', c:0xa8b0b8},
      {s:'box', d:[.1,2.4,.15],   p:[-.55,1.2,0], m:'steel', nc:1},
      {s:'box', d:[.1,2.4,.15],   p:[.55,1.2,0],  m:'steel', nc:1},
      {s:'box', d:[1.24,.09,.17], p:[0,2.44,0],   m:'steel', nc:1},
  ]},

  // panel metálico medio 1.5 x 3.0
  { id:'i_wall_15', name:'wall_15', mass:110, col:'box', tags:['wall','panel','metal'], parts:[
      {s:'box', d:[1.5,3,.12],    p:[0,1.5,0],     m:'steel', c:0x93999f},
      {s:'box', d:[.12,2.94,.06], p:[-.45,1.5,.09],m:'steel', nc:1},
      {s:'box', d:[.12,2.94,.06], p:[.45,1.5,.09], m:'steel', nc:1},
      {s:'box', d:[1.54,.12,.18], p:[0,.06,0],     m:'steel'},
      {s:'box', d:[1.54,.1,.18],  p:[0,2.95,0],    m:'steel', nc:1},
  ]},

  // panel de chapa grande 3.2 x 2.6
  { id:'i_wall_32', name:'wall_32', mass:260, col:'box', tags:['wall','panel','corrugated'], parts:[
      {s:'box', d:[3.2,2.6,.12],  p:[0,1.3,0],    m:'corrugated', c:0x7f8a93},
      {s:'box', d:[.14,2.6,.17],  p:[-1.6,1.3,0], m:'steel'},
      {s:'box', d:[.14,2.6,.17],  p:[1.6,1.3,0],  m:'steel'},
      {s:'box', d:[3.34,.14,.19], p:[0,2.67,0],   m:'steel', nc:1},
      {s:'box', d:[3.34,.12,.19], p:[0,.06,0],    m:'steel'},
  ]},

  // puerta de servicio con marco
  { id:'i_door_generic', name:'door_generic', mass:55, col:'box', tags:['door','steel'], parts:[
      {s:'box', d:[.1,2.25,.16],  p:[-.58,1.125,0],m:'steel'},
      {s:'box', d:[.1,2.25,.16],  p:[.58,1.125,0], m:'steel'},
      {s:'box', d:[1.26,.12,.16], p:[0,2.19,0],    m:'steel'},
      {s:'box', d:[1.02,2.1,.07], p:[0,1.05,.02],  m:'paint', c:0x4f5a63},
      {s:'box', d:[.5,.06,.06],   p:[.15,1.05,.09],m:'chrome', nc:1},
      {s:'box', d:[1,.22,.02],    p:[0,.14,.07],   m:'chrome', nc:1},
  ]},

  // chapa acanalada de techo, suelta
  { id:'i_roof_sheet', name:'RoofSheet', mass:18, col:'box', tags:['roof','sheet','corrugated'], parts:[
      {s:'box', d:[2.4,.05,1.05], p:[0,.025,0],  m:'corrugated', c:0x8f9aa2},
      {s:'box', d:[.1,.06,1.05],  p:[-.8,.07,0], m:'corrugated', nc:1},
      {s:'box', d:[.1,.06,1.05],  p:[0,.07,0],   m:'corrugated', nc:1},
      {s:'box', d:[.1,.06,1.05],  p:[.8,.07,0],  m:'corrugated', nc:1},
  ]},

  // losa de hormigón prefabricada
  { id:'i_floor_slab', name:'FloorSlab', mass:2400, col:'box', tags:['floor','slab','concrete'], parts:[
      {s:'box', d:[2.4,.18,2.4],   p:[0,.09,0],    m:'concrete'},
      {s:'box', d:[2.24,.03,2.24], p:[0,.195,0],   m:'concrete', c:0x9e9e9a, nc:1},
      {s:'box', d:[.18,.06,.05],   p:[-.6,.21,0],  m:'steel', nc:1},
      {s:'box', d:[.18,.06,.05],   p:[.6,.21,0],   m:'steel', nc:1},
  ]},

  /* ---------- señalización / obra ---------- */

  // cono de tránsito
  { id:'i_cone01', name:'Cone01', mass:2, tags:['cone','road','work'], parts:[
      {s:'box',  d:[.4,.05,.4], p:[0,.025,0], m:'rubber', c:0x22242a},
      {s:'cone', d:[.16,.62],   p:[0,.36,0],  m:'plastic', c:0xf26a1b},
      {s:'cyl',  d:[.075,.09],  p:[0,.42,0],  m:'plastic', c:0xf2f2f2, nc:1},
  ]},

  // valla plástica de obra
  { id:'i_barier01', name:'Barier01', mass:22, tags:['barrier','work','plastic'], parts:[
      {s:'box', d:[2,.24,.09],   p:[0,.93,0],     m:'plastic', c:0xe8552b},
      {s:'box', d:[2,.22,.09],   p:[0,.55,0],     m:'plastic', c:0xf2f2f2},
      {s:'box', d:[.1,1.05,.46], p:[-.92,.525,0], m:'plastic', c:0xe8552b},
      {s:'box', d:[.1,1.05,.46], p:[.92,.525,0],  m:'plastic', c:0xe8552b},
      {s:'box', d:[.36,.1,.72],  p:[-.92,.05,0],  m:'rubber', c:0x2a2c32},
      {s:'box', d:[.36,.1,.72],  p:[.92,.05,0],   m:'rubber', c:0x2a2c32},
  ]},

  // barrera de hormigón New Jersey
  { id:'i_barrier_nj', name:'NewJersey', mass:1500, tags:['barrier','concrete','road'], parts:[
      {s:'box', d:[2,.18,.6],   p:[0,.09,0],   m:'concrete'},
      {s:'box', d:[2,.3,.42],   p:[0,.33,0],   m:'concrete'},
      {s:'box', d:[2,.42,.24],  p:[0,.69,0],   m:'concrete'},
      {s:'box', d:[2.04,.06,.28],p:[0,.93,0],  m:'concrete', c:0xb4b4ae, nc:1},
      {s:'box', d:[.2,.12,.03], p:[0,.75,.14], m:'plastic', c:0xffd23a, nc:1},
  ]},

  /* ---------- máquinas ---------- */

  // máquina expendedora
  { id:'i_vending', name:'VendingMachine', mass:300, tags:['machine','vending'], parts:[
      {s:'box', d:[.95,1.85,.78],p:[0,1,0],      m:'paint', c:0xc0392b},
      {s:'box', d:[.9,.1,.72],   p:[0,.05,0],    m:'plastic', c:0x22242a},
      {s:'box', d:[.6,1.3,.04],  p:[-.15,1.15,.4],m:'glass', nc:1},
      {s:'box', d:[.24,1.5,.05], p:[.31,1.1,.4], m:'plastic', c:0x2b2f36, nc:1},
      {s:'box', d:[.56,.18,.06], p:[-.15,.35,.41],m:'plastic', c:0x1c1e22, nc:1},
      {s:'box', d:[.88,.26,.05], p:[0,1.8,.4],   m:'plastic', c:0xf2f2f2, nc:1},
  ]},

  // surtidor de nafta sobre isla
  { id:'i_fuel_pump', name:'FuelPump', mass:200, tags:['fuel','pump','gas'], parts:[
      {s:'box', d:[1.1,.16,.7],  p:[0,.08,0],    m:'concrete'},
      {s:'box', d:[.6,1.5,.42],  p:[0,.91,0],    m:'paint', c:0xdfe3e6},
      {s:'box', d:[.44,.36,.05], p:[0,1.36,.22], m:'plastic', c:0x1c1e22, nc:1},
      {s:'box', d:[.8,.3,.14],   p:[0,1.81,0],   m:'plastic', c:0xe03a2f, nc:1},
      {s:'box', d:[.14,.34,.16], p:[.33,1.2,0],  m:'plastic', c:0x2b2f36, nc:1},
      {s:'box', d:[.08,.55,.08], p:[.33,.75,0],  m:'plastic', c:0x15161a, nc:1},
  ]},

  // generador diésel sobre skid
  { id:'i_generator', name:'DieselGen', mass:1300, tags:['generator','diesel','machine'], parts:[
      {s:'box', d:[2.2,.18,1.1], p:[0,.09,0],    m:'steel'},
      {s:'box', d:[2,1.05,1],    p:[0,.72,0],    m:'paint', c:0xd8a12a},
      {s:'box', d:[2.06,.08,1.06],p:[0,1.29,0],  m:'steel', nc:1},
      {s:'cyl', d:[.09,.55],     p:[.75,1.55,-.3],m:'metal', c:0x4a4a4a, nc:1},
      {s:'box', d:[.06,.7,.8],   p:[-1,.72,0],   m:'metal', c:0x3a3d42, nc:1},
      {s:'box', d:[.5,.4,.05],   p:[.4,.85,.52], m:'metal', c:0x2b2f36, nc:1},
  ]},

  // ventilación de techo tipo turbina
  { id:'i_roof_vent', name:'RoofVent', mass:22, tags:['vent','roof','hvac'], parts:[
      {s:'box',  d:[.8,.22,.8], p:[0,.11,0],  m:'metal', c:0x9aa1a8},
      {s:'cyl',  d:[.3,.24],    p:[0,.33,0],  m:'metal'},
      {s:'cyl',  d:[.34,.28],   p:[0,.58,0],  m:'chrome'},
      {s:'box',  d:[.68,.26,.05],p:[0,.58,0], m:'metal', r:[0,30,0], nc:1},
      {s:'cone', d:[.36,.14],   p:[0,.79,0],  m:'metal', nc:1},
      {s:'sph',  d:[.05],       p:[0,.88,0],  m:'chrome', nc:1},
  ]},

  /* ---------- contenedores ---------- */

  // contenedor 20' cerrado
  { id:'i_container1', name:'Container1', mass:1400, col:'box', tags:['container','cargo'], parts:[
      {s:'box', d:[6.05,2.4,2.44], p:[0,1.29,0],    m:'corrugated', c:0x2f5f8f},
      {s:'box', d:[6.05,.18,2.44], p:[0,.09,0],     m:'steel'},
      {s:'box', d:[6.05,.12,2.44], p:[0,2.53,0],    m:'steel', nc:1},
      {s:'box', d:[.06,2.3,2.3],   p:[3,1.29,0],    m:'steel', c:0x5a6670, nc:1},
      {s:'box', d:[.08,2.2,.1],    p:[3.04,1.29,-.5],m:'steel', nc:1},
      {s:'box', d:[.08,2.2,.1],    p:[3.04,1.29,.5], m:'steel', nc:1},
  ]},

  // contenedor 40' cerrado
  { id:'i_container2', name:'Container2', mass:2600, col:'box', tags:['container','cargo'], parts:[
      {s:'box', d:[12.03,2.4,2.44],p:[0,1.29,0],    m:'corrugated', c:0x9a4b3a},
      {s:'box', d:[12.03,.18,2.44],p:[0,.09,0],     m:'steel'},
      {s:'box', d:[12.03,.12,2.44],p:[0,2.53,0],    m:'steel', nc:1},
      {s:'box', d:[.06,2.3,2.3],   p:[5.98,1.29,0], m:'steel', c:0x5a6670, nc:1},
      {s:'box', d:[.08,2.2,.1],    p:[6.02,1.29,-.5],m:'steel', nc:1},
      {s:'box', d:[.08,2.2,.1],    p:[6.02,1.29,.5], m:'steel', nc:1},
  ]},

  // contenedor 20' con las puertas abiertas
  { id:'i_container1_op', name:'Container1Open', mass:1400, tags:['container','cargo','open'], parts:[
      {s:'box', d:[6.05,.2,2.44],  p:[0,.1,0],       m:'steel'},
      {s:'box', d:[6.05,2.39,.12], p:[0,1.4,-1.16],  m:'corrugated', c:0x3f7a4a},
      {s:'box', d:[6.05,2.39,.12], p:[0,1.4,1.16],   m:'corrugated', c:0x3f7a4a},
      {s:'box', d:[.12,2.39,2.32], p:[-2.97,1.4,0],  m:'corrugated', c:0x3f7a4a},
      {s:'box', d:[6.05,.12,2.44], p:[0,2.53,0],     m:'corrugated', c:0x3f7a4a, nc:1},
      {s:'box', d:[.08,2.3,1.15],  p:[3.59,1.25,1.06], r:[0,-80,0], m:'steel', c:0x5a6670},
      {s:'box', d:[.08,2.3,1.15],  p:[3.59,1.25,-1.06],r:[0,80,0],  m:'steel', c:0x5a6670},
  ]},

  /* ---------- tejido de alambre ---------- */

  // paño de tejido romboidal
  { id:'i_fence01', name:'ChainFence', mass:35, col:'box', tags:['fence','wire','mesh'], parts:[
      {s:'cyl', d:[.05,2.05],    p:[-1.22,1.025,0], m:'metal'},
      {s:'cyl', d:[.05,2.05],    p:[1.22,1.025,0],  m:'metal'},
      {s:'box', d:[2.5,.07,.07], p:[0,1.98,0],      m:'metal', nc:1},
      {s:'box', d:[2.5,.06,.06], p:[0,.12,0],       m:'metal', nc:1},
      {s:'box', d:[2.4,1.85,.02],p:[0,1.05,0],      m:'metal', c:0xb0b8c0, nc:1},
  ]},

  // tejido con brazos y alambre de púas
  { id:'i_fence02', name:'Fence02Barb', mass:48, col:'box', tags:['fence','wire','barbed'], parts:[
      {s:'cyl', d:[.055,2.15],   p:[-1.22,1.075,0], m:'metal'},
      {s:'cyl', d:[.055,2.15],   p:[1.22,1.075,0],  m:'metal'},
      {s:'box', d:[2.4,1.9,.02], p:[0,1.05,0],      m:'metal', c:0xb0b8c0, nc:1},
      {s:'box', d:[2.5,.07,.07], p:[0,2.08,0],      m:'metal', nc:1},
      {s:'box', d:[.06,.36,.24], p:[-1.22,2.3,.1],  r:[25,0,0], m:'metal', nc:1},
      {s:'box', d:[.06,.36,.24], p:[1.22,2.3,.1],   r:[25,0,0], m:'metal', nc:1},
      {s:'box', d:[2.5,.03,.03], p:[0,2.32,.08],    m:'metal', nc:1},
      {s:'box', d:[2.5,.03,.03], p:[0,2.45,.17],    m:'metal', nc:1},
  ]},

  /* ---------- cajones, jaulas, pallets ---------- */

  // cajón de madera grande con patines
  { id:'i_crate_big', glb:'crate', name:'BigCrate', mass:95, tags:['crate','wood','box'], parts:[
      {s:'box', d:[1.6,.12,.18],  p:[0,.06,-.48], m:'wood', c:0x7a5c39},
      {s:'box', d:[1.6,.12,.18],  p:[0,.06,.48],  m:'wood', c:0x7a5c39},
      {s:'box', d:[1.6,1.34,1.2], p:[0,.79,0],    m:'plank', c:0x9a7549},
      {s:'box', d:[1.66,.1,1.26], p:[0,1.3,0],    m:'wood', c:0x6b5136, nc:1},
      {s:'box', d:[1.66,.1,1.26], p:[0,.4,0],     m:'wood', c:0x6b5136, nc:1},
      {s:'box', d:[1.68,.09,1.28],p:[0,1.5,0],    m:'plank', c:0x8a6a44},
  ]},

  // jaula de transporte de malla
  { id:'i_cage', name:'MetalCage', mass:75, tags:['cage','mesh','steel'], parts:[
      {s:'box', d:[1.2,.14,1],    p:[0,.07,0],     m:'steel'},
      {s:'box', d:[.05,1.3,1],    p:[-.575,.79,0], m:'metal', c:0xa9b0b8},
      {s:'box', d:[.05,1.3,1],    p:[.575,.79,0],  m:'metal', c:0xa9b0b8},
      {s:'box', d:[1.2,1.3,.05],  p:[0,.79,-.475], m:'metal', c:0xa9b0b8},
      {s:'box', d:[1.2,1.3,.05],  p:[0,.79,.475],  m:'metal', c:0xa9b0b8, nc:1},
      {s:'box', d:[1.24,.07,1.04],p:[0,1.47,0],    m:'steel', nc:1},
  ]},

  // pallet europeo
  { id:'i_pallet', name:'Pallet', mass:24, col:'box', tags:['pallet','wood'], parts:[
      {s:'box', d:[.14,.12,.8],   p:[-.53,.06,0],   m:'wood', c:0x7a5c39},
      {s:'box', d:[.14,.12,.8],   p:[0,.06,0],      m:'wood', c:0x7a5c39},
      {s:'box', d:[.14,.12,.8],   p:[.53,.06,0],    m:'wood', c:0x7a5c39},
      {s:'box', d:[1.2,.025,.14], p:[0,.1325,-.33], m:'plank', c:0xa8845a},
      {s:'box', d:[1.2,.025,.14], p:[0,.1325,-.11], m:'plank', c:0xa8845a},
      {s:'box', d:[1.2,.025,.14], p:[0,.1325,.11],  m:'plank', c:0xa8845a},
      {s:'box', d:[1.2,.025,.14], p:[0,.1325,.33],  m:'plank', c:0xa8845a},
  ]},

  /* ---------- pasarela / andamio / escalera ---------- */

  // pasarela de rejilla con barandas
  { id:'i_gangway', name:'Gangway6', mass:380, tags:['bridge','walkway','grating'], parts:[
      {s:'box', d:[6,.1,1.1],   p:[0,.05,0],    m:'steel', c:0x8d949c},
      {s:'box', d:[6,.24,.08],  p:[0,.12,-.53], m:'steel'},
      {s:'box', d:[6,.24,.08],  p:[0,.12,.53],  m:'steel'},
      {s:'box', d:[6,.85,.04],  p:[0,.62,-.53], m:'metal', c:0x9aa2aa, nc:1},
      {s:'box', d:[6,.85,.04],  p:[0,.62,.53],  m:'metal', c:0x9aa2aa, nc:1},
      {s:'box', d:[6,.07,.07],  p:[0,1.08,-.53],m:'metal', nc:1},
      {s:'box', d:[6,.07,.07],  p:[0,1.08,.53], m:'metal', nc:1},
  ]},

  // torre de andamio con plataforma
  { id:'i_scaffold', name:'Scaffold', mass:120, tags:['scaffold','work','steel'], parts:[
      {s:'cyl', d:[.035,2.1],   p:[-.85,1.05,-.55], m:'steel'},
      {s:'cyl', d:[.035,2.1],   p:[.85,1.05,-.55],  m:'steel'},
      {s:'cyl', d:[.035,2.1],   p:[-.85,1.05,.55],  m:'steel'},
      {s:'cyl', d:[.035,2.1],   p:[.85,1.05,.55],   m:'steel'},
      {s:'box', d:[1.8,.06,1.16],p:[0,1.3,0],       m:'plank', c:0xa8845a},
      {s:'box', d:[1.8,.06,.06],p:[0,2.05,-.55],    m:'steel', nc:1},
      {s:'box', d:[1.8,.06,.06],p:[0,2.05,.55],     m:'steel', nc:1},
      {s:'box', d:[1.8,.05,.05],p:[0,.65,-.55],     m:'steel', nc:1},
  ]},

  // escalera fija de acero
  { id:'i_ladder', name:'MetalLadder', mass:28, tags:['ladder','steel','climb'], parts:[
      {s:'cyl', d:[.035,3],     p:[-.22,1.5,0], m:'steel'},
      {s:'cyl', d:[.035,3],     p:[.22,1.5,0],  m:'steel'},
      {s:'box', d:[.44,.04,.04],p:[0,.35,0],    m:'steel', nc:1},
      {s:'box', d:[.44,.04,.04],p:[0,.88,0],    m:'steel', nc:1},
      {s:'box', d:[.44,.04,.04],p:[0,1.41,0],   m:'steel', nc:1},
      {s:'box', d:[.44,.04,.04],p:[0,1.94,0],   m:'steel', nc:1},
      {s:'box', d:[.44,.04,.04],p:[0,2.47,0],   m:'steel', nc:1},
      {s:'box', d:[.44,.04,.04],p:[0,2.9,0],    m:'steel', nc:1},
  ]},

  /* ---------- suelto / consumibles ---------- */

  // cubierta de camión suelta
  { id:'i_tire01', name:'Tire01', mass:55, col:'cyl', tags:['tire','rubber','wheel'], parts:[
      {s:'cyl', d:[.55,.3],  p:[0,.15,0],  m:'rubber', c:0x1a1a1e},
      {s:'cyl', d:[.28,.32], p:[0,.16,0],  m:'metal', c:0x6e757c, nc:1},
      {s:'cyl', d:[.57,.12], p:[0,.15,0],  m:'rubber', c:0x101115, nc:1},
  ]},

  // macetero cuadrado de hormigón
  { id:'i_planter01', name:'Planter01', mass:420, tags:['planter','concrete','street'], parts:[
      {s:'box', d:[.9,.55,.9],   p:[0,.275,0], m:'concrete'},
      {s:'box', d:[.98,.09,.98], p:[0,.55,0],  m:'concrete', c:0xb4b4ae, nc:1},
      {s:'box', d:[.74,.06,.74], p:[0,.53,0],  m:'dirt', nc:1},
      {s:'sph', d:[.22],         p:[0,.74,0],  m:'grass', nc:1},
  ]},

  // macetero redondo de hormigón
  { id:'i_planter02', name:'Planter02', mass:380, tags:['planter','concrete','street'], parts:[
      {s:'cyl', d:[.55,.68], p:[0,.34,0], m:'concrete'},
      {s:'cyl', d:[.6,.1],   p:[0,.68,0], m:'concrete', c:0xb4b4ae, nc:1},
      {s:'cyl', d:[.45,.07], p:[0,.66,0], m:'dirt', nc:1},
      {s:'sph', d:[.26],     p:[0,.9,0],  m:'grass', nc:1},
  ]},

  // bidón de combustible 20 L
  { id:'i_jerrycan', name:'JerryCan', mass:18, tags:['fuel','can','metal'], parts:[
      {s:'box', d:[.34,.42,.17], p:[0,.21,0],   m:'paint', c:0x4a5f3a},
      {s:'box', d:[.3,.05,.19],  p:[0,.24,0],   m:'metal', c:0x2f3a28, nc:1},
      {s:'box', d:[.24,.05,.05], p:[0,.45,0],   m:'metal', nc:1},
      {s:'cyl', d:[.045,.09],    p:[.11,.46,0], m:'metal', nc:1},
  ]},

  // tanque de gas industrial
  { id:'i_gas_tank', name:'GasTank', mass:65, col:'cyl', tags:['gas','tank','cylinder'], parts:[
      {s:'cyl', d:[.32,1.25],     p:[0,.625,0], m:'paint', c:0xb5432f},
      {s:'cyl', d:[.18,.32,.2],   p:[0,1.35,0], m:'paint', c:0xb5432f},
      {s:'cyl', d:[.09,.14],      p:[0,1.5,0],  m:'metal', nc:1},
      {s:'cyl', d:[.09,.04],      p:[0,1.59,0], m:'metal', nc:1},
      {s:'cyl', d:[.17,.22],      p:[0,1.6,0],  m:'metal', c:0x6e757c, nc:1},
      {s:'cyl', d:[.33,.08],      p:[0,.04,0],  m:'metal', nc:1},
  ]},

  // carretel de cable con calzas
  { id:'i_cable_reel', name:'CableReel', mass:320, tags:['reel','cable','spool'], parts:[
      {s:'cyl', d:[.65,.1],  p:[0,.65,-.35], r:[90,0,0], m:'plank', c:0x8a6a44},
      {s:'cyl', d:[.65,.1],  p:[0,.65,.35],  r:[90,0,0], m:'plank', c:0x8a6a44},
      {s:'cyl', d:[.3,.62],  p:[0,.65,0],    r:[90,0,0], m:'plank', c:0x7a5c39},
      {s:'cyl', d:[.55,.55], p:[0,.65,0],    r:[90,0,0], m:'rubber', c:0x22242a, nc:1},
      {s:'box', d:[.22,.13,.85], p:[-.45,.065,0], m:'wood', c:0x6b5136},
      {s:'box', d:[.22,.13,.85], p:[.45,.065,0],  m:'wood', c:0x6b5136},
  ]},

  // caja de herramientas
  { id:'i_toolbox', name:'ToolBox', mass:12, tags:['tool','box','metal'], parts:[
      {s:'box', d:[.55,.24,.28], p:[0,.12,0],    m:'metal', c:0xd0453a},
      {s:'box', d:[.57,.07,.3],  p:[0,.275,0],   m:'metal', c:0x2b2f36, nc:1},
      {s:'box', d:[.2,.04,.04],  p:[0,.33,0],    m:'chrome', nc:1},
      {s:'box', d:[.05,.07,.03], p:[.2,.24,.15], m:'chrome', nc:1},
  ]},

  // tubos de acero apilados sobre cuñas
  { id:'i_pipes', name:'SteelPipes', mass:380, tags:['pipe','steel','stack'], parts:[
      {s:'box', d:[.95,.42,.18], p:[0,.21,-.42], m:'plank', c:0x8a6a44},
      {s:'box', d:[.95,.42,.18], p:[0,.21,.42],  m:'plank', c:0x8a6a44},
      {s:'cyl', d:[.15,1.1], p:[-.32,.57,0], r:[90,0,0], m:'steel', c:0x8d949c},
      {s:'cyl', d:[.15,1.1], p:[0,.57,0],    r:[90,0,0], m:'steel', c:0x8d949c},
      {s:'cyl', d:[.15,1.1], p:[.32,.57,0],  r:[90,0,0], m:'steel', c:0x8d949c},
      {s:'cyl', d:[.15,1.1], p:[-.16,.83,0], r:[90,0,0], m:'steel', c:0x8d949c},
      {s:'cyl', d:[.15,1.1], p:[.16,.83,0],  r:[90,0,0], m:'steel', c:0x8d949c},
  ]},

]);
