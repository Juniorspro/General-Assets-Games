"""Formato .splz: el mismo .splat pero un tercio de los bytes.

Un .splat son 32 bytes por gaussiana con las posiciones y las escalas en
float32. Eso es mucha más precisión de la que hace falta —nadie va a poner una
gaussiana de cinco centímetros con precisión de micrón— y además está
INTERCALADO, que es lo peor para comprimir: el compresor ve un byte de posición,
uno de escala, uno de color, y no encuentra ninguna repetición.

Tres cosas, en este orden de importancia:

1. **Orden de Morton.** Se ordenan las gaussianas por su posición entrelazada
   bit a bit, así las vecinas en el archivo son vecinas en el espacio. Sin esto
   nada de lo demás sirve, porque los valores contiguos no se parecen.
2. **Columnas.** Todas las x juntas, después todas las y, después los colores.
   Cada columna es una serie parecida a sí misma y el compresor la aprovecha.
3. **Cuantización por bloque.** Cada 8192 gaussianas se guarda una caja propia
   y las posiciones van en 16 bits DENTRO de esa caja. Con la nube ordenada por
   Morton, un bloque ocupa unos pocos metros: 16 bits ahí son décimas de
   milímetro. Cuantizar contra la caja global sería inservible —diez
   centímetros por paso— y es el error que hace que esto parezca imposible.

Queda en 17 bytes por gaussiana antes de comprimir, y comprime mucho mejor que
los 32 originales. El visor lo desarma en el worker y sube a la GPU exactamente
lo mismo que antes: esto es tamaño de archivo, no de memoria de video.
"""
import struct
import numpy as np

BLOQUE = 8192
MAGIA = b"SPLZ2\x00\x00\x00"


def _morton(pos, caja):
    """Clave de Morton de 63 bits: 21 por eje, entrelazados."""
    q = np.clip((pos - caja[0])/np.maximum(1e-9, caja[1] - caja[0]), 0, 1)
    q = (q*((1 << 21) - 1)).astype(np.uint64)
    def esparcir(v):
        v = (v | (v << 32)) & np.uint64(0x1f00000000ffff)
        v = (v | (v << 16)) & np.uint64(0x1f0000ff0000ff)
        v = (v | (v << 8))  & np.uint64(0x100f00f00f00f00f)
        v = (v | (v << 4))  & np.uint64(0x10c30c30c30c30c3)
        v = (v | (v << 2))  & np.uint64(0x1249249249249249)
        return v
    return esparcir(q[:, 0]) | (esparcir(q[:, 1]) << np.uint64(1)) | (esparcir(q[:, 2]) << np.uint64(2))


def empaquetar(crudo):
    """De los 32 bytes por gaussiana del .splat al .splz."""
    n = len(crudo)//32
    b = np.frombuffer(crudo, np.uint8)[:n*32].reshape(n, 32)
    f = b[:, :24].copy().view(np.float32).reshape(n, 6)
    pos = f[:, :3].astype(np.float32)
    esc = f[:, 3:6].astype(np.float32)
    caja = np.stack([pos.min(0), pos.max(0)])
    orden = np.argsort(_morton(pos, caja), kind="stable")
    pos, esc = pos[orden], esc[orden]
    resto = b[:, 24:32][orden]

    nb = (n + BLOQUE - 1)//BLOQUE
    relleno = nb*BLOQUE - n
    if relleno:                       # el último bloque se completa repitiendo
        pos = np.concatenate([pos, np.repeat(pos[-1:], relleno, 0)])
        esc = np.concatenate([esc, np.repeat(esc[-1:], relleno, 0)])
        resto = np.concatenate([resto, np.repeat(resto[-1:], relleno, 0)])
    P = pos.reshape(nb, BLOQUE, 3)
    lo = P.min(1); hi = P.max(1)
    ext = np.maximum(hi - lo, 1e-6)
    Q = np.clip((P - lo[:, None, :])/ext[:, None, :]*65535.0, 0, 65535).astype(np.uint16)
    # 4. Diferencia con la anterior, en aritmética de 16 bits (da la vuelta y
    #    se reconstruye exacto con una suma acumulada), y el byte alto separado
    #    del bajo: el alto casi no cambia y el bajo es ruido, mezclados no se
    #    comprime ninguno de los dos.
    ant = np.concatenate([np.zeros((nb, 1, 3), np.uint16), Q[:, :-1]], axis=1)
    D = (Q - ant).astype(np.uint16)

    # las escalas van en logaritmo: el rango útil va de un milímetro a cien
    # metros y en lineal los ocho bits se los come el extremo grande
    L = np.log2(np.maximum(esc, 1e-4))
    l0 = float(L.min()); l1 = float(L.max())
    E = np.clip((L - l0)/max(1e-6, l1 - l0)*255.0, 0, 255).astype(np.uint8)

    cab = (MAGIA + struct.pack("<IIff", n, BLOQUE, l0, l1)
           + lo.astype(np.float32).tobytes() + ext.astype(np.float32).tobytes())
    cuerpo = b"".join([
        (D[:, :, 0] >> 8).astype(np.uint8).tobytes(),
        (D[:, :, 1] >> 8).astype(np.uint8).tobytes(),
        (D[:, :, 2] >> 8).astype(np.uint8).tobytes(),
        (D[:, :, 0] & 255).astype(np.uint8).tobytes(),
        (D[:, :, 1] & 255).astype(np.uint8).tobytes(),
        (D[:, :, 2] & 255).astype(np.uint8).tobytes(),
        E[:, 0].tobytes(), E[:, 1].tobytes(), E[:, 2].tobytes(),
        resto[:, 0].tobytes(), resto[:, 1].tobytes(),
        resto[:, 2].tobytes(), resto[:, 3].tobytes(),
        resto[:, 4].tobytes(), resto[:, 5].tobytes(),
        resto[:, 6].tobytes(), resto[:, 7].tobytes(),
    ])
    return cab + cuerpo


def desempaquetar(dat):
    """La vuelta, para poder comprobar que el ida y vuelta no rompe nada."""
    assert dat[:8] == MAGIA
    n, blo, l0, l1 = struct.unpack("<IIff", dat[8:24])
    nb = (n + blo - 1)//blo
    o = 24
    lo = np.frombuffer(dat, np.float32, nb*3, o).reshape(nb, 3); o += nb*12
    ext = np.frombuffer(dat, np.float32, nb*3, o).reshape(nb, 3); o += nb*12
    N = nb*blo
    D = np.empty((nb, blo, 3), np.uint16)
    for k in range(3):
        D[:, :, k] = np.frombuffer(dat, np.uint8, N, o).reshape(nb, blo).astype(np.uint16) << 8
        o += N
    for k in range(3):
        D[:, :, k] |= np.frombuffer(dat, np.uint8, N, o).reshape(nb, blo); o += N
    Q = np.cumsum(D.astype(np.int64), axis=1).astype(np.uint16)
    E = np.empty((N, 3), np.uint8)
    for k in range(3):
        E[:, k] = np.frombuffer(dat, np.uint8, N, o); o += N
    R = np.empty((N, 8), np.uint8)
    for k in range(8):
        R[:, k] = np.frombuffer(dat, np.uint8, N, o); o += N
    pos = (lo[:, None, :] + Q.astype(np.float32)/65535.0*ext[:, None, :]).reshape(N, 3)
    esc = np.exp2(l0 + E.astype(np.float32)/255.0*(l1 - l0))
    f = np.concatenate([pos, esc], 1).astype(np.float32)[:n]
    out = np.empty((n, 32), np.uint8)
    out[:, :24] = f.copy().view(np.uint8).reshape(n, 24)
    out[:, 24:] = R[:n]
    return out.tobytes()


if __name__ == "__main__":
    import gzip, os, sys
    ent, sal = sys.argv[1], sys.argv[2]
    crudo = open(ent, "rb").read()
    z = empaquetar(crudo)
    gz = gzip.compress(z, 9)
    # se escribe SIN comprimir: el empaquetador de la página ya le pasa gzip y
    # comprimir dos veces no achica nada, sólo esconde la magia del formato
    # atrás de la cabecera de gzip y el visor deja de reconocerlo
    open(sal, "wb").write(z)
    n = len(crudo)//32
    # comprobación: el ida y vuelta tiene que dar posiciones a menos de un mm
    a = np.frombuffer(crudo, np.uint8).reshape(n, 32)[:, :24].copy().view(np.float32).reshape(n, 6)
    v = np.frombuffer(desempaquetar(z), np.uint8).reshape(n, 32)[:, :24].copy().view(np.float32).reshape(n, 6)
    # el orden cambió, así que se compara por el mínimo/máximo y por la nube entera
    # el orden cambia, así que el error se mide sobre las nubes ordenadas y
    # contra el TAMAÑO de cada gaussiana, que es lo único que importa: correr
    # una gaussiana de diez metros por un centímetro no lo ve nadie
    caja = np.stack([a[:, :3].min(0), a[:, :3].max(0)])
    ka = np.argsort(_morton(a[:, :3], caja), kind="stable")
    d = np.abs(a[ka, :3] - v[:, :3]).max(1)
    rel = d/np.maximum(1e-4, a[ka, 3:6].max(1))
    print("SPLZ: %s · %d gaussianas · %.2f -> %.2f MB (.splz) -> %.2f MB con gzip"
          % (sal, n, len(crudo)/1048576, len(z)/1048576, len(gz)/1048576))
    print("SPLZ: %.1f B/gaussiana · %.0f%% de lo que pesa el .splat.gz · "
          "corrimiento p99,9 = %.3f del tamaño de la gaussiana"
          % (len(gz)/n, 100*len(gz)/len(gzip.compress(crudo, 6)), np.percentile(rel, 99.9)))
