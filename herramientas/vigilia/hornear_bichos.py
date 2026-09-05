#!/usr/bin/env python3
"""Hornea los seis monstruos liminales de VIGILIA -> partes/i_bichos.js

    python3 herramientas/vigilia/hornear_bichos.py [carpeta_con_los_glb]

Los `task_id` estan en assets/vigilia/tareas.json. Los crudos no se versionan.

── ESTOS TRAEN ESQUELETO, ASI QUE EL HORNEADO NO ES EL DE UN PROP ──
El de CRUCE tira todo lo que no sea la malla y una imagen. Acá hay que conservar
`skins`, `animations` y los cuarenta y dos nodos del esqueleto, porque el bicho
tiene que CAMINAR. Lo que sí se tira es lo mismo de siempre —el mapa de normales
y el de metal-rugosidad, que a cuatro metros y con una vela no cambian un pixel—
y ademas:

  · LAS ROTACIONES DE LA ANIMACION VAN A DOS BYTES. Un cuaternion siempre está
    entre -1 y 1, asi que un short normalizado entra sin extensiones y cuesta la
    mitad; el error es de cinco milesimas de grado, que sobre un hueso de medio
    metro son dos centesimas de milimetro.
  · Y LOS FOTOGRAMAS BAJAN A 20 POR SEGUNDO. El juego dibuja a 137x297 y el
    bicho se ve uno o dos segundos: nadie va a contar los cuadros de la zancada.
"""
import base64, io, json, os, struct, sys

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas', 'barrio'))
import glb

ENT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/rez_vig'
#         nombre        archivo           lado jpeg, calidad, rugosidad
#  Los `_d` salen de `gltfpack -si 0.45 -noq -kn -ke`: la mitad de triangulos,
#  el esqueleto y los tres clips intactos, y SIN cuantizar —KHR_mesh_quantization
#  iria en extensionsRequired y un lector que no la tenga no muestra NADA—.
BICHOS = [('boisvert',  'boisvert_d.glb',   384, 80, 0.86),
          ('nina',      'nina_rig_d.glb',   416, 80, 0.74),
          ('agujas',    'agujas_rig_d.glb', 416, 80, 0.72),
          ('disco',     'disco_rig_d.glb',  352, 78, 0.80),
          ('oso',       'oso_rig_d.glb',    416, 80, 0.90),
          ('espinas',   'espinas_d.glb',    384, 80, 0.78)]

CT = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def lee(js, bn, i):
    a = js['accessors'][i]
    v = js['bufferViews'][a['bufferView']]
    off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    n, ct = NC[a['type']], CT[a['componentType']]
    paso = v.get('byteStride') or n*ct
    f = {5126: 'f', 5125: 'I', 5123: 'H', 5122: 'h', 5121: 'B', 5120: 'b'}[a['componentType']]
    filas = [struct.unpack_from('<' + f*n, bn, off + k*paso) for k in range(a['count'])]
    # ── UN ACCESOR `normalized` NO SE LEE COMO ENTERO ──
    # El rig que devuelve el proveedor ya trae las rotaciones en short
    # normalizado. Leyendolas crudas salen +-32767, y el escritor las volvia a
    # multiplicar por 32767 y las recortaba: los cuaterniones quedaban en
    # (1, -1, -1, 1), o sea de norma DOS. Un cuaternion que no es unitario mete
    # una escala de |q|^2 en la matriz de cada hueso, y encadenada por cuarenta
    # y un huesos eso da miles: medido con la sonda de esqueleto, la nina se
    # abria 6.028 metros y tapaba la pantalla entera con una mancha crema. Y no
    # lo canta ninguna caja envolvente, porque `Box3` mide la malla en reposo.
    if a.get('normalized'):
        d = {5122: 32767.0, 5120: 127.0, 5123: 65535.0, 5121: 255.0}.get(a['componentType'])
        if d:
            piso = -1.0 if a['componentType'] in (5122, 5120) else 0.0
            filas = [tuple(max(piso, x/d) for x in fila) for fila in filas]
    return filas


def hornea(nom, arch, lado, q, rug):
    js, bn = glb.carga(os.path.join(ENT, arch))
    mat = js['materials'][0]
    tex_i = mat['pbrMetallicRoughness']['baseColorTexture']['index']
    bv = js['bufferViews'][js['images'][js['textures'][tex_i]['source']]['bufferView']]
    off = bv.get('byteOffset', 0)
    im = Image.open(io.BytesIO(bn[off:off + bv['byteLength']])).convert('RGB')
    if im.width > lado:
        im = im.resize((lado, int(im.height*lado/im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=q, optimize=True); jpg = b.getvalue()

    mat.clear()
    mat.update({'name': nom, 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0},
                'metallicFactor': 0.0, 'roughnessFactor': rug}})
    js['textures'] = [{'source': 0, 'sampler': 0}]
    js['samplers'] = [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]
    js['images'] = [{'mimeType': 'image/jpeg', 'bufferView': None}]

    # ── las animaciones se re-escriben: 20 fps y rotaciones en short ──
    nuevos = {}          # indice de accesor viejo -> (datos crudos, plantilla)
    kq = 0
    for an in js.get('animations', []):
        for s in an['samplers']:
            t = lee(js, bn, s['input']); v = lee(js, bn, s['output'])
            if len(t) < 2: continue
            t0, t1 = t[0][0], t[-1][0]
            # ── UN CANAL QUE NO CAMBIA SE GUARDA CON DOS CLAVES ──
            #  Un retarget escribe traslacion, rotacion y escala para los
            #  cuarenta y un huesos, y en un ciclo de caminata SOLO ROTAN: la
            #  escala no se mueve nunca y la traslacion solo en la cadera.
            #  Medido, eso era 48.132 claves y 689 KB de animacion en un modelo
            #  cuya malla pesa 252. Un canal constante no lleva informacion.
            c0 = v[0]
            quieto = all(abs(f[c] - c0[c]) < 1e-4 for f in v for c in range(len(c0)))
            n = 2 if quieto else max(2, int(round((t1 - t0)*15)) + 1)
            tt, vv = [], []
            for k in range(n):
                x = t0 + (t1 - t0)*k/(n - 1)
                j = 0
                while j < len(t) - 2 and t[j + 1][0] < x: j += 1
                a0, a1 = t[j][0], t[j + 1][0]
                u = 0 if a1 <= a0 else (x - a0)/(a1 - a0)
                tt.append((x,))
                vv.append(tuple(v[j][c] + (v[j + 1][c] - v[j][c])*u for c in range(len(v[0]))))
            ja = js['accessors'][s['output']]
            corto = ja['type'] == 'VEC4'          # rotacion: cuaternion, entra en short
            nuevos[s['input']] = (tt, 'SCALAR', 5126, False)
            nuevos[s['output']] = (vv, ja['type'], 5122 if corto else 5126, corto)
            if corto: kq += 1

    # ── LA MALLA TAMBIEN SE APRIETA ──
    #  normal y uv a dos bytes, pesos a uno, indices a short: la mitad de la
    #  malla sin tocar un vertice. Son formatos de glTF de siempre, no una
    #  extension, asi que cualquier lector los abre.
    for m in js['meshes']:
        for pr in m['primitives']:
            at = pr['attributes']
            if at.get('NORMAL') is not None:
                nuevos[at['NORMAL']] = (lee(js, bn, at['NORMAL']), 'VEC3', 5122, True)
            if at.get('TEXCOORD_0') is not None:
                uv = lee(js, bn, at['TEXCOORD_0'])
                if all(0.0 <= c <= 1.0 for f in uv for c in f):
                    nuevos[at['TEXCOORD_0']] = (uv, 'VEC2', 5123, True)
            if at.get('WEIGHTS_0') is not None:
                nuevos[at['WEIGHTS_0']] = (lee(js, bn, at['WEIGHTS_0']), 'VEC4', 5121, True)
            ia = js['accessors'][pr['indices']]
            if ia['componentType'] == 5125:
                idx = lee(js, bn, pr['indices'])
                if max(f[0] for f in idx) < 65535:
                    nuevos[pr['indices']] = (idx, 'SCALAR', 5123, False)

    # ── se reescribe el buffer entero, vista por vista ──
    #  LO REEMPLAZADO NO SE COPIA: dejando la vista vieja adentro, el archivo
    #  lleva la animacion DOS VECES —medido, 975 KB de animacion en un modelo de
    #  377 KB de malla— y no falla, solo pesa el doble.
    usadas = sorted({a['bufferView'] for i, a in enumerate(js['accessors'])
                     if a['bufferView'] is not None and i not in nuevos})
    nuevo, mapa, vistas = bytearray(), {}, []
    for i in usadas:
        v0 = js['bufferViews'][i]
        d = bn[v0.get('byteOffset', 0): v0.get('byteOffset', 0) + v0['byteLength']]
        while len(nuevo) % 4: nuevo += b'\x00'
        mapa[i] = len(vistas)
        v = {'buffer': 0, 'byteOffset': len(nuevo), 'byteLength': len(d)}
        if v0.get('byteStride'): v['byteStride'] = v0['byteStride']
        if v0.get('target'): v['target'] = v0['target']
        vistas.append(v); nuevo += d
    for i, a in enumerate(js['accessors']):
        if a['bufferView'] is not None and i not in nuevos: a['bufferView'] = mapa[a['bufferView']]
    # y las animaciones re-muestreadas se pegan al final con su propia vista
    for idx, (datos, tipo, ct, corto) in nuevos.items():
        f = {5126: 'f', 5125: 'I', 5123: 'H', 5122: 'h', 5121: 'B'}[ct]
        esc = {5122: 32767, 5123: 65535, 5121: 255}.get(ct, 1)
        lim = {5122: (-32767, 32767), 5123: (0, 65535), 5121: (0, 255)}.get(ct, (0, 0))
        raw = bytearray()
        for fila in datos:
            if corto: raw += struct.pack('<' + f*len(fila),
                *[max(lim[0], min(lim[1], int(round(c*esc)))) for c in fila])
            else: raw += struct.pack('<' + f*len(fila), *[int(c) if ct != 5126 else c for c in fila])
            if len(fila)*{5126:4,5125:4,5123:2,5122:2,5121:1}[ct] % 4:
                raw += b'\x00'*(4 - (len(fila)*{5126:4,5125:4,5123:2,5122:2,5121:1}[ct] % 4))
        while len(nuevo) % 4: nuevo += b'\x00'
        a = js['accessors'][idx]
        a['bufferView'] = len(vistas); a['byteOffset'] = 0
        a['componentType'] = ct; a['count'] = len(datos); a['type'] = tipo
        a['normalized'] = bool(corto)
        if tipo == 'SCALAR':
            a['min'] = [datos[0][0]]; a['max'] = [datos[-1][0]]
        else:
            a.pop('min', None); a.pop('max', None)
        v = {'buffer': 0, 'byteOffset': len(nuevo), 'byteLength': len(raw)}
        anc = len(datos[0])*{5126:4,5125:4,5123:2,5122:2,5121:1}[ct]
        if anc % 4: v['byteStride'] = anc + (4 - anc % 4)
        if tipo != 'SCALAR' or ct in (5123, 5125): v['target'] = 34962 if tipo != 'SCALAR' else 34963
        vistas.append(v); nuevo += raw
    while len(nuevo) % 4: nuevo += b'\x00'
    vistas.append({'buffer': 0, 'byteOffset': len(nuevo), 'byteLength': len(jpg)}); nuevo += jpg
    js['images'][0]['bufferView'] = len(vistas) - 1
    js['bufferViews'] = vistas
    js['buffers'] = [{'byteLength': len(nuevo)}]
    for k in ('extensionsUsed', 'extensionsRequired'): js.pop(k, None)

    sal = '/tmp/rez_vig/%s_h.glb' % nom
    glb.guarda(sal, js, nuevo)
    d = io.open(sal, 'rb').read()
    tri = sum(js['accessors'][p['indices']]['count']//3 for m in js['meshes'] for p in m['primitives'])
    hue = len(js.get('skins', [{}])[0].get('joints', [])) if js.get('skins') else 0
    print('%-9s %5d tri  %2d huesos  %d clips (%d canales a short)  jpeg %d  %6.1f KB'
          % (nom, tri, hue, len(js.get('animations', [])), kq, im.width, len(d)/1024))
    return 'data:model/gltf-binary;base64,' + base64.b64encode(d).decode('ascii')


def main():
    A = {}
    for nom, arch, lado, q, rug in BICHOS:
        A[nom] = hornea(nom, arch, lado, q, rug)
    s = ("\n/* ══════════ LOS SEIS MONSTRUOS, EN BASE64 ══════════\n"
         "   Lo escribe herramientas/vigilia/hornear_bichos.py; los task_id estan en\n"
         "   assets/vigilia/tareas.json. Cuatro traen esqueleto de 42 huesos con\n"
         "   quieto, caminar y correr; boisvert y espinas no se pueden riggear —el\n"
         "   primero es un busto y el segundo no tiene extremidades— y se mueven\n"
         "   enteros. Ninguno reemplaza a nada hasta que decodifica. */\n"
         "const BICHOS_B64 = " + json.dumps(A, separators=(',', ':')) + ";\n")
    io.open(os.path.join(AQUI, 'partes', 'i_bichos.js'), 'w', encoding='utf8').write(s)
    print('i_bichos.js %.1f KB' % (len(s)/1024))

main()
