/* ============================================================
   SUX SANDBOX — core_q: HUD DE LA PHYSGUN (estilo gmod móvil)
   ------------------------------------------------------------
   POR QUÉ ESTE ARCHIVO
   En un celular no se puede "mantener apretado el gatillo" y a la vez arrastrar el dedo para
   acomodar el objeto: se necesitan los dos pulgares para otra cosa. Así que la physgun pasa a
   funcionar por TAP (un toque agarra, otro suelta) y, mientras sostiene algo, aparece un panel
   con las cuatro acciones que se usan de verdad: LANZAR, CONGELAR, ROTAR y ENDEREZAR.

   CÓMO SE ENGANCHA SIN TOCAR LOS DEMÁS CORES
   - weaponStep(): se REASIGNA. La rama 'phys' de core_b suelta el prop en cuanto `HOLD.fire`
     vuelve a 0 (o sea, al levantar el dedo) y eso es exactamente lo que hay que cambiar. Para
     el resto de las armas se delega en la versión original tal cual; para la physgun se repite
     acá SÓLO el mantenimiento por frame (temporizadores + trazas/chispas/proyectiles), porque
     esas líneas no dependen del arma y tienen que seguir corriendo igual.
   - grabStart/grabEnd/grabStep de core_b se siguen usando: el agarre en sí (rayo, resorte de
     velocidad, distancia con la rueda) ya está bien hecho y el haz de core_g lee `grab`.
     grabEnd NO se toca porque core_e lo llama al subirse a un vehículo.
   - look(): se REASIGNA. Con el modo rotación prendido, el arrastre de pantalla va al prop y no
     a la cámara (PL.yaw/PL.pitch quedan quietos).
   - equip(): se REASIGNA para soltar el prop si el jugador cambia de arma con algo agarrado
     (si no, quedaba flotando y el gatillo de la otra arma disparaba).

   ORIENTACIÓN
   Mientras el jugador rota o endereza, el CUATERNIÓN del cuerpo lo gobierna este core (PG.gov):
   se escribe a mano y la velocidad angular queda en 0. Es la única forma de tener un giro exacto
   de 360°: con torque/velocidad angular el objeto sigue girando solo cuando se levanta el dedo.
   El "enderezar" elige entre las 24 rotaciones rectas de un cubo (6 caras × 4 giros) la más
   cercana por producto punto y hace un slerp de 0,15 s. El usuario habló de "7 direcciones":
   su intención es "que quede derecho como está ahora, sin inclinación", y eso es justo lo que
   dan esas 24 (acostado sigue acostado, parado sigue parado, pero a escuadra).

   CONTORNO
   Los props se dibujan con InstancedMesh (un prop = una instancia de un pool compartido), así
   que clonar la malla para pintarla de amarillo obligaría a rearmar todos los grupos de
   materiales del prop y a sumar draw calls. En cambio se usa UNA sola LineSegments con las
   aristas de un cubo unitario, escalada al tamaño del prop y girada con su cuaternión: queda un
   contorno ORIENTADO (no un AABB que "crece" al girar), cuesta 1 draw call para siempre y con
   depthTest:false se ve incluso si el prop quedó detrás de una pared, como el halo de gmod.
   ============================================================ */

/* ---------- 0. convención reutilizable de "botón activo" ---------- */
/* Dos clases hacen falta, no una: bindBtn() de core_b agrega .act al apretar y la BORRA al
   levantar el dedo (por eso el .act que ponía toggleAim nunca se veía). Entonces .act queda
   como destello de "un solo clic" y data-act="1" como estado pegado; las dos pintan igual. */
if(typeof btnAct==='undefined')var btnAct=null;
btnAct=function(t,on){
  const e=(typeof t==='string')?document.getElementById(t):t;
  if(!e)return false;
  if(on)e.dataset.act='1';
  else{ delete e.dataset.act; e.classList.remove('act'); }
  return !!on;
};
window.btnAct=btnAct;

/* ---------- 1. CSS (inyectado desde acá: head.html no se toca) ---------- */
nsafe(()=>{
  const st=document.createElement('style');
  st.textContent=
   /* el borde va SIEMPRE, transparente, para que prenderlo no mueva nada de lugar
      (box-sizing:border-box es global en head.html) */
   '.rb{border:2px solid transparent;transition:border-color .12s,box-shadow .12s}'+
   '.rb.act,.rb[data-act="1"]{border-color:var(--acc2);'+
   '  box-shadow:0 0 9px 2px rgba(255,194,77,.6),inset 0 0 4px rgba(255,194,77,.55)}'+
   '.rb[data-act="1"]{background:rgba(255,176,58,.44)}'+
   /* panel de la physgun: sólo se ve con algo agarrado */
   '#pgPanel{position:absolute;right:2.4vmin;top:21vmin;display:none;pointer-events:none;'+
   '  grid-template-columns:repeat(2,auto);gap:1.4vmin;z-index:4}'+
   '#pgPanel.on{display:grid}'+
   /* .rb es absolute en head.html: dentro de la grilla tiene que ser relative */
   '.pgb{position:relative!important;left:auto!important;top:auto!important;right:auto!important;'+
   '  bottom:auto!important;width:12vmin;height:12vmin;min-width:44px;min-height:44px;'+
   '  max-width:60px;max-height:60px;background:rgba(30,34,40,.74)}'+
   '.pgb svg{width:64%;height:64%;display:block}'+
   /* en el editor de HUD el panel se ve igual aunque no haya nada agarrado, para poder moverlo */
   'body.hedit #pgPanel{display:grid!important;outline:2px dashed var(--acc);outline-offset:3px;'+
   '  pointer-events:auto}';
  document.head.appendChild(st);
},'pgcss');

/* ---------- 2. textos ---------- */
nsafe(()=>{
  Object.assign(I18N.es,{pgRotOn:'🔄 Modo rotación: arrastrá la pantalla',pgRotOff:'Modo rotación apagado',
    pgStr:'⤾ Enderezado',pgThr:'💥 ¡Lanzado!'});
  Object.assign(I18N.en,{pgRotOn:'🔄 Rotate mode: drag the screen',pgRotOff:'Rotate mode off',
    pgStr:'⤾ Straightened',pgThr:'💥 Thrown!'});
},'pgtxt');

/* ---------- 3. el panel ---------- */
/* iconos dibujados en SVG inline (nada de imágenes externas: el panel tiene que verse aunque
   el CDN de assets no conteste) */
const pgSvg=d=>'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" '+
  'stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>';
const PGICO={
  /* flecha arriba dentro de un círculo = lanzar */
  throw:pgSvg('<circle cx="12" cy="12" r="9"/><path d="M12 17.2V7.4"/><path d="M8.2 11.1 12 7.1l3.8 4"/>'),
  /* anillo con un punto en el centro = congelar */
  frz:pgSvg('<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="3.3" fill="#fff" stroke="none"/>'),
  /* dos flechitas curvas = modo rotación */
  rot:pgSvg('<path d="M3.8 10.4A8.4 8.4 0 0 1 17.6 6.1"/><path d="M17.9 2.6v3.9h-3.9"/>'+
            '<path d="M20.2 13.6A8.4 8.4 0 0 1 6.4 17.9"/><path d="M6.1 21.4v-3.9H10"/>'),
  /* flecha punteada girando = enderezar (resetear la orientación) */
  rst:pgSvg('<circle cx="12" cy="12" r="8.5" stroke-dasharray="2.5 3.1"/>'+
            '<path d="M12 3.5 8.5 6.2 12 8.9" stroke-dasharray="0"/>')
};
const pgPanel=document.createElement('div');
pgPanel.id='pgPanel';
/* sin texto adentro: los rótulos no entran en un botón de 12vmin y se salían de la pantalla.
   Lo que hace cada uno se dice con un toast al tocarlo (y el dibujo es el de la referencia). */
const pgMk=(id,ico,lab)=>{
  const e=document.createElement('div');
  e.id=id; e.className='rb pgb'; e.innerHTML=ico; e.title=lab;
  pgPanel.appendChild(e); return e;
};
const pgBT=pgMk('pgThrow',PGICO.throw,'Lanzar');
const pgBF=pgMk('pgFrz',PGICO.frz,'Congelar');
const pgBR=pgMk('pgRotB',PGICO.rot,'Rotar');
const pgBS=pgMk('pgRst',PGICO.rst,'Enderezar');
nsafe(()=>{const h=$('hud');if(h)h.appendChild(pgPanel);},'pgpanel');

/* ---------- 4. estado ---------- */
const PG={rot:false,gov:false,rt:0,rT:.15,lastV:0,
  q:new THREE.Quaternion(),q0:new THREE.Quaternion(),qT:new THREE.Quaternion()};
let pgLatch=false;
const _pgY=new THREE.Vector3(0,1,0),_pgR=new THREE.Vector3(),
      _pgQa=new THREE.Quaternion(),_pgQb=new THREE.Quaternion();
const pgBodyQ=(b,out)=>out.set(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w);
const pgWriteQ=b=>{b.quaternion.set(PG.q.x,PG.q.y,PG.q.z,PG.q.w);b.angularVelocity.set(0,0,0);};

/* las 24 rotaciones "rectas" de un cubo: 6 caras hacia arriba × 4 giros sobre sí misma */
const PGCAN=[];
nsafe(()=>{
  const A=[new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),
           new THREE.Vector3(0,-1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)];
  const m=new THREE.Matrix4(),z=new THREE.Vector3();
  for(const x of A)for(const y of A){
    if(Math.abs(x.dot(y))>.5)continue;            // los ejes tienen que ser perpendiculares
    z.crossVectors(x,y);                          // el tercero sale del producto vectorial: mano derecha
    m.makeBasis(x,y,z);
    PGCAN.push(new THREE.Quaternion().setFromRotationMatrix(m));
  }
},'pgcan');

/* ---------- 5. agarre por TAP ---------- */
const _pgGrabStep=grabStep;
const _pgWeapStep=weaponStep;
const _pgLook=look;
const _pgEquip=equip;

function pgTap(){
  if(typeof hudEdit!=='undefined'&&hudEdit)return false;
  if(grab){pgRelease();return false;}
  grabStart();                                    // el original: rayo, despierta el cuerpo, sonido
  if(grab){pgBodyQ(grab.body,PG.q);PG.gov=false;PG.rt=0;PG.rot=false;pgPaint();}
  return !!grab;
}
function pgRelease(){
  if(!grab)return false;
  pgRotSet(false);
  PG.gov=false;PG.rt=0;
  grabEnd();                                      // suelta de verdad (sin tocar core_b)
  /* el contorno se apaga YA: si esperara al próximo frame, un lanzar seguido de una pausa
     dejaría el halo amarillo pegado en el aire */
  pgOut.visible=false;
  pgPaint();
  return true;
}
/* el prop agarrado puede desaparecer sin avisar (papelera, clearAll, se lo llevó una explosión):
   core_b deja `grab` apuntando a un cuerpo que ya no está en el mundo y el siguiente tap "soltaba"
   en vez de agarrar. cannon-es pone body.world=null al sacarlo, así que el chequeo es O(1). */
function pgOrphan(){
  if(!grab)return false;
  if(grab.body&&grab.body.world)return false;
  grab=null;PG.gov=false;PG.rt=0;PG.rot=false;rotMode=false;
  pgOut.visible=false;
  return true;
}
/* la physgun por tap: mantener apretado ya no hace falta, y soltar el botón NO suelta el prop */
function pgFire(dt){
  pgOrphan();
  const want=!!HOLD.fire;
  if(want&&!pgLatch){pgLatch=true;nsafe(pgTap,'pgtap');}
  if(!want)pgLatch=false;
  grabStep(dt);
}
weaponStep=function(dt){
  const w=weap();
  if(w.kind!=='phys')return _pgWeapStep(dt);
  /* mantenimiento por frame idéntico al original (no depende del arma) */
  fireT=Math.max(0,fireT-dt);reloadT=Math.max(0,reloadT-dt);
  pgFire(dt);
  const cr=$('cross');if(cr)cr.classList.toggle('grab',!!grab);
  for(let i=TRACERS.length-1;i>=0;i--){const t=TRACERS[i];t.t-=dt;
    t.m.material=tracerMat;if(t.t<=0){scene.remove(t.m);TRACERS.splice(i,1);}}
  for(let i=SPARKS.length-1;i>=0;i--){const s=SPARKS[i];s.t-=dt;
    if(s.grow)s.m.scale.setScalar(s.m.scale.x+s.grow*dt);
    if(s.fade&&s.m.material)s.m.material.opacity=Math.max(0,s.t*2.6);
    if(s.t<=0){scene.remove(s.m);if(s.fade&&s.m.material)s.m.material.dispose();SPARKS.splice(i,1);}}
  stepProj(dt);
};
/* cambiar de arma con algo agarrado: hay que soltarlo o el prop queda flotando */
equip=function(i){
  const r=_pgEquip(i);
  nsafe(()=>{ if(grab&&weap().kind!=='phys')pgRelease(); },'pgequip');
  return r;
};

/* ---------- 6. orientación gobernada (rotar / enderezar) ---------- */
grabStep=function(dt){
  if(!grab)return;
  _pgGrabStep(dt);                                // posición por resorte de velocidad, como siempre
  const b=grab.body;
  if(PG.rt>0){
    PG.rt=Math.max(0,PG.rt-dt);
    const t=1-PG.rt/PG.rT, s=t*t*(3-2*t);         // suavizado: arranca y frena despacio
    PG.q.slerpQuaternions(PG.q0,PG.qT,s);
    if(PG.rt<=0)PG.q.copy(PG.qT);                 // el último frame cae EXACTO en la canónica
  }
  if(PG.gov)pgWriteQ(b);
};
/* arrastrar el dedo gira el prop 360° en los dos ejes */
function pgDrag(dx,dy){
  if(!grab)return false;
  const d=dStage(dx,dy);                          // el escenario puede estar rotado 90°
  const k=.008;                                   // ~360° con un arrastre de pantalla completa
  const b=grab.body;
  pgBodyQ(b,PG.q);
  _pgQa.setFromAxisAngle(_pgY,-d.x*k);            // horizontal = yaw sobre el eje Y del MUNDO
  /* vertical = giro sobre el eje horizontal de la CÁMARA (la "derecha" de la pantalla) */
  _pgR.set(1,0,0).applyQuaternion(camera.quaternion);_pgR.y=0;
  if(_pgR.lengthSq()<1e-6)_pgR.set(1,0,0);
  _pgR.normalize();
  _pgQb.setFromAxisAngle(_pgR,-d.y*k);
  PG.q.premultiply(_pgQa).premultiply(_pgQb).normalize();
  pgWriteQ(b);
  PG.gov=true;PG.rt=0;                            // un arrastre nuevo corta el slerp de enderezar
  return true;
}
/* con el modo rotación prendido el arrastre va al PROP y la cámara no se mueve */
look=function(dx,dy){
  if(PG.rot&&grab){nsafe(()=>pgDrag(dx,dy),'pgdrag');return;}
  _pgLook(dx,dy);
};
function pgRotSet(v){
  const on=!!v&&!!grab;
  PG.rot=on;
  rotMode=on;                                     // core_b también corta la cámara con esto
  rotV.x=rotV.y=0;                                // el original los usa como velocidad angular: en 0
  if(on){pgBodyQ(grab.body,PG.q);PG.gov=true;PG.rt=0;}
  pgPaint();
  return PG.rot;
}

/* ---------- 7. acciones del panel ---------- */
function pgThrow(){
  if(!grab)return 0;
  const p=grab;
  camDir(_dir);
  pgRelease();
  p.manual=true;p.body.wakeUp();
  /* impulso = masa × velocidad: la fuerza sube con la masa, así el empujón se siente igual de
     firme con una caja liviana que con un auto (y no manda a la estratósfera a lo liviano) */
  const sp=13,m=p.body.mass||1;
  p.body.applyImpulse(new CANNON.Vec3(_dir.x*sp*m,(_dir.y*sp+2.4)*m,_dir.z*sp*m),
                      new CANNON.Vec3(0,0,0));
  nsafe(()=>SFX.drop(),'pgthrsnd');
  toast(T('pgThr'));
  PG.lastV=Math.hypot(p.body.velocity.x,p.body.velocity.y,p.body.velocity.z);
  return PG.lastV;
}
function pgFreeze(){
  if(!grab)return false;
  const p=grab;
  pgRelease();
  freezeProp(p,true);p.manual=false;
  nsafe(()=>SFX.freeze(),'pgfrzsnd');
  toast(T('tFroze'));
  return !!p.frozen;
}
function pgReset(){
  if(!grab)return false;
  const b=grab.body;
  pgBodyQ(b,PG.q0);
  let best=PGCAN[0],bd=-1;
  for(const q of PGCAN){const d=Math.abs(q.dot(PG.q0));if(d>bd){bd=d;best=q;}}
  PG.qT.copy(best);
  if(PG.q0.dot(PG.qT)<0)PG.qT.set(-PG.qT.x,-PG.qT.y,-PG.qT.z,-PG.qT.w);  // camino corto
  PG.rt=PG.rT;PG.gov=true;
  b.angularVelocity.set(0,0,0);
  nsafe(()=>SFX.ui(),'pgrstsnd');
  toast(T('pgStr'));
  return true;
}
/* ángulo que le falta al prop para estar a escuadra con el mundo (grados) */
function pgAxErr(){
  if(!grab)return null;
  pgBodyQ(grab.body,_pgQa);
  let mx=0;
  for(const a of[[1,0,0],[0,1,0],[0,0,1]]){
    _pgR.set(a[0],a[1],a[2]).applyQuaternion(_pgQa);
    const m=Math.max(Math.abs(_pgR.x),Math.abs(_pgR.y),Math.abs(_pgR.z));
    mx=Math.max(mx,Math.acos(Math.min(1,m))*180/Math.PI);
  }
  return +mx.toFixed(2);
}

/* ---------- 8. botones ---------- */
nsafe(()=>{
  bindBtn('pgThrow',()=>{ if(typeof hudEdit!=='undefined'&&hudEdit)return; nsafe(pgThrow,'pgb1'); });
  bindBtn('pgFrz',  ()=>{ if(typeof hudEdit!=='undefined'&&hudEdit)return; nsafe(pgFreeze,'pgb2'); });
  bindBtn('pgRotB', ()=>{ if(typeof hudEdit!=='undefined'&&hudEdit)return;
    nsafe(()=>{pgRotSet(!PG.rot);toast(T(PG.rot?'pgRotOn':'pgRotOff'));nsafe(()=>SFX.tool(),'pgb3s');},'pgb3'); });
  bindBtn('pgRst',  ()=>{ if(typeof hudEdit!=='undefined'&&hudEdit)return; nsafe(pgReset,'pgb4'); });
},'pgbind');

/* ---------- 9. contorno amarillo del prop agarrado ---------- */
const pgOutMat=new THREE.LineBasicMaterial({color:0xffc24d,transparent:true,opacity:.96,
  depthTest:false,depthWrite:false,fog:false});
const pgOut=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),pgOutMat);
pgOut.renderOrder=998;pgOut.frustumCulled=false;pgOut.visible=false;
nsafe(()=>scene.add(pgOut),'pgout');
function pgOutStep(){
  if(!grab||APP!=='play'&&APP!=='pause'&&APP!=='spawn'){ if(pgOut.visible)pgOut.visible=false; return; }
  const b=buildDef(grab.def),bo=grab.body;       // buildDef cachea en def._b: no cuesta nada
  pgOut.visible=true;
  pgOut.position.set(bo.position.x,bo.position.y,bo.position.z);
  pgOut.quaternion.set(bo.quaternion.x,bo.quaternion.y,bo.quaternion.z,bo.quaternion.w);
  pgOut.scale.set(b.size[0]*1.03+.012,b.size[1]*1.03+.012,b.size[2]*1.03+.012);
}

/* ---------- 10. pintar el HUD (sólo cuando algo cambia, no todos los frames) ---------- */
const pgUI={};
function pgPaint(){
  pgOrphan();
  const held=!!grab,phys=weap().kind==='phys';
  const show=held&&phys&&APP==='play';
  if(pgUI.show!==show){
    pgUI.show=show;
    pgPanel.classList.toggle('on',show);
    /* recargar y apuntar no hacen nada con la physgun: se esconden para que el panel respire */
    for(const id of['bRel','bAim']){const e=$(id);if(e)e.style.display=show?'none':'';}
  }
  const sp=$('spawn');
  const st={bFire:held&&phys,          // la physgun queda amarilla mientras sostiene algo
            bFrz:held,                 // congelar está "armado": va a caer sobre el prop agarrado
            pgRotB:PG.rot,             // modo rotación: queda prendido hasta tocarlo de nuevo
            bAim:!!zoomOn,             // apuntando
            bTools:!!(sp&&sp.classList.contains('on'))};
  for(const id in st){ if(pgUI[id]===st[id])continue; pgUI[id]=st[id]; btnAct(id,st[id]); }
}
EXT.frame.push(dt=>{ nsafe(()=>{pgPaint();pgOutStep();},'pgframe'); });

/* ---------- 11. el panel también se puede mover con el editor de HUD (core_h) ---------- */
nsafe(()=>{
  if(typeof HUDIDS!=='undefined'&&HUDIDS.indexOf('pgPanel')<0){
    HUDIDS.push('pgPanel');                       // se mueve como un bloque: es una grilla
    if(typeof hudApply==='function')hudApply();   // por si ya había una posición guardada
  }
},'pghudids');

/* ---------- 12. ganchos de test ---------- */
if(DEV&&window.__H)Object.assign(window.__H,{
  pgInfo:()=>({held:grab?grab.id:null,heldIdx:grab?PROPS.indexOf(grab):-1,
    panel:pgPanel.classList.contains('on'),rot:PG.rot,gov:PG.gov,outline:pgOut.visible,
    outScale:pgOut.visible?[+pgOut.scale.x.toFixed(2),+pgOut.scale.y.toFixed(2),+pgOut.scale.z.toFixed(2)]:null,
    btns:{bFire:pgQA('bFire'),bFrz:pgQA('bFrz'),pgRotB:pgQA('pgRotB'),bAim:pgQA('bAim'),
      bTools:pgQA('bTools'),pgThrow:pgQA('pgThrow'),pgRst:pgQA('pgRst')},
    err:pgAxErr(),dist:+grabDist.toFixed(2),lastThrow:+PG.lastV.toFixed(2),
    yaw:+PL.yaw.toFixed(4),pitch:+PL.pitch.toFixed(4),
    q:grab?[+grab.body.quaternion.x.toFixed(4),+grab.body.quaternion.y.toFixed(4),
            +grab.body.quaternion.z.toFixed(4),+grab.body.quaternion.w.toFixed(4)]:null,
    av:grab?+Math.hypot(grab.body.angularVelocity.x,grab.body.angularVelocity.y,
            grab.body.angularVelocity.z).toFixed(3):null}),
  pgTap:()=>{pgTap();return grab?PROPS.indexOf(grab):-1;},
  pgThrow:()=>+pgThrow().toFixed(2),
  pgFreeze:()=>pgFreeze(),
  pgRot:v=>pgRotSet(v===undefined?!PG.rot:v),
  pgReset:()=>pgReset(),
  pgDrag:(dx,dy)=>pgDrag(dx||0,dy||0),
  pgBtn:id=>{const e=$(id);if(!e)return false;
    e.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    e.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));return true;},
  pgPanelBox:()=>{const r=pgPanel.getBoundingClientRect();
    return{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
      on:pgPanel.classList.contains('on')};}
});
/* helper chico: ¿este botón está marcado como activo? */
function pgQA(id){const e=$(id);return !!(e&&(e.dataset.act==='1'||e.classList.contains('act')));}
