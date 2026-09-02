/* La decoracion que hace que la casa sea ESTA casa y no un pasillo cualquiera.

   Todo lo de aca sale de mirar las capturas del juego original una por una:
   la alfombra roja tejida, el zocalo naranja, el yeso blanco con tachas de la
   sala de las baldosas, las frases pintadas en la pared, los cajones apilados
   y el crucifijo. Ninguna de estas texturas es un archivo: se dibujan en un
   canvas al arrancar. Un .webp mas por cada una serian 300 KB de descarga
   para cosas que son ruido y rayas. */
import * as THREE from 'three';

function lienzo(n, dibujar) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = n;
    dibujar(cv.getContext('2d'), n);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

/* Alfombra: en las fotos el piso NO es madera, es una alfombra roja oscura
   con trama visible —rayas finas horizontales y un grano vertical— y algo de
   mancha. La trama es lo que la delata como alfombra a un metro de la cara. */
export const texAlfombra = () => lienzo(256, (g, n) => {
    g.fillStyle = '#552322'; g.fillRect(0, 0, n, n);
    const d = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
        const x = i % n, y = (i / n) | 0;
        // trama: hilo horizontal cada 2 px y urdimbre vertical cada 3
        const hilo = (y % 2 ? 10 : -8) + (x % 3 === 0 ? -7 : 3);
        const ruido = (Math.random() - 0.5) * 22;
        const v = hilo + ruido;
        d.data[i * 4] = 85 + v; d.data[i * 4 + 1] = 35 + v * .6; d.data[i * 4 + 2] = 34 + v * .5;
        d.data[i * 4 + 3] = 255;
    }
    g.putImageData(d, 0, 0);
    // manchones grandes: sin esto la alfombra se lee como tela lisa de lejos
    for (let k = 0; k < 26; k++) {
        const x = Math.random() * n, y = Math.random() * n, r = 16 + Math.random() * 40;
        const rad = g.createRadialGradient(x, y, 0, x, y, r);
        rad.addColorStop(0, 'rgba(30,10,10,0.16)'); rad.addColorStop(1, 'rgba(30,10,10,0)');
        g.fillStyle = rad; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
});

/* Yeso blanco con tachas: es la pared de la sala de las baldosas de colores.
   Las tachas son las cabezas de perno redondas repartidas en una grilla floja.
   Sin ellas es una pared blanca y con ellas es un galpon. */
export const texYeso = () => lienzo(256, (g, n) => {
    g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, n, n);
    for (let k = 0; k < 300; k++) {          // vetas del revoque
        g.strokeStyle = `rgba(150,142,128,${0.05 + Math.random() * 0.07})`;
        g.lineWidth = 1 + Math.random() * 3;
        g.beginPath();
        const y = Math.random() * n;
        g.moveTo(0, y);
        g.bezierCurveTo(n / 3, y + (Math.random() - .5) * 26, 2 * n / 3, y + (Math.random() - .5) * 26, n, y + (Math.random() - .5) * 14);
        g.stroke();
    }
    for (let y = 20; y < n; y += 42) {
        for (let x = 24; x < n; x += 38) {
            const px = x + (Math.random() - .5) * 10, py = y + (Math.random() - .5) * 10;
            g.fillStyle = 'rgba(90,84,74,0.55)';
            g.beginPath(); g.arc(px, py, 3.1, 0, 7); g.fill();
            g.fillStyle = 'rgba(255,252,244,0.7)';
            g.beginPath(); g.arc(px - .9, py - .9, 1.5, 0, 7); g.fill();
        }
    }
});

/* Hormigon del sotano: gris parejo, poroso, con manchas de humedad. */
export const texHormigon = () => lienzo(256, (g, n) => {
    g.fillStyle = '#8b8880'; g.fillRect(0, 0, n, n);
    const d = g.getImageData(0, 0, n, n);
    for (let i = 0; i < n * n; i++) {
        const v = (Math.random() - 0.5) * 30;
        d.data[i * 4] += v; d.data[i * 4 + 1] += v; d.data[i * 4 + 2] += v;
    }
    g.putImageData(d, 0, 0);
    for (let k = 0; k < 30; k++) {
        const x = Math.random() * n, y = Math.random() * n, r = 10 + Math.random() * 46;
        const rad = g.createRadialGradient(x, y, 0, x, y, r);
        rad.addColorStop(0, 'rgba(40,44,40,0.20)'); rad.addColorStop(1, 'rgba(40,44,40,0)');
        g.fillStyle = rad; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let k = 0; k < 900; k++) {          // poros
        g.fillStyle = `rgba(60,58,54,${0.1 + Math.random() * 0.3})`;
        g.fillRect(Math.random() * n, Math.random() * n, 1, 1);
    }
});

/* Las frases pintadas en la pared. En el juego original son mayusculas negras
   condensadas, a mano, a la altura de la cara, y son la unica forma en que la
   casa te explica algo. Las de aca son las mismas que se leen en las fotos. */
export const FRASES = [
    'KEEP A LOW PROFILE\nFOR HE SHALL COME',
    'HE KEEPS THE\nKEYCARD ON HIM',
    'THE CUBES\nOPEN THE WAY',
    'SEARCH EVERY\nCABINET',
    'DO NOT RUN\nHE HEARS',
    'THE HOUSE\nIS HIS BODY',
];

export function texFrase(txt) {
    const lineas = txt.split('\n');
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 256;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, 512, 256);
    g.fillStyle = '#100d0b';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const alto = 256 / (lineas.length + 0.7);
    lineas.forEach((l, i) => {
        let px = 74;
        g.font = `900 ${px}px Impact, "Arial Narrow", system-ui, sans-serif`;
        while (g.measureText(l).width > 470 && px > 20) {
            px -= 3; g.font = `900 ${px}px Impact, "Arial Narrow", system-ui, sans-serif`;
        }
        g.fillText(l, 256, alto * (i + 0.85));
    });
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

/* Cajones de madera apilados: en el deposito y en los pasillos del original
   hay pilas de cajones de listones. Se arman con la caja maciza mas ocho
   listones por cara: el enrejado es lo que se ve, y sale sin textura. */
const MAD_CLARA = new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: .92 });
const MAD_OSCURA = new THREE.MeshStandardMaterial({ color: 0x6d5333, roughness: .95 });

export function cajon(lado = 0.9) {
    const g = new THREE.Group();
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(lado, lado, lado), MAD_OSCURA);
    cuerpo.castShadow = cuerpo.receiveShadow = true;
    g.add(cuerpo);
    const e = 0.055, s = lado / 2 + 0.014, borde = lado / 2 - e;
    const poner = (w, h, d, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAD_CLARA);
        m.position.set(x, y, z);
        m.castShadow = true;
        g.add(m);
    };
    for (const sg of [1, -1]) {
        // caras +X / -X: tres listones cruzados y dos parantes
        for (const y of [-borde, 0, borde]) poner(e, e, lado, sg * s, y, 0);
        for (const z of [-borde, borde]) poner(e, lado, e, sg * s, 0, z);
        // caras +Z / -Z
        for (const y of [-borde, 0, borde]) poner(lado, e, e, 0, y, sg * s);
        for (const x of [-borde, borde]) poner(e, lado, e, x, 0, sg * s);
    }
    return g;
}

/* Una pila: dos o tres cajones, cada uno girado un poco. Apiladas prolijas
   parecen inventario de deposito; giradas parecen abandonadas, que es lo que
   son en el juego. */
export function pilaDeCajones(rng) {
    const g = new THREE.Group();
    const n = 2 + Math.floor(rng.next() * 2);
    const lado = 0.9;
    for (let i = 0; i < n; i++) {
        const c = cajon(lado);
        c.position.set((rng.next() - .5) * .16, lado / 2 + i * (lado + 0.01), (rng.next() - .5) * .16);
        c.rotation.y = (rng.next() - .5) * 0.5;
        g.add(c);
    }
    return g;
}

/* El crucifijo de la capilla: en la foto es dorado, chico, y va alto. */
export function crucifijo() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0xb08c3a, roughness: .45, metalness: .55 });
    const v = new THREE.Mesh(new THREE.BoxGeometry(.075, .52, .05), m);
    const h = new THREE.Mesh(new THREE.BoxGeometry(.32, .07, .05), m);
    h.position.y = .1;
    v.castShadow = h.castShadow = true;
    g.add(v, h);
    return g;
}
