"""Ralea un .splat: se queda con N gaussianas al azar y las agranda.

Al sacar gaussianas hay que agrandar las que quedan o aparecen agujeros, y el
factor es la raíz de la razón, porque lo que hay que mantener es el área que
cada una tapa. Se agrandan sólo los dos ejes del plano: el tercero es el grosor
contra la normal, y engordarlo levanta la gaussiana de la superficie.

    python3 ralear.py entrada.splat salida.splat 450000
"""
import math, os, sys
import numpy as np

ENT, SAL, N = sys.argv[1], sys.argv[2], int(sys.argv[3])
b = np.fromfile(ENT, np.uint8)
n = len(b)//32
b = b[:n*32].reshape(n, 32)
if N >= n:
    print("SPLAT: %s ya tiene %d <= %d, se copia igual" % (ENT, n, N))
    b.tofile(SAL); raise SystemExit
rng = np.random.default_rng(20260908)
sel = rng.choice(n, N, replace=False)
sel.sort()
c = b[sel].copy()
f = c[:, :24].view(np.float32).reshape(N, 6)
k = math.sqrt(n/N)
f[:, 3] *= k; f[:, 4] *= k
c.tofile(SAL)
print("SPLAT: %s · %d gaussianas (de %d) · %.2f MB · tamaño x%.2f" % (
      SAL, N, n, os.path.getsize(SAL)/1048576, k))
