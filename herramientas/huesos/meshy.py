#!/usr/bin/env python3
"""El PLAN DE MESHY de HUESOS: las catorce piezas y el rey riggeado con sus clips.

    python3 herramientas/huesos/meshy.py            # el plan, legible
    python3 herramientas/huesos/meshy.py --json     # el mismo, para pegar en la herramienta

═══════════════════════════════════════════════════════════════════════════
LA PUERTA DE MESHY ES HIGGSFIELD, Y EN ESTE REPO YA SE USÓ TRES VECES
═══════════════════════════════════════════════════════════════════════════
No es una hipótesis: está en el repo, con su horneado y su bitácora.

    RECREO      Baldi          `image_to_3d` (Meshy), riggeado + texturizado,
                               24 huesos          → herramientas/recreo/hornear_baldi.py
    VECINDARIO  la abuela      lo mismo           → herramientas/vecindario/hornear_abuela.py
    ECO         la criatura    `image_to_3d` (Meshy) + CUATRO CLIPS de su
                               biblioteca (341 · 613 · 644 · 386), fundidos en
                               un GLB             → herramientas/eco/juntar_clips.py

O sea que «un modelo con Meshy Y animaciones» ya salió de acá, y salió por
Higgsfield. La vuelta 146 fue a golpear la puerta equivocada —el Studio de
Rezona por HTTP— y escribió que no se podía; lo que no se podía era por ESA
puerta. Esta es la buena.

QUÉ HAY DEL OTRO LADO, medido el 2026-09-09 con `models_explore(type:'3d')`:

    meshy_v6_text_to_3d    texto → GLB   lowpoly + remesh + target_polycount
                                          desde 100, y rigging + animación
    meshy_v7_image_to_3d   imagen → GLB  lo mismo, con ultra_mode
    image_to_3d            imagen → GLB  el que usaron RECREO, VECINDARIO y ECO
    3d_rigging             GLB → GLB     riggea y anima un modelo que ya existe
    meshy_v5_remesh        GLB → GLB     remalla a un polycount pedido

`meshy_v6_text_to_3d` es el que le sirve a HUESOS, porque los catorce prompts
que este juego ya tiene son TEXTO, no imágenes.

LO ÚNICO QUE FALTA SON CRÉDITOS, y también está medido hoy:

    preflight de una pieza (get_cost)  →  25 créditos
    generar de verdad                  →  «Out of credits in the selected workspace»
    espacio privado    (free)          →  0 créditos
    espacio «Rezona»   (team)          →  0 créditos

Con eso el plan entero sale 14 × 25 + 6 × 25 = 500 créditos.

═══════════════════════════════════════════════════════════════════════════
POR QUÉ MESHY Y NO TRIPO, QUE ES LO QUE HACE QUE VALGA LA PENA
═══════════════════════════════════════════════════════════════════════════
No es preferencia: es el número de la vuelta 145. Tripo devuelve UN MILLÓN de
triángulos y hay que bajarlos con gltfpack; ahí las piezas se topan en su PISO
TOPOLÓGICO —cráneo 540, costillar 500, pie 418— porque un hueso generado no es
una cáscara sino un centenar de islas sueltas, y una isla cerrada no baja de
cuatro triángulos. Medido con `-si 0.01`, o sea pidiendo el 1 %: no baja UN
triángulo.

Meshy remalla de verdad: `model_type:'lowpoly'` + `should_remesh` +
`target_polycount` desde CIEN. El presupuesto deja de ser una pelea con el
simplificador y pasa a ser un número que se pide.

CUANDO LLEGUEN LOS ARCHIVOS: las catorce piezas van a
`assets/huesos/meshy/<pieza>.glb` y se hornean con `hornear_3d.py`, que las
prefiere sobre las de Tripo sin tocar una línea. LO QUE HAY QUE VOLVER A MEDIR
ES EL GIRO: los `giro` de la tabla `P` están medidos contra las mallas de Tripo
—tres venían mirando a −X— y Meshy no tiene por qué orientar igual. El horneado
imprime el tamaño (x,y,z) de cada pieza, que es la primera señal; la prueba de
verdad es la hoja de contactos.
"""
import json, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pedir_3d import PIEZAS          # UNA sola lista de prompts, no dos
from hornear_3d import P             # y UN solo presupuesto, el del juego

MODELO = 'meshy_v6_text_to_3d'
CREDITOS = 25                        # medido con get_cost el 2026-09-09

# `symmetry_mode` NO va en 'on' para todo. Un cráneo, un costillar, una pelvis,
# una corona y un yelmo son simétricos y forzarlo limpia el ruido de un lado;
# un fémur, una mano, un pie y las cinco armas NO lo son —una mano con los dedos
# curvados es lo contrario de simétrica— y forzarlo ahí le inventa un espejo.
SIM = {'craneo': 'on', 'costillar': 'on', 'pelvis': 'on', 'corona': 'on', 'yelmo': 'on'}

# EL PRESUPUESTO SE PIDE AL DOBLE, y el doble no es un margen de seguridad: con
# una malla CERRADA el horneado llega al número exacto con `-sa`, y esa pasada
# es la que conserva las costillas. Pidiendo el presupuesto justo, la pieza
# llegaría ya en su objetivo y se saltearía el decimado —que es lo que le da la
# forma final—. Redondeado a los cien del paso de la app.
def objetivo(tris):
    return max(100, int(round(tris * 2 / 100.0)) * 100)


# ── EL REY, QUE ES DONDE LAS ANIMACIONES DE MESHY TIENEN SENTIDO ─────────────
# Los catorce huesos NO se riggean, y eso no es pereza: son un KIT INSTANCIADO
# —catorce esqueletos cuestan una llamada de dibujo POR PIEZA, no por cuerpo— y
# un `SkinnedMesh` no se instancia. Encima las nueve poses del juego están
# escritas sobre ese rig con mezcla, y el patinaje cero sale de medir el ciclo.
# Reemplazando sólo la GEOMETRÍA, las cuatro cosas siguen en pie: está medido
# que el auto-jugador da resultados IDÉNTICOS con mallas y con cajas.
#
# El rey es el único caso donde un cuerpo riggeado paga: hay UNO SOLO, así que
# no hay nada que instanciar, y es el que el jugador mira de cerca al final.
# Los seis clips salen de la biblioteca de Meshy (678 acciones) y están elegidos
# contra las poses que el juego ya tiene, no por su nombre:
REY_CLIPS = [
    ('quieto', 89,  'Combat_Stance',           'un jefe no está en reposo neutro'),
    ('camina', 119, 'Slow_Orc_Walk',           '460 de vida no camina casual'),
    ('carga',  510, 'Standard_Forward_Charge', 'la carga ES su ataque, y es una pose del juego'),
    ('golpe',  105, 'Triple_Combo_Attack',     'el juego tiene combo de tres'),
    ('dano',   178, 'Hit_Reaction',            ''),
    ('muere',  8,   'Dead',                    ''),
]

REY_PROMPT = (
    "A towering undead skeleton king in full battle stance: a human skeleton with a "
    "heavy crown of five spikes, a tattered cape over the shoulders and a dented "
    "breastplate. Weathered pale bone, eaten iron. Single character, complete, "
    "centered, standing upright, nothing else in frame."
)
REY_TRIS = 4000       # el rey ocupa el 39 % del alto del cuadro; el cuerpo entero
                      # de un esqueleto de kit son 4.722 triángulos


def plan():
    """Los parámetros exactos, uno por generación. Ésta es la única lista."""
    fila = []
    for n, prompt in PIEZAS:
        tris = next(d['tris'] for d in P if d['n'] == n)
        fila.append(dict(
            que='pieza', nombre=n, salida='assets/huesos/meshy/%s.glb' % n,
            params=dict(
                model=MODELO, prompt=prompt, mode='full',
                model_type='lowpoly', topology='triangle',
                target_polycount=objetivo(tris), should_remesh=True,
                symmetry_mode=SIM.get(n, 'auto'),
                enable_pbr=False, enable_rigging=False)))

    for pose, cid, cnom, _ in REY_CLIPS:
        fila.append(dict(
            que='rey', nombre='rey_%s' % pose, clip=cnom,
            salida='assets/huesos/meshy/rey_%s.glb' % pose,
            params=dict(
                model=MODELO, prompt=REY_PROMPT, mode='full',
                model_type='lowpoly', topology='triangle',
                target_polycount=REY_TRIS, should_remesh=True,
                symmetry_mode='auto', enable_pbr=False,
                # el rig y la animación son lo que este bloque viene a pedir
                enable_rigging=True, rigging_height_meters=2.1,
                pose_mode='a-pose',        # rig más limpio, recomendado con rigging
                enable_animation=True, animation_action_id=cid)))
    return fila


def main():
    fila = plan()
    if '--json' in sys.argv:
        print(json.dumps(fila, ensure_ascii=False, indent=1)); return

    piezas = [f for f in fila if f['que'] == 'pieza']
    reyes = [f for f in fila if f['que'] == 'rey']

    print('PLAN DE MESHY — herramienta: generate_3d (Higgsfield) · modelo: %s' % MODELO)
    print('%d generaciones × %d créditos = %d\n' % (len(fila), CREDITOS, len(fila) * CREDITOS))

    print('── LAS %d PIEZAS DEL KIT (sin rig: van instanciadas) ──' % len(piezas))
    for f in piezas:
        p = f['params']
        print('  %-10s %5d tri  sim:%-4s  → %s' % (
            f['nombre'], p['target_polycount'], p['symmetry_mode'], f['salida']))

    print('\n── EL REY, RIGGEADO, %d CLIPS ──' % len(reyes))
    for f, (pose, cid, cnom, por) in zip(reyes, REY_CLIPS):
        print('  %-10s clip %3d %-24s %s' % (pose, cid, cnom, por))
    print('  los seis se funden en UN GLB con herramientas/eco/juntar_clips.py')
    print('  (una malla, un esqueleto, todos los clips — ya probado en ECO)')

    print('\nDespués: los .glb a assets/huesos/meshy/ y')
    print('  python3 herramientas/huesos/hornear_3d.py     ← ya los prefiere sobre Tripo')


if __name__ == '__main__':
    main()
