# -*- coding: utf-8 -*-
"""Los assets de los juegos de la familia ARCO, generados con Rezona.

UN SOLO PEDIDOR PARA TODOS, y no uno por juego: los tres primeros salieron con
`pedir_arco.py` y `pedir_castillo.py`, que son el mismo archivo con otro
diccionario adentro — y eso garantiza que el dia que haya que corregir una regla
del prompt queden siete copias sin corregir.

LAS REGLAS DEL PROMPT, QUE YA COSTARON SUS VUELTAS:
  · Fondo MAGENTA PURO en todo lo que se recorte, y sin lineas separadoras: las
    lineas que el modelo dibuja parten las filas en islas de mas y `mide_reja`
    cuenta columnas que no existen.
  · La reja pedida es una SUGERENCIA. Se pide, y despues se mide.
  · Todo lo que el juego ESPEJE va de perfil y mirando a la derecha: con uno de
    frente y otro de tres cuartos, al espejarlos uno mira al publico.
  · Los fondos van 9:16 con el CENTRO VACIO, que es donde se dibuja el juego.
  · Y los prompts de sonido piden fuerte, cerca y seco: pedir «un chasquido
    suave» devuelve un archivo con pico 0,005, o sea silencio. El nivel lo pone
    el horneado, nunca el prompt.
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
FONDO = (' Vertical 9:16 mobile game background, painted illustration, the'
         ' CENTER of the image is empty and uncluttered so gameplay can be drawn'
         ' on top. No text, no characters in the middle, no UI.')
TEX = (' seen straight from above, even lighting, no shadows, no objects, no'
       ' text, edges must tile seamlessly.')

JUEGOS = {
 'arco2': {
  'img': {
   # ── LA HOJA DE PIEZAS: ESTO ES UN RIG, NO UN SPRITE ──
   # Se piden las partes SUELTAS porque el juego las arma con un esqueleto: con
   # un personaje entero hay una pose y nada mas, y con doce piezas hay todas.
   # Todas de perfil y mirando a la derecha, que es la regla de siempre.
   'k_partes': ('A 2D game character CUT-OUT PARTS SHEET for a paper-doll rig:'
                ' twelve separate body pieces of the SAME fantasy archer, all'
                ' seen strictly from the SIDE facing RIGHT, each piece drawn on'
                ' its own and NOT attached to the others. In reading order: a'
                ' bare TORSO in a green leather tunic, a bare UPPER ARM, a bare'
                ' FOREARM, an open HAND, a THIGH in brown trousers, a SHIN, a'
                ' leather BOOT, a hooded CAPE, a QUIVER full of arrows, a curved'
                ' wooden BOW with NO string, a single ARROW pointing right, and'
                ' a leather BELT.' + (REJA % (4, 3)) + MAG, '1:1'),
   'k_cabezas': ('Six heads of fantasy archers seen strictly from the SIDE'
                 ' facing RIGHT, neck included, each a different character: a'
                 ' young man with short hair, a bearded guard with a helmet, a'
                 ' hunter with a hood, a woman with a braid, a big bald warrior'
                 ' with warpaint, and an old mage with a long beard.'
                 + (REJA % (3, 2)) + MAG, '1:1'),
   'k_props': ('Six side-view fantasy valley props standing on nothing: a tall'
               ' pine tree, a round oak tree, a mossy boulder, a leafy bush, a'
               ' tall war banner on a pole, and a broken tree stump.'
               + (REJA % (3, 2)) + MAG, '1:1'),
   'k_terr': ('A seamless tileable texture of packed brown earth and grey rock'
              ' strata, like the inside of a cliff' + TEX, '1:1'),
   'k_medio': ('A long horizontal silhouette band of a distant pine forest'
               ' ridge, dark blue-green, flat solid shapes with no detail, the'
               ' TOP of the image is empty magenta and the trees sit along the'
               ' bottom edge.' + MAG, '1:1'),
  },
  'son': {}},
 'penal': {
  'img': {
   'f_penal': ('A floodlit football stadium at night seen from behind the'
               ' penalty spot: dark blue stands and towers of lights along the'
               ' top, mown green turf along the bottom edge, cold white light'
               ' beams, faint haze.' + FONDO, '9:16'),
   'p_gente': ('A single football defender standing in a defensive wall, seen'
               ' from the FRONT in full body, hands crossed in front of the'
               ' chest, blue and white kit, serious face.' + MAG, '1:1'),
   'p_arquero': ('Two football goalkeepers seen from the FRONT in full body,'
                 ' bright red kit and big yellow gloves: the first STANDING with'
                 ' arms wide open, the second DIVING sideways fully stretched.'
                 + (REJA % (2, 1)) + MAG, '1:1'),
   'p_bola': ('A single classic black and white football seen straight from the'
              ' side, clean pentagon pattern.' + MAG, '1:1'),
   'p_pasto': ('A seamless tileable texture of mown football pitch grass with'
               ' faint mower stripes' + TEX, '1:1'),
  },
  'son': {
   'p_tensa': 'A loud close-up scuff of a boot planting on grass, dry, short.',
   'p_tira':  'A loud sharp football being struck hard by a boot, close-up, dry, single hit.',
   'p_clava': 'A loud football hitting the back of a goal net, rope and mesh shaking, close-up.',
   'p_grito': 'A loud short crowd groan of disappointment, close-up, single hit, no words.',
   'm_penal': ('Tense stadium music: a low pulsing bass, a snare roll and'
               ' distant crowd claps, 112 BPM, minor key, expectant.' + LOOP),
  }},
 'duelo': {
  'img': {
   'f_duelo': ('A western desert town at sunset seen from the side: an orange'
               ' burning sky and mesas along the top, a dusty dirt street with'
               ' wooden porches along the bottom edge, long shadows, heat haze.'
               + FONDO, '9:16'),
   'd_tipos': ('Two western gunslingers standing in full body FRONT view with a'
               ' wide brimmed hat and a poncho, arms down, hand near the'
               ' holster: the first in a BLUE poncho, the second in a RED'
               ' poncho.' + (REJA % (2, 1)) + MAG, '1:1'),
   'd_tierra': ('A seamless tileable texture of dry cracked desert dirt with'
                ' small stones and tyre-less wheel ruts' + TEX, '1:1'),
  },
  'son': {
   'd_tensa': 'A loud close-up creak of leather and a revolver being cocked, dry, short.',
   'd_tira':  'A loud single revolver gunshot, close-up, dry, one hit, no echo tail.',
   'd_clava': 'A loud bullet impact thud into a body, close-up, single hit, dry.',
   'd_grito': 'A loud short male grunt of pain, dry close-up recording, single hit, no words.',
   'm_duelo': ('Spaghetti western standoff music: a lone whistled melody, a'
               ' tremolo guitar and a slow tolling bell, 84 BPM, minor key,'
               ' tense.' + LOOP),
  }},
 'pesca': {
  'img': {
   'f_pesca': ('A calm sea at dusk seen from a wooden pier: a deep blue and'
               ' violet sky with the last light along the top, dark rippling'
               ' water along the bottom edge, distant island silhouette, cool'
               ' light.' + FONDO, '9:16'),
   's_pescador': ('A single cartoon fisherman standing in STRICT SIDE PROFILE'
                  ' facing RIGHT, full body, blue raincoat and a bucket hat,'
                  ' both hands forward holding nothing, no fishing rod.'
                  + MAG, '1:1'),
   's_peces': ('Six different fish seen in STRICT SIDE PROFILE facing RIGHT,'
               ' full body with tail and fins: a speckled trout, a golden'
               ' dorado, a green sea bass, a blue tuna, a grey stingray and a'
               ' purple marlin with a long bill.' + (REJA % (3, 2)) + MAG, '1:1'),
   's_agua': ('A seamless tileable texture of dark blue rippling sea water'
              + TEX, '1:1'),
  },
  'son': {
   's_tensa': 'A loud close-up creak of a fishing reel drag under strain, dry, short.',
   's_tira':  'A loud fishing line being cast, reel spinning and a splash, close-up, dry.',
   's_clava': 'A loud big fish splashing hard out of the water, close-up, single hit.',
   's_grito': 'A loud fishing line snapping with a sharp whip crack, close-up, single hit.',
   'm_pesca': ('Calm seaside music: a soft nylon guitar, a warm pad and light'
               ' hand percussion, 92 BPM, major key, patient.' + LOOP),
  }},
 'salto': {
  'img': {
   'f_salto': ('A vast canyon at golden hour seen from the side: towering red'
               ' rock walls and a hazy sun along the top, a river far below and'
               ' floating dust along the bottom edge, warm rim light.'
               + FONDO, '9:16'),
   'v_heroe': ('Two cartoon adventurers in STRICT SIDE PROFILE facing RIGHT,'
               ' full body, brown jacket and boots: the first CROUCHED low'
               ' ready to jump, the second STRETCHED mid-air in a long leap.'
               + (REJA % (2, 1)) + MAG, '1:1'),
   'v_roca': ('Three floating rock platforms seen from the side, flat grassy'
              ' top and a jagged broken bottom: a wide one, a medium one and a'
              ' narrow one.' + (REJA % (3, 1)) + MAG, '1:1'),
   'v_piedra': ('A seamless tileable texture of warm red canyon sandstone with'
                ' horizontal strata' + TEX, '1:1'),
  },
  'son': {
   'v_tensa': 'A loud close-up creak of boots crouching on gravel, dry, short.',
   'v_tira':  'A loud jump grunt with a scuff of gravel, close-up, dry, single hit.',
   'v_clava': 'A loud landing thud on rock with a puff of dust, close-up, single hit.',
   'v_grito': 'A loud short male shout of falling, dry close-up, single hit, no words.',
   'm_salto': ('Adventurous chase music: driving hand drums, a plucked string'
               ' ostinato and a bright flute, 124 BPM, major key, propulsive.'
               + LOOP),
  }},
 'esquiva': {
  'img': {
   'f_esquiva': ('A moonlit dojo courtyard seen from the side: dark tiled roofs'
                 ' and a huge pale moon along the top, raked sand and stone'
                 ' lanterns along the bottom edge, cold blue light, drifting'
                 ' petals.' + FONDO, '9:16'),
   'e_ninja': ('Two cartoon samurai in STRICT SIDE PROFILE facing RIGHT, full'
               ' body with a katana: the first in a READY stance sword low, the'
               ' second in a full FORWARD SLASH.' + (REJA % (2, 1)) + MAG, '1:1'),
   'e_rival': ('Three cartoon enemy warriors in STRICT SIDE PROFILE facing'
               ' LEFT, full body, each winding up a different attack: one'
               ' raising a sword overhead, one thrusting a spear straight'
               ' forward, one swinging a heavy axe low.' + (REJA % (3, 1))
               + MAG, '1:1'),
   'e_piso': ('A seamless tileable texture of raked pale zen garden sand with'
              ' fine parallel grooves' + TEX, '1:1'),
  },
  'son': {
   'e_tensa': 'A loud close-up whoosh of a sword being raised, cloth and steel, dry, short.',
   'e_tira':  'A loud fast katana slash through the air, close-up, dry, single hit.',
   'e_clava': 'A loud sharp clash of two steel blades, close-up, single hit, dry.',
   'e_grito': 'A loud short male battle shout, dry close-up recording, single hit, no words.',
   'm_esquiva': ('Tense eastern duel music: a low taiko pulse, a shakuhachi'
                 ' flute line and sparse koto plucks, 96 BPM, minor key,'
                 ' watchful.' + LOOP),
  }},
 'nieve': {
  'img': {
   'f_nieve': ('A snowy alpine slope seen from above and behind: a pale grey'
               ' sky and jagged peaks along the top, deep powder snow with ski'
               ' tracks along the bottom edge, cold flat light, drifting snow.'
               + FONDO, '9:16'),
   'n_esqui': ('Three cartoon skiers seen from BEHIND going away from the'
               ' camera, full body with skis and poles, red jacket: the first'
               ' STRAIGHT down the slope, the second LEANING LEFT in a turn, the'
               ' third LEANING RIGHT in a turn.' + (REJA % (3, 1)) + MAG, '1:1'),
   'n_arbol': ('Three snow covered obstacles seen from the front: a tall pine'
               ' tree with heavy snow, a bare dead tree, and a grey boulder half'
               ' buried in snow.' + (REJA % (3, 1)) + MAG, '1:1'),
   'n_piso': ('A seamless tileable texture of fresh white powder snow with soft'
              ' wind ripples' + TEX, '1:1'),
  },
  'son': {
   'n_tensa': 'A loud close-up ski edge carving into hard snow, dry, short.',
   'n_tira':  'A loud whoosh of skis accelerating through powder snow, close-up, dry.',
   'n_clava': 'A loud crash into a tree with snow falling, close-up, single hit.',
   'n_grito': 'A loud short male yell of alarm, dry close-up recording, single hit, no words.',
   'm_nieve': ('Fast winter downhill music: driving synth arpeggios, punchy'
               ' drums and a bright lead, 138 BPM, major key, rushing.' + LOOP),
  }},
 'grua': {
  'img': {
   'f_grua': ('A construction site at dawn seen from the side: a pale orange'
              ' sky and half built towers with scaffolding along the top,'
              ' rubble, barrels and steel beams along the bottom edge, warm low'
              ' light, dust in the air.' + FONDO, '9:16'),
   'g_carga': ('Three heavy crane loads hanging from a hook seen from the side:'
               ' a wooden crate, a stack of steel beams tied with rope, and a'
               ' concrete block.' + (REJA % (3, 1)) + MAG, '1:1'),
   'g_base': ('Three construction targets seen from the side: an empty wooden'
              ' pallet on the ground, a low brick wall being built, and a flat'
              ' concrete foundation.' + (REJA % (3, 1)) + MAG, '1:1'),
   'g_piso': ('A seamless tileable texture of grey construction site gravel and'
              ' dried mud' + TEX, '1:1'),
  },
  'son': {
   'g_tensa': 'A loud close-up creak of a steel cable under load, dry, short.',
   'g_tira':  'A loud clank of a crane hook releasing, chain rattling, close-up, dry.',
   'g_clava': 'A loud heavy crate landing hard on wood, close-up, single hit.',
   'g_grito': 'A loud metallic crash of a load hitting the ground, close-up, single hit.',
   'm_grua': ('Industrial work music: a steady mechanical pulse, low brass stabs'
              ' and clanking percussion, 102 BPM, minor key, methodical.' + LOOP),
  }},
}


def pide(especs, ns):
    llam = []
    for n in ns:
        j, tipo = especs[n]
        if tipo == 'img':
            pr, ar = JUEGOS[j]['img'][n]
            llam.append(('submit_image_generation',
                         {'project_id': P, 'output_path': 'assets/casual/%s.png' % n,
                          'prompt': pr, 'aspect_ratio': ar}))
        else:
            llam.append(('submit_audio_generation',
                         {'project_id': P, 'output_path': 'assets/casual/%s.mp3' % n,
                          'prompt': JUEGOS[j]['son'][n],
                          'duration': 16 if n.startswith('m_') else 3}))
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
    r = rz.sesion([('check_generation_tasks', {'task_ids': list(ids.values())})],
                  espera=300)
    d = json.loads(rz.texto(r[0]))
    n2t = {v: k for k, v in ids.items()}
    return {n2t[i['task_id']]: i['status'] for i in d['items'] if i['task_id'] in n2t}


def main():
    pedidos = sys.argv[1:] or list(JUEGOS)
    especs, todos = {}, []
    for j in pedidos:
        for n in JUEGOS[j]['img']:
            especs[n] = (j, 'img'); todos.append(n)
        for n in JUEGOS[j]['son']:
            especs[n] = (j, 'son'); todos.append(n)
    est_p = '/tmp/lote_tasks.json'
    ids = json.load(open(est_p)) if os.path.exists(est_p) else {}
    ids = {k: v for k, v in ids.items() if k in todos}
    for v in range(20):
        est = revisa(ids)
        listos = {n for n, s in est.items() if s == 'ready'}
        vuela = {n for n, s in est.items() if s in ('pending', 'running')}
        faltan = [n for n in todos if n not in listos and n not in vuela]
        print('vuelta %d: %d listos, %d en vuelo, %d faltan'
              % (v, len(listos), len(vuela), len(faltan)))
        if not faltan and not vuela:
            break
        if faltan:
            ids.update(pide(especs, faltan[:6]))
            json.dump(ids, open(est_p, 'w'), indent=1)
        if v < 19:
            time.sleep(35)
    est = revisa(ids)
    print('LISTOS %d de %d' % (sum(1 for s in est.values() if s == 'ready'), len(todos)))
    for n in todos:
        if est.get(n) != 'ready':
            print('  FALTA %s (%s)' % (n, est.get(n)))


if __name__ == '__main__':
    main()
