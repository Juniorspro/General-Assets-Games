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
      Medido: apuntar pasa de +187 llamadas / +580.888 triangulos a -25 / -4.172, o sea cuesta MENOS
      que la cadera. AWM 6,00x, Dragunov 4,00x. Referencia: Blood Strike, M700 mira x6.
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
