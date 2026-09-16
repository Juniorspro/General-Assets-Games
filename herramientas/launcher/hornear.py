#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mete el fondo y la mascota adentro del HTML, en base64.

Los crudos salen de Rezona (proyecto `uSEsgNYW`) y viven en `crudo/`; lo que se
versiona es esto y la salida, no los PNG de un mega.
"""
import base64, io, os, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'crudo')
SAL = os.path.join(AQUI, 'partes', 'i_img.js')


def webp(im, q, sinperdida=False):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6, lossless=sinperdida)
    return b.getvalue()


def uri(d, mime='image/webp'):
    return 'data:%s;base64,%s' % (mime, base64.b64encode(d).decode())


# ══════════ EL FONDO ══════════
def fondo():
    im = Image.open(os.path.join(CRUDO, 'fondo9x16.png')).convert('RGB')
    # ── EL ANCHO SALE DE LA PANTALLA, NO DEL ARCHIVO ──
    # Un teléfono de 412 px de ancho a densidad 2 pide 824; a 3, 1236. Con 824 el
    # fondo se ve nítido en la enorme mayoría y pesa la mitad que a 1236 — y acá
    # no hay un solo borde fino que se pueda ver pixelado: es cielo, agua y pasto.
    im = im.resize((824, round(824*im.height/im.width)), Image.LANCZOS)
    mejor, q = None, None
    for cal in (82, 76, 70, 64, 58):
        d = webp(im, cal)
        mejor, q = d, cal
        if len(d) <= 140*1024:
            break
    print('  fondo   %dx%d  q%d  %d KB' % (im.width, im.height, q, len(mejor)//1024))
    return uri(mejor), im.width, im.height


def main():
    print('horneando:')
    f, fw, fh = fondo()
    txt = (
        '/* ══════════════════════ EL FONDO ══════════════════════\n'
        '   Generado con Rezona (proyecto descartable `uSEsgNYW`) y horneado por\n'
        '   `hornear.py`. El crudo vive en `crudo/` y no se versiona.\n'
        '   LA MASCOTA YA NO ESTA ACA: era una tira de ocho laminas y paso a ser el\n'
        '   modelo 3D riggeado del usuario — `hornear_3d.py` -> `i_lemi.js`. */\n'
        'const IMG_FONDO = "%s";\n'
        'const FONDO_W = %d, FONDO_H = %d;\n'
    ) % (f, fw, fh)
    io.open(SAL, 'w', encoding='utf-8').write(txt)
    print('-> %s  %d KB' % (SAL, len(txt.encode())//1024))


if __name__ == '__main__':
    main()
