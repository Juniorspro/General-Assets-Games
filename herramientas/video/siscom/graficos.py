# -*- coding: utf-8 -*-
"""Capa de graficos del aviso de SisCom: 1080x1920 con alfa, cuadro por cuadro.

POR QUE UNA CAPA Y NO drawtext/ASS: este ffmpeg no trae drawtext, y aunque
libass esta, los rotulos de aca son formas (pastillas redondeadas, bandas con
borde difuminado, reglas, la chapa de marca) y no texto sobre un fondo. Con la
capa entera en PIL se controla la posicion al pixel y las entradas se animan con
la curva que uno quiera; ffmpeg despues hace UN solo overlay.

LOS TIEMPOS ESTAN PEGADOS A LA MUSICA. Medida la envolvente del audio original,
los golpes caen cada 0.625 s y los compases cada 2.5 s (96 BPM): los cortes y
las entradas de texto van sobre esa reja, asi que el corte se escucha en vez de
solo verse.

LA BANDA DE TEXTO TAPA EL ROTULO VIEJO. El video original trae "Antes"/"Despues"
horneados en x 439-918, y 585-697 de la salida; la banda va de y 455 a 830 a
todo el ancho, asi que lo cubre por construccion y no hay que acordarse.
"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
FPS = 30

NAVY   = (10, 36, 83)
HONDO  = (5, 18, 42)
CARMIN = (201, 41, 74)
BLANCO = (255, 255, 255)
ACERO  = (163, 183, 216)

F_TIT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F_TXT = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
F_REG = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
_cache = {}
def fnt(p, s):
    k = (p, s)
    if k not in _cache: _cache[k] = ImageFont.truetype(p, s)
    return _cache[k]

# ---------------------------------------------------------------- utilidades
def suave(x):
    """smoothstep: derivada cero en las dos puntas, o sea que arranca y termina
    frenando. Una entrada lineal se lee a elemento que aparece de golpe."""
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

def entra(t, t0, dur=0.28):
    return suave((t - t0) / dur)

def sale(t, t1, dur=0.22):
    return 1.0 - suave((t - (t1 - dur)) / dur)

def vis(t, t0, t1, de=0.28, ds=0.22):
    return max(0.0, min(entra(t, t0, de), sale(t, t1, ds)))

def texto(d, xy, s, f, col, ancla='la', sombra=True):
    if sombra:
        d.text((xy[0] + 3, xy[1] + 4), s, font=f, fill=(0, 0, 0, 150), anchor=ancla)
    d.text(xy, s, font=f, fill=col, anchor=ancla)

def pastilla(d, x, y, txt, f, fondo, tinta, pad=(30, 14), r=10):
    a = int(d.textlength(txt, font=f))
    asc, desc = f.getmetrics()
    h = asc + desc
    caja = [x, y, x + a + pad[0] * 2, y + h + pad[1] * 2]
    d.rounded_rectangle(caja, radius=r, fill=fondo)
    d.text((x + pad[0], y + pad[1]), txt, font=f, fill=tinta)
    return caja

def banda(cap, y0, y1, alfa=210, pluma=(46, 70), col=HONDO):
    """Banda horizontal de borde difuminado. El borde duro de un rectangulo se
    lee a subtitulo pegado encima; con la pluma la banda se apoya en la imagen."""
    m = Image.new('L', (1, y1 - y0), alfa)
    px = m.load()
    n = y1 - y0
    for i in range(n):
        v = alfa
        if i < pluma[0]: v = int(alfa * suave(i / pluma[0]))
        elif i > n - pluma[1]: v = int(alfa * suave((n - i) / pluma[1]))
        px[0, i] = v
    m = m.resize((W, n))
    b = Image.new('RGBA', (W, n), col + (255,))
    b.putalpha(m)
    cap.alpha_composite(b, (0, y0))

def regla(d, x, y, ancho, alto=6, col=CARMIN):
    d.rectangle([x, y, x + ancho, y + alto], fill=col)

# ---------------------------------------------------------------- la chapa
CHAPA = None
def chapa(cap, a=1.0, centro=(788, 1474)):
    global CHAPA
    if CHAPA is None:
        CHAPA = Image.open(os.environ.get('CHAPA', 'chapa.png')).convert('RGBA')
    im = CHAPA
    if a < 0.999:
        im = im.copy()
        al = im.getchannel('A').point(lambda v: int(v * a))
        im.putalpha(al)
    cap.alpha_composite(im, (centro[0] - im.width // 2, centro[1] - im.height // 2))

# ---------------------------------------------------------------- guion
# (t0, t1) en segundos de salida. Reja de compas = 2.5 s.
T = dict(
    a1=(0.00, 2.50), a2=(2.50, 5.00),
    d1=(5.00, 6.25), d2=(6.25, 7.50),
    sp=(7.50, 12.50), bu=(12.50, 17.50), ct=(17.50, 21.25),
)
FIN = 21.25

def bloque_sup(cap, d, t, t0, t1, etiqueta, col_etq, lineas, tam=80):
    """Pastilla + titular dentro de la banda de arriba."""
    a = vis(t, t0, t1)
    if a <= 0.004: return
    cap2 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(cap2)
    banda(cap2, 455, 830, alfa=206)
    fe = fnt(F_TXT, 44)
    pastilla(d2, 90, 480, etiqueta, fe, col_etq + (255,), BLANCO + (255,))
    ft = fnt(F_TIT, tam)
    dy = 0
    # desliza 26 px desde la izquierda al entrar
    dx = int(26 * (1 - suave((t - t0) / 0.34)))
    for ln in lineas:
        texto(d2, (90 - dx, 580 + dy), ln, ft, BLANCO + (255,))
        dy += int(tam * 1.16)
    al = cap2.getchannel('A').point(lambda v: int(v * a))
    cap2.putalpha(al)
    cap.alpha_composite(cap2)

def cuadro(t):
    cap = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(cap)

    # ---- 1 y 2: el problema
    bloque_sup(cap, d, t, *T['a1'], 'ANTES', CARMIN,
               ['¿TU RACK', 'ESTÁ ASÍ?'], tam=88)
    bloque_sup(cap, d, t, *T['a2'], 'ANTES', CARMIN,
               ['Sin orden.', 'Sin etiquetas.', 'Sin documentación.'], tam=64)

    # ---- 3 y 4: la vuelta
    bloque_sup(cap, d, t, *T['d1'], 'DESPUÉS', NAVY,
               ['EL MISMO', 'RACK.'], tam=88)
    bloque_sup(cap, d, t, *T['d2'], 'DESPUÉS', NAVY,
               ['Ordenado.', 'Etiquetado.', 'Documentado.'], tam=64)

    # barrido del corte: una linea clara que cruza justo en el compas
    if T['d1'][0] - 0.02 <= t < T['d1'][0] + 0.30:
        k = (t - T['d1'][0]) / 0.30
        x = int(-90 + k * (W + 180))
        g = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dg = ImageDraw.Draw(g)
        dg.rectangle([x, 0, x + 10, H], fill=BLANCO + (255,))
        dg.rectangle([x - 46, 0, x, H], fill=BLANCO + (60,))
        g = g.filter(ImageFilter.GaussianBlur(7))
        al = g.getchannel('A').point(lambda v: int(v * (1 - k) * 0.9))
        g.putalpha(al)
        cap.alpha_composite(g)

    # ---- 5: comparativa apilada
    t0, t1 = T['sp']
    if t0 - 0.3 < t < t1:
        a = vis(t, t0, t1, 0.30, 0.24)
        if a > 0.004:
            c2 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            d2 = ImageDraw.Draw(c2)
            # cabecera
            texto(d2, (W // 2, 96), 'RED CORPORATIVA', fnt(F_TIT, 62), BLANCO + (255,), 'ma')
            texto(d2, (W // 2, 172), 'ordenamiento y documentación de rack',
                  fnt(F_REG, 40), ACERO + (255,), 'ma')
            regla(d2, W // 2 - 70, 232, 140, 6)
            # rotulos de cada panel (y tapan el rotulo horneado del original)
            fe = fnt(F_TXT, 46)
            pastilla(d2, 46, 306, 'ANTES', fe, CARMIN + (235,), BLANCO + (255,))
            pastilla(d2, 46, 1064, 'DESPUÉS', fe, NAVY + (240,), BLANCO + (255,))
            # separador
            d2.rectangle([0, 942, W, 954], fill=BLANCO + (235,))
            # pie
            texto(d2, (W // 2, 1748), 'el mismo rack · mismo día',
                  fnt(F_REG, 38), ACERO + (255,), 'ma')
            al = c2.getchannel('A').point(lambda v: int(v * a))
            c2.putalpha(al)
            cap.alpha_composite(c2)

    # ---- 6: que se hizo
    t0, t1 = T['bu']
    if t0 - 0.3 < t < t1:
        a = vis(t, t0, t1, 0.30, 0.24)
        if a > 0.004:
            c2 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            d2 = ImageDraw.Draw(c2)
            banda(c2, 430, 1140, alfa=214)
            texto(d2, (90, 470), 'QUÉ INCLUYE EL TRABAJO', fnt(F_TXT, 40), ACERO + (255,))
            regla(d2, 90, 534, 116, 6)
            items = ['Ordenamiento y peinado de cables',
                     'Etiquetado de cada punto de red',
                     'Documentación y plano del rack',
                     'Red de datos y CCTV']
            ft = fnt(F_TIT, 52)
            for i, it in enumerate(items):
                ti = t0 + 0.30 + i * 1.25          # uno por golpe de compas
                k = suave((t - ti) / 0.30)
                if k <= 0.004: continue
                y = 596 + i * 122
                dx = int(30 * (1 - k))
                cc = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                dc = ImageDraw.Draw(cc)
                dc.ellipse([90 - dx, y + 6, 90 - dx + 46, y + 52], fill=CARMIN + (255,))
                dc.line([(101 - dx, y + 30), (110 - dx, y + 41), (127 - dx, y + 17)],
                        fill=BLANCO + (255,), width=7)
                texto(dc, (160 - dx, y), it, ft, BLANCO + (255,))
                alc = cc.getchannel('A').point(lambda v: int(v * k))
                cc.putalpha(alc)
                c2.alpha_composite(cc)
            al = c2.getchannel('A').point(lambda v: int(v * a))
            c2.putalpha(al)
            cap.alpha_composite(c2)

    # ---- 7: el cierre
    t0, t1 = T['ct']
    if t0 - 0.3 < t <= FIN:
        a = min(entra(t, t0, 0.34), 1.0 - suave((t - (FIN - 0.45)) / 0.45))
        if a > 0.004:
            c2 = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            d2 = ImageDraw.Draw(c2)
            d2.rectangle([0, 0, W, H], fill=HONDO + (232,))
            regla(d2, W // 2 - 70, 700, 140, 8)
            texto(d2, (W // 2, 760), 'SISCOM · SERVICIO TÉCNICO',
                  fnt(F_TXT, 44), ACERO + (255,), 'ma')
            texto(d2, (W // 2, 838), 'LLAMANOS', fnt(F_REG, 38), ACERO + (255,), 'ma')
            texto(d2, (W // 2, 892), '3794-345445', fnt(F_TIT, 118), BLANCO + (255,), 'ma')
            d2.rounded_rectangle([120, 1064, W - 120, 1160], radius=14, fill=NAVY + (255,))
            texto(d2, (W // 2, 1086), 'siscomcorrientes.com.ar',
                  fnt(F_TXT, 52), BLANCO + (255,), 'ma')
            texto(d2, (W // 2, 1214), 'Paraguay 789 · Corrientes Capital',
                  fnt(F_REG, 42), ACERO + (255,), 'ma')
            al = c2.getchannel('A').point(lambda v: int(v * a))
            c2.putalpha(al)
            cap.alpha_composite(c2)
            chapa(cap, a, (W // 2, 452))

    # ---- chapa de marca en los planos de video (tapa la marca horneada)
    if t < T['sp'][0]:
        chapa(cap, min(1.0, entra(t, 0.20, 0.5)))
    elif T['bu'][0] <= t < T['ct'][0]:
        chapa(cap, vis(t, T['bu'][0], T['bu'][1], 0.4, 0.24), (788, 1474))
    elif T['sp'][0] <= t < T['sp'][1]:
        chapa(cap, vis(t, T['sp'][0], T['sp'][1], 0.4, 0.24) * 0.96, (W - 168, 1836))

    return cap

if __name__ == '__main__':
    sal = sys.argv[1]
    os.makedirs(sal, exist_ok=True)
    if len(sys.argv) > 2:                      # cuadros de prueba sueltos
        for s in sys.argv[2:]:
            tt = float(s)
            cuadro(tt).save(f'{sal}/p_{tt:07.3f}.png')
            print('prueba', tt)
        raise SystemExit
    n = int(round(FIN * FPS))
    for i in range(n):
        cuadro(i / FPS).save(f'{sal}/g_{i:05d}.png')
        if i % 60 == 0: print(f'  {i}/{n}', flush=True)
    print(f'{n} cuadros en {sal}')
