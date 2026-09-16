#!/usr/bin/env python3
"""Hornea los 57 dialogos hablados (19 lineas x 3 idiomas) mas los dos sonidos no verbales.

MISMO RECORTE QUE hornear_voz.py y por la misma razon —se queda con la rafaga de mas ENERGIA, no con
la del pico mas alto— pero con dos diferencias que salen de que aca son FRASES y no ladridos:

  1. NO SE CORTA A UNA RAFAGA. Una frase tiene pausas entre palabras que superan cualquier hueco
     razonable, asi que cortar por rafagas partiria la frase al medio. Se recortan los EXTREMOS y se
     deja el interior intacto.
  2. EL PESO MANDA. Cincuenta y siete frases a 40 kbps serian 750 KB sobre un archivo que ya pesa
     900. A 20 kbps mono y 16 kHz una frase de dos segundos y medio son 6 KB, y para una voz de
     personaje detras de un filtro de baja calidad eso alcanza. El juego ya se ve pixelado a
     proposito; la voz puede estar a tono.

Uso:  python3 herramientas/recreo/hornear_dialogo.py /tmp/dial/wav /tmp/voz
"""
import base64, io, json, os, sys, wave
import numpy as np
import lameenc

CLAVES = ['d1','d2','d3','d4','d5','d6','d7','d8','d9','dAula','dSale','dSale2',
          'dBichos','dTizas','dCasill','dBichosFin','dBien','dMal','dFin']
IDIOMAS = ['es','en','pt']
NO_VERBAL = [('grito','grito.wav',1.00,1.70), ('risa','risa.wav',0.75,1.10)]
SR_SAL, KBPS_FRASE, KBPS_LADRIDO = 16000, 20, 40
UMBRAL = 0.018        # fraccion del pico por debajo de la cual es silencio
COLA   = 0.04

def leer(p):
    w = wave.open(p, 'rb')
    n, ch, sr = w.getnframes(), w.getnchannels(), w.getframerate()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    return x, sr

def recortar_bordes(x, sr):
    """Solo los extremos: el interior de una frase tiene pausas que NO son silencio de sobra."""
    v = max(1, int(0.02 * sr))
    m = len(x) // v
    if m < 3:
        return x
    env = np.sqrt((x[:m * v].reshape(m, v) ** 2).mean(axis=1))
    pico = float(env.max())
    if pico <= 0:
        return x
    act = np.where(env > pico * UMBRAL)[0]
    if not len(act):
        return x
    c = int(COLA * sr)
    a = max(0, act[0] * v - c)
    b = min(len(x), (act[-1] + 1) * v + c)
    return x[a:b]

def remuestrear(x, de, a):
    if de == a:
        return x
    n = int(round(len(x) * a / de))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)

def a_mp3(x, kbps):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    e = lameenc.Encoder()
    e.set_bit_rate(kbps); e.set_in_sample_rate(SR_SAL)
    e.set_channels(1); e.set_quality(2)
    return e.encode(pcm.tobytes()) + e.flush()

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else '/tmp/dial/wav'
    ladridos = sys.argv[2] if len(sys.argv) > 2 else '/tmp/voz'
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voz')
    os.makedirs(dst, exist_ok=True)
    salida, total, faltan = {}, 0, []
    for ii, idi in enumerate(IDIOMAS):
        for ki, k in enumerate(CLAVES):
            p = os.path.join(src, '%d.wav' % (ii * 100 + ki))
            if not os.path.exists(p):
                faltan.append((idi, k)); continue
            x, sr = leer(p)
            antes = len(x) / sr
            x = remuestrear(recortar_bordes(x, sr), sr, SR_SAL)
            pico = float(np.max(np.abs(x))) or 1.0
            x = x / pico * 0.88
            mp3 = a_mp3(x, KBPS_FRASE)
            salida[idi + ':' + k] = 'data:audio/mpeg;base64,' + base64.b64encode(mp3).decode('ascii')
            total += len(mp3)
            print('%s %-11s %.2f -> %.2f s  %6d B' % (idi, k, antes, len(x) / SR_SAL, len(mp3)))
    # los dos no verbales conservan su recorte por rafaga y su bitrate
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import hornear_voz as hv
    for nombre, arch, gan, tope in NO_VERBAL:
        p = os.path.join(ladridos, arch)
        if not os.path.exists(p):
            faltan.append(('--', nombre)); continue
        x, sr = hv.leer(p)
        x = hv.remuestrear(hv.recortar(x, sr, tope), sr, SR_SAL)
        pico = float(np.max(np.abs(x))) or 1.0
        mp3 = a_mp3(x / pico * gan, KBPS_LADRIDO)
        salida[nombre] = 'data:audio/mpeg;base64,' + base64.b64encode(mp3).decode('ascii')
        total += len(mp3)
        print('-- %-11s %.2f s  %6d B' % (nombre, len(x) / SR_SAL, len(mp3)))
    with open(os.path.join(dst, 'voz.json'), 'w') as f:
        json.dump(salida, f)
    print('%d clips, mp3 %d B, base64 %d B' % (len(salida), total, int(total * 4 / 3)))
    if faltan:
        print('FALTAN:', faltan, file=sys.stderr)

if __name__ == '__main__':
    main()
