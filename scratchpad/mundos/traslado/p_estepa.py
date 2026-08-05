#!/usr/bin/env python3
"""ESTEPA: EL CABALLO.

Por que un caballo y no otra cosa. La estepa es el unico mundo del grupo que es
LLANO y ENORME: 900 m de pasto con lomas mansas, un rebano, un tumulo, un molino.
No hay nada que trepar ni de donde tirarse, asi que una tabla o una cuerda no
tendrian donde apoyarse. Lo que sobra es distancia, y lo que la estepa invento en
el mundo real para la distancia fue el caballo. Y no es un boton de correr con
otro nombre: al galope se va a 17 m/s contra los 11,5 de correr, se trepa lo que
a pie no se puede (1,3 de pendiente contra 0,80), se salta de verdad, y girar a
todo galope cuesta —un caballo lanzado no pivota— asi que hay que elegir la linea
de antemano. Se recorre la misma estepa pensando distinto.
"""
import sys, pathlib
sys.path.insert(0, '/home/user/mundos/scratchpad/mundos/traslado')
from nucleo import aplica, RAIZ

TT = """{
    es: { toma: 'CABALLO · ◉ USAR para montar',
          va:   'PALANCA adelante galopa · atras frena · SALTO salta',
          baja: '◉ USAR para desmontar' },
    en: { toma: 'HORSE · ◉ USE to mount',
          va:   'PUSH STICK to gallop · pull back to slow · JUMP to leap',
          baja: '◉ USE to dismount' },
    pt: { toma: 'CAVALO · ◉ USAR para montar',
          va:   'ALAVANCA adiante galopa · atras freia · SALTO salta',
          baja: '◉ USAR para desmontar' }
  }"""

CUERPO = r"""
  const RTOMA = 8;         /* a esta distancia se monta */
  const V_TROTE = 7.5;     /* al trote, sin tocar la palanca */
  const V_GALOPE = 17;     /* a todo galope: metro y medio mas que correr, por dos */
  const ACEL = 6.5, FREN = 9;
  const GIRO_Q = 2.1;      /* rad/s girando quieto o al paso */
  const PEND_C = 1.3;      /* un caballo trepa lo que un caminante no: 52 grados */
  const ALTO_L = 1.52;     /* la cruz, o sea donde va la montura */
  const E = 1.4;

  /* ------------------------- donde estan los caballos ---------------------- */
  /* SUELTOS Y PASTANDO, en los tres sitios del mundo donde tendria sentido que
     hubiera caballos: el rebano, el campamento y las ruinas. No hace falta
     buscar terreno: la estepa es llana, y lo que importa es que esten donde el
     jugador ya va a pasar. */
  for (const k of ['rebano', 'campamento', 'ruinas']){
    const p = POI[k];
    if (!p) continue;
    const r = (p.pr || 26) + 9;
    const a = ({ rebano: .6, campamento: 2.4, ruinas: 4.1 })[k];
    const x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
    A.PUE.push({ x, z, hd: a + Math.PI, lib: true });
  }

  /* ------------------------------ el caballo ------------------------------- */
  const mPelo = new T.MeshLambertMaterial({ map: TX.tierra, color: 0x8a6244 });
  const mCrin = new T.MeshLambertMaterial({ color: 0x33261c });
  const mCuero = new T.MeshLambertMaterial({ map: TX.oscuro, color: 0x6b4a2c });
  /* Se arma por PIEZAS y no fusionado, porque las patas tienen que moverse: al
     galope el mundo se ve desde arriba de algo que se mueve, y si el bicho es
     una estatua deslizandose se nota en el primer segundo. */
  function armaCaballo(){
    const g = new T.Group();
    /* el tronco, tumbado a lo largo de Z, mirando a -Z (el rumbo del jinete) */
    const tro = new T.Mesh(new T.CapsuleGeometry(.5, 1.3, 4, 8), mPelo);
    tro.rotation.x = Math.PI / 2;
    tro.position.set(0, ALTO_L - .18, .1);
    g.add(tro);
    /* la grupa un poco mas alta y la cruz mas ancha: sin esto es un tubo */
    const gru = new T.Mesh(new T.SphereGeometry(.52, 7, 5), mPelo);
    gru.scale.set(1, .92, 1.05); gru.position.set(0, ALTO_L - .06, .78);
    g.add(gru);
    /* el CUELLO y la CABEZA: es lo unico que el jinete ve de su caballo, asi que
       es la unica parte que esta hecha con cuidado. */
    const cue = new T.Mesh(new T.CylinderGeometry(.26, .19, 1.02, 7), mPelo);
    cue.rotation.x = -.72; cue.position.set(0, ALTO_L + .34, -.72);
    g.add(cue);
    const cab = new T.Mesh(new T.BoxGeometry(.26, .3, .62), mPelo);
    cab.rotation.x = .34; cab.position.set(0, ALTO_L + .72, -1.16);
    g.add(cab);
    const hoc = new T.Mesh(new T.BoxGeometry(.2, .2, .2), mCrin);
    hoc.position.set(0, ALTO_L + .56, -1.42);
    g.add(hoc);
    for (const s of [-1, 1]){
      const or = new T.Mesh(new T.ConeGeometry(.06, .18, 4), mPelo);
      or.position.set(s * .09, ALTO_L + .94, -.98);
      g.add(or);
    }
    /* la CRIN y la COLA: dos planos, y son las que dan el viento */
    const cri = new T.Mesh(new T.BoxGeometry(.05, .3, 1.05), mCrin);
    cri.rotation.x = -.72; cri.position.set(0, ALTO_L + .52, -.7);
    g.add(cri);
    const col = new T.Mesh(new T.BoxGeometry(.06, .74, .16), mCrin);
    col.rotation.x = -.42; col.position.set(0, ALTO_L - .18, 1.02);
    g.add(col);
    /* la MONTURA y las riendas, que es lo que dice que este caballo se monta */
    const mon = new T.Mesh(new T.BoxGeometry(.46, .16, .58), mCuero);
    mon.position.set(0, ALTO_L + .2, .04);
    g.add(mon);
    const rie = new T.Mesh(new T.BoxGeometry(.34, .02, 1.1), mCuero);
    rie.rotation.x = -.5; rie.position.set(0, ALTO_L + .5, -.62);
    g.add(rie);
    /* las PATAS: cuatro, con su pivote arriba para que roten desde el hombro */
    g.patas = [];
    for (let i = 0; i < 4; i++){
      const px2 = (i % 2 ? .28 : -.28), pz2 = (i < 2 ? -.42 : .74);
      const piv = new T.Group();
      piv.position.set(px2, ALTO_L - .34, pz2);
      const pat = new T.Mesh(new T.CylinderGeometry(.09, .07, 1.14, 5), mPelo);
      pat.position.y = -.57;
      piv.add(pat);
      const cas = new T.Mesh(new T.CylinderGeometry(.1, .11, .14, 5), mCrin);
      cas.position.y = -1.18;
      piv.add(cas);
      g.add(piv);
      g.patas.push(piv);
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  for (const P of A.PUE){
    P.g = armaCaballo();
    P.g.position.set(P.x, H(P.x, P.z), P.z);
    P.g.rotation.y = P.hd;
    scene.add(P.g);
    /* pastando: la cabeza abajo. Se hace bajando el grupo entero un pelo y
       girandolo, que a la distancia a la que se lo ve alcanza y sobra. */
    P.g.rotation.x = .12;
    ARB.push([P.x, P.z, 1.1]);       /* a pie no se lo atraviesa */
    P.arb = ARB[ARB.length - 1];
  }

  /* ----------------------------- lo que se hace ---------------------------- */
  let mio = null;                    /* el caballo montado */
  let fase = 0;                      /* fase del tranco, para las patas */
  A.accion = () => {
    if (A.modo) return A.vel < 6 ? { baja: true } : null;
    for (const P of A.PUE)
      if (P.lib && Math.hypot(px - P.x, pz - P.z) < RTOMA) return { P };
    return null;
  };
  A.usar = c => {
    if (c.baja){ A.suelta(); return; }
    const P = c.P;
    P.lib = false; A.act = P; mio = P.g;
    mio.rotation.x = 0;              /* levanta la cabeza */
    if (P.arb) P.arb[2] = 0;         /* montado no choca consigo mismo */
    A.modo = 'caballo';
    A.vel = 2.5; A.hd = yaw; A.tSol = 0;
    altExtra = ALTO_L - .22;         /* el ojo pasa a la altura de la montura */
    enAire = false; aireY = 0; aireV = 0;
  };
  A.suelta = () => {
    if (!A.modo) return;
    const P = A.act;
    A.modo = null; A.vel = 0; altExtra = 0;
    /* se desmonta AL COSTADO, como se desmonta de verdad, y el caballo queda
       ahi: si volviera a su sitio el mundo te estaria corrigiendo */
    if (P){
      P.x = px + Math.cos(A.hd) * 1.5; P.z = pz - Math.sin(A.hd) * 1.5;
      P.hd = A.hd; P.lib = true;
      P.g.position.set(P.x, H(P.x, P.z), P.z);
      P.g.rotation.set(0, A.hd, 0);
      for (const pv of P.g.patas) pv.rotation.x = 0;
      if (P.arb){ P.arb[0] = P.x; P.arb[1] = P.z; P.arb[2] = 1.1; }
    }
    mio = null;
    pvx = 0; pvz = 0;
    if (enAire){ aireY = Math.max(0, A.absY - H(px, pz)); aireV = A.absV; }
    else { aireY = 0; aireV = 0; }
  };
  /* SALTO montado: el caballo salta. Es lo que hace que un arroyo o una cerca
     dejen de ser una pared y pasen a ser una decision. */
  A.salta = () => { A.despega(9.4 + Math.min(2.6, A.vel * .12)); };

  A.paso = dt => {
    A.nPaso++; A.tSim += dt;
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    /* un caballo lanzado NO PIVOTA: cuanto mas rapido, menos gira. Es lo que
       obliga a elegir la linea antes y no a media carrera. */
    const gir = GIRO_Q * (1 - .62 * cl(A.vel / V_GALOPE, 0, 1));
    A.hd -= mx * gir * dt;
    yaw = A.hd;
    /* la palanca es el pedido de aire: adelante galopa, suelta trota, atras para */
    const obj = my < -.15 ? V_GALOPE : (my > .25 ? 0 : V_TROTE);
    A.vel += (obj > A.vel ? ACEL : -FREN) * dt;
    /* sin rebote alrededor del pedido: acercarse y pasarse cada cuadro se oye en
       el sonido de los cascos como un temblor */
    if (Math.abs(A.vel - obj) < .3) A.vel = obj;
    A.vel = cl(A.vel, 0, V_GALOPE);
    const ux = -Math.sin(A.hd), uz = -Math.cos(A.hd);
    if (!enAire){
      /* CUESTA ARRIBA el caballo puede, pero no todo: pasado PEND_C se planta y
         pierde carrera, que es lo que dice "por aca no" sin un muro invisible */
      const dh = ((H(px + ux * E, pz + uz * E) - H(px, pz)) / E);
      if (dh > PEND_C){ A.vel *= .82; }
    }
    let nx = cl(px + ux * A.vel * dt, -MITAD + 6, MITAD - 6);
    let nz = cl(pz + uz * A.vel * dt, -MITAD + 6, MITAD - 6);
    /* la pendiente que no se puede: se desliza por la curva de nivel igual que a
       pie, asi que la ladera se siente como ladera y no como pared */
    {
      const h0 = H(px, pz), h1 = H(nx, nz);
      const dl2 = Math.hypot(nx - px, nz - pz);
      if (dl2 > 1e-5 && (h1 - h0) / dl2 > PEND_C){
        const gx = H(px + E, pz) - H(px - E, pz), gz = H(px, pz + E) - H(px, pz - E);
        const gl = Math.hypot(gx, gz) || 1;
        const vx = gx / gl, vz = gz / gl;
        const dvx = nx - px, dvz = nz - pz;
        const pr = dvx * vx + dvz * vz;
        nx = px + (dvx - vx * pr) * .9; nz = pz + (dvz - vz * pr) * .9;
      }
    }
    for (const o of ARB){
      const bx = nx - o[0], bz = nz - o[1], d = Math.hypot(bx, bz), rq = o[2] + .8;
      if (o[2] > 0 && d < rq && d > 1e-4){
        nx = o[0] + bx / d * rq; nz = o[1] + bz / d * rq;
        A.vel *= .55;
      }
    }
    stats.dist += Math.hypot(nx - px, nz - pz);
    px = nx; pz = nz;
    const hs = H(px, pz);
    ojoY = ojoY == null ? hs : ojoY + (hs - ojoY) * Math.min(1, dt * 13);
    if (Math.abs(hs - ojoY) > 3) ojoY = hs;
    if (A.caida(dt, hs)) A.vel *= .93;
    pvx = ux * A.vel; pvz = uz * A.vel;
    /* EL TRANCO. La frecuencia va con la velocidad y el balanceo tambien: al paso
       es un vaiven lento y al galope es un salto por tranco, que es lo que hace
       que 17 m/s se sientan 17 y no una camara volando. */
    fase += dt * (1.5 + A.vel * .55);
    bobF = fase * 2;
    const amp = .05 + .07 * cl(A.vel / V_GALOPE, 0, 1);
    if (mio){
      mio.position.set(px, (ojoY != null ? ojoY : hs) + aireY + Math.sin(fase * 2) * amp, pz);
      mio.rotation.set(Math.sin(fase) * .045 - cl(A.vel / V_GALOPE, 0, 1) * .05,
        A.hd, Math.sin(fase) * .05);
      for (let i = 0; i < 4; i++){
        const ph = fase * 2 + (i < 2 ? 0 : 3.14) + (i % 2 ? 1.57 : 0);
        mio.patas[i].rotation.x = Math.sin(ph) * (.22 + .42 * cl(A.vel / V_GALOPE, 0, 1));
      }
    }
    stats.t += dt;
  };
  A.aviso = acc => {
    if (A.modo) return A.vel < 6 ? tx('baja') : tx('va');
    if (acc && acc.tipo === 'caballo') return tx('toma');
    return '';
  };
"""

RAZON = """   EL CABALLO DE LA ESTEPA. La estepa es el unico mundo llano y enorme del grupo:
   900 m de pasto con lomas mansas. No hay nada que trepar ni de donde tirarse,
   asi que una tabla o una cuerda no tendrian donde apoyarse; lo que sobra es
   distancia, y lo que la estepa invento para la distancia fue el caballo.

   NO ES UN BOTON DE CORRER CON OTRO NOMBRE. Al galope va a 17 m/s contra los
   11,5 de correr; trepa 1,3 de pendiente donde a pie el tope es 0,80; salta de
   verdad, asi que un arroyo o una cerca dejan de ser una pared y pasan a ser una
   decision; y GIRAR A TODO GALOPE CUESTA —un caballo lanzado no pivota—, o sea
   que la linea se elige antes y no a media carrera.

   HAY TRES, SUELTOS Y PASTANDO, en los unicos tres sitios donde tendria sentido
   que hubiera caballos: el rebano, el campamento y las ruinas. Se desmonta al
   costado y el caballo QUEDA AHI: si volviera a su sitio, el mundo te estaria
   corrigiendo, y encima no habria como volver a subirse.

   COMO ENCAJA. No hay controles nuevos: USAR para montar y desmontar, SALTO para
   saltar, la palanca para el aire y el rumbo. Mientras estas montado `fisica`
   cede el paso y el modulo usa los MISMOS aireY/aireV/ojoY, asi que al
   desmontarte el estado sigue valiendo tal cual. El ojo sube a la altura de la
   montura con `altExtra`, que es la unica linea que hubo que tocar de la camara."""

ok = aplica('mundos/estepa.html', 'CABALLO', 'caballo',
            'EL CABALLO: EL TRASLADO PROPIO DE LA ESTEPA', RAZON, TT, CUERPO,
            ('30,34,18', '200,220,150', '#eef4dc'), ojo=True)
sys.exit(0 if ok else 1)
