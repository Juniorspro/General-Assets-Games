# -*- coding: utf-8 -*-
"""El campo del nivel 1: las flores, las mariposas y el pasto.

LAS TRES COSAS QUE ESTABAN MAL, Y NINGUNA SE VE EN UNA CAPTURA SUELTA:

1. LAS 240 FLORES ERAN UNA SOLA GEOMETRIA. Lo unico que cambiaba de una a otra
   era el tinte y la escala uniforme, asi que a dos metros se ve el mismo objeto
   doscientas cuarenta veces. Ahora hay TRES especies con silueta distinta
   —margarita de veintisiete petalos finos, amapola de once anchos y acopados, y
   campanilla de catorce casi verticales— y encima cada instancia lleva escala NO
   uniforme, o sea que ninguna es igual a otra ni dentro de su especie.

2. LAS MARIPOSAS ERAN DOS PETALOS DE COLOR PLANO. Las alas usaban la misma
   `makePetalGeo` que los petalos de las flores con un `MeshStandardMaterial` de
   color liso: a cinco metros son dos manchas. Ahora la silueta del ala vive en
   el ALFA de una foto y el dibujo del ala en su color.

3. EL PASTO SE MORIA A TREINTA METROS. Son nueve parches de 22 m que siguen al
   jugador, y el desvanecido del shader corta en 31,2 m: mas alla de eso el campo
   es la foto del suelo y nada mas. Se sube la densidad y se agrega un ANILLO
   EXTERIOR mas ralo, asi que el pasto llega al doble de distancia sin duplicar
   los triangulos.
"""

# ══════════════════════════════════════════════════════════════════════════════
# EL PETALO: la misma cantidad de triangulos, mucha mas forma
# ══════════════════════════════════════════════════════════════════════════════
# `makePetalGeo` la usan tambien las hojas, las espigas de maiz y —hasta esta
# vuelta— las alas de las mariposas, asi que NO se toca: esta calibrada contra
# todas ellas. La nueva es aparte y sirve solo al campo.
PETALO = r"""
  // Un petalo con forma de petalo: panza corrida, punta afinada con muesca,
  // acanalado que se abre hacia la punta, caida propia y una torsion suave.
  // LA TORSION ES LA QUE IMPIDE QUE VEINTISIETE PETALOS IDENTICOS SE LEAN A
  // RUEDA DENTADA: sin ella el anillo es un poligono regular y el ojo lo cuenta.
  function makePetalGeo2(o) {
    const NU = o.nu || 5, NV = o.nv || 2;
    const len = o.len, wid = o.wid;
    const gordo = o.gordo === undefined ? 0.7 : o.gordo;
    const sesgo = o.sesgo === undefined ? 1.0 : o.sesgo;
    const pos = [], uvs = [], idx = [];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU;
      // el ancho: seno elevado, con `sesgo` corriendo la panza hacia la base o
      // hacia la punta y `punta` afinando el ultimo tramo
      let w = wid * Math.pow(Math.sin(Math.PI * (0.06 + 0.94 * Math.pow(u, sesgo))), gordo);
      if (o.punta) w *= (1 - o.punta * Math.pow(u, 6));
      // arquea hacia arriba y despues cae: un petalo real no es un plano
      const baseY = Math.sin(Math.PI * u * 0.85) * o.arco * len
                  - (o.caida || 0) * len * Math.pow(u, 2.4);
      for (let j = 0; j <= NV; j++) {
        const v = j / NV;
        const t = (v - 0.5) * 2;
        // el acanalado SE ABRE hacia la punta: en la base el petalo esta
        // apretado contra sus vecinos y no puede estar acopado
        const cup = (o.cup || 0) * (0.35 + 0.65 * u);
        let z = u * len;
        // la muesca: la columna del medio de la ultima fila se retrae, y eso
        // convierte una punta en un corazon sin agregar un solo triangulo
        if (o.muesca && i === NU && j === Math.floor(NV / 2)) z -= o.muesca * len;
        pos.push(t * w + (o.torsion || 0) * u * w,
                 baseY + cup * t * t * wid * 0.9,
                 z);
        uvs.push(v, u);
      }
    }
    const row = NV + 1;
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NV; j++) {
        const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
"""

# ══════════════════════════════════════════════════════════════════════════════
# LAS TRES ESPECIES
# ══════════════════════════════════════════════════════════════════════════════
# EL SIGNO DEL `tilt` SE CALCULO, NO SE TANTEO: el petalo crece sobre +Z y el
# Euler es ('YXZ'), asi que Rx(tilt) manda (0,0,1) a (0, -sin tilt, cos tilt) —
# o sea que tilt NEGATIVO levanta el petalo y POSITIVO lo hace caer. Es al revés
# de lo que uno escribiria de memoria, y es lo que separa una margarita de una
# campanilla.
ESPECIES = r"""
  const FLOWER_H = 1.0;      // canonical model height
  const STEM_H = 0.74;

  // el tallo es UNO para las tres especies: lo que distingue una flor de otra a
  // veinte metros es la cabeza, no el tallo, y un tallo por especie serian dos
  // mallas instanciadas mas por trozo para no cambiar un pixel
  const flowerStemGeo = (function () {
    const stem = new THREE.CylinderGeometry(0.026, 0.045, STEM_H, 7, 5);
    stem.translate(0, STEM_H / 2, 0);
    bendGeo(stem, 0.05, 0.022, STEM_H, 0);
    const partes = [stem];
    const leafGeo = makePetalGeo2({ len: 0.28, wid: 0.08, arco: 0.20, cup: -0.22,
                                    caida: 0.10, punta: 0.30, torsion: 0.18 });
    for (let i = 0; i < 4; i++) {
      const l = leafGeo.clone();
      const m = new THREE.Matrix4();
      m.makeRotationFromEuler(new THREE.Euler(0.42 + i * 0.10, i * 1.9, 0, 'YXZ'));
      m.setPosition(0, 0.13 + i * 0.14, 0);
      l.applyMatrix4(m);
      partes.push(l);
    }
    // SEPALOS: cinco lengüetas verdes colgando bajo la cabeza. Son lo que hace
    // que la cabeza salga DEL tallo en vez de estar apoyada encima — sin ellos,
    // vista de costado la flor es un disco flotando sobre un palo.
    for (let i = 0; i < 5; i++) {
      const s = makePetalGeo2({ len: 0.11, wid: 0.045, arco: 0.05, cup: -0.35,
                                caida: 0.30, punta: 0.55, nu: 3 });
      const m = new THREE.Matrix4();
      m.makeRotationFromEuler(new THREE.Euler(1.15, (i / 5) * Math.PI * 2, 0, 'YXZ'));
      m.setPosition(0, STEM_H - 0.012, 0);
      s.applyMatrix4(m);
      partes.push(s);
    }
    return mergeGeos(partes);
  })();

  // Cada especie es una lista de anillos mas el tamaño de su disco. Los
  // triangulos salen PARECIDOS a los del modelo unico que habia —432— porque lo
  // que cambia no es cuantos petalos hay sino como estan hechos: la margarita
  // tiene 27 petalos de 20 triangulos y la amapola 11 de 24.
  const FLOWER_SP = [
    { // 0 · margarita: muchos petalos finos, corona levantada, disco grande
      disco: 0.098, domoY: 0.55, tex: 'a',
      anillos: [
        { n: 11, len: 0.345, wid: 0.050, tilt:  0.16, arco: 0.13, cup: 0.30, caida: 0.06, punta: 0.38, muesca: 0.10, torsion:  0.10, dy: 0.000 },
        { n:  9, len: 0.265, wid: 0.047, tilt: -0.24, arco: 0.17, cup: 0.34, caida: 0.10, punta: 0.38, muesca: 0.08, torsion: -0.12, dy: 0.020 },
        { n:  7, len: 0.180, wid: 0.043, tilt: -0.58, arco: 0.20, cup: 0.44, caida: 0.02, punta: 0.32, torsion:  0.14, dy: 0.040 }
      ]
    },
    { // 1 · amapola: pocos petalos anchos y muy acopados, disco chico
      disco: 0.058, domoY: 0.80, tex: 'b',
      anillos: [
        { n: 6, len: 0.360, wid: 0.150, tilt: -0.42, arco: 0.10, cup: 0.62, caida: 0.03, gordo: 0.52, sesgo: 0.85, muesca: 0.18, torsion: 0.16, dy: 0.000, nv: 3 },
        { n: 5, len: 0.290, wid: 0.125, tilt: -0.78, arco: 0.15, cup: 0.70, caida: 0.05, gordo: 0.52, sesgo: 0.85, muesca: 0.14, torsion: -0.16, dy: 0.030, nv: 3 }
      ]
    },
    { // 2 · campanilla: petalos casi verticales que cierran una copa
      disco: 0.040, domoY: 1.15, tex: 'a',
      anillos: [
        { n: 8, len: 0.320, wid: 0.092, tilt: -1.02, arco: -0.06, cup: 0.85, caida: -0.04, gordo: 0.62, muesca: 0.06, torsion: 0.22, dy: 0.000 },
        { n: 6, len: 0.235, wid: 0.078, tilt: -1.28, arco: -0.02, cup: 0.90, caida: -0.02, gordo: 0.62, torsion: -0.20, dy: 0.030 }
      ]
    }
  ];

  FLOWER_SP.forEach(function (sp) {
    const petalos = [];
    sp.anillos.forEach(function (a, ri) {
      for (let i = 0; i < a.n; i++) {
        const p = makePetalGeo2(a);
        // el medio paso entre anillos: alineados, los petalos del anillo de
        // adentro se esconden EXACTAMENTE detras de los de afuera
        const ang = (i / a.n) * Math.PI * 2 + (ri % 2 ? Math.PI / a.n : 0)
                  + (i * 0.017);            // y un desorden chico por petalo
        const m = new THREE.Matrix4();
        m.makeRotationFromEuler(new THREE.Euler(a.tilt, ang, 0, 'YXZ'));
        m.setPosition(0, STEM_H + a.dy, 0);
        p.applyMatrix4(m);
        petalos.push(p);
      }
    });
    sp.petalGeo = mergeGeos(petalos);

    // el disco: domo achatado, aro y una punta apenas levantada en el medio.
    // Sin la punta el centro es un casquete de esfera y con la foto de
    // florecillas encima se lee a boton de plastico.
    const r = sp.disco;
    // LOS SEGMENTOS SALEN DEL PRESUPUESTO Y NO DEL GUSTO. Con 12x8 de esfera,
    // 5x14 de toro y un cono de 9 el disco costaba 335 triangulos contra los
    // 246 del que habia, y la flor nueva terminaba gastando un 15 % MAS que la
    // vieja — o sea lo contrario de lo que decia este comentario. Con 10x6, 4x10
    // y 7 cuesta 194 y la flor cierra en el mismo presupuesto que antes.
    const domo = new THREE.SphereGeometry(r, 10, 6);
    domo.scale(1, sp.domoY * 0.72, 1);
    domo.translate(0, STEM_H + r * 0.42, 0);
    const aro = new THREE.TorusGeometry(r * 0.96, r * 0.21, 4, 10);
    aro.rotateX(Math.PI / 2);
    aro.translate(0, STEM_H + r * 0.22, 0);
    const punta = new THREE.ConeGeometry(r * 0.45, r * 0.42, 7);
    punta.translate(0, STEM_H + r * 0.72 * sp.domoY + r * 0.10, 0);
    sp.centerGeo = mergeGeos([domo, aro, punta]);
  });

  // los tres nombres que el resto del juego ya usaba (las flores arcoiris
  // cuelgan de ellos) siguen valiendo y apuntan a la margarita
  const flowerParts = { stemGeo: flowerStemGeo,
                        petalGeo: FLOWER_SP[0].petalGeo,
                        centerGeo: FLOWER_SP[0].centerGeo };
"""

# ══════════════════════════════════════════════════════════════════════════════
# LOS MATERIALES
# ══════════════════════════════════════════════════════════════════════════════
# DOS TEXTURAS DE PETALO Y NO UNA, y no cuesta una llamada de dibujo: cada
# especie ya tiene su propia malla instanciada, asi que darle a la amapola otra
# foto es cambiarle el material a una malla que ya existia.
MATERIALES = r"""
  const stemMat = applyFoliageShader(new THREE.MeshStandardMaterial({
    color: 0x4b8a35, roughness: 0.86, metalness: 0, side: THREE.DoubleSide
  }), { amp: 0.06, speed: 1.1, power: 2.0, height: FLOWER_H });

  function nuevoPetalMat(tex) {
    return applyFoliageShader(new THREE.MeshStandardMaterial({
      map: tex, color: 0xffffff, roughness: 0.62, metalness: 0,
      side: THREE.DoubleSide, emissive: 0x1a1018, emissiveIntensity: 0.25
    }), { amp: 0.075, speed: 1.1, power: 2.0, height: FLOWER_H });
  }
  const petalMat = nuevoPetalMat(TEX.petal);
  const petalMatB = nuevoPetalMat(TEX.petal2 || TEX.petal);
  const PETAL_MATS = { a: petalMat, b: petalMatB };

  const centerMat = applyFoliageShader(new THREE.MeshStandardMaterial({
    map: TEX.center, color: 0xffc93c, roughness: 0.78, metalness: 0
  }), { amp: 0.072, speed: 1.1, power: 2.0, height: FLOWER_H });
"""


# ══════════════════════════════════════════════════════════════════════════════
# EL PLANTADO: una especie por trozo, y por eso no cuesta una llamada de dibujo
# ══════════════════════════════════════════════════════════════════════════════
# LA ESPECIE ES DEL TROZO Y NO DE LA FLOR, y las dos razones apuntan al mismo
# lado. La barata: mezclando especies dentro de un trozo hacen falta tres mallas
# instanciadas de petalos y tres de disco por trozo en vez de una y una, o sea
# cuarenta llamadas de dibujo mas para no agregar un triangulo. Y la buena: las
# flores de verdad crecen en manchones de una misma clase, asi que un campo con
# las tres barajadas al azar se lee a jardin de vivero.
#
# Y LOS TROZOS SE PARTEN DE 4x4 A 6x6 justamente por eso: con trozos de sesenta
# metros la esfera envolvente mide cincuenta y tres y el recorte por frustum no
# descarta casi nada —o sea que las cuarenta y ocho mallas se dibujaban casi
# siempre—; con trozos de cuarenta mide treinta y ocho y ahi si recorta, y de
# paso entran tres o cuatro manchones distintos en el mismo cuadro.
PLANTADO = r"""
  const FLOWER_COUNT = Q.flowers;
  const PETAL_TINTS = [0xff7d9b, 0xffb04e, 0xc98cff, 0xff5f6d, 0x86d0ff, 0xfff0b0, 0xff9ad4];
  const flowerObstacles = [];
  const tintColor = new THREE.Color();

  // Scatter uniformly inside the play circle (never in the corners outside it),
  // then bucket the instances into a grid so off-screen chunks can be culled.
  const FGRID = 6;
  const FCELL = (AREA_LIMIT * 2) / FGRID;
  const fCells = [];
  for (let i = 0; i < FGRID * FGRID; i++) fCells.push([]);

  let placed = 0, guard = 0;
  while (placed < FLOWER_COUNT && guard < FLOWER_COUNT * 40) {
    guard++;
    const ang = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (AREA_LIMIT - 8);
    if (r < 15) continue;                       // keep the spawn clearing open
    const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const sc = rand(3.9, 6.1);
    const ci = clamp(Math.floor((x + AREA_LIMIT) / FCELL), 0, FGRID - 1);
    const cj = clamp(Math.floor((z + AREA_LIMIT) / FCELL), 0, FGRID - 1);
    const obs = { x: x, z: z, radius: 0.16 + sc * 0.035 };
    fCells[cj * FGRID + ci].push({
      x: x, z: z, y: terrainH(x, z), s: sc,
      // ESCALA NO UNIFORME: es lo unico gratis que existe contra la sensacion de
      // copia y pega. Con la misma malla, una flor un 14 % mas alta y un 9 % mas
      // angosta que su vecina ya no es la misma flor.
      sx: sc * rand(0.90, 1.10),
      sy: sc * rand(0.86, 1.16),
      rotY: Math.random() * Math.PI * 2,
      tilt: rand(-0.17, 0.17),
      tilt2: rand(-0.17, 0.17),
      tint: placed % PETAL_TINTS.length,
      obs: obs
    });
    flowerObstacles.push(obs);
    placed++;
  }

  const flowerChunks = [];
  const flowerChunkObs = [];
  fCells.forEach((list, idx) => {
    if (!list.length) return;
    const ci = idx % FGRID, cj = Math.floor(idx / FGRID);
    const cx = -AREA_LIMIT + (ci + 0.5) * FCELL;
    const cz = -AREA_LIMIT + (cj + 0.5) * FCELL;
    const rad = FCELL * 0.75 + 8;
    // la especie del manchon sale de un hash de la celda y no de Math.random:
    // tiene que ser la misma cada vez que se entra al nivel, porque si no "el
    // manchon de campanillas del este" deja de querer decir algo
    const sp = FLOWER_SP[Math.floor(hash2(ci * 3.7 + 1.3, cj * 2.9 - 0.7) * 3) % 3];
    const meshes = [
      new THREE.InstancedMesh(shareGeo(flowerStemGeo, rad), stemMat, list.length),
      new THREE.InstancedMesh(shareGeo(sp.petalGeo, rad), PETAL_MATS[sp.tex], list.length),
      new THREE.InstancedMesh(shareGeo(sp.centerGeo, rad), centerMat, list.length)
    ];
    // LA ESPECIE SE ANOTA EN LA MALLA. `shareGeo` devuelve una geometria NUEVA
    // que comparte los atributos —para poder darle su propia esfera envolvente—
    // asi que compararla despues con `sp.petalGeo` da falso y la sonda reportaba
    // cero flores de cada especie sobre un campo lleno de flores.
    meshes[1].userData.esp = FLOWER_SP.indexOf(sp);
    meshes.forEach((m) => {
      m.position.set(cx, 0, cz);
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = true;
      fieldGroup.add(m);
      regDensity(m);
    });
    list.forEach((f, i) => {
      dummy.position.set(f.x - cx, f.y, f.z - cz);
      dummy.rotation.set(f.tilt, f.rotY, f.tilt2);
      dummy.scale.set(f.sx, f.sy, f.sx);
      dummy.updateMatrix();
      meshes[0].setMatrixAt(i, dummy.matrix);
      meshes[1].setMatrixAt(i, dummy.matrix);
      meshes[2].setMatrixAt(i, dummy.matrix);
      // ── EL MISMO DEFECTO DE GAMMA QUE EL PASTO, AHORA EN EL TINTE ──
      // `0xff7d9b` es un rosa fuerte escrito en sRGB, y r128 lo mete al shader
      // como LINEAL: la salida lo codifica y devuelve 255 · 187 · 208, o sea un
      // rosa pálido. Medido en la captura, las cabezas salian casi blancas por
      // mas que la tabla de tintes tenga siete colores vivos. El `offsetHSL` va
      // ANTES de convertir, porque tono y saturacion se piensan en sRGB.
      tintColor.set(PETAL_TINTS[f.tint]);
      // Y SE LES SUBE LA LUZ, porque la tabla de tintes se escribio contra el
      // espacio equivocado: convertidos a lineal tal cual, los siete quedan mas
      // oscuros de lo que se veian —el violeta 0xc98cff pasa de 0,79 a 0,58 de
      // rojo— asi que se compensa en HSL, donde el tono no se mueve.
      tintColor.offsetHSL(rand(-0.03, 0.03), rand(-0.10, 0.06), 0.11 + rand(-0.05, 0.05));
      const discoCol = tintColor.clone().offsetHSL(0, -0.35, 0.18).convertSRGBToLinear();
      meshes[1].setColorAt(i, tintColor.convertSRGBToLinear());
      meshes[2].setColorAt(i, discoCol);
    });
    meshes.forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
    flowerChunks.push(meshes);
    flowerChunkObs.push(list.map((f) => f.obs));
  });
"""

# ══════════════════════════════════════════════════════════════════════════════
# EL PASTO: mas denso, y un anillo exterior para que llegue al doble
# ══════════════════════════════════════════════════════════════════════════════
# EL ANILLO EXTERIOR LLEVA BRIZNAS DE LA MITAD DE TRIANGULOS, y no es una
# economia caprichosa: viven de cuarenta a cincuenta y cinco metros, o sea que
# una brizna entera mide un pixel y medio. Con cuatro triangulos en vez de ocho
# el anillo cuesta lo que un tercio del interior y tapa el doble de superficie.
#
# Y EL DESVANECIDO SE CORRE AL BORDE DE AFUERA. Estaba en 23,1 a 31,2 m, que es
# el borde del 3x3: dejandolo ahi, el anillo nuevo nace ya desvanecido y no se
# ve ni uno. Va en 45 a 54.
PASTO = r"""
  // --- Grass: patches that follow the player, inner 3x3 + outer ring ---
  const GRASS_CELL = 22;
  function nuevaBriznaGeo(SEG) {
    const pos = [], uvs = [], idx = [], col = [];
    const baseW = 0.055, h = 1;
    // ── EL PASTO NUNCA FUE VERDE: ERA PALIDO, Y ES UN DEFECTO DE GAMMA ──
    // `new THREE.Color(0x9dc257)` guarda 0,615 · 0,760 · 0,341 y r128 los usa
    // como LINEALES; la salida los codifica a sRGB y devuelve 204 · 226 · 158,
    // que con el sol encima se va al blanco. Medido en la captura, las briznas
    // salian como tiras de papel. Es el mismo defecto que ya costo una vuelta
    // con los globos verdes de RECREO y con el color por vertice del personaje
    // de BARRIO, y venia de antes de esta vuelta: subir la densidad solo lo
    // hizo visible.
    const c0 = new THREE.Color(0x2c5220).convertSRGBToLinear();
    const c1 = new THREE.Color(0x9dc257).convertSRGBToLinear();
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const w = baseW * (1 - t * 0.9);
      const bend = t * t * 0.16;
      // Y UNA CURVA LATERAL, no solo la caida hacia adelante: una brizna que
      // solo se dobla en un plano se lee a tira de papel. Cuesta cero.
      const lat = Math.sin(t * 2.1) * 0.035;
      const c = c0.clone().lerp(c1, Math.pow(t, 0.7));
      pos.push(-w + lat, t * h, bend, w + lat, t * h, bend);
      uvs.push(0, t, 1, t);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    for (let i = 0; i < SEG; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  const grassGeo = nuevaBriznaGeo(4);
  const grassGeoLejos = nuevaBriznaGeo(2);

  const grassMat = applyFoliageShader(new THREE.MeshStandardMaterial({
    vertexColors: true, side: THREE.DoubleSide, roughness: 0.95, metalness: 0
  }), { amp: 0.14, speed: 2.1, power: 1.5, height: 1.0, fade: true,
        fadeA: GRASS_CELL * 2.05, fadeB: GRASS_CELL * 2.45 });

  const grassPatches = [];
  // el anillo exterior son las celdas del 5x5 que no estan en el 3x3
  const GRASS_CELDAS = [];
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      GRASS_CELDAS.push({ i: i, j: j, lejos: (Math.abs(i) > 1 || Math.abs(j) > 1) });
    }
  }
  GRASS_CELDAS.forEach(function (cel) {
    const n = cel.lejos ? Q.bladesFar : Q.bladesPerPatch;
    const mesh = new THREE.InstancedMesh(
      shareGeo(cel.lejos ? grassGeoLejos : grassGeo, GRASS_CELL * 0.8), grassMat, n);
    mesh.frustumCulled = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const data = [];
    // cluster the blades into tufts so it reads as real grass, not a grid
    let k = 0;
    while (k < n) {
      const cx = rand(-GRASS_CELL / 2, GRASS_CELL / 2);
      const cz = rand(-GRASS_CELL / 2, GRASS_CELL / 2);
      const tuft = 3 + Math.floor(Math.random() * 6);
      for (let t = 0; t < tuft && k < n; t++, k++) {
        data.push({
          x: cx + rand(-0.62, 0.62),
          z: cz + rand(-0.62, 0.62),
          rot: Math.random() * Math.PI * 2,
          tilt: rand(-0.26, 0.26),
          s: rand(0.5, 1.45),
          w: rand(0.7, 1.6)
        });
      }
    }
    // UN TINTE POR BRIZNA, y es lo que separa un cesped de una pradera: con el
    // color solo en los vertices las mil ciento cincuenta briznas del parche
    // son la misma brizna, y el prado se lee a alfombra por muchas que haya.
    // Cuesta un buffer de instancia y ni un triangulo.
    const tinte = new THREE.Color();
    for (let q = 0; q < n; q++) {
      tinte.setHSL(0.24 + rand(-0.045, 0.055), rand(0.30, 0.62), rand(0.34, 0.60));
      mesh.setColorAt(q, tinte.convertSRGBToLinear());
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    fieldGroup.add(mesh);
    regDensity(mesh);
    grassPatches.push({ mesh, data, cel: cel, cx: 9999, cz: 9999 });
  });

  function relocatePatch(p, cx, cz) {
    p.cx = cx; p.cz = cz;
    const ox = cx * GRASS_CELL, oz = cz * GRASS_CELL;
    p.mesh.position.set(ox, 0, oz);
    // per-cell shuffle so the same tuft pattern isn't obvious
    const hx = hash2(cx, cz) * GRASS_CELL;
    const hz = hash2(cz + 7.3, cx - 2.1) * GRASS_CELL;
    for (let i = 0; i < p.data.length; i++) {
      const d = p.data[i];
      const lx = ((d.x + hx + GRASS_CELL * 1.5) % GRASS_CELL) - GRASS_CELL / 2;
      const lz = ((d.z + hz + GRASS_CELL * 1.5) % GRASS_CELL) - GRASS_CELL / 2;
      dummy.position.set(lx, terrainH(ox + lx, oz + lz) - 0.03, lz);
      dummy.rotation.set(d.tilt, d.rot, d.tilt * 0.6);
      dummy.scale.set(d.w, d.s, d.w);
      dummy.updateMatrix();
      p.mesh.setMatrixAt(i, dummy.matrix);
    }
    p.mesh.instanceMatrix.needsUpdate = true;
    // never grow grass past the edge of the map
    p.mesh.visible = Math.hypot(ox, oz) < AREA_LIMIT + GRASS_CELL;
  }

  function updateGrassPatches() {
    const pcx = Math.round(player.position.x / GRASS_CELL);
    const pcz = Math.round(player.position.z / GRASS_CELL);
    for (let k = 0; k < grassPatches.length; k++) {
      const p = grassPatches[k];
      const cx = pcx + p.cel.i, cz = pcz + p.cel.j;
      if (p.cx !== cx || p.cz !== cz) relocatePatch(p, cx, cz);
    }
  }
"""


# ══════════════════════════════════════════════════════════════════════════════
# LAS MARIPOSAS: la silueta del ala vive en el alfa de la foto
# ══════════════════════════════════════════════════════════════════════════════
# EL ALA ES UN CUADRILATERO Y NO UNA MALLA CON FORMA DE ALA. Modelar el contorno
# —dos alas delanteras, dos traseras y las colas del papilio— serian cien
# triangulos por mariposa para dibujar un borde que a cinco metros mide dos
# pixeles. La foto ya trae el contorno en su canal alfa, asi que el ala son dos
# triangulos y el borde es exacto.
#
# VA CON `alphaTest` Y NO CON TRANSPARENCIA, que es la misma leccion que las
# cercas de piquetes de BARRIO: un material transparente NO escribe profundidad,
# asi que dos alas cruzadas se dibujan en el orden equivocado y el ala de atras
# aparece por delante.
#
# Y EL ALETEO VA EN UN PIVOTE. Antes eran dos petalos con `rotation.z` encima de
# un `rotation.y` de media vuelta, o sea dos rotaciones compuestas en un orden
# que hay que adivinar; con un Object3D en el eje del cuerpo y la malla colgada
# de el, "levantar el ala" es UN numero.
MARIPOSAS = r"""
  // --- Butterflies ---
  const butterflies = [];
  {
    // el ala: un cuadrilatero de 2x2 en el plano XZ, el borde de adentro sobre
    // x = 0 (la bisagra, o sea el cuerpo) y la punta en x = 1
    const alaGeo = (function () {
      const pos = [], uvs = [], idx = [];
      for (let i = 0; i <= 2; i++) {
        for (let j = 0; j <= 2; j++) {
          const u = i / 2, v = j / 2;
          // una comba minima hacia arriba: un ala perfectamente plana brilla
          // toda igual y se lee a calcomania
          pos.push(u * 0.36, Math.sin(u * Math.PI) * 0.012, (v - 0.5) * 0.40);
          uvs.push(u, 1 - v);
        }
      }
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const a = i * 3 + j, b = a + 1, c = a + 3, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    })();

    const bodyGeo = new THREE.CylinderGeometry(0.019, 0.010, 0.22, 5);
    bodyGeo.rotateX(Math.PI / 2);
    const cabezaGeo = new THREE.SphereGeometry(0.024, 6, 5);
    cabezaGeo.translate(0, 0.004, 0.105);
    const antGeo = new THREE.CylinderGeometry(0.0035, 0.0015, 0.10, 3);
    antGeo.translate(0, 0.05, 0);
    const cuerpoMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.75 });

    // los colores de respaldo siguen estando: si una foto no decodifica, esa
    // mariposa vuelve a ser de color liso en vez de desaparecer
    const BF_COLORS = [0xffd45e, 0xff8fc4, 0x8ad7ff, 0xfff2d0, 0xc79bff];
    const alaMats = (TEX.bfly && TEX.bfly.length) ? TEX.bfly.map(function (t) {
      return new THREE.MeshStandardMaterial({
        map: t, transparent: false, alphaTest: 0.45, side: THREE.DoubleSide,
        roughness: 0.52, metalness: 0.04, emissive: 0xffffff, emissiveMap: t,
        // 0,38 Y NO 0,12: la mariposa vuela a dos o cinco metros de alto, o sea
        // CONTRA EL CIELO, y ahi el sol le da por atras — medido en la captura,
        // el monarca salia como una silueta negra y el dibujo naranja no se veia.
        // Y no es maquillaje: un ala de mariposa es fina y traslucida, asi que a
        // contraluz se enciende de verdad.
        emissiveIntensity: 0.38
      });
    }) : null;

    for (let i = 0; i < Q.butterflies; i++) {
      const g = new THREE.Group();
      let wm;
      if (alaMats) {
        wm = alaMats[i % alaMats.length];
      } else {
        const col = BF_COLORS[i % BF_COLORS.length];
        wm = new THREE.MeshStandardMaterial({
          color: col, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide,
          emissive: col, emissiveIntensity: 0.15
        });
      }
      // un pivote por ala, en el eje del cuerpo
      const pl = new THREE.Object3D(), pr = new THREE.Object3D();
      const ml = new THREE.Mesh(alaGeo, wm), mr = new THREE.Mesh(alaGeo, wm);
      ml.scale.x = -1;                    // la izquierda es la derecha espejada
      pl.add(ml); pr.add(mr);
      g.add(pl, pr);
      const body = new THREE.Mesh(bodyGeo, cuerpoMat);
      const cab = new THREE.Mesh(cabezaGeo, cuerpoMat);
      g.add(body, cab);
      for (let a = 0; a < 2; a++) {
        const an = new THREE.Mesh(antGeo, cuerpoMat);
        an.position.set(a ? 0.012 : -0.012, 0.012, 0.115);
        an.rotation.set(-0.55, 0, a ? 0.22 : -0.22);
        g.add(an);
      }
      // ARRANCAN SOBRE UNA FLOR Y NO EN UN PUNTO AL AZAR. Es la diferencia entre
      // bichos flotando en un prado vacio y mariposas que estan ahi por algo:
      // se les da como casa la posicion de una flor de verdad.
      let hx, hz;
      if (flowerObstacles.length) {
        const o = flowerObstacles[Math.floor(Math.random() * flowerObstacles.length)];
        hx = o.x; hz = o.z;
      } else {
        const ang = Math.random() * Math.PI * 2, r = rand(18, AREA_LIMIT * 0.8);
        hx = Math.cos(ang) * r; hz = Math.sin(ang) * r;
      }
      g.position.set(hx, 0, hz);
      // ── EL TAMAÑO SE MIDIO EN PANTALLA Y NO SE ELIGIO ──
      // Con el ala de 0,36 el bicho se proyecta en el 2,9 % del ancho a tres
      // metros: veintiseis pixeles, o sea que la foto del ala no se ve y no
      // sirve de nada haberla generado. Y agrandarla no rompe la escala del
      // nivel: LAS FLORES DE ESTE CAMPO MIDEN CINCO METROS, asi que una
      // mariposa de diez centimetros seria invisible al lado de una margarita
      // de la altura de una casa. Queda en poco mas de un metro de punta a
      // punta, con variacion por bicho.
      g.scale.setScalar(rand(1.35, 1.85));
      fieldGroup.add(g);
      butterflies.push({
        g, pl, pr,
        home: new THREE.Vector3(hx, 0, hz),
        rad: rand(2.2, 9), sp: rand(0.3, 0.8), ph: Math.random() * 6.28,
        flap: rand(15, 24), hgt: rand(2.1, 5.2),
        // el aleteo va a rafagas: dos segundos batiendo y uno planeando. Con
        // amplitud constante el bicho se lee a juguete a pila.
        rafaga: rand(2.2, 4.6), rfase: Math.random() * 6.28,
        yaw: 0
      });
    }
  }
"""

# el vuelo: alabeo hacia adentro de la curva, aleteo a rafagas y una subida y
# bajada lenta encima del circulo
VUELO = r"""
    // Butterflies
    for (const b of butterflies) {
      const t = elapsed * b.sp + b.ph;
      const x = b.home.x + Math.cos(t) * b.rad;
      const z = b.home.z + Math.sin(t * 1.3) * b.rad;
      const y = terrainH(x, z) + b.hgt + Math.sin(t * 2.4) * 0.5 + Math.sin(t * 0.37) * 0.9;
      b.g.position.set(x, y, z);
      // el rumbo se saca de para donde se esta MOVIENDO y se suaviza: con
      // `-t + PI/2` el bicho apuntaba a la tangente de un circulo que ya no
      // recorre, porque la z va a otra frecuencia que la x
      const vx = -Math.sin(t) * b.rad, vz = Math.cos(t * 1.3) * 1.3 * b.rad;
      const quiero = Math.atan2(vx, vz);
      let d = quiero - b.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      b.yaw += d * Math.min(1, delta * 6);
      b.g.rotation.y = b.yaw;
      // ALABEO: se tumba hacia adentro de la curva. Es lo unico que hace que
      // girar se lea a volar en vez de a deslizarse.
      b.g.rotation.z = clamp(-d * 1.6, -0.55, 0.55);
      // el aleteo a rafagas, con un piso para que nunca quede clavado
      // ── LAS ALAS NO SE QUEDAN PLANAS, Y ESO SE MIDIO ──
      // Puestas horizontales, con la camara a la misma altura el ala se proyecta
      // en el 0,8 % DEL ALTO: un cuadrilatero visto de canto es una linea. Y una
      // mariposa en vuelo no tiene las alas planas, las lleva en una V profunda.
      // El reposo va levantado 0,62 rad y el aleteo barre de −0,10 a +1,34, asi
      // que desde el costado se ve superficie casi todo el ciclo.
      const fuerza = 0.30 + 0.70 * Math.max(0, Math.sin(elapsed / b.rafaga * 6.28 + b.rfase));
      const flap = 0.62 + Math.sin(elapsed * b.flap + b.ph) * 0.72 * fuerza;
      b.pl.rotation.z = -flap;
      b.pr.rotation.z = flap;
    }
"""
