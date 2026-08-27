
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
   mano y dedos son brazo sin dudarlo. La palabra "arm" sola también (el brazo de
   arriba), PERO no si es hombro/clavícula: esos mueven el torso entero y si se dejaran adentro
   el pecho se colaría cada vez que el hombro sube con la animación. */
const FARM_HAND=/hand|thumb|index|middle|ring|pinky|finger/i;
const FARM_FORE=/fore|lowerarm/i;
const FARM_ARM=/arm/i, FARM_NOARM=/shoulder|clavicle/i;
/* EL FLAG YA NO ES 0/1 SINO GRADUADO EN TRES ESCALONES: mano+dedos = 1, ANTEBRAZO = .8,
   brazo de arriba = .4, resto 0. Con un flag binario el umbral sólo podía elegir "brazo entero
   o nada"; con escalones el MISMO shader sirve para todo según el umbral (uniforme uArmT):
     umbral .45  -> antebrazo+mano (modo respaldo: el brazo de arriba .4 ya NO pasa, así que
                    ni el codo alto ni el hombro entran aunque el clon no se haya podido armar)
     umbral .85+ -> sólo mano+muñeca (lo que usa el VIEWMODEL)
   ANTES el antebrazo flaggeaba 1 junto con la mano y por eso el umbral NUNCA podía recortarlo:
   en la captura del celular (vertical) se veía el ANTEBRAZO ENTERO cruzando hasta el centro
   del cuadro con jirones de manga — medido con vmDiff: bbox hasta NDC y=-0.06 (el centro) y
   x=-0.25 (mitad izquierda). Con el antebrazo en su propio escalón (.8) el umbral del clon
   corta a la altura de la muñeca: se ven manos + un pedazo corto de antebrazo, como en
   cualquier FPS, y la zona de mezcla muñeca-antebrazo hace el degradé del corte. */
const fpArmFlag=name=>{
  const n=String(name||'').toLowerCase();
  if(FARM_HAND.test(n))return 1;
  if(FARM_FORE.test(n))return .8;
  return (FARM_ARM.test(n)&&!FARM_NOARM.test(n))?.4:0;
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
   cerca de la cámara mirando hacia abajo. Con los flags graduados de arriba, .45 cae ENTRE el
   brazo de arriba (.4) y el antebrazo (.8): el modo respaldo muestra antebrazo+mano y el codo
   alto/hombro mueren — antes el brazo entero (flag .6) pasaba y era EXACTAMENTE lo que el
   usuario fotografió cuando el viewmodel no estaba: el codo cruzando el cuadro. Si algún día
   se ve la MANO recortada (poco probable: la mano entera flaggea 1.0 en fpArmFlag, no queda en
   zona de mezcla) hay que bajar este número, no el .5 de uArms (ese es el interruptor
   entero/brazos, no la zona de mezcla del vértice). */
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
   VIEWMODEL DE 1ª PERSONA — UN PAR DE MANOS PROPIAS SOSTENIENDO EL ARMA
   ------------------------------------------------------------
   POR QUÉ SE CAMBIÓ DE RAÍZ (6 capturas del celular: pistol, shotgun, hands ×2, physgun, bat).
   La versión anterior clonaba EL PERSONAJE (charClone) y le borraba todo lo que no fuera mano
   con un discard por peso de hueso (uArmT=.88). Un discard NO recorta un sólido: recorta
   FRAGMENTOS. La malla del brazo es una cáscara de una sola cara, así que cortarla por la
   mitad la deja ABIERTA y se ve el interior — que es exactamente lo fotografiado: tiras de
   piel, pedazos de manga negra y triángulos abiertos flotando en la esquina. Y el borde del
   corte es una curva DISTINTA EN CADA FRAME (depende de los pesos de cada vértice y de la
   pose), así que ninguna "tapa" fija lo puede cerrar: por eso no se eligió la opción B.
   Peor todavía con los PUÑOS (arma sin modelo): ahí el anclaje pasaba por la muñeca del clon y,
   con el rig del personaje en centímetros, el conjunto salía escalado ~100 y aparecía EL CUERPO
   ENTERO delante de la cámara (fotos 788eeaf6 y c3e6ed3a).
   AHORA (opción A): un modelo PROPIO de mano de primera persona, hecho para esto:
   assets/hyper/vm-hands.glb — generado con Higgsfield (nano_banana_pro -> image_to_3d), un puño
   con guante táctico, malla CERRADA de 30k triángulos y textura de 512 (1,3 MB). Se usa tal cual
   para la derecha y ESPEJADO EN Z para la izquierda, y se lo apoya sobre el arma con las medidas
   del propio rig del arma (rigGrip de core_c: empuñadura en el origen, caño a -Z, lh0/lh1 = por
   dónde toma la mano izquierda). No hay NADA que recortar, ningún hueso del personaje participa,
   y el cuerpo real no se dibuja (uArms=2, ver fpClip arriba).
   Si el GLB no está (CDN viejo, red caída) hay un puño PROCEDURAL de cajas como respaldo, que
   también es geometría cerrada: en ningún caso se vuelve al clon recortado.

   JERARQUÍA (los nombres vmChar/vmHand/vmCap/VMG/VMF se MANTIENEN porque core_p —melee— los
   usa; ver la nota en vmPlace):
     camera → VMF (warp de FOV) → VMG (balanceo) → vmChar (conjunto) → vmHand (empuñadura)
              vmHand → wModel (el arma, transformada local identidad)
                     → HRG (mano derecha)  → malla + manga
                     → HLG (mano izquierda) → malla espejada + manga
   ============================================================ */

/* ---- 6.1 el modelo de manos ----
   MEDIDO con scratchpad/_glbfix.js sobre la malla generada (unidades de la malla):
     caja  x[-0.950,0.949] y[-0.633,0.632] z[-0.498,0.496]
     +X  = hacia el CODO (ahí está la manga y su agujero),  -X = los nudillos
     +Y  = el DORSO de la mano,  Z = el eje del AGARRE (los 4 dedos se apilan en Z)
     puño = x<=-0.38 (alto 1.078 unidades ≈ 10,5 cm de puño real → sc≈.098)
     agujero de la manga: x>=0.873, centro (y=0.20,z=-0.013), radio 0.32-0.456
   El agujero es el ÚNICO borde abierto de la malla (la imagen se cortaba ahí), así que se le
   pega un TUBO CERRADO de manga que además lleva el brazo fuera de la pantalla: con eso el
   conjunto no tiene ni un borde abierto en ningún ángulo. */
const VMH={
  file:'vm-hands.glb',
  sc:.098,                       /* metros por unidad de malla */
  /* gz=-.13 y no 0: MEDIDO con capturas (vm-A/C-v-pistol-fr). El eje Z de la malla es la columna
     en que se apilan los dedos, o sea a qué ALTURA de la empuñadura agarra el puño: con 0 el puño
     quedaba al pie de la empuñadura y la pistola le flotaba por encima; con -.13 (1,3 cm) el
     puño sube y la empuñadura le entra adentro. */
  grip:[-.575,-.135,-.13],       /* punto de la malla que se apoya en la empuñadura del arma */
  /* cuff 4.6 unidades = 45 cm de manga: MEDIDO, con 2.6 la punta del antebrazo IZQUIERDO
     terminaba dentro del cuadro y su tapa se veía como un bloque negro (capturas vm-F/G1). El
     antebrazo de una mano que envuelve un caño sale perpendicular al caño (igual que la muñeca al
     agarrar un martillo: eso es lo que hace vmBasis), así que la única forma de que salga del
     cuadro es que sea largo. Con 4.6 las dos mangas cruzan el borde de abajo. */
  hole:[.90,.20,-.013],holeR:.455,cuff:4.6,   /* manga: dónde, qué radio, cuánto se alarga */
  cuffC:0x15181c,                /* color de la manga agregada (negro como la del modelo) */
  emis:.05                       /* piso de emisivo: la mano cuelga de la cámara y de noche o
                                    mirando a contraluz quedaba una silueta negra. NO subirlo: con
                                    .14 el guante y la manga se ven grises y planos (probado). */
};
/* CÓMO SE TOMA CADA ARMA — todo en el espacio del rig del arma (rigGrip): +X a la derecha del
   arma, +Y arriba, -Z el caño. Para cada mano se dan dos direcciones y de ahí sale la
   orientación completa (vmBasis): hacia dónde se va el ANTEBRAZO (el +X de la malla) y el EJE
   DEL AGARRE (el Z de la malla, la línea en que se apilan los dedos).
   El antebrazo derecho se va atrás-abajo-afuera para SALIR POR LA ESQUINA de la pantalla; el
   izquierdo entra desde abajo-izquierda. Así ninguno de los dos cruza el centro del cuadro. */
const VMHP={
  rArm:[.30,-.62,.72],   rAx:[0,1,-.20],   /* derecha: columna de la empuñadura casi vertical */
  /* la izquierda va casi vertical: su antebrazo no puede tener componente hacia la cámara (sale
     perpendicular al caño por anatomía, ver vmBasis) así que se elige el rumbo que ANTES sale del
     cuadro — abajo con un poco de izquierda. Con [-.62,-.66,0] terminaba en mitad de pantalla. */
  lArm:[-.30,-.95,0],                      /* izquierda de dos manos: entra desde abajo */
  lPist:[-.045,-.055,.012],lArmP:[-.28,-.62,.73],  /* pistola: la izquierda calza bajo la derecha */
  /* PUÑOS (arma sin modelo): cada mano tiene su propio ancla en NDC, como una guardia */
  fR:[.42,-.56],fL:[-.18,-.60],fArmR:[.34,-.60,.72],fArmL:[-.34,-.60,.72],fAx:[0,1,-.12]
};
/* AJUSTES POR ARMA sobre el ancla (NDC/metros/radianes). El bate y el RPG son los dos casos que
   no entran con el ancla de las armas de fuego: el bate mide 86 cm y con el caño a -Z se iría
   de punta al horizonte (se lo levanta y se lo gira, como en 3ª persona), y el RPG va al
   hombro. Los demás salen bien con el ancla común. */
const VMWK={
  _:{},
  /* el bate a una mano con la punta ARRIBA (rx>0 gira el caño -Z hacia +Y): así se ve el palo
     entero listo para el mazazo en vez de un tubo horizontal cruzando la esquina (capturas
     mK: rx=.55 contra rx=-.50) */
  bat     :{ax:-.02,ay:-.04,z:.06,rx:.55,ry:-.16,rz:.30,oneH:1},
  hands   :{},
  rpg     :{ax:-.04,ay:.06,z:-.06,rx:.06,ry:-.02},
  sniper  :{ax:-.02,ay:.02,z:-.04},
  shotgun :{ax:-.01,ay:.01},
  akm     :{ax:-.01,ay:.01},
  crossbow:{ax:-.01,ay:.02,z:-.02},
  physgun :{ax:.01,ay:-.01},
  gravgun :{ax:.01,ay:-.01}
};

/* ---- constantes del conjunto, TODAS tocables en vivo con __H.vmSet(k,v) ----
   ax/ay = ancla del ARMA en NDC (-1..1, +derecha/+arriba). Anclar en NDC y no en metros es lo
     que hace que "la esquina" sea la esquina en cualquier pantalla: el semiancho del cuadro a z
     fijo vale (-z)·tan(fov/2)·aspect, así que unos metros fijos caen a un NDC distinto en el
     celular vertical (aspecto 2.22 con el escenario rotado) que en el chromium apaisado.
   x/y = ajuste fino en metros SOBRE el ancla. z/rx/ry/rz/sc = distancia y orientación.
   fov = FOV VERTICAL propio del viewmodel (grados): la técnica estándar de los FPS, acá sin
     segundo pase (ver el warp en vmPlaceH). 72 = apagado.
   bob y f = balanceo del paso, sway = retardo al girar, tilt = inclinación al ir de costado,
   kick* = patada del disparo, air = cuánto queda del bobbing en el aire.
   armT = umbral del discard del CUERPO REAL en el modo de respaldo (mode 1). Ya no lo usa el
     viewmodel: las manos son un modelo aparte y no se recorta nada. */
const VMC={
  on:1,
  ax:.62,ay:-.66,
  x:0,y:0,z:-.560,rx:.010,ry:-.030,rz:.020,sc:1,
  /* fov 98: el warp comprime el conjunto hacia el eje óptico. MEDIDO sobre las 84 mediciones de
     _vmall: con 92 el RPG llegaba al 5,54% del cuadro (el contrato de _vert pide <5,5%) y con 98
     el peor caso baja a 4,8% sin que se note más chico (comparadas las capturas mL). */
  fov:98,
  bobWX:.011,bobWY:.008,bobRX:.020,bobRY:.014,   /* W = walk, R = run */
  fW:1.15,fR:2.0,                                 /* Hz del paso */
  idleX:.0035,idleY:.0030,idleF1:.17,idleF2:.23,
  swayP:.18,swayR:.30,swayMax:.040,tau:.085,
  tilt:.030,tiltP:.014,
  kick:.045,kickR:.35,
  armT:.88,
  air:.35
};
/* VMF = grupo del warp de FOV. La escala vive en su propio nodo y no en VMG porque VMG ROTA con
   el balanceo: escalar y rotar en el mismo nodo aplicaría la escala en los ejes YA rotados
   (cizalla espuria); acá queda clavada a los ejes de la CÁMARA, que es lo que pide la
   equivalencia exacta con "renderizar con otro FOV". */
let VMG=null,VMF=null,vmChar=null,vmHand=null,vmMats=null,vmBoneMap=null;
let vmOn=false,vmDt=1/60,vmFail=0,vmCapW=null,vmCapClean=true;
let vmPhase=0,vmTime=0,vmYawF=0,vmPitF=0,vmSpF=0,vmAirF=0;
let HRG=null,HLG=null,vmHD=null,vmAsk=false,vmHW=1,vmHH=1;
const vmOff={x:0,y:0,z:0,rx:0,ry:0,rz:0};        /* último offset aplicado, para __H.vmInfo */
/* estos temporales los USA TAMBIÉN core_p (su vmPlace de melee): no se les cambia el nombre */
const _vmW=new THREE.Matrix4(),_vmH=new THREE.Matrix4(),_vmM=new THREE.Matrix4(),
      _vmI=new THREE.Matrix4(),_vmP=new THREE.Vector3(),_vmQ=new THREE.Quaternion(),
      _vmS=new THREE.Vector3(),_vmV=new THREE.Vector3(),_vmE=new THREE.Euler();
const vmCap={p:new THREE.Vector3(),q:new THREE.Quaternion(),s:new THREE.Vector3(1,1,1),
             hq:new THREE.Quaternion()};
const vmAnc=new THREE.Vector3();   /* ancla en el espacio de VMG: pivote del balanceo */
const _vhx=new THREE.Vector3(),_vhy=new THREE.Vector3(),_vhz=new THREE.Vector3(),
      _vhp=new THREE.Vector3(),_vhw=new THREE.Vector3(),_vhm=new THREE.Matrix4(),
      _vhq=new THREE.Quaternion(),_vhq2=new THREE.Quaternion(),_vhe=new THREE.Euler();

/* ¿corresponde viewmodel ahora? En vehículo NO: ahí la cámara la pone EXT.cam (core_e) y las
   manos van al volante. Ragdoll y cámara libre tampoco (se quiere ver el cuerpo). */
function vmWant(){
  if(!VMC.on||!PL.fp||PL.rag||freeCam)return false;
  if(typeof VHS!=='undefined'&&VHS)return false;
  return true;
}

/* ---- 6.2 geometría: espejo, manga y puño de respaldo ---- */
/* ESPEJO REAL, no scale.z=-1: una escala negativa invierte el determinante y con eso el sentido
   de las caras, así que la mano izquierda se dibujaría del REVÉS (se vería el interior, que es
   justo el aspecto del bug que se está arreglando). Acá se niega la Z de posiciones y normales
   y se DA VUELTA EL ORDEN de cada triángulo, que deja la malla igual de cerrada y bien orientada. */
function vmMirrorGeo(g){
  const o=g.clone();
  const p=o.attributes.position,n=o.attributes.normal;
  for(let i=0;i<p.count;i++)p.setZ(i,-p.getZ(i));
  if(n)for(let i=0;i<n.count;i++)n.setZ(i,-n.getZ(i));
  p.needsUpdate=true;if(n)n.needsUpdate=true;
  const ix=o.index;
  if(ix){ for(let i=0;i+2<ix.count;i+=3){const a=ix.getX(i+1),b=ix.getX(i+2);
            ix.setX(i+1,b);ix.setX(i+2,a);} ix.needsUpdate=true; }
  else { /* sin índice: se permutan los vértices 1 y 2 de cada triángulo, atributo por atributo */
    for(const k in o.attributes){ const a=o.attributes[k],n2=a.itemSize;
      for(let i=0;i+2<a.count;i+=3)for(let c=0;c<n2;c++){
        const v1=a.array[(i+1)*n2+c],v2=a.array[(i+2)*n2+c];
        a.array[(i+1)*n2+c]=v2;a.array[(i+2)*n2+c]=v1;}
      a.needsUpdate=true; }
  }
  o.computeBoundingBox();o.computeBoundingSphere();
  return o;
}
/* TUBO DE MANGA: tapa el único borde abierto del modelo (el agujero por donde se cortó el
   antebrazo) y de paso alarga el brazo para que su punta quede FUERA de la pantalla. Cilindro
   con las dos bases cerradas (openEnded=false): sea de donde se lo mire no hay interior. */
function vmCuff(d,side){
  const r0=d.holeR*1.03,r1=d.holeR*.82,L=d.cuff;
  const g=new THREE.CylinderGeometry(r1,r0,L,12,1,false);
  g.rotateZ(-Math.PI/2);                       /* el eje Y del cilindro pasa a ser +X (al codo) */
  g.translate(d.hole[0]+L*.5,d.hole[1],d.hole[2]*side);
  return g;
}
/* junta geometrías en UNA con color por vértice: un solo draw call, y cada pieza sigue siendo
   un volumen cerrado (para el puño de respaldo) */
function vmMerge(list){
  const P=[],N=[],C=[];
  for(const it of list){
    const g0=it[0],c=new THREE.Color(it[1]);
    const g=g0.index?g0.toNonIndexed():g0;
    const p=g.attributes.position,n=g.attributes.normal;
    for(let i=0;i<p.count;i++){
      P.push(p.getX(i),p.getY(i),p.getZ(i));
      N.push(n?n.getX(i):0,n?n.getY(i):1,n?n.getZ(i):0);
      C.push(c.r,c.g,c.b);
    }
    if(g!==g0)g.dispose();
    g0.dispose();
  }
  const o=new THREE.BufferGeometry();
  o.setAttribute('position',new THREE.Float32BufferAttribute(P,3));
  o.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
  o.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
  o.computeBoundingBox();o.computeBoundingSphere();
  return o;
}
function vmPBox(out,sx,sy,sz,px,py,pz,rz,col){
  const g=new THREE.BoxGeometry(sx,sy,sz,1,1,1);
  _vhe.set(0,0,rz||0,'YXZ');
  _vhm.makeRotationFromEuler(_vhe);_vhm.setPosition(px,py,pz);
  g.applyMatrix4(_vhm);
  out.push([g,col]);
}
/* PUÑO PROCEDURAL (respaldo). Mismo marco que el GLB: origen = empuñadura, +X al codo,
   -X nudillos, +Y dorso, Z eje del agarre. Va en METROS (sc=1). Feo pero cerrado y prolijo:
   nunca se vuelve al clon recortado. */
function vmProcGeo(){
  /* colores CLAROS a propósito: con el guante casi negro (0x2c3238) y la manga negra el respaldo
     se veía como un bloque oscuro sin forma en la esquina (captura mproc). */
  const G=0x424a53,S=0xc79372,K=0x23272d;      /* guante, piel, manga */
  const L=[];
  vmPBox(L,.075,.085,.092,.020,.006,0,0,G);          /* palma */
  vmPBox(L,.030,.058,.088,-.030,.020,0,.12,G);       /* nudillos */
  vmPBox(L,.046,.032,.084,-.026,-.032,0,-.10,S);     /* dedos plegados */
  vmPBox(L,.030,.024,.026,-.020,.014,-.050,0,G);     /* pulgar */
  vmPBox(L,.052,.070,.076,.062,.004,0,0,S);          /* muñeca */
  vmPBox(L,.030,.076,.082,.084,.002,0,0,K);          /* puño de la manga */
  return vmMerge(L);
}
/* descriptor de la mano en uso: del GLB si está, si no el procedural */
function vmDesc(){
  const g=MODELS.vmhands;
  if(g){
    let mesh=null;
    (g.scene||g.scenes[0]).traverse(o=>{ if(!mesh&&o.isMesh&&o.geometry)mesh=o; });
    if(mesh&&mesh.geometry){
      /* la malla viene en el nodo raíz sin transformada (node.matrix = identidad, medido con
         _glbfix), así que la geometría se usa directo. Igual se aplica la matriz del nodo por si
         un GLB futuro trae una: si no se hace, la mano aparecería corrida. */
      let geo=mesh.geometry;
      mesh.updateWorldMatrix(true,false);
      const e=mesh.matrixWorld.elements;
      const ident=(Math.abs(e[0]-1)+Math.abs(e[5]-1)+Math.abs(e[10]-1)
                  +Math.abs(e[12])+Math.abs(e[13])+Math.abs(e[14]))<1e-4;
      if(!ident){geo=geo.clone();geo.applyMatrix4(mesh.matrixWorld);}
      const mat=(Array.isArray(mesh.material)?mesh.material[0]:mesh.material).clone();
      /* DoubleSide: el conjunto vive a medio metro del ojo y basta que un triángulo quede de
         canto para que se vea el hueco. Con las dos caras no hay forma de ver "el interior".
         Emisivo bajo: que la mano no quede negra a contraluz. */
      mat.side=THREE.DoubleSide;
      if(mat.emissive)mat.emissive.setScalar(VMH.emis);
      if(mat.metalness!==undefined)mat.metalness=Math.min(mat.metalness,.06);
      if(mat.roughness!==undefined)mat.roughness=Math.max(mat.roughness||.6,.62);
      mat.fog=false;                       /* medio metro de niebla no hace nada, y evita que en
                                              el mapa con neblina la mano se lave */
      mat.needsUpdate=true;
      return {kind:'glb',sc:VMH.sc,grip:VMH.grip,hole:VMH.hole,holeR:VMH.holeR,cuff:VMH.cuff,
        geoR:geo,geoL:vmMirrorGeo(geo),mat:mat,
        cuffMat:new THREE.MeshStandardMaterial({color:VMH.cuffC,roughness:.94,metalness:0,
          side:THREE.DoubleSide,fog:false,emissive:new THREE.Color(VMH.emis*.5,VMH.emis*.5,VMH.emis*.5)})};
    }
  }
  /* respaldo procedural (y pedido del GLB para el próximo intento) */
  if(!vmAsk){vmAsk=true;nsafe(()=>loadGLB('vmhands',VMH.file),'vmglb');}
  const geo=vmProcGeo();
  return {kind:'proc',sc:1.15,grip:[0,0,0],hole:[.098,0,0],holeR:.040,cuff:.30,
    geoR:geo,geoL:vmMirrorGeo(geo),
    mat:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,metalness:.02,
      side:THREE.DoubleSide,fog:false}),
    cuffMat:new THREE.MeshStandardMaterial({color:VMH.cuffC,roughness:.94,metalness:0,
      side:THREE.DoubleSide,fog:false})};
}
/* (re)viste las dos manos con el mejor descriptor disponible. Se vuelve a llamar cuando llega el
   GLB: así el jugador nunca ve el modo de respaldo del CUERPO (mode 1) por esperar una descarga. */
function vmSkin(){
  if(!HRG||!HLG)return false;
  const d=nsafe(()=>vmDesc(),'vmdesc');
  if(!d)return false;
  const old=vmHD;
  for(const G of [HRG,HLG]){ while(G.children.length)G.remove(G.children[0]); }
  const mk=(G,geo,side)=>{
    const m=new THREE.Mesh(geo,d.mat);
    m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;
    G.add(m);
    const c=new THREE.Mesh(vmCuff(d,side),d.cuffMat);
    c.castShadow=false;c.receiveShadow=false;c.frustumCulled=false;
    G.add(c);
  };
  mk(HRG,d.geoR,1);mk(HLG,d.geoL,-1);
  vmHD=d;vmMats=[d.mat,d.cuffMat];
  /* al cambiar de piel (procedural -> GLB) se liberan las mallas viejas: son 2 geometrías y 2
     materiales, pero el respaldo se arma en el celular y no hay por qué dejarlo en la GPU */
  if(old&&old!==d){ for(const g of [old.geoR,old.geoL])if(g&&g.dispose)g.dispose();
    for(const m of [old.mat,old.cuffMat])if(m&&m.dispose)m.dispose(); }
  return true;
}
/* ---- 6.3 armado ---- */
function vmInit(){
  if(vmChar)return true;
  if(vmFail>8)return false;
  VMG=new THREE.Group();VMG.name='vm';VMG.visible=false;
  VMF=new THREE.Group();VMF.name='vmfov';
  vmChar=new THREE.Group();vmChar.name='vmhands';
  vmHand=new THREE.Group();vmHand.name='vmgrip';   /* transformada local IDENTIDAD: ver vmPlace */
  HRG=new THREE.Group();HRG.name='vmR';
  HLG=new THREE.Group();HLG.name='vmL';
  vmHand.add(HRG);vmHand.add(HLG);
  vmChar.add(vmHand);VMG.add(vmChar);VMF.add(VMG);camera.add(VMF);
  vmBoneMap={};                    /* vacío a propósito: core_p lo consulta por nombre de hueso y
                                      así sus rutinas de esqueleto (melVmArm/melVmGrip) se
                                      autoexcluyen solas — el viewmodel ya no tiene esqueleto */
  if(!vmSkin()){vmFail++;camera.remove(VMF);VMG=VMF=vmChar=vmHand=HRG=HLG=null;return false;}
  return true;
}

/* ---- 6.4 orientación de una mano ----
   De dos direcciones sale la rotación entera: el +X de la malla (hacia el codo) y su Z (el eje
   del agarre, la línea en que se apilan los cuatro dedos). Los dos tienen que ser
   PERPENDICULARES —lo son en la anatomía: el mango de un martillo sale a 90° del antebrazo, y la
   malla está hecha así— y sólo uno de los dos se puede respetar exacto:
     keep='ax'  (con arma) el eje del agarre manda, porque es el que decide si la mano envuelve
                bien el caño; el antebrazo se ortogonaliza contra él.
     keep='arm' (pistola con la izquierda de apoyo, y los puños) manda el ANTEBRAZO, porque ahí no
                hay tubo que envolver y lo que importa es que el brazo salga del cuadro. MEDIDO:
                con keep='ax' en la pistola, la proyección le comía la componente vertical al
                antebrazo izquierdo y quedaba una barra negra HORIZONTAL cruzando la pantalla
                (captura I-b-toolgun-fr).
   Y = Z×X para que la base sea derecha (determinante +1): con determinante negativo la malla se
   dibujaría dada vuelta (se vería el interior, el bug que se está arreglando). */
function vmBasis(arm,ax,out,keep){
  _vhz.set(ax[0],ax[1],ax[2]);
  if(_vhz.lengthSq()<1e-9)_vhz.set(0,1,0);
  _vhz.normalize();
  _vhx.set(arm[0],arm[1],arm[2]);
  if(_vhx.lengthSq()<1e-9)_vhx.set(1,0,0);
  if(keep==='arm'){
    _vhx.normalize();
    _vhz.addScaledVector(_vhx,-_vhz.dot(_vhx));     /* el eje del agarre cede */
    if(_vhz.lengthSq()<1e-9)_vhz.set(0,1,0).addScaledVector(_vhx,-_vhx.y);
    _vhz.normalize();
  }else{
    _vhx.addScaledVector(_vhz,-_vhx.dot(_vhz));     /* el antebrazo cede */
    if(_vhx.lengthSq()<1e-9)_vhx.set(1,0,0).addScaledVector(_vhz,-_vhz.x);
    _vhx.normalize();
  }
  _vhy.crossVectors(_vhz,_vhx);
  _vhm.makeBasis(_vhx,_vhy,_vhz);
  out.setFromRotationMatrix(_vhm);
  return out;
}
/* pone una mano con su punto de agarre en p (espacio de vmHand) y la orientación de vmBasis:
   la malla tiene el agarre en d.grip, así que la posición del nodo es p - R·(grip·escala) */
function vmHandAt(G,p,arm,ax,keep){
  const d=vmHD;if(!G||!d)return;
  vmBasis(arm,ax,_vhq,keep);
  G.quaternion.copy(_vhq);
  G.scale.setScalar(d.sc);
  _vhp.set(d.grip[0]*d.sc,d.grip[1]*d.sc,d.grip[2]*d.sc).applyQuaternion(_vhq);
  G.position.set(p.x-_vhp.x,p.y-_vhp.y,p.z-_vhp.z);
  G.updateMatrix();
}
/* ---- 6.5 dónde va cada mano para el arma de ahora ----
   Se corre TODOS LOS FRAMES junto con el ancla: el ancla depende del aspecto (girar el teléfono)
   y del fov (zoom del sniper), y el puño izquierdo de los PUÑOS se ubica por NDC, así que
   depende de lo mismo. Son dos bases ortonormales y dos posiciones: nada por vértice. */
function vmLay(){
  if(!vmHand||!vmHD)return false;
  const w=weap();
  let g=null;
  if(wModel&&wModel.parent===vmHand){
    g=nsafe(()=>rigGrip(wModel,w),'vmrig');
    if(g&&g.bad)g=null;
  }
  const K0=VMWK[w?w.id:'-']||VMWK._;
  if(g){
    /* con arma: la derecha en la empuñadura (el origen del rig) */
    _vhw.set(0,0,0);
    vmHandAt(HRG,_vhw,VMHP.rArm,VMHP.rAx);
    /* oneH: armas que en 1ª persona quedan mejor con UNA mano. El bate es el caso: con las dos
       manos en el mango (que es lo que hace la 3ª persona) el antebrazo izquierdo sale
       perpendicular al palo y cruza la pantalla como una barra negra. Un bate a una mano es lo
       normal en cualquier FPS. */
    const two=!!(g.S&&g.S.two)&&!K0.oneH;
    if(K0.oneH){HLG.visible=false;HRG.visible=true;return true;}
    if(two){
      /* dos manos: la izquierda en el punto del guardamano que ya calcula rigGrip (lh1), con el
         eje del agarre a lo largo del CAÑÓN (envuelve el tubo, no la columna de la empuñadura) */
      _vhw.copy(g.lh1);
      _vhz.copy(g.lh1).sub(g.lh0);
      if(_vhz.lengthSq()<1e-8)_vhz.set(0,0,-1);
      _vhz.normalize();
      vmHandAt(HLG,_vhw,VMHP.lArm,[_vhz.x,_vhz.y,_vhz.z]);
    }else{
      /* pistola: la izquierda no tiene guardamano, calza abajo y a la izquierda de la derecha
         (la misma columna de agarre), como en cualquier agarre a dos manos de pistola */
      _vhw.set(VMHP.lPist[0],VMHP.lPist[1],VMHP.lPist[2]);
      vmHandAt(HLG,_vhw,VMHP.lArmP,VMHP.rAx,'arm');
    }
    HLG.visible=true;HRG.visible=true;
    return true;
  }
  /* PUÑOS (arma sin modelo): no hay nada que sostener, así que cada puño tiene SU PROPIO ancla en
     NDC (una guardia). vmChar está anclado en (ax0,ay0), así que cada mano se corre por la
     DIFERENCIA de NDC pasada a metros (vmHW/vmHH), llevada al espacio LOCAL de vmChar: hay que
     deshacer su rotación (VMC.rx/ry/rz) y su escala, porque las manos son sus hijas. */
  const ax0=VMC.ax+(K0.ax||0),ay0=VMC.ay+(K0.ay||0);
  const S=(vmChar&&vmChar.scale.x)||1;
  /* _vhq2 y NO _vhq: vmHandAt escribe en _vhq (ahí le deja la rotación a la mano), así que usar
     el mismo temporal para la rotación inversa del conjunto hacía que el SEGUNDO puño se
     colocara con la rotación del primero — el puño izquierdo aparecía como un tubo negro suelto
     en el borde de arriba (captura I-b-hands-fr). */
  _vhq2.copy(vmChar?vmChar.quaternion:_vmQ).invert();
  const put=(G,a,arm)=>{
    _vhw.set((a[0]-ax0)*vmHW,(a[1]-ay0)*vmHH,0).applyQuaternion(_vhq2).multiplyScalar(1/S);
    vmHandAt(G,_vhw,arm,VMHP.fAx,'arm');
  };
  put(HRG,VMHP.fR,VMHP.fArmR);
  put(HLG,VMHP.fL,VMHP.fArmL);
  HLG.visible=true;HRG.visible=true;
  return true;
}
/* ---- 6.6 ANCLAJE: el arma queda en un punto FIJO DE LA PANTALLA ----
   1) WARP DE FOV (VMF.scale): la escala (k,k,1) en los ejes de la cámara con
        k = tan(fovCam/2)/tan(fovVM/2)
      reproduce EXACTAMENTE la proyección que tendría el conjunto renderizado con fovVM:
        NDC = k·x/(-z·tan(fovCam/2)·a) = x/(-z·tan(fovVM/2)·a)
      Misma imagen que el segundo pase clásico de los FPS, sin segundo pase (no se toca el z del
      fragmento, así que la oclusión contra el mundo sigue sana). fovVM > fovCam ⇒ k<1 ⇒ el
      conjunto se comprime hacia el eje óptico: manos más chicas y sin el estirón de esquina del
      FOV horizontal de 113° del teléfono vertical.
   2) ANCLA EN NDC: para que el arma caiga en (ax,ay) de NDC a distancia |z|,
        x = ax·(-z)·tan(fovVM/2)·aspect     y = ay·(-z)·tan(fovVM/2)
      (con la trigonometría del FOV DEL VIEWMODEL, porque el warp multiplica después por k).
   OJO: esta función se llama vmPlaceH y NO vmPlace. core_p (melee) reemplaza vmPlace por una
   versión escrita para el viewmodel VIEJO (el clon del personaje: compone MREST, lee vmCap.p/q/s
   y decompone en vmChar). Con las manos dedicadas eso no aplica —el arma ya no cuelga de un
   hueso— y además ancla en METROS, así que con el ancla en NDC el bate le quedaba en el CENTRO
   del cuadro. Como core_p se concatena DESPUÉS no se lo puede desarmar desde acá; lo que sí se
   puede es no pasar por ahí: vmStep llama a vmPlaceH directo y el bate se acomoda con VMWK.bat. */
function vmPlaceH(){
  if(!vmChar)return false;
  const w=weap(),K=VMWK[w?w.id:'-']||VMWK._;
  const tanC=Math.tan(camera.fov*Math.PI/360),
        tanV=Math.tan(Math.max(30,VMC.fov)*Math.PI/360);
  if(VMF){const k=tanC/tanV;VMF.scale.set(k,k,1);}
  const z=VMC.z+(K.z||0);
  vmHW=(-z)*tanV*Math.max(.4,camera.aspect);vmHH=(-z)*tanV;
  _vmP.set((VMC.ax+(K.ax||0))*vmHW+VMC.x+(K.x||0),
           (VMC.ay+(K.ay||0))*vmHH+VMC.y+(K.y||0),z);
  _vmE.set(VMC.rx+(K.rx||0),VMC.ry+(K.ry||0),VMC.rz+(K.rz||0),'YXZ');
  _vmQ.setFromEuler(_vmE);
  vmChar.position.copy(_vmP);
  vmChar.quaternion.copy(_vmQ);
  vmChar.scale.setScalar(VMC.sc*(K.sc||1));
  vmChar.updateMatrix();
  vmAnc.copy(_vmP);                    /* pivote del balanceo (ver vmMotion) */
  vmLay();
  return true;
}
/* vmPlace queda DEFINIDA con este nombre porque core_p la envuelve al cargar (typeof vmPlace);
   no la llama nadie del motor. Apunta a lo mismo para que __H y cualquier llamador externo
   obtengan el anclaje nuevo. */
function vmPlace(){ return vmPlaceH(); }

/* ---- 6.7 el arma pasa al viewmodel ----
   rigGrip() dejó el rig con la EMPUÑADURA EN EL ORIGEN y el caño a -Z, y rigWeapon() lo había
   escalado a w.len metros: colgado de vmHand con transformada IDENTIDAD el arma queda en su
   tamaño real, sin el 1/escala-del-rig que holdWeapon() le pone cuando cuelga del hueso (ese
   factor es lo que hacía falta cuando el padre era un hueso en centímetros).
   vmCap.p/q/s se dejan en identidad porque core_p los lee para su vmPlace. */
function vmGrab(){
  if(!vmHand)return false;
  const w=weap();
  vmCapW=w?w.id:'-';
  if(!wModel)return true;
  if(wModel.parent!==vmHand)vmHand.add(wModel);
  wModel.position.set(0,0,0);wModel.quaternion.identity();wModel.scale.setScalar(1);
  nsafe(()=>rigGrip(wModel,w),'vmrig');
  wModel.updateMatrix();
  vmCap.p.set(0,0,0);vmCap.q.identity();vmCap.s.set(1,1,1);
  return true;
}
/* vmCapture/vmAttach/vmPose se mantienen con estos nombres porque core_p envuelve vmCapture (la
   bloquea en mitad de un golpe) y el resto del motor las llamaba: ahora "capturar" es
   simplemente agarrar el arma y recalcular el apoyo de las manos. */
function vmCapture(){ const r=vmGrab(); vmPlaceH(); vmCapClean=true; return r; }
function vmAttach(){ return vmGrab(); }
function vmPose(){}

/* ---- 6.8 BALANCEO PROCEDURAL ----
   Todo se calcula como OFFSET ABSOLUTO del estado de este frame y se ESCRIBE (no se suma) en
   VMG: es la misma lección que dejó la deriva de 57° de la respiración (core_c). Lo único que se
   acumula es la fase del paso, que es lo que tiene que acumular, y va por dt.
   Frecuencias: 1,0-1,3 Hz caminando y 1,8-2,2 Hz corriendo; la vertical va al DOBLE de la
   lateral (dos pasos por ciclo de cadera = el 8 acostado clásico). */
function vmMotion(dt){
  if(!VMG)return;
  dt=dt>0?Math.min(dt,.1):0;
  vmTime+=dt;
  const vx=plBody.velocity.x,vz=plBody.velocity.z,sp=Math.hypot(vx,vz);
  const kf=dt>0?1-Math.exp(-dt*8):1;
  vmSpF+=(sp-vmSpF)*kf;
  vmAirF+=((grounded||inWater?1:0)-vmAirF)*(dt>0?1-Math.exp(-dt*6):1);
  const t=clamp((vmSpF-PL.spd*.55)/Math.max(.5,PL.run-PL.spd*.55),0,1);
  const mv=clamp((vmSpF-.35)/1.2,0,1)*(vmAirF+(1-vmAirF)*VMC.air);
  const f=VMC.fW+(VMC.fR-VMC.fW)*t;
  const AX=(VMC.bobWX+(VMC.bobRX-VMC.bobWX)*t)*mv,
        AY=(VMC.bobWY+(VMC.bobRY-VMC.bobWY)*t)*mv;
  vmPhase+=dt*Math.PI*2*f;
  if(vmPhase>Math.PI*2)vmPhase-=Math.PI*2;
  const bx=Math.sin(vmPhase)*AX, by=Math.sin(vmPhase*2)*AY;
  const iw=1-mv;
  const ix=Math.sin(vmTime*Math.PI*2*VMC.idleF1)*VMC.idleX*iw,
        iy=Math.sin(vmTime*Math.PI*2*VMC.idleF2+1.1)*VMC.idleY*iw;
  const ks=dt>0?1-Math.exp(-dt/Math.max(.01,VMC.tau)):1;
  let dy=PL.yaw-vmYawF;
  while(dy>Math.PI)dy-=Math.PI*2; while(dy<-Math.PI)dy+=Math.PI*2;
  vmYawF+=dy*ks;
  const dp=PL.pitch-vmPitF;vmPitF+=dp*ks;
  const sx=clamp(dy*VMC.swayP,-VMC.swayMax,VMC.swayMax),
        sy=clamp(-dp*VMC.swayP,-VMC.swayMax,VMC.swayMax);
  const ry=clamp(-dy*VMC.swayR,-.10,.10), rx=clamp(-dp*VMC.swayR,-.10,.10);
  const ys=Math.sin(PL.yaw),yc=Math.cos(PL.yaw);
  const lat=clamp((vx*yc-vz*ys)/Math.max(1,PL.spd),-1,1);
  const rk=(typeof recoil==='number')?recoil:0;
  vmOff.x=bx+ix+sx-lat*VMC.tiltP;
  vmOff.y=by+iy+sy;
  vmOff.z=rk*VMC.kick;
  vmOff.rx=rx+rk*VMC.kickR+by*.6;
  vmOff.ry=ry+bx*.8;
  vmOff.rz=-lat*VMC.tilt+bx*1.2;
  _vmE.set(vmOff.rx,vmOff.ry,vmOff.rz,'YXZ');
  VMG.quaternion.setFromEuler(_vmE);
  /* las rotaciones del balanceo PIVOTEAN EN EL ANCLA del arma, no en el ojo: q → R·(q−a)+a+off.
     Girando alrededor del ojo, el arma —que con el ancla NDC queda a ~1 m del eje óptico— se
     traslada rz·x+rx·z ≈ 0.03-0.05 de NDC por ciclo de paso y el pico a pico corriendo se iba a
     0.147 (el contrato de _final exige <0.12). Con el pivote en el arma la rotación se ve igual
     (el conjunto cabecea/rola) y el NDC sólo lo mueve el offset de traslación. */
  _vmV.copy(vmAnc).applyQuaternion(VMG.quaternion);
  VMG.position.set(vmOff.x+vmAnc.x-_vmV.x,vmOff.y+vmAnc.y-_vmV.y,vmOff.z+vmAnc.z-_vmV.z);
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
  vmGrab();
  vmPlaceH();
  vmMotion(0);
}
function vmLeave(){
  if(VMG)VMG.visible=false;
  /* el arma vuelve a la mano de verdad: en 3ª persona tiene que acompañar la animación otra vez
     (y los efectos leen su matrixWorld). attachWeapon() (core_b) hace exactamente eso. */
  if(wModel&&vmHand&&wModel.parent===vmHand)nsafe(()=>attachWeapon(),'vmback');
}
function vmStep(dt){
  /* el GLB de manos se PIDE al entrar en partida y no en boot(): loadGLB incrementa glbPend y la
     pantalla de carga espera a todos los GLB (1,3 MB más de espera para algo que sólo se ve en 1ª
     persona). Pidiéndolo acá, en 3ª persona ya está descargado cuando el jugador aprieta el ojo,
     y si no llegó todavía se ven los puños procedurales — nunca el cuerpo recortado. */
  if(!vmAsk&&!MODELS.vmhands&&typeof APP!=='undefined'&&APP!=='load'&&APP!=='title'){
    vmAsk=true;nsafe(()=>loadGLB('vmhands',VMH.file),'vmglb');
  }
  const want=vmWant();
  if(want&&!vmChar)vmInit();
  /* si el viewmodel arrancó con el puño procedural y mientras tanto llegó el GLB, se cambia la
     piel en caliente: el jugador ve las manos buenas sin recargar y, sobre todo, NUNCA queda en
     el modo de respaldo del cuerpo real por esperar una descarga. */
  if(vmChar&&vmHD&&vmHD.kind!=='glb'&&MODELS.vmhands)nsafe(()=>vmSkin(),'vmup');
  const on=want&&!!vmChar;
  if(on!==vmOn){vmOn=on;if(on)vmEnter();else vmLeave();return;}
  if(!vmOn)return;
  /* re-agarrar si cambió el arma o si alguien la devolvió a la mano real (equip/respawn llaman a
     attachWeapon) */
  const w=weap(),id=w?w.id:'-';
  if(id!==vmCapW||(wModel&&wModel.parent!==vmHand))vmGrab();
  vmPlaceH();
  vmMotion(dt);
}
/* dt: fpClip() no lo recibe, así que se lo guarda acá. Se envuelve camStep en vez de tocarla
   (es de core_b) y se llama SIEMPRE a la original: si otro archivo la envuelve también, las dos
   capas siguen funcionando. */
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

/* ---- MEDIDOR: cuántos píxeles aporta el viewmodel, por dónde y SI ESTÁ ROTO ----
   Se dibuja la MISMA escena dos veces en un render target (sin y con VMG) y se restan. La
   diferencia es exactamente lo que el viewmodel pone en pantalla: si en la franja del borde
   izquierdo/superior/derecho hay 0 píxeles distintos, por ahí no entra NADA (ni codo, ni hombro,
   ni torso). Se usa un RT y no el canvas porque leer el framebuffer por defecto depende de que
   no haya habido swap; el RT es determinista.
   ADEMÁS SE MIDE LA CONTINUIDAD, que es lo que distingue "manos" de "amasijo": se etiquetan las
   componentes conexas (4 vecinos) de la máscara y se reportan
     blobs  = cuántas componentes de >=8 px hay (una mano con su arma es 1; los dos puños, 2)
     debris = píxeles en componentes chicas (<2% del total) = JIRONES SUELTOS
     rough  = perímetro / (4·√n): 1 = bloque compacto, mucho más = borde desgarrado/deshilachado
   La malla recortada del bug daba decenas de componentes y un perímetro enorme; una malla
   cerrada da pocas componentes y un borde corto. */
let vmRT=null;
function vmIslands(mask,W,H){
  const lab=new Int32Array(W*H).fill(-1);
  const stack=new Int32Array(W*H);
  let nb=0,best=0,sizes=[],n=0,per=0;
  for(let i=0;i<W*H;i++)if(mask[i])n++;
  for(let s=0;s<W*H;s++){
    if(!mask[s]||lab[s]>=0)continue;
    let sp=0,cnt=0;stack[sp++]=s;lab[s]=nb;
    while(sp>0){
      const p=stack[--sp];cnt++;
      const x=p%W,y=(p-x)/W;
      if(x>0&&mask[p-1]&&lab[p-1]<0){lab[p-1]=nb;stack[sp++]=p-1;}
      if(x<W-1&&mask[p+1]&&lab[p+1]<0){lab[p+1]=nb;stack[sp++]=p+1;}
      if(y>0&&mask[p-W]&&lab[p-W]<0){lab[p-W]=nb;stack[sp++]=p-W;}
      if(y<H-1&&mask[p+W]&&lab[p+W]<0){lab[p+W]=nb;stack[sp++]=p+W;}
    }
    sizes.push(cnt);if(cnt>best)best=cnt;nb++;
  }
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x;if(!mask[i])continue;
    if(x===0||y===0||x===W-1||y===H-1||!mask[i-1]||!mask[i+1]||!mask[i-W]||!mask[i+W])per++;
  }
  const small=sizes.filter(v=>v<Math.max(8,n*.02)).reduce((a,b)=>a+b,0);
  return {blobs:sizes.filter(v=>v>=8).length,parts:sizes.length,
    big:best,debris:small,debrisFrac:n?+(small/n).toFixed(4):0,
    per:per,rough:n?+(per/(4*Math.sqrt(n))).toFixed(3):0};
}
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
  const mask=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=(y*W+x)*4;
    if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])<12)continue;
    n++;mask[y*W+x]=1;
    if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
    if(x<bx)ed.left++; if(x>=W-bx)ed.right++;
    if(y>=H-by)ed.top++; if(y<by)ed.bottom++;      // en el RT la fila 0 es la de ABAJO
  }
  const nx=x=>+((x+.5)/W*2-1).toFixed(3),ny=y=>+((y+.5)/H*2-1).toFixed(3);
  const isl=n?vmIslands(mask,W,H):{blobs:0,parts:0,big:0,debris:0,debrisFrac:0,per:0,rough:0};
  return {n,frac:+(n/(W*H)).toFixed(4),w:W,h:H,edge:ed,
    bbox:n?[nx(x0),ny(y0),nx(x1),ny(y1)]:null,
    blobs:isl.blobs,parts:isl.parts,debris:isl.debris,debrisFrac:isl.debrisFrac,rough:isl.rough};
}

if(DEV&&window.__H)Object.assign(window.__H,{
  /* estado del recorte por shader del CUERPO REAL: on = valor del uniforme (0 entero, 1 sólo
     brazos = respaldo, 2 nada), mats = materiales locales parchados, flags = huesos marcados
     como brazo, sharedWithGhost = true si algún fantasma comparte material con el charRoot local
     (el bug que evita el fix de core_f/charClone) */
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
  fpArmsSet:v=>{
    const ms=fpArmMaterials();if(!ms)return false;
    const val=v?1:0;
    for(const m of ms){ const u=m.userData.uArms||(m.userData.uArms={value:0}); u.value=val; }
    return true;
  },
  /* ---- instrumentación del VIEWMODEL ----
     vmInfo(): estado + posición del arma EN PANTALLA (NDC) + si el cuerpo real se dibuja + dónde
       caen las dos manos y las puntas de las mangas (que son lo único que podría asomar).
     vmSet(k,v): cualquier constante de VMC en vivo. vmHandSet(k,v): las del modelo de manos
       (escala, punto de agarre, largo de la manga) — recalcula y revisten si hace falta.
     vmDiff(): la medición dura (ver arriba): píxeles, caja, bordes, componentes conexas. */
  vmInfo:()=>{
    const o={on:vmOn,mode:vmOn?'vm':(PL.fp?'clip':'off'),ready:!!vmChar,fail:vmFail,
      cap:vmCapW,clean:vmCapClean,hands:vmHD?vmHD.kind:null,hsc:vmHD?vmHD.sc:null,
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
      wo.getWorldPosition(_vmV);
      _vmI.copy(camera.matrixWorld).invert();
      _vmV.applyMatrix4(_vmI);
      o.weapCam=[+_vmV.x.toFixed(4),+_vmV.y.toFixed(4),+_vmV.z.toFixed(4)];
    }
    /* puntos del propio viewmodel en NDC: el agarre de cada mano y la PUNTA de cada manga (el
       extremo del conjunto: si ésa está fuera del cuadro, el brazo sale por el borde como en
       cualquier FPS y no hay ningún corte a la vista) */
    const pk={};
    if(vmHD&&HRG&&HLG){
      const hx=vmHD.hole[0]+vmHD.cuff;
      for(const it of [['handR',HRG,1],['handL',HLG,-1],['cuffR',HRG,1],['cuffL',HLG,-1]]){
        const G=it[1],side=it[2],cuff=it[0][0]==='c';
        G.updateWorldMatrix(true,false);
        _vmV.set(cuff?hx:vmHD.grip[0],cuff?vmHD.hole[1]:vmHD.grip[1],
                 (cuff?vmHD.hole[2]:vmHD.grip[2])*side);
        _vmV.applyMatrix4(G.matrixWorld);_vmV.project(camera);
        const inF=_vmV.z<1&&Math.abs(_vmV.x)<=1&&Math.abs(_vmV.y)<=1;
        pk[it[0]]=[+_vmV.x.toFixed(3),+_vmV.y.toFixed(3),inF?1:0];
      }
    }
    o.parts=pk;
    o.armT=VMC.armT;
    o.anchor=[VMC.ax,VMC.ay];o.vmFov=VMC.fov;
    o.warpK=VMF?+VMF.scale.x.toFixed(4):null;
    o.aspect=+camera.aspect.toFixed(3);o.camFov=+camera.fov.toFixed(1);
    return o;
  },
  vmSet:(k,v)=>{
    if(k==='armT'){VMC.armT=+v;
      const ms=fpArmMaterials();
      if(ms)for(const m of ms)if(m.userData.uArmT)m.userData.uArmT.value=+v;
      return VMC.armT;}
    if(!(k in VMC))return null;
    VMC[k]=+v;
    if(k==='on'&&!VMC.on&&vmOn){vmOn=false;vmLeave();return VMC[k];}
    nsafe(()=>vmPlaceH(),'vmset');
    return VMC[k];
  },
  /* perillas del MODELO de manos: sc (metros por unidad), gx/gy/gz (el punto de la malla que se
     apoya en la empuñadura), cuff (largo de la manga). Se revisten las manos si cambia la manga. */
  vmHandSet:(k,v)=>{
    if(!vmHD)return null;
    if(k==='sc'){VMH.sc=+v;if(vmHD.kind==='glb')vmHD.sc=+v;}
    else if(k==='gx'||k==='gy'||k==='gz'){const i={gx:0,gy:1,gz:2}[k];vmHD.grip[i]=+v;
      if(vmHD.kind==='glb')VMH.grip[i]=+v;}
    else if(k==='cuff'){vmHD.cuff=+v;if(vmHD.kind==='glb')VMH.cuff=+v;nsafe(()=>vmSkin(),'vmcuff');}
    /* emis = piso de emisivo del material: el conjunto cuelga de la cámara, así que su
       iluminación depende de hacia dónde mira el jugador y a contraluz quedaba una silueta */
    else if(k==='emis'){VMH.emis=+v;
      for(const m of (vmMats||[]))if(m&&m.emissive){m.emissive.setScalar(+v);m.needsUpdate=true;}}
    else if(k in VMHP){VMHP[k]=v;}
    else return null;
    nsafe(()=>vmPlaceH(),'vmhset');
    return vmHD.kind+':'+k+'='+v;
  },
  /* ajuste por arma sobre el ancla, para calibrar sin recompilar: vmWeapSet('bat','rx',-.6) */
  vmWeapSet:(id,k,v)=>{ const K=VMWK[id]||(VMWK[id]={});K[k]=+v;nsafe(()=>vmPlaceH(),'vmwset');
    return JSON.stringify(K); },
  vmCap:()=>nsafe(()=>vmCapture(),'vmcap'),
  vmShow:b=>{if(VMG)VMG.visible=!!b;return VMG?VMG.visible:null;},
  vmDiff:()=>nsafe(()=>vmDiff(),'vmdiff')
});
