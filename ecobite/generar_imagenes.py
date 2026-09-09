#!/usr/bin/env python3
"""Genera las fotos del dossier ECOBITE con Pollinations (gratuita, sin clave).

Cada imagen se pide una vez y se guarda en img/. Si ya existe se salta, así que
el script se puede repetir sin volver a gastar tiempo en lo que ya está.
"""
import os
import subprocess
import sys
import time
import urllib.parse

DESTINO = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')

# Estilo común a todas las tomas: fotografía real, sin texto incrustado.
ESTILO = ('professional food photography, natural daylight, shallow depth of field, '
          'warm earthy color palette, crisp detail, editorial magazine quality, '
          'no text, no watermark, no lettering')

TOMAS = [
    ('01-portada',
     'hero shot of a rustic cereal bar packed with visible dried orange peel, dried '
     'banana slices, rolled oats, peanuts and seeds, resting on dark slate, scattered '
     'citrus zest and oat flakes around, dramatic side light', 1344, 896),
    ('02-fruta-fea',
     'wooden crate full of imperfect ugly fruit at a farmers market: misshapen oranges, '
     'small spotted apples, bruised bananas, still perfectly edible, morning market light',
     1200, 900),
    ('03-subproducto',
     'close up of fresh orange peels and citrus pulp in a stainless steel industrial '
     'container at a juice factory, bright orange tones, clean food processing plant',
     1200, 900),
    ('04-secado',
     'trays of thin orange peel strips and fruit pulp drying in a stainless steel food '
     'dehydrator, warm interior light, clean industrial kitchen', 1200, 900),
    ('05-harina',
     'bowl of fine orange fruit flour powder made from dried citrus peel, wooden scoop, '
     'small pile spilled on a marble surface, soft daylight', 1200, 900),
    ('06-ingredientes',
     'overhead flat lay of small ceramic bowls holding rolled oats, chickpea flour, '
     'roasted peanuts, sunflower seeds, chia seeds and mashed banana, on a linen cloth',
     1200, 900),
    ('07-barritas',
     'tray of freshly cut cereal bars cooling on baking paper, dense fibrous texture with '
     'visible fruit pieces and seeds, overhead view, bakery workshop', 1200, 900),
    ('08-envase',
     'minimalist kraft paper wrapper for a snack bar standing on a concrete surface next '
     'to a recyclable cardboard box, earthy green and orange tones, clean product '
     'photography, blank unprinted packaging', 1200, 900),
    ('09-distribucion',
     'small neighborhood shop shelf displaying boxes of snack bars, warm interior light, '
     'cozy corner store atmosphere', 1200, 900),
    ('10-impacto',
     'conceptual still life: half an orange next to its peel arranged as if becoming food '
     'again, on a dark green background, clean symbolic composition, studio light',
     1200, 900),
    ('11-argentina',
     'sunlit citrus orchard and peanut field landscape, rows of orange trees, blue sky '
     'with soft clouds, wide open rural scenery', 1344, 768),
]


def pedir(nombre, prompt, ancho, alto, intentos=3):
    ruta = os.path.join(DESTINO, nombre + '.jpg')
    if os.path.exists(ruta) and os.path.getsize(ruta) > 20_000:
        print(f'  {nombre}: ya estaba', flush=True)
        return True
    consulta = urllib.parse.urlencode({
        'width': ancho, 'height': alto, 'model': 'flux',
        'nologo': 'true', 'enhance': 'true', 'seed': abs(hash(nombre)) % 100000,
    })
    url = (f'https://image.pollinations.ai/prompt/'
           f'{urllib.parse.quote(prompt + ". " + ESTILO)}?{consulta}')
    for intento in range(1, intentos + 1):
        # Se descarga con curl: el proxy de salida rechaza el User-Agent de urllib.
        hecho = subprocess.run(['curl', '-sSf', '--max-time', '240', '-o', ruta, url],
                               capture_output=True, text=True)
        tam = os.path.getsize(ruta) if os.path.exists(ruta) else 0
        if hecho.returncode == 0 and tam > 20_000:
            print(f'  {nombre}: {tam // 1024} kB ({ancho}x{alto})', flush=True)
            return True
        print(f'  {nombre}: intento {intento} falló '
              f'({hecho.stderr.strip() or f"{tam} bytes"})', flush=True)
        time.sleep(4 * intento)
    return False


def main():
    os.makedirs(DESTINO, exist_ok=True)
    fallos = [n for n, p, a, al in TOMAS if not pedir(n, p, a, al)]
    print('FALLOS:', fallos or 'ninguno', flush=True)
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
