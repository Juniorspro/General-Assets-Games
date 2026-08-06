/* ¿SE PUEDE TERMINAR LA HISTORIA?
   El reporte dice que no se puede recoger ningún objetivo. Esto lo mide en los
   trece mundos a pie SIN saltar capítulos (saltarlos con `cap(n)` falsea el
   resultado): juega hacia adelante. Para cada capítulo se planta en el objetivo,
   deja correr, cierra los diálogos que se abran y aprieta USAR si hace falta.
   Se anota en cuál se traba y con qué estado, que es lo único que importa.

   Uso: node objetivo.mjs [mundo ...]
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
const malos = [];

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
    await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });

    const nCaps = await p.evaluate(() => window.__S.CAPS.length);
    console.log('\n═══ ' + mundo.toUpperCase() + ' · ' + nCaps + ' capítulos ═══');
    let trabado = null;

    for (let paso = 0; paso < nCaps * 6 + 4; paso++){
      /* entre capítulos hay CINE: se salta, que no es lo que se está midiendo */
      for (let k = 0; k < 12; k++){
        const f = await p.evaluate(() => window.__S.get().fase);
        if (f !== 'cine') break;
        await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
        await p.waitForTimeout(300);
      }
      /* SE VA A DONDE APUNTA EL MOJON, que es lo que hace un jugador: si la
         misión está pendiente el mojón ya no apunta al sitio del capítulo sino
         a la cosa que falta, y ahí hay que ir. */
      const g0 = await p.evaluate(() => {
        const S = window.__S, g = S.get();
        if (g.fase !== 'juego') return { fin: true, fase: g.fase };
        const C = S.CAPS[g.cap];
        let items = []; try { items = S.items(); } catch (e) {}
        /* «bloqueado» se lee de la pantalla, que es lo que ve el jugador: el
           parche guarda el título original en dataset.orig justo mientras la
           misión está pendiente. Así no hace falta que el mundo exponga MISION. */
        const falta = !!(document.getElementById('objT') || {}).dataset?.orig ||
          (() => { try { return !!(window.__MISION && window.__MISION.lista &&
            !window.__MISION.lista(g.cap)); } catch (e) { return false; } })();
        /* si la misión sabe a dónde mandarte, se le hace caso (exo: criaturas) */
        let guia = null;
        try { if (falta && window.__MISION && window.__MISION.guia) guia = window.__MISION.guia(); } catch (e) {}
        const P = guia || ((falta && items.length) ? items[0] : S.POI[C.obj]);
        S.tp(P.x + 1.5, P.z + 1.5);
        return { cap: g.cap, guia: guia ? [Math.round(guia.x), Math.round(guia.z)] : null,
                 obj: guia ? 'guía de misión' : ((falta && items.length) ? 'cosa pendiente' : C.obj),
                 usarDecl: !!C.usar, quedan: items.length,
                 mis0: (() => { try { return JSON.stringify(S.mision()); } catch (e) { return null; } })() };
      });
      if (g0.fin){ console.log('  ✔ historia terminada (fase ' + g0.fase + ')'); break; }

      let avanzo = false, usado = false, ultimo = null, levanto = false;
      for (let i = 0; i < 30; i++){
        await p.waitForTimeout(300);
        const g = await p.evaluate(() => {
          const S = window.__S, s = S.get();
          let acc = null; try { acc = S.accion(); } catch (e) { acc = 'ERR'; }
          let mis = null; try { mis = S.mision(); } catch (e) {}
          let n = null; try { n = S.items().length; } catch (e) {}
          const pi = document.getElementById('pistaUso');
          let guia = null;
          try { if (window.__MISION && window.__MISION.guia){ const q = window.__MISION.guia();
            if (q) guia = [Math.round(q.x), Math.round(q.z)]; } } catch (e) {}
          return { cap: s.cap, fase: s.fase, enDlg: s.enDlg, dObj: s.dObj, usar: s.usar,
                   acc, mis, n, guia, pista: pi ? pi.textContent : null,
                   objT: (document.getElementById('objT') || {}).textContent };
        });
        ultimo = g;
        if (g.fase === 'cine'){ avanzo = true; break; }
        if (g.fase !== 'juego'){ avanzo = true; break; }
        if (g.cap !== g0.cap){ avanzo = true; break; }
        /* levantar una cosa TAMBIÉN es avanzar: es lo que hay que hacer para
           desbloquear el capítulo */
        if (g0.quedan != null && g.n != null && g.n < g0.quedan){ avanzo = true; levanto = true; break; }
        if (g0.mis0 && g.mis && JSON.stringify(g.mis) !== g0.mis0){ avanzo = true; levanto = true; break; }
        /* que la guía apunte a otro lado TAMBIÉN es avanzar: en exo quiere decir
           que la criatura ya te sigue y ahora hay que llevarla al anillo */
        if (g0.guia && g.guia && String(g.guia) !== String(g0.guia)){ avanzo = true; levanto = true; break; }
        if (g.enDlg){ await p.evaluate(() => { try { window.__S.dlgOk(); } catch (e) {} }); continue; }
        /* pasados 2 s parado sin que pase nada, se aprieta USAR una vez */
        if (i >= 7 && !usado){ usado = true;
          await p.evaluate(() => { try { window.__S.usar(); } catch (e) {} }); }
      }
      const via = levanto ? 'levanta una cosa' : (!usado ? 'solo' : 'con USAR');
      if (avanzo){
        console.log(`  cap ${g0.cap} · ${g0.obj.padEnd(14)} → ${via}` +
          (ultimo && ultimo.pista ? '   pista «' + ultimo.pista + '»' : ''));
      } else {
        trabado = { cap: g0.cap, obj: g0.obj, ...ultimo };
        console.log(`  cap ${g0.cap} · ${g0.obj.padEnd(12)} → *** TRABADO *** ` +
          `d=${ultimo.dObj}m usarDecl=${g0.usarDecl ? 'sí' : 'no'} botón=${ultimo.usar ? 'SÍ' : 'no'} ` +
          `acción=${ultimo.acc} misión=${JSON.stringify(ultimo.mis).slice(0, 90)}`);
        break;
      }
    }
    if (trabado) malos.push(mundo + ' cap ' + trabado.cap + ' (' + trabado.obj + ')');
    if (errs.length) console.log('  errores: ' + errs.slice(0, 3).join(' | '));
  } catch (e) {
    console.log('\n═══ ' + mundo.toUpperCase() + ' ═══\n  FALLÓ: ' + String(e).slice(0, 200));
    malos.push(mundo + ' no arranca');
  }
  await p.close();
}
console.log('\n' + (malos.length ? 'TRABADOS: ' + malos.join(' · ') : 'los ' + MUNDOS.length + ' se terminan'));
await b.close(); server.close();
