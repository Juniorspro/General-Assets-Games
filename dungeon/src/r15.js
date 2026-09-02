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

    /* Los angulos de cada estado. Un paquete de animacion de Roblox trae
       siete —Run, Walk, Fall, Jump, Idle, Swim, Climb— y el script Animate
       agrega dos idles, sentarse y las poses de herramienta. Estos son los
       que el juego usa, mas los propios. */
    pose(est) {
        const v = est.vel, amp = Math.min(1, v / 3.2);
        const p = this.paso;
        const o = {
            // hombro, codo, cadera, rodilla, tobillo, por lado
            hI: 0, hD: 0, cI: 0, cD: 0, pI: 0, pD: 0, rI: 0, rD: 0, tI: 0, tD: 0,
            abZ: 0.06, piZ: 0, cintura: -0.03, alto: 0,
        };
        if (est.deslizando) {
            const k = est.k || 0;
            o.pI = o.pD = 1.30 * (0.4 + 0.6 * k);
            o.rI = o.rD = -0.55; o.tI = o.tD = -0.35;
            o.hI = o.hD = -1.00 - 0.30 * k; o.cI = o.cD = -1.10;
            o.abZ = 0.34; o.piZ = 0.12; o.cintura = -0.60 * k;
            return o;
        }
        if (est.cayendo) {
            o.hI = o.hD = -2.40; o.cI = o.cD = -0.55; o.abZ = 0.60;
            o.pI = 0.45; o.pD = -0.15; o.rI = -0.80; o.rD = -0.25;
            o.cintura = 0.12;
            return o;
        }
        if (est.empujando) {
            o.hI = o.hD = -1.25; o.cI = o.cD = -0.35; o.abZ = 0.18;
            const sw = Math.sin(p);
            o.pI = sw * 0.40 * amp; o.pD = -o.pI;
            o.rI = -Math.max(0, sw) * 0.55 * amp; o.rD = -Math.max(0, -sw) * 0.55 * amp;
            o.cintura = -0.18;
            return o;
        }
        if (est.agachado) {
            /* Agachado de verdad: la rodilla se dobla mucho, que es justo lo
               que R6 no podia hacer. */
            const sw = Math.sin(p) * 0.20 * amp;
            o.pI = 1.05 + sw; o.pD = 1.05 - sw;
            o.rI = -1.75 - sw; o.rD = -1.75 + sw;
            o.tI = o.tD = 0.60; o.piZ = 0.08;
            o.hI = -0.45 - sw; o.hD = -0.45 + sw;
            o.cI = o.cD = -0.85; o.abZ = 0.16; o.cintura = 0.30;
            o.alto = -0.55;
            return o;
        }
        if (v < 0.12) {
            const r = Math.sin(this.tIdle * 1.6) * 0.035;
            o.hI = r; o.hD = -r; o.cI = o.cD = -0.14; o.abZ = 0.08;
            o.cintura = -0.02 + Math.sin(this.tIdle * 1.6) * 0.015;
            if (this.mirando > 0) {
                const m = Math.sin((1 - this.mirando) * Math.PI);
                o.hD = -0.60 * m; o.cD = -0.95 * m; o.abZ = 0.08 + 0.22 * m;
            }
            return o;
        }

        /* CAMINAR y CORRER. Acá está la diferencia con R6: la pierna que va
           adelante levanta la RODILLA, y el codo va doblado. Corriendo, la
           rodilla llega a 1,25 rad —unos 70°— que es lo que se ve en la
           referencia; caminando apenas se dobla. */
        const corr = est.corriendo;
        const A = corr ? 1.05 : 0.62;       // amplitud de cadera
        const B = corr ? 0.95 : 0.55;       // amplitud de hombro
        const K = corr ? 1.35 : 0.55;       // cuanto se dobla la rodilla
        const E = corr ? 1.15 : 0.42;       // cuanto se dobla el codo
        const sw = Math.sin(p), sw2 = Math.sin(p + Math.PI);

        o.pI = sw * A * amp;
        o.pD = sw2 * A * amp;
        /* LA RODILLA. En la referencia se ve claro: la pierna de ATRAS lleva
           la rodilla doblada casi 90° recogiendo el pie, y la de ADELANTE va
           casi estirada para apoyar. O sea que la flexion NO es simetrica con
           la cadera — tiene su maximo con la pierna atras, y un adelanto de
           medio radian para que ya venga recogiendo cuando pasa por abajo. */
        const flex = f => Math.max(0, -Math.sin(f + 0.55));
        o.rI = -(0.10 + flex(p) * K) * amp;
        o.rD = -(0.10 + flex(p + Math.PI) * K) * amp;
        // el pie acompana a la pantorrilla: la punta cae al recoger
        o.tI = -o.rI * 0.45; o.tD = -o.rD * 0.45;

        o.hI = -sw * B * amp; o.hD = -sw2 * B * amp;
        o.cI = -E - Math.max(0, sw) * 0.35 * amp;
        o.cD = -E - Math.max(0, sw2) * 0.35 * amp;
        o.abZ = corr ? 0.12 : 0.07;
        o.cintura = corr ? -0.26 * amp : -0.05;
        // el rebote: sube dos veces por ciclo, una por zancada
        o.alto = Math.abs(Math.sin(p)) * (corr ? 0.20 : 0.09) * amp;
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

        this.paso += est.dt * est.vel * 2.3;
        this.tIdle += est.dt;
        if (this.mirando > 0) this.mirando = Math.max(0, this.mirando - est.dt * 0.55);
        else if (est.vel < 0.12) {
            this.proxMirada = (this.proxMirada ?? 9) - est.dt;
            if (this.proxMirada <= 0) { this.mirando = 1; this.proxMirada = 9 + Math.random() * 6 }
        } else this.proxMirada = 9 + Math.random() * 6;

        const o = this.pose(est);
        const m = Math.min(1, est.dt * 15);
        const mez = (a, b) => a + (b - a) * m;
        for (const [l, s, hK, cK, pK, rK, tK] of
             [['I', -1, 'hI', 'cI', 'pI', 'rI', 'tI'], ['D', 1, 'hD', 'cD', 'pD', 'rD', 'tD']]) {
            const H = this.hombro[l], C = this.codo[l];
            const P = this.pierna[l], R = this.rodilla[l], T = this.tobillo[l];
            H.rotation.x = mez(H.rotation.x, o[hK]);
            H.rotation.z = mez(H.rotation.z, s * o.abZ);
            C.rotation.x = mez(C.rotation.x, o[cK]);
            P.rotation.x = mez(P.rotation.x, o[pK]);
            P.rotation.z = mez(P.rotation.z, s * o.piZ);
            R.rotation.x = mez(R.rotation.x, o[rK]);
            T.rotation.x = mez(T.rotation.x, o[tK]);
        }
        this.cintura.rotation.x = mez(this.cintura.rotation.x, o.cintura);
        this.cadera.position.y = mez(this.cadera.position.y, PIERNA + o.alto);
    }
}
