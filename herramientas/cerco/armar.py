#!/usr/bin/env python3
"""Arma juegos-pc/Cerco.html juntando las partes de partes/.

LAS PARTES SON LA FUENTE Y EL HTML ES LA SALIDA. Un HTML de un solo modulo ES
no se edita con parches de texto sin terminar rompiendolo, y este repo ya pago
un archivo en cero bytes por hacerlo.

EL ORDEN ES EL DE PRIMER USO Y NO EL ALFABETICO. Todo termina en UN modulo ES,
asi que un `let`/`const` leido antes de su linea no devuelve `undefined`: TIRA,
y se lleva el modulo entero. Las `function` si estan izadas, por eso f.js puede
llamar a `verPanel` (h.js) y h.js a `partidaArranca` (f.js) en ejecucion.
"""
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
PARTES = pathlib.Path(__file__).resolve().parent / 'partes'
SALIDA = RAIZ / 'juegos-pc' / 'Cerco.html'

ORDEN = [
    'a.html',   # marco, piel y paneles; abre el <script type="module">
    'b.js',     # constantes, mundos, idiomas y progreso
    'c.js',     # el modelo puro: mapa, reglas, bots y auditorias (corre en node)
    'd.js',     # audio
    'e.js',     # el dibujo
    'f.js',     # la partida: entrada, vidas, reloj y marcador
    'g.js',     # el tutorial
    'h.js',     # los paneles
    'z.html',   # arranque, reloj y sondas; cierra el <script> y el <html>
]


def main():
    trozos = []
    for nombre in ORDEN:
        p = PARTES / nombre
        if not p.exists():
            sys.exit(f'falta {p}')
        trozos.append(p.read_text(encoding='utf-8'))
    txt = ''.join(trozos)

    # Un solo modulo: dos aperturas quieren decir que una parte se colo con su
    # propia etiqueta y la mitad del juego quedaria en otro ambito.
    assert txt.count('<script type="module">') == 1, 'tiene que haber UN solo modulo'
    assert txt.rstrip().endswith('</html>'), 'el archivo no cierra en </html>'

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(txt, encoding='utf-8')
    print(f'{SALIDA}  {len(txt.encode("utf-8")) / 1024:.1f} KB  ({len(ORDEN)} partes)')


if __name__ == '__main__':
    main()
