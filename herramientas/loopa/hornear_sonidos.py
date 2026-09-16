#!/usr/bin/env python3
"""Baja los instrumentos del soundfont, los mide, los recorta y escribe
`partes/i_son.js`.

    python3 herramientas/loopa/hornear_sonidos.py

── DE DONDE SALEN LOS SONIDOS ──
De `gleitz/midi-js-soundfonts`, que es **FluidR3_GM** renderizado nota por nota a
MP3: 128 instrumentos de General MIDI, muestras de verdad, con su afinacion.
Esta bajo **Creative Commons Attribution 3.0**, o sea que se puede redistribuir
—tambien re-codificado adentro del HTML— con atribucion, y por eso el credito
esta en el menu del juego y no solo en este comentario.

── OCHO Y NO TREINTA Y DOS, Y LA BATERIA NO ESTA ACA ──
En TONO la paleta ES el juego y por eso hay treinta y dos. Aca el instrumento es
una decision de color sobre una melodia que canto yo: ocho bien separados cubren
el rango y cuestan la cuarta parte. Y el kit de bateria NO se baja, porque el
soundfont exportado no trae el canal 10 (comprobado: `percussion-mp3` da 404) y
porque una caja de ritmos ES sintesis — un bombo es un seno que cae, una caja es
ruido mas un tono, un charles es ruido filtrado. Se dibujan por codigo, pesan
cero y se pueden afinar al tempo.

── POR QUE SE HORNEA Y NO SE BAJA EN CALIENTE ──
Bajarlo en caliente serian 128 descargas de un tercero cada vez que alguien abre
el juego, y sin red no habria juego. Horneado, el archivo se abre una vez y
funciona para siempre. Lo que cuesta es que hay que elegir QUE bajar: 128
instrumentos por 88 notas son 11.264 archivos de 25 KB.

── TRES MUESTRAS POR INSTRUMENTO, Y EL NUMERO SALE DE UNA CUENTA ──
La voz humana cantada abarca poco mas de dos octavas. Con muestras cada doce semitonos, lo
mas que hay que estirar una es **medio tono por encima de seis**, que es donde el
`playbackRate` todavia no se escucha a helio ni a barro. Con una sola muestra
habria que estirar una octava para arriba y otra para abajo, y eso si se escucha.

── Y LO SOSTENIDO SE CICLA CON LA COLA FUNDIDA SOBRE LA CABEZA ──
La mitad de la paleta —organo, cuerdas, flauta, pad— no decae: si la muestra se
corta, la nota se muere mientras el dedo sigue apretado, que es justo lo que el
pedido dice que tiene que poder hacerse. El ciclo se arma en el float ANTES de
codificar: la region que sigue al final del bucle se funde sobre su principio, y
entonces la union es continua POR CONSTRUCCION y no depende de caer en un cruce
por cero —que despues del MP3 ya no seria un cruce por cero—. Los puntos del
bucle van en el medio del buffer, asi que el relleno del codificador en las dos
puntas no los toca.
"""
import base64, io as _io, json, os, sys, urllib.request
import numpy as np
import av

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
SALIDA = os.path.join(AQUI, 'partes', 'i_son.js')
CACHE = '/tmp/sf'
CDN = 'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM'

SR = 44100
SR_SAL = 32000
KBPS = 44000
PASO = 12            # semitonos entre muestra y muestra
MUESTRAS = 3         # base, base+12, base+24
RMS_OBJ = 0.115      # todos los instrumentos al mismo nivel percibido
PICO_TOPE = 0.96
SIL = 10**(-52/20.0)  # -52 dBFS: donde una cola deja de aportar

NOM = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
def nombre(m):
    return NOM[m % 12] + str(m//12 - 1)

# ── LOS TREINTA Y DOS ──
# Ocho familias de cuatro. `base` es la nota mas grave que ese instrumento toca
# en el panel: un bajo vive dos octavas por debajo de un glockenspiel, y con una
# sola tesitura para todos el bajo sonaria a guitarra y la campanita a chirrido.
INSTR = [
  # familia          id del soundfont          base  sostenido
  ('teclas',  'acoustic_grand_piano',   48, 0, 'Piano',        'Grand piano',   'Piano'),
  ('teclas',  'electric_piano_1',       48, 0, 'Piano eléctr.','Electric piano','Piano elétr.'),
  ('madera',  'marimba',                48, 0, 'Marimba',      'Marimba',       'Marimba'),
  ('organo',  'drawbar_organ',          48, 1, 'Órgano',       'Drawbar organ', 'Órgão'),
  ('pulsada', 'electric_guitar_clean',  48, 0, 'Guitarra',     'Clean guitar',  'Guitarra'),
  ('sinte',   'electric_bass_finger',   36, 0, 'Bajo',         'Bass',          'Baixo'),
  ('sinte',   'lead_1_square',          48, 1, 'Cuadrada',     'Square lead',   'Onda quadrada'),
  ('sinte',   'pad_2_warm',             48, 1, 'Pad',          'Warm pad',      'Pad'),
]


def baja(inst, nota):
    n = nombre(nota)
    p = os.path.join(CACHE, inst + '_' + n + '.mp3')
    if os.path.exists(p) and os.path.getsize(p) > 400: return p
    os.makedirs(CACHE, exist_ok=True)
    u = CDN + '/' + inst + '-mp3/' + n + '.mp3'
    with urllib.request.urlopen(u, timeout=60) as r:
        d = r.read()
    if len(d) < 400: raise RuntimeError('vino vacio: ' + u)
    open(p, 'wb').write(d)
    return p


def lee(p):
    c = av.open(p)
    st = [s for s in c.streams if s.type == 'audio'][0]
    r = av.AudioResampler(format='fltp', layout='mono', rate=SR)
    t = []
    for f in c.decode(st):
        for g in r.resample(f): t.append(g.to_ndarray()[0].copy())
    for g in r.resample(None): t.append(g.to_ndarray()[0].copy())
    return np.concatenate(t).astype(np.float64) if t else np.zeros(1)


def afina(x, esperado, sr=SR, a=0.10, largo=0.30):
    """Cuantos cent se corre la muestra de la nota que dice ser.

       ── LA BUSQUEDA VA ACOTADA, Y NO ES UN ATAJO ──
       Una autocorrelacion LIBRE se engancha en el subarmonico: medido, quince de
       las noventa y seis muestras salian con «error» de -1200, -1903 o -2399
       cent, o sea exactamente una, una y media o dos octavas — y una de ellas
       devolvio una frecuencia NEGATIVA. No estaban desafinadas: el detector
       estaba eligiendo el periodo doble. Y en el glockenspiel y las campanas ni
       siquiera hay un fundamental que encontrar, porque una barra de metal tiene
       parciales que no son multiplos.
       Aca no hace falta DESCUBRIR el tono: hace falta COMPROBARLO. Buscando el
       pico solo a cuatro semitonos alrededor de lo que se espera, el error de
       octava no puede ocurrir por construccion, y lo que queda —que la muestra
       este donde dice— se sigue midiendo."""
    i = int(a*sr); n = int(largo*sr)
    if len(x) < i + n: return None
    w = x[i:i+n] - x[i:i+n].mean()
    if np.max(np.abs(w)) < 1e-4: return None
    w = w*np.hanning(len(w))
    ac = np.correlate(w, w, 'full')[len(w)-1:]
    lo = max(1, int(sr/(esperado*2**(4/12.0))))
    hi = min(len(ac) - 2, int(sr/(esperado*2**(-4/12.0))))
    if hi <= lo + 1: return None
    k = lo + int(np.argmax(ac[lo:hi]))
    y0, y1, y2 = ac[k-1], ac[k], ac[k+1]
    d = y0 - 2*y1 + y2
    if abs(d) > 1e-12:
        dk = 0.5*(y0 - y2)/d
        if abs(dk) < 1: k = k + dk
    return 1200*np.log2((sr/k)/esperado)


def parcial(x, f, sr=SR):
    """¿Hay energia EN la frecuencia que se espera? Es la segunda opinion para
       las muestras cuyo tono no se puede medir por autocorrelacion: un
       glockenspiel o un organo de barras tienen un parcial mas fuerte que su
       fundamental, y eso no quiere decir que la muestra este en el lugar
       equivocado. Devuelve cuantas veces la banda alrededor de f supera al
       fondo de su vecindario."""
    n = 1 << 15
    i = int(0.10*sr)
    if len(x) < i + n: return 0.0
    w = x[i:i+n]*np.hanning(n)
    S = np.abs(np.fft.rfft(w))
    df = sr/n
    k = int(round(f/df))
    if k < 3 or k > len(S) - 4: return 0.0
    pico = float(np.max(S[k-2:k+3]))
    lo, hi = max(1, k - 60), min(len(S), k + 61)
    fondo = float(np.median(S[lo:hi])) or 1e-12
    return pico/fondo


def energia(x, sr=SR):
    """Lo unico que de verdad rompe el juego es una muestra VACIA: el
       instrumento existe en la paleta y no suena."""
    n = min(len(x), int(0.5*sr))
    return float(np.sqrt(np.mean(x[:n]**2))) if n else 0.0


def recorta(x, tope):
    """Corta donde la cola deja de aportar, con un tope duro: una cola de piano
       de tres segundos es la mayor parte de los bytes y no se escucha."""
    e = np.abs(x)
    k = np.where(e > SIL)[0]
    fin = int(k[-1]) + 1 if len(k) else len(x)
    fin = min(fin, int(tope*SR), len(x))
    ini = int(k[0]) if len(k) else 0
    ini = max(0, ini - int(0.004*SR))
    return x[ini:fin].copy()


def ciclo(x, ini, largo, cruce):
    """Funde la region que sigue al final del bucle sobre su principio: asi
       x[a] continua a x[b-1] por construccion."""
    a = int(ini*SR); b = a + int(largo*SR); c = int(cruce*SR)
    if b + c > len(x): return None
    w = np.linspace(0.0, 1.0, c)
    x[a:a+c] = x[a:a+c]*w + x[b:b+c]*(1.0 - w)
    return (a/SR, b/SR)


def nivela(x):
    """Todos los instrumentos al mismo nivel PERCIBIDO: sin esto, cambiar de
       glockenspiel a pad cambia el volumen del juego."""
    n = min(len(x), int(0.6*SR))
    r = float(np.sqrt(np.mean(x[:n]**2))) or 1e-9
    g = RMS_OBJ/r
    if np.max(np.abs(x))*g > PICO_TOPE: g = PICO_TOPE/max(1e-9, np.max(np.abs(x)))
    return x*g


def mp3(x):
    b = _io.BytesIO()
    c = av.open(b, 'w', format='mp3')
    st = c.add_stream('libmp3lame', rate=SR_SAL)
    st.bit_rate = KBPS
    fmt = st.codec_context.format.name
    lay = st.codec_context.layout.name
    res = av.AudioResampler(format=fmt, layout=lay, rate=SR_SAL)
    fr = av.AudioFrame.from_ndarray(
        np.ascontiguousarray((np.clip(x, -1, 1)*32767).astype(np.int16).reshape(1, -1)),
        format='s16', layout='mono')
    fr.sample_rate = SR
    for g in res.resample(fr):
        for pk in st.encode(g): c.mux(pk)
    for pk in st.encode(None): c.mux(pk)
    c.close()
    return b.getvalue()


def main():
    salidas, filas, total, avisos, cents = [], [], 0, [], []
    for fam, sf, base, sost, es, en, pt in INSTR:
        notas, bl = [], []
        for k in range(MUESTRAS):
            m = base + k*PASO
            p = baja(sf, m)
            x = lee(p)
            esperado = 440.0*2**((m - 69)/12.0)
            if energia(x) < 3e-4:
                avisos.append('%s %s: la muestra vino MUDA' % (sf, nombre(m)))
            cent = afina(x, esperado)
            if cent is None:
                avisos.append('%s %s: sin tono medible' % (sf, nombre(m)))
            elif abs(cent) > 35:
                r = parcial(x, esperado)
                avisos.append('%s %s: la autocorrelacion da %+.0f cent, pero hay un parcial '
                              '%.0f veces sobre el fondo EN %.1f Hz%s' %
                              (sf, nombre(m), cent, r, esperado,
                               ' — la muestra esta donde dice' if r > 6 else ' — SOSPECHOSA'))
            else:
                cents.append(abs(cent))
            tope = 2.6 if sost else 1.9
            y = recorta(x, tope)
            lp = None
            if sost:
                # el ataque son las dos primeras decimas; el bucle vive despues
                lp = ciclo(y, 0.55, 0.62, 0.16)
                if lp is None: lp = ciclo(y, 0.35, 0.40, 0.10)
                # ── Y LO QUE VIENE DESPUES DEL BUCLE NO SE OYE NUNCA ──
                # El cruce ya doblo esa region sobre el principio del bucle, asi
                # que guardarla es peso puro: medido, cada muestra sostenida
                # pesaba 13,3 kB de los cuales 7,3 estaban despues de loopEnd.
                if lp is not None:
                    y = y[:int(lp[1]*SR) + int(0.01*SR)].copy()
            # el final se funde para que soltar no de un chasquido — salvo en
            # las que ciclan, donde el final ES el punto de union del bucle
            if not lp:
                f = int(0.05*SR)
                if len(y) > f: y[-f:] *= np.linspace(1.0, 0.0, f)
            y = nivela(y)
            d = mp3(y)
            total += len(d)
            notas.append({'n': m, 'd': base64.b64encode(d).decode('ascii'),
                          'lp': [round(lp[0], 4), round(lp[1], 4)] if lp else None})
            bl.append('%s %.2fs %.1fkB %s' % (nombre(m), len(y)/SR, len(d)/1024,
                                              'bucle' if lp else 'decae'))
        filas.append('%-24s %s' % (sf, ' | '.join(bl)))
        salidas.append({'id': sf, 'fam': fam, 'base': base, 'sost': sost,
                        'nom': [es, en, pt], 'm': notas})

    js = ['/* ══════════════════ LOS SONIDOS ══════════════════',
          '   Treinta y dos instrumentos de General MIDI, tres muestras cada uno,',
          '   sacados de FluidR3_GM (gleitz/midi-js-soundfonts) — Creative Commons',
          '   Attribution 3.0. El credito va en el menu del juego.',
          '   Generado por herramientas/tono/hornear_sonidos.py. NO EDITAR A MANO. */',
          'const SON_B = ' + json.dumps(salidas, ensure_ascii=False, separators=(',', ':')) + ';']
    open(SALIDA, 'w', encoding='utf8').write('\n'.join(js) + '\n')
    print('\n'.join(filas))
    print('\nafinacion: %d de %d muestras medidas, peor %.1f cent, media %.1f' %
          (len(cents), len(INSTR)*MUESTRAS, max(cents) if cents else 0,
           float(np.mean(cents)) if cents else 0))
    if avisos:
        print('AVISOS:')
        for a in avisos: print(' ', a)
    print('\n%d instrumentos, %d muestras, %.0f kB de MP3, %.0f kB en base64' %
          (len(INSTR), len(INSTR)*MUESTRAS, total/1024, total*4/3/1024))


main()
