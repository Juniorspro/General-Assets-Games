#!/usr/bin/env python3
"""Deja el frasco generado listo para el juego.

    python3 herramientas/barrio/hornear_frasco.py

Es la misma cadena que el personaje —hornear la textura en los vértices,
decimar sin UV y escribir base64— y por eso reusa `color_en_vertices` en vez de
copiarla: dos horneados que hacen lo mismo terminan divergiendo en el sitio en
el que hay que corregir un defecto.

DOS COSAS PROPIAS DE ESTE OBJETO:

1. SE ESCALA A TAMAÑO DE FRASCO. El generador devuelve la malla dentro de una
   caja de lado 2, o sea que puesta en el mundo mide dos metros: es un tacho.
   Un frasco de pastillas mide 8,5 cm de alto, y esa medida es lo único que
   hace que la mano que lo sostiene se lea a mano.

2. Y SE PARA. La malla viene con el eje que el generador quiso; el juego lo
   cuelga de un hueso, así que se le mide la caja y se lo lleva a que su base
   esté en el origen y su alto vaya por +Y.
"""
import base64, io, os, subprocess, sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glb
from hornear_pj import color_en_vertices

AQUI = os.path.dirname(os.path.abspath(__file__))
ENT = '/tmp/frasco'
ALTO_M = 0.085                       # ocho centímetros y medio, como uno de verdad


def main():
    ent = os.path.join(ENT, 'frasco.glb')
    if not os.path.exists(ent):
        print('falta', ent); return 1
    print('== entrada'); glb.resumen(ent)

    vc = os.path.join(ENT, 'frasco_vc.glb')
    color_en_vertices(ent, vc)
    print('== color en vértices: %d bytes' % os.path.getsize(vc))

    dec = os.path.join(ENT, 'frasco_dec.glb')
    subprocess.run(['npx', '--yes', 'gltfpack', '-si', os.environ.get('FR_RATIO', '0.26'),
                    '-sa', '-kn', '-noq', '-i', vc, '-o', dec], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('== decimado'); glb.resumen(dec)

    js, bina = glb.carga(dec)
    pr = js['meshes'][0]['primitives'][0]
    P = glb.leer(js, bina, pr['attributes']['POSITION']).astype(np.float32)
    N = glb.leer(js, bina, pr['attributes']['NORMAL']).astype(np.float32)
    C = glb.leer(js, bina, pr['attributes']['COLOR_0']).astype(np.float32)[:, :3]
    I = glb.leer(js, bina, pr['indices']).astype(np.uint32).reshape(-1)

    lo, hi = P.min(axis=0), P.max(axis=0)
    eje = int(np.argmax(hi - lo))
    print('caja %s .. %s · eje más largo %d' % (np.round(lo, 3), np.round(hi, 3), eje))
    if eje != 1:                      # se para: el eje más largo pasa a ser Y
        orden = [0, 1, 2]; orden[1], orden[eje] = orden[eje], orden[1]
        P = P[:, orden]; N = N[:, orden]
        lo, hi = P.min(axis=0), P.max(axis=0)
    esc = ALTO_M / float(hi[1] - lo[1])
    P = (P - np.array([(lo[0]+hi[0])/2, lo[1], (lo[2]+hi[2])/2], np.float32)) * esc
    print('escala %.5f · alto final %.4f m · ancho %.4f'
          % (esc, P[:, 1].max() - P[:, 1].min(), P[:, 0].max() - P[:, 0].min()))

    vistas, accs, buf = [], [], bytearray()

    def pon(datos, comp, tipo, minmax=False):
        b = datos.astype(np.float32 if tipo == 5126 else np.uint32).tobytes()
        while len(buf) % 4: buf.append(0)
        off = len(buf); buf.extend(b)
        vistas.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b)})
        a = {'bufferView': len(vistas)-1, 'componentType': tipo,
             'count': len(datos), 'type': comp}
        if minmax:
            a['min'] = [float(v) for v in datos.min(axis=0)]
            a['max'] = [float(v) for v in datos.max(axis=0)]
        accs.append(a)
        return len(accs)-1

    aP = pon(P, 'VEC3', 5126, True)
    aN = pon(N, 'VEC3', 5126)
    aC = pon(np.clip(C, 0, 1), 'VEC3', 5126)
    aI = pon(I.reshape(-1, 1), 'SCALAR', 5125)
    sal = {'asset': {'version': '2.0'},
           'scene': 0, 'scenes': [{'nodes': [0]}],
           'nodes': [{'mesh': 0, 'name': 'frasco'}],
           'meshes': [{'name': 'frasco', 'primitives': [
               {'attributes': {'POSITION': aP, 'NORMAL': aN, 'COLOR_0': aC},
                'indices': aI, 'material': 0}]}],
           'materials': [{'name': 'frasco', 'doubleSided': False,
                          'pbrMetallicRoughness': {
                              'baseColorFactor': [1, 1, 1, 1],
                              'metallicFactor': 0.0, 'roughnessFactor': 0.42}}],
           'bufferViews': vistas, 'accessors': accs,
           'buffers': [{'byteLength': len(buf)}]}
    fin = os.path.join(ENT, 'frasco_final.glb')
    glb.guarda(fin, sal, bytes(buf))
    print('== salida'); glb.resumen(fin)

    b64 = base64.b64encode(io.open(fin, 'rb').read()).decode('ascii')
    io.open(os.path.join(AQUI, 'partes', 'n.js'), 'w', encoding='utf8').write(
        "\n/* ═══════════════════ EL FRASCO ═══════════════════\n"
        "   Generado con Higgsfield (imagen -> 3D), horneado a color por vértice\n"
        "   y decimado con `herramientas/barrio/hornear_frasco.py`. Va sin textura\n"
        "   por lo mismo que el personaje: el juego dibuja a 525x242 y lo que se\n"
        "   ve de un frasco de ocho centímetros son tres colores. */\n"
        "const FRASCO_B64 = '" + b64 + "';\n")
    print('base64 %d bytes' % len(b64))
    return 0


if __name__ == '__main__':
    sys.exit(main())
