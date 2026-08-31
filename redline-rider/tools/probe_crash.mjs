/* Comprueba la secuencia de choque y la recompensa por rozar.

   El choque son cuatro cosas que tienen que pasar a la vez y en orden, y a ojo es facil creer
   que va cuando falta una: el piloto sale despedido, la moto se separa de el, la imagen se
   desenfoca y todo acaba en negro. Aqui se mide cada una.

   La camara lenta se mide como relacion entre el tiempo del juego y el real: si se alimentase
   el reloj de camara lenta con el dt ya escalado, el efecto se alargaria solo. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.glb':'model/gltf-binary',
               '.mp3':'audio/mpeg', '.webp':'image/webp' };
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

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 460 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 180)));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 140)); });

await page.goto(base + (process.argv[2] || 'index.html') + '?debug=1');
await page.waitForFunction('window.__rr && window.__rr.ui', { timeout: 30000 });
await page.waitForFunction('document.getElementById("boot-go").classList.contains("on")', { timeout: 120000 });
await page.mouse.click(450, 230);
await page.evaluate(() => {
  const rr = window.__rr;
  rr.state.lang = 'es'; rr.state.quality = 'high'; rr.state.scheme = 'buttons';
  /* El tutorial se marca hecho: sus pasos avanzan solos al cumplirse la accion, y el paso
     siguiente llama a clearTraffic(), lo que se llevaba por delante los coches que esta
     prueba coloca a mano. Lo que se mide aqui no es el tutorial. */
  rr.state.tutorialDone = true;
  rr.ui.h.onBootDone();
});
await page.waitForTimeout(250);

/* ---------- 1. recompensa por rozar ---------- */
const coins = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.ui.h.onPlay();
  await new Promise(r => setTimeout(r, 300));
  const g = rr.game;
  g.clearTraffic();
  const LANE1 = -1.8;                    // centro del segundo carril
  const antes = { cash: g.cash, closes: g.closes };
  /* Dos cosas que la primera version de esta prueba hizo mal, las dos silenciosas:

     1) updateTraffic devuelve cada coche al CENTRO de su carril con un lerp, asi que
        desplazarlo a mano no dura: convergia sobre el jugador y provocaba un choque. Se
        desplaza al JUGADOR y el coche se queda en el centro de su carril.
     2) el trafico se repone solo hasta llenar la via, y con 40 m/s alguno de los coches
        nuevos alcanzaba al jugador antes de terminar la medida. Se bloquea freeAt, que es
        por donde pasa toda reposicion.

     La holgura util es  distancia - (semiancho del piloto + semiancho del coche), y para el
     nivel mas rasante tiene que quedar entre 0 y 0,45. */
  g.freeAt = () => false;
  const v = g.spawn(-8);
  v.lane = 1; v.x = LANE1; v.z = -8; v.speed = 0; v.laneT = 999;
  v.obj.position.set(v.x, 0, v.z);
  const d = 0.275 + v.halfW + 0.30;
  g.x = LANE1 + d; g.latV = 0; g.steerInput = 0;
  g.speed = 25;
  await new Promise(r => setTimeout(r, 1100));
  return { antes, cash: g.cash, closes: g.closes, modo: g.mode, sep:+d.toFixed(2),
           hud: document.getElementById('h-cash').textContent,
           pop: document.getElementById('coinpop').textContent };
});
console.log('1 roce (separacion ' + coins.sep + ' m, modo ' + coins.modo + '): caja ' +
            coins.antes.cash + ' -> ' + coins.cash +
            ', roces ' + coins.antes.closes + ' -> ' + coins.closes +
            ', HUD "' + coins.hud + '", aviso "' + coins.pop + '"');
console.log('  ', coins.closes > coins.antes.closes && coins.cash > coins.antes.cash &&
                  coins.pop.startsWith('+') ? 'OK' : 'FALLA');

/* ---------- 2. la secuencia de choque ---------- */
const crash = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.ui.h.onRestart();
  await new Promise(r => setTimeout(r, 400));
  const g = rr.game, w = rr.world;
  g.clearTraffic();
  g.speed = 55;                                   // ~200 km/h
  const cam0 = w.camera.position.clone();

  // se provoca el choque colocando un coche encima
  const v = g.spawn(-2);
  v.lane = 1; v.x = g.x; v.z = -1.2; v.speed = 0;
  v.obj.position.set(v.x, 0, v.z);

  const muestras = [];
  const t0 = performance.now();
  let modo = g.mode;
  for (let i = 0; i < 150; i++){
    await new Promise(r => requestAnimationFrame(r));
    if (g.mode === 'dead'){
      muestras.push({
        t: +((performance.now() - t0) / 1000).toFixed(2),
        camY: +w.camera.position.y.toFixed(2),
        camZ: +w.camera.position.z.toFixed(2),
        rot: +Math.abs(w.camera.rotation.z).toFixed(2),
        motoY: +w.bikeGroup.position.y.toFixed(2),
        motoZ: +w.bikeGroup.position.z.toFixed(2),
        blur: +w.crashBlur().toFixed(1),
        fade: +getComputedStyle(document.getElementById('fade')).opacity,
        escala: +g.timeScale(0).toFixed(2)
      });
      modo = 'dead';
      /* A mitad del vuelo se copia el lienzo a un canvas 2D: el buffer de WebGL no se conserva
         entre fotogramas, asi que hay que hacerlo en la MISMA tarea que el render. Al final de
         la secuencia ya esta todo en negro y una captura de ahi no ensena nada. */
      if (muestras.length === 16){
        const cv = rr.world.canvas;
        const pad = document.createElement('canvas');
        pad.width = cv.width; pad.height = cv.height;
        const c2 = pad.getContext('2d');
        c2.drawImage(cv, 0, 0);
        // el HUD no entra en esta copia; su opacidad se anota aparte
        window.__crashShot = pad.toDataURL('image/png');
        window.__crashHudOp = +getComputedStyle(document.getElementById('hud')).opacity;
      }
    }
  }
  return { modo, cam0:[+cam0.y.toFixed(2), +cam0.z.toFixed(2)], muestras,
           shot: window.__crashShot || null, hudOp: window.__crashHudOp };
});

if (crash.modo !== 'dead'){
  console.log('2 choque: NO se produjo el choque, la prueba no vale');
} else {
  const m = crash.muestras;
  const maxCamY = Math.max(...m.map(s => s.camY));
  const minCamZ = Math.min(...m.map(s => s.camZ));
  const maxRot = Math.max(...m.map(s => s.rot));
  const maxBlur = Math.max(...m.map(s => s.blur));
  const maxFade = Math.max(...m.map(s => s.fade));
  const sep = Math.max(...m.map(s => Math.abs(s.camZ - s.motoZ)));
  const minEsc = Math.min(...m.map(s => s.escala));
  console.log('2 choque (' + m.length + ' fotogramas de vuelo):');
  console.log('   el piloto sale volando:  altura hasta ' + maxCamY + ' m ' +
              (maxCamY > 2.0 ? 'OK' : 'FALLA'));
  console.log('   sale hacia delante:      z hasta ' + minCamZ + ' m ' +
              (minCamZ < -3 ? 'OK' : 'FALLA'));
  console.log('   da vueltas:              alabeo hasta ' + maxRot + ' rad ' +
              (maxRot > 1.0 ? 'OK' : 'FALLA'));
  console.log('   la moto se separa:       ' + sep.toFixed(2) + ' m de distancia ' +
              (sep > 1.5 ? 'OK' : 'FALLA'));
  console.log('   se desenfoca:            hasta ' + maxBlur + ' px ' +
              (maxBlur > 8 ? 'OK' : 'FALLA'));
  console.log('   se va a negro:           opacidad hasta ' + maxFade.toFixed(2) + ' ' +
              (maxFade > 0.9 ? 'OK' : 'FALLA'));
  console.log('   camara lenta:            escala minima ' + minEsc + ' ' +
              (minEsc < 0.45 ? 'OK' : 'FALLA'));
  console.log('   el HUD se retira:        opacidad ' + crash.hudOp + ' a mitad del vuelo ' +
              (crash.hudOp < 0.5 ? 'OK' : 'FALLA'));
  if (crash.shot){
    const { writeFile } = await import('node:fs/promises');
    await writeFile(SHOT + 'rr-crash.png',
                    Buffer.from(crash.shot.split(',')[1], 'base64'));
    console.log('   fotograma de mitad del vuelo en rr-crash.png');
  }
}
console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno');
await browser.close();
server.close();
