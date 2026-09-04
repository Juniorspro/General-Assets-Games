# -*- coding: utf-8 -*-
"""El menu principal: empezar, calidad e idioma. Y el selector de niveles se va.

POR QUE SACARLO NO ES SOLO SACARLO: los seis niveles ya se encadenan solos —el
prologo lleva al campo, el campo a la granja, y la cadena 5 -> 6 esta verificada
desde la vuelta 83— asi que la lista de niveles era un atajo de desarrollo
puesto en el menu del jugador. Con "EMPEZAR" el juego arranca en el prologo y de
ahi en adelante lo lleva la historia, que es como estaba pensado.

Y EL ATAJO NO DESAPARECE, SE MUDA A UNA SONDA. `__pb.nivel(n)` salta a un nivel
igual que hacian las fichas: sin eso, los quince planes del banco que empiezan
tocando `.lv[data-lv="6"]` dejarian de poder probar el nivel 6, y una prueba que
no se puede correr no prueba nada.

Y LA PANTALLA DE ARRANQUE (#boot) SE FUSIONA CON EL MENU, no se deja al lado.
Antes el juego abria con una pantalla que solo pedia calidad y que al tocar una
ficha saltaba al menu: dos pantallas seguidas preguntando lo mismo. Con la
calidad y el idioma dentro del menu, `#boot` no tiene nada propio que pedir, asi
que lo que se ve al abrir el juego es directamente el menu principal.

EL IDIOMA CUBRE EL MENU Y LOS AVISOS, Y NO TODO EL JUEGO. Los avisos se traducen
por una TABLA INDEXADA POR EL TEXTO EN CASTELLANO dentro de `showToast`, o sea un
solo parche que cubre los cincuenta que ya hay y los que se agreguen despues; lo
que queda en castellano son las fichas del HUD que llevan un contador adentro
(`Libros 0/5`), porque esas se arman con plantillas en once sitios distintos.
"""

# ══════════════════════════════════════════════════════════════════════════════
# EL MARCADO
# ══════════════════════════════════════════════════════════════════════════════
VIEJO_SUB = '      <div class="sub">SELECCIONA UN NIVEL</div>'
NUEVO_SUB = '      <div class="sub" data-i18n="sub">Un sueño con seis puertas</div>'

VIEJO_Q = """      <div class="qmini" id="qmini">
        <span>CALIDAD</span>
        <button data-q="alta">Alta</button>
        <button data-q="media">Media</button>
        <button data-q="baja">Baja</button>
      </div>"""
NUEVO_Q = """      <button id="menu-play" data-i18n="empezar">EMPEZAR</button>
      <div class="qmini" id="qmini">
        <span data-i18n="calidad">CALIDAD</span>
        <button data-q="alta" data-i18n="alta">Alta</button>
        <button data-q="media" data-i18n="media">Media</button>
        <button data-q="baja" data-i18n="baja">Baja</button>
      </div>
      <div class="qmini" id="imini">
        <span data-i18n="idioma">IDIOMA</span>
        <button data-idi="es">Castellano</button>
        <button data-idi="en">English</button>
        <button data-idi="pt">Português</button>
      </div>"""

CSS = """
  /* el boton de empezar: el unico de la pantalla que tiene que verse de lejos */
  #menu-play {
    display: block; margin: 4vh auto 2.6vh; padding: 1.1em 2.8em;
    font: 700 clamp(15px, 4.4vw, 22px)/1 inherit; letter-spacing: .18em;
    color: #0b0d10; background: #e8eef5; border: 0; border-radius: 2px;
    cursor: pointer; box-shadow: 0 0 0 1px rgba(255,255,255,.25), 0 6px 30px rgba(0,0,0,.5);
  }
  #menu-play:active { transform: translateY(1px); }
  /* la ficha del idioma elegido se marca: un selector sin estado no dice en que
     idioma esta el juego, y es justamente lo que uno viene a mirar */
  #imini button.sel, #qmini button.sel { background: rgba(232,238,245,.9); color: #0b0d10; }
"""

# ══════════════════════════════════════════════════════════════════════════════
# LA PANTALLA DE ARRANQUE SE VA: lo que se ve al abrir ES el menu principal
# ══════════════════════════════════════════════════════════════════════════════
VIEJO_BOOT = '    <div id="boot">\n      <h1>PUERTA BLANCA</h1>\n      <div class="tag">CINCO PISOS. NINGUNA SALIDA F&Aacute;CIL.</div>\n      <div class="q">CALIDAD GR&Aacute;FICA</div>\n      <div class="qrow">\n        <div class="qcard" data-q="alta">\n          <div class="qt">Alta</div>\n          <div class="qd">Resoluci&oacute;n completa, sombras y toda la vegetaci&oacute;n. Para PC.</div>\n        </div>\n        <div class="qcard" data-q="media">\n          <div class="qt">Media</div>\n          <div class="qd">Menos resoluci&oacute;n y densidad, sombras suaves. Equilibrado.</div>\n        </div>\n        <div class="qcard" data-q="baja">\n          <div class="qt">Baja</div>\n          <div class="qd">Sin sombras y menos detalle. Para m&oacute;viles modestos.</div>\n        </div>\n      </div>\n      <div class="hint">Puedes cambiarla en cualquier momento desde el men&uacute; (bot&oacute;n &#9776;).</div>\n    </div>\n'

VIEJO_OPENBOOT = "  function openBoot() {\n    paused = true;\n    bootEl.style.display = 'flex';\n    if (document.pointerLockElement) document.exitPointerLock();\n  }\n  Array.prototype.forEach.call(document.querySelectorAll('.qcard'), (el) => {\n    el.addEventListener('click', () => {\n      applyQuality(el.getAttribute('data-q'));\n      bootEl.style.display = 'none';\n      openMenu();\n    });\n  });\n"

VIEJO_QCARD_SEL = "    Array.prototype.forEach.call(document.querySelectorAll('.qcard'), (el) => {\n      el.classList.toggle('sel', el.getAttribute('data-q') === q);\n    });\n"

VIEJO_BOOTEL = "  const bootEl = document.getElementById('boot');\n"

# EMPEZAR SOLO EXISTE SI NO HAY PARTIDA: desde la pausa, "empezar" volveria al
# prologo y tiraria la partida a la basura sin avisar. Ahi lo que corresponde es
# Continuar, que es el que aparece.
VIEJO_OPEN = """  function openMenu() {
    paused = true;
    menuEl.style.display = 'flex';
    menuResume.style.display = levelStarted ? 'block' : 'none';"""
NUEVO_OPEN = """  function openMenu() {
    paused = true;
    menuEl.style.display = 'flex';
    menuResume.style.display = levelStarted ? 'block' : 'none';
    try { document.getElementById('menu-play').style.display = levelStarted ? 'none' : 'block'; } catch (e) {}
    try { pbMarcaCalidad(); } catch (e) {}"""

# ══════════════════════════════════════════════════════════════════════════════
# EL IDIOMA
# ══════════════════════════════════════════════════════════════════════════════
JS = r"""
  // ==================================================================
  // IDIOMA
  // ==================================================================
  // NO SE GUARDA EN localStorage. Este juego no usa almacenamiento en ninguna
  // parte, y en una ventana privada `localStorage` TIRA: agregar la primera
  // dependencia de disco justo en el arranque del menu es cambiar un juego que
  // no puede fallar por uno que si.
  let pbIdi = (function () {
    const n = (navigator.language || 'es').slice(0, 2).toLowerCase();
    return (n === 'en' || n === 'pt') ? n : 'es';
  })();

  const PB_MENU = {
    es: { sub: 'Un sueño con seis puertas', empezar: 'EMPEZAR', calidad: 'CALIDAD',
          alta: 'Alta', media: 'Media', baja: 'Baja', idioma: 'IDIOMA',
          seguir: 'Continuar' },
    en: { sub: 'A dream with six doors', empezar: 'START', calidad: 'QUALITY',
          alta: 'High', media: 'Medium', baja: 'Low', idioma: 'LANGUAGE',
          seguir: 'Resume' },
    pt: { sub: 'Um sonho com seis portas', empezar: 'COMEÇAR', calidad: 'QUALIDADE',
          alta: 'Alta', media: 'Média', baja: 'Baixa', idioma: 'IDIOMA',
          seguir: 'Continuar' }
  };

  // LOS AVISOS SE TRADUCEN POR EL TEXTO EN CASTELLANO Y NO POR UNA CLAVE, y es
  // lo que permite que sea UN parche en vez de cincuenta: `showToast` busca lo
  // que le llega en esta tabla y lo cambia si esta. Lo que no este pasa tal
  // cual, asi que un aviso sin traducir sale en castellano y nunca vacio.
  const PB_TOAST = {
    en: {
      'Rociaste el aire. La lata pierde una carga igual.': 'You sprayed thin air. The can loses a charge anyway.',
      '\u{1F9F4} Le diste. Se va, y por unos segundos no te busca.': '\u{1F9F4} Direct hit. She backs off, and for a few seconds she is not hunting you.',
      '\u{1F9F4} Lata de insecticida. Apunta y rocia para espantarla.': '\u{1F9F4} Can of bug spray. Aim and spray to scare her off.',
      'Mi alma encontró el descanso que siempre necesité.': 'My soul found the rest it always needed.',
      'No sé dónde estoy ni quién soy, pero ya no importa. Solo quiero salir de aquí.': "I don't know where I am or who I am, but it no longer matters. I just want to get out of here.",
      'Seis puertas, seis sitios, y ninguno era una salida. Fin de esta version de la demo.': 'Six doors, six places, and not one of them was a way out. End of this version of the demo.',
      'Camina hacia la puerta negra…': 'Walk to the black door…',
      'Camina hacia la puerta blanca…': 'Walk to the white door…',
      'Encuentra 3 flores arcoíris 🌈 en el campo': 'Find 3 rainbow flowers 🌈 in the field',
      '🔑 Una puerta se abrió en el centro del campo. Sigue la flecha.': '🔑 A door opened in the middle of the field. Follow the arrow.',
      'El campo vuelve a empezar. Las 3 flores 🌈 están otra vez ahí fuera.': 'The field starts over. The 3 flowers 🌈 are out there again.',
      'Está todo oscuro. Hay algo tirado en el suelo, delante tuyo…': "It's pitch dark. Something is lying on the ground ahead of you…",
      '🔦 Linterna. Toca el botón (o F) para apagarla — la luz atrae cosas': '🔦 Flashlight. Tap the button (or F) to switch it off — light draws things in',
      '⛽ Bidón de gasolina. Llévalo a un generador.': '⛽ Jerrycan. Take it to a generator.',
      'Está seco. Necesita un bidón de gasolina ⛽': "It's dry. It needs a jerrycan ⛽",
      'Solo puedes cargar un bidón a la vez.': 'You can only carry one jerrycan at a time.',
      '⚡ La granja tiene luz. El portón del fondo se abrió.': '⚡ The farm has power. The back gate opened.',
      'La granja vuelve a la oscuridad. Todo desde cero.': 'The farm goes dark again. All over from scratch.',
      '🐕 ¡Corre!': '🐕 Run!',
      'El perro se frena a recuperar aire. Aprovecha.': 'The dog stops to catch its breath. Use it.',
      '🔦 Se asustó con la luz.': '🔦 The light scared it off.',
      'Una escuela. El código está repartido en salones, basureros y los túneles laterales.': 'A school. The code is split between classrooms, bins and the side tunnels.',
      'Código incorrecto.': 'Wrong code.',
      'La escuela se reinicia. El código cambió.': 'The school restarts. The code changed.',
      '🔓 La puerta se abrió. La salida está detrás.': '🔓 The door opened. The exit is behind it.',
      'Biblioteca. Cinco libros perdidos; cada uno va en su estantería.': 'A library. Five lost books; each goes on its own shelf.',
      'Solo puedes cargar un libro a la vez.': 'You can only carry one book at a time.',
      '📚 Los cinco están en su sitio. Se abrió una puerta.': '📚 All five are in place. A door opened.',
      'La biblioteca vuelve a empezar. Los libros están otra vez sueltos.': 'The library starts over. The books are loose again.',
      'Las sierras arrancaron.': 'The saws started up.',
      'Un calabozo. Enciende las 3 antorchas con el mechero. Si lo oyes, escóndete.': 'A dungeon. Light the 3 torches with the lighter. If you hear him, hide.',
      'Enciende el mechero para prenderla.': 'Light the lighter to set it burning.',
      '🔥 Las tres arden. El portón del norte cedió.': '🔥 All three are burning. The north gate gave way.',
      'El calabozo vuelve a empezar. Las antorchas están apagadas.': 'The dungeon starts over. The torches are out.',
      'Te oyó. Busca dónde meterte.': 'He heard you. Find somewhere to hide.',
      'Se quedó quieto. Te está oliendo.': 'He went still. He is smelling you.',
      'Lo tienes encima, no te da tiempo.': "He's on top of you, there's no time.",
      'Algo alto acaba de verte. No dejes que te alcance.': 'Something tall just saw you. Do not let it reach you.',
      '🦍 Te vio. CORRE.': '🦍 It saw you. RUN.',
      '🦇 Algo se soltó del techo.': '🦇 Something dropped from the ceiling.',
      '🦇 Te embistió. Te cuesta moverte unos segundos.': '🦇 It rammed you. Moving is hard for a few seconds.',
      'No matan, pero te dejan aturdido. Alúmbrales la cara para espantarlos.': 'They do not kill, but they daze you. Shine the light in their faces to scare them off.',
      '…algo te escuchó.': '…something heard you.',
      'Un local de comida rapida. Junta las 4 partes, armalas EN ORDEN sobre la bandeja y sali por atras. No pises las telaranas.': 'A fast food place. Collect the 4 parts, stack them IN ORDER on the tray and leave out the back. Do not step on the webs.',
      'Telarana. Estas pegado 3 segundos y te oyo.': 'Web. You are stuck for 3 seconds and it heard you.',
      'Te soltaste.': 'You pulled free.',
      'Hamburguesa armada. La puerta de atras se abrio y ella lo sabe: CORRE.': 'Burger stacked. The back door opened and she knows it: RUN.',
      'El local vuelve a empezar. La bandeja esta vacia otra vez.': 'The store starts over. The tray is empty again.'
    },
    pt: {
      'Rociaste el aire. La lata pierde una carga igual.': 'Voce borrifou o ar. A lata perde uma carga do mesmo jeito.',
      '\u{1F9F4} Le diste. Se va, y por unos segundos no te busca.': '\u{1F9F4} Acertou. Ela recua, e por alguns segundos nao te procura.',
      '\u{1F9F4} Lata de insecticida. Apunta y rocia para espantarla.': '\u{1F9F4} Lata de inseticida. Mire e borrife para espanta-la.',
      'Mi alma encontró el descanso que siempre necesité.': 'Minha alma encontrou o descanso que sempre precisei.',
      'No sé dónde estoy ni quién soy, pero ya no importa. Solo quiero salir de aquí.': 'Não sei onde estou nem quem sou, mas já não importa. Só quero sair daqui.',
      'Seis puertas, seis sitios, y ninguno era una salida. Fin de esta version de la demo.': 'Seis portas, seis lugares, e nenhum era uma saída. Fim desta versão da demo.',
      'Camina hacia la puerta blanca…': 'Caminhe até a porta branca…',
      'Encuentra 3 flores arcoíris 🌈 en el campo': 'Encontre 3 flores arco-íris 🌈 no campo',
      '🔑 Una puerta se abrió en el centro del campo. Sigue la flecha.': '🔑 Uma porta abriu no meio do campo. Siga a flecha.',
      'El campo vuelve a empezar. Las 3 flores 🌈 están otra vez ahí fuera.': 'O campo começa de novo. As 3 flores 🌈 estão lá fora outra vez.',
      'Está todo oscuro. Hay algo tirado en el suelo, delante tuyo…': 'Está tudo escuro. Tem algo no chão, na sua frente…',
      '🔦 Linterna. Toca el botón (o F) para apagarla — la luz atrae cosas': '🔦 Lanterna. Toque no botão (ou F) para apagar — a luz atrai coisas',
      '⛽ Bidón de gasolina. Llévalo a un generador.': '⛽ Galão de gasolina. Leve até um gerador.',
      'Está seco. Necesita un bidón de gasolina ⛽': 'Está seco. Precisa de um galão ⛽',
      'Solo puedes cargar un bidón a la vez.': 'Você só pode carregar um galão por vez.',
      '⚡ La granja tiene luz. El portón del fondo se abrió.': '⚡ A fazenda tem luz. O portão do fundo abriu.',
      'La granja vuelve a la oscuridad. Todo desde cero.': 'A fazenda volta ao escuro. Tudo de novo.',
      '🐕 ¡Corre!': '🐕 Corre!',
      'El perro se frena a recuperar aire. Aprovecha.': 'O cachorro para para respirar. Aproveite.',
      '🔦 Se asustó con la luz.': '🔦 A luz o assustou.',
      'Una escuela. El código está repartido en salones, basureros y los túneles laterales.': 'Uma escola. O código está espalhado por salas, lixeiras e os túneis laterais.',
      'Código incorrecto.': 'Código errado.',
      'La escuela se reinicia. El código cambió.': 'A escola reinicia. O código mudou.',
      '🔓 La puerta se abrió. La salida está detrás.': '🔓 A porta abriu. A saída está atrás.',
      'Biblioteca. Cinco libros perdidos; cada uno va en su estantería.': 'Biblioteca. Cinco livros perdidos; cada um vai na sua estante.',
      'Solo puedes cargar un libro a la vez.': 'Você só pode carregar um livro por vez.',
      '📚 Los cinco están en su sitio. Se abrió una puerta.': '📚 Os cinco estão no lugar. Uma porta abriu.',
      'La biblioteca vuelve a empezar. Los libros están otra vez sueltos.': 'A biblioteca começa de novo. Os livros estão soltos outra vez.',
      'Las sierras arrancaron.': 'As serras ligaram.',
      'Un calabozo. Enciende las 3 antorchas con el mechero. Si lo oyes, escóndete.': 'Um calabouço. Acenda as 3 tochas com o isqueiro. Se ouvir ele, se esconda.',
      'Enciende el mechero para prenderla.': 'Acenda o isqueiro para queimá-la.',
      '🔥 Las tres arden. El portón del norte cedió.': '🔥 As três queimam. O portão do norte cedeu.',
      'El calabozo vuelve a empezar. Las antorchas están apagadas.': 'O calabouço começa de novo. As tochas estão apagadas.',
      'Te oyó. Busca dónde meterte.': 'Ele te ouviu. Ache onde se esconder.',
      'Se quedó quieto. Te está oliendo.': 'Ele parou. Está te farejando.',
      'Lo tienes encima, no te da tiempo.': 'Está em cima de você, não dá tempo.',
      'Algo alto acaba de verte. No dejes que te alcance.': 'Algo alto acabou de te ver. Não deixe chegar perto.',
      '🦍 Te vio. CORRE.': '🦍 Ele te viu. CORRE.',
      '🦇 Algo se soltó del techo.': '🦇 Algo se soltou do teto.',
      '🦇 Te embistió. Te cuesta moverte unos segundos.': '🦇 Te acertou. Custa se mover por alguns segundos.',
      'No matan, pero te dejan aturdido. Alúmbrales la cara para espantarlos.': 'Não matam, mas te deixam tonto. Ilumine a cara deles para espantar.',
      '…algo te escuchó.': '…algo te escutou.',
      'Un local de comida rapida. Junta las 4 partes, armalas EN ORDEN sobre la bandeja y sali por atras. No pises las telaranas.': 'Uma lanchonete. Junte as 4 partes, monte NA ORDEM na bandeja e saia pelos fundos. Não pise nas teias.',
      'Telarana. Estas pegado 3 segundos y te oyo.': 'Teia. Você fica preso 3 segundos e ela te ouviu.',
      'Te soltaste.': 'Você se soltou.',
      'Hamburguesa armada. La puerta de atras se abrio y ella lo sabe: CORRE.': 'Hambúrguer montado. A porta dos fundos abriu e ela sabe: CORRE.',
      'Camina hacia la puerta negra…': 'Caminhe até a porta preta…',
      'El local vuelve a empezar. La bandeja esta vacia otra vez.': 'A loja começa de novo. A bandeja está vazia outra vez.'
    }
  };

  function pbTrad(t) {
    const tb = PB_TOAST[pbIdi];
    return (tb && tb[t]) ? tb[t] : t;
  }

  function pbPintaIdioma() {
    const t = PB_MENU[pbIdi] || PB_MENU.es;
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      const k = el.getAttribute('data-i18n');
      if (t[k]) el.textContent = t[k];
    });
    // el boton de continuar no lleva data-i18n porque su texto lo pisa el menu
    try { menuResume.textContent = t.seguir; } catch (e) {}
    Array.prototype.forEach.call(document.querySelectorAll('#imini button'), function (b) {
      b.classList.toggle('sel', b.getAttribute('data-idi') === pbIdi);
    });
  }
  function pbMarcaCalidad() {
    Array.prototype.forEach.call(document.querySelectorAll('#qmini button'), function (b) {
      b.classList.toggle('sel', b.getAttribute('data-q') === quality);
    });
  }
"""

# el cableado, despues de que existan `quality` y `startLevel`
WIRE = r"""
  document.getElementById('menu-play').addEventListener('click', function (e) {
    e.preventDefault();
    // EMPEZAR ARRANCA EN EL PROLOGO Y LA HISTORIA HACE EL RESTO: los seis
    // niveles se encadenan solos, en orden sorteado. La mezcla va ACA y no al
    // cargar el modulo: sorteada una sola vez, volver al menu y empezar otra
    // vez daria exactamente la misma partida.
    pbMezclaOrden();
    startLevel(0);
  });
  Array.prototype.forEach.call(document.querySelectorAll('#imini button'), function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      pbIdi = b.getAttribute('data-idi');
      pbPintaIdioma();
    });
  });
  pbPintaIdioma();
  pbMarcaCalidad();
"""
