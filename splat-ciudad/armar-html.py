"""Empaqueta el visor en un solo .html que se abre haciendo doble clic.

Dos cosas obligan a esto. Una: desde file:// el origen es opaco y los módulos
ES están prohibidos, así que el bundle sale en formato IIFE. La otra: tampoco
sale fetch, y en el sandbox de un artifact no sale a ningún origen, así que las
gaussianas viajan adentro de la página.

Y como base64 infla un tercio, el .splat va comprimido con gzip y lo
descomprime la página con DecompressionStream. Medido: 0,78x, así que en el
mismo presupuesto de bytes entran un 28 % más de gaussianas.

    python3 armar-html.py visor visor/ciudad.splat distrito.html
    python3 armar-html.py visor - visor.html          # sin nube: arrastrar y soltar
    python3 armar-html.py visor visor/ciudad.splat a.html artifact --titulo "Otro"

Con `-` en lugar del .splat sale el visor vacío, que pide el archivo. Es la
única forma de mirar una nube de 234 MB: adentro de un html no entra.
"""
import base64, gzip, os, re, shutil, subprocess, sys, tempfile

V   = sys.argv[1]
SPL = sys.argv[2]
SAL = sys.argv[3]
ARTIFACT = "artifact" in sys.argv[4:]
TITULO = sys.argv[sys.argv.index("--titulo")+1] if "--titulo" in sys.argv else ""
BAJADA = sys.argv[sys.argv.index("--bajada")+1] if "--bajada" in sys.argv else ""

tmp = tempfile.mkdtemp(prefix="paq")
shutil.copy(V + "/splat.js", tmp + "/splat.js")
shutil.copy(V + "/main.js", tmp + "/main.js")
subprocess.run(["npx", "--yes", "esbuild", tmp + "/main.js", "--bundle",
                "--format=iife", "--minify", "--target=es2019",
                "--outfile=" + tmp + "/paquete.js"], check=True,
               stdout=subprocess.DEVNULL)
paq = open(tmp + "/paquete.js", encoding="utf8").read()
shutil.rmtree(tmp, ignore_errors=True)

html = open(V + "/index.html", encoding="utf8").read()
# el nombre va por regex y no por cadena fija: la plantilla trae el de la nube
# que viene en visor/, y cada build lo puede cambiar
if TITULO:
    for etq in ("title", "h1"):
        html = re.sub(r"<%s>[^<]*</%s>" % (etq, etq), "<%s>%s</%s>" % (etq, TITULO, etq),
                      html, count=1)
    # el h2 del panel, no el del cartel de error, que aparece antes
    html = re.sub(r"(<header>\s*<h2>)[^<]*(</h2>)", r"\g<1>" + TITULO + r"\g<2>",
                  html, count=1)
if BAJADA:
    html = re.sub(r"(<header>.*?<p>)[^<]*(</p>)", r"\g<1>" + BAJADA + r"\g<2>",
                  html, count=1, flags=re.S)
html = html.replace('<script type="module" src="./main.js"></script>', "__VISOR__")
if ARTIFACT:
    # el envoltorio del artifact ya pone doctype, charset y viewport
    html = re.sub(r'<!DOCTYPE html>\s*', '', html, flags=re.I)
    html = re.sub(r'<meta charset[^>]*>\s*', '', html, flags=re.I)
    html = re.sub(r'<meta name="viewport"[^>]*>\s*', '', html, flags=re.I)

if SPL == "-":
    cabeza = "window.__SIN_ARCHIVO = true;"
    dicho = "sin nube: pide el archivo"
else:
    crudo = open(SPL, "rb").read()
    gz = gzip.compress(crudo, 6)
    cabeza = ('window.__GZ = true;\nwindow.__SPLAT = "'
              + base64.b64encode(gz).decode("ascii") + '";')
    dicho = "gaussianas %.2f -> %.2f MB con gzip" % (len(crudo)/1048576, len(gz)/1048576)

bloque = ("<script>\n/* Las gaussianas primero, después el rasterizador ya empaquetado en un\n"
          "   script clásico: sin módulos, sin fetch y sin CDN. */\n"
          + cabeza + "\n</script>\n<script>\n" + paq + "\n</script>")
open(SAL, "w", encoding="utf8").write(html.replace("__VISOR__", bloque))

t = open(SAL, encoding="utf8").read()
for x in ("__VISOR__", 'type="module"', "./main.js"):
    assert x not in t, x
print("%s · %.2f MB (%s) · un archivo, sin módulos · title %s" % (
      SAL, os.path.getsize(SAL)/1048576, dicho, "<title>" in t[:8192]))
