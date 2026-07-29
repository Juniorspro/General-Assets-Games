/* ============================================================
   SUX SANDBOX — AUDIO REAL (68 efectos + música de menú, generados)
   ------------------------------------------------------------
   Hasta acá todo el sonido era sintetizado con osciladores (SFX de core_b). Este módulo
   trae los archivos generados (assets/hyper/snd/*.mp3 + mus-menu.m4a) y:
     1. REEMPLAZA cada SFX.* por su grabación — con el sintetizador de RESPALDO: si un
        buffer no cargó (sin red, códec que falta), suena el beep de siempre. Nada se rompe.
     2. Suma sonidos que antes no existían: pasos por material real, saltar/caer, nadar,
        impactos de props por material (madera/metal/plástico/vidrio) y de balas (rebote/
        hormigón), daño/muerte, spawn/borrar, sentarse, chat, clicks de menú, pirotecnia
        completa (mecha/despegue/estallido/rueda/fuente/petardo, por evento real via FWEV),
        motor del auto (o de la moto) al subir y andando, bocina, frenada, choque, ambiente
        de mapa (viento + pájaros en pasto), y música tranquila en el menú.
     3. Corrige mapeos que sonaban "a cualquier cosa": physgun/toolgun ya no caen al
        fallback de pistola, los pasos ya no son siempre pasto, etc. (ver cada sección).
     4. Volumen en Ajustes (SV.vol) sobre el gain maestro MG que ya existía.
   Reglas de la casa: los enganches son WRAPS de funciones ya declaradas (se concatena
   último, así que puede pisar cualquier declaración), todo dentro de nsafe, y los sonidos
   del mundo se atenúan por distancia a la cámara. Nada de esto está en el camino crítico:
   el juego arranca igual aunque no cargue ni un archivo.
   ============================================================ */

/* ---------- catálogo ---------- */
const SND={
  'shot-pistol':1,'shot-revolver':1,'shot-shotgun':1,'shot-smg':1,'shot-akm':1,
  'shot-sniper':1,'shot-rpg':1,'shot-crossbow':1,'bat-swing':1,'bat-hit':1,
  reload:1,empty:1,'phys-hum':1,grab:1,toolgun:1,
  boom:1,'fw-launch':1,'fw-burst':1,'fw-crackle':1,'fw-fountain':1,'fw-fuse':1,
  'fw-wheel':1,'fw-bang':1,
  'step-grass':1,'step-concrete':1,jump:1,land:1,splash:1,hurt:1,
  'imp-wood':1,'imp-metal':1,'imp-plastic':1,glass:1,spawn:1,trash:1,freeze:1,pop:1,weld:1,
  'eng-start':1,'eng-loop':1,horn:1,skid:1,crash:1,
  ui:1,menu:1,chat:1,sit:1,
  /* nuevos: disparos que no eran pistola/pistola, pasos por piso real, nadar, daño/muerte,
     rebotes de bala, pirotecnia ampliada (por evento), moto y ambiente de mapa */
  'fw-whistle':1,'fw-boomfar':1,'fw-finale':1,'fw-sparkle':1,'fw-thump':1,'fw-candle':1,
  'fw-bigburst':1,'fw-wheel2':1,'phys-shot':1,'tool-ok':1,'crossbow-load':1,ricochet:1,
  'imp-concrete':1,swim:1,hurt2:1,death:1,'amb-wind':1,'amb-birds':1,'eng-moto':1,
  'step-metal':1,'step-wood':1};
const SNDMUS='mus-menu';                       /* .m4a (AAC): los celulares lo decodifican */
const BUF={};let sndPend=0,sndDone=0,sndFail=0,sndOn=false;
let lastSnd='',sndPlays=0;
/* historial corto de reproducciones, SÓLO en DEV: lastSnd es un escalar y varios sonidos
   pueden dispararse en el mismo tick del juego (p.ej. el estallido de un cohete y el 'trash'
   de borrar el prop se llaman uno atrás del otro, sin ceder el hilo) — un test de afuera que
   sondea sndInfo().last a intervalos SIEMPRE puede perderse el que quedó pisado en el medio,
   por más seguido que sondee. Con el historial no hace falta adivinar el timing. */
const sndHistArr=[];
/* nombre de la grabación que sonó por el ARMA en el último SFX.shot(). Va aparte de lastSnd
   porque SFX.shot toca dos cosas seguidas: el disparo y, si la bala pega en algo a menos de
   60 m, el impacto ('imp-concrete'/'ricochet') — que deja lastSnd apuntando al impacto.
   Un test que preguntaba por lastSnd veía 'imp-concrete' en las 8 armas de fuego y parecía que
   el arma sonaba mal cuando lo que estaba mal era la medición; y el resultado dependía de si
   había una pared enfrente, así que el test pasaba o fallaba según dónde hubiera spawneado. */
let lastShotSnd='';

function sndLoad(){
  if(sndOn||!okUrl(BASE))return;sndOn=true;
  const names=Object.keys(SND).concat([SNDMUS]);
  let i=0;
  const next=()=>{
    if(i>=names.length)return;
    const n=names[i++];
    const f=n===SNDMUS?n+'.m4a':n+'.mp3';
    sndPend++;
    fetch(BASE+'snd/'+f).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer();})
      .then(ab=>{const a=ac();if(!a)throw 0;
        return new Promise((res,rej)=>a.decodeAudioData(ab,res,rej));})
      .then(b=>{BUF[n]=b;sndDone++;next();})
      .catch(()=>{sndFail++;sndDone++;next();});
  };
  /* de a 4 en paralelo: ~2 MB en total, no pelea con las texturas (ya cargaron) */
  for(let k=0;k<4;k++)next();
}

/* ---------- recorte sin re-encodear (SOFF / SLEN) ----------
   El modelo que generó estos archivos (mirelo) mete SILENCIO ANTES del sonido, y no
   siempre el mismo: medido sobre la envolvente de cada archivo, el golpe llegaba a los
   0.638 s en la AKM, a los 1.111 s en el shotgun, a los 0.987 s en bat-hit... El efecto
   en el juego es que el disparo se escucha TARDE y se siente flojo, desacoplado del
   click y del fogonazo.
   No hace falta tocar los .mp3 ni re-encodear nada: AudioBufferSourceNode.start acepta
   un offset DENTRO del buffer como segundo argumento y un largo como tercero, así que
   src.start(0, off, len) arranca directo en el golpe y descarta la cola de más. El
   archivo queda igual (mismo nombre, mismo HASH de CDN), el recorte es en reproducción.
     SOFF = segundos a saltear al principio (arranque del golpe menos ~20 ms de aire).
     SLEN = segundos a reproducir (sólo donde hay basura después de la cola útil).
   Los offsets salieron de medir la envolvente de cada archivo, no a ojo: está
   automatizado en sndcheck.js, que vuelve a medir y falla si algo se desalinea.
   OJO: los sonidos en bucle (amb-*, eng-*, phys-hum, fw-fountain, fw-wheel2) van por
   sLoop y quedan A PROPÓSITO fuera de la tabla: recortarles el arranque no sirve de nada
   (el bucle vuelve a 0 igual) y de paso rompe el empalme. */
const SOFF={
  'fw-crackle':1.624,'tool-switch':1.317,'imp-plastic':1.257,empty:1.237,'mp-leave':1.200,
  'shot-shotgun':1.086,'bat-hit':0.987,equip:0.950,pop:0.945,glass:0.926,'wood-break':0.863,'tool-ok':0.828,save:0.780,
  'imp-concrete':0.753,trash:0.644,'step-wood':0.593,'bat-swing':0.553,'step-metal':0.456,
  'shot-crossbow':0.453,'imp-wood':0.404,'fw-finale':0.381,ui:0.320,'fw-whistle':0.305,
  'fw-launch':0.267,'fw-fuse':0.241,'fw-sparkle':0.226,land:0.200,'shot-revolver':0.161,
  'shot-smg':0.150,ricochet:0.113,spawn:0.100,'phys-shot':0.094,'shot-akm':0.057};
/* Largo a reproducir, donde el archivo trae basura DESPUÉS de la cola útil:
     shot-smg     el modelo entregó una ráfaga; con esta ventana queda UN solo tiro
     shot-shotgun después del retumbe vuelve a subir ruido que no es parte del disparo
     shot-sniper  el eco útil dura ~1 s y después aparecen golpes sueltos que sonaban
                  a segundo disparo (era justo el problema del sniper) */
/* Las 13 entradas nuevas son las tomas REEMPLAZADAS (ver el bloque de la mezcla): el modelo
   entrega 1.5-2 s y el evento útil dura entre 0.19 s y 0.70 s. Cerrar la ventana justo en el
   evento es lo que hace que se sienta SECO — sobre todo el salto, que es la queja del usuario:
   0.35 s, cortado con el fundido de SFADE, sin la cola de tela/habitación del archivo.
   OJO: nada de comentarios ADENTRO del literal — sndcheck.js parsea esta tabla con una regex
   y un "texto: 0.35" en un comentario le entra como si fuera una clave. */
const SLEN={'shot-smg':0.28,'shot-shotgun':0.52,'shot-sniper':1.10,
  jump:0.35,land:0.66,'fall-hard':0.60,'imp-wood':0.28,save:0.45,spawn:0.60,equip:0.35,
  'tool-ok':0.45,'tool-switch':0.19,empty:0.25,'mp-leave':0.30,'wood-break':0.50,
  'imp-plastic':0.25};
/* ---------- archivos que el generador NUNCA entregó (alias documentado) ----------
   'fw-candle' salió MUDO en 3 tomas seguidas (ruido plano a -47 dBFS, sin evento: pico
   -30 dBFS con 1.9 dB de contraste, o sea nada). En vez de dejar un sonido que no suena o
   amplificar x200 un ruido plano, la vela romana usa el 'fw-thump' (el golpe de la carga
   que lanza la estrella, que es exactamente eso) sonando más agudo. Es una decisión de
   MEZCLA, está acá y no escondida en el llamador: FWEV sigue pidiendo 'fw-candle'. */
const SALIAS={'fw-candle':{n:'fw-thump',rate:1.35}};
/* Al cortar con SLEN el archivo puede quedar sonando fuerte justo en el corte (el
   shotgun queda al ~18% del pico), y un corte seco ahí CLICKEA. Se apaga con una
   rampa corta de gain: SFADE segundos de fundido al final de la ventana. */
const SFADE=.04;

/* ============================================================
   MEZCLA PAREJA — normalización MEDIDA (SLOUD/SGAIN) + limitador
   ------------------------------------------------------------
   QUEJA: "hay armas y cosas que suenan menos que otras y se siente fea la experiencia".
   CAUSA MEDIDA: cada sPlay traía un `vol` puesto a ojo, y los archivos que entregó el
   modelo tienen loudness dispares de verdad — midiendo la ventana que REALMENTE suena
   (respetando SOFF/SLEN) el rango iba de -6 dBFS (phys-hum) a -64 dBFS: 58 dB de
   diferencia entre archivos. Y 12 de los 86 estaban directamente MUDOS (pico por debajo de
   -40 dBFS y sin ningún evento: ruido plano) — o sea que había acciones del juego que no
   sonaban nada, no que sonaban poco. Ningún `vol` a mano arregla eso, porque el vol del
   jugador y la distancia lo multiplican todo por igual.
   PARTE 1 DEL ARREGLO: se reemplazaron 13 archivos por tomas nuevas medidas (los 12 mudos
   + el 'jump', que era un whoosh de ropa de 1 s en vez de un salto).
   PARTE 2, acá: normalización medida.
   SOLUCIÓN: se mide el archivo YA DECODIFICADO por el navegador (no el waveform del
   proveedor, que es una envolvente normalizada y no dice nada de nivel absoluto), se le
   asigna una CATEGORÍA y se calcula un factor que lo lleve al objetivo de su categoría.
   El factor se aplica adentro de sPlay/sLoop, así que los `vol` de todos los llamadores
   siguen valiendo lo que siempre quisieron decir: énfasis RELATIVO del evento (más fuerte
   el impacto violento que el suave), no compensación de archivo.
   MÉTRICA (medida, no elegida a ojo — se probaron las tres):
     · RMS de TODA la ventana: no sirve para one-shots. Un disparo con 1 s de eco mide
       bajísimo aunque el golpe sea brutal, y normalizar por eso te revienta el eco.
     · RMS máximo de una ventana corrida de 300 ms: mejor, pero subestima los clicks. El
       'ui' (un tic de 5 ms) daba -31 dBFS con pico -3.8: 28 dB de factor de cresta. Para
       llevarlo al objetivo hacía falta x4.7 y el pico se iba a +1 dBFS — el tope de pico
       lo frenaba y el click quedaba 10 dB por debajo de su categoría.
     · LA QUE QUEDÓ: RMS máximo de 100 ms, con el factor de cresta ACOTADO a 12 dB, o sea
       L = max(rms100, pico/4). Un transitorio se percibe más fuerte de lo que dice su RMS,
       y de paso el acote garantiza que el pico normalizado nunca pase de objetivo+12 dB
       (con los objetivos de acá, ≤ -1 dBFS): la normalización NO PUEDE clipear sola.
   ============================================================ */
const SLOUD={};                                /* caché nombre -> medición del buffer */
/* los que suenan por sLoop se miden ENTEROS: SOFF/SLEN no les aplica (el bucle vuelve a 0) */
const SLOOPN=/^(amb-|eng-|mus-|phys-hum$|fw-fountain$|fw-wheel2$|fw-fuse-long$|prop-roll$|metal-scrape$)/;
/* categoría por nombre: reglas EN ORDEN, gana la primera que engancha. Es por regex y no
   una tabla nombre a nombre para que un archivo nuevo caiga solo en su familia. */
const SCATR=[
  [/^(shot-shotgun|shot-sniper|shot-rpg|boom|fw-bang|fw-bigburst)$/,'armaG'],
  [/^(shot-|bat-|reload$|empty$|crossbow-load$|phys-shot$|tool-ok$|toolgun$|weld$)/,'armaC'],
  [/^(imp-|glass$|ricochet$|wood-break$|crash$|pop$|splash$|water-exit$)/,'impacto'],
  [/^(step-|jump$|land$|fall-hard$|swim$|wade$|breath-hard$|suspension$)/,'cuerpo'],
  [/^(hurt|death$)/,'voz'],
  [/^fw-/,'fw'],
  /* phys-hum es una MÁQUINA (el zumbido de la physgun), no ambiente de mapa: va con el
     motor, si no quedaba 6 dB por debajo de donde tiene que estar */
  [/^(eng-|horn$|skid$|car-door$|prop-roll$|metal-scrape$|phys-hum$)/,'motor'],
  [/^mus-/,'mus'],
  [/^amb-/,'amb'],
];
function sCat(n){ for(const r of SCATR)if(r[0].test(n))return r[1]; return 'ui'; }
/* OBJETIVOS por categoría, en dBFS de la métrica de arriba. Son decisión de MEZCLA y el
   escalonado es a propósito (todo al mismo número sería una mezcla plana y fea):
     armaG  -13: las armas grandes PEGAN 6 dB más que las chicas — es lo que el jugador
            espera del sniper/rpg/escopeta y era justo lo que se sentía flojo.
     amb/mus muy abajo: son cama, no evento.
   PASO 2 DE LA MEZCLA (medido): con la primera pasada armaG quedó apenas 4 dB sobre armaC
   y el sniper/rpg/escopeta seguían sin destacarse. Subir armaG NO se puede: a -13 dBFS de
   loudness el pico de fw-bang ya queda en -1.0 dBFS y con el objetivo más alto el tope de
   pico le comería el objetivo. Así que se bajaron 2 dB TODAS las demás categorías, que da
   lo mismo en relación de fuerzas y deja 2 dB más de aire arriba. Los 2 dB de nivel
   absoluto los recupera de sobra SV.vol (arranca en 0.5, o sea 6 dB de margen).
   El nivel absoluto de todo esto lo sigue mandando SV.vol sobre MG. */
const STGT={armaG:-13,armaC:-19,impacto:-20,cuerpo:-21,voz:-19,fw:-18,motor:-21,
  amb:-26,mus:-22,ui:-21};
const SGAIN={};                                /* nombre -> factor (se llena al medir) */
/* Piso y techo del factor. El techo es alto A PROPÓSITO: hay archivos que el modelo
   entregó a -60 dBFS y necesitan x100 para existir. Amplificar un mp3 no revela un piso
   de ruido absoluto (el ruido del mp3 es relativo a la señal, así que la relación
   señal/ruido no cambia al escalar), y el acote de cresta de arriba impide que el pico se
   vaya de rango. Lo que un techo bajo SÍ hacía era dejar 12 archivos inaudibles. */
const SGCLAMP=[.1,200];
const SCREST=12;                               /* dB de cresta máximos que se le reconocen */

/* ventana que se mide = la que se escucha (o el archivo entero si va en bucle) */
function sWin(name){
  const b=BUF[name];if(!b)return null;
  if(SLOOPN.test(name))return {off:0,len:b.duration};
  const off=Math.min(SOFF[name]||0,Math.max(0,b.duration-.02));
  let len=Math.min(SLEN[name]||0,b.duration-off);
  if(len<=0)len=b.duration-off;
  return {off,len};
}
function sMeasure(name){
  if(SLOUD[name])return SLOUD[name];
  const b=BUF[name];if(!b)return null;
  const w=sWin(name),sr=b.sampleRate;
  const i0=Math.max(0,Math.floor(w.off*sr)),i1=Math.min(b.length,i0+Math.ceil(w.len*sr));
  const n=i1-i0;
  if(n<256)return SLOUD[name]={rms:0,pk:0,L:0,rms_db:-99,pk_db:-99,loud_db:-99,
    cat:sCat(name),n:0};
  /* mezcla a mono: lo que llega al parlante es la suma de canales, no un canal suelto */
  const ch=b.numberOfChannels,m=new Float64Array(n);
  for(let c=0;c<ch;c++){const d=b.getChannelData(c);
    for(let i=0;i<n;i++)m[i]+=d[i0+i]/ch;}
  let pk=0;for(let i=0;i<n;i++){const a=m[i]<0?-m[i]:m[i];if(a>pk)pk=a;}
  const W=Math.min(n,Math.max(512,Math.round(.1*sr)));
  let acc=0;for(let i=0;i<W;i++)acc+=m[i]*m[i];
  let best=acc;
  for(let i=W;i<n;i++){acc+=m[i]*m[i]-m[i-W]*m[i-W];if(acc>best)best=acc;}
  const rms=Math.sqrt(Math.max(0,best)/W);
  /* cresta acotada: lo que se percibe de un transitorio corto está más cerca del pico que
     de su RMS (ver el bloque de arriba) */
  const L=Math.max(rms,pk/Math.pow(10,SCREST/20));
  const db=v=>v>1e-7?20*Math.log10(v):-99;
  return SLOUD[name]={rms,pk,L,rms_db:+db(rms).toFixed(2),pk_db:+db(pk).toFixed(2),
    loud_db:+db(L).toFixed(2),cat:sCat(name),n};
}
function sGain(name){
  if(SGAIN[name]!=null)return SGAIN[name];
  const m=sMeasure(name);
  if(!m||m.L<=0)return 1;                      /* sin medir todavía: no se cachea el 1 */
  const t=STGT[m.cat]==null?-19:STGT[m.cat];
  let g=Math.pow(10,(t-m.loud_db)/20);
  g=Math.min(SGCLAMP[1],Math.max(SGCLAMP[0],g));
  /* red de seguridad final: que el archivo SOLO no llegue a 0 dBFS de pico antes de vol y
     de MG. Con el acote de cresta esto no debería activarse nunca (el pico queda en
     objetivo+12 = -1 dBFS como peor caso); está para que un archivo raro no lo rompa. */
  if(m.pk*g>.891)g=.891/m.pk;
  return SGAIN[name]=+g.toFixed(4);
}

/* ---------- limitador (DynamicsCompressorNode entre MG y destination) ----------
   Con los factores de arriba varios sonidos suben, y en un estallido de pirotecnia con
   props cayendo se suman 6 u 8 fuentes: la suma se pasa de 1.0 y el navegador recorta a
   lo bruto (distorsión sucia). Un compresor con ratio alto y ataque de 4 ms hace de
   limitador: agarra sólo los picos de la SUMA y deja intacto lo demás. */
let SCOMP=null,SSHP=null,SANA=null,SABUF=null,sPkMax=0,sClip=0;
function compInit(){
  if(SCOMP||!AC||!MG)return;
  nsafe(()=>{
    const a=AC;
    SCOMP=a.createDynamicsCompressor();
    SCOMP.threshold.value=-8;SCOMP.knee.value=6;SCOMP.ratio.value=12;
    SCOMP.attack.value=.003;SCOMP.release.value=.25;
    /* El compresor SOLO no alcanza: medido con 12 sonidos fuertes juntos y el volumen al
       máximo, su salida llegaba a 1.076 (+0.63 dBFS) — 8 frames clipeando, porque con
       ataque de 3 ms el primer transitorio de la suma se le escapa. Se le encadena un
       WaveShaper con curva de saturación SUAVE: unidad hasta 0.7 (o sea, no toca nada de
       lo normal) y de ahí una tangente hiperbólica que satura en 0.99. Como el spec de
       WaveShaper acota la entrada a [-1,1] antes de mirar la curva, cualquier cosa por
       encima de 1 cae en el último punto de la curva: el techo queda GARANTIZADO por
       construcción, no por confianza en el compresor. */
    SSHP=a.createWaveShaper();
    const N=4097,c=new Float32Array(N),K=.7;
    for(let i=0;i<N;i++){
      const x=i/(N-1)*2-1,ax=Math.abs(x),s=x<0?-1:1;
      /* continua y con derivada 1 en ax=K, techo K+(1-K)*tanh(1)=0.929 en ax=1 */
      c[i]=ax<=K?x:s*(K+(1-K)*Math.tanh((ax-K)/(1-K)));
    }
    SSHP.curve=c;SSHP.oversample='2x';        /* 2x: menos alias cuando de verdad satura */
    /* core_b conecta MG directo a destination y NADA más sale de MG, así que cortar sus
       conexiones y re-enrutar es seguro: todo (grabaciones y el sintetizador de respaldo)
       pasa por MG y por lo tanto por el limitador. */
    try{MG.disconnect();}catch(e){}
    MG.connect(SCOMP);SCOMP.connect(SSHP);SSHP.connect(a.destination);
    /* medidor de pico en el ÚLTIMO nodo antes de destination: es la única forma de
       verificar de verdad que nada clipea (el analyser no necesita ir a destination) */
    SANA=a.createAnalyser();SANA.fftSize=2048;SANA.smoothingTimeConstant=0;
    SSHP.connect(SANA);SABUF=new Float32Array(SANA.fftSize);
  },'comp');
}
function compWatch(){                          /* sólo en DEV: 2048 floats por frame */
  if(!SANA||!SABUF)return;
  SANA.getFloatTimeDomainData(SABUF);
  let m=0;for(let i=0;i<SABUF.length;i++){const a=SABUF[i]<0?-SABUF[i]:SABUF[i];if(a>m)m=a;}
  if(m>sPkMax)sPkMax=m;
  if(m>=.999)sClip++;
}
/* pre-medición por tandas: medir un buffer es una pasada de ~50k muestras, imperceptible,
   pero hacerlo en el primer sPlay del sonido sería un hipo justo cuando suena. Se adelanta
   de a 4 por frame y sólo cuando aparecieron buffers nuevos (comparación de enteros). */
let _sWn=-1;
function loudWarm(){
  const k=Object.keys(BUF);
  if(k.length===_sWn)return;
  let budget=4;
  for(const n of k){ if(SLOUD[n])continue; sMeasure(n);sGain(n); if(--budget<=0)return; }
  _sWn=k.length;
}

/* ---------- reproducir ---------- */
const _sv=new THREE.Vector3();
function sPlay(name,o){
  o=o||{};
  /* alias (ver SALIAS): el llamador pide el sonido que quiere, acá se resuelve QUÉ archivo
     suena. Todo lo que sigue usa 'key' (buffer, SOFF/SLEN, factor de mezcla); lastSnd y el
     historial siguen guardando el nombre PEDIDO, así los tests no dependen del alias. */
  const al=SALIAS[name],key=al?al.n:name;
  const a=ac(),b=BUF[key];
  if(!a||!b)return false;
  /* el vol del llamador es ÉNFASIS del evento; el nivel del archivo lo pone sGain (ver
     la sección de mezcla arriba). o.raw:true saltea la normalización, para poder medir. */
  let vol=(o.vol==null?1:o.vol)*(o.raw?1:sGain(key));
  if(o.at){ _sv.set(o.at.x!==undefined?o.at.x:o.at[0],
                    o.at.y!==undefined?o.at.y:o.at[1],
                    o.at.z!==undefined?o.at.z:o.at[2]);
    const d=camera.position.distanceTo(_sv);
    vol*=1/(1+d/9);
    /* corte de inaudibles: bajó de .02 a .006 porque ahora vol ya trae el factor de
       normalización adentro y a los que se les bajó (factor 0.3) el umbral viejo les
       comía sonidos a 30 m que ANTES sí se escuchaban */
    if(vol<.006)return false; }
  const src=a.createBufferSource();src.buffer=b;
  src.playbackRate.value=(o.rate||1)*(al&&al.rate?al.rate:1)*(o.jit===false?1:.94+Math.random()*.12);
  const g=a.createGain();g.gain.value=vol;
  src.connect(g);g.connect(MG);
  /* saltea el silencio inicial del archivo (y corta la basura del final si hace falta).
     Si el offset se pasara del largo del buffer, start() tiraría; se acota por las dudas. */
  const off=Math.min(SOFF[key]||0,Math.max(0,b.duration-.02));
  const len=Math.min(SLEN[key]||0,b.duration-off);
  if(len>0){
    /* el 3er argumento de start() está en segundos DE BUFFER: en tiempo real el tramo
       dura len/rate, así que el fundido se agenda con la velocidad ya aplicada */
    const real=len/(src.playbackRate.value||1),t0=a.currentTime,fd=Math.min(SFADE,real/2);
    src.start(0,off,len);
    g.gain.setValueAtTime(vol,t0+real-fd);
    g.gain.linearRampToValueAtTime(0,t0+real);
  }else src.start(0,off);
  lastSnd=name;sndPlays++;
  if(DEV){sndHistArr.push(name);if(sndHistArr.length>60)sndHistArr.shift();}
  return true;
}
/* bucle con dueño: arranca una vez y se corta cuando la condición muere */
function sLoop(name,vol){
  const a=ac(),b=BUF[name];
  if(!a||!b)return null;
  const src=a.createBufferSource();src.buffer=b;src.loop=true;
  /* mismo criterio que sPlay: el vol del llamador es énfasis, el nivel del archivo lo
     pone sGain. OJO: set(v) también tiene que multiplicar por gg — los llamadores lo usan
     por frame (motor con la velocidad, barril rodando) y si no, el bucle se saldría de la
     mezcla en cuanto alguien mueve el volumen. */
  const gg=sGain(name);
  const g=a.createGain();g.gain.value=(vol==null?1:vol)*gg;
  src.connect(g);g.connect(MG);src.start();
  return {src,g,gain:gg,stop(){try{src.stop();}catch(e){}},set(v){g.gain.value=v*gg;},
    rate(r){src.playbackRate.value=r;}};
}
/* apaga un bucle con fundido (usado por música y ambiente al salir del contexto) */
function fadeOut(l){
  if(!l||!AC)return;
  l.g.gain.setTargetAtTime(0,AC.currentTime,.4);
  setTimeout(()=>{try{l.stop();}catch(e){}},1400);
}

/* ---------- material dominante (compartido: impactos de props, pasos, rebotes) ---------- */
function propMatSet(def){
  const ms={};for(const q of def.parts)ms[q.m||'metal']=1;
  return ms;
}
function impName(def){
  const ms=propMatSet(def);
  if(ms.glass)return 'glass';
  if(ms.wood||ms.plank||ms.cardboard)return 'imp-wood';
  if(ms.metal||ms.steel||ms.chrome||ms.rust||ms.corrugated)return 'imp-metal';
  return 'imp-plastic';
}
/* paso de un prop pisado (capot de auto, tablón, etc.): misma idea que impName */
function propStepSound(def){
  const ms=propMatSet(def);
  if(ms.wood||ms.plank||ms.cardboard)return 'step-wood';
  if(ms.metal||ms.steel||ms.chrome||ms.rust||ms.corrugated)return 'step-metal';
  if(ms.grass||ms.dirt)return 'step-grass';
  return 'step-concrete';
}
/* paso sobre el piso del mapa (userData.m puesto por addBody en core_a) */
function matStepSound(m){
  if(m==='grass'||m==='dirt')return 'step-grass';
  if(m==='wood'||m==='plank')return 'step-wood';
  if(m==='steel'||m==='metal'||m==='corrugated'||m==='chrome'||m==='rust')return 'step-metal';
  return 'step-concrete';                        // concrete/brick/asphalt/tile/… y cualquier otro
}
/* ¿el cuerpo que pegó la bala es metálico? prop: por su material dominante; mapa: por userData.m */
function isMetalHit(h){
  if(h.prop)return impName(h.prop.def)==='imp-metal';
  const m=h.body&&h.body.userData&&h.body.userData.m;
  return /steel|metal|chrome|rust|corrugated/.test(m||'');
}

/* ---------- 1. SFX.* pasan a las grabaciones (con respaldo) ---------- */
const _SFX0=Object.assign({},SFX);
const sTry=(n,o,fb)=>{ if(!sPlay(n,o)&&_SFX0[fb||'ui'])nsafe(()=>_SFX0[fb||'ui'](),'sfxfb'); };
/* disparo por arma real (queja: physgun/toolgun sonaban a pistola porque no había
   'shot-physgun'/'shot-toolgun' y todo caía al fallback) */
function shotNameFor(w){
  const id=w.id;
  if(id==='physgun'||id==='gravgun')return 'phys-shot';
  if(id==='toolgun')return 'tool-ok';
  if(id==='bat'||id==='hands')return 'bat-swing';
  return SND['shot-'+id]?'shot-'+id:'shot-pistol';
}
SFX.shot=k=>{
  const w=weap(),n=shotNameFor(w);
  /* lastShotSnd queda vacío si el buffer no estaba y hubo que caer al sintetizador: así el
     hook no puede devolver un nombre que en realidad no sonó */
  if(!sPlay(n,{vol:.9})){lastShotSnd='';_SFX0.shot(k);}
  else lastShotSnd=n;
  /* bala que pega: sólo armas de fuego de verdad (gun/proj), no melee/phys/tool */
  if(w.kind==='gun'||w.kind==='proj')nsafe(()=>{
    const h=aimRay(60,0);
    if(h)sPlay((isMetalHit(h)&&Math.random()<.3)?'ricochet':'imp-concrete',{vol:.22,at:h.p});
  },'ricochet');
};
SFX.boom =()=>{ if(!sPlay('boom',{vol:1}))_SFX0.boom(); };
SFX.melee=()=>{ if(!sPlay('bat-swing',{vol:.8}))_SFX0.melee(); };
SFX.grab =()=>{ if(!sPlay('grab',{vol:.7}))_SFX0.grab(); };
SFX.drop =()=>{ if(!sPlay('grab',{vol:.5,rate:.72}))_SFX0.drop(); };
SFX.tool =()=>{ if(!sPlay('toolgun',{vol:.7}))_SFX0.tool(); };
SFX.freeze=()=>{ if(!sPlay('freeze',{vol:.8}))_SFX0.freeze(); };
/* daño: hurt(n) en core_b llama a SFX.hurt() ANTES de aplicar el daño (no recibe n), así
   que lo envolvemos para saber si ESTE golpe deja la vida en 0 y avisar con 'death' */
let _pendKill=false;
const _hurt0=hurt;
hurt=function(n){ _pendKill=n>0&&(PL.hp-n<=0); _hurt0(n); };
SFX.hurt=()=>{ const n=_pendKill?'death':(Math.random()<.5?'hurt':'hurt2');
  if(!sPlay(n,{vol:.9}))_SFX0.hurt(); };
/* recarga: la ballesta tensa la cuerda a mano, no es instantáneo -> 0.3s de delay.
   Como el disparo con mag:1 dispara reload() en el mismo instante, este delay ES el
   "crossbow-load 0.3s después del disparo" pedido, sin duplicar el sonido. */
SFX.reload=()=>{
  const w=weap();
  if(w.id==='crossbow'){
    setTimeout(()=>{ if(APP==='play')nsafe(()=>{ if(!sPlay('crossbow-load',{vol:.6}))_SFX0.reload(); },'xload'); },300);
    return;
  }
  if(!sPlay('reload',{vol:.8}))_SFX0.reload();
};
SFX.ui   =()=>{ if(!sPlay('ui',{vol:.5}))_SFX0.ui(); };

/* ---------- 2. sonidos nuevos ---------- */
/* pasos: al ritmo del paso real (walk ~2 Hz, run ~3 Hz); material real del piso (groundBody,
   puesto por playerStep en core_b) o fallback por CURMAP.def.ground si no hay userData */
let stepT=0;
function stepGroundFallback(){ return (CURMAP&&(CURMAP.def.ground==='asphalt'))?'step-concrete':'step-grass'; }
function groundStepSound(){
  if(groundBody&&groundBody.userData){
    if(groundBody.userData.prop)return propStepSound(groundBody.userData.prop.def);
    if(groundBody.userData.m)return matStepSound(groundBody.userData.m);
  }
  return stepGroundFallback();
}
function stepStep(dt){
  if(APP!=='play'||PL.rag||PL.sit)return;
  if(inWater){                                   // nadando: brazada en vez de paso
    const sp=Math.hypot(plBody.velocity.x,plBody.velocity.y,plBody.velocity.z);
    if(sp<1.5){stepT=0;return;}
    stepT+=dt;
    if(stepT>=.8){stepT=0;sPlay('swim',{vol:.4});}
    return;
  }
  if(!grounded){stepT=0;return;}
  const sp=Math.hypot(plBody.velocity.x,plBody.velocity.z);
  if(sp<1.2){stepT=0;return;}
  stepT+=dt;
  const iv=sp>7?.32:.48;
  if(stepT>=iv){stepT=0;sPlay(groundStepSound(),{vol:.32,rate:sp>7?1.06:1});}
}
/* saltar / caer / zambullirse: por transiciones de grounded/inWater */
let wasGround=true,wasWater=false,airT=0;
function bodySnd(dt){
  if(APP!=='play')return;
  if(!grounded)airT+=dt;
  if(wasGround&&!grounded&&plBody.velocity.y>3)sPlay('jump',{vol:.45});
  if(!wasGround&&grounded&&airT>.18&&!inWater)sPlay('land',{vol:Math.min(.8,.3+airT*.4)});
  if(grounded)airT=0;
  wasGround=grounded;
  if(!wasWater&&inWater)sPlay('splash',{vol:.9});
  wasWater=inWater;
}
/* physgun: zumbido mientras se sostiene algo */
let humL=null;
function humSnd(){
  const want=!!grab&&APP==='play';
  if(want&&!humL)humL=sLoop('phys-hum',.89);   /* .71 sobre el objetivo motor (-19) = -22 dBFS */
  else if(!want&&humL){humL.stop();humL=null;}
}
/* spawn / borrar props (con freno para que limpiar todo no meta 300 pops) */
const _spawnN0=spawnProp;let _sT=0,_tT=0;
spawnProp=function(id,pos,quat,opt){
  const p=_spawnN0(id,pos,quat,opt);
  if(p&&APP==='play'){const now=performance.now();
    if(now-_sT>90){_sT=now;nsafe(()=>sPlay('spawn',{vol:.55,at:p.body.position}),'ssp');}}
  return p;
};
const _removeP0=removeProp;
removeProp=function(p){
  if(p&&APP==='play'){const now=performance.now();
    if(now-_tT>90){_tT=now;nsafe(()=>sPlay('trash',{vol:.5,at:p.body.position}),'str');}}
  return _removeP0(p);
};
/* impactos de props por material: un listener de colisión por prop spawneado */
let _impT=0;
const _spawnN1=spawnProp;
spawnProp=function(id,pos,quat,opt){
  const p=_spawnN1(id,pos,quat,opt);
  if(p)nsafe(()=>{
    p.body.addEventListener('collide',e=>{
      const now=performance.now();
      if(now-_impT<70||now-(p._imp||0)<300)return;
      let v=0;nsafe(()=>{v=Math.abs(e.contact.getImpactVelocityAlongNormal());},'iv');
      if(v<2.6)return;
      _impT=now;p._imp=now;
      sPlay(impName(p.def),{vol:Math.min(.85,.2+v*.07),at:p.body.position});
    });},'impl');
  return p;
};
/* globo pinchado: pop cuando el globo desaparece lo maneja removeProp (trash); el POP de
   verdad va en los balloons de la herramienta — se cuelga del SFX de boom chico que ya
   usa stepBalloons? no hay: se usa el wrap de removeProp con sonido especial para globos */
const _removeP1=removeProp;
removeProp=function(p){
  if(p&&p.def&&/balloon|globo/i.test(p.def.name||'')&&APP==='play')
    nsafe(()=>sPlay('pop',{vol:.8,at:p.body.position}),'pop');
  return _removeP1(p);
};
/* soldar (la herramienta weld usa SFX.tool: le sumamos el zap de soldadura) */
const _tool0=SFX.tool;
SFX.tool=()=>{ const t=(T('tools')||[])[toolIdx]||'';
  if(/sold|weld/i.test(t)){ if(!sPlay('weld',{vol:.7}))_tool0(); }
  else _tool0(); };

/* sentarse */
const _sit0=sitDown;
sitDown=function(p){ const r=_sit0(p); if(r)nsafe(()=>sPlay('sit',{vol:.7}),'sit'); return r; };

/* chat entrante */
nsafe(()=>{ const c0=NET.onChat;
  NET.onChat=d=>{ nsafe(()=>c0(d),'chat0'); if(!d.sys)sPlay('chat',{vol:.5}); }; },'chatw');

/* ---------- pirotecnia: FWEV, el contrato con core_l ---------- */
/* antes había un wrap de burst() y un listener de bFw tocando fw-fuse/fw-launch a mano:
   sonaba siempre igual (no distinguía mecha real de estallido, ni estilo, ni fuentes/ruedas
   en bucle) y duplicaba el burst. Ahora core_l llama a FWEV(ev,x,y,z,extra) en cada evento
   real (fuse/launch/shell/candle/burst/bomb/fountain0-1/wheel0-1) y acá se decide el sonido. */
if(typeof FWEV==='undefined')var FWEV=null;
const fwKey=(x,y,z)=>Math.round(x*4)+'_'+Math.round(y*4)+'_'+Math.round(z*4);   // varias fuentes/ruedas a la vez
const fwFountains={},fwWheels={};
FWEV=function(ev,x,y,z,extra){
  nsafe(()=>{
    const at=[x,y,z];
    if(ev==='fuse'){ sPlay('fw-fuse',{vol:.6}); }
    else if(ev==='launch'){
      const missile=extra&&extra.k==='missile';
      const n=missile?'fw-launch':(Math.random()<.5?'fw-launch':'fw-whistle');   // variar los cohetes
      sPlay(n,{vol:.55,at});
    }
    else if(ev==='shell'){ sPlay('fw-thump',{vol:.6,at}); }
    else if(ev==='candle'){ sPlay('fw-candle',{vol:.55,at}); }
    else if(ev==='burst'){
      const size=(extra&&extra.size)||1,style=(extra&&extra.style)||'peony';
      const n=size>=3?'fw-bigburst':style==='crackle'?'fw-crackle':style==='multi'?'fw-finale':'fw-burst';
      sPlay(n,{vol:.75,at});
      if(style==='willow')setTimeout(()=>nsafe(()=>sPlay('fw-sparkle',{vol:.5,at}),'fwsp'),300);
      if(Math.random()<.35)setTimeout(()=>nsafe(()=>sPlay('fw-boomfar',{vol:.4,at}),'fwbf'),500); // profundidad
    }
    else if(ev==='bomb'){ sPlay('fw-bang',{vol:1,at}); }
    else if(ev==='fountain0'){ const k=fwKey(x,y,z); if(!fwFountains[k])fwFountains[k]=sLoop('fw-fountain',.71); }
    else if(ev==='fountain1'){ const k=fwKey(x,y,z); if(fwFountains[k]){fwFountains[k].stop();delete fwFountains[k];} }
    else if(ev==='wheel0'){ const k=fwKey(x,y,z); if(!fwWheels[k])fwWheels[k]=sLoop('fw-wheel2',.63); }
    else if(ev==='wheel1'){ const k=fwKey(x,y,z); if(fwWheels[k]){fwWheels[k].stop();delete fwWheels[k];} }
  },'fwev');
};

/* vehículos: arranque al subir, motor en bucle (moto suena distinto), bocina, frenada, choque */
let engL=null,_vColT=0;
const _vhEnter0=vhEnter;
vhEnter=function(p){
  const r=_vhEnter0(p);
  if(r!==false&&VHS){ nsafe(()=>sPlay('eng-start',{vol:.8}),'eng');
    nsafe(()=>{ if(VHS.p&&VHS.p.body)VHS.p.body.addEventListener('collide',e=>{
      const now=performance.now();if(now-_vColT<600)return;
      let v=0;nsafe(()=>{v=Math.abs(e.contact.getImpactVelocityAlongNormal());},'vv');
      if(v<5)return;_vColT=now;sPlay('crash',{vol:Math.min(1,.4+v*.05)});});},'vcol'); }
  return r;
};
const _vhExit0=vhExit;
vhExit=function(){ if(engL){engL.stop();engL=null;} return _vhExit0(); };
const isMoto=()=>!!(VHS&&VHS.p&&VHS.p.def&&(/moto/i.test(VHS.p.def.id||'')||/moto/i.test(VHS.p.def.name||'')));
function engSnd(){
  const on=!!VHS&&APP==='play';
  const name=(on&&isMoto()&&BUF['eng-moto'])?'eng-moto':'eng-loop';
  if(on&&!engL&&BUF[name])engL=sLoop(name,.63);
  if(!on&&engL){engL.stop();engL=null;}
  if(on&&engL){ const k=Math.min(1,Math.abs(vhSpeed())/22);
    engL.rate(.85+k*.75); engL.set(.63+k*1.4); }
}
nsafe(()=>{ const e=$('bBrake'); if(e){
  const f=()=>{ if(VHS&&Math.abs(vhSpeed())>6)sPlay('skid',{vol:.75}); };
  e.addEventListener('touchstart',f,{passive:true});e.addEventListener('mousedown',f);} },'brk');
/* bocina: botón chico, mismo estilo/patrón que bBrake (core_e), sólo visible manejando */
nsafe(()=>{
  const st=document.createElement('style');
  st.textContent='#bHorn{right:22vmin;bottom:37vmin;width:10vmin;height:10vmin;max-width:52px;'
    +'max-height:52px;background:rgba(255,196,74,.58);font-size:4vmin;display:none}'
    +'#bHorn.on{display:flex}';
  document.head.appendChild(st);
  const hud=$('hud');
  const e=document.createElement('div');e.id='bHorn';e.className='rb';e.innerHTML='📯';
  if(hud)hud.appendChild(e);
  const f=()=>{ if(VHS)sPlay('horn',{vol:.85}); };
  e.addEventListener('touchstart',f,{passive:true});
  e.addEventListener('mousedown',f);
},'horn');
function hornSync(){ const e=$('bHorn'); if(e)e.classList.toggle('on',!!VHS); }

/* clicks de interfaz + menú de spawn */
document.addEventListener('click',e=>{
  const t=e.target;
  if(!t||!t.closest)return;
  if(t.closest('#spawn .pit'))return;                     /* el spawn ya suena solo */
  if(t.closest('.btn,.sptab,.fold,#pmenu button,#optfoot button,.mapit'))sPlay('ui',{vol:.4});
},true);
nsafe(()=>{ const e=$('bTools'); if(e){
  const f=()=>sPlay('menu',{vol:.5});
  e.addEventListener('touchstart',f,{passive:true});e.addEventListener('mousedown',f);} },'mn');

/* ---------- 3. música de menú + ambiente de mapa ---------- */
let musL=null;
function musSnd(){
  const inMenu=(APP==='title'||APP==='qual'||APP==='help'||APP==='map'||APP==='lang');
  const a=AC;                                    /* sólo si el contexto ya existe (gesto) */
  if(inMenu&&!musL&&a&&BUF[SNDMUS])musL=sLoop(SNDMUS,.63);
  if(!inMenu&&musL){ fadeOut(musL);musL=null; }
}
/* viento siempre de fondo en partida; pájaros sólo si el piso base del mapa es pasto */
let windL=null,birdsL=null;
function ambSnd(){
  const on=APP==='play';
  if(on&&!windL&&BUF['amb-wind'])windL=sLoop('amb-wind',.2);
  if(!on&&windL){ fadeOut(windL);windL=null; }
  const wantBirds=on&&CURMAP&&CURMAP.def&&CURMAP.def.ground==='grass';
  if(wantBirds&&!birdsL&&BUF['amb-birds'])birdsL=sLoop('amb-birds',.25);
  if(!wantBirds&&birdsL){ fadeOut(birdsL);birdsL=null; }
}

/* ---------- 4. volumen en Ajustes ---------- */
if(SV.vol==null)SV.vol=.5;
function volApply(){ if(MG)MG.gain.value=SV.vol; }
nsafe(()=>{
  const card=document.getElementById('optcard');if(!card)return;
  const row=document.createElement('div');row.className='sl';
  row.innerHTML='<label><span id="oVolL">Volumen</span><b id="oVolV"></b></label>'
    +'<input type="range" id="oVol" min="0" max="100" value="'+Math.round(SV.vol*100)+'">';
  const foot=document.getElementById('optfoot');
  card.insertBefore(row,foot);
  const sl=row.querySelector('#oVol'),vv=row.querySelector('#oVolV');
  vv.textContent=Math.round(SV.vol*100)+'%';
  sl.addEventListener('input',()=>{SV.vol=sl.value/100;vv.textContent=sl.value+'%';volApply();});
  sl.addEventListener('change',()=>save());
},'volui');

/* ---------- enganche al bucle ---------- */
let _ldT=0;
EXT.frame.push(dt=>{
  if(!sndOn){ _ldT+=dt; if(_ldT>1&&APP!=='load')nsafe(sndLoad,'sndload'); }
  volApply();
  /* el limitador se engancha en cuanto exista el AudioContext (se crea con el primer gesto
     o con el primer decode), y la pre-medición corre por tandas mientras entran buffers */
  nsafe(()=>{compInit();loudWarm();if(DEV)compWatch();},'sndmix');
  nsafe(()=>{stepStep(dt);bodySnd(dt);humSnd();engSnd();hornSync();musSnd();ambSnd();},'sndtick');
});

if(DEV&&window.__H)Object.assign(window.__H,{
  /* amb: true si suena algo del ambiente de mapa (viento siempre en partida, pájaros sólo
     con piso de pasto — ver ambSnd más arriba); sin esto no había forma de probar por afuera
     que el viento/pájaros realmente están sonando, sólo se podía adivinar por sndNames() */
  sndInfo:()=>({on:sndOn,pend:sndPend,done:sndDone,fail:sndFail,
    loaded:Object.keys(BUF).length,plays:sndPlays,last:lastSnd,
    hum:!!humL,eng:!!engL,mus:!!musL,vol:SV.vol,ac:!!AC,amb:!!windL||!!birdsL}),
  sndPlay:n=>sPlay(n,{vol:1}),
  /* dispara y devuelve la grabación DEL ARMA (no lastSnd, que puede haber quedado en el
     impacto de la bala — ver lastShotSnd arriba) */
  sndShot:()=>{SFX.shot(0);return lastShotSnd;},
  sndHist:()=>sndHistArr.slice(),
  sndHave:n=>!!BUF[n],
  sndNames:()=>Object.keys(SND).concat([SNDMUS]),
  sndMap:()=>({shot:shotNameFor(weap()),ground:groundStepSound()}),
  /* VERIFICACIÓN DEL RECORTE (SOFF/SLEN). El recorte pasa adentro de start(0,off,len) y desde
     afuera no se puede oír; lo que sí se puede comprobar es que las cuentas cierran contra el
     buffer REALMENTE decodificado: off tiene que caer dentro del archivo y len no pasarse del
     resto. Se calcula con las MISMAS expresiones que sPlay (si alguien las cambia en un lado y
     no en el otro, esto lo delata) y avisa si el acote de seguridad tuvo que actuar (clamped),
     que sería tabla desalineada con el mp3 — el caso que rompería el disparo. */
  sndOff:n=>{const b=BUF[n];if(!b)return null;
    const off=Math.min(SOFF[n]||0,Math.max(0,b.duration-.02));
    const len=Math.min(SLEN[n]||0,b.duration-off);
    return {tabOff:SOFF[n]||0,tabLen:SLEN[n]||0,off:+off.toFixed(3),len:+len.toFixed(3),
      dur:+b.duration.toFixed(3),clamped:(SOFF[n]||0)>off+1e-9,rest:+(b.duration-off).toFixed(3)};},
  sndOffNames:()=>({soff:Object.keys(SOFF),slen:Object.keys(SLEN)})
});

/* ---------- hooks de la MEZCLA (medición real, no promesas) ---------- */
if(DEV&&window.__H)Object.assign(window.__H,{
  /* un archivo: nivel medido de la ventana que suena, categoría, objetivo y factor */
  sndLoud:n=>{const m=sMeasure(n);if(!m)return null;
    const g=sGain(n),w=sWin(n),gd=20*Math.log10(g);
    return {rms_db:m.rms_db,pk_db:m.pk_db,loud_db:m.loud_db,cat:m.cat,
      target_db:STGT[m.cat],gain:g,
      /* out_db es LA MEZCLA: la loudness después del factor, y es la que tiene que dar el
         objetivo. out_rms_db queda de referencia y NO da el objetivo a propósito: cuánto
         RMS le sobra a un archivo sobre su loudness es su factor de cresta, que es del
         contenido (un click seco contra un disparo con eco) y no algo a nivelar. */
      out_db:+(m.loud_db+gd).toFixed(2),
      out_rms_db:+(m.rms_db+gd).toFixed(2),
      out_pk_db:+(m.pk_db+gd).toFixed(2),
      clamped:(g<=SGCLAMP[0]+1e-9||g>=SGCLAMP[1]-1e-9),alias:(SALIAS[n]||{}).n||null,
      loop:SLOOPN.test(n),off:+w.off.toFixed(3),len:+w.len.toFixed(3),samples:m.n};},
  /* la tabla entera, tal como la aplica sPlay */
  sndMix:()=>{const o={};
    for(const n of Object.keys(BUF)){const m=sMeasure(n);if(!m)continue;
      const g=sGain(n),gd=20*Math.log10(g);
      o[n]={rms_db:m.rms_db,pk_db:m.pk_db,loud_db:m.loud_db,cat:m.cat,
        target_db:STGT[m.cat],gain:g,out_db:+(m.loud_db+gd).toFixed(2),
        out_rms_db:+(m.rms_db+gd).toFixed(2),out_pk_db:+(m.pk_db+gd).toFixed(2),
        clamped:(g<=SGCLAMP[0]+1e-9||g>=SGCLAMP[1]-1e-9),
        alias:(SALIAS[n]||{}).n||null};}
    return o;},
  sndTargets:()=>Object.assign({},STGT),
  /* estado del limitador + pico REAL medido a su salida (0 dBFS = clip) */
  sndComp:()=>({on:!!SCOMP,thr:SCOMP?SCOMP.threshold.value:null,
    ratio:SCOMP?SCOMP.ratio.value:null,red_db:SCOMP?+SCOMP.reduction.toFixed(2):null,
    peak:+sPkMax.toFixed(4),peak_db:sPkMax>0?+(20*Math.log10(sPkMax)).toFixed(2):-99,
    clip:sClip}),
  sndPeakReset:()=>{sPkMax=0;sClip=0;return true;},
  /* reproducir SIN normalizar, para poder comparar antes/después en la misma corrida */
  sndPlayRaw:n=>sPlay(n,{vol:1,raw:true,jit:false})
});
