/* Comprueba que las tres capas de motor ASCIENDEN de verdad.

   El motor se mezcla cruzando ralenti / medio / alto por revoluciones. Si las tres muestras
   tuvieran el mismo timbre, la mezcla no sonaria a nada: subir de vueltas solo cambiaria el
   volumen. A oido no se puede verificar desde aqui, pero el centroide espectral si: es la
   "altura" media del sonido, y tiene que crecer de una capa a la siguiente.

   Tambien mide el salto de nivel entre el final y el principio de cada muestra, que es lo que
   se oye como chasquido cuando un bucle no cierra. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  try {
    const buf = await readFile(path.join(ROOT, rel));
    res.writeHead(200, { 'content-type': rel.endsWith('.mp3') ? 'audio/mpeg' : 'text/html' });
    res.end(buf);
  } catch (e) { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port + '/';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.goto(base + 'index.html');

const out = await page.evaluate(async b => {
  const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1024, 44100);
  const names = ['low', 'mid', 'high'];
  const res = [];
  for (const n of names){
    const r = await fetch(b + 'assets/audio/engine/' + n + '.mp3');
    const buf = await ctx.decodeAudioData(await r.arrayBuffer());
    const d = buf.getChannelData(0);
    const sr = buf.sampleRate;

    /* Centroide espectral por DFT sobre un tramo del centro. Se usa una ventana de Hann para
       que los extremos del tramo no metan energia falsa en las frecuencias altas. */
    const N = 8192;
    const start = Math.floor((d.length - N) / 2);
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++){
      const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
      re[i] = d[start + i] * w;
    }
    // Goertzel por banda en vez de FFT completa: basta con 96 bandas logaritmicas
    const BANDS = 96, fMin = 40, fMax = 12000;
    let num = 0, den = 0;
    const espectro = [];
    for (let k = 0; k < BANDS; k++){
      const f = fMin * Math.pow(fMax / fMin, k / (BANDS - 1));
      const w = 2 * Math.PI * f / sr;
      const cw = 2 * Math.cos(w);
      let s0 = 0, s1 = 0, s2 = 0;
      for (let i = 0; i < N; i++){ s0 = re[i] + cw * s1 - s2; s2 = s1; s1 = s0; }
      const mag = Math.sqrt(s1 * s1 + s2 * s2 - cw * s1 * s2) / N;
      num += f * mag; den += mag;
      espectro.push(+mag.toFixed(6));
    }
    let rms = 0;
    for (let i = 0; i < d.length; i++) rms += d[i] * d[i];
    rms = Math.sqrt(rms / d.length);

    // salto del bucle: media de 512 muestras al final contra 512 al principio
    const K = 512;
    let a = 0, z = 0;
    for (let i = 0; i < K; i++){ a += Math.abs(d[i]); z += Math.abs(d[d.length - 1 - i]); }
    res.push({ n, dur:+buf.duration.toFixed(2), sr,
               centroide: Math.round(den > 0 ? num / den : 0),
               rms:+rms.toFixed(4),
               saltoBucle:+Math.abs(z / K - a / K).toFixed(4) });
  }
  return res;
}, base);

console.log('capa   duracion  centroide  rms     salto de bucle');
for (const r of out)
  console.log('  ' + r.n.padEnd(6), String(r.dur).padStart(6), 's  ',
              String(r.centroide).padStart(6), 'Hz ', String(r.rms).padStart(7),
              ' ', r.saltoBucle);

const c = out.map(r => r.centroide);
console.log('\nascienden:', c[0] < c[1] && c[1] < c[2] ? 'OK (' + c.join(' < ') + ' Hz)'
            : 'FALLA (' + c.join(', ') + ' Hz: las capas no suben de tono)');
const distintos = new Set(out.map(r => r.rms + ':' + r.centroide)).size === out.length;
console.log('las tres son distintas:', distintos ? 'OK' : 'FALLA (hay muestras repetidas)');
await browser.close();
server.close();
