"""Lector del formato binario .rbxm de Roblox, lo justo para sacar una animacion.

El archivo es: cabecera de 32 bytes y despues trozos con nombre de 4 letras.
Cada trozo trae su largo comprimido y su largo real; si el comprimido es 0, va
crudo, y si no va en LZ4. Los que importan:

  INST  declara una clase y los `referent` de sus instancias
  PROP  una propiedad de una clase, con el valor de TODAS sus instancias juntos
  PRNT  de quien cuelga cada instancia

Lo raro del formato —y lo que hay que tener en la cabeza todo el tiempo— es que
los arreglos van INTERCALADOS: los cuatro bytes de cada float no van juntos,
sino que primero van todos los bytes 0, despues todos los 1, etc. Y los enteros
van en zigzag y de forma acumulativa. Es para que comprima mejor.
"""
import struct, lz4.block

def desintercalar(b, n, ancho):
    """Deshace el intercalado: de [b0 de todos][b1 de todos]... a por elemento."""
    out = bytearray(n * ancho)
    for i in range(ancho):
        for j in range(n):
            out[j * ancho + i] = b[i * n + j]
    return bytes(out)

def leer_i32(b, n):
    d = desintercalar(b, n, 4)
    v = struct.unpack('>%di' % n, d)
    # zigzag: el bit bajo es el signo
    return [(x >> 1) ^ -(x & 1) for x in v]

def leer_f32(b, n):
    d = desintercalar(b, n, 4)
    v = struct.unpack('>%dI' % n, d)
    # el float de Roblox va rotado: el bit de signo esta abajo
    out = []
    for x in v:
        y = ((x >> 1) | ((x & 1) << 31)) & 0xFFFFFFFF
        out.append(struct.unpack('>f', struct.pack('>I', y))[0])
    return out

def acumular(v):
    out, s = [], 0
    for x in v:
        s += x
        out.append(s)
    return out

class Archivo:
    def __init__(self, ruta):
        d = open(ruta, 'rb').read()
        assert d[:8] == b'<roblox!', 'no es un rbxm binario'
        self.nClases, self.nInst = struct.unpack('<II', d[16:24])
        p = 32
        self.trozos = []
        while p < len(d):
            nom = d[p:p+4]
            comp, real, _ = struct.unpack('<III', d[p+4:p+16])
            p += 16
            cuerpo = d[p:p+comp] if comp else d[p:p+real]
            p += comp if comp else real
            if comp:
                cuerpo = lz4.block.decompress(cuerpo, uncompressed_size=real)
            self.trozos.append((nom.decode('latin1'), cuerpo))
            if nom == b'END\x00':
                break

    def cadena(self, b, p):
        n = struct.unpack('<I', b[p:p+4])[0]
        return b[p+4:p+4+n].decode('latin1'), p + 4 + n

TIPOS = {1:'string',2:'bool',3:'int',4:'float',5:'double',16:'CFrame',
         10:'Vector3',9:'Vector2',6:'UDim',7:'UDim2',18:'Enum',19:'Ref'}

def analizar(ruta):
    a = Archivo(ruta)
    clases = {}      # idx -> {'nombre':..., 'refs':[...]}
    props = {}       # (idx, propNombre) -> (tipoId, bytes)
    padres = {}
    for nom, b in a.trozos:
        if nom == 'INST':
            idx = struct.unpack('<I', b[0:4])[0]
            cn, p = a.cadena(b, 4)
            p += 1                                    # isService
            n = struct.unpack('<I', b[p:p+4])[0]; p += 4
            refs = acumular(leer_i32(b[p:p+4*n], n))
            clases[idx] = {'nombre': cn, 'refs': refs}
        elif nom == 'PROP':
            idx = struct.unpack('<I', b[0:4])[0]
            pn, p = a.cadena(b, 4)
            tipo = b[p]; p += 1
            props[(idx, pn)] = (tipo, b[p:])
        elif nom == 'PRNT':
            p = 1
            n = struct.unpack('<I', b[p:p+4])[0]; p += 4
            hijos = acumular(leer_i32(b[p:p+4*n], n)); p += 4*n
            pas = acumular(leer_i32(b[p:p+4*n], n))
            padres = dict(zip(hijos, pas))
    return a, clases, props, padres

NORMAL = [(1,0,0),(0,1,0),(0,0,1),(-1,0,0),(0,-1,0),(0,0,-1)]

def cruz(a,b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])

def matriz_de_id(i):
    """Los CFrame alineados a los ejes no guardan la matriz: guardan un id."""
    i -= 1
    R, U = NORMAL[i // 6], NORMAL[i % 6]
    F = cruz(R, U)
    return [R[0],U[0],F[0], R[1],U[1],F[1], R[2],U[2],F[2]]

def leer_strings(b, n):
    out, p = [], 0
    for _ in range(n):
        L = struct.unpack('<I', b[p:p+4])[0]; p += 4
        out.append(b[p:p+L].decode('latin1')); p += L
    return out

def leer_cframes(b, n):
    """Primero un byte de id por cada uno; los que dan 0 traen 9 floats
       CRUDOS a continuacion. Recien despues vienen las tres posiciones, y
       esas si van intercaladas y con el float rotado. Mezclar los dos
       formatos en un mismo tipo es lo raro de este archivo."""
    p = 0
    rots = []
    for _ in range(n):
        idr = b[p]; p += 1
        if idr == 0:
            m = struct.unpack('<9f', b[p:p+36]); p += 36
            rots.append(list(m))
        else:
            rots.append(matriz_de_id(idr))
    pos = []
    for _ in range(3):
        pos.append(leer_f32(b[p:p+4*n], n)); p += 4*n
    return rots, list(zip(*pos))
