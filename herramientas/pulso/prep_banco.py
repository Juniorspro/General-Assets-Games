#!/usr/bin/env python3
"""Deja el HTML listo para el banco de pruebas del contenedor.

    python3 herramientas/pulso/prep_banco.py juegos-pc/Pulso.html /tmp/ui/pulso.html

VIVE EN EL REPO Y NO EN /tmp A PROPOSITO. El `prep2.py` del banco reescribe los
CDN de unpkg, y PULSO importa three desde jsDelivr, asi que habia que parchearlo
a mano — y el contenedor se reinicio tres veces en una sola sesion, borrando el
parche cada vez. Cada vez el sintoma era el mismo y desorientaba igual: el modulo
no cargaba, `window.__V` no existia y TODAS las sondas contestaban
«__V is not defined», que parece un error del juego y es del banco.

Chromium en el contenedor no sale a internet (curl si), asi que un import a un
CDN muere con ERR_CONNECTION_RESET y con el se cae el modulo entero.
"""
import io, os, sys

REEMPLAZOS = [
    ('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
     './node_modules/three/build/three.module.js'),
    ('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/',
     './node_modules/three/examples/jsm/'),
    ('https://unpkg.com/three@0.170.0/build/three.module.js',
     './node_modules/three/build/three.module.js'),
]

def main():
    if len(sys.argv) < 3:
        print(__doc__); return 1
    s = io.open(sys.argv[1], encoding='utf8').read()
    for a, b in REEMPLAZOS: s = s.replace(a, b)
    # el capturador de errores va ANTES que el modulo: si se cuelga uno de
    # importacion, es lo unico que lo deja ver
    s = s.replace('</head>', '<script>window.__errs=[];'
                  'addEventListener("error",e=>window.__errs.push(String(e.message)));'
                  'addEventListener("unhandledrejection",e=>window.__errs.push("promesa: "+e.reason));'
                  '</script></head>', 1)
    io.open(sys.argv[2], 'w', encoding='utf8').write(s)
    q = s.count('cdn.jsdelivr') + s.count('unpkg.com')
    print('%s  %d caracteres  · CDN sin reescribir: %d' % (sys.argv[2], len(s), q))
    return 0

if __name__ == '__main__':
    sys.exit(main())
