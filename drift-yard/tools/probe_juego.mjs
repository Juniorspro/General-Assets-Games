/* Comprueba que el tutorial NO se llevó por delante el juego.

   Un tutorial que engancha la cámara, los mandos y la escala de tiempo puede dejar rastro: mandos
   que siguen escritos por el tutorial, cámara lenta pegada, o el reloj de la partida congelado
   porque la clase lo congeló y nadie lo devolvió. Aquí se juega una partida NORMAL después de la
   clase y se mide que todo eso volvió a su sitio.

   También se comprueba lo que no se ve desde un solo idioma ni desde un solo tamaño: que los
   textos existen en los tres idiomas (una clave que falte sale como "undefined" en pantalla) y que
   con el móvil en vertical, donde el juego se presenta girado 90°, la tarjeta del instructor sigue
   sin tapar ningún mando. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';

const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const { server, base } = await serve();
const browser = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader',
                                              '--autoplay-policy=no-user-gesture-required'] });
const fallos = [], errs = [];
const ok = (n, c, d) => { console.log((c ? '  OK    ' : '  FALLA ') + n + (d !== undefined ? '  ' + d : ''));
  if (!c) fallos.push(n); };

async function abrir(w, h){
  const page = await browser.newPage({ viewport:{ width:w, height:h }, hasTouch:true });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0,180)));
  await page.goto(base + 'index.html?dev', { waitUntil:'domcontentloaded', timeout:120000 });
  await page.waitForFunction('window.__dy', { timeout:120000 });
  await page.waitForFunction('!!document.getElementById("onboard")', { timeout:240000 });
  for (const f of [() => document.querySelectorAll('#onboard .obbtn')[0].click(),
                   () => document.getElementById('obok').click(),
                   () => document.getElementById('obok').click(),
                   () => document.querySelector('#onboard .obbtn').click()]){
    await page.evaluate(f); await page.waitForTimeout(250); }
  await page.waitForTimeout(900);
  return page;
}
const wait = (p, ms) => p.waitForTimeout(ms);

/* ---------- 1. una partida normal después de la clase ---------- */
console.log('1 partida normal después de la clase');
{
  const page = await abrir(844, 390);
  // saltar la clase como haría cualquiera que ya sabe jugar
  await page.evaluate(() => window.__dy.tutFinish());
  await wait(page, 700);
  const t = await page.evaluate(() => window.__dy.tut());
  ok('la clase queda apagada', !t.active && t.slow === 1 && t.auto === null,
     JSON.stringify({ active:t.active, slow:t.slow, auto:t.auto }));

  // JUGAR -> mapa 0 -> elegir -> atardecer
  const clic = (sel, filtro) => page.evaluate(([s, f]) => {
    const b = [...document.querySelectorAll(s)];
    const el = f ? b.find(x => new RegExp(f, 'i').test(x.textContent)) : b[0];
    if (el) el.click(); return !!el; }, [sel, filtro || null]);
  ok('el menú tiene el botón de jugar', await clic('#s_title .btn', 'JUGAR|PLAY|JOGAR'));
  await wait(page, 700);
  await clic('#s_maps .btn');
  await wait(page, 1400);
  await clic('#garage_ui .btn', 'ELEGIR|SELECT|ESCOLHER');
  await wait(page, 700);
  await clic('#s_time .btn', 'ATARDECER|SUNSET|ENTARDECER');
  await wait(page, 2500);

  const m = await page.evaluate(() => window.__dy.state());
  ok('entra a la pista', m.mode === 'race', 'modo=' + m.mode);
  let s = await page.evaluate(() => { const x = window.__dy.sess();
    return { armed:!!x.armed, t:+x.t.toFixed(1), grid:!!x.gridHold }; });
  ok('el reloj de la partida corre (la clase lo congelaba)', s.armed === true, 'armed=' + s.armed);
  ok('el coche no quedó frenado por el tutorial', s.grid === false, 'gridHold=' + s.grid);
  const t0 = s.t;
  await wait(page, 1800);
  s = await page.evaluate(() => { const x = window.__dy.sess(); return { t:+x.t.toFixed(1) }; });
  ok('el reloj descuenta de verdad', s.t < t0 - .8, t0 + ' -> ' + s.t);

  // derrapar con el freno de mano y comprobar que puntúa como siempre
  await page.keyboard.down('w');
  await wait(page, 2600);
  await page.keyboard.down('d'); await page.keyboard.down(' ');
  await wait(page, 3000);
  const y = await page.evaluate(() => { const x = window.__dy.sess();
    return { cur:Math.round(x.cur), beta:Math.round(x.beta*57.3), hb:!!x.hbDrift }; });
  await page.keyboard.up('w'); await page.keyboard.up('d'); await page.keyboard.up(' ');
  ok('el derrape puntúa en una partida normal', y.cur > 0,
     JSON.stringify(y));
  await wait(page, 2600);
  const z = await page.evaluate(() => Math.round(window.__dy.sess().total));
  ok('y se banca al enderezar', z > 0, 'total=' + z);

  // pausa y vuelta
  await page.keyboard.press('p');
  await wait(page, 700);
  ok('la pausa funciona', (await page.evaluate(() => window.__dy.state().mode)) === 'pause');
  await page.evaluate(() => { const b = [...document.querySelectorAll('#s_pause .btn')]
    .find(x => /SEGUIR|RESUME|CONTINUAR/i.test(x.textContent)); if (b) b.click(); });
  await wait(page, 700);
  ok('y se puede seguir jugando', (await page.evaluate(() => window.__dy.state().mode)) === 'race');
  const esc = await page.evaluate(() => window.__dy.tut().slow);
  ok('no queda cámara lenta pegada', esc === 1, 'escala=' + esc);
  await page.screenshot({ path: SHOT + 'dy-juego.png' });
  await page.close();
}

/* ---------- 2. los tres idiomas ---------- */
console.log('\n2 los textos existen en los tres idiomas');
{
  const page = await abrir(844, 390);
  for (const lang of ['es','en','pt']){
    const r = await page.evaluate(async l => {
      const s = JSON.parse(localStorage.getItem('driftyard.save.v2') || '{}');
      s.lang = l; s.tutDone = false; localStorage.setItem('driftyard.save.v2', JSON.stringify(s));
      return true; }, lang);
    await page.reload({ waitUntil:'domcontentloaded', timeout:120000 });
    await page.waitForFunction('window.__dy', { timeout:120000 });
    await page.waitForFunction('window.__dy.tut().active', { timeout:240000 });
    await page.evaluate(() => window.__dy.tutSkipCine());
    await wait(page, 600);
    // recorrer los textos de todos los pasos sin jugarlos
    const txts = await page.evaluate(() => {
      const out = [];
      for (let k = 0; k < 12; k++){
        const t = window.__dy.tut();
        if (!t.active) break;
        const el = document.getElementById('tuttxt');
        const ti = document.getElementById('tuttitle');
        if (t.cine) { out.push('[cine ' + t.cine + '] ' + ti.textContent); window.__dy.tutSkipCine(); }
        else out.push(el.textContent);
        if (!t.cine) window.__dy.tutSkipCine();   // no hace nada fuera de cinemática
        // avanzar a mano al siguiente paso
        window.__dy.tutNext && window.__dy.tutNext();
      }
      return out; });
    const malo = txts.filter(x => /undefined|null|\[object/.test(x));
    ok('idioma ' + lang + ': ningún texto roto', malo.length === 0,
       malo.length ? malo.join(' | ') : txts.length + ' textos leídos');
    await page.evaluate(() => window.__dy.tutFinish());
  }
  await page.close();
}

/* ---------- 3. móvil en vertical (escenario girado) ---------- */
console.log('\n3 móvil en vertical: el juego se presenta girado');
{
  const page = await abrir(390, 844);
  const rot = await page.evaluate(() => document.body.classList.contains('rot'));
  ok('el juego se presenta girado', rot === true);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('driftyard.save.v2'));
    s.tutDone = false; localStorage.setItem('driftyard.save.v2', JSON.stringify(s)); });
  await page.reload({ waitUntil:'domcontentloaded', timeout:120000 });
  await page.waitForFunction('window.__dy', { timeout:120000 });
  await page.waitForFunction('window.__dy.tut().active', { timeout:240000 });
  await page.evaluate(() => window.__dy.tutSkipCine());
  await wait(page, 700);
  await page.evaluate(() => window.__dy.touchOn());
  await wait(page, 400);
  const m = await page.evaluate(() => {
    /* Se mide con el escenario SIN girar: getBoundingClientRect da coordenadas ya transformadas y
       clientWidth/clientHeight no, así que mezclarlas compara cajas de marcos distintos. */
    const app = document.getElementById('app');
    const giro = app.style.transform;
    app.style.transform = 'none';
    const a = document.getElementById('tutcard').getBoundingClientRect();
    const mal = [];
    for (const id of ['tgas','tbrake','thand','tleft','tright','doorbtn','score','timer','speedo']){
      const el = document.getElementById(id);
      if (!el || getComputedStyle(el).display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1) continue;
      const w = Math.min(a.right,r.right) - Math.max(a.left,r.left);
      const h = Math.min(a.bottom,r.bottom) - Math.max(a.top,r.top);
      if (w > 2 && h > 2) mal.push(id + ' ' + Math.round(w) + 'x' + Math.round(h));
    }
    const res = { mal, dentro: a.left >= -1 && a.top >= -1 && a.right <= app.clientWidth + 1
                    && a.bottom <= app.clientHeight + 1,
                  area:+((a.width*a.height)/(app.clientWidth*app.clientHeight)*100).toFixed(1) };
    app.style.transform = giro;
    return res; });
  ok('la tarjeta cabe dentro del escenario', m.dentro, JSON.stringify({ area:m.area + '%' }));
  ok('y no tapa ningún mando', m.mal.length === 0, m.mal.join(', '));
  await page.screenshot({ path: SHOT + 'dy-vertical.png' });
  await page.evaluate(() => window.__dy.tutFinish());
  await page.close();
}

console.log('\nerrores de página:', errs.length ? errs.slice(0,5) : 'ninguno');
if (errs.length) fallos.push('errores de página');
console.log(fallos.length ? '\nFALLOS (' + fallos.length + '): ' + fallos.join('; ') : '\nTODO OK');
await browser.close();
server.close();
process.exit(fallos.length ? 1 : 0);
