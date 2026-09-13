/* ¿SE PUEDEN LEVANTAR LAS COSAS DE LA MISIÓN?
   Los mundos se traban siempre en el capítulo que pide juntar/prender/abrir N
   cosas. Esto va cosa por cosa: se planta encima, mira qué dice el botón USAR y
   lo aprieta, y compara el contador de la misión antes y después.

   Uso: node items.mjs [mundo ...]
*/
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';

const TODOS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis',
  'secuoya', 'marte', 'luna', 'exo', 'hielo', 'senda'];
const MUNDOS = process.argv.length > 2 ? process.argv.slice(2) : TODOS;
const RUTA = m => m === 'senda' ? 'senda/senda.html' : 'mundos/' + m + '.html';

const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });

for (const mundo of MUNDOS){
  const p = await b.newPage({ viewport: { width: 420, height: 260 }, hasTouch: true });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  try {
    await p.goto(base + 'assets/' + RUTA(mundo) + '?local', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await p.waitForFunction(() => window.__S && document.querySelector('canvas'), null, { timeout: 180000 });
    await p.waitForTimeout(2600);
    await p.evaluate(() => { const j = document.getElementById('mJugar'); if (j) j.click(); });
    await p.waitForTimeout(1500);
    for (let k = 0; k < 8; k++){
      await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
      await p.evaluate(() => { try { window.__S.dlgOk(); } catch (e) {} });
      await p.waitForTimeout(250);
    }
    const inicio = await p.evaluate(() => {
      const S = window.__S;
      let items = []; try { items = S.items(); } catch (e) {}
      let mis = null; try { mis = S.mision(); } catch (e) {}
      return { items, mis, cap: S.get().cap };
    });
    console.log('\n═══ ' + mundo.toUpperCase() + ' ═══');
    console.log('  cap ' + inicio.cap + ' · misión ' + JSON.stringify(inicio.mis));
    console.log('  cosas activas: ' + inicio.items.length +
      (inicio.items.length ? ' → ' + inicio.items.slice(0, 6).map(i => `(${i.x},${i.z})`).join(' ') : ''));
    if (!inicio.items.length){ console.log('  *** NO HAY NADA QUE LEVANTAR ***'); await p.close(); continue; }

    for (let k = 0; k < Math.min(inicio.items.length, 5); k++){
      const it = inicio.items[k];
      await p.evaluate(i => { window.__S.tp(i.x, i.z); }, it);
      await p.waitForTimeout(900);
      const antes = await p.evaluate(() => {
        const S = window.__S, g = S.get();
        let acc = null; try { acc = S.accion(); } catch (e) { acc = 'ERR'; }
        let mis = null; try { mis = S.mision(); } catch (e) {}
        let n = null; try { n = S.items().length; } catch (e) {}
        return { acc, mis, n, usar: g.usar, enDlg: g.enDlg,
                 aviso: (document.getElementById('aviso') || {}).textContent };
      });
      await p.evaluate(() => { try { window.__S.usar(); } catch (e) {} });
      await p.waitForTimeout(800);
      for (let i = 0; i < 8; i++){
        if (!(await p.evaluate(() => window.__S.get().enDlg))) break;
        await p.evaluate(() => { try { window.__S.dlgOk(); } catch (e) {} });
        await p.waitForTimeout(240);
      }
      const desp = await p.evaluate(() => {
        const S = window.__S;
        let mis = null; try { mis = S.mision(); } catch (e) {}
        let n = null; try { n = S.items().length; } catch (e) {}
        return { mis, n };
      });
      const cambio = JSON.stringify(antes.mis) !== JSON.stringify(desp.mis) || antes.n !== desp.n;
      console.log(`  cosa ${k} (${it.x},${it.z})  botón=${antes.usar ? 'SÍ' : 'no '} ` +
        `acción=${String(antes.acc).padEnd(8)} aviso="${(antes.aviso || '').slice(0, 28)}" ` +
        `→ ${cambio ? 'LEVANTADA (' + antes.n + '→' + desp.n + ') ' + JSON.stringify(desp.mis).slice(0, 60)
                    : '*** NO PASA NADA ***'}`);
    }
    if (errs.length) console.log('  errores: ' + errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('\n═══ ' + mundo.toUpperCase() + ' ═══\n  FALLÓ: ' + String(e).slice(0, 200));
  }
  await p.close();
}
await b.close(); server.close();
