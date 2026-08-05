/* ¿SE PUEDE RECORRER EL MUNDO A PIE, DE VERDAD?
   La queja era concreta: en el CAÑON no se podia subir arriba y la mision quedaba
   inlograble. Un mundo con un tramo mas empinado que el tope de pendiente no se
   nota mirando el codigo: se nota caminandolo.

   Esta sonda CAMINA la huella. Toma la polilinea de la senda (`__S.sendaPts()`),
   que es la misma que el juego pinta en el suelo, y va de punto a punto apuntando
   la palanca al siguiente y saltando cuando se traba. Si en 8 segundos de mundo no
   se acerco al punto siguiente, ese tramo esta trabado y dice DONDE y con cuanta
   pendiente. Se mide en tiempo simulado, no en reloj.

   Uso: node ruta.mjs <mundo> [salta=1]
*/
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const mundo = process.argv[2] || 'canon';
const SALTA = process.argv[3] !== '0';
const RUTA = mundo === 'senda' ? 'senda/senda.html' : 'mundos/' + mundo + '.html';

const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 420, height: 260 }, hasTouch: true });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
await p.addInitScript(() => { try { for (const k of ['dunas', 'jungla', 'volcan', 'pantano',
  'canon', 'estepa', 'acropolis', 'secuoya', 'marte', 'luna', 'exo', 'hielo', 'senda'])
  localStorage.setItem(k + '_gfx', 'b'); } catch (e) {} });
await p.goto(base + 'assets/' + RUTA + '?local', { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForFunction(() => window.__S && document.querySelector('canvas') &&
  document.querySelector('canvas').width > 0, null, { timeout: 180000 });
await p.waitForTimeout(2600);
await p.evaluate(() => { const j = document.getElementById('mJugar'); if (j) j.click(); });
await p.waitForTimeout(1500);
await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {} });
for (let i = 0; i < 16; i++){
  if (!(await p.evaluate(() => window.__S.get().enDlg))) break;
  await p.evaluate(() => { try { window.__S.dlgOk(); } catch (e) {} });
  await p.waitForTimeout(240);
}

/* la huella, raleada: un punto cada ~22 m alcanza para caminarla */
const pts = await p.evaluate(() => {
  const P = window.__S.sendaPts ? window.__S.sendaPts() : [];
  const out = [];
  for (const q of P){
    const x = q[0] != null ? q[0] : q.x, z = q[1] != null ? q[1] : q.z;
    if (!out.length || Math.hypot(x - out[out.length - 1][0], z - out[out.length - 1][1]) > 22)
      out.push([x, z]);
  }
  return out;
});
console.log(mundo + ': la huella tiene ' + pts.length + ' puntos (uno cada ~22 m)');
if (!pts.length){ console.log('  sin huella: no se puede probar asi'); await b.close(); server.close(); }

/* al primer punto, y a caminar */
await p.evaluate(q => { window.__S.tp(q[0], q[1]); }, pts[0]);
await p.waitForTimeout(400);
const trabas = [];
let llego = 0;
for (let i = 1; i < pts.length; i++){
  const t = pts[i];
  const r = await p.evaluate(async ([tx, tz, salta]) => {
    const S = window.__S;
    const t0 = S.get();
    let mejor = Math.hypot(t0.px - tx, t0.pz - tz);
    const dIni = mejor;
    let sim = 0, ult = performance.now(), quieto = 0;
    /* se apunta la camara al objetivo y se empuja la palanca: es exactamente lo
       que hace un jugador que ve la huella y la sigue */
    return await new Promise(res => {
      const tic = () => {
        const g = S.get();
        const d = Math.hypot(g.px - tx, g.pz - tz);
        S.mira(Math.atan2(-(tx - g.px), -(tz - g.pz)), -.05);
        S.palanca(0, -1);
        if (d < mejor - .2){ mejor = d; quieto = 0; } else quieto++;
        /* trabado: se prueba saltar, que es lo que hace cualquiera */
        if (salta && quieto > 8 && quieto % 8 === 0){ try { S.saltar ? S.saltar() : 0; } catch (e) {} }
        sim += (performance.now() - ult) / 1000; ult = performance.now();
        if (d < 6){ S.palanca(0, 0); res({ ok: true, d, dIni, sim }); return; }
        if (sim > 8){ S.palanca(0, 0); res({ ok: false, d, dIni, sim, px: g.px, pz: g.pz }); return; }
        requestAnimationFrame(tic);
      };
      requestAnimationFrame(tic);
    });
  }, [t[0], t[1], SALTA]);
  if (r.ok) llego++;
  else {
    const pend = await p.evaluate(([x, z, tx, tz]) => {
      const H = window.__S.H;
      const ux = tx - x, uz = tz - z, l = Math.hypot(ux, uz) || 1;
      return +(((H(x + ux / l * 3, z + uz / l * 3) - H(x, z)) / 3)).toFixed(2);
    }, [r.px, r.pz, t[0], t[1]]);
    trabas.push({ i, de: [Math.round(r.px), Math.round(r.pz)], a: [Math.round(t[0]), Math.round(t[1])],
      quedan: Math.round(r.d), pend });
    /* se lo teletransporta al punto para poder seguir midiendo los que vienen */
    await p.evaluate(q => window.__S.tp(q[0], q[1]), t);
    await p.waitForTimeout(200);
  }
}
console.log('  tramos caminados: ' + llego + '/' + (pts.length - 1));
if (trabas.length){
  console.log('  TRABADOS:');
  for (const t of trabas)
    console.log('    tramo ' + t.i + ': se planto en (' + t.de + ') a ' + t.quedan +
      ' m de (' + t.a + '), pendiente ' + t.pend + ' hacia el objetivo');
} else console.log('  la huella se camina entera');
console.log('  errores: ' + (errs.length ? JSON.stringify([...new Set(errs)].slice(0, 3)) : 'ninguno'));
await p.screenshot({ path: SHOT + 'ruta-' + mundo + '.png' });
await b.close(); server.close();
