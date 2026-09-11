#!/usr/bin/env python3
"""Arma juegos-pc/Arco.html pegando las partes de herramientas/arco/partes/.

LAS PARTES SON LA FUENTE; EL HTML ES LA SALIDA.

Y EL ORDEN ES EL DE DEPENDENCIA, NO EL ALFABETICO: todo termina siendo UN
modulo ES, asi que un `let`/`const` leido antes de su linea no devuelve
undefined: TIRA, y se lleva el modulo entero. Van antes del primer uso.

  a.html   el marco, el CSS y las pantallas
  b.js     constantes, bloques, paletas, idiomas, guardado, azar con semilla
  c.js     el mundo de voxeles y los duelos (sin DOM ni lienzo)
  d.js     la balistica, el choque, el rival y la auditoria (sin DOM ni lienzo)
  e.js     el dibujo en 2D: cielo, fondo, terreno, flechas y particulas
  f.js     los arqueros: pose, arco y dibujo
  g.js     audio procedural
  h.js     HUD, paneles, idioma y progreso
  i.js     el tutorial
  z.html   la entrada, el bucle, las sondas y el arranque

NO HAY UNA SOLA DEPENDENCIA, y no es una restriccion heredada: este juego es
vector plano sobre un lienzo 2D. Un CDN que no contesta no puede dejarlo sin
dibujar, y las tres capas —cielo, fondo, terreno— cuestan menos rellenar que
la unica pasada de un motor 3D que aca no decidiria nada, porque la unica
decision del juego es un vector en un plano.
"""
import io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
PART = os.path.join(AQUI, 'partes')
SAL  = os.path.join(RAIZ, 'juegos-pc', 'Arco.html')

ORDEN = ['a.html', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js', 'g.js', 'h.js', 'i.js', 'z.html']

# LO GENERADO ES OPCIONAL: un asset que todavia no se horneo tiene que costar
# el asset y no el juego entero. Hoy no hay ninguno.
OPCIONAL = ()


def main():
    faltan = [n for n in ORDEN
              if n not in OPCIONAL and not os.path.exists(os.path.join(PART, n))]
    if faltan:
        print('FALTAN: ' + ', '.join(faltan)); sys.exit(1)
    trozos, sin = [], []
    for n in ORDEN:
        f = os.path.join(PART, n)
        if not os.path.exists(f): sin.append(n); continue
        with io.open(f, encoding='utf-8') as fh:
            trozos.append(fh.read())
    txt = ''.join(trozos)
    assert txt.count('<script type="module">') == 1, 'tiene que haber UN solo modulo'
    assert txt.rstrip().endswith('</html>'), 'el cierre va en z.html'
    with io.open(SAL, 'w', encoding='utf-8') as f:
        f.write(txt)
    print('%s  %d KB  (%d partes)' % (SAL, len(txt.encode('utf-8')) // 1024, len(trozos)))
    if sin: print('   sin hornear todavia: %s' % ', '.join(sin))


main()
