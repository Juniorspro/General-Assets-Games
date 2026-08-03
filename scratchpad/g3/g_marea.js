/* ===== MAREA — moto de agua al atardecer ==================================
   Corrés sobre un océano dorado cruzando PUERTAS de boyas. Cada puerta suma
   tiempo; las rachas multiplican. El agua tiene olas reales y refleja el
   cielo. Arrastrá (o A/D · flechas) para virar. Contrarreloj, arcade puro. */
window.GAME = (function () {
let T, scene, cam, ren;
let craft, sx, sz, yaw, v, bank, gate, timeLeft, score, streak, dead, tPlay;
let keys = {}, drag = null, water = null, waterGeo = null, baseY = null, sprayT = 0;

/* altura de la ola en coordenadas de mundo (suma de senos, barato y suave) */
function waveH(x, z, t) {
  return Math.sin(x * .06 + t * 1.6) * .5
       + Math.sin(z * .045 - t * 1.1) * .6
       + Math.sin((x + z) * .03 + t * .8) * .35;
}

async function init3d(THREE) {
  T = THREE; scene = ARC.scene; cam = ARC.cam; ren = ARC.renderer;
  const tl = new T.TextureLoader();
  const sky = tl.load(TEX.sky); sky.mapping = T.EquirectangularReflectionMapping; sky.colorSpace = T.SRGBColorSpace;
  scene.background = sky; scene.environment = sky;
  scene.fog = new T.Fog(0xf0c890, 120, 420);
  scene.add(new T.HemisphereLight(0xffe6c0, 0x20406a, 1.3));
  scene.add(new T.AmbientLight(0xffffff, .35));
  const sun = new T.DirectionalLight(0xffdca6, 2.6); sun.position.set(-40, 22, -60); scene.add(sun);
  ren.toneMappingExposure = 1.18;
  // OCÉANO: plano subdividido que refleja el cielo (envMap) + olas por vértice
  const aguaTex = tl.load(TEX.agua); aguaTex.wrapS = aguaTex.wrapT = T.RepeatWrapping; aguaTex.repeat.set(28, 28); aguaTex.colorSpace = T.SRGBColorSpace;
  waterGeo = new T.PlaneGeometry(900, 900, 60, 60);
  waterGeo.rotateX(-Math.PI / 2);
  baseY = Float32Array.from(waterGeo.attributes.position.array);   // copia base (y=0)
  water = new T.Mesh(waterGeo, new T.MeshStandardMaterial({
    map: aguaTex, color: 0x40899e, roughness: .08, metalness: .18,
    envMap: sky, envMapIntensity: 1.5 }));
  water.position.y = 0; scene.add(water);
  // brillo del sol sobre el agua
  const glint = new T.PointLight(0xffe0a0, 2.2, 120); glint.position.set(-30, 8, -40); scene.add(glint);
  // MOTO DE AGUA (modelo generado; respaldo procedural si falla)
  let m = null;
  try { const g = await ARC.loadGLB(MDL.craft); m = g.scene;
    const b = new T.Box3().setFromObject(m); const s = b.getSize(new T.Vector3());
    m.scale.setScalar(3.6 / (Math.max(s.x, s.z) || 1));
    m.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.metalness = Math.min(o.material.metalness || 0, .4); o.material.envMapIntensity = .6; } } });
    const ctr = new T.Box3().setFromObject(m).getCenter(new T.Vector3()); m.position.sub(ctr);
    m.rotation.y = Math.PI / 2;                 // el modelo viene de perfil: proa hacia +Z
    m.updateWorldMatrix(true, true);
    m.position.y -= new T.Box3().setFromObject(m).min.y;
  } catch (e) {}
  if (!m) {
    m = new T.Group();
    const hull = new T.Mesh(new T.BoxGeometry(1.5, .7, 3.6), new T.MeshStandardMaterial({ color: 0xd83a3a, roughness: .5, metalness: .2 }));
    hull.geometry.translate(0, .35, 0); m.add(hull);
    const seat = new T.Mesh(new T.BoxGeometry(1.1, .5, 1.6), new T.MeshStandardMaterial({ color: 0x222833, roughness: .7 }));
    seat.position.set(0, .95, -.2); m.add(seat);
    const nose = new T.Mesh(new T.ConeGeometry(.7, 1.3, 4), new T.MeshStandardMaterial({ color: 0xf0f0f0, roughness: .4 }));
    nose.rotation.x = Math.PI / 2; nose.position.set(0, .55, 2.1); m.add(nose);
  }
  craft = new T.Group(); craft.add(m); scene.add(craft);
  // PUERTA de boyas: dos boyas (roja/verde) + aro luminoso
  gate = { grp: new T.Group(), x: 0, z: 0, on: false };
  const buoy = (col, dx) => { const gg = new T.Group();
    const body = new T.Mesh(new T.CylinderGeometry(.9, 1.1, 2.2, 10), new T.MeshStandardMaterial({ color: col, roughness: .5, emissive: col, emissiveIntensity: .35 }));
    body.position.y = 1; gg.add(body);
    const top = new T.Mesh(new T.SphereGeometry(.5, 8, 8), new T.MeshBasicMaterial({ color: col })); top.position.y = 2.3; gg.add(top);
    gg.position.x = dx; return gg; };
  gate.grp.add(buoy(0xff4455, -5.5)); gate.grp.add(buoy(0x35e0c0, 5.5));
  const arc = new T.Mesh(new T.TorusGeometry(5.5, .28, 8, 24, Math.PI), new T.MeshBasicMaterial({ color: 0xffe6a0 }));
  arc.position.y = 3.4; arc.rotation.z = Math.PI; gate.grp.add(arc);
  scene.add(gate.grp);
}

function placeGate() {
  const a = yaw + ARC.rnd(-.6, .6), d = ARC.rnd(58, 88);
  gate.x = sx + Math.sin(a) * d; gate.z = sz + Math.cos(a) * d;
  const L = Math.hypot(gate.x, gate.z); if (L > 300) { gate.x *= 300 / L; gate.z *= 300 / L; }
  gate.on = true; gate.grp.visible = true;
}

function start() {
  sx = 0; sz = 0; yaw = 0; v = 30; bank = 0;
  timeLeft = 45; score = 0; streak = 0; dead = false; tPlay = 0;
  placeGate();
}

function worldToScreen(x, y, z) { const p = new T.Vector3(x, y, z).project(cam);
  if (p.z > 1) return null; return { x: (p.x * .5 + .5) * ARC.W, y: (-p.y * .5 + .5) * ARC.H }; }

function step(dt) {
  if (dead) return; tPlay += dt; timeLeft -= dt;
  if (timeLeft <= 0) { timeLeft = 0; dead = true;
    ARC.over({ win: score >= 600, score, title: score >= 600 ? '¡DUEÑO DEL MAR!' : 'SE ACABÓ', coins: (score / 30 | 0) }); return; }
  // olas: desplazar vértices del agua
  if (waterGeo) { const p = waterGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) p[i + 1] = waveH(baseY[i], baseY[i + 2], tPlay);
    waterGeo.attributes.position.needsUpdate = true; waterGeo.computeVertexNormals(); }
  // dirección
  let ix = 0;
  if (keys.KeyA || keys.ArrowLeft) ix = -1; if (keys.KeyD || keys.ArrowRight) ix = 1;
  if (drag) ix += drag.x;
  yaw -= ix * dt * 1.7;
  bank += (ix * .5 - bank) * Math.min(1, dt * 6);
  sx += Math.sin(yaw) * v * dt; sz += Math.cos(yaw) * v * dt;
  const L = Math.hypot(sx, sz); if (L > 300) { sx *= 300 / L; sz *= 300 / L; }
  const wy = waveH(sx, sz, tPlay);
  craft.position.set(sx, wy + .2 + Math.sin(tPlay * 3) * .08, sz);
  craft.rotation.set(0, 0, 0); craft.rotateY(yaw + Math.PI);
  craft.rotateZ(-bank); craft.rotateX(-.06 + Math.sin(tPlay * 2) * .03);
  // cámara persecución baja sobre el agua
  const cd = 10;
  cam.position.set(sx - Math.sin(yaw) * cd, wy + 4.2, sz - Math.cos(yaw) * cd);
  cam.lookAt(sx + Math.sin(yaw) * 8, wy + 1.2, sz + Math.cos(yaw) * 8);
  // estela/spray 2D detrás de la moto
  sprayT -= dt;
  if (sprayT <= 0 && !dead) { sprayT = .05;
    const bp = worldToScreen(sx - Math.sin(yaw) * 2, wy + .4, sz - Math.cos(yaw) * 2);
    if (bp) { ARC.fx.burst(bp.x, bp.y, 'rgba(255,255,255,.9)', 3, 2.4); if (Math.abs(bank) > .25) ARC.fx.burst(bp.x, bp.y, 'rgba(210,240,255,.8)', 2, 3.2); } }
  // puerta
  if (gate.on) {
    gate.grp.position.set(gate.x, waveH(gate.x, gate.z, tPlay), gate.z);
    gate.grp.lookAt(sx, gate.grp.position.y, sz);
    const d2 = (sx - gate.x) ** 2 + (sz - gate.z) ** 2;
    if (d2 < 30) {
      streak++; const bonus = 4 + Math.min(3, streak * .5);
      timeLeft += bonus; score += 50 * Math.min(4, streak);
      const sp = worldToScreen(gate.x, gate.grp.position.y + 3, gate.z);
      if (sp) { ARC.fx.ring(sp.x, sp.y, '#ffe6a0', 16); ARC.fx.text(sp.x, sp.y - 26, '+' + bonus.toFixed(1) + 's', '#2fd1e0'); }
      ARC.sfx('coin', { vol: .6, rate: 1 + streak * .05 }); ARC.vib(20); ARC.shake(2);
      placeGate();
    }
  }
}

function draw2d(g) {
  const W = ARC.W, H = ARC.H;
  g.textAlign = 'center'; g.font = '900 34px system-ui';
  g.fillStyle = timeLeft < 8 ? '#ff5470' : '#fff'; g.fillText(timeLeft.toFixed(1) + 's', W / 2, 44);
  g.font = '900 20px system-ui'; g.fillStyle = '#2fd1e0'; g.fillText('racha x' + Math.min(4, Math.max(1, streak)), W / 2, 70);
  g.textAlign = 'left'; g.font = '900 26px system-ui'; g.fillStyle = '#fff'; g.fillText(score + '', 24, 42);
  g.font = '900 13px system-ui'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText((v * 3.6 | 0) + ' km/h', 24, 62);
  if (gate.on) {
    const gy = (water ? waveH(gate.x, gate.z, tPlay) : 0) + 3;
    const sp = worldToScreen(gate.x, gy, gate.z);
    if (sp && sp.x > 40 && sp.x < W - 40 && sp.y > 40 && sp.y < H - 40) {
      g.strokeStyle = '#ffe6a0'; g.lineWidth = 3;
      g.beginPath(); g.arc(sp.x, sp.y, 22 + Math.sin(tPlay * 5) * 4, 0, 6.28); g.stroke();
    } else {
      const ang = Math.atan2(gate.x - sx, gate.z - sz) - yaw;
      g.save(); g.translate(W / 2, 116); g.rotate(-ang);
      g.fillStyle = '#ffe6a0'; g.beginPath(); g.moveTo(0, -26); g.lineTo(14, 8); g.lineTo(-14, 8); g.closePath(); g.fill();
      g.restore();
    }
  }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W - 52, 16, 36, 36); g.fillStyle = '#fff'; g.font = '900 18px system-ui'; g.textAlign = 'center'; g.fillText('❚❚', W - 34, 40);
}

let menuA = 0;
function attract3d(dt) { menuA += dt * .4; tPlay = (tPlay || 0) + dt;
  if (waterGeo) { const p = waterGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) p[i + 1] = waveH(baseY[i], baseY[i + 2], tPlay);
    waterGeo.attributes.position.needsUpdate = true; }
  if (craft) { const wy = waveH(0, 0, tPlay); craft.position.set(0, wy + .2, 0); craft.rotation.set(0, menuA, 0); }
  if (cam) { cam.position.set(Math.cos(menuA) * 13, 4.5 + Math.sin(menuA * .7) * 1.2, Math.sin(menuA) * 13); cam.lookAt(0, 1.2, 0); }
}

function down(p) { if (p.x > ARC.W - 60 && p.y < 56) { window.ARC_pause(); return; } drag = { x0: p.x, x: 0 }; }
function move(p) { if (!drag) return; drag.x = ARC.clamp((p.x - drag.x0) / 110, -1, 1); }
function up() { drag = null; }
function key(code, dn) { keys[code] = dn; if (code === 'Escape' && dn) window.ARC_pause(); }

return {
  slug: 'marea', name: 'MAREA', sub: 'olas al atardecer', acc: '#2fd1e0', three: true, sky: '#e9b06a',
  best: 'PUNTOS',
  init3d, start, step, draw2d, attract3d, resize() {}, down, move, up, look() {}, key,
  dbg: {
    state: () => ({ score, t: timeLeft == null ? 0 : +timeLeft.toFixed(1), streak, dead, x: sx | 0, z: sz | 0 }),
    autoPlay() {
      if (dead || !gate.on) { drag = null; return; }
      const ty = Math.atan2(gate.x - sx, gate.z - sz);
      let dy = ty - yaw; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283;
      drag = { x0: 0, x: ARC.clamp(-dy * 2, -1, 1) };
    }
  }
};
})();
