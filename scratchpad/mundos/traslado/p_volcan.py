#!/usr/bin/env python3
"""VOLCAN: LAS PLACAS DE CORTEZA."""
import sys
sys.path.insert(0, '/home/user/mundos/scratchpad/mundos/traslado')
from nucleo import aplica

TT = """{
    es: { toma: 'PASO DE CORTEZA · ◉ USAR para cruzar la colada',
          va:   'la placa que pisás SE HUNDE · no te pares · SALTO salta a la siguiente',
          baja: '◉ USAR para volver a la orilla' },
    en: { toma: 'CRUST CROSSING · ◉ USE to cross the lava flow',
          va:   'the slab you stand on SINKS · keep moving · JUMP to the next one',
          baja: '◉ USE to step back ashore' },
    pt: { toma: 'PASSAGEM DE CROSTA · ◉ USAR para cruzar a lava',
          va:   'a placa que pisas AFUNDA · não pares · SALTO salta para a próxima',
          baja: '◉ USAR para voltar à margem' }
  }"""

CUERPO = r"""
  const RTOMA = 8;
  const V_PIE = 5.4;        /* encima de la corteza no se corre: se pisa */
  const HUNDE = 1;          /* m/s que baja la placa con tu peso encima */
  const SUBE = .34;         /* m/s que vuelve a subir sin nadie */
  const FONDO = -2.6;       /* pasado esto la placa se hundio y te quema */
  /* LAS PLACAS SE SOLAPAN, y es a proposito. Discos de 3,6 m cada 7,3 m se
     tocaban en un punto: quedaban huecos de diez centimetros entre placa y placa
     y caminando a 5,4 m/s con cuadros de 27 cm te caias ahi (medido: el cruce
     terminaba a los 25 m, "pise lava a 7 m del eje"). Un paso de piedras con
     huecos obligatorios encima de lava, en un telefono y con palanca de dedo, no
     es un desafio: es una loteria. El desafio es EL SUELO QUE SE HUNDE. */
  const R_PLA = 4.2;        /* radio de una placa: se solapan 1,1 m */
  const N_PLA = 8;          /* cuantas placas cruzan la colada */
  const ANCHO = .94;        /* cuanto del ancho del paso ocupan */

  /* --------------------- donde estan los pasos de corteza ------------------ */
  /* UNO POR RIO. Las tres coladas cruzan el mapa de arriba abajo y la huella de
     ceniza las ESQUIVA a proposito: `fueraDeLava` empuja al borde cualquier punto
     de la senda que caiga en un cauce. O sea que los tres rios eran tres paredes,
     y para pasar de un lado al otro habia que rodear el volcan entero.

     El paso se pone en el punto medio de cada rio, atravesado: cinco placas de
     corteza cuajada flotando de orilla a orilla. */
  for (const rio of FLUJOS){
    const i = Math.floor(rio.length * .48);
    const c = rio[i], a = rio[Math.max(0, i - 1)], b = rio[Math.min(rio.length - 1, i + 1)];
    const tx2 = b.x - a.x, tz2 = b.z - a.z, tl = Math.hypot(tx2, tz2) || 1;
    const nx0 = -tz2 / tl, nz0 = tx2 / tl;           /* atravesado al cauce */
    const media = c.w * 1.9 + 7;                     /* de orilla a orilla */
    const P = { x: c.x, z: c.z, nx: nx0, nz: nz0, media,
      hd: Math.atan2(-nx0, -nz0), lib: true,
      /* de donde se entra y adonde se sale: las dos orillas */
      gx: c.x - nx0 * media, gz: c.z - nz0 * media,
      sx: c.x + nx0 * media, sz: c.z + nz0 * media,
      pl: [] };
    /* la cota de la corteza: apenas por debajo de la ceniza de al lado, asi que
       entrar al paso es BAJAR un escalon y se ve que es otro suelo */
    const cota = conoAltura(c.x, c.z) - .7;
    /* LAS PLACAS TIENEN QUE SOLAPAR LA ORILLA. Con 5 placas al 86% del ancho
       quedaba un pasillo de cuarenta centimetros entre donde termina la ceniza
       y donde empieza la primera placa: caminando a 5,4 m/s con cuadros de 27 cm
       se caia ahi y el cruce terminaba en el metro nueve (medido). Ocho placas
       al 94% dejan poco mas de un metro entre placa y placa —un salto corto— y
       la primera y la ultima se meten en la ceniza. */
    for (let k = 0; k < N_PLA; k++){
      const t = (k + .5) / N_PLA * 2 - 1;           /* de -1 a 1 */
      const x = c.x + nx0 * t * media * ANCHO, z = c.z + nz0 * t * media * ANCHO;
      P.pl.push({ x, z, y0: cota, y: cota, carga: false });
    }
    A.PUE.push(P);
  }

  /* -------------------------------- lo que se ve --------------------------- */
  const mCor = new T.MeshLambertMaterial({ map: TX.roca, color: 0x2b2724 });
  for (const P of A.PUE){
    for (const p of P.pl){
      /* la placa: un disco de corteza negra, irregular y con el canto al rojo */
      p.malla = new T.Mesh(new T.CylinderGeometry(R_PLA, R_PLA * .82, .55, 7), mCor);
      p.malla.position.set(p.x, p.y - .27, p.z);
      p.malla.rotation.y = p.x * .37;
      p.malla.castShadow = p.malla.receiveShadow = true;
      scene.add(p.malla);
    }
    /* dos mojones de basalto, uno en cada orilla: es lo que dice de lejos que
       por aca se cruza, porque las placas se ven recien encima */
    for (const [mx2, mz2] of [[P.gx, P.gz], [P.sx, P.sz]]){
      const g = [];
      for (let k = 0; k < 4; k++){
        const b2 = new T.BoxGeometry(.5 - k * .08, 1.1, .5 - k * .08);
        b2.translate(mx2, conoAltura(mx2, mz2) + .5 + k * 1.0, mz2);
        g.push(b2);
      }
      const mo = new T.Mesh(fusiona(g), mCor);
      mo.castShadow = true;
      scene.add(mo);
    }
  }

  /* ----------------------------- lo que se hace ---------------------------- */
  let paso = null;
  function placaBajo(x, z){
    if (!paso) return null;
    for (const p of paso.pl) if (Math.hypot(x - p.x, z - p.z) < R_PLA) return p;
    return null;
  }
  A.accion = () => {
    if (A.modo) return { baja: true };
    for (const P of A.PUE){
      if (!P.lib) continue;
      if (Math.hypot(px - P.gx, pz - P.gz) < RTOMA) return { P, lado: 1 };
      if (Math.hypot(px - P.sx, pz - P.sz) < RTOMA) return { P, lado: -1 };
    }
    return null;
  };
  A.usar = c => {
    if (c.baja){ A.suelta(); return; }
    paso = c.P; A.act = c.P;
    A.modo = 'placas';
    A.lado = c.lado;
    A.hd = c.lado > 0 ? paso.hd : paso.hd + Math.PI;
    yaw = A.hd;
    px = paso.x - paso.nx * paso.media * c.lado;
    pz = paso.z - paso.nz * paso.media * c.lado;
    for (const p of paso.pl){ p.y = p.y0; p.carga = false; }
    A.vel = 0;
    A.absY = H(px, pz); A.absV = 0;
    aireY = 0; aireV = 0; enAire = false;
  };
  /* POR QUE se salio del paso: se guarda para poder mirarlo desde una prueba.
     Un cruce que termina solo y no dice donde ni por que no se puede ajustar. */
  A.suelta = (quema, porque) => {
    if (!A.modo) return;
    A.porque = (porque || (quema ? 'quema' : 'orilla')) +
      ' en (' + px.toFixed(0) + ',' + pz.toFixed(0) + ') a ' +
      (paso ? Math.hypot(px - paso.x, pz - paso.z).toFixed(0) : '?') + ' m del eje';
    const P = paso;
    A.modo = null; A.vel = 0; paso = null;
    /* si te quemaste, volves a la orilla de la que salias: cruzar de nuevo es el
       castigo, y es todo el castigo. Nada de pantallas de muerte. */
    if (quema && P){
      px = P.x - P.nx * P.media * A.lado;
      pz = P.z - P.nz * P.media * A.lado;
      if (typeof medidor === 'function'){ try { medidor(true, '♨'); } catch (e){} }
    }
    ojoY = H(px, pz);
    aireY = 0; aireV = 0; enAire = false;
    pvx = 0; pvz = 0;
  };
  /* SALTO es el salto de placa a placa, y es la mecanica entera: la placa que
     pisas se hunde, asi que quedarse quieto es hundirse. */
  A.salta = () => {
    if (enAire) return;
    enAire = true; A.absV = 8.4; A.nVuelo++;
  };

  A.paso = dt => {
    A.nPaso++; A.tSim += dt;
    if (!paso){ A.suelta(); return; }
    yaw -= keyL.x * 2.2 * dt;
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    /* se camina como siempre —encima de la corteza no se corre— y la camara
       manda el rumbo, igual que a pie: acá el traslado no es la velocidad, es el
       suelo, que se mueve solo. */
    const sy = Math.sin(yaw), cy = Math.cos(yaw);
    const vx2 = (-sy * -my + cy * mx) * V_PIE;
    const vz2 = (-cy * -my - sy * mx) * V_PIE;
    A.hd = yaw;
    let nx = cl(px + vx2 * dt, -MITAD + 6, MITAD - 6);
    let nz = cl(pz + vz2 * dt, -MITAD + 6, MITAD - 6);
    stats.dist += Math.hypot(nx - px, nz - pz);
    px = nx; pz = nz;
    A.vel = Math.hypot(vx2, vz2);
    /* LAS PLACAS. La que tenés encima baja mientras la pisás; las demás vuelven
       a flotar. La que se hunde no vuelve a ser suelo, y no hay marcha atrás:
       eso es lo que hace que el paso tenga UNA sola oportunidad por cruce y que
       haya que ir eligiendo por dónde. */
    const enc = placaBajo(px, pz);
    for (const p of paso.pl){
      p.carga = (p === enc) && !enAire;
      if (p.carga) p.y -= HUNDE * dt;
      else if (p.y < p.y0) p.y = Math.min(p.y0, p.y + SUBE * dt);
      p.malla.position.y = p.y - .27;
      /* la que se hunde se pone al rojo: la corteza se raja y se ve la lava */
      const f = cl((p.y0 - p.y) / -FONDO, 0, 1);   /* 0 = flota, 1 = se fue */
      p.malla.rotation.x = f * .12 * Math.sin(p.x);
    }
    /* EL SUELO DE ESTE CUADRO: la placa si estás encima de una, la ceniza si ya
       estás en la orilla, y NADA si estás sobre la lava. La altura la lleva
       `absY` de punta a punta —y no `aireY`, que es relativo al terreno— porque
       acá el terreno de abajo es el fondo del cauce, seis metros más abajo que la
       corteza: siguiéndolo, la cámara se hundía en la lava estando de pie. */
    const hTerr = H(px, pz);
    /* el margen va en CERO, no en 2: con margen la zona que quema era MAS grande
       que la fila de placas y quedaba un borde mortal donde se veia corteza. */
    const enOrilla = !enLava(px, pz, 0);
    const piso = enc ? enc.y : (enOrilla ? hTerr : null);
    if (enAire){
      A.absV -= GRAV * dt;
      A.absY += A.absV * dt;
      if (A.absY > A.altMax) A.altMax = A.absY;
      if (piso != null && A.absY <= piso){ A.absY = piso; A.absV = 0; enAire = false; }
      else if (piso == null && A.absY < paso.pl[0].y0 - 3.5){ A.suelta(true, 'cai en lava'); return; }
    } else if (piso == null){
      A.suelta(true, 'pise lava');   /* sin placa y sin ceniza */
      return;
    } else {
      A.absY = piso;
    }
    ojoY = A.absY; aireY = 0; aireV = 0;
    /* ¿la placa se hundió con vos encima? */
    if (enc && (enc.y - enc.y0) < FONDO && !enAire){ A.suelta(true, 'se hundio la placa'); return; }
    /* ¿llegaste a la otra orilla? Se sale solo: quedarse en la ceniza esperando
       apretar un botón no es una decisión. */
    const ox = A.lado > 0 ? paso.sx : paso.gx, oz = A.lado > 0 ? paso.sz : paso.gz;
    if (enOrilla && Math.hypot(px - ox, pz - oz) < RTOMA * .8){ A.suelta(false, 'llegue'); return; }
    pvx = vx2; pvz = vz2;
    bobF += dt * (2 + 8 * Math.min(1, A.vel / V_PIE));
    stats.t += dt;
  };
  A.aviso = acc => {
    if (A.modo) return tx('va');
    if (acc && acc.tipo === 'placas') return tx('toma');
    return '';
  };
"""

RAZON = """   LAS PLACAS DE CORTEZA DEL VOLCAN. Este mundo tiene tres rios de lava que bajan
   del crater y cruzan el mapa, y la huella de ceniza los ESQUIVA a proposito:
   `fueraDeLava` empuja al borde cualquier punto de la senda que caiga en un
   cauce. O sea que los tres rios eran tres paredes y para pasar de un lado al
   otro habia que rodear el volcan entero.

   HAY UN PASO POR RIO, atravesado en su punto medio: cinco placas de corteza
   cuajada flotando de orilla a orilla, con un mojon de basalto en cada punta —de
   lejos las placas no se ven, el mojon si—. La cota de la corteza queda apenas
   por debajo de la ceniza de al lado, asi que entrar al paso es BAJAR un escalon
   y se ve que es otro suelo.

   ACA EL TRASLADO NO ES LA VELOCIDAD, ES EL SUELO. Encima de la corteza se
   camina como siempre (5,4 m/s, ni siquiera se corre), pero LA PLACA QUE PISAS
   SE HUNDE: 78 cm por segundo mientras tengas el peso encima, y las otras vuelven
   a flotar a 34. Quedarse quieto es hundirse. Y una placa hundida no vuelve a ser
   suelo del todo a tiempo, asi que el cruce tiene una sola oportunidad y hay que
   ir eligiendo por donde: SALTO salta de una a la otra y es la mecanica entera.

   SI TE QUEMAS, VOLVES A LA ORILLA de la que salias. Cruzar de nuevo es el
   castigo y es todo el castigo: nada de pantallas de muerte. Y al llegar a la
   otra orilla se sale SOLO, porque quedarse parado en la ceniza esperando
   apretar un boton no es una decision."""

ok = aplica('mundos/volcan.html', 'PLACAS', 'placas',
            'LAS PLACAS DE CORTEZA: EL TRASLADO PROPIO DEL VOLCAN', RAZON, TT, CUERPO,
            ('34,14,10', '250,150,90', '#ffe6d2'))
sys.exit(0 if ok else 1)
