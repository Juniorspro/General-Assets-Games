"""Convierte la ciudad (un .glb con mallas y texturas) en una nube de
gaussianas y escribe un .splat de verdad, del formato que leen los visores
que ya existen.

No es fotogrametría: un splat "real" se entrena con cientos de fotos y una
GPU, y acá no hay GPU. Esto es la otra mitad del asunto — el formato, la
matemática de las gaussianas y el rasterizador — con la escena que ya tengo.
Cada gaussiana queda apoyada sobre la superficie: dos ejes anchos en el plano
de la cara y uno finito en la normal, que es exactamente la forma que toman
las gaussianas entrenadas sobre una pared.
"""
import json, math, os, struct, sys, io
import numpy as np
from PIL import Image

GLB = sys.argv[1] if len(sys.argv) > 1 else "/tmp/telaraña/ciudad-raw.glb"
SALIDA = sys.argv[2] if len(sys.argv) > 2 else "/tmp/splat/ciudad.splat"
TOTAL = int(sys.argv[3]) if len(sys.argv) > 3 else 260000

# más densidad donde hay detalle que mirar, menos en el asfalto
PESO = {"hormigon":1.6, "hormigon_oscuro":1.3, "aluminio":1.9, "antepecho":1.9,
        "panel":1.6, "ladrillo":1.5, "vidrio":1.7, "interior":1.2,
        "calle":0.55, "vereda":0.7, "luz":2.5}

# El .glb trae un suelo de 4000 x 4000 m y, por cada piso, cajas cerradas de
# antepecho, vidrio e interior: sus caras de arriba y de abajo están tapadas
# para siempre. Un splat entrenado sólo tiene gaussianas donde la cámara vio
# algo, así que acá se recorta al distrito y se tiran las caras invisibles.
CAJA = 285.0                      # medio lado del distrito, en metros
SIN_TAPAS = {"antepecho", "interior", "vidrio", "aluminio", "panel"}

SOL = np.array([-0.62, 0.66, 0.42]); SOL /= np.linalg.norm(SOL)
CIELO = np.array([0.42, 0.55, 0.78])      # relleno azulado de arriba
SUELO = np.array([0.30, 0.26, 0.22])      # rebote cálido de abajo

# ---------------------------------------------------------------- glb
d = open(GLB, "rb").read()
off, js, bin_off = 12, None, None
while off < len(d):
    L, T = struct.unpack_from("<II", d, off)
    if T == 0x4E4F534A: js = json.loads(d[off+8:off+8+L])
    elif T == 0x004E4942: bin_off = off + 8
    off += 8 + L + ((4 - L % 4) % 4)

TIPO = {5120:np.int8, 5121:np.uint8, 5122:np.int16, 5123:np.uint16,
        5125:np.uint32, 5126:np.float32}
NC = {"SCALAR":1, "VEC2":2, "VEC3":3, "VEC4":4}

def acc(i):
    a = js["accessors"][i]
    v = js["bufferViews"][a["bufferView"]]
    t, n = TIPO[a["componentType"]], NC[a["type"]]
    o = bin_off + v.get("byteOffset", 0) + a.get("byteOffset", 0)
    paso = v.get("byteStride", 0)
    if not paso or paso == n * np.dtype(t).itemsize:
        return np.frombuffer(d, t, a["count"] * n, o).reshape(a["count"], n)
    crudo = np.frombuffer(d, np.uint8, v["byteLength"], bin_off + v.get("byteOffset",0))
    sal = np.empty((a["count"], n), t)
    base = a.get("byteOffset", 0)
    for k in range(a["count"]):
        sal[k] = np.frombuffer(crudo[base + k*paso : base + k*paso + n*np.dtype(t).itemsize], t)
    return sal

def imagen(idx):
    im = js["images"][idx]
    v = js["bufferViews"][im["bufferView"]]
    b = d[bin_off + v.get("byteOffset",0) : bin_off + v.get("byteOffset",0) + v["byteLength"]]
    return np.asarray(Image.open(io.BytesIO(b)).convert("RGB"), np.float32) / 255.0

# ---------------------------------------------------------------- reunir caras
tramos = []
area_total = 0.0
for m in js["meshes"]:
    for pr in m["primitives"]:
        mat = js["materials"][pr["material"]]
        nombre = mat.get("name", "?")
        P = acc(pr["attributes"]["POSITION"]).astype(np.float64)
        N = acc(pr["attributes"]["NORMAL"]).astype(np.float64)
        UV = acc(pr["attributes"]["TEXCOORD_0"]).astype(np.float64)
        I = acc(pr["indices"]).reshape(-1, 3).astype(np.int64)
        pbr = mat.get("pbrMetallicRoughness", {})
        factor = np.array(pbr.get("baseColorFactor", [1,1,1,1])[:3])
        tex = None
        if "baseColorTexture" in pbr:
            ti = pbr["baseColorTexture"]["index"]
            tex = imagen(js["textures"][ti]["source"])
        emis = np.array(mat.get("emissiveFactor", [0,0,0]))
        a, b, c = P[I[:,0]], P[I[:,1]], P[I[:,2]]
        cruz = np.cross(b-a, c-a)
        area = 0.5 * np.linalg.norm(cruz, axis=1)
        nor_cara = cruz / np.maximum(1e-12, np.linalg.norm(cruz, axis=1))[:,None]
        vivas = np.ones(len(I), bool)
        if nombre in SIN_TAPAS:
            vivas &= np.abs(nor_cara[:,1]) < 0.7        # fuera tapas y pisos
        # cuánto de cada cara cae dentro del distrito, por muestreo
        r = np.random.default_rng(7).random((len(I), 12, 2))
        sq = np.sqrt(r[:,:,0])
        pu = (1-sq)[:,:,None]*a[:,None,:] + (sq*(1-r[:,:,1]))[:,:,None]*b[:,None,:] \
             + (sq*r[:,:,1])[:,:,None]*c[:,None,:]
        adentro = ((np.abs(pu[:,:,0]) <= CAJA) & (np.abs(pu[:,:,2]) <= CAJA)).mean(1)
        vivas &= adentro > 0.02
        I = I[vivas]; area = (area[vivas] * adentro[vivas])
        if len(I) == 0: continue
        peso = PESO.get(nombre, 1.0)
        tramos.append(dict(nombre=nombre, P=P, N=N, UV=UV, I=I, area=area,
                           tex=tex, factor=factor, emis=emis, peso=peso))
        area_total += float(area.sum())
        print("%-18s %6d caras · %9.0f m² · peso %.2f · textura %s" % (
              nombre, len(I), area.sum(), peso, "sí" if tex is not None else "no"))

print("\nsuperficie total: %.0f m²" % area_total)
pond = sum(t["area"].sum() * t["peso"] for t in tramos)
espaciado = math.sqrt(area_total / TOTAL)
print("espaciado medio: %.2f m" % espaciado)

# ---------------------------------------------------------------- muestrear
rng = np.random.default_rng(20260907)
partes = []
for t in tramos:
    n = int(round(TOTAL * t["area"].sum() * t["peso"] / pond))
    if n < 1: continue
    # una cara con el doble de área recibe el doble de gaussianas
    acum = np.cumsum(t["area"]); acum /= acum[-1]
    cara = np.searchsorted(acum, rng.random(n))
    I = t["I"][cara]
    a, b, c = t["P"][I[:,0]], t["P"][I[:,1]], t["P"][I[:,2]]
    # baricéntricas uniformes sobre el triángulo
    r1, r2 = rng.random(n), rng.random(n)
    s = np.sqrt(r1)
    u = (1 - s)[:,None]; v = (s * (1 - r2))[:,None]; w = (s * r2)[:,None]
    pos = a*u + b*v + c*w

    dentro = (np.abs(pos[:,0]) <= CAJA) & (np.abs(pos[:,2]) <= CAJA)
    if not dentro.all():
        pos = pos[dentro]; I = I[dentro]
        u = u[dentro]; v = v[dentro]; w = w[dentro]
        n = len(pos)
        if n == 0: continue

    nor = t["N"][I[:,0]]*u + t["N"][I[:,1]]*v + t["N"][I[:,2]]*w
    nor /= np.maximum(1e-9, np.linalg.norm(nor, axis=1))[:,None]

    if t["tex"] is not None:
        uv = t["UV"][I[:,0]]*u + t["UV"][I[:,1]]*v + t["UV"][I[:,2]]*w
        h, wd, _ = t["tex"].shape
        px = np.clip((uv[:,0] % 1.0) * (wd-1), 0, wd-1).astype(np.int32)
        py = np.clip((1 - (uv[:,1] % 1.0)) * (h-1), 0, h-1).astype(np.int32)
        col = t["tex"][py, px] * t["factor"]
    else:
        col = np.repeat(t["factor"][None,:], n, 0)

    # el splat lleva la luz cocinada adentro, igual que uno entrenado
    lam = np.clip(nor @ SOL, 0, 1)[:,None]
    arriba = np.clip(nor[:,1:2], 0, 1)
    abajo = np.clip(-nor[:,1:2], 0, 1)
    luz = 0.78 * lam + CIELO[None,:] * (0.30 + 0.22*arriba) + SUELO[None,:] * 0.18 * abajo
    rgb = np.clip(col * luz + t["emis"][None,:] * 0.9, 0, 1)

    # ejes: dos anchos sobre el plano de la cara, uno finito en la normal
    ex = np.cross(nor, np.array([0.0, 1.0, 0.0]))
    flojo = np.linalg.norm(ex, axis=1) < 1e-4
    ex[flojo] = np.cross(nor[flojo], np.array([1.0, 0.0, 0.0]))
    ex /= np.maximum(1e-9, np.linalg.norm(ex, axis=1))[:,None]
    ey = np.cross(nor, ex)

    esc_plano = espaciado * 0.62 / math.sqrt(max(0.25, t["peso"]))
    esc = np.empty((n, 3))
    esc[:,0] = esc_plano * rng.uniform(0.85, 1.25, n)
    esc[:,1] = esc_plano * rng.uniform(0.85, 1.25, n)
    esc[:,2] = max(0.02, esc_plano * 0.09)

    # matriz [ex ey nor] -> cuaternión (w,x,y,z)
    M = np.stack([ex, ey, nor], axis=2)          # columnas = ejes locales
    tr = M[:,0,0] + M[:,1,1] + M[:,2,2]
    q = np.empty((n, 4))
    k0 = tr > 0
    S = np.sqrt(np.maximum(1e-12, tr[k0] + 1.0)) * 2
    q[k0,0] = 0.25*S; q[k0,1] = (M[k0,2,1]-M[k0,1,2])/S
    q[k0,2] = (M[k0,0,2]-M[k0,2,0])/S; q[k0,3] = (M[k0,1,0]-M[k0,0,1])/S
    resto = ~k0
    if resto.any():
        # el caso degenerado se resuelve por el eje dominante de la diagonal
        Mr = M[resto]; nr = Mr.shape[0]
        qq = np.empty((nr,4))
        d0, d1, d2 = Mr[:,0,0], Mr[:,1,1], Mr[:,2,2]
        c1 = (d0 > d1) & (d0 > d2)
        c2 = (~c1) & (d1 > d2)
        c3 = ~(c1 | c2)
        for sel, (i,j,k) in ((c1,(0,1,2)), (c2,(1,2,0)), (c3,(2,0,1))):
            if not sel.any(): continue
            Ms = Mr[sel]
            S = np.sqrt(np.maximum(1e-12, 1.0 + Ms[:,i,i] - Ms[:,j,j] - Ms[:,k,k])) * 2
            qq[sel,0] = (Ms[:,k,j] - Ms[:,j,k]) / S
            qq[sel,1+i] = 0.25 * S
            qq[sel,1+j] = (Ms[:,j,i] + Ms[:,i,j]) / S
            qq[sel,1+k] = (Ms[:,k,i] + Ms[:,i,k]) / S
        q[resto] = qq
    q /= np.maximum(1e-9, np.linalg.norm(q, axis=1))[:,None]

    alfa = np.full(n, 0.92)
    if t["nombre"] == "vidrio": alfa[:] = 0.78
    partes.append((pos, esc, rgb, alfa, q))
    print("  %-18s %7d gaussianas · σ %.2f m" % (t["nombre"], n, esc_plano))

pos = np.concatenate([p[0] for p in partes])
esc = np.concatenate([p[1] for p in partes])
rgb = np.concatenate([p[2] for p in partes])
alf = np.concatenate([p[3] for p in partes])
qua = np.concatenate([p[4] for p in partes])
n = len(pos)

# ---------------------------------------------------------------- .splat
# 32 bytes por gaussiana: 3 float32 posición, 3 float32 escala lineal,
# 4 bytes RGBA, 4 bytes cuaternión (w,x,y,z) mapeado de [-1,1] a [0,255].
# Es el formato de antimatter15/splat, el que leen los visores de por ahí.
buf = bytearray(n * 32)
mv = memoryview(buf)
np.frombuffer(mv[0:], np.float32, n*3, 0).reshape(n,3)  # sólo para fijar el layout
f = np.zeros((n, 8), np.float32)
f[:, 0:3] = pos
f[:, 3:6] = esc
b = np.zeros((n, 8), np.uint8)
b[:, 0:3] = np.round(rgb * 255)
b[:, 3] = np.round(alf * 255)
b[:, 4:8] = np.clip(np.round(qua * 128 + 128), 0, 255)
crudo = np.empty((n, 32), np.uint8)
crudo[:, 0:24] = f[:, 0:6].copy().view(np.uint8).reshape(n, 24)
crudo[:, 24:32] = b[:, 0:8]
open(SALIDA, "wb").write(crudo.tobytes())

print("\n%s · %d gaussianas · %.2f MB" % (SALIDA, n, os.path.getsize(SALIDA)/1024/1024))
print("caja: x %.0f..%.0f  y %.0f..%.0f  z %.0f..%.0f" % (
    pos[:,0].min(), pos[:,0].max(), pos[:,1].min(), pos[:,1].max(),
    pos[:,2].min(), pos[:,2].max()))
json.dump({"n": n, "centro": [float(pos[:,0].mean()), float(pos[:,1].mean()), float(pos[:,2].mean())],
           "min": pos.min(0).tolist(), "max": pos.max(0).tolist()},
          open(os.path.splitext(SALIDA)[0] + ".json", "w"))
