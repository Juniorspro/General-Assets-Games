# -*- coding: utf-8 -*-
"""Los assets de CASTILLO, generados con Rezona. Reencola solo.

LOS TRES BLOQUES VAN EN UNA SOLA HOJA Y DE FRENTE, sin perspectiva: el juego los
ESTIRA a su ancho y su alto con `dibCuadroWH`, porque un bloque de este juego
cambia de forma segun la planta. Con perspectiva, estirar un cubo lo deforma.
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
 'f_castillo': ('A medieval siege field at dusk seen from the side: a dry ochre'
                ' plain, distant hills and a hazy fortress silhouette along the'
                ' top, torn banners and scattered rocks along the bottom edge,'
                ' heavy grey clouds with warm light breaking through. Vertical'
                ' 9:16 mobile game background, painted illustration, the CENTER'
                ' of the image is empty and uncluttered so gameplay can be drawn'
                ' on top. No text, no characters, no UI.', '9:16'),
 'k_bloques': ('Three square building material tiles seen perfectly FLAT from'
               ' the front with no perspective and no thickness: a WOODEN plank'
               ' block with visible grain, a grey STONE block with mortar'
               ' courses, and a translucent pale blue ICE block.' +
               (REJA % (3, 1)) + MAG, '1:1'),
 'k_rey': ('Two cartoon king characters standing in full body FRONT view, short'
           ' and round, red robe and a golden crown: the first CALM with open'
           ' eyes, the second TERRIFIED with closed eyes and arms up.' +
           (REJA % (2, 1)) + MAG, '1:1'),
 'k_catapulta': ('A single wooden medieval catapult seen in STRICT SIDE PROFILE'
                 ' facing RIGHT, throwing arm raised, two large wheels, sturdy'
                 ' timber frame, rope tension.' + MAG, '1:1'),
 'k_piedra': ('A single round grey boulder projectile seen from the side, rough'
              ' cracked surface.' + MAG, '1:1'),
 'k_pasto': ('A seamless tileable texture of dry cracked ochre earth seen'
             ' straight from above, small pebbles, even lighting, no shadows, no'
             ' objects, no text, edges must tile seamlessly.', '1:1'),
}
SON = {
 'k_tensa': 'A loud close-up creak of thick rope and timber under tension, dry, short.',
 'k_tira':  'A loud wooden catapult release with a heavy whoosh, close-up, dry, single hit.',
 'k_clava': 'A loud heavy stone smashing into a stone wall, rubble falling, close-up, single hit.',
 'k_grito': 'A loud short male shout of alarm, dry close-up recording, single hit, no words.',
 'm_castillo': ('Heroic medieval siege music: low war drums, a marching brass'
                ' line and a high fife, 104 BPM, minor key, relentless.' + LOOP),
}
ESTADO = '/tmp/castillo_tasks.json'


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
    for v in range(10):
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
        if v < 9:
            time.sleep(40)
    est = revisa(ids)
    print(json.dumps(est, indent=1))
    print('LISTOS %d de %d' % (sum(1 for s in est.values() if s == 'ready'), len(todos)))


if __name__ == '__main__':
    main()
