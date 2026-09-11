#!/usr/bin/env python3
"""Pide a Rezona los sprites y las texturas de HUESOS.

    env -u REZONA_PAT python3 herramientas/huesos/pedir.py

POR QUÉ EN FILA DE CUATRO Y NO CUATRO PEDIDOS SUELTOS: cuatro llamadas son
cuatro dibujantes distintos y las cuatro variantes salen de familias que no
pegan entre sí. En una sola imagen el modelo mantiene el estilo, y el recorte
lo hace `hornear.py` por COMPONENTES CONEXAS — no por una tabla de coordenadas,
porque la reja que uno pide es una sugerencia: ya pasó que se pidieran tres en
fila y volvieran dos por tres con las filas repetidas.
"""
import json, sys
sys.path.insert(0, 'herramientas/rezona')
import rz

PROY = 'tOMtshuHnZ'

# Lo que hace que un billboard se lea a billboard: ortográfico, de frente, sin
# sombra en el piso y sin perspectiva. Cualquier escorzo se pelea con la cámara
# del juego, que lo va a mirar desde otro ángulo.
PLANO = ("Flat orthographic front elevation, straight-on, no perspective, no ground shadow, "
         "no cast shadow, no baseplate, fully transparent background, each item complete and "
         "not touching its neighbours, evenly spaced in one horizontal row, centered vertically.")

SPRITES = [
 ('arboles', "A horizontal row of 4 separate medieval European forest trees, full trees with trunk and canopy: "
             "1) a tall dark spruce, 2) a gnarled old oak with a thick twisted trunk, 3) a bare dead tree with "
             "cracked bark and broken branches, 4) a slender pale birch. Muted desaturated woodland palette, "
             "mossy bark, painterly game art. " + PLANO),
 ('arbustos', "A horizontal row of 4 separate shrubs and bushes for a medieval forest: 1) a dense round leafy bush, "
              "2) a thorny bramble tangle with dark berries, 3) a low wide juniper shrub, 4) a dry brittle dead bush. "
              "Muted woodland greens and browns, painterly game art. " + PLANO),
 ('plantas', "A horizontal row of 4 separate tall stalk plants, each a bare vertical stick-like stem with a few broad "
             "leaves sprouting from it: 1) a single tall reed-like stalk with three wide leaves, 2) a forked stalk with "
             "drooping leaves, 3) a young sapling stick with a small leafy tuft on top, 4) a curved stalk with leaves "
             "only near the base. Muted green painterly game art. " + PLANO),
 ('helechos', "A horizontal row of 4 separate ground plants for a forest floor: 1) an unfurled fern frond cluster, "
              "2) a tuft of tall wild grass, 3) a clump of broad-leaved ground cover, 4) a patch of pale dry straw grass. "
              "Muted woodland palette, painterly game art. " + PLANO),
 ('rocas', "A horizontal row of 4 separate rocks and stones: 1) a large mossy granite boulder, 2) a cracked angular "
           "grey rock, 3) a small cluster of three round pebbles, 4) a broken carved stone block with worn medieval "
           "chisel marks. Muted grey stone, painterly game art. " + PLANO),
 ('ruinas', "A horizontal row of 4 separate ruined medieval stone objects: 1) a broken stone column with a cracked "
            "capital, 2) a leaning weathered gravestone with worn illegible carving, 3) a crumbled low stone wall "
            "segment, 4) a rusted iron brazier on a tripod, cold and unlit. Muted grey stone and rusted iron, "
            "painterly game art. " + PLANO),
]

SUELOS = [
 ('s_bosque', "Seamless tileable top-down texture of a dense forest floor: dark damp soil, scattered brown fallen "
              "leaves, pine needles, small twigs, patches of moss. Muted desaturated green and brown, even flat "
              "lighting, no shadows, no objects, orthographic top view, photographic material sample."),
 ('s_piedra', "Seamless tileable top-down texture of an old medieval flagstone floor: irregular grey stone slabs with "
              "mortar gaps, worn edges, moss and dirt in the cracks. Even flat lighting, no shadows, orthographic top "
              "view, photographic material sample."),
 ('s_ceniza', "Seamless tileable top-down texture of cursed dead ground: cracked grey ash and pale dust, bleached bone "
              "fragments half buried, dry blackened earth. Muted colourless palette, even flat lighting, no shadows, "
              "orthographic top view, photographic material sample."),
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
    tareas = {}
    for nom, r in zip(nombres, rz.sesion(ll, espera=600)):
        d = json.loads(rz.texto(r))
        tareas[nom] = {'task_id': d.get('task_id'), 'output_path': d.get('output_path'),
                       'ignored_params': d.get('ignored_params')}
        print('%-10s %s  %s' % (nom, d.get('task_id'), d.get('output_path')))
    json.dump(tareas, open('assets/huesos/tareas.json', 'w'), ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
