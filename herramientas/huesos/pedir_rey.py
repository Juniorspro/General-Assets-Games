#!/usr/bin/env python3
"""Pide a REZONA el rey de HUESOS: el modelo y su rig con animaciones.

    python3 herramientas/huesos/pedir_rey.py            # el modelo
    python3 herramientas/huesos/pedir_rey.py --rig      # el rig, con el task del modelo

═══════════════════════════════════════════════════════════════════════════
POR QUÉ ESTO REEMPLAZA A `meshy.py`
═══════════════════════════════════════════════════════════════════════════
`meshy.py` emitía un plan para Higgsfield, que es donde la vuelta 147 creyó que
estaba la única puerta a un modelo riggeado. El usuario dijo que no —que en otra
sesión había salido POR REZONA— y tenía razón: medido el 2026-09-09, Rezona
devuelve un GLB con **41 huesos y cinco clips** en dos llamadas, sin Higgsfield y
sin Meshy. Higgsfield encima está en cero créditos y Rezona no.

No es Meshy: el agente de Rezona es Tripo, y `model_version: meshy-6` contesta
`Unsupported Tripo model_version` en LAS DOS cuentas. Lo que importa es que lo que
se pedía —un cuerpo animado— Tripo lo da igual, y este repo ya lo había hecho así
en el Visor3D (Maicol 3D, diez animaciones, todo por Rezona Lab).

═══════════════════════════════════════════════════════════════════════════
LAS TRES COSAS QUE HAY QUE HACER BIEN, LAS TRES MEDIDAS
═══════════════════════════════════════════════════════════════════════════
1. **NADA COLGADO ENCIMA, O NO RIGGEA.** El primer rey salió con capa y el rig
   falló con `RIG_SOURCE_NOT_RIGGABLE`. La caja lo explica sin adivinar: 0,241 ×
   0,981 × 0,911 — casi tan HONDO como alto, o sea una losa. La capa le funde los
   brazos al torso y el prerigcheck de Tripo deja de leerlo humanoide. Sin capa,
   0,171 × 0,999 × 0,998 y pasa. **La capa se dibuja por código, que es como ya
   estaba en el juego** (matriz cero para el que no es rey).
2. **EL VOCABULARIO LLEVA PREFIJO.** Son `preset:walk`, no `walk`. Un nombre que
   el proveedor no conoce **se ignora en silencio** y devuelve el juego de clips
   por omisión: el rig sale bien y con las animaciones que no se pidieron. Se
   comprueba leyendo `ignored_animations` de `check_generation_tasks`.
3. **CINCO CLIPS COMO MUCHO** (`maxItems: 5` en el schema del servidor) y **cada
   uno se factura aparte**.

═══════════════════════════════════════════════════════════════════════════
Y UNA ANIMACIÓN NO SE DA POR BUENA PORQUE ESTÉ EN EL ARCHIVO
═══════════════════════════════════════════════════════════════════════════
Se mide el recorrido de un pie y de una mano por cinemática directa, que es lo
único que prueba que anima Y que los cinco son distintos. Medido sobre el GLB que
volvió (metros de punta a punta del clip):

    clip            pie     mano
    idle           0,100   0,152   respira, no camina
    walk           0,394   0,203   zancada
    run            0,504   0,494   zancada larga
    slash          0,121   0,617   trabaja el brazo, no el pie
    hurt           0,022   0,106   se encoge

═══════════════════════════════════════════════════════════════════════════
LA CUENTA IMPORTA
═══════════════════════════════════════════════════════════════════════════
Las herramientas `mcp__rezona__*` heredaron `REZONA_PAT` al arrancar la sesión, o
sea que van a la cuenta VIEJA. `env -u REZONA_PAT python3 rz.py` va a la NUEVA.
Lo generado por una NO se ve desde la otra: contesta «Not your project», que se
lee a proyecto borrado y no lo es. Las dos son del usuario y las dos tienen
crédito; lo que no se puede es mezclarlas a mitad de camino.
"""
import json, sys
sys.path.insert(0, 'herramientas/rezona')
import rz

PROY = 'rpvTPzKA'          # tmp — descartable, borrar (cuenta de REZONA_PAT)
TAREAS = 'assets/huesos/tareas_rezona.json'

# EL PROMPT PIDE LA SILUETA QUE EL PRERIGCHECK NECESITA, y las dos prohibiciones
# —nada colgado, brazos separados— no son estilo: son lo que decide si riggea.
REY = ("A full standing human skeleton, upright in a wide A-pose: the arms held clearly "
       "away from the body with a large gap on each side, the legs apart, the head up. "
       "Complete articulated skeleton with skull, ribcage, spine, pelvis, both arms with "
       "hands and both legs with feet, all bones connected. He wears a heavy tarnished "
       "gold crown with five tall spikes on his skull. Single figure, complete, centered, "
       "nothing else in frame. No cape, no cloak, no robe, no armour, no weapon, nothing "
       "draped over the body. Weathered pale ivory bone, matte, chipped and pitted with "
       "age. Photographed on a plain white background, even flat lighting. No base, no "
       "stand, no pedestal, no ground plane, no shadow.")

# Elegidos contra las poses que el juego YA tiene, no por su nombre: `carga` es su
# ataque, el combo del juego es de tres golpes, y un jefe de 460 de vida no camina
# casual. Cinco es el tope del servidor.
CLIPS = ['preset:idle', 'preset:walk', 'preset:run', 'preset:slash', 'preset:hurt']


def modelo():
    r = rz.sesion([('submit_model3d_generation', {
        'project_id': PROY, 'output_path': 'assets/rey.glb', 'prompt': REY,
        'texture': True, 'texture_quality': 'standard',
        'extra': {'face_limit': 6000}})])[0]
    d = json.loads(rz.texto(r))
    print('modelo', d.get('task_id'), d.get('output_path'))
    return d.get('task_id')


def rig(task):
    r = rz.sesion([('submit_rig3d_generation', {
        'project_id': PROY, 'output_path': 'assets/rey_rig.glb',
        'source_task_id': task, 'animations': CLIPS})])[0]
    d = json.loads(rz.texto(r))
    print('rig', d.get('task_id'), d.get('output_path'))
    # OJO: `ignored_animations` viene null al RECIBIR y sólo dice algo cuando la
    # tarea terminó. Hay que volver a mirarlo con check_generation_tasks.
    print('   ignored_animations al recibir (no prueba nada todavía):',
          d.get('ignored_animations'))
    return d.get('task_id')


if __name__ == '__main__':
    if '--rig' in sys.argv:
        t = json.load(open(TAREAS))['rey']['sin_capa']['task_id']
        rig(t)
    else:
        modelo()
