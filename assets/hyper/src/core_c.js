
/* ============================================================
   HYPER SANDBOX — capa de ANIMACIÓN y AGARRE del personaje
   (este archivo se concatena después de core_a.js y core_b.js:
    ya existen THREE, CANNON, bones, charRoot, mixer, CLIPS, ACTS,
    wModel, weap(), PL, plBody, clamp, grounded, inWater, chestAnchor)
   ============================================================ */
/* ---- dos capas de animación ----
   Los clips generados son genéricos: el de caminar abre los brazos como un avión.
   Partimos cada clip en TREN INFERIOR (cadera y piernas) y TREN SUPERIOR (torso, brazos):
   las piernas usan caminar/correr/saltar y el torso se queda con el de reposo, que es
   justo la pose en la que se generó el personaje (sosteniendo el arma).
   Son datos de animación reales en las dos capas, no una pose procedural. */
const UPPER=/(spine|chest|torso|neck|head|shoulder|clavicle|arm|elbow|hand|finger|thumb|index|middle|ring|pinky)/i;
function splitClip(clip,which){
  const tr=clip.tracks.filter(t=>{
    const bone=t.name.split('.')[0].replace(/^.*\//,'');
    const up=UPPER.test(bone);
    return which==='up'?up:!up;});
  if(!tr.length)return null;
  return new THREE.AnimationClip(clip.name+'|'+which,clip.duration,tr);
}
const ACTU={};
/* ---- POR QUÉ ACÁ NO SE USA setEffectiveWeight/fadeIn/fadeOut ----
   El personaje "no caminaba, sólo parpadeaba": corriendo o parado las piernas quedaban
   CLAVADAS en la pose de referencia (recorrido del pie medido: 0.0000 m en los tres ejes en
   180 frames) y sólo el clip de caminar animaba.
   La causa es de three.js: setEffectiveWeight(0) escribe action.weight=0, y fadeIn()/fadeOut()
   NO escriben weight, programan un interpolante que lo MULTIPLICA (_updateWeight hace
   weight = this.weight * interpolante). reset() tampoco lo restaura. O sea que idle/run/jump
   nacían con weight=0 y el fadeIn(.22) de setAnim() no los podía levantar NUNCA: su reloj
   corría con peso efectivo 0 para siempre.
   Así que acá el peso lo maneja mixTo() escribiendo .weight a mano, y nadie más lo toca. */
function buildActions(){
  if(!mixer)return;
  for(const k in CLIPS){
    if(ACTS[k])continue;
    const low=splitClip(CLIPS[k],'low')||CLIPS[k];
    const a=mixer.clipAction(low);
    a.enabled=true;a.weight=(k==='walk'?1:0);
    if(k==='jump'){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}
    ACTS[k]=a;a.play();          // todas suenan; el peso decide cuál se ve
    const up=splitClip(CLIPS[k],'up');
    if(up){ const b=mixer.clipAction(up);
      b.enabled=true;b.weight=0;b.play();ACTU[k]=b; }
  }
  /* el torso se queda con el reposo (o con caminar si el reposo aún no llegó) */
  const key=ACTU.idle?'idle':(ACTU.walk?'walk':null);
  if(key)for(const k in ACTU){ACTU[k].enabled=true;ACTU[k].weight=(k===key?1:0);}
}
/* mezcla exponencial de un polo: la suma de los pesos arranca en 1 y se queda en 1 (los
   objetivos suman 1), así el mixer nunca se queda sin nadie escribiendo un hueso. Antes, cada
   cambio de estado hacía reset()+fadeIn desde 0: el clip volvía a t=0 y la pose SALTABA
   (medido: hasta 27,8 cm de pie en un frame) — eso era el "parpadeo". */
const AFADE=10;                  // 1/s: llega al 95% en ~0.30 s (los .22 de antes eran a mano)
function mixTo(map,want,dt){
  const k1=Math.min(1,AFADE*Math.max(0,dt));
  for(const k in map){ const a=map[k];
    a.enabled=true;
    if(!a.isRunning())a.play();
    a.weight+=((k===want?1:0)-a.weight)*k1;
    if(a.weight<1e-3&&k!==want)a.weight=0;
  }
}
function setAnim(st,sp,dt){
  if(!mixer||!ACTS[st])return;
  /* sólo el salto se rearma (es LoopOnce + clampWhenFinished: si no se resetea queda pegado
     en el último cuadro). Los cíclicos NO se resetean: por eso ya no hay salto de pose. */
  if(st!==animState){ if(st==='jump')ACTS[st].reset(); animState=st; }
  mixTo(ACTS,st,dt||1/60);
  /* EL TORSO SIEMPRE EN REPOSO. Es la pose en la que se generó el personaje (sosteniendo el
     arma) y es la que el IK de los brazos da por sentada. El clip de salto del tren superior
     abría los brazos y soltaba el agarre, y encima era el que dejaba la capa de arriba en peso
     0 al titilar jump<->idle: los brazos y la cabeza se quedaban sin nadie que los escriba y
     el snapshot del IK los congelaba. */
  const want=(ACTU.idle?'idle':(ACTU.walk?'walk':null));
  if(want)mixTo(ACTU,want,dt||1/60);
  const ts=st==='walk'?clamp(sp/3.1,.55,1.9):(st==='run'?clamp(sp/8.4,.7,1.5):1);
  ACTS[st].timeScale=ts;
}
function animStep(dt){
  if(!mixer)return;
  const sp=Math.hypot(plBody.velocity.x,plBody.velocity.z);
  /* HISTÉRESIS en los umbrales: PL.spd (6.4) queda a 1 m/s del umbral de correr, así que
     subir una rampa o rozar una pared hacía cruzar el límite ida y vuelta varias veces por
     segundo (medido: 4,66 cambios de estado por segundo saltando). Cada cambio relanzaba la
     mezcla y se veía como un tirón. */
  const rTh=animState==='run'?6.2:7.4;
  const wTh=(animState==='walk'||animState==='run')?.35:.55;
  let st;
  if(PL.rag)st='jump';
  /* y en el AIRE no se sale de 'jump' aunque |vy| pase por 0 en el vértice del salto */
  else if(!grounded&&!inWater&&(Math.abs(plBody.velocity.y)>1.1||animState==='jump'))
    st=ACTS.jump?'jump':'walk';
  else if(sp>rTh)st=ACTS.run?'run':'walk';
  else if(sp>wTh)st='walk';
  else st=ACTS.idle?'idle':'walk';
  setAnim(st,sp,dt);
  mixer.update(dt);
  torsoAim();    // enderezar el torso hacia la puntería
  ikSnap();      // guardar la pose que dejó la animación, antes de tocar nada
  /* el brazo derecho sube a la línea de los ojos en 1ª persona. Va acá y no en
     holdWeapon() porque holdWeapon() se corta cuando no hay arma: con los PUÑOS o con el
     bate la pantalla quedaba vacía, sin manos. */
  if(PL.fp){rikRestore();armIKR();rikStore();}
  fpHead();
}
/* EN 1ª PERSONA LA CABEZA SE RECORTA (antes se le ponía escala .001 al hueso).
   La cámara va en los ojos (es la única forma de que el brazo alcance el arma sin saturar el
   IK, ver camStep), así que la cabeza y el cuello cruzan el plano cercano y los triángulos que
   lo cruzan salen como esquirlas flotando.
   ENCOGER EL HUESO NO SIRVE: los vértices que el skinning reparte entre cabeza y cuello se
   quedan a medio camino y estiran triángulos larguísimos hasta ese punto — son las dos púas
   verdosas que entraban desde abajo al mirar para arriba.
   Entonces no se toca la geometría: se le pone un PLANO DE RECORTE a los materiales, unos
   centímetros delante de la cámara y mirando adonde mira ella. Todo lo que queda atrás
   (cabeza, cuello, pecho) desaparece sin deformarse. Dos detalles:
     - el plano va SÓLO en las mallas con skin (o.isSkinnedMesh). El arma cuelga del hueso de
       la mano, o sea que está dentro de charRoot: si el recorte fuera del grupo entero, también
       se comería el arma.
     - recorta únicamente lo que está DETRÁS de la cámara, así que aunque el material se
       comparta con otros personajes no les saca nada visible (lo de atrás no se dibuja igual).
   clipShadows queda en false (el default), así la sombra del jugador sigue completa. */
/* 0.125 y no 0.14: CORRIENDO la mano derecha entra y sale del recorte (medido a lo largo de la
   zancada: 0.140 / 0.141 / 0.145 / 0.151 / 0.164 m contra el plano) y en esos cuadros el fusil se
   veía flotando sin mano. La cabeza y el cuello quedan DETRÁS de la cámara (medido: -0.16 a -0.11),
   así que bajar el plano no los devuelve a cuadro; y el plano cercano de la cámara está en 0.12,
   o sea que 0.125 sigue estando delante de él. */
const FPCLIPD=.112;   /* medido en la zancada: la mano derecha baja hasta 0.125 m de la cámara y
                         el brazo YA está estirado al máximo (el IK se satura corriendo), así que
                         empujar el objetivo no la aleja: hay que bajar el plano. Queda 1,3 cm de
                         margen contra la mano y 2,2 cm contra el plano cercano de la cámara. */
const FPCLIP=new THREE.Plane(new THREE.Vector3(0,0,-1),0),FPCLIPA=[FPCLIP];
const _fcd=new THREE.Vector3(),_fcp=new THREE.Vector3();
let fpClipOn=false,fpClipMats=null;
function fpClipMaterials(){
  if(fpClipMats)return fpClipMats;
  if(!charRoot)return null;
  const a=[];
  charRoot.traverse(o=>{ if(!o.isSkinnedMesh)return;
    const ms=Array.isArray(o.material)?o.material:[o.material];
    for(const m of ms)if(m&&a.indexOf(m)<0)a.push(m); });
  return a.length?(fpClipMats=a):null;
}
/* se llama al final de camStep(), cuando la cámara ya quedó puesta: el plano tiene que salir de
   la pose de ESTE frame o al girar rápido se ve un pedazo de cabeza un fotograma. */
function fpClip(){
  const ms=fpClipMaterials();if(!ms)return;
  const on=!!(PL.fp&&!PL.rag&&!freeCam);
  if(on){
    camera.getWorldDirection(_fcd);
    _fcp.copy(camera.position).addScaledVector(_fcd,FPCLIPD);
    FPCLIP.setFromNormalAndCoplanarPoint(_fcd,_fcp);
  }
  if(on===fpClipOn)return;                 // cambiar clippingPlanes recompila el shader
  fpClipOn=on;
  for(const m of ms){m.clippingPlanes=on?FPCLIPA:null;m.needsUpdate=true;}
}
/* el hueso de la cabeza vuelve a escala 1 y se queda ahí: ya no se encoge nada */
function fpHead(){
  const h=bones.head;if(!h)return;
  if(h.scale.x!==1){h.scale.setScalar(1);h.updateMatrixWorld(true);}
}

/* ============================================================
   AGARRE A DOS MANOS
   ------------------------------------------------------------
   1) el arma se acomoda en la mano derecha (rigGrip + holdWeapon)
   2) la mano izquierda va al guardamano con IK analítico de dos huesos
   ============================================================ */

/* ---- 1. cómo se toma cada arma ----------------------------------------
   Todo en el espacio del rig del arma, que después de rigGrip() queda así:
     origen  = la empuñadura (donde va el puño derecho)
     -Z      = el caño / la punta,  +Y = arriba,  +X = a la derecha del arma
   gf : fracción del largo, desde la culata, donde cae la empuñadura
   gy : altura de la empuñadura dentro del arma (0 = centro, .5 = techo)
   ay : altura del eje del caño respecto del centro (para el punto de la izquierda)
   lz : cuánto adelante de la empuñadura agarra la mano izquierda (fracción del largo)
   lx : corrimiento lateral de la mano izquierda (metros)
   two: 0 = agarre de pistola (la izquierda se pega a la derecha)
   fat: la punta GORDA va adelante (el bate)
   flip: dar vuelta el modelo media vuelta (1). Arranca apagado en todas: ver la nota de
         abajo sobre por qué acá ya no se mide nada. */
const GSPEC={
  _rifle : {gf:.30,gy:.24,ay:.33,lz:.20,lx:-.045,ly:-.055,two:1},
  _pistol: {gf:.34,gy:.22,ay:.50,lz:.20,lx:-.030,ly:-.020,two:0},
  _melee : {gf:.11,gy:.02,ay:.02,lz:.13,lx:-.020,ly:-.020,two:1,fat:1},
  pistol  :{gf:.34,gy:.22,ay:.50,lz:.20,lx:-.030,ly:-.020,two:0},
  revolver:{gf:.32,gy:.22,ay:.50,lz:.17,lx:-.030,ly:-.020,two:0},
  physgun :{gf:.30,gy:.24,ay:.30,lz:.30,lx:-.045,ly:-.055,two:1},
  gravgun :{gf:.30,gy:.24,ay:.30,lz:.30,lx:-.045,ly:-.055,two:1},
  toolgun :{gf:.34,gy:.22,ay:.45,lz:.24,lx:-.030,ly:-.020,two:0},
  smg     :{gf:.30,gy:.24,ay:.32,lz:.26,lx:-.045,ly:-.055,two:1},
  akm     :{gf:.29,gy:.24,ay:.34,lz:.19,lx:-.045,ly:-.055,two:1},
  shotgun :{gf:.29,gy:.24,ay:.30,lz:.18,lx:-.045,ly:-.055,two:1},
  sniper  :{gf:.28,gy:.26,ay:.22,lz:.15,lx:-.045,ly:-.055,two:1},
  crossbow:{gf:.30,gy:.24,ay:.28,lz:.20,lx:-.045,ly:-.055,two:1},
  /* el RPG va al hombro: la izquierda toma el mango de adelante */
  rpg     :{gf:.30,gy:.26,ay:.30,lz:.14,lx:-.045,ly:-.058,two:1},
  bat     :{gf:.10,gy:.02,ay:.02,lz:.12,lx:-.020,ly:-.020,two:1,fat:1},
  hands   :{gf:.30,gy:.20,ay:.20,lz:0,  lx:0,   ly:0,   two:0,none:1}
};
function gspec(w){
  return GSPEC[w.id]||(w.kind==='melee'?GSPEC._melee:
    ((w.len||.5)<=.36?GSPEC._pistol:GSPEC._rifle));
}
/* ¿HAY QUE DAR VUELTA EL MODELO?  NO.
   Acá había un medidor (thinEnd) que rebanaba el modelo a lo largo del eje Z del rig y
   comparaba el área de las dos puntas para decidir de qué lado quedaba el caño, pisando lo
   que había decidido muzzleDir() en core_b. Dos problemas, los dos comprobados con capturas
   del arma sola (__H.wsolo, mirada desde +X: la punta del rig cae siempre a la derecha):
     1) NO ERA DETERMINISTA. Medía con inv(wModel.matrixWorld)·mesh.matrixWorld, y wModel
        cuelga del hueso de la mano (o de la cámara en 1ª persona), con rotación y escala.
        La cancelación no es exacta y el error alcanzaba para dar vuelta la comparación:
        la MISMA pistola salía para adelante o para atrás según la partida (medido: pistol
        thin=1 en una corrida y thin=-1 en la siguiente, con el mismo modelo).
     2) Cuando medía, medía MAL. Con las 12 armas con modelo puestas de perfil se ve que
        muzzleDir() acierta el sentido en TODAS: lo correcto es no dar vuelta ninguna
        (akm, pistol, sniper, rpg, physgun, gravgun, bat, shotgun, smg, revolver, crossbow,
        toolgun). El medidor pedía dar vuelta rpg, smg y crossbow, entre otras.
   Así que el sentido del modelo se toma de S.flip, que arranca en 0 para todas. Queda como
   perilla por arma para cuando entre un modelo nuevo mal orientado, sin heurística de por
   medio que lo pueda romper de una partida a la otra. */

/* Transformación EXACTA de o al espacio de root: se multiplican SÓLO matrices locales, así
   no depende de dónde esté colgada el arma ni arrastra el error de invertir matrixWorld. */
const _rmS=[];
function relMat(root,o,out){
  _rmS.length=0;
  let n=o;
  while(n&&n!==root){_rmS.push(n);n=n.parent;}
  out.identity();
  if(n!==root)return out;
  for(let i=_rmS.length-1;i>=0;i--){const b=_rmS[i];b.updateMatrix();out.multiply(b.matrix);}
  return out;
}
/* GDLT (declarado en core_b) = corrimiento de la empuñadura respecto del HUESO de la mano
   derecha. Acá pasa a estar en el MARCO DE PUNTERÍA — [a la derecha, arriba, adelante] en
   metros — que es donde se puede razonar: el hueso de la muñeca queda arriba y atrás de
   donde la malla dibuja el puño, así que el arma baja y se va un poco al frente. */
GDLT[0]=.010;GDLT[1]=-.070;GDLT[2]=.060;

/* medida del arma en su propio espacio: el modelo está centrado en el origen de
   wModel.children[0], así que su tamaño no cambia cuando movemos ese grupo */
const _gb=new THREE.Box3(),_gv=new THREE.Vector3(),_gm=new THREE.Matrix4();
function wSize(wm){
  _gb.makeEmpty();
  wm.traverse(o=>{ if(!o.isMesh||!o.geometry)return;
    if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
    const bb=o.geometry.boundingBox;
    relMat(wm,o,_gm);
    for(let i=0;i<8;i++){
      _gv.set(i&1?bb.max.x:bb.min.x,i&2?bb.max.y:bb.min.y,i&4?bb.max.z:bb.min.z);
      _gb.expandByPoint(_gv.applyMatrix4(_gm)); } });
  return _gb.getSize(new THREE.Vector3());
}
/* Deja el rig del arma listo para agarrarla: la punta a -Z (adelante) y la empuñadura
   justo en el origen, o sea en el puño derecho. */
function rigGrip(wm,w){
  if(wm.userData._g)return wm.userData._g;
  const inner=wm.children[0];
  if(!inner){wm.userData._g={bad:1};return wm.userData._g;}
  if(wm.userData._ry0===undefined)wm.userData._ry0=inner.rotation.y;
  inner.rotation.y=wm.userData._ry0;         // siempre medir sobre el modelo como vino
  wm.updateWorldMatrix(true,true);
  const sz=wSize(wm);
  const S=gspec(w), L=Math.max(.04,sz.z);
  /* rigWeapon() (core_b) ya dejó el modelo mirando a -Z, con el mdir de la tabla o, si no
     lo trae, midiéndolo. Acá NO se vuelve a medir: S.flip es la única perilla, y arranca
     apagada para todas (ver la nota de arriba). */
  const flip=!!S.flip;
  inner.rotation.y=wm.userData._ry0+(flip?Math.PI:0);
  inner.position.set(0,sz.y*S.gy,L*(S.gf-.5));
  /* lg = a cuántos METROS de la empuñadura toma la mano izquierda, propio de cada arma
     (una pistola no se agarra como un AK). Si no está, se cae a la fracción del largo. */
  const ay=sz.y*S.ay,
        lz=(w.lg>0)?Math.min(w.lg,L*(1-S.gf)*.92)
                   :(S.two?L*S.lz:Math.min(.085,L*S.lz));
  const g={len:L,sz:sz,S:S,flip:flip,
    /* eje del caño, en el espacio del rig: de la culata (+Z) a la punta (-Z) */
    ax0:new THREE.Vector3(0,ay,L*S.gf),
    ax1:new THREE.Vector3(0,ay,-L*(1-S.gf)),
    /* Dónde va el PUÑO izquierdo (no la muñeca: ver palmLocal): sobre el arma, corrido al
       costado y un poco abajo del eje, que es por donde se envuelve un guardamano.
       Con pistola cae a la altura del puño derecho, o sea la izquierda envuelve la derecha. */
    lh0:new THREE.Vector3(S.lx,(S.two?ay:ay*.5)+S.ly,0),
    lh1:new THREE.Vector3(S.lx,(S.two?ay:ay*.5)+S.ly,-lz)};
  wm.userData._g=g;
  return g;
}

const _hv=new THREE.Vector3(),_hv2=new THREE.Vector3();
const _bq=new THREE.Quaternion(),_bs=new THREE.Vector3(),_wq=new THREE.Quaternion(),
      _bi=new THREE.Quaternion(),_we=new THREE.Euler();
/* El arma es HIJA DEL HUESO de la mano: acompaña la animación. Le estabilizamos la
   rotación (y le saco la escala del rig) para que el caño apunte a donde mira el jugador
   en vez de girar con la muñeca, y la corro dentro de la palma con GDLT. */
function holdWeapon(){
  if(!wModel)return;
  rigGrip(wModel,weap());     // también en 1ª persona: si no, el arma queda al revés
  if(PL.fp&&wModel.parent===vmGroup){
    /* con la empuñadura en el origen del rig hay que recolocar el arma de 1ª persona:
       queda a la derecha y abajo, y el caño se va solo para adelante */
    if(wModel.parent!==bones.rHand&&wModel.parent!==bones.rFore){
      wModel.scale.setScalar(.66);
      wModel.position.set(.17,-.20,-.30);
      wModel.rotation.set(.02,-.05,.02);
    }
    return;
  }
  const b=bones.rHand||bones.rFore;
  if(!b||wModel.parent!==b)return;
  b.updateWorldMatrix(true,false);
  b.matrixWorld.decompose(_hv,_bq,_bs);
  const k=1/Math.max(.0001,_bs.x);
  wModel.scale.set(k,k,k);
  /* dónde se apoya la empuñadura dentro de la palma: cada arma trae su hold en la tabla
     (una pistola se mete más adentro del puño que un fusil), GDLT es el respaldo.
     Está en el marco de puntería (adelante = -Z): lo paso al espacio del hueso. */
  const H=weap().hold||GDLT;
  /* Las armas largas metían la culata en el pecho (el RPG salía por el costado izquierdo):
     lo que sobresale DETRÁS del puño es len*gf, y el pecho está a unos 15 cm de la mano.
     Se corre el arma a la derecha y se la gira unos grados, así la culata pasa al costado de
     las costillas en vez de atravesarlas. El caño sigue apuntando a donde se mira (el giro
     máximo es ~9°, y los disparos salen del rayo de la cámara igual). */
  const gg=wModel.userData._g;
  const back=gg?gg.len*gg.S.gf:0;
  const ex=clamp((back-.15)*.60,0,.09), eyaw=clamp((back-.15)*.55,0,.16);
  /* EN 1ª PERSONA EL ARMA SIGUE EL CABECEO COMPLETO: con el .55 y el tope en 40° se quedaba
     abajo al mirar para arriba (se la veía por debajo). En 3ª persona se deja el 55%, que es lo
     que hace que el personaje no quede haciendo cosas raras con los hombros. */
  _we.set(PL.fp?clamp(PL.pitch,-1.25,1.25):clamp(PL.pitch,-.7,.7)*.55,PL.yaw+eyaw,0,'YXZ');
  _wq.setFromEuler(_we);
  _bi.copy(_bq).invert();
  wModel.quaternion.copy(_bi).multiply(_wq);
  _hv2.set(H[0]+ex,H[1],-H[2]).applyQuaternion(_wq)
      .applyQuaternion(_bi).multiplyScalar(k);
  wModel.position.copy(_hv2);
  wModel.updateMatrixWorld(true);
  armIK();
}

/* ============================================================
   1ª PERSONA: EL ARMA SUBE A LA LÍNEA DE LOS OJOS
   ------------------------------------------------------------
   La cámara va en la cabeza, así que las manos del clip de reposo (a la altura del pecho)
   caen fuera del campo de visión: no se ve nada. Entonces en 1ª persona se lleva la MANO
   DERECHA con IK a un punto delante de la cara — abajo y a la derecha, como en cualquier
   FPS — y como el arma cuelga de esa mano, sube con ella. La mano izquierda sigue al arma
   con el IK que ya estaba. Los brazos que se ven son los del personaje, no un "view model".
   FPT = [a la derecha, abajo, adelante] en metros, respecto de los ojos.
   ============================================================ */
const FPT=[.185,-.225,.305];
const RIK={};
function rikBones(){
  if(RIK.ok!==undefined)return RIK.ok;
  const fo=bones.rFore,ha=bones.rHand;
  if(!fo||!ha){RIK.ok=false;return false;}
  const up=fo.parent&&fo.parent.isBone?fo.parent:bones.rArm;
  if(!up){RIK.ok=false;return false;}
  RIK.up=up;RIK.fo=fo;RIK.ha=ha;
  RIK.ok=true;return true;
}
/* punto del mundo al que tiene que ir el puño derecho en 1ª persona */
const _fe=new THREE.Vector3(),_ff=new THREE.Vector3(),_fr=new THREE.Vector3(),
      _fu=new THREE.Vector3();
function fpHandTarget(out){
  const ps=Math.sin(PL.pitch),pc=Math.cos(PL.pitch),
        ys=Math.sin(PL.yaw),yc=Math.cos(PL.yaw);
  /* EL ORIGEN ES LA CÁMARA DE VERDAD (el hueso de la cabeza + 16 cm, igual que camStep), no
     una altura calculada del cuerpo físico. Con la cuenta vieja el punto salía 33 cm por
     DEBAJO de la cámara — plBody.position.y es el centro de la cápsula, no los pies — y al
     mirar arriba esos 33 cm se le restaban al "adelante": la mano terminaba a 3 cm de la
     cámara (medido con __H.fpDiag), o sea detrás del plano cercano, y el arma desaparecía. */
  const hb=bones.head;
  if(hb){
    hb.updateWorldMatrix(true,false);
    _fe.setFromMatrixPosition(hb.matrixWorld);
    _fe.set(_fe.x-ys*.16,_fe.y+.045,_fe.z-yc*.16);
  } else _fe.set(plBody.position.x-ys*.14,
          plBody.position.y+(PL.h-.28)+.02,
          plBody.position.z-yc*.14);
  _ff.set(-ys*pc,ps,-yc*pc);
  _fr.set(yc,0,-ys);
  /* las armas cortas necesitan subir y acercarse, si no quedan como un puntito en la
     esquina: k va de 0 (fusil largo) a 1 (pistola) */
  /* con los PUÑOS no hay arma: la mano tiene que subir del todo o no se ve nada */
  const wl=weap().noModel?.12:(weap().len||.5);
  const k=clamp((.55-wl)/.35,0,1);
  /* EL OBJETIVO VA EN EL MARCO DE LA CÁMARA, NO EN EL DEL MUNDO.
     Antes el "abajo" era vertical del mundo (out.y+=FPT[1]) mientras el "adelante" seguía el
     cabeceo: mirando al cielo con pitch .95 el adelante sube 0.81·.30 = 25 cm y el abajo no
     compensa nada, así que la mano terminaba a la altura de los ojos y a 17 cm de la cara. El
     arma, que cuelga de esa mano y encima gira con el cabeceo completo, se iba arriba y atrás
     del cuadro: mirando arriba no se veía en ninguna parte.
     Usando el ARRIBA de la cámara (_fu = adelante girado 90°) el punto queda SIEMPRE en el
     mismo lugar de la pantalla — abajo a la derecha — mire donde mire, que es lo que hace
     cualquier FPS. Y la distancia al hombro no crece: a pitch .95 son ~45 cm contra los ~55 cm
     de brazo, o sea el IK no se satura. */
  _fu.set(-ys*(-ps),pc,-yc*(-ps));      // arriba de la cámara = (adelante) rotado +90° en pitch
  /* MIRANDO ARRIBA EL ARMA SE ACERCA A LA CARA. Con el punto siempre a 30 cm el hombro queda
     abajo y atrás, y hacen falta 67 cm de brazo cuando hay 53 (medido con __H.fpDiag: needR
     0.672 contra reachR 0.531): el IK se saturaba, la mano se quedaba 14 cm corta y el arma
     salía del cuadro por arriba. Así que a partir del horizonte el punto se acerca y sube un
     poco — como cuando uno levanta el fusil al cielo, que lo pega más al cuerpo. */
  const pu=clamp(PL.pitch,0,1.1)/1.1;
  /* y se corre HACIA AFUERA (a la derecha) al mismo tiempo: el antebrazo pasa muy cerca del
     objetivo de la cámara y, si queda en el medio, el plano cercano lo corta al medio de la
     pantalla y se ve una cuña de piel. Corrido a la derecha el corte queda contra el borde. */
  out.copy(_fe).addScaledVector(_fr,FPT[0]-.025*k+.075*pu)
               .addScaledVector(_ff,(FPT[2]-.075*k)*(1-.32*pu))
               .addScaledVector(_fu,(FPT[1]+.075*k)*(1-.50*pu));
  /* corriendo, la pose acerca la mano a la cámara y quedaba al filo del recorte: se la empuja
     un poco hacia adelante, proporcional a la velocidad (3 cm a fondo) */
  const spF=Math.hypot(plBody.velocity.x,plBody.velocity.z);
  if(spF>1)out.addScaledVector(_ff,Math.min(.03,spF*.004));   // ayuda, pero el brazo ya está al límite
  /* MIRANDO ABAJO EL ARMA ATRAVESABA EL CUERPO (el usuario lo mostró: el caño cruzando la pierna).
     La forma sana no es darle colisión al cuerpo — eso pelearía con el IK y costaría carísimo por
     frame — sino la que usan los shooters: al bajar la mira el arma se ADELANTA y se corre a la
     derecha, de modo que pasa POR FUERA del torso y de la pierna en vez de por dentro. Es
     determinista y no cuesta nada: un corrimiento proporcional al cabeceo negativo. */
  const pd=clamp(-PL.pitch,0,1.2)/1.2;
  if(pd>0)out.addScaledVector(_ff,.20*pd).addScaledVector(_fr,.055*pd)
             .addScaledVector(_fu,-.02*pd);
  return out;
}
/* IK de dos huesos genérico: lleva la punta de la cadena (ha) al punto pT del mundo, con el
   codo saliendo hacia pole. Devuelve false si la cadena no sirve. */
const _rA=new THREE.Vector3(),_rB=new THREE.Vector3(),_rE=new THREE.Vector3(),
      _rT=new THREE.Vector3(),_rd=new THREE.Vector3(),_rc=new THREE.Vector3(),
      _rp=new THREE.Vector3(),_rx=new THREE.Vector3(),
      _rq=new THREE.Quaternion(),_rq2=new THREE.Quaternion();
function twoBone(up,fo,ha,pT,pole){
  up.updateWorldMatrix(true,false);fo.updateWorldMatrix(true,false);ha.updateWorldMatrix(true,false);
  _rA.setFromMatrixPosition(up.matrixWorld);
  _rB.setFromMatrixPosition(fo.matrixWorld);
  _rE.setFromMatrixPosition(ha.matrixWorld);
  const a=_rA.distanceTo(_rB),b=_rB.distanceTo(_rE);
  if(a<1e-4||b<1e-4)return false;
  const R=(a+b)*.985;
  _rT.copy(pT);
  _rd.copy(_rT).sub(_rA);
  if(_rd.length()>R)_rT.copy(_rA).addScaledVector(_rd.normalize(),R);   // si no alcanza
  _rd.copy(_rT).sub(_rA);
  const c=clamp(_rd.length(),Math.abs(a-b)+1e-3,a+b-1e-3);
  _rd.normalize();
  const alpha=Math.acos(clamp((a*a+c*c-b*b)/(2*a*c),-1,1));
  _rx.copy(_rd).cross(pole);
  if(_rx.lengthSq()<1e-6)_rx.set(0,1,0);
  _rx.normalize();
  _rq.setFromAxisAngle(_rx,alpha);
  _rc.copy(_rd).applyQuaternion(_rq);                    // dirección hombro->codo deseada
  _rq.setFromUnitVectors(_rp.copy(_rB).sub(_rA).normalize(),_rc);
  worldTwist(up,_rq);
  _rB.setFromMatrixPosition(fo.matrixWorld);
  _rE.setFromMatrixPosition(ha.matrixWorld);
  _rc.copy(_rE).sub(_rB);
  _rp.copy(_rT).sub(_rB);
  if(_rc.lengthSq()<1e-8||_rp.lengthSq()<1e-8)return true;
  _rq2.setFromUnitVectors(_rc.normalize(),_rp.normalize());
  worldTwist(fo,_rq2);
  return true;
}
/* el codo derecho sale hacia abajo y hacia atrás-afuera */
const RPOLE=[.45,-1,.55];
const _rpo=new THREE.Vector3(),_rtg=new THREE.Vector3();
function armIKR(){
  if(!PL.fp||PL.rag||!rikBones())return false;
  const ys=Math.sin(PL.yaw),yc=Math.cos(PL.yaw);
  /* derecha=(yc,0,-ys), atrás=(ys,0,yc) */
  _rpo.set(yc*RPOLE[0]+ys*RPOLE[2],RPOLE[1],-ys*RPOLE[0]+yc*RPOLE[2]).normalize();
  return twoBone(RIK.up,RIK.fo,RIK.ha,fpHandTarget(_rtg),_rpo);
}

/* ---- 2. IK analítico de dos huesos para el brazo izquierdo ----
   bones.lArm es la CLAVÍCULA (LeftShoulder) en este rig: el hombro de verdad es su hijo
   (LeftArm) y es el que gira. Cadena: lArm(clavícula) > hombro > lFore(codo) > lHand. */
const IK={};
function ikBones(){
  if(IK.ok!==undefined)return IK.ok;
  const fo=bones.lFore,ha=bones.lHand;
  if(!fo||!ha){IK.ok=false;return false;}
  let up=fo.parent&&fo.parent.isBone?fo.parent:bones.lArm;
  if(!up){IK.ok=false;return false;}
  IK.up=up;IK.fo=fo;IK.ha=ha;IK.cl=(bones.lArm&&bones.lArm!==up)?bones.lArm:null;
  IK.ok=true;return true;
}
const _pA=new THREE.Vector3(),_pB=new THREE.Vector3(),_pE=new THREE.Vector3(),
      _pT=new THREE.Vector3(),_t0=new THREE.Vector3(),_t1=new THREE.Vector3(),
      _kd=new THREE.Vector3(),_cur=new THREE.Vector3(),_pole=new THREE.Vector3(),
      _axis=new THREE.Vector3(),_qA=new THREE.Quaternion(),_qB=new THREE.Quaternion(),
      _qP=new THREE.Quaternion(),_qT=new THREE.Quaternion(),_pC=new THREE.Vector3(),
      _pP=new THREE.Vector3(),_pW=new THREE.Vector3();
/* --- de dónde parte el IK ---
   El IK del hombro es incremental (gira la clavícula un porcentaje hacia el objetivo), así
   que tiene que arrancar SIEMPRE de la pose de la animación; si no, cada llamada de
   holdWeapon() sumaría otro giro. IKQ guarda esa pose (la del mixer) e IKW la que dejó el
   IK, para saber si el mixer realmente reescribió el hueso o no. */
const IKB=['cl','up','fo','ha'],IKQ={},IKW={};
const RKB=['up','fo','ha'],RQ={},RW={};
const _qsame=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)+Math.abs(a.z-b.z)+Math.abs(a.w-b.w)<1e-6;
function ikSnap(){
  if(rikBones())for(const k of RKB){ const b=RIK[k];if(!b)continue;
    if(RW[k]&&RQ[k]&&_qsame(b.quaternion,RW[k]))b.quaternion.copy(RQ[k]);
    else (RQ[k]||(RQ[k]=new THREE.Quaternion())).copy(b.quaternion);
  }
  if(!ikBones())return;
  for(const k of IKB){ const b=IK[k];if(!b)continue;
    if(IKW[k]&&IKQ[k]&&_qsame(b.quaternion,IKW[k]))b.quaternion.copy(IKQ[k]); // el mixer no lo animó
    else (IKQ[k]||(IKQ[k]=new THREE.Quaternion())).copy(b.quaternion);
  }
}
function rikRestore(){
  if(!rikBones())return;
  for(const k of RKB){ const b=RIK[k];if(!b)continue;
    if(RQ[k])b.quaternion.copy(RQ[k]);
    else (RQ[k]=new THREE.Quaternion()).copy(b.quaternion); }
}
function rikStore(){
  if(!rikBones())return;
  for(const k of RKB){ const b=RIK[k];if(b)(RW[k]||(RW[k]=new THREE.Quaternion())).copy(b.quaternion);}
}
function ikRestore(){
  for(const k of IKB){ const b=IK[k];if(!b)continue;
    if(IKQ[k])b.quaternion.copy(IKQ[k]);
    else (IKQ[k]=new THREE.Quaternion()).copy(b.quaternion);
  }
}
function ikStore(){
  for(const k of IKB){ const b=IK[k];if(b)(IKW[k]||(IKW[k]=new THREE.Quaternion())).copy(b.quaternion);}
}
/* impone sobre el hueso una rotación q dada en el MUNDO: local' = inv(Pw)·q·Pw·local */
function worldTwist(bone,q){
  bone.parent.getWorldQuaternion(_qP);
  _qT.copy(_qP).invert().multiply(q).multiply(_qP);
  bone.quaternion.premultiply(_qT);
  bone.updateMatrixWorld(true);
}
/* ============================================================
   EL TORSO MIRA A DONDE APUNTA EL ARMA
   ------------------------------------------------------------
   El clip de reposo trae el torso TORCIDO. Medido con __H.armInfo() (metros, en el marco
   del personaje: +X su izquierda, +Z adelante):
     hombro izquierdo (LeftArm) = (0.144, 1.441, -0.167)
   o sea 14 cm a su izquierda pero 17 cm ATRÁS: la línea de hombros gira ~49°, con el pecho
   y la cabeza mirando 49° hacia la izquierda del personaje en vez de a donde apunta el arma
   (se ve clarísimo de frente: el tipo dispara al frente y mira de costado).
   Peor: desde ese hombro el brazo izquierdo (27,1 + 16,9 = 44,1 cm) no llega ni al arma, y
   el IK que había resolvía eso torciendo la CLAVÍCULA hasta 80°, que deja el hombro
   izquierdo a 3,6 cm del esternón (medido: pasa de x=0.144 a x=0.036 y de z=-0.167 a
   z=+0.027, o sea 11 cm adentro y 19 cm adelante): el deltoides queda dibujado en el medio
   del pecho.
   Se arregla donde corresponde: un giro repartido sobre la cadena Spine02 > Spine01 > Spine
   (tres huesos, ~16° cada uno) que deja la línea de hombros perpendicular a la puntería.
   Con eso el hombro izquierdo se adelanta ~17 cm por vías anatómicas, la cabeza mira al
   frente, y a la clavícula le queda un aporte chico y creíble. */
const SPN=[];let spnDone=false;
function spineChain(){
  if(spnDone)return SPN;
  spnDone=true;
  const top=bones.lArm&&bones.lArm.parent;      // el hueso del que salen las clavículas
  if(!top||!top.isBone||!bones.spine)return SPN;
  for(let b=top;b&&b.isBone;b=b.parent){
    if(!/(spine|chest|torso)/i.test(b.name))break;
    SPN.push(b);
    if(b===bones.spine)break;                   // no bajar de la cadera
  }
  return SPN;
}
const TQ=[],TW=[],_tqa=new THREE.Quaternion(),_ty=new THREE.Vector3(0,1,0);
let torsoOn=true,TWMAX=1.05,TWG=1;              // giro máximo total (rad) y ganancia
function torsoAim(){
  if(!torsoOn||!charRoot||PL.rag||!ikBones())return;
  const ch=spineChain();
  if(!ch.length)return;
  const rs=(bones.rFore&&bones.rFore.parent&&bones.rFore.parent.isBone)?bones.rFore.parent
          :bones.rArm;
  if(!rs)return;
  /* mismo cuidado que en el IK: si el mixer no reescribió estos huesos, volver a la pose de
     la animación antes de girar, para no ir sumando el mismo giro frame tras frame */
  for(let i=0;i<ch.length;i++){
    if(TW[i]&&TQ[i]&&_qsame(ch[i].quaternion,TW[i]))ch[i].quaternion.copy(TQ[i]);
    else (TQ[i]||(TQ[i]=new THREE.Quaternion())).copy(ch[i].quaternion);
  }
  IK.up.updateWorldMatrix(true,false);rs.updateWorldMatrix(true,false);
  _pA.setFromMatrixPosition(IK.up.matrixWorld);
  _pB.setFromMatrixPosition(rs.matrixWorld);
  _cur.copy(_pA).sub(_pB);_cur.y=0;
  if(_cur.lengthSq()<1e-6)return;
  _cur.normalize();
  /* a dónde tiene que apuntar la línea de hombros: la IZQUIERDA del jugador */
  const dx=-Math.cos(PL.yaw),dz=Math.sin(PL.yaw);
  let ang=Math.atan2(dx*_cur.z-dz*_cur.x,dx*_cur.x+dz*_cur.z);
  ang=clamp(ang*TWG,-TWMAX,TWMAX)/ch.length;
  if(Math.abs(ang)<1e-4){for(let i=0;i<ch.length;i++)
      (TW[i]||(TW[i]=new THREE.Quaternion())).copy(ch[i].quaternion);return;}
  _tqa.setFromAxisAngle(_ty,ang);
  /* de abajo hacia arriba, para que cada hueso vea a su padre ya girado */
  for(let i=ch.length-1;i>=0;i--)worldTwist(ch[i],_tqa);
  for(let i=0;i<ch.length;i++)
    (TW[i]||(TW[i]=new THREE.Quaternion())).copy(ch[i].quaternion);
}

/* ============================================================
   DÓNDE DIBUJA LA MALLA LA MANO (y no dónde está el hueso)
   ------------------------------------------------------------
   El hueso de la muñeca NO está en el medio del puño: la malla dibuja la mano bastante más
   allá. Con el IK apuntado al HUESO, la mano quedaba colgando debajo del arma (se ve en las
   capturas: el guante y los dedos por abajo del guardamano, sin tocarlo).
   Acá se mide de una vez, del propio skinning: se promedian los vértices cuyo peso manda
   para el hueso de la mano y se pasa ese promedio al espacio LOCAL del hueso. Eso da el
   vector hueso->puño (constante del rig). Después el IK apunta el PUÑO al arma, no el hueso:
   la muñeca se ubica a |puño| del punto del arma, del lado del hombro, y la mano se gira
   para que el puño caiga justo sobre el arma. De paso el brazo necesita ~8 cm menos de
   alcance, que es justo lo que le faltaba. */
const _palm={};
function palmLocal(bone){
  if(!bone||!charRoot)return null;
  if(_palm[bone.uuid]!==undefined)return _palm[bone.uuid];
  const sum=new THREE.Vector3();let n=0;
  const v=new THREE.Vector3(),m=new THREE.Matrix4();
  charRoot.traverse(o=>{
    if(!o.isSkinnedMesh||!o.skeleton||!o.geometry)return;
    const sk=o.skeleton,bi=sk.bones.indexOf(bone);
    if(bi<0)return;
    const pa=o.geometry.attributes.position,si=o.geometry.attributes.skinIndex,
          sw=o.geometry.attributes.skinWeight;
    if(!pa||!si||!sw)return;
    if(!sk.boneInverses||!sk.boneInverses[bi])return;
    m.multiplyMatrices(sk.boneInverses[bi],o.bindMatrix);
    for(let i=0;i<pa.count;i++){
      let bw=0,bb=-1;
      for(let k=0;k<4;k++){const w=sw.getComponent(i,k);
        if(w>bw){bw=w;bb=si.getComponent(i,k);}}
      if(bb!==bi||bw<.5)continue;
      sum.add(v.fromBufferAttribute(pa,i).applyMatrix4(m));n++;
    }});
  _palm[bone.uuid]=n?sum.multiplyScalar(1/n):null;
  return _palm[bone.uuid];
}

/* el codo de la mano de apoyo cae hacia abajo y un poco hacia afuera (a la izquierda) */
const IKPOLE=[.55,-1,.30];      // [izquierda, abajo, atrás] en el marco de puntería
/* CLW = cuánto se le permite colaborar a la clavícula (0..1) y CLMAX el tope en radianes:
   una clavícula real protrae 15-20°, no 80°. Con el torso ya enderezado no hace falta más. */
let ikOn=true, CLW=.85, CLMAX=.32;
function armIK(){
  if(!ikOn||!wModel||PL.rag||!charRoot||!ikBones())return;   // el IK también en 1ª persona
  const g=wModel.userData._g;
  if(!g||g.bad||g.S.none)return;
  const up=IK.up,fo=IK.fo,ha=IK.ha;
  ikRestore();
  up.updateWorldMatrix(true,false);
  fo.updateWorldMatrix(true,false);
  ha.updateWorldMatrix(true,false);
  _pA.setFromMatrixPosition(up.matrixWorld);
  _pB.setFromMatrixPosition(fo.matrixWorld);
  _pE.setFromMatrixPosition(ha.matrixWorld);
  const a=_pA.distanceTo(_pB),b=_pB.distanceTo(_pE);
  if(a<1e-4||b<1e-4)return;
  let R=(a+b)*.985;
  /* objetivo sobre el arma; si no alcanza, se corre hacia la empuñadura por el mismo eje */
  _t0.copy(g.lh0).applyMatrix4(wModel.matrixWorld);
  _t1.copy(g.lh1).applyMatrix4(wModel.matrixWorld);
  /* --- la clavícula ayuda ---
     En este rig la clavícula izquierda apunta para ATRÁS (el torso del clip está torcido,
     con el hombro izquierdo 23 cm detrás del derecho): así el brazo, que mide 44 cm, no
     llega ni a la empuñadura. Se la gira hacia el objetivo lo que haga falta (nunca más de
     lo que pide CLW) y con eso el hombro se adelanta ~18 cm. */
  if(IK.cl){
    const cl=IK.cl;
    cl.updateWorldMatrix(true,false);
    _pC.setFromMatrixPosition(cl.matrixWorld);
    _cur.copy(_pA).sub(_pC);
    const cw=_cur.length();
    if(cw>1e-4){
      _cur.multiplyScalar(1/cw);
      _kd.copy(_t1).sub(_pC);
      const dT=_kd.length();
      /* sólo si el objetivo queda lejos para el brazo solo */
      const w=clamp((dT-cw-R*.55)/(R*.35),0,1)*CLW;
      if(w>.001&&dT>1e-4){
        _kd.multiplyScalar(1/dT);
        _qA.setFromUnitVectors(_cur,_kd);
        /* tope duro al giro de la clavícula: sin esto el hombro izquierdo se iba al medio
           del pecho para alcanzar el arma */
        const full=2*Math.acos(clamp(Math.abs(_qA.w),-1,1));
        const use=Math.min(full*w,CLMAX);
        _qB.identity().slerp(_qA,full>1e-5?use/full:0);
        worldTwist(cl,_qB);
        up.updateWorldMatrix(true,false);
        fo.updateWorldMatrix(true,false);
        ha.updateWorldMatrix(true,false);
        _pA.setFromMatrixPosition(up.matrixWorld);
        _pB.setFromMatrixPosition(fo.matrixWorld);
        _pE.setFromMatrixPosition(ha.matrixWorld);
      }
    }
  }
  /* --- el objetivo es el PUÑO, no el hueso de la muñeca ---
     El puño está PLEN metros más allá del hueso (medido del skinning, ver palmLocal). Así
     que el ALCANCE útil para llegar al arma es R+PLEN, y la muñeca se planta a PLEN del
     punto del arma, del lado del hombro. Con la mano después girada para que el puño mire a
     ese punto, el puño cae exactamente sobre el arma. */
  /* ojo: palmLocal está en unidades LOCALES del hueso (este rig las trae en cm), así que el
     largo hay que medirlo en el mundo, no con pl.length() */
  const pl=palmLocal(ha);
  let PLEN=0;
  if(pl){_pW.copy(pl).applyMatrix4(ha.matrixWorld);PLEN=_pW.distanceTo(_pE);}
  const RP=R+PLEN;
  _kd.copy(_t1).sub(_t0);
  _cur.copy(_t0).sub(_pA);
  let t=1;
  if(_t1.distanceTo(_pA)>RP){
    const A=_kd.dot(_kd),B=2*_cur.dot(_kd),C=_cur.dot(_cur)-RP*RP,
          D=B*B-4*A*C;
    t=(A>1e-9&&D>0)?clamp((-B+Math.sqrt(D))/(2*A),0,1):0;
  }
  _pP.copy(_kd).multiplyScalar(t).add(_t0);     // punto del ARMA donde tiene que ir el puño
  _pT.copy(_pA).sub(_pP);                       // ... y ahí, a PLEN, va la muñeca
  const dpp=_pT.length();
  if(dpp>1e-5)_pT.multiplyScalar(Math.min(PLEN,dpp)/dpp).add(_pP);else _pT.copy(_pP);
  /* --- ley de cosenos --- */
  _kd.copy(_pT).sub(_pA);
  const c=clamp(_kd.length(),Math.abs(a-b)+1e-3,a+b-1e-3);
  _kd.normalize();
  const alpha=Math.acos(clamp((a*a+c*c-b*b)/(2*a*c),-1,1));
  /* plano de flexión: el codo sale hacia IKPOLE */
  const sy=Math.sin(PL.yaw),cy=Math.cos(PL.yaw);
  /* adelante=(-sy,0,-cy); derecha=(cy,0,-sy) -> izquierda=(-cy,0,sy) */
  _pole.set(-cy*IKPOLE[0]+sy*IKPOLE[2],IKPOLE[1],sy*IKPOLE[0]+cy*IKPOLE[2]).normalize();
  _axis.copy(_kd).cross(_pole);
  if(_axis.lengthSq()<1e-6)_axis.set(0,1,0);
  _axis.normalize();
  _qA.setFromAxisAngle(_axis,alpha);
  _cur.copy(_kd).applyQuaternion(_qA);                 // dirección deseada hombro->codo
  _qA.setFromUnitVectors(_t1.copy(_pB).sub(_pA).normalize(),_cur);
  worldTwist(up,_qA);
  /* el codo: apuntar antebrazo->mano al objetivo */
  _pB.setFromMatrixPosition(fo.matrixWorld);
  _pE.setFromMatrixPosition(ha.matrixWorld);
  _cur.copy(_pE).sub(_pB);
  if(_cur.lengthSq()<1e-8)return;
  _t1.copy(_pT).sub(_pB);
  if(_t1.lengthSq()<1e-8)return;
  _qB.setFromUnitVectors(_cur.normalize(),_t1.normalize());
  worldTwist(fo,_qB);
  /* --- la muñeca ---
     Se gira la mano para que el PUÑO (el vector hueso->puño que salió del skinning) apunte
     al punto del arma. Como la muñeca ya quedó a |puño| de ese punto, el puño aterriza
     encima del arma.
     ANTES esto se salteaba con las armas de una mano (two:0) y se veía fatal: con la pistola
     la mano izquierda quedaba con los dedos al aire, al costado del arma, como saludando.
     Y con las de dos manos apuntaba el +Y del hueso, no el puño, así que la mano se pasaba
     ~10 cm del guardamano (el puño está a 16 cm del hueso en este rig, no a 2). */
  if(IK.wr!==0&&pl&&PLEN>1e-4){
    _pE.setFromMatrixPosition(ha.matrixWorld);
    _pW.copy(pl).applyMatrix4(ha.matrixWorld);   // dónde está el puño ahora
    _cur.copy(_pP).sub(_pE);
    _kd.copy(_pW).sub(_pE);
    if(_cur.lengthSq()>1e-8&&_kd.lengthSq()>1e-8){
      _qB.setFromUnitVectors(_kd.normalize(),_cur.normalize());
      worldTwist(ha,_qB);
    }
  }
  ikStore();
}
/* Distancia (m) de la mano izquierda al eje del arma: el número que mira el test.
   MIDE EL PUÑO, no el hueso de la muñeca. El hueso está 16 cm detrás de donde la malla
   dibuja la mano (medido del skinning, palmLocal), así que "hueso pegado al eje" no quiere
   decir "la mano agarra el arma": con el hueso sobre el eje la mano se dibujaba 10 cm más
   allá del guardamano. Se mide el mismo invariante — que la mano izquierda esté tomando el
   arma — pero sobre el punto que se VE. Si el rig no trae skinning usable, se cae al hueso,
   que es lo que se medía antes. */
function lhPoint(){
  const b=bones.lHand;if(!b)return null;
  b.updateWorldMatrix(true,false);
  const p=new THREE.Vector3(),pl=palmLocal(b);
  if(pl)p.copy(pl).applyMatrix4(b.matrixWorld);
  else p.setFromMatrixPosition(b.matrixWorld);
  return p;
}
function lhDist(){
  if(!wModel||!bones.lHand)return null;
  const g=wModel.userData._g;if(!g||g.bad)return null;
  wModel.updateWorldMatrix(true,false);
  const p=lhPoint();if(!p)return null;
  const A=g.ax0.clone().applyMatrix4(wModel.matrixWorld),
        B=g.ax1.clone().applyMatrix4(wModel.matrixWorld),
        AB=B.clone().sub(A);
  const u=clamp(p.clone().sub(A).dot(AB)/Math.max(1e-9,AB.lengthSq()),0,1);
  return A.add(AB.multiplyScalar(u)).distanceTo(p);
}

/* respaldo si el rig no trae hueso de mano: ancla fija en el pecho */
function handTrack(){
  if(!chestAnchor||!charRoot)return;
  const r=bones.rHand||bones.rFore;
  if(!r)return;
  r.updateWorldMatrix(true,false);
  _hv.setFromMatrixPosition(r.matrixWorld);charRoot.worldToLocal(_hv);
  chestAnchor.position.set(_hv.x,_hv.y,_hv.z);
}

/* ---- hooks de test propios de esta capa ---- */
let _mk=null,_ws=null;
if(DEV&&window.__H)Object.assign(window.__H,{
  /* distancia (m) de la mano IZQUIERDA al eje del arma */
  lhand:()=>{const d=lhDist();return d==null?null:+d.toFixed(4);},
  /* lo mismo para todas las armas, en la animación actual */
  lhandAll:()=>{const o={},i0=weap().id;
    for(const w of WEAP){ if(!w.glb)continue;
      equip(WIX[w.id]);holdWeapon();
      const d=lhDist();o[w.id]=d==null?null:+d.toFixed(4); }
    equip(WIX[i0]);holdWeapon();return o;},
  /* posición del jugador (para acomodar la cámara en las capturas) */
  plPos:()=>[+plBody.position.x.toFixed(3),+plBody.position.y.toFixed(3),
             +plBody.position.z.toFixed(3)],
  /* dónde está cada mano y dónde el punto de agarre del arma */
  gripInfo:()=>{const g=wModel&&wModel.userData._g;if(!g||g.bad)return null;
    wModel.updateWorldMatrix(true,false);
    const F=v=>[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)];
    const P=b=>{b.updateWorldMatrix(true,false);
      return new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);};
    const o={id:weap().id,len:+g.len.toFixed(3),sz:F(g.sz),flip:g.flip,
      grip:F(new THREE.Vector3().setFromMatrixPosition(wModel.matrixWorld)),
      muzzle:F(g.ax1.clone().applyMatrix4(wModel.matrixWorld)),
      tgt:F(g.lh1.clone().applyMatrix4(wModel.matrixWorld)),
      lh:F(P(bones.lHand)),rh:F(P(bones.rHand)),
      lhp:(()=>{const p=lhPoint();return p?F(p):null;})(),   // el PUÑO izquierdo
      lhd:+lhDist().toFixed(4)};
    if(ikBones()){o.sh=F(P(IK.up));o.el=F(P(IK.fo));
      o.reach=+(P(IK.up).distanceTo(P(IK.fo))+P(IK.fo).distanceTo(P(IK.ha))).toFixed(3);
      o.need=+P(IK.up).distanceTo(g.lh1.clone().applyMatrix4(wModel.matrixWorld)).toFixed(3);}
    return o;},
  ik:v=>{if(v!==undefined){ikOn=!!v;holdWeapon();}return ikOn;},
  /* diagnóstico del recorte de 1ª persona: a qué distancia DELANTE de la cámara cae cada
     hueso/punto (negativo = detrás del plano, o sea recortado) */
  fpDiag:()=>{ const d=new THREE.Vector3(),v=new THREE.Vector3(),o={};
    camera.getWorldDirection(d);
    const f=(n,p)=>{o[n]=+v.copy(p).sub(camera.position).dot(d).toFixed(3);};
    const P=b=>{b.updateWorldMatrix(true,false);
      return new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);};
    for(const k of['head','neck','rHand','rFore','rArm','lHand'])
      if(bones[k])f(k,P(bones[k]));
    if(wModel){wModel.updateWorldMatrix(true,false);
      f('arma',new THREE.Vector3().setFromMatrixPosition(wModel.matrixWorld));}
    o.clip=FPCLIPD;o.on=fpClipOn;o.near=camera.near;
    if(rikBones()){ const t=fpHandTarget(new THREE.Vector3());
      f('tgt',t);
      o.needR=+P(RIK.up).distanceTo(t).toFixed(3);
      o.reachR=+(P(RIK.up).distanceTo(P(RIK.fo))+P(RIK.fo).distanceTo(P(RIK.ha))).toFixed(3);}
    return o;},
  wrist:v=>{if(v!==undefined){IK.wr=+v;holdWeapon();}return IK.wr;},
  /* pelotitas de referencia: 0 hueso mano der, 1 hueso mano izq, 2 empuñadura,
     3 objetivo de la izquierda, 4 punta del caño, 5 hombro izq */
  mark:on=>{
    if(!_mk){_mk=new THREE.Group();_mk.renderOrder=9;scene.add(_mk);}
    while(_mk.children.length)_mk.remove(_mk.children[0]);
    if(!on)return 0;
    const g=wModel&&wModel.userData._g;if(!g||g.bad)return 0;
    wModel.updateWorldMatrix(true,false);
    const P=b=>{b.updateWorldMatrix(true,false);
      return new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);};
    const pts=[[P(bones.rHand),0xff2020],[P(bones.lHand),0x20ff20],
      [new THREE.Vector3().setFromMatrixPosition(wModel.matrixWorld),0x2090ff],
      [g.lh1.clone().applyMatrix4(wModel.matrixWorld),0xffff00],
      [g.ax1.clone().applyMatrix4(wModel.matrixWorld),0xff00ff]];
    if(ikBones())pts.push([P(IK.up),0xffffff],[P(IK.fo),0x00ffff]);
    /* el PUÑO de cada mano (donde la malla la dibuja): naranja la izquierda, gris la derecha */
    for(const b of[bones.lHand,bones.rHand]){ if(!b)continue;
      const pl=palmLocal(b);if(!pl)continue;
      pts.push([pl.clone().applyMatrix4(b.matrixWorld),b===bones.lHand?0xff8000:0x909090]); }
    for(const p of pts){const m=new THREE.Mesh(new THREE.SphereGeometry(.022,10,8),
      new THREE.MeshBasicMaterial({color:p[1],depthTest:false}));
      m.position.copy(p[0]);m.renderOrder=9;_mk.add(m);}
    return _mk.children.length;},
  /* UNA COPIA DEL ARMA SOLA, colgada en el aire con el rig alineado al mundo (su -Z, o sea
     la punta, apunta al -Z del mundo). Sirve para decidir sin ninguna ambigüedad para qué
     lado quedó el modelo: mirándola desde +X, la punta TIENE que caer a la derecha. */
  wsolo:(x,y,z)=>{
    if(_ws){scene.remove(_ws);_ws=null;}
    if(x===undefined||!wModel)return false;
    const g=rigGrip(wModel,weap());if(!g||g.bad)return false;
    const inner=wModel.children[0];if(!inner)return false;
    _ws=new THREE.Group();_ws.add(inner.clone(true));
    _ws.position.set(x,y,z);scene.add(_ws);
    return true;},
  /* vector hueso->puño, medido del skinning, en el espacio local del hueso de la mano */
  palm:()=>{const o={};
    for(const k of['lHand','rHand','lFore']){const p=palmLocal(bones[k]);
      o[k]=p?[+p.x.toFixed(4),+p.y.toFixed(4),+p.z.toFixed(4),+p.length().toFixed(4)]:null;}
    return o;},
  /* el esqueleto como viene: nombre y padre de cada hueso */
  bonesTree:()=>{if(!charRoot)return null;const o=[];
    charRoot.traverse(b=>{if(b.isBone)o.push(b.name+' < '+(b.parent?b.parent.name:'-'));});
    return o;},
  /* radiografía del brazo izquierdo, en metros y relativo al centro del personaje:
     con IK y sin IK, para ver cuánto lo tuerce el IK */
  armInfo:()=>{
    if(!charRoot||!ikBones())return null;
    const F=v=>[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)];
    const P=b=>{b.updateWorldMatrix(true,false);
      return charRoot.worldToLocal(new THREE.Vector3().setFromMatrixPosition(b.matrixWorld));};
    const snap=()=>{const o={};
      for(const k of['lArm','lFore','lHand','rArm','rFore','rHand','spine','head'])
        if(bones[k])o[k]=F(P(bones[k]));
      o.sh=F(P(IK.up));
      o.up=+P(IK.up).distanceTo(P(IK.fo)).toFixed(3);
      o.lo=+P(IK.fo).distanceTo(P(IK.ha)).toFixed(3);
      return o;};
    const was=ikOn;
    ikOn=false;ikRestore();wModel&&wModel.updateMatrixWorld(true);const off=snap();
    ikOn=true;holdWeapon();const on=snap();
    ikOn=was;holdWeapon();
    return {off,on,lhd:lhDist()==null?null:+lhDist().toFixed(4)};},
  gspec:(k,v)=>{const g=gspec(weap());if(k!==undefined){g[k]=v;
    if(wModel)delete wModel.userData._g;holdWeapon();}
    return JSON.parse(JSON.stringify(g));},
  pole:(a,b,c)=>{if(a!==undefined){IKPOLE[0]=a;IKPOLE[1]=b;IKPOLE[2]=c;holdWeapon();}
    return IKPOLE.slice();},
  clav:v=>{if(v!==undefined){CLW=+v;holdWeapon();}return CLW;}});

