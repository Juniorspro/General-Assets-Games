import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file = process.argv[2], outDir = process.argv[3];
// targets: "idx:time,..." usando el salto de escena para no esperar toda la cinematica
const targets = process.argv[4].split(',').map(s => { const [i, t] = s.split(':').map(Number); return { i, t } });
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 720, height: 405 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 400)));
await page.goto('file://' + file, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(9000);
await page.mouse.click(360, 200);
await page.waitForFunction(() => window.__CDLV_DBG, null, { timeout: 120000 });
for (const tg of targets) {
  await page.evaluate(i => { window.__CDLV_JUMP = i }, tg.i);
  try {
    await page.waitForFunction(([i, t]) => { const d = window.__CDLV_DBG; return d && d.idx === i && d.t >= t },
      [tg.i, tg.t], { timeout: 300000, polling: 200 });
  } catch (e) { errs.push('timeout ' + tg.i + ':' + tg.t) }
  const d = await page.evaluate(() => window.__CDLV_DBG);
  await page.screenshot({ path: `${outDir}/h${tg.i}_${String(tg.t).replace('.', '_')}.png` });
  console.log(`shot ${tg.i}:${tg.t}`, JSON.stringify(d));
}
console.log('ERRORS', errs.length ? JSON.stringify(errs.slice(0, 5)) : 'none');
await browser.close();
