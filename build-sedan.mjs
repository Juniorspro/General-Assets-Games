// sedan-electrico.html — visor de un sedán eléctrico fastback 100% procedural.
import { writeFileSync, readFileSync } from 'fs';
import { threeParts, guardScript } from './buildlib.mjs';

const three = threeParts();
const viewer = readFileSync('src/sedan-viewer.js', 'utf8');
let combined = three.code + three.namespace + '\n(function(){\n' + viewer + '\n})();\n';
combined = guardScript(combined);

const html = `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<title>Sedán Eléctrico — procedural</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body{width:100%;height:100%;overflow:hidden;background:#fff;font-family:"Courier New",monospace;color:#3a3e42;}
  #view{position:fixed;inset:0;display:block;}
  #ui{position:fixed;left:0;right:0;bottom:0;padding:14px;text-align:center;z-index:5;pointer-events:none;}
  #ui .t{font-size:18px;letter-spacing:4px;color:#26282c;} #ui .s{font-size:11px;opacity:.65;margin-top:4px;}
  #tints{position:fixed;left:0;right:0;bottom:64px;display:flex;gap:10px;justify-content:center;z-index:6;}
  #tints button,#wire,#reset{pointer-events:all;cursor:pointer;border:1px solid #c2c6ca;background:#fff;color:#3a3e42;font-family:inherit;font-size:12px;padding:8px 14px;border-radius:18px;box-shadow:0 1px 4px #0002;}
  #tints button.sel,#wire.sel{background:#26282c;color:#fff;border-color:#26282c;}
  #wire{position:fixed;top:14px;right:14px;z-index:6;}
  #reset{position:fixed;top:14px;left:14px;z-index:6;}
  .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px;border:1px solid #0002;}
  #loading{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#fff;color:#888;z-index:10;letter-spacing:3px;}
</style></head><body>
<canvas id="view"></canvas>
<button id="reset">↺ vista</button>
<button id="wire" class="sel">▦ malla</button>
<div id="tints">
  <button data-tint="gradiente" class="sel"><span class="dot" style="background:linear-gradient(90deg,#b01212,#b9bdc2)"></span>Degradado</button>
  <button data-tint="rojo"><span class="dot" style="background:#b01212"></span>Rojo</button>
  <button data-tint="plata"><span class="dot" style="background:#b9bdc2"></span>Plata</button>
  <button data-tint="negro"><span class="dot" style="background:#16181c"></span>Negro</button>
  <button data-tint="blanco"><span class="dot" style="background:#eceef0"></span>Blanco</button>
</div>
<div id="ui"><div class="t">SEDÁN ELÉCTRICO</div><div class="s">carrocería por loft de secciones · arrastra para girar · rueda para acercar</div></div>
<div id="loading">Esculpiendo la carrocería…</div>
<script type="module">
${combined}
</script></body></html>`;
writeFileSync('sedan-electrico.html', html);
console.log('sedan-electrico.html:', (html.length / 1024 / 1024).toFixed(2), 'MB');
