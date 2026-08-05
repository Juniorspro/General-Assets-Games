#!/usr/bin/env python3
"""JUNGLA: LAS LIANAS."""
import sys
sys.path.insert(0, '/home/user/mundos/scratchpad/mundos/traslado')
from nucleo import aplica

TT = """{
    es: { toma: 'LIANA · ◉ USAR para colgarte',
          va:   'PALANCA adelante para BOMBEAR el vaivén · SALTO se suelta',
          vuela:'volando · PALANCA para corregir',
          baja: '◉ USAR para bajarte' },
    en: { toma: 'VINE · ◉ USE to grab',
          va:   'PUSH STICK to PUMP the swing · JUMP to let go',
          vuela:'flying · STICK to steer',
          baja: '◉ USE to drop off' },
    pt: { toma: 'LIANA · ◉ USAR para pendurar',
          va:   'ALAVANCA adiante para BOMBEAR o balanço · SALTO solta',
          vuela:'voando · ALAVANCA para corrigir',
          baja: '◉ USAR para descer' }
  }"""

CUERPO = r"""
  const RTOMA = 9;
  const LAR = 26;          /* largo de la liana */
  const PUMP = 1.15;       /* cuanta energia mete bombear */
  const ROCE = .1;         /* lo que se pierde por vuelta si no bombeas */
  const T_APEX = .2;       /* |w| por debajo de esto es el punto alto */
  const TH_MAX = 1.25;     /* 72 grados: hasta ahi llega un vaiven de verdad */
  /* EL ALCANCE de un vaiven: de un extremo al otro son 2·L·sen(th). De aca sale
     cada 25 m que se separan las lianas, y no de un numero a ojo: con 24 m —lo
     primero que se probo— llegabas a la liana siguiente EN SU PUNTO MAS BAJO y
     con velocidad cero, o sea que quedabas colgado sin balanceo y la cadena se
     cortaba. Hay que llegar a la siguiente en SU extremo, para seguir. */
  const ALC = 2 * LAR * Math.sin(TH_MAX);

  /* ------------------------- donde estan las lianas ------------------------ */
  /* CRUZANDO LAS QUEBRADAS, que es el unico sitio del mundo donde hacen falta.
     Las quebradas de JUNGLA tienen 26 m de hondo y casi noventa de borde a
     borde: a pie hay que bajar al fondo y volver a subir, y ya se sabia (el
     mundo tiene un CORREDOR SECO tallado a mano justo para que se pudiera).
     La liana cruza por arriba.

     LOS BORDES SE BUSCAN: desde un punto del eje de la quebrada se sale
     perpendicular a los dos lados y se para donde el terreno deja de subir. Eso
     da el ancho REAL del cruce, y de ahi salen las lianas: una cada 24 m, para
     que un vaiven alcance de una a la otra. */
  {
    const q = QUEBRADA[0];
    for (const ip of [1, 3]){
      const a = q.pts[ip - 1], b = q.pts[ip];
      const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
      const tx2 = b[0] - a[0], tz2 = b[1] - a[1];
      const tl = Math.hypot(tx2, tz2) || 1;
      const nx0 = -tz2 / tl, nz0 = tx2 / tl;           /* perpendicular al eje */
      const borde = s => {
        let mej = -1e9, bx = cx, bz = cz;
        for (let r = 10; r <= 74; r += 3){
          const x = cx + nx0 * s * r, z = cz + nz0 * s * r;
          const h = H(x, z);
          if (h > mej){ mej = h; bx = x; bz = z; }
        }
        return { x: bx, z: bz, y: mej };
      };
      const A1 = borde(1), B1 = borde(-1);
      const anc = Math.hypot(B1.x - A1.x, B1.z - A1.z);
      if (anc < 30) continue;
      const ux = (B1.x - A1.x) / anc, uz = (B1.z - A1.z) / anc;
      const alto = Math.max(A1.y, B1.y) + 15;
      /* la primera a medio alcance del borde: asi su extremo cae JUSTO en el
         borde y se puede agarrar de pie. Las demas, un alcance mas alla cada una. */
      const n = Math.max(1, Math.round((anc - ALC / 2) / ALC) + 1);
      const grupo = [];
      for (let k = 0; k < n; k++){
        const d = ALC / 2 + k * ALC;
        const P = { x: A1.x + ux * d, z: A1.z + uz * d,
          ay: alto, dx: ux, dz: uz, lib: true, k, grupo,
          /* de donde se agarra a pie: el extremo de atras de su propio vaiven.
             Solo la primera cae en tierra firme; a las otras se llega colgado,
             que es lo que hace que cruzar sea una secuencia y no un boton. */
          gx: A1.x + ux * (d - ALC / 2), gz: A1.z + uz * (d - ALC / 2) };
        grupo.push(P);
        A.PUE.push(P);
      }
    }
  }

  /* -------------------------------- lo que se ve --------------------------- */
  const mLia = new T.MeshLambertMaterial({ color: 0x4e6b34 });
  const mRam = new T.MeshLambertMaterial({ map: TX.oscuro, color: 0x53422c });
  for (const P of A.PUE){
    /* la RAMA de la que cuelga: sin ella la liana sale de la nada */
    const ram = new T.Mesh(new T.CylinderGeometry(.3, .42, 9, 6), mRam);
    ram.rotation.z = Math.PI / 2;
    ram.rotation.y = Math.atan2(P.dx, P.dz) + Math.PI / 2;
    ram.position.set(P.x, P.ay + .5, P.z);
    ram.castShadow = true;
    scene.add(ram);
    /* la LIANA en reposo, colgando derecha. Cuando te colgas, es esta misma la
       que se inclina: no hay dos lianas, hay una. */
    const li = new T.Mesh(new T.CylinderGeometry(.11, .13, LAR, 5), mLia);
    li.position.set(P.x, P.ay - LAR / 2, P.z);
    li.castShadow = true;
    scene.add(li);
    P.malla = li;
    /* un nudo abajo, que es lo que se agarra y lo que se ve de lejos */
    const nu = new T.Mesh(new T.SphereGeometry(.34, 6, 5), mLia);
    nu.position.set(P.x, P.ay - LAR, P.z);
    scene.add(nu);
    P.nudo = nu;
  }

  /* ----------------------------- lo que se hace ---------------------------- */
  let col = null;            /* la liana de la que estas colgado */
  const V_EJE = new T.Vector3();
  let th = 0, w = 0;         /* angulo desde la vertical y su velocidad */
  let vx = 0, vz = 0;        /* volando: la velocidad que dejo el vaiven */
  /* HACIA DONDE VA ESTE VAIVEN. Sin esto, agarrarse en el extremo —que es como
     se agarra siempre: desde el borde— contaba como "punto alto" en el primer
     cuadro y te soltaba antes de balancearte una vez (medido: montabas y ya
     estabas volando). El punto alto que cuenta es el de ADELANTE. */
  let dirSw = 1;
  function pone(P, ang){
    col = P; A.act = P;
    th = ang; w = 0;
    dirSw = ang < 0 ? 1 : -1;
    px = P.x + P.dx * Math.sin(th) * LAR;
    pz = P.z + P.dz * Math.sin(th) * LAR;
    A.absY = P.ay - Math.cos(th) * LAR;
    A.hd = Math.atan2(-P.dx, -P.dz);
  }
  A.accion = () => {
    if (A.modo === 'liana') return { suelta: true };
    if (A.modo === 'vuela') return null;
    for (const P of A.PUE)
      if (P.lib && Math.hypot(px - P.gx, pz - P.gz) < RTOMA) return { P };
    return null;
  };
  A.usar = c => {
    if (c.suelta){ A.libera(); return; }
    const P = c.P;
    A.modo = 'liana';
    /* el angulo de arranque es el que pone el nudo DONDE ESTAS: te colgas de la
       liana desde el borde, no aparecés en el medio del vacio */
    const d = ((px - P.x) * P.dx + (pz - P.z) * P.dz) / LAR;
    pone(P, Math.asin(cl(d, -.92, .92)));
    A.vel = 0;
    yaw = A.hd; pitch = -.12;
    aireY = 0; aireV = 0; enAire = false;
  };
  /* SALTO se SUELTA: sale volando con la velocidad del vaiven, que es todo el
     punto —cuanto mejor bombeaste, mas lejos llegas—. */
  A.salta = () => {
    if (A.modo === 'liana') A.libera();
  };
  A.libera = () => {
    if (A.modo !== 'liana' || !col) return;
    /* la velocidad tangente del pendulo, descompuesta en horizontal y vertical */
    const vt = w * LAR;
    vx = col.dx * vt * Math.cos(th);
    vz = col.dz * vt * Math.cos(th);
    A.absV = vt * Math.sin(th) * -1 + 2.2;    /* un pelo de impulso al soltarse */
    col.malla.rotation.set(0, 0, 0);
    col.malla.position.set(col.x, col.ay - LAR / 2, col.z);
    col.nudo.position.set(col.x, col.ay - LAR, col.z);
    col = null;
    A.modo = 'vuela';
    A.nVuelo++;
  };
  A.suelta = () => {
    if (col){ col.malla.rotation.set(0, 0, 0);
      col.malla.position.set(col.x, col.ay - LAR / 2, col.z);
      col.nudo.position.set(col.x, col.ay - LAR, col.z); }
    col = null; A.modo = null; A.vel = 0;
    vx = 0; vz = 0;
    ojoY = H(px, pz);
    aireY = 0; aireV = 0; enAire = false;
    pvx = 0; pvz = 0;
  };

  A.paso = dt => {
    A.nPaso++; A.tSim += dt;
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    if (A.modo === 'liana'){
      if (!col){ A.suelta(); return; }
      /* EL PENDULO. w' = -(g/L)·sin(th), que es el pendulo de siempre; el roce se
         lo come de a poco y BOMBEAR se lo devuelve. Bombear es empujar con las
         piernas en el momento justo: se hace metiendo energia en el sentido en el
         que ya vas, asi que hay que apretar bajando y no subiendo. */
      w += -(GRAV / LAR) * Math.sin(th) * dt;
      /* BOMBEAR SOLO BAJANDO. Es lo que se hace de verdad —se empuja con las
         piernas en el descenso— y ademas es lo unico estable: sumando energia
         siempre, la primera version del pendulo se disparaba a 267 m/s (medido).
         `w·th < 0` es exactamente "el angulo esta volviendo a la vertical". */
      if (my < -.1 && w * th < 0) w += Math.sign(w) * PUMP * dt * (-my);
      w -= w * ROCE * dt;
      /* Y EL TECHO ES DE ENERGIA, no un numero: w no puede pasar de lo que hace
         falta para llegar a TH_MAX. Sale de igualar energias, w² =
         2·(g/L)·(cos th − cos th_max), asi que el tope vale en cualquier angulo. */
      {
        const wm = Math.sqrt(Math.max(0, 2 * (GRAV / LAR) * (Math.cos(th) - Math.cos(TH_MAX))));
        w = cl(w, -wm - 1e-6, wm + 1e-6);
      }
      th += w * dt;
      stats.dist += Math.abs(w * LAR * dt);
      px = col.x + col.dx * Math.sin(th) * LAR;
      pz = col.z + col.dz * Math.sin(th) * LAR;
      A.absY = col.ay - Math.cos(th) * LAR;
      A.vel = Math.abs(w * LAR);
      /* EN EL PUNTO ALTO se pasa a la liana siguiente, si hay: es como se cruza
         de verdad una quebrada de noventa metros, saltando de una a otra en el
         momento en que el vaiven se detiene. Si no hay siguiente, te suelta y
         salis volando al borde de enfrente. */
      if (Math.abs(w) < T_APEX && Math.abs(th) > .55 && Math.sign(th) === dirSw){
        const sig = col.grupo[col.k + (th > 0 ? 1 : -1)];
        if (sig){
          const d = ((px - sig.x) * sig.dx + (pz - sig.z) * sig.dz) / LAR;
          if (Math.abs(d) < .995) pone(sig, Math.asin(cl(d, -.995, .995)));
          else A.libera();
        } else A.libera();
      }
      /* la liana se inclina con vos: es la misma malla, girada desde la rama */
      if (col){
        /* LA LIANA SE VE. El ojo esta en el nudo, asi que la liana salia
           exactamente del centro de la camara hacia arriba y no entraba en cuadro:
           te balanceabas colgado de nada. Se corre medio metro HACIA ADELANTE, que
           es donde de verdad estarian las manos, y ahi cruza la pantalla. */
        const ex = col.dx * Math.sin(th), ez = col.dz * Math.sin(th);
        col.malla.position.set(col.x + ex * LAR / 2 + col.dx * .26,
          col.ay - Math.cos(th) * LAR / 2, col.z + ez * LAR / 2 + col.dz * .26);
        col.malla.rotation.set(0, 0, 0);
        col.malla.rotateOnAxis(V_EJE.set(-col.dz, 0, col.dx).normalize(), -th);
        col.nudo.position.set(px + col.dx * .52, A.absY + .1, pz + col.dz * .52);
      }
      ojoY = A.absY - OJO + 1.3;
      aireY = 0; aireV = 0; enAire = false;
      yaw = A.hd;
      pvx = 0; pvz = 0;
      bobF += dt * (1.2 + A.vel * .2);
      stats.t += dt;
      return;
    }
    /* -------------------------- volando ----------------------------------- */
    /* la caida la lleva el modulo y no `fisica`, porque `fisica` no tiene
       velocidad horizontal en el aire: te dejaria caer en vertical y el premio
       de haber bombeado bien —cruzar— se perderia. */
    A.absV -= GRAV * dt;
    A.absY += A.absV * dt;
    /* algo de correccion en el aire: no vuela, endereza */
    vx += (Math.cos(A.hd) * mx * 5 - vx * .12) * dt;
    vz += (-Math.sin(A.hd) * mx * 5 - vz * .12) * dt;
    let nx = cl(px + vx * dt, -MITAD + 6, MITAD - 6);
    let nz = cl(pz + vz * dt, -MITAD + 6, MITAD - 6);
    stats.dist += Math.hypot(nx - px, nz - pz);
    px = nx; pz = nz;
    A.vel = Math.hypot(vx, vz);
    /* ¿otra liana al paso? Se agarra sola: pasar a diez metros de un nudo y no
       poder engancharlo, cuando ya venias volando hacia el, seria una trampa. */
    for (const P of A.PUE){
      if (Math.abs(A.absY - (P.ay - LAR)) > 7) continue;
      if (Math.hypot(px - P.x, pz - P.z) > LAR * .93) continue;
      if (Math.hypot(px - P.x, pz - P.z) < 3) continue;
      const d = ((px - P.x) * P.dx + (pz - P.z) * P.dz) / LAR;
      if (Math.abs(d) < .93 && A.absV < 1){
        A.modo = 'liana';
        pone(P, Math.asin(d));
        w = (vx * P.dx + vz * P.dz) / LAR / Math.max(.2, Math.cos(th));
        yaw = A.hd;
        return;
      }
    }
    const hs = H(px, pz);
    if (A.absY <= hs){
      A.absY = hs;
      ojoY = hs;
      A.suelta();
      return;
    }
    ojoY = A.absY - OJO + 1.7;
    aireY = 0; aireV = 0; enAire = false;
    pvx = vx; pvz = vz;
    stats.t += dt;
  };
  A.aviso = acc => {
    if (A.modo === 'liana') return tx('va');
    if (A.modo === 'vuela') return tx('vuela');
    if (acc && acc.tipo === 'liana') return tx('toma');
    return '';
  };
"""

RAZON = """   LAS LIANAS DE LA JUNGLA. Las quebradas de este mundo tienen 26 m de hondo y
   casi noventa de borde a borde. A pie hay que bajar al fondo y volver a subir —y
   ya se sabia: el mundo tiene un CORREDOR SECO tallado a mano justo para que se
   pudiera llegar caminando—. La liana cruza por arriba, y cruza como se cruza de
   verdad: saltando de una a la otra.

   LOS BORDES SE BUSCAN. Desde un punto del eje de la quebrada se sale
   perpendicular a los dos lados y se para donde el terreno deja de subir: eso da
   el ancho REAL del cruce. Se cuelga una liana cada 24 m, para que un vaiven
   alcance de una a la siguiente, y la primera se agarra desde el borde y no
   desde el aire.

   ES UN PENDULO DE VERDAD: w' = -(g/L)·sen(th). El roce se lo come de a poco y
   BOMBEAR se lo devuelve, y bombear es lo que es —empujar con las piernas en el
   momento justo—, o sea meter energia en el sentido en el que ya vas: hay que
   apretar BAJANDO y no subiendo. Si bombeaste bien, en el punto alto pasas a la
   liana siguiente; si no, te quedas hamacandote en el medio de la quebrada.

   VOLAR LO LLEVA EL MODULO Y NO `fisica`, y esto no es un detalle: `fisica` no
   tiene velocidad horizontal en el aire —cada cuadro saca pvx/pvz de la palanca—,
   asi que al soltarte caerias en VERTICAL y el premio de haber bombeado bien
   (cruzar) se perderia entero. Volando, el modulo integra la parabola con la
   velocidad tangente que dejo el vaiven, deja corregir un poco con la palanca, y
   engancha sola cualquier liana que pase al alcance: venir volando hacia un nudo,
   pasarle a diez metros y no poder agarrarlo seria una trampa."""

ok = aplica('mundos/jungla.html', 'LIANA', 'liana',
            'LAS LIANAS: EL TRASLADO PROPIO DE LA JUNGLA', RAZON, TT, CUERPO,
            ('12,26,12', '160,220,140', '#e2f4d8'))
sys.exit(0 if ok else 1)
