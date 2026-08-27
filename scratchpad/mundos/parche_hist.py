#!/usr/bin/env python3
"""HISTORIAS Y GENTE propias para CANON, ESTEPA, ACROPOLIS y SECUOYA. Los cuatro
salieron clonados de DUNAS y contaban el MISMO cuento con otro paisaje: la misma
SIRA, la misma caravana, el mismo pozo, los mismos tres NPC. Aca cada uno recibe
su protagonista, sus seis capitulos, su gente (cinco personajes repartidos por
lugares distintos, no todos en el campamento) y su bajada de titulo, en los tres
idiomas.
Uso: python3 parche_hist.py [slug ...]"""
import re, sys
sys.path.insert(0, '/home/user/General-Assets-Games/scratchpad/mundos')
from hist import MUNDOS

M = '/home/user/General-Assets-Games/assets/mundos/'
IDIOMAS = ['es', 'en', 'pt']


def js(s):
    """texto de python a literal js con comillas simples"""
    return (s.replace('\\', '\\\\').replace("'", "\\'")
             .replace('\n', '\\n').replace('\r', ''))


def bloque_caps(caps):
    out = ['caps: [']
    for c in caps:
        if len(c) == 6:
            n, tt, obj, objT, dT, d = c; usar = False
        else:
            n, tt, obj, objT, usar, dT, d = c
        out.append("  { n: '%s', t: '%s', obj: '%s', objT: '%s',%s"
                   % (js(n), js(tt), obj, js(objT), " usar: true," if usar else ""))
        out.append("    dT: '%s', d: '%s' }," % (js(dT), js(d)))
    out[-1] = out[-1].rstrip(',')
    out.append('] }')
    return '\n'.join(out)


def bloque_npc(d):
    out = ['npc: {']
    for k, lineas in d.items():
        if lineas == ['—']:
            continue
        out.append("  %s: [%s]," % (k, ',\n    '.join("'%s'" % js(x) for x in lineas)))
    out[-1] = out[-1].rstrip(',')
    out.append('},')
    return '\n'.join(out)


def parche(t, slug):
    if slug not in MUNDOS:
        return t, 'hist(no toca)'
    if '/* GENTE PROPIA' in t:
        return t, 'hist(ya)'
    W = MUNDOS[slug]
    msgs = []

    # ---- 1) las tres tablas de idioma: npc, sub, intro, caps ---------------
    # el motor guarda L = { es: { npc:{...}, ui:{...}, caps:[...] }, en:..., pt:... }
    # se reemplaza cada bloque npc y cada bloque caps, y los textos de ui.
    # las tres tablas arrancan con  es: { npc: {   /  en: { npc: {  /  pt: { npc: {
    trozos = re.split(r"\n(es|en|pt): \{ npc: \{", '\n' + t)
    if len(trozos) != 7:
        return t, 'hist(no encontre las 3 tablas npc: %d)' % (len(trozos) // 2)
    nuevo = trozos[0]
    for i in range(3):
        lang, cuerpo = trozos[1 + i * 2], trozos[2 + i * 2]
        # cortar el bloque npc viejo (hasta el "ui: {" de esa tabla)
        j = cuerpo.index('\nui: {')
        cuerpo = cuerpo[j:]
        # el bloque caps viejo, hasta el cierre "\n] },"  o  "\n] }"
        k = cuerpo.index('\ncaps: [')
        m = re.search(r"\n\] \},?", cuerpo[k:])
        resto = cuerpo[k + m.end():]
        ui = cuerpo[:k]
        # pisar sub / introT / intro de esa tabla
        # OJO: el reemplazo va por lambda. Con un string, re.sub interpreta los
        # \\n del texto y mete saltos de linea DE VERDAD dentro del literal js.
        rep = lambda v: (lambda m: v)
        ui = re.sub(r"sub: '[^']*'", rep("sub: '%s'" % js(W['sub'][i])), ui, count=1)
        ui = re.sub(r"introT: '[^']*'", rep("introT: '%s'" % js(W['intro'][i][0])), ui, count=1)
        ui = re.sub(r"intro: '[^']*'", rep("intro: '%s'" % js(W['intro'][i][1])), ui, count=1)
        coma = ',' if m.group(0).endswith(',') else ''
        nuevo += ('\n%s: { ' % lang + bloque_npc(W['npc'][i]) + ui
                  + bloque_caps(W['caps'][i]) + coma + resto)
    t = nuevo.lstrip('\n')
    msgs.append('textos')

    # ---- 2) la GENTE: cinco personajes en lugares distintos ---------------
    # se reemplaza el bloque de nuevoNPC() clonado de dunas
    m = re.search(r"\{\n  const mj = POI\.mojon.*?\n\}\n", t, re.S)
    if not m:
        return t, 'hist[%s] gente(NO ENCONTRE)' % '+'.join(msgs)
    lin = ['{',
           '  /* GENTE PROPIA de este mundo: cinco personajes repartidos por lugares',
           '     distintos (no todos amontonados en el campamento como venia del clon),',
           '     asi hay alguien con quien hablar en casi cada desvio. */']
    caras = {'h': 'caraNaira', 'p': 'caraCanelo'}
    for i, (clave, nombre, lugar, dx, dz, giro, glb, retr, tipo) in enumerate(W['gente']):
        fig = ("figHumano(0x%06x, 0x%06x)" % (0x8a5a3a + i * 0x101008, 0xd8c49a + i * 0x40404)
               if tipo == 'h' else 'figPerro(0xc8925a)')
        lin.append('  %snuevoNPC({ fig: %s,' % ('window.__P%d = ' % i if i == 0 else '', fig))
        lin.append("    x: POI.%s.x + %s, z: POI.%s.z + %s, nombre: '%s', clave: '%s',"
                   % (lugar, dx, lugar, dz, nombre, clave))
        lin.append("    cara: %s,%s" % (caras[tipo],
                   (" retrato: AX('retrato/%s.jpg')," % retr) if retr else ''))
        if tipo == 'p':
            lin.append("    giro: %s, glb: '%s', glbEsc: .85, glbGiro: -Math.PI/2, glbY: .34 });"
                       % (giro, glb))
        else:
            lin.append("    giro: %s, glb: '%s', glbEsc: 1, glbGiro: Math.PI });" % (giro, glb))
    lin.append('}\n')
    t = t[:m.start()] + '\n'.join(lin) + t[m.end():]
    msgs.append('gente%d' % len(W['gente']))

    # ---- 3) el que sigue al jugador: el primero de la lista ---------------
    t = re.sub(r"window\.__NAIRA\.hablado[^\n]*\n[^\n]*window\.__NAIRA\.sigue = true; \} \} \);",
               "", t)
    t = t.replace('window.__NAIRA', 'window.__P0')
    return t, 'hist[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(MUNDOS))
