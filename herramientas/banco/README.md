# El banco de pruebas

Chromium de verdad, con WebGL por SwiftShader, corriendo un plan sobre el juego
y dejando capturas y números. Es lo que convierte «parece que anda» en un dato.

```bash
bash herramientas/banco/armar.sh            # arma /tmp/ui (idempotente)
cp elplano.html /tmp/ui/x.html
cd /tmp/ui && PAGINA=x.html MOVIL=1 bash run2.sh PLAN.json out/x.log 412 892
```

`/tmp/ui` es carpeta de trabajo: se pierde con el contenedor y se rearma con
`armar.sh`. La fuente vive acá.

## El plan

Una lista de pasos:

| paso | hace |
|---|---|
| `{"js": "…"}` | evalúa en la página y anota lo que devuelve |
| `{"click": "sel"}` | click en un selector |
| `{"tap": [x, y]}` | toque en coordenadas del viewport |
| `{"key": "KeyW", "ms": 400}` | mantiene una tecla y la suelta |
| `{"wait": 800}` | espera |
| `{"n": "nombre"}` | captura a `out/nombre.png` |

Las capturas salen **derechas**, en el tamaño que se le pase (412×892 por
defecto, que es el celular en vertical). La consola, los errores de página y
los pedidos de red que fallan van al log.

## Tres cosas que hay que saber

**`MOVIL=1` enciende el joystick.** Los controles táctiles se muestran con
`@media (hover: none) and (pointer: coarse)`; sin `isMobile` el CSS no los
saca y se prueba una pantalla que el usuario nunca ve.

**Headless corre a uno o dos cuadros por segundo.** Un toque de tecla corto
cae entero entre dos cuadros y no pasa nada: por eso `{"key": …}` la
**mantiene**. Y una sonda leída en el mismo instante que la acción devuelve el
valor viejo — hay que dejar pasar un `wait` antes de creerle.

**El navegador del contenedor no sale por el proxy** (curl sí). Un `import`
a jsdelivr falla sin decir mucho: por eso hay un servidor local en `run2.sh` y
por eso los juegos van autocontenidos.

## Chequear la sintaxis antes de abrir nada

Un `const` leído antes de su línea tira y se lleva el módulo entero. Sale más
barato preguntarle a acorn:

```bash
node -e "const a=require('/tmp/ui/node_modules/acorn'),f=require('fs');
const s=f.readFileSync('elplano.html','utf8');
const m=s.match(/<script type=\"module\">([\s\S]*)<\/script>/);
try{a.parse(m[1],{ecmaVersion:'latest',sourceType:'module'});console.log('ok')}
catch(e){console.log('ERROR',e.message)}"
```

## Archivos

```
armar.sh    arma /tmp/ui: enlaza el playwright global, instala three y acorn
run2.sh     levanta el servidor en 8098 y corre el plan
banco.js    el corredor: abre chromium, ejecuta los pasos, captura y anota
```
