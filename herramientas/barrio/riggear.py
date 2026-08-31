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
# MEDIDO SOBRE EL MODELO DENSO (`pj2.glb`, 1,70 m de alto), perfilando la cabeza
# por franjas de altura: el frente de la cara por `z` maxima y las facciones por
# la luminancia del color ya horneado en los vertices.
#   cabeza    y 1,385 -> 1,700   ·   z -0,008 -> 0,289
#   nariz     y 1,469  (la z maxima de todo el modelo, 0,2894)
#   ojos      y 1,510  ·  frente z 0,277   (el par pintado mide 0,12 de ancho)
#   boca      y 1,435  ·  frente z 0,268  (la boca PINTADA del modelo cae
#             en 1,39, o sea sobre el borde de la mandibula: es un error del
#             generador, no una boca. La placa va donde va una boca —tres
#             centimetros y medio bajo la punta de la nariz— y la ventana de
#             repintado se estira hasta 1,36 para tapar la pintada.)
# Y LAS DOS SALEN DE LA REGLA PROYECTADA, NO DEL PERFIL DE LUMINANCIA. Por el
# perfil me dieron 1,548 y 1,440, o sea 38 y 48 mm arriba: la franja oscura de
# 1,548 no son los ojos, es el borde del flequillo, que en esta cabeza cae
# justo encima. Con `__V.punto` dibujando una regla de alturas sobre la foto de
# la cara pelada las dos se leen solas — es la tercera vez en el proyecto que
# la luminancia miente y la regla acierta.
#   pelo      arranca en 1,610, donde la luminancia cae a 0,019
# EL MODELO NUEVO TIENE LAS FACCIONES CUATRO CENTIMETROS MAS ABAJO que el viejo
# (ojos 1,548 contra 1,589) y la cara treinta centimetros mas adelante en z
# (0,274 contra 0,175). Con las constantes viejas puestas, la ventana de
# aplanado caia sobre el craneo y el pelo: medido, el vertice que mas entraba se
# hundia 149,5 mm. Por eso esto se vuelve a medir en cada cambio de modelo.
OJOS_Y, OJOS_Z = 1.5100, 0.2810
BOCA_Y, BOCA_Z = 1.4350, 0.2720
MAND_Y, MAND_Z = 1.5100, 0.0700       # la bisagra, a la altura de la oreja

# LAS VENTANAS SALEN DE ESAS ALTURAS Y NO SE ESCRIBEN SUELTAS. Cada una es
# (y0, y1, |x| max, z): las de repintado piden ademas estar en el frente de la
# cara (z > zm) y las de aplanado son la profundidad del casquete.
REP_OJOS = (1.468, 1.556, 0.078, 0.190)
REP_BOCA = (1.360, 1.462, 0.060, 0.170)
APL_OJOS = (1.464, 1.560, 0.080, 0.2700)
APL_BOCA = (1.408, 1.462, 0.058, 0.2660)
# la nariz se salva del aplanado: es la unica saliente que tiene que quedar.
NARIZ_Y, NARIZ_X = 1.440, 0.022

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

    def nuevo_hueso_rot(nombre, papa, p, R):
        """Igual, pero con la orientación de bind que se le pida.

        HACE FALTA PARA LOS DEDOS. `nuevo_hueso` deja el bind SIN rotación, o
        sea alineado con los ejes del mundo, y ahí «doblar el dedo» no es
        ninguno de los tres ejes. Dándole la misma orientación que la mano, el
        eje X del propio hueso ES la bisagra del nudillo, y curvar un dedo pasa
        a ser un número."""
        kp = nom.index(papa)
        T = np.eye(4); T[:3, :3] = R; T[:3, 3] = p
        L = np.linalg.inv(WT[kp]) @ T
        nodos.append({'name': nombre,
                      'translation': [float(L[0,3]), float(L[1,3]), float(L[2,3])],
                      'rotation': list(_quat(L[:3, :3]))})
        i = len(nodos) - 1
        nodos[joints[kp]].setdefault('children', []).append(i)
        joints.append(i); nom.append(nombre)
        WT.append(T)
        return len(joints) - 1, T

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

    # ── 2b. LOS DEDOS QUE YA ESTÁN EN LA MANO, RIGGEADOS ──
    # El riggeador automático da UN hueso por mano y ahí se termina. Pero los
    # dedos SÍ están modelados: lo que no estaba era la forma de encontrarlos.
    #
    # EL DETECTOR QUE NO SIRVE Y EL QUE SÍ. Buscar huecos en la x no encuentra
    # nada —los dedos están juntos y curvados, así que sus rangos de x se
    # pisan— y las componentes conexas tampoco: la malla decimada los soldó y
    # la original viene partida en ciento diecisiete islas sueltas, que es cómo
    # la devuelve el generador. Lo que sí los separa es proyectar la banda de
    # las PUNTAS sobre su propio eje principal en el plano de la palma: ahí
    # aparecen cuatro picos limpios más el pulgar, separados un centímetro y
    # ocho. Medido sobre la malla original, que es la que tiene la resolución
    # para verlo; los cortes se aplican después sobre la que se publica.
    # La deteccion de dedos se hace sobre la malla SIN DECIMAR, que es donde los
    # dedos todavia son islas separables. PJ_FUENTE tiene que ser el mismo modelo
    # que se horneo, o los cortes caen en otro lado.
    ORIG = '/tmp/m4/' + os.environ.get('PJ_FUENTE', 'pj.glb')

    def cortes_de(ruta, lado):
        """Dónde cae cada dedo sobre el eje de los nudillos, medido en la malla
        original. Devuelve el eje, el centro y los cortes entre dedos."""
        jo, bo = glb.carga(ruta)
        po = jo['meshes'][0]['primitives'][0]
        Po = glb.leer(jo, bo, po['attributes']['POSITION'])
        Jo = glb.leer(jo, bo, po['attributes']['JOINTS_0'])
        Wo = glb.leer(jo, bo, po['attributes']['WEIGHTS_0'])
        so = jo['skins'][0]
        no = [jo['nodes'][x].get('name', '?') for x in so['joints']]
        io_ = glb.leer(jo, bo, so['inverseBindMatrices']).reshape(-1, 4, 4).astype(np.float64)
        Wo2 = np.array([np.linalg.inv(m.T) for m in io_])
        kk = no.index(lado + 'Hand')
        Mo = Wo2[kk].copy()
        for c in range(3): Mo[:3, c] /= np.linalg.norm(Mo[:3, c])
        se = np.zeros(len(Po), bool)
        for q in range(4): se |= (Jo[:, q] == kk) & (Wo[:, q] > 0.20)
        lo = (np.linalg.inv(Mo) @ np.c_[Po, np.ones(len(Po))].T).T[:, :3]
        largo = lo[se, 1].max()
        B = lo[se & (lo[:, 1] > largo * 0.61)]
        XZ = B[:, [0, 2]]; cen = XZ.mean(axis=0)
        _, _, vt = np.linalg.svd(XZ - cen, full_matrices=False)
        eje = vt[0]
        t = (XZ - cen) @ eje
        h, bordes = np.histogram(t, bins=26)
        # EL UMBRAL NO PUEDE SER UN NUMERO DE VERTICES. Estaba en `h[i] >= 15`, que
        # es una cuenta absoluta, y con una malla seis veces mas densa ese quince lo
        # cruza cualquier grumo: en el modelo nuevo daba SEIS dedos y el sexto se
        # comia el nombre del quinto, o sea dos huesos llamados `Pulgar`. El umbral
        # va contra el pico mas alto de la propia mano, que escala solo.
        # Y despues entra lo unico que de verdad sabemos del problema: UNA MANO TIENE
        # CINCO DEDOS. Si sobran picos se dejan los cinco mas gruesos y se reordenan
        # por posicion; medido en el modelo nuevo, los cinco que sobreviven caen en
        # los bins 6, 11, 16, 20 y 25 — separados de a cinco bins, que es la firma de
        # cinco dedos parejos y no de un grumo.
        pk = []
        for i in range(len(h)):
            if h[i] >= max(8, 0.08 * h.max()) and (i == 0 or h[i] >= h[i-1]) \
               and (i == len(h)-1 or h[i] >= h[i+1]):
                c = (bordes[i] + bordes[i+1]) / 2
                if not pk or abs(c - pk[-1][0]) > 0.010: pk.append((c, int(h[i])))
        if len(pk) > 5:
            pk = sorted(sorted(pk, key=lambda x: -x[1])[:5], key=lambda x: x[0])
        pk = [c for c, _ in sorted(pk, key=lambda x: x[0])]
        cortes = [(pk[i] + pk[i+1]) / 2 for i in range(len(pk) - 1)]
        return eje, cen, pk, cortes, largo

    DEDO_NOM = ['Indice', 'Medio', 'Anular', 'Menique', 'Pulgar']
    for lado in ('Right', 'Left'):
        kh = nom.index(lado + 'Hand')
        Mh = WT[kh].copy()
        for c in range(3): Mh[:3, c] /= np.linalg.norm(Mh[:3, c])
        eje, cen, pk, cortes, largo = cortes_de(ORIG, lado)
        print('%sHand: %d dedos detectados en %s (eje %s)'
              % (lado, len(pk), np.round(pk, 3), np.round(eje, 2)))
        inv = np.linalg.inv(Mh)
        loc = (inv @ np.c_[P, np.ones(len(P))].T).T[:, :3]
        sel = np.zeros(len(P), bool)
        for q in range(4): sel |= (J[:, q] == kh) & (Wt[:, q] > 0.20)
        NUD = largo * 0.50               # el nudillo, a mitad de la mano
        band = sel & (loc[:, 1] > NUD)
        t = (loc[:, [0, 2]] - cen) @ eje
        etq = np.digitize(t, cortes)     # 0..len(pk)-1
        # el pulgar es el grupo del extremo, y arranca MÁS ABAJO que los otros:
        # con el mismo nudillo queda un pulgar de dos centímetros
        for d in range(len(pk)):
            esPulgar = (d == len(pk) - 1)
            # EL PULGAR ARRANCA MÁS ABAJO Y TERMINA MÁS ABAJO: con la misma
            # ventana que los otros cuatro se llevaba medio dorso —medido, un
            # pulgar de trece centímetros y medio— porque su columna del eje
            # también contiene los nudillos del índice.
            m = sel & (etq == d)
            m &= loc[:, 1] > (largo * 0.24 if esPulgar else NUD)
            if esPulgar: m &= loc[:, 1] < largo * 0.72
            if m.sum() < 6:
                print('   dedo %d: %d vértices, se saltea' % (d, m.sum())); continue
            y0 = loc[m, 1].min()
            base = np.array([loc[m, 0].mean(), y0, loc[m, 2].mean()])
            punta = loc[m][np.argmax(loc[m, 1])]
            dirv = punta - base
            L = np.linalg.norm(dirv)
            if L < 0.02: continue
            dirv /= L
            # marco del hueso: +Y a lo largo del dedo, +X sobre el eje de los
            # nudillos — o sea que girar sobre X ES doblar el dedo
            ejx = np.array([eje[0], 0.0, eje[1]])
            ejx = ejx - dirv * float(ejx @ dirv)
            ejx /= (np.linalg.norm(ejx) or 1.0)
            R = np.stack([ejx, dirv, np.cross(ejx, dirv)], axis=1)
            Rm = Mh[:3, :3] @ R
            nb1 = lado + DEDO_NOM[min(d, 4)]
            nb2 = nb1 + 'B'
            p1 = (Mh @ np.r_[base, 1.0])[:3]
            p2 = (Mh @ np.r_[base + dirv * L * 0.52, 1.0])[:3]
            k1, _ = nuevo_hueso_rot(nb1, lado + 'Hand', p1, Rm)
            k2, _ = nuevo_hueso_rot(nb2, nb1, p2, Rm)
            # LOS PESOS: una rampa a lo largo del dedo y otra en el nudillo. Con
            # un corte duro en la base, doblar el dedo le abre un tajo a la mano.
            s = (loc[m] - base) @ dirv / L
            k = np.clip((s - 0.42) / 0.30, 0, 1); k = k*k*(3 - 2*k)      # prox -> dist
            g = np.clip((loc[m, 1] - (y0 - 0.006)) / 0.022, 0, 1)
            g = g*g*(3 - 2*g)                                            # mano -> dedo
            J[m, 0] = k1; Wt[m, 0] = g * (1 - k)
            J[m, 1] = k2; Wt[m, 1] = g * k
            J[m, 2] = kh; Wt[m, 2] = 1 - g
            J[m, 3] = 0;  Wt[m, 3] = 0
            print('   %-14s n=%3d  largo %.3f m' % (nb1, m.sum(), L))

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
    for y0, y1, xm, zm in (REP_OJOS, REP_BOCA):
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
    for y0, y1, xm, z0 in (APL_OJOS, APL_BOCA):
        l = np.float32(z0) - np.float32(APL_CURVA) * P[:, 0] ** 2
        v = ((P[:, 1] > y0) & (P[:, 1] < y1) & (np.abs(P[:, 0]) < xm)
             & (P[:, 2] > 0.060) & (P[:, 2] > l) & (lum > 0.10)
             & ~((P[:, 1] > NARIZ_Y) & (np.abs(P[:, 0]) < NARIZ_X)))
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
