#!/usr/bin/env python3
"""
HORNEA LA MUSICA Y LOS SONIDOS DE INTERFAZ COMPARTIDOS (Eco, POMPOM, RECREO).

Es el mismo horno que el de RezUno y por los mismos motivos, que ya estan medidos alli:

  - LA COSTURA DEL BUCLE SE FUNDE. Un tema cortado en seco y puesto en loop da un golpe cada vuelta,
    y ese golpe se escucha mas que la musica.
  - EL NIVEL SE MIDE DESPUES DE CODIFICAR. Normalizar el float y dar el numero por bueno es creerle a
    una cuenta que no se hizo: el remuestreo y el codificador se comen los picos angostos. En RezUno
    un campanazo se caia de 0,46 a 0,146 y lo habria mandado asi.
  - MONO Y POCO kbps. Un colchon de ambiente no tiene nada arriba de 8 kHz que valga los bytes.

LOS TEMAS SE ACORTAN A 16 SEGUNDOS. Los tres juegos ya pesan mucho —Eco esta en 2,7 MB— y un colchon
de ambiente no necesita veinticuatro: lo que hace que no se note el bucle no es el largo sino que la
costura no exista. A 40 kbps mono, 16 segundos son 80 KB.

    python3 herramientas/audio_comun/hornear.py
"""
import av, base64, io, json, os, sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'crudo')
SAL = os.path.join(AQUI, 'salida')
SR = 32000

# que va en cada juego, con su nivel de destino
JUEGOS = {
    'eco': {
        'mus': {'menu': ('ecoMenu.m4a', 0.95), 'juego': ('ecoJuego.m4a', 0.95),
                'prado': ('pomMenu.m4a', 0.95)},
        'sfx': {'trompeta': ('trompeta.mp3', 0.92), 'ui': ('ui.mp3', 0.34)},
    },
    'pompom': {
        'mus': {'menu': ('pomMenu.m4a', 0.95), 'juego': ('pomJuego.m4a', 0.95)},
        'sfx': {'ui': ('ui.mp3', 0.34)},
    },
    'recreo': {
        'mus': {'juego': ('recMusica.m4a', 0.95)},
        'sfx': {'ui': ('ui.mp3', 0.34)},
    },
}
LARGO_MUS = 16.0          # segundos de tema antes de la costura
COLA = 1.3                # cuanto se funde la cola sobre la cabeza


def leer(p, sr=SR):
    c = av.open(p)
    s = c.streams.audio[0]
    rs = av.AudioResampler(format='fltp', layout='mono', rate=sr)
    out = []
    for f in c.decode(s):
        for g in rs.resample(f):
            out.append(g.to_ndarray()[0].copy())
    for g in rs.resample(None):
        out.append(g.to_ndarray()[0].copy())
    c.close()
    return np.concatenate(out).astype(np.float32) if out else np.zeros(0, np.float32)


def env(x, ms=20):
    w = max(1, int(SR * ms / 1000))
    m = len(x) // w
    if m == 0:
        return np.zeros(0), w
    return np.sqrt((x[:m * w].reshape(m, w) ** 2).mean(1)), w


def recortar(x, minimo=0.12):
    """la rafaga de mas ENERGIA, con el umbral aflojandose hasta que quede algo que valga"""
    e, w = env(x)
    if len(e) == 0:
        return x
    a, b = 0, len(e)
    for u in (0.20, 0.12, 0.07, 0.04, 0.02, 0.01):
        act = np.nonzero(e > e.max() * u)[0]
        if not len(act):
            continue
        a, b = act.min(), act.max() + 1
        if (b - a) * w / SR >= minimo:
            break
    a = max(0, a * w - int(SR * 0.012))
    b = min(len(x), b * w + int(SR * 0.05))
    return x[a:b]


def sobre(x, ent=0.004, sal=0.030):
    n = len(x)
    a = min(int(SR * ent), n // 4)
    b = min(int(SR * sal), n // 3)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def remuestrear(x, de, a):
    if de == a:
        return x
    n = int(round(len(x) * a / de))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def mp3(x, sr, kbps):
    buf = io.BytesIO()
    c = av.open(buf, 'w', format='mp3')
    st = c.add_stream('libmp3lame', rate=sr)
    st.bit_rate = kbps * 1000
    try:
        st.layout = 'mono'
    except Exception:
        pass
    y = np.clip(x, -1, 1)
    paso = 1152 * 8
    for i in range(0, len(y), paso):
        t = y[i:i + paso].astype(np.float32).reshape(1, -1)
        f = av.AudioFrame.from_ndarray(np.ascontiguousarray(t), format='fltp', layout='mono')
        f.sample_rate = sr
        f.pts = None
        for p in st.encode(f):
            c.mux(p)
    for p in st.encode(None):
        c.mux(p)
    c.close()
    return buf.getvalue()


def picoDe(b):
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
        f.write(b)
        q = f.name
    try:
        y = leer(q, SR)
        return float(np.abs(y).max()) if len(y) else 0.0
    finally:
        os.unlink(q)


def bucle(x, cola=COLA):
    """funde la cola sobre la cabeza: la costura deja de existir en vez de disimularse"""
    n = int(SR * cola)
    if len(x) <= n * 2:
        return x
    cuerpo = x[:len(x) - n].copy()
    f = np.linspace(0, 1, n)
    cuerpo[:n] = cuerpo[:n] * f + x[len(x) - n:] * (1 - f)
    return cuerpo


def main():
    os.makedirs(SAL, exist_ok=True)
    med = []
    for juego, cfg in JUEGOS.items():
        salida = {'mus': {}, 'sfx': {}}
        for k, (arch, nivel) in cfg['mus'].items():
            x = leer(os.path.join(CRUDO, arch))
            pk = float(np.abs(x).max())
            if pk > 1e-6:
                x *= nivel / pk
            lim = int(SR * (LARGO_MUS + COLA))
            if len(x) > lim:
                x = x[:lim]
            x = bucle(x)
            y = remuestrear(x, SR, 22050)
            b = mp3(y, 22050, 40)
            salida['mus'][k] = base64.b64encode(b).decode()
            med.append(dict(juego=juego, k='mus:' + k, seg=round(len(y) / 22050, 2),
                            pico=round(picoDe(b), 3), kb=len(b) // 1024))
        for k, (arch, nivel) in cfg['sfx'].items():
            x = recortar(leer(os.path.join(CRUDO, arch)))
            if len(x) > int(SR * 2.2):
                x = x[:int(SR * 2.2)]
            x = sobre(x)
            pk = float(np.abs(x).max())
            if pk > 1e-6:
                x *= nivel / pk
            y = remuestrear(x, SR, 16000)
            b = mp3(y, 16000, 40)
            for _ in range(2):
                real = picoDe(b)
                if real < 1e-5 or abs(real - nivel) / nivel < 0.06:
                    break
                y = np.clip(y * (nivel / real), -1, 1)
                b = mp3(y, 16000, 40)
            salida['sfx'][k] = base64.b64encode(b).decode()
            med.append(dict(juego=juego, k='sfx:' + k, seg=round(len(y) / 16000, 2),
                            pico=round(picoDe(b), 3), kb=len(b) // 1024))
        js = json.dumps(salida, separators=(',', ':'))
        io.open(os.path.join(SAL, juego + '.json'), 'w', encoding='utf8').write(js)
        print(juego, len(js) // 1024, 'KB en base64')
    io.open(os.path.join(SAL, 'medido.json'), 'w', encoding='utf8').write(json.dumps(med, indent=1))
    for m in med:
        print(f"  {m['juego']:7s} {m['k']:14s} {m['seg']:5.2f}s pico {m['pico']:.3f} {m['kb']:4d} KB")
    return 0


if __name__ == '__main__':
    sys.exit(main())
