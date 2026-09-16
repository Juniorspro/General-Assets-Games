#!/usr/bin/env python3
"""Hornea la musica generada de RECREO a MP3 chico y loopeable.

Las pistas vienen de Higgsfield (sonilo_music) en M4A de ~750 KB cada una. Cuatro son 2,8 MB, y este
juego se sube como UN archivo HTML: hay que bajarlas a decimas de eso sin que se note.

TRES COSAS QUE NO SON OBVIAS, Y LAS TRES SE APRENDIERON EN MAICOL:

1. EL EMPALME DEL BUCLE ES LO QUE MAS SE NOTA. Un tema cortado en seco y puesto a repetir da un golpe
   seco en cada vuelta, y ese golpe se escucha MAS que la musica. Se funde la cola sobre la cabeza —
   el mismo problema que la costura de una textura, pero en una dimension.

2. SE RECORTA UN PEDAZO QUE DE LA VUELTA, no la pista entera. Lo generado tiene entrada y final; lo
   que sirve para un bucle es el medio.

3. MONO Y 22 kHz. Es musica de fondo de un juego que ya suena a 1999 a proposito: el estereo no se
   usa para nada y por encima de 11 kHz no hay nada que valga los bytes.
"""
import numpy as np, os, sys, io, base64, av, lameenc

def leer(ruta, hz=22050):
    c=av.open(ruta); st=c.streams.audio[0]
    trozos=[]
    re=av.audio.resampler.AudioResampler(format='s16', layout='mono', rate=hz)
    for cuadro in c.decode(st):
        for r in re.resample(cuadro): trozos.append(r.to_ndarray().reshape(-1))
    for r in re.resample(None): trozos.append(r.to_ndarray().reshape(-1))
    a=np.concatenate(trozos).astype(np.float32)/32768.0 if trozos else np.zeros(1,np.float32)
    return a, hz

def normalizar(a, rms=0.17, techo=0.95):
    """POR RMS Y NO POR PICO, y la diferencia se midio en el juego.

    Normalizando por pico, los cuatro temas quedaban con la misma cresta pero con MUY distinta
    sonoridad: medido en el analizador, el del aula daba rms 0,0226 y el del pasillo 0,0501 — el doble,
    o sea que cambiar de pasillo a aula sonaba a que alguien bajaba el volumen. Un tema denso y uno
    espaciado con el mismo pico NO se escuchan igual; lo que sigue el oido es la energia media.
    Se iguala por rms y el pico solo se usa de techo, para que un golpe no recorte."""
    r=float(np.sqrt(np.mean(a.astype(np.float64)**2)))
    if r<1e-6: return a
    a=a*(rms/r)
    p=float(np.abs(a).max())
    if p>techo: a=a*(techo/p)
    return a

def coser(a, hz, seg=0.45):
    """funde la cola sobre la cabeza para que el bucle no golpee"""
    n=int(hz*seg)
    if len(a) < n*3: return a
    cab=a[:n].copy(); col=a[-n:].copy()
    r=np.linspace(0.0, 1.0, n, dtype=np.float32)
    a=a[:-n].copy()
    a[:n]=cab*r + col*(1.0-r)
    return a

def recortar(a, hz, seg):
    """se queda con un pedazo del medio: lo generado tiene entrada y final, y el bucle quiere el medio"""
    n=int(hz*seg)
    if len(a)<=n: return a
    ini=max(0, (len(a)-n)//2)
    return a[ini:ini+n]

def mp3(a, hz, kbps):
    e=lameenc.Encoder(); e.set_bit_rate(kbps); e.set_in_sample_rate(hz)
    e.set_channels(1); e.set_quality(2)
    pcm=np.clip(a, -1, 1)
    pcm=(pcm*32767).astype(np.int16).tobytes()
    return e.encode(pcm)+e.flush()

PISTAS=[('m1','aula',   14.0, 40),   # el tema del aula
        ('m2','pasillo',13.0, 40),   # los pasillos y las actividades
        ('m3','final',  13.0, 40),   # las ultimas aulas
        ('m4','menu',   11.0, 36)]   # el menu

if __name__=='__main__':
    raiz=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sal={}
    total=0
    for arch, nom, seg, kbps in PISTAS:
        a,hz = leer('/tmp/mus/%s.m4a'%arch)
        a = recortar(a, hz, seg+0.45)
        a = coser(a, hz)
        a = normalizar(a)
        dat = mp3(a, hz, kbps)
        total += len(dat)
        sal[nom]='data:audio/mpeg;base64,'+base64.b64encode(dat).decode('ascii')
        print('%-8s %5.1f s  %6d bytes' % (nom, len(a)/hz, len(dat)))
    d=os.path.join(raiz,'herramientas','recreo','musica')
    os.makedirs(d, exist_ok=True)
    # se escribe recien cuando el texto esta completo
    txt='{'+','.join('"%s":"%s"'%(k,v) for k,v in sal.items())+'}'
    io.open(os.path.join(d,'musica.json'),'w',encoding='utf8').write(txt)
    print('total mp3 %d bytes · json %d' % (total, len(txt)))
