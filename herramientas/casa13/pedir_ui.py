#!/usr/bin/env python3
"""Pide a Rezona Lab las imagenes de la interfaz de CASA 13.

    cd /tmp/rez_casa13 && python3 .../pedir_ui.py            # manda las 7
    cd /tmp/rez_casa13 && python3 .../pedir_ui.py --estado    # mira como van
    cd /tmp/rez_casa13 && python3 .../pedir_ui.py --bajar     # baja las listas

LA IDEA: el HUD de este juego es el visor de una camara, asi que los controles
son LOS BOTONES DE LA PROPIA CAMARA — goma gastada, plastico de 1994, serigrafia
borrada. Y el menu es la etiqueta de la cinta, asi que su panel es papel viejo.

TRES TRAMPAS QUE YA COSTARON UNA VUELTA (estan en herramientas/rezona/estado.json):
· las respuestas llegan DESORDENADAS: rz.py ordena por el `id` del JSON-RPC.
· `size` es una sugerencia y el servidor NO avisa que la ignoro: hay que medir
  el archivo bajado.
· `fetch_generated_asset` BAJA el archivo y despues se cuelga; la excepcion de
  timeout NO significa que fallo. Se mira el disco, y se baja de a uno.
"""
import io, json, os, subprocess, sys, time

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..', 'rezona'))
import rz

PROY = 'hAojbYrD'
TAREAS = os.path.join(AQUI, 'tareas.json')

PLANO = ('straight-on orthographic top-down product photo, centered, flat even '
         'lighting, no cast shadow, no perspective, no text, no letters, no logo, '
         'isolated on a pure white background')

PEDIDOS = [
  ('etiqueta',
   'the paper label sticker peeled off an old VHS cassette, blank cream paper, '
   'aged and yellowed, foxing stains, coffee ring, fibre texture, one corner '
   'slightly torn and lifted, faint horizontal ruled line, scanned flat. ' + PLANO),
  ('tira',
   'a short strip of aged masking tape, cream coloured, torn ragged ends, '
   'crinkled, dusty, blank with no writing, stuck flat on white. ' + PLANO),
  ('linterna',
   'a single round rubber button from a 1990s camcorder body, dark grey worn '
   'rubber, concave top, scuffed chrome ring around it, tiny embossed lamp '
   'symbol worn almost away, dirty, seen from directly above. ' + PLANO),
  ('usar',
   'a single oblong rounded rubber button from a 1990s camcorder body, dark '
   'grey worn rubber, wide pill shape, scuffed edges, dust in the seam, seen '
   'from directly above. ' + PLANO),
  ('pausa',
   'a single small round grey plastic control button from a 1990s camcorder, '
   'worn silver ring, scratched, seen from directly above. ' + PLANO),
  ('aro',
   'a round rubber thumb pad ring from a 1990s camcorder control, black worn '
   'rubber donut ring with a hole in the middle, radial grip ridges, dusty, '
   'seen from directly above. ' + PLANO),
  ('perilla',
   'a small round black rubber thumbstick cap, concave dished top, grip '
   'ridges around the rim, worn shiny in the centre, seen from directly '
   'above. ' + PLANO),
]

# NO HAY `negative_prompt` EN ESTE SERVIDOR: lo que no se quiere se dice en el
# prompt. Y `transparent` lo recorta EL SERVIDOR, que le gana a mi relleno desde
# el borde — el recorte por luminancia se come los contornos oscuros de adentro.
NADA = ' No text, no letters, no numbers, no watermark, no hands, no frame.'


def mandar():
    llamadas = [('submit_image_generation',
                 {'project_id': PROY, 'prompt': p + NADA, 'size': '1024x1024',
                  'transparent': n not in ('etiqueta',),
                  'output_path': 'assets/ui_%s.png' % n}) for n, p in PEDIDOS]
    res = rz.sesion(llamadas, espera=600)
    t = {}
    for (n, _), r in zip(PEDIDOS, res):
        s = rz.texto(r)
        tid = None
        try: tid = json.loads(s).get('task_id')
        except Exception:
            import re
            m = re.search(r'"task_id":\s*"([^"]+)"', s)
            tid = m.group(1) if m else None
        t[n] = tid
        print('%-10s %s' % (n, tid or s[:120]))
    io.open(TAREAS, 'w', encoding='utf8').write(json.dumps(t, indent=1))


def estado():
    t = json.load(io.open(TAREAS, encoding='utf8'))
    ids = [v for v in t.values() if v]
    r = rz.sesion([('check_generation_tasks',
                    {'task_ids': ids, 'project_id': PROY})], espera=240)
    s = rz.texto(r[0])
    d = {}
    try:
        j = json.loads(s)
        for it in (j.get('items') or []):
            d[it.get('task_id')] = it
    except Exception:
        print(s[:2000]); return
    for n, tid in t.items():
        it = d.get(tid, {})
        print('%-10s %-12s %s' % (n, it.get('status', '?'),
                                  (it.get('public_url') or it.get('error') or '')[:110]))
    io.open(TAREAS + '.est', 'w', encoding='utf8').write(json.dumps(d, indent=1))


def bajar():
    """POR curl Y NO POR `fetch_generated_asset`. El fetch baja el archivo y
    despues se cuelga hasta que el cliente corta por timeout: siete assets serian
    siete timeouts encadenados. `check_generation_tasks` ya devuelve un
    `public_url` sin auth, asi que se baja de ahi y se mide el archivo."""
    t = json.load(io.open(TAREAS, encoding='utf8'))
    r = rz.sesion([('check_generation_tasks',
                    {'task_ids': [v for v in t.values() if v],
                     'project_id': PROY})], espera=240)
    d = {it['task_id']: it for it in json.loads(rz.texto(r[0]))['items']}
    os.makedirs('crudo', exist_ok=True)
    for n, tid in t.items():
        it = d.get(tid, {})
        if it.get('status') != 'ready':
            print('%-10s %s' % (n, it.get('status', '?'))); continue
        dst = os.path.join('crudo', 'ui_%s.png' % n)
        subprocess.run(['curl', '-sSL', '-o', dst, it['public_url']], check=True)
        try:
            from PIL import Image
            im = Image.open(dst); tam = '%dx%d %s' % (im.width, im.height, im.mode)
        except Exception as e:
            tam = 'ILEGIBLE %s' % e
        print('%-10s %7d bytes  %-18s recorte:%s'
              % (n, os.path.getsize(dst), tam, it.get('transparency_applied')))


if __name__ == '__main__':
    if '--estado' in sys.argv: estado()
    elif '--bajar' in sys.argv: bajar()
    else: mandar()
