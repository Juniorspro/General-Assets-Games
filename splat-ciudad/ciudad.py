# La ciudad, versión detallada, más el equipo de cámaras que la fotografía.
#
# El salto a algo que parezca una foto no viene de más gaussianas: viene de que
# el color de cada gaussiana sea radiancia de verdad y de que la superficie
# tenga de dónde sacar detalle. Así que esto arma la escena con mucho más
# detalle que la anterior —árboles, balcones, sendas peatonales, semáforos,
# carteles—, la fotografía desde 184 puntos con Cycles y guarda color y
# PROFUNDIDAD de cada toma. Después splat3.py proyecta esas fotos sobre las
# gaussianas, que es exactamente de dónde saca el color un splat entrenado.
import bpy, json, math, os, random, sys

WEB = "/home/neko/tex"
SEMILLA = 20260908
SALIDA = "/home/neko/foto3"
VISTAS = int(sys.argv[sys.argv.index("--vistas")+1]) if "--vistas" in sys.argv else 184
MUESTRAS = int(sys.argv[sys.argv.index("--muestras")+1]) if "--muestras" in sys.argv else 96
LADO_PX = int(sys.argv[sys.argv.index("--px")+1]) if "--px" in sys.argv else 640
SOLO_ESCENA = "--solo-escena" in sys.argv
DESDE = int(sys.argv[sys.argv.index("--desde")+1]) if "--desde" in sys.argv else 1

os.makedirs(SALIDA, exist_ok=True)
random.seed(SEMILLA)

bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete()
for d in (bpy.data.meshes, bpy.data.materials, bpy.data.lights,
          bpy.data.cameras, bpy.data.images, bpy.data.worlds):
    for x in list(d): d.remove(x)

# ----------------------------------------------------------- materiales
_mats = {}
def img(r, color=False):
    im = bpy.data.images.load(r, check_existing=True)
    im.colorspace_settings.name = "sRGB" if color else "Non-Color"
    return im

def pbr(nombre, escala=1.0, tinte=None, alias=None, rug=None):
    clave = alias or nombre
    if clave in _mats: return _mats[clave]
    m = bpy.data.materials.new(clave); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (escala, escala, escala)
    nt.links.new(coord.outputs["UV"], mp.inputs["Vector"])
    def tex(suf, color=False):
        r = "%s/%s_%s.jpg" % (WEB, nombre, suf)
        if not os.path.exists(r): return None
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = img(r, color)
        n.interpolation = "Smart"
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"]); return n
    col = tex("col", True)
    if col:
        if tinte:
            mz = nt.nodes.new("ShaderNodeMix"); mz.data_type = "RGBA"
            mz.blend_type = "MULTIPLY"; mz.inputs["Factor"].default_value = 1.0
            mz.inputs["B"].default_value = (*tinte, 1)
            nt.links.new(col.outputs["Color"], mz.inputs["A"])
            nt.links.new(mz.outputs["Result"], b.inputs["Base Color"])
        else:
            nt.links.new(col.outputs["Color"], b.inputs["Base Color"])
    nrm = tex("nrm")
    if nrm:
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(nrm.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    mr = tex("mr")
    if mr:
        sp = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(mr.outputs["Color"], sp.inputs["Color"])
        if rug is None: nt.links.new(sp.outputs["Green"], b.inputs["Roughness"])
        else: b.inputs["Roughness"].default_value = rug
        nt.links.new(sp.outputs["Blue"], b.inputs["Metallic"])
    _mats[clave] = m; return m

def liso(nombre, color, metal, rug, emis=None, fuerza=0.0):
    if nombre in _mats: return _mats[nombre]
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rug
    if emis:
        b.inputs["Emission Color"].default_value = (*emis, 1)
        b.inputs["Emission Strength"].default_value = fuerza
    _mats[nombre] = m; return m

# ----------------------------------------------------------- geometría
# Todo se acumula en lotes por material y se vuelca de una con from_pydata:
# los operadores de Blender son cuadráticos y con esta cantidad de piezas
# tardaban más de quince minutos contra los dos segundos que tarda así.
LOTES = {}
CARAS = [((0,1,2,3),2), ((7,6,5,4),2), ((0,4,5,1),1), ((3,2,6,7),1), ((1,5,6,2),0), ((4,0,3,7),0)]

def caja(centro, tam, mat, uv=2.0):
    cx, cy, cz = centro
    sx, sy, sz = tam[0]/2, tam[1]/2, tam[2]/2
    l = LOTES.setdefault(mat.name, {"v":[], "f":[], "uv":[], "mat":mat, "u":uv or 2.0})
    base = len(l["v"])
    esq = [(cx-sx,cy-sy,cz+sz),(cx+sx,cy-sy,cz+sz),(cx+sx,cy+sy,cz+sz),(cx-sx,cy+sy,cz+sz),
           (cx-sx,cy-sy,cz-sz),(cx+sx,cy-sy,cz-sz),(cx+sx,cy+sy,cz-sz),(cx-sx,cy+sy,cz-sz)]
    l["v"].extend(esq); u = l["u"]
    for idx, eje in CARAS:
        l["f"].append(tuple(base+i for i in idx))
        a, b = [k for k in (0,1,2) if k != eje]
        for i in idx:
            v = esq[i]; l["uv"].append((v[a]/u, v[b]/u))

def _unit(v):
    n = math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])
    return (v[0]/n, v[1]/n, v[2]/n)

def _icosfera(sub=1):
    t = (1+5**0.5)/2
    v = [(-1,t,0),(1,t,0),(-1,-t,0),(1,-t,0),(0,-1,t),(0,1,t),(0,-1,-t),(0,1,-t),
         (t,0,-1),(t,0,1),(-t,0,-1),(-t,0,1)]
    f = [(0,11,5),(0,5,1),(0,1,7),(0,7,10),(0,10,11),(1,5,9),(5,11,4),(11,10,2),
         (10,7,6),(7,1,8),(3,9,4),(3,4,2),(3,2,6),(3,6,8),(3,8,9),(4,9,5),
         (2,4,11),(6,2,10),(8,6,7),(9,8,1)]
    v = [_unit(x) for x in v]
    for _ in range(sub):
        nf, medio = [], {}
        def mit(a, b):
            k = (min(a,b), max(a,b))
            if k not in medio:
                v.append(_unit((v[a][0]+v[b][0], v[a][1]+v[b][1], v[a][2]+v[b][2])))
                medio[k] = len(v)-1
            return medio[k]
        for (a, b, c) in f:
            ab, bc, ca = mit(a,b), mit(b,c), mit(c,a)
            nf += [(a,ab,ca), (b,bc,ab), (c,ca,bc), (ab,bc,ca)]
        f = nf
    return v, f

ICO = _icosfera(1)          # 42 vértices, 80 triángulos

def esfera(centro, r, mat, achatado=1.0):
    # el follaje va en lotes propios: nunca se mezclan triángulos con quads en
    # una misma malla, que es donde validate() puede reordenar los loops
    cx, cy, cz = centro
    vs, fs = ICO
    l = LOTES.setdefault(mat.name, {"v":[], "f":[], "uv":[], "mat":mat, "u":1.0})
    base = len(l["v"])
    l["v"].extend([(cx+x*r, cy+y*r, cz+z*r*achatado) for (x,y,z) in vs])
    for (a, b, c) in fs:
        l["f"].append((base+a, base+b, base+c))
        for i in (a, b, c):
            x, y, z = vs[i]
            l["uv"].append((0.5 + math.atan2(y, x)/math.tau, 0.5 + math.asin(max(-1,min(1,z)))/math.pi))

def volcar():
    for nombre, l in LOTES.items():
        me = bpy.data.meshes.new("m_"+nombre)
        me.from_pydata(l["v"], [], l["f"]); me.validate()
        capa = me.uv_layers.new(name="UVMap")
        for i, co in enumerate(l["uv"]):
            if i < len(capa.data): capa.data[i].uv = co
        me.update()
        ob = bpy.data.objects.new("grupo_"+nombre, me)
        ob.data.materials.append(l["mat"])
        bpy.context.collection.objects.link(ob)

M_HORM  = pbr("hormigon", .5, (0.70,0.70,0.68))
M_HORM2 = pbr("hormigon", .5, (0.50,0.49,0.47), alias="hormigon_oscuro")
M_ALU   = pbr("aluminio", 1., (0.68,0.70,0.74))
M_ALU2  = pbr("aluminio", .8, (0.40,0.42,0.46), alias="aluminio_oscuro")
M_ANTEP = pbr("aluminio", .35, (0.26,0.28,0.32), alias="antepecho")
M_PANEL = pbr("panel", 1., (0.55,0.58,0.62))
M_LAD   = pbr("ladrillo", .6, (0.92,0.84,0.76))
M_LAD2  = pbr("ladrillo", .55, (0.62,0.52,0.46), alias="ladrillo_oscuro")
M_CALLE = pbr("calle", .25)
M_VEREDA= pbr("vereda", .5)
M_VIDRIO= liso("vidrio", (0.045,0.062,0.085), 0.55, 0.035)
M_INT   = liso("interior", (0.34,0.32,0.29), 0.0, 0.72, emis=(0.42,0.38,0.32), fuerza=1.0)
M_LUZ   = liso("luz", (1,0.93,0.80), 0, .4, emis=(1,0.90,0.70), fuerza=6.0)
M_NEGRO = liso("negro", (0.03,0.03,0.035), 0.0, 0.55)
M_PINT  = liso("pintura", (0.14,0.16,0.20), 0.35, 0.28)
M_ROJO  = liso("rojo", (0.32,0.05,0.05), 0.3, 0.3)
M_RAYA  = liso("raya", (0.62,0.62,0.60), 0.0, 0.55)
M_TRONCO= liso("tronco", (0.085,0.062,0.048), 0.0, 0.82)
M_HOJA  = liso("hoja", (0.055,0.115,0.030), 0.0, 0.60)
M_HOJA2 = liso("hoja_clara", (0.105,0.190,0.048), 0.0, 0.58)
M_HOJA3 = liso("hoja_oscura", (0.028,0.062,0.020), 0.0, 0.64)
M_LEJOS = liso("lejos", (0.19,0.19,0.20), 0.0, 0.70)   # telón: no entra al splat
M_TOLDO = [liso("toldo_a", (0.30,0.05,0.06), 0, .5),
           liso("toldo_b", (0.05,0.14,0.26), 0, .5),
           liso("toldo_c", (0.10,0.22,0.12), 0, .5),
           liso("toldo_d", (0.36,0.26,0.05), 0, .5)]
M_CARTEL= [liso("cartel_a", (0.75,0.20,0.10), 0, .45, emis=(0.85,0.25,0.12), fuerza=1.6),
           liso("cartel_b", (0.10,0.45,0.75), 0, .45, emis=(0.12,0.50,0.85), fuerza=1.6),
           liso("cartel_c", (0.85,0.70,0.15), 0, .45, emis=(0.95,0.80,0.20), fuerza=1.6)]
M_SEMR  = liso("sem_rojo", (0.6,0.03,0.03), 0, .4, emis=(1.0,0.06,0.05), fuerza=9.0)
M_SEMV  = liso("sem_verde", (0.03,0.5,0.12), 0, .4, emis=(0.08,1.0,0.25), fuerza=9.0)

PALETAS = [M_HORM, M_HORM2, M_LAD, M_LAD2, M_PANEL]

MANZANA, CALLE, N = 78.0, 26.0, 5
PASO = MANZANA + CALLE
MITAD = (N-1)/2*PASO
PISO = 3.9
CALZ = CALLE - 9          # ancho de asfalto: 17 m
EJES = [-MITAD - PASO/2 + i*PASO for i in range(N+1)]   # las seis calles por eje

cajas = []
def registrar(cx, cy, cz, sx, sy, sz, clase):
    cajas.append({"c":[round(cx,2), round(cz,2), round(-cy,2)],
                  "s":[round(sx,2), round(sz,2), round(sy,2)], "t":clase})

# --- suelo, calzada, cordones, veredas y rayas -------------------------
# el suelo del distrito es finito: el telón de 3000 m va con material propio
# para que el proyector lo pueda dejar afuera sin gastarle gaussianas
caja((0,0,-1.51), (3000,3000,3.0), M_LEJOS, uv=64)   # tapa justo por debajo
caja((0,0,-0.4), (760,760,0.8), M_HORM2, uv=16)
LARGO = N*PASO + 240
for i in range(N+1):
    d = EJES[i]
    caja((0,d,0.02), (LARGO, CALZ, 0.28), M_CALLE, uv=9)
    caja((d,0,0.02), (CALZ, LARGO, 0.28), M_CALLE, uv=9)
    for s in (-1, 1):
        caja((0, d + s*CALZ/2, 0.13), (LARGO, 0.4, 0.5), M_HORM, uv=2)
        caja((d + s*CALZ/2, 0, 0.13), (0.4, LARGO, 0.5), M_HORM, uv=2)
    for k in range(-28, 29):
        caja((k*13, d, 0.17), (5.5, 0.22, 0.02), M_ALU, uv=1)
        caja((d, k*13, 0.17), (0.22, 5.5, 0.02), M_ALU, uv=1)

# sendas peatonales: cebra en las cuatro bocas de cada cruce
for dx in EJES:
    for dy in EJES:
        for s in (-1, 1):
            for k in range(7):
                t = -CALZ/2 + 1.2 + k*(CALZ-2.4)/6
                caja((dx+t, dy + s*(CALZ/2+1.6), 0.18), (1.1, 2.6, 0.03), M_RAYA, uv=1)
                caja((dx + s*(CALZ/2+1.6), dy+t, 0.18), (2.6, 1.1, 0.03), M_RAYA, uv=1)

def balcones(bx, by, ancho, prof, pisos, r):
    for i in range(2, pisos-1, 2):
        z = i*PISO + 1.0
        lado = r.choice([0,1,2,3])
        if lado < 2:
            sy = -1 if lado == 0 else 1
            caja((bx, by + sy*(prof/2+0.62), z), (ancho*0.72, 1.3, 0.17), M_HORM, uv=1.6)
            caja((bx, by + sy*(prof/2+1.24), z+0.55), (ancho*0.72, 0.07, 1.0), M_VIDRIO, uv=0)
            caja((bx, by + sy*(prof/2+1.24), z+1.08), (ancho*0.72, 0.09, 0.09), M_ALU, uv=1)
        else:
            sx = -1 if lado == 2 else 1
            caja((bx + sx*(ancho/2+0.62), by, z), (1.3, prof*0.72, 0.17), M_HORM, uv=1.6)
            caja((bx + sx*(ancho/2+1.24), by, z+0.55), (0.07, prof*0.72, 1.0), M_VIDRIO, uv=0)
            caja((bx + sx*(ancho/2+1.24), by, z+1.08), (0.09, prof*0.72, 0.09), M_ALU, uv=1)

def edificio(bx, by, ancho, prof, pisos, semilla):
    r = random.Random(semilla)
    alto = pisos*PISO
    piel = r.choice(PALETAS)
    caja((bx,by,alto/2), (ancho-1.6, prof-1.6, alto), piel, uv=3)
    # planta baja: zócalo, vitrina y toldos
    caja((bx,by,2.4), (ancho+.5, prof+.5, 4.8), M_HORM, uv=2.5)
    caja((bx,by,3.0), (ancho+.62, prof+.62, 2.6), M_VIDRIO, uv=0)
    caja((bx,by,5.1), (ancho+1.5, prof+1.5, 0.32), M_ALU2, uv=1.5)   # marquesina
    tol = r.choice(M_TOLDO)
    for s in (-1,1):
        caja((bx, by + s*(prof/2+1.05), 4.35), (ancho*0.55, 1.7, 0.09), tol, uv=1)
        caja((bx + s*(ancho/2+1.05), by, 4.35), (1.7, prof*0.55, 0.09), tol, uv=1)
    for i in range(1, pisos):
        z = i*PISO
        caja((bx,by,z+0.62), (ancho+.06, prof+.06, 1.24), M_ANTEP, uv=4)
        caja((bx,by,z+2.5),  (ancho-1.5, prof-1.5, 2.4), M_INT, uv=2.5)
        caja((bx,by,z+2.55), (ancho+.10, prof+.10, 2.55), M_VIDRIO, uv=0)
        caja((bx,by,z+1.32), (ancho+.62, prof+.62, 0.13), M_ALU, uv=1.5)   # visera
        if i % 5 == 0:
            caja((bx,by,z+0.1), (ancho+1.3, prof+1.3, 0.45), M_HORM, uv=2)  # cornisa
    if piel in (M_LAD, M_LAD2) or r.random() < 0.35:
        balcones(bx, by, ancho, prof, pisos, r)
    # parteluces: verticales y horizontales
    paso = 2.15
    nx = max(1, int(ancho/paso)); ny = max(1, int(prof/paso))
    for k in range(nx+1):
        x = bx - ancho/2 + k*(ancho/nx)
        for s in (-1,1):
            caja((x, by + s*(prof/2+.19), alto/2), (0.15, 0.38, alto), M_ALU, uv=1.5)
    for k in range(ny+1):
        y = by - prof/2 + k*(prof/ny)
        for s in (-1,1):
            caja((bx + s*(ancho/2+.19), y, alto/2), (0.38, 0.15, alto), M_ALU, uv=1.5)
    # coronamiento y azotea
    caja((bx,by,alto+0.75), (ancho+.9, prof+.9, 1.5), M_ALU, uv=2)
    caja((bx,by,alto+1.55), (ancho+.5, prof+.5, 0.12), M_ALU2, uv=1)
    mx, my = ancho*0.40, prof*0.40
    caja((bx-ancho*0.16, by, alto+3.0), (mx, my, 3.2), piel, uv=2)          # sala de máquinas
    caja((bx-ancho*0.16, by, alto+4.7), (mx+.4, my+.4, 0.3), M_ALU2, uv=1)
    for k in range(3):                                                       # equipos
        caja((bx+ancho*0.22, by-my/2+k*(my/2.4), alto+2.2), (2.4, 1.5, 1.3), M_ALU, uv=1)
        caja((bx+ancho*0.22, by-my/2+k*(my/2.4), alto+2.95), (2.0, 1.2, 0.12), M_NEGRO, uv=1)
    if pisos > 16:
        caja((bx+ancho*0.28, by+prof*0.28, alto+5.5), (0.9, 0.9, 8.0), M_ALU2, uv=1)  # mástil
        caja((bx+ancho*0.28, by+prof*0.28, alto+9.7), (0.5, 0.5, 0.5), M_ROJO, uv=0)
    caja((bx+ancho*0.05, by-prof*0.3, alto+2.6), (3.0, 3.0, 2.4), M_ALU2, uv=1.5)     # tanque
    if pisos > 13 and r.random() < 0.55:                                     # cartel de azotea
        car = r.choice(M_CARTEL)
        for s in (-1,1):
            caja((bx, by + s*prof*0.30, alto+6.2), (ancho*0.9, 0.25, 4.2), car, uv=1)
        for k in range(4):
            caja((bx - ancho*0.4 + k*ancho*0.27, by, alto+4.0), (0.2, prof*0.6, 4.0), M_ALU2, uv=1)
    registrar(bx, by, alto/2, ancho+1.4, prof+1.4, alto, "torre")
    return alto

alturas = []
for ix in range(N):
    for iy in range(N):
        cx = -MITAD + ix*PASO
        cy = -MITAD + iy*PASO
        cuantos = random.choice([1,2,2,3])
        huecos = [(-1,-1),(1,1),(-1,1),(1,-1)]; random.shuffle(huecos)
        for k in range(cuantos):
            hx, hy = huecos[k]
            an = random.uniform(20,29) if cuantos == 1 else random.uniform(16,23)
            pr = random.uniform(20,29) if cuantos == 1 else random.uniform(16,23)
            ox = 0 if cuantos == 1 else hx*(MANZANA/2 - an/2 - 3)
            oy = 0 if cuantos == 1 else hy*(MANZANA/2 - pr/2 - 3)
            lejos = math.hypot(cx,cy)/(MITAD+1)
            pisos = max(4, min(34, int(random.uniform(6,32)*(1.25-0.55*lejos))))
            alturas.append(edificio(cx+ox, cy+oy, an, pr, pisos, ix*97+iy*13+k))
        caja((cx,cy,0.10), (MANZANA, MANZANA, 0.4), M_VEREDA, uv=3)

# --- mobiliario de calle ---------------------------------------------
def arbol(x, y, sem):
    r = random.Random(sem)
    h = r.uniform(4.4, 7.2)
    caja((x, y, h*0.42), (0.44, 0.44, h*0.84), M_TRONCO, uv=1)
    for k in range(r.randint(3, 5)):
        rr = r.uniform(1.6, 2.9)
        esfera((x + r.uniform(-1.3,1.3), y + r.uniform(-1.3,1.3), h + r.uniform(-0.5,1.7)),
               rr, r.choice([M_HOJA, M_HOJA2, M_HOJA3]), achatado=r.uniform(0.70, 1.0))

def semaforo(x, y, gx, gy, sem):
    r = random.Random(sem)
    caja((x, y, 2.9), (0.20, 0.20, 5.8), M_NEGRO, uv=1)
    caja((x + gx*1.6, y + gy*1.6, 5.7), (abs(gx)*3.2+0.16, abs(gy)*3.2+0.16, 0.16), M_NEGRO, uv=1)
    caja((x + gx*3.0, y + gy*3.0, 5.15), (0.42, 0.42, 1.15), M_NEGRO, uv=1)
    luz = M_SEMV if r.random() < 0.5 else M_SEMR
    caja((x + gx*3.0 + gy*0.24, y + gy*3.0 + gx*0.24, 5.15 + (0.32 if luz is M_SEMR else -0.32)),
         (0.26, 0.26, 0.26), luz, uv=0)

nsem = 0
def acera(x, y, s, k, d, vertical):
    # el mismo equipamiento en los dos ejes; con vertical=True se giran las
    # piezas que no son cuadradas
    def cj(dx_, dy_, z, sx, sy, sz, mat, uv=1.0):
        if vertical: caja((y+dy_, x+dx_, z), (sy, sx, sz), mat, uv)
        else:        caja((x+dx_, y+dy_, z), (sx, sy, sz), mat, uv)
    cj(0, 0, 3.2, 0.22, 0.22, 6.4, M_NEGRO)                      # poste
    cj(0, -s*1.1, 6.5, 0.5, 2.0, 0.2, M_LUZ, 0)                  # farol
    if k % 3 == 0: cj(6, 0, 0.55, 1.6, 1.1, 1.1, M_HORM, 1.2)    # macetero
    if k % 4 == 1: cj(-5, 0, 0.6, 0.7, 0.7, 1.2, M_PINT)         # buzon
    if k % 2 == 0 and abs(x) < 260:
        arbol(y if vertical else x + 11, x + 11 if vertical else y,
              int(d*7 + x*3 + s + (17 if vertical else 0)))      # arbolado
    if k % 5 == 2:                                               # banco
        cj(2, 0, 0.48, 1.9, 0.55, 0.12, M_TRONCO)
        for b in (-1,1): cj(2+b*0.8, 0, 0.24, 0.12, 0.5, 0.48, M_NEGRO)
    if k % 7 == 3: cj(-2, 0, 0.45, 0.5, 0.5, 0.9, M_ALU2)        # cesto

for i in range(N+1):
    d = EJES[i]
    for k in range(-11, 12):
        x = k*22.0
        for s in (-1,1):
            y = d + s*CALZ/2 - s*2.4
            acera(x, y, s, k, d, False)
            acera(x, y, s, k, d, True)
# semáforos y refugios en los cruces
for dx in EJES:
    for dy in EJES:
        for (gx, gy) in ((1,0), (0,1), (-1,0), (0,-1)):
            semaforo(dx - gy*(CALZ/2+2.2), dy + gx*(CALZ/2+2.2), gx, gy, nsem)
            nsem += 1
        if (dx*dy) % 3 == 0:                                             # refugio
            caja((dx+12, dy - CALZ/2 - 3.0, 1.4), (4.6, 1.7, 0.08), M_VIDRIO, uv=0)
            caja((dx+12, dy - CALZ/2 - 3.0, 2.65), (5.0, 2.1, 0.14), M_ALU2, uv=1)
            for b in (-1,1):
                caja((dx+12+b*2.3, dy - CALZ/2 - 3.0, 1.32), (0.14, 0.14, 2.64), M_ALU2, uv=1)

# vehículos: autos, camionetas y algún colectivo
for i in range(180):
    eje = random.random() < .5
    d = random.choice(EJES)
    t = random.uniform(-MITAD-40, MITAD+40)
    car = random.choice([M_PINT, M_ROJO, M_ALU2, M_NEGRO, M_HORM])
    clase = random.random()
    if clase < 0.12: largo, anchov, altov = 11.5, 2.5, 3.0      # colectivo
    elif clase < 0.32: largo, anchov, altov = 5.4, 2.1, 2.1     # camioneta
    else: largo, anchov, altov = 4.3, 1.8, 1.3                  # auto
    c = random.choice([-4.2, 4.2])
    if eje:
        caja((t, d + c, altov/2+0.2), (largo, anchov, altov), car, uv=1)
        caja((t-0.3, d + c, altov+0.55), (largo*0.5, anchov*0.94, 0.7), M_VIDRIO, uv=0)
        for sx in (-1,1):
            for sy in (-1,1):
                caja((t+sx*largo*0.32, d+c+sy*anchov*0.5, 0.36), (0.72, 0.24, 0.72), M_NEGRO, uv=1)
    else:
        caja((d + c, t, altov/2+0.2), (anchov, largo, altov), car, uv=1)
        caja((d + c, t-0.3, altov+0.55), (anchov*0.94, largo*0.5, 0.7), M_VIDRIO, uv=0)
        for sx in (-1,1):
            for sy in (-1,1):
                caja((d+c+sy*anchov*0.5, t+sx*largo*0.32, 0.36), (0.24, 0.72, 0.72), M_NEGRO, uv=1)

volcar()
mallas = [o for o in bpy.data.objects if o.type == "MESH"]
caras = sum(len(o.data.polygons) for o in mallas)
print("CIUDAD3: %d edificios (%d-%d m) · %d mallas · %d caras" % (
      len(alturas), min(alturas), max(alturas), len(mallas), caras), flush=True)

# ----------------------------------------------------------- cielo y sol
mundo = bpy.data.worlds.new("cielo"); mundo.use_nodes = True
nt = mundo.node_tree
env = nt.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load("/home/neko/tex/cielo.hdr")
gir = nt.nodes.new("ShaderNodeMapping"); gir.inputs["Rotation"].default_value = (0,0,math.radians(155))
crd = nt.nodes.new("ShaderNodeTexCoord")
nt.links.new(crd.outputs["Generated"], gir.inputs["Vector"])
nt.links.new(gir.outputs["Vector"], env.inputs["Vector"])
nt.links.new(env.outputs["Color"], nt.nodes["Background"].inputs["Color"])
nt.nodes["Background"].inputs["Strength"].default_value = 1.0
bpy.context.scene.world = mundo

sol = bpy.data.lights.new("sol", type="SUN")
sol.energy = 3.4; sol.angle = math.radians(1.2)
obsol = bpy.data.objects.new("sol", sol)
obsol.rotation_euler = (math.radians(52), math.radians(2), math.radians(34))
bpy.context.collection.objects.link(obsol)

# ----------------------------------------------------------- cámaras
# Cuatro familias, porque cada una cubre algo distinto: peatón (fachada baja al
# detalle), cruce (dos fachadas y la cebra), media calle (la fachada de frente,
# que es donde el ángulo rasante arruinaba el color) y aérea oblicua (azoteas).
vistas = []
def agregar(x, y, z, yaw, pitch):
    vistas.append((x, y, z, math.radians(yaw), math.radians(pitch)))

RUMBOS = [0, 90, 180, 270]
for dx in EJES:                                   # cruces
    for dy in EJES:
        for a in random.sample(RUMBOS, 2):
            agregar(dx, dy, random.uniform(6, 46), a, random.uniform(-16, 8))
for d in EJES:                                    # media calle, mirando la fachada
    for t in [-MITAD + k*PASO for k in range(N)]:
        agregar(t, d + random.choice([-5.5, 5.5]), random.uniform(5, 22),
                random.choice([0, 180]), random.uniform(-6, 16))
        agregar(d + random.choice([-5.5, 5.5]), t, random.uniform(5, 22),
                random.choice([90, 270]), random.uniform(-6, 16))
for k in range(34):                               # peatón
    d = random.choice(EJES)
    if random.random() < .5:
        agregar(random.uniform(-MITAD, MITAD), d + random.choice([-6.5, 6.5]), 1.7,
                random.choice(RUMBOS), random.uniform(2, 22))
    else:
        agregar(d + random.choice([-6.5, 6.5]), random.uniform(-MITAD, MITAD), 1.7,
                random.choice(RUMBOS), random.uniform(2, 22))
for k in range(26):                               # aéreas oblicuas
    a = k / 26 * 360 + random.uniform(-5, 5)
    r = MITAD * random.uniform(0.45, 1.20)
    agregar(math.cos(math.radians(a))*r, math.sin(math.radians(a))*r,
            random.uniform(95, 215), a + 180, random.uniform(-48, -20))
random.shuffle(vistas)
vistas = vistas[:VISTAS]
print("CIUDAD3: %d tomas" % len(vistas), flush=True)

esc = bpy.context.scene
esc.render.engine = "CYCLES"
esc.cycles.device = "CPU"
esc.cycles.samples = MUESTRAS
esc.cycles.use_denoising = False              # esta build no trae OpenImageDenoise
esc.cycles.max_bounces = 3
esc.cycles.transmission_bounces = 2
# muestreo adaptativo con el umbral flojo: el color de cada gaussiana se
# promedia después sobre 3x3 píxeles y varias cámaras, así que el ruido por
# píxel importa mucho menos que el tiempo por toma
esc.cycles.use_adaptive_sampling = True
esc.cycles.adaptive_threshold = float(sys.argv[sys.argv.index("--umbral")+1]) if "--umbral" in sys.argv else 0.025
esc.cycles.adaptive_min_samples = 16
esc.cycles.light_sampling_threshold = 0.05   # la ciudad tiene mil emisores chicos
esc.cycles.use_light_tree = True
esc.render.resolution_x = esc.render.resolution_y = LADO_PX
esc.render.film_transparent = False
esc.view_settings.view_transform = "Standard"     # sin curva: hace falta lineal
esc.view_layers[0].use_pass_z = True

cam = bpy.data.cameras.new("camara"); cam.lens = 20        # gran angular
obcam = bpy.data.objects.new("camara", cam)
bpy.context.collection.objects.link(obcam)
esc.camera = obcam

datos = {"vistas": [], "px": LADO_PX, "lente": cam.lens,
         "sensor": cam.sensor_width, "cajas": cajas}
for i, (px, py, pz, yaw, pitch) in enumerate(vistas):
    obcam.location = (px, py, pz)
    obcam.rotation_euler = (math.pi/2 + pitch, 0, yaw)   # mira por su -Z local
    bpy.context.view_layer.update()
    M = obcam.matrix_world.copy()
    datos["vistas"].append({"i": i+1, "M": [list(r) for r in M], "loc": [px, py, pz]})
json.dump(datos, open(SALIDA + "/camaras.json", "w"))

bpy.ops.wm.save_as_mainfile(filepath="/home/neko/ciudad3.blend")
if SOLO_ESCENA:
    print("CIUDAD3: sólo escena, no se renderiza"); raise SystemExit

# el compositor guarda color y profundidad de cada toma; el color va en medias
# (alcanza y pesa la mitad) y la profundidad en float, que ahí sí importa
esc.use_nodes = True
nt = esc.node_tree
for nd in list(nt.nodes): nt.nodes.remove(nd)
rl = nt.nodes.new("CompositorNodeRLayers")
sal = nt.nodes.new("CompositorNodeOutputFile")
sal.base_path = SALIDA
sal.format.file_format = "OPEN_EXR"
sal.format.color_depth = "32"
sal.format.exr_codec = "ZIP"
sal.file_slots.clear()
sal.file_slots.new("color"); sal.file_slots.new("z")
sc = sal.file_slots[0]        # .new() devuelve el socket, no la ranura
sc.use_node_format = False
sc.format.file_format = "OPEN_EXR"; sc.format.color_depth = "16"; sc.format.exr_codec = "ZIP"
nt.links.new(rl.outputs["Image"], sal.inputs["color"])
nt.links.new(rl.outputs["Depth"], sal.inputs["z"])

for i, (px, py, pz, yaw, pitch) in enumerate(vistas):
    if i + 1 < DESDE: continue
    obcam.location = (px, py, pz)
    obcam.rotation_euler = (math.pi/2 + pitch, 0, yaw)
    esc.frame_set(i + 1)
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=False)
    print("CIUDAD3: toma %d/%d" % (i+1, len(vistas)), flush=True)

print("CIUDAD3: listo", flush=True)
