
/* ===================== EL SONIDO, PROCEDURAL ===================== */
const AUD={ ctx:null, on:true };
function audioIniciar(){
  if(AUD.ctx) return;
  const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
  let c; try{ c=new C(); }catch(e){ return; }
  AUD.ctx=c;
  const m=c.createGain(); m.gain.value=0.8; m.connect(c.destination); AUD.m=m;
  try{ const an=c.createAnalyser(); an.fftSize=2048; m.connect(an);
       AUD.an=an; AUD.buf=new Float32Array(an.fftSize); }catch(e){}
}
function tono(f,dur,vol,tipo,f2){
  if(!AUD.ctx||!AUD.on) return;
  const c=AUD.ctx, t=c.currentTime;
  const o=c.createOscillator(); o.type=tipo||'square'; o.frequency.setValueAtTime(f,t);
  if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(20,f2), t+dur);
  const g=c.createGain(); g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(AUD.m); o.start(t); o.stop(t+dur+0.02);
}
function son(k){
  if(!AUD.ctx||!AUD.on) return;
  try{
    if(k==='bien'){ [660,880,1174].forEach((f,i)=>setTimeout(()=>tono(f,0.16,0.15,'square'),i*80)); }
    else if(k==='mal'){ tono(200,0.30,0.17,'sawtooth',110); }
    else if(k==='listo'){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tono(f,0.20,0.13,'square'),i*85)); }
    else if(k==='puerta'){ tono(170,0.18,0.13,'sawtooth',115); }
    else if(k==='libro'){ tono(1046,0.10,0.12,'square'); }
    else if(k==='paso'){ tono(90+Math.random()*24,0.06,0.07,'sine'); }
  }catch(e){}
}
/* LA VOZ: un bip por letra, con el tono siguiendo la letra. No es un idioma y no pretende serlo —
   es lo que hace que el subtitulo se lea COMO SI alguien lo estuviera diciendo. Grabar la voz seria
   catorce lineas por tres idiomas, o sea cuarenta y dos archivos para un juego que no tiene ninguno. */
function voz(ch){
  if(!AUD.ctx||!AUD.on) return;
  const c=ch.charCodeAt(0);
  tono(230 + (c%14)*13, 0.045, 0.055, 'square');
}

/* ===================== EL DIALOGO, ESCRITO A MAQUINA ===================== */
const dEl=document.getElementById('dialogo'), dTxt=document.getElementById('dTxt');
let dCola='', dPos=0, dT=0, dVer=false;
const D_VEL=0.030;                    // segundos por letra
function decir(txt){
  dCola=txt||''; dPos=0; dT=0;
  dTxt.innerHTML='';
  dVer=!!dCola;
  dEl.classList.toggle('ver', dVer);
}
function dialogoTick(dt){
  if(!dVer || dPos>=dCola.length) return;
  dT+=dt;
  while(dT>=D_VEL && dPos<dCola.length){
    dT-=D_VEL;
    /* las etiquetas <b> se copian de una: si se escribieran letra por letra, el HTML quedaria roto
       a mitad de camino y el navegador mostraria "<b" en pantalla */
    if(dCola[dPos]==='<'){
      const fin=dCola.indexOf('>', dPos);
      dPos = fin<0? dCola.length : fin+1;
    } else {
      const ch=dCola[dPos]; dPos++;
      if(ch!==' ' && (dPos%2===0)) voz(ch);
    }
    dTxt.innerHTML=dCola.slice(0,dPos);
  }
}

/* ===================== EL HUD ===================== */
let avisoT=0;
const marcaEl=document.getElementById('marca');
function avisar(t,seg,color){
  if(!t){ marcaEl.classList.remove('ver'); avisoT=0; return; }
  marcaEl.textContent=t; marcaEl.style.color=color||'#f2efe6';
  marcaEl.classList.add('ver'); avisoT=seg||1.2;
}
const aroC=document.getElementById('aroC'), aroN=document.getElementById('aroN'),
      aroS=document.getElementById('aroS');
const ARO_LARGO=2*Math.PI*44;
function pintarAro(f, num, rot){
  aroC.setAttribute('stroke-dashoffset', (ARO_LARGO*(1-Math.max(0,Math.min(1,f)))).toFixed(1));
  aroN.textContent = num==null? '' : String(num);
  aroS.textContent = rot||'';
}
function pintarLibros(){
  document.getElementById('libros').textContent=TX('libros',{n:libros,t:LIBROS_N});
}
let pant='idioma';
function verPantalla(p){
  pant=p;
  for(const [id,n] of [['pIdioma','idioma'],['pMenu','menu'],['pComo','como'],['pFin','fin']])
    document.getElementById(id).classList.toggle('ver', p===n);
  const enJuego=(p==='juego');
  document.body.classList.toggle('jugando', enJuego);
  jugando=enJuego && !terminado;
  if(!enJuego){ document.body.classList.remove('esperando'); document.body.classList.remove('clase'); }
}
let ctrlManos=true;
try{ const g=localStorage.getItem('recreo_ctrl'); if(g) ctrlManos=(g==='manos'); }catch(e){}
function pintarIdioma(){
  for(const el of document.querySelectorAll('[data-i18n]')) el.innerHTML=TX(el.getAttribute('data-i18n'));
  document.getElementById('comoTxt').innerHTML=TX('comoT');
  document.getElementById('quien').textContent=TX('quien');
  pintarLibros(); pintarCal(); pintarCtrl();
  if(window.pintarFiltro) pintarFiltro();
}
function elegirIdioma(c){ IDIOMA=c; try{ localStorage.setItem('recreo_idioma',c); }catch(e){}
  document.documentElement.lang=c; pintarIdioma(); }
(function(){
  const c=document.getElementById('idBotones');
  for(const [cod,nom] of IDIOMAS){
    const b=document.createElement('button'); b.className='bot'; b.textContent=nom;
    b.onclick=()=>{ audioIniciar(); elegirIdioma(cod); verPantalla('menu'); };
    c.appendChild(b);
  }
  elegirIdioma(IDIOMA);
})();
function pintarCal(){
  for(const b of document.querySelectorAll('[data-cal]')) b.classList.toggle('si', b.dataset.cal===calidad);
}
function aplicarCal(c){
  if(!CAL[c]) return;
  calidad=c; try{ localStorage.setItem('recreo_cal',c); }catch(e){}
  escena.fog.far=CAL[c].niebla;
  if(escuela.lockers) escuela.lockers.visible=CAL[c].lockers;
  ajustar(); pintarCal();
}
for(const b of document.querySelectorAll('[data-cal]')) b.onclick=()=>aplicarCal(b.dataset.cal);
function pintarCtrl(){
  document.getElementById('oManos').classList.toggle('si', ctrlManos);
  document.getElementById('oPad').classList.toggle('si', !ctrlManos);
  document.body.classList.toggle('pad', !ctrlManos || MANO.estado==='no');
}
document.getElementById('oManos').onclick=async()=>{
  ctrlManos=true; try{ localStorage.setItem('recreo_ctrl','manos'); }catch(e){}
  pintarCtrl(); await manosIniciar(); ctrlManos=MANO.on; pintarCtrl(); };
document.getElementById('oPad').onclick=()=>{
  ctrlManos=false; try{ localStorage.setItem('recreo_ctrl','pad'); }catch(e){}
  MANO.on=false; document.body.classList.remove('manos'); pintarCtrl(); };
document.getElementById('bJugar').onclick=()=>{ audioIniciar(); empezar(); };
document.getElementById('bComo').onclick=()=>verPantalla('como');
document.getElementById('bIdioma').onclick=()=>verPantalla('idioma');
document.getElementById('bVolver').onclick=()=>verPantalla('menu');
document.getElementById('bFin').onclick=()=>verPantalla('menu');
document.getElementById('salirJ').onclick=(e)=>{ e.stopPropagation(); verPantalla('menu'); };
/* el respaldo por teclado: los numeros del 1 al 0 (0 = diez) */
addEventListener('keydown', e=>{
  if(e.key>='1' && e.key<='9') padPedido=+e.key;
  if(e.key==='0') padPedido=10;
});
