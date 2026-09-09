#!/usr/bin/env python3
"""Genera las fotos del dossier con Pollinations (gratuita, sin clave).

El modelo responde mucho mejor a frases cortas y concretas que a prompts largos
llenos de adjetivos, y a resolución alta. Por eso cada toma se describe en una
línea y se piden dos candidatas, para poder quedarse con la mejor.
"""
import os
import subprocess
import sys
import urllib.parse

BASE = os.path.dirname(os.path.abspath(__file__))
CANDIDATAS = os.path.join(BASE, 'candidatas')
ESTILO = 'professional food photography'
SEMILLAS = (3, 77)

TOMAS = [
    ('01-portada',      'macro photo of a granola bar with dried orange peel and oats', 1536, 1024),
    ('02-fruta-fea',    'wooden crate of misshapen oranges and spotted apples at a market', 1408, 1056),
    ('03-subproducto',  'a pile of fresh orange peels in a metal bowl', 1408, 1056),
    ('04-secado',       'orange peel slices drying on a metal tray', 1408, 1056),
    ('05-harina',       'a bowl of orange powder with a wooden spoon', 1408, 1056),
    ('06-ingredientes', 'bowls of oats, peanuts and seeds seen from above', 1408, 1056),
    ('07-barritas',     'granola bars cut on baking paper, top view', 1408, 1056),
    ('08-envase',       'a blank kraft paper snack bar wrapper on concrete', 1408, 1056),
    ('09-distribucion', 'shelf of snack boxes in a small corner shop', 1408, 1056),
    ('10-impacto',      'a spiral of orange peel next to half an orange on a dark green table', 1408, 1056),
    ('11-argentina',    'rows of orange trees in an orchard under a blue sky', 1536, 878),
]


def pedir(nombre, prompt, ancho, alto, semilla):
    ruta = os.path.join(CANDIDATAS, f'{nombre}--{semilla}.jpg')
    if os.path.exists(ruta) and os.path.getsize(ruta) > 20_000:
        return True
    consulta = urllib.parse.urlencode({'width': ancho, 'height': alto,
                                       'seed': semilla, 'nologo': 'true'})
    url = (f'https://image.pollinations.ai/prompt/'
           f'{urllib.parse.quote(prompt + ", " + ESTILO)}?{consulta}')
    r = subprocess.run(['curl', '-sSf', '--max-time', '240', '-o', ruta, url],
                       capture_output=True, text=True)
    tam = os.path.getsize(ruta) if os.path.exists(ruta) else 0
    bien = r.returncode == 0 and tam > 20_000
    print(f'  {nombre}--{semilla}: {tam // 1024} kB' if bien
          else f'  {nombre}--{semilla}: FALLÓ', flush=True)
    return bien


def main():
    os.makedirs(CANDIDATAS, exist_ok=True)
    fallos = [f'{n}--{s}' for n, p, a, al in TOMAS for s in SEMILLAS
              if not pedir(n, p, a, al, s)]
    print('FALLOS:', fallos or 'ninguno', flush=True)
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
