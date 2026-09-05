"""Busca en Openverse fotos que sirvan para el sitio.

Openverse es el buscador de la fundación WordPress: sólo indexa material con
licencia declarada. Se piden nada más cc0, dominio público y CC-BY —nada de
«no comercial» ni «share alike»— y de cada foto se guarda quién la hizo y con qué
licencia, porque CC-BY obliga a nombrar al autor y eso va en la página.
"""
import json, subprocess, urllib.parse, os, re

S = "/tmp/claude-0/-home-user-General-Assets-Games/93e8392c-dcc4-598c-9083-8a3fa2283e23/scratchpad"

# Cada tema: qué buscar y qué palabras tiene que tener el título para que la foto
# sea de eso y no de otra cosa. Sin este filtro, «soap bubbles» devuelve flores.
TEMAS = [
  ("burbujas",  ["soap bubble","bubbles water","air bubbles underwater","bubble macro"],
                ["bubble","burbuja","blase"]),
  ("agua",      ["underwater sunlight rays","sunbeam underwater sea","ocean surface sunlight"],
                ["underwater","sea","ocean","water","sun"]),
  ("peces",     ["tropical fish coral reef","aquarium fish colorful","clownfish anemone"],
                ["fish","reef","coral","aquarium","clownfish"]),
  ("pasto",     ["green hill blue sky clouds","rolling green meadow sky","grass field summer sky"],
                ["hill","meadow","grass","field","green","sky"]),
  ("gotas",     ["water drops on leaf macro","dew drops green leaf","rain droplets plant"],
                ["drop","dew","leaf","rain","droplet"]),
  ("medusa",    ["jellyfish blue water","moon jellyfish aquarium"],
                ["jellyfish","medusa","jelly"]),
  ("cielo",     ["cumulus clouds blue sky","summer sky white clouds"],
                ["cloud","sky","cumulus"]),
  ("hojas",     ["wet green leaves close up","tropical green foliage"],
                ["leaf","leaves","foliage","green"]),
]

LIBRES = {"cc0", "pdm", "by"}

def pedir(url):
    out = subprocess.run(["curl", "-s", "-m", "45", url], capture_output=True, text=True).stdout
    try:    return json.loads(out)
    except Exception: return {}

vistos, elegidas = set(), []
for clave, consultas, palabras in TEMAS:
    encontradas = []
    for q in consultas:
        d = pedir("https://api.openverse.org/v1/images/?" + urllib.parse.urlencode({
            "q": q, "license": "cc0,pdm,by", "size": "large",
            "page_size": 20, "mature": "false"}))
        for r in d.get("results") or []:
            lic = (r.get("license") or "").lower()
            an, al = r.get("width") or 0, r.get("height") or 0
            tit = (r.get("title") or "").lower()
            if lic not in LIBRES: continue
            if an < 1500 or al < 900: continue          # que aguante 1200 de ancho
            if an / max(1, al) < 1.15: continue          # apaisada, para las tarjetas
            if not any(p in tit for p in palabras): continue
            if r["id"] in vistos: continue
            vistos.add(r["id"]); encontradas.append(r)
        if len(encontradas) >= 6: break
    print(f"{clave:10} {len(encontradas)} candidatas")
    for r in encontradas[:4]:
        elegidas.append({
            "tema": clave, "id": r["id"], "titulo": r.get("title") or "",
            "autor": r.get("creator") or "", "autor_url": r.get("creator_url") or "",
            "licencia": r.get("license"), "version": r.get("license_version") or "",
            "licencia_url": r.get("license_url") or "", "fuente": r.get("foreign_landing_url") or "",
            "url": r.get("url"), "an": r.get("width"), "al": r.get("height"),
            "proveedor": r.get("source") or "",
        })

json.dump(elegidas, open(S + "/candidatas.json", "w"), ensure_ascii=False, indent=1)
print("\n", len(elegidas), "candidatas guardadas")
