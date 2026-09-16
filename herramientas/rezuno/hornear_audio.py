#!/usr/bin/env python3
"""
HORNEA EL AUDIO DE RezUno: de lo que devuelve el generador a lo que entra en el HTML.

Lo que hace y por que:

- RECORTA POR ENERGIA Y NO POR PICO. Un clip de dos segundos trae el sonido en algun lado y silencio
  alrededor; quedarse con "donde esta el pico" se lleva cualquier chasquido suelto. La energia
  —amplitud POR duracion— no se deja enganar: cinco cuadros de 0,2 suman 0,2 y veintitres de 0,15
  suman 0,52. Es la misma leccion que ya habia costado dos intentos en RECREO.
- BAJA EL UMBRAL HASTA QUE QUEDE ALGO. Un efecto que viene bajito se recorta entero y queda un click
  de 30 ms. Si con el umbral puesto queda menos del minimo, se afloja y se vuelve a probar.
- LA COSTURA DEL BUCLE SE FUNDE. Un tema cortado en seco y puesto en loop da un golpe cada vuelta, y
  ese golpe se escucha mas que la musica. Se funde la cola sobre la cabeza.
- LOS NIVELES SON UNA DECISION Y ESTAN ESCRITOS. Cada sonido se normaliza a un pico de diseno: los
  que suenan todo el tiempo (agarrar, soltar, un boton) van bien abajo y la victoria es lo mas fuerte
  del juego, porque es la recompensa.
- MONO Y 16 kHz. Un golpe de carta no tiene nada arriba de 8 kHz que valga los bytes.
"""
import av, base64, io, json, os, sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'audio', 'crudo')
SAL   = os.path.join(AQUI, 'audio')
SR    = 32000                      # tasa de trabajo

# ---- EL DISENO DE LA MEZCLA: pico de destino de cada sonido ----
# Lo que se dispara muchas veces por partida va abajo; lo que pasa una sola vez puede permitirse
# ocupar la pantalla entera. Un sonido de agarrar tan fuerte como la victoria convierte el juego en
# una matraca a los treinta segundos.
NIVEL = {
    'gana':0.98, 'uno':0.80, 'pierde':0.76, 'tira':0.70, 'mal':0.58, 'mas':0.62,
    'salta':0.56, 'gira':0.54, 'roba':0.50, 'color':0.50, 'turno':0.46,
    'reparte':0.46, 'agarra':0.30, 'deja':0.26, 'boton':0.30,
}
# largo maximo por sonido, en segundos: lo que pasa despues no es el sonido, es la cola de la sala
LARGO = {
    'gana':2.6, 'pierde':2.2, 'uno':1.2, 'reparte':1.4, 'mas':1.1, 'turno':1.2,
}
LARGO_DEF = 0.9

def leer(p, sr=SR):
    c = av.open(p); s = c.streams.audio[0]
    rs = av.AudioResampler(format='fltp', layout='mono', rate=sr)
    out = []
    for f in c.decode(s):
        for g in rs.resample(f): out.append(g.to_ndarray()[0].copy())
    for g in rs.resample(None): out.append(g.to_ndarray()[0].copy())
    c.close()
    return np.concatenate(out).astype(np.float32) if out else np.zeros(0, np.float32)

def env(x, ms=20):
    w = max(1, int(SR*ms/1000)); m = len(x)//w
    if m == 0: return np.zeros(0), w
    return np.sqrt((x[:m*w].reshape(m, w)**2).mean(1)), w

def recortar(x, minimo=0.12):
    """la rafaga de mas ENERGIA, con el umbral aflojandose hasta que quede algo que valga"""
    e, w = env(x)
    if len(e) == 0: return x
    for u in (0.20, 0.12, 0.07, 0.04, 0.02, 0.01):
        act = np.nonzero(e > e.max()*u)[0]
        if not len(act): continue
        a, b = act.min(), act.max()+1
        if (b-a)*w/SR >= minimo: break
    a = max(0, a*w - int(SR*0.012))          # 12 ms de aire antes del ataque
    b = min(len(x), b*w + int(SR*0.05))
    return x[a:b]

def sobre(x, ent=0.004, sal=0.030):
    n = len(x); a = min(int(SR*ent), n//4); b = min(int(SR*sal), n//3)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x

def remuestrear(x, de, a):
    if de == a: return x
    n = int(round(len(x)*a/de))
    return np.interp(np.linspace(0, len(x)-1, n), np.arange(len(x)), x).astype(np.float32)

def mp3(x, sr, kbps):
    buf = io.BytesIO()
    c = av.open(buf, 'w', format='mp3')
    st = c.add_stream('libmp3lame', rate=sr)
    st.bit_rate = kbps*1000
    try: st.layout = 'mono'
    except Exception: pass
    y = np.clip(x, -1, 1)
    paso = 1152*8
    for i in range(0, len(y), paso):
        t = y[i:i+paso].astype(np.float32).reshape(1, -1)
        f = av.AudioFrame.from_ndarray(np.ascontiguousarray(t), format='fltp', layout='mono')
        f.sample_rate = sr; f.pts = None
        for p in st.encode(f): c.mux(p)
    for p in st.encode(None): c.mux(p)
    c.close()
    return buf.getvalue()

def bucle(x, cola=1.2):
    """funde la cola sobre la cabeza: la costura deja de existir en vez de disimularse"""
    n = int(SR*cola)
    if len(x) <= n*2: return x
    cuerpo = x[:len(x)-n].copy()
    f = np.linspace(0, 1, n)
    cuerpo[:n] = cuerpo[:n]*f + x[len(x)-n:]*(1-f)
    return cuerpo

def picoDe(b):
    """decodifica lo que se acaba de codificar. Normalizar ANTES del MP3 y dar el numero por bueno es
       creerle a una cuenta que no se hizo: el remuestreo a la mitad de la tasa suaviza los picos
       angostos —medido, un campanazo se caia de 0,46 a 0,15— y el codificador tampoco conserva el
       pico. La unica forma de saber cuanto suena es abrir el archivo terminado."""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
        f.write(b); q=f.name
    try:
        y=leer(q, SR)
        return float(np.abs(y).max()) if len(y) else 0.0
    finally:
        os.unlink(q)

def informe(n, x, sr):
    return dict(nombre=n, seg=round(len(x)/sr, 3), pico=round(float(np.abs(x).max()), 3),
                rms=round(float(np.sqrt((x**2).mean())), 4))

def main():
    salida, med = {}, []

    # ---- los efectos ----
    for n in NIVEL:
        p = os.path.join(CRUDO, n+'.mp3')
        if not os.path.exists(p): print('falta', n); continue
        x = leer(p)
        x = recortar(x)
        lim = int(SR*LARGO.get(n, LARGO_DEF))
        if len(x) > lim: x = x[:lim]
        x = sobre(x)
        pk = float(np.abs(x).max())
        if pk > 1e-6: x *= NIVEL[n]/pk
        y = remuestrear(x, SR, 16000)
        b = mp3(y, 16000, 40)
        # SE MIDE EL RESULTADO Y SE CORRIGE. Dos pasadas alcanzan: la correccion es una multiplicacion
        # y el error del codificador no depende del nivel.
        for _ in range(2):
            real = picoDe(b)
            if real < 1e-5 or abs(real-NIVEL[n])/NIVEL[n] < 0.06: break
            y = np.clip(y*(NIVEL[n]/real), -1, 1)
            b = mp3(y, 16000, 40)
        salida[n] = base64.b64encode(b).decode()
        m = informe(n, y, 16000); m['picoReal'] = round(picoDe(b), 3)
        med.append(m)

    # ---- la musica ----
    for n, arch, kbps in (('mMenu','mMenu.m4a',44), ('mJuego','mJuego.m4a',44)):
        p = os.path.join(CRUDO, arch)
        if not os.path.exists(p): print('falta', n); continue
        x = leer(p)
        pk = float(np.abs(x).max())
        if pk > 1e-6: x *= 0.95/pk       # mJuego venia a 1,362, o sea RECORTADO
        x = bucle(x)
        y = remuestrear(x, SR, 22050)
        salida[n] = base64.b64encode(mp3(y, 22050, kbps)).decode()
        med.append(informe(n, y, 22050))

    js = 'const AUDIO_B64 = ' + json.dumps(salida, separators=(',', ':')) + ';\n'
    with open(os.path.join(SAL, 'audio_b64.js'), 'w') as f: f.write(js)
    with open(os.path.join(SAL, 'medido.json'), 'w') as f: json.dump(med, f, indent=1)

    tot = sum(len(v) for v in salida.values())
    for m in med: print(f"{m['nombre']:9s} {m['seg']:5.2f}s pico {m['pico']:.3f} rms {m['rms']:.4f} "
                        f"{len(salida[m['nombre']])//1024:4d} KB b64")
    print(f"--- {len(salida)} clips, {tot//1024} KB en base64")

if __name__ == '__main__':
    main()
