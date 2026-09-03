#!/usr/bin/env python3
"""Hornea las texturas de foto de LA CASA y calcula el tinte que las compensa.

    TEX_DIR=/tmp/rez_casa/assets python3 herramientas/casa/hornear_tex.py

QUE HACE Y POR QUE CADA COSA:

1. ACHICA. El juego dibuja a 1,5 de pixel ratio, de noche, y encima le pasa
   grano, croma arrastrado y lineas de barrido. Una foto de 1024 px es detalle
   que el post destruye antes de que llegue al ojo — y son bytes dentro de un
   HTML autocontenido. Las dos que se miran de cerca van a 512 y el resto a 256.

2. NO COSE LOS BORDES. Al modelo se le pidieron texturas "sin costura" y ninguna
   lo es de verdad: medido, el salto en el borde va de 1,2 a 2,4 veces la
   variacion interna. Coserlas a mano ensucia el centro, que es lo que mas se
   mira. Se resuelve del otro lado con MirroredRepeatWrapping: la copia de al
   lado va dada vuelta, asi que los dos bordes que se tocan son EL MISMO borde y
   la costura no puede existir. Lo que se paga es que el patron queda simetrico
   cada dos repeticiones — y acá no se ve, porque lo unico que ilumina es el
   cono de una linterna y nunca hay dos repeticiones en el cuadro a la vez.

3. CALCULA EL TINTE. three.js multiplica map x vertexColor x material.color, o
   sea que el color del material es un TINTE SOBRE LA IMAGEN. La pared dibujada
   promedia 0,078 en lineal y la foto 0,353: dejando el tinte donde estaba, la
   casa entera se iba lavada. El tinte nuevo sale de dividir EN LINEAL el
   promedio viejo por el nuevo, canal por canal, y multiplicar el tinte viejo
   por eso. El producto queda igual por construccion, que es la prueba de que
   compensa y no de que quedo lindo.
"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image

DIR = os.environ.get('TEX_DIR', '/tmp/rez_casa/assets')
SAL = os.environ.get('SALIDA', '/tmp/casa_tex.json')

# nombre -> (archivo, lado en px)
# TODAS A 256, Y EL NUMERO SALE DE UNA MEDICION, NO DE UNA CORAZONADA.
# Se probo con madera y pared a 512 y se midio el detalle —energia de alta
# frecuencia sobre la zona iluminada, con la imagen reducida para que las lineas
# de barrido del post no taparan el material— contra las texturas dibujadas:
#     reducido /1  foto/canvas 1,002
#     reducido /2              1,020
#     reducido /3              1,033
#     reducido /4              0,976
# o sea NADA en todas las escalas, con la dispersion mas grande que el efecto.
# Si 512 no se distingue de 256, 512 son bytes regalados: la casa se ve por el
# cono de una linterna y el post le pasa croma arrastrado, grano y lineas
# encima. Lo que la foto SI aporta es estructura —la junta entre dos tablas, la
# veta irregular— y eso sobrevive a 256.
TEX = {
    'madera':    ('tex-madera-g1.png',    256),
    'pared':     ('tex-pared-g1.png',     256),
    'cemento':   ('tex-cemento-g1.png',   256),
    'machimbre': ('tex-machimbre-g1.png', 256),
    # la segunda tanda: todo lo que seguia dibujado por codigo o en color plano
    'tapiz':     ('tapiz.png',     256),
    'revest':    ('revest.png',    256),
    'pasto':     ('pasto.png',     256),
    'corteza':   ('corteza.png',   256),
    'mueble':    ('mueble.png',    256),
    'maderaosc': ('maderaosc.png', 256),
    'tela':      ('tela.png',      256),
    'loza':      ('loza.png',      256),
    'hierro':    ('hierro.png',    256),
    'hoja':      ('hoja.png',      256),
}

# lo medido DENTRO del juego con __casa.promedio(): promedio en lineal del
# lienzo que cada material usa hoy, y el tinte con el que esta calibrado.
VIEJO = {
    'wall':  ([0.07765, 0.06483, 0.04400], '8f8a7c', 'tapiz'),
    'ceil':  ([0.07765, 0.06483, 0.04400], '55503f', 'pared'),
    'floor': ([0.02582, 0.01546, 0.00815], '9c917f', 'madera'),
    'wood':  ([0.02582, 0.01546, 0.00815], '7d6c58', 'mueble'),
    'bark':  ([0.02582, 0.01546, 0.00815], '3a3128', 'corteza'),
    'conc':  ([0.02318, 0.02377, 0.02064], '93938d', 'cemento'),
    'suelo': ([0.02318, 0.02377, 0.02064], '4a5040', 'pasto'),
    'machi': ([0.02991, 0.01707, 0.00888], '8d8271', 'machimbre'),
    'machiD':([0.02991, 0.01707, 0.00888], '5d5445', 'machimbre'),
    # `side` era el UNICO material con mapa que seguia en lienzo dibujado: su
    # tinte nunca se recompenso, asi que el promedio medido hoy con
    # __casa.promedio() ES el del lienzo.
    'side':  ([0.03199, 0.02786, 0.01965], '8d8d84', 'revest'),
}

# ══════════ SEGUNDA TANDA: EL NIVEL LO LLEVA LA IMAGEN ══════════
#
# Las cuatro primeras texturas van por compensacion —el tinte del material
# cancela la diferencia entre el lienzo viejo y la foto, asi que el producto
# queda igual— y ESO NO SE TOCA: estan calibradas y se ven bien.
#
# Las diez nuevas van al revés y por dos razones medidas:
#
# 1. LA COMPENSACION NO ALCANZA CUANDO EL MATERIAL NO TENIA MAPA. Un color de
#    material no pasa de blanco, y medido: `dark` pedia razon 37 y `leaf` 28.
#    Topadas, la superficie caia un 82 % y un 69 % — el televisor, las mesas y
#    las copas de los arboles se iban a negro.
#
# 2. Y COMPENSAR AL 100 % TIRA A LA BASURA EL COLOR DE LA FOTO. La madera de
#    mueble promedia 0,319 de rojo contra 0,040 de azul —ocho a uno— asi que el
#    tinte que la cancela es un gris azulado (232527) y el barniz calido, que es
#    todo el motivo de haber pedido la foto, desaparece.
#
# Asi que el NIVEL lo lleva la imagen: se la escala en lineal hasta que su
# promedio de el objetivo, y el tinte del material queda en BLANCO (razon
# 1/color_viejo). El tono sale de la foto y el brillo de esta tabla, que es
# donde se puede razonar sobre el balance de la casa.
#
# Los objetivos: el de `wall` es EXACTAMENTE el de hoy (0,3472 x 0,122 = 0,0424)
# para que cambiar revoque por papel tapiz no mueva el brillo de la casa. Los
# cinco que iban en color plano bajan a proposito: sin mapa se veian su propio
# color usado como reflectancia LINEAL —0,561 la tela y 0,667 la loza, mas
# brillante que una hoja de papel— y de ahi que el jugador los vea blancos.
OBJETIVO = {
    'tapiz':     [0.0430, 0.0398, 0.0330],   # pared interior: el de hoy
    'revest':    [0.0210, 0.0195, 0.0160],   # revestimiento exterior
    'pasto':     [0.0092, 0.0110, 0.0055],   # el suelo de afuera, verde apagado
    'corteza':   [0.0125, 0.0112, 0.0090],   # troncos
    'mueble':    [0.0195, 0.0140, 0.0085],   # madera de mueble, calida
    'maderaosc': [0.0600, 0.0540, 0.0460],   # televisor, mesas, PANELES DE PUERTA
    # ESTOS TRES BAJARON DESPUES DE MIRAR, y el motivo esta medido: con la tela
    # en 0,232 la cama salia QUEMADA —maximo 255 y el 2,47 % del cuadro por
    # encima de 240— y el detalle de los pliegues, que es todo el punto de haber
    # puesto la foto, desaparecia en blanco. Y no era el halo del haz: apagandolo
    # el maximo seguia en 250 y el brillo medio se movia 1,4 niveles, o sea que
    # lo que se lava es el albedo de la propia sabana contra una linterna a metro
    # y medio. Una sabana sucia en una casa abandonada no refleja como una nueva.
    'tela':      [0.1390, 0.1340, 0.1210],   # sabanas y colchon
    'loza':      [0.1900, 0.1790, 0.1530],   # bañera, inodoro, lavabo
    'hierro':    [0.1160, 0.1120, 0.0900],   # heladera, caldera, latas
    'hoja':      [0.0360, 0.0660, 0.0310],   # copas de los arboles
}
# a que material va cada una de las nuevas
DESTINO = {
    'tapiz': 'wall', 'revest': 'side', 'pasto': 'suelo', 'corteza': 'bark',
    'mueble': 'wood', 'maderaosc': 'dark', 'tela': 'cloth', 'loza': 'cera',
    'hierro': 'metal', 'hoja': 'leaf',
}
# el color literal que cada material tiene escrito en el juego: la razon que se
# guarda es 1/ese color, asi que en el juego el tinte termina en blanco
COLOR = {
    'wall': '8f8a7c', 'side': '8d8d84', 'suelo': '4a5040', 'bark': '3a3128',
    'wood': '7d6c58', 'dark': '2b2822', 'cloth': '8f8a79', 'cera': 'aaaaa0',
    'metal': '6d7175', 'leaf': '212b19',
}

# ══════════ LOS QUE NO TENIAN MAPA NINGUNO ══════════
# Estos iban en COLOR PLANO —sin una sola textura— y son justo los que el
# jugador ve como "blancos y planos": las sabanas y el colchon (`cloth`), la
# bañera y el inodoro (`cera`), la heladera y la caldera (`metal`), el televisor
# y las mesas (`dark`) y las copas de los arboles (`leaf`).
#
# Sin mapa, el material se ve exactamente su `color`, asi que para conservar el
# brillo la razon es 1/promedio_de_la_foto. Pero un color de material no pasa de
# blanco: donde la foto es mas clara que el color de antes, la razon se topa y
# la superficie queda MAS OSCURA que hoy. En loza y en tela eso es justo lo que
# se pidio —dejar de ser blancas— asi que se deja y se informa, no se disimula.
SIN_MAPA = {
    'cloth': ('8f8a79', 'tela'),
    'cera':  ('aaaaa0', 'loza'),
    'metal': ('6d7175', 'hierro'),
    'dark':  ('2b2822', 'maderaosc'),
    'leaf':  ('212b19', 'hoja'),
}

# repeticion para los que no tenian mapa: no hay una vieja de la que copiarla, y
# sale del TAMAÑO REAL de la pieza. Un colchon mide 1,9 m y la foto de la sabana
# cubre unos 0,9 m, asi que dos repeticiones; una bañera 1,6 m con loza de 0,5 m,
# tres. Sin esta cuenta la tela sale con pliegues de dos metros.
# OJO CON LA CLAVE: va por TEXTURA y no por material. Estuvo por material y el
# armador la buscaba por textura, asi que no coincidia NUNCA y las cinco salian
# en 1x1 — la sabana estirada de punta a punta del colchon, con pliegues de dos
# metros. No fallaba nada: simplemente no se aplicaba.
#
# Y el numero es `lado_de_la_cara / metros_que_cubre_la_foto`. En una BoxGeometry
# la UV de cada cara va de 0 a 1 sin importar cuanto mida, asi que un material
# compartido entre una bañera de 1,6 m y una taza de 10 cm no puede tener un
# valor correcto para las dos: se elige el de la pieza que mas se mira.
REP = {
    'tela':      [2.0, 2.0],   # el colchon, 1,9 m, con sabana de ~0,9
    'loza':      [2.5, 2.5],   # la bañera, 1,6 m, con esmalte de ~0,6
    'hierro':    [1.5, 1.5],   # la heladera, 0,7 m de frente
    'maderaosc': [2.2, 2.2],   # entre el televisor de 0,6 y la mesada de 4,5
    'hoja':      [1.0, 1.0],   # las copas
}


def a_lineal(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def a_srgb(l):
    l = np.clip(np.asarray(l, dtype=np.float64), 0.0, 1.0)
    s = np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055)
    return np.clip(np.round(s * 255), 0, 255).astype(int)


def hex_a_lin(h):
    return a_lineal([int(h[i:i + 2], 16) for i in (0, 2, 4)])


def main():
    if not os.path.isdir(DIR):
        print('no existe %s' % DIR); return 1
    salida = {'tex': {}, 'tintes': {}}
    total = 0
    for nom, (arch, lado) in TEX.items():
        p = os.path.join(DIR, arch)
        if not os.path.exists(p):
            print('falta %s' % p); return 1
        im = Image.open(p).convert('RGB')
        im = im.resize((lado, lado), Image.LANCZOS)
        lin = a_lineal(np.asarray(im).astype(np.float64))
        prom = lin.reshape(-1, 3).mean(axis=0)
        if nom in OBJETIVO:
            # EL NIVEL SE ESCALA EN LINEAL, no en sRGB: escalar el byte cambia
            # el contraste ademas del brillo, y en un albedo eso se ve.
            k = np.asarray(OBJETIVO[nom]) / np.maximum(prom, 1e-6)
            lin = np.clip(lin * k, 0.0, 1.0)
            im = Image.fromarray(a_srgb(lin).astype('uint8'), 'RGB')
            prom = a_lineal(np.asarray(im).astype(np.float64)).reshape(-1, 3).mean(axis=0)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=82, method=6)
        b = buf.getvalue()
        total += len(b)
        salida['tex'][nom] = {
            'b64': base64.b64encode(b).decode(),
            'px': lado, 'bytes': len(b), 'prom': [round(x, 5) for x in prom],
        }
        print('%-10s %4d px  %6.1f KB  promedio lineal %.4f %.4f %.4f'
              % (nom, lado, len(b) / 1024, *prom))

    print()
    for mat, (viejo_prom, viejo_hex, tex) in VIEJO.items():
        if tex in OBJETIVO: continue          # esas van por el esquema nuevo
        nuevo = np.asarray(salida['tex'][tex]['prom'])
        razon = np.asarray(viejo_prom) / np.maximum(nuevo, 1e-6)
        nl = hex_a_lin(viejo_hex) * razon
        # SI EL TINTE SE PASA DE 1 NO SE PUEDE COMPENSAR DEL TODO: un color de
        # material no va mas alla de blanco. Se avisa en vez de mentir.
        tope = float(nl.max())
        nl_c = np.clip(nl, 0, 1)
        r, g, b = a_srgb(nl_c)
        nh = '%02x%02x%02x' % (r, g, b)
        prod_v = hex_a_lin(viejo_hex) * np.asarray(viejo_prom)
        prod_n = nl_c * nuevo
        err = float(np.abs(prod_v - prod_n).max())
        salida['tintes'][mat] = nh
        print('%-7s %s -> %s   razon %.3f %.3f %.3f   error del producto %.2e%s'
              % (mat, viejo_hex, nh, *razon, err, '  OJO: topado' if tope > 1 else ''))

    print()
    salida['razones'] = {}
    salida['rep'] = REP
    for mat, (viejo_prom, viejo_hex, tex) in VIEJO.items():
        if tex in OBJETIVO: continue
        nuevo = np.asarray(salida['tex'][tex]['prom'])
        salida['razones'][tex] = [round(x, 5) for x in
                                  np.asarray(viejo_prom) / np.maximum(nuevo, 1e-6)]
    for tex, mat in DESTINO.items():
        hexv = COLOR[mat]
        c = np.asarray([int(hexv[i:i + 2], 16) for i in (0, 2, 4)]) / 255.0
        razon = 1.0 / np.maximum(c, 1e-6)          # el tinte queda en blanco
        salida['razones'][tex] = [round(x, 5) for x in razon]
        nuevo = np.asarray(salida['tex'][tex]['prom'])
        obj = np.asarray(OBJETIVO[tex])
        err = float(np.abs(nuevo - obj).max())
        # EL TINTE VIEJO VA CRUDO (hex/255) Y NO POR GAMMA: es lo que hace r128,
        # y pasandolo por a_lineal la referencia salia hasta diez veces mas baja
        # —bark daba 0,0006 en vez de 0,0058— y los porcentajes eran fantasia.
        crudo = lambda h: np.asarray([int(h[i:i+2],16) for i in (0,2,4)])/255.0
        antes = float((np.asarray(VIEJO[mat][0]) * crudo(VIEJO[mat][1])).mean()) \
                if mat in VIEJO else float(c.mean())
        print('%-10s -> %-6s  objetivo %.4f  logrado %.4f  (error %.1e)   brillo visto %.4f -> %.4f  (%+.0f%%)'
              % (tex, mat, obj.mean(), nuevo.mean(), err, antes, nuevo.mean(),
                 100 * (nuevo.mean() / max(antes, 1e-9) - 1)))

    io.open(SAL, 'w').write(json.dumps(salida))
    print('\ntotal %.1f KB en webp  ·  %.1f KB en base64  ->  %s'
          % (total / 1024, total * 4 / 3 / 1024, SAL))
    return 0


if __name__ == '__main__':
    sys.exit(main())
