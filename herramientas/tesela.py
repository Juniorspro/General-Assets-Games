# -*- coding: utf-8 -*-
"""Vuelve teselable de verdad una foto generada, y MIDE la costura.

Los tres pasos son los que ya estaban anotados en assets/fp/tex/LEEME.md:
  planchar(): saca el degrade de luz. Sin esto, curar una foto con vineta deja una CRUZ
              visible al repetir, porque el borde oscuro pega contra el centro claro.
  curar():    desplaza media imagen (la costura queda en el centro) y funde las dos lineas
              centrales con su propio espejo en una banda angosta. El borde exterior, que
              antes era interior, queda continuo al repetir.
  costura():  |columna 0 - columna -1| normalizado contra el gradiente interno medio.
              1.0 = la union se ve igual que el ruido propio de la textura, o sea invisible.
"""
import sys, numpy as np
from PIL import Image, ImageFilter

def cargar(p, lado=1024):
    im = Image.open(p).convert('RGB')
    if im.size != (lado, lado):
        im = im.resize((lado, lado), Image.LANCZOS)
    return np.asarray(im).astype(np.float32)

def planchar(a, sigma=None):
    """divide por su propia version muy borrosa: se va la luz y queda el material"""
    h = a.shape[0]
    sigma = sigma or h/8.0
    borroso = np.asarray(Image.fromarray(a.astype(np.uint8))
                         .filter(ImageFilter.GaussianBlur(sigma))).astype(np.float32)
    medio = borroso.reshape(-1,3).mean(0)
    out = a / np.maximum(borroso, 1.0) * medio
    return np.clip(out, 0, 255)

def _fundir_eje(a, banda):
    """funde la costura que quedo en el centro de la columna, con su espejo"""
    h, w = a.shape[:2]
    c = w//2
    out = a.copy()
    for i in range(banda):
        # peso: 0.5 en la costura misma, cae a 0 al borde de la banda
        t = 0.5 * (1.0 - i/float(banda))
        iz, de = c-1-i, c+i
        a_iz, a_de = out[:, iz].copy(), out[:, de].copy()
        out[:, iz] = a_iz*(1-t) + a_de*t
        out[:, de] = a_de*(1-t) + a_iz*t
    return out

def curar(a, banda=None):
    """NO se vuelve a desplazar al final, y esto es el punto entero del metodo.
    Desplazando media imagen, las dos columnas que antes eran los BORDES quedan pegadas en el
    centro: ahi esta el salto, y ahi se funde. El borde nuevo son las dos columnas que en la foto
    original eran VECINAS, asi que al repetir se juntan dos columnas contiguas de verdad y el paso
    entre ellas es el paso normal de la textura.
    Devolviendo el desplazamiento se deshace todo: las dos columnas fundidas vuelven al borde, y
    como fundir con el espejo las deja IGUALES, al repetir queda una linea plana de un pixel. Medido
    daba costura 0.00, que parecia perfecto y era el sintoma del error: las texturas que ya andan en
    el juego miden ~1.0, o sea un paso normal, no cero."""
    h, w = a.shape[:2]
    banda = banda or max(6, w//24)
    a = np.roll(a, w//2, axis=1)          # la costura vertical va al centro
    a = _fundir_eje(a, banda)             # y ahi se queda curada
    a = np.rot90(a, 1)                    # ahora la horizontal, con el mismo codigo
    h2, w2 = a.shape[:2]
    a = np.roll(a, w2//2, axis=1)
    a = _fundir_eje(a, banda)
    a = np.rot90(a, -1)
    return a

def costura(a):
    """cuanto se nota la union, contra el ruido propio de la textura. 1.0 = invisible."""
    g = a.mean(2)
    salto_v = np.abs(g[:, 0] - g[:, -1]).mean()
    salto_h = np.abs(g[0, :] - g[-1, :]).mean()
    interno = np.abs(np.diff(g, axis=1)).mean()
    if interno < 1e-6: return 0.0, 0.0
    return salto_v/interno, salto_h/interno

if __name__ == '__main__':
    lado = 1024
    for p in sys.argv[1:]:
        nom = p.rsplit('/',1)[-1].rsplit('.',1)[0]
        a0 = cargar(p, lado)
        v0, h0 = costura(a0)
        a = planchar(a0)
        a = curar(a)
        v1, h1 = costura(a)
        Image.fromarray(a.astype(np.uint8)).save('/tmp/tex/%s.webp'%nom, 'WEBP', quality=92, method=6)
        print('%-14s costura antes v=%.2f h=%.2f  ->  despues v=%.2f h=%.2f' % (nom, v0, h0, v1, h1))


# ---------------- el camino de las CUADRICULAS ----------------
# El espejo de curar() no sirve con una grilla: al fundir con su reflejo, la hilada de ladrillos
# queda desalineada y se ve un quiebre en el patron. Para estas se busca el PERIODO de la grilla por
# autocorrelacion, se recorta un numero ENTERO de periodos y se reescala. Asi el borde calza exacto
# con el borde de al lado, porque son el mismo punto del patron.

def periodo(a, eje, lo=None, hi=None):
    """el desplazamiento que mejor se parece a si mismo: eso es el periodo de la grilla.

    LA VENTANA VA FIJA. Comparando g[:, d:] con g[:, :-d] el solape se ACHICA con d, y el promedio
    de un solape chico baja por si solo: el minimo se iba siempre al borde del rango (daba 511 sobre
    1024, o sea media imagen, que no es el periodo de nada). Comparando siempre una banda del mismo
    ancho, los valores de distintos d son comparables entre si.
    """
    g = a.mean(2)
    n = g.shape[eje]
    if eje == 0: g = g.T
    m = n//3                      # la banda de comparacion, fija
    lo = lo or 12
    hi = hi or (n - m)
    base = g[:, :m]
    mejor, mejor_d = None, lo
    for d in range(lo, hi):
        dif = np.abs(g[:, d:d+m] - base).mean()
        if mejor is None or dif < mejor: mejor, mejor_d = dif, d
    return mejor_d, mejor

def cuadricula(a, lado=1024):
    """recorta un numero entero de periodos en cada eje y reescala al lado pedido"""
    h, w = a.shape[:2]
    px, ex = periodo(a, 1)
    py, ey = periodo(a, 0)
    # tantos periodos como entren, para no perder detalle recortando de mas
    nx = max(1, w//px); ny = max(1, h//py)
    rec = a[:ny*py, :nx*px]
    im = Image.fromarray(rec.astype(np.uint8)).resize((lado, lado), Image.LANCZOS)
    return np.asarray(im).astype(np.float32), (px, nx, py, ny)


# ---------------- las NORMALES, derivadas aca y no en el telefono ----------------
# El juego ya sabe derivar normales del color (alcPBRUno), pero hacerlo en JS sobre un lienzo cuesta
# caro en un telefono: medido, hasta un segundo y medio POR MATERIAL en un rasterizador por software.
# Derivadas aca van como archivo y el aparato solo las descarga. Mismo formato que las que ya estan:
# tangencial, R y G centrados en 127 con un recorrido de +-60, y B casi 255.

def normal(a, fuerza=1.0, sigma=1.2):
    from PIL import ImageFilter
    g = a.mean(2)
    g = np.asarray(Image.fromarray(g.astype(np.uint8)).filter(ImageFilter.GaussianBlur(sigma))).astype(np.float32)
    g = g / 255.0
    # gradiente con envoltura: la normal tiene que ser teselable igual que el color
    dx = (np.roll(g, -1, axis=1) - np.roll(g, 1, axis=1)) * 0.5
    dy = (np.roll(g, -1, axis=0) - np.roll(g, 1, axis=0)) * 0.5
    esc = 6.0 * fuerza
    nx, ny, nz = -dx*esc, dy*esc, np.ones_like(g)
    largo = np.sqrt(nx*nx + ny*ny + nz*nz)
    nx, ny, nz = nx/largo, ny/largo, nz/largo
    out = np.stack([nx*127.5+127.5, ny*127.5+127.5, nz*127.5+127.5], axis=2)
    return np.clip(out, 0, 255)
