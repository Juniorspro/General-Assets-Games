/* ===== LIFE — vida y ambiente compartidos (islas, palmeras, NPCs, pájaros)
   y CONTROLES en pantalla (flechas + acelerador, multitáctil). Lo usan MAREA
   y ALAS para que todo combine. ======================================== */
window.LIFE = (function () {
  let T = null; const birds = [], wavers = []; let t = 0;

  function setup(THREE) { T = THREE; birds.length = 0; wavers.length = 0; t = 0; }

  /* palmera: usa el GLB si cargó, si no una procedural (tronco + coco + hojas) */
  function palmTemplate(glbRoot) {
    if (glbRoot) { const b = new T.Box3().setFromObject(glbRoot); const s = b.getSize(new T.Vector3());
      glbRoot.scale.setScalar(6.5 / (s.y || 1));
      glbRoot.traverse(o => { if (o.isMesh) { o.frustumCulled = true; if (o.material) o.material.metalness = 0; } });
      glbRoot.updateWorldMatrix(true, true); glbRoot.position.y = -new T.Box3().setFromObject(glbRoot).min.y;
      return () => glbRoot.clone(true); }
    // procedural
    const trunkMat = new T.MeshStandardMaterial({ color: 0x9c7a4a, roughness: .9 });
    const leafMat = new T.MeshStandardMaterial({ color: 0x3f9a4e, roughness: .8 });
    return () => { const g = new T.Group();
      const tr = new T.Mesh(new T.CylinderGeometry(.22, .34, 5.4, 7), trunkMat); tr.position.y = 2.7; tr.rotation.z = .12; g.add(tr);
      for (let i = 0; i < 6; i++) { const lf = new T.Mesh(new T.ConeGeometry(.5, 3, 5), leafMat);
        lf.position.set(0, 5.2, 0); lf.rotation.z = Math.PI / 2 - .5; lf.rotation.y = i / 6 * 6.28; lf.translateY(1.4); g.add(lf); }
      return g; };
  }

  /* NPC de playa: figura simple que saluda */
  function npc(x, y, z, col) {
    const g = new T.Group(); g.position.set(x, y, z);
    const body = new T.Mesh(new T.CapsuleGeometry(.28, .7, 4, 8), new T.MeshStandardMaterial({ color: col, roughness: .7 })); body.position.y = .65; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(.26, 10, 10), new T.MeshStandardMaterial({ color: 0xe8b98a, roughness: .8 })); head.position.y = 1.28; g.add(head);
    const arm = new T.Mesh(new T.CapsuleGeometry(.09, .5, 4, 6), new T.MeshStandardMaterial({ color: col, roughness: .7 })); arm.position.set(.34, .95, 0); g.add(arm);
    wavers.push({ arm, ph: Math.random() * 6.28 });
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
  }

  /* isla de arena con palmeras, sombrilla y gente */
  function island(scene, x, z, r, mkPalm, opts) {
    opts = opts || {}; const y0 = opts.y || 0; const g = new T.Group(); g.position.set(x, y0, z);
    const sand = new T.Mesh(new T.SphereGeometry(r, 18, 12), new T.MeshStandardMaterial({ color: 0xe7d6a2, roughness: .97 }));
    sand.scale.y = .32; sand.position.y = -r * .12; g.add(sand);
    const grass = new T.Mesh(new T.SphereGeometry(r * .7, 16, 10), new T.MeshStandardMaterial({ color: 0x6fae55, roughness: .9 }));
    grass.scale.y = .22; grass.position.y = r * .07; g.add(grass);
    const np = 1 + (Math.random() * 3 | 0);
    for (let i = 0; i < np; i++) { const p = mkPalm(); const a = Math.random() * 6.28, rr = r * (.1 + Math.random() * .5);
      p.position.set(Math.cos(a) * rr, r * .07, Math.sin(a) * rr); p.scale.multiplyScalar(.7 + Math.random() * .5); p.rotation.y = Math.random() * 6.28; g.add(p); }
    if (Math.random() < .6) { // sombrilla
      const pole = new T.Mesh(new T.CylinderGeometry(.05, .05, 1.6, 6), new T.MeshStandardMaterial({ color: 0xdddddd })); pole.position.set(r * .3, r * .07 + .8, 0); g.add(pole);
      const cano = new T.Mesh(new T.ConeGeometry(1.1, .6, 10), new T.MeshStandardMaterial({ color: 0xff5470, roughness: .6 })); cano.position.set(r * .3, r * .07 + 1.7, 0); g.add(cano); }
    if (opts.npc !== false) { const cols = [0x3a7bd5, 0xffd23f, 0xff7043, 0xffffff];
      const nn = 1 + (Math.random() * 2 | 0); for (let i = 0; i < nn; i++) { const a = Math.random() * 6.28, rr = r * (.2 + Math.random() * .4);
        g.add(npc(Math.cos(a) * rr, r * .07, Math.sin(a) * rr, cols[Math.random() * cols.length | 0])); } }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g); return g;
  }

  /* bandada de pájaros: V oscura que aletea y da vueltas */
  function flock(scene, opts) {
    opts = opts || {}; const n = opts.count || 14, area = opts.area || 240, ylo = opts.ylo == null ? 18 : opts.ylo, yhi = opts.yhi == null ? 46 : opts.yhi;
    const wingMat = new T.MeshStandardMaterial({ color: 0x33373f, roughness: .9, side: T.DoubleSide });
    for (let i = 0; i < n; i++) { const g = new T.Group();
      const wl = new T.Mesh(new T.BoxGeometry(1.5, .05, .5), wingMat); wl.position.x = -.8; g.add(wl);
      const wr = new T.Mesh(new T.BoxGeometry(1.5, .05, .5), wingMat); wr.position.x = .8; g.add(wr);
      const body = new T.Mesh(new T.BoxGeometry(.4, .18, 1), wingMat); g.add(body);
      const cx = (Math.random() * 2 - 1) * area * .6, cz = (Math.random() * 2 - 1) * area * .6, rad = 20 + Math.random() * area * .3;
      g.scale.setScalar(1 + Math.random() * 1.4);
      scene.add(g); birds.push({ g, wl, wr, cx, cz, rad, y: ylo + Math.random() * (yhi - ylo), ph: Math.random() * 6.28, sp: .12 + Math.random() * .12, fp: Math.random() * 6.28 }); }
  }

  function update(dt) { t += dt;
    for (const b of birds) { b.ph += b.sp * dt; const x = b.cx + Math.cos(b.ph) * b.rad, z = b.cz + Math.sin(b.ph) * b.rad;
      b.g.position.set(x, b.y + Math.sin(t + b.fp) * 1.2, z); b.g.rotation.y = -b.ph + Math.PI / 2;
      const f = Math.sin(t * 8 + b.fp) * .5; b.wl.rotation.z = f; b.wr.rotation.z = -f; }
    for (const w of wavers) { w.arm.rotation.z = -1 + Math.sin(t * 3 + w.ph) * .6; }
  }

  /* ---- CONTROLES en pantalla: ◀ ▶ + acelerador (multitáctil) ---- */
  function pad(opts) {
    opts = opts || {}; const LW = 960, LH = 540; const st = { steer: 0, boost: false };
    const tmap = {}; let mouse = null;
    const logi = (cx, cy) => { const vw = innerWidth, vh = innerHeight, rot = vh > vw ? 90 : 0;
      const S = rot ? Math.min(vh / LW, vw / LH) : Math.min(vw / LW, vh / LH);
      const px = cx - vw / 2, py = cy - vh / 2; let lx, ly; if (rot) { lx = py / S; ly = -px / S; } else { lx = px / S; ly = py / S; }
      return { x: lx + LW / 2, y: ly + LH / 2 }; };
    // zonas lógicas
    const Z = { L: [40, 396, 150, 508], R: [168, 396, 278, 508], B: [726, 350, 922, 512], P: [900, 8, 948, 60] };
    const inZ = (p, z) => p.x >= z[0] && p.x <= z[2] && p.y >= z[1] && p.y <= z[3];
    const roleOf = p => { if (inZ(p, Z.P)) return 'P'; if (inZ(p, Z.L)) return 'L'; if (inZ(p, Z.R)) return 'R'; if (inZ(p, Z.B)) return 'B'; return null; };
    const recompute = () => { let l = 0, r = 0, b = false; const all = Object.values(tmap); if (mouse) all.push(mouse);
      for (const ro of all) { if (ro === 'L') l = 1; if (ro === 'R') r = 1; if (ro === 'B') b = true; } st.steer = r - l; st.boost = b; };
    const onStart = (id, p) => { const ro = roleOf(p); if (ro === 'P') { if (opts.onPause) opts.onPause(); return; } if (ro) { if (id === 'm') mouse = ro; else tmap[id] = ro; recompute(); } };
    const onEnd = id => { if (id === 'm') mouse = null; else delete tmap[id]; recompute(); };
    addEventListener('touchstart', e => { for (const tc of e.changedTouches) onStart(tc.identifier, logi(tc.clientX, tc.clientY)); }, { passive: true });
    addEventListener('touchend', e => { for (const tc of e.changedTouches) onEnd(tc.identifier); }, { passive: true });
    addEventListener('touchcancel', e => { for (const tc of e.changedTouches) onEnd(tc.identifier); }, { passive: true });
    addEventListener('mousedown', e => onStart('m', logi(e.clientX, e.clientY)));
    addEventListener('mouseup', () => onEnd('m'));
    st.draw = (g, acc) => { acc = acc || '#2fd1e0';
      const btn = (z, txt, on) => { g.fillStyle = on ? acc : 'rgba(0,0,0,.34)'; g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
        const w = z[2] - z[0], h = z[3] - z[1], rad = 16; g.beginPath();
        g.moveTo(z[0] + rad, z[1]); g.arcTo(z[2], z[1], z[2], z[3], rad); g.arcTo(z[2], z[3], z[0], z[3], rad); g.arcTo(z[0], z[3], z[0], z[1], rad); g.arcTo(z[0], z[1], z[2], z[1], rad); g.fill(); g.stroke();
        g.fillStyle = on ? '#062027' : '#fff'; g.font = '900 34px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, z[0] + w / 2, z[1] + h / 2 + 1); };
      btn(Z.L, '◀', st.steer < 0); btn(Z.R, '▶', st.steer > 0); btn(Z.B, st.boost ? '🚀' : 'GAS', st.boost); g.textBaseline = 'alphabetic'; };
    return st;
  }

  return { setup, palmTemplate, npc, island, flock, update, pad };
})();
