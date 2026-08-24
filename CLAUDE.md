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
- [x] **EL JUEGO ESTA TRADUCIDO DE VERDAD** (2026-08-23). Los dos que lo probaron dijeron lo mismo:
      "the game is not fully translated into English, still a lot of Spanish". Medido: LANG.es tenia
      137 claves y LANG.en solo 30, asi que 107 caian al respaldo de t() —que devuelve el castellano
      cuando falta la traduccion— y el jugador en ingles leia el menu en ingles y todo lo demas en
      castellano. Aparte habia unas cuarenta cadenas escritas derecho en el codigo, sin pasar por la
      tabla: esas no se arreglaban traduciendo, habia que hacerlas pasar por t() primero.
      QUE SE HIZO: las 107 que faltaban, en ingles y portugues. Mas 60 claves nuevas para lo que
      estaba suelto: el aviso de quien te mato, el panel de amigos entero, el microfono, los rotulos
      del HUD, los nueve grados militares, los seis escalones de rango, los tres modos, los cinco
      mapas de arena, los ocho acabados de arma, las nueve skins de ropa, las 16 descripciones de
      arma, las frases del teclado rapido y la tienda de personajes.
      TRES TRAMPAS QUE VALE ANOTAR:
      1. UNA TABLA DE DATOS NO SE TRADUCE CON UNA CADENA. Las tablas se arman una sola vez al
         arrancar, asi que si el texto queda ya resuelto, cambiar de idioma no lo cambia nunca. Van
         como objeto {es,en,pt} y quien los MUESTRA los pasa por tl(). Y como no todas se
         convirtieron a la vez, el mismo sitio puede recibir cadena u objeto: para eso esta tv(),
         que resuelve las dos. Sin tv(), la tabla ya convertida sale como "[object Object]".
      2. HAY TEXTO QUE NO ES textContent. El placeholder del cuadro de nombre necesita su propio
         barrido (data-i18n-ph), y el rotulo NIVEL de abajo del avatar vive en un ::after de CSS:
         a ese no lo alcanza ningun atributo y va por variable, como ya se hacia con CONSEJO.
      3. EL PLURAL NO ES UNA 's'. "solicitud/solicitudes" contra "request/requests" son dos palabras
         distintas en la tabla, no una con sufijo.
      Medido con el juego corriendo en ingles, barriendo TODO el texto visible mas los placeholder
      mas las variables de CSS: de 288 cadenas visibles quedaban 25 en castellano al empezar; ahora
      queda UNA, y es "Español" en el selector de idioma, que tiene que quedar asi. Verificado
      tambien en portugues (sale portugues, no castellano) y en partida, no solo en el menu. Cero
      errores de pagina.
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
- [x] **EL HTML BAJA A LA MITAD Y LOS ASSETS SALEN DE jsDELIVR, TODOS JUNTOS** (2026-08-23).
      Treinta y un assets vivian incrustados en base64: 9 texturas de mapa, 11 pistas de audio, 6
      insignias de rango, la portada y el arte del menu y las 3 tarjetas de modo. Eran 2,16 MB de
      3,83 —el 56,6%— y en base64, que abulta un tercio sobre el binario (1,62 MB de verdad).
      **HTML: 3,83 MB -> 1,68 MB.** Cero data: URI.
      TRES COSAS QUE SE MIDIERON Y CAMBIARON EL DISENO:
      1. EL SCRIPT DE MQTT FRENABA TODO. Un `<script src>` sin defer bloquea el parseo hasta que
         llega o falla, y estaba ARRIBA de la precarga. Medido con los tiempos del navegador: el
         primer byte de un asset se pedia **12,7 segundos** despues de abrir la pagina en una red
         donde unpkg no contesta. Poniendo la precarga arriba y `defer` en el de mqtt: la ventana
         de descarga completa paso de **12.778 ms a 239 ms**, y los 31 arrancan dentro de 160 ms
         unos de otros. La suma de las duraciones individuales es 1.573 ms, o sea que el paralelismo
         da **6,6x**. Ese es el numero del pedido "no uno por uno sino en simultaneo".
      2. CORS, o no anda nada. De las texturas del mapa se LEEN PIXELES para derivar normal,
         rugosidad y oclusion, y un lienzo con una imagen de otro dominio queda tenido: getImageData
         tira SecurityError. Mientras venian en data: URI el problema no existia (mismo origen).
         Va `crossOrigin='anonymous'` en las imagenes y `crossorigin` en el `<img>` del arte, que se
         sube a la GPU. Verificado con curl: jsDelivr manda `access-control-allow-origin: *` en los
         seis caminos probados.
      3. EL AUDIO YA NO SE CONVIERTE. Antes cada pista pasaba de base64 a ArrayBuffer con atob() y
         un bucle byte por byte: casi un mega de trabajo en el hilo principal en cada arranque.
         Ahora la precarga deja los ArrayBuffer listos. OJO: `decodeAudioData` VACIA el buffer que
         recibe, asi que va `ab.slice(0)` — sin la copia, un segundo intento encuentra cero bytes.
      Y no se decodifica dos veces: `hgTexCargar` usa la imagen que ya bajo la precarga en vez de
      crear otra con la misma URL (pega en el cache, pero decodificar nueve WebP de 512 de nuevo son
      medio segundo de telefono regalado).
      Medido: 31 de 31 en 210 ms, los 11 audios decodifican con su duracion real (m_menu 20,04 s,
      m_combate 25,08 s) y `sinte:false`, la insignia carga a 176 px, cero errores de pagina.
      DEGRADA BIEN: con la CDN caida a proposito (31 de 31 fallados) el juego entra a la arena y se
      juega — texturas dibujadas por codigo, audio sintetizado, bots presentes.
      NO SE PUDO PROBAR de punta a punta contra jsDelivr desde el arnes: el navegador de prueba no
      tiene salida a internet (unpkg tambien da ERR_CONNECTION_RESET, con y sin proxy). Lo que si
      se verifico es que jsDelivr responde 200 con CORS en los seis caminos, y que el juego anda con
      los mismos archivos servidos local.
      EL PIN VA A UN COMMIT (`@73fde79`) y no a una rama: jsDelivr cachea por URL para siempre con
      hash y 12 horas con nombre de rama. **Al cambiar un asset hay que mover el pin.**
- [ ] **Lobby de BR**: al iniciar partida de battle royale, caer primero en un lobby
      (antes del avión), no directo a la partida.
- [x] **PBR en el BR** (2026-08-23): los 26 materiales del valle mas el suelo derivan rugosidad,
      normales, oclusion y metal de su propio lienzo de color, igual que los mapas de la arena.
      Todo en segundo plano y autoregulado por costo medido.
- [x] **EL BR DEJA DE SER PROCEDURAL** (2026-08-23), preguntado por el usuario: "veo que el br tiene
      texturas procedurales". Tenia razon y era un pendiente abierto de verdad. Los 26 materiales del
      valle se dibujaban con lienzos 2D; el PBR de antes derivaba rugosidad, normales y oclusion DE
      ESE LIENZO —mapas de verdad, color base dibujado—, y eso se ve.
      HALLAZGO: en el repo ya habia 42 texturas de foto hechas con Higgsfield que NADIE usaba. La
      tuberia (`armTex`/`hfArma`) existia y estaba enchufada a 3 materiales, los tres del arma.
      Ahora `ALC_HF` mapea 24 materiales del valle a foto, en diferido igual que las del arma: el
      mapa arranca con los lienzos y las fotos entran cuando llegan, asi que sin red se juega igual.
      Quedan a proposito en lienzo `ventana`, `vidrio` y `hoja`: su lienzo dibuja la cuadricula del
      marco, que es geometria disfrazada de textura, y una foto no la trae.
      Se generaron las 6 que faltaban (ladrillo, ladrillorojo, ceniza, grava, quemado, rejilla).
      DOS COSAS QUE HAY QUE HACER Y NO SON OBVIAS:
      · LA ESCALA SE MIDE. Un mosaico del valle son 2,2 m y el lienzo del ladrillo dibuja 32 hiladas
        de 6,9 cm. La foto tiene 20 hiladas (medido con el perfil de filas de la imagen), de ahi sale
        repeat 1,60; el rojo tiene 16,8 y va en 1,90. Sin esta cuenta las paredes salen de casa de
        munecas o de gigante.
      · EL TINTE SE CALCULA. Poniendo el color en blanco manda la foto y el valle se puso NARANJA
        entero: la teja promedia #c0815f y el techo estaba autorizado en #9c5541. El tinte es la
        division canal por canal EN LINEAL entre el color del material y el promedio de la foto.
        Donde la foto es mas oscura que el color, el tinte se topa en blanco y el material queda mas
        oscuro que antes (el ladrillo rojo).
      Medido y asentado: 24 de 24 materiales en foto, 23 con normal de archivo, 26/26 con rugosidad.
      Memoria de texturas del valle: 21,5 MB procedural -> 33,1 MB en calidad baja (sin normales de
      archivo, que son 24 MB) -> 60,4 MB en media/alta. Es un costo real y por eso esta escalonado.
      De paso se solto el lienzo viejo de la placa al reemplazarlo, que se quedaba ocupando lugar sin
      que nadie lo dibujara.
      OJO: `alcPBRUno` pedia `getContext`, o sea un lienzo, asi que con textura de foto se rendia y
      el material se quedaba sin rugosidad. Ahora pide que tenga ancho y sirve para los dos.
- [ ] **Mas VARIEDAD de materiales en el BR**: distinto de lo de arriba. Ya no son procedurales,
      pero siguen siendo 26 materiales para todo el mapa; hacen falta mas materiales DISTINTOS.
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
