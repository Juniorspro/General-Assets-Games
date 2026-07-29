/* Escena 3D: cielo, torre, pelota, monedas, flechas, escombros y camara. */

import * as THREE from 'three';
import { sectorGeometry, glowTexture, sparkTexture, skyTexture, coreTexture, hazardTexture,
         shadowTexture, TAU, norm2 } from './gfx.js';
import { R_CORE, R_OUT, RING_H, R_PATH, BALL_R, BASE_LEVEL_H, solidAt } from './levelgen.js';
import { DANGER, GOAL, ARROW, COIN } from './palette.js';

const FOV = 50;
const FIT_W = R_OUT * 2.34;     // ancho visible minimo: la torre siempre entra a lo ancho
const FIT_RINGS = 5.0;          // alto visible minimo, en anillos (la separacion crece por nivel)

export class World {
  constructor(canvas){
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
    this.renderer.setClearColor(0x0b1020, 1);
    // sin mapeo de tonos: el look es plano y de paleta, y ACES desatura los colores
    // saturados (un anillo dorado sale amarillo sucio)
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 900);

    this.glowTex = glowTexture();
    this.sparkTex = sparkTexture();
    this.coreTex = coreTexture();
    this.hazardTex = hazardTexture();
    this.shadowTex = shadowTexture();

    this.quality = 'high';
    this.levelH = BASE_LEVEL_H;
    this.shake = 0;
    this.punch = 0;
    this.camY = 0;
    this.rot = 0;
    this.time = 0;

    this._buildStatic();
    this.resize();
  }

  /* ---------- montaje permanente ---------- */
  _buildStatic(){
    const s = this.scene;

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(340, 32, 20),
      new THREE.MeshBasicMaterial({ side:THREE.BackSide, depthWrite:false, fog:false })
    );
    this.sky.frustumCulled = false;
    s.add(this.sky);

    /* Estas luces solo afectan a la pelota: el resto de la torre usa materiales sin
       iluminar. Sin shadow map, la sombra de la pelota es un plano de contacto. */
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x5a6472, 0.55);
    s.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffffff, 1.15);
    this.sun.position.set(3.5, 13, 6);
    this.sunTarget = new THREE.Object3D();
    s.add(this.sunTarget);
    this.sun.target = this.sunTarget;
    s.add(this.sun);

    this.rim = new THREE.DirectionalLight(0xbfd8ff, 0.35);
    this.rim.position.set(-8, 4, 6);
    s.add(this.rim);

    this.towerGroup = new THREE.Group();
    s.add(this.towerGroup);

    // sin iluminar, con el sombreado cilindrico horneado en la textura
    this.core = new THREE.Mesh(
      new THREE.CylinderGeometry(R_CORE, R_CORE, 1, 56, 1, true),
      new THREE.MeshBasicMaterial({ map:this.coreTex })
    );
    this.towerGroup.add(this.core);

    this.ringsGroup = new THREE.Group();
    this.towerGroup.add(this.ringsGroup);

    this.debris = new THREE.Group();
    s.add(this.debris);
    this.chunks = [];

    this._buildBall();
    this._buildDust();

    this._buildMaterials();

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.env = null;
  }

  /* Los materiales se crean una sola vez y por nivel solo cambian de color: crear
     materiales nuevos obliga a compilar shaders y eso bloquea el hilo principal
     justo al empezar el nivel. */
  /* La torre usa materiales SIN iluminar a proposito. El look es de paleta plana, y
     bajo un material PBR el color autorizado no sobrevive: la irradiancia del cielo,
     el entorno y el recorte de canales desvian el tono (un anillo dorado acaba oliva).
     Sin iluminar, cada anillo sale exactamente del color del tema; el volumen lo dan
     la silueta, la pared mas oscura y la sombra de contacto de la pelota.
     La pelota si es PBR: es donde los reflejos y los acabados metalicos importan. */
  _buildMaterials(){
    const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f);
    this.mats = {
      face:  new THREE.MeshBasicMaterial(),
      side:  new THREE.MeshBasicMaterial(),
      dFace: new THREE.MeshBasicMaterial({ color:new THREE.Color(DANGER), map:this.hazardTex }),
      dSide: new THREE.MeshBasicMaterial({ color:shade(DANGER, 0.62) }),
      goalF: new THREE.MeshBasicMaterial({ color:new THREE.Color(GOAL) }),
      goalS: new THREE.MeshBasicMaterial({ color:shade(GOAL, 0.62) })
    };
    // monedas y flechas se rehacen en cada nivel: su geometria y sus materiales son
    // compartidos, si no se acumularian nivel tras nivel sin liberarse
    this.pickup = {
      coinGeo: new THREE.CylinderGeometry(0.26, 0.26, 0.055, 20),
      coinMat: new THREE.MeshBasicMaterial({ color:new THREE.Color(COIN) }),
      coinHalo: new THREE.SpriteMaterial({ map:this.glowTex, color:new THREE.Color(COIN),
        transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.55 }),
      headGeo: new THREE.ConeGeometry(0.3, 0.42, 18),
      shaftGeo: new THREE.CylinderGeometry(0.1, 0.1, 0.34, 12),
      arrowMat: new THREE.MeshBasicMaterial({ color:new THREE.Color(ARROW) }),
      arrowHalo: new THREE.SpriteMaterial({ map:this.glowTex, color:new THREE.Color(ARROW),
        transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.6 }),
      goalHalo: new THREE.SpriteMaterial({ map:this.glowTex, color:new THREE.Color(GOAL),
        transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.7 })
    };

    // pool de materiales de escombro: comparten shader y se reciclan
    this.debrisMats = [];
    this.debrisFree = [];
    for (let i = 0; i < 36; i++){
      const m = new THREE.MeshBasicMaterial({ transparent:true, opacity:1 });
      this.debrisMats.push(m);
      this.debrisFree.push(m);
    }
  }

  _buildBall(){
    this.ball = new THREE.Group();
    this.ballMat = new THREE.MeshStandardMaterial({ color:0xf4f6fa, roughness:0.28, metalness:0.05 });
    this.ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 40, 28), this.ballMat);
    this.ball.add(this.ballMesh);

    // sombra de contacto: plano tumbado sobre la plataforma que hay debajo
    this.ballShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map:this.shadowTex, transparent:true, depthWrite:false, opacity:0 })
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.visible = false;
    this.scene.add(this.ballShadow);

    this.ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map:this.glowTex, color:0xffffff, transparent:true, blending:THREE.AdditiveBlending,
      depthWrite:false, opacity:0
    }));
    this.ballGlow.scale.setScalar(BALL_R * 7);
    this.ball.add(this.ballGlow);

    this.fireLight = new THREE.PointLight(0xff7a20, 0, 9, 2);
    this.ball.add(this.fireLight);

    this.ball.position.set(0, 0, R_PATH);
    this.scene.add(this.ball);

    // estela: puntos reciclados que se sueltan de la pelota al caer
    const N = 90;
    this.trailN = N;
    this.trailPos = new Float32Array(N * 3);
    this.trailLife = new Float32Array(N);
    this.trailIdx = 0;
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    tg.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(N), 1));
    this.trail = new THREE.Points(tg, new THREE.PointsMaterial({
      map:this.sparkTex, size:0.34, transparent:true, blending:THREE.AdditiveBlending,
      depthWrite:false, color:0xff6a10, sizeAttenuation:true, opacity:0.85
    }));
    this.trail.frustumCulled = false;
    this.trail.visible = false;
    this.scene.add(this.trail);
  }

  _buildDust(){
    const N = 260;
    const pos = new Float32Array(N * 3);
    this.dustSpeed = new Float32Array(N);
    for (let i = 0; i < N; i++){
      const a = Math.random() * TAU, r = 9 + Math.random() * 22;
      pos[i * 3]     = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 70;
      pos[i * 3 + 2] = Math.sin(a) * r;
      this.dustSpeed[i] = 0.6 + Math.random() * 1.8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({
      map:this.glowTex, size:0.55, transparent:true, blending:THREE.AdditiveBlending,
      depthWrite:false, opacity:0.5, sizeAttenuation:true
    }));
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
  }

  setQuality(q){
    this.quality = q;
    const dprCap = q === 'low' ? 1 : q === 'med' ? 1.6 : 2.2;
    this.renderer.setPixelRatio(Math.min(dprCap, window.devicePixelRatio || 1));
    this.dust.visible = q !== 'low';
    this.fireLight.visible = q !== 'low';
    this.resize();
  }

  setTheme(theme){
    // regenerar cielo y entorno cuesta un PMREM: reintentar un nivel no debe pagarlo
    if (this.theme === theme) return;
    this.theme = theme;
    const tex = skyTexture(theme.sky[0], theme.sky[1]);
    if (this.sky.material.map) this.sky.material.map.dispose();
    this.sky.material.map = tex;
    this.sky.material.needsUpdate = true;
    this.renderer.setClearColor(new THREE.Color(theme.sky[1]), 1);
    // la columna se oscurece hacia el cielo bajo: con un nucleo casi blanco la pelota
    // clara desaparece encima de el
    this.core.material.color = new THREE.Color(theme.core).lerp(new THREE.Color(theme.sky[1]), 0.20);
    // estas luces solo alcanzan a la pelota; un tinte suave del cielo la integra en la escena
    this.hemi.color = new THREE.Color(theme.sky[0]).lerp(new THREE.Color(0xffffff), 0.6);
    this.hemi.groundColor = new THREE.Color(theme.sky[1]).lerp(new THREE.Color(0xffffff), 0.3);
    this.dust.material.color = new THREE.Color(theme.accent);

    // el entorno da a las pelotas metalicas algo que reflejar; se rehace por nivel
    const tmp = new THREE.Scene();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 10),
      new THREE.MeshBasicMaterial({ map:tex, side:THREE.BackSide }));
    tmp.add(sphere);
    if (this.env) this.env.dispose();
    this.env = this.pmrem.fromScene(tmp, 0.04);
    this.scene.environment = this.env.texture;
    sphere.geometry.dispose();
    sphere.material.dispose();
  }

  setSkin(skin){
    const m = this.ballMat;
    // se guardan color y emision de la pelota: al apagarse el fuego hay que restaurarlos
    this.skinColor = skin.color;
    this.skinEmissive = skin.emissive === undefined ? 0x000000 : skin.emissive;
    m.color = new THREE.Color(skin.color);
    m.metalness = skin.metal;
    m.roughness = skin.rough;
    m.emissive = new THREE.Color(skin.emissive === undefined ? 0x000000 : skin.emissive);
    m.emissiveIntensity = skin.glow || 0;
    m.envMapIntensity = 1.1;
    m.needsUpdate = true;
    this.skinGlow = skin.glow || 0;
    this.ballGlow.material.color = new THREE.Color(skin.emissive === undefined ? skin.color : skin.emissive);
    this.ballGlow.material.opacity = this.skinGlow ? 0.28 * this.skinGlow : 0;
  }

  /* ---------- construccion del nivel ---------- */
  build(levelData){
    this.clearLevel();
    const th = this.theme;
    this.mats.face.color.set(th.ring);
    this.mats.side.color.set(th.ring).multiplyScalar(0.72);

    for (const ring of levelData.rings) this._buildRing(ring);
    this._buildGoal(levelData.goalY);

    // la columna cubre todo el nivel de una pieza
    const top = levelData.startH + 6, bot = levelData.goalY - 4;
    const h = top - bot;
    this.core.geometry.dispose();
    this.core.geometry = new THREE.CylinderGeometry(R_CORE, R_CORE, h, 56, 1, true);
    this.core.position.y = bot + h / 2;
    this.coreTex.repeat.set(1, h / 3.2);

    this.levelData = levelData;
    // la separacion crece por nivel, asi que la camara se recalcula
    this.levelH = levelData.levelH;
    this.resize();
    // compila aqui, no en el primer frame de la partida
    const wasVisible = this.ball.visible;
    this.ball.visible = true;          // compile() ignora lo invisible
    this.renderer.compile(this.scene, this.camera);
    this.ball.visible = wasVisible;
  }

  /** Compila de golpe todas las variantes de shader, incluidas las que no hay en
      escena todavia (escombros, estela, halos). Sin esto la primera rotura o la
      primera bola de fuego compilan su shader en mitad del juego y dan un tiron. */
  warmup(){
    const probe = new THREE.Group();
    const dot = new THREE.SphereGeometry(0.01, 4, 3);
    const point = new THREE.BufferGeometry();
    point.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));

    const mats = [this.mats.face, this.mats.side, this.mats.dFace, this.mats.dSide,
                  this.mats.goalF, this.mats.goalS, this.debrisMats[0], this.ballMat,
                  this.pickup.coinMat, this.pickup.arrowMat];
    for (const m of mats) probe.add(new THREE.Mesh(dot, m));
    probe.add(new THREE.Mesh(dot, this.ballShadow.material));
    probe.add(new THREE.Mesh(dot, this.core.material));
    probe.add(new THREE.Sprite(this.pickup.coinHalo));
    probe.add(new THREE.Sprite(this.pickup.arrowHalo));
    probe.add(new THREE.Sprite(this.pickup.goalHalo));
    probe.add(new THREE.Sprite(this.ballGlow.material));
    probe.add(new THREE.Points(point, this.trail.material));
    probe.add(new THREE.Points(point, this.dust.material));

    probe.position.set(0, this.camY, R_PATH);
    this.scene.add(probe);
    this.renderer.compile(this.scene, this.camera);
    this.scene.remove(probe);
    dot.dispose();
    point.dispose();
  }

  _buildRing(ring){
    const g = new THREE.Group();
    g.position.y = ring.y;
    ring._group = g;
    ring._meshes = [];
    for (const sg of ring.segs){
      const geo = sectorGeometry(R_CORE * 0.995, R_OUT, RING_H, sg.len);
      const mats = sg.danger ? [this.mats.dFace, this.mats.dSide] : [this.mats.face, this.mats.side];
      const m = new THREE.Mesh(geo, mats);
      m.rotation.y = -sg.s;
      g.add(m);
      ring._meshes.push(m);
      sg._mesh = m;
    }
    for (const c of ring.coins) g.add(this._coin(c));
    if (ring.arrow) g.add(this._arrow(ring.arrow));
    this.ringsGroup.add(g);
  }

  _coin(coin){
    const grp = new THREE.Group();
    const mesh = new THREE.Mesh(this.pickup.coinGeo, this.pickup.coinMat);
    mesh.rotation.x = Math.PI / 2;
    grp.add(mesh);
    const halo = new THREE.Sprite(this.pickup.coinHalo);
    halo.scale.setScalar(1.5);
    grp.add(halo);
    grp.position.set(Math.cos(coin.a) * R_PATH, RING_H / 2 + 0.5, Math.sin(coin.a) * R_PATH);
    coin._obj = grp;
    coin._mesh = mesh;
    return grp;
  }

  _arrow(arrow){
    const grp = new THREE.Group();
    const head = new THREE.Mesh(this.pickup.headGeo, this.pickup.arrowMat);
    head.position.y = 0.26;
    grp.add(head);
    const shaft = new THREE.Mesh(this.pickup.shaftGeo, this.pickup.arrowMat);
    shaft.position.y = -0.08;
    grp.add(shaft);
    const halo = new THREE.Sprite(this.pickup.arrowHalo);
    halo.scale.setScalar(2.1);
    grp.add(halo);
    grp.position.set(Math.cos(arrow.a) * R_PATH, RING_H / 2 + 0.55, Math.sin(arrow.a) * R_PATH);
    arrow._obj = grp;
    return grp;
  }

  _buildGoal(y){
    const g = new THREE.Group();
    g.position.y = y;
    const n = 6, len = TAU / n;
    for (let i = 0; i < n; i++){
      const m = new THREE.Mesh(sectorGeometry(R_CORE * 0.995, R_OUT, RING_H, len),
                               [this.mats.goalF, this.mats.goalS]);
      m.rotation.y = -i * len;
      g.add(m);
    }
    this.goalHalo = new THREE.Sprite(this.pickup.goalHalo);
    this.goalHalo.scale.setScalar(R_OUT * 2.6);
    this.goalHalo.position.y = 0.6;
    g.add(this.goalHalo);
    this.goal = g;
    this.ringsGroup.add(g);
  }

  /* Las geometrias de sector estan cacheadas y los materiales son permanentes, asi que
     limpiar un nivel es solo soltar los objetos de escena. */
  clearLevel(){
    while (this.ringsGroup.children.length) this.ringsGroup.remove(this.ringsGroup.children[0]);
    for (const c of this.chunks){
      this.debris.remove(c.obj);
      this.debrisFree.push(c.mat);
    }
    this.chunks.length = 0;
    this.goal = null;
  }

  _takeDebrisMat(){
    if (!this.debrisFree.length){
      // sin materiales libres: se retira el escombro mas viejo y se reutiliza el suyo
      const old = this.chunks.shift();
      if (!old) return null;
      this.debris.remove(old.obj);
      return old.mat;
    }
    return this.debrisFree.pop();
  }

  /* ---------- efectos de juego ---------- */

  /** Rompe un anillo: sus segmentos se sueltan como escombros con giro y caida. */
  smashRing(ring, fromFire){
    if (ring.smashed) return;
    ring.smashed = true;
    const th = this.theme;
    for (const sg of ring.segs){
      const mesh = sg._mesh;
      if (!mesh) continue;
      mesh.visible = false;
      const pieces = 3, plen = sg.len / pieces;
      for (let p = 0; p < pieces; p++){
        const mat = this._takeDebrisMat();
        if (!mat) continue;
        mat.color.set(sg.danger ? DANGER : th.ring);
        mat.opacity = 1;
        const m = new THREE.Mesh(sectorGeometry(R_CORE * 0.995, R_OUT, RING_H, plen), mat);
        m.rotation.y = -(sg.s + p * plen);
        ring._group.add(m);
        m.updateMatrixWorld(true);
        this.debris.attach(m);
        const mid = sg.s + (p + 0.5) * plen;
        // el angulo local ya lleva dentro el giro de torre y anillo al desprenderse
        const wa = mid + this.rot + ring.offset;
        const out = new THREE.Vector3(Math.cos(wa), 0, Math.sin(wa));
        this.chunks.push({
          obj:m, mat,
          vel: out.multiplyScalar(2.4 + Math.random() * 3.4).add(
                 new THREE.Vector3(0, fromFire ? 1.6 + Math.random() * 2.4 : -0.4, 0)),
          spin: new THREE.Vector3((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7),
          life: 1
        });
      }
    }
  }

  takeCoin(coin){
    coin.taken = true;
    if (coin._obj) coin._obj.visible = false;
  }
  takeArrow(arrow){
    arrow.taken = true;
    if (arrow._obj) arrow._obj.visible = false;
  }

  setFire(on){
    this.fire = on;
    this.trail.visible = on;
    if (!on){
      this.fireLight.intensity = 0;
      this.ballGlow.material.opacity = this.skinGlow ? 0.28 * this.skinGlow : 0;
      this.ballGlow.material.color.setHex(this.skinEmissive || this.skinColor || 0xffffff);
      this.ballMat.color.setHex(this.skinColor === undefined ? 0xf4f6fa : this.skinColor);
      this.ballMat.emissive.setHex(this.skinEmissive || 0x000000);
      this.ballMat.emissiveIntensity = this.skinGlow || 0;
      for (let i = 0; i < this.trailN; i++) this.trailLife[i] = 0;
    }
  }

  addShake(a){ this.shake = Math.min(1.4, this.shake + a); }
  addPunch(a){ this.punch = Math.min(1, this.punch + a); }

  /* ---------- ciclo ---------- */

  setRot(rot){ this.rot = rot; this.towerGroup.rotation.y = -rot; }

  syncRings(rings){
    for (const r of rings) if (r._group) r._group.rotation.y = -r.offset;
  }

  setBall(y, squash){
    this.ball.position.y = y;
    const sq = 1 - squash * 0.32;
    this.ballMesh.scale.set(1 / sq, sq, 1 / sq);
  }

  update(dt, opts){
    this.time += dt;
    const o = opts || {};

    // camara: sigue la pelota con retardo y un limite duro para que nunca se escape
    const targetY = this.ball.position.y;
    this.camY += (targetY - this.camY) * Math.min(1, dt * 9);
    if (this.camY - targetY > this.levelH * 0.9) this.camY = targetY + this.levelH * 0.9;

    this.shake *= Math.exp(-6 * dt);
    this.punch *= Math.exp(-5 * dt);

    const sh = this.shake;
    const dist = this.camDist * (1 + this.punch * 0.05);
    this.camera.position.set(
      (Math.random() - 0.5) * sh * 0.55,
      this.camY + this.levelH * 0.78 + (Math.random() - 0.5) * sh * 0.55,
      dist
    );
    this.camera.lookAt(0, this.camY - this.levelH * 0.5, 0);

    this.sky.position.set(0, this.camY, 0);
    this.sunTarget.position.set(0, this.camY, 0);
    this.sun.position.set(3.5, this.camY + 13, 6);

    // sombra de contacto sobre la primera plataforma solida que haya bajo la pelota
    if (this.levelData && this.ball.visible){
      const local = norm2(Math.PI / 2 - this.rot);
      const by = this.ball.position.y - BALL_R;
      let sy = this.levelData.goalY;
      for (const r of this.levelData.rings){
        if (r.y >= by) continue;
        if (solidAt(r, local, 0.10)){ sy = r.y; break; }
      }
      const fade = Math.max(0, 1 - (by - sy) / (this.levelH * 1.7));
      this.ballShadow.visible = fade > 0.02;
      if (this.ballShadow.visible){
        this.ballShadow.position.set(0, sy + RING_H / 2 + 0.015, R_PATH);
        const sc = BALL_R * (2.3 + 1.5 * (1 - fade));
        this.ballShadow.scale.set(sc, sc, 1);
        this.ballShadow.material.opacity = 0.5 * fade;
      }
    } else this.ballShadow.visible = false;

    // polvo de fondo a la deriva, reciclado alrededor de la camara
    if (this.dust.visible){
      const p = this.dust.geometry.attributes.position;
      const arr = p.array;
      for (let i = 0; i < this.dustSpeed.length; i++){
        arr[i * 3 + 1] += this.dustSpeed[i] * dt;
        if (arr[i * 3 + 1] > this.camY + 36) arr[i * 3 + 1] = this.camY - 36;
        else if (arr[i * 3 + 1] < this.camY - 40) arr[i * 3 + 1] = this.camY + 34;
      }
      p.needsUpdate = true;
    }

    // monedas y flechas girando
    if (this.levelData){
      for (const r of this.levelData.rings){
        for (const c of r.coins) if (c._obj && !c.taken) c._obj.rotation.y += dt * 2.6;
        if (r.arrow && r.arrow._obj && !r.arrow.taken){
          r.arrow._obj.rotation.y += dt * 2.2;
          r.arrow._obj.position.y = RING_H / 2 + 0.55 + Math.sin(this.time * 3) * 0.09;
        }
      }
    }
    if (this.goalHalo) this.goalHalo.material.opacity = 0.5 + Math.sin(this.time * 2.4) * 0.2;

    // bola de fuego: pulso de emision, luz y estela
    if (this.fire){
      const pulse = 0.75 + Math.sin(this.time * 22) * 0.25;
      // el albedo tambien pasa a naranja: con base blanca y emision alta el mapeo de
      // tonos satura a rosa palido y la bola de fuego no se lee como fuego
      this.ballMat.color.setHex(0xff4a08);
      this.ballMat.emissive.setHex(0xff5a12);
      this.ballMat.emissiveIntensity = 0.95 * pulse;
      this.ballGlow.material.color.setHex(0xff7418);
      this.ballGlow.material.opacity = 0.7 * pulse;
      this.fireLight.intensity = 5.5 * pulse;
      const i = this.trailIdx = (this.trailIdx + 1) % this.trailN;
      this.trailPos[i * 3]     = (Math.random() - 0.5) * 0.3;
      this.trailPos[i * 3 + 1] = this.ball.position.y + (Math.random() - 0.5) * 0.2;
      this.trailPos[i * 3 + 2] = R_PATH + (Math.random() - 0.5) * 0.3;
      this.trailLife[i] = 1;
    }
    if (this.trail.visible){
      const a = this.trail.geometry.attributes;
      let any = false;
      for (let i = 0; i < this.trailN; i++){
        if (this.trailLife[i] > 0){
          this.trailLife[i] -= dt * 1.6;
          this.trailPos[i * 3 + 1] += dt * 1.2;
          any = true;
        } else this.trailPos[i * 3 + 1] = -9999;
      }
      a.position.needsUpdate = true;
      this.trail.material.opacity = 0.9;
      if (!any && !this.fire) this.trail.visible = false;
    }

    // escombros
    for (let i = this.chunks.length - 1; i >= 0; i--){
      const c = this.chunks[i];
      c.vel.y -= 26 * dt;
      c.obj.position.addScaledVector(c.vel, dt);
      c.obj.rotation.x += c.spin.x * dt;
      c.obj.rotation.y += c.spin.y * dt;
      c.obj.rotation.z += c.spin.z * dt;
      c.life -= dt * 0.7;
      c.mat.opacity = Math.max(0, Math.min(1, c.life));
      if (c.life <= 0){
        this.debris.remove(c.obj);
        this.debrisFree.push(c.mat);
        this.chunks.splice(i, 1);
      }
    }
  }

  resize(){
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // la distancia sale de encajar a la vez el ancho de la torre y varios anillos de alto
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dW = (FIT_W / 2) / (tan * this.camera.aspect);
    const dH = (this.levelH * FIT_RINGS / 2) / tan;
    this.camDist = Math.max(dW, dH);
    this.camera.updateProjectionMatrix();
  }

  render(){ this.renderer.render(this.scene, this.camera); }

  /** Vista del menu: la torre gira sola de fondo, sin pelota. */
  setMenuMode(on){
    this.ball.visible = !on;
    this.trail.visible = false;
  }
}
