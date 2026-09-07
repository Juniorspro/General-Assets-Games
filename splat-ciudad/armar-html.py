"""Empaqueta el visor en un solo .html que se abre haciendo doble clic.

Dos cosas obligan a esto. Una: desde file:// el origen es opaco y los módulos
ES están prohibidos, así que el bundle sale en formato IIFE. La otra: tampoco
sale fetch, y en el sandbox de un artifact no sale a ningún origen, así que las
gaussianas viajan en base64 adentro de la página.

Y como base64 infla un tercio, el .splat va comprimido con gzip y lo descomprime
la página con DecompressionStream. Medido: 0,77x, así que en el mismo presupuesto
de bytes entran un 30 % más de gaussianas.

    python3 armar-html.py visor visor/ciudad.splat salida.html [artifact] [--titulo "Otro nombre"]
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
main = open(V + "/main.js", encoding="utf8").read()

viejo = main[main.index('$("#riel i").style.width = "6%";'):
             main.index('.then(arrancar).catch((e) => morir("No se pudo leer el archivo de gaussianas: " + (e.message || e)));')
             + len('.then(arrancar).catch((e) => morir("No se pudo leer el archivo de gaussianas: " + (e.message || e)));')]
nuevo = '''/* El archivo de gaussianas viaja adentro de la página, en base64 y con gzip:
   así el .html es uno solo y se abre incluso desde el disco, donde fetch no
   sale. Lo descomprime DecompressionStream, que no es una API de red y por eso
   anda igual en file:// y en el sandbox de un artifact. */
$("#riel i").style.width = "15%";
(async () => {
  try {
    const b64 = window.__SPLAT;
    const c = atob(b64), u = new Uint8Array(c.length);
    for (let i = 0; i < c.length; i++) u[i] = c.charCodeAt(i);
    $("#riel i").style.width = "55%"; $("#pct").textContent = "55 %";
    let buf = u.buffer;
    if (window.__GZ) {
      if (!self.DecompressionStream) throw new Error("falta DecompressionStream");
      buf = await new Response(new Blob([u]).stream()
                 .pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
    }
    $("#riel i").style.width = "85%"; $("#pct").textContent = "85 %";
    arrancar(buf);
  } catch (e) {
    morir("No se pudieron leer las gaussianas: " + (e.message || e));
  }
})();'''
assert viejo in main
open(tmp + "/main.js", "w", encoding="utf8").write(main.replace(viejo, nuevo))

subprocess.run(["npx", "--yes", "esbuild", tmp + "/main.js", "--bundle",
                "--format=iife", "--minify", "--target=es2019",
                "--outfile=" + tmp + "/paquete.js"], check=True,
               stdout=subprocess.DEVNULL)
paq = open(tmp + "/paquete.js", encoding="utf8").read()

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

crudo = open(SPL, "rb").read()
gz = gzip.compress(crudo, 6)
b64 = base64.b64encode(gz).decode("ascii")
bloque = ("<script>\n/* Las gaussianas primero, después el rasterizador ya empaquetado en un\n"
          "   script clásico: sin módulos, sin fetch y sin CDN. */\n"
          'window.__GZ = true;\nwindow.__SPLAT = "' + b64 + '";\n</script>\n<script>\n' + paq + "\n</script>")
open(SAL, "w", encoding="utf8").write(html.replace("__VISOR__", bloque))
shutil.rmtree(tmp, ignore_errors=True)

t = open(SAL, encoding="utf8").read()
for m in ("__VISOR__", 'type="module"', "./ciudad.splat", "fetch("):
    assert m not in t, m
print("%s · %.2f MB (gaussianas %.2f -> %.2f MB con gzip) · un archivo, sin módulos ni fetch · title %s" % (
      SAL, os.path.getsize(SAL)/1048576, len(crudo)/1048576, len(gz)/1048576,
      "<title>" in t[:8192]))
