#!/usr/bin/env python3
"""
FUSIONA LOS CLIPS DE LOS DOS GLB DE RIG EN UNO SOLO.

El servidor de Rezona acepta COMO MUCHO 5 animaciones por tarea de rig (medido: el detalle del
VALIDATION_ERROR dice max_length 5), asi que 10 animaciones son dos tareas. Las dos salen del
MISMO modelo con el MISMO rig, y eso es lo que hace esta fusion legal y barata: en Eco copiar
clips entre generaciones distintas exigio un retarget entero por espacio de mundo, porque cada
generacion trae otro esqueleto con otro reposo; aca el esqueleto es EL MISMO ARCHIVO, asi que
los canales del B apuntan a nodos que existen identicos en el A.

La fusion es a nivel glTF: se copian las `animations` del B al A, trayendo sus accesores y
bufferViews y REMAPEANDO los indices de nodo del B a los del A por NOMBRE. Los indices crudos no
sirven ni siquiera aca: el orden de los nodos en el JSON no esta garantizado entre dos
exportaciones.

    python3 herramientas/visor3d/fusionar.py A.glb B.glb salida.glb
"""
import json, os, struct, sys


def leer(p):
    b = open(p, 'rb').read()
    assert b[:4] == b'glTF', 'no es glb: ' + p
    total = struct.unpack('<I', b[8:12])[0]
    off = 12; js = None; bina = None
    while off < total:
        clen, ctype = struct.unpack('<I4s', b[off:off + 8])
        dat = b[off + 8:off + 8 + clen]
        if ctype == b'JSON':
            js = json.loads(dat.decode('utf8'))
        elif ctype == b'BIN\x00':
            bina = dat
        off += 8 + clen
    return js, bytearray(bina)


def escribir(p, js, bina):
    jb = json.dumps(js, separators=(',', ':')).encode('utf8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bb = bytes(bina); bb += b'\x00' * ((4 - len(bb) % 4) % 4)
    total = 12 + 8 + len(jb) + 8 + len(bb)
    with open(p, 'wb') as f:
        f.write(b'glTF'); f.write(struct.pack('<I', 2)); f.write(struct.pack('<I', total))
        f.write(struct.pack('<I', len(jb))); f.write(b'JSON'); f.write(jb)
        f.write(struct.pack('<I', len(bb))); f.write(b'BIN\x00'); f.write(bb)


def vista(js, bina, i):
    v = js['bufferViews'][i]
    o = v.get('byteOffset', 0)
    return bytes(bina[o:o + v['byteLength']])


def main():
    pa, pb, sal = sys.argv[1], sys.argv[2], sys.argv[3]
    ja, ba = leer(pa)
    jb, bb = leer(pb)

    nombresA = {n.get('name', ''): i for i, n in enumerate(ja.get('nodes', []))}

    def traerAccesor(idx):
        """copia un accesor del B al A, con su bufferView, y devuelve el indice nuevo"""
        acc = dict(jb['accessors'][idx])
        if 'bufferView' in acc:
            dat = vista(jb, bb, acc['bufferView'])
            while len(ba) % 4:
                ba.append(0)
            off = len(ba); ba.extend(dat)
            ja['bufferViews'].append({'buffer': 0, 'byteOffset': off, 'byteLength': len(dat)})
            acc['bufferView'] = len(ja['bufferViews']) - 1
        ja['accessors'].append(acc)
        return len(ja['accessors']) - 1

    ja.setdefault('animations', [])
    # Si el B trae un clip que el A ya tiene (los rigs de Rezona/Tripo pegan sus clips por
    # defecto en TODAS las tareas), se saltea: dos botones QUIETO son un defecto visible.
    yaEstan = {a.get('name', '') for a in ja['animations']}
    copiadas, sinNodo, repetidas = 0, [], 0
    for anim in jb.get('animations', []):
        if anim.get('name', 'clip') in yaEstan:
            repetidas += 1
            continue
        nueva = {'name': anim.get('name', 'clip'), 'samplers': [], 'channels': []}
        ok = True
        for ch in anim['channels']:
            nodoB = ch['target']['node']
            nombre = jb['nodes'][nodoB].get('name', '')
            if nombre not in nombresA:
                sinNodo.append(nombre); ok = False; break
        if not ok:
            continue
        for sm in anim['samplers']:
            nueva['samplers'].append({
                'input': traerAccesor(sm['input']),
                'output': traerAccesor(sm['output']),
                'interpolation': sm.get('interpolation', 'LINEAR'),
            })
        for ch in anim['channels']:
            nombre = jb['nodes'][ch['target']['node']].get('name', '')
            nueva['channels'].append({
                'sampler': ch['sampler'],
                'target': {'node': nombresA[nombre], 'path': ch['target']['path']},
            })
        ja['animations'].append(nueva)
        copiadas += 1

    while len(ba) % 4:
        ba.append(0)
    ja['buffers'] = [{'byteLength': len(ba)}]
    escribir(sal, ja, ba)
    print('clips del A:', len(ja['animations']) - copiadas, '+ copiados del B:', copiadas,
          '=', len(ja['animations']), '| repetidas salteadas:', repetidas)
    if sinNodo:
        print('OJO, clips salteados por nodos que no estan en A:', sorted(set(sinNodo))[:8])
    print(sal, os.path.getsize(sal), 'bytes')
    return 0


if __name__ == '__main__':
    sys.exit(main())
