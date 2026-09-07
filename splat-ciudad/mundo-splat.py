"""Un mundo Frutiger Aero con GEOMETRÍA DE VERDAD, resuelto en gaussianas.

`pano-splat.py` pone cada píxel del panorama donde cae su rayo: sale hermoso
pero es un plano de agua y una cúpula, y al caminar no hay nada que rodear.
Esto es lo otro: relieve real, islas reales, palmeras, burbujas y cromados
reales, y el color sacado del panorama, que es la fotografía de ese mundo.

CÓMO SE ILUMINA, que es de lo que depende que parezca real:

* La luz ambiente es el panorama entero integrado contra el coseno —nueve
  armónicos esféricos—, así que una cara que mira al cielo recibe azul y una
  que mira al agua recibe turquesa. Eso solo ya separa las formas.
* El sol se busca en el panorama: dirección, color y una intensidad calibrada
  contra el cielo, porque el disco viene recortado en blanco y su energía real
  no está en la imagen.
* La sombra del sol sale de un barrido de horizonte sobre la grilla de alturas,
  no de trazar rayos: el sol está a 57° y ninguna sombra pasa de veinte metros.
* El agua es dos capas: el fondo de arena con la absorción del agua encima
  —por eso el turquesa es turquesa— y la superficie semitransparente con
  Fresnel, que refleja el panorama.

    python3 mundo-splat.py cielo360-rezona.png mundo.splat --grano 0.055
"""
import math, os, sys, time
import numpy as np
import pano

a = sys.argv
ENT, SAL = a[1], a[2]
def opc(k, d): return float(a[a.index(k)+1]) if k in a else d
GRANO = opc("--grano", 0.055)     # tamaño de la gaussiana al lado del ojo
CRECE = opc("--crece", 0.0042)    # cuánto crece por metro de distancia
LEJOS = opc("--lejos", 320.0)     # hasta dónde llega el terreno
DOMO  = opc("--domo", 900.0)      # radio de la cúpula de cielo
OJO   = opc("--ojo", 1.70)
SEM   = int(opc("--semilla", 7))
EXPO  = opc("--expo", 0.62)   # con 1.0 el sol lava todo: la arena sale nieve
ALTO  = opc("--alto", 1.0)        # multiplicador de relieve
DENS  = opc("--dens", 1.0)        # cuántos objetos, para la versión de teléfono

rng = np.random.default_rng(SEM)
t0 = time.time()
def paso(m):
    print("MUNDO: %-34s %6.1f s" % (m, time.time()-t0), flush=True)

ent = pano.Entorno(pano.cargar(ENT))
SOL_D = ent.sol_dir.astype(np.float32)
# el sol de una equirectangular de 8 bits está recortado: su valor no dice
# nada. Se calibra contra el cielo, que sí está bien medido: en exterior con
# sol la irradiancia directa es unas cuatro veces y media la del cielo.
_amb = float(np.mean(ent.irradiancia(np.array([[0.0, 1.0, 0.0]], np.float32))))
SOL_C = (ent.sol_col/max(1e-6, float(np.mean(ent.sol_col)))*(4.5*_amb)).astype(np.float32)
paso("entorno: sol a %.0f°" % math.degrees(math.asin(SOL_D[1])))

# ---------------------------------------------------------------- ruido
def _mezcla(h, ix, iz):
    k = (ix.astype(np.int64)*374761393 + iz.astype(np.int64)*668265263 + h*1442695041)
    k = (k ^ (k >> 13))*1274126177
    return ((k ^ (k >> 16)) & 0xffffff).astype(np.float32)/0xffffff

def valor(x, z, sem):
    x0 = np.floor(x); z0 = np.floor(z)
    fx = (x - x0).astype(np.float32); fz = (z - z0).astype(np.float32)
    sx = fx*fx*(3 - 2*fx); sz = fz*fz*(3 - 2*fz)
    i0 = x0.astype(np.int64); j0 = z0.astype(np.int64)
    a00 = _mezcla(sem, i0, j0);     a10 = _mezcla(sem, i0+1, j0)
    a01 = _mezcla(sem, i0, j0+1);   a11 = _mezcla(sem, i0+1, j0+1)
    return (a00*(1-sx) + a10*sx)*(1-sz) + (a01*(1-sx) + a11*sx)*sz

def fbm(x, z, esc, oct=5, sem=1):
    s = np.zeros(x.shape, np.float32); amp = 1.0; tot = 0.0; f = esc
    for k in range(oct):
        s += amp*valor(x*f, z*f, sem + k*17)
        tot += amp; amp *= 0.5; f *= 2.03
    return s/tot

# ------------------------------------------------------------- el relieve
# Un anillo de lomas lejanas —las que se ven pintadas en el panorama, ahora en
# 3D—, unas islas cerca y un fondo de laguna abajo del agua. Todo en metros y
# con el agua en y = 0.
ISLAS = np.array([
    #   x       z     radio  alto
    [  34.0, -46.0,  26.0,  7.4],
    [ -58.0, -22.0,  33.0,  9.1],
    [  12.0,  62.0,  22.0,  5.2],
    [ -30.0,  74.0,  28.0,  6.6],
    [  88.0,  18.0,  19.0,  4.4],
    [ -96.0,  52.0,  24.0,  5.8],
    [  62.0,  92.0,  30.0,  8.2],
    [-110.0, -74.0,  27.0,  6.9],
], np.float32)

def altura(x, z):
    r = np.hypot(x, z)
    h = np.full(x.shape, -2.9, np.float32)
    # El fondo de la laguna arranca a menos de tres metros y se hunde despacio.
    # No es un capricho: el turquesa de un agua así es el fondo de arena visto
    # a través del agua. Con la laguna a siete metros el agua sale azul marino,
    # que está bien para el mar y no es esto.
    h -= np.clip((r - 45.0)/135.0, 0, 1)*4.6
    h += (fbm(x, z, 0.021, 4, 3) - 0.5)*2.2
    # El anillo de lomas, que NO puede ser un anillo entero: si la tierra rodea
    # la laguna por los 360°, no hay mar abierto en ningún rumbo y el horizonte
    # queda tapado. Se abre y se cierra con el azimut —costa en más o menos la
    # mitad de las direcciones, mar abierto en la otra— y vuelve a hundirse
    # antes del borde del mundo, así que afuera del terreno todo es agua y no
    # queda un escalón donde termina la grilla.
    th = np.arctan2(x, z)
    m = (0.60*np.sin(2*th + 1.10) + 0.50*np.sin(3*th - 0.40)
         + 0.35*np.sin(5*th + 2.20))/1.45
    az = np.clip((0.5 + 0.5*m - 0.30)/0.34, 0, 1)
    az = az*az*(3 - 2*az)
    sube = np.clip((r - 152.0)/58.0, 0, 1); sube = sube*sube*(3 - 2*sube)
    baja = 1.0 - np.clip((r - 248.0)/52.0, 0, 1)
    baja = baja*baja*(3 - 2*baja)
    h += az*sube*baja*(19.0 + 20.0*fbm(x, z, 0.0085, 5, 11))
    # las islas
    for cx, cz, rad, alt in ISLAS:
        d = np.hypot(x - cx, z - cz)/rad
        f = np.clip(1.0 - d*d, 0, 1)
        h += alt*f*f*(0.55 + 0.9*fbm(x, z, 0.035, 4, 23))
    # arrugas grandes en lo que ya está alto: sin esto las lomas son domos
    h += np.maximum(0.0, h)*0.16*(fbm(x, z, 0.05, 4, 31) - 0.5)*2
    return (h*ALTO).astype(np.float32)

# La grilla existe para dos cosas que punto por punto serían carísimas: la
# normal (que es la derivada) y la sombra (que es un barrido). El detalle fino
# se agrega después, por punto, que ahí sí sale barato.
NG = 2048
GLADO = 2*LEJOS + 80.0
gx = np.linspace(-GLADO/2, GLADO/2, NG, dtype=np.float32)
GX, GZ = np.meshgrid(gx, gx, indexing="xy")
GH = altura(GX, GZ)
GPASO = GLADO/(NG - 1)
paso("grilla de alturas %dx%d" % (NG, NG))

def _bil(G, x, z):
    u = (x + GLADO/2)/GPASO; v = (z + GLADO/2)/GPASO
    u = np.clip(u, 0, NG - 1.001); v = np.clip(v, 0, NG - 1.001)
    i0 = u.astype(np.int32); j0 = v.astype(np.int32)
    fu = (u - i0)[..., None] if G.ndim == 3 else (u - i0)
    fv = (v - j0)[..., None] if G.ndim == 3 else (v - j0)
    i1 = np.minimum(i0 + 1, NG - 1); j1 = np.minimum(j0 + 1, NG - 1)
    return ((G[j0, i0]*(1-fu) + G[j0, i1]*fu)*(1-fv)
            + (G[j1, i0]*(1-fu) + G[j1, i1]*fu)*fv)

# normal de la grilla
gy, gxg = np.gradient(GH, GPASO)
GN = np.stack([-gxg, np.ones_like(GH), -gy], axis=2)
GN /= np.maximum(1e-9, np.linalg.norm(GN, axis=2))[:, :, None]

# sombra: se avanza hacia el sol sobre la grilla y se pregunta si algo tapa.
# Con el sol a 57° la sombra más larga que puede tirar una loma de 33 m son
# veintiún metros, así que veinticuatro pasos de un metro alcanzan y sobran.
sxz = np.array([SOL_D[0], SOL_D[2]], np.float32)
lxz = float(np.hypot(*sxz)) or 1e-6
sxz /= lxz
tan_sol = float(SOL_D[1])/lxz
GS = np.ones_like(GH)
for k in range(1, 25):
    d = k*1.0
    hx = _bil(GH, GX + sxz[0]*d, GZ + sxz[1]*d)
    tapa = hx > GH + d*tan_sol + 0.05
    GS = np.minimum(GS, np.where(tapa, 0.0, 1.0))
# desenfoque de la sombra: el sol tiene medio grado, el borde no es un filo
k = np.array([1, 4, 7, 4, 1], np.float32); k /= k.sum()
for _ in range(2):
    GS = np.apply_along_axis(lambda m: np.convolve(m, k, "same"), 0, GS)
    GS = np.apply_along_axis(lambda m: np.convolve(m, k, "same"), 1, GS)
paso("sombra del sol")

# oclusión ambiente barata: cuánto más bajo está uno que su entorno
GO = GH - np.stack([np.roll(GH, s, ax) for s in (-6, 6) for ax in (0, 1)]).mean(0)
GAO = np.clip(0.55 + 0.45*np.clip(GO/2.5 + 0.6, 0, 1), 0.35, 1.0).astype(np.float32)

# ------------------------------------------------------------- acumulador
POS, EX, EY, NOR, ESC, COL, ALF = [], [], [], [], [], [], []
def soltar(pos, ex, ey, nor, esc, col, alfa=245):
    POS.append(pos.astype(np.float32)); EX.append(ex.astype(np.float32))
    EY.append(ey.astype(np.float32));   NOR.append(nor.astype(np.float32))
    ESC.append(esc.astype(np.float32)); COL.append(col.astype(np.float32))
    ALF.append(np.full(len(pos), alfa, np.uint8) if np.isscalar(alfa)
               else np.asarray(alfa, np.uint8))

def sombrear(nor, alb, sombra, ao=1.0, extra=0.0):
    """Difusa: el cielo entero por un lado y el sol por el otro."""
    cos = np.maximum(0.0, nor @ SOL_D)
    luz = ent.irradiancia(nor)*np.asarray(ao)[..., None] + SOL_C*(cos*sombra)[:, None]
    return alb*luz + extra

def grano_de(r):
    """El tamaño de la gaussiana a esa distancia del ojo.

    Crece lineal mientras hay algo que mirar y se dispara pasado el terreno:
    del borde para afuera es agua lisa hasta el horizonte y no hace falta
    gastar una gaussiana cada metro. El quiebre tiene que ser CONTINUO —el
    mismo valor a los dos lados— o queda una banda gris en el horizonte, que
    es lo que se ve cuando el grano salta de un metro y medio a veinte.
    """
    return GRANO + CRECE*r + 0.030*np.maximum(0.0, r - LEJOS)

def anillos(rmax, r0=0.35):
    """Puntos en un disco con el grano creciendo hacia afuera."""
    xs, zs, gs = [], [], []
    r = r0
    while r < rmax:
        g = float(grano_de(np.float32(r)))
        m = max(8, int(2*math.pi*r/g))
        th = (np.arange(m) + rng.random(m))/m*2*math.pi
        rr = r + (rng.random(m) - 0.5)*g*0.45   # poco temblor: con mucho, se abren huecos
        xs.append(rr*np.sin(th)); zs.append(rr*np.cos(th))
        gs.append(np.full(m, g, np.float32))
        r += g
    return (np.concatenate(xs).astype(np.float32),
            np.concatenate(zs).astype(np.float32),
            np.concatenate(gs).astype(np.float32))

X, Z, G = anillos(LEJOS)
H = _bil(GH, X, Z)
paso("puntos del disco: %d" % len(X))

# =============================================================== el terreno
# La normal macro sale de la grilla y encima se le suma arruga fina por punto:
# sin eso la arena es una chapa y las lomas son globos.
def normal_fina(x, z, nm, amp1=0.55, amp2=0.30):
    d = 0.35
    f1 = (fbm(x+d, z, 0.9, 3, 41) - fbm(x-d, z, 0.9, 3, 41))
    f2 = (fbm(x, z+d, 0.9, 3, 41) - fbm(x, z-d, 0.9, 3, 41))
    g1 = (fbm(x+0.09, z, 4.4, 2, 53) - fbm(x-0.09, z, 4.4, 2, 53))
    g2 = (fbm(x, z+0.09, 4.4, 2, 53) - fbm(x, z-0.09, 4.4, 2, 53))
    n = nm.copy()
    n[:, 0] -= amp1*f1 + amp2*g1
    n[:, 2] -= amp1*f2 + amp2*g2
    return pano.normalizar(n)

tierra = H > -0.22
xt, zt, gt, ht = X[tierra], Z[tierra], G[tierra], H[tierra]
nm = _bil(GN, xt, zt)
nt = normal_fina(xt, zt, nm)
pend = 1.0 - np.clip(nm[:, 1], 0, 1)                     # 0 llano, 1 pared
somb = _bil(GS, xt, zt)
ao = _bil(GAO, xt, zt)

# arena en la orilla, pasto arriba, roca en lo empinado
mez_p = np.clip((ht - 0.55)/1.9, 0, 1)*np.clip(1 - pend*3.2, 0, 1)
mez_r = np.clip((pend - 0.16)/0.22, 0, 1)
var = fbm(xt, zt, 0.10, 4, 61)[:, None]
# Albedos de verdad, no colores de pintura: la arena seca refleja el 35 % y el
# pasto el 13 %. Con los valores altos que uno pondría a ojo, el sol los manda
# arriba de 1 y la curva los devuelve blancos —la playa salía nieve—.
ARENA = np.array([0.40, 0.345, 0.255], np.float32)
PASTO = np.array([0.105, 0.185, 0.062], np.float32)
ROCA  = np.array([0.21, 0.205, 0.19], np.float32)
alb = ARENA*(1 + 0.16*(var - 0.5))
alb = alb*(1 - mez_p[:, None]) + PASTO*(0.80 + 0.5*var)*mez_p[:, None]
alb = alb*(1 - mez_r[:, None]) + ROCA*(0.8 + 0.5*var)*mez_r[:, None]

lin = sombrear(nt, alb, somb, ao)
# lo que quedó abajo del agua se lo come el agua: absorción por el camino que
# hace la luz para bajar y volver a subir
prof = np.maximum(0.0, -ht)
SIG = np.array([0.46, 0.105, 0.062], np.float32)
lin *= np.exp(-SIG*(prof*(1.0/max(0.2, SOL_D[1]) + 1.35))[:, None])
col = pano.tono(lin, EXPO)

ex, ey, no = pano.marco(nt)
# EL PROBLEMA DEL ÁNGULO RASANTE: un disco apoyado en el suelo, visto desde
# 1,70 m a treinta metros, se aplasta a una raya, y entre raya y raya se ve el
# fondo —el agua salía con rayas verticales negras—. Se arregla con dos cosas:
# solape de sobra a lo ancho y un GROSOR contra la normal, para que de canto el
# disco siga teniendo cuerpo en vez de desaparecer.
esc = np.stack([0.62*gt, 0.62*gt, np.maximum(0.012, 0.26*gt)], 1)
soltar(np.stack([xt, ht, zt], 1), ex, ey, no, esc, col)
paso("terreno y fondo: %d" % len(xt))

# ================================================================== el agua
# Dos capas: el fondo ya está dibujado con la absorción encima, y esto es la
# superficie, semitransparente, con Fresnel y el reflejo del panorama.
def olas(x, z):
    """Alto y pendiente de la superficie: suma de trenes de olas cruzados."""
    h = np.zeros(x.shape, np.float32); dx = np.zeros_like(h); dz = np.zeros_like(h)
    # LO QUE IMPORTA NO ES LA ALTURA, ES LA PENDIENTE: la altura de la ola no
    # se ve —son centímetros— pero la pendiente decide hacia dónde apunta el
    # reflejo, y con trenes empinados la laguna se llena de motas verdes,
    # que son las lomas del panorama reflejadas de a una gaussiana. Suma de
    # pendientes acá: 0,15, unos ocho grados. Una laguna, no el mar abierto.
    trenes = ((0.055, 0.42, 0.31, 1.1), (0.032, 0.95, -0.84, 1.7),
              (0.018, 1.90, 0.47, 2.6), (0.009, 3.40, -1.9, 3.9),
              (0.0045, 6.2, 2.6, 5.5))
    for amp, k, ang, vel in trenes:
        ax, az = math.cos(ang), math.sin(ang)
        f = k*(x*ax + z*az) + vel
        h += amp*np.sin(f)
        c = amp*k*np.cos(f)
        dx += c*ax; dz += c*az
    # rizado chico, que es lo que rompe el reflejo en escamas
    r = (fbm(x*1.0, z*1.0, 1.0, 3, 71) - 0.5)
    d = 0.11
    # el rizado va con la pendiente MUY baja: es lo que rompe el reflejo en
    # escamas, y pasado de rosca el agua queda como sal y pimienta
    dx += (fbm((x+d), z, 1.0, 3, 71) - fbm((x-d), z, 1.0, 3, 71))/(2*d)*0.016
    dz += (fbm(x, (z+d), 1.0, 3, 71) - fbm(x, (z-d), 1.0, 3, 71))/(2*d)*0.016
    h += 0.012*r
    return h, dx, dz

# el agua sigue más allá del terreno: si termina donde termina la isla, el
# horizonte queda con un borde y se ve la maqueta
X2, Z2, G2 = anillos(3200.0, r0=LEJOS)
XA = np.concatenate([X[~tierra], X2]); ZA = np.concatenate([Z[~tierra], Z2])
GA = np.concatenate([G[~tierra], G2])
HA = np.concatenate([H[~tierra], np.full(len(X2), -8.5, np.float32)])

hw, dwx, dwz = olas(XA, ZA)
nw = pano.normalizar(np.stack([-dwx, np.ones_like(dwx), -dwz], 1))
pw = np.stack([XA, hw, ZA], 1)
vis = pano.normalizar(np.stack([XA, hw - OJO, ZA], 1))          # del ojo al punto
cosv = np.maximum(0.02, -(vis*nw).sum(1))
F = 0.020 + 0.980*np.power(1.0 - cosv, 5.0)
refl = vis - 2*(vis*nw).sum(1)[:, None]*nw
cielo = ent.env(refl)
# el brillo del sol en el agua: el lóbulo especular que el panorama de 8 bits
# no puede traer porque su disco está recortado
esp = np.maximum(0.0, (refl*SOL_D).sum(1))
cielo = cielo + SOL_C*np.power(esp, 900.0)[:, None]*2.4

profa = np.maximum(0.0, -HA)
AGUA = np.array([0.030, 0.235, 0.275], np.float32)
disp = AGUA*ent.irradiancia(nw)*(1 - np.exp(-profa*0.42))[:, None]
A = np.clip(F + (1 - F)*(1 - np.exp(-profa*0.42))*0.93, 0.06, 0.985)
lin = (cielo*F[:, None] + disp*(1 - F)[:, None])/A[:, None]
colw = pano.tono(lin, EXPO)

exw, eyw, now = pano.marco(nw)
escw = np.stack([0.64*GA, 0.64*GA, np.maximum(0.010, 0.26*GA)], 1)
soltar(pw, exw, eyw, now, escw, colw, np.clip(A*255, 16, 251).astype(np.uint8))
paso("agua: %d" % len(XA))

# ========================================================== cosas con volumen
# De acá para abajo todo es geometría real: troncos, hojas, burbujas, cromados
# y vidrios. Cada objeto es una superficie muestreada con su normal, y el color
# sale del mismo alumbrado que el terreno.
def superficie(pos, nor, tam, alb, sombra=1.0, ao=1.0, extra=0.0, alfa=245,
               grosor=0.10):
    nor = pano.normalizar(np.asarray(nor, np.float32))
    lin = sombrear(nor, np.asarray(alb, np.float32), np.asarray(sombra, np.float32),
                   ao, extra)
    ex, ey, no = pano.marco(nor)
    tam = np.asarray(tam, np.float32)
    esc = np.stack([tam, tam, np.maximum(0.006, grosor*tam)], 1)
    soltar(pos, ex, ey, no, esc, pano.tono(lin, EXPO), alfa)

def libre(x, z, n, rmax, hmin, hmax, pend_max=0.30, sep=6.0, rmin=0.0):
    """Sitios sobre tierra firme, sin amontonarse."""
    xs, zs = [], []
    intentos = 0
    while len(xs) < n and intentos < n*70:
        intentos += 1
        r = math.sqrt(rng.random()*(1 - (rmin/rmax)**2) + (rmin/rmax)**2)*rmax
        t = rng.random()*2*math.pi
        px, pz = r*math.sin(t), r*math.cos(t)
        h = float(_bil(GH, np.array([px], np.float32), np.array([pz], np.float32))[0])
        if not (hmin < h < hmax): continue
        nn = _bil(GN, np.array([px], np.float32), np.array([pz], np.float32))[0]
        if 1 - nn[1] > pend_max: continue
        if xs and min((px-a)**2 + (pz-b)**2 for a, b in zip(xs, zs)) < sep*sep: continue
        xs.append(px); zs.append(pz)
    return np.array(xs, np.float32), np.array(zs, np.float32)

def gr(r):
    """Grano de un objeto según lo lejos que esté: de cerca fino, de lejos no."""
    return float(np.clip(GRANO + CRECE*r, GRANO, 0.9))

# ------------------------------------------------------------------ palmeras
CORTEZA = np.array([0.315, 0.255, 0.190], np.float32)
HOJA    = np.array([0.115, 0.215, 0.055], np.float32)
HOJA2   = np.array([0.165, 0.255, 0.070], np.float32)

def palmera(px, pz, base, alto, incl, giro, g):
    P, N, T, A = [], [], [], []
    # tronco: una espiral de anillos sobre una espina curvada
    ns = max(8, int(alto/max(0.05, g*2.2)))
    t = np.linspace(0, 1, ns, dtype=np.float32)
    cur = incl*t*t
    cx = px + math.sin(giro)*cur*alto*0.5
    cz = pz + math.cos(giro)*cur*alto*0.5
    cy = base + t*alto
    rad = (0.34 - 0.16*t)*(1 + 0.05*np.sin(t*38))
    for i in range(ns):
        na = max(6, int(2*math.pi*rad[i]/max(0.03, g)))
        an = (np.arange(na) + rng.random())/na*2*math.pi
        nx = np.sin(an); nz = np.cos(an)
        P.append(np.stack([cx[i] + nx*rad[i], np.full(na, cy[i]), cz[i] + nz*rad[i]], 1))
        N.append(np.stack([nx, np.full(na, 0.22), nz], 1))
        T.append(np.full(na, max(0.03, g)*0.75, np.float32))
        A.append(np.full(na, 0.80 + 0.35*(i/ns), np.float32))
    tope = np.array([cx[-1], cy[-1], cz[-1]], np.float32)
    # las frondas: cintas arqueadas, con los folíolos marcados por el ancho
    nf = 9
    for k in range(nf):
        az = giro + k/nf*2*math.pi + rng.random()*0.25
        largo = alto*(0.42 + 0.16*rng.random())
        caida = 0.55 + 0.5*rng.random()
        nu = max(10, int(largo/max(0.05, g*1.8)))
        u = np.linspace(0.03, 1, nu, dtype=np.float32)
        ejex = np.array([math.sin(az), 0.0, math.cos(az)], np.float32)
        arr = np.array([0.0, 1.0, 0.0], np.float32)
        # la espina de la fronda: sale para arriba y se cae
        sy = largo*(0.42*u - caida*u*u*1.35)
        esp = tope[None, :] + ejex[None, :]*(largo*u)[:, None] + arr[None, :]*sy[:, None]
        lat = np.cross(arr, ejex); lat /= np.linalg.norm(lat)
        ancho = largo*0.16*np.maximum(0.0, np.sin(np.clip(u, 0, 1)*math.pi))**0.6
        for i in range(nu):
            nv = max(3, int(2*ancho[i]/max(0.04, g*1.4)))
            v = (np.arange(nv) + 0.5)/nv*2 - 1
            # el folíolo: el borde va serrucho, no recto
            w = ancho[i]*(1 - 0.30*np.abs(np.sin(v*11.0)))
            pp = esp[i][None, :] + lat[None, :]*(v*w)[:, None]
            pp[:, 1] -= np.abs(v)*ancho[i]*0.35
            nn = np.tile(arr, (nv, 1)) + lat[None, :]*(v*0.75)[:, None]
            nn[:, 1] += 0.4
            P.append(pp); N.append(nn)
            T.append(np.full(nv, max(0.035, g)*0.85, np.float32))
            A.append(np.full(nv, 1.0, np.float32))
    return (np.concatenate(P), np.concatenate(N),
            np.concatenate(T), np.concatenate(A))

pxs, pzs = libre(None, None, int(46*DENS), 105.0, 0.9, 14.0, 0.26, sep=6.0)
PP, PN, PT, PA, PC = [], [], [], [], []
for px, pz in zip(pxs, pzs):
    base = float(_bil(GH, np.array([px], np.float32), np.array([pz], np.float32))[0]) - 0.2
    g = min(gr(float(math.hypot(px, pz))), 0.22)
    p, nn, tt, aa = palmera(px, pz, base, 5.5 + 5.5*rng.random(),
                            0.10 + 0.13*rng.random(), rng.random()*6.28, g)
    tronco = aa < 1.0
    alb = np.where(tronco[:, None], CORTEZA*aa[:, None],
                   (HOJA + (HOJA2 - HOJA)*rng.random())[None, :])
    PP.append(p); PN.append(nn); PT.append(tt); PC.append(alb)
if PP:
    PP = np.concatenate(PP); PN = np.concatenate(PN)
    PT = np.concatenate(PT); PC = np.concatenate(PC)
    sm = _bil(GS, PP[:, 0], PP[:, 2])
    superficie(PP, PN, PT, PC, sm*0.85 + 0.15, 0.78, alfa=250, grosor=0.16)
    paso("palmeras %d: %d" % (len(pxs), len(PP)))

# --------------------------------------------------- arbolitos de la costa
# A doscientos metros un árbol son cuatro manchas verdes: no hace falta tronco
# ni hojas, hace falta silueta. Sin esto la loma es un pan de pasto.
# sólo en el anillo de lomas: de cerca un manchón verde de medio metro de
# grano se ve como lo que es, un pegote, y las islas ya tienen palmeras
axs, azs = libre(None, None, int(900*DENS), 300.0, 3.0, 60.0, 0.42, sep=3.2, rmin=150.0)
if len(axs):
    TP, TN, TT, TC = [], [], [], []
    for px, pz in zip(axs, azs):
        base = float(_bil(GH, np.array([px], np.float32), np.array([pz], np.float32))[0])
        g = gr(float(math.hypot(px, pz)))
        alt = 4.5 + 5.0*rng.random(); ra = 1.6 + 1.5*rng.random()
        m = max(24, int(4*math.pi*ra*ra/max(0.05, g*g)))
        m = min(m, 900)
        u = rng.normal(size=(m, 3)).astype(np.float32)
        u /= np.maximum(1e-6, np.linalg.norm(u, axis=1))[:, None]
        u[:, 1] *= 1.25
        u = pano.normalizar(u)
        rr = ra*(0.80 + 0.28*fbm(u[:, 0]*3 + px, u[:, 2]*3 + pz, 1.0, 3, 83))
        p = np.stack([px + u[:, 0]*rr, base + alt*0.66 + u[:, 1]*rr, pz + u[:, 2]*rr], 1)
        TP.append(p); TN.append(u); TT.append(np.full(m, max(0.06, g)*1.05, np.float32))
        TC.append(np.tile(HOJA*(0.7 + 0.6*rng.random()), (m, 1)))
    TP = np.concatenate(TP); TN = np.concatenate(TN)
    TT = np.concatenate(TT); TC = np.concatenate(TC)
    superficie(TP, TN, TT, TC, _bil(GS, TP[:, 0], TP[:, 2]), 0.7, grosor=0.5)
    paso("arbolitos %d: %d" % (len(axs), len(TP)))

# ------------------------------------------------------------------- pasto
# Matas cerca del ojo nada más: a veinte metros una brizna es medio píxel.
gxs, gzs = libre(None, None, int(4200*DENS), 95.0, 0.7, 12.0, 0.26, sep=0.55)
if len(gxs):
    BP, BN, BT, BC = [], [], [], []
    for px, pz in zip(gxs, gzs):
        base = float(_bil(GH, np.array([px], np.float32), np.array([pz], np.float32))[0])
        g = max(0.022, gr(float(math.hypot(px, pz)))*0.55)
        for _ in range(rng.integers(4, 8)):
            alt = 0.16 + 0.30*rng.random()
            az = rng.random()*6.28; incl = 0.35 + 0.5*rng.random()
            nu = max(4, int(alt/g))
            u = np.linspace(0, 1, nu, dtype=np.float32)
            dx = math.sin(az)*incl*alt*u*u; dz = math.cos(az)*incl*alt*u*u
            p = np.stack([px + dx + rng.normal()*0.05,
                          base + alt*u,
                          pz + dz + rng.normal()*0.05], 1)
            nn = np.stack([np.full(nu, math.sin(az)*0.5), np.full(nu, 1.0),
                           np.full(nu, math.cos(az)*0.5)], 1)
            BP.append(p); BN.append(nn)
            BT.append(np.full(nu, g*0.85, np.float32))
            BC.append(np.tile(HOJA*(0.75 + 0.7*rng.random()), (nu, 1)))
    BP = np.concatenate(BP); BN = np.concatenate(BN)
    BT = np.concatenate(BT); BC = np.concatenate(BC)
    superficie(BP, BN, BT, BC, _bil(GS, BP[:, 0], BP[:, 2]), 0.72, grosor=0.35)
    paso("pasto %d matas: %d" % (len(gxs), len(BP)))

# ------------------------------------------------------- lo Frutiger Aero
def esfera(n, radio):
    """Puntos parejos sobre una esfera, por espiral de Fibonacci."""
    i = np.arange(n, dtype=np.float32) + 0.5
    phi = np.arccos(1 - 2*i/n)
    th = math.pi*(1 + 5**0.5)*i
    u = np.stack([np.cos(th)*np.sin(phi), np.cos(phi), np.sin(th)*np.sin(phi)], 1)
    return u.astype(np.float32)*radio, u.astype(np.float32)

OJOP = np.array([0.0, OJO, 0.0], np.float32)

# BURBUJAS. Lo que hace que una burbuja se lea como burbuja no es el color: es
# que el borde tape y el medio no. Cada gaussiana sabe cuán de canto está —el
# coseno contra el ojo— y de ahí sale la opacidad. El tornasol es interferencia
# de película delgada de verdad: el desfase depende del espesor y del ángulo,
# y por eso los anillos de color giran cuando uno se mueve.
BP, BN, BT, BC, BA = [], [], [], [], []
for k in range(int(190*DENS)):
    r = 0.055 + 0.50*rng.random()**2.2
    while True:
        px = (rng.random()*2 - 1)*95.0; pz = (rng.random()*2 - 1)*95.0
        if _bil(GH, np.array([px], np.float32), np.array([pz], np.float32))[0] < -0.3:
            break
    py = 0.10 + (0.2 + 9.0*rng.random()**1.6)
    d = math.hypot(px, pz)
    if d < 2.6: continue           # pegada al ojo tapa la pantalla entera
    # El teselado NO puede depender de la distancia al origen: este mundo se
    # camina y cualquier burbuja puede terminar a un metro de la cara. Sale del
    # radio de la burbuja y nada más, y con solape de sobra, porque una esfera
    # transparente con poco solape se lee como una malla mosquitera.
    m = int(np.clip(round(1100*(r/0.35)), 220, 1600))
    p, nn = esfera(m, r)
    # UNA BURBUJA ES TRANSPARENTE A PROPÓSITO, y ahí está la trampa: con poca
    # opacidad por gaussiana, los huecos entre una y otra se ven como una
    # rejilla gris —el fondo pasando por el medio—. El tamaño tiene que salir
    # del paso REAL sobre la esfera y con solape de sobra, no del grano de
    # lejos, o de cerca la burbuja se lee como una malla mosquitera.
    g = 0.85*math.sqrt(4*math.pi*r*r/m)
    p = p + np.array([px, py, pz], np.float32)
    v = pano.normalizar(p - OJOP)
    cos = np.abs((nn*v).sum(1))
    esp = 320.0 + 520.0*fbm(nn[:, 0]*2 + k, nn[:, 2]*2, 1.0, 3, 97)   # nm
    ct = np.sqrt(np.maximum(0.02, 1 - (1 - cos*cos)/(1.33*1.33)))
    fase = 4*math.pi*1.33*esp[:, None]*ct[:, None]/np.array([[620.0, 545.0, 460.0]], np.float32)
    tor = 0.5 + 0.5*np.cos(fase)
    refl = v - 2*(v*nn).sum(1)[:, None]*nn
    col = ent.env(refl)*(0.55 + 0.75*tor) + ent.irradiancia(nn)*0.35*tor
    BP.append(p); BN.append(nn); BT.append(np.full(m, g, np.float32))
    BC.append(pano.tono(col, EXPO))
    BA.append(np.clip(28 + 215*(1 - cos)**2.6, 16, 240).astype(np.uint8))
BP = np.concatenate(BP); BN = np.concatenate(BN); BT = np.concatenate(BT)
ex, ey, no = pano.marco(BN)
soltar(BP, ex, ey, no, np.stack([BT, BT, np.maximum(0.005, 0.25*BT)], 1),
       np.concatenate(BC), np.concatenate(BA))
paso("burbujas: %d" % len(BP))

# CROMADOS. Espejos: el color es el panorama reflejado y nada más. Es el objeto
# que más delata si la iluminación miente, porque no tiene albedo donde
# esconderse.
CP, CN, CT, CC = [], [], [], []
for k in range(max(4, int(14*DENS))):
    r = 0.55 + 1.5*rng.random()
    while True:
        px = (rng.random()*2 - 1)*70.0; pz = (rng.random()*2 - 1)*70.0
        if _bil(GH, np.array([px], np.float32), np.array([pz], np.float32))[0] < -0.4:
            break
    py = r + 0.6 + 4.0*rng.random()
    m = int(np.clip(round(2600*(r/1.2)), 1400, 9000))
    g = 0.80*math.sqrt(4*math.pi*r*r/m)
    p, nn = esfera(m, r)
    # un poco de blob, que la esfera perfecta se lee como bola de billar
    w = 1 + 0.11*np.sin(nn[:, 0]*5.1 + k) + 0.09*np.sin(nn[:, 1]*4.3 - k)
    p = p*w[:, None] + np.array([px, py, pz], np.float32)
    nn = pano.normalizar(nn + 0.10*np.stack([np.cos(nn[:, 1]*4.3), np.zeros(m, np.float32),
                                             np.sin(nn[:, 0]*5.1)], 1))
    v = pano.normalizar(p - OJOP)
    refl = v - 2*(v*nn).sum(1)[:, None]*nn
    cos = np.maximum(0.02, -(v*nn).sum(1))
    F = 0.62 + 0.38*(1 - cos)**5
    col = ent.env(refl)*F[:, None]*np.array([0.94, 0.97, 1.0], np.float32)
    col += SOL_C*np.power(np.maximum(0, (refl*SOL_D).sum(1)), 420.0)[:, None]*1.6
    CP.append(p); CN.append(nn); CT.append(np.full(m, g, np.float32))
    CC.append(pano.tono(col, EXPO))
CP = np.concatenate(CP); CN = np.concatenate(CN); CT = np.concatenate(CT)
ex, ey, no = pano.marco(CN)
soltar(CP, ex, ey, no, np.stack([CT, CT, np.maximum(0.006, 0.2*CT)], 1),
       np.concatenate(CC), 250)
paso("cromados: %d" % len(CP))

# VIDRIOS AERO: paneles parados, translúcidos, con el borde encendido.
VP, VN, VT, VC, VA = [], [], [], [], []
for k in range(max(4, int(11*DENS))):
    while True:
        px = (rng.random()*2 - 1)*80.0; pz = (rng.random()*2 - 1)*80.0
        if _bil(GH, np.array([px], np.float32), np.array([pz], np.float32))[0] < -0.4:
            break
    an = 1.1 + 2.2*rng.random(); al = 1.4 + 2.6*rng.random()
    y0 = 0.25 + 1.2*rng.random()
    gi = rng.random()*6.28
    g = max(0.025, gr(math.hypot(px, pz))*0.75)
    nu = max(6, int(an/g)); nv = max(6, int(al/g))
    uu, vv = np.meshgrid((np.arange(nu)+0.5)/nu*2-1, (np.arange(nv)+0.5)/nv*2-1)
    uu = uu.ravel(); vv = vv.ravel()
    # esquinas redondeadas: lo que sale del rectángulo con radio se cae
    q = np.maximum(0, np.abs(uu) - 0.72)**2 + np.maximum(0, np.abs(vv) - 0.72)**2
    vive = q < 0.078
    uu, vv = uu[vive], vv[vive]
    ejex = np.array([math.cos(gi), 0.0, -math.sin(gi)], np.float32)
    nor = np.array([math.sin(gi), 0.0, math.cos(gi)], np.float32)
    p = (np.array([px, y0 + al/2, pz], np.float32)[None, :]
         + ejex[None, :]*(uu*an/2)[:, None]
         + np.array([0.0, 1.0, 0.0], np.float32)[None, :]*(vv*al/2)[:, None])
    m = len(uu)
    nn = np.tile(nor, (m, 1))
    v = pano.normalizar(p - OJOP)
    nn = nn*np.sign(-(v*nn).sum(1))[:, None]
    refl = v - 2*(v*nn).sum(1)[:, None]*nn
    cos = np.maximum(0.02, -(v*nn).sum(1))
    F = 0.05 + 0.95*(1 - cos)**5
    borde = np.clip((np.maximum(np.abs(uu), np.abs(vv)) - 0.80)/0.20, 0, 1)
    tinte = np.array([0.62, 0.90, 1.0], np.float32)
    col = ent.env(refl)*F[:, None] + tinte*ent.irradiancia(nn)*0.55
    col += tinte*borde[:, None]*1.6
    VP.append(p); VN.append(nn); VT.append(np.full(m, g*0.95, np.float32))
    VC.append(pano.tono(col, EXPO))
    VA.append(np.clip(70 + 150*F + 120*borde, 40, 245).astype(np.uint8))
VP = np.concatenate(VP); VN = np.concatenate(VN); VT = np.concatenate(VT)
ex, ey, no = pano.marco(VN)
soltar(VP, ex, ey, no, np.stack([VT, VT, np.maximum(0.005, 0.12*VT)], 1),
       np.concatenate(VC), np.concatenate(VA))
paso("vidrios: %d" % len(VP))

# ============================================================== el cielo
# El panorama de la mitad de arriba, en una cúpula lejos de todo. Las lomas
# pintadas del panorama quedan detrás de las lomas de verdad, que es
# exactamente donde tienen que estar: son el fondo, no la escena.
def cupula(radio, stride):
    im = ent.srgb
    Hp, Wp, _ = im.shape
    filas = np.arange(0, int(Hp*0.502), stride)
    xs, cs, ss = [], [], []
    dph = math.pi/Hp*stride
    for j in filas:
        ph = math.pi/2 - (j + 0.5)/Hp*math.pi
        cph = max(1e-3, math.cos(ph))
        m = max(6, int(round(2*math.pi*cph/dph)))
        # LA FASE DE CADA FILA VA AL AZAR, y no es un detalle: con todas las
        # filas arrancando en el mismo ángulo, la cantidad de columnas cambia
        # de a poco de una fila a la otra y aparecen sectores donde las
        # gaussianas de filas vecinas se apilan justo encima. Entre apilamiento
        # y apilamiento queda hueco, y el cielo sale con un abanico de rejilla
        # que sale del cenit. Es un batido de dos grillas casi iguales.
        th = (np.arange(m) + rng.random())/m*2*math.pi
        d = np.stack([cph*np.sin(th), np.full(m, math.sin(ph)), cph*np.cos(th)], 1)
        xs.append(d.astype(np.float32))
        u = (th/(2*math.pi)*Wp).astype(np.int64) % Wp
        cs.append(im[min(j, Hp-1), u])
        ss.append(np.full(m, radio*dph, np.float32))
    d = np.concatenate(xs); c = np.concatenate(cs); s = np.concatenate(ss)
    pos = d*radio; pos[:, 1] += OJO
    ex, ey, no = pano.marco(d)
    esc = np.stack([1.35*s, 1.35*s, np.maximum(0.05, 0.05*s)], 1)
    return pos, ex, ey, no, esc, c

pc, ex, ey, no, esc, cc = cupula(DOMO, int(opc("--cielo", 2)))
soltar(pc, ex, ey, no, esc, cc, 252)
paso("cúpula: %d" % len(pc))

# ============================================================== escribir
POS = np.concatenate(POS); EX = np.concatenate(EX); EY = np.concatenate(EY)
NOR = np.concatenate(NOR); ESC = np.concatenate(ESC); COL = np.concatenate(COL)
ALF = np.concatenate(ALF)
n = pano.escribir(SAL, POS, EX, EY, NOR, ESC, COL, ALF)
print("MUNDO: %s · %d gaussianas · %.1f MB · %.1f s" % (
      SAL, n, os.path.getsize(SAL)/1048576, time.time()-t0))
