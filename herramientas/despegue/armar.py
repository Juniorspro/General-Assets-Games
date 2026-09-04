#!/usr/bin/env python3
"""Arma juegos-pc/Despegue.html pegando las partes de herramientas/despegue/partes/.

El orden es el orden en que hacen falta, no el alfabetico: todo esto termina
siendo UN modulo ES y un `const` leido antes de su linea TIRA y se lleva el
modulo entero.

  a.html  el marco, el CSS y las pantallas
  b.js    las tablas: capas, mejoras, rafagas, estilos, idiomas, azar con semilla
  c.js    el audio procedural
  d.js    la simulacion, la economia, el progreso guardado y el auto-jugador
  e.js    el dibujo en three.js
  f.js    el HUD, el taller y las pantallas
  z.html  el bucle, la entrada, las sondas y el arranque
"""
import io, os
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
ORDEN = ['a.html', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js', 'z.html']
s = ''.join(io.open(os.path.join(AQUI, 'partes', n), encoding='utf8').read() for n in ORDEN)
assert s.count('<script type="module">') == 1
assert s.rstrip().endswith('</html>')
dest = os.path.join(RAIZ, 'juegos-pc', 'Despegue.html')
io.open(dest, 'w', encoding='utf8').write(s)
print('%s %d caracteres' % (dest, len(s)))
