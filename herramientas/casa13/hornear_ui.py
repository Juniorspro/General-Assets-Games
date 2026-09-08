#!/usr/bin/env python3
"""Hornea las imagenes de interfaz de CASA 13 y las pega en el juego.

    python3 herramientas/casa13/hornear_ui.py            # hornea y pega
    UI_DIR=/tmp/rez_casa13/crudo python3 ... --solo      # solo hornea

QUE HACE Y POR QUE ASI
· RECORTA A LA CAJA DEL DIBUJO. El generador devuelve 1024x1024 con el objeto
  flotando en el medio: dejarlo asi es pagar el doble de pixeles por aire, y
  ademas el boton en pantalla queda mas chico de lo que dice su CSS.
· LOS BAJA DE TONO. Salen como foto de producto —cromo blanco, plastico gris
  claro— y este juego es casi negro: puestos crudos, los botones son lo mas
  brillante del cuadro y se leen a calcomania pegada encima. Se multiplica en
  LINEAL, no sobre el byte: escalando el byte se mueve el contraste ademas del
  brillo, y en una pieza de metal eso se ve.
· LOS ACHICA A LO QUE MIDEN EN PANTALLA. Un boton de 76 px en un telefono de
  dpr 3 son 228 px de aparato: 256 alcanza y sobra. Guardar 1024 seria meter
  un mega en el HTML para dibujar un circulo de tres centimetros.
· WEBP CON ALFA. El recorte lo hizo el servidor (`transparent`), asi que el
  alfa ya viene bien; WebP con alfa pesa un tercio que el PNG.
"""
import base64, io, os, sys
from PIL import Image, ImageEnhance

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
CRUDO = os.environ.get('UI_DIR', '/tmp/rez_casa13/crudo')
DEST = os.path.join(RAIZ, 'assets', 'casa13')
JUEGO = os.path.join(RAIZ, 'juegos-pc', 'Casa_Abandonada.html')

# nombre -> (ancho final, ganancia lineal, saturacion, calidad webp)
#   la ganancia sale de mirar la captura: el aro y la perilla viven bajo el
#   pulgar y pueden ser mas oscuros; la linterna es el unico control que tiene
#   que verse APAGADO O ENCENDIDO, asi que se le deja mas cuerpo.
PIEZAS = {
  'linterna': (256, 0.62, 0.55, 82),
  'usar':     (256, 0.58, 0.55, 82),
  'pausa':    (160, 0.34, 0.50, 82),
  'aro':      (320, 0.42, 0.55, 80),
  'perilla':  (192, 0.50, 0.55, 82),
  'tira':     (448, 0.40, 0.60, 78),
  'papel':    (512, 1.00, 1.00, 76),   # el papel se tinta desde el CSS
}
# el papel vuelve con unos pixeles de borde irregular alrededor: se recorta a su
# alfa y ademas se MUERDE un 4 %, porque un borde de hoja repetido en mosaico se
# lee como una rejilla sobre el panel.
MUERDE = {'papel': 0.04}
# EL BOTON DE USAR SALIO PARADO. Es una pastilla y el generador la devolvio
# vertical (256x391); en el juego el boton es horizontal. Se lo acuesta acá y no
# con un `transform` en el CSS, que ademas rotaria el texto que va encima.
GIRA = {'usar': 90}
# LA CINTA SALIO GRIS FRIA Y VA PEGADA SOBRE PAPEL CREMA. Medida sobre la foto
# no es mas clara que el papel —0,94 veces— asi que el problema no es el brillo:
# es la TEMPERATURA. Un tinte calido la mete en la misma familia. Va por canal y
# en lineal, como todos los tintes de este repo.
TINTE = {'tira': (1.00, 0.93, 0.78)}


def lineal(x):   return (x / 255.0) ** 2.2
def sRGB(y):     return int(round(max(0.0, min(1.0, y)) ** (1 / 2.2) * 255))
TAB = {}
def gan(g):
    if g not in TAB:
        TAB[g] = bytes(sRGB(lineal(i) * g) for i in range(256))
    return TAB[g]


def caja(im):
    """la caja del dibujo. Por ALFA si lo hay —que es exacto— y por distancia al
    blanco si no: un umbral de luminancia sobre papel claro se lleva el papel."""
    if im.mode == 'RGBA':
        b = im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
        if b: return b
    g = im.convert('L').point(lambda v: 0 if v > 244 else 255)
    return g.getbbox() or (0, 0, im.width, im.height)


def una(nom, ancho, g, sat, q):
    src = os.path.join(CRUDO, 'ui_%s.png' % nom)
    if not os.path.exists(src): return None
    im = Image.open(src).convert('RGBA')
    im = im.crop(caja(im))
    m = MUERDE.get(nom)
    if m:
        dx, dy = int(im.width * m), int(im.height * m)
        im = im.crop((dx, dy, im.width - dx, im.height - dy))
    if nom in GIRA:
        im = im.rotate(GIRA[nom], expand=True, resample=Image.BICUBIC)
    alto = max(1, round(im.height * ancho / im.width))
    im = im.resize((ancho, alto), Image.LANCZOS)
    r, gr, b, a = im.split()
    tr, tg, tb = TINTE.get(nom, (1.0, 1.0, 1.0))
    im = Image.merge('RGBA', (r.point(gan(g * tr)), gr.point(gan(g * tg)),
                              b.point(gan(g * tb)), a))
    if sat != 1.0:
        rgb = ImageEnhance.Color(im.convert('RGB')).enhance(sat)
        im = Image.merge('RGBA', (*rgb.split(), a))
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
    os.makedirs(DEST, exist_ok=True)
    open(os.path.join(DEST, nom + '.webp'), 'wb').write(buf.getvalue())
    return nom, im.size, len(buf.getvalue()), base64.b64encode(buf.getvalue()).decode()


def main():
    hechas, total = [], 0
    for nom, (w, g, s, q) in PIEZAS.items():
        r = una(nom, w, g, s, q)
        if not r: print('%-10s FALTA' % nom); continue
        _, tam, n, b64 = r
        total += n
        hechas.append((nom, b64))
        print('%-10s %-9s %6d bytes -> %6d en base64' % (nom, '%dx%d' % tam, n, len(b64)))
    print('total %d bytes (%.1f KB), en base64 %.1f KB'
          % (total, total / 1024, sum(len(b) for _, b in hechas) / 1024))
    if '--solo' in sys.argv: return
    pegar(hechas)


def pegar(hechas):
    """Mete el bloque de imagenes en el HTML entre dos marcas. Idempotente: si
    ya estaba, lo reemplaza — un pegado que solo sabe insertar duplica el bloque
    la segunda vez que se corre y el juego se queda con la version vieja."""
    A, B = '/*<<UI_IMG>>*/', '/*<</UI_IMG>>*/'
    s = io.open(JUEGO, encoding='utf8').read()
    cuerpo = 'const UIIMG={\n' + ',\n'.join(
        "%s:'data:image/webp;base64,%s'" % (n, b) for n, b in hechas) + '};\n'
    nuevo = A + '\n' + cuerpo + B
    if A in s:
        i, j = s.index(A), s.index(B) + len(B)
        s = s[:i] + nuevo + s[j:]
    else:
        raise SystemExit('faltan las marcas %s ... %s en el HTML' % (A, B))
    io.open(JUEGO, 'w', encoding='utf8').write(s)
    print('pegado en %s (%d bytes)' % (os.path.basename(JUEGO), len(s)))


if __name__ == '__main__':
    main()
