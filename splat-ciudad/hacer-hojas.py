"""Genera la textura de un manojo de hojas, con alfa, sin bajar nada de la red.

El follaje macizo es lo que más delata una escena: una copa hecha de esferas se
ve como un grumo facetado por más chicas que sean las esferas. Lo que usa todo
el mundo son cartas cruzadas con una textura de hojas recortada por alfa, y esa
textura se puede dibujar acá: cada hoja es una lanceolada con nervadura, con
color y giro propios.
"""
import math, struct, sys, zlib
import numpy as np

N = int(sys.argv[2]) if len(sys.argv) > 2 else 512
SAL = sys.argv[1] if len(sys.argv) > 1 else "hojas.png"
rng = np.random.default_rng(7)

yy, xx = np.mgrid[0:N, 0:N]
u = (xx + 0.5)/N*2 - 1
v = (yy + 0.5)/N*2 - 1

col = np.zeros((N, N, 3), np.float64)
alf = np.zeros((N, N), np.float64)
prof = np.full((N, N), -1e9)          # la hoja de encima gana

for k in range(26):
    ang = rng.uniform(0, math.pi*2)
    r = 0.46*math.sqrt(rng.random())
    cx, cy = math.cos(ang)*r, math.sin(ang)*r
    gir = rng.uniform(0, math.pi*2)
    largo = rng.uniform(0.20, 0.34)
    anchoh = largo*rng.uniform(0.26, 0.40)
    c, s = math.cos(gir), math.sin(gir)
    lx = ((u-cx)*c + (v-cy)*s)/largo
    ly = (-(u-cx)*s + (v-cy)*c)/anchoh
    # lanceolada: ancha al medio, punta en los extremos
    forma = 1.0 - (np.abs(lx)**1.5 + np.abs(ly)**2.0)
    dentro = forma > 0
    if not dentro.any(): continue
    borde = np.clip(forma*N*0.10, 0, 1)      # un pelo de pluma en el borde
    # color: verde con variación, nervadura más clara, punta más amarilla
    # el verde manda siempre: dejando el rojo libre salían hojas marrones
    g = rng.uniform(0.060, 0.190)
    base = np.array([g*rng.uniform(0.28, 0.52), g, g*rng.uniform(0.12, 0.26)])
    amar = np.clip((lx + 1.0)*0.5, 0, 1)[..., None]
    ch = base[None, None, :]*(0.82 + 0.36*amar)
    nerv = np.exp(-(ly*6.0)**2)[..., None]
    ch = ch*(1 - 0.35*nerv) + np.array([0.10,0.16,0.05])[None,None,:]*0.35*nerv
    z = float(k)
    gana = dentro & (z > prof)
    prof[gana] = z
    col[gana] = ch[gana]
    alf[gana] = borde[gana]

def png(ruta, rgba):
    h, w, _ = rgba.shape
    crudo = b"".join(b"\x00" + rgba[y].tobytes() for y in range(h))
    def trozo(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t+d))
    open(ruta, "wb").write(
        b"\x89PNG\r\n\x1a\n"
        + trozo(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + trozo(b"IDAT", zlib.compress(crudo, 9))
        + trozo(b"IEND", b""))

# a sRGB para guardar (el material la lee como sRGB)
srgb = np.where(col <= 0.0031308, col*12.92,
                1.055*np.power(np.maximum(col, 1e-8), 1/2.4) - 0.055)
out = np.empty((N, N, 4), np.uint8)
out[:, :, :3] = np.clip(srgb*255, 0, 255).astype(np.uint8)
out[:, :, 3] = np.clip(alf*255, 0, 255).astype(np.uint8)
png(SAL, out)
print("%s · %dx%d · %.0f%% opaco" % (SAL, N, N, 100*(alf > 0.5).mean()))
