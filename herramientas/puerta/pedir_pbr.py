#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pide a Rezona Lab las texturas PBR de PUERTA BLANCA, una por cada lienzo
dibujado por codigo.

LA LISTA NO ESTA INVENTADA: sale de `__pb.texturas()`, que recorre la escena y
para cada textura procedural mide CUANTOS METROS CUBRE UN MOSAICO —area del
triangulo en el mundo dividida por su area en UV, sobre la repeticion—. Ese
numero es el que decide que tiene que mostrar la foto: es la regla 6 del
horneado, y sin el una foto de ladrillo sale con hiladas de 22 cm.

CADA PROMPT DICE CUANTAS UNIDADES SE VEN. No es un adorno del texto: es lo que
permite comprobar despues, midiendo la imagen, que la escala salio como se
pidio, y lo que fija la repeticion nueva.
"""
import io, json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
import rz

BASE = ('seamless tileable texture, straight-on orthographic top-down view, '
        'perfectly flat, no perspective, no vignette, no shadows cast on it, '
        'even neutral diffuse lighting, photographic, high detail, '
        'albedo / base colour map only')

# nombre : (metros que cubre la foto, que se pide)
TEX = {
 'campo_wood':     (0.45, 'weathered old timber planks, five vertical boards each about 9 cm wide, '
                          'grey-brown aged pine, visible grain, small knots, hairline splits'),
 'campo_wall':     (2.50, 'dirty raw concrete wall, dark charcoal grey, damp stains, fine pitting, '
                          'a few hairline cracks, no paint'),
 'granja_barn':    (2.40, 'old barn siding, six horizontal boards each about 40 cm tall, '
                          'faded oxblood red paint flaking off grey wood underneath'),
 'granja_wall':    (2.40, 'old barn siding, six horizontal boards each about 40 cm tall, '
                          'bare silvered grey weathered wood, no paint'),
 'granja_dirt':    (3.00, 'packed bare farmyard soil, dark damp earth with scattered dry straw '
                          'and small stones, tyre-flattened, no grass'),
 'granja_metal':   (1.60, 'corrugated galvanised steel sheet, eight vertical corrugations across, '
                          'dull zinc grey, faint scratches, a few dents'),
 'granja_rust':    (1.60, 'corrugated steel sheet eaten by rust, eight vertical corrugations across, '
                          'orange-brown oxide over dark metal, flaking scale'),
 'escuela_floor':  (1.20, 'institutional vinyl composition floor tile, a four by four checkerboard '
                          'of cream and grey 30 cm squares, scuffed and waxed, thin grout lines'),
 'escuela_wall':   (2.40, 'painted concrete block wall of an old school, pale institutional '
                          'green-grey, four courses of blocks visible, chipped paint, scuff marks'),
 'escuela_ceil':   (1.20, 'suspended acoustic ceiling, two by two fissured mineral fibre panels '
                          'of 60 cm with thin metal T-grid between them, off-white, water stains'),
 'escuela_board':  (2.00, 'old green chalkboard surface, dark porcelain green, smeared chalk dust '
                          'and eraser streaks, slightly uneven'),
 'escuela_locker': (0.60, 'painted sheet-metal school locker door, dull teal enamel, '
                          'vertical louvre vents at the top, dents and paint chips'),
 'biblio_floor':   (1.00, 'herringbone parquet floor, dark walnut strips about 7 cm wide, '
                          'old wax finish, visible grain, thin gaps between blocks'),
 'biblio_wall':    (1.20, 'dark stained oak wall panelling of an old library, two vertical panels '
                          'with a beaded joint, deep brown, aged varnish'),
 'biblio_carpet':  (1.60, 'worn antique persian rug, deep red and dark blue medallion pattern, '
                          'flattened pile, faded and dusty'),
 'biblio_stone':   (1.50, 'pale limestone slab, warm grey-beige, fine fossil speckle, '
                          'subtle veining, honed matte surface'),
 'calabozo_floor': (2.00, 'medieval dungeon flagstone floor, irregular grey stone slabs about 60 cm, '
                          'dark mortar joints, damp patches, worn hollows'),
 'calabozo_wall':  (1.50, 'medieval dungeon wall of rough coursed stone blocks, four courses visible, '
                          'cold damp grey granite, thick lime mortar, saltpetre bloom'),
 'calabozo_straw': (0.60, 'loose dry straw scattered on a stone floor, pale gold stalks, '
                          'trampled and dirty, dark stone showing through'),
 'capucha_tela':   (0.60, 'coarse burlap hessian sackcloth, thick jute weave, dirty dark brown, '
                          'frayed threads and stains'),
 'muneca_piel':    (0.45, 'antique porcelain doll skin, glazed pale cream ceramic covered in a fine '
                          'craquelure of hairline cracks, faint pink blush, chipped in places'),
 'simio_piel':     (1.40, 'diseased leathery animal hide, mottled grey-brown, thick wrinkles, '
                          'patchy sparse coarse hair, scabbed and necrotic in places'),
 'verdugo_piel':   (0.35, 'thick tanned leather, dark oxblood brown, deep creases and pores, '
                          'old scars and stitch holes, greasy sheen'),
 'criatura_piel':  (0.17, 'stretched pale human skin, taut over bone, fine wrinkles and pores, '
                          'faint blue veins under the surface, waxy and bloodless'),
}

ESTADO = '/tmp/pbr_tareas.json'
EN_VUELO = 10          # el tope de la cuenta son 12; se deja aire


def carga():
    try: return json.load(io.open(ESTADO, encoding='utf8'))
    except Exception: return {}


def guarda(d):
    io.open(ESTADO, 'w', encoding='utf8').write(json.dumps(d, ensure_ascii=False, indent=1))


def json_de(t):
    """el primer objeto JSON que haya en el texto de una respuesta"""
    if not t: return None
    i = t.find('{')
    if i < 0: return None
    try: return json.loads(t[i:])
    except Exception: return None


def main():
    proyecto = os.environ.get('PB_PROY')
    if not proyecto:
        print(rz.texto(rz.sesion([('create_project',
              {'name': 'PUERTA BLANCA — texturas PBR de los seis niveles'})])[0]))
        return
    d = carga()
    # UNA VUELTA DEL LAZO: se pregunta por lo que esta en vuelo y con el hueco que
    # queda se manda lo que falta. El tope de 12 es POR CUENTA, no por proyecto.
    pass
    for vuelta in range(60):
        pend = [n for n, v in d.items() if v.get('estado') == 'pending']
        if pend:
            r = rz.sesion([('check_generation_tasks',
                            {'task_ids': [d[n]['task_id'] for n in pend],
                             'project_id': proyecto})], espera=600)
            j = json_de(rz.texto(r[0])) or {}
            # LA CLAVE ES `items`. Con 'tasks'/'results' el lazo poleaba y no veia
            # nunca nada listo: quedaba con diez en vuelo para siempre y las otras
            # catorce no se pedian jamas. No fallaba: se colgaba en silencio.
            for it in (j.get('items') or []):
                for n in pend:
                    if d[n]['task_id'] == it.get('task_id'):
                        d[n]['estado'] = it.get('status', 'pending')
                        if it.get('asset_path'): d[n]['output_path'] = it['asset_path']
            guarda(d)
        vivos = sum(1 for v in d.values() if v.get('estado') == 'pending')
        faltan = [n for n in sorted(TEX) if n not in d]
        listos = sum(1 for v in d.values() if v.get('estado') in ('ready', 'succeeded', 'success'))
        print('vuelta %2d · listos %2d · en vuelo %2d · sin pedir %2d'
              % (vuelta, listos, vivos, len(faltan)), flush=True)
        if not faltan and vivos == 0: break
        hueco = max(0, EN_VUELO - vivos)
        manda = faltan[:hueco]
        if manda:
            res = rz.sesion([('submit_image_generation', {
                    'project_id': proyecto,
                    'output_path': 'assets/pbr_%s.png' % n,
                    'prompt': BASE + '. ' + TEX[n][1],
                    'size': '1024x1024'}) for n in manda], espera=900)
            for n, r in zip(manda, res):
                j = json_de(rz.texto(r))
                if j and j.get('task_id'):
                    d[n] = {'task_id': j['task_id'], 'output_path': j['output_path'],
                            'estado': j.get('status', 'pending')}
                    print('  ->', n, j['task_id'])
            guarda(d)
        if faltan or vivos: time.sleep(25)
    guarda(d)
    for n in sorted(d): print('%-18s %-10s %s' % (n, d[n].get('estado'), d[n].get('output_path')))

main()
