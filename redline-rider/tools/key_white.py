#!/usr/bin/env python3
"""Quita un fondo BLANCO con desmatado, no con recorte duro.

Un recorte por umbral deja el borde con dientes y, peor, deja un halo blanco alrededor de
la silueta que sobre el HUD oscuro del juego se ve como un contorno sucio. Aqui la
transparencia sale de la distancia al blanco y luego se DESHACE la mezcla: si lo observado
es  obs = a*C + (1-a)*255,  el color real es  C = (obs - 255*(1-a)) / a.

El umbral se queda alto (235) a proposito para no comerse las garras color crema del
personaje, que estan a solo 200 de minimo de canal.
"""
import sys
from PIL import Image

T = 235          # por encima de esto se considera fondo
# Suelo de transparencia. El fondo no es 255 limpio: hay pixeles sueltos a 254, y con el
# umbral de arriba esos daban alfa 0,05, contaban como contenido y el recorte salia con la
# imagen entera. Por debajo de este valor se considera fondo y punto.
MAXW = 384       # lado maximo de salida: en pantalla el asistente ocupa unos 240 px

def key(src, dst):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    px = im.load()
    out = Image.new('RGBA', (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            m = min(r, g, b)
            a = 0.0 if m >= 255 else min(1.0, (255 - m) / (255 - T))
            if a <= 0.12:
                op[x, y] = (0, 0, 0, 0)
                continue
            if a >= 0.997:
                op[x, y] = (r, g, b, 255)
                continue
            inv = 255 * (1 - a)
            op[x, y] = (max(0, min(255, int((r - inv) / a))),
                        max(0, min(255, int((g - inv) / a))),
                        max(0, min(255, int((b - inv) / a))),
                        int(a * 255))
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    if max(out.size) > MAXW:
        k = MAXW / max(out.size)
        out = out.resize((max(1, int(out.size[0] * k)), max(1, int(out.size[1] * k))), Image.LANCZOS)
    out.save(dst, 'WEBP', quality=82, method=6)
    return out.size

if __name__ == '__main__':
    print(*key(sys.argv[1], sys.argv[2]))
