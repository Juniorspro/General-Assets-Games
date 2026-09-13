const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--no-sandbox', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 506 }, deviceScaleFactor: 1 })).newPage();
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-' + (process.argv[2]||'torre') + '.html?local', { waitUntil: 'load' });
  await sleep(4500);
  await pg.evaluate(() => window.__ARC.goMenu()); await sleep(300);
  await pg.evaluate(() => window.__ARC.play());
  if (process.argv[3]) await pg.evaluate(i => window.__ARC.dbg().tp(+i), process.argv[3]);
  await sleep(6000);
  const r = await pg.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now();
    const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res({ fps: +(n / ((performance.now()-t0)/1000)).toFixed(1), tri: null }); }; requestAnimationFrame(f); }));
  const info = await pg.evaluate(() => { const r = window.ARC.renderer; return { calls: r.info.render.calls, tri: r.info.render.triangles, tex: r.info.memory.textures, prog: r.info.programs.length }; });
  console.log(JSON.stringify(Object.assign(r, info)));
  await b.close();
})().catch(e => console.log('X', e.message));
