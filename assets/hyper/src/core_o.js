/* ============================================================
   SUX SANDBOX — MÁS SONIDOS (18 efectos nuevos, enganchados a acciones reales)
   ------------------------------------------------------------
   core_n ya trajo las 69 grabaciones y el reproductor (sPlay/sLoop, SOFF/SLEN, ambiente,
   motor, pirotecnia). Faltaban cosas que el jugador HACE todo el tiempo y no sonaban:
   cambiar de arma, cambiar de herramienta, romper madera, arrastrar chapa, un barril
   rodando, salir del agua, caminar con el agua a los tobillos, quedarse sin aire de tanto
   correr, comerse una caída larga, la puerta del auto, la suspensión al aterrizar un salto,
   la mecha larga chisporroteando, la lluvia de estrellas que baja silbando, el "no hay nada
   ahí" / "límite de props", guardar, reaparecer, y quién entra o sale de la sala.
   Reglas de la casa (iguales que en core_n):
     · Nada re-declarado: todo lo que ya existe se ENVUELVE (const _xO=x; x=function...).
       core_o se concatena DESPUÉS de core_n, así que puede pisar cualquier binding.
     · Todo callback dentro de nsafe: si un sonido falla, el juego sigue igual.
     · Nada por frame sin dt; el barrido de props es cada 0.12 s y por tandas, no completo.
     · No se toca ni un sonido de arma ni core_n: sólo se agregan claves a SND/SOFF (son
       objetos const: se MUTAN, no se reasignan) y se envuelven funciones.
   ============================================================ */

/* ---------- catálogo nuevo ---------- */
const SNDO=['equip','tool-switch','wood-break','metal-scrape','prop-roll','water-exit','wade',
  'breath-hard','fall-hard','car-door','suspension','fw-fuse-long','fw-whistle-down',
  'ui-error','save','respawn','mp-join','mp-leave'];
/* sndLoad (core_n) arranca ~1 s después del primer frame, o sea DESPUÉS de que este módulo
   se ejecuta: alcanza con sumar las claves al catálogo y los baja junto con los otros 69,
   con la misma cola de 4 en paralelo. El loader propio de más abajo es sólo el plan B. */
for(const n of SNDO)if(!SND[n])SND[n]=1;

/* Offsets medidos sobre la envolvente de cada archivo (mismo problema que en core_n: el
   modelo mete silencio ANTES del sonido, y distinto en cada archivo). Los cinco que se
   pasaban de 0.15 s:
     mp-join          la campanita entra a los 0.585 s (tres intentos de "notification
                      chime" salieron pegados al final del archivo, inservibles; el que
                      quedó es una campana de bronce real, que sí trae cola útil)
     wade             el chapoteo arranca a los 0.074 s
     breath-hard      la primera bocanada empieza a los 0.196 s
     ui-error         el buzz entra a los 0.204 s
     fw-whistle-down  el barrido descendente empieza a los 0.139 s
   Los otros trece abren en los primeros 20 ms y no necesitan recorte. fw-fuse-long va por
   sLoop, así que queda a propósito FUERA de la tabla (recortarle el arranque no sirve: el
   bucle vuelve a 0 igual y encima se rompe el empalme). */
Object.assign(SOFF,{'breath-hard':.17,wade:.05,'fw-whistle-down':.12,'ui-error':.18,
  'mp-join':.56});

/* ---------- plan B: loader propio ----------
   Si sndLoad ya hubiera corrido antes de este módulo (orden de concatenación distinto,
   o alguien lo llamó a mano), las claves nuevas no entrarían en su lista y nunca se
   bajarían. Este loader es idéntico al de core_n pero sólo para lo que falte. */
const SNDOREQ={};let sndoTry=0,sndoT=0;
function sndoLoad(){
  if(!okUrl(BASE))return;
  const a=ac();if(!a)return;                     /* sin AudioContext no se puede decodificar */
  for(const n of SNDO){
    if(BUF[n]||SNDOREQ[n])continue;
    SNDOREQ[n]=1;
    fetch(BASE+'snd/'+n+'.mp3').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer();})
      .then(ab=>new Promise((res,rej)=>a.decodeAudioData(ab,res,rej)))
      .then(b=>{BUF[n]=b;})
      .catch(()=>{delete SNDOREQ[n];});           /* que un reintento posterior pueda volver */
  }
}

/* ---------- reproducir contando (para el hook de test) ---------- */
const oPlays={};let oPlaysN=0;
function oPlay(n,o){
  const r=sPlay(n,o);
  if(r){oPlays[n]=(oPlays[n]||0)+1;oPlaysN++;}
  return r;
}
const _ov=new THREE.Vector3();                   /* temporal propio: no pisar el _sv de core_n */
const oDist=b=>{_ov.set(b.position.x,b.position.y,b.position.z);
  return camera.position.distanceTo(_ov);};

/* ============================================================
   1. JUGADOR / INVENTARIO
   ============================================================ */
/* equipar arma: equip() se llama al arrancar (equipReady) y cada vez que cambiás de slot;
   sólo suena si estás jugando Y el arma cambió de verdad (re-equipar el mismo slot pasa
   seguido — attachWeapon/syncSlot — y sonaría a repetido) */
const _equipO=equip;let _eqT=0;
equip=function(i){
  const prev=wIdx;
  const r=_equipO(i);
  if(APP==='play'&&wIdx!==prev){
    const now=performance.now();
    if(now-_eqT>90){_eqT=now;nsafe(()=>oPlay('equip',{vol:.55}),'eqs');}
  }
  return r;
};

/* cambio de herramienta del toolgun: se elige de tres lados distintos (botones de la lista
   en core_b, el hook __H.tool y el teclado), así que en vez de envolver tres cosas se mira
   el valor de toolIdx una vez por frame — es una comparación de enteros, cuesta nada */
let _tiPrev=toolIdx;
function toolSwitchO(){
  if(toolIdx===_tiPrev)return;
  _tiPrev=toolIdx;
  if(APP==='play'||APP==='spawn'||APP==='pause')nsafe(()=>oPlay('tool-switch',{vol:.5}),'tsw');
}

/* respiración agitada: corriendo (sp>7, el mismo umbral con el que core_n acelera los pasos)
   más de 4.5 s seguidos. Se repite cada ~3.6 s mientras siga el sprint y se descuenta al
   trotar/parar, así que caminar no lo dispara nunca. Manejando no corre nadie: VHS lo corta. */
let oRunT=0,oBrT=0;
function breathO(dt){
  if(APP!=='play'||PL.rag||PL.sit||VHS){oRunT=0;return;}
  const sp=Math.hypot(plBody.velocity.x,plBody.velocity.z);
  if(grounded&&!inWater&&sp>7)oRunT+=dt;else oRunT=Math.max(0,oRunT-dt*.6);
  oBrT-=dt;
  if(oRunT>4.5&&oBrT<=0){oBrT=3.6;nsafe(()=>oPlay('breath-hard',{vol:.5}),'brth');}
}

/* caída grande: core_n ya toca 'land' en cualquier aterrizaje; esto es la CAPA de arriba
   para el porrazo de verdad (más de 0.85 s en el aire y bajando a más de 11 m/s, o sea
   ~6 m de altura). Se mide la velocidad vertical MÍNIMA del vuelo porque en el frame del
   aterrizaje cannon ya la anuló. Estado propio: el airT de core_n se resetea en su propio
   callback (corre antes que éste) y no se puede leer a tiempo. */
let oWasG=true,oAirT=0,oVyMin=0;
function fallO(dt){
  if(APP!=='play'){oWasG=grounded;return;}
  if(!grounded&&!inWater){oAirT+=dt;oVyMin=Math.min(oVyMin,plBody.velocity.y);}
  if(!oWasG&&grounded&&oAirT>.85&&oVyMin<-11)
    nsafe(()=>oPlay('fall-hard',{vol:Math.min(.9,.4+oAirT*.22)}),'fall');
  if(grounded||inWater){oAirT=0;oVyMin=0;}
  oWasG=grounded;
}

/* ============================================================
   2. AGUA
   ============================================================ */
/* salir del agua: transición inWater true->false, con estado propio (el wasWater de core_n
   es de su callback). Pide medio segundo adentro para que rozar el borde de la pileta de un
   salto no chorree agua. */
let oWasW=false,oInWT=0;
function waterOutO(dt){
  if(APP!=='play'){oWasW=inWater;return;}
  if(inWater)oInWT+=dt;
  if(oWasW&&!inWater){
    if(oInWT>.5)nsafe(()=>oPlay('water-exit',{vol:.7}),'wout');
    oInWT=0;
  }
  oWasW=inWater;
}
/* agua POCO PROFUNDA: si estás dentro del volumen de agua pero los pies siguen tocando el
   piso, no estás nadando: estás caminando con el agua a los tobillos. core_n en ese caso
   metía la brazada de 'swim' (sonaba a nadar parado). Se envuelve stepStep entero para
   REEMPLAZAR el paso en ese caso (si no, se sumarían chapoteo + brazada y queda barroso). */
const _stepStepO=stepStep;let oWadeT=0;
stepStep=function(dt){
  if(APP==='play'&&inWater&&grounded&&!PL.rag&&!PL.sit){
    const sp=Math.hypot(plBody.velocity.x,plBody.velocity.z);
    if(sp<1.1){oWadeT=0;return;}
    oWadeT+=dt;
    if(oWadeT>=.42){oWadeT=0;nsafe(()=>oPlay('wade',{vol:.42}),'wade');}
    return;
  }
  oWadeT=0;
  return _stepStepO(dt);
};

/* ============================================================
   3. FÍSICA DE PROPS
   ============================================================ */
const oIsWood=def=>{const ms=propMatSet(def);return !!(ms.wood||ms.plank||ms.cardboard);};
const oIsMetal=def=>{const ms=propMatSet(def);
  return !!(ms.metal||ms.steel||ms.chrome||ms.rust||ms.corrugated);};
const oIsRound=def=>{for(const q of (def.parts||[]))if(q.s==='cyl'||q.s==='sph')return true;
  return false;};
/* madera que se quiebra: el golpe FUERTE (>7.5 m/s) de un prop de madera/cartón no es el
   mismo "toc" que el impacto normal de core_n (imp-wood, desde 2.6 m/s) — acá se astilla.
   Es un listener aparte, con su propio enfriado, así que el impacto normal sigue sonando
   debajo y las dos capas juntas dan el crujido. */
const _spawnPropO=spawnProp;let oBrkT=0;
spawnProp=function(id,pos,quat,opt){
  const p=_spawnPropO(id,pos,quat,opt);
  if(p&&p.def&&p.def.parts&&oIsWood(p.def))nsafe(()=>{
    p.body.addEventListener('collide',e=>{
      const now=performance.now();
      if(now-oBrkT<220)return;                   /* un tablón contra otro son 6 contactos */
      let v=0;nsafe(()=>{v=Math.abs(e.contact.getImpactVelocityAlongNormal());},'bv');
      if(v<7.5)return;
      oBrkT=now;
      nsafe(()=>oPlay('wood-break',{vol:Math.min(.9,.35+v*.03),at:p.body.position}),'brk');
    });
  },'brkl');
  return p;
};
/* chapa que se arrastra y barril que rueda: NO se puede hacer con listeners de colisión
   (un prop apoyado deslizando genera contactos permanentes, sonaría 60 veces por segundo).
   Va por barrido: cada 0.12 s se miran hasta 90 props (cursor rotativo, así 400 props no
   cuestan más que 90) y se elige UN candidato para cada bucle — el más fuerte y más cerca.
   Dos bucles globales, no uno por prop: 20 barriles rodando no son 20 sLoop.
     rodar    = mucha velocidad angular + forma redonda (cyl/sph en el def)
     arrastrar= poca velocidad angular + material metálico (chapa/viga deslizando)
   Los que están cayendo (|vy| grande) se ignoran: eso ya lo cubre el impacto de core_n. */
let oScanT=0,oScanI=0,rollL=null,scrapeL=null;
function physScanO(dt){
  oScanT+=dt;
  if(oScanT<.12)return;
  oScanT=0;
  let bR=0,bS=0;
  const N=PROPS.length;
  if(N&&APP==='play'){
    const LIM=Math.min(N,90);
    for(let k=0;k<LIM;k++){
      const p=PROPS[(oScanI+k)%N];
      if(!p||!p.body||!p.def||p.frozen||p.drive)continue;
      const b=p.body;
      if(b.sleepState===CANNON.Body.SLEEPING)continue;
      const vh=Math.hypot(b.velocity.x,b.velocity.z);
      if(vh<1.2||Math.abs(b.velocity.y)>1.6)continue;
      const d=oDist(b);
      if(d>22)continue;
      const w=Math.hypot(b.angularVelocity.x,b.angularVelocity.y,b.angularVelocity.z);
      const sc=vh/(1+d/9);
      if(w>2.6&&oIsRound(p.def)){ if(sc>bR)bR=sc; }
      else if(w<1.4&&oIsMetal(p.def)){ if(sc>bS)bS=sc; }
    }
    oScanI=(oScanI+LIM)%N;
  }
  /* los bucles no pasan por la atenuación por distancia de sPlay (sPlay sólo la aplica a
     los one-shot), así que el volumen sale del score, que ya trae la distancia adentro */
  if(bR>.4){ if(!rollL)rollL=sLoop('prop-roll',0);
    if(rollL){rollL.set(Math.min(.71,bR*.125));rollL.rate(.82+Math.min(.55,bR*.05));} }
  else if(rollL){rollL.stop();rollL=null;}
  if(bS>.4){ if(!scrapeL)scrapeL=sLoop('metal-scrape',0);
    if(scrapeL){scrapeL.set(Math.min(.71,bS*.14));scrapeL.rate(.85+Math.min(.5,bS*.045));} }
  else if(scrapeL){scrapeL.stop();scrapeL=null;}
}

/* ============================================================
   4. VEHÍCULO
   ============================================================ */
/* puerta al subir y al bajar: vhEnter/vhExit ya los envolvió core_n para el motor, se
   vuelve a envolver encima (r!==false && VHS = subió de verdad, no rebotó por PL.rag) */
const _vhEnterO=vhEnter;
vhEnter=function(p){
  const r=_vhEnterO(p);
  if(r!==false&&VHS)nsafe(()=>oPlay('car-door',{vol:.6}),'door');
  return r;
};
const _vhExitO=vhExit;
vhExit=function(){
  const had=!!VHS;
  const r=_vhExitO();
  if(had)nsafe(()=>oPlay('car-door',{vol:.55,rate:.94}),'door2');
  return r;
};
/* suspensión al aterrizar: el chasis venía bajando (vy<-4 por más de 0.18 s) y en un frame
   se frena. Se guarda la vy del frame ANTERIOR porque en el del aterrizaje ya vale ~0 y no
   se podría medir la fuerza del golpe. */
let oVhAir=0,oVhVy=0;
function suspO(dt){
  if(!VHS||!VHS.p||!VHS.p.body){oVhAir=0;oVhVy=0;return;}
  const vy=VHS.p.body.velocity.y;
  if(vy<-4)oVhAir+=dt;
  if(oVhAir>.18&&vy>-2.2&&oVhVy<-5){
    nsafe(()=>oPlay('suspension',{vol:Math.min(.9,.3+Math.abs(oVhVy)*.04)}),'susp');
    oVhAir=0;
  }
  if(vy>-1)oVhAir=Math.max(0,oVhAir-dt);
  oVhVy=vy;
}

/* ============================================================
   5. PIROTECNIA
   ============================================================ */
/* mecha larga: core_n toca 'fw-fuse' una vez al encender, pero la mecha CHISPORROTEA todo
   el rato hasta que sale el cohete (fase 'fuse' del estado en FWLIT, core_l). Un bucle
   mientras haya al menos una mecha prendida — igual que las fuentes/ruedas de core_n. */
let fuseL=null;
function fuseSndO(){
  let any=false;
  if(typeof FWLIT!=='undefined'&&FWLIT&&FWLIT.forEach)
    FWLIT.forEach(st=>{if(st&&st.phase==='fuse')any=true;});
  if(any&&APP==='play'){ if(!fuseL)fuseL=sLoop('fw-fuse-long',.5); }
  else if(fuseL){fuseL.stop();fuseL=null;}
}
/* silbato descendente: la lluvia de estrellas/restos que CAE después del estallido. Se
   agenda 0.42 s después del burst (el estallido tiene que sonar primero); siempre en las
   bombas grandes (size>=2) y a veces en las chicas, para que no sea un patrón fijo. */
if(typeof FWEV!=='undefined'&&FWEV){
  const _FWEVO=FWEV;
  FWEV=function(ev,x,y,z,extra){
    nsafe(()=>_FWEVO(ev,x,y,z,extra),'fwev0');
    nsafe(()=>{
      if(ev!=='burst')return;
      const size=(extra&&extra.size)||1;
      if(size<2&&Math.random()>=.4)return;
      setTimeout(()=>nsafe(()=>{ if(APP==='play')oPlay('fw-whistle-down',{vol:.45,at:[x,y,z]}); },'fwwd'),420);
    },'fwevo');
  };
}

/* ============================================================
   6. INTERFAZ / PARTIDA / MULTIJUGADOR
   ============================================================ */
/* acción inválida y límite de props: los dos avisos ya existen como texto (toast), lo que
   faltaba era el sonido. Se envuelve toast() y se compara con el texto traducido, así vale
   en los tres idiomas sin tocar quien llama. El límite usa el mismo buzz más grave y más
   fuerte: es "no podés" pero más serio.
   OJO: la función original usa toast._t para su timeout; al reasignar el binding esa
   propiedad pasa a vivir en ESTE wrapper (que es lo que 'toast' nombra ahora), así que
   clearTimeout/setTimeout siguen apuntando al mismo lugar y el aviso se sigue borrando. */
const _toastO=toast;
toast=function(t){
  nsafe(()=>{
    if(APP==='load')return;
    const s=String(t==null?'':t);
    if(s===T('tNo'))oPlay('ui-error',{vol:.55});
    else if(s===T('tMax'))oPlay('ui-error',{vol:.7,rate:.78});
  },'terr');
  return _toastO(t);
};
/* guardar partida */
const _saveGameO=saveGame;
saveGame=function(){
  const r=_saveGameO();
  nsafe(()=>oPlay('save',{vol:.6}),'sv');
  return r;
};
/* reaparecer (botón de la pausa y muerte) */
const _respawnO=respawn;
respawn=function(){
  const r=_respawnO();
  if(APP==='play'||APP==='pause'||APP==='spawn')nsafe(()=>oPlay('respawn',{vol:.7}),'rsp');
  return r;
};
/* abrir/cerrar menús: el listener de clicks de core_n sólo cubre los BOTONES; con Esc o Q
   (teclado) la pausa y el spawn se abrían y cerraban mudos. Se reusa el 'menu' que ya
   existe: agudo al abrir, más grave al cerrar (no hace falta un archivo nuevo). */
const _togglePauseO=togglePause;
togglePause=function(){
  const was=APP;
  const r=_togglePauseO();
  nsafe(()=>{ if(APP!==was)sPlay('menu',{vol:.5,rate:APP==='pause'?1:.82}); },'pmn');
  return r;
};
const _openSpawnO=openSpawn;
openSpawn=function(tab){
  const was=APP;
  const r=_openSpawnO(tab);
  nsafe(()=>{ if(APP==='spawn'&&was!=='spawn')sPlay('menu',{vol:.5}); },'spmn');
  return r;
};
/* alguien entra / alguien sale de la sala: llegan como mensaje de sistema del chat, con el
   texto T('mpJoin')/T('mpLeft') (core_f). core_n ya envolvió NET.onChat para el chat normal
   (y a propósito NO suena en los de sistema): acá se le pone el aviso a cada uno. */
nsafe(()=>{
  const c0=NET.onChat;
  NET.onChat=d=>{
    nsafe(()=>{if(c0)c0(d);},'chato');
    nsafe(()=>{
      if(!d||!d.sys)return;
      const m=String(d.m||'');
      if(m===T('mpLeft'))oPlay('mp-leave',{vol:.5});
      else if(m===T('mpJoin'))oPlay('mp-join',{vol:.5});
    },'mpj');
  };
},'chatwo');

/* ---------- enganche al bucle ---------- */
EXT.frame.push(dt=>{
  /* plan B del loader: si a los 6 s todavía falta algún archivo nuevo (sndLoad ya había
     corrido, o el AudioContext no existía cuando arrancó), se bajan acá. Tres intentos. */
  if(sndoTry<3){
    sndoT+=dt;
    if(sndoT>6){ sndoT=0;
      if(SNDO.some(n=>!BUF[n])){sndoTry++;nsafe(sndoLoad,'sndoload');}
      else sndoTry=3;
    }
  }
  nsafe(()=>{
    toolSwitchO();breathO(dt);fallO(dt);waterOutO(dt);
    physScanO(dt);suspO(dt);fuseSndO();
  },'sndotick');
});

if(DEV&&window.__H)Object.assign(window.__H,{
  /* para el verificador: qué se bajó de lo nuevo, cómo se llama cada cosa y cuántas veces
     sonó cada una (oPlay lleva la cuenta sólo de los sonidos de este módulo) */
  sndExtra:()=>({loaded:SNDO.filter(n=>!!BUF[n]).length,names:SNDO.slice(),
    plays:Object.assign({},oPlays),total:oPlaysN,
    missing:SNDO.filter(n=>!BUF[n]),
    loops:{roll:!!rollL,scrape:!!scrapeL,fuse:!!fuseL}}),
  sndExtraPlay:n=>oPlay(n,{vol:1})
});
