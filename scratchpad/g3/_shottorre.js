const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const idx = +(process.argv[2] || 60), out = process.argv[3] || ('torre-alto' + idx + '.png');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--no-sandbox', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 506 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  pg.on('pageerror', e => console.log('ERR ' + e.message.slice(0, 140)));
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-torre.html?local', { waitUntil: 'load' });
  await sleep(4500);
  await pg.evaluate(() => window.__ARC.goMenu()); await sleep(400);
  await pg.evaluate(() => window.__ARC.play()); await sleep(900);
  await pg.evaluate(i => window.__ARC.dbg().tp(i), idx); await sleep(5000);
  console.log(JSON.stringify(await pg.evaluate(() => window.__ARC.dbg().state())));
  await pg.screenshot({ path: out }); await b.close(); console.log('shot ' + out);
})().catch(e => console.log('X', e.message));
