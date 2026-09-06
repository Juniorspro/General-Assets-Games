/* ══════════════════════ LOS ICONOS AERO ══════════════════════

   Pedido, con una imagen: el logo de TikTok en BLANCO sobre un fondo de agua
   con peces y burbujas, y un pack de «más de 50-70 iconos de apps conocidas».

   ── POR QUÉ ESTO ES UN GLIFO Y NO UNA IMAGEN POR APP ──
   Setenta imágenes generadas serían setenta descargas y unos cuantos megas de
   base64 para dibujar setenta siluetas planas de un solo color. Y hay algo
   peor que el peso: una imagen generada NO deletrea ni acierta una marca —eso
   ya costó un logo que decía «RECEO» en RECREO— así que el logo de cada app
   saldría parecido y no igual.
   Lo que sí es exacto es la GEOMETRÍA: cada marca es un puñado de círculos,
   rectángulos y curvas, y eso se escribe. El pack pesa nueve kilobytes, es
   nítido en cualquier densidad de pantalla, y se puede recolorear.

   ── EL FONDO SÍ ES GENERADO, Y HAY CUATRO ──
   Los cuatro salen de Rezona y son lo que la imagen del pedido muestra: agua
   con peces, cielo con nubes, pasto con rocío y un atardecer. Y NO se reparten
   al azar: cada uno es una FAMILIA —redes, medios, herramientas, dinero— así
   que el fondo agrupa, que es información y no adorno.

   ── Y LA APP QUE NO ESTÁ EN LA LISTA NO QUEDA FEA ──
   Se queda con su icono de verdad sobre la baldosa Aero, que es lo que este
   launcher ya hacía. O sea que el pack SUMA sobre lo que había: no hay una
   app 71 que quede peor que antes. */

/* ── EL VOCABULARIO ──
   Cada glifo es una lista de piezas y cada pieza es una primitiva. Escritas
   como `path` a mano serían sesenta cadenas ilegibles que nadie va a poder
   corregir; así una marca son dos o tres renglones que se leen.
     ['p', d]                 un camino
     ['c', cx, cy, r]         un disco
     ['o', cx, cy, r, w]      un aro
     ['r', x, y, w, h, rx]    un rectángulo redondeado
     ['l', x1,y1,x2,y2, w]    una línea con puntas redondas
     ['t', texto, tamaño, y]  una letra
   Todo en una caja de 0..100. */

const GLIFOS = {
  /* ── redes y mensajes ── */
  tiktok:   [['o',42,66,25,17], ['r',62,12,17,54,2],
             ['p','M79 12 C82 31 90 39 100 41 L100 59 C88 57 80 51 79 45 Z']],
  whatsapp: [['p','M50 10 A40 40 0 1 0 17 73 L12 92 L32 87 A40 40 0 0 0 50 10 Z'],
             ['-p','M38 30 C30 37 33 50 42 60 C52 70 65 73 71 66 C73 63 72 60 70 58 L64 52 C62 50 59 51 57 53 L54 57 C49 53 46 49 43 44 L47 40 C49 38 50 35 48 33 L43 28 C41 26 39 27 38 30 Z']],
  instagram:[['r',14,14,72,72,22], ['-r',24,24,52,52,15],
             ['o',50,50,15,7], ['c',72,29,5]],
  facebook: [['c',50,50,42], ['-t','f',74,80]],
  messenger:[['p','M50 12 C27 12 10 29 10 50 C10 61 15 70 23 77 L23 92 L37 84 C41 85 45 86 50 86 C73 86 90 69 90 50 C90 29 73 12 50 12 Z'],
             ['-p','M26 58 L45 38 L56 50 L72 38 L54 60 L43 48 Z']],
  telegram: [['p','M12 48 L88 18 L76 82 L52 64 L40 76 L38 58 Z'], ['-l',38,58,76,32,3]],
  x:        [['l',20,20,80,80,15], ['l',80,20,20,80,15]],
  snapchat: [['p','M50 10 C33 10 27 23 28 38 C28 42 27 44 24 44 C20 44 16 42 15 46 C14 51 22 53 25 55 C22 65 14 72 6 74 C5 78 14 80 19 81 C21 86 20 90 26 89 C33 88 39 89 43 92 C47 95 53 95 57 92 C61 89 67 88 74 89 C80 90 79 86 81 81 C86 80 95 78 94 74 C86 72 78 65 75 55 C78 53 86 51 85 46 C84 42 80 44 76 44 C73 44 72 42 72 38 C73 23 67 10 50 10 Z']],
  discord:  [['p','M36 26 C25 28 16 33 12 40 C6 55 5 70 8 80 C15 86 24 90 32 90 L37 82 C33 81 29 79 26 77 C34 82 44 84 50 84 C56 84 66 82 74 77 C71 79 67 81 63 82 L68 90 C76 90 85 86 92 80 C95 70 94 55 88 40 C84 33 75 28 64 26 L61 33 C55 32 45 32 39 33 Z'],
             ['-c',36,58,7], ['-c',64,58,7]],
  reddit:   [['c',50,58,32], ['c',82,28,7], ['l',66,32,79,29,4],
             ['-c',38,54,6], ['-c',62,54,6], ['-p','M36 70 C42 78 58 78 64 70',5]],
  pinterest:[['c',50,50,42], ['-t','P',70,74]],
  linkedin: [['r',12,12,76,76,16], ['-t','in',38,64]],
  signal:   [['p','M50 8 A42 42 0 1 0 20 78 L10 92 L29 85 A42 42 0 0 0 50 8 Z'],
             ['-p','M50 22 A28 28 0 1 0 30 70 L24 79 L36 75 A28 28 0 0 0 50 22 Z']],
  threads:  [['c',50,50,42], ['-t','@',66,72]],
  wechat:   [['o',38,42,24,8], ['o',66,62,20,8]],

  /* ── medios ── */
  youtube:  [['r',6,22,88,56,16], ['-p','M40 36 L70 50 L40 64 Z']],
  spotify:  [['c',50,50,40], ['-p','M26 36 C42 30 62 32 76 40',7],
             ['-p','M28 51 C42 46 60 48 72 54',6], ['-p','M31 65 C42 61 56 62 66 67',5]],
  netflix:  [['p','M28 12 L44 12 L72 66 L72 12 L86 12 L86 88 L70 88 L42 34 L42 88 L28 88 Z']],
  twitch:   [['p','M18 10 L88 10 L88 62 L70 80 L54 80 L40 92 L40 80 L18 80 Z'],
             ['-r',48,28,7,26,3], ['-r',66,28,7,26,3]],
  soundcloud:[['l',18,64,18,50,6],['l',30,66,30,42,6],['l',42,66,42,34,6],['l',54,66,54,40,6],
              ['p','M62 66 L62 34 C78 30 92 42 92 52 C92 61 84 66 76 66 Z'], ['-l',58,30,58,70,4]],
  vlc:      [['p','M50 12 L60 34 L40 34 Z'], ['p','M34 44 L66 44 L82 88 L18 88 Z']],
  shazam:   [['o',50,50,36,8], ['p','M40 34 C56 38 60 48 56 60 M44 40 C56 43 58 50 56 58']],
  deezer:   [['r',14,54,16,10,3],['r',14,70,16,10,3],['r',36,38,16,10,3],['r',36,54,16,10,3],
             ['r',36,70,16,10,3],['r',58,22,16,10,3],['r',58,38,16,10,3],['r',58,54,16,10,3],
             ['r',58,70,16,10,3],['r',80,54,16,10,3],['r',80,70,16,10,3]],

  /* ── google y navegadores ── */
  gmail:    [['p','M10 26 L90 26 L90 78 L10 78 Z'], ['-p','M10 28 L50 58 L90 28',7]],
  chrome:   [['o',50,50,36,14], ['c',50,50,15]],
  google:   [['p','M78 44 L50 44 L50 58 L68 58 C64 68 56 72 50 72 A22 22 0 1 1 66 34 L78 22 A38 38 0 1 0 50 88 C74 88 80 68 78 44 Z']],
  maps:     [['p','M50 8 A28 28 0 0 0 22 36 C22 58 50 92 50 92 C50 92 78 58 78 36 A28 28 0 0 0 50 8 Z'],
             ['-c',50,36,11]],
  drive:    [['p','M38 10 L62 10 L92 62 L68 62 Z'], ['p','M34 16 L58 66 L44 90 L8 90 Z'],
             ['p','M50 68 L92 68 L74 92 L34 92 Z'],
             ['-l',36,12,64,62,4], ['-l',48,66,94,66,4]],
  fotos:    [['p','M50 8 C58 8 64 20 64 34 L50 44 Z'], ['p','M92 50 C92 58 80 64 66 64 L56 50 Z'],
             ['p','M50 92 C42 92 36 80 36 66 L50 56 Z'], ['p','M8 50 C8 42 20 36 34 36 L44 50 Z']],
  play:     [['p','M16 8 L76 50 L16 92 Z'], ['-l',16,8,16,92,4]],
  meet:     [['r',10,28,50,44,8], ['p','M68 44 L94 28 L94 72 L68 56 Z']],
  keep:     [['p','M50 10 A24 24 0 0 0 34 52 L38 62 L62 62 L66 52 A24 24 0 0 0 50 10 Z'],
             ['r',38,68,24,8,3], ['r',42,80,16,7,3]],
  traduce:  [['t','A',52,52,26], ['l',56,58,94,58,6], ['l',75,50,75,58,6],
             ['p','M62 90 C74 84 82 74 86 64 M74 64 C78 76 84 84 92 90']],

  /* ── sistema ── */
  camara:   [['r',8,26,84,60,12], ['p','M36 26 L42 15 L58 15 L64 26 Z'],
             ['-c',50,56,19], ['c',50,56,11]],
  galeria:  [['r',10,18,80,64,10], ['-r',18,26,64,48,4],
             ['p','M22 70 L42 44 L57 61 L66 51 L79 70 Z'], ['c',68,36,6]],
  telefono: [['p','M22 12 C14 20 12 32 20 48 C30 68 44 80 62 88 C74 92 84 88 90 78 L74 62 L60 68 C50 60 42 50 36 40 L44 28 Z']],
  mensajes: [['p','M50 14 C26 14 8 30 8 48 C8 58 14 67 24 73 L20 90 L40 80 C43 81 47 82 50 82 C74 82 92 66 92 48 C92 30 74 14 50 14 Z'],
             ['-c',32,48,6], ['-c',50,48,6], ['-c',68,48,6]],
  contactos:[['c',50,32,18], ['p','M14 90 C14 66 30 56 50 56 C70 56 86 66 86 90 Z']],
  reloj:    [['o',50,50,38,8], ['l',50,26,50,52,6], ['l',50,52,70,58,6]],
  calc:     [['r',14,8,72,84,10], ['-r',24,18,52,18,4],
             ['-l',32,52,42,52,6],['-l',58,52,68,52,6],['-l',63,47,63,57,6],
             ['-l',32,72,42,72,6],['-l',58,68,68,68,5],['-l',58,77,68,77,5]],
  ajustes:  [['p','M50 8 L58 8 L61 22 L70 26 L82 18 L88 24 L80 36 L84 45 L98 48 L98 56 L84 59 L80 68 L88 80 L82 86 L70 78 L61 82 L58 96 L50 96 L42 96 L39 82 L30 78 L18 86 L12 80 L20 68 L16 59 L2 56 L2 48 L16 45 L20 36 L12 24 L18 18 L30 26 L39 22 L42 8 Z'],
             ['-c',50,52,15]],
  archivos: [['p','M8 22 L38 22 L46 32 L92 32 L92 84 L8 84 Z'], ['-l',10,38,90,38,3]],
  calendario:[['r',10,18,80,74,10], ['-r',18,44,64,40,3],
              ['l',30,8,30,26,8], ['l',70,8,70,26,8],
              ['r',24,50,11,11,2],['r',44,50,11,11,2],['r',64,50,11,11,2],
              ['r',24,68,11,11,2],['r',44,68,11,11,2]],
  notas:    [['r',16,10,68,80,8], ['-l',30,32,70,32,6],['-l',30,48,70,48,6],['-l',30,64,56,64,6]],
  clima:    [['c',34,28,17], ['l',34,4,34,10,5],['l',12,17,17,20,5],['l',56,17,51,20,5],
             ['-p','M34 88 C21 88 13 79 13 69 C13 58 22 51 31 53 C35 41 51 38 60 45 C66 50 69 56 69 62 C80 62 89 68 89 76 C89 84 82 88 74 88 Z'],
             ['p','M34 86 C22 86 15 78 15 69 C15 59 23 53 31 55 C35 44 50 41 58 47 C64 51 67 57 67 63 C78 63 87 68 87 76 C87 83 80 86 73 86 Z']],
  musica:   [['c',34,72,15], ['c',74,62,13], ['r',46,18,6,56,2], ['r',80,10,7,54,2],
             ['p','M46 18 L87 10 L87 26 L46 34 Z']],
  video:    [['r',8,22,64,56,10], ['-p','M32 38 L56 50 L32 62 Z'], ['p','M78 42 L94 28 L94 72 L78 58 Z']],
  micro:    [['r',38,10,24,44,12], ['p','M24 46 C24 66 36 76 50 76 C64 76 76 66 76 46'],
             ['l',50,76,50,90,7], ['l',34,90,66,90,7]],
  linterna: [['p','M30 10 L70 10 L62 30 L38 30 Z'], ['p','M38 34 L62 34 L60 92 L40 92 Z'],
             ['-l',50,44,50,58,7]],
  brujula:  [['o',50,50,38,7], ['p','M68 32 L56 56 L32 68 L44 44 Z']],
  descargas:[['l',50,12,50,56,9], ['p','M28 46 L50 72 L72 46'], ['l',16,84,84,84,9]],
  tienda:   [['p','M14 40 L86 40 L91 90 L9 90 Z'],
             ['p','M35 42 L35 28 A15 15 0 0 1 65 28 L65 42',7]],
  banco:    [['p','M50 10 L94 34 L6 34 Z'], ['l',22,40,22,74,9],['l',40,40,40,74,9],
             ['l',60,40,60,74,9],['l',78,40,78,74,9], ['r',8,80,84,10,3]],
  billetera:[['r',8,24,84,60,10], ['-l',8,44,92,44,4], ['-c',72,64,9]],
  correo:   [['r',8,24,84,54,8], ['-p','M12 28 L50 56 L88 28',6]],
  navegador:[['o',50,50,38,7], ['l',13,50,87,50,6], ['p','M50 12 C34 26 34 74 50 88 M50 12 C66 26 66 74 50 88']],
  juegos:   [['p','M28 30 L72 30 C86 30 94 44 94 58 C94 70 88 76 80 76 C72 76 68 70 62 66 L38 66 C32 70 28 76 20 76 C12 76 6 70 6 58 C6 44 14 30 28 30 Z'],
             ['-l',22,46,34,46,6],['-l',28,40,28,52,6], ['-c',70,44,6],['-c',80,54,6]],
  salud:    [['p','M50 88 C20 68 8 52 8 36 A20 20 0 0 1 50 26 A20 20 0 0 1 92 36 C92 52 80 68 50 88 Z']],
  noticias: [['r',10,20,80,64,6], ['-r',18,28,64,48,3],
             ['r',24,34,28,20,2], ['l',60,36,80,36,5],['l',60,46,80,46,5],
             ['l',24,60,80,60,5],['l',24,70,58,70,5]],
  podcast:  [['r',40,8,20,40,10], ['p','M26 42 C26 60 36 70 50 70 C64 70 74 60 74 42'],
             ['l',50,70,50,84,6], ['o',50,50,44,5]],

  /* ── plata, compras, transporte ── */
  mercado:  [['p','M8 18 L22 18 L32 60 L80 60 L90 32 L28 32',7],
             ['c',38,80,8], ['c',72,80,8]],
  uber:     [['r',8,8,84,84,20], ['-t','U',52,68]],
  paypal:   [['p','M40 18 L60 18 C78 18 84 30 79 44 C74 56 62 60 49 60 L42 60 L38 84 L22 84 Z'],
             ['-p','M46 30 L58 30 C66 30 68 36 66 42 C64 48 57 50 50 50 L44 50 Z']],
  binance:  [['p','M50 8 L64 22 L50 36 L36 22 Z'], ['p','M22 36 L36 50 L22 64 L8 50 Z'],
             ['p','M78 36 L92 50 L78 64 L64 50 Z'], ['p','M50 64 L64 78 L50 92 L36 78 Z'],
             ['p','M50 36 L64 50 L50 64 L36 50 Z']],
  amazon:   [['t','a',64,58], ['p','M14 70 C34 84 66 86 88 74 M84 66 C91 64 95 66 92 75']],

  /* ── trabajo y juegos ── */
  steam:    [['o',50,50,40,7], ['c',64,36,13], ['-c',64,36,5], ['o',38,64,12,6], ['l',10,70,32,60,5]],
  roblox:   [['p','M26 8 L92 24 L76 92 L10 76 Z'], ['-p','M42 38 L64 44 L58 66 L36 60 Z']],
  minecraft:[['p','M8 30 L50 12 L92 30 L50 48 Z'], ['p','M8 30 L8 70 L50 88 L50 48 Z'],
             ['p','M92 30 L92 70 L50 88 L50 48 Z'],
             ['-l',50,48,50,88,3], ['-l',8,30,50,48,3], ['-l',92,30,50,48,3]],
  dropbox:  [['p','M28 8 L50 23 L28 38 L6 23 Z'], ['p','M72 8 L94 23 L72 38 L50 23 Z'],
             ['p','M28 44 L50 59 L28 74 L6 59 Z'], ['p','M72 44 L94 59 L72 74 L50 59 Z'],
             ['p','M32 80 L50 68 L68 80 L50 92 Z']],
  notion:   [['r',12,12,76,76,10], ['-p','M32 74 L32 30 L44 30 L64 60 L64 30 L74 30 L74 74 L62 74 L42 44 L42 74 Z']],
  zoom:     [['r',6,26,60,48,14], ['p','M74 42 L94 28 L94 72 L74 58 Z']],
  teams:    [['r',42,20,52,60,8], ['-t','T',44,64,68], ['c',24,26,15], ['p','M6 46 L42 46 L42 86 L6 86 Z']],
  vscode:   [['p','M74 8 L94 18 L94 82 L74 92 L28 56 L12 68 L6 60 L22 46 L6 32 L12 24 L28 36 Z'],
             ['-p','M74 30 L46 50 L74 70 Z']],
  github:   [['p','M22 20 L36 32 L22 34 Z'], ['p','M78 20 L64 32 L78 34 Z'],
             ['c',50,52,32], ['-c',38,46,6], ['-c',62,46,6],
             ['-p','M40 66 C45 71 55 71 60 66',5]],
  figma:    [['c',34,22,14], ['c',34,50,14], ['c',34,78,14], ['c',62,22,14], ['o',62,50,14,7]],
  canva:    [['o',50,50,38,8], ['p','M64 38 C58 32 44 34 40 44 C36 54 42 66 52 66 C58 66 62 62 64 58']],
  wikipedia:[['t','W',62,70], ['l',18,26,82,26,5]],

  /* ── mensajería y varios ── */
  waze:     [['p','M50 8 C26 8 10 26 10 46 C10 62 20 72 32 76 L26 92 L44 80 L50 80 C74 80 90 64 90 46 C90 26 74 8 50 8 Z'],
             ['-c',38,42,6], ['-c',62,42,6], ['-p','M36 56 C42 66 58 66 64 56',5]],
  skype:    [['c',50,50,40], ['-t','S',58,70]],
  duolingo: [['c',50,52,34], ['-c',38,44,9], ['-c',62,44,9], ['c',38,44,4], ['c',62,44,4],
             ['-p','M40 64 L50 74 L60 64 Z'], ['p','M22 24 L36 34 M78 24 L64 34']]
};

/* ── QUÉ APP ES CUÁL ──
   Un paquete es lo único estable: el nombre cambia con el idioma y con la marca
   del teléfono. Se prueba primero por paquete —exacto o por pedazo— y recién
   después por nombre, porque «Cámara» y «Camera» son la misma app y su paquete
   no lo es. */
const ICO_PKG = {
  tiktok:   ['zhiliaoapp.musically', 'ss.android.ugc.trill', 'tiktok'],
  whatsapp: ['com.whatsapp'],
  instagram:['com.instagram'],
  facebook: ['com.facebook.katana', 'com.facebook.lite'],
  messenger:['com.facebook.orca', 'com.facebook.mlite'],
  telegram: ['org.telegram', 'org.thunderdog'],
  x:        ['com.twitter.android'],
  snapchat: ['com.snapchat'],
  discord:  ['com.discord'],
  reddit:   ['com.reddit'],
  pinterest:['com.pinterest'],
  linkedin: ['com.linkedin'],
  signal:   ['org.thoughtcrime.securesms'],
  threads:  ['com.instagram.barcelona'],
  wechat:   ['com.tencent.mm'],
  youtube:  ['com.google.android.youtube', 'com.google.android.apps.youtube'],
  spotify:  ['com.spotify'],
  netflix:  ['com.netflix'],
  twitch:   ['tv.twitch'],
  soundcloud:['com.soundcloud'],
  vlc:      ['org.videolan'],
  shazam:   ['com.shazam'],
  deezer:   ['deezer.android'],
  gmail:    ['com.google.android.gm'],
  chrome:   ['com.android.chrome', 'com.chrome'],
  google:   ['com.google.android.googlequicksearchbox'],
  maps:     ['com.google.android.apps.maps'],
  drive:    ['com.google.android.apps.docs'],
  fotos:    ['com.google.android.apps.photos'],
  play:     ['com.android.vending'],
  meet:     ['com.google.android.apps.tachyon', 'com.google.android.apps.meetings'],
  keep:     ['com.google.android.keep'],
  traduce:  ['com.google.android.apps.translate'],
  camara:   ['camera', 'camera2', 'gcam'],
  galeria:  ['gallery', 'com.miui.gallery', 'com.sec.android.gallery'],
  telefono: ['dialer', 'incallui', 'contacts.dialer'],
  mensajes: ['messaging', 'com.google.android.apps.messaging', 'mms'],
  contactos:['com.android.contacts', 'com.samsung.android.app.contacts'],
  reloj:    ['deskclock', 'com.google.android.deskclock', 'clock'],
  calc:     ['calculator'],
  ajustes:  ['com.android.settings'],
  archivos: ['documentsui', 'filemanager', 'com.google.android.apps.nbu.files'],
  calendario:['calendar'],
  notas:    ['notes', 'keepnotes', 'notepad'],
  clima:    ['weather'],
  musica:   ['music', 'com.google.android.apps.youtube.music'],
  video:    ['videoplayer', 'com.miui.video', 'videos'],
  micro:    ['soundrecorder', 'recorder'],
  linterna: ['flashlight', 'torch'],
  brujula:  ['compass'],
  descargas:['downloads', 'providers.downloads'],
  tienda:   ['store', 'shop'],
  banco:    ['bank', 'banco', 'bbva', 'santander', 'galicia'],
  billetera:['wallet', 'com.google.android.apps.walletnfcrel'],
  correo:   ['com.android.email', 'com.microsoft.office.outlook', 'mail'],
  navegador:['browser', 'org.mozilla', 'com.opera', 'com.brave'],
  juegos:   ['games', 'com.google.android.play.games'],
  salud:    ['health', 'fit', 'salud'],
  noticias: ['news', 'noticias'],
  podcast:  ['podcast'],
  mercado:  ['com.mercadolibre', 'com.mercadopago'],
  uber:     ['com.ubercab'],
  paypal:   ['com.paypal'],
  binance:  ['com.binance'],
  amazon:   ['com.amazon'],
  steam:    ['com.valvesoftware.android.steam'],
  roblox:   ['com.roblox'],
  minecraft:['com.mojang'],
  dropbox:  ['com.dropbox'],
  notion:   ['notion.id'],
  zoom:     ['us.zoom'],
  teams:    ['com.microsoft.teams'],
  vscode:   ['com.termux', 'dev.vscode'],
  github:   ['com.github'],
  figma:    ['com.figma'],
  canva:    ['com.canva'],
  wikipedia:['org.wikipedia'],
  waze:     ['com.waze'],
  skype:    ['com.skype'],
  duolingo: ['com.duolingo']
};

/* por nombre, para lo que no matchea por paquete (la app de cámara de cada
   marca se llama distinto pero se llama «cámara») */
const ICO_NOM = {
  camara: ['camara', 'camera', 'appareil photo'],
  galeria: ['galeria', 'gallery', 'fotos', 'photos', 'imagenes'],
  telefono: ['telefono', 'phone', 'llamadas', 'dialer'],
  mensajes: ['mensajes', 'messages', 'sms', 'mensagens'],
  contactos: ['contactos', 'contacts', 'contatos', 'agenda'],
  reloj: ['reloj', 'clock', 'relogio', 'alarma', 'alarm'],
  calc: ['calculadora', 'calculator'],
  ajustes: ['ajustes', 'settings', 'configuracion', 'configuracoes'],
  archivos: ['archivos', 'files', 'arquivos', 'explorador'],
  calendario: ['calendario', 'calendar', 'agenda'],
  notas: ['notas', 'notes', 'bloc'],
  clima: ['clima', 'weather', 'tiempo', 'tempo'],
  musica: ['musica', 'music'],
  video: ['video', 'videos', 'reproductor'],
  micro: ['grabadora', 'recorder', 'gravador', 'voz'],
  linterna: ['linterna', 'flashlight', 'lanterna'],
  brujula: ['brujula', 'compass', 'bussola'],
  descargas: ['descargas', 'downloads'],
  correo: ['correo', 'email', 'mail', 'outlook'],
  navegador: ['navegador', 'browser', 'internet', 'firefox', 'opera', 'brave', 'edge'],
  juegos: ['juegos', 'games', 'jogos'],
  salud: ['salud', 'health', 'saude'],
  noticias: ['noticias', 'news'],
  banco: ['banco', 'bank']
};

/* la familia decide el fondo: agrupar por color es información, repartirlo al
   azar es sólo ruido de colores */
const ICO_FAM = {
  agua:      ['tiktok','whatsapp','telegram','messenger','signal','wechat','discord','x',
              'linkedin','skype','zoom','teams','mensajes','telefono','contactos','correo','waze'],
  cielo:     ['youtube','spotify','netflix','twitch','soundcloud','vlc','shazam','deezer','musica',
              'video','podcast','micro','galeria','fotos','camara','instagram','snapchat','pinterest',
              'threads','facebook','reddit','noticias'],
  pasto:     ['chrome','google','maps','drive','keep','traduce','meet','gmail','archivos','ajustes',
              'reloj','calc','calendario','notas','clima','linterna','brujula','descargas','navegador',
              'salud','duolingo','wikipedia','notion','github','vscode','figma','canva','dropbox'],
  atardecer: ['play','tienda','banco','billetera','mercado','uber','paypal','binance','amazon',
              'steam','roblox','minecraft','juegos']
};

/* se da vuelta una vez: cincuenta búsquedas lineales por pintada del cajón son
   cincuenta recorridas de cuatro listas para contestar algo que no cambia */
const ICO_DE_FAM = (() => {
  const m = {};
  for (const f in ICO_FAM) for (const g of ICO_FAM[f]) m[g] = f;
  return m;
})();

let ICO_CACHE = {};
/* apagar el pack no puede dejar la caché puesta: `glifoDe` guarda por paquete y
   la respuesta correcta cambia con el ajuste */
function ICO_CACHE_LIMPIA(){ ICO_CACHE = {}; }

function icoNorm(s){
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/* ── QUÉ GLIFO LE TOCA A ESTA APP ──
   Devuelve la clave o null. Se guarda por paquete porque `pintaInicio` y
   `pintaCajon` lo preguntan por cada app en cada pintada. */
function glifoDe(pkg, nombre){
  if (pkg in ICO_CACHE) return ICO_CACHE[pkg];
  const p = String(pkg || '').toLowerCase();
  let g = null;
  for (const k in ICO_PKG){
    for (const frag of ICO_PKG[k]){
      if (p === frag || p.indexOf(frag) >= 0){ g = k; break; }
    }
    if (g) break;
  }
  if (!g && nombre){
    const n = icoNorm(nombre);
    for (const k in ICO_NOM){
      if (ICO_NOM[k].some(x => n === icoNorm(x))){ g = k; break; }
    }
  }
  ICO_CACHE[pkg] = g;
  return g;
}

/* ── EL DIBUJO ──
   Un SVG y no un lienzo: el mismo nodo sirve a cualquier densidad de pantalla y
   no hay que redibujarlo al cambiar de tamaño de icono. Las piezas se pintan
   en blanco con una sombra suave, que es lo único que hace que un glifo blanco
   se lea también sobre la parte clara del fondo. */
let GLF_N = 0;

/* ── EL DETALLE ES UN HUECO, NO OTRO TRAZO BLANCO ──
   Un logo así es UNA silueta blanca: la pantalla de la calculadora, el objetivo
   de la cámara, los ojos de un bicho y las rayas de un calendario NO son piezas
   blancas encima de una pieza blanca —eso es un cuadrado blanco y liso, que es
   exactamente lo que salió en la primera captura— son AGUJEROS. Se arma una
   máscara: lo que suma va en blanco y lo que resta en negro, en el orden en que
   están escritos, y al final se pinta un rectángulo blanco con esa máscara
   puesta. Un tipo de pieza con `-` adelante resta. */
function glifoPieza(ns, pz, cut){
  const t = pz[0];
  const col = cut ? '#000' : '#fff';
  let e = null;
  if (t === 'p'){
    e = document.createElementNS(ns, 'path');
    e.setAttribute('d', pz[1]);
    /* un camino que no cierra se dibuja como TRAZO y no como relleno: es lo que
       permite escribir una ceja o una sonrisa con dos números */
    if (!/z\s*$/i.test(pz[1])){
      e.setAttribute('fill', 'none'); e.setAttribute('stroke', col);
      e.setAttribute('stroke-width', pz[2] || 7); e.setAttribute('stroke-linecap', 'round');
      e.setAttribute('stroke-linejoin', 'round');
    } else e.setAttribute('fill', col);
  } else if (t === 'c'){
    e = document.createElementNS(ns, 'circle');
    e.setAttribute('cx', pz[1]); e.setAttribute('cy', pz[2]); e.setAttribute('r', pz[3]);
    e.setAttribute('fill', col);
  } else if (t === 'o'){
    e = document.createElementNS(ns, 'circle');
    e.setAttribute('cx', pz[1]); e.setAttribute('cy', pz[2]); e.setAttribute('r', pz[3]);
    e.setAttribute('fill', 'none'); e.setAttribute('stroke', col);
    e.setAttribute('stroke-width', pz[4]);
  } else if (t === 'r'){
    e = document.createElementNS(ns, 'rect');
    e.setAttribute('x', pz[1]); e.setAttribute('y', pz[2]);
    e.setAttribute('width', pz[3]); e.setAttribute('height', pz[4]);
    if (pz[5]){ e.setAttribute('rx', pz[5]); e.setAttribute('ry', pz[5]); }
    e.setAttribute('fill', col);
  } else if (t === 'l'){
    e = document.createElementNS(ns, 'line');
    e.setAttribute('x1', pz[1]); e.setAttribute('y1', pz[2]);
    e.setAttribute('x2', pz[3]); e.setAttribute('y2', pz[4]);
    e.setAttribute('stroke', col); e.setAttribute('stroke-width', pz[5]);
    e.setAttribute('stroke-linecap', 'round');
  } else if (t === 't'){
    e = document.createElementNS(ns, 'text');
    e.setAttribute('x', pz[4] == null ? 50 : pz[4]);
    e.setAttribute('y', pz[3] == null ? 72 : pz[3]);
    e.setAttribute('text-anchor', 'middle');
    e.setAttribute('font-size', pz[2]);
    e.setAttribute('font-family', 'Segoe UI,system-ui,sans-serif');
    e.setAttribute('font-weight', '700');
    e.setAttribute('fill', col);
    e.textContent = pz[1];
  }
  return e;
}

function glifoSvg(g){
  const gl = GLIFOS[g]; if (!gl) return null;
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 100 100');
  s.setAttribute('class', 'glf');
  const id = 'gm' + (++GLF_N);
  const defs = document.createElementNS(ns, 'defs');
  const mk = document.createElementNS(ns, 'mask');
  mk.setAttribute('id', id);
  /* en el sistema del viewBox: sin esto la máscara se recorta a la caja del
     objeto y las piezas que rozan el borde se pierden */
  mk.setAttribute('maskUnits', 'userSpaceOnUse');
  mk.setAttribute('x', '-4'); mk.setAttribute('y', '-4');
  mk.setAttribute('width', '108'); mk.setAttribute('height', '108');
  for (const pz of gl){
    const cut = String(pz[0]).charAt(0) === '-';
    const e = glifoPieza(ns, cut ? [String(pz[0]).slice(1)].concat(pz.slice(1)) : pz, cut);
    if (e) mk.appendChild(e);
  }
  defs.appendChild(mk); s.appendChild(defs);
  const r = document.createElementNS(ns, 'rect');
  r.setAttribute('x', '-4'); r.setAttribute('y', '-4');
  r.setAttribute('width', '108'); r.setAttribute('height', '108');
  r.setAttribute('fill', '#fff');
  r.setAttribute('mask', 'url(#' + id + ')');
  s.appendChild(r);
  return s;
}

/* ── LA BALDOSA AERO DE UNA APP CONOCIDA ──
   Devuelve true si la pintó. El fondo va como `background-image` del propio
   nodo y el glifo va adentro: así el recorte redondeado, la sombra y el brillo
   siguen siendo los de `.baldosa` y no hay una segunda familia de baldosas que
   mantener. */
function icoAero(b, pkg, nombre){
  if (!lee('icoPack', 1)) return false;
  const g = glifoDe(pkg, nombre); if (!g) return false;
  const fam = ICO_DE_FAM[g] || 'agua';
  const fondo = (typeof ICONOS !== 'undefined' && ICONOS[fam]) ? ICONOS[fam] : null;
  if (!fondo) return false;
  const sv = glifoSvg(g); if (!sv) return false;
  b.classList.add('aero');
  b.style.backgroundImage = 'url(' + fondo + ')';
  b.style.backgroundSize = 'cover';
  b.style.backgroundPosition = 'center';
  b.appendChild(sv);
  return true;
}
