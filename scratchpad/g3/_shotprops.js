const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const slug = process.argv[2] || 'vertigo';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--no-sandbox', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await (await b.newContext({ viewport: { width: 900, height: 506 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  await pg.goto('http://127.0.0.1:8951/scratchpad/g3/arc-' + slug + '.html?local', { waitUntil: 'load' });
  await sleep(4500);
  await pg.evaluate(() => window.__ARC.goMenu()); await sleep(600);
  await pg.evaluate(() => window.__ARC.play()); await sleep(3500);
  if (slug === 'horda') await pg.evaluate(() => { const d = window.__ARC.dbg(); if (d.tp) d.tp(40, 20); });
  await sleep(2500);
  await pg.screenshot({ path: slug + '-props.png' });
  await b.close(); console.log('shot ' + slug);
})().catch(e => console.log('X', e.message));
