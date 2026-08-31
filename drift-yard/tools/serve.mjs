/* Servidor mínimo para probar el juego: sirve el arbol completo (vendor + assets) desde el
   scratchpad, pero con el index.html DE TRABAJO encima.

   Se sirve por HTTP y no por file:// a proposito: los modulos ES y el importmap del juego no
   cargan desde file://, y la deteccion de base del propio juego usa el protocolo para decidir
   entre CDN y ruta local. Sirviendo por http se prueba exactamente la ruta local. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ARBOL = '/tmp/claude-0/-home-user-General-Assets-Games/5db9e9a6-ad49-51d1-8b36-07bc1d920a78/scratchpad/dy';
const JUEGO = '/home/user/General-Assets-Games/drift-yard/index.html';
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.glb':'model/gltf-binary', '.webp':'image/webp', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.mp3':'audio/mpeg', '.m4a':'audio/mp4',
  '.ogg':'audio/ogg', '.hdr':'application/octet-stream', '.css':'text/css' };

export function serve(){
  const server = http.createServer(async (req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    try {
      const abs = rel === 'index.html' ? JUEGO : path.join(ARBOL, rel);
      const buf = await readFile(abs);
      res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream',
                           'cache-control': 'no-store' });
      res.end(buf);
    } catch (e) { res.writeHead(404); res.end('no: ' + rel); }
  });
  return new Promise(r => server.listen(0, () =>
    r({ server, base: 'http://127.0.0.1:' + server.address().port + '/' })));
}
