
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
const FARM_HAND=/hand|fore|thumb|index|middle|ring|pinky|finger/i;
const FARM_ARM=/arm/i, FARM_NOARM=/shoulder|clavicle/i;
const fpArmFlag=name=>{
  const n=String(name||'').toLowerCase();
  return (FARM_HAND.test(n)||(FARM_ARM.test(n)&&!FARM_NOARM.test(n)))?1:0;
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
  mat.onBeforeCompile=function(shader){
    /* uArms: 0/1, un jugador entero o sólo brazos. uArmF: por hueso, cuánto es "brazo".
       this.userData.uArms se guarda en el MATERIAL (no en una variable de este archivo) para
       que sobreviva a Material.clone(): el fantasma clona el material entero (ver core_f,
       charClone) y ahí se le resetea el value a 0, así el mismo onBeforeCompile —que se copia
       por referencia, no se vuelve a ejecutar el .clone()— lee el uArms PROPIO del fantasma. */
    shader.uniforms.uArms=this.userData.uArms||(this.userData.uArms={value:0});
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
      '#include <common>\nvarying float vArm;\nuniform float uArms;');
    shader.fragmentShader=shader.fragmentShader.replace('void main() {',
      'void main() {\n\tif(uArms>.5 && vArm<'+FP_ARM_THRESHOLD+')discard;');
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
  const ms=fpArmMaterials();
  if(!ms)return;
  const on=(PL.fp&&!PL.rag&&!freeCam)?1:0;
  if(on){
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
  for(const m of ms){m.clippingPlanes=on?[FPCLIP]:null;m.needsUpdate=true;}
};

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
  }
});
