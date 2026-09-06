#!/usr/bin/env python3
"""Hornea los assets de PISTOLA y escribe partes/as.js.

    python3 herramientas/pistola/hornear.py

Tres familias y tres tratamientos distintos, y cada uno resuelve un problema:

1. LAS TEXTURAS van a WebP de 512 y COSIDAS POR LOS CUATRO BORDES. Al modelo se
   le pidieron «sin costura» y ninguna imagen generada lo es de verdad; en vez de
   coserlas a mano —que ensucia justo el centro— el juego las repite con
   `MirroredRepeatWrapping`, asi que los dos bordes que se tocan son EL MISMO
   borde y la costura no puede existir. Aca lo unico que se hace es achicarlas.

2. LOS SONIDOS se nivelan MIDIENDO EL MP3 YA ESCRITO y no el float. A bitrate
   bajo el codificador se lleva casi todo el brillo, y en un disparo ahi esta la
   mayor parte de la energia: la cuenta hecha sobre el float describe un archivo
   que no existe. Se escribe, se mide lo que se va a oir, se corrige y se vuelve
   a escribir.

3. LOS MODELOS van con la textura HORNEADA EN LOS VERTICES antes de decimar: con
   las UV puestas el simplificador tiene que respetar las costuras y se planta.
   Y con `-noq`, porque la cuantizacion de gltfpack entra como
   `KHR_mesh_quantization` en `extensionsRequired` y un lector que no la soporte
   no muestra NADA.
"""
import base64, io, json, os, subprocess, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lemi'))
AQUI = os.path.dirname(os.path.abspath(__file__))
CRUDO = os.path.join(AQUI, 'crudo')
TMP = '/tmp/pist_h'
os.makedirs(TMP, exist_ok=True)

TEXTURAS = ['p_pared', 'p_losa', 'p_acero', 'p_caja', 'p_suelo']
MODELOS = ['p_pistola']   # el del ladron se genero, se probo y se descarto: ver h.js
# ── EL NIVEL DE CADA FAMILIA, Y ES UNA ESCALA Y NO UN GUSTO ──
# El disparo es lo que suena cien veces por partida, asi que va abajo; perder una
# vida y ganar son acontecimientos y tienen que hablar mas fuerte que el resto.
NIVEL = {'s_tiro': 0.115, 's_mata': 0.150, 's_caja': 0.130, 's_ladtira': 0.120,
         's_dano': 0.185, 's_gana': 0.170, 's_pierde': 0.170, 'm_pistola': 0.045}


def rms(x):
    return float(np.sqrt(np.mean(x.astype(np.float64)**2))) if len(x) else 0.0


def hornea_tex(k, lado=512):
    im = Image.open(os.path.join(CRUDO, k + '.png')).convert('RGB')
    im = im.resize((lado, lado), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=82, method=5)
    return b.getvalue()


def hornea_son(k):
    """Nivela por RMS con un aplastado suave de la punta, y CIERRA EL LAZO:
    mide el MP3 escrito y corrige hasta tres veces."""
    import av
    obj = NIVEL[k]
    ent = os.path.join(CRUDO, k + '.mp3')
    with av.open(ent) as c:
        s = c.streams.audio[0]
        tr = av.audio.resampler.AudioResampler(format='fltp', layout='mono', rate=32000)
        tro = []
        for fr in c.decode(s):
            for f in tr.resample(fr): tro.append(f.to_ndarray()[0])
    x = np.concatenate(tro) if tro else np.zeros(1, np.float32)
    # el silencio de los extremos se va: un efecto que empieza medio segundo
    # despues del disparo se lee a que el juego va lento
    umb = max(1e-4, np.abs(x).max()*0.02)
    idx = np.where(np.abs(x) > umb)[0]
    if len(idx) > 40: x = x[max(0, idx[0]-320): idx[-1]+960]
    n = 32000//200
    x[:n] *= np.linspace(0, 1, n); x[-n:] *= np.linspace(1, 0, n)
    if k.startswith('m_'):
        # la cola se funde sobre la cabeza: un tema cortado en seco da un golpe
        # en cada vuelta que se escucha mas que la musica
        f = min(len(x)//4, 32000)
        x = x.copy(); x[:f] = x[:f]*np.linspace(0, 1, f) + x[-f:]*np.linspace(1, 0, f)
        x = x[:-f]
    g = obj/max(1e-6, rms(x))
    ruta = os.path.join(TMP, k + '.mp3')
    br = '56k' if k.startswith('m_') else '40k'
    for _ in range(3):
        # la `tanh` aplasta la punta con la fuerza MAS SUAVE que respete el tope:
        # con la fuerza clavada, lo que decide el nivel final es el pico y no el
        # objetivo, y un gluglu de mucha cresta queda cuatro veces por debajo
        for fu in (1.0, 1.4, 2.0, 2.8, 3.8):
            y = np.tanh(x*g*fu)/fu
            if np.abs(y).max() <= 0.985: break
        with av.open(ruta, 'w') as o:
            st = o.add_stream('mp3', rate=32000)
            st.bit_rate = int(br[:-1])*1000
            fr = av.AudioFrame.from_ndarray(np.ascontiguousarray(
                (y*32767).astype(np.int16).reshape(1, -1)), format='s16', layout='mono')
            fr.sample_rate = 32000
            for pk in st.encode(fr): o.mux(pk)
            for pk in st.encode(): o.mux(pk)
        with av.open(ruta) as c:
            s = c.streams.audio[0]
            tr = av.audio.resampler.AudioResampler(format='fltp', layout='mono', rate=32000)
            tro = [f.to_ndarray()[0] for fr in c.decode(s) for f in tr.resample(fr)]
        z = np.concatenate(tro) if tro else np.zeros(1, np.float32)
        r = rms(z)
        if abs(r - obj) < obj*0.06: break
        g *= obj/max(1e-6, r)
    return io.open(ruta, 'rb').read(), r


def hornea_mod(k):
    """La pistola NO se decima y NO se hornea a color por vertice.

    ── Y ESA ES LA CORRECCION DE ESTA VUELTA ──
    El horneado de vertices existe para poder decimar: sin UV el simplificador no
    tiene costuras que respetar. Pero la pistola entra con 5.612 triangulos, que
    no es nada para el unico objeto que esta SIEMPRE en pantalla y se mira de
    cerca — decimarla al 55 % solo servia para tirarle el diseño. Medido, el
    color por vertice devolvia una media de 0,089 en lineal: un bulto negro.
    Sin decimar se puede conservar la textura, que es donde esta el diseño.

    Lo unico que se hace es sacarle las TRES imagenes que trae Tripo —color,
    metal-rugosidad y normales, 2,4 MB— y devolver la de color aparte, achicada.
    """
    import hornear_props as HP
    js, bn = HP.carga(os.path.join(CRUDO, k + '.glb'))
    img = js['images'][0]
    bvi = js['bufferViews'][img['bufferView']]
    o = bvi.get('byteOffset', 0)
    tex = Image.open(io.BytesIO(bn[o:o+bvi['byteLength']])).convert('RGB')
    tex = tex.resize((256, 256), Image.LANCZOS)
    # ── Y SE LEVANTA, PORQUE EL ARMA ES EL HEROE DEL CUADRO ──
    # La foto vuelve con luma media 0,275 —un gunmetal correcto— y este juego
    # pasa a las tres de la mañana adentro de una torre en penumbra: medido en la
    # captura de cerca, el arma salia casi negra. Se sube con gamma, que aclara
    # las sombras sin quemar los brillos: 0,275 -> 0,42.
    a = np.asarray(tex).astype(np.float32)/255.0
    tex = Image.fromarray((np.clip(a, 0, 1)**0.62*255 + 0.5).astype(np.uint8))
    luma = float((np.asarray(tex).astype(np.float32)/255.0
                  * [0.299, 0.587, 0.114]).sum(2).mean())
    bt = io.BytesIO(); tex.save(bt, 'WEBP', quality=88, method=5)

    # el binario se reempaqueta sin las imagenes: sin esto, los 2,4 MB de PNG
    # siguen adentro del GLB aunque ya no los mire nadie
    quedan = [x for x in range(len(js['bufferViews'])) if x not in
              set(im['bufferView'] for im in js['images'])]
    nuevo, remap = bytearray(), {}
    for x in quedan:
        b0 = js['bufferViews'][x]
        while len(nuevo) % 4: nuevo.append(0)
        remap[x] = len(nuevo)
        nuevo.extend(bn[b0.get('byteOffset', 0): b0.get('byteOffset', 0) + b0['byteLength']])
    js['bufferViews'] = [dict(js['bufferViews'][x], byteOffset=remap[x], buffer=0) for x in quedan]
    orden = {v: i for i, v in enumerate(quedan)}
    for a in js['accessors']:
        if a.get('bufferView') is not None: a['bufferView'] = orden[a['bufferView']]
    for c in ('images', 'samplers', 'textures'): js.pop(c, None)
    for mt in js.get('materials', []):
        for c in ('normalTexture', 'occlusionTexture', 'emissiveTexture'): mt.pop(c, None)
        pbr = mt.setdefault('pbrMetallicRoughness', {})
        pbr.pop('metallicRoughnessTexture', None); pbr.pop('baseColorTexture', None)
    js['buffers'] = [{'byteLength': len(nuevo)}]
    sal = os.path.join(TMP, k + '.glb')
    HP.guarda(sal, js, bytes(nuevo))
    n = sum(js['accessors'][pr['indices']]['count']//3
            for m in js['meshes'] for pr in m['primitives'])
    return io.open(sal, 'rb').read(), bt.getvalue(), n, luma


def main():
    img, son, mod, inf = {}, {}, {}, []
    for k in TEXTURAS:
        b = hornea_tex(k); img[k] = b
        inf.append(('tex ' + k, len(b), ''))
    for k in list(NIVEL):
        b, r = hornea_son(k); son[k] = b
        inf.append(('son ' + k, len(b), 'rms %.4f (obj %.3f)' % (r, NIVEL[k])))
    for k in MODELOS:
        b, t, n, lu = hornea_mod(k); mod[k] = b; img[k + '_tex'] = t
        inf.append(('mod ' + k, len(b), '%d triangulos' % n))
        inf.append(('tex ' + k, len(t), 'luma %.3f' % lu))

    def bloque(d, nom):
        return ('const %s = {\n' % nom +
                ',\n'.join("  %s: '%s'" % (k, base64.b64encode(v).decode('ascii'))
                           for k, v in d.items()) + '\n};\n')

    s = ("\n/* ══════════════════ LOS ASSETS, GENERADOS CON REZONA ══════════════════\n"
         "   Cinco texturas, ocho clips y dos modelos 3D, horneados por\n"
         "   `herramientas/pistola/hornear.py`. Los `task_id` estan en\n"
         "   `crudo/tareas.json` y SE VERSIONAN aunque los binarios no: perder el\n"
         "   id es perder el asset pagado.\n"
         "   NADA DE ESTO REEMPLAZA NADA HASTA QUE LLEGA. El juego arranca con las\n"
         "   cajas y los materiales dibujados por codigo y los assets los pisan\n"
         "   cuando terminan de decodificar, asi que un base64 roto cuesta una\n"
         "   pieza y no una pantalla vacia. */\n"
         + bloque(img, 'AS_IMG') + bloque(son, 'AS_SON') + bloque(mod, 'AS_MOD'))
    io.open(os.path.join(AQUI, 'partes', 'as.js'), 'w', encoding='utf8').write(s)
    for a, b, c in inf: print('%-14s %8d bytes  %s' % (a, b, c))
    print('as.js -> %d caracteres' % len(s))


main()
