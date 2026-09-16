#!/usr/bin/env python3
"""Hornea la foto de pasto y escribe assets/puerta/pasto.js.

LA ESCALA SE CUENTA SOBRE LA FOTO, no se copia del lienzo que reemplaza. Medido
con la autocorrelacion horizontal de esta imagen: el primer minimo cae en 9 px,
o sea que "brizna + hueco" mide unos 18 px; con una brizna real de 8-10 mm, los
1024 px de la foto cubren entre 0,46 y 0,57 m.

Y EL TINTE SE RECALCULA, porque three.js multiplica map x vertexColor x
material.color: el color del material es un tinte SOBRE la imagen. El lienzo
dibujado por codigo iba tenido de 0xa8bf88 y una foto que ya trae su propio
verde, con ese tinte encima, sale color musgo. Se divide EN LINEAL el promedio
del lienzo viejo por el de la foto.
"""
import base64, io, os, sys
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.environ.get('PASTO', '/tmp/pb_assets/pasto-g1.png')
LADO = int(os.environ.get('LADO', '768'))
CAL = int(os.environ.get('CAL', '84'))
TINTE_VIEJO = 0xa8bf88          # el que el juego le ponia al lienzo dibujado


def lineal(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


im = Image.open(SRC).convert('RGB').resize((LADO, LADO), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)

# la costura: aca SI vale el espejo, porque un suelo se repite en las dos
# direcciones y los dos bordes que se tocan pasan a ser el mismo borde. Pero el
# espejo lo pone three.js (MirroredRepeatWrapping), no el horneado: aca solo se
# mide cuanto saltaba, para poder decir que no hace falta coser.
vec = np.abs(np.diff(a, axis=1)).mean()
wrap = np.abs(a[:, -1] - a[:, 0]).mean()
print('costura sin coser: %.2f contra %.2f de salto normal -> %.1f veces' % (wrap, vec, wrap / vec))
print('   (se resuelve con MirroredRepeatWrapping en el juego, no cosiendo)')

sal = os.path.join(RAIZ, 'assets', 'puerta', 'pasto.webp')
im.save(sal, 'WEBP', quality=CAL, method=6)
b = os.path.getsize(sal)

prom = a.reshape(-1, 3).mean(axis=0)
viejo = np.array([(TINTE_VIEJO >> 16) & 255, (TINTE_VIEJO >> 8) & 255, TINTE_VIEJO & 255], dtype=np.float64)
# lo que el lienzo daba en pantalla era su color medio x el tinte; para que la
# foto de lo mismo, el tinte nuevo es viejo / (promedio de la foto), en lineal
lienzo_medio = np.array([0x46, 0x78, 0x33], dtype=np.float64)   # el gradiente del makeGrassTexture
obj = lineal(lienzo_medio) * lineal(viejo)
nuevo = np.clip(obj / np.maximum(lineal(prom), 1e-6), 0, 1)
nuevo8 = np.clip(np.round((np.where(nuevo <= 0.0031308, nuevo * 12.92,
                                    1.055 * nuevo ** (1 / 2.4) - 0.055)) * 255), 0, 255).astype(int)
tinte = '0x%02x%02x%02x' % tuple(nuevo8)

print('foto %dx%d  %d bytes (%d en base64)  promedio 0x%02x%02x%02x'
      % (LADO, LADO, b, b * 4 // 3, *[int(round(v)) for v in prom]))
print('tinte nuevo %s   (era 0x%06x sobre el lienzo dibujado)' % (tinte, TINTE_VIEJO))

b64 = base64.b64encode(io.open(sal, 'rb').read()).decode('ascii')
io.open(os.path.join(RAIZ, 'assets', 'puerta', 'pasto.js'), 'w', encoding='utf8').write(
    "/* Pasto del nivel 1, generado con Rezona Lab y horneado con\n"
    "   herramientas/puerta/hornear_pasto.py. La foto cubre ~0,5 m: la escala se\n"
    "   conto con la autocorrelacion, no se copio del lienzo que reemplaza. */\n"
    "window.__PB_PASTO = '%s';\nwindow.__PB_PASTO_TINTE = %s;\n" % (b64, tinte))
print('assets/puerta/pasto.js listo')
