#!/usr/bin/env python3
"""RECOLECCION para los 8 mundos: piezas repartidas por el mapa que se juntan al
pasar cerca, con contador propio en el HUD y premio al completar. Cada mundo
junta OTRA cosa, con otra forma y otro color, y las piezas se siembran alrededor
de TODOS los lugares del mundo (tambien de los nuevos), asi la recoleccion es lo
que te saca del camino recto entre capitulos.
Uso: python3 parche_recol.py [slug ...]"""
import sys

M = '/home/user/General-Assets-Games/assets/mundos/'

# n, nombre es/en/pt, icono, color, emisivo, forma, escala
CFG = {
 'dunas':     (14, 'FULGURITAS', 'FULGURITES', 'FULGURITAS', '🜁', 0xe8d2a0, 0x6b4a1e, 'aguja', 1.0,
               'vidrio que hace el rayo al caer en la arena'),
 'jungla':    (16, 'ORQUÍDEAS', 'ORCHIDS', 'ORQUÍDEAS', '❁', 0xe86fc0, 0x5a1040, 'flor', 1.1,
               'orquídeas que solo abren una noche'),
 'volcan':    (14, 'LÁGRIMAS', 'TEARS', 'LÁGRIMAS', '◆', 0x2a2028, 0x8c2a08, 'gota', 1.0,
               'lágrimas de obsidiana de la última colada'),
 'pantano':   (15, 'LUCES', 'LIGHTS', 'LUZES', '✺', 0xbdf0d8, 0x1e6a58, 'esfera', .9,
               'fuegos fatuos atrapados en frascos'),
 'canon':     (14, 'PETROGLIFOS', 'PETROGLYPHS', 'PETRÓGLIFOS', '⌘', 0xd9a06a, 0x5a2a10, 'losa', 1.15,
               'lajas grabadas por los que vivieron abajo'),
 'estepa':    (16, 'CAMPANILLAS', 'BELLS', 'CAMPAINHAS', '🜛', 0xc9a63c, 0x4a3a08, 'campana', 1.0,
               'campanillas del ganado que se perdió'),
 'acropolis': (14, 'FRISOS', 'FRIEZES', 'FRISOS', '◈', 0xf0e8d4, 0x6a6250, 'losa', 1.1,
               'esquirlas del friso que se cayó al mar'),
 'secuoya':   (16, 'PIÑAS', 'CONES', 'PINHAS', '✦', 0x8a5a2a, 0x3a2008, 'pina', 1.0,
               'piñas del árbol madre, las únicas que germinan'),
}

CSS = """
  /* contador de RECOLECCION: va debajo del objetivo, con su propio icono */
  #recol{position:absolute;left:12px;top:calc(10px + 4.6em);pointer-events:none;
    display:none;font:800 12.5px/1 ui-sans-serif,system-ui,sans-serif;
    padding:6px 9px;border-radius:9px;letter-spacing:.05em;
    background:rgba(0,0,0,.42);border:1px solid @BD@;color:@CT@;
    backdrop-filter:blur(4px)}
  #recol.on{display:block}
  #recol.lleno{border-color:@CT@;box-shadow:0 0 14px -2px @CT@}"""

HTML = '  <div id="recol"></div>\n'

JS = """
/* =========================== RECOLECCION ==================================
   @DESC@. Se juntan pasando cerca (radio generoso, sin boton: la recoleccion
   tiene que ser un premio por curiosear, no una tarea). Se siembran alrededor
   de TODOS los lugares del mundo con un azar DETERMINISTA, asi todos los que
   juegan encuentran las mismas y el mapa se puede aprender. */
const RECOL = (() => {
  const TOT = @N@, ICO = '@ICO@';
  const NOM = { es: '@NES@', en: '@NEN@', pt: '@NPT@' };
  let junt = 0;
  const piezas = [];
  const mat = new T.MeshLambertMaterial({ color: @COL@, emissive: @EMI@,
    emissiveIntensity: .75 });
  const geo = (() => {
    const F = '@FORMA@', s = @ESC@;
    if (F === 'aguja')  return new T.ConeGeometry(.16 * s, .95 * s, 5);
    if (F === 'flor')   return new T.TorusGeometry(.26 * s, .13 * s, 5, 9);
    if (F === 'gota')   return new T.OctahedronGeometry(.32 * s, 0);
    if (F === 'esfera') return new T.SphereGeometry(.27 * s, 10, 7);
    if (F === 'losa')   return new T.BoxGeometry(.52 * s, .09 * s, .38 * s);
    if (F === 'campana')return new T.CylinderGeometry(.09 * s, .27 * s, .42 * s, 8, 1, true);
    return new T.IcosahedronGeometry(.28 * s, 0);          /* pina */
  })();
  /* el halo: un plano que siempre mira a la camara. Sin esto una pieza chica en
     un paisaje grande es invisible, y buscar a ciegas no es divertido. */
  const halo = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    rg.addColorStop(0, 'rgba(255,255,255,.95)');
    rg.addColorStop(.35, 'rgba(255,255,255,.35)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    return new T.SpriteMaterial({ map: new T.CanvasTexture(c), color: @COL@,
      transparent: true, depthWrite: false, opacity: .55 });
  })();
  /* azar determinista: mismo mundo, mismas piezas, siempre */
  let sem = @SEM@;
  const az = () => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff; };
  const LUG = Object.keys(POI);
  for (let i = 0; i < TOT; i++){
    const L = POI[LUG[i % LUG.length]];
    const a = az() * 6.2832, d = (L.pr || 24) * (.55 + az() * 1.5);
    const x = cl(L.x + Math.cos(a) * d, -MITAD + 14, MITAD - 14);
    const z = cl(L.z + Math.sin(a) * d, -MITAD + 14, MITAD - 14);
    const y = H(x, z);
    const fig = new T.Group();
    const m = new T.Mesh(geo, mat);
    m.position.y = .55; m.castShadow = true;
    fig.add(m);
    const sp = new T.Sprite(halo);
    sp.scale.setScalar(1.7); sp.position.y = .58;
    fig.add(sp);
    fig.position.set(x, y, z);
    scene.add(fig);
    piezas.push({ fig, m, x, z, tomada: false, fase: az() * 6.2832 });
  }
  function pinta(){
    const el = $('recol');
    el.textContent = ICO + ' ' + (NOM[LANG] || NOM.es) + '  ' + junt + '/' + TOT
      + (junt >= TOT ? '  ✓' : '');
    el.classList.toggle('lleno', junt >= TOT);
  }
  return {
    total: TOT, get juntadas(){ return junt; },
    pinta,
    tick(dt){
      for (const p of piezas){
        if (p.tomada) continue;
        p.fig.rotation.y += dt * 1.5;
        p.fig.children[0].position.y = .55 + Math.sin(t0 * 2 + p.fase) * .11;
        if (Math.hypot(px - p.x, pz - p.z) < 3.2){
          p.tomada = true;
          scene.remove(p.fig);
          junt++; pinta();
          blipRecol(junt >= TOT);
          if (junt >= TOT) setTimeout(() => { if (!enDlg)
            dialogo((NOM[LANG] || NOM.es) + '  ' + ICO,
              Tx('recolFin'), null, null, null); }, 700);
        }
      }
    }
  };
})();
/* el tilin de juntar: una nota corta, mas alta al completar */
function blipRecol(fin){
  if (!AMB.ctx || !AMB.on) return;
  try {
    const o = AMB.ctx.createOscillator(), g = AMB.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(fin ? 880 : 1320, AMB.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(fin ? 1760 : 1980, AMB.ctx.currentTime + .12);
    g.gain.setValueAtTime(.0001, AMB.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.09, AMB.ctx.currentTime + .015);
    g.gain.exponentialRampToValueAtTime(.0001, AMB.ctx.currentTime + (fin ? .5 : .22));
    o.connect(g); g.connect(AMB.master);
    o.start(); o.stop(AMB.ctx.currentTime + (fin ? .55 : .26));
  } catch(e){}
}
"""


def parche(t, slug):
    if 'const RECOL' in t:
        return t, 'recol(ya)'
    n, nes, nen, npt, ico, col, emi, forma, esc, desc = CFG[slug]
    msgs = []
    # el CSS toma el color del titulo del dialogo del mundo (ya esta por mundo)
    import re
    mct = re.search(r"#dlgT\{[^}]*color:(#[0-9a-fA-F]{6})", t)
    mbd = re.search(r"#dlgGlobo\{[^}]*border:1\.6px solid (rgba\([^)]*\))", t)
    ct = mct.group(1) if mct else '#f0e0cc'
    bd = mbd.group(1) if mbd else 'rgba(255,255,255,.35)'
    ancla = "  /* contador de RECOLECCION"
    if ancla not in t:
        a2 = "  /* la TAREA del capítulo (contador, sin idioma: iconos y números) */"
        if a2 in t:
            t = t.replace(a2, CSS.replace('@BD@', bd).replace('@CT@', ct).strip('\n')
                          + '\n' + a2, 1)
            msgs.append('css')
        else:
            msgs.append('css NO')
    a3 = '  <div id="medidor">'
    if a3 in t:
        t = t.replace(a3, HTML + a3, 1); msgs.append('html')
    else:
        msgs.append('html NO')
    # el JS va DESPUES de MISION (usa POI, H, dialogo, AMB, Tx)
    a4 = 'window.__MISION = MISION;'
    js = (JS.replace('@N@', str(n)).replace('@NES@', nes).replace('@NEN@', nen)
            .replace('@NPT@', npt).replace('@ICO@', ico)
            .replace('@COL@', '0x%06x' % col).replace('@EMI@', '0x%06x' % emi)
            .replace('@FORMA@', forma).replace('@ESC@', str(esc))
            .replace('@DESC@', desc)
            .replace('@SEM@', str(sum(ord(c) * (i + 7) for i, c in enumerate(slug)))))
    if a4 in t:
        t = t.replace(a4, a4 + js + '\nwindow.__RECOL = RECOL;', 1); msgs.append('js')
    else:
        msgs.append('js NO')
    # el tick, junto a los otros del bucle de juego
    if 'MISION.tick(dt);' in t and 'RECOL.tick(dt);' not in t:
        t = t.replace('MISION.tick(dt);', 'MISION.tick(dt);\n    RECOL.tick(dt);', 1)
        msgs.append('tick')
    # el contador se prende al entrar en juego
    if "$('hud').classList.add('on')" in t and "RECOL.pinta()" not in t:
        t = t.replace("$('hud').classList.add('on')",
                      "$('hud').classList.add('on');\n  $('recol').classList.add('on'); RECOL.pinta()", 1)
        msgs.append('hud')
    # el texto del premio: uno por idioma, en el mismo orden que las tablas L
    # (el motor las trae siempre es, en, pt).
    fin = [
      "Están todas. Caben en las dos manos y pesan\\nmenos de lo que parecía.\\n\\n"
      "Guardadas así, juntas, por fin se entiende\\nqué eran: no restos. Un inventario.",
      "That’s all of them. They fit in two hands and\\nweigh less than they looked.\\n\\n"
      "Kept together like this you finally see what\\nthey were: not remains. An inventory.",
      "Estão todas. Cabem nas duas mãos e pesam\\nmenos do que parecia.\\n\\n"
      "Guardadas assim, juntas, finalmente se\\nentende o que eram: não restos. Um inventário.",
    ]
    partes = t.split("ui: { sub: ")
    if len(partes) == 4 and 'recolFin:' not in t:
        t = partes[0] + ''.join(
            "ui: { recolFin: '%s',\n  sub: " % fin[i] + partes[i + 1] for i in range(3))
        msgs.append('txt')
    else:
        msgs.append('txt NO')
    return t, 'recol[' + '+'.join(msgs) + ']'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, m = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {m}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(CFG))
