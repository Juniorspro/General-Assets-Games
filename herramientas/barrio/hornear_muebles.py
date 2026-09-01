#!/usr/bin/env python3
"""Hornea los cuatro muebles del cuarto y escribe partes/r.js.

    python3 herramientas/barrio/hornear_muebles.py

DE DÓNDE SALEN: Rezona Lab (`submit_model3d_generation`, proveedor Tripo). El
cuarto estaba armado con cajas —cama, mesa de luz, silla y una lámpara de tres
cilindros— y es el único sitio del juego que se mira de cerca y con luz.

TRIPO DEVUELVE VEINTIOCHO MEGAS POR MUEBLE, así que hay dos pasos y cada uno
resuelve un problema distinto, los mismos que en LEMI:

1. LA TEXTURA SE HORNEA EN LOS VÉRTICES. Decimando con la textura puesta el
   simplificador tiene que respetar las costuras de UV y se planta; sin UV baja
   hasta donde uno quiera. Y de paso se van los megas del JPEG: el color pasa a
   ser tres floats por vértice. Se convierte de sRGB a LINEAL al muestrear,
   porque glTF trata `COLOR_0` como lineal.

2. Y VA CON `-noq`: la cuantización de gltfpack entra como
   `KHR_mesh_quantization` en `extensionsRequired`, y el lector de este juego
   —ciento veinte líneas, sin extensiones— no muestra NADA con eso puesto.

EL COLOR SE DESATURA MENOS QUE EN LEMI (0,20 contra 0,42): allá el post
multiplica la saturación por 2,2; acá el cuarto se ve con la luz cálida de un
velador y sin ese filtro, así que desaturar de más deja los muebles grises.
"""
import base64, io, json, os, subprocess, sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas', 'lemi'))
ENTRADA = os.environ.get('MUE_DIR', '/tmp/rez_barrio/assets')
DESAT = 0.20

#  nombre     archivo           triángulos que se quieren
#
# EL OBJETIVO ES UN NÚMERO DE TRIÁNGULOS Y NO UN RATIO, y eso costó una pasada:
# `-si 0.06` sobre estos archivos devolvía 59.800 triángulos y parecía que el
# simplificador estaba trabado —que es lo que le pasó a LEMI con las UV—. No lo
# estaba: hacía exactamente el 6 % que se le pedía, y la entrada tiene UN MILLÓN
# de triángulos. Un ratio no dice nada si no se sabe de cuánto se parte.
PLAN = [
    ('velador', 'velador-g1.glb', 2200),
    ('silla',   'silla-g1.glb',   2200),
    ('mesita',  'mesita-g1.glb',  1800),
    ('comoda',  'comoda-g1.glb',  1800),
]

import glb


def color_en_vertices(ent, sal):
    js, bn = glb.carga(ent)
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
            if 'TEXCOORD_0' not in at: continue
            uv = glb.leer(js, bn, at['TEXCOORD_0']).astype(np.float32)
            u = np.clip((uv[:, 0] % 1.0) * (W - 1), 0, W - 1).astype(np.int32)
            v = np.clip((1.0 - (uv[:, 1] % 1.0)) * (H - 1), 0, H - 1).astype(np.int32)
            c = TX[v, u]
            lin = np.where(c <= 0.04045, c/12.92, ((c+0.055)/1.055)**2.4).astype(np.float32)
            lin = (lin * (1.0 - DESAT) + lin.mean(axis=1, keepdims=True) * DESAT).astype(np.float32)
            d = lin.tobytes()
            while len(nuevo) % 4: nuevo.append(0)
            js['bufferViews'].append({'buffer': 0, 'byteOffset': len(nuevo), 'byteLength': len(d)})
            nuevo.extend(d)
            js['accessors'].append({'bufferView': len(js['bufferViews'])-1,
                                    'componentType': 5126, 'count': int(lin.shape[0]),
                                    'type': 'VEC3',
                                    'min': [float(lin[:, i].min()) for i in range(3)],
                                    'max': [float(lin[:, i].max()) for i in range(3)]})
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
    glb.guarda(sal, js, bytes(nuevo))


def caja(p):
    """alto, ancho y fondo de la malla, para poder escalarla a tamaño de mueble:
    el generador devuelve todo dentro de un cubo de lado 2, o sea dos metros"""
    js, bn = glb.carga(p)
    pr = js['meshes'][0]['primitives'][0]
    v = glb.leer(js, bn, pr['attributes']['POSITION']).astype(np.float64)
    return v.min(axis=0), v.max(axis=0)


def main():
    piezas, inf, tam = [], [], []
    for nom, arch, objetivo in PLAN:
        p = os.path.join(ENTRADA, arch)
        if not os.path.exists(p):
            print('  falta', p); continue
        vc = '/tmp/%s_vc.glb' % nom
        color_en_vertices(p, vc)
        jv, _ = glb.carga(vc)
        entra = sum(jv['accessors'][pr['indices']]['count'] // 3
                    for m in jv['meshes'] for pr in m['primitives'])
        ratio = '%.5f' % max(0.0005, objetivo / float(entra))
        sal = os.path.join(RAIZ, 'assets', 'barrio', 'muebles', nom + '.glb')
        os.makedirs(os.path.dirname(sal), exist_ok=True)
        subprocess.run(['npx', '--yes', 'gltfpack', '-si', ratio, '-sa', '-kn', '-noq',
                        '-i', vc, '-o', sal], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        js, _ = glb.carga(sal)
        tri = sum(js['accessors'][pr['indices']]['count'] // 3
                  for m in js['meshes'] for pr in m['primitives'])
        lo, hi = caja(sal)
        b64 = base64.b64encode(io.open(sal, 'rb').read()).decode('ascii')
        piezas.append("  %s: '%s'" % (nom, b64))
        tam.append('  %s: [%.4f, %.4f, %.4f, %.4f, %.4f, %.4f]'
                   % (nom, lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]))
        inf.append((nom, entra, os.path.getsize(sal), len(b64), tri,
                    hi[1]-lo[1]))

    js = ("\n/* ═════════════════════ LOS MUEBLES DEL CUARTO ═════════════════════\n"
          "   Velador, silla, mesa de luz y cómoda, generados con Rezona Lab (Tripo),\n"
          "   con la textura horneada en los vértices y decimados con\n"
          "   `herramientas/barrio/hornear_muebles.py`.\n"
          "   ENTRAN EN DIFERIDO Y NO REEMPLAZAN NADA HASTA QUE LLEGAN: el cuarto se\n"
          "   arma con las cajas de siempre y la malla las tapa cuando termina de\n"
          "   decodificar. Si un base64 estuviera roto, ese mueble se queda con su\n"
          "   caja y no hay estado roto posible.\n"
          "   `MUE_CAJA` es la caja de cada malla EN LAS UNIDADES EN LAS QUE VINO: el\n"
          "   generador devuelve todo dentro de un cubo de lado dos —o sea muebles de\n"
          "   dos metros— así que sin esto la silla mide lo que la cómoda. */\n"
          "const MUE_B64 = {\n" + ",\n".join(piezas) + "\n};\n"
          "const MUE_CAJA = {\n" + ",\n".join(tam) + "\n};\n")
    io.open(os.path.join(AQUI, 'partes', 'r.js'), 'w', encoding='utf8').write(js)

    for n, a, b, c, t, h in inf:
        print('%-8s %8d tri -> %6d bytes (%d b64) · %5d triángulos · alto %.2f'
              % (n, a, b, c, t, h))
    print('total en base64 %d KB' % (sum(i[3] for i in inf)//1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
