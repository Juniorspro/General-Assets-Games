/* GLB: informe y reempaquetado con texturas chicas.
   uso: node _glbtex.js in.glb                 -> sólo informa
        node _glbtex.js in.glb out.glb [px]    -> reescribe con la textura a px
   Sirve para mallas con hueso (SkinnedMesh): NO toca geometría ni animaciones,
   sólo cambia el tamaño de las imágenes, que es donde se va el peso de los GLB
   de Meshy (vienen con JPEG de 2048²). */
const fs=require('fs'),cp=require('child_process'),path=require('path');
const IN=process.argv[2],OUT=process.argv[3],TEX=+(process.argv[4]||512);
const BRI=+(process.argv[5]||1),SAT=+(process.argv[6]||1);
const b=fs.readFileSync(IN);
let off=12,json=null,bin=null;
while(off<b.length){const len=b.readUInt32LE(off),ty=b.readUInt32LE(off+4);
  const d=b.slice(off+8,off+8+len);
  if(ty===0x4E4F534A)json=JSON.parse(d.toString('utf8'));else bin=d;
  off+=8+len;}
/* ---------------------------------------------------------------- informe */
let tris=0,verts=0,skinned=0,prims=0;
for(const m of (json.meshes||[]))for(const p of (m.primitives||[])){
  prims++;
  const pos=json.accessors[p.attributes.POSITION];
  verts+=pos?pos.count:0;
  tris+=(p.indices!=null?json.accessors[p.indices].count:(pos?pos.count:0))/3;
  if(p.attributes.JOINTS_0!=null)skinned++;
}
const anims=(json.animations||[]).map(a=>({
  nombre:a.name||'(sin nombre)',canales:a.channels.length,
  dur:+Math.max(...a.samplers.map(s=>{
    const ac=json.accessors[s.input];return ac&&ac.max?ac.max[0]:0;})).toFixed(2)}));
const imgs=(json.images||[]).map((im,i)=>{
  const bv=json.bufferViews[im.bufferView];
  return {i,mime:im.mimeType||'?',bytes:bv?bv.byteLength:0};});
console.log(JSON.stringify({
  archivo:path.basename(IN),peso:b.length,prims,verts,tris:Math.round(tris),
  conHueso:skinned,huesos:(json.skins||[]).map(s=>s.joints.length),
  animaciones:anims,imagenes:imgs,nodos:(json.nodes||[]).length},null,1));
if(!OUT)process.exit(0);
/* ------------------------------------------------------ reempaquetar chico */
const newImg={};
for(const im of (json.images||[])){
  const bv=json.bufferViews[im.bufferView];
  const raw=bin.slice(bv.byteOffset||0,(bv.byteOffset||0)+bv.byteLength);
  const ext=/png/i.test(im.mimeType||'')?'png':'jpg';
  const ti='/tmp/_gt_in.'+ext,to='/tmp/_gt_out.jpg';
  fs.writeFileSync(ti,raw);
  cp.execSync('python3 -c "'
    +'from PIL import Image, ImageEnhance;'
    +"im=Image.open('"+ti+"').convert('RGB');"
    +'im=im.resize(('+TEX+','+TEX+'),Image.LANCZOS);'
    +'im=ImageEnhance.Brightness(im).enhance('+BRI+');'
    +'im=ImageEnhance.Color(im).enhance('+SAT+');'
    +"im.save('"+to+"',quality=86,optimize=True)\"");
  newImg[im.bufferView]=fs.readFileSync(to);
  im.mimeType='image/jpeg';
  console.log('  textura',raw.length,'->',newImg[im.bufferView].length);
}
/* se rearma el BIN concatenando los bufferViews en orden, alineados a 4 */
const parts=[];let cur=0;
for(let i=0;i<json.bufferViews.length;i++){
  const v=json.bufferViews[i];
  const data=newImg[i]||bin.slice(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);
  const pad=(4-(cur%4))%4;if(pad){parts.push(Buffer.alloc(pad));cur+=pad;}
  v.byteOffset=cur;v.byteLength=data.length;delete v.byteStride0;parts.push(data);cur+=data.length;
}
let nbin=Buffer.concat(parts);
if(nbin.length%4)nbin=Buffer.concat([nbin,Buffer.alloc(4-(nbin.length%4))]);
json.buffers=[{byteLength:nbin.length}];
let js=Buffer.from(JSON.stringify(json),'utf8');
if(js.length%4)js=Buffer.concat([js,Buffer.alloc(4-(js.length%4),0x20)]);
const head=Buffer.alloc(12);head.write('glTF',0);head.writeUInt32LE(2,4);
head.writeUInt32LE(12+8+js.length+8+nbin.length,8);
const cj=Buffer.alloc(8);cj.writeUInt32LE(js.length,0);cj.writeUInt32LE(0x4E4F534A,4);
const cb=Buffer.alloc(8);cb.writeUInt32LE(nbin.length,0);cb.writeUInt32LE(0x004E4942,4);
fs.writeFileSync(OUT,Buffer.concat([head,cj,js,cb,nbin]));
console.log('escrito',OUT,fs.statSync(OUT).size);
