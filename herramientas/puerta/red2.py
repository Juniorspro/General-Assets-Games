# -*- coding: utf-8 -*-
"""La segunda red de PUERTA BLANCA: los listeners, los temporizadores y los
tres estados que dejan el juego trabado sin que nada falle.

LA VUELTA 87 puso el cuadro entero bajo red —el bucle, la fisica, los dos
render, el vigia de NaN, la perdida de contexto y la memoria de video—. Lo que
quedaba afuera son las DOS puertas por las que el juego entra desde afuera del
bucle:

  1. LOS 37 `addEventListener`. Una excepcion ahi sale como "Uncaught" y el
     boton que la disparo no hace absolutamente nada: el jugador toca REINICIAR
     o ROCIAR y no pasa nada, sin un mensaje. Y desde la vuelta 87 se agregaron
     ocho listeners nuevos (el menu, los tres idiomas, las tres calidades, las
     tres barras, el spray, el reinicio y el salteo del despertar), o sea que la
     lista a mano ya estaba desactualizada. Se envuelve el PROTOTIPO una vez:
     asi quedan cubiertos los que hay y los que se agreguen.

  2. LOS 10 `setTimeout`. Lo mismo, y peor: `fadeTo` corre la construccion del
     nivel dentro de uno.

Y TRES VIGIAS DE ESTADO, que son la parte que de verdad importa. `transitioning`,
`scream.active` y `paused` son banderas que TOMAN EL CONTROL, y si una se queda
puesta el juego no falla: se queda. Con `transitioning` trabado se puede caminar
pero no se puede salir de ningun nivel ni te puede agarrar nada —un soft-lock
que se ve normal—; con el screamer trabado los controles quedan tomados y el
velo puesto; y `paused` con el menu escondido es una pantalla viva que no
responde. Los tres se destraban solos, y ese es el unico tipo de red que cubre
las fallas que no se me ocurrieron.
"""

# ══════════════════════════════════════════════════════════════════════════════
# LOS LISTENERS Y LOS TEMPORIZADORES, DE UNA VEZ
# ══════════════════════════════════════════════════════════════════════════════
# VA SOBRE EL PROTOTIPO Y NO SOBRE CADA REGISTRO. Enumerarlos a mano ya fallo:
# la lista de la vuelta 87 tiene once nombres y el juego tiene treinta y siete
# listeners, ocho de ellos agregados despues. Y el WeakMap no es opcional:
# `removeEventListener` recibe la funcion ORIGINAL, asi que sin la tabla el
# unico `removeEventListener` del juego —el `firstClick` que arranca el audio—
# dejaria de sacar nada y el listener quedaria vivo para siempre.
JS = r"""
  const PB_SIN_RED2 = /(\?|&)sinred2/.test(location.search);
  if (!PB_SIN_RED2) (function () {
    const laTabla = new WeakMap();
    const addOrig = EventTarget.prototype.addEventListener;
    const quiOrig = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (tipo, fn, op) {
      if (typeof fn !== 'function') return addOrig.call(this, tipo, fn, op);
      let env = laTabla.get(fn);
      if (!env) {
        env = function (ev) {
          try { return fn.call(this, ev); }
          catch (err) { pbFalla('evento:' + tipo, err); }
        };
        laTabla.set(fn, env);
      }
      return addOrig.call(this, tipo, env, op);
    };
    EventTarget.prototype.removeEventListener = function (tipo, fn, op) {
      const env = (typeof fn === 'function') ? laTabla.get(fn) : null;
      return quiOrig.call(this, tipo, env || fn, op);
    };
    // el id que devuelve sigue siendo el de verdad, asi que `clearTimeout` no
    // se entera de nada
    const tOrig = window.setTimeout;
    window.setTimeout = function (fn, ms) {
      if (typeof fn !== 'function') return tOrig.apply(window, arguments);
      const resto = Array.prototype.slice.call(arguments, 2);
      return tOrig.call(window, function () {
        try { fn.apply(null, resto); }
        catch (err) { pbFalla('temporizador', err); }
      }, ms);
    };
  })();

  // ── LO QUE HOY NO SE VE: LAS EXCEPCIONES SUELTAS Y LAS PROMESAS ────────────
  // El juego no tenia NINGUN canal para lo que se escapa. Y las promesas son el
  // caso grave, porque una rechazada sin `catch` NO dispara el evento `error` de
  // la ventana: no aparece en `window.__errs`, que es lo que mira el banco, asi
  // que mis propias pruebas podian estar aprobando un juego con una promesa
  // rota. Esto no arregla la falla: la hace visible, que es el paso que faltaba.
  window.addEventListener('error', function (ev) {
    pbFalla('suelto', (ev && ev.error) || new Error((ev && ev.message) || 'error suelto'));
  });
  window.addEventListener('unhandledrejection', function (ev) {
    pbFalla('promesa', (ev && ev.reason) || new Error('promesa rechazada'));
  });

  // ── LOS TRES VIGIAS DE ESTADO ───────────────────────────────────────────────
  // Los umbrales salen de MEDIR cuanto duran de verdad: `__pb.red2()` devuelve
  // el maximo visto, y jugando la cadena completa el mas largo es la cinematica
  // del screamer mas su fundido. Un umbral por debajo de eso cortaria una
  // transicion legitima, que es peor que el defecto que arregla.
  const PB_TOPE_TRANS = 6.0;   // el fundido dura 0,48 s y el susto 1,45 + fundido
  const PB_TOPE_GRITO = 8.0;
  let pbTrT = 0, pbGrT = 0, pbTrMax = 0, pbGrMax = 0, pbDestrabes = 0;
  function pbVigiaEstado(delta) {
    if (!Number.isFinite(delta) || delta <= 0) delta = 0.016;
    // 1 · TRANSITIONING TRABADO. Con esto puesto se camina igual, asi que el
    //     jugador no ve un error: ve un nivel del que no se puede salir.
    if (transitioning) {
      pbTrT += delta;
      if (pbTrT > pbTrMax) pbTrMax = pbTrT;
      if (!PB_SIN_RED2 && pbTrT > PB_TOPE_TRANS) {
        pbTrT = 0; pbDestrabes++;
        transitioning = false;
        try { fadeOverlay.style.opacity = '0'; } catch (e) {}
        pbFalla('transicion trabada', new Error(PB_TOPE_TRANS + ' s con transitioning puesto'));
      }
    } else pbTrT = 0;
    // 2 · EL SCREAMER TRABADO deja el velo puesto y los controles tomados
    if (scream.active) {
      pbGrT += delta;
      if (pbGrT > pbGrMax) pbGrMax = pbGrT;
      if (!PB_SIN_RED2 && pbGrT > PB_TOPE_GRITO) {
        pbGrT = 0; pbDestrabes++;
        scream.active = false;
        transitioning = false;
        try { screamerEl.style.display = 'none'; } catch (e) {}
        try { vignetteEl.style.opacity = '0'; } catch (e) {}
        pbFalla('susto trabado', new Error(PB_TOPE_GRITO + ' s de screamer'));
      }
    } else pbGrT = 0;
    // 3 · PAUSADO CON EL MENU CERRADO. No hay espera legitima: o el menu esta
    //     abierto o el juego corre. Se destraba en el acto y sin umbral.
    if (paused && !PB_SIN_RED2) {
      let ver = true;
      try { ver = getComputedStyle(menuEl).display !== 'none'; } catch (e) {}
      if (!ver) {
        paused = false; pbDestrabes++;
        pbFalla('pausa sin menu', new Error('paused con el menu escondido'));
      }
    }
  }
"""

# ══════════════════════════════════════════════════════════════════════════════
# LOS PARCHES
# ══════════════════════════════════════════════════════════════════════════════
# EL VIGIA VA DONDE EL BUCLE CORRE SIEMPRE, no adentro del `if (!paused)`: el
# tercer caso es justamente "pausado sin menu", asi que colgado de la rama que
# no corre pausado no se alcanzaria nunca.
VIEJO_BUCLE = """    try {
      camera.getWorldPosition(uCamPos.value);"""
NUEVO_BUCLE = """    try { pbVigiaEstado(delta); } catch (err) { pbFalla('vigia', err); }
    try {
      camera.getWorldPosition(uCamPos.value);"""

# Y `fadeTo` TENIA QUE SOLTAR LA BANDERA. Su `catch` levanta el velo y abre el
# menu, pero dejaba `transitioning` puesto: o sea que despues de una transicion
# fallida el jugador volvia a un juego del que no se puede salir de ningun nivel.
VIEJO_FADE = """      catch (err) {
        pbFalla('transicion', err);
        try { paused = true; openMenu(); } catch (e) {}
      }"""
NUEVO_FADE = """      catch (err) {
        pbFalla('transicion', err);
        transitioning = false;
        try { paused = true; openMenu(); } catch (e) {}
      }"""

SONDA = r"""
    // LO QUE MIDEN LOS TRES VIGIAS: el maximo visto de cada bandera y cuantas
    // veces hubo que destrabar. Los maximos son lo que justifica los umbrales.
    red2: function () {
      return { transMax: +pbTrMax.toFixed(2), gritoMax: +pbGrMax.toFixed(2),
               transAhora: +pbTrT.toFixed(2), gritoAhora: +pbGrT.toFixed(2),
               destrabes: pbDestrabes, sinRed: PB_SIN_RED2,
               transitioning: transitioning, screamActivo: scream.active,
               pausado: paused,
               menu: (function () { try { return getComputedStyle(menuEl).display; }
                                    catch (e) { return '?'; } })() };
    },
    // y las cuatro fallas nuevas que se pueden inyectar: las tres banderas
    // trabadas y una excepcion en un listener de verdad
    romper2: function (que) {
      if (que === 'trans') { transitioning = true; return 'transitioning puesto'; }
      if (que === 'grito') { scream.active = true; scream.t = -1e6; return 'screamer puesto'; }
      if (que === 'pausa') { paused = true; return 'pausado con el menu cerrado'; }
      if (que === 'boton') {
        const b = document.getElementById('menu-restart');
        b.addEventListener('click', function () { throw new Error('falla inyectada en el boton'); });
        return 'el boton de reiniciar tira';
      }
      if (que === 'promesa') { Promise.reject(new Error('promesa inyectada')); return 'promesa rechazada'; }
      if (que === 'suelto') { setTimeout(function () { window.dispatchEvent(new ErrorEvent('error', { message: 'error suelto inyectado' })); }, 10); return 'error suelto'; }
      if (que === 'timer') {
        setTimeout(function () { throw new Error('falla inyectada en un temporizador'); }, 30);
        return 'temporizador que tira';
      }
      return 'no se que es ' + que;
    },
"""


# ══════════════════════════════════════════════════════════════════════════════
# EL CRASHEO PEOR DE TODOS: LA PAGINA EN BLANCO
# ══════════════════════════════════════════════════════════════════════════════
# El juego bajaba three.js de UN cdn y de ninguno mas. Si ese tercero no
# contesta —una red que lo bloquea, un proxy de oficina, un mal dia— `THREE`
# queda undefined, la primera linea del juego tira y el jugador se queda con una
# PAGINA NEGRA Y VACIA: ni un mensaje, nada que leer, nada que hacer. Es la
# unica clase de crasheo en la que el jugador no puede ni enterarse de que paso.
# Lo mismo si el aparato no tiene WebGL.
#
# Van tres cosas y las tres son chicas:
#   1. un SEGUNDO cdn con `document.write`, que durante el parseo es sincrono y
#      bloquea — que es exactamente lo que hace falta aca, antes de que el juego
#      corra. Es la misma decision que en RezUno con el cliente de MQTT.
#   2. una prueba de WebGL con un lienzo de descarte.
#   3. y un cartel legible en los tres idiomas si alguna de las dos falla. No se
#      elige idioma porque el selector todavia no existe: las tres lineas van
#      juntas, que cuesta cero y se entiende igual.
CDN_VIEJO = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'

CDN_NUEVO = """<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>window.THREE || document.write('<scr' + 'ipt src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"><\\/scr' + 'ipt>');</script>
<script>
(function () {
  var falta = !window.THREE;
  if (!falta) {
    try {
      var c = document.createElement('canvas');
      if (!(c.getContext('webgl') || c.getContext('experimental-webgl'))) falta = 'webgl';
    } catch (e) { falta = 'webgl'; }
  }
  window.__pbSinMotor = falta;
  if (!falta) return;
  var m = document.createElement('div');
  m.id = 'pb-sinmotor';
  m.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;' +
    'background:#07080b;color:#c9d2e2;font:600 14px/1.5 system-ui,sans-serif';
  var t = (falta === 'webgl')
    ? ['Este aparato no tiene WebGL, asi que el juego no puede dibujar.',
       'This device has no WebGL, so the game cannot render.',
       'Este aparelho nao tem WebGL, entao o jogo nao pode desenhar.']
    : ['No se pudo bajar three.js. Revisa la conexion y volve a cargar.',
       'three.js could not be downloaded. Check the connection and reload.',
       'Nao foi possivel baixar o three.js. Verifique a conexao e recarregue.'];
  m.innerHTML = '<div style="font:700 17px/1.3 system-ui,sans-serif;color:#eef2f8">PUERTA BLANCA</div>' +
    t.map(function (x, i) { return '<div style="opacity:' + (i ? 0.62 : 0.95) + '">' + x + '</div>'; }).join('') +
    '<button onclick="location.reload()" style="margin-top:8px;padding:10px 22px;border-radius:22px;' +
    'border:1px solid rgba(196,206,222,.4);background:transparent;color:#dfe6f2;font:600 13px system-ui">' +
    'Recargar &middot; Reload</button>';
  document.body.appendChild(m);
})();
</script>"""
