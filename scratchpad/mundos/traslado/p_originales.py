#!/usr/bin/env python3
"""EL TRASLADO PROPIO DE LOS CUATRO MUNDOS ORIGINALES (marte, luna, exo, hielo).

Estos cuatro son mas viejos que los ocho nuevos y su jugador es MAS SIMPLE: no
tienen salto —ni `enAire`, ni `aireY`, ni `ojoY`, ni boton de SALTO—, la camara va
pegada a `H(px,pz) + OJO` y se ve. Asi que no sirve el armazon de los otros ocho,
que se apoya justo en esas variables.

El armazon de aca es el minimo que hace falta y usa una sola variable nueva:
`altExtra`, la altura de mas del ojo, que la camara suma. Con eso alcanza para las
cuatro mecanicas —un rover, un trineo, un salto en cadena y una espora que
eleva—, porque las cuatro son "donde estas" y "a que altura", nada mas.

  · MARTE, EL ROVER. Un planeta de 900 m, vacio a proposito, y seis paradas de
    guion separadas por doscientos metros de piedra. Correr son 11,5 m/s; el rover
    va a 24, se maneja como se maneja un vehiculo de seis ruedas (gira con la
    velocidad, no pivota) y no puede con las cuestas fuertes: es distancia a
    cambio de libertad, que es exactamente el trato de un vehiculo.

  · HIELO, EL TRINEO. Este mundo tiene un lago CONGELADO caminable y lomas
    nevadas alrededor. Un trineo sobre hielo casi no tiene roce: la pendiente
    manda igual que la tabla de DUNAS, pero encima el llano no te frena, asi que
    lo que en la duna era una bajada corta aca es un cruce de punta a punta.
"""
import pathlib, re, sys

RAIZ = pathlib.Path('/home/user/mundos')

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

ARMAZON = """/* ================= {TITULO} =================
{RAZON}
   ========================================================================== */
const {MOD} = (() => {{
  const A = {{ modo: null, vel: 0, hd: 0, act: null, PUE: [], nPaso: 0, tSim: 0 }};
  const TT = {TT};
  const tx = k => ((TT[LANG] || TT.en)[k] || '');
{CUERPO}
  A.est = () => ({{ modo: A.modo, vel: +A.vel.toFixed(2), porque: A.porque,
    nPaso: A.nPaso, tSim: +A.tSim.toFixed(2), alto: +altExtra.toFixed(2),
    hd: +A.hd.toFixed(2),
    pue: A.PUE.map(P => ({{ x: Math.round(P.x), z: Math.round(P.z), lib: P.lib }})) }});
  return A;
}})();
"""


def aplica(rel, mod, tipo, titulo, razon, tt, cuerpo, css_col):
    p = RAIZ / 'assets' / rel
    s = p.read_text(encoding='utf-8')
    o = s
    err = []

    # 1) altExtra: la altura de mas del ojo. Es la unica linea de la camara que se toca.
    if 'altExtra' not in s:
        A = "const OJO = 1.7, VEL = "
        i = s.find(A)
        if i < 0:
            err.append('no encuentro la linea de OJO')
        else:
            j = s.find('\n', i)
            s = (s[:j + 1] +
                 "/* ALTURA DE MAS DEL OJO. La pone el traslado del mundo: sentado en un rover\n"
                 "   el ojo va a la altura del asiento, y volando va donde este el vuelo. En cero\n"
                 "   —o sea a pie— la camara queda exactamente como estaba. */\n"
                 "let altExtra = 0;\n" + s[j + 1:])
        A2 = "cam.position.set(ex, H(px, pz) + OJO + Math.abs(Math.sin(bobF)) * .06 * v, ez);"
        B2 = "cam.position.set(ex, H(px, pz) + OJO + altExtra + Math.abs(Math.sin(bobF)) * .06 * v, ez);"
        if s.count(A2) == 1:
            s = s.replace(A2, B2, 1)
        else:
            err.append('la camara aparece %d veces' % s.count(A2))

    # 2) el modulo
    anc = "/* -------- objetivo: marcador 3D + distancia + botón USAR"
    js = ARMAZON.format(TITULO=titulo, RAZON=razon, MOD=mod, TT=tt, CUERPO=cuerpo)
    if s.count(anc) == 1:
        s = s.replace(anc, js + '\n' + anc, 1)
    else:
        err.append('modulo: ancla %d veces' % s.count(anc))

    # 3) el aviso en pantalla
    if '#aviso' not in s:
        m = re.search(r"\n  #pcHelp\{", s)
        if m:
            css = (CSS_AVISO.replace('FONDO', css_col[0]).replace('BORDE', css_col[1])
                   .replace('TINTA', css_col[2]))
            s = s[:m.start() + 1] + css + s[m.start() + 1:]
        else:
            err.append('css: no encuentro #pcHelp')
        a2 = '  <div id="pcHelp"></div>'
        if s.count(a2) == 1:
            s = s.replace(a2, '  <div id="aviso"></div>\n' + a2, 1)
        else:
            err.append('div del aviso: ancla %d veces' % s.count(a2))

    # 4) accionUsable / usarAccion
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

    # 5) fisica cede el paso
    VA = "function fisica(dt){\n  yaw -= keyL.x * 2.2 * dt;"
    VN = ("function fisica(dt){\n"
          "  /* dentro del traslado no se camina: tiene su propio paso */\n"
          "  if (%s.modo){ %s.paso(dt); return; }\n"
          "  yaw -= keyL.x * 2.2 * dt;" % (mod, mod))
    if s.count(VA) == 1:
        s = s.replace(VA, VN, 1)
    else:
        err.append('fisica: %d veces' % s.count(VA))

    # 6) el aviso y el corte del capitulo automatico
    VA = """  if (!C.usar && cerca && !enDlg && MISION.lista(cap)){
    llegaObjetivo();
    return;
  }
  const acc = accionUsable();
  $('bUsar').classList.toggle('on', !!acc && !enDlg);"""
    VN = """  /* el capitulo automatico NO se dispara dentro del traslado: el dialogo congela
     la fisica y te dejaria clavado a media mecanica. Se dispara al salirte. */
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

    # 7) ganchos de prueba
    VA = "  mira(y, p){ yaw = y; if (p != null) pitch = p; },"
    VN = ("  /* la palanca a mano y el sitio del traslado, para probarlo sin un dedo */\n"
          "  palanca(x, y){ movV.x = x; movV.y = y; },\n"
          "  %(t)s(){ return %(M)s.est(); },\n"
          "  %(t)sIr(k){ const P = %(M)s.PUE[k]; if (!P) return null;\n"
          "    px = P.gx != null ? P.gx : P.x; pz = P.gz != null ? P.gz : P.z;\n"
          "    return %(M)s.est(); },\n" % {'M': mod, 't': tipo}) + VA
    if s.count(VA) == 1:
        s = s.replace(VA, VN, 1)
    else:
        err.append('ganchos __S: %d veces' % s.count(VA))

    if err:
        print('\n'.join('  !! %s: %s' % (rel, e) for e in err)); return False
    if s == o:
        print('  %s: sin cambios' % rel); return False
    p.write_text(s, encoding='utf-8')
    print('  %s: %s puesto (%+d bytes)' % (rel, mod, len(s) - len(o)))
    return True


# ======================================================================= MARTE
TT_M = """{
    es: { toma: 'ROVER · ◉ USAR para subir',
          va:   'PALANCA acelera y dirige · atras frena',
          baja: '◉ USAR para bajar' },
    en: { toma: 'ROVER · ◉ USE to board',
          va:   'STICK to drive and steer · pull back to brake',
          baja: '◉ USE to step out' },
    pt: { toma: 'ROVER · ◉ USAR para subir',
          va:   'ALAVANCA acelera e guia · atras freia',
          baja: '◉ USAR para descer' }
  }"""

CUERPO_M = r"""
  const RTOMA = 8;
  const V_MAX = 24;         /* mas del doble que correr */
  const ACEL = 5.5, FREN = 11, ROCE = 1.4;
  const GIRO = 1.5;         /* seis ruedas no pivotan */
  const PEND_R = .55;       /* menos que a pie: la cuesta fuerte es de a pie */
  const ALTO_A = 1.15;      /* el asiento */
  const E = 1.4;

  /* --------------------- donde estan los rovers --------------------------- */
  /* DOS, en las dos paradas de guion mas separadas del resto. El rover no es un
     atajo del guion: es lo que hace que los doscientos metros de piedra entre
     parada y parada dejen de ser una caminata. */
  {
    const ks = Object.keys(POI);
    for (const k of [ks[1], ks[3]]){
      const p = POI[k];
      if (!p) continue;
      const a = k.length * 1.1;
      A.PUE.push({ x: p.x + Math.sin(a) * 16, z: p.z + Math.cos(a) * 16,
        hd: a + Math.PI, lib: true });
    }
  }

  /* ------------------------------- el rover ------------------------------- */
  const mCha = new T.MeshLambertMaterial({ color: 0xcfc3ae });
  const mRue = new T.MeshLambertMaterial({ color: 0x2b2b2f });
  const mVid = new T.MeshLambertMaterial({ color: 0x8fd0e0 });
  function armaRover(){
    const g = new T.Group();
    const ch = new T.Mesh(new T.BoxGeometry(1.9, .5, 3.1), mCha);
    ch.position.y = .78; g.add(ch);
    const ca = new T.Mesh(new T.BoxGeometry(1.5, .62, 1.2), mCha);
    ca.position.set(0, 1.32, -.5); g.add(ca);
    const vi = new T.Mesh(new T.BoxGeometry(1.3, .42, .06), mVid);
    vi.position.set(0, 1.36, -1.09); g.add(vi);
    /* el panel solar atras: es lo que lo hace un rover y no una camioneta */
    const pa = new T.Mesh(new T.BoxGeometry(1.8, .06, 1.3), mVid);
    pa.position.set(0, 1.16, 1.05); pa.rotation.x = -.14; g.add(pa);
    g.ruedas = [];
    for (let i = 0; i < 6; i++){
      const rx = (i % 2 ? .98 : -.98), rz = -1.1 + Math.floor(i / 2) * 1.1;
      const r = new T.Mesh(new T.CylinderGeometry(.46, .46, .3, 8), mRue);
      r.rotation.z = Math.PI / 2;
      r.position.set(rx, .46, rz);
      g.add(r); g.ruedas.push(r);
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  for (const P of A.PUE){
    P.g = armaRover();
    P.g.position.set(P.x, H(P.x, P.z), P.z);
    P.g.rotation.y = P.hd;
    scene.add(P.g);
    ARB.push([P.x, P.z, 1.6]);
    P.arb = ARB[ARB.length - 1];
  }

  /* ---------------------------- lo que se hace ---------------------------- */
  let mio = null;
  A.accion = () => {
    if (A.modo) return A.vel < 5 ? { baja: true } : null;
    for (const P of A.PUE)
      if (P.lib && Math.hypot(px - P.x, pz - P.z) < RTOMA) return { P };
    return null;
  };
  A.usar = c => {
    if (c.baja){ A.suelta(); return; }
    const P = c.P;
    P.lib = false; A.act = P; mio = P.g;
    if (P.arb) P.arb[2] = 0;
    A.modo = 'rover'; A.vel = 0; A.hd = P.hd;
    yaw = P.hd;
    px = P.x; pz = P.z;
    altExtra = ALTO_A;
  };
  A.suelta = () => {
    if (!A.modo) return;
    const P = A.act;
    A.modo = null; A.vel = 0; altExtra = 0;
    if (P){
      P.x = px + Math.cos(A.hd) * 2.2; P.z = pz - Math.sin(A.hd) * 2.2;
      P.hd = A.hd; P.lib = true;
      P.g.position.set(P.x, H(P.x, P.z), P.z);
      P.g.rotation.set(0, A.hd, 0);
      if (P.arb){ P.arb[0] = P.x; P.arb[1] = P.z; P.arb[2] = 1.6; }
    }
    mio = null; pvx = 0; pvz = 0;
  };

  A.paso = dt => {
    A.nPaso++; A.tSim += dt;
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    /* seis ruedas no pivotan: cuanto mas rapido, menos gira */
    A.hd -= mx * GIRO * dt * (1 - .5 * cl(A.vel / V_MAX, 0, 1));
    yaw = A.hd;
    const obj = my < -.1 ? V_MAX * (-my) : 0;
    A.vel += (obj > A.vel ? ACEL : -(my > .2 ? FREN : ROCE)) * dt;
    A.vel = cl(A.vel, 0, V_MAX);
    const ux = -Math.sin(A.hd), uz = -Math.cos(A.hd);
    /* LA CUESTA FUERTE ES DE A PIE. El rover trepa MENOS que un caminante (0,55
       contra 0,80): es distancia a cambio de libertad, que es el trato de
       cualquier vehiculo, y de paso los rincones empinados siguen siendo un
       lugar al que hay que ir caminando. */
    let nx = cl(px + ux * A.vel * dt, -MITAD + 6, MITAD - 6);
    let nz = cl(pz + uz * A.vel * dt, -MITAD + 6, MITAD - 6);
    {
      const h0 = H(px, pz), h1 = H(nx, nz);
      const dl = Math.hypot(nx - px, nz - pz);
      if (dl > 1e-5 && (h1 - h0) / dl > PEND_R){
        const gx = H(px + E, pz) - H(px - E, pz), gz = H(px, pz + E) - H(px, pz - E);
        const gl = Math.hypot(gx, gz) || 1;
        const vx = gx / gl, vz = gz / gl;
        const dvx = nx - px, dvz = nz - pz;
        const pr = dvx * vx + dvz * vz;
        nx = px + (dvx - vx * pr) * .88; nz = pz + (dvz - vz * pr) * .88;
        A.vel *= .93;
      }
    }
    for (const o of ARB){
      const bx = nx - o[0], bz = nz - o[1], d = Math.hypot(bx, bz), rq = o[2] + 1;
      if (o[2] > 0 && d < rq && d > 1e-4){
        nx = o[0] + bx / d * rq; nz = o[1] + bz / d * rq; A.vel *= .5;
      }
    }
    stats.dist += Math.hypot(nx - px, nz - pz);
    px = nx; pz = nz;
    pvx = ux * A.vel; pvz = uz * A.vel;
    bobF += dt * (1.5 + A.vel * .12);
    if (mio){
      /* el rover se inclina con el terreno: se lee la altura en las cuatro
         esquinas, que es mas barato que una fisica de suspension y se ve igual */
      const hf = H(px + ux * 1.5, pz + uz * 1.5), hb = H(px - ux * 1.5, pz - uz * 1.5);
      const rx2 = Math.cos(A.hd), rz2 = -Math.sin(A.hd);
      const hi = H(px - rx2, pz - rz2), hd2 = H(px + rx2, pz + rz2);
      mio.position.set(px, (H(px, pz) + hf + hb) / 3, pz);
      mio.rotation.set(Math.atan2(hf - hb, 3) * -1, A.hd, Math.atan2(hd2 - hi, 2));
      for (const r of mio.ruedas) r.rotation.x -= A.vel * dt / .46;
    }
    stats.t += dt;
  };
  A.aviso = acc => {
    if (A.modo) return A.vel < 5 ? tx('baja') : tx('va');
    if (acc && acc.tipo === 'rover') return tx('toma');
    return '';
  };
"""

RAZON_M = """   EL ROVER DE MARTE. Un planeta de 900 m, vacio a proposito, y seis paradas de
   guion separadas por doscientos metros de piedra: entre una y otra el mundo no
   pide nada, solo tiempo. Correr son 11,5 m/s; el rover va a 24.

   Y NO ES UN BOTON DE CORRER. Gira con la velocidad —seis ruedas no pivotan— asi
   que hay que elegir la linea antes; y TREPA MENOS QUE UN CAMINANTE (0,55 de
   pendiente contra 0,80), o sea que las laderas empinadas siguen siendo un lugar
   al que se va a pie. Distancia a cambio de libertad, que es el trato de
   cualquier vehiculo.

   HAY DOS, uno en cada parada mas apartada, y quedan donde los dejaste. Se apoya
   solo en `altExtra` (el ojo pasa a la altura del asiento) porque este mundo no
   tiene salto ni altura de aire: es "donde estas" y nada mas."""

# ======================================================================= HIELO
TT_H = """{
    es: { toma: 'TRINEO · ◉ USAR para subirte',
          va:   'PALANCA para el canto · atras frena con los talones',
          baja: '◉ USAR para bajarte' },
    en: { toma: 'SLED · ◉ USE to ride',
          va:   'STICK to carve · pull back to drag your heels',
          baja: '◉ USE to step off' },
    pt: { toma: 'TRENO · ◉ USAR para subir',
          va:   'ALAVANCA para a borda · atras freia com os calcanhares',
          baja: '◉ USAR para descer' }
  }"""

CUERPO_H = r"""
  const RTOMA = 7;
  /* GRAV_T: cuanto empuja un metro de pendiente. Con 24 la punta quedaba en
     13,1 m/s y correr ya da 11,5: el trineo no se sentia distinto. Las lomas de
     HIELO son mas mansas que las dunas, asi que hace falta mas empuje y menos
     roce para que la mecanica exista. */
  const GRAV_T = 30;
  const GIRO = 1.7;
  const VMAX = 26;
  const V_BAJA = .9;
  const E = 1.5;
  let carve = 0, tSol = 0;

  const pendEn = (x, z, ux, uz) =>
    ((H(x + E, z) - H(x - E, z)) * ux + (H(x, z + E) - H(x, z - E)) * uz) / (2 * E);

  /* ------------------------- donde estan los trineos ---------------------- */
  /* ARRIBA DE LA BAJADA de cada tramo del guion, y la bajada se BUSCA: se barre
     un disco de 70 m alrededor del punto medio del tramo y se elige donde mas
     baja EN EL RUMBO del tramo, asi el trineo siempre te deja mas cerca. */
  {
    const ks = Object.keys(POI);
    for (let i = 1; i < ks.length; i++){
      const P1 = POI[ks[i - 1]], P2 = POI[ks[i]];
      const dx = P2.x - P1.x, dz = P2.z - P1.z, dl = Math.hypot(dx, dz) || 1;
      const ux = dx / dl, uz = dz / dl;
      const cx = (P1.x + P2.x) / 2, cz = (P1.z + P2.z) / 2;
      let bx = cx, bz = cz, mej = 0;
      for (let sx = -70; sx <= 70; sx += 7) for (let sz = -70; sz <= 70; sz += 7){
        if (sx * sx + sz * sz > 70 * 70) continue;
        const x = cx + sx, z = cz + sz;
        if (Math.abs(x) > MITAD - 60 || Math.abs(z) > MITAD - 60) continue;
        const q = pendEn(x, z, ux, uz);
        if (q < mej){ mej = q; bx = x; bz = z; }
      }
      if (mej < -.13) A.PUE.push({ x: bx, z: bz, hd: Math.atan2(-ux, -uz), lib: true });
    }
  }

  /* ------------------------------- el trineo ------------------------------ */
  const mMad = new T.MeshLambertMaterial({ color: 0x8a6a44 });
  const mPat = new T.MeshLambertMaterial({ color: 0xb9c6cf });
  const GEO = (() => {
    const g = [];
    const t = new T.BoxGeometry(.72, .12, 1.7); t.translate(0, .34, 0); g.push(t);
    for (const s of [-1, 1]){
      const pa = new T.BoxGeometry(.09, .1, 1.9); pa.translate(s * .32, .1, 0); g.push(pa);
      const cu = new T.BoxGeometry(.09, .34, .1); cu.translate(s * .32, .24, -.92); g.push(cu);
    }
    return fusiona(g);
  })();
  for (const P of A.PUE){
    P.y = H(P.x, P.z);
    const m = new T.Mesh(GEO, mMad);
    m.rotation.order = 'YXZ';
    m.position.set(P.x, P.y, P.z);
    m.rotation.set(0, P.hd, 0);
    m.castShadow = true;
    scene.add(m);
    P.malla = m;
    /* una vara con un trapo: un trineo tirado en la nieve es una raya blanca
       sobre blanco y no se encuentra desde la loma anterior */
    const g2 = [];
    const va = new T.CylinderGeometry(.05, .06, 2.6, 5); va.translate(P.x, P.y + 1.3, P.z);
    g2.push(va);
    const tr = new T.BoxGeometry(.55, .3, .03); tr.translate(P.x + .3, P.y + 2.3, P.z);
    g2.push(tr);
    const ba = new T.Mesh(fusiona(g2), mPat);
    ba.castShadow = true;
    scene.add(ba);
  }
  const tri = new T.Mesh(GEO, mMad);
  tri.rotation.order = 'YXZ';
  tri.visible = false;
  scene.add(tri);

  /* ---------------------------- lo que se hace ---------------------------- */
  A.accion = () => {
    if (A.modo) return A.vel < 4 ? { baja: true } : null;
    for (const P of A.PUE)
      if (P.lib && Math.hypot(px - P.x, pz - P.z) < RTOMA) return { P };
    return null;
  };
  A.usar = c => {
    if (c.baja){ A.suelta(); return; }
    const P = c.P;
    P.lib = false; P.malla.visible = false; A.act = P;
    A.modo = 'trineo'; A.vel = 5.5; A.hd = P.hd; carve = 0; tSol = -1;
    yaw = P.hd;
    px = P.x; pz = P.z;
    altExtra = -.85;              /* sentado, el ojo baja casi un metro */
    tri.visible = true;
  };
  A.suelta = () => {
    if (!A.modo) return;
    const P = A.act;
    A.modo = null; A.vel = 0; altExtra = 0;
    tri.visible = false;
    if (P){
      P.x = cl(px - Math.sin(A.hd) * 1.5, -MITAD + 8, MITAD - 8);
      P.z = cl(pz - Math.cos(A.hd) * 1.5, -MITAD + 8, MITAD - 8);
      P.y = H(P.x, P.z); P.hd = A.hd; P.lib = true;
      P.malla.position.set(P.x, P.y, P.z);
      P.malla.rotation.set(0, P.hd, 0);
      P.malla.visible = true;
    }
    pvx = 0; pvz = 0;
  };

  A.paso = dt => {
    A.nPaso++; A.tSim += dt;
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    const fv = cl(A.vel / 6, .18, 1);
    A.hd -= mx * GIRO * dt * fv;
    carve += (mx - carve) * Math.min(1, dt * 6);
    const ux = -Math.sin(A.hd), uz = -Math.cos(A.hd);
    const rx = Math.cos(A.hd), rz = -Math.sin(A.hd);
    const gx = (H(px + E, pz) - H(px - E, pz)) / (2 * E);
    const gz = (H(px, pz + E) - H(px, pz - E)) / (2 * E);
    const dh = gx * ux + gz * uz;
    const dl = gx * rx + gz * rz;
    /* la linea de maxima pendiente lleva al trineo, igual que a una tabla */
    A.hd += cl(dl, -.5, .5) * 1.5 * dt * fv;
    A.vel += -dh * GRAV_T * dt;
    /* EL HIELO CASI NO ROZA, y eso es todo el caracter de esta mecanica: en la
       arena el llano te frena en veinte metros, aca el llano no te frena. Lo que
       en DUNAS era una bajada corta aca es un cruce de punta a punta del lago. */
    const fren = Math.max(0, my) * 7 + Math.abs(carve) * .7 + .07;
    A.vel -= (fren + A.vel * A.vel * .0022) * dt;
    A.vel = cl(A.vel, 0, VMAX);
    let nx = cl(px + ux * A.vel * dt, -MITAD + 6, MITAD - 6);
    let nz = cl(pz + uz * A.vel * dt, -MITAD + 6, MITAD - 6);
    for (const o of ARB){
      const bx = nx - o[0], bz = nz - o[1], d = Math.hypot(bx, bz), rq = o[2] + .6;
      if (o[2] > 0 && d < rq && d > 1e-4){
        nx = o[0] + bx / d * rq; nz = o[1] + bz / d * rq; A.vel *= .4;
      }
    }
    stats.dist += Math.hypot(nx - px, nz - pz);
    px = nx; pz = nz;
    yaw = A.hd;
    pvx = ux * A.vel; pvz = uz * A.vel;
    bobF += dt * (2 + 2.5 * Math.min(1, A.vel / VMAX));
    /* cuesta arriba y sin envion, te bajas: quedarse clavado no es una decision */
    if (A.vel < V_BAJA && dh > -.02){ tSol += dt; if (tSol > .6){ A.suelta(); return; } }
    else tSol = Math.min(tSol, 0);
    tri.position.set(px + ux * .35, H(px, pz) + .06, pz + uz * .35);
    tri.rotation.set(Math.asin(cl(dh, -.9, .9)), A.hd, -carve * .3);
    stats.t += dt;
  };
  A.aviso = acc => {
    if (A.modo) return A.vel < 4 ? tx('baja') : tx('va');
    if (acc && acc.tipo === 'trineo') return tx('toma');
    return '';
  };
"""

RAZON_H = """   EL TRINEO DE HIELO. Este mundo tiene un lago CONGELADO caminable y lomas
   nevadas alrededor, y hasta ahora las lomas eran una molestia: se subian y se
   bajaban a pie.

   EL HIELO CASI NO ROZA, y eso es todo el caracter de la mecanica. La pendiente
   manda igual que en la tabla de DUNAS, pero en la arena el llano te frena en
   veinte metros y aca no te frena: lo que alla era una bajada corta, aca es un
   cruce de punta a punta del lago. Frenar es arrastrar los talones (palanca
   atras) y girar es apoyar el canto de los patines.

   Los trineos se ponen ARRIBA de la bajada de cada tramo del guion, y la bajada
   se BUSCA: se barre un disco de 70 m alrededor del punto medio del tramo y se
   elige donde mas baja EN EL RUMBO del tramo, asi el trineo siempre te deja mas
   cerca del objetivo, aunque mañana se toque el terreno. Cada uno lleva una vara
   con un trapo, porque un trineo tirado en la nieve es una raya blanca sobre
   blanco y no se encuentra desde la loma anterior."""

ok = True
ok &= aplica('mundos/marte.html', 'ROVER', 'rover',
             'EL ROVER: EL TRASLADO PROPIO DE MARTE', RAZON_M, TT_M, CUERPO_M,
             ('40,18,12', '240,150,110', '#ffe0d0'))
ok &= aplica('mundos/hielo.html', 'TRINEO', 'trineo',
             'EL TRINEO: EL TRASLADO PROPIO DE HIELO', RAZON_H, TT_H, CUERPO_H,
             ('10,22,34', '150,200,240', '#dcecff'))
sys.exit(0 if ok else 1)
