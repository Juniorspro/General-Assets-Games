#!/usr/bin/env python3
"""EXTRAE SOLO LA ANIMACION de un GLB a otro GLB chiquito, sin mallas.

Para que sirve: reliquia/hero.glb y aero/hero-*.glb traen los clips que queremos
reciclar (RunFast, Idle, Run_02) pero vienen con KHR_draco_mesh_compression como
extension REQUERIDA, asi que el GLTFLoader del motor los rechaza enteros y no
cargan. La compresion DRACO afecta solo a la GEOMETRIA: las pistas de animacion
son accesores normales, perfectamente legibles.

Asi que en vez de arrastrar un decodificador DRACO (mas un wasm que bajar) se
saca lo unico que hace falta: los NODOS (con sus nombres, que es por donde el
AnimationMixer de three ata las pistas) y las ANIMACIONES. Sin mallas, sin
skins, sin materiales, sin texturas. El resultado pesa unos pocos KB, no pide
ninguna extension y carga en cualquier parte.

Uso: python3 extrae_clip.py <entrada.glb> <salida.glb> [nombre_del_clip]
"""
import json
import struct
import sys


def leer_glb(p):
    d = open(p, 'rb').read()
    if d[:4] != b'glTF':
        raise SystemExit('no es un GLB: ' + p)
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


def escribir_glb(p, js, bina):
    jb = json.dumps(js, separators=(',', ':')).encode('utf8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bb = bina + b'\x00' * ((4 - len(bina) % 4) % 4)
    total = 12 + 8 + len(jb) + (8 + len(bb) if bb else 0)
    with open(p, 'wb') as f:
        f.write(b'glTF' + struct.pack('<II', 2, total))
        f.write(struct.pack('<I', len(jb)) + b'JSON' + jb)
        if bb:
            f.write(struct.pack('<I', len(bb)) + b'BIN\x00' + bb)


def rebanada(js, bina, iacc):
    """los bytes crudos de un accesor, mas su descripcion"""
    acc = js['accessors'][iacc]
    bv = js['bufferViews'][acc['bufferView']]
    TAM = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
    COMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
    unidad = TAM[acc['componentType']] * COMP[acc['type']]
    paso = bv.get('byteStride') or unidad
    ini = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    if paso == unidad:
        cr = bina[ini:ini + unidad * acc['count']]
    else:                                  # entrelazado: se compacta
        cr = b''.join(bina[ini + i * paso: ini + i * paso + unidad]
                      for i in range(acc['count']))
    nuevo = {'componentType': acc['componentType'], 'count': acc['count'],
             'type': acc['type']}
    for k in ('min', 'max', 'normalized'):
        if k in acc:
            nuevo[k] = acc[k]
    return cr, nuevo


def extrae(entrada, salida, filtro=None):
    js, bina = leer_glb(entrada)
    anims = js.get('animations') or []
    if not anims:
        raise SystemExit('el GLB no trae animaciones: ' + entrada)
    if filtro:
        anims = [a for a in anims if filtro.lower() in (a.get('name') or '').lower()]
        if not anims:
            raise SystemExit('ningun clip coincide con ' + filtro)

    # los NODOS se conservan enteros (nombre + jerarquia + transformada), pero
    # SIN referencias a malla, camara ni skin: es por el NOMBRE que el mixer ata
    nodos = []
    for n in js.get('nodes', []):
        m = {}
        for k in ('name', 'children', 'translation', 'rotation', 'scale', 'matrix'):
            if k in n:
                m[k] = n[k]
        nodos.append(m)

    bufs, accs, vistas, pos = [], [], [], 0
    def agrega(iacc):
        nonlocal pos
        cr, desc = rebanada(js, bina, iacc)
        bufs.append(cr)
        vistas.append({'buffer': 0, 'byteOffset': pos, 'byteLength': len(cr)})
        pos += len(cr) + ((4 - len(cr) % 4) % 4)
        if len(cr) % 4:
            bufs.append(b'\x00' * ((4 - len(cr) % 4) % 4))
        desc['bufferView'] = len(vistas) - 1
        accs.append(desc)
        return len(accs) - 1

    nuevas = []
    for a in anims:
        muestras, canales = [], []
        for s in a['samplers']:
            muestras.append({'input': agrega(s['input']),
                             'output': agrega(s['output']),
                             'interpolation': s.get('interpolation', 'LINEAR')})
        for c in a['channels']:
            if c['target'].get('node') is None:
                continue
            canales.append({'sampler': c['sampler'], 'target': dict(c['target'])})
        nuevas.append({'name': a.get('name', 'clip'),
                       'samplers': muestras, 'channels': canales})

    bina2 = b''.join(bufs)
    out = {
        'asset': {'version': '2.0',
                  'generator': 'extrae_clip.py (solo animacion, sin mallas)'},
        'scene': 0,
        'scenes': [{'nodes': [i for i, n in enumerate(js.get('nodes', []))
                              if not any(i in p.get('children', [])
                                         for p in js.get('nodes', []))]}],
        'nodes': nodos,
        'animations': nuevas,
        'accessors': accs,
        'bufferViews': vistas,
        'buffers': [{'byteLength': len(bina2)}],
    }
    escribir_glb(salida, out, bina2)
    import os
    print('%-34s -> %-30s %5d KB  clips: %s'
          % (entrada.split('assets/')[-1], salida.split('assets/')[-1],
             os.path.getsize(salida) // 1024,
             ', '.join(a['name'] for a in nuevas)))


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    extrae(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
