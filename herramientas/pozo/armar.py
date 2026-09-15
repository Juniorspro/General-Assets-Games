#!/usr/bin/env python3
"""Arma juegos-pc/Pozo.html a partir de herramientas/pozo/partes/.

LAS PARTES SON LA FUENTE; EL HTML ES LA SALIDA. Un archivo de un mega
con todo adentro no se edita con parches de texto — ya costo un archivo
en cero bytes en este repo.

EL ORDEN ES EL DE PRIMER USO, NO EL ALFABETICO. Todo termina siendo UN
modulo ES, y un let/const leido antes de su linea no devuelve undefined:
TIRA, y se lleva el modulo entero. Ya paso nueve veces aca.
"""
import pathlib, re, sys

AQUI   = pathlib.Path(__file__).resolve().parent
PARTES = AQUI / 'partes'
SALIDA = AQUI.parent.parent / 'juegos-pc' / 'Pozo.html'

ORDEN = [
    'a.html',   # marco, CSS, pantallas; abre el <script type="module">
    'b.js',     # constantes, tablas, idiomas, guardado, estado
    'c.js',     # el modelo puro: generador y validador de pisos
    'd.js',     # audio procedural
    'e.js',     # el dibujo
    'f.js',     # el juego
    'g.js',     # el tutorial
    'h.js',     # la interfaz
    'z.html',   # arranque, reloj de paso fijo, sondas; cierra todo
]

def main():
    trozos = []
    for n in ORDEN:
        p = PARTES / n
        if not p.exists():
            sys.exit(f'falta {p}')
        trozos.append(p.read_text(encoding='utf-8'))
    txt = ''.join(trozos)

    n = txt.count('<script type="module">')
    assert n == 1, f'tiene que haber UN solo <script type="module">, hay {n}'
    assert txt.count('</script>') == 1, 'un solo </script>'
    assert txt.rstrip().endswith('</html>'), 'el texto tiene que cerrar en </html>'

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(txt, encoding='utf-8')
    kb = len(txt.encode('utf-8')) / 1024
    print(f'{SALIDA}  {kb:.0f} KB  ({len(txt.splitlines())} lineas)')

if __name__ == '__main__':
    main()
