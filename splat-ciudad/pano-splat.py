"""Convierte un panorama equirectangular en un .splat de pura pintura.

Sin malla, sin texturas, sin assets: cada gaussiana es UN PÍXEL del panorama,
puesto en el lugar del espacio de donde vino ese píxel. Que es lo que es un
splat: nubes de color, nada más.

De dónde sale el "lugar del espacio". Un panorama tiene la dirección de cada
píxel pero no su distancia, así que la distancia se deduce de la geometría de
la escena, que en un mundo de laguna es la parte fácil:

  · Mirando hacia abajo, el rayo pega en el plano del agua. Eso es exacto:
    t = altura_del_ojo / -sen(elevación). El agua queda con perspectiva DE
    VERDAD, y al caminar se comporta bien.
  · Mirando al horizonte o arriba —cielo, nubes, las lomas del fondo— no hay
    nada donde pegar, así que va a una cúpula lejana. A esa distancia el
    paralaje es despreciable y se comporta como el fondo que es.

El tamaño de cada gaussiana es el que subtiende su píxel a esa distancia, así
que de cerca son chiquitas y de lejos grandes: la nube queda continua sin
huecos. Las del suelo van APOYADAS en el plano y estiradas a lo largo del rayo
—un píxel visto de canto cubre un rectángulo largo—, y las del cielo van de
cara al ojo.

    python3 pano-splat.py cielo360.png salida.splat --super 3 --ojo 1.7
"""
import math, os, struct, sys, zlib
import numpy as np

a = sys.argv
ENT, SAL = a[1], a[2]
def opc(k, d): return float(a[a.index(k)+1]) if k in a else d
SUPER = int(opc("--super", 2))        # cuántas gaussianas por píxel, por lado
OJO   = opc("--ojo", 1.70)            # altura del ojo sobre el agua
LEJOS = opc("--lejos", 520.0)         # radio de la cúpula
GIRO  = opc("--giro", 0.0)            # grados, para orientar el mundo
TOPE  = opc("--tope", 60.0)           # tope del estirón radial, en metros
RSUELO= opc("--rsuelo", 180.0)        # hasta dónde el agua es agua y no fondo
GRANO = opc("--grano", 0.055)         # tamaño al que se ralea el agua de cerca
ANG   = opc("--ang", 0.006)           # y nunca más grueso que esto en radianes

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

img = leer_png(ENT)
H0, W0, _ = img.shape
# una equirectangular tiene que ser 2:1 o el mapeo sale estirado: se recorta
if H0 * 2 != W0:
    H1 = W0 // 2
    if H1 < H0:
        y0 = (H0 - H1)//2
        img = img[y0:y0+H1]
        print("PANO: %dx%d recortado a %dx%d (2:1)" % (W0, H0, W0, H1))
H, W, _ = img.shape

# ------------------------------------------------------------ muestreo
def _ker(f):
    """Catmull-Rom: los cuatro pesos de una coordenada fraccionaria."""
    f2, f3 = f*f, f*f*f
    return (0.5*(-f3 + 2*f2 - f), 0.5*(3*f3 - 5*f2 + 2),
            0.5*(-3*f3 + 4*f2 + f), 0.5*(f3 - f2))


def muestrear(im, u, v):
    """Bicúbico (Catmull-Rom), con la vuelta al mundo en u.

    Sin interpolar, subir --super no sirve de nada: repetir el píxel vecino
    multiplica las gaussianas sin agregar nada y el cielo sale escalonado.
    Bilineal ya arregla eso pero deja todo blando; Catmull-Rom mantiene el
    filo del horizonte y del borde de las nubes, que es de lo que depende que
    parezca una foto y no una acuarela. Va por tandas porque son dieciséis
    muestras por gaussiana y de una sola vez no entra en memoria.
    """
    sal = np.empty((u.shape[0], 3), np.float32)
    for a in range(0, u.shape[0], 1_000_000):
        b = min(a + 1_000_000, u.shape[0])
        x = u[a:b]*W - 0.5
        y = np.clip(v[a:b]*H - 0.5, 0.0, H - 1.0)
        x0 = np.floor(x); y0 = np.floor(y)
        wx = _ker(x - x0); wy = _ker(y - y0)
        xi = [(x0.astype(np.int64) + k - 1) % W for k in range(4)]
        yi = [np.clip(y0.astype(np.int64) + k - 1, 0, H - 1) for k in range(4)]
        acc = np.zeros((b - a, 3), np.float32)
        for kj in range(4):
            fila = np.zeros((b - a, 3), np.float32)
            for ki in range(4):
                fila += im[yi[kj], xi[ki]]*wx[ki].astype(np.float32)[:, None]
            acc += fila*wy[kj].astype(np.float32)[:, None]
        sal[a:b] = acc
    return sal


imgf = img.astype(np.float32)

# ------------------------------------------------------------ por dónde va
S = max(1, SUPER)
HS, WS = H*S, W*S
dth = 2*math.pi/WS
dph = math.pi/HS

# geometría POR FILA: alcanza para decidir el raleo antes de gastar memoria
vf = (np.arange(HS) + 0.5)/HS
phf = math.pi/2 - vf*math.pi                      # +90° arriba, -90° abajo
sphf, cphf = np.sin(phf), np.cos(phf)
# el rayo pega en el agua sólo si baja lo suficiente; más allá de --rsuelo el
# agua está tan lejos que el paralaje no se nota y va con el fondo, a la cúpula
suelof = sphf < -max(1e-4, OJO/RSUELO)
tf = np.where(suelof, OJO/np.maximum(1e-6, -sphf), LEJOS)

# el pie de cada píxel a esa distancia: a lo ancho el arco azimutal, a lo largo
# el estirón por mirar de canto. En la cúpula los dos son el arco.
fpr = np.where(suelof, tf*dph/np.maximum(1e-6, -sphf), LEJOS*dph)
fpa = np.where(suelof, tf, LEJOS)*np.maximum(1e-3, cphf)*dth

# EL DESPERDICIO QUE ESTO ARREGLA: bajo los pies un píxel del panorama tapa
# tres centímetros de agua, así que la mitad de las gaussianas se amontonan en
# un círculo de dos metros donde ya no se distingue ninguna. Se saltean filas y
# columnas hasta que cada gaussiana mida --grano, y las que sobreviven se
# agrandan por el mismo factor para tapar el hueco de las que se fueron. Lo que
# se libera se gasta donde sí se ve: más --super para el horizonte y el cielo.
# el objetivo no puede ser un tamaño fijo a secas: a un metro de los pies
# cinco centímetros son dos grados de vista y se ven los pegotes. Es el menor
# entre el grano en metros y lo que --ang subtiende a esa distancia.
# En la cúpula el objetivo es el arco del meridiano, que no depende de la
# latitud: así las de arriba salen CUADRADAS. Sin esto, cerca del cenit una
# equirectangular tiene miles de muestras en un casquete de nada y cada
# gaussiana sale como una aguja de un metro de largo y medio milímetro de
# ancho — y una aguja subpíxel no se funde con la de al lado, RAYA. El cielo
# quedaba con un abanico de rayas verdes saliendo del polo.
obj = np.where(suelof, np.minimum(GRANO, ANG*tf), fpr)
sv = np.clip((obj/np.maximum(1e-9, fpr)).astype(np.int64), 1, 512)
sh = np.clip((obj/np.maximum(1e-9, fpa)).astype(np.int64), 1, 4096)

fila = np.arange(HS)
viva = (fila % sv) == 0
cuenta = np.where(viva, (WS + sh - 1)//sh, 0)
n = int(cuenta.sum())
jr = np.repeat(fila, cuenta)
base = np.concatenate(([0], np.cumsum(cuenta)[:-1]))
ir = (np.arange(n) - np.repeat(base, cuenta))*np.repeat(sh, cuenta)
del fila, viva, base

sph = sphf[jr].astype(np.float32); cph = cphf[jr].astype(np.float32)
sl = suelof[jr]
t = tf[jr].astype(np.float32)
u = (ir + 0.5)/WS
v = (jr + 0.5)/HS
th = u*2*math.pi + math.radians(GIRO)
cth_ = np.cos(th).astype(np.float32); sth_ = np.sin(th).astype(np.float32)
dx = cph*sth_; dy = sph; dz = cph*cth_

col = muestrear(imgf, u, v)
del u, v, th, ir

pos = np.empty((n, 3), np.float32)
pos[:, 0] = dx*t
pos[:, 1] = OJO + dy*t
pos[:, 2] = dz*t

anch = fpa[jr]*sh[jr]
larg = np.where(sl, np.minimum(TOPE, fpr[jr]*sv[jr]), fpr[jr])
del jr

# ------------------------------------------------------------ ejes
ex = np.empty((n, 3), np.float32); ey = np.empty((n, 3), np.float32)
nor = np.empty((n, 3), np.float32)
# apoyadas en el agua: azimutal y radial en planta, normal para arriba
ex[:, 0] = cth_; ex[:, 1] = 0.0; ex[:, 2] = -sth_
ey[:, 0] = sth_; ey[:, 1] = 0.0; ey[:, 2] = cth_
nor[:, 0] = 0.0; nor[:, 1] = 1.0; nor[:, 2] = 0.0
# en la cúpula, de cara al ojo
d3 = np.stack([dx, dy, dz], 1).astype(np.float32)
arr = np.zeros_like(d3); arr[:, 1] = 1.0
exc = np.cross(arr, d3); exc /= np.maximum(1e-9, np.linalg.norm(exc, axis=1))[:, None]
eyc = np.cross(d3, exc)
cu = ~sl
ex[cu] = exc[cu]; ey[cu] = eyc[cu]; nor[cu] = -d3[cu]
del exc, eyc, arr, d3, dx, dy, dz, cth_, sth_, cu

esc = np.empty((n, 3), np.float32)
esc[:, 0] = 0.62*anch
esc[:, 1] = 0.62*larg
esc[:, 2] = np.maximum(0.008, 0.10*np.minimum(esc[:, 0], esc[:, 1]))

M = np.stack([ex, ey, nor], axis=2)
del ex, ey, nor

# ------------------------------------------------------------ cuaternión
tr = M[:,0,0] + M[:,1,1] + M[:,2,2]
q = np.empty((n,4), np.float32)
k0 = tr > 0
if k0.any():
    Sq = np.sqrt(np.maximum(1e-12, tr[k0]+1.0))*2
    q[k0,0] = 0.25*Sq
    q[k0,1] = (M[k0,2,1]-M[k0,1,2])/Sq
    q[k0,2] = (M[k0,0,2]-M[k0,2,0])/Sq
    q[k0,3] = (M[k0,1,0]-M[k0,0,1])/Sq
r_ = ~k0
if r_.any():
    Mr = M[r_]; nr = Mr.shape[0]; qq = np.empty((nr,4), np.float32)
    d0,d1,d2 = Mr[:,0,0], Mr[:,1,1], Mr[:,2,2]
    c1 = (d0>d1)&(d0>d2); c2 = (~c1)&(d1>d2); c3 = ~(c1|c2)
    for sel,(i1,j1,k1) in ((c1,(0,1,2)),(c2,(1,2,0)),(c3,(2,0,1))):
        if not sel.any(): continue
        Ms = Mr[sel]
        Sq = np.sqrt(np.maximum(1e-12, 1.0+Ms[:,i1,i1]-Ms[:,j1,j1]-Ms[:,k1,k1]))*2
        qq[sel,0] = (Ms[:,k1,j1]-Ms[:,j1,k1])/Sq
        qq[sel,1+i1] = 0.25*Sq
        qq[sel,1+j1] = (Ms[:,j1,i1]+Ms[:,i1,j1])/Sq
        qq[sel,1+k1] = (Ms[:,k1,i1]+Ms[:,i1,k1])/Sq
    q[r_] = qq
q /= np.maximum(1e-9, np.linalg.norm(q, axis=1))[:,None]

# ------------------------------------------------------------ escribir
f = np.zeros((n, 8), np.float32)
f[:, 0:3] = pos; f[:, 3:6] = esc
by = np.zeros((n, 8), np.uint8)
by[:, 0:3] = np.clip(np.round(col), 0, 255).astype(np.uint8)
by[:, 3] = 250
by[:, 4:8] = np.clip(np.round(q*128+128), 0, 255)
crudo = np.empty((n, 32), np.uint8)
crudo[:, 0:24] = f[:, 0:6].copy().view(np.uint8).reshape(n, 24)
crudo[:, 24:32] = by
open(SAL, "wb").write(crudo.tobytes())
print("PANO: %s · %d gaussianas · %.1f MB · %d%% suelo · ojo %.2f m · cúpula %.0f m" % (
      SAL, n, os.path.getsize(SAL)/1048576, 100*sl.mean(), OJO, LEJOS))
