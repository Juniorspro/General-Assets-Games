#!/usr/bin/env python3
"""CAÑON: EL RAPEL."""
import sys
sys.path.insert(0, '/home/user/mundos/scratchpad/mundos/traslado')
from nucleo import aplica

TT = """{
    es: { toma: 'CLAVO Y CUERDA · ◉ USAR para engancharte',
          va:   'PALANCA adelante BAJA · atras SUBE · costados caminan la pared · SALTO se impulsa',
          baja: '◉ USAR para soltarte en la repisa' },
    en: { toma: 'PITON AND ROPE · ◉ USE to clip in',
          va:   'PUSH STICK to descend · pull back to climb · sideways walks the wall · JUMP to kick off',
          baja: '◉ USE to unclip on the ledge' },
    pt: { toma: 'GRAMPO E CORDA · ◉ USAR para engatar',
          va:   'ALAVANCA adiante DESCE · atras SOBE · lados andam na parede · SALTO impulsiona',
          baja: '◉ USAR para soltar no patamar' }
  }"""

CUERPO = r"""
  const RTOMA = 7;
  const V_BAJA = 9.5;      /* soltando cuerda: nueve metros por segundo */
  const V_SUBE = 2.4;      /* trepando con el puño: lento, como es */
  const V_LAT = 3.2;       /* caminar la pared de costado */
  const SEP = .85;         /* cuanto te separas de la roca */
  const E = 1.4;

  /* EL RUMBO DEL CAÑON. La garganta se talla sobre `eje = .78x + .62z`, asi que
     la pared mira siempre en esa direccion: el gradiente de `eje`, normalizado.
     Saliendo del eje se sube y entrando se baja, y con eso ya se sabe para donde
     esta el vacio en cualquier punto del mapa sin buscarlo. */
  const EJX = .78 / Math.hypot(.78, .62), EJZ = .62 / Math.hypot(.78, .62);
  const haciaVacio = (x, z) => {
    const s = (x * .78 + z * .62) > 0 ? -1 : 1;
    return { x: EJX * s, z: EJZ * s };
  };

  /* --------------------------- donde estan los clavos ---------------------- */
  /* EN EL BORDE, y el borde se BUSCA. Se barre el mapa en casillas de 14 m y se
     mide cuanto cae el terreno en 18 m hacia el vacio: donde cae mas de 15 m hay
     pared. De los candidatos se eligen tres, separados 150 m entre si y a menos
     de 230 m de algun punto del guion, para que esten donde el jugador pasa y no
     en un rincon del mapa. */
  {
    const cand = [];
    for (let x = -MITAD + 60; x <= MITAD - 60; x += 14)
      for (let z = -MITAD + 60; z <= MITAD - 60; z += 14){
        const u = haciaVacio(x, z);
        const h0 = H(x, z);
        const cae = h0 - H(x + u.x * 18, z + u.z * 18);
        if (cae < 15) continue;
        /* y que arriba haya donde pararse: sin repisa el clavo esta en el aire */
        if (Math.abs(h0 - H(x - u.x * 6, z - u.z * 6)) > 3.2) continue;
        let dmin = 1e9;
        for (const k of ['mojon', 'campamento', 'ruinas', 'oasis', 'cresta', 'mirador'])
          if (POI[k]) dmin = Math.min(dmin, Math.hypot(x - POI[k].x, z - POI[k].z));
        if (dmin > 230 || dmin < 46) continue;
        cand.push({ x, z, cae, u });
      }
    cand.sort((a, b) => b.cae - a.cae);
    for (const c of cand){
      if (A.PUE.length >= 3) break;
      let junta = false;
      for (const P of A.PUE) if (Math.hypot(P.x - c.x, P.z - c.z) < 150) junta = true;
      if (junta) continue;
      A.PUE.push({ x: c.x, z: c.z, u: c.u, cae: c.cae,
        hd: Math.atan2(-c.u.x, -c.u.z), lib: true });
    }
  }

  /* -------------------------------- lo que se ve --------------------------- */
  const mHie = new T.MeshLambertMaterial({ map: TX.metal, color: 0x8d8f95 });
  const mCue = new T.MeshLambertMaterial({ color: 0xd8c48a });
  for (const P of A.PUE){
    P.y = H(P.x, P.z);
    const g = [];
    /* el clavo: una placa y un aro, clavados en la roca del borde */
    const pl = new T.BoxGeometry(.3, .24, .06);
    pl.translate(P.x - P.u.x * .5, P.y + .3, P.z - P.u.z * .5);
    g.push(pl);
    const ar = new T.TorusGeometry(.13, .035, 4, 8);
    ar.rotateX(Math.PI / 2);
    ar.translate(P.x - P.u.x * .5, P.y + .5, P.z - P.u.z * .5);
    g.push(ar);
    /* tres pitones mas, clavados en fila: se ve de lejos que esto es una via */
    for (let k = 0; k < 3; k++){
      const pi = new T.BoxGeometry(.12, .12, .5);
      pi.translate(P.x - P.u.x * (1.6 + k * .9), P.y + .22 + k * .05,
                   P.z - P.u.z * (1.6 + k * .9));
      g.push(pi);
    }
    const cl2 = new T.Mesh(fusiona(g), mHie);
    cl2.castShadow = true;
    scene.add(cl2);
    /* LA CUERDA COLGANDO, que es lo unico que se ve desde el fondo del cañon y
       lo que dice "por aca se baja" antes de saber que existe la mecanica */
    const lar = Math.min(P.cae + 6, 70);
    const cu = new T.Mesh(new T.CylinderGeometry(.045, .045, lar, 5), mCue);
    cu.position.set(P.x + P.u.x * SEP, P.y + .4 - lar / 2, P.z + P.u.z * SEP);
    cu.castShadow = true;
    scene.add(cu);
    P.rollo = cu;
  }
  /* la cuerda VIVA: la que va del clavo a tus manos mientras bajas */
  const viva = new T.Mesh(new T.CylinderGeometry(.045, .045, 1, 5), mCue);
  viva.visible = false;
  scene.add(viva);

  /* ----------------------------- lo que se hace ---------------------------- */
  let anc = null;                  /* el clavo del que estas colgado */
  const V_ARR = new T.Vector3(0, 1, 0), V_TMP = new T.Vector3();
  function enRepisa(){
    return A.absY - H(px, pz) < 1.3;
  }
  A.accion = () => {
    if (A.modo) return enRepisa() ? { baja: true } : null;
    for (const P of A.PUE)
      if (P.lib && Math.hypot(px - P.x, pz - P.z) < RTOMA) return { P };
    return null;
  };
  A.usar = c => {
    if (c.baja){ A.suelta(); return; }
    const P = c.P;
    anc = P; A.act = P;
    A.modo = 'rapel';
    A.vel = 0;
    A.hd = P.hd; yaw = P.hd;
    pitch = -.35;                  /* colgado se mira para abajo */
    /* te descolgas por el borde: un poco afuera de la roca y a la altura del clavo */
    px = P.x + P.u.x * SEP; pz = P.z + P.u.z * SEP;
    A.absY = P.y;
    A.absV = 0;
    ojoY = A.absY;
    aireY = 0; aireV = 0; enAire = false;
    viva.visible = true;
  };
  A.suelta = () => {
    if (!A.modo) return;
    A.modo = null; A.vel = 0; anc = null;
    viva.visible = false;
    /* al soltarte quedas de pie donde estabas: ni un tiron ni una caida */
    ojoY = H(px, pz);
    aireY = 0; aireV = 0; enAire = false;
    pvx = 0; pvz = 0;
  };
  /* SALTO en rapel es la PATADA a la pared: te separas y ganas caida. Es como se
     baja de verdad una pared larga, a saltos, y es lo que hace que el rapel no
     sea un ascensor. */
  A.salta = () => {
    if (!anc) return;
    px += anc.u.x * 2.2; pz += anc.u.z * 2.2;
    A.absV = -5.5;
    A.nVuelo++;
  };

  A.paso = dt => {
    A.nPaso++; A.tSim += dt;
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    if (!anc){ A.suelta(); return; }
    const u = anc.u;
    /* ARRIBA Y ABAJO CON LA MISMA PALANCA. Bajar es soltar cuerda y es rapido;
       subir es trepar con el puño y es lento, como en la vida. Que se pueda
       SUBIR es el punto: el cañon tenia paredes que se veian y no se subian. */
    const pedido = my < -.1 ? -V_BAJA * (-my) : (my > .1 ? V_SUBE * my : 0);
    A.absV += (pedido - A.absV) * Math.min(1, dt * 6);
    /* la patada deja una caida libre corta que la cuerda va frenando sola */
    A.absY += A.absV * dt;
    A.vel = Math.abs(A.absV);
    /* CAMINAR LA PARED de costado: es lo que deja elegir por donde se baja y
       encontrar la repisa que sirve, en vez de bajar por un tubo. */
    let nx = px + Math.cos(A.hd) * mx * V_LAT * dt;
    let nz = pz - Math.sin(A.hd) * mx * V_LAT * dt;
    /* NO SE ENTRA EN LA ROCA. Las terrazas del cañon salen y entran, asi que en
       vez de un radio fijo se empuja hacia el vacio hasta que abajo haya aire.
       Es lo que hace que bajar una pared en peldaños funcione sin tocarla.
       El empujon va TOPADO a un metro por cuadro y a 26 m de la cuerda: sin
       tope, un peldaño de doce metros te disparaba doce metros de costado en un
       solo cuadro —se median 110 m de recorrido en una bajada de 36— y la cuerda
       quedaba cruzando el aire. Si la roca no cede, no se baja: te quedas
       apoyado en la repisa, que es lo que pasa de verdad. */
    let dAnc = Math.hypot(nx - anc.x, nz - anc.z);
    if (H(nx, nz) > A.absY - .9){
      if (dAnc < 26){ nx += u.x * 1; nz += u.z * 1; }
      else { A.absY -= A.absV * dt; A.absV = 0; }
    }
    nx = cl(nx, -MITAD + 6, MITAD - 6); nz = cl(nz, -MITAD + 6, MITAD - 6);
    stats.dist += Math.hypot(nx - px, nz - pz) + Math.abs(A.absV * dt);
    px = nx; pz = nz;
    /* el tope de la cuerda: no se sube mas arriba del clavo */
    if (A.absY > anc.y){ A.absY = anc.y; A.absV = Math.min(0, A.absV); }
    const hs = H(px, pz);
    /* TOCAR SUELO NO ES LLEGAR. El cañon es una escalera de peldaños de 6,5 m:
       bajando te apoyas en cada terraza, y soltarte en la primera terminaba el
       rapel a los doce metros (medido). Apoyado se queda ENGANCHADO —y de ahi se
       sigue con la patada de SALTO, o se camina la pared de costado buscando por
       donde sigue, o te soltas con USAR—. Solo te soltas SOLO cuando ya no hay
       pared debajo, o sea cuando llegaste al fondo de verdad. */
    if (A.absY <= hs + .12){
      A.absY = hs;
      A.absV = 0;
      const sigueLaPared = H(px + u.x * 9, pz + u.z * 9) < A.absY - 3;
      if (!sigueLaPared){
        ojoY = hs; aireY = 0; aireV = 0; enAire = false;
        A.suelta();
        return;
      }
    }
    /* colgado, el ojo va a la altura de la cuerda; ojoY es la base y OJO se suma */
    ojoY = A.absY - OJO + 1.55;
    aireY = 0; aireV = 0; enAire = false;
    yaw = A.hd;
    pvx = 0; pvz = 0;
    bobF += dt * (1.4 + A.vel * .35);
    /* la cuerda viva, del clavo a las manos */
    {
      const ax = anc.x - u.x * .5, ay = anc.y + .5, az = anc.z - u.z * .5;
      const bx = px, by = A.absY + 1.2, bz = pz;
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const lar = Math.max(.2, Math.hypot(dx, dy, dz));
      viva.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      viva.scale.y = lar;
      /* orientada por el eje: quaternion del +Y al rumbo de la cuerda */
      viva.quaternion.setFromUnitVectors(V_ARR, V_TMP.set(dx, dy, dz).normalize());
    }
    stats.t += dt;
  };
  A.aviso = acc => {
    if (A.modo) return enRepisa() ? tx('baja') : tx('va');
    if (acc && acc.tipo === 'rapel') return tx('toma');
    return '';
  };
"""

RAZON = """   EL RAPEL DEL CAÑON. Este mundo es una garganta de 52 m de hondo con paredes
   en terrazas, y sus paredes eran decorado: se veian y no se tocaban. Ya se
   habia arreglado que se pudiera SUBIR por un corredor de escalera; el rapel es
   la otra mitad, y la que convierte la pared en camino.

   HAY TRES CLAVOS CON CUERDA, en el borde, y el borde se BUSCA: se barre el mapa
   en casillas de 14 m midiendo cuanto cae el terreno en 18 m hacia el vacio —el
   rumbo del vacio sale del gradiente del propio eje del cañon, `.78x + .62z`, sin
   buscarlo— y donde cae mas de 15 m hay pared. Se piden tres cosas mas: que
   arriba haya repisa donde pararse, que esten a menos de 230 m de un punto del
   guion (que es por donde el jugador pasa) y separados 150 m entre si.

   LA MISMA PALANCA BAJA Y SUBE, y ahi esta el punto. Adelante suelta cuerda y
   bajas a 9,5 m/s; atras trepas con el puño a 2,4, lento como en la vida. Los
   costados CAMINAN LA PARED, que es lo que deja elegir por donde bajar y buscar
   la repisa que sirve en vez de bajar por un tubo. Y SALTO es la patada a la
   roca: te separas dos metros y ganas caida, que es como se baja de verdad una
   pared larga —a saltos— y lo que hace que el rapel no sea un ascensor.

   LO QUE HUBO QUE RESOLVER. Las terrazas entran y salen, asi que un radio fijo
   desde el clavo te metia dentro de la roca cada seis metros: en vez de eso se
   empuja hacia el vacio hasta que debajo haya aire. Y al llegar abajo te soltas
   SOLO: quedarse colgado a diez centimetros del suelo esperando un boton no es
   una mecanica."""

ok = aplica('mundos/canon.html', 'RAPEL', 'rapel',
            'EL RAPEL: EL TRASLADO PROPIO DEL CAÑON', RAZON, TT, CUERPO,
            ('40,22,14', '230,180,130', '#f7e6d0'))
sys.exit(0 if ok else 1)
