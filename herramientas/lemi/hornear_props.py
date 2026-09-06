#!/usr/bin/env python3
"""Hornea los dos props 3D —la antorcha y el inflador— y escribe partes/p.js.

    python3 herramientas/lemi/hornear_props.py

DE DÓNDE SALEN: una imagen generada con Higgsfield (`z_image`, un objeto solo
sobre fondo blanco) pasada por `image_to_3d` con texturizado. Tripo devuelve
30.000 triángulos y un JPEG de 2,5 MB por pieza — cuatro megas por un palo con
un trapo—, así que hay tres pasos y cada uno resuelve un problema distinto:

1. LA TEXTURA SE HORNEA EN LOS VÉRTICES, y ése es el paso que hace posible todo
   lo demás. Decimando con la textura puesta, el simplificador tiene que
   respetar las COSTURAS DE UV y se planta: medido, 30.673 → 11.184 triángulos
   con `-si` a cualquier valor entre 0,04 y 0,20, o sea que el parámetro no hace
   nada. Sin UV no hay costuras y baja hasta donde uno quiera. Y de paso se van
   los 2,5 MB del JPEG: el color pasa a ser cuatro bytes por vértice.

   SE CONVIERTE DE sRGB A LINEAL AL MUESTREAR. glTF trata `COLOR_0` como lineal
   y una textura de color como sRGB; copiando el píxel tal cual, todo sale
   lavado. Es la misma trampa que ya costó una vuelta con `setRGB` en Eco.

2. DECIMAR CON gltfpack Y CON `-sa`. A 2.900 triángulos las dos piezas siguen
   leyéndose enteras —el trapo enrollado de la antorcha, y del inflador la base,
   el cilindro, el manómetro, la manija en T y la manguera—. A 1.100, que fue el
   primer intento, el trapo desaparece.
   Y VA CON `-noq`: la cuantización de gltfpack entra como
   `KHR_mesh_quantization` en `extensionsRequired`, y un cargador que no la
   soporte no muestra NADA. Es la lección que costó una vuelta en el visor 3D.

3. Y EL RESULTADO LO LEE UN LECTOR DE GLB DE CUARENTA LÍNEAS, no `GLTFLoader`.
   Lo que sale de acá es un nodo, una malla, una primitiva y cuatro accesores
   con las vistas compactas: para eso no hace falta bajar el cargador entero de
   three.js de un CDN —que es una dependencia más que puede no llegar— ni
   agregar una entrada al importmap.
"""
import base64, io, json, os, struct, subprocess, sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
ENTRADA = '/tmp/m3'
RATIO = '0.10'
# EL COLOR SE DESATURA AL HORNEARLO, y no es corregir la foto: el post-proceso de
# este juego multiplica la saturación por 2,2 —que es lo que hace que el pasto y
# el mar se lean— y una textura fotográfica ya viene saturada. Sin esto, el palo
# de la antorcha sale rojo fuego y el inflador azul eléctrico. Es la misma
# corrección que ya costó una vuelta con el cromo del auto y con la llave.
DESAT = 0.42

TAM = {5120:1, 5121:1, 5122:2, 5123:2, 5125:4, 5126:4}
COMP = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4}
FMT = {5120:'b', 5121:'B', 5122:'h', 5123:'H', 5125:'I', 5126:'f'}


def carga(p):
    b = io.open(p, 'rb').read()
    assert b[:4] == b'glTF', p + ' no es un GLB'
    largo = struct.unpack('<I', b[8:12])[0]
    i, js, bn = 12, None, b''
    while i < largo:
        n, t = struct.unpack('<II', b[i:i+8])
        d = b[i+8:i+8+n]
        if t == 0x4E4F534A: js = json.loads(d.decode('utf8'))
        else: bn = d
        i += 8 + n + ((4 - n % 4) % 4)
    return js, bn


def guarda(p, js, bn):
    j = json.dumps(js, separators=(',', ':')).encode('utf8')
    j += b' ' * ((4 - len(j) % 4) % 4)
    bn += b'\x00' * ((4 - len(bn) % 4) % 4)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + 8 + len(bn))
    out += struct.pack('<II', len(j), 0x4E4F534A) + j
    out += struct.pack('<II', len(bn), 0x004E4942) + bn
    io.open(p, 'wb').write(out)


def leer(js, bn, i):
    a = js['accessors'][i]
    anch = TAM[a['componentType']] * COMP[a['type']]
    bv = js['bufferViews'][a['bufferView']]
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    paso = bv.get('byteStride') or anch
    if paso == anch:
        raw = bn[base:base + anch * a['count']]
    else:
        raw = b''.join(bn[base+k*paso: base+k*paso+anch] for k in range(a['count']))
    v = np.frombuffer(raw, dtype=np.dtype('<' + FMT[a['componentType']]))
    return v.reshape(a['count'], COMP[a['type']])


def color_en_vertices(ent, sal):
    js, bn = carga(ent)
    img = js['images'][0]
    bv = js['bufferViews'][img['bufferView']]
    o = bv.get('byteOffset', 0)
    tex = Image.open(io.BytesIO(bn[o:o+bv['byteLength']])).convert('RGB')
    TX = np.asarray(tex).astype(np.float32) / 255.0
    H, W, _ = TX.shape

    nuevo = bytearray()
    remap = {}
    for k, b in enumerate(js['bufferViews']):
        if k == img['bufferView']: continue
        oo, nn = b.get('byteOffset', 0), b['byteLength']
        while len(nuevo) % 4: nuevo.append(0)
        remap[k] = len(nuevo)
        nuevo.extend(bn[oo:oo+nn])

    for m in js['meshes']:
        for p in m['primitives']:
            at = p['attributes']
            uv = leer(js, bn, at['TEXCOORD_0']).astype(np.float32)
            u = np.clip((uv[:, 0] % 1.0) * (W - 1), 0, W - 1).astype(np.int32)
            v = np.clip((1.0 - (uv[:, 1] % 1.0)) * (H - 1), 0, H - 1).astype(np.int32)
            c = TX[v, u]
            lin = np.where(c <= 0.04045, c/12.92, ((c+0.055)/1.055)**2.4).astype(np.float32)
            lin = (lin * (1.0 - DESAT) + lin.mean(axis=1, keepdims=True) * DESAT).astype(np.float32)
            d = lin.tobytes()
            while len(nuevo) % 4: nuevo.append(0)
            js['bufferViews'].append({'buffer':0, 'byteOffset':len(nuevo), 'byteLength':len(d)})
            nuevo.extend(d)
            js['accessors'].append({'bufferView': len(js['bufferViews'])-1,
                                    'componentType': 5126, 'count': int(lin.shape[0]),
                                    'type': 'VEC3',
                                    'min': [float(lin[:,i].min()) for i in range(3)],
                                    'max': [float(lin[:,i].max()) for i in range(3)]})
            at['COLOR_0'] = len(js['accessors']) - 1
            del at['TEXCOORD_0']

    for k, b in enumerate(js['bufferViews']):
        if k in remap:
            b['byteOffset'] = remap[k]; b['buffer'] = 0
    js.pop('images', None); js.pop('samplers', None); js.pop('textures', None)
    for mt in js.get('materials', []):
        pbr = mt.setdefault('pbrMetallicRoughness', {})
        pbr.pop('baseColorTexture', None)
        pbr['baseColorFactor'] = [1, 1, 1, 1]
        pbr['metallicFactor'] = 0.0; pbr['roughnessFactor'] = 1.0
    viejo = img['bufferView']
    js['bufferViews'] = [b for k, b in enumerate(js['bufferViews']) if k != viejo]
    for a in js['accessors']:
        if a.get('bufferView') is not None and a['bufferView'] > viejo:
            a['bufferView'] -= 1
    js['buffers'] = [{'byteLength': len(nuevo)}]
    guarda(sal, js, bytes(nuevo))


def main():
    piezas, inf = [], []
    for nom, arch in [('antorcha', 'antorcha.glb'), ('inflador', 'inflador.glb')]:
        p = os.path.join(ENTRADA, arch)
        if not os.path.exists(p):
            print('  falta', p); continue
        vc = os.path.join(ENTRADA, nom + '_vc.glb')
        color_en_vertices(p, vc)
        sal = os.path.join(RAIZ, 'assets', 'lemi', nom + '.glb')
        subprocess.run(['npx', '--yes', 'gltfpack', '-si', RATIO, '-sa', '-kn', '-noq',
                        '-i', vc, '-o', sal], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        js, _ = carga(sal)
        tri = sum(js['accessors'][pr['indices']]['count'] // 3
                  for m in js['meshes'] for pr in m['primitives'])
        b64 = base64.b64encode(io.open(sal, 'rb').read()).decode('ascii')
        piezas.append("  %s: '%s'" % (nom, b64))
        inf.append((nom, os.path.getsize(p), os.path.getsize(sal), len(b64), tri))

    js = ("\n/* ═══════════════════════ LOS DOS PROPS 3D ═══════════════════════\n"
          "   La antorcha y el inflador, generados con Higgsfield (`z_image` para\n"
          "   la referencia y `image_to_3d` para la malla), con la textura horneada\n"
          "   en los vértices y decimados a unos 2.900 triángulos con\n"
          "   `herramientas/lemi/hornear_props.py`.\n"
          "   ENTRAN EN DIFERIDO Y NO REEMPLAZAN NADA HASTA QUE LLEGAN: el juego\n"
          "   arranca con los props dibujados por código y la malla los tapa cuando\n"
          "   termina de decodificar. Si el base64 estuviera roto, se juega con los\n"
          "   de siempre — que es la misma regla que las nueve texturas de RECREO. */\n"
          "const PROP_B64 = {\n" + ",\n".join(piezas) + "\n};\n")
    io.open(os.path.join(AQUI, 'partes', 'p.js'), 'w', encoding='utf8').write(js)

    for n, a, b, c, t in inf:
        print('%-9s %8d -> %6d bytes (%d en base64) · %d triángulos' % (n, a, b, c, t))
    return 0


if __name__ == '__main__':
    sys.exit(main())
