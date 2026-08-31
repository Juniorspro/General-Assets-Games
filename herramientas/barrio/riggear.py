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
# ── LAS DOS PLACAS DE LA CARA ──
# Los ojos, las cejas y la boca dejan de ser geometria y pasan a ser DIBUJO: dos
# placas con textura pegadas a la cara, cada una con su atlas de dieciseis
# cuadros. Es como se hace una cara estilizada en cualquier juego, y aca ademas
# resuelve de raiz lo que no se podia resolver con volumen: en una cabeza low
# poly SIN CUENCA, un globo ocular o queda enterrado -medido, veintidos
# milimetros adentro- o queda saltado, y no hay punto medio.
# LAS ALTURAS NO SE DEDUCEN DE LA LUMINANCIA: SE MIDEN EN LA PANTALLA. Contar
# vertices oscuros por franja da la respuesta equivocada, y costo una vuelta —
# devolvia los ojos en 1,618 cuando estan en 1,600, porque en esta cabeza el
# pelo, la ceja PINTADA y la cuenca son todos oscuros y caen en franjas
# pegadas. Lo que no se puede confundir es una regla proyectada sobre la foto
# de la cara pelada (`__V.punto(x,y,z)`): ahi se ve que los ojos del modelo
# caen en 1,585-1,615, el flequillo baja hasta 1,62, la punta de la nariz esta
# en 1,510 y la linea de la boca en 1,468.
OJOS_Y, OJOS_Z = 1.5890, 0.1660
BOCA_Y, BOCA_Z = 1.4800, 0.1680
MAND_Y, MAND_Z = 1.5850, -0.0250      # la bisagra, a la altura de la oreja

# ── LA CARA SE APLANA, Y ES LA MITAD DEL PEDIDO ──
# «hacer la cara plana o almenos los ojos y las cejas y boca plana». No es una
# preferencia de estilo: el arco superciliar de este modelo sobresale hasta
# z=0,175 y la placa vive en 0,166, asi que SIN APLANAR la ceja de bulto
# atraviesa el dibujo y lo que se ve son dos barras de piel cruzando los ojos.
# Se lleva a un casquete suave —plano, pero no un plano: una cara perfectamente
# plana se lee a mascara— y solo hacia ATRAS, con un minimo, asi que nada de lo
# que ya estaba adentro se mueve.
APL_CURVA = 1.30


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
        """Un hueso hijo con bind sin rotacion en `p` (metros, espacio de malla).
        LA LISTA DE BINDS CRECE con cada hueso nuevo: `caraBoca` cuelga de
        `mandibula`, que tambien es nueva, y buscando el padre solo entre los
        veinticuatro originales el indice se sale del array."""
        kp = nom.index(papa)
        Wp = WT[kp]
        L = np.linalg.inv(Wp) @ np.array([[1,0,0,p[0]],[0,1,0,p[1]],[0,0,1,p[2]],[0,0,0,1]])
        nodos.append({'name': nombre,
                      'translation': [float(L[0,3]), float(L[1,3]), float(L[2,3])],
                      'rotation': list(_quat(L[:3, :3]))})
        i = len(nodos) - 1
        nodos[joints[kp]].setdefault('children', []).append(i)
        joints.append(i); nom.append(nombre)
        W = np.eye(4); W[:3, 3] = p
        WT.append(W)
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

    WT = [Wm[k] for k in range(len(Wm))]     # los binds, y crece
    Wnuevos = []
    HUESOS = {}
    for nb, pa, p in [
        ('mandibula','Head',      (0.0, MAND_Y, MAND_Z)),
        ('caraOjos', 'Head',      (0.0, OJOS_Y, OJOS_Z)),
        ('caraBoca', 'mandibula', (0.0, BOCA_Y, BOCA_Z)),
        ('mochila',  'Spine01',   (0.0, 1.2000, -0.1000))]:
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
    # LA CARA SE LIMPIA ENTERA. Los ojos, las cejas y la boca del modelo estan
    # PINTADOS en la textura, y ahora los dibuja la placa: dejandolos, cada
    # expresion sale con un segundo par de ojos debajo. Se repinta todo lo oscuro
    # de la franja de la cara con el color de la piel, un poco mas oscuro para
    # que siga habiendo cuenca.
    piel = np.array([0.713, 0.460, 0.326], np.float32)
    lum = C @ np.array([0.299, 0.587, 0.114], np.float32)
    # EL CORTE ESTABA EN 0,055 Y LA CUENCA LLEGA A 0,30: medido franja por
    # franja, en la banda de los ojos la piel da 0,63 y lo pintado va de 0,004 a
    # 0,30, o sea que hay un hueco enorme entre las dos cosas y el corte estaba
    # metido adentro de lo pintado. Con 0,055 quedaban dos ojeras puestas.
    manch = np.zeros(len(P), bool)
    for y0, y1, xm, zm in ((1.545, 1.628, 0.102, 0.095),     # ojos y cejas
                           (1.428, 1.522, 0.072, 0.090)):    # boca
        manch |= ((P[:, 1] > y0) & (P[:, 1] < y1) & (P[:, 2] > zm)
                  & (np.abs(P[:, 0]) < xm) & (lum < 0.30))
    C[manch] = piel * np.float32(0.86)
    print('cara limpiada: %d vértices repintados' % manch.sum())

    # ── 3c. Y LA CARA SE APLANA DONDE VAN LAS PLACAS ──
    # Solo hacia atrás (`minimum`): así el casquete no puede inflar nada, y todo
    # lo que ya estaba por dentro se queda donde estaba. La nariz queda AFUERA
    # de las dos ventanas a propósito — es lo único de esta cara que tiene que
    # seguir teniendo bulto.
    # EL PELO NO SE APLANA, y por eso esto va DESPUÉS de repintar: el flequillo
    # baja hasta 1,654 con z=0,190, o sea cuarenta y tres milímetros por delante
    # del casquete, y aplanarlo se lo mete adentro de la frente. Después del
    # repintado lo único que sigue oscuro en esta franja ES el pelo, así que la
    # luminancia alcanza para distinguirlo — antes no, porque la ceja pintada
    # era igual de oscura.
    lum = C @ np.array([0.299, 0.587, 0.114], np.float32)
    apl = np.zeros(len(P), bool)
    lim = np.zeros(len(P), np.float32)
    # LA BOCA SE APLANA MÁS HONDO QUE LOS OJOS, y ése fue el defecto que dejó la
    # boca invisible: entre el labio y la barbilla la cara llega a z=0,160 y la
    # placa vivía en 0,160 con las esquinas arqueadas en 0,144, o sea DETRÁS de
    # la cara. Se veía como que la boca no se dibujaba; lo que pasaba es que
    # estaba tapada por la propia barbilla.
    # Y LA COLUMNA DE LA NARIZ QUEDA AFUERA (|x| < 0,026 por encima de 1,492):
    # la punta está en 1,510 con z=0,181, y aplanarla se la come — cuarenta y
    # tres milímetros medidos la primera vez.
    for y0, y1, xm, z0 in ((1.540, 1.665, 0.105, 0.1470),
                           (1.415, 1.528, 0.078, 0.1400)):
        l = np.float32(z0) - np.float32(APL_CURVA) * P[:, 0] ** 2
        v = ((P[:, 1] > y0) & (P[:, 1] < y1) & (np.abs(P[:, 0]) < xm)
             & (P[:, 2] > 0.060) & (P[:, 2] > l) & (lum > 0.10)
             & ~((P[:, 1] > 1.492) & (np.abs(P[:, 0]) < 0.026)))
        lim[v] = l[v]; apl |= v
    hondo = float((P[apl, 2] - lim[apl]).max()) if apl.any() else 0.0
    P[apl, 2] = lim[apl]
    # Y LA NORMAL TAMBIÉN, que si no la ceja sigue estando: la de bulto ya no
    # sobresale pero sigue sombreada como si sobresaliera, y en una cara eso se
    # ve igual. La del casquete sale de su propia pendiente: (2c·x, 0, 1).
    nn = np.stack([2.0 * APL_CURVA * P[apl, 0], np.zeros(apl.sum(), np.float32),
                   np.ones(apl.sum(), np.float32)], axis=1)
    N[apl] = nn / np.linalg.norm(nn, axis=1, keepdims=True)
    print('cara aplanada: %d vértices, el que más entró %.1f mm' % (apl.sum(), hondo * 1000))

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
