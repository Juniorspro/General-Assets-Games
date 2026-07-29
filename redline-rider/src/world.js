/* Escena 3D: cielo, autopista, vehiculos y camara en primera persona.

   La carretera es UN plano largo con la textura desplazandose en V. Con eso la via es
   infinita sin gestionar trozos ni reciclar geometria, y las marcas viales quedan
   alineadas con los carriles porque van horneadas en la propia textura.

   El jugador se queda en z=0 y el mundo se mueve hacia el: todas las coordenadas se
   mantienen pequenas, que es lo que evita perder precision tras varios kilometros. */

import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { roadTexture, shoulderTexture, barrierTexture, skyTexture, cloudTexture,
         glowTexture, shadowTexture, clamp, lerp } from './gfx.js';

export const LANES = 4;
export const LANE_W = 3.6;
export const ROAD_W = LANES * LANE_W;                 // 14.4 m
export const LANE_X = [-5.4, -1.8, 1.8, 5.4];         // centros de carril
export const CLAMP_X = 8.6;                           // limite del jugador
export const VIEW_Z = 260;                            // profundidad visible
const ROAD_LEN = 600;                                 // largo del plano de asfalto
const TILE_M = 27;                                    // 3 m raya + 6 m hueco, x3

/* Ambientes: cada uno fija cielo, niebla y luz. Derivados de los bloques 3-4 de la
   formula de estilo, no inventados por separado. */
export const ENVS = {
  day:    { sky:['#63a9e8','#bcd8ef','#dfe7ec'], sun:0.62, sunCol:'rgba(255,246,214,0.55)',
            fog:0xc8d8e4, fogNear:120, fogFar:VIEW_Z, amb:0.85, dir:1.05,
            dirCol:0xfff2d8, night:false, cloud:'rgba(255,255,255,0.9)', cloudA:0.5 },
  sunset: { sky:['#2b3a6b','#e8834a','#f6c98a'], sun:0.70, sunCol:'rgba(255,170,90,0.7)',
            fog:0xe0a071, fogNear:90, fogFar:VIEW_Z, amb:0.6, dir:0.95,
            dirCol:0xffc38a, night:false, cloud:'rgba(255,190,140,0.85)', cloudA:0.55 },
  night:  { sky:['#05070f','#0d1730','#16213c'], sun:0, sunCol:null,
            fog:0x0a0f1c, fogNear:40, fogFar:170, amb:0.32, dir:0.35,
            dirCol:0x9fb6e0, night:true, cloud:'rgba(120,140,190,0.5)', cloudA:0.3 }
};

/* Modelos: si uno falta, se sustituye por una caja proporcionada. Asi el juego es
   jugable desde el primer momento y mejora conforme llegan los GLB. */
const MODELS = {
  bike:  { url:'assets/models/bike.glb',  len:2.05, wid:0.78, hei:1.20 },
  sedan: { url:'assets/models/sedan.glb', len:4.45, wid:1.80, hei:1.45 },
  suv:   { url:'assets/models/suv.glb',   len:4.80, wid:1.92, hei:1.80 },
  van:   { url:'assets/models/van.glb',   len:5.40, wid:2.00, hei:2.35 },
  truck: { url:'assets/models/truck.glb', len:12.0, wid:2.50, hei:3.60 },
  bus:   { url:'assets/models/bus.glb',   len:11.0, wid:2.55, hei:3.10 }
};

/* Todos estos GLB salen del mismo generador y traen el eje largo en X con el MORRO EN -X.
   Medido: se renderizo cada modelo preparado, visto desde el puesto del jugador, y con el
   giro de +90 grados se les veia el frente a todos, o sea que el trafico venia de cara y la
   moto del jugador miraba hacia atras. Con -90 el morro cae en -Z, que es el sentido de la
   marcha, y al trafico se le ve la trasera como toca.
   Se deja como campo por modelo, no como constante suelta, porque en cuanto un GLB venga de
   otro sitio hara falta el otro signo y hay que poder cambiarlo de uno en uno. */
const NOSE_MINUS_X = -Math.PI / 2;
for (const k in MODELS) if (MODELS[k].yaw === undefined) MODELS[k].yaw = NOSE_MINUS_X;
export const TRAFFIC_KINDS = ['sedan','suv','van','truck','bus'];
const ASSETS = (typeof window !== 'undefined' && window.__HX_ASSETS) || null;
const BASE_URL = (typeof window !== 'undefined' && window.__HX_ASSET_BASE) || '';
const resolveUrl = u => (ASSETS && ASSETS[u]) || (BASE_URL ? BASE_URL + u : u);

const FOV = 74;

/* Puesto del piloto, medido sobre la moto ya normalizada (2,05 m de largo centrada en z=0,
   asi que el morro cae en z=-1,02 y la cola en z=+1,02).

   EYE_Z = 0,62 pone la camara justo detras del asiento: por delante quedan 1,64 m de moto,
   que es lo que deja ver el deposito y el manillar. Con el valor anterior de 0,20 la camara
   caia en MITAD de la moto, o sea dentro de la malla, y con las caras traseras descartadas
   solo asomaba un trozo del carenado visto desde arriba.
   EYE_Y = 1,34 es la altura de los ojos de un piloto sentado: asiento a 0,80 y cabeza medio
   metro por encima. NEAR = 0,12 en vez de 0,25 para no recortar el propio deposito. */
const EYE_Y = 1.34;
const EYE_Z = 0.62;
const NEAR = 0.12;

export class World {
  constructor(canvas){
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    this.renderer.setClearColor(0x0a0f1c, 1);
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, NEAR, VIEW_Z + 120);

    this.glowTex = glowTexture();
    this.shadowTex = shadowTexture();
    this.barrierTex = barrierTexture();

    this.quality = 'high';
    this.models = {};          // kind -> THREE.Object3D plantilla
    this.roadOffset = 0;
    this.shake = 0;
    this.time = 0;

    this._build();
    this.setEnv('day');
    this.resize();
  }

  /* ---------- montaje ---------- */
  _build(){
    const s = this.scene;

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(VIEW_Z + 90, 24, 16),
      new THREE.MeshBasicMaterial({ side:THREE.BackSide, depthWrite:false, fog:false })
    );
    this.sky.frustumCulled = false;
    s.add(this.sky);

    this.clouds = new THREE.Mesh(
      new THREE.CylinderGeometry(VIEW_Z + 60, VIEW_Z + 60, 90, 24, 1, true),
      new THREE.MeshBasicMaterial({ side:THREE.BackSide, transparent:true, depthWrite:false, fog:false })
    );
    this.clouds.position.y = 42;
    this.clouds.frustumCulled = false;
    s.add(this.clouds);

    this.amb = new THREE.HemisphereLight(0xffffff, 0x55606e, 0.85);
    s.add(this.amb);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.05);
    this.sun.position.set(-40, 60, -80);
    s.add(this.sun);

    // asfalto: un plano largo, la textura hace el resto
    this.roadMat = new THREE.MeshLambertMaterial();
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, ROAD_LEN, 1, 1), this.roadMat);
    this.road.rotation.x = -Math.PI / 2;
    this.road.position.z = -ROAD_LEN / 2 + 40;
    s.add(this.road);

    this.shoulderMat = new THREE.MeshLambertMaterial();
    for (const sgn of [-1, 1]){
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, ROAD_LEN, 1, 1), this.shoulderMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(sgn * (ROAD_W / 2 + 4.5), -0.02, this.road.position.z);
      s.add(m);
    }

    // quitamiedos a ambos lados
    this.barrierMat = new THREE.MeshLambertMaterial({ map:this.barrierTex });
    this.barrierTex.repeat.set(ROAD_LEN / 4, 1);
    for (const sgn of [-1, 1]){
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, ROAD_LEN), this.barrierMat);
      m.position.set(sgn * 9.6, 0.5, this.road.position.z);
      s.add(m);
    }

    this.props = new THREE.Group();
    s.add(this.props);
    this._buildProps();

    this.trafficGroup = new THREE.Group();
    s.add(this.trafficGroup);

    this.bikeGroup = new THREE.Group();    // moto del jugador, visible desde la camara
    s.add(this.bikeGroup);

    this._buildFx();
  }

  /** Farolas recicladas: se reposicionan por delante en vez de crearse y destruirse. */
  _buildProps(){
    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 9, 6);
    const armGeo = new THREE.BoxGeometry(2.2, 0.16, 0.16);
    const headGeo = new THREE.BoxGeometry(1.0, 0.2, 0.5);
    const mat = new THREE.MeshLambertMaterial({ color:0x6a7078 });
    this.lampMat = new THREE.MeshBasicMaterial({ color:0xffe6b0 });
    this.lamps = [];
    const SPACING = 45;
    for (let i = 0; i < 14; i++){
      const sgn = i % 2 ? 1 : -1;
      const g = new THREE.Group();
      const post = new THREE.Mesh(postGeo, mat); post.position.y = 4.5; g.add(post);
      const arm = new THREE.Mesh(armGeo, mat); arm.position.set(-sgn * 1.1, 8.9, 0); g.add(arm);
      const head = new THREE.Mesh(headGeo, this.lampMat); head.position.set(-sgn * 2.1, 8.75, 0); g.add(head);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map:this.glowTex, color:0xffdca0,
        transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:0 }));
      halo.scale.setScalar(9); halo.position.set(-sgn * 2.1, 8.4, 0);
      g.add(halo);
      g.position.set(sgn * 11.5, 0, -i * SPACING);
      g.userData = { halo, spacing: SPACING * 7 };
      this.props.add(g);
      this.lamps.push(g);
    }
  }

  _buildFx(){
    // lineas de velocidad: se estiran con la velocidad y dan sensacion de vertigo
    const N = 70;
    this.streakN = N;
    const pos = new Float32Array(N * 6);
    this.streakData = [];
    for (let i = 0; i < N; i++){
      this.streakData.push({ x:(Math.random() - 0.5) * 26, y:0.4 + Math.random() * 7,
                             z:-Math.random() * VIEW_Z });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.streaks = new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color:0xffffff, transparent:true, opacity:0, depthWrite:false, fog:false }));
    this.streaks.frustumCulled = false;
    this.scene.add(this.streaks);
  }

  /* ---------- ambiente ---------- */
  setEnv(name){
    const e = ENVS[name] || ENVS.day;
    this.env = e;
    this.envName = name;

    if (this.sky.material.map) this.sky.material.map.dispose();
    this.sky.material.map = skyTexture(e.sky[0], e.sky[1], e.sky[2], e.sun, e.sunCol);
    this.sky.material.needsUpdate = true;

    if (this.clouds.material.map) this.clouds.material.map.dispose();
    const ct = cloudTexture(e.cloud, e.cloudA);
    ct.repeat.set(3, 1);
    this.clouds.material.map = ct;
    this.clouds.material.needsUpdate = true;

    this.scene.fog = new THREE.Fog(e.fog, e.fogNear, e.fogFar);
    this.renderer.setClearColor(new THREE.Color(e.sky[1]), 1);
    this.amb.intensity = e.amb;
    this.amb.color = new THREE.Color(e.sky[0]).lerp(new THREE.Color(0xffffff), 0.65);
    this.sun.intensity = e.dir;
    this.sun.color = new THREE.Color(e.dirCol);

    if (this.roadMat.map) this.roadMat.map.dispose();
    const rt = roadTexture(LANES, LANE_W, TILE_M, e.night);
    rt.repeat.set(1, ROAD_LEN / TILE_M);
    this.roadMat.map = rt;
    this.roadMat.needsUpdate = true;

    if (this.shoulderMat.map) this.shoulderMat.map.dispose();
    const st = shoulderTexture(e.night);
    st.repeat.set(4, ROAD_LEN / 8);
    this.shoulderMat.map = st;
    this.shoulderMat.needsUpdate = true;

    for (const l of this.lamps) l.userData.halo.material.opacity = e.night ? 0.75 : 0;
    this.lampMat.color = new THREE.Color(e.night ? 0xffe6b0 : 0x9aa1aa);
  }

  setQuality(q){
    this.quality = q;
    const cap = q === 'low' ? 1 : q === 'med' ? 1.5 : q === 'high' ? 2 : 2.5;
    const scale = q === 'low' ? 0.65 : q === 'med' ? 0.85 : 1;
    this.renderScale = scale;
    this.renderer.setPixelRatio(Math.min(cap, (window.devicePixelRatio || 1)) * scale);
    this.props.visible = q !== 'low';
    this.streaks.visible = q !== 'low';
    this.clouds.visible = q !== 'low';
    this.resize();
  }

  /* ---------- modelos ---------- */
  /** Una tarea de carga por modelo, para que la barra de progreso sea real. */
  modelTasks(){
    const loader = new GLTFLoader();
    return Object.keys(MODELS).map(kind => ({
      label: kind,
      run: () => new Promise(resolve => {
        const spec = MODELS[kind];
        loader.load(resolveUrl(spec.url),
          gltf => { this.models[kind] = this._prepare(gltf.scene, spec); resolve(); },
          undefined,
          () => { this.models[kind] = null; resolve(); }   // ausente -> respaldo procedural
        );
      })
    }));
  }

  /** Normaliza un GLB: lo escala a la longitud real del vehiculo y lo apoya en el suelo. */
  _prepare(obj, spec){
    obj.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = false;
      const m = o.material;
      if (m){
        m.side = THREE.FrontSide;
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        // los GLB de image_to_3d vienen como Standard; Lambert cuesta bastante menos
        // y con esta direccion de arte no se nota la diferencia
        if (m.isMeshStandardMaterial){
          o.material = new THREE.MeshLambertMaterial({ map:m.map, color:m.color });
          m.dispose();
        }
      }
    });
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const longest = Math.max(size.x, size.z) || 1;
    const k = spec.len / longest;
    obj.scale.setScalar(k);

    // reorienta para que el MORRO mire a -Z (sentido de la marcha), no solo el eje largo
    if (size.x > size.z) obj.rotation.y = spec.yaw === undefined ? -Math.PI / 2 : spec.yaw;

    /* Se centra en X y Z y se apoya en Y=0. Cada GLB trae su pivote donde le parece, y
       sin normalizarlo la camara de casco y las colisiones dependerian de ese capricho. */
    const b2 = new THREE.Box3().setFromObject(obj);
    const c = new THREE.Vector3(); b2.getCenter(c);
    obj.position.x -= c.x;
    obj.position.z -= c.z;
    obj.position.y -= b2.min.y;
    const wrap = new THREE.Group();
    wrap.add(obj);
    wrap.userData.size = spec;
    return wrap;
  }

  /** Caja proporcionada con cabina y ruedas: respaldo cuando falta el GLB. */
  _fallback(kind){
    const s = MODELS[kind];
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(s.wid, s.hei * 0.62, s.len),
      new THREE.MeshLambertMaterial({ color:0x9aa3ad }));
    body.position.y = s.hei * 0.31 + 0.28;
    g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(s.wid * 0.86, s.hei * 0.34, s.len * 0.42),
      new THREE.MeshLambertMaterial({ color:0x2b3340 }));
    cab.position.set(0, s.hei * 0.62 + 0.28, -s.len * 0.06);
    g.add(cab);
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 10);
    const wheelMat = new THREE.MeshLambertMaterial({ color:0x1a1d22 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]){
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * s.wid * 0.46, 0.34, sz * s.len * 0.32);
      g.add(w);
    }
    const wrap = new THREE.Group();
    wrap.add(g);
    wrap.userData.size = s;
    return wrap;
  }

  /** Instancia de vehiculo lista para el pool de trafico. */
  spawnVehicle(kind, tint){
    const src = this.models[kind];
    const obj = src ? src.clone(true) : this._fallback(kind);
    if (tint !== undefined){
      obj.traverse(o => {
        if (o.isMesh && o.material && !o.material.map){
          o.material = o.material.clone();
          o.material.color = new THREE.Color(tint);
        }
      });
    }
    // luces traseras y sombra de contacto
    const s = MODELS[kind];
    /* El resplandor de los pilotos tiene que ser PEQUENO. A 1,5 veces el ancho del coche el
       sprite aditivo cubria la carroceria entera y, como se encendia con solo tener al
       jugador a 20 m, los coches se veian rojos de dia. */
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map:this.glowTex, color:0xff3b1e,
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.0 }));
    halo.scale.setScalar(s.wid * 0.6);
    halo.position.set(0, s.hei * 0.38, s.len * 0.5 + 0.06);
    obj.add(halo);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(s.wid * 1.7, s.len * 1.15),
      new THREE.MeshBasicMaterial({ map:this.shadowTex, transparent:true, depthWrite:false, opacity:0.5 }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    obj.add(sh);
    obj.userData.halo = halo;
    this.trafficGroup.add(obj);
    return obj;
  }

  setPlayerBike(color){
    while (this.bikeGroup.children.length) this.bikeGroup.remove(this.bikeGroup.children[0]);
    const src = this.models.bike;
    const obj = src ? src.clone(true) : this._fallback('bike');
    if (color !== undefined){
      obj.traverse(o => {
        if (o.isMesh && o.material && !o.material.map){
          o.material = o.material.clone();
          o.material.color = new THREE.Color(color);
        }
      });
    }
    this.bikeGroup.add(obj);
    this.playerBike = obj;
  }

  /* ---------- ciclo ---------- */

  /** Avanza el mundo: la carretera se desplaza por textura y los props se reciclan. */
  advance(metres){
    this.roadOffset += metres / TILE_M;
    if (this.roadMat.map) this.roadMat.map.offset.y = -this.roadOffset;
    if (this.shoulderMat.map) this.shoulderMat.map.offset.y = -this.roadOffset * (TILE_M / 8);
    this.barrierTex.offset.x = this.roadOffset * (TILE_M / 4);

    for (const l of this.lamps){
      l.position.z += metres;
      if (l.position.z > 30) l.position.z -= l.userData.spacing;
    }
  }

  /** Camara de casco: altura de ojos, cabeceo con la aceleracion y balanceo al girar. */
  setRider(x, lean, speedFrac, accel, brake){
    const bg = this.bikeGroup;
    bg.position.set(x, 0, 0);
    bg.rotation.z = -lean * 0.5;
    bg.rotation.y = lean * 0.10;

    const pitch = clamp(accel * 0.012 - brake * 0.03, -0.05, 0.035);
    const bob = Math.sin(this.time * 22) * 0.006 * (0.3 + speedFrac);
    const sh = this.shake;
    this.camera.position.set(
      x + (Math.random() - 0.5) * sh * 0.25,
      EYE_Y + bob + (Math.random() - 0.5) * sh * 0.25,
      EYE_Z
    );
    this.camera.rotation.set(pitch + (Math.random() - 0.5) * sh * 0.02, 0, -lean * 0.16);
    // el campo de vision se abre con la velocidad: es el truco clasico de sensacion de velocidad
    const fov = FOV + speedFrac * 14;
    if (Math.abs(this.camera.fov - fov) > 0.01){
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  update(dt, speedFrac){
    this.time += dt;
    this.shake *= Math.exp(-7 * dt);
    this.sky.position.set(this.camera.position.x, 0, 0);
    this.clouds.position.x = this.camera.position.x;
    this.clouds.rotation.y += dt * 0.004;

    if (this.streaks.visible){
      const a = this.streaks.geometry.attributes.position;
      const arr = a.array;
      const vis = Math.max(0, speedFrac - 0.45) / 0.55;
      this.streaks.material.opacity = vis * 0.32;
      const len = 6 + speedFrac * 40;
      for (let i = 0; i < this.streakN; i++){
        const d = this.streakData[i];
        d.z += (40 + speedFrac * 320) * dt;
        if (d.z > 6){ d.z = -VIEW_Z; d.x = (Math.random() - 0.5) * 26; d.y = 0.4 + Math.random() * 7; }
        arr[i * 6]     = d.x; arr[i * 6 + 1] = d.y; arr[i * 6 + 2] = d.z;
        arr[i * 6 + 3] = d.x; arr[i * 6 + 4] = d.y; arr[i * 6 + 5] = d.z - len;
      }
      a.needsUpdate = true;
    }
  }

  addShake(v){ this.shake = Math.min(1.6, this.shake + v); }

  resize(){
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(){ this.renderer.render(this.scene, this.camera); }

  /** Compila todas las variantes de shader de golpe, en la pantalla de carga. */
  warmup(){
    this.renderer.compile(this.scene, this.camera);
  }
}
