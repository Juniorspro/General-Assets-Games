#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hornea los sonidos generados de CASA 13 y los pega en el juego.

    SND_DIR=/tmp/rez_casa13/snd python3 herramientas/casa13/hornear_snd.py

REUSA `hornear_voz.py` en vez de copiarle las funciones: dos horneados que hacen
lo mismo terminan divergiendo justo en el sitio donde hay que corregir un
defecto — ya paso con el horneado del frasco de LEMI.

DOS COSAS PROPIAS DE ESTOS CLIPS
· LAS CAMAS SE CIERRAN SOBRE SI MISMAS. Un ambiente cortado en seco y puesto en
  bucle da un golpe en cada vuelta, y ese golpe se escucha MAS que el ambiente.
  Se funde la cola sobre la cabeza, que es la misma correccion que la costura de
  una textura pero en una dimension.
· EL NIVEL SALE DE LA ESCALA QUE ESTE JUEGO YA TIENE MEDIDA: la lluvia esta en
  0,0207 de rms y la voz de las cintas en 0,1122. Una cama de cuarto tiene que
  colorear el sitio sin competir con la lluvia; un grito tiene que ser lo mas
  fuerte que suena. Y se mide DESPUES de codificar, porque el remuestreo y el
  codificador se llevan una parte que no se puede adivinar.
"""
import base64, io, os, sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
sys.path.insert(0, AQUI)
import hornear_voz as HV
from sonidos import PEDIDOS

CRUDO = os.environ.get('SND_DIR', '/tmp/rez_casa13/snd')
DEST = os.path.join(RAIZ, 'assets', 'casa13')
JUEGO = os.path.join(RAIZ, 'juegos-pc', 'Casa_Abandonada.html')

SR_CAMA, KB_CAMA = 12000, 16
SR_GOLPE, KB_GOLPE = 16000, 24
LARGO_CAMA = 7.5          # segundos de bucle, antes del fundido

# CUANTO DURA CADA GOLPE. El servidor devuelve lo que le parece —pedidos de 1 a
# 3 s volvieron de 3,3 a 6,3— y un interruptor de tres segundos y medio no es un
# interruptor: es tres segundos de aire pegados a un click. Aparte son bytes:
# sin topar, los diecinueve clips pesan mas que las doce voces de las cintas.
# Se corta con un fundido de 80 ms para que el corte no sea un chasquido.
TOPE = {
 'cr_resp':2.6,'cr_grune':1.9,'cr_lejos':2.6,'cr_arrastra':3.0,'cr_grito':2.2,
 'fa_susurro':2.6,'fa_vidrio':1.6,
 'ac_puerta':3.0,'ac_portazo':1.0,'ac_llave':0.40,'ac_papel':1.3,
 'ac_cinta':1.4,'ac_vidrio':1.6,'ac_persiana':1.3,
}

# nombre -> rms de destino, en la escala medida del juego
NIVEL = {
 'amb_casa':0.012,'amb_cocina':0.014,'amb_bano':0.015,'amb_sotano':0.016,
 'amb_trastero':0.013,
 'cr_resp':0.070,'cr_grune':0.080,'cr_lejos':0.038,'cr_arrastra':0.055,
 'cr_grito':0.160,
 'fa_susurro':0.042,'fa_vidrio':0.060,
 'ac_puerta':0.055,'ac_portazo':0.110,'ac_llave':0.060,'ac_papel':0.048,
 'ac_cinta':0.042,'ac_vidrio':0.070,'ac_persiana':0.095,
}


def cerrar_bucle(x, sr, fundido=0.9):
    """funde la cola sobre la cabeza: la vuelta deja de tener un corte"""
    n = int(sr * fundido)
    if len(x) < n * 3: return x
    cab, cola = x[:n].copy(), x[-n:]
    r = np.linspace(0, 1, n).astype(np.float32)
    y = x[:-n].copy()
    y[:n] = cab * r + cola * (1 - r)
    return y


def una(nom, tipo, obj):
    src = os.path.join(CRUDO, nom + '.mp3')
    if not os.path.exists(src): return None
    x, sr = HV.leer(src)
    if tipo == 'cama':
        x = HV.remuestrear(x, sr, SR_CAMA); s2, kb = SR_CAMA, KB_CAMA
        n = int(s2 * LARGO_CAMA)
        if len(x) > n: x = x[:n]
        x = cerrar_bucle(x, s2)
    else:
        x = HV.recortar(x, sr, 0.02)
        x = HV.remuestrear(x, sr, SR_GOLPE); s2, kb = SR_GOLPE, KB_GOLPE
        tp = TOPE.get(nom)
        if tp and len(x) > int(s2 * tp):
            n = int(s2 * tp); f = min(int(s2 * 0.08), n)
            x = x[:n].copy()
            x[-f:] *= np.linspace(1, 0, f).astype(np.float32)
    r = HV.rms(x)
    if r > 1e-6: x = x * (obj / r)
    dat = HV.codificar(x, s2, kb)
    r2 = HV.rms(HV.leer(HV._tmp(dat))[0])
    if r2 > 1e-6:                       # una correccion, medida sobre el MP3
        x = np.tanh(x * (obj / r2) * 1.2) / 1.2
        dat = HV.codificar(x, s2, kb)
        r2 = HV.rms(HV.leer(HV._tmp(dat))[0])
    return nom, len(x) / s2, r2, dat


def main():
    hechas, total = [], 0
    for nom, (tipo, _seg, _pr) in PEDIDOS.items():
        r = una(nom, tipo, NIVEL.get(nom, 0.05))
        if not r: print('%-13s FALTA' % nom); continue
        _, dur, rr, dat = r
        total += len(dat)
        hechas.append((nom, base64.b64encode(dat).decode()))
        print('%-13s %-6s %5.2f s  rms %.4f  %6d bytes'
              % (nom, tipo, dur, rr, len(dat)))
    print('total %d bytes (%.1f KB), en base64 %.1f KB'
          % (total, total / 1024, sum(len(b) for _, b in hechas) / 1024))
    if '--solo' in sys.argv: return
    os.makedirs(DEST, exist_ok=True)
    pegar(hechas)


def pegar(hechas):
    A, B = '/*<<UI_SND>>*/', '/*<</UI_SND>>*/'
    s = io.open(JUEGO, encoding='utf8').read()
    cuerpo = 'const SND={\n' + ',\n'.join("%s:'%s'" % (n, b) for n, b in hechas) + '};\n'
    if A not in s: raise SystemExit('faltan las marcas %s' % A)
    i, j = s.index(A), s.index(B) + len(B)
    io.open(JUEGO, 'w', encoding='utf8').write(s[:i] + A + '\n' + cuerpo + B + s[j:])
    print('pegado (%d bytes de HTML)' % len(io.open(JUEGO, encoding='utf8').read()))


if __name__ == '__main__':
    main()
