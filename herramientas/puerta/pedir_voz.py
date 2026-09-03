#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La voz del jugador: las dos frases que dice, en los tres idiomas.

EL JUGADOR HABLA EN DOS MOMENTOS Y EN NINGUN OTRO: al despertarse en el piso del
prologo y al cruzar la puerta negra del epilogo. Las dos frases ya estan escritas
y traducidas, asi que la voz son seis clips y no un doblaje.

LA CLAVE ES LA MISMA QUE LA DEL SUBTITULO. `PB_DESP_FRASE` y `BL_FRASE` son los
textos que el juego ya muestra: el clip se llama por el mismo par (momento,
idioma) que el subtitulo, asi que lo que se lee y lo que se escucha no pueden
decir cosas distintas — y si falta el clip de un idioma se ve el subtitulo y no
suena nada, que es el comportamiento correcto y no un error.

SE PIDE POR REZONA Y NO POR HIGGSFIELD: medido el 2026-09-03, la cuenta de
Higgsfield esta sin credito ("Out of credits on free plan"), asi que las seis
salieron por `submit_audio_generation` con `kind: 'speech'`. Y va al proyecto
descartable, como todo lo demas.
"""
import io, json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
import rz

# clave : el texto que el jugador dice
VOZ = {
 'v_desp_es': 'No sé dónde estoy ni quién soy, pero ya no importa. Solo quiero salir de aquí.',
 'v_desp_en': "I don't know where I am or who I am, but it no longer matters. I just want to get out of here.",
 'v_desp_pt': 'Não sei onde estou nem quem sou, mas já não importa. Só quero sair daqui.',
 'v_fin_es':  'Mi alma encontró el descanso que siempre necesité.',
 'v_fin_en':  'My soul found the rest it always needed.',
 'v_fin_pt':  'Minha alma encontrou o descanso que sempre precisei.',
}

PROY = os.environ.get('PB_PROY', 'YlgCbidN')
ESTADO = '/tmp/pb_voz_tareas.json'
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
            for it in (j.get('items') or []):
                for n in pend:
                    if d[n]['task_id'] == it.get('task_id'):
                        d[n]['estado'] = it.get('status', 'pending')
                        if it.get('asset_path'): d[n]['output_path'] = it['asset_path']
            guarda(d)
        # los fallos del proveedor se reintentan: son `retryable`
        for n, v in list(d.items()):
            if v.get('estado') in ('failed', 'error'):
                v['intentos'] = v.get('intentos', 1)
                if v['intentos'] < 5: d[n] = {'intentos': v['intentos'] + 1}
        guarda(d)
        vivos = sum(1 for v in d.values() if v.get('estado') == 'pending')
        faltan = [n for n in sorted(VOZ) if not d.get(n, {}).get('task_id')]
        listos = sum(1 for v in d.values() if v.get('estado') in ('ready', 'succeeded', 'success'))
        print('vuelta %2d · listos %d · en vuelo %d · sin pedir %d'
              % (vuelta, listos, vivos, len(faltan)), flush=True)
        if not faltan and vivos == 0: break
        manda = faltan[:max(0, EN_VUELO - vivos)]
        if manda:
            res = rz.sesion([('submit_audio_generation', {
                    'project_id': PROY, 'output_path': 'assets/pbv_%s.mp3' % n,
                    'kind': 'speech', 'output_format': 'mp3',
                    'prompt': VOZ[n]}) for n in manda], espera=900)
            for n, r in zip(manda, res):
                j = json_de(rz.texto(r))
                if j and j.get('task_id'):
                    d[n] = {'task_id': j['task_id'], 'output_path': j['output_path'],
                            'estado': j.get('status', 'pending'),
                            'intentos': d.get(n, {}).get('intentos', 1)}
                    print('  ->', n, j['task_id'])
                else:
                    print('  !!', n, rz.texto(r)[:160])
            guarda(d)
        if faltan or vivos: time.sleep(25)
    guarda(d)
    for n in sorted(d): print('%-12s %-10s %s' % (n, d[n].get('estado'), d[n].get('output_path')))

main()
