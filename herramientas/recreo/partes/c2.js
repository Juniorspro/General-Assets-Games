
/* ===================== EL RENDER ===================== */
const lienzo=document.getElementById('lienzo');
const marco=document.getElementById('marco');
const render=new THREE.WebGLRenderer({canvas:lienzo, antialias:true, powerPreference:'high-performance'});
render.setPixelRatio(Math.min(devicePixelRatio||1, CAL[calidad].px));
render.setSize(marco.clientWidth||360, marco.clientHeight||640, false);
render.outputColorSpace=THREE.SRGBColorSpace;
const escena=new THREE.Scene();
escena.background=new THREE.Color(0x0e0e12);
escena.fog=new THREE.Fog(0x0e0e12, 8, CAL[calidad].niebla);
/* FOV 90, Y EN THREE.JS ESO ES EL VERTICAL. En un marco 9:16 un vertical de 90 grados da un
   horizontal de 2·atan(tan(45°)·0,5625) = 58 grados: mucho aire arriba y abajo —que es donde estan
   la cara de el y el subtitulo— y un encuadre horizontal normal. Pedir 90 HORIZONTALES en vertical
   daria 132 verticales y todo saldria estirado por los bordes. */
const FOV=90;
const camara=new THREE.PerspectiveCamera(FOV, 9/16, 0.08, 220);
function ajustar(){
  /* SE MIDE EL MARCO Y NO LA VENTANA. El marco es 9:16 recortado dentro de la ventana; usar
     innerWidth/innerHeight dibujaria a la resolucion de la ventana entera y despues lo estiraria al
     marco, o sea trabajo de mas y una imagen deformada. */
  const w=Math.max(2, marco.clientWidth), h=Math.max(2, marco.clientHeight);
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
const T_PUERTA=tex(64,128,(g,w,h)=>{
  g.fillStyle='#b98d54'; g.fillRect(0,0,w,h);
  g.fillStyle='#a87c46'; g.fillRect(0,0,3,h); g.fillRect(w-3,0,3,h);
  g.fillStyle='#cfa269'; g.fillRect(w*0.14,h*0.08,w*0.72,h*0.30);   // el vidrio
  g.fillStyle='#8ea9b8'; g.fillRect(w*0.18,h*0.11,w*0.64,h*0.24);
  g.fillStyle='rgba(255,255,255,0.18)'; g.fillRect(w*0.20,h*0.13,w*0.24,h*0.08);
  g.fillStyle='#e6c98d'; g.beginPath(); g.arc(w*0.80,h*0.56,3.4,0,7); g.fill();
  g.fillStyle='#8f6a3c'; g.fillRect(w*0.14,h*0.66,w*0.72,2);
}, 1, 1);

const M_PISO =new THREE.MeshLambertMaterial({map:T_PISO});
const M_PARED=new THREE.MeshLambertMaterial({map:T_PARED});
/* EL TECHO VA SIN LUZ, y no es un atajo: con Lambert la cara del techo apunta HACIA ABAJO, o sea
   que recibe el color de suelo de la hemisferica —un gris verdoso oscuro— y el pasillo quedaba con
   el techo casi negro justo arriba de la camara. En la referencia el techo son placas blancas y
   planas. Un material sin luz da exactamente eso y sigue respetando la niebla, que es lo que le da
   la profundidad al pasillo. */
const M_TECHO=new THREE.MeshBasicMaterial({map:T_TECHO, color:0xd6d4c8});
const M_LOCKER=new THREE.MeshLambertMaterial({map:T_LOCKER});
const M_PUERTA=new THREE.MeshLambertMaterial({map:T_PUERTA});
const M_AULA =new THREE.MeshLambertMaterial({color:0xb9c9b0});

/* ===================== LAS LUCES =====================
   Un ambiente parejo y alto, mas una direccional floja. Es a proposito: la escuela del original esta
   iluminada como una escuela de verdad —fluorescentes en el techo, sin sombras dramaticas— y meterle
   luces puntuales por pasillo daria treinta luces, treinta programas de shader y una imagen que no
   se parece a la referencia. */
const luzA=new THREE.HemisphereLight(0xfff6e2, 0x5a5f55, 1.85); escena.add(luzA);
const luzD=new THREE.DirectionalLight(0xffffff, 0.42); luzD.position.set(0.4,1,0.25); escena.add(luzD);
