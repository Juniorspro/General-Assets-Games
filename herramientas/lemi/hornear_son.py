#!/usr/bin/env python3
"""Hornea los diez sonidos de LEMI a MP3 chicos y escribe partes/s.js.

    python3 herramientas/lemi/hornear_son.py

QUE HACE Y POR QUE:

- MONO Y 22 kHz. Vienen en 44,1 estereo. Un efecto de un segundo no gana nada
  con el doble de canales y el doble de muestras, y el archivo entra en el HTML.

- SE RECORTA POR LOS EXTREMOS. El modelo devuelve el efecto adentro de una
  ventana de duracion fija, asi que casi todos traen silencio adelante y atras:
  medido, el paso util dura 0,2 s dentro de un archivo de 1,02. Recortar es la
  mitad de los bytes.

- SE NIVELA POR RMS Y NO POR PICO. Nivelar por pico deja un chasquido corto
  igual de "fuerte" que un grito sostenido, porque el pico no sabe cuanto dura.
  Se lleva cada uno a un rms objetivo y RECIEN AHI se topa el pico, que es lo
  que evita que el limitador se coma la pegada.

- Y LOS OBJETIVOS NO SON TODOS IGUALES. El grito del camello tiene que ser lo
  mas fuerte del juego —es el unico momento en que el juego habla mas fuerte
  que el jugador, la misma regla que en Eco y en RECREO— y las dos camas de
  musica tienen que quedar POR DEBAJO de todo lo demas, porque son fondo.

- LA MUSICA SE CIERRA SOBRE SI MISMA. Se funde la cola sobre la cabeza, que es
  lo unico que hace que un bucle no pegue un golpe seco en cada vuelta.
"""
import av, io, os, sys, base64, json
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
ENTRADA = '/tmp/son'
SR = 22050

# nombre -> (archivo de origen, rms objetivo, tope de pico, segundos maximos)
PLAN = [
    ('junta',  's_junta.mp3',  0.075, 0.85, 1.1),
    ('bomba',  's_bomba2.mp3', 0.085, 0.90, 1.1),
    ('ok',     's_ok2.mp3',    0.070, 0.85, 1.0),
    ('mal',    's_mal.mp3',    0.065, 0.80, 0.9),
    ('tela',   's_tela3.mp3',  0.080, 0.90, 1.4),
    ('fuego',  's_fuego.mp3',  0.085, 0.92, 1.6),
    ('paso',   's_paso2.mp3',  0.045, 0.60, 0.6),
    # EL GRITO ES EL MAS FUERTE DEL JUEGO, y por eso va al doble de rms que el
    # resto: es el unico momento en que el juego levanta la voz.
    ('grito',  's_grito.mp3',  0.190, 0.99, 2.0),
    # las camas van MUY por debajo: son fondo, no efectos
    ('noche',  's_noche.m4a',  0.030, 0.45, 20.0),
    ('dia',    's_dia.m4a',    0.026, 0.40, 20.0),
]
BUCLE = {'noche', 'dia'}


def leer(p):
    c = av.open(p)
    s = c.streams.audio[0]
    res = av.AudioResampler(format='flt', layout='mono', rate=SR)
    trozos = []
    for fr in c.decode(s):
        for r in res.resample(fr):
            trozos.append(r.to_ndarray().reshape(-1).astype(np.float32))
    for r in res.resample(None):
        trozos.append(r.to_ndarray().reshape(-1).astype(np.float32))
    c.close()
    x = np.concatenate(trozos) if trozos else np.zeros(1, np.float32)
    if np.abs(x).max() > 1.5:
        x = x / 32768.0
    return x


def recorta(x, umbral=0.012):
    """Corta el silencio de los DOS extremos y nada mas.

    Se recorta por extremos y no por la rafaga de mas energia —que es lo que
    hace RECREO con los ladridos— porque aca el efecto es UNO solo: partirlo por
    rafagas cortaria un desgarro de tela justo por el medio."""
    a = np.abs(x)
    if a.max() < 1e-6:
        return x
    viv = np.nonzero(a > umbral * a.max())[0]
    if len(viv) == 0:
        return x
    i0 = max(0, viv[0] - int(SR * 0.01))
    i1 = min(len(x), viv[-1] + int(SR * 0.04))
    return x[i0:i1]


def cierra_bucle(x, cruce=1.5):
    """funde la cola sobre la cabeza: sin esto el bucle golpea en cada vuelta"""
    n = int(SR * cruce)
    if len(x) < n * 3:
        return x
    cab, cola, medio = x[:n], x[-n:], x[n:-n]
    r = np.linspace(0, 1, n, dtype=np.float32)
    return np.concatenate([cola * (1 - r) + cab * r, medio])


def blando(x, k):
    """Aplasta los picos con una curva suave antes de nivelar.

    Un efecto con un pico muy alto y poca energia —el fogonazo del encendedor,
    medido: pico 0,92 y rms 0,020— no se puede subir de volumen, porque el tope
    de pico lo baja todo de nuevo. Una `tanh` recorta la punta sin el chasquido
    de un recorte duro, y ahi el mismo clip llega al rms que le corresponde. Se
    aplica SOLO a los efectos: en una cama de fondo esto se oiria como que la
    musica respira sola."""
    if k <= 0:
        return x
    return np.tanh(x * (1 + k)) / np.tanh(1 + k)


def nivela(x, rms_obj, pico_tope):
    r = float(np.sqrt((x ** 2).mean()))
    if r > 1e-9:
        x = x * (rms_obj / r)
    p = float(np.abs(x).max())
    if p > pico_tope:
        x = x * (pico_tope / p)
    return np.clip(x, -1, 1)


def mp3(x, kbps):
    buf = io.BytesIO()
    salida = av.open(buf, 'w', format='mp3')
    st = salida.add_stream('mp3', rate=SR)
    st.bit_rate = kbps * 1000
    fr = av.AudioFrame.from_ndarray(
        (x * 32767).astype(np.int16).reshape(1, -1), format='s16', layout='mono')
    fr.rate = SR
    for pkt in st.encode(fr):
        salida.mux(pkt)
    for pkt in st.encode(None):
        salida.mux(pkt)
    salida.close()
    return buf.getvalue()


def main():
    piezas, total, informe = [], 0, []
    for nom, arch, rms_obj, pico, maxseg in PLAN:
        p = os.path.join(ENTRADA, arch)
        if not os.path.exists(p):
            print('  falta', arch); continue
        x = leer(p)
        crudo = len(x) / SR
        if nom in BUCLE:
            x = x[:int(SR * maxseg)]
            x = cierra_bucle(x)
        else:
            x = recorta(x)[:int(SR * maxseg)]
        if nom not in BUCLE:
            x = blando(x, 2.2)
        x = nivela(x, rms_obj, pico)
        by = mp3(x, 24 if nom in BUCLE else 48)
        b64 = base64.b64encode(by).decode('ascii')
        piezas.append("  %s: '%s'" % (nom, b64))
        total += len(b64)
        informe.append((nom, crudo, len(x) / SR, len(by),
                        float(np.sqrt((x ** 2).mean())), float(np.abs(x).max())))

    js = ("\n/* ══════════════════════════ LOS SONIDOS ══════════════════════════\n"
          "   Diez clips generados con Higgsfield (mirelo para los efectos, sonilo\n"
          "   para las dos camas), recortados, nivelados por RMS y horneados a MP3\n"
          "   mono de 22 kHz. Se generan con `herramientas/lemi/hornear_son.py`.\n"
          "   Van en base64 adentro del HTML porque este juego es UN archivo. */\n"
          "const SON_B64 = {\n" + ",\n".join(piezas) + "\n};\n")
    io.open(os.path.join(AQUI, 'partes', 's.js'), 'w', encoding='utf8').write(js)

    print('%-8s %8s %8s %9s %8s %7s' % ('clip', 'crudo', 'usado', 'bytes', 'rms', 'pico'))
    for n, c, u, b, r, pk in informe:
        print('%-8s %7.2fs %7.2fs %8d %8.4f %7.3f' % (n, c, u, b, r, pk))
    print('total en base64: %d KB' % (total // 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
