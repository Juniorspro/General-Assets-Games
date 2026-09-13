#!/usr/bin/env python3
"""LECTURA Y ESCRITURA DE GLB, y las cuentas de esqueleto que hacen falta.

Lo comparten retarget.py y adelgaza_clip.py. Se hace a mano y no con una
libreria porque el contenedor GLB son cuatro campos y asi no se agrega una
dependencia mas al repo (aca no hay pygltflib ni trimesh instalados).
"""
import json
import struct

import numpy as np

# glTF guarda el tipo de componente como enum de OpenGL; esto lo pasa a dtype
FMT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def leer(ruta):
    d = open(ruta, 'rb').read()
    if d[:4] != b'glTF':
        raise SystemExit('no es un GLB: ' + ruta)
    total = struct.unpack('<I', d[8:12])[0]
    off, js, bina = 12, None, b''
    while off < total:
        ln, tipo = struct.unpack('<I4s', d[off:off + 8])
        cuerpo = d[off + 8:off + 8 + ln]
        if tipo == b'JSON':
            js = json.loads(cuerpo)
        elif tipo == b'BIN\x00':
            bina = cuerpo
        off += 8 + ln + ((4 - ln % 4) % 4 if ln % 4 else 0)
    return js, bina


def escribir(ruta, js, bina):
    jb = json.dumps(js, separators=(',', ':')).encode('utf8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bb = bina + b'\x00' * ((4 - len(bina) % 4) % 4)
    total = 12 + 8 + len(jb) + (8 + len(bb) if bb else 0)
    with open(ruta, 'wb') as f:
        f.write(b'glTF' + struct.pack('<II', 2, total))
        f.write(struct.pack('<I', len(jb)) + b'JSON' + jb)
        if bb:
            f.write(struct.pack('<I', len(bb)) + b'BIN\x00' + bb)


def acc_datos(js, bina, i):
    """los valores de un accesor como matriz (count, componentes) en float64"""
    acc = js['accessors'][i]
    bv = js['bufferViews'][acc['bufferView']]
    n = COMP[acc['type']]
    ini = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    paso = bv.get('byteStride')
    unidad = np.dtype('<' + FMT[acc['componentType']]).itemsize * n
    if paso and paso != unidad:                     # entrelazado: se desentrelaza
        filas = [np.frombuffer(bina, dtype=np.dtype('<' + FMT[acc['componentType']]),
                               count=n, offset=ini + k * paso)
                 for k in range(acc['count'])]
        return np.array(filas, dtype=np.float64)
    a = np.frombuffer(bina, dtype=np.dtype('<' + FMT[acc['componentType']]),
                      count=acc['count'] * n, offset=ini)
    return a.reshape(acc['count'], n).astype(np.float64)


# ---------------------------------------------------------------- cuaterniones
def q_a_mat(q):
    """cuaternion (x,y,z,w) -> matriz de rotacion 3x3"""
    x, y, z, w = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mat_a_q(m):
    """matriz de rotacion 3x3 -> cuaternion (x,y,z,w).

    Se usa la variante por traza con las cuatro ramas: la formula corta se
    indetermina cuando la traza se acerca a -1, que es justo el caso de estos
    huesos (varios tienen el reposo girado 180 grados).
    """
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0:
        s = np.sqrt(t + 1.0) * 2
        return np.array([(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s,
                         (m[1, 0] - m[0, 1]) / s, 0.25 * s])
    if m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = np.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        return np.array([0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s,
                         (m[2, 1] - m[1, 2]) / s])
    if m[1, 1] > m[2, 2]:
        s = np.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        return np.array([(m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s,
                         (m[0, 2] - m[2, 0]) / s])
    s = np.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
    return np.array([(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s,
                     (m[1, 0] - m[0, 1]) / s])


def q_slerp(a, b, t):
    d = float(np.dot(a, b))
    if d < 0:                      # camino corto: sin esto un salto de signo gira de mas
        b, d = -b, -d
    if d > 0.9995:
        r = a + t * (b - a)
        return r / np.linalg.norm(r)
    th = np.arccos(np.clip(d, -1, 1))
    s = np.sin(th)
    return (np.sin((1 - t) * th) / s) * a + (np.sin(t * th) / s) * b


def grados(m):
    """cuanto gira una matriz de rotacion, en grados"""
    c = (np.trace(m) - 1) / 2
    return float(np.degrees(np.arccos(np.clip(c, -1, 1))))


# ------------------------------------------------------------------- esqueleto
class Rig:
    """el esqueleto de un GLB: nombres, jerarquia, reposo y (si hay) animacion"""

    def __init__(self, ruta):
        self.ruta = ruta
        self.js, self.bina = leer(ruta)
        self.nodes = self.js['nodes']
        self.padre = {}
        for i, n in enumerate(self.nodes):
            for c in n.get('children', []):
                self.padre[c] = i
        self.idx = {}
        for i, n in enumerate(self.nodes):
            if 'name' in n:
                self.idx[n['name']] = i
        # orden padre-antes-que-hijo: el pase a mundo necesita recorrerlo asi
        self.orden = []
        vistos = set()

        def baja(i):
            if i in vistos:
                return
            vistos.add(i)
            self.orden.append(i)
            for c in self.nodes[i].get('children', []):
                baja(c)
        for i in range(len(self.nodes)):
            if i not in self.padre:
                baja(i)
        self.rq = {}      # rotacion local de reposo, por indice
        self.rp = {}      # traslacion local de reposo
        for i, n in enumerate(self.nodes):
            self.rq[i] = np.array(n.get('rotation', [0, 0, 0, 1]), dtype=np.float64)
            self.rp[i] = np.array(n.get('translation', [0, 0, 0]), dtype=np.float64)
        self.reposo_mundo = self._mundo({})
        self.bind_mundo, self.tiene_bind = self._bind()

    def _bind(self):
        """POSE DE BIND en mundo, sacada de inverseBindMatrices del skin.

        Por que no alcanza la transformada de reposo de los nodos: el clip esta
        autorado contra la pose de BIND, que no siempre es la que quedo guardada
        en los nodos. Medido en estos GLB: en andar.glb coinciden (la cadera se
        aparta 4 grados) pero en quieto.glb y correr.glb NO (43 y 45 grados ya en
        el fotograma 0). Usar el reposo de los nodos como referencia era leer el
        movimiento desde una pose equivocada, y ese error constante se veia como
        el personaje encorvado.

        Segun la especificacion glTF  skinMatrix = mundoDelHueso * IBM , o sea
        IBM = inversa(mundoDelHueso en el momento del bind); asi que la pose de
        bind es la inversa de la IBM. Los nodos que no son joint (Armature,
        char1) no tienen IBM: para esos se cae al reposo del nodo, que es
        correcto porque el clip no los toca.
        """
        W = dict(self.reposo_mundo)
        skins = self.js.get('skins') or []
        if not skins or 'inverseBindMatrices' not in skins[0]:
            return W, False
        sk = skins[0]
        ibm = acc_datos(self.js, self.bina, sk['inverseBindMatrices'])
        for k, j in enumerate(sk['joints']):
            m = ibm[k].reshape(4, 4).T          # glTF guarda por columnas
            b = np.linalg.inv(m)
            R = b[:3, :3].astype(np.float64)
            for c in range(3):                  # quitar la escala del Armature
                L = np.linalg.norm(R[:, c])
                if L > 1e-12:
                    R[:, c] /= L
            W[j] = R
        return W, True

    def ref_local(self, i):
        """rotacion local de referencia (bind si hay, reposo si no)"""
        p = self.padre.get(i)
        if p is None:
            return self.bind_mundo[i]
        return self.bind_mundo[p].T @ self.bind_mundo[i]

    def _mundo(self, locales):
        """rotaciones de mundo; `locales` reemplaza la de reposo donde exista.

        Solo orientacion: la traslacion no cambia la orientacion de un hueso y
        la escala del Armature es uniforme, asi que se puede multiplicar solo
        la parte de rotacion y no hace falta armar matrices de 4x4.
        """
        W = {}
        for i in self.orden:
            L = q_a_mat(locales.get(i, self.rq[i]))
            p = self.padre.get(i)
            W[i] = (W[p] @ L) if p is not None else L
        return W

    def pos_mundo(self, locales_q=None, locales_p=None):
        """posiciones de mundo de cada hueso (para medir si los pies pisan)"""
        locales_q = locales_q or {}
        locales_p = locales_p or {}
        M = {}
        for i in self.orden:
            m = np.eye(4)
            m[:3, :3] = q_a_mat(locales_q.get(i, self.rq[i]))
            m[:3, 3] = locales_p.get(i, self.rp[i])
            s = self.nodes[i].get('scale')
            if s:
                m[:3, :3] = m[:3, :3] @ np.diag(s)
            p = self.padre.get(i)
            M[i] = (M[p] @ m) if p is not None else m
        return {i: M[i][:3, 3] for i in M}

    def clips(self):
        """los clips como dict: nombre -> {tiempos, rot{idx:(N,4)}, pos{idx:(N,3)}}"""
        salida = []
        for a in self.js.get('animations', []):
            pistas = {'rotation': {}, 'translation': {}, 'scale': {}}
            tiempos = None
            for c in a['channels']:
                nodo = c['target'].get('node')
                if nodo is None:
                    continue
                s = a['samplers'][c['sampler']]
                t = acc_datos(self.js, self.bina, s['input'])[:, 0]
                v = acc_datos(self.js, self.bina, s['output'])
                pistas[c['target']['path']][nodo] = (t, v)
                if tiempos is None or len(t) > len(tiempos):
                    tiempos = t
            salida.append({'nombre': a.get('name', 'clip'), 'tiempos': tiempos,
                           'pistas': pistas})
        return salida
