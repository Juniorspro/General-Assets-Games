#!/usr/bin/env python3
"""Arma juegos-pc/Pistola.html pegando las partes.

    python3 herramientas/pistola/armar.py

POR QUE VIVE PARTIDO: es la leccion que ya costo un archivo en cero bytes en
otro juego de este repo. Un HTML autocontenido con base64 adentro no se edita
con parches de texto: un parche mal hecho no falla ruidosamente, deja el juego
roto de una forma que no se ve hasta abrirlo. Las partes son la fuente; el HTML
es la salida.

EL ORDEN NO ES ALFABETICO NI TEMATICO: es el orden en el que hacen falta. Todo
esto termina siendo UN modulo ES, asi que una `function` se iza pero un `const`
leido antes de su linea no devuelve `undefined` — TIRA, y se lleva puesto el
modulo entero. Ya paso once veces en este repo.
"""
import io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
PARTES = os.path.join(AQUI, 'partes')

ORDEN = ['a.html', 'b.js', 'as.js', 'c.js', 'd.js', 'e.js', 'f.js', 'g.js',
         'h.js', 'z.html']


def main():
    trozos = []
    for n in ORDEN:
        p = os.path.join(PARTES, n)
        if not os.path.exists(p):
            print('  (falta ' + n + ', se saltea)')
            continue
        trozos.append(io.open(p, encoding='utf8').read())
    s = ''.join(trozos)
    salida = os.path.join(RAIZ, 'juegos-pc', 'Pistola.html')
    io.open(salida, 'w', encoding='utf8').write(s)
    print(salida, len(s), 'caracteres')
    return 0


if __name__ == '__main__':
    sys.exit(main())
