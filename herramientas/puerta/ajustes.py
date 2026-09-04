# -*- coding: utf-8 -*-
"""El juego traducido ENTERO, y el panel de pausa con volumen y sensibilidad.

LA LISTA DE LO QUE FALTABA NO ESTA ESCRITA A MANO: sale de `__pb.textos()`, que
barre todos los nodos de texto y los placeholders del documento con el juego
puesto en otro idioma. Medido, quedaban DIECINUEVE cadenas en castellano de las
47 visibles — la linea de ayuda, las fichas del HUD, los tres colores del codigo,
el teclado, CORRER, ESCONDERSE, las cuatro partes de la hamburguesa, ATRAPADO y
el cartel del final. "Traducilo todo" con una lista a mano siempre se queda
corta; con el barrido, el numero que queda es cero.

Y LAS FICHAS CON CONTADOR ADENTRO SON EL CASO DIFICIL: `'📚 Libros ' + n + '/5'`
esta escrito en tres sitios distintos, asi que traducirlas es traducir un
PATRON y no una cadena. `pbT(clave, ...)` resuelve el patron del idioma actual y
`pbUI(el, clave, ...)` ademas SE ACUERDA de los argumentos, que es lo que
permite repintar el HUD al cambiar de idioma en medio de una partida: sin eso, la
ficha se queda en el idioma viejo hasta la proxima vez que cambie su numero.

LO QUE NO SE TRADUCE, A PROPOSITO: el marcado de la cinta de video —PLAY, SP ·
CAM 01, TRACKING y la fecha— porque no es interfaz del juego sino el cartelito
de una videocasetera, y esos aparatos lo escriben en ingles en todo el mundo.

EL PANEL DE PAUSA: tres barras y el boton que ya existia.
  · Musica y efectos van a DOS BUSES distintos y no a un volumen general: es la
    unica forma de que bajar la musica no baje tambien el grito.
  · Los osciladores de respaldo tambien pasan por el bus de efectos. Colgaban de
    `ctx.destination` en once sitios, o sea que la barra no los habria tocado y
    el dia que una muestra no decodifique el jugador tendria un efecto que no
    puede bajar.
  · La sensibilidad multiplica los dos sitios que mueven la vista —el raton
    (0,0026) y el dedo (0,0038)— y no uno: con uno solo, la barra funciona en
    PC y no en el telefono, que es justamente donde se juega.
  · NO SE GUARDA EN DISCO. Este juego no usa `localStorage` en ninguna parte y
    en una ventana privada tira; agregar la primera dependencia de disco por
    tres barras es cambiar un juego que no puede fallar por uno que si.
"""

# ══════════════════════════════════════════════════════════════════════════════
# LA TABLA
# ══════════════════════════════════════════════════════════════════════════════
JS = r"""
  // ==================================================================
  // LA INTERFAZ, EN LOS TRES IDIOMAS
  // ==================================================================
  const PB_UI = {
    es: {
      info: 'Joystick para moverte · arrastra para mirar · botón CORRER para esprintar',
      tapLock: 'Haz clic para capturar el mouse · Shift para correr',
      correr: 'CORRER', shift: 'SHIFT', esconderse: 'ESCONDERSE', salir: 'SALIR',
      libros: '&#128218; Libros {0}/{1}', llevas: 'Llevas: {0}',
      libroLlevas: 'Llevas un libro',
      antorchas: '&#128293; Antorchas {0}/{1}',
      generadores: '&#9889; Generadores {0}/{1}',
      bidon: '&#9981; Llevas un bidón',
      codigo: '&#128274; Código de salida',
      cdDigitos: 'Introduce los 3 dígitos en ese orden',
      rojo: 'ROJO', azul: 'AZUL', amarillo: 'AMARILLO',
      rojoC: 'ROJO', azulC: 'AZUL', amarilloC: 'AMAR.',
      cQred: 'ROJO ?', cQblue: 'AZUL ?', cQyellow: 'AMAR. ?',
      partes: '&#127828; Partes {0}/4',
      partesLista: '&#127828; Lista &#183; sali por atras',
      insecticida: '&#129524; Insecticida {0}', rociar: 'ROCIAR',
      reiniciar: 'Reiniciar nivel',
      pan: 'PAN', carne: 'CARNE', queso: 'QUESO', tapaHb: 'TAPA',
      atrapado: 'ATRAPADO',
      finTitulo: '🌟 ¡Encontraste la salida!',
      finTexto: 'Cruzaste la puerta con la llave de las flores arcoíris. Fin de esta versión de la demo.',
      deNuevo: 'Jugar de nuevo',
      musica: 'MÚSICA', efectos: 'EFECTOS', sensib: 'SENSIBILIDAD'
    },
    en: {
      info: 'Joystick to move · drag to look · RUN button to sprint',
      tapLock: 'Click to capture the mouse · Shift to run',
      correr: 'RUN', shift: 'SHIFT', esconderse: 'HIDE', salir: 'GET OUT',
      libros: '&#128218; Books {0}/{1}', llevas: 'Carrying: {0}',
      libroLlevas: 'Carrying a book',
      antorchas: '&#128293; Torches {0}/{1}',
      generadores: '&#9889; Generators {0}/{1}',
      bidon: '&#9981; Carrying a jerrycan',
      codigo: '&#128274; Exit code',
      cdDigitos: 'Enter the 3 digits in that order',
      rojo: 'RED', azul: 'BLUE', amarillo: 'YELLOW',
      rojoC: 'RED', azulC: 'BLUE', amarilloC: 'YEL.',
      cQred: 'RED ?', cQblue: 'BLUE ?', cQyellow: 'YEL. ?',
      partes: '&#127828; Parts {0}/4',
      partesLista: '&#127828; Ready &#183; out the back',
      insecticida: '&#129524; Bug spray {0}', rociar: 'SPRAY',
      reiniciar: 'Restart level',
      pan: 'BUN', carne: 'PATTY', queso: 'CHEESE', tapaHb: 'TOP',
      atrapado: 'STUCK',
      finTitulo: '🌟 You found the way out!',
      finTexto: 'You crossed the door with the rainbow-flower key. End of this version of the demo.',
      deNuevo: 'Play again',
      musica: 'MUSIC', efectos: 'SOUND FX', sensib: 'SENSITIVITY'
    },
    pt: {
      info: 'Joystick para andar · arraste para olhar · botão CORRER para sprintar',
      tapLock: 'Clique para capturar o mouse · Shift para correr',
      correr: 'CORRER', shift: 'SHIFT', esconderse: 'ESCONDER', salir: 'SAIR',
      libros: '&#128218; Livros {0}/{1}', llevas: 'Levando: {0}',
      libroLlevas: 'Levando um livro',
      antorchas: '&#128293; Tochas {0}/{1}',
      generadores: '&#9889; Geradores {0}/{1}',
      bidon: '&#9981; Levando um galão',
      codigo: '&#128274; Código de saída',
      cdDigitos: 'Digite os 3 números nessa ordem',
      rojo: 'VERMELHO', azul: 'AZUL', amarillo: 'AMARELO',
      rojoC: 'VERM.', azulC: 'AZUL', amarilloC: 'AMAR.',
      cQred: 'VERM. ?', cQblue: 'AZUL ?', cQyellow: 'AMAR. ?',
      partes: '&#127828; Partes {0}/4',
      partesLista: '&#127828; Pronto &#183; sai por tras',
      insecticida: '&#129524; Inseticida {0}', rociar: 'BORRIFAR',
      reiniciar: 'Reiniciar nivel',
      pan: 'PÃO', carne: 'CARNE', queso: 'QUEIJO', tapaHb: 'TAMPA',
      atrapado: 'PRESO',
      finTitulo: '🌟 Você achou a saída!',
      finTexto: 'Você cruzou a porta com a chave das flores arco-íris. Fim desta versão da demo.',
      deNuevo: 'Jogar de novo',
      musica: 'MÚSICA', efectos: 'EFEITOS', sensib: 'SENSIBILIDADE'
    }
  };

  function pbT(clave) {
    const t = (PB_UI[pbIdi] || PB_UI.es)[clave];
    if (t === undefined) return clave;
    let s = t;
    for (let i = 1; i < arguments.length; i++) {
      s = s.split('{' + (i - 1) + '}').join(arguments[i]);
    }
    return s;
  }

  // ESCRIBE Y SE ACUERDA. Los argumentos quedan guardados en el elemento, asi
  // que al cambiar de idioma se puede repintar la ficha con su valor actual —
  // sin esto se queda en el idioma viejo hasta que su numero cambie.
  const PB_UI_VIVOS = [];
  function pbUI(el) {
    if (!el) return;
    const args = Array.prototype.slice.call(arguments, 1);
    el.__pbUI = args;
    if (PB_UI_VIVOS.indexOf(el) < 0) PB_UI_VIVOS.push(el);
    el.innerHTML = pbT.apply(null, args);
  }
  function pbRepintaHud() {
    for (let i = 0; i < PB_UI_VIVOS.length; i++) {
      const el = PB_UI_VIVOS[i];
      if (el.__pbUI) el.innerHTML = pbT.apply(null, el.__pbUI);
    }
    // EL MARCADO ESTATICO. `data-uia` lleva los argumentos del patron (JSON), asi
    // que una ficha con contador se puede escribir en el HTML sin que el idioma
    // la deje en castellano hasta que su numero cambie por primera vez.
    Array.prototype.forEach.call(document.querySelectorAll('[data-ui]'), function (e) {
      if (e.__pbUI) return;   // ya la maneja pbUI con su valor de verdad
      let a = [e.getAttribute('data-ui')];
      const ex = e.getAttribute('data-uia');
      if (ex) { try { a = a.concat(JSON.parse(ex)); } catch (er) {} }
      e.innerHTML = pbT.apply(null, a);
    });
  }

  // los dos nombres de un color del codigo: el corto de la ficha y el largo
  // del aviso. Una sola tabla, asi que no pueden decir cosas distintas.
  function pbColC(k) { return pbT(k === 'red' ? 'rojoC' : (k === 'blue' ? 'azulC' : 'amarilloC')); }
  function pbColL(k) { return pbT(k === 'red' ? 'rojo' : (k === 'blue' ? 'azul' : 'amarillo')); }

  // ==================================================================
  // AJUSTES: DOS BUSES DE AUDIO Y LA SENSIBILIDAD
  // ==================================================================
  let pbBusMus = null, pbBusFx = null;
  let pbVolMus = 0.75, pbVolFx = 0.9, pbSens = 1;

  function pbBuses(ctx) {
    if (!ctx || !pbSonMaster || pbBusMus) return;
    pbBusMus = ctx.createGain(); pbBusMus.gain.value = pbVolMus;
    pbBusFx = ctx.createGain();  pbBusFx.gain.value = pbVolFx;
    pbBusMus.connect(pbSonMaster);
    pbBusFx.connect(pbSonMaster);
  }
  // LOS OSCILADORES DE RESPALDO TAMBIEN PASAN POR EL BUS. Colgaban de
  // `ctx.destination`, o sea que la barra de efectos no los habria tocado.
  function pbSalidaFx(ctx) {
    pbBuses(ctx);
    return pbBusFx || ctx.destination;
  }
  function pbSalidaMus(ctx) {
    pbBuses(ctx);
    return pbBusMus || ctx.destination;
  }
  function pbPonVol(cual, v) {
    v = Math.max(0, Math.min(1, v));
    if (cual === 'mus') { pbVolMus = v; if (pbBusMus) pbBusMus.gain.value = v; }
    else { pbVolFx = v; if (pbBusFx) pbBusFx.gain.value = v; }
    return v;
  }
"""

# ══════════════════════════════════════════════════════════════════════════════
# EL PANEL: LAS TRES BARRAS
# ══════════════════════════════════════════════════════════════════════════════
MARCA_PANEL = '      <button id="menu-resume">Continuar</button>'
PANEL = """      <div class="pbaj">
        <label><span data-ui="musica">MÚSICA</span><input id="sMus" type="range" min="0" max="100" value="75"><i id="vMus">75</i></label>
        <label><span data-ui="efectos">EFECTOS</span><input id="sFx" type="range" min="0" max="100" value="90"><i id="vFx">90</i></label>
        <label><span data-ui="sensib">SENSIBILIDAD</span><input id="sSens" type="range" min="40" max="200" value="100"><i id="vSens">1.00</i></label>
      </div>
      <button id="menu-resume">Continuar</button>
      <button id="menu-restart" class="pbsec" data-ui="reiniciar">Reiniciar nivel</button>"""

CSS = """
  /* REINICIAR: secundario a proposito. Con el mismo peso que CONTINUAR, el
     boton que descarta lo hecho en el nivel se toca por error tanto como el que
     sigue jugando. */
  #menu-restart {
    display: none; margin-top: 0.8vh;
    background: transparent; border: 1px solid rgba(196,206,222,.34);
    color: rgba(210,218,232,.80);
  }
  #menu-restart:hover { border-color: rgba(255,150,150,.55); color: #ffd9d9; }
  /* las tres barras del panel de pausa */
  .pbaj { width: min(86%, 340px); margin: 1.4vh auto 0.4vh; }
  .pbaj label {
    display: flex; align-items: center; gap: 10px; margin: 1.05vh 0;
    font: 600 clamp(9px, 2.7vw, 11px)/1 inherit; letter-spacing: .14em;
    color: rgba(196,206,222,.72);
  }
  .pbaj label span { flex: 0 0 8.5em; text-align: left; }
  .pbaj input[type=range] {
    flex: 1 1 auto; -webkit-appearance: none; appearance: none;
    height: 3px; border-radius: 2px; background: rgba(255,255,255,.18); outline: none;
  }
  .pbaj input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
    background: #e8eef5; border: 0; cursor: pointer;
  }
  .pbaj input[type=range]::-moz-range-thumb {
    width: 18px; height: 18px; border-radius: 50%; background: #e8eef5; border: 0; cursor: pointer;
  }
  .pbaj i { flex: 0 0 2.8em; text-align: right; font-style: normal; color: rgba(232,238,245,.9); }
"""

WIRE = r"""
  document.getElementById('menu-restart')
    .addEventListener('click', function (e) { e.preventDefault(); pbReinicia(); });
  (function () {
    const sm = document.getElementById('sMus'), sf = document.getElementById('sFx'),
          ss = document.getElementById('sSens'),
          vm = document.getElementById('vMus'), vf = document.getElementById('vFx'),
          vs = document.getElementById('vSens');
    function mus() { vm.textContent = sm.value; pbPonVol('mus', sm.value / 100); }
    function fx()  { vf.textContent = sf.value; pbPonVol('fx',  sf.value / 100); }
    function sen() { pbSens = ss.value / 100; vs.textContent = pbSens.toFixed(2); }
    // `input` y no `change`: en un telefono `change` no llega hasta que se
    // suelta el dedo, y una barra de volumen que no se oye mientras se mueve
    // obliga a adivinar.
    sm.addEventListener('input', mus);
    sf.addEventListener('input', fx);
    ss.addEventListener('input', sen);
    mus(); fx(); sen();
  })();
"""
