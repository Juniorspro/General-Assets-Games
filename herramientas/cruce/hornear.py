#!/usr/bin/env python3
"""Hornea los assets de Rezona de CRUCE y escribe partes/i_assets.js.

    python3 herramientas/cruce/hornear.py [carpeta_con_los_glb_y_el_png]

Los crudos NO se versionan: los `task_id` estan en assets/cruce/tareas.json y se
vuelven a traer con `fetch_generated_asset`. Lo que entra al repo es el base64.

── LOS GLB: SE TIRAN DOS DE LAS TRES IMAGENES ──
Tripo devuelve color, metal-rugosidad y normales, 1,2 a 1,8 MB por modelo. Acá
un auto mide sesenta pixeles en pantalla y el juego encima dibuja a un tercio de
resolucion: un mapa de normales no cambia un pixel. Queda el color en JPEG, el
material se reescribe DE CERO —dejar `normalTexture` apuntando a una imagen que
ya no existe es «invalid GLTF» sin decir cual— y el buffer se compacta a las
vistas que usa algun accesor mas la imagen nueva.

── EL TITULO SE RECORTA CON UN RELLENO DESDE EL BORDE ──
El modelo lo devuelve sobre fondo blanco. Un umbral de luminancia NO sirve: las
letras tienen un brillo casi blanco arriba y quedarian agujereadas. El fondo es
lo que se alcanza desde el borde, asi que se rellena desde afuera y lo que no se
alcanzo es logo, este del color que este.
"""
import base64, io, json, os, sys
from collections import deque

from PIL import Image, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas', 'barrio'))
import glb

ENT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/rez_cruce/assets/cruce'
#          nombre       lado del jpeg, calidad, rugosidad
MODELOS = [('carpincho', 512, 84, 0.72), ('auto', 384, 80, 0.42), ('camion', 384, 80, 0.45),
           ('colectivo', 384, 80, 0.45), ('tren', 384, 80, 0.50), ('arbol', 320, 78, 0.88),
           ('camalote', 320, 78, 0.80)]


def hornea_glb(nom, lado, q, rug):
    js, bn = glb.carga(os.path.join(ENT, nom + '-g1.glb'))
    mat = js['materials'][0]
    tex_i = mat['pbrMetallicRoughness']['baseColorTexture']['index']
    bv = js['bufferViews'][js['images'][js['textures'][tex_i]['source']]['bufferView']]
    off = bv.get('byteOffset', 0)
    im = Image.open(io.BytesIO(bn[off:off + bv['byteLength']])).convert('RGB')
    if im.width > lado:
        im = im.resize((lado, int(im.height*lado/im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True); jpg = b.getvalue()
    mat.clear()
    mat.update({'name': nom, 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0},
                'metallicFactor': 0.0, 'roughnessFactor': rug}})
    js['textures'] = [{'source': 0, 'sampler': 0}]
    js['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
    js['images'] = [{'mimeType': 'image/jpeg', 'bufferView': None}]
    usadas = sorted({a['bufferView'] for a in js['accessors']})
    nuevo, mapa, vistas = bytearray(), {}, []
    for i in usadas:
        v0 = js['bufferViews'][i]
        d = bn[v0.get('byteOffset', 0): v0.get('byteOffset', 0) + v0['byteLength']]
        while len(nuevo) % 4: nuevo += b'\x00'
        mapa[i] = len(vistas)
        v = {'buffer': 0, 'byteOffset': len(nuevo), 'byteLength': len(d)}
        if v0.get('byteStride'): v['byteStride'] = v0['byteStride']
        if v0.get('target'): v['target'] = v0['target']
        vistas.append(v); nuevo += d
    while len(nuevo) % 4: nuevo += b'\x00'
    vistas.append({'buffer': 0, 'byteOffset': len(nuevo), 'byteLength': len(jpg)}); nuevo += jpg
    js['images'][0]['bufferView'] = len(vistas) - 1
    for a in js['accessors']: a['bufferView'] = mapa[a['bufferView']]
    js['bufferViews'] = vistas
    js['buffers'] = [{'byteLength': len(nuevo)}]
    for k in ('extensionsUsed', 'extensionsRequired'): js.pop(k, None)
    sal = '/tmp/rez_cruce/%s_h.glb' % nom
    glb.guarda(sal, js, nuevo)
    d = io.open(sal, 'rb').read()
    tri = sum(js['accessors'][p['indices']]['count']//3 for m in js['meshes'] for p in m['primitives'])
    print('%-10s %5d tri  jpeg %dx%d  %6.1f KB' % (nom, tri, im.width, im.height, len(d)/1024))
    return 'data:model/gltf-binary;base64,' + base64.b64encode(d).decode('ascii')


def hornea_titulo(ancho=560):
    im = Image.open(os.path.join(ENT, 'titulo-g1.png')).convert('RGB')
    W, H = im.size
    px = im.load()
    # relleno desde el borde sobre lo casi blanco
    fondo = bytearray(W*H)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            q.append((x, y))
    def blanco(x, y):
        r, g, b = px[x, y]
        return r > 243 and g > 243 and b > 243
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= W or y >= H or fondo[y*W + x] or not blanco(x, y):
            continue
        fondo[y*W + x] = 1
        q.append((x + 1, y)); q.append((x - 1, y)); q.append((x, y + 1)); q.append((x, y - 1))
    alfa = Image.frombytes('L', (W, H), bytes(255 - v*255 for v in fondo))
    # un pixel de difuminado: el contorno del logo es duro y sin esto queda dentado
    alfa = alfa.filter(ImageFilter.GaussianBlur(1.0))
    im.putalpha(alfa)
    caja = im.getbbox()
    im = im.crop(caja)
    k = ancho/im.width
    im = im.resize((ancho, max(1, int(im.height*k))), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=88, method=6); d = b.getvalue()
    print('%-10s recorte %s -> %dx%d  %6.1f KB' % ('titulo', caja, im.width, im.height, len(d)/1024))
    return 'data:image/webp;base64,' + base64.b64encode(d).decode('ascii')


def main():
    A = {}
    for nom, lado, q, rug in MODELOS:
        A[nom] = hornea_glb(nom, lado, q, rug)
    A['titulo'] = hornea_titulo()
    s = ("\n/* ══════════ LOS ASSETS DE REZONA, EN BASE64 ══════════\n"
         "   Lo escribe herramientas/cruce/hornear.py; los task_id estan en\n"
         "   assets/cruce/tareas.json. Nada de esto reemplaza lo dibujado por codigo\n"
         "   hasta que decodifica: un base64 roto cuesta una pieza y no la pantalla. */\n"
         "const ASSETS_B64 = " + json.dumps(A, separators=(',', ':')) + ";\n")
    io.open(os.path.join(AQUI, 'partes', 'i_assets.js'), 'w', encoding='utf8').write(s)
    print('i_assets.js %.1f KB' % (len(s)/1024))

main()
