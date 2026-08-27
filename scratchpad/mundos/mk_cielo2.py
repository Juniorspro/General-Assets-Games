#!/usr/bin/env python3
"""CIERRA LA COSTURA de un equirectangular ya armado, y arma cielos nuevos.

POR QUE existe aparte de mk_cielo.py
------------------------------------
mk_cielo.py intentaba cerrar la costura mezclando la imagen con una copia
corrida media vuelta, al 50% en el borde. Esa mezcla REDUCE el salto a la mitad
pero NO lo anula: si el borde izquierdo y el derecho no eran iguales, siguen sin
serlo. Medido sobre los cielos del repo (2048x1024, diferencia media absoluta
entre la columna 0 y la 2047, contra un gradiente horizontal normal de ~0.4):

    estepa 19.9 de media y 81 de pico   canon 7.9 / 38   volcan 12.5 / 52
    pantano 7.0 / 90                    acropolis 3.4 / 23   jungla 2.0 / 18
    dunas 0.6 / 5                       secuoya 1.0 / 6

Y se comprobo que la costura NO viene del muestreo: dibujando el mismo JPG como
scene.background con mipmaps y sin mipmaps, el salto de brillo en pantalla es el
mismo (46 niveles contra un gradiente medio de 0.25). O sea: esta en el asset.

COMO SE CIERRA ACA
------------------
Por CORRECCION DE GRADIENTE, no por mezcla. Para cada fila se mide la diferencia
d entre el pixel del borde izquierdo y el del derecho, se suaviza esa diferencia
a lo largo de las filas (si no, aparecen rayas horizontales), y se reparte
-d/2 hacia el borde izquierdo y +d/2 hacia el derecho, con una rampa coseno que
muere a `banda` pixeles del borde. Asi la columna 0 y la 2047 quedan EXACTAMENTE
en el mismo valor -> continuidad garantizada, y no se duplica ninguna nube: lo
unico que cambia es un degrade suave de color cerca del meridiano del corte.
Es lo mismo que hace un "seamless clone" de Poisson, resuelto en 1D porque la
costura de un equirect es una sola columna.

Uso:
  python3 mk_cielo2.py cerrar <entrada.jpg> <salida.jpg> [banda%]
  python3 mk_cielo2.py armar  <foto.png> <salida.jpg> <#nieblahex> [horizonte 0..1]
  python3 mk_cielo2.py medir  <a.jpg> [b.jpg ...]
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

W, H = 2048, 1024


def _suave(v, sigma):
    """gaussiana 1D sobre las filas: la diferencia de borde medida fila a fila
    es ruidosa, y aplicarla cruda deja rayas horizontales en el cielo"""
    r = int(sigma * 3) or 1
    k = np.exp(-.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    pad = np.pad(v, ((r, r), (0, 0)), mode='edge')
    return np.stack([np.convolve(pad[:, c], k, 'valid') for c in range(v.shape[1])], 1)


def _borron(a, ancho, radio):
    """difumina SOLO en horizontal una banda angosta centrada en la costura.
    Se hace corriendo la imagen media vuelta (asi la costura cae al medio y el
    filtro puede cruzarla), y volviendola a su lugar."""
    h, w, _ = a.shape
    rot = np.roll(a, w // 2, axis=1)
    k = np.exp(-.5 * (np.arange(-radio * 3, radio * 3 + 1) / radio) ** 2)
    k /= k.sum()
    c = w // 2
    tramo = rot[:, c - ancho - radio * 3: c + ancho + radio * 3 + 1]
    sua = np.stack([[np.convolve(tramo[y, :, ch], k, 'same')
                     for ch in range(3)] for y in range(h)]).transpose(0, 2, 1)
    # mascara coseno: 1 en la costura, 0 a `ancho` pixeles, asi el difuminado no
    # deja su propio borde donde termina
    off = np.arange(tramo.shape[1]) - tramo.shape[1] // 2
    msk = np.clip(1 - np.abs(off) / ancho, 0, 1)
    msk = (.5 * (1 - np.cos(np.pi * msk)))[None, :, None]
    rot[:, c - ancho - radio * 3: c + ancho + radio * 3 + 1] = tramo * (1 - msk) + sua * msk
    return np.roll(rot, -(w // 2), axis=1)


def cerrar(a, banda=.12, sigma=3., ancho=14, radio=4):
    """iguala la columna 0 con la ultima en dos pasos.

    1) CORRECCION DE GRADIENTE con la diferencia de borde suavizada entre filas.
       El suavizado NO es cosmetico: sin el, la correccion cambia de golpe de una
       fila a la siguiente y deja RAYAS HORIZONTALES pegadas al meridiano del
       corte (se vieron en el cielo de pantano, que es oscuro y tiene 90 niveles
       de desajuste en unas pocas filas sueltas). Con suavizado se va la parte
       gruesa del desajuste, que es la que se lee como linea vertical.
    2) BORRON HORIZONTAL de 14 px a cada lado de la costura, que se come el resto
       de la diferencia fila por fila. 28 px de 2048 son 5 grados de azimut
       levemente blandos en un cielo: no se nota, y garantiza que no queda
       escalon. Es lo que hace que la costura baje de 90 a menos de 3.
    """
    a = a.astype(np.float32)
    h, w, _ = a.shape
    b = max(4, int(w * banda))
    d = _suave(a[:, 0] - a[:, -1], sigma) if sigma > 0 else (a[:, 0] - a[:, -1])
    # rampa coseno: 1 en el borde, 0 a `b` pixeles. Continua en derivada, asi que
    # el arreglo no deja un segundo escalon donde termina la banda.
    x = np.arange(b, dtype=np.float32)
    f = .5 * (1 + np.cos(np.pi * x / b))                 # f[0]=1, f[b-1]~0
    out = a.copy()
    out[:, :b] -= (d / 2)[:, None, :] * f[None, :, None]
    out[:, w - b:] += (d / 2)[:, None, :] * f[::-1][None, :, None]
    out = np.clip(out, 0, 255)
    if ancho:
        out = np.clip(_borron(out, ancho, radio), 0, 255)
    return out


def costura(a):
    """diferencia media y de pico entre las dos columnas que empalman"""
    d = np.abs(a[:, 0].astype(np.float32) - a[:, -1].astype(np.float32)).mean(axis=1)
    gh = np.abs(np.diff(a.astype(np.float32), axis=1)).mean()
    return d.mean(), d.max(), gh


def guardar(im, salida, kb=200):
    """baja la calidad JPEG hasta entrar en el peso objetivo (los cielos que ya
    estaban en el repo pesan 64-180 KB; pasarse arruina la carga en celular)"""
    for q in (88, 84, 80, 76, 72, 68, 62):
        im.save(salida, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(salida) <= kb * 1024:
            return q
    return q


def armar(entrada, niebla, hor=None):
    """igual que mk_cielo.py: estira del cenit al horizonte de la foto sobre la
    mitad de arriba del equirect y rellena la de abajo con la bruma del mundo"""
    src = Image.open(entrada).convert('RGB')
    a0 = np.asarray(src).astype(np.float32)
    if hor is None:
        br = a0.mean(axis=(1, 2))
        n = len(br)
        hor = (int(np.argmax(br[int(n * .45):int(n * .97)])) + int(n * .45)) / (n - 1)
    hpx = max(2, int(a0.shape[0] * hor))
    arriba = src.crop((0, 0, src.size[0], hpx)).resize((W, H // 2), Image.LANCZOS)
    cielo = Image.new('RGB', (W, H))
    cielo.paste(arriba, (0, 0))
    aa = np.asarray(arriba).astype(np.float32)
    colHor = aa[-6:].mean(axis=(0, 1))
    s = niebla.lstrip('#')
    colNie = np.array([int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)], np.float32)
    filas = H - H // 2
    v = (np.arange(filas) / (filas - 1)).astype(np.float32)[:, None, None]
    k = v ** .55
    baja = (colHor * (1 - k) + colNie * k) * (1 - .30 * v)
    baja = np.repeat(baja, W, axis=1)
    cielo.paste(Image.fromarray(np.clip(baja, 0, 255).astype(np.uint8)), (0, H // 2))
    fr = cielo.crop((0, H // 2 - 18, W, H // 2 + 18)).filter(ImageFilter.GaussianBlur(6))
    cielo.paste(fr, (0, H // 2 - 18))
    return np.asarray(cielo).astype(np.float32), hor


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    modo = sys.argv[1]
    if modo == 'medir':
        for f in sys.argv[2:]:
            a = np.asarray(Image.open(f).convert('RGB'))
            m, p, g = costura(a)
            print('%-26s costura media %6.2f  pico %6.2f  (gradiente normal %.2f)'
                  % (os.path.basename(f), m, p, g))
    elif modo == 'cerrar':
        ent, sal = sys.argv[2], sys.argv[3]
        banda = float(sys.argv[4]) / 100 if len(sys.argv) > 4 else .12
        a = np.asarray(Image.open(ent).convert('RGB'))
        if a.shape[1] != W:
            a = np.asarray(Image.fromarray(a).resize((W, H), Image.LANCZOS))
        m0, p0, _ = costura(a)
        out = cerrar(a, banda)
        im = Image.fromarray(out.astype(np.uint8))
        q = guardar(im, sal)
        m1, p1, _ = costura(np.asarray(Image.open(sal).convert('RGB')))
        print('%-24s costura %6.2f/%6.2f -> %5.2f/%5.2f   %4d KB  q%d'
              % (os.path.basename(sal), m0, p0, m1, p1, os.path.getsize(sal) // 1024, q))
    elif modo == 'armar':
        ent, sal, nie = sys.argv[2], sys.argv[3], sys.argv[4]
        hor = float(sys.argv[5]) if len(sys.argv) > 5 else None
        a, hor = armar(ent, nie, hor)
        out = cerrar(a, .12)
        im = Image.fromarray(out.astype(np.uint8))
        q = guardar(im, sal)
        m1, p1, _ = costura(np.asarray(Image.open(sal).convert('RGB')))
        print('%-24s horizonte %.0f%%  costura %5.2f/%5.2f  %4d KB  q%d'
              % (os.path.basename(sal), hor * 100, m1, p1, os.path.getsize(sal) // 1024, q))
    else:
        raise SystemExit(__doc__)
