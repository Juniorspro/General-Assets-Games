#!/usr/bin/env python3
"""
HORNEA EL AUDIO DEL VECINDARIO. Mismo horno que RezUno y por los mismos motivos, ya medidos alli:
el recorte va por ENERGIA y no por pico, el nivel se mide DESPUES de codificar (el remuestreo y el
codificador se comen los picos angostos: en RezUno un campanazo se caia de 0,46 a 0,146), y los
bucles se funden cola sobre cabeza para que la costura no exista.

    python3 herramientas/vecindario/hornear_audio.py
"""
import av, base64, io, json, os, sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'audio')
SR = 32000

# nivel de destino y si es bucle. El golpe es el acontecimiento de la cinematica y es lo mas fuerte;
# los grillos son el piso sobre el que todo lo demas se apoya.
CLIPS = {
    'grillos': dict(arch='grillos.mp3', nivel=0.60, bucle=True,  sr=22050, kbps=40),
    'tension': dict(arch='tension.m4a', nivel=0.85, bucle=True,  sr=22050, kbps=40),
    'paso':    dict(arch='paso.mp3',    nivel=0.50, bucle=False, sr=16000, kbps=40, largo=0.5),
    # minimo 0,6: el vuelo del bate es BAJITO antes del impacto fuerte, y el recorte por energia con
    # el umbral alto se queda solo con el golpe (medido: 0,25 s). Exigiendo mas ventana, el umbral se
    # afloja hasta que el vuelo entra.
    'golpe':   dict(arch='golpe.mp3',   nivel=0.99, bucle=False, sr=16000, kbps=48, largo=1.6, minimo=0.6),
    'susto':   dict(arch='susto.mp3',   nivel=0.92, bucle=False, sr=16000, kbps=48, largo=2.0),
    'latido':  dict(arch='latido.mp3',  nivel=0.60, bucle=False, sr=16000, kbps=40, largo=5.0),
}


def leer(p, sr=SR):
    c = av.open(p); s = c.streams.audio[0]
    rs = av.AudioResampler(format='fltp', layout='mono', rate=sr)
    out = []
    for f in c.decode(s):
        for g in rs.resample(f): out.append(g.to_ndarray()[0].copy())
    for g in rs.resample(None): out.append(g.to_ndarray()[0].copy())
    c.close()
    return np.concatenate(out).astype(np.float32) if out else np.zeros(0, np.float32)


def recortar(x, minimo=0.12):
    w = max(1, int(SR * 0.02)); m = len(x) // w
    if m == 0: return x
    e = np.sqrt((x[:m * w].reshape(m, w) ** 2).mean(1))
    a, b = 0, m
    for u in (0.20, 0.12, 0.07, 0.04, 0.02):
        act = np.nonzero(e > e.max() * u)[0]
        if not len(act): continue
        a, b = act.min(), act.max() + 1
        if (b - a) * w / SR >= minimo: break
    a = max(0, a * w - int(SR * 0.012)); b = min(len(x), b * w + int(SR * 0.06))
    return x[a:b]


def sobre(x):
    n = len(x); a = min(int(SR * 0.004), n // 4); b = min(int(SR * 0.04), n // 3)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x


def fundirBucle(x, cola=1.2):
    n = int(SR * cola)
    if len(x) <= n * 2: return x
    c = x[:len(x) - n].copy(); f = np.linspace(0, 1, n)
    c[:n] = c[:n] * f + x[len(x) - n:] * (1 - f)
    return c


def remu(x, de, a):
    if de == a: return x
    n = int(round(len(x) * a / de))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def mp3(x, sr, kbps):
    buf = io.BytesIO(); c = av.open(buf, 'w', format='mp3')
    st = c.add_stream('libmp3lame', rate=sr); st.bit_rate = kbps * 1000
    try: st.layout = 'mono'
    except Exception: pass
    y = np.clip(x, -1, 1)
    for i in range(0, len(y), 1152 * 8):
        t = y[i:i + 1152 * 8].astype(np.float32).reshape(1, -1)
        f = av.AudioFrame.from_ndarray(np.ascontiguousarray(t), format='fltp', layout='mono')
        f.sample_rate = sr; f.pts = None
        for p in st.encode(f): c.mux(p)
    for p in st.encode(None): c.mux(p)
    c.close(); return buf.getvalue()


def picoDe(b):
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
        f.write(b); q = f.name
    try:
        y = leer(q, SR); return float(np.abs(y).max()) if len(y) else 0.0
    finally:
        os.unlink(q)


def main():
    salida, tot = {}, 0
    for n, c in CLIPS.items():
        x = leer(os.path.join(CRUDO, c['arch']))
        if c['bucle']:
            pk = float(np.abs(x).max())
            if pk > 1e-6: x *= c['nivel'] / pk
            x = fundirBucle(x)
        else:
            x = recortar(x, c.get('minimo', 0.12))
            if 'largo' in c and len(x) > int(SR * c['largo']): x = x[:int(SR * c['largo'])]
            x = sobre(x)
            pk = float(np.abs(x).max())
            if pk > 1e-6: x *= c['nivel'] / pk
        y = remu(x, SR, c['sr'])
        b = mp3(y, c['sr'], c['kbps'])
        for _ in range(2):
            real = picoDe(b)
            if real < 1e-5 or abs(real - c['nivel']) / c['nivel'] < 0.06: break
            y = np.clip(y * (c['nivel'] / real), -1, 1); b = mp3(y, c['sr'], c['kbps'])
        salida[n] = base64.b64encode(b).decode()
        tot += len(b)
        print(f"{n:8s} {len(y)/c['sr']:5.2f}s pico {picoDe(b):.3f} {len(b)//1024:4d} KB")
    io.open(os.path.join(AQUI, 'audio_b64.js'), 'w').write(
        'const AUDIO_B64 = ' + json.dumps(salida, separators=(',', ':')) + ';\n')
    print('---', tot // 1024, 'KB de MP3,', tot * 4 // 3 // 1024, 'en base64')
    return 0


if __name__ == '__main__':
    sys.exit(main())
