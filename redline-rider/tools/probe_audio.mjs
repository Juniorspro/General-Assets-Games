/* Comprueba que TODO el audio decodifica de verdad en el navegador.
   Un fichero que el navegador no sabe decodificar no da error: se queda en readyState 0 y
   simplemente no suena, asi que a ojo el juego parece correcto y esta mudo. Paso obligado
   despues de cambiar cualquier pista, porque Chromium de codigo abierto no trae los codecs
   propietarios y el AAC que generan algunos modelos ahi no existe. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.glb':'model/gltf-binary',
               '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.ogg':'audio/ogg' };
const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const buf = await readFile(path.join(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port + '/';

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
                                               '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));

await page.goto(base + (process.argv[2] || 'index.html') + '?debug=1');
await page.waitForFunction('window.__rr && window.__rr.audio', { timeout: 30000 });

const codecs = await page.evaluate(() => {
  const a = new Audio();
  const out = {};
  for (const t of ['audio/mpeg', 'audio/mp4; codecs="mp4a.40.2"', 'audio/aac', 'audio/ogg; codecs="vorbis"'])
    out[t] = a.canPlayType(t) || 'NO';
  return out;
});
console.log('codecs del navegador:');
for (const [k, v] of Object.entries(codecs)) console.log('  ' + k.padEnd(34), v);

await page.waitForFunction('document.getElementById("boot-go").classList.contains("on")', { timeout: 120000 });
await page.mouse.click(422, 195);
await page.evaluate(() => {
  const rr = window.__rr;
  rr.state.lang = 'es'; rr.state.quality = 'high';
  rr.ui.h.onBootDone();
});
// la musica no bloquea la carga, asi que se le deja tiempo aparte
await page.waitForTimeout(6000);

const decoded = await page.evaluate(async () => {
  const rr = window.__rr;
  await rr.audio.playMusic('menu');
  await new Promise(r => setTimeout(r, 2500));
  const names = ['menu', 'engineLow', 'engineMid', 'engineHigh', 'wind',
                 'crash', 'horn', 'coin', 'brake', 'nearmiss', 'click'];
  const out = {};
  for (const n of names){
    const el = rr.audio.probe(n);
    out[n] = el ? { rs: el.readyState, dur: +(el.duration || 0).toFixed(2), pausado: el.paused }
                : 'AUSENTE';
  }
  return { pista: rr.audio.currentTrack(), estado: out };
});
console.log('pista en marcha:', decoded.pista);
let mudos = [];
for (const [k, v] of Object.entries(decoded.estado)){
  const ok = v !== 'AUSENTE' && v.rs >= 2 && v.dur > 0;
  if (!ok) mudos.push(k);
  console.log('  ' + k.padEnd(12), JSON.stringify(v), ok ? 'OK' : 'MUDO');
}
console.log(mudos.length ? 'MUDOS: ' + mudos.join(', ') : 'todo el audio decodifica');

console.log('errores:', errs.length ? errs : 'ninguno');
await browser.close();
server.close();
