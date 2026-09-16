#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hornea los sonidos de PUERTA BLANCA a un solo `assets/puerta/audio.js`.

QUE HACE Y POR QUE CADA PASO:

1. **DECODIFICA CON PyAV** y no con ffmpeg de linea de comandos, que no esta en
   el contenedor. PyAV trae las bibliotecas adentro.
2. **A MONO Y A 22 kHz.** Estos sonidos se escuchan por el parlante de un
   telefono; estereo y 44 kHz es el doble de bytes para nada.
3. **RECORTA EL SILENCIO DE LAS PUNTAS** de los efectos, no de las camas. Un
   efecto con medio segundo de silencio adelante llega tarde; una cama recortada
   pierde justo el empalme.
4. **NIVELA POR RMS Y NO POR PICO.** El pico no sabe cuanto dura: nivelando por
   pico, un chasquido de dos centesimas queda tan "fuerte" como un grito
   sostenido. Y antes de nivelar va una `tanh`, porque un clip con pico 0,92 y
   rms 0,02 no se puede subir: el tope de pico lo baja todo de nuevo.
5. **LA COLA DE LAS CAMAS SE FUNDE SOBRE LA CABEZA.** Un tema cortado en seco y
   puesto a repetir da un golpe cada vuelta, y ese golpe se escucha MAS que la
   cama. Es la costura de una textura, en una dimension.
6. **MIDE EL NIVEL DESPUES DE CODIFICAR, no antes.** El remuestreo y el
   codificador no conservan los picos angostos: en RezUno un campanazo se cayo
   de 0,46 a 0,146 y lo habria mandado asi.
"""
import base64, glob, io, json, math, os, re, sys
import av

FUENTE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/rez_pb/assets'
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'puerta', 'audio.js')
SR = 22050

# el nivel de DISEÑO de cada familia, en rms. La escala es la de siempre en este
# repo: lo que se dispara cien veces por partida va abajo, y lo que tiene que
# asustar va arriba.
RMS = {'m': 0.150, 'a': 0.110, 'b': 0.055}
PICO = 0.92


def leer(p):
    """decodifica a una lista de floats mono a SR"""
    with av.open(p) as c:
        rs = av.AudioResampler(format='s16', layout='mono', rate=SR)
        m = []
        for f in c.decode(audio=0):
            for g in rs.resample(f):
                a = g.to_ndarray()[0]
                m.extend(a.tolist())
        for g in rs.resample(None) or []:
            m.extend(g.to_ndarray()[0].tolist())
    return [x / 32768.0 for x in m]


def recorta(x, umbral=0.012):
    n = len(x)
    i = 0
    while i < n and abs(x[i]) < umbral: i += 1
    j = n - 1
    while j > i and abs(x[j]) < umbral: j -= 1
    if j - i < SR // 20:      # menos de 50 ms: el umbral se comio el sonido
        return x
    pad = SR // 200
    return x[max(0, i - pad):min(n, j + pad)]


def cose(x, cruce=0.35):
    """funde la cola sobre la cabeza para que el bucle no de un golpe"""
    k = int(SR * cruce)
    if len(x) < k * 3: return x
    y = x[:-k]
    for i in range(k):
        a = i / float(k)
        y[i] = y[i] * a + x[len(x) - k + i] * (1 - a)
    return y


def nivela(x, objetivo):
    """lleva el clip al rms pedido sin pasar del tope de pico.

    LA FUERZA DE LA `tanh` SE BUSCA, NO SE ELIGE. Con un valor fijo el tope de
    pico decide el nivel final y no el objetivo: medido con drive 1,6, el glugueo
    de la gasolina —cresta 26— quedaba en rms 0,0265 contra 0,110 pedidos, o sea
    cuatro veces por debajo, porque `PICO` recortaba la ganancia. Se prueba de la
    mas suave a la mas dura y se toma LA PRIMERA que llega al objetivo: asi lo
    que ya tiene poca cresta no se aplasta de gusto.
    """
    if not x: return x
    mejor, mejor_r = None, -1
    for drive in (1.6, 2.4, 3.6, 5.5, 8.5, 13.0, 20.0):
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


def escribe_mp3(x, kbps):
    buf = io.BytesIO()
    with av.open(buf, mode='w', format='mp3') as c:
        st = c.add_stream('libmp3lame', rate=SR)
        st.bit_rate = kbps * 1000
        import numpy as np
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
    return (math.sqrt(sum(v * v for v in z) / len(z)), max(abs(v) for v in z))


def main():
    fs = sorted(glob.glob(os.path.join(FUENTE, 'pb_*.mp3')))
    if not fs:
        print('no hay nada en', FUENTE); return 1
    out, info = {}, []
    for p in fs:
        n = re.sub(r'^pb_|(-g\d+)?\.mp3$', '', os.path.basename(p))
        fam = n[0]
        cama = fam == 'b'
        x = leer(p)
        if not x: print('!! vacio', n); continue
        x = cose(x) if cama else recorta(x)
        x = nivela(x, RMS.get(fam, 0.11))
        kbps = 32 if cama else 24
        b = escribe_mp3(x, kbps)
        # EL LAZO SE CIERRA SOBRE EL MP3 YA ESCRITO. Medido: nivelar el float a
        # rms 0,150 y dar el numero por bueno deja el clip en 0,100 — un tercio
        # menos— porque a 24 kbps el codificador se lleva casi todo el brillo, y
        # en un chillido ahi esta la mayor parte de la energia. Se mide lo que se
        # va a oir y se corrige una vez.
        obj = RMS.get(fam, 0.11)
        for _ in range(3):
            r, pk = mide(b, n)
            if r <= 0 or abs(r - obj) / obj < 0.06: break
            f = min(obj / r, PICO / max(pk, 1e-6))
            if abs(f - 1) < 0.02: break
            x = [max(-1.0, min(1.0, v * f)) for v in x]
            b = escribe_mp3(x, kbps)
        out[n] = base64.b64encode(b).decode()
        info.append((n, len(x) / float(SR), len(b)))
    # y ahora si: se reabre cada uno y se mide
    med = []
    for n in out:
        r, pk = mide(base64.b64decode(out[n]), n)
        med.append((n, round(r, 4), round(pk, 3)))
    js = 'window.__PB_SON = ' + json.dumps(out, separators=(',', ':')) + ';\n'
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    io.open(SALIDA, 'w', encoding='utf8').write(js)
    tot = sum(i[2] for i in info)
    for n, d, b in sorted(info): print('%-12s %5.2f s  %6d B' % (n, d, b))
    print('---')
    for n, r, p in sorted(med): print('%-12s rms %.4f  pico %.3f' % (n, r, p))
    print('%d sonidos · %d B binario · %d B base64' % (len(out), tot, len(js)))
    return 0


sys.exit(main())
