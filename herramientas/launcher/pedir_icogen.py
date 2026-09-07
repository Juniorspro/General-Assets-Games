#!/usr/bin/env python3
"""Pide a Rezona las hojas del pack GENERADO.

   ── LO QUE SE PIDE ES UNA FORMA, NO UNA MARCA ──
   La prueba de la vuelta 125 ya lo dijo con dos imágenes: pedidas por NOMBRE,
   las nueve marcas volvieron mal (Instagram como una cámara de los noventa,
   Gmail como una «M», Uber deletreado); pedidos como SÍMBOLOS GENÉRICOS, los
   nueve salieron perfectos y en el orden pedido. Así que cada celda se describe
   por su geometría —«una nota musical blanca», «un avión de papel»— que es
   además lo que el logo ES.

   ── Y SE RECORTA POR REJA DECLARADA, NO POR COLOR ──
   El intento anterior pedía fondo magenta para poder recortar por clave de
   color, y el generador le pintó las BALDOSAS de magenta: la hoja entera salió
   violeta. Con la reja declarada no hace falta clave: la celda i,j ES el icono
   i,j, y el fondo puede ser negro, que es lo que el generador respeta.
"""
import json, re, subprocess, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
import rz

PROY = 'uSEsgNYW'

CABEZA = ('A 3x3 grid of nine separate mobile app icons on a pure black background. '
          'Each icon is a rounded-square Frutiger Aero glass tile, glossy and translucent, '
          'with a bright specular highlight sweeping across the top third, tiny water '
          'droplets, a soft inner glow and a thin light rim. Wide pure-black gutters '
          'between the tiles. The nine tiles, in reading order left to right and top to '
          'bottom, are: ')
COLA = ('. Flat orthographic view, each symbol centred in its tile, pure white symbols. '
        'No text, no captions, no labels, no letters other than the ones described, '
        'no watermark, no shadow outside the tiles, no border around the grid.')


def pide(nombre, celdas):
    """`celdas` son nueve textos, en orden de lectura."""
    cuerpo = '; '.join('%d) %s' % (i + 1, c) for i, c in enumerate(celdas))
    return ('submit_image_generation', {
        'project_id': PROY,
        'output_path': 'assets/%s.png' % nombre,
        'prompt': CABEZA + cuerpo + COLA,
        'size': '1024x1024',
    })


if __name__ == '__main__':
    RUTA = os.path.join(os.path.dirname(__file__), 'crudo', 'icogen.json')
    hojas = json.load(open(RUTA))
    cuales = [n for n in (sys.argv[1:] or sorted(hojas)) if not hojas[n].get('task_id')]
    if not cuales:
        print('no falta ninguna'); sys.exit(0)
    llamadas = [pide(n, hojas[n]['celdas']) for n in cuales]
    res = rz.sesion(llamadas)
    # ── SE EMPAREJA POR `id`, NO POR POSICION ──
    # Si una llamada no contesta dentro de la espera, la lista vuelve mas corta
    # y un `zip` le pone a la hoja 5 el task_id de la 7: el asset queda pagado y
    # perdido, que es exactamente lo que este archivo existe para evitar.
    for m in res:
        i = m.get('id', 0) - 10
        if not (0 <= i < len(cuales)):
            continue
        t = rz.texto(m)
        mm = re.search(r'"task_id":\s*"([^"]+)"', t)
        if mm:
            hojas[cuales[i]]['task_id'] = mm.group(1)
            print(cuales[i], mm.group(1))
        else:
            print(cuales[i], 'FALLO', t[:120])
    json.dump(hojas, open(RUTA, 'w'), ensure_ascii=False, indent=1)
    faltan = [n for n in cuales if not hojas[n].get('task_id')]
    if faltan:
        print('sin task_id:', ' '.join(faltan))
