# -*- coding: utf-8 -*-
"""Prepara las voces de la cinematica para meterlas dentro del HTML.

   El modelo devuelve WAV de 48 kHz: 700 KB por linea, 8 MB las doce. En un archivo suelto que
   se abre de un click eso no entra. Van a MP3 mono de 24 kbps a 22 kHz, que para una voz que
   narra es de sobra, y antes se les corta el silencio de las puntas -el sintetizador deja medio
   segundo mudo en cada extremo- y se les iguala el volumen, porque vienen con hasta 6 dB de
   diferencia entre lineas y en una cinematica eso se escucha como un salto."""
import wave, numpy as np, os, sys, base64, lameenc

def leer(ruta):
    w=wave.open(ruta); n=w.getnframes()
    a=np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float32)/32768.0
    if w.getnchannels()==2: a=a.reshape(-1,2).mean(axis=1)
    return a, w.getframerate()

def sin_silencio(a, hz, umbral=0.012, cola=0.08):
    """Corta por RMS en ventanas de 20 ms y deja una cola corta para que no quede seco."""
    v=max(1,int(hz*0.02))
    m=len(a)//v*v
    if m==0: return a
    r=np.sqrt((a[:m].reshape(-1,v)**2).mean(axis=1))
    vivos=np.where(r>umbral)[0]
    if not len(vivos): return a
    i0=max(0, (vivos[0]-1)*v); i1=min(len(a), (vivos[-1]+2)*v + int(hz*cola))
    return a[i0:i1]

def remuestrear(a, de, a_hz):
    if de==a_hz: return a
    n=int(round(len(a)*a_hz/de))
    return np.interp(np.linspace(0, len(a)-1, n), np.arange(len(a)), a).astype(np.float32)

def normalizar(a, pico=0.89):
    p=np.abs(a).max()
    return a if p<1e-6 else a*(pico/p)

def a_mp3(a, hz, kbps=24):
    e=lameenc.Encoder(); e.set_bit_rate(kbps); e.set_in_sample_rate(hz)
    e.set_channels(1); e.set_quality(2)
    pcm=(np.clip(a,-1,1)*32767).astype('<i2').tobytes()
    return e.encode(pcm)+e.flush()

HZ=22050; KBPS=24
if __name__=='__main__':
    D=sys.argv[1]; OUT=sys.argv[2]
    os.makedirs(OUT, exist_ok=True)
    lineas=[]; total=0
    for idi in ('es','en','pt'):
        for k in (1,2,3,4):
            f=os.path.join(D,'%s%d.wav'%(idi,k))
            if not os.path.exists(f): print('FALTA', f); continue
            a,hz = leer(f)
            seg0=len(a)/hz
            a = normalizar(remuestrear(sin_silencio(a,hz), hz, HZ))
            d = a_mp3(a, HZ, KBPS); total+=len(d)
            k2='%s%d'%(idi,k)
            open(os.path.join(OUT,k2+'.mp3'),'wb').write(d)
            lineas.append("  ['%s','data:audio/mpeg;base64,%s'],"%(k2, base64.b64encode(d).decode()))
            print('  %-5s %.2f s -> %.2f s  %6d bytes'%(k2, seg0, len(a)/HZ, len(d)))
    open(os.path.join(OUT,'voces.txt'),'w').write('\n'.join(lineas))
    print('total voces %.1f KB'%(total/1024))
