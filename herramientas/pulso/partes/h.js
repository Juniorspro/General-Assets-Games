
/* ══════════════ EL SUSTO QUE ESTÁ PASANDO ══════════════
   Lo que un susto hace, en orden: aparece algo, suena, la luz reacciona, y —lo
   único que toca al juego— SACUDE. La sacudida no mueve al jugador ni al bol
   directamente: se suma a la aceleración del bol, o sea que entra por la misma
   puerta que la inclinación de la mano. Un susto y una mano temblorosa son la
   misma cosa para la física, que es exactamente lo que el juego dice. */
const ACT = { s: null, t: 0, obj: null, sac: { x: 0, z: 0 }, fijo: false };
let SUSTOS_AGUANTADOS = 0;

/* ══════════════ LOS SPRITES DE LOS SUSTOS ══════════════
   Un susto se ve 0,4 segundos, a un metro, con una linterna temblando encima y
   el jugador mirando el bol. Un modelo de diez mil triángulos ahí no se
   distingue de un plano con un dibujo — pero SÍ se distingue un dibujo de otro,
   y por eso hay CUATRO caras y TRES siluetas en vez de una de cada una: lo que
   arruina un susto no es que sea plano, es reconocerlo. */
const texCaras = [], texSombras = [];

/* ── LAS SEIS CARAS SON FOTOS, Y ESA ES LA DIFERENCIA ──
   Las de abajo, dibujadas con curvas y degradados, están y funcionan: nunca
   fallan, pesan cero y salen del mismo código que todo lo demás. Pero no dan
   miedo, y el juego entero existe para dar miedo. Un óvalo color crema con dos
   agujeros negros se lee a emoji; lo que asusta de una cara es la piel — el
   poro, la humedad, el diente partido —, y eso no se dibuja con un `arc()`.
   Las seis están generadas (Rezona Lab, WUMdrRxs) y horneadas a WebP con alfa:
   cráneo, pálida gritando, la del pelo, la que sangra, el maniquí rajado y el
   ahogado. Dieciocho kilobytes cada una.
   El dibujo por código queda de RESPALDO y no es ceremonia: si el WebP no
   decodifica, un susto sin imagen es un susto que no existe. */
const CARAS_FOTO = ['cara_craneo', 'cara_palida', 'cara_pelo',
                    'cara_sangre', 'cara_maniqui', 'cara_ahogado'];
const fotoCaras = [];
function caraTex(v){
  const n = CARAS_FOTO[v % CARAS_FOTO.length];
  if (typeof AS === 'undefined' || !AS[n]) return armaCara(v % 4);
  if (!fotoCaras[v]){
    const t = new T.TextureLoader().load(AS[n]);
    /* ClampToEdge y no Repeat: una cara es una imagen sola, y con Repeat el
       más mínimo error de coordenada trae un pedazo del otro borde */
    t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    fotoCaras[v] = t;
  }
  return fotoCaras[v];
}

/* la piel: un degradado radial, no un relleno. Una cara de un solo tono se lee
   a papel recortado; con el centro apenas más claro que el borde aparece el
   volumen del cráneo, que es todo lo que hace falta a esta distancia. */
function piel(g, cx, cy, r, claro, oscuro){
  const d = g.createRadialGradient(cx - r*0.22, cy - r*0.30, r*0.06, cx, cy, r*1.12);
  d.addColorStop(0, claro); d.addColorStop(0.62, claro); d.addColorStop(1, oscuro);
  return d;
}
function cuenca(g, cx, cy, rx, ry, gir){
  /* la cuenca no es un óvalo negro: es un óvalo negro con un halo oscuro
     alrededor. Sin el halo el ojo flota; con el halo hay hueso hundido. */
  const h = g.createRadialGradient(cx, cy, rx*0.5, cx, cy, rx*2.1);
  h.addColorStop(0, 'rgba(0,0,0,.95)'); h.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = h; g.beginPath(); g.ellipse(cx, cy, rx*2.1, ry*1.9, gir, 0, 7); g.fill();
  g.fillStyle = '#000'; g.beginPath(); g.ellipse(cx, cy, rx, ry, gir, 0, 7); g.fill();
}
function dientes(g, cx, y, n, w, h, col){
  g.fillStyle = col;
  for (let i = -n; i <= n; i++) g.fillRect(cx + i*w*1.35 - w/2, y, w, h);
}

function armaCara(v){
  if (texCaras[v]) return texCaras[v];
  texCaras[v] = lienzoTex(256, (g, n) => {
    g.clearRect(0, 0, n, n);
    const cx = n/2, cy = n/2;
    if (v === 0){
      /* el cráneo: pómulos marcados y mandíbula angosta */
      g.fillStyle = piel(g, cx, cy - n*0.03, n*0.33, '#d6ccb6', '#6f6858');
      g.beginPath(); g.ellipse(cx, cy - n*0.06, n*0.255, n*0.30, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(cx - n*0.20, cy + n*0.05);
      g.quadraticCurveTo(cx, cy + n*0.44, cx + n*0.20, cy + n*0.05); g.fill();
      cuenca(g, cx - n*0.105, cy - n*0.055, n*0.062, n*0.080, 0.10);
      cuenca(g, cx + n*0.105, cy - n*0.055, n*0.062, n*0.080, -0.10);
      g.fillStyle = '#000';
      g.beginPath(); g.ellipse(cx, cy + n*0.045, n*0.028, n*0.042, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx, cy + n*0.20, n*0.062, n*0.115, 0, 0, 7); g.fill();
      dientes(g, cx, cy + n*0.115, 2, n*0.020, n*0.034, '#cfc6b4');
    } else if (v === 1){
      /* la cara pálida gritando: sin nariz, la boca se le va hasta el mentón */
      g.fillStyle = piel(g, cx, cy, n*0.34, '#efe7dc', '#8d8377');
      g.beginPath(); g.ellipse(cx, cy - n*0.02, n*0.26, n*0.345, 0, 0, 7); g.fill();
      cuenca(g, cx - n*0.098, cy - n*0.085, n*0.058, n*0.072, 0);
      cuenca(g, cx + n*0.098, cy - n*0.085, n*0.058, n*0.072, 0);
      const b = g.createLinearGradient(0, cy, 0, cy + n*0.34);
      b.addColorStop(0, '#1a0d0d'); b.addColorStop(1, '#000');
      g.fillStyle = b;
      g.beginPath(); g.ellipse(cx, cy + n*0.155, n*0.075, n*0.175, 0, 0, 7); g.fill();
      dientes(g, cx, cy + n*0.008, 2, n*0.023, n*0.038, '#e6ddcd');
      /* las venas: cuatro trazos finos, y son lo que la separa de una máscara */
      g.strokeStyle = 'rgba(70,30,40,.45)'; g.lineWidth = n*0.006;
      for (let i = 0; i < 4; i++){
        g.beginPath(); g.moveTo(cx + (i<2?-1:1)*n*0.14, cy - n*0.20 + i*n*0.03);
        g.quadraticCurveTo(cx + (i<2?-1:1)*n*0.20, cy - n*0.05, cx + (i<2?-1:1)*n*0.11, cy + n*0.10);
        g.stroke();
      }
    } else if (v === 2){
      /* la del pelo: el pelo tapa media cara, y lo que asusta es el ojo que sí
         se ve. Un rostro entero visible da menos miedo que medio rostro. */
      g.fillStyle = piel(g, cx, cy, n*0.32, '#ded2c4', '#7b7164');
      g.beginPath(); g.ellipse(cx, cy, n*0.235, n*0.315, 0, 0, 7); g.fill();
      cuenca(g, cx + n*0.085, cy - n*0.055, n*0.055, n*0.068, 0);
      g.fillStyle = '#000';
      g.beginPath(); g.ellipse(cx + n*0.02, cy + n*0.185, n*0.048, n*0.088, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(12,10,12,.96)'; g.lineCap = 'round';
      for (let i = 0; i < 46; i++){
        const x0 = cx - n*0.24 + (i/46)*n*0.30;
        g.lineWidth = n*(0.008 + (i%3)*0.003);
        g.beginPath(); g.moveTo(x0, cy - n*0.36);
        g.quadraticCurveTo(x0 - n*0.05 + (i%5)*n*0.02, cy, x0 + n*0.02, cy + n*0.30);
        g.stroke();
      }
    } else {
      /* el que sangra: la sangre no es roja brillante, es casi negra. El rojo
         saturado sobre una linterna cálida se lee a pintura. */
      g.fillStyle = piel(g, cx, cy, n*0.33, '#cfc0ad', '#6a5f52');
      g.beginPath(); g.ellipse(cx, cy - n*0.01, n*0.25, n*0.33, 0, 0, 7); g.fill();
      cuenca(g, cx - n*0.100, cy - n*0.070, n*0.060, n*0.070, 0.06);
      cuenca(g, cx + n*0.100, cy - n*0.070, n*0.060, n*0.070, -0.06);
      g.fillStyle = 'rgba(46,8,10,.92)';
      for (const sx of [-1, 1]){
        g.beginPath(); g.moveTo(cx + sx*n*0.10, cy - n*0.03);
        g.lineTo(cx + sx*n*0.075, cy + n*0.26);
        g.lineTo(cx + sx*n*0.125, cy + n*0.24); g.fill();
      }
      g.fillStyle = '#0a0406';
      g.beginPath(); g.ellipse(cx, cy + n*0.17, n*0.085, n*0.105, 0, 0, 7); g.fill();
      dientes(g, cx, cy + n*0.085, 3, n*0.018, n*0.030, '#b8ac97');
    }
    grano(g, n, 0, 20);
  });
  texCaras[v].wrapS = texCaras[v].wrapT = T.ClampToEdgeWrapping;
  return texCaras[v];
}

/* ── LA SILUETA, Y POR QUÉ NECESITA UN BORDE ──
   La primera versión era un plano NEGRO PURO, con la idea de que se viera
   porque tapa. En un pasillo negro no tapa nada: medido en la captura, el susto
   se disparaba, sonaba, sacudía y en pantalla no había absolutamente nada —
   indistinguible de un susto que no se dibuja.
   La silueta lleva ahora un CONTORNO apenas más claro que el aire, como si algo
   detrás la recortara. Sobre pared iluminada sigue leyéndose por lo que tapa;
   sobre negro se lee por el borde. Las dos cosas a la vez, y ninguna la
   ilumina, que es lo que arruinaría una sombra. */
function armaSombra(v){
  if (texSombras[v]) return texSombras[v];
  /* el lienzo va 128 × 304, la misma proporción que el plano de 0,78 × 1,85 */
  texSombras[v] = lienzoTexWH(128, 304, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    /* el cuerpo se arma con un CONTORNO cerrado y no con círculos sueltos: una
       persona a contraluz es una silueta continua, y tres óvalos apilados se
       leen a tres óvalos apilados por más juntos que estén. */
    const S = (esc) => {
      g.beginPath();
      if (v === 0){          /* de pie, de frente, los brazos pegados */
        const b = [[0.50,0.045],[0.585,0.075],[0.60,0.135],[0.72,0.185],[0.76,0.36],
                   [0.735,0.56],[0.665,0.56],[0.655,0.35],[0.615,0.50],[0.60,0.70],
                   [0.575,0.985],[0.505,0.985],[0.50,0.72],[0.495,0.985],[0.425,0.985],
                   [0.40,0.70],[0.385,0.50],[0.345,0.35],[0.335,0.56],[0.265,0.56],
                   [0.24,0.36],[0.28,0.185],[0.40,0.135],[0.415,0.075]];
        cami(g, b, w, h, esc);
      } else if (v === 1){   /* larga y flaca, los brazos hasta las rodillas */
        const b = [[0.50,0.030],[0.565,0.058],[0.575,0.115],[0.68,0.155],[0.71,0.44],
                   [0.745,0.66],[0.685,0.675],[0.645,0.45],[0.605,0.46],[0.585,0.72],
                   [0.560,0.99],[0.508,0.99],[0.50,0.70],[0.492,0.99],[0.440,0.99],
                   [0.415,0.72],[0.395,0.46],[0.355,0.45],[0.315,0.675],[0.255,0.66],
                   [0.29,0.44],[0.32,0.155],[0.425,0.115],[0.435,0.058]];
        cami(g, b, w, h, esc);
      } else {               /* agachada, la cabeza entre las rodillas */
        const b = [[0.50,0.38],[0.63,0.40],[0.75,0.50],[0.80,0.68],[0.76,0.86],
                   [0.66,0.99],[0.34,0.99],[0.24,0.86],[0.20,0.68],[0.25,0.50],
                   [0.37,0.40]];
        cami(g, b, w, h, esc);
      }
    };
    /* el halo primero, el cuerpo encima */
    g.fillStyle = 'rgba(126,136,152,.40)'; S(1.055); g.fill();
    g.fillStyle = 'rgba(3,3,5,.985)';      S(1.000); g.fill();
  });
  texSombras[v].wrapS = texSombras[v].wrapT = T.ClampToEdgeWrapping;
  return texSombras[v];
}
/* cierra un contorno con curvas: con líneas rectas la silueta se ve poligonal y
   una persona no tiene aristas */
function cami(g, b, w, h, esc){
  const cx = 0.5;
  const P = b.map(p => [ (cx + (p[0]-cx)*esc)*w, (p[1]-0.5)*esc*h + h*0.5 ]);
  g.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i <= P.length; i++){
    const a = P[i % P.length], n = P[(i+1) % P.length];
    g.quadraticCurveTo(a[0], a[1], (a[0]+n[0])/2, (a[1]+n[1])/2);
  }
  g.closePath();
}

/* la araña no es de metal: `matMetal` la dejaba blanca y brillante bajo la
   linterna —medido en la captura, un bicho plateado sobre la tabla—, y un bicho
   que brilla se lee a juguete. Quitina: casi negra y apenas satinada. */
const matBicho = new T.MeshStandardMaterial({ color: 0x14100e, roughness: 0.52, metalness: 0.10 });

function armaObjeto(s){
  const g = new T.Group();
  /* ── Y ESTE ES EL ARREGLO QUE MÁS COSTÓ ENCONTRAR: `depthTest: false` ──
     Los sustos van en el marco de la cámara, a un metro y pico. El pasillo
     DOBLA, así que cada vez que hay una vuelta la pared de enfrente queda a
     ochenta centímetros — o sea DELANTE del susto. Medido en la captura: a los
     27 metros la cara estaba en pantalla (0,50 · 0,53), visible, escalada y con
     textura… y enterrada dentro de la pared. Un susto tapado por una pared no
     falla, no avisa, y se ve igual que uno que no se disparó, que es
     exactamente el mismo síntoma de la vez anterior con otra causa.
     Un screamer se dibuja ENCIMA de todo por definición: no es un objeto del
     mundo, es algo que te pasa en la cara. `renderOrder` lo pone después de las
     paredes y `depthTest:false` hace que la profundidad no lo entierre. */
  const cru = (m) => { m.material.depthTest = false; m.material.depthWrite = false;
                       m.renderOrder = 30; return m; };
  /* el reparto es `id * 7` y no `id`: con `id` las siete caras del catálogo
     salen en orden 0,1,2,3,4,5 y la sexta repite la primera justo cuando el
     jugador todavía se acuerda de ella. Multiplicando por un número primo, dos
     sustos consecutivos del catálogo nunca comparten imagen. */
  const v = (s.id * 7) % 6;
  if (s.fam === 'cara'){
    /* el plano va CUADRADO: la foto se horneó centrada en un cuadro cuadrado
       conservando su proporción, así que un plano de 0,52 × 0,68 la estiraría
       un 31 % a lo alto y una cara estirada deja de leerse a cara */
    g.add(cru(new T.Mesh(new T.PlaneGeometry(0.72, 0.72),
      new T.MeshBasicMaterial({ map: caraTex(v), transparent: true }))));
  } else if (s.fam === 'sombra'){
    const m = cru(new T.Mesh(new T.PlaneGeometry(0.78, 1.85),
      new T.MeshBasicMaterial({ map: armaSombra(s.id % 3), transparent: true,
                                opacity: 0.97 })));
    /* ── LA SILUETA SE PARA MÁS LEJOS QUE LA CARA, Y NO ES UN GUSTO ──
       Mide 1,85 m de alto porque es una persona. Puesta al metro y pico donde va
       una cara, tapa la pantalla ENTERA — el bol incluido —, y tapar el bol
       durante un segundo no es un susto, es quitarle al jugador lo único con lo
       que puede corregir. Setenta y cinco centímetros más atrás entra completa
       con pasillo a los costados: se lee que hay ALGUIEN parado ahí, que es lo
       que tiene que leerse. */
    m.position.z = -0.75;
    g.add(m);
  } else if (s.fam === 'bicho'){
    /* la araña: cuerpo en dos partes y patas QUEBRADAS. Una pata recta se lee a
       palito clavado; el codo es lo que la hace caminar aunque esté quieta. */
    const cab = new T.Mesh(new T.SphereGeometry(0.019, 8, 6), matBicho);
    cab.position.z = -0.030; cab.scale.set(1, 0.85, 1.1); g.add(cab);
    const abd = new T.Mesh(new T.SphereGeometry(0.032, 9, 7), matBicho);
    abd.position.z = 0.022; abd.scale.set(1, 0.82, 1.25); g.add(abd);
    for (let i = 0; i < 8; i++){
      const lado = i < 4 ? -1 : 1, k = (i % 4);
      const a = 0.55 + k*0.42;
      const muslo = new T.Mesh(new T.BoxGeometry(0.0055, 0.0055, 0.048), matBicho);
      muslo.position.set(lado*0.022, 0.010, -0.014 + k*0.016);
      muslo.rotation.set(-0.85, lado*a, 0); g.add(muslo);
      const pata = new T.Mesh(new T.BoxGeometry(0.0045, 0.0045, 0.054), matBicho);
      pata.position.set(lado*(0.041 + k*0.002), -0.008, -0.016 + k*0.018);
      pata.rotation.set(0.95, lado*a, 0); g.add(pata);
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  }
  return g;
}

/* ── DÓNDE SE PONE CADA SUSTO, Y LAS POSICIONES SALEN DEL ENCUADRE ──
   En el marco de la CÁMARA, así el susto está siempre donde el jugador mira y
   no depende de hacia dónde dobló el pasillo.

   ESTAS POSICIONES SE REESCRIBIERON DOS VECES Y LAS DOS POR LO MISMO: estaban
   puestas a ojo para un encuadre que después cambió.
     · Primera vez: escritas pensando en una pantalla ancha y el juego era
       VERTICAL. Con 66° verticales y 412×892 el campo horizontal da 33°, o sea
       ±0,30 m de ancho por metro: el susto de esquina caía en x = 1,155 de
       pantalla, FUERA DEL CUADRO. Y no fallaba nada — sonaba, sacudía y no se
       veía, que es indistinguible de un susto que no se disparó.
     · Segunda vez: el juego pasó a ser HORIZONTAL, y con eso el ancho se
       triplica y el alto se achica. Las posiciones vertiacles quedaban todas
       apiladas en la franja del medio.

   Así que ahora salen de la cuenta y no del ojo. Con 52° verticales, y tomando
   el aspecto más angosto que puede tocar —16:9, porque un teléfono más ancho
   sólo agrega margen—:
       ancho máximo a distancia d = 0,867 · d
       alto  máximo a distancia d = 0,488 · d
   y cada susto se queda por debajo del 80 % de ese máximo: pegado al borde, que
   es donde más asusta, pero adentro en cualquier teléfono. `sustosEnCuadro()`
   lo comprueba solo y es lo único que impide que esto vuelva a pasar. */
const DONDE = {
  frente:   [0, -0.02, -1.30], costadoI: [-0.62, -0.02, -1.05], costadoD: [0.62, -0.02, -1.05],
  abajo:    [0, -0.38, -1.05], techo:    [0, 0.40, -1.05],       esquina:  [0.70, -0.02, -1.20],
  atras:    [0, -0.02, 0.85],  cruza:    [-0.80, -0.22, -1.55],  puerta:   [0.72, -0.12, -1.35],
  pared:    [-0.72, -0.08, -1.30], caida: [0.55, -0.44, -1.25],  vidrio:   [-0.58, 0.30, -1.15],
  piso:     [0.28, -0.40, -1.05], tabla: [0.10, -0.22, -0.62],   enjambre: [0, -0.20, -1.45],
  bulto:    [-0.34, -0.14, -1.60], rincon: [0.86, -0.10, -1.50], asoma:    [-0.90, -0.06, -1.45],
  encima:   [0, 0.34, -1.20],  cuelga:   [0.30, 0.30, -1.35],
  oidoI:    [-0.5, 0, 0.2],     oidoD:   [0.5, 0, 0.2],          nombre:   [0, 0, -0.6],
  risa:     [0, 0, -0.9],       respira: [0, -0.1, 0.3],
  apagon:   [0, 0, -1], parpadeo: [0, 0, -1], fogonazo: [0, 0, -1], rojo: [0, 0, -1]
};

function disparaSusto(s){
  if (ACT.s) return;
  ACT.s = s; ACT.t = 0; ACT.fijo = false;
  const p = DONDE[s.donde] || DONDE.frente;
  if (s.fam === 'cara' || s.fam === 'sombra' || s.fam === 'bicho'){
    const o = armaObjeto(s);
    o.position.set(p[0], p[1], p[2]);
    /* ── NADA DE `lookAt` EN UN HIJO DE LA CÁMARA ──
       `Object3D.lookAt` mira en coordenadas de MUNDO, así que `lookAt(0,y,0)`
       apunta al origen del pasillo y no a la cámara: medido, con la cámara a
       veintitrés metros del origen las caras salían de canto o de espaldas y NO
       SE VEÍA NINGUNA. Un plano hijo de la cámara ya mira al lente con su normal
       +Z; lo único que hace falta es girarlo hacia el origen LOCAL. */
    o.rotation.y = Math.atan2(-p[0], -p[2]);
    cam.add(o); ACT.obj = o;
  }
  /* ── CADA SUSTO LLEVA SU PROPIO GRITO, Y ES POR NÚMERO ──
     `s.id` elige la variante, así que el susto 17 suena SIEMPRE igual y nunca
     igual al 18. Con un grito al azar, dos sustos seguidos pueden salir con la
     misma voz y ahí se rompe la ilusión de que hay más de una cosa. */
  son(s.son, s.fuerza, s.id);
  /* ── LA SACUDIDA: UN IMPULSO CON DIRECCIÓN, NO UN TEMBLOR AL AZAR ──
     Va hacia donde apareció el susto, porque un respingo real es alejarse de la
     cosa. Y es un IMPULSO —entra una vez— y no una fuerza sostenida: si durara,
     el jugador no podría corregir y el susto sería una muerte y no un susto. */
  const dx = p[0], dz = p[2] + 0.6;
  const n = Math.hypot(dx, dz) || 1;
  /* ── Y LA FUERZA SALE DE CUÁNTO TIENE QUE CORRER EL BOL, NO DE LA INTUICIÓN ──
     Primer intento: 5,6. Medido, UN SOLO susto de fuerza 1 mandaba el bol de
     0,00 a 1,002 del borde — o sea que el primer susto del pasillo era la
     muerte, que es justo lo que este juego no puede ser. La cuenta: el impulso
     entra durante 0,10 s, así que Δv = F·0,10; y con el roce en 1,9 el bol
     recorre Δv/1,9 antes de frenarse. Para que un susto de fuerza 1 gaste un
     tercio de la tabla (0,10 m de 0,30):
         Δv = 0,10 · 1,9 = 0,19        F = 0,19 / 0,10 = 1,9
     Con eso hacen falta TRES sustos sin corregir para volcarlo, y uno solo se
     puede salvar. Un susto tiene que costar, no matar. */
  const F = s.fuerza * 1.9;
  ACT.sac.x = (dx/n) * F; ACT.sac.z = (dz/n) * F;
  /* la luz */
  if (s.luz === 'apaga') LUZ.apagar(s.dur * 0.8);
  else if (s.luz === 'parpadea') LUZ.parpadear(s.dur);
  else if (s.luz === 'fogonazo') fogonazo(0.9);
  else if (s.luz === 'rojo') LUZ.rojo(s.dur);
  if (s.fam === 'golpe') fogonazo(0.16 * s.fuerza);
}

function pasoSusto(dt){
  if (!ACT.s) return null;
  /* ── CONGELAR UN SUSTO NO ES UNA COMODIDAD, ES LA ÚNICA FORMA DE MIRARLO ──
     Una cara dura 0,42 s. Entre que la prueba la dispara y el navegador entrega
     la captura pasan varios cientos de milisegundos, así que la foto llegaba
     SIEMPRE después de que el susto terminara: se veía el pasillo vacío y eso
     es indistinguible de un susto que no se dibuja. Con `fijo` el susto se
     queda en su tamaño final hasta que se lo saque a mano. */
  if (ACT.fijo){
    if (ACT.obj){ ACT.obj.scale.setScalar(1.15); ACT.obj.visible = true; }
    return { x: 0, z: 0 };
  }
  ACT.t += dt;
  const s = ACT.s, u = ACT.t / s.dur;
  if (ACT.obj){
    /* se acerca de golpe y se va: la aceleración de entrada es lo que asusta,
       no el objeto */
    const k = u < 0.18 ? (u/0.18) : 1;
    ACT.obj.scale.setScalar(0.4 + k*0.75);
    ACT.obj.visible = u < 0.92;
  }
  const sac = { x: 0, z: 0 };
  if (ACT.t < 0.10){ sac.x = ACT.sac.x; sac.z = ACT.sac.z; }
  if (u >= 1){
    if (ACT.obj){ cam.remove(ACT.obj); ACT.obj = null; }
    ACT.s = null;
    if (!BOL.cayo && BOL.agua > 0.02) SUSTOS_AGUANTADOS++;
  }
  return sac;
}

/* ── LA LINTERNA, QUE TAMBIÉN ES UN PERSONAJE ── */
const LUZ = {
  base: 26, t: 0, modo: 'ok', hasta: 0,
  apagar(d){ this.modo = 'apagada'; this.hasta = this.t + d; },
  parpadear(d){ this.modo = 'parpadea'; this.hasta = this.t + d; },
  rojo(d){ this.modo = 'rojo'; this.hasta = this.t + d; },
  paso(dt){
    this.t += dt;
    if (this.modo !== 'ok' && this.t > this.hasta) this.modo = 'ok';
    if (this.modo === 'apagada'){ luz.intensity = 0.6; luz.color.setHex(0xffe9cf); }
    else if (this.modo === 'parpadea'){
      luz.intensity = (Math.sin(this.t*47) > 0.1 ? this.base : 1.2);
      luz.color.setHex(0xffe9cf);
    } else if (this.modo === 'rojo'){
      luz.intensity = this.base*0.6; luz.color.setHex(0xff5540);
    } else {
      /* aun «bien» la linterna respira: una luz perfectamente fija se lee a
         lámpara de estudio y no a linterna en la mano de alguien asustado */
      luz.intensity = this.base * (0.94 + Math.sin(this.t*2.3)*0.03 + Math.sin(this.t*7.1)*0.02);
      luz.color.setHex(0xffe9cf);
    }
  }
};
let _flashT = 0;
function fogonazo(v){ _flashT = Math.max(_flashT, v); }
function pasoFogonazo(dt){
  if (_flashT <= 0) return;
  _flashT = Math.max(0, _flashT - dt*4.5);
  $('flash').style.opacity = _flashT.toFixed(3);
}
