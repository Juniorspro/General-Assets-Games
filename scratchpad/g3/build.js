/* arma dist/<slug>.html (CDN) o arc-<slug>.html (--test, repo local) */
const fs = require('fs'), path = require('path');
const DIR = __dirname, ROOT = path.resolve(DIR, '../..');
const TEST = process.argv.includes('--test');
const only = process.argv.find((a, i) => i >= 2 && !a.startsWith('-'));
let HASH = ''; try { HASH = fs.readFileSync(path.join(DIR, 'HASH'), 'utf8').trim(); } catch (e) {}

const META = {
  horda: { name: 'HORDA', sub: 'distrito cero · campaña', sky: '#241826', acc: '#ff5470', char: true,
    art: 'assets/g3/art-horda.jpg', music: 'assets/g3/mus-horda.m4a',
    mdl: { char: 'assets/hyper/char.glb', aIdle: 'assets/hyper/anim-idle.glb', aRun: 'assets/hyper/anim-run.glb',
      gun: 'assets/hyper/w-smg.glb', enemy: 'assets/arcade/m-arena-run.glb', jefe: 'assets/arcade/m-arena-jefe.glb',
      veh: ['assets/fp/cdn/7463a5d5-c4f5-4c85-8059-d58c4026d137.glb', 'assets/fp/cdn/00dbd02b-db37-442c-924b-327899e5b05a.glb',
        'assets/fp/cdn/101f89a4-08af-433a-8756-b7bc7050c77d.glb', 'assets/fp/cdn/282959d6-0a49-4e1e-85b5-0dc2bc8e7f15.glb',
        'assets/fp/cdn/5701504c-5afd-494a-b052-258853b27c87.glb', 'assets/fp/cdn/4582a91c-a517-4d50-bc9b-5359177e5463.glb'] },
    tex: { sky: 'assets/g3/sky-horda.jpg', asfalto: 'assets/g3/tex-asfalto.jpg', stucco: 'assets/fp/tex/stucco.webp',
      brick: 'assets/fp/tex/brick.webp', facade: 'assets/fp/tex/facade.webp', roof: 'assets/fp/tex/roof.webp' } },
  nudillos: { name: 'NUDILLOS', sub: 'combo tras combo',
    art: 'assets/g3/art-nudillos.jpg', music: 'assets/g3/mus-nudillos.m4a',  sky: '#241826', acc: '#ffb04d', char: true,
    mdl: { char: 'assets/hyper/char.glb', aIdle: 'assets/hyper/anim-idle.glb', aRun: 'assets/hyper/anim-run.glb',
      aP1: 'assets/hyper/anim-punch1.glb', aP2: 'assets/hyper/anim-punch2.glb', aBat: 'assets/hyper/anim-bat.glb',
      bat: 'assets/hyper/w-bat.glb', enemy: 'assets/arcade/m-arena-atk.glb', crate: 'assets/hyper/p-crate.glb' },
    tex: { sky: 'assets/g3/sky-horda.jpg', ground: 'assets/fp/tex/brick.webp', brick: 'assets/fp/tex/brick.webp', facade: 'assets/fp/tex/facade.webp' } },
  furia: { name: 'FURIA', sub: 'derby de destrucción',
    art: 'assets/g3/art-furia.jpg', music: 'assets/g3/mus-furia.m4a',  sky: '#c8b088', acc: '#ffd23f',
    mdl: { me: 'assets/fp/cdn/101f89a4-08af-433a-8756-b7bc7050c77d.glb',
      foes: ['assets/fp/cdn/4582a91c-a517-4d50-bc9b-5359177e5463.glb', 'assets/fp/cdn/282959d6-0a49-4e1e-85b5-0dc2bc8e7f15.glb',
        'assets/fp/cdn/5701504c-5afd-494a-b052-258853b27c87.glb', 'assets/fp/cdn/00dbd02b-db37-442c-924b-327899e5b05a.glb'] },
    tex: { sky: 'assets/g3/sky-furia.jpg', ground: 'assets/fp/tex/stucco.webp', brick: 'assets/fp/tex/brick.webp', facade: 'assets/fp/tex/facade.webp' } },
  vertigo: { name: 'VÉRTIGO', sub: 'cruzá las puertas',
    art: 'assets/g3/art-vertigo.jpg', music: 'assets/g3/mus-vertigo.m4a',  sky: '#c8b998', acc: '#2bd97e',
    mdl: { me: 'assets/fp/cdn/4582a91c-a517-4d50-bc9b-5359177e5463.glb' },
    tex: { sky: 'assets/g3/sky-furia.jpg', ground: 'assets/fp/tex/stucco.webp', brick: 'assets/fp/tex/brick.webp', facade: 'assets/fp/tex/facade.webp', roof: 'assets/fp/tex/roof.webp' } },
  alas: { name: 'ALAS', sub: 'volá entre anillos',
    art: 'assets/g3/art-alas.jpg', music: 'assets/g3/mus-alas.m4a',  sky: '#e8c890', acc: '#35e0c0',
    mdl: { ship: 'assets/arcade/m-orbita-nave.glb', palm: 'assets/g3/mdl-palm.glb', island: 'assets/g3/mdl-island.glb' },
    tex: { sky: 'assets/g3/sky-alas.jpg' } },
  marea: { name: 'MAREA', sub: 'laguna tropical',
    art: 'assets/g3/art-marea.jpg', music: 'assets/g3/mus-marea.m4a',  sky: '#3fb9c9', acc: '#2fd1e0',
    mdl: { craft: 'assets/g3/mdl-marea.glb', palm: 'assets/g3/mdl-palm.glb', island: 'assets/g3/mdl-island.glb', rider: 'assets/g3/mdl-rider.glb' },
    tex: { sky: 'assets/g3/sky-marea.jpg', sand: 'assets/g3/tex-sand.jpg', caustics: 'assets/g3/tex-caustics.jpg' } },
  cripta: { name: 'CRIPTA', sub: 'roguelike de mazmorra',
    art: 'assets/g3/art-cripta.jpg', music: 'assets/g3/mus-cripta.m4a', sky: '#0a0810', acc: '#e0a33a',
    mdl: { sword: 'assets/g3/mdl-sword.glb', monster: 'assets/g3/mdl-skeleton.glb' },
    tex: { wall: 'assets/g3/tex-dungeon-wall.jpg', floor: 'assets/g3/tex-dungeon-floor.jpg' } },
  duna: { name: 'DUNA', sub: 'rally de dunas',
    art: 'assets/g3/art-duna.jpg', music: 'assets/g3/mus-duna.m4a', sky: '#e8c98e', acc: '#ffa62b',
    mdl: { car: 'assets/fp/cdn/4582a91c-a517-4d50-bc9b-5359177e5463.glb', palm: 'assets/g3/mdl-palm.glb' },
    tex: { sky: 'assets/g3/sky-furia.jpg', arena: 'assets/g3/tex-sand.jpg' } },
  orbita: { name: 'ORBITA', sub: 'combate espacial',
    art: 'assets/g3/art-orbita.jpg', music: 'assets/g3/mus-orbita.m4a', sky: '#0a1030', acc: '#5ab0ff',
    mdl: { ship: 'assets/arcade/m-orbita-nave.glb', foe: 'assets/arcade/m-orbita-nave.glb' },
    tex: { sky: 'assets/g3/sky-orbita.jpg' } },
  cima: { name: 'CIMA', sub: 'descenso en tabla',
    art: 'assets/g3/art-cima.jpg', music: 'assets/g3/mus-cima.m4a', sky: '#cfe6f5', acc: '#59c2ff',
    mdl: { rider: 'assets/g3/mdl-rider.glb' },
    tex: { sky: 'assets/g3/sky-cima.jpg' } },
  arena: { name: 'ARENA', sub: 'oleadas sin fin', char: true,
    art: 'assets/g3/art-arena.jpg', music: 'assets/g3/mus-cripta.m4a', sky: '#2a2438', acc: '#b48aff',
    mdl: { hero: 'assets/hyper/char.glb', sword: 'assets/g3/mdl-sword.glb', enemy: 'assets/g3/mdl-skeleton.glb',
      aIdle: 'assets/hyper/anim-idle.glb', aRun: 'assets/hyper/anim-run.glb', aBat: 'assets/hyper/anim-bat.glb' },
    tex: { sky: 'assets/g3/sky-horda.jpg', wall: 'assets/g3/tex-dungeon-wall.jpg', floor: 'assets/g3/tex-dungeon-floor.jpg' } },
  torre: { name: 'TORRE', sub: 'parkour al cielo',
    art: 'assets/g3/art-torre.jpg', music: 'assets/g3/mus-torre.m4a', sky: '#bcd0e8', acc: '#ffd23f',
    mdl: { hero: 'assets/hyper/char.glb', crate: 'assets/hyper/p-crate.glb', log: 'assets/reliquia/obs-log.glb',
      totem: 'assets/reliquia/obs-totem.glb', tree: 'assets/hyper/p-tree.glb' },
    tex: { sky: 'assets/g3/sky-marea.jpg', wall: 'assets/fp/tex/brick.webp', floor: 'assets/fp/tex/stucco.webp',
      wood: 'assets/hyper/t-wood.jpg', rock: 'assets/hyper/t-concrete.jpg' } }
};
const SFXN = ['shoot', 'boom', 'coin', 'win', 'lose', 'power', 'swipe'];

function build(slug) {
  const m = META[slug]; if (!m) { console.log('meta?', slug); return; }
  const read = f => fs.readFileSync(path.join(DIR, f), 'utf8');
  const head = read('head.html'), body = read('body.html'), shell = read('shell.js'), game = read('g_' + slug + '.js');
  const charjs = m.char ? read('char.js') : '';
  const propsjs = read('props.js');
  const lifejs = read('life.js');
  const sub = s => s.replace(/__TITLE__/g, m.name).replace(/__NAME__/g, m.name).replace(/__SUB__/g, m.sub).replace(/__SKY__/g, m.sky).replace(/__ACC__/g, m.acc);
  const cdn = 'https://cdn.jsdelivr.net/gh/Juniorspro/General-Assets-Games@' + HASH + '/';
  const R = TEST ? "p=>'/'+p" : "p=>(location.search.indexOf('local')>=0?'/':'" + cdn + "')+p";
  const TV = 'https://cdn.jsdelivr.net/npm/three@0.170.0/';
  const tre = TEST ? '/_vthree/build/three.module.js' : TV + 'build/three.module.js';
  const gltf = TEST ? '/_vthree/examples/jsm/loaders/GLTFLoader.js' : TV + 'examples/jsm/loaders/GLTFLoader.js';
  const mdl = JSON.stringify(m.mdl), tex = JSON.stringify(m.tex);
  const sfx = '{' + SFXN.map(n => n + ":R('assets/g3/sfx-" + n + ".mp3')").join(',') + '}';

  const html = '<!doctype html><html lang="es"><head>' + sub(head) +
    '<script type="importmap">{"imports":{"three":"' + tre + '","three/addons/":"' + gltf.replace('jsm/loaders/GLTFLoader.js', 'jsm/') + '"}}</script>' +
    '</head><body>' + sub(body) +
    '<script>const SLUG=' + JSON.stringify(slug) + ';const TRE=' + JSON.stringify(tre) + ';const GLTFURL=' + JSON.stringify(gltf) +
    ';const R=' + R + ';const _map=m=>{const o={};for(const k in m)o[k]=Array.isArray(m[k])?m[k].map(R):R(m[k]);return o};' +
    'const MDL=_map(' + mdl + ');const TEX=_map(' + tex + ');const SFX=' + sfx + ';</script>' +
    (charjs ? '<script>' + charjs + '</script>' : '') +
    '<script>' + propsjs + '</script>' +
    '<script>' + lifejs + '</script>' +
    '<script>' + game + '</script>' +
    '<script>Object.assign(window.GAME,{sfx:SFX' +
    (m.art ? ",art:R('" + m.art + "')" : '') +
    (m.music ? ",music:R('" + m.music + "')" : '') + '});</script>' +
    '<script>' + shell + '</script>' +
    '<script>__BOOT();</script></body></html>';

  const out = TEST ? path.join(DIR, 'arc-' + slug + '.html') : path.join(ROOT, 'assets/g3', slug + '.html');
  fs.writeFileSync(out, html);
  console.log('ok', slug, '->', out, (html.length / 1024 | 0) + 'kb', TEST ? '' : 'hash=' + HASH);
}
const slugs = only ? [only] : Object.keys(META).filter(s => fs.existsSync(path.join(DIR, 'g_' + s + '.js')));
for (const s of slugs) build(s);
