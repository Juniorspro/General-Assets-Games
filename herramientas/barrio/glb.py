#!/usr/bin/env python3
"""Lo mínimo para abrir, mirar y volver a escribir un GLB.

No es una biblioteca general: es lo que hace falta para tomar lo que devuelve
el generador —una malla con esqueleto y una textura— y dejarlo en algo que el
juego pueda leer con cuarenta líneas de JavaScript.

POR QUÉ NO `GLTFLoader`: este juego depende de que llegue `three` y de nada
más. El cargador de three.js es otra descarga de un CDN que puede no llegar y
una entrada más en el importmap, para leer un archivo que generamos NOSOTROS y
cuya forma controlamos entera. Es la misma decisión que en LEMI con los props.
"""
import io, json, struct

import numpy as np

TAM = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
FMT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}


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
    bn = bytes(bn) + b'\x00' * ((4 - len(bn) % 4) % 4)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + 8 + len(bn))
    out += struct.pack('<II', len(j), 0x4E4F534A) + j
    out += struct.pack('<II', len(bn), 0x004E4942) + bn
    io.open(p, 'wb').write(out)


def leer(js, bn, i):
    """Un accesor a un array de numpy, respetando el paso: un `bufferView` con
    `byteStride` intercala varios atributos en el mismo bloque, y leerlo de
    corrido devuelve basura entreverada."""
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
    v = v.reshape(a['count'], COMP[a['type']])
    if a.get('normalized'):
        m = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0}
        if a['componentType'] in m:
            v = np.maximum(v.astype(np.float32) / m[a['componentType']], -1.0)
    return v


def arbol(js):
    """Padre de cada nodo, para poder recorrer la jerarquía hacia arriba."""
    padre = {}
    for i, n in enumerate(js['nodes']):
        for h in n.get('children', []): padre[h] = i
    return padre


def mundo(js, i, padre):
    """Matriz de mundo de un nodo, compuesta desde la raíz. Los nodos de un
    esqueleto vienen con T/R/S y no con `matrix`, así que hay que componer."""
    cadena = []
    while True:
        cadena.append(i)
        if i not in padre: break
        i = padre[i]
    M = np.eye(4, dtype=np.float64)
    for k in reversed(cadena):
        M = M @ local(js['nodes'][k])
    return M


def local(n):
    if 'matrix' in n:
        return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    t = n.get('translation', [0, 0, 0])
    r = n.get('rotation', [0, 0, 0, 1])
    s = n.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = np.array([
        [1-2*(y*y+z*z), 2*(x*y-z*w),   2*(x*z+y*w)],
        [2*(x*y+z*w),   1-2*(x*x+z*z), 2*(y*z-x*w)],
        [2*(x*z-y*w),   2*(y*z+x*w),   1-2*(x*x+y*y)]], dtype=np.float64)
    M = np.eye(4, dtype=np.float64)
    M[:3, :3] = R * np.array(s, dtype=np.float64)[None, :]
    M[:3, 3] = t
    return M


def resumen(p):
    js, bn = carga(p)
    print(p)
    print('  nodos %d · mallas %d · pieles %d · animaciones %d · imágenes %d'
          % (len(js.get('nodes', [])), len(js.get('meshes', [])),
             len(js.get('skins', [])), len(js.get('animations', [])),
             len(js.get('images', []))))
    for m in js.get('meshes', []):
        for pr in m['primitives']:
            n = js['accessors'][pr['attributes']['POSITION']]['count']
            t = js['accessors'][pr['indices']]['count'] // 3 if 'indices' in pr else n // 3
            print('  malla "%s": %d vértices · %d triángulos · %s'
                  % (m.get('name', '?'), n, t, ','.join(sorted(pr['attributes']))))
    for s in js.get('skins', []):
        print('  piel: %d huesos' % len(s['joints']))
        print('    ' + ' · '.join(js['nodes'][j].get('name', '#%d' % j) for j in s['joints']))
    for a in js.get('animations', []):
        print('  animación "%s": %d canales' % (a.get('name', '?'), len(a['channels'])))
