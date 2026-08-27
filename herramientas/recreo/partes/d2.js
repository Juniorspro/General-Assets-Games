
/* ===================== ARMAR LA ESCUELA EN CUATRO MALLAS =====================
   23x19 celdas son unas cuatrocientas paredes. Sueltas serian cuatrocientas llamadas de dibujo;
   fundidas por MATERIAL son cuatro. Y se funden por material y no todas juntas porque el piso, la
   pared, el techo y los lockers usan texturas distintas: fundir dos materiales en una malla obliga
   a un atlas, y un atlas para cuatro texturas de 64 px es trabajo para no ganar nada. */
function armarEscuela(){
  const paredes=[], pisos=[], techos=[], lockers=[];
  const caja=(lista,w,h,d,x,y,z,uv)=>{
    const g=new THREE.BoxGeometry(w,h,d);
    if(uv){ const a=g.attributes.uv.array; for(let k=0;k<a.length;k+=2){ a[k]*=uv[0]; a[k+1]*=uv[1]; } }
    g.translate(x,y,z); lista.push(g);
  };
  for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){
    const c=MAPA[j][i], x=XC(i), z=ZC(j);
    if(c===0){
      /* solo se construye la pared si toca algo pisable: una pared entre dos paredes no se ve
         nunca y son doce triangulos que el aparato dibuja para nadie */
      const toca=[[i,j-1],[i,j+1],[i-1,j],[i+1,j]].some(([a,b])=>
        a>=0&&b>=0&&a<GW&&b<GH&&(MAPA[b][a]===1||MAPA[b][a]===2||MAPA[b][a]===3));
      if(toca) caja(paredes, CEL, ALTO_M, CEL, x, ALTO_M/2, z, [CEL/2.2, ALTO_M/2.4]);
      continue;
    }
    caja(pisos, CEL, 0.16, CEL, x, -0.08, z, [CEL/2.1, CEL/2.1]);
    caja(techos, CEL, 0.16, CEL, x, ALTO_M+0.08, z, [CEL/2.1, CEL/2.1]);
  }
  /* LOS LOCKERS VAN CONTRA LAS PAREDES DE PASILLO Y NO EN LAS AULAS, que es donde estan en una
     escuela. Se buscan las celdas de pasillo que tienen pared al lado y se pega una fila. */
  if(CAL[calidad].lockers) for(let j=0;j<GH;j++) for(let i=0;i<GW;i++){
    if(MAPA[j][i]!==1) continue;
    const lados=[[0,-1,0,0],[0,1,Math.PI,0],[-1,0,0,1],[1,0,0,1]];
    for(const [di,dj,rot,vert] of lados){
      const a=i+di, b=j+dj;
      if(a<0||b<0||a>=GW||b>=GH||MAPA[b][a]!==0) continue;
      if(((i*7+j*13+di*3+dj*5)%3)!==0) continue;         // no en todas, se ve mejor
      const w = vert? 0.32 : CEL*0.78, d = vert? CEL*0.78 : 0.32;
      const x=XC(i)+di*(CEL/2-0.20), z=ZC(j)+dj*(CEL/2-0.20);
      caja(lockers, w, 2.10, d, x, 1.05, z, [vert? d/1.1 : w/1.1, 1.4]);
    }
  }
  const juntar=(lista, mat)=>{
    if(!lista.length) return null;
    const g=mergeGeometries(lista,false);
    for(const q of lista) q.dispose();
    const m=new THREE.Mesh(g, mat); m.frustumCulled=false; escena.add(m); return m;
  };
  return { paredes:juntar(paredes,M_PARED), pisos:juntar(pisos,M_PISO),
           techos:juntar(techos,M_TECHO), lockers:juntar(lockers,M_LOCKER) };
}
const escuela=armarEscuela();

/* ---------- LAS PUERTAS, SUELTAS PORQUE SE ABREN ----------
   Cada una gira sobre su marco. Van sueltas y con su propio material: es lo unico del edificio que
   se mueve, y fundirlas con la pared las dejaria clavadas para siempre. */
const puertaGeo=new THREE.BoxGeometry(CEL*0.92, ALTO_M*0.86, 0.14);
{ const a=puertaGeo.attributes.uv.array; for(let k=0;k<a.length;k+=2){ a[k]*=1; a[k+1]*=1; } }
puertaGeo.translate(CEL*0.46, 0, 0);            // la bisagra en el borde
for(const p of PUERTAS){
  const g=new THREE.Group();
  const m=new THREE.Mesh(puertaGeo, p.salida? new THREE.MeshLambertMaterial({map:T_PUERTA, color:0x9fd08f}) : M_PUERTA);
  g.add(m);
  /* la puerta se orienta segun por donde se pasa: si los vecinos pisables estan en Z, la hoja va en X */
  const vertical = (pisable(p.i,p.j-1)||pisable(p.i,p.j+1)) &&
                   !(pisable(p.i-1,p.j)||pisable(p.i+1,p.j));
  g.position.set(XC(p.i) - CEL*0.46*(vertical?1:0), ALTO_M*0.43, ZC(p.j) - CEL*0.46*(vertical?0:1));
  if(!vertical){ g.rotation.y=Math.PI/2; g.position.set(XC(p.i), ALTO_M*0.43, ZC(p.j) - CEL*0.46); }
  else { g.position.set(XC(p.i) - CEL*0.46, ALTO_M*0.43, ZC(p.j)); }
  p.g=g; p.vertical=vertical; escena.add(g);
}
/* TAPA POR FUERA DE CADA SALIDA. La celda de una salida es puerta, asi que el constructor de
   paredes no levanta pared ahi, y del otro lado de la reja del mapa NO HAY NADA. Mirando el pasillo
   del medio de punta a punta se veia un agujero negro al fondo: medido en una captura de 790x1400,
   unos 90 px de lado a 42 m de distancia, o sea los 4,2 m enteros de la celda. Eso era el vacio de
   afuera de la escuela, visible por arriba y por los costados de la hoja —que mide 0,92 de celda de
   ancho y 0,86 de alto—. Dos paneles pegados por fuera y el pasillo vuelve a terminar en algo. */
for(const p of PUERTAS){
  if(!p.salida) continue;
  const fuera=(p.i===0)? -1 : 1;
  const tapa=new THREE.Mesh(new THREE.BoxGeometry(CEL*0.5, ALTO_M, CEL), M_PARED);
  tapa.position.set(XC(p.i)+fuera*CEL*0.62, ALTO_M/2, ZC(p.j));
  escena.add(tapa);
}

/* ---------- LOS PUPITRES DE ADORNO ----------
   Un aula vacia con una libreta en el medio se lee a deposito. Cuatro pupitres alcanzan. */
{
  const gs=[];
  for(const a of AULAS){
    for(let k=0;k<4;k++){
      const i=a.i0 + ((k%2)? (a.i1-a.i0) : 0), j=a.j0 + ((k<2)? 1 : (a.j1-a.j0-1));
      const g1=new THREE.BoxGeometry(1.0,0.08,0.66); g1.translate(XC(i), 0.78, ZC(j)); gs.push(g1);
      const g2=new THREE.BoxGeometry(1.0,0.50,0.07); g2.translate(XC(i), 0.50, ZC(j)+0.30); gs.push(g2);
    }
  }
  const g=mergeGeometries(gs,false); for(const q of gs) q.dispose();
  const m=new THREE.Mesh(g, new THREE.MeshLambertMaterial({color:0xa9753f}));
  m.frustumCulled=false; escena.add(m);
}

/* =========================================================================================
   EL AULA DE LA CLASE
   Una sola aula amueblada de verdad: pizarron en la pared del fondo, escritorio en el medio, y
   ocho libros que flotan a un costado. Las otras siete quedan con sus pupitres y nada mas — el
   juego pasa entero en esta, asi que amueblar las ocho seria trabajo que nadie va a ver.
   ========================================================================================= */

/* el pizarron: un verde oscuro con marco de madera y tiza. Va contra la pared del fondo. */
const T_PIZA=tex(256,128,(g,w,h)=>{
  g.fillStyle='#2f4f3a'; g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,0.05)';
  for(let k=0;k<40;k++){ const x=Math.random()*w, y=Math.random()*h;
    g.fillRect(x,y, 8+Math.random()*30, 1); }
  g.strokeStyle='rgba(255,255,255,0.10)'; g.lineWidth=1;
  g.beginPath(); g.moveTo(0,h*0.5); g.lineTo(w,h*0.5); g.stroke();
}, 1, 1, false);

/* =========================================================================================
   LAS OCHO AULAS AMUEBLADAS, Y CADA UNA CON SU SITIO CALCULADO

   Antes habia UNA aula amueblada a mano con numeros escritos: pizarron en z=27,47, escritorio en
   23,6, el en 25,2 y la camara en 22,85. Con ocho aulas eso serian cuarenta numeros a mano, y el
   primero que se escriba mal deja un pizarron dentro de una pared sin que nadie se entere hasta
   llegar a ese salon. Asi que el sitio de cada aula SE CALCULA a partir de su rectangulo:

     pared del fondo = la fila j1+1, que es pared por construccion y —desde que la puerta principal
                       va siempre en j0-1— nunca tiene puerta;
     el              = la ultima fila del aula (j1);
     el escritorio   = 1,6 m delante de el;
     la camara       = 2,35 m delante de el, que es la distancia medida donde ocupa el 51,9% del
                       alto del marco en un telefono;
     el libro        = 0,6 m delante de el y 0,55 a un costado.

   Y TODO EL MOBILIARIO VA FUNDIDO. Ocho pizarrones y ocho escritorios sueltos son 56 mallas, o sea
   56 llamadas de dibujo sobre un juego que venia usando UNA para la escuela entera. Fundido por
   material son tres: las pizarras, la madera clara y la madera oscura.
   ========================================================================================= */
const M_MAD1=new THREE.MeshLambertMaterial({color:0x8f6a3c});
const M_MAD2=new THREE.MeshLambertMaterial({color:0x7d5c34});
const AULA_SITIO={};
{
  const pizas=[], mad1=[], mad2=[];
  const caja=(lista,w,h,d,x,y,z)=>{ const g=new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); lista.push(g); };
  for(const a of AULAS){
    const xC=XC(Math.round((a.i0+a.i1)/2));
    /* EL PIZARRON VA DELANTE DE LA CARA DE LA PARED, NO ADENTRO.
       Esto estuvo mal desde que existe el aula y no se vio nunca por una casualidad. La formula era
       ZC(j1+1) - CEL/2 + GRUESO/2 + 0.02, o sea 17 cm PASADA la cara interior de la pared — y una
       pared es un cubo de celda entera, no un panel de GRUESO de espesor. El pizarron quedaba
       enterrado y la pared lo tapaba.
       Por que no se noto: la unica aula amueblada era la 6, y la 6 tenia su segunda puerta justo en
       esa celda del fondo. Donde hay puerta el constructor no levanta pared, asi que el pizarron se
       veia POR EL AGUJERO. Al mover las segundas puertas a las paredes laterales —para que no
       quedaran detras del pizarron— la pared del fondo se cerro en las ocho aulas y el defecto salio
       a la luz en las ocho a la vez.
       Ahora la cara interior de la pared es F y todo se cuelga hacia adelante de ella: el marco
       apoyado (F-0,10 a F), la pizarra 1,5 cm delante del marco y la bandeja de la tiza sobresaliendo,
       que es lo que hace una bandeja. */
    const F=ZC(a.j1+1)-CEL/2;
    const zPiza=F-0.115;
    const zProfe=ZC(a.j1);
    const zEsc=zProfe-1.60;
    const zCam=zProfe-2.35;
    AULA_SITIO[a.n]={ n:a.n, x:xC, i:Math.round((a.i0+a.i1)/2), zPiza, zProfe, zEsc, zCam,
                      jCam:zCam/CEL+(GH-1)/2, jm:Math.round((a.j0+a.j1)/2), j0:a.j0, j1:a.j1 };
    /* EL MARCO VA DETRAS DE LA PIZARRA Y NO DELANTE, y esto se vio en una foto: el marco estaba a
       zP-0,03 y la pizarra a zP+0,03, o sea que desde la camara —que esta a menor Z— el marco tapaba
       la pizarra entera y el aula tenia un rectangulo de madera en la pared. Tres centimetros. */
    caja(mad1, CEL*2.5+0.34, 2.02, 0.10, xC, 1.90, F-0.05);
    caja(mad1, CEL*2.5, 0.07, 0.16, xC, 0.94, F-0.14);           // la bandeja de la tiza
    /* la pizarra: un plano, y el material va a DOS CARAS — un PlaneGeometry mira a su +Z y girarlo
       con FrontSide lo deja invisible desde este lado. Con DoubleSide no hay lado equivocado. */
    const pl=new THREE.PlaneGeometry(CEL*2.5, 1.86);
    pl.translate(xC, 1.90, zPiza); pizas.push(pl);
    /* EL ESCRITORIO. El se para DEL OTRO LADO, entre el escritorio y el pizarron: es la posicion de
       un maestro y ademas pone una mesa entre el jugador y el, que es lo que hace que la escena se
       lea a clase y no a persecucion. */
    caja(mad1, 2.60, 0.11, 1.10, xC, 0.86, zEsc);
    caja(mad2, 2.60, 0.74, 0.09, xC, 0.45, zEsc-0.50);
    for(const sx of [-1,1]) caja(mad2, 0.09, 0.74, 1.10, xC+sx*1.25, 0.45, zEsc);
  }
  const juntar=(lista, mat)=>{
    if(!lista.length) return null;
    const g=mergeGeometries(lista,false);
    for(const q of lista) q.dispose();
    const m=new THREE.Mesh(g, mat); m.frustumCulled=false; escena.add(m); return m;
  };
  juntar(pizas, new THREE.MeshLambertMaterial({map:T_PIZA, side:THREE.DoubleSide}));
  juntar(mad1, M_MAD1);
  juntar(mad2, M_MAD2);
}
const AULA_CLASE=AULAS[0];
const CLASE_I=AULA_SITIO[1].i, CLASE_J=AULA_SITIO[1].jm;
const CLASE_X=AULA_SITIO[1].x, CLASE_Z=ZC(CLASE_J);

/* ---------- LOS OCHO LIBROS ----------
   Flotan a un costado, girando despacio. El de turno se pone al frente, grande, y en su tapa se
   dibuja la cuenta: la cuenta va en una TEXTURA y no en HTML porque tiene que estar en el mundo —
   pegada al libro, girando con el— y porque asi no hay que traducir un numero. */
/* UN SOLO LIBRO Y NO OCHO. Antes habia un libro por cuenta y las ocho cuentas eran de la misma
   aula, asi que ocho grupos de tres mallas dormidos esperando su turno. Ahora hay un libro por
   AULA —eso pidio el usuario— y las tres cuentas del aula se dibujan sobre la misma tapa: un libro
   que cambia de pagina es exactamente lo que hace un libro. */
const CUENTAS_AULA=3;
const LIBROS_N=1;
const LIBROS=[];
function texCuenta(txt){
  return tex(256,256,(g,w,h)=>{
    g.fillStyle='#f2efe6'; g.fillRect(0,0,w,h);
    g.strokeStyle='#c0392b'; g.lineWidth=6; g.strokeRect(12,12,w-24,h-24);
    g.fillStyle='#1b1b1f'; g.textAlign='center'; g.textBaseline='middle';
    const f = txt.length>5? 62 : 82;
    g.font='900 '+f+'px ui-sans-serif,system-ui,Arial';
    g.fillText(txt, w/2, h*0.46);
    g.font='900 30px ui-sans-serif,system-ui,Arial';
    g.fillStyle='#c0392b'; g.fillText('= ?', w/2, h*0.76);
  }, 1, 1, false);
}
const M_TAPA=new THREE.MeshLambertMaterial({color:0x2b6cd4});
const M_HOJAS=new THREE.MeshLambertMaterial({color:0xf2efe6});
for(let k=0;k<LIBROS_N;k++){
  const g=new THREE.Group();
  const tapa=new THREE.Mesh(new THREE.BoxGeometry(0.50,0.66,0.07), M_TAPA);
  const hojas=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.61,0.06), M_HOJAS);
  hojas.position.z=0.03;
  const cara=new THREE.Mesh(new THREE.PlaneGeometry(0.46,0.60),
                            new THREE.MeshLambertMaterial({color:0xffffff}));
  cara.position.z=0.075;
  g.add(tapa); g.add(hojas); g.add(cara);
  g.visible=false;
  escena.add(g);
  LIBROS.push({ g, cara, hecho:false, giro:k*0.7 });
}

/* =========================================================================================
   LOS BICHOS DEL PASILLO
   La actividad de en medio: entre un aula y la siguiente aparecen bichos flotando y hay que
   reventarlos haciendo PINZA con la mano encima de cada uno (o tocandolos, si no hay camara).

   POR QUE VAN INSTANCIADOS. Un bicho creible son nueve piezas —cuerpo, cabeza, seis patas, dos
   antenas, dos ojos—; seis bichos sueltos serian cincuenta y cuatro mallas, o sea cincuenta y cuatro
   llamadas de dibujo en un juego que dibuja la escuela entera con una. Fundido, un bicho es UNA
   geometria, y seis bichos son UN InstancedMesh: dos llamadas en total contando los ojos, haya uno
   o haya seis. Reventar un bicho es ponerle la escala en cero, no borrar nada.

   Y LOS OJOS VAN EN OTRA MALLA A PROPOSITO: son lo unico del bicho que tiene que verse a oscuras y
   de lejos —es el aviso de "hay algo ahi"— asi que van con material propio, sin luz. Con el mismo
   material que el cuerpo un bicho a cuatro metros es una mancha marron y no se sabe para donde mira.
   ========================================================================================= */
const BICHOS_MAX=6, ESQ_MAX=54;
const bichoGeo=(()=>{
  const ps=[];
  const cuerpo=new THREE.IcosahedronGeometry(0.17,0);
  cuerpo.scale(1.05,0.78,1.25); ps.push(cuerpo);
  const cab=new THREE.SphereGeometry(0.105,8,6); cab.translate(0,0.02,0.20); ps.push(cab);
  for(const sx of [-1,1]) for(const [dz,ang] of [[0.10,0.5],[-0.02,0.0],[-0.14,-0.5]]){
    const p=new THREE.BoxGeometry(0.022,0.022,0.26);
    p.rotateX(Math.PI/2.6); p.rotateY(sx*(1.15+ang));
    p.translate(sx*0.13, -0.06, dz); ps.push(p);
  }
  for(const sx of [-1,1]){
    const an=new THREE.BoxGeometry(0.016,0.15,0.016);
    an.rotateZ(sx*0.42); an.rotateX(-0.30);
    an.translate(sx*0.055, 0.13, 0.20); ps.push(an);
  }
  /* TODAS SIN INDICE ANTES DE FUNDIR. IcosahedronGeometry viene NO indexada y BoxGeometry y
     SphereGeometry vienen indexadas, y mergeGeometries no acepta la mezcla: tira "make sure index
     attribute exists among all geometries, or in none of them" y devuelve null, o sea que el bicho
     se quedaba sin geometria y no se dibujaba nada. Se lleva todo al mismo lado y no al otro porque
     desindexar es una operacion que siempre existe; reindexar hay que calcularla. */
  const pl=ps.map(p=>p.index? p.toNonIndexed() : p);
  const g=mergeGeometries(pl,false);
  for(const p of ps) p.dispose();
  return g;
})();
const ojosGeo=(()=>{
  const ps=[];
  for(const sx of [-1,1]){ const o=new THREE.SphereGeometry(0.040,7,5);
    o.translate(sx*0.050, 0.055, 0.275); ps.push(o); }
  const g=mergeGeometries(ps,false); for(const p of ps) p.dispose(); return g;
})();
const bichoMalla=new THREE.InstancedMesh(bichoGeo, new THREE.MeshLambertMaterial({color:0x2a2118}), BICHOS_MAX);
const bichoOjos=new THREE.InstancedMesh(ojosGeo, new THREE.MeshBasicMaterial({color:0xff3a1e}), BICHOS_MAX);
for(const m of [bichoMalla, bichoOjos]){
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled=false; m.visible=false; escena.add(m);
}
const esqGeo=new THREE.TetrahedronGeometry(0.062,0);
const esqMalla=new THREE.InstancedMesh(esqGeo, new THREE.MeshLambertMaterial({color:0x6f3a1c}), ESQ_MAX);
esqMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
esqMalla.frustumCulled=false; esqMalla.visible=false; escena.add(esqMalla);

/* =========================================================================================
   LAS OTRAS DOS ACTIVIDADES DE PASILLO

   Los bichos solos se gastan: siete tandas de lo mismo es una tanda repetida siete veces. Se agregan
   dos que piden algo DISTINTO de la mano, y eso es el criterio, no la variedad decorativa:

   - BICHOS: vienen hacia vos. Lo que se entrena es APUNTAR a un blanco que se mueve.
   - TIZAS: caen. Lo que se entrena es el TIEMPO — hay que llegar antes de que toquen el piso, y no
     importa que la tiza este quieta en x.
   - CASILLEROS: uno de los ocho tiembla. Lo que se entrena es ELEGIR: los ocho estan a la misma
     distancia y hay que pinzar el correcto, no el mas cercano.

   Las tres se juegan con la misma pinza y ninguna necesita un boton nuevo.
   ========================================================================================= */
const TIZAS_MAX=7;
const tizaGeo=(()=>{
  /* una tiza: un cilindro corto y gordo, con la punta gastada de un lado */
  const ps=[];
  /* 4,5 cm DE RADIO Y NO 3: una tiza de verdad mide 1 cm, pero a tres metros eso son OCHO PIXELES en
     un marco de 790 y con el filtro de baja calidad puesto desaparece. Es el mismo criterio que el
     radio del blanco: lo que tiene que costar es llegar a tiempo, no distinguir el objeto. */
  const c=new THREE.CylinderGeometry(0.045,0.045,0.26,9,1,false); ps.push(c);
  const p=new THREE.ConeGeometry(0.045,0.06,9); p.rotateX(Math.PI); p.translate(0,0.16,0); ps.push(p);
  /* la faja de papel del medio, que es lo que la hace leer a tiza y no a palito */
  const f=new THREE.CylinderGeometry(0.048,0.048,0.07,9,1,false); f.translate(0,-0.02,0); ps.push(f);
  const pl=ps.map(g=>g.index? g.toNonIndexed() : g);
  const g=mergeGeometries(pl,false); for(const q of ps) q.dispose(); return g;
})();
const tizaMalla=new THREE.InstancedMesh(tizaGeo,
  /* emissive bajo: la tiza cae en un pasillo beige y contra el piso beige un blanco mate se pierde.
     Con un pelo de emision se lee como algo que cae aunque este a contraluz. */
  new THREE.MeshLambertMaterial({color:0xfdfaf0, emissive:0x2a2620}), TIZAS_MAX);
tizaMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
tizaMalla.frustumCulled=false; tizaMalla.visible=false; escena.add(tizaMalla);

/* LOS CASILLEROS DE LA ACTIVIDAD son propios y no los del pasillo: los del pasillo estan fundidos en
   una malla con toda la escuela y no se pueden mover ni sacudir. Estos son ocho, instanciados, y se
   ponen delante del jugador cuando toca. */
/* CINCO Y NO OCHO, Y MAS LEJOS. Con ocho de 0,62 m cada 0,66 m el abanico medía 5,3 metros de ancho
   puesto a 3 m de la camara, donde solo entran 3,4: en pantalla no eran ocho casilleros, era UNA
   PARED ROJA de lado a lado tapando el pasillo — y encima 5,3 m no caben en un pasillo de 4,2. Cinco
   cada 0,76 m son 3,8 m de abanico a 4,4 de distancia: entran en el pasillo, entran en el cuadro con
   margen, y se ven separados, que es lo unico que hace que se puedan elegir de a uno. */
const CASILL_N=5;
const casillGeo=new THREE.BoxGeometry(0.56, 1.55, 0.30);
const casillMalla=new THREE.InstancedMesh(casillGeo,
  new THREE.MeshLambertMaterial({color:0xb2392c}), CASILL_N);
casillMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
casillMalla.frustumCulled=false; casillMalla.visible=false; escena.add(casillMalla);
casillMalla.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(CASILL_N*3), 3);
casillMalla.instanceColor.setUsage(THREE.DynamicDrawUsage);

/* =========================================================================================
   LO QUE HACE FALTA PARA LAS CUATRO ACTIVIDADES NUEVAS

   Y LA REGLA QUE MANDA SOBRE TODAS, QUE LA PIDIO EL JUGADOR: "la mano no puede ir mas lejos".
   Nada de esto se juega en profundidad. Todo blanco se PROYECTA A LA PANTALLA y se compara ahi, en
   fracciones del marco, igual que los bichos del primer pasillo: la mano se pone ENCIMA del objeto
   en la pantalla y listo. Que las piezas y los bloques sean objetos 3D es solo para que tengan
   perspectiva y sombra propia; la cuenta que decide si acertaste es siempre en dos dimensiones.
   ========================================================================================= */

/* ---------- EL ROMPECABEZAS: cuatro pedazos de una hoja arrancada ----------
   Un cuadrado partido en cuatro. Las piezas van con material BASICO y no Lambert a proposito: una
   pieza que se agarra y se arrastra tiene que verse igual mientras cruza la pantalla, y con luz
   difusa cambiaria de tono segun donde este —lo que se leeria como que la pieza cambia, no como que
   se movio. */
const ROMPE_MAX=4;
const rompeGeo=new THREE.PlaneGeometry(1,1);
const rompeMalla=new THREE.InstancedMesh(rompeGeo,
  new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.DoubleSide}), ROMPE_MAX);
rompeMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
rompeMalla.frustumCulled=false; rompeMalla.visible=false; escena.add(rompeMalla);
rompeMalla.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(ROMPE_MAX*3), 3);
rompeMalla.instanceColor.setUsage(THREE.DynamicDrawUsage);
/* LOS HUECOS SE DIBUJAN Y NO SE SUPONEN. Sin el hueco marcado, "ponela en su lugar" no quiere decir
   nada: el jugador ve cuatro pedazos flotando y ningun sitio donde ponerlos. */
const huecoMalla=new THREE.InstancedMesh(rompeGeo,
  new THREE.MeshBasicMaterial({color:0x14130f, transparent:true, opacity:0.68,
                               side:THREE.DoubleSide}), ROMPE_MAX);
huecoMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
huecoMalla.frustumCulled=false; huecoMalla.visible=false; escena.add(huecoMalla);

/* ---------- EL MUNDO NEON: LOS BLOQUES Y LA ESPADA ----------
   Los bloques van con material BASICO por la misma razon que las piezas y por una mas: en el mundo
   neon no hay luz. Un Lambert sin luz es negro, asi que lo unico que puede brillar es lo que trae su
   color puesto. */
const BLOQUE_MAX=12;
const bloqueGeo=(()=>{
  /* el cubo mas un marco apenas mas grande: el marco es lo que le da el borde encendido que hace que
     se lea a neon y no a caja de color */
  const ps=[];
  const c=new THREE.BoxGeometry(0.52,0.52,0.52); ps.push(c);
  const m=new THREE.BoxGeometry(0.60,0.60,0.10); ps.push(m);
  const pl=ps.map(g=>g.index? g.toNonIndexed() : g);
  const g=mergeGeometries(pl,false); for(const q of ps) q.dispose(); return g;
})();
const bloqueMalla=new THREE.InstancedMesh(bloqueGeo,
  new THREE.MeshBasicMaterial({color:0xffffff}), BLOQUE_MAX);
bloqueMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
bloqueMalla.frustumCulled=false; bloqueMalla.visible=false; escena.add(bloqueMalla);
bloqueMalla.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(BLOQUE_MAX*3), 3);
bloqueMalla.instanceColor.setUsage(THREE.DynamicDrawUsage);

/* LA ESPADA. Dos, porque en el ultimo pasillo hay una por mano. */
const espadaGeo=(()=>{
  const ps=[];
  /* LAS PROPORCIONES SE CORRIGIERON MIRANDO: con la hoja en 0,90 y la guarda en 0,20 —o sea la
     guarda casi cuatro veces mas ancha que la hoja— y ademas con la espada escorzada hacia adentro
     de la pantalla, lo que se veia no era una espada sino un MARTILLO: un palo corto con un travesaño
     gordo arriba. La hoja se alarga a 1,25 y la guarda se angosta a 0,13. */
  const h=new THREE.BoxGeometry(0.062,0.062,1.25); h.translate(0,0,-0.70); ps.push(h);  // la hoja
  const g2=new THREE.BoxGeometry(0.13,0.042,0.05); ps.push(g2);                          // la guarda
  const p=new THREE.BoxGeometry(0.055,0.055,0.18); p.translate(0,0,0.10); ps.push(p);    // el puño
  const pl=ps.map(g=>g.index? g.toNonIndexed() : g);
  const g=mergeGeometries(pl,false); for(const q of ps) q.dispose(); return g;
})();
const espadaMalla=new THREE.InstancedMesh(espadaGeo,
  new THREE.MeshBasicMaterial({color:0x9ef7ff}), 2);
espadaMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
espadaMalla.frustumCulled=false; espadaMalla.visible=false; escena.add(espadaMalla);

/* ---------- LOS GLOBOS ---------- */
const GLOBO_MAX=7;
const globoGeo=(()=>{
  const ps=[];
  const b=new THREE.SphereGeometry(0.26,12,9); b.scale(1,1.18,1); ps.push(b);
  const n=new THREE.ConeGeometry(0.07,0.12,7); n.rotateX(Math.PI); n.translate(0,-0.30,0); ps.push(n);
  const pl=ps.map(g=>g.index? g.toNonIndexed() : g);
  const g=mergeGeometries(pl,false); for(const q of ps) q.dispose(); return g;
})();
const globoMalla=new THREE.InstancedMesh(globoGeo,
  new THREE.MeshLambertMaterial({color:0xffffff, emissive:0x2e2e2e}), GLOBO_MAX);
globoMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
globoMalla.frustumCulled=false; globoMalla.visible=false; escena.add(globoMalla);
globoMalla.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(GLOBO_MAX*3), 3);
globoMalla.instanceColor.setUsage(THREE.DynamicDrawUsage);

/* ---------- LA REJILLA DEL MUNDO NEON ----------
   Un tunel de lineas. Va de lineas y no de cajas porque lo unico que tiene que hacer es dar
   VELOCIDAD: al venir los bloques hacia vos, las lineas que pasan al costado son lo que dice cuanto
   te estas moviendo. Con paredes llenas no se nota el avance. */
const neonGrupo=new THREE.Group(); neonGrupo.visible=false; escena.add(neonGrupo);
/* SE CONSTRUYE CON EL PISO EN y=0 Y HACIA -Z, y despues se PLANTA en el jugador (ver neonPoner):
   armado alrededor del origen del mundo, el tunel le quedaba al jugador abajo y de costado, porque el
   pasillo donde cae la actividad esta a treinta metros del origen. Un tunel que no esta centrado en
   vos no se lee como un lugar en el que estas parado, se lee como un dibujo suelto en el fondo. */
(()=>{
  const pts=[];
  const L=46, W=3.2, PISO=0.02, TECHO=3.5;
  for(let k=0;k<=23;k++){                       // los aros del tunel
    const z=-k*(L/23);
    pts.push(-W,PISO,z,  W,PISO,z);
    pts.push(-W,TECHO,z, W,TECHO,z);
    pts.push(-W,PISO,z, -W,TECHO,z);
    pts.push( W,PISO,z,  W,TECHO,z);
  }
  for(const x of [-W,-W*0.5,0,W*0.5,W]){        // las lineas que corren al fondo
    pts.push(x,PISO ,0, x,PISO ,-L);
    pts.push(x,TECHO,0, x,TECHO,-L);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
  const l=new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:0x2de3ff, transparent:true,
                                                                 opacity:0.55}));
  l.frustumCulled=false; neonGrupo.add(l);
})();
/* EL COLEGIO SE APAGA POR LISTA NEGRA Y NO POR LISTA BLANCA, y la diferencia importa: si la lista
   fuera de lo que hay que apagar, cada malla nueva que se agregue al juego aparecera flotando en el
   mundo neon y nadie se va a acordar de agregarla. Se apaga TODO lo que estaba encendido y se anota
   que se apago, asi volver es exacto. */
/* EL TUNEL SE PLANTA DONDE ESTA EL JUGADOR Y MIRANDO A DONDE MIRA. El rumbo es el mismo que ya se
   calcula para soltar los bichos —el final del tramo que queda por caminar— asi que el tunel corre
   en la direccion en la que el pasillo seguia. Y va con +PI porque el tunel esta construido hacia su
   -Z local, mientras que en este juego un rumbo g apunta a (sin g, cos g), o sea al +Z. */
function neonPoner(x, z, rumbo){
  neonGrupo.position.set(x, 0, z);
  neonGrupo.rotation.y = rumbo + Math.PI;
}
let _neonGuardado=null;
function neonVer(on){
  if(on && !_neonGuardado){
    _neonGuardado=[];
    for(const o of escena.children){
      if(o===neonGrupo || o===bloqueMalla || o===espadaMalla || o===esqMalla) continue;
      if(o.isLight) continue;                    // las luces no molestan y apagarlas apagaria las manos
      if(o.visible){ _neonGuardado.push(o); o.visible=false; }
    }
    neonGrupo.visible=true;
  } else if(!on && _neonGuardado){
    for(const o of _neonGuardado) o.visible=true;
    _neonGuardado=null; neonGrupo.visible=false;
  }
}
