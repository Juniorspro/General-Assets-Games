#!/usr/bin/env python3
"""Arma juegos-pc/Barrio.html pegando las partes.

    python3 herramientas/barrio/armar.py

POR QUE VIVE PARTIDO: es la lección que ya costó un archivo en cero bytes en
otro juego de este repo. Un HTML autocontenido de medio mega se edita con
parches de texto, y un parche mal hecho sobre un archivo con base64 adentro no
falla ruidosamente: deja el juego roto de una forma que no se ve hasta abrirlo.
Las partes son la fuente; el HTML es la salida.

EL ORDEN NO ES ALFABETICO NI TEMATICO: es el orden en el que hacen falta. Todo
esto termina siendo UN modulo ES, así que una `function` se iza pero un `const`
leído antes de su línea no devuelve `undefined` — TIRA, y se lleva puesto el
módulo entero. Ya pasó seis veces en este repo.
"""
import io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
PARTES = os.path.join(AQUI, 'partes')

ORDEN = ['a.html', 't.js', 'x.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js',
         'g.js', 'h.js', 'y.js', 'w.js', 'v.js',  'k.js', 'q.js', 'l.js', 'o.js',
         'j.js', 'r.js', 'p.js', 'i.js', 'z.html']


def main():
    trozos = []
    for n in ORDEN:
        p = os.path.join(PARTES, n)
        if not os.path.exists(p):
            print('  (falta ' + n + ', se saltea)')
            continue
        trozos.append(io.open(p, encoding='utf8').read())
    s = ''.join(trozos)
    salida = os.path.join(RAIZ, 'juegos-pc', 'Barrio.html')
    io.open(salida, 'w', encoding='utf8').write(s)
    print(salida, len(s), 'caracteres')
    return 0


if __name__ == '__main__':
    sys.exit(main())
