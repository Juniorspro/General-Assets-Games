"""Un panorama equirectangular como FUENTE DE LUZ, no como fondo.

Lo usan tanto `pano-splat.py`, que convierte el panorama en nube, como
`mundo-splat.py`, que construye geometría de verdad y le saca el color de acá.
Tres cosas hacen falta para iluminar con una imagen:

* `env(d)` — el color que llega desde una dirección. Es la reflexión especular
  y el cielo visto de frente.
* `irradiancia(n)` — lo que recibe una superficie que mira hacia `n`, que es la
  integral del panorama contra el coseno sobre todo el hemisferio. Se resuelve
  con nueve armónicos esféricos: para difusa el error es del 1 % y evita
  integrar el panorama entero por cada gaussiana.
* `sol()` — la dirección y el color del pico más brillante. El sol de una
  equirectangular de 8 bits está recortado en blanco, así que su energía real
  no está en la imagen: se estima por el área del recorte.
"""
import math, struct, zlib
import numpy as np


# ------------------------------------------------------------------ leer PNG
def leer_png(ruta):
    d = open(ruta, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "no es PNG"
    i = 8; idat = b""; w = h = prof = tipo = None
    while i < len(d):
        n = struct.unpack(">I", d[i:i+4])[0]; t = d[i+4:i+8]; cont = d[i+8:i+8+n]
        if t == b"IHDR":
            w, h, prof, tipo = struct.unpack(">IIBB", cont[:10])
        elif t == b"IDAT": idat += cont
        elif t == b"IEND": break
        i += 12 + n
    assert prof == 8 and tipo in (2, 6), "sólo RGB/RGBA de 8 bits"
    canales = 3 if tipo == 2 else 4
    crudo = zlib.decompress(idat)
    px = np.zeros((h, w*canales), np.uint8)
    paso = w*canales
    ant = np.zeros(paso, np.int16)
    p = 0
    for y in range(h):
        f = crudo[p]; p += 1
        fila = np.frombuffer(crudo[p:p+paso], np.uint8).astype(np.int16).copy()
        p += paso
        if f == 1:
            for x in range(canales, paso): fila[x] = (fila[x] + fila[x-canales]) & 255
        elif f == 2:
            fila = (fila + ant) & 255
        elif f == 3:
            for x in range(paso):
                izq = fila[x-canales] if x >= canales else 0
                fila[x] = (fila[x] + ((izq + ant[x]) >> 1)) & 255
        elif f == 4:
            for x in range(paso):
                A = fila[x-canales] if x >= canales else 0
                B = ant[x]; C = ant[x-canales] if x >= canales else 0
                pp = A + B - C
                pa, pb, pc = abs(pp-A), abs(pp-B), abs(pp-C)
                pr = A if (pa <= pb and pa <= pc) else (B if pb <= pc else C)
                fila[x] = (fila[x] + pr) & 255
        px[y] = fila.astype(np.uint8); ant = fila
    return px.reshape(h, w, canales)[:, :, :3]



def cargar(ruta, recortar=True):
    """Lee el panorama y lo deja 2:1, que es lo que el mapeo asume."""
    img = leer_png(ruta)
    H0, W0, _ = img.shape
    if recortar and H0*2 != W0:
        H1 = W0//2
        if H1 < H0:
            y0 = (H0 - H1)//2
            img = img[y0:y0+H1]
    return img


def _dirs(H, W):
    """La dirección de cada píxel y el ángulo sólido que ocupa."""
    v = (np.arange(H) + 0.5)/H
    u = (np.arange(W) + 0.5)/W
    ph = math.pi/2 - v*math.pi
    th = u*2*math.pi
    cph = np.cos(ph)[:, None]; sph = np.sin(ph)[:, None]
    dx = cph*np.sin(th)[None, :]
    dy = np.repeat(sph, W, axis=1)
    dz = cph*np.cos(th)[None, :]
    dw = (2*math.pi/W)*(math.pi/H)*np.repeat(cph, W, axis=1)   # cos por el jacobiano
    return dx, dy, dz, dw


class Entorno:
    def __init__(self, img, ganancia=1.0):
        self.H, self.W, _ = img.shape
        # a lineal: el panorama viene en sRGB y sumar luz en sRGB no es sumar luz
        c = (img.astype(np.float32)/255.0)
        self.lin = np.where(c <= 0.04045, c/12.92, ((c + 0.055)/1.055)**2.4)*ganancia
        self.srgb = c
        self._sh()
        self._sol()

    # ---------------------------------------------------------------- env()
    def env(self, d, crudo=False):
        """Color que llega desde la dirección d (n,3). Bilineal, con vuelta."""
        d = d/np.maximum(1e-9, np.linalg.norm(d, axis=1))[:, None]
        u = (np.arctan2(d[:, 0], d[:, 2])/(2*math.pi)) % 1.0
        v = (math.pi/2 - np.arcsin(np.clip(d[:, 1], -1, 1)))/math.pi
        im = self.srgb if crudo else self.lin
        x = u*self.W - 0.5; y = np.clip(v*self.H - 0.5, 0, self.H-1)
        x0 = np.floor(x); y0 = np.floor(y)
        fx = (x - x0).astype(np.float32)[:, None]; fy = (y - y0).astype(np.float32)[:, None]
        x0 = x0.astype(np.int64) % self.W; x1 = (x0 + 1) % self.W
        y0 = y0.astype(np.int64); y1 = np.minimum(y0 + 1, self.H-1)
        return ((im[y0, x0]*(1-fx) + im[y0, x1]*fx)*(1-fy)
                + (im[y1, x0]*(1-fx) + im[y1, x1]*fx)*fy)

    # ------------------------------------------------------ SH de 9 términos
    def _sh(self):
        dx, dy, dz, dw = _dirs(self.H, self.W)
        Y = [0.282095 + 0*dx, 0.488603*dy, 0.488603*dz, 0.488603*dx,
             1.092548*dx*dy, 1.092548*dy*dz, 0.315392*(3*dz*dz - 1),
             1.092548*dx*dz, 0.546274*(dx*dx - dy*dy)]
        self.L = np.stack([ (self.lin*(y*dw)[:, :, None]).sum((0, 1)) for y in Y ])

    def irradiancia(self, n):
        """Lo que recibe una cara que mira a n, con los coeficientes de Ramamoorthi."""
        c1, c2, c3, c4, c5 = 0.429043, 0.511664, 0.743125, 0.886227, 0.247708
        x, y, z = n[:, 0:1], n[:, 1:2], n[:, 2:3]
        L = self.L
        E = (c4*L[0] - c5*L[6]
             + 2*c2*(L[3]*x + L[1]*y + L[2]*z)
             + 2*c1*(L[4]*x*y + L[5]*y*z + L[7]*x*z)
             + c3*L[6]*z*z + c1*L[8]*(x*x - y*y))
        return np.maximum(0.0, E/math.pi)

    # ------------------------------------------------------------------ sol
    def _sol(self):
        dx, dy, dz, dw = _dirs(self.H, self.W)
        lum = self.lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        arriba = dy > 0.02
        u = np.where(arriba, lum, 0)
        umb = np.percentile(u[arriba], 99.85)
        m = u >= max(umb, 1e-6)
        w = (u*dw)*m
        s = w.sum()
        if s <= 0:
            self.sol_dir = np.array([0.35, 0.62, -0.70], np.float32)
            self.sol_col = np.ones(3, np.float32)*2.2
            return
        d = np.array([(dx*w).sum(), (dy*w).sum(), (dz*w).sum()], np.float32)/s
        self.sol_dir = d/np.linalg.norm(d)
        # el disco está recortado en 1,0: la energía real se estima por el área
        # que ocupa el recorte, no por el valor, que ya no dice nada
        self.sol_col = (self.lin*(m*dw)[:, :, None]).sum((0, 1)).astype(np.float32)
        self.sol_col *= 12.0/max(1e-6, float(np.max(self.sol_col)))


# ------------------------------------------------------------- escribir .splat
def cuaternion(M):
    """M es (n,3,3) con los EJES EN LAS COLUMNAS y determinante +1.

    Ojo con el signo: un marco (ex, ey, normal) armado a ojo suele salir zurdo
    y de una matriz zurda esto devuelve cualquier cosa. El tercer eje sale del
    producto vectorial de los otros dos, siempre.
    """
    n = M.shape[0]
    tr = M[:, 0, 0] + M[:, 1, 1] + M[:, 2, 2]
    q = np.empty((n, 4), np.float32)
    k0 = tr > 0
    if k0.any():
        S = np.sqrt(np.maximum(1e-12, tr[k0] + 1.0))*2
        q[k0, 0] = 0.25*S
        q[k0, 1] = (M[k0, 2, 1] - M[k0, 1, 2])/S
        q[k0, 2] = (M[k0, 0, 2] - M[k0, 2, 0])/S
        q[k0, 3] = (M[k0, 1, 0] - M[k0, 0, 1])/S
    r_ = ~k0
    if r_.any():
        Mr = M[r_]; nr = Mr.shape[0]; qq = np.empty((nr, 4), np.float32)
        d0, d1, d2 = Mr[:, 0, 0], Mr[:, 1, 1], Mr[:, 2, 2]
        c1 = (d0 > d1) & (d0 > d2); c2 = (~c1) & (d1 > d2); c3 = ~(c1 | c2)
        for sel, (i1, j1, k1) in ((c1, (0, 1, 2)), (c2, (1, 2, 0)), (c3, (2, 0, 1))):
            if not sel.any(): continue
            Ms = Mr[sel]
            S = np.sqrt(np.maximum(1e-12, 1.0 + Ms[:, i1, i1] - Ms[:, j1, j1] - Ms[:, k1, k1]))*2
            qq[sel, 0] = (Ms[:, k1, j1] - Ms[:, j1, k1])/S
            qq[sel, 1+i1] = 0.25*S
            qq[sel, 1+j1] = (Ms[:, j1, i1] + Ms[:, i1, j1])/S
            qq[sel, 1+k1] = (Ms[:, k1, i1] + Ms[:, i1, k1])/S
        q[r_] = qq
    return q/np.maximum(1e-9, np.linalg.norm(q, axis=1))[:, None]


def normalizar(v):
    return v/np.maximum(1e-9, np.linalg.norm(v, axis=1))[:, None]


def marco(nor, guia=None):
    """Un marco DIESTRO con la normal como tercer eje."""
    nor = normalizar(np.asarray(nor, np.float32))
    if guia is None:
        guia = np.zeros_like(nor); guia[:, 1] = 1.0
        casi = np.abs(nor[:, 1]) > 0.97
        guia[casi] = np.array([1.0, 0.0, 0.0], np.float32)
    ex = normalizar(np.cross(guia, nor))
    ey = np.cross(nor, ex)
    return ex, ey, np.cross(ex, ey)


def escribir(ruta, pos, ex, ey, nor, esc, col, alfa=245):
    """Empaqueta al formato .splat: 32 bytes por gaussiana."""
    n = pos.shape[0]
    M = np.stack([ex, ey, nor], axis=2).astype(np.float32)
    q = cuaternion(M)
    f = np.zeros((n, 8), np.float32)
    f[:, 0:3] = pos; f[:, 3:6] = esc
    by = np.zeros((n, 8), np.uint8)
    by[:, 0:3] = np.clip(np.round(col*255.0), 0, 255).astype(np.uint8)
    by[:, 3] = alfa if np.isscalar(alfa) else np.clip(alfa, 0, 255).astype(np.uint8)
    by[:, 4:8] = np.clip(np.round(q*128 + 128), 0, 255)
    crudo = np.empty((n, 32), np.uint8)
    crudo[:, 0:24] = f[:, 0:6].copy().view(np.uint8).reshape(n, 24)
    crudo[:, 24:32] = by
    open(ruta, "wb").write(crudo.tobytes())
    return n


# ---------------------------------------------------------------- tono y sRGB
def tono(c, exp=1.0):
    """Curva filmica y vuelta a sRGB. El shade sale lineal y sin curva el sol
    recorta en blanco todo lo que ilumina de frente."""
    x = np.maximum(0.0, c*exp)
    a, b, cc, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    y = np.clip((x*(a*x + b))/(x*(cc*x + d) + e), 0.0, 1.0)
    return np.where(y <= 0.0031308, y*12.92, 1.055*np.power(np.maximum(y, 1e-8), 1/2.4) - 0.055)
