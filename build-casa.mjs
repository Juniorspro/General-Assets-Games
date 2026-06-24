// casa-campo.html — visor de una casa de campo procedural (decorativa).
import { writeFileSync, readFileSync } from 'fs';
import { threeParts, guardScript } from './buildlib.mjs';

const three = threeParts();
const viewer = readFileSync('src/casa-viewer.js', 'utf8');
let combined = three.code + three.namespace + '\n(function(){\n' + viewer + '\n})();\n';
combined = guardScript(combined);

const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Casa de Campo — decoración</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body{width:100%;height:100%;overflow:hidden;background:#9fc0e0;font-family:"Courier New",monospace;}
  #view{position:fixed;inset:0;display:block;}
  #ui{position:fixed;left:0;right:0;bottom:0;padding:14px;text-align:center;color:#fff;text-shadow:0 0 6px #000;z-index:5;pointer-events:none;}
  #ui .t{font-size:18px;letter-spacing:3px;} #ui .s{font-size:12px;opacity:.8;margin-top:4px;}
  #reset{position:fixed;top:14px;right:14px;z-index:6;pointer-events:all;cursor:pointer;border:1px solid #fff6;background:#0006;color:#fff;font-family:inherit;padding:8px 14px;border-radius:6px;}
  #loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0a0907;color:#cdc;z-index:10;letter-spacing:3px;}
</style></head><body>
<canvas id="view"></canvas>
<button id="reset">↺ vista</button>
<div id="ui"><div class="t">CASA DE CAMPO</div><div class="s">arrastra para girar · rueda/pellizca para acercar · (solo decoración)</div></div>
<div id="loading">Construyendo la casa…</div>
<script type="module">
${combined}
</script></body></html>`;
writeFileSync('casa-campo.html', html);
console.log('casa-campo.html:', (html.length / 1024 / 1024).toFixed(2), 'MB');
