# -*- coding: utf-8 -*-
"""La musica y los efectos de los seis casuales, con Rezona. Reencola solo.

DOS COSAS QUE HAY QUE HACER Y NO SON OBVIAS, Y LAS DOS YA COSTARON UNA VUELTA EN
ESTE REPO:

1. EL PROVEEDOR FALLA Y HAY QUE REINTENTAR. Medido en esta tanda: de quince
   clips, SEIS volvieron `failed` en el primer intento, marcados por el propio
   servidor como transitorios. Sin reintento el guion termina diciendo «listo»
   con la mitad del audio sin generar, Y NO FALLA: se queda callado, que es la
   peor clase de error.

2. EL TOPE ES DOCE EN VUELO, POR CUENTA. Mandando los quince de una, los tres
   ultimos rebotan con GENERATION_TOO_MANY_IN_FLIGHT. Se manda de a tandas y se
   espera a que la cola baje.

Y EL PROMPT PIDE UN SONIDO FUERTE: describir el objeto fisico y pedir «fuerte,
cerca y seco». Pedir «un chasquido suave» devuelve pico 0,005, o sea silencio —
el nivel lo pone el horneado, nunca el prompt.
"""
import json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', 'rezona'))
import rz

P = 'YlgCbidN'
LOOP = (' Seamless loop, no intro and no ending, steady tempo, mixed loud and'
        ' clean, no vocals, no speech.')

MUS = {
 'm_menu':    'Warm inviting chiptune-orchestral hybrid for a casual mobile game'
              ' menu: gentle marimba arpeggio, soft pad, light bell melody, 92 BPM,'
              ' major key, calm and welcoming.',
 'm_frutas':  'Cozy kitchen puzzle music: playful pizzicato strings, marimba and'
              ' hand claps, 104 BPM, warm major key, bouncy and light.',
 'm_tubos':   'Calm thoughtful puzzle music: soft glass bells, muted plucked bass'
              ' and a slow pad, 84 BPM, minor key with a warm resolution, patient.',
 'm_torre':   'Uplifting arcade stacking music: bright synth arpeggio rising in'
              ' steps, punchy kick, airy pad, 118 BPM, major key, feeling of'
              ' climbing higher.',
 'm_burbujas':'Underwater bubbly puzzle music: watery marimba, soft filtered pads,'
              ' gentle plucks with delay, 96 BPM, dreamy and cool.',
 'm_chispa':  'Clean electronic puzzle music: minimal glitchy synth pulses, tight'
              ' hi-hats, deep sine bass, 110 BPM, cool blue neon mood, focused.',
 'm_dados':   'Smooth casino lounge groove: brushed drums, walking upright bass,'
              ' muted jazz guitar chords, 100 BPM, confident and warm.',
}
FX = {
 's_fusion': 'A loud close-up bright bell chime with a short bubbly pop underneath,'
             ' dry studio recording, satisfying merge sound, single hit.',
 's_suelta': 'A loud short dry wooden knock, close microphone, single hit, no reverb.',
 's_pop':    'A loud clean bubble pop, close-up, single burst, dry and punchy.',
 's_clic':   'A loud crisp mechanical switch click, close-up, single click, dry.',
 's_caida':  'A loud heavy wooden block landing flat on a table, close-up thud,'
             ' single hit, dry and punchy with a short low body.',
 's_dado':   'Loud dice tumbling and landing on a felt casino table, close-up,'
             ' short, dry, clear.',
 's_gana':   'A loud short bright triumphant fanfare, three ascending bell notes'
             ' with a warm chord, clean and dry, no reverb tail.',
 's_perder': 'A loud short descending sad chime, three falling notes, clean and'
             ' dry, no reverb tail.',
}
ESTADO = '/tmp/audio_tasks.json'
TANDA = 6            # por debajo del tope de 12, para dejar aire
VUELTAS = 6


def pide(nombres):
    llam = []
    for n in nombres:
        d, dur = (MUS[n], 16) if n in MUS else (FX[n], 3)
        pr = d + (LOOP if n in MUS else '')
        llam.append(('submit_audio_generation',
                     {'project_id': P, 'output_path': 'assets/casual/%s.mp3' % n,
                      'prompt': pr, 'duration': dur}))
    out = {}
    for (n, r) in zip(nombres, rz.sesion(llam, espera=600)):
        t = rz.texto(r)
        try:
            out[n] = json.loads(t)['task_id']
        except Exception:
            print('  rebota %s: %s' % (n, t[:70].replace('\n', ' ')))
    return out


def revisa(ids):
    if not ids:
        return {}
    r = rz.sesion([('check_generation_tasks',
                    {'task_ids': list(ids.values())})], espera=300)
    d = json.loads(rz.texto(r[0]))
    n2t = {v: k for k, v in ids.items()}
    return {n2t[i['task_id']]: i['status'] for i in d['items'] if i['task_id'] in n2t}


def main():
    todos = list(MUS) + list(FX)
    ids = json.load(open(ESTADO)) if os.path.exists(ESTADO) else {}
    for vuelta in range(VUELTAS):
        est = revisa(ids)
        listos = {n for n, s in est.items() if s == 'ready'}
        vuela = {n for n, s in est.items() if s in ('pending', 'running')}
        faltan = [n for n in todos if n not in listos and n not in vuela]
        print('vuelta %d: %d listos, %d en vuelo, %d faltan'
              % (vuelta, len(listos), len(vuela), len(faltan)))
        if not faltan and not vuela:
            break
        if faltan:
            ids.update(pide(faltan[:TANDA]))
            json.dump(ids, open(ESTADO, 'w'), indent=1)
        if vuelta < VUELTAS - 1:
            time.sleep(45)
    est = revisa(ids)
    print(json.dumps(est, indent=1))
    print('LISTOS %d de %d' % (sum(1 for s in est.values() if s == 'ready'), len(todos)))


if __name__ == '__main__':
    main()
