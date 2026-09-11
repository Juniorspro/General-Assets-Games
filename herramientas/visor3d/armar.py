#!/usr/bin/env python3
"""Arma juegos-pc/Visor3D.html pegando el GLB horneado en la plantilla.

    python3 herramientas/visor3d/armar.py
"""
import base64, io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
GLB = os.path.join(AQUI, 'maicol3d_p.glb')


def main():
    s = io.open(os.path.join(AQUI, 'plantilla.html'), encoding='utf8').read()
    b64 = base64.b64encode(io.open(GLB, 'rb').read()).decode('ascii')
    assert '@@GLB@@' in s
    s = s.replace('@@GLB@@', b64)
    salida = os.path.join(RAIZ, 'juegos-pc', 'Visor3D.html')
    io.open(salida, 'w', encoding='utf8').write(s)
    print(salida, len(s), 'caracteres')
    return 0


if __name__ == '__main__':
    sys.exit(main())
