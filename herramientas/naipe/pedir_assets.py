# -*- coding: utf-8 -*-
"""Pide las imagenes de NAIPE a Rezona Lab.

TODO VA AL PROYECTO DESCARTABLE. No se crea uno por juego: lo que vale es la
copia del repo, el proyecto es un andamio.

Y LOS task_id SE GUARDAN DESPUES DE CADA PEDIDO, no al final: perder el id es
perder el asset pagado.
"""
import json, pathlib, subprocess, sys

RZ   = 'herramientas/rezona/rz.py'
PROY = 'rpvTPzKA'            # «tmp — descartable, borrar» de ESTA cuenta
D    = pathlib.Path('herramientas/naipe/crudo')
TAR  = D / 'tareas.json'

# EL ESTILO VA EN UNA SOLA CADENA Y NO REESCRITO EN CADA PEDIDO: con diez
# prompts que describen el estilo cada uno a su manera salen diez dibujantes.
EST = ('flat vector game art, thick clean outlines, warm art-deco casino palette '
       'of deep green felt, cream, gold and crimson, no text, no letters, no words, '
       'centered, plain flat background')

PED = {
  'fieltro':      'seamless tileable dark green casino felt texture, subtle woven grain, '
                  'straight-on orthographic view, flat, no shadows, no objects',
  'dorso':        'ornate playing card back design, symmetric art-deco filigree medallion, '
                  'deep green with gold linework, ' + EST,
  'logo':         'emblem of a fan of four playing cards behind a small gold crown, '
                  'symmetric, ' + EST,
  'boton':        'wide horizontal plaque, rounded rectangle, cream with gold beveled rim, '
                  'empty centre, ' + EST,
  'botonOro':     'wide horizontal plaque, rounded rectangle, polished gold with darker rim, '
                  'empty centre, ' + EST,
  'com_vela':     'a lit candle with a tall flame, ' + EST,
  'com_espejo':   'an ornate hand mirror reflecting light, ' + EST,
  'com_obelisco': 'a tall stone obelisk with carved bands, ' + EST,
  'com_fogata':   'a small campfire with stacked logs, ' + EST,
  'com_comodin':  'a grinning jester head with a two-pointed cap and bells, ' + EST,
}

def rz(tool, args):
    p = subprocess.run([sys.executable, RZ, 'call', tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=300)
    if p.returncode or not p.stdout.strip().startswith('{'):
        raise SystemExit('%s: %s' % (tool, (p.stdout + p.stderr)[-500:]))
    return json.loads(p.stdout)

def main():
    D.mkdir(parents=True, exist_ok=True)
    tar = json.loads(TAR.read_text()) if TAR.exists() else {}
    for k, pr in PED.items():
        if k in tar:
            print('ya', k); continue
        r = rz('submit_image_generation', {
            'project_id': PROY, 'prompt': pr,
            'output_path': 'assets/naipe_%s.png' % k})
        tar[k] = r['task_id']
        TAR.write_text(json.dumps(tar, indent=1))
        print(k, r['task_id'])

if __name__ == '__main__':
    main()
