# -*- coding: utf-8 -*-
"""El epilogo: un cuarto todo blanco con una puerta negra, y ahi termina.

Pedido: *"cuando el jugador pase la ultima puerta del ultimo nivel sea llevado a
una habitacion totalmente blanca con una puerta negra y cuando el jugador pase
por esa puerta el juego acabe y el jugador diga «mi alma encontro el descanso
que siempre necesito»"*.

ES EL PROLOGO DADO VUELTA, Y ESO NO ES UN JUEGO DE PALABRAS: es la razon por la
que las medidas son las mismas. El cuarto negro con la puerta blanca abre el
juego; el cuarto blanco con la puerta negra lo cierra. Reusar el mismo cajon de
12 x 20 x 6 y el mismo limite de choque significa que la geometria y el
disparador de la puerta ya estan probados, y que las dos piezas se leen como la
misma habitacion vista al final.

UN BLANCO PLANO NO ES UN CUARTO, ES UNA PANTALLA EN BLANCO. Si el piso, las
paredes y el techo son el mismo blanco y la luz es pareja, no hay una sola
arista que se lea y lo que se ve es un rectangulo vacio. Hacen falta tres cosas:
  · **tres blancos distintos** (piso mas frio, paredes mas claras, techo apenas
    gris), que es lo que dibuja las esquinas;
  · **un hemisferico con el suelo CLARO** —al reves del resto del juego, donde
    el suelo del hemisferico es casi negro—, porque aca lo que rebota es blanco;
  · y **un lienzo propio de yeso casi blanco**, que deja el grano: sin el, la
    pared es un color liso y se lee a plano de CSS.

Y EL MAPA NO PUEDE SER `TEX.wall`. Fue el primer intento y salio GRIS OSCURO
—medido con `__pb.brillo`, las cinco franjas entre 48 y 86 sobre 255— porque
desde la vuelta 85 esa textura es una FOTO DE HORMIGON SUCIO, y three.js
multiplica `map x color`: el tinte casi blanco sobre una foto oscura devuelve la
foto oscura. El cuarto blanco necesita su propio lienzo.

LA PUERTA NEGRA VA CON MARCO. Un rectangulo negro puro sobre una pared blanca se
lee a agujero en el render, no a puerta; el marco gris claro y el umbral en el
piso son lo que la vuelven una puerta. Y el negro va SIN LUZ (`MeshBasic`), asi
que ninguna luz la puede levantar: tiene que ser lo unico oscuro del cuadro.

LA FRASE LA DICE EL JUGADOR, ASI QUE VA COMO SUBTITULO Y NO EN EL CARTEL DEL
FINAL. Reusa `#pb-habla`, que es el mismo sitio donde habla al despertarse: los
dos son la misma voz, al principio y al final.
"""

JS = r"""
  // ==================================================================
  // EL EPILOGO: EL CUARTO BLANCO
  // ==================================================================
  const blancoGroup = new THREE.Group();
  blancoGroup.visible = false;
  scene.add(blancoGroup);

  const BLANCO = { minX: -5, maxX: 5, minZ: -9, maxZ: 8 };
  const BL_PUERTA = new THREE.Vector3(0, 0, -9.4);

  // EL LIENZO DEL YESO: casi blanco, con grano. No usa `TEX.wall` porque esa
  // es la foto de hormigon sucio y el producto `map x color` la devuelve
  // oscura por mas blanco que sea el tinte.
  const blTex = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#fbfbfa'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 5200; i++) {
      const v = 236 + Math.floor(Math.random() * 20);
      g.fillStyle = 'rgb(' + v + ',' + v + ',' + (v - 1) + ')';
      g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    return t;
  })();

  // TRES BLANCOS DISTINTOS: es lo unico que dibuja las esquinas de un cuarto
  // blanco. Con uno solo, el cuarto es un rectangulo vacio.
  const blPared = new THREE.MeshStandardMaterial({
    map: blTex, color: 0xffffff, roughness: 0.94, metalness: 0.0
  });
  const blPiso = new THREE.MeshStandardMaterial({
    map: blTex, color: 0xd2d8e2, roughness: 0.58, metalness: 0.05
  });
  const blTecho = new THREE.MeshStandardMaterial({
    map: blTex, color: 0xc6c6c4, roughness: 0.96, metalness: 0.0
  });

  const blSuelo = new THREE.Mesh(new THREE.PlaneGeometry(12, 20), blPiso);
  blSuelo.rotation.x = -Math.PI / 2;
  blSuelo.position.set(0, 0, -0.5);
  blancoGroup.add(blSuelo);

  const blCielo = new THREE.Mesh(new THREE.PlaneGeometry(12, 20), blTecho);
  blCielo.rotation.x = Math.PI / 2;
  blCielo.position.set(0, 6, -0.5);
  blancoGroup.add(blCielo);

  const blGeoLR = new THREE.PlaneGeometry(20, 6);
  const blIzq = new THREE.Mesh(blGeoLR, blPared);
  blIzq.position.set(-6, 3, -0.5); blIzq.rotation.y = Math.PI / 2;
  blancoGroup.add(blIzq);
  const blDer = blIzq.clone(); blDer.position.x = 6; blDer.rotation.y = -Math.PI / 2;
  blancoGroup.add(blDer);

  const blFondo = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), blPared);
  blFondo.position.set(0, 3, 8.5); blFondo.rotation.y = Math.PI;
  blancoGroup.add(blFondo);

  const blFrente = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), blPared);
  blFrente.position.set(0, 3, -9.6);
  blancoGroup.add(blFrente);

  // LA PUERTA NEGRA. Sin luz a proposito: tiene que ser lo unico oscuro del
  // cuadro y ninguna luz puede levantarla.
  const blNegro = new THREE.MeshBasicMaterial({ color: 0x05050a });
  const blHoja = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.5), blNegro);
  blHoja.position.set(0, 1.75, -9.55);
  blancoGroup.add(blHoja);

  // el marco: un rectangulo negro sin marco se lee a agujero en el render
  const blMarcoMat = new THREE.MeshStandardMaterial({
    // EL MARCO TUVO QUE OSCURECERSE. Con 0xbfc2c8 sobre una pared que mide 242
    // de 255 no se veia ninguno: el marco desaparecia y quedaba un rectangulo
    // negro flotando, que es justo lo que el marco existe para evitar.
    color: 0x7c8188, roughness: 0.7, metalness: 0.08
  });
  function blViga(w, h, x, y) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), blMarcoMat);
    m.position.set(x, y, -9.5);
    blancoGroup.add(m);
  }
  blViga(0.20, 3.72, -1.05, 1.86);
  blViga(0.20, 3.72, 1.05, 1.86);
  blViga(2.30, 0.20, 0, 3.62);
  // el umbral en el piso, que es lo que dice que se puede pasar
  const blUmbral = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.5), blMarcoMat);
  blUmbral.position.set(0, 0.02, -9.2);
  blancoGroup.add(blUmbral);

  // LA LUZ: hemisferico con el SUELO CLARO, al reves que en todo el resto del
  // juego. Lo que rebota aca es blanco, asi que un suelo oscuro deja el piso y
  // la parte de abajo de las paredes en gris sucio.
  const blHemi = new THREE.HemisphereLight(0xffffff, 0xdfe3ea, 1.15);
  blHemi.visible = false;
  scene.add(blHemi);
  const blAmb = new THREE.AmbientLight(0xffffff, 0.85);
  blAmb.visible = false;
  scene.add(blAmb);

  function blancoLuces(v) { blHemi.visible = v; blAmb.visible = v; }

  const BL_FRASE = 'Mi alma encontró el descanso que siempre necesité.';
  const BL = { fin: 0, hecho: false };   // `fin` > 0 mientras corre el cierre

  function entraBlanco() {
    gameState = 'white';
    hideAllLevels();
    blancoGroup.visible = true;
    blancoLuces(true);
    setEnvironment('room');            // apaga el sol, el cielo y las otras luces
    scene.background = new THREE.Color(0xf2f4f7);
    scene.fog = new THREE.FogExp2(0xf2f4f7, 0.012);
    roomAmbient.visible = false;
    doorLight.visible = false;
    player.position.set(0, 0, 6);
    groundY = 0;
    yaw = 0; lastYaw = 0; pitch = 0;
    obstacles = [];
    boxObstacles = [];
    boundary = BLANCO;
    boundaryType = 'box';
    stamina = 100;
    BL.fin = 0; BL.hecho = false;
    PB_HABLA.style.opacity = '0';
    showToast('Camina hacia la puerta negra…', 4200);
    transitioning = false;
  }

  function blancoLogica(delta) {
    if (BL.fin > 0) {
      // EL CIERRE LE SACA EL CONTROL: 3,2 s en los que se lee la frase y la
      // imagen se va a blanco. Terminar en el mismo cuadro en que se toca la
      // puerta tira a la basura lo unico que este cuarto tiene que decir.
      BL.fin += delta;
      const k = Math.min(BL.fin / 3.2, 1);
      blAmb.intensity = 0.85 + k * 2.6;
      blHemi.intensity = 1.15 + k * 2.2;
      if (BL.fin >= 3.2) {
        // `hecho` para que el cierre no se rearme. Medido sin el: `fadeTo`
        // tarda 480 ms en cambiar `gameState`, y en esos cuadros el disparador
        // se vuelve a cumplir y la secuencia arranca de nuevo — `fin 0,38` y la
        // luz de ambiente quedandose en 1,16 despues de terminar.
        BL.hecho = true;
        BL.fin = 0;
        blAmb.intensity = 0.85; blHemi.intensity = 1.15;
        PB_HABLA.style.opacity = '0';
        endTitle.innerHTML = '&#9675; Descanso';
        endText.textContent = pbTrad(BL_FRASE);
        transitionToEnd();
      }
      return;
    }
    const dx = player.position.x - BL_PUERTA.x, dz = player.position.z - BL_PUERTA.z;
    if (!BL.hecho && !transitioning && Math.hypot(dx, dz) < 1.8) {
      BL.fin = 0.0001;
      pbSon('a_puerta', 0.9);
      PB_HABLA.textContent = pbTrad(BL_FRASE);
      PB_HABLA.style.opacity = '1';
      document.body.classList.add('pb-desp');   // fuera la interfaz: no hay nada que tocar
    }
  }
"""

# ── EL CABLEADO ──────────────────────────────────────────────────────────────
# el final del ultimo nivel deja de terminar el juego: lleva al cuarto blanco
VIEJO_FIN = """    if (pbPaso >= PB_ORDEN.length) {
      // EL TEXTO DEL FINAL ES GENERICO A PROPOSITO: con el orden sorteado, el
      // ultimo nivel cambia en cada partida, asi que un final que hable del
      // calabozo o del local seria falso cinco de cada seis veces.
      endTitle.innerHTML = '&#128682; Cruzaste las seis puertas';
      endText.textContent = pbTrad('Seis puertas, seis sitios, y ninguno era una salida. Fin de esta version de la demo.');
      transitionToEnd();
      return;
    }"""
NUEVO_FIN = """    if (pbPaso >= PB_ORDEN.length) {
      // LA ULTIMA PUERTA NO TERMINA EL JUEGO: LLEVA AL CUARTO BLANCO. El final
      // de verdad esta del otro lado de la puerta negra.
      pbSon('a_puerta', 0.9);
      fadeTo(entraBlanco);
      return;
    }"""

# la logica del cuarto en el if-chain de los sitios
VIEJO_CADENA = """    } else if (gameState === 'dungeon') {
      player.position.y = 0;
      updateDungeonLogic(delta, elapsed);
    }"""
NUEVO_CADENA = """    } else if (gameState === 'dungeon') {
      player.position.y = 0;
      updateDungeonLogic(delta, elapsed);
    } else if (gameState === 'white') {
      player.position.y = 0;
      blancoLogica(delta);
    }"""

# hideAllLevels tiene que apagarlo tambien, o el cuarto blanco queda encendido
# detras del nivel siguiente
VIEJO_ESCONDE = """  function hideAllLevels() {
    storeGroup.visible = false;"""
NUEVO_ESCONDE = """  function hideAllLevels() {
    // OJO: `hideAllLevels` la llama `entraBlanco` tambien, asi que el grupo se
    // apaga aca y se enciende DESPUES; al reves quedaria invisible.
    blancoGroup.visible = false;
    blancoLuces(false);
    pbDespiertaCorta();
    document.body.classList.remove('pb-desp');
    storeGroup.visible = false;"""

# el cuarto blanco tiene su cama
CAMA = ("  const PB_CAMA_DE = { room: 'b_room', field: 'b_field', farm: 'b_farm',",
        "  const PB_CAMA_DE = { room: 'b_room', white: 'b_room', field: 'b_field', farm: 'b_farm',")
