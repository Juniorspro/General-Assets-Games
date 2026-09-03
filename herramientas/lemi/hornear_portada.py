#!/usr/bin/env python3
"""Arma la portada 9:16 de LEMI: el arte generado + el logo del juego.

    python3 herramientas/lemi/hornear_portada.py /tmp/port/p0.png

DE DÓNDE SALE EL ARTE: generado con Higgsfield (`z_image`, 9:16) con este
prompt, que es la única parte que no se puede reconstruir desde el repo:

    Pixel art video game key art, vertical poster. A dense tropical island
    jungle at dusk seen from behind a lone survivor standing at the bottom of
    the frame, holding a burning torch that lights the leaves in orange. Deep in
    the dark trees ahead, the tall silhouette of a huge sinister camel with two
    glowing eyes watches him. Far below to the side, a tiny campsite with three
    tents and a dying campfire, and an old pickup truck. Chunky low-resolution
    pixel art, limited palette, heavy dithering, saturated jungle greens, black
    shadows, warm torchlight. Cinematic composition with empty sky at the top
    for a title. No text, no words, no letters, no logo, no watermark.

EL TÍTULO NO SE LE PIDE AL MODELO. Un generador de imágenes no deletrea a
pedido —ya costó tres intentos y un «RECEO» en RECREO— y encima el nombre de
este juego ya está dibujado: es el mismo logo de tablones que usa el menú. Se
pide el arte SIN texto y el logo se pega acá, así la portada y el juego dicen el
nombre con la misma forma.

TRES COSAS QUE HACE ESTE SCRIPT Y NO SON ADORNO:

- EL DEGRADADO DE ARRIBA. El arte deja cielo libre pero ahí está también la
  silueta del camello, y las letras de madera sobre un follaje verde oscuro con
  dithering no se despegan. Oscureciendo el 30 % de arriba, la silueta —que ya
  es una silueta— se va al fondo sin borrarse y el cartel queda sobre negro.
  El de abajo cierra el pie del cuadro, que es donde va la firma en cualquier
  póster.

- EL LOGO SE ESCALA CON NEAREST. Es pixel art de 384 px de ancho llevado a 829:
  con una interpolación suave los píxeles se redondean y queda una imagen
  borrosa encima de un arte nítido, que es exactamente lo que delata un montaje.

- Y EL SUBTÍTULO VA ESPACIADO LETRA POR LETRA. DejaVu no tiene `tracking` y una
  línea apretada en mayúsculas se lee a texto de sistema; separada, se lee a
  cartel. Se dibuja carácter por carácter con su sombra.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
LOGO = os.path.join(RAIZ, 'assets', 'lemi', 'logo.png')
SALIDA = os.path.join(RAIZ, 'assets', 'lemi', 'portada.png')
W, H = 1152, 2048
SUB = 'LA ISLA DEL CAMELLO'
FUENTE = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def main():
    ent = sys.argv[1] if len(sys.argv) > 1 else '/tmp/port/p0.png'
    if not os.path.exists(ent):
        print('falta el arte:', ent); return 1

    arte = Image.open(ent).convert('RGB').resize((W, H), Image.LANCZOS)
    a = np.asarray(arte).astype(np.float32)
    y = np.arange(H)[:, None, None].astype(np.float32) / H
    alto = np.clip((0.30 - y) / 0.30, 0, 1) ** 1.25 * 0.80
    bajo = np.clip((y - 0.86) / 0.14, 0, 1) ** 1.30 * 0.72
    a = a * (1.0 - np.maximum(alto, bajo))
    arte = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')

    lg = Image.open(LOGO).convert('RGBA')
    lw = int(W * 0.72)
    lh = int(lw * lg.height / lg.width)
    lg = lg.resize((lw, lh), Image.NEAREST)
    som = Image.new('RGBA', (lw, lh), (0, 0, 0, 0))
    som.paste(lg, (0, 0), lg)
    neg = np.asarray(som).copy(); neg[..., :3] = 0
    som = Image.fromarray(neg, 'RGBA')
    lx, ly = (W - lw) // 2, int(H * 0.055)
    arte.alpha_composite(som, (lx + 7, ly + 9))
    arte.alpha_composite(lg, (lx, ly))

    d = ImageDraw.Draw(arte)
    f = ImageFont.truetype(FUENTE, 34)
    esp = 13
    anchos = [d.textlength(c, font=f) for c in SUB]
    x = (W - (sum(anchos) + esp * (len(SUB) - 1))) / 2
    ty = ly + lh + 26
    for c, w in zip(SUB, anchos):
        d.text((x + 2, ty + 2), c, font=f, fill=(0, 0, 0, 200))
        d.text((x, ty), c, font=f, fill=(232, 216, 180, 235))
        x += w + esp

    arte.convert('RGB').save(SALIDA, optimize=True)
    print(SALIDA, '%dx%d' % (W, H), os.path.getsize(SALIDA), 'bytes')
    return 0


if __name__ == '__main__':
    sys.exit(main())
