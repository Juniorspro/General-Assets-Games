
/* ============================================================
   HYPER SANDBOX — 1ª PERSONA: SÓLO LOS BRAZOS, POR SHADER
   ------------------------------------------------------------
   Antes (core_c, fpClip) el recorte de 1ª persona era DOS THREE.Plane puestos delante de la
   cámara y a la altura de la cadera: sirve mientras se mira más o menos al frente, pero el
   pedido es "si miras arriba o abajo tampoco tenés que verte la cabeza ni las piernas", y un
   plano fijo al ojo no distingue brazo de torso cuando la cámara gira: en algún ángulo el plano
   de la cadera te deja ver el pecho, o el de la cara te come el hombro.
   ACÁ SE CAMBIA POR UN DISCARD POR PESO DE HUESO: cada vértice ya sabe, por su propio
   skinning, qué porcentaje de su movimiento depende de huesos de BRAZO (mano, antebrazo,
   dedos, brazo — no clavícula/hombro). Ese porcentaje viaja a la varying vArm, y en 1ª persona
   el fragment shader descarta lo que no llega a ser brazo. No hay geometría estirada ni un
   plano que pueda "fallar" mirando para arriba: es una propiedad del vértice, no de la cámara.
   Y como el shadow map usa el MeshDepthMaterial (que no pasa por este onBeforeCompile), la
   sombra del jugador sigue completa aunque en cámara sólo se vean los brazos.
   Se concatena último (después de core_c y core_f): ya existen THREE, charRoot, bones, PL,
   freeCam, camera, GH (core_f) y fpClip/fpClipMaterials (core_c, funciones REASIGNABLES: acá
   se pisa fpClip entero, la versión de planos queda sin uso pero sin tocar core_c).
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
function fpArmPatch(mat,flags,NB){
  if(!mat||mat.userData._farm)return;      // no parchar el mismo material dos veces
  mat.userData._farm=1;
  mat.clippingPlanes=null;                 // ya no hace falta el recorte por plano de core_c
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
       calcula nada de un fragmento que se va a tirar). .32 y no .5: un vértice que reparte su
       peso entre antebrazo y torso (la zona del codo/hombro) tiene que seguir viéndose brazo,
       si no queda una costura pelada justo en el codo. */
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying float vArm;\nuniform float uArms;');
    shader.fragmentShader=shader.fragmentShader.replace('void main() {',
      'void main() {\n\tif(uArms>.5 && vArm<.32)discard;');
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
   de pisarla es una asignación común, no una nueva declaración. La versión de planos de
   core_c queda escrita pero sin uso; no se toca ese archivo.
   Ya no hay que "cambiar clippingPlanes" (eso SÍ recompilaba el shader, por eso antes se
   evitaba tocarlo si el estado no cambiaba): acá sólo se escribe un uniforme, que no cuesta
   recompilación ninguna, así que se puede escribir todos los frames sin culpa. */
fpClip=function(){
  const ms=fpArmMaterials();
  if(!ms)return;
  const on=(PL.fp&&!PL.rag&&!freeCam)?1:0;
  for(const m of ms){
    const u=m.userData.uArms||(m.userData.uArms={value:0});
    u.value=on;
  }
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
