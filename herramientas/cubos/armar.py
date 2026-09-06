#!/usr/bin/env python3
"""Arma juegos-pc/Cubos.html a partir de herramientas/cubos/partes/.

    python3 herramientas/cubos/armar.py

── EL ORDEN ES EL DE LAS DEPENDENCIAS, NO EL ALFABETICO ──
Todo termina siendo UN modulo ES, asi que un `let`/`const` leido antes de su
linea no devuelve undefined: TIRA, y se lleva el modulo entero. Ya paso ocho
veces en este repo.
"""
import io, os

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
P = os.path.join(AQUI, 'partes')
ORDEN = ['a.html', 'b.js', 'c.js', 'd.js', 'e.js', 'g.js', 'f.js', 'z.html']

def parte(n):
    return io.open(os.path.join(P, n), encoding='utf8').read()

trozos = []
for n in ORDEN:
    s = parte(n)
    if n.endswith('.js'):
        trozos.append('\n/* ══════════════════ %s ══════════════════ */\n' % n + s)
    else:
        trozos.append(s)
sal = ''.join(trozos)
d = os.path.join(RAIZ, 'juegos-pc', 'Cubos.html')
io.open(d, 'w', encoding='utf8').write(sal)
print(d, len(sal), 'caracteres')
