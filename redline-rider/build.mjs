/* Empaqueta src/ + three vendorizado en un unico index.html.
   Se compila a IIFE clasico a proposito: un <script type="module"> no carga desde
   file://, y el objetivo es que el juego se pueda abrir haciendo doble clic. */

import * as esbuild from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');
const single = process.argv.includes('--single');
const cdn = process.argv.includes('--cdn');

const REPO = 'Juniorspro/General-Assets-Games';
const SUBDIR = 'redline-rider';

/* Version CDN: el HTML pesa kilobytes y el audio se sirve desde jsDelivr, que lo cachea
   y lo entrega comprimido desde el borde. Se fija al commit que toco assets/ por ultima
   vez: es inmutable, asi que jsDelivr lo cachea para siempre y la URL nunca se rompe
   aunque la rama avance. */
function assetsRef(){
  const sha = execFileSync('git', ['log', '-1', '--format=%H', '--', 'assets'],
                           { cwd: root, encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(sha))
    throw new Error('no se pudo resolver el commit de assets/ (hay que commitearlos antes)');
  return sha;
}

/* Version de un solo fichero: el audio viaja empotrado como data URI.
   Se deja fuera la segunda pista de gameplay, que es opcional y pesa 4 MB; la UI
   filtra sola las pistas que no viajan. */
const EMBED = [
  'assets/audio/ui/click.mp3',
  'assets/audio/ui/hover.mp3',
  'assets/audio/music/menu.mp3',
  'assets/audio/music/game-aero.mp3',
  'assets/audio/sfx/bounce.mp3',
  'assets/audio/sfx/bounce-hard.mp3',
  'assets/audio/sfx/pass.mp3',
  'assets/audio/sfx/smash.mp3',
  'assets/audio/sfx/coin.mp3',
  'assets/audio/sfx/fire.mp3',
  'assets/audio/sfx/die.mp3',
  'assets/audio/sfx/win.mp3',
  'assets/audio/sfx/portal.mp3'
];

async function embedAssets(){
  const map = {};
  let bytes = 0;
  for (const rel of EMBED){
    const buf = await readFile(path.join(root, rel));
    bytes += buf.length;
    map[rel] = 'data:audio/mpeg;base64,' + buf.toString('base64');
  }
  console.log('empotrados', EMBED.length, 'audios,', (bytes / 1048576).toFixed(1), 'MB en crudo');
  return 'window.__HX_ASSETS=' + JSON.stringify(map) + ';\n';
}

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

const bundle = res.outputFiles[0].text;
let prelude = '';
if (single) prelude = await embedAssets();
else if (cdn){
  const ref = assetsRef();
  const base = `https://cdn.jsdelivr.net/gh/${REPO}@${ref}/${SUBDIR}/`;
  prelude = 'window.__HX_ASSET_BASE=' + JSON.stringify(base) + ';\n';
  console.log('assets desde jsDelivr, commit', ref.slice(0, 10));
}

const js = (prelude + bundle).replace(/<\/script/gi, '<\\/script');
const tpl = await readFile(path.join(root, 'template.html'), 'utf8');
if (!tpl.includes('<!--BUNDLE-->')) throw new Error('template.html no tiene el marcador <!--BUNDLE-->');

const out = tpl.replace('<!--BUNDLE-->', () => js);
const name = single ? 'redline-rider.html' : cdn ? 'redline-rider-cdn.html' : 'index.html';
await writeFile(path.join(root, name), out);

const mb = n => (n / 1048576).toFixed(2) + ' MB';
const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(name, '->', single ? mb(Buffer.byteLength(out)) : kb(Buffer.byteLength(out)),
            '(bundle', kb(Buffer.byteLength(bundle)) + ')');
