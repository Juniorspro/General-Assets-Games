/* Renderiza personajes retargeteados con el retarget REAL y saca capturas.
   Uso: node anima.mjs [personaje.glb ...] */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const pers = process.argv.slice(2).length ? process.argv.slice(2)
  : ['pantano-guia', 'volcan-obrero', 'canon-cuerdas', 'estepa-jinete'];
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let peor = 0;
for (const nom of pers) {
  for (const clip of ['quieto', 'andar', 'correr']) {
    for (const perfil of ['0', '1']) {
      const p = await b.newPage({ viewport: { width: 720, height: 460 } });
      const errs = [];
      p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
      const u = base + 'scratchpad/mundos/pruebas/_t/anima.html?per=' +
        encodeURIComponent('per/' + nom + '.glb') + '&clip=' + clip + '&perfil=' + perfil;
      await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 });
      try { await p.waitForFunction('window.__LISTO', { timeout: 90000 }); }
      catch (e) { console.log(nom, clip, 'NO CARGO', errs.slice(0, 2)); await p.close(); continue; }
      const d = await p.evaluate(() => window.__LISTO);
      const mx = Math.max(...d.espina);
      if (perfil === '0') { peor = Math.max(peor, mx);
        console.log('%s  %-7s clip %-28s pistas %d  espina %s  max %s',
          nom.padEnd(20), clip, d.clip, d.pistas, d.espina.join('/'), mx.toFixed(1)); }
      if (errs.length) console.log('   ERRORES:', errs.slice(0, 2));
      await p.screenshot({ path: SHOT + 'ret-' + nom + '-' + clip +
        (perfil === '1' ? '-perfil' : '-frente') + '.png', timeout: 120000 });
      await p.close();
    }
  }
}
console.log('\npeor inclinacion de espina de todo el lote: ' + peor.toFixed(1) + ' grados');
await b.close(); server.close();
