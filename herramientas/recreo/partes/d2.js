
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
const AULA_CLASE=AULAS[5];                       // cols 7..9, filas 11..15
const CLASE_I=8, CLASE_J=13;                     // el centro del aula
const CLASE_X=XC(CLASE_I), CLASE_Z=ZC(CLASE_J);

/* el pizarron: un verde oscuro con marco de madera y tiza. Va contra la pared de la fila 16. */
const T_PIZA=tex(256,128,(g,w,h)=>{
  g.fillStyle='#2f4f3a'; g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,0.05)';
  for(let k=0;k<40;k++){ const x=Math.random()*w, y=Math.random()*h;
    g.fillRect(x,y, 8+Math.random()*30, 1); }
  g.strokeStyle='rgba(255,255,255,0.10)'; g.lineWidth=1;
  g.beginPath(); g.moveTo(0,h*0.5); g.lineTo(w,h*0.5); g.stroke();
}, 1, 1, false);
{
  const zP=ZC(16)-CEL/2+GRUESO/2+0.02;
  /* EL MARCO VA DETRAS DE LA PIZARRA Y NO DELANTE, y esto se vio en una foto: el marco estaba a
     zP-0,03 y la pizarra a zP+0,03, o sea que desde la camara —que esta a menor Z— el marco tapaba
     la pizarra entera y el aula tenia un rectangulo de madera en la pared. Tres centimetros.
     Y la pizarra va a DOS CARAS: un PlaneGeometry mira a su +Z, y girarlo con FrontSide lo deja
     invisible desde este lado. Con DoubleSide no hay lado equivocado posible. */
  const marcoP=new THREE.Mesh(new THREE.BoxGeometry(CEL*2.5+0.34, 2.02, 0.10),
                              new THREE.MeshLambertMaterial({color:0x8f6a3c}));
  marcoP.position.set(CLASE_X, 1.90, zP+0.06); escena.add(marcoP);
  const piza=new THREE.Mesh(new THREE.PlaneGeometry(CEL*2.5, 1.86),
                            new THREE.MeshLambertMaterial({map:T_PIZA, side:THREE.DoubleSide}));
  piza.position.set(CLASE_X, 1.90, zP-0.02); escena.add(piza);
  /* la bandeja de la tiza, que es lo que hace que se lea a pizarron de escuela */
  const band=new THREE.Mesh(new THREE.BoxGeometry(CEL*2.5, 0.07, 0.16),
                            new THREE.MeshLambertMaterial({color:0x8f6a3c}));
  band.position.set(CLASE_X, 0.94, zP-0.08); escena.add(band);
}
/* EL ESCRITORIO. El se para DEL OTRO LADO, entre el escritorio y el pizarron: es la posicion de un
   maestro y ademas pone una mesa entre el jugador y el, que es lo que hace que la escena se lea a
   clase y no a persecucion. */
{
  /* EL ESCRITORIO VA CONTRA EL PIZARRON Y NO EN EL MEDIO DEL AULA. El aula mide cinco celdas, o sea
     21 metros de fondo: con el escritorio en el centro y la camara en la puerta, el personaje queda
     a doce metros y en un marco vertical se ve del tamano de un dedo. Toda la escena se corre al
     fondo —pizarron a 27,3, el a 25,0, la mesa a 23,3— y la camara termina a 21,4: tres metros y
     medio, que es la distancia a la que una persona te habla. */
  const zE=23.6;
  const tapa=new THREE.Mesh(new THREE.BoxGeometry(2.60,0.11,1.10),
                            new THREE.MeshLambertMaterial({color:0x8f6a3c}));
  tapa.position.set(CLASE_X, 0.86, zE); escena.add(tapa);
  const frente=new THREE.Mesh(new THREE.BoxGeometry(2.60,0.74,0.09),
                              new THREE.MeshLambertMaterial({color:0x7d5c34}));
  frente.position.set(CLASE_X, 0.45, zE-0.50); escena.add(frente);
  for(const sx of [-1,1]){
    const lat=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.74,1.10),
                             new THREE.MeshLambertMaterial({color:0x7d5c34}));
    lat.position.set(CLASE_X+sx*1.25, 0.45, zE); escena.add(lat);
  }
}

/* ---------- LOS OCHO LIBROS ----------
   Flotan a un costado, girando despacio. El de turno se pone al frente, grande, y en su tapa se
   dibuja la cuenta: la cuenta va en una TEXTURA y no en HTML porque tiene que estar en el mundo —
   pegada al libro, girando con el— y porque asi no hay que traducir un numero. */
const LIBROS_N=8;
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
