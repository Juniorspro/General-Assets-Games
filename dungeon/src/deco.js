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
    for (let k = 0; k < 220; k++) {          // vetas del revoque, apenas
        g.strokeStyle = `rgba(160,152,138,${0.025 + Math.random() * 0.035})`;
        g.lineWidth = 1 + Math.random() * 2.4;
        g.beginPath();
        const y = Math.random() * n;
        g.moveTo(0, y);
        g.bezierCurveTo(n / 3, y + (Math.random() - .5) * 26, 2 * n / 3, y + (Math.random() - .5) * 26, n, y + (Math.random() - .5) * 14);
        g.stroke();
    }
    /* Las tachas. Son cabezas de perno: un disco oscuro con su sombra abajo y
       un brillo arriba. Sin el par sombra/brillo se leen como manchas. */
    for (let y = 18; y < n; y += 36) {
        for (let x = 20; x < n; x += 34) {
            const px = x + (Math.random() - .5) * 8, py = y + (Math.random() - .5) * 8;
            g.fillStyle = 'rgba(112,104,92,0.42)';
            g.beginPath(); g.arc(px + 1.2, py + 1.6, 4.2, 0, 7); g.fill();
            g.fillStyle = 'rgba(196,188,172,0.95)';
            g.beginPath(); g.arc(px, py, 3.6, 0, 7); g.fill();
            g.fillStyle = 'rgba(96,88,76,0.75)';
            g.beginPath(); g.arc(px, py, 3.6, 0.6, 2.6); g.fill();
            g.fillStyle = 'rgba(255,253,246,0.9)';
            g.beginPath(); g.arc(px - 1.1, py - 1.2, 1.5, 0, 7); g.fill();
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

/* La tabla clara de la boveda y de los techos. En las fotos el techo NO es
   marron: son tablas casi crema, muy claras, y la veta corre A LO LARGO del
   pasillo. Por eso las rayas van verticales en la textura: el mapeo de la
   boveda pone la U cruzando el arco y la V a lo largo. */
export const texTabla = () => lienzo(256, (g, n) => {
    g.fillStyle = '#cfc4a8'; g.fillRect(0, 0, n, n);
    const ancho = n / 6;
    for (let i = 0; i < 6; i++) {
        const v = (Math.random() - 0.5) * 22;
        g.fillStyle = `rgb(${208 + v},${196 + v},${170 + v})`;
        g.fillRect(i * ancho, 0, ancho - 1, n);
        for (let k = 0; k < 30; k++) {      // veta
            g.strokeStyle = `rgba(150,136,110,${0.05 + Math.random() * 0.09})`;
            g.lineWidth = 0.8 + Math.random() * 1.6;
            g.beginPath();
            const x = i * ancho + Math.random() * ancho;
            g.moveTo(x, 0);
            g.bezierCurveTo(x + (Math.random() - .5) * 7, n / 3, x + (Math.random() - .5) * 7, 2 * n / 3, x, n);
            g.stroke();
        }
        g.strokeStyle = 'rgba(120,108,86,0.5)'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(i * ancho, 0); g.lineTo(i * ancho, n); g.stroke();
    }
});

/* Baldosa grande de piedra: es el piso de la sala de las baldosas, que en la
   foto NO es alfombra sino losas grises brillosas con la junta marcada. */
export const texBaldosa = () => lienzo(256, (g, n) => {
    g.fillStyle = '#9a958a'; g.fillRect(0, 0, n, n);
    const lado = n / 2;
    for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
            const v = 12 + Math.random() * 26;
            g.fillStyle = `rgb(${150 + v},${146 + v},${136 + v})`;
            g.fillRect(x * lado + 2, y * lado + 2, lado - 4, lado - 4);
            // veta de la piedra
            for (let k = 0; k < 26; k++) {
                g.strokeStyle = `rgba(120,116,108,${0.05 + Math.random() * 0.08})`;
                g.lineWidth = 1 + Math.random() * 2;
                g.beginPath();
                const yy = y * lado + Math.random() * lado;
                g.moveTo(x * lado, yy);
                g.lineTo(x * lado + lado, yy + (Math.random() - .5) * 18);
                g.stroke();
            }
        }
    }
    g.strokeStyle = 'rgba(70,68,64,0.55)'; g.lineWidth = 3;
    g.strokeRect(0, 0, lado, lado); g.strokeRect(lado, 0, lado, lado);
    g.strokeRect(0, lado, lado, lado); g.strokeRect(lado, lado, lado, lado);
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

/* El tablon de contrachapado apoyado contra la pared. Sale tal cual en la foto
   del desvan: una placa clara con los nudos marcados, ligeramente inclinada. */
export function tablon() {
    const g = new THREE.Group();
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const c = cv.getContext('2d');
    c.fillStyle = '#d9cfb4'; c.fillRect(0, 0, 128, 128);
    for (let k = 0; k < 90; k++) {
        c.strokeStyle = `rgba(160,146,116,${0.06 + Math.random() * 0.1})`;
        c.lineWidth = 1 + Math.random() * 2;
        c.beginPath();
        const y = Math.random() * 128;
        c.moveTo(0, y);
        c.bezierCurveTo(42, y + (Math.random() - .5) * 16, 86, y + (Math.random() - .5) * 16, 128, y + (Math.random() - .5) * 10);
        c.stroke();
    }
    for (let k = 0; k < 16; k++) {   // los nudos
        c.fillStyle = 'rgba(70,58,40,0.75)';
        c.beginPath(); c.arc(Math.random() * 128, Math.random() * 128, 1.4 + Math.random() * 1.6, 0, 7); c.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    const placa = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.25, 0.055),
        new THREE.MeshStandardMaterial({ map: t, roughness: .95 }));
    placa.position.set(0, 0.66, 0.16);
    placa.rotation.x = -0.19;          // apoyado, no clavado
    placa.castShadow = placa.receiveShadow = true;
    g.add(placa);
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
