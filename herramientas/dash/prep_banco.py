#!/usr/bin/env python3
"""Deja Dash.html listo para el banco de pruebas del contenedor.

    python3 herramientas/dash/prep_banco.py juegos-pc/Dash.html /tmp/ui/dash.html

VIVE EN EL REPO Y NO EN /tmp A PROPOSITO: el `prep2.py` del banco reescribe los
CDN de unpkg y este juego importa three desde jsDelivr, asi que habia que
parchearlo a mano — y el contenedor ya se reinicio varias veces en una sesion,
borrando el parche cada vez. El sintoma siempre desorienta igual: el modulo no
carga, `window.__R` no existe y TODAS las sondas contestan «__R is not defined»,
que parece un error del juego y es del banco.

Chromium en el contenedor no sale a internet (curl si), asi que un import a un
CDN muere con ERR_CONNECTION_RESET y con el se cae el modulo entero.
"""
import io, sys

REEMPLAZOS = [
    ('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
     './node_modules/three/build/three.module.js'),
]

src, dst = sys.argv[1], sys.argv[2]
s = io.open(src, encoding='utf8').read()
for a, b in REEMPLAZOS:
    if a not in s:
        print('  OJO: no aparece %s' % a)
    s = s.replace(a, b)
s = s.replace('</head>',
              '<script>window.__errs=[];'
              'addEventListener("error",e=>window.__errs.push(String(e.message)));'
              '</script></head>')
io.open(dst, 'w', encoding='utf8').write(s)
print('%s %d caracteres' % (dst, len(s)))
