/* ══════════════════════════ ARRANQUE Y BUCLE ══════════════════════════ */
function paso(p, txt){
  $('cBar').style.width = (p*100) + '%';
  if (txt) $('cTxt').textContent = txt;
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}
async function construir(primera){
  /* EL ORDEN NO ES CAPRICHOSO Y CAMBIÓ POR LA CUEVA.
     La boca de la cueva es un hueco excavado DENTRO de `H()`, y la malla del
     terreno se construye leyendo `H()`: si se eligiera después, el suelo
     dibujado y el suelo que se camina dirían cosas distintas justo ahí.
     Así que primero se elige dónde acampar —en crudo, que el campamento va en
     el medio y la cueva lejos—, después dónde va la cueva, y recién entonces se
     levanta el terreno. */
  CUEVA = null;
  await paso(0.06, 'Buscando dónde acampar…');
  eligeSitios();
  await paso(0.12, 'Cavando…');
  CUEVA = eligeCueva(CAMPO);
  /* la altura del piso de la cueva se lee con la cueva YA excavada: leerla
     antes daría la del terreno original, que es cinco metros más arriba */
  if (CUEVA) CUEVA.h = H(CUEVA.x, CUEVA.z);
  await paso(0.18, 'Levantando el terreno…');
  armaTerreno();
  await paso(0.30, 'Llenando el mar…');
  armaAgua();
  /* los claros se recalculan con la cueva ya elegida: sin esto crecen árboles
     dentro de la boca */
  CLAROS = SITIOS.map(s2 => ({ x: s2.c.x, z: s2.c.z, r: s2.t === 'campamento' ? 17 : 9 }));
  if (CUEVA) CLAROS.push({ x: CUEVA.x, z: CUEVA.z, r: 15 });
  await paso(0.44, 'Sembrando…');
  const r = sembrar((p, t) => { $('cBar').style.width = (p*100)+'%'; $('cTxt').textContent = t; });
  await paso(0.78, 'Levantando el campamento…');
  armaSitios();
  await paso(0.88, 'Formando nubes…');
  armaNubes();
  if (nubes) nubes.visible = CFG.nubes;
  CFG.sol = 0.42;                      /* se empieza de mañana */
  ponSol(0);
  await paso(1, r.arboles + ' árboles · ' + SITIOS.length + ' sitios');
  return r;
}
async function resembrar(){
  SEM = (Math.random()*1e9)|0;
  $('carga').classList.remove('ido');
  $('carga').style.display = '';
  await paso(0.02, 'Otra isla…');
  const r = await construir(false);
  aviso(r.arboles + ' árboles nuevos');
  setTimeout(() => { $('carga').classList.add('ido');
    setTimeout(() => $('carga').style.display = 'none', 700); }, 260);
}

let ultimo = performance.now(), fps = 0, cuadros = 0, acum = 0, DIB = 0, TRI = 0;
/* CONGELADO: frena la SIMULACIÓN y deja el dibujo.
   Sin esto no se puede fotografiar un instante: entre el paso que pone la
   escena y la captura, el navegador sigue corriendo su propio bucle y la foto
   sale de dos segundos después. Ya pasó tres veces en este proyecto —el
   autobús de RECREO, la abuela de Vecindario y acá el camello de la llave, que
   para cuando se sacaba la foto ya te había alcanzado y estaba a cien metros. */
let CONGELADO = false;
function bucle(){
  requestAnimationFrame(bucle);
  const ahora = performance.now();
  let dt = Math.min((ahora - ultimo)/1000, 0.08);
  ultimo = ahora;
  if (CONGELADO) dt = 0;
  RELOJ.value += dt;

  if (MODO === 'menu') CINE.paso(dt);
  else if (MODO === 'cine') INTRO.paso(dt);
  else if (MODO === 'llave') LLAVE.paso(dt);
  else if (!PAUSA) fisica(dt);
  /* la cinemática de la llave mueve la cámara ella misma con `JUG`, así que
     necesita que `ponCam` corra igual aunque la física no */
  if (MODO === 'llave') ponCam(dt);
  MIS.paso(dt);
  /* la cinemática pone la hora ella misma cuadro a cuadro: si además corriera
     el reloj del día, el atardecer se le adelantaría al guion */
  ponSol(MODO === 'cine' ? 0 : dt);
  if (MODO !== 'cine') pasoCamello(dt);

  /* el cielo viaja con la cámara: si no, se ve el borde de la esfera */
  cielo.position.set(cam.position.x, 0, cam.position.z);

  /* la fogata: late y parpadea. Es la única luz de la noche y por eso conviene
     que se note que está viva. */
  if (fuegoLuz){
    const t = RELOJ.value;
    const p1 = Math.sin(t*11.3) * 0.5 + Math.sin(t*7.1) * 0.3 + Math.sin(t*23.7) * 0.2;
    fuegoLuz.intensity = (7.5 + p1 * 2.6) * FUEGO_K;
    if (fuegoMalla){
      const e = 0.9 + p1 * 0.12;
      fuegoMalla.scale.set(e, 1 + p1*0.16, e);
      fuegoMalla.rotation.y = t * 1.4;
    }
  }

  /* las nubes se corren despacio y se envuelven alrededor del jugador */
  if (nubes && CFG.nubes){
    nubes.position.x += dt * 1.15;
    if (nubes.position.x > 300) nubes.position.x -= 600;
  }
  /* olas: se mueve el plano del agua por vértice */
  if (agua){
    const p = agua.geometry.attributes.position, b = agua.userData.base;
    for (let i = 0; i < p.count; i++){
      const x = b[i*3], z = b[i*3+2];
      p.array[i*3+1] = Math.sin(RELOJ.value*1.1 + x*0.075) * 0.16
                     + Math.cos(RELOJ.value*0.8 + z*0.061) * 0.13;
    }
    p.needsUpdate = true;
    agua.position.set(cam.position.x, MAR, cam.position.z);
  }

  /* ── el doble pase: escena al target chico, target a la pantalla ── */
  ren.setRenderTarget(rt);
  ren.render(escena, cam);
  /* las cuentas se leen ACÁ: después del segundo pase `ren.info` habla del
     triángulo del post-proceso y decía «1 dib, 1 tri», que no es del mundo */
  DIB = ren.info.render.calls; TRI = ren.info.render.triangles;
  ren.setRenderTarget(null);
  ren.render(postEsc, postCam);

  cuadros++; acum += dt;
  if (acum > 0.5){
    fps = Math.round(cuadros/acum); cuadros = 0; acum = 0;
    const w = rt ? rt.width : 0, h = rt ? rt.height : 0;
    const hh = Math.floor(HORA), mm = Math.floor((HORA % 1) * 60);
    $('fps').textContent = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0') +
      ' · ' + fps + ' fps · ' + w + '×' + h + ' · x' + CFG.pix +
      ' · ' + DIB + ' dib · ' + (TRI/1000).toFixed(0) + 'k tri';
  }
}

(async function(){
  medir();
  /* EL IDIOMA SE ELIGE ANTES DE QUE EMPIECE NADA, y la isla se siembra mientras
     tanto: son unos segundos de cuentas que no dependen de qué idioma se elija,
     así que hacerlos esperar sería regalar el único rato en que el jugador tiene
     algo que hacer. Si ya eligió alguna vez, la pantalla ni aparece. */
  for (const b of document.querySelectorAll('#idioma button'))
    b.onclick = () => { ponIdioma(b.getAttribute('data-lang'));
                        document.getElementById('idioma').classList.remove('on');
                        window.__idiomaElegido = true; };
  let yaEligio = false;
  try { yaEligio = !!localStorage.getItem('lemi.idioma'); } catch(e){}
  ponIdioma(IDIOMA);
  if (!yaEligio) document.getElementById('idioma').classList.add('on');
  else window.__idiomaElegido = true;
  addEventListener('resize', () => { clearTimeout(window.__rz);
    window.__rz = setTimeout(medir, 240); });
  armaPanel();
  const r = await construir(true);
  /* el HUD no va en el menú: se prende al entrar al juego */
  CINE.arranca();
  bucle();
  /* de la barra de carga al menú de inicio, con la isla ya viva detrás */
  ISLA_DATOS = { arboles: r.arboles, sitios: SITIOS.length, lado: Math.round(MITAD*2) };
  $('mPie').textContent = TXF('mPie', r.arboles, SITIOS.length, Math.round(MITAD*2));
  CINE.arranca();
  /* y si todavía está eligiendo idioma, el menú espera: dos paneles encimados
     son dos paneles que se tocan sin querer */
  await new Promise(res => {
    const ver = () => { if (window.__idiomaElegido) res(); else setTimeout(ver, 120); };
    ver();
  });
  $('menu').classList.add('on');
  $('carga').classList.add('ido');
  setTimeout(() => $('carga').style.display = 'none', 700);
  /* el gancho que usa `pintaIdioma()` para poner al día lo que ya se está
     viendo. Va colgado de `window` a propósito: esto es un módulo ES, así que
     una `function` declarada arriba NO aparece en `window`, y la tabla de textos
     —que se carga antes— no puede nombrar nada de acá. Es la misma trampa que en
     RECREO dejó `pintarFiltro` sin correr nunca. */
  window.repintaJuego = () => {
    if (ISLA_DATOS) $('mPie').textContent =
      TXF('mPie', ISLA_DATOS.arboles, ISLA_DATOS.sitios, ISLA_DATOS.lado);
    if (typeof MIS !== 'undefined' && MIS.repinta) MIS.repinta();
    const p = $('pista');
    if (p.classList.contains('on') && MIS.cerca)
      p.innerHTML = (document.body.classList.contains('pc') ? '<b>E</b> · ' : '') + TX(MIS.cerca.rot);
  };
  window.__V = { CFG, JUG, escena, ren, T, H, cam,
    /* el idioma, para poder comprobar los tres desde el banco sin recargar */
    idioma: (v) => { if (v) ponIdioma(v); return IDIOMA; },
    /* cambiar el pixelado en vivo. `CFG.pix` sola no hace nada: el destino de
       render se dimensiona en `medir()`, así que sin volver a medir el ajuste
       queda escrito y el cuadro sigue igual. */
    pix: (n) => { if (n) { CFG.pix = n; medir(); } return { pix: CFG.pix, rt: rt ? [rt.width, rt.height] : null }; },
    TX, TXF,
    nan: () => { const malas = [];
      escena.traverse(ob => { const g = ob.geometry; if (!g || !g.attributes.position) return;
        const a = g.attributes.position.array;
        for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])){
          malas.push({ tipo: g.type, nombre: ob.name || ob.type, idx: i, de: a.length }); break; } });
      return malas; },
    entrar: () => { const b = document.getElementById('mJugar'); if (b) b.click(); },
    modo: () => MODO,
    /* LA CINEMÁTICA ES UNA FUNCIÓN DEL TIEMPO, así que se la puede fotografiar
       en cualquier segundo sin esperarlo. Sin esto, comprobar el plano del
       segundo 29 costaba veintinueve segundos por intento. */
    cine: (t) => {
      if (!INTRO.activa) INTRO.arranca();
      INTRO.t = t; INTRO.pon(t);
      /* DÓNDE CAE CADA COSA EN LA PANTALLA, PROYECTADO. «El camello es
         visible» no quiere decir que se vea: puede estar detrás de la cámara o
         fuera del cuadro y `visible` sigue diciendo true. Se proyectan la caja
         del bicho y la fogata a coordenadas de pantalla —0 arriba/izquierda,
         1 abajo/derecha— y además se comprueba que estén DELANTE, porque un
         punto detrás de la cámara proyecta igual, dado vuelta, y cae adentro
         del cuadro: es la trampa que ya costó una medición con el autobús. */
      /* LA INVERSA HAY QUE CALCULARLA A MANO. `updateMatrixWorld()` pone al día
         `matrixWorld`, pero `matrixWorldInverse` —que es la que usa cualquier
         proyección— la recalcula EL RENDERER al dibujar. Midiendo justo después
         de mover la cámara, la sonda proyectaba con la cámara del cuadro
         anterior: decía que el camello estaba dentro del cuadro cuando estaba
         medio metro por encima del borde, y al revés. Es la misma trampa que en
         RECREO hizo que el autobús diera 3.094 % del ancho. */
      cam.updateMatrixWorld(true);
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      const v = new T.Vector3(), caja = new T.Box3();
      const donde = (ob) => {
        if (!ob || !ob.visible) return null;
        caja.setFromObject(ob);
        if (caja.isEmpty()) return null;
        let x0=9, x1=-9, y0=9, y1=-9, delante = true;
        for (let i = 0; i < 8; i++){
          v.set(i&1 ? caja.max.x : caja.min.x,
                i&2 ? caja.max.y : caja.min.y,
                i&4 ? caja.max.z : caja.min.z);
          v.applyMatrix4(cam.matrixWorldInverse);
          if (v.z > -0.05) delante = false;
          v.applyMatrix4(cam.projectionMatrix);
          const sx = v.x*0.5 + 0.5, sy = 0.5 - v.y*0.5;
          x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
          y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
        }
        return { x: [+x0.toFixed(3), +x1.toFixed(3)], y: [+y0.toFixed(3), +y1.toFixed(3)],
                 delante, dentro: delante && x1 > 0 && x0 < 1 && y1 > 0 && y0 < 1,
                 altoPct: +((y1-y0)*100).toFixed(1) };
      };
      return { t, sol: +CFG.sol.toFixed(3), fov: +cam.fov.toFixed(1),
               gente: INTRO.gente.length,
               camello: donde(INTRO.camelloCine),
               fuego: donde(fuegoMalla),
               lemi: donde(INTRO.gente[0]) };
    },
    saltar: () => { INTRO.termina(); return MODO; },
    /* ── las misiones, desde afuera ── */
    mis: () => ({ i: MIS.i, on: MIS.on, ramas: MIS.ramas,
                  tit: MIS.i >= 0 && MIS.i < 5 ? MIS.lista[MIS.i].n : 'fin',
                  cerca: MIS.cerca ? MIS.cerca.tipo : null,
                  antorcha: MIS.antorcha, mini: MINI.on,
                  cosas: COSAS.filter(o => o.activo).map(o => o.tipo) }),
    /* camina hasta la cosa activa que se le pida y la usa */
    irA: (tipo) => {
      const o = COSAS.find(c => c.activo && c.tipo === tipo);
      if (!o) return { no: tipo, activas: COSAS.filter(c=>c.activo).map(c=>c.tipo) };
      JUG.x = o.x + 1.2; JUG.z = o.z + 1.2; JUG.y = H(JUG.x, JUG.z); JUG.vy = 0;
      JUG.yaw = Math.atan2(JUG.x - o.x, JUG.z - o.z);
      return { tipo, x: +o.x.toFixed(1), z: +o.z.toFixed(1) };
    },
    usar: () => MIS.usa(),
    helar: (v) => { CONGELADO = !!v; return CONGELADO; },
    /* cuánto de la pantalla se come lo que cuelga de la cámara. La antorcha y
       las manos viven pegadas al ojo, y ahí «se ve bien» no es una opinión: es
       un porcentaje del cuadro. */
    /* la cinemática de la llave, fotografiable en cualquier instante */
    llave: (t) => {
      if (!LLAVE.on) LLAVE.arranca();
      LLAVE.t = t; LLAVE.paso(0);
      /* Y HAY QUE CORRER `ponCam` A MANO, que es la segunda mitad de la misma
         trampa. `LLAVE.paso` no mueve la cámara: mueve `JUG.pitch`, y quien lo
         copia a `cam.rotation.x` es `ponCam`, que corre en el bucle. Midiendo
         justo después de `paso(0)` se proyectaba con la cámara del instante
         ANTERIOR, así que la sonda contestaba sobre un cuadro que no era el que
         se estaba fotografiando —de ahí que dijera que el camello estaba a la
         vista en el segundo en que se mira el suelo—. */
      ponCam(0);
      /* y el camello se planta donde lo dejó la cinemática, no donde lo dejó el
         último cuadro del bucle */
      pasoCamello(0);
      /* LA INVERSA HAY QUE CALCULARLA A MANO. `updateMatrixWorld()` pone al día
         `matrixWorld`, pero `matrixWorldInverse` —que es la que usa cualquier
         proyección— la recalcula EL RENDERER al dibujar. Midiendo justo después
         de mover la cámara, la sonda proyectaba con la cámara del cuadro
         anterior: decía que el camello estaba dentro del cuadro cuando estaba
         medio metro por encima del borde, y al revés. Es la misma trampa que en
         RECREO hizo que el autobús diera 3.094 % del ancho. */
      cam.updateMatrixWorld(true);
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      const caja = new T.Box3(), v = new T.Vector3();
      const donde = (ob) => {
        if (!ob) return null;
        ob.updateMatrixWorld(true);
        caja.setFromObject(ob);
        if (caja.isEmpty()) return null;
        let x0=9,x1=-9,y0=9,y1=-9, delante = true;
        for (let i = 0; i < 8; i++){
          v.set(i&1?caja.max.x:caja.min.x, i&2?caja.max.y:caja.min.y, i&4?caja.max.z:caja.min.z);
          v.applyMatrix4(cam.matrixWorldInverse);
          /* EN EL ESPACIO DE LA CÁMARA, LO QUE SE VE TIENE z NEGATIVA. Sin esta
             comprobación un objeto que está a la espalda proyecta igual —dado
             vuelta— y la sonda contesta «entra en el cuadro» sobre algo que el
             recorte del frustum ni siquiera dibuja. */
          if (v.z > -0.05) delante = false;
          v.applyMatrix4(cam.projectionMatrix);
          const sx=v.x*0.5+0.5, sy=0.5-v.y*0.5;
          x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy);
        }
        return { x:[+x0.toFixed(2),+x1.toFixed(2)], y:[+y0.toFixed(2),+y1.toFixed(2)], delante };
      };
      const dc = CAM3 ? Math.hypot(cam.position.x - BICHO.x, cam.position.z - BICHO.z) : null;
      return { t, pitch:+JUG.pitch.toFixed(2), camRotX:+cam.rotation.x.toFixed(2),
               manos: LLAVE.manos ? donde(LLAVE.manos) : null,
               camello: CAM3 ? donde(CAM3) : null,
               camVis: CAM3 ? CAM3.visible : null, modoB: BICHO.modo,
               dist: dc === null ? null : +dc.toFixed(1),
               llaveVis: LLAVE.manos ? LLAVE.manos.userData.llave.visible : null };
    },
    enMano: () => {
      const o = MIS.antorchaMalla; if (!o) return null;
      /* LA INVERSA HAY QUE CALCULARLA A MANO. `updateMatrixWorld()` pone al día
         `matrixWorld`, pero `matrixWorldInverse` —que es la que usa cualquier
         proyección— la recalcula EL RENDERER al dibujar. Midiendo justo después
         de mover la cámara, la sonda proyectaba con la cámara del cuadro
         anterior: decía que el camello estaba dentro del cuadro cuando estaba
         medio metro por encima del borde, y al revés. Es la misma trampa que en
         RECREO hizo que el autobús diera 3.094 % del ancho. */
      cam.updateMatrixWorld(true);
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert(); o.updateMatrixWorld(true);
      const caja = new T.Box3().setFromObject(o), v = new T.Vector3();
      let x0=9,x1=-9,y0=9,y1=-9;
      for (let i = 0; i < 8; i++){
        v.set(i&1?caja.max.x:caja.min.x, i&2?caja.max.y:caja.min.y, i&4?caja.max.z:caja.min.z);
        v.applyMatrix4(cam.matrixWorldInverse).applyMatrix4(cam.projectionMatrix);
        const sx=v.x*0.5+0.5, sy=0.5-v.y*0.5;
        x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy);
      }
      return { x:[+x0.toFixed(2),+x1.toFixed(2)], y:[+y0.toFixed(2),+y1.toFixed(2)],
               altoPct:+((y1-y0)*100).toFixed(1), anchoPct:+((x1-x0)*100).toFixed(1) };
    },
    /* juega el minijuego solo: golpea SIEMPRE dentro del cubo, así se prueba
       que los siete cuenten y que el ancho baje, sin depender del reflejo */
    mini: (n) => {
      const r = [];
      for (let k = 0; k < (n || 12) && MINI.on; k++){
        r.push({ k: MINI.k, ancho: +MINI.ancho.toFixed(3) });
        MINI.pos = MINI.cubo; MINI.tGolpe = 0;
        const res = MINI.golpe();
        r[r.length-1].res = res;
        if (res === 'fin' || res === null) break;
      }
      return r;
    },
    /* y golpea siempre AFUERA, para comprobar que fallar no reinicia */
    miniMal: (n) => {
      const r = [];
      for (let k = 0; k < (n || 3) && MINI.on; k++){
        MINI.pos = MINI.cubo > 0.5 ? 0.02 : 0.98; MINI.tGolpe = 0;
        r.push({ k: MINI.k, res: MINI.golpe() });
      }
      return r;
    },
    cueva: () => CUEVA && { x:+CUEVA.x.toFixed(1), z:+CUEVA.z.toFixed(1),
      h:+CUEVA.h.toFixed(1), hondoReal: +(alturaCruda(CUEVA.x,CUEVA.z)*mascaraIsla(CUEVA.x,CUEVA.z)
        - 9*(1-mascaraIsla(CUEVA.x,CUEVA.z)) - 3.2 - H(CUEVA.x,CUEVA.z)).toFixed(2),
      frente: [+CUEVA.frenteX.toFixed(1), +CUEVA.frenteZ.toFixed(1)] },
    /* dónde cae el auto en la pantalla, con la misma cuenta que el camello */
    verAuto: () => {
      if (!AUTO) return null;
      /* LA INVERSA HAY QUE CALCULARLA A MANO. `updateMatrixWorld()` pone al día
         `matrixWorld`, pero `matrixWorldInverse` —que es la que usa cualquier
         proyección— la recalcula EL RENDERER al dibujar. Midiendo justo después
         de mover la cámara, la sonda proyectaba con la cámara del cuadro
         anterior: decía que el camello estaba dentro del cuadro cuando estaba
         medio metro por encima del borde, y al revés. Es la misma trampa que en
         RECREO hizo que el autobús diera 3.094 % del ancho. */
      cam.updateMatrixWorld(true);
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      const caja = new T.Box3().setFromObject(AUTO.g), v = new T.Vector3();
      let x0=9,x1=-9,y0=9,y1=-9,delante=true;
      for (let i = 0; i < 8; i++){
        v.set(i&1?caja.max.x:caja.min.x, i&2?caja.max.y:caja.min.y, i&4?caja.max.z:caja.min.z);
        v.applyMatrix4(cam.matrixWorldInverse);
        if (v.z > -0.05) delante = false;
        v.applyMatrix4(cam.projectionMatrix);
        const sx=v.x*0.5+0.5, sy=0.5-v.y*0.5;
        x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy);
      }
      /* la distancia va contra DONDE ESTÁ el auto y no contra dónde debería
         estar: midiendo contra el lugar de estacionamiento, la sonda decía
         «6,5 m» mientras el auto estaba a setenta y el defecto quedaba tapado */
      const pg = AUTO.g.position;
      return { autoEn: [+pg.x.toFixed(1), +pg.z.toFixed(1)],
               estaciona: [+AUTO.x.toFixed(1), +AUTO.z.toFixed(1)],
               camEn: [+cam.position.x.toFixed(1), +cam.position.z.toFixed(1)],
               dist: +Math.hypot(cam.position.x-pg.x, cam.position.z-pg.z).toFixed(1),
               x:[+x0.toFixed(2),+x1.toFixed(2)], y:[+y0.toFixed(2),+y1.toFixed(2)],
               delante, altoPct: +((y1-y0)*100).toFixed(1) };
    },
    /* prender y apagar el camello sin tocar nada más: con la misma imagen
       antes y después, la diferencia de píxeles dice si SE VE, que no es lo
       mismo que estar en cuadro */
    verCamello: (v) => { if (INTRO.camelloCine) INTRO.camelloCine.visible = v; return v; },
    /* la malla del camello, para poder apagarla o pintarla desde el banco: un
       bulto oscuro contra un fondo oscuro se ve igual que un bulto que no se
       dibujó, y la única forma de distinguirlos es apagarlo y comparar */
    malla: () => CAM3,
    /* pone el camello a la distancia que se le pida, en la dirección que
       quiera: sin esto, probar el acecho y la embestida exigía esperar a que
       llegara caminando desde ciento cuarenta metros a 2,2 m/s */
    traerBicho: (d) => { const a = Math.random()*6.283;
      BICHO.x = JUG.x + Math.cos(a)*d; BICHO.z = JUG.z + Math.sin(a)*d;
      return { d }; },
    bicho: () => ({ modo: BICHO.modo, v: +BICHO.v.toFixed(2), golpe: +BICHO.golpe.toFixed(1), reloj: +RELOJ.value.toFixed(1),
                    d: +Math.hypot(JUG.x-BICHO.x, JUG.z-BICHO.z).toFixed(1),
                    sol: +CFG.sol.toFixed(3) }),
    /* dónde quedó todo, para poder fotografiarlo sin caminar hasta ahí */
    sitios: () => ({ campo: CAMPO, auto: AUTO && { x:+AUTO.x.toFixed(1), z:+AUTO.z.toFixed(1) },
                     carpas: CARPAS.map(c => ({ x:+c.x.toFixed(1), z:+c.z.toFixed(1) })),
                     sitios: SITIOS.map(s => s.t) }),
    /* planta al jugador donde se le diga, mirando a donde se le diga */
    poner: (x, z, mx, mz, alto) => {
      JUG.x = x; JUG.z = z; JUG.y = H(x, z);
      /* SIN `+π`: con `rotation.y = yaw` en orden YXZ el frente de la cámara es
         (-sin yaw, 0, -cos yaw), así que mirar de (x,z) a (mx,mz) es
         `atan2(x-mx, z-mz)` pelado. Con el π de más el gancho fotografiaba
         justo lo contrario de lo que se le pedía. */
      JUG.yaw = Math.atan2(x - mx, z - mz);
      JUG.pitch = alto == null ? -0.05 : alto;
      JUG.vy = 0; JUG.aire = false;
      return { x: +JUG.x.toFixed(1), y: +JUG.y.toFixed(1), z: +JUG.z.toFixed(1) };
    },
    est: () => ({ fps, pix: CFG.pix, girado: GIRADO, escenario: [W, H2],
                  rt: rt ? [rt.width, rt.height] : null,
                  dib: DIB, tri: TRI,
                  x: +JUG.x.toFixed(1), z: +JUG.z.toFixed(1), y: +JUG.y.toFixed(1) }) };
})();
