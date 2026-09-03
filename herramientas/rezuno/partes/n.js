/* =========================================================================================
   EL SEGUIMIENTO DE CABEZA, Y POR QUE NO ES LA CAMARA

   Pedido: *"al tener seguimiento de cabeza podras mirar arriba y verla, la idea es que con el
   seguimiento sirva para mover la camara real del juego"*.

   ===== NO SE PUEDE HACER CON LA CAMARA, Y NO ES UNA LIMITACION DEL CODIGO =====
   El juego usa la camara TRASERA —se pidio asi y es lo que hace que la mano entre por detras del
   telefono—. Con la trasera, tu cara esta del otro lado del aparato: no hay nada que reconocer. Un
   detector de caras ahi no encuentra una cara que este mal, encuentra que NO HAY cara. Volver a la
   frontal para esto seria deshacer lo que se pidio la vuelta pasada y ademas dejar la mano sin camara.

   ===== LO QUE SI MIDE HACIA DONDE ESTAS MIRANDO ES EL PROPIO TELEFONO =====
   Sosteniendo el telefono con una mano y metiendo la otra por detras, la pantalla esta delante de tu
   cara: hacia donde apunta el telefono ES hacia donde estas mirando. Girarlo o levantarlo es el MISMO
   gesto que girar o levantar la cabeza, y los sensores de orientacion lo dan sin permiso de camara,
   sin modelo que bajar y sin costar un milisegundo de hilo — que en este juego es justo lo que no
   sobra. Asi que el seguimiento existe y mueve la camara del juego; lo que lo mide es el aparato.

   ===== TRES COSAS QUE HAY QUE HACER O NO SIRVE =====
   1. TODO ES RELATIVO A COMO ARRANCASTE. Nadie sostiene el telefono a la misma altura: lo que
      importa no es el angulo absoluto sino CUANTO LO MOVISTE desde que empezaste a jugar. Se guarda
      el angulo del primer evento y todo lo demas se mide contra el.
   2. HAY ZONA MUERTA Y RECENTRADO LENTO. Una mano sostiene el telefono: nunca esta quieto. Sin zona
      muerta la vista tiembla todo el tiempo; y sin recentrado, la deriva del giroscopo te deja
      mirando al techo a los cinco minutos sin que hayas movido nada.
   3. EL GESTO ES ASIMETRICO. Levantar el telefono unos grados tiene que alcanzar para ver al rival,
      pero bajarlo casi no tiene que hacer nada: abajo ya esta todo lo que hay que mirar.
   ========================================================================================= */
const OR={ on:false, hay:false, permiso:'no', a0:null, b0:null,
           giro:0, alza:0, giroObj:0, alzaObj:0, ev:0 };
/* cuanto giro de telefono equivale al tope de la vista */
const OR_GIRO_G=22;            // grados de giro horizontal para llegar al tope de orbita
const OR_ALZA_G=16;            // grados de levantar para llegar al tope de alzar la vista
const OR_ZONA=1.6;             // grados que no cuentan: la mano nunca esta quieta
const OR_CENTRO=0.012;         // cuanto se recentra el origen por evento (contra la deriva)

function orLeer(e){
  /* `beta` es la inclinacion adelante-atras y `alpha` el rumbo. Se usa `beta` para alzar y `alpha`
     para girar; en horizontal el navegador puede dar `alpha` saltando de 359 a 0, asi que la
     diferencia se normaliza a la vuelta corta o la vista pegaria un latigazo al cruzar el norte. */
  if(e.beta==null && e.alpha==null) return;
  OR.ev++;
  const a=e.alpha==null? 0 : e.alpha, b=e.beta==null? 0 : e.beta;
  if(OR.a0===null){ OR.a0=a; OR.b0=b; OR.hay=true; return; }
  let da=a-OR.a0; while(da>180) da-=360; while(da<-180) da+=360;
  let db=b-OR.b0;
  /* EL ORIGEN SE VA CORRIENDO HACIA DONDE ESTAS. Sin esto, la deriva del sensor —y el hecho de que
     nadie sostiene el telefono en el mismo angulo dos minutos seguidos— terminan con la vista clavada
     en un extremo. Con esto, quedarse quieto en cualquier postura vuelve al centro solo. */
  OR.a0 += da*OR_CENTRO; OR.b0 += db*OR_CENTRO;
  const zm=(v)=>{ const s=Math.sign(v), m=Math.abs(v)-OR_ZONA; return m<=0? 0 : s*m; };
  OR.giroObj = Math.max(-1, Math.min(1, zm(da)/OR_GIRO_G));
  /* levantar el telefono BAJA beta, asi que va con signo cambiado para que levantar sea mirar arriba */
  OR.alzaObj = Math.max(-1, Math.min(1, zm(-db)/OR_ALZA_G));
  OR.hay=true;
}
/* iOS exige pedirlo desde un gesto del jugador; Android lo entrega sin preguntar */
async function orIniciar(){
  if(OR.on) return OR.permiso;
  if(typeof DeviceOrientationEvent==='undefined'){ OR.permiso='no hay'; return OR.permiso; }
  try{
    if(typeof DeviceOrientationEvent.requestPermission==='function'){
      const r=await DeviceOrientationEvent.requestPermission();
      OR.permiso=r;
      if(r!=='granted') return r;
    } else OR.permiso='granted';
  }catch(e){ OR.permiso='error'; return OR.permiso; }
  addEventListener('deviceorientation', orLeer, true);
  OR.on=true;
  return OR.permiso;
}
/* se llama en cada cuadro: suaviza y devuelve los dos angulos que la camara tiene que usar */
function orTick(dt){
  const k=Math.min(1, (dt||0.016)*5.0);
  OR.giro += (OR.giroObj-OR.giro)*k;
  OR.alza += (OR.alzaObj-OR.alza)*k;
}
function orGiro(){ return OR.hay? OR.giro*CAM_ORBITA : 0; }
function orAlza(){ return OR.hay? (OR.alza>0? OR.alza*CAM_ALZA_MAX : OR.alza*(-CAM_ALZA_MIN)) : 0; }
