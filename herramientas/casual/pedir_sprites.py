# -*- coding: utf-8 -*-
"""Los sprites de los ocho casuales, generados con Rezona. Reencola solo.

TRES REGLAS DE LOS PROMPTS, Y LAS TRES YA COSTARON UNA TANDA:

1. FONDO MAGENTA PURO Y SEPARACION ENTRE CELDAS. El recorte a alfa se hace por
   relleno desde las esquinas de cada celda, asi que las celdas tienen que estar
   separadas: pegadas, el relleno de una entra en la de al lado.
2. NADA DE MARCOS. El generador dibuja la reja que se le pide, y ese marco entra
   en la caja del sprite: en PUERTA se pinto del color de la ropa y quedo un
   rectangulo rojo alrededor de la persona.
3. SE PIDE EL OBJETO Y NO LA ESCENA. «una canica» devuelve una canica sobre una
   mesa con sombra; «a single glass marble, isolated, centered» devuelve la
   canica sola, que es lo unico que se puede recortar.
"""
import json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', 'rezona'))
import rz

P = 'YlgCbidN'
MAG = (' Flat pure magenta (#FF00FF) background, no shadows, no ground, no'
       ' frame, no borders, no text. Bold clean cartoon shading with a dark'
       ' outline, bright and readable at small size.')
REJA = (' arranged in a strict %d columns by %d rows grid, each one fully'
        ' inside its own cell with a WIDE magenta gap between cells and no'
        ' separator lines of any kind.')

PED = {
 # ── PIEDRA: las tres manos ──
 'manos':   ('Three cartoon hands seen from the front on a flat magenta'
             ' background: a closed FIST, an open PALM with five fingers'
             ' spread, and a V of two fingers (scissors). Warm skin tone.' +
             (REJA % (3, 1)) + MAG, '1:1'),
 # ── TORRE: los bloques ──
 'bloques': ('Eight cartoon stone-and-wood building slabs seen from the front,'
             ' one per colour: red, orange, yellow, green, teal, blue, purple,'
             ' pink. Each is a wide rectangular block with a bevelled top edge'
             ' and a darker base,' + (REJA % (4, 2)) + MAG, '1:1'),
 # ── DADOS: las seis caras ──
 'dados':   ('Six white ivory dice seen straight from the front, one for each'
             ' face value from one to six pips, rounded corners, black pips,'
             ' soft top-left light,' + (REJA % (3, 2)) + MAG, '1:1'),
 # ── CANICA: la canica, la chispa y el pozo ──
 'canica':  ('Three separate game objects on a flat magenta background: a blue'
             ' glass MARBLE with a bright highlight, a glowing golden SPARK'
             ' star, and a dark round PIT hole with a stone rim seen from'
             ' straight above,' + (REJA % (3, 1)) + MAG, '1:1'),
 # ── las texturas, que NO llevan magenta ──
 'madera':  ('A seamless tileable texture of warm aged oak planks seen straight'
             ' from above, fine grain, subtle knots, even lighting, no shadows,'
             ' no objects, no text, edges must tile seamlessly.', '1:1'),
 'metal':   ('A seamless tileable texture of brushed dark steel with a faint'
             ' blue sheen, fine horizontal grain, even lighting, no shadows, no'
             ' objects, no text, edges must tile seamlessly.', '1:1'),
 # ── LOS ICONOS: tres hojas, una por juego ──
 'reliq':   ('Twelve small flat game icons in gold on a flat magenta'
             ' background: a rolling die, an open hand, a stack of dice, the'
             ' number one turning into a six, a pair of matching dice, a'
             ' straight run of dice, four of a kind, a plus sign, a'
             ' multiplication sign, three of a kind, a padlock, a downhill'
             ' arrow.' + (REJA % (4, 3)) + MAG, '1:1'),
 'mejo':    ('Twelve small flat game icons in warm amber on a flat magenta'
             ' background: a heart, a brake pad, a stopwatch, a horseshoe'
             ' magnet, a round shield, a small hole, a tiny marble, a compass'
             ' needle, a feather, a single spark, a soft cushion, a wing.' +
             (REJA % (4, 3)) + MAG, '1:1'),
 'cartas':  ('Eight small flat game icons in orange on a flat magenta'
             ' background: a heart, two equal signs, a round shield, an eye, an'
             ' hourglass, a stone fist, a paper sheet, a pair of scissors.' +
             (REJA % (4, 2)) + MAG, '1:1'),
}
ESTADO = '/tmp/sprites_tasks.json'
TANDA = 6
VUELTAS = 8


def pide(ns):
    llam = [('submit_image_generation',
             {'project_id': P, 'output_path': 'assets/casual/sp_%s.png' % n,
              'prompt': PED[n][0], 'aspect_ratio': PED[n][1]}) for n in ns]
    out = {}
    for n, r in zip(ns, rz.sesion(llam, espera=700)):
        t = rz.texto(r)
        try:
            out[n] = json.loads(t)['task_id']
        except Exception:
            print('  rebota %s: %s' % (n, t[:70].replace('\n', ' ')))
    return out


def revisa(ids):
    if not ids:
        return {}
    r = rz.sesion([('check_generation_tasks', {'task_ids': list(ids.values())})], espera=300)
    d = json.loads(rz.texto(r[0]))
    n2t = {v: k for k, v in ids.items()}
    return {n2t[i['task_id']]: i['status'] for i in d['items'] if i['task_id'] in n2t}


def main():
    ids = json.load(open(ESTADO)) if os.path.exists(ESTADO) else {}
    for v in range(VUELTAS):
        est = revisa(ids)
        listos = {n for n, s in est.items() if s == 'ready'}
        vuela = {n for n, s in est.items() if s in ('pending', 'running')}
        faltan = [n for n in PED if n not in listos and n not in vuela]
        print('vuelta %d: %d listos, %d en vuelo, %d faltan'
              % (v, len(listos), len(vuela), len(faltan)))
        if not faltan and not vuela:
            break
        if faltan:
            ids.update(pide(faltan[:TANDA]))
            json.dump(ids, open(ESTADO, 'w'), indent=1)
        if v < VUELTAS - 1:
            time.sleep(40)
    est = revisa(ids)
    print(json.dumps(est, indent=1))
    print('LISTOS %d de %d' % (sum(1 for s in est.values() if s == 'ready'), len(PED)))


if __name__ == '__main__':
    main()
