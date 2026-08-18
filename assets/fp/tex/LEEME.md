# Texturas del Parkour FP (generadas con Higgsfield)

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
