/* ===== PERSONAJE COMPARTIDO (patrón del sux) ==============================
   Carga char.glb + clips (idle/run/…), resuelve huesos tolerante a prefijos,
   escala el modelo a una altura dada y engancha un arma en la mano derecha
   deshaciendo la escala del hueso. API:
     const c = await CHAR.load(T, { alto:1.8, clips:{idle:URL, run:URL, ...} })
     c.root (agregar a escena) · c.play('run', fade) · c.update(dt)
     await c.equip(URL_arma, {esc, pos, rot})  → arma en la mano derecha
============================================================================ */
window.CHAR = (function () {
function pick(low, alts) {
  for (const a of alts) { const k = String(a).toLowerCase();
    if (low[k]) return low[k];
    for (const n in low) if (n.endsWith(':' + k) || n.endsWith('_' + k) || n.endsWith('.' + k)) return low[n]; }
  return null;
}
function boneMap(root) {
  const low = {};
  root.traverse(o => { if (o.isBone && !low[o.name.toLowerCase()]) low[o.name.toLowerCase()] = o; });
  return {
    hips: pick(low, ['hips', 'pelvis']), head: pick(low, ['head']),
    rHand: pick(low, ['righthand', 'hand_r', 'r_hand']),
    lHand: pick(low, ['lefthand', 'hand_l', 'l_hand']),
    rFore: pick(low, ['rightforearm', 'forearm_r']),
    chest: pick(low, ['spine', 'spine2', 'chest'])
  };
}
async function load(T, opt) {
  opt = opt || {};
  const g = await ARC.loadGLB(opt.url || MDL.char);
  const root = g.scene;
  // escala a la altura pedida
  const box = new T.Box3().setFromObject(root), sz = box.getSize(new T.Vector3());
  const k = (opt.alto || 1.8) / (sz.y || 1);
  root.scale.setScalar(k);
  root.traverse(o => { if (o.isMesh) { o.frustumCulled = false;
    const m = o.material; if (m) {
      m.metalness = 0;
      /* char.glb trae emissiveFactor blanco y specular 2.0: con environment se
         quema a blanco puro. Se apagan salvo que haya mapa emisivo. */
      if (m.emissive && !m.emissiveMap) m.emissive.setRGB(0, 0, 0);
      if ('specularIntensity' in m) m.specularIntensity = 0;
      m.envMapIntensity = .35;
    } } });
  const bones = boneMap(root);
  const mixer = new T.AnimationMixer(root);
  const acts = {};
  // clip propio del char (si trae) como idle de respaldo
  if (g.animations && g.animations.length) acts._self = mixer.clipAction(g.animations[0]);
  const clips = opt.clips || {};
  await Promise.all(Object.keys(clips).map(async name => {
    try { const cg = await ARC.loadGLB(clips[name]);
      if (cg.animations && cg.animations.length) { acts[name] = mixer.clipAction(cg.animations[0]); }
    } catch (e) {}
  }));
  let cur = null;
  const c = {
    root, bones, mixer, acts, k,
    play(name, fade) {
      const a = acts[name] || acts._self; if (!a || a === cur) return;
      fade = fade == null ? .22 : fade;
      a.reset().setEffectiveWeight(1).fadeIn(fade).play();
      if (cur) cur.fadeOut(fade);
      cur = a;
    },
    playing() { for (const n in acts) if (acts[n] === cur) return n; return null; },
    update(dt, ts) { mixer.timeScale = ts == null ? 1 : ts; mixer.update(dt); },
    async equip(url, o) {
      o = o || {};
      const wg = await ARC.loadGLB(url); const w = wg.scene;
      w.traverse(m => { if (m.isMesh) { m.frustumCulled = false; if (m.material) m.material.metalness = .2; } });
      const b = bones.rHand || bones.rFore; if (!b) return null;
      b.add(w);
      // deshacer la escala mundial del hueso (sux: holdWeapon)
      b.updateWorldMatrix(true, false);
      const v = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3();
      b.matrixWorld.decompose(v, q, s);
      const kk = (o.esc || 1) / Math.max(.0001, s.x);
      w.scale.set(kk, kk, kk);
      w.position.set(o.px || 0, o.py || 0, o.pz || 0);
      w.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
      return w;
    }
  };
  return c;
}
return { load };
})();
