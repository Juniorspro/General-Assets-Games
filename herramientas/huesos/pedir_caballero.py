#!/usr/bin/env python3
"""Pide a Rezona (Tripo) LA ARMADURA DEL CABALLERO de HUESOS.

    python3 herramientas/huesos/pedir_caballero.py

═══════════════════════════════════════════════════════════════════════════
POR QUÉ SEIS PIEZAS Y NO UN `SkinnedMesh` ENTERO
═══════════════════════════════════════════════════════════════════════════
El pedido dice «modelo 3D real con Tripo», y la forma cara de leerlo sería un
cuerpo riggeado. La vuelta 152 dejó escrito lo que eso cuesta y sigue siendo
cierto: las ONCE poses de este héroe —quieto, camina, corre, los tres golpes,
esquive, RUEDA, REMATE, daño y muerte— son funciones del tiempo sobre ESTE
rig, el patinaje cero sale de medir el ciclo, y un retarget de huesos costó
una vuelta entera en Eco.

Lo que sí se puede hacer entero es lo que la vuelta 145 ya hizo con los
esqueletos: **reemplazar la GEOMETRÍA de cada pieza y dejar el rig donde
está**. El héroe ya tiene dos piezas generadas —el yelmo y la espada— y las
otras nueve son cajas tintadas. Con estas seis, el caballero pasa a ser malla
generada de la cabeza a los pies y las once poses siguen valiendo sin tocar
una línea.

Y degrada por construcción: `hay3(k)` es falso hasta que la malla decodifica,
así que un base64 roto cuesta UNA pieza y no un héroe invisible.

═══════════════════════════════════════════════════════════════════════════
CADA PIEZA SE PIDE CONTRA LA CAJA QUE VA A OCUPAR
═══════════════════════════════════════════════════════════════════════════
`pon3caja` escala UNIFORME al mínimo de los tres ejes, así que una pieza con
otra proporción entra chica: el costillar salía al 31 % de su caja por venir
de costado. Por eso el prompt describe la PROPORCIÓN («taller than wide»,
«a long tube») además del objeto — y por eso el giro se comprueba después en
la hoja de contactos y no se adivina.
"""
import json, sys
sys.path.insert(0, 'herramientas/rezona')
import rz

PROY = 'rpvTPzKA'          # tmp — descartable, borrar (cuenta de REZONA_PAT)
MODELO = 'v3.0-20250812'

# El MISMO cierre que el yelmo y la espada del héroe (`HER` de pedir_3d.py), y
# se importa en vez de copiarse: dos descripciones del mismo acero se separan
# el día que se toque una, y entonces el peto y el yelmo salen de dos metales.
from importlib.machinery import SourceFileLoader
HER = SourceFileLoader('h3', 'herramientas/huesos/pedir_3d.py').load_module().HER

PIEZAS = [
 ('peto',    "A medieval knight's steel cuirass with both pauldrons: a rounded breastplate with a "
             "raised central ridge, a fluted lower edge, and one large round shoulder plate on each "
             "side. Empty armour, no head, no arms, no body inside. Wider than it is deep." + HER),
 ('faldar',  "A medieval knight's fauld: a short skirt of four overlapping horizontal steel lames "
             "that flares outward at the bottom, with a leather belt above it. Empty armour, no "
             "legs, no body. Wide and short, like a bell." + HER),
 ('brazal',  "A medieval knight's upper arm armour: a tapered steel tube of two overlapping plates "
             "with a small rounded cap at the top. Empty armour, no arm inside. A long narrow tube, "
             "much taller than it is wide." + HER),
 ('guante',  "A medieval knight's vambrace with the gauntlet attached: a tapered steel forearm tube "
             "ending in an articulated steel glove with the fingers closed into a fist. Empty "
             "armour, no arm inside. A long narrow shape, much taller than it is wide." + HER),
 ('quijote', "A medieval knight's cuisse: a curved steel thigh plate with a rounded knee cop at the "
             "bottom that has a small fan-shaped side wing. Empty armour, no leg inside. A long "
             "narrow shape, much taller than it is wide." + HER),
 ('greba',   "A medieval knight's greave with the sabaton attached: a steel shin tube ending at the "
             "bottom in a pointed armoured shoe of overlapping lames that juts forward. Empty "
             "armour, no leg inside. Tall and narrow, with the foot sticking out to one side at the "
             "bottom, like the letter L." + HER),
]

def main():
    ll = [('submit_model3d_generation', {
              'project_id': PROY, 'output_path': 'assets/h3_%s.glb' % n, 'prompt': p,
              'texture': True, 'pbr': False, 'texture_quality': 'detailed',
              'extra': {'face_limit': 6000, 'model_version': MODELO,
                        'smart_low_poly': True}})
          for n, p in PIEZAS]
    p = 'assets/huesos/tareas3d.json'
    tareas = json.load(open(p))
    for (n, _), r in zip(PIEZAS, rz.sesion(ll, espera=900)):
        d = json.loads(rz.texto(r))
        tareas[n] = {'task_id': d.get('task_id'), 'output_path': d.get('output_path'),
                     'ignored_params': d.get('ignored_params')}
        print('%-10s %-28s %s' % (n, d.get('task_id'), d.get('output_path')))
    json.dump(tareas, open(p, 'w'), ensure_ascii=False, indent=2)
    print('\n->', p)

if __name__ == '__main__':
    main()
