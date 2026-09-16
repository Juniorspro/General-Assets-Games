
/* ===================== CUERPO PROCEDURAL (sin GLB, sin skinning) =====================
   El modelo skinned se fue entero. Queda su ESQUELETO (24 huesos, mismos nombres y jerarquía) y sus
   ANIMACIONES de cadera+piernas, embebidas en CUERPO_DATOS: three bindea las pistas por NOMBRE DE NODO,
   así que el mismo AnimationMixer reproduce los mismos clips sobre un esqueleto hecho por código.

   Por qué: los tres bugs que no se pudieron cerrar en tres rondas eran de SKINNING o de huesos que no existen.
     · la piel se abría en púas desde +34° de pitch  → no hay piel: cada parte es una pieza rígida
     · la mano atravesaba el arma                     → el rig no tenía dedos; acá la mano se modela ENVOLVIENDO
     · la cabeza tapaba la lente                      → es una pieza más: no se dibuja y listo
   Además el juego pasa de bajar 1,26 MB a no bajar nada: las pistas pesan 101 KB y van adentro del HTML.

   Unidades: TODO el esqueleto vive en unidades de hueso del GLB (1 u = 0.010882 m) y el grupo raíz lleva esa
   escala. Así los valores de las pistas se aplican sin convertir nada — convertir era el bug de unidades que
   tuvo la cadera clavada al piso durante tres rondas. Las piezas se escriben en METROS y se multiplican por U. */
const CU_ESC=0.010882;              // 1 unidad de hueso → metros (Armature 0.01 · bodyScale 1.0882)
const U=1/CU_ESC;                   // metros → unidades de hueso
const CU_BRAZO=1.06;                // el brazo se alarga un 6%: con el rig original la mano de apoyo NO llegaba
                                    // al guardamanos (0,63 m de cadena contra 0,545 de alcance). Ahora elijo yo.
let cuCabezaG=null, cuPiezas=[], cuSoloTP=[];   // cuSoloTP: piezas que en 1ª persona sólo estorban (pecho, cuello, cabeza)
const CU_MAT={};
function cuMats(){
  if(CU_MAT.cuerpo)return;
  const M=(c,r,m)=>{ const t=new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m||0}); t.userData._oc=[new THREE.Color(c)]; return t; };
  CU_MAT.cuerpo=M(0x87909a,0.66,0.06);   // maniquí gris claro
  CU_MAT.junta =M(0x5f686f,0.5,0.25);    // juntas más oscuras: definen el articulado y tapan las costuras
  CU_MAT.mano  =M(0x3f464b,0.55,0.15);   // "guantes"
  CU_MAT.manga =M(0x565e65,0.62,0.08);   // antebrazos: son los que se ven en 1ª persona; claros tapaban como una pared
  CU_MAT.cara  =M(0x828b93,0.7,0.04);
}
const cuCaja=(w,h,d)=>new THREE.BoxGeometry(w*U,h*U,d*U);
const cuCaps=(r,l)=>new THREE.CapsuleGeometry(r*U,Math.max(0.004,l-2*r)*U,4,10);
const cuEsf =(r)=>new THREE.SphereGeometry(r*U,12,9);
function cuPieza(padre,geo,x,y,z,mat,rx){
  const m=new THREE.Mesh(geo,mat||CU_MAT.cuerpo);
  m.position.set(x*U,y*U,z*U); if(rx)m.rotation.x=rx;
  m.castShadow=true; m.receiveShadow=true; m.frustumCulled=false;
  m.userData._oc=[m.material.color.clone()]; m.userData._om=[null];
  padre.add(m); cuPiezas.push(m); bodySkinMeshes.push(m); return m;
}
/* MANO QUE AGARRA. El puño se construye CENTRADO EN EL ORIGEN DEL HUESO: así, cuando el IK lleva la muñeca al
   punto de agarre, el arma queda literalmente DENTRO del puño. La ranura (palma ↔ dedos) corre en Z y el agujero
   del puño en X: el mango pasa por ahí. Sin dedos articulados no hay cierre real, pero sí hay envoltura real. */
function cuMano(hueso,lado){
  const g=new THREE.Group(); hueso.add(g);
  cuPieza(g,cuCaja(0.088,0.092,0.030), 0, 0, 0.036, CU_MAT.mano);          // palma
  cuPieza(g,cuCaja(0.086,0.078,0.028), 0, 0.006,-0.038, CU_MAT.mano);      // bloque de dedos (cierra la ranura)
  cuPieza(g,cuCaja(0.026,0.052,0.030), lado*0.046, 0.010, 0.004, CU_MAT.mano); // pulgar, cruzando la ranura
  cuPieza(g,cuCaja(0.080,0.030,0.086), 0,-0.052, 0.000, CU_MAT.mano);      // canto/base de la palma
  return g;
}
function cuLargo(h){                                   // largo del hueso = distancia a su primer hijo (metros)
  const c=h.children.filter(o=>o.isBone)[0];
  return c? c.position.length()*CU_ESC : 0.08;
}
function cuVestir(h){
  const n=(h.name||'').toLowerCase(), L=cuLargo(h);
  const cap=(r)=>cuPieza(h,cuCaps(r,L),0,L/2,0);   // devuelve la pieza (algunas se ocultan en 1ª persona)
  const jun=(r,y)=>cuPieza(h,cuEsf(r),0,y,0,CU_MAT.junta);
  if(n==='hips'){ cuPieza(h,cuCaja(0.30,0.19,0.23),0,0.04,0.005); jun(0.10,0); }
  else if(n==='spine02'){ cuPieza(h,cuCaja(0.29,L+0.02,0.21),0,L/2,0.005); }
  else if(n==='spine01'){ cuPieza(h,cuCaja(0.32,L+0.02,0.22),0,L/2,0.005); }
  else if(n==='spine'){   cuSoloTP.push(cuPieza(h,cuCaja(0.375,0.215,0.245),0,0.055,0.005));   // pecho
                          cuSoloTP.push(cuPieza(h,cuCaja(0.30,0.075,0.20),0,0.155,0.005)); }    // trapecio
  else if(n==='neck'){ cuSoloTP.push(cap(0.048)); }
  else if(n==='head'){ cuCabezaG=new THREE.Group(); h.add(cuCabezaG);
    cuPieza(cuCabezaG,cuCaja(0.175,0.215,0.205),0,0.085,0.004);
    cuPieza(cuCabezaG,cuCaja(0.150,0.075,0.020),0,0.090,-0.108,CU_MAT.cara);    // visor: da dirección a la cara
    cuPieza(cuCabezaG,cuEsf(0.052),0,0.195,0.01,CU_MAT.junta); }
  else if(/shoulder$/.test(n)){ cap(0.055); jun(0.066,L); }
  else if(/(^|[^e])arm$/.test(n)){ cap(0.053); jun(0.056,L); }                   // brazo → codo
  else if(/forearm$/.test(n)){ cuPieza(h,cuCaps(0.042,L),0,L/2,0,CU_MAT.manga); jun(0.046,L); }                       // antebrazo → muñeca
  else if(/hand$/.test(n)){ cuMano(h, n[0]==='r'?1:-1); }
  else if(/upleg$/.test(n)){ cap(0.086); jun(0.092,L); }
  else if(/leg$/.test(n)){ cap(0.068); jun(0.072,L); }
  else if(/foot$/.test(n)){ cuPieza(h,cuCaja(0.105,L+0.03,0.085),0,(L+0.03)/2,-0.012); }
  else if(/toebase$/.test(n)){ cuPieza(h,cuCaja(0.10,0.055,0.075),0,0.025,-0.008); }
}
/* pistas → AnimationClip. Los nombres de track son '<Hueso>.quaternion' / '.position', que es como
   PropertyBinding los busca en el subárbol del mixer. */
function cuClips(){
  const out=[];
  for(const nm in CUERPO_DATOS.c){ const c=CUERPO_DATOS.c[nm], tk=[];
    for(const h in c.b){ const b=c.b[h];
      if(b.q) tk.push(new THREE.QuaternionKeyframeTrack(h+'.quaternion', b.q.t, b.q.v));
      if(b.p) tk.push(new THREE.VectorKeyframeTrack(h+'.position', b.p.t, b.p.v)); }
    out.push(new THREE.AnimationClip(nm, c.d, tk)); }
  return out;
}
function cuEsqueleto(){
  const hs=CUERPO_DATOS.h, bs=[];
  for(let i=0;i<hs.length;i++){ const d=hs[i], b=new THREE.Bone(); b.name=d.n;
    b.position.set(d.t[0],d.t[1],d.t[2]); b.quaternion.set(d.q[0],d.q[1],d.q[2],d.q[3]);
    bs.push(b); if(d.p>=0) bs[d.p].add(b); }
  // el brazo se alarga acá (las pistas no tocan brazos, así que no rompe ninguna animación)
  for(const b of bs){ const n=b.name.toLowerCase();
    if(/forearm$|hand$/.test(n)) b.position.multiplyScalar(CU_BRAZO); }
  return bs;
}
function construirCuerpo(){
  if(bodyRoot)return;
  cuMats();
  const bs=cuEsqueleto();
  const inner=new THREE.Group(); inner.name='Armature';
  inner.scale.setScalar(CU_ESC); inner.add(bs[0]);
  for(const b of bs) cuVestir(b);
  bodyRoot=new THREE.Group(); bodyRoot.add(inner); scene.add(bodyRoot);
  bodyInner=inner; bodyScale=1.0882;
  for(const b of bs){ const n=b.name.toLowerCase();
    if(n==='head')bodyHead=b; else if(n==='neck')bodyNeck=b; else if(n==='hips')bodyHips=b;
    tiroGrabBone(b); }
  bodyHipsBind=bodyHips?bodyHips.position.clone():null;
  const clips=cuClips();
  bodyMixer=new THREE.AnimationMixer(inner);
  clips.forEach(cl=>{ const a=bodyMixer.clipAction(cl); a.setLoop(THREE.LoopRepeat); a.clampWhenFinished=false; bodyActions[cl.name]=a; });
  try{ mskCapturar(inner, clips); }catch(e){ console.warn('mascara',e); }
  setAnim('idle');
  try{ applySkin(equippedSkin); }catch(e){}
  mpBodySrc=inner; mpClips=clips;          // los avatares remotos clonan el mismo cuerpo
  for(const m of cuPiezas) recorteCerca(m.material,0.115);   // recorte propio: el skinning ya no existe, alcanza con 11 cm
}
/* Se construye en un microtask: el bloque del nivel se inserta ANTES de que se declaren bodyRoot/bodyInner
   (línea 673 de la base), así que llamarlo acá mismo caería en la zona muerta temporal de esos let. */
Promise.resolve().then(()=>{ try{ construirCuerpo(); }catch(e){ console.warn('cuerpo',e); } });
