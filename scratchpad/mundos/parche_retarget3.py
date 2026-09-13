#!/usr/bin/env python3
"""CAMBIA EL RETARGET DE LOS 8 MUNDOS NUEVOS por el que trabaja en mundo.

Reemplaza el bloque que va del comentario "RETARGET DE LOS CLIPS" hasta el final
de retargetClip() por el contenido de retarget_js.js. Lo que cambia:

  · reposoDe() ahora tambien guarda el NOMBRE DEL PADRE de cada hueso. Sin eso no
    se puede pasar a mundo, que es la unica forma de retargetear dos rigs cuyas
    poses de reposo difieren cien grados en la cadera.
  · retargetClip() pasa a hacer la cuenta de mundo por fotograma en vez de una
    correccion constante por hueso.
  · la traslacion de la cadera se escala por la relacion de alturas.

Los 4 mundos originales (marte, luna, exo, hielo) y senda/marea/reliquia NO se
tocan: no usan per/*.glb ni retargetClip, sus personajes ya traen animacion
propia dentro del GLB.

Uso: python3 parche_retarget3.py [--escribe]
"""
import os
import sys

RAIZ = '/home/user/mundos'
MUNDOS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa',
          'acropolis', 'secuoya']
INI = '/* ======================== RETARGET DE LOS CLIPS ==='
FIN = '/* le arma a un personaje'


def parchea(ruta, nuevo, escribe):
    txt = open(ruta, encoding='utf8').read()
    a = txt.find(INI)
    b = txt.find(FIN)
    if a < 0 or b < 0 or b <= a:
        return 'NO SE ENCONTRO EL BLOQUE'
    fuera = txt[a:b]
    if 'mundoDe' in fuera:
        return 'ya estaba parcheado'
    txt2 = txt[:a] + nuevo.rstrip('\n') + '\n' + txt[b:]
    if escribe:
        open(ruta, 'w', encoding='utf8').write(txt2)
    return 'quita %d lineas, pone %d' % (fuera.count('\n'), nuevo.count('\n'))


if __name__ == '__main__':
    escribe = '--escribe' in sys.argv
    nuevo = open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                              'retarget_js.js'), encoding='utf8').read()
    for m in MUNDOS:
        p = os.path.join(RAIZ, 'assets/mundos', m + '.html')
        print('  %-12s %s' % (m, parchea(p, nuevo, escribe)))
    if not escribe:
        print('\n(en seco; con --escribe se escriben los .html)')
