/* ============== LA TABLA DE ARENA: EL TRASLADO PROPIO DE DUNAS ==============
   Los mundos se recorrían todos igual: caminar y correr. Acá el paisaje ya
   pedía otra cosa y no se usaba. `crestaDuna` construye dunas TRANSVERSALES de
   verdad: barlovento largo y manso, sotavento corto y filoso. O sea que el mapa
   entero está hecho de toboganes de arena de catorce metros, y hasta ahora se
   subían y se bajaban a pie, a seis metros por segundo, como una pradera.

   QUÉ ES. Hay una tabla plantada en la arena en la bajada más pronunciada de
   cada tramo del guion. Se levanta con USAR. Montado no se camina: manda la
   GRAVEDAD. La tabla se va sola por la línea de máxima pendiente y la palanca
   hace lo que hace una tabla de verdad —apoyar el canto para girar, arriba
   agacharse y correr más, abajo clavar el canto y frenar—. En el filo de la
   cresta DESPEGA sola, y con SALTO se salta antes del filo para volar más.

   POR QUÉ ES DISTINTO Y NO OTRO BOTÓN DE CORRER. A pie el terreno es un
   estorbo: la pendiente te frena y hay un tope pasado el cual no se sube. En la
   tabla el terreno es el motor y la única decisión es POR DÓNDE bajar. Se
   recorre el mismo mundo leyéndolo al revés, que es justo lo que se pedía.

   POR QUÉ NO ROMPE LA HISTORIA. Va cuesta abajo y en una sola dirección: no
   sirve para saltarse un capítulo (se disparan por su POI y en orden) ni para
   salirse del mapa (en cuanto la arena sube, se frena y te bajás). No hay
   controles nuevos: USAR para tomarla y para bajarse, SALTO para saltar, la
   palanca para girar. Y no toca la física de a pie: mientras estás montado
   `fisica` cede el paso, y al bajarte quedás con la altura y el estado de
   siempre, porque la tabla usa los MISMOS `aireY`/`aireV`/`ojoY`.

   DÓNDE SE PLANTAN. No a mano: se BUSCAN. Alrededor del punto medio de cada
   tramo del guion se barre un disco de 70 m y se elige la casilla que más baja
   EN EL RUMBO del tramo. Así la tabla siempre cae en una bajada de verdad y
   siempre te deja más cerca del objetivo, aunque mañana se toque el terreno.
   ========================================================================== */
const TABLA = (() => {
  const A = { modo: null, vel: 0, hd: 0, carve: 0, tSol: 0, sac: 0, act: null, PUE: [],
    nPaso: 0, tSim: 0, nVuelo: 0, altMax: 0, absY: 0, absV: 0 };
  const RTOMA = 7;        /* a esta distancia se levanta la tabla */
  /* GRAV_T: cuánto empuja un metro de pendiente. Con 17 la punta quedaba en
     12,6 m/s y CORRER ya da 11,5: la tabla no se sentía distinta, se sentía
     igual con más pasos. Con 26 y menos roce la punta pasa de 20 m/s, que es
     el doble de correr, y ahí sí el mundo cambia de tamaño. */
  const GRAV_T = 26;
  const GIRO = 1.95;      /* rad/s de giro con el canto a fondo */
  const VMAX = 27;        /* ~97 km/h: más que esto en arena no se cree */
  const V_BAJA = 1.2;     /* por debajo de esto y sin bajada, te bajás solo */
  const E = 1.5;          /* paso para medir la pendiente */
  const TT = {
    es: { toma: 'TABLA DE ARENA · ◉ USAR para subirte',
          va:   'PALANCA para apoyar el canto · ABAJO frena · SALTO salta',
          baja: '◉ USAR para bajarte' },
    en: { toma: 'SANDBOARD · ◉ USE to ride',
          va:   'STICK to carve · PULL BACK to brake · JUMP to launch',
          baja: '◉ USE to step off' },
    pt: { toma: 'PRANCHA DE AREIA · ◉ USAR para subir',
          va:   'ALAVANCA para cravar a borda · ATRÁS freia · SALTO salta',
          baja: '◉ USAR para descer' }
  };
  const tx = k => ((TT[LANG] || TT.en)[k] || '');

  /* ------------------------- dónde se plantan ------------------------------ */
  const TRAMOS = [['inicio', 'mojon'], ['mojon', 'campamento'],
                  ['campamento', 'ruinas'], ['ruinas', 'oasis'], ['oasis', 'cresta']];
  function pendEn(x, z, ux, uz){
    return ((H(x + E, z) - H(x - E, z)) * ux + (H(x, z + E) - H(x, z - E)) * uz) / (2 * E);
  }
  for (const [a, b] of TRAMOS){
    const P1 = POI[a], P2 = POI[b];
    if (!P1 || !P2) continue;
    const dx = P2.x - P1.x, dz = P2.z - P1.z, dl = Math.hypot(dx, dz) || 1;
    const ux = dx / dl, uz = dz / dl;
    const cx = (P1.x + P2.x) / 2, cz = (P1.z + P2.z) / 2;
    /* SE BUSCA EL FILO, NO LA CUESTA. La primera version plantaba la tabla donde
       mas bajaba, o sea ya metida en la cara de sotavento: se arrancaba a media
       bajada, sin caida, y el mundo entero se recorria sin despegar una vez.
       `crestaDuna` tiene un QUIEBRE de verdad en s=0,72 —la pendiente pasa de
       +0,26 a -0,39 en un metro— que es exactamente el borde de avalancha de una
       duna real. Se busca ESE punto: donde la pendiente unos metros mas adelante
       es mucho peor que la de aca. La tabla queda arriba del filo, mirando al
       vacio, y lo primero que pasa al subirse es caerse por el borde. */
    let bx = cx, bz = cz, mej = 0;
    for (let sx = -70; sx <= 70; sx += 6) for (let sz = -70; sz <= 70; sz += 6){
      if (sx * sx + sz * sz > 70 * 70) continue;
      const x = cx + sx, z = cz + sz;
      if (Math.abs(x) > MITAD - 60 || Math.abs(z) > MITAD - 60) continue;
      /* ni encima de un punto del guion (ahí el terreno está allanado) */
      let cerca = false;
      for (const k in POI){ const p = POI[k];
        if (Math.hypot(x - p.x, z - p.z) < (p.pr || 26) + 12) cerca = true; }
      if (cerca) continue;
      const aca = pendEn(x, z, ux, uz);
      const alla = pendEn(x + ux * 7, z + uz * 7, ux, uz);
      if (alla > -.3) continue;                 /* si adelante no baja, no es filo */
      if (aca > .2) continue;                   /* ni tan atras que haya que subir */
      const q = alla - aca;
      if (q < mej){ mej = q; bx = x; bz = z; }
    }
    /* la tabla se planta UNOS METROS MAS ADELANTE del punto medido, o sea ya
       encima del filo: si queda atras, la primera cosa que hace el jugador es
       frenar cuesta arriba y bajarse antes de ver la caida. */
    if (mej < -0.2) A.PUE.push({ x: bx + ux * 4, z: bz + uz * 4,
      hd: Math.atan2(-ux, -uz), lib: true });
  }

  /* ----------------------------- lo que se ve ------------------------------ */
  const matT = new T.MeshLambertMaterial({ map: TX.tela, color: 0xd2653a });
  const matP = new T.MeshLambertMaterial({ map: TX.roca, color: 0xa88a62 });
  /* la tabla: una sola malla, con la punta y la cola levantadas. Es la misma
     geometría para las plantadas y para la que llevás puesta. */
  const GEO = (() => {
    const g = [new T.BoxGeometry(.38, .085, 1.5)];
    const n = new T.BoxGeometry(.36, .08, .34); n.rotateX(-.34); n.translate(0, .055, .88); g.push(n);
    const c = new T.BoxGeometry(.36, .08, .34); c.rotateX(.34); c.translate(0, .055, -.88); g.push(c);
    return fusiona(g);
  })();
  for (const P of A.PUE){
    P.y = H(P.x, P.z);
    const m = new T.Mesh(GEO, matT);
    m.rotation.order = 'YXZ';
    m.position.set(P.x, P.y + .62, P.z);
    m.rotation.set(-1.25, P.hd, .18);      /* clavada de punta, medio enterrada */
    m.castShadow = true;
    scene.add(m);
    P.malla = m;
    /* un mojoncito de piedras al lado: es lo que la hace visible de lejos, y de
       paso dice "esto lo puso alguien" en un mundo donde todo lo puso alguien */
    const gp = [];
    for (let k = 0; k < 8; k++){
      const s = new T.SphereGeometry(rr(.2, .44), 5, 4);
      s.scale(1, .8, 1);
      s.translate(P.x + rr(-.55, .55), P.y + .12 + k * .12, P.z + rr(-.55, .55));
      gp.push(s);
    }
    const mp = new T.Mesh(fusiona(gp), matP);
    mp.castShadow = mp.receiveShadow = true;
    scene.add(mp);
    /* EL BANDERÍN. Una tabla de metro y medio clavada en la arena, vista de lejos,
       es una raya de dos píxeles: se probó y no se encontraba. Un mástil de 2,8 m
       con un trapo del color de la caravana sí se ve desde la cresta anterior, que
       es de donde tenés que decidir si vas a buscarla. */
    const gb = [];
    const mast = new T.CylinderGeometry(.045, .06, 2.8, 5);
    mast.translate(P.x, P.y + 1.4, P.z);
    gb.push(mast);
    const tr = new T.BoxGeometry(.62, .34, .03);
    tr.translate(P.x + .33, P.y + 2.5, P.z);
    gb.push(tr);
    const ban = new T.Mesh(fusiona(gb), matT);
    ban.castShadow = true;
    scene.add(ban);
  }
  /* la tabla montada, debajo del ojo */
  const tab = new T.Mesh(GEO, matT);
  tab.rotation.order = 'YXZ';
  tab.castShadow = true;
  tab.visible = false;
  scene.add(tab);
  /* EL ROCÍO DE ARENA. Con el suelo liso y sin detalle cerca, la velocidad no se
     ve: el paisaje lejano casi no se mueve. La arena que salta del canto es lo
     único que la cuenta, así que no es adorno. */
  const NP = 120;
  const pos = new Float32Array(NP * 3).fill(-9999);
  const PV = new Float32Array(NP * 3), PT = new Float32Array(NP);
  const geoP = new T.BufferGeometry();
  geoP.setAttribute('position', new T.BufferAttribute(pos, 3));
  const matR = new T.PointsMaterial({ color: 0xf2d9ac, size: .34, transparent: true,
    opacity: .82, depthWrite: false });
  const roc = new T.Points(geoP, matR);
  roc.frustumCulled = false;
  roc.visible = false;
  scene.add(roc);

  /* --------------------------- lo que se hace ------------------------------ */
  A.accion = () => {
    if (A.modo) return A.vel < 4.2 ? { baja: true } : null;
    for (const P of A.PUE)
      if (P.lib && Math.hypot(px - P.x, pz - P.z) < RTOMA) return { P };
    return null;
  };
  A.usar = c => {
    if (c.baja){ A.suelta(); return; }
    const P = c.P;
    P.lib = false;
    P.malla.visible = false;
    A.act = P;
    A.modo = 'tabla';
    /* EL EMPUJON DE SALIDA. Nadie se sube a una tabla y espera: se empuja con
       el pie. Sin esto, arriba del filo la tabla arranca en la parte todavia
       llana, no llega al borde y se baja sola antes de caer. */
    A.vel = 8; A.hd = P.hd; A.carve = 0; A.tSol = -1.2; A.sac = 0;
    yaw = P.hd;
    px = P.x; pz = P.z;
    enAire = false; aireY = 0; aireV = 0;
    tab.visible = true; roc.visible = true;
    /* EL SALTO AL VACIO. La tabla se planta arriba del filo, y subirse arriba
       del filo es TIRARSE: si el suelo tres metros adelante esta mas de medio
       metro abajo, se sale ya en el aire. Sin esto el momento que da sentido a
       la mecanica —el borde de avalancha— pasaba sin que se notara. */
    const bx = px - Math.sin(P.hd) * 3, bz = pz - Math.cos(P.hd) * 3;
    if (H(bx, bz) < H(px, pz) - .5) despega(1.8);
  };
  A.suelta = () => {
    if (!A.modo) return;
    A.modo = null; A.vel = 0;
    tab.visible = false; roc.visible = false;
    for (let i = 0; i < NP; i++){ PT[i] = 0; pos[i * 3 + 1] = -9999; }
    geoP.attributes.position.needsUpdate = true;
    /* LA TABLA QUEDA DONDE TE BAJASTE, no vuelve a su sitio: si volviera, el
       mundo te estaría corrigiendo, y encima no habría cómo volver a subir. */
    const P = A.act;
    if (P){
      P.x = cl(px - Math.sin(yaw) * 1.4, -MITAD + 8, MITAD - 8);
      P.z = cl(pz - Math.cos(yaw) * 1.4, -MITAD + 8, MITAD - 8);
      P.y = H(P.x, P.z); P.hd = yaw; P.lib = true;
      P.malla.position.set(P.x, P.y + .62, P.z);
      P.malla.rotation.set(-1.25, P.hd, .18);
      P.malla.visible = true;
    }
    pvx = 0; pvz = 0;
    /* bajarse EN EL AIRE no te pega al suelo de un tirón: se le pasa la caída al
       modelo de a pie tal como venía. Poniendo aireY en 0 aparecías un metro más
       abajo de golpe, y eso se ve. */
    if (enAire){ aireY = Math.max(0, A.absY - H(px, pz)); aireV = A.absV; }
    else { aireY = 0; aireV = 0; }
  };
  /* DESPEGAR: la única puerta al aire, y la que arregla el error de fondo.
     `aireY` es "cuánto estás por encima del suelo", y el suelo se va para abajo
     mientras volás: integrado así, el primer cuadro en el aire ya daba aireY
     negativo —el suelo bajaba más rápido que la gravedad— y aterrizabas al
     instante, o sea que en una duna no se podía volar por definición. Volando se
     lleva la altura ABSOLUTA (absY) y `aireY` sale de restarle el terreno, que
     es lo único que da un salto de verdad por encima de un borde. */
  function despega(vy){
    if (enAire) return;
    enAire = true;
    A.absY = H(px, pz) + aireY;
    A.absV = vy;
    aireV = vy;
    A.nVuelo++;
  }
  /* SALTO montado: el ollie antes del filo. Salta más cuanto más rápido vas,
     que es lo que hace que valga la pena buscar la cresta con velocidad. */
  A.salta = () => { despega(6.4 + Math.min(4.2, A.vel * .23)); };

  A.paso = dt => {
    /* cuadros y TIEMPO SIMULADO del traslado. No es adorno: el navegador sin
       tarjeta corre a tres cuadros por segundo y `dt` viene topado a 0,05, o sea
       que un segundo de reloj son dos decimas de mundo. Sin este contador una
       prueba mide el emulador y no la mecanica. */
    A.nPaso++; A.tSim += dt;
    /* mirar sigue siendo mirar: el pitch con el dedo derecho o con el teclado */
    pitch = cl(pitch - keyL.y * 1.7 * dt, -1.2, 1.2);
    const mx = cl(movV.x + keyV.x, -1, 1), my = cl(movV.y + keyV.y, -1, 1);
    /* una tabla parada no gira: el canto necesita que la nieve —acá la arena—
       corra por debajo. Por eso el giro va con la velocidad. */
    const fv = cl(A.vel / 7, .16, 1);
    A.hd -= mx * GIRO * dt * fv;
    A.carve += (mx - A.carve) * Math.min(1, dt * 6);
    const ux = -Math.sin(A.hd), uz = -Math.cos(A.hd);   /* hacia dónde va */
    const rx = Math.cos(A.hd), rz = -Math.sin(A.hd);    /* su costado derecho */
    const gx = (H(px + E, pz) - H(px - E, pz)) / (2 * E);
    const gz = (H(px, pz + E) - H(px, pz - E)) / (2 * E);
    const dh = gx * ux + gz * uz;    /* pendiente en el rumbo: negativa = bajada */
    const dl = gx * rx + gz * rz;    /* pendiente al costado */
    if (!enAire){
      /* LA LÍNEA DE MÁXIMA PENDIENTE. Sin esto la tabla se maneja como un auto y
         el terreno da igual; con esto la ladera te lleva y hay que corregirla,
         que es lo único que se hace de verdad arriba de una tabla. */
      A.hd += cl(dl, -.55, .55) * 1.6 * dt * fv;
      A.vel += -dh * GRAV_T * dt;
      /* el roce: agacharse (palanca arriba) roza menos, clavar el canto frena
         mucho, y el cuadrado de la velocidad es el aire, que es lo que pone el
         techo sin necesidad de un tope inventado */
      /* el canto de girar roza, pero POCO: con 1,7 girar apagaba la bajada en dos
         segundos y la palanca dejaba de ser una decision para ser un castigo. */
      const fren = Math.max(0, my) * 10 + Math.abs(A.carve) * .85 + (my < 0 ? .22 : .75);
      A.vel -= (fren + A.vel * A.vel * .0042) * dt;
      A.vel = cl(A.vel, 0, VMAX);
      /* DESPEGUE EN EL FILO. No se mira la pendiente sino cómo CAMBIA un poco
         más adelante: eso es un filo, y es lo que en la nieve te tira al aire
         sin que hagas nada. Cuanto más rápido, más lejos se mira. */
      /* la mirada adelante va CORTA a proposito. El filo de una duna es un
         quiebre de la pendiente en un metro, no una curva: si se mira ocho
         metros mas alla, el quiebre queda promediado con la cara lisa que
         viene despues y desaparece justo lo que se buscaba. */
      const ad = 3;
      const cur = pendEn(px + ux * ad, pz + uz * ad, ux, uz) - dh;
      /* en el filo se sale con la velocidad vertical que YA traías: subiendo la
         cara de barlovento vas trepando a dh·vel, y del otro lado del borde no
         hay suelo que te siga. Es el salto que se hace solo. */
      if (A.vel > 5 && cur < -.13) despega(cl(dh * A.vel, 1.1, 11));
    }
    /* avanzar */
    let nx = cl(px + ux * A.vel * dt, -MITAD + 6, MITAD - 6);
    let nz = cl(pz + uz * A.vel * dt, -MITAD + 6, MITAD - 6);
    for (const o of ARB){
      const bx = nx - o[0], bz = nz - o[1], d = Math.hypot(bx, bz), rq = o[2] + .6;
      if (d < rq && d > 1e-4){
        nx = o[0] + bx / d * rq; nz = o[1] + bz / d * rq;
        A.vel *= .4; A.sac = .3;     /* contra una roca se pierde la bajada */
      }
    }
    stats.dist += Math.hypot(nx - px, nz - pz);
    px = nx; pz = nz;
    /* la altura persigue al suelo, como a pie, pero MÁS RÁPIDO: a 25 m/s el
       retraso de a pie se ve como si flotaras un metro por encima de la arena */
    const hs = H(px, pz);
    ojoY = ojoY == null ? hs : ojoY + (hs - ojoY) * Math.min(1, dt * 17);
    if (Math.abs(hs - ojoY) > 3) ojoY = hs;
    if (enAire){
      A.absV -= GRAV * dt;
      A.absY += A.absV * dt;
      aireV = A.absV;
      aireY = A.absY - hs;
      if (aireY <= 0){
        aireY = 0; aireV = 0; enAire = false;
        /* caer torcido cuesta velocidad. Es todo el castigo que hay, y es el que
           enseña a soltar el canto antes de aterrizar. */
        A.vel *= cl(1 - Math.abs(A.carve) * .3, .55, 1) * .94;
        A.sac = .26;
      }
    }
    yaw = A.hd;                       /* la cámara mira a donde va la tabla */
    pvx = ux * A.vel; pvz = uz * A.vel;  /* así el FOV y el siseo reaccionan solos */
    bobF += dt * (2 + 3 * Math.min(1, A.vel / VMAX));
    stats.t += dt;
    A.sac = Math.max(0, A.sac - dt * 2.4);
    if (aireY > A.altMax) A.altMax = aireY;
    /* ¿se terminó la bajada? Te bajás solo: quedarse clavado en un llano
       apretando la palanca no es una decisión, es un cuelgue. */
    /* tSol arranca en -1,2: hay segundo y pico de gracia para llegar al filo
       antes de que el mundo decida que la bajada se termino. */
    if (!enAire && A.vel < V_BAJA && dh > -.02){
      A.tSol += dt;
      if (A.tSol > .6){ A.suelta(); return; }
    } else A.tSol = Math.min(A.tSol, 0);
    /* la tabla debajo del ojo, apoyada en la ladera y volcada por el canto */
    const by = (ojoY != null ? ojoY : hs) + aireY;
    tab.position.set(px + ux * .5, by + .1 - A.sac * .12, pz + uz * .5);
    tab.rotation.set(enAire ? cl(aireV * -.05, -.5, .5) : Math.asin(cl(dh, -.9, .9)),
      A.hd, -A.carve * .4);
    /* el rocío: se emite en el canto, sale hacia atrás y afuera, y cae */
    const em = A.vel > 4 && !enAire;
    for (let i = 0; i < NP; i++){
      const j = i * 3;
      if (PT[i] > 0){
        PT[i] -= dt;
        PV[j + 1] -= 9.5 * dt;
        pos[j] += PV[j] * dt; pos[j + 1] += PV[j + 1] * dt; pos[j + 2] += PV[j + 2] * dt;
        if (PT[i] <= 0) pos[j + 1] = -9999;
      } else if (em && Math.random() < dt * 26){
        PT[i] = .34 + Math.random() * .42;
        const l = (Math.random() - .5) * .55;
        pos[j]     = px + ux * .28 + rx * l;
        pos[j + 1] = by + .05;
        pos[j + 2] = pz + uz * .28 + rz * l;
        const sp = 1.3 + A.vel * .17;
        PV[j]     = -ux * sp * .55 - rx * A.carve * sp * .8;
        PV[j + 1] = 1.5 + Math.random() * 1.9;
        PV[j + 2] = -uz * sp * .55 - rz * A.carve * sp * .8;
      }
    }
    geoP.attributes.position.needsUpdate = true;
  };
  A.aviso = acc => {
    if (A.modo) return A.vel < 4.2 ? tx('baja') : tx('va');
    if (acc && acc.tipo === 'tabla') return tx('toma');
    return '';
  };
  /* para las pruebas sin dibujar */
  A.est = () => ({ modo: A.modo, vel: +A.vel.toFixed(2), aire: enAire,
    nPaso: A.nPaso, tSim: +A.tSim.toFixed(2),
    nVuelo: A.nVuelo, altMax: +A.altMax.toFixed(2),
    hd: +A.hd.toFixed(2), y: +(H(px, pz) + aireY).toFixed(2),
    pue: A.PUE.map(P => ({ x: Math.round(P.x), z: Math.round(P.z), lib: P.lib })) });
  return A;
})();
