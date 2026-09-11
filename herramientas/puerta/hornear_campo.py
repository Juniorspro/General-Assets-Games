#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hornea las texturas del campo: los dos petalos, el disco de florecillas y las
tres mariposas.

EL PETALO VOLVIO CON SU PROPIA SILUETA Y SU FONDO, que es exactamente lo que el
prompt pedia que NO pasara: uno salio blanco sobre negro y el otro magenta sobre
rojo oscuro. Y no se puede usar asi, porque la silueta ya la pone la geometria:
mapeada tal cual, cada petalo de la flor sale con un contorno negro dibujado
adentro.

LO QUE SE HACE NO ES VOLVER A GENERAR, ES DESENROLLARLO. Fila por fila se busca
donde empieza y donde termina el tejido y ESE tramo se estira hasta ocupar el
ancho entero. El resultado es tejido puro de borde a borde y —lo que importa—
las venas conservan su abanico: salen del centro de abajo y se abren hacia
arriba, que es lo que un relleno plano no puede dar. Un petalo estirado asi
cuadra mejor con la geometria que uno pedido de nuevo, porque la geometria
tambien se ensancha y se angosta.

LA PUNTA SE RECORTA A PROPOSITO. Arriba de todo el tejido mide dos pixeles de
ancho, y estirar dos pixeles a trescientos ochenta y cuatro es una mancha. Se
corta donde el ancho baja del 18 % del maximo; lo que la geometria dibuja en su
punta pasa a ser tejido de un poco mas abajo, que no se distingue.

EL DISCO NO SE USA COMO DISCO. La foto es una espiral de florecillas con marco
negro, y el centro va sobre un domo con UV DE ESFERA: la espiral mapeada ahi se
embadurna hacia los polos. Se le saca el marco y se toma una ventana CORRIDA del
centro, donde las florecillas son parejas, y se la vuelve repetible por espejo.

Y LA MARIPOSA SE PARTE AL MEDIO. El ala es un cuadrilatero con la silueta en el
alfa, asi que hace falta UN ala: se busca el eje del cuerpo, se toma la mitad
derecha, y el alfa sale de la distancia al blanco con rampa —con un corte duro
el borde del ala queda dentado—.
"""
import base64, io, json, os
from PIL import Image, ImageFilter
import numpy as np

ENT = '/tmp/rez_barrio/assets'
SAL = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'puerta')
SAL = os.path.abspath(SAL)


def lin(a):
    return np.power(np.clip(a, 0, 1), 2.2)


# ── el petalo: se desenrolla ────────────────────────────────────────────────
def petalo(nom, lado=384, cal=88):
    im = Image.open(os.path.join(ENT, 'campo_%s-g1.png' % nom)).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    h, w, _ = a.shape
    # el fondo es el color que domina el BORDE, no "lo oscuro": el petalo
    # magenta esta sobre rojo oscuro y un umbral de brillo se lo lleva puesto
    borde = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    fondo = np.median(borde, axis=0)
    d = np.sqrt(((a - fondo[None, None, :]) ** 2).sum(axis=2))
    mask = d > 0.20
    # LA MASCARA SE CIERRA ANTES DE MEDIRLA, y sin esto el petalo magenta salia
    # una mancha horizontal: sus venas granate caen DENTRO del umbral del fondo
    # rojo oscuro, asi que la mascara queda agujereada, el tramo mas largo de
    # cada fila es un pedazo al azar y estirarlo al ancho entero embadurna. Una
    # dilatacion seguida de una erosion tapa los agujeros de las venas sin
    # agrandar el contorno ni aceptar una mota lejana.
    k = max(3, (min(h, w) // 90) * 2 + 1)
    mi = Image.fromarray((mask * 255).astype(np.uint8))
    mi = mi.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))
    mask = np.asarray(mi) > 127
    anchos = mask.sum(axis=1)
    if anchos.max() == 0:
        raise SystemExit('%s: no se encontro tejido' % nom)
    ok = anchos > anchos.max() * 0.26
    filas = np.where(ok)[0]
    y0, y1 = filas[0], filas[-1]
    out = np.zeros((lado, lado, 3), np.float32)
    for k in range(lado):
        # la fila 0 de la salida es la BASE del petalo, o sea uv.y = 0, que
        # three.js lee en el borde de ABAJO de la imagen: por eso se guarda al
        # final dada vuelta en vertical
        t = k / (lado - 1.0)
        y = int(round(y0 + t * (y1 - y0)))
        # EL TRAMO MAS LARGO SEGUIDO, y no del primer al ultimo pixel de tejido:
        # con `xs[0]..xs[-1]` una mota de sombra a un costado estira el tramo
        # hasta el borde del cuadro y arrastra fondo adentro. Medido, eso dejaba
        # una cuña negra en la base del petalo blanco.
        fila = mask[y]
        x0 = x1 = -1
        i = 0
        while i < w:
            if fila[i]:
                j = i
                while j + 1 < w and fila[j + 1]:
                    j += 1
                if j - i > x1 - x0:
                    x0, x1 = i, j
                i = j
            i += 1
        if x1 - x0 < 4:
            out[k] = out[k - 1] if k else 0
            continue
        # SE PROBO ENTRAR UN 3 % DEL BORDE PARA SACAR LO QUE LA DILATACION
        # CORRIO HACIA AFUERA, Y MIDIO PEOR: el fondo que le queda al petalo
        # magenta —5,1 %— no esta en los costados sino en el reborde de arriba,
        # donde la punta se corta y las filas se copian. Se saco: un ajuste que
        # empeora el numero no se deja puesto por parecer razonable.
        tramo = a[y, x0:x1 + 1]
        idx = np.linspace(0, len(tramo) - 1, lado)
        i0 = np.floor(idx).astype(int)
        i1 = np.minimum(i0 + 1, len(tramo) - 1)
        f = (idx - i0)[:, None]
        out[k] = tramo[i0] * (1 - f) + tramo[i1] * f
    # SIN VOLTEO, y el primer intento lo tenia. `out[0]` es la PUNTA —el barrido
    # arranca arriba, donde el petalo es ancho— y three.js lee la fila 0 de la
    # imagen en uv.y = 1, que es justo donde la geometria pone la punta. Dado
    # vuelta, el verde de la base del petalo salia en la punta: se vio en el
    # horneado, no en el codigo.
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    b = io.BytesIO(); img.save(b, 'WEBP', quality=cal)
    # CUANTO FONDO QUEDO, Y LA PRIMERA VERSION DE ESTA MEDICION MENTIA. Contaba
    # todo pixel cercano al color del fondo, y en el petalo magenta las venas
    # granate estan a menos de ese umbral del rojo oscuro de atras: devolvia
    # 13,55 % de "fondo" sobre una imagen que no tiene un solo pixel de fondo.
    # Lo que de verdad importa es el fondo QUE ENTRA DESDE EL BORDE, asi que se
    # rellena desde los cuatro cantos y se cuenta solo lo alcanzado.
    dd = np.sqrt(((out - fondo[None, None, :]) ** 2).sum(axis=2)) <= 0.20
    vis = np.zeros_like(dd)
    pila = []
    for i in range(lado):
        for (y, x) in ((0, i), (lado - 1, i), (i, 0), (i, lado - 1)):
            if dd[y, x] and not vis[y, x]:
                vis[y, x] = True; pila.append((y, x))
    while pila:
        y, x = pila.pop()
        for (ny, nx) in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < lado and 0 <= nx < lado and dd[ny, nx] and not vis[ny, nx]:
                vis[ny, nx] = True; pila.append((ny, nx))
    resto = float(vis.mean())
    return b.getvalue(), resto, [round(float(x), 4) for x in lin(out).reshape(-1, 3).mean(axis=0)]


# ── el disco de florecillas: ventana corrida y repetible por espejo ─────────
def disco(lado=256, cal=86):
    im = Image.open(os.path.join(ENT, 'campo_centro-g1.png')).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = a.mean(axis=2)
    # el marco negro: filas y columnas de los bordes que son casi negras
    fil = np.where(lum.mean(axis=1) > 0.10)[0]
    col = np.where(lum.mean(axis=0) > 0.10)[0]
    a = a[fil[0]:fil[-1] + 1, col[0]:col[-1] + 1]
    h, w, _ = a.shape
    # CORRIDA DEL CENTRO: ahi esta el ojo de la espiral, que es la unica parte
    # que NO es un campo parejo de florecillas
    s = int(min(h, w) * 0.42)
    y = int(h * 0.60) - s // 2
    x = int(w * 0.28)
    v = a[max(0, y):max(0, y) + s, x:x + s]
    img = Image.fromarray((np.clip(v, 0, 1) * 255).astype(np.uint8)).resize((lado, lado), Image.LANCZOS)
    b = io.BytesIO(); img.save(b, 'WEBP', quality=cal)
    return b.getvalue(), [round(float(x), 4) for x in lin(np.asarray(img).astype(np.float32) / 255).reshape(-1, 3).mean(axis=0)]


# ── la mariposa: la mitad derecha, con el alfa en rampa ─────────────────────
def mariposa(nom, lado=256, cal=88):
    im = Image.open(os.path.join(ENT, 'campo_%s-g1.png' % nom)).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = a.mean(axis=2)
    # el bicho es lo que NO es blanco
    mask = lum < 0.86
    if mask.sum() < 500:
        raise SystemExit('%s: no se encontro la mariposa' % nom)
    fil = np.where(mask.any(axis=1))[0]
    col = np.where(mask.any(axis=0))[0]
    # EL EJE DEL CUERPO SE MIDE POR SIMETRIA, y el primer intento —la columna
    # con mas tinta— estaba mal: en la morfo azul el borde oscuro del ala tiene
    # mas tinta que el cuerpo y el eje salio en x=614 con la imagen de 1024, o
    # sea que la mitad derecha se cortaba adentro del ala. Lo que no se puede
    # confundir es la SIMETRIA: se prueba cada columna y se toma la que hace que
    # la mascara y su espejo se parezcan mas.
    c0, c1 = col[0], col[-1]
    mm = mask[fil[0]:fil[-1] + 1]
    med = (c0 + c1) // 2
    mejor, eje = -1.0, med
    for x in range(med - (c1 - c0) // 6, med + (c1 - c0) // 6 + 1):
        r = min(x - c0, c1 - x)
        if r < 20:
            continue
        izq = mm[:, x - r:x]
        der = mm[:, x + 1:x + 1 + r][:, ::-1]
        n = min(izq.shape[1], der.shape[1])
        if n < 20:
            continue
        s2 = float((izq[:, -n:] == der[:, -n:]).mean())
        if s2 > mejor:
            mejor, eje = s2, x
    # la mitad derecha: del eje a la punta del ala
    sub = a[fil[0]:fil[-1] + 1, eje:c1 + 1]
    ml = mask[fil[0]:fil[-1] + 1, eje:c1 + 1]
    # el alfa por RAMPA sobre la distancia al blanco: con un corte duro el borde
    # del ala sale dentado y a cinco metros eso se lee a recorte mal hecho
    lu = sub.mean(axis=2)
    al = np.clip((0.93 - lu) / 0.09, 0, 1)
    al = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255.0
    rgba = np.dstack([sub, al])
    img = Image.fromarray((np.clip(rgba, 0, 1) * 255).astype(np.uint8), 'RGBA')
    # LA PUNTA DE LA CABEZA VA AL BORDE DE ABAJO. La geometria emite uv.y = v con
    # 0 = lado de la cabeza, y three.js lee uv.y = 0 en el borde de ABAJO de la
    # imagen; la foto trae la cabeza arriba, asi que se da vuelta.
    img = img.transpose(Image.FLIP_TOP_BOTTOM).resize((lado, lado), Image.LANCZOS)
    b = io.BytesIO(); img.save(b, 'WEBP', quality=cal)
    return b.getvalue(), float(al.mean()), int(eje)


def main():
    d = {}
    print('%-12s %8s %s' % ('textura', 'bytes', 'nota'))
    for n, clave in [('petal_a', 'petal'), ('petal_b', 'petal2')]:
        by, resto, lc = petalo(n)
        d[clave] = {'b64': base64.b64encode(by).decode(), 'lin': lc}
        print('%-12s %8d  fondo que quedo %.2f %%' % (n, len(by), resto * 100))
    by, lc = disco()
    d['center'] = {'b64': base64.b64encode(by).decode(), 'lin': lc}
    print('%-12s %8d' % ('centro', len(by)))
    d['bfly'] = []
    for n in ['bf_monarca', 'bf_azul', 'bf_cola']:
        by, am, eje = mariposa(n)
        d['bfly'].append(base64.b64encode(by).decode())
        print('%-12s %8d  alfa medio %.3f · eje del cuerpo en x=%d' % (n, len(by), am, eje))
    js = 'window.__PB_CAMPO = ' + json.dumps(d, separators=(',', ':')) + ';\n'
    io.open(os.path.join(SAL, 'campo.js'), 'w', encoding='utf8').write(js)
    tot = sum(len(base64.b64decode(x)) for x in d['bfly']) + sum(
        len(base64.b64decode(d[k]['b64'])) for k in ['petal', 'petal2', 'center'])
    print('\n6 texturas · %d KB de webp · assets/puerta/campo.js' % (tot // 1024))


main()
