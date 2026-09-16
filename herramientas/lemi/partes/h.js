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
/* `resembrar()` se fue con el botón «otra isla». Era la única forma de sembrar
   una isla nueva sin recargar, y con el botón sacado no la llamaba nadie: una
   función viva que nadie usa es una que el día que se toque va a estar rota sin
   que nada lo diga. La limpieza que hacía sigue existiendo —está adentro de
   `sembrar()`, que borra lo anterior antes de plantar— así que no se perdió
   nada: lo que se fue es el camino, no la maquinaria. */

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
  else if (MODO === 'final') FINAL.paso(dt);
  else if (MODO === 'muere') MUERTE.paso(dt);
  else if (!PAUSA) fisica(dt);
  /* la cinemática de la llave y la muerte mueven la cámara ellas mismas con
     `JUG`, así que necesitan que `ponCam` corra igual aunque la física no */
  if (MODO === 'llave' || MODO === 'muere') ponCam(dt);
  MIS.paso(dt);
  camasPaso(dt);
  pasoRoto(dt);
  pasoRojo(dt);
  if (ENCUEVA){ pasoMurcielagos(RELOJ.value); ambienteCueva(dt); }
  /* la cinemática pone la hora ella misma cuadro a cuadro: si además corriera
     el reloj del día, el atardecer se le adelantaría al guion */
  ponSol(MODO === 'cine' ? 0 : dt);
  /* LA LUZ DE LA CUEVA VA DESPUES DE `ponSol`, Y NO ES UN DETALLE DE ORDEN.
     `ponSol` reescribe el sol, la luna y el ambiente TODOS los cuadros; puesta
     antes, la cueva apagaba el mundo y una línea más abajo el sol volvía a
     encenderse. Medido: adentro del pasillo, con `LUZC.amb` barrido de 0,62 a
     2,4 el brillo del destino de render se movía 0,6 sobre 255 —o sea nada— y
     la sonda devolvía `sol: 2,55` a setenta metros dentro del cerro. Lo que se
     veía era el pasillo iluminado por el AMANECER, y de ahí venía el naranja. */
  luzCueva(dt);
  if (MODO !== 'cine') pasoCamello(dt);

  /* el cielo viaja con la cámara: si no, se ve el borde de la esfera */
  cielo.position.set(cam.position.x, 0, cam.position.z);

  /* la fogata: late y parpadea. Es la única luz de la noche y por eso conviene
     que se note que está viva. */
  if (fuegoLuz){
    const t = RELOJ.value;
    const p1 = Math.sin(t*11.3) * 0.5 + Math.sin(t*7.1) * 0.3 + Math.sin(t*23.7) * 0.2;
    /* EL PARPADEO NO PUEDE PRENDER UN FUEGO APAGADO. Esta línea corre TODOS los
       cuadros y escribe la intensidad entera, así que apagar la fogata desde la
       cinemática —mientras todavía la están armando— no servía de nada: el
       parpadeo se la volvía a prender en el cuadro siguiente. `FUEGO_ON` es lo
       que decide si hay fuego; esto sólo lo hace latir. */
    fuegoLuz.intensity = FUEGO_ON ? (7.5 + p1 * 2.6) * FUEGO_K : 0;
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
    /* ARRIBA VA LA HORA Y NADA MÁS. Estaban también los cuadros por segundo, el
       tamaño del destino de render, el pixelado, las llamadas de dibujo y los
       triángulos: cinco números que sirven para medir el juego y que a quien lo
       juega no le dicen absolutamente nada. La hora se queda porque NO es una
       estadística — es información de la partida: el camello caza de noche, así
       que saber qué hora es cambia lo que uno hace. `fps`, `DIB` y `TRI` siguen
       calculándose para las sondas del banco, sólo que no se muestran. */
    const hh = Math.floor(HORA), mm = Math.floor((HORA % 1) * 60);
    $('fps').textContent = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
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
  /* LOS DOS PROPS 3D SE DECODIFICAN ACÁ Y NO AL LADO DE `cargaUI()`, que sería
     el sitio temáticamente correcto. `cargaUI()` corre mientras se evalúa
     `e.js`, o sea ANTES de que exista `PROPS` —que es un `const` de `i.js`— y
     un `const` leído en su zona muerta no devuelve `undefined`: TIRA. Ni
     siquiera `typeof` lo salva, que es la excepción que casi nadie recuerda.
     Es la sexta vez en este proyecto que una declaración puesta donde queda
     prolijo en vez de antes de su primer uso tira el módulo entero. */
  PROPS.carga();
  const r = await construir(true);
  /* el HUD no va en el menú: se prende al entrar al juego */
  CINE.arranca();
  bucle();
  /* de la barra de carga al menú de inicio, con la isla ya viva detrás */
  ISLA_DATOS = { arboles: r.arboles, sitios: SITIOS.length, lado: Math.round(MITAD*2) };
  $('mPie').textContent = TXF('mPie', r.arboles, SITIOS.length, Math.round(MITAD*2));
  /* Y EL GANCHO SE CUELGA ACÁ, ANTES DE ESPERAR AL IDIOMA. Estaba después del
     `await` que espera a que se elija idioma, o sea que en el momento en que se
     elige —que es lo que resuelve esa espera— `pintaIdioma()` corría y
     `window.repintaJuego` todavía no existía: el pie del menú se quedaba en
     inglés para siempre por más que todo lo demás cambiara. Medido en la
     captura: «1772 trees · 4 places · 660 m across» debajo de un menú en
     castellano. Es el mismo defecto de orden que las fichas de ajustes de esta
     misma vuelta, y por eso vale escribirlo dos veces: un gancho tiene que
     existir antes de que pueda dispararse, no donde queda prolijo. */
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
               lemi: donde(INTRO.gente[0]),
               /* los cuatro, para saber cuántos entran en el cuadro: en las
                  escenas de grupo lo que hay que comprobar no es dónde cae uno
                  sino que estén TODOS */
               gentePx: INTRO.gente.map(p => { const q = donde(p);
                 return q && q.delante && q.x[1] > 0.02 && q.x[0] < 0.98 &&
                        q.y[1] > 0.02 && q.y[0] < 0.98 ? 1 : 0; })
                 .reduce((a,b) => a+b, 0) };
    },
    saltar: () => { INTRO.termina(); return MODO; },
    /* ── las misiones, desde afuera ── */
    mis: () => ({ i: MIS.i, on: MIS.on, ramas: MIS.ramas,
                  tit: MIS.i >= 0 && MIS.i < 5 ? TX(MIS.lista[MIS.i].k + 'n') : 'fin',
                  rastroVis: MIS.marcaRastro ? MIS.marcaRastro.visible : null,
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
    /* camina de verdad hacia adelante N cuadros, pasando por la fisica, el
       recorte del pasillo y los tropiezos. Es la unica forma honesta de probar
       la huida: teletransportarse no puede tropezar. */
    anda: (n, correr) => new Promise(res => {
      let i = 0, caidas = 0, pasos = 0;
      /* EL TIEMPO SE MIDE CON EL RELOJ DEL JUEGO Y NO CON EL DE PARED. El `dt`
         está topado en 0,08 s, así que en el banco —que dibuja por software y
         puede caer a dos cuadros por segundo— un segundo de reloj de pared son
         ocho centésimas de juego: dividiendo por el reloj de pared, cualquier
         velocidad da diez veces menos de lo que es. */
      const x0 = JUG.x, z0 = JUG.z, t0 = RELOJ.value;
      const un = () => {
        /* CORRER NO ES UNA TECLA DEL MAPA: es la variable `corre`, que la
           encienden `keydown`/`keyup`. Poniendo `teclas.ShiftLeft` la prueba
           creía estar corriendo y el juego caminaba — medido, 110,9 m en 19,2 s
           de juego, o sea 5,78 m/s, que es CAMINAR clavado. Una prueba que no
           puede activar lo que dice medir devuelve un número plausible. */
        teclas.KeyW = true; corre = !!correr;
        if (ROTO.cae > 0) caidas++;
        pasos++;
        if (++i < n) requestAnimationFrame(un);
        else { teclas.KeyW = false; corre = false;
               res(JSON.stringify({ cuadros: pasos, caidas,
                 metros: +Math.hypot(JUG.x-x0, JUG.z-z0).toFixed(1),
                 seg: +(RELOJ.value-t0).toFixed(1),
                 dentro: ENCUEVA, avance: (ENCUEVA && CUEVA_EJE) ? +cercaEje(JUG.x,JUG.z).avance.toFixed(1) : null,
                 x:+JUG.x.toFixed(1), z:+JUG.z.toFixed(1),
                 cerca: MIS.cerca ? MIS.cerca.tipo : null, modo: MODO })); }
      };
      requestAnimationFrame(un);
    }),
    /* lleva las misiones hasta la que se pida, sin jugarlas. Con la antorcha
       ya armada, porque de la cuarta en adelante es lo unico que ilumina. */
    misA: (i) => { MIS.ramas = 5; MIS.tieneInflador = true;
      MIS.antorcha = { rama:true, tela:true, fuego:true };
      while (MIS.i < i && MIS.i < MIS.lista.length){ MIS.avanza(); }
      if (i >= 4) MIS.prendeAntorcha();   /* directo: chequeaAntorcha() ademas avanza */
      return { i: MIS.i, antorcha: !!MIS.antorchaMalla }; },
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
               /* Y LA LLAVE MEDIDA EN PANTALLA, que es lo único que dice si el
                  plano la muestra: «está en la mano» no quiere decir que se vea. */
               llave: LLAVE.manos && LLAVE.manos.userData.llave.visible
                        ? donde(LLAVE.manos.userData.llave) : null,
               llaveVis: LLAVE.manos ? LLAVE.manos.userData.llave.visible : null };
    },
    /* lo que se lleva en la mano, medido en pantalla. `que` elige cuál. */
    enMano: (que) => {
      const o = que === 'inflador' ? MIS.infladorMano : MIS.antorchaMalla;
      if (!o || !o.visible) return null;
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
    camPos: () => { if (!CAM3) return null; CAM3.updateMatrixWorld(true);
      const c = new T.Box3().setFromObject(CAM3);
      return { pos: [+CAM3.position.x.toFixed(1), +CAM3.position.y.toFixed(2), +CAM3.position.z.toFixed(1)],
               esc: +CAM3.scale.y.toFixed(2),
               caja: [+c.min.y.toFixed(2), +c.max.y.toFixed(2)],
               alto: +(c.max.y-c.min.y).toFixed(2),
               jug: [+JUG.x.toFixed(1), +JUG.y.toFixed(2), +JUG.z.toFixed(1)],
               d: +Math.hypot(CAM3.position.x-JUG.x, CAM3.position.z-JUG.z).toFixed(1),
               piso: (ENCUEVA && CUEVA_EJE) ? +cercaEje(CAM3.position.x, CAM3.position.z).y.toFixed(2) : null,
               H: +H(CAM3.position.x, CAM3.position.z).toFixed(2) }; },
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
    /* el inflador: si está en la caja del auto, si está en la mano */
    /* CUÁNTO SE MUEVE DE VERDAD CADA PARTE EN UN CICLO. Es la única prueba de
       que una animación anima: un recorrido de dos centímetros es un muñeco
       temblando, no alguien caminando. Devuelve metros. */
    anim: (cual, vel) => {
      const p = INTRO.gente[0];
      if (!p) return null;
      const u = p.userData;
      /* la cabeza va en la lista: en la pose de alerta lo único que se mueve es
         el barrido del cuello, y midiendo sólo codos y rodillas la medición
         decía «no se mueve» sobre la parte que sí lo hace */
      /* Y SE MIDE LA MALLA DE LA CABEZA, NO EL PIVOTE DEL CUELLO. Girar un
         pivote no mueve su propio origen, así que midiendo el pivote el barrido
         de la cabeza en la pose de alerta daba cero — la medición no veía
         justamente lo único que se mueve ahí. Todos los demás ya son pivotes
         DEL EXTREMO (la rodilla, el codo), que sí se trasladan. */
      const partes = { pieI: u.pi.i.rod, pieD: u.pi.d.rod,
                       manoI: u.br.i.codo, manoD: u.br.d.codo,
                       cabeza: u.cuello.children[0] || u.cuello, cadera: u.cadera };
      const caja = {}, v = new T.Vector3();
      /* LOS CENTINELAS VAN EN INFINITO Y NO EN NUEVE. Estaban en ±9 y la isla
         llega a 22 m de altura, así que `Math.min(9, 22.4)` devuelve 9 para
         siempre y el «recorrido» que salía era la altura del terreno: un pie
         que se mueve tres centímetros medía 13,44 m. Un centinela que puede
         estar dentro del rango de los datos no es un centinela. */
      const INF = Infinity;
      for (const k in partes) caja[k] = { x:[INF,-INF], y:[INF,-INF], z:[INF,-INF] };
      /* DIECISÉIS SEGUNDOS Y NO DOS. La ventana era de 2 s y las cosas lentas
         no entraban: el cambio de peso de la pose quieta dura quince segundos y
         el barrido de cabeza de la alerta ocho, así que la medición decía «no
         se mueve» sobre movimientos que sí están, sólo que más largos que la
         ventana. Con 0,1 s de paso el ciclo de caminata —0,87 s— todavía cae
         nueve veces por vuelta, que alcanza de sobra para un recorrido. */
      const N = 160;
      for (let i = 0; i < N; i++){
        const t = i * 0.1;
        if (cual === 'camina') poseCamina(p, t, vel || 1.4);
        else if (cual === 'quieto') poseQuieto(p, t);
        else if (cual === 'lena') poseLena(p, t, true);
        else if (cual === 'sentado') poseSentado(p, t);
        else if (cual === 'alerta') poseAlerta(p, t, 1);
        p.updateMatrixWorld(true);
        for (const k in partes){
          v.setFromMatrixPosition(partes[k].matrixWorld);
          const c = caja[k];
          c.x[0]=Math.min(c.x[0],v.x); c.x[1]=Math.max(c.x[1],v.x);
          c.y[0]=Math.min(c.y[0],v.y); c.y[1]=Math.max(c.y[1],v.y);
          c.z[0]=Math.min(c.z[0],v.z); c.z[1]=Math.max(c.z[1],v.z);
        }
      }
      const r = {};
      for (const k in caja){ const c = caja[k];
        r[k] = { x:+(c.x[1]-c.x[0]).toFixed(3), y:+(c.y[1]-c.y[0]).toFixed(3),
                 z:+(c.z[1]-c.z[0]).toFixed(3) }; }
      return r;
    },
    /* EL PICO DEL ANALIZADOR ES LA PRUEBA DE QUE SONO. Comprobar que `son2()`
       no tiro excepcion no prueba nada: un `<audio>` que el telefono no pudo
       abrir tampoco tira. Esto dispara el clip, espera, y devuelve el pico
       medido en el maestro. */
    oir: (tipo, ms) => new Promise(res => {
      if (!audioArranca()) return res({ no: 'sin audio' });
      if (AUD.state === 'suspended') AUD.resume();
      if (!AUD_BUF[tipo]) return res({ no: 'sin buffer', listo: Object.keys(AUD_BUF) });
      const n = AUD_ANAL.fftSize, d = new Uint8Array(n);
      let pico = 0, suma = 0, cuenta = 0;
      son2(tipo);
      const t0 = performance.now();
      const mira = () => {
        AUD_ANAL.getByteTimeDomainData(d);
        let mx = 0, ac = 0;
        for (let i = 0; i < n; i++){ const v = Math.abs(d[i] - 128) / 128; if (v > mx) mx = v; ac += v*v; }
        if (mx > pico) pico = mx;
        suma += ac / n; cuenta++;
        if (performance.now() - t0 < (ms || 900)) requestAnimationFrame(mira);
        else res({ tipo, pico: +pico.toFixed(4), rms: +Math.sqrt(suma/cuenta).toFixed(4) });
      };
      requestAnimationFrame(mira);
    }),
    /* el piso: lo que suena SIN disparar nada. Es contra esto que hay que
       comparar los efectos — decir que un clip da 0,03 no significa nada si no
       se sabe cuánto da el silencio. */
    fondo: (ms) => new Promise(res => {
      if (!AUD_ANAL) return res({ no: 'sin audio' });
      const n = AUD_ANAL.fftSize, d = new Uint8Array(n);
      let pico = 0, suma = 0, cuenta = 0;
      const t0 = performance.now();
      const mira = () => {
        AUD_ANAL.getByteTimeDomainData(d);
        let mx = 0, ac = 0;
        for (let i = 0; i < n; i++){ const v = Math.abs(d[i] - 128) / 128; if (v > mx) mx = v; ac += v*v; }
        if (mx > pico) pico = mx;
        suma += ac / n; cuenta++;
        if (performance.now() - t0 < (ms || 900)) requestAnimationFrame(mira);
        else res({ pico: +pico.toFixed(4), rms: +Math.sqrt(suma/cuenta).toFixed(4) });
      };
      requestAnimationFrame(mira);
    }),
    /* cuántos clips llegaron a decodificar, y el fondo sin disparar nada */
    audio: () => ({ ctx: AUD ? AUD.state : null, listo: Object.keys(AUD_BUF).length,
                    cuales: Object.keys(AUD_BUF),
                    camas: CAMA.on ? { dia:+CAMA.g.dia.gain.value.toFixed(3),
                                       noche:+CAMA.g.noche.gain.value.toFixed(3) } : null }),
    /* CUÁNTA LUZ HAY DE VERDAD EN EL CUADRO. Se lee el búfer con `readPixels`
       y no con `drawImage`: un lienzo WebGL sin `preserveDrawingBuffer` sale en
       cero por ahí. Es la misma sonda que en Eco decidió el nivel del fogonazo,
       y sirve para lo mismo — «se ve oscuro» es una opinión, 6,4 de 255 es un
       dato. */
    brillo: () => {
      /* SE LEE EL DESTINO DE RENDER Y NO EL LIENZO. El lienzo se compone y se
         descarta: sin `preserveDrawingBuffer`, leerlo desde fuera del cuadro
         devuelve CEROS —medido, las cuatro capturas daban 0 de 0—. El destino
         intermedio, en cambio, sigue ahí, y encima es el que tiene la escena
         antes del post-proceso, que es justo lo que hay que medir cuando lo que
         se está ajustando es la luz. */
      if (!rt) return { no: 'sin destino' };
      const w = rt.width, h = rt.height;
      const px = new Uint8Array(w*h*4);
      ren.readRenderTargetPixels(rt, 0, 0, w, h, px);
      let suma = 0, max = 0, enc = 0;
      for (let i = 0; i < px.length; i += 4){
        const v = px[i]*0.30 + px[i+1]*0.59 + px[i+2]*0.11;
        suma += v; if (v > max) max = v; if (v > 26) enc++;
      }
      const n = w*h;
      return { medio: +(suma/n).toFixed(1), max: Math.round(max),
               pctEncendido: +(enc/n*100).toFixed(1), tam: [w, h] };
    },
    luzc: (o) => { if (o) Object.assign(LUZC, o);
      const g = MIS.antorchaMalla, ls = [];
      if (g) for (const q of g.children) if (q.isPointLight) ls.push([+q.intensity.toFixed(2), +q.distance.toFixed(1)]);
      return { ...LUZC, amb: +ambiente.intensity.toFixed(2), sat: +postMat.uniforms.sat.value.toFixed(2),
               vig: +postMat.uniforms.vig.value.toFixed(3), luces: ls,
               luna: +luna.intensity.toFixed(2), sol: +sol.intensity.toFixed(2),
               rel: +relleno.intensity.toFixed(2),
               col: '#'+ambiente.color.getHexString(), suelo: '#'+ambiente.groundColor.getHexString(),
               hondo: +hondoCueva().toFixed(2) }; },
    /* diagnostico: cambia el material del tunel para ver si el problema es la
       geometria o la luz */
    tunelMat: (que) => { const m = CUEVA_G && CUEVA_G.children[0] && CUEVA_G.children[0].children[0];
      if (!m) return 'sin tunel';
      if (que === 'basic') m.material = new T.MeshBasicMaterial({ map: texCueva });
      else if (que === 'normal') m.material = new T.MeshNormalMaterial();
      else m.material = matRocaCueva;
      const g = m.geometry;
      return { que, tri: g.attributes.position.count/3,
               uv: !!g.attributes.uv, nor: !!g.attributes.normal }; },
    /* donde caen los cuerpos en la pantalla, que es la unica forma de saber si
       se ven: «esta oscuro» es una opinion, «ocupa el 0,4 % del cuadro» no */
    cuerpos: () => { cam.updateMatrixWorld(true);
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      return CUERPOS.map((p, i) => { p.updateMatrixWorld(true);
        const caja = new T.Box3().setFromObject(p), v = new T.Vector3();
        let x0=9,x1=-9,y0=9,y1=-9, del = false;
        for (let k = 0; k < 8; k++){
          v.set(k&1?caja.max.x:caja.min.x, k&2?caja.max.y:caja.min.y, k&4?caja.max.z:caja.min.z);
          v.applyMatrix4(cam.matrixWorldInverse);
          if (v.z < -0.05) del = true;
          v.applyMatrix4(cam.projectionMatrix);
          const sx=v.x*0.5+0.5, sy=0.5-v.y*0.5;
          x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy);
        }
        return { i, vis: p.visible, delante: del,
                 d: +Math.hypot(p.position.x-JUG.x, p.position.z-JUG.z).toFixed(1),
                 x: [+x0.toFixed(2), +x1.toFixed(2)], y: [+y0.toFixed(2), +y1.toFixed(2)],
                 alto: +(caja.max.y-caja.min.y).toFixed(2) }; }); },
    /* la voz: que idioma esta cargado, cuantos clips decodifican y si suena */
    vozVer: () => ({ idioma: VOZ_IDIOMA, listos: Object.keys(VOZ_BUF).length,
                     cuales: Object.keys(VOZ_BUF),
                     seg: Object.fromEntries(Object.entries(VOZ_BUF)
                          .map(([k,b]) => [k, +b.duration.toFixed(2)])),
                     sonando: !!VOZ_FUENTE, duck: +CAMA.duckAct.toFixed(2) }),
    /* forzar el modo tactil: el banco arranca en PC y los controles de pixel
       art solo se dibujan con `body:not(.pc)` */
    movil: () => { modoPC(false); return document.body.className; },
    /* las imagenes de los controles */
    ui: () => ({ listas: Object.keys(IMG),
                 hoja: getComputedStyle($('obj')).backgroundImage.slice(0, 30),
                 bot: ['acCorre','acAgacha','acSalta','acUsar']
                      .map(i => ($(i).style.backgroundImage||'').slice(0,26)),
                 stats: $('fps').textContent }),
    /* el estado de adentro de la cueva */
    cueva2: () => ({ dentro: ENCUEVA, largo: +CUEVA_LARGO.toFixed(1),
                     construida: !!CUEVA_G, cuerpos: CUERPOS.length,
                     murcis: MURCIS.n,
                     avance: (ENCUEVA && CUEVA_EJE) ? +cercaEje(JUG.x, JUG.z).avance.toFixed(1) : null,
                     hondo: +hondoCueva().toFixed(2) }),
    /* el estado de la pierna rota */
    /* fuerza un tropiezo: es la única forma de medir cuánto se avanza EN EL
       PISO sin esperar a que la pierna falle sola */
    tropieza: () => { ROTO.on = true; ROTO.cae = 1.35; return ROTO.cae; },
    /* rompe la pierna sin tener que jugar la cinemática de la llave: es lo que
       permite medir la huida sola, que es lo que se toca */
    rompe: () => { rompePierna(); ROJO.on = true;
      return { on: ROTO.on, prox: +ROTO.prox.toFixed(1) }; },
    /* la muerte, fotografiable en cualquier instante: `MUERTE.paso` es una
       función del tiempo igual que las cinemáticas, así que se puede saltar al
       segundo que se quiera sin esperarlo. Devuelve dónde cae el camello en la
       pantalla, que es lo único que prueba que el screamer se ve. */
    /* CON 'ver' NO ARRANCA NADA, Y ESO HACE FALTA. La primera versión disparaba
       la muerte en cuanto se la llamaba, así que cada foto que se quería sacar
       DURANTE la secuencia empezaba una secuencia nueva: las cuatro muestras
       daban `t: 0` y parecía que el reloj no corría, cuando lo que pasaba era
       que la sonda lo reiniciaba. */
    muere: (t) => {
      if (t !== 'ver' && !MUERTE.on) MUERTE.arranca();
      if (t != null && t !== 'ver'){ MUERTE.t = t; MUERTE.paso(0); }
      ponCam(0); pasoCamello(0);
      cam.updateMatrixWorld(true);
      cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
      const caja = new T.Box3(), v = new T.Vector3();
      let x0=9,x1=-9,y0=9,y1=-9, delante = true;
      if (CAM3){
        CAM3.updateMatrixWorld(true); caja.setFromObject(CAM3);
        for (let i = 0; i < 8; i++){
          v.set(i&1?caja.max.x:caja.min.x, i&2?caja.max.y:caja.min.y, i&4?caja.max.z:caja.min.z);
          v.applyMatrix4(cam.matrixWorldInverse);
          if (v.z > -0.05) delante = false;
          v.applyMatrix4(cam.projectionMatrix);
          const sx=v.x*0.5+0.5, sy=0.5-v.y*0.5;
          x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy);
        }
      }
      return { t: +MUERTE.t.toFixed(2), modo: MODO, on: MUERTE.on, reloj: +RELOJ.value.toFixed(1),
               d: CAM3 ? +Math.hypot(CAM3.position.x-JUG.x, CAM3.position.z-JUG.z).toFixed(2) : null,
               visible: CAM3 ? CAM3.visible : null, delante,
               x:[+x0.toFixed(2),+x1.toFixed(2)], y:[+y0.toFixed(2),+y1.toFixed(2)],
               rojo: +postMat.uniforms.rojo.value.toFixed(2),
               velo: +($('muerte').style.opacity || 0) };
    },
    /* el estado de la vida nueva: dónde te deja, cómo está la pierna y dónde
       quedó el camello */
    revivio: () => ({ dentro: ENCUEVA, modo: MODO,
      avance: (ENCUEVA && CUEVA_EJE) ? +cercaEje(JUG.x, JUG.z).avance.toFixed(1) : null,
      largo: +CUEVA_LARGO.toFixed(1),
      roto: ROTO.on, rojoOn: ROJO.on,
      antorcha: MIS.antorchaMalla ? MIS.antorchaMalla.visible : null,
      bicho: BICHO.modo, caza: BICHO.caza,
      dBicho: +Math.hypot(BICHO.x-JUG.x, BICHO.z-JUG.z).toFixed(1),
      camVis: CAM3 ? CAM3.visible : null,
      /* mirando a la boca: el avance tiene que BAJAR al caminar de frente */
      haciaBoca: (ENCUEVA && CUEVA_EJE)
        ? cercaEje(JUG.x - Math.sin(JUG.yaw), JUG.z - Math.cos(JUG.yaw)).avance
          < cercaEje(JUG.x, JUG.z).avance : null }),
    /* los dos props 3D: si decodificaron, cuántos triángulos tienen y cuánto
       ocupa la antorcha en la pantalla —que es lo único que dice si «se ve
       bien», porque cuelga de la cámara y a cuarenta centímetros del ojo
       cualquier cosa con proporciones de verdad es gigante */
    props: () => {
      const r = { cargados: Object.keys(PROPS.geo), pend: PROPS.pend.length, tri: {} };
      for (const k of Object.keys(PROPS.geo)){
        const g = PROPS.geo[k];
        r.tri[k] = g.index ? g.index.count/3 : g.getAttribute('position').count/3;
      }
      const a = MIS.antorchaMalla;
      if (a){
        cam.updateMatrixWorld(true);
        cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
        a.updateMatrixWorld(true);
        const caja = new T.Box3().setFromObject(a), v = new T.Vector3();
        let x0=9,x1=-9,y0=9,y1=-9;
        for (let i = 0; i < 8; i++){
          v.set(i&1?caja.max.x:caja.min.x, i&2?caja.max.y:caja.min.y, i&4?caja.max.z:caja.min.z);
          v.applyMatrix4(cam.matrixWorldInverse).applyMatrix4(cam.projectionMatrix);
          const sx=v.x*0.5+0.5, sy=0.5-v.y*0.5;
          x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy);
        }
        r.antorcha = { x:[+x0.toFixed(2),+x1.toFixed(2)], y:[+y0.toFixed(2),+y1.toFixed(2)] };
        r.procApagadas = 0; r.mallas = 0;
        a.traverse(o => { if (o.userData && o.userData.proc && !o.visible) r.procApagadas++;
                          if (o.isMesh && o.material === PROPS.mat) r.mallas++; });
      }
      const inf = MIS.infladorMalla;
      if (inf){ r.inflProc = 0; r.inflMallas = 0;
        inf.traverse(o => { if (o.userData && o.userData.proc && !o.visible) r.inflProc++;
                            if (o.isMesh && o.material === PROPS.mat) r.inflMallas++; }); }
      return r;
    },
    roto: () => ({ on: ROTO.on, cae: +ROTO.cae.toFixed(2), prox: +ROTO.prox.toFixed(1),
                   rojoOn: ROJO.on, rojo: +postMat.uniforms.rojo.value.toFixed(2) }),
    /* mete al jugador N metros adentro del pasillo, para poder fotografiarlo */
    enCueva: (d, atras) => { construyeCueva();
      if (!CUEVA_EJE) return 'sin cueva';
      if (!ENCUEVA){ ENCUEVA = true; esconde(true); if (CAM3) CAM3.visible = true; }
      const p = puntoEje(cl(d, 0, CUEVA_LARGO));
      JUG.x = p.x; JUG.z = p.z; JUG.y = p.y;
      if (atras){ JUG.yaw = Math.atan2(p.ex, p.ez); JUG.pitch = -0.05;
                  JUG.vy = 0; JUG.aire = false;
                  return { d, atras: true, x:+p.x.toFixed(1), z:+p.z.toFixed(1) }; }
      JUG.yaw = Math.atan2(-p.ex, -p.ez);
      JUG.pitch = -0.05; JUG.vy = 0; JUG.aire = false;
      return { d, x:+p.x.toFixed(1), z:+p.z.toFixed(1), y:+p.y.toFixed(1) }; },
    /* la cinemática final, fotografiable en cualquier instante */
    fin: (t) => { if (!FINAL.on) FINAL.arranca();
      FINAL.t = t; FINAL.paso(0);
      return JSON.stringify({ t, modo: MODO,
        cam: [+cam.position.x.toFixed(1), +cam.position.y.toFixed(2), +cam.position.z.toFixed(1)],
        auto: [+AUTO.g.position.x.toFixed(1), +AUTO.g.position.z.toFixed(1)],
        bicho: [+BICHO.x.toFixed(1), +BICHO.z.toFixed(1)],
        texto: document.getElementById('cTexto').textContent }); },
    auto: () => AUTO ? { x:+AUTO.x.toFixed(1), z:+AUTO.z.toFixed(1),
                         y:+AUTO.y.toFixed(1), ry:+AUTO.ry.toFixed(3) } : null,
    inflador: () => ({ enAuto: MIS.infladorMalla ? MIS.infladorMalla.visible : null,
                       enMano: !!MIS.infladorMano,
                       tiene: MIS.tieneInflador }),
    est: () => ({ fps, pix: CFG.pix, girado: GIRADO, escenario: [W, H2],
                  rt: rt ? [rt.width, rt.height] : null,
                  dib: DIB, tri: TRI,
                  x: +JUG.x.toFixed(1), z: +JUG.z.toFixed(1), y: +JUG.y.toFixed(1) }) };
})();
