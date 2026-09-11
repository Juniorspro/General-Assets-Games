#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dibuja el icono del launcher. Cero assets: es una burbuja de vidrio.

Es la misma burbuja que flota en el fondo del escritorio, así que el icono y el
juego dicen lo mismo — y de paso se dibuja por código, que es lo que hace todo
este repo: un PNG generado que hay que versionar es un PNG que alguien va a
tener que volver a generar el día que cambie el color.
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
DENS = [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]
SS = 4                      # supermuestreo: los bordes de un orbe se ven a un píxel


def orbe(lado):
    L = lado*SS
    im = Image.new('RGBA', (L, L), (0, 0, 0, 0))
    px = im.load()
    r = L*0.465
    cx = cy = L/2.0

    # cuerpo: degradado de cian a azul con el borde más saturado (Fresnel)
    for y in range(L):
        for x in range(L):
            dx, dy = (x + .5 - cx)/r, (y + .5 - cy)/r
            d2 = dx*dx + dy*dy
            if d2 > 1.0:
                continue
            d = math.sqrt(d2)
            z = math.sqrt(max(0.0, 1.0 - d2))          # normal de la esfera
            k = (dy + 1)*.5                            # de arriba a abajo
            rr = 92 + (14 - 92)*k
            gg = 226 + (108 - 226)*k
            bb = 255 + (208 - 255)*k
            fre = (1.0 - z)**2.4                       # el canto se enciende
            rr += (210 - rr)*fre*.62
            gg += (245 - gg)*fre*.62
            bb += (255 - bb)*fre*.35
            a = 255 if d < .985 else int(255*(1 - (d - .985)/.015))
            px[x, y] = (int(rr), int(gg), int(bb), max(0, a))

    d = ImageDraw.Draw(im, 'RGBA')
    # brillo especular de arriba a la izquierda: lo que hace que se lea a vidrio
    bx, by = cx - r*.34, cy - r*.40
    d.ellipse([bx - r*.34, by - r*.24, bx + r*.34, by + r*.24], fill=(255, 255, 255, 205))
    # reflejo de abajo, más débil: es el suelo rebotando
    d.ellipse([cx - r*.40, cy + r*.40, cx + r*.40, cy + r*.66], fill=(190, 250, 255, 92))
    im = im.filter(ImageFilter.GaussianBlur(L*0.012))

    # aro exterior fino, para que se recorte contra un fondo claro
    d2i = ImageDraw.Draw(im, 'RGBA')
    d2i.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 120),
                width=max(2, int(L*.012)))
    return im.resize((lado, lado), Image.LANCZOS)


def main():
    for nom, lado in DENS:
        dst = os.path.join(AQUI, 'app', 'res', 'mipmap-' + nom)
        os.makedirs(dst, exist_ok=True)
        orbe(lado).save(os.path.join(dst, 'ic_launcher.png'), optimize=True)
        print('mipmap-%-8s %3dx%-3d' % (nom, lado, lado))


if __name__ == '__main__':
    main()
