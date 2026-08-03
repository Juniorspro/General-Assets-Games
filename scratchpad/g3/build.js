/* arma dist/<slug>.html (CDN) o arc-<slug>.html (--test, repo local) */
const fs = require('fs'), path = require('path');
const DIR = __dirname, ROOT = path.resolve(DIR, '../..');
const TEST = process.argv.includes('--test');
const only = process.argv.find((a, i) => i >= 2 && !a.startsWith('-'));
let HASH = ''; try { HASH = fs.readFileSync(path.join(DIR, 'HASH'), 'utf8').trim(); } catch (e) {}

const META = {
  horda: { name: 'HORDA', sub: 'sobreviví las oleadas', sky: '#241826', acc: '#ff5470',
    mdl: { hands: 'assets/hyper/vm-hands.glb', gun: 'assets/hyper/w-smg.glb', enemy: 'assets/arcade/m-arena-run.glb',
      veh: ['assets/fp/cdn/7463a5d5-c4f5-4c85-8059-d58c4026d137.glb', 'assets/fp/cdn/00dbd02b-db37-442c-924b-327899e5b05a.glb',
        'assets/fp/cdn/101f89a4-08af-433a-8756-b7bc7050c77d.glb', 'assets/fp/cdn/282959d6-0a49-4e1e-85b5-0dc2bc8e7f15.glb',
        'assets/fp/cdn/5701504c-5afd-494a-b052-258853b27c87.glb', 'assets/fp/cdn/4582a91c-a517-4d50-bc9b-5359177e5463.glb'] },
    tex: { sky: 'assets/g3/sky-horda.jpg', ground: 'assets/fp/tex/stucco.webp', brick: 'assets/fp/tex/brick.webp', facade: 'assets/fp/tex/facade.webp', roof: 'assets/fp/tex/roof.webp' } }
};
const SFXN = ['shoot', 'boom', 'coin', 'win', 'lose', 'power', 'swipe'];

function build(slug) {
  const m = META[slug]; if (!m) { console.log('meta?', slug); return; }
  const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');
  const head = read('head.html'), body = read('body.html'), shell = read('shell.js'), game = read('g_' + slug + '.js');
  const sub = s => s.replace(/__TITLE__/g, m.name).replace(/__NAME__/g, m.name).replace(/__SUB__/g, m.sub).replace(/__SKY__/g, m.sky).replace(/__ACC__/g, m.acc);
  const cdn = 'https://cdn.jsdelivr.net/gh/Juniorspro/General-Assets-Games@' + HASH + '/';
  const R = TEST ? "p=>'/'+p" : "p=>(location.search.indexOf('local')>=0?'/':'" + cdn + "')+p";
  const TV = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  const tre = TEST ? '/_vthree/build/three.module.js' : TV + 'build/three.module.js';
  const gltf = TEST ? '/_vthree/examples/jsm/loaders/GLTFLoader.js' : TV + 'examples/jsm/loaders/GLTFLoader.js';
  const mdl = JSON.stringify(m.mdl), tex = JSON.stringify(m.tex);
  const sfx = '{' + SFXN.map(n => n + ":R('assets/vert/sfx-" + n + ".mp3')").join(',') + '}';

  const html = '<!doctype html><html lang="es"><head>' + sub(head) +
    '<script type="importmap">{"imports":{"three":"' + tre + '","three/addons/":"' + gltf.replace('jsm/loaders/GLTFLoader.js', 'jsm/') + '"}}</script>' +
    '</head><body>' + sub(body) +
    '<script>const SLUG=' + JSON.stringify(slug) + ';const TRE=' + JSON.stringify(tre) + ';const GLTFURL=' + JSON.stringify(gltf) +
    ';const R=' + R + ';const _map=m=>{const o={};for(const k in m)o[k]=Array.isArray(m[k])?m[k].map(R):R(m[k]);return o};' +
    'const MDL=_map(' + mdl + ');const TEX=_map(' + tex + ');const SFX=' + sfx + ';</script>' +
    '<script>' + game + '</script>' +
    '<script>Object.assign(window.GAME,{sfx:SFX});</script>' +
    '<script>' + shell + '</script>' +
    '<script>__BOOT();</script></body></html>';

  const out = TEST ? path.join(DIR, 'arc-' + slug + '.html') : path.join(ROOT, 'assets/g3', slug + '.html');
  fs.writeFileSync(out, html);
  console.log('ok', slug, '->', out, (html.length / 1024 | 0) + 'kb', TEST ? '' : 'hash=' + HASH);
}
const slugs = only ? [only] : Object.keys(META).filter(s => fs.existsSync(path.join(DIR, 'g_' + s + '.js')));
for (const s of slugs) build(s);
