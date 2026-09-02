#!/usr/bin/env python3
"""Empaqueta el dungeon en un unico HTML."""
import base64, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
# Las texturas viven DENTRO del repo, no en una carpeta de trabajo de al lado:
# si no, un clon limpio no puede reconstruir el juego. assets/dist queda como
# alternativa para las que todavia se generan afuera.
DIST = os.path.join(HERE, "texturas")
DIST_ALT = os.path.join(GAME, "assets", "dist")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/user/General-Assets-Games/elplano.html"

# El look sale de las capturas: papel damasco VERDE, cornisa crema, y tablas
# para la veta del zocalo naranja. La alfombra roja ya no es un archivo — se
# dibuja en un canvas al arrancar, junto con el yeso y el hormigon (deco.js).
ASSETS = {
    "paper":    ("papel_verde.webp",  "image/webp"),
    "wainscot": ("wainscot.webp",     "image/webp"),
    "ceil":     ("techo_tablas.webp", "image/webp"),
}

# Los cuadros de las paredes: dibujos a lapiz generados y recortados a 256x341.
# Los cuatro juntos pesan 52 KB.
CUADROS = 4
CUA_DIR = os.path.join(HERE, "cuadros")

# Los muebles generados con Tripo y horneados a 512 y ~1,5 k triangulos.
# Van como data URL igual que las texturas: el juego es UN archivo.
MUEBLES = ["armario", "comoda", "estanteria", "mesa", "reloj", "silla", "sillon", "sofa",
           "piano", "banco", "mesalarga", "vitrina"]
# Los muebles de alta: 8-18 mil triangulos cada uno y textura de 1024, contra
# los 1-2 mil y 512 de la primera tanda. Se generaron de a uno, con su prompt.
MUE_DIR = os.path.join(HERE, "muebles", "hd")


def ruta_tex(name):
    p = os.path.join(DIST, name)
    return p if os.path.exists(p) else os.path.join(DIST_ALT, name)


def durl(name, mime):
    with open(ruta_tex(name), "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())


def durl_abs(path, mime):
    with open(path, "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode())


def main():
    bundle_path = os.path.join(HERE, ".bundle.js")
    subprocess.run([
        os.path.join(GAME, "node_modules", ".bin", "esbuild"),
        os.path.join(HERE, "src", "main.js"),
        "--bundle", "--format=iife", "--minify", "--target=es2020",
        "--outfile=" + bundle_path,
    ], check=True, cwd=GAME)
    bundle = open(bundle_path, encoding="utf-8").read()

    missing = [n for n, (f, _) in ASSETS.items() if not os.path.exists(ruta_tex(f))]
    if missing:
        raise SystemExit("faltan assets: %s" % ", ".join(missing))

    data = {k: durl(f, m) for k, (f, m) in ASSETS.items()}
    bicho = os.path.join(MUE_DIR, "langosta.glb")
    if os.path.exists(bicho):
        data["bicho"] = durl_abs(bicho, "model/gltf-binary")
    for nombre in MUEBLES:
        ruta = os.path.join(MUE_DIR, nombre + ".glb")
        # si falta una pieza el juego igual entra: el modulo la saltea
        if os.path.exists(ruta):
            data["mueble_" + nombre] = durl_abs(ruta, "model/gltf-binary")
    for i in range(1, CUADROS + 1):
        pc = os.path.join(CUA_DIR, "cuadro%d.webp" % i)
        if os.path.exists(pc):
            data["cuadro%d" % i] = durl_abs(pc, "image/webp")
        else:
            print("  (sin %s)" % nombre)
    shell = open(os.path.join(HERE, "shell.html"), encoding="utf-8").read()
    html = shell.replace("/*__ASSETS__*/{}", json.dumps(data)).replace("/*__BUNDLE__*/", bundle)
    open(OUT, "w", encoding="utf-8").write(html)
    print("wrote %s  %.2f MB" % (OUT, len(html.encode()) / 1e6))


main()
