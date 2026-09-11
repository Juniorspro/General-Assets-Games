/* =========================================================================================
   EL CUERPO EN PRIMERA PERSONA, LA ABUELA, Y EL DORMITORIO

   El cuerpo del jugador esta hecho por codigo y no con el GLB, y es una decision: un rig de
   Meshy acostado en una cama habria que retargetearlo entero (ya costo una vuelta en Eco);
   el cuerpo por codigo se posa con tres numeros y las manos tienen los dedos donde el guion
   los pide. El modelo GENERADO es la abuela, que es la que se mira de frente.
   ========================================================================================= */
/* con un pelin de emisivo, porque la luna viene de atras y el frente del propio cuerpo es lo
   unico de la escena que se mira SIEMPRE en sombra: sin esto las zapatillas eran dos manchas
   negras (medido en la captura del segundo 8,4) */
const mPiel=new THREE.MeshStandardMaterial({ color:0xc89a78, roughness:0.75, emissive:0x2a1e14, emissiveIntensity:0.5 });
const mBuzo=new THREE.MeshStandardMaterial({ color:0x2c3442, roughness:0.9, emissive:0x10131c, emissiveIntensity:0.6 });
const mJean=new THREE.MeshStandardMaterial({ color:0x2a3550, roughness:0.95, emissive:0x0e1220, emissiveIntensity:0.6 });
const mZapa=new THREE.MeshStandardMaterial({ color:0xd8d8d8, roughness:0.8, emissive:0x3a3a3a, emissiveIntensity:0.55 });

/* ---------- una mano con dedos ----------
   Palma + cuatro dedos de tres falanges + pulgar de dos. Cada falange es una capsula corta;
   el retorno trae los pivotes de los dedos para poder cerrarlos y abrirlos por codigo. */
function manoArmar(lado){                       // lado: -1 izquierda, +1 derecha
  const g=new THREE.Group(); const dedos=[];
  const palma=new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.03, 0.10), mPiel);
  palma.geometry.translate(0, 0, -0.02);
  g.add(palma);
  const largos=[[0.030,0.026,0.022],[0.034,0.030,0.024],[0.032,0.028,0.023],[0.026,0.022,0.019]];
  for(let d=0; d<4; d++){
    const x=(d-1.5)*0.021*1.0;
    let padre=g, py=0.0, pz=-0.072, art=[];
    for(let f=0; f<3; f++){
      const piv=new THREE.Group();
      piv.position.set(f===0? x:0, f===0? py:0, f===0? pz : -largos[d][f-1]);
      const hueso=new THREE.Mesh(new THREE.CapsuleGeometry(0.0095-f*0.001, largos[d][f], 3, 6), mPiel);
      hueso.rotation.x=Math.PI/2; hueso.position.z=-largos[d][f]/2;
      piv.add(hueso); padre.add(piv); padre=piv; art.push(piv);
    }
    dedos.push(art);
  }
  /* el pulgar sale del costado y en OTRO eje: un pulgar paralelo a los dedos es lo que vuelve
     una mano de maniqui */
  { let padre=g, art=[];
    for(let f=0; f<2; f++){
      const piv=new THREE.Group();
      if(f===0){ piv.position.set(lado*0.045, -0.005, -0.02); piv.rotation.y=lado*0.9; }
      else piv.position.z=-0.034;
      const hueso=new THREE.Mesh(new THREE.CapsuleGeometry(0.011-f*0.0015, 0.034-f*0.006, 3, 6), mPiel);
      hueso.rotation.x=Math.PI/2; hueso.position.z=-0.017;
      piv.add(hueso); padre.add(piv); padre=piv; art.push(piv);
    }
    dedos.push(art);
  }
  return { g, dedos };
}
/* cerrar 0..1: dedos estirados a puno flojo */
function manoCerrar(mano, k){
  for(let d=0; d<4; d++) for(let f=0; f<3; f++)
    mano.dedos[d][f].rotation.x = -k*(0.5+f*0.28);
  mano.dedos[4][0].rotation.x = -k*0.5;
  if(mano.dedos[4][1]) mano.dedos[4][1].rotation.x = -k*0.6;
}

/* ---------- el cuerpo que camina ----------
   Cuelga de un grupo que la cinematica pone donde esta la camara. Se ve al mirar abajo: pecho,
   piernas dando zancadas y los brazos colgando con su vaiven. El pecho va RETRASADO 10 cm como
   en Eco: puesto donde va de verdad, mirar al piso es mirar el propio esternon en primer plano. */
const CUERPO=new THREE.Group(); escena.add(CUERPO);
const cuerpo={ g:CUERPO, brazoI:null, brazoD:null, manoI:null, manoD:null,
               piernaI:null, piernaD:null, pantI:null, pantD:null };
{
  const pecho=new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.52, 0.20), mBuzo);
  pecho.position.set(0, -0.42, 0.10); CUERPO.add(pecho);
  const pelvis=new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.19), mJean);
  pelvis.position.set(0, -0.76, 0.10); CUERPO.add(pelvis);
  const pierna=(s)=>{
    const piv=new THREE.Group(); piv.position.set(s*0.10, -0.82, 0.10);
    const muslo=new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.36, 3, 8), mJean);
    muslo.position.y=-0.22; piv.add(muslo);
    const rodi=new THREE.Group(); rodi.position.y=-0.45; piv.add(rodi);
    const canilla=new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.34, 3, 8), mJean);
    canilla.position.y=-0.21; rodi.add(canilla);
    const zapa=new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.26), mZapa);
    zapa.position.set(0, -0.42, -0.05); rodi.add(zapa);
    CUERPO.add(piv); return { piv, rodi };
  };
  const pi=pierna(-1), pd=pierna(1);
  cuerpo.piernaI=pi.piv; cuerpo.pantI=pi.rodi;
  cuerpo.piernaD=pd.piv; cuerpo.pantD=pd.rodi;
  const brazo=(s)=>{
    const piv=new THREE.Group(); piv.position.set(s*0.26, -0.30, 0.08);
    const arriba=new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.26, 3, 8), mBuzo);
    arriba.position.y=-0.16; piv.add(arriba);
    const codo=new THREE.Group(); codo.position.y=-0.32; piv.add(codo);
    const abajo=new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.24, 3, 8), mBuzo);
    abajo.position.y=-0.15; codo.add(abajo);
    const mano=manoArmar(s);
    mano.g.position.set(0, -0.30, 0); mano.g.rotation.x=Math.PI/2;
    codo.add(mano.g);
    CUERPO.add(piv); return { piv, codo, mano };
  };
  const bi=brazo(-1), bd=brazo(1);
  cuerpo.brazoI=bi; cuerpo.brazoD=bd;
  cuerpo.manoI=bi.mano; cuerpo.manoD=bd.mano;
  manoCerrar(bi.mano, 0.25); manoCerrar(bd.mano, 0.25);
  /* SIN sombra propia: la luna queda detras del cuerpo y las piernas se miraban negras —
     el unico que mira este cuerpo es su dueño, y una silueta no le dice nada */
  CUERPO.traverse(o=>{ if(o.isMesh) o.castShadow=false; });
}

/* ---------- LA ABUELA (el GLB generado y riggeado) ---------- */
const ABUELA={ g:null, huesos:{}, reposo:{}, lista:false, alto:0 };
const ABUELA_B64 = '@@ABUELA@@';
{
  const b=atob(ABUELA_B64), n=b.length, a=new Uint8Array(n);
  for(let i=0;i<n;i++) a[i]=b.charCodeAt(i);
  new GLTFLoader().parse(a.buffer, '', (gltf)=>{
    const g=gltf.scene;
    /* medir y plantar: el modelo tiene que medir 1,62 m sea cual sea la escala en que vino */
    const caja=new THREE.Box3().setFromObject(g);
    const alto=caja.max.y-caja.min.y;
    const esc=1.62/alto; g.scale.setScalar(esc);
    caja.setFromObject(g); g.position.y=-caja.min.y;
    g.traverse(o=>{
      if(o.isMesh){ o.castShadow=true; o.frustumCulled=false;
        if(o.material){ o.material.roughness=0.9; } }
      /* LA POSE ES UN DELTA SOBRE EL REPOSO DEL RIG, nunca un absoluto: escribir rotaciones
         absolutas sobre un rig de Meshy ya costo una vuelta entera en RECREO (la pierna a la
         altura de la cabeza). Se guarda el reposo de cada hueso al cargar. */
      if(o.isBone){ ABUELA.huesos[o.name]=o; ABUELA.reposo[o.name]=o.quaternion.clone(); }
    });
    const porta=new THREE.Group(); porta.add(g);
    porta.visible=false; escena.add(porta);
    ABUELA.g=porta; ABUELA.alto=1.62; ABUELA.lista=true;
  }, (e)=>{ console.warn('abuela no cargo', e); });
}
/* aplicar un delta a un hueso por nombre aproximado */
function abuelaHueso(parte, ex, ey, ez){
  for(const n in ABUELA.huesos){
    const nl=n.toLowerCase();
    if(!nl.includes(parte)) continue;
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(ex, ey, ez));
    ABUELA.huesos[n].quaternion.copy(ABUELA.reposo[n]).multiply(q);
    return n;
  }
  return null;
}

/* ---------- EL DORMITORIO ----------
   Vive a 500 metros del vecindario, en la misma escena: dos escenas separadas serian otro
   render y otra lista de luces para un cuarto que se ve doce segundos. La camara simplemente
   se muda. */
const CUARTO={ x:500, z:0 };
const DORM=new THREE.Group(); DORM.position.set(CUARTO.x, 0, CUARTO.z); escena.add(DORM);
{
  const mParedIn=new THREE.MeshStandardMaterial({ color:0x8a8378, roughness:0.95 });
  const mPiso=new THREE.MeshStandardMaterial({ map:tex('madera', 3, 3), roughness:0.9 });
  const W=4.6, D=5.2, H=2.6;
  const caja=(w,h,d,x,y,z,m)=>{ const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m||mParedIn);
    q.position.set(x,y,z); q.receiveShadow=true; DORM.add(q); return q; };
  caja(W, 0.2, D, 0, -0.1, 0, mPiso);
  caja(W, 0.2, D, 0, H+0.1, 0);
  caja(W, H, 0.2, 0, H/2, -D/2);
  caja(W, H, 0.2, 0, H/2, D/2);
  caja(0.2, H, D, -W/2, H/2, 0);
  /* la pared de la ventana: dos paneles y el hueco, con la luna entrando */
  caja(0.2, H, D*0.30, W/2, H/2, -D*0.35);
  caja(0.2, H, D*0.30, W/2, H/2, D*0.35);
  caja(0.2, H*0.35, D*0.40, W/2, H*0.83, 0);
  caja(0.2, H*0.30, D*0.40, W/2, H*0.15, 0);
  const vidrio=new THREE.Mesh(new THREE.PlaneGeometry(D*0.40, H*0.38),
    new THREE.MeshBasicMaterial({ color:0x1b2b4a }));
  vidrio.rotation.y=-Math.PI/2; vidrio.position.set(W/2-0.05, H*0.49, 0); DORM.add(vidrio);
  const cruz=new THREE.Mesh(new THREE.BoxGeometry(0.04, H*0.38, 0.05), mMarco);
  cruz.rotation.y=Math.PI/2; cruz.position.set(W/2-0.12, H*0.49, 0); DORM.add(cruz);
  /* la cama: la camara duerme con la cabeza en -z */
  const mSabana=new THREE.MeshStandardMaterial({ color:0xb9bfc9, roughness:1 });
  const mFrazada=new THREE.MeshStandardMaterial({ color:0x5a3d3d, roughness:1 });
  caja(1.7, 0.35, 2.3, -0.6, 0.175, -0.9, mSabana);
  const fraz=caja(1.72, 0.16, 1.5, -0.6, 0.43, -0.55, mFrazada);
  fraz.castShadow=true;
  /* los bultos de las piernas debajo de la frazada: sin ellos el cuerpo termina en el pecho */
  caja(0.32, 0.14, 1.1, -0.78, 0.52, -0.45, mFrazada);
  caja(0.32, 0.14, 1.1, -0.44, 0.52, -0.45, mFrazada);
  const almohada=caja(1.1, 0.16, 0.5, -0.6, 0.44, -1.85, mSabana);
  almohada.rotation.x=0.18;
  /* la mesa de luz y el velador: la luz calida del cuarto sale de aca */
  caja(0.5, 0.5, 0.4, -1.7, 0.25, -1.8, mPiso);
  const pantalla=new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 10, 1, true),
    new THREE.MeshStandardMaterial({ color:0xd8c9a8, roughness:1, side:THREE.DoubleSide,
                                     emissive:0xffc98a, emissiveIntensity:0.6 }));
  pantalla.position.set(-1.7, 0.68, -1.8); DORM.add(pantalla);
  const velador=new THREE.PointLight(0xffc98a, 9, 8, 2);
  velador.position.set(-1.7, 0.72, -1.8); DORM.add(velador);
  /* la luna por la ventana: una luz fria angosta que pinta el piso. Es la firma de la escena. */
  const lunaCuarto=new THREE.SpotLight(0x8fb0e8, 60, 14, 0.5, 0.5, 1.6);
  lunaCuarto.position.set(CUARTO.x? 0:0, 0, 0);
  lunaCuarto.position.set(4.5, 2.2, 0); lunaCuarto.target.position.set(-1, 0.4, -0.6);
  DORM.add(lunaCuarto); DORM.add(lunaCuarto.target);
}
/* el pecho y las manos del despertar: un segundo juego de brazos, POSADO para la cama.
   Se usan los mismos constructores; lo que cambia es de donde cuelgan. */
const DESPERTAR={ g:new THREE.Group(), manoI:null, manoD:null, brazoI:null, brazoD:null, pecho:null };
{
  /* EL CUERPO ACOSTADO MIRA HACIA LOS PIES (+z), y la primera version estaba ESPEJADA: el pecho
     armado hacia la almohada dejaba los hombros detras de los ojos y las manos "en reposo"
     flotando delante de la cara (medido en la captura del segundo 32,8: dos palmas tapando el
     cuadro entero antes de que el guion las pida). */
  const g=DESPERTAR.g;
  const pecho=new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.55), mBuzo);
  pecho.position.set(0, -0.16, 0.34); g.add(pecho); DESPERTAR.pecho=pecho;
  /* la luz de relleno de la escena: el velador queda detras de la cabeza y las manos levantadas
     se miraban a contraluz — negras. Un relleno tenue pegado a la camara es el truco de cine de
     siempre, y aca cuesta una luz sin sombras. */
  const relleno=new THREE.PointLight(0xffd9b0, 1.6, 2.6, 2);
  relleno.position.set(0, 0.15, 0.12); g.add(relleno);
  const brazo=(s)=>{
    /* hombros a ±0,15 y no ±0,24: el semiancho visible a medio metro en un marco 9:19 es
       0,15 m — con los hombros reales las manos suben por fuera del cuadro */
    const piv=new THREE.Group(); piv.position.set(s*0.15, -0.14, 0.10);
    const arriba=new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.24, 3, 8), mBuzo);
    arriba.rotation.x=Math.PI/2; arriba.position.z=0.14; piv.add(arriba);
    const codo=new THREE.Group(); codo.position.z=0.30; piv.add(codo);
    const abajo=new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.22, 3, 8), mBuzo);
    abajo.rotation.x=Math.PI/2; abajo.position.z=0.13; codo.add(abajo);
    const mano=manoArmar(s);
    mano.g.position.set(0, 0, 0.27);
    codo.add(mano.g);
    g.add(piv); return { piv, codo, mano };
  };
  DESPERTAR.brazoI=brazo(-1); DESPERTAR.brazoD=brazo(1);
  DESPERTAR.manoI=DESPERTAR.brazoI.mano; DESPERTAR.manoD=DESPERTAR.brazoD.mano;
  g.visible=false; escena.add(g);
}
