/* sonda headless para los juegos verticales: node _vert.js <slug> */
const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = process.argv[2] || 'burbujas';
const ok = [], bad = [];
const A = (c, m, x) => { (c ? ok : bad).push(m); console.log((c ? 'ok   ' : 'FALLA') + ' ' + m + (x !== undefined ? '  ' + JSON.stringify(x) : '')); };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=swiftshader', '--no-sandbox', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  for (const vp of [{ width: 412, height: 915 }, { width: 900, height: 430 }]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: true, deviceScaleFactor: 2 });
    const pg = await ctx.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    pg.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (!/404|Failed to load|decodeAudio/.test(t)) errs.push('C:' + t.slice(0, 140)); } });
    await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-' + slug + '.html?local', { waitUntil: 'load' });
    await sleep(5000);
    const tag = vp.width < vp.height ? 'V' : 'H';
    // carga: ldGo visible con tamaño
    const ld = await pg.evaluate(() => { const e = document.getElementById('ldGo'); const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
    A(ld.w > 10 && ld.h > 10, tag + ' pantalla de carga con botón', ld);
    await pg.mouse.click(ld.x, ld.y); await sleep(300);
    let st = await pg.evaluate(() => window.__ARC.state());
    A(st === 'menu', tag + ' JUGAR de carga entra al menú', st);
    // menú vivo: dos snaps
    const s1 = await pg.evaluate(() => window.__ARC.snap()); await sleep(700);
    const s2 = await pg.evaluate(() => window.__ARC.snap());
    A(s1.luz > .02 && s1.colores > 4, tag + ' el menú dibuja', s1);
    A(Math.abs(s1.luz - s2.luz) > .002 || s1.colores !== s2.colores, tag + ' el menú está VIVO', { a: s1, b: s2 });
    // JUGAR
    const pb = await pg.evaluate(() => { const e = document.getElementById('bPlay'); const r = e.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      const h = document.elementFromPoint(x, y); return { x, y, hit: h ? h.id : null }; });
    A(pb.hit === 'bPlay', tag + ' el botón JUGAR recibe el toque', pb);
    await pg.mouse.click(pb.x, pb.y); await sleep(300);
    st = await pg.evaluate(() => window.__ARC.state());
    A(st === 'game', tag + ' JUGAR entra en partida', st);
    const g1 = await pg.evaluate(() => window.__ARC.snap());
    A(g1.luz > .02 && g1.colores > 4, tag + ' la escena dibuja', g1);
    const d0 = await pg.evaluate(() => window.__ARC.dbg().state());
    // jugar solo ~16 acciones
    for (let i = 0; i < 16; i++) { await pg.evaluate(() => { const d = window.__ARC.dbg(); if (d.autoPlay) d.autoPlay(); }); await sleep(180); }
    const d1 = await pg.evaluate(() => window.__ARC.dbg().state());
    const st2 = await pg.evaluate(() => window.__ARC.state());
    A(JSON.stringify(d0) !== JSON.stringify(d1) || st2 === 'over', tag + ' el juego avanza jugando solo', { de: d0, a: d1, st: st2 });
    if (st2 === 'game') { // pausa
      await pg.evaluate(() => window.__ARC.pause()); await sleep(200);
      const sp = await pg.evaluate(() => window.__ARC.state());
      A(sp === 'pause', tag + ' la pausa responde', sp);
    } else A(true, tag + ' la partida terminó sola (ok)', st2);
    A(errs.length === 0, tag + ' sin errores de JS', errs.slice(0, 3));
    await ctx.close();
  }
  await b.close();
  console.log('\n' + slug.toUpperCase() + ': ' + ok.length + ' bien / ' + bad.length + ' mal');
  if (bad.length) process.exit(1);
})().catch(e => { console.log('SONDA ROTA: ' + (e && e.stack || e)); process.exit(1); });
