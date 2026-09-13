#!/usr/bin/env python3
"""ADELGAZA UN GLB para que sirva en celular.

Los personajes que salen de image_to_3d vienen con UNA textura de 2048x2048 en
PNG: 7,2 MB de los 8,2 MB del archivo. Once personajes asi serian 90 MB de
descarga, o sea inusable. La malla en cambio ya viene bien (14 mil triangulos).

Lo que hace:
  · reescala las imagenes embebidas al lado que se pida (512 alcanza y sobra para
    un personaje que se ve a metros de distancia) y las reencodea en JPEG, que
    para color base rinde 100 veces mejor que PNG;
  · tira el clip `clip0` que trae de fabrica, que es la pose de bind y no sirve
    de nada: la animacion viene de la biblioteca de clips prestados;
  · deja el resto igual (nodos, huesos, skin, malla), porque es lo que hace que
    los clips prestados le aten.

Uso: python3 opt_glb.py <entrada.glb> <salida.glb> [lado=512] [calidad=86]
"""
import io
import json
import os
import struct
import sys

from PIL import Image


def leer(p):
    d = open(p, 'rb').read()
    total = struct.unpack('<I', d[8:12])[0]
    off, js, bina = 12, None, b''
    while off < total:
        ln, tipo = struct.unpack('<I4s', d[off:off + 8])
        cuerpo = d[off + 8:off + 8 + ln]
        if tipo == b'JSON':
            js = json.loads(cuerpo)
        elif tipo == b'BIN\x00':
            bina = cuerpo
        off += 8 + ln + ((4 - ln % 4) % 4 if ln % 4 else 0)
    return js, bina


def escribir(p, js, bina):
    jb = json.dumps(js, separators=(',', ':')).encode('utf8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bb = bina + b'\x00' * ((4 - len(bina) % 4) % 4)
    total = 12 + 8 + len(jb) + (8 + len(bb) if bb else 0)
    with open(p, 'wb') as f:
        f.write(b'glTF' + struct.pack('<II', 2, total))
        f.write(struct.pack('<I', len(jb)) + b'JSON' + jb)
        if bb:
            f.write(struct.pack('<I', len(bb)) + b'BIN\x00' + bb)


def opt(entrada, salida, lado=512, calidad=86):
    js, bina = leer(entrada)
    # el buffer se rearma entero: se copian las vistas que quedan, en orden, y
    # las de imagen se reemplazan por la version chica
    imgBV = {}
    for i, im in enumerate(js.get('images', [])):
        if 'bufferView' not in im:
            continue
        bv = js['bufferViews'][im['bufferView']]
        o, L = bv.get('byteOffset', 0), bv['byteLength']
        px = Image.open(io.BytesIO(bina[o:o + L]))
        antes = px.size
        # el alfa se pierde al pasar a JPEG: si la textura lo usa, se conserva PNG
        usaAlfa = px.mode in ('RGBA', 'LA') and \
            Image.eval(px.getchannel('A'), lambda v: 0 if v > 250 else 1).getbbox() is not None
        px = px.convert('RGBA' if usaAlfa else 'RGB')
        if max(px.size) > lado:
            px = px.resize((lado, lado), Image.LANCZOS)
        buf = io.BytesIO()
        if usaAlfa:
            px.save(buf, 'PNG', optimize=True)
            mime = 'image/png'
        else:
            px.save(buf, 'JPEG', quality=calidad, optimize=True, progressive=False)
            mime = 'image/jpeg'
        imgBV[im['bufferView']] = buf.getvalue()
        im['mimeType'] = mime
        print('    imagen %d: %s -> %s  %d KB -> %d KB  (%s)'
              % (i, antes, px.size, L // 1024, len(imgBV[im['bufferView']]) // 1024, mime))

    nuevas, nb, pos = [], [], 0
    for k, bv in enumerate(js['bufferViews']):
        dat = imgBV.get(k)
        if dat is None:
            o, L = bv.get('byteOffset', 0), bv['byteLength']
            dat = bina[o:o + L]
        nbv = {'buffer': 0, 'byteOffset': pos, 'byteLength': len(dat)}
        for campo in ('byteStride', 'target'):
            if campo in bv:
                nbv[campo] = bv[campo]
        nuevas.append(nbv)
        nb.append(dat)
        pad = (4 - len(dat) % 4) % 4
        if pad:
            nb.append(b'\x00' * pad)
        pos += len(dat) + pad
    js['bufferViews'] = nuevas
    bina2 = b''.join(nb)
    js['buffers'] = [{'byteLength': len(bina2)}]

    # el clip de fabrica (`clip0`) es la pose de bind: no sirve y ocupa
    fuera = [a.get('name', '') for a in js.get('animations', [])
             if 'clip0' in a.get('name', '')]
    if fuera:
        js['animations'] = [a for a in js.get('animations', [])
                            if 'clip0' not in a.get('name', '')]
        if not js['animations']:
            del js['animations']
    escribir(salida, js, bina2)
    print('  %-26s %6d KB -> %5d KB   clips quitados: %s'
          % (os.path.basename(salida), os.path.getsize(entrada) // 1024,
             os.path.getsize(salida) // 1024, fuera or 'ninguno'))


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    opt(sys.argv[1], sys.argv[2],
        int(sys.argv[3]) if len(sys.argv) > 3 else 512,
        int(sys.argv[4]) if len(sys.argv) > 4 else 86)
