#!/usr/bin/env python3
"""RETARGET DE VERDAD: pasa un clip de un rig a otro con reposos distintos.

EL PROBLEMA
Los 11 personajes de per/*.glb no traen animacion y se les presta un clip de
anim/*.glb. Los dos rigs tienen los MISMOS 26 nombres de hueso, pero no la misma
pose de reposo: medido sobre los GLB, el Hips del donante tiene una base de
mundo que es casi una permutacion de ejes

    [[-0.26, 0.93, 0.27], [0.07, -0.26, 0.96], [0.96, 0.27, 0.0]]

mientras que el del personaje es casi la identidad girada 34 grados en X. Eso es
el famoso "cien grados de diferencia" (Hips local 134,9 contra 34,5). En el resto
del esqueleto los dos rigs SI coinciden en mundo (Spine02 va 1,1 contra 1,9
grados; los femures 179,6 contra 174,9): la discrepancia esta concentrada en la
cadera, que es la raiz de todo el cuerpo, y por eso contamina a todos los huesos.

POR QUE NO ALCANZA UNA CORRECCION FIJA POR HUESO
Lo que se intento antes fue  q_don * inv(reposoDon) * reposoDst , o sea una
correccion constante por hueso. Eso puede arreglar UN fotograma (el reposo) pero
no todos, porque la rotacion local de un hueso se compone en el marco de su
PADRE, y ese marco cambia en cada fotograma cuando el padre se mueve. Con las
caderas a 100 grados una constante nunca es correcta a la vez para el reposo y
para el movimiento: por eso quedaba derecho quieto y encorvado al caminar.

LO QUE HACE ESTE GUION
Trabaja en espacio de MUNDO, que es donde "girar el brazo 30 grados hacia
adelante" significa lo mismo en los dos rigs. Para cada hueso b y cada fotograma:

    delta_mundo(b) = R_mundo_donante_animado(b) @ R_mundo_donante_reposo(b)^-1
    R_mundo_destino(b) = delta_mundo(b) @ R_mundo_destino_reposo(b)
    R_local_destino(b) = R_mundo_destino(padre)^-1 @ R_mundo_destino(b)

Es decir: se mide cuanto giro el hueso del donante respecto de SU reposo, medido
en mundo, y se le aplica ese mismo giro de mundo al reposo del destino. Despues
se vuelve a local, que es lo que consume el AnimationMixer. El pase tiene que ir
de padre a hijo porque R_mundo_destino(padre) ya es el resultado corregido, no el
de reposo: ahi esta la parte que una correccion fija no puede reproducir.

ADEMAS (dos cosas que tambien deformaban, y que no eran la rotacion)
· El clip donante trae pista de TRASLACION para los 24 huesos, y 23 de esas 24
  son CONSTANTES: son las longitudes de hueso DEL DONANTE. Aplicadas al
  personaje le pisan sus propias proporciones y le estiran la malla. Se tiran:
  el destino se queda con sus huesos.
· Trae 24 pistas de ESCALA con variacion cero. Puro peso muerto. Se tiran.
  Solo se conserva la traslacion de Hips (que es la unica que se mueve de
  verdad: el balanceo), escalada por la relacion de alturas de cadera para que
  un personaje bajo no flote ni se hunda.

Uso:
  python3 retarget.py comprueba          # mide los 11 personajes x 3 clips
  python3 retarget.py escribe <destino>  # deja los GLB por personaje
"""
import glob
import os
import sys

import numpy as np

from glb import Rig, escribir, grados, mat_a_q, q_a_mat, q_slerp

# los huesos que mira la prueba del navegador (window.__S.npcPose)
VIGILADOS = ('Hips', 'Spine02', 'Head')


def muestrea_rot(t_pista, v_pista, t):
    """el cuaternion de la pista en el instante t, con slerp por el camino corto"""
    if len(t_pista) == 1:
        return v_pista[0]
    k = int(np.searchsorted(t_pista, t, side='right') - 1)
    k = max(0, min(len(t_pista) - 2, k))
    dt = t_pista[k + 1] - t_pista[k]
    u = 0.0 if dt <= 0 else float(np.clip((t - t_pista[k]) / dt, 0, 1))
    return q_slerp(v_pista[k], v_pista[k + 1], u)


def muestrea_vec(t_pista, v_pista, t):
    if len(t_pista) == 1:
        return v_pista[0]
    k = int(np.searchsorted(t_pista, t, side='right') - 1)
    k = max(0, min(len(t_pista) - 2, k))
    dt = t_pista[k + 1] - t_pista[k]
    u = 0.0 if dt <= 0 else float(np.clip((t - t_pista[k]) / dt, 0, 1))
    return v_pista[k] * (1 - u) + v_pista[k + 1] * u


def pose_neutra(don, clip):
    """la pose MEDIA del clip, en mundo, por hueso.

    Para que sirve: la referencia correcta del donante no es la pose que quedo
    guardada en el GLB sino la pose neutra del propio clip. Medido: el clip Idle
    tiene la cadera 40 grados fuera de su bind y Run_02 la columna 27 grados
    fuera, o sea que arrancan de una pose que NO es de pie. Si se toma esa pose
    guardada como el cero, ese sesgo constante se le suma al personaje y se ve
    encorvado. Tomando la MEDIA del clip como cero, el personaje se para en SU
    bind y solo hereda el movimiento relativo, que es lo que se quiere.

    El promedio de rotaciones se hace sumando matrices y proyectando a la
    rotacion mas cercana con SVD (media cordal): promediar cuaterniones
    componente a componente no da una rotacion valida.
    """
    rot = clip['pistas']['rotation']
    acum = {}
    for t in clip['tiempos']:
        loc = {i: muestrea_rot(tp, vp, t) for i, (tp, vp) in rot.items()}
        W = don._mundo(loc)
        for i, m in W.items():
            acum[i] = acum.get(i, np.zeros((3, 3))) + m
    neutra = {}
    for i, m in acum.items():
        U, _, Vt = np.linalg.svd(m)
        R = U @ Vt
        if np.linalg.det(R) < 0:                # reflexion: se corrige el eje chico
            U[:, -1] *= -1
            R = U @ Vt
        neutra[i] = R
    return neutra


def retarget(don, clip, dst, paso=None, neutraliza=True):
    """clip del rig `don` llevado al rig `dst`. Devuelve pistas por NOMBRE de nodo.

    `paso` remuestrea a ese intervalo en segundos (None = respeta los tiempos
    originales del clip). Se remuestrea porque el resultado ya no es una simple
    copia de valores: hay que evaluar la jerarquia completa en cada instante.
    """
    tiempos = clip['tiempos']
    rot_don = clip['pistas']['rotation']
    pos_don = clip['pistas']['translation']
    if paso:
        tiempos = np.arange(0.0, float(tiempos[-1]) + 1e-9, paso)

    # pose de REFERENCIA en mundo de los dos rigs (bind si el GLB trae skin).
    # Es la pose contra la que esta autorado el clip; usar el reposo de los nodos
    # metia un error constante de 45 grados en quieto y correr.
    Wdon0 = pose_neutra(don, clip) if neutraliza else don.bind_mundo
    Wdst0 = dst.bind_mundo

    # los huesos que se van a escribir: los que el clip mueve Y existen en el destino
    comunes = []
    for i_don in rot_don:
        nom = don.nodes[i_don].get('name')
        if nom in dst.idx:
            comunes.append((nom, i_don, dst.idx[nom]))

    salida = {nom: {'rotation': []} for nom, _, _ in comunes}
    for t in tiempos:
        # 1) pose del donante en local, y de ahi a mundo
        loc_don = {}
        for i_don, (tp, vp) in rot_don.items():
            loc_don[i_don] = muestrea_rot(tp, vp, t)
        Wdon = don._mundo(loc_don)

        # 2) el giro de mundo respecto del reposo del donante, aplicado al
        #    reposo del destino; y de vuelta a local (de padre a hijo)
        Wdst = {}
        for i_dst in dst.orden:
            nom = dst.nodes[i_dst].get('name')
            i_don = don.idx.get(nom)
            if i_don is not None and i_don in Wdon:
                delta = Wdon[i_don] @ Wdon0[i_don].T
                Wdst[i_dst] = delta @ Wdst0[i_dst]
            else:
                # hueso que el clip no mueve: se queda en su referencia, pero
                # arrastrado por el padre ya corregido
                p = dst.padre.get(i_dst)
                Wdst[i_dst] = (Wdst[p] @ dst.ref_local(i_dst)) if p in Wdst \
                    else Wdst0[i_dst]
        for nom, i_don, i_dst in comunes:
            p = dst.padre.get(i_dst)
            L = (Wdst[p].T @ Wdst[i_dst]) if p is not None else Wdst[i_dst]
            salida[nom]['rotation'].append(mat_a_q(L))

    # continuidad de signo: dos cuaterniones opuestos son la misma rotacion,
    # pero interpolados dan la vuelta larga; el mixer hace slerp entre claves
    for nom in salida:
        v = np.array(salida[nom]['rotation'])
        for k in range(1, len(v)):
            if np.dot(v[k - 1], v[k]) < 0:
                v[k] = -v[k]
        salida[nom]['rotation'] = (np.asarray(tiempos, dtype=np.float64), v)

    # 3) traslacion: SOLO la de Hips y en delta respecto del reposo, escalada por
    #    la relacion de alturas de cadera. Las otras 23 pistas del donante son
    #    constantes (sus largos de hueso) y pisarian los del personaje.
    i_don_h, i_dst_h = don.idx.get('Hips'), dst.idx.get('Hips')
    if i_don_h in pos_don and i_dst_h is not None:
        alto_don = float(don.pos_mundo()[i_don_h][1])
        alto_dst = float(dst.pos_mundo()[i_dst_h][1])
        k = (alto_dst / alto_don) if alto_don else 1.0
        tp, vp = pos_don[i_don_h]
        # con clip neutralizado el cero de la cadera tambien es el del clip: si
        # se usara la traslacion guardada del nodo, el personaje quedaria a la
        # altura media del DONANTE (medido: 102 cm contra 95 de reposo) y
        # flotaria seis centimetros
        base_don = np.array([muestrea_vec(tp, vp, t) for t in clip['tiempos']]).mean(axis=0) \
            if neutraliza else don.rp[i_don_h]
        base_dst = dst.rp[i_dst_h]
        vals = np.array([base_dst + (muestrea_vec(tp, vp, t) - base_don) * k
                         for t in tiempos])
        salida.setdefault('Hips', {})['translation'] = (
            np.asarray(tiempos, dtype=np.float64), vals)
    return salida


# --------------------------------------------------------------- comprobacion
def mide(dst, pistas):
    """cuanto se aparta cada hueso vigilado de su reposo, en grados.

    Es la MISMA cuenta que hace window.__S.npcPose en el navegador: angulo
    entre el cuaternion local animado y el cuaternion local de reposo.
    """
    r = {}
    for nom in VIGILADOS:
        i = dst.idx.get(nom)
        if i is None or nom not in pistas or 'rotation' not in pistas[nom]:
            continue
        _, v = pistas[nom]['rotation']
        q0 = mat_a_q(dst.ref_local(i))
        ang = 2 * np.degrees(np.arccos(np.clip(np.abs(v @ q0), 0, 1)))
        r[nom] = (float(ang.mean()), float(ang.max()))
    return r


def pies(dst, pistas):
    """altura del pie mas bajo a lo largo del clip, en metros.

    Sirve para ver si el personaje pisa el piso o flota: la escala del Armature
    es 0,01, asi que las posiciones de hueso estan en centimetros.
    """
    esc = dst.nodes[[i for i in range(len(dst.nodes))
                     if i not in dst.padre][0]].get('scale', [1, 1, 1])[0]
    idx = {nom: dst.idx[nom] for nom in ('LeftToeBase', 'RightToeBase')
           if nom in dst.idx}
    if not idx:
        return None
    n = len(next(iter(pistas.values()))['rotation'][0])
    bajos = []
    for k in range(n):
        lq = {}
        for nom, p in pistas.items():
            if 'rotation' in p and nom in dst.idx:
                lq[dst.idx[nom]] = p['rotation'][1][k]
        lp = {}
        if 'Hips' in pistas and 'translation' in pistas['Hips']:
            lp[dst.idx['Hips']] = pistas['Hips']['translation'][1][k]
        P = dst.pos_mundo(lq, lp)
        bajos.append(min(P[i][1] for i in idx.values()) * esc)
    return float(np.mean(bajos)), float(np.min(bajos)), float(np.max(bajos))


CLIPS = {'quieto': 'assets/mundos/anim/quieto.glb',
         'andar': 'assets/mundos/anim/andar.glb',
         'correr': 'assets/mundos/anim/correr.glb'}


def comprueba(raiz='/home/user/mundos'):
    dons = {}
    for k, v in CLIPS.items():
        r = Rig(os.path.join(raiz, v))
        dons[k] = (r, r.clips()[0])
    print('%-24s %-7s %s' % ('personaje', 'clip',
                             '  '.join('%-16s' % b for b in VIGILADOS) + ' pie_medio'))
    peor = 0.0
    for p in sorted(glob.glob(os.path.join(raiz, 'assets/mundos/per/*.glb'))):
        dst = Rig(p)
        nom = os.path.basename(p).replace('.glb', '')
        for k in ('quieto', 'andar', 'correr'):
            don, clip = dons[k]
            pistas = retarget(don, clip, dst)
            m = mide(dst, pistas)
            pi = pies(dst, pistas)
            peor = max(peor, max(v[1] for v in m.values()))
            print('%-24s %-7s %s  %s' % (
                nom, k,
                '  '.join('%5.1f/%5.1f gr' % m.get(b, (0, 0)) for b in VIGILADOS),
                ('%.3f m' % pi[0]) if pi else '?'))
    print('\npeor desvio de hueso vigilado en todo el lote: %.1f grados' % peor)
    print('(criterio: +-15 grados)')


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'comprueba':
        comprueba()
    else:
        raise SystemExit(__doc__)
