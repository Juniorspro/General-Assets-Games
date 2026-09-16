#!/usr/bin/env python3
"""Trae el ciclo de caminata de Tripo al esqueleto de BARRIO y escribe partes/q.js.

    python3 herramientas/barrio/hornear_paso.py

DE DÓNDE SALE: Rezona Lab (`submit_model3d_generation` → `submit_rig3d_generation`
con `preset:walk` y `preset:run`). No se puede riggear el personaje que YA tiene
el juego: esa herramienta sólo acepta el `task_id` de un modelo generado por uno
mismo. Así que se genera un peatón cualquiera, se lo riggea con los dos clips, y
lo que se trae al juego NO ES LA MALLA SINO EL MOVIMIENTO.

TRES COSAS QUE HAY QUE HACER BIEN:

1. LOS DOS ESQUELETOS NO SE LLAMAN IGUAL. Tripo devuelve `L_Thigh`, `L_Calf`,
   `Hip`, `Waist`; el personaje del juego —que salió de Meshy— tiene
   `LeftUpLeg`, `LeftLeg`, `Hips`, `Spine`. Hay una tabla y nada más.

2. Y SOBRE TODO NO SE COPIAN LOS CANALES. Un canal de rotación es LOCAL AL
   PADRE, así que copiado sobre un hueso que arranca mirando para otro lado deja
   al personaje doblado en dos. Se pasa por el mundo, que es el retarget de
   siempre y el mismo que en Eco costó una vuelta entera:

       Rw_dest = Rw_src · inv(Rw_reposo_src) · Rw_reposo_dest

   y de ahí se vuelve a local dividiendo por la rotación de mundo del PADRE YA
   CORREGIDO, de arriba hacia abajo.

3. SÓLO LAS PIERNAS Y LA COLUMNA. Los brazos, la cabeza y las manos los maneja
   el juego —la mirada, el idle, la linterna, las pastillas de la cinemática— y
   un clip que los escribiera se los llevaría puestos. Diez huesos.

Y NO SE GUARDA UN CLIP: SE GUARDA UNA TABLA POR FASE. El juego ya tiene una fase
de paso (`AND.fase`) de la que dependen el sonido de la pisada, el cabeceo de la
cámara y el balanceo; un `AnimationMixer` con su propio reloj se desincronizaría
de las tres. Muestreado a 24 pasos por ciclo, son 10 huesos × 24 × 4 números.
"""
import base64, io, json, os, re, sys

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import glb

FUENTE = os.environ.get('PASO_SRC', '/tmp/rez_barrio/assets/peaton_rig-g1.glb')
N = 24                      # muestras por ciclo

# ── CUÁNTO MIDE UN PASO, Y POR QUÉ SE ELIGE ACÁ Y NO EN EL JUEGO ──
# El clip trae su propia zancada: medida sobre el retarget, el pie recorre 53 cm
# caminando y 68 corriendo. Ese número ES el paso: durante el apoyo el pie está
# clavado en el piso, así que el cuerpo avanza exactamente lo que el pie barre
# hacia atrás. Si el juego avanza otra cosa, los pies PATINAN — y con `0,82` a
# 3,15 m/s eso eran casi cuatro pasos por segundo deslizándose, que es lo que el
# jugador vio como «pasos de hormiga».
#
# Así que el paso se fija acá, se amplifica el ciclo hasta que el pie lo recorra
# de verdad, y el juego lee el número medido. La cadencia sale sola:
# `pasos por segundo = velocidad / paso`, y un humano camina a 1,9-2,4.
# Y NO SE PUEDE ESTIRAR MUCHO: probado, para llevar la carrera a 1,15 m hace
# falta amplificar 2,70 y ahí el ciclo se rompe —el pie sube 71 cm y la cadera
# baja 75—. Más allá de 1,3 o 1,4 deja de ser el mismo movimiento. Así que el
# paso se estira poco y LA VELOCIDAD BAJA para que la cadencia dé humana:
#   caminar  1,90 m/s ÷ 0,70 m = 2,7 pasos por segundo
#   correr   3,20 m/s ÷ 0,78 m = 4,1
# contra los 3,8 y 7,3 que daba antes, que es exactamente «pasos de hormiga».
# Y el de correr se estira MENOS que el de caminar aunque el paso sea más largo:
# amplificar dobla más la rodilla, así que el tobillo más bajo del ciclo sube y
# la cadera tiene que bajar a buscarlo. Con el objetivo en 0,90 la cadera se
# hundía 37 cm, o sea corriendo en cuclillas.
PASO_OBJ = {'camina': 0.70, 'corre': 0.78}

#   Tripo            →  el rig del juego
MAPA = [
    ('Hip',      'Hips'),
    ('Waist',    'Spine'),
    ('Spine01',  'Spine01'),
    ('Spine02',  'Spine02'),
    ('L_Thigh',  'LeftUpLeg'),
    ('L_Calf',   'LeftLeg'),
    ('L_Foot',   'LeftFoot'),
    ('R_Thigh',  'RightUpLeg'),
    ('R_Calf',   'RightLeg'),
    ('R_Foot',   'RightFoot'),
]


def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return np.array([aw*bx + ax*bw + ay*bz - az*by,
                     aw*by - ax*bz + ay*bw + az*bx,
                     aw*bz + ax*by - ay*bx + az*bw,
                     aw*bw - ax*bx - ay*by - az*bz])


def qinv(q):
    return np.array([-q[0], -q[1], -q[2], q[3]])


def qdeM(M):
    """cuaternión de una matriz 3x3 de rotación (con la escala sacada)"""
    R = M[:3, :3].copy()
    for c in range(3):
        n = np.linalg.norm(R[:, c])
        if n > 1e-12: R[:, c] /= n
    t = R[0, 0] + R[1, 1] + R[2, 2]
    if t > 0:
        s = np.sqrt(t + 1.0) * 2
        q = np.array([(R[2, 1]-R[1, 2])/s, (R[0, 2]-R[2, 0])/s, (R[1, 0]-R[0, 1])/s, 0.25*s])
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = np.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2]) * 2
        q = np.array([0.25*s, (R[0, 1]+R[1, 0])/s, (R[0, 2]+R[2, 0])/s, (R[2, 1]-R[1, 2])/s])
    elif R[1, 1] > R[2, 2]:
        s = np.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2]) * 2
        q = np.array([(R[0, 1]+R[1, 0])/s, 0.25*s, (R[1, 2]+R[2, 1])/s, (R[0, 2]-R[2, 0])/s])
    else:
        s = np.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1]) * 2
        q = np.array([(R[0, 2]+R[2, 0])/s, (R[1, 2]+R[2, 1])/s, 0.25*s, (R[1, 0]-R[0, 1])/s])
    return q / np.linalg.norm(q)


def eje_cadera(js, padre, idx, izq, der):
    """el eje que va de una cadera a la otra, en el mundo del reposo"""
    a = glb.mundo(js, idx[izq], padre)[:3, 3]
    b = glb.mundo(js, idx[der], padre)[:3, 3]
    v = b - a; v[1] = 0
    return v / np.linalg.norm(v)


def qy(ang):
    return np.array([0.0, np.sin(ang/2), 0.0, np.cos(ang/2)])


def indice(js):
    return {n.get('name'): i for i, n in enumerate(js['nodes']) if n.get('name')}


def reposo_mundo(js, padre):
    """rotación de mundo de cada nodo en la pose de reposo"""
    out = {}
    for i, n in enumerate(js['nodes']):
        if not n.get('name'): continue
        out[n['name']] = qdeM(glb.mundo(js, i, padre))
    return out


def curvas(js, bn, anim):
    """{nodo: (tiempos, cuaterniones)} de un clip, sólo rotación"""
    a = next(x for x in js['animations'] if x.get('name') == anim)
    out = {}
    for c in a['channels']:
        if c['target']['path'] != 'rotation': continue
        s = a['samplers'][c['sampler']]
        t = glb.leer(js, bn, s['input']).astype(np.float64).ravel()
        v = glb.leer(js, bn, s['output']).astype(np.float64)
        out[c['target']['node']] = (t, v)
    return out


def muestra(t, v, u):
    """cuaternión en el instante `u`, interpolado corto"""
    k = int(np.searchsorted(t, u)) - 1
    k = max(0, min(len(t) - 2, k))
    f = 0.0 if t[k+1] == t[k] else (u - t[k]) / (t[k+1] - t[k])
    a, b = v[k], v[k+1]
    if float(np.dot(a, b)) < 0: b = -b
    q = a + (b - a) * f
    return q / np.linalg.norm(q)


def amplifica(tabla, rep_local, amp):
    """estira el ciclo sobre su propia pose de reposo.
    No se puede multiplicar un cuaternión: lo que se amplifica es el DELTA
    contra el reposo, `rest · slerp(1, rest⁻¹·q, amp)`, que para amp = 1 devuelve
    exactamente lo que entró."""
    out = {}
    for h, v in tabla.items():
        r = rep_local[h]
        fila = []
        for q in v:
            q = np.array(q, dtype=np.float64)
            d = qmul(qinv(r), q)
            if d[3] < 0: d = -d
            ang = 2.0 * np.arccos(np.clip(d[3], -1, 1))
            ejn = np.linalg.norm(d[:3])
            if ejn < 1e-9:
                nd = np.array([0.0, 0, 0, 1])
            else:
                ej = d[:3] / ejn
                a2 = ang * amp / 2.0
                nd = np.array([ej[0]*np.sin(a2), ej[1]*np.sin(a2), ej[2]*np.sin(a2), np.cos(a2)])
            nq = qmul(r, nd)
            fila.append([round(float(x), 4) for x in nq / np.linalg.norm(nq)])
        out[h] = fila
    return out


def clip(nombre, js_s, bn_s, pad_s, idx_s, rep_s,
         js_d, pad_d, idx_d, rep_d, orden_d, Q):
    cur = curvas(js_s, bn_s, nombre)
    t0 = min(t[0] for t, _ in cur.values())
    t1 = max(t[-1] for t, _ in cur.values())
    # UNA VUELTA ENTERA Y NO EL CLIP COMPLETO: el último fotograma repite el
    # primero, así que muestreando hasta t1 la tabla tiene un cuadro doble y la
    # caminata se traba una vez por ciclo.
    dur = t1 - t0
    tabla = {d: [] for _, d in MAPA}
    for k in range(N):
        u = t0 + dur * k / N
        wsrc = {}
        for s_nom, _ in MAPA:
            i = idx_s[s_nom]
            # mundo del nodo en este instante: se compone desde la raíz con la
            # rotación animada de cada eslabón
            q = np.array([0.0, 0, 0, 1])
            j = i
            cadena = []
            while True:
                cadena.append(j)
                if j not in pad_s: break
                j = pad_s[j]
            for m in reversed(cadena):
                if m in cur:
                    ql = muestra(cur[m][0], cur[m][1], u)
                else:
                    ql = np.array(js_s['nodes'][m].get('rotation', [0, 0, 0, 1]),
                                  dtype=np.float64)
                q = qmul(q, ql)
            wsrc[s_nom] = q
        # ── DEL MUNDO DE UNO AL MUNDO DEL OTRO, Y NO SÓLO DE HUESO A HUESO ──
        # Lo que se trae es el DELTA contra el reposo, `Δ = Rw · inv(Rw_reposo)`,
        # y ese delta está escrito en el mundo del peatón. Los dos rigs no miran
        # para el mismo lado —medido por el eje que va de una cadera a la otra—
        # así que hay que CONJUGARLO: `Q · Δ · Q⁻¹`. Sin eso el delta llega
        # girado y la caminata sale de costado: medido, 51 cm de recorrido
        # lateral contra 4,7 de adelante, o sea el mismo defecto que se estaba
        # arreglando, ahora importado.
        wdst = {}
        for s_nom, d_nom in MAPA:
            dl = qmul(wsrc[s_nom], qinv(rep_s[s_nom]))
            dl = qmul(qmul(Q, dl), qinv(Q))
            wdst[d_nom] = qmul(dl, rep_d[d_nom])
        for d_nom in orden_d:
            # EL PADRE YA CORREGIDO si está en la tabla; si no —el caso de la
            # cadera, cuyo padre es la raíz— el de la pose de reposo. Con el de
            # reposo en los dos casos, cada hueso hereda dos veces la corrección
            # de su padre y la pierna sale girada de más.
            pn = PADRE_D.get(d_nom)
            pw = wdst[pn] if pn else PW_REP[d_nom]
            loc = qmul(qinv(pw), wdst[d_nom])
            loc = loc / np.linalg.norm(loc)
            if loc[3] < 0: loc = -loc
            tabla[d_nom].append([round(float(x), 4) for x in loc])
    return tabla


PADRE_D = {}
PW_REP = {}
TOBILLO = 0.0


def fk_pie(js_d, idx_d, pad_d, tabla, k, hueso):
    """dónde queda un pie con la tabla puesta, en el espacio del personaje.
    Es la única forma de saber si la caminata traída de afuera PISA: un clip
    retargeteado puede quedar perfecto en ángulos y con los pies treinta
    centímetros bajo el asfalto."""
    i = idx_d[hueso]
    cadena = []
    j = i
    while True:
        cadena.append(j)
        if j not in pad_d: break
        j = pad_d[j]
    M = np.eye(4)
    for m in reversed(cadena):
        n = js_d['nodes'][m]
        nom = n.get('name')
        L = glb.local(n).copy()
        if nom in tabla:
            q = tabla[nom][k]
            R = glb.local({'rotation': q})[:3, :3]
            L[:3, :3] = R
        M = M @ L
    return M[:3, 3]


def mide(js_d, idx_d, pad_d, tabla, n):
    L = np.array([fk_pie(js_d, idx_d, pad_d, tabla, k, 'LeftFoot') for k in range(n)])
    R = np.array([fk_pie(js_d, idx_d, pad_d, tabla, k, 'RightFoot') for k in range(n)])
    def r(v): return round(float(v.max() - v.min()), 3)
    return {'izq': {'adelante': r(L[:, 2]), 'costado': r(L[:, 0]),
                    'alto': r(L[:, 1]), 'minY': round(float(L[:, 1].min()), 3)},
            'der': {'adelante': r(R[:, 2]), 'costado': r(R[:, 0]),
                    'alto': r(R[:, 1]), 'minY': round(float(R[:, 1].min()), 3)},
            'bajo': int(np.argmin(L[:, 1]))}


def main():
    js_s, bn_s = glb.carga(FUENTE)
    pad_s = glb.arbol(js_s); idx_s = indice(js_s); rep_s = reposo_mundo(js_s, pad_s)

    m = re.search(r"const PJ_B64 = '([^']+)'", io.open(
        os.path.join(AQUI, 'partes', 'y.js'), encoding='utf8').read())
    d = base64.b64decode(m.group(1))
    io.open('/tmp/pj_barrio.glb', 'wb').write(d)
    js_d, bn_d = glb.carga('/tmp/pj_barrio.glb')
    pad_d = glb.arbol(js_d); idx_d = indice(js_d); rep_d = reposo_mundo(js_d, pad_d)

    nombres = {d_nom for _, d_nom in MAPA}
    for _, d_nom in MAPA:
        i = idx_d[d_nom]
        p = pad_d.get(i)
        pn = js_d['nodes'][p].get('name') if p is not None else None
        PADRE_D[d_nom] = pn if pn in nombres else None
        PW_REP[d_nom] = (rep_d[pn] if pn in rep_d else np.array([0.0, 0, 0, 1]))
    # de la raíz hacia abajo, que es como hay que corregir
    orden, faltan = [], list(nombres)
    while faltan:
        for n in list(faltan):
            if PADRE_D[n] is None or PADRE_D[n] in orden:
                orden.append(n); faltan.remove(n)
    print('orden:', orden)
    print('padres:', PADRE_D)

    es = eje_cadera(js_s, pad_s, idx_s, 'L_Thigh', 'R_Thigh')
    ed = eje_cadera(js_d, pad_d, idx_d, 'LeftUpLeg', 'RightUpLeg')
    ang = np.arctan2(ed[0]*es[2] - ed[2]*es[0], ed[0]*es[0] + ed[2]*es[2])
    Q = qy(ang)
    print('eje cadera peaton %s · juego %s · giro %.1f grados'
          % (np.round(es, 3), np.round(ed, 3), np.degrees(ang)))

    global TOBILLO
    TOBILLO = float(min(glb.mundo(js_d, idx_d['LeftFoot'], pad_d)[1, 3],
                        glb.mundo(js_d, idx_d['RightFoot'], pad_d)[1, 3]))
    print('tobillo en reposo %.3f m' % TOBILLO)

    # la pose de reposo LOCAL de cada hueso del destino, que es contra lo que se
    # amplifica el ciclo
    rep_loc = {}
    for _, d_nom in MAPA:
        rep_loc[d_nom] = np.array(js_d['nodes'][idx_d[d_nom]].get('rotation', [0, 0, 0, 1]),
                                  dtype=np.float64)

    salida, alturas, pasos = {}, {}, {}
    for nom, clave in (('preset:walk', 'camina'), ('preset:run', 'corre')):
        t = clip(nom, js_s, bn_s, pad_s, idx_s, rep_s,
                 js_d, pad_d, idx_d, rep_d, orden, Q)
        # ── LA FASE SE ALINEA CON LA DEL JUEGO, NO SE DEJA DONDE VINO ──
        # `AND.fase` no es un reloj cualquiera: la pisada suena cuando cruza un
        # múltiplo de π y el cabeceo de la cámara sale de ella. Si el clip
        # entrara con su fase original, el sonido caería en el aire. Se gira la
        # tabla para que el pie izquierdo toque el suelo en la fase 0.
        # ── Y SE ESTIRA HASTA QUE EL PASO MIDA LO QUE TIENE QUE MEDIR ──
        # Dos pasadas y no una fórmula: el recorrido del pie no es lineal con el
        # ángulo del muslo —hay rodilla y tobillo en el medio— así que se mide,
        # se corrige y se vuelve a medir. Con dos pasadas cierra dentro del 2 %.
        obj = PASO_OBJ[clave]
        amp = 1.0
        for _ in range(3):
            tt = amplifica(t, rep_loc, amp) if abs(amp - 1) > 1e-6 else t
            dd = mide(js_d, idx_d, pad_d, tt, N)
            largo = (dd['izq']['adelante'] + dd['der']['adelante']) / 2
            if largo < 1e-4: break
            amp *= obj / largo
        t = amplifica(t, rep_loc, amp)
        d = mide(js_d, idx_d, pad_d, t, N)
        print('   %s: ampliado x%.2f · paso %.3f m' % (clave, amp,
              (d['izq']['adelante'] + d['der']['adelante']) / 2))
        pasos[clave] = round((d['izq']['adelante'] + d['der']['adelante']) / 2, 3)
        g = d['bajo']
        if g:
            t = {h: v[g:] + v[:g] for h, v in t.items()}
            d = mide(js_d, idx_d, pad_d, t, N)
        # ── Y LA CADERA SE BAJA HASTA QUE EL PIE DE APOYO TOQUE ──
        # El clip trae sólo rotaciones, así que el cuerpo se queda a una altura
        # fija y el pie de apoyo flota: medido, con `preset:run` el tobillo más
        # bajo del ciclo queda en 17,2 cm contra los 9,3 que mide en reposo, o
        # sea siete centímetros de aire. La cadera baja por cuadro lo que falte,
        # que además es de donde sale el rebote de la caminata — sin él el
        # cuerpo se desliza a altura constante.
        dy = []
        for kk in range(N):
            l = fk_pie(js_d, idx_d, pad_d, t, kk, 'LeftFoot')[1]
            r = fk_pie(js_d, idx_d, pad_d, t, kk, 'RightFoot')[1]
            dy.append(float(TOBILLO - min(l, r)))
        # ── PERO EL REBOTE SE TOPA, PORQUE UNA CARRERA TIENE VUELO ──
        # Siguiendo al pie más bajo cuadro por cuadro, en los cuadros en que los
        # DOS pies están en el aire el cuerpo se va a buscarlos: medido, en la
        # carrera la cadera se hundía 26 cm, o sea corriendo en cuclillas. Lo
        # correcto es que el cuerpo nunca baje más de un palmo por debajo de su
        # punto más alto; en esos cuadros los pies no tocan, que es justamente lo
        # que hace un vuelo. El rebote vertical de una carrera real son 9-10 cm.
        tope = max(dy) - 0.11
        dy = [round(max(v, tope), 4) for v in dy]
        salida[clave] = t
        alturas[clave] = dy
        print(clave, 'girada', g, d, 'cadera', min(dy), max(dy))

    txt = ("\n/* ═════════════ EL CICLO DE PASO, TRAÍDO DE TRIPO ═════════════\n"
           "   Generado con Rezona Lab y retargeteado al esqueleto del juego por\n"
           "   `herramientas/barrio/hornear_paso.py`. Diez huesos —las dos piernas y la\n"
           "   columna— por 24 fases; los brazos, la cabeza y las manos NO están acá\n"
           "   porque los maneja el juego.\n"
           "   Es una TABLA POR FASE y no un clip: el juego ya tiene `AND.fase`, de la\n"
           "   que dependen la pisada, el cabeceo y el balanceo, y un reloj propio se\n"
           "   desincronizaría de las tres. */\n"
           "const PASO_N = %d;\nconst PASO_H = %s;\n" % (N, json.dumps(orden)))
    for clave in ('camina', 'corre'):
        filas = [json.dumps(salida[clave][h], separators=(',', ':')) for h in orden]
        txt += "const PASO_%s = [\n%s\n];\n" % (clave.upper(), ',\n'.join(filas))
    txt += ("/* cuánto baja la cadera en cada fase para que el pie de apoyo toque */\n"
            "const PASO_Y = { camina: %s, corre: %s };\n"
            "/* ── CUÁNTOS METROS AVANZA EL CUERPO EN CADA PASO ──\n"
            "   Medido sobre el ciclo, no elegido: durante el apoyo el pie está clavado\n"
            "   en el piso, así que el cuerpo avanza exactamente lo que el pie barre\n"
            "   hacia atrás. El juego divide por esto para avanzar la fase, y con eso el\n"
            "   patinaje es CERO por construcción. */\n"
            "const PASO_M = { camina: %.3f, corre: %.3f };\n"
            % (json.dumps(alturas['camina'], separators=(',', ':')),
               json.dumps(alturas['corre'], separators=(',', ':')),
               pasos['camina'], pasos['corre']))
    p = os.path.join(AQUI, 'partes', 'q.js')
    io.open(p, 'w', encoding='utf8').write(txt)
    print(p, len(txt), 'caracteres')
    return 0


if __name__ == '__main__':
    sys.exit(main())
