#!/usr/bin/env python3
"""Hornea las seis texturas del nivel 6 y escribe assets/puerta/n6.js.

CINCO SON DE SUPERFICIE Y UNA ES LA TELA, y la tela se hornea distinto: el
generador la devuelve blanca sobre negro, y lo que el juego necesita es una
imagen con ALFA — si no, cada telarana es un cuadrado negro pegado en el vano.
El alfa sale de la luminancia de la propia foto, con rampa: con un corte duro
los hilos quedan con el borde dentado.

Las otras cinco van con MirroredRepeatWrapping en el juego, asi que no se cosen:
los dos bordes que se tocan pasan a ser el mismo borde.
"""
import base64, io, os
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENT = os.environ.get('N6DIR', '/tmp/n6')
SUP = [('piso', 640, 78), ('azulejo', 512, 76), ('techo', 448, 74),
       ('mesada', 448, 76), ('madera6', 448, 78)]

sal = {}
tot = 0
for nom, lado, cal in SUP:
    im = Image.open(os.path.join(ENT, nom + '.png')).convert('RGB').resize((lado, lado), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    vec = np.abs(np.diff(a, axis=1)).mean()
    wrap = np.abs(a[:, -1] - a[:, 0]).mean()
    p = os.path.join(RAIZ, 'assets', 'puerta', 'n6_' + nom + '.webp')
    im.save(p, 'WEBP', quality=cal, method=6)
    b = os.path.getsize(p)
    tot += b
    prom = a.reshape(-1, 3).mean(axis=0)
    print('%-9s %4d px  %6d bytes  costura %.1f veces  promedio #%02x%02x%02x'
          % (nom, lado, b, wrap / vec, int(prom[0]), int(prom[1]), int(prom[2])))
    sal[nom] = base64.b64encode(io.open(p, 'rb').read()).decode('ascii')

# ── la tela: el alfa sale de la luminancia ──
im = Image.open(os.path.join(ENT, 'tela.png')).convert('RGB').resize((512, 512), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)
lum = a.mean(axis=2)
# rampa de 18 a 90: por debajo es fondo, por encima es hilo, y en el medio el
# antialiasing del hilo, que es lo que hay que conservar
al = np.clip((lum - 18.0) / 72.0, 0, 1)
rgb = np.full_like(a, 240.0)                    # el hilo va casi blanco
tela = np.dstack([rgb, (al * 255)]).astype(np.uint8)
p = os.path.join(RAIZ, 'assets', 'puerta', 'n6_tela.webp')
Image.fromarray(tela, 'RGBA').save(p, 'WEBP', quality=82, method=6)
tot += os.path.getsize(p)
print('tela      512 px  %6d bytes  alfa: %.1f%% de la imagen es hilo'
      % (os.path.getsize(p), 100 * (al > 0.5).mean()))
sal['tela'] = base64.b64encode(io.open(p, 'rb').read()).decode('ascii')

js = ("/* Texturas del nivel 6, generadas con Rezona Lab y horneadas con\n"
      "   herramientas/puerta/hornear_n6.py. La tela lleva ALFA sacado de su\n"
      "   propia luminancia: sin eso cada telarana es un cuadrado negro. */\n"
      "window.__PB_N6 = {\n" +
      ',\n'.join("  %s: '%s'" % (k, v) for k, v in sal.items()) + '\n};\n')
io.open(os.path.join(RAIZ, 'assets', 'puerta', 'n6.js'), 'w', encoding='utf8').write(js)
print('\nassets/puerta/n6.js  %.1f KB en disco, %.1f KB en base64'
      % (tot / 1024.0, tot * 4 / 3 / 1024.0))
