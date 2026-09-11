# -*- coding: utf-8 -*-
"""Trae a `crudo/` lo que ya esta listo en Rezona.

TRES COSAS QUE HAY QUE SABER Y QUE YA COSTARON SU VUELTA:
  · `fetch_generated_asset` NO recibe el `task_id`: recibe el `output_path`, y
    ese camino lleva el SUFIJO que le puso el servidor (`p_pared-g1.png`). Con el
    nombre que uno pidio contesta FILE_NOT_FOUND, que es un error terminal.
    El nombre bueno viene en `asset_path` de `check_generation_tasks`.
  · `destination_dir` se IGNORA: el servidor escribe donde encuentre una marca
    `.rezona/` y devuelve el sitio real en `absolute_path`. Sin leerlo, el guion
    informa «0 de 15 traidos» habiendo traido los quince.
  · Y las respuestas de JSON-RPC vuelven DESORDENADAS: hay que emparejar por el
    `id`, que es lo que hace `rz.sesion`.
"""
import json, os, shutil, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'rezona'))
import rz

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'crudo')
P = 'YlgCbidN'


def main():
  tareas = json.load(open(os.path.join(CRUDO, 'tareas.json')))
  ids = {k: v for k, v in tareas.items() if v.startswith('gtask-')}
  if len(sys.argv) > 1:
    ids = {k: v for k, v in ids.items() if k in set(sys.argv[1:])}
  os.makedirs(CRUDO, exist_ok=True)

  r = rz.sesion([('check_generation_tasks', {'task_ids': list(ids.values())})], espera=300)
  d = json.loads(rz.texto(r[0]))
  n2t = {v: k for k, v in ids.items()}
  caminos, pend = {}, []
  for it in d['items']:
    k = n2t.get(it['task_id'])
    if not k: continue
    if it['status'] == 'ready' and it.get('asset_path'): caminos[k] = it['asset_path']
    else: pend.append('%s:%s' % (k, it['status']))
  if pend: print('todavia no: ' + ' '.join(pend))

  res = rz.sesion([('fetch_generated_asset', {'project_id': P, 'output_path': p})
                   for p in caminos.values()], espera=900)
  ok = 0
  for (n, p), r in zip(caminos.items(), res):
    t = rz.texto(r)
    try: f = json.loads(t)['absolute_path']
    except Exception: f = ''
    if not f or not os.path.exists(f):
      print('  falla %-12s %s' % (n, t[:90].replace('\n', ' ')))
      continue
    dest = os.path.join(CRUDO, n + os.path.splitext(p)[1])
    shutil.copy(f, dest)
    ok += 1
    print('  %-12s %8d bytes -> crudo/%s' % (n, os.path.getsize(dest), os.path.basename(dest)))
  print('TRAIDOS %d de %d' % (ok, len(ids)))


main()
