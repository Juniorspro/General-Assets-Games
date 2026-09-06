#!/usr/bin/env python3
"""Copia el juego al banco. LOOPA no baja nada de ningun CDN —no usa three.js y
las muestras viven adentro del archivo— asi que aca no hay nada que reescribir;
el script existe para que el camino del banco sea el mismo que en los otros
juegos."""
import io, sys
src, dst = sys.argv[1], sys.argv[2]
s = io.open(src, encoding='utf8').read()
io.open(dst, 'w', encoding='utf8').write(s)
print(dst, len(s), 'caracteres')
