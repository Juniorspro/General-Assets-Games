/* Arma hyper.html (un solo archivo) desde head.html + props/*.js + maps/*.js + core_a.js + core_b.js
   uso: node build.js            -> hyper.html (CDN, para entregar)
        node build.js --test     -> /home/user/General-Assets-Games/hyper-test.html (assets locales + hooks) */
const fs=require('fs'),path=require('path');
const D=__dirname;
const TEST=process.argv.includes('--test');
const SMOKE=process.argv.includes('--smoke');
const R=f=>fs.readFileSync(path.join(D,f),'utf8');
const list=dir=>fs.existsSync(path.join(D,dir))
  ? fs.readdirSync(path.join(D,dir)).filter(f=>f.endsWith('.js')&&(SMOKE||f[0]!=='_')).sort().map(f=>dir+'/'+f)
  : [];

const props=list('props'),maps=list('maps');
let data='';
for(const f of props.concat(maps))data+='\n/* ==== '+f+' ==== */\n'+R(f);

const loader=`<script>
(function(){
  var Q=new URLSearchParams(location.search);
  var TV='0.170.0', CV='0.20.0';
  var t=Q.has('local')?'/_vthree/build/three.module.js':'https://cdn.jsdelivr.net/npm/three@'+TV+'/build/three.module.js';
  var a=Q.has('local')?'/_vthree/examples/jsm/':'https://cdn.jsdelivr.net/npm/three@'+TV+'/examples/jsm/';
  var c=Q.has('local')?'/_vcannon/cannon-es.js':'https://cdn.jsdelivr.net/npm/cannon-es@'+CV+'/dist/cannon-es.js';
  document.write('<script type="importmap">{"imports":{"three":"'+t+'","three/addons/":"'+a+'","cannon":"'+c+'"}}<\\/script>');
})();
</script>`;

const CORES=fs.readdirSync(D).filter(f=>/^core_[a-z]\.js$/.test(f)).sort();
let core=CORES.map(f=>'\n/* ==== '+f+' ==== */\n'+R(f)).join('');
core=core.replace(/^import .*$/gm,m=>m);   // los imports quedan arriba del módulo
// mover los imports de core_b (no tiene) — core_a ya los trae al principio

let html=R('head.html')
  +'\n'+loader
  +'\n<script>window.HP={_s:[],_m:[],section:function(){this._s.push([].slice.call(arguments))},'
  +'map:function(){this._m.push([].slice.call(arguments))}};</script>\n'
  +'<script>\n'+data+'\n</script>\n'
  +'<script type="module">\n'+core+'\n</script>\n</body></html>\n';

if(TEST){
  html=html.replace(/const HASH='[^']*';/,"const HASH='local';window.__TEST=1;");
  html=html.replace(/const BASE=[^\n]*\n/,"const BASE='/assets/hyper/';\n");
  html=html.replace("const DEV=Q.has('dev');","const DEV=true;");
  fs.writeFileSync('/home/user/General-Assets-Games/hyper-test.html',html);
  console.log('hyper-test.html',(html.length/1024|0)+'kB','| props:',props.length,'| maps:',maps.length);
}else{
  fs.writeFileSync(path.join(D,'hyper.html'),html);
  console.log('hyper.html',(html.length/1024|0)+'kB','| props:',props.length,'| maps:',maps.length);
}
