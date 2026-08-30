#!/usr/bin/env python3
"""Arma juegos-pc/Lemi.html pegando las partes y el logo.

    python3 herramientas/lemi/armar.py

POR QUE VIVE PARTIDO: el HTML terminado pasa del medio mega y casi todo eso es
el logo en base64. Editar un archivo asi con parches de texto es operar con
guantes de horno —ya costo el archivo entero en cero bytes en otro juego de
este repo— y ademas la parte donde uno lee el CSS empezaria con cuatrocientos
mil caracteres de basura. Las partes son la fuente; el HTML es la salida.

EL LOGO NO VIVE EN EL CODIGO FUENTE. Esta en assets/lemi/logo.png y se pega
sobre la marca @@LOGO@@, igual que hace RezUno con su mano y su titulo.
"""
import base64, io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
PARTES = os.path.join(AQUI, 'partes')
LOGO = os.path.join(RAIZ, 'assets', 'lemi', 'logo.png')

# `t.js` VA PRIMERO Y NO DONDE QUEDE MAS PROLIJO: es la tabla de textos y
# la lee todo lo demas. Un `const` leido antes de su linea no rompe una
# funcion, rompe el modulo entero — ya paso cuatro veces en este repo.
ORDEN = ['a.html', 't.js', 's.js', 'u.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js', 'g.js', 'i.js', 'j.js', 'h.js', 'z.html']


def main():
    trozos = []
    for n in ORDEN:
        p = os.path.join(PARTES, n)
        if not os.path.exists(p):
            print('  (falta ' + n + ', se saltea)')
            continue
        trozos.append(io.open(p, encoding='utf8').read())
    s = ''.join(trozos)

    if '@@LOGO@@' in s:
        if os.path.exists(LOGO):
            b64 = base64.b64encode(io.open(LOGO, 'rb').read()).decode('ascii')
            s = s.replace('@@LOGO@@', 'data:image/png;base64,' + b64)
            print('  logo:', os.path.getsize(LOGO), 'bytes ->', len(b64), 'en base64')
        else:
            # sin logo el menu no puede quedar con un <img> roto: mejor sin imagen
            s = s.replace('@@LOGO@@', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==')
            print('  OJO: no hay logo en', LOGO)

    salida = os.path.join(RAIZ, 'juegos-pc', 'Lemi.html')
    io.open(salida, 'w', encoding='utf8').write(s)
    print(salida, len(s), 'caracteres')
    return 0


if __name__ == '__main__':
    sys.exit(main())
