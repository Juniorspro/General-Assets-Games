/* Mide si las pantallas CABEN, en varios tamanos de movil horizontal.

   "Se ve apretado" hay que convertirlo en numeros o no se puede saber si se ha arreglado. Aqui se
   miden cuatro cosas por pantalla:

     desborda   cuanto sale el contenido fuera del area util (por arriba o por abajo). Cualquier
                cosa mayor que cero es contenido que no se ve, o que el navegador recorta.
     ocupacion  alto del contenido sobre el alto util. Por encima del 100% no cabe.
     ancho      ancho del contenido sobre el ancho util. Un 30% significa que se esta
                desperdiciando el 70% de la pantalla mientras el contenido se amontona. Lo que se
                marca es la combinacion de POCO ANCHO Y MUCHO ALTO, que es la columna estrecha y
                apretada; un dialogo corto y estrecho, como la pausa, esta bien asi.
     toques     alto del boton mas bajo. Por debajo de 34 px un pulgar no acierta.

   El area util descuenta el relleno de seguridad, que es lo que de verdad puede usar la pantalla.
   Se mide el ESCENARIO, no el viewport: en vertical el juego se presenta girado, asi que el
   ancho util es el alto de la pantalla. */
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

/* Tamanos reales, en horizontal. El primero es el peor caso corriente: un movil normal tumbado
   tiene menos de 400 px de alto, y ahi es donde una columna de cinco botones no cabe. */
const TAMANOS = [
  { w:844, h:390, n:'iPhone 14 tumbado' },
  { w:800, h:360, n:'Android 16:9 tumbado' },
  { w:740, h:360, n:'movil pequeno tumbado' },
  { w:1024, h:600, n:'tablet tumbada' },
  { w:1280, h:720, n:'escritorio' },
  { w:390, h:844, n:'iPhone 14 DE PIE (escenario girado)' }
];
/* Las pantallas que el jugador ve de verdad, y como llegar a cada una. */
const PANTALLAS = [
  ['menu',     rr => { rr.state.tutorialDone = true; rr.game.enterMenu(); rr.ui.show('menu'); }],
  ['lang',     rr => rr.ui.show('lang')],
  ['quality',  rr => rr.ui.show('quality')],
  ['garage',   rr => { rr.ui.refreshGarage(); rr.ui.show('garage'); }],
  ['settings', rr => rr.ui.show('settings')],
  ['credits',  rr => rr.ui.show('credits')],
  ['pause',    rr => rr.ui.show('pause')],
  ['results',  rr => rr.ui.showResults({}, {})],
  ['boot',     rr => rr.ui.show('boot')]
];

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const fallos = [];

for (const tam of TAMANOS){
  const page = await browser.newPage({ viewport: { width: tam.w, height: tam.h }, hasTouch: true });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await page.goto(base + FILE + '?debug=1');
  await page.waitForFunction('window.__rr && window.__rr.ui', { timeout: 40000 });
  await page.waitForFunction('document.getElementById("boot-go").classList.contains("on")', { timeout: 120000 });
  await page.evaluate(() => {
    const rr = window.__rr;
    rr.state.lang = 'es'; rr.state.quality = 'high'; rr.state.tutorialDone = true;
    rr.state.cash = 4820; rr.state.runs = 12;
    rr.state.best = { score:128400, distance:7420, overtakes:96, topKmh:284, combo:12 };
    rr.ui.h.onBootDone();
  });
  await page.waitForTimeout(300);

  const st = await page.evaluate(() => {
    const s = document.getElementById('stage');
    return { w:s.clientWidth, h:s.clientHeight, rot: document.documentElement.classList.contains('rot') };
  });
  console.log('\n=== ' + tam.n + '  ventana ' + tam.w + 'x' + tam.h +
              '  ->  escenario ' + st.w + 'x' + st.h + (st.rot ? ' (girado)' : ''));
  console.log('pantalla   desborda  ocupacion  ancho   boton mas bajo  scroll');

  for (const [nombre, ir] of PANTALLAS){
    await page.evaluate(([n]) => {
      const rr = window.__rr;
      const mapa = {
        menu:     () => { rr.state.tutorialDone = true; rr.game.enterMenu(); rr.ui.show('menu'); },
        lang:     () => rr.ui.show('lang'),
        quality:  () => rr.ui.show('quality'),
        garage:   () => { rr.ui.refreshGarage(); rr.ui.show('garage'); },
        settings: () => rr.ui.show('settings'),
        credits:  () => rr.ui.show('credits'),
        pause:    () => rr.ui.show('pause'),
        /* Las mismas claves que manda game.js al morir, y rec como el objeto que devuelve
           finishRun. Con bestCombo y rec=true la pantalla mostraba "xNaN" y parecia un fallo del
           juego cuando el fallo era de la prueba. */
        results:  () => rr.ui.showResults({ score:128400, distance:7420, overtakes:96, closes:41,
                                            topKmh:284, combo:11, cash:2870 },
                                          { score:true, distance:false, overtakes:false,
                                            topKmh:false, combo:false }),
        boot:     () => rr.ui.show('boot')
      };
      mapa[n]();
    }, [nombre]);
    await page.waitForTimeout(420);

    const m = await page.evaluate(n => {
      const scr = document.getElementById('s-' + n);
      const st = document.getElementById('stage');
      /* Se mide con el escenario SIN girar. getBoundingClientRect devuelve coordenadas de
         pantalla ya transformadas, y clientWidth/clientHeight no: mezclando las dos, en vertical
         se comparaba un contenido de 390 de ancho contra un escenario de 844 y salian numeros
         imposibles (128% de ocupacion sin desbordar nada). El giro no afecta a la maquetacion,
         asi que quitarlo un instante no cambia lo que se esta midiendo. */
      const giro = st.style.transform;
      st.style.transform = 'rotate(0deg)';
      const cs = getComputedStyle(scr);
      const px = v => parseFloat(v) || 0;
      /* El area util descuenta el relleno, que ya incluye las zonas de seguridad. Medir contra el
         escenario entero daria por bueno contenido metido debajo de la muesca. */
      const utilW = st.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
      const utilH = st.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
      const r0 = scr.getBoundingClientRect();
      const zona = { top: r0.top + px(cs.paddingTop), bottom: r0.bottom - px(cs.paddingBottom),
                     left: r0.left + px(cs.paddingLeft), right: r0.right - px(cs.paddingRight) };

      let arriba = 0, abajo = 0, izq = 0, der = 0;
      let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
      let botonMin = Infinity;
      let scroll = 0;
      for (const el of scr.querySelectorAll('*')){
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        /* Lo que vive DENTRO de una lista con scroll no desborda la pantalla: sobresale de su
           lista, que es para lo que esta. Contarlo daba 397 px de desbordamiento en el garaje,
           que es simplemente una lista larga. Lo que si tiene que caber es la lista. */
        if (el.closest('.scroll') && !el.classList.contains('scroll')) continue;
        minY = Math.min(minY, r.top); maxY = Math.max(maxY, r.bottom);
        minX = Math.min(minX, r.left); maxX = Math.max(maxX, r.right);
        arriba = Math.max(arriba, zona.top - r.top);
        abajo = Math.max(abajo, r.bottom - zona.bottom);
        izq = Math.max(izq, zona.left - r.left);
        der = Math.max(der, r.right - zona.right);
        if (el.tagName === 'BUTTON') botonMin = Math.min(botonMin, r.height);
        if (el.scrollHeight > el.clientHeight + 2) scroll = Math.max(scroll, el.scrollHeight - el.clientHeight);
      }
      st.style.transform = giro;
      return { utilW, utilH,
               contW: Math.max(0, maxX - minX), contH: Math.max(0, maxY - minY),
               desborda: Math.round(Math.max(0, arriba) + Math.max(0, abajo)),
               desbordaX: Math.round(Math.max(0, izq) + Math.max(0, der)),
               boton: botonMin === Infinity ? null : +botonMin.toFixed(0),
               scroll: Math.round(scroll) };
    }, nombre);

    const ocup = Math.round(m.contH / m.utilH * 100);
    const anch = Math.round(m.contW / m.utilW * 100);
    const mal = [];
    if (m.desborda > 1) mal.push('desborda ' + m.desborda + 'px');
    if (m.boton !== null && m.boton < 34) mal.push('boton de ' + m.boton + 'px');
    /* Lo que se busca es la COLUMNA ESTRECHA Y ALTA: contenido apilado que no llena el ancho y
       encima llega arriba y abajo. Un dialogo corto y estrecho, como la pausa, no es eso: son tres
       botones centrados, y estirarlos a 1280 px quedaria peor. Exigir solo "poco ancho" marcaba la
       pausa en escritorio, que esta bien; hay que exigir poco ancho Y mucho alto a la vez. */
    if (m.utilW / m.utilH > 1.4 && anch < 45 && ocup > 65)
      mal.push('columna estrecha: ' + anch + '% del ancho y ' + ocup + '% del alto');
    console.log('  ' + nombre.padEnd(9), String(m.desborda).padStart(6) + 'px',
                String(ocup).padStart(8) + '%', String(anch).padStart(7) + '%',
                String(m.boton === null ? '-' : m.boton + 'px').padStart(12),
                String(m.scroll ? m.scroll + 'px' : '-').padStart(9),
                mal.length ? '  <-- ' + mal.join(', ') : '');
    if (mal.length) fallos.push(tam.n + '/' + nombre + ': ' + mal.join(', '));

    if (tam.w === 844 || (tam.w === 390 && nombre === 'menu'))
      await page.screenshot({ path: SHOT + 'lay-' + tam.w + 'x' + tam.h + '-' + nombre + '.png' });
  }
  if (errs.length) console.log('  errores:', errs.slice(0, 3));
  await page.close();
}

console.log(fallos.length ? '\nPROBLEMAS (' + fallos.length + '):\n  ' + fallos.join('\n  ')
            : '\nTODO CABE Y APROVECHA EL ANCHO');
await browser.close();
server.close();
process.exit(fallos.length ? 1 : 0);
