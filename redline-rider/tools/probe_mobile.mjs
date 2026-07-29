/* Verificacion sin telefono: viewport vertical, eventos de orientacion sintetizados y
   medidas sobre la escena. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.glb':'model/gltf-binary',
               '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.png':'image/png' };

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
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });

const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 140)); });
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 200)));
page.on('requestfailed', r => errs.push('REQFAIL: ' + r.url().slice(-60)));

const FILE = process.argv[2] || 'index.html';
await page.goto(base + FILE + '?debug=1');
await page.waitForFunction('window.__rr && window.__rr.ui', { timeout: 30000 });
await page.waitForFunction('document.getElementById("boot-go").classList.contains("on")', { timeout: 90000 });

/* ---------- 1. el escenario esta girado y el lienzo mide en horizontal ---------- */
const geo = await page.evaluate(() => {
  const st = document.getElementById('stage'), cv = document.getElementById('gl');
  return {
    rot: document.documentElement.classList.contains('rot'),
    transform: getComputedStyle(st).transform,
    stage: [st.clientWidth, st.clientHeight],
    canvasCss: [cv.clientWidth, cv.clientHeight],
    canvasBuf: [cv.width, cv.height],
    aspect: +window.__rr.world.camera.aspect.toFixed(3),
    viewport: [innerWidth, innerHeight]
  };
});
console.log('1 rotacion:', JSON.stringify(geo));

/* ---------- 2. el puntero mapeado ---------- */
/* La imagen del juego es horizontal 844x390. Con origen 0 0 y translateX(390) rotate(90),
   el local (x,y) acaba en pantalla en (390 - y, x). Se comprueba la inversa. */
const mapped = await page.evaluate(() => {
  const m = (cx, cy) => window.__rr.controls.mapPointer({ clientX:cx, clientY:cy });
  const round = o => ({ x:Math.round(o.x), y:Math.round(o.y) });
  return { a: round(m(370, 830)), b: round(m(390, 0)), c: round(m(195, 422)) };
});
console.log('2 puntero:', JSON.stringify(mapped),
  mapped.a.x === 830 && mapped.a.y === 20 && mapped.b.x === 0 && mapped.b.y === 0 ? 'OK' : 'FALLA');

/* ---------- 3. a conducir ---------- */
await page.mouse.click(195, 422);
await page.waitForTimeout(400);
await page.evaluate(() => {
  const rr = window.__rr;
  rr.state.lang = 'es'; rr.state.quality = 'high'; rr.state.scheme = 'buttons';
  rr.ui.h.onBootDone();
});
await page.waitForTimeout(300);
await page.evaluate(() => window.__rr.ui.h.onPlay());
await page.waitForTimeout(700);
await page.evaluate(() => window.__rr.ui.paintPedals());

const pads = await page.evaluate(() => {
  const out = {};
  for (const id of ['p-gas','p-brake','p-left','p-right','p-horn']){
    const el = document.getElementById(id);
    const r = el.getBoundingClientRect();
    out[id] = [Math.round(r.width), Math.round(r.height), getComputedStyle(el).display !== 'none'];
  }
  return out;
});
console.log('3 pedales:', JSON.stringify(pads));

/* Solapes: mezclar clamp() en el tamano con desplazamientos a pelo los produce en cuanto el
   clamp crece, y no se ven en la pantalla en la que se ajusto el CSS. Se comprueba en tres
   tamanos, del movil pequeno a la tableta. */
async function overlaps(){
  return page.evaluate(() => {
    const ids = ['p-gas','p-brake','p-left','p-right','p-horn','speedo','rpm','pausebtn'];
    const box = [];
    for (const id of ids){
      const el = document.getElementById(id);
      if (!el || getComputedStyle(el).display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1) continue;
      box.push({ id, r });
    }
    const bad = [];
    for (let i = 0; i < box.length; i++) for (let j = i + 1; j < box.length; j++){
      const a = box[i].r, b = box[j].r;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 1 && h > 1) bad.push(box[i].id + '/' + box[j].id + ' ' + Math.round(w) + 'x' + Math.round(h));
    }
    return bad;
  });
}
for (const [w, h] of [[390, 844], [844, 390], [820, 1180], [1180, 820]]){
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(260);
  const bad = await overlaps();
  console.log('   solapes ' + w + 'x' + h + ':', bad.length ? bad.join(', ') : 'ninguno');
}
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);

/* ---------- 4. gas y freno por el boton ---------- */
async function pressPad(id, ms){
  const box = await page.locator('#' + id).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
const v0 = await page.evaluate(() => window.__rr.game.speed);
await pressPad('p-gas', 1500);
const v1 = await page.evaluate(() => window.__rr.game.speed);
await pressPad('p-brake', 1100);
const v2 = await page.evaluate(() => window.__rr.game.speed);
console.log('4 gas/freno m/s:', v0.toFixed(1), '->', v1.toFixed(1), '->', v2.toFixed(1),
            v1 > v0 + 1 && v2 < v1 - 1 ? 'OK' : 'FALLA');

/* ---------- 5. el giro por botones no esta invertido ---------- */
async function steerTest(padId){
  await page.evaluate(() => { const g = window.__rr.game; g.x = 0; g.latV = 0; g.steerInput = 0; });
  await pressPad(padId, 900);
  return page.evaluate(() => window.__rr.game.x);
}
const xR = await steerTest('p-right');
const xL = await steerTest('p-left');
console.log('5 giro botones: derecha x=' + xR.toFixed(2), 'izquierda x=' + xL.toFixed(2),
            xR > 0.3 && xL < -0.3 ? 'OK' : 'FALLA');

/* ---------- 6. giroscopio: signo de un extremo a otro ---------- */
/* Modelo directo: se coloca el aparato en una postura fisica (cabeceo hacia atras + alabeo)
   y se derivan beta y gamma de la gravedad resultante, que es lo que reporta el navegador.
   Asi la prueba no repite la formula del modulo, la contrasta. */
function eulerFor(pitchDeg, rollDeg){
  const th = pitchDeg * Math.PI / 180, dl = rollDeg * Math.PI / 180;
  let x = [1, 0, 0];
  let y = [0, Math.sin(th), Math.cos(th)];
  const z = [0, -Math.cos(th), Math.sin(th)];
  const cd = Math.cos(dl), sd = Math.sin(dl);
  const xr = x.map((v, i) => v * cd - y[i] * sd);
  const yr = x.map((v, i) => v * sd + y[i] * cd);
  x = xr; y = yr;
  const g = [0, 0, -1];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const gd = [dot(g, x), dot(g, y), dot(g, z)];
  const beta = Math.asin(Math.max(-1, Math.min(1, -gd[1])));
  const cB = Math.cos(beta);
  const gamma = Math.abs(cB) < 1e-6 ? 0 : Math.atan2(gd[0] / cB, -gd[2] / cB);
  return { beta: beta * 180 / Math.PI, gamma: gamma * 180 / Math.PI };
}

await page.evaluate(() => {
  window.__rr.state.scheme = 'tilt';
  window.__rr.state.invert = false;
  window.__rr.state.sens = 1;
  return window.__rr.controls.enableGyro();
});
await page.evaluate(() => window.__rr.controls.calibrateGyro());

const send = async (beta, gamma, ms, n) => {
  await page.evaluate(([b, g, k]) => {
    for (let i = 0; i < k; i++)
      window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',
        { beta:b, gamma:g, alpha:0, absolute:true }));
  }, [beta, gamma, n || 10]);
  await page.waitForTimeout(ms);
  return page.evaluate(() => ({ ...window.__rr.controls.gyroDebug(),
                                steer: window.__rr.controls.input.steer }));
};

const PITCH = 55;
{ const e = eulerFor(PITCH, 0); await send(e.beta, e.gamma, 200); }
const rows = [];
for (const r of [-20, -10, -4, 0, 4, 10, 20]){
  const e = eulerFor(PITCH, r);
  const s = await send(e.beta, e.gamma, 450);
  rows.push({ alabeo:r, leido:+s.raw.toFixed(1), steer:+s.steer.toFixed(3) });
}
console.log('6 giroscopio (centro a alabeo 0, cabeceo ' + PITCH + ' grados):');
for (const r of rows) console.log('   alabeo ' + String(r.alabeo).padStart(4) +
  '   leido ' + String(r.leido).padStart(6) + '   steer ' + String(r.steer).padStart(7));
console.log('   signo', rows.every(r => r.alabeo === 0 || Math.sign(r.steer) === Math.sign(r.alabeo)) ? 'OK' : 'FALLA',
            '| angulo leido', rows.every(r => Math.abs(r.leido - r.alabeo) < 1.0) ? 'OK' : 'FALLA');

// el mismo aparato sostenido en horizontal debe dar el MISMO signo
await page.evaluate(() => window.__rr.controls.calibrateGyro());
{ const e = eulerFor(PITCH, -90); await send(e.beta, e.gamma, 250); }
const rowsL = [];
for (const r of [-15, 0, 15]){
  const e = eulerFor(PITCH, r - 90);
  const s = await send(e.beta, e.gamma, 450);
  rowsL.push({ alabeo:r, leido:+s.raw.toFixed(1), steer:+s.steer.toFixed(3) });
}
console.log('   sostenido en horizontal (girado 90 grados a mano):');
for (const r of rowsL) console.log('   alabeo ' + String(r.alabeo).padStart(4) +
  '   leido ' + String(r.leido).padStart(6) + '   steer ' + String(r.steer).padStart(7));
console.log('   signo', rowsL.every(r => r.alabeo === 0 || Math.sign(r.steer) === Math.sign(r.alabeo)) ? 'OK' : 'FALLA');


/* ---------- 10. la sensibilidad no debe impedir llegar al tope ---------- */
/* Multiplicar la SALIDA ya recortada a +-1 hace que con sens < 1 el tope sea inalcanzable
   (no se puede cambiar de carril) y que con sens > 1 el ajuste no haga nada. */
const sensRows = [];
for (const sens of [0.5, 1, 2]){
  const r = await page.evaluate(async sv => {
    const rr = window.__rr;
    rr.state.sens = sv; rr.state.scheme = 'buttons'; rr.state.invert = false;
    rr.controls.releaseAll();
    // se mantiene el boton derecho pulsado y se deja correr el barrido
    const el = document.getElementById('p-right');
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId:901, bubbles:true }));
    await new Promise(r2 => setTimeout(r2, 1400));
    const tope = rr.controls.input.steer;
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId:901, bubbles:true }));
    return +tope.toFixed(3);
  }, sens);
  sensRows.push({ sens, tope:r });
}
console.log('10 sensibilidad (botones, tope alcanzable):',
  sensRows.map(r => 'sens ' + r.sens + ' -> ' + r.tope).join(' | '),
  sensRows.every(r => r.tope > 0.98) ? 'OK' : 'FALLA');

/* ---------- 11. el sensor dormido no debe dejar el manillar pegado ---------- */
const stale = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.state.scheme = 'tilt'; rr.state.sens = 1; rr.state.invert = false;
  await rr.controls.enableGyro();
  rr.controls.calibrateGyro();
  const burst = (beta, gamma, n) => {
    for (let i = 0; i < n; i++)
      dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta, gamma, alpha:0 }));
  };
  /* Primero la postura NEUTRA, que es la que fija el centro (se promedian varias lecturas).
     Calibrar directamente sobre la postura inclinada haria que el angulo relativo fuese cero
     y la prueba mediria otra cosa. */
  burst(35.0, 0, 12);
  await new Promise(r => setTimeout(r, 250));
  burst(32.7, 13.5, 12);                        // ahora si, inclinado 20 grados a la derecha
  /* 300 ms y no 450: el vigilante da el sensor por dormido a los 500 ms, y con 450 la lectura
     caia pegada al umbral. En un fotograma lento el reloj real se pasaba de 500 antes de leer y
     la prueba fallaba una vez de cada dos, culpando al juego de un limite de la propia prueba. */
  await new Promise(r => setTimeout(r, 300));
  const girando = +rr.controls.input.steer.toFixed(3);
  const estado1 = rr.controls.gyroStatus();
  const d1 = rr.controls.gyroDebug();
  await new Promise(r => setTimeout(r, 1600));  // el sensor se calla: app en segundo plano
  return { girando, estado1, raw:+d1.raw.toFixed(1), activo:d1.active,
           zero:d1.zero, muestras:d1.samples.length, flat:+d1.flat.toFixed(2),
           concedido:d1.granted, alguna:d1.everActive,
           despues:+rr.controls.input.steer.toFixed(3), estado2: rr.controls.gyroStatus() };
});
console.log('11 sensor dormido:', JSON.stringify(stale),
  stale.girando > 0.1 && Math.abs(stale.despues) < 0.02 && stale.estado2 === 'stale' ? 'OK' : 'FALLA');

/* ---------- 12. el gas no debe quedar muerto tras cambiar de aplicacion ---------- */
/* Sin pointerup, el conjunto de punteros del mando conserva un id rancio: held.size deja de
   ser cero y el siguiente onDown NO dispara. El gas queda muerto el resto de la partida. */
const ghost = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.state.scheme = 'buttons';
  const el = document.getElementById('p-gas');
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId:801, bubbles:true }));
  await new Promise(r => setTimeout(r, 120));
  const antes = rr.controls.input.throttle;
  rr.controls.releaseAll();                     // equivale a cambiar de aplicacion
  await new Promise(r => setTimeout(r, 120));
  const sueltoOk = rr.controls.input.throttle === 0;
  // al volver, el navegador SIEMPRE asigna un pointerId nuevo
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerId:802, bubbles:true }));
  await new Promise(r => setTimeout(r, 150));
  const despues = rr.controls.input.throttle;
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId:802, bubbles:true }));
  return { antes, sueltoOk, despues };
});
console.log('12 gas tras cambiar de app:', JSON.stringify(ghost),
  ghost.antes === 1 && ghost.sueltoOk && ghost.despues === 1 ? 'OK' : 'FALLA');
await page.evaluate(() => { window.__rr.state.sens = 1; window.__rr.controls.releaseAll(); });


/* ---------- 13. soltar una flecha con la otra pulsada ---------- */
/* Con un solo signo compartido, soltar la derecha con la izquierda aun pulsada dejaba el giro
   en cero en vez de volver a la izquierda. */
const both = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.state.scheme = 'buttons'; rr.state.sens = 1; rr.state.invert = false;
  rr.controls.releaseAll();
  const L = document.getElementById('p-left'), R = document.getElementById('p-right');
  const ev = (el, t, id) => el.dispatchEvent(new PointerEvent(t, { pointerId:id, bubbles:true }));
  ev(L, 'pointerdown', 701);
  await new Promise(r => setTimeout(r, 700));
  const soloIzq = +rr.controls.input.steer.toFixed(2);
  ev(R, 'pointerdown', 702);
  await new Promise(r => setTimeout(r, 700));
  const ambas = +rr.controls.input.steer.toFixed(2);
  ev(R, 'pointerup', 702);
  await new Promise(r => setTimeout(r, 700));
  const vueltaIzq = +rr.controls.input.steer.toFixed(2);
  ev(L, 'pointerup', 701);
  return { soloIzq, ambas, vueltaIzq };
});
console.log('13 flechas simultaneas:', JSON.stringify(both),
  both.soloIzq < -0.9 && Math.abs(both.ambas) < 0.2 && both.vueltaIzq < -0.9 ? 'OK' : 'FALLA');

/* ---------- 14. el respaldo del giroscopio deja algo VISIBLE que tocar ---------- */
const fbPage = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await fbPage.goto(base + FILE + '?debug=1');
await fbPage.waitForFunction('window.__rr && window.__rr.controls', { timeout: 30000 });
const fb = await fbPage.evaluate(() => {
  const rr = window.__rr;
  rr.state.scheme = 'tilt';           // aparato sin sensor: nunca ha llegado una lectura
  const esquema = rr.controls.activeScheme();
  rr.ui.paintPedals();
  const flechas = getComputedStyle(document.getElementById('p-left')).display !== 'none';
  return { esquema, flechas, estado: rr.controls.gyroStatus() };
});
await fbPage.close();
console.log('14 respaldo sin sensor:', JSON.stringify(fb),
  fb.esquema === 'buttons' ? 'OK' : 'FALLA (' + fb.esquema + ' no deja nada visible que tocar)');

/* ---------- 15. los mandos no deben estar pulsables en PAUSA ---------- */
const paused = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.ui.h.onPlay();
  await new Promise(r => setTimeout(r, 300));
  const cs = () => getComputedStyle(document.getElementById('pedals'));
  const conduciendo = { vis: cs().visibility, op: +cs().opacity };
  rr.ui.h.onPause();
  await new Promise(r => setTimeout(r, 400));
  const enPausa = { vis: cs().visibility, op: +cs().opacity };
  rr.ui.h.onResume();
  return { conduciendo, enPausa };
});
console.log('15 mandos en pausa:', JSON.stringify(paused),
  paused.conduciendo.op === 1 && paused.enPausa.op === 0 ? 'OK' : 'FALLA');

/* ---------- 16. la sacudida del choque no debe tumbar la camara ---------- */
const shake = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.world.addShake(1.6);                     // lo que mete un choque
  let peor = 0;
  for (let i = 0; i < 40; i++){
    await new Promise(r => requestAnimationFrame(r));
    // sobre el cabeceo y descontando su reposo: el alabeo por inclinacion falsearia el pico
    peor = Math.max(peor, Math.abs(rr.world.camera.rotation.x - rr.world.pitch));
  }
  return +(peor * 180 / Math.PI).toFixed(2);
});
console.log('16 sacudida del choque:', shake, 'grados de pico',
  shake < 8 ? 'OK' : 'FALLA (la camara acaba mirando al suelo)');

/* ---------- 7. encuadre de la moto ---------- */
const framing = await page.evaluate(() => {
  const rr = window.__rr;
  const bike = rr.world.playerBike;
  const cam = rr.world.camera;
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  rr.world.bikeGroup.updateWorldMatrix(true, true);
  bike.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    for (const px of [bb.min.x, bb.max.x]) for (const py of [bb.min.y, bb.max.y]) for (const pz of [bb.min.z, bb.max.z]){
      const v = new bb.min.constructor(px, py, pz).applyMatrix4(o.matrixWorld);
      min[0] = Math.min(min[0], v.x); min[1] = Math.min(min[1], v.y); min[2] = Math.min(min[2], v.z);
      max[0] = Math.max(max[0], v.x); max[1] = Math.max(max[1], v.y); max[2] = Math.max(max[2], v.z);
    }
  });
  return {
    motoMin: min.map(v => +v.toFixed(2)), motoMax: max.map(v => +v.toFixed(2)),
    camara: [+cam.position.x.toFixed(2), +cam.position.y.toFixed(2), +cam.position.z.toFixed(2)],
    near: cam.near, fov: +cam.fov.toFixed(1)
  };
});
console.log('7 encuadre:', JSON.stringify(framing));
await page.screenshot({ path: SHOT + 'rr-vertical.png' });

/* ---------- 8. en horizontal no se debe girar ---------- */
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(500);
const land = await page.evaluate(() => ({
  rot: document.documentElement.classList.contains('rot'),
  transform: getComputedStyle(document.getElementById('stage')).transform,
  canvas: [document.getElementById('gl').clientWidth, document.getElementById('gl').clientHeight]
}));
console.log('8 horizontal:', JSON.stringify(land));
await page.screenshot({ path: SHOT + 'rr-horizontal.png' });

/* ---------- 9. un escritorio estrecho NO debe girarse ---------- */
/* Una ventana de ordenador puede medir mas alto que ancho, y girar el juego 90 grados ahi
   seria absurdo: la condicion tiene que exigir tambien un aparato de dedo. */
const pcPage = await browser.newPage({ viewport: { width: 520, height: 900 }, hasTouch: false });
await pcPage.goto(base + FILE + '?debug=1');
await pcPage.waitForFunction('window.__rr && window.__rr.controls', { timeout: 30000 });
await pcPage.waitForTimeout(500);
const pc = await pcPage.evaluate(() => ({
  rot: document.documentElement.classList.contains('rot'),
  transform: getComputedStyle(document.getElementById('stage')).transform,
  dedo: (navigator.maxTouchPoints || 0) > 0 || matchMedia('(pointer: coarse)').matches
}));
console.log('9 escritorio 520x900:', JSON.stringify(pc), pc.rot ? 'FALLA' : 'OK');
await pcPage.close();

console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
await browser.close();
server.close();
