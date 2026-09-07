"""Mira un .splat sin GPU: z-buffer de puntos gordos y PNG.

No es el visor —no compone alfa ni evalúa la campana—, es para revisar color,
exposición y agujeros sin abrir un navegador. En esta máquina el navegador
rasteriza por software y se come los cuatro núcleos, que hacen falta para
Cycles.
"""
import math, struct, sys, zlib
import numpy as np

def leer(ruta):
    b = np.fromfile(ruta, dtype=np.uint8)
    n = len(b)//32
    b = b[:n*32].reshape(n, 32)
    f = b[:, :24].copy().view(np.float32).reshape(n, 6)
    return f[:, :3].astype(np.float64), f[:, 3:6].astype(np.float64), b[:, 24:28], n

def png(ruta, img):
    h, w, _ = img.shape
    crudo = b"".join(b"\x00" + img[y].tobytes() for y in range(h))
    def trozo(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t+d))
    open(ruta, "wb").write(
        b"\x89PNG\r\n\x1a\n"
        + trozo(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + trozo(b"IDAT", zlib.compress(crudo, 6))
        + trozo(b"IEND", b""))

def tomar(splat, salida, ojo, blanco, fov=52.0, W=1100, H=680, brillo=1.0,
          fondo=(11,12,16), rmax=7.0, sigma=1.0):
    pos, esc, rgba, n = leer(splat)
    ojo = np.array(ojo, float); blanco = np.array(blanco, float)
    z = ojo - blanco; z /= np.linalg.norm(z)
    x = np.cross([0.0,1.0,0.0], z); x /= np.linalg.norm(x)
    y = np.cross(z, x)
    R = np.stack([x, y, z])                     # filas
    pc = (pos - ojo) @ R.T
    d = -pc[:, 2]
    f = 0.5*H / math.tan(math.radians(fov)/2)
    vis = d > 0.6
    px = np.where(vis, pc[:,0]/np.maximum(1e-6,d)*f + W/2, -1e6)
    py = np.where(vis, H/2 - pc[:,1]/np.maximum(1e-6,d)*f, -1e6)
    # el tope importa: en una vista de adentro una gaussiana del piso a tres
    # metros ocupa cuarenta píxeles, y con el tope en siete el suelo aparece
    # como puntitos sueltos sobre negro y parece que faltaran gaussianas
    rad = np.clip(np.max(esc, axis=1)*sigma/np.maximum(1e-6,d)*f*1.15, 0.5, rmax)
    vis &= (px > -8) & (px < W+8) & (py > -8) & (py < H+8)
    idx = np.flatnonzero(vis)
    ix = px[idx].astype(np.int32); iy = py[idx].astype(np.int32)
    q = np.clip((d[idx]*24).astype(np.int64), 0, (1 << 38)-1)
    llave = (q << 25) | np.arange(len(idx), dtype=np.int64)
    buf = np.full(W*H, np.iinfo(np.int64).max, np.int64)
    ri = np.round(rad[idx]).astype(np.int32)
    for r in range(0, int(rmax)+1):
        m = ri == r
        if not m.any(): continue
        for dy in range(-r, r+1):
            for dx in range(-r, r+1):
                if dx*dx + dy*dy > (r+0.35)**2: continue
                jx = ix[m] + dx; jy = iy[m] + dy
                ok = (jx >= 0) & (jx < W) & (jy >= 0) & (jy < H)
                np.minimum.at(buf, jy[ok]*W + jx[ok], llave[m][ok])
    img = np.empty((H, W, 3), np.uint8)
    img[:] = np.array(fondo, np.uint8)
    lleno = buf != np.iinfo(np.int64).max
    gan = (buf[lleno] & ((1 << 25)-1))
    col = np.clip(rgba[idx][gan][:, :3].astype(np.float64)*brillo, 0, 255).astype(np.uint8)
    img.reshape(-1, 3)[lleno] = col
    png(salida, img)
    print("%s  %d/%d gaussianas visibles  %.1f%% de píxeles" % (
          salida, len(idx), n, 100*lleno.mean()))

if __name__ == "__main__":
    a = sys.argv[1:]
    def num(k, d):
        return float(a[a.index(k)+1]) if k in a else d
    def vec(k, d):
        return [float(v) for v in a[a.index(k)+1].split(",")] if k in a else d
    tomar(a[0], a[1], vec("--ojo", [200,120,260]), vec("--blanco", [0,40,0]),
          fov=num("--fov", 52), W=int(num("--w", 1100)), H=int(num("--h", 680)),
          brillo=num("--brillo", 1.0), rmax=num("--rmax", 7),
          sigma=num("--sigma", 1.0))
