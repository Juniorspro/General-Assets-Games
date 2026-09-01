#!/usr/bin/env python3
"""Empaqueta la animacion en un unico HTML: bundlea el JS con esbuild y mete
todos los assets como data URLs."""
import base64, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
DIST = os.path.join(GAME, "assets", "dist")
OUT = sys.argv[1] if len(sys.argv) > 1 else "/home/user/General-Assets-Games/lacurva.html"

ASSETS = {
    "carBody":  ("car_body.glb",   "model/gltf-binary"),
    "carWheel": ("car_wheel.glb",  "model/gltf-binary"),
    "phone":    ("phone.glb",      "model/gltf-binary"),
    "lady":     ("vieja.glb",      "model/gltf-binary"),
    "boy":      ("boy.glb",        "model/gltf-binary"),
    "bark":     ("bark.jpg",       "image/jpeg"),
    "leaf":     ("leaf_card.webp", "image/webp"),
    "grass":    ("grass_card.webp","image/webp"),
    "sky":      ("sky.jpg",        "image/jpeg"),
    "wall":     ("tex_wall.webp",  "image/webp"),
    "wood":     ("tex_wood.webp",  "image/webp"),
    "music":    ("music.mp3",      "audio/mpeg"),
    "ambience": ("ambience.mp3",   "audio/mpeg"),
    "crash":    ("crash.mp3",      "audio/mpeg"),
}


def durl(name, mime):
    p = os.path.join(DIST, name)
    with open(p, "rb") as f:
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

    missing = [n for n, (f, _) in ASSETS.items() if not os.path.exists(os.path.join(DIST, f))]
    if missing:
        raise SystemExit("faltan assets: %s" % ", ".join(missing))

    data = {k: durl(f, m) for k, (f, m) in ASSETS.items()}
    shell = open(os.path.join(HERE, "shell.html"), encoding="utf-8").read()
    html = shell.replace("/*__ASSETS__*/{}", json.dumps(data))
    html = html.replace("/*__BUNDLE__*/", bundle)
    open(OUT, "w", encoding="utf-8").write(html)
    mb = len(html.encode()) / 1e6
    print("wrote %s  %.2f MB  (bundle %.0f KB)" % (OUT, mb, len(bundle) / 1e3))


main()
