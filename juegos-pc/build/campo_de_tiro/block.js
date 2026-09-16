/* ===================== CAMPO DE TIRO (mundo GRIS · galería larga; 1ª persona con brazos y arma EN LAS MANOS) =====================
   Vive en +Z lejos del resto (TIRO_GZ), igual que los demás mundos.
   El arma NO se cuelga del hueso de la mano: se coloca respecto a la CÁMARA (viewmodel) y las MANOS van a buscarla
   con IK de dos huesos sobre el MISMO rig del juego → ves TUS brazos, TU skin y TUS animaciones agarrando el fusil. */
const TIRO_GZ=16000;
const tiroGroup=new THREE.Group(); tiroGroup.visible=false; scene.add(tiroGroup);
let tiroBuilt=false, _tiroWired=false;
const TIRO_H=6.5, TIRO_W=32;                       // alto y ancho de la galería
const TIRO_START=new THREE.Vector3(0,0,TIRO_GZ-6);  // el jugador entra en el pasillo de atrás
const tiroTargets=[];   // blancos disparables (papel + acero)
const tiroSolids=[];    // superficies donde muere la bala (para la trazadora / impacto)
const tiroMovers=[];    // blancos que se mueven
let tiroScore=0, tiroHits=0, tiroShots=0, tiroBest=0;
let tiroBoardCv=null, tiroBoardTex=null, _boardT=0;

/* ---- texturas de hormigón/blanco (canvas: cero descargas) ---- */
function tiroConcreteTex(base,ruido,lin){ const S=256,c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d');
  g.fillStyle=base; g.fillRect(0,0,S,S);
  for(let i=0;i<2600;i++){ const v=(Math.random()*2-1)*ruido; const l=Math.max(0,Math.min(255,base_l(base)+v));
    g.fillStyle='rgba('+(l|0)+','+(l|0)+','+((l*1.01)|0)+',0.5)'; g.fillRect(Math.random()*S,Math.random()*S,1+Math.random()*2.4,1+Math.random()*2.4); }
  for(let i=0;i<26;i++){ g.fillStyle='rgba(0,0,0,'+(0.02+Math.random()*0.05)+')'; const r=8+Math.random()*38;
    g.beginPath(); g.arc(Math.random()*S,Math.random()*S,r,0,6.283); g.fill(); }
  if(lin){ g.strokeStyle='rgba(0,0,0,.20)'; g.lineWidth=2; for(let i=0;i<=S;i+=64){ g.beginPath();g.moveTo(0,i);g.lineTo(S,i);g.stroke(); g.beginPath();g.moveTo(i,0);g.lineTo(i,S);g.stroke(); } }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=4; return t; }
function base_l(hex){ const n=parseInt(hex.slice(1),16); return ((n>>16&255)+(n>>8&255)+(n&255))/3; }
/* sombra de contacto pintada (el sol no entra al galpón: sin esto todo flota) */
let _txBlob=null;
function blobTex(){ if(_txBlob)return _txBlob; const S=128,c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d');
  const gr=g.createRadialGradient(S/2,S/2,0,S/2,S/2,S/2); gr.addColorStop(0,'rgba(0,0,0,.72)'); gr.addColorStop(0.55,'rgba(0,0,0,.30)'); gr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=gr; g.fillRect(0,0,S,S); const t=new THREE.CanvasTexture(c); return (_txBlob=t); }
function tiroBlob(x,z,r,padre){ const m=new THREE.Mesh(new THREE.PlaneGeometry(r*2,r*2),
    new THREE.MeshBasicMaterial({map:blobTex(),transparent:true,depthWrite:false,opacity:0.85}));
  m.rotation.x=-Math.PI/2; m.position.set(x,0.012,z+(padre?0:TIRO_GZ)); m.renderOrder=1; (padre||tiroGroup).add(m); return m; }
let _txPiso=null,_txPared=null;
function tiroMat(color,rough,metal,tex,rep){ const m=new THREE.MeshStandardMaterial({color:color,roughness:rough==null?0.92:rough,metalness:metal||0});
  if(tex){ m.map=tex.clone(); m.map.needsUpdate=true; if(rep)m.map.repeat.set(rep[0],rep[1]); } return m; }

/* ---- caja gris con colisión, dentro del grupo del nivel (z relativo a TIRO_GZ) ---- */
function addTiro(x,y,z,w,h,d,m,noWall,noCol){
  const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
  me.position.set(x,y,z+TIRO_GZ); me.castShadow=true; me.receiveShadow=true; tiroGroup.add(me);
  if(!noCol) colliders.push({minx:x-w/2,maxx:x+w/2,miny:y-h/2,maxy:y+h/2,minz:z+TIRO_GZ-d/2,maxz:z+TIRO_GZ+d/2,mesh:me});
  if(!noWall) wallMeshes.push(me);
  tiroSolids.push(me); return me; }

/* ---- cartel con texto (canvas) ---- */
function tiroSign(txt,x,y,z,w,h,ry,col){ const S=256,c=document.createElement('canvas'); c.width=S; c.height=128; const g=c.getContext('2d');
  g.fillStyle='#20242a'; g.fillRect(0,0,S,128); g.strokeStyle='rgba(255,255,255,.16)'; g.lineWidth=4; g.strokeRect(4,4,S-8,120);
  g.fillStyle=col||'#e8edf2'; g.font='bold 62px Segoe UI,system-ui,sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(txt,S/2,68);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
  const me=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshStandardMaterial({map:t,roughness:0.85,emissive:0x0a0c0e,emissiveIntensity:0.35}));
  me.position.set(x,y,z+TIRO_GZ); me.rotation.y=ry||0; tiroGroup.add(me); return me; }

/* ---- blanco de PAPEL (anillos concéntricos, puntaje por distancia al centro) ---- */
function tiroPaperTex(){ const S=512,c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d');
  g.fillStyle='#e9e6de'; g.fillRect(0,0,S,S);
  for(let i=0;i<1400;i++){ g.fillStyle='rgba(0,0,0,'+(0.01+Math.random()*0.03)+')'; g.fillRect(Math.random()*S,Math.random()*S,2,2); }
  const R=S*0.46, ring=[0.85,0.66,0.48,0.33,0.20];
  g.strokeStyle='#1a1a1a'; g.lineWidth=3;
  for(const r of ring){ g.beginPath(); g.arc(S/2,S/2,R*r,0,6.283); g.stroke(); }
  g.fillStyle='#111'; g.beginPath(); g.arc(S/2,S/2,R*0.20,0,6.283); g.fill();          // negro central
  g.fillStyle='#c0392b'; g.beginPath(); g.arc(S/2,S/2,R*0.085,0,6.283); g.fill();       // rojo del 10
  g.strokeStyle='#1a1a1a'; g.lineWidth=2; g.beginPath(); g.arc(S/2,S/2,R,0,6.283); g.stroke();
  g.fillStyle='#1a1a1a'; g.font='bold 26px Segoe UI,sans-serif'; g.textAlign='center'; g.fillText('10',S/2,S*0.5+R*0.42);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t; }
let _txPapel=null;
function addPaper(x,z,alto){
  const A=alto||1.62, W=1.18;
  const post=tiroMat(0x6c7278,0.6,0.35);
  addTiro(x-W/2-0.05,A*0.5,z,0.07,A+0.5,0.07,post,true);            // parantes
  addTiro(x+W/2+0.05,A*0.5,z,0.07,A+0.5,0.07,post,true);
  addTiro(x,0.06,z,W+0.4,0.12,0.34,tiroMat(0x4b5055,0.9),true);      // base
  addTiro(x,A,z+0.035,W+0.1,W+0.1,0.05,tiroMat(0x33383d,0.95),true,true);   // respaldo de cartón
  if(!_txPapel)_txPapel=tiroPaperTex();
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(W,W), new THREE.MeshStandardMaterial({map:_txPapel,roughness:0.88,metalness:0}));
  pl.position.set(x,A,z+TIRO_GZ+0.005); pl.rotation.y=Math.PI;   // el jugador viene de -Z y mira hacia +Z → la cara del papel mira a -Z
  pl.userData={kind:'paper', dist:z}; tiroGroup.add(pl); tiroTargets.push(pl); tiroBlob(x,z,0.95); return pl; }

/* ---- POPPER de acero (se cae al recibir el impacto y se levanta solo) ---- */
function addPopper(x,z,h,r,padre){
  const piv=new THREE.Group(); piv.position.set(x,0,z+(padre?0:TIRO_GZ)); (padre||tiroGroup).add(piv);
  const H=h||1.15, RR=r||0.20;
  const st=new THREE.Mesh(new THREE.BoxGeometry(0.055,H,0.055), tiroMat(0x5a6066,0.7,0.4)); st.position.y=H/2; piv.add(st);
  const pl=new THREE.Mesh(new THREE.CylinderGeometry(RR,RR,0.05,22), tiroMat(0xb9c0c7,0.32,0.9));
  pl.rotation.x=Math.PI/2; pl.position.y=H; piv.add(pl);
  const ar=new THREE.Mesh(new THREE.RingGeometry(RR*0.42,RR*0.60,20), new THREE.MeshStandardMaterial({color:0xc8452f,roughness:0.7,side:THREE.DoubleSide}));
  ar.position.set(0,H,-0.031); piv.add(ar);   // círculo naranja para verlo de lejos
  if(!padre){ const ba=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.1,0.34), tiroMat(0x44494e,0.9)); ba.position.y=0.05; piv.add(ba); tiroBlob(x,z,0.5); }
  else tiroBlob(0,0,0.5,padre);
  pl.userData={kind:'steel', piv:piv, down:false, t:0, r:RR};
  tiroTargets.push(pl); return pl; }

/* ---- pool de marcas de impacto (agujeros) y trazadoras ---- */
const tiroMarks=[]; let _markI=0;
function tiroMark(){ if(tiroMarks.length<48){ const m=new THREE.Mesh(new THREE.CircleGeometry(0.021,10), new THREE.MeshBasicMaterial({color:0x141414}));
    m.renderOrder=2; tiroMarks.push(m); return m; }
  const m=tiroMarks[_markI]; _markI=(_markI+1)%tiroMarks.length; return m; }
const tiroTracers=[];
function tiroTracer(){ for(const t of tiroTracers) if(t.userData.v<=0) return t;
  // G4: el cilindro tiene que vivir en +Z. lookAt() apunta el +Z del objeto al objetivo, así que con
  // translate(0,0,-0.5) la estela salía de la boca HACIA ATRÁS (un solo signo, un solo bug).
  const g=new THREE.CylinderGeometry(0.013,0.013,1,5,1,true); g.rotateX(Math.PI/2); g.translate(0,0,0.5);   // eje +Z (el de lookAt), origen en la boca
  const m=new THREE.Mesh(g, new THREE.MeshBasicMaterial({color:0xffe9a8,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.userData={v:0}; m.visible=false; scene.add(m); tiroTracers.push(m); return m; }
const tiroSparks=[];
function tiroSpark(){ for(const s of tiroSparks) if(s.userData.v<=0) return s;
  const m=new THREE.Mesh(new THREE.SphereGeometry(0.055,7,5), new THREE.MeshBasicMaterial({color:0xffd58a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.userData={v:0}; m.visible=false; scene.add(m); tiroSparks.push(m); return m; }

/* ---- RECORTES EN EL SHADER ----
   El juego ocultaba la cabeza con el near plane de la cámara (0,20). Medido en el rig: la mano derecha queda a
   0,196 m del ojo quieto y a 0,147 m al deslizarse → ese mismo near plane CORTABA LAS MANOS (y una malla cortada por
   el near plane se ve como una garra con púas). Bajar el near a 0,05 destapa las manos… y también la cara por dentro.
   Colapsar el hueso de la cabeza tampoco sirve: el cuerpo es UNA malla de 23.380 vértices con UN material, así que
   los vértices del cuello (pesados entre cuello y cabeza) se estiran en láminas por toda la pantalla.
   Solución: descartar en el fragment shader según el PESO DE SKINNING. Si el vértice pertenece a los huesos de la
   cabeza, no se dibuja. El corte cae justo en el cuello, sin estirar nada, y se apaga en 3ª persona. */
function recorteCerca(m,d){ if(!m||m.userData._rec)return; m.userData._rec=true;
  const u={value:d}; m.userData.uRec=u;
  m.onBeforeCompile=sh=>{ sh.uniforms.uRec=u;
    sh.vertexShader='varying float vProf;\n'+sh.vertexShader.replace('#include <fog_vertex>','#include <fog_vertex>\n  vProf=-mvPosition.z;');
    sh.fragmentShader='uniform float uRec;\nvarying float vProf;\n'+sh.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n  if(vProf<uRec) discard;'); };
  m.needsUpdate=true; }
function recorteObj(o,d){ o.traverse(n=>{ if(n.isMesh){ const ms=Array.isArray(n.material)?n.material:[n.material]; ms.forEach(m=>recorteCerca(m,d)); } }); }
let _cabCut=null;   // uniforms del recorte de cabeza (uno por material del cuerpo)
function recorteCabeza(m,idx){ if(!m||m.userData._cab)return; m.userData._cab=true;
  const uCut={value:0.30}, uH0={value:idx[0]}, uH1={value:idx[1]}, uH2={value:idx[2]};
  m.userData.uCut=uCut; (_cabCut=_cabCut||[]).push(uCut);
  const prev=m.onBeforeCompile;
  m.onBeforeCompile=sh=>{ if(prev)prev(sh);
    sh.uniforms.uCut=uCut; sh.uniforms.uH0=uH0; sh.uniforms.uH1=uH1; sh.uniforms.uH2=uH2;
    sh.vertexShader=sh.vertexShader.replace('void main() {',
      'varying float vCab;\nuniform float uH0,uH1,uH2;\n'+
      'float _esCab(float i){ return (abs(i-uH0)<0.5||abs(i-uH1)<0.5||abs(i-uH2)<0.5)?1.0:0.0; }\n'+
      'void main() {\n  vCab=_esCab(skinIndex.x)*skinWeight.x+_esCab(skinIndex.y)*skinWeight.y+_esCab(skinIndex.z)*skinWeight.z+_esCab(skinIndex.w)*skinWeight.w;');
    sh.fragmentShader='uniform float uCut;\nvarying float vCab;\n'+sh.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n  if(vCab>uCut) discard;'); };
  m.needsUpdate=true; }
let _cabListo=false;
function prepararCuerpo(){ if(_cabListo||!bodySkinMeshes.length)return;
  const sk=bodySkinMeshes[0].skeleton; if(!sk)return;
  const idx=[-1,-1,-1]; let k=0;
  sk.bones.forEach((b,i)=>{ if(/^(head|head_end|headfront)$/i.test(b.name||'') && k<3) idx[k++]=i; });
  if(idx[0]<0)return;
  _cabListo=true;
  for(const o of bodySkinMeshes){ const ms=Array.isArray(o.material)?o.material:[o.material];
    // 0,20 m = el mismo corte que hacía el near plane original. Al deslizarse el hombro pasa a 5 cm de la lente:
    // con un recorte chico se dibujaban triángulos gigantes (láminas de piel) que tapaban la pantalla.
    ms.forEach(m=>{ recorteCerca(m,0.20); recorteCabeza(m,idx); }); }
}

/* ---- fogonazo: estrella con degradé (un plano liso se ve como un cuadrado blanco) ---- */
let _txFlash=null;
function flashTex(){ if(_txFlash)return _txFlash; const S=128,c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d');
  g.clearRect(0,0,S,S); g.translate(S/2,S/2);
  const gr=g.createRadialGradient(0,0,0,0,0,S*0.30); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(0.35,'rgba(255,236,190,0.85)');
  gr.addColorStop(0.7,'rgba(255,190,110,0.28)'); gr.addColorStop(1,'rgba(255,150,60,0)');
  g.fillStyle=gr; g.beginPath(); g.arc(0,0,S*0.30,0,6.283); g.fill();
  for(let i=0;i<6;i++){ const a=i*Math.PI/3+0.2, L=S*(i%2?0.30:0.47), W=S*0.045;   // puntas
    g.save(); g.rotate(a); const lg=g.createLinearGradient(0,0,0,-L);
    lg.addColorStop(0,'rgba(255,240,200,0.8)'); lg.addColorStop(1,'rgba(255,170,80,0)');
    g.fillStyle=lg; g.beginPath(); g.moveTo(-W,0); g.lineTo(0,-L); g.lineTo(W,0); g.closePath(); g.fill(); g.restore(); }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return (_txFlash=t); }

/* ---- ARMA (viewmodel de cajas: se ve prolijo y no pesa nada) ---- */
let gunRoot=null, gunFlash=null, gunFlash2=null, gunLight=null;
// Medido en el propio rig: hombro a 0.182 der / 0.231 abajo / 0.10 detrás del ojo, y el brazo ALCANZA 0.54 m (0.267+0.273).
// Todo el agarre se diseñó con ese número: la derecha a ~0.30 del hombro (codo bien doblado) y la izquierda a ~0.52 (brazo casi
// estirado, como en un fusil de verdad). Por eso la mano de apoyo va sobre el cargador y no en la punta del guardamanos.
// EL FUSIL SE ACORTÓ 0,167 de unidad local (=14,4 cm de mundo) y quedó una carabina/PDW. No es estética:
// era la única forma honesta de que la mano de apoyo llegue al GUARDAMANOS. La cuenta: el hombro izquierdo
// está 0,190 m a la izquierda y 0,002 m DETRÁS del ojo, el brazo alcanza 0,540 m y _limitarArma lo tope a
// 0,92·0,54 = 0,497 m; con la separación lateral y vertical fijas, el avance máximo de la muñeca izquierda
// es √(0,497² − 0,261² − 0,081²) = 0,415 m delante de la lente. El labio trasero del guardamanos viejo
// estaba a 0,629 m: 21 cm fuera de alcance, y ningún torso lo salva (haría falta blandear el pecho 70°).
const GUN_ESC=0.72;   // con FOV vertical 90 todo lo cercano se agranda: a 0.86 el fusil se comía el cuadro
const GUN_MUZZLE=new THREE.Vector3(0,0.014,-0.533);       // boca del caño (local)
// AGARRES SOBRE LA SUPERFICIE (G1). El criterio viejo era "errDer=0.000" = la muñeca está donde le
// dijimos; nunca preguntaba DÓNDE le dijimos. El viejo GUN_GRIP_R (0.012,-0.045,0.135) caía 9,5 mm
// ADENTRO del cajón de mecanismos y el viejo GUN_GRIP_L quedaba en el aire, a 6,2 mm de una ARISTA.
// Ahora los tres puntos se construyen como "cara del sólido + 10 unidades locales (8,6 mm de mundo) por
// su normal": medio espesor de muñeca, para que la mano quede APOYADA y no clavada. Verificable en vivo
// con __tiro.solido(x,y,z) y __tiro.tocando(), que leen la geometría real de gunRoot.
//   R  → cara TRASERA de la empuñadura (el backstrap, donde apoya la palma), tercio superior.
const GUN_GRIP_R=new THREE.Vector3(0.000,-0.098,0.1175);  // CENTRO de la empuñadura: el puño la envuelve
// la caja del mango: el IK apunta la MUÑECA, y la muñeca va arriba del puño, no en su centro (sube la mano
// 0,023 m sin mover el arma). x/z ligeramente adelante para sacarla del filo del recorte de cuerpo (0,20 m).
// APUNTANDO MUY ARRIBA la mano de apoyo SE CORRE HACIA ATRÁS, sobre el cajón. No es un gusto: a pitch 1.3
// la cámara está en la cabeza, así que rotar la vista 74° hacia arriba manda todo lo que está por debajo del
// ojo DETRÁS de la lente — el hombro izquierdo se va a z=+0.191. Con el agarre en el guardamanos la cadena
// hombro→agarre mide 0.500 m contra un alcance de 0.497: _limitarArma se activa y arrastra el fusil entero
// hacia el jugador hasta dejar la muñeca DERECHA a 0.104 m de la lente, o sea 10 cm adentro del recorte.
// Corriendo el agarre a z=+0.150 la cadena baja a 0.43 m, el limitador suelta y la derecha queda a ~0.26.
const GUN_GRIP_L_ALTO=new THREE.Vector3(0.000,0.004,-0.0200);   // idem, más atrás, al apuntar muy arriba
const _gL=new THREE.Vector3(-0.041,-0.1052,-0.0095);      // agarre izquierdo VIVO (el que usa todo el código)
const GUN_GRIP_L=new THREE.Vector3(0.000, 0.004,-0.0200);  // guardamanos por atrás: 0,556 m desde el hombro contra 0,577 de alcance
// PROBADO Y DESCARTADO subir el agarre a y=-0.075 "para acortar la cadena": el peor errIzq esprintando
// EMPEORA (0.092 -> 0.103) y el peor de la palma también (38 -> 45 mm). El brazo izquierdo no está limitado
// por DISTANCIA sino por ÁNGULO (TIRO_IKMAX topa cuánto se aparta el húmero de la pose de reposo, que es
// "colgando"), y subir el objetivo pide MÁS desviación, no menos.
// La palma (muñeca + 0,045 m por TIRO_DEDOS_L) cae ADENTRO del magwell: sin huesos de dedos, que el arma
// TAPE la mano es lo que la hace leer como agarre. El guardamanos NO es una opción: su labio trasero pide
// 0,63 m de cadena hombro→agarre contra 0,513 m de alcance útil, y no hay GUN_OJO que lo arregle
// (con OX=0, el techo de avance de la muñeca izquierda es 0,469 m: faltan 117 mm).
function buildGun(){ if(gunRoot)return;
  gunRoot=new THREE.Group(); gunRoot.visible=false; gunRoot.scale.setScalar(GUN_ESC); scene.add(gunRoot);
  // OJO: con scene.environment (RoomEnvironment) cualquier metalness alta convierte el arma en chapa pulida blanca.
  // Gunmetal = metalness baja, roughness alta y envMapIntensity chico.
  const gm=(c,r,m)=>{ const t=tiroMat(c,r,m); t.envMapIntensity=0.22; return t; };
  const negro=gm(0x14171a,0.62,0.22), metal=gm(0x23282c,0.45,0.45), gris=gm(0x1b1f22,0.70,0.16), poli=gm(0x101315,0.86,0.04);
  const box=(w,h,d,x,y,z,m,rx)=>{ const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); me.position.set(x,y,z); if(rx)me.rotation.x=rx; gunRoot.add(me); return me; };
  // el modelo está corrido hacia ADELANTE: lo que quede detrás de 0.20 m lo recorta el near plane, igual que la culata pegada al pómulo
  // SILUETA (G9). El cajón medía 0.40 y llegaba hasta z=-0.220: se COMÍA el guardamanos entero
  // (los rangos x/y del guardamanos están contenidos en los suyos, así que 0.167 de los 0.240 del
  // guardamanos vivían ADENTRO del cajón y no se veían). No hacía falta acortar el fusil: hacía falta
  // acortar el cajón. Ahora termina en z=-0.100, justo delante del pozo del cargador, que es lo
  // anatómicamente correcto, y deja 0.313 de guardamanos a la vista (269 mm de mundo).
  box(0.072,0.112,0.28, 0,0,0.04, negro);           // cajón de mecanismos → z[-0.100,+0.180]
  box(0.052,0.100,0.12, 0,-0.004,0.235, negro);     // cajón trasero
  box(0.046,0.082,0.16, 0,-0.014,0.400, poli);      // culata corta (casi siempre recortada)
  box(0.062,0.052,0.36, 0,0.004,-0.233, gris);      // guardamanos → z[-0.413,-0.053]: envuelve el caño y deja 52 mm asomando
  const ba=new THREE.Mesh(new THREE.CylinderGeometry(0.0115,0.0115,0.19,10), metal); ba.rotation.x=Math.PI/2; ba.position.set(0,0.014,-0.378); gunRoot.add(ba);   // caño
  const fh=new THREE.Mesh(new THREE.CylinderGeometry(0.019,0.019,0.05,10), negro); fh.rotation.x=Math.PI/2; fh.position.set(0,0.014,-0.498); gunRoot.add(fh);    // bocacha
  box(0.042,0.115,0.055, 0,-0.105,0.115, poli, 0.30);    // empuñadura
  box(0.048,0.185,0.072, 0,-0.150,-0.005, poli, -0.10);  // cargador
  // BOCA DE CARGADOR (magwell). Es la superficie que agarra la mano izquierda: x±0.031, y[-0.133,-0.063],
  // z[-0.051,+0.035]. Existe porque el guardamanos está fuera de alcance por 118 mm (medido: la cadena
  // hombro→labio del guardamanos da 0.63 m contra 0.513 de alcance útil) y el agarre de magwell es la
  // única superficie real que cae adentro del presupuesto. GUN_GRIP_L va 10 unidades fuera de su cara izq.
  box(0.062,0.070,0.086, 0,-0.098,-0.008, poli);        // boca de cargador / apoyo de la mano izquierda
  box(0.028,0.022,0.055, 0,-0.058,0.055, negro);         // guardamonte
  box(0.038,0.014,0.36, 0,0.062,-0.10, negro);           // riel
  box(0.030,0.040,0.020, 0,0.086,0.02, negro);           // alza
  box(0.026,0.046,0.018, 0,0.089,-0.273, negro);         // punto de mira
  box(0.050,0.052,0.090, 0,0.098,-0.02, negro);          // mira réflex (tubo)
  const dot=new THREE.Mesh(new THREE.CircleGeometry(0.008,10), new THREE.MeshBasicMaterial({color:0xff3a2a,blending:THREE.AdditiveBlending,depthWrite:false}));
  dot.position.set(0,0.098,0.026); gunRoot.add(dot);                                  // punto rojo
  box(0.020,0.016,0.075, 0.041,0.050,0.10, metal);       // manija de carga (derecha)
  box(0.006,0.030,0.070, 0.037,0.014,-0.06, tiroMat(0x14171a,0.6,0.2));   // ventana de eyección
  box(0.058,0.010,0.30, 0,-0.028,-0.203, negro);         // riel inferior, PEGADO al guardamanos (antes flotaba 35 mm por debajo)
  // fogonazo: dos planos cruzados + luz puntual (viven 45 ms)
  // depthTest:false + renderOrder → el fogonazo nunca queda escondido dentro de la bocacha
  const fm=new THREE.MeshBasicMaterial({map:flashTex(),color:0xffe0a0,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,side:THREE.DoubleSide});
  gunFlash=new THREE.Mesh(new THREE.PlaneGeometry(0.44,0.44),fm); gunFlash.position.copy(GUN_MUZZLE); gunFlash.position.z-=0.10; gunFlash.renderOrder=6; gunRoot.add(gunFlash);
  gunFlash2=new THREE.Mesh(new THREE.PlaneGeometry(0.44,0.44),fm); gunFlash2.position.copy(gunFlash.position); gunFlash2.rotation.z=Math.PI/2; gunFlash2.renderOrder=6; gunRoot.add(gunFlash2);
  gunFlash.visible=gunFlash2.visible=false;
  gunLight=new THREE.PointLight(0xffd9a0,0,7,2); gunLight.position.copy(GUN_MUZZLE); gunRoot.add(gunLight);
  recorteObj(gunRoot,0.17);   // la culata que queda pegada al pómulo se recorta acá (antes lo hacía el near plane)
}

/* ---- construcción del nivel ---- */
function buildTiro(){ if(tiroBuilt)return; tiroBuilt=true;
  if(!_txPiso)_txPiso=tiroConcreteTex('#4a4f55',26,false);
  if(!_txPared)_txPared=tiroConcreteTex('#5c6268',18,true);
  const mPiso=tiroMat(0x4a4f55,0.95,0,_txPiso,[22,52]), mPared=tiroMat(0x5c6268,0.9,0,_txPared,[16,4]),
        mTecho=tiroMat(0x2f3338,0.95), mMuro=tiroMat(0x4e5359,0.9,0,_txPared,[10,3]), mDiv=tiroMat(0x6d7479,0.55,0.25),
        mNegro=tiroMat(0x22262a,0.95), mLinea=new THREE.MeshStandardMaterial({color:0xc9a227,roughness:0.7,emissive:0x3a2c00,emissiveIntensity:0.6});
  const Z0=-18, Z1=68, LAR=Z1-Z0, CZ=(Z0+Z1)/2;
  addTiro(0,-0.2,CZ,TIRO_W+4,0.4,LAR,mPiso,true);                       // piso (arriba en y=0)
  addTiro(0,TIRO_H+0.2,CZ,TIRO_W+4,0.4,LAR,mTecho,true);                // techo
  addTiro(-TIRO_W/2-0.2,TIRO_H/2,CZ,0.4,TIRO_H,LAR,mPared);             // paredes laterales
  addTiro( TIRO_W/2+0.2,TIRO_H/2,CZ,0.4,TIRO_H,LAR,mPared);
  addTiro(0,TIRO_H/2,Z1+0.2,TIRO_W+4,TIRO_H,0.4,mMuro);                 // fondo (parapeto)
  addTiro(0,TIRO_H/2,Z0-0.2,TIRO_W+4,TIRO_H,0.4,mMuro);                 // pared de atrás
  addTiro(0,1.1,Z1-1.2,TIRO_W,2.2,1.6,mNegro);                          // berma de caucho al pie del fondo
  // bafles inclinados del techo (lo que hace que una galería PAREZCA una galería)
  for(let i=0;i<11;i++){ const z=4+i*5.6; const b=new THREE.Mesh(new THREE.BoxGeometry(TIRO_W,0.22,2.3),mNegro);
    b.position.set(0,5.42,z+TIRO_GZ); b.rotation.x=-0.44; b.castShadow=false; b.receiveShadow=true; tiroGroup.add(b); }
  // puestos de tiro: divisorias + mesada (el carril central queda libre para caminar)
  const LX=[-8.8,-4.4,0,4.4,8.8];
  for(let i=0;i<6;i++){ const x=-11+i*4.4; addTiro(x,1.12,0,0.14,2.24,3.8,mDiv); }
  for(const x of LX){ if(x===0)continue;
    addTiro(x,1.02,-0.9,4.1,0.10,0.95,mDiv,true);            // tabla de la mesada
    addTiro(x,0.55,-1.32,4.1,0.85,0.10,mNegro,true);         // frente
    addTiro(x,0.28,-0.9,0.5,0.55,0.8,mNegro,true);           // pata/caja
    tiroBlob(x,-1.0,2.6);
  }
  addTiro(0,0.005,1.95,TIRO_W-1,0.02,0.16,mLinea,true,true);            // línea de fuego
  // luminarias del techo + luz real cada tanto
  const mLuz=new THREE.MeshStandardMaterial({color:0x2b2f33,emissive:0xfff4e2,emissiveIntensity:1.5,roughness:0.5});
  for(let i=0;i<8;i++){ const z=-12+i*10; addTiro(0,TIRO_H-0.12,z,0.55,0.1,5.2,mLuz,true,true);
    addTiro(-9.5,TIRO_H-0.12,z+5,0.5,0.1,4.2,mLuz,true,true); addTiro(9.5,TIRO_H-0.12,z+5,0.5,0.1,4.2,mLuz,true,true); }
  for(const z of [-10,4,14,24,34,44,56,64]){ const l=new THREE.PointLight(0xdce6f2,17,36,2); l.position.set(0,TIRO_H-0.6,z+TIRO_GZ); tiroGroup.add(l); }
  const hemi=new THREE.HemisphereLight(0xa8b8c8,0x3c4146,0.85); tiroGroup.add(hemi);   // relleno propio del nivel (la luz vive en el grupo → se apaga con él)
  // carteles de distancia en las paredes
  for(const d of [10,15,25,34,45]){ tiroSign(d+' M', -TIRO_W/2+0.25, 3.1, d, 2.0, 1.0, Math.PI/2, '#dfe6ec');
    tiroSign(d+' M',  TIRO_W/2-0.25, 3.1, d, 2.0, 1.0, -Math.PI/2, '#dfe6ec'); }
  tiroSign('CAMPO DE TIRO', 0, 4.6, Z0+0.15, 7.0, 1.6, 0, '#cfd8df');
  // ===== BLANCOS =====
  for(const x of LX) addPaper(x,10,1.60);                     // 10 m: uno por carril
  for(const x of [-9,-4.5,0,4.5,9]) addPopper(x,15,1.05,0.19);   // 15 m: fila de aceros
  for(const x of [-8.8,0,8.8]) addPaper(x,25,1.66);           // 25 m
  for(const x of [-6.6,-2.2,2.2,6.6]) addPopper(x,29,1.35,0.16);  // 29 m: aceros chicos
  for(const x of [-4.4,4.4]) addPaper(x,45,1.72);             // 45 m
  for(const x of [-2.0,2.0]) addPopper(x,45,1.05,0.15);
  // blanco MÓVIL a 34 m (corre de lado a lado sobre un riel)
  addTiro(0,1.98,34,TIRO_W-2,0.10,0.12,mDiv,true,true);
  const rail=new THREE.Group(); rail.position.set(0,0,34+TIRO_GZ); tiroGroup.add(rail);
  const mv=addPopper(0,0,1.72,0.19,rail); mv.userData.mover=true;
  tiroMovers.push({g:rail, a:Math.random()*6.28, amp:9.5, vel:0.55, base:0});
  // tablero de puntaje sobre el fondo
  tiroBoardCv=document.createElement('canvas'); tiroBoardCv.width=1024; tiroBoardCv.height=256;
  tiroBoardTex=new THREE.CanvasTexture(tiroBoardCv); tiroBoardTex.colorSpace=THREE.SRGBColorSpace;
  const bd=new THREE.Mesh(new THREE.PlaneGeometry(9.0,2.25), new THREE.MeshStandardMaterial({map:tiroBoardTex,emissive:0xffffff,emissiveIntensity:0.42,emissiveMap:tiroBoardTex,roughness:0.6}));
  bd.position.set(0,4.5,Z1-0.05+TIRO_GZ); bd.rotation.y=Math.PI; tiroGroup.add(bd); tiroDrawBoard();
  buildGun();
}
function tiroDrawBoard(){ if(!tiroBoardCv)return; const g=tiroBoardCv.getContext('2d'), W=1024,H=256;
  g.fillStyle='#14181c'; g.fillRect(0,0,W,H); g.strokeStyle='rgba(255,255,255,.14)'; g.lineWidth=6; g.strokeRect(8,8,W-16,H-16);
  const acc=tiroShots?Math.round(tiroHits/tiroShots*100):0;
  g.fillStyle='#8fd0ff'; g.font='bold 34px Segoe UI,system-ui,sans-serif'; g.textAlign='left'; g.fillText(t('tiro').toUpperCase(),40,58);
  g.fillStyle='#fff'; g.font='bold 96px Segoe UI,system-ui,sans-serif'; g.fillText(String(tiroScore),40,152);
  g.fillStyle='rgba(255,255,255,.72)'; g.font='600 30px Segoe UI,system-ui,sans-serif';
  g.fillText(t('t_hits')+': '+tiroHits+'/'+tiroShots+'   ·   '+t('t_acc')+': '+acc+'%',40,206);
  g.textAlign='right'; g.fillStyle='#ffd9a0'; g.font='bold 40px Segoe UI,system-ui,sans-serif'; g.fillText(t('t_best')+' '+tiroBest,W-40,152);
  tiroBoardTex.needsUpdate=true; }

/* ---- entrar al campo de tiro ---- */
function enterTiro(){ if(world==='tiro')return; world='tiro'; grassMode=false; dreamMode=false; discover('tiro');
  buildTiro(); tiroWire();
  tiroGroup.visible=true;
  scene.background=new THREE.Color(0x1b1f23); skyMesh.visible=false; scene.environment=roomEnv;   // INTERIOR gris (sin cielo)
  scene.fog.color.set(0x23282d); scene.fog.near=22; scene.fog.far=140;
  sun.intensity=0.55; sun.color.set(0xdfe8f2); renderer.toneMappingExposure=1.02;
  player.pos.copy(TIRO_START); player.vel.set(0,0,0); player.vy=0; player.onGround=true; player.noRoll=true;
  player.yaw=Math.PI; player.faceYaw=Math.PI; player.pitch=0;
  player.sliding=player.rolling=player.climbing=false; player.wallrun=0; player.wallrunT=0;
  lastSafe.copy(TIRO_START); portalDone=true;
  tiroAmmo=TIRO_MAG; tiroRel=0; tiroFire=false; tiroCd=0;
  tiroReiniciar();
  setWorldHUD('tiro','q_tiro'); ambient('amb3'); tiroHUD(true);
}

function tiroReiniciar(){   // tanda nueva: puntaje a cero, papeles limpios y aceros de pie (el récord se guarda)
  tiroScore=0; tiroHits=0; tiroShots=0;
  for(const m of tiroMarks){ m.visible=false; if(m.parent)m.parent.remove(m); }
  _markI=0;
  for(const o of tiroTargets){ const u=o.userData; if(u.kind==='steel'){ u.down=false; u.t=0; u.piv.rotation.x=0; } }
  tiroHUD(true); }

/* ===================== ARMA: munición, disparo, retroceso ===================== */
const TIRO_MAG=30, TIRO_RPM=640, TIRO_RELOAD=1.85;
let tiroAmmo=TIRO_MAG, tiroRel=0, tiroFire=false, tiroCd=0, tiroSemi=false;
let recBack=0, recUp=0, recCam=0, recYaw=0, flashT=0, _msgT=0;
const _cr=new THREE.Vector3(),_cu=new THREE.Vector3(),_cf=new THREE.Vector3(),_gp=new THREE.Vector3(),_gp2=new THREE.Vector3(),
      _pol=new THREE.Vector3(),_pol2=new THREE.Vector3(),_mz=new THREE.Vector3();
const _shotRay=new THREE.Raycaster(); _shotRay.far=140;
function tiroMsg(txt,col){ const el=document.getElementById('tiroMsg'); if(!el)return; el.textContent=txt; el.style.color=col||'#fff'; el.style.opacity='1'; _msgT=0.85; }
function tiroHUD(force){ const s=document.getElementById('tiroHUD'); if(!s)return;
  const acc=tiroShots?Math.round(tiroHits/tiroShots*100):0;
  s.children[0].textContent=String(tiroScore);
  s.children[1].textContent=tiroHits+'/'+tiroShots+' · '+acc+'%';
  const a=s.children[2]; a.textContent=(tiroRel>0? t('t_reloading') : tiroAmmo+' / '+TIRO_MAG); a.classList.toggle('low',tiroRel<=0&&tiroAmmo<=6);
  if(force)tiroDrawBoard(); }
function tiroReload(){ if(tiroRel>0||tiroAmmo>=TIRO_MAG)return; tiroRel=TIRO_RELOAD; tiroSnd('mag'); tiroHUD(); }
function tiroShoot(){
  if(tiroRel>0)return;
  if(tiroAmmo<=0){ tiroSnd('dry'); tiroReload(); return; }
  tiroAmmo--; tiroShots++; tiroCd=60/TIRO_RPM;
  tiroSnd('shot'); flashT=0.045;
  recBack=Math.min(0.075,recBack+0.055); recUp=Math.min(0.16,recUp+0.075);
  recCam+=0.019+Math.random()*0.008; recYaw+=(Math.random()-0.5)*0.011;
  // dispersión mínima (más al correr / en el aire)
  const disp=(player.onGround?0.0016:0.010)+Math.min(1,Math.hypot(player.vel.x,player.vel.z)/RUN)*0.010;
  _cf.set(0,0,-1).applyQuaternion(camera.quaternion);
  _cf.x+=(Math.random()-0.5)*disp; _cf.y+=(Math.random()-0.5)*disp; _cf.z+=(Math.random()-0.5)*disp; _cf.normalize();
  _shotRay.set(camera.position,_cf);
  const hits=_shotRay.intersectObjects(tiroTargets,false);
  let hit=hits.length?hits[0]:null;
  if(hit && hit.object.userData.kind==='steel' && hit.object.userData.down) hit=null;   // ya está caído
  let end=null;
  if(hit){ tiroImpactoBlanco(hit); end=hit.point; }
  else { const hs=_shotRay.intersectObjects(tiroSolids,false); if(hs.length){ end=hs[0].point; tiroSnd('pared');
      const sp=tiroSpark(); sp.position.copy(hs[0].point); sp.userData.v=0.14; sp.visible=true; sp.scale.setScalar(0.7); } }
  if(!end) end=_mz.copy(camera.position).addScaledVector(_cf,90).clone();
  // trazadora desde la boca del caño hasta el impacto
  // (G4, la otra mitad) La boca del caño está 0,88 m DELANTE de la lente, así que si el impacto cae más
  // cerca que eso —pegado a una pared, medido a 0,53 m— el objetivo queda DETRÁS de la boca y lookAt()
  // vuelve a dar vuelta la estela (medido: 166,9° contra la dirección del disparo). Con el impacto tan
  // cerca no hay estela que mostrar: no se dibuja.
  if(gunRoot){ gunRoot.updateMatrixWorld(true); _mz.copy(GUN_MUZZLE).applyMatrix4(gunRoot.matrixWorld);
    const _lg=_mz.distanceTo(end), _ad=(end.x-_mz.x)*_cf.x+(end.y-_mz.y)*_cf.y+(end.z-_mz.z)*_cf.z;
    if(_lg>0.35 && _ad>0){ const tr=tiroTracer(); tr.position.copy(_mz); tr.lookAt(end); tr.scale.set(1,1,_lg); tr.userData.v=0.075; tr.visible=true; tr.material.opacity=0.9; } }
  if(tiroAmmo<=0) tiroReload();
  tiroHUD();
}
function tiroImpactoBlanco(hit){
  const o=hit.object, u=o.userData;
  let pts=0, txt='', col='#fff';
  if(u.kind==='paper'){
    const uv=hit.uv||{x:0.5,y:0.5}; const rr=Math.hypot(uv.x-0.5,uv.y-0.5)*2;   // 0 centro · 1 borde
    pts = rr<0.085?10 : rr<0.20?9 : rr<0.33?8 : rr<0.48?7 : rr<0.66?6 : rr<0.85?5 : 3;
    const bono = u.dist>=40?3 : u.dist>=24?2 : 1;   // más lejos vale más
    pts*=bono; txt='+'+pts; col= rr<0.085?'#ff5f45' : rr<0.33?'#ffd9a0' : '#ffffff';
    const mk=tiroMark(); o.add(mk); mk.position.set((uv.x-0.5)*1.18,(uv.y-0.5)*1.18,0.004); mk.rotation.set(0,0,Math.random()*3.14); mk.visible=true;
    tiroSnd('papel');
  } else {
    pts=(u.r<0.17?10:6)+(u.mover?8:0);   // el móvil vale más
    u.down=true; u.t=0; txt='+'+pts+' ◉'; col='#8fd0ff'; tiroSnd('ping');
    const sp=tiroSpark(); sp.position.copy(hit.point); sp.userData.v=0.16; sp.visible=true; sp.scale.setScalar(1);
  }
  tiroScore+=pts; tiroHits++; if(tiroScore>tiroBest){ tiroBest=tiroScore; try{ localStorage.setItem('pf_tiro_best',tiroBest); }catch(e){} }
  tiroMsg(txt,col);
}

/* ===================== IK de dos huesos (hombro→codo→mano) sobre el rig del juego ===================== */
let bRArm=null,bRFore=null,bRHand=null,bLArm=null,bLFore=null,bLHand=null;
let bSp=null,bSp01=null,bSp02=null,bRSho=null,bLSho=null;
function tiroGrabBone(o){ const n=(o.name||'').toLowerCase().replace('mixamorig','');
  if(n==='rightarm')bRArm=o; else if(n==='rightforearm')bRFore=o; else if(n==='righthand')bRHand=o;
  else if(n==='leftarm')bLArm=o; else if(n==='leftforearm')bLFore=o; else if(n==='lefthand')bLHand=o;
  else if(n==='spine')bSp=o; else if(n==='spine01')bSp01=o; else if(n==='spine02')bSp02=o;
  else if(n==='rightshoulder')bRSho=o; else if(n==='leftshoulder')bLSho=o; }

/* ===================== MÁSCARA: la animación manda de la cintura para ABAJO =====================
   Los clips (idle/walk/run/jump/slide/wallrun/mantle/climb) mueven Hips y las piernas y nada más.
   De Spine para arriba manda el código: cada frame, DESPUÉS de bodyMixer.update() y ANTES de todo lo
   procedural, estos 15 huesos vuelven a su pose de BIND, y desde ahí se compone la postura de fusil
   (pitch repartido en la columna, bamboleo, IK de los dos brazos).
   ¿Cuál es la POSE BASE? Medido en este GLB: ni la pose de enlace (skeleton.boneInverses) ni la pose de
   reposo de los nodos sirven — con cualquiera de las dos el torso se dobla y la cabeza cae de 1,76 m a
   0,86 m (o sea, este rig no está modelado de pie en reposo). La que sí sirve es el PRIMER FOTOGRAMA DEL
   CLIP 'idle': un personaje de pie, derecho, mirando al frente. Se lee del propio AnimationClip, así que
   no depende de en qué momento corra el mixer.
   Se restauran quaternion, posición Y escala: el mixer pisa las tres. */
const MSK_NOMBRES=['spine','spine01','spine02','neck','head','head_end','headfront',
  'leftshoulder','leftarm','leftforearm','lefthand',
  'rightshoulder','rightarm','rightforearm','righthand'];
let mskBind=null, mskHips=null;
function mskCapturar(raiz,clips){  // raiz = el rig LOCAL del jugador (nunca mpBodySrc ni un avatar remoto)
  if(mskBind||!raiz)return 0;
  const porNom=new Map(), lst=[]; let hips=null;
  raiz.traverse(o=>{               // pre-orden: padres antes que hijos
    if(!o.isBone)return;
    const n=(o.name||'').toLowerCase().replace('mixamorig','');
    const enMask=MSK_NOMBRES.indexOf(n)>=0, esHips=(n==='hips');
    if(!enMask&&!esHips)return;
    if(!(o.quaternion.lengthSq()>0.9))return;   // pose inválida → afuera (si no, NaN silencioso más tarde)
    const r={h:o,q:o.quaternion.clone(),p:o.position.clone(),e:o.scale.clone()};
    porNom.set(o.name,r);
    if(enMask) lst.push(r); else hips=r;   // la cadera NO se restaura: es de las piernas
  });
  mskHips=hips;
  const cl=(clips||[]).filter(c=>/^idle$/i.test(c.name||''))[0];
  if(cl) for(const tr of cl.tracks){              // primer fotograma del idle = la pose base de fusil
    const i=(tr.name||'').lastIndexOf('.'); if(i<0)continue;
    const r=porNom.get(tr.name.slice(0,i)); if(!r)continue;
    const prop=tr.name.slice(i+1), v=tr.values;
    if(prop==='quaternion'&&v.length>=4){ const q=new THREE.Quaternion(v[0],v[1],v[2],v[3]); if(q.lengthSq()>0.9) r.q.copy(q); }
    else if(prop==='position'&&v.length>=3&&isFinite(v[0])) r.p.set(v[0],v[1],v[2]);
    else if(prop==='scale'&&v.length>=3&&v[0]>1e-4) r.e.set(v[0],v[1],v[2]);
  }
  if(lst.length) mskBind=lst;      // se esperan 15 (__tiro.est().mask lo dice)
  return lst.length;
}
function mskAplicar(){ if(!mskBind)return;
  for(let i=0;i<mskBind.length;i++){ const r=mskBind[i];
    r.h.quaternion.copy(r.q); r.h.position.copy(r.p); r.h.scale.copy(r.e); } }
/* TORSO EN ESPACIO MUNDO. De la cintura para arriba manda el código: para cada vértebra se COMPONE la
   orientación MUNDIAL deseada y recién ahí se convierte a local. La cadera sigue 100% animada (las piernas
   la necesitan y la deslizada tiene que bajar de verdad), pero el tronco sólo hereda la FRACCIÓN de su
   vuelco que uno elija.

   OJO CON EL ORDEN DE LA CADENA (medido en este GLB, NO es el que sugieren los nombres):
       Hips → Spine02 → Spine01 → Spine → neck → Head       ({Left,Right}Shoulder cuelgan de 'Spine')
   O sea 'Spine02' es la LUMBAR (hija de Hips) y 'Spine' es el PECHO. La versión anterior escribía
   spineLocal = inv(caderaAhora)·caderaBase·spineBase sobre 'Spine', cuyo padre es 'Spine01' y no 'Hips':
   la fórmula estaba en el marco equivocado además de topeada, así que no compensaba nada (corriendo
   quedaban 58° de vuelco de tronco y al deslizarse la cabeza se iba 0,20 m del otro lado del pecho).

   Fórmula, por vértebra i:
       qDev  = qCaderaAhora · inv(qCaderaBase)                      (desvío de la pelvis, marco del padre)
       qW[i] = qW(padreDeHips) · slerp(I,qDev,k[i]) · (qCaderaBase·qSpine02Base·…·qBase[i])
       local = inv(qW(padre real de i)) · qW[i]
   El marco del padre de Hips ya trae bodyRoot.rotation.y = faceYaw+π, así que encarar la mira sale gratis.
   k[] es ACUMULATIVO en mundo: el doblez de cada articulación es la diferencia (1−k₁),(k₁−k₂),(k₂−k₃).
   Con el pico medido de desvío de pelvis (64° corriendo) k=[0.40,0.22,0.10] reparte −38°/−12°/−8° y deja
   el pecho a 6° del mundo. Con k=0 el corte entero cae en una sola articulación (no hay huesos de cintura
   para repartirlo) y se pierde el bamboleo; con k>0.55 el pecho se lleva los hombros y el error de la mano
   izquierda se triplica. */
const TORSO_ORD=['spine02','spine01','spine'];   // lumbar → media → pecho (el orden REAL de la cadena)
const TORSO_K=[0.40,0.22,0.10];
let torsoR=null;
function torsoInit(){ if(torsoR||!mskBind)return;
  const f=n=>mskBind.filter(r=>(r.h.name||'').toLowerCase().replace('mixamorig','')===n)[0]||null;
  torsoR=TORSO_ORD.map(f); }
const _tP=new THREE.Quaternion(),_tD=new THREE.Quaternion(),_tC=new THREE.Quaternion(),
      _tK=new THREE.Quaternion(),_tW=new THREE.Quaternion(),_tI=new THREE.Quaternion();
function mskTorsoMundo(){
  torsoInit(); if(!torsoR||!torsoR[0]||!mskHips||!mskHips.h.parent)return;
  mskHips.h.parent.getWorldQuaternion(_tP);                                  // 'Armature': trae faceYaw
  _tD.copy(mskHips.h.quaternion).multiply(_tI.copy(mskHips.q).invert());     // desvío de la cadera
  _tC.copy(mskHips.q);                                                       // cadena base acumulada
  for(let i=0;i<3;i++){ const r=torsoR[i]; if(!r)continue;
    _tC.multiply(r.q);
    _tK.set(0,0,0,1).slerp(_tD,TORSO_K[i]);          // fracción del vuelco de pelvis que se deja pasar
    _tW.copy(_tP).multiply(_tK).multiply(_tC);       // ORIENTACIÓN MUNDIAL DESEADA de esta vértebra
    // getWorldQuaternion() hace updateWorldMatrix(true,false): recompone la matriz local del padre desde
    // el quaternion recién escrito, así que el hijo ya ve al padre corregido sin updateMatrixWorld(true).
    r.h.parent.getWorldQuaternion(_tI); _tI.invert();
    r.h.quaternion.copy(_tI).multiply(_tW); }
}
const _ikA=new THREE.Vector3(),_ikB=new THREE.Vector3(),_ikC=new THREE.Vector3(),_ikT=new THREE.Vector3(),
      _ikD=new THREE.Vector3(),_ikN=new THREE.Vector3(),_ikP=new THREE.Vector3(),_ikU=new THREE.Vector3(),
      _qa=new THREE.Quaternion(),_qb=new THREE.Quaternion(),_qc=new THREE.Quaternion(),_qd=new THREE.Quaternion();
// maxAng limita cuánto puede APARTARSE el hueso de la animación. Sin esto, en poses extremas (deslizada) el IK
// rotaba el brazo ~180° respecto al hombro y los vértices compartidos del deltoides se estiraban en láminas
// que cruzaban toda la pantalla. Limitar el ángulo = bajar el peso del slerp.
function _aimBone(bone,qWorldNuevo,w,maxAng){ bone.parent.getWorldQuaternion(_qc); _qc.invert(); _qd.copy(_qc).multiply(qWorldNuevo);
  if(maxAng){ const d=Math.min(1,Math.abs(bone.quaternion.dot(_qd))), ang=2*Math.acos(d);
    if(ang>maxAng) w=Math.min(w,maxAng/ang); }
  bone.quaternion.slerp(_qd,w); bone.updateMatrixWorld(true); }
let TIRO_IKMAX=1.65;
function ikTwoBone(up,low,end,target,pole,w){
  if(!up||!low||!end)return;
  up.getWorldPosition(_ikA); _ikD.subVectors(target,_ikA);
  if(_ikD.dot(_cf)<0.02) return;   // objetivo detrás del hombro → mejor dejar la animación que invertir el codo
  up.getWorldPosition(_ikA); low.getWorldPosition(_ikB); end.getWorldPosition(_ikC);
  const L1=_ikA.distanceTo(_ikB), L2=_ikB.distanceTo(_ikC); if(L1<1e-4||L2<1e-4)return;
  _ikT.copy(target); _ikD.subVectors(_ikT,_ikA); let d=_ikD.length(); if(d<1e-4)return;
  const dmax=(L1+L2)*0.975, dmin=Math.max(Math.abs(L1-L2)+0.03,(L1+L2)*0.34);   // ni brazo estirado ni codo plegado del todo
  if(d>dmax){ _ikD.multiplyScalar(dmax/d); d=dmax; _ikT.copy(_ikA).add(_ikD); }
  else if(d<dmin){ _ikD.multiplyScalar(dmin/d); d=dmin; _ikT.copy(_ikA).add(_ikD); }
  _ikD.normalize();
  _ikP.subVectors(pole,_ikA); _ikN.crossVectors(_ikD,_ikP);
  if(_ikN.lengthSq()<1e-8){ _ikN.set(0,1,0).cross(_ikD); if(_ikN.lengthSq()<1e-8)_ikN.set(1,0,0); }
  _ikN.normalize();
  const ca=Math.acos(Math.max(-1,Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d))));
  _ikU.copy(_ikD).applyAxisAngle(_ikN,ca);                       // dirección deseada del hueso de arriba (codo hacia el "pole")
  _ikP.subVectors(_ikB,_ikA).normalize();                        // dirección actual
  _qa.setFromUnitVectors(_ikP,_ikU); up.getWorldQuaternion(_qb); _qb.premultiply(_qa);
  // El tope existía porque en la deslizada vieja el torso quedaba acostado y el IK giraba el brazo ~180°
  // respecto al hombro: la piel del deltoides se estiraba en láminas por toda la pantalla. Ahora la máscara
  // devuelve el brazo a la pose de idle TODOS los frames, así que la desviación se mide contra una pose
  // conocida y razonable, y 83° se quedaban cortos: el brazo izquierdo tiene que salir de "colgando" a
  // "cruzado adelante", más de 90°, y el recorte del slerp lo dejaba a 7 cm del guardamanos al esprintar.
  _aimBone(up,_qb,w);    // sin tope: el tope existía para que no se estirara la piel, y ya no hay piel
  low.getWorldPosition(_ikB); end.getWorldPosition(_ikC);        // el antebrazo apunta la mano al objetivo
  _ikP.subVectors(_ikC,_ikB).normalize(); _ikU.subVectors(_ikT,_ikB).normalize();
  _qa.setFromUnitVectors(_ikP,_ikU); low.getWorldQuaternion(_qb); _qb.premultiply(_qa);
  _aimBone(low,_qb,w);
}
// La mano no tiene hijos, así que su eje +Y local es el de los dedos (viene heredado de la cadena del brazo).
// En vez de adivinar Eulers, se APUNTA ese eje a una dirección del mundo: los dedos abrazan el arma en serio.
const _qw=new THREE.Quaternion();
const TIRO_MUN_MAX=0.95;   // tope de corrección de muñeca (rad). Sin tope, la mano se deforma en púas
function apuntarMano(bone,dir,w){ if(!bone)return;
  bone.getWorldQuaternion(_qb); _ikU.set(0,1,0).applyQuaternion(_qb);
  const c=Math.max(-1,Math.min(1,_ikU.dot(dir))), ang=Math.acos(c);
  if(ang<1e-4)return;
  _ikN.crossVectors(_ikU,dir); if(_ikN.lengthSq()<1e-9)return; _ikN.normalize();
  _qa.setFromAxisAngle(_ikN, Math.min(ang,TIRO_MUN_MAX));
  _qb.premultiply(_qa); _aimBone(bone,_qb,w); }
function torcerMano(bone,rad,w){ if(!bone||!rad)return; _ikU.set(0,1,0).applyQuaternion(bone.getWorldQuaternion(_qb));
  _qw.setFromAxisAngle(_ikU,rad); _qb.premultiply(_qw); _aimBone(bone,_qb,w); }   // giro de muñeca sobre el eje de los dedos
const TIRO_DEDOS_R=new THREE.Vector3(), TIRO_DEDOS_L=new THREE.Vector3();
const _ejeR=new THREE.Vector3(), _ejeL=new THREE.Vector3(), _m4=new THREE.Matrix4();
/* Alinea el puño: X local = eje del agarre, Z local ≈ referencia (queda perpendicular). Con piezas rígidas
   se puede clavar la orientación exacta sin miedo: no hay piel que se estire. */
function cuOrientarMano(bone,ejeX,ref,w){ if(!bone)return;
  _ikU.copy(ejeX).normalize();
  _ikN.copy(ref).projectOnPlane(_ikU);
  if(_ikN.lengthSq()<1e-6) _ikN.set(0,1,0).projectOnPlane(_ikU);
  _ikN.normalize(); _ikP.crossVectors(_ikN,_ikU).normalize();
  _m4.makeBasis(_ikU,_ikP,_ikN); _qa.setFromRotationMatrix(_m4);
  _aimBone(bone,_qa,w); }
// MEDIDOS, no adivinados (barrido de 16 ángulos con __tiro.palma(): para cada giro se proyecta el eje que
// va de la muñeca al arma sobre los ejes locales X/Z de la mano y se busca el máximo).
//  IZQUIERDA: el −Z local apunta al arma con |dot|=0.997 en −0.39 → la palma queda contra el guardamanos.
//  DERECHA:   ningún eje pasa de |dot|=0.34 (desde la muñeca, el arma cae casi SOBRE el eje de los dedos),
//             así que el giro está poco determinado; 0.59 es el máximo del eje Z, que es el que más manda.
let TIRO_TORS_R=0.59, TIRO_TORS_L=-0.39;

/* ===================== POSTURA: el personaje AGARRA el arma (torso procedural sobre piernas reales) =====================
   Referencia (Dev_Unallocated · CryEngine · NeoFPS): el arma NO se pega a la mano — va a un "item bone", un socket
   que se anima y al que se le suman offsets, y las MANOS lo siguen por IK. Acá el socket es el PECHO del personaje:
   la posición sale del hueso Spine02 (o sea, de la animación real: sube, baja, se tuerce, se acuesta al deslizarse)
   y la orientación sale del eje de puntería + offsets procedurales (bob, respiración, retraso del caño, retroceso).
   Resultado: las piernas y el cuerpo son animación de verdad, y de la cintura para arriba el fusil está AGARRADO. */
// G3. SPR_YAW era 0.20 rad = 11,5° de desvío del caño A LA IZQUIERDA con esprint pleno, o sea el PISO de
// los 13-33° reportados, metido a mano y antes de cualquier IK. 0.07 = 4,0°: se sigue leyendo como "el
// arma se cruza al correr" y el caño no se despega de la mira.
let SPR_YAW=0.07;
let paso=0, resp=0, tJit=0;                 // fases: zancada, respiración, micro-temblor
let lagY=0, lagP=0, vlagY=0, vlagP=0;       // retraso/adelanto del caño al girar (resorte)
let prevYaw=null, prevPit=0;
let aSpr=0, aSld=0, aAir=0, aRel=0;         // alphas de pose (esprint, deslizada, aire, recarga)
let landK=0, _eraAire=false, _vyAnt=0;
const _pecho=new THREE.Vector3(), _pechoS=new THREE.Vector3(), _vida=new THREE.Vector3(); let _pechoOk=false;
// ancla de ojo compartida (ver tiroPostura): altura de mundo del hueso de la cabeza, con limitador de velocidad
const OJO_H0_DEF=1.645, OJO_VMAX=4.0;   // m · m/s
let _ojoH0=null, _ojoOff=0, tiroOjoY=null;
const _qAim=new THREE.Quaternion(), _euAim=new THREE.Euler(0,0,0,'YXZ');
const _gA=new THREE.Vector3(), _gB=new THREE.Vector3(), _ojo=new THREE.Vector3(), _hR=new THREE.Vector3(), _hL=new THREE.Vector3();
const _vf=new THREE.Vector3(), _euVis=new THREE.Euler(0,0,0,'YXZ');
// profundidad de vista MÍNIMA de la muñeca derecha: el recorte de cuerpo (0.20) + 45 mm de margen.
const TIRO_PROF_MIN=0.245;
// ventana permitida del arma respecto al ojo, en el marco de puntería: [xmin,xmax, ymin,ymax, zmin,zmax]
// zmin sube a 0.32: el agarre izquierdo está 0.086 m adelante de gunRoot, así que con zmin=0.30 la mano
// quedaba a 0.195 m de la lente, JUSTO sobre el recorte de cuerpo de 0.20. ymax baja a −0.02 para no
// pelear con la ley de pitch (+0.062·pitch, hasta +0.081 m mirando al cielo).
const TIRO_VEN=[-0.08,0.34, -0.46,-0.02, 0.32,0.70];
// tope de cuánto puede correrse el arma para seguir a la mano derecha cuando el IK no llegó (ver abajo)
const GUN_CORREA=0.045;
// cuánto del bamboleo del pecho se le pasa al arma (1 = todo; 0 = arma muerta). Es sólo la DESVIACIÓN
// del pecho respecto a su promedio: la deriva de la animación no llega nunca al arma.
let TIRO_VIDA=0;
// offsets base del arma respecto al OJO, en el marco de puntería (derecha / arriba / adelante).
// Medido en el rig: así el fusil entra en cuadro abajo a la derecha y las manos quedan a 0,40-0,49 m
// de la lente, o sea bien por delante del recorte propio del arma (0,17 m) y del near plane (0,05).
// ENCUADRE, con la trigonometría explícita. PerspectiveCamera(90,…) → el FOV es VERTICAL: semiángulo
// vertical 45° en TODA relación de aspecto (por eso el celular apaisado no cambiaba nada: sólo ensancha).
// Para un punto (x,y,z) del marco de cámara, con d=−z: ndc.y = y/d y ndc.x = x/(d·aspect); está en cuadro
// si atan(|y|/d) < 45°. Y el recorte de cuerpo NO es radial: el shader hace vProf=−mvPosition.z y descarta
// con vProf<0.20, o sea la condición es sobre la PROFUNDIDAD DE VISTA, no sobre distanceTo(camera).
// Con los valores viejos (0.170,−0.215,0.335) la muñeca derecha quedaba a d=0.196 (POR DEBAJO del recorte)
// y a 54,2° del eje: 9,2° fuera de cuadro por abajo, o sea proyectando fuera de la pantalla.
// Ahora: muñeca derecha a d≈0.26 / 30° y muñeca izquierda a d≈0.39 / 28°, con ~15° de margen contra los 45.
//  z=0.420: el barrido satura en 0.44 (más allá, _limitarArma tira el arma hacia atrás y no gana nada).
//  y=−0.115: por arriba de −0.105 la mira réflex se sube al centro y tapa la cruceta; por debajo de −0.130
//            la mano vuelve a caerse del cuadro. No salir de esa banda.
//  x=0.110 (era 0.170): aleja el fusil del borde derecho (ndc.x 0.45→0.25) y de paso libera presupuesto de
//            alcance para el brazo izquierdo, que tiene que cruzar 0.183+x.
//  x=0.080 (era 0.110): con el agarre izquierdo en el magwell la cadena da 0.489 m contra 0.513 de
//            alcance útil (24 mm de sobra para el bamboleo). Con 0.110 sobran 9 mm: cierra, pero al filo.
const GUN_OJO=new THREE.Vector3(0.115,-0.175,0.460);   // más abajo: con el puño envolviendo, a -0,13 la mano quedaba en el centro del cuadro
function _spineAdd(b,rx,ry,rz,w){ if(!b)return; _euAim.set(rx*w,ry*w,rz*w,'XYZ'); _qw.setFromEuler(_euAim);
  b.quaternion.multiply(_qw); }   // aditivo sobre la pose de BIND (la máscara ya sacó la animación de acá)
// alcance de cada brazo (constante: son huesos). Se mide una vez.
let _alcR=0,_alcL=0;
function _alcance(a,f,h){ const A=new THREE.Vector3(),B=new THREE.Vector3(),C=new THREE.Vector3();
  a.getWorldPosition(A); f.getWorldPosition(B); h.getWorldPosition(C); return A.distanceTo(B)+B.distanceTo(C); }
/* El arma se mueve para que las MANOS siempre lleguen bien: los targets tienen que quedar ADELANTE de los hombros
   (si quedan atrás, el codo se invierte y la piel del brazo se estira en láminas por toda la pantalla) y DENTRO del
   alcance (si no, el brazo se estira y la mano se deforma). Tres iteraciones alcanzan. */
// 0.95 y no 0.92: el ikTwoBone ya tope la extensión en 0.975, así que el codo nunca se estira del todo, y
// los 3 cm de diferencia son justo los que le faltaban a la mano de apoyo para no arrastrar el arma dentro
// del recorte apuntando al cielo (muñeca izquierda 0.235 → 0.26 m de profundidad a pitch 1.3).
const ALC_K=0.95;
function _limitarArma(){
  if(!_alcR){ _alcR=_alcance(bRArm,bRFore,bRHand); _alcL=_alcance(bLArm,bLFore,bLHand); }
  for(let it=0;it<3;it++){
    let mov=false;
    // 1) adelante de los hombros
    bRArm.getWorldPosition(_gA); _gp.copy(GUN_GRIP_R).applyMatrix4(gunRoot.matrixWorld);
    let f=_gB.subVectors(_gp,_gA).dot(_cf);
    if(f<0.14){ gunRoot.position.addScaledVector(_cf,0.14-f); gunRoot.updateMatrixWorld(true); mov=true; }
    bLArm.getWorldPosition(_gA); _gp2.copy(_gL).applyMatrix4(gunRoot.matrixWorld);
    f=_gB.subVectors(_gp2,_gA).dot(_cf);
    if(f<0.14){ gunRoot.position.addScaledVector(_cf,0.14-f); gunRoot.updateMatrixWorld(true); mov=true; }
    // 2) dentro del alcance (se acerca el ARMA, nunca se estira el brazo)
    bRArm.getWorldPosition(_gA); _gp.copy(GUN_GRIP_R).applyMatrix4(gunRoot.matrixWorld);
    let d=_gA.distanceTo(_gp), al=_alcR*ALC_K;
    if(d>al){ _gB.subVectors(_gp,_gA).normalize().multiplyScalar(-(d-al)); gunRoot.position.add(_gB); gunRoot.updateMatrixWorld(true); mov=true; }
    bLArm.getWorldPosition(_gA); _gp2.copy(_gL).applyMatrix4(gunRoot.matrixWorld);
    d=_gA.distanceTo(_gp2); al=_alcL*ALC_K;
    if(d>al){ _gB.subVectors(_gp2,_gA).normalize().multiplyScalar(-(d-al)); gunRoot.position.add(_gB); gunRoot.updateMatrixWorld(true); mov=true; }
    if(!mov)break;
  }
}
const DBG={ik:1,col:1,mun:1,arma:1};   // interruptores para aislar (consola: __tiro.dbg({ik:0}))
function tiroPostura(dt){
  tiroOjoY=null;   // si esta función no llega a calcularlo, la cámara vuelve a leer el hueso directamente
  if(!bodyRoot||!gunRoot||!bRArm||!bSp02) return;
  prepararCuerpo();   // recortes del cuerpo (una sola vez, cuando el GLB ya está)
  mskAplicar();       // ← acá muere la animación de la cintura para arriba: de este punto en adelante manda el código
  mskTorsoMundo();    // y el tronco se COMPONE en mundo: hereda sólo TORSO_K de lo que hace la cadera
  // la cabeza sólo vuelve en 3ª persona; en 1ª persona SIEMPRE se recorta (la cámara está adentro de la cabeza)
  // 1ª persona: se ocultan las piezas que sólo tapan la lente (cabeza, cuello, pecho). Con el cuerpo hecho de
  // piezas sueltas esto es una línea; con el modelo skinned hacía falta descartar por peso en el fragment shader.
  { const enTP=(camView==='tp'||player.camTP>0.30);
    if(cuCabezaG&&cuCabezaG.visible!==enTP) cuCabezaG.visible=enTP;
    if(cuSoloTP.length&&cuSoloTP[0].visible!==enTP) for(const m of cuSoloTP) m.visible=enTP; }
  const spd=Math.hypot(player.vel.x,player.vel.z), sn=Math.min(1,spd/RUN);
  const mov=sn, quieto=Math.max(0,1-spd/1.2);      // función de activación (0..1) como en la referencia
  // ---- fases ----
  paso += dt*(4.4+8.6*sn)*(player.onGround?1:0.22);
  resp += dt*1.22; tJit += dt;
  // ---- alphas de pose ----
  const wSpr=(player.onGround && spd>RUN*0.70 && !player.sliding)?1:0;
  aSpr+=(wSpr-aSpr)*Math.min(1,7*dt);
  // asimétrico a propósito: la ENTRADA tiene que ser rápida (el cuerpo ya se está yendo) y la SALIDA lenta
  // (14/s = 63% en 4 frames; 5/s = 63% en 0,2 s). El tirón que se veía estaba en la salida.
  aSld+=((player.sliding?1:0)-aSld)*Math.min(1,(player.sliding?14:5)*dt);
  const sSld=aSld*aSld*(3-2*aSld);   // smoothstep: mitad de golpe en los 4 frames donde estaban los artefactos
  aAir+=((player.onGround?0:1)-aAir)*Math.min(1,6*dt);
  aRel+=(((tiroRel>0)?1:0)-aRel)*Math.min(1,8*dt);
  // ---- impulso de aterrizaje (la referencia lo mete por el mismo camino que el retroceso) ----
  if(player.onGround && _eraAire && _vyAnt<-5.5) landK=Math.min(0.085, -_vyAnt*0.0058);
  _eraAire=!player.onGround; _vyAnt=player.vy;
  landK*=Math.max(0,1-7*dt);
  // ---- retraso del caño: el giro inyecta velocidad a un resorte; primero atrasa, después ADELANTA ----
  if(prevYaw===null){ prevYaw=player.yaw; prevPit=player.pitch; }
  let dY=player.yaw-prevYaw; dY=Math.atan2(Math.sin(dY),Math.cos(dY)); prevYaw=player.yaw;
  const dP=player.pitch-prevPit; prevPit=player.pitch;
  const K=150, C=17.5;
  vlagY += (-lagY*K - vlagY*C)*dt + dY*30.0; lagY += vlagY*dt; lagY=Math.max(-0.20,Math.min(0.20,lagY));
  vlagP += (-lagP*K - vlagP*C)*dt + dP*24.0; lagP += vlagP*dt; lagP=Math.max(-0.16,Math.min(0.16,lagP));
  // ---- POSE BASE DE FUSIL: se COMPONE sobre el bind (la animación ya no está acá arriba) ----
  // Antes había que MEDIR la línea de hombros para deshacer la torsión del clip de correr. Ya no: con la
  // máscara, la columna arranca en bind, y bodyRoot.rotation.y = faceYaw, o sea que los hombros ya encaran
  // la puntería por construcción. Queda sólo lo que hay que AGREGAR: pitch repartido, pose y respiración.
  const pit=player.pitch;
  if(DBG.col){
    // 1) el torso acompaña el pitch de puntería, repartido en tres vértebras (nadie apunta al cielo sólo con
    //    los brazos). El reparto va de MENOS abajo a MÁS arriba: bSp02 es la LUMBAR y bSp el PECHO (ver
    //    mskTorsoMundo). Antes estaba al revés y la curva de la columna salía invertida.
    _spineAdd(bSp02,-pit*0.13,0,0, 1); _spineAdd(bSp01,-pit*0.17,0,0, 1); _spineAdd(bSp,  -pit*0.19,0,0, 1);
    // 2) pose: al esprintar el tronco se va adelante; al deslizarse se va para ATRÁS (te reclinás), que es
    //    lo contrario de lo que hacía el signo viejo. −0,22 rad repartido = 12,6° de reclinada.
    const inc=aSpr*0.10 - sSld*0.14, rol=sSld*0.08*(player.slideRight?-1:1);
    _spineAdd(bSp02, inc*0.30,0,rol*0.30, 1); _spineAdd(bSp01, inc*0.30,0,rol*0.30, 1); _spineAdd(bSp, inc*0.40,0,rol*0.40, 1);
    // 3) respiración del pecho cuando estás quieto (activación: cuanto más quieto, más se nota)
    _spineAdd(bSp02, Math.sin(resp)*0.022*quieto, 0, 0, 1);
    // 4) hombros hacia el arma: el derecho baja al fusil, el izquierdo cruza al guardamanos
    _spineAdd(bRSho, 0,0,-0.10, 1); _spineAdd(bLSho, 0,0, 0.16, 1);
  }
  bodyRoot.updateMatrixWorld(true);
  // ---- ancla: el OJO, con la VIDA del pecho animado sumada aparte ----
  // Antes el arma colgaba del hueso Spine02 y heredaba TODO lo que hiciera la animación; cuando el clip
  // acostaba el pecho (deslizada) o lo torcía (correr, wallrun espejado) el fusil se iba de cuadro o
  // aparecía de costado. Ahora el ancla es la vista, que es lo que hay que garantizar en 1ª persona, y del
  // pecho sólo se toma su DESVIACIÓN respecto a su propio promedio: el bamboleo entra, la deriva no.
  // …y el ancla se toma del PECHO real (bSp), no de la lumbar (bSp02) como antes. TIRO_VIDA arranca en 0:
  // con el torso procedural el bamboleo del pecho lo genera este mismo código (bob + respiración +
  // _spineAdd), así que reinyectarlo al arma era realimentación pura. Queda el mecanismo para calibrar
  // desde consola (__tiro.vida(v)), y durante la deslizada se desatura (el pecho cae 0,76 m en 0,5 s y el
  // promedio perseguidor quedaba 0,3 m atrás → _vida saturaba en el clamp los ~30 frames de la bajada).
  (bSp||bSp02).getWorldPosition(_pecho);
  if(!_pechoOk){ _pechoS.copy(_pecho); _pechoOk=true; }
  else _pechoS.lerp(_pecho, Math.min(1,(4+10*aSld)*dt));
  _vida.subVectors(_pecho,_pechoS).multiplyScalar(TIRO_VIDA*(1-0.85*aSld));
  _vida.set(Math.max(-0.05,Math.min(0.05,_vida.x)), Math.max(-0.05,Math.min(0.05,_vida.y)), Math.max(-0.05,Math.min(0.05,_vida.z)));
  // ---- orientación: puntería + offsets procedurales ----
  const bobY=Math.sin(paso*2.0)*0.019*mov, bobX=Math.sin(paso)*0.015*mov, bobZ=-Math.abs(Math.sin(paso))*0.011*mov;
  const respY=Math.sin(resp)*0.0065*quieto, respX=Math.sin(resp*0.63)*0.0042*quieto;
  const jit=Math.sin(tJit*11.3)*0.0016+Math.sin(tJit*7.1)*0.0021;   // temblor de músculo
  const latV=player.vel.x*Math.cos(player.yaw)-player.vel.z*Math.sin(player.yaw);   // velocidad lateral (para el alabeo)
  // OJO con los términos de deslizada: cuando el arma colgaba del pecho tenían que COMPENSAR que el clip
  // acostaba el torso, y eran grandes (0,52 / 0,26 / 0,34 rad). Con la máscara no hay nada que compensar:
  // si se dejan grandes, el fusil se para de costado y los brazos cruzan la lente. Ahora son sólo carácter.
  const TP_YAW=-0.55, TP_PIT=0.16;   // ver G8, abajo en pYaw
  const pPit = pit + lagP*0.85 + Math.sin(paso*2.0+0.7)*0.013*mov + jit + recUp*0.9 + landK*1.6
             + aSpr*0.05 + sSld*0.08 + aAir*0.10 - aRel*0.30 + player.camTP*TP_PIT;   // esprint 0.10→0.05: el caño apuntaba 5,7° arriba de la mira
  // G8 · EN 3ª PERSONA EL FUSIL SE CRUZA HACIA AFUERA. Con el arma alineada con la mira (que es lo correcto
  // en 1ª persona) la cámara de 3ª queda EXACTAMENTE detrás del eje del caño y el fusil proyecta 0,062 m de
  // ancho a 3,5 m contra un torso de 0,38 m a 3,0 m: se esconde entero. Medido con __tiro.esq(): arma en
  // ndc.x [0.013,0.031] y torso en [-0.064,0.061]. Y no lo arregla correr la cámara: por paralaje, para que
  // el borde izquierdo del arma pase el borde derecho del cuerpo hace falta L > 2,05 m (cámara casi al lado)
  // o subirla 0,64 m. Lo que SÍ lo arregla es lo que hace cualquier 3ª persona: el arma no se sostiene en la
  // línea de puntería, se lleva CRUZADA. 0.55 rad saca la boca a ndc.x +0.03 (píxel 619 contra el borde del
  // torso en 566): el fusil se ve entero, de punta a punta. Se aplica proporcional a camTP, así que en 1ª
  // persona vale exactamente 0 y no toca nada de lo verificado arriba.
  const pYaw = player.yaw - lagY*0.95 + jit*0.7 + aSpr*SPR_YAW + sSld*0.04 - aRel*0.22 + player.camTP*TP_YAW;
  // el alabeo de la deslizada va CON SIGNO: antes alabeaba siempre para el mismo lado sin importar hacia
  // dónde te deslizabas (player.slideRight ya se calcula en startSlide y había quedado sin uso).
  // el alabeo de esprint era 0.16 rad: como el arma pivota en el OJO y el agarre izquierdo está a 0,22 m
  // del eje, cada rad de alabeo corre ese agarre 0,22 m. Con 0.16 la mano izquierda perdía el arma 38 mm
  // en el peor frame de la zancada. 0.08 = la mitad, y sigue leyéndose como "el arma se cruza al correr".
  const pRol = -lagY*1.5 - latV*0.022 + Math.sin(paso)*0.020*mov + aSpr*0.08 + sSld*0.10*(player.slideRight?-1:1) + aRel*0.30;
  _euAim.set(pPit,pYaw,pRol,'YXZ'); _qAim.setFromEuler(_euAim);
  gunRoot.quaternion.copy(_qAim);
  _cr.set(1,0,0).applyQuaternion(_qAim); _cu.set(0,1,0).applyQuaternion(_qAim); _cf.set(0,0,-1).applyQuaternion(_qAim);
  // ---- posición: OJO + offsets en el marco de puntería + la vida del pecho ----
  // el ojo, con la MISMA fórmula que usa la cámara más abajo (cabeza + CAM_FWD/CAM_UP - camLow)
  if(bodyHead) bodyHead.getWorldPosition(_ojo);
  else _ojo.set(player.pos.x, player.pos.y+EYE, player.pos.z);
  // ---- UN SOLO ANCLA DE OJO, compartida por la cámara y el arma ----
  // Lo que se filtra es el OFFSET DE POSE (altura del hueso de la cabeza respecto a la de parado); la
  // altura del jugador pasa CRUDA, si no el filtro se comería saltos y caídas. Un limitador de velocidad
  // (no un pasabajos) deja pasar el movimiento real —el bamboleo de carrera son 0,04 m, la bajada de la
  // deslizada 2,9 m/s— y corta sólo los saltos patológicos de un frame (el peor medido era 0,101 m = 3 m/s
  // a la salida de la deslizada). tickBody corre ANTES que la cámara en el mismo frame, así que arma y
  // vista nunca discrepan. _ojoH0 se auto-calibra con el personaje parado en el piso (medido 1,645 m).
  if(_ojoH0===null && bodyHead && player.onGround && !player.sliding && spd<0.5) _ojoH0=_ojo.y-player.pos.y;
  const _H0=(_ojoH0===null?OJO_H0_DEF:_ojoH0);
  const _obj=Math.max(-0.95,Math.min(0.12,_ojo.y-(player.pos.y+_H0))), _lim=OJO_VMAX*dt;
  _ojoOff+=Math.max(-_lim,Math.min(_lim,_obj-_ojoOff));
  tiroOjoY=player.pos.y+_H0+_ojoOff;   // ← la cámara de base.html lee ESTO, no el hueso
  _ojo.y=tiroOjoY;
  _ojo.x+=-Math.sin(player.yaw)*(CAM_FWD-player.camBack); _ojo.z+=-Math.cos(player.yaw)*(CAM_FWD-player.camBack);
  _ojo.y+=CAM_UP-player.camLow;
  // LEY DE PITCH, sólo hacia ARRIBA. Medido: pitch NEGATIVO es mirar abajo y ahí el arma MEJORA (d 0.32,
  // 27°); el que rompe es mirar arriba, porque a pitch 1.2 el hombro derecho se va a z=+0.204, o sea 20 cm
  // DETRÁS de la lente, y la columna se arquea encima. Subir el arma 0.062·pitch recupera medio cuadro
  // (ndc.y −2.03 → −1.51 en el barrido); tocar z lo empeoraba en las 12 combinaciones probadas.
  const pUp=Math.max(0,pit);
  // el agarre izquierdo se corre al cajón a medida que subís la puntería (ver GUN_GRIP_L_ALTO)
  _gL.lerpVectors(GUN_GRIP_L, GUN_GRIP_L_ALTO, Math.max(0,Math.min(1,(pit-0.15)/0.70)));
  gunRoot.position.copy(_ojo).add(_vida)
    // (probado y descartado: correr el arma a la derecha con el pitch. Cada cm hacia la derecha aleja el
    //  agarre del hombro IZQUIERDO, _limitarArma tira el fusil hacia atrás y la profundidad de la muñeca
    //  derecha cae de 0.265 a 0.217, o sea adentro del recorte. Medido con +0.100·pitch.)
    .addScaledVector(_cr, GUN_OJO.x + bobX + respX + aSpr*0.028 + sSld*0.035)
    // los −0.120 de la deslizada eran compensación pura de un torso caído (lo decía el comentario viejo:
    // "es lo que mantiene el brazo izquierdo por debajo de la lente"). Con el torso erguido y el ojo
    // bajando junto con los hombros, la geometría ojo→hombro es la misma que de pie: no hay nada que
    // compensar y queda sólo carácter, del mismo orden que el −0.030 del esprint. Asentarse, no esconderse.
    // esprint: −0.085 (era −0.030). El pitch de esprint gira el arma alrededor del OJO, así que cada rad
    // sube el agarre 0,43 m; con GUN_OJO.y en −0.115 la mano izquierda terminaba sobre la cruceta.
    .addScaledVector(_cu, GUN_OJO.y + bobY + respY + 0.062*pUp - landK*0.55 + aSpr*(-0.043) + sSld*(-0.030) - aRel*0.075)
    .addScaledVector(_cf, GUN_OJO.z + bobZ - recBack + aSpr*(-0.055) + sSld*(-0.030) - aRel*0.03);
  // ---- VENTANA DE SEGURIDAD respecto al OJO (red de seguridad, no la regla principal) ----
  // Con el ancla en el ojo esto normalmente no toca nada; queda para el caso raro en que algún offset
  // (retroceso + aterrizaje + vida del pecho a la vez) empuje el arma detrás del near plane o fuera de cuadro.
  _gB.subVectors(gunRoot.position,_ojo);
  const cx=_gB.dot(_cr), cy=_gB.dot(_cu), cz=_gB.dot(_cf);
  const nx=Math.max(TIRO_VEN[0],Math.min(TIRO_VEN[1],cx)), ny=Math.max(TIRO_VEN[2],Math.min(TIRO_VEN[3],cy)), nz=Math.max(TIRO_VEN[4],Math.min(TIRO_VEN[5],cz));
  if(nx!==cx||ny!==cy||nz!==cz) gunRoot.position.copy(_ojo).addScaledVector(_cr,nx).addScaledVector(_cu,ny).addScaledVector(_cf,nz);
  gunRoot.updateMatrixWorld(true);
  _limitarArma();
  // RED DE SEGURIDAD DE PROFUNDIDAD. _limitarArma acerca el ARMA al hombro cuando el brazo no llega, y en
  // dos casos medidos eso metía la muñeca DERECHA adentro del recorte de cuerpo: recargando (profundidad
  // 0.132 m) y en el aire (0.141 m), o sea la mano DESAPARECÍA (el shader la descarta con vProf<0.20) y
  // proyectaba a ndc.y 2.2, fuera de cuadro. Empujar el arma hacia adelante no estira ningún brazo:
  // ikTwoBone ya recorta la distancia a (L1+L2)·0.975 antes de resolver, así que cuando no llega se queda
  // CORTO, no se alarga. Entre "un brazo que no llega" y "una mano amputada", gana el primero.
  // El empuje va por la línea de VISTA real (player.yaw/pitch), no por el eje del arma: en la recarga el
  // arma está apuntada 0,30 rad abajo y empujar por su eje habría hundido más la mano.
  { _euVis.set(player.pitch,player.yaw,0,'YXZ'); _vf.set(0,0,-1).applyEuler(_euVis);
    _gp.copy(GUN_GRIP_R).applyMatrix4(gunRoot.matrixWorld);
    const _pf=_gB.subVectors(_gp,_ojo).dot(_vf);
    if(_pf<TIRO_PROF_MIN){ gunRoot.position.addScaledVector(_vf, Math.min(0.14, TIRO_PROF_MIN-_pf)); gunRoot.updateMatrixWorld(true); } }
  // ---- retroceso pivotando en la EMPUÑADURA (la referencia: el mango es el que frena el arma) ----
  if(recUp>0.0005){ _gB.copy(GUN_GRIP_R).applyMatrix4(gunRoot.matrixWorld);
    gunRoot.rotateX(recUp*0.55); gunRoot.updateMatrixWorld(true);
    _gA.copy(GUN_GRIP_R).applyMatrix4(gunRoot.matrixWorld);
    gunRoot.position.add(_gB.sub(_gA)); gunRoot.updateMatrixWorld(true); }
  gunRoot.visible = (world==='tiro') && !!DBG.arma;
  // ---- MANOS: IK de los dos brazos a la empuñadura y al guardamanos ----
  _gp.copy(GUN_GRIP_R).applyMatrix4(gunRoot.matrixWorld);
  _gp2.copy(_gL).applyMatrix4(gunRoot.matrixWorld);
  _pol.copy(_gp).addScaledVector(_cr,1.7).addScaledVector(_cu,-1.9).addScaledVector(_cf,-0.30);    // codo derecho: afuera y abajo
  _pol2.copy(_gp2).addScaledVector(_cr,-0.55).addScaledVector(_cu,-1.9).addScaledVector(_cf,-0.15); // codo izquierdo: abajo
  if(DBG.ik){ ikTwoBone(bRArm,bRFore,bRHand,_gp,_pol,1);
    ikTwoBone(bLArm,bLFore,bLHand,_gp2,_pol2,1); }
  // ---- el ARMA se acomoda a las MANOS: así queda agarrada SIEMPRE, incluso cuando el brazo no pudo llegar ----
  bRHand.getWorldPosition(_hR); bLHand.getWorldPosition(_hL);
  // …pero con CORREA CORTA. Esta línea era incondicional, y cuando el IK no llegaba (mirando muy arriba, o
  // esprintando con los hombros bamboleando) arrastraba el fusil entero adentro del ojo detrás de una mano
  // que había fracasado: es lo que ponía el arma diseñada a z=−0.42 en z=−0.18. El tope es ~medio ancho de
  // manopla: alcanza para que se vea agarrada y no alcanza para meter el arma detrás del recorte.
  _gp.copy(GUN_GRIP_R).applyMatrix4(gunRoot.matrixWorld);
  _gB.subVectors(_hR,_gp); { const _L=_gB.length(); if(_L>GUN_CORREA) _gB.multiplyScalar(GUN_CORREA/_L); }
  gunRoot.position.add(_gB); gunRoot.updateMatrixWorld(true);   // el mango va A la mano derecha
  // G3. Esto ANTES rotaba el fusil entero hasta 0.55 rad (31,5°) para "acomodarlo" a una mano izquierda
  // que muchas veces NO había llegado: 1 cm de error de esa mano = 3,81° de giro (brazo de palanca
  // |GRIP_R→GRIP_L| = 0.150 m), y 31,5° corren la boca 315 mm = ndc.x 0.20, o sea el fogonazo arriba a la
  // izquierda de la cruceta. Peor: se aplicaba con premultiply sobre gunRoot.quaternion, que pivota en la
  // RAÍZ, y eso despegaba el mango de la mano derecha 85 mm (GUN_CORREA sólo tapa 45). Tres arreglos:
  //   1) COMPUERTA: si la mano izquierda no llegó, no hay nada que acomodar (perseguir un fracaso).
  //   2) SÓLO ALABEO: se proyecta el eje de corrección sobre el eje del caño (_cf). El alabeo es el único
  //      grado de libertad que asienta el arma en las manos SIN mover el punto de impacto: 0° de desvío
  //      del caño por construcción.
  //   3) PIVOTE EN EL AGARRE, no en la raíz: GRIP_R queda invariante y no hace falta correa después.
  _gp2.copy(_gL).applyMatrix4(gunRoot.matrixWorld);
  if(_hL.distanceTo(_gp2)<0.020){
    _gA.subVectors(_gp2,_hR); _gB.subVectors(_hL,_hR);
    if(_gA.lengthSq()>1e-6 && _gB.lengthSq()>1e-6){ _gA.normalize(); _gB.normalize();
      const c=Math.max(-1,Math.min(1,_gA.dot(_gB))), ang=Math.acos(c);
      if(ang>1e-4){ _ikN.crossVectors(_gA,_gB);
        if(_ikN.lengthSq()>1e-9){ _ikN.normalize();
          const rol=Math.max(-0.25,Math.min(0.25, ang*_ikN.dot(_cf)));
          if(Math.abs(rol)>1e-4){ _qa.setFromAxisAngle(_cf,rol);
            _gp.copy(GUN_GRIP_R).applyMatrix4(gunRoot.matrixWorld);
            gunRoot.position.sub(_gp).applyQuaternion(_qa).add(_gp);
            gunRoot.quaternion.premultiply(_qa); gunRoot.updateMatrixWorld(true); } } } } }
  // EJE DE LOS DEDOS. La caja de la empuñadura está en (0,−0.105,0.115) con rotation.x=+0.30, así que su eje
  // arriba→abajo en local es (0,−0.955,−0.296), o sea −0.955·_cu + 0.296·_cf en mundo. El vector viejo
  // MANOS: con el cuerpo procedural el puño se construyó CENTRADO en el hueso y con el agujero a lo largo
  // de su eje X local (ver cuMano). Así que orientar la mano es alinear ese eje con el eje del agarre: el mango
  // (inclinado 0,30 rad) para la derecha y el guardamanos (eje Z del arma) para la izquierda. Sin dedos
  // articulados no hay cierre, pero el arma queda ADENTRO del puño, que es lo que se ve.
  if(DBG.mun){
    _ejeR.set(0,Math.cos(0.30),Math.sin(0.30)).applyQuaternion(gunRoot.quaternion);
    _ejeL.set(0,0,1).applyQuaternion(gunRoot.quaternion);
    cuOrientarMano(bRHand,_ejeR,_cf,1);
    cuOrientarMano(bLHand,_ejeL,_cu,1);
  }
  // ---- fogonazo y efectos cortos ----
  if(flashT>0){ gunFlash.visible=gunFlash2.visible=true;
    const es=0.72+Math.random()*0.7; gunFlash.scale.setScalar(es); gunFlash2.scale.setScalar(es*0.8); gunFlash.rotation.z=Math.random()*3.14;
    gunLight.intensity=26; flashT-=dt; if(flashT<0)flashT=0; }
  else if(gunFlash.visible){ gunFlash.visible=gunFlash2.visible=false; gunLight.intensity=0; }
  for(const tr of tiroTracers){ if(tr.userData.v>0){ tr.material.opacity=Math.max(0,tr.userData.v/0.075)*0.9; tr.userData.v-=dt;
    if(tr.userData.v<=0){ tr.visible=false; tr.userData.v=0; } } }
  for(const sp of tiroSparks){ if(sp.userData.v>0){ sp.material.opacity=Math.max(0,sp.userData.v/0.16); sp.scale.multiplyScalar(1+dt*7); sp.userData.v-=dt;
    if(sp.userData.v<=0){ sp.visible=false; sp.userData.v=0; } } }
  if(_msgT>0){ _msgT-=dt; if(_msgT<=0){ const el=document.getElementById('tiroMsg'); if(el)el.style.opacity='0'; } }
}
/* gatillo, recarga y patada de cámara: lo único que corre DESPUÉS de orientar la cámara */
function tickAim(dt){
  recBack+=(0-recBack)*Math.min(1,13*dt); recUp+=(0-recUp)*Math.min(1,11*dt);
  if(recCam>0.0001||Math.abs(recYaw)>0.0001){ camera.rotateX(-recCam); camera.rotateY(recYaw*0.6);
    recCam+=(0-recCam)*Math.min(1,9*dt); recYaw+=(0-recYaw)*Math.min(1,9*dt); }
  if(world!=='tiro'){ if(gunRoot)gunRoot.visible=false; return; }
  if(tiroRel>0){ tiroRel-=dt; if(tiroRel<=0){ tiroRel=0; tiroAmmo=TIRO_MAG; tiroSnd('mag2'); tiroHUD(); } }
  tiroCd-=dt; if(tiroFire && tiroCd<=0 && !paused && gameplayActive()) tiroShoot();
}
function tickTiro(dt){
  // aceros caídos: se levantan solos
  for(const o of tiroTargets){ const u=o.userData; if(u.kind!=='steel')continue;
    if(u.down){ u.t+=dt; const a=Math.min(1,u.t/0.18); u.piv.rotation.x=1.45*(a*a*(3-2*a));
      if(u.t>3.0){ u.down=false; u.t=0; } }
    else if(u.piv.rotation.x>0.001){ u.piv.rotation.x*=Math.max(0,1-6*dt); if(u.piv.rotation.x<0.002)u.piv.rotation.x=0; } }
  // blanco móvil
  for(const m of tiroMovers){ m.a+=dt*m.vel; m.g.position.x=Math.sin(m.a)*m.amp; }
  _boardT+=dt; if(_boardT>0.4){ _boardT=0; tiroDrawBoard(); }
}
function tiroVis(){ const on=(world==='tiro'&&!menuMode);
  if(tiroGroup.visible!==(world==='tiro'))tiroGroup.visible=(world==='tiro');
  const cs=(world!=='tiro'); if(sun.castShadow!==cs)sun.castShadow=cs;   // el techo tapa el sol: el shadow map acá sólo costaría fps (las sombras las pintan los blobs)
  if(document.body.classList.contains('tiro')!==on) document.body.classList.toggle('tiro',on);
  if(!on&&gunRoot&&gunRoot.visible)gunRoot.visible=false; }

/* ===================== SONIDO del arma (síntesis WebAudio: cero descargas) ===================== */
let TCTX=null,_nb=null,_rev=null,_revG=null;
function tctx(){ if(TCTX!==null)return TCTX; try{ TCTX=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ TCTX=false; } return TCTX; }
function nbuf(c){ if(_nb)return _nb; const n=(c.sampleRate*0.5)|0,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1); _nb=b; return b; }
function reverb(c){ if(_rev)return _revG; const n=(c.sampleRate*1.6)|0,b=c.createBuffer(2,n,c.sampleRate);
  for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); for(let i=0;i<n;i++){ const e=Math.pow(1-i/n,2.6); d[i]=(Math.random()*2-1)*e*0.55; } }
  _rev=c.createConvolver(); _rev.buffer=b; _revG=c.createGain(); _revG.gain.value=0.42; _revG.connect(_rev); _rev.connect(c.destination); return _revG; }
function tiroSnd(k){ const c=tctx(); if(!c||!AUD.on)return; if(c.state==='suspended'){ try{c.resume();}catch(e){} }
  const t0=c.currentTime, out=c.destination, wet=reverb(c);
  const noise=(dur,f0,f1,vol,hp)=>{ const s=c.createBufferSource(); s.buffer=nbuf(c); const lp=c.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(f0,t0); lp.frequency.exponentialRampToValueAtTime(Math.max(80,f1),t0+dur);
    const h=c.createBiquadFilter(); h.type='highpass'; h.frequency.value=hp||90; const g=c.createGain();
    g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol,t0+0.004); g.gain.exponentialRampToValueAtTime(0.0008,t0+dur);
    s.connect(h); h.connect(lp); lp.connect(g); g.connect(out); g.connect(wet); s.start(t0); s.stop(t0+dur+0.05); return g; };
  const tono=(f0,f1,dur,vol,tipo)=>{ const o=c.createOscillator(),g=c.createGain(); o.type=tipo||'sine';
    o.frequency.setValueAtTime(f0,t0); o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
    g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol,t0+0.006); g.gain.exponentialRampToValueAtTime(0.0006,t0+dur);
    o.connect(g); g.connect(out); g.connect(wet); o.start(t0); o.stop(t0+dur+0.02); };
  if(k==='shot'){ noise(0.26,6200,380,0.62,140); tono(165,44,0.15,0.42,'sine'); noise(0.05,9000,4000,0.22,2200); }
  else if(k==='ping'){ tono(1560,880,0.5,0.20,'triangle'); tono(2380,1500,0.34,0.11,'sine'); noise(0.06,7000,2000,0.10,900); }
  else if(k==='papel'){ noise(0.07,4200,700,0.16,300); }
  else if(k==='pared'){ noise(0.10,2600,300,0.20,180); tono(320,120,0.09,0.10,'square'); }
  else if(k==='dry'){ noise(0.035,5200,1400,0.16,700); }
  else if(k==='mag'){ noise(0.045,3200,700,0.20,300); }
  else if(k==='mag2'){ noise(0.05,3600,600,0.22,300); tono(240,120,0.05,0.10,'square'); }
}

/* ===================== controles del arma (móvil: botones · PC: mouse/teclado) =====================
   En PC el modelo de dos dedos no sirve para disparar: arrastrar para mirar y disparar serían el mismo gesto.
   Solución: si detecto teclado/mouse, WASD camina (escribe el mismo `joy` que el joystick) y el mouse mira con
   pointer lock, así el click izquierdo queda libre para el gatillo. En celular no cambia nada. */
// G2 · TOPE DE PITCH DEL CAMPO DE TIRO. Medido por captura: de -0.90 a +0.25 rad la malla está limpia;
// desde +0.28-0.30 las astillas de la mano izquierda se multiplican y a +0.60 la mano está destrozada.
// La causa es estructural (la pose que restaura mskAplicar tiene los brazos COLGANDO, así que el IK gasta
// 70-95° de desviación sólo en llegar a la posición de fusil, con pitch 0: no queda margen para el pitch)
// y no la arregla ninguna constante: se probó TIRO_IKMAX en 0.10…3.10 y la distancia del objetivo en
// 0.42/0.30/0.24, y toda configuración que hace que la mano LLEGUE rompe MÁS la malla.
// Además el agarre izquierdo (magwell) sólo se sostiene hasta +0.30 (palma a 12,5 mm; a +0.40 ya son 24).
// No cuesta juego: los blancos son papel a 10/25/45 m y acero a 15/29/34 m, todos en o bajo el horizonte.
// El tope es SÓLO del campo de tiro: el parkour sigue con 1.3 (necesita mirar cornisas).
const TIRO_PIT_MAX=1.30;   // rango completo: el tope de 0.25 era un parche por las púas del skinning
function pitMax(){ return (world==='tiro')?TIRO_PIT_MAX:1.3; }
let _pc=false;
const TCL={w:false,a:false,s:false,d:false};
function tiroJoyTeclas(){ let x=(TCL.d?1:0)-(TCL.a?1:0), y=(TCL.s?1:0)-(TCL.w?1:0);
  const l=Math.hypot(x,y); if(l>1){ x/=l; y/=l; }
  joy.x=x; joy.y=y; if(knob) knob.style.transform='translate('+(x*38)+'px,'+(y*38)+'px)'; }
function tiroWire(){ if(_tiroWired)return; _tiroWired=true;
  try{ tiroBest=parseInt(localStorage.getItem('pf_tiro_best')||'0',10)||0; }catch(e){}
  const bf=document.getElementById('bFire'), br=document.getElementById('bReload');
  const down=e=>{ if(editHUD)return; e.preventDefault(); e.stopPropagation(); audioStart(); tiroFire=true; };
  const up=e=>{ tiroFire=false; };
  if(bf){ bf.addEventListener('pointerdown',down); bf.addEventListener('pointerup',up); bf.addEventListener('pointercancel',up); bf.addEventListener('pointerleave',up); }
  if(br){ br.addEventListener('pointerdown',e=>{ if(editHUD)return; e.preventDefault(); e.stopPropagation(); tiroReload(); }); }
  addEventListener('pointerdown',e=>{ if(e.pointerType!=='mouse'||e.button!==0)return; if(world!=='tiro'||!gameplayActive())return; if(isBtn(e.target))return; audioStart(); tiroFire=true; },true);
  addEventListener('pointerup',e=>{ if(e.pointerType==='mouse')tiroFire=false; });
  addEventListener('blur',()=>{ tiroFire=false; });
  // teclado (PC): WASD camina en cualquier mundo, R recarga y espacio salta
  addEventListener('keydown',e=>{ if(e.ctrlKey||e.metaKey||e.altKey)return; _pc=true; if(!gameplayActive())return;
    const k=(e.key||'').toLowerCase(); let m=true;
    if(k==='w'||k==='arrowup')TCL.w=true; else if(k==='s'||k==='arrowdown')TCL.s=true;
    else if(k==='a'||k==='arrowleft')TCL.a=true; else if(k==='d'||k==='arrowright')TCL.d=true;
    else { m=false;
      if(k===' '){ jumpReq=true; }
      else if(k==='shift'){ startSlide(); }
      else if(k==='r'&&world==='tiro'){ tiroReload(); }
      else if(k==='f'&&world==='tiro'){ tiroFire=true; setTimeout(()=>{ tiroFire=false; },90); }
      else return; }
    e.preventDefault(); if(m)tiroJoyTeclas(); });
  addEventListener('keyup',e=>{ const k=(e.key||'').toLowerCase();
    if(k==='w'||k==='arrowup')TCL.w=false; else if(k==='s'||k==='arrowdown')TCL.s=false;
    else if(k==='a'||k==='arrowleft')TCL.a=false; else if(k==='d'||k==='arrowright')TCL.d=false; else return;
    tiroJoyTeclas(); });
  // mouse (PC): pointer lock para mirar → el click izquierdo queda libre para el gatillo
  const cv=renderer.domElement;
  cv.addEventListener('click',()=>{ if(!_pc||world!=='tiro'||!gameplayActive())return;
    if(!document.pointerLockElement && cv.requestPointerLock){ try{ cv.requestPointerLock(); }catch(e){} } });
  addEventListener('mousemove',e=>{ if(document.pointerLockElement!==cv)return;
    const lk=LOOK*sensMul*1.15; player.yaw-=(e.movementX||0)*lk;
    player.pitch=Math.max(-0.9,Math.min(pitMax(),player.pitch-(e.movementY||0)*lk)); });
  addEventListener('pointerdown',e=>{ if(e.pointerType==='mouse')_pc=true; },true);
}

/* ---- gancho de consola (para calibrar y para probar sin tocar el código) ---- */
try{ window.__tiro={
  ir:()=>enterTiro(), mundo:k=>startLevel(k), pos:(x,z,y)=>{ player.pos.set(x,(y==null?0:y),TIRO_GZ+z); player.vel.set(0,0,0); player.vy=0; player.onGround=true; },
  mira:(y,p)=>{ player.yaw=y; player.faceYaw=y; player.pitch=p||0; },
  tirar:()=>tiroShoot(), auto:v=>{ tiroFire=!!v; }, recargar:()=>tiroReload(),
  esc:v=>gunRoot.scale.setScalar(v), grip:(a,b,c,d,e,f)=>{ GUN_GRIP_R.set(a,b,c); GUN_GRIP_L.set(d,e,f); },
  tors:(a,b)=>{ TIRO_TORS_R=a; TIRO_TORS_L=b; }, ik:v=>{ TIRO_IKMAX=v; }, spryaw:v=>{ SPR_YAW=v; },
  gripAlto:(x,y,z)=>GUN_GRIP_L_ALTO.set(x,y,z), fogonazo:t=>{ flashT=(t==null?0.05:t); },
  // ¿este punto LOCAL del arma está adentro de un sólido, y a qué distancia de la superficie más cercana?
  // Devuelve mm LOCALES y mm de MUNDO (gunRoot.scale = GUN_ESC). Negativo = adentro. Lee la geometría REAL,
  // así que no se desincroniza si mañana se editan las cajas. Los planos del fogonazo y el CircleGeometry
  // del punto rojo NO son sólidos: quedan filtrados por tipo.
  solido:(x,y,z)=>{ if(!gunRoot)return null;
    gunRoot.updateMatrixWorld(true);
    const p=new THREE.Vector3(x,y,z), q=new THREE.Vector3(), inv=new THREE.Matrix4(), out=[];
    gunRoot.traverse(o=>{
      if(!o.isMesh||!o.geometry||!o.geometry.parameters)return;
      const t=o.geometry.type, P=o.geometry.parameters;
      if(t!=='BoxGeometry'&&t!=='CylinderGeometry')return;
      o.updateMatrix(); inv.copy(o.matrix).invert(); q.copy(p).applyMatrix4(inv);
      let d;
      if(t==='BoxGeometry'){
        const ax=Math.abs(q.x)-P.width/2, ay=Math.abs(q.y)-P.height/2, az=Math.abs(q.z)-P.depth/2;
        d=Math.hypot(Math.max(ax,0),Math.max(ay,0),Math.max(az,0))+Math.min(0,Math.max(ax,ay,az));
      }else{
        const r=Math.max(P.radiusTop,P.radiusBottom);
        const dr=Math.hypot(q.x,q.z)-r, dl=Math.abs(q.y)-P.height/2;
        d=Math.hypot(Math.max(dr,0),Math.max(dl,0))+Math.min(0,Math.max(dr,dl));
      }
      out.push({pieza:(t==='BoxGeometry'
          ? 'box '+P.width+'x'+P.height+'x'+P.depth+' @'+o.position.toArray().map(v=>+v.toFixed(3))
          : 'cyl r'+P.radiusTop+' h'+P.height+' @'+o.position.toArray().map(v=>+v.toFixed(3))),
        mmLoc:+(d*1000).toFixed(2), mmMun:+(d*1000*gunRoot.scale.x).toFixed(2)});
    });
    out.sort((a,b)=>a.mmLoc-b.mmLoc);
    return { dentro:out[0].mmLoc<0, pieza:out[0].pieza, mmLoc:out[0].mmLoc, mmMun:out[0].mmMun, top:out.slice(0,3) }; },
  // EL TEST DE VERDAD: no compara la mano con su OBJETIVO (eso es errDer/errIzq y por eso mentía),
  // compara la mano REAL con el ARMA REAL. También prueba la PALMA (muñeca + 0,045 m por TIRO_DEDOS_R/L).
  // VERDE = la palma toca el arma (adentro o a ≤15 mm) y la muñeca no está enterrada (>-25 mm).
  tocando:()=>{ if(!gunRoot||!bRHand||!bLHand)return null;
    bodyRoot.updateMatrixWorld(true); gunRoot.updateMatrixWorld(true);
    const inv=new THREE.Matrix4().copy(gunRoot.matrixWorld).invert(), W=new THREE.Vector3(), L=new THREE.Vector3();
    const f=(b,dedos)=>{ b.getWorldPosition(W); L.copy(W).applyMatrix4(inv);
      const mun=__tiro.solido(L.x,L.y,L.z);
      L.copy(W).addScaledVector(dedos,0.045).applyMatrix4(inv);
      const pal=__tiro.solido(L.x,L.y,L.z);
      return { munMM:mun.mmMun, munPieza:mun.pieza, palmaMM:pal.mmMun, palmaPieza:pal.pieza,
               ok:(pal.mmMun<=15)&&(mun.mmMun>-25) }; };
    return { der:f(bRHand,TIRO_DEDOS_R), izq:f(bLHand,TIRO_DEDOS_L) }; },
  // G4 · ¿la trazadora sale HACIA ADELANTE? Devuelve, por cada estela viva: su origen (debe ser la boca),
  // el punto FINAL de su geometría (origen + eje +Z · largo) y el ángulo entre ese eje y la dirección del
  // disparo. Antes la geometría vivía en -Z mientras lookAt() apuntaba el +Z al blanco: la estela salía
  // de la boca hacia atrás y el ángulo daba 180°.
  traza:()=>{ if(!gunRoot)return null; gunRoot.updateMatrixWorld(true);
    const boca=GUN_MUZZLE.clone().applyMatrix4(gunRoot.matrixWorld), qi=camera.quaternion.clone().invert();
    return tiroTracers.filter(t=>t.userData.v>0).map(t=>{ t.updateMatrixWorld(true);
      const ejeZ=new THREE.Vector3(0,0,1).applyQuaternion(t.getWorldQuaternion(new THREE.Quaternion()));
      const fin=t.position.clone().addScaledVector(ejeZ,t.scale.z);
      const dis=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
      return { largo:+t.scale.z.toFixed(2), dBoca:+t.position.distanceTo(boca).toFixed(4),
               gradosVsDisparo:+(Math.acos(Math.max(-1,Math.min(1,ejeZ.dot(dis))))*180/Math.PI).toFixed(2),
               finRelCam:fin.clone().sub(camera.position).applyQuaternion(qi).toArray().map(v=>+v.toFixed(2)) }; }); },
  // DESVÍO DEL CAÑO: ángulo (grados) entre el eje real del arma (GRIP_R→boca) y el forward de la CÁMARA,
  // descompuesto en la componente horizontal (yaw, + = a la derecha) y vertical, más el ndc de la boca.
  // Sirve para separar los tres aportes (yaw deliberado de esprint, retraso lagY, giro post-IK).
  desvio:()=>{ if(!gunRoot)return null; gunRoot.updateMatrixWorld(true);
    const A=GUN_GRIP_R.clone().applyMatrix4(gunRoot.matrixWorld), B=GUN_MUZZLE.clone().applyMatrix4(gunRoot.matrixWorld);
    const v=B.clone().sub(A).normalize(), qi=camera.quaternion.clone().invert();
    const l=v.clone().applyQuaternion(qi);            // en el marco de la cámara: -Z es adelante
    const nd=B.clone().sub(camera.position).applyQuaternion(qi);
    const d=-nd.z;
    const gf=new THREE.Vector3(0,0,-1).applyQuaternion(gunRoot.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(qi);
    return { ejeYaw:+(Math.atan2(gf.x,-gf.z)*180/Math.PI).toFixed(2), ejePit:+(Math.atan2(gf.y,-gf.z)*180/Math.PI).toFixed(2),
             grados:+(Math.acos(Math.max(-1,Math.min(1,-l.z)))*180/Math.PI).toFixed(2),
             yawGr:+(Math.atan2(l.x,-l.z)*180/Math.PI).toFixed(2),
             pitGr:+(Math.atan2(l.y,-l.z)*180/Math.PI).toFixed(2),
             bocaNdc:[+(nd.x/(d*camera.aspect)).toFixed(4), +(nd.y/d).toFixed(4)],
             spr:+aSpr.toFixed(3), lagY:+lagY.toFixed(4) }; },
  // ¿las manos llegan realmente a la empuñadura? (error en metros, medido después del IK)
  manos:()=>{ if(!bRHand||!gunRoot)return null; const A=new THREE.Vector3(),B=new THREE.Vector3();
    gunRoot.updateMatrixWorld(true); bRHand.getWorldPosition(A); B.copy(GUN_GRIP_R).applyMatrix4(gunRoot.matrixWorld);
    const eR=+A.distanceTo(B).toFixed(3); bLHand.getWorldPosition(A); B.copy(_gL).applyMatrix4(gunRoot.matrixWorld);
    const eL=+A.distanceTo(B).toFixed(3);
    bRHand.getWorldPosition(A); const dR=+A.distanceTo(camera.position).toFixed(3);
    bLHand.getWorldPosition(A); const dL=+A.distanceTo(camera.position).toFixed(3);
    return { errDer:eR, errIzq:eL, distCamDer:dR, distCamIzq:dL }; },
  aceros:()=>tiroTargets.filter(o=>o.userData.kind==='steel').map(o=>({z:+(o.getWorldPosition(new THREE.Vector3()).z-TIRO_GZ).toFixed(1), x:+o.getWorldPosition(new THREE.Vector3()).x.toFixed(1), caido:o.userData.down, rot:+o.userData.piv.rotation.x.toFixed(2)})),
  fx:()=>({flashT:+flashT.toFixed(3), flashVis:!!(gunFlash&&gunFlash.visible), luz:gunLight?gunLight.intensity:null,
    traz:tiroTracers.map(t=>+t.userData.v.toFixed(3)), chispas:tiroSparks.map(t=>+t.userData.v.toFixed(3)), marcas:tiroMarks.length}),
  brazo:()=>{ if(!bRArm)return null; const A=new THREE.Vector3(),B=new THREE.Vector3(),C=new THREE.Vector3(),E=new THREE.Vector3();
    bodyRoot.updateMatrixWorld(true); bRArm.getWorldPosition(A); bRFore.getWorldPosition(B); bRHand.getWorldPosition(C);
    E.copy(A).sub(camera.position).applyQuaternion(camera.quaternion.clone().invert());   // hombro en el marco de la cámara
    return { L1:+A.distanceTo(B).toFixed(3), L2:+B.distanceTo(C).toFixed(3), alcance:+(A.distanceTo(B)+B.distanceTo(C)).toFixed(3),
             hombroRelCam:E.toArray().map(v=>+v.toFixed(3)) }; },
  pecho:()=>{ if(!bSp02)return null; const P=new THREE.Vector3(); bodyRoot.updateMatrixWorld(true); bSp02.getWorldPosition(P);
    const E=P.clone().sub(camera.position).applyQuaternion(camera.quaternion.clone().invert());
    return { mundo:P.toArray().map(v=>+v.toFixed(3)), relCam:E.toArray().map(v=>+v.toFixed(3)) }; },
  esq:()=>{ const q=camera.quaternion.clone().invert(), P=new THREE.Vector3(), o={};
    bodyRoot.updateMatrixWorld(true);
    const g=(n,b)=>{ if(!b)return; b.getWorldPosition(P); o[n]=P.clone().sub(camera.position).applyQuaternion(q).toArray().map(v=>+v.toFixed(3)); };
    g('cabeza',bodyHead); g('pecho',bSp); g('lumbar',bSp02); g('homD',bRArm); g('homI',bLArm); g('manoD',bRHand); g('manoI',bLHand); g('cadera',bodyHips);
    o.arma=gunRoot.position.clone().sub(camera.position).applyQuaternion(q).toArray().map(v=>+v.toFixed(3));
    o.near=camera.near; return o; },
  nan:()=>{ const mal=[]; let n=0; bodyInner.traverse(o=>{ n++;
      const q=o.quaternion,pp=o.position,sc=o.scale;
      const bad=[q.x,q.y,q.z,q.w,pp.x,pp.y,pp.z,sc.x,sc.y,sc.z].some(v=>!isFinite(v));
      const qq=Math.abs(q.length()-1)>0.02;
      if(bad||qq) mal.push({n:o.name,nan:bad,qlen:+q.length().toFixed(4),sc:sc.toArray().map(v=>+v.toFixed(3))}); });
    return { nodos:n, escalaInner:bodyInner.scale.toArray().map(v=>+v.toFixed(3)), problemas:mal.slice(0,12) }; },
  huesos:()=>({ RArm:bRArm.quaternion.toArray().map(v=>+v.toFixed(3)), RFore:bRFore.quaternion.toArray().map(v=>+v.toFixed(3)),
    RHand:bRHand.quaternion.toArray().map(v=>+v.toFixed(3)), cabCut:(_cabCut?_cabCut[0].value:null), LArm:bLArm.quaternion.toArray().map(v=>+v.toFixed(3)),
    LFore:bLFore.quaternion.toArray().map(v=>+v.toFixed(3)), LHand:bLHand.quaternion.toArray().map(v=>+v.toFixed(3)),
    cabezaSc:bodyHead.scale.x }),
  pose:()=>({ paso:+paso.toFixed(2), spr:+aSpr.toFixed(2), sld:+aSld.toFixed(2), aire:+aAir.toFixed(2),
    lagY:+lagY.toFixed(4), lagP:+lagP.toFixed(4), land:+landK.toFixed(3), vida:TIRO_VIDA }),
  vida:v=>{ TIRO_VIDA=v; }, pecho2:(x,y,z)=>GUN_OJO.set(x,y,z), ojo2:(x,y,z)=>GUN_OJO.set(x,y,z), ven:(...a)=>{ for(let i=0;i<6;i++)TIRO_VEN[i]=a[i]; },
  // cuantos huesos quedaron enmascarados (esperado 15) y con que pose de bind arrancan
  mask:()=>({ n:mskBind?mskBind.length:0, huesos:(mskBind||[]).map(r=>r.h.name) }),
  torsoK:(a,b,c)=>{ TORSO_K[0]=a; TORSO_K[1]=b; TORSO_K[2]=c; },
  // marco de cámara de las dos muñecas + la punta de los dedos (para el criterio de encuadre)
  proy:()=>{ const q=camera.quaternion.clone().invert(), P=new THREE.Vector3(), W=new THREE.Vector3(), o={};
    bodyRoot.updateMatrixWorld(true);
    const g=(n,b,dir)=>{ if(!b)return; b.getWorldPosition(P); W.copy(P).addScaledVector(dir,0.085);
      o[n]=P.clone().sub(camera.position).applyQuaternion(q).toArray().map(v=>+v.toFixed(4));
      o[n+'_tip']=W.sub(camera.position).applyQuaternion(q).toArray().map(v=>+v.toFixed(4)); };
    g('D',bRHand,TIRO_DEDOS_R); g('I',bLHand,TIRO_DEDOS_L);
    o.arma=gunRoot.position.clone().sub(camera.position).applyQuaternion(q).toArray().map(v=>+v.toFixed(4));
    o.boca=GUN_MUZZLE.clone().applyMatrix4(gunRoot.matrixWorld).sub(camera.position).applyQuaternion(q).toArray().map(v=>+v.toFixed(4));
    o.aspect=+camera.aspect.toFixed(4); o.fov=camera.fov; return o; },
  // ejes locales de cada mano en mundo: sirve para saber cuál es la normal de la palma y calibrar TIRO_TORS
  palma:()=>{ const q=new THREE.Quaternion(), o={}; bodyRoot.updateMatrixWorld(true);
    for(const [n,b] of [['D',bRHand],['I',bLHand]]){ if(!b)continue; b.getWorldQuaternion(q);
      o[n]={ X:new THREE.Vector3(1,0,0).applyQuaternion(q).toArray().map(v=>+v.toFixed(3)),
             Y:new THREE.Vector3(0,1,0).applyQuaternion(q).toArray().map(v=>+v.toFixed(3)),
             Z:new THREE.Vector3(0,0,1).applyQuaternion(q).toArray().map(v=>+v.toFixed(3)) }; }
    return o; },
  // alturas de mundo (cadera / pies / cabeza): para la deslizada
  pies:()=>{ const P=new THREE.Vector3(), o={}; bodyRoot.updateMatrixWorld(true);
    const f=n=>{ let b=null; bodyInner.traverse(x=>{ if(x.isBone&&x.name===n)b=x; }); if(b){ b.getWorldPosition(P); o[n]=+P.y.toFixed(3); } };
    ['Hips','Spine02','Spine','Head','LeftFoot','RightFoot'].forEach(f);
    o.pj=+player.pos.y.toFixed(3); o.cam=+camera.position.y.toFixed(3); o.ojo=(tiroOjoY==null?null:+tiroOjoY.toFixed(3));
    o.hipLocal=+bodyHips.position.y.toFixed(2); o.bind=+bodyHipsBind.y.toFixed(2); o.hipEsc=+bodyHips.scale.y.toFixed(3);
    o.clip=curAnim; o.wSld=bodyActions.slide?+bodyActions.slide.getEffectiveWeight().toFixed(3):null;
    o.tclip=bodyActions[curAnim]?+bodyActions[curAnim].time.toFixed(3):null; return o; },
  ojo:()=>{ if(!bodyHead)return null; const P=new THREE.Vector3(); bodyHead.getWorldPosition(P);
    P.x+=-Math.sin(player.yaw)*(CAM_FWD-player.camBack); P.z+=-Math.cos(player.yaw)*(CAM_FWD-player.camBack); P.y+=CAM_UP-player.camLow;
    const D=gunRoot.position.clone().sub(P); const q=camera.quaternion;
    const r=new THREE.Vector3(1,0,0).applyQuaternion(q), u=new THREE.Vector3(0,1,0).applyQuaternion(q), f=new THREE.Vector3(0,0,-1).applyQuaternion(q);
    return { der:+D.dot(r).toFixed(3), arr:+D.dot(u).toFixed(3), ade:+D.dot(f).toFixed(3) }; },
  tp:v=>{ camView=v?'tp':'fp'; }, dbg:o=>Object.assign(DBG,o),
  // avanzar N frames de juego a mano (el navegador headless no corre rAF si nadie pide un frame)
  frames:(n,dt)=>{ for(let i=0;i<(n||10);i++) update(dt||0.033); renderer.render(scene,camera); return +player.camTP.toFixed(3); }, correr:v=>{ const f=new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
    player.vel.set(f.x*(v==null?RUN:v),0,f.z*(v==null?RUN:v)); player.onGround=true; },
  deslizar:()=>{ const f=new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
    player.vel.set(f.x*9,0,f.z*9); player.onGround=true; startSlide(); },
  saltar:()=>{ player.vy=JUMP_V; player.onGround=false; },
  est:()=>({ mundo:world, muni:tiroAmmo, puntos:tiroScore, impactos:tiroHits, tiros:tiroShots,
    huesos:!!(bRArm&&bRFore&&bRHand&&bLArm&&bLFore&&bLHand), columna:!!(bSp&&bSp01&&bSp02), arma:!!(gunRoot&&gunRoot.visible), blancos:tiroTargets.length,
    mask:(mskBind?mskBind.length:0), ojo:GUN_OJO.toArray(), cam:camera.position.toArray().map(v=>+v.toFixed(2)), pj:player.pos.toArray().map(v=>+v.toFixed(2)) }) };
}catch(e){}
try{ tiroWire(); }catch(e){}   // cablear también al arrancar (WASD/mouse sirven aunque empieces en otro mundo)
