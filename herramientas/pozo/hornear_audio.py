#!/usr/bin/env python3
"""
HORNEA EL AUDIO DE POZO: de lo que devuelve Rezona a lo que entra en el HTML.

Las cuatro reglas, y las cuatro ya las pago este repo:

- SE RECORTA LA RAFAGA DE MAS ENERGIA, NO EL PICO MAS ALTO. Un clip generado trae
  respiraciones, aire y a veces un chasquido al final que MIDE MAS que el sonido.
  La energia —amplitud POR duracion— no se deja enganar: cinco cuadros de 0,2 suman
  0,2 y veintitres de 0,15 suman 0,52. En RECREO, quedarse con el pico devolvia un
  ladrido de 0,11 s cortado al medio.
- SE NIVELA POR RMS Y NO POR PICO. El pico no sabe cuanto dura: nivelando por pico,
  un chasquido de dos centesimas queda tan «fuerte» como un grito sostenido.
- Y ANTES DEL NIVELADO VA UNA `tanh`, CUYA FUERZA SE BUSCA. Un clip con pico 0,92 y
  rms 0,02 NO SE PUEDE SUBIR: el tope de pico lo baja todo otra vez. Se prueban seis
  fuerzas de la mas suave a la mas dura y se toma la primera que llega al objetivo
  con el pico por debajo del techo. Lo que ya tiene poca cresta no se aplasta de gusto.
- EL NIVEL SE MIDE SOBRE EL MP3 YA ESCRITO, CON EL LAZO CERRADO. Normalizar el float
  y dar el numero por bueno es creerle a una cuenta que no se hizo: a bitrate bajo el
  codificador se lleva casi todo el brillo, y en un transitorio ahi esta la mayor
  parte de la energia. En los casuales el error medido era de UN TERCIO, igual en las
  tres familias.

Y la costura del bucle se FUNDE: un tema cortado en seco y puesto a repetir da un
golpe cada vuelta, y ese golpe se escucha mas que la musica.
"""
import av, base64, io, json, os, sys
import numpy as np

AQUI  = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'crudo')
SAL   = os.path.join(AQUI, 'partes', 'i_son.js')
SR    = 32000                      # tasa de trabajo
SR_FX, SR_MUS = 22050, 32000       # tasa de salida
KB_FX, KB_MUS = 48, 56
FUNDE = 1.4                        # segundos de cola fundida sobre la cabeza

# ---- EL DISENO DE LA MEZCLA: rms de destino ----
# Lo que se dispara cien veces por partida va ABAJO; lo que pasa una sola vez puede
# ocupar la pantalla. Un disparo tan fuerte como la victoria convierte el juego en una
# matraca a los treinta segundos. Y `dano` —que te pegaron A VOS— va por encima de
# `muere` y de `pega`: es la unica informacion del audio que cuesta la partida.
NIVEL = {
    'tira':0.055, 'pega':0.060, 'esquiva':0.060, 'ui':0.070,
    'muere':0.085, 'moneda':0.090, 'puerta':0.100,
    'cura':0.110, 'cofre':0.110, 'baja':0.120,
    'limpia':0.130, 'mejora':0.130, 'dano':0.140,
    'jefe':0.170, 'gana':0.180, 'pierde':0.180,
}
MUS = {'m_menu':0.045, 'm_pelea':0.048, 'm_jefe':0.050}
# largo maximo: lo que viene despues no es el sonido, es la cola de la sala
LARGO = {'gana':2.8, 'pierde':2.6, 'jefe':2.0, 'baja':1.8, 'puerta':1.6,
         'limpia':1.5, 'cofre':1.5, 'mejora':1.3, 'cura':1.3, 'muere':1.1}
LARGO_DEF = 0.9
TECHO = 0.985


def lee(p, sr=SR):
    c = av.open(p); s = c.streams.audio[0]
    rs = av.AudioResampler(format='fltp', layout='mono', rate=sr)
    out = []
    for f in c.decode(s):
        for g in rs.resample(f): out.append(g.to_ndarray()[0].copy())
    for g in rs.resample(None): out.append(g.to_ndarray()[0].copy())
    c.close()
    return np.concatenate(out).astype(np.float32) if out else np.zeros(0, np.float32)


def rms(x):
    return float(np.sqrt(np.mean(x.astype(np.float64)**2))) if len(x) else 0.0


def env(x, ms=20):
    w = max(1, int(SR*ms/1000)); m = len(x)//w
    if m == 0: return np.zeros(0), w
    return np.sqrt((x[:m*w].reshape(m, w)**2).mean(1)), w


def recorta(x, minimo=0.12):
    """la rafaga de mas ENERGIA, con el umbral aflojandose hasta que quede algo"""
    e, w = env(x)
    if len(e) == 0: return x
    a = b = 0
    for u in (0.20, 0.12, 0.07, 0.04, 0.02, 0.01):
        act = np.nonzero(e > e.max()*u)[0]
        if not len(act): continue
        a, b = int(act.min()), int(act.max())+1
        if (b-a)*w/SR >= minimo: break
    a = max(0, a*w - int(SR*0.012))       # 12 ms de aire antes del ataque
    b = min(len(x), b*w + int(SR*0.05))
    x = x[a:b].copy()
    n = min(int(SR*0.006), len(x)//8)
    if n > 1:
        x[:n] *= np.linspace(0, 1, n)
        m = min(int(SR*0.030), len(x)//3)
        x[-m:] *= np.linspace(1, 0, m)
    return x


def bucle(x, seg=FUNDE):
    """funde la cola sobre la cabeza: la costura deja de existir en vez de disimularse"""
    n = int(SR*seg)
    if len(x) <= n*2: return x
    cuerpo = x[:len(x)-n].copy()
    f = np.linspace(0, 1, n)
    cuerpo[:n] = cuerpo[:n]*f + x[len(x)-n:]*(1-f)
    return cuerpo


def nivela(x, obj):
    """aplasta la punta lo MINIMO que haga falta y despues escala al objetivo"""
    for k in (1.0, 1.4, 2.0, 3.0, 4.5, 7.0):
        y = np.tanh(x*k)/np.tanh(k) if k > 1.0 else x.copy()
        r = rms(y)
        if r < 1e-6: continue
        g = obj/r
        if float(np.max(np.abs(y)))*g <= TECHO:
            return (y*g).astype(np.float32)
    # Ni con la mas dura llega. NO se fuerza: un transitorio tiene su energia en dos
    # centesimas y un rms bajo es lo que un golpe ES; aplastarlo hasta el objetivo lo
    # convierte en un zumbido. Suena fuerte igual, porque su PICO si llega al tope.
    y = np.tanh(x*7)/np.tanh(7)
    return (y*(TECHO/max(1e-6, float(np.max(np.abs(y)))))).astype(np.float32)


def remuestrea(x, de, a):
    if de == a: return x
    n = int(round(len(x)*a/de))
    return np.interp(np.linspace(0, len(x)-1, n), np.arange(len(x)), x).astype(np.float32)


def mp3(x, sr, kbps):
    buf = io.BytesIO()
    c = av.open(buf, 'w', format='mp3')
    st = c.add_stream('libmp3lame', rate=sr); st.bit_rate = kbps*1000
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


def rmsDe(b):
    """abre lo que se acaba de escribir: es la unica forma de saber cuanto suena"""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
        f.write(b); q = f.name
    try: return rms(lee(q, SR))
    finally: os.unlink(q)


def fuente(n):
    for s in (n + '.mp3', n + '.wav', n + '-g1.mp3', n + '-g1.wav'):
        p = os.path.join(CRUDO, s)
        if os.path.exists(p): return p
    return None


def hornea(n, obj, mus):
    p = fuente(n)
    if not p: return None, 'falta'
    x = lee(p)
    if not len(x): return None, 'vacio'
    if mus:
        x = bucle(x)
        sal, kb = SR_MUS, KB_MUS
    else:
        x = recorta(x)
        lim = int(SR*LARGO.get(n, LARGO_DEF))
        if len(x) > lim: x = x[:lim]
        sal, kb = SR_FX, KB_FX
    # ---- EL LAZO CERRADO: se escribe, se mide lo que se va a oir, y se corrige ----
    b = None
    for _ in range(3):
        y = remuestrea(nivela(x, obj), SR, sal)
        b = mp3(y, sal, kb)
        r = rmsDe(b)
        if r < 1e-6: break
        if abs(r - obj)/obj < 0.06: break
        x = x*(obj/r)
    r = rmsDe(b)
    return b, 'seg %5.2f  rms %.4f (de %.4f)  %5.1f KB b64' % (
        len(y)/sal, r, obj, len(b)*4/3/1024)


def main():
    solo = sys.argv[1:] 
    salida, filas = {}, []
    for n, obj in list(NIVEL.items()) + list(MUS.items()):
        if solo and n not in solo: continue
        b, info = hornea(n, obj, n in MUS)
        if b is None:
            print('%-9s %s' % (n, info)); continue
        salida[n] = base64.b64encode(b).decode()
        filas.append('%-9s %s' % (n, info))
    if not salida:
        print('nada horneado'); return
    cab = ('/* Generado por herramientas/pozo/hornear_audio.py — NO editar a mano.\n'
           '   Los crudos viven en herramientas/pozo/crudo/ y NO se versionan; lo que si se\n'
           '   versiona es crudo/tareas.json, porque perder un task_id es perder un asset pagado. */\n')
    with open(SAL, 'w') as f:
        f.write(cab + 'const SONB = ' + json.dumps(salida, separators=(',', ':')) + ';\n')
    for r in filas: print(r)
    tot = sum(len(v) for v in salida.values())
    print('--- %d clips, %d KB en base64' % (len(salida), tot//1024))


if __name__ == '__main__':
    main()
