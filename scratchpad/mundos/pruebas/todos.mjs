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
    const p = await b.newPage({ viewport: { width: 640, height: 360 }, hasTouch: tactil });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 90)));
    await p.addInitScript(() => { try { for (const k of ['dunas','jungla','volcan','pantano','canon',
      'estepa','acropolis','secuoya','marte','luna','exo','hielo','senda'])
      localStorage.setItem(k + '_gfx', 'b'); } catch (e) {} });
    if (tipo !== 'mundo') await ruta(p);
    const url = base + 'assets/' + f + (tipo === 'mundo' ? '?local' : '');
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 240000 });
      /* SE ESPERA A QUE EL JUEGO ESTE VIVO, no un rato fijo: con un rato fijo se leia
         el HTML crudo del volcan —portada en espanol y palanca a la vista— y la
         prueba lo daba por roto cuando lo unico lento era el emulador.
         Ojo: en waitForFunction el SEGUNDO parametro es el argumento, no las
         opciones; sin el `null` del medio la espera se queda en los 30 s de fabrica. */
      if (tipo === 'mundo')
        await p.waitForFunction(() => window.__S && document.getElementById('mJugar'),
          null, { timeout: 240000 });
      else if (tipo === 'marea')
        await p.waitForFunction(() => window.UT && document.getElementById('ldGo'),
          null, { timeout: 240000 });
      else
        await p.waitForFunction(() => document.getElementById('pcTec')
          && document.getElementById('pcTec').innerHTML.length > 0, null, { timeout: 240000 });
      await p.waitForTimeout(1500);
      const d = await p.evaluate(t => {
        const txt = document.body.innerText.replace(/\s+/g, ' ');
        const cl = c => document.body.classList.contains(c);
        const o = { txt: txt.slice(0, 260) };
        /* NO SE ENTRA AL JUEGO: la deteccion deja su resultado en el body, y son esas
           dos clases las que mandan en el CSS sobre el cartel de teclas y la palanca. */
        if (t === 'marea'){ o.pc = !!window.__ESPC; o.sinTactil = !!window.__ESPC; }
        else { o.pc = cl('pc'); o.sinTactil = t === 'reliquia' ? cl('pc') : cl('sinTactil'); }
        return o;
      }, tipo);
      /* NO buscar ingles: buscar que NO haya espanol. */
      const esp = /EMPEZAR|JUGAR|IDIOMA|GR[ÁA]FICOS|SONIDO|VOLVER|TOC[ÁA]|TU NOMBRE|SEGUIR|TRAVES[ÍI]A|HISTORIA|MISI[ÓO]N|EXPEDICI[ÓO]N|CONTINUAR|SALIR|AJUSTES|SIGUIENTE/.test(d.txt);
      const okIng = !esp && d.txt.length > 20;
      const okCtrl = tactil ? (!d.pc && !d.sinTactil) : (d.pc && d.sinTactil);
      fila.push((tactil ? 'tactil' : 'pc') + ':' + (okIng ? 'ING' : 'esp') + '/' + (okCtrl ? 'OK' : 'MAL'));
      if (!okIng || !okCtrl || errs.length){ mal++;
        fila.push(JSON.stringify(d) + (errs.length ? ' ERR ' + errs[0] : '')); }
    } catch (e){ mal++; fila.push((tactil ? 'tactil' : 'pc') + ':NO ARRANCA ' + (errs[0] || e.message.slice(0, 60))); }
    await p.close();
  }
  console.log(n.padEnd(10) + fila.join('  '));
}
console.log(mal ? mal + ' con algo mal' : 'LOS 15 OK EN LAS DOS MANERAS');
await b.close(); server.close();
