#!/usr/bin/env python3
"""Arma juegos-pc/Duna.html pegando las partes de herramientas/duna/partes/.

LAS PARTES SON LA FUENTE; EL HTML ES LA SALIDA. Un archivo de un mega con
base64 adentro no se edita con parches de texto.

Y EL ORDEN ES EL DE DEPENDENCIA, NO EL ALFABETICO: todo termina siendo UN
modulo ES, asi que un `let`/`const` leido antes de su linea no devuelve
undefined: TIRA, y se lleva el modulo entero. Van antes del primer uso.
"""
import io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
PART = os.path.join(AQUI, 'partes')
SAL  = os.path.join(RAIZ, 'juegos-pc', 'Duna.html')

ORDEN = [
    'a.html',    # cabecera, CSS, marco y paneles
    'i_ui.js',   # las imagenes generadas, en base64 (si estan)
    'i_mus.js',  # las camas de musica en base64 — OPCIONAL, ver OPCIONAL
    'b.js',      # constantes, azar con semilla, idiomas
    'c.js',      # las paletas y la hora del dia
    'd.js',      # el terreno: generacion y evaluacion (sin DOM ni lienzo)
    'e.js',      # la fisica del rider (sin DOM ni lienzo)
    'f.js',      # el lienzo, el marco girado y la camara (de aca salen sx/sy)
    'g.js',      # el fondo: cielo, astro, nubes y las capas de parallax
    'h.js',      # el mundo dibujado: terreno, cuerdas, monedas, adornos
    'i.js',      # el rider dibujado: silueta, bufanda, arena, estela
    'j.js',      # audio procedural
    'k.js',      # HUD, paneles, idioma, objetivos y record
    'l.js',      # entrada y bucle
    'z.html',    # las sondas y el cierre
]

# LO GENERADO ES OPCIONAL, y no es comodidad: un asset que todavia no se
# genero —o que fallo— tiene que costar el asset y no el juego entero. El
# codigo que lo usa comprueba que exista antes de tocarlo.
OPCIONAL = ('i_mus.js',)


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
    with io.open(SAL, 'w', encoding='utf-8') as f:
        f.write(txt)
    print('%s  %d KB  (%d partes)' % (SAL, len(txt.encode('utf-8')) // 1024, len(trozos)))
    if sin: print('   sin hornear todavia: %s' % ', '.join(sin))

main()
