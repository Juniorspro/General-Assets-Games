#!/usr/bin/env python3
"""Corta las hojas de expresiones generadas y arma el atlas de la cara.

    python3 herramientas/barrio/hornear_cara.py

DE DÓNDE SALEN: dos hojas generadas con Higgsfield —una de dieciséis pares de
ojos con cejas y otra de dieciséis bocas—, dibujadas planas sobre blanco. De ahí
salen los sprites sueltos en `assets/barrio/cara/` y los dos atlas que el juego
lleva adentro.

TRES COSAS QUE HAY QUE HACER BIEN:

1. EL FONDO SE SACA POR RELLENO DESDE EL BORDE Y NO POR UMBRAL DE BRILLO. El
   blanco de afuera y el blanco de ADENTRO del ojo son el mismo blanco: con un
   umbral se va la esclerótica junto con el fondo y quedan dos anillos huecos.
   Rellenando desde el borde, lo que no se alcanza es dibujo. Es la misma
   corrección que costó una vuelta con el logo de RECREO.

2. CADA CUADRO SE REGISTRA, y es lo único que separa un atlas de una hoja de
   dibujos. Los dieciséis pares no están en el mismo sitio ni miden lo mismo
   —medido, el centro se corre treinta píxeles de columna a columna— y un
   parpadeo con los ojos corridos tres milímetros se ve como un tic. Se registra
   por el ANCHO DEL PAR y por la LÍNEA DE LOS OJOS, no por la caja de tinta
   entera: la caja entera incluye las cejas, y las cejas suben y bajan a
   propósito.

3. Y LA GRILLA SE MIDE, no se supone. El generador no deja las celdas donde uno
   se las imagina: acá el paso es de 481 píxeles y no de 512, y cortando de a
   512 el último cuadro sale partido al medio.
"""
import io, json, os, sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
SALIDA = os.path.join(RAIZ, 'assets', 'barrio', 'cara')

OJOS = ['neutro', 'medio', 'cerrado', 'sorpresa',
        'enojo', 'triste', 'feliz', 'cansado',
        'izq', 'centro', 'der', 'arriba',
        'entrecerrado', 'duda', 'abajo', 'somnoliento',
        # ── segunda hoja ──
        # Los cuatro primeros son LA RAMPA DEL PARPADEO, y son la razón de ser
        # de esta hoja: con un solo cuadro intermedio un parpadeo son tres
        # escalones y se ve a interruptor; con cinco se ve a párpado.
        'ab90', 'ab70', 'ab50', 'ab25',
        'arribaIzq', 'arribaDer', 'abajoIzq', 'abajoDer',
        'guinoIzq', 'guinoDer', 'cejaAlta', 'terror',
        'llanto', 'sospecha', 'asco', 'dormido']
BOCAS = ['cerrada', 'entreabierta', 'a', 'grande',
         'e', 'o', 'u', 'sonrisa',
         'sonrisaCerrada', 'sonrisaChica', 'triste', 'mueca',
         'dientes', 'sorpresa', 'ladeada', 'apretada',
         # ── segunda hoja: los visemas que faltaban y las muecas ──
         'i', 'f', 'sellada', 'l',
         'sonrisaDientes', 'risa', 'mediaIzq', 'mediaDer',
         'beso', 'oChica', 'asco', 'grunido',
         'bostezo', 'tristeAbierta', 'duda', 'lengua']


def recorta(hoja, n=4):
    """LA GRILLA SE DERIVA DE LA CAJA DE TINTA DE LA HOJA ENTERA, no de buscar
    los huecos entre celdas. Buscarlos parece más fino y es más frágil: los dos
    ojos de un par son dos manchas separadas y las cejas son otras dos, así que
    una hoja de cuatro columnas devuelve ocho bandas en un eje y seis en el otro,
    y no hay forma de agruparlas que valga para las dos hojas. Repartiendo la
    caja de tinta en n por n partes iguales, el corte no depende de cómo quedó
    dibujada cada celda."""
    A = np.asarray(hoja.convert('L')).astype(np.float32)
    t = A < 170
    ys, xs = np.nonzero(t)
    X0, X1, Y0, Y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    px = (X1 - X0) / float(n); py = (Y1 - Y0) / float(n)
    caja = int(min(px, py) * 1.04)
    out = []
    for r in range(n):
        for c in range(n):
            cx = X0 + (c + 0.5) * px; cy = Y0 + (r + 0.5) * py
            out.append(hoja.crop((int(cx - caja/2), int(cy - caja/2),
                                  int(cx - caja/2) + caja, int(cy - caja/2) + caja)))
    return out, caja


def alfa(im):
    """Fondo fuera por relleno desde el borde. Devuelve RGBA."""
    g = np.asarray(im.convert('L')).astype(np.float32)
    H, W = g.shape
    claro = g > 205
    vis = np.zeros_like(claro)
    pila = [(0, x) for x in range(W)] + [(H-1, x) for x in range(W)] \
         + [(y, 0) for y in range(H)] + [(y, W-1) for y in range(H)]
    pila = [p for p in pila if claro[p]]
    for p in pila: vis[p] = True
    while pila:
        y, x = pila.pop()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            b, a = y+dy, x+dx
            if 0 <= b < H and 0 <= a < W and claro[b, a] and not vis[b, a]:
                vis[b, a] = True; pila.append((b, a))
    # LO QUE NO SE ALCANZA DESDE EL BORDE ES OPACO DEL TODO, y esto es lo que
    # estaba mal: mezclando el alfa con la luminancia, el BLANCO DE ADENTRO del
    # ojo quedaba al 55 % y sobre la piel se veia beige -o sea un ojo sin
    # esclerotica. El suavizado del contorno se hace despues, difuminando la
    # mascara un pixel, que es donde hace falta y en ningun otro sitio.
    op = np.where(vis, 0.0, 1.0).astype(np.float32)
    k = op.copy()
    for dy, dx in ((0,1),(0,-1),(1,0),(-1,0)):
        k += np.roll(op, (dy, dx), axis=(0, 1))
    op = np.minimum(1.0, op * 0.60 + (k / 5.0) * 0.40)
    rgb = np.asarray(im.convert('RGB')).astype(np.uint8)
    a8 = (np.clip(op, 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb, a8]), 'RGBA')


def caja_de(rgba, soloOjos):
    """La caja que se usa para registrar: en los ojos, sólo la de los OJOS —sin
    las cejas, que suben y bajan a propósito— y en la boca, la de todo."""
    a = np.asarray(rgba)[:, :, 3]
    ys, xs = np.nonzero(a > 40)
    if len(xs) == 0: return None
    x0, x1 = int(xs.min()), int(xs.max())
    y0a, y1a = int(ys.min()), int(ys.max())
    if not soloOjos: return (x0, x1, y0a, y1a)
    proy = (a > 40).sum(axis=1)
    hueco, mejor, ini = 0, None, None
    for i in range(y0a, y1a + 1):
        if proy[i] == 0 and ini is None: ini = i
        elif proy[i] > 0 and ini is not None:
            if i - ini > hueco: hueco, mejor = i - ini, (ini, i)
            ini = None
    if mejor and hueco > (y1a - y0a) * 0.06:
        return (x0, x1, mejor[1], y1a)
    return (x0, x1, y0a + int((y1a - y0a) * 0.35), y1a)


def registra(rgba, caja, esc, ancho, alto):
    """LA ESCALA ES LA MISMA PARA LOS DIECISÉIS y no se ajusta por cuadro. Es la
    diferencia entre un atlas y una hoja de dibujos: escalando cada cuadro a su
    propia caja, una boca cerrada —que es una raya— se agranda hasta el ancho de
    una boca abierta, y al hablar la cara late. Lo único que se corrige por
    cuadro es el CENTRO."""
    if caja is None: return Image.new('RGBA', (ancho, alto), (0, 0, 0, 0))
    x0, x1, y0, y1 = caja
    cx = (x0 + x1) / 2.0; cy = (y0 + y1) / 2.0
    w2 = max(1, int(rgba.width * esc)); h2 = max(1, int(rgba.height * esc))
    im2 = rgba.resize((w2, h2), Image.LANCZOS)
    out = Image.new('RGBA', (ancho, alto), (0, 0, 0, 0))
    out.paste(im2, (int(ancho/2 - cx*esc), int(alto*0.52 - cy*esc)), im2)
    return out


def hornea(rutas, nombres, ancho, alto, soloOjos, base):
    """LAS HOJAS SE HORNEAN JUNTAS Y NO UNA POR UNA, y eso no es comodidad: la
    escala de registro es UNA SOLA para los treinta y dos cuadros. Sacándola por
    hoja, el ojo abierto de la primera y el de la rampa de parpadeo de la
    segunda quedan de tamaños distintos, y entonces parpadear también cambia el
    tamaño del ojo — que es el mismo defecto de «hoja de dibujos contra atlas»
    que ya había costado el registro por cuadro, ahora entre hojas."""
    rgbas, cajas = [], []
    for ruta in rutas:
        celdas, caja = recorta(Image.open(ruta))
        print('%s: celda de %d px' % (os.path.basename(ruta), caja))
        for c in celdas:
            r = alfa(c); rgbas.append(r); cajas.append(caja_de(r, soloOjos))
    anchos = sorted((c[1] - c[0]) for c in cajas if c)
    ref = anchos[len(anchos)//2]              # la mediana, no el máximo
    esc = (ancho * (0.80 if soloOjos else 0.62)) / max(1.0, ref)
    print('  %d cuadros · ancho de referencia %d px -> escala %.3f'
          % (len(rgbas), ref, esc))
    marcos = []
    for i, r in enumerate(rgbas):
        m = registra(r, cajas[i], esc, ancho, alto)
        marcos.append(m)
        m.save(os.path.join(SALIDA, '%s_%02d_%s.png' % (base, i, nombres[i])))
    filas = (len(marcos) + 3) // 4
    atlas = Image.new('RGBA', (ancho*4, alto*filas), (0, 0, 0, 0))
    for i, m in enumerate(marcos):
        atlas.paste(m, ((i % 4)*ancho, (i // 4)*alto), m)
    # EL ATLAS QUE VA AL JUEGO SE ACHICA Y SE CUANTIZA; los sprites sueltos de la
    # carpeta se quedan grandes, que para eso estan. En el primer plano la
    # cabeza mide unos ciento cincuenta pixeles de alto y la franja de los ojos
    # unos noventa de ancho: un cuadro de 112 alcanza y sobra. Y el dibujo tiene
    # tres colores -marron, blanco y nada- asi que una paleta de 32 no le saca
    # un solo tono. Va con FASTOCTREE porque MEDIANCUT no acepta RGBA.
    at = atlas.resize((112*4, 84*filas) if soloOjos else (96*4, 84*filas),
                      Image.LANCZOS)
    at = at.quantize(colors=32, method=Image.FASTOCTREE).convert('RGBA')
    p = os.path.join(SALIDA, base + '.png')
    at.save(p, optimize=True)
    atlas.save(os.path.join(SALIDA, base + '_grande.png'))
    atlas = at
    print('  atlas %s  %dx%d (4x%d)  %d bytes'
          % (base, atlas.width, atlas.height, filas, os.path.getsize(p)))
    return p, filas


def main():
    os.makedirs(SALIDA, exist_ok=True)
    a, fa = hornea(['/tmp/cara/ojos_ref.png', '/tmp/cara/ojos_b_ref.png'],
                   OJOS, 128, 96, True, 'ojos')
    b, fb = hornea(['/tmp/cara/boca_ref.png', '/tmp/cara/boca_b_ref.png'],
                   BOCAS, 112, 96, False, 'boca')
    io.open(os.path.join(SALIDA, 'cara.json'), 'w', encoding='utf8').write(
        json.dumps({'ojos': OJOS, 'boca': BOCAS,
                    'grilla': {'ojos': [4, fa], 'boca': [4, fb]}},
                   ensure_ascii=False, indent=1))
    import base64
    txt = ["\n/* ═══════════════════ LOS SPRITES DE LA CARA ═══════════════════\n"
           "   Dos atlas de cuatro por cuatro: dieciséis pares de ojos con sus cejas y\n"
           "   dieciséis bocas, generados con Higgsfield y recortados, recoloreados y\n"
           "   REGISTRADOS con `herramientas/barrio/hornear_cara.py`. Los sprites\n"
           "   sueltos quedan en `assets/barrio/cara/` para poder armar cualquier\n"
           "   animación de cara sin volver a generar nada. */\n"]
    for n, p in (('ojos', a), ('boca', b)):
        txt.append("const CARA_%s_B64 = '%s';\n"
                   % (n.upper(), base64.b64encode(io.open(p, 'rb').read()).decode('ascii')))
    txt.append("const CARA_OJOS_N = %s;\n" % json.dumps(OJOS))
    txt.append("const CARA_BOCA_N = %s;\n" % json.dumps(BOCAS))
    txt.append("/* la grilla la escribe el horno: agregar una hoja no puede\n"
               "   obligar a acordarse de cambiar un número en otro archivo */\n")
    txt.append("const CARA_OJOS_G = [4, %d];\n" % fa)
    txt.append("const CARA_BOCA_G = [4, %d];\n" % fb)
    io.open(os.path.join(AQUI, 'partes', 'w.js'), 'w', encoding='utf8').write(''.join(txt))
    print('partes/w.js  %d bytes' % os.path.getsize(os.path.join(AQUI, 'partes', 'w.js')))
    return 0


if __name__ == '__main__':
    sys.exit(main())
