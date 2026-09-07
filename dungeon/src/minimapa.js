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
import { estaGirado } from './pantalla.js';

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

/* Se llama una vez, cuando ya existe el lienzo del HUD.

   EN VERTICAL EL CUADRO ENTERO VA ROTADO 90°, asi que un minimapa dibujado
   derecho se ve de costado y el norte apunta a la derecha de la pantalla. Se
   arregla rotando el DIBUJO adentro del lienzo, no con un `transform` en el
   CSS: girar el elemento obliga a pelearse con el `transform-origin` para que
   no se vaya de la esquina, y esto es una linea. */
export function armarMinimapa(cv) {
    if (!cv) return null;
    const g90 = estaGirado();
    cv.width = g90 ? ALTO : ANCHO;
    cv.height = g90 ? ANCHO : ALTO;
    cv.style.width = cv.width + 'px';
    cv.style.height = cv.height + 'px';
    if (!fondo) dibujarFondo();
    acomodar(cv);
    addEventListener('resize', () => acomodar(cv));
    addEventListener('orientationchange', () => setTimeout(() => acomodar(cv), 60));
    return cv.getContext('2d');
}

/* DONDE VA EL MINIMAPA: arriba a la izquierda DE LA PANTALLA.

   Deducirlo del giro no alcanzo. El marco se rota 90° y cada esquina termina en
   otra, asi que la esquina del marco que hay que usar depende del giro — y ahi
   me equivoque una vez: en el banco daba arriba a la izquierda y en el telefono
   salia abajo. Cuando la cuenta y el aparato no coinciden, gana el aparato.

   Asi que no se calcula: se PRUEBA. Se pega el lienzo a cada una de las cuatro
   esquinas del marco, se mide donde cae de verdad en pantalla con
   `getBoundingClientRect` —que ya viene con la rotacion aplicada— y se queda la
   que quede mas cerca del cero. Son cuatro medidas, una vez, y despues solo si
   la pantalla cambia de tamano. */
function acomodar(cv) {
    const ESQUINAS = [
        { top: '14px', left: '14px', right: 'auto', bottom: 'auto' },
        { top: '14px', right: '14px', left: 'auto', bottom: 'auto' },
        { bottom: '14px', left: '14px', top: 'auto', right: 'auto' },
        { bottom: '14px', right: '14px', top: 'auto', left: 'auto' },
    ];
    let mejor = null, mejorD = Infinity;
    for (const e of ESQUINAS) {
        Object.assign(cv.style, e);
        const r = cv.getBoundingClientRect();
        if (!r.width) return;               // todavia no se ve: se deja como esta
        const d = Math.hypot(r.left, r.top);
        if (d < mejorD) { mejorD = d; mejor = e }
    }
    if (mejor) Object.assign(cv.style, mejor);
}

/* Un cuadro. `cubos` son los de la mision: cada uno con su `hex`, su `obj`
   —de donde sale la posicion— y `puesto`. */
export function pintarMinimapa(g, jug, cubos, baldosas) {
    if (!g || !fondo) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    if (estaGirado()) { g.translate(0, ANCHO); g.rotate(-Math.PI / 2) }
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
