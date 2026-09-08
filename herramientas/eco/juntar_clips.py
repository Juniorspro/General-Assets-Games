# -*- coding: utf-8 -*-
"""Junta varios GLB animados en UNO solo: una malla, un esqueleto, todos los clips.

POR QUE HACE FALTA. El generador devuelve un archivo por animacion y cada archivo trae su copia de
la malla. Cuatro clips serian cuatro mallas de 8.374 triangulos adentro del HTML para dibujar
siempre la misma criatura.

POR QUE NO ALCANZA CON COPIAR LOS CANALES POR NOMBRE — y esto se midio. Aun con la misma imagen y la
misma semilla, cada generacion devuelve su propio rig: mallas de 9.314, 9.387 y 9.457 vertices, y
sobre todo **poses de reposo distintas**. La rotacion de reposo de la cadera es (-0,33 -0,33 -0,68
0,57) en una tanda y (0,49 0,49 -0,59 0,43) en otra. Un canal de rotacion es LOCAL AL PADRE: copiado
tal cual sobre un hueso que arranca mirando para otro lado, el bicho sale doblado en dos. Se probo y
se vio: el torso quedaba a noventa grados.

LO QUE SI FUNCIONA: pasar por el MUNDO.
  1. Se hace cinematica directa sobre el esqueleto de origen y se saca la rotacion mundial de cada
     hueso en cada fotograma.
  2. Se corrige por la diferencia de reposo, que sale de las matrices de bind y no de los nodos:
     Rw_destino(h) = Rw_origen(h) · inv(Rw_reposo_origen(h)) · Rw_reposo_destino(h)
  3. Se vuelve a local dividiendo por la rotacion mundial del padre YA CORREGIDA, de arriba hacia
     abajo.
Eso es exacto cuando la jerarquia coincide por nombre, que es el caso.

Y SE LE SACA EL AVANCE. La posicion la manda el juego: si el clip mueve la cadera en X/Z, el modelo
se despega de su propia colision y camina atravesando paredes. Se anula X y Z y se deja la Y, que es
el rebote del paso.

uso: python3 juntar_clips.py salida.glb base.glb:nombre [otro.glb:nombre ...] [--fps 30]
"""
import sys, os, struct
import numpy as np
from pygltflib import (GLTF2, BufferView, Accessor, Animation, AnimationChannel,
                       AnimationSampler, AnimationChannelTarget)

TAM = {5120:1, 5121:1, 5122:2, 5123:2, 5125:4, 5126:4}
COMP = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4, 'MAT4':16}
FMT = {5120:'b', 5121:'B', 5122:'h', 5123:'H', 5125:'I', 5126:'f'}
RAIZ = ('Hips', 'hips', 'Root', 'root')

# ---------- cuaterniones (x,y,z,w) ----------
def qmul(a, b):
    ax,ay,az,aw = a; bx,by,bz,bw = b
    return np.array([aw*bx+ax*bw+ay*bz-az*by,
                     aw*by-ax*bz+ay*bw+az*bx,
                     aw*bz+ax*by-ay*bx+az*bw,
                     aw*bw-ax*bx-ay*by-az*bz])
def qinv(q):
    return np.array([-q[0], -q[1], -q[2], q[3]]) / max(1e-12, np.dot(q, q))
def qnorm(q):
    n = np.linalg.norm(q)
    return q/n if n > 1e-12 else np.array([0.,0.,0.,1.])
def qslerp(a, b, t):
    d = float(np.dot(a, b))
    if d < 0: b = -b; d = -d
    if d > 0.9995: return qnorm(a + t*(b-a))
    th = np.arccos(max(-1.0, min(1.0, d)))
    s = np.sin(th)
    return (np.sin((1-t)*th)/s)*a + (np.sin(t*th)/s)*b
def qdeMatriz(m):
    """la rotacion de una matriz 4x4, sacandole la escala primero"""
    r = m[:3, :3].copy()
    for c in range(3):
        n = np.linalg.norm(r[:, c])
        if n > 1e-9: r[:, c] /= n
    tr = r[0,0] + r[1,1] + r[2,2]
    if tr > 0:
        s = np.sqrt(tr+1.0)*2
        return qnorm(np.array([(r[2,1]-r[1,2])/s, (r[0,2]-r[2,0])/s, (r[1,0]-r[0,1])/s, 0.25*s]))
    i = int(np.argmax([r[0,0], r[1,1], r[2,2]]))
    if i == 0:
        s = np.sqrt(1.0+r[0,0]-r[1,1]-r[2,2])*2
        return qnorm(np.array([0.25*s, (r[0,1]+r[1,0])/s, (r[0,2]+r[2,0])/s, (r[2,1]-r[1,2])/s]))
    if i == 1:
        s = np.sqrt(1.0+r[1,1]-r[0,0]-r[2,2])*2
        return qnorm(np.array([(r[0,1]+r[1,0])/s, 0.25*s, (r[1,2]+r[2,1])/s, (r[0,2]-r[2,0])/s]))
    s = np.sqrt(1.0+r[2,2]-r[0,0]-r[1,1])*2
    return qnorm(np.array([(r[0,2]+r[2,0])/s, (r[1,2]+r[2,1])/s, 0.25*s, (r[1,0]-r[0,1])/s]))

# ---------- leer un GLB ----------
def crudo(g, blob, i):
    a = g.accessors[i]
    ancho = TAM[a.componentType] * COMP[a.type]
    if a.bufferView is None: return b'\x00' * (ancho * a.count)
    bv = g.bufferViews[a.bufferView]
    base = (bv.byteOffset or 0) + (a.byteOffset or 0)
    paso = bv.byteStride or ancho
    if paso == ancho: return blob[base:base+ancho*a.count]
    return b''.join(blob[base+k*paso: base+k*paso+ancho] for k in range(a.count))

def flotantes(g, blob, i):
    a = g.accessors[i]
    n = COMP[a.type]
    v = np.frombuffer(crudo(g, blob, i), dtype='<f4').astype(np.float64)
    return v.reshape(-1, n) if n > 1 else v

class Rig:
    """lo que hace falta de un GLB: jerarquia, reposo y el clip"""
    def __init__(self, ruta):
        self.g = GLTF2().load(ruta)
        self.blob = self.g.binary_blob()
        g = self.g
        self.nombre = [n.name for n in g.nodes]
        self.padre = [-1]*len(g.nodes)
        for i, n in enumerate(g.nodes):
            for c in (n.children or []): self.padre[c] = i
        self.rot = [np.array(n.rotation or [0.,0.,0.,1.]) for n in g.nodes]
        self.tra = [np.array(n.translation or [0.,0.,0.]) for n in g.nodes]
        # la rotacion MUNDIAL de reposo sale de las matrices de bind, que es donde vive de verdad
        self.reposo = {}
        if g.skins:
            s = g.skins[0]
            ibm = flotantes(g, self.blob, s.inverseBindMatrices).reshape(-1, 4, 4)
            for k, nodo in enumerate(s.joints):
                m = np.linalg.inv(ibm[k].T)     # glTF guarda por columnas
                self.reposo[self.nombre[nodo]] = (qdeMatriz(m), m[:3, 3].copy())
        self.canales = {}   # nombre -> {'rotation':(t,v), 'translation':(t,v)}
        if g.animations:
            an = g.animations[0]
            self.dur = 0.0
            for ch in an.channels:
                if ch.target.node is None: continue
                nom = self.nombre[ch.target.node]
                sm = an.samplers[ch.sampler]
                t = flotantes(g, self.blob, sm.input).reshape(-1)
                v = flotantes(g, self.blob, sm.output)
                self.canales.setdefault(nom, {})[ch.target.path] = (t, v)
                self.dur = max(self.dur, float(t[-1]) if len(t) else 0.0)
        else:
            self.dur = 0.0

    def local(self, nom, t):
        c = self.canales.get(nom, {})
        if 'rotation' not in c:
            i = self.nombre.index(nom)
            return self.rot[i]
        ts, vs = c['rotation']
        if t <= ts[0]: return qnorm(vs[0])
        if t >= ts[-1]: return qnorm(vs[-1])
        k = int(np.searchsorted(ts, t) - 1)
        f = (t - ts[k]) / max(1e-9, ts[k+1] - ts[k])
        return qnorm(qslerp(qnorm(vs[k]), qnorm(vs[k+1]), f))

    def localTra(self, nom, t):
        c = self.canales.get(nom, {})
        if 'translation' not in c:
            return self.tra[self.nombre.index(nom)]
        ts, vs = c['translation']
        if t <= ts[0]: return vs[0]
        if t >= ts[-1]: return vs[-1]
        k = int(np.searchsorted(ts, t) - 1)
        f = (t - ts[k]) / max(1e-9, ts[k+1] - ts[k])
        return vs[k] + (vs[k+1] - vs[k]) * f

def orden(rig, nombres):
    """los huesos de arriba hacia abajo: el retarget necesita al padre ya resuelto"""
    idx = {n: i for i, n in enumerate(rig.nombre) if n}
    prof = {}
    for n in nombres:
        d, i = 0, idx[n]
        while rig.padre[i] >= 0: i = rig.padre[i]; d += 1
        prof[n] = d
    return sorted(nombres, key=lambda n: prof[n])

def retargetear(dst, src, fps):
    """devuelve {hueso: (tiempos, quats locales)} y la traslacion de la raiz, para el rig destino"""
    comunes = [n for n in src.nombre if n and n in dst.reposo and n in src.reposo]
    comunes = orden(dst, comunes)
    n = max(2, int(round(src.dur * fps)) + 1)
    ts = np.linspace(0.0, src.dur, n)
    padreDe = {}
    idxd = {x: i for i, x in enumerate(dst.nombre) if x}
    for nom in comunes:
        i = idxd[nom]; p = dst.padre[i]
        padreDe[nom] = dst.nombre[p] if p >= 0 and dst.nombre[p] in comunes else None
    salida = {nom: np.zeros((n, 4)) for nom in comunes}
    for k, t in enumerate(ts):
        ws, wd = {}, {}
        for nom in orden(src, comunes):
            i = src.nombre.index(nom); p = src.padre[i]
            pn = src.nombre[p] if p >= 0 else None
            ws[nom] = qmul(ws[pn], src.local(nom, t)) if pn in ws else src.local(nom, t)
        for nom in comunes:
            # la correccion por la diferencia de reposo, en el mundo
            objetivo = qmul(qmul(ws[nom], qinv(src.reposo[nom][0])), dst.reposo[nom][0])
            pn = padreDe[nom]
            wd[nom] = objetivo
            salida[nom][k] = qnorm(qmul(qinv(wd[pn]), objetivo) if pn else objetivo)
    # la raiz: solo la Y, y como diferencia contra su propio reposo
    rz = next((r for r in RAIZ if r in comunes), None)
    tra = None
    if rz:
        # LA ALTURA VA EN EL ESPACIO DE LOS NODOS, NO EN EL DE LAS MATRICES DE BIND. Es el error que
        # aplasto al bicho: inv(matriz de bind) devuelve la pose en el mundo del esqueleto, o sea CON
        # la escala del Armature (0,01, porque el rig viene en centimetros), mientras que la
        # traslacion de un nodo esta en centimetros. Mezclarlos ponia la cadera a un centimetro del
        # piso y el cuerpo quedaba hecho un acordeon: solo se veia la cabeza.
        base_d = dst.tra[dst.nombre.index(rz)][1]
        base_s = src.tra[src.nombre.index(rz)][1]
        v = np.zeros((n, 3))
        for k, t in enumerate(ts):
            v[k] = [0.0, base_d + (src.localTra(rz, t)[1] - base_s), 0.0]
        tra = (rz, v)
    return ts, salida, tra, len(comunes), len([x for x in src.nombre if x and x not in dst.reposo])

def juntar(sal, piezas, fps):
    base_ruta, base_nom = piezas[0]
    g0 = GLTF2().load(base_ruta)
    blob = bytearray(g0.binary_blob())
    idx0 = {n.name: i for i, n in enumerate(g0.nodes) if n.name}
    dst = Rig(base_ruta)

    def meter(datos):
        while len(blob) % 4: blob.append(0)
        g0.bufferViews.append(BufferView(buffer=0, byteOffset=len(blob), byteLength=len(datos)))
        blob.extend(datos)
        return len(g0.bufferViews) - 1

    def acc(vista, comp, tipo, cuenta, mn=None, mx=None):
        g0.accessors.append(Accessor(bufferView=vista, componentType=comp, count=cuenta,
                                     type=tipo, min=mn, max=mx))
        return len(g0.accessors) - 1

    def escribir(nombre, ts, rots, tra):
        smap, chs = [], []
        vt = meter(np.asarray(ts, dtype='<f4').tobytes())
        at = acc(vt, 5126, 'SCALAR', len(ts), [float(ts[0])], [float(ts[-1])])
        for nom, q in rots.items():
            if nom not in idx0: continue
            vo = meter(np.asarray(q, dtype='<f4').tobytes())
            ao = acc(vo, 5126, 'VEC4', len(ts))
            smap.append(AnimationSampler(input=at, output=ao, interpolation='LINEAR'))
            chs.append(AnimationChannel(sampler=len(smap)-1,
                       target=AnimationChannelTarget(node=idx0[nom], path='rotation')))
        if tra and tra[0] in idx0:
            vo = meter(np.asarray(tra[1], dtype='<f4').tobytes())
            ao = acc(vo, 5126, 'VEC3', len(ts))
            smap.append(AnimationSampler(input=at, output=ao, interpolation='LINEAR'))
            chs.append(AnimationChannel(sampler=len(smap)-1,
                       target=AnimationChannelTarget(node=idx0[tra[0]], path='translation')))
        g0.animations.append(Animation(name=nombre, samplers=smap, channels=chs))
        return len(chs)

    g0.animations = []
    for ruta, nombre in piezas:
        src = Rig(ruta)
        if src.dur <= 0: print('SIN ANIMACION:', ruta); sys.exit(1)
        ts, rots, tra, n, faltan = retargetear(dst, src, fps)
        c = escribir(nombre, ts, rots, tra)
        print('  %-10s %5.2f s  %3d fotogramas  %2d huesos  %3d canales%s'
              % (nombre, src.dur, len(ts), n, c, '' if not faltan else '  (%d huesos del origen sin destino)' % faltan))

    while len(blob) % 4: blob.append(0)
    g0.buffers[0].byteLength = len(blob)
    g0.set_binary_blob(bytes(blob))
    g0.save_binary(sal)
    print('%s: %d clips (%s), %d bytes'
          % (os.path.basename(sal), len(g0.animations),
             ', '.join(a.name for a in g0.animations), os.path.getsize(sal)))

if __name__ == '__main__':
    argv = sys.argv[1:]
    fps = 30
    if '--fps' in argv:
        i = argv.index('--fps'); fps = int(argv[i+1]); del argv[i:i+2]
    args = argv
    sal = args[0]
    piezas = [(a.rsplit(':', 1)[0], a.rsplit(':', 1)[1]) for a in args[1:]]
    juntar(sal, piezas, fps)
