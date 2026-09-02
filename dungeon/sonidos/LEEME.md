# Los sonidos en archivo

Vacío a propósito. Todo el audio del juego está **sintetizado** y suena sin
ningún archivo acá. Esta carpeta es para **reemplazar de a uno** los sonidos
por grabaciones o generaciones, sin tocar código: el juego busca la muestra y,
si no está, usa el sintetizador.

## Cómo se usa

Poné el archivo con el nombre exacto y listo. Formatos: `.ogg`, `.mp3`,
`.m4a`, `.wav`. El empaquetador los toma solo.

| archivo | qué reemplaza | cuánto debería durar |
|---|---|---|
| `ambiente.ogg` | el colchón de la casa (en bucle) | 20–40 s, sin costura |
| `persecucion.ogg` | la música de cuando te caza (en bucle) | 8–16 s, sin costura |
| `paso_1.ogg` … `paso_3.ogg` | pasos sobre alfombra | 0,1 s |
| `paso_madera_1.ogg`, `_2` | pasos sobre madera (el cajón) | 0,1 s |
| `pisada_1.ogg`, `_2` | la pisada del bicho | 0,2 s |
| `grito.ogg` | el chillido de cuando te ve | 0,8 s |
| `gruñido.ogg` | el gruñido lejano | 1,4 s |
| `golpe.ogg` | el golpe de aterrizar y de la embestida | 0,3 s |
| `cajon.ogg` | revisar un mueble | 0,8 s |
| `portazo.ogg` | la puerta de salida | 0,3 s |
| `campana.ogg` | la campana del final | 2,5 s |
| `riser.ogg` | el barrido de la corrida final | 3 s |

Las variantes numeradas se eligen al azar: un paso repetido idéntico veinte
veces se lee como un error, no como un paso.

## Qué pedirle al generador

Lo que sigue sale de analizar el audio de dos gameplays completos del juego
original — está en el README grande, sección "El audio, contra el audio del
juego real". Son las descripciones textuales del análisis:

- **ambiente** — *"ambient low-frequency drone"*, *"soft mechanical hum"*.
  Grave, quieto, sin melodía. Nada de música.
- **persecucion** — *"fast-paced synth chase music"*, pulso rápido, sintético.
- **paso** — *"muffled carpet thuds"*. Sordo, absorbido, sin brillo.
- **paso_madera** — *"rapid rhythmic thumping of footsteps on wood"*.
- **pisada** — *"heavy, slow footfalls"* de algo de tres metros en zancos.
- **grito** — *"abrupt, loud screech"*. La energía va ARRIBA (~1 kHz).
- **gruñido** — *"distant, distorted low-pitched groan"*.
- **cajon** — *"mechanical click"* + *"wooden drawers opening and closing"*.
- **portazo** — *"loud slamming door"*, y después silencio.
- **campana** — *"a distant chime"*, cola larga.
- **riser** — *"intense cinematic riser"*, sube tres segundos.

## Presupuesto

El juego entero baja 5 MB. Un `ambiente.ogg` de 30 s a 64 kbps mono son ~240 KB
y es el que más rinde: es el único que suena todo el tiempo. Los cortos, a
96 kbps mono, no llegan a 10 KB cada uno.
