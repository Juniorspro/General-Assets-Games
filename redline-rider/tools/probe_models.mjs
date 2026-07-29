/* Hoja de contactos de los GLB: cada modelo desde tres vistas ortogonales, para ver de un
   golpe donde tiene el morro y si esta a escala. Adivinar la orientacion a ojo sobre el
   juego en marcha cuesta una compilacion por intento. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const OUT = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/models.png';

let PAGE = '';
const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  if (rel === 'sheet.html'){
    res.writeHead(200, { 'content-type':'text/html' });
    return res.end(PAGE);
  }
  try {
    const buf = await readFile(path.join(ROOT, rel));
    const ext = path.extname(rel);
    res.writeHead(200, { 'content-type': ext === '.js' ? 'text/javascript'
      : ext === '.glb' ? 'model/gltf-binary' : 'text/html' });
    res.end(buf);
  } catch (e) { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port + '/';

const html = `<canvas id=c></canvas><div id=out></div>
<script type="importmap">{"imports":{"three":"${base}vendor/three/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from '${base}vendor/three/GLTFLoader.js';
window.THREE = THREE;
const KINDS = ['bike','sedan','suv','van','truck','bus'];
const VIEWS = [
  { name:'desde el jugador', dir:[0, 0.20, 1] },
  { name:'lado', dir:[1, 0.18, 0] }
];
const CELL = 300;
const r = new THREE.WebGLRenderer({ canvas:document.getElementById('c'), antialias:true, preserveDrawingBuffer:true });
r.setSize(CELL*VIEWS.length, CELL*KINDS.length, false);
r.setClearColor(0x202530, 1);
r.setScissorTest(true);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x404858, 1.1));
const d = new THREE.DirectionalLight(0xffffff, 1.0); d.position.set(3,5,4); scene.add(d);
// rejilla de referencia: cada linea es 1 m, y la flecha roja apunta a -Z (sentido de la marcha)
const grid = new THREE.GridHelper(14, 14, 0x556070, 0x39414f); scene.add(grid);
const arrow = new THREE.ArrowHelper(new THREE.Vector3(0,0,-1), new THREE.Vector3(0,0.02,0), 3.4, 0xff3030, 0.5, 0.3);
scene.add(arrow);
const holder = new THREE.Group(); scene.add(holder);
const loader = new GLTFLoader();
const info = [];
for (let k = 0; k < KINDS.length; k++){
  const kind = KINDS[k];
  const gltf = await new Promise((res2, rej) => loader.load('${base}assets/models/'+kind+'.glb', res2, undefined, rej));
  const obj = gltf.scene;
  // se mide en crudo, SIN normalizar: es lo que hay que saber
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  const c = new THREE.Vector3(); box.getCenter(c);
  let tris = 0, verts = 0;
  obj.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    verts += g.attributes.position ? g.attributes.position.count : 0;
    tris += g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
  });
  info.push({ kind, size:[+size.x.toFixed(2),+size.y.toFixed(2),+size.z.toFixed(2)],
              vertices: verts, triangulos: Math.round(tris) });
  // se apoya y se centra para que quepa en la celda, escalado a 4 m de largo
  const longest = Math.max(size.x, size.z) || 1;
  obj.scale.setScalar(4 / longest);
  if (size.x > size.z) obj.rotation.y = -Math.PI / 2;
  const b2 = new THREE.Box3().setFromObject(obj);
  const c2 = new THREE.Vector3(); b2.getCenter(c2);
  obj.position.x -= c2.x; obj.position.z -= c2.z; obj.position.y -= b2.min.y;
  while (holder.children.length) holder.remove(holder.children[0]);
  holder.add(obj);
  for (let v = 0; v < VIEWS.length; v++){
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const dir = VIEWS[v].dir;
    cam.position.set(dir[0]*11, dir[1]*11 + 0.9, dir[2]*11);
    cam.lookAt(0, 1.0, 0);
    const y = (KINDS.length - 1 - k) * CELL;
    r.setViewport(v*CELL, y, CELL, CELL);
    r.setScissor(v*CELL, y, CELL, CELL);
    r.render(scene, cam);
  }
}
document.getElementById('out').textContent = JSON.stringify(info);
window.__done = true;
</script>`;

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 1100 } });
page.on('pageerror', e => console.log('ERR', e.message));
PAGE = html;
await page.goto(base + 'sheet.html');
await page.waitForFunction('window.__done', { timeout: 90000 });
console.log('crudo (x,y,z) y centro:');
for (const r of JSON.parse(await page.textContent('#out')))
  console.log('  ' + r.kind.padEnd(6), 'tamano', JSON.stringify(r.size).padEnd(22), r.triangulos + ' triangulos');
console.log('filas: ' + 'bike sedan suv van truck bus'.split(' ').join(', ') + ' | columnas: desde el jugador, de lado');
console.log('la flecha roja apunta a -Z, que es el sentido de la marcha');
await page.locator('#c').screenshot({ path: OUT });
await browser.close();
server.close();
