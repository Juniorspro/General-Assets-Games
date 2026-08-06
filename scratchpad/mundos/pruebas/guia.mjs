/* CAPTURA DE LA GUÍA NUEVA: se avanza hasta el capítulo que pide juntar cosas y
   se fotografía el HUD — el título, los metros a la cosa más cercana, el
   contador y el renglón que dice qué hace el botón — en PC y con el dedo.
   Uso: node guia.mjs <mundo> */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
import { mkdirSync } from 'fs';
const mundo = process.argv[2] || 'hielo';
const RUTA = mundo === 'senda' ? 'senda/senda.html' : 'mundos/' + mundo + '.html';
mkdirSync('/tmp/guia', { recursive: true });
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });

for (const pc of [true, false]){
  const p = await b.newPage({ viewport: { width: 700, height: 430 }, hasTouch: !pc, isMobile: !pc });
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto(base + 'assets/' + RUTA + '?local', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await p.waitForFunction(() => window.__S && document.querySelector('canvas'), null, { timeout: 180000 });
  await p.waitForTimeout(3000);
  await p.evaluate(() => document.getElementById('mJugar').click());
  await p.waitForTimeout(1800);
  for (let i = 0; i < 8; i++){
    await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {}
      try { window.__S.dlgOk(); } catch (e) {} });
    await p.waitForTimeout(250);
  }
  /* avanzar capítulos hasta el que pide juntar cosas */
  for (let c = 0; c < 6; c++){
    const falta = await p.evaluate(() => {
      try { return !!(window.__MISION && window.__MISION.lista && !window.__MISION.lista(window.__S.get().cap)); }
      catch (e) { return false; }
    });
    if (falta) break;
    await p.evaluate(() => { const g = window.__S.get(); window.__S.cap(g.cap + 1); });
    await p.waitForTimeout(600);
    for (let i = 0; i < 8; i++){
      await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {}
        try { window.__S.dlgOk(); } catch (e) {} });
      await p.waitForTimeout(220);
    }
  }
  /* plantarse encima de la cosa más cercana para que el renglón diga RECOGER */
  await p.evaluate(() => { try { const it = window.__S.items()[0]; if (it) window.__S.tp(it.x, it.z); } catch (e) {} });
  await p.waitForTimeout(1400);
  const hud = await p.evaluate(() => ({
    objT: (document.getElementById('objT') || {}).textContent,
    objD: (document.getElementById('objD') || {}).textContent,
    tarea: (document.getElementById('tarea') || {}).textContent,
    pista: (document.getElementById('pistaUso') || {}).textContent,
    pc: document.body.classList.contains('sinTactil')
  }));
  await p.screenshot({ path: '/tmp/guia/' + mundo + '-' + (pc ? 'pc' : 'tactil') + '.png' });
  console.log((pc ? 'PC     ' : 'TÁCTIL ') + JSON.stringify(hud));
  await p.close();
}
await b.close(); server.close();
