# -*- coding: utf-8 -*-
"""Trae las imagenes de Rezona y las hornea en partes/i_assets.js.

TRES REGLAS QUE ESTE REPO YA PAGO:

1. EL FONDO SE SACA POR RELLENO DESDE EL BORDE y no por umbral de color. Un
   umbral se lleva tambien los claros de ADENTRO del dibujo —el reflejo del
   espejo, la llama de la vela— y deja el emblema agujereado. Lo que no se
   alcanza desde afuera es dibujo por construccion.

2. SE ACHICA MUCHO. Este juego dibuja un comodin en unos setenta pixeles y el
   cartel del menu en trescientos: mandar mil pixeles es peso que nadie ve.

3. LO GENERADO NO REEMPLAZA NADA HASTA QUE LLEGA. `i_assets.js` es opcional
   por construccion —armar.py lo dice y sigue— y cada imagen entra sola: una
   que falle cuesta UNA pieza, no la pantalla.
"""
import base64, io, json, pathlib, subprocess, sys, time
from PIL import Image
from collections import deque

RZ   = 'herramientas/rezona/rz.py'
PROY = 'rpvTPzKA'
D    = pathlib.Path('herramientas/naipe/crudo')
TAR  = D / 'tareas.json'
BAJA = pathlib.Path('/tmp/rez_naipe')
SAL  = pathlib.Path('herramientas/naipe/partes/i_assets.js')

# nombre -> (ancho, alto, alfa). El alto sale de donde se dibuja:
# el cartel lo declara el CSS (300x84 = 0,28), la carta es 2:3, el
# comodin es la ranura, y el fieltro se estira al marco entero.
RECETA = {
  'fieltro':      (256, 554, False),
  'dorso':        (128, 184, False),
  'logo':         (360, 101, True),
  'boton':        (256,  64, True),
  'botonOro':     (256,  64, True),
  'com_vela':     ( 96, 120, False),
  'com_espejo':   ( 96, 120, False),
  'com_obelisco': ( 96, 120, False),
  'com_fogata':   ( 96, 120, False),
  'com_comodin':  ( 96, 120, False),
}

def rz(tool, args):
    p = subprocess.run([sys.executable, RZ, 'call', tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=600)
    if p.returncode or not p.stdout.strip().startswith('{'):
        raise SystemExit('%s: %s' % (tool, (p.stdout + p.stderr)[-500:]))
    return json.loads(p.stdout)

def trae():
    """Trae los PNG ya listos.

    DOS COSAS QUE COSTARON LA VUELTA:
    · el MCP escribe RELATIVO A SU PROPIO directorio de trabajo y se
      planta si ahi no hay marca `.rezona/`. Va con cwd=BAJA.
    · todas las tareas devuelven el MISMO asset_path, asi que hay que
      copiar al repo DESPUES de cada fetch, antes del siguiente.
    """
    tar = json.loads(TAR.read_text())
    D.mkdir(parents=True, exist_ok=True)
    est = rz('check_generation_tasks', {'task_ids': list(tar.values())})
    por = {i['task_id']: i for i in est.get('items', [])}
    for k, tid in tar.items():
        dst = D / (k + '.png')
        if dst.exists():
            continue
        it = por.get(tid, {})
        if it.get('status') != 'ready':
            print('%-13s %s' % (k, it.get('status')))
            continue
        ap = it['asset_path']
        src = BAJA / ap
        if src.exists():
            src.unlink()
        # el cliente se vence a los 300 s y el archivo aterriza IGUAL:
        # se lanza y se espera al ARCHIVO, no al proceso.
        pr = subprocess.Popen([sys.executable, RZ, 'call', 'fetch_generated_asset',
                               json.dumps({'project_id': PROY, 'task_id': tid,
                                           'output_path': ap})],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                              cwd=str(BAJA))
        t0, ult = time.time(), -1
        while time.time() - t0 < 420:
            time.sleep(4)
            if src.exists():
                n = src.stat().st_size
                if n == ult and n > 0:
                    break          # dos lecturas iguales = termino de escribir
                ult = n
            elif pr.poll() is not None and time.time() - t0 > 20:
                break
        pr.kill()
        if not src.exists():
            print('%-13s no aparecio' % k)
            continue
        dst.write_bytes(src.read_bytes())
        src.unlink()
        print('%-13s traido  %.0f KB' % (k, dst.stat().st_size / 1024))

def sin_fondo(im, tol=42):
    """Relleno desde el borde: lo que no se alcanza desde afuera es dibujo."""
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()
    esq = [px[0,0], px[w-1,0], px[0,h-1], px[w-1,h-1]]
    fon = tuple(sum(c[i] for c in esq)//4 for i in range(3))
    vis = bytearray(w*h)
    q = deque()
    for x in range(w):
        for y in (0, h-1): q.append((x,y))
    for y in range(h):
        for x in (0, w-1): q.append((x,y))
    def cerca(c):
        return (c[0]-fon[0])**2 + (c[1]-fon[1])**2 + (c[2]-fon[2])**2 <= tol*tol*3
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or vis[y*w+x]: continue
        if not cerca(px[x,y]): continue
        vis[y*w+x] = 1
        q.extend(((x+1,y),(x-1,y),(x,y+1),(x,y-1)))
    a = Image.frombytes('L', (w,h), bytes(255 if not v else 0 for v in vis))
    out = im.convert('RGBA'); out.putalpha(a)
    caja = out.getbbox()
    return out.crop(caja) if caja else out

def cubre(im, w, h):
    """Recorte de cubrir: la proporcion la manda el sitio donde se dibuja."""
    iw, ih = im.size
    e = max(w/iw, h/ih)
    im = im.resize((max(1,round(iw*e)), max(1,round(ih*e))), Image.LANCZOS)
    iw, ih = im.size
    return im.crop(((iw-w)//2, (ih-h)//2, (iw-w)//2+w, (ih-h)//2+h))

def entra(im, w, h):
    """Lo recortado por alfa entra ENTERO y centrado: recortarlo a cubrir le
       comeria las puntas al emblema, que es justo su silueta."""
    iw, ih = im.size
    e = min(w/iw, h/ih)
    im = im.resize((max(1,round(iw*e)), max(1,round(ih*e))), Image.LANCZOS)
    lz = Image.new('RGBA', (w,h), (0,0,0,0))
    lz.paste(im, ((w-im.size[0])//2, (h-im.size[1])//2))
    return lz

def hornea():
    salida = {}
    for k, (w, h, alfa) in RECETA.items():
        f = D / (k + '.png')
        if not f.exists(): print('%-13s falta' % k); continue
        im = Image.open(f)
        if alfa:
            im = entra(sin_fondo(im), w, h)
            buf = io.BytesIO(); im.save(buf, 'WEBP', quality=88, alpha_quality=70)
        else:
            im = cubre(im.convert('RGB'), w, h)
            buf = io.BytesIO(); im.save(buf, 'WEBP', quality=80)
        b = buf.getvalue()
        salida[k] = 'data:image/webp;base64,' + base64.b64encode(b).decode()
        print('%-13s %dx%d  %5.1f KB' % (k, w, h, len(b)/1024))
    if not salida: raise SystemExit('no hay nada horneado')
    cuerpo = ',\n'.join("  %s: '%s'" % (k, v) for k, v in salida.items())
    SAL.write_text('/* generado por herramientas/naipe/hornear_assets.py */\n'
                   'const ASSETS = {\n' + cuerpo + '\n};\n')
    print('->', SAL, '%.1f KB' % (SAL.stat().st_size/1024))

if __name__ == '__main__':
    if 'hornear' not in sys.argv: trae()
    if 'traer'   not in sys.argv: hornea()
