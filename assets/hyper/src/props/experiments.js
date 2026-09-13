/* ============================================================
   SUX SANDBOX — PROPS DE LA SECCIÓN "EXPERIMENTOS"  (prefijo xp_)
   ------------------------------------------------------------
   POR QUÉ ESTE ARCHIVO EXISTE Y POR QUÉ EL TAB DICE 'ent'
   Un experimento es un prop NORMAL (geometría de partes, masa, física real) más un
   comportamiento que le engancha core_u.js con XP.add({id:'xp_...'}). Los props que ya
   tienen su geometría escrita a mano viven acá, en props/, porque así los revisa
   validate.js (medidas, materiales, masas, ids y nombres únicos) igual que los otros 398.
   validate.js sólo acepta tab 'acc'|'veh'|'ent', así que la sección se declara con 'ent'
   y core_u.js le cambia el tab a 'xp' al arrancar (y agrega la pestaña "Experimentos" al
   menú de spawn). Es un cambio de UNA línea en tiempo de ejecución que no rompe nada y
   deja la validación estática funcionando.

   REGLA PARA LOS DEMÁS AGENTES
   - id con prefijo  xp_   (props/_example.js usa x_ y está ignorado por el build porque
     empieza con _, pero igual conviene no chocar: xp_ es el prefijo de esta sección).
   - una sección por archivo, con el id empezando en 'xp' (xp_weather, xp_circuits…) y
     tab 'ent': core_u.js mueve TODA sección cuyo id empiece con 'xp' a la pestaña
     Experimentos, así cada agente tiene su propia carpeta en el menú sin tocar nada.
   - y=0 = base del objeto, centrado en X/Z, máximo 3 materiales por prop, 1..14 partes.
   Los props creados EN TIEMPO DE EJECUCIÓN (XP.add con parts:[...]) también funcionan y
   caen en la carpeta "Varios"; sirven para experimentos que no valen un archivo aparte.
   ============================================================ */

HP.section('xp_player','Jugador','ent',[

  /* ---- xp_size: terminal con pantalla inclinada (experimento "Tu tamaño") ----
     Forma de tótem/terminal: base pesada, columna, pantalla grande inclinada hacia
     el jugador y una repisa con un botón. La pantalla y el botón van nc:1 (no
     colisionan): la física es la caja de la base + columna + carcasa, que ya alcanza,
     y así el prop no se traba con el personaje cuando se le acerca a activarlo. */
  { id:'xp_size', name:'Escaner Talla', mass:52, tags:['experiment','scifi'], parts:[
      {s:'box', d:[.92,.10,.72], p:[0,.05,0],     m:'metal',   c:0x3b424a},
      {s:'cyl', d:[.12,.86],     p:[0,.53,-.02],  m:'metal',   c:0x8d959d},
      {s:'box', d:[.88,.64,.10], p:[0,1.24,-.10], m:'metal',   c:0x2f353d, r:[-16,0,0]},
      {s:'box', d:[.76,.50,.03], p:[0,1.25,-.03], m:'neon',    c:0x39dcff, r:[-16,0,0], nc:1},
      {s:'box', d:[.86,.09,.30], p:[0,.90,.14],   m:'plastic', c:0x23272e},
      {s:'box', d:[.22,.05,.14], p:[0,.955,.16],  m:'neon',    c:0xffc24d, nc:1},
  ]},

  /* ---- xp_speed: consola de taller con palanca (experimento "Tu velocidad") ----
     A propósito NO se parece a la anterior: cuerpo cúbico bajo, tablero inclinado
     casi horizontal con una tira verde de lectura y una palanca a la derecha. Así se
     ve de una que son dos pantallas distintas, como pidió el enunciado. */
  { id:'xp_speed', name:'Consola Veloz', mass:44, tags:['experiment','industrial'], parts:[
      {s:'box', d:[.84,.14,.64], p:[0,.07,0],    m:'metal',   c:0x30363d},
      {s:'box', d:[.68,.74,.52], p:[0,.51,0],    m:'plastic', c:0x3e454d},
      {s:'box', d:[.74,.10,.46], p:[0,.93,.02],  m:'metal',   c:0x22272d, r:[-22,0,0]},
      {s:'box', d:[.58,.20,.03], p:[0,.99,.14],  m:'neon',    c:0x7dff8a, r:[-22,0,0], nc:1},
      {s:'cyl', d:[.045,.32],    p:[.26,1.10,-.10], m:'metal', c:0xd6dde3, nc:1},
      {s:'sph', d:[.07],         p:[.26,1.27,-.10], m:'neon',  c:0xff6a3a, nc:1},
  ]},

]);
