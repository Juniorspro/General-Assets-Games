
/* ══════════════════════════ LAS TEXTURAS ══════════════════════════
   Todas dibujadas por código en lienzos chicos y con filtro NEAREST. Y eso NO
   es una limitación asumida: este juego se dibuja a un tercio de resolución y
   se estira sin suavizar, así que una foto de 1024 píxeles sería lo único
   nítido de la pantalla y se leería como pegada encima. Un lienzo de 64 con
   filtro duro tiene píxeles del mismo tamaño que el resto del cuadro.

   Y VAN OSCURAS. Es de noche: una textura pensada para el día, iluminada por un
   farol naranja, sale marrón. El color base de cada superficie está elegido con
   la luz que le va a tocar, no en abstracto. */
function lienzoTex(n, f, repx, repy){
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  f(g, n);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.magFilter = T.NearestFilter;
  t.minFilter = T.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.repeat.set(repx || 1, repy || repx || 1);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
function pinta(g, x, y, w, h, col){ g.fillStyle = col; g.fillRect(x, y, w, h); }
/* un gris con ruido: la base de casi todo lo que hay acá */
function granulado(g, n, base, amp){
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++){
    const v = base + (Math.random() - 0.5) * amp;
    g.fillStyle = 'rgb(' + (v|0) + ',' + (v|0) + ',' + ((v * 1.04)|0) + ')';
    g.fillRect(x, y, 1, 1);
  }
}

/* EL ASFALTO. Tres cosas: el granulado del árido, unas manchas más claras donde
   el paso de los autos lo puliό, y GRIETAS. Las grietas son lo que hace que una
   calle no se lea como una alfombra gris — y van finas y con quiebres, porque
   una grieta recta se lee a línea pintada. */
const texAsfalto = lienzoTex(64, (g, n) => {
  granulado(g, n, 38, 26);
  for (let k = 0; k < 26; k++){
    const x = Math.random()*n, y = Math.random()*n, r = rnd(2, 6);
    g.fillStyle = 'rgba(120,124,132,' + rnd(0.04, 0.11).toFixed(3) + ')';
    g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
  }
  g.strokeStyle = 'rgba(12,13,16,0.85)'; g.lineWidth = 1;
  for (let k = 0; k < 3; k++){
    let x = Math.random()*n, y = Math.random()*n;
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 7; s++){ x += rnd(-9, 9); y += rnd(-9, 9); g.lineTo(x, y); }
    g.stroke();
  }
}, 1, 1);

/* LA VEREDA: losas de concreto con junta. La junta va DIBUJADA y no insinuada
   con ruido, porque es lo único que le da escala — sin ella una vereda es una
   franja gris y no se sabe si mide un metro o diez. */
const texVereda = lienzoTex(64, (g, n) => {
  granulado(g, n, 96, 16);
  g.fillStyle = 'rgba(30,32,38,0.75)';
  g.fillRect(0, 0, n, 2); g.fillRect(0, 0, 2, n);
  g.fillStyle = 'rgba(210,214,222,0.10)';
  g.fillRect(0, 2, n, 1); g.fillRect(2, 0, 1, n);
  for (let k = 0; k < 40; k++){
    g.fillStyle = 'rgba(60,64,72,' + rnd(0.05, 0.14).toFixed(3) + ')';
    g.fillRect(Math.random()*n|0, Math.random()*n|0, rnd(1,3)|0, rnd(1,3)|0);
  }
});

/* EL PASTO. De noche es casi negro con un verde muy apagado; lo que se ve son
   las briznas más claras contra el fondo oscuro, así que lo que hay que dibujar
   son ESAS y no el verde de fondo. */
const texPasto = lienzoTex(64, (g, n) => {
  pinta(g, 0, 0, n, n, '#141d13');
  for (let k = 0; k < 900; k++){
    const x = Math.random()*n, y = Math.random()*n, h = rnd(1.5, 4);
    g.strokeStyle = 'rgba(' + (34 + Math.random()*40 | 0) + ',' +
                    (56 + Math.random()*54 | 0) + ',' + (30 + Math.random()*26 | 0) + ',0.85)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-1, 1), y - h); g.stroke();
  }
});

/* LADRILLO. Las hiladas van TRABADAS —cada fila corrida media pieza— que es lo
   que distingue una pared de una cuadrícula. */
const texLadrillo = lienzoTex(64, (g, n) => {
  pinta(g, 0, 0, n, n, '#221a18');
  const h = 8, w = 16;
  for (let fy = 0; fy < n / h; fy++){
    const off = (fy % 2) * (w / 2);
    for (let fx = -1; fx < n / w + 1; fx++){
      const x = fx * w + off + 1, y = fy * h + 1;
      const v = rnd(0.72, 1.12);
      g.fillStyle = 'rgb(' + (78*v|0) + ',' + (46*v|0) + ',' + (40*v|0) + ')';
      g.fillRect(x, y, w - 2, h - 2);
    }
  }
});

/* EL REVESTIMIENTO DE TABLAS, que es de lo que están hechas casi todas las
   casas de un barrio así. Se tiñe por casa con el color del material, así que
   el lienzo va en gris: lo que aporta es la SOMBRA DEL SOLAPE entre tablas. */
const texTabla = lienzoTex(64, (g, n) => {
  granulado(g, n, 150, 10);
  for (let y = 0; y < n; y += 8){
    g.fillStyle = 'rgba(0,0,0,0.30)'; g.fillRect(0, y, n, 1);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, y + 1, n, 1);
  }
});

/* LA TEJA. Escamas superpuestas, con la fila corrida media pieza igual que el
   ladrillo y con la sombra debajo de cada una. */
const texTeja = lienzoTex(64, (g, n) => {
  pinta(g, 0, 0, n, n, '#1b1d22');
  const h = 8, w = 12;
  for (let fy = 0; fy < n / h + 1; fy++){
    const off = (fy % 2) * (w / 2);
    for (let fx = -1; fx < n / w + 1; fx++){
      const x = fx * w + off, y = fy * h;
      const v = rnd(0.78, 1.16);
      g.fillStyle = 'rgb(' + (52*v|0) + ',' + (55*v|0) + ',' + (62*v|0) + ')';
      g.fillRect(x + 1, y + 1, w - 2, h - 3);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(x + 1, y + h - 2, w - 2, 1);
    }
  }
});

/* LA MADERA DE LA CERCA: tablas verticales con la veta a lo largo */
const texMadera = lienzoTex(32, (g, n) => {
  granulado(g, n, 104, 14);
  for (let k = 0; k < 60; k++){
    g.fillStyle = 'rgba(48,38,28,' + rnd(0.10, 0.28).toFixed(3) + ')';
    g.fillRect(Math.random()*n|0, 0, 1, n);
  }
  for (let x = 0; x < n; x += 8){
    g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(x, 0, 1, n);
  }
});

/* LA REJA DE ALAMBRE, y va CON CANAL ALFA. Es la única textura del juego que
   no es opaca, y por eso es la única que da problemas: un material transparente
   no escribe profundidad, así que dos rejas cruzadas se dibujan en el orden
   equivocado. Va con `alphaTest`, que descarta el píxel antes de la mezcla y
   entonces SÍ escribe profundidad — más barato y sin orden que mantener. */
const texReja = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 32, 32);
  g.strokeStyle = 'rgba(150,158,170,0.95)'; g.lineWidth = 1.6;
  for (let k = -32; k < 32; k += 8){
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 32, 32); g.stroke();
    g.beginPath(); g.moveTo(k + 32, 0); g.lineTo(k, 32); g.stroke();
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.magFilter = T.NearestFilter; t.minFilter = T.LinearMipmapLinearFilter;
  t.colorSpace = T.SRGBColorSpace;
  return t;
})();

/* ── LOS MATERIALES ──
   Casi todo va en Lambert: no hay sol, hay faroles, y un difuso puro con luces
   puntuales es exactamente lo que hace falta. Las excepciones están anotadas. */
const matAsfalto = new T.MeshPhongMaterial({
  map: texAsfalto, color: 0x5c626e,
  /* EL ASFALTO ES LO ÚNICO CON BRILLO ESPECULAR, y es la mitad de la lluvia.
     Una calle mojada no es una calle más oscura: es una calle que REFLEJA los
     faroles en una raya larga. Con Lambert eso no existe, así que acá sí va
     Phong — un solo material con especular en toda la escena. */
  specular: 0x8fa6c4, shininess: 62, reflectivity: 0.6
});
/* LA VEREDA VA MÁS CLARA QUE EL ASFALTO A PROPÓSITO. De noche, lo único que
   separa la calle de la vereda es el escalón de quince centímetros, y un
   escalón no se ve si las dos caras tienen el mismo tono. */
const matVereda  = new T.MeshLambertMaterial({ map: texVereda, color: 0x7d838d });
const matPasto   = new T.MeshLambertMaterial({ map: texPasto, color: 0x8a9b7e });
const matReja    = new T.MeshLambertMaterial({ map: texReja, color: 0x99a3b2,
                                               transparent: true, alphaTest: 0.42,
                                               side: T.DoubleSide });
/* ── LOS CUATRO MATERIALES CON COLOR POR VÉRTICE ──
   Son los mismos de arriba con `vertexColors` puesto. Existen porque las casas
   se funden por cuadra: sin color por vértice, las seis casas de una cuadra
   tendrían que compartir el color del material —o sea que serían la misma casa
   seis veces— y la única salida sería un material por casa, que es justo lo que
   la fusión estaba tratando de evitar. three.js multiplica
   `map × vertexColor × material.color`, así que el tinte por casa sale gratis y
   el `color` de acá queda como el tono general de la superficie. */
const matPared    = new T.MeshLambertMaterial({ map: texTabla, vertexColors: true, color: 0xb6b6b6 });
const matLadrilloV= new T.MeshLambertMaterial({ map: texLadrillo, vertexColors: true, color: 0x9a8c86 });
const matTechoV   = new T.MeshLambertMaterial({ map: texTeja, vertexColors: true, color: 0xacb3bd });
const matMaderaV  = new T.MeshLambertMaterial({ map: texMadera, vertexColors: true, color: 0x8e8474 });
const matPoste   = new T.MeshLambertMaterial({ color: 0x30353d });
const matCable   = new T.MeshLambertMaterial({ color: 0x14171c });
const matMarco   = new T.MeshLambertMaterial({ color: 0x2a2e35 });
/* EL VIDRIO APAGADO NO PUEDE SER NEGRO PURO. Un negro absoluto no tiene
   sombreado que mostrar, así que la ventana deja de leerse como un hueco con
   vidrio y se lee como un agujero recortado en la pared. Va gris muy oscuro con
   un pelín de brillo. */
const matVidrio  = new T.MeshPhongMaterial({ color: 0x0d1218, specular: 0x334455, shininess: 90 });
/* la ventana encendida: emisiva, o sea que se ve aunque no le llegue una sola
   luz — que es lo que hace una ventana encendida */
const matLuzVent = new T.MeshBasicMaterial({ color: 0xffcf8a });
const matLuzVentF= new T.MeshBasicMaterial({ color: 0x9fd8ff });   /* el televisor */
const matPuerta  = new T.MeshLambertMaterial({ color: 0x4a3b30 });
const matFarol   = new T.MeshBasicMaterial({ color: 0xffe6b4 });
/* ── EL REFLEJO EN EL ASFALTO MOJADO ──
   LLEVA UN DEGRADADO Y NO UN COLOR PLANO, y es el mismo defecto que tenía el
   halo: un plano aditivo de color parejo tiene BORDE, así que el reflejo del
   farol sobre la calle salía como un rectángulo de cartulina naranja tirado en
   el piso — se ve en la primera captura. Con una textura radial que se apaga
   hacia afuera, el reflejo se funde con el asfalto. */
const texCharco = (() => {
  const n = 64, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(n/2, n/2, 0, n/2, n/2, n/2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.42)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  return t;
})();

/* NOTA SOBRE LO QUE NO ESTÁ ACÁ: los materiales de la lluvia y del halo NO son
   materiales de three.js sino dos `ShaderMaterial` escritos a mano, y viven en
   `f.js` y en `e.js`, al lado de la geometría que los usa. Los dos hacen lo
   mismo que no puede hacer un material de biblioteca: calcular algo POR PÍXEL o
   POR INSTANCIA en vez de por objeto — la caída de cuatro mil gotas y el
   degradado radial de noventa y seis halos.
   Y el color del auto tampoco está acá: se arma en `f.js` con `vertexColors`
   porque cada auto tiene el suyo y todos se funden en una malla. */
const matCharco  = new T.MeshBasicMaterial({ map: texCharco, color: 0xffc07a,
                                             transparent: true, opacity: 0.20,
                                             blending: T.AdditiveBlending,
                                             depthWrite: false, fog: false });
const matSalpica = new T.MeshBasicMaterial({ color: 0x9fc0e0, transparent: true,
                                             opacity: 0.13, depthWrite: false, side: T.DoubleSide });
const matCielo   = new T.MeshBasicMaterial({ color: 0x0c141f, side: T.BackSide, fog: false });
const matAutoV   = new T.MeshPhongMaterial({ color: 0x0f151c, specular: 0x445566, shininess: 80 });
const matAutoL   = new T.MeshBasicMaterial({ color: 0x60181a });
const matTronco  = new T.MeshLambertMaterial({ color: 0x4a4038, flatShading: true });
const matCopa    = new T.MeshLambertMaterial({ color: 0x2c3f2a, flatShading: true });
