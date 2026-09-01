/* El cuerpo del jugador, visible en primera persona.
   ---------------------------------------------------------------------------
   No es un modelo de vista pegado al ojo: es un cuerpo a escala real puesto en
   la escena, con los pies en el piso y los hombros a la altura del ojo. Por eso
   al mirar para abajo se ve el pecho, los brazos y las piernas donde tienen que
   estar, y no una pierna flotando.

   Dos cosas lo hacen funcionar:

   - **Sigue el giro pero NO el cabeceo.** La cabeza mira para abajo; el cuerpo
     se queda derecho. Si el cuerpo acompanara el cabeceo, mirar al piso te
     acostaria el torso y verias la nuca de tu propio personaje.
   - **Va unos centimetros atras del ojo.** Con el torso justo en el ojo, el
     pecho tapa la pantalla entera: el plano cercano esta a 2 cm.

   La cabeza no se dibuja, porque estamos adentro. */
import * as THREE from 'three';

const PIE_CADERA = 0.55, MUSLO = 0.30, PANT = 0.25;
/* El hombro va 16 cm por DEBAJO del ojo, como en una persona. Con el
   hombro a la altura del ojo, mirar para abajo mostraba una pared gris de
   torso pegada al menton y nada mas. */
const HOMBRO = 0.84, BRAZO = 0.26, ANTE = 0.24;
/* Apenas atras del ojo. Con 20 cm el cuerpo entero quedaba DETRAS del plano
   de la camara y mirar para abajo no mostraba nada. El pecho tapa la vista
   solo si se mira casi a los pies, y eso es lo que uno espera. */
const ATRAS = 0.02;              // cuanto se corre el cuerpo detras del ojo

export class Cuerpo {
    constructor(escena) {
        this.raiz = new THREE.Group();
        escena.add(this.raiz);

        /* Material PLANO. El cuerpo pasa a medio metro de las aranas del techo
           y de tu propio farol, asi que con un material que responde a la luz
           los hombros salen blancos —medido— y el cuerpo se lee como una
           mancha. Un color fijo nunca se quema, y en un pasillo oscuro un
           cuerpo parejo y oscuro es exactamente lo que uno espera ver. */
        const tela = new THREE.MeshBasicMaterial({ color: 0x2b3142 });
        const campera = new THREE.MeshBasicMaterial({ color: 0x373f54 });
        const piel = new THREE.MeshBasicMaterial({ color: 0x8d6f52 });
        const bota = new THREE.MeshBasicMaterial({ color: 0x171310 });

        const hueso = (largo, r1, r2) => {
            const g = new THREE.CylinderGeometry(r2, r1, largo, 8);
            g.translate(0, -largo / 2, 0);
            return g;
        };

        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.098, .22, 5, 12), campera);
        torso.position.y = (PIE_CADERA + HOMBRO) / 2 + .02;
        torso.scale.set(1, 1, .70);
        this.raiz.add(torso);
        const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(.095, .10, 4, 10), tela);
        pelvis.position.y = PIE_CADERA + .04;
        pelvis.scale.set(1, 1, .75);
        this.raiz.add(pelvis);

        this.piernas = []; this.brazos = [];
        for (const s of [-1, 1]) {
            const cad = new THREE.Group();
            cad.position.set(s * .085, PIE_CADERA, 0);
            cad.add(new THREE.Mesh(hueso(MUSLO, .072, .058), tela));
            const rod = new THREE.Group(); rod.position.y = -MUSLO;
            rod.add(new THREE.Mesh(hueso(PANT, .058, .042), tela));
            const pie = new THREE.Mesh(new THREE.BoxGeometry(.085, .055, .175), bota);
            pie.position.set(0, -PANT - .022, -.038);
            rod.add(pie);
            cad.add(rod); this.raiz.add(cad);
            this.piernas.push({ cad, rod, lado: s });

            const hom = new THREE.Group();
            hom.position.set(s * .155, HOMBRO, 0);
            hom.add(new THREE.Mesh(hueso(BRAZO, .052, .043), campera));
            const cod = new THREE.Group(); cod.position.y = -BRAZO;
            cod.add(new THREE.Mesh(hueso(ANTE, .043, .034), campera));
            const mano = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), piel);
            mano.scale.set(.8, 1.05, .65);
            mano.position.y = -ANTE - .03;
            cod.add(mano);
            hom.add(cod); this.raiz.add(hom);
            this.brazos.push({ hom, cod, lado: s });
        }
        this.raiz.traverse(n => { if (n.isMesh) n.castShadow = true });
    }

    /* est = { x, y, z, yaw, ojo, vel, corriendo, agachado, deslizando, k, t, dt } */
    actualizar(est) {
        const r = this.raiz;
        /* Detras del ojo, en la direccion en que se mira. El adelante de la
           camara con este giro es (-sin, -cos), asi que atras es (+sin, +cos). */
        r.position.set(est.x + Math.sin(est.yaw) * ATRAS, est.y,
                       est.z + Math.cos(est.yaw) * ATRAS);
        r.rotation.y = est.yaw;          // sigue el giro, NO el cabeceo

        /* El cuerpo se encoge hasta que el hombro queda donde esta el ojo. Asi
           agachado y deslizando el torso baja de verdad en vez de atravesar la
           cabeza. */
        const enc = Math.max(.30, est.ojo / 1.0);   // el ojo de pie es 1,00 m
        r.scale.setScalar(enc);

        const desl = est.deslizando, k = est.k || 0;
        const paso = (this.paso = (this.paso || 0) + est.dt * est.vel * 2.1);
        const amp = Math.min(1, est.vel / 3.2);

        for (const p of this.piernas) {
            const f = Math.sin(paso + (p.lado > 0 ? Math.PI : 0));
            if (desl) {
                // tirado: las dos piernas al frente, una mas estirada
                p.cad.rotation.x = 1.15 * (0.4 + 0.6 * k) + p.lado * .13;
                p.rod.rotation.x = -(0.55 + 0.25 * (1 - k));
                p.cad.rotation.z = p.lado * .16;
            } else {
                p.cad.rotation.x = f * .62 * amp + (est.agachado ? .55 : 0);
                p.rod.rotation.x = -Math.max(0, f + .25) * .8 * amp - (est.agachado ? 1.0 : 0);
                p.cad.rotation.z = p.lado * .04;
            }
        }
        for (const b of this.brazos) {
            const f = Math.sin(paso + (b.lado > 0 ? 0 : Math.PI));
            if (desl) {
                b.hom.rotation.x = -.70 - .3 * k;      // los brazos van atras
                b.hom.rotation.z = b.lado * .34;
                b.cod.rotation.x = -.9;
            } else {
                b.hom.rotation.x = f * .48 * amp - (est.corriendo ? .30 : .06);
                b.hom.rotation.z = b.lado * (.13 + (est.corriendo ? .05 : 0));
                b.cod.rotation.x = -(est.corriendo ? 1.05 : .25) - Math.abs(f) * .3 * amp;
            }
        }
    }
}
