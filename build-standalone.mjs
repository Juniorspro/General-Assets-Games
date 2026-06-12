// Genera un único HTML autocontenido con MODELOS GLB PS1 REALES incrustados,
// pensado para MÓVIL (horizontal, pantalla completa) y de DÍA con look AAA.
// Fusiona three + addons + glb + juego en un módulo inline SIN imports
// (así funciona abriéndolo directamente como file://, doble clic).
import { readFileSync, writeFileSync, statSync } from 'fs';

const V = 'vendor/three/';
const readT = p => readFileSync(p, 'utf8');

// --- helpers para "desmodularizar" ----------------------------------------
const stripImports = s => s.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"];?/g, '');
const stripExportDecl = s => s.replace(/\bexport\s+(function|class|const|let|var)\b/g, '$1');
const stripExportBlocks = s => s.replace(/export\s*\{[\s\S]*?\}\s*;?/g, '');
const clean = s => stripExportBlocks(stripExportDecl(stripImports(s)));

// --- three core: capturar nombres exportados y construir el namespace ------
const threeRaw = readT(V + 'three.module.js');
const expMatch = threeRaw.match(/export\s*\{([\s\S]*?)\};/);
if (!expMatch) throw new Error('no encontré el export de three');
const names = expMatch[1].split(',').map(s => s.trim()).filter(Boolean);
const nsEntries = names.map(n => n.includes(' as ') ? (() => { const [l, e] = n.split(' as ').map(x => x.trim()); return `${e}: ${l}`; })() : n);
const threeStripped = threeRaw.replace(/export\s*\{[\s\S]*?\};\s*$/, '');
const threeNamespace = `\nconst THREE = { ${nsEntries.join(', ')} };\n`;

// --- addons: cada uno en su propia IIFE para aislar sus consts internas ----
// (ven las clases de three por closure, exponen solo sus exports al scope).
function processAddon(src) {
  const names = new Set();
  src.replace(/export\s*\{([\s\S]*?)\}\s*;?/g, (m, inner) => {
    inner.split(',').map(s => s.trim()).filter(Boolean).forEach(n => names.add(n.includes(' as ') ? n.split(' as ')[1].trim() : n));
    return m;
  });
  src.replace(/\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/g, (m, name) => { names.add(name); return m; });
  const list = [...names];
  return `\nconst { ${list.join(', ')} } = (function(){\n${clean(src)}\nreturn { ${list.join(', ')} };\n})();\n`;
}
const bufGeo = processAddon(readT(V + 'addons/utils/BufferGeometryUtils.js'));
const skel = processAddon(readT(V + 'addons/utils/SkeletonUtils.js'));
const gltf = processAddon(readT(V + 'addons/loaders/GLTFLoader.js'));

// --- modelos GLB embebidos (selección equilibrada para móvil) --------------
const M = 'assets/models/';
const models = {
  ozoneHouse: 'psx_-_ozone_house.glb',
  japanHouse: 'psx_traditional_japanease_house_1.glb',
  truck: 'psx_-_truck.glb',
  rustyCar: 'old_rusty_car.glb',
  highSchool: 'ps1_psx_high_school_character.glb',
  rigged: 'ps1_rigged_character_model.glb',
  pines: 'pine_trees_pack__ps1_low_poly.glb',
  clergy: 'clergy__catacombs_ps1-style_asset_pack.glb',
};
let glbTotal = 0;
const glbEntries = Object.entries(models).map(([k, f]) => {
  const b64 = readFileSync(M + f).toString('base64');
  glbTotal += statSync(M + f).size;
  return `  ${k}: "${b64}"`;
});
const glbConst = `\nconst GLB = {\n${glbEntries.join(',\n')}\n};\n`;

// --- juego -----------------------------------------------------------------
const game = readT('src/standalone-glb-game.js');

// --- módulo combinado (sin imports). El juego también va en su propia IIFE
//     para no chocar con las constantes internas de three. ------------------
let combined = threeStripped + threeNamespace + '\n' + bufGeo + '\n' + skel + '\n' + gltf + '\n' + glbConst +
  '\n(function(){\n' + game + '\n})();\n';
// blindaje por si algún string contuviera el cierre de etiqueta
combined = combined.replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<title>NIEBLA DEL MAÍZ — Survival Horror</title>
<style>
  :root { --accent: #b8412f; }
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; touch-action: none; overscroll-behavior: none; }
  body { font-family: "Courier New", monospace; color: #c9c4bb; user-select: none; -webkit-user-select: none; }
  #game { position: fixed; inset: 0; display: block; }
  #hud { position: fixed; inset: 0; pointer-events: none; z-index: 10; }
  #crosshair { position: absolute; top: 50%; left: 50%; width: 5px; height: 5px; background: rgba(220,220,210,0.5); border-radius: 50%; transform: translate(-50%,-50%); box-shadow: 0 0 4px rgba(0,0,0,0.9); }
  #vignette { position: absolute; inset: 0; box-shadow: inset 0 0 200px 60px rgba(0,0,0,0.55); }
  #status { position: absolute; left: 16px; bottom: 14px; font-size: 12px; line-height: 1.6; text-shadow: 0 0 6px #000; opacity: 0.8; }
  #status .k { color: var(--accent); }
  #battery-wrap { position: absolute; right: 16px; top: 16px; width: 130px; text-shadow: 0 0 6px #000; }
  #battery-wrap .lbl { font-size: 10px; letter-spacing: 2px; opacity: .7; margin-bottom: 4px; }
  #battery { width: 100%; height: 8px; border: 1px solid #5a5750; background: #14130f; }
  #battery > i { display: block; height: 100%; width: 0%; background: linear-gradient(90deg,#7d3a1f,#d9b04a); transition: width .3s; }
  /* joystick + botones táctiles */
  #joy-base { position: fixed; width: 112px; height: 112px; margin: -56px 0 0 -56px; border: 2px solid rgba(255,255,255,.28); border-radius: 50%; z-index: 15; pointer-events: none; background: rgba(255,255,255,.04); }
  #joy-knob { position: fixed; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; background: rgba(255,255,255,.22); border: 1px solid rgba(255,255,255,.4); z-index: 16; pointer-events: none; }
  #btn-flash { position: fixed; right: 20px; bottom: 24px; width: 64px; height: 64px; border-radius: 50%; border: 1px solid #6b4030; background: rgba(30,18,12,.55); color: #ffdca0; z-index: 18; pointer-events: all; font-size: 26px; }
  #rotate { position: fixed; inset: 0; z-index: 50; background: #070a0c; color: #d8d2c7; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-size: 20px; letter-spacing: 2px; gap: 16px; }
  #rotate .ico { font-size: 60px; animation: spin 2s ease-in-out infinite; }
  @keyframes spin { 0%,100%{transform:rotate(0)} 50%{transform:rotate(90deg)} }
  .overlay { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; background: radial-gradient(ellipse at center,#0a0907 0%,#000 80%); }
  #loading .bar { width: 300px; max-width: 70vw; height: 6px; background: #1c1a16; margin-top: 22px; border: 1px solid #34322b; }
  #loading .bar > i { display: block; height: 100%; width: 0%; background: var(--accent); transition: width .25s; }
  #loading .pct { margin-top: 10px; font-size: 12px; opacity: .6; }
  h1 { font-size: 8vw; letter-spacing: 8px; font-weight: 700; color: #d8d2c7; text-shadow: 0 0 18px #000, 0 2px 0 #2a0d07; }
  @media (min-width: 700px){ h1 { font-size: 46px; } }
  h1 .sub { display:block; font-size: 13px; letter-spacing: 5px; color: var(--accent); margin-top: 12px; }
  #title p { max-width: 560px; margin-top: 22px; font-size: 14px; line-height: 1.8; opacity: .78; }
  .keys { margin-top: 20px; font-size: 12px; opacity: .8; line-height: 1.9; } .keys b { color: var(--accent); }
  .play { margin-top: 28px; pointer-events: all; cursor: pointer; border: 1px solid #6b4030; background: rgba(40,20,12,.4); color: #e8e2d6; padding: 16px 46px; font-family: inherit; font-size: 18px; letter-spacing: 4px; }
  .play:active { background: rgba(120,50,30,.6); }
  .hidden { display: none !important; }
  #subtitle { position: fixed; bottom: 96px; left: 50%; transform: translateX(-50%); z-index: 20; font-size: 15px; color: #ddd6c9; text-shadow: 0 0 8px #000; opacity: 0; transition: opacity 1s; max-width: 80%; text-align: center; pointer-events: none; font-style: italic; }
</style>
</head>
<body>
  <canvas id="game"></canvas>
  <div id="hud" class="hidden">
    <div id="vignette"></div>
    <div id="crosshair"></div>
    <div id="subtitle"></div>
    <div id="status">
      <div><span class="k">[Joystick / WASD]</span> mover &nbsp; <span class="k">[arrastra]</span> mirar</div>
      <div><span class="k">[🔦 / F]</span> linterna &nbsp; <span class="k">[Shift]</span> correr</div>
    </div>
    <div id="battery-wrap"><div class="lbl">LINTERNA</div><div id="battery"><i></i></div></div>
    <button id="btn-flash">🔦</button>
    <div id="joy-base" class="hidden"></div>
    <div id="joy-knob" class="hidden"></div>
  </div>
  <div id="rotate" class="hidden"><div class="ico">📱</div><div>GIRA TU DISPOSITIVO<br/>A HORIZONTAL</div></div>
  <div id="loading" class="overlay">
    <h1>NIEBLA DEL MAÍZ<span class="sub">SURVIVAL HORROR</span></h1>
    <div class="bar"><i id="load-bar"></i></div>
    <div class="pct" id="load-pct">Cargando el mundo…</div>
  </div>
  <div id="title" class="overlay hidden">
    <h1>NIEBLA DEL MAÍZ<span class="sub">— UN PUEBLO QUE NO DEBERÍA EXISTIR —</span></h1>
    <p>Tu coche se averió en un camino de tierra perdido entre los maizales, a plena luz del día. No se oye un solo pájaro. Hay gente ahí fuera, quietos, mirando. Encuentra una salida… si es que la hay.</p>
    <div class="keys"><b>Joystick</b> (izq.) moverse &nbsp;·&nbsp; <b>arrastrar</b> (der.) mirar &nbsp;·&nbsp; <b>🔦</b> linterna<br/>En PC: <b>WASD</b> · ratón · <b>Shift</b> · <b>F</b></div>
    <button class="play" id="play-btn">ENTRAR</button>
  </div>

  <script type="module">
${combined}
  </script>
</body>
</html>
`;

writeFileSync('NIEBLA-DEL-MAIZ.html', html);
console.log('GLB embebidos:', (glbTotal / 1024 / 1024).toFixed(1), 'MB  |  HTML:', (html.length / 1024 / 1024).toFixed(2), 'MB');
