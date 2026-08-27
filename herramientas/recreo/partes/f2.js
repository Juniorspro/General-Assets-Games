
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
  /* 0,22 Y NO 0,40. Un crossfade de 0,40 s a 60 pasos son veinticuatro cuadros mezclando dos poses:
     durante casi medio segundo el personaje no esta haciendo ninguna de las dos cosas, y eso es lo
     que se lee como "animaciones lentas". 0,22 alcanza para que no haya salto y se nota el cambio. */
  if(PROFE.mezcla>0) PROFE.mezcla=Math.max(0, PROFE.mezcla - dt/0.22);
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
/* VAN DECLARADOS ACA Y NO EN i2.js, donde vive su logica, POR EL ORDEN DE EVALUACION: pintarLibros()
   los lee y se llama desde pintarIdioma() al armar la pantalla de idioma, o sea mil lineas antes.
   Un let leido antes de su linea no rompe una funcion: rompe el modulo entero. Es la sexta vez en
   este proyecto que una declaracion puesta "donde corresponde tematicamente" tira todo abajo. */
let aulaN=1, aulaK=0, aulaIdx=0, muertes=0, bichosVivos=0;

/* EL RECORRIDO DE LA ESCUELA.
   Ocho aulas, y el orden no es 1..8 sino el que dibuja una vuelta sin volver sobre sus pasos: las
   cuatro de arriba de izquierda a derecha por el pasillo de la fila 1, se baja por la columna 21 y
   las cuatro de abajo de derecha a izquierda por la fila 9. Recorrer 1,2,3,4,5,6,7,8 obligaria a
   cruzar la escuela entera entre la 4 y la 5, y son veinte metros de pasillo vacio. */
const TOUR=[1,2,3,4,8,7,6,5];
/* QUE ACTIVIDAD HAY EN CADA TRAMO, Y POR QUE SON TRES Y NO UNA.
   Siete tandas de bichos son una tanda repetida siete veces. Las tres piden algo DISTINTO de la
   mano, y ese es el criterio —no la variedad decorativa:
     bichos     → vienen hacia vos: se entrena APUNTAR a un blanco que se mueve.
     tizas      → caen: se entrena el TIEMPO, hay que llegar antes de que toquen el piso.
     casilleros → tiembla uno de ocho, todos a la misma distancia: se entrena ELEGIR.
   El primer tramo no tiene nada: es el que sigue al tutorial y el jugador recien aprendio a contar.
   Las cantidades suben, y ninguna pasa de cinco o seis blancos a la vez porque en un marco 9:16 mas
   que eso se solapa y deja de poder apuntarse de a uno. */
const TRAMOS=[ null,
  { tipo:'bichos',     n:2, txt:'dBichos' },
  { tipo:'tizas',      n:3, txt:'dTizas' },
  { tipo:'casilleros', n:3, txt:'dCasill' },
  { tipo:'bichos',     n:4, txt:'dBichos' },
  { tipo:'tizas',      n:4, txt:'dTizas' },
  { tipo:'casilleros', n:3, txt:'dCasill' },
  { tipo:'bichos',     n:5, txt:'dBichos' } ];
const TOTAL_CUENTAS=TOUR.length*CUENTAS_AULA;

const GUION=[
 { id:'saludo',  anim:'saludar',  txt:'d1', dur:3.0, mira:true },
 { id:'presenta',anim:'explicar', txt:'d2', dur:3.8, mira:true },
 { id:'t5',      anim:'explicar', txt:'d3', mira:true, espera:{tipo:'dedos', n:5} },
 { id:'tp',      anim:'explicar', txt:'d4', mira:true, espera:{tipo:'gesto', g:'pinza'} },
 { id:'t2',      anim:'explicar', txt:'d5', mira:true, espera:{tipo:'dedos', n:2} },
 { id:'listo',   anim:'saludar',  txt:'d6', dur:2.6, mira:true }
];
/* EL GUION DE LAS AULAS SE GENERA. Ocho aulas por tres escenas mas siete tandas de bichos son
   treinta y una escenas: escritas a mano son treinta y una oportunidades de poner un numero de aula
   en el lugar de otro. Se genera del TOUR y cada escena lleva ADENTRO el numero de aula al que se
   refiere, asi que ninguna parte del codigo tiene que adivinar "en que aula estoy". */
TOUR.forEach((n,k)=>{
  const T=TRAMOS[k];
  if(T){
    /* el viaje va PARTIDO EN DOS y la actividad cae en la juntura: tiene que estar EN el camino, no
       al final de el */
    GUION.push({ id:'viaje'+n, anim:'caminar', txt:'dSale',  viaje:n, mitad:true, aula:n });
    GUION.push({ id:'act'+n,   anim:'quieto',  txt:T.txt, act:T.n, tipo:T.tipo, aula:n });
    GUION.push({ id:'sigue'+n, anim:'caminar', txt:'dSale2', viaje:n, resto:true, aula:n });
  } else {
    GUION.push({ id:'viaje'+n,  anim:'caminar', txt:'d7', viaje:n, aula:n });
  }
  GUION.push({ id:'entra'+n,  anim:'puerta',   txt:'d8', puerta:n, aula:n });
  GUION.push({ id:'clase'+n,  anim:'explicar', txt:(k===0?'d9':'dAula'), dur:3.4,
               clase:n, aula:n, mira:true });
});

/* LAS VEINTICUATRO CUENTAS: tres por aula, y el resultado siempre entra en los dedos de dos manos,
   o sea de 1 a 10. La dificultad sube POR AULA y no cuenta por cuenta: dentro de un aula las tres
   son del mismo tipo, asi que el jugador no tiene que volver a entender el enunciado en cada libro —
   entiende el aula. Y sube de a un paso: una mano, dos manos, restas y al final multiplicar.
   El tope de 10 no es un detalle: una cuenta que da 12 no se puede contestar con el cuerpo, y una
   cuenta que no se puede contestar es una muerte que el jugador no entiende. */
function armarCuentas(){
  const R=[];
  const azar=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
  for(let k=0;k<TOTAL_CUENTAS;k++){
    const aula=Math.floor(k/CUENTAS_AULA);        // 0..7
    let a,b,r,t;
    if(aula<2){        r=azar(2,5);  a=azar(1,r-1); b=r-a; t=a+' + '+b; }
    else if(aula<4){   r=azar(6,10); a=azar(2,r-2); b=r-a; t=a+' + '+b; }
    else if(aula<6){   a=azar(7,12); b=azar(2,Math.min(6,a-1)); r=a-b;
                       if(r>10){ a=12; b=2; r=10; } t=a+' − '+b; }
    else {             const pares=[[2,2],[2,3],[3,3],[2,4],[2,5],[3,2],[4,2],[5,2],[1,7],[3,1]];
                       const p=pares[azar(0,pares.length-1)];
                       a=p[0]; b=p[1]; r=a*b; t=a+' × '+b; }
    R.push({ txt:t, res:r, aula:aula+1 });
  }
  return R;
}
let CUENTAS=[];
