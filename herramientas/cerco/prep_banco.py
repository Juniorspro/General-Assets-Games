#!/usr/bin/env python3
"""Copia el HTML al banco reescribiendo el CDN de three.js a node_modules.

Desde que CERCO es 3D baja three.js de jsDelivr, y CHROMIUM EN EL CONTENEDOR NO
USA EL PROXY DE SALIDA (curl si), asi que un import a un CDN falla con
"Failed to fetch dynamically imported module" y el modulo entero no arranca.
Lo que se reescribe es el importmap, que es el unico sitio donde vive la URL."""
import pathlib, sys, re
if len(sys.argv) != 3:
    sys.exit('uso: prep_banco.py <entrada.html> <salida.html>')
e, s = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
t = e.read_text(encoding='utf8')

LOCAL = '/node_modules/three/build/three.module.js'
t2, n = re.subn(r'https://cdn\.jsdelivr\.net/npm/three@[^"\']+', LOCAL, t)
if n == 0 and 'three' in t:
    print('AVISO: no se encontro el CDN de three.js — revisar el importmap')

s.parent.mkdir(parents=True, exist_ok=True)
s.write_text(t2, encoding='utf8')
print('%s -> %s (%d KB, %d CDN reescritos)' % (e, s, s.stat().st_size // 1024, n))
