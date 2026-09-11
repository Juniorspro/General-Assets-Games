#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""El muñeco 3D: del GLB riggeado de Rezona a un blob que el launcher lee con
cuarenta líneas de JavaScript.

POR QUÉ NO SE EMBEBE three.js: el launcher es la PANTALLA DE INICIO. Se abre
cada vez que se aprieta HOME y no tiene red, así que three.js habría que meterlo
adentro del HTML — 630 KB que el WebView parsea en cada arranque para usar UNA
cosa, `SkinnedMesh`. El renderizador propio son 12 KB.

Y POR ESO EL FORMATO NO ES GLB: todo lo feo —el paso de los `bufferView`, la
jerarquía de nodos, las matrices de bind, los accesores— se resuelve acá, una
vez, y del otro lado quedan arrays planos que se suben a la GPU tal cual.
"""
import base64, io, json, os, subprocess, sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..', 'barrio'))
import glb                                                    # noqa: E402
from PIL import Image                                         # noqa: E402

CRUDO = os.path.join(AQUI, 'crudo')
SAL = os.path.join(AQUI, 'partes', 'i_lemi.js')

# ── LOS HUESOS DE GIRO SE COLAPSAN AL PADRE ──
# El riggeador devuelve 41 huesos y 18 son de TORSIÓN: existen para que un brazo
# de carne se deforme bien a mitad del antebrazo. Este muñeco es un bloque de
# vóxeles que se ve a 140 px y encima pixelado, así que no deforman nada — y
# cuestan caro: las matrices van como arreglo de uniformes y WebGL 1 garantiza
# 128 vectores, o sea 32 mat4. Con 41 huesos son 164 vectores y en un teléfono
# viejo el shader NO COMPILA. Colapsados quedan 23 huesos = 92 vectores.
#
# Colapsar es correcto para un miembro rígido: el vértice pasa a girar alrededor
# del pivote del padre en vez del suyo, que es justo lo que hace un bloque. Y las
# animaciones se escriben acá, así que un hueso de torsión no se gira nunca.
TORSION = ('Twist',)



def gltfpack(ent, sal, si):
    subprocess.run(['npx', '--yes', 'gltfpack', '-i', ent, '-o', sal,
                    '-si', str(si), '-noq', '-kn'],
                   check=True, capture_output=True)


def b64(a):
    return base64.b64encode(a.tobytes()).decode()


def cuat_a_mat(r):
    x, y, z, w = r
    return np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w),   2*(x*z+y*w)],
        [2*(x*y+z*w),   1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w),   2*(y*z+x*w),   1-2*(x*x+y*y)]], dtype=np.float64)


def main():
    ent = os.path.join(CRUDO, 'lemi3d_rig.glb')
    if not os.path.exists(ent):
        sys.exit('falta %s' % ent)
    tmp = '/tmp/_lemi_sim.glb'
    gltfpack(ent, tmp, 0.30)
    js, bn = glb.carga(tmp)

    prim = js['meshes'][0]['primitives'][0]
    A = prim['attributes']
    pos = glb.leer(js, bn, A['POSITION']).astype(np.float64)
    nor = glb.leer(js, bn, A['NORMAL']).astype(np.float64)
    uv = glb.leer(js, bn, A['TEXCOORD_0']).astype(np.float64)
    jnt = glb.leer(js, bn, A['JOINTS_0']).astype(np.int32)
    wgt = glb.leer(js, bn, A['WEIGHTS_0']).astype(np.float64)
    idx = glb.leer(js, bn, prim['indices']).reshape(-1).astype(np.int64)
    nv, nt = len(pos), len(idx)//3
    print('  malla   %d vértices · %d triángulos' % (nv, nt))

    # ── EL ESQUELETO ──
    sk = js['skins'][0]
    joints = sk['joints']
    ibm = glb.leer(js, bn, sk['inverseBindMatrices']).reshape(-1, 4, 4)
    nom = [js['nodes'][j].get('name', 'h%d' % j) for j in joints]
    padre_nodo = glb.arbol(js)
    # padre EN ÍNDICES DE HUESO, que es lo que el JS necesita
    pos_de_nodo = {n: k for k, n in enumerate(joints)}
    padre = []
    for j in joints:
        p = padre_nodo.get(j)
        while p is not None and p not in pos_de_nodo:
            p = padre_nodo.get(p)
        padre.append(pos_de_nodo[p] if p is not None else -1)

    # colapso de los huesos de torsión: cada uno se remapea a su ancestro que no
    # lo sea, y los pesos de un vértice que caían en dos huesos ahora iguales se
    # suman en vez de ocupar dos ranuras
    def es_torsion(k):
        return any(t in nom[k] for t in TORSION)
    destino = []
    for k in range(len(joints)):
        d = k
        while d >= 0 and es_torsion(d):
            d = padre[d]
        destino.append(d if d >= 0 else 0)
    queda = [k for k in range(len(joints)) if not es_torsion(k)]
    nuevo = {k: i for i, k in enumerate(queda)}
    print('  esqueleto %d huesos → %d (se van %d de torsión)'
          % (len(joints), len(queda), len(joints)-len(queda)))

    J = np.zeros((nv, 4), np.int32)
    W = np.zeros((nv, 4), np.float64)
    for v in range(nv):
        acc = {}
        for s in range(4):
            w = wgt[v, s]
            if w <= 0:
                continue
            h = nuevo[destino[jnt[v, s]]]
            acc[h] = acc.get(h, 0.0) + w
        pares = sorted(acc.items(), key=lambda x: -x[1])[:4]
        t = sum(p[1] for p in pares) or 1.0
        for s, (h, w) in enumerate(pares):
            J[v, s] = h
            W[v, s] = w/t

    huesos = []
    for i, k in enumerate(queda):
        n = js['nodes'][joints[k]]
        p = padre[k]
        while p >= 0 and es_torsion(p):
            p = padre[p]
        huesos.append({
            'n': nom[k],
            'p': nuevo[p] if p >= 0 else -1,
            't': [round(x, 6) for x in n.get('translation', [0, 0, 0])],
            'r': [round(x, 6) for x in n.get('rotation', [0, 0, 0, 1])],
        })
    IBM = ibm[queda].astype(np.float32)

    # ── EL MUÑECO SE PARA EN EL ORIGEN Y MIDE 1 ──
    # El generador lo devuelve centrado en su caja, o sea medio metro enterrado.
    # Corriendo el modelo acá, el JS no tiene que saber nada de esto.
    lo, hi = pos.min(0), pos.max(0)
    ctr = np.array([(lo[0]+hi[0])/2, lo[1], (lo[2]+hi[2])/2])
    esc = 1.0/(hi[1]-lo[1])
    pos = (pos - ctr)*esc
    # las matrices de bind viven en el mismo espacio, así que la misma
    # transformación va del otro lado de la inversa
    T = np.eye(4); T[:3, :3] *= esc; T[:3, 3] = -ctr*esc
    Ti = np.linalg.inv(T)
    for i in range(len(IBM)):
        # glTF guarda las matrices por COLUMNAS
        M = IBM[i].reshape(4, 4).T.astype(np.float64)
        IBM[i] = (M @ Ti).T.astype(np.float32)
    for h in huesos:
        if h['p'] < 0:
            h['t'] = [round(x, 6) for x in (np.array(h['t'])*esc - ctr*esc)]
        else:
            h['t'] = [round(x*esc, 6) for x in h['t']]

    lo, hi = pos.min(0), pos.max(0)
    print('  caja    %.3f × %.3f × %.3f  piso %.4f'
          % (hi[0]-lo[0], hi[1]-lo[1], hi[2]-lo[2], lo[1]))

    # ── CUANTIZACIÓN ──
    # Posición a int16 sobre la caja: 1/32767 de una unidad son 3 centésimas de
    # milímetro sobre un muñeco de un metro. Normal a int8: medio grado de error
    # sobre un coseno, que no se ve ni midiendo. UV a uint16.
    pmin, pesc = lo, (hi-lo)
    P = np.clip(np.round((pos-pmin)/pesc*65535 - 32768), -32768, 32767).astype(np.int16)
    N = np.clip(np.round(nor*127), -127, 127).astype(np.int8)
    U = np.clip(np.round(np.clip(uv, 0, 1)*65535), 0, 65535).astype(np.uint16)
    Jb = J.astype(np.uint8)
    Wb = np.clip(np.round(W*255), 0, 255).astype(np.uint8)
    # el redondeo de los pesos rompe la suma: se corrige en la ranura más gorda
    for v in range(nv):
        d = 255 - int(Wb[v].sum())
        if d:
            Wb[v, int(np.argmax(Wb[v]))] = np.clip(int(Wb[v].max()) + d, 0, 255)
    I = idx.astype(np.uint32 if nv > 65535 else np.uint16)

    # ── EL COLOR SE HORNEA EN LOS VÉRTICES, Y LA TEXTURA SE VA ──
    # El atlas que devuelve el generador es UNA ISLA POR TRIÁNGULO: miles de
    # manchitas irregulares. Eso no se puede minificar — a 64 px de pantalla el
    # muestreador elige un nivel de mipmap donde las islas ya se mezclaron entre
    # ellas, y el muñeco sale con parches naranjas encima del buzo azul. Medido:
    # el MISMO GLB con three.js sale perfecto, así que el archivo estaba bien y
    # el que rompía era el atlas achicado.
    #
    # Y EL COLOR SE MUESTREA EN EL CENTRO DEL TRIÁNGULO, NO EN EL VÉRTICE: el UV
    # de un vértice cae en la ESQUINA de su isla, que agarra el borde, el relleno
    # o el color de la isla de al lado. Después se promedia en los vértices
    # pesando por el ÁREA, que es lo que evita que un triángulo diminuto pinte
    # tanto como uno grande.
    im0 = js['images'][0]
    bv = js['bufferViews'][im0['bufferView']]
    raw = bn[bv.get('byteOffset', 0): bv.get('byteOffset', 0)+bv['byteLength']]
    tx = np.asarray(Image.open(io.BytesIO(raw)).convert('RGB')).astype(np.float64)
    th, tw = tx.shape[:2]
    tri = idx.reshape(-1, 3)
    cuv = uv[tri].mean(1)
    # glTF pone el origen de la textura ARRIBA a la izquierda
    px = np.clip((cuv[:, 0]*(tw-1)).round().astype(int), 0, tw-1)
    py = np.clip((cuv[:, 1]*(th-1)).round().astype(int), 0, th-1)
    ctri = tx[py, px]
    va = pos[tri[:, 1]] - pos[tri[:, 0]]
    vb = pos[tri[:, 2]] - pos[tri[:, 0]]
    area = 0.5*np.linalg.norm(np.cross(va, vb), axis=1) + 1e-9
    COL = np.zeros((nv, 3)); PES = np.zeros(nv)
    for k in range(3):
        np.add.at(COL, tri[:, k], ctri*area[:, None])
        np.add.at(PES, tri[:, k], area)
    COL = COL/np.maximum(PES, 1e-9)[:, None]
    huerf = int((PES <= 1e-9).sum())
    C = np.clip(np.round(COL), 0, 255).astype(np.uint8)
    print('  color   horneado del atlas %dx%d · %d vértices sin triángulo'
          % (tw, th, huerf))

    D = {
        'nv': nv, 'nt': nt, 'nh': len(huesos),
        'pmin': [round(float(x), 6) for x in pmin],
        'pesc': [round(float(x), 6) for x in pesc],
        'i16': bool(nv > 65535),
        'pos': b64(P), 'nor': b64(N), 'col': b64(C),
        'jnt': b64(Jb), 'wgt': b64(Wb), 'idx': b64(I),
        'ibm': b64(IBM.reshape(-1).astype(np.float32)),
        'huesos': huesos,
    }
    txt = (
        '/* ══════════════════ EL MUÑECO 3D ══════════════════\n'
        '   Generado con Rezona a partir del render que mandó el usuario y\n'
        '   horneado por `hornear_3d.py`. NO es un GLB: es lo que el\n'
        '   renderizador sube a la GPU tal cual, sin parsear nada. %d huesos y\n'
        '   %d triángulos, con el COLOR EN LOS VÉRTICES: el atlas del generador es\n'
        '   una isla por triángulo y a 64 px de pantalla el mipmap las mezcla, así\n'
        '   que con textura el muñeco sale con parches naranjas sobre el buzo\n'
        '   azul. Horneado, además, no hay imagen que bajar ni UV que guardar. Las\n'
        '   animaciones NO vienen acá: se escriben por código sobre los nombres de\n'
        '   los huesos, que es lo único que permite mezclar dos y componer una\n'
        '   tercera. */\n'
        'const LEMI = %s;\n'
    ) % (len(huesos), nt, json.dumps(D, separators=(',', ':')))
    io.open(SAL, 'w', encoding='utf-8').write(txt)
    print('  huesos  %s' % ' '.join(h['n'] for h in huesos))
    print('→ %s  %d KB' % (SAL, len(txt.encode())//1024))


if __name__ == '__main__':
    main()
