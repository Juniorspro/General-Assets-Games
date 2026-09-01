/* El juego viene YA GIRADO.
   ---------------------------------------------------------------------------
   El pedido: que el celular NO tenga que rotar la pantalla. Como una foto
   apaisada guardada en un telefono con el giro bloqueado — la imagen ya viene
   acostada y uno gira el aparato para verla, sin activar nada.

   Asi que el juego entero (canvas + HUD) vive dentro de #rot, un marco que se
   gira 90° por CSS cuando la ventana esta en vertical. El navegador nunca se
   entera: para el seguimos en vertical.

   Girando 90° en el sentido de las agujas, el que mira tiene que girar el
   telefono al reves — 90° en contra, o sea el borde de arriba hacia la
   izquierda. Es como se agarra un celular para jugar.

   Y si la ventana YA esta apaisada —una notebook, o el celular con el giro
   automatico puesto— no se gira nada: no hace falta. La transicion es sola. */

let marco = null, ancho = 0, alto = 0, girado = false;

export function iniciarPantalla() {
    marco = document.getElementById('rot');
    medir();
    addEventListener('resize', medir);
    addEventListener('orientationchange', medir);
    return { ancho: () => ancho, alto: () => alto };
}

function medir() {
    girado = innerHeight > innerWidth;
    ancho = girado ? innerHeight : innerWidth;
    alto = girado ? innerWidth : innerHeight;
    if (!marco) return;
    marco.style.width = ancho + 'px';
    marco.style.height = alto + 'px';
    marco.style.transform = 'translate(-50%, -50%)' + (girado ? ' rotate(90deg)' : '');
    document.body.classList.toggle('girado', girado);
}

export const vistaAncho = () => ancho;
export const vistaAlto = () => alto;
export const estaGirado = () => girado;

/* Un punto de la pantalla al marco girado.
   ---------------------------------------------------------------------------
   Los botones no necesitan esto: viven DENTRO del marco, asi que el navegador
   ya les acierta el click girado y todo. Lo que si lo necesita es lo que se
   lee crudo — el arrastre para mirar y el joystick — porque `clientX/clientY`
   siempre vienen en coordenadas de pantalla, sin girar.

   Con rotate(90deg) alrededor del centro:  p - c = R·(q - centro del marco)
   con R = [[0,-1],[1,0]], asi que la vuelta es la de abajo. */
export function aMarco(px, py) {
    if (!girado) return [px, py];
    const cx = innerWidth / 2, cy = innerHeight / 2;
    return [(py - cy) + ancho / 2, -(px - cx) + alto / 2];
}

/* Un desplazamiento (un arrastre) al marco girado. Es lo mismo sin el centro:
   arrastrar hacia abajo en la pantalla es arrastrar hacia la derecha adentro. */
export function deltaMarco(dx, dy) {
    return girado ? [dy, -dx] : [dx, dy];
}
