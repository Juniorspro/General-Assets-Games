/* recorta al alto pedido (cover) y guarda webp. Sin cwebp ni ImageMagick en la
   máquina, el que codifica es el canvas del navegador de Playwright.
   El servidor local manda CORS: sin él, crossOrigin="anonymous" no falla al
   dibujar sino al cargar, con un EncodingError que parece foto rota. */
import { chromium } from "playwright";
import fs from "node:fs"; import path from "node:path"; import http from "node:http";
const ORIG = process.argv[2], DEST = process.argv[3];
const PLAN = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
fs.mkdirSync(DEST, { recursive: true });
const srv = http.createServer((q, r) => {
  const f = path.join(ORIG, decodeURIComponent(q.url).replace(/^\//, ""));
  if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { "Content-Type":"image/png", "Access-Control-Allow-Origin":"*" });
  fs.createReadStream(f).pipe(r);
});
await new Promise(ok => srv.listen(8083, "127.0.0.1", ok));
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args:["--no-sandbox"] });
const pg = await (await b.newContext()).newPage();
await pg.setContent("<body>");
let total = 0;
for (const p of PLAN) {
  const b64 = await pg.evaluate(async ([src, an, al, q]) => {
    const im = new Image(); im.crossOrigin = "anonymous"; im.src = src; await im.decode();
    const cv = Object.assign(document.createElement("canvas"), { width:an, height:al });
    const c = cv.getContext("2d");
    const e = Math.max(an / im.naturalWidth, al / im.naturalHeight);   // cover
    const w = im.naturalWidth * e, h = im.naturalHeight * e;
    c.drawImage(im, (an - w) / 2, (al - h) / 2, w, h);
    return cv.toDataURL("image/webp", q).split(",")[1];
  }, ["http://127.0.0.1:8083/" + p.de, p.an, p.al, p.q ?? 0.8]);
  const salida = path.join(DEST, p.a);
  fs.writeFileSync(salida, Buffer.from(b64, "base64"));
  const kb = Math.round(fs.statSync(salida).size / 1024); total += kb;
  console.log(`${p.a.padEnd(20)} ${p.an}x${p.al}  ${kb} KB`);
}
console.log("total", total, "KB");
await b.close(); srv.close();
