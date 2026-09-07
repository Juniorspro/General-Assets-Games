"""Proyecta las fotos de Cycles sobre las gaussianas. Versión fotorrealista.

Es lo que hace un splat entrenado para el color: mira dónde cayó cada gaussiana
en cada foto y promedia lo que las cámaras vieron ahí. La diferencia con un
entrenamiento de verdad es que ahí las gaussianas además se mueven, escalan y
rotan por descenso de gradiente; acá la forma sale de la geometría y sólo el
color viene de las fotos. El resultado hereda todo lo que calculó el trazador
de caminos: sombras suaves, oclusión en los patios, rebote del asfalto, cielo
en las fachadas.

Contra la versión anterior cambian cinco cosas, y son las que sacan el aspecto
de plastilina:

  1. Densidad y tamaño por cara, no globales. El paso de muestreo de cada cara
     sale de su material, así que la calle gasta pocas gaussianas grandes y las
     fachadas muchas chicas.
  2. Gaussianas alargadas en las piezas finas. Un parteluz de 15 cm no se
     representa con un disco de 1,3 m: se representa con una elipse fina y
     larga alineada con la pieza.
  3. El color de cada gaussiana se promedia sobre un vecindario de 3x3 píxeles
     con la profundidad de acuerdo. Son nueve muestras independientes del
     trazador, así que el ruido baja como si hubiera nueve veces más muestras.
  4. Cada cámara pesa por el coseno de incidencia, y una gaussiana que sólo se
     vio de canto se descarta. Ahí estaba el moteado blanco de los bordes.
  5. Curva filmica antes de pasar a sRGB. La toma es lineal, y el hormigón al
     sol se iba a 1,0 recortado: de ahí el lavado.

Corre dentro de Blender porque así lee los EXR y la escena sin intermediarios.
"""
import bpy, json, math, os, sys
import numpy as np

CARPETA = sys.argv[sys.argv.index("--fotos")+1] if "--fotos" in sys.argv else "/home/neko/foto3"
SALIDA  = sys.argv[sys.argv.index("--salida")+1] if "--salida" in sys.argv else "/home/neko/ciudad-foto3.splat"
CHICO   = sys.argv[sys.argv.index("--chico")+1] if "--chico" in sys.argv else ""
TOTAL   = int(sys.argv[sys.argv.index("--total")+1]) if "--total" in sys.argv else 1250000
NCHICO  = int(sys.argv[sys.argv.index("--nchico")+1]) if "--nchico" in sys.argv else 330000
CAJA    = float(sys.argv[sys.argv.index("--caja")+1]) if "--caja" in sys.argv else 285.0
# El piso se recorta más lejos que el resto: si el plano termina donde termina
# la ciudad, la nube flota como una maqueta en el aire. La franja de más
# aparece sólo donde alguna cámara aérea la vio.
SUELO = {"hormigon_oscuro", "calle", "vereda", "raya", "hormigon"}
APRON = float(sys.argv[sys.argv.index("--apron")+1]) if "--apron" in sys.argv else 372.0
# el recorte puede no estar en el origen: centrado en un cruce se ven las
# cuatro ochavas, centrado en una manzana se ve una manzana y cuatro medias
CENTRO = [float(v) for v in sys.argv[sys.argv.index("--centro")+1].split(",")] if "--centro" in sys.argv else [0.0, 0.0]
EXPO    = float(sys.argv[sys.argv.index("--expo")+1]) if "--expo" in sys.argv else 0.95

# materiales que no entran: el telón de fondo de 3000 m
EXCLUIR = {"lejos"}
# caras cuyas tapas horizontales están tapadas por la caja de al lado
SIN_TAPAS = {"antepecho", "interior", "vidrio", "aluminio", "panel", "aluminio_oscuro"}
FOLLAJE = {"hoja", "hoja_clara", "hoja_oscura"}
# Los emisores están calibrados para que se vean de noche, y de día la toma
# lineal los manda muy arriba de 1: sin esto, cada farol es una bola blanca.
ATENUAR = {"luz":0.10, "sem_rojo":0.26, "sem_verde":0.26,
           "cartel_a":0.42, "cartel_b":0.42, "cartel_c":0.42, "interior":0.80}
# multiplicador de densidad: cuántas gaussianas por metro cuadrado se lleva
# cada material respecto del promedio. El paso de muestreo va con 1/raíz.
PESO = {
    "hormigon":1.05, "hormigon_oscuro":0.32, "aluminio":1.35, "aluminio_oscuro":1.25,
    "antepecho":1.45, "panel":1.05, "ladrillo":1.15, "ladrillo_oscuro":1.15,
    "vidrio":1.30, "interior":0.70, "calle":0.30, "vereda":0.42, "raya":1.30,
    "luz":1.70, "negro":1.10, "pintura":1.25, "rojo":1.25, "tronco":1.25,
    "hoja":2.30, "hoja_clara":2.30, "hoja_oscura":2.30,
    "toldo_a":1.45, "toldo_b":1.45, "toldo_c":1.45, "toldo_d":1.45,
    "cartel_a":1.55, "cartel_b":1.55, "cartel_c":1.55,
    "sem_rojo":1.70, "sem_verde":1.70,
}

# ---------------------------------------------------- triángulos de la escena
tri, pesos, foll, aten, lims = [], [], [], [], []
areas_mat = {}
for ob in bpy.data.objects:
    if ob.type != "MESH": continue
    me = ob.data
    nombre = me.materials[0].name if me.materials else "?"
    if nombre in EXCLUIR: continue
    me.calc_loop_triangles()
    V = np.empty((len(me.vertices), 3), np.float64)
    me.vertices.foreach_get("co", V.ravel())
    V = (np.array(ob.matrix_world) @ np.c_[V, np.ones(len(V))].T).T[:, :3]
    T = np.empty((len(me.loop_triangles), 3), np.int32)
    me.loop_triangles.foreach_get("vertices", T.ravel())
    P = np.stack([V[T[:,0]], V[T[:,1]], V[T[:,2]]], 1)          # (M,3,3)

    # Subdividir lo grande: el piso del distrito son dos triángulos de 288.000
    # m2 y un recorte por centroide no los puede tratar. Cuatro hijos por
    # vuelta hasta que ninguno pase de 12 m de lado.
    for _ in range(9):
        ar = 0.5*np.linalg.norm(np.cross(P[:,1]-P[:,0], P[:,2]-P[:,0]), axis=1)
        gordo = ar > 144.0
        if not gordo.any(): break
        G, R = P[gordo], P[~gordo]
        a, b, c = G[:,0], G[:,1], G[:,2]
        ab, bc, ca = (a+b)/2, (b+c)/2, (c+a)/2
        P = np.concatenate([R,
            np.stack([a, ab, ca], 1), np.stack([b, bc, ab], 1),
            np.stack([c, ca, bc], 1), np.stack([ab, bc, ca], 1)])

    cruz = np.cross(P[:,1]-P[:,0], P[:,2]-P[:,0])
    lar = np.linalg.norm(cruz, axis=1)
    area = 0.5*lar
    nor = cruz / np.maximum(1e-12, lar)[:, None]
    vivas = area > 1e-7
    # lo que mira para abajo a ras del piso no lo ve nadie: es la cara de
    # abajo de la losa, del cordón y de las rayas
    vivas &= ~((nor[:,2] < -0.7) & (P[:,:,2].mean(1) < 0.6))
    if nombre in SIN_TAPAS:
        vivas &= np.abs(nor[:,2]) < 0.72           # en Blender el alto es Z
    ctr = P.mean(1)
    lim = max(CAJA, APRON) if nombre in SUELO else CAJA
    vivas &= (np.abs(ctr[:,0]-CENTRO[0]) <= lim+18) & (np.abs(ctr[:,1]-CENTRO[1]) <= lim+18)
    if not vivas.any(): continue
    tri.append(P[vivas])
    pesos.append(np.full(int(vivas.sum()), PESO.get(nombre, 1.0)))
    foll.append(np.full(int(vivas.sum()), nombre in FOLLAJE))
    aten.append(np.full(int(vivas.sum()), ATENUAR.get(nombre, 1.0)))
    lims.append(np.full(int(vivas.sum()), lim))
    areas_mat[nombre] = areas_mat.get(nombre, 0.0) + float(area[vivas].sum())

P = np.concatenate(tri)
W = np.concatenate(pesos)
FO = np.concatenate(foll)
AT = np.concatenate(aten)
LIM = np.concatenate(lims)
cruz = np.cross(P[:,1]-P[:,0], P[:,2]-P[:,0])
lar = np.linalg.norm(cruz, axis=1)
A = 0.5*lar
NOR = cruz / np.maximum(1e-12, lar)[:, None]
print("SPLAT: %d triángulos · %.0f m²" % (len(P), A.sum()), flush=True)
for k in sorted(areas_mat, key=lambda z: -areas_mat[z]):
    print("SPLAT:   %-18s %10.0f m²  x%.2f" % (k, areas_mat[k], PESO.get(k,1.0)), flush=True)

# ---------------------------------------------------- paso y ejes de cada cara
# el lado más largo y la altura mínima: con eso se sabe si la cara es fina y
# hacia dónde es fina
E = np.stack([P[:,1]-P[:,0], P[:,2]-P[:,1], P[:,0]-P[:,2]], 1)
LE = np.linalg.norm(E, axis=2)
imax = np.argmax(LE, axis=1)
fila = np.arange(len(P))
elong = E[fila, imax] / np.maximum(1e-12, LE[fila, imax])[:, None]
alt = 2*A / np.maximum(1e-9, LE[fila, imax])            # altura mínima

# Las caras finas necesitan más densidad de la que les da el área. Un parteluz
# de 15 cm por 130 m tiene 19 m2: con densidad de superficie le caen 47
# muestras, o sea una cada 2,8 m, y para tapar el hueco la gaussiana sale de
# 0,17 x 1,4 m, que en pantalla es un chorreado vertical de 5 m. Lo que hay que
# igualar en una cara fina es el paso A LO LARGO, no el área, así que se le
# sube la densidad por pas/alto. Una iteración alcanza.
s0 = math.sqrt(float((A*W).sum()) / TOTAL)
refuerzo = np.clip((s0/np.sqrt(W)) / np.maximum(0.06, alt), 1.0, 2.5)
W = W * refuerzo
s0 = math.sqrt(float((A*W).sum()) / TOTAL)
paso = s0 / np.sqrt(W)                                   # paso de muestreo
print("SPLAT: paso base %.2f m (de %.2f a %.2f según material) · refuerzo hasta x%.1f" % (
      s0, paso.min(), paso.max(), refuerzo.max()), flush=True)

# ---------------------------------------------------- muestreo
rng = np.random.default_rng(20260908)
pond = A*W
prob = np.cumsum(pond); prob /= prob[-1]
NM = int(TOTAL*1.30)
cara = np.searchsorted(prob, rng.random(NM))
r1, r2 = rng.random(NM), rng.random(NM)
s = np.sqrt(r1)
# de a un vértice: con los tres a la vez son tres arreglos de (NM,3) vivos al
# mismo tiempo, y a nueve millones de muestras eso es casi un giga de más
pos = P[cara,0] * (1-s)[:,None]
pos += P[cara,1] * (s*(1-r2))[:,None]
pos += P[cara,2] * (s*r2)[:,None]
del r1, r2, s
lc = LIM[cara]
dentro_caja = (np.abs(pos[:,0]-CENTRO[0]) <= lc) & (np.abs(pos[:,1]-CENTRO[1]) <= lc)
pos, cara = pos[dentro_caja], cara[dentro_caja]
nor, pas = NOR[cara], paso[cara]
NM = len(pos)
print("SPLAT: %d muestras" % NM, flush=True)

# ---------------------------------------------------- fotos
datos = json.load(open(CARPETA + "/camaras.json"))
PX = datos["px"]; f_px = datos["lente"] / datos["sensor"] * PX
vistas = datos["vistas"]
print("SPLAT: %d tomas de %dpx, focal %.1f px" % (len(vistas), PX, f_px), flush=True)

def leer(ruta, canales):
    im = bpy.data.images.load(ruta, check_existing=False)
    w, h = im.size
    px = np.empty(w*h*4, np.float32)
    im.pixels.foreach_get(px)
    bpy.data.images.remove(im)
    return px.reshape(h, w, 4)[::-1, :, :canales]   # Blender entrega de abajo a arriba

suma = np.zeros((NM, 3), np.float32)
peso = np.zeros(NM, np.float32)
ncam = np.zeros(NM, np.int32)
usadas = 0
# Las homogéneas se arman una vez y en float32: adentro del lazo eran 374 MB
# por toma, y para proyectar sobran seis dígitos (a 400 m del centro el error
# es de 4 centésimas de milímetro).
POSH = np.empty((NM, 4), np.float32)
POSH[:, :3] = pos; POSH[:, 3] = 1.0
POS32 = POSH[:, :3]
NOR32 = nor.astype(np.float32)

for k, v in enumerate(vistas):
    fc = "%s/color%04d.exr" % (CARPETA, v["i"])
    fz = "%s/z%04d.exr" % (CARPETA, v["i"])
    if not (os.path.exists(fc) and os.path.exists(fz)): continue
    col = leer(fc, 3)
    prof = leer(fz, 1)[:, :, 0]
    usadas += 1

    M = np.array(v["M"], dtype=np.float64)
    inv = np.linalg.inv(M)[:3].astype(np.float32)    # sólo las tres filas útiles
    pc = POSH @ inv.T                                # a coordenadas de cámara
    z = -pc[:, 2]
    delante = z > 0.4
    xp = np.where(delante, pc[:,0]/np.maximum(1e-6, z)*f_px + PX/2, -1)
    yp = np.where(delante, PX/2 - pc[:,1]/np.maximum(1e-6, z)*f_px, -1)
    # un píxel de margen, que el vecindario de 3x3 no se salga del cuadro
    est = delante & (xp >= 1) & (xp < PX-1) & (yp >= 1) & (yp < PX-1)
    if not est.any(): continue

    # Coseno de incidencia: de canto no se cree nada. Por contracción y no
    # normalizando el vector a la cámara, que a nueve millones son 280 MB.
    ojo = M[:3, 3].astype(np.float32)
    cosi = (NOR32 @ ojo) - np.einsum("ij,ij->i", NOR32, POS32)
    cosi /= np.maximum(1e-6, np.sqrt(np.einsum("ij,ij->i", pc, pc)))
    est &= cosi > 0.09
    if not est.any(): continue

    idx0 = np.flatnonzero(est)
    ix = xp[est].astype(np.int32); iy = yp[est].astype(np.int32)
    zt = z[est]
    # El pase Z de Cycles es la distancia AL PLANO de la cámara, no radial:
    # medido, la mediana del residuo daba 4,3 contra 40,4.
    tol = np.maximum(0.30, zt*0.010) + pas[est]*0.60
    acum = np.zeros((len(idx0), 3), np.float32)
    tap = np.zeros(len(idx0), np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            jx = ix + dx; jy = iy + dy
            de_acuerdo = np.abs(zt - prof[jy, jx]) < tol
            acum[de_acuerdo] += col[jy[de_acuerdo], jx[de_acuerdo]]
            tap[de_acuerdo] += 1
    visto = tap >= 3.0                  # al menos tres de nueve: filtra el canto
    if not visto.any(): continue
    j = idx0[visto]
    w = (cosi[j] * (tap[visto]/9.0)).astype(np.float32)
    suma[j] += acum[visto] / tap[visto][:, None] * w[:, None]
    peso[j] += w
    ncam[j] += 1
    if (k+1) % 20 == 0:
        print("SPLAT: %d/%d tomas · con color %d%%" % (
              k+1, len(vistas), 100*np.count_nonzero(peso)//NM), flush=True)

# dos cámaras o más, o una sola pero bien de frente: cortando en dos quedaban
# huecos en los rincones que sólo ve una cámara
ok = ((ncam >= 2) & (peso > 0.10)) | ((ncam == 1) & (peso > 0.55))
print("SPLAT: %d tomas leídas · %d de %d muestras con color (%.1f%%) · %.2f cámaras de media" % (
      usadas, ok.sum(), NM, 100*ok.mean(), ncam[ok].mean()), flush=True)

del POSH, POS32, NOR32
pos = pos[ok].astype(np.float32); nor = nor[ok].astype(np.float32)
cara, pas = cara[ok], pas[ok].astype(np.float32)
rgb_lin = suma[ok] / peso[ok][:, None]
n = len(pos)

# ---------------------------------------------------- color
# curva filmica y después sRGB. La toma es lineal: sin curva, el hormigón al
# sol recorta en 1,0 y todo el frente sale blanco lavado.
x = np.maximum(0.0, rgb_lin * np.float32(EXPO) * AT[cara].astype(np.float32)[:, None])
x = (x*(2.51*x + 0.03)) / (x*(2.43*x + 0.59) + 0.14)
x = np.clip(x, 0, 1)
rgb = np.where(x <= 0.0031308, x*12.92, 1.055*np.power(np.maximum(x, 1e-8), 1/2.4) - 0.055)
rgb = np.clip(rgb, 0, 1)

# ---------------------------------------------------- forma
# ex hacia lo fino de la cara, ey a lo largo: así una pieza fina se representa
# con una elipse fina y larga en vez de un disco que la desborda
el = elong[cara].astype(np.float32)
ex = np.cross(nor, el)
ex /= np.maximum(1e-9, np.linalg.norm(ex, axis=1))[:, None]
ey = np.cross(nor, ex)
ey /= np.maximum(1e-9, np.linalg.norm(ey, axis=1))[:, None]

# ninguna gaussiana más ancha que la altura de su cara ni más larga que su
# lado mayor: sin el segundo tope, el farol de 2 m salía como una raya de 4,6
fino = np.minimum(pas, np.maximum(0.045, alt[cara].astype(np.float32)*1.15))
largo = np.minimum(np.minimum(pas*pas/np.maximum(0.045, fino), fino*3.2),
                   LE[fila, imax][cara].astype(np.float32)*0.55)
largo = np.maximum(largo, fino)
esf = FO[cara]
corto = 0.62*fino * rng.uniform(0.88, 1.14, n).astype(np.float32)
lrg   = 0.62*largo * rng.uniform(0.88, 1.14, n).astype(np.float32)
grueso = np.where(esf, 0.42*pas, np.maximum(0.014, 0.085*pas))
esc = np.stack([corto, lrg, grueso], 1).astype(np.float32)
alfa = np.where(esf, 0.72, 0.95).astype(np.float32)

# a ejes del visor: Y arriba, y Z invertido respecto de Blender
def aY(v): return np.stack([v[:,0], v[:,2], -v[:,1]], 1)
posY, exY, eyY, norY = aY(pos), aY(ex), aY(ey), aY(nor)

Mrot = np.stack([exY, eyY, norY], axis=2).astype(np.float32)
tr = Mrot[:,0,0] + Mrot[:,1,1] + Mrot[:,2,2]
q = np.empty((n,4), np.float32)     # se cuantiza a un byte, no hace falta más
k0 = tr > 0
S = np.sqrt(np.maximum(1e-12, tr[k0]+1.0))*2
q[k0,0] = 0.25*S
q[k0,1] = (Mrot[k0,2,1]-Mrot[k0,1,2])/S
q[k0,2] = (Mrot[k0,0,2]-Mrot[k0,2,0])/S
q[k0,3] = (Mrot[k0,1,0]-Mrot[k0,0,1])/S
resto = ~k0
if resto.any():
    Mr = Mrot[resto]; nr = Mr.shape[0]; qq = np.empty((nr,4), np.float32)
    d0,d1,d2 = Mr[:,0,0], Mr[:,1,1], Mr[:,2,2]
    c1 = (d0>d1)&(d0>d2); c2 = (~c1)&(d1>d2); c3 = ~(c1|c2)
    for sel,(i,j,kk) in ((c1,(0,1,2)),(c2,(1,2,0)),(c3,(2,0,1))):
        if not sel.any(): continue
        Ms = Mr[sel]
        S = np.sqrt(np.maximum(1e-12, 1.0+Ms[:,i,i]-Ms[:,j,j]-Ms[:,kk,kk]))*2
        qq[sel,0] = (Ms[:,kk,j]-Ms[:,j,kk])/S
        qq[sel,1+i] = 0.25*S
        qq[sel,1+j] = (Ms[:,j,i]+Ms[:,i,j])/S
        qq[sel,1+kk] = (Ms[:,kk,i]+Ms[:,i,kk])/S
    q[resto] = qq
q /= np.maximum(1e-9, np.linalg.norm(q, axis=1))[:,None]

def escribir(ruta, sel, k=1.0):
    m = int(sel.sum()) if sel.dtype == bool else len(sel)
    f = np.zeros((m,8), np.float32)
    f[:,0:3] = posY[sel]
    # k sólo a los dos ejes del plano: el tercero es el grosor contra la
    # normal, y engordarlo levanta la gaussiana de la superficie
    f[:,3:6] = esc[sel] * np.array([k, k, 1.0])
    by = np.zeros((m,8), np.uint8)
    by[:,0:3] = np.round(rgb[sel]*255); by[:,3] = np.round(alfa[sel]*255)
    by[:,4:8] = np.clip(np.round(q[sel]*128+128), 0, 255)
    crudo = np.empty((m,32), np.uint8)
    crudo[:,0:24] = f[:,0:6].copy().view(np.uint8).reshape(m,24)
    crudo[:,24:32] = by[:,0:8]
    open(ruta, "wb").write(crudo.tobytes())
    print("SPLAT: %s · %d gaussianas · %.2f MB · paso x%.2f" % (
          ruta, m, os.path.getsize(ruta)/1048576, k), flush=True)

escribir(SALIDA, np.ones(n, bool))
if CHICO and NCHICO < n:
    # el mismo nube, más rala: al sacar gaussianas hay que agrandarlas para
    # que no queden agujeros, y el factor es la raíz de la razón
    sub = rng.choice(n, NCHICO, replace=False)
    escribir(CHICO, sub, k=math.sqrt(n/NCHICO))
