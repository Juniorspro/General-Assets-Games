#!/usr/bin/env python3
"""
PIDE LOS EFECTOS DE LOS CUATRO JUEGOS A REZONA, Y GUARDA EL task_id.

Perder el `task_id` es perder el asset pagado, asi que se escribe a `tareas.json`
antes de que la generacion termine y las que ya lo tienen NO se vuelven a pedir.

LOS PROMPTS PIDEN UN SONIDO FUERTE, CERCA Y SECO. Ya costo tres tandas en RezUno
y otra en los casuales: pedir «un chasquido suave» devuelve un archivo con pico
0,005, o sea silencio. **El nivel se pone en el codigo, nunca en el prompt.**

    python3 herramientas/audio_juegos/pedir.py [juego...]
"""
import json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RZ = os.path.join(os.path.dirname(AQUI), 'rezona', 'rz.py')
PROY = 'uSEsgNYW'          # el proyecto descartable de siempre
SFX = json.load(open(os.path.join(AQUI, 'sfx.json')))
TAR = os.path.join(AQUI, 'tareas.json')


def llama(metodo, args, seg=120):
    r = subprocess.run(['python3', RZ, 'call', metodo, json.dumps(args)],
                       capture_output=True, text=True, timeout=seg)
    try:
        return json.loads(r.stdout)
    except Exception:
        return {'error': (r.stdout or r.stderr)[:200]}


def main():
    tareas = json.load(open(TAR)) if os.path.exists(TAR) else {}
    juegos = sys.argv[1:] or list(SFX)
    for j in juegos:
        for k, (prompt, dur) in SFX[j].items():
            nom = '%s_%s' % (j, k)
            if tareas.get(nom, {}).get('task_id'):
                continue
            r = llama('submit_audio_generation', {
                'project_id': PROY, 'output_path': 'assets/%s.mp3' % nom,
                'prompt': prompt, 'duration': dur})
            tid = r.get('task_id')
            tareas[nom] = {'task_id': tid, 'juego': j, 'clave': k,
                           'dur': dur, 'error': None if tid else r}
            json.dump(tareas, open(TAR, 'w'), indent=1, ensure_ascii=False)
            print(('  ok ' if tid else 'FALLO ') + nom, tid or r)
    print(len([1 for v in tareas.values() if v.get('task_id')]), 'de', len(tareas), 'con task_id')


if __name__ == '__main__':
    main()
