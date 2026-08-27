/* ===== PROPS — sembrado denso de accesorios reutilizando modelos del repo ===
   Carga varios GLB una vez y los CLONA muchas veces por la escena para que los
   mundos no se vean vacíos. Cada def: {url, h(alto objetivo), weight, tag, y}. */
window.PROPS = (function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // carga las plantillas (una sola vez cada una) y las prepara
  async function load(THREE, defs) {
    const tpls = [];
    for (const d of defs) {
      try {
        const g = await ARC.loadGLB(d.url); const root = g.scene || (g.scenes && g.scenes[0]); if (!root) continue;
        const b = new THREE.Box3().setFromObject(root); const sz = b.getSize(new THREE.Vector3());
        const scl = (d.h || 3) / (sz.y || 1);
        root.traverse(o => { if (o.isMesh) { o.frustumCulled = true; o.castShadow = false; o.receiveShadow = false;
          if (o.material) { const m = o.material; if (m.metalness != null) m.metalness = Math.min(m.metalness, .35); if (m.emissive && m.emissiveIntensity != null && !d.glow) m.emissiveIntensity = Math.min(m.emissiveIntensity, .4); } } });
        tpls.push({ root, scl, minY: b.min.y, w: Math.max(sz.x, sz.z) * scl, weight: d.weight || 1, tag: d.tag || '', y: d.y || 0 });
      } catch (e) {}
    }
    return tpls;
  }

  // siembra `count` clones evitando keepOut(x,z)
  function scatter(THREE, scene, tpls, opts) {
    opts = opts || {}; if (!tpls || !tpls.length) return [];
    const pool = []; tpls.forEach((t, i) => { for (let k = 0; k < t.weight; k++) pool.push(i); });
    const rng = mulberry32(opts.seed || 7);
    const n = opts.count || 30, keep = opts.keepOut || (() => false);
    const R = opts.radius || 120, near = opts.near || 0, placed = [];
    let tries = 0;
    while (placed.length < n && tries < n * 60) {
      tries++;
      let x, z;
      if (opts.rect) { x = (rng() * 2 - 1) * opts.rect[0]; z = (rng() * 2 - 1) * opts.rect[1]; }
      else { const a = rng() * 6.283, r = near + Math.sqrt(rng()) * (R - near); x = Math.cos(a) * r; z = Math.sin(a) * r; }
      if (keep(x, z)) continue;
      const t = tpls[pool[(rng() * pool.length) | 0]];
      const m = t.root.clone(true);
      const s = t.scl * (.82 + rng() * .36);
      m.scale.setScalar(s);
      m.position.set(x, -t.minY * s + t.y + (opts.y || 0), z);
      m.rotation.y = rng() * 6.283;
      scene.add(m); placed.push({ m, x, z, tag: t.tag });
    }
    return placed;
  }

  // atajo: carga + siembra en un paso
  async function spawn(THREE, scene, defs, opts) {
    const tpls = await load(THREE, defs);
    return scatter(THREE, scene, tpls, opts);
  }
  return { load, scatter, spawn };
})();
