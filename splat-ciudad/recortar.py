"""Recorta un .splat a una caja en planta, en coordenadas del visor.

Sirve para sacar la zona caminable de una nube grande sin volver a proyectar:
la densidad que ya tiene se conserva tal cual, que es justo lo que se quiere
para el recorrido en primera persona.

    python3 recortar.py entrada.splat salida.splat 52 -52 70
                                       centro x, centro z, radio
"""
import os, sys
import numpy as np

ENT, SAL = sys.argv[1], sys.argv[2]
CX, CZ, R = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
RY = float(sys.argv[6]) if len(sys.argv) > 6 else 1e9      # tope de altura

b = np.fromfile(ENT, np.uint8)
n = len(b)//32
b = b[:n*32].reshape(n, 32)
f = b[:, :24].view(np.float32).reshape(n, 6)
d = (np.abs(f[:,0]-CX) <= R) & (np.abs(f[:,2]-CZ) <= R) & (f[:,1] <= RY)
c = b[d]
c.tofile(SAL)
print("SPLAT: %s · %d de %d gaussianas · %.1f MB · caja %.0f x %.0f m" % (
      SAL, len(c), n, os.path.getsize(SAL)/1048576, 2*R, 2*R))
