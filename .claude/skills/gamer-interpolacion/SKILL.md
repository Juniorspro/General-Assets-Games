---
name: gamer-interpolacion
description: Optimización visual de juegos HTML5/JS con interpolación de fotogramas — separar simulación (fixed timestep) de renderizado, interpolar entre estados previo/actual, frame pacing, resolución dinámica y calidad adaptativa con un PerformanceManager central. Usar cuando un juego del repo tironee, muestre "animaciones fantasma", microstuttering, o haya que hacerlo andar fluido a 60/120 Hz o en celulares de gama baja.
---

# Gamer Interpolación

Guía completa en `REFERENCIA.md` (spec original). Lo esencial y lo ya aprendido en este repo:

## Regla de oro
Simulación y renderizado son cosas distintas. Un frame interpolado o generado es **sólo visual**:
nunca corre física, IA, daño, input, colisiones ni eventos de gameplay.

## Pipeline
`fixed timestep → previousState/currentState → interpolación de render → frame pacing → (frame generation) → display`,
y en paralelo un `PerformanceManager` que mira frametime (promedios móviles y percentiles, **nunca un
frame suelto**) y mueve render scale, LOD, efectos y sombras con histéresis y cooldown.

## Lo medido en este repo (usar de arranque, no re-descubrirlo)

- **cannon-es ya trae la interpolación hecha**: si llamás `world.step(1/60, dt, maxSub)`, cada body
  mantiene `body.interpolatedPosition` / `interpolatedQuaternion`. Dibujar con `body.position`
  produce tironeo porque por frame entran 0, 1, 2 o 3 subpasos: medido en SUX SANDBOX, el avance
  del jugador iba de **0 a 453 mm por frame** (velocidad aparente ±60 % corriendo, 21 % de los
  frames sin avanzar). Cámara y personaje tienen que leer la interpolada, con un guardarraíl:
  si difiere de la real más de ~0,5 m, gana la real (teleports, respawn, noclip).
- **three.js: `fadeIn()` NO escribe el peso, lo MULTIPLICA** (`weight = this.weight * interpolante`).
  Una acción creada con `setEffectiveWeight(0)` nunca vuelve a levantar peso y su reloj corre con
  peso efectivo 0 para siempre: en SUX las piernas quedaron clavadas (recorrido del pie **0,0000 m
  en 180 frames**) y el personaje "parpadeaba". Manejar el peso a mano con una mezcla exponencial
  (`w += (objetivo - w) * min(1, k*dt)`) y no tocarlo desde ningún otro lado.
- **Histéresis en los umbrales de estado de animación**: sin ella, la velocidad oscila alrededor
  del umbral y el estado rebota (medido: **4,66 cambios por segundo**), reiniciando la mezcla y
  saltando la pose hasta 27,8 cm en un frame.
- **Orden dentro del frame**: colocar el personaje (posición y yaw) ANTES de resolver IK y de la
  cámara. Si el IK se resuelve en el marco del frame anterior, el error alterna frame a frame y
  aparece un zumbido de 1 frame (medido: pico de DFT en fs/2, 21,3 Hz).
- **Nada de constantes por frame**: `x += 0.5` por frame va al doble a 120 Hz. Todo por segundo
  (`x += v*dt`), y `dt` acotado (`min(dt, 0.05)`) para que un hipo no dispare la simulación.
- **Medir con el CPU frenado** (`Emulation.setCPUThrottlingRate` por CDP) además de a pelo: los fps
  de swiftshader en headless no dicen nada del celular, pero el número frenado ordena bien las
  optimizaciones (en RELIQUIA: 0,1 → 3,2 fps con el mismo frenado).

## Cómo verificar
Medir sobre **frames reales** (`requestAnimationFrame`), no con un `step()` sintético, y reportar:
- pico a pico y desvío del movimiento por frame de lo que se acusa de temblar;
- **índice de alternancia** (¿el signo del cambio se invierte cada frame? entonces es desfase de
  1 frame, no ruido);
- histograma de subpasos de física por frame;
- y una tira de 10-12 capturas consecutivas: si las piernas no cambian de pose entre cuadros, la
  animación no avanza; si falta el personaje en algún cuadro, hay dos módulos peleando la
  visibilidad.
