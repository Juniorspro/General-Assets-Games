#!/usr/bin/env python3
"""Hornea los assets crudos a base64 dentro de assets/<juego>.js

    python3 herramientas/casual/hornear.py frutas tubos burbujas

POR QUE HAY UN HORNEADO Y NO SE PEGAN LOS PNG TAL CUAL: lo que devuelve un
generador de imagenes no se puede usar directamente. Vuelve en dos mil pixeles
de lado, con el fondo puesto, y —esto es lo que mas cuesta— CON LA REJA QUE SE LE
PIDIO Y NO CON LA QUE VOLVIO.

── EL MODELO NO CUENTA A PEDIDO, Y ESO YA COSTO UNA VUELTA EN OTRO JUEGO ──
Se pidio «una tira horizontal de exactamente 10 frutas en una sola fila» y
volvio una reja de 2x5 con NUEVE frutas (falta la manzana). Se pidio «12 esferas
en una sola fila» y volvio una reja de 3x8 con lineas separadoras y colores
repetidos. Las piezas estan perfectas; la disposicion no es la que se pidio.
Asi que el horneado NO supone la reja: la MIDE —islas de filas y de columnas
sobre la mascara de fondo— y despues se le dice de que celdas sacar cada pieza.
Con las coordenadas escritas a mano, regenerar la imagen corre todo veinte
pixeles y no falla: sale una fruta cortada al medio.

Y la escala de la escala de frutas se ajusto a lo que volvio: nueve y no diez.
Pelear con el generador para que devuelva la manzana habria costado dos
generaciones para agregar una fruta redonda y roja que se confunde con el caqui.
"""
import re
import io, json, os, sys
from PIL import Image
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'crudo')
ASSETS = os.path.join(AQUI, 'assets')

# ── QUE LLEVA CADA JUEGO ──
# `celdas` es la lista de (fila, columna) de la reja MEDIDA, en el orden en el
# que el juego las indexa. Es lo unico que hay que rehacer si se regenera la
# imagen, y lo hace visible en vez de esconderlo en un recorte.
JUEGOS = {
    'frutas': {
        'frutas': dict(archivo='frutas_hoja.png', tipo='hoja', lado=192,
                       # la reja volvio 2x5 con nueve piezas: cinco arriba y
                       # cuatro abajo, en orden de tamano
                       celdas=[(0,0),(0,1),(0,2),(0,3),(0,4),(1,0),(1,1),(1,2),(1,3)]),
    },
    'tubos': {
        # ── SIN `lineas` A PROPOSITO, Y ESO SE MIDIO ──
        # Las lineas separadoras de la reja YA son magenta claro, asi que el
        # relleno desde el borde se las lleva y la reja se mide igual (8x8x8).
        # El paso de erosion que las borraba a mano hacia lo contrario de lo que
        # se queria: dilatar el fondo cuatro pixeles CRUZA el contorno oscuro de
        # una bola, conecta su interior con el fondo, y entonces el relleno
        # entra y le vacia el medio — medido, a la violeta y a la rosa les
        # quedaba un anillo. Un paso que se puso para arreglar un defecto y que
        # causa otro peor se saca, no se ajusta.
        'bolas': dict(archivo='bolas_hoja.png', tipo='hoja', lado=128,
                      # la reja volvio 3x8 con repetidos: la primera fila trae
                      # los ocho primeros colores y la tercera los cuatro que
                      # faltan, justo en el orden de T_COL
                      celdas=[(0,0),(0,1),(0,2),(0,3),(0,4),(0,5),(0,6),(0,7),
                              (2,4),(2,5),(2,6),(2,7)]),
    },
    'torre': {
        # ── LA REJA VOLVIO 2x4 Y NO 4x2, Y SE MIDIO ──
        # Se pidieron cuatro columnas por dos filas y el generador devolvio dos
        # por cuatro. No es un error suyo: la reja del prompt es una sugerencia,
        # y por eso las celdas salen de LO QUE MIDIO y no de lo que se pidio.
        'bloques': dict(archivo='sp_bloques.png', tipo='hoja', lado=192,
                        celdas=[(0,0),(0,1),(1,0),(1,1),(2,0),(2,1),(3,0),(3,1)]),
    },
    'dados': {
        # volvio 3x3: las seis caras estan en las dos primeras filas y la
        # tercera las repite. Se leen las dos de arriba.
        'caras': dict(archivo='sp_dados.png', tipo='hoja', lado=160,
                      celdas=[(0,0),(0,1),(0,2),(1,0),(1,1),(1,2)]),
        # ── ESTA VA CON REJA DECLARADA, Y ES LA EXCEPCION ──
        # Medida por islas da [6,5,4,4]: el icono «1→6» son tres glifos sueltos
        # y la primera fila cuenta seis columnas. Con la reja declarada 4x4 cada
        # celda cae donde tiene que caer.
        'reliq': dict(archivo='sp_reliq.png', tipo='hoja', lado=96, reja=(4, 4),
                      celdas=[(0,0),(0,1),(0,2),(0,3),(1,0),(1,1),(1,2),(1,3),
                              (2,0),(2,1),(2,2),(2,3)]),
    },
    'canica': {
        # la reja volvio con DOS filas: arriba una canica sola centrada y abajo
        # las tres piezas. Las celdas se leen de la de abajo, que es la buena —
        # y por eso la reja se MIDE y no se supone.
        'cosas': dict(archivo='sp_canica.png', tipo='hoja', lado=160,
                      celdas=[(1,0),(1,1),(1,2)]),
        'mejo': dict(archivo='sp_mejo.png', tipo='hoja', lado=96, reja=(4, 4),
                     celdas=[(0,0),(0,1),(0,2),(0,3),(1,0),(1,1),(1,2),(1,3),
                             (2,0),(2,1),(2,2),(2,3)]),
        'madera': dict(archivo='sp_madera.png', tipo='tex', lado=384),
    },
    'chispa': {
        'metal': dict(archivo='sp_metal.png', tipo='tex', lado=256),
    },
    'piedra': {
        'manos': dict(archivo='sp_manos.png', tipo='hoja', lado=224,
                      celdas=[(0,0),(0,1),(0,2)]),
        'iconos': dict(archivo='sp_cartas.png', tipo='hoja', lado=96, reja=(4, 4),
                       celdas=[(0,0),(0,1),(0,2),(0,3),(1,0),(1,1),(1,2),(1,3)]),
    },
    'arco': {
        # ── LOS SEIS ARQUEROS VAN DE PERFIL Y MIRANDO A LA DERECHA ──
        # El juego ESPEJA al que tira desde el otro extremo, asi que con uno de
        # frente y otro de tres cuartos, al espejarlos uno queda mirando al
        # publico y el otro a la nada. Una sola orientacion y el espejo hace el
        # resto — por eso el prompt lo pide y por eso la reja se mide igual.
        # ── LAS DOS REJAS VAN DECLARADAS, Y MIRANDO LA IMAGEN ──
        # Se pidieron 3x2 en las dos. `a_cosas` volvio 3x2 y `a_arqueros` volvio
        # 4x2 con OCHO figuras: el generador metio dos encapuchados casi iguales.
        # Y `mide_reja` contesto 4x4 y 3x3 en cada una, porque las lineas
        # separadoras que el modelo dibuja parten las filas en islas de mas. Con
        # la reja declarada cada celda cae donde tiene que caer; es la misma
        # excepcion que ya hizo falta con la hoja de reliquias de DADOS.
        # De los ocho arqueros se toman SEIS distintos: se saltea el segundo
        # encapuchado y el noble de azul.
        'a_arqueros': dict(archivo='a_arqueros.png', tipo='hoja', lado=224,
                           reja=(4, 2),
                           celdas=[(0,0),(0,1),(0,2),(1,0),(1,1),(1,3)]),
        'a_cosas': dict(archivo='a_cosas.png', tipo='hoja', lado=160,
                        reja=(3, 2),
                        celdas=[(0,0),(0,1),(0,2),(1,0),(1,1),(1,2)]),
        'a_pasto': dict(archivo='a_pasto.png', tipo='tex', lado=320),
    },
    'castillo': {
        # ── ACA LA REJA SE MIDE Y NO SE DECLARA, Y ES AL REVES QUE EN ARCO ──
        # Estas hojas volvieron SIN lineas separadoras, asi que `mide_reja`
        # acierta: 3x2 en los bloques (fila 1 en y 367..657) y 2x2 en el rey.
        # Declarandolas 3x2 sobre los 1024 de alto, la fila 1 caia en y 512..1024
        # —o sea la tira de abajo del bloque mas magenta— y las tres piezas
        # salian en 3,9 KB entre las tres, que es la firma de un recorte vacio.
        # De los bloques se toma la fila de ABAJO: la de arriba trae una piedra
        # gris lisa y la de abajo el ladrillo, que es lo que se lee a piedra.
        'k_bloques': dict(archivo='k_bloques.png', tipo='hoja', lado=192,
                          celdas=[(1,0),(1,1),(1,2)]),
        'k_rey': dict(archivo='k_rey.png', tipo='hoja', lado=224,
                      celdas=[(0,0),(0,1)]),
        'k_catapulta': dict(archivo='k_catapulta.png', tipo='hoja', lado=256,
                            celdas=[(0,0)]),
        'k_piedra': dict(archivo='k_piedra.png', tipo='hoja', lado=128,
                         celdas=[(0,0)]),
        'k_pasto': dict(archivo='k_pasto.png', tipo='tex', lado=320),
    },
    'penal': {
        'p_gente': dict(archivo='p_gente.png', tipo='hoja', lado=224,
                        celdas=[(0,0)]),
        # volvio 2x2 con las filas repetidas: parado y volando, los dos mirando
        # a la derecha. El juego ESPEJA el que se tira para el otro lado.
        'p_arquero': dict(archivo='p_arquero.png', tipo='hoja', lado=256,
                          reja=(2, 2), celdas=[(0,0),(0,1)]),
        'p_bola': dict(archivo='p_bola.png', tipo='hoja', lado=128, celdas=[(0,0)]),
        'p_pasto': dict(archivo='p_pasto.png', tipo='tex', lado=320),
    },
    'duelo': {
        # ── Y ACA LA REJA SE MIDE JUSTAMENTE PORQUE HAY LINEAS ──
        # La hoja volvio con una cruz separadora encima de las dos figuras.
        # Declarando la reja 2x1, las celdas se parten EN la linea, las cuatro
        # esquinas caen sobre ella y el relleno desde el borde no encuentra
        # fondo: se cae al umbral y las lineas SOBREVIVEN — medido en la
        # captura, dos rayas oscuras cruzando a los dos pistoleros. `mide_reja`
        # devuelve cajas ajustadas a las figuras, con la linea AFUERA.
        # Y MIDE TRES COLUMNAS, NO DOS: la linea vertical es una isla de tinta
        # como cualquier otra, asi que cuenta como celda. La del medio ES la
        # linea — medido en la captura, el rival salia como una raya negra
        # vertical de doscientos pixeles — y las figuras son la 0 y la 2.
        'd_tipos': dict(archivo='d_tipos.png', tipo='hoja', lado=256,
                        celdas=[(0,0),(0,2)]),
        'd_tierra': dict(archivo='d_tierra.png', tipo='tex', lado=320),
    },
    'pesca': {
        's_pescador': dict(archivo='s_pescador.png', tipo='hoja', lado=224,
                           celdas=[(0,0)]),
        # ── VOLVIO 2x4 CON OCHO PECES Y NO 3x2 CON SEIS ──
        # Y dos son repetidos (dos dorados y dos lubinas), asi que las celdas se
        # eligen MIRANDO la hoja: trucha, dorado, lubina, atun, raya y aguja, en
        # el orden en que el juego los indexa.
        's_peces': dict(archivo='s_peces.png', tipo='hoja', lado=224,
                        reja=(2, 4), celdas=[(0,0),(0,1),(1,1),(2,0),(3,0),(3,1)]),
        's_agua': dict(archivo='s_agua.png', tipo='tex', lado=320),
    },
    'burbujas': {
        # una sola burbuja BLANCA y las siete salen tinendola en el navegador con
        # `tenido()`, que multiplica sobre blanco y devuelve el color exacto. Es
        # una generacion en vez de siete y ademas no puede pasar que dos colores
        # queden con brillos distintos.
        'burbujas': dict(archivo='burbuja_blanca.png', tipo='sello', lado=160,
                         blanco=True),
    },
}


def abre(n):
    return Image.open(os.path.join(CRUDO, n)).convert('RGB')


def _dist_magenta(a):
    return np.sqrt((a[:,:,0]-255.0)**2 + a[:,:,1]**2.0 + (a[:,:,2]-255.0)**2)


def mascara_fondo(im, umbral=150):
    """El alfa GLOBAL, por distancia al magenta. Sirve para MEDIR la reja y no
    para recortar: ver `alfa_celda`, que es la que recorta."""
    return np.clip((_dist_magenta(np.asarray(im).astype(np.float32)) - umbral*0.42)
                   / (umbral*0.58), 0, 1).astype(np.float32)


def alfa_celda(im, caja, umbral=150, margen=3):
    """El alfa de UNA celda: relleno desde las esquinas de esa celda.

    ── TRES INTENTOS Y LOS DOS PRIMEROS FALLARON DE MANERAS DISTINTAS ──
    1. UMBRAL GLOBAL de distancia al magenta: diez bolas de doce salieron
       perfectas y a la VIOLETA y a la ROSA se les vacio el medio. La causa no es
       el numero: el violeta y el rosa ESTAN cerca del magenta en RGB, asi que
       cualquier umbral que saque el fondo tambien les saca el cuerpo. Es la
       falla clasica del recorte por color cuando el color de la llave aparece
       en el sujeto, y no hay umbral que la arregle.
    2. RELLENO DESDE LAS ESQUINAS DEL CUADRO: separa por CONEXION en vez de por
       color —el fondo toca el borde y el centro de una bola no— y eso si
       distingue las dos cosas. Pero en la hoja de bolas el generador dibujo
       LINEAS SEPARADORAS OSCURAS, y esas lineas encierran el fondo de cada
       celda: el relleno no llega y cada bola sale con su rectangulo magenta
       puesto. Y el paso que borraba las lineas a mano era peor todavia:
       dilatar el fondo cuatro pixeles CRUZA el contorno oscuro de la bola,
       conecta su interior con el fondo, y el relleno vuelve a vaciarla.
    3. RELLENO POR CELDA, que es lo que quedo: la caja de la celda la da la reja
       ya medida, sus cuatro esquinas son fondo por geometria —un cuadrado
       alrededor de un circulo— y desde ahi el relleno cubre el fondo de esa
       celda sin poder salir ni entrar. Las lineas quedan AFUERA de la caja, asi
       que ni hace falta borrarlas.
    """
    from PIL import ImageDraw
    x0, y0, x1, y1 = caja
    X0 = max(0, x0 - margen); Y0 = max(0, y0 - margen)
    X1 = min(im.width, x1 + margen); Y1 = min(im.height, y1 + margen)
    rec = im.crop((X0, Y0, X1, Y1))
    d = _dist_magenta(np.asarray(rec).astype(np.float32))
    mg = d < umbral
    # el `.copy()` no es decorativo: una imagen hecha con `fromarray` comparte
    # el buffer con el array y las escrituras de `floodfill` no vuelven por
    # `asarray` — medido, el relleno informaba 0 % de fondo con las esquinas ya
    # marcadas en 128, o sea que habia funcionado y no se veia
    m = Image.fromarray(np.where(mg, 255, 0).astype(np.uint8), 'L').copy()
    w, h = rec.size
    semillas = [(0,0), (w-1,0), (0,h-1), (w-1,h-1),
                (w//2,0), (w//2,h-1), (0,h//2), (w-1,h//2)]
    hubo = False
    for sx, sy in semillas:
        if m.getpixel((sx, sy)) == 255:
            ImageDraw.floodfill(m, (sx, sy), 128, thresh=0)
            hubo = True
    rampa = np.clip((d - umbral*0.42)/(umbral*0.58), 0, 1)
    if not hubo:
        # ninguna semilla cayo en fondo: la pieza llena la celda de punta a
        # punta. Ahi el umbral es lo unico que queda, y se dice en voz alta.
        print('    ojo: la celda %s no tiene esquina de fondo, se recorta por umbral' % (caja,))
        al = rampa
    else:
        # ── Y EL MAGENTA ENCERRADO TAMBIEN ES FONDO ──
        # El relleno separa por CONEXION, y eso falla cuando el fondo queda
        # encerrado por el propio dibujo: la catapulta tiene tres huecos
        # triangulares entre las vigas, el relleno no entra, y en la captura del
        # juego salieron TRES TRIANGULOS MAGENTA en el medio de la maquina.
        # Un pixel a cuarenta y cinco de distancia del magenta puro no existe en
        # madera ni en piedra, asi que ahi la conexion no hace falta. El umbral
        # va estricto a proposito: la falla que el relleno vino a arreglar era
        # con violetas y rosas, que estan CERCA del magenta pero no encima.
        al = np.where(np.array(m) == 128, rampa,
                      np.where(d < umbral*0.30, 0.0, 1.0))
    # y se devuelve recortado a la caja PEDIDA y no a la ampliada: el margen
    # existe para tener esquinas de fondo, y las lineas separadoras viven ahi
    dx, dy = x0 - X0, y0 - Y0
    return (rec.crop((dx, dy, dx + (x1-x0), dy + (y1-y0))),
            al[dy:dy + (y1-y0), dx:dx + (x1-x0)])


def islas(v, umb, minlar):
    out, ini = [], None
    for i, x in enumerate(v > umb):
        if x and ini is None:
            ini = i
        elif not x and ini is not None:
            if i - ini >= minlar:
                out.append((ini, i))
            ini = None
    if ini is not None and len(v) - ini >= minlar:
        out.append((ini, len(v)))
    return out


def mide_reja(im, al=None):
    """Devuelve reja[fila][col] = (x0,y0,x1,y1), medida y no supuesta.

    Y la tinta sale de la MISMA mascara que el recorte: con un umbral propio,
    una bola violeta se mide como dos islas —el anillo que sobrevive al
    umbral— y la reja informa columnas que no existen.
    """
    if al is None:
        al = mascara_fondo(im)
    tinta = al > 0.5
    fil = tinta.sum(axis=1)
    F = islas(fil, max(1, fil.max()*0.02), int(im.height*0.04))
    reja = []
    for (y0, y1) in F:
        c = tinta[y0:y1].sum(axis=0)
        C = islas(c, max(1, c.max()*0.05), int(im.width*0.010))
        # el alto de cada celda se recorta a su propia tinta: la banda de la
        # fila abarca la mas alta y una fruta chica quedaria centrada mal
        cel = []
        for (x0, x1) in C:
            t = tinta[y0:y1, x0:x1]
            ys = np.where(t.any(axis=1))[0]
            cel.append((x0, y0 + int(ys[0]), x1, y0 + int(ys[-1]) + 1))
        reja.append(cel)
    return reja


def celda_cuadrada(im, caja, lado):
    """La celda recortada y centrada en un cuadrado del lado pedido.

    EL CUADRADO ES EL LADO MAYOR y no el ancho: el juego dibuja cada pieza con
    `dibCuadro`, que ajusta el ALTO de la celda al diametro. Con celdas de
    proporciones distintas, una pera saldria con el mismo alto que una sandia y
    ademas estirada a lo ancho. Con el cuadrado del lado mayor, cada pieza
    conserva su forma y llena su diametro por el lado que le toca.
    """
    rec, al = alfa_celda(im, caja)
    w, h = rec.size
    lc = max(w, h)
    rgba = rec.convert('RGBA')
    rgba.putalpha(Image.fromarray(np.clip(al*255, 0, 255).astype(np.uint8)))
    lienzo = Image.new('RGBA', (lc, lc), (0, 0, 0, 0))
    lienzo.paste(rgba, ((lc-w)//2, (lc-h)//2), rgba)
    return lienzo.resize((lado, lado), Image.LANCZOS)


def reja_fija(im, cols, filas):
    """La reja cortada en partes iguales, sin medir.

    ── CUANDO MEDIR NO SIRVE, Y HAY UN CASO CONCRETO ──
    `mide_reja` separa por islas de tinta, y eso es lo correcto casi siempre:
    encuentra la reja aunque el generador la haya puesto donde se le cantó. Pero
    falla cuando UN dibujo son varias islas — medido, la hoja de reliquias tiene
    un icono que dice «1→6», o sea TRES glifos separados, y la fila se midió con
    seis columnas en vez de cuatro. A partir de ahí los índices están corridos y
    cada carta muestra el icono de otra, que es peor que no tener icono.
    Con la reja declarada, cada celda es un rectángulo exacto y el relleno de
    alfa se sigue haciendo por celda, así que no se pierde nada de lo otro.
    """
    W, H = im.size
    cw, ch = W/cols, H/filas
    return [[(int(c*cw), int(f*ch), int((c+1)*cw), int((f+1)*ch))
             for c in range(cols)] for f in range(filas)]


def hoja(nom, cf):
    im = abre(cf['archivo'])
    reja = (reja_fija(im, *cf['reja']) if cf.get('reja') else mide_reja(im))
    lado = cf['lado']
    piezas = []
    for (f, c) in cf['celdas']:
        assert f < len(reja), '%s: la reja midio %d filas y se pidio la %d' % (nom, len(reja), f)
        assert c < len(reja[f]), '%s: la fila %d midio %d celdas y se pidio la %d' % (nom, f, len(reja[f]), c)
        piezas.append(celda_cuadrada(im, reja[f][c], lado))
    tira = Image.new('RGBA', (lado*len(piezas), lado), (0, 0, 0, 0))
    for i, p in enumerate(piezas):
        tira.paste(p, (i*lado, 0), p)
    return tira, len(piezas), lado, lado, [len(r) for r in reja], cuerpos(piezas)


def cuerpos(piezas):
    """Para cada pieza, cuanto mide su CUERPO y donde esta su centro.

    ── POR QUE HACE FALTA, Y SE VIO EN UNA CAPTURA DEL JUEGO ──
    El juego dibuja cada fruta con su ALTO igual al diametro de choque. Pero el
    alto del sprite incluye la HOJA y el cabito, que en la cereza son un tercio
    de la imagen: la fruta se dibuja bastante mas chica que el circulo con el
    que choca, asi que dos frutas que se estan tocando se ven SEPARADAS y una
    fusion parece un error. En un juego que consiste en juntar cosas iguales,
    eso es lo peor que puede pasar.

    El cuerpo se mide sin suponer nada: la fila mas ANCHA de la pieza es su
    diametro —para una fruta redonda es exacto y para una pera es su parte mas
    gruesa, que es la que choca— y esa misma fila dice donde esta el centro
    vertical del cuerpo. Se devuelven las dos cosas en fraccion del lado, asi
    que el juego las multiplica por el radio y no depende del tamano al que se
    horneo.
    """
    esc, cy = [], []
    for p in piezas:
        a = np.asarray(p)[:, :, 3] > 90
        anchos = a.sum(axis=1)
        i = int(anchos.argmax())
        bw = max(1, int(anchos[i])) / float(p.width)
        esc.append(round(1.0/bw, 4))
        cy.append(round((i + 0.5)/float(p.height), 4))
    return esc, cy


def sello(nom, cf):
    """Una sola pieza, recortada a su caja. Si va a tenirse, el RGB se lleva a
    blanco casi puro: `tenido()` multiplica, asi que sobre blanco el color sale
    exacto y sobre un gris sale multiplicado por ese gris.

    Y NO SE BLANQUEA TODO: solo lo que ya era claro. Forzando el RGB entero a
    blanco se van el contorno y la sombra de abajo, y la pieza queda un disco
    plano — es exactamente lo que paso una vez con la bola de otro juego.
    """
    im = abre(cf['archivo'])
    al = mascara_fondo(im)
    ys = np.where(al.any(axis=1))[0]
    xs = np.where(al.any(axis=0))[0]
    caja = (int(xs[0]), int(ys[0]), int(xs[-1])+1, int(ys[-1])+1)
    p = celda_cuadrada(im, caja, cf['lado'])
    if cf.get('blanco'):
        a = np.asarray(p).astype(np.float32)
        lum = a[:,:,:3].mean(axis=2)
        # ── SOLO LO CASI BLANCO SE LLEVA A BLANCO ──
        # Con el corte en 132 de luminancia, «casi todo» pasaba el umbral y la
        # burbuja salia un disco PLANO: se iban el brillo especular, el borde de
        # luz y la sombra de abajo, o sea las tres cosas por las que valia la
        # pena generarla. Y tenida, un disco plano es peor que la burbuja
        # dibujada por codigo.
        # `tenido()` MULTIPLICA, asi que el gris del cuerpo no molesta: un
        # cuerpo en 0,90 por el color da ese color un poco mas oscuro, que es
        # justamente el sombreado. Lo unico que tiene que ser blanco puro es lo
        # que tiene que salir blanco en las siete: el brillo y el borde.
        k = np.clip((lum - 232.0)/23.0, 0, 1)[:,:,None]
        a[:,:,:3] = a[:,:,:3]*(1-k) + 255.0*k
        p = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return p, 1, cf['lado'], cf['lado'], None, cuerpos([p])


def textura(nom, cf):
    """una textura para repetir con `createPattern`, COSIDA por los bordes.

    ── Y ACA SI HAY QUE COSERLA A MANO ──
    En three.js la costura se resuelve con `MirroredRepeatWrapping`: la copia de
    al lado va dada vuelta, asi que los dos bordes que se tocan son el MISMO
    borde y la costura no puede existir. Un contexto 2D no tiene eso —
    `createPattern` solo repite— asi que la unica salida es fundir la banda de
    un borde sobre la opuesta. Ensucia un poco el centro, que es el precio, y
    para una madera de fondo detras de un laberinto es invisible.
    """
    im = abre(cf['archivo']).convert('RGB')
    L = cf.get('lado', 256)
    im = im.resize((L, L), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    b = max(4, int(L*0.12))
    f = np.linspace(0, 1, b).reshape(1, -1, 1)
    # el borde derecho se funde sobre el izquierdo, y despues igual en vertical
    a[:, :b] = a[:, :b]*f + a[:, L-b:][:, ::-1]*(1 - f)
    fv = f.reshape(-1, 1, 1)
    a[:b, :] = a[:b, :]*fv + a[L-b:, :][::-1]*(1 - fv)
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGB')
    return out, 1, L, L, None, ([1.0], [0.5])


def webp(im, q=86):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6)
    return b.getvalue()


def dataurl(b):
    import base64
    return 'data:image/webp;base64,' + base64.b64encode(b).decode()


def main():
    pedidos = sys.argv[1:] or list(JUEGOS)
    for j in pedidos:
        if j not in JUEGOS:
            print('no hay assets declarados para ' + j)
            continue
        img, total = {}, 0
        for nom, cf in JUEGOS[j].items():
            p = os.path.join(CRUDO, cf['archivo'])
            if not os.path.exists(p):
                print('  falta crudo/%s, se saltea' % cf['archivo'])
                continue
            fn = (hoja if cf['tipo'] == 'hoja' else
                  (textura if cf['tipo'] == 'tex' else sello))
            tira, n, w, h, medida, cu = fn(nom, cf)
            b = webp(tira)
            img[nom] = dict(d=dataurl(b), n=n, w=w, h=h, esc=cu[0], cy=cu[1])
            total += len(b)
            print('  %-10s %d piezas de %dx%d  %5.1f KB%s'
                  % (nom, n, w, h, len(b)/1024,
                     ('  (reja medida ' + 'x'.join(map(str, medida)) + ')') if medida else ''))
        if not img:
            continue
        # ── SE MERGEA, NO SE PISA ──
        # Este script escribia el archivo entero con `{'img': img, 'son': {}}`,
        # y desde que hay tres horneados que escriben ahi —los sprites, los
        # fondos y el audio— eso BORRA el trabajo de los otros dos: correr este
        # dejaba los ocho juegos sin fondo y sin musica. Y no falla: el juego
        # arranca igual, con `AS.son` vacio, y se ve como que el audio nunca se
        # hizo. Se lee lo que hay y se actualizan SOLO las claves propias.
        dest = os.path.join(ASSETS, j + '.js')
        AS = {'img': {}, 'son': {}}
        cab = ('/* Generado por herramientas/casual/hornear*.py — NO editar a mano.\n'
               '   Las imagenes crudas viven en herramientas/casual/crudo/ y no se versionan\n'
               '   enteras: lo que se versiona es esto, que es lo que el juego usa. */\n')
        if os.path.exists(dest):
            t = io.open(dest, encoding='utf8').read()
            m = re.search(r'const AS = (\{.*\});\s*$', t, re.S)
            if m:
                AS = json.loads(m.group(1))
            cab = t[:t.index('const AS =')]
        AS.setdefault('img', {}).update(img)
        AS.setdefault('son', {})
        io.open(dest, 'w', encoding='utf8').write(
            cab + 'const AS = ' + json.dumps(AS, ensure_ascii=False) + ';\n')
        print('%-9s -> %s  %.1f KB de assets' % (j, dest, total/1024))


main()
