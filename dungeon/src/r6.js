/* El cuerpo del jugador: un R6 de Roblox de verdad.
   ---------------------------------------------------------------------------
   R6 son SEIS partes y nada mas: cabeza, torso, dos brazos y dos piernas. No
   tiene codos ni rodillas — es lo que lo hace R6 y no R15. Cualquier cosa que
   le doble la rodilla deja de ser un R6.

   Las medidas van en STUDS, que es la unidad de Roblox, y son las de verdad:

     torso  2 x 2 x 1        brazo  1 x 2 x 1        pierna  1 x 2 x 1
     cabeza 2 x 1 x 1 con la malla escalada 1,25 -> 2,5 x 1,25 x 1,25

   Alto total = 2 (piernas) + 2 (torso) + 1,25 (cabeza) = 5,25 studs.

   Las articulaciones tambien son las de Roblox: el hombro va en la esquina de
   ARRIBA y AFUERA del torso, no en el centro del costado, y por eso el brazo
   de un R6 cuelga pegado y gira desde el vertice. La cadera va abajo, a media
   distancia del eje.

   Y la animacion es la que trae el juego: el brazo derecho y la pierna
   izquierda van juntos, rigidos, girando en el hombro y en la cadera. Nada
   mas. Un R6 caminando es cuatro cajas girando en fase opuesta. */
import * as THREE from 'three';

/* Todo relativo al centro del TORSO, en studs. */
const T = { an: 2, al: 2, pr: 1 };
const BRAZO = { an: 1, al: 2, pr: 1 };
const PIERNA = { an: 1, al: 2, pr: 1 };
const CABEZA = { an: 2.5, al: 1.25, pr: 1.25 };
const ALTO_STUDS = PIERNA.al + T.al + CABEZA.al;      // 5,25
/* El ojo de un R6 esta en el centro de la cabeza. */
const OJO_STUDS = PIERNA.al + T.al + CABEZA.al / 2;   // 4,625

export class R6 {
    /* `ojo` es a que altura en metros va el ojo del jugador. El cuerpo se
       escala para que la CABEZA quede justo ahi: asi las proporciones son las
       de Roblox exactas y el tamaño es el de este juego. */
    constructor(escena, ojo) {
        this.k = ojo / OJO_STUDS;              // metros por stud
        this.raiz = new THREE.Group();
        this.raiz.scale.setScalar(this.k);
        escena.add(this.raiz);

        // el del video: traje negro, gorra, piel clara
        const traje = new THREE.MeshBasicMaterial({ color: 0x23262e });
        const camisa = new THREE.MeshBasicMaterial({ color: 0x2b3040 });
        const piel = new THREE.MeshBasicMaterial({ color: 0xbe9a72 });

        const caja = (d, mat) => new THREE.Mesh(new THREE.BoxGeometry(d.an, d.al, d.pr), mat);

        /* El torso es el centro de todo: su centro esta a 3 studs del piso
           (2 de pierna + 1 de medio torso). */
        this.tronco = new THREE.Group();
        this.tronco.position.y = PIERNA.al + T.al / 2;
        this.raiz.add(this.tronco);
        this.tronco.add(caja(T, camisa));

        this.cuello = new THREE.Group();
        this.cuello.position.y = T.al / 2;
        this.tronco.add(this.cuello);
        const cab = caja(CABEZA, piel);
        cab.position.y = CABEZA.al / 2;
        this.cuello.add(cab);
        // la gorra del video
        const gorra = new THREE.Mesh(
            new THREE.BoxGeometry(CABEZA.an * 1.02, 0.34, CABEZA.pr * 1.02), traje);
        gorra.position.y = CABEZA.al - 0.10;
        this.cuello.add(gorra);
        const visera = new THREE.Mesh(new THREE.BoxGeometry(CABEZA.an * 0.9, 0.09, 0.55), traje);
        visera.position.set(0, CABEZA.al - 0.24, -(CABEZA.pr / 2 + 0.24));
        this.cuello.add(visera);

        this.brazos = {}; this.piernas = {};
        for (const [l, s] of [['I', -1], ['D', 1]]) {
            /* HOMBRO: esquina de arriba y afuera del torso. Es el detalle que
               hace que un R6 se vea como un R6. */
            const h = new THREE.Group();
            h.position.set(s * (T.an / 2 + BRAZO.an / 2), T.al / 2 - BRAZO.an / 2, 0);
            const b = caja(BRAZO, traje);
            b.position.y = -(BRAZO.al / 2 - BRAZO.an / 2);   // cuelga del vertice
            h.add(b);
            this.tronco.add(h);
            this.brazos[l] = h;

            const c = new THREE.Group();
            c.position.set(s * PIERNA.an / 2, -T.al / 2, 0);
            const p = caja(PIERNA, traje);
            p.position.y = -PIERNA.al / 2;
            c.add(p);
            this.tronco.add(c);
            this.piernas[l] = c;
        }
        this.raiz.traverse(n => { if (n.isMesh) n.castShadow = true });
        this.paso = 0;
    }

    /* est = { x, y, z, yaw, ojo, vel, corriendo, agachado, deslizando, k, dt } */
    actualizar(est) {
        const r = this.raiz;
        /* El ojo de un R6 esta en el centro de la cabeza, y el techo del torso
           le queda 13 cm abajo: pegado, el pecho ocupa un tercio de pantalla.
           Roblox directamente esconde el cuerpo en primera persona por esto.
           Corriendolo 18 cm atras, la cara del torso queda detras del ojo y se
           ve recien cuando mirás para abajo, que es lo que se busca. */
        const atras = 0.18;
        r.position.set(est.x + Math.sin(est.yaw) * atras, est.y,
                       est.z + Math.cos(est.yaw) * atras);
        r.rotation.y = est.yaw;      // acompaña el giro, NO el cabeceo

        // agachado y deslizando el cuerpo se achica hasta donde esta el ojo
        this.k = est.ojo / OJO_STUDS;
        r.scale.setScalar(this.k);

        const desl = est.deslizando, kk = est.k || 0;
        this.paso += est.dt * est.vel * 2.0;
        const amp = Math.min(1, est.vel / 3.0);

        /* La caminata de R6: brazo derecho con pierna izquierda, todo rigido.
           No hay codo ni rodilla que doblar, y meterselos seria mentir. */
        for (const [l, s] of [['I', -1], ['D', 1]]) {
            const fase = s > 0 ? 0 : Math.PI;
            const sw = Math.sin(this.paso + fase);
            const br = this.brazos[l], pi = this.piernas[l];
            if (desl) {
                // tirado: piernas al frente, brazos atras
                pi.rotation.x = 1.15 * (0.4 + 0.6 * kk) + s * 0.10;
                pi.rotation.z = s * 0.12;
                br.rotation.x = -0.75 - 0.25 * kk;
                br.rotation.z = s * 0.30;
            } else if (est.agachado) {
                pi.rotation.x = 0.85 + sw * 0.18 * amp;
                pi.rotation.z = s * 0.06;
                br.rotation.x = -sw * 0.20 * amp - 0.35;
                br.rotation.z = s * 0.10;
            } else {
                // el brazo va en contrafase con la pierna del mismo lado
                br.rotation.x = -sw * (est.corriendo ? 0.85 : 0.55) * amp;
                br.rotation.z = s * 0.05;
                pi.rotation.x = sw * (est.corriendo ? 0.75 : 0.50) * amp;
                pi.rotation.z = 0;
            }
        }
        // el R6 corriendo se inclina un poco hacia adelante
        this.tronco.rotation.x = desl ? -0.55 * kk : (est.corriendo ? -0.13 * amp : -0.03);
    }
}
