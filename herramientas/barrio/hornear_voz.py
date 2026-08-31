#!/usr/bin/env python3
"""Hornea los sonidos del hombre y los deja en `partes/v.js`.

    python3 herramientas/barrio/hornear_voz.py

POR QUE ESTOS SON ARCHIVOS Y LA LLUVIA NO. El resto del sonido de BARRIO es
procedural y esta bien que lo sea: la lluvia es ruido filtrado, un clip grabado
pesa cientos de kilobytes y ademas se corta cada vez que da la vuelta. Un jadeo,
un trago o una arcada son otra cosa — no salen de filtrar ruido, y duran menos
de dos segundos, asi que cuestan poco.

Y SON TODOS NO VERBALES A PROPOSITO. El juego habla en tres idiomas: una frase
habria que grabarla tres veces, un suspiro se entiende igual en los tres. Es la
misma decision que en RECREO con los ladridos.

EL RECORTE ES POR EXTREMOS Y NO POR RAFAGA. El generador deja medio segundo de
silencio en cada punta y a veces un chasquido; se busca el primer y el ultimo
punto por encima de un umbral relativo al pico y se corta ahi con 15 ms de
respiro. Cortar por «la rafaga de mas energia» —lo que se hizo en RECREO— aca
partiria en dos un jadeo, que son varias respiraciones seguidas con huecos.
"""
import base64, io, os, sys, wave
import numpy as np
import lameenc

AQUI = os.path.dirname(os.path.abspath(__file__))
ENT = '/tmp/voz'
CLIPS = ['resp', 'susp', 'inh', 'trago', 'asco', 'tos', 'quej', 'golpe', 'jadeo']
SR = 16000
KBPS = 24

def lee(p):
    import av
    c = av.open(p)
    st = c.streams.audio[0]
    res = av.AudioResampler(format='s16', layout='mono', rate=SR)
    xs = []
    for fr in c.decode(st):
        for f2 in res.resample(fr):
            xs.append(f2.to_ndarray().reshape(-1))
    for f2 in res.resample(None):
        xs.append(f2.to_ndarray().reshape(-1))
    return np.concatenate(xs).astype(np.float32) / 32768.0

def recorta(x):
    a = np.abs(x)
    pico = a.max()
    if pico < 1e-4: return x
    umb = pico * 0.035
    idx = np.nonzero(a > umb)[0]
    if len(idx) == 0: return x
    m = int(0.015 * SR)
    return x[max(0, idx[0]-m): min(len(x), idx[-1]+m)]

def main():
    out, tot = [], 0
    for n in CLIPS:
        p = os.path.join(ENT, n + '.wav')
        if not os.path.exists(p): print('falta', p); continue
        x = recorta(lee(p))
        # normalizar al mismo pico: las nueve tienen que sonar al mismo nivel,
        # que despues la mezcla del juego las baja por separado
        pk = np.abs(x).max()
        if pk > 1e-6: x = x * (0.88 / pk)
        pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
        e = lameenc.Encoder()
        e.set_bit_rate(KBPS); e.set_in_sample_rate(SR); e.set_channels(1)
        e.set_quality(2)
        mp3 = e.encode(pcm) + e.flush()
        b64 = base64.b64encode(mp3).decode()
        tot += len(mp3)
        print('  %-6s %5.2f s  %5d B mp3' % (n, len(x)/SR, len(mp3)))
        out.append("  %s: '%s'," % (n, b64))
    txt = ("/* Los sonidos del hombre, generados y horneados por\n"
           "   `herramientas/barrio/hornear_voz.py`. Todos NO VERBALES: el juego habla en\n"
           "   tres idiomas y un suspiro se entiende igual en los tres. */\n"
           "const VOZ_B64 = {\n" + "\n".join(out) + "\n};\n")
    d = os.path.join(AQUI, 'partes', 'v.js')
    io.open(d, 'w', encoding='utf8').write(txt)
    print('partes/v.js  %d bytes  (mp3 %d B)' % (len(txt), tot))

if __name__ == '__main__':
    sys.exit(main())
