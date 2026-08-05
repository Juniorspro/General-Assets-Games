/* LOS QUINCE, EN LAS DOS MANERAS.
   Para cada juego se abre dos veces —una sin tactil (PC) y otra con tactil— y se
   comprueban las tres cosas que se pidieron:
     · que arranque EN INGLES;
     · que en PC se apaguen los controles de dedo y aparezca el cartel de teclas;
     · que con tactil pase lo contrario.
   MAREA y RELIQUIA no tienen modo ?local —sus URLs van directo a jsdelivr— y el
   navegador de las pruebas no sale a la red: a esos dos se les interceptan las
   peticiones y se contestan desde el disco. Es la unica manera de verlos. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
import { readFile } from 'node:fs/promises';
const ROOT = '/home/user/mundos';
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

const MUNDOS = ['dunas','jungla','volcan','pantano','canon','estepa','acropolis','secuoya',
                'marte','luna','exo','hielo'];
const JUEGOS = [...MUNDOS.map(m => [m, 'mundos/' + m + '.html', 'mundo']),
                ['senda', 'senda/senda.html', 'mundo'],
                ['marea', 'g3/marea.html', 'marea'],
                ['reliquia', 'reliquia/reliquia.html', 'reliquia']];

async function ruta(p){
  await p.route('**cdn.jsdelivr.net/**', async route => {
    const u = route.request().url();
    let f = null;
    if (u.includes('three@0.170.0/build/three.module.js')) f = ROOT + '/_vthree/build/three.module.js';
    else if (u.includes('three@0.170.0/examples/jsm/')) f = ROOT + '/_vthree/examples/jsm/' + u.split('examples/jsm/')[1];
    else if (u.includes('/gh/Juniorspro/General-Assets-Games@') && u.includes('/assets/'))
      f = ROOT + '/assets/' + u.split('/assets/')[1];
    if (!f) return route.abort();
    try {
      const buf = await readFile(f);
      const ct = f.endsWith('.js') ? 'text/javascript' : (f.endsWith('.jpg') ? 'image/jpeg'
        : (f.endsWith('.glb') ? 'model/gltf-binary' : (f.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream')));
      return route.fulfill({ status: 200, contentType: ct, body: buf });
    } catch (e) { return route.abort(); }
  });
}

let mal = 0;
for (const [n, f, tipo] of JUEGOS){
  const fila = [];
  for (const tactil of [false, true]){
    const p = await b.newPage({ viewport: { width: 900, height: 460 }, hasTouch: tactil });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 90)));
    await p.addInitScript(() => { try { for (const k of ['dunas','jungla','volcan','pantano','canon',
      'estepa','acropolis','secuoya','marte','luna','exo','hielo','senda'])
      localStorage.setItem(k + '_gfx', 'b'); } catch (e) {} });
    if (tipo !== 'mundo') await ruta(p);
    const url = base + 'assets/' + f + (tipo === 'mundo' ? '?local' : '');
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
      /* SE ESPERA A QUE EL JUEGO ESTE VIVO, no un rato fijo. Con 6,5 s el VOLCAN
         —el mundo mas pesado— todavia no habia corrido su modulo, asi que se leia el
         HTML CRUDO: portada en espanol y palanca a la vista, y la prueba lo daba por
         roto cuando lo unico lento era el emulador. */
      if (tipo === 'mundo'){
        await p.waitForFunction(() => window.__S && document.getElementById('mJugar'),
          { timeout: 180000 });
        await p.waitForTimeout(1200);
      } else if (tipo === 'marea'){
        await p.waitForFunction(() => window.UT && document.getElementById('ldGo'),
          { timeout: 180000 });
        await p.waitForTimeout(1200);
      } else {
        await p.waitForFunction(() => document.getElementById('pcTec')
          && document.getElementById('pcTec').innerHTML.length > 0, { timeout: 180000 });
        await p.waitForTimeout(800);
      }
      /* EL IDIOMA SE LEE EN LA PORTADA. Dentro del juego el menu ya no esta —solo
         queda el HUD— y ninguna de las palabras que se buscan aparece: la primera
         version daba "ni ingles ni espanol" en los trece mundos. */
      const txt0 = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      /* MUNDO: hay que ENTRAR, porque el HUD esta oculto en la portada */
      if (tipo === 'mundo'){
        await p.evaluate(() => { const j = document.getElementById('mJugar'); if (j) j.click(); });
        await p.waitForTimeout(2200);
        await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
        await p.waitForTimeout(700);
      } else if (tipo === 'marea'){
        await p.evaluate(() => { const g = document.getElementById('ldGo'); if (g) g.click(); });
        await p.waitForTimeout(1400);
        await p.evaluate(() => { const g = document.getElementById('bPlay'); if (g) g.click(); });
        await p.waitForTimeout(3200);
      } else {
        await p.evaluate(() => { const q = document.querySelector('#langScr [data-lang="en"]'); if (q) q.click(); });
        await p.waitForTimeout(1200);
      }
      const d = await p.evaluate(t => {
        const vis = i => { const e = document.getElementById(i);
          return e ? getComputedStyle(e).display !== 'none' : null; };
        const out = {};
        if (t === 'mundo'){ out.pc = document.body.classList.contains('pc');
          out.teclas = vis('pcHelp'); out.joy = vis('joy'); }
        else if (t === 'marea'){ out.pc = !!window.__ESPC; out.teclas = null; out.joy = null; }
        else { out.pc = document.body.classList.contains('pc'); out.teclas = vis('pcTec'); out.joy = null; }
        return out;
      }, tipo);
      const esp = /EMPEZAR|JUGAR|IDIOMA|GR[ÁA]FICOS|SONIDO|VOLVER|TOC[ÁA]|TU NOMBRE|SEGUIR/.test(txt0);
      const hayIng = /START|PLAY|LANGUAGE|GRAPHICS|SOUND|BACK|TAP|YOUR NAME|RESUME/i.test(txt0);
      const ing = hayIng && !esp;
      d.portada = txt0.slice(0, 90);
      let ctrl;
      if (tipo === 'mundo') ctrl = tactil ? (!d.pc && d.joy !== false) : (d.pc && d.teclas === true && d.joy !== true);
      else if (tipo === 'marea') ctrl = tactil ? !d.pc : d.pc;
      else ctrl = tactil ? (!d.pc && d.teclas === false) : (d.pc && d.teclas === true);
      fila.push((tactil ? 'tactil' : 'pc') + ':' + (ing ? 'ING' : 'esp') + '/' + (ctrl ? 'OK' : 'MAL'));
      if (!ing || !ctrl || errs.length){ mal++;
        fila.push(JSON.stringify(d) + (errs.length ? ' ERR ' + errs[0] : '')); }
    } catch (e){ mal++; fila.push((tactil ? 'tactil' : 'pc') + ':NO ARRANCA ' + (errs[0] || e.message.slice(0, 60))); }
    await p.close();
  }
  console.log(n.padEnd(10) + fila.join('  '));
}
console.log(mal ? mal + ' con algo mal' : 'LOS 15 OK EN LAS DOS MANERAS');
await b.close(); server.close();
