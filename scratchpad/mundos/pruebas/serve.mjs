/* Servidor del worktree para probar los mundos con ?local: sirve /assets y /_vthree
   desde el disco, asi que nada sale a la red y se puede iterar rapido. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const ROOT = '/home/user/mundos';
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript',
  '.json':'application/json', '.glb':'model/gltf-binary', '.webp':'image/webp', '.png':'image/png',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.ogg':'audio/ogg',
  '.hdr':'application/octet-stream', '.css':'text/css', '.svg':'image/svg+xml' };
export function serve(){
  const server = http.createServer(async (req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    try {
      const buf = await readFile(path.join(ROOT, rel));
      res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream',
                           'cache-control':'no-store' });
      res.end(buf);
    } catch (e) { res.writeHead(404); res.end('no: ' + rel); }
  });
  return new Promise(r => server.listen(0, () =>
    r({ server, base:'http://127.0.0.1:' + server.address().port + '/' })));
}
