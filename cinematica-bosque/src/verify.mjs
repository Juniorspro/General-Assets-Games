import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const file = process.argv[2], outDir = process.argv[3];
const targets = process.argv[4].split(',').map(s => { const [i, t] = s.split(':').map(Number); return { i, t } });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 720, height: 405 } });
const errs = [];
page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 400)));
await page.goto('file://' + file, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(8000);
await page.mouse.click(360, 200);
for (const tg of targets) {
  try {
    await page.waitForFunction(([i, t]) => { const d = window.__CDLV_DBG; return d && (d.idx > i || (d.idx === i && d.t >= t)) }, [tg.i, tg.t], { timeout: 400000, polling: 250 });
  } catch (e) { errs.push('timeout ' + tg.i + ':' + tg.t) }
  const d = await page.evaluate(() => window.__CDLV_DBG);
  await page.screenshot({ path: `${outDir}/f${tg.i}_${String(tg.t).replace('.', '_')}.png` });
  console.log(`shot ${tg.i}:${tg.t}`, JSON.stringify(d));
}
// saltar la intro y comprobar que el juego arranca limpio
await page.keyboard.press('e');
await page.waitForTimeout(500);
await page.mouse.click(360, 200);
await page.waitForTimeout(9000);
const after = await page.evaluate(() => ({
  split: (document.getElementById('cdlv-split') || {}).style?.display,
  viewTransform: (document.getElementById('view') || {}).style?.transform,
  subRight: (document.getElementById('subtitle') || {}).style?.right,
  screen: (document.getElementById('screen') || {}).style?.display,
}));
await page.screenshot({ path: `${outDir}/f_after_skip.png` });
console.log('AFTER-SKIP', JSON.stringify(after));
console.log('ERRORS', errs.length ? JSON.stringify(errs.slice(0, 6)) : 'none');
await browser.close();
