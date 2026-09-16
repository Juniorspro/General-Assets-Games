// Convierte SVG a PNG con el Chromium que ya esta instalado: no hay cairosvg ni rsvg en el
// contenedor, y el navegador es el rasterizador de SVG mas fiel que hay a mano.
// uso: node rasterizar.mjs <carpeta> [ancho]
import { chromium } from '/tmp/ui/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const dir=process.argv[2], ancho=+(process.argv[3]||2048);
const nav=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox','--force-color-profile=srgb'] });
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.svg'))){
  const svg=fs.readFileSync(path.join(dir,f),'utf8');
  const m=svg.match(/viewBox="([\d.\-\s]+)"/);
  let w=1024,h=576;
  if(m){ const v=m[1].trim().split(/\s+/).map(Number); w=v[2]; h=v[3]; }
  else { const a=svg.match(/width="([\d.]+)"/), b=svg.match(/height="([\d.]+)"/);
         if(a&&b){ w=+a[1]; h=+b[1]; } }
  const alto=Math.round(ancho*h/w);
  const pg=await nav.newPage({ viewport:{width:ancho, height:alto}, deviceScaleFactor:1 });
  await pg.setContent('<style>html,body{margin:0;padding:0;overflow:hidden}svg{display:block;width:'+ancho+'px;height:'+alto+'px}</style>'+svg,
                      {waitUntil:'load'});
  await pg.waitForTimeout(220);
  await pg.screenshot({ path:path.join(dir, f.replace(/\.svg$/,'.png')), omitBackground:false });
  await pg.close();
  console.log(f, '->', ancho+'x'+alto, '(viewBox '+w+'x'+h+')');
}
await nav.close();
