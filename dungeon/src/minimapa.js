/* EL MINIMAPA.
   ---------------------------------------------------------------------------
   Sirve para UNA cosa: encontrar los tres cubos. La casa tiene 41 x 33 celdas
   y dieciocho sectores, y sin una guia buscar los bloques es barrer cuartos al
   azar hasta que aparezcan — que no es tension, es aburrimiento.

   Por eso muestra lo justo: las paredes, donde estas mirando, y un punto del
   color de cada cubo. Nada de muebles, nada de nombres, y el bicho NO aparece:
   si vieras dónde está, el juego se termina.

   Las paredes se dibujan UNA VEZ en un lienzo aparte y despues cada cuadro se
   copia esa imagen y encima van los puntos. Redibujar 1.400 bordes sesenta
   veces por segundo para que no se muevan nunca es tirar el cuadro a la basura. */
import { W, H, CELL, paredV, paredH, NADA, PUERTA, GATERA } from './map.js';

const LADO = 2;                      // pixeles por celda
const ANCHO = W * LADO, ALTO = H * LADO;

let fondo = null;                    // el lienzo con las paredes, ya dibujado

/* Mundo -> celda. Es la inversa de `toWorld` de map.js y tiene que seguirla:
   si una cambia, la otra tambien. */
const aCelda = (x, z) => [x / CELL + W / 2 - 0.5, z / CELL + H / 2 - 0.5];

function dibujarFondo() {
    const cv = document.createElement('canvas');
    cv.width = ANCHO; cv.height = ALTO;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(14,10,9,.55)';
    g.fillRect(0, 0, ANCHO, ALTO);

    g.lineWidth = 1;
    g.lineCap = 'square';
    for (let r = 0; r < H; r++) {
        for (let c = 0; c <= W; c++) {
            const v = paredV(c, r);
            if (v === NADA) continue;
            /* Las puertas y las gateras van MAS CLARAS y no del color de la
               pared: un minimapa donde todo es una linea igual no dice por
               donde se pasa, y eso es justo lo que hace falta para llegar a un
               cubo. */
            g.strokeStyle = (v === PUERTA || v === GATERA)
                ? 'rgba(214,180,120,.62)' : 'rgba(226,214,198,.90)';
            g.beginPath();
            g.moveTo(c * LADO + .5, r * LADO);
            g.lineTo(c * LADO + .5, (r + 1) * LADO);
            g.stroke();
        }
    }
    for (let r = 0; r <= H; r++) {
        for (let c = 0; c < W; c++) {
            const v = paredH(c, r);
            if (v === NADA) continue;
            g.strokeStyle = (v === PUERTA || v === GATERA)
                ? 'rgba(214,180,120,.62)' : 'rgba(226,214,198,.90)';
            g.beginPath();
            g.moveTo(c * LADO, r * LADO + .5);
            g.lineTo((c + 1) * LADO, r * LADO + .5);
            g.stroke();
        }
    }
    fondo = cv;
}

/* Se llama una vez, cuando ya existe el lienzo del HUD. El lienzo esta FUERA
   del marco que se rota, asi que se dibuja derecho y se ubica con CSS: no hay
   giro que compensar ni esquina que adivinar. */
export function armarMinimapa(cv) {
    if (!cv) return null;
    cv.width = ANCHO; cv.height = ALTO;
    cv.style.width = ANCHO + 'px';
    cv.style.height = ALTO + 'px';
    if (!fondo) dibujarFondo();
    return cv.getContext('2d');
}

/* Un cuadro. `cubos` son los de la mision: cada uno con su `hex`, su `obj`
   —de donde sale la posicion— y `puesto`. */
export function pintarMinimapa(g, jug, cubos, baldosas) {
    if (!g || !fondo) return;
    g.clearRect(0, 0, ANCHO, ALTO);
    g.drawImage(fondo, 0, 0);

    const hex = n => '#' + n.toString(16).padStart(6, '0');

    /* Primero las baldosas, en hueco: son el destino, y dibujadas como un aro
       no se confunden con el cubo, que va lleno. */
    for (const b of baldosas || []) {
        const [c, r] = aCelda(b.x, b.z);
        g.strokeStyle = hex(b.hex);
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(c * LADO + LADO / 2, r * LADO + LADO / 2, 2.2, 0, 7);
        g.stroke();
    }

    for (const cu of cubos || []) {
        if (!cu.obj) continue;
        const [c, r] = aCelda(cu.obj.position.x, cu.obj.position.z);
        const x = c * LADO + LADO / 2, y = r * LADO + LADO / 2;
        /* El cubo ya puesto queda, pero apagado: sirve para leer cuantos
           faltan de un vistazo sin tener que contar los que brillan. */
        g.globalAlpha = cu.puesto ? 0.35 : 1;
        g.fillStyle = hex(cu.hex);
        g.beginPath(); g.arc(x, y, 2.7, 0, 7); g.fill();
        if (!cu.puesto) {
            g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 1;
            g.beginPath(); g.arc(x, y, 2.7, 0, 7); g.stroke();
        }
        g.globalAlpha = 1;
    }

    // y vos, como una punta de flecha: hace falta saber para donde mirás
    if (jug) {
        const [c, r] = aCelda(jug.x, jug.z);
        const x = c * LADO + LADO / 2, y = r * LADO + LADO / 2;
        /* El yaw de la camara es 0 mirando a -Z, y en el minimapa -Z es hacia
           ARRIBA, asi que el angulo del lienzo es el yaw menos noventa grados. */
        const a = (jug.yaw || 0) - Math.PI / 2;
        g.save();
        g.translate(x, y); g.rotate(-a);
        g.fillStyle = '#fff';
        g.beginPath();
        g.moveTo(4.2, 0); g.lineTo(-2.6, 2.8); g.lineTo(-1.2, 0); g.lineTo(-2.6, -2.8);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1; g.stroke();
        g.restore();
    }
}
