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
PISO_PLANO = {"hormigon_oscuro", "calle", "vereda", "raya",
              "agua", "arena", "madera"}   # lo que se pisa
APRON = float(sys.argv[sys.argv.index("--apron")+1]) if "--apron" in sys.argv else 372.0
# el recorte puede no estar en el origen: centrado en un cruce se ven las
# cuatro ochavas, centrado en una manzana se ve una manzana y cuatro medias
CENTRO = [float(v) for v in sys.argv[sys.argv.index("--centro")+1].split(",")] if "--centro" in sys.argv else [0.0, 0.0]
EXPO    = float(sys.argv[sys.argv.index("--expo")+1]) if "--expo" in sys.argv else 0.95
# Para caminar por adentro, el piso es lo que más se mira y lo que peor sale:
# un disco apoyado en el asfalto, visto de canto desde 1,68 m, colapsa a una
# raya y entre disco y disco queda hueco. --pisos le sube la densidad y
# --grosor los engorda contra la normal para que no colapsen.
PISOS   = float(sys.argv[sys.argv.index("--pisos")+1]) if "--pisos" in sys.argv else 1.0
GROSOR  = float(sys.argv[sys.argv.index("--grosor")+1]) if "--grosor" in sys.argv else 0.085

# materiales que no entran: el telón de fondo de 3000 m
EXCLUIR = {"lejos", "fondo"}   # telón y silueta lejana
# caras cuyas tapas horizontales están tapadas por la caja de al lado
SIN_TAPAS = {"antepecho", "interior", "vidrio", "aluminio", "panel", "aluminio_oscuro"}
FOLLAJE = {"hoja", "hoja_clara", "hoja_oscura", "hoja_trop", "pasto_carta"}
# Las cartas de follaje son de una sola cara y la normal apunta para un lado
# nomás: con el coseno con signo se perdía la mitad de las hojas. Acá se usa el
# valor absoluto, que para una carta es lo correcto.
DOSCARAS = {"hoja", "hoja_clara", "hoja_oscura", "persiana", "raya",
            "hoja_trop", "pasto_carta", "vidrio_aero"}
# Los emisores están calibrados para que se vean de noche, y de día la toma
# lineal los manda muy arriba de 1: sin esto, cada farol es una bola blanca.
ATENUAR = {"luz":0.10, "sem_rojo":0.26, "sem_verde":0.26,
           "cartel_a":0.42, "cartel_b":0.42, "cartel_c":0.42, "interior":0.80}
# multiplicador de densidad: cuántas gaussianas por metro cuadrado se lleva
# cada material respecto del promedio. El paso de muestreo va con 1/raíz.
PESO = {
    # el mundo Frutiger Aero
    "agua":0.45, "arena":0.30, "pasto":1.10, "roca":1.10, "madera":1.30,
    "burbuja":1.50, "cromo":1.40, "vidrio_aero":1.20, "blanco":1.20,
    "flor":1.90, "nenufar":1.50, "tronco_p":1.30,
    "hoja_trop":2.30, "pasto_carta":2.20,
    # la ciudad
    "gris":1.30, "persiana":1.10, "piel":1.30, "fondo":0.0,
    "interior_b":0.70, "interior_c":0.70, "interior_d":0.70, "interior_e":0.70,
    "ropa_a":1.30, "ropa_b":1.30, "ropa_c":1.30, "ropa_d":1.30, "ropa_e":1.30,
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
tri, pesos, foll, aten, lims, dobles = [], [], [], [], [], []
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
    pesos.append(np.full(int(vivas.sum()),
                         PESO.get(nombre, 1.0) * (PISOS if nombre in PISO_PLANO else 1.0)))
    foll.append(np.full(int(vivas.sum()), nombre in FOLLAJE))
    aten.append(np.full(int(vivas.sum()), ATENUAR.get(nombre, 1.0)))
    lims.append(np.full(int(vivas.sum()), lim))
    dobles.append(np.full(int(vivas.sum()), nombre in DOSCARAS))
    areas_mat[nombre] = areas_mat.get(nombre, 0.0) + float(area[vivas].sum())

P = np.concatenate(tri)
W = np.concatenate(pesos)
FO = np.concatenate(foll)
AT = np.concatenate(aten)
LIM = np.concatenate(lims)
DOS = np.concatenate(dobles)
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

# ---------------------------------------------------- helpers de empaquetado
def cuaternion(Mrot):
    """Cuaternión desde una matriz de rotación, por lotes. Se cuantiza a un
    byte por componente, así que float32 sobra."""
    n = Mrot.shape[0]
    tr = Mrot[:,0,0] + Mrot[:,1,1] + Mrot[:,2,2]
    q = np.empty((n,4), np.float32)
    k0 = tr > 0
    if k0.any():
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
    return q

def empaquetar(f, posY, esc, rgb, alfa, q, sel, k):
    """Escribe los 32 bytes por gaussiana del formato .splat.

    k escala sólo los dos ejes del plano: el tercero es el grosor contra la
    normal, y engordarlo levanta la gaussiana de la superficie.
    """
    m = int(sel.sum())
    if m == 0: return 0
    fl = np.zeros((m,8), np.float32)
    fl[:,0:3] = posY[sel]
    fl[:,3:6] = esc[sel] * np.array([k, k, 1.0], np.float32)
    by = np.zeros((m,8), np.uint8)
    by[:,0:3] = np.round(rgb[sel]*255)
    by[:,3] = np.round(alfa[sel]*255)
    by[:,4:8] = np.clip(np.round(q[sel]*128+128), 0, 255)
    crudo = np.empty((m,32), np.uint8)
    crudo[:,0:24] = fl[:,0:6].copy().view(np.uint8).reshape(m,24)
    crudo[:,24:32] = by[:,0:8]
    f.write(crudo.tobytes())
    return m

# ---------------------------------------------------- fotos, todas en RAM
# A 44 millones de muestras no entra nada si se guarda un arreglo por muestra
# para las 184 tomas. Se da vuelta el problema: las fotos entran en RAM (184
# tomas de 640 px en medias son 736 MB) y las muestras se procesan por bloques,
# cada bloque contra las 184. De paso cada EXR se lee una sola vez y no una por
# corrida de bloque.
datos = json.load(open(CARPETA + "/camaras.json"))
PX = datos["px"]; f_px = datos["lente"] / datos["sensor"] * PX
vistas = datos["vistas"]

def leer(ruta, canales):
    im = bpy.data.images.load(ruta, check_existing=False)
    w, h = im.size
    px = np.empty(w*h*4, np.float32)
    im.pixels.foreach_get(px)
    bpy.data.images.remove(im)
    return px.reshape(h, w, 4)[::-1, :, :canales]   # Blender entrega de abajo a arriba

fotos = []
for v in vistas:
    fc = "%s/color%04d.exr" % (CARPETA, v["i"])
    fz = "%s/z%04d.exr" % (CARPETA, v["i"])
    if not (os.path.exists(fc) and os.path.exists(fz)): continue
    M = np.array(v["M"], dtype=np.float64)
    fotos.append((np.linalg.inv(M)[:3].astype(np.float32),   # mundo -> cámara
                  M[:3, 3].astype(np.float32),               # el ojo
                  leer(fc, 3).astype(np.float16),            # color
                  leer(fz, 1)[:, :, 0]))                     # profundidad
mem = sum(c.nbytes + p.nbytes for _, _, c, p in fotos)
print("SPLAT: %d tomas de %dpx en RAM (%.0f MB), focal %.1f px" % (
      len(fotos), PX, mem/1048576, f_px), flush=True)

# ---------------------------------------------------- muestreo y proyección
rng = np.random.default_rng(20260908)
pond = A*W
prob = np.cumsum(pond); prob /= prob[-1]
NM = int(TOTAL*1.30)
BLOQUE = int(sys.argv[sys.argv.index("--bloque")+1]) if "--bloque" in sys.argv else 6000000

sal = open(SALIDA, "wb")
sal_chico = open(CHICO, "wb") if CHICO else None
p_chico = min(1.0, NCHICO / max(1.0, 0.62*TOTAL)) if CHICO else 0.0
k_chico = math.sqrt(1.0/p_chico) if p_chico > 0 else 1.0

tot_n = tot_ok = tot_m = 0
tot_cam = 0.0
nb = (NM + BLOQUE - 1)//BLOQUE
for bl in range(nb):
    m = min(BLOQUE, NM - bl*BLOQUE)
    cara = np.searchsorted(prob, rng.random(m))
    r1, r2 = rng.random(m), rng.random(m)
    s = np.sqrt(r1)
    pos = P[cara,0] * (1-s)[:,None]
    pos += P[cara,1] * (s*(1-r2))[:,None]
    pos += P[cara,2] * (s*r2)[:,None]
    del r1, r2, s
    lc = LIM[cara]
    dentro = (np.abs(pos[:,0]-CENTRO[0]) <= lc) & (np.abs(pos[:,1]-CENTRO[1]) <= lc)
    pos = pos[dentro].astype(np.float32); cara = cara[dentro]
    mm = len(pos)
    tot_m += mm
    if mm == 0: continue
    nor = NOR[cara].astype(np.float32)
    pas = paso[cara].astype(np.float32)
    dos = DOS[cara]

    POSH = np.empty((mm, 4), np.float32)
    POSH[:, :3] = pos; POSH[:, 3] = 1.0
    suma = np.zeros((mm, 3), np.float32)
    peso = np.zeros(mm, np.float32)
    ncam = np.zeros(mm, np.int32)
    nor_ojo = None

    for (inv, ojo, col, prof) in fotos:
        pc = POSH @ inv.T                                # a coordenadas de cámara
        z = -pc[:, 2]
        delante = z > 0.4
        xp = np.where(delante, pc[:,0]/np.maximum(1e-6, z)*f_px + PX/2, -1)
        yp = np.where(delante, PX/2 - pc[:,1]/np.maximum(1e-6, z)*f_px, -1)
        # un píxel de margen, que el vecindario de 3x3 no se salga del cuadro
        est = delante & (xp >= 1) & (xp < PX-1) & (yp >= 1) & (yp < PX-1)
        if not est.any(): continue
        # Coseno de incidencia: de canto no se cree nada. Por contracción y sin
        # normalizar el vector a la cámara, que a estos tamaños son cientos de MB.
        cosi = (nor @ ojo) - np.einsum("ij,ij->i", nor, pos)
        cosi /= np.maximum(1e-6, np.sqrt(np.einsum("ij,ij->i", pc, pc)))
        np.abs(cosi, out=cosi, where=dos)    # las cartas valen de los dos lados
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
                acum[de_acuerdo] += col[jy[de_acuerdo], jx[de_acuerdo]].astype(np.float32)
                tap[de_acuerdo] += 1
        visto = tap >= 3.0              # al menos tres de nueve: filtra el canto
        if not visto.any(): continue
        j = idx0[visto]
        w = (cosi[j] * (tap[visto]/9.0)).astype(np.float32)
        suma[j] += acum[visto] / tap[visto][:, None] * w[:, None]
        peso[j] += w
        ncam[j] += 1
    del POSH

    # dos cámaras o más, o una sola pero bien de frente: cortando en dos
    # quedaban huecos en los rincones que sólo ve una cámara
    ok = ((ncam >= 2) & (peso > 0.10)) | ((ncam == 1) & (peso > 0.55))
    nok = int(ok.sum())
    tot_ok += nok
    if nok:
        tot_cam += float(ncam[ok].sum())
        pos = pos[ok]; nor = nor[ok]; cara = cara[ok]; pas = pas[ok]
        rgb_lin = suma[ok] / peso[ok][:, None]
        n = nok

        # ---- color: curva fílmica y después sRGB. La toma es lineal: sin
        # curva, el hormigón al sol recorta en 1,0 y sale blanco lavado.
        x = np.maximum(0.0, rgb_lin * np.float32(EXPO) * AT[cara].astype(np.float32)[:, None])
        x = (x*(2.51*x + 0.03)) / (x*(2.43*x + 0.59) + 0.14)
        x = np.clip(x, 0, 1)
        rgb = np.where(x <= 0.0031308, x*12.92,
                       1.055*np.power(np.maximum(x, 1e-8), 1/2.4) - 0.055)
        rgb = np.clip(rgb, 0, 1)

        # ---- forma: ex hacia lo fino de la cara, ey a lo largo
        el = elong[cara].astype(np.float32)
        ex = np.cross(nor, el)
        ex /= np.maximum(1e-9, np.linalg.norm(ex, axis=1))[:, None]
        ey = np.cross(nor, ex)
        ey /= np.maximum(1e-9, np.linalg.norm(ey, axis=1))[:, None]
        fino = np.minimum(pas, np.maximum(0.045, alt[cara].astype(np.float32)*1.15))
        largo = np.minimum(np.minimum(pas*pas/np.maximum(0.045, fino), fino*3.2),
                           LE[fila, imax][cara].astype(np.float32)*0.55)
        largo = np.maximum(largo, fino)
        esf = FO[cara]
        corto = 0.62*fino * rng.uniform(0.88, 1.14, n).astype(np.float32)
        lrg   = 0.62*largo * rng.uniform(0.88, 1.14, n).astype(np.float32)
        grueso = np.where(esf, 0.42*pas, np.maximum(0.014, GROSOR*pas))
        esc = np.stack([corto, lrg, grueso], 1).astype(np.float32)
        alfa = np.where(esf, 0.72, 0.95).astype(np.float32)

        # a ejes del visor: Y arriba, y Z invertido respecto de Blender
        def aY(v): return np.stack([v[:,0], v[:,2], -v[:,1]], 1)
        posY, exY, eyY, norY = aY(pos), aY(ex), aY(ey), aY(nor)
        q = cuaternion(np.stack([exY, eyY, norY], axis=2).astype(np.float32))

        empaquetar(sal, posY, esc, rgb, alfa, q, np.ones(n, bool), 1.0)
        if sal_chico is not None:
            sub = rng.random(n) < p_chico
            if sub.any():
                empaquetar(sal_chico, posY, esc, rgb, alfa, q, sub, k_chico)
    print("SPLAT: bloque %d/%d · %d de %d con color (%.1f%%)" % (
          bl+1, nb, nok, mm, 100.0*nok/max(1, mm)), flush=True)

sal.close()
if sal_chico is not None: sal_chico.close()
print("SPLAT: %d tomas · %d de %d muestras con color (%.1f%%) · %.2f cámaras de media" % (
      len(fotos), tot_ok, tot_m, 100.0*tot_ok/max(1, tot_m), tot_cam/max(1, tot_ok)), flush=True)
print("SPLAT: %s · %d gaussianas · %.2f MB · paso base %.2f m" % (
      SALIDA, tot_ok, os.path.getsize(SALIDA)/1048576, s0), flush=True)
if sal_chico is not None:
    nch = os.path.getsize(CHICO)//32
    print("SPLAT: %s · %d gaussianas · %.2f MB · paso x%.2f" % (
          CHICO, nch, os.path.getsize(CHICO)/1048576, k_chico), flush=True)
