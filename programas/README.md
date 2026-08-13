# Programas · proyecto WWA

Herramientas, no juegos. Mismo criterio que `juegos-pc/`: un solo HTML que se
abre y anda, sin instalar nada.

## Dónde está publicado

**https://manos-npu.higgsfield.app** — un Worker de Cloudflare, HTTPS propio.

| Dirección | Qué sirve |
|---|---|
| `/` | portada con una sonda que mide el equipo de quien entra |
| `/manos/` | `manos-npu/index.html` |
| `/mocap/` | `Captura_Movimiento.html` |
| `/juegos/<Nombre>.html` | los juegos que se generan solos al abrirse |

Los HTML van como **archivos estáticos** en `app/public/`, así Cloudflare los
entrega desde el borde sin pasar por el Worker. Eso importa: el Worker de la
plantilla puede poner `Permissions-Policy: camera=()`, que mataría la cámara.
Sirviéndolos como estáticos las únicas cabeceras son las de la plataforma
(`frame-ancestors`), y ni la cámara, ni el giroscopio, ni jsDelivr quedan
bloqueados — verificado con `curl -D -` sobre el sitio ya publicado.

Un sitio recién desplegado responde **401 `{"error":"unauthenticated"}`** hasta
que se publica; recién ahí queda accesible desde afuera.

---

## Captura de movimiento (`Captura_Movimiento.html`) · beta

Se le suelta un video de una persona y devuelve la animación puesta en un modelo
3D, para exportar a Blender o a un motor. Todo pasa en el navegador: **el video
no sale de la máquina**.

Son sesenta y nueve kilobytes. El detector de huesos se baja aparte la primera
vez y queda cacheado.

### Las tres etapas
La del medio es la que decide si el resultado se ve vivo o se ve como un muñeco
con epilepsia.

**1 · Detectar.** MediaPipe Pose Landmarker devuelve treinta y tres puntos por
cuadro, en dos juegos que conviene no confundir:

| juego | qué es | para qué |
|---|---|---|
| `landmarks` | coordenadas de la imagen, de 0 a 1 | dibujar el esqueleto sobre el video |
| `worldLandmarks` | **metros**, origen entre las caderas | animar |

El video no se reproduce: se lo va posicionando cuadro por cuadro con
`currentTime` y se espera el `seeked`. Es más lento que mirarlo pasar, pero es
exacto —no se saltea ni repite cuadros— y no depende de que la máquina llegue a
tiempo.

**2 · Arreglar.** Lo que sale del detector no se puede usar tal cual:

- **Tiembla.** Un promedio corriente lo calma pero deja todo pastoso y con
  retraso. Va un **filtro de un euro**: mide qué tan rápido se mueve cada punto y
  sube el corte del filtro con la velocidad. Quieto queda firme, en movimiento no
  arrastra. Es la diferencia entre suavizado y suavizado *con* respuesta.
- **Los huesos cambian de largo.** El detector estima cada punto por separado, así
  que el antebrazo mide dieciocho centímetros en un cuadro y veintiséis en el
  siguiente. Se le fija a cada hueso su largo mediano de toda la toma y se
  reproyecta cada articulación sobre la dirección que ya tenía, de adentro hacia
  afuera. **Esto solo limpia más que cualquier filtro.**
- **No hay desplazamiento.** Como el origen son las caderas, el sujeto camina en
  el lugar para siempre. El desplazamiento se saca **al revés, de los pies**:
  cuando un pie está apoyado el mundo no se puede mover debajo de él, así que lo
  que se movió el pie es —cambiado de signo— lo que se movió el cuerpo. Un pie
  cuenta como apoyado si casi no se movió y está cerca del piso; si ninguno
  califica, se clava el más bajo, porque siempre hay uno que sostiene.

Los cuatro deslizadores son exactamente esos cuatro controles, y `CRUDO` los
apaga todos para ver de dónde se partió.

**3 · Pasar al modelo.** Cada hueso se orienta contra **su propio reposo en
mundo**, y recién al final se convierte a local dividiendo por el mundo del
padre:

- la **cadera** recibe una terna completa: el eje de una cadera a la otra, el de
  la cadera al hombro, y el producto cruz;
- el **pecho**, otra terna, la de los hombros. Entre cadera y pecho se interpolan
  las vértebras, y de ahí sale la torsión del torso, que es lo primero que se
  nota cuando falta;
- **brazos y piernas** reciben sólo el giro mínimo que lleva al hueso desde donde
  apunta en reposo hasta donde apunta ahora.

Si se hace al revés —acumulando de padre a hijo— cualquier error de la cadera se
multiplica por toda la cadena y la mano termina a un metro de donde va.

### El modelo
Trae un maniquí de fábrica con nombres de hueso al estilo Mixamo. Eso no es
decorativo: es lo que permite que el mismo código maneje un `.glb` que traiga el
usuario. Hay una tabla de alias que reconoce lo de Mixamo, Blender, VRoid, Ready
Player Me y los `Bip01` viejos; si falta algún hueso clave, lo dice y no rompe.

El modelo conserva su tamaño; lo que se escala es el desplazamiento del sujeto,
para que un personaje de dos metros no camine pasos de uno setenta.

### La interfaz
Cinco tarjetas en una columna y **sólo una abierta a la vez**. No es adorno: con
todo desplegado, en un teléfono, la mitad de los controles quedan fuera de vista
y no se entiende qué va primero. Cada tarjeta plegada resume su estado a la
derecha —`prueba`, `120 cuadros`, `suave 0.20 · pies 0.30`— y las que todavía no
corresponden están apagadas y no se pueden tocar.

La pantalla **se mueve sola**: al cargar el video se marca el paso 1 y se abre el
2; al terminar el análisis se marca el 2, se destraban el 3 y el 5, y se abre el
3. El número del paso se pone verde cuando está hecho.

**El visor queda pegado arriba** mientras se hace scroll. Eso es lo que hace
usable el ajuste en un teléfono: se toca un deslizador abajo y se ve el cambio
arriba, sin ir y volver. En pantalla ancha pasa a dos columnas, cada una con su
propio scroll.

Cada deslizador dice debajo, en una línea, qué hace y qué pasa si se lo mueve
—porque «suavizado 0.55» no le dice nada a nadie—. Y las marcas naranjas de la
barra de tiempo señalan los cuadros donde hay un pie apoyado: mirándolas se
entiende de un vistazo si la caminata va a patinar.

### Exporta
- **BVH** — texto plano, lo lee Blender, Unity y medio mundo. Se escribe la
  jerarquía canónica, no la del `.glb` cargado: así el archivo lo entiende
  cualquiera. Ángulos en grados, orden `Z X Y`, que es el que espera el formato.
- **GLB** — el modelo con la animación adentro.
- **JSON** — los puntos crudos y los procesados, por si alguien quiere hacer sus
  propias cuentas.

### Verificado
Con un video de prueba de ocho segundos, cuatro poses claras, a quince cuadros
por segundo:

| qué | resultado |
|---|---|
| detección | 120 de 120 cuadros con persona |
| altura estimada del sujeto | 1,63 m (la referencia era 1,7) |
| pose de T | manos a ±0,52 m, altura 1,16 m |
| caminata | un pie a z = −0,37 y el otro a −0,06: hay zancada |
| brazos arriba | manos a 1,59 y 1,68 m, con la cabeza a 1,39 |
| sentadilla | cadera de 0,87 a 0,46 m |
| BVH | 84 canales declarados, 84 números por fila, llaves 32/32, 10.080 números, cero NaN |
| GLB | 265 KB con la animación |

### Lo que le falta a la beta
- **No hay torsión de antebrazo ni de tibia.** El giro es el mínimo que alinea el
  hueso; el roll sobre su propio eje no se estima. Se nota en las manos.
- **Los dedos no se capturan.** El detector da un punto por mano.
- **La profundidad es la que es.** Sale de una sola cámara: si el sujeto se mueve
  de frente a la lente, el eje Z es el más ruidoso de los tres.
- **Con el piso activado el personaje no salta**: siempre apoya. Se apaga con
  `PISO`, y ahí la altura queda en su mediana.
- **Una sola persona.** Si hay dos en cuadro, toma una.

### De dónde sale cada cosa
El detector viene en dos partes, y cada una de un lado a propósito:

- el **código y el WASM**, del paquete oficial `@mediapipe/tasks-vision` en npm,
  clavados a la versión 1.0.1: son veintitrés megas y **jsDelivr no sirve
  archivos de más de veinte**, así que no podrían vivir en el repositorio aunque
  uno quisiera;
- los **modelos**, de `mundo/mocap/` en este repositorio, anclados al commit,
  porque una URL de terceros que se cae deja el programa inservible y estos sí
  entran bajo el límite.

El modelo pesado, de treinta megas, queda afuera por lo mismo.

### Tres cosas que costaron encontrar
Van anotadas porque ninguna se ve mirando el código:

- **El Chromium de prueba no trae H.264.** El video mp4 no cargaba y el elemento
  no avisaba nada: se quedaba callado para siempre. De ahí salió el plazo de doce
  segundos en el cargador, que ahora le dice al usuario que su navegador no puede
  con ese códec en vez de dejar la pantalla esperando.
- **Sin peticiones Range no se puede saltar dentro de un video.** El servidor de
  pruebas era un `SimpleHTTPRequestHandler`, que no las soporta, así que
  `currentTime` se quedaba clavado en cero y el detector analizaba ciento veinte
  veces el mismo cuadro. Los cuatro momentos daban la misma pose y parecía un
  error del pase al esqueleto.
- **Dar vuelta un solo eje espeja el mundo.** El detector usa la terna de OpenCV
  —x a la derecha, y hacia abajo, z alejándose de la cámara—. Para pasar a three
  hay que invertir **y y z**, que es girar media vuelta sobre X. Invirtiendo sólo
  la y el resultado se ve bien hasta que el sujeto levanta una mano y resulta que
  es zurdo.


---

## Manos en la NPU (`manos-npu/index.html`)

Detección de manos en 3D corriendo en la **NPU** por **WebNN**, sobre un fondo 3D
que gira con el giroscopio y la cámara de fondo. Un solo archivo de cuarenta y
cinco kilobytes; se sube a cualquier servidor HTTPS y anda.

### Qué se puede y qué no, con nombre y apellido
Esto hay que decirlo primero porque cambia todo el diseño:

| vía | ¿llega a la NPU? |
|---|---|
| TFLite / LiteRT + delegado QNN, NNAPI, Eden, NeuroPilot, DirectML, OpenVINO, EdgeTPU | **sí**, y es lo normal — pero son librerías **nativas** |
| MediaPipe Tasks en el navegador | **no**: su `delegate` acepta `GPU` o `CPU` y nada más |
| TensorFlow.js | **no**: no hay backend WebNN publicado en npm |
| **ONNX Runtime Web + WebNN** | **sí**, es la única puerta web, y es la que usa este programa |

Verificado leyendo el código: el bundle de MediaPipe tiene
`"delegate" in e && ("GPU" === e.delegate ? … : …)`, sin tercera rama; y
`@tensorflow/tfjs-backend-webnn` no existe en el registro.

### Cómo se pide la NPU
```js
executionProviders: [{ name:'webnn', deviceType:'npu',
                       powerPreference:'low-power' }]
```
ORT traduce eso a `navigator.ml.createContext({deviceType, powerPreference})`.
Pedir `npu` **no es una sugerencia**: si el equipo no tiene NPU o el grafo no le
entra, la sesión falla. Acá esa falla no se tapa — se informa y bajar a GPU o CPU
es una decisión con un botón.

Los modelos son **INT8**, que es el formato que una NPU procesa nativamente. Si
el controlador rechaza el grafo cuantizado se reintenta float32 **en el mismo
dispositivo** antes de bajar de dispositivo.

### El pipeline, en dos etapas
Es el de MediaPipe, reimplementado a mano sobre los ONNX del OpenCV Zoo:

1. **Detector de palma** · 192×192 · 2016 anclas · devuelve caja y 7 puntos.
2. **Regresor** · 224×224 · devuelve 21 puntos en pantalla y 21 en el mundo.

Y el truco que hace que corra: **el detector de palma no se ejecuta todos los
cuadros**. Sólo cuando se pierde la mano. Mientras hay seguimiento, la región del
cuadro siguiente sale de los propios puntos del anterior y se ejecuta sólo la
etapa 2. Es la diferencia entre dos inferencias por cuadro y una.

### Las anclas, que son la trampa
El modelo devuelve 2016 predicciones ancladas a posiciones fijas que **no vienen
en el archivo**: hay que regenerarlas igual que MediaPipe al entrenar, o todo
sale corrido. Y la segunda capa confunde: no son tres capas de dos anclas a paso
16, es **una capa de seis anclas por celda**.

```
paso  8 → rejilla 24×24 × 2 anclas = 1152
paso 16 → rejilla 12×12 × 6 anclas =  864     total 2016
```

Generadas así coinciden con la tabla de referencia con un error de 7·10⁻⁹.

### La región de interés
Se calcula sobre los **siete puntos de la palma**, no sobre la caja del detector:
la caja trae margen y deja la mano contra el borde del recorte. Se giran los siete
puntos para medir la mano derecha, se corre el centro medio alto de la palma hacia
los dedos y se agranda 2,7 veces. Medido: con la caja quedaba hasta un 6% del
recorte vacío; así queda en 0% y la confianza sube de 0,995 a 0,999.

El recorte girado se hace con una transformación del lienzo —operación de GPU—,
no con matemática de píxeles.

### Verificado
Primero se replicó el pipeline entero en Python con onnxruntime y se comprobó
sobre dos fotos de manos: palma detectada con 0,978 y 0,958, puntos con **0,999**
de confianza, y el esqueleto cae exacto sobre cada nudillo. Después se corrió el
mismo pipeline en el navegador contra un video de una mano: **0,999**, muñeca y
yemas en su lugar, y el seguimiento enganchado —o sea, saltándose el detector de
palma—.

### Un error de ORT que costó encontrar
Cuando la creación de una sesión WebNN **falla**, ORT-Web deja su contexto ML
colgado en el estado del módulo. La sesión siguiente —aunque se pida en CPU—
queda registrada como si fuera de WebNN, y al enlazar la entrada tira:

```
Can't bind input[0]. ERROR_MESSAGE: There's no data transfer registered
for copying tensors
```

No se puede limpiar desde afuera. Por eso **cambiar de proveedor recarga la
página** con `?ep=gpu` o `?ep=cpu`: arranca el módulo desde cero. Y antes de
intentar una sesión se pregunta `navigator.ml.createContext({deviceType})`, así
el caso común —un equipo sin NPU— ni siquiera ensucia el estado.

De paso: **el tensor de entrada se arma en cada corrida**. Reutilizar el mismo
objeto entre sesiones de proveedores distintos deja el enlace viejo adentro y
produce el mismo error. El constructor sólo envuelve el arreglo que ya existe,
así que no cuesta nada.

### Lo demás
- **Cámara trasera** por omisión, con botón para cambiar. Todas las restricciones
  van con `ideal`: `min` es una restricción dura y hace que una cámara que no la
  cumple no abra nada.
- **Linterna** con `applyConstraints({advanced:[{torch}]})`, y antes se pregunta
  `getCapabilities().torch`; si no está, el botón queda apagado en vez de romper
  el flujo.
- **Giroscopio** con `DeviceOrientationEvent.requestPermission()` para iOS 13+,
  pedido **dentro del gesto** del botón ENTRAR, que si no falla en silencio. La
  rotación se arma en el orden de la especificación —Z, X, Y— más el ángulo de
  la pantalla, y se interpola para que no tiemble.
- **Capas**, en este orden: video de la cámara, escena 3D transparente, puntos de
  la mano, interfaz.
- El dibujo **nunca espera** a la inferencia: se lanza un ciclo cuando el anterior
  terminó y mientras tanto se sigue pintando el último resultado.

### La cascada de motores

Al principio esto avisaba que no había NPU y se quedaba quieto: era la idea, la
NPU se pedía "sí o sí". En un Android sin WebNN el resultado era una pantalla
que dibujaba a 60 fps y no detectaba una sola mano — el contador de INFERENCIA
clavado en 0. Estaba mal.

Y el segundo error fue peor: forzar con `?ep=` **apagaba** la cascada. En un
equipo cuyo WebNN entrega contexto de NPU pero no puede construir el grafo
(`Can't create a session. ERROR_CODE: 0`, sin mensaje), entrar con `?ep=npu`
dejaba el programa sin motor y sin salida. Ahora `?ep=` sólo dice **por dónde
empezar**; nunca apaga nada.

La cadena son **pares dispositivo+precisión**, no dispositivos sueltos:

```
npu/int8 → npu/f32 → gpu/int8 → gpu/f32 → webgpu → cpu
```

La razón es fina. Un intento fallido de WebNN deja el estado de ORT tocado, así
que probar INT8 y después float32 sobre la NPU **en la misma carga** hacía que
el segundo nunca tuviera una chance justa: fallaba por el estado sucio que dejó
el primero, no porque la NPU no pudiera con float32. Por eso cada par de WebNN
se prueba en su propia carga. En webgpu y cpu no hace falta.

Baja sola, y hay dos formas de bajar, que no son lo mismo:

- **Falló antes de tocar ORT** (no hay `navigator.ml`, no hay adaptador de
  WebGPU): el estado está limpio, se sigue con el próximo en la misma carga.
  No se recarga y no se nota.
- **Falló creando la sesión de WebNN**: ORT quedó con su contexto ML colgado y
  la única salida es recargar con el próximo en la dirección — de ahí el
  `?ep=<dev>&auto=1`. Como la cadena avanza siempre hacia adelante y CPU nunca
  ensucia nada, no puede quedar recargando en círculos.

Las recargas **no piden otro toque**: queda una marca en `sessionStorage`, la
página arranca sola y sigue por donde iba. Todo lo que toca almacenamiento va
envuelto en `try` — Safari en privado tira excepción con sólo mirarlo, y eso
no puede llevarse puesto al detector.

En WebGPU el orden de precisión se invierte y va **f32 primero**: los
operadores de cuantización todavía no están todos implementados ahí y el grafo
INT8 termina cayendo a CPU operador por operador, más caro que correr float32
derecho.

### La cascada se paga una sola vez

El que gana queda anotado en `localStorage`. La visita siguiente entra
**directo** ahí, sin recargas. FORZAR NPU borra la anotación y vuelve a medir
desde arriba.

**Verificado** con la lógica extraída del propio HTML y equipos falsos
alrededor, siguiendo cada recarga hasta que el viaje se asienta:

| Equipo | Recorrido | Termina en |
|---|---|---|
| WebNN da contexto de NPU pero no arma el grafo | 4 recargas automáticas | `webgpu / f32` |
| …y la segunda visita | directo | `webgpu / f32` |
| …entrando con `?ep=npu` | 4 recargas automáticas | `webgpu / f32` |
| …y si WebGPU tampoco pudiera | 4 recargas automáticas | `cpu / int8` |
| NPU que sólo puede con float32 | 1 recarga | `npu / f32` |
| NPU que anda entera | directo | `npu / int8` |
| sin WebNN ni WebGPU | directo | `cpu / int8` |
| sin WebNN, con WebGPU | directo | `webgpu / f32` |
| WebNN presente pero sin NPU | directo | `gpu / int8` |

El caso `npu / f32` en una recarga es el que antes era **imposible**: el intento
en float32 nunca arrancaba limpio.

Lo que **no** se pudo probar acá: la inferencia de verdad en un navegador. Este
entorno no llega a jsDelivr desde Chromium (`ERR_CONNECTION_RESET` con y sin
proxy), así que los modelos no se pueden bajar en una prueba automatizada.

### INT8 en la NPU no se puede, y no es opinión

Los modelos cuantizados de OpenCV Zoo usan `QLinearConv`, `QLinearAdd`,
`QGemm`, `QLinearSigmoid` y `QLinearGlobalAveragePool`. Esos operadores son del
dominio **`com.microsoft`**, no del ONNX estándar. Comprobado buscando cada
nombre dentro del bundle de ORT-Web: **ninguno figura** en el EP de WebNN,
mientras que todos los del modelo float32 (`Conv`, `PRelu`, `Resize`, `Pad`,
`Gemm`, `Clip`, `GlobalAveragePool`, `Squeeze`, `Cast`) sí están.

Así que pedir "INT8 en la NPU" con estos archivos era pedir algo imposible.

### Lo que la NPU sí digiere: float16

Una NPU es una máquina de fp16. Los modelos se convirtieron con
`convert_float_to_float16(keep_io_types=True)`, que deja entrada y salida en
float32 y mete los `Cast` —soportados— así que el JS no cambia nada.

| | float32 | float16 |
|---|---|---|
| palma | 3814 KB | **1940 KB** |
| puntos | 4003 KB | **2029 KB** |

Verificado con el pipeline **entero** sobre manos reales, no con ruido:

| | puntaje de palma | confianza | desvío de los 21 puntos |
|---|---|---|---|
| manoA | 0,9770 → 0,9770 | 0,9975 → 0,9975 | media **0,039 px**, máx 0,102 px |
| manoB | 0,9784 → 0,9783 | 0,9962 → 0,9962 | media **0,024 px**, máx 0,054 px |

Sobre manos de 240–270 px de ancho. Es una décima de píxel: invisible.

Un detalle que decide dónde se usa: **en CPU el fp16 es más lento** (4,76 ms
contra 2,89 ms medidos), porque una CPU no tiene unidades fp16 y los `Cast`
se pagan sin ganar nada. Por eso la cadena usa fp16 en npu, gpu y webgpu, e
INT8 en cpu:

```
npu/fp16 → npu/f32 → gpu/fp16 → gpu/f32 → webgpu/fp16 → webgpu/f32 → cpu
```

### Cuatro relojes, porque "va lento" no es un diagnóstico

- **MODELO** — lo que tarda la inferencia. Esto es lo que la NPU acelera.
- **PREPARAR** — pasar el cuadro a tensor: recortar, leer píxeles, normalizar.
  Corre en el hilo principal y **la NPU no lo toca**. Cuando el modelo baja a
  un par de milisegundos, esto pasa a ser el techo de todo.
- **LATENCIA** — de cuadro disponible a puntos listos. Es la que se siente.
  El momento del cuadro sale del propio `requestVideoFrameCallback`.
- **INFERENCIA** — ciclos completos por segundo.

Están en el panel y desglosados en la hoja MOTOR. Si MODELO marca 2 ms y
PREPARAR marca 12, el cuello no es la NPU y no hay modelo que lo arregle.

### Precisión: el filtro One-Euro

El problema de siempre con los puntos que salen de un modelo cuadro a cuadro es
que tiemblan. Un pasabajos fijo lo arregla y rompe otra cosa: o tiembla o
arrastra, hay que elegir. El One-Euro no obliga a elegir porque **el corte sube
con la velocidad medida**: mano quieta, filtra fuerte; mano moviéndose, el
corte se dispara y el filtro casi desaparece.

Medido a 30 cuadros por segundo con ruido de ±1,5 px:

| Filtro | Mano quieta · temblor/cuadro | Mano a 600 px/s · retraso |
|---|---|---|
| crudo | 0,94 px | 0 |
| fijo α=0,5 | 0,41 px | 20 px |
| fijo α=0,15 | 0,12 px | **113 px** |
| **One-Euro** | **0,20 px** | **8 px** |

El pasabajos fijo que iguala la quietud del One-Euro va 113 px atrás de la
mano. Ése es todo el argumento.

Los puntos de pantalla van en píxeles del video y los del mundo en unidades de
la mano, así que `beta` cambia tres órdenes de magnitud entre uno y otro
(0,012 contra 6,0).

### Precisión: el recorte se adelanta

Entre que se saca el cuadro y sale el resultado pasan decenas de milisegundos.
Con la mano en movimiento eso alcanza para que los dedos queden contra el borde
del recorte, y ahí los puntos se ensucian. Se mide la velocidad del centro, se
suaviza y se adelanta 45 ms. Verificado: con la mano a 600 px/s el recorte va
**27 px adelante**, que es exactamente `600 × 0,045`.

Además el recorte **se abre con la velocidad**: 88 px de lado con la mano
quieta, 140 px a 600 px/s. Quieto va ajustado, que es donde se gana resolución;
rápido va holgado, que es donde se gana no perder la mano.

La región del cuadro siguiente sale de los puntos **crudos**, no de los
filtrados: filtrarlos antes metería el retraso del filtro dentro del lazo de
seguimiento. Lo que se dibuja sí va filtrado.

### Precisión: dos umbrales, no uno

`UMBRAL_PUNTOS` (0,55) es "perdí la mano". `UMBRAL_FIRME` (0,82) es "la sigo
teniendo pero cada vez peor". Cuando la confianza pasa ocho cuadros seguidos por
debajo del segundo, la región viene derivando y se vuelve a anclar con el
detector de palma **antes** de perderla. Esperar al primer umbral es esperar
demasiado. Y cada 5 s se re-ancla igual, porque la región seguida deriva de a
poco aunque la confianza esté alta.

### Optimización

- **Fuera el fondo 3D**: se van three.js entero (unos 600 KB por la red) y el
  render por cuadro. Con él se fueron el giroscopio y sus permisos.
- **`requestVideoFrameCallback`**: la inferencia se dispara con el cuadro nuevo
  de cámara, no con el dibujo. Antes, con el dibujo a 60 y la cámara a 30, se
  volvía a inferir sobre el mismo cuadro.
- **Tabla de 256 valores** en vez de dividir por 255: son 150.000 divisiones por
  cuadro entre los dos recortes, y la tabla entra entera en caché.
- **Umbral en logit**: la puntuación de la palma viene sin sigmoide, así que se
  compara contra `log(t/(1-t))` y se ahorran 2016 `Math.exp` por detección.
- **`imageSmoothingQuality:'high'`** en los dos recortes: los bordes de los
  dedos llegan limpios al modelo en vez de aliaseados. Lo hace la GPU, no cuesta.

### Para que la NPU aparezca
En Chrome o Edge de escritorio hay que habilitar
`chrome://flags/#web-machine-learning-neural-network` y reiniciar. En Android
todavía no está en canales estables. La hoja **MOTOR** dice exactamente qué
expone el equipo: si WebNN está, si entrega contexto de NPU, y en qué se está
ejecutando.
