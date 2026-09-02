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
        /* LA CABEZA NO SE DIBUJA. El ojo esta adentro de ella, asi que al
           caminar se le ve la nuca por dentro y al mirar para abajo tapa medio
           cuadro. Roblox esconde el personaje entero en primera persona por
           esto mismo; aca se esconde solo la cabeza y el cuerpo queda. */
        this.cabeza = cab;
        // la gorra del video
        const gorra = new THREE.Mesh(
            new THREE.BoxGeometry(CABEZA.an * 1.02, 0.34, CABEZA.pr * 1.02), traje);
        gorra.position.y = CABEZA.al - 0.10;
        this.cuello.add(gorra);
        const visera = new THREE.Mesh(new THREE.BoxGeometry(CABEZA.an * 0.9, 0.09, 0.55), traje);
        visera.position.set(0, CABEZA.al - 0.24, -(CABEZA.pr / 2 + 0.24));
        this.cuello.add(visera);
        for (const n of [cab, gorra, visera]) n.visible = false;

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

    /* Los estados.
       ---------------------------------------------------------------------
       Un paquete de animacion de Roblox trae SIETE: Run, Walk, Fall, Jump,
       Idle, Swim, Climb. El script `Animate` agrega encima dos idles —uno
       quieto y otro de "mirar alrededor" que salta cada tanto—, sentarse y
       las poses de herramienta. Aca estan los que este juego usa de verdad,
       mas los propios: agachado, deslizarse y empujar el cubo.

       Cada estado devuelve angulos de hombro y cadera. Nada mas: un R6 no
       tiene otra cosa que girar. */
    pose(est) {
        const v = est.vel, amp = Math.min(1, v / 3.0);
        const p = this.paso;
        const o = { brI: 0, brD: 0, piI: 0, piD: 0, brZ: 0.05, piZ: 0, tronco: -0.03, alto: 0 };

        if (est.deslizando) {
            const k = est.k || 0;
            o.piI = o.piD = 1.15 * (0.4 + 0.6 * k);
            o.piZ = 0.12; o.brI = o.brD = -0.75 - 0.25 * k;
            o.brZ = 0.30; o.tronco = -0.55 * k;
            return o;
        }
        if (est.cayendo) {
            // FALL: los brazos se abren para arriba, las piernas sueltas
            o.brI = o.brD = -2.35; o.brZ = 0.55;
            o.piI = 0.30; o.piD = -0.20; o.tronco = 0.10;
            return o;
        }
        if (est.empujando) {
            // los dos brazos al frente, a la altura del cubo
            o.brI = o.brD = -1.15; o.brZ = 0.16;
            o.piI = Math.sin(p) * 0.34 * amp; o.piD = -o.piI;
            o.tronco = -0.16;
            return o;
        }
        if (est.agachado) {
            o.piI = 0.85 + Math.sin(p) * 0.18 * amp;
            o.piD = 0.85 - Math.sin(p) * 0.18 * amp;
            o.piZ = 0.06;
            o.brI = -0.35 - Math.sin(p) * 0.20 * amp;
            o.brD = -0.35 + Math.sin(p) * 0.20 * amp;
            o.brZ = 0.12; o.tronco = 0.22;
            return o;
        }
        if (v < 0.12) {
            /* IDLE. El de Roblox no esta quieto: respira. Y cada tanto entra
               el segundo idle, el de mirar alrededor — es lo que hace que un
               personaje parado no parezca una estatua. */
            const r = Math.sin(this.tIdle * 1.6) * 0.035;
            o.brI = r; o.brD = -r; o.brZ = 0.07;
            o.tronco = -0.02 + Math.sin(this.tIdle * 1.6) * 0.015;
            if (this.mirando > 0) {
                const m = Math.sin((1 - this.mirando) * Math.PI);
                o.brD = -0.55 * m; o.brZ = 0.07 + 0.20 * m;
                o.tronco -= 0.05 * m;
            }
            return o;
        }
        // WALK y RUN: lo mismo con distinta amplitud, que es como es en R6
        const A = est.corriendo ? 0.85 : 0.55, B = est.corriendo ? 0.75 : 0.50;
        const sw = Math.sin(p);
        o.brI = -sw * A * amp; o.brD = sw * A * amp;
        o.piI = sw * B * amp; o.piD = -sw * B * amp;
        o.brZ = est.corriendo ? 0.10 : 0.05;
        o.tronco = est.corriendo ? -0.13 * amp : -0.03;
        // el rebote del paso: en R6 el cuerpo sube y baja con la zancada
        o.alto = Math.abs(Math.sin(p)) * (est.corriendo ? 0.10 : 0.06) * amp;
        return o;
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

        this.paso += est.dt * est.vel * 2.0;
        this.tIdle = (this.tIdle || 0) + est.dt;
        /* El segundo idle: cada 9-15 s el personaje mira alrededor. Es lo que
           distingue un idle de Roblox de un muñeco congelado. */
        if (this.mirando > 0) this.mirando = Math.max(0, this.mirando - est.dt * 0.55);
        else if (est.vel < 0.12) {
            this.proxMirada = (this.proxMirada ?? 9) - est.dt;
            if (this.proxMirada <= 0) { this.mirando = 1; this.proxMirada = 9 + Math.random() * 6 }
        } else this.proxMirada = 9 + Math.random() * 6;

        const o = this.pose(est);
        // suavizado: los estados se mezclan en vez de saltar de uno a otro
        const m = Math.min(1, est.dt * 13);
        const mez = (a, b) => a + (b - a) * m;
        const B = this.brazos, P = this.piernas;
        B.I.rotation.x = mez(B.I.rotation.x, o.brI);
        B.D.rotation.x = mez(B.D.rotation.x, o.brD);
        B.I.rotation.z = mez(B.I.rotation.z, -o.brZ);
        B.D.rotation.z = mez(B.D.rotation.z, o.brZ);
        P.I.rotation.x = mez(P.I.rotation.x, o.piI);
        P.D.rotation.x = mez(P.D.rotation.x, o.piD);
        P.I.rotation.z = mez(P.I.rotation.z, -o.piZ);
        P.D.rotation.z = mez(P.D.rotation.z, o.piZ);
        this.tronco.rotation.x = mez(this.tronco.rotation.x, o.tronco);
        this.tronco.position.y = mez(this.tronco.position.y,
            PIERNA.al + T.al / 2 + o.alto);
    }
}
