#!/usr/bin/env python3
"""Pide a Rezona las hojas de un pack de iconos.

    python3 herramientas/launcher/pedir_icogen.py <pack> [hoja ...]

   ── LO QUE SE PIDE ES UNA FORMA, NO UNA MARCA ──
   La prueba de la vuelta 125 ya lo dijo con dos imagenes: pedidas por NOMBRE,
   las nueve marcas volvieron mal (Instagram como una camara de los noventa,
   Gmail como una «M», Uber deletreado); pedidos como SIMBOLOS GENERICOS, los
   nueve salieron perfectos y en el orden pedido. Asi que cada celda se describe
   por su geometria —«una nota musical blanca», «un avion de papel»— que es
   ademas lo que el logo ES.

   ── Y SE RECORTA POR REJA DECLARADA, NO POR COLOR ──
   El intento anterior pedia fondo magenta para poder recortar por clave de
   color, y el generador le pinto las BALDOSAS de magenta: la hoja entera salio
   violeta. Con la reja declarada no hace falta clave: la celda i,j ES el icono
   i,j, y el fondo puede ser negro, que es lo que el generador respeta.

   ── LOS `task_id` VAN POR PACK, EN UN ARCHIVO APARTE ──
   `crudo/icogen.json` es el CATALOGO DE SIMBOLOS y no cambia de un pack a otro;
   lo que cambia es que hoja de que pack se pidio. Mezclarlos en el mismo
   archivo obliga a un `task_id_<pack>` por fila y el dia que se agregue un pack
   hay que tocar 23 filas. Y perder un `task_id` es perder un asset PAGADO.
"""
import json, os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
sys.path.insert(0, os.path.dirname(__file__))
import rz, recetas

PROY = 'uSEsgNYW'
RAIZ = os.path.dirname(os.path.abspath(__file__))
SIMB = os.path.join(RAIZ, 'crudo', 'icogen.json')
TAREAS = os.path.join(RAIZ, 'crudo', 'icopacks.json')
TANDA = 8          # 23 de una sola vez se vencen antes de contestar


def hojas():
    return json.load(open(SIMB))


def tareas():
    if os.path.exists(TAREAS):
        return json.load(open(TAREAS))
    # la primera vez se siembra con lo que ya estaba pagado en icogen.json
    h = hojas()
    return {'generado': {n: h[n]['task_id'] for n in h if h[n].get('task_id')}}


def guarda(t):
    json.dump(t, open(TAREAS, 'w'), ensure_ascii=False, indent=1, sort_keys=True)


def salida(pack, hoja):
    return 'assets/ico_%s_%s.png' % (pack, hoja)


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in recetas.RECETAS:
        sys.exit('packs: ' + ' '.join(sorted(recetas.RECETAS)))
    pack = sys.argv[1]
    H, T = hojas(), tareas()
    T.setdefault(pack, {})
    pedidas = sys.argv[2:] or sorted(H)
    cuales = [n for n in pedidas if not T[pack].get(n)]
    if not cuales:
        print('%s: no falta ninguna de %d' % (pack, len(pedidas))); sys.exit(0)
    print('%s: faltan %d de %d' % (pack, len(cuales), len(H)))
    for i in range(0, len(cuales), TANDA):
        lote = cuales[i:i + TANDA]
        llamadas = [('submit_image_generation', {
            'project_id': PROY, 'output_path': salida(pack, n),
            'prompt': recetas.prompt(pack, H[n]['celdas']), 'size': '1024x1024',
        }) for n in lote]
        for m in rz.sesion(llamadas):
            k = m.get('id', 0) - 10
            if not (0 <= k < len(lote)):
                continue
            mm = re.search(r'"task_id":\s*"([^"]+)"', rz.texto(m))
            if mm:
                T[pack][lote[k]] = mm.group(1)
                print(' ', lote[k], mm.group(1))
            else:
                print(' ', lote[k], 'FALLO', rz.texto(m)[:140])
        guarda(T)          # se escribe por tanda: un corte no pierde lo pagado
    faltan = [n for n in cuales if not T[pack].get(n)]
    print('sin task_id:', ' '.join(faltan) if faltan else 'ninguna')
