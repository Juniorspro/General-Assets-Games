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
OUT = "/home/user/General-Assets-Games/elplano.html"

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

# El menú: el logo generado, el GANASTE, los dos recortes del bicho sacados del
# propio juego con croma, y dos capturas difuminadas de fondo. Los seis: 328 KB.
MENU = ["logo", "ganaste", "bicho-frente", "bicho-lado", "fondo1", "fondo2",
        "btn-disco", "btn-placa", "ic-usar", "ic-agachar", "ic-correr", "ic-deslizar"]
MENU_DIR = os.path.join(HERE, "menu")

# Los sonidos EN ARCHIVO. Van vacios hasta que se generen: el juego suena igual
# porque cada sonido cae al sintetizador si no encuentra su muestra. Se pueden
# agregar de a uno.
SND_DIR = os.path.join(HERE, "sonidos")

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


REPO = "Juniorspro/General-Assets-Games"


def sha_actual():
    """El commit desde el que jsDelivr va a servir los assets.

    Se fija a un COMMIT y no a la rama a proposito: jsDelivr cachea una rama
    doce horas, asi que si se apunta a la rama, cambiar un mueble no se ve
    hasta el dia siguiente. Con el sha, cada build pide exactamente los
    archivos de ese commit y la cache juega a favor en vez de en contra.

    Ojo con el orden: los assets tienen que estar YA subidos en ese commit.
    Por eso el flujo es commitear los assets primero y recien despues buildear.
    """
    try:
        sha = subprocess.run(["git", "rev-parse", "HEAD"], cwd=GAME,
                             capture_output=True, text=True, check=True).stdout.strip()
        sucio = subprocess.run(["git", "status", "--porcelain", "dungeon"], cwd=GAME,
                               capture_output=True, text=True).stdout.strip()
        if sucio:
            print("  OJO: hay cambios sin commitear en dungeon/. Los assets del CDN")
            print("       van a salir del ultimo commit, no de lo que hay en disco.")
        return sha
    except Exception:
        return None


def juntar_assets():
    """La tabla de todo lo que el juego necesita: clave, archivo y tipo."""
    t = []
    for clave, (arch, mime) in ASSETS.items():
        t.append((clave, ruta_tex(arch), mime, "texturas/" + arch))
    bicho = os.path.join(HERE, "muebles", "langosta.glb")
    if not os.path.exists(bicho):
        bicho = os.path.join(MUE_DIR, "langosta.glb")
    t.append(("bicho", bicho, "model/gltf-binary", "muebles/langosta.glb"))
    for n in MUEBLES:
        t.append(("mueble_" + n, os.path.join(MUE_DIR, n + ".glb"),
                  "model/gltf-binary", "muebles/hd/%s.glb" % n))
    for n in MENU:
        t.append(("menu_" + n.replace("-", "_"), os.path.join(MENU_DIR, n + ".webp"),
                  "image/webp", "menu/%s.webp" % n))
    for i in range(1, CUADROS + 1):
        t.append(("cuadro%d" % i, os.path.join(CUA_DIR, "cuadro%d.webp" % i),
                  "image/webp", "cuadros/cuadro%d.webp" % i))
    return [x for x in t if os.path.exists(x[1])]


def main():
    embebido = "--embebido" in sys.argv
    salida = [a for a in sys.argv[1:] if not a.startswith("--")]
    out = salida[0] if salida else OUT

    bundle_path = os.path.join(HERE, ".bundle.js")
    subprocess.run([
        os.path.join(GAME, "node_modules", ".bin", "esbuild"),
        os.path.join(HERE, "src", "main.js"),
        "--bundle", "--format=iife", "--minify", "--target=es2020",
        "--outfile=" + bundle_path,
    ], check=True, cwd=GAME)
    bundle = open(bundle_path, encoding="utf-8").read()

    tabla = juntar_assets()
    faltan = {c for c, _, _, _ in tabla}
    for c in ASSETS:
        if c not in faltan:
            raise SystemExit("falta la textura %s" % c)

    data, manifiesto = {}, {}
    if embebido:
        for clave, ruta, mime, _ in tabla:
            data[clave] = durl_abs(ruta, mime)
    else:
        sha = sha_actual() or "local"
        if not sha and not any(a.startswith("--base=") for a in sys.argv):
            raise SystemExit("sin git no se puede armar el enlace del CDN; usa --embebido")
        base = "https://cdn.jsdelivr.net/gh/%s@%s/dungeon/" % (REPO, sha)
        # --base sirve para probar el cargador contra un servidor local: el
        # navegador del contenedor no sale a internet, pero la logica es la misma
        for a in sys.argv[1:]:
            if a.startswith("--base="):
                base = a.split("=", 1)[1]
        for clave, ruta, mime, rel in tabla:
            url = base + rel
            data[clave] = url
            manifiesto[clave] = {"url": url, "bytes": os.path.getsize(ruta), "mime": mime}

    shell = open(os.path.join(HERE, "shell.html"), encoding="utf-8").read()
    html = (shell.replace("/*__ASSETS__*/{}", json.dumps(data))
                 .replace("/*__MANIFIESTO__*/{}", json.dumps(manifiesto))
                 .replace("/*__BUNDLE__*/", bundle))
    open(out, "w", encoding="utf-8").write(html)
    peso = sum(os.path.getsize(r) for _, r, _, _ in tabla)
    print("wrote %s  %.2f MB  (%d assets, %.2f MB %s)"
          % (out, len(html.encode()) / 1e6, len(tabla), peso / 1e6,
             "embebidos" if embebido else "por CDN"))

main()
