#!/usr/bin/env python3
"""Hornea las texturas de la ciudad que se ve desde el cuarto y escribe partes/s.js.

    python3 herramientas/barrio/hornear_ciudad.py

DE DÓNDE SALEN: Rezona Lab (`submit_image_generation`). Hasta acá la ciudad se
dibujaba con lienzos de 128 píxeles —una grilla de rectángulos amarillos— y a
noventa y seis metros de altura eso se lee a maqueta.

LO ÚNICO QUE HAY QUE HACER BIEN ACÁ ES EL MAPA EMISIVO, Y NO SE GENERA APARTE.
Las ventanas encendidas y los faroles no se ven tan claros como la luz que les
llegue, porque a esa altura no les llega ninguna: en la captura, el suelo entre
los edificios era una mancha negra sin un punto. Tienen que EMITIR. Y el mapa
emisivo no se pide como una segunda imagen —dos imágenes sorteadas por separado
dan ventanas que brillan sin estar dibujadas—: se DERIVA de la misma foto,
quedándose con lo que está por encima de un percentil de luminancia. Así lo que
brilla es exactamente lo que se ve encendido, por construcción.

Y LA ESCALA SE CUENTA SOBRE LA IMAGEN, igual que las siete del barrio: un piso
mide unos tres metros, así que cuántas filas de ventanas tiene la foto dice
cuántos metros cubre. Sin eso, un edificio de cien metros sale con pisos de
diez y se lee a juguete.
"""
import base64, io, os, sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ENTRADA = os.environ.get('CIU_DIR', '/tmp/ciu')

#  nombre        archivo           lado  calidad  percentil de encendido
PLAN = [
    ('fachada',  'fachada.png',    320, 80, 88),
    ('fachada2', 'fachada2.png',   320, 80, 90),
    ('calle',    'calleaerea.png', 448, 78, 82),
    ('azotea',   'azotea.png',     256, 74, 100),   # 100 = sin emisivo
]

# metros que cubre una copia, contados sobre la foto (piso = 3,1 m)
METROS = {
    'fachada':  (29.7, 40.3),    # 11 columnas x 13 filas
    'fachada2': (49.4, 63.8),    # 26 x 22
    'calle':    (300.0, 300.0),  # la trama de manzanas de la foto
    'azotea':   (26.0, 26.0),
}


def emisivo(im, pc):
    """lo que está encendido, y nada más: se queda con el color de la foto por
    encima del percentil `pc` de luminancia y apaga el resto con una rampa —un
    corte duro deja las ventanas con el borde dentado."""
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = a[:, :, 0]*0.2126 + a[:, :, 1]*0.7152 + a[:, :, 2]*0.0722
    if pc >= 100:
        return None
    u = float(np.percentile(lum, pc))
    k = np.clip((lum - u) / max(1e-4, (lum.max() - u) * 0.35), 0, 1)[:, :, None]
    return Image.fromarray((a * k * 255).astype(np.uint8))


def main():
    piezas, inf = [], []
    for nom, arch, lado, q, pc in PLAN:
        p = os.path.join(ENTRADA, arch)
        if not os.path.exists(p):
            print('  falta', p); continue
        im = Image.open(p).convert('RGB').resize((lado, lado), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
        piezas.append("  %s: '%s'" % (nom, base64.b64encode(b.getvalue()).decode('ascii')))
        tot = len(b.getvalue())
        e = emisivo(im, pc)
        if e is not None:
            b2 = io.BytesIO(); e.save(b2, 'WEBP', quality=q, method=6)
            piezas.append("  %sE: '%s'" % (nom, base64.b64encode(b2.getvalue()).decode('ascii')))
            tot += len(b2.getvalue())
        inf.append((nom, lado, tot))

    met = ',\n'.join('  %s: [%.1f, %.1f]' % (k, v[0], v[1]) for k, v in METROS.items())
    js = ("\n/* ═══════════════ LA CIUDAD QUE SE VE DESDE EL CUARTO ═══════════════\n"
          "   Fachadas, la trama de calles vista desde arriba y la azotea, generadas\n"
          "   con Rezona Lab y horneadas con `herramientas/barrio/hornear_ciudad.py`.\n"
          "   El mapa emisivo de cada una SE DERIVA DE ELLA MISMA —lo que está por\n"
          "   encima de un percentil de luminancia— así que lo que brilla es\n"
          "   exactamente lo que se ve encendido y no puede haber una ventana que\n"
          "   ilumine sin estar dibujada.\n"
          "   `CIU_M` es cuántos metros cubre cada copia, contados sobre la foto: un\n"
          "   piso mide tres metros y pico, así que la cantidad de filas de ventanas\n"
          "   es la que fija la escala. */\n"
          "const CIU_B64 = {\n" + ",\n".join(piezas) + "\n};\n"
          "const CIU_M = {\n" + met + "\n};\n")
    io.open(os.path.join(AQUI, 'partes', 's.js'), 'w', encoding='utf8').write(js)

    t = 0
    for n, l, b in inf:
        print('%-9s %4dpx %7d bytes' % (n, l, b)); t += b
    print('total %d KB · en base64 %d KB' % (t//1024, t*4//3//1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
