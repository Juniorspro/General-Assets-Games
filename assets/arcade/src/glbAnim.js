/* GLB de SÓLO ANIMACIÓN: se queda con el esqueleto y las pistas, y tira malla,
   textura, material y skin. Sirve para traer clips extra al mismo personaje sin
   pagar el modelo tres veces: como los tres rigs salen del MISMO mesh por la
   misma cañería, los huesos se llaman igual y three resuelve las pistas por
   nombre contra el esqueleto que ya está cargado.
   uso: node _glbanim.js in.glb out.glb [nuevoNombreDelClip] */
const fs=require('fs'),path=require('path');
const IN=process.argv[2],OUT=process.argv[3],NAME=process.argv[4];
const b=fs.readFileSync(IN);
let off=12,json=null,bin=null;
while(off<b.length){const len=b.readUInt32LE(off),ty=b.readUInt32LE(off+4);
  const d=b.slice(off+8,off+8+len);
  if(ty===0x4E4F534A)json=JSON.parse(d.toString('utf8'));else bin=d;
  off+=8+len;}
if(!json.animations||!json.animations.length){console.error('sin animaciones');process.exit(1);}
/* 1. qué accessors usan las animaciones */
const need=new Set();
for(const a of json.animations)for(const s of a.samplers){need.add(s.input);need.add(s.output);}
/* 2. bin nuevo: sólo esos accessors, cada uno en su propio bufferView compacto */
const parts=[];let cur=0;
const newAcc=[],map={};
for(const i of [...need].sort((x,y)=>x-y)){
  const a=json.accessors[i],bv=json.bufferViews[a.bufferView];
  const CT={5126:4,5125:4,5123:2,5121:1}[a.componentType];
  const N={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
  const elem=CT*N, stride=bv.byteStride||elem;
  const base=(bv.byteOffset||0)+(a.byteOffset||0);
  /* se copia des-entrelazado: elemento a elemento, así el bufferView queda apretado */
  const buf=Buffer.alloc(elem*a.count);
  for(let k=0;k<a.count;k++)bin.copy(buf,k*elem,base+k*stride,base+k*stride+elem);
  const pad=(4-(cur%4))%4;if(pad){parts.push(Buffer.alloc(pad));cur+=pad;}
  map[i]=newAcc.length;
  newAcc.push({bufferView:newAcc.length,componentType:a.componentType,count:a.count,
    type:a.type,...(a.max?{max:a.max}:{}),...(a.min?{min:a.min}:{})});
  parts.push(buf);
  newAcc[newAcc.length-1]._off=cur;newAcc[newAcc.length-1]._len=buf.length;
  cur+=buf.length;
}
const views=newAcc.map(a=>({buffer:0,byteOffset:a._off,byteLength:a._len}));
newAcc.forEach(a=>{delete a._off;delete a._len;});
/* 3. nodos: se conservan todos (son el esqueleto) pero sin malla ni skin */
const nodes=json.nodes.map(n=>{const o={...n};delete o.mesh;delete o.skin;return o;});
/* 4. animaciones remapeadas */
const anims=json.animations.map((a,ai)=>({
  name:(NAME&&ai===0)?NAME:(a.name||('clip'+ai)),
  channels:a.channels.map(c=>({sampler:c.sampler,target:{...c.target}})),
  samplers:a.samplers.map(s=>({input:map[s.input],output:map[s.output],
    ...(s.interpolation?{interpolation:s.interpolation}:{})}))}));
let nbin=Buffer.concat(parts);
if(nbin.length%4)nbin=Buffer.concat([nbin,Buffer.alloc(4-(nbin.length%4))]);
const out={asset:json.asset||{version:'2.0'},
  scene:json.scene||0,scenes:json.scenes||[{nodes:[0]}],
  nodes,animations:anims,accessors:newAcc,bufferViews:views,
  buffers:[{byteLength:nbin.length}]};
let js=Buffer.from(JSON.stringify(out),'utf8');
if(js.length%4)js=Buffer.concat([js,Buffer.alloc(4-(js.length%4),0x20)]);
const head=Buffer.alloc(12);head.write('glTF',0);head.writeUInt32LE(2,4);
head.writeUInt32LE(12+8+js.length+8+nbin.length,8);
const cj=Buffer.alloc(8);cj.writeUInt32LE(js.length,0);cj.writeUInt32LE(0x4E4F534A,4);
const cb=Buffer.alloc(8);cb.writeUInt32LE(nbin.length,0);cb.writeUInt32LE(0x004E4942,4);
fs.writeFileSync(OUT,Buffer.concat([head,cj,js,cb,nbin]));
console.log(path.basename(IN),b.length,'->',path.basename(OUT),fs.statSync(OUT).size,
  '| clips:',anims.map(a=>a.name+' ('+a.channels.length+' canales)').join(', '));
