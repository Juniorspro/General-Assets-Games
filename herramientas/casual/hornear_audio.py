# -*- coding: utf-8 -*-
"""Los siete temas y los ocho efectos, horneados en base64 dentro de cada juego.

CUATRO COSAS QUE SE APRENDIERON ANTES Y ESTAN ACA:

1. EL NIVEL SE MIDE SOBRE EL MP3 YA ESCRITO, NO SOBRE EL FLOAT. Es la leccion de
   PUERTA BLANCA: nivelando en el float y dando el numero por bueno, los
   veinticinco sonidos salieron a DOS TERCIOS de lo pedido — el codificador se
   lleva casi todo el brillo a bitrate bajo, y en un chasquido ahi esta la mayor
   parte de la energia. Se escribe, se mide lo que se va a oir, se corrige y se
   vuelve a escribir.

2. SE NIVELA POR RMS Y NO POR PICO. El pico no sabe cuanto dura: nivelando por
   pico, un chasquido de dos centesimas queda tan «fuerte» como un tema entero.
   Y antes del nivelado va una `tanh` que aplasta la punta, porque un clip con
   pico 0,92 y rms 0,02 NO SE PUEDE SUBIR — el tope de pico lo baja todo otra
   vez. La fuerza de la tanh se BUSCA, de la mas suave a la mas dura: lo que ya
   tiene poca cresta no se aplasta de gusto.

3. LA MUSICA SE FUNDE SOBRE SI MISMA. Un tema cortado en seco y puesto en bucle
   da un golpe en cada vuelta, y ese golpe se escucha MAS que la musica.

4. Y LOS EFECTOS SE RECORTAN POR LOS EXTREMOS. El generador deja medio segundo
   de silencio en cada punta, y eso en un sonido que se dispara cien veces por
   partida es medio segundo de retardo en cada disparo.

LA ESCALA ES LA DE SIEMPRE EN ESTE REPO: la cama de musica MUY por debajo de un
acierto, porque si compiten el acierto deja de ser un acontecimiento.
"""
import base64, io, json, os, re, sys
import numpy as np

try:
    import av
except ImportError:
    print('hace falta PyAV'); sys.exit(1)

AQUI = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(AQUI, 'assets')
CRUDO = os.environ.get('AUDIO_DIR', '/tmp/rez_cas/assets/casual')

# clave en el juego -> (archivo, es_musica, rms objetivo)
MUSICA = {'menu': 'm_menu'}
FX = {'fusion': 's_fusion', 'suelta': 's_suelta', 'pop': 's_pop', 'clic': 's_clic',
      'caida': 's_caida', 'dado': 's_dado', 'gana': 's_gana', 'perder': 's_perder'}
# el tema de partida de cada juego entra con la clave `mus`, que es la que el
# nucleo pide: asi el juego no tiene que saber como se llama su propio tema
POR_JUEGO = {j: 'm_' + j for j in
             ['frutas', 'tubos', 'torre', 'burbujas', 'chispa', 'dados', 'canica', 'piedra']}

# ── Y LOS JUEGOS QUE TRAEN SUS PROPIOS EFECTOS ──
# Los ocho casuales comparten los ocho efectos porque comparten los verbos:
# tocar, caer, fusionar. Un duelo de arqueros no: tensar un arco, soltarlo y
# clavar una flecha no son «pop» ni «dado» con otro nombre, y usarlos seria
# ponerle a un juego el sonido de otro. La clave de la izquierda es la que el
# juego pide (via SON_ALIAS) y la de la derecha el archivo generado.
PROPIOS = {
    'arco': {'tensa': 'a_tensa', 'tira': 'a_tira', 'clava': 'a_clava',
             'grito': 'a_grito', 'mus': 'm_arco'},
    'castillo': {'tensa': 'k_tensa', 'tira': 'k_tira', 'clava': 'k_clava',
                 'grito': 'k_grito', 'mus': 'm_castillo'},
    'penal': {'tensa': 'p_tensa', 'tira': 'p_tira', 'clava': 'p_clava',
              'grito': 'p_grito', 'mus': 'm_penal'},
    'duelo': {'tensa': 'd_tensa', 'tira': 'd_tira', 'clava': 'd_clava',
              'grito': 'd_grito', 'mus': 'm_duelo'},
    'pesca': {'tensa': 's_tensa', 'tira': 's_tira', 'clava': 's_clava',
              'grito': 's_grito', 'mus': 'm_pesca'},
}

RMS_MUS = 0.045          # la cama
RMS_FX = 0.150           # un acierto: mas de tres veces la cama
SR_MUS, KB_MUS = 22050, 48
SR_FX, KB_FX = 16000, 40
FUNDE = 1.4              # segundos de cola fundida sobre la cabeza


def lee(p):
    c = av.open(p)
    s = c.streams.audio[0]
    rs = av.audio.resampler.AudioResampler(format='fltp', layout='mono', rate=48000)
    tr = []
    for fr in c.decode(s):
        for f in rs.resample(fr):
            tr.append(f.to_ndarray()[0].copy())
    c.close()
    return np.concatenate(tr) if tr else np.zeros(1, np.float32)


def escribe(x, sr, kb, p):
    x = np.clip(x, -1, 1)
    c = av.open(p, 'w')
    st = c.add_stream('mp3', rate=sr)
    st.bit_rate = kb*1000
    rs = av.audio.resampler.AudioResampler(format='s16', layout='mono', rate=sr)
    fr = av.AudioFrame.from_ndarray((x*32767).astype(np.int16).reshape(1, -1),
                                    format='s16', layout='mono')
    fr.sample_rate = 48000
    for f in rs.resample(fr):
        for pk in st.encode(f):
            c.mux(pk)
    for pk in st.encode(None):
        c.mux(pk)
    c.close()


def rms(x):
    return float(np.sqrt(np.mean(x.astype(np.float64)**2))) if len(x) else 0.0


def recorta(x, umb=0.012):
    m = np.abs(x) > umb
    if not m.any():
        return x
    i, j = int(np.argmax(m)), len(m) - int(np.argmax(m[::-1]))
    x = x[max(0, i - 240):min(len(x), j + 2400)]
    n = min(240, len(x)//8)
    if n > 1:
        x[:n] *= np.linspace(0, 1, n)
        x[-n:] *= np.linspace(1, 0, n)
    return x


def bucle(x, sr, seg):
    n = int(seg*sr)
    if len(x) < n*3:
        return x
    cab, cola = x[:n].copy(), x[-n:].copy()
    f = np.linspace(0, 1, n)
    return np.concatenate([cab*f + cola*(1 - f), x[n:-n]])


def nivela(x, obj):
    """aplasta la punta lo MINIMO que haga falta y despues escala al objetivo"""
    for k in (1.0, 1.4, 2.0, 3.0, 4.5, 7.0):
        y = np.tanh(x*k)/np.tanh(k) if k > 1.0 else x.copy()
        r = rms(y)
        if r < 1e-6:
            continue
        g = obj/r
        if np.max(np.abs(y))*g <= 0.985:
            return y*g
    # ── Y SI NI CON LA TANH MAS DURA LLEGA, SE DEJA EN EL TOPE DE PICO ──
    # Medido: `pop`, `clic` y `suelta` quedan en rms 0,098 a 0,118 contra los
    # 0,150 pedidos. NO es un defecto que haya que forzar: son transitorios, o
    # sea que su energia esta concentrada en dos centesimas de segundo y un rms
    # bajo es lo que un pop ES. Aplastarlos hasta 0,150 los convertiria en un
    # zumbido — y suenan fuerte igual, porque su PICO si llega al tope.
    y = np.tanh(x*7)/np.tanh(7)
    return y*(0.985/max(1e-6, np.max(np.abs(y))))


def hornea(nom, mus):
    # `crudo/` es lo que el repo versiona; el directorio con `-g1` es donde el
    # servidor deja la descarga. Se prueban los dos, en ese orden.
    src = os.path.join(AQUI, 'crudo', nom + '.mp3')
    if not os.path.exists(src):
        src = os.path.join(CRUDO, nom + '-g1.mp3')
    if not os.path.exists(src):
        return None, 'falta'
    x = lee(src)
    sr, kb, obj = (48000, KB_MUS, RMS_MUS) if mus else (48000, KB_FX, RMS_FX)
    x = bucle(x, sr, FUNDE) if mus else recorta(x)
    sal = SR_MUS if mus else SR_FX
    tmp = '/tmp/_h.mp3'
    # ── EL LAZO CERRADO ──
    for _ in range(3):
        escribe(nivela(x, obj), sal, kb, tmp)
        r = rms(lee(tmp))
        if r < 1e-6:
            break
        if abs(r - obj)/obj < 0.06:
            break
        x = x*(obj/r)
    d = open(tmp, 'rb').read()
    return d, '%5.1f KB  rms %.4f' % (len(d)*4/3/1024, rms(lee(tmp)))


def mete(jid, son):
    p = os.path.join(ASSETS, jid + '.js')
    cab = '/* Generado por herramientas/casual/hornear*.py — NO editar a mano. */\n'
    AS = {'img': {}, 'son': {}}
    if os.path.exists(p):
        s = io.open(p, encoding='utf-8').read()
        m = re.search(r'const AS = (\{.*\});\s*$', s, re.S)
        if m:
            AS = json.loads(m.group(1))
        cab = s[:s.index('const AS =')]
    AS.setdefault('son', {})
    AS['son'].update(son)
    io.open(p, 'w', encoding='utf-8').write(
        cab + 'const AS = ' + json.dumps(AS, separators=(',', ':')) + ';\n')


def presta(jid, claves):
    """Los clips ya horneados de otro juego, tal cual."""
    p = os.path.join(ASSETS, jid + '.js')
    if not os.path.exists(p):
        print('  no hay de donde prestar (%s)' % jid)
        return {}
    m = re.search(r'const AS = (\{.*\});\s*$', io.open(p, encoding='utf-8').read(), re.S)
    if not m:
        return {}
    src = json.loads(m.group(1)).get('son', {})
    out = {k: src[k] for k in claves if k in src}
    print('  prestados de %s: %s' % (jid, ', '.join(sorted(out)) or 'nada'))
    return out


def main():
    cache = {}

    def dat(nom, mus):
        if nom not in cache:
            d, msg = hornea(nom, mus)
            print('  %-11s %s' % (nom, msg))
            cache[nom] = d
        return cache[nom]

    for j, tema in POR_JUEGO.items():
        print(j)
        son = {}
        for k, n in list(MUSICA.items()) + [('mus', tema)]:
            d = dat(n, True)
            if d:
                son[k] = base64.b64encode(d).decode()
        for k, n in FX.items():
            d = dat(n, False)
            if d:
                son[k] = base64.b64encode(d).decode()
        mete(j, son)

    for j, propios in PROPIOS.items():
        print(j)
        son = {}
        # ── LO COMPARTIDO SE PRESTA DE OTRO JUEGO YA HORNEADO ──
        # El tema del menu y los efectos de interfaz son los mismos en los diez
        # juegos, y ya estan horneados. Volver a generarlos costaria cuatro
        # llamadas para obtener algo que sonaria DISTINTO, y entonces el menu de
        # ARCO tendria otra musica que el de los otros ocho sin que nadie lo
        # haya pedido. Se copian los bytes, que ademas es exacto.
        son.update(presta('dados', ['menu', 'clic', 'gana', 'perder']))
        for k, n in propios.items():
            d = dat(n, n.startswith('m_'))
            if d:
                son[k] = base64.b64encode(d).decode()
        mete(j, son)


if __name__ == '__main__':
    main()
