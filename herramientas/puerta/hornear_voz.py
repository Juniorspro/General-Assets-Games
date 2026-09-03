#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hornea la voz del jugador a `assets/puerta/voz.js`: dos frases x tres idiomas.

SE QUEDA CON LA PRIMERA FRASE Y TIRA EL RESTO, y esto es el hallazgo de la
vuelta: el generador devolvio de 31 a 41 SEGUNDOS para una linea de una frase.
Medido con la fraccion de marcos casi mudos —9 a 25 %, que es la firma de alguien
hablando y no de una textura continua— es habla de verdad, pero el modelo siguio
hablando despues de la linea. Asi que no se recortan solo los extremos: se corta en un
SILENCIO DE VERDAD, y se elige el silencio mas cercano a lo que la frase TIENE
que durar.

POR QUE NO ALCANZA CON "LA PRIMERA PAUSA LARGA": probado, corta en la coma. La
linea del despertar en castellano son dos oraciones y la primera pausa cae a los
tres segundos, o sea a mitad de la frase. Y en dos de los seis no hay ninguna
pausa que cumpla, asi que quedaban enteros con sus treinta segundos.

LO QUE SI SIRVE ES LA CUENTA DE SILABAS del texto que se pidio —que lo tenemos,
esta en `pedir_voz.py`— a 5,4 silabas por segundo mas medio segundo de aire: eso
da cuanto tiene que durar la linea, y de todos los silencios del clip se toma el
que cae mas cerca de ese numero. Asi el corte siempre cae en un silencio real y
no en un punto calculado, que es lo que evita cortar una vocal al medio.

Y NO SE CORTA POR RAFAGAS, al reves que los gritos: una frase tiene pausas entre
palabras y cortar por rafagas la partiria al medio. Es la misma distincion que en
RECREO entre los dialogos y los ladridos.

EL NIVEL: rms 0,125, o sea entre un monstruo (0,150) y una accion (0,110). El
jugador se habla a si mismo —no grita— pero es la unica voz del juego y tiene que
quedar por encima de la cama (0,055). Medido sobre el MP3 ya escrito, con el
mismo lazo cerrado que el resto del audio de este juego.

Y A 24 kbps MONO 22 kHz: una frase de cinco segundos son 15 KB, y detras del
filtro de baja calidad del juego eso alcanza de sobra.
"""
import base64, glob, io, json, math, os, re, sys
import av

FUENTE = sys.argv[1] if len(sys.argv) > 1 else '/tmp/rez_pb/assets'
SALIDA = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'puerta', 'voz.js')
SR = 22050
RMS = 0.125
PICO = 0.94


def leer(p):
    with av.open(p) as c:
        rs = av.AudioResampler(format='s16', layout='mono', rate=SR)
        m = []
        for f in c.decode(audio=0):
            for g in rs.resample(f):
                m.extend(g.to_ndarray()[0].tolist())
    return [x / 32768.0 for x in m]


# las seis frases que se pidieron, para poder contarles las silabas
TEXTO = {
 'v_desp_es': 'No sé dónde estoy ni quién soy, pero ya no importa. Solo quiero salir de aquí.',
 'v_desp_en': "I don't know where I am or who I am, but it no longer matters. I just want to get out of here.",
 'v_desp_pt': 'Não sei onde estou nem quem sou, mas já não importa. Só quero sair daqui.',
 'v_fin_es':  'Mi alma encontró el descanso que siempre necesité.',
 'v_fin_en':  'My soul found the rest it always needed.',
 'v_fin_pt':  'Minha alma encontrou o descanso que sempre precisei.',
}
VOCALES = 'aeiouáéíóúàâãêôõäëïöüy'


def silabas(t):
    """grupos de vocales seguidas: una aproximacion suficiente para las tres lenguas"""
    n, dentro = 0, False
    for c in t.lower():
        v = c in VOCALES
        if v and not dentro: n += 1
        dentro = v
    return n


def esperado(nom):
    sil = silabas(TEXTO.get(nom, ''))
    return sil / 5.4 + 0.5 if sil else None


def silencios(x, hueco=0.30):
    """donde termina cada tramo de voz seguido de un silencio de al menos `hueco`"""
    g = math.sqrt(sum(v * v for v in x) / max(1, len(x))) or 1e-9
    w = int(SR * 0.03)
    umb = g * 0.10
    fines, mudos, ini = [], 0, None
    for s0 in range(0, len(x) - w, w):
        e = math.sqrt(sum(v * v for v in x[s0:s0 + w]) / w)
        if e < umb:
            if ini is None: ini = s0
            mudos += 1
        else:
            if ini is not None and mudos * 0.03 >= hueco: fines.append(ini + w)
            ini, mudos = None, 0
    if ini is not None and mudos * 0.03 >= hueco: fines.append(ini + w)
    return fines


def primera_frase(x, nom):
    obj = esperado(nom)
    if not obj: return x
    cand = [f for f in silencios(x) if f / float(SR) > obj * 0.55]
    if not cand: return x
    # el silencio mas cercano a lo que la frase tiene que durar
    f = min(cand, key=lambda k: abs(k / float(SR) - obj))
    return x[:f]


def recorta(x, umbral=0.010):
    n = len(x)
    i = 0
    while i < n and abs(x[i]) < umbral: i += 1
    j = n - 1
    while j > i and abs(x[j]) < umbral: j -= 1
    if j - i < SR // 4: return x
    pad = int(SR * 0.03)
    y = x[max(0, i - pad):min(n, j + pad)]
    # rampa corta en las dos puntas: un corte en seco en una vocal da un click
    r = int(SR * 0.012)
    for k in range(min(r, len(y))): y[k] *= k / float(r)
    for k in range(min(r, len(y))): y[len(y) - 1 - k] *= k / float(r)
    return y


def nivela(x, objetivo):
    if not x: return x
    mejor, mejor_r = None, -1
    for drive in (1.2, 1.8, 2.6, 4.0, 6.0):
        y = [math.tanh(v * drive) / math.tanh(drive) for v in x]
        r = math.sqrt(sum(v * v for v in y) / len(y)) or 1e-9
        g = objetivo / r
        p = max(abs(v) for v in y) * g
        if p > PICO: g *= PICO / p
        z = [max(-1.0, min(1.0, v * g)) for v in y]
        rf = math.sqrt(sum(v * v for v in z) / len(z))
        if rf > mejor_r: mejor, mejor_r = z, rf
        if rf >= objetivo * 0.92: return z
    return mejor


def escribe_mp3(x, kbps=24):
    import numpy as np
    buf = io.BytesIO()
    with av.open(buf, mode='w', format='mp3') as c:
        st = c.add_stream('libmp3lame', rate=SR)
        st.bit_rate = kbps * 1000
        arr = (np.array(x, dtype='float32') * 32767).astype('int16').reshape(1, -1)
        fr = av.AudioFrame.from_ndarray(arr, format='s16', layout='mono')
        fr.sample_rate = SR
        for pk in st.encode(fr): c.mux(pk)
        for pk in st.encode(None): c.mux(pk)
    return buf.getvalue()


def mide(b, nom):
    f = io.BytesIO(b); f.name = nom + '.mp3'
    with av.open(f) as c:
        rs = av.AudioResampler(format='s16', layout='mono', rate=SR)
        m = []
        for fr in c.decode(audio=0):
            for g in rs.resample(fr): m.extend(g.to_ndarray()[0].tolist())
    z = [v / 32768.0 for v in m]
    if not z: return 0.0, 0.0, 0.0
    return (math.sqrt(sum(v * v for v in z) / len(z)),
            max(abs(v) for v in z), len(z) / float(SR))


def main():
    fs = sorted(glob.glob(os.path.join(FUENTE, 'pbv_*.mp3')))
    if not fs:
        print('no hay nada en', FUENTE); return 1
    out, info = {}, []
    for p in fs:
        n = re.sub(r'^pbv_|(-g\d+)?\.mp3$', '', os.path.basename(p))
        x = recorta(primera_frase(leer(p), n))
        x = nivela(x, RMS)
        b = escribe_mp3(x)
        for _ in range(3):
            r, pk, _d = mide(b, n)
            if r <= 0 or abs(r - RMS) / RMS < 0.06: break
            f = min(RMS / r, PICO / max(pk, 1e-6))
            if abs(f - 1) < 0.02: break
            x = [max(-1.0, min(1.0, v * f)) for v in x]
            b = escribe_mp3(x)
        r, pk, d = mide(b, n)
        out[n] = base64.b64encode(b).decode()
        info.append((n, d, len(b), r, pk))
    js = 'window.__PB_VOZ = ' + json.dumps(out, separators=(',', ':')) + ';\n'
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    io.open(SALIDA, 'w', encoding='utf8').write(js)
    for n, d, b, r, pk in sorted(info):
        print('%-12s %5.2f s %6d B  rms %.4f pico %.3f' % (n, d, b, r, pk))
    print('%d clips · %d B base64' % (len(out), len(js)))
    return 0


sys.exit(main())
