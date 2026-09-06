# Texturas (generadas con Higgsfield)

28 materiales fotorrealistas generados con **Recraft V4.1** (Higgsfield) y procesados
para que sean **tileables de verdad**:

1. `planchar()` saca el degradé de luz (viñeta) de la imagen. Sin este paso, curar la
   costura de una foto con viñeta deja una **cruz** visible al repetir: el borde oscuro
   pega contra el centro claro.
2. `curar()` desplaza media imagen (así la costura queda en el centro) y funde las dos
   líneas centrales con su propio espejo en una banda angosta. El borde exterior, que
   antes era interior, queda continuo al repetir.
3. Las texturas de **rejilla** (fachada de vidrio, azulejos, adoquines, casco espacial)
   no se pueden curar así: el espejo desalinea la cuadrícula. Para esas se detecta el
   **período** de la grilla por autocorrelación, se recorta UNA celda y se rearma la
   textura repitiéndola con variación de brillo por celda → calza exacto.
4. Los recortes con alpha (`copa`, `rama`, `hoja`, `hojas`, `palma`, `tuft`) se generaron
   sobre un fondo magenta plano `#ff00ff` y se **desmezcla** el fondo: donde el píxel es
   mezcla de magenta y hoja se resta la parte de magenta, en vez de dejar el halo rosa.

La costura se **mide**: `|columna 0 - columna -1|` normalizada contra el gradiente interno
medio. 1.0 = la unión se ve igual que el ruido propio de la textura (o sea, invisible).

| textura | uso |
|---|---|
| pasto, tierra, roca | islas flotantes y suelo del mundo frutiger |
| corteza, copa, rama, hojas, hoja, helecho | árboles y vegetación |
| tuft | pasto lejano (billboards) |
| fachada, asfalto, adoquin, hormigon | ciudad y plataformas |
| alfombra, papel | backrooms |
| azulejo, agua, vidrio | poolrooms, acuario, invernadero |
| casco, acero, chapa | base espacial y obby de cristal |
| lava | obby de cristal |
| nube | mundo sobre las nubes |
| arena, madera, palma | playa del atardecer |
| marmol | piso del jardín de vidrio |

Guiones: `/tmp` no sobrevive al contenedor, así que el pipeline quedó documentado acá.


## Segunda tanda: los materiales del Valle Ceniza (battle royale)

Seis materiales que el valle dibujaba con lienzos procedurales y no existian como foto:
`ladrillo`, `ladrillorojo`, `ceniza`, `grava`, `quemado`, `rejilla`. Generadas con
**Nano Banana Pro** a 2048 y bajadas a 640 el color y 512 la normal, que es el presupuesto de las
de la primera tanda (las 42 juntas pesan 2,6 MB; estas doce, 783 KB).

Mismo proceso de teselado, con una correccion importante al metodo: **no se devuelve el
desplazamiento al final**. Desplazando media imagen, las dos columnas que antes eran los bordes
quedan pegadas en el centro, y ahi se funden; el borde NUEVO son dos columnas que en la foto
original eran vecinas, asi que al repetir se juntan dos columnas contiguas de verdad. Devolviendo el
desplazamiento se deshace todo: las columnas fundidas vuelven al borde y, como fundir con el espejo
las deja iguales, al repetir queda una linea plana de un pixel. Medido daba costura 0.00 — parecia
perfecto y era el sintoma del error, porque las que ya andan en el juego miden ~1.0.

Las **normales van derivadas aca y no en el telefono**. El juego sabe derivarlas del color, pero en
JS sobre un lienzo cuesta hasta un segundo y medio por material en un rasterizador por software.
Como archivo, el aparato solo las descarga.

| textura | costura v / h | uso en el valle |
|---|---|---|
| ladrillo | 1.45 / 2.76 | paredes de ladrillo tostado |
| ladrillorojo | 2.10 / 0.67 | paredes de ladrillo rojo |
| ceniza | 1.01 / 1.06 | el suelo del mapa, ceniza clara y oscura |
| grava | 0.81 / 0.88 | banquinas y playones |
| quemado | 0.90 / 1.24 | madera carbonizada |
| rejilla | 0.60 / 0.37 | pasarelas y rejas |

Los dos ladrillos miden peor porque una junta de mortero ES un gradiente grande: la medida los
castiga sin que se vea. Verificado repitiendo 3x3 y mirando: no aparece cruz ni corte en ninguna de
las seis, y la hilada de ladrillos sigue de una baldosa a la otra.

El guion que hace todo esto queda en `herramientas/tesela.py`, que antes no estaba en el repo.


## Tercera tanda: los materiales del ARMA

El arma usa siete materiales y solo tres tenian foto (`maderaak` para las dos maderas y `metalak`
para el metal). Los otros cuatro se dibujaban con color plano: el polimero negro del cajon, el
polimero tostado de la culata, el laton de los cartuchos y el cuero trenzado de las empunaduras del
machete y el cuchillo. Generadas con **Nano Banana Pro**, mismo proceso y mismo presupuesto: 640 el
color, 512 la normal, 470 KB las ocho.

| textura | costura v / h | uso |
|---|---|---|
| polimero | 1.32 / 1.30 | cajon, guardamanos y empunadura |
| polimerotan | 0.97 / 1.25 | culatas y guardamanos color desierto |
| laton | 0.84 / 0.93 | cartuchos y casquillos |
| cuero | 1.04 / 1.17 | trenzado del machete y el cuchillo |
