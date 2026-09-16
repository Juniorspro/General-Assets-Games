#!/usr/bin/env python3
"""Prepara el HTML para el banco. NAIPE no baja NADA: es lienzo 2D puro,
sin three.js y sin una sola dependencia. Asi que esto solo copia — existe
para que la receta del banco sea la misma en todos los juegos del repo."""
import pathlib, shutil, sys

if len(sys.argv) != 3:
    sys.exit('uso: prep_banco.py <entrada.html> <salida.html>')
a, b = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
b.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(a, b)
print(f'{b}  {b.stat().st_size/1024:.0f} KB')
