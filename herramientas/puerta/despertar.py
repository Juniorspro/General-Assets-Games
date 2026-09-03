# -*- coding: utf-8 -*-
"""El prologo abre con el jugador despertandose en el piso, y una linea.

Pedido: *"haz que al principio en la habitacion negra haya una animacion del
jugador despertandose en el piso y diciendo 'nose donde estoy o quien soy, pero
ya no importa solo quiero salir de aqui'"*.

POR QUE NO ES UN VIDEO NI UNA SEGUNDA ESCENA: el cuarto ya existe y ya esta
iluminado; lo unico que falta es DONDE ESTA EL OJO y que no se pueda caminar
todavia. Asi que esto es una funcion del tiempo que escribe la altura del ojo,
el cabeceo y el alabeo, igual que la agachada y el escondite, que ya escriben
`pitchObj.position.y`. Cero geometria nueva y cero assets.

DESPERTARSE SON TRES COSAS Y NINGUNA SOLA ALCANZA:
  1. **La altura del ojo**, de 0,18 a 1,70. Con la cabeza a diez centimetros del
     piso lo que se ve es el zocalo y el suelo, que es lo que se ve tirado.
  2. **El alabeo**, de 1,12 rad a 0. Sin eso no esta TIRADO: esta agachado. La
     cabeza apoyada de costado es lo que dice que el cuerpo esta en el piso.
  3. **Los parpados**, que son dos bandas negras que se separan. Un fundido
     desde negro se lee a transicion de video; dos bandas que se abren, se
     cierran a medias y se vuelven a abrir se leen a alguien abriendo los ojos.
     Es la misma leccion que Eco: un fundido no es un parpado.

Y SE PUEDE SALTEAR con un toque o una tecla despues del primer segundo. Son ocho
segundos que se ven una vez por partida, pero el que ya los vio no tiene por que
volver a esperarlos — es la leccion de POMPOM.
"""

MARCA = '    <div id="toast"></div>'

MARCADO = """    <div id="toast"></div>
    <div id="pb-parp"><i></i><i></i></div>
    <div id="pb-habla"></div>"""

CSS = """
  /* LOS PARPADOS: dos bandas y no un velo. Van por encima del HUD (15) y por
     DEBAJO del menu (18): un parpado tapa el juego, no la pantalla de pausa. */
  #pb-parp { position: absolute; inset: 0; pointer-events: none; z-index: 16; display: none; }
  #pb-parp i { position: absolute; left: -2%; width: 104%; height: 0; background: #000; display: block; }
  #pb-parp i:first-child { top: 0; }
  #pb-parp i:last-child { bottom: 0; }
  /* LA LINEA VA EN EL MEDIO Y NO EN LA FRANJA DEL AVISO: un aviso dice que
     hacer, esto es alguien hablando. */
  #pb-habla {
    position: absolute; left: 8%; right: 8%; top: 50%; z-index: 17;
    text-align: center; font: 400 clamp(14px, 4.2vw, 20px)/1.5 inherit;
    color: #eef2f8; text-shadow: 0 0 18px rgba(0,0,0,1), 0 2px 10px rgba(0,0,0,1);
    opacity: 0; transition: opacity .7s ease; pointer-events: none;
  }
  /* MIENTRAS SE DESPIERTA NO HAY INTERFAZ. Medido en la captura: se veian la
     mira, el joystick, el boton de correr y el reloj de la cinta encima de un
     plano en el que el jugador no puede hacer ninguna de esas cosas — un
     joystick dibujado sobre una escena que no responde se lee a juego trabado. */
  body.pb-desp #crosshair,
  body.pb-desp #joystick-zone,
  body.pb-desp #run-btn,
  body.pb-desp #light-btn,
  body.pb-desp #menu-btn,
  body.pb-desp #vhs-hud,
  body.pb-desp #info,
  body.pb-desp #tap-lock-hint { display: none !important; }
"""

JS = r"""
  // ==================================================================
  // DESPERTARSE EN EL PISO
  // ==================================================================
  const PB_PARP = document.getElementById('pb-parp');
  const PB_PARP_A = PB_PARP.firstElementChild;
  const PB_PARP_B = PB_PARP.lastElementChild;
  const PB_HABLA = document.getElementById('pb-habla');
  const PB_DESP_FRASE = 'No sé dónde estoy ni quién soy, pero ya no importa. Solo quiero salir de aquí.';
  const PB_DESP = { on: false, t: 0, dur: 8.4, fijo: false };

  // LOS PARPADOS COMO UNA TABLA DE TIEMPOS Y NO COMO SENOS: un parpadeo no es
  // periodico. Cada par es (segundo, cuanto esta cerrado el ojo de 0 a 1), y se
  // interpola entre uno y el siguiente.
  const PB_PARPADEO = [
    [0.00, 1.00], [1.15, 1.00], [1.55, 0.42], [1.95, 0.92],
    [2.55, 0.20], [3.05, 0.62], [3.85, 0.06], [4.60, 0.00]
  ];
  function pbParpado(t) {
    const T = PB_PARPADEO;
    if (t <= T[0][0]) return T[0][1];
    for (let i = 1; i < T.length; i++) {
      if (t <= T[i][0]) {
        const k = (t - T[i - 1][0]) / (T[i][0] - T[i - 1][0]);
        const s = k * k * (3 - 2 * k); // suave en las dos puntas: un parpado frena
        return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * s;
      }
    }
    return T[T.length - 1][1];
  }

  function pbDespiertaEmpieza() {
    PB_DESP.on = true;
    PB_DESP.t = 0;
    PB_PARP.style.display = 'block';
    PB_HABLA.textContent = pbTrad(PB_DESP_FRASE);
    PB_HABLA.style.opacity = '0';
    document.body.classList.add('pb-desp');
    yaw = 0; lastYaw = 0; pitch = -0.62;
  }

  function pbDespiertaTermina() {
    if (!PB_DESP.on) return;
    PB_DESP.on = false;
    PB_PARP.style.display = 'none';
    PB_PARP_A.style.height = '0';
    PB_PARP_B.style.height = '0';
    PB_HABLA.style.opacity = '0';
    document.body.classList.remove('pb-desp');
    pitch = 0;
    pitchObj.position.y = EYE_HEIGHT;
    pitchObj.rotation.x = 0;
    camera.rotation.z = 0;
    currentRoll = 0;
    showToast('Camina hacia la puerta blanca…', 4200);
  }

  function pbDespiertaPaso(delta) {
    // `fijo` es para el banco: sin el, la sonda pone un instante y el bucle lo
    // corre antes de que se saque la foto, asi que la captura no es del
    // instante que se pidio. Es la misma leccion que ya costo una vuelta en
    // BARRIO con la cinematica.
    if (!PB_DESP.fijo) PB_DESP.t += delta;
    const t = PB_DESP.t;

    const c = pbParpado(t) * 50;
    PB_PARP_A.style.height = c.toFixed(2) + '%';
    PB_PARP_B.style.height = c.toFixed(2) + '%';

    // LEVANTARSE ARRANCA DESPUES DE ABRIR LOS OJOS, no a la vez: mirando la
    // captura, subiendo desde el primer cuadro el cuerpo ya estaba de pie
    // cuando los parpados todavia estaban cerrados, y entonces el plano no
    // muestra a nadie tirado en el piso.
    const k = Math.min(Math.max((t - 3.5) / 3.3, 0), 1);
    const s = k * k * (3 - 2 * k);
    pitchObj.position.y = 0.18 + (EYE_HEIGHT - 0.18) * s;
    // el alabeo se va ANTES que la altura: primero se endereza la cabeza y
    // despues el cuerpo se levanta, que es el orden en que lo hace una persona
    const kr = Math.min(Math.max((t - 3.5) / 2.2, 0), 1);
    const sr = kr * kr * (3 - 2 * kr);
    const roll = 1.12 * (1 - sr);
    pitch = -0.62 * (1 - s) + Math.sin(t * 1.7) * 0.012 * (1 - s);

    player.rotation.y = yaw;
    pitchObj.rotation.x = pitch;
    camera.position.set(0, Math.sin(t * 2.3) * 0.008, 0);
    camera.rotation.z = roll;
    currentRoll = roll;

    if (t > 2.9 && PB_HABLA.style.opacity !== '1') PB_HABLA.style.opacity = '1';
    if (t > 7.2 && PB_HABLA.style.opacity !== '0') PB_HABLA.style.opacity = '0';
    if (!PB_DESP.fijo && t >= PB_DESP.dur) pbDespiertaTermina();
  }
"""

# el bucle: mientras se despierta no se camina
VIEJO_LOOP = """      } else if (!paused && gameState !== 'end') {
        updateMovement(delta, elapsedTime);
      }"""
NUEVO_LOOP = """      } else if (PB_DESP.on && !paused) {
        // NO SE LLAMA A updateMovement A PROPOSITO: esa funcion escribe la
        // altura del ojo, el cabeceo y el alabeo al final, asi que corriendo
        // las dos el ultimo en escribir gana y la animacion se pisa sola.
        pbDespiertaPaso(delta);
      } else if (!paused && gameState !== 'end') {
        updateMovement(delta, elapsedTime);
      }"""

# enterRoom arranca la animacion en vez de dar la instruccion de una
VIEJO_ROOM = """    stamina = 100;
    showToast('Camina hacia la puerta blanca…', 4200);
    transitioning = false;
  }"""
NUEVO_ROOM = """    stamina = 100;
    // EL AVISO SE MUDA AL FINAL DE LA ANIMACION: 'camina hacia la puerta' con
    // el jugador todavia tirado en el piso y sin control es una instruccion que
    // no se puede seguir, y para cuando se puede el aviso ya se fue.
    pbDespiertaEmpieza();
    transitioning = false;
  }"""

# saltear: cualquier toque o tecla despues del primer segundo
SALTA = r"""
  // SE PUEDE SALTEAR DESPUES DEL PRIMER SEGUNDO, no antes: el mismo toque que
  // apreto EMPEZAR llega a veces como un segundo evento y se la comeria entera.
  (function () {
    const salta = function () { if (PB_DESP.on && PB_DESP.t > 1) pbDespiertaTermina(); };
    window.addEventListener('pointerdown', salta, true);
    window.addEventListener('keydown', salta, true);
  })();
"""
