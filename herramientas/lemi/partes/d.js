/* ══════════════════════════ LOS SITIOS ══════════════════════════
   Una isla grande sin nada adentro es un campo vacío. Se buscan cuatro lugares
   con sentido —terreno llano para el campamento, la cima para el mojón, un
   claro alto para las piedras y la costa para el arco— y se los construye a
   mano, uno por uno, porque un sitio que se ve de lejos es lo que hace que uno
   camine hacia algún lado en vez de dar vueltas. */
let CAMPO = null, SITIOS = [], fuegoLuz = null, fuegoMalla = null;
let CARPAS = [], AUTO = null;   /* dónde quedaron, para la cinemática y el auto */
/* cuánto se multiplica la fogata. En partida vale 1; la cinemática la sube,
   porque en la escena de noche es la ÚNICA luz y tiene que alcanzar a algo que
   está a siete metros. Va como variable y no como valor puesto a mano en el
   bucle, para que el latido y el parpadeo sigan siendo los mismos. */
let FUEGO_K = 1;

/* busca el mejor punto según lo que se le pida, evitando los ya elegidos */
function buscaSitio(test, puntaje, lejosDe, minDist){
  let mejor = null, mejorP = -1e9;
  for (let gx = -0.86; gx <= 0.86; gx += 0.028){
    for (let gz = -0.86; gz <= 0.86; gz += 0.028){
      const x = gx*MITAD, z = gz*MITAD, h = H(x, z), pe = pendiente(x, z);
      if (!test(h, pe, x, z)) continue;
      let ok = true;
      for (const o of (lejosDe || []))
        if (Math.hypot(x-o.x, z-o.z) < (minDist || 90)){ ok = false; break; }
      if (!ok) continue;
      const p = puntaje(h, pe, x, z);
      if (p > mejorP){ mejorP = p; mejor = { x, z, h }; }
    }
  }
  return mejor;
}

/* LA LONA ES TELA Y NO CARTÓN, y eso son dos cosas dibujadas y no una:
   la TRAMA —hilos cruzados, un píxel de cada dos— y unas COSTURAS más marcadas
   cada ocho. Con el moteado solo, la carpa se leía a cartulina moteada; lo que
   dice «tela» es el cruce regular, que a 32 píxeles y con el pixelado del juego
   encima se lee como el tejido. */
const texLona = lienzoTex(32, (g,n) => {
  moteado(g, n, '#c9a878', '#e0c497', '#a98a5e', 0.30);
  g.globalAlpha = 0.30; g.fillStyle = '#8f7248';
  for (let i = 0; i < n; i += 2) g.fillRect(0, i, n, 1);
  for (let i = 1; i < n; i += 2) g.fillRect(i, 0, 1, n);
  g.globalAlpha = 0.55;
  for (let i = 0; i < n; i += 8){ g.fillRect(0, i, n, 1); g.fillRect(i, 0, 1, n); }
  g.globalAlpha = 1;
});
const matLona = new T.MeshLambertMaterial({ map: texLona, flatShading: true, side: T.DoubleSide });
const matBrasa = new T.MeshBasicMaterial({ color: 0xff9a3c });
/* las tres carpas son de tres colores. Un campamento con tres carpas idénticas
   se lee a copia y pega; además el jugador necesita poder decir «la mía es la
   azul», que es lo que convierte tres bultos en tres lugares. */
const LONAS = [0xd8552f, 0x3f7fbe, 0xe0b33c];
const matLonas = LONAS.map(c => new T.MeshLambertMaterial({
  map: texLona, color: c, flatShading: true, side: T.DoubleSide }));
/* el sobretecho va un pelo más oscuro que su carpa: es otra tela, encima */
const matSobre = LONAS.map(c => new T.MeshLambertMaterial({
  map: texLona, color: new T.Color(c).multiplyScalar(0.72), flatShading: true, side: T.DoubleSide }));
const matNylon = new T.MeshLambertMaterial({ color: 0x2b3038, flatShading: true });

/* ══════════════════════════ EL AUTO ══════════════════════════
   Uno solo y bien hecho, que es lo que se pidió. Es la camioneta en la que
   llegaron, y por eso está estacionada al borde del campamento con el morro
   hacia afuera —nadie estaciona de frente al fuego— y es la misma que se ve
   llegar en la cinemática.

   LAS TEXTURAS SON PIXEL ART DE VERDAD: lienzos de 32 y 48 píxeles dibujados a
   mano con `fillRect`, filtro NEAREST y sin mipmaps, igual que la corteza y el
   pasto. Una foto acá se vería pegada encima: en un mundo donde TODO son
   bloques de color plano, lo único que puede leerse como chapa es una chapa
   dibujada al mismo tamaño de píxel. */
const texChapa = lienzoTex(32, (g,n) => {
  moteado(g, n, '#d8483a', '#ef6a53', '#a82f26', 0.30);
  /* la franja de reflejo: una chapa curva devuelve el cielo en una banda
     horizontal, y es lo único que separa «pintado» de «cartón» */
  g.globalAlpha = 0.55; g.fillStyle = '#ff9f8c';
  g.fillRect(0, (n*0.30)|0, n, 2);
  g.globalAlpha = 0.35; g.fillStyle = '#7d1f18';
  g.fillRect(0, (n*0.72)|0, n, 3);
  /* las juntas de las chapas, cada ocho píxeles */
  g.globalAlpha = 0.5; g.fillStyle = '#8e2820';
  for (let i = 0; i < n; i += 8) g.fillRect(i, 0, 1, n);
  g.globalAlpha = 1;
});
const texVidrio = lienzoTex(32, (g,n) => {
  moteado(g, n, '#2c4356', '#3a5972', '#1d2c3a', 0.35);
  /* dos rayas en diagonal: el reflejo del cielo sobre un vidrio inclinado */
  g.globalAlpha = 0.42; g.fillStyle = '#b9dcf2';
  for (let k = 0; k < 2; k++){
    const off = k*13 + 4;
    for (let i = 0; i < n; i++) g.fillRect((i+off)%n, i, 3, 1);
  }
  g.globalAlpha = 1;
});
/* LA GOMA VA EN GRIS OSCURO Y NO EN NEGRO. Con #1b1b1e la rueda salía como un
   recorte negro plano: el negro absoluto no tiene sombreado que mostrar, así
   que la pieza pierde el volumen y se lee a hueco. */
const texRueda = lienzoTex(32, (g,n) => {
  g.fillStyle = '#33333a'; g.fillRect(0,0,n,n);
  /* el dibujo del taco: bloques alternados, que es lo que se ve de una goma */
  g.fillStyle = '#22222a';
  for (let y = 0; y < n; y += 4)
    for (let x = (y/4 % 2) ? 0 : 2; x < n; x += 4) g.fillRect(x, y, 2, 3);
  g.fillStyle = '#4a4a55';
  for (let x = 0; x < n; x += 8) g.fillRect(x, 0, 1, n);
});
const texRejilla = lienzoTex(32, (g,n) => {
  g.fillStyle = '#3a3a40'; g.fillRect(0,0,n,n);
  g.fillStyle = '#191a1d';
  for (let y = 2; y < n; y += 4) g.fillRect(0, y, n, 2);
  g.fillStyle = '#6b6b74';
  for (let y = 1; y < n; y += 4) g.fillRect(0, y, n, 1);
});
const matChapa   = new T.MeshLambertMaterial({ map: texChapa, flatShading: true });
const matVidrio  = new T.MeshLambertMaterial({ map: texVidrio, flatShading: true });
const matRueda   = new T.MeshLambertMaterial({ map: texRueda, flatShading: true });
const matRejilla = new T.MeshLambertMaterial({ map: texRejilla, flatShading: true });
/* EL CROMO VA EN GRIS CÁLIDO Y NO EN GRIS AZULADO. Este juego satura al tope
   en el post-proceso, así que cualquier gris con un pelo de azul sale CIAN: en
   la captura las cuatro llantas eran celestes. Con el gris tirando a arena, la
   misma saturación lo deja en un metal cálido, que es lo que parece una llanta. */
const matCromo   = new T.MeshLambertMaterial({ color: 0xc6bfb2, flatShading: true });
/* LOS FAROS NO SON LÁMPARAS ENCENDIDAS: SON VIDRIO.
   Con `MeshBasic` el material ignora la luz, así que de noche los dos faros de
   una camioneta ESTACIONADA salían como dos rectángulos amarillo puro flotando
   en la oscuridad —medido mirando la primera captura nocturna del juego—. Un
   auto parado tiene las luces apagadas: lo que se ve de su óptica es el reflejo.
   Con Lambert y un emisivo bajo, de día se leen como cristal claro y de noche se
   apagan con todo lo demás, dejando apenas el brillo que tiene un vidrio.
   Los haces de verdad son los dos `SpotLight`, que se encienden por código. */
const matFaro    = new T.MeshLambertMaterial({ color: 0xf6ecc4, emissive: 0x3a3218 });
const matStop    = new T.MeshLambertMaterial({ color: 0xc23528, emissive: 0x2c0d0a });

/* Devuelve un Group con la camioneta armada y el morro hacia +Z, para que
   orientarla sea decir hacia dónde apunta. Sale en CINCO mallas fundidas
   —chapa, vidrio, goma, cromo y luces— y no en las cuarenta piezas que la
   componen: con las sombras encendidas cada pieza suelta se paga dos veces. */
function armaAuto3D(){
  const gr = new T.Group();
  const L = 4.30, A = 1.92, LARGO_CAB = 2.05;

  const caja = (x,y,z, sx,sy,sz, rx,ry,rz) =>
    ({ g: new T.BoxGeometry(sx, sy, sz), p: [x,y,z], r: [rx||0, ry||0, rz||0] });

  /* ── la carrocería ──
     El cuerpo va en DOS bloques y no en uno: el bajo, que llega hasta la
     cintura, y la cabina más angosta y corta encima. Un solo prisma del alto
     total se lee a ladrillo; el escalón entre los dos es lo que da la silueta
     de camioneta. Y el capó va aparte, más bajo que la cabina, porque si el
     frente y el techo están a la misma altura no hay camioneta sino furgón. */
  const chapa = [
    caja(0, 0.86, 0,          A,        0.80, L),            /* el cuerpo bajo  */
    caja(0, 1.44, -0.30,      A*0.90,   0.62, LARGO_CAB),    /* la cabina       */
    caja(0, 1.20, L/2 - 0.62, A*0.96,   0.30, 1.24),         /* el capó         */
    caja(0, 1.80, -0.30,      A*0.86,   0.10, LARGO_CAB*0.96), /* el techo      */
    /* los guardabarros: cuatro arcos apenas salidos. Sin ellos las ruedas
       parecen pegadas al costado en vez de metidas en la carrocería. */
    caja( A/2-0.03, 0.74,  L/2-1.05, 0.16, 0.62, 1.36),
    caja(-A/2+0.03, 0.74,  L/2-1.05, 0.16, 0.62, 1.36),
    caja( A/2-0.03, 0.74, -L/2+1.05, 0.16, 0.62, 1.36),
    caja(-A/2+0.03, 0.74, -L/2+1.05, 0.16, 0.62, 1.36),
    /* el estribo de cada lado */
    caja( A/2-0.02, 0.44, 0, 0.14, 0.12, L*0.52),
    caja(-A/2+0.02, 0.44, 0, 0.14, 0.12, L*0.52)
  ];
  /* ── el vidrio ──
     Parabrisas INCLINADO —un vidrio vertical se lee a colectivo—, luneta y las
     dos ventanillas de cada lado con el parante en el medio. */
  const vidrio = [
    caja(0, 1.50,  L/2 - 1.30, A*0.84, 0.66, 0.10,  -0.42),         /* parabrisas */
    caja(0, 1.50, -L/2 + 0.62, A*0.84, 0.56, 0.10,   0.30),         /* luneta     */
    caja( A*0.455, 1.50, -0.02, 0.08, 0.50, 0.82),
    caja(-A*0.455, 1.50, -0.02, 0.08, 0.50, 0.82),
    caja( A*0.455, 1.50, -1.00, 0.08, 0.50, 0.70),
    caja(-A*0.455, 1.50, -1.00, 0.08, 0.50, 0.70)
  ];
  /* ── goma: las cuatro ruedas y la de auxilio atrás ── */
  const rue = new T.CylinderGeometry(0.44, 0.44, 0.34, 9);
  const goma = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    goma.push({ g: rue, p: [sx*(A/2 - 0.04), 0.44, sz*(L/2 - 1.05)], r: [0, 0, Math.PI/2] });
  goma.push({ g: rue, p: [0, 1.00, -L/2 - 0.20], r: [Math.PI/2, 0, 0] });   /* auxilio */
  /* los paragolpes y la parrilla del techo, que son lo que dice «esto vino
     cargado desde lejos» */
  const oscuro = [
    { g: new T.BoxGeometry(A*1.02, 0.26, 0.24), p: [0, 0.62,  L/2 + 0.06] },
    { g: new T.BoxGeometry(A*1.02, 0.26, 0.24), p: [0, 0.62, -L/2 - 0.06] },
    { g: new T.BoxGeometry(A*0.90, 0.06, 1.90), p: [0, 1.88, -0.30] },
    { g: new T.BoxGeometry(0.06, 0.14, 1.90),   p: [ A*0.42, 1.94, -0.30] },
    { g: new T.BoxGeometry(0.06, 0.14, 1.90),   p: [-A*0.42, 1.94, -0.30] },
    /* el equipaje atado arriba: dos bultos de distinto tamaño, que es como se
       ata equipaje de verdad */
    { g: new T.BoxGeometry(0.78, 0.42, 1.05), p: [-0.28, 2.12, -0.10], r: [0, 0.09, 0] },
    { g: new T.BoxGeometry(0.60, 0.30, 0.72), p: [ 0.42, 2.06, -0.85], r: [0, -0.14, 0] },
    /* los espejos */
    { g: new T.BoxGeometry(0.09, 0.16, 0.22), p: [ A*0.56, 1.52, L/2 - 1.34] },
    { g: new T.BoxGeometry(0.09, 0.16, 0.22), p: [-A*0.56, 1.52, L/2 - 1.34] },
    { g: new T.CylinderGeometry(0.05, 0.05, 0.34, 5), p: [-0.62, 0.50, -L/2 - 0.16], r: [Math.PI/2, 0, 0] }
  ];
  /* LA PARRILLA lleva su propia textura de listones y no el cromo liso: de
     frente, un bloque de un solo gris entre los dos faros se leía a agujero
     oscuro. Los listones son lo que dice «acá entra aire». */
  const rejilla = [
    { g: new T.BoxGeometry(A*0.72, 0.30, 0.08), p: [0, 1.10, L/2 + 0.02] }
  ];
  /* LAS LLANTAS. Una rueda de goma sola es un disco NEGRO, y en un mundo tan
     claro como éste eso no se lee a rueda sino a agujero en la carrocería
     —medido mirando la captura de costado: dos manchas negras planas—. Lo que
     convierte el disco en rueda es el centro claro, así que cada rueda lleva su
     llanta apenas salida del flanco de afuera. */
  const cromo = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    cromo.push({ g: new T.CylinderGeometry(0.23, 0.23, 0.06, 8),
                 p: [sx*(A/2 + 0.14), 0.44, sz*(L/2 - 1.05)], r: [0, 0, Math.PI/2] });
  const luces = [
    { g: new T.BoxGeometry(0.36, 0.20, 0.06), p: [ A*0.32, 1.14, L/2 + 0.05] },
    { g: new T.BoxGeometry(0.36, 0.20, 0.06), p: [-A*0.32, 1.14, L/2 + 0.05] }
  ];
  const stops = [
    { g: new T.BoxGeometry(0.26, 0.30, 0.06), p: [ A*0.36, 1.02, -L/2 - 0.05] },
    { g: new T.BoxGeometry(0.26, 0.30, 0.06), p: [-A*0.36, 1.02, -L/2 - 0.05] }
  ];

  const poner = (piezas, mat, sombra) => {
    const m = new T.Mesh(fundir(piezas), mat);
    m.castShadow = !!sombra; m.receiveShadow = true;
    gr.add(m); return m;
  };
  poner(chapa, matChapa, true);
  poner(vidrio, matVidrio, true);
  poner(goma, matRueda, true);
  poner(oscuro, matNylon, true);
  poner(rejilla, matRejilla, true);
  poner(cromo, matCromo, true);
  poner(luces, matFaro, false);
  poner(stops, matStop, false);

  /* los dos haces de los faros, apagados mientras está estacionado. Existen
     para la cinemática: un auto que llega de noche sin luces no llega, aparece. */
  gr.userData.faros = [];
  for (const sx of [-1, 1]){
    const f = new T.SpotLight(0xfff0c0, 0, 46, 0.42, 0.55, 1.4);
    f.position.set(sx*A*0.32, 1.14, L/2);
    f.target.position.set(sx*A*0.32, 0.2, L/2 + 12);
    gr.add(f); gr.add(f.target);
    gr.userData.faros.push(f);
  }
  gr.userData.largo = L;
  return gr;
}

function armaCampamento(c){
  const g = new T.Group();
  const y = c.h;

  /* el círculo de piedras */
  for (let i = 0; i < 11; i++){
    const a = i/11*6.283, r = 1.65;
    const px = Math.cos(a)*r, pz = Math.sin(a)*r;
    const m = new T.Mesh(new T.IcosahedronGeometry(0.26 + Math.random()*0.16, 0), matRoca);
    m.position.set(px, H(c.x+px, c.z+pz) - y + 0.1, pz);
    m.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  /* la leña cruzada */
  for (let i = 0; i < 5; i++){
    const a = i/5*6.283;
    const l = new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 1.5, 5), matCorteza);
    l.position.set(Math.cos(a)*0.35, 0.42, Math.sin(a)*0.35);
    l.rotation.set(Math.cos(a)*0.95, a, Math.sin(a)*0.95);
    l.castShadow = true;
    g.add(l);
  }
  /* la llama: dos conos que laten. Sin transparencia, para que el pixelado la
     recorte con borde duro como todo lo demás. */
  fuegoMalla = new T.Group();
  for (let i = 0; i < 2; i++){
    const f = new T.Mesh(new T.ConeGeometry(0.42 - i*0.14, 1.25 - i*0.35, 5), matBrasa);
    f.position.y = 0.72 - i*0.12;
    fuegoMalla.add(f);
  }
  g.add(fuegoMalla);
  fuegoLuz = new T.PointLight(0xffa03c, 8, 26, 1.7);
  fuegoLuz.position.set(0, 1.1, 0);
  g.add(fuegoLuz);

  /* LOS TRES TRONCOS para sentarse, uno por lado y con un hueco para entrar */
  for (let i = 0; i < 3; i++){
    const a = i/3*6.283 + 0.5, r = 3.5;
    const t = new T.Mesh(new T.CylinderGeometry(0.36, 0.4, 3.1, 7), matCorteza);
    const px = Math.cos(a)*r, pz = Math.sin(a)*r;
    t.position.set(px, H(c.x+px, c.z+pz) - y + 0.36, pz);
    t.rotation.set(Math.PI/2, 0, -a);   /* acostado y de cara al fuego */
    t.castShadow = t.receiveShadow = true;
    g.add(t);
  }

  /* LAS CARPAS, HUECAS DE VERDAD.
     Antes era un prisma cerrado: por fuera pasaba, pero no era una carpa sino un
     bulto. Ahora se arma con las tres piezas que tiene una carpa —EL PISO y LAS
     DOS AGUAS del techo— y se deja abierta en las dos puntas, así se entra, se
     ve el interior y la luz de la fogata se mete adentro. Las tres van a
     DoubleSide porque desde adentro se miran por el reverso. */
  /* UNA CARPA DE VERDAD NO ES UN TECHO A DOS AGUAS.
     La anterior eran tres rectángulos de lona: por fuera pasaba, pero era una
     tienda de campaña de dibujito. Una carpa iglú de las que uno lleva a acampar
     tiene ARCOS que la sostienen, la tela se CURVA entre arco y arco, tiene una
     PUERTA con el faldón enrollado a un costado, y encima va un SOBRETECHO que
     no la toca —de ahí la sombra que se le mete por debajo—.
     Todo eso se arma con dos piezas de revolución y nada más:
       · la tela: media cápsula, o sea una esfera achatada partida por el medio y
         estirada en el largo. Se hace con `SphereGeometry` cortada por phi, que
         ya trae la curvatura; deformar un plano a mano habría costado el triple
         de vértices para la misma silueta.
       · los arcos: un toro cortado a medio giro. */
  const C_ANCHO = 2.2, C_LARGO = 2.9, C_ALTO = 1.42;
  const geoTela = (() => {
    /* media esfera (phi 0..π sobre la vertical) escalada a la caja de la carpa */
    const g = new T.SphereGeometry(1, 14, 9, 0, Math.PI, 0, Math.PI/2);
    g.scale(C_LARGO/2, C_ALTO, C_ANCHO/2);
    g.rotateY(Math.PI/2);
    return g;
  })();
  const geoArco = (() => {
    const g = new T.TorusGeometry(1, 0.035, 4, 18, Math.PI);
    return g;
  })();
  const geoPiso = new T.PlaneGeometry(C_ANCHO*0.98, C_LARGO*0.98);
  const geoPuerta = new T.CircleGeometry(0.52, 12, 0, Math.PI);
  const geoRollo = new T.CylinderGeometry(0.09, 0.09, 0.62, 6);
  const geoEstaca = new T.CylinderGeometry(0.035, 0.02, 0.34, 4);
  const geoMochila = new T.BoxGeometry(0.42, 0.54, 0.30);

  /* la carpa sale FUNDIDA en tres mallas —tela, sobretecho y todo lo oscuro—
     en vez de las quince piezas sueltas que serían. Ver `fundir` en c.js. */
  function carpa(k){
    const gr = new T.Group();

    /* el sobretecho va 10 % más afuera y NO llega hasta el suelo: se corta a
       media altura. Una segunda cáscara pegada a la primera no se vería nunca;
       separada, entre las dos queda una franja de sombra, que es exactamente lo
       que hace que se lea como dos telas y no como una. */
    const tela = new T.Mesh(geoTela, matLonas[k % 3]);
    tela.castShadow = true; tela.receiveShadow = true;
    gr.add(tela);
    const sob = new T.Mesh(
      fundir([{ g: geoTela, p: [0, -0.16, 0], s: [1.10, 1.06, 1.10] },
              { g: geoRollo, p: [0.44, 0.34, C_LARGO/2 - 0.02], r: [0, 0, 0.12] }]),
      matSobre[k % 3]);
    sob.castShadow = true;
    gr.add(sob);

    /* TODO LO OSCURO EN UNA: el piso, los dos arcos cruzados como los de una
       iglú, la puerta, los cuatro vientos con sus estacas y la mochila.
       La PUERTA es lo que convierte un bulto en una carpa: un semicírculo
       oscuro hundido en la tela —el interior— con el faldón enrollado al lado.
       Va en la cara de +Z, o sea la que se orienta al fuego.
       La MOCHILA tirada al lado es lo que dice que alguien la está usando: una
       carpa sin nada alrededor se lee a carpa de catálogo. */
    const oscuras = [
      { g: geoPiso, p: [0, 0.02, 0], r: [-Math.PI/2, 0, 0] },
      { g: geoArco, p: [0, 0.01, 0], r: [0,  0.62, 0], s: [C_ANCHO/2*1.02, C_ALTO*1.02, 1] },
      { g: geoArco, p: [0, 0.01, 0], r: [0, -0.62, 0], s: [C_ANCHO/2*1.02, C_ALTO*1.02, 1] },
      { g: geoPuerta, p: [0, 0.02, C_LARGO/2 - 0.06], s: [1, 1.25, 1] },
      { g: geoMochila, p: [C_ANCHO/2 + 0.28, 0.27, C_LARGO/2 - 0.5], r: [0.28, 0.5, 0.14] }
    ];
    /* los vientos: de la cumbrera a cuatro estacas. Sin ellos la carpa flota */
    const _a = new T.Vector3(), _b = new T.Vector3(), _q = new T.Quaternion(), _e = new T.Euler();
    for (const sz of [-1, 1]) for (const sx of [-1, 1]){
      const ex = sx * (C_ANCHO/2 + 0.55), ez = sz * (C_LARGO/2 + 0.45);
      _a.set(sx*0.30, C_ALTO*0.86, sz*C_LARGO*0.30);
      _b.set(ex, 0.05, ez);
      const largo = _a.distanceTo(_b);
      _q.setFromUnitVectors(new T.Vector3(0,1,0), _b.clone().sub(_a).normalize());
      _e.setFromQuaternion(_q);
      oscuras.push({ g: new T.CylinderGeometry(0.014, 0.014, largo, 3),
                     p: [(_a.x+_b.x)/2, (_a.y+_b.y)/2, (_a.z+_b.z)/2],
                     r: [_e.x, _e.y, _e.z] });
      oscuras.push({ g: geoEstaca, p: [ex, 0.1, ez] });
    }
    const osc = new T.Mesh(fundir(oscuras), matNylon);
    osc.castShadow = true; osc.receiveShadow = true;
    gr.add(osc);
    return gr;
  }
  /* LAS TRES MIRAN AL FUEGO. Antes se orientaban con un `+Math.random()` y una
     quedaba de espaldas: la puerta daba al bosque y desde la fogata se veía el
     fondo de la carpa. Con la puerta en +Z, apuntar +Z al centro es girar
     `a + π`, y el desorden queda en un pelo de ángulo, que es lo que hace un
     campamento de verdad y no un desorden que tape la puerta. */
  CARPAS = [];
  for (let i = 0; i < 3; i++){
    const a = i/3*6.283 + 1.9, r = 8.2 + (i%2)*1.4;
    const px = Math.cos(a)*r, pz = Math.sin(a)*r;
    const k = carpa(i);
    k.position.set(px, H(c.x+px, c.z+pz) - y, pz);
    k.rotation.y = a + Math.PI + (Math.random()-0.5)*0.22;
    g.add(k);
    CARPAS.push({ x: c.x + px, z: c.z + pz });
  }

  g.position.set(c.x, y, c.z);
  escena.add(g); GRUPOS.push(g);

  /* ── LA CAMIONETA, estacionada ──
     Va en el HUECO ENTRE DOS CARPAS y no en un ángulo cualquiera: las tres
     carpas salen de `i/3·2π + 1,9`, o sea 1,90 · 3,99 · 6,09 rad, y 0,81 es el
     medio del hueco más grande. Puesta al azar podía quedar encima de una carpa
     o de sus vientos, que llegan a once metros y medio del centro.
     Y va DERECHA, sin seguir la pendiente: el campamento se eligió por ser lo
     más llano de la isla, así que inclinarla sería inventar un desnivel que no
     está. El morro mira para afuera, que es como estaciona cualquiera. */
  const aa = 0.81, ar = 12.6;
  const ax = c.x + Math.cos(aa)*ar, az = c.z + Math.sin(aa)*ar;
  const auto = armaAuto3D();
  auto.position.set(ax, H(ax, az), az);
  auto.rotation.y = Math.atan2(ax - c.x, az - c.z);
  escena.add(auto); GRUPOS.push(auto);
  AUTO = { g: auto, x: ax, z: az, y: H(ax, az), ry: auto.rotation.y };
}

/* ══════════════════════════ LA CUEVA ══════════════════════════
   Se elige ANTES de armar el terreno, porque el cuenco que la hunde vive dentro
   de `H()` y la malla del terreno se construye leyendo `H()`.

   VA EN UNA LADERA Y NO EN LO LLANO, y ésa es toda la diferencia entre una
   cueva y un pozo: lo que hace que se lea como una boca es que haya monte
   ENCIMA. Se busca la pendiente más marcada dentro de un anillo alrededor del
   campamento —lo bastante lejos para que llegar sea un viaje, lo bastante cerca
   para que el rastro de sangre no dé la vuelta a la isla—, y se orienta mirando
   hacia abajo de la ladera, que es por donde uno llega caminando. */
function eligeCueva(campo){
  let mejor = null, mejorP = -1e9;
  for (let a = 0; a < 6.283; a += 0.09){
    for (let r = 88; r <= 150; r += 4){
      const x = campo.x + Math.cos(a)*r, z = campo.z + Math.sin(a)*r;
      if (Math.hypot(x, z) > MITAD*0.80) continue;
      const h = H(x, z), pe = pendiente(x, z);
      if (h < PLAYA + 6) continue;                 /* ni en la playa ni en el mar */
      const p = pe*10 + h*0.05 - Math.abs(r - 115)*0.02;
      if (p > mejorP){ mejorP = p; mejor = { x, z, h, a }; }
    }
  }
  if (!mejor) return null;
  /* hacia dónde baja la ladera: la boca mira para allá */
  const e = 3.0;
  const gx = H(mejor.x + e, mejor.z) - H(mejor.x - e, mejor.z);
  const gz = H(mejor.x, mejor.z + e) - H(mejor.x, mejor.z - e);
  const baja = Math.atan2(-gx, -gz);              /* el sentido de bajada */
  /* el cerro va detrás de la boca, en el sentido contrario al que uno llega.
     Los números están elegidos para que en la boca las dos cosas casi se
     cancelen —a veinte metros del centro de una loma de radio cuarenta, el
     coseno elevado vale un cuarto, o sea +4,5 m contra los −5,2 del cuenco—
     así que el piso de la entrada queda a la altura del terreno de siempre y lo
     que crece es todo lo que hay alrededor y por encima. */
  const c = { x: mejor.x, z: mejor.z, r: 12.5, hondo: 5.4, mira: baja,
              mr: 40, malto: 18 };
  c.mx = mejor.x - Math.sin(baja)*20;
  c.mz = mejor.z - Math.cos(baja)*20;
  c.h = 0;              /* se rellena con H() ya excavada, más abajo */
  return c;
}

const texPiedra = lienzoTex(48, (g,n) => {
  moteado(g, n, '#9c9282', '#b8af9c', '#736a5b', 0.55);
  g.fillStyle = '#3f3a33';
  for (let i = 0; i < 16; i++){ const y=(Math.random()*n)|0; g.fillRect(0,y,n,1); }
  for (let i = 0; i < 10; i++){ const x=(Math.random()*n)|0; g.fillRect(x,0,1,n); }
});
const matPiedra = new T.MeshLambertMaterial({ map: texPiedra, flatShading: true });
/* EL FONDO DE LA CUEVA VA SIN LUZ Y EN NEGRO CASI PURO. Un fondo sombreado
   igual devuelve algo de la hemisférica y entonces se le ve el final: el agujero
   deja de ser un agujero y pasa a ser un nicho. En negro plano no tiene fondo. */
const matNegro = new T.MeshBasicMaterial({ color: 0x05070a });

function armaCueva(c){
  const g = new T.Group();
  /* LA BOCA: un arco de bloques de piedra hundido en la ladera, con el túnel
     detrás. Los bloques van en un semicírculo y con tamaños desparejos, porque
     un arco de piezas iguales se lee a puerta construida y no a roca partida. */
  const piezas = [];
  const N = 17, RA = 4.4;
  for (let i = 0; i < N; i++){
    const t = i/(N-1), an = Math.PI*t;
    const s = 0.85 + Math.random()*0.55;
    piezas.push({ g: new T.BoxGeometry(1.5*s, 1.35*s, 2.2),
                  p: [Math.cos(an)*RA, Math.sin(an)*RA*0.92, 0],
                  r: [(Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, -an + Math.PI/2] });
  }
  /* piedras sueltas al pie, que es lo que hay en la boca de una cueva */
  for (let i = 0; i < 9; i++){
    const s = 0.5 + Math.random()*0.9;
    piezas.push({ g: new T.IcosahedronGeometry(s, 0),
                  p: [(Math.random()-0.5)*8, 0.1 + Math.random()*0.3, 1.2 + Math.random()*2.2],
                  r: [Math.random()*3, Math.random()*3, Math.random()*3] });
  }
  const arco = new T.Mesh(fundir(piezas), matPiedra);
  arco.castShadow = true; arco.receiveShadow = true;
  g.add(arco);

  /* EL TÚNEL: un cilindro abierto metido en el cerro, tapado al fondo. Da la
     profundidad que el cuenco del terreno no puede dar —un mapa de alturas no
     tiene techo— y es lo que hace que desde afuera se vea que sigue. */
  /* EL NEGRO VA PEGADO A LA BOCA, Y ESO SALE DE UNA CUENTA DEL TERRENO.
     Estaba dieciocho metros adentro, con un túnel largo delante. Pero el cerro
     que se levanta detrás de la boca sube 2,8 m en los primeros tres metros y
     6,3 m en cinco —es una ladera, para eso se la puso—, así que el túnel y su
     fondo quedaban ENTERRADOS: en la captura no había agujero, había un montón
     de piedras oscuras sobre el pasto. Con el negro a metro y medio, delante de
     donde el suelo empieza a trepar, el arco se lee como lo que es. El túnel se
     queda corto, sólo para que el canto tenga espesor. */
  const tun = new T.Mesh(
    new T.CylinderGeometry(RA*0.84, RA*0.84, 6, 12, 1, true), matPiedra);
  tun.rotation.x = Math.PI/2;
  tun.position.set(0, RA*0.48, -2.6);
  tun.material.side = T.DoubleSide;
  g.add(tun);
  const fondo = new T.Mesh(new T.CircleGeometry(RA*0.84, 12), matNegro);
  fondo.position.set(0, RA*0.48, -5.2);
  g.add(fondo);

  g.position.set(c.x, H(c.x, c.z), c.z);
  g.rotation.y = c.mira;
  escena.add(g); GRUPOS.push(g);
  /* dónde se para uno cuando llega: cinco metros delante de la boca */
  c.frenteX = c.x + Math.sin(c.mira)*7.5;
  c.frenteZ = c.z + Math.cos(c.mira)*7.5;
}

/* mojón de piedras en la cima: se ve desde media isla */
function armaMojon(c){
  const g = new T.Group();
  for (let i = 0; i < 9; i++){
    const t = i/9;
    const m = new T.Mesh(new T.IcosahedronGeometry(0.85*(1-t*0.62), 0), matRoca);
    m.position.set((Math.random()-0.5)*0.3, t*3.4, (Math.random()-0.5)*0.3);
    m.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  g.position.set(c.x, c.h, c.z);
  escena.add(g); GRUPOS.push(g);
}

/* círculo de piedras paradas */
function armaCirculo(c){
  const g = new T.Group();
  for (let i = 0; i < 8; i++){
    const a = i/8*6.283, r = 6.5;
    const alto = 2.6 + Math.random()*2.2;
    const m = new T.Mesh(new T.BoxGeometry(1.1, alto, 0.7), matRoca);
    const px = Math.cos(a)*r, pz = Math.sin(a)*r;
    m.position.set(px, H(c.x+px, c.z+pz) - c.h + alto/2 - 0.2, pz);
    m.rotation.set((Math.random()-0.5)*0.14, a, (Math.random()-0.5)*0.12);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  g.position.set(c.x, c.h, c.z);
  escena.add(g); GRUPOS.push(g);
}

/* arco de piedra en la costa */
function armaArco(c){
  const g = new T.Group();
  const N = 11;
  for (let i = 0; i < N; i++){
    const t = i/(N-1), a = Math.PI*t;
    const m = new T.Mesh(new T.BoxGeometry(2.1, 1.9, 2.6), matRoca);
    m.position.set(Math.cos(a)*5.2, Math.sin(a)*5.6, 0);
    m.rotation.set((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, -a + Math.PI/2);
    m.scale.setScalar(0.85 + Math.random()*0.35);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  g.position.set(c.x, c.h - 0.4, c.z);
  g.rotation.y = Math.random()*3.14;
  escena.add(g); GRUPOS.push(g);
}

function eligeSitios(){
  /* EL CAMPAMENTO VA EN EL CENTRO DE LA ISLA. No se busca por toda la isla: se
     busca el punto más llano DENTRO de un radio corto del origen, así queda
     siempre en el medio —que es donde uno lo espera— pero sin que la fogata
     termine colgada de una ladera. */
  CAMPO = null;
  { let mejorP = -1e9;
    for (let r = 0; r <= 34; r += 2){
      for (let a = 0; a < 6.283; a += (r < 1 ? 7 : 0.24)){
        const x = Math.cos(a)*r, z = Math.sin(a)*r;
        const h = H(x, z), pe = pendiente(x, z);
        if (h < PLAYA + 1.0) continue;
        const pun = (1 - pe*5)*4 - r*0.035;
        if (pun > mejorP){ mejorP = pun; CAMPO = { x, z, h }; }
      }
    }
  }
  if (!CAMPO) CAMPO = { x: 0, z: 0, h: Math.max(H(0,0), PLAYA + 1.4) };
  const usados = [CAMPO];

  const cima = buscaSitio((h, pe) => pe < 0.5, h => h, usados, 130);
  const circ = buscaSitio((h, pe) => h > PLAYA + 3 && h < 30 && pe < 0.18,
                          (h, pe) => (1 - pe*4)*2 + h*0.05, usados, 120);
  const arco = buscaSitio((h, pe) => h > PLAYA - 0.5 && h < PLAYA + 2.2 && pe < 0.3,
                          (h, pe, x, z) => Math.hypot(x, z)/MITAD*3 - pe, usados, 120);
  SITIOS = [{ t:'campamento', c: CAMPO }];
  if (cima) SITIOS.push({ t:'mojón', c: cima });
  if (circ) SITIOS.push({ t:'círculo', c: circ });
  if (arco) SITIOS.push({ t:'arco', c: arco });
  /* EL CLARO DEL CAMPAMENTO CRECE DE 13 A 17 METROS, y no es por gusto: la
     camioneta está a 12,6 del centro y mide 4,3 de largo, así que con el claro
     viejo los árboles brotaban PEGADOS a ella —en la captura de frente había un
     tronco justo delante del capó, tapando lo único que había que mirar—. Con
     17 quedan cuatro metros de aire alrededor del auto. */
  CLAROS = SITIOS.map(s2 => ({ x: s2.c.x, z: s2.c.z, r: s2.t === 'campamento' ? 17 : 9 }));
}
function armaSitios(){
  fuegoLuz = null; fuegoMalla = null;
  if (CUEVA) armaCueva(CUEVA);
  for (const s2 of SITIOS){
    if (s2.t === 'campamento') armaCampamento(s2.c);
    else if (s2.t === 'mojón') armaMojon(s2.c);
    else if (s2.t === 'círculo') armaCirculo(s2.c);
    else if (s2.t === 'arco') armaArco(s2.c);
  }
}

/* ══════════════════════════ LAS NUBES ══════════════════════════
   Cúmulos gordos: racimos de icosaedros de una sola subdivisión, planos, en
   blanco casi puro. Con flatShading y el hemisférico, la panza les queda
   azulada sola y arriba les pega el sol. Nada de billboards ni de alfa: son
   volumen de verdad, y por eso se pixelan bien en los bordes. */
let nubes = null, matNube = null;
function armaNubes(){
  if (nubes){ escena.remove(nubes); nubes.geometry.dispose(); }
  const trozos = [];
  const RACIMOS = 54;
  for (let i = 0; i < RACIMOS; i++){
    /* LEJOS Y ALTAS. Con el radio mínimo en 60 había cúmulos a la altura de las
       copas y encima de la cabeza: se veían como globos estirados en vez de
       nubes. Un cúmulo se lee como cúmulo cuando está lejos y arriba. */
    const a = Math.random()*6.283, d = 190 + Math.random()*430;
    const cx = Math.cos(a)*d, cz = Math.sin(a)*d;
    const cy = 105 + Math.random()*95;
    const esc = 7 + Math.random()*11;
    const n = 9 + ((Math.random()*9)|0);
    for (let k = 0; k < n; k++){
      /* la panza plana y la coronilla redonda: los trozos de abajo se achatan */
      const t = Math.random();
      const alto = (Math.random()-0.25);
      trozos.push({
        x: cx + (Math.random()-0.5)*esc*2.7,
        y: cy + alto*esc*0.62,
        z: cz + (Math.random()-0.5)*esc*2.7,
        sx: esc*(0.52+Math.random()*0.58),
        sy: esc*(0.30+Math.random()*0.26)*(alto > 0 ? 1.15 : 0.72),
        sz: esc*(0.52+Math.random()*0.58),
        /* SOLO giro en Y: con rotación libre el icosaedro achatado se acuesta y
           la nube pasa a ser una cápsula tumbada. El eje chato tiene que quedar
           vertical siempre. */
        rx: 0, ry: Math.random()*6.283, rz: 0
      });
    }
  }
  const g = new T.IcosahedronGeometry(1, 1);
  /* con emisivo la panza de la nube no se va a gris: un cúmulo real rebota
     tanta luz adentro que nunca se ve oscuro desde abajo */
  const m = new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0xcfe6ff,
    emissiveIntensity: 0.55, flatShading: true, fog: false });
  const im = new T.InstancedMesh(g, m, trozos.length);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  trozos.forEach((o, i) => {
    e.set(o.rx, o.ry, o.rz); q.setFromEuler(e);
    m4.compose(new T.Vector3(o.x,o.y,o.z), q, new T.Vector3(o.sx,o.sy,o.sz));
    im.setMatrixAt(i, m4);
  });
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = false; im.receiveShadow = false;
  im.frustumCulled = false;
  nubes = im; escena.add(im);
  matNube = m;
}

