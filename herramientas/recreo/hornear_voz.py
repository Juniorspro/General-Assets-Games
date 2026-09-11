#!/usr/bin/env python3
"""Hornea las voces de Baldi para meterlas dentro del HTML.

Lo que hace y por que cada paso:

  1. SE QUEDA CON LA RAFAGA MAS FUERTE, no con "todo menos el silencio de los bordes".
     Recortar solo los extremos no alcanza y la medida lo muestra: el TTS devuelve DOS TOMAS de la
     misma linea con silencio en el medio —"Hey!" … "Hey there!"— y ademas mete un carraspeo antes.
     Recortando bordes, 'bien' quedaba en 2,28 s de los cuales 1,4 son nada, y el juego dispararia un
     ladrido que empieza medio segundo despues del golpe. Se busca el cuadro de maxima energia y se
     estira a los lados mientras siga por encima de un cuarto de ese pico, tolerando huecos cortos.
     Eso deja exactamente la utterance util, y de paso arregla el retardo: el grito tiene que sonar en
     el cuadro en que el profesor salta.
  2. PASA A MONO. Son voces de un personaje que esta en el centro de la pantalla; el estereo del TTS
     son dos canales identicos, o sea el doble de bytes para nada.
  3. BAJA A 16 kHz. La voz humana vive por debajo de los 8 kHz y el juego tiene puesto un filtro de
     baja calidad: 24 kHz es resolucion que nadie va a escuchar.
  4. NORMALIZA a un pico comun y despues aplica la ganancia que le toca a cada linea. El grito tiene
     que ser el sonido mas fuerte del juego y el "mm-hm" el mas bajo; salidos del TTS venian todos
     al mismo nivel.
  5. MP3 a 40 kbps mono, que para voz recortada da unos 5 KB por segundo.

Uso:  python3 herramientas/recreo/hornear_voz.py /tmp/voz
"""
import base64, io, json, os, sys, wave
import numpy as np
import lameenc

# nombre -> (archivo, ganancia). La ganancia es la mezcla del juego, no un ajuste tecnico.
# nombre -> (archivo, ganancia, tope en segundos)
LINEAS = [('hola',  'hola.wav',  0.85, 1.10),
          ('bien',  'bien.wav',  0.70, 0.85),
          ('mal',   'mal.wav',   0.80, 0.85),
          ('grito', 'grito.wav', 1.00, 1.70),
          ('risa',  'risa.wav',  0.75, 1.10)]
SR_SAL = 16000
KBPS   = 40
VENT   = 0.02          # ventana del envolvente, en segundos
FRAC   = 0.22          # se corta donde la energia baja de esta fraccion del pico
HUECO  = 0.12          # huecos mas cortos que esto no cortan la rafaga
COLA   = 0.03          # segundos de aire que se dejan a cada lado

def leer(p):
    w = wave.open(p, 'rb')
    n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    return x, sr

def recortar(x, sr, tope):
    """Se queda con la rafaga de MAS ENERGIA, no con la del pico mas alto.

    Por que la distincion importa, medido en estos archivos: 'bien.wav' termina con un chasquido de
    tres cuadros a 0,276 de amplitud, MAS ALTO que el "mm-hm" real que esta en el medio a 0,20. La
    regla del pico se llevaba el chasquido y devolvia un ladrido de 0,11 s cortado al medio. La
    energia total —la suma de los cuadrados, o sea amplitud POR duracion— no se deja enganar por un
    click: 5 cuadros de 0,2 suman 0,2 y 23 cuadros de 0,15 suman 0,52.
    """
    v = max(1, int(VENT * sr))
    m = len(x) // v
    if m < 3:
        return x
    env = np.sqrt((x[:m * v].reshape(m, v) ** 2).mean(axis=1))
    pico = float(env.max())
    if pico <= 0:
        return x
    activo = env > pico * FRAC
    hueco = max(1, int(HUECO / VENT))
    # se unen las rafagas separadas por huecos cortos: una vocal tiene bajones y no son cortes
    i = 0
    while i < m:
        if activo[i]:
            j = i + 1
            while j < m:
                k = j
                while k < min(m, j + hueco) and not activo[k]:
                    k += 1
                if k < min(m, j + hueco) and activo[k]:
                    activo[j:k] = True
                    j = k + 1
                else:
                    break
            i = j
        else:
            i += 1
    mejor, mejorE = None, -1.0
    i = 0
    while i < m:
        if not activo[i]:
            i += 1; continue
        j = i
        while j < m and activo[j]:
            j += 1
        E = float((env[i:j] ** 2).sum())
        if E > mejorE:
            mejorE, mejor = E, (i, j)
        i = j
    if mejor is None:
        return x
    c = int(COLA * sr)
    a = max(0, mejor[0] * v - c)
    b = min(len(x), mejor[1] * v + c)
    if (b - a) / sr > tope:                     # el tope evita que una rafaga larga se coma todo
        b = a + int(tope * sr)
    return x[a:b]


def remuestrear(x, de, a):
    if de == a:
        return x
    n = int(round(len(x) * a / de))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else '/tmp/voz'
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voz')
    os.makedirs(dst, exist_ok=True)
    salida, total = {}, 0
    for nombre, arch, gan, tope in LINEAS:
        p = os.path.join(src, arch)
        if not os.path.exists(p):
            print('falta', p, file=sys.stderr); continue
        x, sr = leer(p)
        antes = len(x) / sr
        x = recortar(x, sr, tope)
        x = remuestrear(x, sr, SR_SAL)
        pico = float(np.max(np.abs(x))) or 1.0
        x = x / pico * gan
        pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
        enc = lameenc.Encoder()
        enc.set_bit_rate(KBPS); enc.set_in_sample_rate(SR_SAL)
        enc.set_channels(1); enc.set_quality(2)
        mp3 = enc.encode(pcm.tobytes()) + enc.flush()
        with open(os.path.join(dst, nombre + '.mp3'), 'wb') as f:
            f.write(mp3)
        salida[nombre] = 'data:audio/mpeg;base64,' + base64.b64encode(mp3).decode('ascii')
        total += len(mp3)
        print('%-6s %.2f s -> %.2f s  %6d B  ganancia %.2f' %
              (nombre, antes, len(x) / SR_SAL, len(mp3), gan))
    with open(os.path.join(dst, 'voz.json'), 'w') as f:
        json.dump(salida, f)
    print('total mp3 %d B, base64 %d B' % (total, int(total * 4 / 3)))

if __name__ == '__main__':
    main()
