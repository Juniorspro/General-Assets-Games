#!/usr/bin/env python3
"""
HORNEA LAS TEXTURAS DEL VECINDARIO: de lo que devuelve el generador a lo que entra en el HTML.

- LAS BALDOSAS SE VUELVEN COSIBLES DE VERDAD. El generador dice "seamless" y casi nunca lo es: la
  diferencia entre el borde izquierdo y el derecho pinta una rejilla sobre toda la calle, porque un
  patron repetido delata CUALQUIER costura. Se funde cada borde sobre el opuesto (8% del lado), igual
  que ya se hizo con las bandas de parallax de Maicol.
- 512 DE LADO Y WEBP. Son texturas que se ven de noche, con niebla y tone mapping: 512 alcanza y un
  PNG de 10 MB no.
- EL CIELO NO SE COSE: va una sola vez en un domo, no repetido.

    python3 herramientas/vecindario/hornear_tex.py
"""
import io, os, sys
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ENT = os.path.join(AQUI, 'tex')
SAL = os.path.join(AQUI, 'tex_web')

BALDOSAS = ['calle', 'vereda', 'pasto', 'pared', 'madera', 'techo', 'ladrillo']
LADO = 512
BORDE = 0.08


def coser(im):
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    bw = int(w * BORDE)
    bh = int(h * BORDE)
    # el borde derecho se funde sobre el izquierdo, y el de abajo sobre el de arriba: despues de esto
    # los dos bordes de cada eje SON el mismo pixel, o sea que la costura no puede existir
    f = np.linspace(0, 1, bw)[None, :, None]
    a[:, :bw] = a[:, :bw] * f + a[:, w - bw:] * (1 - f)
    f = np.linspace(0, 1, bh)[:, None, None]
    a[:bh, :] = a[:bh, :] * f + a[h - bh:, :] * (1 - f)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def main():
    os.makedirs(SAL, exist_ok=True)
    tot = 0
    for n in BALDOSAS:
        p = os.path.join(ENT, n + '.png')
        if not os.path.exists(p):
            print('falta', n)
            continue
        im = Image.open(p).convert('RGB')
        # se recorta al cuadrado central por si el generador devolvio otra proporcion
        l = min(im.size)
        im = im.crop(((im.width - l) // 2, (im.height - l) // 2,
                      (im.width + l) // 2, (im.height + l) // 2))
        im = coser(im.resize((LADO, LADO), Image.LANCZOS))
        q = os.path.join(SAL, n + '.webp')
        im.save(q, 'WEBP', quality=80, method=6)
        kb = os.path.getsize(q) // 1024
        tot += kb
        print(f'{n:9s} {LADO}x{LADO} {kb:4d} KB')
    p = os.path.join(ENT, 'cielo.png')
    if os.path.exists(p):
        im = Image.open(p).convert('RGB')
        im = im.resize((1536, round(im.height * 1536 / im.width)), Image.LANCZOS)
        q = os.path.join(SAL, 'cielo.webp')
        im.save(q, 'WEBP', quality=82, method=6)
        kb = os.path.getsize(q) // 1024
        tot += kb
        print(f'cielo     {im.width}x{im.height} {kb:4d} KB')
    print('---', tot, 'KB en total')
    return 0


if __name__ == '__main__':
    sys.exit(main())
