# -*- coding: utf-8 -*-
"""El audio pasa a WebAudio. Idempotente."""
import sys
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cam(a,b,marca=None,n=1):
    global s
    if marca and marca in s: print('  (ya)'); return
    if b in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:260]
    s=s.replace(a,b,n)

i=s.index('/* LOS EFECTOS Y LA MUSICA SON GRABADOS.')
j=s.index('function son(k){')
NUEVO = r"""/* EL AUDIO VA POR WEBAUDIO Y NO POR ELEMENTOS <audio>, Y NO ES UN GUSTO: ASI NO SONABA.
   Con <audio>, para que un efecto pueda sonar encima de si mismo hace falta una copia por voz:
   ocho efectos por tres copias, mas cuatro temas, mas doce lineas de la cinematica, son
   VEINTIOCHO elementos de audio, cada uno decodificando su propio base64. Los telefonos limitan
   cuantos se pueden tener vivos a la vez y cuando se pasa el limite NO TIRAN ERROR: simplemente
   no suenan. Eso es lo que pasaba.
   Y hay algo peor: un <audio> suelto no pasa por el contexto de audio, asi que no se puede MEDIR
   si sono. El analizador leia pico 0 con la musica supuestamente sonando — o sea que ni siquiera
   habia forma de saber si andaba.
   Con WebAudio cada disparo es un BufferSource nuevo: no hay limite, se superponen solos, se
   decodifica UNA vez al arrancar y todo pasa por el maestro, asi que el pico del analizador
   prueba que salio sonido. */
const BUF={};
let audioCargado=false, musPide='';
function b64aBytes(d){
  const s=atob(d.slice(d.indexOf(',')+1));
  const b=new Uint8Array(s.length);
  for(let k=0;k<s.length;k++) b[k]=s.charCodeAt(k);
  return b.buffer;
}
function decodificar(k, dato, alTerminar){
  if(!AUD.ctx || BUF[k]) return;
  try{
    AUD.ctx.decodeAudioData(b64aBytes(dato),
      b=>{ BUF[k]=b; if(alTerminar) alTerminar(k); },
      ()=>{});
  }catch(e){}
}
function cargarAudio(){
  if(audioCargado || !AUD.ctx) return;
  audioCargado=true;
  /* los efectos y los temas se decodifican al toque; las voces de la cinematica NO, que son
     doce y solo hacen falta si se mira la historia */
  for(const k in SFX) decodificar(k, SFX[k]);
  for(const k in MUS) decodificar(k, MUS[k], n=>{ if(musPide===n) musica(n); });
}
function cargarVoces(){ if(AUD.ctx) for(const k in VOZ) decodificar(k, VOZ[k]); }

const VOL={ sSalto:0.5, sPisa:0.4, sEstrella:0.6, sDano:0.66, sMuerte:0.7, sResorte:0.6,
            sMeta:0.68, sAgacha:0.36 };
function sonar(k){
  const b=BUF[k];
  if(!b || !AUD.on || !AUD.ctx) return false;
  if(AUD.ctx.state==='suspended'){ try{ AUD.ctx.resume(); }catch(e){} }
  try{
    const f=AUD.ctx.createBufferSource(); f.buffer=b;
    const g=AUD.ctx.createGain(); g.gain.value=VOL[k]||0.6;
    f.connect(g); g.connect(AUD.m); f.start();
  }catch(e){ return false; }
  return true;
}
/* LA MUSICA ES UN BufferSource EN BUCLE. Ademas de sacarse el limite de elementos, el bucle de
   WebAudio es EXACTO: vuelve al cero del buffer sin el hueco de milisegundos que deja el loop de
   un <audio>, que en un tema de 14 segundos se escucha en cada vuelta. */
let musFuente=null, musGan=null, musK='';
function musica(k){
  musPide=k||'';
  if(musK===k && musFuente) return;
  if(musFuente){ try{ musFuente.stop(); }catch(e){} musFuente=null; }
  musK=k||'';
  if(!k || !AUD.on || !AUD.ctx) return;
  const b=BUF[k]; if(!b) return;                 // todavia se esta decodificando; vuelve solo
  if(AUD.ctx.state==='suspended'){ try{ AUD.ctx.resume(); }catch(e){} }
  try{
    musGan=AUD.ctx.createGain(); musGan.gain.value=0.26;
    const f=AUD.ctx.createBufferSource();
    f.buffer=b; f.loop=true;
    f.connect(musGan); musGan.connect(AUD.m); f.start();
    musFuente=f;
  }catch(e){ musFuente=null; }
}
function musicaParar(){ if(musFuente){ try{ musFuente.stop(); }catch(e){} musFuente=null; } }
function musicaVol(v){ if(musGan) try{ musGan.gain.value=v; }catch(e){} }

const SON_MAP={ salto:'sSalto', pisa:'sPisa', estrella:'sEstrella', dano:'sDano',
                muerte:'sMuerte', resorte:'sResorte', meta:'sMeta', final:'sMeta',
                agacha:'sAgacha' };
"""
if 'EL AUDIO VA POR WEBAUDIO' not in s:
    s=s[:i]+NUEVO+s[j:]
    print('audio a WebAudio')
else:
    print('  (ya estaba)')

# arrancar la carga cuando nace el contexto
cam("  AUD.ctx=c;\n  const m=c.createGain(); m.gain.value=0.9; m.connect(c.destination); AUD.m=m;",
    "  AUD.ctx=c;\n  const m=c.createGain(); m.gain.value=0.9; m.connect(c.destination); AUD.m=m;",
    marca="cargarAudio();")
cam("       AUD.buf=new Float32Array(an.fftSize); }catch(e){}\n}",
    "       AUD.buf=new Float32Array(an.fftSize); }catch(e){}\n  cargarAudio();\n}")

# la cinematica, tambien por WebAudio
cam("""  const d=VOZ[IDIOMA+(k+1)];
  if(d && AUD.on){
    try{
      const a=new Audio(d); a.volume=0.98; cineAudio=a;
      a.onended=()=>{ if(cineK===k) cinePlano(k+1); };
      a.play().catch(()=>{});
    }catch(e){}
  }
  cineReloj=setTimeout(()=>{ if(cineK===k) cinePlano(k+1); }, CINE_TOPE);""",
"""  const b=BUF[IDIOMA+(k+1)];
  let dur=0;
  if(b && AUD.on && AUD.ctx){
    try{
      if(AUD.ctx.state==='suspended') AUD.ctx.resume();
      const f=AUD.ctx.createBufferSource(); f.buffer=b;
      const g=AUD.ctx.createGain(); g.gain.value=0.95;
      f.connect(g); g.connect(AUD.m);
      f.onended=()=>{ if(cineK===k) cinePlano(k+1); };
      f.start(); cineAudio=f; dur=b.duration;
    }catch(e){}
  }
  /* el plazo de respaldo se ajusta a la linea: si la voz suena, se le da su largo mas medio
     segundo; si no llego a decodificarse o esta en silencio, el tope fijo */
  cineReloj=setTimeout(()=>{ if(cineK===k) cinePlano(k+1); },
                       dur>0? dur*1000+700 : CINE_TOPE);""")
cam("  if(cineAudio){ try{ cineAudio.pause(); }catch(e){} cineAudio=null; }",
    "  if(cineAudio){ try{ cineAudio.onended=null; cineAudio.stop(); }catch(e){} cineAudio=null; }")
cam("function abrirCine(alSalir){\n  cineAlSalir=alSalir||null;\n  for(const n in MUS_CACHE) try{ MUS_CACHE[n].volume=0.08; }catch(e){}",
    "function abrirCine(alSalir){\n  cineAlSalir=alSalir||null;\n  audioIniciar(); cargarVoces(); musicaVol(0.07);")
cam("function cerrarCine(){\n  cineParar(); cineK=-1; marcarCine();\n  for(const n in MUS_CACHE) try{ MUS_CACHE[n].volume=0.30; }catch(e){}",
    "function cerrarCine(){\n  cineParar(); cineK=-1; marcarCine();\n  musicaVol(0.26);")
cam("const mudo=()=>{ AUD.on=!AUD.on; bs2.classList.toggle('mudo',!AUD.on); bs2.textContent=AUD.on?'♪':'×';\n  if(AUD.on){ const k=musK; musK=''; musica(k||'musMenu'); } else musicaParar(); };",
    "const mudo=()=>{ AUD.on=!AUD.on; bs2.classList.toggle('mudo',!AUD.on); bs2.textContent=AUD.on?'♪':'×';\n  if(AUD.on){ const k=musK||musPide||'musMenu'; musK=''; musica(k); } else musicaParar(); };")

# el gancho: ahora SI se puede medir
cam("""  audio2:()=>({ efectos:(typeof SFX!=='undefined')? Object.keys(SFX).length : 0,
                temas:(typeof MUS!=='undefined')? Object.keys(MUS).length : 0,
                sonando:musK, on:AUD.on }),""",
"""  audio2:()=>({ efectos:Object.keys(SFX).length, temas:Object.keys(MUS).length,
                decodificados:Object.keys(BUF).length,
                cuales:Object.keys(BUF).sort(),
                sonando:musK, musViva:!!musFuente, on:AUD.on,
                ctx:AUD.ctx? AUD.ctx.state : null }),
  /* dispara un sonido y devuelve el PICO que midio el analizador: es la unica prueba de que
     salio audio de verdad y no de que la llamada no tiro error */
  probarSon:(k,ms)=>new Promise(res=>{
    if(!AUD.an||!AUD.buf) return res({error:'sin analizador'});
    son(k);
    let pico=0, n=0;
    const t=setInterval(()=>{
      AUD.an.getFloatTimeDomainData(AUD.buf);
      for(let i=0;i<AUD.buf.length;i++){ const v=Math.abs(AUD.buf[i]); if(v>pico) pico=v; }
      if(++n>=(ms||30)){ clearInterval(t); res({ son:k, pico:+pico.toFixed(4),
        decodificado:!!BUF[SON_MAP[k]||k] }); }
    }, 16);
  }),""")
open(H,'w',encoding='utf-8').write(s)
print('parche de audio puesto')
