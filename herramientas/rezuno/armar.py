#!/usr/bin/env python3
"""Arma juegos-pc/RezUno.html juntando las partes de herramientas/rezuno/partes/.

Vive partido por lo mismo que RECREO: un HTML de mil y pico de lineas se parchea con guantes de
horno. Las partes son la fuente; el HTML es la salida. Este no tiene ni un asset —todo se dibuja por
codigo— asi que el armado es una concatenacion y nada mas.

    python3 herramientas/rezuno/armar.py
"""
import io, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PARTES = ['a.html',  # el marco, el CSS y las pantallas
          'b.js',    # los idiomas, el mazo y la regla
          'c.js',    # el lienzo y el dibujo de una carta
          'd.js',    # la mano: MediaPipe, el pellizco y el filtro
          'e.js',    # la partida: reglas, efectos y los dos rivales
          'f.js',    # la mesa, las zonas pellizcables y el sonido
          'g.js',    # el tutorial de seis pasos
          'h.js',    # las pantallas, la entrada y el bucle
          'i.js']    # los ganchos de prueba

def main():
    partes = os.path.join(RAIZ, 'herramientas', 'rezuno', 'partes')
    s = ''.join(io.open(os.path.join(partes, p), encoding='utf8').read() for p in PARTES)
    # SE ESCRIBE RECIEN CUANDO EL TEXTO ESTA COMPLETO: io.open(p,'w') trunca el archivo ANTES de
    # evaluar lo que se le pasa, y una vez un NameError en el argumento dejo un juego en cero bytes.
    salida = os.path.join(RAIZ, 'juegos-pc', 'RezUno.html')
    io.open(salida, 'w', encoding='utf8').write(s)
    print(salida, len(s), 'caracteres')
    return 0

if __name__ == '__main__':
    sys.exit(main())
