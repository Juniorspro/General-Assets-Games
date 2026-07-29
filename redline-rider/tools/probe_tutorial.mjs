/* Recorre el tutorial ENTERO haciendo las acciones de verdad.

   Lo que hay que demostrar no es que los textos aparezcan, sino que cada paso AVANZA al hacer la
   accion y NO avanza sin hacerla. Ya no hay boton de siguiente, asi que esa es la unica forma de
   pasar: si una condicion estuviera mal escrita, el tutorial se quedaria clavado para siempre y
   el jugador no podria ni empezar. Por eso aqui se comprueban las dos direcciones.

   Tambien se comprueba que el paso de direccion habla del esquema activo: explicar "arrastra el
   dedo" a alguien con el giroscopio puesto es peor que no explicar nada. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const FILE = process.argv[2] || 'index.html';
const PASOS = 5;
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
const page = await browser.newPage({ viewport: { width: 900, height: 460 }, hasTouch: true });
const errs = [];
const fallos = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 180)));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 140)); });
const ok = (nombre, cond, detalle) => {
  console.log((cond ? '  OK    ' : '  FALLA ') + nombre + (detalle ? '  ' + detalle : ''));
  if (!cond) fallos.push(nombre);
};

await page.goto(base + FILE + '?debug=1');
await page.waitForFunction('window.__rr && window.__rr.tut', { timeout: 40000 });
await page.waitForFunction('document.getElementById("boot-go").classList.contains("on")', { timeout: 120000 });
await page.mouse.click(450, 230);

/* ---------- 1. el boton de siguiente no existe ---------- */
const boton = await page.evaluate(() => ({
  enElDom: !!document.getElementById('tut-next'),
  enElHtml: /tut-next/.test(document.documentElement.innerHTML)
}));
console.log('1 el boton de siguiente');
ok('no queda ni en el DOM ni en el HTML', !boton.enElDom && !boton.enElHtml, JSON.stringify(boton));

/* ---------- 2. se ofrece solo la primera vez ---------- */
const ofrece = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.state.lang = 'es'; rr.state.quality = 'high'; rr.state.scheme = 'buttons';
  rr.state.tutorialDone = false;
  rr.ui.h.onBootDone();
  await new Promise(r => setTimeout(r, 500));
  return { activo: rr.tut.active, pasos: rr.tut.steps.length, pantalla: rr.ui.screen,
           visible: document.getElementById('tut').classList.contains('on') };
});
console.log('2 arranque');
ok('se ofrece al primer arranque', ofrece.activo && ofrece.visible, JSON.stringify(ofrece));
ok('son ' + PASOS + ' pasos, no una charla', ofrece.pasos === PASOS, 'hay ' + ofrece.pasos);

/* ---------- 3. el texto de direccion sigue al esquema ---------- */
const textos = await page.evaluate(async () => {
  const rr = window.__rr;
  const out = {};
  for (const esq of ['buttons', 'touch']){
    rr.state.scheme = esq;
    rr.tut.start();
    const paso = rr.tut.steps[1];               // direccion: segundo paso
    out[esq] = typeof paso.key === 'function' ? paso.key() : paso.key;
  }
  return out;
});
console.log('3 texto de direccion');
ok('sigue al esquema activo',
   textos.buttons === 'tut.steer.buttons' && textos.touch === 'tut.steer.touch', JSON.stringify(textos));

/* ---------- 4. sin hacer nada NO avanza ---------- */
const quieto = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.state.scheme = 'buttons'; rr.state.tutorialDone = false;
  rr.ui.h.onTutorial();
  await new Promise(r => setTimeout(r, 400));
  const i0 = rr.tut.i;
  await new Promise(r => setTimeout(r, 3500));   // sin tocar ningun mando
  return { i0, i1: rr.tut.i, activo: rr.tut.active };
});
console.log('4 sin tocar nada');
ok('el primer paso NO se pasa solo', quieto.i0 === quieto.i1 && quieto.activo, JSON.stringify(quieto));

/* ---------- 5. recorrido completo haciendo las acciones ---------- */
const rec = await page.evaluate(async () => {
  const rr = window.__rr, g = rr.game, ui = rr.ui;
  rr.state.scheme = 'buttons';
  rr.state.tutorialDone = false;
  ui.h.onTutorial();
  await new Promise(r => setTimeout(r, 400));

  const espera = ms => new Promise(r => setTimeout(r, ms));
  const claveDe = s => typeof s.key === 'function' ? s.key() : s.key;
  const pulsa = (id, on) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup',
                                     { pointerId: 900, bubbles:true }));
  };
  /* Mantiene un mando pulsado hasta que el tutorial cambia de paso, con techo de tiempo. Antes
     se esperaba un numero fijo de segundos por paso y la prueba declaraba atascado lo que solo
     necesitaba un poco mas de carretera. */
  const hasta = async (id, ms) => {
    const i0 = rr.tut.i;
    if (id) pulsa(id, true);
    const t0 = Date.now();
    while (rr.tut.i === i0 && rr.tut.active && Date.now() - t0 < ms) await espera(120);
    if (id) pulsa(id, false);
  };

  const log = [];
  let guard = 0;
  while (rr.tut.active && guard++ < 12){
    const i = rr.tut.i;
    const s = rr.tut.steps[i];
    const fila = { i, key:claveDe(s), pose:s.pose, resalte: s.hl ? (typeof s.hl === 'function' ? s.hl() : s.hl) : null,
                   escala: rr.tut.timeScale(), trafico: !!s.traffic, accion: !!s.done,
                   kmh: Math.round(g.speed * 3.6) };
    const k = fila.key;
    if (k === 'tut.gas') await hasta('p-gas', 9000);
    else if (k === 'tut.brake') await hasta('p-brake', 9000);
    else if (k.startsWith('tut.steer')) await hasta('p-right', 9000);
    else if (k === 'tut.close'){
      /* Aqui no se coloca nada a mano: el propio paso pone el coche delante y mas lento, y de lo
         que se trata es de comprobar que alcanzarlo con el gas basta para pasar el paso. */
      await hasta('p-gas', 25000);
    } else {
      // despedida: no hay accion ni boton, se va sola por tiempo
      await hasta(null, 8000);
    }
    fila.avanzo = rr.tut.i !== i || !rr.tut.active;
    fila.modo = g.mode;
    log.push(fila);
    if (!fila.avanzo) break;
    await espera(150);
  }
  return { log, activo: rr.tut.active, pantalla: rr.ui.screen, hecho: rr.state.tutorialDone, guard };
});

console.log('\n5 recorrido paso a paso');
console.log('   #  clave              pose      accion  resalte   escala  km/h  avanzo');
for (const r of rec.log)
  console.log('   ' + String(r.i + 1).padStart(2), r.key.padEnd(18), r.pose.padEnd(9),
              String(r.accion).padEnd(7), String(r.resalte).padEnd(9),
              String(r.escala).padEnd(7), String(r.kmh).padStart(4),
              ' ' + (r.avanzo ? 'si' : 'NO') + '  ' + (r.modo || ''));

ok('se recorren los ' + PASOS + ' pasos', rec.log.length === PASOS, 'recorridos ' + rec.log.length);
ok('todos avanzan haciendo la accion', rec.log.every(r => r.avanzo));
ok('solo la despedida no pide accion',
   rec.log.filter(r => !r.accion).length === 1 && !rec.log[rec.log.length - 1].accion);
const lentos = rec.log.filter(r => r.escala < 1).map(r => r.key);
ok('hay camara lenta didactica', lentos.length >= 1, JSON.stringify(lentos));
ok('no hay trafico mientras se ensena a moverse',
   rec.log.slice(0, 4).every(r => !r.trafico));
ok('acaba y queda marcado', !rec.activo && rec.hecho && rec.pantalla === 'menu',
   '(activo ' + rec.activo + ', hecho ' + rec.hecho + ', pantalla ' + rec.pantalla + ')');

/* ---------- 6. ya hecho: no debe volver a ofrecerse ---------- */
const otra = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.ui.h.onBootDone();
  await new Promise(r => setTimeout(r, 400));
  return { activo: rr.tut.active, pantalla: rr.ui.screen };
});
console.log('\n6 repeticion');
ok('una vez hecho no se repite', !otra.activo && otra.pantalla === 'menu', JSON.stringify(otra));

/* ---------- 7. cuanto tapa ---------- */
await page.evaluate(() => { window.__rr.state.tutorialDone = false; window.__rr.ui.h.onTutorial(); });
await page.waitForTimeout(700);
/* "Tapa mucho" hay que convertirlo en un numero o no se puede saber si se ha arreglado: la
   primera version ocupaba el 58% del ancho y el 29% del alto. */
const huella = await page.evaluate(() => {
  const st = document.getElementById('stage');
  const caja = document.getElementById('tut-box').getBoundingClientRect();
  const dino = document.getElementById('tut-dino').getBoundingClientRect();
  const W = st.clientWidth, H = st.clientHeight;
  const area = r => (r.width * r.height) / (W * H) * 100;
  return { anchoCaja:+(caja.width / W * 100).toFixed(1), altoCaja:+(caja.height / H * 100).toFixed(1),
           areaTotal:+(area(caja) + area(dino)).toFixed(1) };
});
console.log('\n7 estorbo en pantalla');
ok('el asistente tapa menos del 12% del area', huella.areaTotal < 12,
   huella.anchoCaja + '% del ancho, ' + huella.altoCaja + '% del alto, ' + huella.areaTotal + '% del area');

/* ---------- 8. con giroscopio vivo ----------
   Debe ensenar INCLINAR y las flechas deben estar escondidas. Antes se decidia al arrancar el
   tutorial, cuando el sensor aun no habia contestado, y un movil con giroscopio acababa
   aprendiendo a girar con botones. */
const conGiro = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.state.scheme = 'tilt';
  rr.state.tutorialDone = false;
  await rr.controls.enableGyro();
  const burst = () => { for (let i = 0; i < 12; i++)
    dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta:35, gamma:0, alpha:0 })); };
  burst();
  await new Promise(r => setTimeout(r, 200));
  rr.ui.h.onTutorial();
  await new Promise(r => setTimeout(r, 300));
  // se salta hasta el paso de direccion manteniendo el sensor vivo
  rr.tut.next(); burst(); await new Promise(r => setTimeout(r, 150));
  const s = rr.tut.steps[rr.tut.i];
  return { esquema: rr.controls.activeScheme(),
           clave: typeof s.key === 'function' ? s.key() : s.key,
           flechas: getComputedStyle(document.getElementById('p-left')).display !== 'none',
           texto: document.getElementById('tut-txt').textContent.slice(0, 46) };
});
console.log('\n8 con giroscopio vivo');
ok('ensena a inclinar, no los botones', conGiro.esquema === 'tilt' && conGiro.clave === 'tut.steer.tilt',
   JSON.stringify({ esquema: conGiro.esquema, clave: conGiro.clave }));
ok('las flechas estan escondidas', !conGiro.flechas);
console.log('        texto: "' + conGiro.texto + '"');

/* ---------- 9. no tapa mandos ---------- */
const tapa = await page.evaluate(() => {
  /* El DINO tambien cuenta, no solo el globo: comprobando solo la caja se colaba que el
     personaje se pusiera encima de un mando que el tutorial manda pulsar. */
  const mal = [];
  for (const mio of ['tut-box', 'tut-dino']){
    const a = document.getElementById(mio).getBoundingClientRect();
    for (const id of ['p-gas','p-brake','p-left','p-right','p-horn','speedo','rpm']){
      const el = document.getElementById(id);
      if (!el || getComputedStyle(el).display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1) continue;
      const w = Math.min(a.right, r.right) - Math.max(a.left, r.left);
      const h = Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top);
      if (w > 2 && h > 2) mal.push(mio + '/' + id + ' ' + Math.round(w) + 'x' + Math.round(h));
    }
  }
  return mal;
});
console.log('\n9 solapes');
ok('el asistente no tapa ningun mando', tapa.length === 0, tapa.join(', '));

await page.screenshot({ path: SHOT + 'rr-tut.png' });
console.log('\ncaptura en rr-tut.png');
console.log('errores de pagina:', errs.length ? errs.slice(0, 4) : 'ninguno');
if (errs.length) fallos.push('errores de pagina');
console.log(fallos.length ? '\nFALLOS: ' + fallos.join('; ') : '\nTODO OK');
await browser.close();
server.close();
process.exit(fallos.length ? 1 : 0);
