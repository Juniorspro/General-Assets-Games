#!/usr/bin/env python3
"""Hornea las voces del narrador y los ocho sonidos nuevos, y los agrega a s.js.

    python3 herramientas/lemi/hornear_voz.py

POR QUE ES OTRO SCRIPT Y NO EL MISMO:
`hornear_son.py` reconstruye `s.js` ENTERO desde los diez archivos originales de
`/tmp/son`, y esos originales son de otra vuelta y ya no estan en el contenedor.
Este script LEE el `s.js` que hay, se queda con lo que ya estaba horneado y le
agrega lo nuevo. Asi no hace falta volver a generar diez efectos que ya estan
bien para poder agregar el once.

QUE HORNEA:

- LAS TREINTA VOCES DEL NARRADOR: las diez frases del guion (siete de la apertura
  y tres del final) en castellano, ingles y portugues. Van en `VOZ_B64`, partido
  por idioma, y la CLAVE es la misma que usa el subtitulo — asi el que se escucha
  y el que se lee no pueden desincronizarse, que es la leccion que en RECREO
  costo una vuelta.

- OCHO EFECTOS NUEVOS: murcielagos, gota de agua, el motor que falla, el motor
  que arranca, el golpe de caerse, las llaves, el latido y la puerta del auto.

DOS COSAS QUE SE MIDEN Y NO SE SUPONEN:

- EL NIVEL SE MIDE DESPUES DE CODIFICAR. Ya paso en RezUno: normalizar el float y
  dar el numero por bueno es creerle a una cuenta que no se hizo, porque el
  remuestreo y el codificador no conservan los picos angostos.

- Y UN PROMPT QUE PIDE UN SONIDO CHIQUITO DEVUELVE SILENCIO. Medido en esta
  tanda: `metal` volvio con pico 0,078 y rms 0,0032 —o sea nada— con un prompt
  que pedia un tintineo. Rehecho pidiendo *un llavero de hierro tirado al piso de
  piedra, fuerte y cerca*, volvio con nivel. El nivel se pone en el codigo, nunca
  en el prompt.

LA VOZ VA MAS FUERTE QUE LOS EFECTOS Y MUCHO MAS QUE LA CAMA: es narracion, o
sea lo unico que hay que entender. Los numeros estan en `RMS_VOZ` y en `PLAN`.
"""
import av, io, os, sys, base64, re
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
ENTRADA = '/tmp/voz'
SR = 22050
RMS_VOZ = 0.115          # la narracion, por encima de todo lo demas
PICO_VOZ = 0.94

# los siete tramos de la apertura mas los tres del final, en orden
CLAVES = ['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'f0', 'f1', 'f2']
IDIOMAS = ['es', 'en', 'pt']
# cuanto dura como maximo cada frase: es el hueco que le deja el guion, y una
# voz que se pasa se corta en seco justo cuando cambia el plano
TOPE = {'g0': 5.8, 'g1': 6.8, 'g2': 5.8, 'g3': 4.8, 'g4': 5.3, 'g5': 4.8,
        'g6': 5.3, 'f0': 4.8, 'f1': 4.3, 'f2': 2.4}

# nombre -> (archivo, rms objetivo, tope de pico, segundos maximos)
PLAN = [
    ('murcis',   'murcis.mp3',   0.060, 0.80, 2.6),
    ('gota',     'gota.mp3',     0.055, 0.75, 2.0),
    ('motorMal', 'motorMal.mp3', 0.085, 0.90, 2.6),
    ('motor',    'motor.mp3',    0.095, 0.94, 3.2),
    ('caida',    'caida.mp3',    0.090, 0.92, 1.2),
    ('metal',    'metal.mp3',    0.080, 0.88, 1.4),
    ('latido',   'latido.mp3',   0.070, 0.80, 1.8),
    ('puerta',   'puerta.mp3',   0.085, 0.90, 1.2),
]


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
    """corta el silencio de los dos extremos y nada mas"""
    a = np.abs(x)
    if a.max() < 1e-6:
        return x
    viv = np.nonzero(a > umbral * a.max())[0]
    if len(viv) == 0:
        return x
    i0 = max(0, viv[0] - int(SR * 0.01))
    i1 = min(len(x), viv[-1] + int(SR * 0.05))
    return x[i0:i1]


def corta_frase(x, tope):
    """Recorta una frase larga POR UN SILENCIO y no en cualquier lado.

    El generador a veces devuelve la frase dicha dos veces —medido: la del motor
    en ingles volvio en 9,68 s cuando el resto ronda los 4—. Cortar en seco a los
    cuatro segundos parte una palabra al medio; buscando el hueco de silencio mas
    largo dentro del tope, el corte cae donde la voz ya habia parado."""
    n = int(SR * tope)
    if len(x) <= n:
        return x
    a = np.abs(x[:n])
    # energia en ventanas de 40 ms; el minimo del ultimo tercio es el hueco
    v = int(SR * 0.04)
    e = np.array([a[i:i+v].mean() for i in range(0, n - v, v)])
    desde = int(len(e) * 0.55)
    if len(e) > desde + 2:
        corte = (desde + int(np.argmin(e[desde:]))) * v
        if corte > SR * 0.6:
            return x[:corte + v]
    return x[:n]


def blando(x, k):
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


def mide_mp3(by):
    """abre el MP3 TERMINADO y mide: es lo unico que prueba que sono"""
    c = av.open(io.BytesIO(by))
    s = c.streams.audio[0]
    res = av.AudioResampler(format='flt', layout='mono', rate=SR)
    tr = []
    for fr in c.decode(s):
        for r in res.resample(fr):
            tr.append(r.to_ndarray().reshape(-1).astype(np.float32))
    c.close()
    x = np.concatenate(tr) if tr else np.zeros(1, np.float32)
    return float(np.abs(x).max()), float(np.sqrt((x ** 2).mean())), len(x) / SR


def viejos():
    """se queda con el SON_B64 que ya esta horneado en s.js"""
    p = os.path.join(AQUI, 'partes', 's.js')
    if not os.path.exists(p):
        return {}
    s = io.open(p, encoding='utf8').read()
    return dict(re.findall(r"(\w+): '([A-Za-z0-9+/=]+)'", s))


def main():
    son = viejos()
    print('venian de antes: %d clips' % len(son))
    informe = []

    for nom, arch, rms_obj, pico, maxseg in PLAN:
        p = os.path.join(ENTRADA, arch)
        if not os.path.exists(p):
            print('  falta', arch); continue
        x = recorta(leer(p))[:int(SR * maxseg)]
        x = nivela(blando(x, 2.2), rms_obj, pico)
        by = mp3(x, 48)
        son[nom] = base64.b64encode(by).decode('ascii')
        pk, r, d = mide_mp3(by)
        informe.append(('sfx ' + nom, d, len(by), r, pk))

    voz = {}
    for L in IDIOMAS:
        voz[L] = {}
        for i, k in enumerate(CLAVES):
            p = os.path.join(ENTRADA, '%s%d.wav' % (L, i))
            if not os.path.exists(p):
                print('  falta', p); continue
            x = corta_frase(recorta(leer(p)), TOPE[k])
            x = nivela(x, RMS_VOZ, PICO_VOZ)
            by = mp3(x, 24)      # es voz: 24 kbps mono alcanza y de sobra
            voz[L][k] = base64.b64encode(by).decode('ascii')
            pk, r, d = mide_mp3(by)
            informe.append(('%s %s' % (L, k), d, len(by), r, pk))

    orden = ['junta', 'bomba', 'ok', 'mal', 'tela', 'fuego', 'paso', 'grito',
             'murcis', 'gota', 'motorMal', 'motor', 'caida', 'metal', 'latido',
             'puerta', 'noche', 'dia']
    piezas = ["  %s: '%s'" % (n, son[n]) for n in orden if n in son]
    piezas += ["  %s: '%s'" % (n, v) for n, v in son.items() if n not in orden]

    vz = []
    for L in IDIOMAS:
        if not voz.get(L):
            continue
        vz.append('  %s: {\n%s\n  }' % (L, ',\n'.join(
            "    %s: '%s'" % (k, voz[L][k]) for k in CLAVES if k in voz[L])))

    js = ("\n/* ══════════════════════════ LOS SONIDOS ══════════════════════════\n"
          "   Dieciocho efectos y treinta clips de voz, generados con Higgsfield\n"
          "   (mirelo para los efectos, sonilo para las dos camas, seed_audio para\n"
          "   la voz del narrador), recortados, nivelados por RMS y horneados a\n"
          "   MP3 mono de 22 kHz. Se generan con `herramientas/lemi/hornear_son.py`\n"
          "   y `hornear_voz.py`. Van en base64 adentro del HTML porque este juego\n"
          "   es UN archivo.\n"
          "   LA VOZ GUARDA LA MISMA CLAVE QUE EL SUBTITULO (`g0`..`g6`, `f0`..`f2`)\n"
          "   y esta partida por idioma: asi lo que se lee y lo que se escucha no\n"
          "   pueden decir cosas distintas, y si falta el clip de un idioma se ve el\n"
          "   subtitulo y no suena nada, que es el comportamiento correcto. */\n"
          "const SON_B64 = {\n" + ",\n".join(piezas) + "\n};\n"
          "const VOZ_B64 = {\n" + ",\n".join(vz) + "\n};\n")
    io.open(os.path.join(AQUI, 'partes', 's.js'), 'w', encoding='utf8').write(js)

    print('%-10s %8s %9s %8s %7s' % ('clip', 'seg', 'bytes', 'rms', 'pico'))
    for n, d, b, r, pk in informe:
        print('%-10s %7.2fs %8d %8.4f %7.3f' % (n, d, b, r, pk))
    kb = (sum(len(v) for v in son.values()) +
          sum(len(v) for L in voz.values() for v in L.values())) // 1024
    print('total en base64: %d KB' % kb)
    return 0


if __name__ == '__main__':
    sys.exit(main())
