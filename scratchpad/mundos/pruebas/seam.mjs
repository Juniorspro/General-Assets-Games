/* Corre el banco seam.html: barre 72 rumbos, y en cada uno busca el mayor salto
   de brillo entre pixeles vecinos de la fila del medio. Si con mipmaps hay un
   pico grande que desaparece sin mipmaps, la costura es del MUESTREO (codigo);
   si el pico queda igual, es del ASSET. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/vista/';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{ width:520, height:280 } });
p.on('pageerror', e => console.log('ERR', e.message.slice(0,140)));
const mundos = process.argv.slice(2);
for (const m of (mundos.length ? mundos : ['estepa'])) {
  await p.goto(base + 'scratchpad/mundos/pruebas/seam.html?t=/assets/mundos/cielo-' + m + '.jpg',
    { waitUntil:'domcontentloaded', timeout:60000 });
  await p.waitForFunction(() => window.__listo === 1, { timeout:60000 });
  const r = await p.evaluate(() => {
    const out = {};
    for (const modo of [0, 1]){
      let peor = 0, peorYaw = 0, medios = [];
      for (let i = 0; i < 24; i++){
        const yaw = i / 24 * Math.PI * 2;
        const f = window.__mide(modo, yaw, 0);
        let mx = 0, sum = 0;
        for (let x = 1; x < f.length; x++){ const d = Math.abs(f[x] - f[x-1]);
          sum += d; if (d > mx) mx = d; }
        medios.push(sum / (f.length - 1));
        if (mx > peor){ peor = mx; peorYaw = yaw; }
      }
      out[modo] = { salto: +peor.toFixed(2), yaw: +peorYaw.toFixed(3),
        gradMedio: +(medios.reduce((a,b)=>a+b,0)/medios.length).toFixed(3) };
    }
    return out;
  });
  console.log(m.padEnd(10), 'CON mipmaps', JSON.stringify(r[0]), ' SIN mipmaps', JSON.stringify(r[1]));
  /* capturas del peor rumbo con y sin mipmaps, para verlo */
  for (const modo of [0, 1]){
    await p.evaluate(([modo, yaw]) => window.__mide(modo, yaw, 0), [modo, r[0].yaw]);
    await p.screenshot({ path: SHOT + 'seam-' + m + '-m' + modo + '.png' });
  }
}
await b.close(); server.close();
