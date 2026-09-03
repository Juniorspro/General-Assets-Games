#!/usr/bin/env python3
"""Mete los assets generados con Rezona adentro de cada HTML, en base64.

    python3 herramientas/casual/hornear.py

Los originales viven en herramientas/tiktok/crudo/ tal como los devolvio Rezona
(PNG de 1 a 2,5 MB y MP3 estereo de 400 KB). De aca salen siempre reducidos, asi
que el crudo es la fuente y nunca lo que viaja.

POR QUE HORNEAR Y NO ENLAZAR: cada minijuego es UN archivo. Un `<img src>` a un
CDN significa que el juego no arranca sin red, y estos se abren desde un enlace
en un telefono, en el subte.

LAS CINCO DECISIONES DE TAMANO, Y TODAS SALEN DE PARA QUE SE USA CADA COSA:

  · FONDOS a 720x1280 WebP q70. Es exactamente el marco de diseno, asi que
    subirlo mas es mandar pixeles que nadie va a ver. Van recortados por COVER
    y no estirados: la generacion vuelve en 896x1200 (0,747) y el marco de un
    telefono de hoy es 0,46 — estirando, la entrada del boliche sale aplastada.

  · LAS HOJAS DE SPRITES SE CORTAN EN CELDAS IGUALES Y SE RECORTAN CON LA CAJA
    UNION. Recortando cada cuadro a SU propia caja, el personaje cambia de
    tamano y de centro en cada cuadro y al animar TIEMBLA — es exactamente el
    defecto que costo una vuelta en Maicol. Con la caja union los cuatro
    comparten tamano y alineacion por construccion.

  · LAS TEXTURAS a 512 y EMBALDOSADAS DE VERDAD (banda fundida sobre el borde
    opuesto). `MirroredRepeatWrapping` saca la costura y deja simetria espejo,
    que sobre una placa de metal se lee a calidoscopio.

  · LA MUSICA a mono 22 kHz 48 kbps con LA COLA FUNDIDA SOBRE LA CABEZA. Un tema
    cortado en seco y puesto en bucle da un golpe cada vuelta que se escucha mas
    que la musica. De 396 KB estereo a unos 110.

  · Y EL NIVEL SE MIDE SOBRE EL MP3 YA ESCRITO. Nivelar el float y dar el numero
    por bueno es creerle a una cuenta que no se hizo: a 48 kbps el codificador
    se lleva parte del brillo y un chasquido puede caer un tercio. Se escribe,
    se mide, se corrige y se vuelve a escribir.
"""
import base64, io, json, pathlib, sys
import numpy as np
from PIL import Image
import av

RAIZ = pathlib.Path(__file__).resolve().parents[2]
CRUDO = RAIZ / 'herramientas/tiktok/crudo'
SALIDA = RAIZ / 'herramientas/tiktok/assets'

# ── QUE LLEVA CADA JUEGO ──
# Solo lo que ese juego dibuja o suena. La musica de menu la comparten los cinco
# porque el menu es el mismo momento en los cinco; la de partida es propia,
# porque cambiar de juego tiene que oirse.
JUEGOS = {
    'puerta': {
        'img': [('fondo', 'puerta_fondo', 'fondo', {}),
                ('gente', 'puerta_gente', 'hoja', {'n': 4, 'alto': 330, 'ropa': True, 'cab': True}),
                ('em',    'em_puerta',     'emblema', {'ancho': 300}),
                ('vip',   'puerta_vip',    'sello', {'lado': 220})],
        'son': [('mus', 'mus_puerta', 'mus'), ('menu', 'mus_menu', 'mus'),
                ('pase', 'sfx_pase', 'sfx'), ('no', 'sfx_buzz', 'sfx'),
                ('combo', 'sfx_combo', 'sfx'), ('ovacion', 'sfx_ovacion', 'sfx'),
                ('abucheo', 'sfx_abucheo', 'sfx')],
    },
    'raspa': {
        'img': [('fondo',  'raspa_fondo',   'fondo', {}),
                ('em',     'em_raspa',      'emblema', {'ancho': 300}),
                ('s0',     'raspa_limpio',  'tex', {'lado': 512}),
                ('s1',     'raspa_azulejo', 'tex', {'lado': 512}),
                ('s2',     'raspa_madera',  'tex', {'lado': 512}),
                ('m0',     'raspa_mugre',   'tex', {'lado': 512}),
                ('m1',     'raspa_hollin',  'tex', {'lado': 512}),
                ('pincel', 'raspa_pincel',  'sello', {'lado': 220})],
        'son': [('mus', 'mus_raspa', 'mus'), ('menu', 'mus_menu', 'mus'),
                ('raspa', 'sfx_raspa', 'sfx'), ('combo', 'sfx_combo', 'sfx')],
    },
    'seguidores': {
        'img': [('fondo',  'seg_fondo',   'fondo', {}),
                ('pj',     'seg_pj',      'hoja', {'n': 4, 'alto': 300}),
                ('iconos', 'seg_iconos',  'hoja', {'n': 3, 'alto': 200}),
                ('em',     'em_seguidores', 'emblema', {'ancho': 300}),
                ('extras', 'seg_extras',  'hoja', {'n': 2, 'alto': 200})],
        'son': [('mus', 'mus_seguidores', 'mus'), ('menu', 'mus_menu', 'mus'),
                ('cor', 'sfx_corazon', 'sfx'), ('hater', 'sfx_hater', 'sfx'),
                ('combo', 'sfx_combo', 'sfx'), ('power', 'sfx_power', 'sfx')],
    },
    'mancha': {
        'img': [('piso',    'mancha_piso',    'tex', {'lado': 512}),
                ('salpica', 'mancha_salpica', 'sello', {'lado': 256}),
                ('bola',    'mancha_pj',      'sello', {'lado': 220}),
                ('em',      'em_mancha',      'emblema', {'ancho': 300}),
                ('items',   'mancha_items',   'hoja', {'n': 2, 'alto': 200})],
        'son': [('mus', 'mus_mancha', 'mus'), ('menu', 'mus_menu', 'mus'),
                ('splat', 'sfx_splat', 'sfx'), ('combo', 'sfx_combo', 'sfx'),
                ('power', 'sfx_power', 'sfx'), ('bomba', 'sfx_bomba', 'sfx')],
    },
    'raro': {
        'img': [('fondo',   'raro_fondo',   'fondo', {}),
                ('objetos', 'raro_objetos', 'hoja', {'n': 6, 'alto': 220}),
                ('em',      'em_raro',      'emblema', {'ancho': 300}),
                ('objetos2','raro_objetos2','hoja', {'n': 6, 'alto': 220})],
        'son': [('mus', 'mus_raro', 'mus'), ('menu', 'mus_menu', 'mus'),
                ('combo', 'sfx_combo', 'sfx')],
    },
}


# ══════════════════════ IMAGEN ══════════════════════

def abre(n):
    p = CRUDO / (n + '-g1.png')
    if not p.exists():
        return None
    return Image.open(p).convert('RGBA')


def webp(im, q, alfa=False):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6, exact=alfa)
    return b.getvalue()


def cover(im, w, h):
    """recorta y escala para llenar w x h sin deformar: se elige el lado que
       aprieta y se corta el sobrante por el centro"""
    e = max(w / im.width, h / im.height)
    im = im.resize((max(1, round(im.width*e)), max(1, round(im.height*e))), Image.LANCZOS)
    x = (im.width - w)//2
    y = (im.height - h)//2
    return im.crop((x, y, x + w, y + h))


def embaldosa(im, f=0.16):
    """la banda del borde se funde sobre el borde opuesto, asi que el izquierdo
       ES la continuacion del derecho y se puede repetir sin espejo"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    kx, ky = int(w*f), int(h*f)
    t = np.linspace(0, 1, kx, dtype=np.float32)[None, :, None]
    base = a[:, :w-kx].copy()
    base[:, :kx] = base[:, :kx]*t + a[:, w-kx:]*(1-t)
    t = np.linspace(0, 1, ky, dtype=np.float32)[:, None, None]
    out = base[:h-ky].copy()
    out[:ky] = out[:ky]*t + base[h-ky:]*(1-t)
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'))


def sin_lineas(im, r=3, d=4):
    """── LA GENERACION DIBUJA EL MARCO DE CADA CELDA, Y SE VE ──
    Las tres hojas volvieron con un rectangulo finito alrededor de cada cuadro
    —el modelo dibuja la grilla que se le pidio— y eso no es inofensivo: la caja
    union se lo lleva adentro y en PUERTA, donde la ropa se TINE, ese marco se
    pinto del color de la ropa. Medido en la captura: un rectangulo rojo
    alrededor de la persona, en el medio de la puerta.

    Se saca por EROSION: el marco es una linea de uno a tres pixeles y la figura
    es una mancha gruesa, asi que erosionando 2 px la linea desaparece entera y
    de la figura sobrevive el interior; dilatando 3 px se recupera el contorno.
    No hace falta saber donde estaba la linea ni de que color era.
    """
    a = np.asarray(im)
    al = a[..., 3]
    m = al > 40
    e = m.copy()
    for dx, dy in ((r, 0), (-r, 0), (0, r), (0, -r)):
        e &= np.roll(m, (dy, dx), (0, 1))
    k = e.copy()
    for i in range(1, d+1):
        for dx, dy in ((i, 0), (-i, 0), (0, i), (0, -i), (i, i), (-i, -i), (i, -i), (-i, i)):
            k |= np.roll(e, (dy, dx), (0, 1))
    fuera = int((m & ~k).sum())
    b = a.copy()
    b[..., 3] = np.where(k, al, 0)
    return Image.fromarray(b, 'RGBA'), fuera


def caja_union(celdas):
    """la caja que contiene el dibujo de TODAS las celdas. Es lo unico que
       garantiza que los cuadros no bailen al animar."""
    cajas = [c.split()[3].getbbox() for c in celdas]
    cajas = [b for b in cajas if b]
    if not cajas:
        return None
    return (min(b[0] for b in cajas), min(b[1] for b in cajas),
            max(b[2] for b in cajas), max(b[3] for b in cajas))


def mide_cabeza(celda):
    """── DONDE ESTA LA CABEZA, MEDIDO Y NO SUPUESTO ──
    Los rasgos de las reglas de PUERTA —el gorro, los lentes, la bufanda— se
    dibujan por codigo ENCIMA del sprite generado, y no se pueden poner a ojo:
    un gorro con un desplazamiento fijo queda flotando sobre la cabeza en un
    cuadro y metido en la frente en el otro.

    Y LA PRIMERA VERSION DE ESTA MEDICION ESTABA MAL DE DOS FORMAS, las dos
    encontradas imprimiendo el ancho fila por fila en vez de razonarlo:

      · TOMABA LA FILA 0 COMO LA CORONILLA, y en la fila 0 habia SIETE pixeles
        sueltos repartidos de x=36 a x=189: restos del marco de la celda que la
        erosion no alcanzo a limpiar. La cabeza de verdad empieza en la fila 30.
        Ahora una fila cuenta como coronilla solo si tiene un ancho de verdad.

      · Y BUSCABA EL HOMBRO COMO «la fila que pasa 1,5 veces el ancho de la
        cabeza», que con este dibujo recien se cumple en la fila 126 — o sea
        cincuenta filas DESPUES del cuello. El percentil salia 99 px contra los
        62 que mide la cabeza, y con ese numero los rasgos quedaban repartidos
        una cabeza y media mas arriba: medido en la captura, la bufanda cruzaba
        los ojos y los lentes estaban en el nacimiento del pelo.

    Lo que si es inconfundible en el perfil es el CUELLO: es el minimo de ancho
    entre la coronilla y los hombros (22 px contra 62 de la cabeza y 88 del
    hombro). De ahi sale el ALTO de la cabeza, que es la medida que los rasgos
    necesitan de verdad.
    """
    a = np.asarray(celda)[..., 3]
    h, w = a.shape
    anchos = np.array([(a[y] > 40).sum() for y in range(h)], dtype=np.int32)
    minimo = max(6, int(w*0.12))
    filas = np.where(anchos >= minimo)[0]
    if not len(filas):
        return None
    y0 = int(filas[0])
    # la cabeza: desde la coronilla hasta el minimo de ancho (el cuello)
    tope = min(h, y0 + int(h*0.55))
    banda = anchos[y0:tope]
    if len(banda) < 8:
        return None
    pico = int(banda[:max(3, len(banda)//2)].max())
    # el cuello es el minimo despues de la fila donde la cabeza es mas ancha
    imax = int(np.argmax(banda[:max(3, len(banda)//2)]))
    resto = banda[imax:]
    icuello = imax + int(np.argmin(resto))
    if icuello - 0 < 6:
        icuello = min(len(banda) - 1, imax + 6)
    alto_cab = int(icuello)
    ys, xs = np.where(a[y0:y0+alto_cab] > 40)
    cx = float(xs.mean()) if len(xs) else w/2
    return [round(cx, 1), round(y0, 1), round(float(alto_cab), 1)]


def hoja(im, n, alto, ropa=False, cab=False):
    """corta la hoja en n celdas iguales, recorta con la caja union y devuelve
       una tira de n cuadros de `alto` px. Si `ropa`, devuelve tambien la
       mascara de lo blanco, que es lo que despues se pinta del color que toque."""
    im, fuera = sin_lineas(im)
    if fuera:
        print('   (se saco %d px de lineas de celda)' % fuera)
    w = im.width // n
    celdas = [im.crop((i*w, 0, (i+1)*w, im.height)) for i in range(n)]
    caja = caja_union(celdas)
    if caja:
        celdas = [c.crop(caja) for c in celdas]
    e = alto / celdas[0].height
    wf = max(1, round(celdas[0].width*e))
    celdas = [c.resize((wf, alto), Image.LANCZOS) for c in celdas]
    tira = Image.new('RGBA', (wf*n, alto), (0, 0, 0, 0))
    for i, c in enumerate(celdas):
        tira.paste(c, (i*wf, 0))
    extra = None
    if ropa:
        extra = mascara_ropa(tira)
    cabs = [mide_cabeza(c) for c in celdas] if cab else None
    return tira, wf, alto, extra, cabs


def mascara_ropa(im):
    """── LA ROPA SE TINE, LA PIEL NO ──
    El personaje se genero con la ropa BLANCA justamente para poder pintarla del
    color que la regla pida. Pero un tinte sobre el sprite entero tine tambien la
    cara y las manos, y un tipo verde no es un tipo con remera verde.
    La mascara es «pixel opaco, muy claro y sin color»: eso es exactamente la
    ropa blanca y nada mas — la piel tiene color, el pelo y el contorno son
    oscuros. Sale con el RGB en blanco y el dibujo en el ALFA, asi el juego la
    puede pintar de cualquier color con dos operaciones de lienzo.
    """
    a = np.asarray(im).astype(np.float32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 0, (mx - mn)/np.maximum(mx, 1), 0)
    m = (al > 40) & (mx > 205) & (sat < 0.14)
    # se suaviza un pixel: con un corte duro el borde de la remera queda dentado
    msk = Image.fromarray((m*255).astype('uint8'), 'L')
    from PIL import ImageFilter
    msk = msk.filter(ImageFilter.GaussianBlur(0.7))
    out = Image.new('RGBA', im.size, (255, 255, 255, 0))
    out.putalpha(msk)
    return out


def sello(im, lado, blanco=False):
    """recorta al contenido y encaja en un cuadrado sin deformar"""
    caja = im.split()[3].getbbox()
    if caja:
        im = im.crop(caja)
    im.thumbnail((lado, lado), Image.LANCZOS)
    out = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    out.paste(im, ((lado - im.width)//2, (lado - im.height)//2))
    if blanco:
        # ── SE BLANQUEA LO QUE YA ES CLARO Y NADA MAS ──
        # El RGB en blanco puro hace que el tinte del juego de el color exacto y
        # no el color multiplicado por lo que la generacion haya puesto de gris.
        # PERO BLANQUEANDO TODO se van tambien los contornos y los ojos: medido
        # en la captura, la bola de MANCHA salia un disco de color liso sin cara,
        # porque su dibujo es cuerpo blanco MAS lineas oscuras y las lineas
        # quedaron blancas. Se blanquea por encima de un umbral de luminancia.
        a = np.asarray(out).astype(np.float32)
        lum = a[..., 0]*0.299 + a[..., 1]*0.587 + a[..., 2]*0.114
        m = lum > 150
        for c in range(3):
            a[..., c] = np.where(m, 255, a[..., c])
        out = Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGBA')
    return out


def procesa_img(clave, nombre, tipo, op):
    im = abre(nombre)
    if im is None:
        print('   falta crudo/%s-g1.png' % nombre)
        return None
    if tipo == 'fondo':
        return {'d': dataurl(webp(cover(im, 720, 1280), 70))}
    if tipo == 'tex':
        t = embaldosa(im).resize((op['lado'], op['lado']), Image.LANCZOS)
        return {'d': dataurl(webp(t, 76))}
    if tipo == 'emblema':
        caja = im.split()[3].getbbox()
        if caja:
            im = im.crop(caja)
        e = op['ancho'] / im.width
        im = im.resize((op['ancho'], max(1, round(im.height*e))), Image.LANCZOS)
        return {'d': dataurl(webp(im, 82, True))}
    if tipo == 'sello':
        s = sello(im, op['lado'], blanco=(clave in ('salpica', 'bola')))
        return {'d': dataurl(webp(s, 84, True))}
    if tipo == 'hoja':
        tira, wf, hf, msk, cabs = hoja(im, op['n'], op['alto'],
                                       op.get('ropa', False), op.get('cab', False))
        r = {'d': dataurl(webp(tira, 82, True)), 'n': op['n'], 'w': wf, 'h': hf}
        if msk is not None:
            r['m'] = dataurl(webp(msk, 78, True))
        if cabs and all(cabs):
            r['cab'] = cabs
        return r
    raise SystemExit('tipo raro: ' + tipo)


def dataurl(b):
    return 'data:image/webp;base64,' + base64.b64encode(b).decode()


# ══════════════════════ AUDIO ══════════════════════

HZ = 22050


def leer_audio(p, hz=HZ):
    c = av.open(p if hasattr(p, "read") else str(p))
    re = av.audio.resampler.AudioResampler(format='s16', layout='mono', rate=hz)
    tr = []
    for cuadro in c.decode(audio=0):
        for f in re.resample(cuadro):
            tr.append(f.to_ndarray().reshape(-1))
    c.close()
    if not tr:
        return np.zeros(1, dtype=np.float32)
    return np.concatenate(tr).astype(np.float32) / 32768.0


def sin_silencio(a, hz, umbral=0.012, cola=0.04):
    """recorta el silencio de las DOS PUNTAS y nada mas. Los efectos generados
       vienen con medio segundo de aire adelante, y medio segundo de retardo en
       un golpe se siente como que el juego no responde."""
    fuerte = np.abs(a) > umbral
    if not fuerte.any():
        return a
    i, j = np.argmax(fuerte), len(a) - np.argmax(fuerte[::-1])
    k = int(hz*cola)
    return a[max(0, i-k):min(len(a), j+k)]


def bucle(a, hz, fundido=0.9):
    """── LA COLA SE FUNDE SOBRE LA CABEZA ──
    Un tema cortado en seco y puesto a repetir da un golpe seco en cada vuelta,
    y ese golpe se escucha mas que la musica. Es la misma costura de una textura
    pero en una dimension."""
    k = int(hz*fundido)
    if len(a) < k*3:
        return a
    t = np.linspace(0, 1, k, dtype=np.float32)
    out = a[:len(a)-k].copy()
    out[:k] = out[:k]*t + a[len(a)-k:]*(1-t)
    return out


def nivela(a, rms_obj, pico_max=0.95):
    """nivela por RMS y aplasta la punta con una tanh cuya fuerza se BUSCA.
       Con la fuerza clavada, el que decide el nivel final es el tope de pico y
       no el objetivo: un glugueo de cresta 26 queda cuatro veces por debajo."""
    r = float(np.sqrt(np.mean(a*a)))
    if r < 1e-6:
        return a
    a = a * (rms_obj / r)
    for f in (1.0, 1.4, 2.0, 2.8, 4.0, 6.0):
        b = np.tanh(a*f)/f
        r2 = float(np.sqrt(np.mean(b*b)))
        if r2 > 1e-6:
            b = b*(rms_obj/r2)
        if np.max(np.abs(b)) <= pico_max:
            return b
    return np.clip(b, -pico_max, pico_max)


def a_mp3(a, hz, kbps):
    b = io.BytesIO()
    c = av.open(b, 'w', format='mp3')
    st = c.add_stream('libmp3lame', rate=hz)
    st.bit_rate = kbps*1000
    try:
        st.layout = 'mono'
    except Exception:
        pass
    pcm = np.clip(a*32767, -32768, 32767).astype('int16').reshape(1, -1)
    cuadro = av.AudioFrame.from_ndarray(pcm, format='s16', layout='mono')
    cuadro.sample_rate = hz
    for p in st.encode(cuadro):
        c.mux(p)
    for p in st.encode(None):
        c.mux(p)
    c.close()
    return b.getvalue()


def procesa_son(nombre, tipo):
    p = CRUDO / (nombre + '-g1.mp3')
    if not p.exists():
        print('   falta crudo/%s-g1.mp3' % nombre)
        return None, None
    a = leer_audio(p)
    if tipo == 'mus':
        a = bucle(a, HZ)
        obj, kbps = 0.115, 48
    else:
        a = sin_silencio(a, HZ)
        obj, kbps = 0.200, 56
    # ── EL LAZO CERRADO: se escribe, se mide lo que se va a oir, se corrige ──
    a = nivela(a, obj)
    for _ in range(3):
        b = a_mp3(a, HZ, kbps)
        med = leer_audio(io.BytesIO(b))
        r = float(np.sqrt(np.mean(med*med)))
        if r < 1e-6:
            break
        if abs(r - obj)/obj < 0.06:
            break
        a = nivela(a*(obj/r), obj)
    return b, {'seg': round(len(a)/HZ, 2), 'rms': round(r, 4), 'kb': len(b)//1024}


# ══════════════════════ ARMADO ══════════════════════

def main():
    pedidos = sys.argv[1:] or list(JUEGOS)
    SALIDA.mkdir(parents=True, exist_ok=True)
    for jid in pedidos:
        cfg = JUEGOS[jid]
        img, son, info = {}, {}, []
        print(jid)
        for clave, nombre, tipo, op in cfg['img']:
            r = procesa_img(clave, nombre, tipo, op)
            if r is None:
                continue
            img[clave] = r
            n = len(r['d'])*3//4//1024 + (len(r.get('m', ''))*3//4//1024)
            info.append('%s %s %d KB' % (clave, tipo, n))
        for clave, nombre, tipo in cfg['son']:
            b, m = procesa_son(nombre, tipo)
            if b is None:
                continue
            son[clave] = base64.b64encode(b).decode()
            info.append('%s %s %s' % (clave, tipo, m))
        js = ('/* GENERADO por herramientas/casual/hornear.py — no editar a mano.\n'
              '   Los assets estan generados con Rezona; el crudo vive en\n'
              '   herramientas/tiktok/crudo/ y de aca salen reducidos. */\n'
              'const AS = ' + json.dumps({'img': img, 'son': son}, separators=(',', ':')) + ';\n')
        (SALIDA / (jid + '.js')).write_text(js, encoding='utf8')
        print('  ' + '\n  '.join(info))
        print('  -> assets/%s.js  %d KB' % (jid, len(js)//1024))


main()
