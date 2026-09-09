# ECOBITE — dossier de producto

Documento de concepto de 16 páginas sobre ECOBITE: una barrita de cereal hecha con
cáscara, pulpa y fruta de descarte.

- **PDF listo:** [`ECOBITE-dossier.pdf`](ECOBITE-dossier.pdf) · A4 · 16 páginas
- **Fuente editable:** [`dossier.html`](dossier.html) + [`estilo.css`](estilo.css)

## Cómo se arma

El PDF no se escribe a mano: se maqueta en HTML y lo imprime Chromium, así que para
cambiar un texto se edita `dossier.html` y se vuelve a imprimir.

```bash
python3 bajar_fuentes.py     # Fraunces, Inter e IBM Plex Mono -> fonts/ + fuentes.css
python3 generar_imagenes.py  # las 11 fotos -> img/
python3 generar_qr.py        # QR de trazabilidad -> img/qr-trazabilidad.svg
node imprimir.js             # dossier.html -> ECOBITE-dossier.pdf
```

`imprimir.js` además avisa si alguna página se pasa del alto útil del A4, que es el
error más fácil de cometer al editar el texto.

## Las imágenes

Generadas con [Pollinations](https://pollinations.ai) (gratuita, sin clave). El script
guarda cada toma con una semilla fija, así que repetir la ejecución devuelve las mismas
fotos y no vuelve a descargar lo que ya está.

Las fotos son ilustrativas: muestran el concepto, no el producto real.

## Sobre los datos del documento

Los valores nutricionales, el rendimiento de secado, el consumo energético y la vida
útil son **estimaciones calculadas**, no mediciones. El capítulo 13 del dossier lista
qué habría que ensayar para poder afirmarlos.
