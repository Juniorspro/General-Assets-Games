#!/usr/bin/env python3
"""Las recetas de los packs generados, y NADA MAS.

   ── UN SIMBOLO, CUATRO ESTETICAS ──
   Pedido textual: *«el coso este de los iconos, el unico diferente es el
   personalizados, que ahi si descargaste y te cortaste; quiero que todos sean
   asi pero con otras esteticas como puro cristal»*. Tenia razon y se puede
   decir con numeros: de los siete packs, UNO era un juego de celdas generadas
   y recortadas y los otros seis eran tratamientos de CSS sobre un glifo
   dibujado. La respuesta no es dibujar mejor: es generar los otros tambien.

   ── Y LA LISTA DE SIMBOLOS ES UNA SOLA ──
   Las 207 celdas de `crudo/icogen.json` estan escritas como
   `<simbolo>, on a <color> tile`: la primera mitad es QUE es el icono y la
   segunda COMO se ve la baldosa. Separandolas con una expresion —las 207
   cumplen el patron, medido— el simbolo se reusa entero en cada pack y lo unico
   que cambia es la receta de abajo. Con una lista por pack, arreglar un simbolo
   en uno lo deja mal en los otros tres, y eso no falla: sale distinto.
"""
import re

CORTE = re.compile(r'^(.*?),\s*on an?\s+[^,]+\s+tile\.?$', re.S)


def simbolo(celda):
    """El simbolo solo, sin la baldosa. Si no cumple el patron, la celda entera."""
    m = CORTE.match(celda.strip())
    return (m.group(1) if m else celda).strip()


COLA = ('. Flat orthographic view, each symbol centred in its tile, wide pure-black '
        'gutters between the tiles. No text, no captions, no labels, no letters other '
        'than the ones described, no watermark, no shadow outside the tiles, no border '
        'around the grid.')

# `color` dice si la celda conserva el color de baldosa que trae `icogen.json`.
# Los tres packs nuevos son monocromos a proposito: lo que los separa del
# generado —y entre ellos— es el MATERIAL, y un material se lee peor con nueve
# colores encima.
RECETAS = {
  'generado': {
    'color': True,
    'cabeza': ('A 3x3 grid of nine separate mobile app icons on a pure black background. '
               'Each icon is a rounded-square Frutiger Aero glass tile, glossy and '
               'translucent, with a bright specular highlight sweeping across the top '
               'third, tiny water droplets, a soft inner glow and a thin light rim. Wide '
               'pure-black gutters between the tiles. The nine tiles, in reading order '
               'left to right and top to bottom, are: '),
    'cola': ('. Flat orthographic view, each symbol centred in its tile, pure white '
             'symbols. No text, no captions, no labels, no letters other than the ones '
             'described, no watermark, no shadow outside the tiles, no border around '
             'the grid.'),
  },
  # ── EL QUE SE PIDIO CON TODAS LAS LETRAS ──
  # «puro cristal»: sin color, sin foto detras, el simbolo TALLADO en el vidrio
  # y no pintado encima. El canto biselado es lo que lo hace leer a pieza de
  # vidrio de verdad y no a rectangulo translucido, que es lo que ya daba el
  # `backdrop-filter` del CSS — o sea que sin el bisel este pack no aportaria
  # nada nuevo.
  'cristal': {
    'color': False,
    'cabeza': ('A 3x3 grid of nine separate mobile app icons on a pure black background. '
               'Each icon is a rounded-square tile carved from thick clear colourless '
               'optical glass, with a wide bevelled edge that refracts the light, a hard '
               'white specular streak across the top-left corner and a faint caustic '
               'glow at the bottom. Every tile is identical clear glass, no colour, no '
               'tint. The symbol on each tile is a frosted white engraving cut into the '
               'glass. The nine tiles, in reading order left to right and top to bottom, '
               'are: '),
    'cola': COLA,
  },
  # ── LOSA MATE: LA UNICA FAMILIA SIN UN SOLO BRILLO ──
  # Contra tres packs que dependen del reflejo, uno completamente mate se
  # distingue a sesenta pixeles sin mirar el simbolo.
  'tinta': {
    'color': False,
    'cabeza': ('A 3x3 grid of nine separate mobile app icons on a pure black background. '
               'Each icon is a rounded-square slab of matte charcoal ceramic, completely '
               'flat with no gloss and no reflection, with a fine sandy micro-texture and '
               'a soft chamfered edge catching a dim light from the upper left. Every '
               'tile is the same dark grey, no colour. The symbol on each tile is flat '
               'chalk white with a crisp edge. The nine tiles, in reading order left to '
               'right and top to bottom, are: '),
    'cola': COLA,
  },
  # ── NEON: CASI NEGRO Y EL CANTO ENCENDIDO ──
  # El halo va HACIA AFUERA a proposito. Con el borde discreto, en el cajon
  # —donde un icono mide sesenta pixeles— este pack y el de tinta se veian
  # iguales: los dos casi negros. Eso ya se midio en la vuelta 126.
  'neon': {
    'color': False,
    'cabeza': ('A 3x3 grid of nine separate mobile app icons on a pure black background. '
               'Each icon is a rounded-square tile of near-black brushed metal with a '
               'thin bright cyan neon rim glowing around its whole edge and a soft cyan '
               'halo bleeding a few pixels outwards onto the black. Every tile is the '
               'same, no other colour. The symbol on each tile is a glowing white line '
               'drawing with a faint cyan bloom. The nine tiles, in reading order left '
               'to right and top to bottom, are: '),
    'cola': COLA,
  },
}


def prompt(pack, celdas):
    """El prompt de una hoja: nueve celdas en orden de lectura."""
    r = RECETAS[pack]
    ce = [c if r['color'] else simbolo(c) for c in celdas]
    return r['cabeza'] + '; '.join('%d) %s' % (i + 1, c) for i, c in enumerate(ce)) + r['cola']
