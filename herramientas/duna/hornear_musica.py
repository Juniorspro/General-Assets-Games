#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hornea las camas de musica de DUNA a base64 dentro de `partes/i_mus.js`.

TRES COSAS QUE ESTE REPO YA PAGO Y QUE ACA SE VUELVEN A HACER:

1. LA COLA SE FUNDE SOBRE LA CABEZA. Un tema cortado en seco y puesto a
   repetir da un golpe en cada vuelta, y ese golpe se escucha MAS que la
   musica. Es la costura de una textura, en una dimension.

2. EL NIVEL SE MIDE SOBRE EL MP3 YA ESCRITO Y SE CORRIGE. A bitrate bajo el
   codificador se lleva parte del brillo, asi que el numero calculado sobre el
   float describe un archivo que no existe. Se escribe, se mide lo que se va a
   oir, se corrige y se vuelve a escribir — hasta tres vueltas.

3. Y SE NIVELA POR RMS Y NO POR PICO. El pico no sabe cuanto dura: nivelando
   por pico, un tema espacioso y uno denso quedan con la misma cresta y
   sonoridad distinta, y cambiar de tramo del dia se escucharia como que
   alguien movio el volumen. Medido en RECREO: 0,0226 contra 0,0501, el doble.

EL OBJETIVO ES BAJO A PROPOSITO. En DUNA el viento ES el instrumento —es el
unico sitio donde la velocidad se escucha— asi que la cama va POR DEBAJO de
el. Con la musica al nivel del viento, acelerar deja de oirse.
"""
import base64, io, json, os, subprocess, sys, tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))

# `fetch_generated_asset` IGNORA `destination_dir` y escribe donde el servidor
# quiere: los seis MP3 aparecieron en `<repo>/assets/duna_*-g1.mp3` y no en la
# carpeta que se le pidio. Lo que dice la verdad es el `absolute_path` de la
# respuesta. Los crudos no se versionan (`assets/*-g1.*` esta en .gitignore).
CRUDO = os.environ.get('DUNA_MUS_DIR', os.path.join(RAIZ, 'assets'))
SALIDA = os.path.join(AQUI, 'partes', 'i_mus.js')

ORDEN = ['m0_noche', 'm1_alba', 'm2_manana', 'm3_siesta', 'm4_tarde', 'm5_ocaso']

RMS_OBJ = 0.115       # medido contra el viento del juego, ver el comentario de arriba
PICO_TOPE = 0.97      # techo: el codificador se pasa entre muestras
CRUCE = 1.6           # segundos de la cola que se funden sobre la cabeza
KBPS = 40             # mono; una cama de lofi filtrada no tiene brillo que perder
SR = 32000


def leer(p):
    import av
    c = av.open(p)
    s = next(x for x in c.streams if x.type == 'audio')
    import numpy as np
    tr = av.AudioResampler(format='fltp', layout='mono', rate=SR)
    xs = []
    for fr in c.decode(s):
        for f in tr.resample(fr):
            xs.append(f.to_ndarray()[0].copy())
    for f in tr.resample(None) or []:
        xs.append(f.to_ndarray()[0].copy())
    c.close()
    return np.concatenate(xs) if xs else np.zeros(1, dtype='float32')


def coser(x):
    """la cola se funde sobre la cabeza: al dar la vuelta no hay salto"""
    import numpy as np
    n = int(CRUCE * SR)
    if len(x) < n * 3: return x
    cola, cab = x[-n:], x[:n]
    w = np.linspace(0, 1, n, dtype='float32')
    y = x[:-n].copy()
    y[:n] = cab * w + cola * (1 - w)
    return y


def escribir(x, p):
    import av, numpy as np
    c = av.open(p, 'w')
    s = c.add_stream('mp3', rate=SR)
    s.bit_rate = KBPS * 1000
    s.layout = 'mono'
    fr = av.AudioFrame.from_ndarray(
        (np.clip(x, -1, 1) * 32767).astype('int16').reshape(1, -1),
        format='s16', layout='mono')
    fr.rate = SR
    for pk in s.encode(fr): c.mux(pk)
    for pk in s.encode(None): c.mux(pk)
    c.close()


def medir(p):
    import numpy as np
    y = leer(p)
    return float(np.sqrt((y * y).mean())), float(np.abs(y).max())


def main():
    import numpy as np
    fuera, salida = [], {}
    for n in ORDEN:
        f = None
        for cand in (os.path.join(CRUDO, 'duna_%s-g1.mp3' % n),
                     os.path.join(CRUDO, 'duna_%s.mp3' % n)):
            if os.path.exists(cand): f = cand; break
        if not f:
            fuera.append(n); print('  falta %s' % n); continue

        x = coser(leer(f))
        g = RMS_OBJ / max(float(np.sqrt((x * x).mean())), 1e-6)
        tmp = tempfile.mktemp(suffix='.mp3')
        for vuelta in range(3):
            y = x * g
            pk = float(np.abs(y).max())
            if pk > PICO_TOPE: y = y * (PICO_TOPE / pk)   # el techo manda sobre el objetivo
            escribir(y, tmp)
            r, p = medir(tmp)
            if abs(r - RMS_OBJ) / RMS_OBJ < 0.06: break
            g *= RMS_OBJ / max(r, 1e-6)
        b = io.open(tmp, 'rb').read()
        os.unlink(tmp)
        salida[n] = base64.b64encode(b).decode()
        print('  %-11s %5.1f s · rms %.4f · pico %.3f · %5.1f KB'
              % (n, len(x) / SR, r, p, len(b) / 1024))

    if not salida:
        print('nada que hornear'); return
    tot = sum(len(v) for v in salida.values())
    txt = ['',
           '/* LAS CAMAS DE MUSICA, generadas con Rezona y horneadas por',
           '   `herramientas/duna/hornear_musica.py`. Una por tramo del ciclo del dia.',
           '   %d pistas, %.0f KB en base64. NO SE EDITA A MANO. */' % (len(salida), tot / 1024),
           'const MUS_B64 = {']
    for n in ORDEN:
        if n in salida:
            txt.append("  %s: 'data:audio/mpeg;base64,%s'," % (n, salida[n]))
    txt.append('};')
    txt.append('')
    io.open(SALIDA, 'w', encoding='utf8').write('\n'.join(txt))
    print('-> %s · %d pistas · %.0f KB' % (SALIDA, len(salida), tot / 1024))
    if fuera: print('   sin generar todavia: %s' % ', '.join(fuera))


main()
