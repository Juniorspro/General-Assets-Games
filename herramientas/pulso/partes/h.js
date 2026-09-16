
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
const matBulto = new T.MeshStandardMaterial({ color: 0x2b2723, roughness: 0.88, metalness: 0.0 });
/* los ojos van con `fog:false` y sin luz: son lo único visible con la linterna
   apagada, y con niebla se iban a negro justo en el susto que más los necesita.
   `depthTest:false` para que no queden enterrados en la pared de una esquina,
   que es el mismo defecto que ya costó una vuelta con las caras. */
const matOjo = new T.MeshBasicMaterial({ color: 0xe8d9a8, fog: false, depthTest: false });

/* ══════════ LOS SUSTOS QUE SON UN MODELO 3D ══════════
   Un plano con una foto funciona para una cara a cuarenta centímetros: la
   linterna casi no se mueve en 0,4 s y no hay con qué comparar. Pero un bulto
   que aparece a metro y medio en un pasillo con una luz que tiembla SE DELATA —
   no recibe la luz por un lado, no tiene canto, y al moverse la cabeza no
   cambia de forma. Para eso hacen falta modelos.

   Se cargan en DIFERIDO y con respaldo: un GLB que no decodifica no puede
   dejar un susto sin nada en pantalla, porque un susto invisible es idéntico a
   un susto que no se disparó — el mismo síntoma que ya costó dos vueltas acá.
   Mientras el modelo no está, el bulto se dibuja por código. */
/* 1,15 y no 1,7: con 1,7 las figuras quedaban a más de tres metros, al final
   del alcance de la linterna y en el borde del cuadro. A 2,2-2,7 m entran
   completas (a 2,5 m entran ±1,22 m de alto contra 1,85 de figura) y siguen
   lejos de la tabla. */
const Z_MODELO = 1.15;
/* la capa en la que viven los sustos que son modelo: se dibuja en una segunda
   pasada con la profundidad borrada. La declara acá el que la usa. */
const CAPA_SUSTO = 3;
const MODELOS = {};                /* clave → Object3D listo para clonar */
const _cargador = { l: null, pedidos: {} };
function pideModelo(clave){
  if (MODELOS[clave] !== undefined) return MODELOS[clave];
  if (typeof AS === 'undefined' || !AS['mod_' + clave]) { MODELOS[clave] = null; return null; }
  if (_cargador.pedidos[clave]) return null;
  _cargador.pedidos[clave] = true;
  if (!_cargador.l) _cargador.l = new GLTFLoader();
  _cargador.l.load(AS['mod_' + clave], (g) => {
    const o = g.scene;
    /* ── SE NORMALIZA LA ALTURA, Y NO ES COSMÉTICO ──
       Los generadores devuelven la malla metida en una caja de lado 2, sin
       relación con metros. Puesta cruda, la misma cosa mide dos metros o veinte
       centímetros según qué tanda salió, y un susto que aparece del tamaño de
       una moneda no es un susto. Se mide la caja y se escala al alto que toca. */
    const caja = new T.Box3().setFromObject(o);
    const alto = Math.max(0.01, caja.max.y - caja.min.y);
    o.scale.setScalar(1 / alto);          /* queda de 1 m; cada susto lo reescala */
    o.position.y = -caja.min.y / alto;    /* apoyado en su propio cero */
    o.traverse(m => {
      if (!m.isMesh) return;
      m.castShadow = false; m.receiveShadow = false;
      /* niebla apagada: el bulto está a metro y medio y la niebla cierra a doce,
         así que no le quita casi nada — pero con la linterna APAGADA, que es
         cuando aparece la mitad de estos sustos, el modelo se iba a negro
         absoluto y desaparecía. */
      if (m.material){ m.material.fog = false; }
    });
    MODELOS[clave] = o;
  }, undefined, () => { MODELOS[clave] = null; });
  return null;
}

/* ══════════ LAS TRES FIGURAS, CONSTRUIDAS POR CÓDIGO ══════════
   Empezaron como un respaldo para cuando un GLB no decodifica, y quedaron como
   lo que se ve. La razón es medible: el primer intento era un óvalo con brazos
   y en la captura salía como una MANCHA BEIGE LISA — un modelo generado de mil
   triángulos no se distingue de eso a metro y medio con una linterna encima,
   porque lo que hace que una figura asuste no es la cantidad de triángulos: es
   la SILUETA y es la CARA.

   Así que hay tres siluetas que se leen distinto de un vistazo —una altísima y
   flaca, una encorvada con la espalda enorme, y una en cuatro patas— y todas
   llevan en la cabeza una de las seis caras fotorrealistas que YA están
   horneadas. Eso da lo que ninguna de las dos mitades daba sola: un cuerpo con
   volumen de verdad, que recibe la luz de la linterna por un lado y se oscurece
   del otro, con una cara que es una foto.

   Y el GLB sigue teniendo prioridad: si `AS.mod_<clave>` existe, se usa. Esto
   es lo que hay mientras no exista, y no es un placeholder — es jugable. */
const matPiel = new T.MeshStandardMaterial({ color: 0x554a41, roughness: 0.90, metalness: 0.0 });
const matTrapo = new T.MeshStandardMaterial({ color: 0x1e1c1a, roughness: 0.96, metalness: 0.0 });

/* la cara va en un plano pegado a la cabeza. No se «mira a la cámara» con
   `lookAt` —eso ya costó una vuelta acá: `lookAt` trabaja en coordenadas de
   MUNDO y estos objetos son hijos de la cámara— sino que se deja mirando a +Z
   local, que ES el lente por construcción. */
function caraEnCabeza(v, tam){
  const m = new T.Mesh(new T.PlaneGeometry(tam, tam),
    new T.MeshBasicMaterial({ map: caraTex(v), transparent: true, depthWrite: false, fog: false }));
  m.renderOrder = 2;
  return m;
}

function hueso(r, largo, mat){ return new T.Mesh(new T.CapsuleGeometry(r, largo, 4, 7), mat); }

/* ── ALTÍSIMA Y FLACA ──
   Mide 1 m como todas (el susto la reescala), y su silueta es «demasiado alta
   para este pasillo»: brazos que le llegan a las rodillas y hombros angostos.
   Lo que la hace leer es la PROPORCIÓN, no el detalle. */
function figuraColgado(){
  const raiz = new T.Group(), g = new T.Group();
  g.scale.setScalar(1/1.85); raiz.add(g);
  const torso = hueso(0.105, 0.62, matTrapo);
  torso.position.y = 1.16; torso.scale.set(1, 1, 0.72); g.add(torso);
  const cuello = hueso(0.032, 0.09, matPiel); cuello.position.y = 1.56; g.add(cuello);
  const cab = new T.Mesh(new T.SphereGeometry(0.088, 12, 10), matPiel);
  cab.position.set(0, 1.68, 0); cab.scale.set(0.92, 1.12, 0.95); g.add(cab);
  const c = caraEnCabeza(0, 0.20); c.position.set(0, 1.68, 0.082); g.add(c);
  for (const lado of [-1, 1]){
    const br = hueso(0.034, 0.44, matPiel);
    br.position.set(lado*0.135, 1.20, 0.02); br.rotation.z = lado*0.10; g.add(br);
    const ant = hueso(0.028, 0.42, matPiel);
    ant.position.set(lado*0.175, 0.76, 0.05); br.rotation.z = lado*0.06; g.add(ant);
    const pi = hueso(0.048, 0.52, matTrapo); pi.position.set(lado*0.072, 0.56, 0); g.add(pi);
    const pa = hueso(0.040, 0.46, matTrapo); pa.position.set(lado*0.072, 0.13, 0.01); g.add(pa);
  }
  return raiz;
}

/* ── ENCORVADA ──
   La espalda es lo más grande de la figura y la cabeza cuelga por delante, más
   abajo que los hombros. Es la silueta de algo que no camina como una persona. */
function figuraEncorvado(){
  const raiz = new T.Group(), g = new T.Group();
  g.scale.setScalar(1/1.42); raiz.add(g);
  const lomo = new T.Mesh(new T.SphereGeometry(0.30, 12, 10), matTrapo);
  lomo.position.set(0, 1.05, -0.06); lomo.scale.set(0.92, 0.80, 1.05); g.add(lomo);
  const pecho = new T.Mesh(new T.SphereGeometry(0.19, 10, 8), matTrapo);
  pecho.position.set(0, 0.86, 0.10); g.add(pecho);
  /* la cabeza ADELANTE del lomo y no adentro: a z = 0,30 quedaba metida dentro
     de la esfera del lomo —que llega a 0,25 con su escala— y en la captura se
     veía la espalda y nada más. Una figura encorvada sin cara es una piedra. */
  const cab = new T.Mesh(new T.SphereGeometry(0.098, 12, 10), matPiel);
  cab.position.set(0, 0.97, 0.44); cab.scale.set(0.95, 1.05, 1); g.add(cab);
  const c = caraEnCabeza(3, 0.23); c.position.set(0, 0.96, 0.535); g.add(c);
  for (const lado of [-1, 1]){
    const br = hueso(0.045, 0.40, matPiel);
    br.position.set(lado*0.24, 0.80, 0.06); br.rotation.z = lado*0.42; g.add(br);
    const ant = hueso(0.036, 0.38, matPiel);
    ant.position.set(lado*0.36, 0.46, 0.14); ant.rotation.x = 0.35; g.add(ant);
    const pi = hueso(0.062, 0.34, matTrapo);
    pi.position.set(lado*0.11, 0.50, -0.02); g.add(pi);
    const pa = hueso(0.050, 0.36, matTrapo);
    pa.position.set(lado*0.11, 0.16, 0.02); g.add(pa);
  }
  return raiz;
}

/* ── EN CUATRO PATAS ──
   La única que no es bípeda, y por eso es la que más cambia el susto: aparece
   ABAJO, donde el jugador no está mirando porque está mirando el bol. */
function figuraPerro(){
  const raiz = new T.Group(), g = new T.Group();
  g.scale.setScalar(1/0.82); raiz.add(g);
  const cuerpo = new T.Mesh(new T.SphereGeometry(0.22, 12, 9), matPiel);
  cuerpo.position.set(0, 0.50, 0); cuerpo.scale.set(0.80, 0.72, 1.45); g.add(cuerpo);
  const cuello = hueso(0.052, 0.16, matPiel);
  cuello.position.set(0, 0.56, 0.30); cuello.rotation.x = 1.15; g.add(cuello);
  const cab = new T.Mesh(new T.SphereGeometry(0.085, 10, 9), matPiel);
  cab.position.set(0, 0.60, 0.42); cab.scale.set(0.86, 0.92, 1.30); g.add(cab);
  const c = caraEnCabeza(5, 0.19); c.position.set(0, 0.60, 0.545); g.add(c);
  for (const lado of [-1, 1]) for (const z of [0.20, -0.20]){
    const p1 = hueso(0.030, 0.22, matPiel);
    p1.position.set(lado*0.14, 0.36, z); g.add(p1);
    const p2 = hueso(0.024, 0.24, matPiel);
    p2.position.set(lado*0.155, 0.12, z + 0.03); g.add(p2);
  }
  const cola = hueso(0.018, 0.34, matPiel);
  cola.position.set(0, 0.56, -0.34); cola.rotation.x = 0.75; g.add(cola);
  return raiz;
}

const FIGURAS = { colgado: figuraColgado, encorvado: figuraEncorvado, perro: figuraPerro };
function bultoCodigo(clave){
  return (FIGURAS[clave] || figuraEncorvado)();
}

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
  } else if (s.fam === 'modelo'){
    const mod = pideModelo(s.modelo);
    const o = mod ? mod.clone(true) : bultoCodigo(s.modelo);
    o.scale.multiplyScalar(s.alto || 1.8);
    /* ── UN MODELO SE PARA MÁS LEJOS QUE UNA CARA, Y LA CUENTA ES LA DEL MARCO ──
       Los sitios del catálogo están a 1,05-1,55 m porque están pensados para
       una cara de 70 cm. Una PERSONA de 1,85 m puesta ahí ocupa el cuadro
       entero: a 1,30 m entran ±0,63 m de alto y la figura mide casi tres veces
       eso. Medido en la captura, el bulto salía como una pared beige y no se
       veía ni el pasillo ni de qué tamaño era la cosa.
       Se empuja 1,7 m más atrás: a 3 m entran ±1,46 m de alto, así que una
       persona entra completa con pasillo alrededor — y ahí sí se lee que hay
       ALGUIEN PARADO, que es lo que tiene que leerse. */
    o.position.z = -Z_MODELO;
    /* ── UNA FIGURA SE PARA EN EL PISO, SIEMPRE ──
       El sitio del catálogo trae una altura pensada para una cara, y aplicarla
       a un modelo lo hunde o lo hace flotar: medido, `modelo:piso` traía
       y = −0,40 y el modelo ya se apoya 1,58 abajo, así que la cosa quedaba
       cuarenta centímetros DEBAJO del piso y no se veía nada. De un sitio, un
       modelo usa el costado y la distancia; la altura la decide el suelo. */
    g.position.y = 0;
    o.traverse(m => m.layers.set(CAPA_SUSTO));
    /* el cero del modelo va al piso del pasillo, que respecto del ojo está 1,58
       m abajo. Sin esto la cosa aparece flotando a la altura de la cara, y algo
       que flota se lee a truco y no a alguien parado ahí. */
    o.position.y = -1.58;
    g.add(o);
    /* ── LOS DOS OJOS SUELTOS SE FUERON, Y NO ES UN AHORRO ──
       Estaban puestos cuando la figura era una mancha sin rasgos: eran lo único
       que decía «esto está vivo». Con una cara fotorrealista en la cabeza son
       dos puntos amarillos flotando POR DELANTE de esa cara —van con
       `depthTest:false`, así que ni siquiera quedan detrás— y lo que hacían era
       arruinar lo único que asustaba. Si el GLB que venga no tiene ojos, se
       ponen en el GLB y no acá. */
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
  if (['cara','sombra','bicho','modelo'].indexOf(s.fam) >= 0){
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
