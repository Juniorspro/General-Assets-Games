#!/usr/bin/env python3
"""Hornea las voces de las cintas de CASA 13 y las pega en el juego.

    VOZ_DIR=/tmp/rez_casa13/voz python3 herramientas/casa13/hornear_voz.py

QUE HACE Y POR QUE
· BANDA DE 300 A 3400 Hz, HORNEADA. No es una degradacion: es lo que mide una
  cinta VHS de 1994 saliendo por el parlante de una filmadora. Y va en el horno
  y no en el juego porque un biquad por cinta cuesta todos los cuadros para dar
  siempre el mismo resultado.
· 12 kHz DE MUESTREO. Con la banda cortada en 3400, Nyquist necesita 6800: a
  22050 se estan guardando doce mil hercios de silencio. Ademas MP3 a 12 kHz
  entra en MPEG-2 layer III, que todos los navegadores decodifican.
· SE NIVELA POR RMS Y SE MIDE DESPUES DE CODIFICAR. El pico no sabe cuanto
  dura: nivelando por pico, un chasquido de dos centesimas queda tan «fuerte»
  como una frase entera. Y el remuestreo y el codificador se comen los picos
  angostos, asi que creerle a la cuenta hecha sobre el float es creerle a una
  medicion que no se hizo — ya paso en RezUno, donde un campanazo se cayo de
  0,46 a 0,146 al codificar.
"""
import base64, io, os, sys, math
import numpy as np
import av

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))
sys.path.insert(0, AQUI)
from cintas import CINTAS, IDIOMAS

CRUDO = os.environ.get('VOZ_DIR', '/tmp/rez_casa13/voz')
DEST = os.path.join(RAIZ, 'assets', 'casa13')
JUEGO = os.path.join(RAIZ, 'juegos-pc', 'Casa_Abandonada.html')
SR = 12000
TOPE = 12.5              # segundos de audio como maximo, cortando en un silencio
KBPS = 16
RMS_OBJ = 0.115          # la escala de mezcla de este juego: la voz va por
                         # encima de la lluvia (0,021) y por debajo del grito


def leer(p):
    c = av.open(p)
    tr = [f.to_ndarray().astype(np.float32).reshape(-1)
          for f in c.decode(audio=0)]
    x = np.concatenate(tr) if tr else np.zeros(1, np.float32)
    return x, c.streams.audio[0].rate


def remuestrear(x, de, a):
    n = int(round(len(x) * a / de))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def biquad(x, b0, b1, b2, a1, a2):
    y = np.empty_like(x); x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1 = x1, x[i]; y2, y1 = y1, v; y[i] = v
    return y


def paso(x, sr, f, alto, q=0.707):
    """un biquad de manual; `alto` = pasaaltos"""
    w = 2 * math.pi * f / sr; c, s = math.cos(w), math.sin(w)
    al = s / (2 * q); a0 = 1 + al
    if alto:
        b0, b1, b2 = (1 + c) / 2, -(1 + c), (1 + c) / 2
    else:
        b0, b1, b2 = (1 - c) / 2, 1 - c, (1 - c) / 2
    return biquad(x, b0 / a0, b1 / a0, b2 / a0, (-2 * c) / a0, (1 - al) / a0)


def recortar(x, sr, umbral=0.012):
    """saca el silencio de las dos puntas. El TTS deja medio segundo de aire y
    en una cinta que arranca sola eso se lee a que no funciono."""
    e = np.abs(x)
    v = np.convolve(e, np.ones(int(sr * 0.02)) / (sr * 0.02), 'same')
    idx = np.where(v > umbral * v.max())[0]
    if not len(idx): return x
    a = max(0, idx[0] - int(sr * 0.04)); b = min(len(x), idx[-1] + int(sr * 0.12))
    return x[a:b]


def topar(x, sr, tope=TOPE):
    """CORTA EN UN SILENCIO, NUNCA A MITAD DE PALABRA.

    POR QUE HAY QUE TOPAR: los clips no salen todos del mismo modelo. Medido,
    nueve de doce vuelven a 8-9 s (unas catorce letras por segundo, o sea habla
    normal) y los otros a 28-39 s para el mismo texto, y el servidor no dice
    cual backend uso ni acepta que se lo pinne. Sin tope, doce clips pesan mas
    que el juego entero.

    Y NO ES UNA MUTILACION: una cinta VHS de 1994 que pierde senal es
    exactamente lo que este juego es. El subtitulo sigue —su tiempo lo manda el
    TEXTO y no el audio— asi que la ultima linea se lee sobre el ruido de
    cinta, que es como termina una grabacion arruinada.
    """
    n = int(sr * tope)
    if len(x) <= n: return x
    # se busca el silencio mas cercano al tope, mirando 2,5 s hacia atras
    v = np.convolve(np.abs(x), np.ones(int(sr * 0.03)) / (sr * 0.03), 'same')
    a = max(int(sr * 1.0), n - int(sr * 2.5))
    tramo = v[a:n]
    if not len(tramo): return x[:n]
    corte = a + int(np.argmin(tramo))
    return x[:corte + int(sr * 0.10)]


def codificar(x, sr, kbps):
    buf = io.BytesIO()
    out = av.open(buf, 'w', format='mp3')
    st = out.add_stream('mp3', rate=sr)
    st.bit_rate = kbps * 1000
    fr = av.AudioFrame.from_ndarray(
        (np.clip(x, -1, 1) * 32767).astype(np.int16).reshape(1, -1),
        format='s16', layout='mono')
    fr.rate = sr; fr.pts = 0
    for pk in st.encode(fr): out.mux(pk)
    for pk in st.encode(None): out.mux(pk)
    out.close()
    return buf.getvalue()


def rms(x): return float(np.sqrt(np.mean(x * x))) if len(x) else 0.0


def una(nom):
    src = os.path.join(CRUDO, nom + '.mp3')
    if not os.path.exists(src): return None
    x, sr = leer(src)
    x = recortar(x, sr)
    x = paso(x, sr, 3400, False)          # se va lo de arriba: eso es la cinta
    x = remuestrear(x, sr, SR)            # y recien ahi se baja el muestreo
    x = paso(x, SR, 300, True)            # y lo de abajo, que es el parlante
    x = topar(x, SR)
    r = rms(x)
    if r > 1e-6: x = x * (RMS_OBJ / r)
    # SE MIDE EL ARCHIVO TERMINADO Y SE CORRIGE, no se le cree al float. Medido:
    # la banda de 300-3400 mas el codificador se llevan el 37 % del rms, asi que
    # el nivel de diseno no se alcanza nunca de una sola pasada.
    dat = codificar(x, SR, KBPS)
    r2 = rms(leer(_tmp(dat))[0])
    if r2 > 1e-6:
        x = np.tanh(x * (RMS_OBJ / r2) * 1.25) / 1.25
        dat = codificar(x, SR, KBPS)
        r2 = rms(leer(_tmp(dat))[0])
    return nom, len(x) / SR, r2, dat


def _tmp(dat):
    p = '/tmp/_voz_med.mp3'; open(p, 'wb').write(dat); return p


def main():
    hechas, total = [], 0
    for c in CINTAS:
        for i in IDIOMAS:
            n = '%s_%s' % (c['ck'], i)
            r = una(n)
            if not r: print('%-8s FALTA' % n); continue
            _, dur, rr, dat = r
            total += len(dat)
            hechas.append((n, base64.b64encode(dat).decode()))
            print('%-8s %5.2f s  rms %.4f  %6d bytes' % (n, dur, rr, len(dat)))
    print('total %d bytes (%.1f KB), en base64 %.1f KB'
          % (total, total / 1024, sum(len(b) for _, b in hechas) / 1024))
    if '--solo' in sys.argv: return
    os.makedirs(DEST, exist_ok=True)
    pegar(hechas)


def pegar(hechas):
    A, B = '/*<<UI_VOZ>>*/', '/*<</UI_VOZ>>*/'
    s = io.open(JUEGO, encoding='utf8').read()
    cuerpo = 'const VOZ={\n' + ',\n'.join(
        "%s:'%s'" % (n, b) for n, b in hechas) + '};\n'
    if A not in s: raise SystemExit('faltan las marcas %s en el HTML' % A)
    i, j = s.index(A), s.index(B) + len(B)
    io.open(JUEGO, 'w', encoding='utf8').write(
        s[:i] + A + '\n' + cuerpo + B + s[j:])
    print('pegado (%d bytes de HTML)' % len(io.open(JUEGO, encoding='utf8').read()))


if __name__ == '__main__':
    main()
