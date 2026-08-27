
/* =========================================================================================
   LA CAMARA SOBRE RIELES
   No hay joystick, no hay mouse y no hay teclas de movimiento. La camara recorre una lista de puntos
   a velocidad constante y MIRA HACIA DONDE VA, girando con un resorte para que el giro se lea como
   una cabeza que voltea y no como un corte.
   Por que asi y no libre: el jugador tiene una sola cosa que hacer con la mano, y si esa misma mano
   tuviera que manejar la camara las dos cosas se pelearian — mover la mano para girar y mover la
   mano para contar son el mismo gesto.
   ========================================================================================= */
const OJO=1.58;
const cam={ x:0, z:0, giro:0, pitch:0, ojo:OJO,
            ax:0, az:0, agiro:0, apitch:0, aojo:OJO };
let riel=null;          // {pts:[[x,z]…], k, t, vel, girar, alListo}
function rielIr(pts, vel, alListo){
  riel={ pts, k:0, vel:vel||2.4, alListo:alListo||null };
}
function rielTick(dt){
  if(!riel) return false;
  const meta=riel.pts[riel.k];
  if(!meta){ const f=riel.alListo; riel=null; if(f) f(); return false; }
  const dx=meta[0]-cam.x, dz=meta[1]-cam.z, d=Math.hypot(dx,dz);
  if(d<0.10){
    riel.k++;
    if(riel.k>=riel.pts.length){ const f=riel.alListo; riel=null; if(f) f(); }
    return true;
  }
  const paso=Math.min(d, riel.vel*dt);
  cam.x += dx/d*paso; cam.z += dz/d*paso;
  /* mira hacia donde va. El resorte a dt*3 es lo que hace que en una esquina la camara "doble" en
     medio segundo en vez de teletransportar el rumbo. */
  const gq=Math.atan2(dx,dz);
  let g=gq-cam.giro; while(g>Math.PI)g-=2*Math.PI; while(g<-Math.PI)g+=2*Math.PI;
  cam.giro += g*Math.min(1, dt*3.0);
  return true;
}
function mirarA(x,z,dt,k){
  const gq=Math.atan2(x-cam.x, z-cam.z);
  let g=gq-cam.giro; while(g>Math.PI)g-=2*Math.PI; while(g<-Math.PI)g+=2*Math.PI;
  cam.giro += g*Math.min(1, dt*(k||2.4));
}

/* ===================== EL PROFESOR EN EL MUNDO ===================== */
const PROFE={ x:0, z:0, giro:0, anim:'quieto', animOtro:null, mezcla:0, at:0,
              ax:0, az:0, agiro:0 };
function profeAnim(nombre){
  if(nombre===PROFE.anim) return;
  PROFE.animOtro=PROFE.anim; PROFE.anim=nombre; PROFE.mezcla=1;
}
let profeRiel=null;
function profeIr(pts, vel, alListo){ profeRiel={ pts, k:0, vel:vel||2.7, alListo:alListo||null }; }
function profeTick(dt){
  if(profeRiel){
    const meta=profeRiel.pts[profeRiel.k];
    if(!meta){ const f=profeRiel.alListo; profeRiel=null; if(f) f(); }
    else {
      const dx=meta[0]-PROFE.x, dz=meta[1]-PROFE.z, d=Math.hypot(dx,dz);
      if(d<0.14){
        profeRiel.k++;
        if(profeRiel.k>=profeRiel.pts.length){ const f=profeRiel.alListo; profeRiel=null; if(f) f(); }
      } else {
        const paso=Math.min(d, profeRiel.vel*dt);
        PROFE.x += dx/d*paso; PROFE.z += dz/d*paso;
        const gq=Math.atan2(dx,dz);
        let g=gq-PROFE.giro; while(g>Math.PI)g-=2*Math.PI; while(g<-Math.PI)g+=2*Math.PI;
        PROFE.giro += g*Math.min(1, dt*5.0);
      }
    }
  }
  if(PROFE.mezcla>0) PROFE.mezcla=Math.max(0, PROFE.mezcla - dt/0.40);
  PROFE.at+=dt;
}
function profeMirarCam(dt,k){
  const gq=Math.atan2(cam.x-PROFE.x, cam.z-PROFE.z);
  let g=gq-PROFE.giro; while(g>Math.PI)g-=2*Math.PI; while(g<-Math.PI)g+=2*Math.PI;
  PROFE.giro += g*Math.min(1, dt*(k||3.0));
}

/* =========================================================================================
   EL GUION
   Una lista de escenas. Cada una dice que animacion pone, que dice, y como se sale de ella: por
   TIEMPO (dur) o porque el jugador HIZO algo con la mano (espera). Las que esperan una mano tienen
   respaldo con numeros, porque un juego que solo se abre con webcam es un juego que la mayoria no
   puede abrir.
   ========================================================================================= */
const PASO=1/60;
const MANO_SOSTEN=1.1;                 // cuanto hay que sostener el numero para que cuente
let escena_i=-1, escenaT=0, esperaT=0, jugando=false, terminado=0;
let libros=0, aciertos=0, cuenta=null, cuentaTxt='';
let bloqueo=false;

const GUION=[
 { id:'saludo',  anim:'saludar',  txt:'d1', dur:3.0, mira:true },
 { id:'presenta',anim:'explicar', txt:'d2', dur:3.8, mira:true },
 { id:'t5',      anim:'explicar', txt:'d3', mira:true, espera:{tipo:'dedos', n:5} },
 { id:'tp',      anim:'explicar', txt:'d4', mira:true, espera:{tipo:'gesto', g:'pinza'} },
 { id:'t2',      anim:'explicar', txt:'d5', mira:true, espera:{tipo:'dedos', n:2} },
 { id:'listo',   anim:'saludar',  txt:'d6', dur:2.6, mira:true },
 { id:'viaje',   anim:'caminar',  txt:'d7', viaje:true },
 { id:'entra',   anim:'puerta',   txt:'d8', puerta:true },
 { id:'clase',   anim:'explicar', txt:'d9', dur:4.2, clase:true, mira:true }
];

/* los ocho libros: cuentas cuyo resultado entra en los dedos de dos manos, o sea de 1 a 10. Suben
   de a poco: primero una mano, despues dos, y al final una resta. */
function armarCuentas(){
  const R=[];
  const azar=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
  for(let k=0;k<LIBROS_N;k++){
    let a,b,r,t;
    if(k<3){ r=azar(2,5); a=azar(1,r-1); b=r-a; t=a+' + '+b; }
    else if(k<6){ r=azar(6,10); a=azar(2,r-2); b=r-a; t=a+' + '+b; }
    else { a=azar(7,12); b=azar(2,Math.min(6,a-1)); r=a-b; if(r>10){ a=12; b=2; r=10; } t=a+' − '+b; }
    R.push({ txt:t, res:r });
  }
  return R;
}
let CUENTAS=[];
