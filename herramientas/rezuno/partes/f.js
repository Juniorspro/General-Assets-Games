/* =========================================================================================
   LA MESA: DONDE VA CADA COSA, Y LAS ZONAS QUE SE PUEDEN PELLIZCAR

   ESTO ES UNA SOLA LISTA Y NO DOS. Las zonas se calculan mientras se dibuja, en el mismo lugar y con
   los mismos numeros: si el dibujo y el area sensible fueran dos cuentas distintas, el jugador
   pellizcaria una carta y el juego agarraria la de al lado — que es exactamente el defecto que se
   reporto en RECREO con el rompecabezas y costo una vuelta entera encontrarlo.
   ========================================================================================= */
let ZONAS=[];        // {tipo, i, x, y, w, h, activo}
function zona(tipo, i, x, y, w, h, activo){ ZONAS.push({tipo,i,x,y,w,h,activo:activo!==false}); }
function zonaEn(x,y){
  /* de atras para adelante: lo ultimo que se dibuja es lo que esta arriba, asi que gana */
  for(let k=ZONAS.length-1;k>=0;k--){
    const z=ZONAS[k];
    if(x>=z.x && x<=z.x+z.w && y>=z.y && y<=z.y+z.h) return z;
  }
  return null;
}

/* ---------- el abanico de la mano ---------- */
/* EL ABANICO SE APRIETA CUANDO HAY MUCHAS CARTAS, y el ancho total esta topado. Con separacion fija,
   una mano de catorce cartas se sale del marco por los dos lados y las de las puntas no se pueden
   ni ver ni tocar. Se calcula el paso para que el abanico entero entre en el ancho util. */
const MANO_Y=1090, MANO_ANCHO=640;
function manoGeo(n){
  const paso=n<=1? 0 : Math.min(CW*0.78, (MANO_ANCHO-CW)/(n-1));
  const tot=CW + paso*(n-1);
  return { paso, x0:(DIS_W-tot)/2 };
}

const MAZO_X=170, MAZO_Y=560, PILA_X=DIS_W-170-CW, PILA_Y=560;

function pintarMesa(){
  const g=ctx;
  ZONAS.length=0;
  g.save();
  g.setTransform(ESC,0,0,ESC,0,0);
  g.clearRect(0,0,LW,LH);
  g.fillStyle='#14151a'; g.fillRect(0,0,LW,LH);

  /* EL COLOR EN JUEGO SE VE EN EL FONDO, y es la unica pista permanente que hay. En un juego cuya
     regla entera es "del mismo color", tener que mirar la esquina de una carta para saber cual es el
     color activo es un impuesto en cada turno. Un halo detras de la pila lo dice sin texto. */
  const cc=COLORES[G.color]||'#666';
  const gr=g.createRadialGradient(DIS_W/2, PILA_Y+CH/2, 20, DIS_W/2, PILA_Y+CH/2, 470);
  gr.addColorStop(0, cc+'44'); gr.addColorStop(1, '#14151a00');
  g.fillStyle=gr; g.fillRect(0,180,DIS_W,760);

  /* ---------- los dos rivales ----------
     DURANTE EL TUTORIAL NO SE DIBUJAN. No es por despejar la pantalla porque si: el cartel del
     tutorial ocupa esa franja, y ningun paso de los seis habla de los rivales. Sus cartas vuelven
     apenas termina. */
  if(!TUT.on) for(const [j, lado] of [[J_IZQ,-1],[J_DER,1]]){
    const n=G.manos[j].length;
    const cx = lado<0? 150 : DIS_W-150;
    const y=200;
    const w=CW*0.52, h=CH*0.52;
    const paso=Math.min(w*0.44, 190/Math.max(1,n));
    const tot=w+paso*Math.max(0,n-1);
    for(let i=0;i<n;i++) dibujarDorso(g, cx-tot/2+i*paso, y, w, h);
    /* EL TURNO SE MARCA CON UN SUBRAYADO Y NO CON UN BRILLO. Un brillo sobre cartas oscuras casi no
       se ve; una linea del ancho del grupo se ve de reojo. */
    if(G.fase==='juego' && G.turno===j){
      g.fillStyle='#f2f3f5'; g.fillRect(cx-tot/2, y+h+10, tot, 3);
    }
    txt(g, TX(j===J_IZQ?'bot1':'bot2'), cx, y-26, 17, '#8b909b', 700, 2.2);
    txt(g, n===1? TX('unaCarta') : TX('cartas',{n}), cx, y+h+34, 19, n===1?'#ffd84a':'#c9ccd3', 600);
  }

  /* ---------- mazo y pila ---------- */
  const puedeRobar = G.fase==='juego' && G.turno===J_VOS && !G.robo && G.sel<0 && !G.colorPide;
  dibujarDorso(g, MAZO_X, MAZO_Y, CW, CH, {sombra:true});
  if(puedeRobar){
    rr(g, MAZO_X-6, MAZO_Y-6, CW+12, CH+12, 15);
    g.strokeStyle='#f2f3f5'; g.lineWidth=2.5; g.setLineDash([9,7]); g.stroke(); g.setLineDash([]);
    txt(g, TX('robar'), MAZO_X+CW/2, MAZO_Y+CH+26, 17, '#c9ccd3', 700, 2.2);
  }
  zona('mazo', 0, MAZO_X-14, MAZO_Y-14, CW+28, CH+28, puedeRobar);

  /* la pila: se ven las tres ultimas, apenas giradas, para que se lea a monton y no a una sola carta */
  const ult=G.pila.slice(-3);
  ult.forEach((c,k)=>{
    g.save();
    g.translate(PILA_X+CW/2, PILA_Y+CH/2);
    g.rotate(((k*37)%17-8)*Math.PI/180);
    dibujarCarta(g, c, -CW/2, -CH/2, CW, CH, {sombra:k===ult.length-1});
    g.restore();
  });

  /* ---------- tu mano ---------- */
  const m=G.manos[J_VOS], n=m.length;
  const geo=manoGeo(n);
  const tuTurno = G.fase==='juego' && G.turno===J_VOS;
  for(let i=0;i<n;i++){
    if(i===G.sel) continue;                         // la agarrada se dibuja aparte, arriba de todo
    const x=geo.x0+i*geo.paso;
    const ok=pega(m[i],G.color,G.valor);
    const y=MANO_Y - (tuTurno&&ok? 14 : 0);
    dibujarCarta(g, m[i], x, y, CW, CH, {sombra:true});
    /* LAS QUE NO PEGAN SE OSCURECEN, no se esconden. Esconderlas cambiaria la mano de tamaño en cada
       turno y el jugador perderia la referencia de donde estaba cada carta. */
    if(tuTurno && !ok){ rr(g,x,y,CW,CH,11); g.fillStyle='#14151aaa'; g.fill(); }
    zona('carta', i, x, y, geo.paso>0&&i<n-1? geo.paso : CW, CH, tuTurno);
  }
  /* ---------- la carta agarrada y sus dos opciones ---------- */
  if(G.sel>=0 && m[G.sel]){
    const c=m[G.sel];
    const ok=pega(c,G.color,G.valor);
    /* LA CARTA AGARRADA SUBE 210 Y NO 160, y el numero sale de una cuenta de estorbo: mide 190 de
       alto, asi que a MANO_Y-160 su borde de abajo caia en 1.120 y el abanico empieza en 1.090 — se
       superponia justo con la mano que hay que seguir mirando para decidir. Entre la pila (termina en
       704) y el abanico hay 386 px, y boton + hueco + carta suman 304: entran con aire. */
    const w=CW*1.32, h=CH*1.32, x=(DIS_W-w)/2, y=MANO_Y-210;
    if(G.colorPide){
      pintarColores(g);
    } else {
      dibujarCarta(g, c, x, y, w, h, {sombra:true});
      const bw=248, bh=88, by=y-bh-26;
      /* TIRAR A LA IZQUIERDA Y DEJAR A LA DERECHA, SIEMPRE EN EL MISMO SITIO. Un boton que se mueve
         obliga a leerlo cada vez, y aca se pellizca cien veces por partida. */
      pintarBoton(g, TX('tirar'), DIS_W/2-bw-12, by, bw, bh, ok, ok? '#f2f3f5':'#3a3e4a');
      zona('tirar', 0, DIS_W/2-bw-12, by, bw, bh, ok);
      pintarBoton(g, TX('dejar'), DIS_W/2+12, by, bw, bh, true, '#8b909b');
      zona('dejar', 0, DIS_W/2+12, by, bw, bh, true);
      if(!ok) txt(g, TX('noVale'), DIS_W/2-bw/2-12, by+bh+24, 17, '#e0705f', 700, 2.4);
    }
  }

  /* ---------- el rotulo de turno ---------- */
  if(G.fase==='juego' && !TUT.on){
    const t = G.turno===J_VOS? TX('tuTurno') : TX('turnoDe',{n:TX(G.turno===J_IZQ?'bot1':'bot2')});
    txt(g, t, DIS_W/2, 470, 22, G.turno===J_VOS? '#f2f3f5':'#8b909b', 700, 3.4);
    if(G.turno===J_VOS && G.sel<0 && !G.colorPide)
      txt(g, TX('ayudaMano'), DIS_W/2, 505, 15, '#6f737d', 500, 1.6);
  }
  if(G.avisoT>0) txt(g, G.aviso, DIS_W/2, 640, 26, '#ffd84a', 700, 3.0);

  /* el brillo del tutorial va DEBAJO del aro: si se dibujara encima, el aro —que es el cursor— le
     quedaria tapado justo cuando hay que llevarlo a la carta que brilla */
  if(typeof pintarTut==='function') pintarTut(g);
  pintarAro(g);
  g.restore();
}

function pintarBoton(g, s, x, y, w, h, activo, col){
  rr(g,x,y,w,h,10);
  g.fillStyle = activo? '#1b1d24' : '#16171c'; g.fill();
  g.strokeStyle = activo? col : '#2a2d36'; g.lineWidth=2; g.stroke();
  txt(g, s, x+w/2, y+h/2, 27, activo? col : '#4b5060', 700, 3.2);
}
/* los cuatro colores del comodin: cuatro cuadrantes grandes, que es lo mas facil de acertar con una
   mano que tiembla */
function pintarColores(g){
  const w=196, h=110, gx=DIS_W/2-w-8, gy=MANO_Y-232;
  txt(g, TX('color'), DIS_W/2, gy-30, 21, '#f2f3f5', 700, 3.2);
  for(let k=0;k<4;k++){
    const x=gx+(k%2)*(w+16), y=gy+Math.floor(k/2)*(h+16);
    rr(g,x,y,w,h,10); g.fillStyle=COLORES[k]; g.fill();
    g.strokeStyle='#f6f7f8'; g.lineWidth=2; g.stroke();
    zona('color', k, x, y, w, h, true);
  }
}

/* ===================== EL ARO =====================
   Es el cursor y ademas es el unico aviso de que la camara te esta viendo. Por eso tiene tres
   estados y no dos: apagado (no hay mano), abierto (hay mano) y cerrado (estas pellizcando). Sin el
   estado "abierto" el jugador no sabe si el juego no lo ve o si el pellizco no le sale. */
let ARO_R=0;
function pintarAro(g){
  if(!MANO.on) return;
  const x=MANO.x*DIS_W, y=MANO.y*LH;
  const obj = MANO.hay? (MANO.pinza? 13 : 30) : 0;
  ARO_R += (obj-ARO_R)*0.28;
  if(ARO_R<1) return;
  const z=zonaEn(x,y);
  const col = (z&&z.activo)? '#ffd84a' : '#f2f3f5';
  g.save();
  g.globalAlpha=MANO.hay? 1 : 0.35;
  g.beginPath(); g.arc(x,y,ARO_R,0,Math.PI*2);
  g.strokeStyle=col; g.lineWidth=MANO.pinza? 6 : 3.5; g.stroke();
  g.beginPath(); g.arc(x,y,2.5,0,Math.PI*2); g.fillStyle=col; g.fill();
  g.restore();
}

/* ===================== EL SONIDO =====================
   Procedural y sin un solo archivo. Un juego de cartas necesita seis ruidos cortos y todos son la
   misma familia: un tono que sube o baja con un sobre rapido. Grabarlos serian seis descargas para
   seis sonidos de diez lineas. */
const AUD={ ctx:null, m:null, on:false };
function audioIniciar(){
  if(AUD.ctx) { if(AUD.ctx.state==='suspended') AUD.ctx.resume(); return; }
  try{
    AUD.ctx=new (window.AudioContext||window.webkitAudioContext)();
    AUD.m=AUD.ctx.createGain(); AUD.m.gain.value=0.5; AUD.m.connect(AUD.ctx.destination);
    AUD.on=true;
  }catch(e){ AUD.on=false; }
}
function tono(f, dur, vol, tipo, f2){
  if(!AUD.ctx||!AUD.on) return;
  const c=AUD.ctx, t=c.currentTime;
  const o=c.createOscillator(); o.type=tipo||'sine';
  o.frequency.setValueAtTime(f,t);
  if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(40,f2), t+dur);
  const g=c.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.linearRampToValueAtTime(vol, t+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(AUD.m); o.start(t); o.stop(t+dur+0.02);
}
/* el roce de una carta es ruido corto y filtrado, no un tono: con un oscilador suena a timbre */
function roce(dur, vol, f0, f1){
  if(!AUD.ctx||!AUD.on) return;
  const c=AUD.ctx, t=c.currentTime, n=Math.max(1,Math.floor(c.sampleRate*dur));
  const b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  const s=c.createBufferSource(); s.buffer=b;
  const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=0.8;
  bp.frequency.setValueAtTime(f0,t);
  bp.frequency.exponentialRampToValueAtTime(Math.max(60,f1||f0), t+dur);
  const g=c.createGain(); g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(bp); bp.connect(g); g.connect(AUD.m); s.start(t); s.stop(t+dur+0.02);
}
function son(k){
  if(!AUD.on) return;
  try{
    if(k==='agarra') tono(760,0.07,0.10,'sine',900);
    else if(k==='deja') tono(520,0.08,0.08,'sine',400);
    else if(k==='tira'){ roce(0.16,0.35,900,300); tono(300,0.09,0.09,'triangle',210); }
    else if(k==='roba') roce(0.14,0.28,700,1500);
    else if(k==='mal') tono(180,0.20,0.11,'sawtooth',110);
    else if(k==='salta') tono(880,0.13,0.10,'square',520);
    else if(k==='gira'){ tono(520,0.10,0.08,'square',880); setTimeout(()=>tono(880,0.10,0.08,'square',520),95); }
    else if(k==='mas'){ tono(240,0.16,0.12,'sawtooth',150); roce(0.18,0.25,500,180); }
    else if(k==='uno'){ [740,988].forEach((f,i)=>setTimeout(()=>tono(f,0.14,0.11,'square'),i*90)); }
    else if(k==='gana'){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tono(f,0.22,0.12,'square'),i*95)); }
    else if(k==='pierde'){ [392,330,262].forEach((f,i)=>setTimeout(()=>tono(f,0.26,0.11,'triangle'),i*130)); }
  }catch(e){}
}
