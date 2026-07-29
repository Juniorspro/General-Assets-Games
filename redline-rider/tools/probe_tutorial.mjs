/* Recorre el tutorial ENTERO haciendo las acciones de verdad.

   Lo que hay que demostrar no es que los textos aparezcan, sino que los pasos con condicion
   AVANZAN al hacer la accion y NO avanzan sin hacerla. Un tutorial que se pasa solo con el
   boton no ensena nada, y es un fallo que no se ve leyendo el codigo.

   Tambien se comprueba que el paso de direccion habla del esquema activo: explicar "arrastra el
   dedo" a alguien con el giroscopio puesto es peor que no explicar nada. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const SHOT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/';
const FILE = process.argv[2] || 'index.html';
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
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 180)));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 140)); });

await page.goto(base + FILE + '?debug=1');
await page.waitForFunction('window.__rr && window.__rr.tut', { timeout: 40000 });
await page.waitForFunction('document.getElementById("boot-go").classList.contains("on")', { timeout: 120000 });
await page.mouse.click(450, 230);

/* ---------- se ofrece solo la primera vez ---------- */
const ofrece = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.state.lang = 'es'; rr.state.quality = 'high'; rr.state.scheme = 'buttons';
  rr.state.tutorialDone = false;
  rr.ui.h.onBootDone();
  await new Promise(r => setTimeout(r, 500));
  return { activo: rr.tut.active, pantalla: rr.ui.screen,
           visible: document.getElementById('tut').classList.contains('on') };
});
console.log('1 se ofrece al primer arranque:', JSON.stringify(ofrece),
            ofrece.activo && ofrece.visible ? 'OK' : 'FALLA');

/* ---------- el texto de direccion sigue al esquema ---------- */
const textos = await page.evaluate(async () => {
  const rr = window.__rr;
  const out = {};
  for (const esq of ['buttons', 'touch']){
    rr.state.scheme = esq;
    rr.tut.start();
    // el paso de direccion es el cuarto, y su clave se resuelve al llamarla
    const paso = rr.tut.steps[3];
    out[esq] = typeof paso.key === 'function' ? paso.key() : paso.key;
  }
  return out;
});
console.log('2 el texto de direccion sigue al esquema:', JSON.stringify(textos),
            textos.buttons === 'tut.steer.buttons' && textos.touch === 'tut.steer.touch' ? 'OK' : 'FALLA');

/* ---------- recorrido completo haciendo las acciones ---------- */
const rec = await page.evaluate(async () => {
  const rr = window.__rr, g = rr.game, ui = rr.ui;
  rr.state.scheme = 'buttons';
  rr.state.tutorialDone = false;
  ui.h.onTutorial();
  await new Promise(r => setTimeout(r, 400));

  const KMH = 1 / 3.6;
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const claveDe = s => typeof s.key === 'function' ? s.key() : s.key;
  const pulsa = (id, on) => {
    const el = document.getElementById(id);
    el.dispatchEvent(new PointerEvent(on ? 'pointerdown' : 'pointerup',
                                     { pointerId: 900, bubbles:true }));
  };
  const log = [];
  let guard = 0;

  while (rr.tut.active && guard++ < 40){
    const i = rr.tut.i;
    const s = rr.tut.steps[i];
    const antes = { i, key:claveDe(s), manual:!s.done, pose:s.pose,
                    resalte: s.hl || null, escala: rr.tut.timeScale(),
                    trafico: !!s.traffic };

    if (!s.done){
      /* Paso de lectura: se comprueba que el boton EXISTE y se usa. */
      antes.boton = getComputedStyle(document.getElementById('tut-next')).display !== 'none';
      document.getElementById('tut-next').click();
      await espera(120);
    } else {
      /* Paso con condicion: primero se comprueba que NO hay boton para saltarlo, y luego se
         hace la accion de verdad. */
      antes.boton = getComputedStyle(document.getElementById('tut-next')).display !== 'none';
      const k = claveDe(s);
      if (k === 'tut.gas' || k === 'tut.lanes'){
        /* El paso de carriles pide pasar de 70 km/h justo despues de haber frenado por debajo
           de 25, asi que hay que acelerar de verdad: con 2,6 s se quedaba corto y la prueba
           declaraba atascado un paso que solo necesitaba tiempo. */
        pulsa('p-gas', true);
        await espera(k === 'tut.lanes' ? 6000 : 2600);
        pulsa('p-gas', false);
      } else if (k === 'tut.brake'){
        pulsa('p-brake', true);
        await espera(2600);
        pulsa('p-brake', false);
      } else if (k.startsWith('tut.steer')){
        pulsa('p-right', true);
        await espera(1800);
        pulsa('p-right', false);
      } else if (k === 'tut.close'){
        /* Se coloca al jugador junto al coche del paso y se le hace pasar: reproducir el roce
           a mano con los mandos seria una carrera contra el reloj de la prueba.
           El coche se lleva a un carril CENTRAL y el jugador a su derecha. Colocando al jugador
           a partir de donde cayera el coche, si el coche salia en el carril del arcen la
           posicion pedida se salia del limite lateral, el limite la recortaba, la holgura se
           volvia negativa y el paso terminaba en choque en vez de en roce: fallaba una vez de
           cada tres y parecia cosa del azar. */
        const v = g.pool.find(p => p.alive);
        if (v){
          v.lane = 1; v.x = -1.8; v.laneT = 1e9;
          v.obj.position.set(v.x, 0, v.z);
          g.x = v.x + 0.275 + v.halfW + 0.30;
          g.latV = 0; g.steerInput = 0;
          g.speed = Math.max(g.speed, v.speed + 14);
        }
        await espera(9000);
      } else if (k === 'tut.horn'){
        pulsa('p-horn', true);
        await espera(500);
        pulsa('p-horn', false);
      }
      await espera(900);
    }
    antes.avanzo = rr.tut.i !== i || !rr.tut.active;
    antes.modo = g.mode;
    log.push(antes);
    if (!antes.avanzo) break;                 // atascado: no se sigue en bucle
  }
  return { log, activo: rr.tut.active, pantalla: rr.ui.screen,
           hecho: rr.state.tutorialDone, guard };
});

console.log('\n3 recorrido paso a paso:');
console.log('  #  clave                 pose      boton  resalte   escala  avanzo');
for (const r of rec.log)
  console.log('  ' + String(r.i + 1).padStart(2), r.key.padEnd(21), r.pose.padEnd(9),
              String(r.boton).padEnd(6), String(r.resalte).padEnd(9),
              String(r.escala).padEnd(7), (r.avanzo ? 'si' : 'NO') + '  ' + (r.modo || ''));

const conCond = rec.log.filter(r => !r.manual);
const sinBoton = conCond.every(r => !r.boton);
const todosAvanzan = rec.log.every(r => r.avanzo);
const lentos = rec.log.filter(r => r.escala < 1).map(r => r.key);
console.log('\n  pasos recorridos:            ' + rec.log.length + ' de 12 ' +
            (rec.log.length >= 12 ? 'OK' : 'FALLA'));
console.log('  todos avanzaron:             ' + (todosAvanzan ? 'OK' : 'FALLA'));
console.log('  los pasos con accion NO      ' + (sinBoton ? 'OK' : 'FALLA') +
            '  (' + conCond.length + ' pasos)');
console.log('  ensenan boton de saltarlos');
console.log('  camara lenta didactica:      ' + (lentos.length >= 2 ? 'OK' : 'FALLA') +
            '  en ' + JSON.stringify(lentos));
console.log('  acaba y queda marcado:       ' + (!rec.activo && rec.hecho &&
            rec.pantalla === 'menu' ? 'OK' : 'FALLA') +
            '  (activo ' + rec.activo + ', hecho ' + rec.hecho + ', pantalla ' + rec.pantalla + ')');

/* ---------- ya hecho: no debe volver a ofrecerse ---------- */
const otra = await page.evaluate(async () => {
  const rr = window.__rr;
  rr.ui.h.onBootDone();
  await new Promise(r => setTimeout(r, 400));
  return { activo: rr.tut.active, pantalla: rr.ui.screen };
});
console.log('\n4 una vez hecho no se repite:', JSON.stringify(otra),
            !otra.activo && otra.pantalla === 'menu' ? 'OK' : 'FALLA');

await page.evaluate(() => { window.__rr.state.tutorialDone = false; window.__rr.ui.h.onTutorial(); });
await page.waitForTimeout(700);
/* Cuanto tapa, en porcentaje del escenario. "Tapa mucho" hay que convertirlo en un numero o
   no se puede saber si se ha arreglado: la primera version ocupaba el 58% del ancho y el 29%
   del alto. */
const huella = await page.evaluate(() => {
  const st = document.getElementById('stage');
  const caja = document.getElementById('tut-box').getBoundingClientRect();
  const dino = document.getElementById('tut-dino').getBoundingClientRect();
  const W = st.clientWidth, H = st.clientHeight;
  const area = r => (r.width * r.height) / (W * H) * 100;
  return { anchoCaja:+(caja.width / W * 100).toFixed(1), altoCaja:+(caja.height / H * 100).toFixed(1),
           areaTotal:+(area(caja) + area(dino)).toFixed(1) };
});
console.log('6 cuanto tapa el asistente: ' + huella.anchoCaja + '% del ancho, ' +
            huella.altoCaja + '% del alto, ' + huella.areaTotal + '% del area',
            huella.areaTotal < 12 ? 'OK' : 'FALLA');

/* Con el sensor dando lecturas, el tutorial debe ensenar INCLINAR y las flechas deben estar
   escondidas. Antes se decidia al arrancar el tutorial, cuando el sensor aun no habia
   contestado, y un movil con giroscopio acababa aprendiendo a girar con botones. */
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
  // se salta hasta el paso de direccion, manteniendo el sensor vivo
  for (let k = 0; k < 3; k++){ rr.tut.next(); burst(); await new Promise(r => setTimeout(r, 150)); }
  const texto = document.getElementById('tut-txt').textContent;
  return { esquema: rr.controls.activeScheme(),
           clave: rr.tut.steps[rr.tut.i].key,
           claveResuelta: typeof rr.tut.steps[rr.tut.i].key === 'function'
                          ? rr.tut.steps[rr.tut.i].key() : rr.tut.steps[rr.tut.i].key,
           flechasVisibles: getComputedStyle(document.getElementById('p-left')).display !== 'none',
           texto: texto.slice(0, 40) };
});
console.log('7 con giroscopio vivo:', JSON.stringify(conGiro),
            conGiro.esquema === 'tilt' && conGiro.claveResuelta === 'tut.steer.tilt' &&
            !conGiro.flechasVisibles ? 'OK' : 'FALLA');

/* El globo no debe tapar ningun mando ni el velocimetro: si cubriera el mando que se esta
   explicando, el paso seria imposible de completar. */
const tapa = await page.evaluate(() => {
  /* El DINO tambien cuenta, no solo el globo: comprobando solo la caja se colaba que el
     personaje se pusiera encima del claxon, que es un mando que el tutorial manda pulsar. */
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
console.log('5 el globo no tapa mandos:', tapa.length ? tapa.join(', ') + ' FALLA' : 'ninguno OK');
await page.screenshot({ path: SHOT + 'rr-tut.png' });
console.log('captura en rr-tut.png');
console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno');
await browser.close();
server.close();
