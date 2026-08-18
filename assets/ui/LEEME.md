# Interfaz generada (Higgsfield · Recraft V4.1)

- `botones/` — los diez controles en pantalla, estilo frutiger aero. Generados con `background_color:#0a2233`
  fijo y recortados por **clave de color** contra ese valor, así que tienen transparencia real (mirá el hueco
  del joystick). WebP 192 px (el aro 256, la bola 160): **97 KB los diez**.
- `portadas/` — una portada por nivel, 384×256 WebP: **130 KB las nueve**. Se usan en las tarjetas del menú
  y como fondo del collage.

Van **embebidas como data URI** en `juegos-pc/Parkour_FP.html`: el juego es un solo archivo y no descarga UI.
Si alguna vez pesa de más, la palanca es sacarlas a jsDelivr con un commit fijado, como los otros assets.
