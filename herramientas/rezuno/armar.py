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
          'p.js',    # el audio grabado: dos temas y quince efectos
          'c.js',    # el lienzo y el dibujo de una carta
          'd.js',    # la mano: MediaPipe, el pellizco y el filtro
          'e.js',    # la partida: reglas, efectos y los dos rivales
          'f.js',    # la mesa, las zonas pellizcables y el sonido
          'j.js',    # el constructor de manos en 3D, y la tuya
          'k.js',    # los dos rivales: manos enfrentadas y agarrar la carta a la vista
          'm.js',    # el multijugador 1v1 por MQTT, sin servidor
          'n.js',    # el seguimiento de cabeza por la orientacion del aparato
          'g.js',    # el tutorial de seis pasos
          'h.js',    # las pantallas, la entrada y el bucle
          'i.js']    # los ganchos de prueba

# LAS DOS IMAGENES DEL MENU VIVEN EN assets/rezuno/ Y SE PEGAN AL ARMAR.
# Guardarlas ya en base64 dentro de a.html haria que la parte —que es donde uno lee el CSS y la
# estructura— empiece con veinte mil caracteres de basura. Se dejan como archivos y el armado las
# mete: la fuente sigue siendo legible y la salida sigue siendo un archivo solo.
ARTE = { '@@ARTE_TITULO@@': 'titulo.webp', '@@ARTE_MANO@@': 'mano.webp' }

def pegar_arte(s):
    import base64
    for marca, nombre in ARTE.items():
        ruta = os.path.join(RAIZ, 'assets', 'rezuno', nombre)
        b64 = base64.b64encode(io.open(ruta, 'rb').read()).decode('ascii')
        assert marca in s, 'falta la marca ' + marca
        s = s.replace(marca, 'data:image/webp;base64,' + b64)
    return s

# EL AUDIO SE HORNEA APARTE Y SE PEGA ACA, por el mismo motivo que las imagenes: 386 KB de base64
# dentro de una parte la vuelven imposible de leer y de parchear. Lo produce
# `python3 herramientas/rezuno/hornear_audio.py` a partir de herramientas/rezuno/audio/crudo/.
def pegar_audio(s):
    ruta = os.path.join(RAIZ, 'herramientas', 'rezuno', 'audio', 'audio_b64.js')
    txt = io.open(ruta, encoding='utf8').read()
    i, j = txt.index('{'), txt.rindex('}')
    assert '@@AUDIO_B64@@' in s, 'falta la marca @@AUDIO_B64@@'
    return s.replace('@@AUDIO_B64@@', txt[i:j+1])

def main():
    partes = os.path.join(RAIZ, 'herramientas', 'rezuno', 'partes')
    s = ''.join(io.open(os.path.join(partes, p), encoding='utf8').read() for p in PARTES)
    s = pegar_arte(s)
    s = pegar_audio(s)
    # SE ESCRIBE RECIEN CUANDO EL TEXTO ESTA COMPLETO: io.open(p,'w') trunca el archivo ANTES de
    # evaluar lo que se le pasa, y una vez un NameError en el argumento dejo un juego en cero bytes.
    salida = os.path.join(RAIZ, 'juegos-pc', 'RezUno.html')
    io.open(salida, 'w', encoding='utf8').write(s)
    print(salida, len(s), 'caracteres')
    return 0

if __name__ == '__main__':
    sys.exit(main())
