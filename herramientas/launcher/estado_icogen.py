#!/usr/bin/env python3
"""Anota en `crudo/icogen.json` qué hoja es cada `task_id`, y trae las listas.

   `check_generation_tasks` devuelve `asset_path`, o sea que la hoja se puede
   RECUPERAR del propio servidor: no hace falta acordarse de qué se pidió.
"""
import json, os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
import rz

RUTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'crudo', 'icogen.json')
CRUDO = os.path.dirname(RUTA)
PROY = 'uSEsgNYW'


def estado(ids):
    r = rz.sesion([('check_generation_tasks', {'task_ids': ids})])
    return json.loads(rz.texto(r[0]))['items'] if r else []


if __name__ == '__main__':
    hojas = json.load(open(RUTA))
    ids = sys.argv[1:]
    if ids:                                   # anotar ids sueltos por su asset_path
        for it in estado(ids):
            n = os.path.basename(it.get('asset_path') or '').split('-')[0]
            if n in hojas:
                hojas[n]['task_id'] = it['task_id']
                print(n, it['task_id'], it['status'])
        json.dump(hojas, open(RUTA, 'w'), ensure_ascii=False, indent=1)
        sys.exit(0)

    tengo = {n: h['task_id'] for n, h in hojas.items() if h.get('task_id')}
    if not tengo:
        print('ninguna pedida'); sys.exit(0)
    listas, gen, mal = [], [], []
    for it in estado(list(tengo.values())):
        n = os.path.basename(it.get('asset_path') or '').split('-')[0]
        (listas if it['status'] == 'ready' else mal if it['status'] == 'failed' else gen).append(n)
    falta = [n for n in sorted(hojas) if n not in tengo]
    print('listas %d: %s' % (len(listas), ' '.join(sorted(listas))))
    print('generando %d: %s' % (len(gen), ' '.join(sorted(gen))))
    if mal: print('FALLADAS: %s' % ' '.join(sorted(mal)))
    if falta: print('sin pedir %d: %s' % (len(falta), ' '.join(falta)))
    # traer las que ya estan y todavia no bajaron
    traer = [n for n in sorted(listas) if not os.path.exists(os.path.join(CRUDO, n + '.png'))]
    if traer:
        print('trayendo:', ' '.join(traer))
        rz.sesion([('fetch_generated_asset',
                    {'project_id': PROY, 'output_path': 'assets/%s-g1.png' % n})
                   for n in traer], espera=600)
        import shutil
        for n in traer:
            o = '/tmp/rez_aero/assets/%s-g1.png' % n
            if os.path.exists(o):
                shutil.copy(o, os.path.join(CRUDO, n + '.png'))
                print('  ok', n)
