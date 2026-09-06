#!/usr/bin/env python3
"""Hornea los gritos generados con Rezona a partes/i_gritos.js.

TRES COSAS QUE YA COSTARON UNA VUELTA CADA UNA, y estan escritas aca para que
el proximo que toque esto no las vuelva a pagar:

1. ── SE RECORTA LA RAFAGA DE MAS ENERGIA, NO EL PICO MAS ALTO ──
   Un clip generado trae respiraciones, ambiente y a veces un chasquido al
   final que mide MAS que el grito. Quedandose con el pico se recorta el
   chasquido. La energia —amplitud POR duracion— no se deja enganar.

2. ── EL NIVEL SE MIDE SOBRE EL MP3 YA ESCRITO ──
   A bitrate bajo el codificador se lleva casi todo el brillo, y en un grito
   ahi esta buena parte de la energia. Normalizar el float y dar el numero por
   bueno es creerle a una cuenta que no se hizo: medido en PUERTA BLANCA, el
   rms caia a DOS TERCIOS de lo pedido. Se escribe, se mide lo que se va a oir,
   se corrige y se vuelve a escribir.

3. ── Y SE NIVELA POR RMS, NO POR PICO ──
   El pico no sabe cuanto dura: nivelando por pico, un chasquido de dos
   centesimas queda tan «fuerte» como un alarido sostenido. Con una `tanh`
   antes, para que un clip con mucha cresta se pueda subir sin que el tope de
   pico lo baje de nuevo.
"""
import io, os, json, base64, math
import numpy as np
import av

ENT = '/tmp/rez_vig/assets'
SAL = os.path.join(os.path.dirname(__file__), 'partes', 'i_gritos.js')
SR  = 22050
KBPS = 40

#  clave          archivo                 rms objetivo   pico tope
GRITOS = [
    ('gCarga',   'vig_g_carga-g1.mp3',    0.230, 0.97),
    ('gBestia',  'vig_g_bestia-g1.mp3',   0.225, 0.97),
    ('gNina',    'vig_g_nina-g1.mp3',     0.230, 0.97),
    ('gTecho',   'vig_g_techo-g1.mp3',    0.215, 0.96),
    ('gJadeo',   'vig_g_jadeo-g1.mp3',    0.150, 0.90),
    ('gCoro',    'vig_g_coro-g1.mp3',     0.160, 0.90),
    ('gCara',    'vig_g_cara-g1.mp3',     0.240, 0.98),
    ('gOido',    'vig_g_oido-g1.mp3',     0.170, 0.92),
    ('gChillido','vig_g_chillido-g1.mp3', 0.225, 0.97),
    ('gLamento', 'vig_g_lamento-g1.mp3',  0.185, 0.93),
    ('gRisa',    'vig_g_risa-g1.mp3',     0.195, 0.94),
    ('gPasos',   'vig_g_pasos-g1.mp3',    0.170, 0.92),
]
MAX_S = 3.2


def lee(p):
    c = av.open(p)
    s = c.streams.audio[0]
    rs = av.AudioResampler(format='fltp', layout='mono', rate=SR)
    tr = []
    for fr in c.decode(s):
        for f2 in rs.resample(fr):
            tr.append(f2.to_ndarray()[0].copy())
    for f2 in rs.resample(None):
        tr.append(f2.to_ndarray()[0].copy())
    c.close()
    return np.concatenate(tr) if tr else np.zeros(1, np.float32)


def rafaga(x, dur):
    """la ventana de `dur` segundos con MAS energia, no con el pico mas alto"""
    n = int(dur*SR)
    if len(x) <= n:
        return x
    # suma acumulada de cuadrados: barrer a lo bruto es O(n*w) y se arrastra
    c = np.concatenate([[0.0], np.cumsum(x.astype(np.float64)**2)])
    e = c[n:] - c[:-n]
    i = int(np.argmax(e))
    return x[i:i+n]


def recorta(x):
    """saca el silencio de las puntas contra un umbral relativo"""
    a = np.abs(x)
    u = max(a.max()*0.02, 1e-4)
    idx = np.nonzero(a > u)[0]
    if len(idx) < 2:
        return x
    return x[idx[0]:idx[-1]+1]


def aplasta(x, f):
    """tanh: aplasta la punta y deja el cuerpo. f = 1 es no hacer nada"""
    if f <= 1.0:
        return x.copy()
    return (np.tanh(x*f)/np.tanh(f)).astype(np.float32)


def rampa(x, ent=0.006, sal=0.10):
    n0, n1 = int(ent*SR), int(sal*SR)
    if len(x) > n0 + n1 + 8:
        x[:n0] *= np.linspace(0, 1, n0)
        x[-n1:] *= np.linspace(1, 0, n1)
    return x


def escribe(x):
    b = io.BytesIO()
    c = av.open(b, 'w', format='mp3')
    st = c.add_stream('libmp3lame', rate=SR)
    st.bit_rate = KBPS*1000
    fr = av.AudioFrame.from_ndarray((x*32767).astype(np.int16).reshape(1, -1),
                                    format='s16', layout='mono')
    fr.sample_rate = SR
    for pk in st.encode(fr):
        c.mux(pk)
    for pk in st.encode(None):
        c.mux(pk)
    c.close()
    return b.getvalue()


def mide(raw):
    d = lee_bytes(raw)
    return math.sqrt(float((d**2).mean())), float(np.abs(d).max())


def lee_bytes(raw):
    c = av.open(io.BytesIO(raw))
    s = c.streams.audio[0]
    rs = av.AudioResampler(format='fltp', layout='mono', rate=SR)
    tr = []
    for fr in c.decode(s):
        for f2 in rs.resample(fr):
            tr.append(f2.to_ndarray()[0].copy())
    for f2 in rs.resample(None):
        tr.append(f2.to_ndarray()[0].copy())
    c.close()
    return np.concatenate(tr) if tr else np.zeros(1, np.float32)


def main():
    out, tot = {}, 0
    for clave, arch, robj, ptope in GRITOS:
        p = os.path.join(ENT, arch)
        if not os.path.exists(p):
            print(f'{clave:<10} FALTA {arch}')
            continue
        x = recorta(lee(p))
        x = rafaga(x, MAX_S)
        x = x - x.mean()
        x = x/max(1e-9, float(np.abs(x).max()))
        """── LA FUERZA DEL APLASTE SE ELIGE MIDIENDO EL MP3, NO ANTES ──
           Un grito saturado tiene una cresta enorme: normalizado por pico su
           rms queda en la mitad de lo pedido, y subir la ganancia lo unico que
           hace es recortar. Lo que sube el rms sin tocar el techo es aplastar
           la punta. Cual es la fuerza justa no se sabe de antemano —depende
           del clip— asi que se prueban de suave a dura y se toma la primera
           que llega al objetivo con el pico DEL MP3 por debajo del techo."""
        mejor = None
        for f in (1.0, 1.4, 1.9, 2.6, 3.5, 4.8, 6.5, 9.0):
            y = rampa(aplasta(x, f))
            r0 = math.sqrt(float((y**2).mean())) or 1e-9
            y = np.clip(y*(robj/r0), -1, 1).astype(np.float32)
            raw = escribe(y)
            r, pk = mide(raw)
            if pk > ptope:                       # el techo manda: se baja y se relee
                y = (y*(ptope*0.985/max(1e-9, pk))).astype(np.float32)
                raw = escribe(y)
                r, pk = mide(raw)
            # el techo NO es negociable: entre dos candidatos gana el de mas rms
            # SIEMPRE que respete el pico, y uno que se pasa solo se guarda si
            # no hay ninguno que entre
            ok = pk <= ptope
            if mejor is None or (ok and not mejor[5]) or (ok == mejor[5] and r > mejor[1]):
                mejor = (raw, r, pk, f, y, ok)
            if r >= robj*0.94 and pk <= ptope:
                break
        raw, r, pk, f, x = mejor[0], mejor[1], mejor[2], mejor[3], mejor[4]
        r, pk = mide(raw)
        out[clave] = 'data:audio/mpeg;base64,' + base64.b64encode(raw).decode()
        tot += len(raw)
        print(f'{clave:<10} {len(x)/SR:5.2f}s  rms {r:.3f} (obj {robj:.3f})  pico {pk:.2f}  aplaste x{f:.1f}  {len(raw)/1024:6.1f} KB')

    txt = ('\n/* ══════════ LOS GRITOS, EN BASE64 ══════════\n'
           '   Generados con Rezona y horneados por herramientas/vigilia/hornear_gritos.py.\n'
           '   Los sintetizados de c.js NO se borran: si un MP3 no decodifica, suena el\n'
           '   oscilador de siempre. Un juego mudo por un decodificador es peor que uno\n'
           '   con bips. */\n'
           'const GRITOS_B64 = ' + json.dumps(out) + ';\n')
    with open(SAL, 'w', encoding='utf-8') as f:
        f.write(txt)
    print(f'\n{SAL}  {len(txt)/1024:.1f} KB  ({tot/1024:.1f} KB de mp3, {len(out)} gritos)')


if __name__ == '__main__':
    main()
