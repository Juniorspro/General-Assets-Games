/* El arranque: la caja de madera, el agujero y la caída.
   ---------------------------------------------------------------------------
   En el juego original no aparecés en la casa: aparecés arriba, en un cajón de
   madera oscuro, gateás hacia adelante, hay un hueco en el piso y te dejás
   caer. Recién ahí empieza la casa.

   Acá es lo mismo, con la caída hecha cinemática: el cajón flota a dieciséis
   metros, el hueco está al fondo, y al pisarlo te soltás. Mientras caés pasan
   nubes —carteles con un degradado dibujado en un canvas, no una textura— y el
   cuerpo hace el clip de caída de Roblox que ya estaba horneado.

   La caída es de verdad: gravedad, no una interpolación. Con interpolación la
   caída dura lo mismo desde cualquier altura y se lee como un ascensor. */
import * as THREE from 'three';
import { CELL, toWorld, sectorPorId, centroSector } from './map.js';
import * as S from './sonido.js';

export const ALTO_CAJA = 16.5;     // a qué altura flota el cajón
const LADO = 3;                    // celdas del cajón, cuadrado
const ALTO_INT = 2.35;             // techo del cajón: bajo, es un cajón
const G = 19.0;                    // gravedad de la caída, en m/s²

function texMadera() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 6; i++) {
        const v = (Math.random() - .5) * 26;
        g.fillStyle = `rgb(${64 + v},${46 + v},${28 + v})`;
        g.fillRect(0, i * 21.3, 128, 20);
        for (let k = 0; k < 22; k++) {
            g.strokeStyle = `rgba(30,20,10,${0.08 + Math.random() * 0.14})`;
            g.lineWidth = 0.8 + Math.random();
            g.beginPath();
            const y = i * 21.3 + Math.random() * 20;
            g.moveTo(0, y); g.bezierCurveTo(42, y + 2, 86, y - 2, 128, y);
            g.stroke();
        }
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

/* Una nube: un degradado radial suave sobre un cartel. Difuminada a propósito
   —pasan a veinte metros por segundo y un borde nítido delata el cartel. */
function texNube() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    for (let k = 0; k < 14; k++) {
        const x = 40 + Math.random() * 176, y = 70 + Math.random() * 116;
        const r = 34 + Math.random() * 62;
        const rad = g.createRadialGradient(x, y, 0, x, y, r);
        rad.addColorStop(0, 'rgba(255,252,246,0.50)');
        rad.addColorStop(0.55, 'rgba(238,232,224,0.22)');
        rad.addColorStop(1, 'rgba(220,214,206,0)');
        g.fillStyle = rad;
        g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

export class Intro {
    constructor(escena) {
        this.escena = escena;
        this.estado = 'caja';        // caja → cayendo → jugando
        this.vy = 0;
        this.t = 0;

        const sec = sectorPorId('vestibulo');
        const [cc, cr] = sec ? centroSector(sec) : [5, 5];
        const [x, z] = toWorld(cc, cr);
        this.centro = [x, z];
        const lado = LADO * CELL;
        this.medio = lado / 2;
        // el hueco: la celda del fondo del cajón, hacia -Z
        this.hueco = [x, z - lado / 2 + CELL / 2];
        this.radioHueco = CELL * 0.42;

        const mad = new THREE.MeshStandardMaterial({ map: texMadera(), roughness: 0.95 });
        const g = new THREE.Group();
        g.position.set(x, ALTO_CAJA, z);

        const piso = new THREE.Mesh(new THREE.PlaneGeometry(lado, lado), mad);
        piso.rotation.x = -Math.PI / 2;
        piso.receiveShadow = true;
        g.add(piso);
        this.piso = piso;
        const techo = new THREE.Mesh(new THREE.PlaneGeometry(lado, lado), mad);
        techo.rotation.x = Math.PI / 2;
        techo.position.y = ALTO_INT;
        g.add(techo);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const p = new THREE.Mesh(new THREE.PlaneGeometry(lado, ALTO_INT), mad);
            p.position.set(dx * -lado / 2, ALTO_INT / 2, dz * -lado / 2);
            p.rotation.y = dx ? dx * Math.PI / 2 : (dz > 0 ? 0 : Math.PI);
            p.receiveShadow = true;
            g.add(p);
        }
        /* El hueco se tapa con un recorte negro sobre el piso: agujerear la
           malla costaría una geometría a medida para que se vea un cuadrado
           oscuro, y esto es lo mismo a un metro de distancia. */
        const boca = new THREE.Mesh(
            new THREE.PlaneGeometry(CELL * 0.86, CELL * 0.86),
            new THREE.MeshBasicMaterial({ color: 0x000000 }));
        boca.rotation.x = -Math.PI / 2;
        boca.position.set(0, 0.012, -lado / 2 + CELL / 2);
        g.add(boca);
        const L = new THREE.PointLight(0xffcf96, 7, 9, 1.6);
        L.position.set(0, ALTO_INT - 0.3, lado / 4);
        g.add(L);
        escena.add(g);
        this.caja = g;

        /* Las nubes: dos anillos de carteles entre el cajón y la casa. Miran
           siempre a la cámara, así que con veinte alcanza. */
        const nube = new THREE.SpriteMaterial({
            map: texNube(), transparent: true, opacity: 0.9, depthWrite: false,
        });
        this.nubes = new THREE.Group();
        for (let i = 0; i < 26; i++) {
            const sp = new THREE.Sprite(nube);
            const a = Math.random() * Math.PI * 2, rad = 3.5 + Math.random() * 9;
            sp.position.set(x + Math.cos(a) * rad, 1.5 + Math.random() * (ALTO_CAJA - 2),
                            z + Math.sin(a) * rad);
            const k = 5 + Math.random() * 9;
            sp.scale.set(k, k * 0.62, 1);
            this.nubes.add(sp);
        }
        this.nubes.visible = false;
        escena.add(this.nubes);
    }

    /* Dónde está el piso del jugador según en qué parte del arranque va. */
    alturaPiso() { return this.estado === 'caja' ? ALTO_CAJA : 0 }

    /* Encierra al jugador dentro del cajón, y devuelve true si pisó el hueco. */
    encerrar(p) {
        if (this.estado !== 'caja') return false;
        const [cx, cz] = this.centro, m = this.medio - 0.35;
        p.x = Math.max(cx - m, Math.min(cx + m, p.x));
        p.z = Math.max(cz - m, Math.min(cz + m, p.z));
        const d = Math.hypot(p.x - this.hueco[0], p.z - this.hueco[1]);
        return d < this.radioHueco;
    }

    soltar() {
        if (this.estado !== 'caja') return;
        this.estado = 'cayendo';
        this.vy = -1.2;
        this.t = 0;
        this.nubes.visible = true;
        S.viento(1);
    }

    /* Devuelve la altura del jugador mientras cae, o null si ya aterrizó. */
    caer(dt) {
        this.t += dt;
        this.vy -= G * dt;
        return this.vy;
    }

    aterrizar() {
        this.estado = 'jugando';
        this.nubes.visible = false;
        this.caja.visible = false;
        S.viento(0);
        S.golpe();
    }
}
