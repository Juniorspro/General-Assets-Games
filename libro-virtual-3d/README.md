# 💕 Librito Virtual 3D

Un libro virtual en 3D hecho con HTML, CSS y JavaScript puro — sin librerías ni internet necesario. Solo abre `index.html` en cualquier navegador (funciona también en el celular).

## Cómo usarlo

- **Abrir**: toca/haz clic en la portada.
- **Pasar página**: clic en la mitad derecha, botón «Siguiente ›», flecha →, o desliza el dedo en el celular.
- **Regresar**: clic en la mitad izquierda, botón «‹ Anterior», o flecha ←.

## Cómo personalizarlo ✏️

Abre `index.html` con cualquier editor de texto y busca la sección que dice **`CONTENIDO DEL LIBRO — ¡EDITA AQUÍ!`** dentro del `<script>`.

### Cambiar la portada

```js
const COVER = {
  title: 'Nuestro\nPequeño Libro',   // \n hace salto de línea
  subtitle: 'Para la persona más especial',
};
```

### Cambiar las páginas

Cada elemento de `PAGES` es una cara del libro. Hay tres tipos:

```js
{ type: 'text',  title: 'Título', body: 'Tu mensaje...' }          // página de texto
{ type: 'photo', src: 'foto1.jpg', caption: 'Pie de foto' }        // página con foto
{ type: 'final', title: 'Te amo', body: 'Mensaje de cierre' }      // página final con corazón
```

Para agregar tus fotos: copia las imágenes (por ejemplo `foto1.jpg`) en esta misma carpeta y pon su nombre en `src`. Si dejas `src: ''` aparece un marco con un corazón 💖 de relleno.

Puedes agregar o quitar tantas páginas como quieras — el libro arma las hojas automáticamente.

### Cambiar los colores

Al inicio del `<style>` están las variables:

```css
--cover-color1: #8e2a4e;   /* color de la portada */
--cover-color2: #5e1231;
--paper: #fdf6ec;          /* color del papel */
--accent: #c94f7c;         /* color de los títulos */
```

## Cómo regalarlo 🎁

- Mándale la carpeta comprimida y que abra `index.html`, o
- Súbelo gratis a GitHub Pages / Netlify y mándale el enlace.
