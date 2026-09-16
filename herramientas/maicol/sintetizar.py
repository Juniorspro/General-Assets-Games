# -*- coding: utf-8 -*-
"""Sintetiza los efectos cortos del juego, y COMPRUEBA que cada uno haga lo que dice.

   POR QUE SINTETIZADOS Y NO GENERADOS.
   Los efectos cortos se pidieron a un modelo de texto-a-audio y se midieron: de los ocho, CUATRO
   estaban objetivamente mal. El salto tiene que SUBIR de tono y salia plano y de 0,91 segundos —un
   salto dura dos decimas—; el resorte tiene que subir y BAJABA; el golpe tiene que bajar y salia
   plano; la estrella salia a 0,357 de pico contra 0,81 del resto, o sea que se escuchaba flojita
   al lado de todo lo demas.
   Un modelo de texto-a-audio no toma ordenes sobre la DIRECCION del tono ni sobre el LARGO, y un
   blip de arcade es exactamente eso: una envolvente de tono y nada mas. Para eso esta un
   sintetizador, donde la direccion se escribe y despues se verifica midiendo el centroide
   espectral: si el centro de gravedad del espectro sube, el sonido sube.
   La musica y los temas largos siguen siendo generados: ahi el modelo si aporta algo que no se
   puede escribir a mano."""
import numpy as np, io, os, sys, base64, lameenc

HZ=22050

def env(n, ataque=0.004, caida=0.06, sostiene=0.0):
    a=int(HZ*ataque); s=int(HZ*sostiene); d=max(1, n-a-s)
    e=np.concatenate([np.linspace(0,1,a,dtype=np.float32) if a>0 else np.zeros(0,np.float32),
                      np.ones(s,np.float32),
                      np.exp(-np.linspace(0,4.2,d,dtype=np.float32))])
    return e[:n] if len(e)>=n else np.pad(e,(0,n-len(e)))

def onda(f0, f1, dur, tipo='cuadrada', duty=0.5, vib=0.0, vibHz=18.0):
    n=int(HZ*dur); t=np.arange(n,dtype=np.float32)/HZ
    f=np.geomspace(max(20.0,f0), max(20.0,f1), n).astype(np.float32)
    if vib: f=f*(1.0+vib*np.sin(2*np.pi*vibHz*t))
    fase=np.cumsum(f)/HZ
    x=fase%1.0
    if tipo=='cuadrada': y=np.where(x<duty, 1.0, -1.0)
    elif tipo=='sierra': y=2*x-1
    elif tipo=='triangulo': y=4*np.abs(x-0.5)-1
    else: y=np.sin(2*np.pi*fase)
    return y.astype(np.float32)

def ruido(dur, corte=None):
    n=int(HZ*dur)
    y=np.random.RandomState(7).randn(n).astype(np.float32)
    if corte:  # pasa-bajos de un polo, alcanza para un golpe
        a=np.exp(-2*np.pi*corte/HZ); o=np.zeros(n,np.float32); v=0.0
        for i in range(n): v=a*v+(1-a)*y[i]; o[i]=v
        y=o/max(1e-6,np.abs(o).max())
    return y

def mezcla(*partes):
    n=max(len(p) for p in partes)
    o=np.zeros(n,np.float32)
    for p in partes: o[:len(p)]+=p
    return o

def norm(a, pico=0.85):
    m=np.abs(a).max()
    return a if m<1e-6 else a*(pico/m)

def notas(fs, dur, hueco=0.0, tipo='cuadrada'):
    ps=[]
    for f in fs:
        y=onda(f,f,dur,tipo)*env(int(HZ*dur), 0.003, 0.05, dur*0.35)
        ps.append(y)
        if hueco: ps.append(np.zeros(int(HZ*hueco),np.float32))
    return np.concatenate(ps)

# ---- los efectos, cada uno con lo que TIENE que hacer
def sSalto():   return norm(onda(300,980,0.17,'cuadrada',0.42)*env(int(HZ*0.17),0.003,0.10))
def sResorte(): return norm(onda(240,1180,0.30,'cuadrada',0.35,vib=0.06,vibHz=22)*env(int(HZ*0.30),0.004,0.12))
def sDano():    return norm(mezcla(onda(520,80,0.28,'sierra')*env(int(HZ*0.28),0.002,0.10),
                                   ruido(0.10,1400)*env(int(HZ*0.10),0.001,0.05)*0.45))
def sEstrella():return norm(notas([880,1318],0.075,0.012))
def sPisa():    return norm(mezcla(onda(190,72,0.10,'triangulo')*env(int(HZ*0.10),0.002,0.05),
                                   ruido(0.06,900)*env(int(HZ*0.06),0.001,0.03)*0.5))
def sPison():   return norm(mezcla(onda(560,150,0.13,'cuadrada',0.3)*env(int(HZ*0.13),0.002,0.06),
                                   ruido(0.07,2200)*env(int(HZ*0.07),0.001,0.04)*0.55))
def sAgacha():  return norm(ruido(0.11,2600)*env(int(HZ*0.11),0.006,0.05), 0.55)
def sMuerte():  return norm(onda(440,70,0.72,'sierra')*env(int(HZ*0.72),0.004,0.30))
def sMeta():    return norm(notas([523,659,784,1047],0.12,0.02))
def sFinal():   return norm(np.concatenate([notas([523,659,784,1047,1319],0.11,0.015),
                                            norm(mezcla(onda(1047,1047,0.55,'cuadrada')*env(int(HZ*0.55),0.004,0.5,0.2),
                                                        onda(1319,1319,0.55,'cuadrada')*env(int(HZ*0.55),0.004,0.5,0.2)*0.7,
                                                        onda(1568,1568,0.55,'cuadrada')*env(int(HZ*0.55),0.004,0.5,0.2)*0.5), 0.8)]))

EFECTOS={'sSalto':sSalto,'sResorte':sResorte,'sDano':sDano,'sEstrella':sEstrella,'sPisa':sPisa,
         'sPison':sPison,'sAgacha':sAgacha,'sMuerte':sMuerte,'sMeta':sMeta,'sFinal':sFinal}

# lo que cada uno TIENE que cumplir: (direccion, largo maximo en segundos)
PIDE={'sSalto':('sube',0.34),'sResorte':('sube',0.44),'sDano':('baja',0.42),'sEstrella':('sube',0.36),
      'sPisa':('libre',0.28),'sPison':('libre',0.30),'sAgacha':('libre',0.24),
      'sMuerte':('baja',1.2),'sMeta':('sube',1.6),'sFinal':('sube',3.2)}

def tono(a, n=1024, fmin=55, fmax=2600):
    """El TONO de cada ventana por autocorrelacion. El centroide espectral no sirve para esto:
       en una onda cuadrada los armonicos pesan mas que el fundamental, asi que una arpegiada que
       sube una octava movia el centroide apenas un 10% y el control la daba por 'plana'.
       La autocorrelacion busca el periodo que se repite, o sea el fundamental, que es lo que el
       oido llama tono.
       fmin=55 y no 90: el golpe termina en 80 Hz y la muerte en 70. Con el piso en 90 el periodo
       de esas notas no entra en la ventana de busqueda, el algoritmo se agarra de un ARMONICO
       -que tiene periodo mas corto- y reporta que el sonido SUBE cuando esta bajando. Los dos
       daban +575% y +738% de subida siendo caidas."""
    v=[]
    p0=int(HZ/fmax); p1=int(HZ/fmin)
    for i in range(0, max(0,len(a)-n), n//2):
        w=a[i:i+n].astype(np.float64)
        if np.abs(w).max()<0.02: continue
        w=w-w.mean()
        r=np.correlate(w,w,'full')[n-1:]
        if r[0]<=0: continue
        r=r/r[0]
        seg=r[p0:min(p1,len(r))]
        if not len(seg): continue
        j=int(np.argmax(seg))
        # SI EL MAXIMO CAE EN EL BORDE DE LA BUSQUEDA NO ES UN PICO, es que no encontro nada:
        # devolvia 2756 Hz -que es justo el limite de arriba- en las ventanas donde el sonido ya
        # se apago, y esas ventanas falsas daban vuelta la lectura de la caida del golpe y de la
        # muerte, que salian '+575% sube' siendo dos sonidos que bajan.
        if j==0 or j>=len(seg)-1: continue
        p=p0+j
        if r[p]<0.25: continue          # sin periodicidad clara: es ruido, no tiene tono
        v.append(HZ/p)
    return v

def centroide(a, n=1024):
    v=[]
    for i in range(0, max(0,len(a)-n), n//2):
        w=a[i:i+n]*np.hanning(n)
        e=np.abs(np.fft.rfft(w)); f=np.fft.rfftfreq(n, 1/HZ)
        if e.sum()<1e-5: continue
        v.append(float((e*f).sum()/e.sum()))
    return v

def revisar(k, a):
    d,largo = PIDE[k]
    seg=len(a)/HZ
    # el final termina en un ACORDE de tres notas y la autocorrelacion es monofonica: se mide
    # solo la arpegiada, que es la parte que tiene que subir
    c=tono(a[:int(len(a)*0.55)] if k=='sFinal' else a)
    if len(c)<3: c=centroide(a)          # sin tono claro (ruido): se cae al centroide
    if len(c)<3: return seg, 0.0, 'sin tono', (seg<=largo and d=='libre')
    ini=np.median(c[:max(1,len(c)//3)]); fin=np.median(c[-max(1,len(c)//3):])
    cam=(fin-ini)/max(1.0,ini)
    lect='sube' if cam>0.15 else ('baja' if cam<-0.15 else 'plano')
    ok = (seg<=largo) and (d=='libre' or lect==d)
    return seg, cam, lect, ok

def a_mp3(a, kbps=48):
    e=lameenc.Encoder(); e.set_bit_rate(kbps); e.set_in_sample_rate(HZ)
    e.set_channels(1); e.set_quality(2)
    return e.encode((np.clip(a,-1,1)*32767).astype('<i2').tobytes())+e.flush()

if __name__=='__main__':
    OUT=sys.argv[1]; os.makedirs(OUT, exist_ok=True)
    print('%-10s %6s %8s %7s %6s %8s'%('efecto','seg','cambio','lectura','pide','bytes'))
    todos=True
    for k,f in EFECTOS.items():
        a=f()
        seg,cam,lect,ok = revisar(k,a)
        d=a_mp3(a); open(os.path.join(OUT,k+'.mp3'),'wb').write(d)
        print('%-10s %6.2f %+7.0f%% %7s %6s %8d  %s'%(k,seg,cam*100,lect,PIDE[k][0],len(d),'ok' if ok else 'NO CUMPLE'))
        todos = todos and ok
    print('\ntodos cumplen:', todos)
