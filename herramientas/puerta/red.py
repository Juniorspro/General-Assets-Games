# -*- coding: utf-8 -*-
"""Las redes contra el crasheo: que nada tire el juego abajo.

QUE ES "CRASHEAR" EN UN JUEGO WEBGL. No es que el navegador cierre la pestaña
—eso pasa solo por memoria— son cuatro cosas distintas y cada una necesita su
red:

1. UNA EXCEPCION EN EL CUADRO. `requestAnimationFrame` ya va en la primera linea
   del bucle, asi que una excepcion no lo mata; pero entre los `try` que habia
   quedaba codigo suelto —la camara, el domo del cielo, `updateTape`— y si eso
   tira, el bucle sigue girando y el render NO OCURRE NUNCA: la imagen queda
   congelada para siempre. Desde el sillon eso es un crasheo.

2. UNA EXCEPCION EN UN MANEJADOR DE EVENTOS. No la agarra ningun `try` del
   bucle. Y las consecuencias no son cosmeticas: si `onTouchEnd` tira, el dedo
   nunca se suelta y el jugador camina contra una pared para siempre; si
   `startLevel` tira a mitad de camino, la mitad de los grupos quedan visibles y
   el juego entra en un estado que no existe.

3. UN NaN. Es el asesino silencioso de este repo: un NaN en la posicion del
   jugador se propaga a la matriz de la camara y three.js deja de dibujar TODO,
   sin un solo mensaje en la consola. Ya costo una vuelta en LEMI.

4. LA PERDIDA DE CONTEXTO. El juego ya recargaba, y ahi hay una trampa: si el
   contexto se pierde POR MEMORIA, recargar vuelve a pedir la misma memoria y se
   vuelve a perder — un lazo de recargas infinito, que es peor que el crasheo.
"""

# ══════════════════════════════════════════════════════════════════════════════
# EL AYUDANTE, Y SE ENVUELVEN LAS FUNCIONES Y NO LOS LISTENERS
# ══════════════════════════════════════════════════════════════════════════════
# Las declaraciones `function` estan izadas con su cuerpo, asi que arriba de todo
# el modulo ya se las puede reasignar; y como `addEventListener` captura el VALOR
# de la referencia en el momento de registrarse, envolverlas antes de los
# registros alcanza para las veinticinco. Envolver cada listener a mano serian
# veinticinco parches y el proximo que se agregue quedaria sin red.
AYUDANTE = r"""
  // ==================================================================
  // RED CONTRA EL CRASHEO
  // ==================================================================
  window.__pbFallas = [];
  const pbVistas = {};
  function pbFalla(donde, err) {
    const msg = (err && err.message) ? err.message : String(err);
    window.__pbFallas.push(donde + ': ' + msg);
    if (window.__pbFallas.length > 60) window.__pbFallas.shift();
    // UNA VEZ POR SITIO Y NO UNA POR CUADRO: un error dentro del bucle se
    // repite sesenta veces por segundo, y sesenta avisos por segundo tapan la
    // pantalla con el aviso del error en vez de dejar seguir jugando.
    if (pbVistas[donde]) { pbVistas[donde]++; return; }
    pbVistas[donde] = 1;
    try { console.error('[pb:' + donde + ']', err); } catch (e) {}
    try { showToast('Fallo ' + donde + ' — el juego sigue.', 4000); } catch (e) {}
  }
  function pbSeguro(fn, donde) {
    return function () {
      try { return fn.apply(this, arguments); }
      catch (err) { pbFalla(donde, err); }
    };
  }
  // y las que dejan el juego en un estado imposible si tiran a mitad de camino
  startLevel = pbSeguro(startLevel, 'startLevel');
  applyQuality = pbSeguro(applyQuality, 'applyQuality');
  openMenu = pbSeguro(openMenu, 'openMenu');
  closeMenu = pbSeguro(closeMenu, 'closeMenu');
  hideAllLevels = pbSeguro(hideAllLevels, 'hideAllLevels');
  ensureAudio = pbSeguro(ensureAudio, 'ensureAudio');
  toggleFlashlight = pbSeguro(toggleFlashlight, 'toggleFlashlight');
  toggleHide = pbSeguro(toggleHide, 'toggleHide');
  updateTape = pbSeguro(updateTape, 'updateTape');
  updateLayout = pbSeguro(updateLayout, 'updateLayout');
  // EL DEDO ES EL CASO GRAVE. Si `onTouchEnd` tira, el toque no se suelta nunca
  // y el jugador queda caminando contra una pared sin poder soltar: no es un
  // error cosmetico, es el juego trabado.
  onTouchStart = pbSeguro(onTouchStart, 'onTouchStart');
  onTouchMove = pbSeguro(onTouchMove, 'onTouchMove');
  onTouchEnd = pbSeguro(onTouchEnd, 'onTouchEnd');
"""

# ══════════════════════════════════════════════════════════════════════════════
# EL CUADRO ENTERO BAJO RED, Y EL VIGIA DE NaN
# ══════════════════════════════════════════════════════════════════════════════
# EL VIGIA GUARDA CINCO NUMEROS Y NO LA MATRIZ. Lo que alimenta la matriz de la
# ══════════════════════════════════════════════════════════════════════════════
# EL VIGIA DE NaN Y LOS TRES PARCHES DEL CUADRO
# ══════════════════════════════════════════════════════════════════════════════
# VAN COMO PARCHES CHICOS SOBRE LITERALES UNICOS Y NO COMO UN CORTE DEL BUCLE
# ENTERO, y eso costo dos intentos: el bucle ya venia parchado por la medicion de
# llamadas de dibujo, y cortando desde `function animate() {` hasta su llamada se
# lleva puesto el objeto de sondas, que vive ENTRE las dos. No fallaba ahi:
# fallaba doscientas lineas despues, cuando otro parche no encontraba su ancla
# adentro de las sondas que ya no existian.

VIGIA = r"""
  // el ultimo estado SANO, para poder volver de un NaN. Se guardan CINCO
  // numeros y no la matriz: lo que alimenta la matriz de la camara son la
  // posicion, el rumbo y el cabeceo, y comprobar la matriz llega tarde — para
  // cuando tiene NaN, el estado que lo produjo ya se guardo.
  const pbSano = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vale: false };
  let pbNaNs = 0;
  function pbVigiaNaN() {
    const p = player.position;
    if (Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) &&
        Number.isFinite(yaw) && Number.isFinite(pitch)) {
      pbSano.x = p.x; pbSano.y = p.y; pbSano.z = p.z;
      pbSano.yaw = yaw; pbSano.pitch = pitch; pbSano.vale = true;
      return false;
    }
    // UN NaN NO PUEDE DEJAR LA PANTALLA EN NEGRO. Se propaga a la matriz de la
    // camara y three.js deja de dibujar TODO, sin un solo mensaje en la consola.
    pbNaNs++;
    if (pbSano.vale) {
      p.set(pbSano.x, pbSano.y, pbSano.z);
      yaw = pbSano.yaw; pitch = pbSano.pitch;
    } else { p.set(0, 0, 0); yaw = 0; pitch = 0; }
    player.rotation.y = yaw;
    pitchObj.rotation.x = pitch;
    player.updateMatrixWorld(true);
    if (pbNaNs === 1) pbFalla('NaN', new Error('posicion o vista no finita'));
    // Y SI VUELVE CUADRO TRAS CUADRO, LA FUENTE ES PERSISTENTE. No se adivina
    // que variable la produce —adivinar nombres es peor que no tocar nada—: se
    // cuenta. Dos segundos seguidos quiere decir que volver al ultimo cuadro
    // sano no alcanza, y ahi el menu es la unica salida. Mientras tanto el
    // jugador VE la escena, que ya es mejor que el negro.
    if (pbNaNs === 120) {
      paused = true;
      try { openMenu(); showToast('El nivel se rompio. Elegi otro.', 6000); } catch (e) {}
    }
    return true;
  }
"""

# `clock.getDelta()` devuelve NaN si alguien le movio el reloj, y un delta NaN
# mete NaN en TODO lo que integra —posicion, velocidad, animaciones— de un cuadro
DELTA_VIEJO = "    const delta = Math.min(clock.getDelta(), 0.05);"
DELTA = r"""    let delta = clock.getDelta();
    if (!Number.isFinite(delta) || delta < 0) delta = 0.016;
    delta = Math.min(delta, 0.05);"""

# un aviso por sitio y no uno por cuadro; y si falla siempre, al menu
CATCH_VIEJO = r"""    } catch (err) {
      loopErrors++;
      if (loopErrors === 1) {
        console.error('[loop]', err);
        showToast('Error: ' + (err && err.message ? err.message : err), 9000);
      }
      if (loopErrors > 300) { paused = true; }
    }"""
CATCH = r"""    } catch (err) {
      loopErrors++;
      if (loopErrors === 1) pbFalla('bucle', err);
      // `paused = true` A SECAS DEJA AL JUGADOR MIRANDO UNA ESCENA QUE NO
      // RESPONDE y sin nada que tocar; con el menu abierto puede elegir otro
      // nivel, que es lo unico que de verdad lo saca del pozo.
      if (loopErrors === 240) {
        paused = true;
        try { openMenu(); showToast('El nivel fallo. Elegi otro.', 6000); } catch (e) {}
      }
    }
    pbVigiaNaN();"""

# LO QUE ESTABA SUELTO ENTRE LOS `try`. Si `updateTape` tira, el bucle sigue
# girando —rAF va en la primera linea— y el render NO SE ALCANZA NUNCA: la imagen
# queda congelada para siempre. Es la forma mas comun de crasheo que un juego
# asi puede tener, y no dejaba rastro en ninguna parte.
MEDIO_VIEJO = r"""    camera.getWorldPosition(uCamPos.value);
    skyDome.position.set(uCamPos.value.x, 0, uCamPos.value.z);

    updateTape(delta, elapsedTime);
    postU.uTime.value = elapsedTime;"""
MEDIO = r"""    try {
      camera.getWorldPosition(uCamPos.value);
      skyDome.position.set(uCamPos.value.x, 0, uCamPos.value.z);
      updateTape(delta, elapsedTime);
      postU.uTime.value = elapsedTime;
    } catch (err) {
      loopErrors++;
      if (loopErrors === 1) pbFalla('cuadro', err);
    }"""

# ══════════════════════════════════════════════════════════════════════════════
# LA PERDIDA DE CONTEXTO SIN LAZO DE RECARGAS
# ══════════════════════════════════════════════════════════════════════════════
# SI EL CONTEXTO SE PIERDE POR MEMORIA, RECARGAR NO ARREGLA NADA: la pagina
# vuelve a pedir los mismos setenta y siete megas de textura y lo vuelve a
# perder. Eso es un lazo infinito de recargas, que es peor que quedarse en
# negro. La recarga lleva `?bajo` en la URL, que arranca en el escalon bajo y sin
# las fotos PBR; y si el contexto se pierde CON `?bajo` ya puesto, no se recarga
# mas: se avisa y se para. Va sin `sessionStorage` a proposito — en una ventana
# privada tira, y una red que tira no es una red.
CTX_VIEJO = r"""  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    paused = true;
    showToast('Se perdió el contexto gráfico. Recargando…', 6000);
    setTimeout(() => { window.location.reload(); }, 2200);
  }, false);"""

CONTEXTO = r"""
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    paused = true;
    const yaBajo = location.search.indexOf('bajo') >= 0;
    if (yaBajo) {
      showToast('Se perdio el contexto grafico otra vez. Cerra otras pestanas y volve a entrar.', 20000);
      return;
    }
    showToast('Se perdio el contexto grafico. Recargando en calidad baja…', 6000);
    setTimeout(() => {
      const u = location.href.split('#')[0];
      location.href = u + (u.indexOf('?') >= 0 ? '&' : '?') + 'bajo=1&nopbr=1';
    }, 2200);
  }, false);
"""


# ══════════════════════════════════════════════════════════════════════════════
# EL FUNDIDO: TODAS LAS TRANSICIONES DE NIVEL PASAN POR ACA, Y NO TENIAN RED
# ══════════════════════════════════════════════════════════════════════════════
# `fadeTo(cb)` corre `cb()` dentro de un `setTimeout`, o sea FUERA de cualquier
# `try` del bucle y fuera del envoltorio de `startLevel`: ahi se construye el
# nivel entero. Medido inyectando una falla en la construccion, el error salia
# como "Uncaught" y el velo negro del fundido se quedaba puesto — pantalla negra
# que no responde, que es exactamente lo que un jugador llama crasheo.
FADE_VIEJO = r"""  function fadeTo(callback) {
    fadeOverlay.style.opacity = '1';
    setTimeout(() => {
      callback();
      setTimeout(() => { fadeOverlay.style.opacity = '0'; }, 60);
    }, 480);
  }"""
FADE = r"""  function fadeTo(callback) {
    fadeOverlay.style.opacity = '1';
    setTimeout(() => {
      // Y EL VELO SE LEVANTA IGUAL SI LA CONSTRUCCION TIRA. Dejandolo puesto, el
      // jugador queda mirando un rectangulo negro y no hay forma de saber que
      // paso; levantandolo, al menos ve el menu o el nivel a medio armar y puede
      // elegir otro.
      try { callback(); }
      catch (err) {
        pbFalla('transicion', err);
        try { paused = true; openMenu(); } catch (e) {}
      }
      setTimeout(() => { fadeOverlay.style.opacity = '0'; }, 60);
    }, 480);
  }"""
