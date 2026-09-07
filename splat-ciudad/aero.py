# Un mundo Frutiger Aero, y el equipo de cámaras que lo fotografía.
#
# El cielo NO es procedural: es un panorama equirectangular generado con Rezona
# (assets/cielo360-g1.png) y puesto como entorno del mundo, así que además de
# verse alrededor es lo que ILUMINA la escena entera. El resto —la laguna, las
# islas, las palmeras, las burbujas, el cromo, los paneles de vidrio— se arma
# acá con las mismas piezas que la ciudad: cajas, icoesferas y cartas con alfa.
#
# La lógica del splat no cambia: 184 tomas con Cycles guardando color y
# PROFUNDIDAD, y después proyectar.py pinta las gaussianas con esas fotos.
import bpy, json, math, os, random, sys

WEB = "/home/neko/tex"
SEMILLA = 20260910
SALIDA = "/home/neko/aero"
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

import numpy as np

# ----------------------------------------------------------- materiales
def liso_ext(nombre, color, metal, rug, trans=0.0, ior=1.45, pelicula=0.0):
    """Principled con transmisión y película fina, que es de lo que están
    hechas las burbujas: la iridiscencia sale de la interferencia en la
    película, no de un degradé pintado."""
    if nombre in _mats: return _mats[nombre]
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rug
    for nom, val in (("Transmission Weight", trans), ("IOR", ior),
                     ("Thin Film Thickness", pelicula), ("Thin Film IOR", 1.33)):
        if nom in b.inputs: b.inputs[nom].default_value = val
    _mats[nombre] = m; return m

def ruidoso(nombre, c1, c2, rug, escala=0.06, metal=0.0):
    """Color de un ruido en coordenadas del mundo. Sin esto el pasto y la
    arena son un plano de un solo color y se nota de una."""
    if nombre in _mats: return _mats[nombre]
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    gen = nt.nodes.new("ShaderNodeNewGeometry")
    n1 = nt.nodes.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = escala
    n1.inputs["Detail"].default_value = 6.0
    n2 = nt.nodes.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = escala*11
    n2.inputs["Detail"].default_value = 5.0
    for nn in (n1, n2): nt.links.new(gen.outputs["Position"], nn.inputs["Vector"])
    mez = nt.nodes.new("ShaderNodeMix"); mez.data_type = "FLOAT"
    mez.inputs["Factor"].default_value = 0.40
    nt.links.new(n1.outputs["Fac"], mez.inputs[2])
    nt.links.new(n2.outputs["Fac"], mez.inputs[3])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.30; ramp.color_ramp.elements[0].color = (*c1, 1)
    ramp.color_ramp.elements[1].position = 0.72; ramp.color_ramp.elements[1].color = (*c2, 1)
    nt.links.new(mez.outputs[0], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rug
    b.inputs["Metallic"].default_value = metal
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    nt.links.new(n2.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    _mats[nombre] = m; return m

def agua(nombre):
    """La laguna: turquesa, poco rugosa, algo transmisiva, con ondas de ruido.
    No del todo espejo a propósito: una superficie puramente especular depende
    del punto de vista, y el proyector promedia siete cámaras, así que un
    espejo perfecto se le convierte en papilla."""
    if nombre in _mats: return _mats[nombre]
    m = bpy.data.materials.new(nombre); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.020, 0.300, 0.290, 1)
    b.inputs["Roughness"].default_value = 0.075
    b.inputs["IOR"].default_value = 1.333
    if "Transmission Weight" in b.inputs: b.inputs["Transmission Weight"].default_value = 0.30
    gen = nt.nodes.new("ShaderNodeNewGeometry")
    on = nt.nodes.new("ShaderNodeTexNoise")
    on.inputs["Scale"].default_value = 0.55; on.inputs["Detail"].default_value = 7.0
    nt.links.new(gen.outputs["Position"], on.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.13
    bump.inputs["Distance"].default_value = 0.06
    nt.links.new(on.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    _mats[nombre] = m; return m

M_AGUA   = agua("agua")
M_ARENA  = ruidoso("arena", (0.34,0.31,0.22), (0.60,0.55,0.40), 0.62, escala=0.30)
M_PASTO  = ruidoso("pasto", (0.030,0.155,0.014), (0.135,0.400,0.038), 0.50, escala=0.28)
M_ROCA   = ruidoso("roca", (0.24,0.24,0.25), (0.52,0.52,0.50), 0.45, escala=0.35)
M_BURBU  = liso_ext("burbuja", (0.94,0.98,1.0), 0.0, 0.02, trans=1.0, ior=1.06, pelicula=430.0)
M_CROMO  = liso_ext("cromo", (0.94,0.96,0.98), 1.0, 0.035)
M_VIDRIO = liso_ext("vidrio_aero", (0.42,0.86,0.86), 0.0, 0.03, trans=0.86, ior=1.45)
M_BLANCO = liso("blanco", (0.72,0.76,0.78), 0.0, 0.10)
M_MADERA = ruidoso("madera", (0.20,0.115,0.055), (0.44,0.28,0.135), 0.42, escala=0.9)
M_FLOR   = liso("flor", (0.85,0.42,0.62), 0.0, 0.28)
M_NENU   = liso("nenufar", (0.075,0.30,0.055), 0.0, 0.22)
M_TRONCO = ruidoso("tronco_p", (0.17,0.12,0.075), (0.40,0.31,0.20), 0.62, escala=1.4)
M_FRONDA = hoja_carta("hoja_trop", WEB + "/fronda.png")
M_PASTOC = hoja_carta("pasto_carta", WEB + "/pasto.png")

# ----------------------------------------------------------- el mundo
MAR = 620.0        # hasta dónde llega el agua
CAJA_MUNDO = 130.0 # el pedazo con detalle

def plano(cx, cy, cz, sx, sy, mat, uv=6.0):
    """Un cuadrilátero horizontal mirando arriba."""
    l = LOTES.setdefault(mat.name, {"v":[], "f":[], "uv":[], "mat":mat, "u":uv or 1.0})
    b = len(l["v"])
    p = [(cx-sx/2, cy-sy/2, cz), (cx+sx/2, cy-sy/2, cz),
         (cx+sx/2, cy+sy/2, cz), (cx-sx/2, cy+sy/2, cz)]
    l["v"].extend(p)
    l["f"].append((b, b+1, b+2, b+3))
    for q in p: l["uv"].append((q[0]/l["u"], q[1]/l["u"]))

def monte(cx, cy, R, H, sem, mat, sectores=30, anillos=11):
    """Una loma: rejilla polar con una campana y ruido encima. Baja hasta el
    fondo del mar, así que la orilla sale sola donde corta el agua."""
    r = random.Random(sem)
    ruido = [[r.uniform(-1, 1) for _ in range(sectores)] for _ in range(anillos+1)]
    l = LOTES.setdefault(mat.name, {"v":[], "f":[], "uv":[], "mat":mat, "u":6.0})
    base = len(l["v"])
    def alto(i, j):
        t = i/anillos
        h = H*(1.0 - t*t)**1.6 - 5.0*t*t
        return h + ruido[i][j % sectores]*H*0.11*(1.0-t*0.7)
    for i in range(anillos+1):
        rad = R*i/anillos
        for j in range(sectores):
            a = j/sectores*math.tau
            l["v"].append((cx + math.cos(a)*rad, cy + math.sin(a)*rad, alto(i, j)))
    for i in range(anillos):
        for j in range(sectores):
            j2 = (j+1) % sectores
            a = base + i*sectores + j; b = base + i*sectores + j2
            c = base + (i+1)*sectores + j2; d = base + (i+1)*sectores + j
            l["f"].append((a, b, c, d))
            for k in (a, b, c, d):
                v = l["v"][k]; l["uv"].append((v[0]/l["u"], v[1]/l["u"]))
    return alto

def altura_monte(mts, x, y):
    """A qué altura está el terreno, para apoyar cosas encima."""
    mejor = -5.0
    for (cx, cy, R, H, f) in mts:
        d = math.hypot(x-cx, y-cy)
        if d < R*0.97:
            t = d/R
            h = H*(1.0 - t*t)**1.6 - 5.0*t*t
            mejor = max(mejor, h)
    return mejor

# fondo de arena, laguna y telón lejano
plano(0, 0, -4.4, 2*MAR, 2*MAR, M_ARENA, uv=9)
plano(0, 0, 0.0, 2*MAR, 2*MAR, M_AGUA, uv=14)

# las islas
montes = []
for (cx, cy, R, H) in [(-58, 44, 46, 12.5), (62, -38, 52, 15.0), (18, 78, 34, 8.5),
                       (-74, -62, 40, 10.0), (96, 66, 30, 7.0), (-10, -8, 22, 5.2)]:
    f = monte(cx, cy, R, H, int(cx*7+cy), M_PASTO)
    montes.append((cx, cy, R, H, f))

# ----------------------------------------------------------- vegetación
def palmera(x, y, z, sem):
    """Tronco curvo de cajas y una corona de frondas cruzadas."""
    r = random.Random(sem)
    h = r.uniform(6.5, 13.0)
    incl = r.uniform(-0.10, 0.10)
    tramos = 7
    for k in range(tramos):
        t = (k + 0.5)/tramos
        caja((x + incl*h*t*t*3.2, y + incl*h*t*t*2.0, z + h*t),
             (0.52-0.26*t, 0.52-0.26*t, h/tramos + 0.05), M_TRONCO, uv=1.0,
             giro=r.uniform(0, 0.7))
    cx = x + incl*h*3.2; cy = y + incl*h*2.0; cz = z + h
    for k in range(r.randint(11, 17)):
        a = r.uniform(0, math.tau)
        caida = r.uniform(0.10, 0.55)
        L = r.uniform(3.4, 6.2)
        u = (math.cos(a)*L, math.sin(a)*L, -caida*L)
        v = (-math.sin(a)*L*0.34, math.cos(a)*L*0.34, 0.0)
        carta((cx + u[0]*0.55, cy + u[1]*0.55, cz + u[2]*0.55 + 0.5),
              tuple(c*0.55 for c in u), v, M_FRONDA)
    caja((cx, cy, cz + 0.35), (0.7, 0.7, 0.7), M_TRONCO, uv=0.8)

def mata(x, y, z, sem, alto=1.5):
    r = random.Random(sem)
    for k in range(r.randint(2, 4)):
        a = r.uniform(0, math.tau); t = alto*r.uniform(0.7, 1.3)
        e1 = (math.cos(a)*t, math.sin(a)*t, 0.0)
        e2 = (0.0, 0.0, t)
        carta((x + r.uniform(-0.4,0.4), y + r.uniform(-0.4,0.4), z + t*0.85),
              e1, e2, M_PASTOC)

for k in range(96):
    a = random.uniform(0, math.tau); rr = random.uniform(0, 118)
    x, y = math.cos(a)*rr, math.sin(a)*rr
    h = altura_monte(montes, x, y)
    if h > 0.6: palmera(x, y, h - 0.3, k*13+7)
for k in range(4200):
    a = random.uniform(0, math.tau); rr = random.uniform(0, 125)
    x, y = math.cos(a)*rr, math.sin(a)*rr
    h = altura_monte(montes, x, y)
    if h > 0.35: mata(x, y, h - 0.10, k*29+3, alto=random.uniform(0.30, 0.85))

for k in range(420):                                 # flores
    a = random.uniform(0, math.tau); rr = random.uniform(0, 122)
    x, y = math.cos(a)*rr, math.sin(a)*rr
    h = altura_monte(montes, x, y)
    if h < 0.5: continue
    esfera((x, y, h + random.uniform(0.25, 0.7)), random.uniform(0.10, 0.26),
           M_FLOR if random.random() < 0.6 else M_BLANCO,
           achatado=random.uniform(0.5, 0.9), sacudir=0.25, sem=k*23+9)

# ----------------------------------------------------------- burbujas
for k in range(360):
    a = random.uniform(0, math.tau)
    rr = random.uniform(3, 128)
    x, y = math.cos(a)*rr, math.sin(a)*rr
    z = random.uniform(0.2, 26.0) * random.random()**0.6 + 0.25
    r0 = random.uniform(0.14, 1.5) * (0.5 + 0.5*random.random())
    esfera((x, y, z), r0, M_BURBU, achatado=random.uniform(0.92, 1.06),
           sacudir=0.02, sem=k*7+1)

# ----------------------------------------------------------- cromo y vidrio
for k in range(16):
    a = random.uniform(0, math.tau); rr = random.uniform(12, 110)
    x, y = math.cos(a)*rr, math.sin(a)*rr
    h = max(0.0, altura_monte(montes, x, y))
    R = random.uniform(1.6, 4.6)
    for j in range(random.randint(2, 4)):
        esfera((x + random.uniform(-R,R)*0.5, y + random.uniform(-R,R)*0.5,
                h + R*random.uniform(0.5, 1.3)),
               R*random.uniform(0.5, 1.0), M_CROMO,
               achatado=random.uniform(0.7, 1.15), sacudir=0.05, sem=k*31+j)

for k in range(22):
    a = random.uniform(0, math.tau); rr = random.uniform(14, 115)
    x, y = math.cos(a)*rr, math.sin(a)*rr
    z = random.uniform(2.0, 22.0)
    an = random.uniform(3.0, 9.0); al = an*random.uniform(0.55, 0.8)
    g = random.uniform(0, math.tau)
    caja((x, y, z), (an, 0.10, al), M_VIDRIO, uv=2.0, giro=g)
    caja((x, y, z + al/2), (an+0.16, 0.16, 0.16), M_BLANCO, uv=1.0, giro=g)
    caja((x, y, z - al/2), (an+0.16, 0.16, 0.16), M_BLANCO, uv=1.0, giro=g)

# ----------------------------------------------------------- nenúfares y piedras
for k in range(190):
    a = random.uniform(0, math.tau); rr = random.uniform(6, 126)
    x, y = math.cos(a)*rr, math.sin(a)*rr
    if altura_monte(montes, x, y) > -0.2: continue
    R = random.uniform(0.7, 2.1)
    esfera((x, y, 0.06), R, M_NENU, achatado=0.045, sacudir=0.12, sem=k*17+5)
    if random.random() < 0.28:
        esfera((x + R*0.2, y, 0.35), R*0.28, M_FLOR, achatado=0.7, sacudir=0.2, sem=k*3)
for k in range(150):
    a = random.uniform(0, math.tau); rr = random.uniform(4, 124)
    x, y = math.cos(a)*rr, math.sin(a)*rr
    h = altura_monte(montes, x, y)
    esfera((x, y, max(-0.15, h) + 0.1), random.uniform(0.3, 1.4),
           M_BLANCO if random.random() < 0.5 else M_ROCA,
           achatado=random.uniform(0.35, 0.6), sacudir=0.18, sem=k*11)

# ----------------------------------------------------------- pasarela de madera
def pasarela(x0, y0, x1, y1, sem):
    r = random.Random(sem)
    L = math.hypot(x1-x0, y1-y0)
    n = int(L/0.6)
    a = math.atan2(y1-y0, x1-x0)
    for k in range(n):
        t = (k+0.5)/n
        x = x0 + (x1-x0)*t; y = y0 + (y1-y0)*t
        caja((x, y, 1.05), (0.55, 3.2, 0.10), M_MADERA, uv=1.2, giro=a)
        if k % 7 == 0:
            for s in (-1, 1):
                caja((x - math.sin(a)*s*1.65, y + math.cos(a)*s*1.65, 0.1),
                     (0.22, 0.22, 2.4), M_MADERA, uv=0.8, giro=a)
                caja((x - math.sin(a)*s*1.65, y + math.cos(a)*s*1.65, 1.85),
                     (0.14, 0.14, 1.5), M_MADERA, uv=0.8, giro=a)
        if k % 7 == 3:
            for s in (-1, 1):
                caja((x - math.sin(a)*s*1.65, y + math.cos(a)*s*1.65, 2.5),
                     (0.6, 0.12, 0.12), M_MADERA, uv=0.8, giro=a)

pasarela(-30, 6, 44, -26, 1)
pasarela(-30, 6, -50, 40, 2)
pasarela(44, -26, 16, 66, 3)

volcar()
# Sombreado suave en lo redondo. Sin esto las lomas son un abanico de
# triángulos y las burbujas son poliedros: es lo primero que se ve.
SUAVES = {"pasto", "arena", "agua", "burbuja", "cromo", "blanco", "roca",
          "nenufar", "flor"}
for ob in bpy.data.objects:
    if ob.type != "MESH" or not ob.data.materials: continue
    if ob.data.materials[0].name in SUAVES:
        for p in ob.data.polygons: p.use_smooth = True

mallas = [o for o in bpy.data.objects if o.type == "MESH"]
caras = sum(len(o.data.polygons) for o in mallas)
print("AERO: %d mallas · %d caras" % (len(mallas), caras), flush=True)
cajas = []

# ----------------------------------------------------------- cielo de Rezona
# El panorama viene en 1376x768, y una equirectangular tiene que ser 2:1 o el
# mapeo sale estirado en vertical. Se recorta al medio: lo que se pierde es
# cenit y nadir, que acá son cielo liso y agua lisa.
# El panorama viene en 1376x768 y una equirectangular tiene que ser 2:1, o el
# mapeo sale estirado en vertical. Se recorta al medio —lo que se pierde es
# cenit y nadir, que acá son cielo liso y agua lisa— y el recorte se GUARDA en
# disco: una imagen generada en memoria le salía negra a Cycles.
src = bpy.data.images.load(WEB + "/cielo360.png")
W0, H0 = src.size
H1 = W0 // 2
ruta2a1 = WEB + "/cielo360_2a1.png"
if H1 < H0 and not os.path.exists(ruta2a1):
    todo = np.empty(W0*H0*4, np.float32)
    src.pixels.foreach_get(todo)
    todo = todo.reshape(H0, W0, 4)
    y0 = (H0 - H1)//2
    rec = bpy.data.images.new("cielo2a1", W0, H1, alpha=False, float_buffer=True)
    rec.pixels.foreach_set(todo[y0:y0+H1].ravel().copy())
    rec.filepath_raw = ruta2a1
    rec.file_format = "PNG"
    rec.save()
    print("AERO: panorama %dx%d recortado a %dx%d (2:1)" % (W0, H0, W0, H1), flush=True)
env_img = bpy.data.images.load(ruta2a1) if os.path.exists(ruta2a1) else src
env_img.colorspace_settings.name = "sRGB"

mundo = bpy.data.worlds.new("aero"); mundo.use_nodes = True
nt = mundo.node_tree
env = nt.nodes.new("ShaderNodeTexEnvironment")
env.image = env_img
gir = nt.nodes.new("ShaderNodeMapping")
gir.inputs["Rotation"].default_value = (0, 0, math.radians(196))
crd = nt.nodes.new("ShaderNodeTexCoord")
nt.links.new(crd.outputs["Generated"], gir.inputs["Vector"])
nt.links.new(gir.outputs["Vector"], env.inputs["Vector"])
nt.links.new(env.outputs["Color"], nt.nodes["Background"].inputs["Color"])
nt.nodes["Background"].inputs["Strength"].default_value = 1.0
bpy.context.scene.world = mundo

# el panorama trae el sol pintado pero no ilumina como un sol: hace falta uno
sol = bpy.data.lights.new("sol", type="SUN")
sol.energy = 1.9; sol.angle = math.radians(2.6)
sol.color = (1.0, 0.97, 0.90)
obsol = bpy.data.objects.new("sol", sol)
obsol.rotation_euler = (math.radians(38), math.radians(-6), math.radians(-118))
bpy.context.collection.objects.link(obsol)

# ----------------------------------------------------------- cámaras
# Cuatro familias: paseo (a la altura de los ojos, sobre la pasarela y las
# islas), laguna (bajitas sobre el agua), media altura y aéreas.
vistas = []
def agregar(x, y, z, yaw, pitch):
    vistas.append((x, y, z, yaw, pitch))

for k in range(56):                                  # paseo
    t = random.random()
    if t < 0.55:
        u = random.random()
        x = -30 + (44+30)*u; y = 6 + (-26-6)*u
        x += random.uniform(-1.4, 1.4); y += random.uniform(-1.4, 1.4)
        z = 2.75
    else:
        a = random.uniform(0, math.tau); rr = random.uniform(0, 105)
        x, y = math.cos(a)*rr, math.sin(a)*rr
        h = altura_monte(montes, x, y)
        if h < 0.4: continue
        z = h + 1.72
    agregar(x, y, z, random.uniform(0, math.tau), random.uniform(-0.14, 0.22))
for k in range(46):                                  # sobre la laguna
    a = random.uniform(0, math.tau); rr = random.uniform(8, 126)
    agregar(math.cos(a)*rr, math.sin(a)*rr, random.uniform(1.2, 6.0),
            random.uniform(0, math.tau), random.uniform(-0.30, 0.12))
for k in range(48):                                  # media altura
    a = random.uniform(0, math.tau); rr = random.uniform(20, 140)
    agregar(math.cos(a)*rr, math.sin(a)*rr, random.uniform(9, 34),
            a + math.pi + random.uniform(-0.7, 0.7), random.uniform(-0.55, -0.05))
for k in range(34):                                  # aéreas
    a = k/34*math.tau + random.uniform(-0.06, 0.06)
    rr = random.uniform(70, 185)
    agregar(math.cos(a)*rr, math.sin(a)*rr, random.uniform(48, 145),
            a + math.pi, random.uniform(-0.85, -0.30))
random.shuffle(vistas)
vistas = vistas[:VISTAS]
print("AERO: %d tomas" % len(vistas), flush=True)

esc = bpy.context.scene
esc.render.engine = "CYCLES"
esc.cycles.device = "CPU"
esc.cycles.samples = MUESTRAS
esc.cycles.use_denoising = False              # esta build no trae OpenImageDenoise
esc.cycles.max_bounces = 5   # hay agua y vidrio: con 3 se ven negros
esc.cycles.transmission_bounces = 6
# el follaje son cartas con alfa: un rayo que cruza una copa atraviesa
# muchas superficies transparentes, y sin tope el tiempo por toma se va
esc.cycles.transparent_max_bounces = 4
# muestreo adaptativo con el umbral flojo: el color de cada gaussiana se
# promedia después sobre 3x3 píxeles y varias cámaras, así que el ruido por
# píxel importa mucho menos que el tiempo por toma
esc.cycles.use_adaptive_sampling = True
esc.cycles.adaptive_threshold = float(sys.argv[sys.argv.index("--umbral")+1]) if "--umbral" in sys.argv else 0.025
esc.cycles.adaptive_min_samples = 16
esc.cycles.light_sampling_threshold = 0.02
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

bpy.ops.wm.save_as_mainfile(filepath="/home/neko/aero.blend")
if SOLO_ESCENA:
    print("AERO: sólo escena, no se renderiza"); raise SystemExit

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
    print("AERO: toma %d/%d" % (i+1, len(vistas)), flush=True)

print("AERO: listo", flush=True)
