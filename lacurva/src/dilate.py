#!/usr/bin/env python3
"""Rellena el color de los pixeles transparentes con el del vecino opaco mas
cercano. Sin esto, los mipmaps de las tarjetas de hoja y pasto promedian el
fondo blanco y a media distancia el bosque se ve como palos blancos."""
import sys
from PIL import Image


def dilate(path, out, passes=10, alpha_cut=8):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = list(im.getdata())
    a = [p[3] for p in px]
    rgb = [[p[0], p[1], p[2]] for p in px]
    known = [v > alpha_cut for v in a]

    for _ in range(passes):
        new_known = known[:]
        changed = 0
        for y in range(h):
            base = y * w
            for x in range(w):
                i = base + x
                if known[i]:
                    continue
                r = g = b = n = 0
                for dy in (-1, 0, 1):
                    yy = y + dy
                    if yy < 0 or yy >= h:
                        continue
                    for dx in (-1, 0, 1):
                        xx = x + dx
                        if xx < 0 or xx >= w or (dx == 0 and dy == 0):
                            continue
                        j = yy * w + xx
                        if not known[j]:
                            continue
                        c = rgb[j]
                        r += c[0]; g += c[1]; b += c[2]; n += 1
                if n:
                    rgb[i] = [r // n, g // n, b // n]
                    new_known[i] = True
                    changed += 1
        known = new_known
        if not changed:
            break

    im.putdata([(rgb[i][0], rgb[i][1], rgb[i][2], a[i]) for i in range(w * h)])
    im.save(out)
    print('dilated', path, '->', out)


if __name__ == '__main__':
    dilate(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 10)
