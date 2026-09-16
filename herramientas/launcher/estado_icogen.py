#!/usr/bin/env python3
"""Estado de las hojas de un pack, y trae las que ya estan listas.

    python3 herramientas/launcher/estado_icogen.py <pack> [--traer]

   ── `fetch_generated_asset` NO ES DE FIAR, Y SE PUEDE USAR IGUAL ──
   Se cuelga y el cliente muere a los 300 s — pero EL ARCHIVO QUEDA EN EL DISCO.
   La receta es lanzarlo con espera corta y despues comprobar el archivo. Y el
   `output_path` que hay que pedir lleva el sufijo del servidor: no
   `assets/x.png` sino `assets/x-g1.png`, que es lo que devuelve
   `check_generation_tasks`.
"""
import json, os, re, shutil, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
sys.path.insert(0, os.path.dirname(__file__))
import rz, recetas

PROY = 'uSEsgNYW'
RAIZ = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(RAIZ, 'crudo')
TAREAS = os.path.join(CRUDO, 'icopacks.json')
# la carpeta con marca `.rezona/`, FUERA del repo: `fetch_generated_asset` no
# escribe en una carpeta sin ella
BAJA = '/tmp/rez_ico'


def destino(pack, hoja):
    return os.path.join(CRUDO, ('%s.png' % hoja) if pack == 'generado'
                        else 'ico_%s_%s.png' % (pack, hoja))


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in recetas.RECETAS:
        sys.exit('packs: ' + ' '.join(sorted(recetas.RECETAS)))
    pack = sys.argv[1]
    T = json.load(open(TAREAS)).get(pack, {})
    if not T:
        sys.exit('%s: sin task_id — corré pedir_icogen.py' % pack)
    ids = [T[n] for n in sorted(T)]
    por_id = {T[n]: n for n in T}
    res = rz.sesion([('check_generation_tasks', {'task_ids': ids})], espera=120)
    txt = rz.texto(res[0]) if res else ''
    est = {}
    for it in json.loads(txt).get('items', []) if txt.strip().startswith('{') else []:
        est[por_id.get(it['task_id'], '?')] = (it['status'], it.get('asset_path'))
    listas = [n for n in sorted(est) if est[n][0] == 'ready']
    print('%s: %d listas de %d  (%s)' % (pack, len(listas), len(T),
          ' '.join('%s=%s' % (n, est[n][0]) for n in sorted(est) if est[n][0] != 'ready') or 'todas'))
    if '--traer' not in sys.argv:
        sys.exit(0)
    os.makedirs(BAJA, exist_ok=True)
    if not os.path.isdir(os.path.join(BAJA, '.rezona')):
        subprocess.run(['npx', '-y', 'rezona@latest', 'init'], cwd=BAJA,
                       capture_output=True, text=True, timeout=180)
    faltan = [n for n in listas if not os.path.exists(destino(pack, n))]
    for n in faltan:
        ap = est[n][1]
        # ── LA RUTA ES `ap` ENTERA Y NO SU BASENAME ──
        # `fetch_generated_asset` escribe respetando el `output_path`, o sea
        # en `<BAJA>/assets/x-g1.png`. Con el basename el archivo nunca se
        # encontraba: se volvía a bajar en cada vuelta y no se copiaba nunca
        # — noventa segundos por hoja tirados y ni un archivo en `crudo/`.
        loc = os.path.join(BAJA, ap)
        if not os.path.exists(loc):
            try:
                subprocess.run(['timeout', '100', 'python3',
                                os.path.join(RAIZ, '..', 'rezona', 'rz.py'), 'call',
                                'fetch_generated_asset',
                                json.dumps({'project_id': PROY, 'output_path': ap})],
                               cwd=BAJA, capture_output=True, text=True, timeout=140)
            except Exception:
                pass
        if os.path.exists(loc) and os.path.getsize(loc) > 1000:
            shutil.copy(loc, destino(pack, n))
            print('  %s  %d KB' % (n, os.path.getsize(loc) // 1024))
        else:
            print('  %s  NO BAJÓ' % n)
