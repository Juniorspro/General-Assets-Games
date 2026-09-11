#!/usr/bin/env python3
"""Arma juegos-pc/Flechas.html desde partes/.

Las PARTES son la fuente; el HTML es la salida. Y el orden de ORDEN es el
orden en que hacen falta, no el alfabetico: todo termina siendo UN modulo ES,
asi que un `let`/`const` leido antes de su linea no devuelve `undefined` —
TIRA y se lleva el modulo entero.
"""
import pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent
PART = RAIZ / 'partes'
SAL = RAIZ.parent.parent / 'juegos-pc' / 'Flechas.html'

ORDEN = [
    'a.html',   # marco, piel, pantallas — abre el <script type="module">
    'b.js',     # constantes, mundos, idiomas, guardado
    'c.js',     # el modelo puro: regla, generador, validador, auto-jugador
    'd.js',     # audio
    'e.js',     # estado, encuadre y dibujo   (declara JU)
    'ef.js',    # el fondo: la mesa de cada mundo, horneada una vez
    'f.js',     # el juego                    (usa JU)
    'g.js',     # el tutorial
    'h.js',     # pantallas, menu y dedo
    'z.html',   # arranque, reloj, sondas y el cierre
]

def main():
    txt = ''
    for n in ORDEN:
        p = PART / n
        if not p.exists():
            sys.exit('falta ' + n)
        txt += p.read_text(encoding='utf-8')
        if not txt.endswith('\n'):
            txt += '\n'
    assert txt.count('<script type="module">') == 1, 'tiene que haber UN solo modulo'
    assert txt.rstrip().endswith('</html>'), 'el cierre va en z.html'
    SAL.parent.mkdir(parents=True, exist_ok=True)
    SAL.write_text(txt, encoding='utf-8')
    print('%s · %d KB' % (SAL, len(txt.encode()) // 1024))

if __name__ == '__main__':
    main()
