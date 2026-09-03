#!/usr/bin/env python3
"""Arma juegos-pc/<Juego>.html pegando el nucleo mas el archivo del juego.

    python3 herramientas/casual/armar.py frutas
    python3 herramientas/casual/armar.py            (todos)

POR QUE HAY UN NUCLEO Y NO CINCO JUEGOS ENTEROS: los cinco comparten el menu,
los tres idiomas, la cinematica, el audio, el bucle de paso fijo y las sondas.
Escrito cinco veces, el dia que se corrija un defecto quedan cuatro sin
corregir — y eso no es una hipotesis, es lo que paso en este repo con las
traducciones de Z Force (137 claves en castellano y 30 en ingles).

EL ORDEN NO ES ALFABETICO NI TEMATICO: es el orden en el que hacen falta. Todo
esto termina siendo UN modulo ES, asi que una `function` se iza pero un `const`
leido antes de su linea no devuelve undefined — TIRA, y se lleva el modulo
entero. Ya paso nueve veces en este repo.

  a.html      el marco, el CSS y las pantallas
  b.js        el lienzo, el reloj y la entrada        (define $, AN, AL, g, MODO)
  g.js        el giroscopio y la sacudida              (define GIRO; usa nada)
  m.js        la mano por la camara                    (define MANO; usa $)
  assets/<j>  las imagenes y el sonido en base64      (define AS; lo escribe hornear.py)
  <juego>.js  las reglas                              (define JT y JUEGO)
  t.js        los idiomas                             (lee JT, usa $)
  i.js        el sonido
  d.js        los assets generados: cargador, musica, tenido  (envuelve son())
  j.js        el jugo: racha con multiplicador, particulas, flotantes, sacudon
  p.js        el progreso guardado y la reja de niveles  (lee JUEGO.nivelesTotal)
  c.js        la cinematica y las herramientas de dibujo
  f.js        el ambiente: foto de fondo, particulas, haz, vineta, destello
  z.html      el armado, el bucle y las sondas        (lee JUEGO y todo lo de arriba)
"""
import io, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
NUCLEO = os.path.join(AQUI, 'nucleo')
JUEGOS = os.path.join(AQUI, 'juegos')
ASSETS = os.path.join(AQUI, 'assets')

# id -> (archivo de salida, nombre que se ve)
CATALOGO = {
    'frutas':   ('Frutas.html',   'FRUTAS'),
    'tubos':    ('Tubos.html',    'TUBOS'),
    'torre':    ('Torre.html',    'TORRE'),
    'burbujas': ('Burbujas.html', 'BURBUJAS'),
    'chispa':   ('Chispa.html',   'CHISPA'),
    'dados':    ('Dados.html',    'DADOS'),
}


def arma(jid):
    salida, nombre = CATALOGO[jid]
    partes = [
        os.path.join(NUCLEO, 'a.html'),
        os.path.join(NUCLEO, 'b.js'),
        os.path.join(NUCLEO, 'g.js'),
        os.path.join(NUCLEO, 'm.js'),
        os.path.join(ASSETS, jid + '.js'),
        os.path.join(JUEGOS, jid + '.js'),
        os.path.join(NUCLEO, 't.js'),
        os.path.join(NUCLEO, 'i.js'),
        os.path.join(NUCLEO, 'd.js'),
        os.path.join(NUCLEO, 'j.js'),
        os.path.join(NUCLEO, 'p.js'),
        os.path.join(NUCLEO, 'c.js'),
        os.path.join(NUCLEO, 'f.js'),
        os.path.join(NUCLEO, 'z.html'),
    ]
    trozos = []
    for p in partes:
        if not os.path.exists(p):
            print('  falta ' + os.path.basename(p) + ', se saltea')
            continue
        trozos.append(io.open(p, encoding='utf8').read())
    s = ''.join(trozos)
    s = s.replace('__TITULO__', nombre).replace('__NOMBRE__', nombre)
    # comprobacion barata que ya evito dos veces publicar un HTML a medias
    for marca in ('__TITULO__', '__NOMBRE__'):
        assert marca not in s, 'quedo una marca sin reemplazar: ' + marca
    assert s.count('<script type="module">') == 1, 'el modulo tiene que ser uno solo'
    assert s.rstrip().endswith('</html>'), 'el HTML no cierra'
    dest = os.path.join(RAIZ, 'juegos-pc', salida)
    io.open(dest, 'w', encoding='utf8').write(s)
    print('%-11s -> %s  %d caracteres' % (jid, dest, len(s)))


def main():
    pedidos = sys.argv[1:] or list(CATALOGO)
    for j in pedidos:
        if j not in CATALOGO:
            print('no existe: ' + j + '  (hay: ' + ', '.join(CATALOGO) + ')')
            continue
        if not os.path.exists(os.path.join(JUEGOS, j + '.js')):
            print('%-11s todavia no tiene juegos/%s.js' % (j, j))
            continue
        arma(j)


main()
