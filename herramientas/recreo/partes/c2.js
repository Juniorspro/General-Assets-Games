
/* ===================== EL RENDER ===================== */
const lienzo=document.getElementById('lienzo');
const marco=document.getElementById('marco');
const render=new THREE.WebGLRenderer({canvas:lienzo, antialias:true, powerPreference:'high-performance'});
render.setPixelRatio(Math.min(devicePixelRatio||1, CAL[calidad].px));
render.setSize(marco.clientWidth||360, marco.clientHeight||640, false);
render.outputColorSpace=THREE.SRGBColorSpace;
/* PCFSoft y no el basico: la sombra de una pierna a 90 texels por metro tiene el canto dentado, y
   un canto dentado sobre un piso de baldosas se lee a error de dibujo y no a sombra. autoUpdate se
   queda en true porque la camara de sombra se mueve con el jugador. */
render.shadowMap.enabled=false;
render.shadowMap.type=THREE.PCFSoftShadowMap;
const escena=new THREE.Scene();
escena.background=new THREE.Color(0x0e0e12);
escena.fog=new THREE.Fog(0x0e0e12, 8, CAL[calidad].niebla);
/* FOV 90, Y EN THREE.JS ESO ES EL VERTICAL. En un marco 9:16 un vertical de 90 grados da un
   horizontal de 2·atan(tan(45°)·0,5625) = 58 grados: mucho aire arriba y abajo —que es donde estan
   la cara de el y el subtitulo— y un encuadre horizontal normal. Pedir 90 HORIZONTALES en vertical
   daria 132 verticales y todo saldria estirado por los bordes. */
const FOV=90;
const camara=new THREE.PerspectiveCamera(FOV, 9/16, 0.08, 220);
/* EL TAMAÑO DEL MARCO SE GUARDA Y NO SE PREGUNTA CADA CUADRO. Leer clientWidth obliga al navegador
   a recalcular el layout ANTES de contestar, y postTam() lo leia dos veces por cuadro — o sea 120
   vaciados de layout por segundo mezclados con las escrituras al DOM del contador de dedos y de las
   miras. Eso es el "layout thrashing" de manual y no aparece en ningun perfil de WebGL: se ve como
   tirones que van y vienen. El marco solo cambia de tamaño cuando cambia la ventana. */
let marcoW=2, marcoH=2;
function marcoMedir(){ marcoW=Math.max(2, marco.clientWidth); marcoH=Math.max(2, marco.clientHeight); }
function ajustar(){
  marcoMedir();
  /* SE MIDE EL MARCO Y NO LA VENTANA. El marco es 9:16 recortado dentro de la ventana; usar
     innerWidth/innerHeight dibujaria a la resolucion de la ventana entera y despues lo estiraria al
     marco, o sea trabajo de mas y una imagen deformada. */
  const w=marcoW, h=marcoH;
  render.setPixelRatio(Math.min(devicePixelRatio||1, CAL[calidad].px));
  render.setSize(w,h,false);
  camara.aspect=w/h; camara.fov=FOV;
  camara.updateProjectionMatrix();
}
addEventListener('resize', ajustar);

/* ===================== LAS TEXTURAS, DIBUJADAS AL CARGAR =====================
   Ni un archivo de imagen. Cada textura es un lienzo de 64 o 128 px pintado por codigo y repetido:
   la baldosa del piso, el panel de la pared con su zocalo, la chapa del locker y la madera de la
   puerta. Cuatro texturas de 64x64 pesan menos que un favicon y se ven exactamente como tienen que
   verse, porque el original tambien son cuatro texturas chicas repetidas hasta el infinito. */
function tex(w,h,pinta,repX,repY,filtro){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  pinta(c.getContext('2d'), w, h);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(repX||1, repY||1);
  /* NEAREST a proposito: el juego que rehacemos se ve a bloques y suavizar las baldosas le saca
     justamente eso. Y con mipmaps, porque sin ellos el piso de un pasillo largo titila. */
  t.magFilter = filtro===false? THREE.LinearFilter : THREE.NearestFilter;
  t.minFilter=THREE.LinearMipmapLinearFilter;
  t.generateMipmaps=true;
  t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
const T_PISO=tex(64,64,(g,w,h)=>{
  g.fillStyle='#d9d5c8'; g.fillRect(0,0,w,h);
  g.fillStyle='#cfcabb'; g.fillRect(0,0,w/2,h/2); g.fillRect(w/2,h/2,w/2,h/2);
  g.strokeStyle='rgba(120,116,105,0.55)'; g.lineWidth=1.5;
  g.strokeRect(0.5,0.5,w-1,h-1); g.beginPath();
  g.moveTo(w/2,0); g.lineTo(w/2,h); g.moveTo(0,h/2); g.lineTo(w,h/2); g.stroke();
  /* dos manchitas por baldosa: sin ellas un pasillo de veinte metros se ve como un solo plano */
  g.fillStyle='rgba(120,116,105,0.16)';
  g.fillRect(9,13,4,3); g.fillRect(44,38,5,3);
}, 1, 1);
const T_PARED=tex(64,128,(g,w,h)=>{
  g.fillStyle='#c9b48a'; g.fillRect(0,0,w,h);
  g.fillStyle='#bda87e'; g.fillRect(0,0,w,h*0.06);
  g.fillStyle='#8f7c55'; g.fillRect(0,h*0.86,w,h*0.14);      // el zocalo
  g.fillStyle='#a08b60'; g.fillRect(0,h*0.86,w,2);
  g.strokeStyle='rgba(120,102,68,0.40)'; g.lineWidth=1;
  for(let x=0;x<=w;x+=w/2){ g.beginPath(); g.moveTo(x+0.5,0); g.lineTo(x+0.5,h*0.86); g.stroke(); }
  g.fillStyle='rgba(255,255,255,0.05)'; g.fillRect(0,h*0.10,w,h*0.02);
}, 1, 1);
const T_TECHO=tex(32,32,(g,w,h)=>{
  g.fillStyle='#eceade'; g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(150,148,138,0.45)'; g.lineWidth=1; g.strokeRect(0.5,0.5,w-1,h-1);
}, 1, 1);
const T_LOCKER=tex(64,128,(g,w,h)=>{
  g.fillStyle='#c0392b'; g.fillRect(0,0,w,h);
  g.fillStyle='#9c2c20'; g.fillRect(0,0,2,h); g.fillRect(w-2,0,2,h);
  g.fillStyle='#a52f22'; g.fillRect(0,h*0.50,w,3);
  g.fillStyle='rgba(255,255,255,0.10)'; g.fillRect(4,4,w-8,3);
  /* las rejillas y la manija, que es lo que lo vuelve un locker y no una caja roja */
  g.fillStyle='#7e2318';
  for(let k=0;k<4;k++){ g.fillRect(w*0.24, h*0.09+k*4, w*0.52, 2);
                        g.fillRect(w*0.24, h*0.59+k*4, w*0.52, 2); }
  g.fillStyle='#e2e2e2'; g.fillRect(w*0.78, h*0.30, 4, 8); g.fillRect(w*0.78, h*0.80, 4, 8);
}, 1, 1);
/* LA TEXTURA DE LA PUERTA SE FUE CON LAS PUERTAS. Era un lienzo de 64x128 con su vidrio y su
   manija, y desde que los salones abren directo sobre el pasillo no hay una sola hoja que pintar. */

const M_PISO =new THREE.MeshLambertMaterial({map:T_PISO});
const M_PARED=new THREE.MeshLambertMaterial({map:T_PARED});
/* EL TECHO VA SIN LUZ, y no es un atajo: con Lambert la cara del techo apunta HACIA ABAJO, o sea
   que recibe el color de suelo de la hemisferica —un gris verdoso oscuro— y el pasillo quedaba con
   el techo casi negro justo arriba de la camara. En la referencia el techo son placas blancas y
   planas. Un material sin luz da exactamente eso y sigue respetando la niebla, que es lo que le da
   la profundidad al pasillo. */
/* EL TINTE BAJO DE 0xd6d4c8 A 0xa9a79c DESPUES DE MIRAR UNA CAPTURA. Con el dibujo por codigo —una
   placa clara y una linea de rejilla— el tinte alto estaba bien. Con la foto, que ya trae su propio
   valor de gris, el producto dejaba el tercio de arriba del cuadro casi blanco: el techo brillaba
   mas que el piso y se leia a claraboya. */
const M_TECHO=new THREE.MeshBasicMaterial({map:T_TECHO, color:0xa9a79c});
const M_LOCKER=new THREE.MeshLambertMaterial({map:T_LOCKER});
const M_AULA =new THREE.MeshLambertMaterial({color:0xb9c9b0});

/* ===================== LAS TEXTURAS DE FOTO =====================
   Pedido: "genera en highsfield texturas para todo". Nueve texturas generadas con z_image —piso de
   vinilico a cuadros, pared, placas de techo, lockers, pizarron, asfalto, pasto, ladrillo de la
   fachada y madera— horneadas a WebP de 512 (384 o 256 las que son puro ruido). Las nueve suman
   47 KB, que en base64 son 63: el precio de que el colegio deje de estar dibujado con fillRect.

   TRES DECISIONES, Y LAS TRES SALEN DE UN PROBLEMA CONCRETO:

   1. NO REEMPLAZAN A LAS DIBUJADAS: LAS PISAN CUANDO LLEGAN. Un data URI se decodifica de forma
      asincronica, asi que si el material naciera esperando la foto habria un cuadro —o veinte— con
      el material en negro. Nace con el lienzo pintado por codigo, que ya funciona, y la foto entra
      encima cuando esta lista. Si una no decodifica, ese material se queda con su dibujo y no pasa
      nada: no hay estado roto posible.

   2. WRAP ESPEJADO Y NO REPETIDO, y esto es lo que resuelve la costura. Al modelo se le pidieron
      texturas "sin costura" y no lo son —ninguna lo es de verdad—; coserlas a mano desplazando
      media imagen y difuminando el cruce ensucia justo el centro, que es lo que mas se mira. Con
      MirroredRepeatWrapping la copia de al lado va DADA VUELTA, o sea que los dos bordes que se
      tocan son EL MISMO BORDE y la costura no puede existir. Lo que se paga es que el patron queda
      simetrico cada dos repeticiones, y en manchas —revoque, asfalto, pasto, baldosa— eso no se ve.

   3. LA REPETICION CORRIGE LA ESCALA FISICA. Las UV ya vienen escaladas en la geometria (una celda
      de pared trae 1,9 x 1,5), y eso estaba calculado para un dibujo de 64 px que no representa
      nada de un tamaño concreto. Una foto SI: si un ladrillo de la foto termina midiendo 22 cm en
      el mundo, la pared se lee a casa de muñecas. Cada textura lleva su multiplicador, y los nueve
      salieron de mirar la captura y contar. */
const TEX_FOTO=__TEX_JSON__;
let fotosListas=0, fotosPedidas=0;
function fotoEn(mat, nombre, repX, repY, nearest){
  const uri=TEX_FOTO && TEX_FOTO[nombre];
  if(!uri || !mat) return;
  fotosPedidas++;
  const img=new Image();
  img.onload=()=>{
    const t=new THREE.Texture(img);
    t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;
    t.repeat.set(repX||1, repY||1);
    /* NEAREST solo donde el dibujo lo pedia (las baldosas del original se ven a bloques); en una
       foto de revoque o de pasto el nearest solo agrega ruido de muestreo. */
    t.magFilter = nearest? THREE.NearestFilter : THREE.LinearFilter;
    t.minFilter=THREE.LinearMipmapLinearFilter;
    t.generateMipmaps=true;
    t.anisotropy=Math.min(4, render.capabilities.getMaxAnisotropy());
    t.colorSpace=THREE.SRGBColorSpace;
    t.needsUpdate=true;
    if(mat.map && mat.map.dispose) mat.map.dispose();
    mat.map=t; mat.needsUpdate=true;
    fotosListas++;
  };
  img.onerror=()=>{ fotosPedidas--; };
  img.src=uri;
}

/* ===================== LAS LUCES =====================
   Un ambiente parejo y alto, mas una direccional floja. Es a proposito: la escuela del original esta
   iluminada como una escuela de verdad —fluorescentes en el techo, sin sombras dramaticas— y meterle
   luces puntuales por pasillo daria treinta luces, treinta programas de shader y una imagen que no
   se parece a la referencia. */
const luzA=new THREE.HemisphereLight(0xfff6e2, 0x5a5f55, 1.85); escena.add(luzA);
const luzD=new THREE.DirectionalLight(0xffffff, 0.42); luzD.position.set(0.4,1,0.25); escena.add(luzD);

/* ===================== LA SOMBRA, Y POR QUE ES UNA SOLA Y CHICA =====================
   Pedido: "mejores los graficos en altos, agrega sombras". Lo que faltaba no era iluminacion —la
   escuela ya esta bien iluminada— sino APOYO: sin sombra, el profesor, los pupitres y los lockers
   flotan un centimetro sobre el piso, y eso es lo que hace que una escena 3D se lea a maqueta.

   TRES DECISIONES, LAS TRES POR LA MISMA RAZON: UN MAPA DE SOMBRA CUBRE UN AREA FIJA.
   1. LA CAMARA DE SOMBRA SIGUE AL JUGADOR, con un cuadro de 11 metros de lado. Cubriendo el colegio
      entero —71 x 38 m— un mapa de 1024 daria 14 texels por metro y la sombra de una pierna serian
      cuatro pixeles temblando. Siguiendo a la camara son 93 texels por metro.
   2. LA ESCUELA NO PROYECTA, SOLO RECIBE. Las paredes, el piso y el techo estan fundidos en tres
      mallas con frustumCulled=false, asi que ponerlas a proyectar obliga a redibujar las 16 mil
      caras del colegio en la pasada de sombra, todos los cuadros, para conseguir la sombra de una
      pared bajo una luz que viene de arriba — o sea nada. Proyectan las cosas que se apoyan: el
      profesor, los muebles, los lockers y los bichos.
   3. SOLO EN CALIDAD ALTA. Es una pasada de render mas, y la eligio el jugador. */
const luzS=new THREE.DirectionalLight(0xfff1d8, 0.55);
luzS.position.set(6, 14, 4);
luzS.castShadow=true;
luzS.shadow.mapSize.set(1024,1024);
luzS.shadow.camera.near=1; luzS.shadow.camera.far=46;
luzS.shadow.bias=-0.0012;
/* normalBias es lo que saca el rayado de la sombra en superficies casi paralelas a la luz sin
   despegar la sombra del objeto, que es lo que pasa subiendo el bias a secas */
luzS.shadow.normalBias=0.035;
escena.add(luzS); escena.add(luzS.target);
const SOM_LADO=5.5;   // medio lado del cuadro que cubre, en metros
function sombraSeguir(x,z,giro){
  if(!luzS.castShadow) return;
  /* se centra un poco POR DELANTE de la camara y no encima: la mitad de atras del cuadro no se ve */
  const cx=x+Math.sin(giro)*3.0, cz=z+Math.cos(giro)*3.0;
  luzS.target.position.set(cx, 0, cz);
  /* CASI DE ARRIBA, Y ESO NO ES UN GUSTO. Con la luz a (6,14,4) desde el blanco la elevacion es de
     63 grados y la sombra de una persona mide medio cuerpo tirada por el piso: en la captura se leia
     a mancha, no a sombra. Una escuela esta iluminada por tubos en el techo — la sombra util es la
     de CONTACTO, la que dice "esta parado ahi". A (2,5 · 14 · 2) la elevacion es 77 grados y la
     sombra mide 0,23 veces la altura, o sea 40 cm para un cuerpo de 1,80. */
  luzS.position.set(cx+2.5, 14, cz+2.0);
  const c=luzS.shadow.camera;
  if(c.left!==-SOM_LADO){ c.left=-SOM_LADO; c.right=SOM_LADO; c.top=SOM_LADO; c.bottom=-SOM_LADO;
                          c.updateProjectionMatrix(); }
  luzS.target.updateMatrixWorld();
}
