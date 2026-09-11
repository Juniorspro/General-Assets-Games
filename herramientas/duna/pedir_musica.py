#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pide a Rezona Lab las seis camas de musica lofi de DUNA.

UNA POR TRAMO DEL CICLO DEL DIA, que es el unico sistema propio que este juego
tiene: la hora avanza con la DISTANCIA (un ciclo cada 3.200 m), asi que atar la
musica a la hora hace que avanzar se ESCUCHE ademas de verse. Seis pistas sobre
ocho paletas a proposito: la musica es una capa mas lenta que la luz, y hacerlas
coincidir dejaria un corte en cada cambio de paleta.

NO SE CREA UN PROYECTO: todo va al descartable que ya existe
(`herramientas/rezona/estado.json` -> regla_de_proyectos).

`duration` ES UN TECHO Y NO UNA ORDEN: se pidieron 20 s y volvieron entre 8,8 y
10,5. Ya habia pasado en RECREO. Con la cola fundida sobre la cabeza un bucle de
ocho segundos aguanta, y encima cada tramo del dia dura unos 27 s de juego, o sea
cuatro vueltas antes de cruzar a la pista siguiente.

EL PROMPT PIDE UN BUCLE Y NO UNA CANCION. Una pista con entrada y final se
escucha cortada en cada vuelta, y ese corte suena mas que la musica. Y el NIVEL
lo pone el horneado, nunca el prompt: pedirle al modelo que suene bajito
devuelve silencio (ya costo tres tandas en RezUno).
"""
import io, json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
import rz

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))

BASE = ('seamless looping instrumental lo-fi bed, steady throughout, no intro '
        'and no ending, no build-up, no speech, no vocals, no lyrics, warm '
        'analog tape hiss, soft vinyl crackle, gentle and calm, slow tempo '
        'around 70 bpm, sparse and spacious, low-passed and mellow, '
        'never busy, sits under a game')

# nombre : (segundos, que se pide) — en el orden del ciclo del dia
PISTAS = {
 'm0_noche':  (20, BASE + '. deep night over a cold desert: a slow soft Rhodes '
                   'chord every few bars, a very low warm sub bass, distant pad, '
                   'almost no percussion, hushed and wide'),
 'm1_alba':   (20, BASE + '. first light: a muted felt piano playing a simple '
                   'four-note motif, a soft brushed kick and rim on the off beat, '
                   'warm and hopeful, very gentle'),
 'm2_manana': (20, BASE + '. bright morning: clean muted electric guitar plucks, '
                   'soft dusty drum brushes, a mellow upright bass walking slowly, '
                   'relaxed and sunny'),
 'm3_siesta': (20, BASE + '. hazy midday heat: lazy tape-saturated keys, a slow '
                   'shuffling brushed beat, a woozy detuned pad drifting, '
                   'sleepy and blurred'),
 'm4_tarde':  (20, BASE + '. golden late afternoon: warm vibraphone and soft '
                   'nylon guitar, a light swung beat, a mellow flugelhorn note '
                   'held far back, nostalgic'),
 'm5_ocaso':  (20, BASE + '. dusk fading to night: slow reversed piano, a deep '
                   'soft bass, wide reverb pad, almost no beat, melancholic and '
                   'very calm'),
}

PROY = os.environ.get('DUNA_PROY', 'rpvTPzKA')
# EL ESTADO VA AL REPO Y NO A /tmp: perder el `task_id` es perder el asset
# pagado, y el contenedor se revierte solo. Es la misma regla que ya tienen
# DASH (`assets/dash/tareas.json`) y HUESOS.
ESTADO = os.path.join(RAIZ, 'assets', 'duna', 'tareas_mus.json')
EN_VUELO = 6


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
    for vuelta in range(60):
        pend = [n for n, v in d.items() if v.get('estado') == 'pending']
        if pend:
            r = rz.sesion([('check_generation_tasks',
                            {'task_ids': [d[n]['task_id'] for n in pend],
                             'project_id': PROY})], espera=600)
            j = json_de(rz.texto(r[0])) or {}
            for it in (j.get('items') or []):          # la clave es `items`
                for n in pend:
                    if d[n]['task_id'] == it.get('task_id'):
                        d[n]['estado'] = it.get('status', 'pending')
                        if it.get('asset_path'): d[n]['output_path'] = it['asset_path']
                        if it.get('error'): d[n]['error'] = str(it['error'])[:160]
            guarda(d)
        # el proveedor devuelve `failed / retryable` bastante seguido: se reencola
        for n, v in list(d.items()):
            if v.get('estado') in ('failed', 'error'):
                v['intentos'] = v.get('intentos', 1)
                if v['intentos'] < 5: d[n] = {'intentos': v['intentos'] + 1}
        guarda(d)
        vivos = sum(1 for v in d.values() if v.get('estado') == 'pending')
        faltan = [n for n in sorted(PISTAS) if not d.get(n, {}).get('task_id')]
        listos = sum(1 for v in d.values() if v.get('estado') in ('ready', 'succeeded', 'success'))
        print('vuelta %2d · listas %d · en vuelo %d · sin pedir %d'
              % (vuelta, listos, vivos, len(faltan)), flush=True)
        if not faltan and vivos == 0: break
        manda = faltan[:max(0, EN_VUELO - vivos)]
        if manda:
            res = rz.sesion([('submit_audio_generation', {
                    'project_id': PROY,
                    'output_path': 'assets/duna_%s.mp3' % n,
                    'kind': 'music',
                    'duration': PISTAS[n][0],
                    'output_format': 'mp3',
                    'prompt': PISTAS[n][1]}) for n in manda], espera=900)
            for n, r in zip(manda, res):
                j = json_de(rz.texto(r))
                if j and j.get('task_id'):
                    d[n] = {'task_id': j['task_id'], 'output_path': j['output_path'],
                            'estado': j.get('status', 'pending'),
                            'intentos': d.get(n, {}).get('intentos', 1)}
                    print('  ->', n, j['task_id'], flush=True)
                else:
                    print('  !!', n, rz.texto(r)[:200], flush=True)
            guarda(d)
        if faltan or vivos: time.sleep(25)
    guarda(d)
    for n in sorted(d):
        print('%-11s %-10s %s' % (n, d[n].get('estado'), d[n].get('output_path')))

main()
