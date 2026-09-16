#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recorta los siete gritos que trajo el usuario y los hornea a `gritos.js`,
uno por entidad.

EL REPARTO NO ES AL AZAR: SALE DE MEDIR LOS SIETE. Lo que separa un grito de
otro para este juego son dos numeros —cuanto dura y que tan agudo es (los cruces
por cero por segundo)— y con eso cada entidad se lleva el que le corresponde por
tamano: el mas grave y largo al simio, el mas agudo y fino a la cosa de la
escuela, el mas corto y seco a la criatura del campo.

    archivo                        dur     zc      a quien
    monsterscream345668           1,30 s  2074    entity  · la criatura del campo
    scaryscream381274             5,43 s  1958    ape     · el simio (el mas grave)
    scream40662                   3,34 s  4303    wrap    · la cosa de la escuela
    scream_hsfx490899            18,24 s  2861    saw     · la biblioteca
    scream_hsfx490909            30,02 s  2286    exec    · el verdugo Y su hacha
    scream_hsfx490884            10,03 s  2863    dog     · el perro
    scream_hsfx490905            18,24 s  2964    spider  · la arana

EL VERDUGO Y EL HACHA COMPARTEN, y es lo correcto: son el mismo personaje. Siete
archivos para ocho disparadores, y el par que se repite tiene que ser el que en
la ficcion es una sola cosa.

SE RECORTA LA RAFAGA DE MAS ENERGIA Y NO EL PICO MAS ALTO. Un archivo de treinta
segundos trae respiraciones, ambiente y a veces un chasquido al final que mide
mas que el grito: quedandose con el pico se recorta el chasquido. La energia
—amplitud POR duracion— no se deja enganar. Es la leccion de los ladridos de
RECREO.

Y EL GRITO ES LO MAS FUERTE DEL JUEGO, con rms 0,22 contra 0,150 de un monstruo
y 0,055 de la cama: es el unico momento en que el juego habla mas fuerte que el
jugador. El nivel se mide sobre el MP3 ya escrito, como el resto.
"""
import base64, glob, io, json, math, os, sys
import av

FUENTE = sys.argv[1] if len(sys.argv) > 1 else \
    '/root/.claude/uploads/a9579c87-eaea-545a-a392-8b8ccea8dcdc'
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'puerta', 'gritos.js')
SR = 22050
RMS = 0.22
PICO = 0.95
LARGO = 2.0          # segundos que se quedan

# a quien le toca cada archivo (por un trozo del nombre)
REPARTO = [
    ('entity', 'monsterscream345668', 1.5),
    ('ape',    'scaryscream381274',   2.2),
    ('wrap',   'scream40662',         1.8),
    ('saw',    'sfx490899',           1.8),
    ('exec',   'sfx490909',           2.2),
    ('dog',    'sfx490884',           1.6),
    ('spider', 'sfx490905',           2.0),
]
# el hacha es el mismo personaje que el verdugo
ALIAS = {'axe': 'exec'}


def leer(p):
    with av.open(p) as c:
        rs = av.AudioResampler(format='s16', layout='mono', rate=SR)
        m = []
        for f in c.decode(audio=0):
            for g in rs.resample(f):
                m.extend(g.to_ndarray()[0].tolist())
    return [x / 32768.0 for x in m]


def rafaga(x, dur):
    """la ventana de `dur` segundos con MAS ENERGIA, no la del pico mas alto"""
    w = int(SR * dur)
    if len(x) <= w: return x
    paso = int(SR * 0.05)
    # suma acumulada de cuadrados: si no, esto es O(n*w) y con 30 s se arrastra
    ac = [0.0] * (len(x) + 1)
    for i, v in enumerate(x): ac[i + 1] = ac[i] + v * v
    best, bi = -1, 0
    for i in range(0, len(x) - w, paso):
        e = ac[i + w] - ac[i]
        if e > best: best, bi = e, i
    y = x[bi:bi + w]
    # ENTRA Y SALE CON RAMPA: un corte en seco en medio de un grito da un click
    # que se escucha mas que el grito.
    ent, sal = int(SR * 0.02), int(SR * 0.28)
    for i in range(min(ent, len(y))): y[i] *= i / float(ent)
    for i in range(min(sal, len(y))):
        y[len(y) - 1 - i] *= i / float(sal)
    return y


def nivela(x, objetivo):
    if not x: return x
    mejor, mejor_r = None, -1
    for drive in (1.4, 2.0, 3.0, 4.5, 7.0, 11.0):
        y = [math.tanh(v * drive) / math.tanh(drive) for v in x]
        r = math.sqrt(sum(v * v for v in y) / len(y)) or 1e-9
        g = objetivo / r
        p = max(abs(v) for v in y) * g
        if p > PICO: g *= PICO / p
        z = [max(-1.0, min(1.0, v * g)) for v in y]
        rf = math.sqrt(sum(v * v for v in z) / len(z))
        if rf > mejor_r: mejor, mejor_r = z, rf
        if rf >= objetivo * 0.92: return z
    return mejor


def escribe_mp3(x, kbps=32):
    import numpy as np
    buf = io.BytesIO()
    with av.open(buf, mode='w', format='mp3') as c:
        st = c.add_stream('libmp3lame', rate=SR)
        st.bit_rate = kbps * 1000
        arr = (np.array(x, dtype='float32') * 32767).astype('int16').reshape(1, -1)
        fr = av.AudioFrame.from_ndarray(arr, format='s16', layout='mono')
        fr.sample_rate = SR
        for pk in st.encode(fr): c.mux(pk)
        for pk in st.encode(None): c.mux(pk)
    return buf.getvalue()


def mide(b, nom):
    f = io.BytesIO(b); f.name = nom + '.mp3'
    with av.open(f) as c:
        rs = av.AudioResampler(format='s16', layout='mono', rate=SR)
        m = []
        for fr in c.decode(audio=0):
            for g in rs.resample(fr): m.extend(g.to_ndarray()[0].tolist())
    z = [v / 32768.0 for v in m]
    if not z: return 0.0, 0.0
    return math.sqrt(sum(v * v for v in z) / len(z)), max(abs(v) for v in z)


def main():
    fs = sorted(glob.glob(os.path.join(FUENTE, '*.mp3')))
    out, info = {}, []
    for quien, trozo, dur in REPARTO:
        cand = [p for p in fs if trozo in os.path.basename(p)]
        if not cand:
            print('!! no esta el archivo de', quien, trozo); continue
        x = rafaga(leer(cand[0]), dur)
        x = nivela(x, RMS)
        b = escribe_mp3(x)
        # el lazo se cierra sobre el MP3 ya escrito
        for _ in range(3):
            r, pk = mide(b, quien)
            if r <= 0 or abs(r - RMS) / RMS < 0.06: break
            f = min(RMS / r, PICO / max(pk, 1e-6))
            if abs(f - 1) < 0.02: break
            x = [max(-1.0, min(1.0, v * f)) for v in x]
            b = escribe_mp3(x)
        out['s_' + quien] = base64.b64encode(b).decode()
        r, pk = mide(b, quien)
        info.append((quien, os.path.basename(cand[0])[:34], len(x) / float(SR), len(b), r, pk))
    js = ('window.__PB_GRITO = ' + json.dumps(out, separators=(',', ':')) + ';\n'
          'window.__PB_GRITO_ALIAS = ' + json.dumps(ALIAS, separators=(',', ':')) + ';\n')
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    io.open(SALIDA, 'w', encoding='utf8').write(js)
    for q, f, d, b, r, pk in info:
        print('%-8s %-34s %4.2f s %6d B  rms %.4f pico %.3f' % (q, f, d, b, r, pk))
    print('%d gritos + %d alias · %d B base64' % (len(out), len(ALIAS), len(js)))
    return 0


sys.exit(main())
