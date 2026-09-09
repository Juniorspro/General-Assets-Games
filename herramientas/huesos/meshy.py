#!/usr/bin/env python3
"""Imprime la RECETA DE MESHY para las catorce piezas de HUESOS.

    python3 herramientas/huesos/meshy.py            # la receta, para pegar en la app
    python3 herramientas/huesos/meshy.py --json     # la misma, en JSON

═══════════════════════════════════════════════════════════════════════════
POR QUÉ ESTO NO ES UN SCRIPT QUE GENERA, SINO UNO QUE IMPRIME
═══════════════════════════════════════════════════════════════════════════
Porque desde acá no se puede apretar el botón, y eso está MEDIDO —no supuesto—
el 2026-09-09. Meshy en Rezona EXISTE y es real; lo que no existe es un camino
desde la llave de API hasta él. Son dos servidores distintos:

    el NAVEGADOR    rezona.ai/tln/biz/assets/model3d      ← acá vive Meshy
    la LLAVE        lab.rezona.ai/game/pgcserver          ← acá NO está

  · El catálogo público del Studio (GET https://rezona.ai/tln/biz/models, sin
    credencial) trae DOS modelos de 3D y uno es Meshy:

        tripo-h3-v3   vendor Tripo   244 créditos
        meshy-3d      vendor Meshy   100 créditos   ← más barato, y low-poly nativo

  · Todas las rutas del Studio que piden identidad contestan 401
    `unauthenticated` con la llave `rz_live_…`. Probado con Bearer, x-api-key,
    X-Rezona-Token, Cookie y el token pelado: 401 en las cinco. Y las del
    pgcserver que tocan el Studio contestan 403 PAT_ROUTE_FORBIDDEN («This
    endpoint is not available to API key credentials»): /canvas/…,
    /api/auth/me y /api/library/assets, o sea que tampoco se puede BAJAR
    después lo que se genere en la app.

  · Y el pgcserver no tiene Meshy ni escondido: su OpenAPI describe
    `AgentModel3DParams` como «3D 生成参数（对齐 Tripo /task 白名单）» —los
    parámetros alineados con la lista blanca de Tripo— sin ningún campo de
    proveedor; cualquier `model_version` desconocido devuelve literalmente
    «Unsupported **Tripo** model_version»; y en sus veintiún feature flags
    (`pgc-sprite-generation`, `pgc-3d-rigging`, …) no hay ninguno de Meshy.
    Mandar `model`, `ai_model` o `vendor` por el cuerpo devuelve 200 y se
    descarta EN SILENCIO: la tarea arranca igual, en Tripo.

  · Higgsfield sí tiene Meshy 6 y Meshy 7, y ahí también está cerrado: los dos
    espacios de trabajo —el privado y el de equipo «Rezona»— en 0 créditos.

O sea que el paso que falta es de una persona con el navegador abierto, no de
código. Este archivo existe para que ese paso dure dos minutos y no una tarde:
imprime los catorce prompts CON LOS PARÁMETROS EXACTOS que este juego necesita.

═══════════════════════════════════════════════════════════════════════════
Y MESHY ES MEJOR QUE TRIPO PARA ESTO, QUE ES LO QUE HACE QUE VALGA LA PENA
═══════════════════════════════════════════════════════════════════════════
No es una preferencia: es el número. Tripo devuelve UN MILLÓN de triángulos y
hay que bajarlos con gltfpack, y ahí la tanda actual se topa en su PISO
TOPOLÓGICO —cráneo 540, costillar 500, pie 418— porque un hueso generado no es
una cáscara sino un centenar de islas sueltas, y una isla cerrada no baja de
cuatro triángulos. Pedir menos no baja un triángulo.

Meshy remalla de verdad: `model_type: lowpoly` + `should_remesh: true` +
`target_polycount` desde CIEN. O sea que el presupuesto deja de ser una pelea
con el simplificador y pasa a ser un número que se pide. Por eso acá se piden
2× el presupuesto del juego: llega una malla limpia y cerrada, y el horneado la
lleva al número exacto sin islas que lo frenen.

CUANDO LLEGUEN LOS ARCHIVOS: se dejan en `assets/huesos/meshy/<pieza>.glb` y se
hornea con `python3 herramientas/huesos/hornear_3d.py`, que los prefiere sobre
los de Tripo sin tocar una línea. LO QUE SÍ HAY QUE VOLVER A MEDIR ES EL GIRO:
los `giro` de la tabla `P` están medidos contra las mallas de Tripo —tres venían
mirando a −X— y Meshy no tiene por qué orientar igual. El horneado imprime el
tamaño (x,y,z) de cada pieza, que es la primera señal, y la prueba de verdad es
la hoja de contactos.
"""
import json, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pedir_3d import PIEZAS          # UNA sola lista de prompts, no dos
from hornear_3d import P             # y UN solo presupuesto, el del juego

# `symmetry_mode` NO va en 'on' para todo. Un cráneo, un costillar, una pelvis,
# una corona y un yelmo son simétricos y forzarlo limpia el ruido de un lado;
# un fémur, una mano, un pie y las cinco armas NO lo son —una mano con los dedos
# curvados es lo contrario de simétrica— y forzarlo ahí le inventa un espejo.
SIM = {'craneo': 'on', 'costillar': 'on', 'pelvis': 'on', 'corona': 'on', 'yelmo': 'on'}

# EL DOBLE DEL PRESUPUESTO, redondeado a los cien del paso de la app. No es
# margen de gusto: el horneado decima hasta el número exacto y con una malla
# cerrada llega, así que lo único que hace falta es que Meshy no entregue ya
# por debajo. Pedir el presupuesto justo dejaría al horneado sin nada que hacer
# y a la pieza sin la pasada de `-sa`, que es la que conserva las costillas.
def objetivo(tris):
    return max(100, int(round(tris * 2 / 100.0)) * 100)


def main():
    tabla = {d['n']: d for d in P}
    recetas = []
    for n, prompt in PIEZAS:
        d = tabla[n]
        recetas.append({
            'pieza': n,
            'prompt': prompt,
            'params': {
                'ai_model': 'meshy-6',          # meshy-5 no soporta 4K ni image enhancement
                'mode': 'text_to_model',
                'model_type': 'lowpoly',
                'should_remesh': True,
                'topology': 'triangle',         # el juego dibuja triángulos, no quads
                'target_polycount': objetivo(d['tris']),
                'symmetry_mode': SIM.get(n, 'auto'),
                'should_texture': True,         # el horneado necesita COLOR para los vértices
                'enable_pbr': False,            # se muestrea sólo el albedo: metal/rugosidad no se leen
                'enable_rigging': False,        # el rig es del juego, no de la pieza
            },
            'presupuesto_del_juego': d['tris'],
            'guarda_en': 'assets/huesos/meshy/%s.glb' % n,
        })

    if '--json' in sys.argv:
        print(json.dumps(recetas, ensure_ascii=False, indent=1))
        return 0

    print('RECETA DE MESHY PARA LAS %d PIEZAS DE HUESOS' % len(recetas))
    print('app: rezona.ai/studio/3d  ·  modelo: Meshy  ·  100 créditos cada una'
          '  (%d en total)' % (100 * len(recetas)))
    print('los archivos van a assets/huesos/meshy/<pieza>.glb y se hornean con')
    print('    python3 herramientas/huesos/hornear_3d.py\n')
    fijos = {k: v for k, v in recetas[0]['params'].items()
             if k not in ('target_polycount', 'symmetry_mode')}
    print('IGUALES EN LAS CATORCE:')
    for k, v in fijos.items():
        print('    %-18s %s' % (k, v))
    print()
    for r in recetas:
        print('─' * 78)
        print('%s   ·   target_polycount %d   ·   symmetry_mode %s   ·   el juego usa %d tri'
              % (r['pieza'].upper(), r['params']['target_polycount'],
                 r['params']['symmetry_mode'], r['presupuesto_del_juego']))
        print()
        # el prompt entero, envuelto a 76 para que se pueda copiar de una
        import textwrap
        print(textwrap.fill(r['prompt'], 76))
        print()
    return 0


if __name__ == '__main__':
    sys.exit(main())
