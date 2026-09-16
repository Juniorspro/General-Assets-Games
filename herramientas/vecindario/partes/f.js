/* =========================================================================================
   EL AUDIO, EL BUCLE Y LOS GANCHOS DE PRUEBA

   Todo por WebAudio y todo colgado de un maestro con analizador: la unica prueba de que un
   sonido sono es medirlo, y eso ya costo una vuelta entera en Campo_de_Tiro.
   ========================================================================================= */
@@AUDIO@@
const AUD={ ctx:null, m:null, an:null, on:false };
const BUF={};
function audioIniciar(){
  if(AUD.ctx){ if(AUD.ctx.state==='suspended') AUD.ctx.resume(); return; }
  try{
    AUD.ctx=new (window.AudioContext||window.webkitAudioContext)();
    AUD.m=AUD.ctx.createGain(); AUD.m.gain.value=0.9; AUD.m.connect(AUD.ctx.destination);
    AUD.an=AUD.ctx.createAnalyser(); AUD.an.fftSize=2048; AUD.m.connect(AUD.an);
    AUD.on=true;
    for(const k in AUDIO_B64){
      const s=atob(AUDIO_B64[k]), n=s.length, a=new Uint8Array(n);
      for(let i=0;i<n;i++) a[i]=s.charCodeAt(i);
      /* decodeAudioData VACIA el buffer que recibe: sin la copia, un reintento encuentra cero
         bytes (ya paso en Campo_de_Tiro) */
      AUD.ctx.decodeAudioData(a.buffer.slice(0), b=>{ BUF[k]=b; }, ()=>{});
    }
  }catch(e){ AUD.on=false; }
}
function son(k, vol, rate){
  const b=BUF[k]; if(!b || !AUD.on) return null;
  try{
    const s=AUD.ctx.createBufferSource(); s.buffer=b;
    if(rate) s.playbackRate.value=rate;
    const g=AUD.ctx.createGain(); g.gain.value=vol==null?1:vol;
    s.connect(g); g.connect(AUD.m); s.start();
    return { s, g };
  }catch(e){ return null; }
}
function bucleSon(k, vol){
  const b=BUF[k]; if(!b || !AUD.on) return null;
  try{
    const s=AUD.ctx.createBufferSource(); s.buffer=b; s.loop=true;
    const g=AUD.ctx.createGain(); g.gain.value=0;
    s.connect(g); g.connect(AUD.m); s.start();
    g.gain.linearRampToValueAtTime(vol, AUD.ctx.currentTime+1.2);
    return { s, g };
  }catch(e){ return null; }
}
function apagar(h, seg){
  if(!h) return;
  try{ const t=AUD.ctx.currentTime;
    h.g.gain.cancelScheduledValues(t); h.g.gain.setValueAtTime(h.g.gain.value, t);
    h.g.gain.linearRampToValueAtTime(0.0001, t+(seg||0.8)); h.s.stop(t+(seg||0.8)+0.05);
  }catch(e){}
}

/* ---------- los disparos del guion: cada evento suena UNA vez por corrida ---------- */
const EVENTOS=[
  { t:16.0,        f:()=>{ SONANDO.tension=bucleSon('tension', 0.5); } },
  { t:T.giro+0.12, f:()=>{ son('susto', 1.0); } },
  { t:T.golpe,     f:()=>{ son('golpe', 1.0); apagar(SONANDO.tension, 0.3); } },
  { t:29.0,        f:()=>{ son('latido', 0.9); apagar(SONANDO.grillos, 1.0); } },
];
const SONANDO={ grillos:null, tension:null };
let _evHechos=new Set(), _pasoAnt=0;
function audioTick(t){
  if(!AUD.on) return;
  for(let i=0;i<EVENTOS.length;i++){
    if(t>=EVENTOS[i].t && !_evHechos.has(i)){ _evHechos.add(i); EVENTOS[i].f(); }
  }
  /* los pasos salen de la MISMA fase que mueve las piernas: sonido y zancada no pueden
     desincronizarse porque son el mismo numero */
  if(t<T.frena){
    const fase=Math.max(0, 4-caminataZ(t))/PASO_LARGO*Math.PI*2;
    const n=Math.floor(fase/Math.PI);
    if(n>_pasoAnt){ _pasoAnt=n; son('paso', 0.8, 0.94+Math.random()*0.12); }
  }
}

/* ---------- el reloj y el bucle ---------- */
let t0=null, tOffset=0, corriendo=false, _finVisto=false;
const relojArrancar=()=>{ t0=performance.now(); corriendo=true; };
function tActual(){ return corriendo? (performance.now()-t0)/1000+tOffset : tOffset; }

let _ultimo=performance.now();
function bucle(){
  requestAnimationFrame(bucle);
  const ahora=performance.now();
  const dt=Math.min(0.1, (ahora-_ultimo)/1000); _ultimo=ahora;
  if(!corriendo && tOffset===0) return;                 // en el menu no se dibuja: no hay nada que ver
  const t=Math.min(T_FIN, tActual());
  poner(t, dt);
  audioTick(t);
  if(t>=T.abre-0.05 && !document.getElementById('ojos').classList.contains('abre')){
    document.getElementById('ojos').classList.add('ver');
    /* el abre va un cuadro despues del ver: puestas juntas, la transicion no corre */
    requestAnimationFrame(()=>requestAnimationFrame(()=>
      document.getElementById('ojos').classList.add('abre')));
  }
  if(t>=T.cartelFin && !_finVisto){ _finVisto=true; document.getElementById('fin').classList.add('ver'); }
  render.render(escena, camara);
}
bucle();

document.getElementById('bVer').onclick=()=>{
  audioIniciar();
  SONANDO.grillos=bucleSon('grillos', 0.75) || SONANDO.grillos;
  /* si los clips todavia decodifican, el bucle de grillos se reintenta al primer tick */
  setTimeout(()=>{ if(!SONANDO.grillos) SONANDO.grillos=bucleSon('grillos', 0.75); }, 700);
  document.getElementById('menu').classList.add('ir');
  relojArrancar();
};
document.getElementById('bOtra').onclick=()=>location.reload();

/* ---------- ganchos ---------- */
window.__errs=window.__errs||[];
addEventListener('error', e=>window.__errs.push(String(e.message)));
window.__vec={
  t:()=>+tActual().toFixed(2),
  T,
  /* saltar a un segundo: la cinematica es una funcion de t, asi que saltar es legal — el audio
     de eventos anteriores no se dispara (los eventos ya pasados se marcan hechos) */
  ir:(t)=>{ tOffset=t; t0=performance.now(); corriendo=true;
            _mirYaw=null; _mirPitch=null;
            _evHechos=new Set(EVENTOS.map((e,i)=>e.t<t? i:-1).filter(i=>i>=0));
            _pasoAnt=Math.floor(Math.max(0,4-caminataZ(t))/PASO_LARGO*Math.PI);
            document.getElementById('menu').classList.add('ir');
            poner(t, 0.016); render.render(escena, camara); return t; },
  pausa:()=>{ tOffset=tActual(); corriendo=false; return tOffset; },
  cam:()=>({ pos:[+CAM.x.toFixed(2),+CAM.y.toFixed(2),+CAM.z.toFixed(2)],
             yaw:+CAM.yaw.toFixed(3), pitch:+CAM.pitch.toFixed(3), roll:+CAM.roll.toFixed(3),
             fov:+CAM.fov.toFixed(1) }),
  abuela:()=>({ lista:ABUELA.lista, visible:ABUELA.g? ABUELA.g.visible:false,
                huesos:Object.keys(ABUELA.huesos).length,
                nombres:Object.keys(ABUELA.huesos).slice(0,30),
                pos:ABUELA.g? [+ABUELA.g.position.x.toFixed(2), +ABUELA.g.position.z.toFixed(2)] : null }),
  audio:()=>{ if(!AUD.an) return { on:false };
    const b=new Float32Array(AUD.an.fftSize); AUD.an.getFloatTimeDomainData(b);
    let p=0,s=0; for(let i=0;i<b.length;i++){ const v=Math.abs(b[i]); if(v>p)p=v; s+=b[i]*b[i]; }
    return { on:AUD.on, clips:Object.keys(BUF).length,
             pico:+p.toFixed(4), rms:+Math.sqrt(s/b.length).toFixed(4) }; },
  /* donde caen las manos del despertar EN LA PANTALLA: la unica forma de encuadrarlas es
     medirlas, porque el marco de un telefono vertical no perdona la estima a ojo */
  manosNDC:()=>{ const v=new THREE.Vector3(), r={};
    camara.updateMatrixWorld(true);
    for(const [n,m] of [['izq',DESPERTAR.manoI],['der',DESPERTAR.manoD]]){
      m.g.getWorldPosition(v); const w=v.clone(); v.project(camara);
      r[n]={ x:+(v.x*0.5+0.5).toFixed(3), y:+(-v.y*0.5+0.5).toFixed(3),
             enCuadro:Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z<1,
             mundo:[+w.x.toFixed(2),+w.y.toFixed(2),+w.z.toFixed(2)] };
    }
    return r; },
  costo:()=>{ render.info.autoReset=false; render.info.reset();
    render.render(escena,camara);
    const r={ llamadas:render.info.render.calls, tris:render.info.render.triangles };
    render.info.autoReset=true; return r; },
  velos:()=>({ blanco:+document.getElementById('vBlanco').style.opacity||0,
               negro:+document.getElementById('vNegro').style.opacity||0,
               rojo:+document.getElementById('vRojo').style.opacity||0,
               ojos:document.getElementById('ojos').classList.contains('abre'),
               fin:document.getElementById('fin').classList.contains('ver') }),
};
</script>
</body>
</html>
