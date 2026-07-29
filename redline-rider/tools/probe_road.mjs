/* Mide HACIA DONDE se mueve el asfalto, sobre los pixeles.

   La carretera es un plano con la textura desplazandose, y el signo de ese desplazamiento no
   se puede juzgar leyendo el codigo: depende de la rotacion del plano, de que eje del UV
   crece hacia delante y del convenio de offset de three.js. Los cuatro se pueden equivocar
   por separado y el resultado se ve identico en una captura fija.

   Aqui se toman dos fotogramas separados por un avance conocido, se saca la luminancia de
   cada fila de una columna central (las rayas del carril son claras sobre asfalto oscuro) y
   se correlacionan. El desplazamiento que mejor encaja dice el sentido:
     hacia ABAJO en la imagen = hacia el jugador = correcto
     hacia ARRIBA = se aleja = el suelo va hacia delante, que es el defecto reportado. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.glb':'model/gltf-binary',
               '.mp3':'audio/mpeg', '.m4a':'audio/mp4' };
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
page.on('pageerror', e => console.log('ERR', e.message));
await page.goto(base + (process.argv[2] || 'index.html') + '?debug=1');
await page.waitForFunction('window.__rr && window.__rr.ui', { timeout: 30000 });
await page.waitForFunction('document.getElementById("boot-go").classList.contains("on")', { timeout: 120000 });
await page.mouse.click(450, 230);
await page.evaluate(() => {
  const rr = window.__rr;
  rr.state.lang = 'es'; rr.state.quality = 'ultra';
  /* El tutorial se marca hecho: sus pasos avanzan solos al cumplirse la accion, y el paso
     siguiente llama a clearTraffic(), lo que se llevaba por delante los coches que esta
     prueba coloca a mano. Lo que se mide aqui no es el tutorial. */
  rr.state.tutorialDone = true;
  rr.ui.h.onBootDone();
});
await page.waitForTimeout(250);
await page.evaluate(() => window.__rr.ui.h.onPlay());
await page.waitForTimeout(600);

const out = await page.evaluate(async () => {
  const rr = window.__rr;
  const cv = rr.world.canvas;
  const W = cv.width, H = cv.height;
  const pad = document.createElement('canvas');
  pad.width = W; pad.height = H;
  const ctx = pad.getContext('2d', { willReadFrequently:true });

  /* Se OCULTA la moto y se muestrea el centro del asfalto, que es donde las rayas del carril
     tienen mas contraste. Muestreando a un lado la correlacion salia plana (43,3 contra 42,2)
     porque ahi apenas hay patron, y en el centro con la moto puesta salia 0 filas porque la
     moto no se mueve. */
  rr.world.bikeGroup.visible = false;
  const y0 = Math.round(H * 0.60), y1 = Math.round(H * 0.94);
  const x0 = Math.round(W * 0.30), x1 = Math.round(W * 0.70);

  /* El buffer de dibujo no se conserva entre fotogramas, asi que hay que renderizar y copiar
     dentro de la MISMA tarea. Se congela la escena: sin trafico y sin fisica, el unico
     cambio entre los dos fotogramas es el avance que se pide a mano. */
  const rows = () => {
    rr.world.render();
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(cv, 0, 0);
    const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    const w = x1 - x0, h = y1 - y0, lum = new Float64Array(h);
    for (let y = 0; y < h; y++){
      let s = 0;
      for (let x = 0; x < w; x++){
        const i = (y * w + x) * 4;
        s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      }
      lum[y] = s / w;
    }
    // se le quita la media: solo interesa el patron de rayas, no el brillo global
    let m = 0;
    for (const v of lum) m += v;
    m /= h;
    for (let y = 0; y < h; y++) lum[y] -= m;
    return lum;
  };

  const g = rr.game;
  g.mode = 'pause';                       // congela la fisica; world.advance se llama a mano
  g.clearTraffic();
  rr.world.setRider(0, 0, 0.3, 0, 0, 0);
  const offAntes = rr.world.roadMat.map.offset.y;
  const A = rows();
  /* Avance pequeno a proposito. Con 6,75 m el desplazamiento en pixeles cerca de la camara se
     salia del rango de busqueda y, como las rayas se repiten cada 9 m, la correlacion encajaba
     con la raya siguiente: el pico salia en el borde y NEGATIVO, o sea sin coincidencia real. */
  const AVANCE = 0.8;
  rr.world.advance(AVANCE);
  rr.world.setRider(0, 0, 0.3, 0, 0, 0);
  const B = rows();
  rr.world.bikeGroup.visible = true;

  // correlacion cruzada: B[y+s] contra A[y]
  /* Coeficiente normalizado, no producto en crudo: asi el pico se puede comparar con un
     umbral y se distingue "encaja" de "no hay coincidencia y este es el menos malo". */
  const h = A.length, MAX = 40;
  let best = 0, bestScore = -Infinity;
  const curve = [];
  for (let s = -MAX; s <= MAX; s++){
    let dot = 0, na = 0, nb = 0, n = 0;
    for (let y = Math.max(0, -s); y < Math.min(h, h - s); y++){
      dot += A[y] * B[y + s]; na += A[y] * A[y]; nb += B[y + s] * B[y + s]; n++;
    }
    const score = n > 40 && na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : -Infinity;
    curve.push({ s, score:+score.toFixed(3) });
    if (score > bestScore){ bestScore = score; best = s; }
  }
  /* Y la comprobacion analitica, que no depende de que haya contraste en la imagen: donde cae
     en el mundo una raya concreta de la textura, antes y despues del avance.
     Los dos desplazamientos se MIDEN, uno antes de advance y otro despues. Reconstruir el
     primero a partir del segundo obliga a suponer el signo, que es justo lo que se quiere
     comprobar: al corregir el codigo la prueba seguia diciendo que fallaba. */
  const road = rr.world.road;
  const geo = road.geometry.parameters;
  const map = rr.world.roadMat.map;
  const zDeUnaRaya = off => {
    const vGeom = (0.5 - off) / map.repeat.y;          // v_t = 0,5, una raya cualquiera
    return road.position.z - (vGeom * geo.height - geo.height / 2);
  };
  const zAntes = zDeUnaRaya(offAntes);
  const zDespues = zDeUnaRaya(map.offset.y);

  return { avance:AVANCE, mejorDesplazamiento:best, alto:h,
           pico:+bestScore.toFixed(1),
           vecinos: curve.filter(c => Math.abs(c.s - best) <= 2),
           zAntes:+zAntes.toFixed(2), zDespues:+zDespues.toFixed(2),
           deltaZ:+(zDespues - zAntes).toFixed(2) };
});

const fiable = out.pico > 0.6 && Math.abs(out.mejorDesplazamiento) < 38;
const dir = !fiable ? 'SIN COINCIDENCIA (pico ' + out.pico + ', no se pronuncia)'
          : out.mejorDesplazamiento > 1 ? 'HACIA EL JUGADOR'
          : out.mejorDesplazamiento < -1 ? 'SE ALEJA'
          : 'sin movimiento detectable';
console.log('avance de ' + out.avance + ' m -> el patron se desplaza ' +
            out.mejorDesplazamiento + ' filas de ' + out.alto);
console.log('pixeles:', dir, fiable ? (out.mejorDesplazamiento > 1 ? 'OK' : 'FALLA') : '');
console.log('pico de correlacion:', out.pico, JSON.stringify(out.vecinos));
/* El jugador esta en z=0 y mira hacia -z, asi que una raya que se acerca tiene que AUMENTAR
   su z. Si disminuye, el asfalto se va hacia delante. */
console.log('una raya de la textura: z ' + out.zAntes + ' -> ' + out.zDespues +
            '  (delta ' + out.deltaZ + ' m con ' + out.avance + ' m de avance)');
console.log('analitico:', out.deltaZ > 0 ? 'se ACERCA, OK' : 'se ALEJA, FALLA');
await browser.close();
server.close();
