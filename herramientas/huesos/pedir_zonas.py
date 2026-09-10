#!/usr/bin/env python3
"""Pide a Rezona los assets de las DOS ZONAS NUEVAS de HUESOS.

    env -u REZONA_PAT python3 herramientas/huesos/pedir_zonas.py

Va aparte de `pedir.py` y no adentro: ése ya generó sus nueve y volver a
correrlo entero sería pagar de nuevo los siete que ya están. Lo que comparte
—el prefijo `PLANO` y el proyecto— se IMPORTA, así que no hay dos descripciones
del mismo estilo que se puedan separar.
"""
import json, sys
sys.path.insert(0, 'herramientas/rezona')
import rz
from importlib.machinery import SourceFileLoader
_p = SourceFileLoader('hpedir', 'herramientas/huesos/pedir.py').load_module()
PROY, PLANO = _p.PROY, _p.PLANO

SPRITES = [
 ('pantano', "A horizontal row of 4 separate objects from a dead flooded marsh: 1) a leaning dead tree with bare "
             "broken branches and hanging moss, 2) a tall clump of brown reeds and cattails, 3) a rotten hollow stump "
             "with fungus shelves, 4) a half-sunken dead log. Sickly green-grey and brown, painterly game art. " + PLANO),
 ('osario', "A horizontal row of 4 separate objects from a bone field ossuary: 1) a pile of stacked bleached long "
            "bones, 2) a half-buried ribcage in dry earth, 3) a cracked open stone sarcophagus with a broken lid, "
            "4) a cairn of stacked skulls. Bleached bone white and grey stone, painterly game art. " + PLANO),
]

SUELOS = [
 ('s_pantano', "Seamless tileable top-down texture of a dead swamp floor: black waterlogged peat mud, shallow stagnant "
               "water patches with a dull sheen, rotting brown leaves, pale sickly algae. Muted desaturated green and "
               "near-black, even flat lighting, no shadows, orthographic top view, photographic material sample."),
 ('s_osario', "Seamless tileable top-down texture of a bone field: pale dry cracked earth densely littered with small "
              "bleached bone fragments, vertebrae and teeth half buried, thin grey dust. Bone white and grey, even "
              "flat lighting, no shadows, orthographic top view, photographic material sample."),
]

def main():
    ll = []
    for n, p in SPRITES:
        ll.append(('submit_image_generation', {
            'project_id': PROY, 'output_path': 'assets/h_%s.png' % n,
            'prompt': p, 'size': '1536x512', 'transparent': True}))
    for n, p in SUELOS:
        ll.append(('submit_image_generation', {
            'project_id': PROY, 'output_path': 'assets/h_%s.png' % n,
            'prompt': p, 'size': '1024x1024'}))
    nombres = [n for n, _ in SPRITES] + [n for n, _ in SUELOS]
    tareas = json.load(open('assets/huesos/tareas.json'))
    for nom, r in zip(nombres, rz.sesion(ll, espera=600)):
        d = json.loads(rz.texto(r))
        tareas[nom] = {'task_id': d.get('task_id'), 'output_path': d.get('output_path'),
                       'ignored_params': d.get('ignored_params')}
        print('%-10s %s  %s' % (nom, d.get('task_id'), d.get('output_path')))
    json.dump(tareas, open('assets/huesos/tareas.json', 'w'), ensure_ascii=False, indent=2)

main()
