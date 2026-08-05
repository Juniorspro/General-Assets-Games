// Utilidades de build compartidas: "desmodulariza" three + addons para poder
// incrustarlos en un único <script type="module"> sin imports (file://).
import { readFileSync, statSync } from 'fs';

const V = 'vendor/three/';
const read = p => readFileSync(p, 'utf8');

// three core -> código (sin export) + objeto namespace `const THREE = {...}`
export function threeParts() {
  const raw = read(V + 'three.module.js');
  const m = raw.match(/export\s*\{([\s\S]*?)\};/);
  if (!m) throw new Error('no export en three');
  const names = m[1].split(',').map(s => s.trim()).filter(Boolean);
  const ns = names.map(n => n.includes(' as ') ? (() => { const [l, e] = n.split(' as ').map(x => x.trim()); return `${e}: ${l}`; })() : n);
  return {
    code: raw.replace(/export\s*\{[\s\S]*?\};\s*$/, ''),
    namespace: `\nconst THREE = { ${ns.join(', ')} };\n`,
  };
}

const stripImports = s => s.replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]*['"];?/g, '');
const stripExportDecl = s => s.replace(/\bexport\s+(function|class|const|let|var)\b/g, '$1');
const stripExportBlocks = s => s.replace(/export\s*\{[\s\S]*?\}\s*;?/g, '');

// addon -> IIFE que ve three por closure y expone solo sus exports
export function addonIIFE(path) {
  const src = read(V + path);
  const names = new Set();
  src.replace(/export\s*\{([\s\S]*?)\}\s*;?/g, (mm, inner) => { inner.split(',').map(s => s.trim()).filter(Boolean).forEach(n => names.add(n.includes(' as ') ? n.split(' as ')[1].trim() : n)); return mm; });
  src.replace(/\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/g, (mm, n) => { names.add(n); return mm; });
  const list = [...names];
  const body = stripExportBlocks(stripExportDecl(stripImports(src)));
  return `\nconst { ${list.join(', ')} } = (function(){\n${body}\nreturn { ${list.join(', ')} };\n})();\n`;
}

// modelos GLB -> `const GLB = { name: "base64", ... }`
export function glbConst(map, dir = 'assets/models/') {
  let total = 0;
  const entries = Object.entries(map).map(([k, f]) => { total += statSync(dir + f).size; return `  ${k}: "${readFileSync(dir + f).toString('base64')}"`; });
  return { code: `\nconst GLB = {\n${entries.join(',\n')}\n};\n`, bytes: total };
}

export const guardScript = s => s.replace(/<\/script/gi, '<\\/script');
