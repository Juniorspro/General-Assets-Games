# -*- coding: utf-8 -*-
"""Los assets de ARCO, generados con Rezona. Reencola solo.

LOS PERSONAJES VAN DE PERFIL Y MIRANDO A LA DERECHA, los seis. No es un
capricho: el juego los espeja para el que tira desde el otro extremo, asi que
con uno de frente y otro de tres cuartos, al espejarlos uno queda mirando al
publico y el otro a la nada. Una sola orientacion y el espejo hace el resto.
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
LOOP = (' Seamless loop, no intro and no ending, steady tempo, mixed loud and'
        ' clean, no vocals, no speech.')

IMG = {
 'a_fondo': ('A wide fantasy valley at golden hour seen from the side: rolling'
             ' green hills, a distant castle and mountains blurred along the'
             ' top, tall grass and wildflowers along the bottom edge, warm low'
             ' sun, soft haze. Vertical 9:16 mobile game background, painted'
             ' illustration, the CENTER of the image is empty and uncluttered'
             ' so gameplay can be drawn on top. No text, no characters, no UI.',
             '9:16'),
 'a_arqueros': ('Six cartoon archer characters standing in full body STRICT SIDE'
                ' PROFILE facing RIGHT, arms down at their sides, no bow, no'
                ' weapon: a young hero in green leather, a heavy armoured'
                ' knight, a hooded ranger, a desert nomad in robes, a fur-clad'
                ' barbarian, a court wizard.' + (REJA % (3, 2)) + MAG, '1:1'),
 'a_cosas': ('Six separate side-view game objects: a WOODEN LONGBOW seen from'
             ' the side, a single ARROW pointing right, a leafy oak TREE, a'
             ' grey BOULDER, a wooden BARREL, and a stone TOWER.' +
             (REJA % (3, 2)) + MAG, '1:1'),
 'a_pasto': ('A seamless tileable texture of short green summer grass seen'
             ' straight from above, fine blades, even lighting, no shadows, no'
             ' objects, no text, edges must tile seamlessly.', '1:1'),
}
SON = {
 'a_tensa':  'A loud close-up creak of a wooden bow being drawn, taut string, dry, short.',
 'a_tira':   'A loud sharp bow release with the arrow whooshing away, close-up, dry, single hit.',
 'a_clava':  'A loud arrow thudding hard into a wooden target, close-up, single hit, dry.',
 'a_grito':  'A loud short male grunt of pain, dry close-up recording, single hit, no words.',
 'm_arco':   ('Heroic medieval duel music: plucked lute over a marching drum, a'
              ' soaring horn line, 108 BPM, major key, adventurous.' + LOOP),
}
ESTADO = '/tmp/arco_tasks.json'


def pide(ns):
    llam = []
    for n in ns:
        if n in IMG:
            llam.append(('submit_image_generation',
                         {'project_id': P, 'output_path': 'assets/casual/%s.png' % n,
                          'prompt': IMG[n][0], 'aspect_ratio': IMG[n][1]}))
        else:
            llam.append(('submit_audio_generation',
                         {'project_id': P, 'output_path': 'assets/casual/%s.mp3' % n,
                          'prompt': SON[n], 'duration': 16 if n.startswith('m_') else 3}))
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
    todos = list(IMG) + list(SON)
    ids = json.load(open(ESTADO)) if os.path.exists(ESTADO) else {}
    for v in range(8):
        est = revisa(ids)
        listos = {n for n, s in est.items() if s == 'ready'}
        vuela = {n for n, s in est.items() if s in ('pending', 'running')}
        faltan = [n for n in todos if n not in listos and n not in vuela]
        print('vuelta %d: %d listos, %d en vuelo, %d faltan'
              % (v, len(listos), len(vuela), len(faltan)))
        if not faltan and not vuela:
            break
        if faltan:
            ids.update(pide(faltan[:6]))
            json.dump(ids, open(ESTADO, 'w'), indent=1)
        if v < 7:
            time.sleep(40)
    est = revisa(ids)
    print(json.dumps(est, indent=1))
    print('LISTOS %d de %d' % (sum(1 for s in est.values() if s == 'ready'), len(todos)))


if __name__ == '__main__':
    main()
