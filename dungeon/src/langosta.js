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
import { CLIPS } from './animdata.js';
import * as S from './sonido.js';
import {
    CELL, WALL_H, W, H, LEVELS, Rng, toWorld, toCell, esPiso, hayPared,
    PARED, GATERA, SECTORES, sectorEn, sectorPorId, centroSector,
} from './map.js';

const COLORES = [
    { id: 'rojo', hex: 0xd8352b, nombre: 'rojo' },
    { id: 'amarillo', hex: 0xe8c22e, nombre: 'amarillo' },
    { id: 'azul', hex: 0x2f7fd8, nombre: 'azul' },
];
const ALCANCE = 1.5;          // hasta donde llega la mano
const NIVEL = 0;              // queda UNA planta: la casa entera

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
                this.contornos = rig.contornos || [];
                /* LA TEXTURA MANDA. El modelo trae su atlas —la cara tallada,
                   los brazos vendados, los pantalones negros, los zancos— y es
                   TODO lo que tiene de bueno. Dos intentos de hacerlo visible
                   lo arruinaron:

                     1. teñirlo plano (color liso + emisivo liso) le lavaba el
                        relieve: un emisivo constante le suma el mismo gris a
                        cada pixel, asi que la cara tallada y el pantalon negro
                        terminan igual de claros;
                     2. anular el mapa directamente lo dejaba de plastilina.

                   Lo correcto es dejar el color en blanco —o sea, la textura
                   tal como esta pintada— y usar EMISSIVEMAP: el piso de brillo
                   sigue el mapa en vez de inundarlo. Lo claro brilla un poco y
                   lo negro sigue negro, asi que el relieve se conserva y en un
                   pasillo apagado igual se lee.

                   Y el contraste contra la pared de yeso blanco lo da el
                   contorno negro, que no toca la textura. */
                for (const malla of Object.values(rig.mallas || {})) {
                    const m = malla.material;
                    if (!m) continue;
                    if (m.color) m.color.setHex(0xffffff);
                    m.roughness = 0.95; m.metalness = 0;
                    if (m.emissive) {
                        if (m.map) m.emissiveMap = m.map;
                        m.emissive.setHex(0x4a4640);
                        m.emissiveIntensity = 1;
                    }
                }
                o.traverse(n => {
                    if (!n.isMesh) return;
                    n.castShadow = true;
                    if (n.material && n.material.isMeshBasicMaterial) return;  // cuencas y contorno
                    /* SE TIENE QUE VER. El tinte gris de antes lo dejaba en
                       110 de brillo contra una pared de 127 —medido—: un 13%
                       de contraste, o sea invisible. Te mataba algo que no
                       llegabas a ver, y eso no es miedo, es un bug.

                       El tinte ahora es claro, y sobre todo la malla lleva
                       EMISIVO: un piso de brillo propio que no depende de
                       ninguna luz. Es lo que hace que se lea igual contra una
                       pared clara que en un pasillo negro — y un bicho al que
                       tenés que ver venir necesita exactamente eso. */
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

    /* La cara ROJA de la embestida. No alcanza con meterle una luz roja
       encima: la malla lleva un EMISIVO claro —el que la hace visible en un
       pasillo negro— y ese emisivo gana siempre, asi que la cara sale rosa.
       Hay que cambiar el material y devolverlo despues. */
    caraRoja(on) {
        if (!this.modelo || this._rojo === on) return;
        this._rojo = on;
        for (const co of this.contornos || []) co.visible = !on;   // a 60 cm estorba
        this.modelo.traverse(n => {
            if (!n.isMesh || !n.material || n.material.isMeshBasicMaterial) return;
            const m = n.material;
            if (!n.userData.tono) n.userData.tono = [m.color.getHex(), m.emissive.getHex(), m.emissiveIntensity];
            if (on) {
                /* Tinte rojo MULTIPLICANDO la textura, no reemplazandola: la
                   cara tallada tiene que seguir viendose, roja pero tallada.
                   El emisivo baja para que la luz roja haga el trabajo. */
                m.color.setHex(0xb03028);
                m.emissive.setHex(0x1c0503);
                m.emissiveIntensity = 1;
            } else {
                const [c, e, i] = n.userData.tono;
                m.color.setHex(c); m.emissive.setHex(e); m.emissiveIntensity = i;
            }
        });
    }

    reubicar(c, r) {
        const [x, z] = toWorld(c, r);
        this.pos.set(x, z);
        this.raiz.position.set(x, this.base, z);
        this.ruta = []; this.destino = null; this.recalcular = 0;
    }

    /* Muestrea un clip real de Roblox. Mismo lector que usa el jugador. */
    muestra(nombre, fase) {
        const c = CLIPS[nombre];
        const n = c.n, f = ((fase % 1) + 1) % 1 * n;
        const a = Math.floor(f) % n, b = (a + 1) % n, t = f - Math.floor(f);
        const o = {};
        for (const k in c.k) o[k] = c.k[k][a] + (c.k[k][b] - c.k[k][a]) * t;
        return o;
    }

    animar(dt, vel) {
        /* La zancada sale del clip REAL de Roblox, el mismo que usa el
           jugador, no de un seno inventado. Pero el bicho no es una persona:
           mide 3,2 m, camina en zancos y no tiene pies, asi que cada canal va
           con su factor. La rodilla es la que mas se baja — una pata de zanco
           no se pliega 144 grados como una pierna. */
        const largoZancada = 3.6;               // metros por ciclo, a su escala
        this.fase = (this.fase || 0) + dt * Math.max(vel, 0.35) / largoZancada;
        const caza = this.estado === 'caza';
        const k = this.muestra(caza ? 'correr' : 'caminar', this.fase);
        const amp = Math.min(1, 0.45 + vel / 3.2);

        const A = this.art;
        if (A) {
            const CAD = 0.95, ROD = 0.42, HOM = 0.55, COD = 0.30;
            for (const l of ['I', 'D']) {
                if (A['muslo' + l]) A['muslo' + l].rotation.x = k['p' + l] * CAD * amp;
                if (A['pantorrilla' + l]) A['pantorrilla' + l].rotation.x = k['r' + l] * ROD * amp;
                if (A['brazo' + l]) {
                    A['brazo' + l].rotation.x = k['h' + l] * HOM * amp - 0.05;
                    A['brazo' + l].rotation.z = (l === 'I' ? -1 : 1) * 0.08;
                }
                if (A['antebrazo' + l]) A['antebrazo' + l].rotation.x = k['c' + l] * COD * amp;
            }
            if (A.cabeza) {
                A.cabeza.rotation.x = k.cz * 0.5 + (caza ? 0.16 : 0);
                A.cabeza.rotation.z = Math.sin(this.fase * Math.PI * 2 - 0.7) * 0.05 * amp;
            }
        }

        /* El cuerpo entero: el balanceo lateral de la zancada y la inclinacion.
           Cazando se echa mucho mas para adelante — uno derecho camina, uno
           encorvado te viene a buscar. */
        const g = this.giroModelo;
        g.rotation.z = Math.sin(this.fase * Math.PI * 2) * 0.075 * amp;
        g.rotation.x = k.ca * 0.8 - 0.05 - (caza ? 0.20 : 0);
        // sube y baja dos veces por ciclo, una por zancada
        g.position.y = Math.abs(Math.sin(this.fase * Math.PI * 2)) * 0.09 * amp;
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
        this.embestida = null;      // temporizador del susto, null = no hay
        this.ruido = 0;

        this.celdasLibres = [];
        for (let r = 2; r < H - 2; r++)
            for (let c = 2; c < W - 2; c++)
                if (esPiso(c, r))
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

    /* Una celda de la sala que no sea el centro y que este libre de verdad. */
    rincon(sala) {
        const cc = sala.c + (sala.w >> 1), cr = sala.r + (sala.h >> 1);
        const cand = [];
        for (let r = sala.r; r < sala.r + sala.h; r++)
            for (let c = sala.c; c < sala.c + sala.w; c++) {
                if (c === cc && r === cr) continue;
                if (!esPiso(c, r)) continue;
                cand.push([c, r]);
            }
        return cand.length ? cand[this.rng.int(0, cand.length - 1)] : [cc, cr];
    }

    lejosDe(x, z) {
        let mejor = this.celdaAlAzar(), d = -1;
        for (let i = 0; i < 40; i++) {
            const c = this.celdaAlAzar(), [wx, wz] = toWorld(c[0], c[1]);
            const dd = (wx - x) ** 2 + (wz - z) ** 2;
            if (dd > d) { d = dd; mejor = c }
        }
        return mejor;
    }

    /* La sala de las baldosas ya NO se busca: esta escrita en el mapa. Es la
       sala 'pads' —yeso blanco con tachas, siete por cinco celdas, vacia— y
       las tres baldosas van en fila en el medio, como en la foto del juego
       original, donde estan las tres pegadas contra la pared del fondo. */
    salaDePads() {
        const s = sectorPorId('salon');
        return s ? centroSector(s) : this.celdaAlAzar();
    }

    armarCubos() {
        this.cubos = []; this.baldosas = [];
        /* El cubo del juego original NO es un dado: es un bloque de un metro
           que brilla entero, tapa medio pasillo y hay que empujarlo. Medido
           contra el personaje en la captura de la biblioteca da 1,1 m. */
        const LADO = 1.05;
        const geo = new THREE.BoxGeometry(LADO, LADO, LADO);
        /* Rectangulo plano pintado en el piso, como en el juego: un disco que
           brilla parece un objeto, y esto es una marca. */
        const marca = new THREE.PlaneGeometry(1.25, .80);
        marca.rotateX(-Math.PI / 2);

        const [sc, sr] = this.salaDePads();
        this.salaPads = [sc, sr];
        const fila = [[-1, 0], [0, 0], [1, 0]];

        /* Un cubo por sala con nombre, no tres celdas al azar: en el original
           cada bloque esta en un cuarto que se reconoce —la biblioteca, el
           deposito, el cuarto— y buscarlos es recorrer la casa, no barrer un
           laberinto celda por celda. */
        const cunas = ['biblioteca', 'deposito', 'capilla', 'comedor', 'vestibulo']
            .map(id => sectorPorId(id)).filter(Boolean);
        COLORES.forEach((col, i) => {
            const m = new THREE.MeshStandardMaterial({
                color: col.hex, roughness: .5, emissive: col.hex, emissiveIntensity: 0.82,
            });
            const cuna = cunas[i % cunas.length];
            /* Adentro pero NO en el centro: el centro es donde caes cuando
               entras y donde va el mueble grande de la sala, asi que ahi el
               bloque queda encima tuyo o encima de un sillon. */
            const c = cuna ? this.rincon(cuna) : this.celdaAlAzar();
            const [x, z] = toWorld(c[0], c[1]);
            const cubo = new THREE.Mesh(geo, m);
            cubo.position.set(x, this.base + LADO / 2, z);
            cubo.castShadow = true;
            // el bloque se ve de lejos porque tira luz propia, como en el juego
            const luzCubo = new THREE.PointLight(col.hex, 2.6, 6.5, 2);
            luzCubo.position.set(x, this.base + LADO, z);
            this.grupo.add(luzCubo);
            cubo.userData.luz = luzCubo;
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

    armarSalida() {
        /* La puerta ya no cae en la celda mas lejana al azar: va en la sala
           'salida'. En el juego original la salida es una DOBLE PUERTA GRIS
           con un cartel verde de EXIT encima, al final de un pasillo blanco —
           no una hoja verde brillando en cualquier pared. */
        const sala = sectorPorId('salida');
        let c;
        if (sala) {
            // contra la pared del fondo de la sala, centrada
            c = [sala.c + (sala.w >> 1), sala.r + sala.h - 1];
            if (!esPiso(c[0], c[1])) c = centroSector(sala);
        } else {
            c = this.lejosDe(this.origen.x, this.origen.z);
        }
        const [x, z] = toWorld(c[0], c[1]);
        this.salida = { x, z, abierta: false };

        const gris = new THREE.MeshStandardMaterial({ color: 0x8e9095, roughness: .55, metalness: .25 });
        const grisOsc = new THREE.MeshStandardMaterial({ color: 0x5c5f63, roughness: .6, metalness: .3 });
        const g = new THREE.Group();
        g.position.set(x, this.base, z);
        /* Que mire al cuarto: la hoja se apoya contra la pared que tenga
           detras. Sin esto la puerta siempre miraba a +Z y desde adentro se
           veia el dorso gris con el cartel del otro lado. */
        const atras = [[0, 1], [0, -1], [1, 0], [-1, 0]]
            .find(([dc, dr]) => hayPared(c[0], c[1], -dc, -dr) === PARED) || [0, 1];
        g.rotation.y = Math.atan2(atras[0], atras[1]);

        // el marco, mas ancho que la hoja: es lo que da el portal
        const marco = new THREE.Mesh(new THREE.BoxGeometry(2.06, 2.72, .16), grisOsc);
        marco.position.y = 1.36;
        g.add(marco);
        // las DOS hojas, con su junta al medio y su barral horizontal
        this.hojasSalida = [];
        for (const sg of [-1, 1]) {
            const hoja = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.44, .09), gris);
            hoja.position.set(sg * 0.475, 1.24, .10);
            hoja.castShadow = true;
            g.add(hoja);
            const barra = new THREE.Mesh(new THREE.BoxGeometry(0.72, .07, .07),
                new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: .35, metalness: .7 }));
            barra.position.set(sg * 0.475, 1.05, .17);
            g.add(barra);
            this.hojasSalida.push(hoja);
        }
        this.hojaSalida = this.hojasSalida[0];

        /* El cartel: caja verde encima del marco, encendida. Es lo unico verde
           del mapa, asi que se lee desde el otro lado del pasillo. */
        const cartel = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.30, .07),
            new THREE.MeshStandardMaterial({
                color: 0x25aa4e, roughness: .5, emissive: 0x2fdd6a, emissiveIntensity: 1.5,
            }));
        cartel.position.set(0, 2.92, .12);
        g.add(cartel);
        const L = new THREE.PointLight(0x53ff92, 5.5, 9, 2);
        L.position.set(0, 2.6, .6);
        g.add(L);
        this.luzSalida = L;
        this.grupo.add(g);
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
            c.obj.position.set(b.x, this.base + 0.53, b.z);
            if (c.obj.userData.luz) c.obj.userData.luz.position.set(b.x, this.base + 1.05, b.z);
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
            S.puerta();
            S.musicaFinal();
        }
    }

    /* ------------------------------------------------------------ LA EMBESTIDA */
    /* Como funciona el susto en el juego original, sacado de mirar el momento
       del contacto cuadro por cuadro y de la captura que mando el jugador:

         1. el contacto es instantaneo y mata: no hay vida ni forcejeo
         2. la camara NO se suelta — sigue siendo primera persona, se ve la
            mira en el medio de la cara
         3. la cara llena el cuadro entero, iluminada de ROJO sangre, con las
            cuencas negras, sobre un fondo completamente negro
         4. la camara tiembla fuerte y el campo se cierra de golpe
         5. chillido + un golpe grave, y recien despues la pantalla a negro
         6. reapareces lejos y el bicho vuelve a rondar

       Lo importante es el punto 3: el fondo negro no se pinta, se consigue
       CERRANDO LA NIEBLA a dos metros. Todo lo que no es la cara queda del
       color de la niebla, que ya es casi negro, y la cara —que esta a medio
       metro— se salva. Es una linea y sale gratis. */
    embestir(jug) {
        if (this.embestida !== null && this.embestida !== undefined) return;
        this.atrapadas++;
        this.empujando = null;
        this.embestida = 0;
        this.ruido = 0;
        /* La niebla se guarda para devolverla: el menu de graficos tambien la
           toca, asi que hay que restaurar los valores que habia, no unos fijos. */
        const f = this.escena.fog;
        this.nieblaPrevia = f ? [f.near, f.far] : null;
        this.bicho.estado = 'embiste';
        S.grito();
        S.golpe();
        this.decir('te agarró');
    }

    /* Se llama todos los cuadros mientras dura. Devuelve true si sigue. */
    animarEmbestida(dt, jug) {
        const T = 1.30;
        this.embestida += dt;
        const k = Math.min(1, this.embestida / T);
        const b = this.bicho;

        /* La cara se planta SOBRE EL RAYO DE LA CAMARA, no en el mundo: asi
           llena el cuadro mires a donde mires, que es lo que hace el juego.
           Y se acerca de 0,85 m a 0,40 m mientras dura: la embestida. */
        const p = jug.pitch || 0, y = jug.yaw || 0;
        const cp = Math.cos(p);
        const fx = -Math.sin(y) * cp, fy = Math.sin(p), fz = -Math.cos(y) * cp;
        /* Frena a 62 cm. Mas cerca, la cara le pasa por adentro a la camara y
           se ven los poligonos de atras: deja de ser una cara y es un error. */
        const d = 0.95 - 0.33 * Math.min(1, k * 2.2);
        const ojo = jug.ojo !== undefined ? jug.ojo : jug.y + 1.0;
        const caraX = jug.x + fx * d, caraY = ojo + fy * d, caraZ = jug.z + fz * d;

        // los ojos del bicho estan al 92,6% de su altura, medido sobre el rig
        b.raiz.position.set(caraX, caraY - ALTO_BICHO * 0.9257, caraZ);
        b.raiz.rotation.y = Math.atan2(fx, fz);        // encarado a la camara
        b.pos.set(caraX, caraZ);
        b.animar(dt, 0);

        /* La luz de la cara, al mango y pegada: es la cara roja de la captura.
           Va DELANTE de la cara, entre ella y vos, si no la nariz se come todo. */
        b.caraRoja(true);
        b.luzCara.position.set(0, ALTO_BICHO * 0.9257, -0.30);
        b.luzCara.intensity = 30;
        b.luzCara.distance = 2.2;
        b.luz.intensity = 0;

        // y todo lo demas a negro: la niebla se cierra a dos metros
        const f = this.escena.fog;
        if (f) { f.near = 0.30; f.far = 1.55 + 0.9 * (1 - k) }

        this.susto = 1;
        // la pantalla se va a negro sobre el final, no de entrada
        this.negro = Math.max(0, (k - 0.62) / 0.38);

        if (k >= 1) {
            const pz = this.lejosDe(jug.x, jug.z);
            const [nx, nz] = toWorld(pz[0], pz[1]);
            this.reaparecer = [nx, nz];
            const q = this.lejosDe(nx, nz);
            b.reubicar(q[0], q[1]);
            b.estado = 'ronda'; b.alerta = 0;
            b.caraRoja(false);
            b.luzCara.position.set(0, ALTO_BICHO * 0.80, -0.22);
            b.luzCara.intensity = 4.2;
            b.luzCara.distance = 2.6;
            b.luz.intensity = 3.4;
            if (f && this.nieblaPrevia) { f.near = this.nieblaPrevia[0]; f.far = this.nieblaPrevia[1] }
            this.embestida = null;
            this.susto = 1.4;
            this.negro = 1;
            return false;
        }
        return true;
    }

    /* Mientras dura la embestida no se camina ni se mira: el jugador ya esta
       muerto, lo unico que pasa es el susto. */
    congelado() { return this.embestida !== null && this.embestida !== undefined }

    /* ------------------------------------------------------------- el recorrido */
    /* Camino por la grilla, sin diagonales. El mapa es de 31x31, asi que una
       busqueda entera cuesta nada y se rehace cada medio segundo. */
    camino(c0, r0, c1, r1) {
        if (!esPiso(c1, r1)) return [];
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
                if (previo[k] !== -1 || !esPiso(nc, nr)) continue;
                /* El tabique corta el paso, y por la gatera NO entra: mide 3,2 m
                   y el hueco tiene 1,05. Ese es el sentido de las gateras. */
                const pared = hayPared(c, r, dc, dr);
                if (pared === PARED || pared === GATERA) continue;
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
        /* Mientras te esta embistiendo no corre nada mas: ni la IA del bicho,
           ni el ruido, ni el cubo que arrastrabas. Es un cuadro y medio en el
           que lo unico que pasa es la cara. */
        if (this.congelado()) { this.animarEmbestida(dt, jug); return }
        const b = this.bicho;

        /* El cubo que se empuja va delante tuyo, a ras del piso, y raspa. */
        if (this.empujando) {
            const c = this.empujando.obj;
            const fx = -Math.sin(jug.yaw || 0), fz = -Math.cos(jug.yaw || 0);
            c.position.set(jug.x + fx * 0.95, this.base + 0.53, jug.z + fz * 0.95);
            if (c.userData.luz) c.userData.luz.position.set(c.position.x, this.base + 1.05, c.position.z);
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

        /* VER Y OIR SON DISTINTOS.

           Ver es DIRECCIONAL: tiene que tenerte en su cono de visión y sin
           pared en el medio. Antes había un `dist < 2.5 ||` que lo hacía verte
           por la espalda si estabas cerca, y eso rompía lo único que el juego
           te pide hacer: acercártele por atrás a sacarle la tarjeta.

           Oír no es direccional, pero YA NO TE PERSIGUE: te manda a
           investigar el ruido. Si te agachaste no hacés ruido, así que
           agachado detrás de él sos invisible hasta que se dé vuelta. */
        const mirandoA = Math.cos(b.yaw) * (-dz) + (-Math.sin(b.yaw)) * dx;
        const enCono = mirandoA > dist * 0.34;          // ±70 grados
        const ve = mismoPiso && dist < 17 && enCono
            && this.libre(b.pos.x, b.pos.y, jug.x, jug.z);
        const oye = mismoPiso && this.ruido > 0.70 && dist < 8 + this.ruido * 5;

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

        /* Tres estados, no dos: RONDA da vueltas, BUSCA va hasta donde sonó
           algo y mira, CAZA te persigue porque te está viendo. */
        if (ve && !this.terminado) {
            // el grito va SOLO al pasar de no verte a verte
            if (b.estado !== 'caza') { S.grito(); this.susto = 1 }
            b.estado = 'caza';
            b.alerta = 1;
            b.ultimo = [jug.x, jug.z];
        } else if (oye && !this.terminado && b.estado !== 'caza') {
            b.estado = 'busca';
            b.alerta = Math.max(b.alerta, 0.75);
            b.ultimo = [jug.x, jug.z];
        } else if (b.estado === 'caza' || b.estado === 'busca') {
            /* Al perderte de vista NO se olvida de golpe: sigue hasta el
               último lugar donde te vio y ahí se queda mirando un rato. */
            b.alerta -= dt * (b.estado === 'caza' ? 0.28 : 0.42);
            if (b.estado === 'caza' && b.alerta < 0.55) b.estado = 'busca';
            if (b.alerta <= 0) { b.estado = 'ronda'; b.destino = null }
        }

        /* Más rápido que vos, pero poco: corriendo vas a 5,4 y él a 5,9. Se
           le escapa deslizándose —9,2 por menos de un segundo— y por las
           gateras, que es para lo que están. Y en cada esquina pierde tiempo
           girando, porque camina para adelante y no de costado. */
        const vel = b.estado === 'caza' ? 5.9 : b.estado === 'busca' ? 2.6 : 1.35;
        b.recalcular -= dt;
        if (b.recalcular <= 0 || !b.ruta.length) {
            b.recalcular = b.estado === 'caza' ? 0.35 : b.estado === 'busca' ? 0.6 : 1.2;
            /* toCell devuelve un PAR, no un objeto. Leyendole .c y .r salia
               undefined, el camino volvia vacio y el bicho no se movia nunca
               del lugar donde aparecio. */
            const [ac, ar] = toCell(b.pos.x, b.pos.y);
            let meta;
            if (b.estado === 'caza' || b.estado === 'busca') meta = toCell(b.ultimo[0], b.ultimo[1]);
            else {
                if (!b.destino || !b.ruta.length) b.destino = this.celdaAlAzar();
                meta = b.destino;
            }
            b.ruta = this.camino(ac, ar, meta[0], meta[1]);
            if (b.estado === 'ronda' && !b.ruta.length) b.destino = this.celdaAlAzar();
        }

        let avanzo = 0;
        if (b.ruta.length) {
            const [tc, tr] = b.ruta[0];
            const [tx, tz] = toWorld(tc, tr);
            let vx = tx - b.pos.x, vz = tz - b.pos.y;
            const d = Math.hypot(vx, vz);
            if (d < 0.30) b.ruta.shift();
            else {
                vx /= d; vz /= d;
                /* PRIMERO ENCARA, DESPUES AVANZA. Antes se desplazaba derecho
                   hacia la próxima celda mientras el giro venía atrás, así que
                   en cada esquina cruzaba DE COSTADO — patinando de lado como
                   si lo arrastraran. Ahora sólo se mueve hacia donde mira, y
                   la velocidad se multiplica por lo alineado que esté: si
                   todavía no encaró, gira en el lugar. */
                const quiere = Math.atan2(-vx, -vz);
                const dif = ((quiere - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                const giroMax = (b.estado === 'caza' ? 3.6 : 2.4) * dt;
                b.yaw += Math.max(-giroMax, Math.min(giroMax, dif));
                const alineado = Math.max(0, Math.cos(dif));
                const paso = vel * dt * alineado;
                const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
                b.pos.x += fx * paso; b.pos.y += fz * paso;
                avanzo = vel * alineado;
            }
        }
        b.raiz.position.x = b.pos.x; b.raiz.position.z = b.pos.y;
        b.raiz.rotation.y = b.yaw;
        b.animar(dt, avanzo);

        // te agarro
        if (!this.terminado && mismoPiso && dist < 0.95) this.embestir(jug);

        if (this.susto > 0) this.susto = Math.max(0, this.susto - dt * 1.5);
        if (this.negro > 0) this.negro = Math.max(0, this.negro - dt * 0.9);

        if (this.salida.abierta) {
            this.luzSalida.intensity = 14;
            for (const h of this.hojasSalida) h.visible = false;   // se abren las dos
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
            if (!esPiso(c, r)) return false;
            if (i > 1) {
                const [pc, pr] = toCell(x0 + (x1 - x0) * (i - 1) / n, z0 + (z1 - z0) * (i - 1) / n);
                if ((pc !== c || pr !== r) && hayPared(pc, pr, c - pc, r - pr)) return false;
            }
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
