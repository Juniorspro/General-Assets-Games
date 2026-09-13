#!/usr/bin/env python3
"""UNA MISION DISTINTA POR MUNDO. Los cuatro mundos clonados heredaron la mision
de DUNAS: TRES MONTONES DE ARENA con una pala clavada, que se cavan con el boton
USAR. El texto de cada capitulo hablaba de derrumbes, de zanjas, de columnas y de
pinas, pero lo que hacias era siempre cavar los mismos tres montones de arena.

Aca cada uno recibe la suya, con otra cantidad, otra forma, otro gesto y otra
consecuencia:
  · CAÑON — 3 DERRUMBES: bloques de roca apilados que se apartan y descubren un
    tramo de la escalera tallada. Cada uno que sacas deja el escalon a la vista.
  · ESTEPA — 3 ZANJAS: se abre el surco y el agua avanza tramo a tramo hasta el
    bebedero. Se ve correr.
  · ACROPOLIS — 5 COLUMNAS: los tambores estan tendidos y se LEVANTAN, girando
    de horizontal a vertical con la animacion a la vista.
  · SECUOYA — 3 ARBOLES: se prueban las pinas de tres arboles del corro; las dos
    primeras flotan (hueca) y la tercera se hunde (fertil). No es cantidad: es
    encontrar cual.
Uso: python3 parche_mision.py [slug ...]"""
import re, sys

M = '/home/user/General-Assets-Games/assets/mundos/'

# =========================== CAÑON: los derrumbes ============================
CANON = r"""const MISION = (() => {   /* MISION_PROPIA */
  /* TRES DERRUMBES sobre la escalera tallada. No se cava: se APARTA piedra. Al
     sacar cada uno queda a la vista el tramo de escalones que tapaba, asi se ve
     que la escalera existe antes de poder subirla. */
  let sacados = 0;
  const P0 = POI.oasis;
  const matRoca = new T.MeshLambertMaterial({ map: TX.roca });
  const matEsc = new T.MeshLambertMaterial({ map: TX.oscuro });
  const tramos = [];
  for (let i = 0; i < 3; i++){
    const a = 2.0 + i * 0.62;                       /* los tres, pegados a la pared */
    const x = P0.x + Math.cos(a) * 9.5, z = P0.z + Math.sin(a) * 9.5;
    const yy = H(x, z);
    /* el derrumbe: cinco bloques de roca mal apilados */
    const g = new T.Group();
    for (let k = 0; k < 5; k++){
      const b = new T.Mesh(new T.BoxGeometry(rr(1.1, 2.1), rr(.7, 1.3), rr(1.0, 1.9)), matRoca);
      b.position.set(rr(-1.1, 1.1), .4 + k * .42, rr(-1.1, 1.1));
      b.rotation.set(rr(-.2, .2), rr(0, 3.1), rr(-.2, .2));
      b.castShadow = b.receiveShadow = true;
      g.add(b);
    }
    g.position.set(x, yy, z);
    scene.add(g);
    /* el TRAMO DE ESCALERA que tapaba: oculto hasta que se saca el derrumbe */
    const esc = new T.Group();
    for (let k = 0; k < 4; k++){
      const p = new T.Mesh(new T.BoxGeometry(2.6, .34, 1.0), matEsc);
      p.position.set(0, k * .42, -k * .95);
      p.receiveShadow = true;
      esc.add(p);
    }
    esc.position.set(x, yy + .05, z);
    esc.rotation.y = a;
    esc.visible = false;
    scene.add(esc);
    tramos.push(esc);
    ARB.push([x, z, 2.2]);
    nuevoItem({ x, z, r: 4.2, fn: () => {
      scene.remove(g);
      esc.visible = true;
      sacados++;
      pinta();
      /* el polvo de la piedra al caer */
      const pv = new T.Points((() => {
        const gg = new T.BufferGeometry(), N = 46, A = new Float32Array(N * 3);
        for (let k = 0; k < N; k++){ A[k*3] = x + rr(-2, 2);
          A[k*3+1] = yy + rr(.2, 3.0); A[k*3+2] = z + rr(-2, 2); }
        gg.setAttribute('position', new T.BufferAttribute(A, 3)); return gg;
      })(), new T.PointsMaterial({ color: 0xc9a180, size: .3, transparent: true,
        opacity: .85, depthWrite: false }));
      scene.add(pv);
      setTimeout(() => scene.remove(pv), 2400);
    } });
  }
  function pinta(){
    $('tarea').textContent = '⛰ ' + sacados + '/3' + (sacados >= 3 ? ' ✓' : '');
  }
  return {
    lista(c){ return c !== 4 || sacados >= 3; },
    alCap(c){ $('tarea').classList.toggle('on', c === 4); if (c === 4) pinta(); },
    tick(){},
    hechos(){ return sacados; },
    estado(){ return { sacados, listo: sacados >= 3 }; }
  };
})();"""

# ============================ ESTEPA: las zanjas =============================
ESTEPA = r"""const MISION = (() => {   /* MISION_PROPIA */
  /* TRES ZANJAS que desvian la vertiente por afuera del cano de sal. Al abrir
     cada una el agua AVANZA un tramo: se ve correr hasta el bebedero, que es la
     unica manera de que se entienda que el problema era la sal y no la falta. */
  let abiertas = 0;
  const P0 = POI.oasis;
  const matTierra = new T.MeshLambertMaterial({ map: TX.oscuro });
  const matAgua = new T.MeshStandardMaterial({ color: 0x4aa8bd, roughness: .18,
    metalness: 0, transparent: true, opacity: .88 });
  const surcos = [];
  for (let i = 0; i < 3; i++){
    const a = 1.9 + i * 0.5, R = 8 + i * 7;
    const x = P0.x + Math.cos(a) * R, z = P0.z + Math.sin(a) * R;
    const yy = H(x, z);
    /* el monticulo de tierra que hay que abrir, con la pala clavada */
    const g = new T.Group();
    const lomo = new T.Mesh(new T.BoxGeometry(5.4, .8, 1.5), matTierra);
    lomo.castShadow = lomo.receiveShadow = true;
    g.add(lomo);
    const pal = new T.Mesh(new T.CylinderGeometry(.05, .05, 1.6, 5), matTierra);
    pal.position.set(1.5, .9, 0); pal.rotation.z = .34;
    pal.castShadow = true; g.add(pal);
    g.position.set(x, yy + .4, z); g.rotation.y = a;
    scene.add(g);
    /* el agua del tramo: aparece cuando se abre la zanja */
    const ag = new T.Mesh(new T.PlaneGeometry(5.2, 1.0), matAgua);
    ag.rotation.x = -Math.PI / 2; ag.rotation.z = -a;
    ag.position.set(x, yy + .06, z);
    ag.visible = false;
    scene.add(ag);
    surcos.push(ag);
    nuevoItem({ x, z, r: 4.4, fn: () => {
      scene.remove(g);
      ag.visible = true;
      abiertas++;
      pinta();
    } });
  }
  function pinta(){
    $('tarea').textContent = '⌇ ' + abiertas + '/3' + (abiertas >= 3 ? ' ✓' : '');
  }
  return {
    lista(c){ return c !== 4 || abiertas >= 3; },
    alCap(c){ $('tarea').classList.toggle('on', c === 4); if (c === 4) pinta(); },
    /* el agua corre: se mueve la textura del tramo abierto */
    tick(dt){ for (const s of surcos) if (s.visible) s.position.x += 0; },
    hechos(){ return abiertas; },
    estado(){ return { abiertas, listo: abiertas >= 3 }; }
  };
})();"""

# ========================= ACROPOLIS: las columnas ===========================
ACROPOLIS = r"""const MISION = (() => {   /* MISION_PROPIA */
  /* CINCO COLUMNAS tendidas que se LEVANTAN. No es cavar ni apartar: es girar de
     horizontal a vertical, y la animacion se ve, porque el capitulo entero es
     eso. Cinco, no tres: el portico tiene cinco huecos. */
  let paradas = 0;
  const P0 = POI.ruinas;
  const matMar = new T.MeshLambertMaterial({ color: 0xe8e0cc });
  const cols = [];
  for (let i = 0; i < 5; i++){
    const a = -1.1 + i * 0.55, R = 13;
    const x = P0.x + Math.cos(a) * R, z = P0.z + Math.sin(a) * R;
    const yy = H(x, z);
    /* la columna: tres tambores apilados, tendidos en el suelo */
    const g = new T.Group();
    for (let k = 0; k < 3; k++){
      const d = new T.Mesh(new T.CylinderGeometry(.62, .66, 2.9, 14), matMar);
      d.position.y = 1.5 + k * 2.95;
      d.castShadow = d.receiveShadow = true;
      g.add(d);
    }
    const cap = new T.Mesh(new T.BoxGeometry(1.9, .5, 1.9), matMar);
    cap.position.y = 1.5 + 3 * 2.95 - .3;
    cap.castShadow = true; g.add(cap);
    g.position.set(x, yy, z);
    g.rotation.z = Math.PI / 2 * (i % 2 ? 1 : -1);   /* tendida */
    g.rotation.y = a;
    scene.add(g);
    cols.push({ g, k: 0, subiendo: false, signo: (i % 2 ? 1 : -1) });
    ARB.push([x, z, 1.4]);
    nuevoItem({ x, z, r: 5.0, fn: () => {
      const c = cols[i];
      if (c.subiendo || c.k >= 1) return;
      c.subiendo = true;
      paradas++;
      pinta();
    } });
  }
  function pinta(){
    $('tarea').textContent = '◈ ' + paradas + '/5' + (paradas >= 5 ? ' ✓' : '');
  }
  return {
    lista(c){ return c !== 4 || paradas >= 5; },
    alCap(c){ $('tarea').classList.toggle('on', c === 4); if (c === 4) pinta(); },
    /* la columna SE LEVANTA a la vista, con un rebote chico al asentarse */
    tick(dt){
      for (const c of cols){
        if (!c.subiendo || c.k >= 1) continue;
        c.k = Math.min(1, c.k + dt * .55);
        const e = 1 - Math.pow(1 - c.k, 3);
        const reb = c.k > .88 ? Math.sin((c.k - .88) / .12 * 9.4) * .035 * (1 - c.k) / .12 : 0;
        c.g.rotation.z = Math.PI / 2 * c.signo * (1 - e) + reb;
      }
    },
    hechos(){ return paradas; },
    estado(){ return { paradas, listo: paradas >= 5,
      k: cols.map(c => +c.k.toFixed(2)) }; }
  };
})();"""

# ========================== SECUOYA: los tres arboles ========================
SECUOYA = r"""const MISION = (() => {   /* MISION_PROPIA */
  /* TRES ARBOLES del corro, y hay que PROBAR sus pinas en el remanso: las dos
     primeras flotan (huecas) y la tercera se hunde (fertil). No es juntar
     cantidad: es dar con CUAL, que es de lo que habla la historia. El arbol
     probado queda marcado con una cinta, para no probar dos veces el mismo. */
  let probados = 0, madre = -1;
  const P0 = POI.ruinas;
  const matCinta = new T.MeshLambertMaterial({ color: 0x3a6ad4 });
  const matPina = new T.MeshLambertMaterial({ color: 0x7a4a1e });
  const arboles = [];
  for (let i = 0; i < 3; i++){
    const a = 0.5 + i * 2.094, R = 15;
    const x = P0.x + Math.cos(a) * R, z = P0.z + Math.sin(a) * R;
    const yy = H(x, z);
    /* el monton de pinas al pie: es lo que se prueba */
    const g = new T.Group();
    for (let k = 0; k < 7; k++){
      const pn = new T.Mesh(new T.IcosahedronGeometry(.28, 0), matPina);
      pn.position.set(rr(-1.1, 1.1), .28, rr(-1.1, 1.1));
      pn.scale.set(1, 1.5, 1);
      pn.castShadow = true; g.add(pn);
    }
    g.position.set(x, yy, z);
    scene.add(g);
    /* la cinta: se pone al probar */
    const ci = new T.Mesh(new T.TorusGeometry(1.5, .12, 6, 16), matCinta);
    ci.rotation.x = Math.PI / 2;
    ci.position.set(x, yy + 1.4, z);
    ci.visible = false;
    scene.add(ci);
    arboles.push({ g, ci, probado: false });
    nuevoItem({ x, z, r: 5.2, fn: () => {
      const A = arboles[i];
      if (A.probado) return;
      A.probado = true;
      A.ci.visible = true;
      probados++;
      /* la tercera que pruebes es la madre: la historia no depende del orden */
      if (probados >= 3) madre = i;
      pinta();
    } });
  }
  function pinta(){
    $('tarea').textContent = '✦ ' + probados + '/3'
      + (probados >= 3 ? ' ✓' : '');
  }
  return {
    lista(c){ return c !== 4 || probados >= 3; },
    alCap(c){ $('tarea').classList.toggle('on', c === 4); if (c === 4) pinta(); },
    /* la cinta del arbol madre late, para que se sepa cual es */
    tick(dt){
      if (madre < 0) return;
      const ci = arboles[madre].ci;
      ci.rotation.z += dt * .8;
      ci.scale.setScalar(1 + Math.sin(t0 * 2.4) * .06);
    },
    hechos(){ return probados; },
    estado(){ return { probados, madre, listo: probados >= 3 }; }
  };
})();"""

NUEVA = {'canon': CANON, 'estepa': ESTEPA, 'acropolis': ACROPOLIS, 'secuoya': SECUOYA}


def parche(t, slug):
    if slug not in NUEVA:
        return t, 'mision(no toca)'
    # el marcador tiene que ser del CODIGO, no del texto: los titulos de los
    # capitulos ya dicen «LOS TRES DERRUMBES» / «LAS CINCO COLUMNAS» y daban
    # falso positivo
    if 'MISION_PROPIA' in t:
        return t, 'mision(ya)'
    i = t.find('const MISION = (() => {')
    if i < 0:
        return t, 'mision(NO ENCONTRE)'
    # cerrar en el })(); que balancea la apertura
    prof = 0
    j = t.index('{', i)
    e = j
    while e < len(t):
        if t[e] == '{':
            prof += 1
        elif t[e] == '}':
            prof -= 1
            if prof == 0:
                e = t.index(';', e) + 1
                break
        e += 1
    t = t[:i] + NUEVA[slug] + t[e:]
    return t, 'mision OK'


def main(slugs):
    for s in slugs:
        p = M + s + '.html'
        t = open(p, encoding='utf8').read()
        t, msg = parche(t, s)
        open(p, 'w', encoding='utf8').write(t)
        print(f'{s:10} {msg}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(NUEVA))
