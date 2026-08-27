/* ============================================================
   SUX SANDBOX — PUÑOS Y BATE CON ANIMACIONES DE VERDAD (core_p)
   ------------------------------------------------------------
   Antes de esto el cuerpo a cuerpo era una línea: melee() en core_b pegaba EN EL MISMO FRAME
   en que se apretaba, sonaba un 'bat-swing' y el personaje no movía un dedo (el torso está
   clavado en el cuadro 0 del reposo, ver core_c/setAnim). Y en 1ª persona, con los PUÑOS, el
   viewmodel de core_m anclaba la MUÑECA en el punto del ARMA (VMC.xyz = 52 cm delante del
   ojo): con la mano ahí el hombro cae DETRÁS de la cámara y el antebrazo tapaba el 87,5% de
   la pantalla (medido con __H.vmDiff(): frac 0.8754, los cuatro bordes con píxeles). O sea
   que "los puños" eran un manchón de piel.
   Acá entran:
     1. CLIPS REALES de Higgsfield (3d_rigging sobre char.glb, mismo esqueleto: los nombres de
        hueso son idénticos a anim-idle.glb, así que se usa sólo g.animations[0] igual que
        addClip): jab derecho, gancho izquierdo, mazazo (el "soquete" del bate), guardia de
        boxeo y un idle de respiro.
     2. Una CAPA DE TORSO con un único polo (ver melSetAnim) para que el golpe llegue a peso 1.
     3. El IMPACTO en el cuadro del pico del swing, no al apretar.
     4. Agarre de bate de dos manos con el bate APOYADO EN EL HOMBRO (antes apuntaba al frente
        como un fusil, se ve en la captura g2base-bat3.png) y agarre RÍGIDO durante el swing:
        el bate acompaña la mano en vez de quedar estabilizado hacia la puntería.
     5. Los tres puntos de vista: 3ª persona con el clip completo, 1ª persona con el mismo clip
        aplicado como DELTA sobre la pose congelada del viewmodel (no hay hook de golpe en
        core_m: se comprobó con __H.vmInfo/vmCap/vmSet, ver VMANIM abajo) y REMOTOS con el clip
        en el mixer de cada fantasma.
   Este archivo es EXCLUSIVO: no toca ningún otro. Lo que necesita cambiar de afuera lo
   REASIGNA (melee, setAnim, holdWeapon, animStep, armIKR, ikSnap, vmPlace, vmCapture,
   ghostsStep) y lo que necesita mirar de afuera lo lee del mismo módulo (el build concatena
   todo en un solo módulo ES, así que _vmW, vmCap, VMC, relMat... son visibles acá).
   ============================================================ */

/* ---- contrato opcional con core_m ----
   Si algún día core_m expone un reproductor de golpes para el viewmodel, se usa ese y se
   apaga el delta de acá. HOY NO EXISTE (los hooks de core_m son vmInfo/vmSet/vmCap/vmShow/
   vmDiff: instrumentación y constantes, ninguno reproduce una animación), así que queda null
   y el golpe en 1ª persona se arma con el delta del clip + un empuje de VMG. */
if(typeof VMANIM==='undefined')var VMANIM=null;

/* ================= 1. clips ================= */
/* Ventanas MEDIDAS sobre el GLB con FK offline (scratchpad/glbfk.js, posición de la mano
   respecto de Hips cuadro a cuadro, 30 fps):
     punch1 Right_Jab_from_Guard  2.033 s — la piña va de t=0.30 a 0.90, pico a t=0.70
                                  (0.436 m del cuadro 0); de 1.0 a 2.03 es cola muerta.
     punch2 Left_Hook_from_Guard  1.033 s — barrido circular, el puño cruza el centro a
                                  t≈0.27-0.33 (x pasa de +0.19 a -0.27 con z=0.27 adelante).
     batsw  Heavy_Hammer_Swing    1.867 s — carga hasta t=1.2 y mazazo hasta t=1.83, la mano
                                  llega a 0.97 m del cuadro 0 (baja hasta la altura de la
                                  cadera: es un golpe de arriba hacia abajo).
   t0/t1 = tramo del clip que se usa, hit = instante del IMPACTO dentro del clip, sp =
   velocidad de reproducción (el clip es mocap lento: a 1x un jab tarda 0,9 s y se siente
   como una caricia). dur y hitAt salen de esas tres, no se escriben a mano. */
const MSPEC={
  punch1:{file:'anim-punch1.glb',t0:.22,t1:1.02,hit:.70,sp:1.95,side:'R'},
  punch2:{file:'anim-punch2.glb',t0:.00,t1:.96,hit:.30,sp:1.90,side:'L'},
  /* hit 1.62 y no 1.70: MEDIDO en el juego con __H.melProbe, la punta del bate llega a su
     máxima extensión en t=0.567 del swing (= 1.605 del clip) y con hit=1.70 el impacto caía
     50 ms DESPUÉS del pico. Con 1.62 queda a ~10 ms del pico. */
  batsw :{file:'anim-bat.glb',   t0:.50,t1:1.85,hit:1.62,sp:1.95,side:'R'},
  guard :{file:'anim-guard.glb', loop:1},
  idle2 :{file:'anim-idle2.glb', loop:1}
};
const MCL={},MCU={},MACT={};      /* clip crudo · clip del tren SUPERIOR · acción local */
let melPend=0,melGot=0;

/* qué usa cada arma: seq = golpes que se alternan (derecha/izquierda), pole = qué clip
   sostiene el TORSO cuando no está golpeando, kick = retroceso de cámara EN RADIANES.
   kick: el melee de core_b usaba .05 rad = 2,86°, más que los 2° que se piden. .026 rad son
   1,49° y .030 son 1,72°: los dos por debajo del tope, y se sienten igual porque el golpe lo
   vende la animación, no la sacudida. */
const MELW={
  hands:{seq:['punch1','punch2'],pole:'guard',kick:.026,i:-1,
         swing:{n:'bat-swing',vol:.42,rate:1.5},
         imp:[{n:'bat-hit',vol:.50,rate:1.45},{n:'imp-plastic',vol:.42,rate:.68}]},
  /* armK: ganancia del golpe en el VIEWMODEL (ver MELVM.armK). El bate va a .5: a 1 el mazazo
     completo se lleva el bate FUERA del cuadro (es un golpe de arriba hacia abajo: en la captura
     quedaba sólo el pomo abajo del todo) y a .3 se lee poco. El agarre de la izquierda ya no
     depende de este número: lo garantiza melVmGrip() con un IK sobre el mango. */
  bat  :{seq:['batsw'],pole:'idle2',kick:.030,i:-1,armK:.5,
         swing:{n:'bat-swing',vol:.85,rate:.95},
         imp:[{n:'bat-hit',vol:.95,rate:.92},{n:'imp-wood',vol:.45,rate:.8}]}
};
/* código que viaja por la red (ver melNetSend): 1 jab · 2 gancho · 3 mazazo */
const MCODE=['','punch1','punch2','batsw'];

/* La carga NO va en boot(): loadGLB() incrementa glbPend y la pantalla de carga espera a
   todos los GLB. Son 5 clips de animación que no se usan en el menú, así que se piden en el
   primer frame de partida: la pantalla de carga ya se fue y nadie espera. Si el jugador pega
   antes de que lleguen, melee() cae en el melee original de core_b (impacto instantáneo). */
let melAsked=false;
function melLoad(){
  if(melAsked)return;
  melAsked=true;
  for(const k in MSPEC){ const key=k;
    melPend++;
    loadGLB('mel_'+key,MSPEC[key].file,g=>nsafe(()=>melClipAdd(key,g),'melclip'));
  }
}
/* del GLB entero (personaje + animación) sólo se guarda el CLIP, igual que addClip de core_b.
   Del clip se guarda además el tren SUPERIOR partido con splitClip (core_c): las piernas
   siguen con caminar/correr/saltar, el golpe es de torso y brazos. Si se usara el clip
   entero, Hips traería su propia traslación y el personaje se desplazaría solo. */
function melClipAdd(key,g){
  if(!g||!g.animations||!g.animations.length)return;
  melGot++;
  MCL[key]=g.animations[0];
  /* el GLB trae el personaje entero: se lo suelta enseguida (no se agrega a la escena, pero
     MODELS lo retiene; con eso alcanza para que el GC no libere el buffer del clip) */
  melBuild();
}
/* ---- RE-BASE DE LA CADERA: por qué sin esto la piña sale para arriba ----
   Cada clip de Higgsfield es una toma aparte y trae SU PROPIA rotación de Hips en el cuadro 0:
   medido (scratchpad/_hips.js, rotación local de Hips en f0)
     anim-idle2 33,0°   punch1 49,2°   punch2 136,4°   bat 62,9°   guard 50,0°
   o sea que punch1 está 25° girado respecto del idle, el bate 39° y el GANCHO 130°.
   El tren superior partido con splitClip NO lleva Hips (a propósito: si lo llevara, la
   traslación de la cadera movería al personaje solo), así que la cadena de arriba se cuelga de
   la cadera del clip de PIERNAS y todo el golpe sale rotado. Medido en el juego antes de este
   arreglo: el jab levantaba el puño 0,39 m y lo llevaba adelante 0,13 m — o sea que en vez de
   una piña era un gancho al aire hacia arriba.
   Arreglo: se hornea la cadera del clip en el PRIMER hueso del tren superior (en este rig
   Hips → Spine02 → Spine01 → Spine → hombros, así que el primero es Spine02):
       Spine02' (t) = Href⁻¹ · Hips_clip(t) · Spine02_clip(t)
   Href = la cadera del clip de reposo en t=0, que es EXACTAMENTE la que tiene el juego parado
   (ACTS.idle está clavado en el cuadro 0, ver core_c/buildActions). Caminando la cadera es la
   de 'walk' y queda un error chico (unos grados), que es el precio de no mover al personaje.
   El resultado es que el golpe se reproduce en el marco del personaje, mire donde mire. */
let _melUpRoot=null,_melHref=null;
function melUpRoot(){
  if(_melUpRoot!==null)return _melUpRoot;
  if(!charRoot)return null;
  let r=null;
  charRoot.traverse(o=>{
    if(r||!o.isBone||!o.parent||!o.parent.isBone)return;
    if(UPPER.test(o.name)&&!UPPER.test(o.parent.name))r=o;
  });
  return (_melUpRoot=r);
}
function melHref(){
  if(_melHref)return _melHref;
  const T=melUpRoot();if(!T)return null;
  const hip=T.parent;
  const q=new THREE.Quaternion();
  const cl=CLIPS.idle||CLIPS.walk;
  let got=false;
  if(cl)for(const t of cl.tracks){
    if(t.name!==hip.name+'.quaternion')continue;
    q.fromArray(t.values,0);got=true;break;
  }
  /* respaldo: la pose que tiene la cadera ahora (parado es la misma) */
  if(!got)q.copy(hip.quaternion);
  return (_melHref=q);
}
const _msq=new THREE.Quaternion(),_msq2=new THREE.Quaternion(),_msi=new THREE.Quaternion();
/* rotación de una pista de cuaterniones en el instante t (slerp entre las dos claves) */
function melSampleQ(tr,t,out){
  const T=tr.times,V=tr.values,n=T.length;
  if(!n){out.identity();return out;}
  if(t<=T[0]){out.fromArray(V,0);return out;}
  if(t>=T[n-1]){out.fromArray(V,(n-1)*4);return out;}
  let i=0;while(i<n-1&&T[i+1]<t)i++;
  const f=(t-T[i])/Math.max(1e-9,T[i+1]-T[i]);
  out.fromArray(V,i*4);
  _msq2.fromArray(V,(i+1)*4);
  return out.slerp(_msq2,f);
}
function melRebase(up,full){
  const T=melUpRoot(),Href=melHref();
  if(!T||!Href||!up||!full)return up;
  const hn=T.parent.name+'.quaternion',tn=T.name+'.quaternion';
  let hq=null;
  for(const t of full.tracks)if(t.name===hn){hq=t;break;}
  let ti=-1;
  for(let i=0;i<up.tracks.length;i++)if(up.tracks[i].name===tn){ti=i;break;}
  if(!hq||ti<0)return up;
  /* splitClip devuelve las MISMAS pistas del clip original (Array.filter no clona): se clona
     la que se va a modificar para no ensuciar el clip crudo */
  const tt=up.tracks[ti].clone();
  up.tracks[ti]=tt;
  _msi.copy(Href).invert();
  for(let i=0;i<tt.times.length;i++){
    melSampleQ(hq,tt.times[i],_msq);
    _msq2.fromArray(tt.values,i*4);
    _msq.multiply(_msq2);          /* Hips_clip · Spine02_clip */
    _msq.premultiply(_msi);        /* Href⁻¹ · (…) */
    _msq.toArray(tt.values,i*4);
  }
  return up;
}

/* una acción por clip en el mixer del jugador. El reloj lo maneja MEL (timeScale=0 y .time
   escrito a mano): así el instante del impacto es exacto y no depende de LoopOnce ni de
   clampWhenFinished. Los pesos los sigue escribiendo SÓLO mixTo (ver melSetAnim). */
function melBuild(){
  /* hace falta el mixer (core_b) Y el esqueleto con la cadera identificada (el re-base de
     arriba). Si algo no está todavía se vuelve a intentar el frame siguiente. */
  if(!mixer||!melUpRoot()||!melHref())return false;
  let n=0;
  for(const k in MCL){
    if(!MCU[k])MCU[k]=melRebase(splitClip(MCL[k],'up')||MCL[k],MCL[k]);
    if(!MACT[k]){
      const a=mixer.clipAction(MCU[k]);
      a.enabled=true;a.weight=0;a.timeScale=0;a.play();
      MACT[k]=a;
    }
    n++;
  }
  melPoleBuild();
  return n>0;
}
/* MPOLE = todas las acciones que escriben el TREN SUPERIOR (las de core_c + las mías).
   mixTo() lleva a 1 la que se pide y a 0 todas las demás, así la suma se mantiene en 1: si
   dos acciones quedaran en peso 1 el mixer las normaliza y el golpe saldría a media
   amplitud (el fixed point de llamar los dos polos por frame es 1/(2-k) ≈ 0,55). */
let MPOLE=null,_mpN=-1;
function melPoleBuild(){
  MPOLE={};
  for(const k in ACTU)MPOLE['u_'+k]=ACTU[k];
  for(const k in MACT)MPOLE[k]=MACT[k];
  _mpN=Object.keys(ACTU).length+Object.keys(MACT).length;
  return MPOLE;
}
const melPole=()=>{
  if(!MPOLE||_mpN!==Object.keys(ACTU).length+Object.keys(MACT).length)melPoleBuild();
  return MPOLE;
};
/* nombre dentro de MPOLE del polo de reposo de core_c (el idle del torso) */
const melIdleKey=()=>(ACTU.idle?'u_idle':(ACTU.walk?'u_walk':null));

/* ================= 2. ajustes de las armas ================= */
/* Se REASIGNAN campos de la entrada de WEAP (core_b) desde acá, que es lo que corresponde:
   core_b no es mi archivo.
     bat: el agarre venía como el de un fusil (hold/lg de rifle). lg pasa de .09 a .115 — a
          9 cm la mano izquierda quedaba pisando la derecha; a 11,5 cm quedan las dos en el
          mango con los puños juntos, que es como se agarra un bate. rof de .5 a .85 porque
          el mazazo dura 0,69 s: con .5 el segundo golpe arrancaba antes de terminar el
          primero. dmg sube acorde al tiempo entre golpes.
     hands: rof de .34 a .40 (el jab dura 0,41 s) y reach de 2.2 a 2.0 (el rayo sale de los
          OJOS, ver melHit: 2,2 m de puño era medio metro más que el brazo). */
nsafe(()=>{
  const b=WEAP[WIX.bat];
  if(b){b.hold=[.020,-.058,.050];b.lg=.115;b.rof=.85;b.dmg=46;b.reach=2.9;b.imp=30;}
  const h=WEAP[WIX.hands];
  if(h){h.rof=.40;h.reach=2.0;h.dmg=15;h.imp=12;}
},'melweap');

/* ---- pose de DESCANSO del bate: apoyado en el hombro ----
   holdWeapon() estabiliza el arma hacia la puntería (para que el caño mire a donde se mira).
   Con el bate eso da un tipo apuntando un palo horizontal como si fuera un fusil (captura
   g2base-bat3.png). Acá se le suma una rotación EN EL MARCO DEL ARMA (post-multiplicar =
   ejes locales del arma, y el pivote es la empuñadura: la mano no se mueve):
     rx>0 levanta la punta (Rx(θ)·(0,0,-1) = (0,sinθ,-cosθ)), ry la corre al hombro.
   No se toca la posición: la empuñadura sigue clavada en la palma, así que holdCheck() y
   lhand() (los asserts de testHS) miden lo mismo que antes. */
const MREST={bat:{rx:1.02,ry:-.30,rz:.10}};
const _mrq=new THREE.Quaternion(),_mre=new THREE.Euler();

/* ================= 3. estado del golpe ================= */
const MEL={on:0,key:'',w:'',t:0,dur:0,hitAt:0,hitDone:0,off:0,grip:0,side:'R',
           act:null,frame:0,hitFrame:-1,hitT:0,lastHit:null,n:0};
const MELBLEND=.30;              /* cuánto dura el retorno al polo de reposo (s) */
/* peso del golpe: mixTo() usa AFADE=10 (95% en 0,30 s), y un jab dura 0,41 s: el clip nunca
   llegaría a peso 1 y el puño se quedaría a mitad de camino (0,44 m × 0,7 = 0,31 m, por
   debajo de los 0,35 m que se piden). mixTo sigue siendo el ÚNICO que escribe pesos: se lo
   llama MELMIX veces por frame, que es lo mismo que multiplicar la velocidad de mezcla por
   MELMIX (1-(1-k)^n), sin tocar la constante AFADE de core_c. Con 3 pasadas el golpe llega
   al 95% en 0,10 s. */
const MELMIX=3;

/* el puño que pega (para medir y para el delta del viewmodel) */
const melSideBone=()=>(MEL.side==='L'?bones.lHand:bones.rHand);
/* dónde DIBUJA la malla el puño (el hueso de la muñeca está ~16 cm atrás, ver palmLocal) */
function melPalm(b,out){
  if(!b)return null;
  b.updateWorldMatrix(true,false);
  const pl=palmLocal(b);
  out=out||new THREE.Vector3();
  if(pl)out.copy(pl).applyMatrix4(b.matrixWorld);
  else out.setFromMatrixPosition(b.matrixWorld);
  return out;
}
/* punta del bate en el mundo (ax1 del rig de agarre, ver rigGrip) */
function melTip(out){
  if(!wModel)return null;
  const g=wModel.userData._g;if(!g||g.bad)return null;
  wModel.updateWorldMatrix(true,false);
  out=out||new THREE.Vector3();
  return out.copy(g.ax1).applyMatrix4(wModel.matrixWorld);
}
/* transformada local del arma en la palma, congelada al empezar el swing (agarre rígido) */
const MGRIP={p:new THREE.Vector3(),q:new THREE.Quaternion(),s:new THREE.Vector3(1,1,1)};
/* ---- arranque del golpe: REASIGNA melee() de core_b ---- */
const melee0=melee;
melee=function(){
  const w=weap();
  const M=MELW[w.id];
  const key=M?M.seq[(M.i=(M.i+1)%M.seq.length)]:null;
  const a=key&&MACT[key];
  /* respaldo honesto: si el clip todavía no llegó (o el mixer no existe) se hace lo de antes,
     que funciona, en vez de quedarse sin golpe */
  if(!a||!MPOLE){return melee0();}
  const S=MSPEC[key];
  fireT=w.rof;
  recoil=M.kick;                       /* < 2°: ver la nota de MELW */
  MEL.on=1;MEL.key=key;MEL.w=w.id;MEL.t=0;MEL.hitDone=0;MEL.off=MELBLEND;
  MEL.dur=(S.t1-S.t0)/S.sp;MEL.hitAt=(S.hit-S.t0)/S.sp;
  MEL.side=S.side;MEL.act=a;MEL.frame=0;MEL.hitFrame=-1;MEL.n++;
  /* el bate: durante el swing el agarre pasa a ser RÍGIDO (acompaña la mano). Se guarda la
     transformada local que dejó holdWeapon() en la pose de descanso. */
  MEL.grip=0;
  if(wModel&&(wModel.parent===bones.rHand||wModel.parent===bones.rFore)){
    nsafe(()=>holdWeapon(),'melgrip0');
    MGRIP.p.copy(wModel.position);MGRIP.q.copy(wModel.quaternion);MGRIP.s.copy(wModel.scale);
    MEL.grip=1;
  }
  a.time=S.t0;a.timeScale=0;a.enabled=true;if(!a.isRunning())a.play();
  /* OJO: acá NO se toma la pose de referencia del viewmodel. melee() la llama weaponStep(),
     o sea ANTES de animStep en el frame: los brazos todavía tienen lo que dejó el IK del
     frame anterior (armIKR en 1ª persona), no la pose limpia del mixer. La referencia la
     toma el envoltorio de ikSnap(), que es el único punto del frame donde la pose es la del
     mixer y nada más. */
  if(M.swing&&typeof sPlay==='function')nsafe(()=>sPlay(M.swing.n,{vol:M.swing.vol,rate:M.swing.rate}),'melsw');
  melNetSend(key);
  return true;
};

/* ---- el reloj del golpe y el IMPACTO ---- */
/* CONGELADOR (sólo ?dev, para las capturas): deja la pose exactamente donde está sin usar la
   pausa —la pausa tapa la pantalla con el menú— y sin tocar el resto del juego. Con
   mixer.timeScale=0 ninguna acción avanza sola y acá no se avanza MEL.t, así que el cuadro
   del golpe queda quieto mientras el juego sigue dibujando. */
let MELFRZ=false;
function melStep(dt){
  if(MELFRZ)return;
  if(MEL.off>0&&!MEL.on)MEL.off=Math.max(0,MEL.off-dt);
  if(!MEL.on)return;
  const S=MSPEC[MEL.key];if(!S||!MEL.act){MEL.on=0;return;}
  /* se corta el golpe si cambió el arma, si el jugador quedó ragdoll o si se subió a un auto:
     seguir con el clip del arma anterior deja el bate viejo pegado a la mano y el impacto le
     pegaría con el daño equivocado */
  if(weap().id!==MEL.w||PL.rag||(typeof VHS!=='undefined'&&VHS)){
    MEL.on=0;MEL.off=MELBLEND;MEL.grip=0;return;
  }
  MEL.t+=dt;MEL.frame++;
  /* el clip avanza porque acá se le escribe .time (timeScale=0): el instante del impacto
     queda atado al CUADRO del clip, no a cuántos frames pasaron ni a qué fps corre el juego */
  MEL.act.time=Math.min(S.t1,S.t0+MEL.t*S.sp);
  if(!MEL.hitDone&&MEL.t>=MEL.hitAt){
    MEL.hitDone=1;MEL.hitFrame=MEL.frame;MEL.hitT=performance.now();
    nsafe(()=>melHit(),'melhit');
  }
  if(MEL.t>=MEL.dur){MEL.on=0;MEL.off=MELBLEND;}
}
/* ---- el golpe pega ----
   El rayo NO sale de la cámara como en melee() de core_b: en 3ª persona la cámara está 4 m
   atrás, así que con reach=2.2 el "puño" llegaba a pegarle a algo 1,8 m DETRÁS del jugador.
   Sale de los ojos del personaje y va hacia donde se mira. */
const _mo=new CANNON.Vec3(),_mt=new CANNON.Vec3(),_mrr=new CANNON.RaycastResult(),
      _mdir=new THREE.Vector3(),_mhp=new THREE.Vector3();
function melEye(out){
  const d=plDraw?plDraw():null;
  out.set(d?d.x:plBody.position.x,(d?d.y:plBody.position.y)+(PL.h-.28),d?d.z:plBody.position.z);
  return out;
}
function melHit(){
  const w=WEAP[WIX[MEL.w]]||weap();
  const M=MELW[MEL.w];
  const len=w.reach||2.2;
  melEye(_mhp);
  camDir(_mdir);
  _mo.set(_mhp.x,_mhp.y,_mhp.z);
  _mt.set(_mhp.x+_mdir.x*len,_mhp.y+_mdir.y*len,_mhp.z+_mdir.z*len);
  _mrr.reset();
  world.raycastClosest(_mo,_mt,RAY,_mrr);
  let hit=null;
  if(_mrr.hasHit){
    const hp=new THREE.Vector3(_mrr.hitPointWorld.x,_mrr.hitPointWorld.y,_mrr.hitPointWorld.z);
    const pr=_mrr.body&&_mrr.body.userData&&_mrr.body.userData.prop;
    hit={p:hp,prop:pr||null,d:+_mhp.distanceTo(hp).toFixed(3)};
    if(pr)nsafe(()=>hitProp(pr,hp,_mdir,w.imp||12,w.dmg||14),'melprop');
    if(typeof spark==='function')nsafe(()=>spark(hp,pr?.9:.6),'melspark');
    /* NO hay sample de piña en assets/hyper/snd (95 mp3, ninguno de golpe de puño) y
       generate_audio de Higgsfield sólo hace VOZ (text-to-speech): el modelo de efectos
       existe pero está reservado al pipeline de juegos. Así que el golpe se ARMA con los
       samples que hay, cambiando el tono con {rate}: un crack corto (bat-hit acelerado) más
       un golpe sordo (imp-plastic bajado). Para el bate, bat-hit a tono casi natural. */
    if(M&&M.imp&&typeof sPlay==='function')
      for(const s of M.imp)nsafe(()=>sPlay(s.n,{vol:s.vol,rate:s.rate,at:hp}),'melimp');
  }
  MEL.lastHit=hit?{p:[+hit.p.x.toFixed(2),+hit.p.y.toFixed(2),+hit.p.z.toFixed(2)],
                   prop:hit.prop?hit.prop.id:null,d:hit.d}:null;
  return hit;
}

/* ================= 4. capa de animación del torso ================= */
/* ¿hay que tomar el control del tren superior? Sí si hay un golpe en curso, si está volviendo
   del golpe, o si el arma en mano pide otro polo de reposo (guardia con los puños, idle de
   respiro con el bate). */
function melPoleKey(){
  if(MEL.on&&MACT[MEL.key])return MEL.key;
  const M=MELW[weap().id];
  if(M&&M.pole&&MACT[M.pole])return M.pole;
  return null;
}
const melActive=()=>!!(MPOLE&&(MEL.on||MEL.off>0||melPoleKey()));
const setAnim0=setAnim;
setAnim=function(st,sp,dt){
  if(!melActive())return setAnim0(st,sp,dt);
  if(!mixer||!ACTS[st])return;
  dt=dt||1/60;
  /* ---- piernas: igual que core_c (mismo criterio, mismas constantes) ---- */
  if(st!==animState){ if(st==='jump')ACTS[st].reset(); animState=st; }
  mixTo(ACTS,st,dt);
  const ts=st==='walk'?clamp(sp/3.1,.55,1.9):(st==='run'?clamp(sp/8.4,.7,1.5):1);
  if(!ACTS[st].userData_frozen)ACTS[st].timeScale=ts;
  else{ACTS[st].time=0;ACTS[st].timeScale=0;}
  /* ---- torso: UN SOLO POLO ----
     Acá está la razón de reasignar setAnim en vez de envolverlo: core_c llama
     mixTo(ACTU,'idle') todos los frames. Si además llamáramos mixTo(...,golpe) el peso del
     golpe se estabiliza en 1/(2-k) ≈ 0,55 y el puño llega a la mitad del recorrido. */
  const map=melPole();
  const key=melPoleKey()||melIdleKey();
  if(!key)return;
  for(let i=0;i<MELMIX;i++)mixTo(map,key,dt);
  /* el polo de reposo de core_c va CLAVADO en el cuadro 0 (su clip entero gira la cabeza en
     loop, ver la nota de core_c/setAnim); los clips míos de reposo (guardia, respiro) sí
     avanzan —para eso están— y los de golpe los mueve melStep escribiendo .time. */
  const ik=melIdleKey();
  if(ik&&map[ik]){map[ik].time=0;map[ik].timeScale=0;}
  const a=map[key];
  if(a&&MSPEC[key]&&MSPEC[key].loop){a.timeScale=1;}
};

/* ================= 5. agarre del bate ================= */
/* dos cosas: la pose de DESCANSO (bate al hombro) y el agarre RÍGIDO durante el swing. */
const holdWeapon0=holdWeapon;
holdWeapon=function(){
  const w=weap();
  const rb=bones.rHand||bones.rFore;
  /* en 1ª persona con viewmodel el arma cuelga de la mano del CLON: holdWeapon0 se autoexcluye
     y acá tampoco hay que hacer nada (el swing lo mueve el delta del viewmodel) */
  if(!wModel||!rb||wModel.parent!==rb)return holdWeapon0();
  if(MEL.on&&MEL.grip&&MEL.w===w.id){
    /* SWING: el bate acompaña la mano. Se le impone la transformada LOCAL que tenía en la
       pose de descanso, así la empuñadura sigue en la palma y la punta barre el arco de la
       animación. Si se dejara holdWeapon0(), el bate quedaría estabilizado hacia la puntería
       y el mazazo se vería como un palo quieto mientras el brazo gira debajo. */
    wModel.position.copy(MGRIP.p);
    wModel.quaternion.copy(MGRIP.q);
    wModel.scale.copy(MGRIP.s);
    wModel.updateMatrixWorld(true);
    nsafe(()=>armIK(),'melik');          /* la izquierda sigue al mango mientras gira */
    return;
  }
  holdWeapon0();
  const R=MREST[w.id];
  if(!R||!wModel)return;
  _mre.set(R.rx,R.ry,R.rz,'YXZ');
  _mrq.setFromEuler(_mre);
  wModel.quaternion.multiply(_mrq);      /* ejes LOCALES del arma: pivote en la empuñadura */
  /* VUELTA SUAVE DEL SWING AL DESCANSO. Al terminar el golpe el agarre pasa de rígido (la
     transformada de MGRIP) a estabilizado hacia la puntería: de un frame al otro el bate
     saltaba a la pose de descanso — medido con la distancia del puño derecho al eje del palo,
     que se mantiene en 6,4 cm TODO el swing (agarre rígido) y pegaba un pico de 9,5 cm en ese
     único cuadro. Se interpola con el mismo tiempo que la mezcla de la animación (MEL.off). */
  if(MEL.grip&&!MEL.on&&MEL.off>0&&MEL.w===w.id){
    const k=clamp(1-MEL.off/MELBLEND,0,1);
    wModel.position.lerpVectors(MGRIP.p,wModel.position,k);
    _mrq.copy(wModel.quaternion);
    wModel.quaternion.copy(MGRIP.q).slerp(_mrq,k);
  }
  wModel.updateMatrixWorld(true);
  nsafe(()=>armIK(),'melik2');           /* recalcular la izquierda con el bate ya girado */
};

/* ================= 6. 1ª persona (viewmodel) ================= */
/* ---- 6a. los PUÑOS se ven ----
   core_m ancla la muñeca en VMC.xyz cuando no hay arma, y ese punto está pensado para el
   ARMA (52 cm delante del ojo). Con la muñeca ahí el conjunto se corre 25 cm hacia atrás, el
   hombro queda DETRÁS de la cámara y el antebrazo cruza el plano cercano: 87,5% de la
   pantalla tapada (__H.vmDiff). MFIST es el punto natural de la pose: los mismos valores que
   FPT de core_c (a dónde lleva armIKR la mano derecha en 1ª persona), pasados al marco de la
   cámara (z hacia adelante = negativo). Así el brazo queda donde el IK lo puso y sólo se ven
   los puños en el tercio de abajo. */
/* MFIST: donde va la MUÑECA derecha en el marco de la cámara. Sale de la misma cuenta que
   fpHandTarget() de core_c para noModel (ahí el punto queda a 19,5 cm adelante y 13,5 cm abajo
   del ojo) pero un poco más lejos, porque lo que se VE es el puño y el puño está 16 cm más allá
   de la muñeca. Medido con __H.melFistNDC(): con z=-0.285 y=-0.205 la muñeca caía en NDC
   y=-1.00, o sea justo FUERA del cuadro por abajo (el medio campo vertical es 36° y ese punto
   está a 35,7° del eje). Con [.16,-.12,-.30] la muñeca queda en NDC (0.35,-0.55) y el puño,
   16 cm más adelante, en el tercio de abajo a la derecha. */
const MFIST=[.16,-.12,-.30];
/* dónde queda la EMPUÑADURA de un melee con modelo en el marco de la cámara (VMC.xyz es el
   punto pensado para las armas de fuego: el bate mide 86 cm y con la punta para arriba
   necesita venir más cerca y más abajo) */
const MELVMW={bat:[-.02,-.05,.19]};
/* ---- ANCLAJE DEL BATE EN 1ª PERSONA ----
   vmPlace() de core_m ancla el ARMA en (VMC.xyz, VMC.rxyz) y de ahí deduce dónde va la mano.
   Con el bate apoyado en el hombro, la transformada local del bate respecto de la mano trae la
   rotación de MREST: si el anclaje sigue pidiendo el arma "derecha", la MANO sale girada 58°
   para el otro lado — en la captura g2-melee-bat-idle1 (primera versión) se veía el brazo dado
   vuelta cruzando la pantalla y el bate de punta al piso.
   Se compone el anclaje con la MISMA rotación de MREST: la cuenta la cancela en la mano
   (hand = VMW·inv(L), y L ya lleva MREST) y el bate queda inclinado en la pantalla igual que en
   3ª persona, con la mano en la pose natural. */
const vmPlace0=(typeof vmPlace==='function')?vmPlace:null;
if(vmPlace0)vmPlace=function(){
  if(!vmChar||!vmHand)return false;
  const hasW=!!(wModel&&wModel.parent===vmHand);
  const R=MREST[weap().id];
  if(hasW&&!R)return vmPlace0();          /* armas de fuego: manda core_m tal cual */
  _vmS.setScalar(VMC.sc);
  if(hasW){
    const o=MELVMW[weap().id]||[0,0,0];
    _vmP.set(VMC.x+o[0],VMC.y+o[1],VMC.z+o[2]);
    _vmE.set(VMC.rx,VMC.ry,VMC.rz,'YXZ');
    _vmQ.setFromEuler(_vmE);
    _mre.set(R.rx,R.ry,R.rz,'YXZ');
    _mrq.setFromEuler(_mre);
    _vmQ.multiply(_mrq);
    _vmW.compose(_vmP,_vmQ,_vmS);
    relMat(vmChar,vmHand,_vmH);
    _vmM.compose(vmCap.p,vmCap.q,vmCap.s);
    _vmH.multiply(_vmM);
  }else{
    /* ---- LA ESCALA DEL RIG ----
       clon.matrix = VMW · inv(H) con H = mano relativa al clon. Este rig NO viene en metros
       (core_c ya lo dice en holdWeapon: "le saco la escala del rig", y palmLocal aclara que las
       unidades locales del hueso son cm), así que H trae una escala de ~1/100 y, si VMW se
       compone con escala 1, el clon queda escalado ~100: MEDIDO, con la mano derecha clavada en
       su punto el HOMBRO del clon caía a 36 m de la cámara (melVmCmp: rArm clon=[-9.19,-5.30,
       36.11]) — un antebrazo de decenas de metros pasando por el ojo. Ése es el 87,5% de
       pantalla tapada que se medía con los puños.
       Con arma no se nota porque la transformada local del arma (vmCap.s) ya lleva el factor
       1/escala del rig y se cancela. Sin arma hay que ponerlo a mano: se lee la escala de H. */
    relMat(vmChar,vmHand,_vmH);
    const e=_vmH.elements;
    const sH=Math.hypot(e[0],e[1],e[2])||1;
    _vmS.setScalar(VMC.sc*sH);
    _vmP.set(MFIST[0],MFIST[1],MFIST[2]);
    _vmW.compose(_vmP,vmCap.hq,_vmS);
  }
  _vmI.copy(_vmH).invert();
  _vmM.copy(_vmW).multiply(_vmI);
  _vmM.decompose(vmChar.position,vmChar.quaternion,vmChar.scale);
  vmChar.updateMatrix();
  return true;
};
/* ---- 6a-bis. EL PUÑO IZQUIERDO TAMBIÉN SE VE ----
   Con arma, la mano izquierda la lleva armIK al guardamano. Con los PUÑOS no hay arma: armIK
   se corta sola (gspec.none) y la izquierda se queda donde la deja el clip. Con la guardia de
   boxeo eso la dejaba 2,4 cm DELANTE DE LA CÁMARA (medido: el puño izquierdo proyectaba en NDC
   (2.59,1.48) con z>1, o sea detrás del plano cercano) y su antebrazo entraba por arriba de la
   pantalla — 107 píxeles pegados al borde superior en __H.vmDiff().
   Así que en 1ª persona la izquierda va a un punto FIJO del marco de la cámara, igual que la
   derecha (armIKR): las dos manos forman la guardia y ninguna se mete en el ojo. Se usa el
   mismo twoBone() y la misma disciplina de caché que armIK (ikRestore antes / ikStore después),
   que es lo que evita que el giro se acumule frame a frame. */
/* z=-.35 y no -.255: con el objetivo del puño a 25,5 cm la MUÑECA queda a ~10 cm de la cámara
   (el puño está 16 cm más adelante que el hueso, así que la muñeca se planta 16 cm ANTES) y el
   plano cercano está en 0,12 — el antebrazo lo cruzaba y aparecía estirado en el borde de
   arriba (medido: 100 px pegados al borde superior en __H.vmDiff()). A 35 cm la muñeca queda a
   ~19 cm, con 7 cm de margen, y el hombro llega igual (0,35 m de los 0,42 m de brazo). */
const MFISTL=[-.15,-.15,-.35];
const LPOLE=[.62,-1,.30];      /* el codo izquierdo sale hacia afuera (a su izquierda) y abajo */
const _mfp=new THREE.Vector3(),_mfd=new THREE.Vector3(),_mfr=new THREE.Vector3(),
      _mfu=new THREE.Vector3(),_mfo=new THREE.Vector3(),_mfw=new THREE.Vector3(),
      _mfe=new THREE.Vector3(),_mfs=new THREE.Vector3(),_mfv=new THREE.Vector3(),
      _mfk=new THREE.Vector3(),_mfq=new THREE.Quaternion();
function melFpLeft(){
  if(!PL.fp||PL.rag||!charRoot||!ikBones())return false;
  if(!weap().noModel)return false;           /* con arma manda armIK */
  /* MIENTRAS HAY GOLPE, NO. Clavar la izquierda en un punto de la pantalla todos los frames le
     gana al clip: con el gancho izquierdo el puño real no se movía (recorrido medido 0,36 m en
     el mundo contra 2,53 m en 3ª persona, extensión 0,14 m contra 0,59 m). El puño tiene que
     hacer el golpe de verdad —es lo que mide la sonda, lo que tira la sombra y lo que define el
     delta del viewmodel—; la guardia vuelve sola cuando el golpe termina. */
  if(MEL.on)return false;
  const ha=IK.ha,up=IK.up;
  camera.updateMatrixWorld(true);
  _mfd.set(0,0,-1).applyQuaternion(camera.quaternion);
  _mfr.set(1,0,0).applyQuaternion(camera.quaternion);
  _mfu.set(0,1,0).applyQuaternion(camera.quaternion);
  /* objetivo del PUÑO (no de la muñeca) en el marco de la cámara */
  _mfp.copy(camera.position)
      .addScaledVector(_mfr,MFISTL[0])
      .addScaledVector(_mfu,MFISTL[1])
      .addScaledVector(_mfd,-MFISTL[2]);
  _mfo.copy(_mfr).multiplyScalar(-LPOLE[0]);
  _mfo.y+=LPOLE[1];
  _mfo.addScaledVector(_mfd,-LPOLE[2]).normalize();
  ikRestore();
  const ok=melArmTo(up,IK.fo,ha,ha,_mfp,_mfo);
  ikStore();
  return ok;
}
/* IK de brazo con EL OBJETIVO EN EL PUÑO, no en la muñeca (misma lección que armIK en core_c):
   el hueso está ~16 cm detrás de donde la malla dibuja la mano, así que pedirle a la MUÑECA que
   vaya al punto deja el puño 16 cm más allá — y "más allá", con un punto a 25 cm de la cara, es
   ADENTRO DE LA CÁMARA (medido: el puño izquierdo proyectaba con z=-19,9, detrás del plano
   cercano, y su antebrazo tapaba el borde de arriba de la pantalla). Se planta la muñeca a
   |puño| del objetivo, del lado del hombro, y después se gira la mano para que el puño aterrice
   justo en el punto. refBone es de quién se toma el vector hueso->puño: para el clon del
   viewmodel hay que pasar el hueso REAL (palmLocal se mide del skinning de charRoot y el hueso
   del clon no está en ese esqueleto), que sirve igual porque es el mismo rig. */
function melArmTo(up,fo,ha,refBone,tgt,pole){
  const pl=palmLocal(refBone);
  ha.updateWorldMatrix(true,false);
  _mfe.setFromMatrixPosition(ha.matrixWorld);
  let PLEN=0;
  if(pl){_mfw.copy(pl).applyMatrix4(ha.matrixWorld);PLEN=_mfw.distanceTo(_mfe);}
  up.updateWorldMatrix(true,false);
  _mfs.setFromMatrixPosition(up.matrixWorld);
  _mfk.copy(tgt);                              /* objetivo del puño */
  _mfv.copy(_mfs).sub(_mfk);
  const d=_mfv.length();
  if(PLEN>1e-4&&d>1e-5)_mfv.multiplyScalar(Math.min(PLEN,d)/d);else _mfv.set(0,0,0);
  _mfw.copy(_mfk).add(_mfv);                   /* objetivo de la muñeca */
  const ok=twoBone(up,fo,ha,_mfw,pole);
  if(ok&&pl&&PLEN>1e-4){
    _mfe.setFromMatrixPosition(ha.matrixWorld);
    _mfv.copy(pl).applyMatrix4(ha.matrixWorld).sub(_mfe);
    _mfs.copy(_mfk).sub(_mfe);
    if(_mfv.lengthSq()>1e-8&&_mfs.lengthSq()>1e-8){
      _mfq.setFromUnitVectors(_mfv.normalize(),_mfs.normalize());
      worldTwist(ha,_mfq);
    }
  }
  return ok;
}
/* ---- 6c-bis. LA IZQUIERDA DEL CLON NO SUELTA EL BATE ----
   El delta del clip es una rotación por hueso: aplicado sobre una pose BASE distinta a la del
   clip (la del clon es la de armIK, con la izquierda ya puesta en el mango) NO conserva el punto
   de contacto — medido en 1ª persona, el puño izquierdo del viewmodel se despegaba 28 cm del
   palo con ganancia .30 y 49 cm con ganancia 1. Así que después del delta se le resuelve el IK
   a la izquierda del CLON sobre el mango del bate, que es lo mismo que hace armIK con el cuerpo
   real. No acumula: cada frame la pose del clon se rearma desde MVMC y este IK es absoluto. */
const _mgt=new THREE.Vector3(),_mgp=new THREE.Vector3();
function melVmGrip(){
  if(!vmChar||!vmBoneMap||!wModel||!vmHand||wModel.parent!==vmHand)return false;
  const g=wModel.userData._g;if(!g||g.bad||g.S.none)return false;
  if(!bones.lHand||!bones.lFore)return false;
  const bl=vmBoneMap[bones.lHand.name],bf=vmBoneMap[bones.lFore.name];
  if(!bl||!bf)return false;
  const bu=(bf.parent&&bf.parent.isBone)?bf.parent:null;
  if(!bu)return false;
  camera.updateMatrixWorld(true);
  wModel.updateWorldMatrix(true,false);
  /* punto del mango donde va la izquierda (lh1 del rig de agarre) */
  _mgt.copy(g.lh1).applyMatrix4(wModel.matrixWorld);
  /* codo hacia abajo y afuera EN EL MARCO DE LA CÁMARA (el conjunto vive pegado a la pantalla) */
  _mgp.set(-1,-1,.2).applyQuaternion(camera.quaternion).normalize();
  return melArmTo(bu,bf,bl,bones.lHand,_mgt,_mgp);
}
/* ---- 6b. no recapturar en mitad de un golpe ----
   vmCapture() congela la pose actual y re-ancla: si corre durante el swing, el viewmodel
   queda con el brazo a mitad de piña y anclado ahí. Se bloquea mientras hay golpe y se pide
   una recaptura limpia cuando termina (y también cuando cambia el polo de reposo: la guardia
   y el idle de respiro tardan ~0,1 s en mezclar, y la captura del equip agarra la pose
   vieja). */
const vmCapture0=(typeof vmCapture==='function')?vmCapture:null;
let melRecap=0,melPoleWas='';
if(vmCapture0)vmCapture=function(){
  if(MEL.on||MEL.off>0)return false;
  return vmCapture0();
};
/* ---- 6c. el golpe en el viewmodel: DELTA del clip sobre la pose congelada ----
   El clon de core_m está congelado en una pose y anclado por la mano: copiarle la pose real
   entera lo haría saltar (la pose real del brazo derecho en 1ª persona es la de armIKR, no la
   del clip) y además traería el torso y el balanceo de la caminata, que es justo lo que core_m
   sacó. Entonces se copia SÓLO la cadena de los dos brazos, y como DELTA:
       q_clon = slerp(identidad, A·R⁻¹, w) · C
   R = pose del brazo en el mixer ANTES del golpe (se toma en ikSnap, que corre justo después
   de mixer.update y antes del IK de 1ª persona), A = la misma pose ahora (con el golpe),
   C = la pose que tiene el clon (la capturada). Con A=R queda C: no hay salto ni al empezar
   ni al terminar. w = el peso de la acción del golpe, que ya viene mezclado por mixTo, así
   que el brazo del viewmodel entra y sale exactamente con la animación. */
const MELARM=['rArm','rFore','rHand','lArm','lFore','lHand'];
const MSNAP={};                     /* pose de referencia R por hueso (nombre -> Quaternion) */
const MNOW={};                      /* pose A del frame */
let melSnapOk=false;
function melSnapTake(){
  if(!bones)return;
  for(const k of MELARM){
    const b=bones[k];if(!b)continue;
    (MSNAP[k]||(MSNAP[k]=new THREE.Quaternion())).copy(b.quaternion);
  }
  melSnapOk=true;
}
/* ikSnap() corre en animStep justo después de mixer.update()+torsoAim()+breathe() y ANTES de
   rikRestore/armIKR: es el único punto del frame donde los brazos tienen la pose PURA del
   mixer. Se lo envuelve para tomar ahí la referencia (mientras no haya golpe) y la pose del
   golpe (mientras lo haya). */
const ikSnap0=ikSnap;
ikSnap=function(){
  if(MEL.on||MEL.off>0){
    for(const k of MELARM){const b=bones[k];if(b)(MNOW[k]||(MNOW[k]=new THREE.Quaternion())).copy(b.quaternion);}
  }else{
    melSnapTake(false);
  }
  return ikSnap0();
};
/* en 1ª persona armIKR() lleva la mano derecha al punto de la pantalla: durante el golpe eso
   pisa la animación (y con ella el delta del viewmodel y la medición del recorrido del puño).
   Se lo saltea mientras hay golpe; ikSnap/rikRestore ya están escritos para tolerarlo (si el
   hueso no coincide con lo que dejó el IK, refrescan la referencia con la pose del mixer). */
const armIKR0=armIKR;
armIKR=function(){
  if(MEL.on&&MELVM.arm)return false;
  return armIKR0();
};
/* constantes del golpe en 1ª persona, tocables con __H.melSet */
const MELVM={
  arm:1,        /* 1 = el brazo del viewmodel hace el delta del clip */
  /* GANANCIA del delta en 1ª persona (por arma se puede pisar con MELW[].armK).
     A 1 el viewmodel hace el golpe COMPLETO y el gancho izquierdo —0,66 m de recorrido, un
     barrido circular que cruza todo el cuerpo— se ve como dos antebrazos enredados girando
     sobre sí mismos a 30 cm del ojo. Los FPS achican el gesto en primera persona justamente por
     esto. MEDIDO con capturas leídas una por una (g2fp-k*.png) y con __H.vmDiff(): a .30 queda
     un golpe corto y legible, con los dos puños en la mitad de abajo y CERO píxeles tocando los
     bordes izquierdo, derecho y superior (edge={left:0,right:0,top:0}), o sea que no entra
     ningún codo en cuadro. El empuje de VMG sube a .13 m para compensar el gesto más corto.
     El recorrido REAL no cambia con esto: el cuerpo de verdad hace el clip entero, y es ése el
     que mide la sonda, el que tira la sombra y el que ven los otros jugadores. */
  armK:.30,
  push:.13,     /* empuje del conjunto hacia adelante en el pico (m) */
  drop:.022,    /* y un poco abajo */
  roll:.030     /* y una pizca de rotación, para que no sea una traslación pura */
};
const _mq1=new THREE.Quaternion(),_mq2=new THREE.Quaternion(),_mid=new THREE.Quaternion();
function melVmArm(){
  if(!MELVM.arm||!vmOn||!vmChar||!vmBoneMap||!melSnapOk)return false;
  const a=MEL.act;if(!a)return false;
  const M=MELW[MEL.w];
  const gain=(M&&M.armK!=null)?M.armK:MELVM.armK;
  const w=clamp(a.weight,0,1)*clamp(gain,0,1);
  for(const k of MELARM){
    const b=bones[k];if(!b)continue;
    const d=vmBoneMap[b.name];if(!d)continue;
    const R=MSNAP[k],A=MNOW[k]||b.quaternion;
    /* sin la pose base del clon (MVMC) no se puede aplicar el delta sin acumular: se saltea */
    if(!R||!MVMC[k])continue;
    _mq1.copy(A).multiply(_mq2.copy(R).invert());     /* D = A·R⁻¹ (en el marco del padre) */
    _mid.identity().slerp(_mq1,w);                    /* el delta entra con el peso del clip */
    d.quaternion.copy(_mid).multiply(MVMC[k]);
  }
  vmChar.updateMatrixWorld(true);
  return true;
}
/* pose CAPTURADA del clon (C): se guarda la primera vez que hay clon y golpe, y se refresca
   cada vez que no hay golpe (o sea, cada vez que el clon está en su pose de reposo). */
const MVMC={};
function melVmBase(){
  if(!vmBoneMap)return;
  for(const k of MELARM){
    const b=bones[k];if(!b)continue;
    const d=vmBoneMap[b.name];if(!d)continue;
    (MVMC[k]||(MVMC[k]=new THREE.Quaternion())).copy(d.quaternion);
  }
}
/* empuje del conjunto: VMG lo escribe vmMotion() como offset ABSOLUTO cada frame (misma
   lección que la deriva de 57° de la respiración), así que acá se SUMA después, con la misma
   campana que el peso del golpe. No se toca la cámara: el retroceso de cámara es sólo el
   recoil de MELW (< 2°). */
const vmMotion0=(typeof vmMotion==='function')?vmMotion:null;
if(vmMotion0)vmMotion=function(dt){
  vmMotion0(dt);
  if(!VMG)return;
  if(!(MEL.on||MEL.off>0)){melVmBase();return;}
  const a=MEL.act;
  const w=a?clamp(a.weight,0,1):0;
  /* la campana: sube con el peso y baja después del impacto */
  const k=MEL.on?w:w*.6;
  const s=(MEL.side==='L')?-1:1;
  VMG.position.z-=MELVM.push*k;
  VMG.position.y-=MELVM.drop*k;
  VMG.position.x-=MELVM.push*.25*k*s;
  _mre.set(0,0,MELVM.roll*k*s,'YXZ');
  _mrq.setFromEuler(_mre);
  VMG.quaternion.multiply(_mrq);
  nsafe(()=>melVmArm(),'melvmarm');
  nsafe(()=>melVmGrip(),'melvmgrip');
  camera.updateMatrixWorld(true);
};

/* ================= 7. el motor: enganche por frame ================= */
/* animStep(dt) es el punto exacto: melStep antes (el clip tiene que tener el .time del frame
   puesto ANTES de mixer.update, si no el impacto se calcula con la pose del frame anterior). */
/* ---- el torso puede girar con el golpe ----
   torsoAim() (core_c) alinea la línea de hombros con la puntería: es lo que endereza al
   personaje, que en el clip de reposo viene 49° torcido. Pero un golpe ES una rotación de
   hombros, así que a peso 1 torsoAim se la comía entera. Se le baja la GANANCIA (TWG, un let
   de core_c) con el peso del golpe: el personaje sigue mirando a donde apunta —la que decide
   a quién le pega es la mira, no el torso— y el golpe conserva su giro. Vuelve sola a 1
   porque el peso baja a 0 al terminar. */
const MELTW=.55;
const animStep0=animStep;
animStep=function(dt){
  nsafe(()=>melStep(dt),'melstep');
  if(typeof TWG==='number'){
    const w=(MEL.on&&MEL.act)?clamp(MEL.act.weight,0,1):0;
    TWG=1-MELTW*w;
  }
  animStep0(dt);
  /* el puño izquierdo a su punto de la pantalla: DESPUÉS de animStep0 porque ahí adentro corre
     armIKR (la derecha) y la cámara de este frame ya está puesta por camStep del anterior */
  if(PL.fp)nsafe(()=>melFpLeft(),'melfpl');
  /* recaptura limpia del viewmodel cuando el golpe terminó del todo o cambió el polo */
  const pk=(MELW[weap().id]&&MELW[weap().id].pole)||'';
  if(pk!==melPoleWas){melPoleWas=pk;melRecap=.35;}
  if(melRecap>0&&!MEL.on&&MEL.off<=0){
    melRecap-=dt;
    if(melRecap<=0&&vmCapture0&&typeof vmOn!=='undefined'&&vmOn)nsafe(()=>vmCapture0(),'melrecap');
  }
};
/* pedir los clips en el primer frame de partida (ver melLoad) */
EXT.frame.push(dt=>{
  if(!melAsked&&APP==='play')nsafe(()=>melLoad(),'melload');
  if(melGot>Object.keys(MACT).length)nsafe(()=>melBuild(),'melbuild');
});

/* ================= 8. remotos (fantasmas de core_f) ================= */
/* CÓMO VIAJA EL GOLPE. El paquete de estado de core_f (k:'s') lo arma state() DENTRO del
   closure de NET: no se puede agregar un campo desde afuera, y onMsg() sólo copia los campos
   que conoce (a=0..3 para la animación), así que un campo extra en el paquete de estado no
   llegaría al otro lado ni sirve para un evento instantáneo (el estado va a 12 Hz y se
   descarta si "no cambió").
   El único canal que entrega el mensaje COMPLETO a un hook reasignable es el de props
   (k:'o' -> NET.onProp). Así que el golpe viaja como un prop reservado, i:'__mel', con s = el
   código del clip (1 jab, 2 gancho, 3 mazazo). COMPATIBLE CON CLIENTES VIEJOS: el onProp de
   core_f arranca con `if(!PDEF[d.i])return;` — un id de prop que no existe se ignora y no
   pasa nada. Y los clientes viejos siguen mandando sólo a=0..3: acá no se rompe nada, el
   fantasma simplemente no golpea. */
function melNetSend(key){
  if(typeof MP==='undefined'||!MP||!NET||!NET.on||!NET.room)return false;
  const c=MCODE.indexOf(key);
  if(c<=0)return false;
  nsafe(()=>NET.pubRoom({k:'o',id:NET.ID,i:'__mel',s:c,w:wIdx|0}),'melnet');
  return true;
}
const MELG={};                       /* golpes de otros, por id de peer */
const melOnProp0=NET.onProp;
NET.onProp=d=>{
  if(d&&d.i==='__mel'){
    const key=MCODE[Math.max(0,Math.min(MCODE.length-1,d.s|0))];
    if(key&&MCU[key])MELG[d.id]={key:key,t:0,a:null};
    return;
  }
  if(melOnProp0)return melOnProp0(d);
};
/* una acción por fantasma y por clip, creada la primera vez que ese fantasma golpea.
   LOS PESOS SE ESCRIBEN A MANO (no fadeIn/fadeOut): en core_f las acciones nacen con
   setEffectiveWeight(0), y fadeIn() no escribe weight sino que programa un interpolante que
   lo MULTIPLICA — con weight=0 el fade nunca lo levanta (es el mismo bug de three.js que
   documenta core_c). Escribiendo .weight el golpe se ve seguro; y al terminar se le devuelve
   peso 1 al polo de reposo del torso del fantasma. */
function melGhostStep(dt){
  for(const id in MELG){
    const m=MELG[id];
    const g=(typeof GH==='object')&&GH[id];
    if(!g||!g.mixer){ if((m.t+=dt)>1.5)delete MELG[id]; continue; }
    const S=MSPEC[m.key];
    if(!m.a){
      g._mact=g._mact||{};
      if(!g._mact[m.key]){
        const a=nsafe(()=>g.mixer.clipAction(MCU[m.key]),'gmelact');
        if(!a){delete MELG[id];continue;}
        a.enabled=true;a.timeScale=0;a.weight=0;a.play();
        g._mact[m.key]=a;
      }
      m.a=g._mact[m.key];
      m.a.stopFading();
      m.dur=(S.t1-S.t0)/S.sp;
    }
    m.t+=dt;
    const k=clamp(m.t/.10,0,1);                       /* mezcla de entrada, 0,10 s */
    const out=clamp((m.dur+MELBLEND-m.t)/MELBLEND,0,1);
    const w=Math.min(k,out);
    m.a.enabled=true;m.a.weight=w;
    m.a.time=Math.min(S.t1,S.t0+Math.min(m.t,m.dur)*S.sp);
    /* mientras el golpe manda, el torso de reposo del fantasma se hace a un lado */
    if(g.actu)for(const q in g.actu){const b=g.actu[q];if(!b)continue;
      b.stopFading();b.weight=1-w;if(b.weight<0)b.weight=0;}
    if(m.t>=m.dur+MELBLEND){
      m.a.weight=0;
      if(g.actu){const want=g.actu.idle?'idle':(g.actu.walk?'walk':null);
        for(const q in g.actu){const b=g.actu[q];if(!b)continue;
          b.stopFading();b.weight=(q===want?1:0);
          if(q===want){b.time=0;b.timeScale=0;}}}
      delete MELG[id];
    }
  }
}
const ghostsStep0=ghostsStep;
ghostsStep=function(dt){
  nsafe(()=>melGhostStep(dt),'melghost');
  return ghostsStep0(dt);
};
/* ---- el BATE de los otros: mismo agarre que el propio ----
   ghostHold() (core_f) estabiliza el arma hacia el yaw del otro, igual que holdWeapon() con el
   propio: sin esto los demás se ven apuntando el bate al frente como si fuera un fusil. Y
   mientras el fantasma está pegando, el bate tiene que acompañar SU mano (agarre rígido), si no
   el mazazo se ve como un palo quieto con el brazo girando debajo. Las dos cosas son la misma
   corrección que se le hace al jugador local, hecha desde acá para no tocar core_f. */
const ghostHold0=ghostHold;
ghostHold=function(g){
  if(!g||!g.wm)return ghostHold0(g);
  const m=MELG[g.id];
  if(m&&m.gp){
    g.wm.position.copy(m.gp);g.wm.quaternion.copy(m.gq);g.wm.scale.copy(m.gs);
    return;
  }
  const r=ghostHold0(g);
  const w=WEAP[g.wIdx]||null;
  const R=w&&MREST[w.id];
  if(R){
    _mre.set(R.rx,R.ry,R.rz,'YXZ');
    _mrq.setFromEuler(_mre);
    g.wm.quaternion.multiply(_mrq);
  }
  /* si este fantasma acaba de empezar un golpe, se congela el agarre tal como quedó */
  if(m&&!m.gp){
    m.gp=g.wm.position.clone();m.gq=g.wm.quaternion.clone();m.gs=g.wm.scale.clone();
  }
  return r;
};

/* ================= 9. instrumentación ================= */
if(DEV&&window.__H)Object.assign(window.__H,{
  melInfo:()=>({on:!!MEL.on,key:MEL.key,w:MEL.w,t:+MEL.t.toFixed(3),dur:+MEL.dur.toFixed(3),
    hitAt:+MEL.hitAt.toFixed(3),side:MEL.side,n:MEL.n,off:+MEL.off.toFixed(3),
    grip:!!MEL.grip,pole:melPoleKey(),clips:Object.keys(MACT),
    got:melGot,pend:melPend,
    weight:MEL.act?+MEL.act.weight.toFixed(3):null,
    clipT:MEL.act?+MEL.act.time.toFixed(3):null,
    lastHit:MEL.lastHit,ghosts:Object.keys(MELG).length}),
  melSet:(k,v)=>{ if(k in MELVM){MELVM[k]=+v;return MELVM[k];}
    if(MREST.bat&&k in MREST.bat){MREST.bat[k]=+v;return MREST.bat[k];}
    return null;},
  melFreeze:b=>{MELFRZ=!!b;if(mixer)mixer.timeScale=MELFRZ?0:1;return MELFRZ;},
  /* ¿DÓNDE CAEN LOS PUÑOS EN LA PANTALLA? (1ª persona)
     Se mide el punto que DIBUJA la malla (palmLocal), no el hueso de la muñeca: el hueso está
     16 cm antes y con él no se sabe si el puño entra en cuadro. Devuelve NDC (-1..1) del puño
     del CLON (el viewmodel) y del cuerpo real. */
  melFistNDC:()=>{
    const o={};
    const ndc=b=>{const p=melPalm(b);if(!p)return null;
      p.project(camera);return [+p.x.toFixed(3),+p.y.toFixed(3),+p.z.toFixed(3)];};
    o.realR=ndc(bones.rHand);o.realL=ndc(bones.lHand);
    if(vmBoneMap&&bones.rHand){
      const dr=vmBoneMap[bones.rHand.name],dl=bones.lHand&&vmBoneMap[bones.lHand.name];
      o.vmR=dr?ndc(dr):null;o.vmL=dl?ndc(dl):null;
      /* el hueso de la muñeca también, para separar "la mano está en cuadro" de "el brazo
         entra por el borde" */
      if(dr){const p=new THREE.Vector3().setFromMatrixPosition(dr.matrixWorld).project(camera);
        o.vmWristR=[+p.x.toFixed(3),+p.y.toFixed(3)];}
    }
    o.fist=MFIST.slice();
    return o;
  },
  melFistAt:(x,y,z)=>{if(x!=null)MFIST[0]=+x;if(y!=null)MFIST[1]=+y;if(z!=null)MFIST[2]=+z;
    nsafe(()=>{if(typeof vmPlace==='function')vmPlace();},'melfa');return MFIST.slice();},
  /* posición de un hueso RESPECTO DE LA CADERA en el marco del personaje: es el mismo número
     que da el FK offline sobre el GLB (scratchpad/glbfk.js), así se puede comparar lo que hace
     el motor con lo que dice el clip, cuadro por cuadro */
  melBone:(n)=>{
    const T=melUpRoot();if(!T||!charRoot)return null;
    const hip=T.parent;
    let b=null;charRoot.traverse(o=>{if(!b&&o.isBone&&o.name===n)b=o;});
    if(!b)return null;
    b.updateWorldMatrix(true,false);hip.updateWorldMatrix(true,false);
    const p=new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    const h=new THREE.Vector3().setFromMatrixPosition(hip.matrixWorld);
    charRoot.worldToLocal(p);charRoot.worldToLocal(h);
    return [+(p.x-h.x).toFixed(3),+(p.y-h.y).toFixed(3),+(p.z-h.z).toFixed(3)];
  },
  /* comparar hueso por hueso el CLON con el cuerpo real (para saber si la pose se copió bien) */
  melVmCmp:()=>{
    if(!vmBoneMap)return null;
    const o={};
    const ci=new THREE.Matrix4().copy(camera.matrixWorld).invert();
    const F=v=>[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)];
    for(const k of MELARM){
      const b=bones[k];if(!b)continue;
      const d=vmBoneMap[b.name];if(!d)continue;
      b.updateWorldMatrix(true,false);
      const pr=new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).applyMatrix4(ci);
      const pc=new THREE.Vector3().setFromMatrixPosition(d.matrixWorld).applyMatrix4(ci);
      o[k]={real:F(pr),clon:F(pc),
        dq:+(Math.abs(b.quaternion.x-d.quaternion.x)+Math.abs(b.quaternion.y-d.quaternion.y)
            +Math.abs(b.quaternion.z-d.quaternion.z)+Math.abs(b.quaternion.w-d.quaternion.w)).toFixed(4)};
    }
    return o;
  },
  /* qué `hold` haría que el EJE del arma pase por el centro del puño derecho.
     hold está en el marco de puntería [derecha, arriba, adelante] y holdWeapon lo aplica como
     grip_mundo = muñeca + R_aim·(H0,H1,-H2), así que el hold ideal es
     R_aim⁻¹·(puño - muñeca) con el signo de Z invertido. */
  melHoldFit:()=>{
    const b=bones.rHand||bones.rFore;if(!b||!wModel)return null;
    b.updateWorldMatrix(true,false);
    const w=new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    const p=melPalm(b);if(!p)return null;
    const e=new THREE.Euler(PL.fp?PL.pitch:clamp(PL.pitch,-.7,.7)*.55,PL.yaw,0,'YXZ');
    const q=new THREE.Quaternion().setFromEuler(e).invert();
    const d=p.clone().sub(w).applyQuaternion(q);
    return {hold:[+d.x.toFixed(3),+d.y.toFixed(3),+(-d.z).toFixed(3)],
      now:(weap().hold||[]).slice(),palmLen:+p.distanceTo(w).toFixed(3)};
  },
  melFplDiag:()=>{
    const o={fp:PL.fp,noModel:!!weap().noModel,ik:ikBones(),
      bones:{up:IK.up&&IK.up.name,fo:IK.fo&&IK.fo.name,ha:IK.ha&&IK.ha.name,cl:IK.cl&&IK.cl.name}};
    const r=melFpLeft();
    o.ran=r;
    if(IK.ha){IK.ha.updateWorldMatrix(true,false);
      const p=new THREE.Vector3().setFromMatrixPosition(IK.ha.matrixWorld);
      const c=new THREE.Vector3().copy(camera.position);
      o.wristCam=[+(p.x-c.x).toFixed(3),+(p.y-c.y).toFixed(3),+(p.z-c.z).toFixed(3)];
      o.tgt=[+_mfp.x.toFixed(3),+_mfp.y.toFixed(3),+_mfp.z.toFixed(3)];
      o.dTgt=+p.distanceTo(_mfp).toFixed(4);
      if(IK.up){IK.up.updateWorldMatrix(true,false);
        const s=new THREE.Vector3().setFromMatrixPosition(IK.up.matrixWorld);
        o.shTgt=+s.distanceTo(_mfp).toFixed(3);
        IK.fo.updateWorldMatrix(true,false);
        const e=new THREE.Vector3().setFromMatrixPosition(IK.fo.matrixWorld);
        o.reach=+(s.distanceTo(e)+e.distanceTo(p)).toFixed(3);}
    }
    return o;
  },
  melDiag:()=>{
    const T=melUpRoot(),H=melHref();
    const q=x=>x?[+x.x.toFixed(3),+x.y.toFixed(3),+x.z.toFixed(3),+x.w.toFixed(3)]:null;
    return {upRoot:T?T.name:null,hip:T?T.parent.name:null,
      href:q(H),hipNow:T?q(T.parent.quaternion):null,
      reb:Object.keys(MCU),twg:(typeof TWG==='number')?+TWG.toFixed(3):null,
      torsoOn:(typeof torsoOn!=='undefined')?torsoOn:null,
      spn:(typeof SPN!=='undefined')?SPN.map(b=>b.name):null,
      actu:Object.keys(ACTU).map(k=>k+':'+ACTU[k].weight.toFixed(3)),
      acts:Object.keys(ACTS).map(k=>k+':'+ACTS[k].weight.toFixed(3)),
      mact:Object.keys(MACT).map(k=>k+':'+MACT[k].weight.toFixed(3))};
  },
  melFist:()=>{const p=melPalm(melSideBone());return p?[+p.x.toFixed(4),+p.y.toFixed(4),+p.z.toFixed(4)]:null;},
  melTip:()=>{const p=melTip();return p?[+p.x.toFixed(4),+p.y.toFixed(4),+p.z.toFixed(4)]:null;},
  /* distancias de agarre: la izquierda al eje del arma (lhDist de core_c), la izquierda al
     tramo del MANGO donde tiene que ir (lh0..lh1) y la derecha a la empuñadura */
  melGrip:()=>{
    if(!wModel)return null;
    const g=wModel.userData._g;if(!g||g.bad)return null;
    /* updateWorldMatrix(true,...) y NO updateMatrixWorld(true): el primero refresca la CADENA
       DE PADRES (el hueso de la mano, que en medio del swing gira 6 rad/s) y el segundo sólo
       baja desde el objeto. Con el segundo la matriz del bate quedaba un frame atrasada
       respecto del puño y la distancia medida se inflaba con la velocidad angular: daba 11,3 cm
       en el pico del mazazo y 6,4 cm quieto, con el agarre RÍGIDO en los dos casos (o sea que
       la geometría no había cambiado: el error era del medidor). */
    wModel.updateWorldMatrix(true,true);
    const A=g.lh0.clone().applyMatrix4(wModel.matrixWorld),
          B=g.lh1.clone().applyMatrix4(wModel.matrixWorld),
          O=new THREE.Vector3().setFromMatrixPosition(wModel.matrixWorld),
          X0=g.ax0.clone().applyMatrix4(wModel.matrixWorld),
          X1=g.ax1.clone().applyMatrix4(wModel.matrixWorld);
    /* EN 1ª PERSONA EL BATE CUELGA DE LA MANO DEL CLON (core_m), no de la del cuerpo real: hay
       que medir las manos DEL CLON o el número no significa nada (medía 1,06 m, que es la
       distancia entre el cuerpo real y el viewmodel, no un agarre suelto). El vector
       hueso->puño es del rig, así que el mismo palmLocal del hueso real sirve aplicado a la
       matriz del hueso del clon. */
    const vm=!!(vmHand&&wModel.parent===vmHand&&vmBoneMap);
    const bl=vm?vmBoneMap[bones.lHand.name]:bones.lHand,
          br=vm?vmBoneMap[bones.rHand.name]:bones.rHand;
    const pOf=(real,use)=>{
      if(!use)return null;
      use.updateWorldMatrix(true,false);
      const pl=palmLocal(real),o=new THREE.Vector3();
      if(pl)o.copy(pl).applyMatrix4(use.matrixWorld);
      else o.setFromMatrixPosition(use.matrixWorld);
      return o;
    };
    const lp=pOf(bones.lHand,bl),rp=pOf(bones.rHand,br);
    const seg=(p,a,b)=>{const AB=b.clone().sub(a);
      const u=clamp(p.clone().sub(a).dot(AB)/Math.max(1e-9,AB.lengthSq()),0,1);
      return a.clone().add(AB.multiplyScalar(u)).distanceTo(p);};
    /* lh/rh = puño al TRAMO DEL MANGO (lh0..lh1, donde van las dos manos).
       lax/rax = puño al EJE del bate (ax0..ax1): "la mano está sobre el palo".
       rh mide grande a propósito (~13 cm) y no es un error: el hueso de la muñeca está 16 cm
       detrás de donde la malla dibuja el puño (palmLocal) y la empuñadura se planta en la
       palma con el `hold` de la tabla, así que el centroide del puño derecho queda naturalmente
       a un puño de distancia del ORIGEN del rig. Lo que tiene que estar pegado es el puño al
       PALO: eso es rax. */
    return {ax:+(lhDist()||0).toFixed(4),
      lh:lp?+seg(lp,A,B).toFixed(4):null,
      lax:lp?+seg(lp,X0,X1).toFixed(4):null,
      rh:rp?+rp.distanceTo(O).toFixed(4):null,
      rax:rp?+seg(rp,X0,X1).toFixed(4):null};
  },
  /* ---- SONDA DEL GOLPE ----
     dispara un golpe y avanza el motor frame a frame con el MISMO orden que frame() de
     core_b, guardando lo que hace falta para medir: recorrido del puño/punta, en qué cuadro
     cayó el impacto, distancia de las manos al mango y desvío de la cámara. */
  melProbe:(o)=>{
    o=o||{};
    const n=o.n||70,dt=1/60,rec=[];
    fireT=0;HOLD.fire=1;
    for(let i=0;i<n;i++){
      playerStep(dt);weaponStep(dt);world.step(dt,dt,2);
      for(const p of actives())if(!p.frozen)syncMat(p);
      placeChar();animStep(dt);holdWeapon();camStep(dt);
      if(i===0)HOLD.fire=0;
      const f=melPalm(melSideBone()),t=melTip();
      const gr=window.__H.melGrip();
      /* el cabeceo REAL de la vista sale del vector de la cámara: camera.rotation.x no sirve
         para esto (el Euler que guarda three es XYZ y con yaw=π devuelve π-pitch: daba 180°
         de "desvío" que no existe). Se compara asin(fwd.y) con PL.pitch: la diferencia es
         exactamente el retroceso. */
      camera.getWorldDirection(_mdir);
      rec.push({t:+((i+1)*dt).toFixed(4),
        f:f?[+f.x.toFixed(4),+f.y.toFixed(4),+f.z.toFixed(4)]:null,
        tip:t?[+t.x.toFixed(4),+t.y.toFixed(4),+t.z.toFixed(4)]:null,
        pl:[+plBody.position.x.toFixed(4),+plBody.position.y.toFixed(4),+plBody.position.z.toFixed(4)],
        w:MEL.act?+MEL.act.weight.toFixed(3):0,
        ct:MEL.act?+MEL.act.time.toFixed(3):0,
        on:MEL.on?1:0,hit:(MEL.hitFrame===i+1)?1:0,
        lh:gr?gr.lh:null,rh:gr?gr.rh:null,lax:gr?gr.lax:null,rax:gr?gr.rax:null,
        pitch:+Math.asin(clamp(_mdir.y,-1,1)).toFixed(5),plp:+PL.pitch.toFixed(5)});
    }
    return {rec,hitFrame:MEL.hitFrame,hitAt:+MEL.hitAt.toFixed(4),dur:+MEL.dur.toFixed(4),
      key:MEL.key,side:MEL.side,lastHit:MEL.lastHit};
  },
  /* inyectar un golpe de otro jugador (para probar los fantasmas sin broker) */
  melFake:(id,code)=>{if(NET.onProp)NET.onProp({k:'o',id:id,i:'__mel',s:code|0});
    return Object.keys(MELG).length;},
  melGhost:()=>{const o={};for(const id in MELG){const m=MELG[id];
    o[id]={key:m.key,t:+m.t.toFixed(3),w:m.a?+m.a.weight.toFixed(3):null};}return o;},
  /* posición de un hueso de un FANTASMA respecto de su raíz: para medir que el golpe también
     se mueve del lado de los otros jugadores */
  melGhostBone:(id,n)=>{
    const g=(typeof GH==='object')&&GH[id];
    if(!g||!g.root)return null;
    let b=null;g.root.traverse(o=>{if(!b&&o.isBone&&o.name===n)b=o;});
    if(!b)return null;
    b.updateWorldMatrix(true,false);
    const p=new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    g.root.worldToLocal(p);
    return [+p.x.toFixed(4),+p.y.toFixed(4),+p.z.toFixed(4)];
  }
});
