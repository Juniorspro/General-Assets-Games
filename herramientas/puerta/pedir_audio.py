#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pide a Rezona Lab los sonidos de PUERTA BLANCA: los monstruos, las acciones
y la cama de ambiente de cada uno de los siete sitios.

NO SE CREA UN PROYECTO: todo va al proyecto descartable que ya existe
(`herramientas/rezona/estado.json` → `regla_de_proyectos`). Lo que vale es la
copia del repo, que la hornea `hornear_audio.py`; el proyecto es un andamio.

LOS PROMPTS PIDEN UN SONIDO FUERTE, CERCA Y SECO, y no "un chasquido suave".
Eso ya costo tres tandas en RezUno: pedirle al modelo que suene bajito devuelve
un archivo con pico 0,005, o sea silencio. **El nivel se pone en el codigo**
—lo hace el horneado, que mide el rms y lo iguala— nunca en el prompt.

Y CADA UNO DESCRIBE EL OBJETO FISICO. "chime de confirmacion" devuelve nada;
"una campanita de laton golpeada dos veces" devuelve una campanita.
"""
import io, json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
import rz

SECO = ('loud, close-up, dry studio recording, no music, no reverb tail, '
        'no speech, mono, full level')
CAMA = ('seamless looping ambience bed, no music, no melody, no speech, '
        'steady throughout with no build-up and no ending, distant and wide')

# nombre : (segundos, que se pide)
SFX = {
 # ── LOS MONSTRUOS ────────────────────────────────────────────────────────────
 'm_criatura': (2.5, 'a tall pale humanoid creature shrieking once, a raw wet '
                     'inhuman screech that cracks halfway and drops into a growl'),
 'm_perro':    (2.5, 'a large angry farm dog barking three times and then snarling, '
                     'chain rattling, recorded a metre away'),
 'm_muneca':   (2.5, 'a small girl giggling three times in an empty room, thin and '
                     'high, ending in a breathy hiss'),
 'm_cajita':   (4.0, 'an old wind-up music box playing a few plinking notes, the '
                     'mechanism slowing down and going out of tune'),
 'm_verdugo':  (3.0, 'a huge man breathing heavily through a thick cloth hood, '
                     'four slow wet rasping breaths, leather creaking'),
 'm_simio':    (2.5, 'a big ape snarling and huffing, deep chest grunts and one '
                     'sharp bark, knuckles thudding on stone'),
 'm_murci':    (2.0, 'a swarm of bats screeching and flapping past very close, '
                     'sharp high chirps and dry leathery wing beats'),
 'm_arana':    (3.0, 'a giant spider: dry chittering mandibles clicking fast and '
                     'eight hard pointed legs skittering over ceramic floor tiles'),
 # ── LAS ACCIONES ─────────────────────────────────────────────────────────────
 'a_paso':     (1.0, 'one single footstep of a boot on a hard dusty concrete floor, '
                     'a dry heel impact with a little grit'),
 'a_puerta':   (3.0, 'a heavy old wooden door swinging open, hinges groaning loudly, '
                     'the latch clacking free and the door thumping the wall'),
 'a_agarra':   (1.2, 'a hand snatching a small object off a table, cloth rustle and '
                     'a dry knock of the object against the palm'),
 'a_mal':      (1.2, 'a harsh dead electric buzzer sounding twice, a wrong-answer '
                     'buzz from an old machine, flat and unpleasant'),
 'a_bien':     (1.5, 'a small brass bell struck twice, bright and clear with a short '
                     'ring, a mechanical lock clunking open right after'),
 'a_antorcha': (2.5, 'a cloth torch catching fire, a sharp whoosh of igniting fuel '
                     'and then the flame settling into a steady crackle'),
 'a_gasoli':   (3.0, 'petrol glugging out of a metal jerrycan into a tank, thick '
                     'liquid gulps and the can knocking against the metal'),
 'a_libro':    (1.5, 'a thick hardback book pushed into place on a wooden shelf, '
                     'pages fluttering and the spine knocking against wood'),
 'a_tela':     (2.0, 'thick sticky spider silk being pulled apart, wet elastic '
                     'threads stretching and snapping one by one'),
 'a_sierra':   (3.0, 'a big circular saw blade spinning up and running, the motor '
                     'whining and the blade singing in the air'),
 'a_spray':    (2.5, 'an aerosol insecticide can spraying: the valve opening with a '
                     'sharp click and a long hard hiss of pressurised mist, the ball '
                     'inside the can rattling once at the end'),
 # ── LAS CAMAS DE AMBIENTE, UNA POR SITIO ─────────────────────────────────────
 'b_room':     (12, CAMA + '. a small empty black concrete room: a very low hum, '
                    'faint dripping water far away, absolute stillness'),
 'b_field':    (12, CAMA + '. an open meadow in the afternoon: soft wind through tall '
                    'grass, crickets, a couple of distant birds'),
 'b_farm':     (12, CAMA + '. a farmyard at night: crickets, a loose metal sheet '
                    'creaking in the wind, a far-off cow'),
 'b_school':   (12, CAMA + '. an empty school at night: fluorescent tubes buzzing, a '
                    'ventilation duct rumbling, a distant clock ticking'),
 'b_library':  (12, CAMA + '. a huge old library: deep silence with a faint air-'
                    'conditioning hum and tiny wooden creaks in the shelves'),
 'b_dungeon':  (12, CAMA + '. a stone dungeon: dripping water echoing, a low draught '
                    'moaning through corridors, distant chains'),
 'b_store':    (12, CAMA + '. an abandoned fast-food kitchen: a fridge compressor '
                    'droning, a fluorescent tube ticking, a fryer fan whirring'),
}

PROY = os.environ.get('PB_PROY', 'uSEsgNYW')   # el descartable
ESTADO = '/tmp/pb_audio_tareas.json'
EN_VUELO = 10          # el tope de la cuenta son 12; se deja aire


def carga():
    try: return json.load(io.open(ESTADO, encoding='utf8'))
    except Exception: return {}


def guarda(d):
    io.open(ESTADO, 'w', encoding='utf8').write(json.dumps(d, ensure_ascii=False, indent=1))


def json_de(t):
    if not t: return None
    i = t.find('{')
    if i < 0: return None
    try: return json.loads(t[i:])
    except Exception: return None


def main():
    d = carga()
    for vuelta in range(80):
        pend = [n for n, v in d.items() if v.get('estado') == 'pending']
        if pend:
            r = rz.sesion([('check_generation_tasks',
                            {'task_ids': [d[n]['task_id'] for n in pend],
                             'project_id': PROY})], espera=600)
            j = json_de(rz.texto(r[0])) or {}
            # LA CLAVE ES `items`, no 'tasks' ni 'results': con la equivocada el
            # lazo polea para siempre y no ve nunca nada listo.
            for it in (j.get('items') or []):
                for n in pend:
                    if d[n]['task_id'] == it.get('task_id'):
                        d[n]['estado'] = it.get('status', 'pending')
                        if it.get('asset_path'): d[n]['output_path'] = it['asset_path']
            guarda(d)
        # LOS FALLOS DEL PROVEEDOR SE REINTENTAN. Medido: la primera tanda devolvio
        # 17 de 25 con `PROVIDER_UNAVAILABLE / NOIZ_FAILED`, marcado como
        # `retryable: true` por el propio servidor. Sin reintento, el guion
        # termina "listo" con dos tercios de los sonidos sin generar y no falla:
        # se queda callado.
        for n, v in list(d.items()):
            if v.get('estado') in ('failed', 'error'):
                v['intentos'] = v.get('intentos', 1)
                if v['intentos'] < 5:
                    d[n] = {'intentos': v['intentos'] + 1}   # sin task_id: se vuelve a pedir
        guarda(d)
        vivos = sum(1 for v in d.values() if v.get('estado') == 'pending')
        faltan = [n for n in sorted(SFX) if not d.get(n, {}).get('task_id')]
        listos = sum(1 for v in d.values() if v.get('estado') in ('ready', 'succeeded', 'success'))
        print('vuelta %2d · listos %2d · en vuelo %2d · sin pedir %2d'
              % (vuelta, listos, vivos, len(faltan)), flush=True)
        if not faltan and vivos == 0: break
        manda = faltan[:max(0, EN_VUELO - vivos)]
        if manda:
            res = rz.sesion([('submit_audio_generation', {
                    'project_id': PROY,
                    'output_path': 'assets/pb_%s.mp3' % n,
                    'kind': 'sound',
                    'duration': SFX[n][0],
                    'output_format': 'mp3',
                    'prompt': (SFX[n][1] if n.startswith('b_') else SECO + '. ' + SFX[n][1])
                    }) for n in manda], espera=900)
            for n, r in zip(manda, res):
                j = json_de(rz.texto(r))
                if j and j.get('task_id'):
                    d[n] = {'task_id': j['task_id'], 'output_path': j['output_path'],
                            'estado': j.get('status', 'pending'),
                            'intentos': d.get(n, {}).get('intentos', 1)}
                    print('  ->', n, j['task_id'])
                else:
                    print('  !!', n, rz.texto(r)[:180])
            guarda(d)
        if faltan or vivos: time.sleep(25)
    guarda(d)
    for n in sorted(d): print('%-12s %-10s %s' % (n, d[n].get('estado'), d[n].get('output_path')))

main()
