const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--no-sandbox', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-torre.html?local', { waitUntil: 'load' });
  await sleep(4500);
  const L = await pg.evaluate(() => window.GAME.dbg.lay());
  await b.close();
  // analisis de alcanzabilidad: salto v0=17 (tram 26.5), g=34, vel 7.2
  const G = 34, SPD = 7.2;
  let peor = [];
  for (let i = 1; i < L.length; i++) {
    const a = L[i - 1], c = L[i];
    const v0 = a.t === 'tram' ? 26.5 : 17;
    const dy = c.y - a.y;
    // distancia entre BORDES (desde el borde de a hacia el centro de c)
    const dx = Math.abs(c.x - a.x), dz = Math.abs(c.z - a.z);
    const dist = Math.hypot(dx, dz);
    const margen = Math.min(a.w, a.d) / 2 * .8;            // podes despegar desde el borde
    const efectiva = Math.max(0, dist - margen);
    // tiempo maximo de vuelo a esa altura
    const disc = v0 * v0 - 2 * G * dy;
    let alcance = -1;
    if (disc >= 0) { const t2 = (v0 + Math.sqrt(disc)) / G; alcance = SPD * t2; }
    // margen de amplitud de plataformas moviles/giratorias
    const extra = (a.amp || 0) + (a.orad || 0) + (c.amp || 0) + (c.orad || 0);
    peor.push({ i, dy: +dy.toFixed(2), dist: +dist.toFixed(2), ef: +efectiva.toFixed(2),
      alc: +alcance.toFixed(2), holgura: +(alcance - efectiva - extra).toFixed(2), de: a.t, a: c.t, extra: +extra.toFixed(1) });
  }
  peor.sort((x, y) => x.holgura - y.holgura);
  console.log('PEORES SALTOS (holgura = alcance - distancia - amplitud de moviles):');
  for (const p of peor.slice(0, 14)) console.log(JSON.stringify(p));
  console.log('altura total: ' + L[L.length - 1].y + '  plataformas: ' + L.length);
  const cnt = {}; for (const p of L) cnt[p.t] = (cnt[p.t] || 0) + 1;
  console.log('tipos: ' + JSON.stringify(cnt) + '  checkpoints: ' + L.filter(p => p.cp).length);
})().catch(e => console.log('X', e.message));
