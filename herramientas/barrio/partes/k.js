
/* ══════════════════════ EL PERSONAJE: LEER EL GLB ══════════════════════
   Un lector de GLB de ciento veinte líneas, y no `GLTFLoader`.

   POR QUÉ: este juego depende de que llegue `three` y de nada más. El cargador
   de three.js es otra descarga de un CDN que puede no llegar, más una entrada
   en el importmap, para leer un archivo que generamos NOSOTROS con
   `herramientas/barrio/hornear_pj.py` y cuya forma controlamos entera —una
   malla, una piel, sin texturas, sin extensiones—. Es la misma decisión que en
   LEMI con los dos props, y acá pesa más todavía porque el personaje es lo
   único del juego que no está dibujado por código.

   Y NO REEMPLAZA NADA HASTA QUE LLEGA: el base64 se decodifica en diferido, así
   que si el archivo estuviera roto el juego arranca igual y lo único que falta
   es el personaje. */

const B64 = (s) => {
  const b = atob(s), n = b.length, a = new Uint8Array(n);
  for (let i = 0; i < n; i++) a[i] = b.charCodeAt(i);
  return a.buffer;
};

const GLB_TAM = { 5120:1, 5121:1, 5122:2, 5123:2, 5125:4, 5126:4 };
const GLB_COMP = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT4:16 };
const GLB_ARR = { 5120:Int8Array, 5121:Uint8Array, 5122:Int16Array,
                  5123:Uint16Array, 5125:Uint32Array, 5126:Float32Array };

function leeGLB(buf){
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('no es GLB');
  const largo = dv.getUint32(8, true);
  let i = 12, js = null, bin = null;
  while (i < largo){
    const n = dv.getUint32(i, true), t = dv.getUint32(i+4, true);
    if (t === 0x4E4F534A) js = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, i+8, n)));
    else if (t === 0x004E4942) bin = { off: i+8, len: n };
    i += 8 + n + ((4 - n % 4) % 4);
  }
  /* EL PASO HAY QUE RESPETARLO. Un `bufferView` con `byteStride` intercala
     varios atributos en el mismo bloque; leerlo de corrido devuelve los tres
     entreverados, y eso no falla — dibuja un montón de triángulos que apuntan a
     cualquier lado. */
  const acc = (k) => {
    const a = js.accessors[k], C = GLB_ARR[a.componentType];
    const nc = GLB_COMP[a.type], anch = GLB_TAM[a.componentType] * nc;
    const bv = js.bufferViews[a.bufferView];
    const base = bin.off + (bv.byteOffset || 0) + (a.byteOffset || 0);
    const paso = bv.byteStride || anch;
    let out;
    if (paso === anch) out = new C(buf.slice(base, base + anch * a.count));
    else {
      out = new C(a.count * nc);
      for (let q = 0; q < a.count; q++)
        out.set(new C(buf.slice(base + q*paso, base + q*paso + anch)), q*nc);
    }
    return out;
  };
  return { js, acc };
}

/* ── DE glTF A UN `SkinnedMesh` ──
   glTF guarda el esqueleto como nodos sueltos con su padre; three.js lo quiere
   como `Bone` encadenados más una `Skeleton` con las matrices de bind. */
function armaPersonaje(buf, mat){
  const { js, acc } = leeGLB(buf);
  const pr = js.meshes[0].primitives[0];
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(acc(pr.attributes.POSITION), 3));
  if (pr.attributes.NORMAL){
    const n = acc(pr.attributes.NORMAL);
    g.setAttribute('normal', new T.BufferAttribute(n, 3,
      !(n instanceof Float32Array)));
  }
  if (pr.attributes.COLOR_0){
    const c = acc(pr.attributes.COLOR_0);
    const nc = GLB_COMP[js.accessors[pr.attributes.COLOR_0].type];
    g.setAttribute('color', new T.BufferAttribute(c, nc, !(c instanceof Float32Array)));
  }
  if (pr.attributes.JOINTS_0)
    g.setAttribute('skinIndex', new T.BufferAttribute(acc(pr.attributes.JOINTS_0), 4));
  if (pr.attributes.WEIGHTS_0){
    const w = acc(pr.attributes.WEIGHTS_0);
    g.setAttribute('skinWeight', new T.BufferAttribute(w, 4, !(w instanceof Float32Array)));
  }
  g.setIndex(new T.BufferAttribute(acc(pr.indices), 1));
  g.computeBoundingSphere();

  const piel = js.skins[0];
  const huesos = [], porNodo = new Map();
  piel.joints.forEach((j, k) => {
    const n = js.nodes[j];
    const b = new T.Bone();
    b.name = n.name || ('hueso' + j);
    if (n.translation) b.position.fromArray(n.translation);
    if (n.rotation) b.quaternion.fromArray(n.rotation);
    if (n.scale) b.scale.fromArray(n.scale);
    huesos.push(b); porNodo.set(j, k);
  });
  /* LA JERARQUÍA SE ARMA POR EL ÍNDICE DE NODO Y NO POR EL DE HUESO: son dos
     numeraciones distintas y confundirlas arma un esqueleto que se parece al
     bueno pero con dos ramas cambiadas. */
  let raiz = null;
  piel.joints.forEach((j, k) => {
    let p = null;
    for (let q = 0; q < js.nodes.length; q++)
      if ((js.nodes[q].children || []).indexOf(j) >= 0){ p = q; break; }
    if (p !== null && porNodo.has(p)) huesos[porNodo.get(p)].add(huesos[k]);
    else raiz = huesos[k];
  });
  const inv = [];
  if (piel.inverseBindMatrices !== undefined){
    const m = acc(piel.inverseBindMatrices);
    for (let k = 0; k < huesos.length; k++)
      inv.push(new T.Matrix4().fromArray(m, k*16));
  }
  const malla = new T.SkinnedMesh(g, mat);
  malla.add(raiz);
  malla.bind(new T.Skeleton(huesos, inv.length ? inv : undefined));
  /* el frustum se calcula con la caja del bind, y un personaje animado se sale
     de ella: recortarlo es hacerlo desaparecer justo cuando se mueve */
  malla.frustumCulled = false;
  const idx = {};
  for (const b of huesos) idx[b.name] = b;
  return { malla, huesos, raiz, idx,
           tri: js.accessors[pr.indices].count / 3,
           vert: js.accessors[pr.attributes.POSITION].count };
}
