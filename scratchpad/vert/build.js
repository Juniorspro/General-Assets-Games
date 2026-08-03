/* arma dist/<slug>.html (CDN) o arc-<slug>.html (--test, assets locales) */
const fs = require('fs'), path = require('path');
const DIR = __dirname, ROOT = path.resolve(DIR, '../..');
const TEST = process.argv.includes('--test');
const only = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);
let HASH = '';
try { HASH = fs.readFileSync(path.join(DIR, 'HASH'), 'utf8').trim(); } catch (e) {}

const META = {
  burbujas: { name: 'BURBUJAS', sub: 'apuntá y explotá', sky: '#0a0a1e', acc: '#4dd2ff', music: true, art: true },
  rebote:   { name: 'REBOTE',   sub: 'rompé todo',        sky: '#0b1026', acc: '#ffb04d', music: true, art: true },
  orion:    { name: 'ORION',    sub: 'defendé la galaxia', sky: '#04060f', acc: '#ff5470', music: true, art: true },
  altura:   { name: 'ALTURA',   sub: 'subí sin caer',      sky: '#0a1226', acc: '#7dff9e', music: true, art: true },
  tajo:     { name: 'TAJO',     sub: 'cortá al vuelo',     sky: '#140a1e', acc: '#ff4de1', music: true, art: true }
};

const SFXNAMES = ['pop', 'coin', 'boom', 'shoot', 'swipe', 'win', 'lose', 'power'];

function build(slug) {
  const m = META[slug]; if (!m) { console.log('meta desconocida:', slug); return; }
  const head = fs.readFileSync(path.join(DIR, 'head.html'), 'utf8');
  const body = fs.readFileSync(path.join(DIR, 'body.html'), 'utf8');
  const shell = fs.readFileSync(path.join(DIR, 'shell.js'), 'utf8');
  const game = fs.readFileSync(path.join(DIR, 'g_' + slug + '.js'), 'utf8');
  const three = /three:\s*true/.test(game) || m.three;

  const sub = (s) => s.replace(/__TITLE__/g, m.name).replace(/__NAME__/g, m.name)
    .replace(/__SUB__/g, m.sub).replace(/__SKY__/g, m.sky).replace(/__ACC__/g, m.acc);

  const base = TEST ? '/assets/vert/' : 'https://cdn.jsdelivr.net/gh/Juniorspro/General-Assets-Games@' + HASH + '/assets/vert/';
  const sfxObj = '{' + SFXNAMES.map(n => n + ":A('sfx-" + n + ".mp3')").join(',') + '}';
  const assign = 'Object.assign(window.GAME,{' +
    (m.art ? "art:A('art-" + slug + ".jpg')," : '') +
    (m.music ? "music:A('mus-" + slug + ".m4a')," : '') +
    'sfx:SFX});';

  let threeTag = '';
  if (three) {
    const tre = TEST ? '/_vthree/build/three.module.js' : 'https://cdn.jsdelivr.net/gh/Juniorspro/General-Assets-Games@' + HASH + '/_vthree/build/three.module.js';
    threeTag = '<script type="importmap">{"imports":{"three":"' + tre + '"}}</script>';
  }

  const html = '<!doctype html><html lang="es"><head>' + sub(head) + threeTag + '</head><body>' + sub(body) +
    '<script>const SLUG=' + JSON.stringify(slug) + ';const A=f=>(' + (TEST ? 'true' : 'location.search.indexOf("local")>=0') +
    "?'/assets/vert/':'" + base + "')+f;const SFX=" + sfxObj + ';</script>' +
    '<script>' + game + '</script>' +
    '<script>' + assign + '</script>' +
    '<script>' + shell + '</script>' +
    '<script>__BOOT();</script>' +
    '</body></html>';

  const out = TEST ? path.join(DIR, 'arc-' + slug + '.html') : path.join(ROOT, 'assets/vert', slug + '.html');
  fs.writeFileSync(out, html);
  console.log('ok', slug, '->', out, '(' + (html.length / 1024 | 0) + ' kb)' + (TEST ? '' : ' hash=' + HASH));
}

const slugs = only ? [only] : Object.keys(META).filter(s => fs.existsSync(path.join(DIR, 'g_' + s + '.js')));
for (const s of slugs) build(s);
