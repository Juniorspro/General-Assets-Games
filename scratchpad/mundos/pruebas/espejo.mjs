/* ¿EL AGUA REFLEJA DE VERDAD? Se comprueba que el Reflector exista, que este
   prendido, que su resolucion baje con la calidad y que se apague de lejos —que es
   lo unico que hace que una segunda pasada de render entera sea pagable en un
   telefono—. Y se mira que el mundo no tire un solo error al cargarlo. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const { server, base } = await serve();
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const F = [['jungla','mundos/jungla.html'],['pantano','mundos/pantano.html'],
           ['exo','mundos/exo.html'],['senda','senda/senda.html'],
           ['dunas','mundos/dunas.html'],['canon','mundos/canon.html'],
           ['estepa','mundos/estepa.html'],['acropolis','mundos/acropolis.html'],
           ['secuoya','mundos/secuoya.html']];
for (const [n,f] of F){
  const p = await b.newPage({ viewport:{ width:420, height:260 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
  p.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load/.test(m.text()))errs.push('con:'+m.text().slice(0,120));});
  try{
    await p.goto(base+'assets/'+f+'?local',{waitUntil:'domcontentloaded',timeout:180000});
    await p.waitForFunction(()=>window.__S, null, { timeout:180000});
    await p.waitForTimeout(2200);
    await p.evaluate(()=>{const j=document.getElementById('mJugar'); if(j)j.click();});
    await p.waitForTimeout(2500);
    const d = await p.evaluate(()=>{
      const E = window.__ESPEJO;
      if (!E) return { sin:true };
      const rt = E.m ? E.m.getRenderTarget() : null;
      return { hay:!!E.m, on:E.on, res:rt?rt.width:null, visible:E.m?E.m.visible:null,
               lejos:E.lejos, opac: E.opac };
    });
    console.log(n.padEnd(10)+JSON.stringify(d)+(errs.length?('  ERR '+[...new Set(errs)][0]):''));
  } catch(e){ console.log(n.padEnd(10)+'NO ARRANCA: '+(errs[0]||e.message.slice(0,90))); }
  await p.close();
}
await b.close(); server.close();
