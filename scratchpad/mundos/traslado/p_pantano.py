#!/usr/bin/env python3
"""PANTANO: LA CANOA."""
import sys
sys.path.insert(0, '/home/user/mundos/scratchpad/mundos/traslado')
from nucleo import aplica

TT = """{
    es: { toma: 'CANOA · ◉ USAR para subir',
          va:   'PALANCA rema y timonea · SALTO da una palada fuerte',
          baja: '◉ USAR para bajar en la orilla',
          lejos:'no hay orilla al lado' },
    en: { toma: 'CANOE · ◉ USE to board',
          va:   'STICK to paddle and steer · JUMP for a hard stroke',
          baja: '◉ USE to step ashore',
          lejos:'no shore alongside' },
    pt: { toma: 'CANOA · ◉ USAR para subir',
          va:   'ALAVANCA rema e guia · SALTO da uma remada forte',
          baja: '◉ USAR para descer na margem',
          lejos:'sem margem ao lado' }
  }"""

CUERPO = r"""
  const RTOMA = 7.5;
  const V_MAX = 7.6;        /* una canoa no corre: cruza lo que no se cruza */
  const ACEL = 3.4, FREN = 4.2, ROCE = 1.1;
  const GIRO = 1.5;         /* una canoa pivota: gira mucho mejor que camina */
  const OJO_C = AGUA_Y + 1.15;   /* el ojo sentado, un metro sobre el agua negra */
  const HONDO = -.75;       /* hace falta esto de agua bajo la quilla */

  const hayAgua = (x, z) => H(x, z) < AGUA_Y + HONDO;

  /* -------------------- donde estan amarradas las canoas ------------------- */
  /* PEGADAS A LA PASARELA Y MIRANDO A LA LAGUNA. La pasarela es lo unico
     caminable de punta a punta y las lagunas son infranqueables a pie: la canoa
     no es un atajo, es la unica llave del 80% del mapa. Para cada laguna se
     busca el punto de la pasarela mas cercano y se sale de ahi hacia el centro
     de la laguna hasta encontrar agua honda. */
  {
    const cand = [];
    for (const L of LAG){
      let mej = 1e9, mi = 0;
      for (let i = 0; i < SENDA_PTS.length; i++){
        const d = Math.hypot(SENDA_PTS[i][0] - L.x, SENDA_PTS[i][1] - L.z);
        if (d < mej){ mej = d; mi = i; }
      }
      cand.push({ L, d: mej, p: SENDA_PTS[mi] });
    }
    cand.sort((a, b) => a.d - b.d);
    for (const c of cand){
      if (A.PUE.length >= 3) break;
      const ux = (c.L.x - c.p[0]) / (c.d || 1), uz = (c.L.z - c.p[1]) / (c.d || 1);
      let x = 0, z = 0, ok = false;
      for (let r = 6; r <= 26; r += 2){
        x = c.p[0] + ux * r; z = c.p[1] + uz * r;
        if (hayAgua(x, z)){ ok = true; break; }
      }
      if (!ok) continue;
      /* ni dos canoas en el mismo sitio */
      let junta = false;
      for (const P of A.PUE) if (Math.hypot(P.x - x, P.z - z) < 90) junta = true;
      if (junta) continue;
      A.PUE.push({ x, z, hd: Math.atan2(-ux, -uz), lib: true });
    }
  }

  /* ------------------------------- la canoa -------------------------------- */
  const mCas = new T.MeshLambertMaterial({ map: TX.oscuro, color: 0x6a5236 });
  const mBor = new T.MeshLambertMaterial({ map: TX.oscuro, color: 0x8a6f45 });
  const mRem = new T.MeshLambertMaterial({ color: 0x9a7c4e });
  /* Se arma por piezas porque el REMO se mueve, y el remo es lo que convierte
     "la camara se desliza" en "estas remando". */
  function armaCanoa(){
    const g = new T.Group();
    /* el casco: una caja larga afinada a proa y a popa con dos cunas */
    const cas = new T.Mesh(new T.BoxGeometry(.92, .46, 3.9), mCas);
    cas.position.y = .23;
    g.add(cas);
    for (const s of [-1, 1]){
      const pu = new T.Mesh(new T.ConeGeometry(.46, 1.15, 4), mCas);
      pu.rotation.x = s * Math.PI / 2;
      pu.rotation.z = Math.PI / 4;
      pu.position.set(0, .23, s * -2.5);
      g.add(pu);
    }
    /* las bordas y dos bancos: es lo que se ve desde dentro */
    for (const s of [-1, 1]){
      const bo = new T.Mesh(new T.BoxGeometry(.09, .17, 3.8), mBor);
      bo.position.set(s * .46, .5, 0);
      g.add(bo);
    }
    for (const z2 of [-.9, .9]){
      const ba = new T.Mesh(new T.BoxGeometry(.9, .07, .26), mBor);
      ba.position.set(0, .48, z2);
      g.add(ba);
    }
    /* EL REMO, con su pivote en la mano derecha */
    const piv = new T.Group();
    piv.position.set(.5, .72, -.15);
    const pal = new T.Mesh(new T.CylinderGeometry(.035, .035, 1.9, 5), mRem);
    pal.position.y = -.7; piv.add(pal);
    const hoj = new T.Mesh(new T.BoxGeometry(.2, .5, .03), mRem);
    hoj.position.y = -1.62; piv.add(hoj);
    g.add(piv);
    g.remo = piv;
    g.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  for (const P of A.PUE){
    P.g = armaCanoa();
    P.g.position.set(P.x, AGUA_Y - .12, P.z);
    P.g.rotation.y = P.hd;
    P.g.remo.rotation.set(-1.15, 0, .3);     /* amarrada: el remo apoyado */
    scene.add(P.g);
  }

  /* ----------------------------- lo que se hace ---------------------------- */
  let mia = null, brazada = 0;
  /* ¿hay orilla al lado para bajarse? Es la unica condicion de salida: bajarse
     en el medio de la laguna seria ahogarse, y ahogarse no es una mecanica. */
  function orillaCerca(){
    for (let a = 0; a < 6.2832; a += .5){
      const x = px + Math.sin(a) * 3.4, z = pz + Math.cos(a) * 3.4;
      if (H(x, z) > AGUA_Y + .25) return { x, z };
    }
    return null;
  }
  A.accion = () => {
    if (A.modo){
      if (A.vel > 2.6) return null;
      const o = orillaCerca();
      return o ? { baja: o } : { lejos: true };
    }
    for (const P of A.PUE)
      if (P.lib && Math.hypot(px - P.x, pz - P.z) < RTOMA) return { P };
    return null;
  };
  A.usar = c => {
    if (c.lejos) return;                       /* el aviso ya lo dice */
    if (c.baja){ A.suelta(c.baja); return; }
    const P = c.P;
    P.lib = false; A.act = P; mia = P.g;
    A.modo = 'canoa'; A.vel = 0; A.hd = P.hd; brazada = 0;
    yaw = P.hd;
    px = P.x; pz = P.z;
    ojoY = OJO_C - OJO;
    enAire = false; aireY = 0; aireV = 0;
  };
  A.suelta = orilla => {
    if (!A.modo) return;
    const P = A.act;
    A.modo = null; A.vel = 0;
    if (P){
      /* la canoa QUEDA amarrada donde la dejaste: es lo que hace que el mapa se
         abra de verdad y no que el mundo te devuelva a la pasarela */
      P.x = px; P.z = pz; P.hd = A.hd; P.lib = true;
      P.g.position.set(px, AGUA_Y - .12, pz);
      P.g.rotation.set(0, A.hd, 0);
      P.g.remo.rotation.set(-1.15, 0, .3);
    }
    mia = null;
    if (orilla && orilla.x != null){ px = orilla.x; pz = orilla.z; }
    ojoY = H(px, pz);
    pvx = 0; pvz = 0; aireY = 0; aireV = 0; enAire = false;
  };
  /* SALTO en la canoa no es saltar —de una canoa no se salta— es la PALADA
     FUERTE: el envion que saca la proa del juncal cuando te quedaste clavado. */
  A.salta = () => { A.vel = Math.min(V_MAX * 1.35, A.vel + 3.4); brazada = 0; };

  A.paso = dt => {
    A.nPaso++; A.tSim += dt;
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    A.hd -= mx * GIRO * dt;
    yaw = A.hd;
    const obj = my < -.15 ? V_MAX * (-my) : 0;
    A.vel += (obj > A.vel ? ACEL : -FREN) * dt;
    A.vel -= ROCE * (A.vel / V_MAX) * dt;
    A.vel = cl(A.vel, 0, V_MAX * 1.35);
    const ux = -Math.sin(A.hd), uz = -Math.cos(A.hd);
    let nx = cl(px + ux * A.vel * dt, -MITAD + 8, MITAD - 8);
    let nz = cl(pz + uz * A.vel * dt, -MITAD + 8, MITAD - 8);
    /* LA QUILLA TOCA FONDO. La canoa no sube a la tierra: si adelante no hay
       agua honda, no se avanza y se pierde el envion. Es el limite del mundo de
       la canoa, y es el mismo limite —al revés— que tiene caminar acá. */
    if (!hayAgua(nx, nz)){
      /* se prueba deslizar por la orilla antes de clavarla: raspar un juncal y
         quedar quieto en seco son dos cosas distintas */
      if (hayAgua(nx, pz)) nz = pz;
      else if (hayAgua(px, nz)) nx = px;
      else { nx = px; nz = pz; }
      A.vel *= .55;
    }
    stats.dist += Math.hypot(nx - px, nz - pz);
    px = nx; pz = nz;
    /* el ojo va CLAVADO al agua, no al fondo de la laguna: acá `H` es el barro
       de abajo y seguirlo te hundía la cámara seis metros. */
    ojoY = OJO_C - OJO;
    aireY = 0; aireV = 0; enAire = false;
    pvx = ux * A.vel; pvz = uz * A.vel;
    /* LA BRAZADA. Una palada por segundo y medio a media velocidad; el casco
       cabecea con ella y se escora al girar, que es lo que hace que 7 m/s en una
       canoa se sientan mas que 11 corriendo. */
    brazada += dt * (.9 + A.vel * .34);
    bobF = brazada * 2;
    if (mia){
      const bal = Math.sin(brazada * 6.2832) ;
      mia.position.set(px, AGUA_Y - .12 + bal * .045, pz);
      mia.rotation.set(bal * .035 + A.vel * .006, A.hd, -mx * .09 + bal * .02);
      /* el remo entra, empuja y sale: media vuelta trabajando y media al aire */
      const f = brazada - Math.floor(brazada);
      const trab = f < .55;
      mia.remo.rotation.set(trab ? -.5 + f / .55 * 1.5 : .9 - (f - .55) / .45 * 1.4,
        trab ? .1 : -.5, .3 + (trab ? 0 : .25));
    }
    stats.t += dt;
  };
  A.aviso = acc => {
    if (A.modo){
      if (A.vel > 2.6) return tx('va');
      return (acc && acc.tr && acc.tr.lejos) ? tx('va') + ' · ' + tx('lejos') : tx('baja');
    }
    if (acc && acc.tipo === 'canoa') return tx('toma');
    return '';
  };
"""

RAZON = """   LA CANOA DEL PANTANO. De los quince mundos, este es el que MAS pedia un
   traslado propio, y por una razon que ya estaba escrita en su terreno: la
   pasarela es lo unico caminable de punta a punta y las ocho lagunas de agua
   negra son infranqueables a pie (la fisica llama `enAgua` y no te deja). O sea
   que el ochenta por ciento del mapa existia, se veia, y no se podia tocar.

   LA CANOA ES LA LLAVE DE ESE OCHENTA POR CIENTO. No es un atajo ni un boton de
   correr: va a 7,6 m/s, MENOS que correr, y encima no puede pisar tierra. Lo
   que hace es cambiar QUE ES SUELO: en la canoa la laguna es camino y la
   pasarela es pared, exactamente al reves que a pie. Con eso el mismo mapa se
   lee dado vuelta.

   HAY TRES, AMARRADAS a la pasarela y mirando a la laguna. No se ponen a mano:
   para cada laguna se busca el punto de la pasarela mas cercano y se sale de ahi
   hacia el centro hasta encontrar agua honda, asi que caen donde el jugador ya
   pasa caminando y siguen cayendo bien si mañana se mueve una laguna.

   TRES COSAS QUE TIENEN QUE SER ASI. La canoa QUEDA donde la dejaste, no vuelve
   a su sitio: si volviera, el mundo te estaria devolviendo a la pasarela. Solo
   se baja EN LA ORILLA y despacio, porque bajarse en el medio de la laguna seria
   ahogarse y ahogarse no es una mecanica. Y el ojo va clavado un metro sobre el
   AGUA y no sobre `H`, que aca es el barro del fondo: siguiendo `H` la camara se
   hundia seis metros. SALTO tampoco es saltar —de una canoa no se salta— es la
   palada fuerte que saca la proa del juncal."""

ok = aplica('mundos/pantano.html', 'CANOA', 'canoa',
            'LA CANOA: EL TRASLADO PROPIO DEL PANTANO', RAZON, TT, CUERPO,
            ('12,22,18', '150,200,180', '#dcf2ea'))
sys.exit(0 if ok else 1)
