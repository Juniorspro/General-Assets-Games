
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

/* ===================== QUIEN PROYECTA Y QUIEN RECIBE =====================
   La regla es una sola y esta escrita al reves de lo que uno esperaria: PROYECTA TODO MENOS la
   escuela y las manos.

   - LA ESCUELA NO PROYECTA. Paredes, pisos y techos son tres mallas fundidas con frustumCulled=false,
     asi que ponerlas a proyectar significa redibujar las 16 mil caras del colegio entero en la pasada
     de sombra en CADA cuadro, y con la luz cayendo casi de arriba la sombra que se ganaria es la de
     una pared sobre si misma. Reciben, que es lo que importa: la sombra del profesor cae en el piso.
   - EL TECHO NO RECIBE y no se puede: es MeshBasicMaterial, sin luz, justamente para que no le
     quede el color de suelo de la hemisferica.
   - LAS MANOS NO PROYECTAN. Estan reconstruidas sobre el rayo de pantalla, o sea a medio metro del
     ojo: su sombra seria una mancha de tres metros tapando el pasillo.
   Se vuelve a llamar cuando entra Baldi, porque su modelo llega despues por la red. */
const SIN_SOMBRA=new Set();
function marcarSinSombra(o){ if(o) SIN_SOMBRA.add(o); }
function aplicarSombras(tam){
  const on=!!tam;
  render.shadowMap.enabled=on;
  /* EL MAPA DE SOMBRA SE REDIBUJA UNA VEZ CADA DOS CUADROS, y esto salio de medir la basura por
     cuadro: el dibujo sin sombra aloja 548 bytes y con sombra 1.165, o sea que la pasada de sombra
     —que arma su propia lista de render— cuesta 616 bytes por cuadro, 37 KB por segundo tirados a
     la basura. Y no hace falta a 60: es una sombra de CONTACTO de una figura que camina a 3,4 m/s,
     asi que a 30 se mueve dos centimetros por actualizacion. Con autoUpdate en false, three.js solo
     la redibuja cuando se le pide. */
  render.shadowMap.autoUpdate=false;
  luzS.castShadow=on;
  luzS.intensity=on? 0.55 : 0;
  if(on && luzS.shadow.mapSize.width!==tam){
    luzS.shadow.mapSize.set(tam,tam);
    if(luzS.shadow.map){ luzS.shadow.map.dispose(); luzS.shadow.map=null; }
  }
  const recibe=new Set([escuela.paredes, escuela.pisos, escuela.lockers]);
  escena.traverse(o=>{
    if(!o.isMesh && !o.isInstancedMesh) return;
    if(SIN_SOMBRA.has(o)){ o.castShadow=false; o.receiveShadow=false; return; }
    if(o===escuela.techos){ o.castShadow=false; o.receiveShadow=false; return; }
    o.receiveShadow=on;
    o.castShadow=on && !recibe.has(o) ? true : (on && o===escuela.lockers);
  });
}

/* ---------- YA NO HAY PUERTAS ----------
   Estaban aca: una hoja por aula, cada una girando sobre su marco, con su material y su sonido. Se
   fueron enteras con el pedido —"que no hayan puertas asi el juego es mas rapido"— y con ellas se
   fue la unica malla del edificio que se movia. Lo que queda es la boca abierta del salon.

   TAPA POR FUERA DE CADA SALIDA. La celda de una salida es pasillo, asi que el constructor de
   paredes no levanta pared ahi, y del otro lado de la reja del mapa NO HAY NADA: mirando el pasillo
   de punta a punta se veia un agujero negro al fondo —medido en una captura de 790x1400, unos 90 px
   de lado a 42 m, o sea los 4,2 m enteros de la celda—. Dos paneles pegados por fuera y el pasillo
   vuelve a terminar en algo.
   SE DECLARA ANTES DEL BUCLE QUE LO USA. Un `let` leido antes de su linea no rompe una funcion:
   rompe el modulo entero antes de la primera instruccion. Es la quinta vez en este proyecto. */
let _tapaOeste=null;
for(const p of SALIDAS){
  const fuera=(p.i===0)? -1 : 1;
  const tapa=new THREE.Mesh(new THREE.BoxGeometry(CEL*0.5, ALTO_M, CEL), M_PARED);
  tapa.position.set(XC(p.i)+fuera*CEL*0.62, ALTO_M/2, ZC(p.j));
  if(p.i===0) _tapaOeste=tapa;      // la del oeste se saca al salir: por ahi se va al autobus
  escena.add(tapa);
}

/* ===================== UN COLOR POR SALON =====================
   Pedido: "mejores colores". El colegio entero era beige: pared beige, piso beige, techo beige y
   madera marron. Con las fotos gano textura pero seguia siendo una escala de arena, y en un pasillo
   con ocho bocas iguales eso tiene un costo que no es solo estetico — no hay forma de saber en cual
   estas parado.

   Cada salon estrena un dintel de su color cruzando la boca, a la altura del techo. Es una viga y
   no un cartel a proposito: se ve desde el otro extremo del pasillo, se ve de reojo al pasar, y no
   hay que leer nada. Los ocho colores estan bajados de saturacion (se mezclan con el beige de la
   pared) porque el filtro del juego SUMA saturacion: puestos a plena pureza el pasillo se leia a
   parque de diversiones y no a escuela.

   VAN EN UNA SOLA MALLA CON COLOR POR VERTICE. Ocho materiales serian ocho llamadas de dibujo para
   ocho cajas; con el color metido en la geometria son una. */
const AULA_COLOR=[0xc25a4e, 0xd08a3c, 0xc7b03e, 0x6ea355,
                  0x4f9c98, 0x4a7bb5, 0x8a6aad, 0xc06a90];
{
  const gs=[], base=new THREE.Color();
  AULAS.forEach((a,k)=>{
    const c=new THREE.Color(AULA_COLOR[k % AULA_COLOR.length]);
    /* mezclado con el beige de la pared: el filtro de saturacion del juego los subiria a puro */
    base.setHex(0xd8cbb0); c.lerp(base, 0.30);
    const anc=(a.i1-a.i0+1)*CEL;
    const zB=ZC(a.boca[1]) + a.dir*CEL/2;      // el borde entre el pasillo y el salon
    const g=new THREE.BoxGeometry(anc, 0.52, 0.34);
    g.translate(XC(Math.round((a.i0+a.i1)/2)), ALTO_M-0.26, zB);
    const n=g.attributes.position.count, col=new Float32Array(n*3);
    for(let i=0;i<n;i++){ col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col,3));
    gs.push(g);
  });
  const g=mergeGeometries(gs,false); for(const q of gs) q.dispose();
  const m=new THREE.Mesh(g, new THREE.MeshLambertMaterial({vertexColors:true}));
  m.frustumCulled=false; escena.add(m);
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
const M_PIZA=new THREE.MeshLambertMaterial({map:T_PIZA, side:THREE.DoubleSide});
const M_ASFALTO=new THREE.MeshLambertMaterial({color:0x53535a});
const M_PASTO=new THREE.MeshLambertMaterial({color:0x6b8a3f});
const M_FACHADA=new THREE.MeshLambertMaterial({color:0xe2d5b6});
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
    /* TODO MULTIPLICADO POR dir. Antes estas cinco lineas tenian metida la suposicion de que a un
       aula se entra siempre por el norte: el fondo era j1+1 y el profesor la fila j1, y punto. Con
       cuatro salones a cada lado de un mismo pasillo, los del norte se entran POR EL SUR y las cinco
       cuentas se dan vuelta. dir es +1 entrando por el norte y -1 entrando por el sur, y con eso la
       misma formula sirve para los ocho. */
    const D=a.dir;
    const jFondo=(D>0)? a.j1+1 : a.j0-1;
    const jProfe=(D>0)? a.j1 : a.j0;
    const F=ZC(jFondo)-D*CEL/2;
    const zPiza=F-D*0.115;
    const zProfe=ZC(jProfe);
    const zEsc=zProfe-D*1.60;
    const zCam=zProfe-D*2.35;
    AULA_SITIO[a.n]={ n:a.n, x:xC, i:Math.round((a.i0+a.i1)/2), zPiza, zProfe, zEsc, zCam, dir:D,
                      /* de que lado mira cada uno: el profesor al jugador y la camara al profesor */
                      giroProfe:(D>0)? Math.PI : 0, giroCam:(D>0)? 0 : Math.PI,
                      jCam:zCam/CEL+(GH-1)/2, jm:Math.round((a.j0+a.j1)/2), j0:a.j0, j1:a.j1,
                      jPrim:(D>0)? a.j0 : a.j1, boca:a.boca };
    /* EL MARCO VA DETRAS DE LA PIZARRA Y NO DELANTE, y esto se vio en una foto: el marco estaba a
       zP-0,03 y la pizarra a zP+0,03, o sea que desde la camara —que esta a menor Z— el marco tapaba
       la pizarra entera y el aula tenia un rectangulo de madera en la pared. Tres centimetros. */
    caja(mad1, CEL*2.5+0.34, 2.02, 0.10, xC, 1.90, F-D*0.05);
    caja(mad1, CEL*2.5, 0.07, 0.16, xC, 0.94, F-D*0.14);         // la bandeja de la tiza
    /* la pizarra: un plano, y el material va a DOS CARAS — un PlaneGeometry mira a su +Z y girarlo
       con FrontSide lo deja invisible desde este lado. Con DoubleSide no hay lado equivocado. */
    const pl=new THREE.PlaneGeometry(CEL*2.5, 1.86);
    pl.translate(xC, 1.90, zPiza); pizas.push(pl);
    /* EL ESCRITORIO. El se para DEL OTRO LADO, entre el escritorio y el pizarron: es la posicion de
       un maestro y ademas pone una mesa entre el jugador y el, que es lo que hace que la escena se
       lea a clase y no a persecucion. */
    caja(mad1, 2.60, 0.11, 1.10, xC, 0.86, zEsc);
    caja(mad2, 2.60, 0.74, 0.09, xC, 0.45, zEsc-D*0.50);
    for(const sx of [-1,1]) caja(mad2, 0.09, 0.74, 1.10, xC+sx*1.25, 0.45, zEsc);
  }
  const juntar=(lista, mat)=>{
    if(!lista.length) return null;
    const g=mergeGeometries(lista,false);
    for(const q of lista) q.dispose();
    const m=new THREE.Mesh(g, mat); m.frustumCulled=false; escena.add(m); return m;
  };
  juntar(pizas, M_PIZA);
  juntar(mad1, M_MAD1);
  juntar(mad2, M_MAD2);
}
/* ===================== LAS NUEVE FOTOS ENTRAN ACA =====================
   Se pisan los materiales una vez que TODOS existen, y no cada uno en su linea: los del patio nacen
   dentro de un IIFE cien lineas mas abajo, asi que repartir las llamadas garantizaba olvidarse de
   una. Los multiplicadores de repeticion corrigen la escala fisica y estan explicados uno por uno,
   porque un numero suelto aca es un ladrillo de veinte centimetros dentro de seis meses. */
{
  /* PISO: la UV horneada da 2 baldosas por celda, o sea una foto cada 2,1 m. La foto trae 8x8
     cuadros → 26 cm cada uno, que es lo que mide una baldosa de vinilico. Va con NEAREST porque las
     baldosas del original se ven a bloques y suavizarlas le saca justamente eso. */
  fotoEn(M_PISO, 'piso', 1, 1, true);
  /* PARED: 1,9 x 1,5 horneado sobre 4,2 x 3,6 m. Con repeticion 1 cada hilada de ladrillo media
     22 cm; a 2 x 2 quedan 5,5 cm, que es un ladrillo. */
  fotoEn(M_PARED, 'pared', 2, 2, false);
  /* TECHO: la placa acustica de verdad mide 60 cm. La foto trae 6 filas por tile y el tile horneado
     mide 2,1 m → 35 cm. A 0,6 quedan 58. */
  fotoEn(M_TECHO, 'techo', 0.6, 0.6, false);
  /* LOCKER: la foto son CUATRO lockers de frente, o sea un tile = 4 de ancho y 1 de alto. Un banco
     de 3,28 m tiene once lockers de 30 cm, asi que la UV final tiene que dar 11/4 = 2,75 de ancho y
     1 de alto; horneada viene 2,98 x 1,4. De ahi 0,92 y 0,71. */
  fotoEn(M_LOCKER, 'locker', 0.92, 0.71, false);
  /* PIZARRON: un PlaneGeometry con UV 0..1, y la foto es una pizarra entera. Uno a uno. */
  fotoEn(M_PIZA, 'piza', 1, 1, false);
  /* MADERA: los escritorios son cajas con UV 0..1 por cara, o sea que una tabla de 2,6 m mostraria
     la foto entera estirada. A 2 x 2 la veta queda a escala. Y se les saca el tinte marron: el
     color multiplicaba a la foto y la dejaba color barro. Y despues BAJO otra vez: con 0xd8c39f el
     escritorio en primer plano salia naranja fuerte —la foto ya es calida y el filtro de saturacion
     le suma— y en un aula beige el mueble no puede ser lo mas saturado del cuadro. */
  M_MAD1.color.setHex(0xbdb49f); M_MAD2.color.setHex(0x9d9583);
  fotoEn(M_MAD1, 'madera', 2, 2, false);
  fotoEn(M_MAD2, 'madera', 2, 2, false);
  /* ASFALTO Y PASTO: planos de 60 x 100 y 60 x 70 con UV 0..1. A 30 y 20 repeticiones cada tile
     mide 2 y 3 metros. Y sin tinte, que la foto ya trae el color. */
  /* EL ASFALTO LLEVA UN TINTE FRIO Y LA FOTO ES GRIS NEUTRO. No es corregir la foto: la hemisferica
     de este juego tiene el cielo en 0xfff6e2 —crema— porque adentro imita tubos fluorescentes
     calidos, y encima el filtro del juego sube la saturacion. Un gris neutro bajo esa luz sale
     arena: en la captura el patio parecia una playa. */
  M_ASFALTO.color.setHex(0x9aa2ad); fotoEn(M_ASFALTO, 'asfalto', 30, 30, false);
  M_PASTO.color.setHex(0xffffff);   fotoEn(M_PASTO, 'pasto', 20, 20, false);
  /* FACHADA: el paño largo mide 37,8 x 4,15 m con UV 0..1, asi que la repeticion no puede ser la
     misma en los dos ejes; 12 x 2 deja el ladrillo cuadrado en la cara grande, que es la unica que
     se ve desde la vereda. */
  M_FACHADA.color.setHex(0xffffff); fotoEn(M_FACHADA, 'fachada', 12, 2, false);
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

/* =========================================================================================
   LA TABLETA CON OJOS: lo que se entrena es DIBUJAR

   Reemplaza a la espada y a los bloques neon, que el jugador saco: "el de los laseres con la espada
   saca nomas, no me gusta; agrega otros mas simple, como una tableta con ojos donde debes escribir o
   dibujar algo que te pida, como un circulo, y eso con el pinch".

   TODO SE DIBUJA CON DOS MALLAS Y NADA MAS, y eso no es prolijidad: es la razon por la que esta
   actividad no cuesta nada. El cuerpo y la pantalla son dos cuadrados instanciados; los ojos, las
   pupilas, los puntos de la forma pedida y el trazo del jugador son TODOS discos de la misma malla
   instanciada. Sean cuatro puntos o ciento veinte, son DOS llamadas de dibujo.
   ========================================================================================= */
const tabGeo=new THREE.PlaneGeometry(1,1);
const tabMalla=new THREE.InstancedMesh(tabGeo,
  new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.DoubleSide}), 2);
tabMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
tabMalla.frustumCulled=false; tabMalla.visible=false; escena.add(tabMalla);
tabMalla.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(2*3), 3);
tabMalla.instanceColor.setUsage(THREE.DynamicDrawUsage);

/* UN SOLO DISCO PARA TODO LO REDONDO. 14 lados y no 24: a estos tamaños en pantalla la diferencia no
   se ve, y son diez triangulos menos por instancia sobre ciento y pico de instancias. */
const DISCO_MAX=136;
const discoGeo=new THREE.CircleGeometry(0.5, 14);
const discoMalla=new THREE.InstancedMesh(discoGeo,
  new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.DoubleSide}), DISCO_MAX);
discoMalla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
discoMalla.frustumCulled=false; discoMalla.visible=false; escena.add(discoMalla);
discoMalla.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(DISCO_MAX*3), 3);
discoMalla.instanceColor.setUsage(THREE.DynamicDrawUsage);

/* =========================================================================================
   EL AFUERA: EL PATIO Y EL AUTOBUS DEL FINAL

   Todo el juego pasa adentro de un edificio sin ventanas, asi que salir es el unico cambio de lugar
   que tiene — y por eso vale la pena que se vea distinto de verdad y no solo "otro pasillo".

   Va colgado de UN grupo que arranca apagado y se enciende al terminar la ultima clase: mientras no se
   usa no cuesta ni una llamada de dibujo. Y se planta en la salida oeste del pasillo del medio, que es
   una de las dos puertas que el mapa ya tenia marcadas como salida.
   ========================================================================================= */
const afueraGrupo=new THREE.Group(); afueraGrupo.visible=false; escena.add(afueraGrupo);
let busMalla=null;   // se expone para poder MEDIR el encuadre en pixeles, no estimarlo
/* DONDE PARA EL AUTOBUS, y el numero sale de una medicion y no del ojo. A nueve metros de la camara
   su costado de nueve metros proyectaba el 101,6% del ancho del cuadro: o sea cortado por los dos
   lados, que en una captura se lee como "esta demasiado cerca". Corrido a x = -66 quedan 12,5 m
   hasta la parada de la camara y el autobus entra entero con margen. */
const _salO=SALIDAS.find(q=>q.i===0)||SALIDAS[0];
const BUS_X=XC(0)-CEL/2-17.7, BUS_Z=ZC(_salO.j)-2.0;
(()=>{
  /* el suelo: asfalto con un pasto al fondo. Dos planos y no una textura, porque a esta distancia y
     con el filtro de baja calidad puesto un degrade no se distinguiria de un color plano */
  /* EL SUELO EMPIEZA DONDE TERMINA EL COLEGIO Y NO ANTES. Centrado en el medio del mapa, el asfalto
     quedaba a 2 cm POR ENCIMA del piso de la escuela y lo tapaba entero. La pared oeste esta en
     x = -46, asi que el patio va de -105 a -45. */
  const asf=new THREE.Mesh(new THREE.PlaneGeometry(60, 100), M_ASFALTO);
  asf.rotation.x=-Math.PI/2; asf.position.set(XC(0)-CEL/2-26.7, 0.02, ZC(_salO.j));
  afueraGrupo.add(asf);
  const pasto=new THREE.Mesh(new THREE.PlaneGeometry(60, 70), M_PASTO);
  pasto.rotation.x=-Math.PI/2; pasto.position.set(XC(0)-CEL/2-26.7, 0.01, ZC(_salO.j)-78);
  afueraGrupo.add(pasto);
  /* EL AUTOBUS, EN DOS MALLAS FUNDIDAS Y NO EN UNA, Y ESA ES LA DIFERENCIA ENTRE UN AUTOBUS Y UN
     CAJON AMARILLO. Con todo en una sola malla el material es uno solo, asi que LAS RUEDAS SALIAN
     AMARILLAS — y eso es exactamente lo que se veia en la captura: un ladrillo amarillo con cuatro
     tacos amarillos abajo. Las dos mallas son "lo amarillo" y "lo oscuro" (ruedas, parachoques,
     franja de abajo y vidrios), o sea dos llamadas de dibujo para las mismas veinte piezas. */
  const ama=[], osc=[];
  const cj=(l,w,h,d,x,y,z)=>{ const g=new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); l.push(g); };
  /* medidas de un autobus escolar tipo C: 9 m de largo, 2,5 de ancho, 3,1 de alto al techo */
  cj(ama, 7.7, 2.05, 2.50,  -0.5, 1.62, 0);      // la caja de pasajeros
  cj(ama, 7.9, 0.30, 2.56,  -0.5, 2.78, 0);      // el techo, apenas mas ancho: da alero y canto
  cj(ama, 1.9, 1.35, 2.42,   3.6, 1.18, 0);      // el capot, mas bajo que la caja
  cj(ama, 0.5, 0.85, 2.30,   4.6, 1.72, 0);      // el parabrisas inclinado, resuelto con un bloque
  /* la franja negra DEBAJO de las ventanas: es la marca visual del autobus escolar. Va abajo y no
     arriba — arriba compite con el techo y el costado entero se lee oscuro. */
  cj(osc, 7.75, 0.22, 2.53, -0.5, 1.55, 0);
  cj(osc, 7.75, 0.26, 2.53, -0.5, 0.72, 0);      // el zocalo
  cj(osc, 9.2,  0.34, 2.20,  0.0, 0.62, 0);      // los parachoques, de punta a punta
  /* las ventanas: siete paños en vez de una franja corrida. Una tira sola se lee a visera; los cortes
     entre paño y paño son lo que da la escala de "acá adentro van chicos sentados". */
  for(let k=0;k<7;k++) cj(osc, 0.92, 0.70, 2.545, -3.85+k*1.12, 2.06, 0);
  /* el parabrisas va DENTRO del bloque del frente, no envolviendolo: con 2,545 de fondo sobresalia
     por los dos costados y con el centro a 1,92 se pasaba por arriba, o sea una mancha oscura
     flotando delante del capot */
  cj(osc, 0.60, 0.62, 2.33,  4.60, 1.80, 0);
  /* la puerta, del lado que mira la camara, al lado del capot */
  cj(osc, 0.95, 1.66, 0.06,   2.35, 1.40, 1.27);
  for(const x of [-2.9, 2.9]) for(const z of [-1.10, 1.10]){
    const r=new THREE.CylinderGeometry(0.62,0.62,0.36,10);
    r.rotateZ(Math.PI/2); r.translate(x, 0.62, z); osc.push(r);
  }
  const fundir=(l, mat)=>{
    const pl=l.map(g=>g.index? g.toNonIndexed() : g);
    const m=new THREE.Mesh(mergeGeometries(pl,false), mat);
    for(const q of l) q.dispose();
    m.frustumCulled=false;
    /* DE COSTADO Y NO DE CULATA. Con el eje largo en X y la camara llegando desde el este, lo que se
       veia era la trasera: un cuadrado amarillo de tres por dos y medio, que no se lee a autobus.
       Girado noventa grados, los nueve metros y la fila de ventanas quedan de frente. */
    m.rotation.y=Math.PI/2;
    m.position.set(BUS_X, 0, BUS_Z);
    afueraGrupo.add(m);
    return m;
  };
  /* ================= LA FACHADA =================
     EL COLEGIO ESTA CONSTRUIDO DE ADENTRO HACIA AFUERA: son cubos de pared de celda entera y una
     losa de techo por celda, o sea que NO TIENE CASCARA. Mirandolo desde la vereda —que es algo que
     hasta ahora no pasaba nunca— lo que se ve es un monton de bloques beige con el techo colgando
     y el interior asomando por arriba. Medido en la captura del saludo: el fondo detras del
     profesor era una pila de cajas con un plano flotando encima.
     La cascara son tres piezas: los dos paños de pared del oeste con el hueco de la puerta en el
     medio, y una losa de techo que pasa por encima de todo y tapa los cantos. */
  const facha=[];
  const XO=-(GW-1)/2*CEL - CEL/2;          // la cara exterior del oeste: -48,3
  const ZN=-(GH-1)/2*CEL - CEL/2, ZS=-ZN;  // los extremos norte y sur: -39,9 y 39,9
  const ZP0=ZC(_salO.j)-CEL/2, ZP1=ZC(_salO.j)+CEL/2;   // el hueco de la puerta de salida
  /* MAS BAJA DE LO QUE PARECIA QUE TENIA QUE SER. Con 4,7 m, y con el profesor a menos de cuatro
     metros de la camara, la pared subia cuarenta y cuatro grados por encima del ojo y se comia el
     tercio de arriba del cuadro: en la captura el saludo pasaba delante de un muro marron. */
  const ALTO_F=ALTO_M+0.55;
  cj(facha, 0.30, ALTO_F, ZP0-ZN, XO-0.15, ALTO_F/2, (ZN+ZP0)/2);
  cj(facha, 0.30, ALTO_F, ZS-ZP1, XO-0.15, ALTO_F/2, (ZP1+ZS)/2);
  cj(facha, 0.30, ALTO_F-2.35, CEL, XO-0.15, ALTO_F-(ALTO_F-2.35)/2, ZC(_salO.j));  // el dintel
  const fach=new THREE.Mesh(mergeGeometries(facha.map(g=>g.index?g.toNonIndexed():g), false), M_FACHADA);
  for(const q of facha) q.dispose();
  fach.frustumCulled=false; afueraGrupo.add(fach);
  /* NI LOSA DE TECHO NI ALERO, Y ESO SE DECIDIO APAGANDOLOS DE A UNO. Los dos son planos
     HORIZONTALES vistos DESDE ABAJO —la camara queda a metro y medio de altura y a tres metros de
     la pared—, y una cara que mira al piso recibe de la hemisferica el color del suelo: salian casi
     negros y se comian el tercio de arriba del cuadro, justo donde el profesor levanta el brazo.
     Con la fachada sola, el saludo pasa contra pared clara y cielo. La fachada ya tapa el interior:
     mide 4,15 m y las paredes de adentro 3,6. */
  const bus=fundir(ama, new THREE.MeshLambertMaterial({color:0xf0c418}));
  /* lo oscuro va SIN LUZ a proposito: son vidrios y goma, o sea las dos cosas de un autobus que no
     tienen difuso. Con Lambert el sol de la hemisferica las aclara y los vidrios salen gris ceniza. */
  fundir(osc, new THREE.MeshBasicMaterial({color:0x23262b}));
  busMalla=bus;
})();
/* la tapa de la salida oeste se saca cuando se sale: esta puesta justamente para que no se vea el
   vacio de afuera, y ahora afuera hay algo que mostrar */
/* EL CIELO Y LA NIEBLA TAMBIEN CAMBIAN, y sin eso no hay afuera. La escena entera esta armada para un
   interior: fondo casi negro y niebla cerrada a treinta o cincuenta metros. Saliendo por la puerta con
   eso puesto, lo que se ve no es un patio sino un vacio gris — que es exactamente como salio en la
   primera captura. Afuera el fondo pasa a cielo y la niebla se abre a doscientos metros. */
let _cieloAnt=null;
function afueraVer(si){
  afueraGrupo.visible=!!si;
  if(_tapaOeste) _tapaOeste.visible=!si;
  if(si && !_cieloAnt){
    _cieloAnt={ fondo:escena.background.getHex(), col:escena.fog.color.getHex(),
                near:escena.fog.near, far:escena.fog.far };
    escena.background.setHex(0x9fc7e8);
    escena.fog.color.setHex(0xbcd8ee); escena.fog.near=30; escena.fog.far=210;
  } else if(!si && _cieloAnt){
    escena.background.setHex(_cieloAnt.fondo);
    escena.fog.color.setHex(_cieloAnt.col);
    escena.fog.near=_cieloAnt.near; escena.fog.far=_cieloAnt.far;
    _cieloAnt=null;
  }
}
