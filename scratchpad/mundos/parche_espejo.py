#!/usr/bin/env python3
"""EL AGUA QUE REFLEJA DE VERDAD, EN LOS CUATRO QUE FALTABAN.

El pedido fue "que todas las aguas reflejen exactamente todo, reflejos en tiempo
real". Estaba puesto en dunas, canon, estepa, acropolis y secuoya. Faltaba en
JUNGLA, PANTANO, EXO y SENDA —y justamente la que gustaba era la de la selva—,
donde el agua era un plano tintado con el reflejo del CIELO por PMREM: devuelve la
luz del cielo, si, pero no devuelve los arboles, ni el templo, ni vos.

QUE SE AGREGA. Un `Reflector` de three: una SEGUNDA PASADA DE RENDER de la escena
entera desde la camara espejada. Devuelve todo lo que hay, en tiempo real, porque
literalmente vuelve a dibujar el mundo. Es lo unico que hace eso.

Y COMO SE PAGA, porque esto tiene que correr a 60 en un telefono. Cinco reglas,
las mismas que en dunas:
  · resolucion del espejo 512 en ALTOS / 384 en MEDIOS / 256 en BAJOS, y nunca mas;
  · multisample 0: el MSAA del reflejo se paga cuatro veces y debajo de los rizos
    del agua no se nota;
  · apagado si el agua no esta a la vista;
  · apagado a mas de `lejos` metros del agua, que es casi todo el mapa;
  · el plano tintado queda ENCIMA con menos opacidad: el espejo pone lo que hay
    alrededor y el plano pone el color y el movimiento del agua. Con el plano al
    0,93 de antes el espejo quedaba tapado entero y no se veia nada.

El plano del agua NO se toca ni se reemplaza: el espejo va cuatro centimetros por
debajo. Asi el sombreador de olas, las causticas y el resto siguen exactamente
como estaban, y si `Reflector` no llega a cargar el mundo se queda con el reflejo
de cielo que tenia: se degrada, no se rompe.
"""
import pathlib, re, sys

A = pathlib.Path('/home/user/mundos/assets')

# (archivo, tamaño del plano de agua, distancia de apagado, opacidad con espejo)
MUNDOS = [
    ('mundos/jungla.html',  380, 150, .55),
    ('mundos/pantano.html', None, 130, .58),   # el agua del pantano es el mapa entero
    ('mundos/exo.html',     380, 150, .58),
    ('senda/senda.html',    380, 150, .58),
]

IMPORT = """
/* Reflector para el REFLEJO REAL del agua: es una segunda pasada de render de la
   escena desde la camara espejada, o sea que devuelve TODO lo que hay y no solo
   la luz del cielo. Se resuelve igual que GLTFLoader (disco con ?local, CDN si
   no) y por el MISMO importmap, asi que su `import from "three"` cae en el modulo
   ya cargado y no baja three dos veces. Si no llega, el espejo queda en null y el
   agua se queda con el reflejo de cielo por PMREM que tenia: se degrada. */
let Reflector = null;
try {
  const RFU = LOC ? '/_vthree/examples/jsm/objects/Reflector.js'
    : 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/objects/Reflector.js';
  Reflector = (await import(RFU)).Reflector;
} catch (e) {}
const ESPEJO_BAJOS = false;
"""

BLOQUE = """
/* ===================== EL ESPEJO DEL AGUA (tiempo real) =====================
   El plano tintado devuelve la luz del cielo (PMREM) pero no devuelve los
   arboles, ni lo construido, ni vos: se ve como una chapa de color. Este
   Reflector es una SEGUNDA PASADA DE RENDER de la escena desde la camara
   espejada, y por eso devuelve todo lo que hay, en tiempo real.

   Se paga con cinco reglas, porque esto corre en un telefono: resolucion topada
   (512/384/256 segun calidad y nunca mas), multisample 0 (el MSAA del reflejo se
   paga cuatro veces y debajo de los rizos no se nota), apagado si el agua no esta
   a la vista, apagado de lejos, y el plano del agua ENCIMA con menos opacidad —al
   0,93 que tenia, tapaba el espejo entero—.

   El plano del agua no se toca: el espejo va cuatro centimetros por debajo, asi
   que las olas, las causticas y el sombreador siguen igual que estaban. */
const ESPEJO = { m: null, lejos: LEJOS, res: 384, on: false, opac: OPAC };
if (Reflector){
  ESPEJO.m = new Reflector(ESPEJO_GEO, {
    textureWidth: 384, textureHeight: 384, multisample: 0,
    color: 0x9fb0ae, clipBias: .0035 });
  ESPEJO.m.rotation.x = -Math.PI / 2;
  ESPEJO.m.position.set(agua.position.x, agua.position.y - .04, agua.position.z);
  scene.add(ESPEJO.m);
  aguaMat.transparent = true;
  aguaMat.opacity = ESPEJO.opac;
  ESPEJO.on = true;
}
ESPEJO.calidad = g => {
  if (!ESPEJO.m) return;
  ESPEJO.res = g === 'b' ? 256 : (g === 'a' ? 512 : 384);
  ESPEJO.on = ESPEJO_BAJOS || g !== 'b';
  const rt = ESPEJO.m.getRenderTarget();
  if (rt.width !== ESPEJO.res) rt.setSize(ESPEJO.res, ESPEJO.res);
  aguaMat.opacity = ESPEJO.on ? ESPEJO.opac : .93;
};
ESPEJO.tick = () => {
  if (!ESPEJO.m) return;
  const d = Math.hypot(px - agua.position.x, pz - agua.position.z);
  ESPEJO.m.visible = ESPEJO.on && agua.visible && d < ESPEJO.lejos;
};
window.__ESPEJO = ESPEJO;
"""

n = 0
for rel, tam, lejos, opac in MUNDOS:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    o = s
    err = []

    # 1) el import de Reflector, junto al de GLTFLoader
    if 'Reflector' not in s:
        anc = "  GLTF = (await import(GLU)).GLTFLoader;\n} catch (e) {}"
        if s.count(anc) == 1:
            s = s.replace(anc, anc + IMPORT, 1)
        else:
            err.append('el import de GLTFLoader aparece %d veces' % s.count(anc))

    # 2) el bloque del espejo, justo despues de agregar el agua a la escena
    if '__ESPEJO' not in s:
        m = re.search(r"\nagua\.position\.set\([^\n]*\);\nscene\.add\(agua\);\n", s)
        if not m:
            err.append('no encuentro donde se agrega el agua a la escena')
        else:
            geo = ('new T.PlaneGeometry(%d, %d)' % (tam, tam)) if tam \
                else 'new T.PlaneGeometry(AGUA_TAM, AGUA_TAM)'
            blo = (BLOQUE.replace('ESPEJO_GEO', geo)
                         .replace('LEJOS', str(lejos))
                         .replace('OPAC', str(opac)))
            s = s[:m.end()] + blo + s[m.end():]

    # 3) que el tick corra, y que la calidad lo siga
    if err:
        print('\n'.join('  !! %s: %s' % (rel, e) for e in err)); continue
    anc = "    pasoLuz(dt);"
    if s.count("if (window.__ESPEJO) window.__ESPEJO.tick();") == 0:
        i = s.find("  if (fase === 'juego'){\n")
        j = s.find(anc, i if i > 0 else 0)
        if j < 0:
            err.append('no encuentro el bucle')
        else:
            s = (s[:j] + "    /* el espejo del agua: sigue al plano y se apaga de lejos o si no se ve */\n"
                 "    if (window.__ESPEJO) window.__ESPEJO.tick();\n" + s[j:])
    # y que setGfx le avise
    mg = re.search(r"function setGfx\(g\)\{", s)
    if mg and 'window.__ESPEJO.calidad' not in s:
        k = s.find('\n', mg.end())
        s = (s[:k + 1] + "  /* el espejo cuesta una pasada de render entera: su resolucion baja con la\n"
             "     calidad, y en BAJOS se apaga y el agua vuelve al plano tintado */\n"
             "  if (window.__ESPEJO && window.__ESPEJO.calidad) window.__ESPEJO.calidad(g);\n"
             + s[k + 1:])
    if err:
        print('\n'.join('  !! %s: %s' % (rel, e) for e in err)); continue
    if s == o:
        print('  %s: sin cambios' % rel); continue
    p.write_text(s, encoding='utf-8')
    n += 1
    print('  %s: espejo puesto (%+d bytes)' % (rel, len(s) - len(o)))
print('%d de %d con agua que refleja' % (n, len(MUNDOS)))
sys.exit(0 if n == len(MUNDOS) else 1)
