# -*- coding: utf-8 -*-
"""Prepara la musica y los efectos para meterlos en el HTML.

   LOS TEMAS VIENEN EN AAC DE 1 MB CADA UNO. Cuatro son 3,9 MB: en un archivo suelto que se abre
   de un click eso no entra, y menos en un telefono. Se decodifican con PyAV -el contenedor no
   tiene ffmpeg de linea de comandos, pero PyAV trae las bibliotecas adentro-, se recorta un
   pedazo que DE LA VUELTA, y se re-encodean a MP3 mono.

   EL EMPALME DEL BUCLE ES LO QUE MAS SE NOTA. Un tema cortado en seco y puesto en loop da un
   golpe seco cada vuelta, y ese golpe se escucha mas que la musica. Se funde la cola sobre la
   cabeza, igual que la costura de una textura: el mismo problema en una dimension."""
import numpy as np, os, sys, io, base64, wave, lameenc, av

def leer(ruta, hz=22050):
    c=av.open(ruta); st=c.streams.audio[0]
    trozos=[]
    re=av.audio.resampler.AudioResampler(format='s16', layout='mono', rate=hz)
    for cuadro in c.decode(st):
        for r in re.resample(cuadro):
            trozos.append(r.to_ndarray().reshape(-1))
    for r in re.resample(None):
        trozos.append(r.to_ndarray().reshape(-1))
    a=np.concatenate(trozos).astype(np.float32)/32768.0 if trozos else np.zeros(1,np.float32)
    return a, hz

def normalizar(a, pico=0.90):
    p=np.abs(a).max()
    return a if p<1e-6 else a*(pico/p)

def sin_silencio(a, hz, umbral=0.010, cola=0.05):
    v=max(1,int(hz*0.01)); m=len(a)//v*v
    if m==0: return a
    r=np.sqrt((a[:m].reshape(-1,v)**2).mean(axis=1))
    viv=np.where(r>umbral)[0]
    if not len(viv): return a
    return a[max(0,(viv[0]-1)*v) : min(len(a), (viv[-1]+2)*v + int(hz*cola))]

def bucle(a, hz, desde, largo, fundido=0.45):
    """Saca una ventana que da la vuelta: la cola se funde sobre la cabeza."""
    i0=int(desde*hz); L=int(largo*hz); f=int(fundido*hz)
    if i0+L+f > len(a): i0=max(0, len(a)-L-f)
    if L+f > len(a): L=max(1, len(a)-f)
    w=a[i0:i0+L+f].copy()
    t=np.linspace(0,1,f,dtype=np.float32)
    w[:f] = w[:f]*t + w[L:L+f]*(1-t)
    return w[:L]

def a_mp3(a, hz, kbps):
    e=lameenc.Encoder(); e.set_bit_rate(kbps); e.set_in_sample_rate(hz)
    e.set_channels(1); e.set_quality(2)
    return e.encode((np.clip(a,-1,1)*32767).astype('<i2').tobytes())+e.flush()

HZ=22050
MUSICA={  # archivo: (desde segundos, largo segundos)
 'musMenu':(0.5, 13.0), 'musBosque':(0.5, 14.0), 'musCueva':(0.5, 14.0), 'musFabrica':(0.5, 14.0) }
EFECTOS=['sSalto','sPisa','sEstrella','sDano','sMuerte','sResorte','sMeta','sAgacha']
KB_MUS=40; KB_SFX=32

if __name__=='__main__':
    D=sys.argv[1]; OUT=sys.argv[2]
    os.makedirs(OUT, exist_ok=True)
    lineas=[]; tot=0
    for k,(d,L) in MUSICA.items():
        f=[os.path.join(D,k+e) for e in ('.m4a','.mp3','.wav')]
        f=[x for x in f if os.path.exists(x)][0]
        a,hz=leer(f,HZ)
        w=normalizar(bucle(a,hz,d,L))
        m=a_mp3(w,hz,KB_MUS); tot+=len(m)
        open(os.path.join(OUT,k+'.mp3'),'wb').write(m)
        lineas.append("  %s:'data:audio/mpeg;base64,%s'"%(k, base64.b64encode(m).decode()))
        print('  %-11s %5.1f s de %5.1f s  %6d bytes'%(k, len(w)/hz, len(a)/hz, len(m)))
    for k in EFECTOS:
        f=[os.path.join(D,k+e) for e in ('.mp3','.wav','.m4a')]
        f=[x for x in f if os.path.exists(x)][0]
        a,hz=leer(f,HZ)
        w=normalizar(sin_silencio(a,hz), 0.86)
        m=a_mp3(w,hz,KB_SFX); tot+=len(m)
        open(os.path.join(OUT,k+'.mp3'),'wb').write(m)
        lineas.append("  %s:'data:audio/mpeg;base64,%s'"%(k, base64.b64encode(m).decode()))
        print('  %-11s %5.2f s de %5.2f s  %6d bytes'%(k, len(w)/hz, len(a)/hz, len(m)))
    open(os.path.join(OUT,'audio.txt'),'w').write(',\n'.join(lineas))
    print('total audio %.1f KB (base64 %.1f KB)'%(tot/1024, tot*4/3/1024))
