# -*- coding: utf-8 -*-
"""Arma la chapa de marca de SisCom a partir del logo horneado en el video.

El logo original vive a 163x149 px dentro de un cuadro de 480x848, o sea que en
la salida de 1080x1920 mide 371x341: hay que TAPARLO, porque queda pegado al
riel de acciones de TikTok y encima esta puesto encima del rack. La chapa nueva
se dibuja mas grande y en el mismo sitio, asi que lo cubre por construccion y se
lee como marca de agua y no como parche.

El logo NO se redibuja: se recorta del propio video y se amplia. Redibujarlo
seria inventar la marca de otro; ampliarlo es fiel, y a 390 px en un telefono la
suavidad del reescalado no se ve.
"""
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter

FUENTE = sys.argv[1] if len(sys.argv) > 1 else 'logo_src.png'
SALIDA = sys.argv[2] if len(sys.argv) > 2 else 'chapa.png'
DIAM   = int(sys.argv[3]) if len(sys.argv) > 3 else 390

NAVY = (10, 36, 83)

src = Image.open(FUENTE).convert('RGB')

# El recorte trae el disco navy con un halo de compresion alrededor. Se rehace
# el disco limpio y el contenido del logo se pega adentro: asi el borde es una
# curva de verdad y no el borde dentado de un JPEG ampliado.
n = int(DIAM)
disco = Image.new('RGBA', (n, n), (0, 0, 0, 0))
d = ImageDraw.Draw(disco)
d.ellipse([0, 0, n - 1, n - 1], fill=NAVY + (255,))

# el logo ampliado, recortado a su propio circulo un poco mas chico
esc = int(n * 1.02)
gr = src.resize((esc, esc), Image.LANCZOS)
# un pelin de nitidez: el reescalado de x2.4 deja el texto blando
gr = gr.filter(ImageFilter.UnsharpMask(radius=2.0, percent=95, threshold=2))
gr = gr.convert('RGBA')
mask = Image.new('L', (esc, esc), 0)
ImageDraw.Draw(mask).ellipse([1, 1, esc - 2, esc - 2], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(0.8))
gr.putalpha(mask)
off = (n - esc) // 2
disco.alpha_composite(gr, (off, off))

# aro exterior fino en blanco al 22%: separa la chapa del rack oscuro de atras
d.ellipse([1, 1, n - 2, n - 2], outline=(255, 255, 255, 56), width=3)

disco.save(SALIDA)
print(f'{SALIDA}  {disco.size}  (fuente {src.size})')
