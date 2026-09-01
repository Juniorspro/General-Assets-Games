/* Las piernas que se ven al deslizarse.
   ---------------------------------------------------------------------------
   Cuelgan de la camara, asi que acompanan el giro y el rolido — que es lo que
   hace que se lean como MI cuerpo y no como un objeto de la escena.

   La escala sale de la del juego: el ojo va a 55 cm, asi que la pierna entera
   mide 32 cm. Poner unas piernas de persona normal aca las volveria columnas.

   No se dibujan al caminar: aparecen al tirarse y se van solas. Una pierna
   permanente en el borde de la pantalla se vuelve ruido a los diez segundos. */
import * as THREE from 'three';

/* Mas largas que una pierna a escala y la cadera mas atras de lo que
   corresponde: es un modelo de vista, no anatomia. Con la medida real
   asomaba una punta gris en el borde de abajo y no se leia nada. */
const MUSLO = 0.20, PANTORRILLA = 0.26, CADERA = 0.072;

export class Piernas {
    constructor(camara) {
        this.raiz = new THREE.Group();
        this.raiz.visible = false;
        /* Delante del ojo y por debajo: la cadera del que va tirado va atras
           de la cabeza, no debajo. */
        /* Deslizando el ojo va a 19 cm del piso, asi que la cadera no puede
           colgar mucho: con -0,17 el pie terminaba en y = -0,29, o sea DEBAJO
           del parquet, y el piso las tapaba enteras. Van casi horizontales,
           que ademas es como se ve un deslizamiento. */
        /* La cadera va casi en el plano de la camara: con z = 0,15 quedaba
           DETRAS del ojo, o sea del otro lado del plano cercano, y el muslo
           entero se recortaba — se veian dos botas sueltas. */
        this.raiz.position.set(0, -0.10, -0.02);
        this.raiz.renderOrder = 999;
        camara.add(this.raiz);

        /* Esto es un MODELO DE VISTA, no geometria del mundo: se dibuja
           siempre encima y sin consultar la profundidad. Deslizando, el ojo va
           a 19 cm del piso y unas piernas "de verdad" terminan enterradas en
           el parquet — se midio, y los pies quedaban en y = -0,14 con el piso
           en 0. Sacandolas del test de profundidad se pueden encuadrar donde
           se ven bien, que es lo unico que importa en algo que ocupa el borde
           de la pantalla. Por lo mismo no proyectan sombra. */
        /* Material PLANO a proposito. El farol del jugador queda medio metro
           por encima de estas piernas, asi que con un material que responde a
           la luz se queman y salen blancas. Un color fijo no se quema nunca y
           en medio segundo de deslizamiento nadie extrana el sombreado. */
        const comun = { depthTest: false, depthWrite: false };
        const tela = new THREE.MeshBasicMaterial({ color: 0x39405a, ...comun });
        const bota = new THREE.MeshBasicMaterial({ color: 0x1b1512, ...comun });

        const muslo = new THREE.CapsuleGeometry(.033, MUSLO, 4, 10);
        const pant = new THREE.CapsuleGeometry(.026, PANTORRILLA, 4, 10);
        const pie = new THREE.BoxGeometry(.068, .05, .135);
        /* La capsula nace centrada y de pie: se corre media pierna para que el
           giro salga de la articulacion y no del medio del hueso. */
        muslo.translate(0, -MUSLO / 2, 0);
        pant.translate(0, -PANTORRILLA / 2, 0);

        this.lados = [];
        for (const s of [-1, 1]) {
            const cad = new THREE.Group();
            cad.position.set(s * CADERA, 0, 0);
            /* El muslo NO se dibuja: naciendo a cuatro centimetros del lente
               salia una cuna gris que tapaba media pantalla. Se ve de la
               rodilla para abajo, que es lo que uno se ve de si mismo. */

            const rod = new THREE.Group();
            rod.position.y = -MUSLO;
            const p = new THREE.Mesh(pant, tela);
            rod.add(p);

            const tob = new THREE.Group();
            tob.position.y = -PANTORRILLA;
            const b = new THREE.Mesh(pie, bota);
            b.position.set(0, -.022, -.048);
            tob.add(b);

            rod.add(tob);
            cad.add(rod);
            this.raiz.add(cad);
            this.lados.push({ cad, rod, tob, lado: s });
        }
    }

    /* k = cuanto queda del deslizamiento, de 1 al arrancar a 0 al terminar.
       vivo = si sigue deslizando. Cuando se apaga, las piernas se guardan
       hacia abajo en vez de desaparecer de un frame al otro. */
    actualizar(k, vivo, t, dt) {
        this.mezcla = THREE.MathUtils.lerp(this.mezcla ?? 0, vivo ? 1 : 0,
            Math.min(1, dt * (vivo ? 22 : 9)));
        const m = this.mezcla;
        this.raiz.visible = m > 0.02;
        if (!this.raiz.visible) return;

        /* Tirado, las piernas van casi horizontales y por delante: la cadera
           gira hasta acostarlas. Al arrancar van estiradas y al final se
           recogen, que es lo que da la sensacion de frenar. */
        const estirado = 0.35 + 0.65 * k;
        const abrir = (1 - m) * 1.5;              // guardarlas hacia abajo
        for (const L of this.lados) {
            // una pierna adelantada y la otra atras: si van iguales parece un muneco
            // el desfase entre las dos piernas va CHICO: con 0,22 una quedaba
            // quince centimetros mas abajo que la otra y se hundia en el piso
            const desfase = L.lado * 0.10 * estirado;
            /* Girando en X, la pierna —que cuelga en -Y— va a parar a
               (0, -cos, -sin): hace falta angulo POSITIVO para que salga
               hacia adelante, o sea hacia el -Z de la camara. Con el signo
               al reves quedaban atras de la cabeza y no se veian nunca. */
            L.cad.rotation.x = (1.30 * estirado) + desfase * .5 - abrir
                + Math.sin(t * 18 + L.lado) * 0.05 * k;
            /* Abiertas hacia afuera: apuntando derecho al frente se ven de
               PUNTA y quedan dos puntitos. Abiertas se ve el largo. */
            L.cad.rotation.z = L.lado * 0.32 * estirado;
            /* La rodilla se dobla FUERTE. Con la pierna estirada al frente,
               la pantorrilla apunta al mismo lado que la camara y se ve de
               punta: dos puntitos. Doblada, la pantorrilla CAE y entonces se
               le ve el largo, que es lo que hace que se lea como una pierna. */
            L.rod.rotation.x = -(0.80 * estirado + 0.18) + desfase * .35
                - Math.sin(t * 18 + 1.6 + L.lado) * 0.07 * k;
            L.tob.rotation.x = 0.30 * estirado;
        }
    }
}
