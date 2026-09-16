# -*- coding: utf-8 -*-
"""Las imagenes ENTERAS de cada juego —los fondos y la tira de rivales— horneadas
en base64 adentro del archivo.

POR QUE ES UN SCRIPT APARTE DE `hornear.py`: aquel corta hojas de sprites —mide
la reja, hace el relleno por celda, calcula la escala de cada cuerpo— y un fondo
no tiene nada de eso: es UNA imagen entera. Mezclarlos obligaria a que el
manifiesto de sprites tuviera un caso especial que no es un sprite.

DOS COSAS QUE SE MIDIERON Y DECIDEN EL FORMATO:

1. LA IMAGEN VUELVE CUADRADA AUNQUE SE PIDA 9:16. Medido: `aspect_ratio: '9:16'`
   se ignora y los seis volvieron 1024x1024. NO se estira a vertical —las ollas
   de cobre de la cocina saldrian alargadas al doble— sino que se deja cuadrada
   y la dibuja `dibCubre()`, que hace COVER: la escala a 1560 de alto y recorta
   los costados. Y eso funciona *porque el prompt puso el detalle en las bandas
   de arriba y de abajo*, que son justo las que un cover vertical conserva.

2. 720 DE LADO Y NO 1024. El marco de diseno mide 720 de ancho, asi que 1024 son
   pixeles que se tiran al dibujar. Y el fondo esta detras de la vineta, del haz
   y de las particulas: es lo que MENOS resolucion necesita de todo el archivo.
"""
import base64, io, json, os, re, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(AQUI, 'assets')
CRUDO = os.environ.get('FONDO_DIR', '/tmp/rez_cas/assets/casual')
LADO = int(os.environ.get('FONDO_LADO', '720'))
CAL = int(os.environ.get('FONDO_CAL', '82'))

JUEGOS = ['frutas', 'tubos', 'torre', 'burbujas', 'chispa', 'dados', 'canica',
          'piedra', 'arco', 'castillo', 'penal', 'duelo', 'pesca',
          'salto', 'esquiva', 'nieve', 'grua']


def hornea(jid):
    # `crudo/` es lo que el repo versiona; el directorio con `-g1` es donde el
    # servidor deja la descarga. Se prueban los dos, en ese orden.
    AQUI2 = os.path.dirname(os.path.abspath(__file__))
    src = os.path.join(AQUI2, 'crudo', 'f_%s.png' % jid)
    if not os.path.exists(src):
        src = os.path.join(CRUDO, 'f_%s-g1.png' % jid)
    if not os.path.exists(src):
        print('  falta f_%s.png' % jid)
        return None
    im = Image.open(src).convert('RGB')
    # cuadrada y centrada: si volviera con otra proporcion, el recorte central
    # es lo unico que conserva la composicion en bandas
    w, h = im.size
    if w != h:
        s = min(w, h)
        im = im.crop(((w - s)//2, (h - s)//2, (w + s)//2, (h + s)//2))
    im = im.resize((LADO, LADO), Image.LANCZOS)
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=CAL, method=6)
    return b.getvalue()


def mete(jid, dat):
    """Agrega o reemplaza la entrada del fondo en assets/<jid>.js.

    Se PARSEA el JSON en vez de pegar texto: el archivo lo escribe hornear.py y
    un reemplazo por expresion regular sobre un base64 de cien kilobytes es la
    forma mas rapida de dejar un archivo que casi funciona.
    """
    p = os.path.join(ASSETS, jid + '.js')
    cab = ('/* Generado por herramientas/casual/hornear.py y hornear_fondos.py '
           '— NO editar a mano. */\n')
    if os.path.exists(p):
        s = io.open(p, encoding='utf-8').read()
        m = re.search(r'const AS = (\{.*\});\s*$', s, re.S)
        AS = json.loads(m.group(1)) if m else {'img': {}, 'son': {}}
        cab = s[:s.index('const AS =')]
    else:
        AS = {'img': {}, 'son': {}}
    AS.setdefault('img', {})
    AS['img']['f_' + jid] = {'d': 'data:image/webp;base64,' + base64.b64encode(dat).decode(),
                             'n': 1, 'w': LADO, 'h': LADO}
    io.open(p, 'w', encoding='utf-8').write(
        cab + 'const AS = ' + json.dumps(AS, separators=(',', ':')) + ';\n')


def tira(src, cols, filas, ancho):
    """una reja de retratos pasada a una TIRA de `cols*filas` cuadros en fila.

    `dibCuadro()` asume los cuadros en fila, que es lo correcto —un atlas de una
    fila se indexa con una multiplicacion— pero el generador devuelve la reja que
    se le pidio. Se corta aca y no en el juego: en el juego habria que llevar dos
    numeros mas y el dia que la reja cambie, el codigo del juego se rompe."""
    im = Image.open(src).convert('RGB')
    W, H = im.size
    cw, ch = W//cols, H//filas
    alto = int(ancho*ch/cw)
    out = Image.new('RGB', (ancho*cols*filas, alto))
    k = 0
    for f in range(filas):
        for c in range(cols):
            # ── Y SE RECORTA UN MARGEN DE CADA CELDA ──
            # El generador dibuja la reja que se le pide, o sea que deja una
            # linea de separacion de fondo alrededor de cada retrato. Sin el
            # margen esa linea entra en el cuadro y el retrato sale con un
            # marco magenta que no pinto nadie.
            mx, my = int(cw*0.045), int(ch*0.045)
            ce = im.crop((c*cw + mx, f*ch + my, (c+1)*cw - mx, (f+1)*ch - my))
            ce = ce.resize((ancho, alto), Image.LANCZOS)
            out.paste(ce, (k*ancho, 0)); k += 1
    b = io.BytesIO()
    out.save(b, 'WEBP', quality=CAL, method=6)
    return b.getvalue(), ancho, alto, cols*filas


def main():
    # la tira de rivales de PIEDRA: seis retratos en una reja de 3x2
    src = os.path.join(CRUDO, 'r_piedra-g1.png')
    if os.path.exists(src) and ('piedra' in (sys.argv[1:] or JUEGOS)):
        d, w, h, n = tira(src, 3, 2, 220)
        p = os.path.join(ASSETS, 'piedra.js')
        cab = ('/* Generado por herramientas/casual/hornear*.py — NO editar a mano. */\n')
        AS = {'img': {}, 'son': {}}
        if os.path.exists(p):
            t = io.open(p, encoding='utf-8').read()
            m = re.search(r'const AS = (\{.*\});\s*$', t, re.S)
            if m:
                AS = json.loads(m.group(1))
            cab = t[:t.index('const AS =')]
        AS.setdefault('img', {})['rivales'] = {
            'd': 'data:image/webp;base64,' + base64.b64encode(d).decode(),
            'n': n, 'w': w, 'h': h}
        io.open(p, 'w', encoding='utf-8').write(
            cab + 'const AS = ' + json.dumps(AS, separators=(',', ':')) + ';\n')
        print('%-9s -> %6.1f KB  tira de %d retratos de %dx%d'
              % ('rivales', len(d)*4/3/1024, n, w, h))
    for j in (sys.argv[1:] or JUEGOS):
        d = hornea(j)
        if d is None:
            continue
        mete(j, d)
        print('%-9s -> %6.1f KB en base64' % (j, len(d)*4/3/1024))


if __name__ == '__main__':
    main()
