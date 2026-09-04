#!/usr/bin/env python3
"""Extrae la cancion del video que trajo el usuario y escribe `partes/i_mus.js`.

   ── EL RECORTE DE LA COLA NO SE ELIGE, SE MIDE ──
   El video trae el «tun» de TikTok pegado al final, y no hay que buscarlo a oido:
   es una rafaga fuerte y GRAVE despues de un desvanecido. Medido cada 250 ms, el
   tema baja de rms 0,09 a 0,045 entre 29,5 y 30,4 y ahi entra una rafaga de rms
   0,56 con el centroide en 113 Hz —seis veces mas fuerte que la musica y diez
   veces mas grave— que dura un segundo y despues silencio absoluto. El corte va
   antes de esa rafaga, y la busqueda es automatica: la primera ventana despues
   del minuto de desvanecido que suba de rms y baje de centroide a la vez.

   ── Y LA CABEZA SE RECORTA AL PRIMER TIEMPO ──
   El juego saca la x del reloj de audio, asi que el tiempo 0 del juego tiene que
   ser un TIEMPO de la musica: si no, los obstaculos caen a contratiempo y no hay
   ajuste que lo arregle. El tempo y la fase salen del flujo espectral —onsets—
   con una busqueda por autocorrelacion y despues por puntaje de tren de pulsos:
   158,0 BPM con el primer tiempo en 0,348 s. Recortando esos 0,348 s el archivo
   EMPIEZA en un tiempo y el juego no necesita ningun desfase.

   ── Y EL NIVEL DE LO QUE SE OYE SE MIDE SOBRE EL MP3 YA ESCRITO ──
   Es la regla de PUERTA BLANCA: a bitrate bajo el codificador se lleva parte de
   la punta, asi que la cuenta hecha sobre el float describe un archivo que no
   existe. Se escribe, se abre, se mide y se corrige.
"""
import base64, io as _io, os, sys
import numpy as np
import av

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SALIDA = os.path.join(RAIZ, 'herramientas', 'dash', 'partes', 'i_mus.js')

SR = 44100
FUNDE_FIN = 0.42
FUNDE_INI = 0.012
RMS_OBJ = 0.135
PICO_TOPE = 0.97
BITRATE = 64000
SR_SAL = 32000
H = 512                     # salto de la ventana del flujo espectral
VENT = 2048


def leer(p):
    c = av.open(p)
    st = [s for s in c.streams if s.type == 'audio'][0]
    res = av.AudioResampler(format='fltp', layout='stereo', rate=SR)
    tr = []
    for f in c.decode(st):
        for g in res.resample(f):
            tr.append(g.to_ndarray().copy())
    x = np.concatenate(tr, axis=1).astype(np.float64)
    return x


def flujo(m):
    n = (len(m) - VENT)//H
    w = np.hanning(VENT)
    S = np.empty((n, VENT//2 + 1))
    for i in range(n):
        S[i] = np.abs(np.fft.rfft(m[i*H:i*H + VENT]*w))
    f = np.maximum(0, np.diff(S, axis=0)).sum(axis=1)
    return f/(f.max() or 1)


def tempo(f):
    """El tempo y la fase del primer tiempo, en segundos."""
    fps = SR/H
    z = f - f.mean()
    ac = np.correlate(z, z, 'full')[len(z) - 1:]
    def val(a, lag):
        i = int(lag); fr = lag - i
        if i + 1 >= len(a): return 0.0
        return a[i]*(1 - fr) + a[i + 1]*fr
    cand = []
    for bpm in np.arange(60, 200.5, 0.1):
        lag = 60/bpm*fps
        # se suman los armonicos para no engancharse en el doble ni en la mitad
        cand.append((val(ac, lag) + 0.5*val(ac, 2*lag) + 0.5*val(ac, 4*lag), bpm))
    cand.sort(reverse=True)
    b0 = cand[0][1]
    def puntua(bpm, fase):
        per = 60/bpm*fps
        idx = np.arange(fase, len(z) - 1, per)
        i0 = idx.astype(int); fr = idx - i0
        return float((z[i0]*(1 - fr) + z[np.minimum(i0 + 1, len(z) - 1)]*fr).mean())
    mej = (-9, b0, 0.0)
    for bpm in np.arange(b0 - 2, b0 + 2.01, 0.02):
        per = 60/bpm*fps
        for fase in np.arange(0, per, 0.25):
            s = puntua(bpm, fase)
            if s > mej[0]: mej = (s, bpm, fase)
    return mej[1], mej[2]/fps


def fin_tiktok(m):
    """Donde arranca el «tun»: fuerte y grave despues del desvanecido."""
    P = int(0.25*SR)
    n = len(m)//P
    rms = np.empty(n); cen = np.empty(n)
    fr = np.fft.rfftfreq(P, 1/SR)
    w = np.hanning(P)
    for k in range(n):
        s = m[k*P:(k + 1)*P]
        rms[k] = np.sqrt((s*s).mean())
        F = np.abs(np.fft.rfft(s*w))
        cen[k] = (F*fr).sum()/max(1e-9, F.sum())
    med = np.median(rms[rms > 0.01]) or 1
    # se recorre desde el final: la rafaga es la ultima ventana con rms alto
    # rodeada de silencio, y su centroide es menos de la mitad del habitual
    cenmed = np.median(cen[rms > 0.01]) or 1
    for k in range(n - 1, 4, -1):
        if rms[k] > 1.6*med and cen[k] < 0.55*cenmed:
            # se retrocede mientras siga sonando, para caer en su primer cuadro
            j = k
            while j > 1 and rms[j - 1] > 0.9*med: j -= 1
            return j*0.25, k*0.25
    return len(m)/SR, None


def escribe_mp3(x, sr, bitrate):
    b = _io.BytesIO()
    cont = av.open(b, 'w', format='mp3')
    st = cont.add_stream('libmp3lame', rate=sr)
    st.bit_rate = bitrate
    fmt = st.codec_context.format.name
    lay = st.codec_context.layout.name
    res = av.AudioResampler(format=fmt, layout=lay, rate=sr)
    fr = av.AudioFrame.from_ndarray(
        np.ascontiguousarray((x*32767).astype(np.int16).reshape(1, -1)),
        format='s16', layout='mono')
    fr.sample_rate = SR
    for g in res.resample(fr):
        for pk in st.encode(g): cont.mux(pk)
    for pk in st.encode(None): cont.mux(pk)
    cont.close()
    return b.getvalue()


def mide_mp3(d):
    c = av.open(_io.BytesIO(d))
    st = [s for s in c.streams if s.type == 'audio'][0]
    tr = []
    for f in c.decode(st):
        a = f.to_ndarray()
        tr.append(a.reshape(-1) if a.ndim == 1 else a.mean(axis=0))
    y = np.concatenate(tr).astype(np.float64)
    if np.abs(y).max() > 1.5: y = y/32768.0
    return float(np.sqrt((y*y).mean())), float(np.abs(y).max()), len(y)


def main():
    if len(sys.argv) < 2:
        print('uso: hornear_musica.py <video o audio>'); return 1
    x = leer(sys.argv[1])
    m = x.mean(axis=0)
    print('entrada: %.2f s, pico %.3f, rms %.4f' % (len(m)/SR, np.abs(m).max(),
                                                    np.sqrt((m*m).mean())))
    bpm, ofs = tempo(flujo(m))
    fin, tun = fin_tiktok(m)
    print('tempo %.2f BPM, primer tiempo en %.4f s' % (bpm, ofs))
    print('corte de cola en %.2f s (el «tun» arranca en %s)' % (fin, tun))

    # margen de seguridad: el detector devuelve el PRIMER cuadro de la rafaga, y
    # el ataque puede empezar unos milisegundos antes de que la ventana lo mida
    a = int(ofs*SR); b = int((fin - 0.08)*SR)
    y = m[a:b].copy()
    ni = int(FUNDE_INI*SR); nf = int(FUNDE_FIN*SR)
    y[:ni] *= np.linspace(0, 1, ni)
    y[-nf:] *= np.linspace(1, 0, nf)**1.6

    # nivel: primero la punta y despues el rms, y en ese orden — aplastando
    # despues de nivelar, el tope de pico vuelve a bajar todo
    y = np.tanh(y*1.25)/np.tanh(1.25)
    g = RMS_OBJ/max(1e-9, float(np.sqrt((y*y).mean())))
    y = np.clip(y*g, -PICO_TOPE, PICO_TOPE)

    d = escribe_mp3(y, SR_SAL, BITRATE)
    for i in range(3):
        rms, pico, n = mide_mp3(d)
        print('  mp3: %d KB, %.2f s, rms %.4f, pico %.3f' % (len(d)//1024, n/SR_SAL,
                                                             rms, pico))
        if abs(rms - RMS_OBJ)/RMS_OBJ < 0.05: break
        y = np.clip(y*(RMS_OBJ/max(1e-9, rms)), -PICO_TOPE, PICO_TOPE)
        d = escribe_mp3(y, SR_SAL, BITRATE)

    dur = (b - a)/SR
    tiempos = dur/(60/bpm)
    print('duracion %.3f s = %.2f tiempos = %.2f compases' % (dur, tiempos, tiempos/4))
    L = ['', '/* ══════════ LA CANCION DEL NIVEL ══════════',
         '   Extraida del video que trajo el usuario por',
         '   `herramientas/dash/hornear_musica.py`, que mide el tempo, recorta la',
         '   cabeza al primer tiempo y le saca el «tun» de TikTok de la cola.',
         '',
         '   `MUS_BPM` no es una preferencia: la velocidad del juego sale de ahi',
         '   (`v = 4·BPM/60`), o sea que el tempo de la cancion DEFINE el nivel. Y a',
         '   158 BPM eso da **10,53 bloques por segundo**, que es exactamente la',
         '   velocidad 1x de Geometry Dash (un bloque cada 0,095 s). */']
    L.append('const MUS_BPM = %.1f;' % bpm)
    L.append('const MUS_DUR = %.3f;              /* segundos de musica */' % dur)
    L.append('const MUS_TIEMPOS = %.2f;           /* tiempos que dura */' % tiempos)
    L.append("const MUS_B64 = 'data:audio/mpeg;base64,%s';" % base64.b64encode(d).decode())
    L.append('')
    with open(SALIDA, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L))
    print('%s  %d KB' % (SALIDA, os.path.getsize(SALIDA)//1024))
    return 0


sys.exit(main())
