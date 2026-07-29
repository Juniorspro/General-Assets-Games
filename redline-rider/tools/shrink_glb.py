#!/usr/bin/env python3
"""Reduce las texturas empotradas de un GLB y lo reempaqueta.

image_to_3d devuelve el atlas a resolucion completa: un vehiculo sale a ~4 MB, casi
todo textura. Para este juego 512 px por atlas es de sobra (se ven a velocidad, en
movimiento y a pocos metros), y baja cada modelo a unos 300 KB.

No se puede recortar el JPEG y ya: los datos de imagen viven en el mismo buffer que la
geometria, asi que hay que reempaquetar todos los bufferViews en orden y recalcular sus
byteOffset. Los accessors referencian bufferViews por indice y su byteOffset es relativo
al bufferView, asi que conservando el contenido de cada uno intacto siguen siendo validos.

Uso:
    python3 shrink_glb.py entrada.glb salida.glb [max_px] [calidad]
"""
import io
import json
import struct
import sys

from PIL import Image

CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942


def read_glb(path):
    data = open(path, 'rb').read()
    if data[:4] != b'glTF':
        raise SystemExit(f'{path}: no es un GLB')
    gltf, binchunk, off = None, b'', 12
    while off < len(data):
        clen, ctype = struct.unpack_from('<II', data, off)
        payload = data[off + 8: off + 8 + clen]
        if ctype == CHUNK_JSON:
            gltf = json.loads(payload.decode('utf-8'))
        elif ctype == CHUNK_BIN:
            binchunk = payload
        off += 8 + clen
    return gltf, binchunk


def pad4(b, fill=b'\x00'):
    """El spec de GLB exige rellenar el chunk JSON con ESPACIOS y el binario con ceros.
    Rellenar el JSON con nulos produce un fichero que JSON.parse rechaza ('Extra data'),
    asi que el modelo no carga en three.js aunque el GLB parezca correcto."""
    return b + fill * (-len(b) % 4)


def shrink(src, dst, max_px=512, quality=78):
    gltf, binchunk = read_glb(src)
    views = gltf.get('bufferViews', [])

    # contenido actual de cada bufferView
    chunks = []
    for bv in views:
        o = bv.get('byteOffset', 0)
        chunks.append(bytearray(binchunk[o:o + bv['byteLength']]))

    saved = 0
    for img in gltf.get('images', []):
        if 'bufferView' not in img:
            continue                      # imagen por URI externa: no aplica
        i = img['bufferView']
        before = len(chunks[i])
        try:
            im = Image.open(io.BytesIO(bytes(chunks[i])))
        except Exception as e:
            print(f'  imagen[{i}]: no se pudo abrir ({e}), se deja igual')
            continue
        w, h = im.size
        if max(w, h) > max_px:
            k = max_px / float(max(w, h))
            im = im.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)
        if im.mode not in ('RGB', 'L'):
            im = im.convert('RGB')
        out = io.BytesIO()
        im.save(out, format='JPEG', quality=quality, optimize=True)
        chunks[i] = bytearray(out.getvalue())
        img['mimeType'] = 'image/jpeg'
        saved += before - len(chunks[i])
        print(f'  imagen[{i}]: {w}x{h} {before/1048576:.2f} MB -> '
              f'{im.size[0]}x{im.size[1]} {len(chunks[i])/1024:.0f} KB')

    # reempaqueta en orden, alineando a 4 bytes, y actualiza offsets
    blob = bytearray()
    for i, bv in enumerate(views):
        if len(blob) % 4:
            blob += b'\x00' * (-len(blob) % 4)
        bv['byteOffset'] = len(blob)
        bv['byteLength'] = len(chunks[i])
        blob += chunks[i]

    gltf['buffers'] = [{'byteLength': len(blob)}]
    for bv in views:
        bv['buffer'] = 0

    js = pad4(json.dumps(gltf, separators=(',', ':')).encode('utf-8'), b' ')
    bn = pad4(bytes(blob), b'\x00')
    total = 12 + 8 + len(js) + 8 + len(bn)
    with open(dst, 'wb') as f:
        f.write(b'glTF' + struct.pack('<II', 2, total))
        f.write(struct.pack('<II', len(js), CHUNK_JSON) + js)
        f.write(struct.pack('<II', len(bn), CHUNK_BIN) + bn)
    return saved


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    mx = int(sys.argv[3]) if len(sys.argv) > 3 else 512
    q = int(sys.argv[4]) if len(sys.argv) > 4 else 78
    import os
    a = os.path.getsize(sys.argv[1])
    shrink(sys.argv[1], sys.argv[2], mx, q)
    b = os.path.getsize(sys.argv[2])
    print(f'{sys.argv[1]} {a/1048576:.2f} MB -> {sys.argv[2]} {b/1048576:.2f} MB '
          f'({100 - b * 100 // a}% menos)')
