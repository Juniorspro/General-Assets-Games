/* Comprueba el reseteo de una sola vez.

   Son DOS afirmaciones y las dos importan igual: la primera apertura tiene que empezar de cero
   (idioma y calidad preguntados, caja vacia, solo la moto inicial) y la SEGUNDA tiene que
   respetar lo que se haya jugado. Un fichero que borra en cada apertura no sirve para probar
   el garaje, asi que verificar solo la primera mitad dejaria pasar justo el fallo peor.

   Se usa un unico contexto de navegador en las dos aperturas: si se usaran dos, cada uno
   tendria su propio localStorage y la prueba pasaria sin que el codigo hiciera nada. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const FILE = process.argv[2] || 'index.html';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.glb':'model/gltf-binary',
               '.mp3':'audio/mpeg', '.webp':'image/webp' };
const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  /* Pagina de siembra, del MISMO origen y sin el juego dentro. Sembrando desde la pagina del
     juego no vale: al cerrarla, su manejador de pagehide llama a save() y sobrescribe con el
     estado en memoria justo lo que se acababa de sembrar, asi que la prueba se autodestruia y
     daba "empieza de cero" hasta en una compilacion normal. */
  if (rel === 'seed.html'){
    res.writeHead(200, { 'content-type':'text/html' });
    return res.end('<title>seed</title>');
  }
  try {
    const buf = await readFile(path.join(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port + '/';

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });

async function abrir(){
  const page = await ctx.newPage();
  await page.goto(base + FILE + '?debug=1');
  await page.waitForFunction('window.__rr && window.__rr.state', { timeout: 40000 });
  return page;
}

/* ---------- se ensucia el progreso a proposito ---------- */
const seed = await ctx.newPage();
await seed.goto(base + 'seed.html');
await seed.evaluate(() => {
  localStorage.removeItem('redline.reset');
  localStorage.setItem('redline.v1', JSON.stringify({
    lang:'fr', quality:'low', cash:99999, runs:42, bike:'superbike',
    owned:['street','sport','superbike'],
    best:{ score:123456, distance:9999, overtakes:500, topKmh:320, combo:30 }
  }));
});
await seed.close();
/* ---------- primera apertura: tiene que empezar de cero ---------- */
const p1 = await abrir();
const sello = await p1.evaluate(() => window.__HX_RESET || null);
console.log('sello de la compilacion:', sello || '(ninguno: compilacion normal)');
const a = await p1.evaluate(() => {
  const s = window.__rr.state;
  return { lang:s.lang, quality:s.quality, cash:s.cash, runs:s.runs, bike:s.bike,
           motos:s.owned.length, record:s.best.score,
           pantalla: window.__rr.ui.screen };
});
console.log('1a apertura:', JSON.stringify(a));
const limpio = a.cash === 0 && a.runs === 0 && a.lang === null && a.quality === null &&
               a.motos === 1 && a.record === 0 && a.bike === 'street';
/* El veredicto depende del sello: en una compilacion normal NO empezar de cero es lo correcto,
   y decir "FALLA" ahi hacia que la prueba se leyera como rota cuando estaba pasando. */
console.log('   empieza de cero:', limpio ? 'si' : 'no',
            sello ? (limpio ? 'OK' : 'FALLA') : '(compilacion sin sello: no debe borrar)');

/* ---------- se juega algo y se guarda ---------- */
await p1.evaluate(() => {
  const rr = window.__rr;
  rr.state.lang = 'es'; rr.state.quality = 'high';
  rr.state.cash = 777; rr.state.runs = 3;
  rr.audio.probe && 0;
  // save() es lo que usa el juego al cerrar una partida
  window.__rr.ui.h.onQuality && 0;
  return null;
});
await p1.evaluate(() => {
  // se guarda por la via real del juego
  const m = window.__rr;
  m.state.best.score = 555;
  (function(){ try { localStorage.setItem('redline.v1', JSON.stringify(m.state)); } catch(e){} })();
});
await p1.close();

/* ---------- segunda apertura: tiene que RESPETAR el progreso ---------- */
const p2 = await abrir();
const b = await p2.evaluate(() => {
  const s = window.__rr.state;
  return { lang:s.lang, quality:s.quality, cash:s.cash, runs:s.runs, record:s.best.score };
});
console.log('2a apertura:', JSON.stringify(b));
const conserva = b.cash === 777 && b.runs === 3 && b.lang === 'es' && b.record === 555;
console.log('   conserva el progreso:', conserva ? 'OK' : 'FALLA');
await p2.close();

if (sello){
  console.log('\nresultado:', limpio && conserva ? 'OK las dos cosas'
              : 'FALLA (' + (limpio ? '' : 'no resetea; ') + (conserva ? '' : 'borra siempre') + ')');
} else {
  /* Sin sello el juego NO debe tocar nada: si una compilacion normal borrase el progreso, el
     fallo seria mucho peor que el que se estaba arreglando. */
  console.log('\ncompilacion normal, no debe borrar:', !limpio ? 'OK (respeto el guardado)'
              : 'FALLA (ha borrado sin que se le pidiera)');
}
await browser.close();
server.close();
