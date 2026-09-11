# -*- coding: utf-8 -*-
"""Baja a disco los assets ya generados de un proyecto de Rezona.

Faltaba en el repo: las vueltas anteriores los trajeron a mano con el MCP, y eso
garantiza que la proxima sesion vuelva a descubrir las dos trampas de siempre.

  1. EL `output_path` LLEVA EL SUFIJO QUE PUSO EL SERVIDOR. Se pide
     `a_fondo.png` y el servidor guarda `a_fondo-g1.png`; pidiendo el nombre sin
     sufijo, `fetch_generated_asset` contesta FILE_NOT_FOUND y es un error
     TERMINAL, no un reintento. El nombre bueno viene en `asset_path` de
     `check_generation_tasks`, asi que se lee de ahi y no se adivina.

  2. NO ESCRIBE EN UNA CARPETA SIN MARCA. Hace falta un `.rezona/` en el destino,
     y ese destino tiene que estar FUERA del repo: este repo es publico.

Uso:  python3 herramientas/casual/traer.py /tmp/arco_tasks.json /tmp/rez_casual
"""
import io, json, os, shutil, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', 'rezona'))
import rz

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CRUDO = os.path.join(RAIZ, 'herramientas', 'casual', 'crudo')


def main():
    estado = sys.argv[1]
    base = sys.argv[2] if len(sys.argv) > 2 else '/tmp/rez_casual'
    ids = json.load(open(estado))
    os.makedirs(os.path.join(base, '.rezona'), exist_ok=True)
    os.makedirs(CRUDO, exist_ok=True)

    r = rz.sesion([('check_generation_tasks', {'task_ids': list(ids.values())})],
                  espera=300)
    d = json.loads(rz.texto(r[0]))
    n2t = {v: k for k, v in ids.items()}
    caminos = {}
    for it in d['items']:
        if it['task_id'] in n2t and it['status'] == 'ready' and it.get('asset_path'):
            caminos[n2t[it['task_id']]] = it['asset_path']

    llam = [('fetch_generated_asset',
             {'project_id': 'YlgCbidN', 'output_path': p}) for p in caminos.values()]
    res = rz.sesion(llam, espera=900)
    ok = 0
    for (n, p), r in zip(caminos.items(), res):
        t = rz.texto(r)
        # ── DONDE CAYO EL ARCHIVO LO DICE LA RESPUESTA, NO NOSOTROS ──
        # `destination_dir` se ignora: el servidor escribe en la carpeta marcada
        # con `.rezona/` que encuentra, que aca es la RAIZ DEL REPO. Adivinar el
        # camino devuelve «no existe» sobre nueve archivos que si se bajaron.
        try:
            f = json.loads(t)['absolute_path']
        except Exception:
            f = os.path.join(base, os.path.basename(p))
        if not os.path.exists(f):
            print('  falla %-12s %s' % (n, t[:80].replace('\n', ' ')))
            continue
        ext = os.path.splitext(p)[1]
        shutil.copy(f, os.path.join(CRUDO, n + ext))
        ok += 1
        print('  %-12s %8d bytes -> crudo/%s%s' % (n, os.path.getsize(f), n, ext))
    print('TRAIDOS %d de %d' % (ok, len(ids)))


main()
