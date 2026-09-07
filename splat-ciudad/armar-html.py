"""Empaqueta el visor en un solo .html que se abre haciendo doble clic.

Dos cosas obligan a esto. Una: desde file:// el origen es opaco y los módulos
ES están prohibidos, así que el bundle sale en formato IIFE. La otra: tampoco
sale fetch, y en el sandbox de un artifact no sale a ningún origen, así que las
gaussianas viajan en base64 adentro de la página.

    python3 armar-html.py visor visor/ciudad.splat salida.html [artifact] [--titulo "Otro nombre"]
"""
import base64, os, re, shutil, subprocess, sys, tempfile

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
nuevo = '''/* El archivo de gaussianas viaja adentro de la página, en base64: así el
   .html es uno solo y se abre incluso desde el disco, donde fetch no sale. */
$("#riel i").style.width = "20%";
requestAnimationFrame(() => {
  try {
    const b64 = window.__SPLAT;
    const c = atob(b64), u = new Uint8Array(c.length);
    for (let i = 0; i < c.length; i++) u[i] = c.charCodeAt(i);
    $("#riel i").style.width = "80%"; $("#pct").textContent = "80 %";
    arrancar(u.buffer);
  } catch (e) {
    morir("No se pudieron leer las gaussianas: " + (e.message || e));
  }
});'''
assert viejo in main
open(tmp + "/main.js", "w", encoding="utf8").write(main.replace(viejo, nuevo))

subprocess.run(["npx", "--yes", "esbuild", tmp + "/main.js", "--bundle",
                "--format=iife", "--minify", "--target=es2019",
                "--outfile=" + tmp + "/paquete.js"], check=True,
               stdout=subprocess.DEVNULL)
paq = open(tmp + "/paquete.js", encoding="utf8").read()

html = open(V + "/index.html", encoding="utf8").read()
if TITULO:
    html = html.replace("<title>Distrito Cardinal</title>", "<title>%s</title>" % TITULO)
    html = html.replace("<h1>Distrito Cardinal</h1>", "<h1>%s</h1>" % TITULO)
    html = html.replace("<h2>Distrito Cardinal</h2>", "<h2>%s</h2>" % TITULO)
if BAJADA:
    html = html.replace("<p>Nube de gaussianas 3D · color trazado con Cycles</p>",
                        "<p>%s</p>" % BAJADA)
html = html.replace('<script type="module" src="./main.js"></script>', "__VISOR__")
if ARTIFACT:
    # el envoltorio del artifact ya pone doctype, charset y viewport
    html = re.sub(r'<!DOCTYPE html>\s*', '', html, flags=re.I)
    html = re.sub(r'<meta charset[^>]*>\s*', '', html, flags=re.I)
    html = re.sub(r'<meta name="viewport"[^>]*>\s*', '', html, flags=re.I)

b64 = base64.b64encode(open(SPL, "rb").read()).decode("ascii")
bloque = ("<script>\n/* Las gaussianas primero, después el rasterizador ya empaquetado en un\n"
          "   script clásico: sin módulos, sin fetch y sin CDN. */\n"
          'window.__SPLAT = "' + b64 + '";\n</script>\n<script>\n' + paq + "\n</script>")
open(SAL, "w", encoding="utf8").write(html.replace("__VISOR__", bloque))
shutil.rmtree(tmp, ignore_errors=True)

t = open(SAL, encoding="utf8").read()
for m in ("__VISOR__", 'type="module"', "./ciudad.splat", "fetch("):
    assert m not in t, m
print("%s · %.2f MB · un archivo, sin módulos ni fetch · title %s" % (
      SAL, os.path.getsize(SAL)/1048576, "<title>" in t[:8192]))
