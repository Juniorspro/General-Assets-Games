"""Ralea un .splat: se queda con N gaussianas y agranda las que quedan.

Al sacar gaussianas hay que agrandar las que quedan o aparecen agujeros, y el
factor es la raíz de la razón, porque lo que hay que mantener es el área que
cada una tapa. Se agrandan sólo los dos ejes del plano: el tercero es el grosor
contra la normal, y engordarlo levanta la gaussiana de la superficie.

Con --centro y --r0 el raleo es RADIAL: densidad entera adentro del radio r0 y
cada vez más rala hacia el borde. Es lo que hace entrar un recorrido en primera
persona en un archivo: donde estás parado se ve fino, y lo de lejos, que igual
ocupa pocos píxeles, va grueso.

    python3 ralear.py ent.splat sal.splat 950000
    python3 ralear.py ent.splat sal.splat 950000 --centro 52,-52 --r0 35 --pmin 0.14
    python3 ralear.py ent.splat sal.splat 950000 --piso 1.2 --engrosar 0.34

Con --piso y --engrosar, a las gaussianas de abajo de esa altura se les sube el
grosor contra la normal hasta esa fracción del lado mayor. Es para caminar: un
disco apoyado en el asfalto, visto de canto desde 1,68 m, colapsa a una raya y
entre disco y disco se ve el fondo. Engordado no colapsa.
"""
import math, os, sys
import numpy as np

a = sys.argv
ENT, SAL, N = a[1], a[2], int(a[3])
def opc(k, d=None):
    return a[a.index(k)+1] if k in a else d
CEN = [float(v) for v in opc("--centro", "0,0").split(",")]
R0 = float(opc("--r0", "0"))
PMIN = float(opc("--pmin", "0.15"))
PISO = float(opc("--piso", "0"))
ENGR = float(opc("--engrosar", "0"))

b = np.fromfile(ENT, np.uint8)
n = len(b)//32
b = b[:n*32].reshape(n, 32)
if N >= n:
    print("SPLAT: %s ya tiene %d <= %d, se copia igual" % (ENT, n, N))
    b.tofile(SAL); raise SystemExit

f = b[:, :24].view(np.float32).reshape(n, 6)
rng = np.random.default_rng(20260909)

if R0 > 0:
    # distancia de Chebyshev, que es la forma del recorte
    r = np.maximum(np.abs(f[:,0] - CEN[0]), np.abs(f[:,2] - CEN[1]))
    r1 = float(r.max())
    t = np.clip((r - R0) / max(1e-6, r1 - R0), 0.0, 1.0)
    p = 1.0 - (1.0 - PMIN) * t          # 1 adentro de r0, PMIN en el borde
else:
    p = np.ones(n)

# escalar p para quedarse con N: k tal que sum(min(1, k*p)) = N
lo, hi = 0.0, 1.0/float(p.min())
for _ in range(60):
    k = (lo + hi)/2
    if np.minimum(1.0, k*p).sum() > N: hi = k
    else: lo = k
pk = np.minimum(1.0, ((lo+hi)/2) * p)
sel = rng.random(n) < pk
c = b[sel].copy()
m = len(c)
g = c[:, :24].view(np.float32).reshape(m, 6)
fac = (1.0/np.sqrt(pk[sel])).astype(np.float32)
g[:, 3] *= fac; g[:, 4] *= fac
if PISO > 0 and ENGR > 0:
    bajo = g[:, 1] < PISO
    g[bajo, 5] = np.maximum(g[bajo, 5], ENGR*np.maximum(g[bajo, 3], g[bajo, 4]))
    print("SPLAT: %d gaussianas de piso engrosadas a %.2f del lado" % (int(bajo.sum()), ENGR))
c.tofile(SAL)
print("SPLAT: %s · %d de %d gaussianas · %.1f MB · tamaño x%.2f a x%.2f" % (
      SAL, m, n, os.path.getsize(SAL)/1048576, fac.min(), fac.max()))
