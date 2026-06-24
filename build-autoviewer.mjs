// auto-viewer.html — carga el pack de autos del repo y lo divide en autos.
import { writeFileSync, readFileSync } from 'fs';
import { threeParts, addonIIFE, glbConst, guardScript } from './buildlib.mjs';

const three = threeParts();
const bgu = addonIIFE('addons/utils/BufferGeometryUtils.js');
const gltf = addonIIFE('addons/loaders/GLTFLoader.js');
const glb = glbConst({ pack: 'generic_passenger_car_pack.glb' });
const viewer = readFileSync('src/auto-viewer.js', 'utf8');

let combined = three.code + three.namespace + '\n' + bgu + '\n' + gltf + '\n' + glb.code + '\n(function(){\n' + viewer + '\n})();\n';
combined = guardScript(combined);

const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Autos — visor del pack</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body{width:100%;height:100%;overflow:hidden;background:#20242a;font-family:"Courier New",monospace;color:#e8e2d6;}
  #view{position:fixed;inset:0;display:block;}
  #bar{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:18px;padding:16px;z-index:6;}
  #bar button{pointer-events:all;cursor:pointer;border:1px solid #6b6b78;background:#0007;color:#e8e2d6;font-family:inherit;font-size:20px;padding:10px 20px;border-radius:8px;}
  #bar button:active{background:#fff3;}
  #name{position:fixed;top:16px;left:0;right:0;text-align:center;font-size:20px;letter-spacing:3px;text-shadow:0 0 8px #000;z-index:6;}
  #count{position:fixed;top:46px;left:0;right:0;text-align:center;font-size:13px;opacity:.7;z-index:6;}
  #auto{position:fixed;top:14px;right:14px;z-index:6;}
  #hint{position:fixed;bottom:74px;left:0;right:0;text-align:center;font-size:11px;opacity:.6;z-index:6;}
  #loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#16181c;color:#cdc;z-index:10;letter-spacing:3px;}
</style></head><body>
<canvas id="view"></canvas>
<div id="name">—</div><div id="count"></div>
<button id="auto">⟳ giro</button>
<div id="hint">arrastra para girar · rueda/pellizca para acercar</div>
<div id="bar"><button id="prev">‹ ant</button><button id="next">sig ›</button></div>
<div id="loading">Cargando el pack de autos…</div>
<script type="module">
${combined}
</script></body></html>`;
writeFileSync('auto-viewer.html', html);
console.log('pack:', (glb.bytes / 1024 / 1024).toFixed(1), 'MB  |  auto-viewer.html:', (html.length / 1024 / 1024).toFixed(2), 'MB');
