# Los sonidos en archivo

Ya no está vacío. Los dieciséis sonidos están **generados con Rezona Lab** y
horneados a ogg mono: **296 KB los dieciséis juntos**, y el `ambiente` —el
único que suena todo el tiempo— son 51 KB.

El sintetizador **sigue estando y sigue siendo la red**: cada sonido pregunta
primero por su muestra y, si el archivo no llegó, cae al sintetizador de
siempre (`src/sonido.js`). Borrar un `.ogg` de acá no rompe nada; degrada ese
sonido y nada más.

## Lo que hay

| archivo | qué es | dura | pesa |
|---|---|---|---|
| `ambiente.ogg` | el colchón de la casa, en bucle | 8,90 s | 51,2 KB |
| `persecucion.ogg` | la música de cuando te caza, en bucle | 8,10 s | 68,9 KB |
| `paso_1..3.ogg` | pasos sobre alfombra | 0,40 s | 6,5–6,8 KB |
| `paso_madera_1..2.ogg` | pasos sobre madera (el cajón) | 0,40 s | 7,4–7,6 KB |
| `pisada_1..2.ogg` | la pisada del bicho | 0,70 s | 8,9–11,7 KB |
| `grito.ogg` | el chillido de cuando te ve | 1,10 s | 14,4 KB |
| `grunido.ogg` | el gruñido lejano | 1,80 s | 17,9 KB |
| `golpe.ogg` | aterrizar y la embestida | 0,55 s | 9,2 KB |
| `cajon.ogg` | revisar un mueble | 0,95 s | 10,4 KB |
| `portazo.ogg` | la puerta de salida | 0,70 s | 10,0 KB |
| `campana.ogg` | la campana del final | 3,20 s | 30,6 KB |
| `riser.ogg` | el barrido de la corrida final | 3,40 s | 27,6 KB |

Las variantes numeradas se eligen al azar con ±6 % de tono: un paso repetido
idéntico veinte veces se lee como un error, no como un paso.

**`grunido`, sin eñe.** El nombre viaja adentro de una URL del CDN y ahí el
UTF-8 hay que escaparlo. La clave en `src/muestras.js` es `snd_grunido`.

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
