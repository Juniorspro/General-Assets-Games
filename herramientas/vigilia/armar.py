#!/usr/bin/env python3
"""Arma juegos-pc/Vigilia.html pegando las partes de herramientas/vigilia/partes/.

El orden es el orden en que hacen falta, no el alfabetico: todo esto termina
siendo UN modulo ES y un `const` leido antes de su linea TIRA y se lleva el
modulo entero.

  a.html       el marco, el CSS y las pantallas
  b.js         las tablas: carriles, pieles, idiomas, azar con semilla
  c.js         el audio procedural
  d.js         el mundo, la simulacion y el auto-jugador (sin DOM ni three)
  i_assets.js  los modelos y el titulo de Rezona en base64 (lo escribe hornear.py)
  e.js         el dibujo en three.js
  f.js         el HUD y las pantallas
  z.html       el bucle, la entrada, las sondas y el arranque
"""
import io, os
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
ORDEN = ['a.html', 'b.js', 'c.js', 'd.js', 'i_assets.js', 'e.js', 'f.js', 'z.html']
s = ''
for n in ORDEN:
    p = os.path.join(AQUI, 'partes', n)
    if n == 'i_assets.js' and not os.path.exists(p):
        continue
    s += io.open(p, encoding='utf8').read()
assert s.count('<script type="module">') == 1
assert s.rstrip().endswith('</html>')
dest = os.path.join(RAIZ, 'juegos-pc', 'Vigilia.html')
io.open(dest, 'w', encoding='utf8').write(s)
print('%s %d caracteres' % (dest, len(s)))
