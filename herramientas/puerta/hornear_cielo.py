#!/usr/bin/env python3
"""Hornea la panoramica generada y la deja lista para el domo del nivel 1.

    CIELO=/tmp/pb_assets/cielo360-g1.png python3 herramientas/puerta/hornear_cielo.py

QUE HACE Y POR QUE CADA COSA:

1. LA LLEVA A 2:1 EXACTO. Una equirectangular mapea 360 grados de ancho contra
   180 de alto, asi que la relacion no es una preferencia: con 1,792 que es lo
   que devolvio el generador, el cielo sale estirado en vertical y las nubes
   quedan aplastadas.
2. COSE LA COSTURA DEL WRAP. Aca no sirve el MirroredRepeatWrapping que usamos
   para las texturas de suelo —una esfera da la vuelta una sola vez y espejarla
   partiria el cielo al medio—, asi que se funden las columnas de las dos puntas
   una sobre la otra. Medido en la de esta tanda: el salto en la costura era el
   doble del salto normal entre columnas vecinas.
3. APLANA EL CENIT. En una equirect la fila de arriba ES un solo punto del
   mundo; si sus pixeles no son iguales, el polo sale como un remolino. Se
   promedia y se funde hacia abajo con una rampa.
4. MIDE EL COLOR DEL HORIZONTE Y EL DEL CENIT, y de donde viene la luz. Los dos
   primeros hacen falta para que la NIEBLA del juego sea del color del cielo: si
   no coinciden, aparece una banda a la altura del horizonte. El tercero, para
   girar el cielo y que su parte mas brillante caiga donde esta el sol que tira
   las sombras — con el sol de la foto en un lado y el de la escena en el otro,
   la luz se contradice y eso se ve.
"""
import io, json, os, sys
import numpy as np
from PIL import Image

SRC = os.environ.get('CIELO', '/tmp/pb_assets/cielo360-g1.png')
DST = os.environ.get('SAL', 'assets/puerta/cielo360.webp')
ANCHO = int(os.environ.get('ANCHO', '1536'))          # 2:1 -> 1536x768
CAL = int(os.environ.get('CAL', '86'))

def hexa(c):
    return '0x%02x%02x%02x' % tuple(int(round(v)) for v in c)


im = Image.open(SRC).convert('RGB')
print('entra %dx%d  relacion %.3f' % (im.size[0], im.size[1], im.size[0] / im.size[1]))

im = im.resize((ANCHO, ANCHO // 2), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)
H, W, _ = a.shape

# ── 2 · la costura ──
banda = max(4, W // 96)
for i in range(banda):
    t = 0.5 * (1.0 - i / float(banda))          # 0,5 en el borde, 0 hacia adentro
    izq, der = a[:, i].copy(), a[:, W - 1 - i].copy()
    a[:, i] = izq * (1 - t) + der * t
    a[:, W - 1 - i] = der * (1 - t) + izq * t

# ── 3 · el cenit ──
polo = max(3, H // 64)
cenit = a[:2].mean(axis=(0, 1))
for j in range(polo):
    t = 1.0 - j / float(polo)
    a[j] = a[j] * (1 - t) + cenit * t

# ── 3bis · EL CENIT TIENE QUE SER AZUL, Y EN ESTA FOTO NO LO ES ──
# Medido sobre la tanda: el cenit salia 0x9aabc3, un gris azulado, porque lo que
# devolvio el generador no es una equirect rigurosa — su parte mas azul cae a
# media altura y el borde de arriba es palido. Mapeada tal cual, mirar hacia
# arriba devuelve el mismo gris del que nos queriamos ir.
# Se corrige empujando el azul de LA PROPIA FOTO hacia el cenit, con dos
# cuidados: sube con la elevacion (abajo, en el horizonte, el cielo palidece de
# verdad y eso hay que conservarlo) y NO toca las nubes, que se detectan por lo
# que son —claras y poco saturadas—. Sin esa mascara el empuje pinta los cumulos
# de azul y se pierde justo lo que hace que el cielo se lea a foto.
mx = a.max(axis=2); mn = a.min(axis=2)
lum = a.mean(axis=2)
sat = (mx - mn) / np.maximum(mx, 1.0)
# el azul de referencia: lo mas saturado de la mitad de arriba
mitad = sat[:H // 2]
umb = np.percentile(mitad, 97.0)
sel = mitad >= umb
azul = a[:H // 2][sel].mean(axis=0)
lum_azul = float(azul.mean())
print('azul de la foto %s (de %d pixeles)' % (hexa(azul) if 'hexa' in dir() else azul, int(sel.sum())))

# nube = clara y poco saturada -> 1 ; cielo -> 0
nube = np.clip((lum - 150.0) / 70.0, 0, 1) * np.clip((0.30 - sat) / 0.22, 0, 1)
elev = 1.0 - (np.arange(H, dtype=np.float32) / (H / 2.0))     # 1 en el cenit, 0 en el horizonte
elev = np.clip(elev, 0, 1)[:, None]
w = (elev ** 0.85) * 0.80 * (1.0 - nube)

destino = azul[None, None, :] * (lum / max(lum_azul, 1.0))[:, :, None]
destino = np.clip(destino, 0, 255)
a = a * (1 - w[:, :, None]) + destino * w[:, :, None]

a = np.clip(a, 0, 255)

# ── 4 · lo que el juego necesita saber de esta foto ──
cenit_final = a[:2].mean(axis=(0, 1))
horizonte = a[int(H * 0.50) - 2:int(H * 0.50) + 3].mean(axis=(0, 1))
lum = a.mean(axis=2)
# de donde viene la luz: el centroide de lo mas brillante de la mitad de arriba
arriba = lum[:H // 2]
umbral = np.percentile(arriba, 99.2)
ys, xs = np.where(arriba >= umbral)
u = xs.mean() / float(W)                 # 0..1 dando la vuelta
v = ys.mean() / float(H)                 # 0 = cenit
import math
azim = (u * 2 - 1) * math.pi
elev = (0.5 - v) * math.pi
sol = (math.cos(elev) * math.cos(azim), math.sin(elev), math.cos(elev) * math.sin(azim))

Image.fromarray(a.astype(np.uint8)).save(DST, 'WEBP', quality=CAL, method=6)
b = os.path.getsize(DST)
print('sale  %dx%d  %s  %d bytes (%d en base64)' % (W, H, DST, b, b * 4 // 3))
print('cenit     %s   (era %s antes del empuje)' % (hexa(cenit_final), hexa(cenit)))
print('horizonte %s   <- la niebla tiene que ser este color' % hexa(horizonte))
print('sol de la foto  (%.3f, %.3f, %.3f)  elev %.1f grados' % (sol[0], sol[1], sol[2], math.degrees(elev)))

# comprobacion: la costura despues de coser
vec = np.abs(np.diff(a, axis=1)).mean()
wrap = np.abs(a[:, -1] - a[:, 0]).mean()
print('costura: %.2f contra %.2f de salto normal -> %.1f veces' % (wrap, vec, wrap / vec))
print('cenit: desviacion de la fila de arriba %.3f' % a[0].std(axis=0).mean())
json.dump({'cenit': hexa(cenit_final), 'horizonte': hexa(horizonte), 'sol': sol},
          io.open('/tmp/cielo_datos.json', 'w'))
