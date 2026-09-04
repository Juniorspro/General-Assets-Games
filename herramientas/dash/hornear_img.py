#!/usr/bin/env python3
"""Hornea las imagenes generadas de ROTOR y escribe `partes/i_img.js`.

   ── LO QUE SE HORNEA Y POR QUE ──
   Cuatro telones y un sello. Los telones van de fondo LEJANO: la geometria de las
   tres capas de paralaje se dibuja por delante, asi que la foto no reemplaza nada
   — pone el horizonte, que es justo lo que una silueta de rombos no puede dar.

   ── Y SE CORTAN POR SU HORIZONTE ──
   El borde de abajo del recorte va a parar a la LINEA DEL PISO del juego, o sea a
   y = 0. Debajo de esa linea el juego dibuja su losa y su faldon, asi que todo lo
   que la foto traiga mas abajo es peso que no se ve nunca. Los tres cortes estan
   medidos sobre la propia imagen: se busca la fila desde la cual la variacion por
   fila se derrumba, que es donde el dibujo se convierte en la banda plana del
   suelo.

   ── LA SATURACION BAJA, Y NO ES CORREGIR LA FOTO ──
   El material multiplica `map × color` y el color sale del TRAMO de la paleta, que
   cambia cuatro veces por tema. Con la foto a plena saturacion el tinte no puede
   moverla y el cambio de color se pierde justo en lo que ocupa media pantalla.
"""
import base64, io as _io, os, sys
from PIL import Image, ImageEnhance, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CRUDO = os.path.join(RAIZ, 'assets', 'dash', 'crudo')
SALIDA = os.path.join(RAIZ, 'herramientas', 'dash', 'partes', 'i_img.js')

ANCHO_TELON = 1024
SAT_TELON = 0.55


def horizonte(im):
    """La fila desde la que la imagen deja de tener dibujo.

    Se mide la desviacion de cada fila; el suelo de estas imagenes es una banda
    plana, asi que su desviacion cae a casi cero. Se devuelve la primera fila de
    la cola larga de filas planas, y si no hay cola se devuelve el alto entero —
    una imagen sin banda plana no hay que recortarla.
    """
    g = im.convert('L')
    w, h = g.size
    px = g.load()
    paso = max(1, w // 96)
    desv = []
    for y in range(h):
        vals = [px[x, y] for x in range(0, w, paso)]
        m = sum(vals)/len(vals)
        desv.append((sum((v - m)**2 for v in vals)/len(vals))**0.5)
    tope = max(desv) or 1
    corte = tope*0.10
    y = h - 1
    while y > h//3 and desv[y] < corte:
        y -= 1
    return min(h, y + 2)


def telon(nom, dst):
    im = Image.open(os.path.join(CRUDO, nom + '.png')).convert('RGB')
    w, h = im.size
    hz = horizonte(im)
    im = im.crop((0, 0, w, hz))
    im = im.resize((ANCHO_TELON, max(1, round(im.size[1]*ANCHO_TELON/w))), Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(SAT_TELON)
    b = _io.BytesIO(); im.save(b, 'WEBP', quality=72, method=6)
    print('  %-8s %sx%s  horizonte %.0f%%  %d KB' % (
        nom, im.size[0], im.size[1], 100*hz/h, len(b.getvalue())//1024))
    return b.getvalue(), im.size


def sello(nom):
    """El sello del menu: se recorta el fondo plano y se ajusta a su caja.

    El fondo NO se saca por umbral de brillo —el recorte se llevaria los brillos
    del propio dibujo— sino por distancia al color de las cuatro esquinas, que es
    lo unico que con certeza es fondo. Con rampa, porque un corte duro deja el
    contorno dentado y aca el dibujo trae sombra.
    """
    im = Image.open(os.path.join(CRUDO, nom + '.png')).convert('RGB')
    w, h = im.size
    esq = [im.getpixel(p) for p in [(2, 2), (w-3, 2), (2, h-3), (w-3, h-3)]]
    fondo = tuple(sum(c[i] for c in esq)//4 for i in range(3))
    px = im.load()
    a = Image.new('L', (w, h))
    ap = a.load()
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            d = ((c[0]-fondo[0])**2 + (c[1]-fondo[1])**2 + (c[2]-fondo[2])**2)**0.5
            ap[x, y] = 0 if d < 42 else (255 if d > 96 else int((d - 42)*255/54))
    a = a.filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(a)
    caja = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    im = im.crop(caja)
    lado = 320
    im = im.resize((lado, max(1, round(im.size[1]*lado/im.size[0]))), Image.LANCZOS)
    b = _io.BytesIO(); im.save(b, 'WEBP', quality=82, method=6)
    print('  %-8s %sx%s  caja %s  %d KB' % (nom, im.size[0], im.size[1], caja,
                                            len(b.getvalue())//1024))
    return b.getvalue(), im.size


def main():
    print('horneando:')
    partes = {}
    tam = {}
    for n in ['f0', 'f1', 'f2', 'm_fondo']:
        d, s = telon(n, n)
        partes[n] = d; tam[n] = s
    d, s = sello('m_sello')
    partes['m_sello'] = d; tam['m_sello'] = s

    L = ['', '/* ══════════ LAS IMAGENES, HORNEADAS ══════════',
         '   Generadas con Higgsfield (z_image) y horneadas por',
         '   `herramientas/dash/hornear_img.py`. Van en base64 adentro del archivo: el',
         '   juego es UN HTML y no puede depender de que una red conteste.',
         '',
         '   Y NINGUNA REEMPLAZA NADA HASTA QUE LLEGA: un data URI se decodifica de',
         '   forma asincronica, asi que el telon nace apagado y se enciende cuando la',
         '   textura esta lista. Si una falla, ese nivel se dibuja como se dibujaba',
         '   antes —cielo en degradado y las tres capas de rombos— y no hay un solo',
         '   cuadro en negro. */']
    L.append('const IMG_TAM = ' + repr({k: list(v) for k, v in tam.items()}).replace("'", '"') + ';')
    for k in ['f0', 'f1', 'f2', 'm_fondo', 'm_sello']:
        L.append("const IMG_%s = 'data:image/webp;base64,%s';"
                 % (k.upper(), base64.b64encode(partes[k]).decode()))
    L.append('const IMG = { f0: IMG_F0, f1: IMG_F1, f2: IMG_F2,'
             ' m_fondo: IMG_M_FONDO, m_sello: IMG_M_SELLO };')
    L.append('')
    with open(SALIDA, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L))
    n = os.path.getsize(SALIDA)
    print('%s  %d KB' % (SALIDA, n//1024))


main()
