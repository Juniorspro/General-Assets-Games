/* La casa de la langosta.
   ---------------------------------------------------------------------------
   El bucle del juego de Roblox (NULLWORKS, personaje de DoctorNowhere), que es
   una cadena fija de cuatro pasos:

     1. llevar los tres cubos —rojo, amarillo, azul— a la baldosa de su color,
        DE A UNO: no se pueden cargar dos
     2. con los tres puestos baja una soga del techo: ahi esta la pinza
     3. la llave esta en UN mueble de los que se pueden revisar, al azar
     4. la puerta verde pide primero la pinza y despues la llave

   Y la regla que le da el nombre a todo: el cartel de la pared dice que hay
   que mantener un perfil bajo o el vendra. Aca eso es literal — correr hace
   ruido y el ruido lo trae. Agachado no hace ruido, y por los huecos de 62 cm
   no entra: son la salida de verdad cuando ya te vio. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { construirBicho } from './bicho.js';
import * as S from './sonido.js';
import {
    CELL, WALL_H, W, H, LEVELS, Rng, toWorld, toCell, isOpen, isStairCell, isHole, surfaceAt,
} from './map.js';

const COLORES = [
    { id: 'rojo', hex: 0xd8352b, nombre: 'rojo' },
    { id: 'amarillo', hex: 0xe8c22e, nombre: 'amarillo' },
    { id: 'azul', hex: 0x2f7fd8, nombre: 'azul' },
];
const ALCANCE = 1.5;          // hasta donde llega la mano
const NIVEL = 0;              // todo el bucle pasa en la planta baja

/* ------------------------------------------------------------------ el bicho */
/* Mide 2,6 m. Con el ojo a 55 cm eso es casi cinco veces nuestra altura: por
   eso da miedo sin necesidad de una cara. Va articulado y no como una malla
   sola deslizandose, porque una figura que se traslada sin mover las piernas
   se lee como un cartel, no como algo que camina. */
const ALTO_BICHO = 3.2;

class Langosta {
    constructor(escena, base, assets) {
        this.base = base;
        this.raiz = new THREE.Group();
        /* La malla de Tripo mira a +X, como todo lo que devuelve. El resto del
           codigo trata al bicho como si mirara a -Z, igual que la camara, asi
           que se gira UNA vez adentro de este grupo y nadie mas se entera.
           Girando +90°, el +X de la malla va a parar a -Z. */
        this.giroModelo = new THREE.Group();
        this.giroModelo.rotation.y = Math.PI / 2;
        this.raiz.add(this.giroModelo);

        this.listo = false;
        const url = assets && assets.bicho;
        if (url) {
            new GLTFLoader().loadAsync(url).then(g => {
                /* Se parte en varillas rigidas y se le cuelgan las cuencas.
                   Ver bicho.js: el rig de Rezona aplasta la malla. */
                const rig = construirBicho(g.scene, ALTO_BICHO);
                if (!rig) return;
                const o = rig.cont;
                this.art = rig.grupos;
                o.traverse(n => {
                    if (!n.isMesh) return;
                    n.castShadow = true;
                    if (n.material && n.material.isMeshBasicMaterial) return;  // las cuencas
                    /* SE TIENE QUE VER. El tinte gris de antes lo dejaba en
                       110 de brillo contra una pared de 127 —medido—: un 13%
                       de contraste, o sea invisible. Te mataba algo que no
                       llegabas a ver, y eso no es miedo, es un bug.

                       El tinte ahora es claro, y sobre todo la malla lleva
                       EMISIVO: un piso de brillo propio que no depende de
                       ninguna luz. Es lo que hace que se lea igual contra una
                       pared clara que en un pasillo negro — y un bicho al que
                       tenés que ver venir necesita exactamente eso. */
                    const m = n.material;
                    if (m && m.color) { m.color.setHex(0xb4b0a6); m.roughness = 1; }
                    if (m && m.emissive) {
                        m.emissive.setHex(0x8d8474);
                        m.emissiveIntensity = 1;
                    }
                    n.frustumCulled = false;
                });
                this.giroModelo.add(o);
                this.modelo = o;
                this.listo = true;
                /* Si el rig vino con animaciones, se usan; si no, el cuerpo se
                   mece a mano. Un bicho de zancos que se traslada sin moverse
                   se lee como un cartel, no como algo que camina. */
            }).catch(() => { });
        }

        /* Un halo tenue: en un pasillo negro, sin esto aparece encima tuyo sin
           aviso y eso no asusta, enoja. Va BAJO, a la altura del pecho. */
        this.luz = new THREE.PointLight(0x9fb6cc, 3.4, 11, 1.8);
        this.luz.position.y = ALTO_BICHO * 0.5;
        this.raiz.add(this.luz);

        /* Y una luz que le pega a la cara DESDE ABAJO. Es el truco mas viejo
           que hay: la misma cara alumbrada de arriba es una persona y
           alumbrada de abajo es otra cosa. Las cuencas se hunden y la
           mandibula tira sombra para arriba. */
        /* ROJA. En el juego se le describe siempre igual: "alto, delgado, de
           cara roja", y en la embestida la cara roja llena la pantalla. */
        this.luzCara = new THREE.PointLight(0xff2a18, 4.2, 2.6, 2.0);
        this.luzCara.position.set(0, ALTO_BICHO * 0.80, -0.22);
        this.raiz.add(this.luzCara);
        escena.add(this.raiz);

        this.pos = new THREE.Vector2(0, 0);
        this.yaw = 0; this.paso = 0; this.estado = 'ronda';
        this.ruta = []; this.recalcular = 0; this.destino = null;
        this.alerta = 0;
    }

    reubicar(c, r) {
        const [x, z] = toWorld(c, r);
        this.pos.set(x, z);
        this.raiz.position.set(x, this.base, z);
        this.ruta = []; this.destino = null; this.recalcular = 0;
    }

    animar(dt, vel) {
        this.paso += dt * (1.0 + vel * 0.95);
        const amp = Math.min(1, vel / 2.6);

        /* Las articulaciones. La zancada la marcan las caderas; las rodillas
           van medio ciclo mas tarde y SOLO se doblan hacia atras, que es lo que
           hace una rodilla. Los brazos van cruzados con las piernas y los codos
           casi no se mueven: cuelgan. */
        const A = this.art;
        if (A) {
            const f = this.paso * 2;
            for (const [l, s] of [['I', -1], ['D', 1]]) {
                const fase = s > 0 ? Math.PI : 0;
                const sw = Math.sin(f + fase);
                if (A['muslo' + l]) A['muslo' + l].rotation.x = sw * 0.52 * amp;
                if (A['pantorrilla' + l])
                    A['pantorrilla' + l].rotation.x = -Math.max(0, -sw + 0.25) * 0.95 * amp;
                const sb = Math.sin(f + (s > 0 ? 0 : Math.PI));
                if (A['brazo' + l]) {
                    A['brazo' + l].rotation.x = sb * 0.30 * amp - 0.04;
                    A['brazo' + l].rotation.z = s * 0.07;
                }
                if (A['antebrazo' + l])
                    A['antebrazo' + l].rotation.x = -0.10 - Math.abs(sb) * 0.22 * amp;
            }
            // la cabeza acompana con retraso: es lo que la hace parecer pesada
            if (A.cabeza) {
                A.cabeza.rotation.z = Math.sin(f - 0.7) * 0.06 * amp;
                A.cabeza.rotation.x = 0.05 + (this.estado === 'caza' ? 0.16 : 0);
            }
        }

        /* Anda en zancos: el balanceo lateral es lo que da la caminata. Cada
           zancada lo tira para un lado y lo levanta un poco. */
        const g = this.giroModelo;
        g.rotation.z = Math.sin(this.paso * 2) * 0.085 * amp;
        /* Cazando se echa MUCHO mas para adelante: un bicho derecho camina,
           uno encorvado te viene a buscar. */
        const caza = this.estado === 'caza' ? 1 : 0;
        g.rotation.x = -0.05 - 0.09 * amp - 0.20 * caza;
        g.position.y = Math.abs(Math.sin(this.paso * 2)) * 0.075 * amp;
        // y se contonea de adelante hacia atras, medio paso mas tarde
        g.position.z = Math.sin(this.paso * 2 + 1.1) * 0.05 * amp;
    }
}

/* ------------------------------------------------------------------ la mision */
export class Mision {
    /* `origen` es donde aparece el jugador: la puerta y el bicho arrancan lo
       mas lejos posible de ahi. Midiendo desde el centro del mapa —que es lo
       que hacia antes— la puerta podia caer al lado tuyo. */
    constructor(escena, origen, assets) {
        this.escena = escena;
        this.base = LEVELS[NIVEL].base;
        this.rng = new Rng(20260902);
        this.grupo = new THREE.Group();
        escena.add(this.grupo);

        this.empujando = null;       // el cubo que voy arrastrando, de a uno
        this.tienePinza = false;
        this.tieneLlave = false;
        this.tieneTarjeta = false;   // la que lleva EL encima
        this.cortado = false;        // el cableado de la puerta, ya cortado
        this.puestos = 0;
        this.terminado = null;       // 'escapo'
        this.aviso = '';
        this.avisoT = 0;
        this.atrapadas = 0;
        this.ruido = 0;

        this.celdasLibres = [];
        for (let r = 2; r < H - 2; r++)
            for (let c = 2; c < W - 2; c++)
                if (isOpen(NIVEL, c, r) && !isStairCell(c, r) && !isHole(NIVEL, c, r))
                    this.celdasLibres.push([c, r]);

        this.origen = origen || { x: 0, z: 0 };
        this.armarCubos();
        this.armarSalida();
        this.bicho = new Langosta(escena, this.base, assets);
        /* La tarjeta azul la lleva EL colgada del pecho: hay que verla para
           entender que la unica forma de salir es acercarsele. */
        this.tarjetaObj = new THREE.Mesh(
            new THREE.BoxGeometry(0.20, 0.13, 0.015),
            new THREE.MeshStandardMaterial({
                color: 0x2f7fd8, roughness: .5, emissive: 0x1b4f8c, emissiveIntensity: .8,
            }));
        this.tarjetaObj.position.set(-0.16, ALTO_BICHO * 0.60, 0);
        this.tarjetaObj.rotation.y = Math.PI / 2;
        this.bicho.raiz.add(this.tarjetaObj);
        const p = this.lejosDe(this.origen.x, this.origen.z);
        this.bicho.reubicar(p[0], p[1]);
    }

    celdaAlAzar() { return this.celdasLibres[this.rng.int(0, this.celdasLibres.length - 1)] }

    lejosDe(x, z) {
        let mejor = this.celdaAlAzar(), d = -1;
        for (let i = 0; i < 40; i++) {
            const c = this.celdaAlAzar(), [wx, wz] = toWorld(c[0], c[1]);
            const dd = (wx - x) ** 2 + (wz - z) ** 2;
            if (dd > d) { d = dd; mejor = c }
        }
        return mejor;
    }

    /* Un cuarto con 3x3 celdas abiertas: ahi van las TRES baldosas juntas y la
       trampilla del techo. En el juego original es una sola "colored-pad room",
       no tres baldosas desparramadas por la casa — desparramadas, el juego es
       caminar, y juntas es un rompecabezas. */
    salaDePads() {
        const cand = [];
        for (let r = 3; r < H - 3; r++) {
            for (let c = 3; c < W - 3; c++) {
                let libre = true;
                for (let dr = -1; dr <= 1 && libre; dr++)
                    for (let dc = -1; dc <= 1; dc++)
                        if (!isOpen(NIVEL, c + dc, r + dr) || isStairCell(c + dc, r + dr)) { libre = false; break }
                if (libre) cand.push([c, r]);
            }
        }
        return cand.length ? cand[this.rng.int(0, cand.length - 1)] : this.celdaAlAzar();
    }

    armarCubos() {
        this.cubos = []; this.baldosas = [];
        const geo = new THREE.BoxGeometry(.34, .34, .34);
        /* Rectangulo plano pintado en el piso, como en el juego: un disco que
           brilla parece un objeto, y esto es una marca. */
        const marca = new THREE.PlaneGeometry(1.25, .80);
        marca.rotateX(-Math.PI / 2);

        const [sc, sr] = this.salaDePads();
        this.salaPads = [sc, sr];
        this.forrarSala(sc, sr);
        const fila = [[-1, 0], [0, 0], [1, 0]];

        COLORES.forEach((col, i) => {
            const m = new THREE.MeshStandardMaterial({
                color: col.hex, roughness: .55, emissive: col.hex, emissiveIntensity: .30,
            });
            // los cubos SI van desparramados: buscarlos es medio juego
            const c = this.celdaAlAzar(), [x, z] = toWorld(c[0], c[1]);
            const cubo = new THREE.Mesh(geo, m);
            cubo.position.set(x, this.base + .20, z);
            cubo.castShadow = true;
            this.grupo.add(cubo);
            this.cubos.push({ ...col, obj: cubo, mat: m, puesto: false });

            const [dc, dr] = fila[i];
            const [bx, bz] = toWorld(sc + dc, sr + dr);
            const pad = new THREE.Mesh(marca, new THREE.MeshStandardMaterial({
                color: col.hex, roughness: .8, emissive: col.hex, emissiveIntensity: .5,
            }));
            pad.position.set(bx, this.base + .012, bz);
            this.grupo.add(pad);
            const L = new THREE.PointLight(col.hex, 2.4, 4.5, 2);
            L.position.set(bx, this.base + .5, bz);
            this.grupo.add(L);
            this.baldosas.push({ ...col, obj: pad, x: bx, z: bz });
        });

        /* La soga baja del techo recien cuando estan los tres cubos. */
        this.sogaCelda = [sc, sr - 1];
        const [sx, sz] = toWorld(this.sogaCelda[0], this.sogaCelda[1]);
        this.soga = new THREE.Group();
        const cuerda = new THREE.Mesh(
            new THREE.CylinderGeometry(.022, .022, WALL_H - 1.1, 5),
            new THREE.MeshStandardMaterial({ color: 0x8a7a55, roughness: 1 }));
        cuerda.position.y = this.base + 1.1 + (WALL_H - 1.1) / 2;
        this.soga.add(cuerda);
        const pinza = new THREE.Group();
        const mango = new THREE.MeshStandardMaterial({ color: 0xc4342c, roughness: .5 });
        const acero = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: .35, metalness: .8 });
        for (const s of [-1, 1]) {
            const g = new THREE.Mesh(new THREE.BoxGeometry(.035, .22, .035), mango);
            g.position.set(s * .035, -.10, 0); pinza.add(g);
            const h = new THREE.Mesh(new THREE.BoxGeometry(.028, .16, .028), acero);
            h.position.set(s * .018, .09, 0); h.rotation.z = -s * .18; pinza.add(h);
        }
        pinza.position.set(sx, this.base + 1.05, sz);
        this.pinzaCaida = false;
        this.soga.position.set(sx - sx, 0, sz - sz);
        this.soga.position.set(0, 0, 0);
        cuerda.position.x = sx; cuerda.position.z = sz;
        this.soga.add(pinza);
        this.pinzaObj = pinza;
        this.soga.visible = false;
        this.grupo.add(this.soga);
        this.sogaPos = [sx, sz];
    }

    /* La sala de las baldosas es de HORMIGON claro, no empapelada: en el juego
       original es lo unico que rompe con los pasillos verdes, y por eso se
       reconoce de lejos y funciona como punto de referencia en un laberinto.
       Se forra por dentro con un cascaron: sale mas barato que meter mano en
       el generador del nivel y no puede romper el laberinto. */
    forrarSala(sc, sr) {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: .95 });
        const piso = new THREE.MeshStandardMaterial({ color: 0x8e8a80, roughness: .96 });
        const R = 1;                      // radio en celdas: 3x3
        const [x0, z0] = toWorld(sc - R, sr - R);
        const [x1, z1] = toWorld(sc + R, sr + R);
        const ax = x1 - x0 + CELL, az = z1 - z0 + CELL;
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        const alto = WALL_H - 0.02;
        const eps = 0.03;

        const suelo = new THREE.Mesh(new THREE.PlaneGeometry(ax, az), piso);
        suelo.rotation.x = -Math.PI / 2;
        suelo.position.set(cx, this.base + 0.014, cz);
        suelo.receiveShadow = true;
        g.add(suelo);
        const techo = new THREE.Mesh(new THREE.PlaneGeometry(ax, az), mat);
        techo.rotation.x = Math.PI / 2;
        techo.position.set(cx, this.base + WALL_H - 0.01, cz);
        g.add(techo);

        for (const [dx, dz, an] of [[0, -1, ax], [0, 1, ax], [-1, 0, az], [1, 0, az]]) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(an, alto), mat);
            m.position.set(cx + dx * (ax / 2 - eps), this.base + alto / 2, cz + dz * (az / 2 - eps));
            m.rotation.y = dx ? -dx * Math.PI / 2 : (dz > 0 ? Math.PI : 0);
            m.receiveShadow = true;
            g.add(m);
        }
        this.grupo.add(g);
    }

    armarSalida() {
        const c = this.lejosDe(this.origen.x, this.origen.z), [x, z] = toWorld(c[0], c[1]);
        this.salida = { x, z, abierta: false };
        const marco = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 2.4, .18),
            new THREE.MeshStandardMaterial({ color: 0x18301c, roughness: .8 }));
        marco.position.set(x, this.base + 1.2, z);
        this.grupo.add(marco);
        const hoja = new THREE.Mesh(
            new THREE.BoxGeometry(1.16, 2.1, .10),
            new THREE.MeshStandardMaterial({
                color: 0x2f8f4a, roughness: .55, emissive: 0x1c7a3a, emissiveIntensity: .7,
            }));
        hoja.position.set(x, this.base + 1.05, z + .1);
        this.grupo.add(hoja);
        this.hojaSalida = hoja;
        const L = new THREE.PointLight(0x53ff92, 5.5, 9, 2);
        L.position.set(x, this.base + 1.6, z + .6);
        this.grupo.add(L);
        this.luzSalida = L;
    }

    /* La llave vive en uno de los muebles revisables, elegido al azar entre los
       que quedaron colocados: por eso se elige DESPUES de poblar el nivel. */
    esconderLlave(revisables) {
        this.revisables = revisables.filter(m => m.lv === NIVEL);
        this.revisados = new Set();
        this.conLlave = this.revisables.length
            ? this.revisables[this.rng.int(0, this.revisables.length - 1)] : null;
    }

    decir(t) { this.aviso = t; this.avisoT = 2.6 }

    /* ------------------------------------------------------ que tengo delante */
    /* Devuelve lo mas cercano dentro del alcance, con el texto del boton. */
    mirando(x, y, z) {
        if (Math.abs(y - this.base) > 1.5) return null;
        const cerca = (ax, az) => Math.hypot(ax - x, az - z) < ALCANCE;

        if (this.empujando) {
            for (const b of this.baldosas)
                if (b.id === this.empujando.id && cerca(b.x, b.z))
                    return { tipo: 'poner', texto: 'DEJARLO EN LA BALDOSA' };
            return { tipo: 'soltar', texto: 'SOLTAR EL CUBO' };
        }
        for (const c of this.cubos)
            if (!c.puesto && cerca(c.obj.position.x, c.obj.position.z))
                return { tipo: 'tomar', cubo: c, texto: 'EMPUJAR EL CUBO ' + c.nombre.toUpperCase() };
        if (this.soga.visible && !this.tienePinza && cerca(this.sogaPos[0], this.sogaPos[1]))
            return { tipo: 'pinza', texto: this.pinzaCaida ? 'AGARRAR LA PINZA' : 'TIRAR DE LA SOGA' };
        /* La tarjeta la lleva EL. Solo se la podes sacar por atras: si te esta
           mirando, ni te acercas. El angulo se mide contra su frente. */
        if (!this.tieneTarjeta) {
            const b = this.bicho;
            const dx = x - b.pos.x, dz = z - b.pos.y;
            const d = Math.hypot(dx, dz);
            if (d < 2.3) {
                // su frente es (-sin yaw, -cos yaw), como la camara
                const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
                const cos = (fx * dx + fz * dz) / (d || 1);
                if (cos < -0.20) return { tipo: 'tarjeta', texto: 'SACARLE LA TARJETA' };
                return { tipo: 'nada', texto: 'TE ESTÁ MIRANDO' };
            }
        }
        if (!this.tieneLlave && this.revisables)
            for (const m of this.revisables)
                if (!this.revisados.has(m) && cerca(m.x, m.z))
                    return { tipo: 'revisar', mueble: m, texto: 'REVISAR EL ' + m.nombre.toUpperCase() };
        if (cerca(this.salida.x, this.salida.z)) {
            /* La puerta tiene TRES cerraduras, como en el juego: el cableado se
               corta con la pinza, el lector quiere la tarjeta y la cerradura la
               llave. Recien ahi sube. */
            if (!this.cortado) return this.tienePinza
                ? { tipo: 'cortar', texto: 'CORTAR EL CABLEADO' }
                : { tipo: 'nada', texto: 'HACE FALTA LA PINZA' };
            if (!this.tieneTarjeta) return { tipo: 'nada', texto: 'FALTA LA TARJETA — LA TIENE ÉL' };
            if (!this.tieneLlave) return { tipo: 'nada', texto: 'FALTA LA LLAVE' };
            return { tipo: 'salir', texto: 'ABRIR LA PUERTA' };
        }
        return null;
    }

    usar(x, y, z) {
        const o = this.mirando(x, y, z);
        if (!o) return;
        if (o.tipo === 'tomar') {
            /* No se levanta: se EMPUJA por el piso, como en el juego. Por eso
               no se pueden llevar dos, y por eso cruzar la casa con uno es la
               parte que duele. */
            this.empujando = o.cubo;
            S.click(0.3);
            this.decir('empujando el cubo ' + o.cubo.nombre + ' — de a uno');
        } else if (o.tipo === 'soltar') {
            this.empujando = null;
            S.click(0.2);
        } else if (o.tipo === 'poner') {
            const c = this.empujando, b = this.baldosas.find(b => b.id === c.id);
            c.obj.position.set(b.x, this.base + .18, b.z);
            c.puesto = true;
            c.mat.emissiveIntensity = .9;
            this.empujando = null;
            S.click(0.45);
            this.puestos++;
            if (this.puestos === 3) {
                this.soga.visible = true;
                this.decir('los tres puestos — se abrió la trampilla del techo');
            } else {
                this.decir('van ' + this.puestos + ' de 3');
            }
        } else if (o.tipo === 'pinza') {
            if (!this.pinzaCaida) {
                /* Primero CAE al piso con un clanc metalico, y recien despues
                   se levanta: es lo que hace el juego, y de paso te obliga a
                   agacharte en el peor momento. */
                this.pinzaCaida = true;
                this.pinzaObj.position.y = this.base + 0.07;
                S.click(0.5);
                this.decir('cayó la pinza');
            } else {
                this.tienePinza = true;
                this.pinzaObj.visible = false;
                S.click(0.3);
                this.decir('pinza');
            }
        } else if (o.tipo === 'revisar') {
            this.revisados.add(o.mueble);
            if (o.mueble === this.conLlave) { this.tieneLlave = true; this.decir('¡la llave!') }
            else this.decir('nada acá');
        } else if (o.tipo === 'cortar') {
            this.cortado = true;
            S.click(0.4);
            this.decir('cableado cortado — falta la tarjeta y la llave');
        } else if (o.tipo === 'tarjeta') {
            this.tieneTarjeta = true;
            if (this.tarjetaObj) this.tarjetaObj.visible = false;
            S.click(0.35);
            this.decir('¡la tarjeta!');
            // sacarsela lo despierta, obviamente
            this.bicho.estado = 'caza'; this.bicho.alerta = 1;
            this.bicho.ultimo = [x, z];
        } else if (o.tipo === 'salir') {
            this.salida.abierta = true;
            this.terminado = 'escapo';
        }
    }

    /* ------------------------------------------------------------- el recorrido */
    /* Camino por la grilla, sin diagonales. El mapa es de 31x31, asi que una
       busqueda entera cuesta nada y se rehace cada medio segundo. */
    camino(c0, r0, c1, r1) {
        if (!isOpen(NIVEL, c1, r1)) return [];
        const previo = new Int32Array(W * H).fill(-1);
        const cola = [c0 + r0 * W];
        previo[c0 + r0 * W] = c0 + r0 * W;
        for (let i = 0; i < cola.length; i++) {
            const n = cola[i], c = n % W, r = (n / W) | 0;
            if (c === c1 && r === r1) break;
            for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nc = c + dc, nr = r + dr;
                if (nc < 0 || nr < 0 || nc >= W || nr >= H) continue;
                const k = nc + nr * W;
                if (previo[k] !== -1 || !isOpen(NIVEL, nc, nr)) continue;
                // por los huecos de 62 cm no entra: mide 2,6 m
                if (isHole(NIVEL, nc, nr) && !isOpen(NIVEL, nc, nr)) continue;
                previo[k] = n;
                cola.push(k);
            }
        }
        const fin = c1 + r1 * W;
        if (previo[fin] === -1) return [];
        const ruta = [];
        for (let n = fin; n !== previo[n]; n = previo[n]) ruta.push([n % W, (n / W) | 0]);
        return ruta.reverse();
    }

    actualizar(dt, jug) {
        if (this.avisoT > 0) this.avisoT -= dt;
        const b = this.bicho;

        /* El cubo que se empuja va delante tuyo, a ras del piso, y raspa. */
        if (this.empujando) {
            const c = this.empujando.obj;
            const fx = -Math.sin(jug.yaw || 0), fz = -Math.cos(jug.yaw || 0);
            c.position.set(jug.x + fx * 0.62, this.base + 0.17, jug.z + fz * 0.62);
            const mov = Math.hypot(jug.x - (this._px ?? jug.x), jug.z - (this._pz ?? jug.z));
            this._raspa = (this._raspa || 0) + mov;
            if (this._raspa > 0.55) { this._raspa = 0; S.arrastre(0.16) }
        }
        this._px = jug.x; this._pz = jug.z;

        /* El ruido: correr lo hace, caminar poco, agachado nada. Se apaga solo.
           Es la traduccion literal del cartel de la pared. */
        const hace = jug.deslizando ? 1.5 : jug.corriendo ? 1.0 : jug.agachado ? 0 : 0.22;
        this.ruido = Math.max(0, Math.min(2.2, this.ruido + (hace - 0.45) * dt * 1.4));

        const dx = jug.x - b.pos.x, dz = jug.z - b.pos.y;
        const dist = Math.hypot(dx, dz);
        const mismoPiso = Math.abs(jug.y - this.base) < 2.0;

        /* Te oye si hacés ruido y estás cerca; te ve si estás en su cono y no
           hay pared en el medio. Agachado el radio de escucha se parte al
           medio, que es para lo que sirve agacharse. */
        const oye = mismoPiso && this.ruido > 0.55 && dist < 9 + this.ruido * 5;
        const mirandoA = Math.cos(b.yaw) * (-dz) + (-Math.sin(b.yaw)) * dx;
        const ve = mismoPiso && dist < 16 && this.libre(b.pos.x, b.pos.y, jug.x, jug.z)
            && (dist < 2.5 || mirandoA > dist * 0.2);

        /* Pasos → respiracion → verlo. Ese es el orden con el que se anuncia
           en el juego original, y es lo que te da tiempo de retirarte. El
           volumen sale de la distancia, no de un temporizador. */
        if (mismoPiso && dist < 26) {
            const cerca = 1 - Math.min(1, dist / 26);
            this.tPaso = (this.tPaso || 0) + dt * (b.estado === 'caza' ? 3.1 : 1.5);
            if (this.tPaso > 1) { this.tPaso = 0; S.paso(0.34 * cerca * cerca) }
            if (dist < 13) {
                this.tResp = (this.tResp || 0) - dt;
                if (this.tResp <= 0) { this.tResp = 2.4; S.respiro(0.30 * (1 - dist / 13)) }
            }
            if (dist < 7.5) {
                this.tLat = (this.tLat || 0) - dt;
                if (this.tLat <= 0) {
                    this.tLat = 0.52 + dist * 0.05;
                    S.latido(0.38 * (1 - dist / 7.5));
                }
            }
        }

        if ((oye || ve) && !this.terminado) {
            /* El grito va SOLO al pasar de tranquilo a caza. Si sonara todo el
               tiempo que te ve, en diez segundos deja de significar nada. */
            if (b.estado !== 'caza') { S.grito(); this.susto = 1 }
            b.estado = 'caza';
            b.alerta = 1;
            b.ultimo = [jug.x, jug.z];
        } else if (b.estado === 'caza') {
            b.alerta -= dt * 0.18;
            if (b.alerta <= 0) b.estado = 'ronda';
        }

        const vel = b.estado === 'caza' ? 3.6 : 1.35;
        b.recalcular -= dt;
        if (b.recalcular <= 0 || !b.ruta.length) {
            b.recalcular = b.estado === 'caza' ? 0.45 : 1.2;
            /* toCell devuelve un PAR, no un objeto. Leyendole .c y .r salia
               undefined, el camino volvia vacio y el bicho no se movia nunca
               del lugar donde aparecio. */
            const [ac, ar] = toCell(b.pos.x, b.pos.y);
            let meta;
            if (b.estado === 'caza') meta = toCell(b.ultimo[0], b.ultimo[1]);
            else {
                if (!b.destino || !b.ruta.length) b.destino = this.celdaAlAzar();
                meta = b.destino;
            }
            b.ruta = this.camino(ac, ar, meta[0], meta[1]);
            if (b.estado !== 'caza' && !b.ruta.length) b.destino = this.celdaAlAzar();
        }

        let avanzo = 0;
        if (b.ruta.length) {
            const [tc, tr] = b.ruta[0];
            const [tx, tz] = toWorld(tc, tr);
            let vx = tx - b.pos.x, vz = tz - b.pos.y;
            const d = Math.hypot(vx, vz);
            if (d < 0.22) b.ruta.shift();
            else {
                vx /= d; vz /= d;
                const paso = vel * dt;
                b.pos.x += vx * paso; b.pos.y += vz * paso;
                avanzo = vel;
                // mira a donde camina; el modelo apunta a -Z como la camara
                const quiere = Math.atan2(-vx, -vz);
                let dif = ((quiere - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                b.yaw += dif * Math.min(1, dt * 7);
            }
        }
        b.raiz.position.x = b.pos.x; b.raiz.position.z = b.pos.y;
        b.raiz.rotation.y = b.yaw;
        b.animar(dt, avanzo);

        // te agarro
        if (!this.terminado && mismoPiso && dist < 0.95) {
            this.atrapadas++;
            this.empujando = null;
            const p = this.lejosDe(jug.x, jug.z);
            const [nx, nz] = toWorld(p[0], p[1]);
            this.reaparecer = [nx, nz];
            const q = this.lejosDe(nx, nz);
            b.reubicar(q[0], q[1]);
            b.estado = 'ronda'; b.alerta = 0;
            this.ruido = 0;
            this.susto = 1.4;
            this.negro = 1;          // la pantalla se va a negro, como en el juego
            S.grito();
            this.decir('te agarró');
        }

        if (this.susto > 0) this.susto = Math.max(0, this.susto - dt * 1.5);
        if (this.negro > 0) this.negro = Math.max(0, this.negro - dt * 0.9);

        if (this.salida.abierta) {
            this.luzSalida.intensity = 14;
            this.hojaSalida.visible = false;
        }
    }

    /* Linea de vista por la grilla: se camina de celda en celda y si una esta
       cerrada, no ve. Un rayo de three contra el laberinto entero costaria
       mucho mas y daria lo mismo. */
    libre(x0, z0, x1, z1) {
        const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (CELL * 0.5));
        for (let i = 1; i < n; i++) {
            const t = i / n;
            const [c, r] = toCell(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
            if (!isOpen(NIVEL, c, r)) return false;
        }
        return true;
    }

    /* Lo que muestra el HUD: la lista de pendientes, en orden. */
    tareas() {
        if (this.terminado === 'escapo') return ['ESCAPASTE'];
        if (this.puestos < 3) return ['empujá los cubos a su baldosa: ' + this.puestos + '/3'];
        if (!this.tienePinza) return ['la pinza, en la trampilla del techo'];
        if (!this.tieneLlave) return ['la llave está en un mueble — revisalos'];
        if (!this.cortado) return ['cortá el cableado de la puerta'];
        if (!this.tieneTarjeta) return ['la tarjeta la lleva ÉL — por atrás'];
        return ['a la puerta'];
    }
}
