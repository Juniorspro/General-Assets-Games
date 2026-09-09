#!/usr/bin/env python3
"""Espera a que las piezas 3D de HUESOS estén listas y las baja.

    env -u REZONA_PAT python3 herramientas/huesos/traer_3d.py

Dos cosas que ya costaron una vuelta cada una y por eso están escritas acá:
  · la lista de estados viene en la clave `items`. Leyendo `tasks` o `results`
    el lazo polea sin ver nunca nada listo y se cuelga EN SILENCIO.
  · al bajar, el `output_path` va CON el sufijo `-g1` que le puso el servidor:
    pasando el nombre que uno pidió devuelve FILE_NOT_FOUND, y ese error es
    terminal, no un reintento.
Y `fetch_generated_asset` se niega a escribir en una carpeta sin marca
`.rezona/`, que la pone `npx rezona@latest init` — se hace FUERA del repo.
"""
import json, os, shutil, subprocess, sys, time
sys.path.insert(0, 'herramientas/rezona')
import rz

PROY = 'tOMtshuHnZ'
BAJA = '/tmp/rez_hue'
TAREAS = 'assets/huesos/tareas3d.json'

def main():
    t = json.load(open(TAREAS))
    ids = {v['task_id']: n for n, v in t.items()}
    pend = set(ids)
    listo, malo = {}, {}
    for vuelta in range(60):
        r = rz.sesion([('check_generation_tasks', {'task_ids': sorted(pend)})], espera=300)
        d = json.loads(rz.texto(r[0]))
        for it in d.get('items', []):
            tid, st = it.get('task_id'), it.get('status')
            if st == 'ready':
                listo[ids[tid]] = it.get('output_path') or t[ids[tid]]['output_path']
                pend.discard(tid)
            elif st in ('failed', 'error'):
                malo[ids[tid]] = it.get('error') or st
                pend.discard(tid)
        print('vuelta %2d  listos %2d  malos %d  pendientes %2d' % (
            vuelta, len(listo), len(malo), len(pend)), flush=True)
        if not pend:
            break
        time.sleep(20)

    if malo:
        print('FALLARON:', json.dumps(malo, ensure_ascii=False, indent=2))

    os.makedirs(BAJA, exist_ok=True)
    if not os.path.isdir(os.path.join(BAJA, '.rezona')):
        subprocess.run(['npx', '-y', 'rezona@latest', 'init'], cwd=BAJA,
                       capture_output=True, text=True, timeout=300)

    # de a pocos: veinticinco descargas en una sola sesión de rz.py pasan de los
    # 200 s y el `npx rezona mcp` se cae por timeout
    nn = sorted(listo)
    for i in range(0, len(nn), 4):
        lote = nn[i:i + 4]
        rs = rz.sesion([('fetch_generated_asset', {
            'project_id': PROY, 'task_id': t[n]['task_id'],
            'output_path': listo[n], 'destination_dir': BAJA}) for n in lote], espera=600)
        for n, r in zip(lote, rs):
            try:
                d = json.loads(rz.texto(r))
                # `destination_dir` se IGNORA: el servidor escribe donde quiere y lo
                # único que dice dónde quedó es `absolute_path` de la respuesta
                p = d.get('absolute_path') or d.get('path')
                dst = 'assets/huesos/%s.glb' % n
                shutil.copy(p, dst)
                print('%-10s %8d B  %s' % (n, os.path.getsize(dst), dst), flush=True)
            except Exception as e:
                print('%-10s NO BAJÓ  %s  %s' % (n, e, rz.texto(r)[:200]), flush=True)

if __name__ == '__main__':
    main()
