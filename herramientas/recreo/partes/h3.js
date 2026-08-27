/* =========================================================================================
   LA VOZ DE BALDI Y LA MUSICA

   DOS ORIGENES DISTINTOS, Y NO ES INCONSISTENCIA:

   - LA VOZ ESTA GENERADA. Cinco ladridos cortos —hola, bien, mal, grito, risa— hechos con un
     text-to-speech, recortados a la rafaga util y horneados a MP3 mono de 16 kHz: diecinueve
     kilobytes los cinco. Son INTERJECCIONES a proposito, no frases: el juego habla en tres idiomas y
     una frase grabada habria que grabarla tres veces, mientras que un "eh!" y un grito se entienden
     igual en los tres. Los subtitulos siguen haciendo el trabajo del idioma.
   - LA MUSICA ES PROCEDURAL, escrita con osciladores. No por gusto: no hubo con que generarla —el
     unico modelo de musica disponible esta reservado para otro flujo y no habia llave del otro
     proveedor— asi que en vez de dejar el juego en silencio se compone. Y encima resulta lo correcto
     para este juego: pesa CERO bytes, no se corta nunca, y puede cambiar de intensidad segun el aula
     en la que estas, que un archivo suelto no puede.

   COMO SE AGENDA LA MUSICA, que es la unica parte con truco: NO va colgada del bucle de dibujo. Un
   requestAnimationFrame se atrasa, se pausa cuando el telefono se va a segundo plano y no garantiza
   nada; el reloj de AudioContext es un reloj de audio y no se mueve. Asi que un temporizador de 100
   ms mira "que notas entran en los proximos 250 ms" y las agenda con su tiempo exacto. El sonido
   nunca depende de los cuadros. Es el patron clasico de dos relojes: el de la agenda puede temblar,
   el de la reproduccion no.
   ========================================================================================= */
const VOZ_DATOS=__VOZ_JSON__;
const VOZ={};                     // nombre -> AudioBuffer, decodificado al arrancar el audio
let vozLista=false;
function vozCargar(){
  if(!AUD.ctx || vozLista) return;
  vozLista=true;
  for(const k in VOZ_DATOS){
    const b64=VOZ_DATOS[k].split(',')[1];
    if(!b64) continue;
    try{
      const bin=atob(b64), n=bin.length, u=new Uint8Array(n);
      for(let i=0;i<n;i++) u[i]=bin.charCodeAt(i);
      AUD.ctx.decodeAudioData(u.buffer, (buf)=>{ VOZ[k]=buf; }, ()=>{});
    }catch(e){}
  }
}
/* SE LLAMA hablar() Y NO voz(): `voz` ya existe y es el bip por letra del subtitulo, en h2b.js. Dos
   `function voz` en un modulo no son un aviso, son un SyntaxError que tira la pagina antes de la
   primera linea — la segunda vez en este archivo que un nombre repetido cuesta una vuelta entera.
   PARA QUE NO SE PISE CONSIGO MISMA: dos "bien" encimados suenan a coro de una persona, que es lo
   mas raro que puede sonar una voz. Si el mismo ladrido ya esta sonando, el nuevo lo reemplaza. */
const vozSonando={};
function hablar(k, vol){
  if(!AUD.ctx || !AUD.on) return;
  const buf=VOZ[k]; if(!buf) return;
  try{
    const s=vozSonando[k];
    if(s){ try{ s.stop(); }catch(e){} }
    const src=AUD.ctx.createBufferSource(); src.buffer=buf;
    const g=AUD.ctx.createGain(); g.gain.value=(vol==null?1:vol);
    src.connect(g); g.connect(AUD.m);
    src.start(); vozSonando[k]=src;
    src.onended=()=>{ if(vozSonando[k]===src) vozSonando[k]=null; };
  }catch(e){}
}

/* ===================== LA MUSICA ===================== */
/* Cuatro compases en la menor con el ultimo acorde tenso: Am - F - G - E. El E mayor sobre una
   escala menor es lo que hace que el loop no se cierre nunca del todo, o sea que suene a "todavia
   falta algo" — que es exactamente el clima de una escuela en la que algo va a pasar. */
const MUS_BPM=92;
const MUS_BAJO=[[110.00,0],[87.31,1],[98.00,2],[82.41,3]];     // A2 F2 G2 E2, un acorde por compas
const MUS_ACORDE=[[220.0,261.6,329.6],[174.6,220.0,261.6],
                  [196.0,246.9,293.7],[164.8,207.7,246.9]];
/* la melodia va en grados de la escala y no en frecuencias: asi la misma linea sirve sobre los
   cuatro acordes sin escribirla cuatro veces */
const MUS_MEL=[0,2,4,2, 7,4,2,0, 0,4,7,4, 2,0,-1,0];
const MUS_ESC=[220.0,246.9,261.6,293.7,329.6,349.2,392.0,440.0,493.9];
const MUS={ on:false, paso:0, prox:0, timer:null, gan:null, pad:null, nivel:0, ducking:1,
            nBajar:0, nParar:0, nNotas:0 };
/* UNA NOTA PUEDE DECAER O SOSTENER, Y LA DIFERENCIA ERA TODO EL PROBLEMA.
   La primera version tenia un solo sobre: subir y despues caer exponencialmente hasta cero a lo
   largo de toda la duracion. Con eso una nota "sostenida" de un segundo pasa el 80% de ese segundo
   casi en silencio, porque una exponencial baja rapido al principio. Medido con audioVentana: el
   96% de las muestras del nivel 0 salian MUDAS. Una cama de fondo que esta callada el 96% del tiempo
   no es una cama tenue, es silencio con un bip cada tanto.
   Con `sostener`, la nota sube, SE QUEDA en su nivel, y recien suelta al final. */
function musNota(f, t, dur, vol, tipo, ataque, sostener){
  if(!AUD.ctx) return;
  const c=AUD.ctx;
  const o=c.createOscillator(); o.type=tipo||'triangle'; o.frequency.setValueAtTime(f,t);
  const g=c.createGain();
  const at=Math.min(ataque||0.008, dur*0.4);
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol,t+at);
  if(sostener){
    const suelta=Math.min(0.28, dur*0.45);
    g.gain.setValueAtTime(vol, t+dur-suelta);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  }
  o.connect(g); g.connect(MUS.gan||AUD.m); o.start(t); o.stop(t+dur+0.02); MUS.nNotas++;
}
/* =========================================================================================
   EL COLCHON, QUE SUENA SIEMPRE
   Tres osciladores por un pasabajos, creados UNA vez y encendidos para todo el juego; lo unico que
   cambia es su afinacion, que sigue al acorde del compas. Es lo que hace que la musica sea una cama
   y no una sucesion de notas: entre nota y nota siempre hay algo sonando.
   Y son tres osciladores para el juego entero, no tres por compas: encender y apagar osciladores 90
   veces por minuto es basura para el recolector y clicks en los bordes.
   ========================================================================================= */
function padArmar(){
  const c=AUD.ctx;
  const fil=c.createBiquadFilter(); fil.type='lowpass'; fil.frequency.value=540; fil.Q.value=0.7;
  const gan=c.createGain(); gan.gain.value=0.075;
  fil.connect(gan); gan.connect(MUS.gan);
  const osc=[];
  for(const [d,v] of [[1,1.0],[1.5,0.45],[2,0.30]]){       // raiz, quinta, octava
    const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=110*d;
    const g=c.createGain(); g.gain.value=v;
    o.connect(g); g.connect(fil); o.start();
    osc.push({o,d});
  }
  MUS.pad={ osc, fil, gan };
}
function padAfinar(base, t){
  if(!MUS.pad) return;
  for(const {o,d} of MUS.pad.osc){
    /* setTargetAtTime y no setValueAtTime: un salto de frecuencia en un sawtooth sostenido hace un
       click, y un glissando de 120 ms se lee como que el acorde "gira" */
    o.frequency.setTargetAtTime(base*d, t, 0.12);
  }
}
function musGolpe(t, vol){
  if(!AUD.ctx) return;
  const c=AUD.ctx, dur=0.045, n=Math.floor(c.sampleRate*dur);
  const b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const s=c.createBufferSource(); s.buffer=b;
  const f=c.createBiquadFilter(); f.type='highpass'; f.frequency.value=5200;
  const g=c.createGain(); g.gain.value=vol;
  s.connect(f); f.connect(g); g.connect(MUS.gan||AUD.m); s.start(t);
}
/* agenda todo lo que entra en la ventana de adelanto.
   LO QUE SUENA EN CADA NIVEL, Y POR QUE EL NIVEL 0 NO ES "CASI NADA":
   la primera version dejaba en el nivel 0 solamente el bajo en los pasos 0 y 4, o sea DOS notas por
   compas de 2,6 segundos — medido con el contador de notas, UNA nota agendada en tres segundos de
   juego y el analizador leyendo cero casi todo el tiempo. Eso no es una musica tenue: es silencio con
   un bip. El nivel 0 ya tiene que ser una musica completa y tranquila, y los niveles siguientes
   AGREGAN capas sobre ella, no la vuelven audible. */
function musAgendar(){
  if(!MUS.on || !AUD.ctx) return;
  const c=AUD.ctx;
  const semi=60/MUS_BPM/2;                       // duracion de una corchea
  if(MUS.prox < c.currentTime) MUS.prox = c.currentTime + 0.06;
  while(MUS.prox < c.currentTime + 0.30){
    const p=MUS.paso, t=MUS.prox;
    const compas=(p>>3)&3, dentro=p&7;
    const ac=MUS_ACORDE[compas];
    /* EL BAJO, en las cuatro negras del compas: es el pulso, y un pulso que aparece dos veces por
       compas no es un pulso, es un aviso */
    if((dentro&1)===0) musNota(MUS_BAJO[compas][0], t, semi*1.5, 0.100, 'square', 0.010);
    /* EL ACORDE SOSTENIDO, desde el nivel 0: es lo que hace que haya musica y no percusion. Dura
       cuatro corcheas y entra suave, asi que las tres notas se leen como un colchon y no como un
       golpe de organo. */
    if(dentro===0 || dentro===4)
      for(let k=0;k<ac.length;k++) musNota(ac[k], t, semi*3.6, 0.026, 'triangle', 0.120, true);
    /* el colchon se reafina al empezar cada compas */
    if(dentro===0) padAfinar(MUS_BAJO[compas][0], t);
    /* la melodia desde el aula 3 */
    if(MUS.nivel>=1 && (p&1)===0){
      const g=MUS_MEL[(p>>1)&15];
      if(g!=null){
        const f=MUS_ESC[Math.max(0, Math.min(MUS_ESC.length-1, g+1))];
        musNota(f, t, semi*0.95, 0.048, 'triangle', 0.006);
      }
    }
    /* el charles en las corcheas impares desde el aula 5: aprieta el pulso sin subir el volumen */
    if(MUS.nivel>=2 && (dentro&1)===1) musGolpe(t, 0.034);
    /* y desde el aula 7 una quinta abajo del bajo: la nota que hace que suene amenazante */
    if(MUS.nivel>=3 && dentro===0) musNota(MUS_BAJO[compas][0]*0.5, t, semi*3.2, 0.062, 'sawtooth', 0.030);
    MUS.prox += semi;
    MUS.paso = (MUS.paso+1) & 31;
  }
}
function musicaEmpezar(){
  if(!AUD.ctx || MUS.on) return;
  if(!MUS.gan){ MUS.gan=AUD.ctx.createGain(); MUS.gan.gain.value=0; MUS.gan.connect(AUD.m); }
  if(!MUS.pad) padArmar();
  MUS.on=true; MUS.paso=0; MUS.prox=AUD.ctx.currentTime+0.1;
  /* ENTRA CON RAMPA LINEAL Y NO EXPONENCIAL, y no es cosmetica: una rampa exponencial no puede pasar
     por cero, asi que hay que arrancarla en un valor chiquito como 0,0001 — y medido en este
     navegador la rampa quedaba congelada a mitad de camino, en 0,0049, o sea la musica agendandose y
     sonando a la milesima parte de su volumen: `on:true`, `paso` avanzando, y el analizador leyendo
     cero. La lineal arranca en 0 de verdad y no tiene ese borde. */
  const t0=AUD.ctx.currentTime;
  MUS.gan.gain.cancelScheduledValues(t0);
  MUS.gan.gain.setValueAtTime(0, t0);
  MUS.gan.gain.linearRampToValueAtTime(1, t0+1.6);
  if(MUS.timer) clearInterval(MUS.timer);
  MUS.timer=setInterval(musAgendar, 100);
  musAgendar();
}
function musicaParar(seg){
  if(!AUD.ctx || !MUS.on) return;
  MUS.nParar++;
  const t=AUD.ctx.currentTime, d=seg==null? 0.6 : seg;
  if(MUS.gan){
    MUS.gan.gain.cancelScheduledValues(t);
    MUS.gan.gain.setValueAtTime(MUS.gan.gain.value, t);
    MUS.gan.gain.linearRampToValueAtTime(0, t+d);
  }
  MUS.on=false;
  if(MUS.timer){ clearInterval(MUS.timer); MUS.timer=null; }
}
/* LA MUSICA SE AGACHA CUANDO EL HABLA O GRITA. Sin esto, el grito —que es el sonido mas fuerte del
   juego— compite con una musica que sigue a su volumen y el susto se diluye. */
function musicaBajar(f, seg){
  if(!AUD.ctx || !MUS.gan) return;
  MUS.nBajar++;
  const t=AUD.ctx.currentTime;
  MUS.gan.gain.cancelScheduledValues(t);
  MUS.gan.gain.setValueAtTime(MUS.gan.gain.value, t);
  MUS.gan.gain.linearRampToValueAtTime(Math.max(0, f), t+0.08);
  if(seg>0) MUS.gan.gain.linearRampToValueAtTime(1, t+0.08+seg);
}
/* el nivel sube con el aula: mismo tema, mas voces. Cuatro escalones en ocho aulas. */
function musicaNivel(n){ MUS.nivel=Math.max(0, Math.min(3, n)); }
