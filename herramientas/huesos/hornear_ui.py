#!/usr/bin/env python3
"""Hornea la interfaz generada de HUESOS a `partes/i_ui.js`.

   QUÉ ENTRA Y POR QUÉ CADA UNO SE TRATA DISTINTO
   ──────────────────────────────────────────────
   · el CARTEL del nombre  → RGBA, porque su gracia es el hueso: la veta, la
     mugre en las grietas y el canto rehundido. Un blanco plano no dice nada.
   · la CHAPA del botón    → RGBA por lo mismo: el aro es hueso y los cuatro
     remaches son hierro, y ésos son dos colores.
   · los CUATRO GLIFOS     → SÓLO ALFA. Se pidieron como siluetas blancas y
     planas a propósito: en el juego entran como MÁSCARA de CSS sobre
     `currentColor`, así que el color lo sigue poniendo la hoja de estilo y el
     botón de remate puede seguir siendo ámbar sin una segunda imagen. Una
     silueta pintada congelaría el color y obligaría a generar un archivo por
     estado — y encima el `.bt.no{opacity:.30}` de un botón apagado dejaría de
     funcionar sobre un PNG opaco.
     Por eso el RGB se blanquea antes de comprimir: es un canal que nadie mira
     y uniforme comprime a nada.

   TODO SE RECORTA A SU CAJA DE ALFA. El generador deja aire alrededor —el
   cartel vino de 1376×768 y la tinta ocupa 1222×424— y ese aire no es
   inofensivo: con `background-size:contain` decide la proporción, o sea que
   el cartel saldría la mitad de ancho de lo que mide y el glifo, chico y
   descentrado adentro del botón. Recortando, la caja del CSS y la tinta son
   la misma cosa por construcción.

   Y SE ACHICA MUCHO, con el número medido y no elegido. El botón mide 78 px
   en pantalla y el glifo el 46 % de eso: 36 px. A densidad 3 son 108, así que
   128 sobra. El cartel se dibuja a unos 190 px de ancho, así que 380 lo
   cubre al doble; comparado al lado con 460 y con 640 —o sea al tamaño al
   que el jugador lo mira— las tres son la misma imagen, y 380 a calidad 78
   pesa 24 KB contra los 75 de 640 a 92. Un tercio de los bytes por cero
   píxeles de diferencia.

   EL CARTEL SE ELIGE MIRANDO, y ésa es la lección de RECREO: un modelo de
   imagen no deletrea a pedido, así que se pidieron TRES variantes con la
   palabra escrita letra por letra en el prompt y se eligió la buena a ojo.
   Las tres decían HUESOS; la 3 es la más pesada y la que más se lee a hueso
   —tiene los nudos de la epífisis en la H— que es justo lo que el nombre del
   juego tiene que decir de una ojeada.
"""
import base64, io, json, os
from PIL import Image

FUE = 'assets/huesos'
SAL = 'herramientas/huesos/partes/i_ui.js'
CARTEL = 3            # ← elegido mirando las tres, no sorteado

# (nombre, archivo, ancho final, sólo alfa)
PIEZAS = [
    ('cartel',   'cartel%d.png' % CARTEL, 380, False),
    ('chapa',    'chapa.png',             160, False),
    ('atacar',   'i_atacar.png',          128, True),
    ('esquiva',  'i_esquiva.png',         128, True),
    ('remate',   'i_remate.png',          128, True),
    ('camara',   'i_camara.png',          128, True),
]


def recorta(im):
    """la caja de lo que de verdad se ve.

    El umbral va en 12 y no en 1: el generador deja un halo de alfa 1-6
    alrededor de la tinta, y con umbral 1 la caja abarca la imagen entera y el
    recorte no recorta nada. Es el mismo defecto que ya costó una vuelta con
    el logo de LEMI.
    """
    a = im.getchannel('A').point(lambda v: 255 if v > 12 else 0)
    bb = a.getbbox()
    return im.crop(bb) if bb else im


def hornea(arch, ancho, solo_alfa):
    im = recorta(Image.open(os.path.join(FUE, arch)).convert('RGBA'))
    w0, h0 = im.size
    h = max(1, round(ancho * h0 / w0))
    im = im.resize((ancho, h), Image.LANCZOS)
    if solo_alfa:
        # el RGB no lo mira nadie: uniforme comprime a nada
        a = im.getchannel('A')
        im = Image.merge('RGBA', (Image.new('L', im.size, 255),) * 3 + (a,))
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=88 if solo_alfa else 78,
            alpha_quality=100, method=6)
    return b.getvalue(), (w0, h0), im.size


def main():
    ent, tot = [], 0
    print('%-9s %-14s %-13s %8s' % ('pieza', 'recorte', 'horneado', 'bytes'))
    for nom, arch, ancho, alfa in PIEZAS:
        by, cr, fi = hornea(arch, ancho, alfa)
        tot += len(by)
        print('%-9s %-14s %-13s %8d' % (nom, '%dx%d' % cr, '%dx%d' % fi, len(by)))
        ent.append("  %s: '%s'," % (nom, base64.b64encode(by).decode()))
    s = ("/* i_ui.js — GENERADO por herramientas/huesos/hornear_ui.py, no editar.\n"
         "   El cartel del nombre, la chapa de los botones y los cuatro glifos.\n"
         "   Los glifos van como MÁSCARA: su color lo pone el CSS. */\n"
         "const UI_B64 = {\n" + '\n'.join(ent) + "\n};\n")
    open(SAL, 'w').write(s)
    print('\ntotal %d bytes, %d en base64 → %s' % (tot, round(tot * 4 / 3), SAL))


if __name__ == '__main__':
    main()
