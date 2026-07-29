/* Empaqueta src/ + three vendorizado en un unico index.html.
   Se compila a IIFE clasico a proposito: un <script type="module"> no carga desde
   file://, y el objetivo es que el juego se pueda abrir haciendo doble clic. */

import * as esbuild from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');

const res = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: !dev,
  sourcemap: false,
  legalComments: 'none',
  alias: { three: path.join(root, 'vendor/three/three.module.js') },
  write: false
});

const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const tpl = await readFile(path.join(root, 'template.html'), 'utf8');
if (!tpl.includes('<!--BUNDLE-->')) throw new Error('template.html no tiene el marcador <!--BUNDLE-->');

const out = tpl.replace('<!--BUNDLE-->', () => js);
await writeFile(path.join(root, 'index.html'), out);

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log('index.html ->', kb(Buffer.byteLength(out)), '(bundle', kb(Buffer.byteLength(js)) + ')');
