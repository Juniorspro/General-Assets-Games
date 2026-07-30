
/* ============================================================
   SUX SANDBOX — 1ª PERSONA: EL AGARRE BUENO, CONGELADO, + BALANCEO PROCEDURAL
   ------------------------------------------------------------
   PEDIDO TEXTUAL: "ESTA VERSIÓN TIENE EL MEJOR AGARRE DE ARMA, SOLO LA CAGA LA ANIMACIÓN, ASÍ
   QUE QUIERO QUE EXTRAIGAS EL CÓDIGO DE ESTE AGARRE, LO CONGELES Y HAGAS LA ANIMACIÓN PROCEDURAL
   DE PRIMERA PERSONA DE CAMINAR, BALANCEO LEVE".
   La versión con el mejor agarre es la build del HASH 4e434fb (sux18.html). SE COMPARÓ SU CÓDIGO
   LÍNEA POR LÍNEA con el de hoy (script de diff sobre las funciones, comentarios aparte):
   holdWeapon(), rigGrip(), armIK(), armIKR(), twoBone(), worldTwist(), palmLocal(),
   fpHandTarget() y las constantes FPT/RPOLE/IK/RIK de core_c son IDÉNTICAS a las de esa build
   (las únicas diferencias del archivo son la respiración y los hooks de medición). O sea que el
   agarre bueno YA ESTÁ en el código: no había que reescribirlo, había que dejar de taparlo.
   Lo que lo tapaba eran dos cosas:
     1) EL VIEWMODEL DE MANOS (core_m, vm-hands.glb). Es lo de la foto que mandó el usuario: dos
        tubos negros de antebrazo, uno subiendo vertical desde el borde de abajo, con el arma
        colgada de la esquina. Ese camino se APAGA acá (VMC.on=0) y vuelve el agarre de verdad:
        los brazos del personaje, el arma en la mano derecha y la izquierda al caño por IK, con
        el discard de brazos + plano cercano de core_m (que es el de sux18, ese no cambió).
     2) LA ANIMACIÓN, que es lo que el usuario dice. El clip de caminar/correr se parte en
        tren inferior (ACTS) y superior (ACTU, congelado en el cuadro 0). Pero el reparto de
        splitClip() manda a "abajo" TODO lo que no matchea /spine|chest|...|hand/ — y ahí cae la
        RAÍZ DEL ESQUELETO (la cadera). La cadera es el padre de todo el torso: aunque el tren
        superior esté congelado, cada zancada la ROTA y la SUBE/BAJA, y con ella viajan pecho,
        hombro y brazos. La mano derecha está clavada a la pantalla por IK (armIKR), así que el
        hombro se mueve CONTRA una mano quieta: el antebrazo cabecea, el codo entra y sale del
        cuadro y, cuando el hombro se va lejos, el IK se satura y el arma se hunde en
        profundidad. Eso es "la animación cagando el agarre".
   ACÁ SE HACE, EN ESTE ORDEN:
     A. viewmodel apagado -> agarre real (el de sux18).
     B. CONGELADO: en 1ª persona la raíz del esqueleto se fija en su pose de referencia (la del
        cuadro 0 del clip de reposo, que es la pose en la que se generó el personaje sosteniendo
        el arma). Las piernas siguen animando COLGADAS de esa cadera fija: en 1ª persona no se
        ven (el discard las saca) y en 3ª persona no se toca NADA — el congelado se apaga solo
        al salir de 1ª persona, y los otros jugadores ven el cuerpo entero animado igual que
        antes (su copia es el fantasma de core_f, que ni pasa por acá).
     C. BALANCEO PROCEDURAL LEVE: el vaivén del paso ya no lo pone el esqueleto sino un offset
        que se le suma al OBJETIVO de la mano (fpHandTarget) en el marco de la cámara, más una
        pizca de rotación del arma sobre su empuñadura. Como el arma cuelga de la mano derecha y
        la izquierda sigue al arma por IK, el conjunto entero (brazos + arma) se mueve como una
        sola pieza, que es exactamente lo que hace un FPS. Es la misma máquina medida del
        viewmodel (fase del paso, 8 acostado, retardo al girar, inclinación al ir de costado,
        patada del disparo, amortiguado en el aire) con las amplitudes bajadas, porque la mano
        está a ~35 cm del ojo y no a 56 como el ancla del viewmodel: el mismo centímetro de
        offset se ve ~1,6 veces más grande en pantalla.
   Se concatena ÚLTIMO (después de core_m —viewmodel— y core_p —melee—): las funciones que se
   envuelven acá son las que dejaron esos archivos, así que las dos capas siguen funcionando.
   ============================================================ */

/* ---------- A. fuera el viewmodel de manos ----------
   VMC.on lo lee vmWant() todos los frames: con 0, vmStep() apaga el conjunto (vmLeave devuelve
   el arma a la mano de verdad con attachWeapon) y fpClip() pasa al modo 1 = brazos del personaje
   por discard + plano cercano, que es el modo de sux18.
   vmAsk=true además evita la descarga del GLB de manos (1,3 MB que ya no se usan). El hook
   __H.vmOn(1) lo vuelve a poner si alguna vez hay que comparar las dos versiones. */
VMC.on=0;
vmAsk=true;

/* ---------- B. congelado de la raíz del esqueleto en 1ª persona ---------- */
/* la raíz es el hueso más alto de la jerarquía (la cadera): se sube desde bones.spine, que
   core_b ya identificó, hasta el último padre que siga siendo hueso. */
const FRZ={on:1,bone:null,ok:0,got:0,
           q:new THREE.Quaternion(),p:new THREE.Vector3(),
           qa:new THREE.Quaternion(),pa:new THREE.Vector3()};
function fpRootBone(){
  if(FRZ.bone)return FRZ.bone;
  let b=bones.spine||bones.rArm||bones.head;
  if(!b)return null;
  while(b.parent&&b.parent.isBone)b=b.parent;
  return (FRZ.bone=b);
}
/* POSE DE REFERENCIA: se lee del CLIP, no de la pose viva.
   El clip de reposo tiene su tren inferior clavado en el cuadro 0 (buildActions lo congela si
   idleLowMoves), así que el cuadro 0 de sus pistas ES la pose de referencia del personaje: la
   misma en la que se generó sosteniendo el arma. Sacarla del clip la hace determinista (no
   depende de en qué estado esté el jugador la primera vez que entra en 1ª persona) y no cuesta
   nada: se hace una sola vez.
   Si el clip no trae pistas para ese hueso se captura la pose viva en un cuadro de reposo, que
   es lo mismo pero hay que esperar a que el jugador esté quieto. */
function fpFreezeRef(){
  if(FRZ.ok)return true;
  const b=fpRootBone();if(!b)return false;
  const cl=(typeof CLIPS==='object')&&(CLIPS.idle||CLIPS.walk);
  if(cl&&cl.tracks){
    let gq=0,gp=0;
    for(const t of cl.tracks){
      const bn=t.name.split('.')[0].replace(/^.*\//,'');
      if(bn!==b.name)continue;
      if(/quaternion/i.test(t.name)&&t.values.length>=4){
        FRZ.q.set(t.values[0],t.values[1],t.values[2],t.values[3]);gq=1;}
      else if(/position/i.test(t.name)&&t.values.length>=3){
        FRZ.p.set(t.values[0],t.values[1],t.values[2]);gp=1;}
    }
    if(gq){ if(!gp)FRZ.p.copy(b.position); FRZ.ok=1;FRZ.got=1;return true; }
  }
  /* respaldo: pose viva, pero sólo si el personaje está en reposo (si no se congelaría la
     cadera a mitad de zancada y quedaría torcida para siempre) */
  const idle=(typeof animState==='string'&&animState==='idle'&&ACTS.idle&&ACTS.idle.weight>.95);
  if(!idle)return false;
  FRZ.q.copy(b.quaternion);FRZ.p.copy(b.position);
  FRZ.ok=1;FRZ.got=2;return true;
}
/* ¿corresponde el modo 1ª persona propio? Mismas condiciones que vmWant(): en vehículo la
   cámara la pone core_e y el cuerpo va sentado, con ragdoll y con cámara libre se quiere ver el
   cuerpo entero animado. */
function fpMine(){
  if(!PL.fp||PL.rag||freeCam)return false;
  if(typeof VHS!=='undefined'&&VHS)return false;
  return true;
}
let frzWas=false;
function fpFreezeRoot(){
  const on=FRZ.on&&fpMine();
  const b=fpRootBone();if(!b)return;
  if(!on){
    /* al salir de 1ª persona se devuelve el mando al mixer: la pose del clip vuelve a escribirse
       sola en el frame siguiente, no hay nada que restaurar (el mixer escribe absoluto). */
    frzWas=false;return;
  }
  if(!fpFreezeRef())return;
  /* al ENTRAR se guarda lo que había (sólo para poder medirlo con __H.fpFrz) y se escribe la
     referencia. Se escribe ABSOLUTO todos los frames, nunca multiply sobre lo del frame
     anterior: es la misma lección que dejó la deriva de 57° del torso (core_c, breathe). */
  if(!frzWas){FRZ.qa.copy(b.quaternion);FRZ.pa.copy(b.position);frzWas=true;}
  b.quaternion.copy(FRZ.q);
  b.position.copy(FRZ.p);
}
/* GANCHO: justo después de mixer.update() y ANTES de torsoAim().
   breathRestore() (core_c) es la primera cosa que animStep() llama después del mixer, así que
   envolverla da exactamente ese punto sin tener que reescribir animStep entera. Tiene que ser
   antes de torsoAim porque torsoAim MIDE la línea de hombros para saber cuánto girar el torso:
   si la cadera cambiara después de esa medición, la corrección del torso quedaría calculada
   sobre una pose que ya no existe y el pecho oscilaría con la zancada aunque la cadera esté
   quieta. Así torsoAim ve la pose ya congelada y su corrección es estable. */
const breathRestoreFP=breathRestore;
breathRestore=function(){
  nsafe(()=>fpFreezeRoot(),'fpfrz');
  return breathRestoreFP.apply(this,arguments);
};

/* ---------- C. balanceo procedural de 1ª persona ----------
   Todo se calcula como OFFSET ABSOLUTO del estado de ESTE frame (nada se acumula salvo la fase
   del paso, que es lo que tiene que acumular, y va por dt).
   AMPLITUDES: la mano queda a ~0,35 m del ojo (FPT: 18,5 cm a la derecha, 21 abajo, 27
   adelante), y a esa distancia 1 cm de offset son ~0,039 de NDC con el FOV del juego. Con las
   del viewmodel (bobRX .020) el pico a pico corriendo daría 0,157 de NDC: eso es "se balancea
   mucho el arma", justo lo que el usuario pidió bajar. Acá se apunta a ~0,04 de NDC pico a pico
   caminando y ~0,08 corriendo, que es un balanceo que se nota y no marea. */
const FPSW={
  on:1,
  bobWX:.0055,bobWY:.0040,      /* caminar: lateral (1 paso) / vertical (2 pasos) en metros */
  bobRX:.0105,bobRY:.0080,      /* correr */
  fW:1.15,fR:2.0,               /* Hz del paso: los mismos medidos para el viewmodel */
  idleX:.0022,idleY:.0018,idleF1:.17,idleF2:.23,   /* quieto: dos senoidales lentas y chicas */
  swayP:.12,swayMax:.022,tau:.085,   /* retardo al girar la cámara (m por rad de error) */
  tilt:.020,tiltP:.008,         /* ir de costado: rola y se corre un poco */
  kick:.030,kickR:.30,          /* patada del disparo (m atrás y rad arriba) */
  air:.30,                      /* cuánto del paso queda en el aire */
  land:.014,landF:9,            /* golpe de aterrizaje: metros y 1/s de amortiguación */
  rxB:1.2,ryB:1.6,rzB:2.2,      /* rad de rotación del arma por metro de balanceo */
  rMax:.032                     /* tope de cada eje de la rotación (rad) ≈ 1,8° */
};
let fpPhase=0,fpTime=0,fpYawF=0,fpPitF=0,fpSpF=0,fpAirF=1,fpLand=0,fpGrd=true,fpVy=0;
const fpOF={x:0,y:0,z:0,rx:0,ry:0,rz:0};
function fpSwayStep(dt){
  if(!FPSW.on||!fpMine()){fpOF.x=fpOF.y=fpOF.z=fpOF.rx=fpOF.ry=fpOF.rz=0;return;}
  dt=dt>0?Math.min(dt,.1):0;
  fpTime+=dt;
  const vx=plBody.velocity.x,vz=plBody.velocity.z,sp=Math.hypot(vx,vz);
  const kf=dt>0?1-Math.exp(-dt*8):1;
  fpSpF+=(sp-fpSpF)*kf;
  const gr=(grounded||inWater)?1:0;
  fpAirF+=(gr-fpAirF)*(dt>0?1-Math.exp(-dt*6):1);
  /* ATERRIZAJE: se toma la velocidad vertical del frame ANTERIOR al toque (en el toque ya es 0)
     y de ahí sale un golpe que baja el conjunto y se amortigua solo. */
  if(gr&&!fpGrd)fpLand=clamp(Math.abs(fpVy)/9,0,1);
  fpGrd=!!gr;
  if(!gr)fpVy=plBody.velocity.y;
  if(fpLand>0){fpLand-=fpLand*(dt>0?1-Math.exp(-dt*FPSW.landF):0);if(fpLand<1e-3)fpLand=0;}
  /* t = 0 caminando, 1 corriendo (con la velocidad ya filtrada: nada de saltos por frame) */
  const t=clamp((fpSpF-PL.spd*.55)/Math.max(.5,PL.run-PL.spd*.55),0,1);
  const mv=clamp((fpSpF-.35)/1.2,0,1)*(fpAirF+(1-fpAirF)*FPSW.air);
  const f=FPSW.fW+(FPSW.fR-FPSW.fW)*t;
  const AX=(FPSW.bobWX+(FPSW.bobRX-FPSW.bobWX)*t)*mv,
        AY=(FPSW.bobWY+(FPSW.bobRY-FPSW.bobWY)*t)*mv;
  fpPhase+=dt*Math.PI*2*f;
  if(fpPhase>Math.PI*2)fpPhase-=Math.PI*2;
  const bx=Math.sin(fpPhase)*AX, by=Math.sin(fpPhase*2)*AY;   /* el 8 acostado clásico */
  const iw=1-mv;
  const ix=Math.sin(fpTime*Math.PI*2*FPSW.idleF1)*FPSW.idleX*iw,
        iy=Math.sin(fpTime*Math.PI*2*FPSW.idleF2+1.1)*FPSW.idleY*iw;
  /* RETARDO AL GIRAR: la mira se mueve ya, el arma llega un pelo después. El filtro guarda la
     orientación "vieja" y el error entre las dos es el offset. */
  const ks=dt>0?1-Math.exp(-dt/Math.max(.01,FPSW.tau)):1;
  let dy=PL.yaw-fpYawF;
  while(dy>Math.PI)dy-=Math.PI*2; while(dy<-Math.PI)dy+=Math.PI*2;
  fpYawF+=dy*ks;
  const dp=PL.pitch-fpPitF;fpPitF+=dp*ks;
  const sx=clamp(dy*FPSW.swayP,-FPSW.swayMax,FPSW.swayMax),
        sy=clamp(-dp*FPSW.swayP,-FPSW.swayMax,FPSW.swayMax);
  const ys=Math.sin(PL.yaw),yc=Math.cos(PL.yaw);
  const lat=clamp((vx*yc-vz*ys)/Math.max(1,PL.spd),-1,1);
  const rk=(typeof recoil==='number')?recoil:0;
  fpOF.x=bx+ix+sx-lat*FPSW.tiltP;
  fpOF.y=by+iy+sy-fpLand*FPSW.land;
  fpOF.z=rk*FPSW.kick;                       /* +z = hacia el ojo (el arma retrocede) */
  fpOF.rx=clamp(rk*FPSW.kickR+by*FPSW.rxB,-FPSW.rMax*2,FPSW.rMax*2);
  fpOF.ry=clamp(bx*FPSW.ryB-dy*.20,-FPSW.rMax,FPSW.rMax);
  fpOF.rz=clamp(-lat*FPSW.tilt+bx*FPSW.rzB,-FPSW.rMax,FPSW.rMax);
}
/* EL OFFSET SE LE SUMA AL OBJETIVO DE LA MANO, en el marco de la CÁMARA.
   fpHandTarget() (core_c) deja en _fr/_fu/_ff la base de la cámara de este frame (derecha,
   arriba, adelante), así que alcanza con sumar ahí: el punto sigue estando "abajo a la derecha
   de la pantalla" mire donde mire, con el vaivén encima. Y como el arma cuelga de esa mano y la
   izquierda va al caño por IK, el conjunto entero se mueve junto. */
const fpHandTargetSW=fpHandTarget;
fpHandTarget=function(out){
  fpHandTargetSW.call(this,out);
  if(!FPSW.on)return out;
  out.addScaledVector(_fr,fpOF.x).addScaledVector(_fu,fpOF.y).addScaledVector(_ff,-fpOF.z);
  /* puños: la muñeca se aleja del ojo (ver FPFIST) */
  if(weap().noModel)out.addScaledVector(_ff,FPFIST.push)
                       .addScaledVector(_fr,FPFIST.side).addScaledVector(_fu,FPFIST.drop);
  return out;
};
/* LA PIZCA DE ROTACIÓN va en el arma, sobre sus ejes locales, que después de rigGrip() son
   +X a la derecha, +Y arriba y -Z el caño: o sea que el pivote es la empuñadura (la palma) y no
   el ojo. Sin esto el balanceo sería una traslación pura y se lee como "la pantalla se mueve";
   con 1-2° el arma además cabecea y rola, que es lo que hace que parezca un paso.
   Va DESPUÉS de holdWeapon() (que es el que estabiliza el arma hacia la puntería) y se vuelve a
   correr armIK() para que la mano izquierda siga al caño girado: si no, quedaría 5-7 mm colgada
   del aire. Es el mismo patrón que usa core_p para el bate.
   Con golpe de melee en curso NO se toca: ahí manda MGRIP (core_p) y el arma acompaña la mano. */
const holdWeaponSW=holdWeapon;
const _swE=new THREE.Euler(),_swQ=new THREE.Quaternion();
holdWeapon=function(){
  const r=holdWeaponSW.apply(this,arguments);
  if(!fpMine())return r;
  const mel=(typeof MEL!=='undefined'&&MEL&&(MEL.on||MEL.off>0));
  if(!FPSW.on||!wModel||mel)return r;
  if(!fpOF.rx&&!fpOF.ry&&!fpOF.rz)return r;
  _swE.set(fpOF.rx,fpOF.ry,fpOF.rz,'YXZ');
  _swQ.setFromEuler(_swE);
  wModel.quaternion.multiply(_swQ);
  wModel.updateMatrixWorld(true);
  nsafe(()=>armIK(),'fpswik');
  return r;
};
/* ---------- D. LOS PUÑOS: el derecho, más lejos del ojo ----------
   Con el arma "hands" (sin modelo) fpHandTarget() sube y ACERCA la mano —k=1— para que el puño
   no quede como un puntito en la esquina: la muñeca termina a 19,5 cm del ojo. Eso venía de
   cuando en 1ª persona no se veía el cuerpo; con el agarre real el puño (que la malla dibuja
   ~16 cm más allá del hueso, ver palmLocal) queda casi encima del plano cercano y se ve como un
   bulto oscuro gigante en el medio del cuadro — MEDIDO en la captura Z-hands-fr: 17,6% del
   cuadro en negro mirando arriba y el bulto tapando la mira.
   Acá la muñeca se manda a ~32 cm, que es la misma distancia que core_p eligió (y midió) para
   el puño izquierdo de la guardia: con eso los dos puños quedan del mismo tamaño, abajo, uno a
   cada lado, y el centro del cuadro libre. La IZQUIERDA no se toca: ya la lleva melFpLeft()
   (core_p) a su punto de la pantalla con la misma disciplina de caché. */
const FPFIST={push:.190,side:.020,drop:-.055};
/* y la IZQUIERDA de la guardia (core_p, MFISTL: es un const pero sus ELEMENTOS son mutables) se
   corre igual: mismo alejamiento y misma bajada, así los dos puños quedan del mismo tamaño y a
   la misma altura. MEDIDO en Z-hands-fr: con los valores de core_p (35 cm) el puño derecho
   llegaba a la mira (11,7% de la caja del centro con piel/negro) y las dos cáscaras se veían
   abiertas por el plano cercano; alejándolos el corte queda fuera del cuadro. */
if(typeof MFISTL!=='undefined'&&MFISTL&&MFISTL.length===3){
  MFISTL[0]=-.170;MFISTL[1]=-.190;MFISTL[2]=-.420;
}

/* la fase avanza UNA vez por frame y ANTES que el IK del brazo, que es quien lee el objetivo:
   animStep(dt) es ese punto (adentro llama a fpEyeCalc + armIKR), y envolverla acá deja intacta
   la capa de melee de core_p, que ya la había envuelto. */
const animStepSW=animStep;
animStep=function(dt){
  nsafe(()=>fpSwayStep(dt),'fpsway');
  return animStepSW.apply(this,arguments);
};

/* ---------- medición ---------- */
if(DEV&&window.__H)Object.assign(window.__H,{
  /* estado del congelado: got 1 = referencia sacada del clip, 2 = de la pose viva.
     drift = cuánto se movió la raíz respecto de la referencia (tiene que ser 0 en 1ª persona) */
  fpFrz:v=>{
    if(v!==undefined)FRZ.on=!!v;
    const b=fpRootBone();
    return {on:FRZ.on,active:!!(FRZ.on&&fpMine()&&FRZ.ok),bone:b?b.name:null,
      ref:FRZ.ok?1:0,got:FRZ.got,
      drift:b&&FRZ.ok?+b.quaternion.angleTo(FRZ.q).toFixed(5):null,
      dpos:b&&FRZ.ok?+b.position.distanceTo(FRZ.p).toFixed(5):null};
  },
  /* offsets del balanceo de este frame (m y rad) + fase/velocidad filtrada */
  fpSway:()=>({on:FPSW.on,x:+fpOF.x.toFixed(5),y:+fpOF.y.toFixed(5),z:+fpOF.z.toFixed(5),
    rx:+fpOF.rx.toFixed(5),ry:+fpOF.ry.toFixed(5),rz:+fpOF.rz.toFixed(5),
    phase:+fpPhase.toFixed(3),sp:+fpSpF.toFixed(3),air:+fpAirF.toFixed(3),land:+fpLand.toFixed(3)}),
  /* tocar cualquier constante del balanceo en vivo (para medir sin recompilar) */
  fpSwaySet:(k,v)=>{if(!(k in FPSW))return null;FPSW[k]=+v;return FPSW[k];},
  fpSwayOn:v=>{if(v!==undefined)FPSW.on=v?1:0;return FPSW.on;},
  /* volver a prender el viewmodel de manos (comparación A/B contra el agarre real) */
  vmOn:v=>{if(v!==undefined){VMC.on=v?1:0;if(v)vmAsk=false;}return VMC.on;}
});
