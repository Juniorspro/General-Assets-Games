/* Auto y personajes: carga de GLB, normalizacion, ruedas sueltas, vidrio
   transparente y rigs con mixer. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clamp, lerp, sat } from './core.js';

const loader = new GLTFLoader();
export function loadGLB(url) {
    return new Promise((res, rej) => loader.load(url, res, undefined, rej));
}

/* Deja el modelo con el tamano y la orientacion que espera la escena:
   apoyado en y=0, centrado en XZ, y con el eje `axis` midiendo `targetLen`. */
export function fitModel(root, targetLen, axis = 'z', yaw = 0) {
    root.updateWorldMatrix(true, true);
    if (yaw) root.rotation.y += yaw;
    root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3(); box.getSize(size);
    const cur = axis === 'x' ? size.x : axis === 'y' ? size.y : size.z;
    const s = targetLen / Math.max(cur, 1e-4);
    root.scale.multiplyScalar(s);
    root.updateWorldMatrix(true, true);
    const b2 = new THREE.Box3().setFromObject(root);
    const c = new THREE.Vector3(); b2.getCenter(c);
    root.position.x -= c.x;
    root.position.z -= c.z;
    root.position.y -= b2.min.y;
    return root;
}

/* Separa el parabrisas del resto de la carroceria mirando cada triangulo en
   coordenadas locales del auto: los que estan arriba, adelante y bastante
   horizontales son el vidrio. Asi se puede hacer transparente sin tocar el GLB. */
export function splitGlass(mesh) {
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position');
    const idx = geo.getIndex();
    if (!idx) return null;
    const a = idx.array;
    const keep = [], glass = [];
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();
    for (let t = 0; t < a.length; t += 3) {
        p0.fromBufferAttribute(pos, a[t]); p1.fromBufferAttribute(pos, a[t + 1]); p2.fromBufferAttribute(pos, a[t + 2]);
        const cy = (p0.y + p1.y + p2.y) / 3, cz = (p0.z + p1.z + p2.z) / 3;
        e1.subVectors(p1, p0); e2.subVectors(p2, p0); nn.crossVectors(e1, e2).normalize();
        const isGlass = cy > 1.30 && cz > 0.16 && cz < 1.06 && Math.abs(nn.y) > 0.66;
        (isGlass ? glass : keep).push(a[t], a[t + 1], a[t + 2]);
    }
    if (!glass.length) return null;
    const Arr = pos.count > 65535 ? Uint32Array : Uint16Array;
    geo.setIndex(new THREE.BufferAttribute(new Arr(keep), 1));
    const gg = geo.clone();
    gg.setIndex(new THREE.BufferAttribute(new Arr(glass), 1));
    const gm = new THREE.Mesh(gg, new THREE.MeshPhysicalMaterial({
        color: 0xaebdc6, roughness: 0.06, metalness: 0, transmission: 0.92,
        transparent: true, opacity: 0.36, thickness: 0.02, side: THREE.DoubleSide,
        depthWrite: false,
    }));
    gm.renderOrder = 3;
    mesh.parent.add(gm);
    gm.position.copy(mesh.position); gm.rotation.copy(mesh.rotation); gm.scale.copy(mesh.scale);
    return gm;
}

export class Car {
    /* group  -> mundo
         body -> carroceria normalizada (frente a +Z)
         hubs -> 4 grupos vacios, uno por rueda, que giran en X */
    constructor() {
        this.group = new THREE.Group();
        this.body = null; this.glass = null;
        this.hubs = []; this.steer = 0; this.wheelSpin = 0;
        this.LENGTH = 5.35; this.WHEEL_D = 0.74; this.CLEARANCE = 0.15;
    }
    async load(bodyUrl, wheelUrl) {
        const g = await loadGLB(bodyUrl);
        const body = g.scene;
        // el modelo generado mira a -Z: media vuelta y queda de frente
        fitModel(body, this.LENGTH, 'z', Math.PI);
        body.traverse(o => {
            if (!o.isMesh) return;
            o.castShadow = true; o.receiveShadow = true;
            if (o.material) { o.material.envMapIntensity = 0.9; o.material.roughness = Math.min(o.material.roughness ?? 0.5, 0.55) }
        });
        body.position.y += this.CLEARANCE;
        this.group.add(body);
        this.body = body;

        let biggest = null, bn = -1;
        body.traverse(o => { if (o.isMesh && o.geometry.getAttribute('position').count > bn) { bn = o.geometry.getAttribute('position').count; biggest = o } });
        if (biggest) this.glass = splitGlass(biggest);

        const w = await loadGLB(wheelUrl);
        const proto = w.scene;
        fitModel(proto, this.WHEEL_D, 'y');
        proto.position.y = 0;
        proto.traverse(o => { if (o.isMesh) { o.castShadow = true } });

        const halfW = 0.98, front = this.LENGTH * 0.295, r = this.WHEEL_D / 2;
        const spots = [[-halfW, front], [halfW, front], [-halfW, -front], [halfW, -front]];
        spots.forEach(([x, z], i) => {
            const hub = new THREE.Group();
            const m = proto.clone(true);
            m.position.y = -r;                 // el hub queda en el centro de la rueda
            if (x > 0) m.rotation.y = Math.PI;
            hub.add(m);
            hub.position.set(x, r, z);
            hub.userData.front = i < 2;
            this.group.add(hub);
            this.hubs.push(hub);
        });

        // faros
        this.lights = [];
        for (const sx of [-1, 1]) {
            const L = new THREE.SpotLight(0xfff2d0, 0, 70, 0.44, 0.55, 1.4);
            L.position.set(sx * 0.72, 0.72, this.LENGTH * 0.47);
            L.target.position.set(sx * 0.9, 0.1, this.LENGTH * 0.47 + 22);
            this.group.add(L, L.target);
            this.lights.push(L);
        }
        return this;
    }
    setHeadlights(on) { for (const L of this.lights || []) L.intensity = on ? 14 : 0 }
    /* speed en m/s; steer en radianes de las ruedas delanteras */
    update(dt, speed, steer) {
        this.wheelSpin += (speed * dt) / (this.WHEEL_D / 2);
        this.steer = lerp(this.steer, steer, sat(dt * 9));
        for (const h of this.hubs) {
            h.rotation.y = h.userData.front ? this.steer : 0;
            h.children[0].rotation.x = this.wheelSpin;
        }
    }
}

/* Rig cargado de Tripo. Los rigs vienen mirando a +X y toda la escena asume
   +Z, asi que se los gira -90 grados una sola vez al normalizar. */
export class Rig {
    constructor(gltf, { height = 1.75 } = {}) {
        this.root = new THREE.Group();
        this.model = gltf.scene;
        this.model.rotation.y = -Math.PI / 2;
        this.root.add(this.model);

        this.root.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(this.model);
        const size = new THREE.Vector3(); box.getSize(size);
        const s = height / Math.max(size.y, 1e-4);
        this.model.scale.multiplyScalar(s);
        this.model.updateWorldMatrix(true, true);
        const b2 = new THREE.Box3().setFromObject(this.model);
        const c = new THREE.Vector3(); b2.getCenter(c);
        this.model.position.x -= c.x; this.model.position.z -= c.z;
        this.model.position.y -= b2.min.y;

        this.model.traverse(o => {
            if (o.isMesh || o.isSkinnedMesh) { o.castShadow = true; o.frustumCulled = false }
        });
        this.bones = {};
        this.model.traverse(o => { if (o.isBone) this.bones[o.name] = o });

        this.mixer = new THREE.AnimationMixer(this.model);
        this.clips = {};
        for (const c of gltf.animations || []) this.clips[c.name] = c;
        this.current = null;
        this.height = height;
    }
    names() { return Object.keys(this.clips) }
    /* acepta 'walk' aunque el clip se llame 'preset:walk' */
    find(name) {
        if (this.clips[name]) return this.clips[name];
        const k = Object.keys(this.clips).find(n => n === 'preset:' + name || n.endsWith(':' + name) || n.toLowerCase().includes(name));
        return k ? this.clips[k] : null;
    }
    play(name, { fade = 0.25, loop = true, rate = 1 } = {}) {
        const clip = this.find(name);
        if (!clip) return null;
        const next = this.mixer.clipAction(clip);
        if (this.current && this.current.getClip() === clip) { this.current.timeScale = rate; return this.current }
        next.reset().setEffectiveWeight(1).setEffectiveTimeScale(rate);
        next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
        next.clampWhenFinished = !loop;
        if (this.current) this.current.crossFadeTo(next, fade, false), next.play();
        else next.play();
        this.current = next;
        return next;
    }
    update(dt) { this.mixer.update(dt) }
    set visible(v) { this.root.visible = v }
    get visible() { return this.root.visible }
}

export async function loadRig(url, opts) {
    const g = await loadGLB(url);
    return new Rig(g, opts);
}

/* Bate recto por geometria: los generados salen curvados. */
export function buildBat() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.85 });
    const g = new THREE.Group();
    const parts = [
        new THREE.CylinderGeometry(0.026, 0.032, 0.26, 8),
        new THREE.CylinderGeometry(0.045, 0.031, 0.48, 10),
        new THREE.CylinderGeometry(0.036, 0.030, 0.035, 8),
        new THREE.SphereGeometry(0.045, 10, 6),
    ];
    parts[0].translate(0, 0.13, 0);
    parts[1].translate(0, 0.50, 0);
    parts[2].translate(0, 0.01, 0);
    parts[3].translate(0, 0.74, 0);
    for (const p of parts) { const m = new THREE.Mesh(p, mat); m.castShadow = true; g.add(m) }
    return g;
}

/* Cuelga el bate del hueso de la mano compensando la escala del esqueleto. */
export function attachBat(rig) {
    const hand = rig.bones.R_Hand || rig.bones.RightHand || rig.bones.mixamorigRightHand;
    if (!hand) return null;
    const bat = buildBat();
    hand.add(bat);
    hand.updateWorldMatrix(true, false);
    const ws = bat.getWorldScale(new THREE.Vector3());
    bat.scale.setScalar(1 / Math.max(ws.x, 1e-4));
    bat.position.set(0, -0.02, 0.03);
    bat.rotation.set(0, 0, Math.PI);
    rig.bat = bat;
    return bat;
}
