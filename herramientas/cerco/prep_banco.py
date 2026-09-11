#!/usr/bin/env python3
"""Copia el HTML al banco. CERCO no baja NADA —ni three.js— asi que no hay
CDN que reescribir: el prep existe igual para que el plan del banco sea el
mismo en todos los juegos."""
import pathlib, sys, shutil
if len(sys.argv) != 3:
    sys.exit('uso: prep_banco.py <entrada.html> <salida.html>')
e, s = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
s.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(e, s)
print('%s -> %s (%d KB)' % (e, s, s.stat().st_size // 1024))
