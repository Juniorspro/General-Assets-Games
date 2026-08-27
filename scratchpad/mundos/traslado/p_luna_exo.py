#!/usr/bin/env python3
"""LUNA: EL BOTE LUNAR. EXO: LAS ESPORAS QUE ELEVAN.

Los dos que faltaban de los cuatro originales, y los dos son verticales: se
apoyan en `altExtra` (la altura de mas del ojo) como altura sobre el terreno, que
es lo unico que necesitan porque estos mundos no tienen salto propio.
"""
import sys
sys.path.insert(0, '/home/user/mundos/scratchpad/mundos/traslado')
from p_originales import aplica

# ======================================================================== LUNA
TT_L = """{
    es: { toma: 'MOCHILA DE SALTO · ◉ USAR para ponertela',
          va:   'PALANCA para el rumbo · cada rebote va mas lejos · ◉ USAR en el suelo para sacartela',
          baja: '◉ USAR para sacartela' },
    en: { toma: 'JUMP PACK · ◉ USE to strap in',
          va:   'STICK to steer · each bound goes further · ◉ USE on the ground to unstrap',
          baja: '◉ USE to unstrap' },
    pt: { toma: 'MOCHILA DE SALTO · ◉ USAR para vestir',
          va:   'ALAVANCA para o rumo · cada salto vai mais longe · ◉ USAR no chao para tirar',
          baja: '◉ USAR para tirar' }
  }"""

CUERPO_L = r"""
  const RTOMA = 8;
  const G_LUNA = 3.1;      /* la gravedad de la Luna, redonda: 1/6 de la de acá */
  const IMP = 7.6;         /* el envion de cada rebote */
  const V_MAX = 17;
  const ACEL = 4.2;
  const GIRO = 1.4;
  let alt = 0, vy = 0, rebotes = 0;

  /* --------------------- donde estan las mochilas -------------------------- */
  /* DOS, en el modulo y en el radiotelescopio: los dos sitios del guion donde hay
     equipo de la mision, o sea los dos donde tendria sentido que hubiera una. */
  for (const k of ['modulo', 'radiotelescopio']){
    const p = POI[k];
    if (!p) continue;
    const a = k.length * .9;
    A.PUE.push({ x: p.x + Math.sin(a) * 13, z: p.z + Math.cos(a) * 13,
      hd: a + Math.PI, lib: true });
  }

  /* ------------------------------ la mochila ------------------------------- */
  const mBla = new T.MeshLambertMaterial({ color: 0xe8e6e0 });
  const mTob = new T.MeshLambertMaterial({ color: 0xb8bcc4 });
  const mFue = new T.MeshLambertMaterial({ color: 0x9fd8ff });
  function armaMochila(){
    const g = new T.Group();
    const cu = new T.Mesh(new T.BoxGeometry(.62, .78, .34), mBla);
    cu.position.y = .55; g.add(cu);
    for (const s of [-1, 1]){
      const to = new T.Mesh(new T.CylinderGeometry(.09, .12, .5, 6), mTob);
      to.position.set(s * .22, .18, .05); g.add(to);
    }
    const ar = new T.Mesh(new T.TorusGeometry(.2, .04, 4, 8), mTob);
    ar.rotation.x = Math.PI / 2; ar.position.y = 1.02; g.add(ar);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  /* la llama de los toberas, que solo se ve mientras rebotas */
  const llama = new T.Mesh(new T.ConeGeometry(.28, 1.1, 6), mFue);
  llama.rotation.x = Math.PI;
  llama.visible = false;
  scene.add(llama);
  for (const P of A.PUE){
    P.g = armaMochila();
    P.g.position.set(P.x, H(P.x, P.z), P.z);
    P.g.rotation.y = P.hd;
    scene.add(P.g);
  }

  /* ---------------------------- lo que se hace ---------------------------- */
  A.accion = () => {
    if (A.modo) return alt < .6 ? { baja: true } : null;
    for (const P of A.PUE)
      if (P.lib && Math.hypot(px - P.x, pz - P.z) < RTOMA) return { P };
    return null;
  };
  A.usar = c => {
    if (c.baja){ A.suelta(); return; }
    const P = c.P;
    P.lib = false; P.g.visible = false; A.act = P;
    A.modo = 'bote'; A.vel = 3; A.hd = yaw;
    alt = 0; vy = IMP; rebotes = 0;
    altExtra = 0;
    llama.visible = true;
  };
  A.suelta = () => {
    if (!A.modo) return;
    const P = A.act;
    A.modo = null; A.vel = 0; altExtra = 0; alt = 0; vy = 0;
    llama.visible = false;
    if (P){
      P.x = px + Math.cos(A.hd) * 1.3; P.z = pz - Math.sin(A.hd) * 1.3;
      P.lib = true;
      P.g.position.set(P.x, H(P.x, P.z), P.z);
      P.g.rotation.y = A.hd;
      P.g.visible = true;
    }
    pvx = 0; pvz = 0;
  };

  A.paso = dt => {
    A.nPaso++; A.tSim += dt;
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    /* EN EL AIRE SE GIRA IGUAL, y no es un descuido: acá no hay aire contra el
       que girar, pero tampoco hay aire que te frene, y un traje con toberas gira
       porque para eso están. Lo que NO se puede es frenar en seco. */
    A.hd -= mx * GIRO * dt;
    yaw = A.hd;
    const obj = my < -.1 ? V_MAX * (-my) : (my > .2 ? 0 : A.vel);
    A.vel += cl(obj - A.vel, -ACEL * dt * (alt > .5 ? .35 : 1), ACEL * dt);
    A.vel = cl(A.vel, 0, V_MAX);
    const ux = -Math.sin(A.hd), uz = -Math.cos(A.hd);
    let nx = cl(px + ux * A.vel * dt, -MITAD + 6, MITAD - 6);
    let nz = cl(pz + uz * A.vel * dt, -MITAD + 6, MITAD - 6);
    /* volando se pasa POR ENCIMA de las piedras: es media razón de ser del bote */
    if (alt < 1.4){
      for (const o of ARB){
        const bx = nx - o[0], bz = nz - o[1], d = Math.hypot(bx, bz), rq = o[2] + .6;
        if (o[2] > 0 && d < rq && d > 1e-4){
          nx = o[0] + bx / d * rq; nz = o[1] + bz / d * rq; A.vel *= .6;
        }
      }
    }
    stats.dist += Math.hypot(nx - px, nz - pz);
    /* la vertical, con la gravedad de la Luna: a 3,1 m/s² cada rebote dura casi
       cinco segundos y cruza sesenta metros. Es la misma cuenta de siempre, pero
       con el número del sitio donde estás, y por eso se siente el sitio. */
    const h0 = H(px, pz);
    px = nx; pz = nz;
    vy -= G_LUNA * dt;
    alt += vy * dt;
    /* el suelo se mueve debajo mientras volás: la altura es sobre EL TERRENO DE
       ACÁ, no sobre el de donde saltaste, así que un cráter te deja más alto y
       una loma te corta el vuelo. Sin esto, volar sobre relieve no se sentía. */
    alt += h0 - H(px, pz);
    if (alt <= 0){
      alt = 0;
      /* REBOTE. No hay que apretar nada: la mochila devuelve el envión sola, y
         cada rebote es una decisión de rumbo, no de tiempo. Encadenar es lo que
         hace la mecánica: la velocidad se conserva porque no hay aire. */
      vy = IMP;
      rebotes++;
    }
    altExtra = alt;
    pvx = ux * A.vel; pvz = uz * A.vel;
    bobF += dt * (1.2 + A.vel * .1);
    llama.position.set(px, H(px, pz) + alt + .35, pz);
    llama.scale.y = cl(.3 + Math.max(0, vy) / IMP, .25, 1.3);
    stats.t += dt;
  };
  A.aviso = acc => {
    if (A.modo) return alt < .6 ? tx('baja') : tx('va');
    if (acc && acc.tipo === 'bote') return tx('toma');
    return '';
  };
  A.rebotes = () => rebotes;
"""

RAZON_L = """   EL BOTE LUNAR. La Luna es el unico mundo del grupo donde la GRAVEDAD es el
   personaje —el mundo entero esta construido sobre eso— y hasta ahora se caminaba
   igual que en la Tierra, a 5,4 m/s, con la gravedad de adorno.

   HAY DOS MOCHILAS DE SALTO, en el modulo y en el radiotelescopio: los dos sitios
   del guion donde hay equipo de la mision. Puesta, no se camina: se REBOTA. La
   mochila devuelve el envion sola en cada aterrizaje —no hay que apretar nada— y
   con 3,1 m/s² de gravedad cada rebote dura casi cinco segundos y cruza sesenta
   metros. Encadenar es la mecanica: la velocidad horizontal se CONSERVA porque no
   hay aire, asi que cada rebote es una decision de rumbo y no de tiempo.

   Y LA ALTURA ES SOBRE EL TERRENO DE ACA, no sobre el de donde saltaste: un
   crater te deja mas alto y una loma te corta el vuelo. Sin esa linea, volar
   sobre relieve no se sentia en absoluto —era una parabola sobre un plano—, que
   es justo lo contrario de lo que este mundo tiene para mostrar. Por encima de
   metro y medio tampoco chocas con las piedras, que es la otra mitad del bote."""

# ========================================================================= EXO
TT_X = """{
    es: { toma: 'ESPORA · ◉ USAR para que te levante',
          va:   'PALANCA para planear · te vuelve a levantar cualquier espora que pises',
          baja: '◉ USAR para dejarte caer' },
    en: { toma: 'SPORE VENT · ◉ USE to be lifted',
          va:   'STICK to glide · any vent you pass over lifts you again',
          baja: '◉ USE to drop' },
    pt: { toma: 'ESPORO · ◉ USAR para ser levantado',
          va:   'ALAVANCA para planar · qualquer esporo por onde passes levanta-te',
          baja: '◉ USAR para cair' }
  }"""

CUERPO_X = r"""
  const RTOMA = 7;
  const R_CHORRO = 9;      /* radio del chorro de esporas */
  const ALTO = 38;         /* hasta donde te sube */
  const V_SUBE = 13;
  const V_PLAN = 15;       /* planeando */
  const CAE = 3.2;         /* lo que baja planeando: 1 m cada 4,7 de avance */
  const GIRO = 1.15;

  /* -------------------- donde estan las esporas --------------------------- */
  /* UNA EN CADA PARADA DEL GUION, corrida al costado, mas una en el medio de cada
     tramo largo: asi la ruta de las copas existe de punta a punta y se puede
     encadenar sin tocar el suelo, que es de lo que vive la mecanica. */
  {
    const ks = Object.keys(POI);
    const pon = (x, z) => {
      for (const P of A.PUE) if (Math.hypot(P.x - x, P.z - z) < 60) return;
      if (Math.abs(x) > MITAD - 40 || Math.abs(z) > MITAD - 40) return;
      A.PUE.push({ x, z, lib: true });
    };
    for (const k of ks){ const p = POI[k]; if (p) pon(p.x + 18, p.z + 12); }
    for (let i = 1; i < ks.length; i++){
      const a = POI[ks[i - 1]], b = POI[ks[i]];
      if (!a || !b) continue;
      if (Math.hypot(b.x - a.x, b.z - a.z) > 150) pon((a.x + b.x) / 2, (a.z + b.z) / 2);
    }
  }

  /* ------------------------------ las esporas ------------------------------ */
  const mBul = new T.MeshLambertMaterial({ color: 0x6a4a8e });
  const mLuz = new T.MeshLambertMaterial({ color: 0xbff5e0, transparent: true,
    opacity: .5, depthWrite: false });
  for (const P of A.PUE){
    P.y = H(P.x, P.z);
    /* el bulbo: una bola achatada de la que sale el chorro, con tres lobulos */
    const g = [];
    for (let k = 0; k < 3; k++){
      const s = new T.SphereGeometry(2.4 - k * .4, 7, 5);
      s.scale(1, .62, 1);
      s.translate(P.x + Math.sin(k * 2.1) * 1.7, P.y + .9 + k * .5,
                  P.z + Math.cos(k * 2.1) * 1.7);
      g.push(s);
    }
    const bu = new T.Mesh(fusiona(g), mBul);
    bu.castShadow = true;
    scene.add(bu);
    /* EL CHORRO: un cono largo y translucido. Es lo unico que se ve de lejos y lo
       que dice "por aca se sube" antes de saber que existe la mecanica. */
    const ch = new T.Mesh(new T.CylinderGeometry(R_CHORRO * .35, R_CHORRO * .9, ALTO, 10, 1, true), mLuz);
    ch.position.set(P.x, P.y + ALTO / 2, P.z);
    scene.add(ch);
    P.chorro = ch;
  }

  /* ---------------------------- lo que se hace ---------------------------- */
  let alt = 0, sube = null;
  const esporaBajo = () => {
    for (const P of A.PUE) if (Math.hypot(px - P.x, pz - P.z) < R_CHORRO) return P;
    return null;
  };
  A.accion = () => {
    if (A.modo) return { baja: true };
    const P = esporaBajo();
    if (P && Math.hypot(px - P.x, pz - P.z) < RTOMA + R_CHORRO) return { P };
    return null;
  };
  A.usar = c => {
    if (c.baja){ A.suelta(); return; }
    A.modo = 'espora'; sube = c.P; A.act = c.P;
    A.hd = yaw; A.vel = 0; alt = Math.max(alt, .5);
  };
  A.suelta = () => {
    if (!A.modo) return;
    A.modo = null; A.vel = 0; alt = 0; altExtra = 0; sube = null;
    pvx = 0; pvz = 0;
  };

  A.paso = dt => {
    A.nPaso++; A.tSim += dt;
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    A.hd -= mx * GIRO * dt;
    yaw = A.hd;
    /* ¿estás dentro de un chorro? Entonces subís, venga de donde vengas: pasar
       planeando por encima de una espora te vuelve a levantar, y eso es lo que
       convierte seis esporas en una ruta y no en seis ascensores. */
    const dentro = esporaBajo();
    if (dentro && alt < ALTO){
      sube = dentro;
      alt += V_SUBE * dt * (1 - .75 * cl(alt / ALTO, 0, 1));
      A.vel += (cl(-my, 0, 1) * V_PLAN * .5 - A.vel) * Math.min(1, dt * 2);
    } else {
      sube = null;
      /* PLANEANDO: se cambia altura por distancia, 1 m de caída cada 4,7 de
         avance. La palanca adelante alarga el planeo y atrás lo acorta. */
      A.vel += (V_PLAN * (my < -.1 ? -my : .45) - A.vel) * Math.min(1, dt * 1.6);
      alt -= CAE * dt * (my > .2 ? 2.2 : 1);
    }
    A.vel = cl(A.vel, 0, V_PLAN);
    const ux = -Math.sin(A.hd), uz = -Math.cos(A.hd);
    const h0 = H(px, pz);
    let nx = cl(px + ux * A.vel * dt, -MITAD + 6, MITAD - 6);
    let nz = cl(pz + uz * A.vel * dt, -MITAD + 6, MITAD - 6);
    if (alt < 2){
      for (const o of ARB){
        const bx = nx - o[0], bz = nz - o[1], d = Math.hypot(bx, bz), rq = o[2] + .6;
        if (o[2] > 0 && d < rq && d > 1e-4){ nx = o[0] + bx / d * rq; nz = o[1] + bz / d * rq; }
      }
    }
    stats.dist += Math.hypot(nx - px, nz - pz);
    px = nx; pz = nz;
    /* la altura es sobre el terreno de ACÁ: una colina te corta el planeo y un
       valle te lo alarga, que es lo único que hace que planear sea leer el mapa */
    alt += h0 - H(px, pz);
    if (alt <= 0){ A.suelta(); return; }
    altExtra = alt;
    pvx = ux * A.vel; pvz = uz * A.vel;
    bobF += dt * (1.1 + A.vel * .08);
    stats.t += dt;
  };
  A.aviso = acc => {
    if (A.modo) return sube ? tx('va') : tx('va');
    if (acc && acc.tipo === 'espora') return tx('toma');
    return '';
  };
  A.alto = () => +alt.toFixed(1);
"""

RAZON_X = """   LAS ESPORAS DE EXO. Este es el bosque que respira: colinas grandes, copas cian
   y magenta, un lago de luz. Todo eso se veia de abajo, siempre, desde la altura
   de los ojos.

   HAY UNA ESPORA EN CADA PARADA DEL GUION —corrida al costado— y una mas en el
   medio de cada tramo largo, asi la ruta existe de punta a punta. Cada una es un
   bulbo con un CHORRO translucido de 38 m, que es lo unico que se ve de lejos y lo
   que dice "por aca se sube" antes de saber que la mecanica existe.

   Y LO QUE LA HACE UNA RUTA Y NO SEIS ASCENSORES: dentro del chorro subis, VENGAS
   DE DONDE VENGAS. Pasar planeando por encima de otra espora te vuelve a
   levantar, asi que se encadena y se puede cruzar el bosque sin tocar el suelo.
   Planear cambia altura por distancia —un metro de caida cada 4,7 de avance—, la
   palanca adelante alarga el planeo y atras lo acorta, y al tocar el suelo se
   termina solo.

   Igual que en la Luna, la altura es sobre el terreno DE ACA: una colina te corta
   el planeo y un valle te lo alarga. Es la unica linea que hace que planear sea
   leer el mapa en vez de mirar una parabola."""

ok = True
ok &= aplica('mundos/luna.html', 'BOTE', 'bote',
             'EL BOTE LUNAR: EL TRASLADO PROPIO DE LA LUNA', RAZON_L, TT_L, CUERPO_L,
             ('14,16,26', '190,200,230', '#e6ecff'))
ok &= aplica('mundos/exo.html', 'ESPORA', 'espora',
             'LAS ESPORAS: EL TRASLADO PROPIO DE EXO', RAZON_X, TT_X, CUERPO_X,
             ('18,12,32', '170,240,210', '#dcfff2'))
sys.exit(0 if ok else 1)
