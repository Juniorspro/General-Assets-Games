/* El cuerpo del jugador: un R15 de Roblox.
   ---------------------------------------------------------------------------
   R6 son seis partes RIGIDAS y no tiene rodillas ni codos — eso es lo que lo
   hace R6. Lo que se ve en el juego original, y lo que Roblox usa por defecto
   desde hace anos, es **R15**: quince partes, con rodilla, codo, muneca,
   cintura y cuello. Por eso las piernas se doblan al correr.

   Las quince:

     Cabeza
     TorsoAlto · TorsoBajo
     BrazoAlto · BrazoBajo · Mano        (x2)
     PiernaAlta · PiernaBaja · Pie       (x2)

   Medidas del rig por defecto de Roblox, en studs. La documentacion publica
   da RANGOS y no un numero fijo (las proporciones cambian con el tipo de
   cuerpo), asi que estas son las del rig en bloques que arma el Rig Builder:

     TorsoAlto  2 x 1,6 x 1     TorsoBajo  2 x 0,4 x 1
     BrazoAlto  1 x 1,2 x 1     BrazoBajo  1 x 1,2 x 1     Mano  1 x 0,4 x 1
     PiernaAlta 1 x 1,2 x 1     PiernaBaja 1 x 1,2 x 1     Pie   1 x 0,4 x 1
     Cabeza     2 x 1 x 1 con la malla escalada 1,25

   Alto = piernas 2,8 + torso 2,0 + cabeza 1,0 = 5,8 studs, que es por que un
   R15 es mas alto que un R6 (5). */
import * as THREE from 'three';
import { CLIPS } from './animdata.js';

const D = {
    torsoAlto: [2, 1.6, 1], torsoBajo: [2, 0.4, 1],
    brazoAlto: [1, 1.2, 1], brazoBajo: [1, 1.2, 1], mano: [1, 0.4, 1],
    piernaAlta: [1, 1.2, 1], piernaBaja: [1, 1.2, 1], pie: [1, 0.4, 1],
    cabeza: [2.5, 1.25, 1.25],
};
const PIERNA = D.piernaAlta[1] + D.piernaBaja[1] + D.pie[1];     // 2,8
const TORSO = D.torsoBajo[1] + D.torsoAlto[1];                   // 2,0
const ALTO = PIERNA + TORSO + D.cabeza[1];                       // 6,05
const OJO = PIERNA + TORSO + D.cabeza[1] / 2;                    // 5,425

export class R15 {
    /* `ojo` es a que altura en metros va el ojo. El cuerpo se escala para que
       la cabeza caiga justo ahi: proporciones de Roblox, tamano de este juego. */
    constructor(escena, ojo) {
        this.raiz = new THREE.Group();
        this.raiz.scale.setScalar(ojo / OJO);
        escena.add(this.raiz);

        /* Cada parte con SU color, como en la referencia: camisa gris, jean
           azul, piel en brazos y manos, zapatillas rojas. Todo del mismo tono
           —que es como estaba— convierte el cuerpo en una mancha: al correr no
           se distingue una pierna del torso y parece que no se mueve nada. */
        const camisa = new THREE.MeshBasicMaterial({ color: 0x3c4150 });
        const jean = new THREE.MeshBasicMaterial({ color: 0x3f5c86 });
        const piel = new THREE.MeshBasicMaterial({ color: 0xc79a72 });
        const zapato = new THREE.MeshBasicMaterial({ color: 0xa8442a });
        const suela = new THREE.MeshBasicMaterial({ color: 0xe6e0d4 });
        const tinta = new THREE.MeshBasicMaterial({ color: 0x0a0a0c, side: THREE.BackSide });

        /* Una pieza se cuelga de su articulacion: la geometria se corre hacia
           abajo media pieza para que el giro salga del hueso y no del medio.
           Y lleva CONTORNO: una copia apenas mas grande dibujada por dentro,
           que es el truco viejo de la tinta. En la referencia cada parte tiene
           su linea negra alrededor, y es lo que hace que se lean como piezas
           separadas en vez de como un bulto. */
        const CONT = 0.06;
        const pieza = (d, mat, grupo) => {
            const g = new THREE.BoxGeometry(d[0], d[1], d[2]);
            g.translate(0, -d[1] / 2, 0);
            const m = new THREE.Mesh(g, mat);
            m.castShadow = true;
            grupo.add(m);
            const go = new THREE.BoxGeometry(d[0] + CONT, d[1] + CONT, d[2] + CONT);
            go.translate(0, -d[1] / 2, 0);
            grupo.add(new THREE.Mesh(go, tinta));
            return m;
        };

        /* CINTURA. Es la articulacion que R6 no tiene y que hace que un R15
           se incline con el torso en vez de con el cuerpo entero. */
        this.cadera = new THREE.Group();
        this.cadera.position.y = PIERNA;
        this.raiz.add(this.cadera);
        pieza(D.torsoBajo, jean, this.cadera);

        this.cintura = new THREE.Group();
        this.cintura.position.y = -D.torsoBajo[1];
        // el torso alto crece hacia ARRIBA desde la cintura
        const ta = new THREE.Mesh(new THREE.BoxGeometry(...D.torsoAlto), camisa);
        ta.position.y = D.torsoAlto[1] / 2 + D.torsoBajo[1];
        ta.castShadow = true;
        this.cintura.add(ta);
        const tao = new THREE.Mesh(new THREE.BoxGeometry(
            D.torsoAlto[0] + CONT, D.torsoAlto[1] + CONT, D.torsoAlto[2] + CONT), tinta);
        tao.position.copy(ta.position);
        this.cintura.add(tao);
        this.cadera.add(this.cintura);
        this.torsoAlto = ta;

        this.cuello = new THREE.Group();
        this.cuello.position.y = D.torsoBajo[1] + D.torsoAlto[1];
        this.cintura.add(this.cuello);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(...D.cabeza), piel);
        cab.position.y = D.cabeza[1] / 2;
        this.cuello.add(cab);
        /* La cabeza NO se dibuja: el ojo esta adentro. */
        cab.visible = false;
        this.cabeza = cab;

        this.hombro = {}; this.codo = {}; this.muneca = {};
        this.pierna = {}; this.rodilla = {}; this.tobillo = {};
        for (const [l, s] of [['I', -1], ['D', 1]]) {
            /* HOMBRO, arriba y afuera del torso alto. */
            const h = new THREE.Group();
            h.position.set(s * (D.torsoAlto[0] / 2 + D.brazoAlto[0] / 2),
                           D.torsoBajo[1] + D.torsoAlto[1], 0);
            pieza(D.brazoAlto, camisa, h);
            this.cintura.add(h);
            this.hombro[l] = h;

            const c = new THREE.Group();          // CODO
            c.position.y = -D.brazoAlto[1];
            pieza(D.brazoBajo, piel, c);
            h.add(c);
            this.codo[l] = c;

            const mu = new THREE.Group();         // MUNECA
            mu.position.y = -D.brazoBajo[1];
            pieza(D.mano, piel, mu);
            c.add(mu);
            this.muneca[l] = mu;

            /* CADERA de la pierna, abajo del torso bajo. */
            const p = new THREE.Group();
            p.position.set(s * D.piernaAlta[0] / 2, 0, 0);
            pieza(D.piernaAlta, jean, p);
            this.cadera.add(p);
            this.pierna[l] = p;

            const r = new THREE.Group();          // RODILLA
            r.position.y = -D.piernaAlta[1];
            pieza(D.piernaBaja, jean, r);
            p.add(r);
            this.rodilla[l] = r;

            const t = new THREE.Group();          // TOBILLO
            t.position.y = -D.piernaBaja[1];
            const pi = pieza(D.pie, zapato, t);
            // el pie asoma para adelante, como el de Roblox
            pi.geometry.translate(0, 0, -0.22);
            t.children[t.children.length - 1].geometry.translate(0, 0, -0.22);
            // la suela clara, que es lo que marca donde pisa
            const sl = new THREE.Mesh(
                new THREE.BoxGeometry(D.pie[0] * 1.02, 0.12, D.pie[2] * 1.02 + 0.4), suela);
            sl.position.set(0, -D.pie[1] + 0.06, -0.22);
            t.add(sl);
            r.add(t);
            this.tobillo[l] = t;
        }
        this.paso = 0; this.tIdle = 0; this.mirando = 0;
    }

    /* Muestrea un clip real de Roblox en una fase de 0 a 1.
       Interpola lineal entre cuadros y cierra el ciclo con el primero, que es
       lo que hace que la zancada no pegue un salto al repetir. */
    clip(nombre, fase, cerrado = true) {
        const c = CLIPS[nombre];
        if (!c) return null;
        const n = c.n;
        const f = ((fase % 1) + 1) % 1 * n;
        const a = Math.floor(f) % n;
        const b = cerrado ? (a + 1) % n : Math.min(a + 1, n - 1);
        const t = f - Math.floor(f);
        const o = {};
        for (const k in c.k) {
            const v = c.k[k];
            o[k] = v[a] + (v[b] - v[a]) * t;
        }
        return o;
    }

    /* Los estados.
       ---------------------------------------------------------------------
       Los de locomocion salen del clip de Roblox tal cual. Los tres que
       Roblox no tiene —agacharse, deslizarse y empujar el cubo— son propios,
       y estan escritos con la misma escala de angulos para que peguen. */
    pose(est) {
        const v = est.vel;
        const cero = {
            pI: 0, rI: 0, tI: 0, pD: 0, rD: 0, tD: 0,
            hI: 0, cI: 0, mI: 0, hD: 0, cD: 0, mD: 0,
            ca: 0, to: 0, cz: 0, abZ: 0.06, piZ: 0, alto: 0,
        };

        if (est.deslizando) {
            const k = est.k || 0;
            return { ...cero,
                pI: 1.30 * (0.4 + 0.6 * k), pD: 1.30 * (0.4 + 0.6 * k),
                rI: -0.55, rD: -0.55, tI: -0.35, tD: -0.35,
                hI: -1.00 - 0.30 * k, hD: -1.00 - 0.30 * k, cI: 1.10, cD: 1.10,
                abZ: 0.34, piZ: 0.12, ca: -0.60 * k, cz: 0.35 };
        }
        if (est.agachado) {
            const sw = Math.sin(this.fase * Math.PI * 2) * 0.22 * Math.min(1, v / 2);
            return { ...cero,
                pI: 1.15 + sw, pD: 1.15 - sw, rI: -1.95 - sw, rD: -1.95 + sw,
                tI: 0.65, tD: 0.65, piZ: 0.08,
                hI: -0.45 - sw, hD: -0.45 + sw, cI: 1.05, cD: 1.05,
                abZ: 0.16, to: 0.30, cz: 0.25, alto: -0.55 };
        }
        if (est.empujando) {
            const sw = Math.sin(this.fase * Math.PI * 2) * 0.42 * Math.min(1, v / 2.5);
            return { ...cero,
                pI: sw, pD: -sw,
                rI: -Math.max(0, sw) * 0.75, rD: -Math.max(0, -sw) * 0.75,
                hI: -1.25, hD: -1.25, cI: 0.55, cD: 0.55,
                abZ: 0.18, to: -0.18 };
        }
        if (est.cayendo) return { ...cero, ...this.clip('caer', this.fase, false), abZ: 0.55 };
        if (v < 0.12) return { ...cero, ...this.clip('quieto', this.tIdle / CLIPS.quieto.dur) };

        /* CAMINAR o CORRER, del clip real. La mezcla entre los dos va por
           velocidad: a 3 m/s ya es carrera entera. */
        const cam = this.clip('caminar', this.fase);
        const cor = this.clip('correr', this.fase);
        const m = Math.max(0, Math.min(1, (v - 1.6) / 1.6));
        const o = { ...cero };
        for (const k in cam) o[k] = cam[k] + (cor[k] - cam[k]) * m;
        /* Los BRAZOS van amortiguados y las piernas no.
           El clip real levanta el antebrazo hasta 1,90 rad, o sea la mano a la
           altura del pecho: visto desde una camara puesta en la cabeza, eso
           tapa media pantalla. Roblox lo resuelve escondiendo el personaje
           entero en primera persona; aca se bajan el hombro y sobre todo el
           codo, y las piernas —que son las que se quieren ver— quedan clavadas
           al clip. */
        o.hI *= 0.72; o.hD *= 0.72;
        o.cI *= 0.40; o.cD *= 0.40;
        o.mI *= 0.40; o.mD *= 0.40;
        o.abZ = 0.06 + m * 0.06;
        // el rebote de la zancada: dos por ciclo
        o.alto = Math.abs(Math.sin(this.fase * Math.PI * 2)) * (0.09 + m * 0.11);
        return o;
    }

    actualizar(est) {
        const r = this.raiz;
        /* 18 cm detras del ojo: pegado, el torso ocupa un tercio de pantalla.
           Roblox esconde el personaje entero en primera persona por esto. */
        const atras = 0.18;
        r.position.set(est.x + Math.sin(est.yaw) * atras, est.y,
                       est.z + Math.cos(est.yaw) * atras);
        r.rotation.y = est.yaw;      // acompaña el giro, NO el cabeceo
        r.scale.setScalar(est.ojo / OJO);

        /* La fase avanza con la velocidad para que el pie no patine: el ciclo
           real de correr dura 0,667 s y cubre unos 4,4 m, o sea 6,6 m/s de
           referencia. A otra velocidad, el ciclo se estira proporcional. */
        const largoCiclo = 4.4;
        this.fase = (this.fase || 0) + est.dt * Math.max(est.vel, 0.001) / largoCiclo;
        this.tIdle += est.dt;
        if (this.mirando > 0) this.mirando = Math.max(0, this.mirando - est.dt * 0.55);
        else if (est.vel < 0.12) {
            this.proxMirada = (this.proxMirada ?? 9) - est.dt;
            if (this.proxMirada <= 0) { this.mirando = 1; this.proxMirada = 9 + Math.random() * 6 }
        } else this.proxMirada = 9 + Math.random() * 6;

        const o = this.pose(est);
        const m = Math.min(1, est.dt * 15);
        const mez = (a, b) => a + (b - a) * m;
        for (const [l, s] of [['I', -1], ['D', 1]]) {
            const H = this.hombro[l], C = this.codo[l], M = this.muneca[l];
            const P = this.pierna[l], R = this.rodilla[l], T = this.tobillo[l];
            H.rotation.x = mez(H.rotation.x, o['h' + l]);
            H.rotation.z = mez(H.rotation.z, s * o.abZ);
            C.rotation.x = mez(C.rotation.x, o['c' + l]);
            M.rotation.x = mez(M.rotation.x, o['m' + l] || 0);
            P.rotation.x = mez(P.rotation.x, o['p' + l]);
            P.rotation.z = mez(P.rotation.z, s * o.piZ);
            R.rotation.x = mez(R.rotation.x, o['r' + l]);
            T.rotation.x = mez(T.rotation.x, o['t' + l]);
        }
        /* En R15 el LowerTorso es la raiz y el UpperTorso gira en la cintura,
           que es exactamente como esta armado este rig: los tres canales del
           clip entran derecho. */
        this.cadera.rotation.x = mez(this.cadera.rotation.x, o.ca);
        this.cintura.rotation.x = mez(this.cintura.rotation.x, o.to);
        this.cuello.rotation.x = mez(this.cuello.rotation.x, o.cz);
        this.cadera.position.y = mez(this.cadera.position.y, PIERNA + o.alto);
    }
}
