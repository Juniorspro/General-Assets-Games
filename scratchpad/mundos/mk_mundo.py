#!/usr/bin/env python3
"""Genera un mundo nuevo clonando dunas.html (motor de SENDA, ya probado) y
pisando SOLO los bloques propios del mundo: titulo, audio, cielo, texturas,
paleta/niebla, colores del cuerpo, la forma del terreno y los nombres de la
historia. Uso: python3 mk_mundo.py <slug>"""
import re, sys, os

M = '/home/user/General-Assets-Games/assets/mundos/'
BASE = M + 'dunas.html'

W = {
 'canon': dict(
   nombre='CAÑÓN', sub='el cañón rojo · bajar al río y encontrar el paso',
   paso='pasos-arena.mp3', pasoRate=1.25, menu='m-izq m-abajo',
   niebla='#d9a279', cuerpo="{ mangas: 0xd9c3a0, guantes: 0xa86b3c, pantalon: 0x8f7350, botas: 0x4a3a24, glb: 'npc/cuerpo-senda.glb' }",
   # mesetas altas partidas por un cañón profundo que corre en diagonal
   terreno='''
  let h = 26 + fbm(x * .0026 + 13, z * .0026 + 51) * 16;        /* la meseta alta */
  /* EL CAÑÓN: una garganta que cruza el mapa; el fondo es casi plano (el río) */
  const eje = (x * .78 + z * .62) / 1.0;                        /* rumbo del cañón */
  const g = Math.abs(eje) / 96;                                 /* 0 en el eje */
  const corte = Math.exp(-g * g * 2.4);
  h -= 52 * corte;
  h += fbm(x * .011 + 71, z * .011 + 5) * 5.5 * (1 - corte * .7); /* escalones */
  /* terrazas: la roca sedimentaria sube en peldaños */
  h = Math.floor(h / 6.5) * 6.5 + (h % 6.5) * .35;
  /* arcos y agujas cerca de las ruinas */
  const dR = Math.hypot(x - POI.ruinas.x, z - POI.ruinas.z);
  h += 16 * Math.exp(-(dR * dR) / (70 * 70));
  const dC = Math.hypot(x - POI.cresta.x, z - POI.cresta.z);
  h += 22 * Math.exp(-(dC * dC) / (130 * 130));                 /* el mirador */
  return h;'''),

 'estepa': dict(
   nombre='ESTEPA', sub='la estepa sin fin · llegar al campamento antes de la tormenta',
   paso='pasos-pasto.mp3', pasoRate=1.35, menu='m-der m-medio',
   niebla='#8f9aa8',
   cuerpo="{ mangas: 0xbfc9d6, guantes: 0x7a5f3c, pantalon: 0x5c5f52, botas: 0x3a3226, glb: 'npc/cuerpo-senda.glb' }",
   # lomadas inmensas y suaves, nada abrupto: la inmensidad es el personaje
   terreno='''
  let h = fbm(x * .0018 + 23, z * .0018 + 61) * 58 - 20;        /* lomadas enormes */
  h += fbm(x * .0075 + 9, z * .0075 + 37) * 7.5;                /* ondulacion media */
  h += fbm(x * .028 + 77, z * .028 + 3) * 1.1;                  /* matas de pasto */
  /* una hondonada con un arroyo cerca del oasis (aca: la aguada) */
  const dO = Math.hypot(x - POI.oasis.x, z - POI.oasis.z);
  h -= 13 * Math.exp(-(dO * dO) / (150 * 150));
  /* la loma del campamento, para verlo de lejos */
  const dC = Math.hypot(x - POI.cresta.x, z - POI.cresta.z);
  h += 26 * Math.exp(-(dC * dC) / (190 * 190));
  return h;'''),

 'acropolis': dict(
   nombre='ACRÓPOLIS', sub='el santuario sobre el mar · levantar las cinco columnas',
   paso='pasos-pasto.mp3', pasoRate=1.3, menu='m-izq m-arriba',
   niebla='#bfe0e8',
   cuerpo="{ mangas: 0xf2ede0, guantes: 0xc9a06a, pantalon: 0xd8cdb8, botas: 0x6b5334, glb: 'npc/cuerpo-senda.glb' }",
   # una meseta alta que cae a pico al mar por el sur
   terreno='''
  let h = 30 + fbm(x * .0031 + 5, z * .0031 + 19) * 20;          /* la meseta */
  /* EL ACANTILADO: al sur (z creciente) el suelo se derrumba al mar */
  const borde = (z - 210) / 70;
  h -= 74 / (1 + Math.exp(-borde * 2.6));                        /* caida sigmoide */
  h += fbm(x * .014 + 44, z * .014 + 8) * 4.2;                   /* roca suelta */
  /* la explanada del santuario: bien plana, para que las columnas apoyen */
  const dR = Math.hypot(x - POI.ruinas.x, z - POI.ruinas.z);
  const wR = Math.exp(-(dR * dR) / (95 * 95));
  h = h * (1 - wR * .85) + 41 * (wR * .85);
  const dC = Math.hypot(x - POI.cresta.x, z - POI.cresta.z);
  h += 14 * Math.exp(-(dC * dC) / (110 * 110));                  /* el promontorio */
  return h;'''),

 'secuoya': dict(
   nombre='SECUOYA', sub='el bosque de gigantes · encontrar el árbol madre',
   paso='pasos-musgo.mp3', pasoRate=1.15, menu='m-der m-abajo',
   niebla='#9fb0a4',
   cuerpo="{ mangas: 0x6f7d63, guantes: 0x5a4326, pantalon: 0x4a4b3c, botas: 0x2e2a20, glb: 'npc/cuerpo-senda.glb' }",
   # ondulado suave con vaguadas hondas y troncos caidos: escala vertical al cielo
   terreno='''
  let h = fbm(x * .0029 + 31, z * .0029 + 7) * 30 - 8;           /* lomas del bosque */
  h += fbm(x * .0098 + 53, z * .0098 + 27) * 6.5;                /* raices y bultos */
  h += fbm(x * .034 + 88, z * .034 + 14) * 1.4;                  /* hojarasca */
  /* la vaguada del arroyo: honda y angosta, cruza el bosque */
  const v = (x * .42 - z * .91);
  h -= 15 * Math.exp(-(v * v) / (52 * 52));
  /* el claro del arbol madre: plano y ancho */
  const dR = Math.hypot(x - POI.ruinas.x, z - POI.ruinas.z);
  const wR = Math.exp(-(dR * dR) / (80 * 80));
  h = h * (1 - wR * .8) + alturaBaseRef(POI.ruinas.x, POI.ruinas.z) * (wR * .8);
  const dC = Math.hypot(x - POI.cresta.x, z - POI.cresta.z);
  h += 18 * Math.exp(-(dC * dC) / (140 * 140));                  /* la loma alta */
  return h;'''),
}

def gen(slug):
    w = W[slug]
    s = open(BASE, encoding='utf8').read()

    # --- textos visibles -------------------------------------------------
    s = s.replace('<title>DUNAS</title>', f'<title>{w["nombre"]}</title>')
    s = s.replace('<h1>DUNAS</h1>', f'<h1>{w["nombre"]}</h1>')
    s = re.sub(r'<div class="sub">[^<]*</div>', f'<div class="sub">{w["sub"]}</div>', s, count=1)
    s = s.replace('<div id="cargando">CARGANDO DUNAS…</div>',
                  f'<div id="cargando">CARGANDO {w["nombre"]}…</div>')

    # --- bloques de mundo -----------------------------------------------
    s = re.sub(r"const MUNDO_AUDIO = \{[^}]*\};",
      ("const MUNDO_AUDIO = { amb: 'amb-%s.m4a', mus: 'mus-%s.m4a', paso: '%s', pasoRate: %s };"
       % (slug, slug, w['paso'], w['pasoRate'])), s, count=1)
    s = re.sub(r"const MUNDO_CIELO = '[^']*';",
               f"const MUNDO_CIELO = 'cielo-{slug}.jpg';", s, count=1)
    s = re.sub(r"const MUNDO_TEX = \{[^}]*\};",
      ("const MUNDO_TEX = { arena: 'tex-%s-1.jpg', sotavento: 'tex-%s-2.jpg' };" % (slug, slug)),
      s, count=1)
    s = re.sub(r"const MUNDO_MENU = '[^']*';",
               f"const MUNDO_MENU = '{w['menu']}';", s, count=1)
    s = re.sub(r"const MUNDO_CUERPO = \{[^}]*\};[^\n]*",
               f"const MUNDO_CUERPO = {w['cuerpo']};", s, count=1)

    # --- niebla / paleta -------------------------------------------------
    s = re.sub(r"scene\.fog = new T\.Fog\(new T\.Color\('#[0-9a-fA-F]{6}'\)",
               f"scene.fog = new T.Fog(new T.Color('{w['niebla']}')", s, count=1)

    # --- el terreno: se reemplaza el cuerpo de alturaBase ----------------
    m = re.search(r"function alturaBase\(x, z\)\{(.*?)\n\}\n", s, re.S)
    if not m:
        raise SystemExit('no encontre alturaBase')
    # alias por si el terreno nuevo se auto-referencia
    nuevo = ("function alturaBaseRef(x, z){ return fbm(x * .003 + 11, z * .003 + 23) * 26; }\n"
             "function alturaBase(x, z){" + w['terreno'] + "\n}\n")
    s = s[:m.start()] + nuevo + s[m.end():]

    out = M + slug + '.html'
    open(out, 'w', encoding='utf8').write(s)
    print(f'{slug}: {len(s)//1024} KB  ->  {out}')

if __name__ == '__main__':
    for slug in (sys.argv[1:] or list(W)):
        gen(slug)
