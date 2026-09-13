const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 506 } })).newPage();
  pg.on('pageerror', e => console.log('ERR ' + e.message.slice(0,150)));
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-torre.html?local', { waitUntil: 'load' });
  await sleep(4500);
  console.log(JSON.stringify(await pg.evaluate(() => { const G = window.GAME;
    window.__ARC.goMenu(); window.__ARC.play(); G.dbg.autoPlay();
    // sube un rato para tomar checkpoints, despues lo dejamos caer sin control
    for (let n = 0; n < 60 * 25; n++) G.step(1/60);
    const subio = G.dbg.state();
    // apagamos el piloto y lo empujamos al vacio una y otra vez
    const G2 = window.GAME; const log = [subio];
    for (let n = 0; n < 60 * 200; n++) { G2.dbg.tp(0); for (let k = 0; k < 8; k++) G2.step(1/60);
      G2.dbg.caer(); for (let k = 0; k < 200; k++) { G2.step(1/60); if (G2.dbg.state().dead) break; }
      log.push(G2.dbg.state()); if (G2.dbg.state().dead) break; }
    return { log, over: document.getElementById('ovTitle').textContent, sub: document.getElementById('ovSub').textContent, st: window.__ARC.state() };
  })));
  await b.close();
})().catch(e => console.log('X', e.message));
