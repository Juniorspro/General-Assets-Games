#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mete el fondo y la mascota adentro del HTML, en base64.

Los dos crudos salen de Rezona (proyecto `uSEsgNYW`) y viven en `crudo/`; lo que
se versiona es esto y la salida, no el PNG de dos megas.
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


# ══════════ LA MASCOTA ══════════
def cajas_alfa(a, umbral=24):
    """Las columnas con tinta separan los cuadros: la hoja viene con los tres en
    fila y el generador no los deja donde uno se los imagina, así que se miden."""
    W, H = a.size
    px = a.load()
    col = [False]*W
    for x in range(W):
        for y in range(0, H, 2):
            if px[x, y] > umbral:
                col[x] = True
                break
    tramos, i = [], 0
    while i < W:
        if col[i]:
            j = i
            while j < W and col[j]:
                j += 1
            if j - i > W//40:
                tramos.append((i, j))
            i = j
        else:
            i += 1
    return tramos


def mascota():
    im = Image.open(os.path.join(CRUDO, 'mascota.png')).convert('RGBA')
    a = im.split()[3]
    tramos = cajas_alfa(a)
    if len(tramos) != 3:
        sys.exit('la hoja de la mascota tiene %d cuadros y no 3: %s' % (len(tramos), tramos))

    # cada cuadro a su caja exacta
    recortes = []
    for x0, x1 in tramos:
        sub = im.crop((x0, 0, x1, im.height))
        recortes.append(sub.crop(sub.split()[3].getbbox()))

    # ── UNA SOLA ESCALA PARA LOS TRES, Y LA MISMA LÍNEA DE PISO ──
    # Escalando cada cuadro a su propia caja, el que levanta los brazos se
    # agranda y la mascota LATE al bailar en vez de bailar. Se escala por el más
    # alto y se alinean abajo y al centro, que es el pie apoyado.
    ALTO = 132
    k = ALTO/max(r.height for r in recortes)
    esc = [r.resize((max(1, round(r.width*k)), max(1, round(r.height*k))), Image.LANCZOS)
           for r in recortes]
    cw, ch = max(r.width for r in esc), ALTO
    hoja = Image.new('RGBA', (cw*3, ch), (0, 0, 0, 0))
    for i, r in enumerate(esc):
        hoja.paste(r, (i*cw + (cw - r.width)//2, ch - r.height), r)

    d = webp(hoja, 88)
    print('  mascota %dx%d  celda %dx%d  %d KB' % (hoja.width, hoja.height, cw, ch, len(d)//1024))
    return uri(d), cw, ch


def main():
    print('horneando:')
    f, fw, fh = fondo()
    m, mw, mh = mascota()
    txt = (
        '/* ══════════════════════ LOS DOS ASSETS ══════════════════════\n'
        '   Generados con Rezona (proyecto descartable `uSEsgNYW`) y horneados por\n'
        '   `hornear.py`. Los crudos viven en `crudo/` y no se versionan.\n'
        '   El fondo es la única imagen grande del launcher; la mascota son tres\n'
        '   cuadros en fila con la MISMA celda, así que animarla es correr la x. */\n'
        'const IMG_FONDO = "%s";\n'
        'const FONDO_W = %d, FONDO_H = %d;\n'
        'const IMG_MASCOTA = "%s";\n'
        'const MASC_W = %d, MASC_H = %d, MASC_N = 3;\n'
    ) % (f, fw, fh, m, mw, mh)
    io.open(SAL, 'w', encoding='utf-8').write(txt)
    print('→ %s  %d KB' % (SAL, len(txt.encode())//1024))


if __name__ == '__main__':
    main()
