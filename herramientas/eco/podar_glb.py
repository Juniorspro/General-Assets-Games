# -*- coding: utf-8 -*-
"""Poda un GLB para que entre dentro del HTML de Eco.

   POR QUE SE PUEDE PODAR TANTO: en este juego NADA se dibuja con su propio material. Todo va con el
   shader del sonido, que solo lee POSITION y NORMAL —y JOINTS/WEIGHTS si la malla tiene esqueleto—.
   O sea que las coordenadas de textura, las tangentes y el color por vertice son bytes que viajan al
   navegador para que el shader los ignore.

   Tres pasadas, y las tres se miden:
     1. FUERA LOS ATRIBUTOS QUE NADIE MIRA.
     2. SOLDAR LOS VERTICES REPETIDOS. Vienen partidos por las costuras de textura, y sin textura
        cada costura es un vertice de mas: el pozo trae 6127 vertices para 4157 triangulos, cuando
        una malla cerrada tiene medio vertice por triangulo.
     3. LOS PESOS DEL ESQUELETO A UN BYTE. WEIGHTS_0 en float32 son 16 bytes por vertice y el
        formato admite byte normalizado, que son 4: en la cosa eso solo son 108 KB. Y JOINTS_0 a
        byte, que se puede porque el esqueleto tiene 25 huesos y no 255.

   Y SE REESCRIBE EL BUFFER ENTERO. Borrar un atributo sin reescribir el buffer no ahorra un byte:
   los datos siguen ahi, sin nadie que los mire.

   uso: python3 podar_glb.py entrada.glb salida.glb
"""
import sys, os, struct
from pygltflib import GLTF2, BufferView, Buffer, Accessor

QUITAR = ['TANGENT', 'TEXCOORD_0', 'TEXCOORD_1', 'TEXCOORD_2', 'COLOR_0']
TAM = {5120:1, 5121:1, 5122:2, 5123:2, 5125:4, 5126:4}
COMP = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4, 'MAT2':4, 'MAT3':9, 'MAT4':16}
FMT = {5120:'b', 5121:'B', 5122:'h', 5123:'H', 5125:'I', 5126:'f'}

def crudo(g, blob, i):
    """los bytes de un accesor, ya compactados (sin byteStride)"""
    a = g.accessors[i]
    ancho = TAM[a.componentType] * COMP[a.type]
    if a.bufferView is None: return b'\x00' * (ancho * a.count)
    bv = g.bufferViews[a.bufferView]
    base = (bv.byteOffset or 0) + (a.byteOffset or 0)
    paso = bv.byteStride or ancho
    if paso == ancho: return blob[base:base + ancho * a.count]
    return b''.join(blob[base+k*paso: base+k*paso+ancho] for k in range(a.count))

def valores(g, blob, i):
    a = g.accessors[i]
    n = COMP[a.type]
    v = struct.unpack('<%d%s' % (a.count*n, FMT[a.componentType]), crudo(g, blob, i))
    return [v[k*n:(k+1)*n] for k in range(a.count)]

def soldar(pos, nor, joi, wei, idx):
    """junta los vertices repetidos, por posicion Y NORMAL.
       Soldando solo por posicion se promedian las normales de las dos caras de una arista y el canto
       se redondea — y en este juego la normal es justo lo que hace que una esquina se LEA como
       esquina cuando la toca una onda."""
    llave, remap = {}, [0]*len(pos)
    P, N, J, W = [], [], [], []
    for i in range(len(pos)):
        k = (round(pos[i][0],5), round(pos[i][1],5), round(pos[i][2],5))
        if nor: k += (round(nor[i][0],2), round(nor[i][1],2), round(nor[i][2],2))
        j = llave.get(k)
        if j is None:
            j = len(P); llave[k] = j
            P.append(pos[i])
            if nor: N.append(nor[i])
            if joi: J.append(joi[i])
            if wei: W.append(wei[i])
        remap[i] = j
    return P, N, J, W, [remap[i] for i in idx]

class Escritor:
    def __init__(self): self.buf = bytearray(); self.vistas = []; self.acc = []
    def meter(self, datos, tipo, comp, cuenta, norm=False, minmax=None, destino=None, paso=None):
        while len(self.buf) % 4: self.buf.append(0)
        self.vistas.append(BufferView(buffer=0, byteOffset=len(self.buf), byteLength=len(datos),
                                      target=destino, byteStride=paso))
        self.buf += datos
        a = Accessor(bufferView=len(self.vistas)-1, byteOffset=0, componentType=tipo,
                     count=cuenta, type=comp, normalized=norm or None)
        if minmax: a.min, a.max = minmax
        self.acc.append(a)
        return len(self.acc)-1

def podar(ent, sal):
    g = GLTF2().load(ent)
    blob = g.binary_blob()
    e = Escritor()
    quitados, v0, v1 = set(), 0, 0
    usaQ = [False]

    for m in g.meshes:
        for p in m.primitives:
            for at in QUITAR:
                if getattr(p.attributes, at, None) is not None:
                    quitados.add(at); setattr(p.attributes, at, None)
            pos = valores(g, blob, p.attributes.POSITION)
            nor = valores(g, blob, p.attributes.NORMAL) if p.attributes.NORMAL is not None else None
            joi = valores(g, blob, p.attributes.JOINTS_0) if p.attributes.JOINTS_0 is not None else None
            wei = valores(g, blob, p.attributes.WEIGHTS_0) if p.attributes.WEIGHTS_0 is not None else None
            idx = [x[0] for x in valores(g, blob, p.indices)] if p.indices is not None else list(range(len(pos)))
            v0 += len(pos)
            pos, nor, joi, wei, idx = soldar(pos, nor, joi, wei, idx)
            v1 += len(pos)

            mn = [min(v[k] for v in pos) for k in range(3)]
            mx = [max(v[k] for v in pos) for k in range(3)]
            # LA POSICION A DOS BYTES, cuando se puede. Meshy devuelve la malla normalizada dentro de
            # una caja de lado 2 centrada en el origen, o sea que un short normalizado la representa
            # con un error de 3 centesimas de milimetro sobre un objeto de dos metros: invisible, y
            # la mitad de bytes. NO se hace con la malla del esqueleto, porque ahi la caja no esta
            # centrada (el bicho va de y=0 a y=2,4) y meter una escala en el nodo obliga a tocar
            # tambien las matrices de bind del esqueleto — mucho riesgo para 54 KB.
            # OJO: `not joi` y no `joi is None`. soldar() devuelve LISTAS, asi que una malla sin
            # esqueleto sale con joi=[] y no con joi=None — y `[] is None` es falso, o sea que la
            # cuantizacion no se aplicaba nunca y el ahorro era cero sin que nada fallara.
            cabeQ = (not joi) and all(abs(c) <= 1.0 for v in pos for c in v)
            if cabeQ:
                # VEC3 de shorts son 6 bytes, y la especificacion pide que cada elemento de un
                # atributo caiga en multiplo de 4: va con paso 8 y dos bytes de relleno. Apretado a 6
                # three.js igual lo lee, pero el archivo queda invalido y eso se paga en la proxima
                # version de la biblioteca, no hoy.
                datos = b''.join(struct.pack('<3hh', *[max(-32767, min(32767, int(round(c*32767)))) for c in v], 0)
                                 for v in pos)
                # EL MIN/MAX VA EN LAS UNIDADES GUARDADAS, NO EN METROS. Es el error que costo una
                # medicion: con el min/max en float, three.js —que para un accesor normalizado divide
                # esos numeros por 32767 al armar la caja— calculaba un volumen de 47 micras, ponia la
                # camara adentro y no dibujaba NADA. La malla estaba perfecta; la caja mentia.
                qmn = [int(round(c*32767)) for c in mn]
                qmx = [int(round(c*32767)) for c in mx]
                p.attributes.POSITION = e.meter(datos, 5122, 'VEC3', len(pos),
                                                norm=True, minmax=(qmn, qmx), destino=34962, paso=8)
                usaQ[0] = True; quitados.add('POSITION->short')
            else:
                p.attributes.POSITION = e.meter(struct.pack('<%df'%(len(pos)*3), *[c for v in pos for c in v]),
                                                5126, 'VEC3', len(pos), minmax=(mn, mx), destino=34962)
            if nor:
                # LA NORMAL A UN BYTE: es un versor, o sea que siempre esta entre -1 y 1, y un byte
                # normalizado da un error angular de medio grado. El shader la usa para el termino de
                # cara, que es un coseno: medio grado no se ve ni midiendo.
                q = []
                for v in nor:
                    q += [max(-127, min(127, int(round(c*127)))) for c in v] + [0]   # VEC3 en bytes va alineado a 4
                datos = b''.join(struct.pack('<4b', *q[k*4:(k+1)*4]) for k in range(len(nor)))
                p.attributes.NORMAL = e.meter(datos, 5120, 'VEC3', len(nor), norm=True, destino=34962, paso=4)
                usaQ[0] = True; quitados.add('NORMAL->byte')
            if joi:
                # a un byte: hace falta que el esqueleto tenga menos de 256 huesos, y tiene 25
                cabe = max(max(v) for v in joi) < 256
                if cabe:
                    p.attributes.JOINTS_0 = e.meter(struct.pack('<%dB'%(len(joi)*4), *[c for v in joi for c in v]),
                                                    5121, 'VEC4', len(joi), destino=34962)
                    quitados.add('JOINTS→byte')
                else:
                    p.attributes.JOINTS_0 = e.meter(struct.pack('<%dH'%(len(joi)*4), *[c for v in joi for c in v]),
                                                    5123, 'VEC4', len(joi), destino=34962)
            if wei:
                b = []
                for v in wei:
                    q = [max(0, min(255, int(round(c*255)))) for c in v]
                    d = 255 - sum(q)
                    q[q.index(max(q))] += d      # que los cuatro pesos sigan sumando uno exacto
                    b += [max(0, min(255, x)) for x in q]
                p.attributes.WEIGHTS_0 = e.meter(struct.pack('<%dB'%len(b), *b),
                                                 5121, 'VEC4', len(wei), norm=True, destino=34962)
                quitados.add('WEIGHTS→byte')
            f = 'H' if len(pos) < 65536 else 'I'
            p.indices = e.meter(struct.pack('<%d%s'%(len(idx), f), *idx),
                                5123 if f=='H' else 5125, 'SCALAR', len(idx), destino=34963)

    for s in (g.skins or []):
        if s.inverseBindMatrices is not None:
            a = g.accessors[s.inverseBindMatrices]
            s.inverseBindMatrices = e.meter(crudo(g, blob, s.inverseBindMatrices),
                                            a.componentType, a.type, a.count)
    for an in (g.animations or []):
        # LAS ROTACIONES DE UNA ANIMACION A DOS BYTES. Un cuaternion siempre esta entre -1 y 1, y el
        # formato admite short normalizado para el canal de rotacion sin ninguna extension: 16 bytes
        # por hueso y fotograma pasan a 8. Con veintiseis huesos y ciento veintisiete fotogramas por
        # clip eso es la mitad de todo lo que pesa la animacion, y el error de un short en un
        # cuaternion son cinco milesimas de grado.
        rot = set()
        for ch in an.channels:
            if ch.target.path == 'rotation': rot.add(an.samplers[ch.sampler].output)
        for sm in an.samplers:
            for campo in ('input', 'output'):
                i = getattr(sm, campo)
                a = g.accessors[i]
                if campo == 'output' and i in rot and a.componentType == 5126 and a.type == 'VEC4':
                    v = struct.unpack('<%df' % (a.count*4), crudo(g, blob, i))
                    q = [max(-32767, min(32767, int(round(c*32767)))) for c in v]
                    nuevo = e.meter(struct.pack('<%dh' % len(q), *q), 5122, 'VEC4', a.count, norm=True)
                    quitados.add('rotaciones->short')
                else:
                    nuevo = e.meter(crudo(g, blob, i), a.componentType, a.type, a.count)
                    if a.min is not None: e.acc[nuevo].min, e.acc[nuevo].max = a.min, a.max
                setattr(sm, campo, nuevo)

    while len(e.buf) % 4: e.buf.append(0)
    g.accessors = e.acc; g.bufferViews = e.vistas
    g.buffers = [Buffer(byteLength=len(e.buf))]
    g.set_binary_blob(bytes(e.buf))
    g.images = []; g.textures = []; g.samplers = []
    if usaQ[0]:
        # va como REQUERIDA y no solo usada: si el lector no la entiende, la malla sale deformada y
        # en silencio, que es peor que no cargar. three.js la soporta.
        g.extensionsUsed = sorted(set((g.extensionsUsed or []) + ['KHR_mesh_quantization']))
        g.extensionsRequired = sorted(set((g.extensionsRequired or []) + ['KHR_mesh_quantization']))
    g.save_binary(sal)
    print('%-14s %7d -> %7d bytes (%2.0f%%)  vertices %d -> %d   %s'
          % (os.path.basename(ent), os.path.getsize(ent), os.path.getsize(sal),
             100.0*os.path.getsize(sal)/os.path.getsize(ent), v0, v1, ', '.join(sorted(quitados))))

if __name__ == '__main__':
    podar(sys.argv[1], sys.argv[2])
