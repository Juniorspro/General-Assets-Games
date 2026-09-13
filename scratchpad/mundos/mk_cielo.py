#!/usr/bin/env python3
"""ARMA UN CIELO EQUIRECTANGULAR de verdad a partir de una foto de cielo.

Dos cosas estaban mal:

1. Varios cielos eran fotos 16:9 (1376x768) puestas como si fueran panoramas
   equirectangulares 2:1. En un equirect la fila del MEDIO es el HORIZONTE y la
   de arriba es el CENIT. En una foto normal el horizonte esta al 85% de la
   altura, asi que al mapearla sobre la esfera el horizonte de la foto caia muy
   por debajo del horizonte real y lo que quedaba a la altura de la vista era el
   SUELO de la foto: de ahi que en SECUOYA se vieran troncos en el cielo y en
   CAÑON paredes de roca.

2. La mitad de abajo del equirect (del horizonte al nadir) era un relleno plano
   de color arena. Donde el terreno no llegaba a taparlo, quedaba una BANDA
   NARANJA dura pegada al horizonte.

Aca se hace bien: se busca el horizonte de la foto (la fila mas clara de la zona
baja, que es la bruma), se estira DE ARRIBA A ESE HORIZONTE sobre la mitad de
arriba del equirect, y la mitad de abajo se llena con el color de la NIEBLA del
mundo, arrancando del color del propio horizonte. Asi el corte no existe: lo que
asome se lee como bruma de distancia.

Uso: python3 mk_cielo.py <entrada> <salida.jpg> <#nieblahex> [horizonte 0..1]
"""
import sys

import numpy as np
from PIL import Image, ImageChops, ImageFilter

W, H = 2048, 1024


def buscar_horizonte(a):
    """la fila del horizonte: en la mitad baja, donde la bruma hace pico de brillo
    y ademas la imagen deja de tener estructura vertical"""
    br = a.mean(axis=(1, 2))
    n = len(br)
    zona = slice(int(n * .45), int(n * .97))
    sub = br[zona]
    # el horizonte es el maximo de brillo de la zona baja (la bruma)
    i = int(np.argmax(sub)) + int(n * .45)
    return i / (n - 1)


def hexrgb(s):
    s = s.lstrip('#')
    return np.array([int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)], np.float32)


def arma(entrada, salida, niebla, hor=None):
    src = Image.open(entrada).convert('RGB')
    a0 = np.asarray(src).astype(np.float32)
    if hor is None:
        hor = buscar_horizonte(a0)
    hpx = max(2, int(a0.shape[0] * hor))

    # --- la mitad de ARRIBA: del cenit al horizonte -------------------------
    arriba = src.crop((0, 0, src.size[0], hpx)).resize((W, H // 2), Image.LANCZOS)
    cielo = Image.new('RGB', (W, H))
    cielo.paste(arriba, (0, 0))

    # --- la mitad de ABAJO: bruma, del color del horizonte al de la niebla ---
    aa = np.asarray(arriba).astype(np.float32)
    colHor = aa[-6:].mean(axis=(0, 1))                    # el color del horizonte
    colNie = hexrgb(niebla)
    filas = H - H // 2
    v = (np.arange(filas) / max(1, filas - 1)).astype(np.float32)[:, None, None]
    # arranca EXACTO en el color del horizonte y va a la niebla, oscureciendo
    # apenas hacia el nadir: nunca hay salto porque el primer renglon coincide
    k = v ** .55
    baja = colHor * (1 - k) + colNie * k
    baja = baja * (1 - .30 * v)
    baja = np.repeat(baja, W, axis=1)
    cielo.paste(Image.fromarray(np.clip(baja, 0, 255).astype(np.uint8)), (0, H // 2))

    # --- LA COSTURA: en un equirect el borde izquierdo empalma con el derecho -
    b = int(W * .06)
    corr = Image.new('RGB', (W, H))
    corr.paste(cielo.crop((W // 2, 0, W, H)), (0, 0))
    corr.paste(cielo.crop((0, 0, W // 2, H)), (W // 2, 0))
    masc = Image.new('L', (W, H), 0)
    mp = masc.load()
    for x in range(b):
        al = int(255 * (1 - x / b) * .5)
        for y in range(H):
            mp[x, y] = al
            mp[W - 1 - x, y] = al
    cielo = Image.composite(corr, cielo, masc)
    # y la juntura horizonte/bruma, difuminada
    fr = cielo.crop((0, H // 2 - 18, W, H // 2 + 18)).filter(ImageFilter.GaussianBlur(6))
    cielo.paste(fr, (0, H // 2 - 18))
    cielo = cielo.filter(ImageFilter.GaussianBlur(.3))

    cielo.save(salida, 'JPEG', quality=87, optimize=True, progressive=True)
    import os
    import statistics
    d = ImageChops.difference(cielo.crop((0, 0, 1, H)), cielo.crop((W - 1, 0, W, H))).convert('L')
    print('%-24s horizonte de la foto %.0f%%  ->  %5d KB  costura %.1f'
          % (salida.split('/')[-1], hor * 100,
             os.path.getsize(salida) // 1024,
             statistics.mean(list(d.getdata()))))


if __name__ == '__main__':
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    arma(sys.argv[1], sys.argv[2], sys.argv[3],
         float(sys.argv[4]) if len(sys.argv) > 4 else None)
