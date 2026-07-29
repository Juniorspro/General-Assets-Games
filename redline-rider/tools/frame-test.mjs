/* Mide el encuadre de la camara de casco SIN ojos humanos.

   Dos medidas independientes, que es lo que hace fiable la prueba:
     1) SILUETA REAL: se renderiza el fotograma con la moto y sin ella y se restan los
        pixeles. Da la cobertura exacta, el borde superior y el centro de la moto en
        pantalla, sin depender de la caja envolvente (que en una moto miente: incluye la
        altura del manillar tambien en la vertical del morro).
     2) PROYECCION: la caja de cada vehiculo al espacio de pantalla, la distancia real de
        la malla a la camara y el sentido del morro, para cazar un GLB girado.

   Uso:  node build.mjs && node tools/frame-test.mjs [--shots]                        */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const shots = process.argv.includes('--shots');
const MIME = { '.html':'text/html', '.glb':'model/gltf-binary', '.mp3':'audio/mpeg',
               '.m4a':'audio/mp4', '.js':'text/javascript', '.png':'image/png' };

const server = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const buf = await readFile(path.join(root, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port;

/* Sin GPU no hay WebGL: SwiftShader lo emula en CPU y basta para medir geometria. */
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist', '--mute-audio']
});

/* Movil apaisado, el mismo movil en vertical (el juego se gira por CSS) y escritorio: la
   relacion de aspecto del LIENZO va de 2,17 a 1,78 y el encuadre aguanta las tres. */
const DEVICES = [
  { name:'movil-apaisado', w:932, h:430, dpr:2, touch:true },
  { name:'movil-vertical', w:430, h:932, dpr:2, touch:true },
  { name:'escritorio',     w:1280, h:720, dpr:1, touch:false }
];

const RUN = steer => {          // 10 s a gas abierto, sin depender de la entrada real
  const { game, world, controls } = window.__rr;
  game.start('day');
  controls.input.throttle = 1;
  controls.input.steer = steer;
  for (let i = 0; i < 1200; i++){
    game.step(1 / 120);
    game.x = Math.max(-5.4, Math.min(5.4, game.x));   // que no se pegue al quitamiedos
  }
  world.update(1 / 60, game.speed / game.vMax);
  return { lean:+game.lean.toFixed(3) };
};

const MEASURE = () => {
  const { world, game } = window.__rr;
  const cam = world.camera;
  const V3 = cam.position.constructor;
  world.scene.updateMatrixWorld(true);
  cam.updateMatrixWorld(true);
  const W = world.canvas.clientWidth, H = world.canvas.clientHeight;

  /* ---- 1) silueta por diferencia de pixeles ---- */
  const gl = world.renderer.getContext();
  const bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight;
  const a = new Uint8Array(bw * bh * 4), b = new Uint8Array(bw * bh * 4);
  world.bikeGroup.visible = false; world.render();
  gl.readPixels(0, 0, bw, bh, gl.RGBA, gl.UNSIGNED_BYTE, a);
  world.bikeGroup.visible = true; world.render();
  gl.readPixels(0, 0, bw, bh, gl.RGBA, gl.UNSIGNED_BYTE, b);
  let n = 0, x0 = 1e9, x1 = -1e9, yTop = 1e9, yBot = -1e9, sx = 0;
  for (let i = 0, p = 0; p < bw * bh; p++, i += 4){
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) < 12) continue;
    const px = p % bw, py = bh - 1 - ((p / bw) | 0);      // readPixels empieza por abajo
    n++; sx += px;
    if (px < x0) x0 = px; if (px > x1) x1 = px;
    if (py < yTop) yTop = py; if (py > yBot) yBot = py;
  }
  const sil = n ? { cover:+(n / (bw * bh)).toFixed(4), topFrac:+(yTop / bh).toFixed(3),
                    botFrac:+(yBot / bh).toFixed(3), widthFrac:+((x1 - x0) / bw).toFixed(3),
                    centreOff:+((sx / n - bw / 2) / bw).toFixed(4) }
                : { cover:0 };

  /* ---- 2) proyeccion y distancias ---- */
  const worldBox = obj => {
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    obj.traverse(o => {
      if (!o.isMesh || o.isSprite || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const g = o.geometry.boundingBox;
      for (const x of [g.min.x, g.max.x]) for (const y of [g.min.y, g.max.y]) for (const z of [g.min.z, g.max.z]){
        const p = new V3(x, y, z).applyMatrix4(o.matrixWorld);
        mn = [Math.min(mn[0], p.x), Math.min(mn[1], p.y), Math.min(mn[2], p.z)];
        mx = [Math.max(mx[0], p.x), Math.max(mx[1], p.y), Math.max(mx[2], p.z)];
      }
    });
    return { mn, mx };
  };
  /* Distancia punto-caja: lo que de verdad dice si el plano cercano recorta. Coger el
     minimo de las 8 esquinas da negativo en cuanto una esquina queda detras. */
  const boxDist = (bx, p) => {
    const d = [Math.max(bx.mn[0] - p.x, 0, p.x - bx.mx[0]),
               Math.max(bx.mn[1] - p.y, 0, p.y - bx.mx[1]),
               Math.max(bx.mn[2] - p.z, 0, p.z - bx.mx[2])];
    return Math.hypot(d[0], d[1], d[2]);
  };
  /* Vertice mas cercano de verdad: la caja de la moto CONTIENE la camara aunque no haya
     ni un poligono cerca, asi que hay que medir sobre los vertices. */
  const nearestVertex = obj => {
    let best = 1e9;
    obj.traverse(o => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      const pos = o.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 4000));
      for (let i = 0; i < pos.count; i += step){
        const p = new V3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(o.matrixWorld);
        const d = p.distanceTo(cam.position);
        if (d < best) best = d;
      }
    });
    return best;
  };

  const bikeBox = worldBox(world.playerBike);
  const hz = new V3(cam.position.x, cam.position.y, cam.position.z - 5000).project(cam);

  const traffic = [];
  for (const v of game.pool){
    /* Solo los que van DELANTE: a los de detras se les ve el morro y es correcto. */
    if (!v.alive || v.z < -80 || v.z > -3) continue;
    const nose = new V3(0, 0, -1).transformDirection(v.obj.matrixWorld).normalize();
    const toCam = cam.position.clone().sub(v.obj.position).normalize();
    /* children[0] es la malla: la sombra de contacto y el halo son hijos del envoltorio y
       falsean la medida (la sombra mide 1,7 veces el ancho declarado). */
    const bx = worldBox(v.obj.children[0]);
    traffic.push({ kind:v.kind, z:+v.z.toFixed(1), dotNose:+nose.dot(toCam).toFixed(3),
      w:+(bx.mx[0] - bx.mn[0]).toFixed(2), h:+(bx.mx[1] - bx.mn[1]).toFixed(2),
      l:+(bx.mx[2] - bx.mn[2]).toFixed(2), colW:+(v.halfW * 2).toFixed(2), colL:+(v.halfL * 2).toFixed(2),
      dist:+boxDist(bx, cam.position).toFixed(2) });
  }

  return {
    canvas:[W, H], buffer:[bw, bh], aspect:+(W / H).toFixed(3),
    vfov:+cam.fov.toFixed(1),
    hfov:+(2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect) * 180 / Math.PI).toFixed(1),
    near:cam.near, kmh:Math.round(game.speed * 3.6),
    eye:[+cam.position.x.toFixed(3), +cam.position.y.toFixed(3), +cam.position.z.toFixed(3)],
    pitchDeg:+(cam.rotation.x * 180 / Math.PI).toFixed(2),
    rollDeg:+(cam.rotation.z * 180 / Math.PI).toFixed(2),
    bikeSize:[+(bikeBox.mx[0] - bikeBox.mn[0]).toFixed(2), +(bikeBox.mx[1] - bikeBox.mn[1]).toFixed(2),
              +(bikeBox.mx[2] - bikeBox.mn[2]).toFixed(2)],
    bikeZ:[+bikeBox.mn[2].toFixed(2), +bikeBox.mx[2].toFixed(2)],
    nearestVertex:+nearestVertex(world.playerBike).toFixed(3),
    camInsideBox:cam.position.z > bikeBox.mn[2] && cam.position.z < bikeBox.mx[2] &&
                 cam.position.y < bikeBox.mx[1],
    horizonFrac:+((1 - hz.y) / 2).toFixed(3),
    lean:+((world.bikeGroup.rotation.z * 180 / Math.PI)).toFixed(1),
    sil, traffic
  };
};

let fail = 0;
for (const d of DEVICES){
  const page = await browser.newPage({ viewport:{ width:d.w, height:d.h },
    deviceScaleFactor:d.dpr, isMobile:d.touch, hasTouch:d.touch });
  page.on('pageerror', e => { console.log('  ERROR DE PAGINA:', e.message); fail++; });
  await page.goto(base + '/index.html?debug=1');
  await page.waitForFunction('window.__rr && Object.keys(window.__rr.world.models).length >= 6',
                             null, { timeout:120000 });
  await page.evaluate(RUN, 0);
  const m = await page.evaluate(MEASURE);

  console.log('\n=== ' + d.name + ' ===');
  console.log(JSON.stringify(m, null, 1));

  const chk = (ok, msg) => { console.log((ok ? '  OK    ' : '  FALLO ') + msg); if (!ok) fail++; };
  chk(m.sil.cover > 0.02, 'la moto se VE (cubre ' + (m.sil.cover * 100).toFixed(1) + '% del fotograma)');
  chk(m.sil.cover > 0.02 && m.sil.cover < 0.30, 'la moto no come el fotograma (' +
      (m.sil.cover * 100).toFixed(1) + '%)');
  chk(m.sil.topFrac > 0.60, 'la moto se queda en la franja BAJA: su borde superior al ' +
      (m.sil.topFrac * 100).toFixed(0) + '% del alto');
  chk(m.sil.botFrac > 0.97, 'la moto llega al borde inferior (' + (m.sil.botFrac * 100).toFixed(0) + '%)');
  chk(Math.abs(m.sil.centreOff) < 0.03, 'la moto va centrada (desvio ' +
      (m.sil.centreOff * 100).toFixed(1) + '%)');
  chk(m.nearestVertex > m.near + 0.05, 'ninguna cara cruza el plano cercano (' +
      m.nearestVertex + ' m frente a near ' + m.near + ')');
  chk(m.horizonFrac > 0.40 && m.horizonFrac < 0.60, 'horizonte por encima del centro (' +
      (m.horizonFrac * 100).toFixed(0) + '%)');
  chk(m.hfov >= 70 && m.hfov <= 100, 'campo horizontal sin ojo de pez (' + m.hfov + ' grados)');
  chk(m.traffic.length > 0, 'hay trafico en el encuadre (' + m.traffic.length + ')');
  const frente = m.traffic.filter(v => v.dotNose > -0.5);
  chk(frente.length === 0, 'al trafico se le ve la TRASERA (de frente: ' +
      JSON.stringify(frente.map(v => v.kind)) + ')');
  const caja = m.traffic.filter(v => Math.abs(v.w - v.colW) > 0.3 || Math.abs(v.l - v.colL) > 0.8);
  chk(caja.length === 0, 'la malla coincide con el colisionador: ' + JSON.stringify(caja));
  const anchos = m.traffic.filter(v => v.w > 2.9);
  chk(anchos.length === 0, 'ningun vehiculo desborda su carril: ' +
      JSON.stringify(anchos.map(v => [v.kind, v.w])));

  if (shots) await page.screenshot({ path:'/tmp/frame-' + d.name + '.png' });

  /* Y ahora tumbada: la moto gira sobre la huella de los neumaticos, asi que si la camara
     no acompana el deposito se le va de debajo y la moto queda descentrada en cada curva. */
  await page.evaluate(RUN, 1);
  const c = await page.evaluate(MEASURE);
  console.log(' tumbada: lean=' + c.lean + ' grados  roll=' + c.rollDeg +
              '  centro=' + (c.sil.centreOff * 100).toFixed(1) + '%  cobertura=' +
              (c.sil.cover * 100).toFixed(1) + '%  vertice mas cercano=' + c.nearestVertex);
  chk(Math.abs(c.sil.centreOff) < 0.10, 'en curva la moto sigue centrada (desvio ' +
      (c.sil.centreOff * 100).toFixed(1) + '%)');
  chk(c.sil.cover > 0.015, 'en curva la moto sigue en el encuadre (' +
      (c.sil.cover * 100).toFixed(1) + '%)');
  chk(c.nearestVertex > c.near + 0.05, 'en curva nada cruza el plano cercano (' + c.nearestVertex + ')');
  if (shots) await page.screenshot({ path:'/tmp/frame-' + d.name + '-curva.png' });
  await page.close();
}

await browser.close();
server.close();
console.log(fail ? '\n' + fail + ' comprobaciones falladas' : '\nencuadre correcto');
process.exit(fail ? 1 : 0);
