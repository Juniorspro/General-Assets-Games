#!/usr/bin/env python3
"""
HORNEA LOS EFECTOS DE DASH, CRUCE, DESPEGUE Y CUBOS.

Uno solo para los cuatro: escrito cuatro veces, el dia que se corrija un defecto
del nivelado quedan tres sin corregir. Lo unico que cambia por juego es la tabla
de niveles, que es una decision de mezcla y no un detalle tecnico.

LAS CUATRO REGLAS, TODAS PAGADAS EN VUELTAS ANTERIORES DE ESTE REPO:

1. SE RECORTA POR ENERGIA Y NO POR PICO. Un clip generado trae el sonido en algun
   lado y silencio alrededor, y a veces un chasquido suelto al final que mide MAS
   que el sonido. La energia —amplitud POR duracion— no se deja enganar. Y el
   umbral se afloja hasta que quede algo: un efecto que viene bajito se recorta
   entero y queda un click de treinta milisegundos.

2. SE NIVELA POR RMS Y NO POR PICO, con una `tanh` antes cuya fuerza se BUSCA.
   El pico no sabe cuanto dura: nivelando por pico, un chasquido de dos
   centesimas queda tan «fuerte» como una fanfarria. Y un clip con pico 0,92 y
   rms 0,02 no se puede subir sin la tanh — el tope de pico lo baja todo otra
   vez. Lo que ya tiene poca cresta no se aplasta de gusto.

3. EL LAZO SE CIERRA SOBRE EL MP3 YA ESCRITO. A bitrate bajo el codificador se
   lleva casi todo el brillo, y en un transitorio ahi esta la mayor parte de la
   energia: normalizar el float y dar el numero por bueno es creerle a una cuenta
   que describe un archivo que no existe. Se escribe, se mide lo que se va a oir,
   se corrige, hasta tres veces.

4. LO SINTETIZADO NO SE BORRA. Cada juego conserva sus osciladores: si un MP3 no
   decodifica —un navegador viejo, un base64 cortado— suena el de siempre. Un
   juego mudo por un decodificador es peor que un juego con bips, y ya paso una
   vez en Campo de Tiro.

    python3 herramientas/audio_juegos/hornear.py [juego...]
"""
import base64, io, json, os, sys
import numpy as np
import av

AQUI  = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'crudo')
BAJA  = '/tmp/rez_cruce/assets'        # donde el servidor deja la descarga
SR    = 32000                          # tasa de trabajo
SR_SAL, KBPS = 16000, 40

# ── EL DISENO DE LA MEZCLA ──
# Lo que se dispara cien veces por partida va abajo; lo que pasa una vez puede
# ocupar la pantalla. Un sonido de poner un bloque tan fuerte como la fanfarria
# convierte el juego en una matraca a los treinta segundos.
RMS = {
  'dash':     {'gana':0.185, 'muere':0.150, 'pad':0.115, 'portal':0.105,
               'moneda':0.100, 'salta':0.075},
  'cruce':    {'record':0.185, 'tren':0.150, 'auto':0.140, 'carancho':0.140,
               'bocina':0.125, 'agua':0.110, 'compra':0.110, 'aviso':0.105,
               'moneda':0.095, 'no':0.090, 'salto':0.070, 'toque':0.055},
  'despegue': {'record':0.185, 'explota':0.160, 'maximo':0.150, 'capa':0.130,
               'golpe':0.125, 'ya':0.120, 'compra':0.110, 'cuenta':0.105,
               'moneda':0.095, 'planea':0.090, 'no':0.090, 'rafaga':0.085,
               'toque':0.055},
  'cubos':    {'fin':0.185, 'reloj':0.130, 'nada':0.115, 'pal':0.090,
               'ui':0.080, 'sac':0.075, 'pon':0.070},
}
LARGO_DEF = 1.0
LARGO = {'dash.gana':2.4, 'cruce.record':2.2, 'despegue.record':2.2,
         'despegue.explota':1.8, 'cubos.fin':2.6, 'cubos.reloj':1.6}


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
    return float(np.sqrt((x.astype(np.float64)**2).mean())) if len(x) else 0.0


def recorta(x, minimo=0.10):
    """la rafaga de mas ENERGIA, con el umbral aflojandose hasta que quede algo"""
    w = max(1, int(SR*0.020)); m = len(x)//w
    if m == 0: return x
    e = np.sqrt((x[:m*w].reshape(m, w)**2).mean(1))
    a, b = 0, m
    for u in (0.20, 0.12, 0.07, 0.04, 0.02, 0.01):
        act = np.nonzero(e > e.max()*u)[0]
        if not len(act): continue
        a, b = act.min(), act.max() + 1
        if (b - a)*w/SR >= minimo: break
    a = max(0, a*w - int(SR*0.012))          # 12 ms de aire antes del ataque
    b = min(len(x), b*w + int(SR*0.05))
    return x[a:b]


def sobre(x, ent=0.004, sal=0.030):
    """entra y sale con rampa: un corte en seco da un click que se oye mas que el efecto"""
    n = len(x); a = min(int(SR*ent), n//4); b = min(int(SR*sal), n//3)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x


def nivela(x, obj):
    """aplasta la punta lo MINIMO que haga falta y despues escala al objetivo"""
    for k in (1.0, 1.4, 2.0, 3.0, 4.5, 7.0):
        y = np.tanh(x*k)/np.tanh(k) if k > 1.0 else x.copy()
        r = rms(y)
        if r < 1e-6: continue
        g = obj/r
        if np.max(np.abs(y))*g <= 0.985: return y*g
    y = np.tanh(x*7)/np.tanh(7)
    return y*(0.985/max(1e-6, np.max(np.abs(y))))


def remuestrea(x, de, a):
    if de == a: return x
    n = int(round(len(x)*a/de))
    return np.interp(np.linspace(0, len(x)-1, n), np.arange(len(x)), x).astype(np.float32)


def escribe(x, sr, kbps, p):
    c = av.open(p, 'w', format='mp3')
    st = c.add_stream('libmp3lame', rate=sr); st.bit_rate = kbps*1000
    try: st.layout = 'mono'
    except Exception: pass
    y = np.clip(x, -1, 1); paso = 1152*8
    for i in range(0, len(y), paso):
        t = y[i:i+paso].astype(np.float32).reshape(1, -1)
        f = av.AudioFrame.from_ndarray(np.ascontiguousarray(t), format='fltp', layout='mono')
        f.sample_rate = sr; f.pts = None
        for q in st.encode(f): c.mux(q)
    for q in st.encode(None): c.mux(q)
    c.close()


def hornea(juego, clave, obj):
    """devuelve (bytes, informe) o (None, motivo)"""
    nom = juego + '_' + clave
    src = os.path.join(CRUDO, nom + '.mp3')
    if not os.path.exists(src):
        baja = os.path.join(BAJA, nom + '-g1.mp3')
        if not os.path.exists(baja): return None, 'falta'
        os.makedirs(CRUDO, exist_ok=True)
        io.open(src, 'wb').write(io.open(baja, 'rb').read())   # el repo se queda con el crudo
    crudo = lee(src)
    # ── UN CLIP MUDO SE RECHAZA, NO SE HORNEA ──
    # Es la falla de siempre de este generador y ya costo tandas en RezUno y en
    # los casuales: se le pide un sonido chiquito y devuelve un archivo del
    # tamano correcto, con cabecera, y en silencio. Medido, `cubos_pal` volvio
    # con pico 0,0001. Horneado igual quedaria un MP3 de un kilobyte que no
    # suena y que ademas TAPA al sintetizado, porque el juego prefiere la
    # muestra: peor que no tenerlo.
    if float(np.abs(crudo).max()) < 0.02:
        return None, 'mudo'
    x = recorta(crudo)
    lim = int(SR*LARGO.get(juego + '.' + clave, LARGO_DEF))
    if len(x) > lim: x = x[:lim]
    x = sobre(x)
    y0 = remuestrea(x, SR, SR_SAL)
    tmp = '/tmp/_hj.mp3'
    y = y0
    for _ in range(3):
        escribe(nivela(y, obj), SR_SAL, KBPS, tmp)
        r = rms(lee(tmp, SR_SAL))
        if r < 1e-6 or abs(r - obj)/obj < 0.06: break
        y = y*(obj/r)
    # ── Y EL RMS NO PUEDE COMPRAR UN PICO POR ENCIMA DE UNO ──
    # El lazo persigue el rms y el codificador se pasa entre muestras: medido,
    # `dash_gana` salio con pico 1,013, o sea recortando al reproducir. El techo
    # manda sobre el objetivo — un clip que recorta suena peor que uno flojo.
    z = lee(tmp, SR_SAL)
    pk = float(np.abs(z).max()) if len(z) else 0.0
    if pk > 0.985:
        escribe(np.clip(nivela(y, obj)*(0.985/pk), -1, 1), SR_SAL, KBPS, tmp)
    d = io.open(tmp, 'rb').read()
    z = lee(tmp, SR_SAL)
    return d, dict(clave=clave, seg=round(len(z)/SR_SAL, 3),
                   rms=round(rms(z), 4), obj=obj,
                   pico=round(float(np.abs(z).max()), 3),
                   kb=round(len(d)*4/3/1024, 1))


def main():
    juegos = sys.argv[1:] or list(RMS)
    for j in juegos:
        salida, med, faltan = {}, [], []
        for k, obj in RMS[j].items():
            d, inf = hornea(j, k, obj)
            if d is None: faltan.append(k); continue
            salida[k] = base64.b64encode(d).decode(); med.append(inf)
        # ── UN SET A MEDIAS NO SE ESCRIBE ──
        # Dos efectos grabados entre diez osciladores se escuchan a DOS juegos
        # distintos, asi que un juego se enchufa entero o no se enchufa. Y
        # dejando el `i_sfx.js` igual queda un archivo vivo que no lee nadie, que
        # es lo peor de los dos mundos: el dia que se toque va a estar roto sin
        # que nada lo diga. Se escribe cuando falta como mucho un clip, que es lo
        # que el alias o el respaldo sintetizado tapan sin que se note.
        if len(faltan) > 1:
            print('%-9s %d de %d — NO se escribe: faltan %s' %
                  (j, len(salida), len(RMS[j]), ','.join(faltan)))
            continue
        if not salida:
            print('%-9s sin un solo clip' % j)
            continue
        p = os.path.join(os.path.dirname(AQUI), j, 'partes', 'i_sfx.js')
        io.open(p, 'w', encoding='utf-8').write(
            '/* Generado por herramientas/audio_juegos/hornear.py — NO editar a mano. */\n'
            'const SFX_B64 = ' + json.dumps(salida, separators=(',', ':')) + ';\n')
        tot = sum(len(v) for v in salida.values())
        print('== %s: %d clips, %d KB en base64%s' %
              (j, len(salida), tot//1024, '   faltan: ' + ','.join(faltan) if faltan else ''))
        for m in med:
            print('   %-9s %5.2fs  rms %.4f (obj %.3f)  pico %.3f  %5.1f KB' %
                  (m['clave'], m['seg'], m['rms'], m['obj'], m['pico'], m['kb']))
        json.dump(med, io.open(os.path.join(AQUI, 'medido_%s.json' % j), 'w'), indent=1)


if __name__ == '__main__':
    main()
