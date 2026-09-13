const { chromium } = require('/tmp/claude-0/-home-user-General-Assets-Games/34392e50-740e-5db0-ad10-5f440eb5a7da/scratchpad/node_modules/playwright-core');
const fs=require('fs'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const files=fs.readdirSync('assets/fp/cdn').filter(f=>f.endsWith('.glb')).slice(0,8);
const html=`<!doctype html><body style="margin:0;background:#334">
<script type="importmap">{"imports":{"three":"/_vthree/build/three.module.js","three/addons/":"/_vthree/examples/jsm/"}}</script>
<canvas id=c width=1200 height=600></canvas>
<script type="module">
import*as T from 'three';import{GLTFLoader}from'/_vthree/examples/jsm/loaders/GLTFLoader.js';
const sc=new T.Scene();sc.background=new T.Color(0x445566);
const cam=new T.PerspectiveCamera(45,2,.1,1000);
const rn=new T.WebGLRenderer({canvas:c});rn.setSize(1200,600);
sc.add(new T.HemisphereLight(0xffffff,0x333,2));const d=new T.DirectionalLight(0xffffff,2);d.position.set(3,8,4);sc.add(d);
const files=${JSON.stringify(files)};let done=0;const info=[];
const L=new GLTFLoader();
files.forEach((f,i)=>{L.load('/assets/fp/cdn/'+f,g=>{const m=g.scene;
  const box=new T.Box3().setFromObject(m);const sz=box.getSize(new T.Vector3());const c2=box.getCenter(new T.Vector3());
  const k=6/(Math.max(sz.x,sz.y,sz.z)||1);m.scale.setScalar(k);
  const col=i%4,row=(i/4|0);m.position.set((col-1.5)*8, -c2.y*k -3 + row*0, (row)*0-6);
  // reposicionar en grilla
  m.position.set((col-1.5)*8, -box.min.y*k, -row*8);
  sc.add(m);info.push({f:f.slice(0,8),h:+sz.y.toFixed(1),w:+sz.x.toFixed(1)});done++;
  if(done===files.length)window.__ok=1;
},undefined,e=>{done++;if(done===files.length)window.__ok=1;});});
cam.position.set(0,6,20);cam.lookAt(0,3,-8);
function loop(){requestAnimationFrame(loop);rn.render(sc,cam);}loop();
window.__info=()=>info;
</script></body>`;
fs.writeFileSync('_grid.html',html);
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=swiftshader','--no-sandbox','--enable-unsafe-swiftshader']});
const pg=await(await b.newContext({viewport:{width:1200,height:600},deviceScaleFactor:1})).newPage();
pg.on('pageerror',e=>console.log('ERR',e.message.slice(0,120)));
await pg.goto('http://127.0.0.1:8951/_grid.html',{waitUntil:'load'});
await pg.waitForFunction('window.__ok',null,{timeout:25000}).catch(()=>console.log('timeout'));
await sleep(600);console.log(JSON.stringify(await pg.evaluate(()=>window.__info())));
await pg.screenshot({path:'scratchpad/g3/fpcdn-grid.png'});await b.close();})().catch(e=>console.log('X',e.message));
