#!/usr/bin/env python3
"""Copia el juego al banco reescribiendo el CDN de three.js a node_modules local:
Chromium en el contenedor no usa el proxy de salida, asi que un import a jsdelivr
falla con «Failed to fetch dynamically imported module»."""
import io, sys, re
src, dst = sys.argv[1], sys.argv[2]
s = io.open(src, encoding='utf8').read()
s = re.sub(r'https://cdn\.jsdelivr\.net/npm/three@[0-9.]+/build/three\.module\.js', './node_modules/three/build/three.module.js', s)
io.open(dst, 'w', encoding='utf8').write(s)
print(dst, len(s), 'caracteres')
