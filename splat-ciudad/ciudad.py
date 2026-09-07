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
SEMILLA = 20260909
SALIDA = "/home/neko/foto4"
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

def pbr(nombre, escala=1.0, tinte=None, alias=None, rug=None, mugre=(0.66, 1.10)):
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
        salida = col.outputs["Color"]
        if tinte:
            mz = nt.nodes.new("ShaderNodeMix"); mz.data_type = "RGBA"
            mz.blend_type = "MULTIPLY"; mz.inputs["Factor"].default_value = 1.0
            mz.inputs["B"].default_value = (*tinte, 1)
            nt.links.new(salida, mz.inputs["A"])
            salida = mz.outputs["Result"]
        if mugre:
            # Dos ruidos en coordenadas del mundo, uno grande y uno mediano, y
            # un oscurecido en los primeros metros. Es lo que rompe el mosaico:
            # el azulejo es el mismo en los 49 edificios, y sin esta capa se ve
            # el mismo dibujo repetido a la misma escala en todas las fachadas.
            gen = nt.nodes.new("ShaderNodeNewGeometry")
            n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 0.020
            n1.inputs["Detail"].default_value = 4.0
            n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 0.16
            n2.inputs["Detail"].default_value = 6.0
            for nn in (n1, n2):
                nt.links.new(gen.outputs["Position"], nn.inputs["Vector"])
            mez = nt.nodes.new("ShaderNodeMix"); mez.data_type = "FLOAT"
            mez.inputs["Factor"].default_value = 0.42
            nt.links.new(n1.outputs["Fac"], mez.inputs[2])
            nt.links.new(n2.outputs["Fac"], mez.inputs[3])
            ramp = nt.nodes.new("ShaderNodeValToRGB")
            ramp.color_ramp.elements[0].position = 0.28
            ramp.color_ramp.elements[0].color = (mugre[0], mugre[0], mugre[0], 1)
            ramp.color_ramp.elements[1].position = 0.74
            ramp.color_ramp.elements[1].color = (mugre[1], mugre[1], mugre[1], 1)
            nt.links.new(mez.outputs[0], ramp.inputs["Fac"])
            # grime de zócalo: los primeros 3,5 m van más sucios
            sep = nt.nodes.new("ShaderNodeSeparateXYZ")
            nt.links.new(gen.outputs["Position"], sep.inputs["Vector"])
            zr = nt.nodes.new("ShaderNodeMapRange")
            zr.inputs["From Min"].default_value = 0.0
            zr.inputs["From Max"].default_value = 3.5
            zr.inputs["To Min"].default_value = 0.62
            zr.inputs["To Max"].default_value = 1.0
            zr.clamp = True
            nt.links.new(sep.outputs["Z"], zr.inputs["Value"])
            m1 = nt.nodes.new("ShaderNodeMix"); m1.data_type = "RGBA"
            m1.blend_type = "MULTIPLY"; m1.inputs["Factor"].default_value = 1.0
            nt.links.new(salida, m1.inputs["A"])
            nt.links.new(ramp.outputs["Color"], m1.inputs["B"])
            m2 = nt.nodes.new("ShaderNodeMix"); m2.data_type = "RGBA"
            m2.blend_type = "MULTIPLY"; m2.inputs["Factor"].default_value = 1.0
            nt.links.new(m1.outputs["Result"], m2.inputs["A"])
            nt.links.new(zr.outputs["Result"], m2.inputs["B"])
            salida = m2.outputs["Result"]
        nt.links.new(salida, b.inputs["Base Color"])
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

def hoja_carta(nombre, ruta):
    """Follaje de carta: color e alfa de la imagen, difuso más translúcido.

    Lo translúcido es lo que hace que la copa contra el sol se vea encendida
    por dentro en vez de como una piedra verde.
    """
    if nombre in _mats: return _mats[nombre]
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    nt = m.node_tree
    for nd in list(nt.nodes):
        if nd.type != "OUTPUT_MATERIAL": nt.nodes.remove(nd)
    sal = nt.nodes["Material Output"]
    im = nt.nodes.new("ShaderNodeTexImage")
    im.image = bpy.data.images.load(ruta, check_existing=True)
    im.image.colorspace_settings.name = "sRGB"
    im.interpolation = "Smart"; im.extension = "CLIP"
    # variación mata a mata: multiplica el color por un ruido del mundo
    gen = nt.nodes.new("ShaderNodeNewGeometry")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.35; nz.inputs["Detail"].default_value = 2.0
    nt.links.new(gen.outputs["Position"], nz.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.32
    ramp.color_ramp.elements[0].color = (0.62, 0.72, 0.52, 1)
    ramp.color_ramp.elements[1].position = 0.72
    ramp.color_ramp.elements[1].color = (1.18, 1.12, 0.86, 1)
    nt.links.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    nt.links.new(im.outputs["Color"], mul.inputs["A"])
    nt.links.new(ramp.outputs["Color"], mul.inputs["B"])
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); dif.inputs["Roughness"].default_value = 0.72
    tra = nt.nodes.new("ShaderNodeBsdfTranslucent")
    nt.links.new(mul.outputs["Result"], dif.inputs["Color"])
    nt.links.new(mul.outputs["Result"], tra.inputs["Color"])
    hojaMix = nt.nodes.new("ShaderNodeMixShader"); hojaMix.inputs["Fac"].default_value = 0.30
    nt.links.new(dif.outputs["BSDF"], hojaMix.inputs[1])
    nt.links.new(tra.outputs["BSDF"], hojaMix.inputs[2])
    # y el recorte por alfa
    trans = nt.nodes.new("ShaderNodeBsdfTransparent")
    corte = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(im.outputs["Alpha"], corte.inputs["Fac"])
    nt.links.new(trans.outputs["BSDF"], corte.inputs[1])
    nt.links.new(hojaMix.outputs["Shader"], corte.inputs[2])
    nt.links.new(corte.outputs["Shader"], sal.inputs["Surface"])
    _mats[nombre] = m; return m

def hoja(nombre):
    """Follaje: difuso más translúcido, y el color de un ruido en el mundo.

    Lo translúcido es lo que hace que una copa contra el sol se vea iluminada
    por dentro en vez de como una piedra verde. Y el color por ruido le da
    variación mata a mata sin necesitar un material por mata: todo el follaje
    de la ciudad es una sola malla, así que un `Object Info` no serviría.
    """
    if nombre in _mats: return _mats[nombre]
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    nt = m.node_tree
    for nd in list(nt.nodes):
        if nd.type != "OUTPUT_MATERIAL": nt.nodes.remove(nd)
    sal = nt.nodes["Material Output"]
    gen = nt.nodes.new("ShaderNodeNewGeometry")
    nb = nt.nodes.new("ShaderNodeTexNoise")          # mata a mata
    nb.inputs["Scale"].default_value = 0.42; nb.inputs["Detail"].default_value = 3.0
    nf = nt.nodes.new("ShaderNodeTexNoise")          # moteado fino
    nf.inputs["Scale"].default_value = 5.5; nf.inputs["Detail"].default_value = 5.0
    for nn in (nb, nf): nt.links.new(gen.outputs["Position"], nn.inputs["Vector"])
    mez = nt.nodes.new("ShaderNodeMix"); mez.data_type = "FLOAT"
    mez.inputs["Factor"].default_value = 0.38
    nt.links.new(nb.outputs["Fac"], mez.inputs[2])
    nt.links.new(nf.outputs["Fac"], mez.inputs[3])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position = 0.30; cr.elements[0].color = (0.016, 0.038, 0.012, 1)
    cr.elements[1].position = 0.78; cr.elements[1].color = (0.140, 0.235, 0.052, 1)
    e = cr.elements.new(0.55); e.color = (0.055, 0.115, 0.028, 1)
    nt.links.new(mez.outputs[0], ramp.inputs["Fac"])
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); dif.inputs["Roughness"].default_value = 0.75
    tra = nt.nodes.new("ShaderNodeBsdfTranslucent")
    nt.links.new(ramp.outputs["Color"], dif.inputs["Color"])
    nt.links.new(ramp.outputs["Color"], tra.inputs["Color"])
    mx = nt.nodes.new("ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.26
    nt.links.new(dif.outputs["BSDF"], mx.inputs[1])
    nt.links.new(tra.outputs["BSDF"], mx.inputs[2])
    # relieve, que la mata no se vea como una superficie lisa
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.55
    nt.links.new(nf.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], dif.inputs["Normal"])
    nt.links.new(mx.outputs["Shader"], sal.inputs["Surface"])
    _mats[nombre] = m; return m

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

def caja(centro, tam, mat, uv=2.0, corr=(0.0, 0.0), giro=0.0):
    """Una caja. `corr` corre las UV y `giro` la rota en Z.

    El corrimiento de UV es lo que rompe el mosaico: los materiales se comparten
    entre los 49 edificios, así que sin esto el mismo azulejo de hormigón cae
    exactamente en el mismo lugar de todas las fachadas y se nota de una.
    """
    cx, cy, cz = centro
    sx, sy, sz = tam[0]/2, tam[1]/2, tam[2]/2
    l = LOTES.setdefault(mat.name, {"v":[], "f":[], "uv":[], "mat":mat, "u":uv or 2.0})
    base = len(l["v"])
    loc = [(-sx,-sy,+sz),(+sx,-sy,+sz),(+sx,+sy,+sz),(-sx,+sy,+sz),
           (-sx,-sy,-sz),(+sx,-sy,-sz),(+sx,+sy,-sz),(-sx,+sy,-sz)]
    if giro:
        c, sn = math.cos(giro), math.sin(giro)
        esq = [(cx + p[0]*c - p[1]*sn, cy + p[0]*sn + p[1]*c, cz + p[2]) for p in loc]
    else:
        esq = [(cx+p[0], cy+p[1], cz+p[2]) for p in loc]
    l["v"].extend(esq); u = l["u"]
    for idx, eje in CARAS:
        l["f"].append(tuple(base+i for i in idx))
        a, b = [k for k in (0,1,2) if k != eje]
        for i in idx:
            # las UV salen de la caja sin girar, más el corrimiento del lote
            p = loc[i]
            l["uv"].append(((p[a] + (cx, cy, cz)[a])/u + corr[0],
                            (p[b] + (cx, cy, cz)[b])/u + corr[1]))

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

def esfera(centro, r, mat, achatado=1.0, sacudir=0.0, sem=0):
    """Una icoesfera. `sacudir` mueve cada vértice a lo largo de su radio.

    Sin eso las copas se ven como pelotas de 80 caras, con las facetas
    marcadas: es lo primero que delata que la foto no es una foto.
    """
    cx, cy, cz = centro
    vs, fs = ICO
    l = LOTES.setdefault(mat.name, {"v":[], "f":[], "uv":[], "mat":mat, "u":1.0})
    base = len(l["v"])
    if sacudir:
        rr = random.Random(sem)
        radios = [r * (1.0 + rr.uniform(-sacudir, sacudir)) for _ in vs]
    else:
        radios = [r] * len(vs)
    l["v"].extend([(cx+x*radios[i], cy+y*radios[i], cz+z*radios[i]*achatado)
                   for i, (x,y,z) in enumerate(vs)])
    for (a, b, c) in fs:
        l["f"].append((base+a, base+b, base+c))
        for i in (a, b, c):
            x, y, z = vs[i]
            l["uv"].append((0.5 + math.atan2(y, x)/math.tau, 0.5 + math.asin(max(-1,min(1,z)))/math.pi))

def carta(centro, u, v, mat):
    """Un cuadrilátero con UV de 0 a 1, definido por dos medios ejes.

    Es la pieza del follaje: tres cartas cruzadas con una textura de hojas
    recortada por alfa se leen como una mata, y una esfera maciza no.
    """
    cx, cy, cz = centro
    l = LOTES.setdefault(mat.name, {"v":[], "f":[], "uv":[], "mat":mat, "u":1.0})
    base = len(l["v"])
    for (su, sv) in ((-1,-1), (1,-1), (1,1), (-1,1)):
        l["v"].append((cx + u[0]*su + v[0]*sv,
                       cy + u[1]*su + v[1]*sv,
                       cz + u[2]*su + v[2]*sv))
    l["f"].append((base, base+1, base+2, base+3))
    for co in ((0.0,0.0), (1.0,0.0), (1.0,1.0), (0.0,1.0)):
        l["uv"].append(co)

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
M_CALLE = pbr("calle", .25, mugre=(0.52, 1.18))
M_VEREDA= pbr("vereda", .5, mugre=(0.55, 1.16))
M_VIDRIO= liso("vidrio", (0.045,0.062,0.085), 0.55, 0.035)
M_INTS  = [liso("interior", (0.34,0.32,0.29), 0.0, 0.72, emis=(0.42,0.38,0.32), fuerza=1.0),
           liso("interior_b", (0.20,0.19,0.18), 0.0, 0.74, emis=(0.24,0.22,0.19), fuerza=0.7),
           liso("interior_c", (0.44,0.42,0.36), 0.0, 0.70, emis=(0.60,0.55,0.44), fuerza=1.5),
           liso("interior_d", (0.11,0.11,0.12), 0.0, 0.78),
           liso("interior_e", (0.52,0.50,0.46), 0.0, 0.66, emis=(0.70,0.66,0.56), fuerza=2.0)]
M_INT   = M_INTS[0]
M_PERSI = liso("persiana", (0.50,0.48,0.44), 0.0, 0.58)
# Es de día: el farol es una lente chica y apenas encendida, no una losa.
M_LUZ   = liso("luz", (0.72,0.70,0.66), 0, .35, emis=(1,0.92,0.76), fuerza=0.8)
M_GRIS  = liso("gris", (0.085,0.088,0.094), 0.15, 0.42)   # herrería urbana
M_NEGRO = liso("negro", (0.03,0.03,0.035), 0.0, 0.55)
M_PINT  = liso("pintura", (0.14,0.16,0.20), 0.35, 0.28)
M_ROJO  = liso("rojo", (0.32,0.05,0.05), 0.3, 0.3)
M_RAYA  = liso("raya", (0.46,0.455,0.44), 0.0, 0.62)   # pintura gastada, no blanco
M_TRONCO= liso("tronco", (0.150,0.122,0.098), 0.0, 0.80)   # corteza, no carbón
M_HOJA  = hoja_carta("hoja", WEB + "/hojas.png")
M_LEJOS = liso("lejos", (0.19,0.19,0.20), 0.0, 0.70)   # telón: no entra al splat
M_TOLDO = [liso("toldo_a", (0.30,0.05,0.06), 0, .5),
           liso("toldo_b", (0.05,0.14,0.26), 0, .5),
           liso("toldo_c", (0.10,0.22,0.12), 0, .5),
           liso("toldo_d", (0.36,0.26,0.05), 0, .5)]
M_CARTEL= [liso("cartel_a", (0.22,0.055,0.035), 0, .48, emis=(0.55,0.14,0.07), fuerza=0.5),
           liso("cartel_b", (0.035,0.10,0.20), 0, .48, emis=(0.06,0.22,0.45), fuerza=0.5),
           liso("cartel_c", (0.24,0.19,0.045), 0, .48, emis=(0.50,0.40,0.10), fuerza=0.5)]
M_SEMR  = liso("sem_rojo", (0.35,0.02,0.02), 0, .35, emis=(1.0,0.09,0.06), fuerza=3.0)
M_SEMV  = liso("sem_verde", (0.02,0.30,0.08), 0, .35, emis=(0.10,1.0,0.28), fuerza=3.0)

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
caja((0,0,-1.51), (24000,24000,3.0), M_LEJOS, uv=64)   # tapa justo por debajo
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
        # gris gastado y de 14 cm: en aluminio metálico el sol las hacía
        # reventar y en el splat quedaban como moteado blanco sobre el asfalto
        caja((k*13, d, 0.165), (4.2, 0.14, 0.015), M_RAYA, uv=1)
        caja((d, k*13, 0.165), (0.14, 4.2, 0.015), M_RAYA, uv=1)
        # carriles a los costados del eje, discontinuos más finos
        for sc in (-1, 1):
            caja((k*13, d + sc*4.3, 0.165), (3.0, 0.10, 0.015), M_RAYA, uv=1)
            caja((d + sc*4.3, k*13, 0.165), (0.10, 3.0, 0.015), M_RAYA, uv=1)
    # línea de borde continua contra el cordón
    for sc in (-1, 1):
        caja((0, d + sc*(CALZ/2 - 0.55), 0.165), (LARGO, 0.12, 0.015), M_RAYA, uv=1)
        caja((d + sc*(CALZ/2 - 0.55), 0, 0.165), (0.12, LARGO, 0.015), M_RAYA, uv=1)

# líneas de pare y sendas peatonales en las cuatro bocas de cada cruce
for dx in EJES:
    for dy in EJES:
        for s in (-1, 1):
            for k in range(7):
                t = -CALZ/2 + 1.2 + k*(CALZ-2.4)/6
                caja((dx+t, dy + s*(CALZ/2+1.6), 0.18), (1.1, 2.6, 0.03), M_RAYA, uv=1)
                caja((dx + s*(CALZ/2+1.6), dy+t, 0.18), (2.6, 1.1, 0.03), M_RAYA, uv=1)
            caja((dx, dy + s*(CALZ/2+3.4), 0.175), (CALZ-1.6, 0.34, 0.02), M_RAYA, uv=1)
            caja((dx + s*(CALZ/2+3.4), dy, 0.175), (0.34, CALZ-1.6, 0.02), M_RAYA, uv=1)

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
    # Cada edificio corre su propio mosaico. Los materiales se comparten entre
    # los 49, así que sin esto el mismo azulejo cae en el mismo lugar de todas
    # las fachadas: se ve el patrón repetido y es lo que más delata la escena.
    co = (r.uniform(0, 40), r.uniform(0, 40))
    caja((bx,by,alto/2), (ancho-1.6, prof-1.6, alto), piel, uv=3, corr=co)
    # planta baja: zócalo, vitrina y toldos
    caja((bx,by,2.4), (ancho+.5, prof+.5, 4.8), M_HORM, uv=2.5, corr=co)
    caja((bx,by,3.0), (ancho+.62, prof+.62, 2.6), M_VIDRIO, uv=0)
    # algo detrás de la vitrina: sin esto la planta baja es un hueco negro
    caja((bx,by,3.0), (ancho-0.5, prof-0.5, 2.5), M_INTS[4], uv=2)   # vidriera iluminada
    caja((bx,by,5.1), (ancho+1.5, prof+1.5, 0.32), M_ALU2, uv=1.5)   # marquesina
    car = r.choice(M_CARTEL)                                         # banda de cartel
    for sq in (-1, 1):
        caja((bx, by + sq*(prof/2+0.36), 4.62), (ancho*0.62, 0.10, 0.52), car, uv=1)
        caja((bx + sq*(ancho/2+0.36), by, 4.62), (0.10, prof*0.62, 0.52), car, uv=1)
    tol = r.choice(M_TOLDO)
    for s in (-1,1):
        caja((bx, by + s*(prof/2+1.05), 4.35), (ancho*0.55, 1.7, 0.09), tol, uv=1)
        caja((bx + s*(ancho/2+1.05), by, 4.35), (1.7, prof*0.55, 0.09), tol, uv=1)
    for i in range(1, pisos):
        z = i*PISO
        caja((bx,by,z+0.62), (ancho+.06, prof+.06, 1.24), M_ANTEP, uv=4, corr=co)
        # El interior partido en 3 x 3, cada trozo con su tono: mirando desde
        # afuera, cada bahía de vidrio da a un trozo distinto y la torre deja
        # de tener los 20 pisos idénticos. Alguno con la persiana baja.
        ai, pi = (ancho-1.5)/3.0, (prof-1.5)/3.0
        for ux in range(3):
            for uy in range(3):
                ix = bx - (ancho-1.5)/2 + ai*(ux+0.5)
                iy = by - (prof-1.5)/2 + pi*(uy+0.5)
                caja((ix, iy, z+2.5), (ai*0.98, pi*0.98, 2.4),
                     r.choice(M_INTS), uv=2.5)
                if r.random() < 0.16:
                    caja((ix, iy, z+3.35), (ai*1.02, pi*1.02, 0.9), M_PERSI, uv=1.2)
        caja((bx,by,z+2.55), (ancho+.10, prof+.10, 2.55), M_VIDRIO, uv=0)
        caja((bx,by,z+1.32), (ancho+.62, prof+.62, 0.13), M_ALU, uv=1.5)   # visera
        if i % 5 == 0:
            caja((bx,by,z+0.1), (ancho+1.3, prof+1.3, 0.45), M_HORM, uv=2, corr=co)  # cornisa
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
    caja((bx-ancho*0.16, by, alto+3.0), (mx, my, 3.2), piel, uv=2, corr=co)          # sala de máquinas
    caja((bx-ancho*0.16, by, alto+4.7), (mx+.4, my+.4, 0.3), M_ALU2, uv=1)
    for k in range(3):                                                       # equipos
        caja((bx+ancho*0.22, by-my/2+k*(my/2.4), alto+2.2), (2.4, 1.5, 1.3), M_ALU, uv=1)
        caja((bx+ancho*0.22, by-my/2+k*(my/2.4), alto+2.95), (2.0, 1.2, 0.12), M_NEGRO, uv=1)
    if pisos > 16:
        caja((bx+ancho*0.28, by+prof*0.28, alto+5.5), (0.9, 0.9, 8.0), M_ALU2, uv=1)  # mástil
        caja((bx+ancho*0.28, by+prof*0.28, alto+9.7), (0.5, 0.5, 0.5), M_ROJO, uv=0)
    caja((bx+ancho*0.05, by-prof*0.3, alto+2.6), (3.0, 3.0, 2.4), M_ALU2, uv=1.5)     # tanque
    if pisos > 15 and r.random() < 0.28:                                     # cartel de azotea
        car = r.choice(M_CARTEL)
        caja((bx, by + prof*0.30, alto+4.9), (ancho*0.62, 0.16, 2.0), car, uv=1)
        for k in range(3):
            caja((bx - ancho*0.24 + k*ancho*0.24, by + prof*0.30, alto+4.2),
                 (0.12, 0.30, 2.6), M_GRIS, uv=0.6)
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
    """Un árbol de matas chicas, no de tres pelotas.

    Tres icoesferas grandes se ven como pelotas de 80 caras: las facetas se
    marcan y es lo primero que delata la escena. Treinta matas de medio metro
    con los vértices sacudidos y el color variando por ruido se leen como una
    copa, y de paso el splat las agarra bien porque el follaje es justo donde
    una nube de gaussianas se ve natural.
    """
    r = random.Random(sem)
    h = r.uniform(4.6, 7.8)
    gr = r.uniform(0.30, 0.44)
    incl = r.uniform(-0.05, 0.05)
    # Tronco en tres tramos apilados de verdad. Como estaba, el tramo de arriba
    # terminaba en h*0,40 y la copa empezaba en h*0,86 menos el radio: quedaba
    # un hueco de dos metros y medio y las copas flotaban en el aire.
    H = h*0.88
    for k in range(3):
        f = (k + 0.5)/3.0
        caja((x + incl*H*f, y + incl*H*f*0.6, H*f),
             (gr*(1-0.18*k), gr*(1-0.18*k), H/3.0 + 0.04), M_TRONCO, uv=0.8,
             giro=r.uniform(0, 0.8))
    # ramas que entran en la copa
    ramas = []
    for k in range(r.randint(3, 5)):
        a = r.uniform(0, math.tau); lr = r.uniform(1.1, 2.2)
        ramas.append((a, lr))
        caja((x + math.cos(a)*lr*0.5, y + math.sin(a)*lr*0.5, h*0.86),
             (lr, gr*0.40, gr*0.40), M_TRONCO, uv=0.6, giro=a)
    # la copa: matas de tres cartas cruzadas, más densas hacia el borde
    rx = r.uniform(2.1, 3.3); rz = rx * r.uniform(0.60, 0.90)
    cz = H + rz*0.42
    for k in range(r.randint(24, 40)):
        u = r.uniform(0, math.tau); w = math.acos(r.uniform(-1, 1))
        rad = 0.42 + 0.58*math.sqrt(r.random())
        px = x + math.sin(w)*math.cos(u)*rx*rad
        py = y + math.sin(w)*math.sin(u)*rx*rad
        pz = cz + math.cos(w)*rz*rad
        t = r.uniform(0.55, 1.05)                 # medio lado de la mata
        # tres cartas cruzadas en direcciones al azar pero ortogonales
        a1 = r.uniform(0, math.tau); a2 = r.uniform(0, math.tau)
        e1 = (math.cos(a1), math.sin(a1), 0.0)
        e2 = (-math.sin(a1)*math.cos(a2), math.cos(a1)*math.cos(a2), math.sin(a2))
        e3 = (e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0])
        for (a, b) in ((e1, e2), (e2, e3), (e3, e1)):
            carta((px, py, pz), tuple(c*t for c in a), tuple(c*t for c in b), M_HOJA)

def arbusto(x, y, z, sem):
    """Lo mismo que la copa pero en chico, para que el macetero no sea un
    cuenco de hormigón vacío."""
    r = random.Random(sem)
    rr = r.uniform(0.42, 0.68)
    for k in range(r.randint(6, 11)):
        a = r.uniform(0, math.tau); w = math.acos(r.uniform(-1, 1))
        rad = 0.45 + 0.55*math.sqrt(r.random())
        px = x + math.sin(w)*math.cos(a)*rr*rad
        py = y + math.sin(w)*math.sin(a)*rr*rad
        pz = z + rr*0.85 + math.cos(w)*rr*rad*0.8
        t = r.uniform(0.24, 0.42)
        a1 = r.uniform(0, math.tau); a2 = r.uniform(0, math.tau)
        e1 = (math.cos(a1), math.sin(a1), 0.0)
        e2 = (-math.sin(a1)*math.cos(a2), math.cos(a1)*math.cos(a2), math.sin(a2))
        e3 = (e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0])
        for (u, v) in ((e1, e2), (e2, e3)):
            carta((px, py, pz), tuple(c*t for c in u), tuple(c*t for c in v), M_HOJA)

def semaforo(x, y, gx, gy, sem):
    """Semáforo de sección fina. El de antes tenía un brazo de 3,2 m de lado
    y a la altura de la calle parecía un andamio."""
    r = random.Random(sem)
    caja((x, y, 2.75), (0.13, 0.13, 5.5), M_GRIS, uv=0.6)                 # columna
    L = 2.4
    caja((x + gx*L/2, y + gy*L/2, 5.42),                                  # ménsula
         (abs(gx)*L + 0.10, abs(gy)*L + 0.10, 0.10), M_GRIS, uv=0.6)
    hx, hy = x + gx*L, y + gy*L
    caja((hx, hy, 4.86), (0.30, 0.30, 0.86), M_GRIS, uv=0.5)              # cabezal
    luz = M_SEMV if r.random() < 0.5 else M_SEMR
    dz = 0.27 if luz is M_SEMR else -0.27
    caja((hx - gy*0.16, hy + gx*0.16, 4.86 + dz), (0.19, 0.19, 0.19), luz, uv=0)
    caja((hx - gy*0.20, hy + gx*0.20, 4.86 + dz), (0.055, 0.055, 0.24), M_GRIS, uv=0.4)  # visera
    caja((x - gy*0.12, y + gx*0.12, 2.55), (0.24, 0.24, 0.42), M_GRIS, uv=0.4)  # peatonal

M_ROPA = [liso("ropa_a", (0.055,0.060,0.075), 0, .62), liso("ropa_b", (0.115,0.055,0.050), 0, .62),
          liso("ropa_c", (0.180,0.175,0.160), 0, .60), liso("ropa_d", (0.040,0.075,0.095), 0, .62),
          liso("ropa_e", (0.085,0.080,0.045), 0, .62)]
M_PIEL = liso("piel", (0.30,0.20,0.15), 0, .55)

def persona(x, y, sem):
    """Tres cajas y una cabeza. A veinte metros alcanza, y sin gente la calle
    no tiene con qué medirse: es lo que hace que una escena se lea como
    maqueta aunque las proporciones estén bien."""
    r = random.Random(sem)
    a = r.uniform(0, math.tau)
    h = r.uniform(1.60, 1.86)
    ropa = r.choice(M_ROPA)
    caja((x, y, h*0.22), (0.34, 0.24, h*0.44), r.choice(M_ROPA), uv=0.6, giro=a)  # piernas
    caja((x, y, h*0.62), (0.44, 0.26, h*0.36), ropa, uv=0.6, giro=a)             # torso
    caja((x, y, h*0.90), (0.19, 0.19, h*0.13), M_PIEL, uv=0.4, giro=a)           # cabeza
    if r.random() < 0.3:                                                          # mochila
        caja((x - math.sin(a)*0.20, y + math.cos(a)*0.20, h*0.66),
             (0.30, 0.16, 0.40), r.choice(M_ROPA), uv=0.5, giro=a)

nsem = 0
def acera(x, y, s, k, d, vertical):
    # el mismo equipamiento en los dos ejes; con vertical=True se giran las
    # piezas que no son cuadradas
    def cj(dx_, dy_, z, sx, sy, sz, mat, uv=1.0):
        if vertical: caja((y+dy_, x+dx_, z), (sy, sx, sz), mat, uv)
        else:        caja((x+dx_, y+dy_, z), (sx, sy, sz), mat, uv)
    # columna afinada, ménsula corta y luminaria chica mirando abajo: la losa
    # blanca emisiva de 2 m encendida de día era lo segundo que delataba todo
    cj(0, 0, 2.1, 0.16, 0.16, 4.2, M_GRIS, 0.6)
    cj(0, 0, 5.6, 0.11, 0.11, 3.0, M_GRIS, 0.6)
    cj(0, -s*0.55, 7.05, 0.09, 1.2, 0.09, M_GRIS, 0.5)
    cj(0, -s*1.05, 6.92, 0.30, 0.72, 0.13, M_GRIS, 0.5)
    cj(0, -s*1.05, 6.83, 0.22, 0.58, 0.05, M_LUZ, 0)
    if k % 3 == 0:                                               # macetero
        cj(6, 0, 0.30, 1.30, 1.00, 0.60, M_HORM, 1.2)            # cuenco
        cj(6, 0, 0.62, 1.36, 1.06, 0.08, M_HORM, 1.0)            # borde
        cj(6, 0, 0.66, 1.16, 0.86, 0.06, M_TRONCO, 0.6)          # tierra
        arbusto(y if vertical else x + 6, x + 6 if vertical else y, 0.70,
                int(d*3 + x*7 + s + (31 if vertical else 0)))
    if k % 4 == 1:                                               # buzón
        cj(-5, 0, 0.36, 0.14, 0.14, 0.72, M_GRIS, 0.5)           # pie
        cj(-5, 0, 0.92, 0.52, 0.40, 0.60, M_PINT, 0.8)           # cuerpo
        cj(-5, 0, 1.24, 0.54, 0.42, 0.08, M_PINT, 0.6)           # tapa
    if k % 2 == 0 and abs(x) < 260:
        arbol(y if vertical else x + 11, x + 11 if vertical else y,
              int(d*7 + x*3 + s + (17 if vertical else 0)))      # arbolado
    if k % 5 == 2:                                               # banco
        cj(2, 0, 0.48, 1.9, 0.55, 0.12, M_TRONCO)
        for b in (-1,1): cj(2+b*0.8, 0, 0.24, 0.12, 0.5, 0.48, M_NEGRO)
    if k % 7 == 3:                                               # cesto
        cj(-2, 0, 0.16, 0.10, 0.10, 0.32, M_GRIS, 0.4)
        cj(-2, 0, 0.62, 0.40, 0.36, 0.62, M_ALU2, 0.7)
        cj(-2, 0, 0.95, 0.44, 0.40, 0.05, M_GRIS, 0.4)
    rp = random.Random(int(d*13 + x*5 + s*3 + (77 if vertical else 0)))
    for _ in range(rp.randint(0, 3)):                            # gente
        ox, oy = rp.uniform(-9, 9), rp.uniform(-1.4, 1.4)
        if vertical: persona(y + oy, x + ox, rp.randint(0, 10**6))
        else:        persona(x + ox, y + oy, rp.randint(0, 10**6))

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
            # el panel va PARADO: así como estaba era una losa de vidrio
            # horizontal a 1,4 m, y de frente tapaba media calle
            caja((dx+12, dy - CALZ/2 - 3.8, 1.4), (4.6, 0.06, 2.2), M_VIDRIO, uv=0)
            for b in (-1, 1):
                caja((dx+12+b*2.3, dy - CALZ/2 - 3.0, 1.4), (0.06, 1.6, 2.2), M_VIDRIO, uv=0)
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

# Un anillo de bloques lisos de 380 a 900 m. No entran al splat —el recorte los
# deja afuera— pero sí a las fotos y a los reflejos de los vidrios, y sin ellos
# la avenida termina en una planicie vacía que delata que la ciudad se acaba.
M_LEJOS2 = pbr("hormigon", .5, (0.44,0.44,0.43), alias="fondo", mugre=(0.72, 1.06))
for k in range(150):
    a = random.uniform(0, math.tau)
    rr = random.uniform(380, 900)
    an = random.uniform(24, 60); pr = random.uniform(24, 60)
    al = random.uniform(18, 120) * (1.0 - 0.45*(rr-380)/520)
    caja((math.cos(a)*rr, math.sin(a)*rr, al/2), (an, pr, al), M_LEJOS2, uv=4,
         corr=(random.uniform(0,40), random.uniform(0,40)), giro=random.uniform(0, 1.57))

volcar()
mallas = [o for o in bpy.data.objects if o.type == "MESH"]
caras = sum(len(o.data.polygons) for o in mallas)
print("CIUDAD4: %d edificios (%d-%d m) · %d mallas · %d caras" % (
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
# Abajo del horizonte el HDRI es negro, y a 175 m de altura los rayos casi
# horizontales pasan de largo el telón y traen ese negro: en la toma aérea
# quedaba una banda negra arriba de la silueta. Se mezcla con bruma.
sep = nt.nodes.new("ShaderNodeSeparateXYZ")
nt.links.new(gir.outputs["Vector"], sep.inputs["Vector"])
mr = nt.nodes.new("ShaderNodeMapRange")
mr.inputs["From Min"].default_value = 0.010
mr.inputs["From Max"].default_value = -0.055
mr.inputs["To Min"].default_value = 0.0
mr.inputs["To Max"].default_value = 1.0
mr.clamp = True
nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
bru = nt.nodes.new("ShaderNodeMix"); bru.data_type = "RGBA"
bru.inputs["B"].default_value = (0.36, 0.40, 0.44, 1)
nt.links.new(env.outputs["Color"], bru.inputs["A"])
nt.links.new(mr.outputs["Result"], bru.inputs["Factor"])
nt.links.new(bru.outputs["Result"], nt.nodes["Background"].inputs["Color"])
# el cielo pesa más: con 1,0 las sombras se iban a negro y la foto
# quedaba con el contraste de una maqueta a contraluz
nt.nodes["Background"].inputs["Strength"].default_value = 2.1
bpy.context.scene.world = mundo

sol = bpy.data.lights.new("sol", type="SUN")
sol.energy = 2.5; sol.angle = math.radians(1.9)   # disco más grande: sombras menos duras
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
print("CIUDAD4: %d tomas" % len(vistas), flush=True)

esc = bpy.context.scene
esc.render.engine = "CYCLES"
esc.cycles.device = "CPU"
esc.cycles.samples = MUESTRAS
esc.cycles.use_denoising = False              # esta build no trae OpenImageDenoise
esc.cycles.max_bounces = 3
esc.cycles.transmission_bounces = 2
# el follaje son cartas con alfa: un rayo que cruza una copa atraviesa
# muchas superficies transparentes, y sin tope el tiempo por toma se va
esc.cycles.transparent_max_bounces = 4
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

bpy.ops.wm.save_as_mainfile(filepath="/home/neko/ciudad4.blend")
if SOLO_ESCENA:
    print("CIUDAD4: sólo escena, no se renderiza"); raise SystemExit

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
    print("CIUDAD4: toma %d/%d" % (i+1, len(vistas)), flush=True)

print("CIUDAD4: listo", flush=True)
