/* Mide la COSTURA de un bucle de audio: cuanto se nota el corte al volver al principio.

   Sirve para elegir entre varios clips generados sin escucharlos. Un modelo de texto a audio no
   controla como cierra el clip, asi que de tres generaciones con el mismo prompt una cierra bien y
   otra mete un golpe cada vuelta. Con esto se genera de mas y se queda el mejor, medido.

   Dos numeros, porque son dos defectos distintos:
     salto  diferencia de NIVEL entre el final y el principio (mean|x| de 512 muestras a cada
            lado). Se oye como un golpe o un bajon de volumen en cada vuelta.
     brinco discontinuidad INSTANTANEA entre la ultima muestra y la primera, en unidades de la
            pendiente tipica de la senal. Se oye como un chasquido.

   Uso:  node tools/seam.mjs fichero.mp3 [otro.mp3 ...] */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const files = process.argv.slice(2);
if (!files.length){ console.error('uso: node tools/seam.mjs fichero.mp3 [...]'); process.exit(2); }

/* Se sirven por HTTP porque decodeAudioData depende de fetch, y fetch sobre file:// esta
   bloqueado. La pagina tiene que venir del MISMO origen o el fetch es de otro dominio. */
const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  if (rel === '__pagina'){ res.writeHead(200, { 'content-type':'text/html' }); res.end('<!doctype html><title>seam</title>'); return; }
  const i = Number(rel);
  if (!Number.isInteger(i) || !files[i]){ res.writeHead(404); res.end('no'); return; }
  try {
    res.writeHead(200, { 'content-type':'audio/mpeg' });
    res.end(await readFile(path.resolve(files[i])));
  } catch (e) { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port + '/';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(base + '__pagina');

const out = await page.evaluate(async ({ b, n }) => {
  const ctx = new OfflineAudioContext(1, 1024, 44100);
  const res = [];
  for (let i = 0; i < n; i++){
    try {
      const r = await fetch(b + i);
      const buf = await ctx.decodeAudioData(await r.arrayBuffer());
      const d = buf.getChannelData(0);
      const N = d.length;

      let rms = 0;
      for (let k = 0; k < N; k++) rms += d[k] * d[k];
      rms = Math.sqrt(rms / N);

      const K = 512;
      let ini = 0, fin = 0;
      for (let k = 0; k < K; k++){ ini += Math.abs(d[k]); fin += Math.abs(d[N - 1 - k]); }
      const salto = Math.abs(fin / K - ini / K);

      /* El chasquido se compara con la pendiente NORMAL de la senal, no con su amplitud: un
         bosque de grillos tiene picos grandes y pendientes grandes, y un zumbido de trafico ni
         una cosa ni la otra. Sin normalizar, el mismo numero significaria cosas distintas. */
      let pend = 0;
      for (let k = 1; k < N; k++) pend += Math.abs(d[k] - d[k - 1]);
      pend /= (N - 1);
      const brinco = pend > 0 ? Math.abs(d[0] - d[N - 1]) / pend : 0;

      res.push({ dur:+buf.duration.toFixed(2), rms:+rms.toFixed(4),
                 salto:+salto.toFixed(4), rel:+(salto / (rms || 1)).toFixed(3),
                 brinco:+brinco.toFixed(1) });
    } catch (e) { res.push({ error: String(e).slice(0, 70) }); }
  }
  return res;
}, { b: base, n: files.length });

console.log('fichero'.padEnd(46), 'dur     rms      salto   salto/rms  brinco');
let mejor = -1, mejorRel = Infinity;
out.forEach((r, i) => {
  const nombre = files[i].length > 45 ? '...' + files[i].slice(-42) : files[i];
  if (r.error){ console.log(nombre.padEnd(46), 'NO DECODIFICA: ' + r.error); return; }
  console.log(nombre.padEnd(46), String(r.dur).padStart(5) + 's',
              String(r.rms).padStart(7), String(r.salto).padStart(8),
              String(r.rel).padStart(9), String(r.brinco).padStart(7));
  if (r.rel < mejorRel){ mejorRel = r.rel; mejor = i; }
});
if (mejor >= 0) console.log('\nmejor costura: ' + files[mejor] + '  (salto/rms ' + mejorRel + ')');
await browser.close();
server.close();
