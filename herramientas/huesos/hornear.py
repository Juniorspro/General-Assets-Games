#!/usr/bin/env python3
"""Corta las hojas de sprites, las limpia y las mete en el HTML.

    python3 herramientas/huesos/hornear.py

LAS CUATRO COSAS QUE HAY QUE HACER BIEN, y las cuatro ya costaron una vuelta
en este repo:

1. EL CORTE VA POR COMPONENTES CONEXAS, no por una tabla de coordenadas. La
   reja que uno pide es una sugerencia: se pidieron 1536x512 y volvieron
   1376x768, y en los casuales se pidieron tres en fila y volvieron dos por
   tres con las filas repetidas. Se etiqueta la máscara de alfa y cada mancha
   es una pieza.

2. EL HALO SE SACA SANGRANDO EL COLOR HACIA AFUERA. El recorte del generador
   deja un borde de píxeles semitransparentes teñidos —acá, magenta—, y sobre
   un fondo oscuro eso se ve como un contorno violeta alrededor de cada árbol.
   No se arregla con un umbral: se arregla reemplazando el RGB de los píxeles
   de poco alfa por el del vecino opaco más cercano, que es lo que hace
   cualquier keyer. El alfa no se toca.

3. CADA PIEZA GUARDA SU PROPIA PROPORCIÓN. Un billboard dibujado a una
   proporción que no es la suya sale estirado, y un helecho estirado no se lee
   a estilo: se lee a error. Va en el manifiesto y lo usa la geometría.

4. Y EL ANCLA ES ABAJO. Una planta se apoya en el suelo; centrada por su caja
   queda medio metro flotando o medio metro enterrada según lo alta que sea.
"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image

ENT = 'assets/huesos'
SAL = 'herramientas/huesos/partes/i_assets.js'

# cuántos píxeles de alto quedan. El juego dibuja a un tercio de resolución y
# estira con NEAREST, así que más que esto es peso que no se ve nunca.
ALTOS = {'arboles': 288, 'ruinas': 200, 'arbustos': 160, 'rocas': 144,
         'plantas': 176, 'helechos': 128,
         # las dos familias de las zonas nuevas. El alto sale de lo que la pieza
         # MIDE EN EL MUNDO y no del gusto: el pantano lleva un arbol muerto de
         # hasta 4,4 m —entre `ruinas` y `arboles`— y el osario son pilas de
         # huesos de 2,6 m, o sea del orden de un arbusto grande.
         'pantano': 240, 'osario': 168}
SUELO_PX = 512

# ── EL ALBEDO DEL SUELO SE NIVELA, Y ES LA REGLA 7 DEL HORNEADO ──────────────
# three.js multiplica `map × color`, así que el tinte del material es un tinte
# SOBRE la foto — y los tres tintes de este juego se escribieron contra el
# lienzo de respaldo, no contra la foto. Medido: la foto del bosque tiene luma
# lineal 0,0416 y el tinte 0,27, así que el producto daba 0,011 y el suelo salía
# NEGRO (9,4 sobre 255 en el cuadro, contra 120 con el suelo pelado).
# Se nivela acá y no en el juego por dos razones: se puede medir con precisión
# antes de comprimir, y multiplicar por seis y medio en el teléfono amplifica el
# ruido del WebP sobre una foto que ya es plana.
SUELO_ALB = {'s_bosque': 0.088, 's_piedra': 0.190, 's_ceniza': 0.132,
             's_pantano': 0.070, 's_osario': 0.205}


def _a_lineal(a):
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def _a_srgb(a):
    a = np.clip(a, 0.0, 1.0)
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * a ** (1 / 2.4) - 0.055) * 255.0


def nivela(im, objetivo):
    """Lleva la luma lineal media de la foto al objetivo, con ganancia en LINEAL.
    Se corrige la luma y no cada canal por separado: dividiendo canal a canal se
    le borra el color a la foto, y el color de un suelo de bosque es la mitad de
    lo que lo hace leer a bosque."""
    a = np.asarray(im, dtype=np.float64)
    lin = _a_lineal(a)
    luma = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    antes = float(luma.mean())
    if antes <= 1e-6:
        return im, antes, antes
    g = objetivo / antes
    lin2 = lin * g
    # una `tanh` suave en vez de recortar: con ganancia 6,5 el 8% de los píxeles
    # se pasa de 1 y recortarlos deja manchas planas donde había piedras claras
    lin2 = np.tanh(lin2 * 1.18) / 1.18
    l2 = 0.2126 * lin2[..., 0] + 0.7152 * lin2[..., 1] + 0.0722 * lin2[..., 2]
    ahora = float(l2.mean())
    return Image.fromarray(_a_srgb(lin2).round().astype(np.uint8)), antes, ahora



def componentes(al, umbral=26, minpx=2400):
    """etiqueta las manchas de alfa. Sin scipy: relleno iterativo por filas."""
    m = al > umbral
    h, w = m.shape
    et = np.zeros((h, w), np.int32)
    n = 0
    pila = []
    for y0 in range(h):
        for x0 in range(w):
            if not m[y0, x0] or et[y0, x0]:
                continue
            n += 1
            pila.append((y0, x0)); et[y0, x0] = n
            while pila:
                y, x = pila.pop()
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    a, b = y + dy, x + dx
                    if 0 <= a < h and 0 <= b < w and m[a, b] and not et[a, b]:
                        et[a, b] = n; pila.append((a, b))
    cajas = []
    for k in range(1, n + 1):
        ys, xs = np.where(et == k)
        if len(ys) < minpx:
            continue
        cajas.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1, len(ys)))
    cajas.sort(key=lambda c: c[0])          # de izquierda a derecha
    return cajas


def sangra(rgba, pasos=14, umb_mag=6):
    """arregla el borde: saca el halo del generador y empuja color de verdad.

    EL HALO ES OPACO Y ES DEL PROPIO SPRITE, que es lo que costó una medición.
    El generador deja un contorno magenta pegado a la silueta con alfa lleno,
    así que un sangrado ingenuo NO lo tapa: lo toma como fuente y lo reparte
    hacia afuera. Medido en el abeto, el sesgo de la orilla pasaba de +2,6 en
    la hoja cruda a +48,1 después de sangrar — o sea que la limpieza METÍA el
    defecto que venía a sacar.

    El umbral (6) salió de un barrido y no de elegirlo: con 22 el borde queda\n    en +14,0 y con 6 en +3,4, que es el sesgo que la hoja CRUDA ya tenía. Y no\n    se come material de verdad — a 6 toca 244 píxeles de más de un millón, y\n    el sesgo del cuerpo opaco no se mueve (la corteza marrón da 0 por sí sola).\n\n    Lo que sirve es sacar el halo de las FUENTES: un píxel cuenta como color
    bueno sólo si es opaco Y NO es magenta, y de ahí se empuja hacia todo lo
    demás. El alfa no se toca en ningún caso: la silueta del generador está
    bien, lo que está mal es el color.
    """
    a = rgba[:, :, 3].astype(np.float32) / 255.0
    rgb = rgba[:, :, :3].astype(np.float32)
    # magenta = el rojo y el azul le sacan ventaja al verde. Es la firma de
    # cualquier resto de croma, y no se confunde con la corteza ni con la hoja.
    mag = ((rgb[:, :, 0] + rgb[:, :, 2]) * 0.5 - rgb[:, :, 1]) > umb_mag
    solido = (a > 0.90) & ~mag
    if not solido.any():
        return rgba
    col = rgb.copy()
    val = solido.copy()
    for _ in range(pasos):
        nv = val.copy(); nc = col.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            d = np.roll(np.roll(val, dy, 0), dx, 1)
            c = np.roll(np.roll(col, dy, 0), dx, 1)
            tomar = d & ~nv
            nc[tomar] = c[tomar]
            nv |= tomar
        col, val = nc, nv
        if val.all():
            break
    arreglar = (a < 0.90) | mag
    rgb[arreglar] = col[arreglar]
    out = rgba.copy(); out[:, :, :3] = rgb.astype(np.uint8)
    return out


def b64(im, fmt='WEBP', **kw):
    b = io.BytesIO(); im.save(b, fmt, **kw)
    return 'data:image/%s;base64,%s' % (fmt.lower(), base64.b64encode(b.getvalue()).decode())


def main():
    piezas, manif = {}, {}
    for nom, alto in ALTOS.items():
        p = os.path.join(ENT, 'h_%s-g1.png' % nom)
        if not os.path.exists(p):
            print('  falta', p); continue
        im = Image.open(p).convert('RGBA')
        arr = np.array(im)
        cajas = componentes(arr[:, :, 3])
        print('%-10s %s -> %d piezas' % (nom, im.size, len(cajas)))
        lim = sangra(arr)
        manif[nom] = []
        for i, (x0, y0, x1, y1, px) in enumerate(cajas):
            rec = Image.fromarray(lim[y0:y1, x0:x1])
            w, h = rec.size
            nw = max(8, int(round(w * alto / h)))
            rec = rec.resize((nw, alto), Image.LANCZOS)
            k = '%s%d' % (nom, i)
            piezas[k] = b64(rec, 'WEBP', quality=86, method=6)
            manif[nom].append({'k': k, 'w': nw, 'h': alto, 'prop': round(nw / alto, 4),
                               'px': h})
            print('    %s  %dx%d  prop %.3f  %d KB' % (k, w, h, nw / alto, len(piezas[k]) * 3 // 4096))
        # ── LO ALTO QUE ES CADA PIEZA DENTRO DE SU FAMILIA, MEDIDO ─────────
        # Las cuatro variantes vienen dibujadas UNA AL LADO DE LA OTRA en la
        # misma hoja, o sea a la misma escala: el alto de su recorte ES su
        # tamaño relativo, y no hay que declararlo. Cada pieza se estira
        # después a `ALTOS[fam]` para que el mapa tenga la misma nitidez, así
        # que sin esto esa medida se pierde y las cuatro salen igual de altas.
        # Se nota en el pantano, que es la familia con más dispersión: el
        # tronco caído mide 136 px contra los 451 del árbol muerto —el 30 %—
        # y dibujado a la altura del árbol quedaba de DIEZ METROS de largo,
        # porque su proporción es 2,46. Se normaliza por la MEDIA y no por el
        # máximo: `esc` es el alto TÍPICO de la capa, así que la media tiene
        # que valer 1 o la familia entera se achica.
        med = sum(m['px'] for m in manif[nom]) / len(manif[nom])
        for m in manif[nom]:
            m['hrel'] = round(m['px'] / med, 3); del m['px']
        print('    hrel %s' % [m['hrel'] for m in manif[nom]])
    suelos = {}
    linmed = {}
    for nom in ('s_bosque', 's_piedra', 's_ceniza', 's_pantano', 's_osario'):
        p = os.path.join(ENT, 'h_%s-g1.png' % nom)
        if not os.path.exists(p):
            print('  falta', p); continue
        im = Image.open(p).convert('RGB').resize((SUELO_PX, SUELO_PX), Image.LANCZOS)
        im, antes, ahora = nivela(im, SUELO_ALB[nom])
        linmed[nom] = ahora
        suelos[nom] = b64(im, 'WEBP', quality=82, method=6)
        print('%-10s  lineal %.4f -> %.4f (objetivo %.4f)  %d KB'
              % (nom, antes, ahora, SUELO_ALB[nom], len(suelos[nom]) * 3 // 4096))

    with open(SAL, 'w') as f:
        f.write('/* GENERADO por herramientas/huesos/hornear.py — no editar a mano */\n')
        f.write('const SPR_MAN = %s;\n' % json.dumps(manif, separators=(',', ':')))
        f.write('const SPR = {\n')
        for k, v in piezas.items():
            f.write("'%s':'%s',\n" % (k, v))
        f.write('};\n')
        f.write('const SUELO_IMG = {\n')
        for k, v in suelos.items():
            f.write("'%s':'%s',\n" % (k, v))
        f.write('};\n')
        f.write('const SUELO_LIN = %s;\n' % json.dumps({k: round(v, 4) for k, v in linmed.items()}))
    print('\n%s  %.0f KB' % (SAL, os.path.getsize(SAL) / 1024))


if __name__ == '__main__':
    main()
