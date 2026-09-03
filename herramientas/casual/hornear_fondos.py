# -*- coding: utf-8 -*-
"""Los seis fondos generados con Rezona, horneados en base64 dentro de cada juego.

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

JUEGOS = ['frutas', 'tubos', 'torre', 'burbujas', 'chispa', 'dados']


def hornea(jid):
    src = os.path.join(CRUDO, 'f_%s-g1.png' % jid)
    if not os.path.exists(src):
        print('  falta %s' % src)
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


def main():
    for j in (sys.argv[1:] or JUEGOS):
        d = hornea(j)
        if d is None:
            continue
        mete(j, d)
        print('%-9s -> %6.1f KB en base64' % (j, len(d)*4/3/1024))


if __name__ == '__main__':
    main()
