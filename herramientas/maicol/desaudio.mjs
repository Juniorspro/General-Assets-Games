// Decodifica cualquier audio (m4a, mp3, wav) con el Chromium que ya esta instalado y escupe un WAV
// mono de 22050. Hace falta porque el contenedor no tiene ffmpeg y Python no sabe leer m4a, pero el
// navegador si: decodeAudioData entiende aac de fabrica.
// uso: node desaudio.mjs <carpeta> [hz]
import { chromium } from '/tmp/ui/node_modules/playwright/index.mjs';
import fs from 'fs'; import path from 'path';
const dir=process.argv[2], HZ=+(process.argv[3]||22050);
const nav=await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
const pg=await nav.newPage();
await pg.setContent('<html><body></body></html>');
const fs2=fs.readdirSync(dir).filter(f=>/\.(m4a|mp3|wav|ogg|aac|webm)$/i.test(f));
for(const f of fs2){
  const b64=fs.readFileSync(path.join(dir,f)).toString('base64');
  const r=await pg.evaluate(async ({b64, HZ})=>{
    const bin=atob(b64); const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) buf[i]=bin.charCodeAt(i);
    const ctx=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1, 2, 44100);
    let ab;
    try{ ab=await ctx.decodeAudioData(buf.buffer); }catch(e){ return {error:String(e)}; }
    // se remezcla a mono y se remuestrea a HZ con un contexto sin salida, que es exacto
    const n=Math.round(ab.duration*HZ);
    const off=new OfflineAudioContext(1, n, HZ);
    const src=off.createBufferSource(); src.buffer=ab; src.connect(off.destination); src.start();
    const out=await off.startRendering();
    const d=out.getChannelData(0);
    const i16=new Int16Array(d.length);
    for(let i=0;i<d.length;i++){ const v=Math.max(-1,Math.min(1,d[i])); i16[i]=v*32767; }
    let s=''; const u8=new Uint8Array(i16.buffer);
    const CH=8192;
    for(let i=0;i<u8.length;i+=CH) s+=String.fromCharCode.apply(null, u8.subarray(i,i+CH));
    return { hz:HZ, seg:ab.duration, canales:ab.numberOfChannels, hzOrig:ab.sampleRate, b64:btoa(s) };
  }, {b64, HZ});
  if(r.error){ console.log(f, 'FALLA', r.error); continue; }
  const pcm=Buffer.from(r.b64,'base64');
  const cab=Buffer.alloc(44);
  cab.write('RIFF',0); cab.writeUInt32LE(36+pcm.length,4); cab.write('WAVE',8);
  cab.write('fmt ',12); cab.writeUInt32LE(16,16); cab.writeUInt16LE(1,20); cab.writeUInt16LE(1,22);
  cab.writeUInt32LE(HZ,24); cab.writeUInt32LE(HZ*2,28); cab.writeUInt16LE(2,32); cab.writeUInt16LE(16,34);
  cab.write('data',36); cab.writeUInt32LE(pcm.length,40);
  const dst=path.join(dir, f.replace(/\.[^.]+$/,'')+'.dec.wav');
  fs.writeFileSync(dst, Buffer.concat([cab,pcm]));
  console.log(f, '->', path.basename(dst), r.seg.toFixed(2)+'s', r.hzOrig+'Hz x'+r.canales, '->', HZ+'Hz mono');
}
await nav.close();
