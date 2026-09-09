/* ══════════════════════════════════════════════════════════════════════════
   LA VEGETACIÓN — 24 mallas instanciadas y ni una más
   ══════════════════════════════════════════════════════════════════════════
   Cada planta suelta sería una llamada de dibujo, y hay unas cuatro mil. Con
   una malla instanciada por variante son VEINTICUATRO, haya cien o cinco mil.
   Y el ancho de cada quad sale de `SPR_MAN[].prop`, o sea de la proporción
   MEDIDA del recorte: con un ancho fijo, un helecho ancho y un tallo fino
   salen los dos del mismo ancho y el dibujo aparece estirado.              */

let VEG = [];                 // [{malla, m4:[], fam, fina}]
let VEG_FRAC = 1;
const VEG_ARRIBA = ['arboles', 'ruinas'];   // los que además FRENAN: nunca se ralean

/* el quad: pivote ABAJO, así plantarlo es poner su base en el terreno y no
   hay que restarle media altura en cada sitio que lo use */
function vegGeo() {
  const g = new THREE.PlaneGeometry(1, 1, 1, 1);
  g.translate(0, 0.5, 0);
  /* OCLUSIÓN FALSA EN LOS VÉRTICES: la base más oscura que la punta. Es lo
     que de verdad hace que una mata se lea a mata; una iluminación Lambert
     sobre un plano da un color parejo y el arbusto queda de cartulina.     */
  const col = new Float32Array([0.99, 0.99, 0.99, 0.99, 0.99, 0.99,
                                0.52, 0.52, 0.52, 0.52, 0.52, 0.52]);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/* EL BILLBOARD SE HACE EN EL SHADER Y NO EN JAVASCRIPT. Girando las matrices
   por cuadro habría que reescribir cuatro mil matrices sesenta veces por
   segundo; acá la matriz se escribe UNA vez al sembrar y no se toca nunca.
   Es cilíndrico —gira sólo sobre la vertical— porque un billboard esférico
   hace que un árbol se recueste cuando uno mira para abajo.                */
function vegParche(mat) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec3 iPos = instanceMatrix[3].xyz;
      float sAn = length(instanceMatrix[0].xyz);
      float sAl = length(instanceMatrix[1].xyz);
      vec3 der = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]));
      vec3 wp = iPos + der * (position.x * sAn) + vec3(0.0, position.y * sAl, 0.0);
      vec4 mvPosition = viewMatrix * modelMatrix * vec4(wp, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      `
    );
  };
  /* dos materiales con el mismo parche comparten programa sólo si comparten
     esta clave; sin ella three.js compila veinticuatro programas iguales */
  mat.customProgramCacheKey = () => 'vegBillboard';
  return mat;
}

function armaVegetacion(mundo) {
  vegLimpia();
  const geo = vegGeo();
  const porVar = {};            // clave del sprite -> lista de instancias

  for (const c of mundo.cosas) {
    const man = SPR_MAN[c.t]; if (!man) continue;
    const p = man[c.v % man.length];
    (porVar[p.k] = porVar[p.k] || []).push({ c, p });
  }

  const az = semilla(mundo.sem ^ 0x1D7C);
  for (const k in porVar) {
    const lista = porVar[k];
    const fam = k.replace(/\d+$/, '');
    const fina = VEG_ARRIBA.indexOf(fam) < 0;
    /* EL RALEO TIENE QUE SER PAREJO EN EL MAPA. `siembra()` devuelve en orden
       de reja, así que cortar la cola corta una ESQUINA del mundo: en calidad
       baja se veía un cuarto del bosque vacío. Con un rango al azar estable
       por instancia, bajar `count` saca una de cada tantas en todos lados. */
    if (fina) lista.sort(() => az() - 0.5);

    const mat = vegParche(new THREE.MeshBasicMaterial({
      map: MAT_SPR[k] ? MAT_SPR[k].map : null,
      alphaTest: 0.42, side: THREE.DoubleSide, transparent: false,
      vertexColors: true, fog: true, toneMapped: true,
    }));
    /* el material del sprite puede cambiar de mapa cuando la foto decodifica:
       este material tiene que enterarse, así que se lo engancha al de origen */
    if (MAT_SPR[k]) vegSigue(MAT_SPR[k], mat);

    const im = new THREE.InstancedMesh(geo, mat, lista.length);
    im.castShadow = false;    // un billboard proyecta la sombra del QUAD, no
    im.receiveShadow = false; // la del dibujo: la pasada de sombra usa otro
    im.frustumCulled = false; // material y no lleva este parche
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(lista.length * 3), 3);

    const M = new THREE.Matrix4(), col = new THREE.Color();
    lista.forEach((it, i) => {
      const { c, p } = it;
      const y = H(c.x, c.z);
      const al = c.esc, an = c.esc * p.prop;   // el ancho sale de la proporción medida
      M.makeScale(an, al, 1); M.setPosition(c.x, y, c.z);
      im.setMatrixAt(i, M);
      /* el tinte de zona va HORNEADO en la instancia: es un dato de la
         posición y no cambia nunca, así que calcularlo por cuadro sería
         trabajo puro. Más una variación por planta, porque cuatro variantes
         del mismo verde repetidas mil veces se leen a copia y pega. */
      const Z = ZONAS[zonaDe(c.x, c.z)];
      col.setHex(Z.luz);
      const v = 0.74 + ((c.x * 7919 + c.z * 104729) % 1000) / 1000 * 0.34;
      col.multiplyScalar(v * 0.92);
      im.setColorAt(i, col);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    esc.add(im);
    VEG.push({ malla: im, n: lista.length, fina });
  }
  vegCalidad(VEG_FRAC);
}

/* cuando la foto de un sprite llega, el material del billboard tiene que
   cambiar de mapa también: si no, la vegetación se queda con la silueta
   dibujada para siempre y el asset generado no se usa nunca */
const VEG_SIGUE = [];
function vegSigue(origen, destino) {
  VEG_SIGUE.push({ origen, destino, mapa: origen.map });
}
function vegRevisaMapas() {
  for (const s of VEG_SIGUE) {
    if (s.origen.map !== s.mapa) {
      s.mapa = s.origen.map;
      s.destino.map = s.mapa;
      s.destino.needsUpdate = true;
    }
  }
}

function vegCalidad(f) {
  VEG_FRAC = f;
  for (const v of VEG) v.malla.count = v.fina ? Math.max(1, Math.round(v.n * f)) : v.n;
}

function vegLimpia() {
  for (const v of VEG) { esc.remove(v.malla); v.malla.dispose(); v.malla.material.dispose(); }
  VEG = []; VEG_SIGUE.length = 0;
}

/* ── EL SUELO ──────────────────────────────────────────────────────────────
   Una malla por zona, recortada al anillo que le toca, con las UV EN METROS
   —regla 6 del horneado: la repetición sale de cuántos metros cubre la foto,
   no de un número elegido a ojo—.                                          */
let SUELO = [], SUELO_SEG = 84;

function armaSuelo() {
  for (const s of SUELO) { esc.remove(s); s.geometry.dispose(); }
  SUELO = [];
  const R = MUNDO_R, n = SUELO_SEG, paso = (R * 2) / n;
  /* una malla por zona y no una sola con tres materiales: con grupos, cada
     grupo es igual una llamada de dibujo, y así además cada zona puede tener
     su propia repetición sin pelearse por las mismas UV                     */
  ZONAS.forEach((Z, zi) => {
    const pos = [], uv = [], nor = [], idx = [];
    const mapa = new Map();
    const dame = (i, j) => {
      const k = i * 1000 + j;
      if (mapa.has(k)) return mapa.get(k);
      const x = -R + i * paso, z = -R + j * paso, y = H(x, z);
      const v = pos.length / 3;
      pos.push(x, y, z);
      const rep = 1 / (SUELO_M[Z.suelo] || 2.5);
      uv.push(x * rep, z * rep);
      const e = 0.6;
      const nx = H(x - e, z) - H(x + e, z), nz = H(x, z - e) - H(x, z + e);
      const l = Math.hypot(nx, 2 * e, nz);
      nor.push(nx / l, 2 * e / l, nz / l);
      mapa.set(k, v); return v;
    };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const cx = -R + (i + 0.5) * paso, cz = -R + (j + 0.5) * paso;
      if (largo2(cx, cz) > R + paso) continue;
      if (zonaDe(cx, cz) !== zi) continue;
      const a = dame(i, j), b = dame(i + 1, j), c = dame(i + 1, j + 1), d = dame(i, j + 1);
      idx.push(a, d, b, b, d, c);
    }
    if (!idx.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, MAT_SUELO[Z.suelo]);
    m.receiveShadow = true; m.frustumCulled = false;
    esc.add(m); SUELO.push(m);
  });
}
