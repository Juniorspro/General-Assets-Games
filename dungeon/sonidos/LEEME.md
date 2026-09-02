# Los sonidos en archivo

Ya no está vacío. Los dieciséis sonidos están **generados con Rezona Lab** y
horneados a ogg mono: **296 KB los dieciséis juntos**, y el `ambiente` —el
único que suena todo el tiempo— son 51 KB.

El sintetizador **sigue estando y sigue siendo la red**: cada sonido pregunta
primero por su muestra y, si el archivo no llegó, cae al sintetizador de
siempre (`src/sonido.js`). Borrar un `.ogg` de acá no rompe nada; degrada ese
sonido y nada más.

## Lo que hay

Veinte sonidos, **361 KB los veinte juntos**.

| archivo | qué es | dura | tope de dónde sale |
|---|---|---|---|
| `ambiente.ogg` | el colchón de la casa, en bucle | 8,90 s | — |
| `persecucion.ogg` | la música de la caza, en bucle | 8,10 s | — |
| `paso_1..3.ogg` | pasos caminando, alfombra | 0,200 s | hueco 0,370 s |
| `correr_1..3.ogg` | pasos corriendo | 0,150 s | hueco 0,242 s |
| `paso_madera_1..2.ogg` | pasos en el cajón del arranque | 0,160 s | hueco 0,242 s |
| `deslizar.ogg` | tirarse al piso | 0,800 s | `SLIDE_TIME` 0,85 s |
| `pisada_1..2.ogg` | la pisada del bicho | 0,240 s | hueco 0,323 s |
| `grito.ogg` | el chillido de cuando te ve | 1,10 s | radio |
| `screamer.ogg` | el grito de cuando te agarra | 1,70 s | radio |
| `voz_1..3.ogg` | el bicho hablándose solo al caminar | ~1,0 s | radio |
| `grunido.ogg` | el gruñido lejano | 1,60 s | radio |
| `golpe.ogg` | aterrizar y la embestida | 0,55 s | — |
| `cajon.ogg` | revisar un mueble | 0,95 s | — |
| `portazo.ogg` | la puerta de salida | 0,70 s | — |
| `campana.ogg` | la campana del final | 3,20 s | — |
| `riser.ogg` | el barrido de la corrida final | 3,40 s | — |

Las variantes numeradas se eligen al azar con ±6 % de tono: un paso repetido
idéntico veinte veces se lee como un error, no como un paso.

**`grunido`, sin eñe.** El nombre viaja adentro de una URL del CDN y ahí el
UTF-8 hay que escaparlo. La clave en `src/muestras.js` es `snd_grunido`.

## La voz del bicho va por radio quebrada

Los seis sonidos de la voz —`grito`, `screamer`, `voz_1..3` y `grunido`— pasan
por la misma cadena en el horneado. **El carácter no se le pide al generador**:
lo hace distinto cada vez y no hay forma de verificarlo. Acá sale igual para
todos y se mide.

Son siete pasos, cada uno con su motivo:

1. pasabanda 300–3400 Hz, cuatro polos por lado — la banda de radio;
2. campana de +6 dB en 1,8 kHz — el «honk» del parlante chico;
3. recorte blando con `tanh` — la saturación del transmisor;
4. cuantización a 7 bits — la aspereza digital;
5. **cortes al azar** de 15 a 70 ms — lo QUEBRADO, la señal que se pierde;
6. cama de estática filtrada + chasquidos — el ruido del canal;
7. **la banda otra vez, a la salida.**

Todo se remuestrea a 16 kHz antes de empezar: una radio *es* angosta, a 16 kHz
no se pierde nada de 300–3400 Hz y el filtrado tarda un tercio.

### El paso 7 no estaba y era el que hacía falta

Con seis pasos, cinco de los seis sonidos quedaban bien pero **el gruñido tenía
el 66,6 % de su energía por debajo de 300 Hz** — de radio no tenía nada. La
causa: el gruñido es casi todo grave, y **la saturación del paso 3 regenera los
graves que el paso 1 había sacado**. Un transmisor real filtra lo que emite, no
lo que entra. Con el filtro de salida:

| sonido | <300 Hz | 300–3400 Hz | >3400 Hz |
|---|---|---|---|
| grito | 0,6 % | **99,3 %** | 0,1 % |
| screamer | 0,2 % | **99,7 %** | 0,1 % |
| grunido | 9,8 % | **90,2 %** | 0,0 % |
| voz_1..3 | 0,1–0,2 % | **95,9–99,7 %** | 0,1–0,4 % |

El gruñido pasó de 66,6 % a 9,8 % de graves fuera de banda: ahora lo llevan sus
armónicos, que es justo lo que una radio le hace a una voz grave.

### El screamer se eligió midiendo, no escuchando

Se generaron tres candidatas del mismo momento y ganó la que dio mejor número.
Un grito desgarrado no es uno fuerte: es uno cuya **amplitud se sacude sola**, y
esa sacudida vive entre 30 y 150 Hz del espectro de la **envolvente**. Eso es lo
que el oído lee como una voz que se raja, frente a un tono limpio y sostenido.
Se mide después de la cadena de radio, que es lo que termina sonando.

| candidata | aspereza (30–150 Hz de la envolvente) | sostenido (>−12 dB del pico) |
|---|---|---|
| a | **32,25 %** | 1,9 % |
| **b — la que quedó** | 26,56 % | **37,2 %** |
| c | 12,82 % | 19,3 % |

La `a` era la más áspera de las tres y no servía: sonaba fuerte apenas el 1,9 %
de su duración, o sea un chasquido, y la embestida dura 1,30 s — no la habría
cubierto. Por eso la decisión es el **producto** de las dos columnas y no la
aspereza sola.

### Y dos cosas que el juego no hacía

- **La embestida reusaba `grito()`**, así que el momento más fuerte del juego
  sonaba igual que el aviso de veinte segundos antes. Ahora tiene el suyo.
- **El bicho no hacía ruido caminando.** El gruñido lejano sale cada 7–16 s y es
  el aviso de que existe; la voz suelta sale cada 3,5–8,5 s y mucho más baja, y
  suena aunque no tenga idea de dónde estás. Ninguna de las dos suena cazando:
  ahí ya están el grito y la música.

## La regla que faltaba: el tope sale de la cadencia, no del gusto

**Un sonido de paso más largo que el hueco entre dos pasos se pisa a sí mismo,
y lo que se oye no son pasos sino un zumbido.** Es obvio dicho así y me costó
una vuelta entera: horneé la primera tanda con topes «generosos a propósito»
—0,40 s el paso, 0,70 s la pisada— sin cruzarlos nunca contra la cadencia a la
que el juego los dispara.

Los huecos salen del código, no de la intuición. En `main.js` el balanceo
avanza `dt * (corriendo ? 13 : 8.5)` y cae un paso cada vez que cruza π, o sea
`13/π = 4,14` pasos por segundo corriendo. En `langosta.js` el bicho pisa a
`3,1` por segundo cuando te caza. De ahí:

| disparo | veces/s | hueco | antes | ahora |
|---|---|---|---|---|
| paso caminando | 2,71 | 0,370 s | 0,400 s — solapa | 0,200 s — sobran 170 ms |
| paso corriendo | 4,14 | 0,242 s | 0,400 s — solapa 158 ms | 0,150 s — sobran 92 ms |
| pisada, buscando | 1,50 | 0,667 s | 0,700 s — solapa | 0,240 s — sobran 427 ms |
| **pisada, cazando** | 3,10 | 0,323 s | **0,700 s — solapa 377 ms** | 0,240 s — sobran 83 ms |

La fila que rompía todo es la última: con el bicho cazándote había **más de dos
pisadas apiladas en todo momento**, permanentemente.

Dos cosas más que faltaban directamente:

- **correr no tenía sonido propio**, era el de caminar con más volumen — y
  encima el que peor entraba en su hueco;
- **deslizarse era mudo**: la rama del deslizamiento no llamaba a ningún sonido.

Y al hornear tan corto, el cierre no puede ser de 20 ms fijos: en una muestra de
0,15 s eso es un corte. Se hace sobre el **último 35 %** de lo que dure.

## Los dos números que hay que mirar si se regenera alguno

**El generador devuelve ruido blanco y no avisa.** Cuatro de los dieciséis
—`ambiente`, `persecucion`, `pisada_1`, `paso_madera_2`— volvieron como
estática pura la primera vez, con el `status: ready` más tranquilo del mundo.
Escucharlos no era una opción; medirlos sí:

```
                20    60   120   250   500  1000  2000  4000  8000 16000 Hz
ambiente (mal)   0   -10   -12   -15   -11   -11    -9    -7    -4    -8
ambiente (bien)  0    -4   -14   -33   -51   -62   -65   -62   -62   -80
```

**Un sonido real cae a −40 dB o menos en 16 kHz. La estática se queda en −5.**
Ese solo número separa los dieciséis buenos de los malos, y es el chequeo que
hay que correr sobre cualquier regeneración antes de meterla al juego.

Lo que arregló los cuatro fue sacarles del prompt las palabras `hum`, `air` y
`noise` —que el modelo leyó como «estática»— y pedir **tono explícito**:
*"sustained low bass note around 55 Hz"* en vez de *"soft mechanical hum"*,
más un `"no hiss, no static, no white noise"` al final.

## Cómo se regenera

Los tres scripts están en el historial de la sesión, pero el ciclo es corto:

1. `python3 herramientas/rezona/rz.py call submit_audio_generation '{…}'` con
   `kind` `sound` o `music`, `output_format: "wav"` (el mp3 mete padding
   adelante y eso arruina un paso corto y la costura de un bucle).
2. `check_generation_tasks` hasta `ready`. Salen en 0,5–3 s.
3. `fetch_generated_asset` **desde una carpeta con marca `.rezona/`**, fuera
   del repo (`/tmp/rez_casa`), y con `project_id` y `output_path` además del
   `task_id`.
4. Medir las bandas. Si 16 kHz está arriba de −20 dB, es ruido: rehacerlo.
5. Hornear: sacarle el silencio de adelante (venían hasta 0,3 s, que en un paso
   es un paso que suena tarde), recortar, rampa de 2 ms al ataque y 20 ms al
   cierre, normalizar a −1 dBFS, ogg mono a 88 kbps. Los dos bucles además se
   cruzan consigo mismos 1,5 s para que no se oiga la costura al repetir.

El tope del servidor es **12 generaciones en vuelo**; de a seis anda cómodo.
Y `GENERATION_TOO_MANY_IN_FLIGHT` y `生成服务暂时不可用` son las dos transitorias:
se reintentan y salen.
