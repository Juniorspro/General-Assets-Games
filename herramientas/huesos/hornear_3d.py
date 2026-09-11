#!/usr/bin/env python3
"""Hornea las PIEZAS 3D de los esqueletos de HUESOS y escribe partes/i_3d.js.

    python3 herramientas/huesos/hornear_3d.py

Doce mallas de Tripo (Rezona Lab) que van a REEMPLAZAR LA GEOMETRÍA de las
piezas del kit instanciado, sin tocar el rig ni las poses. Ver el encabezado de
`pedir_3d.py` para por qué eso y no un `SkinnedMesh` riggeado.

CUATRO PASOS, Y CADA UNO RESUELVE UN PROBLEMA DISTINTO
──────────────────────────────────────────────────────
1. LA TEXTURA SE HORNEA EN LOS VÉRTICES, MUESTREANDO EL CENTROIDE DEL
   TRIÁNGULO. El atlas que devuelve Tripo es UNA ISLA POR TRIÁNGULO —miles de
   manchitas de nueve píxeles— y el UV de un vértice cae en la ESQUINA de su
   isla: agarra el borde, el relleno, o el color de la isla de al lado. El
   centroide cae adentro. Después se promedia a los vértices PESANDO POR EL
   ÁREA, porque un triángulo grande tiene que mandar más que una astilla.
   Y LA V NO SE DA VUELTA: glTF pone el origen de la textura arriba a la
   izquierda y la fila 0 de PIL también, así que la fila es `v·(H−1)`.
   (`hornear_props.py` de LEMI la da vuelta y está mal; ahí no se nota porque
   una antorcha es marrón de los dos lados.)
2. EL COLOR SE GUARDA EN sRGB DE OCHO BITS y lo convierte el juego, que es
   exactamente lo que hace `cajas()` con sus colores hexadecimales. Guardado en
   lineal de ocho bits, los oscuros se van a escalones.
3. DECIMAR CON `gltfpack -si` — y el objetivo es un NÚMERO DE TRIÁNGULOS, no un
   ratio: `-si 0.06` no está trabado, hace exactamente el 6 % de lo que se le
   dio, y lo que se le da son los 6.000 del `face_limit`. Con `-noq`, porque la
   cuantización entra como `KHR_mesh_quantization` en `extensionsRequired`.
4. Y SE COLOCA CONTRA LA CAJA QUE REEMPLAZA. Tripo devuelve la malla
   normalizada a una caja de lado 1 y orientada como se le canta: hay que
   pararla, escalarla y ponerla donde estaba el dibujo de cajas. `giro` se
   COMPRUEBA en la hoja de contactos, porque de la caja envolvente sola no sale
   para dónde mira una calavera.
"""
import base64, io, json, math, os, struct, subprocess, sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
ENT = os.path.join(RAIZ, 'assets', 'huesos')
MESHY = os.path.join(ENT, 'meshy')
TMP = '/tmp/h3d'

TAM = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
FMT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}

# ── LO QUE PASA DE LA CAJA A LA MALLA ─────────────────────────────────────────
# `caja` = (ancho, alto, hondo, cx, cy, cz): la MISMA caja que hoy dibuja
#          `cajas([...])` en el marco local del hueso. Se escala uniforme para
#          entrar y se centra ahí, así la silueta no cambia de tamaño.
# `largo` = para las piezas que son un palo (huesos largos y armas): se para
#          sobre −Y con el extremo de agarre en el origen, se escala a ese
#          largo y se corre a `desde`. Acá el fit por caja no sirve, porque lo
#          que define un fémur es su LARGO y no una caja que yo inventé.
# `giro`  = grados (x, y, z) aplicados a la malla cruda antes de nada.
# `tinte` = el color que la CAJA que reemplaza tenía (`HUE`, `OXI`, `ORO`,
#          `ACERO` de `h.js`). La media del color horneado se lleva ahí.
# `tris`  = presupuesto, Y SALE DE MEDIR CUÁNTOS PÍXELES OCUPA LA PIEZA. Un
#          bruto a 2,2 m mide el 22,5 % del alto del cuadro, y el cuadro se
#          dibuja en un destino de 372×172 que después se estira: o sea que el
#          bicho entero son **39 PÍXELES DE ALTO**, y su calavera unos SIETE.
#          Con los presupuestos de la primera tanda el cuerpo costaba 6.926
#          triángulos —cien por píxel de alto— y la escena entera 207.100
#          contra los 29.972 de las cajas. Cada pieza se dibuja INSTANCIADA
#          hasta catorce veces, así que un triángulo acá son catorce en
#          pantalla. Bajados a la mitad la silueta no cambia (se comprueba en
#          la hoja de contactos, que es lo único que puede decirlo).
# `modo` = 'caja' se centra en el origen con la arista más larga en 1, y el
#          juego la mete en la caja que reemplaza conservando la proporción.
#          'palo' se para sobre −Y con largo 1 y el agarre en el origen.
# EL HORNEADO NO COLOCA NADA, y es a propósito: colocar es trabajo de la
# receta, y la receta vive en `h.js`. Con los metros escritos también acá
# habría DOS sitios diciendo cuánto mide un fémur, y el día que se toque uno
# el otro se queda — que es exactamente lo que pasó con el largo del arma,
# que hoy sale del alcance y de un solo lado.
P = [
 # LOS TRES QUE VENÍAN DE COSTADO. Tripo devolvió el cráneo, el costillar y la
 # pelvis MIRANDO A −X, y `modo:'caja'` no orienta nada: el juego los metía en
 # su caja con un ajuste UNIFORME AL MÍNIMO, así que el eje corto de la malla
 # —que era el ancho de verdad— mandaba y aplastaba la pieza. Medido: el
 # costillar salía de 0,105 m de ancho contra los 0,34 de la caja (31 %) y la
 # pelvis 0,091 contra 0,24 (38 %). O sea que las dos masas CENTRALES —las que
 # hacen que un esqueleto se lea como UNA silueta y no como huesos sueltos—
 # desaparecían, y de ahí salía el reparto de manchas del análisis de
 # componentes conexas. +90° en Y lleva −X a +Z, que es el frente del juego.
 # Y LOS SIETE HUESOS ESTÁN EN SU PISO TOPOLÓGICO: pedirles menos no baja un
 # triángulo. Medido con `-si 0.01`, que es pedir el 1 %: cráneo 540 · costillar
 # 500 · pelvis 381 · mano 164 · pie 418 · corona 549 · yelmo 760. La razón es
 # que un hueso generado NO ES UNA CÁSCARA: el pie son unas cien islas sueltas
 # —una por huesecito— y una isla cerrada no baja de cuatro triángulos, así que
 # 104 × 4 = 418 es el fondo. Se probó `-sp` (colapsar a través de las costuras
 # de color) creyendo que el color por vértice era el freno: movió el pie de 412
 # a 418, o sea nada. El presupuesto de verdad de esta tanda no lo pone este
 # archivo, lo pone la malla.
 # PERO EL SIGNO DEL CRÁNEO ESTABA AL REVÉS, Y LA CAJA NO LO PODÍA VER. Con +90
 # la calavera quedaba con la CARA MIRANDO A −Z, o sea a la espalda del bicho:
 # medido rasterizando la malla sola desde los cuatro ejes, la vista desde +Z
 # —que es el frente del juego— devuelve el OCCIPUCIO liso y la de −Z las
 # cuencas, la abertura nasal y los dientes. Y en cuartiles de masa, el tercio
 # DE ABAJO del cráneo (maxilar y dientes, que en un cráneo van adelante) cae
 # en z 0,275 contra 0,521 del tercio de arriba, o sea sesgado a −Z.
 # De la caja envolvente eso no sale: 0,658 × 1,0 × 0,874 dice que el eje largo
 # es Z y no para qué lado mira, que es justo lo que se reportó como «las
 # calaveras tienen la cabeza para atrás».
 # O sea que la malla cruda mira a +X y no a −X: Ry(−90) lleva +X a +Z.
 # EL COSTILLAR Y LA PELVIS SE QUEDAN EN +90 A PROPÓSITO: rasterizados igual,
 # sus vistas de +Z y de −Z son indistinguibles a 500 y 383 triángulos —no hay
 # esternón ni sacro que sobreviva al decimado— así que girarlas sería cambiar
 # algo que no se puede medir. Lo que sí se midió es que su EJE LARGO queda
 # bien con +90, que es el defecto que ese giro vino a arreglar.
 dict(n='craneo',    tris=540, giro=(0, -90, 0), tinte=0xd6d0bd, modo='caja'),
 dict(n='costillar', tris=500, giro=(0, 90, 0), tinte=0xd6d0bd, modo='caja'),
 dict(n='pelvis',    tris=381, giro=(0, 90, 0), tinte=0xd6d0bd, modo='caja'),
 dict(n='humero',    tris=110, giro=(0, 0, 0), tinte=0xd6d0bd, modo='palo'),
 dict(n='femur',     tris=102, giro=(0, 0, 0), tinte=0xd6d0bd, modo='palo'),
 # LA MANO VIENE CON LOS DEDOS PARA ARRIBA y en el rig cuelga de la muñeca,
 # así que van para abajo: 180° en X. Y EL PIE VIENE ACOSTADO SOBRE X —los
 # dedos hacia +X— y el juego lo quiere a lo largo de Z, con los dedos
 # adelante: −90° en Y lleva +X a +Z.
 dict(n='mano',      tris=164, giro=(180, 0, 0), tinte=0xd6d0bd, modo='caja'),
 dict(n='pie',       tris=418, giro=(0, -90, 0), tinte=0xd6d0bd, modo='caja'),
 dict(n='corona',    tris=549, giro=(0, 0, 0), tinte=0xc8a13a, modo='caja'),
 dict(n='espada',    tris=200, giro=(0, 0, 0), tinte=0x6a5a48, modo='palo'),
 dict(n='lanza',     tris=150, giro=(0, 0, 0), tinte=0x6a5a48, modo='palo'),
 dict(n='mazo',      tris=200, giro=(0, 0, 0), tinte=0x6a5a48, modo='palo'),
 dict(n='espadon',   tris=240, giro=(0, 0, 0), tinte=0x6a5a48, modo='palo'),
 dict(n='esphero',   tris=260, giro=(0, 0, 0), tinte=0x7d848c, modo='palo'),
 dict(n='yelmo',     tris=760, giro=(0, 0, 0), tinte=0x7d848c, modo='caja'),
 # ── LA ARMADURA DEL CABALLERO (vuelta 153) ────────────────────────────────
 # HAY UN SOLO HÉROE, así que su kit tiene UNA instancia por pieza: el
 # presupuesto de acá no se multiplica por catorce como el de la turba y por
 # eso son más generosos que los huesos. Y el `giro` de las seis arranca en
 # cero y se CORRIGE contra la hoja de contactos, que es la única forma de
 # saber para dónde mira una placa de acero — de la caja envolvente sale el
 # eje largo y nada más. Medido: el peto y el faldar vinieron con el ANCHO de
 # hombros sobre Z y el frente sobre +X (en la hoja, la vista +X es la que
 # muestra el quillón del pecho y las dos hombreras, y la −X el respaldo
 # liso), así que van con −90 en Y, que es el giro que lleva +X a +Z. Y la
 # greba vino con el escarpe apuntando a −Z, o sea con el pie hacia atrás:
 # media vuelta. Va de `palo` y no de `caja` porque lo que la define es el
 # largo de la canilla, que es lo que el juego escala.
 dict(n='peto',      tris=700, giro=(0, -90, 0), tinte=0x7d848c, modo='caja'),
 dict(n='faldar',    tris=350, giro=(0, -90, 0), tinte=0x7d848c, modo='caja'),
 dict(n='brazal',    tris=260, giro=(0, 0, 0), tinte=0x7d848c, modo='palo'),
 dict(n='guante',    tris=320, giro=(0, 0, 0), tinte=0x7d848c, modo='palo'),
 dict(n='quijote',   tris=280, giro=(0, 0, 0), tinte=0x7d848c, modo='palo'),
 dict(n='greba',     tris=420, giro=(0, 180, 0), tinte=0x7d848c, modo='palo'),
]


def carga(p):
    b = io.open(p, 'rb').read()
    assert b[:4] == b'glTF', p + ' no es un GLB'
    largo = struct.unpack('<I', b[8:12])[0]
    i, js, bn = 12, None, b''
    while i < largo:
        n, t = struct.unpack('<II', b[i:i + 8])
        d = b[i + 8:i + 8 + n]
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
        raw = b''.join(bn[base + k * paso: base + k * paso + anch] for k in range(a['count']))
    v = np.frombuffer(raw, dtype=np.dtype('<' + FMT[a['componentType']]))
    return v.reshape(a['count'], COMP[a['type']])


def color_en_vertices(ent, sal):
    """la textura, horneada en COLOR_0 muestreando el CENTROIDE de cada triángulo"""
    js, bn = carga(ent)
    img = js['images'][0]
    bv = js['bufferViews'][img['bufferView']]
    o = bv.get('byteOffset', 0)
    TX = np.asarray(Image.open(io.BytesIO(bn[o:o + bv['byteLength']])).convert('RGB'))
    H, W, _ = TX.shape

    nuevo, remap = bytearray(), {}
    for k, b in enumerate(js['bufferViews']):
        if k == img['bufferView']: continue
        oo, nn = b.get('byteOffset', 0), b['byteLength']
        while len(nuevo) % 4: nuevo.append(0)
        remap[k] = len(nuevo)
        nuevo.extend(bn[oo:oo + nn])

    for m in js['meshes']:
        for p in m['primitives']:
            at = p['attributes']
            uv = leer(js, bn, at['TEXCOORD_0']).astype(np.float64)
            pos = leer(js, bn, at['POSITION']).astype(np.float64)
            idx = leer(js, bn, p['indices']).astype(np.int64).reshape(-1, 3)
            cen = (uv[idx[:, 0]] + uv[idx[:, 1]] + uv[idx[:, 2]]) / 3.0
            u = np.clip((cen[:, 0] % 1.0) * (W - 1), 0, W - 1).astype(np.int32)
            v = np.clip((cen[:, 1] % 1.0) * (H - 1), 0, H - 1).astype(np.int32)   # SIN voltear
            ct = TX[v, u].astype(np.float64) / 255.0
            # el área de cada triángulo es el peso: una astilla no puede mandar
            # lo mismo que una cara grande
            e1 = pos[idx[:, 1]] - pos[idx[:, 0]]
            e2 = pos[idx[:, 2]] - pos[idx[:, 0]]
            ar = 0.5 * np.linalg.norm(np.cross(e1, e2), axis=1) + 1e-12
            acc = np.zeros((pos.shape[0], 3)); pes = np.zeros(pos.shape[0])
            for k in range(3):
                np.add.at(acc, idx[:, k], ct * ar[:, None])
                np.add.at(pes, idx[:, k], ar)
            col = np.clip(acc / np.maximum(pes, 1e-12)[:, None], 0, 1)
            # se guarda en sRGB: lo convierte el juego, igual que con los hex de `cajas()`
            d = col.astype(np.float32).tobytes()
            while len(nuevo) % 4: nuevo.append(0)
            js['bufferViews'].append({'buffer': 0, 'byteOffset': len(nuevo), 'byteLength': len(d)})
            nuevo.extend(d)
            js['accessors'].append({'bufferView': len(js['bufferViews']) - 1,
                                    'componentType': 5126, 'count': int(col.shape[0]),
                                    'type': 'VEC3',
                                    'min': [float(col[:, i].min()) for i in range(3)],
                                    'max': [float(col[:, i].max()) for i in range(3)]})
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
        # el material se limpia ENTERO: dejando `normalTexture` o
        # `metallicRoughnessTexture` apuntando a una textura que ya no existe,
        # gltfpack contesta «invalid GLTF» sin decir cuál
        mt.pop('normalTexture', None); mt.pop('occlusionTexture', None)
        mt.pop('emissiveTexture', None); pbr.pop('metallicRoughnessTexture', None)
    viejo = img['bufferView']
    js['bufferViews'] = [b for k, b in enumerate(js['bufferViews']) if k != viejo]
    for a in js['accessors']:
        if a.get('bufferView') is not None and a['bufferView'] > viejo:
            a['bufferView'] -= 1
    js['buffers'] = [{'byteLength': len(nuevo)}]
    guarda(sal, js, bytes(nuevo))


def malla(p):
    """lee el GLB YA DECIMADO y devuelve (pos, nor, col, idx) con las
    transformaciones de nodo aplicadas — un GLB de Tripo trae la malla colgada
    de un nodo con su propia escala, y leer los accesores pelados la deja del
    tamaño y en el sitio equivocados"""
    js, bn = carga(p)
    PP, NN, CC, II = [], [], [], []
    base = 0

    def nodo(i, M):
        nonlocal base
        n = js['nodes'][i]
        L = np.eye(4)
        if 'matrix' in n:
            L = np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
        else:
            t = n.get('translation', [0, 0, 0]); r = n.get('rotation', [0, 0, 0, 1])
            s = n.get('scale', [1, 1, 1])
            x, y, z, w = r
            R = np.array([
                [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
            L[:3, :3] = R @ np.diag(s); L[:3, 3] = t
        M = M @ L
        if 'mesh' in n:
            for pr in js['meshes'][n['mesh']]['primitives']:
                at = pr['attributes']
                v = leer(js, bn, at['POSITION']).astype(np.float64)
                v = (M[:3, :3] @ v.T).T + M[:3, 3]
                if 'NORMAL' in at:
                    nn = leer(js, bn, at['NORMAL']).astype(np.float64)
                    nn = (np.linalg.inv(M[:3, :3]).T @ nn.T).T
                else:
                    nn = np.zeros_like(v); nn[:, 1] = 1
                if 'COLOR_0' in at:
                    a = js['accessors'][at['COLOR_0']]
                    c = leer(js, bn, at['COLOR_0']).astype(np.float64)[:, :3]
                    # gltfpack devuelve COLOR_0 en VEC4 de bytes normalizados aunque
                    # se le pase -noq: leído como floats sin normalizar sale blanco
                    # puro con motas. El tipo se lee del accesor, no se supone.
                    if a['componentType'] == 5121: c /= 255.0
                    elif a['componentType'] == 5123: c /= 65535.0
                else:
                    c = np.ones_like(v)
                PP.append(v); NN.append(nn); CC.append(c)
                II.append(leer(js, bn, pr['indices']).astype(np.int64).ravel() + base)
                base += v.shape[0]
        for h in n.get('children', []):
            nodo(h, M)

    for i in js['scenes'][js.get('scene', 0)]['nodes']:
        nodo(i, np.eye(4))
    pos = np.concatenate(PP); nor = np.concatenate(NN); col = np.concatenate(CC)
    ln = np.linalg.norm(nor, axis=1, keepdims=True)
    nor = nor / np.maximum(ln, 1e-9)
    return pos, nor, col, np.concatenate(II)


def normaliza(d, pos, nor):
    """deja la malla en un marco canónico; la escala y el sitio los pone el juego"""
    g = [math.radians(x) for x in d['giro']]
    for eje, a in enumerate(g):
        if abs(a) < 1e-9: continue
        c, s = math.cos(a), math.sin(a)
        R = np.eye(3)
        i, j = [(1, 2), (2, 0), (0, 1)][eje]
        R[i, i] = c; R[i, j] = -s; R[j, i] = s; R[j, j] = c
        pos = (R @ pos.T).T; nor = (R @ nor.T).T

    if d['modo'] == 'palo':
        # el eje más largo pasa a Y: lo que define un fémur o una lanza es su
        # LARGO, así que ése es el eje que el juego va a escalar
        mn, mx = pos.min(axis=0), pos.max(axis=0)
        eje = int(np.argmax(mx - mn))
        if eje != 1:
            o = [1, 0, 2] if eje == 0 else [0, 2, 1]
            pos = pos[:, o]; nor = nor[:, o]
        mn, mx = pos.min(axis=0), pos.max(axis=0)
        L = max(mx[1] - mn[1], 1e-9)
        # el agarre arriba, en el origen, y el resto colgando: es el convenio
        # del rig —«la pieza cuelga media longitud más abajo del pivote»—
        pos = (pos - np.array([(mn[0] + mx[0]) / 2, mx[1], (mn[2] + mx[2]) / 2])) / L
        nor = nor
    else:
        mn, mx = pos.min(axis=0), pos.max(axis=0)
        e = max(float(np.max(mx - mn)), 1e-9)
        pos = (pos - (mn + mx) / 2) / e
    return pos, nor


def a_tinte(col, hexa):
    """lleva el color medio de la malla AL COLOR QUE LA CAJA TENÍA, canal por
    canal y en lineal, conservando la variación interna.

    Es la regla 7 del horneado en su versión de color por vértice: la foto que
    Tripo devuelve trae su propia luz de estudio, y acá salía un ocre cálido de
    158/130/85 contra el 214/208/189 del hueso dibujado —un 40 % más oscuro y
    cuatro veces más saturado—. Multiplicado por el tinte de la clase y por la
    luz del bosque eso se va a barro y el bicho se pierde contra el pasto. Lo
    que la foto aporta —la mugre en las grietas, la mancha— vive en la
    VARIACIÓN, no en la media, así que la media se reemplaza y la variación se
    conserva.
    Va CANAL POR CANAL y no por luma a propósito: el sesgo cálido es de la luz
    del render, no del hueso, así que corregirlo es parte del trabajo."""
    t = np.array([(hexa >> 16) & 255, (hexa >> 8) & 255, hexa & 255], float) / 255
    lin = lambda v: np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    srgb = lambda v: np.where(v <= 0.0031308, v * 12.92, 1.055 * v ** (1 / 2.4) - 0.055)
    cl = lin(col)
    m = np.maximum(cl.mean(axis=0), 1e-6)
    return np.clip(srgb(np.clip(cl * (lin(t) / m), 0, 1)), 0, 1)


def suelda(pos, nor, col, idx):
    """dedup por posición Y normal cuantizadas: sin la normal se pierden las
    aristas duras de una hoja de espada; sin soldar, todo va a tres vértices
    por triángulo y el blob pesa el triple"""
    k = np.round(np.concatenate([pos * 4096, nor * 64, col * 32], axis=1)).astype(np.int64)
    _, uniq, inv = np.unique(k, axis=0, return_index=True, return_inverse=True)
    inv = np.asarray(inv).reshape(-1)
    # `uniq[j]` es el índice ORIGINAL de la primera aparición de la clave j, y
    # `inv[i]` la clave de la fila i. Se conserva el orden de aparición —mejor
    # localidad de caché— así que `orden` ordena las claves por ese índice y
    # `nuevo` es su INVERSA: dónde quedó cada clave en la lista nueva.
    # OJO: la inversa de una permutación es `argsort` UNA vez. Acá había un
    # `argsort` de más —o sea el RANGO en vez de la inversa— y eso no rompe
    # ruidosamente: revuelve el búfer de índices. En un palo o una espada se
    # sigue leyendo a palo y por eso duró; en el costillar y en la pelvis
    # convertía las costillas y los agujeros en una maraña de púas. Se
    # comprueba comparando los CENTROIDES de los triángulos antes y después,
    # que es lo único que prueba que los triángulos son los mismos.
    orden = np.argsort(uniq)
    nuevo = np.empty(orden.shape[0], dtype=np.int64)
    nuevo[orden] = np.arange(orden.shape[0])
    sel = uniq[orden]
    return pos[sel], nor[sel], col[sel], nuevo[inv][idx]


def blob(pos, nor, col, idx):
    mn, mx = pos.min(axis=0), pos.max(axis=0)
    ran = np.maximum(mx - mn, 1e-9)
    q = np.round((pos - mn) / ran * 65535).astype('<u2')
    n8 = np.clip(np.round(nor * 127), -127, 127).astype('<i1')
    c8 = np.clip(np.round(col * 255), 0, 255).astype('<u1')
    b = bytearray()
    b += struct.pack('<II', pos.shape[0], idx.shape[0])
    b += struct.pack('<6f', *mn.astype(np.float32), *ran.astype(np.float32))
    b += q.tobytes()
    b += n8.tobytes()
    while len(b) % 2: b.append(0)
    b += c8.tobytes()
    while len(b) % 2: b.append(0)
    b += idx.astype('<u2').tobytes()
    return bytes(b)


def main():
    os.makedirs(TMP, exist_ok=True)
    out, inf, modos = [], [], []
    for d in P:
        n = d['n']
        # MESHY PRIMERO, TRIPO DE RESPALDO. No es una preferencia de gusto: Meshy
        # remalla de verdad —`model_type:lowpoly` + `should_remesh` +
        # `target_polycount` desde cien— así que entrega una cáscara cerrada al
        # número pedido, mientras que la de Tripo es un centenar de islas sueltas
        # que se topan en su piso topológico (cráneo 540, costillar 500, pie 418:
        # pedirles menos no baja un triángulo). La receta para pedirlas está en
        # `herramientas/huesos/meshy.py`, con por qué hay que pedirlas a mano.
        ent = os.path.join(MESHY, n + '.glb')
        fuente = 'meshy'
        if not os.path.exists(ent):
            ent, fuente = os.path.join(ENT, n + '.glb'), 'tripo'
        if not os.path.exists(ent):
            print('  falta', ent); continue
        vc = os.path.join(TMP, n + '_vc.glb')
        color_en_vertices(ent, vc)
        js, _ = carga(vc)
        cru = sum(js['accessors'][pr['indices']]['count'] // 3
                  for m in js['meshes'] for pr in m['primitives'])
        # el objetivo es un NÚMERO de triángulos: el ratio se calcula contra lo
        # que la malla trae de verdad, no contra el face_limit que se pidió
        ratio = max(0.01, min(1.0, d['tris'] / max(cru, 1)))
        dec = os.path.join(TMP, n + '_d.glb')
        # LO QUE YA ENTRA NO SE DECIMA. Una malla de Meshy pedida a low-poly
        # puede llegar por debajo del presupuesto, y ahí gltfpack no tiene nada
        # que hacer: correrlo igual sólo puede sacarle detalle a cambio de cero
        # triángulos. Con Tripo esta rama no se toca nunca —llegan con un millón.
        if cru <= d['tris']:
            dec = vc
        # `-sa` es la simplificación AGRESIVA, que ignora la topología. Se probó
        # sacarla para el costillar y la pelvis creyendo que soldaba las
        # costillas —salían una losa— y NO ERA ESO: era el búfer de índices
        # revuelto de `suelda`. Con los índices bien, `-sa` a 1.802 triángulos
        # conserva las doce costillas y sus huecos, contra 5.304 sin ella, y a
        # 372×172 las dos imágenes son la misma. O sea la tercera parte de los
        # triángulos por el mismo dibujo. Queda puesta.
        # `-sp` QUEDA PUESTO Y NO HACE NADA CON LAS MALLAS DE TRIPO, y conviene
        # decirlo porque este mismo comentario decía antes lo contrario. Lo puse
        # creyendo que el freno era el color por vértice —el simplificador no
        # colapsa a través de una discontinuidad de atributo, y el horneado deja
        # una en cada costura—. Medido: el pie fue de 412 a 418 triángulos, o sea
        # nada. El freno no es el color, es la TOPOLOGÍA: un pie de Tripo son unas
        # cien islas sueltas y una isla cerrada no baja de cuatro triángulos.
        # Se queda porque con una malla CERRADA —la de Meshy— sí es lo correcto:
        # ahí la única discontinuidad que queda es la de color.
        if dec != vc:
            subprocess.run(['npx', '--yes', 'gltfpack', '-si', '%.4f' % ratio, '-sa', '-sp',
                            '-kn', '-noq', '-i', vc, '-o', dec], check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        pos, nor, col, idx = malla(dec)
        col = a_tinte(col, d['tinte'])
        pos, nor = normaliza(d, pos, nor)
        pos, nor, col, idx = suelda(pos, nor, col, idx)
        b = blob(pos, nor, col, idx)
        out.append("  %s: '%s'" % (n, base64.b64encode(b).decode('ascii')))
        mn, mx = pos.min(axis=0), pos.max(axis=0)
        modos.append("  %s: '%s'" % (n, d['modo']))
        inf.append((n + ('*' if fuente == 'meshy' else ''),
                    cru, idx.shape[0] // 3, pos.shape[0], len(b),
                    tuple(round(float(x), 3) for x in (mx - mn)),
                    tuple(round(float(x), 3) for x in (mn + mx) / 2)))

    txt = ("\n/* ══════════════ LAS DOCE PIEZAS 3D DE LOS ESQUELETOS ══════════════\n"
           "   Generadas con Rezona Lab — Tripo por la llave de API, Meshy si hay\n"
           "   un GLB en assets/huesos/meshy/ (ver herramientas/huesos/meshy.py) —\n"
           "   con la textura horneada en los\n"
           "   vértices y decimadas con `herramientas/huesos/hornear_3d.py`.\n"
           "   REEMPLAZAN LA GEOMETRÍA DE UNA PIEZA DEL KIT, no el rig: las nueve\n"
           "   poses, el patinaje cero, la corona con matriz cero y el tinte por\n"
           "   cuerpo siguen siendo los mismos. Y NO REEMPLAZAN NADA HASTA QUE\n"
           "   LLEGAN: el juego arranca con las cajas y esto las pisa cuando\n"
           "   termina de decodificar, así que un base64 roto cuesta una pieza y\n"
           "   no la pantalla entera.\n"
           "   FORMATO: u32 nVert, u32 nIdx · 3f mínimo, 3f rango · u16 pos[3n]\n"
           "   · i8 nor[3n] · u8 col[3n] en sRGB · u16 idx[m].\n"
           "   NORMALIZADAS: 'caja' viene centrada con la arista mayor en 1 y\n"
           "   'palo' parado sobre −Y con largo 1 y el agarre en el origen. La\n"
           "   escala y el sitio los pone la receta, que es donde ya viven los\n"
           "   metros — con los números también acá habría dos sitios diciendo\n"
           "   cuánto mide un fémur.                                          */\n"
           "const H3_B64 = {\n" + ",\n".join(out) + "\n};\n"
           "const H3_MODO = {\n" + ",\n".join(modos) + "\n};\n")
    io.open(os.path.join(AQUI, 'partes', 'i_3d.js'), 'w', encoding='utf8').write(txt)

    print('%-10s %7s %6s %6s %8s  %-22s %s' % ('pieza', 'crudo', 'tri', 'vert', 'bytes',
                                               'tamaño (x,y,z)', 'centro'))
    for n, c, t, v, b, e, ce in inf:
        print('%-10s %7d %6d %6d %8d  %-22s %s' % (n, c, t, v, b, e, ce))
    print('\ntotal %d bytes, %d en base64' % (sum(i[4] for i in inf),
                                              len(txt)))
    print('(* = malla de Meshy; el resto, de Tripo — ver herramientas/huesos/meshy.py)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
