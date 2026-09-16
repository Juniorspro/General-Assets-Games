
/* =========================================================================================
   EL AUDIO GRABADO: dos temas y quince efectos generados, horneados en MP3 y metidos aca

   POR QUE WEBAUDIO Y NO <audio>. Con un elemento suelto, para que un efecto suene encima de si
   mismo hace falta una copia por voz —y en este juego se agarran y se sueltan cartas mas rapido que
   eso—; ademas un <audio> no pasa por el contexto, o sea que NO SE PUEDE MEDIR si sono. Es la misma
   leccion que costo una vuelta entera en Campo_de_Tiro: el analizador leia pico 0 con la musica
   supuestamente sonando. Aca todo cuelga del maestro y el pico del analizador es la prueba.

   Y LA VERSION PROCEDURAL NO SE BORRA. Si un clip no decodifica —un navegador viejo, un MP3 que no
   le gusta— suena el sintetizado de siempre. Un juego sin sonido por un decodificador es peor que un
   juego con bips.
   ========================================================================================= */
const AUDIO_B64 = @@AUDIO_B64@@;
const BUF = {};                      // nombre -> AudioBuffer ya decodificado
const MUS = { nombre:null, fuente:null, gan:null };
let audioMuestrasOn = false;

/* NIVELES DE LA MUSICA, Y ESTAN MEDIDOS. La regla es la de siempre en este proyecto: la musica tiene
   que quedar POR DEBAJO del sonido de ganar, porque ganar es la recompensa. Los dos temas salieron
   normalizados a 0,95 de pico, asi que el escalon se pone aca. */
const MUS_VOL = { mMenu:0.17, mJuego:0.13 };
const MUS_FUNDE = 0.9;               // segundos de cruce al cambiar de tema

function audioDecodificar(){
  if(audioMuestrasOn || !AUD.ctx) return;
  audioMuestrasOn = true;
  for(const k in AUDIO_B64){
    try{
      const s=atob(AUDIO_B64[k]), n=s.length, a=new Uint8Array(n);
      for(let i=0;i<n;i++) a[i]=s.charCodeAt(i);
      /* decodeAudioData VACIA el buffer que recibe: sin la copia, un segundo intento encuentra cero
         bytes. Ya paso una vez en Campo_de_Tiro. */
      AUD.ctx.decodeAudioData(a.buffer.slice(0),
        b=>{ BUF[k]=b; if(MUS.nombre===k && !MUS.fuente) musicaArrancar(k); },
        ()=>{});
    }catch(e){}
  }
}

/* toca una muestra. Devuelve false si no esta, y ahi el que llama cae al sintetizado. */
function sonMuestra(k, vol){
  const b=BUF[k];
  if(!b || !AUD.ctx || !AUD.on) return false;
  try{
    const s=AUD.ctx.createBufferSource(); s.buffer=b;
    const g=AUD.ctx.createGain(); g.gain.value=(vol==null?1:vol);
    s.connect(g); g.connect(AUD.m); s.start();
    return true;
  }catch(e){ return false; }
}

/* ===== LA MUSICA =====
   Un tema por pantalla y NO uno solo bajado de volumen: el menu y la partida son dos estados
   distintos y el jugador tiene que oir que cambio algo al empezar a jugar. Se cruzan en vez de
   cortarse, porque un corte en seco suena a error y no a transicion. */
function musicaArrancar(k){
  if(!AUD.ctx || !BUF[k]) return;
  const g=AUD.ctx.createGain(); g.gain.value=0;
  const s=AUD.ctx.createBufferSource(); s.buffer=BUF[k]; s.loop=true;
  s.connect(g); g.connect(AUD.m); s.start();
  const t=AUD.ctx.currentTime, v=MUS_VOL[k]==null?0.13:MUS_VOL[k];
  g.gain.linearRampToValueAtTime(v, t+MUS_FUNDE);
  MUS.fuente=s; MUS.gan=g;
}
function musica(k){
  if(MUS.nombre===k) return;
  MUS.nombre=k;
  if(MUS.fuente && MUS.gan){
    /* se apaga la que estaba y se la deja morir sola: parar una fuente en seco deja un click, y
       ademas hay que soltarla o queda un nodo vivo por cada cambio de pantalla */
    const s=MUS.fuente, g=MUS.gan, t=AUD.ctx.currentTime;
    try{ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t);
         g.gain.linearRampToValueAtTime(0.0001, t+MUS_FUNDE);
         s.stop(t+MUS_FUNDE+0.05); }catch(e){}
    MUS.fuente=null; MUS.gan=null;
  }
  if(k) musicaArrancar(k);
}
/* LA MUSICA SE AGACHA CUANDO PASA ALGO GRANDE. Con la musica y la fanfarria al mismo nivel, ganar
   suena a las dos cosas a la vez y no a ninguna. */
function musicaAgachar(f, seg){
  if(!MUS.gan || !AUD.ctx) return;
  const t=AUD.ctx.currentTime, v=MUS_VOL[MUS.nombre]==null?0.13:MUS_VOL[MUS.nombre];
  try{
    MUS.gan.gain.cancelScheduledValues(t);
    MUS.gan.gain.setValueAtTime(MUS.gan.gain.value, t);
    MUS.gan.gain.linearRampToValueAtTime(v*f, t+0.12);
    MUS.gan.gain.linearRampToValueAtTime(v, t+0.12+(seg||1.2));
  }catch(e){}
}
