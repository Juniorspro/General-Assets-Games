SKILL: GAMER INTERPOLACIÓN

OBJETIVO
Implementar en juegos HTML5/JavaScript un sistema profesional de optimización visual para mejorar la fluidez cuando el rendimiento real cae, especialmente en móviles de gama baja. La skill debe integrarse al juego existente sin cambiar su jugabilidad, controles, físicas, contenido o diseño.

PRINCIPIO CENTRAL
Separar completamente:
- SIMULACIÓN: física, lógica, IA, colisiones y gameplay.
- RENDERIZADO: representación visual en pantalla.

Un frame generado o interpolado es SOLO visual y jamás debe ejecutar física, IA, daño, input, colisiones ni eventos de gameplay.

PIPELINE OBJETIVO

SIMULACIÓN
→ FIXED TIMESTEP
→ PREVIOUS STATE / CURRENT STATE
→ RENDER INTERPOLATION
→ FRAME PACING
→ OPTIONAL FRAME GENERATION
→ DISPLAY

En paralelo:

PERFORMANCE MANAGER
→ FRAME-TIME MONITOR
→ DYNAMIC RESOLUTION
→ ADAPTIVE QUALITY
→ LOD
→ CULLING
→ EFFECT SCALING
→ AUTOMATIC FALLBACKS

1. FIXED TIMESTEP
Implementar fixed timestep + accumulator.
La simulación no debe depender del FPS de renderizado.
Evitar spiral of death y limitar deltaTime máximo.

2. STATE BUFFERING
Mantener previousState y currentState.
Guardar, cuando corresponda:
- posición
- rotación
- escala
- transformaciones
- estados de animación

3. RENDER INTERPOLATION
Interpolar visualmente entre estados:

interpolated = previous * (1 - alpha) + current * alpha

Usar interpolación angular apropiada y quaternion slerp cuando corresponda.

Aplicarlo a:
- jugador
- NPCs
- enemigos
- objetos
- vehículos
- proyectiles
- cámara
- animaciones
- partículas cuando sea conveniente

4. FRAME PACING
Priorizar cadencia estable.
Evitar:
- jitter
- microstuttering
- frames duplicados innecesarios
- frames descartados innecesarios
- picos de CPU/GPU

Usar requestAnimationFrame como sincronización principal cuando corresponda.

5. ADAPTIVE FRAME RATE
Monitorizar:
- FPS
- frametime
- frame-time variance
- frames perdidos
- spikes
- promedios móviles
- percentiles de frametime

No reaccionar a un único frame malo.

6. PERFORMANCE MANAGER
Crear un módulo central llamado PerformanceManager.

Debe controlar:
- target FPS
- frametime
- render scale
- quality level
- LOD
- efectos
- partículas
- sombras
- frame interpolation
- frame generation

Debe permitir:
PerformanceManager.enabled = true
PerformanceManager.targetFPS = 60
PerformanceManager.frameInterpolation = true
PerformanceManager.frameGeneration = true
PerformanceManager.dynamicResolution = true
PerformanceManager.adaptiveQuality = true

7. DYNAMIC RESOLUTION SCALING
Separar resolución de pantalla y resolución interna.
Usar render scale adaptable:
100%, 90%, 80%, 75%, 67%, 60%, 50% o valores intermedios.

Ajustar según frametime con hysteresis y cooldowns.
No cambiar resolución por un único frame malo.

8. ADAPTIVE QUALITY
Crear perfiles:
ULTRA
HIGH
MEDIUM
LOW
VERY LOW

Ajustar progresivamente:
- sombras
- resolución de sombras
- partículas
- post-processing
- reflejos
- distancia de dibujado
- LOD
- filtrado de texturas
- efectos ambientales
- complejidad de animaciones
- objetos secundarios

Evitar cambios constantes usando hysteresis.

9. LOD DINÁMICO
Usar modelos/representaciones simplificadas para objetos lejanos.
Adaptar LOD al rendimiento.

10. CULLING
Implementar cuando sea compatible:
- frustum culling
- distance culling
- visibility checks
- occlusion-aware techniques cuando sean viables

No procesar ni dibujar elementos que no contribuyen a la imagen.

11. OBJECT POOLING
Usar pools para:
- partículas
- proyectiles
- efectos
- objetos temporales
- enemigos
- collectibles
- decals

Reducir garbage collection, allocations y microstuttering.

12. HOT PATH OPTIMIZATION
Evitar allocations dentro de loops de alta frecuencia:
- new Object()
- new Array()
- nuevos vectores temporales
- closures innecesarias
- operaciones JSON
- concatenación frecuente de strings
- operaciones DOM durante gameplay

Reutilizar buffers y objetos.

13. CAMERA INTERPOLATION
Interpolar independientemente:
- posición
- rotación
- zoom
- FOV cuando corresponda

Evitar saltos visuales sin introducir input lag innecesario.

14. ANIMATION INTERPOLATION
Suavizar:
- skeletal animation
- sprite animation
- transform animation
- camera animation

sin alterar la lógica.

15. LIMITED EXTRAPOLATION
Permitir extrapolación visual limitada usando velocidad cuando sea segura.
No extrapolar agresivamente:
- colisiones
- teleports
- cambios bruscos
- eventos impredecibles
- spawn/despawn

16. FRAME GENERATION
Cuando sea viable, generar frames visuales intermedios entre frames reales.

REAL FRAME A
+
REAL FRAME B
→ MOTION ESTIMATION
→ INTERMEDIATE FRAME
→ DISPLAY

Priorizar primero la interpolación basada en transforms/estados del propio motor porque es más barata y fiable.

17. MOTION VECTORS
En WebGL/WebGPU, usar motion vectors cuando sean beneficiosos.
Pueden utilizarse para:
- frame interpolation
- temporal effects
- reprojection
- motion-aware processing

Desactivarlos automáticamente si su coste supera el beneficio.

18. DEPTH-AWARE REPROJECTION
Cuando exista depth buffer, combinar:
- depth
- motion vectors
- movimiento de cámara
- movimiento de objetos

para reducir:
- ghosting
- double images
- motion incorrecto
- artefactos de disocclusion

19. OPTICAL FLOW
Permitir optical flow solo cuando exista una ruta eficiente.
Prioridad:
GPU shader
→ WebGPU/WebGL
→ hardware acceleration
→ resolución reducida

No ejecutar optical flow pesado en CPU en gama baja.
Si cuesta demasiado, usar transform interpolation/motion vectors.

20. GPU-SIDE PROCESSING
Evitar GPU → CPU → GPU.
Mantener datos en GPU cuando sea posible.
Usar shaders, framebuffers y render targets apropiadamente.

21. WEBGPU / WEBGL
Detectar:
- WebGPU
- WebGL2
- WebGL

Usar la mejor ruta disponible y mantener fallback compatible.

22. OFFSCREENCANVAS / WORKERS
Cuando sea compatible, considerar OffscreenCanvas y Web Workers para:
- IA
- generación procedural
- pathfinding
- cálculos secundarios

No mover trabajo si transferir datos cuesta más que ejecutarlo localmente.

23. INPUT
Mantener input de baja latencia:
- touch
- mouse
- keyboard
- gamepad
- gyroscope
- accelerometer

La interpolación visual no debe duplicar ni retrasar innecesariamente el input.

24. FRAME-TIME BUDGET
Referencias:
60 FPS ≈ 16.67 ms
30 FPS ≈ 33.33 ms
20 FPS ≈ 50 ms
15 FPS ≈ 66.67 ms

Medir frametime además de FPS.
Priorizar estabilidad y reducción de spikes.

25. LOW-END DETECTION
Realizar benchmark corto y no intrusivo.
Considerar:
- WebGL/WebGPU
- resolución
- devicePixelRatio
- hardware concurrency
- rendimiento de render
- frame pacing

Clasificar:
LOW
MEDIUM
HIGH

y ajustar inicialmente calidad, resolución, efectos y LOD.
Continuar adaptando dinámicamente.

26. REFRESH RATE
Detectar frecuencia de pantalla cuando sea posible:
120 Hz → objetivo visual 120
90 Hz → objetivo visual 90
60 Hz → objetivo visual 60

No perseguir una frecuencia imposible si perjudica la estabilidad.

27. FALLBACK HIERARCHY
NIVEL 1:
Native rendering + interpolation

NIVEL 2:
Interpolation + dynamic resolution

NIVEL 3:
Interpolation + dynamic resolution + adaptive quality

NIVEL 4:
Motion-vector assisted interpolation

NIVEL 5:
Advanced frame generation / optical flow si el dispositivo lo permite

Cada técnica debe poder apagarse automáticamente si empeora el rendimiento.

28. ARTIFACT HANDLING
Detectar:
- teleports
- camera cuts
- spawn
- despawn
- grandes discontinuidades
- cambios de escena
- cambios bruscos de UI

Reiniciar historial temporalmente cuando sea necesario.
No interpolar entre estados incompatibles.

29. UI / HUD
No interpolar ciegamente la interfaz.
Mantener:
- texto
- botones
- menús
- HUD
- crosshair
- touch controls

sin ghosting.

30. MOBILE OPTIMIZATION
Optimizar especialmente:
- layout thrashing
- DOM reads/writes
- canvas resizing
- event handlers
- operaciones de layout

Mantener controles táctiles suaves.

31. MEMORY
Controlar:
- texture memory
- framebuffers
- render targets
- buffers
- arrays
- pools

Evitar memory leaks y conservar solo el historial necesario.

32. DEBUG OVERLAY
Añadir modo de diagnóstico con:
REAL FPS
VISUAL FPS
FRAME TIME
1% LOW
0.1% LOW cuando sea posible
FRAME INTERPOLATION ON/OFF
FRAME GENERATION ON/OFF
DYNAMIC RESOLUTION
RESOLUTION SCALE
QUALITY LEVEL
LOD LEVEL
WEBGL/WEBGPU
GPU PATH
SIMULATION Hz
RENDER Hz
DROPPED FRAMES
FRAME SPIKES

Ejemplo:
REAL: 21 FPS
VISUAL: 58 FPS
SIMULATION: 30 Hz
INTERPOLATION: ON
FRAME GENERATION: ON
RESOLUTION: 72%
QUALITY: LOW

33. CANVAS 2D
Si el juego es Canvas 2D, adaptar el sistema usando:
- fixed timestep
- render interpolation
- object pooling
- sprite batching cuando sea posible
- OffscreenCanvas cuando sea útil
- resolution scaling
- adaptive particles
- efficient compositing

No ejecutar optical flow completo en CPU.

34. WEBGL
Priorizar:
- GPU interpolation
- shaders
- framebuffers
- render targets
- motion vectors cuando sean viables
- dynamic resolution
- LOD
- frustum culling
- batching
- instancing cuando corresponda
- texture optimization
- pooling

Evitar readbacks GPU → CPU.

35. WEBGPU
Cuando sea compatible, considerar:
- GPU-side interpolation
- compute shaders cuando aporten beneficio real
- motion vectors
- depth buffers
- GPU frame processing
- dynamic resolution
- efficient render passes
- buffer reuse

No usar una técnica avanzada solo por ser avanzada: medir coste/beneficio.

36. GAMEPLAY SAFETY
Los frames interpolados/generados NO pueden:
- ejecutar física
- ejecutar IA
- causar daño
- activar eventos
- procesar input
- generar colisiones
- duplicar timers
- duplicar partículas lógicas
- duplicar sonidos
- duplicar recompensas

37. NO REESCRIBIR EL JUEGO
Antes de modificar:
- analizar game loop
- render loop
- physics
- entities
- camera
- animation
- particles
- rendering
- input
- assets

Integrar modularmente.
No cambiar mecánicas, controles, diseño, contenido ni comportamiento.

38. PERFORMANCE GOVERNOR
El sistema debe decidir automáticamente qué técnicas usar.
No implementar tecnologías que hagan el juego más lento.

Regla:
Si una técnica cuesta más rendimiento del que recupera, apagarla.

Si GPU está saturada:
→ reducir carga GPU.

Si CPU está saturada:
→ reducir trabajo secundario de JavaScript/IA/partículas.

Si interpolation cuesta casi 0 ms:
→ mantenerla activada.

Si optical flow es demasiado costoso:
→ desactivarlo.

39. OBJETIVO
Escenarios objetivo:

15 FPS reales → mejorar considerablemente la fluidez visual
20 FPS reales → mejorar considerablemente la fluidez visual
25 FPS reales → suavizar hasta una presentación visual mucho más estable
30 FPS reales → intentar presentación visual de 60 FPS cuando sea viable

NO afirmar que un juego que realmente calcula 15 FPS mágicamente tiene 60 FPS de simulación.
La simulación permanece a su frecuencia real; el objetivo es aumentar la fluidez visual mediante:
- render interpolation
- frame pacing
- frame generation
- motion estimation
- dynamic resolution
- adaptive quality
- GPU acceleration

40. TESTING
Probar deliberadamente:
15 FPS
20 FPS
25 FPS
30 FPS
40 FPS
60 FPS

Comprobar:
- fluidez
- input latency
- física
- colisiones
- cámara
- animaciones
- memoria
- frame pacing
- artefactos

Simular cargas CPU/GPU.

41. ORDEN DE PRIORIDAD
1. estabilidad
2. fluidez visual
3. baja latencia
4. rendimiento
5. calidad visual

42. IMPLEMENTACIÓN
No entregar solamente una explicación o pseudocódigo.
Analizar el proyecto existente e implementar código real.
Integrar el sistema modularmente.
Conservar el funcionamiento del juego.
Usar fallbacks automáticos.

Antes de empezar, analizar completamente la arquitectura del proyecto y determinar qué técnicas son realmente compatibles con su renderer y plataforma.
