/* =========================================================================================
   LA CINEMATICA: 39 segundos escritos como UNA funcion del tiempo

   Todo el guion es `poner(t)`: entra el segundo y salen la camara, el cuerpo y la abuela. Que
   sea una funcion y no una maquina de estados es lo que permite PROBARLA: el banco puede pedir
   el segundo 26,4 directo y fotografiarlo, sin esperar 26 segundos ni depender de que el reloj
   del navegador acompañe.
   ========================================================================================= */
const T_FIN=39.0;
/* los tiempos con nombre, para que el guion se lea como guion */
const T={ bajaVista:7.5, subeVista:9.3, frena:15.5, cartelIr:18.5, cartelFoco:21.5,
          giro:24.0, giroFin:25.3, golpe:26.35, cae:26.55, suelo:27.3,
          negro:27.5, cuarto:30.0, abre:31.0, mira:31.4, manos:33.5, cartelFin:37.6 };

const susurro=(a,b,x)=>{ const k=Math.max(0, Math.min(1, (x-a)/(b-a))); return k*k*(3-2*k); };
const mez=(a,b,k)=>a+(b-a)*k;

/* el rumbo para mirar un punto, con la convencion de three: yaw 0 mira a -z */
function rumboA(cx,cz, tx,tz){ return Math.atan2(-(tx-cx), -(tz-cz)); }
/* interpolar angulos por el lado corto: sin esto un giro de 350 grados aparece donde el guion
   pide uno de 10 */
function mezAng(a,b,k){ let d=b-a; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return a+d*k; }

/* ---------- la caminata: donde esta el cuerpo en el segundo t ---------- */
const PASO_LARGO=1.62;                     // metros por zancada (dos pasos)
function caminataZ(t){
  /* arranca a 2,15 m/s y frena suave llegando: la posicion es la integral, escrita a trozos */
  const v=2.5;
  if(t<=0) return 4;
  if(t<T.frena) return 4 - v*t + 0.5*Math.min(t,1)*0;   // velocidad constante
  return 4 - v*T.frena;                                  // clavado al frenar (los tramos siguientes mueven aparte)
}
const Z_PARADO=4-2.5*T.frena;              // donde queda parado (-34,75)

/* la mirada: una lista de (desde, hasta, blanco) y se suaviza entre blancos */
function blancoMirada(t, px, pz){
  if(t<2.2)  return [px, 1.5, pz-30];
  if(t<5.0)  return [-11.5, 2.4, -15];          // la casa de enfrente
  if(t<T.bajaVista) return [px, 1.5, pz-30];
  /* pz-0,55 y no -1,6: con el blanco a 1,6 m la vista baja 51 grados y las piernas —que estan
     DEBAJO— quedan fuera del cono. A 0,55 m son 76 grados: se ven las zancadas. */
  if(t<T.subeVista) return [px, -0.5, pz-0.85];
  if(t<11.6) return [11.5, 2.0, -28];           // la casa de al lado
  if(t<T.frena) return [px, 1.4, pz-26];
  if(t<T.cartelIr) return [CASA_FEA.x, 4.6, CASA_FEA.z];   // la fea, de abajo arriba
  if(t<T.giro) return [CARTEL.x, 1.42, CARTEL.z];          // el cartel
  return [5.85, 1.45, -34.6];                               // la abuela (detras)
}

/* ---------- la abuela: aparece en el giro y pega ---------- */
/* A 1,9 METROS DE DONDE LA CAMARA MIRA EL CARTEL, y es una cuenta: un bate mide 0,8 m y el
   brazo otro tanto — a los 3,4 m de la primera version el golpe pegaba en el aire. */
const ABUELA_POS={ x:5.85, z:-34.75 };
function abuelaPoner(t){
  if(!ABUELA.lista) return;
  const g=ABUELA.g;
  const visible = t>=T.giro-0.4 && t<T.cuarto;
  g.visible=visible;
  if(!visible) return;
  g.position.set(ABUELA_POS.x, 0, ABUELA_POS.z);
  g.rotation.y=rumboA(ABUELA_POS.x, ABUELA_POS.z, 6.3, -36.6)+Math.PI;  // de frente a la camara
  /* la respiracion mientras espera: quieta del todo se lee a estatua */
  const resp=Math.sin(t*2.2)*0.012;
  g.position.y=resp*0.5;
  /* EL GOLPE: carga (0,7 s) y latigazo (0,2 s). Va sobre los huesos del rig si estan —como
     DELTA sobre el reposo— y si el rig no cargo, el cuerpo entero se inclina y embiste: menos
     fino, pero la cinematica no se queda sin golpe. */
  const carga=susurro(T.giroFin, T.golpe-0.12, t);
  const latigo=susurro(T.golpe-0.02, T.golpe+0.16, t);
  const tw = carga*(1-latigo);
  const sw = latigo;
  const conHuesos = abuelaHueso('spine', 0, 0, 0)!==null;
  if(conHuesos){
    abuelaHueso('spine',  -0.10*tw+0.22*sw, -0.45*tw+0.75*sw, 0);
    abuelaHueso('rightarm', -1.4*tw-0.4*sw, 0, -0.5*tw+0.9*sw);
    abuelaHueso('rightforearm', -0.5*tw+0.2*sw, 0, 0);
    abuelaHueso('head', 0.08*tw, 0.25*tw-0.3*sw, 0);
  } else {
    g.rotation.z=0.14*tw-0.10*sw;
    g.rotation.y+= -0.5*tw+0.85*sw;
  }
  /* y EMBISTE medio paso al pegar: un bate que pega sin que el cuerpo entre es un abanico */
  const paso=0.55*sw;
  g.position.x+=Math.sin(g.rotation.y+Math.PI)*-paso*0; // el rumbo ya la deja de frente
  g.position.z+= paso*0.9;
}

/* ---------- la camara, el cuerpo y los velos: poner(t) ---------- */
const CAM={ x:0, y:1.62, z:0, yaw:0, pitch:0, roll:0, fov:68 };
let _mirYaw=null, _mirPitch=null;
function poner(t, dt){
  let px=4.9, py=1.62, pz=caminataZ(t);
  let fov=68, roll=0;
  const fase=Math.max(0, 4-pz)/PASO_LARGO*Math.PI*2;   // la fase del paso sale de la DISTANCIA:
                                                        // atada al tiempo, frenar patina los pies
  /* ----- 0..frena: la caminata, con el vaiven del cuerpo ----- */
  const caminando = t<T.frena;
  const vel=caminando? 1:0;
  py += (Math.abs(Math.sin(fase))*0.055 - 0.02)*vel;    // dos apoyos por zancada
  px += Math.sin(fase*0.5)*0.03*vel;
  roll += Math.sin(fase*0.5)*0.012*vel;

  /* ----- frena..cartelFoco: acercarse al cartel ----- */
  if(t>=T.cartelIr){
    const k=susurro(T.cartelIr, T.cartelFoco, t);
    px=mez(4.9, 6.0, k); pz=mez(Z_PARADO, -36.15, k);
    py=1.62+Math.sin(t*1.7)*0.012;                       // respira parado
    fov=mez(68, 58, susurro(T.cartelFoco-0.6, T.cartelFoco+1.2, t));  // el foco: acercar el ojo
  } else if(t>=T.frena){
    py=1.62+Math.sin(t*1.7)*0.015;
  }

  /* ----- la mirada ----- */
  const [bx,by,bz]=blancoMirada(t, px, pz);
  let yawObj=rumboA(px, pz, bx, bz);
  let pitchObj=Math.atan2(by-py, Math.hypot(bx-px, bz-pz));
  /* el suavizado es el movimiento de cuello: la mirada NO salta de blanco en blanco, viaja.
     En el giro del susto la constante baja: un giro asustado es rapido. */
  const rapidez = (t>=T.giro && t<T.giroFin)? 10.5 : 3.4;
  if(_mirYaw===null){ _mirYaw=yawObj; _mirPitch=pitchObj; }
  const k=Math.min(1, dt*rapidez);
  _mirYaw=mezAng(_mirYaw, yawObj, k);
  _mirPitch=mez(_mirPitch, pitchObj, k);
  let yaw=_mirYaw, pitch=_mirPitch;
  /* el miedo: entre el susto y el golpe la camara tiembla fino */
  if(t>=T.giroFin && t<T.golpe){
    const m=susurro(T.giroFin, T.giroFin+0.3, t);
    yaw+=Math.sin(t*37)*0.006*m; pitch+=Math.sin(t*43)*0.005*m;
    fov=mez(fov, 62, m);
  }

  /* ----- el golpe y la caida ----- */
  if(t>=T.cae){
    const k=susurro(T.cae, T.suelo, t);
    const rebote=Math.sin(Math.min(1,k)*Math.PI)*0.06;
    py=mez(1.62, 0.24, k)+rebote;
    roll=mez(roll, 1.35, k);                            // cae de costado
    pitch=mez(pitch, -0.15, k);
    yaw=yaw+0.9*k;                                       // la cabeza gira al caer
    fov=mez(fov, 74, Math.min(1,k*2));
  }

  /* ----- el dormitorio ----- */
  if(t>=T.cuarto){
    px=CUARTO.x-0.6; pz=-1.72;
    const desp=susurro(T.mira, T.manos, t);              // de mirar el techo a mirar el cuerpo
    py=mez(0.62, 0.88, desp);
    yaw=Math.PI;                                          // los pies estan hacia +z
    pitch=mez(1.22, -0.52, desp);
    roll=Math.sin(t*0.9)*0.01;
    fov=64;
    if(t>=T.manos){
      const km=susurro(T.manos, T.manos+1.6, t);
      pitch=mez(-0.52, -0.30, km);                        // sube apenas: sigue a las manos
    }
    py+=Math.sin(t*1.15)*0.008;                           // la respiracion del que despierta
  }

  CAM.x=px; CAM.y=py; CAM.z=pz; CAM.yaw=yaw; CAM.pitch=pitch; CAM.roll=roll; CAM.fov=fov;
  camara.position.set(px, py, pz);
  camara.rotation.set(0,0,0,'YXZ');
  camara.rotation.y=yaw; camara.rotation.x=pitch; camara.rotation.z=roll;
  if(Math.abs(camara.fov-fov)>0.05){ camara.fov=fov; camara.updateProjectionMatrix(); }
  /* la sombra de la luna sigue a la camara: un frustum fijo de 130 m desperdicia el mapa */
  luna.target.position.set(px, 0, pz); luna.position.set(px+30, 48, pz+20);

  /* ----- el cuerpo que camina ----- */
  CUERPO.visible = t<T.cuarto;
  if(CUERPO.visible){
    CUERPO.position.set(px, py, pz);
    CUERPO.rotation.y=yaw;
    const a=Math.sin(fase)*0.62*vel;
    cuerpo.piernaI.rotation.x=a;  cuerpo.pantI.rotation.x=Math.max(0, -a)*1.3+0.05;
    cuerpo.piernaD.rotation.x=-a; cuerpo.pantD.rotation.x=Math.max(0, a)*1.3+0.05;
    cuerpo.brazoI.piv.rotation.x=-a*0.55; cuerpo.brazoD.piv.rotation.x=a*0.55;
    cuerpo.brazoI.codo.rotation.x=-0.25; cuerpo.brazoD.codo.rotation.x=-0.25;
  }

  /* ----- el cuerpo del despertar ----- */
  DESPERTAR.g.visible = t>=T.cuarto;
  if(DESPERTAR.g.visible){
    DESPERTAR.g.position.set(px, py-0.14, pz);
    DESPERTAR.g.rotation.y=0;
    const km=susurro(T.manos, T.manos+1.9, t);
    /* los brazos: de descansar a los costados a levantarse delante de la cara. El codo dobla
       DESPUES que el hombro: al reves el gesto se lee a robot. */
    /* LA CUENTA DE ADONDE TERMINAN LAS MANOS, porque la primera version las dejaba 16 cm POR
       ENCIMA del ojo con la vista 0,3 rad hacia abajo: se levantaban fuera del cuadro. Con
       -0,25/-0,20 la mano queda a 0,53 m del ojo y 10 cm por debajo — el centro del cuadro. */
    for(const [b,s] of [[DESPERTAR.brazoI,-1],[DESPERTAR.brazoD,1]]){
      b.piv.rotation.x=mez(0.02, -0.25, km);
      /* HACIA ADENTRO POR rotation.y Y NO POR rotation.z, medido con manosNDC: con el brazo
         casi horizontal, z ES el eje del brazo —girarlo es torsion, no traslada nada— y las
         manos seguian clavadas en 0,08/0,93 de pantalla. El eje que las acerca es Y: sen(0,17)
         por 0,55 m de brazo son los 9 cm que faltaban. Es la misma trampa de ejes que ya costo
         una vuelta con los hombros de Baldi. */
      b.piv.rotation.y=s*mez(0, -0.17, susurro(T.manos+0.3, T.manos+1.9, t));
      b.codo.rotation.x=mez(0.02, -0.20, susurro(T.manos+0.4, T.manos+2.0, t));
      /* la mano se para con los dedos hacia arriba —el gesto de mirarse las manos— y gira
         despacio mostrando dorso y palma */
      b.mano.g.rotation.x=mez(0, 1.45, km);
      b.mano.g.rotation.y=Math.sin(Math.max(0,t-T.manos-1.6)*1.1)*0.7*km;
    }
    /* los dedos se estiran y se cierran despacio: es EL gesto de "estoy vivo" */
    const ded=0.30-0.26*Math.sin(Math.max(0, t-T.manos-1.2)*1.5)*km;
    manoCerrar(DESPERTAR.manoI, Math.max(0.02, ded));
    manoCerrar(DESPERTAR.manoD, Math.max(0.02, ded));
  }

  abuelaPoner(t);

  /* ----- el farol roto: parpadea con dos senos que no son multiplos, como una falla real ----- */
  const fr=(Math.sin(t*13.7)*Math.sin(t*3.1)>0.55)? 0.15 : 1.0;
  farolRoto && (farolRoto.children[3].intensity=26*fr, farolRoto.children[2].material.color.setScalar(fr));

  /* ----- los velos ----- */
  const vB=document.getElementById('vBlanco'), vN=document.getElementById('vNegro'),
        vR=document.getElementById('vRojo');
  /* el fogonazo del golpe: sube en un cuadro y baja en 0,3 s — un golpe corta, no se funde */
  const fl = t>=T.golpe && t<T.golpe+0.34 ? Math.max(0, 1-(t-T.golpe)/0.34) : 0;
  vB.style.opacity=(fl*0.9).toFixed(3);
  vR.style.opacity=(susurro(T.golpe, T.cae, t)*(1-susurro(T.negro, T.negro+1.4, t))).toFixed(3);
  let neg=susurro(T.negro, T.negro+1.3, t);
  if(t>=T.cuarto) neg=1-susurro(T.abre-0.4, T.abre, t);   // el negro lo reemplazan los parpados
  vN.style.opacity=neg.toFixed(3);
}
