/* corre la simulacion SIN render para ver si el piloto automatico sube la torre entera */
const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--no-sandbox', '--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  pg.on('pageerror', e => console.log('ERR ' + e.message.slice(0, 160)));
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-torre.html?local', { waitUntil: 'load' });
  await sleep(4500);
  await pg.evaluate(() => window.__ARC.goMenu()); await sleep(300);
  await pg.evaluate(() => window.__ARC.play()); await sleep(600);
  const r = await pg.evaluate(() => {
    const G = window.GAME; G.dbg.autoPlay();
    const log = []; let stuck = 0, lastI = 0;
    for (let n = 0; n < 60 * 400; n++) {
      try { G.step(1 / 60); } catch (e) { return { err: '' + e, log }; }
      const st = G.dbg.state();
      if (n % (60 * 10) === 0) log.push(st.t + 's y=' + st.y + ' i=' + st.i + ' cp=' + st.cp + ' v=' + st.vidas + ' sc=' + st.score);
      if (st.dead) { log.push('FIN ' + JSON.stringify(st)); return { log }; }
      if (st.i === lastI) stuck++; else { stuck = 0; lastI = st.i; }
      if (stuck > 60 * 25) { log.push('TRABADO 25s en i=' + st.i + ' ' + JSON.stringify(st)); return { log }; }
    }
    log.push('sin terminar ' + JSON.stringify(G.dbg.state())); return { log };
  });
  console.log(r.log.join('\n')); if (r.err) console.log('THROW ' + r.err);
  await b.close();
})().catch(e => console.log('X', e.message));
