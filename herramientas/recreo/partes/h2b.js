
/* ===================== EL SONIDO, PROCEDURAL ===================== */
const AUD={ ctx:null, on:true };
function audioIniciar(){
  if(AUD.ctx) return;
  const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
  let c; try{ c=new C(); }catch(e){ return; }
  AUD.ctx=c;
  const m=c.createGain(); m.gain.value=0.8; m.connect(c.destination); AUD.m=m;
  /* la voz se decodifica UNA vez, aca: decodeAudioData es asincrono y hacerlo en el momento de
     hablar dejaria el primer "eh!" del juego sin sonar */
  vozCargar();
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
/* RUIDO FILTRADO. Un grito y un bicho reventando son ruido, no tono: con osciladores solos el
   grito sale a pitido de microondas y el estallido a timbre de ascensor. Un segundo de ruido blanco
   por un pasabanda que barre da las dos cosas, y el barrido es lo que decide cual es cual — el grito
   BAJA (un grito que sube suena a persona, uno que baja suena a animal grande) y el estallido sube. */
function soplo(dur, vol, f0, f1, q){
  if(!AUD.ctx||!AUD.on) return;
  const c=AUD.ctx, t=c.currentTime, n=Math.max(1,Math.floor(c.sampleRate*dur));
  const b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  const src=c.createBufferSource(); src.buffer=b;
  const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=q||0.9;
  bp.frequency.setValueAtTime(f0,t);
  if(f1) bp.frequency.exponentialRampToValueAtTime(Math.max(40,f1), t+dur);
  const g=c.createGain(); g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(bp); bp.connect(g); g.connect(AUD.m); src.start(t); src.stop(t+dur+0.03);
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
    else if(k==='bicho'){ tono(1500,0.09,0.07,'sawtooth',2400); tono(1500,0.09,0.05,'square',900); }
    /* MEDIDO: con soplo a 0,20 y Q 0,7 el estallido daba 0,0136 de pico contra 0,1155 de 'bien' —
       o sea que reventar un bicho sonaba doce veces mas bajo que acertar una cuenta. Un pasabanda
       angosto se come casi toda la energia del ruido blanco. Con Q 0,5, mas volumen y un golpe bajo
       encima queda por debajo del grito pero se escucha como lo que es. */
    else if(k==='revienta'){ soplo(0.22,0.55,380,2200,0.5); tono(280,0.12,0.16,'square',80);
                             tono(1100,0.07,0.09,'sawtooth',420); }
    else if(k==='muerde'){ soplo(0.18,0.40,220,90,0.8); tono(150,0.16,0.16,'sawtooth',70); }
    /* EL GRITO ES EL SONIDO MAS FUERTE DEL JUEGO, y tiene que serlo: es el unico momento en que el
       juego habla mas fuerte que el jugador. Tres formantes que BAJAN mas un soplo ancho. */
    else if(k==='grito'){
      /* LA VOZ VA ENCIMA DEL GRITO SINTETICO Y NO EN SU LUGAR. Sola, la voz generada es un hombre
         gritando en una habitacion; solo, el sintetico es un ruido descendente sin garganta. Juntos
         suena a algo con pulmones que ademas rompe el aire, y encima el sintetico tapa el corte del
         final del archivo. */
      hablar('grito', 1.0);
      musicaBajar(0.08, 0);
      tono(840,1.15,0.30,'sawtooth',170);
      tono(520,1.15,0.24,'sawtooth',115);
      tono(1280,0.85,0.14,'square',300);
      soplo(1.10,0.22,1600,180,0.6);
    }
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
/* EL CARTEL DE ARRIBA DICE DONDE ESTAS, no cuantos libros juntaste. Con ocho aulas de tres cuentas
   "5 / 24" no ubica a nadie: lo que el jugador necesita saber es en que aula esta y cuanto le falta
   para salir de ella. Y durante los bichos dice cuantos quedan, porque en ese rato no hay cuentas. */
function pintarLibros(){
  const el=document.getElementById('libros'); if(!el) return;
  if(bichosVivos>0){ el.textContent=TX('bichosHud',{n:bichosVivos}); return; }
  el.textContent=TX('aulaHud',{a:aulaIdx+1, t:TOUR.length, n:aulaK});
}
let pant='idioma';
function verPantalla(p){
  pant=p;
  for(const [id,n] of [['pIdioma','idioma'],['pMenu','menu'],['pComo','como'],['pFin','fin'],['pMuere','muere']])
    document.getElementById(id).classList.toggle('ver', p===n);
  const enJuego=(p==='juego');
  document.body.classList.toggle('jugando', enJuego);
  jugando=enJuego && !terminado;
  if(!enJuego){ document.body.classList.remove('esperando'); document.body.classList.remove('clase');
                document.body.classList.remove('bichos'); document.body.classList.remove('grito');
                musicaParar(p==='muere'? 0.25 : 0.8); }
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
  aplicarSombras(CAL[c].sombras);
  ajustar(); pintarCal();
}
for(const b of document.querySelectorAll('[data-cal]')) b.onclick=()=>aplicarCal(b.dataset.cal);
const MANO_MOTIVO={ permiso:'manoErrPermiso', camara:'manoErrCamara', cdn:'manoErrCdn',
                    modelo:'manoErrModelo', insegura:'manoErrInsegura' };
function pintarCtrl(){
  document.getElementById('oManos').classList.toggle('si', ctrlManos);
  document.getElementById('oPad').classList.toggle('si', !ctrlManos);
  document.body.classList.toggle('pad', !ctrlManos || MANO.estado==='no');
  /* EL MOTIVO SE ESCRIBE Y SE QUEDA. Un juego que se maneja con la camara y no la pide se ve roto,
     y sin decir por que no hay nada que el jugador pueda hacer al respecto. */
  const av=document.getElementById('camAviso'); if(!av) return;
  av.classList.remove('mal','bien');
  if(!ctrlManos){ av.textContent=TX('manoPad'); return; }
  if(MANO.estado==='carga'){ av.textContent=TX('manoCarga'); return; }
  if(MANO.estado==='lista'){ av.textContent=TX('manoOk'); av.classList.add('bien'); return; }
  if(MANO.error){ av.textContent=TX(MANO_MOTIVO[MANO.error]||'manoErrCamara'); av.classList.add('mal'); return; }
  av.textContent=TX('manoPide');
}
document.getElementById('oManos').onclick=async()=>{
  ctrlManos=true; try{ localStorage.setItem('recreo_ctrl','manos'); }catch(e){}
  pintarCtrl(); await manosIniciar(); ctrlManos=MANO.on; pintarCtrl(); };
document.getElementById('oPad').onclick=()=>{
  ctrlManos=false; try{ localStorage.setItem('recreo_ctrl','pad'); }catch(e){}
  MANO.on=false; document.body.classList.remove('manos'); pintarCtrl(); };
/* LA CAMARA SE PIDE AL TOCAR JUGAR, y esto era el defecto que reporto el usuario: "no me pide
   permiso de camara". El permiso solo se pedia al tocar el boton MANOS, que es una de seis opciones
   chicas del menu Y QUE YA APARECIA ELEGIDA —el modo manos es el de por defecto—, asi que tocarlo
   no parecia hacer nada y no habia ninguna razon para hacerlo. Resultado: el juego arrancaba en modo
   numeros y MediaPipe no se cargaba nunca.
   Va en JUGAR porque getUserMedia necesita un gesto del jugador y JUGAR es el gesto que todos hacen.
   Y no se bloquea el juego si falla: si no hay camara, arranca con los numeros. */
document.getElementById('bJugar').onclick=async()=>{
  audioIniciar();
  if(ctrlManos && MANO.estado!=='lista'){
    await manosIniciar();
    ctrlManos=MANO.on; pintarCtrl();
  }
  empezar();
};
document.getElementById('bComo').onclick=()=>verPantalla('como');
document.getElementById('bIdioma').onclick=()=>verPantalla('idioma');
document.getElementById('bVolver').onclick=()=>verPantalla('menu');
document.getElementById('bFin').onclick=()=>verPantalla('menu');
document.getElementById('bReint').onclick=()=>reintentar();
document.getElementById('bMuereSalir').onclick=()=>verPantalla('menu');
document.getElementById('salirJ').onclick=(e)=>{ e.stopPropagation(); verPantalla('menu'); };
/* el respaldo por teclado: los numeros del 1 al 0 (0 = diez) */
addEventListener('keydown', e=>{
  if(e.key>='1' && e.key<='9') padPedido=+e.key;
  if(e.key==='0') padPedido=10;
});
