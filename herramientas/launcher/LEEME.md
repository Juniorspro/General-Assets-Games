# Aero — un launcher de Android

Frutiger Aero y vidrio líquido. **Un `WebView` a pantalla completa** con el
escritorio adentro, y un puente de Java para lo que un WebView no puede hacer:
enumerar las apps, sus iconos, lanzarlas, la batería y el pulso.

## Compilar

```bash
bash herramientas/launcher/compilar.sh
```

Sale en `salida/Aero.apk` (~124 KB). Sin Gradle: `aapt2` + `javac` + `d8` +
`zipalign` + `apksigner`, que es exactamente lo que Gradle haría acá. Necesita
el SDK en `/opt/asdk` (o `ANDROID_SDK`) con `build-tools/34.0.0` y
`platforms/android-34`, y un JDK.

## Instalar

Se instala de costado (`adb install -r salida/Aero.apk`, o pasando el archivo al
teléfono y abriéndolo). Al apretar HOME por primera vez, Android pregunta qué
pantalla de inicio usar. Para volver a elegir después: **mantener apretado el
fondo del escritorio**.

## Probar la interfaz sin compilar

```bash
bash herramientas/launcher/banco.sh AERO1.json aero1.log
```

Abre `app/assets/ui.html` en el banco a 412×892. Sin `AND` el puente no existe,
así que entra `APPS_DEMO` —28 apps de mentira con nombres de paquete de verdad,
para que la siembra de la primera vez recorra el camino que recorre— y las
sondas de `window.__A`.

## Las partes

Las partes son la fuente; `app/assets/ui.html` es la salida. Todo termina
siendo **un** módulo ES, así que el orden importa.

| | |
|---|---|
| `partes/a.html` | el marco, el CSS y el DOM |
| `partes/b.js` | tablas, tres idiomas, ayudas |
| `partes/i_img.js` | el fondo y la mascota en base64 (lo escribe `hornear.py`) |
| `partes/c.js` | el fondo de foto: carga, deriva y profundidad |
| `partes/d.js` | el vidrio líquido (`feDisplacementMap` sobre un SDF) |
| `partes/e.js` | el escritorio: reja, páginas, dock, cajón, búsqueda, menú |
| `partes/z.html` | el puente de mentira, las sondas y `arranca()` |

| | |
|---|---|
| `app/java/…/Principal.java` | la Activity: WebView, insets, HOME |
| `app/java/…/Puente.java` | lo que el WebView no puede hacer |
| `app/java/…/ClienteIconos.java` | sirve los iconos como si fueran de la red |
| `icono.py` | dibuja el icono de la app en las cinco densidades |
| `hornear.py` | mete el fondo y la mascota en `partes/i_img.js` |

## Las sondas

`window.__A`: `estado()` · `fondo()` (si la foto decodificó y que no quede un
solo lienzo vivo) · `widget()` y `bateria(n,c)` · `refr()` · `cajas()`
(solapamientos medidos) · `riel()` y `letra(L)` (el índice A-Z) · `masc()` ·
`cajon`, `pagina`, `menu`, `buscar`, `insets`.
