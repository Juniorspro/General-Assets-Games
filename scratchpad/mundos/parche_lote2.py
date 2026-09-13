#!/usr/bin/env python3
"""SEGUNDA MITAD DEL LOTE:

 1. LA RUTA SIEMPRE SE PUEDE SUBIR. En CAÑON no se llegaba arriba, y el parche
    anterior lo trataba como un caso especial: una burbuja de 26 m alrededor del
    pozo con el tope de pendiente flojo. El problema es general: la SENDA une los
    puntos de la historia, y si un tramo de la senda es mas empinado que el tope,
    el mundo queda sin terminar. Asi que el tope se afloja en el CORREDOR DE LA
    SENDA (15 m a cada lado) en los OCHO mundos: la ruta siempre se camina, y
    fuera de ella los farallones siguen sin poder treparse, que es lo que le da
    sentido a buscar el paso.
 2. AGUA CON REFLEJO REAL en las que no lo tenian. ACROPOLIS y SECUOYA ya usaban
    un Reflector (segunda pasada de render, con resolucion por calidad y apagado
    de lejos). Se porta tal cual a DUNAS, CAÑON y ESTEPA, que tenian el disco
    tintado y nada mas.
 3. NADIE CON LA MISMA SKIN. Habia dos, tres y hasta cuatro personajes del mismo
    mapa con el MISMO modelo, y mundos prestandose los personajes de otros
    (DUNAS con el de CAÑON, ACROPOLIS con el de JUNGLA). Cada personaje recibe un
    modelo distinto, y primero los propios del mundo.
 4. TE MIRAN AL HABLAR. Al abrir el dialogo el personaje encara al jugador de
    una, sin esperar el giro suave de 3 rad/s que lo dejaba de perfil toda la
    conversacion.
Uso: python3 parche_lote2.py [slug ...]"""
import re
import sys

M = '/home/user/General-Assets-Games/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

# ---------------------------------------------------- 1. la ruta se puede subir
PEND_FN = """/* ...SALVO EN EL CORREDOR DE LA SENDA. La senda une los puntos de la historia,
   y si un tramo es mas empinado que el tope general el mundo queda sin terminar
   (en CAÑON no se llegaba arriba por esto). Dentro de 15 m de la huella el tope
   sube a 1,9 (~62 grados), que es lo que hace falta para una escalera tallada o
   una cuesta de acantilado; fuera de ella sigue en 0,80, porque poder trepar
   cualquier pared le saca sentido a buscar el paso. */
const SENDA_R2 = 15 * 15;
function pendMax(x, z){
  const P = (typeof SENDA_PTS !== 'undefined') && SENDA_PTS;
  if (!P || !P.length) return PEND_MAX;
  for (let i = 0; i < P.length; i++){
    const dx = x - P[i][0], dz = z - P[i][1];
    if (dx * dx + dz * dz < SENDA_R2) return 1.9;
  }
  return PEND_MAX;
}
"""


def pendiente(t, slug):
    if 'SENDA_R2' in t:
        return t, 'pend(ya)'
    # el canon trae la version vieja con la burbuja: se reemplaza entera
    vieja = re.search(r"/\* \.\.\.salvo en la ESCALERA TALLADA.*?\n\}\n", t, re.S)
    if vieja:
        t = t[:vieja.start()] + PEND_FN + t[vieja.end():]
    else:
        a = "let ojoY = null;"
        if a not in t:
            return t, 'pend NO'
        t = t.replace(a, PEND_FN + a, 1)
    # y la fisica consulta pendMax en vez de la constante
    n = 0
    for v in ("if (dl > 1e-5 && (h1 - h0) / dl > PEND_MAX){",
              "if ((h2 - h0) / (Math.hypot(nx - px, nz - pz) || 1) > PEND_MAX){ nx = px; nz = pz; }"):
        if v in t:
            t = t.replace(v, v.replace('PEND_MAX', 'pendMax(px, pz)'), 1)
            n += 1
    return t, 'pend[fn+%d]' % n


# --------------------------------------------------------- 2. agua con reflejo
IMPORT_REF = """/* Reflector para el REFLEJO REAL del agua. Se resuelve igual que GLTFLoader
   (disco con ?local, CDN si no) y por el MISMO importmap, asi que su
   `import from "three"` cae en el modulo ya cargado y no baja three dos veces.
   Si no llega, el espejo queda en null y el agua se queda con el reflejo de
   cielo por PMREM que tenia: se degrada, no se rompe. */
let Reflector = null;
try {
  const RFU = LOC ? '/_vthree/examples/jsm/objects/Reflector.js'
    : 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/objects/Reflector.js';
  Reflector = (await import(RFU)).Reflector;
} catch (e) {}
const ESPEJO_BAJOS = false;
"""

ESPEJO_JS = """
  /* EL ESPEJO DEL AGUA. Un disco tintado no devuelve lo que hay alrededor: se ve
     como una chapa. Un Reflector si, pero es una SEGUNDA PASADA DE RENDER de la
     escena entera, y esto tiene que correr a 60 en un celular. Por eso se paga
     con cuatro reglas: resolucion 512 en ALTOS / 384 en MEDIOS / 256 en BAJOS y
     nunca mas; multisample 0 (el MSAA del reflejo se paga cuatro veces y abajo
     de los rizos no se nota); apagado mientras el agua no esta a la vista; y
     apagado a mas de ESPEJO.lejos metros, que es casi todo el mapa.
     El disco tintado queda ENCIMA con menos opacidad: el espejo pone lo que hay
     alrededor y el disco pone el color y el movimiento. */
  const ESPEJO = { m: null, lejos: 78, res: 384, on: false };
  if (Reflector && aguaMesh){
    ESPEJO.m = new Reflector(new T.CircleGeometry(@RAD@, 40), {
      textureWidth: 384, textureHeight: 384, multisample: 0,
      color: 0x8fa3a0, clipBias: .003 });
    ESPEJO.m.rotation.x = -Math.PI / 2;
    ESPEJO.m.visible = false;
    scene.add(ESPEJO.m);
    /* con espejo debajo el disco tiene que dejar ver: al 0,93 lo tapaba entero */
    aguaMat.opacity = .52;
    ESPEJO.on = true;
  }
  ESPEJO.calidad = g => {
    if (!ESPEJO.m) return;
    ESPEJO.res = g === 'b' ? 256 : (g === 'a' ? 512 : 384);
    ESPEJO.on = ESPEJO_BAJOS || g !== 'b';
    const rt = ESPEJO.m.getRenderTarget();
    if (rt.width !== ESPEJO.res) rt.setSize(ESPEJO.res, ESPEJO.res);
    aguaMat.opacity = ESPEJO.on ? .52 : .93;
  };
  ESPEJO.tick = () => {
    if (!ESPEJO.m) return;
    /* el espejo sigue al disco y solo se dibuja si el agua esta a la vista y
       cerca: de lejos la segunda pasada se paga sin que se note */
    ESPEJO.m.position.set(aguaMesh.position.x, aguaMesh.position.y - .04,
                          aguaMesh.position.z);
    const d = Math.hypot(px - aguaMesh.position.x, pz - aguaMesh.position.z);
    ESPEJO.m.visible = ESPEJO.on && aguaMesh.visible && d < ESPEJO.lejos;
  };
  window.__ESPEJO = ESPEJO;
"""


def espejo(t, slug):
    if 'let Reflector = null;' in t:
        return t, 'agua(ya)'
    if 'aguaMesh = new T.Mesh' not in t:
        return t, 'agua(sin disco)'
    # el import, junto al de GLTFLoader
    a = 'const $ = i => document.getElementById(i);'
    if a not in t:
        return t, 'agua(sin ancla import)'
    t = t.replace(a, IMPORT_REF + a, 1)
    # el radio del disco de agua de este mundo
    m = re.search(r"aguaMesh = new T\.Mesh\(new T\.CircleGeometry\(([0-9.]+)", t)
    rad = m.group(1) if m else '9'
    # el espejo se arma justo despues del disco
    a2 = re.search(r"(\s*scene\.add\(aguaMesh\);)", t)
    if not a2:
        return t, 'agua(sin scene.add)'
    t = t[:a2.end()] + ESPEJO_JS.replace('@RAD@', rad) + t[a2.end():]
    # el tick, junto al del pozo
    if 'POZO.tick = dt => {' in t:
        t = t.replace('POZO.tick = dt => {',
                      'POZO.tick = dt => {\n    if (ESPEJO.tick) ESPEJO.tick();', 1)
    # y la calidad grafica lo reajusta
    if 'function setGfx(' in t and '__ESPEJO' in t:
        t = re.sub(r"(function setGfx\(g\)\{)",
                   r"\1\n  if (window.__ESPEJO && window.__ESPEJO.calidad) window.__ESPEJO.calidad(g);",
                   t, count=1)
    return t, 'agua espejo(r=%s)' % rad


# ------------------------------------------------------- 3. nadie repite skin --
# modelos disponibles, en orden de preferencia por mundo: primero los propios
PROPIOS = {
    'dunas':     ['per/dunas-arriero.glb'],
    'jungla':    ['per/jungla-guia.glb', 'per/jungla-explorador.glb'],
    'volcan':    ['per/volcan-vulcanologa.glb', 'per/volcan-obrero.glb'],
    'pantano':   ['per/pantano-guia.glb', 'per/pantano-pescador.glb'],
    'canon':     ['per/canon-cuerdas.glb'],
    'estepa':    ['per/estepa-jinete.glb'],
    'acropolis': ['per/acropolis-cantero.glb'],
    'secuoya':   ['per/secuoya-botanica.glb'],
}
# el resto del reparto: humanos genericos del repo, todos con los 9 huesos
GENERICOS = ['npc/dante.glb', 'npc/viajera.glb', 'npc/cuerpo-senda.glb',
             'hyper/char.glb', 'arcade/m-arena-heroe.glb', 'frutiger/gel-player.glb',
             'npc/cuerpo-marte.glb', 'npc/cuerpo-exo.glb']


def skins(t, slug):
    """cada personaje humano del mundo con un modelo DISTINTO"""
    if '/* SKIN UNICA */' in t:
        return t, 'skins(ya)'
    # los glb de personaje que aparecen, en orden de aparicion
    apar = [(m.start(), m.group(1)) for m in re.finditer(r"glb: '([^']*)'", t)]
    humanos = [(i, u) for i, u in apar
               if not re.search(r"canelo|perro|dog|muro|palm|tree|bush", u)]
    if not humanos:
        return t, 'skins(sin humanos)'
    # el orden del reparto: propios del mundo primero, despues genericos
    orden = PROPIOS.get(slug, []) + [g for g in GENERICOS]
    # el resto de los propios de otros mundos, al final, para no quedarse corto
    otros = [u for m in PROPIOS.values() for u in m if u not in orden]
    orden += otros
    nuevo, usados, k = t, set(), 0
    # se reemplaza de atras para adelante, asi los offsets no se corren
    for i, u in reversed(humanos):
        pass
    reparto = []
    for _i, u in humanos:
        while k < len(orden) and orden[k] in usados:
            k += 1
        pick = orden[k] if k < len(orden) else u
        usados.add(pick)
        reparto.append(pick)
        k += 1
    for (i, u), pick in zip(reversed(humanos), reversed(reparto)):
        nuevo = nuevo[:i] + ("glb: '%s'" % pick) + nuevo[i + len("glb: '%s'" % u):]
    nuevo = nuevo.replace('const NPCS = [];', 'const NPCS = [];   /* SKIN UNICA */', 1)
    return nuevo, 'skins[%d distintos]' % len(set(reparto))


# ------------------------------------------------------------ 4. te miran ------
def mirada(t, slug):
    if 'ENCARA DE UNA' in t:
        return t, 'mirada(ya)'
    v = "function hablaNPC(npc){"
    if v not in t:
        return t, 'mirada NO'
    n = """function hablaNPC(npc){
  /* ENCARA DE UNA al jugador. Con el giro suave de 3 rad/s el personaje se
     pasaba la conversacion entera de perfil, porque el dialogo pausa el mundo y
     el giro nunca llegaba a terminar. */
  if (npc.fig) npc.fig.rotation.y =
    Math.atan2(px - npc.fig.position.x, pz - npc.fig.position.z);"""
    return t.replace(v, n, 1), 'mirada OK'


PASOS = [pendiente, espejo, skins, mirada]


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        msgs = []
        for fn in PASOS:
            t, m = fn(t, s)
            msgs.append(m)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} ' + ' · '.join(msgs))


if __name__ == '__main__':
    main(sys.argv[1:] or SLUGS)
