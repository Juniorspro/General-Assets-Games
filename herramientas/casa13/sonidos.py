#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Los sonidos generados de CASA 13: pide, baja y hornea. Nada queda en Rezona.

    cd /tmp/rez_casa13 && python3 .../sonidos.py --pedir
    cd /tmp/rez_casa13 && python3 .../sonidos.py --estado
    cd /tmp/rez_casa13 && python3 .../sonidos.py --bajar
    python3 .../sonidos.py                      # hornea y pega en el juego

QUE SE GENERA Y QUE NO. Este juego nacio con TODO el audio sintetizado, y eso
sigue siendo lo correcto para lo parametrico: la lluvia no se puede grabar
porque un clip se corta en cada vuelta y ese corte se escucha mas que la lluvia,
y el trueno necesita distancia, azimut y retardo, o sea que TIENE que calcularse.
Lo que si gana con una grabacion es lo que un oscilador no puede fingir:

  · LAS CAMAS DE CUARTO. Hasta acá todos los cuartos sonaban igual salvo por la
    reverb y por el filtro de la lluvia. Una cama por cuarto es lo que convierte
    ocho cajas en ocho sitios.
  · LA CRIATURA. Una garganta no es un oscilador con un pasabanda.
  · LOS GOLPES CON MATERIA. Un chirrido de bisagra, un frasco que rueda, una
    persiana: eso es resonancia de un objeto real.

TODO DEGRADA. Si un clip no decodifica —o si el navegador no sabe MP3— sigue
sonando el sintetizado de siempre. Un juego mudo por un decodificador es peor
que uno con bips.
"""
import io, json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..', 'rezona'))
TAR = os.path.join(AQUI, 'tareas_snd.json')

SECO = (' Dry close recording, no music, no voice, no speech, no words.')

# nombre -> (tipo, segundos pedidos, prompt)
#   'cama' = bucle de ambiente · 'golpe' = un solo disparo
PEDIDOS = {
 # ── ambientes de cuarto ────────────────────────────────────────────────────
 'amb_casa':  ('cama', 8, 'the inside of an empty abandoned wooden house at night, '
   'faint room tone, timbers settling and creaking slowly, a cold draught, very '
   'distant rain outside, nothing else'),
 'amb_cocina':('cama', 8, 'an abandoned kitchen at night, a tap dripping slowly into '
   'a metal sink, a faint hollow rattle of pipes, dead air'),
 'amb_bano':  ('cama', 8, 'an empty tiled bathroom at night, single water drops '
   'falling into a bathtub with a long tiled echo, hollow reverberant room tone'),
 'amb_sotano':('cama', 8, 'a flooded concrete basement, water dripping and slowly '
   'lapping, a deep low hum, faint distant groan of pipes, oppressive dead air'),
 'amb_trastero':('cama',8,'a dark storage room, wind whistling through gaps in the '
   'boards, a loose sheet of metal ticking, dust and dry wood'),
 # ── la criatura ────────────────────────────────────────────────────────────
 'cr_resp':   ('golpe', 3, 'slow heavy wet breathing of something inhuman, very '
   'close to the microphone, ragged and deep'),
 'cr_grune':  ('golpe', 2, 'a low guttural growl from a large creature, throaty, '
   'rising slightly, menacing'),
 'cr_lejos':  ('golpe', 3, 'a distant inhuman cry echoing down a long empty '
   'corridor, faint and reverberant'),
 'cr_arrastra':('golpe',3, 'something heavy being dragged slowly across a dry '
   'wooden floor, scraping'),
 'cr_grito':  ('golpe', 2, 'a violent inhuman scream, sudden, harsh and distorted, '
   'ending abruptly'),
 # ── el fantasma de la ventana ──────────────────────────────────────────────
 'fa_susurro':('golpe', 3, 'a cold breathy whisper right behind you, no words, just '
   'air and sibilance, unsettling'),
 'fa_vidrio': ('golpe', 2, 'a fingernail dragging slowly down a pane of window '
   'glass, thin and shrill'),
 # ── acciones ───────────────────────────────────────────────────────────────
 'ac_puerta': ('golpe', 3, 'an old wooden door swinging slowly on dry hinges, long '
   'creak, no slam'),
 'ac_portazo':('golpe', 2, 'a heavy wooden door slamming shut hard in an empty '
   'room, sharp impact with reverberation'),
 'ac_llave':  ('golpe', 1, 'an old bakelite light switch being flipped, a single '
   'sharp mechanical click'),
 'ac_papel':  ('golpe', 2, 'a single sheet of old dry paper being picked up and '
   'unfolded, crisp rustle'),
 'ac_cinta':  ('golpe', 2, 'picking up a plastic VHS videocassette and pushing it '
   'into a video recorder, plastic clack and a small motor'),
 'ac_vidrio': ('golpe', 2, 'a small glass jar falling onto a wooden floor and '
   'rolling, no shattering'),
 'ac_persiana':('golpe',2, 'a wooden window shutter banging hard against a frame in '
   'the wind, twice'),
}


def main():
    if '--pedir' in sys.argv or '--estado' in sys.argv or '--bajar' in sys.argv:
        import rz
        from balde import balde
        proy = balde()
    if '--pedir' in sys.argv:
        # EL SERVIDOR LIMITA CUANTAS GENERACIONES SE MANDAN SEGUIDAS: medido,
        # de diecinueve pasaron cinco y las otras catorce volvieron con
        # GENERATION_RATE_LIMITED, y el segundo intento de cuatro dio 0 de 4:
        # el limite es por tiempo y una tanda grande se lo come entero. Se manda
        # de a TRES con dos minutos de espera, y se
        # reintenta SOLO lo que falta — el archivo de tareas se conserva, asi
        # que volver a correr esto no vuelve a pedir lo que ya salio.
        import time
        t = {}
        if os.path.exists(TAR):
            t = json.load(io.open(TAR, encoding='utf8'))
        # EL PROVEEDOR DE SONIDO SE CAE Y VUELVE, Y UN TASK_ID FALLIDO SE VE
        # IGUAL QUE UNO BUENO EN EL ARCHIVO DE TAREAS. Medido: cinco de los
        # diecinueve terminaron en `failed` con PROVIDER_UNAVAILABLE /
        # NOIZ_FAILED y `retryable: true`. O sea que no alcanza con reintentar
        # lo que no se envio: hay que MIRAR EL ESTADO y volver a pedir lo que
        # fallo, o el bucle se declara terminado con cinco clips que no existen.
        def caidos():
            ids = [v for v in t.values() if v]
            if not ids: return []
            r = rz.sesion([('check_generation_tasks',
                            {'task_ids': ids, 'project_id': proy})], espera=300)
            d = json.loads(rz.texto(r[0]))['items']
            malos = {it['task_id'] for it in d if it.get('status') == 'failed'}
            return [n for n, v in t.items() if v in malos]

        for vuelta in range(30):
            for n in caidos():
                print('%-13s fallo, se vuelve a pedir' % n, flush=True)
                t[n] = None
            faltan = [n for n in PEDIDOS if not t.get(n)]
            if not faltan:
                print('estan las %d' % len(PEDIDOS)); break
            lote = faltan[:3]
            ll = [('submit_audio_generation',
                   {'project_id': proy, 'kind': 'sound', 'output_format': 'mp3',
                    'duration': PEDIDOS[n][1], 'prompt': PEDIDOS[n][2] + SECO,
                    'output_path': 'assets/snd_%s.mp3' % n}) for n in lote]
            for n, r in zip(lote, rz.sesion(ll, espera=900)):
                txt = rz.texto(r)
                try: t[n] = json.loads(txt).get('task_id')
                except Exception: t[n] = None
                print('%-13s %s' % (n, t[n] or txt[:70]), flush=True)
            io.open(TAR, 'w', encoding='utf8').write(json.dumps(t, indent=1))
            if [n for n in PEDIDOS if not t.get(n)]:
                time.sleep(120)
    elif '--estado' in sys.argv or '--bajar' in sys.argv:
        t = json.load(io.open(TAR, encoding='utf8'))
        r = rz.sesion([('check_generation_tasks',
                        {'task_ids': [v for v in t.values() if v],
                         'project_id': proy})], espera=300)
        d = {it['task_id']: it for it in json.loads(rz.texto(r[0]))['items']}
        os.makedirs('snd', exist_ok=True)
        for n, tid in t.items():
            it = d.get(tid, {})
            if it.get('status') != 'ready':
                print('%-13s %s' % (n, it.get('status', '?'))); continue
            if '--estado' in sys.argv:
                print('%-13s ready' % n); continue
            dst = os.path.join('snd', n + '.mp3')
            subprocess.run(['curl', '-sSL', '-o', dst, it['public_url']], check=True)
            print('%-13s %8d bytes' % (n, os.path.getsize(dst)))
    else:
        import hornear_snd
        hornear_snd.main()


if __name__ == '__main__':
    main()
