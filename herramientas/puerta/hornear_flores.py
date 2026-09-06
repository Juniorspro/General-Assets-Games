#!/usr/bin/env python3
"""Hornea las cuatro flores gigantes del nivel 1 y escribe assets/puerta/flores.js.

    python3 herramientas/puerta/hornear_flores.py

DE DONDE SALEN: `submit_model3d_generation` de Rezona Lab (Tripo) con
`extra:{face_limit:6000}`. Ese parametro es la diferencia entre esto y una
mancha: sin el, Tripo devuelve UN MILLON de triangulos y bajarlos a tres mil es
tirar el 99,8 % — el simplificador se come los petalos finos, que es justo lo
que hace que una flor se lea a flor. Medido en esta tanda: entran con 5.502 a
5.768.

LA CADENA NO SE COPIA, SE IMPORTA. `color_en_vertices` vive en
herramientas/lemi/hornear_props.py y hace tres cosas que ya costaron una vuelta
cada una: hornear la textura en los vertices (sin UV el simplificador no tiene
costuras que respetar y por fin baja), convertir de sRGB a lineal al muestrear
—glTF trata COLOR_0 como lineal— y tirar el JPEG, que en estas cuatro son 4,25
MB. Dos horneados que hacen lo mismo terminan divergiendo justo donde hay que
corregir un defecto.

LO PROPIO DE ACA SON TRES COSAS:

1. LA DESATURACION VA EN CERO. En LEMI vale 0,42 porque su post multiplica la
   saturacion por 2,2; este juego no hace eso —su grade es un multiply suave de
   CSS que oscurece— asi que desaturar seria apagar unas flores que tienen que
   ser lo mas vivo del campo.
2. EL OBJETIVO ES UN NUMERO DE TRIANGULOS, NO UN RATIO. `-si 0.5` no quiere
   decir nada si no se sabe de cuanto se parte; el ratio se calcula por modelo
   contra lo que ese modelo trajo.
3. SE PARAN Y SE NORMALIZAN. Tripo devuelve la malla dentro de una caja de lado
   2 y con el centro en el origen: plantada asi, media flor queda enterrada. Se
   le mide la caja, se le lleva la base a y=0, se centra en x/z y se escala a
   1,0 de alto — el juego elige despues cuanto mide cada una, que es lo que
   permite que sean gigantes sin tocar el asset.
"""
import base64, io, json, os, struct, subprocess, sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas', 'lemi'))
import hornear_props as HP

HP.DESAT = 0.0                      # ver punto 1
ENTRADA = os.environ.get('FLORES', '/tmp/pb_assets')
OBJETIVO = int(os.environ.get('TRI', '3200'))
FLORES = ['girasol', 'amapola', 'margarita', 'tulipan']


def triangulos(js):
    return sum(js['accessors'][pr['indices']]['count'] // 3
               for m in js['meshes'] for pr in m['primitives'])


def parar(p):
    """base en y=0, centrada en x/z y 1,0 de alto. Devuelve el alto original."""
    js, bn = HP.carga(p)
    mn = np.array([1e9, 1e9, 1e9], dtype=np.float64)
    mx = -mn.copy()
    for m in js['meshes']:
        for pr in m['primitives']:
            v = HP.leer(js, bn, pr['attributes']['POSITION']).astype(np.float64)
            mn = np.minimum(mn, v.min(axis=0)); mx = np.maximum(mx, v.max(axis=0))
    alto = float(mx[1] - mn[1])
    s = 1.0 / max(alto, 1e-6)
    # se aplica como transformacion del nodo: no hay que reescribir los vertices
    nodos = js.get('nodes', [])
    raices = js['scenes'][js.get('scene', 0)]['nodes']
    envoltura = {'children': list(raices), 'scale': [s, s, s],
                 'translation': [float(-(mn[0] + mx[0]) / 2 * s), float(-mn[1] * s),
                                 float(-(mn[2] + mx[2]) / 2 * s)]}
    nodos.append(envoltura)
    js['nodes'] = nodos
    js['scenes'][js.get('scene', 0)]['nodes'] = [len(nodos) - 1]
    HP.guarda(p, js, bn)
    return alto


def main():
    piezas, inf = [], []
    for nom in FLORES:
        ent = os.path.join(ENTRADA, nom + '-g1.glb')
        if not os.path.exists(ent):
            print('  falta', ent); continue
        js0, _ = HP.carga(ent)
        tri0 = triangulos(js0)

        vc = os.path.join('/tmp', nom + '_vc.glb')
        HP.color_en_vertices(ent, vc)

        ratio = min(0.95, OBJETIVO / float(tri0))      # punto 2
        sal = os.path.join(RAIZ, 'assets', 'puerta', nom + '.glb')
        subprocess.run(['npx', '--yes', 'gltfpack', '-si', '%.4f' % ratio, '-sa', '-kn',
                        '-noq', '-i', vc, '-o', sal], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        alto = parar(sal)                              # punto 3

        js, _ = HP.carga(sal)
        tri = triangulos(js)
        b64 = base64.b64encode(io.open(sal, 'rb').read()).decode('ascii')
        piezas.append("  %s: '%s'" % (nom, b64))
        inf.append((nom, tri0, tri, os.path.getsize(ent), os.path.getsize(sal), len(b64), alto))
        print('  %-10s %5d -> %5d tri   %6.2f MB -> %5.1f KB (%5.1f KB en b64)   alto original %.2f'
              % (nom, tri0, tri, os.path.getsize(ent) / 1e6,
                 os.path.getsize(sal) / 1024.0, len(b64) / 1024.0, alto))

    cab = ("/* LAS CUATRO FLORES GIGANTES DEL NIVEL 1\n"
           "   Generadas con Rezona Lab (Tripo) con face_limit 6000, la textura\n"
           "   horneada en los vertices y decimadas a ~%d triangulos con\n"
           "   herramientas/puerta/hornear_flores.py. Vienen paradas: base en y=0,\n"
           "   centradas y de 1,0 de alto, asi el juego elige el tamano. */\n" % OBJETIVO)
    sal = os.path.join(RAIZ, 'assets', 'puerta', 'flores.js')
    io.open(sal, 'w', encoding='utf8').write(
        cab + 'window.__PB_FLORES = {\n' + ',\n'.join(piezas) + '\n};\n')
    print('\n%s  %.1f KB' % (sal, os.path.getsize(sal) / 1024.0))
    print('total en base64: %.1f KB' % (sum(x[5] for x in inf) / 1024.0))


if __name__ == '__main__':
    main()
