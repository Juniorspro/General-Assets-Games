#!/usr/bin/env python3
"""Hornea los assets de Rezona de DESPEGUE y escribe partes/i_assets.js.

    python3 herramientas/despegue/hornear.py [carpeta_con_los_glb_y_png]

Los crudos NO se versionan (los task_id estan en assets/despegue/tareas.json y
se vuelven a traer con fetch_generated_asset). Lo que entra al repo es este
archivo de base64.

── LOS GLB: SE TIRAN DOS DE LAS TRES IMAGENES ──
Tripo devuelve color, metal-rugosidad y normales, 1,6 a 2,6 MB por modelo.
Estos objetos se ven a diez o veinte pixeles de alto —los arboles— o a unos
cien —el cohete—, y ahi un mapa de normales no cambia un pixel. Queda el color
a 512 (cohete) o 384 (arboles) en JPEG, y el material se LIMPIA ENTERO: dejar
`normalTexture` apuntando a una imagen que ya no existe es «invalid GLTF» sin
decir cual (regla de PISTOLA). El buffer se compacta: solo quedan las vistas
que usa algun accesor mas la imagen nueva.

── LAS IMAGENES: WEBP ──
Los cielos van a 512×917 y los planetas a 1024×512. Son fondos: a la
resolucion del juego (350×758 en media) un cielo de 512 de ancho sobra.
"""
import base64, io, json, os, struct, sys

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas', 'barrio'))
import glb

ENT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/rez_desp/assets/despegue'
MODELOS = [('cohete', 512, 82), ('pino', 384, 74), ('roble', 384, 74), ('cipres', 384, 74)]
CIELOS = ['cielo_dia', 'cielo_alto', 'cielo_estratosfera', 'cielo_espacio', 'cielo_profundo']
PLANETAS = ['tierra', 'luna', 'marte']


def hornea_glb(nom, lado, q):
    js, bn = glb.carga(os.path.join(ENT, nom + '-g1.glb'))
    mat = js['materials'][0]
    pbr = mat['pbrMetallicRoughness']
    tex_i = pbr['baseColorTexture']['index']
    img_i = js['textures'][tex_i]['source']
    bv_img = js['bufferViews'][js['images'][img_i]['bufferView']]
    raw = bn[bv_img.get('byteOffset', 0): bv_img.get('byteOffset', 0) + bv_img['byteLength']]
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    if im.width > lado: im = im.resize((lado, int(im.height*lado/im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True); jpg = b.getvalue()
    # el material limpio: color, sin metal, rugosidad alta salvo el cohete
    mat.clear()
    mat.update({ 'pbrMetallicRoughness': { 'baseColorTexture': { 'index': 0 }, 'metallicFactor': 0.0, 'roughnessFactor': 0.55 if nom == 'cohete' else 0.9 },
                 'doubleSide': False })
    if nom == 'cohete': mat['name'] = 'cohete'
    js['textures'] = [{ 'source': 0, 'sampler': 0 }]
    js['samplers'] = [{ 'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497 }]
    js['images'] = [{ 'mimeType': 'image/jpeg', 'bufferView': None }]
    # compactar: solo las vistas que usan los accesores, mas la imagen
    usadas = sorted({ a['bufferView'] for a in js['accessors'] })
    nuevo, mapa, vistas = bytearray(), {}, []
    for i in usadas:
        bv = js['bufferViews'][i]
        off = bv.get('byteOffset', 0); d = bn[off: off + bv['byteLength']]
        while len(nuevo) % 4: nuevo += b'\x00'
        mapa[i] = len(vistas)
        v = { 'buffer': 0, 'byteOffset': len(nuevo), 'byteLength': len(d) }
        if bv.get('byteStride'): v['byteStride'] = bv['byteStride']
        if bv.get('target'): v['target'] = bv['target']
        vistas.append(v); nuevo += d
    while len(nuevo) % 4: nuevo += b'\x00'
    vistas.append({ 'buffer': 0, 'byteOffset': len(nuevo), 'byteLength': len(jpg) }); nuevo += jpg
    js['images'][0]['bufferView'] = len(vistas) - 1
    for a in js['accessors']: a['bufferView'] = mapa[a['bufferView']]
    js['bufferViews'] = vistas
    js['buffers'] = [{ 'byteLength': len(nuevo) }]
    for k in ('extensionsUsed', 'extensionsRequired'): js.pop(k, None)
    sal = '/tmp/rez_desp/%s_h.glb' % nom
    glb.guarda(sal, js, nuevo)
    d = io.open(sal, 'rb').read()
    tri = sum(js['accessors'][p['indices']]['count']//3 for m in js['meshes'] for p in m['primitives'])
    print('%-8s %6d tri  jpeg %dx%d  %6.1f KB' % (nom, tri, im.width, im.height, len(d)/1024))
    return 'data:model/gltf-binary;base64,' + base64.b64encode(d).decode('ascii')


def hornea_img(nom, w, h, q):
    im = Image.open(os.path.join(ENT, nom + '-g1.png')).convert('RGB').resize((w, h), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); d = b.getvalue()
    print('%-20s %dx%d  %6.1f KB' % (nom, w, h, len(d)/1024))
    return 'data:image/webp;base64,' + base64.b64encode(d).decode('ascii')


def main():
    A = {}
    for nom, lado, q in MODELOS: A[nom] = hornea_glb(nom, lado, q)
    for nom in CIELOS: A[nom] = hornea_img(nom, 512, 917, 78)
    for nom in PLANETAS: A[nom] = hornea_img(nom, 1024, 512, 80)
    s = ("\n/* ══════════ LOS ASSETS DE REZONA, EN BASE64 ══════════\n"
         "   Lo escribe herramientas/despegue/hornear.py; los task_id estan en\n"
         "   assets/despegue/tareas.json. Nada de esto reemplaza lo dibujado por codigo\n"
         "   hasta que decodifica: un base64 roto cuesta una pieza y no la pantalla. */\n"
         "const ASSETS_B64 = " + json.dumps(A, separators=(',', ':')) + ";\n")
    io.open(os.path.join(AQUI, 'partes', 'i_assets.js'), 'w', encoding='utf8').write(s)
    print('i_assets.js %.1f KB' % (len(s)/1024))

main()
