#!/usr/bin/env python3
"""Toma el personaje generado y lo deja listo para el juego.

    python3 herramientas/barrio/hornear_pj.py

CUATRO PASOS, y cada uno resuelve un problema distinto:

1. LA TEXTURA SE HORNEA EN LOS VÉRTICES. No es sólo ahorro: decimando con la
   textura puesta, el simplificador tiene que respetar las COSTURAS DE UV y se
   planta —medido en LEMI, `-si` a cualquier valor entre 0,04 y 0,20 daba el
   mismo resultado, o sea que el parámetro no hacía nada—. Sin UV no hay
   costuras y baja hasta donde uno quiera. Y acá encima es lo CORRECTO: el
   personaje es low poly de colores planos, así que la textura no lleva un solo
   detalle que un vértice no pueda guardar.
   SE CONVIERTE DE sRGB A LINEAL AL MUESTREAR: glTF trata `COLOR_0` como lineal
   y una textura de color como sRGB, y copiando el píxel tal cual todo sale
   lavado.

2. SE DECIMA CON gltfpack, con `-sa` (si no, se planta en las costuras) y con
   `-noq` (la cuantización entra como `KHR_mesh_quantization` en
   `extensionsRequired` y un cargador que no la soporte no muestra NADA).

3. SE LE AGREGA LA CARA: ojos, párpados y mandíbula, con sus huesos. Eso lo
   hace `riggear_cara.py` y va DESPUÉS de decimar, porque el simplificador se
   comería justo lo que se acaba de poner.

4. Y SE ESCRIBE EN `partes/y.js` en base64.
"""
import base64, io, json, os, subprocess, sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glb

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
ENTRADA = '/tmp/m4'
RATIO = os.environ.get('PJ_RATIO', '0.22')
DESAT = 0.24        # la saturación del post multiplica por 0,86 pero el brillo
                    # por 1,30: una textura fotográfica sale demasiado viva


def color_en_vertices(ent, sal):
    js, bn = glb.carga(ent)
    img = js['images'][0]
    bv = js['bufferViews'][img['bufferView']]
    o = bv.get('byteOffset', 0)
    tex = Image.open(io.BytesIO(bn[o:o+bv['byteLength']])).convert('RGB')
    TX = np.asarray(tex).astype(np.float32) / 255.0
    H, W, _ = TX.shape

    nuevo = bytearray()
    remap = {}
    for k, b in enumerate(js['bufferViews']):
        if k == img['bufferView']: continue
        oo, nn = b.get('byteOffset', 0), b['byteLength']
        while len(nuevo) % 4: nuevo.append(0)
        remap[k] = len(nuevo)
        nuevo.extend(bn[oo:oo+nn])

    # EL COLOR SE MUESTREA EN EL CENTRO DE CADA TRIANGULO Y NO EN EL VERTICE.
    # Esta es la parte que hay que hacer bien y costo una vuelta: el atlas que
    # devuelve el generador es UNA ISLA POR TRIANGULO -miles de manchitas de
    # veinte pixeles- y el UV de un vertice cae en la ESQUINA de su isla, que es
    # exactamente el peor sitio para muestrear: agarra el borde, el relleno o el
    # color de la isla de al lado. Medido: el personaje horneado asi salio
    # entero de camuflaje, con la piel manchada de azul y el pantalon de gris.
    # El centro de la isla, en cambio, es color plano por construccion.
    # Y EL COLOR DE UN VERTICE ES EL MAS FRECUENTE ENTRE SUS CARAS, no el
    # promedio: promediando, cada borde entre la campera y el pantalon queda con
    # una franja de un color que no existe en el personaje.
    for m in js['meshes']:
        for p in m['primitives']:
            at = p['attributes']
            uv = glb.leer(js, bn, at['TEXCOORD_0']).astype(np.float32)
            idx = glb.leer(js, bn, p['indices']).reshape(-1).astype(np.int64)
            tri = idx.reshape(-1, 3)
            cen = (uv[tri[:, 0]] + uv[tri[:, 1]] + uv[tri[:, 2]]) / 3.0
            # LA V NO SE DA VUELTA, Y ESO SE MIDIO. glTF pone el origen de la
            # textura ARRIBA a la izquierda, asi que la fila es `v*(H-1)` y no
            # `(1-v)*(H-1)`. Con el volteo puesto, el muslo -que tiene que ser
            # denim- devolvia (0,32 0,33 0,37), un gris; sin el volteo devuelve
            # (0,30 0,43 0,56), que es azul, y la cara pasa de gris a
            # (0,45 0,31 0,25), que es piel. La prueba no es mirar el modelo:
            # es promediar el color muestreado en una zona que uno SABE de que
            # color tiene que ser.
            u = np.clip(cen[:, 0] * (W - 1), 0, W - 1).astype(np.int32)
            v = np.clip(cen[:, 1] * (H - 1), 0, H - 1).astype(np.int32)
            cf = TX[v, u]                                   # color por cara, sRGB
            cod = (np.round(cf * 63.0).astype(np.int64)
                   * np.array([1, 64, 4096])).sum(axis=1)   # una clave por color
            nv = uv.shape[0]
            votos = [dict() for _ in range(nv)]
            for f in range(tri.shape[0]):
                k = int(cod[f])
                for q in range(3):
                    d = votos[tri[f, q]]
                    d[k] = d.get(k, 0) + 1
            paleta = {}
            for f in range(tri.shape[0]): paleta[int(cod[f])] = cf[f]
            col = np.zeros((nv, 3), dtype=np.float32)
            for i in range(nv):
                d = votos[i]
                if not d: continue
                col[i] = paleta[max(d, key=d.get)]
            lin = np.where(col <= 0.04045, col/12.92, ((col+0.055)/1.055)**2.4).astype(np.float32)
            lin = (lin * (1.0 - DESAT) + lin.mean(axis=1, keepdims=True) * DESAT).astype(np.float32)
            d = lin.tobytes()
            while len(nuevo) % 4: nuevo.append(0)
            js['bufferViews'].append({'buffer':0, 'byteOffset':len(nuevo), 'byteLength':len(d)})
            nuevo.extend(d)
            js['accessors'].append({'bufferView': len(js['bufferViews'])-1,
                                    'componentType': 5126, 'count': int(lin.shape[0]),
                                    'type': 'VEC3',
                                    'min': [float(lin[:,i].min()) for i in range(3)],
                                    'max': [float(lin[:,i].max()) for i in range(3)]})
            at['COLOR_0'] = len(js['accessors']) - 1
            del at['TEXCOORD_0']

    for k, b in enumerate(js['bufferViews']):
        if k in remap:
            b['byteOffset'] = remap[k]; b['buffer'] = 0
    js.pop('images', None); js.pop('samplers', None); js.pop('textures', None)
    # EL MATERIAL SE REEMPLAZA ENTERO Y NO SE LE SACAN LAS TEXTURAS DE A UNA.
    # El que devuelve el generador trae `emissiveTexture`, `KHR_materials_ior` y
    # un `KHR_materials_specular` con el factor en 2,0 -que esta fuera de
    # especificacion-; sacando solo `baseColorTexture` queda una referencia a una
    # textura que ya no existe y gltfpack contesta "invalid GLTF" sin decir cual.
    # Aca el material no lleva nada: el color vive en los vertices.
    js['materials'] = [{'name': 'pj', 'doubleSided': False,
                        'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1],
                                                 'metallicFactor': 0.0,
                                                 'roughnessFactor': 1.0}}]
    for m in js['meshes']:
        for pr in m['primitives']: pr['material'] = 0
    js.pop('extensionsUsed', None); js.pop('extensionsRequired', None)
    viejo = img['bufferView']
    js['bufferViews'] = [b for k, b in enumerate(js['bufferViews']) if k != viejo]
    for a in js['accessors']:
        if a.get('bufferView') is not None and a['bufferView'] > viejo:
            a['bufferView'] -= 1
    js['buffers'] = [{'byteLength': len(nuevo)}]
    glb.guarda(sal, js, bytes(nuevo))


def soldar(ent, sal, eps=0.0002):
    """UNE LOS VERTICES COINCIDENTES. Es el paso que faltaba y explica lo que se
    veia: la malla que devuelve el generador viene SIN SOLDAR —cada grupo de
    caras trae su propia copia de los vertices del borde— asi que no es una
    superficie, son cientos de cascaras sueltas apoyadas una contra otra.
    MEDIDO EN LA MANO DERECHA: 3.544 vertices en **391 ISLAS**. Soldando a dos
    decimas de milimetro quedan 1.610 vertices y **UNA** isla.
    Por que importa tanto: el esqueleto mueve cada cascara por su cuenta, asi que
    en cuanto la mano se dobla las costuras se ABREN — los dedos se ven como
    tablitas separadas con ranuras negras en el medio, que es exactamente lo que
    se veia. Y el decimador, con `-sa`, trata cada borde de cascara como una
    costura que hay que respetar, asi que ademas simplificaba mal.
    Se promedian las normales del grupo y se conserva el color y los pesos del
    primero: los duplicados estan en el MISMO punto, asi que sus pesos son los
    mismos y promediarlos no cambiaria nada."""
    js, bn = glb.carga(ent)
    pr = js['meshes'][0]['primitives'][0]
    at = pr['attributes']
    P = glb.leer(js, bn, at['POSITION']).astype(np.float32)
    N = glb.leer(js, bn, at['NORMAL']).astype(np.float32)
    I = glb.leer(js, bn, pr['indices']).astype(np.int64)
    extra = {}
    for k in ('COLOR_0', 'JOINTS_0', 'WEIGHTS_0'):
        if k in at: extra[k] = glb.leer(js, bn, at[k])

    clave = np.round(P / eps).astype(np.int64)
    _, prim, inv = np.unique(clave, axis=0, return_index=True, return_inverse=True)
    orden = np.argsort(prim)                    # respetar el orden original
    remap = np.empty(len(prim), np.int64); remap[orden] = np.arange(len(prim))
    nuevo = remap[inv]
    n = len(prim)

    P2 = np.zeros((n, 3), np.float32); P2[nuevo] = P
    N2 = np.zeros((n, 3), np.float32)
    np.add.at(N2, nuevo, N)
    ln = np.linalg.norm(N2, axis=1, keepdims=True); ln[ln == 0] = 1
    N2 /= ln
    ex2 = {}
    for k, v in extra.items():
        w = np.zeros((n,) + v.shape[1:], v.dtype); w[nuevo] = v; ex2[k] = w
    I2 = nuevo[I]

    print('== soldado: %d -> %d vertices (%.1f%%)' % (len(P), n, 100.0*n/len(P)))

    # SE APENDEA AL BUFFER EN VEZ DE REESCRIBIRLO. Las matrices de bind del
    # esqueleto tambien viven ahi, asi que rearmar el binario obligaria a
    # reubicarlas; agregando al final y repuntando solo los accesores de esta
    # primitiva, lo demas no se toca. Los bytes viejos quedan huerfanos y
    # gltfpack los tira en el paso siguiente.
    buf = bytearray(bn)
    def mete(datos, comp, tipo, minmax=False):
        while len(buf) % 4: buf.append(0)
        off = len(buf); b = datos.tobytes(); buf.extend(b)
        js['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b)})
        a = {'bufferView': len(js['bufferViews']) - 1, 'componentType': comp,
             'count': int(datos.shape[0]), 'type': tipo}
        if minmax:
            a['min'] = [float(x) for x in datos.min(axis=0)]
            a['max'] = [float(x) for x in datos.max(axis=0)]
        js['accessors'].append(a)
        return len(js['accessors']) - 1

    TIPO = {1: 'SCALAR', 2: 'VEC2', 3: 'VEC3', 4: 'VEC4'}
    COMP = {np.dtype('float32'): 5126, np.dtype('uint16'): 5123,
            np.dtype('uint8'): 5121, np.dtype('uint32'): 5125}
    at['POSITION'] = mete(P2, 5126, 'VEC3', True)
    at['NORMAL']   = mete(N2, 5126, 'VEC3')
    for k, v in ex2.items():
        ac = mete(v, COMP[v.dtype], TIPO[v.shape[1]])
        # JOINTS_0 SON INDICES, NO UNA FRACCION: marcarlo `normalized` divide
        # cada indice por 65535 y todos los vertices pasan a apuntar al hueso 0.
        # Costo una vuelta — el rig salia con cero vertices en cada dedo y en la
        # mandibula, o sea que «no habia dedos» cuando lo que no habia eran pesos.
        if v.dtype != np.float32 and k != 'JOINTS_0':
            js['accessors'][ac]['normalized'] = True
        at[k] = ac
    pr['indices'] = mete(I2.astype(np.uint32), 5125, 'SCALAR')
    js['buffers'] = [{'byteLength': len(buf)}]
    glb.guarda(sal, js, bytes(buf))


def main():
    # PJ_FUENTE deja elegir el modelo de entrada sin tocar el script: la vuelta
    # del personaje denso entra por aca (`pj2.glb`) y el viejo sigue reproducible.
    ent = os.path.join(ENTRADA, os.environ.get('PJ_FUENTE', 'pj.glb'))
    if not os.path.exists(ent):
        print('falta', ent); return 1
    print('== entrada'); glb.resumen(ent)

    vc = os.path.join(ENTRADA, 'pj_vc.glb')
    color_en_vertices(ent, vc)
    print('== color en vértices: %d bytes' % os.path.getsize(vc))

    sol = os.path.join(ENTRADA, 'pj_sol.glb')
    soldar(vc, sol)

    dec = os.path.join(ENTRADA, 'pj_dec.glb')
    subprocess.run(['npx', '--yes', 'gltfpack', '-si', RATIO, '-sa', '-kn', '-noq',
                    '-i', sol, '-o', dec], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('== decimado'); glb.resumen(dec)
    return 0


if __name__ == '__main__':
    sys.exit(main())
