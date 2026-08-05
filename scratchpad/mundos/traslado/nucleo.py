#!/usr/bin/env python3
"""EL TRASLADO PROPIO DE CADA MUNDO: el armazon comun y los ganchos.

Los quince mundos se recorrian todos igual —caminar y correr— y con eso todos se
sentian el mismo mundo con otra textura. Cada uno lleva ahora su propia manera de
moverse, sacada de lo que YA tiene el terreno: la duna tiene tablas, la estepa
caballos, el pantano canoa, el canon cuerdas, la selva lianas, el volcan placas
de corteza.

Lo que cambia de un mundo a otro es el PASO (la fisica de la mecanica) y lo que
se VE. Todo lo demas es igual en los seis, y esta aca una sola vez:

  · el modulo `MOD`, con la misma interfaz que ya usaban ACROPOLIS y SECUOYA:
    .modo .accion() .usar() .suelta() .paso(dt) .aviso(acc) .est()
  · los cinco enganches en el mundo: accionUsable, usarAccion, saltar, fisica y
    el aviso de pantalla, mas el corte del capitulo automatico (el dialogo
    congela la fisica: dispararlo a media mecanica te deja colgado en el aire)
  · el aviso `#aviso`: una linea corta encima del boton USAR, que es todo el
    tutorial que tiene el traslado
  · los contadores de TIEMPO SIMULADO, sin los cuales una prueba mide el
    emulador y no la mecanica (sin tarjeta de video estos mundos corren a tres
    cuadros por segundo y dt viene topado a 0,05)
  · los ganchos de prueba en window.__S
"""
import pathlib, re, sys

RAIZ = pathlib.Path('/home/user/mundos')

# ---------------------------------------------------------------- el armazon
ARMAZON = """/* ================= {TITULO} =================
{RAZON}
   ========================================================================== */
const {MOD} = (() => {{
  const A = {{ modo: null, vel: 0, hd: 0, act: null, PUE: [],
    nPaso: 0, tSim: 0, nVuelo: 0, altMax: 0, absY: 0, absV: 0, tSol: 0, sac: 0 }};
  const TT = {TT};
  const tx = k => ((TT[LANG] || TT.en)[k] || '');
{CUERPO}
  /* DESPEGAR. `aireY` es "cuanto estas por encima del suelo", y el suelo se va
     para abajo mientras volas: integrado asi, el primer cuadro en el aire ya
     daba aireY negativo —el suelo bajaba mas rapido que la gravedad— y
     aterrizabas al instante, o sea que volar por encima de un borde era
     imposible por definicion. Volando se lleva la altura ABSOLUTA y `aireY` sale
     de restarle el terreno. */
  A.despega = vy => {{
    if (enAire) return;
    enAire = true;
    A.absY = H(px, pz) + aireY;
    A.absV = vy; aireV = vy;
    A.nVuelo++;
  }};
  /* la caida, con la altura absoluta. Devuelve true si acaba de aterrizar. */
  A.caida = (dt, hs) => {{
    if (!enAire) return false;
    A.absV -= GRAV * dt;
    A.absY += A.absV * dt;
    aireV = A.absV;
    aireY = A.absY - hs;
    if (aireY > A.altMax) A.altMax = aireY;
    if (aireY <= 0){{ aireY = 0; aireV = 0; enAire = false; return true; }}
    return false;
  }};
  A.est = () => ({{ modo: A.modo, vel: +A.vel.toFixed(2), aire: enAire,
    nPaso: A.nPaso, tSim: +A.tSim.toFixed(2),
    nVuelo: A.nVuelo, altMax: +A.altMax.toFixed(2),
    hd: +A.hd.toFixed(2), y: +(H(px, pz) + aireY).toFixed(2),
    pue: A.PUE.map(P => ({{ x: Math.round(P.x), z: Math.round(P.z), lib: P.lib }})) }});
  return A;
}})();
"""

CSS_AVISO = """  /* AVISO DEL TRASLADO: una linea corta, centrada, por encima del boton USAR y
     de la palanca para no tapar ni una cosa ni la otra. Es todo el tutorial que
     tiene el traslado: aparece cuando estas donde se usa y se va cuando no. */
  #aviso{position:fixed;left:50%;bottom:max(96px,20vh);transform:translateX(-50%);
    display:none;pointer-events:none;text-align:center;max-width:80vw;z-index:4;
    font:800 11.5px/1.35 ui-sans-serif,system-ui,sans-serif;letter-spacing:.07em;
    padding:7px 13px;border-radius:10px;background:rgba(FONDO,.68);
    border:1px solid rgba(BORDE,.34);color:TINTA;backdrop-filter:blur(4px);
    text-shadow:0 1px 6px rgba(0,0,0,.7)}
  #aviso.on{display:block}
  body.hablando #aviso{display:none}
  @media (max-height:430px){ #aviso{bottom:max(84px,26vh);font-size:10.5px} }
"""


def altura_ojo(s, err):
    """El OJO A OTRA ALTURA. Montado en un caballo el ojo va a la altura de la
    montura, y en una canoa va casi al agua: sin esto el jinete flota a la
    altura de sus propias botas. Se agrega `altExtra`, que la camara suma, y que
    el traslado mueve; en cero, todo queda exactamente como estaba."""
    if 'altExtra' in s:
        return s
    A = "const OJO = 1.7, VEL = 6.2, VEL_CORRE = 11.5;"
    B = (A + "\n/* ALTURA DE MAS DEL OJO. La pone el traslado del mundo: montado en un caballo\n"
         "   el ojo va a la altura de la montura y en una canoa va casi al agua. En cero\n"
         "   —o sea a pie— la camara queda exactamente como estaba. */\nlet altExtra = 0;")
    if s.count(A) == 1:
        s = s.replace(A, B, 1)
    else:
        err.append('altExtra: la linea de OJO aparece %d veces' % s.count(A))
        return s
    A2 = "+ aireY + OJO + Math.abs(Math.sin(bobF)) * .06 * v, ez);"
    B2 = "+ aireY + OJO + altExtra + Math.abs(Math.sin(bobF)) * .06 * v, ez);"
    if s.count(A2) == 1:
        s = s.replace(A2, B2, 1)
    else:
        err.append('altExtra: la camara aparece %d veces' % s.count(A2))
    return s


def engancha(s, mod, tipo, js, css_col, err, cede_fisica=True):
    """Mete el modulo y sus cinco enganches. `tipo` es la etiqueta de la accion."""
    # 1) el modulo, justo antes del paso del objetivo (ahi ya existe todo lo que usa)
    anc = "/* -------- objetivo: marcador 3D + distancia + botón USAR"
    if s.count(anc) == 1:
        s = s.replace(anc, js + '\n' + anc, 1)
    else:
        err.append('modulo: ancla %d veces' % s.count(anc))

    # 2) el aviso en pantalla
    if '#aviso' not in s:
        m = re.search(r"\n  #pcHelp\{", s)
        if m:
            css = (CSS_AVISO.replace('FONDO', css_col[0])
                             .replace('BORDE', css_col[1])
                             .replace('TINTA', css_col[2]))
            s = s[:m.start() + 1] + css + s[m.start() + 1:]
        else:
            err.append('css: no encuentro #pcHelp')
        a2 = '  <div id="pcHelp"></div>'
        if s.count(a2) == 1:
            s = s.replace(a2, '  <div id="aviso"></div>\n' + a2, 1)
        else:
            err.append('div del aviso: ancla %d veces' % s.count(a2))

    # 3) accionUsable: el traslado manda si estas dentro, y va antes de los items
    VA = """function accionUsable(){
  const C = CAPS[cap];
  const p = POI[C.obj];
  if (C.usar && Math.hypot(px - p.x, pz - p.z) < 7 && MISION.lista(cap))
    return { tipo: 'cap' };"""
    VN = """function accionUsable(){
  const C = CAPS[cap];
  const p = POI[C.obj];
  /* DENTRO DEL TRASLADO manda el traslado y nada mas: si no, llegar al objetivo
     encima de la mecanica dispararia el capitulo a toda velocidad —y el dialogo
     congela la fisica— y ademas no habria como salirse, porque salirse es el
     mismo boton. */
  if (%(M)s.modo){
    const t2 = %(M)s.accion();
    return t2 ? { tipo: '%(T)s', tr: t2 } : null;
  }
  if (C.usar && Math.hypot(px - p.x, pz - p.z) < 7 && MISION.lista(cap))
    return { tipo: 'cap' };
  const tr = %(M)s.accion();
  if (tr) return { tipo: '%(T)s', tr };""" % {'M': mod, 'T': tipo}
    if s.count(VA) == 1:
        s = s.replace(VA, VN, 1)
    else:
        err.append('accionUsable: %d veces' % s.count(VA))

    VA = "  if (acc.tipo === 'cap') llegaObjetivo();"
    VN = ("  if (acc.tipo === '%s') %s.usar(acc.tr);\n"
          "  else if (acc.tipo === 'cap') llegaObjetivo();" % (tipo, mod))
    if s.count(VA) == 1:
        s = s.replace(VA, VN, 1)
    else:
        err.append('usarAccion: %d veces' % s.count(VA))

    # 4) el salto y la fisica
    VA = "function saltar(){ if (enAire) return; enAire = true; aireV = SALTO_V; }"
    VN = ("function saltar(){\n"
          "  if (%s.modo){ %s.salta(); return; }   /* dentro del traslado, SALTO es lo suyo */\n"
          "  if (enAire) return; enAire = true; aireV = SALTO_V;\n}" % (mod, mod))
    if s.count(VA) == 1:
        s = s.replace(VA, VN, 1)
    else:
        err.append('saltar: %d veces' % s.count(VA))

    if cede_fisica:
        VA = "function fisica(dt){\n  yaw -= keyL.x * 2.2 * dt;"
        VN = ("function fisica(dt){\n"
              "  /* dentro del traslado no se camina: tiene su propio paso, y usa los MISMOS\n"
              "     aireY/aireV/ojoY, asi que al salirse el estado sigue valiendo tal cual */\n"
              "  if (%s.modo){ %s.paso(dt); return; }\n"
              "  yaw -= keyL.x * 2.2 * dt;" % (mod, mod))
        if s.count(VA) == 1:
            s = s.replace(VA, VN, 1)
        else:
            err.append('fisica: %d veces' % s.count(VA))

    # 5) el aviso y el corte del capitulo automatico
    VA = """  if (!C.usar && cerca && !enDlg && MISION.lista(cap)){
    llegaObjetivo();
    return;
  }
  const acc = accionUsable();
  $('bUsar').classList.toggle('on', !!acc && !enDlg);"""
    VN = """  /* el capitulo automatico NO se dispara dentro del traslado: el dialogo congela
     la fisica y te dejaria clavado a media mecanica, en el aire. Se dispara al
     salirte y llegar caminando, que es medio segundo despues. */
  if (!C.usar && cerca && !enDlg && !%(M)s.modo && MISION.lista(cap)){
    llegaObjetivo();
    return;
  }
  const acc = accionUsable();
  $('bUsar').classList.toggle('on', !!acc && !enDlg);
  const av = %(M)s.aviso(acc);
  $('aviso').textContent = av;
  $('aviso').classList.toggle('on', !!av && !enDlg);""" % {'M': mod}
    if s.count(VA) == 1:
        s = s.replace(VA, VN, 1)
    else:
        err.append('pasoObjetivo: %d veces' % s.count(VA))

    # 6) los ganchos de prueba
    VA = "  mira(y, p){ yaw = y; if (p != null) pitch = p; },"
    VN = ("  /* la palanca a mano y el sitio del traslado, para probarlo sin un dedo */\n"
          "  palanca(x, y){ movV.x = x; movV.y = y; },\n"
          "  %(t)s(){ return %(M)s.est(); },\n"
          "  %(t)sIr(k){ const P = %(M)s.PUE[k]; if (!P) return null;\n"
          "    px = P.x; pz = P.z; ojoY = H(px, pz); aireY = 0; enAire = false;\n"
          "    return %(M)s.est(); },\n" % {'M': mod, 't': tipo}) + VA
    if s.count(VA) == 1:
        s = s.replace(VA, VN, 1)
    else:
        err.append('ganchos __S: %d veces' % s.count(VA))
    return s


def aplica(rel, mod, tipo, titulo, razon, tt, cuerpo, css_col, ojo=False):
    p = RAIZ / 'assets' / rel
    s = p.read_text(encoding='utf-8')
    o = s
    err = []
    js = ARMAZON.format(TITULO=titulo, RAZON=razon, MOD=mod, TT=tt, CUERPO=cuerpo)
    if ojo:
        s = altura_ojo(s, err)
    s = engancha(s, mod, tipo, js, css_col, err)
    if err:
        print('\n'.join('  !! ' + e for e in err)); return False
    if s == o:
        print('  sin cambios'); return False
    p.write_text(s, encoding='utf-8')
    print('  %s: %s puesto (%+d bytes)' % (rel, mod, len(s) - len(o)))
    return True
