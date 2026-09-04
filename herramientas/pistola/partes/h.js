
/* ══════════════════════════ LO QUE SE VE ══════════════════════════
   Todo lo del nivel se construye una vez por nivel y se tira al siguiente. Y se
   TIRA de verdad: three.js no libera una geometria porque deje de estar en la
   escena, la subida vive hasta que alguien llama a `dispose()`. Diez niveles sin
   soltar son diez torres ocupando memoria de video para no dibujar nada. */
const gMundo = new T.Group(), gCosas = new T.Group();
esc.add(gMundo, gCosas);

/* ── LOS COLORES SE SUBIERON, Y ES POR LA SOMBRA ──
   Un albedo de 0x2a2e37 esta en 0,026 en lineal: multiplicado por el ambiente
   que queda en una zona en sombra, eso es CERO. Medido, la pared del fondo salia
   negra en toda la franja que las losas le tapaban. Un material oscuro se puede
   permitir en una escena bien iluminada; en una con sombras duras hay que
   subirlo o lo que queda en sombra deja de existir. */
function texHalo(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 6, 0, 32, 6, 46);
  g.addColorStop(0, 'rgba(255,205,130,1)');
  g.addColorStop(0.45, 'rgba(255,180,90,0.30)');
  g.addColorStop(1, 'rgba(255,160,70,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function texHaloArma(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,226,160,0.85)');
  g.addColorStop(0.35, 'rgba(255,200,110,0.22)');
  g.addColorStop(1, 'rgba(255,180,80,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const MAT = {
  losa:  new T.MeshStandardMaterial({ color: 0xa8a294, roughness: 0.90, metalness: 0.05 }),
  pared: new T.MeshStandardMaterial({ color: 0x50596b, roughness: 0.95, metalness: 0.02 }),
  col:   new T.MeshStandardMaterial({ color: 0x9c9182, roughness: 0.90, metalness: 0.03 }),
  piso:  new T.MeshStandardMaterial({ color: 0x757b88, roughness: 0.92, metalness: 0.04 }),
  techo: new T.MeshStandardMaterial({ color: 0x4e545e, roughness: 0.95, metalness: 0.02 }),
  acero: new T.MeshStandardMaterial({ color: 0xb3bcc8, roughness: 0.30, metalness: 0.88 }),
  caja:  new T.MeshStandardMaterial({ color: 0xc2853f, roughness: 0.84, metalness: 0.03 }),
  arma:  new T.MeshStandardMaterial({ color: 0x4a505c, roughness: 0.38, metalness: 0.74 }),
  armaB: new T.MeshStandardMaterial({ color: 0xc9a03c, roughness: 0.30, metalness: 0.88 }),
/* ── EL LADRON VA DE UN COLOR QUE NO ESTA EN EL EDIFICIO ──
     Estaba en azul grisaceo, o sea el mismo color que la pared del fondo: medido
     en la captura, con cinco ladrones en pantalla no se veia ni uno. Lo unico que
     hace que un personaje se lea en una escena monocroma es que su color no
     exista en ninguna otra parte. */
  lad:   new T.MeshStandardMaterial({ color: 0xb8563c, roughness: 0.84, metalness: 0.02 }),
  ladC:  new T.MeshStandardMaterial({ color: 0xd8b48a, roughness: 0.82, metalness: 0.0 }),
  gorro: new T.MeshStandardMaterial({ color: 0x2b303c, roughness: 0.9, metalness: 0.0 }),
  ladZ:  new T.MeshStandardMaterial({ color: 0x241f26, roughness: 0.92, metalness: 0.0 }),
  bolsa: new T.MeshStandardMaterial({ color: 0xd6d2c4, roughness: 0.86, metalness: 0.02 }),
  luz:   new T.MeshBasicMaterial({ color: 0xffd898 }),
  /* el halo del aplique: aditivo y sin escritura de profundidad, asi no le
     recorta el borde a nada de lo que tenga detras */
  /* ── Y EL HALO VA CON UN DEGRADADO RADIAL, NO CON UN COLOR PLANO ──
     Un plano de color parejo al 16 % se lee a PANEL MARRON pegado a la pared:
     medido en la captura, los tres halos de cada piso parecian tres puertas. Un
     radial no tiene borde en ningun lado, que es exactamente lo que le pasa a
     la luz. */
  haloArma: new T.MeshBasicMaterial({ map: texHaloArma(), transparent: true, opacity: 0.72,
                                     blending: T.AdditiveBlending, depthWrite: false }),
  halo:  new T.MeshBasicMaterial({ map: texHalo(), transparent: true, opacity: 0.55,
                                   blending: T.AdditiveBlending, depthWrite: false }),
  alfom: new T.MeshStandardMaterial({ color: 0x8a3140, roughness: 0.95, metalness: 0.0 }),
  bala:  new T.MeshBasicMaterial({ color: 0xfff0b0 }),
  balaE: new T.MeshBasicMaterial({ color: 0xff6a4a })
};
const GEO = { caja: new T.BoxGeometry(1, 1, 1), esf: new T.SphereGeometry(1, 10, 8),
              cil: new T.CylinderGeometry(1, 1, 1, 10),
              plano: new T.PlaneGeometry(1, 1) };

/* ══════════════ LOS ASSETS GENERADOS, PUESTOS EN DIFERIDO ══════════════
   ── LOS METROS QUE CUBRE CADA FOTO SON UN DATO, NO UNA PREFERENCIA ──
   Salen de lo que se le pidio al generador —ocho hiladas de bloque, tres metros
   de losa, cuatro tablas— y de ahi sale cuantas veces se repite en cada pieza.
   Sin esa cuenta, una pared de tres metros y medio sale con hiladas de veinte
   centimetros y el edificio se lee a casa de muñecas.
   ── Y SE REPITEN EN ESPEJO ──
   Al generador se le pidieron «embaldosables» y ninguna imagen generada lo es de
   verdad. Cosiendolas a mano se ensucia el centro, que es lo que mas se mira;
   con `MirroredRepeatWrapping` la copia de al lado va dada vuelta, asi que los
   dos bordes que se tocan son EL MISMO borde y la costura no puede existir. */
const TEX_M = { p_pared: 1.60, p_losa: 3.00, p_acero: 1.00, p_caja: 0.60, p_suelo: 2.00 };
const TEX = {};
const TEX_MAT = { p_pared: ['pared'], p_losa: ['losa', 'col', 'techo'],
                  p_acero: ['acero'], p_caja: ['caja'], p_suelo: ['piso'] };
let ASSETS_LISTOS = 0, ASSETS_FALLADOS = 0;

function cargaTexturas(){
  if (typeof AS_IMG === 'undefined') return;
  const cl = new T.TextureLoader();
  /* ── EL MODELO CONSERVA SU TEXTURA, QUE ES DONDE ESTA EL DISEÑO ──
     Horneada a color por vertice y decimada a 2.600 triangulos, la pistola daba
     una media de 0,089 en lineal: un bulto negro. Sin decimar —5.612 triangulos
     no son nada para el unico objeto que esta SIEMPRE en pantalla y se mira de
     cerca— se conserva la foto, y ahi se ve que es una pistola. */
  if (AS_IMG.p_pistola_tex)
    cl.load('data:image/webp;base64,' + AS_IMG.p_pistola_tex, (t) => {
      t.colorSpace = T.SRGBColorSpace; t.flipY = false;
      /* ── METALNESS 0, Y NO ES UN GUSTO ──
         Un material metalico SIN mapa de entorno no tiene nada que reflejar y
         sale negro: con 0,35 el arma era una silueta. Y va con emisivo POR MAPA
         —la misma foto— porque asi el levante conserva el dibujo en vez de
         pintarle un gris encima, que es lo que hace un emisivo de color plano. */
      MOD.mat = new T.MeshStandardMaterial({ map: t, roughness: 0.58, metalness: 0.0,
                                             emissiveMap: t, emissive: 0xffffff,
                                             emissiveIntensity: 0.34 });
      ASSETS_LISTOS++;
      if (MOD.geo.p_pistola) armaPistola();
    }, undefined, () => { ASSETS_FALLADOS++; });
  for (const k in AS_IMG){
    if (k.endsWith('_tex')) continue;
    cl.load('data:image/webp;base64,' + AS_IMG[k], (t) => {
      t.colorSpace = T.SRGBColorSpace;
      t.wrapS = t.wrapT = T.MirroredRepeatWrapping;
      t.anisotropy = 4;
      TEX[k] = t;
      for (const m of (TEX_MAT[k] || [])){
        MAT[m].map = t;
        /* ── Y EL TINTE SE RECALCULA, PORQUE three.js MULTIPLICA ──
           `map × vertexColor × material.color`: el color del material es un
           TINTE sobre la foto. Dejando el que estaba, una textura que ya trae su
           propio gris sale el doble de oscura. Se aclara a un gris casi blanco y
           se le deja apenas la temperatura que cada superficie tenia. */
        MAT[m].color.lerp(new T.Color(0xffffff), 0.62);
        MAT[m].needsUpdate = true;
      }
      ASSETS_LISTOS++;
      if (typeof MUNDO !== 'undefined' && MUNDO.losas.length) construyeEscena();
    }, undefined, () => { ASSETS_FALLADOS++; });
  }
}

/* ── LAS UV VAN POR PIEZA Y EN METROS, ASI QUE LA GEOMETRIA TAMBIEN ──
   Todas las cajas comparten `GEO.caja` y una BoxGeometry tiene sus UV de 0 a 1
   por cara: con una sola geometria, una pared de doce metros y un pilar de tres
   muestran la MISMA cantidad de ladrillos. Se cachea por tamaño redondeado, asi
   que las diez losas de una torre comparten una sola. */
const CACHE_UV = {};
function cajaUV(w, h, d, m){
  const rw = Math.max(0.05, w/m), rh = Math.max(0.05, h/m);
  const k = rw.toFixed(2) + '|' + rh.toFixed(2);
  if (CACHE_UV[k]) return CACHE_UV[k];
  const g = new T.BoxGeometry(1, 1, 1);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, uv.getX(i)*rw, uv.getY(i)*rh);
  uv.needsUpdate = true;
  CACHE_UV[k] = g;
  return g;
}

/* ══════════════ EL LECTOR DE GLB, EN CUARENTA LINEAS ══════════════
   No se usa `GLTFLoader`: este juego depende de que llegue `three` y de nada
   mas, y el cargador de three.js es otra descarga de un CDN que puede no llegar
   mas una entrada en el importmap — para leer un archivo que generamos nosotros
   y cuya forma controlamos entera. Es la misma decision que en LEMI.
   Lo que sale del horneado es un nodo, una malla, una primitiva y cuatro
   accesores con las vistas compactas. */
const _GLB_TIPO = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
                    5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const _GLB_N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function leeGLB(b64){
  const bin = atob(b64), buf = new ArrayBuffer(bin.length), u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) return null;   /* 'glTF' */
  const total = dv.getUint32(8, true);
  let off = 12, js = null, base = -1;
  while (off < total){
    const n = dv.getUint32(off, true), tipo = dv.getUint32(off + 4, true);
    if (tipo === 0x4E4F534A)
      js = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, n)));
    else if (tipo === 0x004E4942) base = off + 8;
    off += 8 + n + ((4 - n % 4) % 4);
  }
  if (!js || base < 0 || !js.meshes || !js.meshes.length) return null;
  const acc = (i) => {
    const a = js.accessors[i], TA = _GLB_TIPO[a.componentType], n = _GLB_N[a.type];
    const bv = js.bufferViews[a.bufferView];
    const o = base + (bv.byteOffset || 0) + (a.byteOffset || 0);
    /* UNA VISTA TIPADA EXIGE QUE EL DESPLAZAMIENTO SEA MÚLTIPLO DEL TAMAÑO del
       elemento; si no, el constructor tira. El horneado alinea a cuatro, pero
       un GLB ajeno puede no hacerlo, así que en ese caso se copia. */
    const largo = a.count * n;
    if (o % TA.BYTES_PER_ELEMENT)
      return { d: new TA(buf.slice(o, o + largo * TA.BYTES_PER_ELEMENT)), n, norm: !!a.normalized };
    return { d: new TA(buf, o, largo), n, norm: !!a.normalized };
  };
  const pr = js.meshes[0].primitives[0];
  const g = new T.BufferGeometry();
  const pos = acc(pr.attributes.POSITION);
  g.setAttribute('position', new T.BufferAttribute(pos.d, 3));
  if (pr.attributes.NORMAL != null){
    const nr = acc(pr.attributes.NORMAL);
    g.setAttribute('normal', new T.BufferAttribute(nr.d, 3, nr.norm));
  }
  if (pr.attributes.TEXCOORD_0 != null){
    const t = acc(pr.attributes.TEXCOORD_0);
    g.setAttribute('uv', new T.BufferAttribute(t.d, 2, t.norm));
  }
  if (pr.attributes.COLOR_0 != null){
    const c = acc(pr.attributes.COLOR_0);
    g.setAttribute('color', new T.BufferAttribute(c.d, c.n, c.norm));
  }
  if (pr.indices != null){
    const ix = acc(pr.indices);
    g.setIndex(new T.BufferAttribute(ix.d, 1));
  }
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

/* ── LOS DOS MODELOS: LA PISTOLA Y EL LADRON ──
   ENTRAN EN DIFERIDO Y NO REEMPLAZAN NADA HASTA QUE LLEGAN: el juego arranca con
   las cajas dibujadas por codigo y la malla las tapa cuando decodifica, asi que
   un base64 roto cuesta una pieza y no una pantalla vacia.
   EL MATERIAL ES PLANO Y CON COLOR POR VERTICE: el color se horneo en los
   vertices al decimar —sin UV el simplificador no tiene costuras que respetar y
   baja hasta donde uno quiera— asi que lo unico que el material aporta es como
   recibe la luz. */
const MOD = { geo: {}, mat: null };

/* ══════════ LA ORIENTACION DE UNA MALLA GENERADA SE MIDE, NO SE SUPONE ══════════
   Y esto costo la vuelta. La pistola volvio con extension [0,192 · 0,677 · 1,000]:
   su eje LARGO es Z y el mas corto es X — o sea el espesor. Escalandola por la X
   contra `M.largo`, el arma salia CINCO VECES mas grande de lo que tenia que ser,
   y como el juego la gira sobre Z el caño apuntaba a la camara: girarla no movia
   la punteria ni un grado. Eso explica de una tres de las cuatro cosas que el
   jugador vio — «el arma deberia ser mas chica», «los modelos estan crasheados» y
   «la mira ni ahi que esta bien calibrada».

   Se resuelve con dos mediciones y ninguna suposicion:
     1. el eje MAS LARGO pasa a ser X, el del medio Y y el mas corto Z, que es la
        proporcion de cualquier pistola (largo > alto > espesor);
     2. y para saber para donde apunta se busca la EMPUÑADURA, que es la masa que
        cuelga por debajo: el lado donde esta la empuñadura es el de atras. */
function orientaArma(geo){
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  const ex = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
  const ord = [0, 1, 2].sort((p, q) => ex[q] - ex[p]);   /* largo, alto, espesor */
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const cen = [(b.min.x + b.max.x)/2, (b.min.y + b.max.y)/2, (b.min.z + b.max.z)/2];
  const gp = (a, i, e) => (e === 0 ? a.getX(i) : e === 1 ? a.getY(i) : a.getZ(i));
  const P0 = new Float32Array(pos.count*3), N0 = new Float32Array(pos.count*3);
  for (let i = 0; i < pos.count; i++)
    for (let e = 0; e < 3; e++){
      P0[i*3 + e] = gp(pos, i, ord[e]) - cen[ord[e]];
      N0[i*3 + e] = nor ? gp(nor, i, ord[e]) : 0;
    }
  /* la empuñadura: el tercio de abajo. Su x media dice de que lado esta la culata */
  let ymin = 1e9, ymax = -1e9;
  for (let i = 0; i < pos.count; i++){ const y = P0[i*3+1]; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  const corte = ymin + (ymax - ymin)*0.33;
  let sx = 0, n = 0;
  for (let i = 0; i < pos.count; i++) if (P0[i*3+1] < corte){ sx += P0[i*3]; n++; }
  if (n > 0 && sx/n > 0)
    for (let i = 0; i < pos.count; i++){
      P0[i*3] = -P0[i*3]; P0[i*3+2] = -P0[i*3+2];
      N0[i*3] = -N0[i*3]; N0[i*3+2] = -N0[i*3+2];
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(P0, 3));
  g.setAttribute('normal', new T.BufferAttribute(N0, 3));
  if (geo.attributes.uv) g.setAttribute('uv', geo.attributes.uv);
  if (geo.index) g.setIndex(geo.index);
  /* y se escala para que el LARGO mida `M.largo`: asi la boca cae en `M.boca`,
     que es de donde sale la bala y donde empieza la linea de la mira */
  const L = ex[ord[0]];
  g.scale(M.largo/L, M.largo/L, M.largo/L);
  g.computeBoundingBox();
  return g;
}
function cargaModelos(){
  if (typeof AS_MOD === 'undefined') return;
  for (const k in AS_MOD){
    try {
      const g = leeGLB(AS_MOD[k]);
      if (g){ MOD.geo[k] = orientaArma(g); ASSETS_LISTOS++; } else ASSETS_FALLADOS++;
    } catch(e){ ASSETS_FALLADOS++; }
  }
  if (MOD.geo.p_pistola && MOD.mat) armaPistola();
}

/* ── LA MALLA GENERADA VIENE EN UNA CAJA DE LADO 2 Y MIRANDO A CUALQUIER LADO ──
   Tripo devuelve el modelo normalizado, o sea de DOS METROS: puesta tal cual, la
   pistola mide siete veces la torre. Se le mide la caja y se la lleva al alto
   que el juego declara, apoyada en el origen y centrada en x y z. */
function ponEscala(geo, alto, centraY, mat){
  const g = new T.Group();
  const m = new T.Mesh(geo, mat || MOD.mat);
  const b = geo.boundingBox;
  const dy = b.max.y - b.min.y;
  const k = alto/Math.max(1e-4, dy);
  m.scale.setScalar(k);
  m.position.set(-(b.min.x + b.max.x)/2*k,
                 centraY ? -(b.min.y + b.max.y)/2*k : -b.min.y*k,
                 -(b.min.z + b.max.z)/2*k);
  g.add(m);
  return g;
}

function tira(g){
  while (g.children.length){
    const o = g.children.pop();
    o.traverse(q => { if (q.isMesh && q.geometry && q.userData.propia) q.geometry.dispose(); });
  }
}

/* ── EL MUNDO TIENE FONDO, Y NO ES ADORNO ──
   Las losas son cajas finas: mirandolas de tres cuartos, detras de ellas no hay
   NADA y la torre se ve flotando en el vacio. Una pared de fondo a −1,2 le da
   interior, que es lo que hace que se lea a edificio. */
function construyeEscena(){
  tira(gMundo);
  const A = M.ancho/2;
  const fg = new T.PlaneGeometry(A*2 + 2, MUNDO.alto + 5);
  if (TEX.p_pared){
    const uv = fg.attributes.uv, rw = (A*2 + 2)/TEX_M.p_pared, rh = (MUNDO.alto + 5)/TEX_M.p_pared;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i)*rw, uv.getY(i)*rh);
  }
  const fondo = new T.Mesh(fg, new T.MeshStandardMaterial({
    color: TEX.p_pared ? 0x8f9db4 : 0x4a5568, roughness: 0.98, map: TEX.p_pared || null }));
  fondo.position.set(0, MUNDO.alto/2, -1.35);
  fondo.receiveShadow = true; fondo.userData.propia = true;
  gMundo.add(fondo);

  const pon = (r, mat, prof) => {
    const met = mat.map ? (TEX_M[Object.keys(TEX).find(q => TEX[q] === mat.map)] || 2) : 0;
    const m = new T.Mesh(met ? cajaUV(r.w, r.h, prof, met) : GEO.caja, mat);
    m.scale.set(r.w, r.h, prof);
    m.position.set(r.x + r.w/2, r.y + r.h/2, 0);
    m.castShadow = m.receiveShadow = CALIDADES[CALIDAD].sombras;
    gMundo.add(m);
    return m;
  };
  for (const r of MUNDO.losas) pon(r, MAT[r.t] || MAT.losa, r.t === 'pared' ? 2.4 : 1.9);
  /* ── LAS TIRAS DE LUZ SON LO QUE HACE QUE ESTO SEA UN INTERIOR ──
     No iluminan —serian una luz por piso y eso es una pasada de sombra por
     piso— pero se ven encendidas y le dan al edificio su unica fuente de color
     calido. Una torre de hormigon gris sin una sola luz se lee a maqueta. */
  for (let p = 1; p <= MUNDO.pisos; p++){
    const y = p*M.piso;
    /* ── Y SON TRES APLIQUES CORTOS, NO UNA BARRA DE PUNTA A PUNTA ──
       Con una tira de 5 metros y color plano brillante, lo mas luminoso del
       cuadro pasaba a ser una raya beige cruzando la pantalla entera: en la
       captura no se leia a iluminacion, se leia a un error de dibujo tapando la
       torre. Tres apliques de medio metro dicen «esto es un techo con luces» y
       dejan de competir con la pistola, que es lo unico que hay que mirar. */
    for (const lx of [-A*0.60, 0, A*0.60]){
      const t = new T.Mesh(GEO.caja, MAT.luz);
      t.scale.set(0.55, 0.045, 0.10);
      t.position.set(lx, y - 0.09, 0.86);
      t.userData.noSom = true;
      gMundo.add(t);
      /* el halo: un plano ancho y tenue debajo del aplique. Es lo que hace que
         la luz se lea a luz y no a una barrita encendida flotando. */
      const h = new T.Mesh(GEO.plano, MAT.halo);
      h.scale.set(1.9, 1.30, 1);
      h.position.set(lx, y - 0.62, 0.78);
      h.userData.noSom = true;
      gMundo.add(h);
    }
    /* y la alfombra de cada piso, que es lo que separa el suelo de la pared */
    const al = new T.Mesh(GEO.caja, MAT.alfom);
    al.scale.set(A*2 - 0.5, 0.04, 1.5);
    al.position.set(0, y + 0.72, 0.1);
    al.receiveShadow = CALIDADES[CALIDAD].sombras;
    gMundo.add(al);
  }
  /* ── LAS COLUMNAS SON LO QUE LE DA VOLUMEN A LA TORRE ──
     Con la camara de tres cuartos, una pared plana y unas losas finas no tienen
     una sola arista vertical que revele la profundidad: la escena se lee a
     recorte. Dos columnas por tramo, adelantadas respecto de la pared, dan la
     arista y ademas proyectan sombra sobre el fondo, que es lo que convierte la
     sombra de una barra en informacion. */
  for (let p = 0; p <= MUNDO.pisos; p++){
    for (const cx of [-A*0.66, A*0.66]){
      const co = new T.Mesh(MAT.col.map ? cajaUV(0.34, M.piso, 0.34, TEX_M.p_losa) : GEO.caja, MAT.col);
      co.scale.set(0.34, M.piso, 0.34);
      co.position.set(cx, p*M.piso + M.piso/2, -0.62);
      co.castShadow = co.receiveShadow = CALIDADES[CALIDAD].sombras;
      gMundo.add(co);
    }
  }
  for (const r of MUNDO.acero) pon(r, MAT.acero, 0.9);
  for (const c of MUNDO.cajas) c.malla = pon(c, MAT.caja, 0.9);

  for (const l of MUNDO.lad) l.g = armaLadron(l);
  armaPistola();
  armaMira();
}

/* ── EL LADRON ES UNA FIGURA, NO UN BULTO CON UN SOMBRERO ──
   La primera version era una caja de 0,52 con una esfera de 0,40 de diametro
   encima y un ala de 0,60 de ancho: en la captura no se leia a persona, se leia
   a hidrante — un cilindro rojo con un bol beige. Lo que hace que una silueta
   de cuarenta pixeles se lea a alguien son tres cosas y ninguna es el detalle:
   que la cabeza mida un septimo del cuerpo, que haya DOS PIERNAS separadas —una
   caja unica se lee a pedestal— y que el antifaz corte la cara en dos. */
/* ── EL LADRON GENERADO SE PROBO Y SE DESCARTO, Y VALE ANOTAR POR QUE ──
   Rezona lo devolvio tal como se lo pidio: gorro negro, antifaz negro y sueter
   azul marino a rayas, 3.383 triangulos. Y a cuarenta pixeles contra una pared
   azul oscura eso es una mancha parda: fotografiado al lado de la version de
   cajas, en la generada no se distingue la cabeza del torso ni se ve para donde
   apunta. Le puse un emisivo calido para levantarle los negros y siguio sin
   leerse.
   La leccion es la de siempre en este repo y no es sobre el generador: lo que
   hace que un personaje exista en una escena monocroma no es el detalle, es que
   su color no este en ninguna otra parte y que su silueta tenga tres bloques
   planos. Un modelo fotorrealista de cuarenta pixeles pierde contra seis cajas.
   El de la PISTOLA si entro, y ahi la comparacion es al reves: la pistola se
   mira de cerca, esta siempre en pantalla y gira entera. */
/* ── LAS CATORCE CAJAS DE UN LADRON SE FUNDEN EN UNA SOLA MALLA ──
   Sueltas, cada caja es una llamada de dibujo: medido en el nivel 10, con
   catorce ladrones en pantalla el cuadro costaba 365 llamadas y casi doscientas
   eran los cuerpos. Ninguna de esas piezas se mueve respecto de las otras —lo
   unico que gira es el brazo del arma— asi que fundirlas no cambia un pixel.
   El color se hornea en los VERTICES, que es lo que permite que las seis
   partes conserven su tono con un solo material. */
const _cajaBase = new T.BoxGeometry(1, 1, 1).toNonIndexed();
function fundeCajas(piezas){
  let n = 0;
  for (const q of piezas) n += _cajaBase.attributes.position.count;
  const pos = new Float32Array(n*3), nor = new Float32Array(n*3), col = new Float32Array(n*3);
  const bp = _cajaBase.attributes.position, bn = _cajaBase.attributes.normal;
  const c = new T.Color();
  let o = 0;
  for (const q of piezas){
    c.copy(q.mat.color);
    for (let i = 0; i < bp.count; i++){
      pos[(o + i)*3    ] = bp.getX(i)*q.w + q.x;
      pos[(o + i)*3 + 1] = bp.getY(i)*q.h + q.y;
      pos[(o + i)*3 + 2] = bp.getZ(i)*q.d + (q.z || 0);
      nor[(o + i)*3] = bn.getX(i); nor[(o + i)*3+1] = bn.getY(i); nor[(o + i)*3+2] = bn.getZ(i);
      col[(o + i)*3] = c.r; col[(o + i)*3+1] = c.g; col[(o + i)*3+2] = c.b;
    }
    o += bp.count;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.BufferAttribute(nor, 3));
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  return g;
}
const MAT_LAD_F = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 });
let _geoLad = null;
function armaLadron(l){
  const g = new T.Group();
  const piezas = [];
  const meter = (mat, w, h, d, x, y, z) => {
    piezas.push({ mat, w, h, d, x, y, z });
    return null;
  };
  /* las dos piernas, separadas: es lo unico que dice que esto camina */
  meter(MAT.gorro, 0.15, 0.46, 0.22, -0.11, 0.23);
  meter(MAT.gorro, 0.15, 0.46, 0.22,  0.11, 0.23);
  meter(MAT.ladZ, 0.34, 0.09, 0.24, 0, 0.50);          /* el cinturon */
  meter(MAT.lad, 0.44, 0.50, 0.28, 0, 0.79);
  /* dos rayas oscuras: un sueter liso a esta escala es un rectangulo */
  meter(MAT.ladZ, 0.455, 0.055, 0.295, 0, 0.72);
  meter(MAT.ladZ, 0.455, 0.055, 0.295, 0, 0.88);
  meter(MAT.lad, 0.11, 0.34, 0.14, -0.27, 0.82);       /* el brazo libre */
  meter(MAT.ladC, 0.20, 0.09, 0.20, 0, 1.08);          /* el cuello */
  meter(MAT.ladC, 0.28, 0.28, 0.26, 0, 1.26);
  /* el antifaz: es lo que lo vuelve un ladron y no un vecino */
  meter(MAT.ladZ, 0.30, 0.085, 0.275, 0, 1.29);
  meter(MAT.gorro, 0.30, 0.15, 0.28, 0, 1.46);
  meter(MAT.ladZ, 0.315, 0.045, 0.295, 0, 1.40);       /* la vuelta del gorro */
  /* la bolsa de plata: cuelga del hombro y es lo unico suyo que no es ropa */
  meter(MAT.bolsa, 0.20, 0.24, 0.16, 0.24, 0.62, 0.14);
  /* el brazo del arma: gira con `l.mira`, que es lo que dice a donde apunta */
  const brazo = new T.Group();
  const b1 = new T.Mesh(GEO.caja, MAT.lad);
  b1.scale.set(0.40, 0.115, 0.115); b1.position.x = 0.20;
  const arma = new T.Mesh(GEO.caja, MAT.arma);
  arma.scale.set(0.22, 0.09, 0.07); arma.position.x = 0.47;
  brazo.add(b1, arma); brazo.position.set(0.10, 0.90, 0.14);
  if (!_geoLad) _geoLad = fundeCajas(piezas);
  const cuerpo = new T.Mesh(_geoLad, MAT_LAD_F);
  g.add(cuerpo);
  g.add(brazo);
  g.traverse(o => { if (o.isMesh) o.castShadow = CALIDADES[CALIDAD].sombras; });
  g.userData.brazo = brazo;
  /* el laser del aviso: una linea fina que solo aparece antes de tirar */
  const lg = new T.BufferGeometry().setFromPoints([new T.Vector3(0,0,0), new T.Vector3(1,0,0)]);
  const laser = new T.Line(lg, new T.LineBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.9 }));
  laser.frustumCulled = false; laser.visible = false;
  brazo.add(laser);
  g.userData.laser = laser;
  g.position.set(l.x, l.y, 0);
  gMundo.add(g);
  return g;
}

/* ── LA PISTOLA VA POR CODIGO Y NO POR SPRITE ──
   Gira entera, se la mira de cerca y es lo unico que esta siempre en pantalla:
   tiene que tener volumen desde cualquier angulo. Siete cajas. */
let gArma = null, gMira = null, gDest = null;
/* ── UN HALO DETRAS DEL ARMA, PORQUE A VEINTE PIXELES NO SE ENCUENTRA ──
   La camara encuadra 5,4 metros de ancho en 412 pixeles: son 76 px por metro, o
   sea que una pistola de tamaño de verdad mide VEINTE PIXELES y ademas es gris
   oscura sobre hormigon oscuro. Medido en la captura de partida, en el borde de
   abajo no se distinguia del piso. Agrandarla arreglaria eso y rompe la escala
   —al lado de un ladron de 1,5 m se leeria a escopeta—, asi que lo que se
   agranda no es el arma: es lo que dice DONDE esta. Un radial aditivo detras no
   tiene borde en ningun lado, o sea que no se lee a objeto. */
function haloArma(){
  const m = new T.Mesh(GEO.plano, MAT.haloArma);
  m.scale.set(1.45, 1.45, 1);
  m.position.z = -0.12;
  m.userData.noSom = true;
  return m;
}

function armaPistola(){
  if (gArma){ gCosas.remove(gArma); }
  if (MOD.geo.p_pistola && MOD.mat){
    /* ya viene orientada, centrada y a escala: el largo del modelo ES `M.largo`,
       asi que la boca cae exactamente en `M.boca` y la linea sale del caño */
    const g = new T.Group();
    const m = new T.Mesh(MOD.geo.p_pistola, MOD.mat);
    m.castShadow = CALIDADES[CALIDAD].sombras;
    g.add(m);
    g.add(haloArma());
    gArma = g; gCosas.add(gArma); return;
  }
  gArma = new T.Group();
  const cuerpo = new T.Mesh(GEO.caja, MAT.arma);
  cuerpo.scale.set(0.44, 0.15, 0.09); cuerpo.position.set(0.02, 0.06, 0);
  const cano = new T.Mesh(GEO.caja, MAT.arma);
  cano.scale.set(0.30, 0.07, 0.06); cano.position.set(0.26, 0.05, 0);
  const corr = new T.Mesh(GEO.caja, MAT.armaB);
  corr.scale.set(0.40, 0.05, 0.10); corr.position.set(0.04, 0.14, 0);
  const puno = new T.Mesh(GEO.caja, MAT.arma);
  puno.scale.set(0.13, 0.26, 0.09); puno.position.set(-0.13, -0.11, 0);
  puno.rotation.z = 0.30;
  const gat = new T.Mesh(GEO.caja, MAT.armaB);
  gat.scale.set(0.05, 0.09, 0.05); gat.position.set(0.02, -0.05, 0);
  const guar = new T.Mesh(GEO.cil, MAT.arma);
  guar.scale.set(0.11, 0.05, 0.11); guar.rotation.x = Math.PI/2;
  guar.position.set(0.03, -0.08, 0);
  const boca = new T.Mesh(GEO.cil, MAT.armaB);
  boca.scale.set(0.035, 0.03, 0.035); boca.rotation.z = Math.PI/2;
  boca.position.set(0.41, 0.05, 0);
  gArma.add(cuerpo, cano, corr, puno, gat, guar, boca);
  gArma.traverse(o => { if (o.isMesh) o.castShadow = CALIDADES[CALIDAD].sombras; });
  gCosas.add(gArma);
}

/* ── LA MIRA ES UNA LINEA QUE SE CORTA DONDE PEGA ──
   Una linea infinita no dice nada: lo que hay que saber es CONTRA QUE va a
   chocar el tiro, y por eso se traza con el mismo rayo que usa la bala. Con dos
   cuentas, la mira prometeria un blanco que la bala no acierta. */
function armaMira(){
  if (gMira) return;
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
  gMira = new T.Line(g, new T.LineDashedMaterial({ color: 0xffe58a, dashSize: 0.22,
                                                   gapSize: 0.16, transparent: true, opacity: 0.85 }));
  gMira.frustumCulled = false; gMira.visible = false;
  gCosas.add(gMira);
  gDest = new T.Mesh(GEO.esf, new T.MeshBasicMaterial({ color: 0xffe58a }));
  gDest.scale.setScalar(0.09); gDest.visible = false;
  gCosas.add(gDest);
}

function ponMira(){
  const ver = J.lento > 0.12 && J.modo === 'juega';
  gMira.visible = ver; gDest.visible = ver;
  if (!ver) return;
  const dx = Math.cos(P.ang), dy = Math.sin(P.ang);
  const x0 = P.x + dx*M.boca, y0 = P.y + dy*M.boca;
  const h = rayo(x0, y0, dx, dy, 26, false);
  const L = h ? h.t : 26;
  const a = gMira.geometry.attributes.position.array;
  a[0] = x0; a[1] = y0; a[2] = 0.16;
  a[3] = x0 + dx*L; a[4] = y0 + dy*L; a[5] = 0.16;
  gMira.geometry.attributes.position.needsUpdate = true;
  gMira.computeLineDistances();
  /* el punto del final se pinta ROJO si lo que hay ahi es un ladron: es la
     unica forma de saber que el tiro entra sin tener que soltarlo */
  gDest.position.set(x0 + dx*L, y0 + dy*L, 0.16);
  gDest.material.color.setHex(h && h.tipo === 'ladron' ? 0xff5a4a : 0xffe58a);
  gDest.scale.setScalar(h && h.tipo === 'ladron' ? 0.15 : 0.09);
}

/* ══════════ BALAS Y CHISPAS ══════════ */
const gBal = [];
function ponBalas(){
  while (gBal.length < BAL.length){
    const m = new T.Mesh(GEO.caja, MAT.bala);
    m.scale.set(0.20, 0.045, 0.045);
    gCosas.add(m); gBal.push(m);
  }
  for (let i = 0; i < gBal.length; i++){
    const b = BAL[i];
    gBal[i].visible = !!b;
    if (!b) continue;
    gBal[i].position.set(b.x, b.y, 0.05);
    gBal[i].rotation.z = Math.atan2(b.dy, b.dx);
    gBal[i].material = b.mia ? MAT.bala : MAT.balaE;
  }
}

const CH = [];
let gCh = null;
function armaChispas(){
  const n = CALIDADES[CALIDAD].part;
  if (gCh) gCosas.remove(gCh);
  gCh = new T.InstancedMesh(GEO.caja, new T.MeshBasicMaterial({ vertexColors: true }), n);
  gCh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n*3), 3);
  gCh.frustumCulled = false;
  gCosas.add(gCh);
  CH.length = 0;
}
function chispas(x, y, n, col){
  const tope = CALIDADES[CALIDAD].part;
  for (let i = 0; i < n && CH.length < tope; i++){
    const a = Math.random()*6.283, v = 1.6 + Math.random()*4.2;
    CH.push({ x, y, z: Math.random()*0.5 - 0.25, vx: Math.cos(a)*v, vy: Math.sin(a)*v,
              t: 0.35 + Math.random()*0.4, c: col });
  }
}
const _m4 = new T.Matrix4(), _c3 = new T.Color();
function pasoChispas(dt){
  for (let i = CH.length - 1; i >= 0; i--){
    const p = CH[i];
    p.t -= dt; if (p.t <= 0){ CH.splice(i, 1); continue; }
    p.vy -= 22*dt; p.x += p.vx*dt; p.y += p.vy*dt;
  }
  if (!gCh) return;
  const n = gCh.count;
  for (let i = 0; i < n; i++){
    const p = CH[i];
    if (!p){ _m4.makeScale(0, 0, 0); gCh.setMatrixAt(i, _m4); continue; }
    const s = 0.055*Math.min(1, p.t*3);
    _m4.makeScale(s, s, s);
    _m4.setPosition(p.x, p.y, p.z);
    gCh.setMatrixAt(i, _m4);
    _c3.setHex(p.c); gCh.setColorAt(i, _c3);
  }
  gCh.instanceMatrix.needsUpdate = true;
  if (gCh.instanceColor) gCh.instanceColor.needsUpdate = true;
}

/* ══════════ EL SACUDON ══════════ */
let SAC = 0;
function sacude(k){ SAC = Math.min(1.4, SAC + k); }

/* ══════════ AUDIO ══════════
   Procedural mientras no haya clips: un juego mudo por un decodificador es peor
   que un juego con bips, y ya paso una vez en Campo de Tiro. */
let AUD = null, MAE = null, RUI = null, MUS = null, MUSK = null;
function armaAudio(){
  if (AUD) return;
  try { AUD = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
  MAE = AUD.createGain(); MAE.gain.value = 0.85; MAE.connect(AUD.destination);
  ANAL = AUD.createAnalyser(); ANAL.fftSize = 1024; MAE.connect(ANAL);
  const n = AUD.sampleRate;
  RUI = AUD.createBuffer(1, n, n);
  const d = RUI.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;
}
let ANAL = null;
function env(g, t0, at, dur, pico){
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(pico, t0 + at);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}
function son(k, vol){
  armaAudio(); if (!AUD) return;
  if (SON[k]){ const s = AUD.createBufferSource(); s.buffer = SON[k];
               const g = AUD.createGain(); g.gain.value = (vol == null ? 1 : vol)*(VOL[k] || 1);
               s.connect(g); g.connect(MAE); s.start(); return; }
  const t = AUD.currentTime, g = AUD.createGain(); g.connect(MAE);
  if (k === 'tiro'){
    const s = AUD.createBufferSource(); s.buffer = RUI; s.loop = true;
    const f = AUD.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.8;
    s.connect(f); f.connect(g); env(g, t, 0.004, 0.16, 0.55); s.start(t); s.stop(t + 0.18);
  } else if (k === 'mata' || k === 'caja'){
    const s = AUD.createBufferSource(); s.buffer = RUI;
    const f = AUD.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.value = k === 'mata' ? 620 : 1600;
    s.connect(f); f.connect(g); env(g, t, 0.006, 0.30, 0.42); s.start(t); s.stop(t + 0.32);
  } else if (k === 'daño' || k === 'pierde'){
    const o = AUD.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(280, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.5);
    o.connect(g); env(g, t, 0.01, 0.55, 0.40); o.start(t); o.stop(t + 0.6);
  } else if (k === 'gana'){
    [523, 659, 784, 1046].forEach((f, i) => {
      const o = AUD.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const gg = AUD.createGain(); gg.connect(MAE); o.connect(gg);
      env(gg, t + i*0.10, 0.01, 0.34, 0.26); o.start(t + i*0.10); o.stop(t + i*0.10 + 0.36);
    });
  } else if (k === 'ladtira'){
    const o = AUD.createOscillator(); o.type = 'square'; o.frequency.value = 190;
    o.connect(g); env(g, t, 0.005, 0.12, 0.20); o.start(t); o.stop(t + 0.14);
  } else if (k === 'clic'){
    const o = AUD.createOscillator(); o.type = 'triangle'; o.frequency.value = 660;
    o.connect(g); env(g, t, 0.004, 0.08, 0.22); o.start(t); o.stop(t + 0.1);
  }
}
const SON = {}, VOL = { tiro: 1, mata: 1, caja: 1, daño: 1, gana: 1,
                        pierde: 1, ladtira: 1, clic: 0.5, mus: 1, menu: 1 };
/* ── LOS CLIPS GENERADOS: LA CLAVE DEL JUEGO Y LA DEL ARCHIVO SON DOS ──
   El juego pide `son('daño')` y el archivo se llama `s_dano`: sin la tabla, un
   clip que existe no suena nunca y eso no falla, se queda callado.
   Y EL NIVEL YA VIENE PUESTO DEL HORNEADO, medido sobre el MP3 escrito, asi que
   `VOL` queda en 1: dos sitios que deciden el mismo volumen se desincronizan. */
const SON_ARCH = { tiro: 's_tiro', mata: 's_mata', caja: 's_caja', ladtira: 's_ladtira',
                   'daño': 's_dano', gana: 's_gana', pierde: 's_pierde',
                   mus: 'm_pistola', menu: 'm_pistola' };
function cargaSonidos(){
  if (typeof AS_SON === 'undefined') return;
  armaAudio(); if (!AUD) return;
  for (const k in SON_ARCH){
    const b64 = AS_SON[SON_ARCH[k]];
    if (!b64) continue;
    const bin = atob(b64), ab = new ArrayBuffer(bin.length), v = new Uint8Array(ab);
    for (let i = 0; i < bin.length; i++) v[i] = bin.charCodeAt(i);
    /* `decodeAudioData` VACIA el buffer que recibe, asi que el mismo ArrayBuffer
       no sirve dos veces: por eso cada clave arma el suyo. */
    AUD.decodeAudioData(ab, (buf) => {
      SON[k] = buf;
      ASSETS_LISTOS++;
      /* si la musica que ya se pidio es esta, arranca ahora: `musQuiere` sale
         sin hacer nada cuando el clip todavia no decodifico, y sin este
         reintento el menu queda mudo para siempre */
      if (MUSK === k){ MUSK = null; musQuiere(k); }
    }, () => { ASSETS_FALLADOS++; });
  }
}
function musQuiere(k){
  if (MUSK === k) return;
  MUSK = k;
  if (!SON[k]) return;
  armaAudio(); if (!AUD) return;
  if (MUS){ try { MUS.s.stop(); } catch(e){} }
  const s = AUD.createBufferSource(); s.buffer = SON[k]; s.loop = true;
  const g = AUD.createGain(); g.gain.value = VOL[k] || 0.26;
  s.connect(g); g.connect(MAE); s.start();
  MUS = { s, g, k };
}
