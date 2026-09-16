/* =========================================================================================
   LAS MANOS EN 3D, RECONSTRUIDAS DESDE LA PANTALLA

   El pedido era manos humanas con profundidad, no un esqueleto de palitos encima del cuadro. Son
   dos manos de verdad en la escena: falanges con volumen, articulaciones redondeadas, palma, y
   delante de todo el mundo, asi que tapan al profesor y a los bichos como taparia una mano.

   LA DECISION IMPORTANTE ES DE DONDE SALE LA FORMA, y no es de los worldLandmarks metricos de
   MediaPipe aunque parezca lo obvio. Cada punto se coloca SOBRE SU PROPIO RAYO DE PANTALLA, a una
   profundidad que sale de la z relativa. Por que asi:

   - Con los worldLandmarks habria que anclar la mano en algun punto —la muneca— y escalar la forma
     desde ahi. Eso hace que el pulgar y el indice EN 3D no caigan donde estan los mismos puntos EN
     PANTALLA, y el juego apunta a los bichos con los puntos de pantalla. O sea: verias la pinza en
     un lugar y reventarias un bicho en otro. Inaceptable en un juego que se apunta con la mano.
   - Reconstruyendo por rayos, el dibujo y el apuntado son la misma cosa POR CONSTRUCCION, y la
     perspectiva sale gratis: los puntos normalizados ya la traen puesta, porque vienen de una camara.

   La z de MediaPipe es "profundidad relativa a la muneca" en unidades parecidas a las de x, no en
   metros; se multiplica por MANO_KZ para llevarla a metros y ese numero se ajusto mirando.

   Y VAN INSTANCIADAS. Una mano son 21 articulaciones y 21 huesos; dos manos son 84 piezas. Sueltas
   serian 84 llamadas de dibujo sobre un juego que dibuja la escuela con una. Instanciadas son DOS:
   un cilindro para los huesos y una esfera para las articulaciones.
   ========================================================================================= */
const MANO_HUESOS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
                   [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const MANO_PUNTAS=[4,8,12,16,20];
/* EL RADIO DE CADA ARTICULACION, EN METROS Y A ESCALA DE MANO DE VERDAD. Todos iguales se lee a
   cadena de bolitas; los dedos AFINAN hacia la punta y la muneca es lo mas gordo, y eso es la mitad
   de lo que hace que una mano parezca una mano. */
const MANO_RADIO=(()=>{
  const r=new Float32Array(21);
  r[0]=0.0175;                                        // muneca
  r[1]=0.0150; r[2]=0.0125; r[3]=0.0110; r[4]=0.0098; // pulgar
  const base=[0.0135,0.0135,0.0128,0.0118];
  for(let d=0;d<4;d++){ const i0=5+d*4;
    r[i0]=base[d]; r[i0+1]=base[d]*0.86; r[i0+2]=base[d]*0.74; r[i0+3]=base[d]*0.66; }
  return r;
})();
const MANO_KZ=0.42;        // metros por unidad de z relativa
const MANO_DIST=0.40;      // a que distancia de la camara flota la mano
const MANO_ESC=1.00;       // escala general, por si hay que agrandarlas
/* EL GROSOR SALE DE LA PROPIA MANO Y NO ES UN NUMERO FIJO, y esto se vio en la primera captura: con
   los radios en metros absolutos los dedos salian como chorizos —radio de 30 px— porque el grosor
   dependia de MANO_DIST y el ANCHO en pantalla, en cambio, sale de los puntos. Dos cosas que tienen
   que ser proporcionales manejadas por dos numeros distintos: si el jugador acerca la mano a la
   camara, la mano crece y los dedos no.
   Ahora se mide la palma reconstruida —muneca al nudillo del medio— y los radios se escalan contra
   los 9,5 cm que mide esa distancia en una mano adulta. Con eso el grosor es correcto a cualquier
   distancia y MANO_DIST deja de afectarlo. */
const MANO_PALMA_M=0.095;
const MANOS_MAX=2, MANO_ART=21, MANO_HUE=MANO_HUESOS.length;

/* el nombre lleva MANO_ adelante porque M_PIEL ya existe: es el material del rig de cajas del
   profesor, declarado en e2.js. Dos const con el mismo nombre en un modulo no son un aviso, son un
   SyntaxError que tira la pagina entera antes de la primera linea. */
const MANO_M_PIEL=new THREE.MeshLambertMaterial({ color:0xEDB894 });
/* la punta del dedo que el juego CONTO se pinta distinto, y por eso las esferas llevan color por
   instancia: cuando el numero no es el que el jugador esperaba, ahi se ve cual dedo no estiro */
/* LOS SEGMENTOS SALEN DE CUANTO MIDE UNA ARTICULACION EN PANTALLA, NO DE QUE SE VEA REDONDA DE CERCA.
   Medido, las manos agregaban 7.080 triangulos y 5.880 de esos eran las 42 esferas de las
   articulaciones a 10x8 segmentos. Un nudillo ocupa unos pocos pixeles en un telefono —y encima el
   juego tiene el filtro de baja calidad, que dibuja a resolucion reducida y estira con NEAREST—, asi
   que la diferencia entre 10x8 y 6x5 no existe en pantalla y son 3.864 triangulos menos por cuadro.
   Es el mismo criterio que ya decidio los 14 lados de los discos de la tableta. */
const manoArt=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,5), MANO_M_PIEL, MANOS_MAX*MANO_ART);
const manoHue=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,6,1,true), MANO_M_PIEL, MANOS_MAX*MANO_HUE);
for(const m of [manoArt, manoHue]){
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled=false; m.visible=false; m.renderOrder=5; escena.add(m);
}
manoArt.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(MANOS_MAX*MANO_ART*3), 3);
manoArt.instanceColor.setUsage(THREE.DynamicDrawUsage);
/* LA PALMA. Sin ella la mano se lee a "cinco cadenas de bolitas saliendo de un punto": los huesos
   del esqueleto que van de la muneca a los nudillos no tienen carne alrededor. Es un elipsoide
   —esfera achatada— apoyado en el plano de la palma, y es la pieza que hace que se lea a mano. */
const manoPal=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6), MANO_M_PIEL, MANOS_MAX);
manoPal.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
manoPal.frustumCulled=false; manoPal.visible=false; manoPal.renderOrder=5; escena.add(manoPal);
/* las tres mallas de la mano quedan fuera de la sombra: viven a medio metro del ojo, asi que su
   sombra seria una mancha de tres metros tapando el pasillo */
for(const m of [manoArt, manoHue, manoPal]) marcarSinSombra(m);
const _hx=new THREE.Vector3(), _hy=new THREE.Vector3(), _hn=new THREE.Vector3();
const _hmat=new THREE.Matrix4();

const _hp=[], _hm=new THREE.Matrix4(), _hq=new THREE.Quaternion(), _hv=new THREE.Vector3();
const _hd=new THREE.Vector3(), _hs=new THREE.Vector3(), _hup=new THREE.Vector3(0,1,0);
const _hc=new THREE.Color();
for(let i=0;i<MANO_ART;i++) _hp.push(new THREE.Vector3());

/* LA PUNTA CONTADA SE TINE, NO SE PINTA DE VERDE FLUOR. En la primera captura las puntas eran
   pelotitas verdes pegadas a una mano de piel: se leia a error de render, no a informacion. Un tono
   apenas mas claro y frio alcanza para verlo y no rompe la mano. */
const COL_PIEL=new THREE.Color(0xEDB894), COL_CUENTA=new THREE.Color(0xC8E8A8);

function manos3DDibujar(){
  const vivas=(MANO.on && MANO.vivas)? MANO.vivas : null;
  const n=vivas? vivas.length : 0;
  manoArt.visible=n>0; manoHue.visible=n>0; manoPal.visible=n>0;
  if(!n){
    /* LOS NUMEROS TAMBIEN SE APAGAN. Estaban colgados de la rama con manos: cuando la mano se iba
       —o caducaba a los 260 ms sin medicion— las mallas se ocultaban pero los dos numeros quedaban
       clavados en pantalla, en el ultimo lugar donde hubo una mano. */
    for(let q=0;q<MANOS_MAX;q++){
      const el=document.getElementById('manoN'+q);
      if(el && el._ver){ el.classList.remove('ver'); el._ver=false; }
    }
    return;
  }
  /* de pantalla a espacio de camara: media altura visible a la distancia de la mano */
  const tanV=Math.tan(camara.fov*Math.PI/360);
  let ia=0, ih=0;
  for(let q=0;q<n && q<MANOS_MAX;q++){
    const R=vivas[q], L=R.sal;
    const z0=L[2];
    for(let i=0;i<MANO_ART;i++){
      const x=MANO.espejo? 1-L[i*3] : L[i*3];
      const y=L[i*3+1];
      const D=MANO_DIST + (L[i*3+2]-z0)*MANO_KZ;
      const d=Math.max(0.12, D);
      _hp[i].set((x*2-1)*tanV*camara.aspect*d*MANO_ESC, -(y*2-1)*tanV*d*MANO_ESC, -d);
      camara.localToWorld(_hp[i]);
    }
    /* LA ESCALA DE ESTA MANO, MEDIDA EN ELLA MISMA Y SUAVIZADA EN EL TIEMPO.
       Sale de la distancia muneca-nudillo RECONSTRUIDA, y esa reconstruccion usa la z para poner cada
       punto en su rayo: o sea que la escala hereda todo el ruido de la coordenada mas ruidosa que da
       MediaPipe. Sin suavizar, la mano quieta LATIA de grosor varias veces por segundo — y eso a ojo
       se lee como "tiembla", aunque la posicion en pantalla estuviera perfectamente quieta. Un
       suavizado exponencial de 0,25 s alcanza: la mano puede acercarse a la camara todo lo rapido que
       quiera, pero su tamano no cambia en dos cuadros. */
    const escCruda=Math.max(0.15, _hd.subVectors(_hp[9], _hp[0]).length()/MANO_PALMA_M);
    R.escSal = R.escSal>0? R.escSal + (escCruda-R.escSal)*0.14 : escCruda;
    const esc=R.escSal;
    /* las articulaciones */
    for(let i=0;i<MANO_ART;i++){
      const r=MANO_RADIO[i]*esc;
      _hm.compose(_hp[i], _hq.identity(), _hs.set(r,r,r));
      manoArt.setMatrixAt(ia, _hm);
      const punta=MANO_PUNTAS.indexOf(i);
      _hc.copy(punta>=0 && R.estirados[punta]? COL_CUENTA : COL_PIEL);
      manoArt.setColorAt(ia, _hc);
      ia++;
    }
    /* la palma: un elipsoide en el plano de la muneca y los nudillos */
    {
      const p0=_hp[0], p5=_hp[5], p17=_hp[17];
      _hv.copy(p5).add(p17).multiplyScalar(0.5);
      _hy.subVectors(_hv, p0);
      const largo=Math.max(1e-4, _hy.length());
      _hy.multiplyScalar(1/largo);
      _hn.crossVectors(_hd.subVectors(p5,p0), _hx.subVectors(p17,p0)).normalize();
      _hx.crossVectors(_hy, _hn).normalize();
      const ancho=_hp[5].distanceTo(_hp[17]);
      _hmat.makeBasis(_hx, _hy, _hn);
      _hq.setFromRotationMatrix(_hmat);
      _hv.copy(p0).addScaledVector(_hy, largo*0.52);
      _hm.compose(_hv, _hq, _hs.set(ancho*0.60, largo*0.62, MANO_RADIO[0]*esc*1.05));
      manoPal.setMatrixAt(q, _hm);
    }
    /* los huesos: un cilindro de largo 1 estirado entre las dos puntas.
       SE USA CILINDRO Y NO CAPSULA a proposito: una capsula estirada en su eje deforma las dos
       tapas, y las tapas ya las ponen las esferas de las articulaciones. */
    for(const [a,b] of MANO_HUESOS){
      _hd.subVectors(_hp[b], _hp[a]);
      const largo=_hd.length();
      if(largo<1e-5){ _hm.makeScale(0.0001,0.0001,0.0001); manoHue.setMatrixAt(ih++, _hm); continue; }
      _hv.addVectors(_hp[a], _hp[b]).multiplyScalar(0.5);
      _hq.setFromUnitVectors(_hup, _hd.clone().normalize());
      /* el hueso toma el PROMEDIO de los dos radios y un pelo mas, no el minimo y un pelo menos:
         con el minimo por 0,92 el cilindro quedaba mas fino que las dos esferas de sus puntas y el
         dedo se veia como un collar de cuentas en vez de un dedo */
      const r=(MANO_RADIO[a]+MANO_RADIO[b])*0.5*1.02*esc;
      _hm.compose(_hv, _hq, _hs.set(r, largo, r));
      manoHue.setMatrixAt(ih++, _hm);
    }
  }
  /* las instancias que no se usan se esconden en escala cero */
  for(; ia<MANOS_MAX*MANO_ART; ia++){
    _hm.makeScale(0.0001,0.0001,0.0001); _hm.setPosition(0,-90,0);
    manoArt.setMatrixAt(ia, _hm);
  }
  for(; ih<MANOS_MAX*MANO_HUE; ih++){
    _hm.makeScale(0.0001,0.0001,0.0001); _hm.setPosition(0,-90,0);
    manoHue.setMatrixAt(ih, _hm);
  }
  for(let q=n;q<MANOS_MAX;q++){
    _hm.makeScale(0.0001,0.0001,0.0001); _hm.setPosition(0,-90,0);
    manoPal.setMatrixAt(q, _hm);
  }
  manoArt.instanceMatrix.needsUpdate=true;
  manoHue.instanceMatrix.needsUpdate=true;
  manoPal.instanceMatrix.needsUpdate=true;
  if(manoArt.instanceColor) manoArt.instanceColor.needsUpdate=true;
  manos3DNumeros(vivas, n, tanV);
}
/* el numero de cada mano, en DOM y no en el mundo: es informacion de interfaz y tiene que leerse
   nitida y del mismo tamano en cualquier pantalla */
function manos3DNumeros(vivas, n, tanV){
  const W=lienzo.clientWidth, H=lienzo.clientHeight;
  for(let q=0;q<MANOS_MAX;q++){
    const el=document.getElementById('manoN'+q); if(!el) continue;
    if(q>=n){ if(el._ver){ el.classList.remove('ver'); el._ver=false; } continue; }
    const R=vivas[q], L=R.sal;
    const x=MANO.espejo? 1-L[0] : L[0];
    /* mismo criterio que el aro: escribir estilos invalida el diseño, y el numero de dedos cambia una
       vez cada tantos segundos mientras la posicion cambia de a fracciones de pixel */
    const izq=(x*100).toFixed(2)+'%', arr=((L[1]*H+34)/H*100).toFixed(2)+'%';
    if(el._izq!==izq){ el.style.left=izq; el._izq=izq; }
    if(el._arr!==arr){ el.style.top=arr; el._arr=arr; }
    const txt=String(R.dedos);      // `n` es el parametro de esta funcion: pisarlo tira ReferenceError
    if(el._n!==txt){ el.textContent=txt; el._n=txt; }
    if(!el._ver){ el.classList.add('ver'); el._ver=true; }
  }
}

/* GANCHO: donde cayeron las manos en el mundo y donde se proyectan, para poder comprobar que el
   dibujo 3D y el apuntado 2D son el mismo lugar — que es toda la razon de reconstruir por rayos. */
function manos3DVer(){
  const r={ vivas:(MANO.vivas||[]).length, dist:MANO_DIST, kz:MANO_KZ, esc:MANO_ESC, manos:[] };
  const W=lienzo.clientWidth, H=lienzo.clientHeight;
  const v=new THREE.Vector3();
  for(const R of (MANO.vivas||[])){
    const L=R.sal, tanV=Math.tan(camara.fov*Math.PI/360);
    const m={ dedos:R.dedos, puntos:{} };
    for(const [nom,i] of [['muneca',0],['pulgar',4],['indice',8]]){
      const x=MANO.espejo? 1-L[i*3] : L[i*3], y=L[i*3+1];
      const D=Math.max(0.12, MANO_DIST+(L[i*3+2]-L[2])*MANO_KZ);
      v.set((x*2-1)*tanV*camara.aspect*D*MANO_ESC, -(y*2-1)*tanV*D*MANO_ESC, -D);
      camara.localToWorld(v);
      const mundo=[+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
      v.project(camara);
      m.puntos[nom]={ mundo, px:[Math.round((v.x*0.5+0.5)*W), Math.round((-v.y*0.5+0.5)*H)],
                      esperado:[Math.round(x*W), Math.round(y*H)] };
    }
    r.manos.push(m);
  }
  return r;
}
window.manos3DVer=manos3DVer;
