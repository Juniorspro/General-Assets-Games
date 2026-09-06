/* ---------------------------------------------------------------------------
   Visor de los personajes.

   Lleva un lector de GLB propio en vez de GLTFLoader: los `examples/jsm` de
   three no están en cdnjs, así que traerlo significaba otro origen más. Estos
   GLB son simples —un nodo, una malla, una primitiva— pero traen dos cosas que
   el lector tiene que saber:

     · los atributos vienen ENTRELAZADOS (byteStride 32): posición, normal y uv
       intercalados en el mismo bufferView, no uno detrás del otro;
     · las texturas van por EXT_texture_webp, así que la imagen está en
       `texture.extensions.EXT_texture_webp.source`, no en `texture.source`.

   Si alguno de los dos se ignora, no hay error: sale una malla deformada o
   gris, que es peor que un fallo.
   --------------------------------------------------------------------------- */
import * as THREE from "../vendor/three.module.min.3e690ac7.js";

const TIPOS = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4, MAT4:16 };
const ARRAYS = { 5120:Int8Array, 5121:Uint8Array, 5122:Int16Array,
                 5123:Uint16Array, 5125:Uint32Array, 5126:Float32Array };

function partirGlb(buf) {
  const v = new DataView(buf);
  if (v.getUint32(0, true) !== 0x46546C67) throw new Error("no es un GLB");
  let off = 12, json = null, bin = null;
  while (off < buf.byteLength) {
    const largo = v.getUint32(off, true), tipo = v.getUint32(off + 4, true);
    off += 8;
    if (tipo === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off, largo)));
    if (tipo === 0x004E4942) bin = buf.slice(off, off + largo);
    off += largo + (largo % 4 ? 4 - largo % 4 : 0);
  }
  return { json, bin };
}

function leerAccessor(g, bin, i) {
  const a = g.accessors[i], vista = g.bufferViews[a.bufferView];
  const Arr = ARRAYS[a.componentType], piezas = TIPOS[a.type];
  const base = (vista.byteOffset || 0) + (a.byteOffset || 0);
  const paso = vista.byteStride;
  if (!paso || paso === piezas * Arr.BYTES_PER_ELEMENT) {
    return new Arr(bin, base, a.count * piezas);          // apretado
  }
  const salida = new Arr(a.count * piezas);               // entrelazado: desentrelazar
  const saltos = paso / Arr.BYTES_PER_ELEMENT;
  const todo = new Arr(bin, base, (a.count - 1) * saltos + piezas);
  for (let n = 0; n < a.count; n++)
    for (let p = 0; p < piezas; p++) salida[n * piezas + p] = todo[n * saltos + p];
  return salida;
}

async function leerImagen(g, bin, i) {
  const im = g.images[i], vista = g.bufferViews[im.bufferView];
  const trozo = new Uint8Array(bin, vista.byteOffset || 0, vista.byteLength);
  const mapa = new THREE.Texture(await createImageBitmap(new Blob([trozo], { type: im.mimeType })));
  mapa.flipY = false;                 // glTF ya trae las uv al derecho
  mapa.needsUpdate = true;
  return mapa;
}

function fuenteDe(tex) {                // EXT_texture_webp o el campo normal
  return tex.extensions?.EXT_texture_webp?.source ?? tex.source;
}

export async function cargarGlb(url) {
  const { json: g, bin } = partirGlb(await (await fetch(url)).arrayBuffer());
  const grupo = new THREE.Group();
  for (const nodo of g.nodes) {
    if (nodo.mesh == null) continue;
    for (const prim of g.meshes[nodo.mesh].primitives) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(leerAccessor(g, bin, prim.attributes.POSITION), 3));
      if (prim.attributes.NORMAL != null)
        geo.setAttribute("normal", new THREE.BufferAttribute(leerAccessor(g, bin, prim.attributes.NORMAL), 3));
      if (prim.attributes.TEXCOORD_0 != null)
        geo.setAttribute("uv", new THREE.BufferAttribute(leerAccessor(g, bin, prim.attributes.TEXCOORD_0), 2));
      if (prim.indices != null)
        geo.setIndex(new THREE.BufferAttribute(leerAccessor(g, bin, prim.indices), 1));

      const mat = new THREE.MeshStandardMaterial({ roughness: .45, metalness: .05 });
      const def = g.materials?.[prim.material];
      const pbr = def?.pbrMetallicRoughness;
      if (pbr?.baseColorTexture) {
        mat.map = await leerImagen(g, bin, fuenteDe(g.textures[pbr.baseColorTexture.index]));
        mat.map.colorSpace = THREE.SRGBColorSpace;
      }
      if (pbr?.metallicRoughnessTexture) {
        const t = await leerImagen(g, bin, fuenteDe(g.textures[pbr.metallicRoughnessTexture.index]));
        mat.roughnessMap = t; mat.metalnessMap = t; mat.roughness = 1; mat.metalness = 1;
      }
      if (def?.normalTexture)
        mat.normalMap = await leerImagen(g, bin, fuenteDe(g.textures[def.normalTexture.index]));
      grupo.add(new THREE.Mesh(geo, mat));
    }
    if (nodo.matrix) grupo.applyMatrix4(new THREE.Matrix4().fromArray(nodo.matrix));
  }
  return grupo;
}

/* Tripo ignora las medidas que le pidas, así que el encuadre se hace acá:
   se mide la caja, se lleva el centro al origen y se normaliza el lado mayor. */
export function encuadrar(obj, lado = 1.25) {
  const caja = new THREE.Box3().setFromObject(obj);
  const medio = caja.getCenter(new THREE.Vector3());
  const tam = caja.getSize(new THREE.Vector3());
  const e = lado / Math.max(tam.x, tam.y, tam.z);
  obj.position.sub(medio); obj.scale.setScalar(e);
  const envoltorio = new THREE.Group(); envoltorio.add(obj);
  return envoltorio;
}
