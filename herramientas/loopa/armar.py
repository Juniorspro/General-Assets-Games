#!/usr/bin/env python3
"""Arma juegos-pc/Loopa.html a partir de herramientas/loopa/partes/.

    python3 herramientas/loopa/armar.py

── EL ORDEN ES EL DE LAS DEPENDENCIAS, NO EL ALFABETICO ──
Todo termina siendo UN modulo ES, asi que un `let`/`const` leido antes de su
linea no devuelve undefined: TIRA, y se lleva el modulo entero. Ya paso nueve
veces en este repo.

    i_son.js  las muestras horneadas   -> SON_B
    b.js      tablas, idiomas, escalas -> no depende de nada
    c.js      audio y bateria          -> SON_B, cl
    d.js      el oido                  -> AC, cl, ESCALAS
    e.js      el secuenciador          -> PISTAS, golpe, nota, aEscala
    g.js      el dibujo                -> PISTAS, SEC, LI (izada de f.js)
    f.js      la interfaz              -> todo lo anterior
"""
import io, os

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
P = os.path.join(AQUI, 'partes')
ORDEN = ['a.html', 'i_son.js', 'b.js', 'c.js', 'd.js', 'e.js', 'g.js', 'f.js', 'z.html']

trozos = []
for n in ORDEN:
    s = io.open(os.path.join(P, n), encoding='utf8').read()
    if n.endswith('.js'):
        trozos.append('\n/* ══════════════════ %s ══════════════════ */\n' % n + s)
    else:
        trozos.append(s)
sal = ''.join(trozos)
d = os.path.join(RAIZ, 'juegos-pc', 'Loopa.html')
io.open(d, 'w', encoding='utf8').write(sal)
print(d, len(sal), 'caracteres')
