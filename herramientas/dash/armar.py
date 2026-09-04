#!/usr/bin/env python3
"""Arma juegos-pc/Dash.html pegando las partes de herramientas/dash/partes/.

EL ORDEN NO ES ALFABETICO NI TEMATICO: es el orden en el que hacen falta. Todo
esto termina siendo UN modulo ES, asi que una `function` se iza pero un `const`
leido antes de su linea no devuelve undefined — TIRA, y se lleva el modulo
entero. Ya paso once veces en este repo.

  a.html   el marco, el CSS y las pantallas
  b.js     las medidas, los idiomas y el azar con semilla
  c.js     la musica: es la FUENTE DEL RELOJ, asi que va antes que todo
  d.js     los niveles: patrones pegados sobre la grilla del compas
  e.js     la fisica y los modos (cubo, nave, gravedad)
  f.js     el dibujo
  g.js     el estado, el progreso guardado y el auto-jugador
  z.html   el armado, el bucle y las sondas
"""
import io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
PARTES = os.path.join(AQUI, 'partes')
ORDEN = ['a.html', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js', 'g.js', 'z.html']

trozos = []
for n in ORDEN:
    p = os.path.join(PARTES, n)
    if not os.path.exists(p):
        print('  (falta %s, se saltea)' % n); continue
    trozos.append(io.open(p, encoding='utf8').read())
s = ''.join(trozos)
assert s.count('<script type="module">') == 1, 'el modulo tiene que ser uno solo'
assert s.rstrip().endswith('</html>'), 'el HTML no cierra'
dest = os.path.join(RAIZ, 'juegos-pc', 'Dash.html')
io.open(dest, 'w', encoding='utf8').write(s)
print('%s %d caracteres' % (dest, len(s)))
