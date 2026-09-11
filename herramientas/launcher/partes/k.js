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
  /* La nota de TikTok: cabeza SÓLIDA abajo a la izquierda, tallo pegado a su
     derecha y la bandera saliendo del tope. La versión anterior tenía la cabeza
     como aro grueso —una dona— y la bandera se salía de la caja por x=100. */
  tiktok:   [['c',36,66,24], ['r',50,10,17,58,3],
             ['p','M67 10 C69 26 78 34 92 36 L92 53 C80 51 71 46 67 40 Z']],
  /* La burbuja va como DISCO más COLA y no como un solo camino con dos arcos:
     un arco grande con las banderas mal puestas cierra por donde no es, y eso
     no falla —dibuja otra cosa—. Dos piezas que se solapan se unen solas en la
     máscara. El auricular es el recorte. */
  whatsapp: [['c',54,50,40], ['p','M30 72 L42 88 L6 96 Z'],
             ['-p','M34 25 C29 30 28 38 32 47 C37 59 49 70 61 74 C69 77 76 75 79 70 C81 66 80 63 77 61 L69 55 C66 53 63 54 61 57 L58 61 C52 57 46 51 42 45 L46 41 C48 39 49 36 47 33 L40 25 C38 23 36 23 34 25 Z']],
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
  /* CUATRO MARCAS DISTINTAS Y NO UNA. YouTube es la pantalla con el triángulo;
     Music es el triángulo dentro de un ARO; Studio es el triángulo dentro de un
     marco cuadrado con la fila de faders de una mesa de mezcla; Kids es la
     pantalla con el triángulo y una carita. Se distinguen de una ojeada, que es
     lo único que un icono tiene que hacer. */
  youtube:  [['r',6,22,88,56,16], ['-p','M40 36 L70 50 L40 64 Z']],
  ytmusic:  [['o',50,50,38,9], ['p','M40 34 L70 50 L40 66 Z']],
  ytstudio: [['r',8,14,84,60,12], ['-r',16,22,68,44,7],
             ['p','M42 32 L64 44 L42 56 Z'],
             ['l',20,84,32,84,7],['l',44,84,56,84,7],['l',68,84,80,84,7]],
  ytkids:   [['r',6,20,88,60,26], ['-c',36,44,7], ['-c',64,44,7],
             ['-p','M36 60 C42 68 58 68 64 60',6]],
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
  /* los tres de la accesibilidad: campana, candado y capas. No son marcas, son
     acciones del sistema, así que van con la misma geometría que el resto */
  campana:  [['p','M28 68 Q28 40 50 34 Q72 40 72 68 Z',0], ['r',22,68,56,7,3.5],
             ['c',50,30,5], ['p','M42 79 Q50 88 58 79',6]],
  candado:  [['r',26,48,48,34,7], ['p','M36 48 L36 36 Q36 24 50 24 Q64 24 64 36 L64 48',8],
             ['-c',50,63,5]],
  capas:    [['r',22,26,44,44,6], ['-r',29,33,30,30,3],
             ['p','M74 34 L74 70 Q74 76 68 76 L34 76',7]],
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
             ['-p','M40 64 L50 74 L60 64 Z'], ['p','M22 24 L36 34 M78 24 L64 34']],

  /* ══ LOS QUE ENTRARON EN LA VUELTA 124 ══
     El pedido fue «más de 150», y con ochenta el cajón de un teléfono normal
     ya dejaba apps con la inicial pelada. Cada uno sigue siendo geometría: dos
     o tres primitivas que se leen a sesenta píxeles. */

  /* ── inteligencia artificial ── */
  chatgpt:  [['p','M50 8 L86 29 L86 71 L50 92 L14 71 L14 29 Z'],
             ['-p','M50 22 L74 36 L74 64 L50 78 L26 64 L26 36 Z'],
             ['-r',46,4,8,26,4], ['-r',72,58,22,8,4]],
  gemini:   [['p','M50 4 C55 30 70 45 96 50 C70 55 55 70 50 96 C45 70 30 55 4 50 C30 45 45 30 50 4 Z']],
  claude:   [['l',50,50,50,10,9],['l',50,50,50,90,9],['l',50,50,12,50,9],['l',50,50,88,50,9],
             ['l',50,50,23,23,8],['l',50,50,77,77,8],['l',50,50,77,23,8],['l',50,50,23,77,8]],
  copilot:  [['p','M22 34 C36 26 54 30 60 44 C66 58 60 74 44 76 C28 78 16 66 16 54 C16 44 18 38 22 34 Z'],
             ['p','M78 66 C64 74 46 70 40 56 C34 42 40 26 56 24 C72 22 84 34 84 46 C84 56 82 62 78 66 Z'],
             ['-c',36,50,6], ['-c',64,50,6]],
  perplex:  [['r',12,12,76,76,10], ['-l',50,20,50,80,7],
             ['-p','M26 30 L50 46 L74 30',6], ['-p','M26 70 L50 54 L74 70',6]],
  deepseek: [['p','M14 62 C26 48 40 44 54 48 C66 52 74 46 78 34 C86 44 84 60 72 68 C58 78 32 76 14 62 Z'],
             ['-c',66,44,6]],
  grok:     [['l',22,78,74,22,11], ['l',56,22,80,22,11], ['l',78,24,78,48,11]],

  /* ── microsoft y trabajo ── */
  outlook:  [['r',44,20,48,60,7], ['-l',52,36,84,36,5],['-l',52,50,84,50,5],['-l',52,64,72,64,5],
             ['r',8,26,34,48,8], ['-t','O',30,60,25]],
  word:     [['r',12,10,76,80,10], ['-t','W',40,66]],
  excel:    [['r',12,10,76,80,10], ['-t','X',40,66]],
  ppt:      [['r',12,10,76,80,10], ['-t','P',40,66]],
  onenote:  [['r',12,10,76,80,10], ['-t','N',40,66]],
  onedrive: [['p','M28 76 C16 76 8 68 8 58 C8 48 17 41 26 43 C30 30 46 26 56 33 C62 37 66 44 66 50 C80 50 92 57 92 66 C92 73 85 76 76 76 Z']],
  slack:    [['r',10,42,34,16,8],['r',42,10,16,34,8],['r',56,42,34,16,8],['r',42,56,16,34,8]],
  trello:   [['r',12,12,76,76,12], ['-r',24,24,22,50,4], ['-r',54,24,22,32,4]],
  jira:     [['p','M50 6 L88 44 L69 44 L50 25 Z'], ['p','M50 44 L88 82 L50 94 L12 56 Z'],
             ['-p','M50 56 L62 68 L50 80 L38 68 Z']],
  asana:    [['c',50,30,17], ['c',26,70,17], ['c',74,70,17]],
  zoho:     [['r',10,30,80,44,8], ['-t','Z',34,62]],

  /* ── creativas ── */
  photoshop:[['r',10,10,80,80,16], ['-t','Ps',36,64]],
  lightroom:[['r',10,10,80,80,16], ['-t','Lr',36,64]],
  illustr:  [['r',10,10,80,80,16], ['-t','Ai',36,64]],
  premiere: [['r',10,10,80,80,16], ['-t','Pr',36,64]],
  acrobat:  [['p','M18 8 L60 8 L84 32 L84 92 L18 92 Z'], ['-p','M60 8 L60 32 L84 32 Z'],
             ['-t','A',30,72]],
  capcut:   [['r',10,10,80,80,18], ['-l',26,26,74,74,8], ['-c',34,68,9], ['-c',68,34,9]],
  picsart:  [['c',50,50,40], ['-p','M30 62 C36 44 46 34 58 34 C68 34 74 42 70 52 C66 62 54 66 42 62'],
             ['-c',64,66,6]],
  vsco:     [['o',50,50,40,8], ['c',50,50,17]],
  snapseed: [['p','M50 6 C22 20 12 44 20 66 C27 84 46 94 50 94 C54 94 73 84 80 66 C88 44 78 20 50 6 Z'],
             ['-l',50,22,50,80,6]],
  inshot:   [['r',10,20,80,60,10], ['-r',20,30,60,40,5], ['p','M40 40 L62 50 L40 60 Z'],
             ['r',4,26,8,10,3],['r',4,64,8,10,3],['r',88,26,8,10,3],['r',88,64,8,10,3]],

  /* ── streaming ── */
  prime:    [['r',6,22,88,56,12], ['-p','M38 36 L66 50 L38 64 Z'],
             ['p','M14 84 C34 96 66 96 86 84',7]],
  disney:   [['t','D',66,74,38], ['l',66,44,90,44,8], ['l',78,32,78,56,8]],
  hbomax:   [['r',6,26,88,48,10], ['-t','M',34,62]],
  appletv:  [['r',6,26,88,48,10], ['-t','tv',30,60]],
  crunchy:  [['c',50,50,40], ['-c',50,50,26], ['-p','M50 10 C74 10 90 28 90 50',13]],
  plex:     [['r',12,12,76,76,14], ['-p','M36 26 L60 50 L36 74 Z']],
  tidal:    [['p','M28 22 L44 38 L28 54 L12 38 Z'], ['p','M72 22 L88 38 L72 54 L56 38 Z'],
             ['p','M50 44 L66 60 L50 76 L34 60 Z']],
  applemus: [['r',10,10,80,80,20], ['-c',36,68,10], ['-c',66,60,9],
             ['-r',44,28,5,42,2], ['-r',72,22,6,40,2], ['-p','M44 28 L78 22 L78 34 L44 40 Z']],
  audible:  [['t','a',62,70], ['p','M14 34 C22 22 34 16 50 16 C66 16 78 22 86 34',6]],
  kindle:   [['p','M8 20 L46 26 L46 88 L8 82 Z'], ['p','M92 20 L54 26 L54 88 L92 82 Z'],
             ['-l',50,26,50,88,4]],
  pocketc:  [['c',50,50,40], ['-p','M42 34 L66 50 L42 66 Z']],

  /* ── transporte y delivery ── */
  rappi:    [['r',10,10,80,80,20], ['-t','R',44,68]],
  pedidosya:[['c',50,50,40], ['-r',34,26,7,48,3], ['-p','M56 26 C66 26 70 34 70 44 C70 52 66 56 60 56 L60 74',6]],
  glovo:    [['p','M22 34 L78 34 L86 88 L14 88 Z'], ['-p','M36 46 C42 56 58 56 64 46',6],
             ['p','M36 34 L36 22 A14 14 0 0 1 64 22 L64 34',6]],
  ubereats: [['p','M14 46 C14 66 30 80 50 80 C70 80 86 66 86 46 Z'],
             ['-p','M26 56 L74 56',5], ['l',10,88,90,88,7]],
  didi:     [['r',10,10,80,80,20], ['-t','D',44,68]],
  cabify:   [['c',50,50,40], ['-p','M64 36 C56 30 40 34 38 48 C36 62 46 70 58 68 C62 67 65 65 67 62',9]],
  lyft:     [['t','L',60,72,34], ['c',66,40,13], ['-c',66,40,5]],
  bolt:     [['p','M58 6 L26 54 L46 54 L40 94 L74 44 L52 44 Z']],
  moovit:   [['r',18,16,64,52,10], ['-r',26,26,48,22,4], ['-c',32,58,6], ['-c',68,58,6],
             ['l',26,72,26,86,7], ['l',74,72,74,86,7]],
  booking:  [['r',12,10,76,80,12], ['-p','M36 26 L52 26 C64 26 66 40 56 46 C68 50 66 66 52 66 L36 66 Z'],
             ['r',42,34,12,10,3], ['r',42,50,14,10,3]],
  airbnb:   [['p','M50 8 C58 8 62 16 68 30 C78 52 88 66 88 76 C88 86 80 92 72 92 C64 92 56 86 50 78 C44 86 36 92 28 92 C20 92 12 86 12 76 C12 66 22 52 32 30 C38 16 42 8 50 8 Z'],
             ['-p','M50 30 C56 42 68 62 68 72 C68 78 62 80 58 78 C54 76 52 72 50 68 C48 72 46 76 42 78 C38 80 32 78 32 72 C32 62 44 42 50 30 Z']],
  tripadv:  [['o',30,52,22,7], ['o',70,52,22,7], ['c',30,52,7], ['c',70,52,7],
             ['p','M30 24 C40 18 60 18 70 24',6]],

  /* ── compras ── */
  aliexpr:  [['r',10,10,80,80,20], ['-t','A',44,66]],
  shein:    [['r',10,10,80,80,20], ['-t','S',44,68]],
  temu:     [['r',10,10,80,80,20], ['-t','T',44,68]],
  ebay:     [['t','e',66,72,32], ['c',68,48,12], ['-c',68,48,5]],
  etsy:     [['c',50,50,40], ['-t','E',44,66]],
  olx:      [['c',26,50,17], ['-c',26,50,7], ['l',48,38,68,62,9],['l',68,38,48,62,9],
             ['c',84,50,9]],

  /* ── plata ── */
  nubank:   [['r',10,10,80,80,20], ['-p','M32 68 L32 32 L44 32 L64 60 L64 32 L74 32 L74 68 L62 68 L42 40 L42 68 Z']],
  revolut:  [['t','R',66,74,42], ['l',22,26,22,80,9]],
  wise:     [['p','M10 26 L52 26 L36 46 L60 46 L18 90 L30 58 L8 58 Z'], ['l',56,26,90,26,7]],
  cashapp:  [['r',10,10,80,80,22], ['-r',46,20,8,60,4], ['-t','$',40,66]],
  coinbase: [['c',50,50,40], ['-r',34,34,32,32,5]],
  metamask: [['p','M50 8 L88 26 L82 62 L50 92 L18 62 L12 26 Z'],
             ['-p','M32 34 L46 44 L40 56 L28 50 Z'], ['-p','M68 34 L54 44 L60 56 L72 50 Z'],
             ['-p','M38 68 L62 68 L56 80 L44 80 Z']],
  pix:      [['p','M50 4 L70 24 L50 44 L30 24 Z'], ['p','M4 50 L24 30 L44 50 L24 70 Z'],
             ['p','M96 50 L76 30 L56 50 L76 70 Z'], ['p','M50 96 L70 76 L50 56 L30 76 Z']],
  stripe:   [['r',10,10,80,80,14], ['-t','S',42,66]],

  /* ── juegos ── */
  amongus:  [['p','M34 24 C34 14 44 8 54 8 C66 8 74 16 74 28 L74 76 C74 84 68 90 60 90 L38 90 C30 90 26 84 26 76 L26 42 C26 32 30 26 34 24 Z'],
             ['p','M78 34 C88 34 92 42 92 50 C92 58 88 64 78 64 Z'],
             ['-p','M40 26 C52 22 66 26 70 34 C72 40 70 46 62 46 C50 46 40 40 38 34 C37 30 38 27 40 26 Z']],
  geodash:  [['r',12,12,76,76,10], ['-c',36,42,7], ['-c',64,42,7],
             ['-r',34,60,32,8,4]],
  freefire: [['p','M52 6 C46 24 34 32 30 46 C24 66 36 88 54 92 C48 80 52 70 60 64 C64 76 62 84 58 92 C76 86 84 66 78 50 C72 34 58 26 52 6 Z']],
  clashroy: [['p','M12 76 L20 30 L36 48 L50 22 L64 48 L80 30 L88 76 Z'], ['r',12,80,76,12,4],
             ['c',20,26,7],['c',50,18,7],['c',80,26,7]],
  clashclans:[['p','M50 8 L88 22 L88 52 C88 74 70 88 50 94 C30 88 12 74 12 52 L12 22 Z'],
             ['-t','C',44,66]],
  brawl:    [['p','M50 6 L62 36 L94 38 L69 58 L78 90 L50 72 L22 90 L31 58 L6 38 L38 36 Z'],
             ['-c',40,44,6], ['-c',60,44,6]],
  playst:   [['p','M30 12 L40 30 L20 30 Z'], ['o',72,22,10,6],
             ['l',18,58,34,74,7],['l',34,58,18,74,7], ['r',62,58,20,20,3]],
  xbox:     [['o',50,50,40,8], ['p','M28 24 C40 38 60 62 72 76',9],
             ['p','M72 24 C60 38 40 62 28 76',9]],
  nintendo: [['r',10,20,26,60,12], ['r',64,20,26,60,12], ['r',40,20,20,60,3],
             ['-c',23,38,6], ['-c',77,50,6]],
  epicgames:[['p','M18 8 L82 8 L82 70 L50 92 L18 70 Z'],
             ['-r',36,24,28,9,3], ['-r',36,42,20,9,3], ['-r',36,60,28,9,3]],
  fortnite: [['r',10,10,80,80,14], ['-t','F',44,68]],

  /* ── salud y estudio ── */
  strava:   [['p','M42 8 L14 62 L30 62 L42 38 L54 62 L70 62 Z'],
             ['p','M56 62 L44 86 L72 40 L88 40 L72 68 L56 92 Z']],
  nike:     [['p','M8 62 C28 76 74 52 92 20 C82 44 52 82 26 82 C16 82 10 74 8 62 Z']],
  adidas:   [['p','M18 88 L44 88 L26 54 L14 62 Z'], ['p','M44 88 L70 88 L42 40 L30 48 Z'],
             ['p','M70 88 L96 88 L58 26 L46 34 Z']],
  fit:      [['o',50,50,38,9], ['-p','M22 52 L38 52 L46 34 L58 68 L64 52 L78 52',7]],
  headspace:[['c',50,50,40], ['-p','M30 58 C38 70 62 70 70 58',7], ['-c',36,42,6], ['-c',64,42,6]],
  calm:     [['c',50,50,40], ['-p','M18 50 C28 40 38 60 50 50 C62 40 72 60 82 50',6]],
  classroom:[['r',8,20,84,60,8], ['-r',16,28,68,44,4],
             ['c',50,44,10], ['p','M32 68 C32 56 40 52 50 52 C60 52 68 56 68 68 Z']],
  docs:     [['p','M20 6 L60 6 L82 28 L82 94 L20 94 Z'], ['-p','M60 6 L60 28 L82 28 Z'],
             ['-l',32,46,70,46,5],['-l',32,60,70,60,5],['-l',32,74,56,74,5]],
  sheets:   [['p','M20 6 L60 6 L82 28 L82 94 L20 94 Z'], ['-p','M60 6 L60 28 L82 28 Z'],
             ['-r',30,42,40,38,2], ['r',30,42,40,4,1],['r',30,56,40,4,1],['r',30,70,40,4,1],
             ['r',44,42,4,38,1]],
  slides:   [['p','M20 6 L60 6 L82 28 L82 94 L20 94 Z'], ['-p','M60 6 L60 28 L82 28 Z'],
             ['-r',30,46,40,30,3]],
  lens:     [['p','M10 10 L34 10 L34 18 L18 18 L18 34 L10 34 Z'],
             ['p','M90 10 L66 10 L66 18 L82 18 L82 34 L90 34 Z'],
             ['p','M10 90 L34 90 L34 82 L18 82 L18 66 L10 66 Z'],
             ['p','M90 90 L66 90 L66 82 L82 82 L82 66 L90 66 Z'], ['c',50,50,17]],
  earth:    [['o',50,44,32,7], ['p','M18 44 L82 44',6],
             ['p','M50 12 C36 24 36 64 50 76 M50 12 C64 24 64 64 50 76'],
             ['p','M50 76 L50 94',6]],
  home:     [['p','M50 10 L92 48 L80 48 L80 90 L20 90 L20 48 L8 48 Z'], ['-c',50,56,13]],
  udemy:    [['p','M50 14 L92 34 L50 54 L8 34 Z'],
             ['p','M24 46 L24 68 C24 80 38 86 50 86 C62 86 76 80 76 68 L76 46',7]],
  khan:     [['p','M50 8 L88 26 L88 58 C88 78 70 90 50 94 C30 90 12 78 12 58 L12 26 Z'],
             ['-p','M36 66 L36 34 L46 34 L46 48 L58 34 L70 34 L56 50 L72 66 L58 66 L46 52 L46 66 Z']],

  /* ── dev y utilidades ── */
  gitlab:   [['p','M50 92 L18 46 L28 12 L38 46 L62 46 L72 12 L82 46 Z'],
             ['p','M18 46 L6 46 L50 92 Z'], ['p','M82 46 L94 46 L50 92 Z']],
  stackov:  [['p','M22 62 L22 88 L78 88 L78 62 L88 62 L88 96 L12 96 L12 62 Z'],
             ['r',32,68,42,8,3], ['p','M34 56 L74 48 L76 58 L36 66 Z'],
             ['p','M38 36 L74 22 L78 32 L42 46 Z']],
  docker:   [['r',18,48,14,12,2],['r',36,48,14,12,2],['r',54,48,14,12,2],
             ['r',36,32,14,12,2],['r',54,32,14,12,2],['r',54,16,14,12,2],
             ['p','M8 64 C20 78 46 84 66 78 C80 74 88 66 90 56 C94 60 96 62 96 62 C92 76 78 88 56 88 C30 88 12 78 8 64 Z']],
  termux:   [['r',8,16,84,68,10], ['-p','M24 36 L42 50 L24 64',7], ['-l',50,64,74,64,7]],
  python:   [['p','M50 6 C34 6 26 12 26 24 L26 36 L50 36 L50 42 L20 42 C10 42 6 52 6 62 C6 74 12 82 22 82 L30 82 L30 66 C30 56 36 50 46 50 L62 50 C72 50 76 44 76 36 L76 24 C76 12 66 6 50 6 Z'],
             ['-c',40,20,5]],
  gauge:    [['p','M12 72 A38 38 0 1 1 88 72',9], ['l',50,72,68,44,8], ['c',50,72,7]],
  vpn:      [['p','M50 8 L88 24 L88 54 C88 76 70 90 50 94 C30 90 12 76 12 54 L12 24 Z'],
             ['-c',50,46,10], ['-r',45,46,10,22,4]],
  firefox:  [['c',50,52,38], ['-p','M50 22 C34 24 26 38 28 52 C30 66 42 76 56 74 C68 72 74 62 72 54 C70 46 62 42 54 44 C48 46 46 52 48 56'],
             ['p','M78 12 C86 18 90 28 88 36',7]],
  edge:     [['p','M84 62 C78 78 62 90 44 90 C24 90 10 76 10 58 C10 36 28 18 50 18 C72 18 88 32 88 50 L44 50 C36 50 32 56 34 62 C38 72 52 76 66 72 C74 70 80 66 84 62 Z']],
  brave:    [['p','M50 6 L74 16 L88 12 L92 32 L84 44 L84 62 C84 78 68 90 50 94 C32 90 16 78 16 62 L16 44 L8 32 L12 12 L26 16 Z'],
             ['-p','M50 34 L62 56 L50 66 L38 56 Z']],
  authent:  [['p','M50 8 L88 24 L88 54 C88 76 70 90 50 94 C30 90 12 76 12 54 L12 24 Z'],
             ['-c',50,42,11], ['-r',46,42,8,26,3], ['-r',54,54,10,6,2]],
  winrar:   [['p','M14 26 L44 26 L52 36 L86 36 L86 84 L14 84 Z'],
             ['-r',44,44,12,32,2], ['r',44,44,12,7,1],['r',44,58,12,7,1],['r',44,72,12,4,1]],
  tasker:   [['p','M50 8 L58 8 L61 22 L70 26 L82 18 L88 24 L80 36 L84 45 L98 48 L98 56 L84 59 L80 68 L88 80 L82 86 L70 78 L61 82 L58 96 L50 96 L42 96 L39 82 L30 78 L18 86 L12 80 L20 68 L16 59 L2 56 L2 48 L16 45 L20 36 L12 24 L18 18 L30 26 L39 22 L42 8 Z'],
             ['-p','M40 40 L64 52 L40 64 Z']],

  /* ── mensajería que faltaba ── */
  viber:    [['p','M50 8 C26 8 8 24 8 46 C8 62 18 74 32 80 L30 94 L46 84 C48 84 49 84 50 84 C74 84 92 68 92 46 C92 24 74 8 50 8 Z'],
             ['-p','M36 28 C31 32 30 40 34 48 C40 60 52 70 62 72 C68 73 72 70 73 66 L66 60 C64 58 61 59 59 61 C55 58 51 53 48 48 L52 45 C54 43 54 40 52 38 L44 28 C42 26 38 26 36 28 Z']],
  line:     [['r',8,12,84,64,20], ['p','M34 74 L50 76 L38 92 Z'],
             ['-l',24,32,24,54,7],['-l',24,54,36,54,7],
             ['-l',46,32,46,54,7], ['-l',60,32,60,54,7],['-l',60,32,74,32,7],
             ['-l',60,43,72,43,7],['-l',60,54,74,54,7]],
  kakao:    [['p','M50 12 C26 12 8 26 8 44 C8 56 16 66 28 72 L24 90 L44 78 C46 78 48 78 50 78 C74 78 92 62 92 44 C92 26 74 12 50 12 Z'],
             ['-c',34,44,6], ['-c',66,44,6], ['-p','M38 58 C44 64 56 64 62 58',5]],
  tumblr:   [['p','M40 8 L56 8 L56 30 L78 30 L78 48 L56 48 L56 68 C56 76 60 78 68 78 L80 78 L80 92 L62 92 C44 92 38 82 38 68 L38 48 L24 48 L24 32 C34 28 40 20 40 8 Z']],
  mastodon: [['p','M50 8 C28 8 14 20 14 40 C14 62 18 76 26 82 C34 88 48 90 62 88 L62 76 C50 78 40 77 34 74 C46 80 66 78 74 70 C82 62 84 48 82 34 C80 16 68 8 50 8 Z'],
             ['-p','M34 52 L34 38 C34 30 44 28 48 36 L50 40 L52 36 C56 28 66 30 66 38 L66 52',7]],
  truecall: [['c',50,50,40], ['-p','M32 28 C26 34 26 44 32 54 C40 68 56 78 68 74 C72 72 74 68 72 64 L64 58 C61 56 58 58 56 60 C51 56 46 50 44 45 L48 42 C50 40 51 37 49 35 L42 27 C40 25 35 25 32 28 Z']],
  imo:      [['r',10,14,80,58,16], ['p','M32 68 L52 70 L34 90 Z'],
             ['-l',30,36,30,54,7], ['-c',50,44,8], ['-o',50,44,8,0],
             ['-l',66,36,66,54,7],['-l',80,36,80,54,7],['-l',66,36,80,36,7]],

  /* ── otras que faltaban ── */
  ebook:    [['p','M50 22 C38 12 20 12 8 16 L8 84 C20 80 38 80 50 90 Z'],
             ['p','M50 22 C62 12 80 12 92 16 L92 84 C80 80 62 80 50 90 Z'],
             ['-l',50,22,50,90,4]],
  escaner:  [['p','M8 30 L8 12 L26 12',7], ['p','M92 30 L92 12 L74 12',7],
             ['p','M8 70 L8 88 L26 88',7], ['p','M92 70 L92 88 L74 88',7],
             ['r',20,46,60,8,3]],
  bateria:  [['r',12,30,68,40,8], ['r',84,42,8,16,3], ['-r',20,38,28,24,3]],

  /* ── LOS OCHO DEL CENTRO DE CONTROL ──
     No son marcas: son los símbolos que cualquiera reconoce en una barra de
     estado, y por eso se dibujan acá y no se generan. Van en el mismo
     vocabulario que los otros doscientos, así que el centro de control se lee
     de la misma familia que el cajón — dos juegos de dibujos para lo mismo,
     puestos uno al lado del otro, se leen a dos cosas distintas. */
  wifi:     [['p','M50 22 C69 22 86 29 98 41 L88 52 C79 43 65 37 50 37 C35 37 21 43 12 52 L2 41 C14 29 31 22 50 22 Z'],
             ['p','M50 46 C61 46 71 50 79 57 L69 68 C64 63 57 60 50 60 C43 60 36 63 31 68 L21 57 C29 50 39 46 50 46 Z'],
             ['c',50,80,10]],
  datos:    [['r',10,74,12,18,3], ['r',30,60,12,32,3], ['r',50,42,12,50,3],
             ['r',70,20,12,72,3]],
  bt:       [['p','M42 8 L74 34 L50 50 L74 66 L42 92 L42 8 Z M52 28 L52 40 L60 34 Z M52 60 L52 72 L60 66 Z']],
  avion:    [['p','M50 6 C55 6 58 12 58 22 L58 38 L94 62 L94 72 L58 62 L58 78 L72 88 L72 95 L50 89 L28 95 L28 88 L42 78 L42 62 L6 72 L6 62 L42 38 L42 22 C42 12 45 6 50 6 Z']],
  rotar:    [['p','M50 12 A38 38 0 1 1 16 32 L28 39 A24 24 0 1 0 50 26 Z'],
             ['p','M42 4 L62 14 L42 26 Z']],
  dnd:      [['o',50,50,38,9], ['r',26,44,48,12,4]],
  ubicacion:[['p','M50 8 A28 28 0 0 0 22 36 C22 58 50 92 50 92 C50 92 78 58 78 36 A28 28 0 0 0 50 8 Z'],
             ['-c',50,36,11]],
  nfc:      [['o',50,50,40,7],
             ['p','M34 30 L34 70 L42 70 L42 46 L60 70 L68 70 L68 30 L60 30 L60 54 L42 30 Z']],
  radio:    [['r',8,32,84,54,10], ['-o',30,58,14,6], ['-r',52,44,30,6,3],
             ['-c',60,66,5],['-c',74,66,5], ['l',60,32,86,12,5]],
  tv:       [['r',8,20,84,54,8], ['-r',16,28,68,38,4], ['l',30,86,70,86,7],
             ['l',50,74,50,86,7]],
  imprime:  [['r',26,10,48,22,3], ['r',8,32,84,36,6], ['-c',80,42,5],
             ['r',26,58,48,32,3], ['-l',34,68,66,68,4],['-l',34,78,58,78,4]],
  qr:       [['r',10,10,32,32,4], ['-r',20,20,12,12,2],
             ['r',58,10,32,32,4], ['-r',68,20,12,12,2],
             ['r',10,58,32,32,4], ['-r',20,68,12,12,2],
             ['r',58,58,12,12,2], ['r',78,58,12,12,2], ['r',58,78,12,12,2], ['r',78,78,12,12,2]]

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
  youtube:  ['com.google.android.youtube'],
  ytmusic:  ['com.google.android.apps.youtube.music'],
  ytstudio: ['com.google.android.apps.youtube.creator'],
  ytkids:   ['com.google.android.apps.youtube.kids'],
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
  musica:   ['music'],
  video:    ['videoplayer', 'com.miui.video', 'videos'],
  micro:    ['soundrecorder', 'recorder'],
  linterna: ['flashlight', 'torch'],
  brujula:  ['compass'],
  descargas:['downloads', 'providers.downloads'],
  tienda:   ['store', 'shop'],
  banco:    ['bank', 'banco', 'bbva', 'santander', 'galicia'],
  billetera:['wallet', 'com.google.android.apps.walletnfcrel'],
  correo:   ['com.android.email', 'mail'],
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
  vscode:   ['dev.vscode', 'com.foxdebug.acode'],
  github:   ['com.github'],
  figma:    ['com.figma'],
  canva:    ['com.canva'],
  wikipedia:['org.wikipedia'],
  waze:     ['com.waze'],
  skype:    ['com.skype'],
  duolingo: ['com.duolingo'],
  /* ── los de la vuelta 124 ── */
  chatgpt:  ['com.openai.chatgpt'],
  gemini:   ['com.google.android.apps.bard', 'com.google.android.apps.gemini'],
  claude:   ['com.anthropic.claude'],
  copilot:  ['com.microsoft.copilot', 'com.microsoft.bing'],
  perplex:  ['ai.perplexity'],
  deepseek: ['com.deepseek'],
  grok:     ['ai.x.grok', 'xai.grok'],
  outlook:  ['com.microsoft.office.outlook'],
  word:     ['com.microsoft.office.word'],
  excel:    ['com.microsoft.office.excel'],
  ppt:      ['com.microsoft.office.powerpoint'],
  onenote:  ['com.microsoft.office.onenote'],
  onedrive: ['com.microsoft.skydrive'],
  slack:    ['com.slack'],
  trello:   ['com.trello'],
  jira:     ['com.atlassian.android.jira'],
  asana:    ['com.asana.app'],
  zoho:     ['com.zoho'],
  photoshop:['com.adobe.psmobile', 'com.adobe.photoshop'],
  lightroom:['com.adobe.lrmobile'],
  illustr:  ['com.adobe.illustrator'],
  premiere: ['com.adobe.premiere'],
  acrobat:  ['com.adobe.reader', 'com.adobe.acrobat'],
  capcut:   ['com.lemon.lvoverseas', 'com.bytedance.capcut'],
  picsart:  ['com.picsart'],
  vsco:     ['com.vsco'],
  snapseed: ['com.niksoftware.snapseed'],
  inshot:   ['com.camerasideas.instashot'],
  prime:    ['com.amazon.avod'],
  disney:   ['com.disney.disneyplus'],
  hbomax:   ['com.wbd.stream', 'com.hbo.'],
  appletv:  ['com.apple.atve', 'com.apple.tv'],
  crunchy:  ['com.crunchyroll'],
  plex:     ['com.plexapp'],
  tidal:    ['com.aspiro.tidal'],
  applemus: ['com.apple.android.music'],
  audible:  ['com.audible'],
  kindle:   ['com.amazon.kindle'],
  pocketc:  ['au.com.shiftyjelly.pocketcasts'],
  rappi:    ['com.rappi'],
  pedidosya:['com.pedidosya'],
  glovo:    ['com.glovo'],
  ubereats: ['com.ubercab.eats'],
  didi:     ['com.didiglobal', 'com.sdu.didi'],
  cabify:   ['com.cabify'],
  lyft:     ['me.lyft'],
  bolt:     ['ee.mtakso.client'],
  moovit:   ['com.tranzmate'],
  booking:  ['com.booking'],
  airbnb:   ['com.airbnb'],
  tripadv:  ['com.tripadvisor'],
  aliexpr:  ['com.alibaba.aliexpresshd'],
  shein:    ['com.zzkko'],
  temu:     ['com.einnovation.temu'],
  ebay:     ['com.ebay'],
  etsy:     ['com.etsy'],
  olx:      ['com.olx', 'com.schibsted'],
  nubank:   ['com.nu.production'],
  revolut:  ['com.revolut'],
  wise:     ['com.transferwise'],
  cashapp:  ['com.squareup.cash'],
  coinbase: ['com.coinbase'],
  metamask: ['io.metamask'],
  pix:      ['br.gov.bcb.pix'],
  stripe:   ['com.stripe'],
  amongus:  ['com.innersloth'],
  geodash:  ['com.robtopx'],
  freefire: ['com.dts.freefire'],
  clashroy: ['com.supercell.clashroyale'],
  clashclans:['com.supercell.clashofclans'],
  brawl:    ['com.supercell.brawlstars'],
  playst:   ['com.scee.psxandroid', 'com.playstation'],
  xbox:     ['com.microsoft.xboxone', 'com.microsoft.xbox'],
  nintendo: ['com.nintendo'],
  epicgames:['com.epicgames'],
  fortnite: ['com.epicgames.fortnite'],
  strava:   ['com.strava'],
  nike:     ['com.nike'],
  adidas:   ['com.adidas'],
  fit:      ['com.google.android.apps.fitness'],
  headspace:['com.getsomeheadspace'],
  calm:     ['com.calm.android'],
  classroom:['com.google.android.apps.classroom'],
  docs:     ['com.google.android.apps.docs.editors.docs'],
  sheets:   ['com.google.android.apps.docs.editors.sheets'],
  slides:   ['com.google.android.apps.docs.editors.slides'],
  lens:     ['com.google.ar.lens'],
  earth:    ['com.google.earth'],
  home:     ['com.google.android.apps.chromecast'],
  udemy:    ['com.udemy'],
  khan:     ['org.khanacademy'],
  gitlab:   ['com.gitlab'],
  stackov:  ['com.stackexchange'],
  docker:   ['com.docker'],
  termux:   ['com.termux'],
  python:   ['org.qpython', 'ru.iiec.pydroid'],
  gauge:    ['org.zwanoo.android.speedtest', 'speedtest'],
  vpn:      ['com.nordvpn', 'com.expressvpn', 'de.mobileconcepts.cyberghost', 'vpn'],
  firefox:  ['org.mozilla.firefox'],
  edge:     ['com.microsoft.emmx'],
  brave:    ['com.brave.browser'],
  authent:  ['com.google.android.apps.authenticator', 'com.azure.authenticator'],
  winrar:   ['com.rarlab.rar', 'com.zipextractor'],
  tasker:   ['net.dinglisch.android.taskerm'],
  viber:    ['com.viber'],
  line:     ['jp.naver.line'],
  kakao:    ['com.kakao.talk'],
  tumblr:   ['com.tumblr'],
  mastodon: ['org.joinmastodon'],
  truecall: ['com.truecaller'],
  imo:      ['com.imo.android'],
  ebook:    ['com.google.android.apps.books', 'ebook', 'reader'],
  escaner:  ['scanner', 'camscanner', 'docscan'],
  bateria:  ['battery', 'bateria', 'powersaving'],
  radio:    ['radio', 'tunein', 'iheart'],
  tv:       ['com.google.android.videos', 'androidtv', 'smarttv'],
  imprime:  ['printservice', 'printer', 'com.hp.', 'com.epson'],
  qr:       ['qrcode', 'barcode', 'scanqr']
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
              'linkedin','skype','zoom','teams','mensajes','telefono','contactos','correo','waze',
              /* vuelta 124 */
              'chatgpt','gemini','claude','copilot','perplex','deepseek','grok','outlook',
              'word','excel','ppt','onenote','onedrive','slack','trello','jira','asana','zoho',
              'viber','line','kakao','tumblr','mastodon','truecall','imo'],
  cielo:     ['youtube','spotify','netflix','twitch','soundcloud','vlc','shazam','deezer','musica',
              'video','podcast','micro','galeria','fotos','camara','instagram','snapchat','pinterest',
              'threads','facebook','reddit','noticias',
              /* vuelta 124 */
              'ytmusic','ytstudio','ytkids','prime','disney','hbomax','appletv','crunchy',
              'plex','tidal','applemus','audible','kindle','pocketc','photoshop','lightroom',
              'illustr','premiere','capcut','picsart','vsco','snapseed','inshot','radio','tv'],
  pasto:     ['chrome','google','maps','drive','keep','traduce','meet','gmail','archivos','ajustes',
              'reloj','calc','calendario','notas','clima','linterna','brujula','descargas','navegador',
              'salud','duolingo','wikipedia','notion','github','vscode','figma','canva','dropbox',
              /* vuelta 124 */
              'classroom','docs','sheets','slides','lens','earth','home','udemy','khan','fit',
              'headspace','calm','strava','nike','adidas','gitlab','stackov','docker','termux',
              'python','gauge','vpn','firefox','edge','brave','authent','winrar','tasker',
              'acrobat','ebook','escaner','bateria','imprime','qr'],
  atardecer: ['play','tienda','banco','billetera','mercado','uber','paypal','binance','amazon',
              'steam','roblox','minecraft','juegos',
              /* vuelta 124 */
              'rappi','pedidosya','glovo','ubereats','didi','cabify','lyft','bolt','moovit',
              'booking','airbnb','tripadv','aliexpr','shein','temu','ebay','etsy','olx',
              'nubank','revolut','wise','cashapp','coinbase','metamask','pix','stripe',
              'amongus','geodash','freefire','clashroy','clashclans','brawl','playst','xbox',
              'nintendo','epicgames','fortnite']
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
function ICO_CACHE_LIMPIA(){ ICO_CACHE = {};
  /* la baldosa guardada del cajón lleva el pack puesto adentro: si el glifo
     cambia y la baldosa no, el cajón se queda con el pack anterior */
  cajCacheLimpia(); }

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
  let g = null, largo = -1;
  /* ── GANA EL PEDAZO MÁS LARGO, NO EL PRIMERO DECLARADO ──
     Con el primero que matchea, el orden de la tabla decide el icono: y como
     los pedazos se comparan por subcadena, `com.google.android.apps.youtube`
     se comía a `...youtube.music` y YT Music salía con el icono de YouTube.
     Eso no se arregla agregando entradas —se arregla cambiando quién gana—, y
     con ciento cincuenta glifos hace falta que agregar uno no le pueda robar
     el icono a otro sin que nadie se entere. El pedazo más largo es el más
     específico por construcción. */
  for (const k in ICO_PKG){
    for (const frag of ICO_PKG[k]){
      if (p === frag){ g = k; largo = 999; break; }
      if (p.indexOf(frag) >= 0 && frag.length > largo){ g = k; largo = frag.length; }
    }
    if (largo === 999) break;
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

function glifoSvg(g, P){
  const gl = GLIFOS[g]; if (!gl) return null;
  P = P || { relieve: true };
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
  defs.appendChild(mk);

  /* ── EL GLIFO TIENE VOLUMEN, Y ESO SON TRES RECTÁNGULOS Y NINGÚN FILTRO ──
     Reporte: «los íconos salen to feos». Y era cierto: una silueta blanca lisa
     pegada sobre una foto se lee a calcomanía, no a icono. Lo que le falta a
     esa silueta es exactamente lo que tiene un icono Aero de verdad —el que
     Rezona devuelve cuando se le pide uno—: un canto de arriba encendido, un
     cuerpo que se apaga hacia abajo, y una sombra dura pegada abajo que lo
     despega del fondo.
     Las tres cosas salen de dibujar la MISMA máscara tres veces corrida, que a
     46 px es lo único que se lee. Con `feSpecularLighting` saldría más exacto y
     costaría un filtro de SVG por icono, o sea treinta filtros en el cajón —
     este launcher lleva dos vueltas sacando pasadas de filtro, no es el momento
     de meter treinta.
     El corrimiento va en un `<g>` y no en el rectángulo: el rectángulo mide
     108×108 y cubre todo, así que moverlo no cambia un píxel; lo que hay que
     mover es el resultado ya enmascarado. */
  const gr = document.createElementNS(ns, 'linearGradient');
  const gid = 'gg' + GLF_N;
  gr.setAttribute('id', gid);
  gr.setAttribute('x1', '0'); gr.setAttribute('y1', '0');
  gr.setAttribute('x2', '0'); gr.setAttribute('y2', '1');
  for (const [o, c] of [['0', '#ffffff'], ['0.55', '#f2fbff'], ['1', '#cfe6f2']]){
    const st = document.createElementNS(ns, 'stop');
    st.setAttribute('offset', o); st.setAttribute('stop-color', c);
    gr.appendChild(st);
  }
  defs.appendChild(gr);
  s.appendChild(defs);

  const capa = (fill, dy, op) => {
    const g2 = document.createElementNS(ns, 'g');
    if (dy) g2.setAttribute('transform', 'translate(0,' + dy + ')');
    if (op != null) g2.setAttribute('opacity', op);
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', '-4'); r.setAttribute('y', '-4');
    r.setAttribute('width', '108'); r.setAttribute('height', '108');
    r.setAttribute('fill', fill);
    r.setAttribute('mask', 'url(#' + id + ')');
    g2.appendChild(r); s.appendChild(g2);
    return g2;
  };
  /* ── EL RELIEVE ES DEL PACK ──
     Sobre una foto hace falta —una silueta plana ahi se lee a calcomania— y
     sobre vidrio puro NO: ahi el glifo tiene que ser una marca limpia y llena,
     que es exactamente lo que se pidio con «que solamente los iconos sean en
     blanco». Lo que sostiene el contraste en ese caso es la sombra de `.glf`. */
  const col = P.glifo === 'acento'
            ? (getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#fff')
            : (P.glifo || '#fff');
  if (GLF_RELIEVE && P.relieve !== false){
    capa('#04283c', 2.6, 0.5);      /* la sombra dura, asomando abajo */
    capa('#ffffff', -1.4, 1);       /* el canto de arriba, asomando arriba */
    capa('url(#' + gid + ')', 0, 1);/* el cuerpo */
  } else {
    capa(col, 0, 1);
  }
  return s;
}

/* sólo para poder fotografiar el antes y el después con el MISMO binario: con
   dos versiones distintas se estarían comparando dos programas */
let GLF_RELIEVE = true;

/* ── LA BALDOSA AERO DE UNA APP CONOCIDA ──
   Devuelve true si la pintó. El fondo va como `background-image` del propio
   nodo y el glifo va adentro: así el recorte redondeado, la sombra y el brillo
   siguen siendo los de `.baldosa` y no hay una segunda familia de baldosas que
   mantener. */
/* ══════════════════════ LOS PACKS ══════════════════════

   Pedido: *«que solamente los íconos sean en blanco y el fondo puro líquid
   glass»*, y *«packs de íconos que debes hacer vos, más de 5»*.

   ── UN PACK ES UN DATO, NO UN `if` ──
   Lo que cambia entre un pack y otro son cuatro cosas y ninguna es lógica: qué
   se ve detrás del glifo, si la baldosa deja pasar el fondo de pantalla, de qué
   color va el glifo, y qué forma tiene la baldosa. Escrito como ramas, el sexto
   pack obliga a tocar `icoAero`, el CSS, la personalización, el arranque y la
   sonda — y el que se olvide de uno deja un pack que se elige y no se ve.
   Acá un pack es una fila de una tabla y el resto lo derivan todos.

   `fondo`: 'fam' usa la baldosa generada de la familia · 'img' una sola imagen
   para todas · null es VIDRIO PURO, o sea que la baldosa deja su
   `backdrop-filter` puesto y lo que se ve detrás del glifo es el fondo de
   pantalla desenfocado. Ese es el que se pidió con todas las letras. */
const PACKS = [
  { id: 'aero',    fondo: 'fam',                 relieve: true,  forma: 'cuad',
    tinte: null,   glifo: null },
  { id: 'vidrio',  fondo: null,                  relieve: false, forma: 'cuad',
    tinte: null,   glifo: '#fff' },
  { id: 'burbuja', fondo: null,                  relieve: false, forma: 'redon',
    tinte: 'oscuro', glifo: '#fff' },
  /* ── `css` ES EL RESPALDO DIBUJADO, Y HACÍA FALTA ──
     Estos tres piden una imagen de fondo. Sin ella caían al vidrio puro, o sea
     que en la bienvenida **cuatro filas de siete salían idénticas** —vidrio,
     bliss, tinta y neon— y un pack que no se distingue de otro no es un pack:
     es la lista mintiendo sobre cuántas opciones hay. Con la clase, cada uno
     tiene su cara desde el primer cuadro y la foto lo pisa cuando llegue, que
     es la regla de siempre acá: lo generado no reemplaza nada hasta que llega. */
  { id: 'bliss',   fondo: 'img', img: 'bliss',   relieve: true,  forma: 'cuad',
    tinte: null,   glifo: '#fff',   css: 'pkBliss' },
  /* ── ESTOS DOS TIENEN CARA PROPIA **Y** TABLA GENERADA ──
     `gen` no obliga a tener celdas: dice cuál tabla mirar. Mientras no haya
     ninguna, `icoAero` sigue derecho por el camino de siempre y se ven como
     hasta ahora; el día que las hojas de `tinta` o `neon` se horneen, cada app
     con celda pasa sola a la celda de verdad y la que no la tenga se queda con
     SU cara dibujada. O sea que un pack a medio generar nunca se ve como dos
     packs mezclados, que es el defecto que la vuelta 126 midió con `firmas`. */
  { id: 'tinta',   fondo: 'img', img: 'tinta',   relieve: false, forma: 'cuad',
    tinte: null,   glifo: '#fff',   css: 'pkTinta',  gen: 'tinta' },
  { id: 'neon',    fondo: 'img', img: 'neon',    relieve: true,  forma: 'cuad',
    tinte: null,   glifo: 'acento', css: 'pkNeon',   gen: 'neon' },
  /* ── EL PACK GENERADO: LA CELDA TAL CUAL SALIÓ ──
     Pedido textual: «literalmente podías simplemente recortar cada ícono
     generado con Rezona y ponerlos como íconos en vez de reconstruirlo a mano».
     Acá no hay glifo ni baldosa: la imagen ES el icono entero, con su vidrio,
     su barrida especular y sus gotas dibujados por el generador. Por eso lleva
     `gen` y sale antes de armar el SVG.
     ── Y LO QUE SE LE PIDIÓ AL GENERADOR ES UNA FORMA, NO UNA MARCA ──
     Las dos hojas de la vuelta 125 ya lo habían medido: pedidas por nombre, las
     nueve marcas volvieron mal; pedidos como símbolos genéricos, los nueve
     salieron bien y en orden. Cada celda se describe por su geometría —«una
     nota musical blanca», «un avión de papel»— que es además lo que el logo ES. */
  { id: 'generado', gen: 'generado', cae: 'aero' },
  /* ── «PURO CRISTAL», Y ES EL PEDIDO TEXTUAL ──
     *«el único diferente es el personalizados, que ahí sí descargaste y te
     cortaste; quiero que todos sean así pero con otras estéticas como puro
     cristal»*. Tenía razón y se puede decir con un número: de los siete packs,
     UNO era un juego de celdas generadas y recortadas y los otros seis eran
     tratamientos de CSS sobre un glifo dibujado — o sea que la lista ofrecía
     siete opciones y tenía dos familias.
     Éste es celdas de verdad: vidrio óptico incoloro con el canto biselado y el
     símbolo TALLADO adentro.
     ── Y ES TRANSPARENTE DE VERDAD, QUE FUE UNA CORRECCIÓN DEL USUARIO ──
     *«no de fondo negro sino transparente»*. La hoja se genera sobre negro
     puro, así que la celda salía opaca y oscura: un vidrio que no deja ver
     nada no es vidrio. El alfa se deshornea en `hornear_icogen.py` —el píxel
     sobre negro ya ES alfa premultiplicado— y por eso su respaldo dibujado
     lleva `cssVidrio`: tiene que dejar pasar el fondo de pantalla igual que la
     celda, o la app sin celda saldría como una losa en el medio del pack. */
  { id: 'cristal', gen: 'cristal', fondo: null, relieve: true, forma: 'cuad',
    tinte: null,   glifo: '#fff',  css: 'pkCristal', cssVidrio: true },
  { id: 'nativo',  nativo: true }
];
const PACK_POR_ID = (() => { const m = {}; for (const p of PACKS) m[p.id] = p; return m; })();

function packHoy(){
  /* `icoPack` era un 0/1 de cuando habia un solo pack: un 1 guardado sigue
     queriendo decir «el pack Aero» y un 0 «el icono del sistema». */
  const v = lee('icoPack', 1);
  if (v === 0 || v === '0') return PACK_POR_ID.nativo;
  if (typeof v === 'string' && PACK_POR_ID[v]) return PACK_POR_ID[v];
  return PACK_POR_ID.aero;
}

function icoAero(b, pkg, nombre){
  let P = packHoy();
  if (P.nativo) return false;
  const g = glifoDe(pkg, nombre); if (!g) return false;

  /* ── EL PACK GENERADO NO ARMA NADA: PONE LA CELDA ──
     Sale acá arriba a propósito. La imagen ya trae la baldosa, el canto y el
     brillo, así que todo lo de abajo —el fondo de familia, el vidrio, el relieve
     del glifo— sería una segunda baldosa dibujada encima de la primera. */
  if (P.gen){
    const tabla = (typeof ICOGEN_PACKS !== 'undefined') ? (ICOGEN_PACKS[P.gen] || {}) : {};
    const im = tabla[g];
    if (im){
      /* ── UNA CELDA CON ALFA NO PUEDE LLEVAR `aero` ──
         `aero` apaga el `backdrop-filter` porque quiere decir «hay una foto
         opaca tapando lo de atrás». La celda de cristal es transparente: sin el
         filtro, por dentro del vidrio se ve el fondo de pantalla NÍTIDO, que es
         justo lo que un vidrio grueso no hace. */
      b.classList.add(P.cssVidrio ? 'vidrioPuro' : 'aero', 'gen');
      b.style.backgroundImage = 'url(' + im + ')';
      b.style.backgroundSize = 'cover';
      b.style.backgroundPosition = 'center';
      return true;
    }
    /* ── SIN CELDA, LA CARA DE SU PROPIA FAMILIA; NO EL ICONO DEL SISTEMA ──
       Una app sin celda generada al lado de veinte que sí la tienen se ve como
       un pack a medio poner. Un pack que YA tiene cara dibujada (`css` o una
       imagen de fondo) se queda con la suya y sigue por el camino de abajo; el
       único que no tiene ninguna es `generado`, que es celdas y nada más, y por
       eso declara a quién caer. */
    if (P.cae) P = PACK_POR_ID[P.cae] || PACK_POR_ID.aero;
  }

  const sv = glifoSvg(g, P); if (!sv) return false;

  let fondo = null;
  if (P.fondo === 'fam'){
    const fam = ICO_DE_FAM[g] || 'agua';
    fondo = (typeof ICONOS !== 'undefined' && ICONOS[fam]) ? ICONOS[fam] : null;
    if (!fondo) return false;          /* sin la foto no hay pack: mejor el icono real */
  } else if (P.fondo === 'img'){
    fondo = (typeof ICONOS !== 'undefined' && ICONOS[P.img]) ? ICONOS[P.img] : null;
    /* ── UNA IMAGEN QUE NO LLEGO NO DEJA UNA BALDOSA VACIA ──
       Cae al vidrio puro, que no depende de ningun byte. */
  }
  /* la clase `aero` es «esta baldosa es opaca»: apaga el `backdrop-filter`
     porque hay una foto tapando lo de atras. Sin foto NO va, y ahi el vidrio de
     `.baldosa` es justamente lo que se quiere ver. */
  if (fondo){
    b.classList.add('aero');
    b.style.backgroundImage = 'url(' + fondo + ')';
    b.style.backgroundSize = 'cover';
    b.style.backgroundPosition = 'center';
  } else if (P.css){
    /* ── HAY DOS CLASES DE CARA DIBUJADA, Y LA DIFERENCIA ES EL VIDRIO ──
       `aero` quiere decir «esta baldosa es opaca» y apaga el `backdrop-filter`.
       Eso vale para bliss, tinta y neón, que tapan lo de atrás. La cara de
       cristal es lo contrario: su celda generada es TRANSPARENTE, así que su
       respaldo tiene que dejar pasar el fondo de pantalla o la app sin celda
       saldría como una losa opaca en el medio de un pack de vidrio. */
    b.classList.add(P.cssVidrio ? 'vidrioPuro' : 'aero', P.css);
  } else {
    b.classList.add('vidrioPuro');
  }
  if (P.forma === 'redon') b.classList.add('redon');
  if (P.tinte === 'oscuro') b.classList.add('tOscuro');
  b.appendChild(sv);
  return true;
}
