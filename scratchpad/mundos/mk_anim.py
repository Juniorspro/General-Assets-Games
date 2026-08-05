#!/usr/bin/env python3
"""ARMA LOS TRES CLIPS PRESTADOS (quieto / andar / correr) listos para retargetear.

Que arregla respecto de los anim/*.glb que habia:

1. FUENTE. El clip que se usaba de `quieto` era la accion `Idle` de la libreria
   biped, que NO es un parado: le mueve la cabeza 123 grados de amplitud (medido
   con retarget.py). Ni corrigiendo la referencia queda de pie. Se cambia por
   `Idle_02`, que ya estaba en el repo en assets/hyper/anim-idle2.glb y es un
   parado de verdad (5 grados de amplitud, respiracion). Lo mismo con `correr`:
   estaba `RunFast`, 15 fotogramas y la columna 51 grados fuera de su bind; se
   cambia por `Run_02` de assets/aero/hero-run.glb, que da 23 fotogramas y mucho
   mejores numeros. `andar` (Casual_Walk) ya estaba bien y se conserva.

2. REFERENCIA. Cada clip se reescribe con la pose de reposo de sus nodos puesta
   en la POSE NEUTRA DEL PROPIO CLIP (el promedio de todos sus fotogramas). Asi
   el retarget del navegador puede usar el reposo de los nodos como cero, que es
   la cuenta barata, y le sale bien: el sesgo constante que tenian estos clips
   (Idle 40 grados de cadera, Run_02 27 de columna) queda absorbido aca, en
   tiempo de compilacion, y no en el celular del jugador.

3. PESO. Se tiran las 24 pistas de ESCALA (variacion cero, medido) y 23 de las 24
   pistas de TRASLACION (constantes: son los largos de hueso DEL DONANTE, que
   aplicados al personaje le pisan sus proporciones y le estiran la malla). Queda
   solo la traslacion de Hips, que es la unica que se mueve de verdad.

4. UN SOLO RELOJ. Todos los samplers comparten el accesor de tiempos, asi el
   retarget del navegador puede recorrer los fotogramas por indice y no tiene que
   remuestrear nada.

Uso: python3 mk_anim.py [--escribe]     (sin --escribe solo informa)
"""
import os
import struct
import sys

import numpy as np

from glb import Rig, escribir, mat_a_q, q_a_mat
from retarget import muestrea_rot, muestrea_vec, pose_neutra

RAIZ = '/home/user/mundos'
# rol -> (fichero de origen, cuantos fotogramas dejar como maximo)
FUENTES = {
    'quieto': 'assets/hyper/anim-idle2.glb',       # Idle_02: parado real
    'andar': 'assets/mundos/anim/andar.glb',       # Casual_Walk: ya estaba bien
    'correr': 'assets/aero/hero-run.glb',          # Run_02: mejor que RunFast
}
SALIDA = 'assets/mundos/anim'


def arma(rol, rel, destino):
    don = Rig(os.path.join(RAIZ, rel))
    clip = don.clips()[0]
    tiempos = np.asarray(clip['tiempos'], dtype=np.float64)
    rot = clip['pistas']['rotation']
    pos = clip['pistas']['translation']

    # 1) pose neutra del clip, y de ahi la rotacion LOCAL de reposo de cada nodo
    neutra = pose_neutra(don, clip)
    loc_neutra = {}
    for i in don.orden:
        p = don.padre.get(i)
        M = neutra.get(i, don.reposo_mundo[i])
        loc_neutra[i] = mat_a_q((neutra[p].T @ M) if p is not None and p in neutra else M)

    # 2) los nodos: jerarquia y nombres igual, rotacion = neutra del clip
    nodos = []
    for i, n in enumerate(don.nodes):
        m = {}
        for k in ('name', 'children', 'translation', 'scale'):
            if k in n:
                m[k] = n[k]
        q = loc_neutra[i]
        m['rotation'] = [float(q[0]), float(q[1]), float(q[2]), float(q[3])]
        nodos.append(m)

    # 3) la traslacion de Hips se recentra: su promedio pasa a ser la traslacion
    #    de reposo del nodo, asi el navegador solo hace  destino + (v - reposo)*k
    i_h = don.idx.get('Hips')
    pista_h = None
    if i_h is not None and i_h in pos:
        tp, vp = pos[i_h]
        v = np.array([muestrea_vec(tp, vp, t) for t in tiempos])
        v = v - v.mean(axis=0) + np.array(nodos[i_h].get('translation', [0, 0, 0]))
        pista_h = v

    # 4) buffer: un solo accesor de tiempos + un output por pista
    trozos, accs, vistas, pos_b = [], [], [], 0

    def agrega(arr, tipo, minmax=False):
        nonlocal pos_b
        cr = np.asarray(arr, dtype='<f4').tobytes()
        trozos.append(cr)
        vistas.append({'buffer': 0, 'byteOffset': pos_b, 'byteLength': len(cr)})
        pad = (4 - len(cr) % 4) % 4
        if pad:
            trozos.append(b'\x00' * pad)
        pos_b += len(cr) + pad
        d = {'bufferView': len(vistas) - 1, 'componentType': 5126,
             'count': len(arr), 'type': tipo}
        if minmax:                      # el input de un sampler necesita min/max
            d['min'] = [float(np.min(arr))]
            d['max'] = [float(np.max(arr))]
        accs.append(d)
        return len(accs) - 1

    i_tiempo = agrega(tiempos.reshape(-1, 1), 'SCALAR', minmax=True)
    samplers, canales = [], []
    for i_nodo, (tp, vp) in sorted(rot.items()):
        v = np.array([muestrea_rot(tp, vp, t) for t in tiempos])
        for k in range(1, len(v)):      # continuidad de signo para el slerp
            if float(v[k - 1] @ v[k]) < 0:
                v[k] = -v[k]
        samplers.append({'input': i_tiempo, 'output': agrega(v, 'VEC4'),
                         'interpolation': 'LINEAR'})
        canales.append({'sampler': len(samplers) - 1,
                        'target': {'node': i_nodo, 'path': 'rotation'}})
    if pista_h is not None:
        samplers.append({'input': i_tiempo, 'output': agrega(pista_h, 'VEC3'),
                         'interpolation': 'LINEAR'})
        canales.append({'sampler': len(samplers) - 1,
                        'target': {'node': i_h, 'path': 'translation'}})

    bina = b''.join(trozos)
    js = {
        'asset': {'version': '2.0',
                  'generator': 'mk_anim.py (clip neutralizado, solo rotacion + Hips)'},
        'scene': 0,
        'scenes': [{'nodes': [i for i in range(len(don.nodes))
                              if i not in don.padre]}],
        'nodes': nodos,
        'animations': [{'name': clip['nombre'], 'samplers': samplers,
                        'channels': canales}],
        'accessors': accs, 'bufferViews': vistas,
        'buffers': [{'byteLength': len(bina)}],
    }
    escribir(destino, js, bina)
    return clip['nombre'], len(tiempos), float(tiempos[-1]), os.path.getsize(destino)


if __name__ == '__main__':
    escribe = '--escribe' in sys.argv
    for rol, rel in FUENTES.items():
        dst = os.path.join(RAIZ, SALIDA, rol + '.glb')
        antes = os.path.getsize(dst) if os.path.exists(dst) else 0
        salida = dst if escribe else '/tmp/mk_anim_' + rol + '.glb'
        nom, nf, dur, tam = arma(rol, rel, salida)
        print('%-7s <- %-32s %-26s %3d fotogramas  %4.2fs  %5.1f KB (antes %5.1f KB)'
              % (rol, rel.split('/')[-1], nom.split('|')[1] if '|' in nom else nom,
                 nf, dur, tam / 1024, antes / 1024))
    if not escribe:
        print('\n(prueba en /tmp; con --escribe se escribe en ' + SALIDA + ')')
