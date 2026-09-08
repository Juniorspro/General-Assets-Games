#!/usr/bin/env python3
"""Pide a Rezona Lab las tres texturas de la criatura de CASA 13.

    cd /tmp/rez_fig && python3 .../pedir_fig.py            # manda las 3
    cd /tmp/rez_fig && python3 .../pedir_fig.py --estado
    cd /tmp/rez_fig && python3 .../pedir_fig.py --bajar

LA IDEA: la criatura era tres primitivas grises, y a 68 cm del ojo eso se lee a
muñeco. Lo que la referencia tiene y el codigo no puede fingir son TRES
MATERIALES: una mortaja de lino sucio con manchas —manchas de verdad, con
estructura, no ruido de lienzo—, piel muerta grisacea, y pelo negro en hebras.

A SANGRE Y NO COMO OBJETO. `transparent` recorta el fondo y una muestra de
material no tiene fondo que recortar: se pide que el material LLENE EL CUADRO,
que es la leccion que ya costo una vuelta con la etiqueta de la cinta.

NADA QUEDA A LA VISTA EN LA APP: todo va al balde descartable, que se busca por
nombre, y lo que se conserva es la copia horneada del repo.
"""
import io, json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..', 'rezona'))
import rz
from balde import balde

PROY = balde()
TAREAS = os.path.join(AQUI, 'tareas_fig.json')

PLANO = ('flat material sample photographed straight on, the material fills the '
         'entire frame edge to edge, even diffuse lighting, no shadow, no object '
         'silhouette, no background visible, no text, no letters, no watermark')

PEDIDOS = [
  ('mortaja',
   'close-up of filthy old cotton nightgown fabric, off-white and greyish, '
   'large irregular grey and brown damp stains, mildew blotches, worn thin, '
   'faint weave visible, no pattern, no print. ' + PLANO),
  ('pielm',
   'close-up of pale grey dead human skin, bloodless, ashen greyish white, '
   'matte, fine dry pores and faint wrinkles, no hair, no blood, no wound. '
   + PLANO),
  ('pelom',
   'close-up of long straight black human hair, wet and stringy, dark strands '
   'running top to bottom, deep black with faint grey highlights, dense. '
   + PLANO),
]
NADA = ' No text, no letters, no numbers, no watermark, no hands, no face, no frame.'


def mandar():
    llamadas = [('submit_image_generation',
                 {'project_id': PROY, 'prompt': p + NADA, 'size': '1024x1024',
                  'transparent': False,
                  'output_path': 'assets/fig_%s.png' % n}) for n, p in PEDIDOS]
    res = rz.sesion(llamadas, espera=600)
    t = {}
    for (n, _), r in zip(PEDIDOS, res):
        s = rz.texto(r)
        try: tid = json.loads(s).get('task_id')
        except Exception:
            import re
            m = re.search(r'"task_id":\s*"([^"]+)"', s); tid = m.group(1) if m else None
        t[n] = tid
        print('%-10s %s' % (n, tid or s[:140]))
    io.open(TAREAS, 'w', encoding='utf8').write(json.dumps(t, indent=1))


def _items():
    t = json.load(io.open(TAREAS, encoding='utf8'))
    r = rz.sesion([('check_generation_tasks',
                    {'task_ids': [v for v in t.values() if v],
                     'project_id': PROY})], espera=240)
    s = rz.texto(r[0])
    return t, {it['task_id']: it for it in (json.loads(s).get('items') or [])}


def estado():
    t, d = _items()
    for n, tid in t.items():
        it = d.get(tid, {})
        print('%-10s %-12s %s' % (n, it.get('status', '?'),
              (it.get('public_url') or it.get('error') or '')[:110]))


def bajar():
    """POR curl: `fetch_generated_asset` baja el archivo y despues se cuelga."""
    t, d = _items()
    os.makedirs('crudo', exist_ok=True)
    for n, tid in t.items():
        it = d.get(tid, {})
        if it.get('status') != 'ready':
            print('%-10s %s' % (n, it.get('status', '?'))); continue
        dst = os.path.join('crudo', 'fig_%s.png' % n)
        subprocess.run(['curl', '-sSL', '-o', dst, it['public_url']], check=True)
        from PIL import Image
        im = Image.open(dst)
        print('%-10s %dx%d %s  %.0f KB' % (n, im.width, im.height, im.mode,
                                           os.path.getsize(dst) / 1024))


if __name__ == '__main__':
    a = sys.argv[1:]
    if '--estado' in a: estado()
    elif '--bajar' in a: bajar()
    else: mandar()
