/* Nucleo compartido: render, loop, camara, look, fade y utilidades. */
import * as THREE from 'three';

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const sat = t => clamp(t, 0, 1);
/* suavizados: ease in-out, ease out y un golpe seco que decae */
export const smooth = t => { t = sat(t); return t * t * (3 - 2 * t) };
export const easeOut = t => 1 - Math.pow(1 - sat(t), 3);
export const easeIn = t => Math.pow(sat(t), 3);
export const decay = (t, k) => Math.exp(-sat(t) * (k || 6));

/* ruido 1D barato y determinista, para temblores y viento */
export function noise1(x) {
    let i = Math.floor(x), f = x - i;
    const h = n => { n = (n << 13) ^ n; return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824 };
    return lerp(h(i), h(i + 1), f * f * (3 - 2 * f));
}

export class Rng {
    constructor(seed) { this.s = seed >>> 0 || 1 }
    next() { this.s ^= this.s << 13; this.s ^= this.s >>> 17; this.s ^= this.s << 5; return (this.s >>> 0) / 4294967296 }
    range(a, b) { return a + this.next() * (b - a) }
    int(a, b) { return Math.floor(this.range(a, b + 1)) }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)] }
}

export class Engine {
    constructor(canvas) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x8fa6bd, 30, 220);
        this.camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.08, 900);

        this.sun = new THREE.DirectionalLight(0xffe9c8, 2.6);
        this.sun.position.set(-40, 55, 30);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048);
        const c = this.sun.shadow.camera;
        c.near = 1; c.far = 200; c.left = -60; c.right = 60; c.top = 60; c.bottom = -60;
        this.sun.shadow.bias = -0.0007;
        this.scene.add(this.sun, this.sun.target);

        this.hemi = new THREE.HemisphereLight(0xbcd6f2, 0x4a4436, 1.1);
        this.scene.add(this.hemi);
        this.amb = new THREE.AmbientLight(0xffffff, 0.15);
        this.scene.add(this.amb);

        this.clock = new THREE.Clock();
        this.shakeAmt = 0; this.shakeT = 0;
        this.pmrem = new THREE.PMREMGenerator(this.renderer);
        this.pmrem.compileEquirectangularShader();
        this.envs = {};
        this.resize();
        addEventListener('resize', () => this.resize());
    }
    resize() {
        const w = innerWidth, h = innerHeight;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }
    /* paletas: la ruta de tarde y el interior nocturno de la casa */
    /* Convierte el panorama del cielo en fondo y en luz de entorno. Sin
       environment map los materiales metalicos (la chapa del auto) salen
       negros porque no tienen nada que reflejar. */
    setSky(texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        this.skyTex = texture;
        this.envs.sky = this.pmrem.fromEquirectangular(texture).texture;
    }
    look(name) {
        const s = this.scene, f = s.fog;
        if (name === 'road-day') {
            this.sun.intensity = 3.4; this.sun.color.set(0xffdcae);
            this.sun.position.set(-90, 46, -30);
            this.hemi.intensity = 0.9; this.hemi.color.set(0xbcd6f2); this.hemi.groundColor.set(0x6a6046);
            this.amb.intensity = 0.1;
            // la niebla solo tapa el borde del mapa, no lava el bosque entero
            f.color.set(0xe4c9a6); f.near = 190; f.far = 620;
            s.background = this.skyTex || new THREE.Color(0xb9cbdd);
            s.environment = this.envs.sky || null;
            s.environmentIntensity = 1;
            this.renderer.toneMappingExposure = 1.15;
        } else if (name === 'house') {
            this.sun.intensity = 0.16; this.sun.color.set(0x7d94c4);
            this.sun.position.set(18, 30, -14);
            this.hemi.intensity = 0.16; this.hemi.color.set(0x36435c); this.hemi.groundColor.set(0x14100c);
            this.amb.intensity = 0.05;
            f.color.set(0x05060a); f.near = 1.2; f.far = 22;
            s.background = new THREE.Color(0x05060a);
            s.environment = this.envs.sky || null;
            s.environmentIntensity = 0.045;   // apenas, para que la chapa no muera
            this.renderer.toneMappingExposure = 1.15;
        }
    }
    shake(amount, seconds) { this.shakeAmt = Math.max(this.shakeAmt, amount); this.shakeT = Math.max(this.shakeT, seconds || 0.4); this.shakeDur = this.shakeT }
    applyShake(dt, t) {
        if (this.shakeT <= 0) return;
        this.shakeT -= dt;
        const k = this.shakeAmt * sat(this.shakeT / (this.shakeDur || 0.4));
        this.camera.position.x += noise1(t * 47) * k;
        this.camera.position.y += noise1(t * 53 + 91) * k;
        this.camera.position.z += noise1(t * 41 + 17) * k;
        this.camera.rotateZ(noise1(t * 37 + 5) * k * 0.35);
        if (this.shakeT <= 0) this.shakeAmt = 0;
    }
    render() { this.renderer.render(this.scene, this.camera) }
}

/* Capa 2D del HUD: fade, subtitulos, carteles y flash del golpe. */
export class Hud {
    constructor() {
        this.el = {
            fade: document.getElementById('fade'),
            flash: document.getElementById('flash'),
            sub: document.getElementById('sub'),
            card: document.getElementById('card'),
            cardT: document.getElementById('card-t'),
            cardS: document.getElementById('card-s'),
            hud: document.getElementById('hud'),
            obj: document.getElementById('obj'),
            stamFill: document.getElementById('stam-fill'),
            keyPip: document.getElementById('key-pip'),
            prompt: document.getElementById('prompt'),
            lids: document.getElementById('lids'),
            lidTop: document.getElementById('lid-top'),
            lidBot: document.getElementById('lid-bot'),
            vig: document.getElementById('vignette'),
            skip: document.getElementById('skip'),
            blur: document.getElementById('blur'),
        };
        this.state = {};
    }
    set(patch) {
        for (const [k, v] of Object.entries(patch)) {
            if (this.state[k] === v) continue;
            this.state[k] = v;
            const e = this.el;
            switch (k) {
                case 'fade': e.fade.style.opacity = v; break;
                case 'flash': e.flash.style.opacity = v; break;
                case 'blur': e.blur.style.opacity = v; break;
                case 'sub': e.sub.textContent = v; e.sub.style.display = v ? 'block' : 'none'; break;
                case 'cardTitle': e.cardT.textContent = v; break;
                case 'cardSub': e.cardS.textContent = v; break;
                case 'cardOn': e.card.style.opacity = v ? 1 : 0; break;
                case 'hudOn': e.hud.style.display = v ? 'block' : 'none'; break;
                case 'obj': e.obj.textContent = v; break;
                case 'stamina': e.stamFill.style.width = (v * 100) + '%'; break;
                case 'lowStam': e.stamFill.style.background = v ? '#b4483c' : '#c9c2ae'; break;
                case 'hasKey': e.keyPip.style.opacity = v ? 1 : 0.2; break;
                case 'prompt': e.prompt.textContent = v; e.prompt.style.display = v ? 'block' : 'none'; break;
                case 'lids': e.lidTop.style.height = (v * 52) + '%'; e.lidBot.style.height = (v * 52) + '%'; break;
                case 'vignette': e.vig.style.opacity = v; break;
                case 'skipOn': e.skip.style.display = v ? 'block' : 'none'; break;
            }
        }
    }
}
