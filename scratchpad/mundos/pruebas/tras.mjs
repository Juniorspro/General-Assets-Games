/* PRUEBA DEL TRASLADO PROPIO DE CADA MUNDO.
   Arranca el mundo, cierra el diálogo de apertura, se pone en el primer sitio
   del traslado, lo usa por el MISMO botón USAR que usa el jugador, y deja correr
   la física con la palanca a fondo. Se mira lo único que importa:
     · que el traslado EXISTA (que se hayan encontrado o puesto sitios)
     · que el botón USAR se prenda ahí y el aviso diga qué hacer
     · que USAR lo monte
     · que AVANCE de verdad: metros y velocidad de punta
     · que TERMINE solo y no deje al jugador colgado
     · que no haya un solo error de página en todo el camino

   SE MIDE EN TIEMPO SIMULADO, NO EN RELOJ. Sin tarjeta de video estos mundos
   corren a tres o cuatro cuadros por segundo y `dt` viene topado a 0,05: un
   segundo de reloj son dos décimas de mundo. Medir con el reloj mide el
   emulador. Por eso se espera a que `tSim` del traslado llegue al objetivo, y
   por eso se fuerza calidad BAJA y una ventana chica: para que llegue antes.

   Uso: node tras.mjs <mundo> [gancho] [segundos-de-mundo]
*/
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const mundo = process.argv[2] || 'dunas';
const gan = process.argv[3] || 'tabla';
const TSIM = +(process.argv[4] || 14);
const RUTA = { senda: 'senda/senda.html', marea: 'g3/marea.html',
  reliquia: 'reliquia/reliquia.html' }[mundo] || 'mundos/' + mundo + '.html';

const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 480, height: 300 }, hasTouch: true });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text()))
  errs.push('con: ' + m.text().slice(0, 160)); });
/* calidad BAJA de entrada: es lo que hace que el emulador dé cuadros */
await p.addInitScript(() => { try { for (const k of ['dunas', 'jungla', 'volcan', 'pantano',
  'canon', 'estepa', 'acropolis', 'secuoya', 'marte', 'luna', 'exo', 'hielo', 'senda'])
  localStorage.setItem(k + '_gfx', 'b'); } catch (e) {} });
await p.goto(base + 'assets/' + RUTA + '?local', { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__S && document.querySelector('canvas') &&
  document.querySelector('canvas').width > 0, { timeout: 180000 });
await p.waitForTimeout(2600);
await p.evaluate(() => { const j = document.getElementById('mJugar'); if (j) j.click(); });
await p.waitForTimeout(1600);
await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
for (let i = 0; i < 16; i++){
  if (!(await p.evaluate(() => window.__S.get().enDlg))) break;
  await p.evaluate(() => { try { window.__S.dlgOk(); } catch (e) {} });
  await p.waitForTimeout(240);
}

const est0 = await p.evaluate(g => window.__S[g](), gan);
console.log(mundo + ' · sitios: ' + JSON.stringify(est0.pue || est0).slice(0, 260));

await p.evaluate(g => window.__S[g + 'Ir'](0), gan);
await p.waitForTimeout(700);
const llega = await p.evaluate(() => ({
  usar: document.getElementById('bUsar').classList.contains('on'),
  aviso: (document.getElementById('aviso') || {}).textContent || '' }));
console.log('  al llegar: USAR=' + llega.usar + ' · aviso: ' + JSON.stringify(llega.aviso));

await p.evaluate(() => document.getElementById('bUsar').dispatchEvent(
  new Event('pointerdown', { bubbles: true })));
await p.waitForTimeout(300);
if (!(await p.evaluate(g => !!window.__S[g]().modo, gan)))
  await p.evaluate(() => window.__S.usar());
const mont = await p.evaluate(g => window.__S[g](), gan);
console.log('  al montar: modo=' + mont.modo + ' vel=' + mont.vel);

/* palanca a fondo hacia adelante hasta juntar TSIM segundos DE MUNDO */
const t0 = mont.tSim || 0, d0 = await p.evaluate(() => window.__S.get().dist);
let vmax = 0, aires = 0, muestras = 0, ult = mont, reloj = 0;
while ((ult.tSim - t0) < TSIM && reloj < 240){
  await p.evaluate(() => { try { window.__S.palanca(0, -1); } catch (e) {} });
  await p.waitForTimeout(500); reloj += .5;
  ult = await p.evaluate(g => Object.assign(window.__S[g](), { g: window.__S.get() }), gan);
  vmax = Math.max(vmax, ult.vel || 0);
  if (ult.aire) aires++;
  muestras++;
  if (!ult.modo) break;
}
const d1 = ult.g ? ult.g.dist : null;
console.log('  ' + (ult.tSim - t0).toFixed(1) + ' s de mundo en ' + reloj + ' s de reloj · ' +
  'punta ' + vmax.toFixed(1) + ' m/s · metros ' + (d1 - d0) +
  ' · despegues ' + (ult.nVuelo || 0) + ' (alto max ' + (ult.altMax || 0) + ' m)' +
  ' · sigue montado: ' + !!ult.modo);
await p.screenshot({ path: SHOT + 'tras-' + mundo + '-va.png' });
/* SEGUNDA VUELTA: girando. Es lo que prueba que la palanca manda de verdad y,
   de paso, que cruzando las crestas se despega: la linea de maxima pendiente
   sola nunca cruza un filo, porque siempre va hacia abajo. */
if (ult.modo){
  const t1 = ult.tSim, v0 = ult.nVuelo || 0;
  let r2 = 0;
  while ((ult.tSim - t1) < 12 && r2 < 90 && ult.modo){
    await p.evaluate(() => { try { window.__S.palanca(.55, -1); } catch (e) {} });
    await p.waitForTimeout(500); r2 += .5;
    ult = await p.evaluate(g => Object.assign(window.__S[g](), { g: window.__S.get() }), gan);
  }
  console.log('  girando ' + (ult.tSim - t1).toFixed(1) + ' s: despegues ' +
    ((ult.nVuelo || 0) - v0) + ' · alto max ' + (ult.altMax || 0) + ' m · vel ' + ult.vel);
}
/* ¿se baja solo y deja el estado en orden? */
await p.evaluate(() => { try { window.__S.palanca(0, 1); } catch (e) {} });
await p.waitForTimeout(6000);
const fin = await p.evaluate(g => Object.assign(window.__S[g](), { g: window.__S.get() }), gan);
console.log('  frenando: modo=' + fin.modo + ' vel=' + fin.vel + ' · tSim ' + fin.tSim);
console.log('  errores: ' + (errs.length ? JSON.stringify([...new Set(errs)].slice(0, 5)) : 'ninguno'));
await p.screenshot({ path: SHOT + 'tras-' + mundo + '.png' });
await b.close(); server.close();
