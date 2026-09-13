/* Arma los 5 juegos, cada uno en UN archivo HTML autocontenido.
   uso: node build.js            -> dist/<slug>.html   (assets por jsDelivr)
        node build.js --test     -> /home/user/General-Assets-Games/arc-<slug>.html (assets locales)
   Cada juego = head.html + shell.js + g_<slug>.js. Sin dependencias ni build de JS. */
const fs=require('fs'),path=require('path');
const D=__dirname,TEST=process.argv.includes('--test');
const HASH=fs.existsSync(path.join(D,'HASH'))?fs.readFileSync(path.join(D,'HASH'),'utf8').trim():'main';
const R=f=>fs.readFileSync(path.join(D,f),'utf8');
const GAMES=fs.readdirSync(D).filter(f=>/^g_[a-z0-9]+\.js$/.test(f)).sort();
const head=R('head.html'),shell=R('shell.js');
const out=TEST?'/home/user/General-Assets-Games':path.join(D,'dist');
if(!fs.existsSync(out))fs.mkdirSync(out,{recursive:true});
const base=TEST?"'/assets/arcade/'"
  :"(new URLSearchParams(location.search).has('local')?'/assets/arcade/':'https://cdn.jsdelivr.net/gh/Juniorspro/General-Assets-Games@"+HASH+"/assets/arcade/')";
for(const f of GAMES){
  const src=R(f);
  const slug=(src.match(/slug:'([a-z0-9]+)'/)||[])[1]||f.slice(2,-3);
  const title=(src.match(/name:'([^']*)'/)||[])[1]||slug.toUpperCase();
  /* three.js entra por importmap (vendorizada con ?local, igual que el sandbox) */
  const loader='<script>\n(function(){var Q=new URLSearchParams(location.search);var TV="0.170.0";\n'
    +'var t=Q.has("local")?"/_vthree/build/three.module.js":"https://cdn.jsdelivr.net/npm/three@"+TV+"/build/three.module.js";\n'
    +'var a=Q.has("local")?"/_vthree/examples/jsm/":"https://cdn.jsdelivr.net/npm/three@"+TV+"/examples/jsm/";\n'
    +'document.write(\'<script type="importmap">{"imports":{"three":"\'+t+\'","three/addons/":"\'+a+\'"}}<\\/script>\');\n'
    +'})();\n<\/script>';
  const html=head.replace('__TITLE__',title)
    +'\n'+loader
    +'\n<script type="module">\n'
    +'/* ---- assets ---- */\nconst BASE='+base+';\nconst A=f=>BASE+f;\n'
    +shell+'\n'+src+'\nwindow.ARC=ARC;window.GAME=GAME;\nARC.boot();\n'
    +'</script>\n</body></html>\n';
  const name=(TEST?'arc-':'')+slug+'.html';
  fs.writeFileSync(path.join(out,name),html);
  console.log(name,(html.length/1024|0)+'kB');
}
