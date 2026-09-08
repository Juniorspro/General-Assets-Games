#!/usr/bin/env python3
"""Poda el GLB riggeado de la criatura de CASA 13 y lo pega en el HTML.

    GLB=/tmp/rez_fig/criatura_rig.glb python3 herramientas/casa13/hornear_fig3d.py

QUE ENTRA Y QUE NO, Y POR QUE:

1. UNA SOLA TEXTURA. El generador devuelve tres JPEG —color, metalico-rugosidad
   y normales— que suman 2,1 MB de los 2,6 del archivo. El juego dibuja a 0,52
   de resolucion, de noche, y le pasa grano, croma arrastrado y lineas de
   barrido por encima: el mapa de normales de un camison no llega al ojo. Queda
   el color, a 512 y en JPEG —no WebP: `EXT_texture_webp` va en
   `extensionsRequired` y un lector sin ella no muestra NADA.

2. LOS NUMEROS SE APRIETAN, Y CADA UNO A LO QUE ES.
   · normales a byte: es un versor, y medio grado de error sobre un coseno no
     se ve ni midiendo.
   · UV a ushort: van entre 0 y 1, o sea 1,5e-5 de error.
   · posiciones a short normalizado sobre el semieje mas grande. OJO: three
     mapea un short normalizado a [-1,1], asi que la escala se devuelve en el
     nodo — y el juego ya la escala a 1,72 m, o sea que se multiplica ahi y no
     hace falta un segundo nodo.
   · pesos e indices de hueso a byte: son cuatro por vertice y no pasan de 255.

3. LOS CLIPS SE MUESTREAN A UNA TABLA Y NO SE GUARDAN COMO SAMPLERS. El juego
   corre con su propio paso fijo y su propio `dt`; un `AnimationMixer` trae su
   reloj y se desincroniza de la fase de la caminata, del cabeceo y del susto —
   es la misma razon por la que BARRIO guarda una tabla por fase en vez de un
   clip. Se guardan CUATERNIONES por hueso y por cuadro a 24 Hz, en int16
   normalizado: un cuaternion siempre esta entre -1 y 1.

4. LOS CLIPS SE ELIGEN MIDIENDO. `CLIPS` deja fuera a `preset:hurt`: medido en
   el juego con la altura de mundo de cinco huesos, en `idle` y en `walk` el pie
   queda a 0,006-0,009 del suelo y en `hurt` a 0,676 —altura de rodilla— con la
   mano a 1,03. Es un trastabillon con una pierna en el aire, y una criatura que
   se te viene encima de pie no puede estar levantando una rodilla. Un nombre no
   dice lo que una animacion hace.

5. Y LA TRASLACION DE LA RAIZ SE TIRA menos la de la cadera. El juego decide
   donde esta la criatura; un clip que la mueva pelea con el juego por la
   posicion. La cadera SI se guarda, porque es la que sube y baja al respirar.
COMO SE REGENERA (el GLB crudo pesa 4 MB y no se versiona, igual que en el
visor 3D). Todo va al balde descartable, que se busca por nombre:
  1. imagen de referencia en pose de A  -> submit_image_generation
  2. imagen -> 3D                       -> submit_model3d_generation
     con `source_url` de la anterior, texture_quality 'detailed' y
     extra {"face_limit": 12000}. OJO: decimar despues destruye la malla —el
     generador tiene que hacer la reduccion el, que sabe que es que.
  3. rig + animaciones                  -> submit_rig3d_generation
     con `source_task_id` del paso 2 y animations ['preset:idle','preset:walk',
     'preset:hurt']. LOS NOMBRES SON UN VOCABULARIO CERRADO con prefijo
     `preset:` y los desconocidos se IGNORAN EN SILENCIO: la respuesta trae
     `ignored_animations` y hay que mirarlo. Como mucho cinco por tarea.
  Volvio con 41 huesos de nombre estandar (Root, Hip, Spine01/02, Head,
  L/R_Upperarm, Forearm, Hand, Thigh, Calf, Foot, ToeBase, Clavicle) y tres
  clips de 126 canales cada uno.
"""
import base64, io, json, os, re, struct, sys
import numpy as np
from PIL import Image

GLB = os.environ.get('GLB', '/tmp/rez_fig/criatura_rig.glb')
HTML = os.environ.get('HTML', os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', '..',
    'juegos-pc', 'Casa_Abandonada.html'))
TEX_PX = int(os.environ.get('TEX_PX', '512'))
TEX_Q  = int(os.environ.get('TEX_Q', '80'))
# EL RITMO ES POR CLIP. Un idle de quince segundos a 24 Hz son 370 cuadros por
# 41 huesos: la mitad del paquete. Un idle es respiracion y balanceo —nada se
# mueve rapido— y a 12 Hz el lector lo interpola sin que se note; una caminata
# tiene apoyos y si se muestrea grueso los pies patinan, asi que va a 24.
FPS = {'preset:idle': 12.0, 'preset:hurt': 12.0}
FPS_DEF = float(os.environ.get('FPS', '24'))
# por debajo de esto un hueso no se mueve: son los `*Twist*` del rig, que estan
# para repartir la torsion y en estos clips no hacen nada. Guardar 41 huesos
# cuando se mueven 27 es un tercio del paquete regalado.
QUIETO = 0.0035        # ~0,4 grados de desvio maximo contra su reposo

TAM = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
NPT = {5120: '<i1', 5121: '<u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}


def leer(p):
    d = open(p, 'rb').read()
    assert d[:4] == b'glTF', 'no es GLB'
    off, js, bin_ = 12, None, b''
    while off < len(d):
        ln, ty = struct.unpack_from('<II', d, off); off += 8
        if ty == 0x4E4F534A: js = json.loads(d[off:off + ln].decode('utf8'))
        elif ty == 0x004E4942: bin_ = d[off:off + ln]
        off += ln
    return js, bin_


def acc(js, bin_, k):
    """LEE RESPETANDO EL byteStride. Un bufferView con paso intercala atributos;
    leerlo de corrido devuelve los tres entreverados y eso no falla — devuelve
    numeros plausibles y equivocados."""
    a = js['accessors'][k]
    nc = COMP[a['type']]; anch = TAM[a['componentType']] * nc
    bv = js['bufferViews'][a['bufferView']]
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    paso = bv.get('byteStride') or anch
    dt = np.dtype(NPT[a['componentType']])
    if paso == anch:
        out = np.frombuffer(bin_, dtype=dt, count=a['count'] * nc, offset=base)
    else:
        out = np.empty(a['count'] * nc, dtype=dt)
        for q in range(a['count']):
            out[q * nc:(q + 1) * nc] = np.frombuffer(
                bin_, dtype=dt, count=nc, offset=base + q * paso)
    return out.reshape(a['count'], nc) if nc > 1 else out


def q_short(v):
    return np.clip(np.round(np.asarray(v, dtype=np.float64) * 32767), -32767, 32767).astype('<i2')


def main():
    js, bin_ = leer(GLB)
    if not js.get('skins'):
        print('ESTE GLB NO TIENE PIEL: el rig no llego o fallo'); return 1
    pr = js['meshes'][0]['primitives'][0]
    at = pr['attributes']
    for k in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'):
        if k not in at: print('falta %s' % k); return 1

    pos = acc(js, bin_, at['POSITION']).astype(np.float64)
    nor = acc(js, bin_, at['NORMAL']).astype(np.float64)
    uv  = acc(js, bin_, at['TEXCOORD_0']).astype(np.float64)
    joi = acc(js, bin_, at['JOINTS_0']).astype(np.int64)
    wei = acc(js, bin_, at['WEIGHTS_0']).astype(np.float64)
    idx = acc(js, bin_, pr['indices']).astype(np.int64)
    S = float(np.abs(pos).max())

    piel = js['skins'][0]
    nodos, jts = js['nodes'], piel['joints']
    ibm = acc(js, bin_, piel['inverseBindMatrices']).astype(np.float64) \
        if 'inverseBindMatrices' in piel else None
    padre = {}
    for q, n in enumerate(nodos):
        for h in n.get('children', []): padre[h] = q
    huesos = []
    for j in jts:
        n = nodos[j]
        huesos.append({'n': n.get('name', 'hueso%d' % j),
                       'p': jts.index(padre[j]) if padre.get(j) in jts else -1,
                       't': [round(x, 6) for x in n.get('translation', [0, 0, 0])],
                       'r': [round(x, 6) for x in n.get('rotation', [0, 0, 0, 1])],
                       's': [round(x, 6) for x in n.get('scale', [1, 1, 1])]})

    # ── los clips, muestreados ──
    # QUE CLIPS ENTRAN, Y `hurt` NO. Medido en el juego con la altura de mundo
    # de cinco huesos: en `idle` y en `walk` el pie esta a 0,006-0,009 del suelo
    # —o sea apoyado— y en `hurt` a 0,676, que es altura de rodilla, con la mano
    # a 1,03. Es un trastabillon con una pierna en el aire, y una criatura que se
    # te viene encima de pie no puede estar levantando una rodilla. Guardarlo
    # serian 82 KB de un clip que no se puede usar.
    SOLO = set((os.environ.get('CLIPS') or 'preset:idle,preset:walk').split(','))
    clips = []
    for an in js.get('animations', []):
        nom = an.get('name', 'clip%d' % len(clips))
        if nom not in SOLO:
            print('clip %-16s SE DESCARTA (no esta en CLIPS)' % nom); continue
        # cuanto dura: el mayor `max` de las entradas de tiempo
        dur = 0.0
        for sm in an['samplers']:
            a = js['accessors'][sm['input']]
            dur = max(dur, float((a.get('max') or [0])[0]))
        fps = FPS.get(nom, FPS_DEF)
        nf = max(2, int(round(dur * fps)) + 1)
        t = np.linspace(0.0, dur, nf)
        rot = np.zeros((nf, len(jts), 4)); rot[:, :, 3] = 1.0
        for k, h in enumerate(huesos):
            rot[:, k, :] = h['r']
        cad = np.zeros((nf, 3))
        cad[:] = huesos[0]['t']
        canales = 0
        for ch in an['channels']:
            nodo = ch['target']['node']
            if nodo not in jts: continue
            k = jts.index(nodo)
            sm = an['samplers'][ch['sampler']]
            ti = acc(js, bin_, sm['input']).astype(np.float64).ravel()
            vo = acc(js, bin_, sm['output']).astype(np.float64)
            ruta = ch['target']['path']
            if ruta == 'rotation':
                # SE INTERPOLA COMPONENTE A COMPONENTE Y SE RENORMALIZA: a 24 Hz
                # sobre una curva ya densa el error contra un slerp es de
                # centesimas de grado, y un slerp por hueso y por cuadro en
                # numpy no vale la complicacion.
                q = np.stack([np.interp(t, ti, vo[:, c]) for c in range(4)], 1)
                # el signo se hace continuo: dos cuaterniones opuestos son la
                # misma rotacion y un salto de signo interpola por el camino largo
                for i in range(1, len(q)):
                    if np.dot(q[i], q[i - 1]) < 0: q[i] = -q[i]
                q /= np.maximum(np.linalg.norm(q, axis=1, keepdims=True), 1e-9)
                rot[:, k, :] = q; canales += 1
            elif ruta == 'translation' and k == 0:
                cad[:] = np.stack([np.interp(t, ti, vo[:, c]) for c in range(3)], 1)
                canales += 1
        # QUE HUESOS SE MUEVEN DE VERDAD: el desvio maximo de cada uno contra
        # su propia rotacion de reposo. Y se mide con |1-|dot||, que es la
        # medida honesta para un cuaternion —dos opuestos son la misma
        # rotacion— en vez de la distancia entre las cuatro componentes.
        mov = []
        for k, h in enumerate(huesos):
            q0 = np.asarray(h['r'], dtype=np.float64)
            d = 1.0 - np.abs(rot[:, k, :] @ q0).min()
            if d > QUIETO: mov.append(k)
        rotm = rot[:, mov, :] if mov else rot[:, :0, :]
        clips.append({'n': nom, 'd': round(dur, 4), 'f': nf, 'c': canales,
                      'mov': mov,
                      'rot': q_short(rotm).tobytes(),
                      'cad': q_short(np.asarray(cad) / max(S, 1e-9)).tobytes()})
        print('clip %-16s %5.2f s  %3d cuadros a %2.0f Hz  %2d canales  '
              '%2d/%d huesos se mueven' % (nom, dur, nf, fps, canales, len(mov), len(huesos)))

    # ── la textura de color ──
    mat = js['materials'][0]
    ti = (mat.get('pbrMetallicRoughness') or {}).get('baseColorTexture')
    if ti is None: print('sin baseColorTexture'); return 1
    img = js['images'][js['textures'][ti['index']]['source']]
    bv = js['bufferViews'][img['bufferView']]
    cruda = bin_[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    im = Image.open(io.BytesIO(cruda)).convert('RGB')
    im0 = im.size
    im = im.resize((TEX_PX, TEX_PX), Image.LANCZOS)
    bt = io.BytesIO(); im.save(bt, 'JPEG', quality=TEX_Q, optimize=True)
    tex = bt.getvalue()

    # ── el paquete: un JSON con los arrays en base64 ──
    paq = {
        'S': round(S, 6), 'tri': len(idx) // 3, 'v': len(pos),
        # LA CAJA DEL BIND VA EN EL PAQUETE Y EN UNIDADES ORIGINALES. Del otro
        # lado la posicion es un short NORMALIZADO, y `computeBoundingBox` de
        # r128 no desnormaliza —`getX` devuelve el short crudo—: la caja salia de
        # 65534 de alto, la escala se calculaba en 2,4e-5 y la criatura se
        # dibujaba del tamaño de una mota. No fallaba nada.
        'bb': [round(float(x), 6) for x in
               list(pos.min(axis=0)) + list(pos.max(axis=0))],
        'pos': base64.b64encode(q_short(pos / S).tobytes()).decode(),
        'nor': base64.b64encode(np.clip(np.round(nor * 127), -127, 127)
                                .astype('<i1').tobytes()).decode(),
        'uv':  base64.b64encode(np.clip(np.round(np.clip(uv, 0, 1) * 65535), 0, 65535)
                                .astype('<u2').tobytes()).decode(),
        'joi': base64.b64encode(joi.astype('<u1').tobytes()).decode(),
        'wei': base64.b64encode(np.clip(np.round(wei * 255), 0, 255)
                                .astype('<u1').tobytes()).decode(),
        'idx': base64.b64encode(idx.astype('<u2' if len(pos) < 65536 else '<u4')
                                .tobytes()).decode(),
        'i32': len(pos) >= 65536,
        'hue': huesos,
        'ibm': base64.b64encode(np.asarray(ibm, dtype='<f4').tobytes()).decode()
               if ibm is not None else None,
        'clips': [{'n': c['n'], 'd': c['d'], 'f': c['f'], 'mov': c['mov'],
                   'rot': base64.b64encode(c['rot']).decode(),
                   'cad': base64.b64encode(c['cad']).decode()} for c in clips],
        'tex': base64.b64encode(tex).decode(),
    }
    txt = json.dumps(paq, separators=(',', ':'))
    bloque = '/*<<FIG3D>>*/const FIG3D=' + txt + ';/*<</FIG3D>>*/'
    src = io.open(HTML, encoding='utf-8').read()
    if '/*<<FIG3D>>*/' in src:
        src = re.sub(r'/\*<<FIG3D>>\*/.*?/\*<</FIG3D>>\*/', lambda m: bloque,
                     src, count=1, flags=re.S)
    else:
        anc = '/*<<UI_IMG>>*/'
        src = src.replace(anc, bloque + '\n' + anc, 1)
    io.open(HTML, 'w', encoding='utf-8').write(src)

    print('\nmalla   %d triangulos · %d vertices · semieje %.4f' % (len(idx)//3, len(pos), S))
    print('huesos  %d' % len(huesos))
    print('textura %dx%d -> %dx%d  %.1f KB' % (im0[0], im0[1], TEX_PX, TEX_PX, len(tex)/1024))
    print('paquete %.1f KB de JSON (%.1f KB del GLB original)'
          % (len(txt)/1024, os.path.getsize(GLB)/1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
