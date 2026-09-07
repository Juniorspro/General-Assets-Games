"""Genera texturas de alfa para el follaje tropical y el pasto, con numpy.

Mismo truco que hacer-hojas.py: en vez de bajar una textura, se dibuja. Una
fronda de palmera es un raquis con folíolos a los costados; una mata de pasto
son briznas que salen de un punto. Las dos salen con alfa, para cartas.

    python3 hacer-fronda.py fronda.png 768 fronda
    python3 hacer-fronda.py pasto.png 512 pasto
"""
import math, struct, sys, zlib
import numpy as np

SAL = sys.argv[1] if len(sys.argv) > 1 else "fronda.png"
N = int(sys.argv[2]) if len(sys.argv) > 2 else 768
QUE = sys.argv[3] if len(sys.argv) > 3 else "fronda"
rng = np.random.default_rng(11)

yy, xx = np.mgrid[0:N, 0:N]
u = (xx + 0.5)/N*2 - 1
v = (yy + 0.5)/N*2 - 1
col = np.zeros((N, N, 3), np.float64)
alf = np.zeros((N, N), np.float64)
prof = np.full((N, N), -1e9)

def pintar(mask, color, z, borde=None):
    gana = mask & (z > prof)
    prof[gana] = z
    col[gana] = color[gana] if color.ndim == 3 else color
    alf[gana] = 1.0 if borde is None else borde[gana]

def hoja(cx, cy, gir, largo, ancho, verde, z, punta=1.5):
    c, s = math.cos(gir), math.sin(gir)
    lx = ((u-cx)*c + (v-cy)*s)/largo
    ly = (-(u-cx)*s + (v-cy)*c)/ancho
    forma = 1.0 - (np.abs(lx)**punta + np.abs(ly)**2.0)
    dentro = forma > 0
    if not dentro.any(): return
    borde = np.clip(forma*N*0.09, 0, 1)
    # nervadura clara y punta más amarilla
    amar = np.clip((lx + 1.0)*0.5, 0, 1)[..., None]
    ch = verde[None, None, :]*(0.80 + 0.40*amar)
    nerv = np.exp(-(ly*7.0)**2)[..., None]
    ch = ch*(1 - 0.30*nerv) + np.array([0.13,0.20,0.06])[None,None,:]*0.30*nerv
    pintar(dentro, ch, z, borde)

if QUE == "fronda":
    # raquis y folíolos a los dos lados, como una palmera
    g = rng.uniform(0.13, 0.26)
    base = np.array([g*rng.uniform(0.30,0.48), g, g*rng.uniform(0.12,0.26)])
    for k in range(34):
        t = k/33.0
        px = -0.86 + 1.66*t
        py = 0.10*math.sin(t*2.4) - 0.05
        largo = 0.30*math.sin(math.pi*min(1.0, t*1.25))**0.7 + 0.05
        for lado in (-1, 1):
            gir = lado*(1.05 - 0.45*t) + rng.uniform(-0.10, 0.10)
            hoja(px + math.cos(gir)*largo*0.9, py + math.sin(gir)*largo*0.9,
                 gir, largo, largo*rng.uniform(0.10, 0.16),
                 base*rng.uniform(0.80, 1.30), float(k), punta=1.3)
    # el raquis
    for k in range(60):
        t = k/59.0
        px = -0.88 + 1.72*t
        py = 0.10*math.sin(t*2.4) - 0.05
        d = np.hypot(u-px, v-py) < 0.016*(1.15-0.5*t)
        pintar(d, np.array([0.10,0.14,0.045]), 100.0)
else:
    # mata de pasto: briznas desde abajo, curvadas
    for k in range(46):
        a = rng.uniform(-1.15, 1.15)
        h = rng.uniform(0.55, 1.55)
        w = rng.uniform(0.014, 0.030)
        g = rng.uniform(0.20, 0.46)
        verde = np.array([g*rng.uniform(0.30,0.50), g, g*rng.uniform(0.10,0.24)])
        for j in range(26):
            t = j/25.0
            px = math.sin(a)*t*h*0.55 + 0.30*math.sin(a)*t*t
            py = -1.0 + t*h
            r = w*(1.0 - 0.85*t)
            d = np.hypot(u-px, v-py) < r
            pintar(d, verde*(0.75 + 0.55*t), float(k*30 + j))

def png(ruta, rgba):
    h, w, _ = rgba.shape
    crudo = b"".join(b"\x00" + rgba[y].tobytes() for y in range(h))
    def trozo(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t+d))
    open(ruta, "wb").write(
        b"\x89PNG\r\n\x1a\n"
        + trozo(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + trozo(b"IDAT", zlib.compress(crudo, 9)) + trozo(b"IEND", b""))

srgb = np.where(col <= 0.0031308, col*12.92,
                1.055*np.power(np.maximum(col, 1e-8), 1/2.4) - 0.055)
out = np.empty((N, N, 4), np.uint8)
out[:, :, :3] = np.clip(srgb*255, 0, 255).astype(np.uint8)
out[:, :, 3] = np.clip(alf*255, 0, 255).astype(np.uint8)
png(SAL, out)
print("%s · %dx%d · %.0f%% opaco" % (SAL, N, N, 100*(alf > 0.5).mean()))
