/* ¿LA HUELLA SE PUEDE SUBIR? — la prueba analitica, en un segundo.
   La queja era concreta: en el CAÑON no se podia subir arriba y la mision quedaba
   inlograble. Caminar la huella con la sonda funciona pero tarda media hora: el
   emulador da tres cuadros por segundo y hay cuarenta tramos.

   Esto mide lo que la fisica mide. `fisica` no deja subir un escalon si
   (h1-h0)/dl > pendMax(x,z), y desliza por la curva de nivel. Asi que se recorre
   la huella cada 1,5 m —la misma polilinea que el juego pinta en el suelo— y se
   compara la pendiente EN EL RUMBO DE LA MARCHA contra el pendMax de ESE punto.
   Donde la pendiente gana, ahi te plantas.

   Tambien se mira si el SALTO alcanza: con SALTO_V y GRAV se sube v²/2g, y en el
   aire se avanza; un escalon mas alto que eso no se pasa ni saltando.

   Uso: node pend.mjs [mundo ...]
*/
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const MUNDOS = process.argv.slice(2);
const LISTA = MUNDOS.length ? MUNDOS : ['dunas', 'jungla', 'volcan', 'pantano', 'canon',
  'estepa', 'acropolis', 'secuoya', 'senda'];
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const mundo of LISTA){
  const RUTA = mundo === 'senda' ? 'senda/senda.html' : 'mundos/' + mundo + '.html';
  const p = await b.newPage({ viewport: { width: 360, height: 220 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
  await p.addInitScript(() => { try { for (const k of ['dunas', 'jungla', 'volcan', 'pantano',
    'canon', 'estepa', 'acropolis', 'secuoya', 'senda']) localStorage.setItem(k + '_gfx', 'b'); } catch (e) {} });
  try {
    await p.goto(base + 'assets/' + RUTA + '?local', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await p.waitForFunction(() => window.__S, { timeout: 180000 });
  } catch (e) {
    console.log(mundo.padEnd(10) + ' NO ARRANCA: ' + (errs[0] || e.message.slice(0, 90)));
    await p.close(); continue;
  }
  const r = await p.evaluate(() => {
    const S = window.__S, H = S.H;
    const P = S.sendaPts ? S.sendaPts() : [];
    if (!P || !P.length) return { sin: true };
    const pm = S.pend ? ((x, z) => S.pend(x, z)) : null;
    const malos = [];
    let peor = 0, peorEn = null, n = 0;
    for (let i = 1; i < P.length; i++){
      const ax = P[i - 1][0] != null ? P[i - 1][0] : P[i - 1].x;
      const az = P[i - 1][1] != null ? P[i - 1][1] : P[i - 1].z;
      const bx = P[i][0] != null ? P[i][0] : P[i].x;
      const bz = P[i][1] != null ? P[i][1] : P[i].z;
      const L = Math.hypot(bx - ax, bz - az) || 1;
      const ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let d = 0; d < L; d += 1.5){
        const x = ax + ux * d, z = az + uz * d;
        const s = (H(x + ux * 1.5, z + uz * 1.5) - H(x, z)) / 1.5;
        const tope = pm ? pm(x, z) : 0.8;
        n++;
        if (s > peor){ peor = s; peorEn = [Math.round(x), Math.round(z)]; }
        if (s > tope) malos.push({ x: Math.round(x), z: Math.round(z),
          s: +s.toFixed(2), tope: +tope.toFixed(2) });
      }
    }
    return { n, peor: +peor.toFixed(2), peorEn, malos: malos.slice(0, 8), total: malos.length,
      salto: S.saltoAlto ? +(S.saltoAlto() || 0).toFixed(2) : null };
  });
  if (r.sin) console.log(mundo.padEnd(10) + ' sin huella');
  else console.log(mundo.padEnd(10) + (r.total ? 'TRABA en ' + r.total + '/' + r.n + ' muestras' : 'se camina entera')
    + ' · peor pendiente ' + r.peor + ' en (' + r.peorEn + ')'
    + (r.salto != null ? ' · el salto sube ' + r.salto + ' m' : '')
    + (r.total ? '\n           ' + JSON.stringify(r.malos) : ''));
  await p.close();
}
await b.close(); server.close();
