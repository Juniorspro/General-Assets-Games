#!/usr/bin/env python3
"""LA BIBLIOTECA DE CLIPS, TAMBIEN EN LOS CINCO VIEJOS.

marte, luna, exo, hielo y senda son los cinco mundos anteriores al motor
compartido: no tienen `armarAcciones` ni `mezclaAcciones` ni la biblioteca de
clips prestados. Lo unico que hacen con un GLB animado es
`mix.clipAction(g.animations[0]).play()`, y el GLB del cuerpo del jugador no
trae ninguna animacion, asi que el cuerpo es una estatua.

Se les copia TAL CUAL el bloque de los ocho nuevos —biblioteca de donantes,
`reposoDe`, `retargetClip`, `armarAcciones` y `mezclaAcciones`—, que ya esta
probado y que solo depende de `T`, `AX`, `GLTF` y `MIXERS`, las cuatro cosas que
estos cinco ya tienen (`AX` resuelve contra assets/mundos/ tambien en senda, que
vive en otra carpeta: se comprobo).

No se les toca nada de los personajes: el bloque queda disponible y el unico que
lo usa es el cuerpo del jugador, que es el parche siguiente.
"""
import pathlib, re, sys

A = pathlib.Path('/home/user/mundos/assets')
FUENTE = A / 'mundos/dunas.html'
DEST = ['mundos/marte.html', 'mundos/luna.html', 'mundos/exo.html',
        'mundos/hielo.html', 'senda/senda.html']

src = FUENTE.read_text(encoding='utf-8')
i = src.index('/* ====================== BIBLIOTECA DE CLIPS PRESTADOS')
j = src.index('function ponerModelo(npc){')
BLOQUE = src[i:j].rstrip() + '\n'
for f in ('function reposoDe', 'function retargetClip', 'function armarAcciones',
          'function mezclaAcciones', 'const CLIPS = {'):
    assert f in BLOQUE, f
print('bloque de %d bytes' % len(BLOQUE))

n = 0
for rel in DEST:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    if 'function armarAcciones' in s:
        print('  -- %s: ya' % rel); continue
    m = re.search(r'\nconst MIXERS = \[\];\n', s)
    if not m:
        print('  !! %s: no encuentro MIXERS' % rel); continue
    s = s[:m.end()] + '\n' + BLOQUE + s[m.end():]
    p.write_text(s, encoding='utf-8')
    n += 1
    print('  %s: biblioteca de clips (+%d bytes)' % (rel, len(BLOQUE) + 1))
print('%d de %d' % (n, len(DEST)))
sys.exit(0 if n == len(DEST) else 1)
