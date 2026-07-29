
/* ============================================================
   HYPER SANDBOX — 1ª PERSONA: BRAZOS POR SHADER + PLANO CERCANO
   ------------------------------------------------------------
   Antes (core_c, fpClip) el recorte de 1ª persona era DOS THREE.Plane: uno pegado a la cámara
   (FPCLIP, cabeza/cuello) y uno horizontal a la altura de la cadera (FPLEG, piernas). Servía
   mirando más o menos al frente, pero mirando arriba o abajo un plano fijo al ojo no distingue
   brazo de torso: en algún ángulo el de la cadera dejaba ver el pecho, o el de la cara se comía
   el hombro.
   ACÁ SE AGREGA UN DISCARD POR PESO DE HUESO PARA EL TORSO/PIERNAS: cada vértice ya sabe, por
   su propio skinning, qué porcentaje de su movimiento depende de huesos de BRAZO (mano,
   antebrazo, dedos, brazo — no clavícula/hombro). Ese porcentaje viaja a la varying vArm, y en
   1ª persona el fragment shader descarta lo que no llega a ser brazo: FPLEG (la pierna) ya no
   hace falta, el discard la saca sola sea cual sea el ángulo de cámara.
   PERO EL DISCARD POR SÍ SOLO NO ALCANZA (bug real, con capturas de celular): sin ningún plano
   cercano el BRAZO SIGUE SIENDO GEOMETRÍA, y esa geometría cruza literalmente el punto de la
   cámara cuando el brazo está estirado hacia el arma (mirar arriba: el antebrazo tapa media
   pantalla de negro; mirar abajo: quedan pedazos color piel desgarrados cerca del ojo) — el
   discard sólo decide QUÉ vértices sobreviven, no impide que un triángulo que sobrevive pase
   ADELANTE del near plane de la cámara y se vea gigante y deformado. Por eso acá se RECUPERA
   sólo FPCLIP (el plano pegado a la cámara, mirando adonde mira ella): FPLEG no vuelve, esa la
   sigue sacando el discard.
   Se concatena último (después de core_c y core_f): ya existen THREE, charRoot, bones, PL,
   freeCam, camera, GH (core_f) y fpClip/fpClipMaterials/FPCLIP/FPCLIPD (core_c, funciones y
   variables REASIGNABLES/MUTABLES: acá se pisa fpClip entero combinando lo nuevo —discard— con
   lo viejo —FPCLIP—, sin tocar core_c).
   ============================================================ */

/* ---------- 1. qué huesos son "brazo" ----------
   mano, antebrazo y dedos son brazo sin dudarlo. La palabra "arm" sola también (el brazo de
   arriba), PERO no si es hombro/clavícula: esos mueven el torso entero y si se dejaran adentro
   el pecho se colaría cada vez que el hombro sube con la animación. */
const FARM_HAND=/hand|fore|lowerarm|thumb|index|middle|ring|pinky|finger/i;
const FARM_ARM=/arm/i, FARM_NOARM=/shoulder|clavicle/i;
/* EL FLAG YA NO ES 0/1 SINO GRADUADO: antebrazo+mano+dedos = 1, brazo de arriba = .6, resto 0.
   Con un flag binario el umbral sólo podía elegir "brazo entero o nada"; con dos escalones el
   MISMO shader sirve para las dos cosas según el umbral (que ahora es un uniforme, uArmT):
     umbral .45  -> sobrevive el brazo entero (lo que hacía este archivo antes)
     umbral .75  -> sobrevive sólo antebrazo+mano (el codo y el hombro se van)
   Eso último es lo que necesita el VIEWMODEL: en las capturas del celular lo que cruzaba el
   cuadro por el borde izquierdo era justo el CODO/HOMBRO, y con un solo uniforme se puede
   cortar ahí sin recompilar el shader ni tener dos arrays de flags. */
const fpArmFlag=name=>{
  const n=String(name||'').toLowerCase();
  if(FARM_HAND.test(n))return 1;
  return (FARM_ARM.test(n)&&!FARM_NOARM.test(n))?.6:0;
};

/* ---------- 2. flags por hueso, medidos del PRIMER SkinnedMesh ----------
   se asume un solo esqueleto para todo el personaje (es como viene el GLB): si algún día
   hubiera mallas con esqueletos distintos, el índice de un hueso de una no vale para la otra,
   pero eso no pasa en este rig. */
let fpArmFlags=null,fpArmNB=0;
function fpArmBoneFlags(){
  if(fpArmFlags)return fpArmFlags;
  if(!charRoot)return null;
  let sk=null;
  charRoot.traverse(o=>{ if(!sk&&o.isSkinnedMesh&&o.skeleton&&o.skeleton.bones.length)sk=o.skeleton; });
  if(!sk)return null;
  const bones=sk.bones,n=bones.length;
  const f=new Float32Array(n);
  for(let i=0;i<n;i++)f[i]=fpArmFlag(bones[i].name);
  fpArmNB=n;
  return (fpArmFlags=f);
}

/* ---------- 3. parchar un material skinned ----------
   NO se toca el material del arma (cuelga de un hueso pero no es skinned) ni nada que no sea
   SkinnedMesh: sólo el cuerpo necesita el discard. */
/* .45 y no .32 — MEDIDO contra las capturas del bug: con .32 sobrevivían al discard restos de
   piel/tela del antebrazo cerca del codo/hombro (vértices con el peso repartido entre el hueso
   de brazo y el de torso), que es justo lo que se veía como "pedazos desgarrados color piel"
   cerca de la cámara mirando hacia abajo. Subir el umbral empuja el corte más adentro del brazo
   (más lejos del torso), así que si algún día se ve la MANO recortada (poco probable: la mano
   entera flaggea 1.0 en fpArmFlag, no queda en zona de mezcla) hay que bajar este número, no el
   .5 de uArms (ese es el interruptor entero/brazos, no la zona de mezcla del vértice). */
const FP_ARM_THRESHOLD=.45;
function fpArmPatch(mat,flags,NB){
  if(!mat||mat.userData._farm)return;      // no parchar el mismo material dos veces
  mat.userData._farm=1;
  mat.clippingPlanes=null;                 // estado inicial: lo prende fpClip() al entrar en 1ª
  if(!mat.userData.uArms)mat.userData.uArms={value:0};
  /* el umbral pasa a ser UNIFORME (no una constante pegada en el código del shader) para poder
     moverlo en vivo con __H.vmSet('armT',x) sin recompilar nada, y para que el viewmodel use
     uno más agresivo que el cuerpo real compartiendo el MISMO programa. */
  if(!mat.userData.uArmT)mat.userData.uArmT={value:FP_ARM_THRESHOLD};
  mat.onBeforeCompile=function(shader){
    /* uArms: 0/1, un jugador entero o sólo brazos. uArmF: por hueso, cuánto es "brazo".
       this.userData.uArms se guarda en el MATERIAL (no en una variable de este archivo) para
       que sobreviva a Material.clone(): el fantasma clona el material entero (ver core_f,
       charClone) y ahí se le resetea el value a 0, así el mismo onBeforeCompile —que se copia
       por referencia, no se vuelve a ejecutar el .clone()— lee el uArms PROPIO del fantasma. */
    shader.uniforms.uArms=this.userData.uArms||(this.userData.uArms={value:0});
    shader.uniforms.uArmT=this.userData.uArmT||(this.userData.uArmT={value:FP_ARM_THRESHOLD});
    shader.uniforms.uArmF={value:flags};
    /* vertex: cuánto de este vértice es brazo, según los mismos índices/pesos que ya usa el
       skinning normal (skinIndex/skinWeight vienen de #include <skinning_pars_vertex>, que se
       resuelve ANTES de <skinning_vertex> en el template de three). Si el chunk no matchea
       (shader distinto al esperado) el replace no hace nada: el personaje queda entero, sano. */
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying float vArm;\nuniform float uArmF['+NB+'];');
    shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',
      '#include <skinning_vertex>\n'
      +'\tvArm = uArmF[int(skinIndex.x)]*skinWeight.x + uArmF[int(skinIndex.y)]*skinWeight.y'
      +' + uArmF[int(skinIndex.z)]*skinWeight.z + uArmF[int(skinIndex.w)]*skinWeight.w;');
    /* fragment: al ARRANQUE de main(), antes de cualquier cuenta de luz (más barato: no se
       calcula nada de un fragmento que se va a tirar). FP_ARM_THRESHOLD (no .5): un vértice que
       reparte su peso entre antebrazo y torso (la zona del codo/hombro) tiene que seguir
       viéndose brazo hasta ese punto, si no queda una costura pelada justo en el codo. */
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying float vArm;\nuniform float uArms;\nuniform float uArmT;');
    /* TRES MODOS en un solo uniforme: 0 = el jugador entero (3ª persona / fantasmas),
       1 = sólo lo que pase el umbral (brazos: el modo viejo, ahora sólo de RESPALDO si el
       viewmodel no se pudo armar), 2 = NADA. El 2 es el que usa el viewmodel: el cuerpo real
       deja de dibujarse por completo — así no hay codo/hombro/torso que pueda entrar por un
       borde — pero el objeto sigue visible para el pase de SOMBRA, que no usa este material
       (three arma el depth material aparte y no le copia onBeforeCompile), así que el jugador
       sigue proyectando su sombra completa en 1ª persona. */
    shader.fragmentShader=shader.fragmentShader.replace('void main() {',
      'void main() {\n\tif(uArms>1.5)discard;\n\telse if(uArms>.5 && vArm<uArmT)discard;');
  };
  /* +NB: si algún día conviven dos esqueletos con distinto número de huesos, cada uno necesita
     su propio programa (el tamaño de uArmF va fijo en el código del shader) */
  mat.customProgramCacheKey=()=>'fparms'+NB;
  mat.needsUpdate=true;
}

/* ---------- 4. lista de materiales del charRoot LOCAL, lazy (igual que fpClipMaterials) ----------
   el personaje puede no estar listo todavía (GLB async): se reintenta cada frame hasta que
   aparezca, después queda cacheada para siempre (los materiales no cambian en caliente). */
let fpArmMats=null;
function fpArmMaterials(){
  if(fpArmMats)return fpArmMats;
  if(!charRoot)return null;
  const flags=fpArmBoneFlags();
  if(!flags)return null;
  const NB=fpArmNB,a=[];
  charRoot.traverse(o=>{ if(!o.isSkinnedMesh)return;
    const ms=Array.isArray(o.material)?o.material:[o.material];
    for(const m of ms)if(m&&a.indexOf(m)<0)a.push(m); });
  if(!a.length)return null;
  for(const m of a)fpArmPatch(m,flags,NB);
  return (fpArmMats=a);
}

/* ---------- 5. fpClip REASIGNADA ----------
   fpClip está declarada con "function" en core_c: al concatenarse todo en UN SOLO módulo ES,
   volver a escribir "function fpClip(){...}" acá sería una SEGUNDA declaración del mismo
   nombre en el mismo scope de módulo, y eso es SyntaxError en modo estricto (los módulos
   siempre lo son) — probado a mano: "Identifier 'fpClip' has already been declared".
   Function declarations SÍ crean un binding MUTABLE (no es const), así que la forma correcta
   de pisarla es una asignación común, no una nueva declaración. fpClipOn (let, core_c) es el
   MISMO motivo: se reasigna, no se vuelve a declarar.
   uArms (el discard) se puede escribir TODOS los frames sin culpa, es sólo un uniforme y no
   cuesta recompilación. clippingPlanes en cambio SÍ recompila el shader (dispara needsUpdate,
   three reconstruye el programa), así que igual que hacía la fpClip original de core_c, sólo se
   toca cuando el estado on/off cambia — fpClipOn (la variable de core_c) sigue sirviendo
   exactamente para eso, por más que ahora la arme esta función y no la de core_c.
   FPLEG NO vuelve: la pierna la sigue sacando el discard de vArm, este plano es sólo el cercano
   pegado a la cámara (el que evita que el brazo estirado cruce el ojo, ver el bug de arriba).
   Los fantasmas (core_f, charClone) clonan el material entero: clippingPlanes es un array por
   INSTANCIA de material (Material.clone() copia la referencia del array, pero fpArmMaterials()
   sólo agarra los materiales del charRoot LOCAL, nunca los clonados), así que esto no les toca
   nada — igual que ya pasaba con uArms. */
fpClip=function(){
  /* EL VIEWMODEL SE ACTUALIZA ACÁ, ANTES DE DECIDIR EL MODO DEL CUERPO REAL. camStep() llama a
     fpClip() al final de TODAS sus ramas (juego, cámara libre y vehículo) y siempre con la
     cámara ya colocada: es el único lugar del motor donde eso pasa sin tener que reasignar
     camStep entero. El dt lo trae el wrap de camStep de más abajo (fpClip no recibe ninguno). */
  nsafe(()=>vmStep(vmDt),'vmstep');
  const ms=fpArmMaterials();
  if(!ms)return;
  const fp=(PL.fp&&!PL.rag&&!freeCam);
  /* 2 = viewmodel andando: el cuerpo real no se dibuja (pero sigue tirando sombra).
     1 = respaldo (el clon no se pudo armar): brazos por discard + plano cercano, lo de antes.
     0 = 3ª persona: el jugador entero. */
  const on=fp?(vmOn?2:1):0;
  if(on===1){
    /* mismo cálculo que la fpClip de core_c: el plano sale de la pose de ESTE frame, con la
       cámara ya puesta (camStep llama a fpClip() al final, ver ese archivo). */
    camera.getWorldDirection(_fcd);
    _fcp.copy(camera.position).addScaledVector(_fcd,FPCLIPD);
    FPCLIP.setFromNormalAndCoplanarPoint(_fcd,_fcp);
  }
  for(const m of ms){
    const u=m.userData.uArms||(m.userData.uArms={value:0});
    u.value=on;
  }
  if(on===fpClipOn)return;                 // sin cambio de estado: no tocar clippingPlanes
  fpClipOn=on;
  /* el plano de recorte sólo hace falta en el modo 1 (brazos de verdad cerca del ojo). En el
     modo 2 no hay nada del cuerpo dibujado, así que se apaga: un array menos que recompile. */
  for(const m of ms){m.clippingPlanes=(on===1)?[FPCLIP]:null;m.needsUpdate=true;}
};

/* ============================================================
   VIEWMODEL DE 1ª PERSONA — BRAZOS+ARMA COLGADOS DE LA CÁMARA, BALANCEO PROCEDURAL
   ------------------------------------------------------------
   POR QUÉ. Hasta acá los brazos de 1ª persona eran los del ESQUELETO REAL: la cámara en los
   ojos, la mano derecha llevada por IK a un punto del marco de la cámara y el arma colgando de
   esa mano. Dos problemas que el discard por peso de hueso no puede arreglar, los dos con
   capturas del celular:
     1) el HOMBRO y el CODO cuelgan del torso, y el torso hace la animación de correr: el codo
        entraba cruzando el cuadro desde el borde izquierdo y el antebrazo pasaba literalmente
        por delante del ojo. El discard elige qué vértices se dibujan, no dónde están.
     2) la animación de correr sacude las manos ("en primera persona es incómodo... mueve mucho
        las manos"), y en 1ª persona eso no se quiere: se quiere el balanceo suave de cualquier
        FPS, que es PROCEDURAL.
   CÓMO. Un grupo VMG hijo de la CÁMARA con un CLON del personaje (charClone de core_f, que ya
   clona esqueleto y materiales propios) congelado en UNA pose (la que dejan armIKR+armIK
   sosteniendo el arma) y el arma metida en la mano del clon. Todo el conjunto es RÍGIDO
   respecto de la pantalla; lo único que se mueve es VMG, con bobbing/sway procedurales por dt.
   El cuerpo real pasa a modo 2 (no se dibuja) pero sigue existiendo: sigue haciendo la
   animación de correr para la SOMBRA, para la 3ª persona y para el paquete de red (los otros
   jugadores lo siguen viendo corriendo, ver core_f — no se toca nada de eso).
   EL CLON NO ES CARO: es una malla con skin más, sin sombra y con el fragment shader
   descartando todo lo que no sea antebrazo/mano, y sólo existe mientras haya 1ª persona.
   ============================================================ */

/* ---- constantes, TODAS tocables en vivo con __H.vmSet(k,v) ----
   x/y/z/rx/ry/rz/sc = dónde queda el ARMA en el marco de la cámara (metros y radianes). El
     resto del conjunto (manos, antebrazos) sale de ahí: la pose es rígida, así que fijar el
     arma fija todo. z negativo = adelante.
   bob* = amplitud del balanceo (metros) y frecuencia (Hz) caminando / corriendo.
   sway* = retardo al girar la vista. tau = constante de tiempo del filtro (s).
   armT = umbral del discard del clon (ver fpArmFlag: .6 es el brazo de arriba, 1 el antebrazo).
*/
const VMC={
  on:1,
  /* MEDIDO con __H.vmDiff() (píxeles que aporta el viewmodel) y capturas leídas una por una:
     con z=-.36 el conjunto tapaba el 14% de la pantalla y las manos abiertas del modelo (el rig
     NO tiene huesos de dedo: son 6 huesos de brazo y ninguno de mano cerrada, así que la mano
     queda como viene) se veían enormes abajo al centro — es el "manchón" de la captura del
     celular. A z=-.52 el aporte baja al 6,8% y queda todo en el tercio de abajo. */
  x:.180,y:-.220,z:-.520,rx:.010,ry:-.030,rz:.020,sc:1,
  bobWX:.011,bobWY:.008,bobRX:.020,bobRY:.014,   /* W = walk, R = run */
  fW:1.15,fR:2.0,                                 /* Hz del paso (el pedido: 1,0-1,3 / 1,8-2,2) */
  idleX:.0035,idleY:.0030,idleF1:.17,idleF2:.23,  /* sway lento estando quieto */
  swayP:.18,swayR:.30,swayMax:.045,tau:.085,      /* retardo de la vista (m por rad de atraso) */
  tilt:.030,tiltP:.014,                           /* inclinación al desplazarse de costado */
  kick:.045,kickR:.35,                            /* patada del disparo (usa recoil de core_b) */
  /* armT MEDIDO, no elegido a ojo: con .50 el brazo de arriba (flag .6) sobrevive, cruza el
     plano cercano de la cámara y __H.vmDiff() acusa 41 píxeles en el borde IZQUIERDO y 50 en el
     derecho mirando hacia abajo (la caja del diferencial se abre a toda la pantalla: es
     exactamente el bug de las capturas del celular). Desde .62 los bordes dan 0; se deja .70
     para tener margen contra otras poses/armas sin acortar el antebrazo más de lo necesario. */
  armT:.70,                                       /* corte del clon: sólo antebrazo+mano */
  air:.35                                         /* cuánto queda del bobbing en el aire */
};
let VMG=null,vmChar=null,vmHand=null,vmMats=null,vmBoneMap=null;
let vmOn=false,vmDt=1/60,vmFail=0,vmCapW=null,vmCapClean=false;
let vmPhase=0,vmTime=0,vmYawF=0,vmPitF=0,vmSpF=0,vmAirF=0;
const vmOff={x:0,y:0,z:0,rx:0,ry:0,rz:0};        /* último offset aplicado, para __H.vmInfo */
const _vmW=new THREE.Matrix4(),_vmH=new THREE.Matrix4(),_vmM=new THREE.Matrix4(),
      _vmI=new THREE.Matrix4(),_vmP=new THREE.Vector3(),_vmQ=new THREE.Quaternion(),
      _vmS=new THREE.Vector3(),_vmV=new THREE.Vector3(),_vmE=new THREE.Euler();
const vmCap={p:new THREE.Vector3(),q:new THREE.Quaternion(),s:new THREE.Vector3(1,1,1),
             hq:new THREE.Quaternion()};

/* ¿corresponde viewmodel ahora? En vehículo NO: ahí la cámara la pone EXT.cam (core_e) y las
   manos van al volante, no a la pantalla. Ragdoll y cámara libre tampoco (se quiere ver el
   cuerpo). VHS es el estado del auto (core_e, ya inicializado cuando esto corre por frame). */
function vmWant(){
  if(!VMC.on||!PL.fp||PL.rag||freeCam)return false;
  if(typeof VHS!=='undefined'&&VHS)return false;
  return true;
}
/* huesos del clon por nombre: SkeletonUtils.clone() conserva los nombres, así que copiar la
   pose es un for por nombre y no depende de ningún orden. */
function vmMap(root){
  const m={};
  root.traverse(o=>{ if(o.isBone&&!m[o.name])m[o.name]=o; });
  return m;
}
/* arma el clon UNA vez (el GLB es asíncrono: se reintenta hasta que exista, con un tope de
   intentos para no quedar probando para siempre si el modelo no trae huesos de mano). */
function vmInit(){
  if(vmChar||vmFail>8)return !!vmChar;
  if(!charRoot||!(bones.rHand||bones.rFore)||typeof charClone!=='function'){vmFail++;return false;}
  const c=nsafe(()=>charClone(),'vmclone');
  if(!c){vmFail++;return false;}
  const map=vmMap(c),rb=bones.rHand||bones.rFore,h=map[rb.name];
  if(!h){vmFail=99;if(c.parent)c.parent.remove(c);return false;}
  /* sin sombra: el conjunto vive a 30 cm de la cámara y proyectaría una mancha enorme en el
     piso. La sombra del jugador la sigue tirando el cuerpo REAL (modo 2 sólo apaga el color). */
  const mats=[];
  c.traverse(o=>{ if(!o.isMesh&&!o.isSkinnedMesh)return;
    o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;o.visible=true;
    const ms=Array.isArray(o.material)?o.material:[o.material];
    for(const m of ms)if(m&&mats.indexOf(m)<0)mats.push(m); });
  /* los materiales del clon vienen de Material.clone(): userData se copia por JSON, así que
     traen _farm=1 y un uArms/uArmT que NO son los objetos del original (JSON los aplana a
     {value:n}). Se los vuelve a parchar a mano — hace falta porque onBeforeCompile no se copia
     en el clone y sin él no existe ni el discard ni el varying. */
  const flags=fpArmBoneFlags(),NB=fpArmNB;
  for(const m of mats){
    delete m.userData._farm;
    m.userData.uArms={value:1};
    m.userData.uArmT={value:VMC.armT};
    if(flags)fpArmPatch(m,flags,NB);
    m.clippingPlanes=null;
  }
  c.position.set(0,0,0);c.rotation.set(0,0,0);
  VMG=new THREE.Group();VMG.name='vm';VMG.visible=false;
  VMG.add(c);camera.add(VMG);
  vmChar=c;vmHand=h;vmMats=mats;vmBoneMap=map;
  return true;
}
/* copia la pose ENTERA (todos los huesos, transformada local) del esqueleto real al clon y la
   deja congelada. Se llama sólo al capturar: es lo que hace que en 1ª persona no exista la
   animación de correr, sin tocar la animación real (que sigue para la sombra/3ª/red). */
function vmPose(){
  if(!vmBoneMap||!charRoot)return;
  charRoot.traverse(o=>{
    if(!o.isBone)return;
    const d=vmBoneMap[o.name];if(!d)return;
    d.position.copy(o.position);d.quaternion.copy(o.quaternion);d.scale.copy(o.scale);
  });
}
/* ---- CAPTURA: de dónde sale la pose ----
   La pose buena es la que YA tiene el motor: animStep() corre armIKR() (mano derecha al marco
   de la cámara) y holdWeapon() corre armIK() (mano izquierda al guardamano). Para que la
   izquierda esté puesta hace falta que el arma cuelgue del hueso REAL, así que la captura
   devuelve el arma a la mano un instante, llama a holdWeapon() (armIK() arranca con
   ikRestore(), o sea que llamarla dos veces en el mismo frame NO acumula giro) y se guarda:
     - la pose de todos los huesos,
     - la transformada LOCAL del arma dentro del hueso de la mano (vmCap.p/q/s),
     - la orientación de la mano respecto de la cámara (vmCap.hq), que es el respaldo para las
       armas sin modelo (puños): ahí no hay arma de la que colgarse.
   Con eso el conjunto queda rígido y se puede ANCLAR por el arma (ver vmPlace). */
function vmCapture(){
  if(!vmChar)return false;
  const rb=bones.rHand||bones.rFore;if(!rb)return false;
  const w=weap();
  if(wModel){
    const prev=wModel.parent;
    rb.add(wModel);wModel.position.set(0,0,0);wModel.rotation.set(0,0,0);
    nsafe(()=>holdWeapon(),'vmhold');
    vmCap.p.copy(wModel.position);vmCap.q.copy(wModel.quaternion);vmCap.s.copy(wModel.scale);
    if(prev&&prev!==rb)prev.add(wModel);
  }
  rb.updateWorldMatrix(true,false);
  rb.getWorldQuaternion(_vmQ);
  camera.getWorldQuaternion(vmCap.hq);
  vmCap.hq.invert().multiply(_vmQ);          // mano respecto de la cámara
  vmPose();
  vmCapW=w?w.id:'-';
  /* "limpia" = capturada quieto y mirando más o menos al horizonte. Con la pose congelada da
     casi lo mismo (el anclaje recoloca el conjunto igual), pero de pie el IK no está saturado
     y el codo queda en su sitio natural: si la primera captura salió corriendo, se repite una
     vez cuando el jugador se queda quieto. */
  vmCapClean=(Math.hypot(plBody.velocity.x,plBody.velocity.z)<.6&&Math.abs(PL.pitch)<.45);
  vmAttach();
  vmPlace();
  return true;
}
/* el arma pasa a la mano DEL CLON con la transformada local capturada: así el agarre es
   exactamente el mismo que en 3ª persona (empuñadura en el puño), pero rígido y colgado de la
   cámara. holdWeapon() (core_c) se autoexcluye sola: chequea wModel.parent===bones.rHand y
   acá el padre es el hueso del clon, así que no vuelve a tocar ni el arma ni el brazo. */
function vmAttach(){
  if(!wModel||!vmHand)return;
  vmHand.add(wModel);
  wModel.position.copy(vmCap.p);wModel.quaternion.copy(vmCap.q);wModel.scale.copy(vmCap.s);
}
/* ---- ANCLAJE: el arma queda en un punto FIJO del marco de la cámara ----
   El conjunto es rígido, así que se resuelve con matrices y no con IK:
     M(arma en el marco de VMG) = clon.matrix · M(mano rel. clon) · M(arma rel. mano)
   se quiere que eso sea VMW (la constante de arriba), entonces
     clon.matrix = VMW · inv(M(mano rel. clon) · M(arma rel. mano))
   relMat() (core_c) da la matriz de un hueso relativa a la raíz multiplicando SÓLO matrices
   locales: no depende de dónde esté la cámara ni arrastra el error de invertir una matrixWorld.
   Sin arma (puños) se ancla la MANO con la orientación capturada (vmCap.hq). */
function vmPlace(){
  if(!vmChar||!vmHand)return false;
  _vmE.set(VMC.rx,VMC.ry,VMC.rz,'YXZ');
  _vmQ.setFromEuler(_vmE);
  _vmP.set(VMC.x,VMC.y,VMC.z);
  _vmS.setScalar(VMC.sc);
  _vmW.compose(_vmP,_vmQ,_vmS);
  relMat(vmChar,vmHand,_vmH);
  if(wModel&&wModel.parent===vmHand){
    _vmM.compose(vmCap.p,vmCap.q,vmCap.s);
    _vmH.multiply(_vmM);                    // mano · arma = arma relativa al clon
  }else{
    _vmW.compose(_vmP,vmCap.hq,_vmS);       // sin arma: se ancla la mano
  }
  _vmI.copy(_vmH).invert();
  _vmM.copy(_vmW).multiply(_vmI);
  _vmM.decompose(vmChar.position,vmChar.quaternion,vmChar.scale);
  vmChar.updateMatrix();
  return true;
}
/* ---- BALANCEO PROCEDURAL ----
   Todo se calcula como OFFSET ABSOLUTO del estado de este frame y se ESCRIBE (no se suma) en
   VMG: es la misma lección que dejó la deriva de 57° de la respiración (core_c). Lo único que
   se acumula es la fase del paso, que es lo que tiene que acumular, y va por dt.
   Frecuencias: el pedido son 1,0-1,3 Hz caminando y 1,8-2,2 Hz corriendo. La vertical va al
   DOBLE de la lateral (dos pasos por ciclo de cadera = el 8 acostado clásico), así que la fase
   base es la lateral. */
function vmMotion(dt){
  if(!VMG)return;
  dt=dt>0?Math.min(dt,.1):0;
  vmTime+=dt;
  const vx=plBody.velocity.x,vz=plBody.velocity.z,sp=Math.hypot(vx,vz);
  /* filtros exponenciales por dt (nada de constantes por frame) */
  const kf=dt>0?1-Math.exp(-dt*8):1;
  vmSpF+=(sp-vmSpF)*kf;
  vmAirF+=((grounded||inWater?1:0)-vmAirF)*(dt>0?1-Math.exp(-dt*6):1);
  /* mezcla caminar->correr por velocidad: 0 a PL.spd es caminata, PL.run es carrera */
  const t=clamp((vmSpF-PL.spd*.55)/Math.max(.5,PL.run-PL.spd*.55),0,1);
  const mv=clamp((vmSpF-.35)/1.2,0,1)*(vmAirF+(1-vmAirF)*VMC.air);
  const f=VMC.fW+(VMC.fR-VMC.fW)*t;
  const AX=(VMC.bobWX+(VMC.bobRX-VMC.bobWX)*t)*mv,
        AY=(VMC.bobWY+(VMC.bobRY-VMC.bobWY)*t)*mv;
  vmPhase+=dt*Math.PI*2*f;
  if(vmPhase>Math.PI*2)vmPhase-=Math.PI*2;   // acotada: no crece sin límite en partidas largas
  const bx=Math.sin(vmPhase)*AX, by=Math.sin(vmPhase*2)*AY;
  /* idle sway: dos senoidales lentas y desfasadas, sólo cuando casi no se mueve */
  const iw=1-mv;
  const ix=Math.sin(vmTime*Math.PI*2*VMC.idleF1)*VMC.idleX*iw,
        iy=Math.sin(vmTime*Math.PI*2*VMC.idleF2+1.1)*VMC.idleY*iw;
  /* retardo de la vista: el filtro persigue la mirada y la DIFERENCIA es el atraso del arma */
  const ks=dt>0?1-Math.exp(-dt/Math.max(.01,VMC.tau)):1;
  let dy=PL.yaw-vmYawF;
  while(dy>Math.PI)dy-=Math.PI*2; while(dy<-Math.PI)dy+=Math.PI*2;   // yaw es circular
  vmYawF+=dy*ks;
  const dp=PL.pitch-vmPitF;vmPitF+=dp*ks;
  /* swayP está en METROS POR RADIÁN de atraso: girando a ω rad/s el atraso vale ≈ ω·tau, así
     que el corrimiento sale proporcional a la velocidad de giro y se detiene solo al parar.
     SIGNOS: girando a la izquierda (yaw crece) el mundo se va a la derecha en pantalla y el
     arma, que se quedó atrás, también → sx>0. Mirando arriba (pitch crece) el arma se queda
     abajo → sy<0. Las rotaciones van al revés que la cámara por el mismo motivo. */
  const sx=clamp(dy*VMC.swayP,-VMC.swayMax,VMC.swayMax),
        sy=clamp(-dp*VMC.swayP,-VMC.swayMax,VMC.swayMax);
  const ry=clamp(-dy*VMC.swayR,-.10,.10), rx=clamp(-dp*VMC.swayR,-.10,.10);
  /* inclinación al desplazarse de costado: velocidad lateral en el marco de la cámara */
  const ys=Math.sin(PL.yaw),yc=Math.cos(PL.yaw);
  const lat=clamp((vx*yc-vz*ys)/Math.max(1,PL.spd),-1,1);
  /* patada del disparo: recoil (core_b) ya viene decayendo por dt, sólo se lee */
  const rk=(typeof recoil==='number')?recoil:0;
  vmOff.x=bx+ix+sx-lat*VMC.tiltP;
  vmOff.y=by+iy+sy;
  vmOff.z=rk*VMC.kick;
  vmOff.rx=rx+rk*VMC.kickR+by*.6;
  vmOff.ry=ry+bx*.8;
  vmOff.rz=-lat*VMC.tilt+bx*1.2;
  VMG.position.set(vmOff.x,vmOff.y,vmOff.z);
  _vmE.set(vmOff.rx,vmOff.ry,vmOff.rz,'YXZ');
  VMG.quaternion.setFromEuler(_vmE);
  /* el mundo ya está actualizado hasta la cámara (camStep la colocó); refrescar acá el subárbol
     deja el arma con matrixWorld válida para los efectos de core_g (fogonazo, haz) y para
     cualquier medición del mismo frame, sin esperar al render. */
  camera.updateMatrixWorld(true);
}
function vmEnter(){
  if(!VMG)return;
  VMG.visible=true;
  /* los filtros arrancan pegados al estado real: si no, al entrar en 1ª persona el arma llega
     desde el borde de la pantalla (el sway ve un salto de yaw enorme el primer frame). */
  vmYawF=PL.yaw;vmPitF=PL.pitch;vmSpF=Math.hypot(plBody.velocity.x,plBody.velocity.z);
  vmAirF=grounded?1:0;
  const w=weap();
  if(!vmCapW||vmCapW!==(w?w.id:'-'))vmCapture();
  else {vmAttach();vmPlace();}
  vmMotion(0);
}
function vmLeave(){
  if(VMG)VMG.visible=false;
  /* el arma vuelve a la mano de verdad: en 3ª persona tiene que acompañar la animación otra vez
     (y los efectos leen su matrixWorld). attachWeapon() (core_b) hace exactamente eso. */
  if(wModel&&vmHand&&wModel.parent===vmHand)nsafe(()=>attachWeapon(),'vmback');
}
function vmStep(dt){
  const want=vmWant();
  if(want&&!vmChar)vmInit();
  const on=want&&!!vmChar;
  if(on!==vmOn){vmOn=on;if(on)vmEnter();else vmLeave();return;}
  if(!vmOn)return;
  /* recapturar si cambió el arma (otro agarre, otra transformada local), si alguien devolvió el
     arma a la mano real (equip/respawn llaman a attachWeapon) o si todavía no se pudo capturar
     de pie y ahora sí. */
  const w=weap(),id=w?w.id:'-';
  if(id!==vmCapW||(wModel&&wModel.parent!==vmHand))vmCapture();
  else if(!vmCapClean&&Math.hypot(plBody.velocity.x,plBody.velocity.z)<.6&&Math.abs(PL.pitch)<.45)
    vmCapture();
  vmMotion(dt);
}
/* dt: fpClip() no lo recibe, así que se lo guarda acá. Se envuelve camStep en vez de tocarla
   (es de core_b) y se llama SIEMPRE a la original: si otro archivo la envuelve también, las
   dos capas siguen funcionando. */
const camStepVM=camStep;
camStep=function(dt){ vmDt=(dt>0?Math.min(dt,.1):0); return camStepVM(dt); };
/* si el arma cambia de modelo o el jugador reaparece, core_b la vuelve a colgar del hueso real:
   se la recupera en el acto para que no se vea un fotograma con el arma dentro de la cabeza. */
const attachWeaponVM=attachWeapon;
attachWeapon=function(){
  const r=attachWeaponVM.apply(this,arguments);
  if(vmOn&&vmChar)nsafe(()=>vmCapture(),'vmreatt');
  return r;
};

/* ---- MEDIDOR: cuántos píxeles aporta el viewmodel y por dónde ----
   Se dibuja la MISMA escena dos veces en un render target (sin y con VMG) y se restan. La
   diferencia es exactamente lo que el viewmodel pone en pantalla: si en la franja del borde
   izquierdo/superior/derecho hay 0 píxeles distintos, por ahí no entra NADA (ni codo, ni
   hombro, ni torso). Se usa un RT y no el canvas porque leer el framebuffer por defecto
   depende de que no haya habido swap; el RT es determinista.
   La mitad de resolución alcanza y cuesta la mitad: los pedazos de cuerpo del bug medían
   decenas de miles de píxeles, no uno. */
let vmRT=null;
function vmDiff(){
  if(!renderer||!VMG)return null;
  const cv=renderer.domElement;
  const W=Math.max(8,Math.round(cv.width/2)),H=Math.max(8,Math.round(cv.height/2));
  if(!vmRT||vmRT.width!==W||vmRT.height!==H){if(vmRT)vmRT.dispose();
    vmRT=new THREE.WebGLRenderTarget(W,H);}
  const oldRT=renderer.getRenderTarget(),vis=VMG.visible;
  const a=new Uint8Array(W*H*4),b=new Uint8Array(W*H*4);
  renderer.setRenderTarget(vmRT);
  VMG.visible=false;renderer.render(scene,camera);renderer.readRenderTargetPixels(vmRT,0,0,W,H,a);
  VMG.visible=true; renderer.render(scene,camera);renderer.readRenderTargetPixels(vmRT,0,0,W,H,b);
  VMG.visible=vis;renderer.setRenderTarget(oldRT);
  let n=0,x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  const ed={left:0,right:0,top:0,bottom:0};
  const bx=Math.max(1,Math.round(W*.03)),by=Math.max(1,Math.round(H*.03));
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*4;
    if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])<12)continue;
    n++;
    if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    if(x<bx)ed.left++; if(x>=W-bx)ed.right++;
    if(y>=H-by)ed.top++; if(y<by)ed.bottom++;      // en el RT la fila 0 es la de ABAJO
  }
  const nx=x=>+((x+.5)/W*2-1).toFixed(3),ny=y=>+((y+.5)/H*2-1).toFixed(3);
  return {n,frac:+(n/(W*H)).toFixed(4),w:W,h:H,edge:ed,
    bbox:n?[nx(x0),ny(y0),nx(x1),ny(y1)]:null};
}

if(DEV&&window.__H)Object.assign(window.__H,{
  /* estado del recorte por shader: on = valor actual del uniforme (0 entero, 1 sólo brazos),
     mats = materiales locales parchados, flags = cuántos huesos se marcaron como brazo,
     sharedWithGhost = true si por error algún fantasma sigue compartiendo un material con el
     charRoot local (el bug que el fix de core_f/charClone evita) */
  fpArms:()=>{
    const ms=fpArmMats,first=ms&&ms[0];
    let shared=false;
    if(ms&&typeof GH==='object')for(const id in GH){
      const g=GH[id];if(!g||!g.root||shared)continue;
      g.root.traverse(o=>{ if(shared||!o.isSkinnedMesh)return;
        const gm=Array.isArray(o.material)?o.material:[o.material];
        for(const m of gm)if(m&&ms.indexOf(m)>=0)shared=true; });
    }
    return {on:first?first.userData.uArms.value:null,
      mats:ms?ms.length:0,
      flags:fpArmFlags?fpArmFlags.reduce((s,v)=>s+(v>0?1:0),0):0,
      sharedWithGhost:shared};
  },
  /* forzar el uniforme a mano (para probar sin depender de PL.fp/rag/freeCam): dura hasta el
     próximo camStep, que llama a fpClip() y lo vuelve a fijar según el estado real */
  fpArmsSet:v=>{
    const ms=fpArmMaterials();if(!ms)return false;
    const val=v?1:0;
    for(const m of ms){ const u=m.userData.uArms||(m.userData.uArms={value:0}); u.value=val; }
    return true;
  },
  /* ---- instrumentación del VIEWMODEL ----
     vmInfo(): estado + posición del arma EN PANTALLA (NDC) + si el cuerpo real se dibuja +
       dónde caen los huesos que no tienen que verse (codo/hombro/torso/cabeza del clon).
     vmSet(k,v): cualquier constante de VMC en vivo (posición del arma, amplitudes, umbral del
       discard...). Recoloca el conjunto si hace falta.
     vmDiff(): MEDICIÓN de verdad de "no se ve nada del cuerpo": dibuja la escena dos veces en
       un render target (con y sin viewmodel) y cuenta los píxeles que cambian, su caja en NDC y
       cuántos tocan cada borde. Todo lo que aporta el viewmodel a la pantalla está en ese
       diferencial, así que si el borde izquierdo/superior da 0 no hay codo ni hombro entrando. */
  vmInfo:()=>{
    const o={on:vmOn,mode:vmOn?'vm':(PL.fp?'clip':'off'),ready:!!vmChar,fail:vmFail,
      cap:vmCapW,clean:vmCapClean,
      bobX:+vmOff.x.toFixed(4),bobY:+vmOff.y.toFixed(4),
      swayYaw:+vmOff.ry.toFixed(4),swayPit:+vmOff.rx.toFixed(4),roll:+vmOff.rz.toFixed(4),
      off:[+vmOff.x.toFixed(4),+vmOff.y.toFixed(4),+vmOff.z.toFixed(4)],
      phase:+vmPhase.toFixed(3),sp:+vmSpF.toFixed(2)};
    const ms=fpArmMats,first=ms&&ms[0];
    const uv=first?first.userData.uArms.value:null;
    o.bodyVisible=(charRoot?charRoot.visible:false)&&uv!==2;   // 2 = descartado entero
    o.uArms=uv;
    o.weapNDC=null;o.weapCam=null;
    const wo=(wModel&&vmHand&&wModel.parent===vmHand)?wModel:(vmHand||null);
    if(wo){
      wo.getWorldPosition(_vmV);_vmV.project(camera);
      o.weapNDC=[+_vmV.x.toFixed(4),+_vmV.y.toFixed(4)];
      /* y también en el MARCO DE LA CÁMARA (metros): así se ve el balanceo en cm y se puede
         comprobar que el anclaje dejó el arma justo donde dicen las constantes VMC.x/y/z */
      wo.getWorldPosition(_vmV);
      _vmI.copy(camera.matrixWorld).invert();
      _vmV.applyMatrix4(_vmI);
      o.weapCam=[+_vmV.x.toFixed(4),+_vmV.y.toFixed(4),+_vmV.z.toFixed(4)];
    }
    /* huesos que NO se tienen que ver: se informa su NDC y si caen dentro del cuadro (caer
       dentro no significa dibujarse — el discard los tira — pero sirve para saber qué tan al
       filo está la pose; la prueba dura es vmDiff). */
    const pk={elbowR:/right.*fore|fore.*r$|rightforearm/i,elbowL:/left.*fore|leftforearm/i,
      shR:/rightarm|right.*upperarm/i,shL:/leftarm|left.*upperarm/i,
      head:/head/i,hips:/hips|pelvis/i};
    const parts={inFrame:0};
    if(vmBoneMap)for(const k in pk){
      let b=null;
      for(const n in vmBoneMap)if(!b&&pk[k].test(n))b=vmBoneMap[n];
      if(!b){parts[k]=null;continue;}
      b.getWorldPosition(_vmV);_vmV.project(camera);
      const inF=_vmV.z<1&&Math.abs(_vmV.x)<=1&&Math.abs(_vmV.y)<=1;
      parts[k]=[+_vmV.x.toFixed(3),+_vmV.y.toFixed(3),inF?1:0];
      if(inF)parts.inFrame++;
    }
    o.parts=parts;
    o.armT=vmMats&&vmMats[0]?vmMats[0].userData.uArmT.value:null;
    return o;
  },
  vmSet:(k,v)=>{
    if(k==='armT'){VMC.armT=+v;if(vmMats)for(const m of vmMats)m.userData.uArmT.value=+v;return VMC.armT;}
    if(!(k in VMC))return null;
    VMC[k]=+v;
    if('xyz'.indexOf(k)>=0||k==='rx'||k==='ry'||k==='rz'||k==='sc')nsafe(()=>vmPlace(),'vmset');
    if(k==='on'&&!VMC.on&&vmOn){vmOn=false;vmLeave();}
    return VMC[k];
  },
  vmCap:()=>nsafe(()=>vmCapture(),'vmcap'),
  vmShow:b=>{if(VMG)VMG.visible=!!b;return VMG?VMG.visible:null;},
  vmDiff:()=>nsafe(()=>vmDiff(),'vmdiff')
});
