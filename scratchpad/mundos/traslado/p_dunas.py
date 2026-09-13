#!/usr/bin/env python3
"""DUNAS: la tabla de arena. Mete el modulo y lo engancha en los cinco sitios
que hacen falta (accion, usar, salto, fisica y el aviso de pantalla)."""
import pathlib, re, sys

RAIZ = pathlib.Path('/home/user/mundos')
p = RAIZ / 'assets/mundos/dunas.html'
s = p.read_text(encoding='utf-8')
o = s
JS = (RAIZ / 'scratchpad/mundos/traslado/dunas_tabla.js').read_text(encoding='utf-8')
err = []

# ---------------------------------------------------------------- 1) el modulo
anc = "/* -------- objetivo: marcador 3D + distancia + botón USAR"
if s.count(anc) == 1:
    s = s.replace(anc, JS + '\n' + anc, 1)
else:
    err.append('modulo: ancla %d veces' % s.count(anc))

# ------------------------------------------------------------- 2) el CSS y el div
CSS = """  /* AVISO DEL TRASLADO: una linea corta, centrada, por encima del boton USAR y
     de la palanca para no tapar ni una cosa ni la otra. Es todo el tutorial que
     tiene la tabla: aparece cuando estas donde se usa y se va cuando no. */
  #aviso{position:fixed;left:50%;bottom:max(96px,20vh);transform:translateX(-50%);
    display:none;pointer-events:none;text-align:center;max-width:80vw;z-index:4;
    font:800 11.5px/1.35 ui-sans-serif,system-ui,sans-serif;letter-spacing:.07em;
    padding:7px 13px;border-radius:10px;background:rgba(38,20,8,.66);
    border:1px solid rgba(240,200,140,.34);color:#f6e6cc;backdrop-filter:blur(4px);
    text-shadow:0 1px 6px rgba(0,0,0,.7)}
  #aviso.on{display:block}
  body.hablando #aviso{display:none}
  @media (max-height:430px){ #aviso{bottom:max(84px,26vh);font-size:10.5px} }
"""
if '#aviso' in s:
    pass
else:
    m = re.search(r"\n  #pcHelp\{", s)
    if m:
        s = s[:m.start() + 1] + CSS + s[m.start() + 1:]
    else:
        err.append('css: no encuentro #pcHelp')
    a2 = '  <div id="pcHelp"></div>'
    if s.count(a2) == 1:
        s = s.replace(a2, '  <div id="aviso"></div>\n' + a2, 1)
    else:
        err.append('div: ancla %d veces' % s.count(a2))

# ------------------------------------------------------------- 3) accionUsable
VA = """function accionUsable(){
  const C = CAPS[cap];
  const p = POI[C.obj];
  if (C.usar && Math.hypot(px - p.x, pz - p.z) < 7 && MISION.lista(cap))
    return { tipo: 'cap' };
  const it = itemCerca();"""
VN = """function accionUsable(){
  const C = CAPS[cap];
  const p = POI[C.obj];
  /* MONTADO EN LA TABLA manda la tabla y nada mas: si no, llegar al objetivo
     encima de la tabla dispararia el capitulo con el jugador a 25 m/s, y el
     dialogo congela la fisica (solo corre si !enDlg). Ademas no habria como
     bajarse, porque bajarse es el mismo boton. */
  if (TABLA.modo){
    const t2 = TABLA.accion();
    return t2 ? { tipo: 'tabla', tb: t2 } : null;
  }
  if (C.usar && Math.hypot(px - p.x, pz - p.z) < 7 && MISION.lista(cap))
    return { tipo: 'cap' };
  const tb = TABLA.accion();
  if (tb) return { tipo: 'tabla', tb };
  const it = itemCerca();"""
if s.count(VA) == 1:
    s = s.replace(VA, VN, 1)
else:
    err.append('accionUsable: %d veces' % s.count(VA))

VA = "  if (acc.tipo === 'cap') llegaObjetivo();"
VN = "  if (acc.tipo === 'tabla') TABLA.usar(acc.tb);\n  else if (acc.tipo === 'cap') llegaObjetivo();"
if s.count(VA) == 1:
    s = s.replace(VA, VN, 1)
else:
    err.append('usarAccion: %d veces' % s.count(VA))

# ------------------------------------------------------------- 4) salto y fisica
VA = "function saltar(){ if (enAire) return; enAire = true; aireV = SALTO_V; }"
VN = ("function saltar(){\n"
      "  if (TABLA.modo){ TABLA.salta(); return; }   /* montado, SALTO es el ollie */\n"
      "  if (enAire) return; enAire = true; aireV = SALTO_V;\n}")
if s.count(VA) == 1:
    s = s.replace(VA, VN, 1)
else:
    err.append('saltar: %d veces' % s.count(VA))

VA = "function fisica(dt){\n  yaw -= keyL.x * 2.2 * dt;"
VN = ("function fisica(dt){\n"
      "  /* en la tabla no se camina: la tabla tiene su propio paso y usa los mismos\n"
      "     aireY/aireV/ojoY, asi que al bajarte el estado sigue valiendo tal cual */\n"
      "  if (TABLA.modo){ TABLA.paso(dt); return; }\n"
      "  yaw -= keyL.x * 2.2 * dt;")
if s.count(VA) == 1:
    s = s.replace(VA, VN, 1)
else:
    err.append('fisica: %d veces' % s.count(VA))

# ------------------------------------------------------------- 5) el aviso y el auto-cap
VA = """  if (!C.usar && cerca && !enDlg && MISION.lista(cap)){
    llegaObjetivo();
    return;
  }
  const acc = accionUsable();
  $('bUsar').classList.toggle('on', !!acc && !enDlg);"""
VN = """  /* el capitulo automatico NO se dispara montado en la tabla: el dialogo congela
     la fisica y te dejaria clavado a media bajada, en el aire. Se dispara al
     bajarte y llegar caminando, que es medio segundo despues. */
  if (!C.usar && cerca && !enDlg && !TABLA.modo && MISION.lista(cap)){
    llegaObjetivo();
    return;
  }
  const acc = accionUsable();
  $('bUsar').classList.toggle('on', !!acc && !enDlg);
  const av = TABLA.aviso(acc);
  $('aviso').textContent = av;
  $('aviso').classList.toggle('on', !!av && !enDlg);"""
if s.count(VA) == 1:
    s = s.replace(VA, VN, 1)
else:
    err.append('pasoObjetivo: %d veces' % s.count(VA))

# ------------------------------------------------------------- 6) el siseo de la arena
VA = "  AMB.noche.gain.value = Math.min(1, Math.hypot(pvx, pvz) / VEL) * .05;"
VN = ("  /* la arena bajo los pies; en la tabla es un canto raspando y suena MUCHO mas */\n"
      "  AMB.noche.gain.value = Math.min(1, Math.hypot(pvx, pvz) / VEL) * (TABLA.modo ? .16 : .05);")
if s.count(VA) == 1:
    s = s.replace(VA, VN, 1)
else:
    err.append('ambTick: %d veces' % s.count(VA))

# ------------------------------------------------------------- 7) ganchos de prueba
VA = "  copas(){ return COPAS.est(); },"
if VA not in s:
    m = re.search(r"\n(\s*)mira\(y, p\)", s)
    if m:
        ind = m.group(1)
        s = s[:m.start() + 1] + ind + "tabla(){ return TABLA.est(); },\n" + \
            ind + "tablaIr(k){ const P = TABLA.PUE[k]; if (!P) return null; px = P.x; pz = P.z;\n" + \
            ind + "  ojoY = H(px, pz); aireY = 0; enAire = false; return TABLA.est(); },\n" + \
            s[m.start() + 1:]
    else:
        err.append('ganchos: no encuentro __S')

if err:
    print('\n'.join('  !! ' + e for e in err)); sys.exit(1)
if s == o:
    print('  sin cambios'); sys.exit(1)
p.write_text(s, encoding='utf-8')
print('  dunas: tabla de arena puesta (%+d bytes)' % (len(s) - len(o)))
