#!/usr/bin/env python3
"""Hornea el arte del menu de RECREO a WebP chico y lo deja listo para embeber.

DOS COSAS QUE NO SON OBVIAS:

1. EL FONDO SE SACA CON UN RELLENO DESDE EL BORDE, NO CON UN UMBRAL DE LUMINANCIA.
   El logo tiene contorno negro ADENTRO de cada letra. Un umbral por brillo se lleva esos contornos
   junto con el fondo y las letras quedan agujereadas. Un relleno desde el borde solo se lleva el
   negro que esta CONECTADO al borde de la imagen, que es exactamente la definicion de "el fondo".

2. EL BORDE DE LA MASCARA SE SUAVIZA. Un recorte binario deja el diente de sierra del pixel, y sobre
   un fondo claro eso se ve como un halo escalonado alrededor del logo. Se difumina la mascara un
   pelo antes de aplicarla.
"""
import sys, io as _io
from collections import deque
from PIL import Image, ImageFilter

def quitar_fondo(im, umbral=64):
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()
    fondo = bytearray(w*h)
    q = deque()
    def luz(x, y):
        r, g, b = px[x, y]
        return (r*299 + g*587 + b*114)//1000
    for x in range(w):
        for y in (0, h-1):
            if not fondo[y*w+x] and luz(x, y) < umbral:
                fondo[y*w+x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w-1):
            if not fondo[y*w+x] and luz(x, y) < umbral:
                fondo[y*w+x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and 0 <= ny < h and not fondo[ny*w+nx] and luz(nx, ny) < umbral:
                fondo[ny*w+nx] = 1; q.append((nx, ny))
    alfa = Image.frombytes('L', (w, h), bytes(255 - 255*b for b in fondo))
    alfa = alfa.filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert('RGBA'); out.putalpha(alfa)
    return out

def recortar(im):
    caja = im.getbbox()
    return im.crop(caja) if caja else im

def guardar(im, ruta, ancho, calidad):
    if im.width > ancho:
        im = im.resize((ancho, max(1, round(im.height*ancho/im.width))), Image.LANCZOS)
    im.save(ruta, 'WEBP', quality=calidad, method=6)
    return im.size

if __name__ == '__main__':
    # fondo del menu: opaco, no necesita recorte
    f = Image.open('/tmp/art/a1.png').convert('RGB')
    print('fondo ', guardar(f, 'assets/recreo/menu_fondo.webp', 460, 70))
    # el logo y el boton: con canal alfa
    t = recortar(quitar_fondo(Image.open('/tmp/art/a12.png')))
    print('titulo', guardar(t, 'assets/recreo/menu_titulo.webp', 600, 82))
    b = recortar(quitar_fondo(Image.open('/tmp/art/a3.png')))
    print('boton ', guardar(b, 'assets/recreo/menu_boton.webp', 400, 80))
