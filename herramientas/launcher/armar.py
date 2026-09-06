#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Arma la interfaz del launcher en un solo HTML.

Las partes son la fuente; `app/assets/ui.html` es la salida. Todo termina siendo
UN módulo ES, así que el orden de ORDEN es el orden en el que las cosas hacen
falta y NO el alfabético: un `let`/`const` leído antes de su línea no devuelve
`undefined`, tira, y se lleva el módulo entero.

  a.html   el marco, el CSS y el DOM (termina abriendo <script type="module">)
  i_img.js el fondo y la mascota en base64 (lo escribe hornear.py)
  b.js     tablas, idioma, ayudas    ← todo lo demás las usa
  c.js    el fondo (Frutiger Aero)  ← usa $ y cl de b.js
  d.js    el vidrio líquido         ← independiente, pero va antes que quien lo llama
  e.js    el escritorio             ← usa b, c y d
  z.html  puente de mentira, sondas y arranca()  ← APPS_DEMO se lee al llamar
"""
import io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ORDEN = ['a.html', 'i_img.js', 'i_lemi.js', 'b.js', 'c.js', 'd.js', 'g.js', 'e.js', 'h.js', 'p.js', 'z.html']
SALIDA = os.path.join(AQUI, 'app', 'assets', 'ui.html')


def main():
    trozos = []
    for n in ORDEN:
        p = os.path.join(AQUI, 'partes', n)
        if not os.path.exists(p):
            sys.exit('falta la parte: ' + n)
        trozos.append(io.open(p, encoding='utf-8').read())

    html = ''.join(trozos)
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    io.open(SALIDA, 'w', encoding='utf-8').write(html)

    # que la salida tenga UN solo <script type="module"> abierto y cerrado
    ab, ce = html.count('<script type="module">'), html.count('</script>')
    if ab != 1 or ce != 1:
        sys.exit('el módulo quedó mal cerrado: %d aperturas, %d cierres' % (ab, ce))

    print('%s  %d KB  (%d partes)' % (SALIDA, len(html.encode('utf-8')) // 1024, len(ORDEN)))


if __name__ == '__main__':
    main()
