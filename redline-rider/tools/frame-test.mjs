/* Mide el encuadre de la camara de casco SIN ojos humanos.

   Proyecta la caja de la moto y de cada coche al espacio de pantalla y comprueba
   numeros: que fraccion del alto ocupa la moto, donde cae el horizonte, si algo
   entra por delante del plano cercano y si al trafico se le ve la TRASERA.

   Uso:  node tools/frame-test.mjs [--shots]
   Requiere el build:  node build.mjs   */

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

/* SwiftShader: sin GPU no hay WebGL y three.js ni arranca. */
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist', '--disable-lcd-text']
});

/* Un movil apaisado y otro en vertical (el juego se gira por CSS): el encuadre tiene que
   aguantar los dos, porque la relacion de aspecto cambia de 2,17 a 0,46. */
const DEVICES = [
  { name:'iphone-apaisado', w:932, h:430, dpr:3 },
  { name:'iphone-vertical', w:430, h:932, dpr:3 },
  { name:'escritorio',      w:1280, h:720, dpr:1 }
];

let fail = 0;
for (const d of DEVICES){
  const page = await browser.newPage({ viewport:{ width:d.w, height:d.h },
    deviceScaleFactor:d.dpr, isMobile:d.dpr > 1, hasTouch:d.dpr > 1 });
  page.on('pageerror', e => { console.log('  ERROR DE PAGINA:', e.message); fail++; });
  await page.goto(base + '/index.html?debug=1');
  await page.waitForFunction('window.__rr && window.__rr.world.models', { timeout:60000 });

  // arranca una partida y deja rodar hasta velocidad de crucero
  await page.evaluate(() => {
    const { game, world } = window.__rr;
    game.start('day');
    for (let i = 0; i < 900; i++) game.step(1 / 120);     // 7,5 s de simulacion
    world.update(1 / 60, game.speed / game.vMax);
    world.render();
  });

  const m = await page.evaluate(() => {
    const THREE = window.__rr.world.camera.constructor === undefined ? null : null;
    const { world, game } = window.__rr;
    const cam = world.camera;
    cam.updateMatrixWorld(true);
    const canvas = world.canvas;
    const W = canvas.clientWidth, H = canvas.clientHeight;

    /* Proyecta los 8 vertices de una caja al espacio de pantalla en pixeles. Un solo
       vertice proyectado no vale: la caja puede cruzar el plano de la camara. */
    const project = obj => {
      const box = new world.constructor.THREE_Box3 ? null : null;
      return null;
    };
    // se usa el three.js que el propio bundle expone en el objeto de depuracion
    const T = window.__rr.THREE;
    const box = new T.Box3().setFromObject(world.playerBike);
    const pts = [];
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) pts.push(new T.Vector3(x, y, z));
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, nearest = 1e9, behind = 0;
    const camInv = cam.matrixWorldInverse || new T.Matrix4().copy(cam.matrixWorld).invert();
    for (const p of pts){
      const v = p.clone().applyMatrix4(camInv);        // espacio de camara: -Z es delante
      nearest = Math.min(nearest, -v.z);
      if (-v.z <= 0){ behind++; continue; }
      const s = p.clone().project(cam);
      minX = Math.min(minX, (s.x + 1) / 2 * W); maxX = Math.max(maxX, (s.x + 1) / 2 * W);
      minY = Math.min(minY, (1 - s.y) / 2 * H); maxY = Math.max(maxY, (1 - s.y) / 2 * H);
    }
    // horizonte: un punto muy lejano a la altura de los ojos
    const hz = new T.Vector3(cam.position.x, cam.position.y, cam.position.z - 5000).project(cam);
    // orientacion del trafico: el morro (-Z local) tiene que APARTARSE de la camara
    const traffic = [];
    for (const v of game.pool){
      if (!v.alive || v.z < -60 || v.z > 30) continue;
      const nose = new T.Vector3(0, 0, -1).transformDirection(v.obj.matrixWorld).normalize();
      const toCam = cam.position.clone().sub(v.obj.position).normalize();
      const bb = new T.Box3().setFromObject(v.obj);
      traffic.push({ kind:v.kind, dotNose: +nose.dot(toCam).toFixed(3),
        w:+(bb.max.x - bb.min.x).toFixed(2), h:+(bb.max.y - bb.min.y).toFixed(2),
        l:+(bb.max.z - bb.min.z).toFixed(2), colW:+(v.halfW * 2).toFixed(2), colL:+(v.halfL * 2).toFixed(2) });
    }
    return {
      W, H, aspect:+(W / H).toFixed(3), fov:+cam.fov.toFixed(1),
      hfov:+(2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * cam.aspect) * 180 / Math.PI).toFixed(1),
      near:cam.near, kmh:Math.round(game.speed * 3.6),
      eye:[+cam.position.x.toFixed(3), +cam.position.y.toFixed(3), +cam.position.z.toFixed(3)],
      pitchDeg:+(cam.rotation.x * 180 / Math.PI).toFixed(2),
      rollDeg:+(cam.rotation.z * 180 / Math.PI).toFixed(2),
      bike:{ x0:Math.round(minX), x1:Math.round(maxX), y0:Math.round(minY), y1:Math.round(maxY),
             nearest:+nearest.toFixed(3), behind },
      bikeTopFrac:+(minY / H).toFixed(3),          // 0 = arriba del todo, 1 = abajo
      bikeWidthFrac:+((maxX - minX) / W).toFixed(3),
      bikeCentreOff:+(((minX + maxX) / 2 - W / 2) / W).toFixed(3),
      horizonFrac:+((1 - hz.y) / 2).toFixed(3),
      traffic
    };
  });

  console.log('\n--- ' + d.name + ' ---');
  console.log(JSON.stringify(m, null, 1));

  const chk = (ok, msg) => { console.log((ok ? '  OK   ' : '  FALLO') + ' ' + msg); if (!ok) fail++; };
  chk(m.bike.behind < 8, 'la moto esta DELANTE de la camara (vertices detras: ' + m.bike.behind + ')');
  chk(m.bike.nearest > m.near + 0.02,
      'nada de la moto atraviesa el plano cercano (mas cerca: ' + m.bike.nearest + ' m, near ' + m.near + ')');
  chk(m.bikeTopFrac > 0.60 && m.bikeTopFrac < 0.88,
      'la moto ocupa la franja baja: su borde superior cae al ' + (m.bikeTopFrac * 100).toFixed(0) + '% del alto');
  chk(Math.abs(m.bikeCentreOff) < 0.04, 'la moto va centrada (desvio ' + (m.bikeCentreOff * 100).toFixed(1) + '%)');
  chk(m.bikeWidthFrac > 0.18 && m.bikeWidthFrac < 0.75,
      'la moto ocupa un ancho creible (' + (m.bikeWidthFrac * 100).toFixed(0) + '% del ancho)');
  chk(m.horizonFrac > 0.42 && m.horizonFrac < 0.62,
      'el horizonte queda un poco por encima del centro (' + (m.horizonFrac * 100).toFixed(0) + '%)');
  chk(m.hfov >= 70 && m.hfov <= 100, 'campo de vision horizontal sin ojo de pez (' + m.hfov + ' grados)');
  const backwards = m.traffic.filter(v => v.dotNose > -0.5);
  chk(backwards.length === 0, 'al trafico se le ve la trasera (mirando de frente: ' +
      JSON.stringify(backwards.map(v => v.kind)) + ')');
  const badBox = m.traffic.filter(v => Math.abs(v.w - v.colW) > 0.25 || Math.abs(v.l - v.colL) > 0.6);
  chk(badBox.length === 0, 'la malla coincide con el colisionador: ' + JSON.stringify(badBox));
  const wide = m.traffic.filter(v => v.w > 3.0);
  chk(wide.length === 0, 'ningun vehiculo se sale de su carril: ' + JSON.stringify(wide.map(v => [v.kind, v.w])));

  if (shots) await page.screenshot({ path:'/tmp/frame-' + d.name + '.png' });
  await page.close();
}

await browser.close();
server.close();
console.log(fail ? '\n' + fail + ' comprobaciones falladas' : '\nencuadre correcto');
process.exit(fail ? 1 : 0);
