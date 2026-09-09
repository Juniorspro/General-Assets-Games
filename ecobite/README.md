# ECOBITE — mini trabajo práctico

Idea de **Juniors Tomás Gómez**.

Documento de 16 páginas sobre ECOBITE: una barrita de cereal hecha con cáscara, pulpa
y fruta de descarte.

- **PDF listo:** [`ECOBITE-dossier.pdf`](ECOBITE-dossier.pdf) · A4 · 16 páginas
- **Fuente editable:** [`dossier.html`](dossier.html) + [`estilo.css`](estilo.css)

## Cómo se arma

El PDF no se escribe a mano: se maqueta en HTML y lo imprime Chromium, así que para
cambiar un texto se edita `dossier.html` y se vuelve a imprimir.

```bash
python3 bajar_fuentes.py     # Fraunces, Inter e IBM Plex Mono -> fonts/ + fuentes.css
python3 generar_imagenes.py  # candidatas de las 11 fotos -> candidatas/
python3 generar_qr.py        # QR de trazabilidad -> img/qr-trazabilidad.svg
node imprimir.js             # dossier.html -> ECOBITE-dossier.pdf
```

`imprimir.js` avisa si alguna página se pasa del alto útil del A4, que es el error más
fácil de cometer al editar el texto.

## Las imágenes

Generadas con [Pollinations](https://pollinations.ai): gratuita y sin clave. En el nivel
anónimo solo corre el modelo `sana` — pedir `model=flux` devuelve exactamente el mismo
archivo, así que no sirve de nada.

Lo que sí cambia la calidad es el prompt: frases cortas y concretas
("*a bowl of orange powder with a wooden spoon*") dan mucho mejor resultado que párrafos
llenos de adjetivos. Por eso el script pide **dos candidatas por toma** con semilla fija,
las deja en `candidatas/` y uno copia a `img/` la que sirve.

Si algún día hay un token de [enter.pollinations.ai](https://enter.pollinations.ai)
(registro gratuito), se destraban modelos bastante mejores — Nano Banana y Seedream —
agregando `&model=nanobanana&token=…` a la URL del script.

Las fotos son ilustrativas: muestran el concepto, no el producto real.

## Sobre los datos

Los valores nutricionales, el rendimiento de secado, el consumo energético y la vida
útil son **estimaciones calculadas**, no mediciones. El capítulo 13 lista qué habría que
ensayar para poder afirmarlos.
