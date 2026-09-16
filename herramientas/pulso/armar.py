#!/usr/bin/env python3
"""Arma juegos-pc/Pulso.html pegando las partes.

    python3 herramientas/pulso/armar.py

EL ORDEN NO ES ALFABÉTICO NI TEMÁTICO: es el orden en el que hacen falta. Todo
esto termina siendo UN módulo ES, así que una `function` se iza pero un `const`
leído antes de su línea no devuelve `undefined` — TIRA, y se lleva el módulo
entero. Ya pasó ocho veces en este repo.
"""
import io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
PARTES = os.path.join(AQUI, 'partes')

ORDEN = ['a.html', 't.js', 'b.js', 'y_assets.js', 'c.js', 'd.js', 'e.js',
         'f.js', 'g.js', 'h.js', 'i.js', 'j.js', 'z.html']


def main():
    trozos = []
    for n in ORDEN:
        p = os.path.join(PARTES, n)
        if not os.path.exists(p):
            print('  (falta ' + n + ', se saltea)')
            continue
        trozos.append(io.open(p, encoding='utf8').read())
    s = ''.join(trozos)
    salida = os.path.join(RAIZ, 'juegos-pc', 'Pulso.html')
    io.open(salida, 'w', encoding='utf8').write(s)
    print(salida, len(s), 'caracteres')
    return 0


if __name__ == '__main__':
    sys.exit(main())
