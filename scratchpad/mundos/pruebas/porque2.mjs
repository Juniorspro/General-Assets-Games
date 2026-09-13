/* ¿POR QUÉ NO AVANZA EL CAPÍTULO ESTANDO ENCIMA DEL OBJETIVO?
   Desarma la condición pieza por pieza en vivo. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const mundo = process.argv[2] || 'dunas';
const RUTA = mundo === 'senda' ? 'senda/senda.html' : 'mundos/' + mundo + '.html';
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 420, height: 260 }, hasTouch: true });
p.on('pageerror', e => console.log('  PAGEERROR ' + e.message.slice(0, 200)));
await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
await p.goto(base + 'assets/' + RUTA + '?local', { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__S && document.querySelector('canvas'), null, { timeout: 180000 });
await p.waitForTimeout(2600);
await p.evaluate(() => { const j = document.getElementById('mJugar'); if (j) j.click(); });
await p.waitForTimeout(1500);
await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
for (let i = 0; i < 20; i++){
  if (!(await p.evaluate(() => window.__S.get().enDlg))) break;
  await p.evaluate(() => { try { window.__S.dlgOk(); } catch (e) {} });
  await p.waitForTimeout(220);
}
/* caminar de verdad hasta el objetivo del capítulo actual, como un jugador */
const r = await p.evaluate(async () => {
  const S = window.__S;
  const g0 = S.get();
  const C = S.CAPS[g0.cap], P = S.POI[C.obj];
  S.tp(P.x + 2, P.z + 2);
  await new Promise(r => setTimeout(r, 1200));
  const g = S.get();
  /* leemos la condición completa desde adentro */
  const dump = {
    fase: g.fase, cap: g.cap, enDlg: g.enDlg, dObj: g.dObj,
    usarDeclarado: !!C.usar, obj: C.obj,
    fps: g.fps,
    tieneMision: typeof S.mision === 'function',
    mision: (() => { try { return S.mision(); } catch (e) { return 'ERR ' + e.message; } })(),
    accion: (() => { try { return S.accion(); } catch (e) { return 'ERR ' + e.message; } })(),
    botonOn: g.usar,
    marcaVisible: (() => { try { return S.scene ? undefined : undefined; } catch (e) {} })(),
    objDtexto: document.getElementById('objD') && document.getElementById('objD').textContent,
    avisoTexto: document.getElementById('aviso') && document.getElementById('aviso').textContent,
    hudOn: document.getElementById('hud') && document.getElementById('hud').className,
  };
  return dump;
});
console.log(mundo + ':');
for (const k of Object.keys(r)) console.log('   ' + k.padEnd(16), JSON.stringify(r[k]));
/* y dejamos correr 8 s a ver si avanza solo */
for (let i = 0; i < 20; i++){
  await p.waitForTimeout(400);
  const g = await p.evaluate(() => window.__S.get());
  if (g.cap !== r.cap){ console.log('   -> avanzó a cap ' + g.cap + ' tras ' + ((i + 1) * .4) + ' s'); break; }
  if (g.enDlg){ console.log('   -> se abrió diálogo tras ' + ((i + 1) * .4) + ' s'); break; }
  if (i === 19) console.log('   -> 8 s parado ENCIMA del objetivo y no pasa nada (dObj=' + g.dObj + ')');
}
await b.close(); server.close();
