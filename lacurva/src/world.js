/* La carretera: asfalto, banquinas, bosque instanciado con viento, pasto y cielo. */
import * as THREE from 'three';
import { Rng, sat, noise1 } from './core.js';

const texCache = new Map();
export function tex(url, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
    const key = url.slice(0, 64) + repeat.join(',') + srgb;
    if (texCache.has(key)) return texCache.get(key);
    const t = new THREE.TextureLoader().load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
    return t;
}

/* Un uniform de tiempo compartido: todo lo que se mueve con viento lo lee. */
export const wind = { value: 0 };

/* Empuja los vertices en el vertex shader. mode 0 = ramas (rigidas, poco),
   mode 1 = hojas (flamean), mode 2 = pasto (se dobla desde la base). */
export function windify(mat, strength, mode) {
    mat.onBeforeCompile = shader => {
        shader.uniforms.uWind = wind;
        shader.uniforms.uAmp = { value: strength };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                uniform float uWind; uniform float uAmp;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                {
                  vec3 wp = transformed;
                  #ifdef USE_INSTANCING
                    wp = (instanceMatrix * vec4(transformed, 1.0)).xyz;
                  #endif
                  float ph = wp.x * 0.14 + wp.z * 0.11;
                  float gust = 0.65 + 0.35 * sin(uWind * 0.23 + ph * 0.3);
                  float sway = sin(uWind * 1.35 + ph) + 0.5 * sin(uWind * 2.7 + ph * 1.9);
                  float h = ${mode === 2 ? 'max(transformed.y, 0.0)' : 'max(wp.y, 0.0)'};
                  float w = uAmp * gust * ${mode === 2 ? 'h * h' : mode === 1 ? '(0.35 + h * 0.09)' : 'h * 0.05'};
                  transformed.x += sway * w;
                  transformed.z += cos(uWind * 1.1 + ph * 1.3) * w * 0.6;
                  ${mode === 1 ? 'transformed.y += sin(uWind * 3.1 + ph * 2.2) * w * 0.35;' : ''}
                }`);
    };
    mat.customProgramCacheKey = () => 'wind' + mode + strength;
    return mat;
}

/* Dos planos cruzados: la forma mas barata que todavia lee como volumen. */
function crossCard(w, h) {
    const a = new THREE.PlaneGeometry(w, h);
    const b = new THREE.PlaneGeometry(w, h);
    b.rotateY(Math.PI / 2);
    a.translate(0, h / 2, 0); b.translate(0, h / 2, 0);
    return mergeTwo(a, b);
}
function mergeTwo(a, b) {
    const g = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
        const A = a.getAttribute(name), B = b.getAttribute(name);
        const arr = new Float32Array(A.array.length + B.array.length);
        arr.set(A.array, 0); arr.set(B.array, A.array.length);
        g.setAttribute(name, new THREE.BufferAttribute(arr, A.itemSize));
    }
    const ai = a.getIndex().array, bi = b.getIndex().array, off = a.getAttribute('position').count;
    const idx = new Uint16Array(ai.length + bi.length);
    idx.set(ai, 0);
    for (let i = 0; i < bi.length; i++) idx[ai.length + i] = bi[i] + off;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
}

export class Road {
    constructor(scene, assets) {
        this.group = new THREE.Group();
        scene.add(this.group);
        this.assets = assets;
        this.length = 900;      // largo total de asfalto
        this.build();
    }
    build() {
        const G = this.group, A = this.assets;

        // asfalto
        const road = new THREE.Mesh(
            new THREE.PlaneGeometry(8.4, this.length, 1, 90),
            new THREE.MeshStandardMaterial({ color: 0x33353a, roughness: 0.93 }));
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.02;
        road.receiveShadow = true;
        G.add(road);

        // linea central discontinua
        const dash = new THREE.PlaneGeometry(0.17, 2.6);
        const dashMat = new THREE.MeshStandardMaterial({ color: 0xd8cfa8, roughness: 0.7 });
        const n = Math.floor(this.length / 7);
        const dashes = new THREE.InstancedMesh(dash, dashMat, n);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
        const one = new THREE.Vector3(1, 1, 1);
        for (let i = 0; i < n; i++)
            m.compose(new THREE.Vector3(0, 0.035, -this.length / 2 + i * 7), q, one), dashes.setMatrixAt(i, m);
        G.add(dashes);

        // banquina de tierra y el suelo general
        const shoulder = new THREE.Mesh(
            new THREE.PlaneGeometry(11.4, this.length),
            new THREE.MeshStandardMaterial({ color: 0x64643f, roughness: 1 }));
        shoulder.rotation.x = -Math.PI / 2;
        shoulder.position.y = 0.005;
        shoulder.receiveShadow = true;
        G.add(shoulder);

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(1400, 1400),
            new THREE.MeshStandardMaterial({ color: 0x5c6b3c, roughness: 1 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.02;
        ground.receiveShadow = true;
        G.add(ground);

        this.buildForest(A);
        this.buildGrass(A);
    }

    /* Bosque: cada arbol = tronco + ramas + tarjetas de hoja, todo instanciado
       en 3 draw calls. Deja un corredor libre a los costados del asfalto. */
    buildForest(A) {
        const rng = new Rng(20260901);
        const COUNT = 420, CORRIDOR = 7.2;
        const spots = [];
        while (spots.length < COUNT) {
            const x = rng.range(-150, 150), z = rng.range(-this.length / 2, this.length / 2);
            if (Math.abs(x) < CORRIDOR) continue;
            spots.push({ x, z, s: rng.range(0.75, 1.55), r: rng.range(0, Math.PI * 2) });
        }

        const barkMat = new THREE.MeshStandardMaterial({
            map: A.bark ? tex(A.bark, { repeat: [1, 3] }) : null,
            color: A.bark ? 0xffffff : 0x584634, roughness: 0.95,
        });
        const trunkGeo = new THREE.CylinderGeometry(0.17, 0.34, 7.4, 6, 1);
        trunkGeo.translate(0, 3.7, 0);
        const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, COUNT);
        trunks.castShadow = trunks.receiveShadow = true;

        const branchGeo = new THREE.CylinderGeometry(0.045, 0.1, 2.1, 4, 1);
        branchGeo.translate(0, 1.05, 0);
        const BR = 6;
        const branches = new THREE.InstancedMesh(branchGeo, windify(barkMat.clone(), 0.05, 0), COUNT * BR);
        branches.castShadow = true;

        const leafMat = new THREE.MeshStandardMaterial({
            map: A.leaf ? tex(A.leaf) : null,
            color: A.leaf ? 0xffffff : 0x3c5a2a,
            alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.82,
        });
        const LC = 14;
        const leaves = new THREE.InstancedMesh(crossCard(1.85, 1.85), windify(leafMat, 0.3, 1), COUNT * LC);
        leaves.castShadow = false;

        const m = new THREE.Matrix4(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), qt = new THREE.Quaternion(), eu = new THREE.Euler();
        let bi = 0, li = 0;
        spots.forEach((s, i) => {
            eu.set(0, s.r, 0); qt.setFromEuler(eu);
            pos.set(s.x, 0, s.z); sc.set(s.s, s.s, s.s);
            m.compose(pos, qt, sc); trunks.setMatrixAt(i, m);

            for (let b = 0; b < BR; b++) {
                const ang = s.r + b * (Math.PI * 2 / BR) + rng.range(-0.3, 0.3);
                const hy = (3.1 + b * 0.62) * s.s;
                eu.set(rng.range(0.5, 1.05), ang, 0); qt.setFromEuler(eu);
                pos.set(s.x, hy, s.z); sc.setScalar(s.s * rng.range(0.8, 1.2));
                m.compose(pos, qt, sc); branches.setMatrixAt(bi++, m);
            }
            for (let l = 0; l < LC; l++) {
                const ang = rng.range(0, Math.PI * 2), rad = rng.range(0.9, 3.6) * s.s;
                eu.set(0, ang, rng.range(-0.5, 0.5)); qt.setFromEuler(eu);
                pos.set(s.x + Math.cos(ang) * rad, (3.4 + rng.range(0, 4.2)) * s.s, s.z + Math.sin(ang) * rad);
                sc.setScalar(s.s * rng.range(0.9, 1.7));
                m.compose(pos, qt, sc); leaves.setMatrixAt(li++, m);
            }
        });
        this.group.add(trunks, branches, leaves);
        this.trees = spots;

        // el arbol del choque: uno solo, grande, cerca de la ruta y a la vista
        const hero = new THREE.Group();
        const ht = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.78, 9.5, 10, 1), barkMat);
        ht.position.y = 4.75; ht.castShadow = ht.receiveShadow = true;
        hero.add(ht);
        for (let b = 0; b < 7; b++) {
            const br = new THREE.Mesh(branchGeo, barkMat);
            br.position.y = 5.2 + b * 0.6;
            br.rotation.set(0.8, b * 0.9, 0);
            br.scale.setScalar(1.7);
            br.castShadow = true;
            hero.add(br);
        }
        const canopy = new THREE.Mesh(crossCard(9, 8), leafMat);
        canopy.position.y = 6.4;
        hero.add(canopy);
        const canopy2 = canopy.clone(); canopy2.rotation.y = Math.PI / 4; canopy2.scale.setScalar(0.8); canopy2.position.y = 7.6;
        hero.add(canopy2);
        hero.position.set(-11.5, 0, 0);
        this.group.add(hero);
        this.heroTree = hero;
    }

    buildGrass(A) {
        const rng = new Rng(777);
        const N = 20000;
        const mat = new THREE.MeshStandardMaterial({
            map: A.grassField ? tex(A.grassField) : null,
            color: A.grass ? 0xffffff : 0x5c6b34,
            alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9,
        });
        const mesh = new THREE.InstancedMesh(crossCard(0.46, 0.40), windify(mat, 0.26, 2), N);
        const m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let i = 0; i < N; i++) {
            // se concentra cerca del asfalto, que es lo unico que se llega a ver
            let x = rng.range(-48, 48);
            if (Math.abs(x) < 4.6) x += Math.sign(x || 1) * 4.6;
            e.set(0, rng.range(0, Math.PI), 0); q.setFromEuler(e);
            p.set(x, 0, rng.range(-this.length / 2, this.length / 2));
            s.set(rng.range(0.8, 1.5), rng.range(0.7, 1.5), 1);
            m.compose(p, q, s); mesh.setMatrixAt(i, m);
        }
        this.group.add(mesh);
        this.grass = mesh;
    }


}

/* Polvo y tierra levantada: se emiten en el derrape y en el impacto. */
export class Dust {
    constructor(scene, max = 260) {
        this.max = max;
        const geo = new THREE.PlaneGeometry(1, 1);
        this.mat = new THREE.MeshBasicMaterial({
            color: 0xa2957c, transparent: true, opacity: 0.42, depthWrite: false,
        });
        this.mesh = new THREE.InstancedMesh(geo, this.mat, max);
        this.mesh.frustumCulled = false;
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(this.mesh);
        this.p = Array.from({ length: max }, () => ({ life: 0, ttl: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1, r: 0 }));
        this.head = 0;
        this._m = new THREE.Matrix4(); this._v = new THREE.Vector3();
        this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
        this.hideAll();
    }
    hideAll() {
        this._s.setScalar(0);
        for (let i = 0; i < this.max; i++) {
            this._m.compose(this._v.set(0, -999, 0), this._q, this._s);
            this.mesh.setMatrixAt(i, this._m);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    emit(x, y, z, n, power = 1) {
        for (let i = 0; i < n; i++) {
            const p = this.p[this.head = (this.head + 1) % this.max];
            p.life = 0; p.ttl = 0.7 + Math.random() * 1.3;
            p.x = x + (Math.random() - 0.5) * 1.2;
            p.y = y + Math.random() * 0.4;
            p.z = z + (Math.random() - 0.5) * 1.2;
            p.vx = (Math.random() - 0.5) * 3.4 * power;
            p.vy = (0.6 + Math.random() * 1.9) * power;
            p.vz = (Math.random() - 0.5) * 3.4 * power;
            p.s = (0.35 + Math.random() * 0.75) * power;
            p.r = Math.random() * Math.PI;
        }
    }
    update(dt, camera) {
        for (let i = 0; i < this.max; i++) {
            const p = this.p[i];
            if (p.life >= p.ttl) continue;
            p.life += dt;
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
            p.vy -= 1.4 * dt; p.vx *= 0.965; p.vz *= 0.965;
            const k = sat(p.life / p.ttl);
            const s = p.s * (0.28 + k * 1.15);
            this._v.set(p.x, Math.max(p.y, 0.03), p.z);
            this._q.copy(camera.quaternion);
            this._s.set(s, s, s);
            this._m.compose(this._v, this._q, this._s);
            this.mesh.setMatrixAt(i, this._m);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
        this.mat.opacity = 0.42;
    }
}
