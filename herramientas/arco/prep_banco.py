#!/usr/bin/env python3
"""Prepara Arco.html para el banco: los CDN pasan a node_modules locales.

CHROMIUM EN EL CONTENEDOR NO USA EL PROXY DE SALIDA (curl si), asi que un
import a jsdelivr falla con «Failed to fetch dynamically imported module» y el
modulo entero no arranca. `prep2.py` del banco reescribe unpkg; este juego
importa desde jsdelivr, asi que la reescritura va aca.
"""
import sys, io

src, dst = sys.argv[1], sys.argv[2]
s = io.open(src, encoding='utf-8').read()
for base in ('https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/'):
    s = s.replace(base + 'three@0.170.0/build/three.module.js',
                  './node_modules/three/build/three.module.js')
    s = s.replace(base + 'three@0.170.0/examples/jsm/',
                  './node_modules/three/examples/jsm/')
s = s.replace('</head>',
    '<script>window.__errs=[];addEventListener("error",e=>window.__errs.push(String(e.message)));'
    'addEventListener("unhandledrejection",e=>window.__errs.push("promesa: "+e.reason));</script></head>')
io.open(dst, 'w', encoding='utf-8').write(s)
print(dst, len(s))
