#!/usr/bin/env python3
"""Le agrega al personaje generado lo que el generador NO da: ojos, párpados,
mandíbula y mochila, cada uno con su hueso.

    python3 herramientas/barrio/riggear.py

POR QUE HACE FALTA: el riggeado automático devuelve un esqueleto humanoide de
veinticuatro huesos -caderas, columna, brazos, piernas, cuello y cabeza- y
ninguno más. Los ojos, los párpados y la mandíbula NO EXISTEN en ningún
riggeador automático, y en este modelo los ojos ni siquiera son geometría: son
dos manchas oscuras pintadas en la textura. Un párpado no se puede animar sobre
una malla que no tiene párpado.

Así que se agregan las dos cosas a la vez: los huesos Y la geometría que
mueven. Todo va DESPUÉS de decimar, porque el simplificador se comería justo lo
que se acaba de poner -y el ojo mide un centímetro.

EL ESQUELETO SE PASA A METROS. El rig viene en centímetros con un `Armature`
que escala por 0,01, y esa mezcla ya costó una vuelta en el visor 3D: un
desplazamiento puesto a ojo en metros deja los ojos a ocho metros de la cabeza.
Multiplicando cada traslación por 0,01 y sacándole la escala al Armature, el
espacio de los huesos y el de los vértices pasan a ser el mismo.
"""
import base64, io, json, os, sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glb

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))

# ── LAS MEDIDAS, TODAS MEDIDAS SOBRE EL MODELO Y NO ELEGIDAS ──
# El ojo sale de promediar los vértices oscuros de la ventana de la cara; el
# frente de la cara, del perfil de `z` máximo por altura.
# EL OJO SE ENCONTRO CONTANDO VERTICES OSCUROS POR FRANJA DE ALTURA, y esa
# cuenta corrigio el primer intento: promediando todos los vertices oscuros de
# la cara salia y=1,646, y ahi lo que hay son las CEJAS. El histograma muestra
# dos grupos separados por un hueco -uno en 1,575..1,610 y otro en 1,635..1,665-
# y el de abajo es el de los ojos. Con el valor promediado, los dos globos
# quedaban cuatro centimetros por encima de las manchas pintadas.
OJO_X, OJO_Y = 0.0435, 1.6060
# EL OJO VA GRANDE PORQUE LA CABEZA ES GRANDE. Esta cabeza mide treinta y cinco
# centimetros -es un personaje estilizado, no una persona- asi que un globo de
# radio anatomico (1,2 cm) se lee a alfiler: medido en la ampliacion, dos puntos
# de tres pixeles perdidos en la cuenca. El radio va escalado con la cabeza.
OJO_R, PARP_R = 0.0166, 0.0184
# la cara llega a z=0,1651 en esa franja: el globo asoma 2,6 mm y nada mas
OJO_Z = 0.1651 - OJO_R + 0.0030
MAND_Y, MAND_Z = 1.5850, -0.0250      # la bisagra, a la altura de la oreja


def esfera(cx, cy, cz, rx, ry, rz, seg=10, ani=7, t0=0.0, t1=np.pi):
    """Una esfera (o un casquete) como la de three.js: theta desde el polo +Y."""
    P, N, I = [], [], []
    for i in range(ani + 1):
        th = t0 + (t1 - t0) * i / ani
        for j in range(seg + 1):
            ph = 2 * np.pi * j / seg
            x, y, z = np.sin(th) * np.cos(ph), np.cos(th), np.sin(th) * np.sin(ph)
            P.append((cx + x*rx, cy + y*ry, cz + z*rz))
            n = np.array([x/max(rx, 1e-6), y/max(ry, 1e-6), z/max(rz, 1e-6)])
            N.append(tuple(n / (np.linalg.norm(n) or 1)))
    for i in range(ani):
        for j in range(seg):
            a = i*(seg+1) + j; b = a + seg + 1
            I += [a, b, a+1, b, b+1, a+1]
    return np.array(P, np.float32), np.array(N, np.float32), np.array(I, np.int64)


def caja(cx, cy, cz, sx, sy, sz):
    h = np.array([sx, sy, sz]) / 2.0
    c = np.array([cx, cy, cz])
    P, N, I = [], [], []
    caras = [((1,0,0),(0,1,0),(0,0,1)), ((-1,0,0),(0,1,0),(0,0,-1)),
             ((0,1,0),(0,0,1),(1,0,0)), ((0,-1,0),(0,0,-1),(1,0,0)),
             ((0,0,1),(0,1,0),(-1,0,0)), ((0,0,-1),(0,1,0),(1,0,0))]
    for n, u, v in caras:
        n, u, v = np.array(n), np.array(u), np.array(v)
        b = len(P)
        for su, sv in ((-1,-1), (1,-1), (1,1), (-1,1)):
            P.append(tuple(c + n*h + (u*su + v*sv)*h*(1-np.abs(n))))
            N.append(tuple(n))
        I += [b, b+1, b+2, b, b+2, b+3]
    return np.array(P, np.float32), np.array(N, np.float32), np.array(I, np.int64)


def main():
    ent = '/tmp/m4/pj_dec.glb'
    js, bn = glb.carga(ent)
    sk = js['skins'][0]
    nodos, joints = js['nodes'], sk['joints']
    nom = [nodos[j].get('name', '?') for j in joints]

    # ── 1. EL ESQUELETO PASA A METROS ──
    for j in joints:
        n = nodos[j]
        if 'translation' in n: n['translation'] = [v * 0.01 for v in n['translation']]
        n.pop('scale', None)
    for n in nodos:
        if n.get('name') == 'Armature': n.pop('scale', None)
    ibm = glb.leer(js, bn, sk['inverseBindMatrices']).reshape(-1, 4, 4).astype(np.float64)
    Wm = np.array([np.linalg.inv(m.T) for m in ibm])          # bind, en metros
    # el bind en metros ya no lleva la escala 0,01: se le saca del 3x3
    for k in range(len(Wm)): Wm[k][:3, :3] *= 100.0
    padre_de = glb.arbol(js)

    def nuevo_hueso(nombre, papa, p):
        """Un hueso hijo con bind sin rotación en `p` (metros, espacio de malla)."""
        kp = nom.index(papa)
        Wp = Wm[kp]
        L = np.linalg.inv(Wp) @ np.array([[1,0,0,p[0]],[0,1,0,p[1]],[0,0,1,p[2]],[0,0,0,1]])
        nodos.append({'name': nombre,
                      'translation': [float(L[0,3]), float(L[1,3]), float(L[2,3])],
                      'rotation': list(_quat(L[:3, :3]))})
        i = len(nodos) - 1
        nodos[joints[kp]].setdefault('children', []).append(i)
        joints.append(i); nom.append(nombre)
        W = np.eye(4); W[:3, 3] = p
        return len(joints) - 1, W

    def _quat(R):
        t = R[0,0] + R[1,1] + R[2,2]
        if t > 0:
            s = np.sqrt(t + 1.0) * 2
            return ((R[2,1]-R[1,2])/s, (R[0,2]-R[2,0])/s, (R[1,0]-R[0,1])/s, 0.25*s)
        i = int(np.argmax([R[0,0], R[1,1], R[2,2]]))
        if i == 0:
            s = np.sqrt(1.0 + R[0,0] - R[1,1] - R[2,2]) * 2
            return (0.25*s, (R[0,1]+R[1,0])/s, (R[0,2]+R[2,0])/s, (R[2,1]-R[1,2])/s)
        if i == 1:
            s = np.sqrt(1.0 + R[1,1] - R[0,0] - R[2,2]) * 2
            return ((R[0,1]+R[1,0])/s, 0.25*s, (R[1,2]+R[2,1])/s, (R[0,2]-R[2,0])/s)
        s = np.sqrt(1.0 + R[2,2] - R[0,0] - R[1,1]) * 2
        return ((R[0,2]+R[2,0])/s, (R[1,2]+R[2,1])/s, 0.25*s, (R[1,0]-R[0,1])/s)

    Wnuevos = []
    HUESOS = {}
    for nb, pa, p in [
        ('ojoI',     'Head',    ( OJO_X, OJO_Y, OJO_Z)),
        ('ojoD',     'Head',    (-OJO_X, OJO_Y, OJO_Z)),
        ('parpSupI', 'Head',    ( OJO_X, OJO_Y, OJO_Z)),
        ('parpInfI', 'Head',    ( OJO_X, OJO_Y, OJO_Z)),
        ('parpSupD', 'Head',    (-OJO_X, OJO_Y, OJO_Z)),
        ('parpInfD', 'Head',    (-OJO_X, OJO_Y, OJO_Z)),
        ('mandibula','Head',    (0.0, MAND_Y, MAND_Z)),
        ('mochila',  'Spine01', (0.0, 1.2000, -0.1000))]:
        k, W = nuevo_hueso(nb, pa, p)
        HUESOS[nb] = k; Wnuevos.append(W)

    # ── 2. LA MALLA QUE VA CON ESOS HUESOS ──
    pr = js['meshes'][0]['primitives'][0]
    P = glb.leer(js, bn, pr['attributes']['POSITION']).astype(np.float32)
    N = glb.leer(js, bn, pr['attributes']['NORMAL']).astype(np.float32)
    C = glb.leer(js, bn, pr['attributes']['COLOR_0']).astype(np.float32)[:, :3]
    J = glb.leer(js, bn, pr['attributes']['JOINTS_0']).astype(np.int32)
    Wt = glb.leer(js, bn, pr['attributes']['WEIGHTS_0']).astype(np.float32)
    I = glb.leer(js, bn, pr['indices']).reshape(-1).astype(np.int64)

    piezas = []       # (P, N, I, color, hueso)
    def sRGB(h):
        c = np.array([(h >> 16 & 255), (h >> 8 & 255), (h & 255)], np.float64) / 255.0
        return np.where(c <= 0.04045, c/12.92, ((c+0.055)/1.055)**2.4).astype(np.float32)

    for s, suf in ((1, 'I'), (-1, 'D')):
        cx = s * OJO_X
        # el globo, el iris y la pupila cuelgan del hueso del OJO: girando ese
        # hueso la mirada se mueve sobre la esfera por construcción
        piezas.append((*esfera(cx, OJO_Y, OJO_Z, OJO_R, OJO_R, OJO_R, 10, 7), sRGB(0xb9bcc4), 'ojo'+suf))
        # EL IRIS Y LA PUPILA VAN APENAS SALIDOS DEL GLOBO, no clavados en su
        # superficie. Con la pupila terminando por dentro del globo, lo que se ve
        # en el centro del ojo es la ESCLEROTICA asomando por delante de ella:
        # medido en la ampliacion, un punto claro en el medio del iris, o sea el
        # ojo dado vuelta. Cada disco termina un dos por ciento mas afuera que el
        # anterior y el orden queda garantizado por la geometria y no por el
        # orden de dibujo.
        piezas.append((*esfera(cx, OJO_Y, OJO_Z + OJO_R*0.78, OJO_R*0.60, OJO_R*0.60, OJO_R*0.24, 10, 5),
                       sRGB(0x35505c), 'ojo'+suf))
        piezas.append((*esfera(cx, OJO_Y, OJO_Z + OJO_R*0.86, OJO_R*0.30, OJO_R*0.30, OJO_R*0.18, 9, 4),
                       sRGB(0x08090b), 'ojo'+suf))
        # los párpados: casquetes de una esfera un pelo más grande y concéntrica,
        # así sobresalen del globo y hacen el bulto del párpado por construcción
        piezas.append((*esfera(cx, OJO_Y, OJO_Z, PARP_R, PARP_R, PARP_R, 10, 4, 0.0, np.pi*0.52),
                       sRGB(0xc39a80), 'parpSup'+suf))
        piezas.append((*esfera(cx, OJO_Y, OJO_Z, PARP_R*0.99, PARP_R*0.99, PARP_R*0.99, 10, 4, np.pi*0.48, np.pi),
                       sRGB(0xbb9078), 'parpInf'+suf))

    # ── EL TAPON DEL CUELLO ──
    # En primera persona la cabeza se achica a la centesima parte, y una cabeza
    # que desaparece deja un AGUJERO: el cuello del modelo esta abierto por
    # arriba porque ahi empezaba el craneo. Medido en la captura, mirando hacia
    # abajo el cuadro entero era el forro de la campera visto desde adentro.
    # Un casquete pegado al hueso del cuello lo tapa, y desde afuera no se ve
    # porque queda por dentro de la cabeza.
    piezas.append((*esfera(0.0, 1.4830, -0.0080, 0.0640, 0.0520, 0.0600, 10, 6),
                   sRGB(0x3b4048), 'neck'))

    # ── LA MOCHILA ──
    # El generador no la puso: leyó las correas como parte de la campera. Va por
    # código, que además es lo que garantiza que las DOS CORREAS se vean en
    # primera persona al mirarse el pecho — que es la única señal de que uno
    # lleva mochila cuando no se ve la espalda.
    # el fondo de la espalda esta medido: la capucha llega a z=-0,191 a la altura
    # de los hombros, asi que la mochila arranca en -0,185 y no antes
    piezas.append((*caja(0, 1.225, -0.265, 0.285, 0.330, 0.160), sRGB(0x2f333a), 'mochila'))
    piezas.append((*caja(0, 1.398, -0.256, 0.250, 0.078, 0.148), sRGB(0x262a30), 'mochila'))
    piezas.append((*caja(0, 1.058, -0.262, 0.245, 0.058, 0.145), sRGB(0x262a30), 'mochila'))
    # el bolsillo de atras: es lo unico que le da fondo a la mochila vista de
    # espaldas, que si no es un rectangulo oscuro y plano
    piezas.append((*caja(0, 1.168, -0.352, 0.205, 0.140, 0.028), sRGB(0x3c4149), 'mochila'))
    piezas.append((*caja(0, 1.318, -0.350, 0.150, 0.030, 0.024), sRGB(0x4c525c), 'mochila'))
    # LAS CORREAS SIGUEN EL PECHO ESCALON POR ESCALON, con las alturas medidas
    # sobre el modelo (z maximo del torso a cada altura). Una correa recta
    # atraviesa el pecho a la altura del esternon y sale por el otro lado.
    for s in (1, -1):
        piezas.append((*caja(s*0.104, 1.412, 0.020, 0.060, 0.052, 0.300), sRGB(0x4c525c), 'Spine'))
        piezas.append((*caja(s*0.100, 1.332, -0.178, 0.056, 0.120, 0.062), sRGB(0x4c525c), 'Spine'))
        for yy, zz, dz in ((1.355, 0.102, 0.060), (1.300, 0.128, 0.052),
                           (1.245, 0.150, 0.046), (1.192, 0.168, 0.042)):
            piezas.append((*caja(s*0.096, yy, zz, 0.056, 0.062, dz), sRGB(0x4c525c), 'Spine'))

    Pn, Nn, Cn, Jn, Wn, In = [P], [N], [C], [J], [Wt], [I]
    base = P.shape[0]
    for pp, nn, ii, col, hueso in piezas:
        k = HUESOS.get(hueso, nom.index(hueso) if hueso in nom else None)
        Pn.append(pp); Nn.append(nn)
        Cn.append(np.tile(col.astype(np.float32), (pp.shape[0], 1)))
        j4 = np.zeros((pp.shape[0], 4), np.int32); j4[:, 0] = k
        w4 = np.zeros((pp.shape[0], 4), np.float32); w4[:, 0] = 1.0
        Jn.append(j4); Wn.append(w4); In.append(ii + base)
        base += pp.shape[0]

    P = np.concatenate(Pn); N = np.concatenate(Nn); C = np.concatenate(Cn)
    J = np.concatenate(Jn); Wt = np.concatenate(Wn); I = np.concatenate(In)

    # ── 3. LA MANDÍBULA SE LLEVA LA PARTE DE ABAJO DE LA CARA ──
    # No alcanza con poner el hueso: hay que darle vértices. Se le pasa peso a lo
    # que está por debajo del labio y adelante de la bisagra, con una rampa —con
    # un corte duro, abrir la boca parte la cara en dos.
    kM = HUESOS['mandibula']; kH = nom.index('Head')
    esCab = (J == kH) & (Wt > 0.5)
    dueño = esCab.any(axis=1)
    yy, zz = P[:, 1], P[:, 2]
    k = np.clip((MAND_Y - 0.028 - yy) / 0.060, 0, 1) * np.clip((zz + 0.02) / 0.05, 0, 1)
    k = np.where(dueño & (P[:, 1] < MAND_Y), k, 0.0) * 0.92
    mov = k > 0.02
    for i in np.nonzero(mov)[0]:
        Wt[i] *= (1.0 - k[i])
        q = int(np.argmin(Wt[i]))
        J[i, q] = kM; Wt[i, q] = k[i]
        Wt[i] /= Wt[i].sum()
    print('mandíbula: %d vértices con peso (máx %.2f)' % (mov.sum(), k.max()))

    # ── 3b. LA MANCHA PINTADA DEL OJO SE ACLARA ──
    # Los ojos del modelo son dos manchas negras en la textura, y el globo nuevo
    # no las tapa entera: alrededor queda un borde negro que se lee a ojera. Se
    # llevan al color de la piel oscurecido, que es lo que hace una cuenca.
    piel = np.array([0.713, 0.460, 0.326], np.float32)
    manch = ((P[:, 1] > 1.582) & (P[:, 1] < 1.634) & (P[:, 2] > 0.08)
             & (np.abs(P[:, 0]) < 0.10)
             & (C @ np.array([0.299, 0.587, 0.114], np.float32) < 0.03))
    C[manch] = piel * 0.72
    print('mancha del ojo repintada: %d vértices' % manch.sum())

    # ── 4. A ESCRIBIR ──
    vistas, accs, buf = [], [], bytearray()
    def pon(datos, comp, tipo, norm=False, minmax=False):
        while len(buf) % 4: buf.append(0)
        off = len(buf); b = datos.tobytes(); buf.extend(b)
        vistas.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b)})
        a = {'bufferView': len(vistas)-1, 'componentType': comp, 'count': int(datos.shape[0]),
             'type': tipo}
        if norm: a['normalized'] = True
        if minmax:
            a['min'] = [float(datos[:, i].min()) for i in range(datos.shape[1])]
            a['max'] = [float(datos[:, i].max()) for i in range(datos.shape[1])]
        accs.append(a); return len(accs) - 1

    nrm = (np.clip(N, -1, 1) * 127).round().astype(np.int8)
    # EL COLOR SE GUARDA EN LINEAL Y NO EN sRGB. three.js toma `COLOR_0` como
    # lineal —no le aplica ninguna conversión— así que escribiéndolo codificado
    # todo sale lavado: medido, la campera casi negra salía gris claro y el
    # vaquero azul salía gris. Ocho bits en lineal bastan porque cada zona es de
    # color plano: no hay degradado donde se pueda ver el escalón.
    col = (np.clip(C, 0, 1) * 255).round().astype(np.uint8)
    Wt = Wt / np.maximum(Wt.sum(axis=1, keepdims=True), 1e-6)
    wq = (Wt * 255).round().astype(np.uint8)
    aP = pon(P.astype(np.float32), 5126, 'VEC3', minmax=True)
    aN = pon(nrm, 5120, 'VEC3', norm=True)
    aC = pon(col, 5121, 'VEC3', norm=True)
    aJ = pon(J.astype(np.uint8), 5121, 'VEC4')
    aW = pon(wq, 5121, 'VEC4', norm=True)
    aI = pon(I.astype(np.uint16 if P.shape[0] < 65535 else np.uint32).reshape(-1, 1),
             5123 if P.shape[0] < 65535 else 5125, 'SCALAR')
    # LAS MATRICES DE BIND VIEJAS TAMBIEN HAY QUE REHACERLAS. Traian la escala
    # 0,01 del Armature adentro del 3x3; sacandosela a los nodos y dejandolas
    # como estaban, el producto hueso x bind deja de ser la identidad en la pose
    # de reposo y el personaje sale cien veces mas grande.
    todos = list(Wm) + Wnuevos
    ibm2 = np.array([np.linalg.inv(W).T.reshape(16) for W in todos])
    aB = pon(ibm2.astype(np.float32).reshape(-1, 16), 5126, 'MAT4')

    js['bufferViews'] = vistas; js['accessors'] = accs
    js['buffers'] = [{'byteLength': len(buf)}]
    sk['inverseBindMatrices'] = aB
    js['meshes'] = [{'name': 'pj', 'primitives': [{'attributes': {
        'POSITION': aP, 'NORMAL': aN, 'COLOR_0': aC, 'JOINTS_0': aJ, 'WEIGHTS_0': aW},
        'indices': aI, 'material': 0}]}]
    js.pop('animations', None)

    sal = '/tmp/m4/pj_final.glb'
    glb.guarda(sal, js, bytes(buf))
    print('== salida'); glb.resumen(sal)
    b64 = base64.b64encode(io.open(sal, 'rb').read()).decode('ascii')
    txt = ("\n/* ═══════════════════════ EL PERSONAJE ═══════════════════════\n"
           "   Generado con Higgsfield (`generate_image` para la referencia y\n"
           "   `image_to_3d` con riggeado automático para la malla), con la textura\n"
           "   horneada en los vértices, decimado con gltfpack y con los ojos, los\n"
           "   párpados, la mandíbula y la mochila agregados —geometría Y huesos—\n"
           "   por `herramientas/barrio/riggear.py`. */\n"
           "const PJ_B64 = '" + b64 + "';\n")
    io.open(os.path.join(AQUI, 'partes', 'y.js'), 'w', encoding='utf8').write(txt)
    print('base64 %d bytes · %d huesos' % (len(b64), len(joints)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
