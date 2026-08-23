# Notas del proyecto

## Palabra clave: "Pope"

Cuando el usuario escriba **"Pope"** (solo, o dentro de un mensaje), significa
**"seguí con la lista de pendientes de abajo"**, sin volver a preguntar qué hacer.
Arrancar por el primero que siga sin tildar, y tildarlo acá al terminarlo y pushearlo.

## Pendientes de Campo_de_Tiro.html

Pedidos el 2026-08-23, todos sobre `juegos-pc/Campo_de_Tiro.html`:

- [x] **Mira del sniper: RESUELTA DE RAIZ** (2026-08-23). Se saco la segunda pasada de escena
      entera. El aumento lo hace la camara del juego (por tangente) y el aro es un CONTORNO fino con
      la reticula — SIN negro alrededor. Una sola imagen: el mismo mundo, al mismo aumento, adentro
      y afuera del aro. El negro era el error: se leia como dos pantallas distintas.
      AWM 6,00x, Dragunov 4,00x. Referencia: Blood Strike, M700 mira x6.
      **Y EL FUSIL SE VE** (pedido "PERO ESO CON LA MIRS Y EL ARMA DEL SNIPER"): el mundo se dibuja
      con el campo angosto del aumento y el arma va en una SEGUNDA PASADA propia (`_vmEsc`,
      `_vmCam` a 34 grados, `autoClear=false` + `clearDepth()`), asi el fusil no se estira con el
      zoom. El tubo del visor se apaga mientras se apunta y no es un descuido: mide 30 cm y el ojo
      queda a 6,5 cm del ocular, o sea que la campana abarca 24 grados de SEMIangulo contra los
      18,9 que mide todo el campo a 6x — por el tubo se ve la pared de adentro, no el otro lado.
      Por eso el aro es un contorno y no una ventana.
      Medido en cuadro completo (`__tiro.costo()`): AWM cadera 428 llamadas / 1.072.624 triangulos
      contra 260 / 1.055.934 apuntando (-168 y -16.690); Dragunov -52 llamadas; AK sin visor 0 y 0,
      que es el testigo de que la medicion mide lo que dice.
      OJO con `renderer.info.render`: three.js lo pone a cero al empezar cada `render()`, asi que
      leerlo despues de un cuadro deja solo la ultima pasada. Para el cuadro entero va
      `info.autoReset=false`, que es lo que hace `__tiro.costo()`.
- [x] **El borde metalico del aro** (2026-08-23), pedido "LE FALTA LOS BORDES METALICOS DEL MODELO
      3D": el aro era SOLO una linea de CSS, y una linea no tiene canto ni brillo. Ahora hay un
      BISEL de verdad (`_telBiselG`): dos torneados de revolucion, la cara pulida (metalness 0,96 /
      roughness 0,22) y la pared mate oscura (0,85 / 0,58). El quiebre entre los dos acabados es lo
      que lo hace leer como pieza torneada; con un solo material salia un aro gris plano, porque
      metalness 1 no tiene difuso y todo el aro reflejaba lo mismo.
      Va APARTE de `gMira` y al REVES: es el unico pedazo de la mira que se enciende apuntando. Y
      puede, porque no es un tubo: 15 mm de fondo casi no se proyectan, asi que lo que se ve es la
      CARA de frente.
      DEFECTO DE FONDO QUE APARECIO ACA: `vmAroPx()` ESTIMABA el radio suponiendo que el ojo estaba
      a |_telOcularZ| del ocular, o sea que el origen del arma caia en la camara. No cae: gunRoot
      tiene su posicion y el apuntado la corre otra vez. Medido, el error era de 1,44 veces — el aro
      de CSS se venia dibujando 44% mas grande que el ocular de verdad desde el principio, y por eso
      el metal aparecia bien adentro de la linea. Ahora se PROYECTA el punto de verdad con la camara
      del arma, asi que la linea y el metal caen en el mismo sitio por construccion.
      Y como el ocular de verdad se proyecta en el 35% del alto y el aro aprobado estaba en el 50%,
      el bisel se ESCALA hasta dar en el blanco (`vmAroAjustar`, VM_ARO_ALTO=0.50). Es una decision
      de imagen y esta anotada como tal, igual que VM_FOV=34. Una sola multiplicacion clava el
      blanco porque el radio proyectado va lineal con el radio del objeto.
      Medido: abertura 50,0% del alto y canto exterior 59,0% con lienzos de 420, 430 y 600 px de
      alto; la pasada del arma pasa de 5 a 7 llamadas; apuntando sigue costando menos que la cadera
      (-51 llamadas la AWM, -50 la Dragunov). Cadera, apuntado y arma sin visor verificados: el
      bisel y el visor son exactamente inversos, y el AK no enciende ninguno de los dos.
- [x] **Controles para los que recien empiezan** (2026-08-23): apuntar de UN TOQUE por omision
      (CFG_DEF.apuntar='tap'), botones un 10% mas chicos, y FUEGO y APUNTAR del 50% al 81% del alto
      de la pantalla — estaban justo sobre la linea del horizonte. Con la mira puesta el HUD se
      esconde salvo joystick, apuntar y disparar.
- [ ] **NO REPRODUCIDO: los NPC desaparecen al cambiar ajustes.** Medido en la arena con 7 bots:
      barrido de 360 grados antes y despues de cambiar preajuste (bajo/ultra), calidad general
      (baja/alta), calidad de texturas y detalle de personajes -> 7 de 7 visibles en todos los
      casos, 58-78 mallas encendidas. Si vuelve a pasar hace falta saber EN QUE MODO y QUE ajuste.
      De paso se arreglo un defecto real del mismo tipo: `mundoGZ()`.
- [~] **Armas de verdad**: buscar referencias reales y rehacer los modelos. **P90 hecha**
      (2026-08-23): rehecha con las medidas de FN Herstal — bullpup, cargador acostado arriba,
      hueco del pulgar, guardamonte-aro, expulsion para abajo, manijas ambidiestras y apagallamas
      en diagonal. Medida: 522x227x79 mm contra 505x210x55 reales.
      **Faltan las otras 16.** Ir de a una, con referencia y medidas, y verificar con
      `__tiro.armaMedir()` (mide el arma sola, en su marco local, en milimetros).
- [x] **Reticulas reales** (2026-08-23): mil-dot en la AWM y PSO-1 en la Dragunov, calcadas.
- [x] **Zoom del visor invertido** (2026-08-23): el campo del visor sale de cuanto ocupa el disco
      en pantalla, asi que el aumento que se ve es el que dice el arma. AWM 6,00x, Dragunov 4,00x.
- [x] **Lag del visor** (2026-08-23): la camara del visor va en el ojo, sin lerp de posicion.
- [ ] **Bug: reaparecés sin nada**. Al salir o al morir y revivir, te quedás sin equipo.
- [ ] **Bug: el cambio de gráficos borra a los enemigos**. Tocar los ajustes de imagen
      hace desaparecer a los bots / jugadores.
- [ ] **Lobby de BR**: al iniciar partida de battle royale, caer primero en un lobby
      (antes del avión), no directo a la partida.
- [x] **PBR en el BR** (2026-08-23): los 26 materiales del valle mas el suelo derivan rugosidad,
      normales, oclusion y metal de su propio lienzo de color, igual que los mapas de la arena.
      Todo en segundo plano y autoregulado por costo medido.
- [ ] **Mas texturas en el BR**: el Valle Ceniza necesita bastantes mas VARIEDAD de texturas
      (no mas mapas por material, eso ya esta: mas materiales distintos).
- [ ] **Cinco mapas distintos** — EL PEDIDO CONCRETO (2026-08-23): que sean **islas**, un
      **lugar de trafico con contenedores** (tipo Shipment) y **Nuketown**. Con referencias.
      HALLAZGO IMPORTANTE de por que los cinco se sienten iguales: `buildArena()` envuelve
      SIEMPRE el mapa en la misma MURALLA DE CASTILLO con almenas, cuatro torres en las esquinas
      y cuatro tiendas (linea ~20050). Los `bloques` de cada mapa cambian el interior pero el
      marco es identico, y el marco es lo que uno ve. Antes de hacer Nuketown o Shipment hay que
      hacer el CERCO configurable por mapa: muralla / malla de alambre / cerco de suburbio con
      bloqueo. Ese es el desbloqueo, no los bloques.
      Referencias ya buscadas:
      · Nuketown: dos casas enfrentadas (norte verde-azul, sur amarilla) con garaje y jardin
        atras, calle en el medio con un colectivo y una camioneta, al oeste un auto delante de
        una casa rosa en el fondo ciego, al este un bloqueo, maniquies en los jardines.
      · Shipment: cuadrado chico, cuatro bloques de contenedores formando un cruce, cerco de
        malla, contenedores inclinados contra las paredes.
- [ ] **Bots con slide-cancel** (pedido viejo).
- [ ] **Menú de skins / personalización de ropa** (pedido viejo).

## Reglas fijas de este usuario

- **Nunca** usar cuadros de `AskUserQuestion`: *"elimina este tipo de cuadros porque se
  buguea, uso celular"*. Preguntar en texto plano si hace falta.
- Desarrollar, commitear y pushear **solo** a la rama `claude/billeteras-sin-registro-3z7uvz`.
- **No** abrir pull requests salvo que lo pida explícitamente.
- **No** poner el identificador del modelo en commits, PRs, comentarios de código ni en
  nada que se pushee.
- Cuando pide "dame el HTML", quiere el archivo `juegos-pc/Campo_de_Tiro.html` adjunto.
- El juego se sube al portal **Rezona**. Es un HTML autocontenido: todo va adentro del
  archivo, sin dependencias externas más allá del CDN de three.js.
- Verificar con mediciones antes de afirmar que algo funciona. Historial: *"apenas hacés
  algo nuevo rompes otra cosa"*.

## Cómo probar (banco de pruebas)

El contenedor es efímero y se reclona: si `/tmp/ui` no existe, hay que rearmarlo.
- `prep.py` reescribe los CDN a `node_modules` local y los brokers MQTT a `ws://127.0.0.1:9001/9002`.
- `h1.mjs` levanta un server en 8099 y maneja Playwright (los módulos ES no cargan por `file://`).
- `run.sh <json> <log> [ancho alto]`.
- Chromium en `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` con
  `--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
  --proxy-bypass-list=<-loopback> --autoplay-policy=no-user-gesture-required`.
- Al abrir hay que sacar del medio: el selector de idioma (`#ldIdioma .ldIdB[data-lang=es]`),
  el cartel del nombre (`#npGo`) y a veces el `#loader`.
- Chequeo de sintaxis: `acorn.parse(<script type=module>, {ecmaVersion:'latest', sourceType:'module'})`.
- Para grepear sin que los blobs en base64 ensucien todo:
  `awk '{ if (length($0)>3000) print "<<<datos>>>"; else print $0 }' juegos-pc/Campo_de_Tiro.html > /tmp/cdt.txt`
