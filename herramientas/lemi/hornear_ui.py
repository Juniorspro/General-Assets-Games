#!/usr/bin/env python3
"""Recorta y hornea los controles de pixel art y la hoja de objetivos.

    python3 herramientas/lemi/hornear_ui.py

De donde salen: generados con Higgsfield (`z_image`) sobre fondo blanco liso.
Este script los recorta, les saca el fondo, los achica y escribe `partes/u.js`
con los seis en base64.

TRES COSAS QUE HAY QUE HACER Y NO SON OBVIAS:

- EL RECORTE SE HACE POR COMPONENTES CONECTADAS, no por una tabla de
  coordenadas. La hoja de botones vino con siete circulos repartidos a ojo por
  el modelo; escribir a mano donde cae cada uno funciona hasta que se regenera la
  imagen y todos se corren veinte pixeles.

- EL FONDO SE SACA POR DISTANCIA AL BLANCO Y CON RAMPA, no con un umbral duro.
  Estas imagenes traen una sombra suave debajo de cada pieza: con un umbral, la
  sombra queda entera y el boton aparece con una mancha gris pegada; con una
  rampa de 232 a 250, la sombra se desvanece y el contorno negro se conserva
  entero. Es la misma correccion que costo una vuelta con la hoja de Eco.

- Y SE ACHICAN MUCHO, A PROPOSITO. El juego se dibuja a un tercio de resolucion
  y se estira con NEAREST: un control nitido de 512 pixeles seria lo UNICO
  nitido de la pantalla y se leeria como pegado encima. Horneados a 48-72 px y
  estirados por CSS con `image-rendering: pixelated`, los pixeles del control
  miden lo mismo que los del juego. De paso los seis pesan nada.
"""
import io, os, sys, base64
import numpy as np
from PIL import Image
from scipy import ndimage

AQUI = os.path.dirname(os.path.abspath(__file__))
ENTRADA = '/tmp/pix'


def piezas(p, minimo=8000):
    im = Image.open(p).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    m = a.min(axis=2) < 225
    m = ndimage.binary_opening(m, np.ones((5, 5)))
    lab, n = ndimage.label(m, np.ones((3, 3)))
    out = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < minimo:
            continue
        out.append((int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())))
    return im, sorted(out, key=lambda b: (b[1] // 300, b[0]))


def saca_fondo(im):
    """blanco -> transparente, con rampa para que la sombra se vaya suave"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    lum = a.min(axis=2)
    al = np.clip((250.0 - lum) / (250.0 - 232.0), 0, 1) * 255
    rgba = np.dstack([a.astype(np.uint8), al.astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA')


def hornea(im, caja, lado, margen=6):
    x0, y0, x1, y1 = caja
    rec = im.crop((x0, y0, x1 + 1, y1 + 1))
    rec = saca_fondo(rec)
    # cuadrado, para que el achicado no deforme
    w, h = rec.size
    n = max(w, h) + margen * 2
    lienzo = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    lienzo.paste(rec, ((n - w) // 2, (n - h) // 2), rec)
    return lienzo.resize((lado, lado), Image.LANCZOS)


def webp(im, calidad=88):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=calidad, method=6)
    return b.getvalue()


def main():
    salida = {}
    inf = []

    # ── los botones: la hoja trae siete circulos y hacen falta tres ──
    im, bs = piezas(os.path.join(ENTRADA, 'bot.png'))
    # 0 corre · 1 agachado · 4 flecha arriba (los otros cuatro no se usan)
    for nom, i in [('bCorre', 0), ('bAgacha', 1), ('bSalta', 4)]:
        if i >= len(bs):
            print('  falta el boton', nom); continue
        salida[nom] = hornea(im, bs[i], 56)
    # ── el de usar viene en su propia imagen ──
    im2, b2 = piezas(os.path.join(ENTRADA, 'mano.png'))
    if b2:
        salida['bUsar'] = hornea(im2, b2[0], 56)
    # ── el joystick: el aro y el pulgar ──
    im3, b3 = piezas(os.path.join(ENTRADA, 'aro.png'))
    if b3:
        salida['joyAro'] = hornea(im3, b3[0], 72)
    im4, b4 = piezas(os.path.join(ENTRADA, 'dedo.png'))
    if b4:
        salida['joyDedo'] = hornea(im4, b4[0], 40)
    # ── la hoja de objetivos: no va cuadrada, va con su proporcion ──
    im5, b5 = piezas(os.path.join(ENTRADA, 'hoja.png'))
    if b5:
        x0, y0, x1, y1 = b5[0]
        rec = saca_fondo(im5.crop((x0, y0, x1 + 1, y1 + 1)))
        salida['hoja'] = rec.resize((160, 116), Image.LANCZOS)

    piez = []
    total = 0
    for nom, img in salida.items():
        by = webp(img)
        b64 = base64.b64encode(by).decode('ascii')
        piez.append("  %s: '%s'" % (nom, b64))
        total += len(b64)
        inf.append((nom, img.size, len(by)))

    js = ("\n/* ══════════════════════ LOS CONTROLES DE PIXEL ART ══════════════════════\n"
          "   Seis imagenes generadas con Higgsfield y horneadas con\n"
          "   `herramientas/lemi/hornear_ui.py`: el aro y el pulgar del joystick,\n"
          "   los cuatro botones y la hoja de papel del panel de objetivos.\n"
          "   VAN CHICAS Y SE ESTIRAN CON `image-rendering: pixelated`, que es lo\n"
          "   que hace que sus pixeles midan lo mismo que los del juego —que se\n"
          "   dibuja a un tercio de resolucion—. Un control nitido encima de una\n"
          "   imagen escalonada se lee como pegado arriba. */\n"
          "const UI_B64 = {\n" + ",\n".join(piez) + "\n};\n")
    io.open(os.path.join(AQUI, 'partes', 'u.js'), 'w', encoding='utf8').write(js)

    for n, sz, b in inf:
        print('%-9s %9s %6d bytes' % (n, '%dx%d' % sz, b))
    print('total en base64: %d KB' % (total // 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
