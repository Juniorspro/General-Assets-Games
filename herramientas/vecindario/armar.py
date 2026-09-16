#!/usr/bin/env python3
"""Arma juegos-pc/Vecindario.html juntando las partes y pegando los assets horneados.

Mismo esquema que RezUno y RECREO: las partes son la fuente, el HTML es la salida, y los
assets grandes (texturas WebP, audio MP3, el GLB de la abuela) se pegan al armar para que
las partes sigan siendo legibles.

    python3 herramientas/vecindario/armar.py
"""
import base64, io, json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
PARTES = ['a.html', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js']


def main():
    s = ''.join(io.open(os.path.join(AQUI, 'partes', p), encoding='utf8').read() for p in PARTES)

    tex = {}
    for f in sorted(os.listdir(os.path.join(AQUI, 'tex_web'))):
        if f.endswith('.webp'):
            tex[f[:-5]] = base64.b64encode(
                io.open(os.path.join(AQUI, 'tex_web', f), 'rb').read()).decode('ascii')
    assert '@@TEXTURAS@@' in s
    s = s.replace('@@TEXTURAS@@', json.dumps(tex, separators=(',', ':')))

    aud = io.open(os.path.join(AQUI, 'audio_b64.js'), encoding='utf8').read()
    assert '@@AUDIO@@' in s
    s = s.replace('@@AUDIO@@', aud)

    glb = base64.b64encode(io.open(os.path.join(AQUI, 'abuela_p.glb'), 'rb').read()).decode('ascii')
    assert "'@@ABUELA@@'" in s
    s = s.replace('@@ABUELA@@', glb)

    # SE ESCRIBE RECIEN CUANDO EL TEXTO ESTA COMPLETO: io.open(p,'w') trunca antes de evaluar
    # el argumento, y un NameError ahi ya dejo un juego en cero bytes una vez.
    salida = os.path.join(RAIZ, 'juegos-pc', 'Vecindario.html')
    io.open(salida, 'w', encoding='utf8').write(s)
    print(salida, len(s), 'caracteres')
    return 0


if __name__ == '__main__':
    sys.exit(main())
