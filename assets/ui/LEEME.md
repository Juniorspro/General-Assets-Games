# Interfaz generada (Higgsfield · Recraft V4.1)

- `botones/` — los diez controles en pantalla, estilo frutiger aero. Generados con `background_color:#0a2233`
  fijo y recortados por **clave de color** contra ese valor, así que tienen transparencia real (mirá el hueco
  del joystick). WebP 192 px (el aro 256, la bola 160): **97 KB los diez**.
- `portadas/` — primera versión: una portada por nivel **generada** con Recraft. Quedaron lindas pero no eran el
  juego, así que se reemplazaron.
- `previas/` — **capturas reales de los mapas**, que es lo que se usa hoy en las tarjetas del menú. Se sacan con el
  harness headless (`build/campo_de_tiro/h.mjs` adaptado): entra a cada nivel con `__pk.nivel(k)`, apaga el HUD con
  `__pk.hud(0)`, se para en un punto elegido con `__pk.pos/__pk.mira`, avanza unos frames con `__pk.frames(n)` y
  captura. Después se recorta la franja superior (donde vive el HUD), se lleva a 3:2 y se guarda en WebP:
  **91 KB las catorce**.

Van **embebidas como data URI** en `juegos-pc/Parkour_FP.html`: el juego es un solo archivo y no descarga UI.
Si alguna vez pesa de más, la palanca es sacarlas a jsDelivr con un commit fijado, como los otros assets.
